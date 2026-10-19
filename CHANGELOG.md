# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-19

### Added

- `second-read` skill: draft or take a text, judge it with a closed-question rubric, decide with fixed rules, rewrite at most twice, deliver the final text with a short report.
- Editorial rubric (`rubric.json`) in English and Spanish with nine criteria: hook strength, sounds like AI, unsupported claims, overpromising, single call to action, clarity, one main idea, format fit and, with a style guide, voice fit.
- Judge answer schema (`judge.schema.json`) and default thresholds (`min_score` 0.75, `max_rewrites` 2), documented in `RUBRIC.md`.
- Dependency-free decision script (`skills/second-read/scripts/check.mjs`).
- Optional Node CLI (`scripts/second-read.mjs`) using the Anthropic SDK with structured outputs, plus unit tests for the decision logic.
- Claude Code plugin and marketplace manifests.
- Before/after examples in English and Spanish.
