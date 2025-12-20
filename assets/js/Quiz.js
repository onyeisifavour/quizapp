/* Untitled-1.patched.js
   Minimal fixes applied to your version. Keeps your structure/comments.
*/

/* ============================
   HELPERS — small reusable functions
   ============================ */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/* ============================
   DOM REFERENCES (from your HTML)
   ============================ */
const questDis = document.querySelector('.quest');
const answersContainer = document.querySelector('.answers');
const startBtn = document.querySelector('.start-btn');
const startScreen = document.querySelector('.startScreen');
const quizContainer = document.querySelector('.parentDiv');
const statsPage = document.querySelector('.statsPage');
const settingsBtn = document.querySelector('.settings-text');
const settingsPage = document.querySelector('.settingsCard');
const saveBtn = document.querySelector('.saveBtn');
const cancelBtn = document.querySelector('.cancelBtn');
const timerUi = document.querySelector('#timer');
const settingsForm = document.querySelector('#quizSettings');
const settingsNumQuestions = document.querySelector('#numQuestions');
const settingsNumOptions = document.querySelector('#numOptions');
const settingsTimeLimit = document.querySelector('#timeLimit');
const settingsDifficulty = document.querySelector('#difficulty');
const settingsCategory = document.querySelector('#category');
/* ============================
   STATE VARIABLES & DEFAULTS
   ============================ */
const DEFAULTS = {
  numQuestions: 10,
  numOptions: 4,
  timeLimit: 1,
  difficulty: 'Medium',
  category: ''
};

window.quizSettings = {
  numQuestions: DEFAULTS.numQuestions,
  numOptions: DEFAULTS.numOptions,
  timeLimit: DEFAULTS.timeLimit,
  difficulty: DEFAULTS.difficulty,
  category: DEFAULTS.category
};

let correctAnswer = null;
let answered = false;
let score = 0;
let timerEnded = false;
let timerId = null;
let totalSeconds = 0;
let currentQuestion = 0;
let frozen = false;
let startTimeStamp = null;

/* ============================
   Local Storage helpers
   ============================ */
const STORAGE_KEY = 'simple_quiz_settings_v1';

function loadSettingsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // robust checks: use hasOwnProperty to allow values like 0 (though we clamp later)
    if (Object.prototype.hasOwnProperty.call(parsed, 'numQuestions')) {
      window.quizSettings.numQuestions = Number(parsed.numQuestions) || DEFAULTS.numQuestions;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'numOptions')) {
      window.quizSettings.numOptions = Number(parsed.numOptions) || DEFAULTS.numOptions;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'timeLimit')) {
      window.quizSettings.timeLimit = Number(parsed.timeLimit) || DEFAULTS.timeLimit;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'difficulty')) {
      window.quizSettings.difficulty = parsed.difficulty || DEFAULTS.difficulty;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'category')) {
      window.quizSettings.category = parsed.category || DEFAULTS.category;
    }
    return true;
  } catch (err) {
    console.warn('Failed to load settings', err);
    return false;
  }
}

function saveSettingsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.quizSettings));
  } catch (err) {
    console.warn('Failed to save settings', err);
  }
}

/* ============================
   UI helpers: show/hide simple
   ============================ */
function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

/* ============================
   SETTINGS UI logic
   ============================ */
function fillSettingsForm() {
  if (!settingsNumQuestions) return;
  settingsNumQuestions.disabled = false;
  settingsNumOptions.disabled = false;
  settingsTimeLimit.disabled = false;
  settingsDifficulty.disabled = false;
  settingsCategory.disabled = true;

  settingsNumQuestions.value = window.quizSettings.numQuestions;
  settingsNumOptions.value = window.quizSettings.numOptions;
  settingsTimeLimit.value = window.quizSettings.timeLimit;
  settingsDifficulty.value = window.quizSettings.difficulty;
  settingsCategory.value = window.quizSettings.category || 'maths';
}

function readSettingsFormIntoState() {
  const nQ = Number(settingsNumQuestions.value) || DEFAULTS.numQuestions;
  const nO = Number(settingsNumOptions.value) || DEFAULTS.numOptions;
  const tL = Number(settingsTimeLimit.value) || DEFAULTS.timeLimit;
  const diff = settingsDifficulty.value || DEFAULTS.difficulty;
  const cat = settingsCategory.value || DEFAULTS.category;

  window.quizSettings.numQuestions = Math.max(1, Math.floor(nQ));
  window.quizSettings.numOptions = Math.max(2, Math.min(6, Math.floor(nO)));
  window.quizSettings.timeLimit = Math.max(1, Math.floor(tL));
  window.quizSettings.difficulty = diff;
  window.quizSettings.category = cat;
}

function onSaveSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  readSettingsFormIntoState();
  saveSettingsToStorage();
  hide(settingsPage);
  showAlert(`Settings saved. ${window.quizSettings.numQuestions} q, ${window.quizSettings.numOptions} opts, ${window.quizSettings.timeLimit} min.`);
  setTimeout(() => {
    show(startScreen)
  }, 2400);
}

function onCancelSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  // revert to defaults and clear storage so UI truly resets
  window.quizSettings = { ...DEFAULTS };
  try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
  fillSettingsForm();
  hide(settingsPage);
  showAlert('Settings reset to defaults.');
    setTimeout(() => {
    show(startScreen)
  }, 2400);
}

function openSettingsPanel() {
  fillSettingsForm();
  show(settingsPage);
  hide(startScreen);
}

/* ============================
   TIMER LOGIC (fixed)
   ============================ */
function formatTime(totalSecondsLocal) {
  const hours = Math.floor(totalSecondsLocal / 3600);
  const minutes = Math.floor((totalSecondsLocal % 3600) / 60);
  const seconds = totalSecondsLocal % 60;
  const pad = function (num) { return String(num).padStart(2, '0'); };
  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

function startTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
  timerEnded = false;
  // enforce at least 1 minute so Start doesn't instantly end the quiz
  totalSeconds = Math.max(1, Math.floor(window.quizSettings.timeLimit)) * 60;
  timerUi.textContent = formatTime(totalSeconds);
  startTimeStamp = Date.now();

  timerId = setInterval(function () {
    totalSeconds -= 1;
    if (totalSeconds < 0) totalSeconds = 0;
    timerUi.textContent = formatTime(totalSeconds);

    if (totalSeconds <= 0) {
      clearInterval(timerId);
      timerId = null;
      timerEnded = true;
      freezeQuizForTimeUp();
      timerUi.textContent = "00:00:00";
      endQuiz();
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}

/* ============================
   QUIZ QUESTION GENERATION (keeps your logic)
   ============================ */
function difficultyRange(difficulty) {
  if (difficulty === 'Easy') return { min: 2, max: 10 };
  if (difficulty === 'Hard') return { min: 2, max: 50 };
  return { min: 2, max: 20 };
}

function generateQuestion() {
  if (frozen || timerEnded) return;
  if (currentQuestion >= window.quizSettings.numQuestions) {
    endQuiz();
    return;
  }

  answered = false;
  answersContainer.innerHTML = '';

  const ops = ['×', '÷', '+', '−'];
  const range = difficultyRange(window.quizSettings.difficulty);
  let num1, num2;
  const operator = ops[randomInt(0, ops.length - 1)];

  if (operator === '÷') {
    const divisor = randomInt(2, Math.max(2, Math.min(range.max, 12)));
    const quotient = randomInt(2, Math.max(2, Math.min(range.max, 12)));
    num1 = divisor * quotient;
    num2 = divisor;
  } else {
    num1 = randomInt(range.min, range.max);
    num2 = randomInt(range.min, range.max);
    if (operator === '−' && num1 < num2) { var tmp = num1; num1 = num2; num2 = tmp; }
    if (operator === '×' && window.quizSettings.difficulty === 'Easy' && num1 * num2 > 100) {
      num1 = randomInt(range.min, Math.min(10, range.max));
      num2 = randomInt(range.min, Math.min(10, range.max));
    }
  }

  switch (operator) {
    case '+': correctAnswer = num1 + num2; break;
    case '−': correctAnswer = num1 - num2; break;
    case '×': correctAnswer = num1 * num2; break;
    case '÷': correctAnswer = Math.trunc(num1 / num2); break;
  }

  questDis.textContent = `${num1} ${operator} ${num2}`;

  const answersSet = new Set([correctAnswer]);
  const offsets = [1,2,3,4,5,6,7,8];
  while (answersSet.size < window.quizSettings.numOptions) {
    const offset = offsets[randomInt(0, offsets.length - 1)];
    const sign = Math.random() > 0.5 ? 1 : -1;
    let candidate = correctAnswer + sign * offset;
    if (candidate <= 0) candidate = Math.abs(candidate) + 1;
    answersSet.add(candidate);
  }

  const options = shuffle(Array.from(answersSet));
  for (let i = 0; i < options.length; i++) {
    const div = document.createElement('div');
    div.className = 'answer-option';
    div.textContent = String(options[i]);
    div.style.userSelect = 'none';
    div.setAttribute('data-value', String(options[i]));
    answersContainer.appendChild(div);
  }

  currentQuestion++;
}

/* ============================
   ANSWER CLICK LOGIC
   ============================ */
answersContainer.addEventListener('click', function (e) {
  if (frozen || timerEnded) return;
  const el = e.target;
  if (!el.classList.contains('answer-option')) return;
  if (answered) return;

  const picked = Number(el.textContent);
  if (isNaN(picked)) return;

  answered = true;

  if (picked === correctAnswer) {
    el.style.backgroundColor = '#2ecc71';
    el.style.color = '#fff';
    score++;
  } else {
    el.style.backgroundColor = '#e74c3c';
    el.style.color = '#fff';
    const all = answersContainer.querySelectorAll('.answer-option');
    for (let i = 0; i < all.length; i++) {
      const node = all[i];
      if (Number(node.textContent) === correctAnswer) {
        node.style.backgroundColor = '#2ecc71';
        node.style.color = '#fff';
      }
    }
  }

  setTimeout(function () {
    if (currentQuestion >= window.quizSettings.numQuestions) {
      endQuiz();
    } else {
      generateQuestion();
    }
  }, 700);
});

/* ============================
   FREEZE / END QUIZ LOGIC
   ============================ */
function freezeQuizForTimeUp() {
  frozen = true;
  answered = true;
  answersContainer.style.pointerEvents = 'none';
  showAlert('Time is up! Quiz frozen.');
}

function endQuiz() {
  // ensure timer is stopped
  stopTimer();

  // freeze the UI
  frozen = true;
  answered = true;
  answersContainer.style.pointerEvents = 'none';

  // compute stats
  const totalQuestions = window.quizSettings.numQuestions || 1;
  const percent = Math.round((score / totalQuestions) * 100);

  // compute actual time spent
  let timeSpentSec = 0;
  if (startTimeStamp) {
    timeSpentSec = Math.round((Date.now() - startTimeStamp) / 1000);
  } else {
    // fallback: time limit minus remaining seconds
    timeSpentSec = Math.max(0, Math.floor(window.quizSettings.timeLimit) * 60 - totalSeconds);
  }
  const avgTime = (currentQuestion > 0) ? (timeSpentSec / currentQuestion) : 0;

  // render a small stats block
  statsPage.innerHTML = '<div class="card"><h3>Results</h3>' +
    '<p>Score: ' + score + ' / ' + totalQuestions + '</p>' +
    '<p>Percentage: ' + percent + '%</p>' +
    '<p>Avg time (s/q): ' + avgTime.toFixed(2) + '</p>' +
    '<p>Category: ' + (window.quizSettings.category || 'N/A') + '</p>' +
    '</div>';

  setTimeout(() => {
    show(statsPage)
  }, 2200)
  hide(quizContainer);
  hide(startScreen);
}

/* ============================
   START TEST / RESET
   ============================ */
function resetQuizStateBeforeStart() {
  score = 0;
  currentQuestion = 0;
  correctAnswer = null;
  answered = false;
  frozen = false;
  timerEnded = false;
  answersContainer.innerHTML = '';
  questDis.textContent = '';
  answersContainer.style.pointerEvents = 'auto';
  timerUi.textContent = '00:00:00';
  hide(statsPage);
}

function startQuiz() {
  loadSettingsFromStorage(); // merge saved settings if present

  // use form values temporarily if user changed them
  const formNumQ = Number(settingsNumQuestions.value);
  if (!isNaN(formNumQ) && formNumQ > 0) window.quizSettings.numQuestions = Math.max(1, Math.floor(formNumQ));
  const formNumO = Number(settingsNumOptions.value);
  if (!isNaN(formNumO) && formNumO > 0) window.quizSettings.numOptions = Math.max(2, Math.min(6, Math.floor(formNumO)));
  const formTime = Number(settingsTimeLimit.value);
  if (!isNaN(formTime) && formTime > 0) window.quizSettings.timeLimit = Math.max(1, Math.floor(formTime));
  if (settingsDifficulty.value) window.quizSettings.difficulty = settingsDifficulty.value;
  if (settingsCategory.value !== undefined) window.quizSettings.category = settingsCategory.value;

  resetQuizStateBeforeStart();
  hide(startScreen);
  hide(settingsPage);
  show(quizContainer);

  startTimer();
  generateQuestion();
}

/* ============================
   ALERT HELPER
   ============================ */
function showAlert(msg, ms) {
  const alertPage = document.querySelector('.alertPage');
  const alertDiv = alertPage ? alertPage.querySelector('.alertDiv') : null;
  if (alertDiv) {
    alertDiv.textContent = msg;
    show(alertPage);
    setTimeout(function () { hide(alertPage); }, ms || 2200);
  } else {
    console.log('Alert:', msg);
  }
}

/* ============================
   HOOK UP BUTTONS
   ============================ */
if (startBtn) {
  startBtn.addEventListener('click', function () {
    hide(settingsPage);
    startQuiz();
  });
}
if (settingsBtn) settingsBtn.addEventListener('click', openSettingsPanel);
if (saveBtn) saveBtn.addEventListener('click', onSaveSettings);
if (cancelBtn) cancelBtn.addEventListener('click', onCancelSettings);
if (settingsForm) settingsForm.addEventListener('submit', function (e) { e.preventDefault(); onSaveSettings(e); });

/* ============================
   INIT - run on load
   ============================ */
(function init() {
  loadSettingsFromStorage();
  fillSettingsForm();
  timerUi.textContent = '00:00:00';
  hide(quizContainer);
  hide(statsPage);
  hide(settingsPage);
  show(startScreen);
  answersContainer.innerHTML = '';
  console.log('Quiz initialized. Settings:', window.quizSettings);
})();
