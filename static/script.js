/* =====================================================================
   A/B STUDY INSTRUMENTATION
   ---------------------------------------------------------------------
   Two groups are compared:
     - "feedback"   : sees immediate Correct/Incorrect after each answer
                      (original tutoring-system behaviour).
     - "nofeedback" : sees only a neutral "Answer recorded" message and
                      no correctness anywhere, to test whether receiving
                      feedback influences the NEXT answer.

   Assignment is auto-random 50/50 on first visit and remembered in
   localStorage for the whole session, so the participant stays in the
   same group across every exercise page.

   An experimenter can force a group for testing with a URL parameter:
     index.html?group=feedback   or   index.html?group=nofeedback

   Every answer attempt is logged to localStorage and can be exported
   as a CSV with the "Download study data (CSV)" button that appears in
   the results dialog (or by calling downloadStudyData() in the console).
   ===================================================================== */

// ----- Group assignment (persisted across all pages) -------------------
function getStudyGroup() {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("group");
  if (forced === "feedback" || forced === "nofeedback") {
    // Forcing a *different* group (e.g. while testing both on one browser)
    // starts a fresh participant, so each group's data is logged under its
    // own participant ID and binned into the correct group in the dashboard.
    if (localStorage.getItem("studyGroup") !== forced) {
      newStudyParticipant(forced);
    }
  }

  let group = localStorage.getItem("studyGroup");
  if (!group) {
    group = Math.random() < 0.5 ? "feedback" : "nofeedback";
    newStudyParticipant(group);
  }
  return group;
}

// Begin a new participant in the given group (new ID + start time), without
// erasing the accumulated study log of previous participants.
function newStudyParticipant(group) {
  localStorage.setItem("studyGroup", group);
  localStorage.setItem(
    "studyParticipantId",
    "P-" + Date.now() + "-" + Math.floor(Math.random() * 100000)
  );
  localStorage.setItem("studyStart", new Date().toISOString());
  if (localStorage.getItem("studyLog") === null) {
    localStorage.setItem("studyLog", "[]");
  }
}

const STUDY_GROUP = getStudyGroup();
const FEEDBACK_ENABLED = STUDY_GROUP === "feedback";
// The feedback group is the intervention group: when it gets at least this
// many first-attempt answers wrong in an exercise, a review section is shown.
const REVIEW_WRONG_THRESHOLD = 2;
const STUDY_PARTICIPANT_ID = localStorage.getItem("studyParticipantId");
console.log("[study] participant", STUDY_PARTICIPANT_ID, "group:", STUDY_GROUP);

// Facilitator badge: shows the group/participant this page will record as.
// Only appears when the URL contains ?debug=1, so participants never see it.
function showStudyDebugBadge() {
  const params = new URLSearchParams(window.location.search);
  // ?debug=1 turns the badge on and remembers it across pages; ?debug=0 off.
  const debugParam = params.get("debug");
  if (debugParam === "1") localStorage.setItem("studyDebug", "1");
  else if (debugParam === "0") localStorage.removeItem("studyDebug");
  if (localStorage.getItem("studyDebug") !== "1") return;

  function inject() {
    if (document.getElementById("studyDebugBadge")) return;
    const badge = document.createElement("div");
    badge.id = "studyDebugBadge";
    const isFb = STUDY_GROUP === "feedback";
    badge.style.cssText =
      "position:fixed;top:8px;right:8px;z-index:99999;" +
      "font:12px/1.4 -apple-system,Arial,sans-serif;color:#fff;" +
      "padding:6px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.3);" +
      "background:" + (isFb ? "#2e6fb7" : "#e08a1e") + ";max-width:220px;";
    badge.innerHTML =
      "<strong>Recording as: " + (isFb ? "FEEDBACK" : "NO-FEEDBACK") + "</strong>" +
      "<div style='font-size:11px;opacity:.9;word-break:break-all;'>" +
      (STUDY_PARTICIPANT_ID || "(no id)") + "</div>";
    document.body.appendChild(badge);
  }

  if (document.body) inject();
  else document.addEventListener("DOMContentLoaded", inject);
}
showStudyDebugBadge();

// ----- Data logging ----------------------------------------------------
function studySecondsSinceStart() {
  const start = Date.parse(localStorage.getItem("studyStart"));
  if (isNaN(start)) return "";
  return ((Date.now() - start) / 1000).toFixed(1);
}

