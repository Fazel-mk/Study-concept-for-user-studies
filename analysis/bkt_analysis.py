#!/usr/bin/env python3
"""
Analysis for the feedback vs no-feedback study.

Reads the CSV files exported by the tutoring system and reports:

  1. First-attempt accuracy per group (mean, SD, Welch t-test, Cohen's d)
  2. Skip behaviour per group
  3. Drop-out: who stopped, and where
  4. Bayesian Knowledge Tracing (BKT) per topic and group

Usage:
    python3 analysis/bkt_analysis.py data/*.csv
    python3 analysis/bkt_analysis.py data/          # a folder of CSVs

Only the Python standard library is required. If SciPy is installed the
t-test p-value is exact; otherwise a normal approximation is used.
"""

import csv
import glob
import math
import os
import sys
from collections import defaultdict

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

TOPIC_OF_PAGE = {
    "addition_exercise.html": "arithmetic",
    "subtraction_exercise.html": "arithmetic",
    "multiplication_Exercise.html": "arithmetic",
    "division_exercise.html": "arithmetic",
    "linear_exercise.html": "algebra",
    "quadratic_exercise.html": "algebra",
    "deri_exercise1.html": "derivatives",
    "deri_exercise2.html": "derivatives",
}

TOTAL_EXERCISES = 8
GROUPS = ["feedback", "nofeedback"]


# --------------------------------------------------------------------------
# Loading
# --------------------------------------------------------------------------

