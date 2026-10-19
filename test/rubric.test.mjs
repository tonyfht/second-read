import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_THRESHOLDS, normalizeAnswer, passes, resolveThresholds, validateRubric,
} from "../skills/second-read/scripts/decide.mjs";
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

test("unsupported_claims excludes placeholders, checkable arithmetic and public facts", () => {
  const q = rubric.criteria.find((c) => c.id === "unsupported_claims").question;
  for (const lang of ["en", "es"]) assert.match(q[lang], /\[placeholder\]/, lang);
  assert.match(q.en, /arithmetic/);
  assert.match(q.es, /cálculos/);
});

test("default thresholds are the documented values", () => {
  assert.deepEqual(resolveThresholds(rubric), { min_score: 0.75, max_rewrites: 2, rewrite_on_embedded_instructions: false });
  assert.deepEqual(resolveThresholds({ criteria: [] }), DEFAULT_THRESHOLDS);
});

test("the shipped rubric is valid", () => {
  assert.deepEqual(validateRubric(rubric), { ok: true, errors: [] });
});

test("validateRubric reports broken rubrics", () => {
  const base = structuredClone(rubric);
  const broken = (mutate) => { const r = structuredClone(base); mutate(r); return validateRubric(r).errors.join("\n"); };
  assert.equal(validateRubric(null).ok, false);
  assert.match(broken((r) => { r.criteria = []; }), /non-empty array/);
  assert.match(broken((r) => { r.thresholds.min_score = 2; }), /thresholds: min_score/);
  assert.match(broken((r) => { r.thresholds.rewrite_on_embedded_instructions = "no"; }), /rewrite_on_embedded_instructions/);
  assert.match(broken((r) => { r.criteria[1].id = r.criteria[0].id; }), /duplicate id/);
  assert.match(broken((r) => { r.criteria[0].id = "Hook Strength"; }), /snake_case/);
  assert.match(broken((r) => { r.criteria[0].type = "free_text"; }), /type must be/);
  assert.match(broken((r) => { delete r.criteria[0].question.en; }), /question.en/);
  assert.match(broken((r) => { r.criteria[0].pass_if = ["great"]; }), /subset of options/);
  assert.match(broken((r) => { r.criteria[0].pass_if = [...r.criteria[0].options]; }), /every option/);
  assert.match(broken((r) => { r.criteria[0].options = ["Strong", "weak"]; }), /lowercase/);
  assert.match(broken((r) => { r.criteria[2].pass_if = true; }), /"yes" or "no"/);
  assert.match(broken((r) => { delete r.criteria[5].pass_min; }), /pass_min or pass_max/);
  assert.match(broken((r) => { r.criteria[5].pass_min = 9; }), /inside the scale/);
  assert.match(broken((r) => { r.criteria[5].pass_min = 1; }), /never fail/);
  assert.match(broken((r) => { r.criteria[0].weight = -1; }), /weight/);
  assert.match(broken((r) => { r.criteria[8].only_if = "always"; }), /only_if/);
  // Spanish is optional for custom rubrics; English is the fallback.
  assert.equal(broken((r) => { delete r.criteria[0].question.es; }), "");
});

test("judge schema is valid JSON and avoids unsupported constraints", () => {
  const raw = readFileSync(join(skillDir, "judge.schema.json"), "utf8");
  JSON.parse(raw);
  for (const kw of ["minimum", "maximum", "minLength", "maxLength", "multipleOf"]) {
    assert.ok(!raw.includes(`"${kw}"`), `schema uses ${kw}`);
  }
});
