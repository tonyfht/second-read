# Contributing to Second Read

Thanks for taking the time to improve Second Read. Bug reports, rubric
suggestions, translations and small fixes are all welcome.

## Before you start

- For a bug or an idea, open an issue first if the change is more than a typo
  or a small fix, so we can agree on the approach before you spend time on it.
- Never commit an API key. The CLI in `scripts/` reads `ANTHROPIC_API_KEY` from
  your environment.
- The project has no runtime dependencies. Please keep it that way; dev-only
  tooling is fine.

## Set up

You need Node 20 or later. From the repository root:

```bash
npm install
```

```bash
npm test
```

```bash
npm run typecheck
```

No API key is needed for either command. Please make sure both pass before you
open a pull request; the CI workflow runs the same two commands on Node 20 and
22.

## What to touch for common changes

| You want to | Edit | Also |
|---|---|---|
| Change a threshold or add a criterion | [`skills/second-read/rubric.json`](skills/second-read/rubric.json) | Write the question in both `en` and `es`, update [`RUBRIC.md`](skills/second-read/RUBRIC.md) and add or adjust a test in `test/rubric.test.mjs` |
| Change the decision rules | [`skills/second-read/scripts/decide.mjs`](skills/second-read/scripts/decide.mjs) | Add a case to `test/decide.test.mjs` and update `types/decide.d.ts` if the public shape changes |
| Change the loop or the prompts | `scripts/lib/loop.mjs`, `scripts/lib/prompts.mjs` | Update the matching tests and `types/*.d.ts` |
| Change the README images | `assets/build.mjs` | Run `node assets/build.mjs` and commit the regenerated SVG files |
| Change the README | `README.md` | Keep `README.es.md` in sync |

The rubric is an editorial checklist, not a prediction of reach or
engagement. Please do not add criteria or wording that promise results.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep the pull request focused on one change. Small pull requests are
   reviewed faster.
3. Add or update tests for any behavior change.
4. Add a line under an `Unreleased` heading in [`CHANGELOG.md`](CHANGELOG.md)
   for anything a user would notice. The format follows
   [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
5. Open the pull request and describe what changed and why.

By contributing you agree that your contribution is licensed under the
[MIT license](LICENSE) of this project.
