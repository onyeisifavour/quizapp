/* Untitled-1.patched.js
   Minimal fixes applied to your version. Keeps your structure/comments.
*/

/* ============================
   HELPERS — small reusable functions
   ============================ */

/**
 * randomInt(min, max):
 * This function is like rolling a die. You give it a start (min) and end (max),
 * and it gives you a whole number back.
 * * Math.random() gives a decimal between 0 and 1 (like 0.543).
 * We multiply that by the range (max - min + 1) to stretch it out.
 * Math.floor() chops off the decimals to make it a whole number.
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * shuffle(arr):
 * This is the "Fisher-Yates Shuffle". It mixes up a list of items completely randomly.
 * Imagine a deck of cards. We start at the bottom and swap cards with random ones above.
 */
function shuffle(arr) {
  // Start from the last item (arr.length - 1) and go backwards to the first.
  for (let i = arr.length - 1; i > 0; i--) {
    // Pick a random spot 'j' that is somewhere before or at current spot 'i'
    const j = Math.floor(Math.random() * (i + 1));
    
    // THE SWAP: We need a temporary variable (tmp) to hold the value so we don't lose it.
    // 1. Save the current item in 'tmp'
    var tmp = arr[i];
    // 2. Overwrite the current item with the random item
    arr[i] = arr[j];
    // 3. Put the saved item into the random spot
    arr[j] = tmp;
  }
  return arr;
}

/* ============================
   DOM REFERENCES (from your HTML)
   These variables are your "remote controls" for the HTML elements on the screen.
   ============================ */
const questDis = document.querySelector('.quest');           // The box showing the math problem (e.g., "2 + 2")
const answersContainer = document.querySelector('.answers'); // The area where answer buttons appear
const startBtn = document.querySelector('.start-btn');       // The main "Start" button
const startScreen = document.querySelector('.startScreen');   // The homepage screen
const quizContainer = document.querySelector('.parentDiv');   // The game screen
const statsPage = document.querySelector('.statsPage');       // The results screen
const settingsBtn = document.querySelector('.settings-text'); // Button to open settings
const settingsPage = document.querySelector('.settingsCard'); // The settings popup
const saveBtn = document.querySelector('.saveBtn');           // Button to save changes
const cancelBtn = document.querySelector('.cancelBtn');       // Button to cancel changes
const timerUi = document.querySelector('#timer');             // The clock text (00:00:00)
const settingsForm = document.querySelector('#quizSettings'); // The form wrapper

// These capture the inputs inside the settings menu
const settingsNumQuestions = document.querySelector('#numQuestions');
const settingsNumOptions = document.querySelector('#numOptions');
const settingsTimeLimit = document.querySelector('#timeLimit');
const settingsDifficulty = document.querySelector('#difficulty');
const settingsCategory = document.querySelector('#category');

/* ============================
   STATE VARIABLES & DEFAULTS
   This is the "Brain" of the game. It remembers the score, time, and rules.
   ============================ */

// Defaults are used if the player has never changed the settings before.
const DEFAULTS = {
  numQuestions: 10,  // How many questions per game
  numOptions: 4,     // How many answer buttons (1 correct + 3 wrong)
  timeLimit: 1,      // Minutes allowed
  difficulty: 'Medium',
  category: ''
};

// 'window.quizSettings' is a global object that holds the ACTIVE rules for the game.
window.quizSettings = {
  numQuestions: DEFAULTS.numQuestions,
  numOptions: DEFAULTS.numOptions,
  timeLimit: DEFAULTS.timeLimit,
  difficulty: DEFAULTS.difficulty,
  category: DEFAULTS.category
};

// Game Status Variables
let correctAnswer = null;    // Stores the answer to the CURRENT question
let answered = false;        // Becomes true after you click an answer (prevents double clicking)
let score = 0;               // Your points
let timerEnded = false;      // True if the clock hits 0
let timerId = null;          // Holds the ID of the timer so we can stop it later
let totalSeconds = 0;        // Countdown counter in seconds
let currentQuestion = 0;     // Which question # are we on?
let frozen = false;          // If true, the game is paused/stopped and you can't click
let startTimeStamp = null;   // Records the exact time you started (for stats)

/* ============================
   Local Storage helpers
   This saves your settings to the browser so they stick around after refreshing.
   ============================ */
const STORAGE_KEY = 'simple_quiz_settings_v1';

function loadSettingsFromStorage() {
  try {
    // Check if we have saved data in the browser
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false; // If nothing saved, stop here
    
    // Turn the saved text back into a Javascript Object
    const parsed = JSON.parse(raw);
    
    // Check if each setting exists in the saved data, then update our game variables.
    // We use Number() to make sure "10" (string) becomes 10 (number).
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
    // Convert our settings object into a string and save it to the browser
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.quizSettings));
  } catch (err) {
    console.warn('Failed to save settings', err);
  }
}

