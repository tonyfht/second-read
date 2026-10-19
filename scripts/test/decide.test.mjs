import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicableCriteria, decide, evaluate, feedbackFor, normalizeAnswer,
  passes, pickBest, resolveThresholds, validateJudgment,
} from "../../skills/second-read/scripts/decide.mjs";
import { judgment, loadRubric } from "./helpers.mjs";

const rubric = loadRubric();
const T = resolveThresholds(rubric);
const byId = (id) => rubric.criteria.find((c) => c.id === id);

test("voice_fit only applies with a style guide", () => {
  assert.ok(!applicableCriteria(rubric).some((c) => c.id === "voice_fit"));
  assert.ok(applicableCriteria(rubric, { hasStyleGuide: true }).some((c) => c.id === "voice_fit"));
});

test("answers are normalized and range-checked", () => {
  assert.equal(normalizeAnswer(byId("clarity"), "4"), 4);
  assert.equal(normalizeAnswer(byId("clarity"), 6), undefined);
  assert.equal(normalizeAnswer(byId("clarity"), 3.5), undefined);
  assert.equal(normalizeAnswer(byId("hook_strength"), " Strong "), "strong");
  assert.equal(normalizeAnswer(byId("hook_strength"), "amazing"), undefined);
  assert.equal(normalizeAnswer(byId("unsupported_claims"), "YES"), "yes");
  assert.equal(normalizeAnswer(byId("unsupported_claims"), true), undefined);
});

test("pass rules: pass_if, pass_min, pass_max", () => {
  assert.equal(passes(byId("hook_strength"), "adequate"), true);
  assert.equal(passes(byId("hook_strength"), "weak"), false);
  assert.equal(passes(byId("clarity"), 4), true);
  assert.equal(passes(byId("clarity"), 3), false);
  assert.equal(passes(byId("sounds_like_ai"), 2), true);
  assert.equal(passes(byId("sounds_like_ai"), 3), false);
  assert.equal(passes(byId("unsupported_claims"), "no"), true);
});

test("validation rejects missing, extra, duplicate and invalid answers", () => {
  assert.equal(validateJudgment(rubric, judgment()).ok, true);
  const missing = judgment();
  missing.criteria.pop();
  assert.match(validateJudgment(rubric, missing).errors.join(), /missing criterion/);
  const extra = judgment({ voice_fit: 5 }, { styleGuide: true });
  assert.match(validateJudgment(rubric, extra).errors.join(), /unexpected criterion "voice_fit"/);
  const dup = judgment();
  dup.criteria.push(dup.criteria[0]);
  assert.match(validateJudgment(rubric, dup).errors.join(), /answered twice/);
  assert.match(validateJudgment(rubric, judgment({ clarity: 9 })).errors.join(), /invalid answer/);
  assert.equal(validateJudgment(rubric, {}).ok, false);
  assert.throws(() => evaluate(rubric, judgment({ clarity: 9 })), /Invalid judgment/);
});

test("a clean text passes with score 1 and is accepted", () => {
  const e = evaluate(rubric, judgment());
  assert.equal(e.score, 1);
  assert.equal(e.passed, true);
  assert.equal(decide(e, 0, T), "accept");
});

test("one failed required criterion fails even with a high score", () => {
  const e = evaluate(rubric, judgment({ unsupported_claims: "yes" }));
  assert.ok(e.score >= T.min_score);
  assert.deepEqual(e.requiredFailures, ["unsupported_claims"]);
  assert.equal(e.passed, false);
  assert.equal(decide(e, 0, T), "rewrite");
});

test("optional failures pass down to exactly min_score", () => {
  // Without a style guide the weights add up to 12; optional ones weigh 1 each.
  const three = evaluate(rubric, judgment({ overpromising: "yes", single_cta: "multiple", format_fit: "too_long" }));
  assert.equal(three.score, 0.75);
  assert.equal(three.passed, true);
  const four = evaluate(rubric, judgment({ overpromising: "yes", single_cta: "none", format_fit: "too_long", one_main_idea: "no" }));
  assert.equal(four.score, 0.667);
  assert.equal(four.passed, false);
});

test("threshold overrides change the outcome", () => {
  const j = judgment({ single_cta: "multiple" });
  assert.equal(evaluate(rubric, j).passed, true);
  assert.equal(evaluate(rubric, j, {}, { min_score: 0.95 }).passed, false);
  assert.throws(() => resolveThresholds(rubric, { min_score: 2 }), /min_score/);
  assert.throws(() => resolveThresholds(rubric, { max_rewrites: -1 }), /max_rewrites/);
  assert.equal(resolveThresholds(rubric, { max_rewrites: 0 }).max_rewrites, 0);
});

test("decide stops after max_rewrites", () => {
  const e = evaluate(rubric, judgment({ clarity: 2 }));
  assert.equal(decide(e, 0, T), "rewrite");
  assert.equal(decide(e, 1, T), "rewrite");
  assert.equal(decide(e, 2, T), "stop");
  assert.equal(decide(e, 0, { ...T, max_rewrites: 0 }), "stop");
});

test("a style guide adds voice_fit as a required criterion", () => {
  const e = evaluate(rubric, judgment({ voice_fit: 3 }, { styleGuide: true }), { hasStyleGuide: true });
  assert.deepEqual(e.requiredFailures, ["voice_fit"]);
});

test("feedback contains only failed criteria, with their fixes", () => {
  const e = evaluate(rubric, judgment({ hook_strength: "weak", single_cta: "multiple" }));
  assert.deepEqual(feedbackFor(e).map((f) => [f.id, f.required, f.fix]), [
    ["hook_strength", true, "fix hook_strength"],
    ["single_cta", false, "fix single_cta"],
  ]);
  assert.equal(e.results.find((r) => r.id === "clarity").fix, "");
});

test("pickBest prefers passing, then fewer required failures, then score, then earlier", () => {
  const v = (text, overrides) => ({ text, evaluation: evaluate(rubric, judgment(overrides)) });
  const twoRequired = v("a", { clarity: 2, hook_strength: "weak" });
  const oneRequired = v("b", { clarity: 2 });
  const passing = v("c", { single_cta: "none" });
  assert.equal(pickBest([twoRequired, oneRequired]).text, "b");
  assert.equal(pickBest([oneRequired, passing, v("d", {})]).text, "d");
  assert.equal(pickBest([passing, twoRequired]).text, "c");
  assert.equal(pickBest([oneRequired, v("e", { clarity: 2 })]).text, "b");
  assert.throws(() => pickBest([]));
});
