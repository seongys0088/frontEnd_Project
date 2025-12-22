let quizData = [];
let currentQuizIdx = 0;
let score = 0;
let comboCount = 0;
let timerInterval = null;
let userName = "";

$(document).ready(function() {
    initGame();
});

async function initGame() {
    try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error("JSON 로드 실패");
        const data = await response.json();
        quizData = data.quizData;

        // 이벤트 리스너 통합 등록
        document.getElementById('start-btn').onclick = startGame;
        document.getElementById('check-btn').onclick = checkAnswer;
        setupDragAndDrop();
    } catch (error) {
        console.error("초기화 오류:", error);
        alert("Live Server 환경에서 실행해야 데이터를 정상적으로 불러올 수 있습니다.");
    }
}

// 사용자 관리 및 로그인 로직
function startGame() {
    const nameInput = document.getElementById('user-name');
    const pwInput = document.getElementById('user-pw');
    const name = nameInput.value.trim();
    const password = pwInput.value.trim();

    if (!name || !password) {
        alert("PLAYER TAG와 PASSWORD를 모두 입력하세요!");
        return;
    }

    const allUsers = JSON.parse(localStorage.getItem('game_users')) || {};
    
    if (allUsers[name]) {
        if (allUsers[name].password !== password) {
            alert("비밀번호가 일치하지 않습니다!");
            return;
        }
    } else {
        // 신규 사용자 등록 로직
        allUsers[name] = {
            password: password,
            bestScore: 0,
            history: []
        };
        localStorage.setItem('game_users', JSON.stringify(allUsers));
    }

    userName = name;
    document.getElementById('display-user-name').textContent = userName;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    loadQuiz();
}

function loadQuiz() {
    if (currentQuizIdx >= quizData.length) {
        showResult();
        return;
    }
    const quiz = quizData[currentQuizIdx];
    
    // UI 업데이트
    document.getElementById('kor-sentence').textContent = `"${quiz.kor}"`;
    document.getElementById('game-progress').textContent = `QUEST ${currentQuizIdx + 1}`;
    document.getElementById('current-category').textContent = quiz.category || "TRANSLATE";
    document.getElementById('current-score').textContent = score;

    const wordPool = document.getElementById('word-pool');
    const dropZone = document.getElementById('drop-zone');
    wordPool.innerHTML = '';
    dropZone.innerHTML = '';

    // 단어 카드화 및 섞기
    const words = quiz.eng.split(' ');
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    
    shuffled.forEach(word => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.textContent = word;
        card.draggable = true;
        card.addEventListener('dragstart', () => card.classList.add('dragging'));
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        wordPool.appendChild(card);
    });

    startTimer(quiz.limitTime || 60);
}

// 정교한 드래그 앤 드롭
function setupDragAndDrop() {
    const containers = [document.getElementById('drop-zone'), document.getElementById('word-pool')];
    containers.forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingCard = document.querySelector('.dragging');
            const afterElement = getDragAfterElement(container, e.clientX);
            if (afterElement == null) {
                container.appendChild(draggingCard);
            } else {
                container.insertBefore(draggingCard, afterElement);
            }
        });
    });
}

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.word-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 정답 확인 및 콤보 보너스
function checkAnswer() {
    const quiz = quizData[currentQuizIdx];
    const userWords = [...document.getElementById('drop-zone').querySelectorAll('.word-card')]
        .map(c => c.textContent)
        .join(' ');

    if (userWords === quiz.eng) {
        clearInterval(timerInterval);
        comboCount++;
        score += (quiz.score || 10) + (comboCount * 5); // 콤보당 가중치 부여
        
        const comboEl = document.getElementById('combo-text');
        comboEl.textContent = `COMBO STREAK X${comboCount}`;
        comboEl.classList.remove('hidden');
        document.getElementById('current-score').textContent = score;

        currentQuizIdx++;
        loadQuiz();
    } else {
        comboCount = 0;
        document.getElementById('combo-text').classList.add('hidden');
        alert("배치 순서가 틀렸습니다!");
    }
}

function startTimer(sec) {
    clearInterval(timerInterval);
    let left = sec;
    const timerDisplay = document.getElementById('timer');
    timerInterval = setInterval(() => {
        left--;
        if(timerDisplay) timerDisplay.textContent = `TIME LEFT: ${left}s`;
        if (left <= 0) {
            clearInterval(timerInterval);
            alert("시간 초과!");
            comboCount = 0;
            currentQuizIdx++;
            loadQuiz();
        }
    }, 1000);
}

// 최종 이력 저장 및 표시
function showResult() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');

    const allUsers = JSON.parse(localStorage.getItem('game_users'));
    const userData = allUsers[userName];

    if (score > userData.bestScore) userData.bestScore = score;
    userData.history.push({ date: new Date().toLocaleString(), score: score });
    if (userData.history.length > 5) userData.history.shift();

    localStorage.setItem('game_users', JSON.stringify(allUsers));

    document.getElementById('final-user').textContent = userName;
    document.getElementById('final-score').textContent = score;
    document.getElementById('best-score-display').textContent = userData.bestScore;

    const historyList = document.getElementById('history-list');
    historyList.innerHTML = userData.history.map(h => 
        `<li>${h.date} <span>${h.score}pts</span></li>`
    ).reverse().join('');
}