function currentPageName() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function logAttempt(entry) {
  let log;
  try {
    log = JSON.parse(localStorage.getItem("studyLog") || "[]");
  } catch (e) {
    log = [];
  }
  log.push(entry);
  localStorage.setItem("studyLog", JSON.stringify(log));
}

// ----- Per-question answer state --------------------------------------
const correctAnswers = {}; // Initialize as an empty object
const firstAttempts = {};
const attemptCounts = {}; // how many times each question has been submitted

// Store first attempts
function checkAnswer(questionId, correctAnswer) {
  event.preventDefault();
  const selectedAnswer = document.querySelector(
    `input[name="${questionId}"]:checked`
  );
  const resultMessage = document.querySelector(
    `#resultMessage_${questionId}`
  );

  if (!selectedAnswer) {
    resultMessage.innerHTML = "Please select an option";
    resultMessage.style.color = "red";
    return;
  }

  // Count this submission and decide whether it is the first attempt.
  attemptCounts[questionId] = (attemptCounts[questionId] || 0) + 1;
  const attemptNumber = attemptCounts[questionId];
  const isFirstAttempt = attemptNumber === 1;
  const isCorrect = selectedAnswer.value === correctAnswer;

  // Always record the first attempt (used for scoring / analysis).
  if (!correctAnswers[questionId]) {
    correctAnswers[questionId] = correctAnswer;
  }
  if (!firstAttempts[questionId]) {
    firstAttempts[questionId] = [selectedAnswer.value];
  }

  // Log every submission for the study export.
  logAttempt({
    participantId: STUDY_PARTICIPANT_ID,
    group: STUDY_GROUP,
    page: currentPageName(),
    questionId: questionId,
    attemptNumber: attemptNumber,
    selectedValue: selectedAnswer.value,
    correctValue: correctAnswer,
    isCorrect: isCorrect,
    isFirstAttempt: isFirstAttempt,
    secondsSinceStart: studySecondsSinceStart(),
    timestamp: new Date().toISOString(),
  });

  // ----- The experimental manipulation ----------------------------------
  if (FEEDBACK_ENABLED) {
    // Feedback group: reveal correctness with elaborated, encouraging wording
    // rather than a bare "Correct"/"Incorrect".
    if (isCorrect) {
      resultMessage.innerHTML = praiseMessage(attemptNumber);
      resultMessage.style.color = "green";
    } else {
      resultMessage.innerHTML = encouragementMessage();
      resultMessage.style.color = "#c0392b";
    }
  } else {
    // No-feedback group: confirm the answer was saved, reveal nothing.
    resultMessage.innerHTML = "Answer recorded.";
    resultMessage.style.color = "#444";
  }
}

// ----- Elaborated feedback wording (feedback group only) ----------------
const PRAISE_MESSAGES = [
  "Very good! That's the right answer.",
  "Well done! That's correct.",
  "Exactly right, nice work!",
  "Correct, great job!",
  "Spot on! That's the right answer.",
];

const ENCOURAGEMENT_MESSAGES = [
  "Not quite yet. Take another look at the steps.",
  "Almost there. Try working through it once more.",
  "That's not right this time. Check the worked example if you need a hint.",
  "Not correct yet. Re-read the question and give it another go.",
];

function pickMessage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function praiseMessage(attemptNumber) {
  // Acknowledge persistence when they get it right after a retry.
  if (attemptNumber > 1) {
    return "Well done for sticking with it, that's now correct!";
  }
  return pickMessage(PRAISE_MESSAGES);
}

function encouragementMessage() {
  return pickMessage(ENCOURAGEMENT_MESSAGES);
}

