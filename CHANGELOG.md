# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-19

### Added

- `second-read` skill: draft or take a text, judge it with a closed-question rubric, decide with fixed rules, rewrite at most twice, deliver the final text with a short report.
- Editorial rubric (`rubric.json`) in English and Spanish with nine criteria: hook strength, sounds like AI, unsupported claims, overpromising, single call to action, clarity, one main idea, format fit and, with a style guide, voice fit.
- Judge answer schema (`judge.schema.json`) and default thresholds (`min_score` 0.75, `max_rewrites` 2, `rewrite_on_embedded_instructions` false), documented in `RUBRIC.md`.
- Safe defaults against prompt injection: a text the judge flags with `embedded_instructions` stops the loop for review instead of being rewritten or accepted; judge-written `evidence` and `fix` are cut to 300 characters before a rewrite.
- `validateRubric()` for custom rubrics; `check.mjs` and the CLI refuse invalid ones.
- Dependency-free decision script (`skills/second-read/scripts/check.mjs`).
- Library package with no runtime dependencies: `second-read`, `second-read/decide`, `second-read/prompts`, `second-read/loop`, `second-read/rubric.json`, `second-read/judge.schema.json`, with TypeScript types.
- Optional Node CLI (`scripts/second-read.mjs`) using the Anthropic SDK with structured outputs.
- Unit tests for the decision logic, the loop, the rubric and the package (`npm test`), and a type check (`npm run typecheck`).
- Claude Code plugin and marketplace manifests.
- Before/after examples in English and Spanish.
