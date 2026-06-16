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

## Suggested analysis

To test the hypothesis, compare first-attempt accuracy of question *N+1*
between groups (and/or accuracy on later exercises), using the
`isFirstAttempt = true` rows grouped by `group`.
