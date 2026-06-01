import { expect, test, type Page } from "@playwright/test";

import { platformerExample } from "../../lib/spec/examples/platformer";

// Third-party noise we don't control in a test environment without real Clerk
// keys: clerk-js is blocked by the app CSP and keyless mode provisions a temp
// instance, producing console chatter and aborted requests. None of it is an
// application bug, so it is excluded from the "no console errors" assertion.
const IGNORED_ERROR_PATTERNS = [
  /clerk/i,
  /content security policy/i,
  /failed to load resource/i,
  /favicon/i,
  /net::ERR_/i,
];

function isAppError(text: string): boolean {
  return !IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

// Run the full prompt -> play flow once: submit on "/", land on the editor, and
// confirm the renderer's <canvas> is mounted and stays mounted. Returns false
// if any step fails so the caller can retry.
//
// Why retry at all: without real Clerk keys the app boots in "keyless" mode,
// which reloads the page while provisioning a temporary instance. That reload
// can abort the client-side navigation — sometimes even just after reaching
// /new, bouncing back to "/". With real keys there is no reload and the first
// attempt succeeds; the retry simply absorbs the keyless nondeterminism.
async function tryPromptToPlay(page: Page): Promise<boolean> {
  try {
    if (new URL(page.url()).pathname !== "/") {
      await page.goto("/", { waitUntil: "domcontentloaded" });
    }

    const promptField = page.getByLabel("Game prompt");
    await promptField.waitFor({ state: "visible", timeout: 15_000 });
    await promptField.fill(
      "A cozy platformer where a toast hero collects jam jars",
    );
    await page.getByRole("button", { name: "Generate game" }).click();

    await page.waitForURL(/\/new\?id=/, { timeout: 10_000 });

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 15_000 });

    // Guard against a late keyless reload bouncing us off /new.
    await page.waitForTimeout(1_500);
    return (
      new URL(page.url()).pathname.startsWith("/new") &&
      (await canvas.isVisible())
    );
  } catch {
    return false;
  }
}

test("prompt to play: submitting a prompt mounts a playable canvas on /new", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  // Stub generation at the network boundary: deterministic, offline, and it
  // leaves the real /api/generate route logic untouched.
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "x-spec-repaired": "false" },
      body: JSON.stringify({ spec: platformerExample }),
    });
  });

  await page.goto("/", { waitUntil: "networkidle" });

  let mounted = false;
  for (let attempt = 0; attempt < 6 && !mounted; attempt += 1) {
    mounted = await tryPromptToPlay(page);
    if (!mounted) {
      await page.waitForTimeout(1_500);
    }
  }

  // The editor mounted the real Phaser renderer (a live <canvas>) on /new.
  expect(mounted, "expected a <canvas> to mount on /new").toBe(true);

  // No application-originated console errors during the whole flow.
  const appErrors = errors.filter(isAppError);
  expect(
    appErrors,
    `Unexpected console errors:\n${appErrors.join("\n")}`,
  ).toEqual([]);
});
