#!/usr/bin/env node
// Turn a judge's JSON into a decision, with no network and no dependencies.
//
//   node check.mjs --judgment judgment.json [--style-guide] [--rewrites-done 0]
//   cat judgment.json | node check.mjs
//
// Options: --rubric <path> (default: ../rubric.json), --min-score <0..1>,
// --max-rewrites <n>, --rewrite-on-embedded-instructions. Prints JSON:
// decision ("accept" | "rewrite" | "stop"), score, failed required criteria
// and the fixes to apply (evidence and fix cut to 300 characters). A text
// that tries to instruct the reviewer stops the loop unless you opt in.
// Exit 2 if the rubric is invalid or the judgment does not match it.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { decide, evaluate, feedbackFor, resolveThresholds, validateJudgment, validateRubric } from "./decide.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({
  options: {
    judgment: { type: "string" },
    rubric: { type: "string", default: join(here, "..", "rubric.json") },
    "style-guide": { type: "boolean", default: false },
    "rewrites-done": { type: "string", default: "0" },
    "min-score": { type: "string" },
    "max-rewrites": { type: "string" },
    "rewrite-on-embedded-instructions": { type: "boolean" },
  },
});

const rubric = JSON.parse(readFileSync(values.rubric, "utf8"));
const rubricCheck = validateRubric(rubric);
if (!rubricCheck.ok) {
  console.log(JSON.stringify({ error: "invalid_rubric", details: rubricCheck.errors }, null, 2));
  process.exit(2);
}
const raw = values.judgment && values.judgment !== "-"
  ? readFileSync(values.judgment, "utf8")
  : readFileSync(0, "utf8");
const judgment = JSON.parse(raw);
const ctx = { hasStyleGuide: values["style-guide"] };
const overrides = {
  min_score: values["min-score"] === undefined ? undefined : Number(values["min-score"]),
  max_rewrites: values["max-rewrites"] === undefined ? undefined : Number(values["max-rewrites"]),
  rewrite_on_embedded_instructions: values["rewrite-on-embedded-instructions"],
};

const check = validateJudgment(rubric, judgment, ctx);
if (!check.ok) {
  console.log(JSON.stringify({ error: "invalid_judgment", details: check.errors }, null, 2));
  process.exit(2);
}

const thresholds = resolveThresholds(rubric, overrides);
const evaluation = evaluate(rubric, judgment, ctx, overrides);
const decision = decide(evaluation, Number(values["rewrites-done"]), thresholds);

const feedback = feedbackFor(evaluation);
const warnings = feedback
  .filter((f) => !f.fix)
  .map((f) => `"${f.id}" failed but has no fix: pass the judge's JSON unedited, or judge again`);

console.log(JSON.stringify({
  decision,
  passed: evaluation.passed,
  score: evaluation.score,
  min_score: thresholds.min_score,
  required_failures: evaluation.requiredFailures,
  embedded_instructions: evaluation.embeddedInstructions,
  ...(evaluation.embeddedInstructions && decision === "stop" && !thresholds.rewrite_on_embedded_instructions
    ? { stop_reason: "embedded_instructions" }
    : {}),
  feedback,
  ...(warnings.length ? { warnings } : {}),
}, null, 2));
