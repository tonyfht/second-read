// The evaluator-optimizer loop, independent of any API: `judge` and `rewrite`
// are injected, so the loop can run against Claude or against test fakes.

import {
  decide,
  evaluate,
  feedbackFor,
  pickBest,
  resolveThresholds,
} from "../../skills/second-read/scripts/decide.mjs";

const asError = (e) => (e instanceof Error ? e : new Error(String(e)));

/**
 * judge(text, { signal }) -> judgment JSON (already schema-valid)
 * rewrite(text, feedback, { signal }) -> new text
 * Returns the delivered version, every round, and the thresholds used.
 * status: "accepted" | "open_issues" | "needs_review" (the text tried to
 * instruct the reviewer, so the loop stopped without rewriting) |
 * "incomplete" (a judge or rewrite call failed or was aborted after round 0;
 * the best judged version is delivered and `error` says why).
 *
 * A failure or abort before round 0 has been judged throws: there is nothing
 * judged to deliver. An unjudged rewrite is never delivered.
 */
export async function runLoop({ rubric, text, ctx = {}, overrides = {}, judge, rewrite, onRound, signal }) {
  const thresholds = resolveThresholds(rubric, overrides);
  const history = [];
  let current = text;
  let error;
  for (let round = 0; ; round++) {
    let evaluation;
    try {
      signal?.throwIfAborted();
      const judgment = await judge(current, { signal });
      evaluation = evaluate(rubric, judgment, ctx, overrides);
    } catch (e) {
      if (history.length === 0) throw e;
      error = asError(e);
      break;
    }
    const decision = decide(evaluation, round, thresholds);
    history.push({ round, text: current, evaluation, decision });
    onRound?.(history.at(-1));
    if (decision !== "rewrite") break;
    try {
      signal?.throwIfAborted();
      current = await rewrite(current, feedbackFor(evaluation), { signal });
    } catch (e) {
      error = asError(e);
      break;
    }
  }
  const final = pickBest(history);
  if (error) return { status: "incomplete", final, history, thresholds, error };
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
    incomplete: (n, msg) => `incomplete (${msg}); delivered the best judged version, from round ${n}`,
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
    incomplete: (n, msg) => `incompleto (${msg}); se entrega la mejor versión juzgada, de la ronda ${n}`,
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
    : result.status === "incomplete" ? L.incomplete(final.round, result.error?.message ?? "error")
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
