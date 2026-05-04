// ==========================================
// 1. STATE VARIABLES
// ==========================================
let allQuestions = [];
let sessionQuestions = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let currentStreak = 0;
let isSimulatorMode = false;

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const homeScreen = document.getElementById('home-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const appContainer = document.getElementById('app-container');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const explanationBox = document.getElementById('explanation-box');
const explanationText = document.getElementById('explanation-text');
const nextBtn = document.getElementById('next-btn');

const scoreDisplay = document.getElementById('score-display');
const streakDisplay = document.getElementById('streak-display');
const progressBar = document.getElementById('progress-bar');

// ==========================================
// 3. INITIALIZATION & DATA FETCHING
// ==========================================
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        allQuestions = await response.json();
        console.log("Questions loaded successfully!");
    } catch (error) {
        console.error("Error loading questions. Make sure you are running a local server.", error);
        questionText.innerText = "Error loading questions. Check console.";
    }
}

// Utility: Shuffle Array (Fisher-Yates)
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// ==========================================
// 4. STUDY MODES (THE 3-IN-1 ENGINE)
// ==========================================

// Mode 1: Quick Mix (10 Random Questions)
document.getElementById('btn-quick-mix').onclick = () => {
    isSimulatorMode = false;
    sessionQuestions = shuffleArray([...allQuestions]).slice(0, 10);
    startQuiz();
};

// Mode 2: Targeted Session (10 Filtered Questions)
document.getElementById('btn-targeted').onclick = () => {
    isSimulatorMode = false;
    const selectedDifficulty = document.getElementById('difficulty-select').value;
    const filtered = allQuestions.filter(q => q.difficulty === selectedDifficulty);
    
    if (filtered.length === 0) {
        alert("Not enough questions in this difficulty yet!");
        return;
    }
    
    sessionQuestions = shuffleArray(filtered).slice(0, 10);
    startQuiz();
};

// Mode 3: CPA Simulator (Adaptive Testing)
document.getElementById('btn-simulator').onclick = () => {
    isSimulatorMode = true;
    // Stage 1: Load 5 Medium Questions (scaled down from 10 for testing)
    const mediumPool = allQuestions.filter(q => q.difficulty === 'Medium');
    sessionQuestions = shuffleArray(mediumPool).slice(0, 5);
    startQuiz();
};

// ==========================================
// 5. CORE QUIZ LOGIC
// ==========================================
function startQuiz() {
    currentQuestionIndex = 0;
    correctAnswers = 0;
    currentStreak = 0;
    
    homeScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    showQuestion();
}

function showQuestion() {
    updateUI();
    explanationBox.classList.add('hidden');
    nextBtn.classList.add('hidden');
    
    const q = sessionQuestions[currentQuestionIndex];
    questionText.innerText = `Q${currentQuestionIndex + 1}: ${q.question}`;
    optionsContainer.innerHTML = '';

    // Create buttons for options
    q.options.forEach(option => {
        const btn = document.createElement('button');
        btn.innerText = option;
        btn.classList.add('option-btn');
        btn.onclick = (e) => checkAnswer(e, option, q);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(event, selectedOption, questionData) {
    // Disable all buttons so user can't click twice
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    const isCorrect = selectedOption === questionData.answer;

    if (isCorrect) {
        correctAnswers++;
        currentStreak++;
        event.target.classList.add('correct');
        triggerHaptic('correct');
    } else {
        currentStreak = 0;
        event.target.classList.add('incorrect');
        triggerHaptic('incorrect');
        triggerScreenShake();
        
        // Highlight the correct answer
        buttons.forEach(btn => {
            if (btn.innerText === questionData.answer) {
                btn.classList.add('correct');
            }
        });
    }

    // Show Explanation
    explanationText.innerText = questionData.explanation;
    explanationBox.classList.remove('hidden');
    
    updateUI();
    nextBtn.classList.remove('hidden');
}

nextBtn.onclick = () => {
    currentQuestionIndex++;

    // Adaptive Logic Check for CPA Simulator Mode
    if (isSimulatorMode && currentQuestionIndex === 5) {
        const accuracy = correctAnswers / 5;
        let nextPool = [];
        
        if (accuracy >= 0.8) {
            alert("Testlet 2 Routing: Hard Mode Engaged!");
            nextPool = allQuestions.filter(q => q.difficulty === 'Hard');
        } else {
            alert("Testlet 2 Routing: Medium Mode Maintained.");
            nextPool = allQuestions.filter(q => q.difficulty === 'Medium');
        }
        
        const nextQuestions = shuffleArray(nextPool).slice(0, 5);
        sessionQuestions = sessionQuestions.concat(nextQuestions);
    }

    if (currentQuestionIndex < sessionQuestions.length) {
        showQuestion();
    } else {
        endSession();
    }
};

// ==========================================
// 6. UI, GAMIFICATION & FEEDBACK
// ==========================================
function updateUI() {
    // Progress Bar
    const progressPercent = (currentQuestionIndex / sessionQuestions.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Score
    const scorePercent = currentQuestionIndex === 0 ? 0 : Math.round((correctAnswers / currentQuestionIndex) * 100);
    scoreDisplay.innerText = `Score: ${scorePercent}%`;

    // Streak
    let streakIcon = currentStreak >= 3 ? '🔥' : '➖';
    if (currentStreak >= 5) streakIcon = '☄️';
    streakDisplay.innerText = `${streakIcon} Streak: ${currentStreak}`;
}

function triggerScreenShake() {
    appContainer.classList.add('shake');
    setTimeout(() => appContainer.classList.remove('shake'), 400);
}

function triggerHaptic(type) {
    if (!('vibrate' in navigator)) return; // Safety check for iOS
    
    if (type === 'correct') {
        navigator.vibrate([50, 50, 50]); // Light double tap
    } else {
        navigator.vibrate(200); // Heavy buzz
    }
}

// ==========================================
// 7. END SESSION
// ==========================================
function endSession() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    const finalPercentage = Math.round((correctAnswers / sessionQuestions.length) * 100);
    document.getElementById('final-score').innerText = `Final Score: ${finalPercentage}%`;

    const messageEl = document.getElementById('result-message');
    if (finalPercentage >= 75) {
        messageEl.innerText = "Excellent work! You are on track for a passing score.";
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); // Fire Confetti!
    } else {
        messageEl.innerText = "Keep studying! Review your explanations and try again.";
    }
}

document.getElementById('btn-restart').onclick = () => {
    resultScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
};

// ==========================================
// START APP
// ==========================================
loadQuestions();