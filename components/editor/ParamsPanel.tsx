"use client";

import { z } from "zod";

import { gameSpecSchema } from "@/lib/spec/schema";
import type { GameSpec } from "@/lib/spec/types";

type Path = Array<string | number>;
type ValidationResult = z.SafeParseReturnType<GameSpec, GameSpec>;

type ParamsPanelProps = {
  onChange: (spec: GameSpec) => void;
  spec: GameSpec;
  validation: ValidationResult | null;
};

export function ParamsPanel({ onChange, spec, validation }: ParamsPanelProps) {
  const activeSchema = getSchemaForTemplate(spec.template);

  function updateValue(path: Path, value: unknown) {
    onChange(setValueAtPath(spec, path, value));
  }

  return (
    <aside className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Params</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Generated from the active GameSpec schema branch.
        </p>
      </div>
      <div className="max-h-[calc(100vh-160px)] overflow-auto p-4">
        <FieldRenderer
          onChange={updateValue}
          path={[]}
          schema={activeSchema}
          value={spec}
        />

        {!validation?.success ? (
          <div className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {validation?.error.issues.slice(0, 4).map((issue) => (
              <div key={`${issue.path.join(".")}-${issue.message}`}>
                {issue.path.join(".") || "spec"}: {issue.message}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function FieldRenderer({
  label,
  onChange,
  path,
  schema,
  value,
}: {
  label?: string;
  onChange: (path: Path, value: unknown) => void;
  path: Path;
  schema: z.ZodTypeAny;
  value: unknown;
}) {
  const unwrappedSchema = unwrapOptional(schema);

  if (unwrappedSchema instanceof z.ZodObject) {
    const shape = unwrappedSchema.shape as Record<string, z.ZodTypeAny>;
    return (
      <fieldset className={path.length ? "mt-4 border-t border-zinc-800 pt-4" : ""}>
        {label ? (
          <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {label}
          </legend>
        ) : null}
        <div className="grid gap-3">
          {Object.entries(shape).map(([key, childSchema]) => (
            <FieldRenderer
              key={key}
              label={formatLabel(key)}
              onChange={onChange}
              path={[...path, key]}
              schema={childSchema}
              value={readChild(value, key)}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  if (unwrappedSchema instanceof z.ZodArray) {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset className="rounded-md border border-zinc-800 p-3">
        <legend className="px-1 text-xs font-medium text-zinc-400">
          {label}
        </legend>
        <div className="grid gap-3">
          {items.map((item, index) => (
            <FieldRenderer
              key={index}
              label={`${label ?? "Item"} ${index + 1}`}
              onChange={onChange}
              path={[...path, index]}
              schema={unwrappedSchema.element}
              value={item}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  if (unwrappedSchema instanceof z.ZodTuple) {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset className="rounded-md border border-zinc-800 p-3">
        <legend className="px-1 text-xs font-medium text-zinc-400">
          {label}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(unwrappedSchema.items as z.ZodTypeAny[]).map((itemSchema, index) => (
            <FieldRenderer
              key={index}
              label={`${index + 1}`}
              onChange={onChange}
              path={[...path, index]}
              schema={itemSchema}
              value={items[index]}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  if (unwrappedSchema instanceof z.ZodEnum) {
    return (
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <select
          className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-400"
          onChange={(event) => onChange(path, event.target.value)}
          value={typeof value === "string" ? value : ""}
        >
          {(unwrappedSchema.options as string[]).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (unwrappedSchema instanceof z.ZodLiteral) {
    return (
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <input
          className="h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-500"
          disabled
          value={String(unwrappedSchema.value)}
        />
      </label>
    );
  }

  if (unwrappedSchema instanceof z.ZodNumber) {
    const bounds = getNumberBounds(unwrappedSchema);
    return (
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <input
          className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-400"
          max={bounds.max}
          min={bounds.min}
          onChange={(event) => {
            const nextValue = event.target.valueAsNumber;
            if (!Number.isNaN(nextValue)) {
              onChange(path, nextValue);
            }
          }}
          step="any"
          type="number"
          value={typeof value === "number" ? value : ""}
        />
      </label>
    );
  }

  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <input
        className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-400"
        onChange={(event) => onChange(path, event.target.value)}
        type={isColorValue(value) ? "color" : "text"}
        value={typeof value === "string" ? value : ""}
      />
    </label>
  );
}

function getSchemaForTemplate(template: GameSpec["template"]) {
  const union = gameSpecSchema as unknown as {
    options: Array<z.ZodObject<z.ZodRawShape>>;
  };

  const schema = union.options.find((option) => {
    const templateField = option.shape.template;
    return (
      templateField instanceof z.ZodLiteral &&
      templateField.value === template
    );
  });

  return schema ?? union.options[0];
}

function unwrapOptional(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapOptional(schema.unwrap());
  }

  return schema;
}

function setValueAtPath<T>(source: T, path: Path, value: unknown): T {
  if (path.length === 0) {
    return value as T;
  }

  const [head, ...tail] = path;
  const clone = Array.isArray(source)
    ? [...source]
    : ({ ...(source as Record<string, unknown>) } as Record<string, unknown>);

  if (tail.length === 0) {
    (clone as Record<string, unknown>)[head] = value;
  } else {
    (clone as Record<string, unknown>)[head] = setValueAtPath(
      (clone as Record<string, unknown>)[head],
      tail,
      value,
    );
  }

  return clone as T;
}

function readChild(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function getNumberBounds(schema: z.ZodNumber) {
  const def = schema._def as {
    checks?: Array<{ kind: string; value?: number }>;
  };
  const bounds: { min?: number; max?: number } = {};

  for (const check of def.checks ?? []) {
    if (check.kind === "min" && typeof check.value === "number") {
      bounds.min = check.value;
    }
    if (check.kind === "max" && typeof check.value === "number") {
      bounds.max = check.value;
    }
  }

  return bounds;
}

function formatLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/-/g, " ")
    .replace(/^\w/, (firstLetter) => firstLetter.toUpperCase());
}

function isColorValue(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
