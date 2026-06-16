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
    localStorage.setItem("studyGroup", forced);
  }

  let group = localStorage.getItem("studyGroup");
  if (!group) {
    group = Math.random() < 0.5 ? "feedback" : "nofeedback";
    localStorage.setItem("studyGroup", group);
    localStorage.setItem(
      "studyParticipantId",
      "P-" + Date.now() + "-" + Math.floor(Math.random() * 100000)
    );
    localStorage.setItem("studyStart", new Date().toISOString());
    localStorage.setItem("studyLog", "[]");
  }
  return group;
}

const STUDY_GROUP = getStudyGroup();
const FEEDBACK_ENABLED = STUDY_GROUP === "feedback";
const STUDY_PARTICIPANT_ID = localStorage.getItem("studyParticipantId");
console.log("[study] participant", STUDY_PARTICIPANT_ID, "group:", STUDY_GROUP);

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
    // Feedback group: reveal correctness (original behaviour).
    if (isCorrect) {
      resultMessage.innerHTML = "Correct answer!";
      resultMessage.style.color = "green";
    } else {
      resultMessage.innerHTML = "Incorrect.";
      resultMessage.style.color = "red";
    }
  } else {
    // No-feedback group: confirm the answer was saved, reveal nothing.
    resultMessage.innerHTML = "Answer recorded.";
    resultMessage.style.color = "#444";
  }
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

  for (const questionId in firstAttempts) {
    const selectedAnswerValue = firstAttempts[questionId][0]; // Get the first attempt
    const correctAnswer = correctAnswers[questionId];

    if (correctAnswer === selectedAnswerValue) {
      correctCount++;
      resultMessage.innerHTML += `<br>Question ${questionId}: Correct`;
    } else if (selectedAnswerValue) {
      resultMessage.innerHTML += `<br>Question ${questionId}: Wrong`;
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

  addDownloadButton(dialog);
  dialog.showModal();
  wireCloseButton(dialog);
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
