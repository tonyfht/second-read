#!/usr/bin/env node
// Second Read outside Claude: draft or take a text, judge it with the rubric
// (structured JSON output), let code decide, rewrite at most N times, print
// the final text and a report. Needs ANTHROPIC_API_KEY in the environment.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { applicableCriteria, validateJudgment, validateRubric } from "../skills/second-read/scripts/decide.mjs";
import { formatReport, runLoop } from "./lib/loop.mjs";
import {
  JUDGE_SYSTEM,
  WRITER_SCHEMA,
  WRITER_SYSTEM,
  buildDraftPrompt,
  buildJudgePrompt,
  buildRewritePrompt,
  detectLanguage,
  schemaForApi,
} from "./lib/prompts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = join(here, "..", "skills", "second-read");

const USAGE = `Usage:
  node second-read.mjs <file>            review and improve a text (or - for stdin)
  node second-read.mjs --brief "..."     write a first draft, then review it

Options:
  --format <text>         linkedin post, newsletter, article... (default: inferred)
  --reader <text>         target reader (default: inferred)
  --style-guide <file>    voice or style guide; enables the voice_fit criterion
  --rubric <file>         custom rubric (default: skills/second-read/rubric.json)
  --min-score <0..1>      override the rubric's min_score
  --max-rewrites <n>      override the rubric's max_rewrites (0 = judge only)
  --rewrite-on-embedded-instructions
                          keep rewriting even if the text tries to instruct
                          the reviewer (default: stop for review)
  --model <id>            writer model (default: claude-opus-5-5)
  --judge-model <id>      judge model (default: same as --model)
  --json                  print the full result as JSON
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    brief: { type: "string" },
    format: { type: "string" },
    reader: { type: "string" },
    "style-guide": { type: "string" },
    rubric: { type: "string", default: join(skillDir, "rubric.json") },
    "min-score": { type: "string" },
    "max-rewrites": { type: "string" },
    "rewrite-on-embedded-instructions": { type: "boolean" },
    model: { type: "string", default: "claude-opus-5-5" },
    "judge-model": { type: "string" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || (!values.brief && positionals.length === 0)) {
  process.stdout.write(USAGE);
  process.exit(values.help ? 0 : 1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY in your environment first.");
  process.exit(1);
}

const rubric = JSON.parse(readFileSync(values.rubric, "utf8"));
const rubricCheck = validateRubric(rubric);
if (!rubricCheck.ok) {
  console.error(`Invalid rubric ${values.rubric}:\n- ${rubricCheck.errors.join("\n- ")}`);
  process.exit(1);
}
const judgeSchema = schemaForApi(JSON.parse(readFileSync(join(skillDir, "judge.schema.json"), "utf8")));
const styleGuide = values["style-guide"] ? readFileSync(values["style-guide"], "utf8") : "";
const ctx = { hasStyleGuide: Boolean(styleGuide) };
const overrides = {
  min_score: values["min-score"] === undefined ? undefined : Number(values["min-score"]),
  max_rewrites: values["max-rewrites"] === undefined ? undefined : Number(values["max-rewrites"]),
  rewrite_on_embedded_instructions: values["rewrite-on-embedded-instructions"],
};
const writerModel = values.model;
const judgeModel = values["judge-model"] ?? writerModel;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

// One structured-output call. `fallbacks: "default"` lets the API retry on
// Anthropic's recommended model if a safety classifier declines the request.
async function callJson({ model, system, prompt, schema, effort, signal }) {
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: prompt }],
  }, { signal });
  if (response.stop_reason === "refusal") {
    throw new Error(`The model declined the request (${response.stop_details?.category ?? "no category"}).`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The response hit max_tokens before finishing.");
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

const criteria = applicableCriteria(rubric, ctx);

async function judge(text, { signal } = {}) {
  const prompt = buildJudgePrompt({
    text, criteria, lang: detectLanguage(text),
    format: values.format, reader: values.reader, styleGuide,
  });
  // Structured outputs guarantee the shape; the rubric check catches missing
  // criteria or out-of-range answers. One retry, then give up.
  for (let attempt = 1; ; attempt++) {
    const judgment = await callJson({ model: judgeModel, system: JUDGE_SYSTEM, prompt, schema: judgeSchema, effort: "medium", signal });
    const check = validateJudgment(rubric, judgment, ctx);
    if (check.ok) return judgment;
    if (attempt >= 2) throw new Error(`The judge's answer does not match the rubric: ${check.errors.join("; ")}`);
  }
}

async function rewrite(text, feedback, { signal } = {}) {
  const prompt = buildRewritePrompt({ text, feedback, format: values.format, styleGuide });
  const { text: next } = await callJson({ model: writerModel, system: WRITER_SYSTEM, prompt, schema: WRITER_SCHEMA, effort: "high", signal });
  return next;
}

async function main() {
  // Ctrl+C cancels the call in flight. After round 0 the loop still delivers
  // the best judged version, with status "incomplete".
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort(new Error("interrupted")));
  const { signal } = controller;

  let text;
  if (values.brief) {
    const prompt = buildDraftPrompt({ brief: values.brief, format: values.format, reader: values.reader, styleGuide });
    ({ text } = await callJson({ model: writerModel, system: WRITER_SYSTEM, prompt, schema: WRITER_SCHEMA, effort: "high", signal }));
  } else {
    const source = positionals[0];
    text = readFileSync(source === "-" ? 0 : source, "utf8").trim();
  }

  const result = await runLoop({
    rubric, text, ctx, overrides, judge, rewrite, signal,
    onRound: (r) => console.error(`round ${r.round}: score ${r.evaluation.score.toFixed(2)} → ${r.decision}`),
  });

  if (values.json) {
    const error = result.error && { name: result.error.name, message: result.error.message };
    console.log(JSON.stringify({ ...result, error }, null, 2));
  } else {
    console.log(result.final.text);
    console.log("\n---\n");
    console.log(formatReport(result, detectLanguage(text)));
  }
  process.exitCode = { accepted: 0, open_issues: 3, needs_review: 4, incomplete: 5 }[result.status];
}

main().catch((err) => {
  if (err instanceof Anthropic.APIError) {
    console.error(`Anthropic API error ${err.status ?? ""}: ${err.message}`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