/* ============================
   UI helpers: show/hide simple
   ============================ */
// Helper to remove the 'hidden' class (makes things visible)
function show(el) { if (el) el.classList.remove('hidden'); }

// Helper to add the 'hidden' class (makes things invisible)
function hide(el) { if (el) el.classList.add('hidden'); }

/* ============================
   SETTINGS UI logic
   Handles opening, closing, and saving the settings menu.
   ============================ */

// Takes the values from the code (variables) and puts them into the input boxes.
function fillSettingsForm() {
  if (!settingsNumQuestions) return;
  
  // Enable the inputs so the user can type
  settingsNumQuestions.disabled = false;
  settingsNumOptions.disabled = false;
  settingsTimeLimit.disabled = false;
  settingsDifficulty.disabled = false;
  settingsCategory.disabled = true; // Category is disabled (maybe for future use?)

  // Set the values
  settingsNumQuestions.value = window.quizSettings.numQuestions;
  settingsNumOptions.value = window.quizSettings.numOptions;
  settingsTimeLimit.value = window.quizSettings.timeLimit;
  settingsDifficulty.value = window.quizSettings.difficulty;
  settingsCategory.value = window.quizSettings.category || 'maths';
}

// Takes the values from the input boxes and saves them into the code variables.
function readSettingsFormIntoState() {
  const nQ = Number(settingsNumQuestions.value) || DEFAULTS.numQuestions;
  const nO = Number(settingsNumOptions.value) || DEFAULTS.numOptions;
  const tL = Number(settingsTimeLimit.value) || DEFAULTS.timeLimit;
  const diff = settingsDifficulty.value || DEFAULTS.difficulty;
  const cat = settingsCategory.value || DEFAULTS.category;

  // Validation: We use Math.max/min to stop the user from breaking the game.
  // Example: Math.max(1, ...) ensures they can't set 0 or negative questions.
  window.quizSettings.numQuestions = Math.max(1, Math.floor(nQ));
  window.quizSettings.numOptions = Math.max(2, Math.min(6, Math.floor(nO))); // Max 6 options
  window.quizSettings.timeLimit = Math.max(1, Math.floor(tL));
  window.quizSettings.difficulty = diff;
  window.quizSettings.category = cat;
}

// Runs when you click "Save"
function onSaveSettings(e) {
  if (e && e.preventDefault) e.preventDefault(); // Stop form from reloading page

  readSettingsFormIntoState(); // Update variables
  saveSettingsToStorage();     // Save to browser

  // Show a popup saying it worked
  showAlert({
    title: "Settings Saved",
    message: "Your quiz settings have been saved successfully.",
    buttons: {
      Done: function () {

        hide(settingsPage);
        show(startScreen);
        hide(document.querySelector(".alertPage"));
      }
    }
  });
}

// Runs when you click "Cancel"
function onCancelSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  
  // Reset everything back to defaults
  window.quizSettings = { ...DEFAULTS };
  try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
  
  fillSettingsForm(); // Update the inputs to show the default numbers
  hide(settingsPage);
  
  // Show a message saying reset complete
  showAlert('Settings reset to defaults.');
    setTimeout(() => {
    show(startScreen)
  }, 2400);
}

// Opens the settings menu
function openSettingsPanel() {
  fillSettingsForm();
  show(settingsPage);
  hide(startScreen);
}

/* ============================
   TIMER LOGIC (fixed)
   Handles the countdown clock.
   ============================ */

// Converts total seconds (e.g., 65) into "00:01:05"
function formatTime(totalSecondsLocal) {
  const hours = Math.floor(totalSecondsLocal / 3600);
  const minutes = Math.floor((totalSecondsLocal % 3600) / 60);
  const seconds = totalSecondsLocal % 60;
  
  // Helper to add a zero in front if number is less than 10 (e.g., "9" -> "09")
  const pad = function (num) { return String(num).padStart(2, '0'); };
  
  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

function startTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; } // Clear any old timer
  timerEnded = false;

  // Convert minutes (from settings) to seconds
  totalSeconds = Math.max(1, Math.floor(window.quizSettings.timeLimit)) * 60;
  timerUi.textContent = formatTime(totalSeconds); // Update screen immediately
  startTimeStamp = Date.now(); // Record start time

  // This runs every 1 second (1000ms)
  timerId = setInterval(function () {
    totalSeconds -= 1; // Subtract 1 second
    if (totalSeconds < 0) totalSeconds = 0;
    timerUi.textContent = formatTime(totalSeconds); // Update screen

    // If time runs out...
    if (totalSeconds <= 0) {
      clearInterval(timerId); // Stop the clock
      timerId = null;
      timerEnded = true;
      freezeQuizForTimeUp(); // Lock the game
      timerUi.textContent = "00:00:00";
      endQuiz(); // Show results
    }
  }, 1000);
}

