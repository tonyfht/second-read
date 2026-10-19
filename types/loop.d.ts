// Types for second-read/loop (scripts/lib/loop.mjs).

import type { Context, Decision, Evaluation, Feedback, Judgment, Rubric, Thresholds } from "./decide.js";

export interface Round {
  round: number;
  text: string;
  evaluation: Evaluation;
  decision: Decision;
}

export type LoopStatus = "accepted" | "open_issues" | "needs_review";

export interface LoopResult {
  status: LoopStatus;
  /** The version to deliver (see pickBest). */
  final: Round;
  history: Round[];
  thresholds: Thresholds;
}

export function runLoop(options: {
  rubric: Rubric;
  text: string;
  ctx?: Context;
  overrides?: Partial<Thresholds>;
  /** Must return a judgment that passes validateJudgment. */
  judge: (text: string) => Promise<Judgment>;
  rewrite: (text: string, feedback: Feedback[]) => Promise<string>;
  onRound?: (round: Round) => void;
}): Promise<LoopResult>;

export function formatReport(result: LoopResult, lang?: string): string;
