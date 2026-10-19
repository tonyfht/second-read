import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
const rubric = JSON.parse(readFileSync(join(root, "skills", "second-read", "rubric.json"), "utf8"));

const CORE = [
  "index.mjs",
  "skills/second-read/scripts/decide.mjs",
  "skills/second-read/scripts/check.mjs",
  "scripts/lib/prompts.mjs",
  "scripts/lib/loop.mjs",
];

test("the library has no runtime dependencies", () => {
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.peerDependencies, undefined);
  for (const file of CORE) {
    const src = readFileSync(join(root, file), "utf8");
    for (const [, spec] of src.matchAll(/^\s*(?:import|export)\b[^;]*?from\s+["']([^"']+)["']/gm)) {
      assert.ok(spec.startsWith("node:") || spec.startsWith("."), `${file} imports "${spec}"`);
    }
  }
});

test("package exports resolve to working modules", async () => {
  const decide = await import("second-read/decide");
  const prompts = await import("second-read/prompts");
  const loop = await import("second-read/loop");
  const all = await import("second-read");
  const { default: rubricJson } = await import("second-read/rubric.json", { with: { type: "json" } });
  const { default: schema } = await import("second-read/judge.schema.json", { with: { type: "json" } });
  assert.equal(typeof decide.validateRubric, "function");
  assert.equal(typeof prompts.buildRewritePrompt, "function");
  assert.equal(typeof loop.runLoop, "function");
  for (const name of ["evaluate", "decide", "pickBest", "buildJudgePrompt", "runLoop", "formatReport"]) {
    assert.equal(typeof all[name], "function", name);
  }
  assert.ok(decide.validateRubric(rubricJson).ok);
  assert.equal(schema.type, "object");
});

test("versions agree across package, plugin and rubric", () => {
  assert.equal(pkg.version, plugin.version);
  assert.equal(pkg.version, rubric.version);
  assert.match(readFileSync(join(root, "CHANGELOG.md"), "utf8"), new RegExp(`## \\[${pkg.version.replace(/\./g, "\\.")}\\]`));
});