// Forces the timer to stop
function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}

/* ============================
   QUIZ QUESTION GENERATION
   This is where the Math happens!
   ============================ */

// Decides how big the numbers are based on difficulty
function difficultyRange(difficulty) {
  if (difficulty === 'Easy') return { min: 2, max: 10 };
  if (difficulty === 'Hard') return { min: 2, max: 50 };
  return { min: 2, max: 20 }; // Medium
}

function generateQuestion() {
  if (frozen || timerEnded) return; // Stop if game is frozen
  
  // Check if we reached the last question
  if (currentQuestion >= window.quizSettings.numQuestions) {
    endQuiz();
    return;
  }

  answered = false; // Reset answered flag for new question
  answersContainer.innerHTML = ''; // Clear old buttons

  // Setup Math variables
  const ops = ['×', '÷', '+', '−'];
  const range = difficultyRange(window.quizSettings.difficulty);
  let num1, num2;
  const operator = ops[randomInt(0, ops.length - 1)]; // Pick random operator

  // LOGIC FOR DIVISION (÷)
  // We want whole numbers only. 10 / 2 = 5 is good. 10 / 3 = 3.33 is bad.
  // So we pick the answer (quotient) and the divisor first, then multiply them to get the big number.
  if (operator === '÷') {
    const divisor = randomInt(2, Math.max(2, Math.min(range.max, 12)));
    const quotient = randomInt(2, Math.max(2, Math.min(range.max, 12)));
    num1 = divisor * quotient;
    num2 = divisor;
  } else {
    // Logic for +, -, x
    num1 = randomInt(range.min, range.max);
    num2 = randomInt(range.min, range.max);
    
    // If Subtracting, swap numbers so we don't get negatives (e.g. 5 - 10)
    if (operator === '−' && num1 < num2) { var tmp = num1; num1 = num2; num2 = tmp; }
    
    // If Easy Multiplication, keep numbers smaller (so it's not too hard for kids)
    if (operator === '×' && window.quizSettings.difficulty === 'Easy' && num1 * num2 > 100) {
      num1 = randomInt(range.min, Math.min(10, range.max));
      num2 = randomInt(range.min, Math.min(10, range.max));
    }
  }

  // Calculate the Real Answer
  switch (operator) {
    case '+': correctAnswer = num1 + num2; break;
    case '−': correctAnswer = num1 - num2; break;
    case '×': correctAnswer = num1 * num2; break;
    case '÷': correctAnswer = Math.trunc(num1 / num2); break;
  }

  // Show the question text
  questDis.textContent = `${num1} ${operator} ${num2}`;

  // GENERATE DISTRACTORS (Wrong Answers)
  const answersSet = new Set([correctAnswer]); // Set ensures no duplicates
  const offsets = [1,2,3,4,5,6,7,8]; // Numbers to add/subtract to make fake answers
  
  // Keep adding fake answers until we have enough options
  while (answersSet.size < window.quizSettings.numOptions) {
    const offset = offsets[randomInt(0, offsets.length - 1)];
    const sign = Math.random() > 0.5 ? 1 : -1; // Randomly add or subtract
    let candidate = correctAnswer + sign * offset;
    
    if (candidate <= 0) candidate = Math.abs(candidate) + 1; // No negatives or zero
    answersSet.add(candidate);
  }

  // Shuffle the answers using the Fisher-Yates helper from earlier
  const options = shuffle(Array.from(answersSet));
  
  // Create the buttons on the screen
  for (let i = 0; i < options.length; i++) {
    const div = document.createElement('div');
    div.className = 'answer-option';
    div.textContent = String(options[i]);
    div.style.userSelect = 'none'; // Prevents text highlighting
    div.setAttribute('data-value', String(options[i]));
    answersContainer.appendChild(div);
  }

  currentQuestion++; // Count this question
}

/* ============================
   ANSWER CLICK LOGIC
   Handles what happens when you click an answer button.
   ============================ */
