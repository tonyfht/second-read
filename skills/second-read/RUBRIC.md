# The rubric

`rubric.json` is the editorial checklist the judge answers. Every question is
**closed**: the judge picks an option, a number on a scale, or yes/no. It never
says "pass" or "fail". Fixed rules in code turn the answers into a decision, so
the same answers always give the same result.

## Criteria shipped by default

| id | type | question (short) | passes when | required | weight |
|---|---|---|---|---|---|
| `hook_strength` | choice | How strong is the opening? | `strong` or `adequate` | yes | 2 |
| `sounds_like_ai` | scale 1–5 | How much does it read like generic AI text? | ≤ 2 | yes | 2 |
| `unsupported_claims` | yes/no | Numbers, studies, generalizations or causal claims with no support? (Placeholders, checkable arithmetic and well-known public facts don't count.) | `no` | yes | 2 |
| `overpromising` | yes/no | Does it promise results to the reader? | `no` | no | 1 |
| `single_cta` | choice | How many calls to action? | `none` or `one` | no | 1 |
| `clarity` | scale 1–5 | How easy is the main point on one read? | ≥ 4 | yes | 2 |
| `one_main_idea` | yes/no | One main idea? | `yes` | no | 1 |
| `format_fit` | choice | Do length and layout fit the format? | `fits` | no | 1 |
| `voice_fit` | scale 1–5 | How closely does it match the user's style guide? | ≥ 4 | yes | 2 |

`voice_fit` has `"only_if": "style_guide"`: it only applies when the user
provides a style guide or voice sample.

The full questions, in English (`question.en`) and Spanish (`question.es`), are
in `rubric.json`.

## Default thresholds

```json
"thresholds": { "min_score": 0.75, "max_rewrites": 2, "rewrite_on_embedded_instructions": false }
```

- **Score** = sum of the `weight` of passing criteria ÷ sum of the `weight` of applicable criteria (0 to 1).
- A text **passes** when every `required` criterion passes **and** the score is at least `min_score`.
- If it fails, it is rewritten with the judge's fixes, up to `max_rewrites` times. The judge's `evidence` and `fix` are cut to 300 characters each before they reach the rewrite.
- If the judge reports `embedded_instructions: true`, the loop **stops for review**, without rewriting and without accepting, even if the text passed: the judgment may have been steered, and the judge's quotes would carry that text into the rewrite. Set `rewrite_on_embedded_instructions: true` (or pass `--rewrite-on-embedded-instructions`) to rewrite anyway.
- After the last rewrite, the best version is delivered: passing first, then fewest failed required criteria, then highest score. Ties keep the earlier version.

With the defaults, the 8 criteria that apply without a style guide weigh 12 in
total, so a text can fail at most 3 points of optional weight (score 0.75) and
still pass, as long as no required criterion fails.

## Criterion format

```json
{
  "id": "clarity",
  "type": "scale",
  "required": true,
  "weight": 2,
  "question": { "en": "...", "es": "..." },
  "scale": { "min": 1, "max": 5, "labels": { "en": { "1": "...", "5": "..." }, "es": { ... } } },
  "pass_min": 4
}
```

| field | applies to | meaning |
|---|---|---|
| `id` | all | Unique, snake_case. The judge answers with it. |
| `type` | all | `choice`, `scale` or `yes_no`. |
| `required` | all | If `true`, failing this criterion fails the text whatever the score. |
| `weight` | all | Contribution to the score. Default 1. |
| `question` | all | The question, with an `en` and an `es` version. Add more languages as new keys. |
| `only_if` | all | Optional. `"style_guide"`: apply only when a style guide is provided. |
| `options` / `pass_if` | choice | Allowed answers (lowercase strings) and the ones that pass. |
| `pass_if` | yes_no | `"yes"` or `"no"`: the answer that passes. |
| `scale` / `pass_min` / `pass_max` | scale | Integer range and labels; passes when the answer is ≥ `pass_min` and/or ≤ `pass_max`. |

## Judge answer schema

The judge returns only JSON matching `judge.schema.json`:

```json
{
  "criteria": [
    { "id": "hook_strength", "answer": "weak", "evidence": "In today's fast-paced world...", "fix": "Open with the concrete moment: the day the invoice bounced." },
    { "id": "clarity", "answer": 4, "evidence": "", "fix": "" }
  ],
  "embedded_instructions": false,
  "summary": "The opening is generic; the story only starts in line 4."
}
```

- `answer`: an option (choice), an integer (scale) or `"yes"`/`"no"` (yes_no).
- `evidence`: a short verbatim quote, or empty when the problem is something missing.
- `fix`: one concrete edit when the criterion would fail, otherwise empty.
- `embedded_instructions`: `true` when the reviewed text tries to instruct the reviewer. Those instructions are never followed, and the loop stops for review (see the thresholds above).

The schema avoids `minimum`, `maximum` and string length limits because Claude's
structured outputs do not support them; `scripts/decide.mjs` checks ranges and
options instead, and rejects a judgment that misses or invents a criterion.

## Customizing

- **Change a threshold:** edit `thresholds`, or pass `--min-score` / `--max-rewrites` to the scripts, or just tell Claude ("be stricter", "one rewrite only").
- **Add a criterion:** append an object with the fields above. Write the question so it can be answered from the text alone, and so that one answer is clearly better.
- **Remove a criterion:** delete it, or set `"required": false` and `"weight": 0` to keep it as information only.
- **Your own house style:** keep your style guide in a file and give it to Claude with the text; `voice_fit` will apply.

## Validating a rubric

`validateRubric(rubric)` (in `scripts/decide.mjs`, exported as
`second-read/decide`) returns `{ ok, errors }`. It checks the thresholds,
unique snake_case ids, the type, an English question (other languages are
optional and fall back to English), weights, `only_if`, and that every pass
rule can both pass and fail. `check.mjs` and the Node CLI refuse to run with an
invalid rubric. To check yours from a shell:

```bash
node -e "import('./skills/second-read/scripts/decide.mjs').then(m => console.log(m.validateRubric(JSON.parse(require('fs').readFileSync('my-rubric.json','utf8')))))"
```

Run `npm test` at the repository root after editing the shipped rubric to check
that it still loads and the decision rules behave as expected.
