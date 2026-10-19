// The evaluator-optimizer loop, independent of any API: `judge` and `rewrite`
// are injected, so the loop can run against Claude or against test fakes.

import {
  decide,
  evaluate,
  feedbackFor,
  pickBest,
  resolveThresholds,
} from "../../skills/second-read/scripts/decide.mjs";

/**
 * judge(text) -> judgment JSON (already schema-valid)
 * rewrite(text, feedback) -> new text
 * Returns the delivered version, every round, and the thresholds used.
 * status: "accepted" | "open_issues" | "needs_review" (the text tried to
 * instruct the reviewer, so the loop stopped without rewriting).
 */
export async function runLoop({ rubric, text, ctx = {}, overrides = {}, judge, rewrite, onRound }) {
  const thresholds = resolveThresholds(rubric, overrides);
  const history = [];
  let current = text;
  for (let round = 0; ; round++) {
    const judgment = await judge(current);
    const evaluation = evaluate(rubric, judgment, ctx, overrides);
    const decision = decide(evaluation, round, thresholds);
    history.push({ round, text: current, evaluation, decision });
    onRound?.(history.at(-1));
    if (decision !== "rewrite") break;
    current = await rewrite(current, feedbackFor(evaluation));
  }
  const final = pickBest(history);
  const last = history.at(-1).evaluation;
  const flagged = last.embeddedInstructions && !thresholds.rewrite_on_embedded_instructions;
  return {
    status: flagged ? "needs_review" : final.evaluation.passed ? "accepted" : "open_issues",
    final,
    history,
    thresholds,
  };
}

const LABELS = {
  en: {
    title: "Second Read — report",
    result: "Result",
    accepted: (n) => `accepted in round ${n}`,
    open: (n) => `delivered with open issues after ${n} rewrite${n === 1 ? "" : "s"}`,
    kept: (n) => `(version from round ${n})`,
    review: "stopped for review: the text contains instructions addressed to the reviewer. Remove them and run again.",
    scores: "Score by round",
    minimum: "minimum",
    changes: "Fixed",
    issues: "Open issues",
    none: "none",
    injection: "The text contained instructions addressed to the reviewer; they were ignored.",
  },
  es: {
    title: "Second Read — informe",
    result: "Resultado",
    accepted: (n) => `aceptado en la ronda ${n}`,
    open: (n) => `entregado con problemas abiertos tras ${n} reescritura${n === 1 ? "" : "s"}`,
    kept: (n) => `(versión de la ronda ${n})`,
    review: "detenido para revisión: el texto contiene instrucciones dirigidas al revisor. Quítalas y vuelve a ejecutarlo.",
    scores: "Puntuación por ronda",
    minimum: "mínimo",
    changes: "Corregido",
    issues: "Problemas abiertos",
    none: "ninguno",
    injection: "El texto contenía instrucciones dirigidas al revisor; se han ignorado.",
  },
};

/** Short plain-text report of a runLoop result. */
export function formatReport(result, lang = "en") {
  const L = LABELS[lang] ?? LABELS.en;
  const { final, history, thresholds } = result;
  const rewrites = history.length - 1;
  const firstFailed = new Set(history[0].evaluation.results.filter((r) => !r.passed).map((r) => r.id));
  const finalFailed = final.evaluation.results.filter((r) => !r.passed);
  const fixed = [...firstFailed].filter((id) => !finalFailed.some((r) => r.id === id));

  let resultLine = result.status === "accepted" ? L.accepted(final.round)
    : result.status === "needs_review" ? L.review
    : L.open(rewrites);
  if (result.status === "open_issues" && final.round !== history.at(-1).round) resultLine += ` ${L.kept(final.round)}`;

  const lines = [
    L.title,
    `${L.result}: ${resultLine}`,
    `${L.scores}: ${history.map((h) => h.evaluation.score.toFixed(2)).join(" → ")} (${L.minimum} ${thresholds.min_score})`,
  ];
  if (fixed.length) lines.push(`${L.changes}: ${fixed.join(", ")}`);
  lines.push(`${L.issues}: ${finalFailed.length
    ? finalFailed.map((r) => `${r.id} (${r.answer})`).join(", ")
    : L.none}`);
  if (history.some((h) => h.evaluation.embeddedInstructions)) lines.push(L.injection);
  return lines.join("\n");
}