answersContainer.addEventListener('click', function (e) {
  if (frozen || timerEnded) return; // Ignore clicks if game over
  
  const el = e.target;
  // If they clicked the gap between buttons, ignore it.
  if (!el.classList.contains('answer-option')) return;
  
  // If they already answered this question, ignore it.
  if (answered) return;

  const picked = Number(el.textContent);
  if (isNaN(picked)) return; // Safety check

  answered = true; // Lock the question

  if (picked === correctAnswer) {
    // CORRECT! Turn button green.
    el.style.backgroundColor = '#2ecc71';
    el.style.color = '#fff';
    score++;
  } else {
    // WRONG! Turn button red.
    el.style.backgroundColor = '#e74c3c';
    el.style.color = '#fff';
    
    // Find the right answer and show it in green so they learn
    const all = answersContainer.querySelectorAll('.answer-option');
    for (let i = 0; i < all.length; i++) {
      const node = all[i];
      if (Number(node.textContent) === correctAnswer) {
        node.style.backgroundColor = '#2ecc71';
        node.style.color = '#fff';
      }
    }
  }

  // Wait 700ms (0.7 seconds) before showing the next question
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

// Called when timer hits 0
function freezeQuizForTimeUp() {
  frozen = true;
  answered = true;
  answersContainer.style.pointerEvents = 'none'; // Stop mouse clicks
  showAlert('Time is up! Quiz frozen.');
}

// Called when game is finished
function endQuiz() {
  stopTimer(); // Ensure timer stops

  frozen = true;
  answered = true;
  answersContainer.style.pointerEvents = 'none';

  // Calculate Stats
  const totalQuestions = window.quizSettings.numQuestions || 1;
  const percent = Math.round((score / totalQuestions) * 100);

  // Calculate how long it actually took
  let timeSpentSec = 0;
  if (startTimeStamp) {
    timeSpentSec = Math.round((Date.now() - startTimeStamp) / 1000);
  } else {
    // Fallback calculation
    timeSpentSec = Math.max(0, Math.floor(window.quizSettings.timeLimit) * 60 - totalSeconds);
  }
  
  // Calculate average time per question
  const avgTime = (currentQuestion > 0) ? (timeSpentSec / currentQuestion) : 0;

  // Create the Results Card HTML
  statsPage.innerHTML = '<div class="card"><h3>Results</h3>' +
    '<p>Score: ' + score + ' / ' + totalQuestions + '</p>' +
    '<p>Percentage: ' + percent + '%</p>' +
    '<p>Avg time (s/q): ' + avgTime.toFixed(2) + '</p>' +
    '<p>Category: ' + (window.quizSettings.category || 'N/A') + '</p>' +
    '</div>';

  // Show stats after 2.2 seconds
  setTimeout(() => {
    show(statsPage)
  }, 2200)
  
  hide(quizContainer);
  hide(startScreen);
}

/* ============================
   START TEST / RESET
   Prepares the variables for a new game.
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
  answersContainer.style.pointerEvents = 'auto'; // Re-enable clicking
  timerUi.textContent = '00:00:00';
  hide(statsPage);
}

function startQuiz() {
  loadSettingsFromStorage(); // Load saved settings

  // Double check form values just in case
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
   A custom popup system (instead of using the browser's ugly alert box).
   ============================ */
function showAlert(config) {
  const alertPage = document.querySelector(".alertPage");
  const titleEl = alertPage.querySelector(".alertTitle");
  const messageEl = alertPage.querySelector(".alertMessage");
  const buttonsContainer = alertPage.querySelector(".alertButtons");

  // If the user passed just a string 'Hello', handle it safely
  titleEl.textContent = config.title || "";
  messageEl.textContent = config.message || (typeof config === 'string' ? config : "");

  // Clear old buttons
  buttonsContainer.innerHTML = "";

  // If config has buttons, create them.
  if (config.buttons) {
    for (const label in config.buttons) {
      const action = config.buttons[label];
      renderAlertButton(label, action, buttonsContainer);
    }
  }

  show(alertPage);
}

// Creates a single button for the alert popup
function renderAlertButton(label, action, container) {
  const btn = document.createElement("button");

  btn.textContent = label;
  btn.classList.add(`${label}.button2`);

  btn.addEventListener("click", function () {
    action();
  });

  container.appendChild(btn);
}


/* ============================
   HOOK UP BUTTONS
   This connects clicks to functions.
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
// Allow pressing "Enter" in the form to save
if (settingsForm) settingsForm.addEventListener('submit', function (e) { e.preventDefault(); onSaveSettings(e); });

/* ============================
   INIT - run on load
   This runs automatically when the page opens.
   ============================ */
(function init() {
  loadSettingsFromStorage();
  fillSettingsForm();
  timerUi.textContent = '00:00:00';
  
  // Ensure the right screens are hidden/shown
  hide(quizContainer);
  hide(statsPage);
  hide(settingsPage);
  show(startScreen);
  
  answersContainer.innerHTML = '';
  console.log('Quiz initialized. Settings:', window.quizSettings);
})();