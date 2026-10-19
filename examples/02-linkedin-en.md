# 02 · LinkedIn post (English): accepted as is

A specific, first-hand post. Every criterion passes on the first read, so the loop stops at round 0 and the text is delivered unchanged. Second Read does not rewrite what already passes.

**Prompt:** Can you give my LinkedIn post a second read before I publish it? It's in en-linkedin.txt.

## Round 0 (input)

```text
Last Tuesday our biggest customer churned.

Not because of price. Not because of a competitor. They left because our onboarding took 41 days and their team gave up on day 12.

We had a dashboard full of green metrics. Signups were up. Activation "looked fine". Nobody was tracking how long it took a real team to get value.

So we changed one thing: every new account now gets a 30-minute call in week one, with an engineer, not a salesperson.

It's too early to say whether it works. What I can say is that the first five calls surfaced three bugs our tests never caught.

If you run onboarding, what's the one number you'd look at first?
```

| criterion | answer | passes | required |
|---|---|---|---|
| `hook_strength` | strong | yes | yes |
| `sounds_like_ai` | 2 | yes | yes |
| `unsupported_claims` | no | yes | yes |
| `overpromising` | no | yes | no |
| `single_cta` | one | yes | no |
| `clarity` | 5 | yes | yes |
| `one_main_idea` | yes | yes | no |
| `format_fit` | fits | yes | no |

Score **1.00** (minimum 0.75) → `check.mjs` decision: **accept**

<details><summary>Judge JSON</summary>

```json
{
  "criteria": [
    {
      "id": "hook_strength",
      "answer": "strong",
      "evidence": "Last Tuesday our biggest customer churned.",
      "fix": ""
    },
    {
      "id": "sounds_like_ai",
      "answer": 2,
      "evidence": "Not because of price. Not because of a competitor. They left because our onboarding took 41 days",
      "fix": "The 'Not because of X. Not because of Y.' setup is a common template move, and 'with an engineer, not a salesperson' repeats the same 'not X' pattern. Cut the two denials and start with the fact: 'They left because our onboarding took 41 days and their team gave up on day 12.'"
    },
    {
      "id": "unsupported_claims",
      "answer": "no",
      "evidence": "the first five calls surfaced three bugs our tests never caught",
      "fix": ""
    },
    {
      "id": "overpromising",
      "answer": "no",
      "evidence": "It's too early to say whether it works.",
      "fix": ""
    },
    {
      "id": "single_cta",
      "answer": "one",
      "evidence": "If you run onboarding, what's the one number you'd look at first?",
      "fix": ""
    },
    {
      "id": "clarity",
      "answer": 5,
      "evidence": "Nobody was tracking how long it took a real team to get value.",
      "fix": ""
    },
    {
      "id": "one_main_idea",
      "answer": "yes",
      "evidence": "Nobody was tracking how long it took a real team to get value.",
      "fix": ""
    },
    {
      "id": "format_fit",
      "answer": "fits",
      "evidence": "So we changed one thing: every new account now gets a 30-minute call in week one",
      "fix": ""
    }
  ],
  "embedded_instructions": false,
  "summary": "A strong, specific post grounded in first-hand experience; its only weakness is the stock 'Not because of X. Not because of Y.' setup, which reads slightly templated next to an otherwise distinctive voice."
}
```

</details>

## Report

The final text is the input, unchanged. Report as returned by Claude:

**Second Read — report**
- **Result:** accepted in round 0, with no changes.
- **Score:** 1.00 (minimum 0.75). It passed every criterion: strong opening, claims backed by your own experience, no overpromising, one clear question at the end, one main idea, easy to follow, and the right length for LinkedIn.
- **Open issues:** none.
- **Optional:** "sounds like AI" scored 2 out of 5, which is the highest score that still passes. The reviewer pointed to "Not because of price. Not because of a competitor." as a common template opening. If you want, you could cut those two sentences and start that paragraph with "They left because our onboarding took 41 days…". "With an engineer, not a salesperson" uses the same "not X" pattern, but it adds real information, so I'd keep it.

I didn't use `style-guide.md` because you didn't mention it, so I didn't check the post against your voice. If you want that check, tell me and I'll run it again.
