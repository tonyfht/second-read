// Pure decision logic for Second Read. No I/O, no network: the judge answers
// closed questions, and this module turns those answers into a decision.

/** Criteria that apply to this run. `only_if: "style_guide"` needs a guide. */
export function applicableCriteria(rubric, { hasStyleGuide = false } = {}) {
  return rubric.criteria.filter((c) => {
    if (!c.only_if) return true;
    if (c.only_if === "style_guide") return hasStyleGuide;
    return false;
  });
}

/** Effective thresholds: rubric defaults, overridden by explicit options. */
export function resolveThresholds(rubric, overrides = {}) {
  const base = { min_score: 0.75, max_rewrites: 2, ...(rubric.thresholds ?? {}) };
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined && v !== null) base[k] = v;
  }
  if (!(base.min_score >= 0 && base.min_score <= 1)) {
    throw new Error(`min_score must be between 0 and 1, got ${base.min_score}`);
  }
  if (!Number.isInteger(base.max_rewrites) || base.max_rewrites < 0) {
    throw new Error(`max_rewrites must be a non-negative integer, got ${base.max_rewrites}`);
  }
  return base;
}

/** Coerce an answer to the criterion's type, or return undefined if invalid. */
export function normalizeAnswer(criterion, answer) {
  switch (criterion.type) {
    case "choice": {
      const a = String(answer).trim().toLowerCase();
      return criterion.options.includes(a) ? a : undefined;
    }
    case "scale": {
      const n = typeof answer === "number" ? answer : Number(String(answer).trim());
      const { min, max } = criterion.scale;
      return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
    }
    case "yes_no": {
      const a = String(answer).trim().toLowerCase();
      return a === "yes" || a === "no" ? a : undefined;
    }
    default:
      throw new Error(`Unknown criterion type "${criterion.type}" (${criterion.id})`);
  }
}

/** Does a (normalized) answer pass the criterion's rule? */
export function passes(criterion, answer) {
  switch (criterion.type) {
    case "choice":
      return criterion.pass_if.includes(answer);
    case "yes_no":
      return answer === criterion.pass_if;
    case "scale":
      if (criterion.pass_min !== undefined && answer < criterion.pass_min) return false;
      if (criterion.pass_max !== undefined && answer > criterion.pass_max) return false;
      return true;
    default:
      throw new Error(`Unknown criterion type "${criterion.type}" (${criterion.id})`);
  }
}

/**
 * Check the judge's JSON against the rubric: every applicable criterion
 * answered exactly once, with a valid answer, and nothing else.
 */
export function validateJudgment(rubric, judgment, ctx = {}) {
  const errors = [];
  if (!judgment || !Array.isArray(judgment.criteria)) {
    return { ok: false, errors: ["judgment.criteria must be an array"] };
  }
  const expected = new Map(applicableCriteria(rubric, ctx).map((c) => [c.id, c]));
  const seen = new Set();
  for (const item of judgment.criteria) {
    const c = expected.get(item.id);
    if (!c) {
      errors.push(`unexpected criterion "${item.id}"`);
      continue;
    }
    if (seen.has(item.id)) errors.push(`criterion "${item.id}" answered twice`);
    seen.add(item.id);
    if (normalizeAnswer(c, item.answer) === undefined) {
      errors.push(`invalid answer ${JSON.stringify(item.answer)} for "${item.id}" (${c.type})`);
    }
  }
  for (const id of expected.keys()) {
    if (!seen.has(id)) errors.push(`missing criterion "${id}"`);
  }
  return { ok: errors.length === 0, errors };
}

/** Score a validated judgment. Throws if it is invalid. */
export function evaluate(rubric, judgment, ctx = {}, overrides = {}) {
  const check = validateJudgment(rubric, judgment, ctx);
  if (!check.ok) throw new Error(`Invalid judgment: ${check.errors.join("; ")}`);
  const thresholds = resolveThresholds(rubric, overrides);
  const byId = new Map(judgment.criteria.map((i) => [i.id, i]));

  let total = 0;
  let earned = 0;
  const results = applicableCriteria(rubric, ctx).map((c) => {
    const item = byId.get(c.id);
    const answer = normalizeAnswer(c, item.answer);
    const passed = passes(c, answer);
    const weight = c.weight ?? 1;
    total += weight;
    if (passed) earned += weight;
    return {
      id: c.id,
      answer,
      passed,
      required: Boolean(c.required),
      weight,
      evidence: item.evidence ?? "",
      fix: passed ? "" : item.fix ?? "",
    };
  });

  const score = total === 0 ? 1 : earned / total;
  const requiredFailures = results.filter((r) => r.required && !r.passed).map((r) => r.id);
  return {
    results,
    score: Math.round(score * 1000) / 1000,
    requiredFailures,
    passed: requiredFailures.length === 0 && score >= thresholds.min_score,
    embeddedInstructions: Boolean(judgment.embedded_instructions),
    summary: judgment.summary ?? "",
  };
}

/**
 * What to do after judging round `rewritesDone` (0 = the first draft).
 * "accept": publishable. "rewrite": try again with the fixes.
 * "stop": out of rewrites; deliver the best version with its open issues.
 */
export function decide(evaluation, rewritesDone, thresholds) {
  if (evaluation.passed) return "accept";
  if (rewritesDone < thresholds.max_rewrites) return "rewrite";
  return "stop";
}

/**
 * Pick the version to deliver from [{text, evaluation}, ...] in round order.
 * Passing beats failing, then fewer required failures, then higher score.
 * Ties keep the earlier version, so a rewrite has to earn its place.
 */
export function pickBest(history) {
  if (history.length === 0) throw new Error("pickBest needs at least one version");
  const rank = (e) => [e.passed ? 1 : 0, -e.requiredFailures.length, e.score];
  let best = history[0];
  for (const candidate of history.slice(1)) {
    const a = rank(candidate.evaluation);
    const b = rank(best.evaluation);
    for (let i = 0; i < a.length; i++) {
      if (a[i] > b[i]) { best = candidate; break; }
      if (a[i] < b[i]) break;
    }
  }
  return best;
}

/** Concrete feedback for the writer: only the failed criteria, with fixes. */
export function feedbackFor(evaluation) {
  return evaluation.results
    .filter((r) => !r.passed)
    .map((r) => ({
      id: r.id,
      answer: r.answer,
      required: r.required,
      evidence: r.evidence,
      fix: r.fix,
    }));
}
