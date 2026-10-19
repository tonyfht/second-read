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

export const DEFAULT_THRESHOLDS = Object.freeze({
  min_score: 0.75,
  max_rewrites: 2,
  rewrite_on_embedded_instructions: false,
});

/** Max characters of judge-written `evidence` / `fix` passed on to a rewrite. */
export const FEEDBACK_MAX_LENGTH = 300;

function thresholdErrors(t) {
  const errors = [];
  if (!(typeof t.min_score === "number" && t.min_score >= 0 && t.min_score <= 1)) {
    errors.push(`min_score must be a number between 0 and 1, got ${JSON.stringify(t.min_score)}`);
  }
  if (!Number.isInteger(t.max_rewrites) || t.max_rewrites < 0) {
    errors.push(`max_rewrites must be a non-negative integer, got ${JSON.stringify(t.max_rewrites)}`);
  }
  if (typeof t.rewrite_on_embedded_instructions !== "boolean") {
    errors.push(`rewrite_on_embedded_instructions must be true or false, got ${JSON.stringify(t.rewrite_on_embedded_instructions)}`);
  }
  return errors;
}

/** Effective thresholds: defaults, then the rubric's, then explicit overrides. */
export function resolveThresholds(rubric, overrides = {}) {
  const base = { ...DEFAULT_THRESHOLDS, ...(rubric.thresholds ?? {}) };
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined && v !== null) base[k] = v;
  }
  const errors = thresholdErrors(base);
  if (errors.length) throw new Error(errors.join("; "));
  return base;
}

const TYPES = ["choice", "scale", "yes_no"];
const ONLY_IF = ["style_guide"];

/**
 * Check a rubric before using it: thresholds, unique snake_case ids, a
 * question in English at least, and pass rules that both pass and fail.
 */
export function validateRubric(rubric) {
  const errors = [];
  if (!rubric || typeof rubric !== "object") return { ok: false, errors: ["rubric must be an object"] };
  if (rubric.thresholds !== undefined) {
    errors.push(...thresholdErrors({ ...DEFAULT_THRESHOLDS, ...rubric.thresholds }).map((e) => `thresholds: ${e}`));
  }
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    errors.push("criteria must be a non-empty array");
    return { ok: false, errors };
  }
  const ids = new Set();
  rubric.criteria.forEach((c, i) => {
    const at = `criteria[${i}]${c?.id ? ` (${c.id})` : ""}`;
    if (!c || typeof c !== "object") { errors.push(`${at}: must be an object`); return; }
    if (typeof c.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(c.id)) errors.push(`${at}: id must be snake_case`);
    else if (ids.has(c.id)) errors.push(`${at}: duplicate id`);
    ids.add(c.id);
    if (!TYPES.includes(c.type)) { errors.push(`${at}: type must be one of ${TYPES.join(", ")}`); return; }
    if (typeof c.question?.en !== "string" || !c.question.en.trim()) errors.push(`${at}: question.en is required`);
    if (c.required !== undefined && typeof c.required !== "boolean") errors.push(`${at}: required must be true or false`);
    if (c.weight !== undefined && !(typeof c.weight === "number" && c.weight >= 0)) errors.push(`${at}: weight must be a number >= 0`);
    if (c.only_if !== undefined && !ONLY_IF.includes(c.only_if)) errors.push(`${at}: only_if must be one of ${ONLY_IF.join(", ")}`);
    if (c.type === "choice") {
      const opts = c.options;
      if (!Array.isArray(opts) || opts.length < 2 || opts.some((o) => typeof o !== "string" || o !== o.toLowerCase())) {
        errors.push(`${at}: options must be at least two lowercase strings`);
      } else if (new Set(opts).size !== opts.length) {
        errors.push(`${at}: options must be unique`);
      } else if (!Array.isArray(c.pass_if) || c.pass_if.length === 0 || c.pass_if.some((o) => !opts.includes(o))) {
        errors.push(`${at}: pass_if must be a non-empty subset of options`);
      } else if (c.pass_if.length === opts.length) {
        errors.push(`${at}: pass_if cannot include every option`);
      }
    }
    if (c.type === "yes_no" && c.pass_if !== "yes" && c.pass_if !== "no") errors.push(`${at}: pass_if must be "yes" or "no"`);
    if (c.type === "scale") {
      const { min, max } = c.scale ?? {};
      if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
        errors.push(`${at}: scale.min and scale.max must be integers with min < max`);
      } else if (c.pass_min === undefined && c.pass_max === undefined) {
        errors.push(`${at}: needs pass_min or pass_max`);
      } else {
        const lo = c.pass_min ?? min;
        const hi = c.pass_max ?? max;
        if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < min || hi > max || lo > hi) {
          errors.push(`${at}: pass_min / pass_max must be integers inside the scale`);
        } else if (lo === min && hi === max) {
          errors.push(`${at}: pass range covers the whole scale, so it can never fail`);
        }
      }
    }
  });
  return { ok: errors.length === 0, errors };
}

/** Shorten judge-written text before it reaches a rewrite prompt. */
export function truncate(text, max = FEEDBACK_MAX_LENGTH) {
  const s = String(text ?? "");
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
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
 * "stop": out of rewrites, or the text tried to instruct the reviewer; deliver
 * the best version with its open issues and let a person look.
 *
 * Embedded instructions stop the loop by default, even if the text passed:
 * the judgment may have been steered, and the judge's evidence and fixes
 * would carry that text into the rewrite. Opt in with
 * `rewrite_on_embedded_instructions: true`.
 */
export function decide(evaluation, rewritesDone, thresholds) {
  if (evaluation.embeddedInstructions && !thresholds.rewrite_on_embedded_instructions) return "stop";
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

/**
 * Concrete feedback for the writer: only the failed criteria, with fixes.
 * `evidence` and `fix` are cut to `maxLength` characters, so a long quote
 * from the reviewed text cannot smuggle much into the rewrite prompt.
 */
export function feedbackFor(evaluation, { maxLength = FEEDBACK_MAX_LENGTH } = {}) {
  return evaluation.results
    .filter((r) => !r.passed)
    .map((r) => ({
      id: r.id,
      answer: r.answer,
      required: r.required,
      evidence: truncate(r.evidence, maxLength),
      fix: truncate(r.fix, maxLength),
    }));
}
