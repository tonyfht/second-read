// Compile-only check that the published types resolve through the package
// exports and describe the API as a TypeScript consumer would use it.

import { evaluate, decide, resolveThresholds, validateRubric, type Judgment, type Rubric } from "second-read/decide";
import { buildRewritePrompt } from "second-read/prompts";
import { runLoop, formatReport } from "second-read/loop";
import * as all from "second-read";
import rubricJson from "second-read/rubric.json" with { type: "json" };

const rubric = rubricJson as Rubric;
const check: { ok: boolean; errors: string[] } = validateRubric(rubric);
const thresholds = resolveThresholds(rubric, { max_rewrites: 1 });

declare const judgment: Judgment;
const evaluation = evaluate(rubric, judgment, { hasStyleGuide: false });
const decision: "accept" | "rewrite" | "stop" = decide(evaluation, 0, thresholds);

const prompt: string = buildRewritePrompt({ text: "t", feedback: all.feedbackFor(evaluation) });

const result = await runLoop({
  rubric,
  text: "draft",
  judge: async () => judgment,
  rewrite: async (text, feedback) => `${text} ${feedback.length}`,
});
const status: "accepted" | "open_issues" | "needs_review" = result.status;
const report: string = formatReport(result, "es");

export { check, decision, prompt, status, report };