def load_rows(paths):
    """Load every CSV given as a file or folder path into one list of dicts."""
    files = []
    for p in paths:
        if os.path.isdir(p):
            files.extend(sorted(glob.glob(os.path.join(p, "*.csv"))))
        else:
            files.append(p)

    rows = []
    for f in files:
        with open(f, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                rows.append(row)
    if not rows:
        sys.exit("No CSV rows found. Pass the exported study CSV files or a folder.")
    print(f"Loaded {len(rows)} rows from {len(files)} file(s).\n")
    return rows


def is_true(value):
    return str(value).strip().lower() in ("true", "1", "yes")


def is_marker(row):
    return str(row.get("questionId", "")).startswith("__")


# --------------------------------------------------------------------------
# Basic statistics (stdlib only)
# --------------------------------------------------------------------------

def mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


def sd(xs):
    """Sample standard deviation (n-1)."""
    if len(xs) < 2:
        return 0.0
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def normal_cdf(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def welch_t_test(a, b):
    """Return (t, df, p) for Welch's unequal-variance t-test."""
    if len(a) < 2 or len(b) < 2:
        return None, None, None
    va, vb = sd(a) ** 2, sd(b) ** 2
    na, nb = len(a), len(b)
    se = math.sqrt(va / na + vb / nb)
    if se == 0:
        return None, None, None
    t = (mean(a) - mean(b)) / se
    df = (va / na + vb / nb) ** 2 / (
        (va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1)
    )
    try:
        from scipy import stats  # type: ignore
        p = 2 * stats.t.sf(abs(t), df)
    except Exception:
        p = 2 * (1 - normal_cdf(abs(t)))  # approximation without SciPy
    return t, df, p


def cohens_d(a, b):
    """Pooled-SD effect size."""
    if len(a) < 2 or len(b) < 2:
        return None
    na, nb = len(a), len(b)
    pooled = math.sqrt(
        ((na - 1) * sd(a) ** 2 + (nb - 1) * sd(b) ** 2) / (na + nb - 2)
    )
    return (mean(a) - mean(b)) / pooled if pooled else None


# --------------------------------------------------------------------------
# 1. Accuracy
# --------------------------------------------------------------------------

def accuracy_by_participant(rows):
    """participant -> (group, accuracy) using first attempts only."""
    hits = defaultdict(int)
    total = defaultdict(int)
    group_of = {}
    for r in rows:
        if is_marker(r) or not is_true(r.get("isFirstAttempt")):
            continue
        pid = r["participantId"]
        group_of[pid] = r["group"]
        total[pid] += 1
        if is_true(r.get("isCorrect")):
            hits[pid] += 1
    return {
        pid: (group_of[pid], hits[pid] / total[pid])
        for pid in total if total[pid] > 0
    }


def report_accuracy(rows):
    print("=" * 66)
    print("1. FIRST-ATTEMPT ACCURACY")
    print("=" * 66)

    per_p = accuracy_by_participant(rows)
    by_group = {g: [acc for (grp, acc) in per_p.values() if grp == g] for g in GROUPS}

    for g in GROUPS:
        vals = by_group[g]
        if vals:
            print(f"  {g:<11} n = {len(vals):<3} mean = {mean(vals)*100:5.1f}%   SD = {sd(vals)*100:5.1f}%")
        else:
            print(f"  {g:<11} no data")

    a, b = by_group["feedback"], by_group["nofeedback"]
    if len(a) >= 2 and len(b) >= 2:
        t, df, p = welch_t_test(a, b)
        d = cohens_d(a, b)
        print(f"\n  Welch t-test: t = {t:.3f}, df = {df:.1f}, p = {p:.4f}")
        print(f"  Cohen's d   : {d:.3f}")
        print(f"  {'Significant at .05' if p < 0.05 else 'Not significant at .05'}")
    else:
        print("\n  (Need at least 2 participants per group for a t-test.)")
    print()


# --------------------------------------------------------------------------
# 2. Skips
# --------------------------------------------------------------------------

def report_skips(rows):
    print("=" * 66)
    print("2. SKIPPED QUESTIONS")
    print("=" * 66)

    skips = defaultdict(int)
    participants = defaultdict(set)
    for r in rows:
        g = r.get("group", "")
        if g in GROUPS:
            participants[g].add(r["participantId"])
        if str(r.get("selectedValue", "")).strip().upper() == "SKIPPED":
            skips[g] += 1

    for g in GROUPS:
        n = len(participants[g])
        per = skips[g] / n if n else 0
        print(f"  {g:<11} {skips[g]:>4} skips   ({per:.2f} per participant, n = {n})")
    print()


# --------------------------------------------------------------------------
# 3. Drop-out
# --------------------------------------------------------------------------

def report_dropout(rows):
    print("=" * 66)
    print("3. DROP-OUT")
    print("=" * 66)

    completed = defaultdict(set)   # participant -> set of finished exercise pages
    last_page = {}                 # participant -> last page seen
    last_time = {}
    group_of = {}

    for r in rows:
        pid = r.get("participantId")
        if not pid:
            continue
        group_of[pid] = r.get("group", "")
        ts = r.get("timestamp", "")
        if ts >= last_time.get(pid, ""):
            last_time[pid] = ts
            last_page[pid] = r.get("page", "")
        if r.get("questionId") == "__exercise_complete__":
            completed[pid].add(r.get("page", ""))

    for g in GROUPS:
        pids = [p for p in group_of if group_of[p] == g]
        if not pids:
            print(f"  {g:<11} no data")
            continue
        finished = [p for p in pids if len(completed[p]) >= TOTAL_EXERCISES]
        dropped = [p for p in pids if p not in finished]
        rate = len(dropped) / len(pids) * 100
        avg_done = mean([len(completed[p]) for p in pids])
        print(f"  {g:<11} n = {len(pids):<3} completed all {TOTAL_EXERCISES}: {len(finished):<3} "
              f"dropped out: {len(dropped):<3} ({rate:.0f}%)")
        print(f"{'':14}exercises finished on average: {avg_done:.1f}")
        if dropped:
            where = defaultdict(int)
            for p in dropped:
                where[last_page[p]] += 1
            spots = ", ".join(f"{pg} ({c})" for pg, c in
                              sorted(where.items(), key=lambda kv: -kv[1]))
            print(f"{'':14}stopped at: {spots}")
    print()


# --------------------------------------------------------------------------
# 4. Bayesian Knowledge Tracing
# --------------------------------------------------------------------------

def bkt_log_likelihood(sequences, p_init, p_transit, p_slip, p_guess):
    """Log-likelihood of the observed correct/incorrect sequences under BKT."""
    total = 0.0
    for seq in sequences:
        L = p_init
        for correct in seq:
            p_correct = L * (1 - p_slip) + (1 - L) * p_guess
            p_obs = p_correct if correct else 1 - p_correct
            if p_obs <= 1e-12:
                return float("-inf")
            total += math.log(p_obs)
            # Posterior probability of knowing the skill, then learning step
            if correct:
                num = L * (1 - p_slip)
            else:
                num = L * p_slip
            denom = p_correct if correct else 1 - p_correct
            L_post = num / denom if denom > 1e-12 else L
            L = L_post + (1 - L_post) * p_transit
    return total


def fit_bkt(sequences):
    """Grid-search the four BKT parameters (slip/guess bounded for identifiability)."""
    if not sequences:
        return None

    inits = [i / 20 for i in range(1, 20, 2)]      # 0.05 .. 0.95
    transits = [i / 20 for i in range(0, 11)]      # 0.00 .. 0.50
    slips = [i / 20 for i in range(1, 9)]          # 0.05 .. 0.40
    guesses = [i / 20 for i in range(1, 10)]       # 0.05 .. 0.45

    best = None
    for p_init in inits:
        for p_transit in transits:
            for p_slip in slips:
                for p_guess in guesses:
                    ll = bkt_log_likelihood(sequences, p_init, p_transit, p_slip, p_guess)
                    if best is None or ll > best[0]:
                        best = (ll, p_init, p_transit, p_slip, p_guess)
    return best


def final_mastery(sequences, p_init, p_transit, p_slip, p_guess):
    """Average P(knows the skill) after the observed sequence."""
    finals = []
    for seq in sequences:
        L = p_init
        for correct in seq:
            p_correct = L * (1 - p_slip) + (1 - L) * p_guess
            if correct:
                num = L * (1 - p_slip)
                denom = p_correct
            else:
                num = L * p_slip
                denom = 1 - p_correct
            L_post = num / denom if denom > 1e-12 else L
            L = L_post + (1 - L_post) * p_transit
        finals.append(L)
    return mean(finals)


def build_sequences(rows):
    """(group, topic) -> list of per-participant correct/incorrect sequences."""
    ordered = defaultdict(list)  # (pid, topic) -> [(timestamp, correct)]
    group_of = {}
    for r in rows:
        if is_marker(r) or not is_true(r.get("isFirstAttempt")):
            continue
        topic = TOPIC_OF_PAGE.get(r.get("page", ""))
        if not topic:
            continue
        pid = r["participantId"]
        group_of[pid] = r["group"]
        ordered[(pid, topic)].append(
            (r.get("timestamp", ""), is_true(r.get("isCorrect")))
        )

    seqs = defaultdict(list)
    for (pid, topic), items in ordered.items():
        items.sort(key=lambda x: x[0])
        seqs[(group_of[pid], topic)].append([c for _, c in items])
    return seqs


def report_bkt(rows):
    print("=" * 66)
    print("4. BAYESIAN KNOWLEDGE TRACING")
    print("=" * 66)
    print("  L0 = initial knowledge, T = learning rate,")
    print("  S = slip, G = guess, Mastery = P(known) after the exercises\n")

    seqs = build_sequences(rows)
    topics = sorted({t for (_, t) in seqs})
    if not topics:
        print("  Not enough first-attempt data for BKT.\n")
        return

    for topic in topics:
        print(f"  Topic: {topic}")
        for g in GROUPS:
            s = seqs.get((g, topic), [])
            if len(s) < 2:
                print(f"    {g:<11} not enough data (n = {len(s)})")
                continue
            fit = fit_bkt(s)
            ll, p_init, p_transit, p_slip, p_guess = fit
            mastery = final_mastery(s, p_init, p_transit, p_slip, p_guess)
            print(f"    {g:<11} n = {len(s):<3} L0 = {p_init:.2f}  T = {p_transit:.2f}  "
                  f"S = {p_slip:.2f}  G = {p_guess:.2f}  Mastery = {mastery:.2f}")
        print()

    print("  Interpretation: a higher learning rate (T) and higher final mastery")
    print("  in the feedback group would support H1/H2.\n")


# --------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    rows = load_rows(sys.argv[1:])
    report_accuracy(rows)
    report_skips(rows)
    report_dropout(rows)
    report_bkt(rows)


if __name__ == "__main__":
    main()