//disableRadioButtons(options);
// Check answers for all questions and display results
function checkAnswers(lastPage) {
  event.preventDefault();
  const dialog = document.querySelector("#resultDialog");
  const resultMessage = document.querySelector("#resultMessage");
  resultMessage.innerHTML = "";

  // Mark the exercise as completed in the study log.
  logAttempt({
    participantId: STUDY_PARTICIPANT_ID,
    group: STUDY_GROUP,
    page: currentPageName(),
    questionId: "__exercise_complete__",
    attemptNumber: "",
    selectedValue: "",
    correctValue: "",
    isCorrect: "",
    isFirstAttempt: "",
    secondsSinceStart: studySecondsSinceStart(),
    timestamp: new Date().toISOString(),
  });

  if (!FEEDBACK_ENABLED) {
    // No-feedback group: never reveal correctness. Just confirm completion
    // and always unlock progression to the next exercise.
    if (Object.keys(firstAttempts).length === 0) {
      resultMessage.innerHTML = "Please answer the questions before continuing.";
    } else {
      resultMessage.innerHTML = "Exercise complete. Click Next to continue.";
      if (lastPage == true) {
        resultMessage.innerHTML +=
          "<br>All exercises are completed. Thank you!";
      }
      if (typeof nextButton !== "undefined") nextButton.disabled = false;
      if (typeof submitButton3 !== "undefined") submitButton3.disabled = true;
      if (typeof submitButton !== "undefined") submitButton.disabled = true;
    }
    addDownloadButton(dialog);
    dialog.showModal();
    wireCloseButton(dialog);
    return;
  }

  // ----- Feedback group: original scoring + pass/fail gating -------------
  let correctCount = 0;
  let totalQuestions = 0;
  const wrongQuestions = []; // questions missed on the first attempt

  for (const questionId in firstAttempts) {
    const selectedAnswerValue = firstAttempts[questionId][0]; // Get the first attempt
    const correctAnswer = correctAnswers[questionId];

    if (correctAnswer === selectedAnswerValue) {
      correctCount++;
      resultMessage.innerHTML += `<br>Question ${questionId}: Correct`;
    } else if (selectedAnswerValue) {
      resultMessage.innerHTML += `<br>Question ${questionId}: Wrong`;
      wrongQuestions.push({
        questionId,
        selected: selectedAnswerValue,
        correct: correctAnswer,
      });
    } else {
      resultMessage.innerHTML += `<br>Question ${questionId}: Not selected`;
    }

    totalQuestions++;
  }

  if (correctCount >= 2) {
    resultMessage.innerHTML += "<br>Congratulations! You passed this exercise.";
    nextButton.disabled = false;
    submitButton3.disabled = true;
    submitButton.disabled = true;

    if (lastPage == true) {
      resultMessage.innerHTML += "<br>All exercises are sucessfully completed.";
      nextButton.disabled = false;
      submitButton3.disabled = true;
      submitButton.disabled = true;
    }
  } else {
    resultMessage.innerHTML += "<br>Check Examples and Reattempt Test.";
    exampleButton.disabled = false;
    submitButton3.disabled = true;
    submitButton.disabled = true;
  }
  if (totalQuestions === 0) {
    resultMessage.innerHTML = "No answers were selected.";
  }

  // ----- Intervention: review section when too many answers are wrong -----
  if (wrongQuestions.length >= REVIEW_WRONG_THRESHOLD) {
    showReviewSection(dialog, wrongQuestions);
    logAttempt({
      participantId: STUDY_PARTICIPANT_ID,
      group: STUDY_GROUP,
      page: currentPageName(),
      questionId: "__review_triggered__",
      attemptNumber: "",
      selectedValue: "",
      correctValue: "",
      isCorrect: "",
      isFirstAttempt: wrongQuestions.length, // number of wrong answers
      secondsSinceStart: studySecondsSinceStart(),
      timestamp: new Date().toISOString(),
    });
  } else {
    removeReviewSection(dialog);
  }

  addDownloadButton(dialog);
  dialog.showModal();
  wireCloseButton(dialog);
}

