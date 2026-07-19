# Feedback A/B Study

This tutoring system is instrumented to compare two participant groups and
test whether **receiving feedback after answering** affects the **next**
answer. All logic lives in `static/script.js` and applies to every exercise
page automatically.

## The two groups

| Group        | Per-answer message      | End-of-exercise dialog                  | Progression                  |
|--------------|-------------------------|------------------------------------------|------------------------------|
| `feedback`   | "Correct answer!" / "Incorrect." | Per-question correct/wrong + pass/fail | Must get ≥2 of 3 to unlock Next |
| `nofeedback` | "Answer recorded." (neutral) | "Exercise complete." — no correctness | Always unlocked after answering |

## Group assignment

- On a participant's **first** visit, they are randomly assigned 50/50 and the
  group is stored in `localStorage` (`studyGroup`), so they stay in the same
  group across every exercise.
- A unique `studyParticipantId` and start time are recorded at the same time.
- **Override for testing:** open any page with `?group=feedback` or
  `?group=nofeedback`, e.g. `index.html?group=nofeedback`.
- **Reset a participant** (e.g. on a shared machine): clear site data, or run
  in the browser console:
  ```js
  localStorage.clear(); location.reload();
  ```

## Data collection

Every submission is logged to `localStorage` under `studyLog`. A
**"Download study data (CSV)"** button appears in the results dialog at the end
of each exercise. You can also export anytime from the console:

```js
downloadStudyData();
```

### CSV columns

`participantId, group, page, questionId, attemptNumber, selectedValue,
correctValue, isCorrect, isFirstAttempt, secondsSinceStart, timestamp`

- One row per submission; `attemptNumber` distinguishes retries within a page.
- A `questionId = __exercise_complete__` row marks when an exercise was finished.
- `isFirstAttempt = true` rows are the ones to use for first-attempt accuracy.

> Note: data lives in the participant's browser. Download the CSV before
> closing/clearing the browser, and use one device per participant (or reset
> between participants).

## Results dashboard (`results.html`)

Open **`results.html`** (e.g. `http://localhost:8000/results.html`) to visualise
the comparison:

- **"Use this browser's data"** charts the current device's `studyLog`.
- **"Load CSV file(s)…"** pools the exported CSVs from many participants —
  select all of them at once.
- The bar chart shows each group's **mean** with **±1 SD error bars**, and a
  table lists n, mean, and standard deviation per group.
- Two metrics are available: **first-attempt accuracy** (proportion correct)
  and **correct answers per exercise** (count).

SD is the sample standard deviation (n−1); a group needs ≥2 participants for a
non-zero error bar.

## Review intervention (feedback / intervention group only)

When a participant in the **feedback** group gets too many first-attempt
answers wrong in an exercise (default threshold: `REVIEW_WRONG_THRESHOLD = 2`
in `static/script.js`), the results dialog shows a **Review section** that:

- lists each missed question with the participant's answer vs. the correct one,
- points them to the worked Example for that topic before reattempting.

This fires a `__review_triggered__` row in the log (its `isFirstAttempt`
column holds the number of wrong answers that triggered it), so you can count
how often the intervention was delivered. The no-feedback (control) group never
sees this.

## Elaborated feedback (feedback group only)

The feedback group no longer sees a bare "Correct"/"Incorrect". It now gets
varied, encouraging wording, e.g. "Very good! That's the right answer.",
"Almost there. Try working through it once more.", and a special message when a
learner gets it right after a retry. The control group is unchanged and still
only sees the neutral "Answer recorded", so the feedback vs no-feedback
comparison is preserved. Wording lives in `PRAISE_MESSAGES` /
`ENCOURAGEMENT_MESSAGES` in `static/script.js`.

## Skip button

Every question gets a **Skip question** button, injected at runtime by
`injectSkipButtons()` (no exercise template needs editing). A skip is logged as
its own response category with `selectedValue = SKIPPED` and an empty
`isFirstAttempt`, so **skips are excluded from the accuracy measure** rather
than counted as wrong. This reduces forced-guessing noise and lets you measure
avoidance behaviour per group.

## Drop-out tracking

Each exercise page logs a `__page_enter__` row on arrival and a `__page_exit__`
row when the learner leaves (via `pagehide`/`beforeunload`). The
`selectedValue` column of those rows holds the furthest question reached
(`Q1`/`Q2`/`Q3`). Together with the `__exercise_complete__` markers this shows
exactly where a participant stopped and whether they continued, so drop-out can
be compared between groups.

## Analysis script

`analysis/bkt_analysis.py` reads the exported CSVs and reports first-attempt
accuracy (mean, SD, Welch t-test, Cohen's d), skip behaviour, drop-out, and a
**Bayesian Knowledge Tracing** fit per topic and group (initial knowledge,
learning rate, slip, guess, and final mastery). Standard library only; SciPy is
used for exact p-values if available.

```bash
python3 analysis/bkt_analysis.py data/*.csv     # or a folder of CSVs
```

## Hypotheses

**Primary**

- **H1:** Participants who receive immediate feedback after each answer will
  have higher first-attempt accuracy on subsequent questions than those who
  receive no feedback.
- **H0 (null):** No difference in subsequent first-attempt accuracy between the
  feedback and no-feedback groups.

*Rationale:* immediate corrective feedback lets learners adjust before the next
item (formative-feedback / feedback-loop theory).

**Secondary**

- **H2 (learning over time):** The feedback group improves more across the
  sequence of exercises than the no-feedback group.
- **H3 (error correction):** After a wrong answer, feedback-group participants
  are more likely to get the *next* question right than no-feedback participants
  (direct test of "feedback affects the next answer").
- **H4 (review intervention):** Within the feedback group, participants who
  trigger the review section (≥2 wrong) do better on the following exercise than
  comparable feedback participants who were not shown a review.
- **H5 (topic dependence):** The feedback effect is larger for harder topics
  (derivatives, quadratics) than for arithmetic, which may be at ceiling.

**Competing predictions**

- *Ceiling:* with 3 options and short exercises, both groups may score high,
  washing out any difference.
- *Reverse:* without a safety net, no-feedback participants may deliberate more,
  narrowing or reversing the gap.

## Suggested analysis

Use the `isFirstAttempt = true` rows grouped by `group`:

- **H1 / H5:** compare group means of first-attempt accuracy (overall and per
  topic) — independent-samples *t*-test or Mann–Whitney *U*.
- **H2:** accuracy by exercise order × group (mixed ANOVA or regression with an
  order × group interaction).
- **H3:** condition next-item correctness on previous-item correctness × group.
- **H4:** compare post-review exercise accuracy using the `__review_triggered__`
  log rows to flag who saw a review.
