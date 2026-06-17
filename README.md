# DromedaryITS — Feedback User Study

An interactive math tutoring system used for a study comparing two groups: one
that receives **immediate feedback** after each answer and one that does **not**,
to see how feedback affects later answers.

**▶️ Take part here: https://fazel-mk.github.io/Study-concept-for-user-studies/**

---

## How to participate

It takes about 10–15 minutes. Please do it in one sitting.

1. **Open the study link in a fresh browser window** (a new **Incognito/Private**
   window is best). This makes sure you’re counted as your own participant.
   > 👉 https://fazel-mk.github.io/Study-concept-for-user-studies/

2. **You’ll be placed in a group automatically.** You don’t choose it and don’t
   need to do anything — just use the site normally.

3. **Work through the exercises.** There are **8 exercises** (Arithmetic, Algebra,
   Derivatives) with **3 multiple-choice questions each** (24 questions total).
   For each question:
   - Select an answer.
   - Click **Check & Submit**.
   - Click **Next Question**.
   - After the 3rd question, click **Result**, then **Next Exercise** to continue.

4. **Please don’t refresh the page in the middle of an exercise** — refreshing
   sends you to the worked example page.

5. **At the end, send your data to the researcher.** On the results pop-up of an
   exercise, click **“Download study data (CSV)”** and email the downloaded file
   to the researcher (or follow whatever instructions you were given).

That’s it — thank you for taking part! 🙏

---

## What gets recorded

Only your answers and timing for this study: your group, each question, the
option you chose, whether it was correct, and timestamps. No names, emails, or
other personal information are collected. Data stays in your browser until you
download the CSV and share it.

---

## For the researcher / facilitator

Setup, group assignment, the feedback manipulation, the review intervention, the
results dashboard, and analysis tips are documented in
**[STUDY_README.md](STUDY_README.md)**.

Quick pointers:
- Force a condition for testing: add `?group=feedback` or `?group=nofeedback`
  to the URL. Add `?debug=1` to show an on-screen badge of the current group
  (and `?debug=0` to hide it). Participants never see this.
- Analyse results: open `results.html`, load all participants’ CSV files, and
  read the mean ± SD comparison chart.

> Note: I used Claude (Anthropic) to help implement these study changes.
