// Types for second-read/loop (scripts/lib/loop.mjs).

import type { Context, Decision, Evaluation, Feedback, Judgment, Rubric, Thresholds } from "./decide.js";

export interface Round {
  round: number;
  text: string;
  evaluation: Evaluation;
  decision: Decision;
}

export type LoopStatus = "accepted" | "open_issues" | "needs_review" | "incomplete";

export interface LoopResult {
  status: LoopStatus;
  /** The version to deliver (see pickBest). Always a judged round. */
  final: Round;
  /** Judged rounds only; a rewrite whose judgment failed is not included. */
  history: Round[];
  thresholds: Thresholds;
  /** Set when status is "incomplete": the failure or the abort reason. */
  error?: Error;
}

export interface CallOptions {
  signal?: AbortSignal;
}

/**
 * Throws if round 0 cannot be judged (or the signal is already aborted).
 * Later failures or aborts return status "incomplete" with `error`.
 */
export function runLoop(options: {
  rubric: Rubric;
  text: string;
  ctx?: Context;
  overrides?: Partial<Thresholds>;
  /** Must return a judgment that passes validateJudgment. */
  judge: (text: string, options: CallOptions) => Promise<Judgment>;
  rewrite: (text: string, feedback: Feedback[], options: CallOptions) => Promise<string>;
  onRound?: (round: Round) => void;
  /** Checked before every judge and rewrite call, and passed on to them. */
  signal?: AbortSignal;
}): Promise<LoopResult>;

export function formatReport(result: LoopResult, lang?: string): string;
