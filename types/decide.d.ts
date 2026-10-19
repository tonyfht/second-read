// Types for second-read/decide (skills/second-read/scripts/decide.mjs).

export type Lang = "en" | "es" | (string & {});
export type LocalizedText = { en: string } & Partial<Record<string, string>>;

interface CriterionBase {
  id: string;
  required?: boolean;
  weight?: number;
  question: LocalizedText;
  /** Apply only when a style guide is provided. */
  only_if?: "style_guide";
}

export interface ChoiceCriterion extends CriterionBase {
  type: "choice";
  options: string[];
  pass_if: string[];
}

export interface ScaleCriterion extends CriterionBase {
  type: "scale";
  scale: { min: number; max: number; labels?: Partial<Record<string, Record<string, string>>> };
  pass_min?: number;
  pass_max?: number;
}

export interface YesNoCriterion extends CriterionBase {
  type: "yes_no";
  pass_if: "yes" | "no";
}

export type Criterion = ChoiceCriterion | ScaleCriterion | YesNoCriterion;

export interface Thresholds {
  /** Minimum weighted score, 0 to 1. Default 0.75. */
  min_score: number;
  /** Rewrites allowed after the first draft. Default 2. */
  max_rewrites: number;
  /** Keep rewriting when the text tries to instruct the reviewer. Default false. */
  rewrite_on_embedded_instructions: boolean;
}

export interface Rubric {
  version?: string;
  thresholds?: Partial<Thresholds>;
  criteria: Criterion[];
}

export type Answer = string | number;

/** The judge's answer, shaped by judge.schema.json. */
export interface Judgment {
  criteria: Array<{ id: string; answer: Answer; evidence: string; fix: string }>;
  embedded_instructions: boolean;
  summary: string;
}

export interface Context {
  hasStyleGuide?: boolean;
}

export interface CriterionResult {
  id: string;
  answer: Answer;
  passed: boolean;
  required: boolean;
  weight: number;
  evidence: string;
  fix: string;
}

export interface Evaluation {
  results: CriterionResult[];
  /** Weighted share of passing criteria, 0 to 1, rounded to 3 decimals. */
  score: number;
  requiredFailures: string[];
  passed: boolean;
  embeddedInstructions: boolean;
  summary: string;
}

export type Decision = "accept" | "rewrite" | "stop";

export interface Feedback {
  id: string;
  answer: Answer;
  required: boolean;
  evidence: string;
  fix: string;
}

export interface Version {
  text: string;
  evaluation: Evaluation;
}

export interface CheckResult {
  ok: boolean;
  errors: string[];
}

export const DEFAULT_THRESHOLDS: Readonly<Thresholds>;
export const FEEDBACK_MAX_LENGTH: number;

export function applicableCriteria(rubric: Rubric, ctx?: Context): Criterion[];
export function resolveThresholds(rubric: Rubric, overrides?: Partial<Thresholds>): Thresholds;
export function validateRubric(rubric: unknown): CheckResult;
export function truncate(text: unknown, max?: number): string;
export function normalizeAnswer(criterion: Criterion, answer: unknown): Answer | undefined;
export function passes(criterion: Criterion, answer: Answer): boolean;
export function validateJudgment(rubric: Rubric, judgment: unknown, ctx?: Context): CheckResult;
export function evaluate(rubric: Rubric, judgment: Judgment, ctx?: Context, overrides?: Partial<Thresholds>): Evaluation;
export function decide(evaluation: Evaluation, rewritesDone: number, thresholds: Thresholds): Decision;
export function pickBest<V extends Version>(history: V[]): V;
export function feedbackFor(evaluation: Evaluation, options?: { maxLength?: number }): Feedback[];
