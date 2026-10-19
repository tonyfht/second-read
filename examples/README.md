# Examples

Before/after texts with the report Second Read produced. Each one comes from a
real run of the skill in Claude Code (installed from this repository's
marketplace) on 2026-10-19. Every round was judged by a fresh subagent, and its JSON is included.
Model output varies between runs, so yours will not be identical.

| example | language | what it shows |
|---|---|---|
| [01-linkedin-es.md](01-linkedin-es.md) | Spanish | A generic post (stock phrases, an unsourced statistic, a guarantee, three calls to action) rewritten once. Unsupported claims are cut, and the missing real details are left as placeholders for the author. |
| [02-linkedin-en.md](02-linkedin-en.md) | English | A specific, first-hand post accepted in round 0 with no changes: the loop does not rewrite what already passes. |
| [03-newsletter-en.md](03-newsletter-en.md) | English | A newsletter intro reviewed against a style guide (`voice_fit` applies), in two runs. With a line that tries to instruct the AI reviewer, the loop stops for review without rewriting. With that line removed, it takes two rewrites and passes with one optional issue open. |

Every example has the same structure: input, judgment for each round with the
decision from `check.mjs`, final text, and report. Texts in square brackets are
placeholders the author has to fill in before publishing.
