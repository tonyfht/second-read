import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const skillDir = join(here, "..", "..", "skills", "second-read");
export const loadRubric = () => JSON.parse(readFileSync(join(skillDir, "rubric.json"), "utf8"));

// Answers that pass every default criterion.
export const PASSING = {
  hook_strength: "strong",
  sounds_like_ai: 1,
  unsupported_claims: "no",
  overpromising: "no",
  single_cta: "one",
  clarity: 5,
  one_main_idea: "yes",
  format_fit: "fits",
  voice_fit: 5,
};

/** Build a judgment from PASSING plus overrides; voice_fit only with a guide. */
export function judgment(overrides = {}, { styleGuide = false } = {}) {
  const answers = { ...PASSING, ...overrides };
  if (!styleGuide) delete answers.voice_fit;
  return {
    criteria: Object.entries(answers).map(([id, answer]) => ({
      id, answer, evidence: "", fix: `fix ${id}`,
    })),
    embedded_instructions: false,
    summary: "",
  };
}