// Builds an in-dialog review panel that lists the missed questions, shows the
// correct answers, and points the learner to the relevant examples. Only the
// feedback (intervention) group can reach this, via checkAnswers().
function showReviewSection(dialog, wrongQuestions) {
  removeReviewSection(dialog);

  const panel = document.createElement("div");
  panel.id = "reviewSection";
  panel.style.cssText =
    "margin-top:14px;padding:12px 14px;border-left:4px solid #c0392b;" +
    "background:#fdecea;border-radius:6px;text-align:left;font-size:14px;";

  const heading = document.createElement("strong");
  heading.textContent = "📚 Review (let's go over these)";
  panel.appendChild(heading);

  const intro = document.createElement("p");
  intro.style.margin = "6px 0";
  intro.textContent =
    "You missed " +
    wrongQuestions.length +
    " questions. Review them before reattempting:";
  panel.appendChild(intro);

  const ul = document.createElement("ul");
  ul.style.margin = "6px 0 6px 18px";

  // Spans whose math (\( ... \)) MathJax should render after insertion.
  const mathSpans = [];

  for (const w of wrongQuestions) {
    const li = document.createElement("li");
    li.style.marginBottom = "6px";

    // Question: clone the already-rendered node so the math shows exactly as
    // on the page (instead of the mangled textContent of a typeset element).
    const qWrap = document.createElement("div");
    const divId = w.questionId.toUpperCase();
    const qEl = document.querySelector(`#${divId} p`);
    if (qEl) {
      qWrap.appendChild(qEl.cloneNode(true));
    } else {
      qWrap.textContent = "Question " + w.questionId;
    }
    li.appendChild(qWrap);

    // Answers: the option values are informal math (e.g. x^2sin(x)); wrap them
    // in \( ... \) and let MathJax typeset, matching the exercise's own style.
    const aWrap = document.createElement("div");
    const yours = document.createElement("span");
    yours.style.color = "#c0392b";
    yours.innerHTML = "\\(" + w.selected + "\\)";
    const corr = document.createElement("span");
    corr.style.color = "#1e8449";
    corr.innerHTML = "\\(" + w.correct + "\\)";
    aWrap.appendChild(document.createTextNode("Your answer: "));
    aWrap.appendChild(yours);
    aWrap.appendChild(document.createTextNode("  |  Correct answer: "));
    aWrap.appendChild(corr);
    li.appendChild(aWrap);

    mathSpans.push(yours, corr);
    ul.appendChild(li);
  }
  panel.appendChild(ul);

  const tip = document.createElement("p");
  tip.style.margin = "6px 0";
  tip.innerHTML =
    "Tip: open the worked <em>Example</em> for this topic (button below), " +
    "then reattempt the test.";
  panel.appendChild(tip);

  const resultMessage = dialog.querySelector("#resultMessage");
  if (resultMessage) {
    resultMessage.insertAdjacentElement("afterend", panel);
  } else {
    dialog.appendChild(panel);
  }

  // Typeset the answer spans (MathJax v2). The cloned questions are already
  // rendered, so we only render the newly added \( ... \) answer spans.
  if (window.MathJax && MathJax.Hub && MathJax.Hub.Queue) {
    mathSpans.forEach(function (el) {
      MathJax.Hub.Queue(["Typeset", MathJax.Hub, el]);
    });
  }
}

function removeReviewSection(dialog) {
  const existing = dialog.querySelector("#reviewSection");
  if (existing) existing.remove();
}

function wireCloseButton(dialog) {
  const closeButton = document.querySelector("#closeButton");
  closeButton.addEventListener("click", () => {
    dialog.close();
  });
}

// ----- CSV export ------------------------------------------------------
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadStudyData() {
  let log;
  try {
    log = JSON.parse(localStorage.getItem("studyLog") || "[]");
  } catch (e) {
    log = [];
  }

  const headers = [
    "participantId",
    "group",
    "page",
    "questionId",
    "attemptNumber",
    "selectedValue",
    "correctValue",
    "isCorrect",
    "isFirstAttempt",
    "secondsSinceStart",
    "timestamp",
  ];

  const lines = [headers.join(",")];
  for (const entry of log) {
    lines.push(headers.map((h) => csvEscape(entry[h])).join(","));
  }
  const csv = lines.join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "study_" + (STUDY_PARTICIPANT_ID || "data") + "_" + STUDY_GROUP + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Inject the export button into the results dialog (once).
function addDownloadButton(dialog) {
  if (!dialog || dialog.querySelector("#downloadStudyButton")) return;
  const btn = document.createElement("button");
  btn.id = "downloadStudyButton";
  btn.type = "button";
  btn.className = "button gray";
  btn.textContent = "Download study data (CSV)";
  btn.style.marginLeft = "8px";
  btn.addEventListener("click", downloadStudyData);
  const closeButton = dialog.querySelector("#closeButton");
  if (closeButton) {
    closeButton.insertAdjacentElement("afterend", btn);
  } else {
    dialog.appendChild(btn);
  }
}

// Show individual question
function showNextQuestionDiv(nextDivId, currentDivId) {
  const currentDiv = document.getElementById(currentDivId);
  currentDiv.style.display = 'none';

  const nextDiv = document.getElementById(nextDivId);
  nextDiv.style.display = 'block';

  // Remember how far the learner got, for drop-out analysis.
  studyProgress.lastQuestionReached = nextDivId;
}

/* =====================================================================
   SKIP BUTTON
   Learners may pass on a question instead of guessing. A skip is logged
   as its own response category (selectedValue "SKIPPED") and is left out
   of the accuracy measure, because it is never stored as a first attempt.
   Buttons are injected at runtime so no exercise template needs editing.
   ===================================================================== */
function injectSkipButtons() {
  const form = document.getElementById("exerciseForm");
  if (!form) return; // not an exercise page

  const questionDivs = form.querySelectorAll('div[id^="Q"]');
  questionDivs.forEach(function (qDiv) {
    if (qDiv.querySelector(".skip-button")) return;

    // Derive the question id (q1, q2, ...) from the radio group in this div.
    const radio = qDiv.querySelector('input[type="radio"]');
    if (!radio) return;
    const questionId = radio.name;

    // Place the skip button next to this question's submit button.
    const submitBtn = qDiv.querySelector("button");
    if (!submitBtn) return;

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "button gray skip-button";
    skipBtn.textContent = "Skip question";
    skipBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      skipQuestion(questionId, qDiv);
    });

    submitBtn.insertAdjacentElement("afterend", skipBtn);
  });
}

