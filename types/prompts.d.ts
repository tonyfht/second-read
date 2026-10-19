// Types for second-read/prompts (scripts/lib/prompts.mjs).

import type { Criterion, Feedback } from "./decide.js";

export function detectLanguage(text: string): "en" | "es";
export function schemaForApi<T>(schema: T): T;

export const JUDGE_SYSTEM: string;
export const WRITER_SYSTEM: string;
export const WRITER_SCHEMA: {
  type: "object";
  properties: { text: { type: "string" } };
  required: ["text"];
  additionalProperties: false;
};

export function buildJudgePrompt(input: {
  text: string;
  criteria: Criterion[];
  lang: string;
  format?: string;
  reader?: string;
  styleGuide?: string;
}): string;

export function buildDraftPrompt(input: {
  brief: string;
  format?: string;
  reader?: string;
  styleGuide?: string;
}): string;

export function buildRewritePrompt(input: {
  text: string;
  feedback: Feedback[];
  format?: string;
  styleGuide?: string;
}): string;
