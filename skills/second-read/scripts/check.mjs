#!/usr/bin/env node
// Turn a judge's JSON into a decision, with no network and no dependencies.
//
//   node check.mjs --judgment judgment.json [--style-guide] [--rewrites-done 0]
//   cat judgment.json | node check.mjs
//
// Options: --rubric <path> (default: ../rubric.json), --min-score <0..1>,
// --max-rewrites <n>. Prints JSON: decision ("accept" | "rewrite" | "stop"),
// score, failed required criteria and the fixes to apply. Exit 2 if the
// judgment does not match the rubric.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { decide, evaluate, feedbackFor, resolveThresholds, validateJudgment } from "./decide.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({
  options: {
    judgment: { type: "string" },
    rubric: { type: "string", default: join(here, "..", "rubric.json") },
    "style-guide": { type: "boolean", default: false },
    "rewrites-done": { type: "string", default: "0" },
    "min-score": { type: "string" },
    "max-rewrites": { type: "string" },
  },
});

const rubric = JSON.parse(readFileSync(values.rubric, "utf8"));
const raw = values.judgment && values.judgment !== "-"
  ? readFileSync(values.judgment, "utf8")
  : readFileSync(0, "utf8");
const judgment = JSON.parse(raw);
const ctx = { hasStyleGuide: values["style-guide"] };
const overrides = {
  min_score: values["min-score"] === undefined ? undefined : Number(values["min-score"]),
  max_rewrites: values["max-rewrites"] === undefined ? undefined : Number(values["max-rewrites"]),
};

const check = validateJudgment(rubric, judgment, ctx);
if (!check.ok) {
  console.log(JSON.stringify({ error: "invalid_judgment", details: check.errors }, null, 2));
  process.exit(2);
}

const thresholds = resolveThresholds(rubric, overrides);
const evaluation = evaluate(rubric, judgment, ctx, overrides);
const decision = decide(evaluation, Number(values["rewrites-done"]), thresholds);

console.log(JSON.stringify({
  decision,
  passed: evaluation.passed,
  score: evaluation.score,
  min_score: thresholds.min_score,
  required_failures: evaluation.requiredFailures,
  embedded_instructions: evaluation.embeddedInstructions,
  feedback: feedbackFor(evaluation),
}, null, 2));
