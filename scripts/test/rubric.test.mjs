import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeAnswer, passes, resolveThresholds } from "../../skills/second-read/scripts/decide.mjs";
import { loadRubric, skillDir } from "./helpers.mjs";

const rubric = loadRubric();

test("every criterion is well formed and bilingual", () => {
  const ids = new Set();
  for (const c of rubric.criteria) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.match(c.id, /^[a-z][a-z0-9_]*$/);
    assert.ok(["choice", "scale", "yes_no"].includes(c.type), c.id);
    assert.ok(c.question.en && c.question.es, `${c.id} needs en and es questions`);
    if (c.type === "choice") {
      assert.ok(c.pass_if.length > 0 && c.pass_if.every((o) => c.options.includes(o)), c.id);
    }
    if (c.type === "yes_no") assert.ok(["yes", "no"].includes(c.pass_if), c.id);
    if (c.type === "scale") {
      assert.ok(c.pass_min !== undefined || c.pass_max !== undefined, c.id);
      assert.ok(c.scale.labels.en && c.scale.labels.es, c.id);
    }
  }
});

test("every criterion can both pass and fail", () => {
  for (const c of rubric.criteria) {
    const values = c.type === "choice" ? c.options
      : c.type === "yes_no" ? ["yes", "no"]
      : Array.from({ length: c.scale.max - c.scale.min + 1 }, (_, i) => c.scale.min + i);
    const outcomes = new Set(values.map((v) => passes(c, normalizeAnswer(c, v))));
    assert.deepEqual([...outcomes].sort(), [false, true], c.id);
  }
});

test("default thresholds are the documented values", () => {
  assert.deepEqual(resolveThresholds(rubric), { min_score: 0.75, max_rewrites: 2 });
});

test("judge schema is valid JSON and avoids unsupported constraints", () => {
  const raw = readFileSync(join(skillDir, "judge.schema.json"), "utf8");
  JSON.parse(raw);
  for (const kw of ["minimum", "maximum", "minLength", "maxLength", "multipleOf"]) {
    assert.ok(!raw.includes(`"${kw}"`), `schema uses ${kw}`);
  }
});
