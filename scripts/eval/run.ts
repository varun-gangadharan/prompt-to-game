/**
 * Eval harness for the prompt → GameSpec generation path.
 *
 * Reads the 50 labelled prompts in prompts.json, POSTs each to /api/generate,
 * validates the response with the canonical gameSpecSchema, checks that the
 * returned template matches the expected label, and writes a report.json with:
 *   { schemaValidPct, templateAccuracyPct, p50LatencyMs, p95LatencyMs, repairRate }
 *
 * Run against a live server (needs GEMINI_API_KEY configured on that server):
 *   pnpm eval
 *   EVAL_BASE_URL=https://preview.example.com pnpm eval
 *
 * The process exits non-zero if the ship gate (>=90% schema-valid AND
 * >=90% template accuracy) is not met, so CI can gate on it.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { gameSpecSchema } from "../../lib/spec/schema";

type PromptCase = {
  id: string;
  prompt: string;
  expectedTemplate: "platformer" | "shooter" | "runner";
};

type CaseResult = {
  id: string;
  expectedTemplate: string;
  status: number;
  latencyMs: number;
  schemaValid: boolean;
  templateMatch: boolean;
  repaired: boolean;
  error?: string;
};

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const ENDPOINT = `${BASE_URL.replace(/\/$/, "")}/api/generate`;
// /api/generate is rate limited to 10 req/min per client, so pace requests.
const PACING_MS = Number(process.env.EVAL_PACING_MS ?? 7000);
const MAX_RETRIES = Number(process.env.EVAL_MAX_RETRIES ?? 3);

const SCHEMA_GATE = 90;
const TEMPLATE_GATE = 90;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const index = Math.min(sortedAsc.length - 1, Math.max(0, rank));
  return sortedAsc[index]!;
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

async function runCase(testCase: PromptCase): Promise<CaseResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const startedAt = Date.now();
    let response: Response;

    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: testCase.prompt }),
      });
    } catch (error) {
      return {
        id: testCase.id,
        expectedTemplate: testCase.expectedTemplate,
        status: 0,
        latencyMs: Date.now() - startedAt,
        schemaValid: false,
        templateMatch: false,
        repaired: false,
        error: error instanceof Error ? error.message : "network error",
      };
    }

    const latencyMs = Date.now() - startedAt;

    // Back off and retry on rate limiting.
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await sleep((retryAfter > 0 ? retryAfter * 1000 : PACING_MS) + 500);
      continue;
    }

    const repaired = response.headers.get("x-spec-repaired") === "true";
    const body = (await response.json().catch(() => null)) as
      | { spec?: unknown; error?: string }
      | null;

    if (response.status !== 200 || !body || !("spec" in body)) {
      return {
        id: testCase.id,
        expectedTemplate: testCase.expectedTemplate,
        status: response.status,
        latencyMs,
        schemaValid: false,
        templateMatch: false,
        repaired,
        error: body?.error ?? `HTTP ${response.status}`,
      };
    }

    const parsed = gameSpecSchema.safeParse(body.spec);

    return {
      id: testCase.id,
      expectedTemplate: testCase.expectedTemplate,
      status: response.status,
      latencyMs,
      schemaValid: parsed.success,
      templateMatch:
        parsed.success && parsed.data.template === testCase.expectedTemplate,
      repaired,
      error: parsed.success ? undefined : parsed.error.message,
    };
  }

  return {
    id: testCase.id,
    expectedTemplate: testCase.expectedTemplate,
    status: 429,
    latencyMs: 0,
    schemaValid: false,
    templateMatch: false,
    repaired: false,
    error: "rate limited after retries",
  };
}

async function main(): Promise<void> {
  const promptsUrl = new URL("./prompts.json", import.meta.url);
  const cases = JSON.parse(readFileSync(promptsUrl, "utf8")) as PromptCase[];

  console.log(
    `Running ${cases.length} eval prompts against ${ENDPOINT} ` +
      `(pacing ${PACING_MS}ms)...`,
  );

  const results: CaseResult[] = [];
  for (let i = 0; i < cases.length; i += 1) {
    const result = await runCase(cases[i]!);
    results.push(result);
    const flag = result.templateMatch
      ? "ok"
      : result.schemaValid
        ? "wrong-template"
        : "invalid";
    console.log(
      `[${i + 1}/${cases.length}] ${result.id} ${flag} ` +
        `(${result.latencyMs}ms${result.repaired ? ", repaired" : ""})` +
        (result.error ? ` — ${result.error}` : ""),
    );
    if (i < cases.length - 1) {
      await sleep(PACING_MS);
    }
  }

  const total = results.length;
  const schemaValidCount = results.filter((r) => r.schemaValid).length;
  const templateMatchCount = results.filter((r) => r.templateMatch).length;
  const succeeded = results.filter((r) => r.status === 200);
  const repairedCount = succeeded.filter((r) => r.repaired).length;
  const latencies = succeeded.map((r) => r.latencyMs).sort((a, b) => a - b);

  const report = {
    generatedAt: new Date().toISOString(),
    endpoint: ENDPOINT,
    total,
    schemaValidPct: pct(schemaValidCount, total),
    templateAccuracyPct: pct(templateMatchCount, total),
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    repairRate: pct(repairedCount, succeeded.length),
    gate: {
      schemaValid: { threshold: SCHEMA_GATE, passed: pct(schemaValidCount, total) >= SCHEMA_GATE },
      templateAccuracy: {
        threshold: TEMPLATE_GATE,
        passed: pct(templateMatchCount, total) >= TEMPLATE_GATE,
      },
    },
    results,
  };

  const reportUrl = new URL("./report.json", import.meta.url);
  writeFileSync(reportUrl, `${JSON.stringify(report, null, 2)}\n`);

  console.log("\n=== Eval summary ===");
  console.log(`schemaValidPct      ${report.schemaValidPct}%`);
  console.log(`templateAccuracyPct ${report.templateAccuracyPct}%`);
  console.log(`p50LatencyMs        ${report.p50LatencyMs}`);
  console.log(`p95LatencyMs        ${report.p95LatencyMs}`);
  console.log(`repairRate          ${report.repairRate}%`);
  console.log(`report written to   ${reportUrl.pathname}`);

  const passed =
    report.gate.schemaValid.passed && report.gate.templateAccuracy.passed;
  if (!passed) {
    console.error(
      `\nShip gate FAILED — need >=${SCHEMA_GATE}% schema-valid and ` +
        `>=${TEMPLATE_GATE}% template accuracy.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log("\nShip gate PASSED.");
}

main().catch((error) => {
  console.error("Eval run crashed:", error);
  process.exitCode = 1;
});