function skipQuestion(questionId, qDiv) {
  if (skippedQuestions[questionId]) return; // already skipped
  skippedQuestions[questionId] = true;

  logAttempt({
    participantId: STUDY_PARTICIPANT_ID,
    group: STUDY_GROUP,
    page: currentPageName(),
    questionId: questionId,
    attemptNumber: "",
    selectedValue: "SKIPPED",
    correctValue: "",
    isCorrect: "",
    isFirstAttempt: "", // excluded from accuracy on purpose
    secondsSinceStart: studySecondsSinceStart(),
    timestamp: new Date().toISOString(),
  });

  const msg = document.querySelector(`#resultMessage_${questionId}`);
  if (msg) {
    msg.innerHTML = "Question skipped.";
    msg.style.color = "#444";
  }

  // Move on: use this question's own "Next Question" button if it has one.
  const nextBtn = Array.from(qDiv.querySelectorAll("button")).find(function (b) {
    return /next question/i.test(b.textContent || "");
  });
  if (nextBtn) nextBtn.click();
}

/* =====================================================================
   DROP-OUT TRACKING
   Logs when a learner arrives on a page, how far they got, and when they
   leave. Combined with the __exercise_complete__ markers this shows where
   participants stopped and did not continue.
   ===================================================================== */
const studyProgress = {
  lastQuestionReached: "Q1",
  exitLogged: false,
};

const skippedQuestions = {};

function logProgressEvent(kind) {
  logAttempt({
    participantId: STUDY_PARTICIPANT_ID,
    group: STUDY_GROUP,
    page: currentPageName(),
    questionId: kind, // __page_enter__ / __page_exit__
    attemptNumber: "",
    selectedValue: studyProgress.lastQuestionReached,
    correctValue: "",
    isCorrect: "",
    isFirstAttempt: "",
    secondsSinceStart: studySecondsSinceStart(),
    timestamp: new Date().toISOString(),
  });
}

function logPageExitOnce() {
  if (studyProgress.exitLogged) return;
  studyProgress.exitLogged = true;
  logProgressEvent("__page_exit__");
}

function initStudyTracking() {
  if (!document.getElementById("exerciseForm")) return; // exercise pages only
  logProgressEvent("__page_enter__");
  injectSkipButtons();

  // pagehide is more reliable than beforeunload (incl. mobile / tab close).
  window.addEventListener("pagehide", logPageExitOnce);
  window.addEventListener("beforeunload", logPageExitOnce);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStudyTracking);
} else {
  initStudyTracking();
}
// Open next page
function openPage(pagePath) {
  window.location.href = pagePath;
}
// Display time
let startTime = Date.now();

    function updateTimer() {
      const timerElement = document.getElementById('timer');
      if (!timerElement) return;
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;

      const hours = Math.floor(elapsedTime / 3600000);
      const minutes = Math.floor((elapsedTime % 3600000) / 60000);
      const seconds = Math.floor((elapsedTime % 60000) / 1000);

      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      timerElement.textContent = formattedTime;
      timerElement.style.fontSize = '16px';
    }
     // Update the timer every second
    setInterval(updateTimer, 1000);

    // Initial update
    updateTimer();

    // button style
    // https://designmodo.com/create-css3-buttons/
