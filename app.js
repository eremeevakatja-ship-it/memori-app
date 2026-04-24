let currentLang = 'uk';
let userRole = 'adult';
let blocks = [];
let currentStepIndex = 0;
let learningQueue = [];

const translations = {
    uk: {
        roleInstruct: "Хто буде навчатися?",
        roles: { child: "Дитина", teen: "Підліток", adult: "Дорослий" },
        welcome: { child: "🌈 Привіт! Пограємо?", teen: "⚡ Привіт! Прокачаємо мозок?", adult: "🌿 Вітаємо. Ефективне тренування." },
        inputLabel: "Вставте текст сюди:", daysLabel: "За скільки днів треба вивчити?",
        startBtn: "Скласти план", methodText: "Спосіб повторення:", methods: { mind: "В умі", write: "Письмо", audio: "Аудіо" },
        audioNote: "Запиши себе", stepNew: "🆕 ЗАПАМ'ЯТАЙ", stepReview: "❄️ ПОВТОРЕННЯ",
        check: "Перевірити", next: "Далі ➡️", done: "Готово!", restTitle: "☕ Пауза", restSubtitle: "Мозок відпочиває...", resume: "Продовжити"
    }
    // ... можна додати інші мови сюди
};

const codedRests = {
    child: "radial-gradient(circle at 30% 30%, #fff9c4 0%, #fff176 100%)",
    teen: "linear-gradient(135deg, #81d4fa 0%, #039be5 100%)",
    adult: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
};

// НОВА ФУНКЦІЯ: Розумний поділ за словами та реченнями
function smartSplitText(text) {
    // 1. Очищаємо текст від зайвих пустих рядків, але зберігаємо структуру
    const paragraphs = text.split(/\n+/);
    let allSentences = [];

    paragraphs.forEach(p => {
        // Розбиваємо кожен параграф на речення або частини з емодзі
        const parts = p.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
        allSentences.push(...parts);
    });

    let finalBlocks = [];
    let currentBlock = [];
    let currentWords = 0;

    allSentences.forEach(sentence => {
        const wordsInSentence = sentence.split(/\s+/).filter(w => w.length > 0);
        const sentenceLength = wordsInSentence.length;

        // Якщо одне речення саме по собі довше 16 слів — ріжемо його навпіл
        if (sentenceLength > 16) {
            if (currentBlock.length > 0) {
                finalBlocks.push(currentBlock.join(' '));
                currentBlock = [];
                currentWords = 0;
            }
            
            for (let i = 0; i < wordsInSentence.length; i += 15) {
                finalBlocks.push(wordsInSentence.slice(i, i + 15).join(' '));
            }
        } 
        // Якщо додавання речення перевищить ліміт 16 слів або 2 речень
        else if (currentWords + sentenceLength > 16 || currentBlock.length >= 2) {
            finalBlocks.push(currentBlock.join(' '));
            currentBlock = [sentence];
            currentWords = sentenceLength;
        } 
        else {
            currentBlock.push(sentence);
            currentWords += sentenceLength;
        }
    });

    if (currentBlock.length > 0) {
        finalBlocks.push(currentBlock.join(' '));
    }

    return finalBlocks.filter(b => b.trim().length > 0);
}

function setLanguage(lang) {
    currentLang = translations[lang] ? lang : 'uk';
    const t = translations[currentLang];
    document.querySelectorAll('[id^="role-"]').forEach(el => {
        const key = el.id.replace('role-', '');
        el.innerText = t.roles[key];
    });
    document.getElementById('roleInstruct').innerText = t.roleInstruct;
    document.getElementById('inputLabel').innerText = t.inputLabel;
    document.getElementById('daysLabel').innerText = t.daysLabel;
    document.getElementById('startBtn').innerText = t.startBtn;
    document.getElementById('restTitle').innerText = t.restTitle;
    document.getElementById('restSubtitle').innerText = t.restSubtitle;
    document.getElementById('resumeBtn').innerText = t.resume;
    document.getElementById('langScreen').style.display = 'none';
    document.getElementById('roleScreen').style.display = 'block';
}

function selectRole(role) {
    userRole = role;
    document.getElementById('roleScreen').style.display = 'none';
    document.getElementById('inputScreen').style.display = 'block';
    const t = translations[currentLang];
    document.getElementById('welcomeTitle').innerText = t.roles[role];
    document.getElementById('roleSubtitle').innerText = t.welcome[role];
}

function startLearning() {
    const text = document.getElementById('userText').value.trim();
    if (!text) return;

    blocks = smartSplitText(text);
    generateQueue();
    currentStepIndex = 0;
    document.getElementById('inputScreen').style.display = 'none';
    showStep();
}

function generateQueue() {
    learningQueue = [];
    let learnedSoFar = [];
    blocks.forEach((_, index) => {
        learningQueue.push({ index: index, type: 'new' });
        learnedSoFar.push(index);
        learningQueue.push({ type: 'rest' });
        learnedSoFar.forEach((lIdx, sub) => {
            learningQueue.push({ index: lIdx, type: 'review', sub: sub + 1, total: learnedSoFar.length });
        });
        if (index < blocks.length - 1) learningQueue.push({ type: 'rest' });
    });
}

function getRestTime() {
    const completedNew = learningQueue.slice(0, currentStepIndex).filter(s => s.type === 'new').length;
    if (completedNew <= 1) return 10;
    if (completedNew === 2) return 15;
    if (completedNew === 3) return 20;
    if (completedNew === 4) return 20;
    if (completedNew === 5) return 25;
    return 30;
}

function showStep() {
    const step = learningQueue[currentStepIndex];
    const t = translations[currentLang];
    if (!step) { alert(t.done); location.reload(); return; }

    if (step.type === 'rest') {
        startRest();
    } else {
        document.getElementById('learningScreen').style.display = 'block';
        document.getElementById('restScreen').style.display = 'none';
        resetUI();
        const originalText = blocks[step.index];
        if (step.type === 'new') {
            document.getElementById('stepLabel').innerText = t.stepNew;
            document.getElementById('textDisplay').innerText = originalText;
            document.getElementById('methodChoice').style.display = 'none';
            document.getElementById('nextBtn').innerText = t.done;
        } else {
            document.getElementById('stepLabel').innerText = `${t.stepReview} (${step.sub}/${step.total})`;
            document.getElementById('textDisplay').innerHTML = `<span style="color:#76ba99">${originalText.split(' ')[0]}</span> ...`;
            document.getElementById('methodChoice').style.display = 'block';
            document.getElementById('nextBtn').innerText = t.check;
        }
        document.getElementById('progressFill').style.width = ((currentStepIndex + 1) / learningQueue.length * 100) + "%";
    }
}

function startRest() {
    document.getElementById('learningScreen').style.display = 'none';
    document.getElementById('restScreen').style.display = 'block';
    document.getElementById('resumeBtn').style.display = 'none';
    
    const canvas = document.getElementById('restCanvas');
    canvas.style.backgroundImage = codedRests[userRole];
    
    let time = getRestTime();
    document.getElementById('timer').innerText = `00:${time < 10 ? '0' + time : time}`;
    
    const itv = setInterval(() => {
        time--;
        document.getElementById('timer').innerText = `00:${time < 10 ? '0' + time : time}`;
        if (time <= 0) { 
            clearInterval(itv); 
            document.getElementById('resumeBtn').style.display = 'block'; 
        }
    }, 1000);
}

function nextBlock() {
    const t = translations[currentLang];
    if (document.getElementById('nextBtn').innerText === t.check) {
        const step = learningQueue[currentStepIndex];
        document.getElementById('textDisplay').innerText = blocks[step.index];
        document.getElementById('nextBtn').innerText = t.next;
        return;
    }
    currentStepIndex++;
    showStep();
}

function selectMethod(m) {
    document.getElementById('writeArea').style.display = (m === 'write' ? 'block' : 'none');
    document.getElementById('audioArea').style.display = (m === 'audio' ? 'block' : 'none');
}

function resetUI() {
    document.getElementById('writeArea').style.display = 'none';
    document.getElementById('audioArea').style.display = 'none';
    document.getElementById('practiceText').value = "";
}

function resumeLearning() { 
    currentStepIndex++; 
    showStep(); 
}