// ===== learning.js =====
// Text Mode learning engine: splitting text into blocks, building the review queue,
// stepping through new/review/bigReview blocks, rest countdown, the three review
// methods (mind / write / audio dispatch), text comparison/scoring, and the
// pause/final/session-end screens.
// Plain classic script — see state.js header for why (no ES modules).
// Split out of app.js (BACKLOG Q-01).

// ----- [L1 animateTextIn + text splitting]  (was app.js lines 1774-1921) -----
function animateTextIn(el) {
    if (!el) return;
    el.classList.remove('text-fade-enter');
    void el.offsetWidth;
    el.classList.add('text-fade-enter');
}

// Розумне ділення тексту: поважає межі речень, не ріже думку посередині
function smartSplitText(text, size = blockSize) {
    // Розбиваємо на секції по подвійних переносах
    const rawSections = text.trim().split(/\n{2,}/);
    const blocks = [];

    for (const section of rawSections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        if (/\n/.test(trimmed)) {
            // Вірш / пісня: кожен рядок = окремий блок.
            // Виняток: якщо рядок довший за size слів — примусово ріжемо його
            // (той самий splitLongSentence, що й нижче для прози), інакше
            // довгий рядок без пунктуації повністю ігнорував blockSize.
            const lines = trimmed.split('\n')
                .map(l => l.replace(/\s+/g, ' ').trim())
                .filter(l => countWords(l) >= 2);
            for (const line of lines) {
                if (countWords(line) > size) {
                    blocks.push(...splitLongSentence(line, size));
                } else {
                    blocks.push(line);
                }
            }
        } else {
            // Проза: групуємо речення
            const prose = trimmed.replace(/\s+/g, ' ');
            const sentences = extractSentences(prose);
            let group = [], wordCount = 0;

            for (const sent of sentences) {
                const wc = countWords(sent);
                if (wc >= size) {
                    if (group.length) { blocks.push(group.join(' ')); group = []; wordCount = 0; }
                    blocks.push(...splitLongSentence(sent, size));
                } else if (wordCount > 0 && wordCount + wc > size) {
                    blocks.push(group.join(' '));
                    group = [sent]; wordCount = wc;
                } else {
                    group.push(sent); wordCount += wc;
                }
            }
            if (group.length) blocks.push(group.join(' '));
        }
    }

    return blocks.filter(b => countWords(b) >= 2);
}

function countWords(text) {
    return text.split(/\s+/).filter(Boolean).length;
}

function extractSentences(text) {
    // Захищаємо скорочення та числа з крапкою від помилкового розрізання
    const PLACEHOLDER = '·';
    let safe = text
        // Скорочення (Mr. Dr. і т.д.)
        .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Rev|Sr|Jr|St|vs|Vs|etc|approx|No|Vol|Fig|approx)\./g, `$1${PLACEHOLDER}`)
        // Українські скорочення
        .replace(/\b(вул|просп|пл|буд|кв|обл|р|рр|ст|млн|млрд|грн|кг|км|см|мм|год|хв|сек)\./gi, `$1${PLACEHOLDER}`)
        // Десяткові числа: 3.14 → 3·14
        .replace(/(\d)\.(\d)/g, `$1${PLACEHOLDER}$2`)
        // Одна велика літера з крапкою (ініціали): A. або О.
        .replace(/\b([A-ZА-ЯІЇЄ])\.(?=\s)/g, `$1${PLACEHOLDER}`);

    // Ділимо на речення: [.!?]+ після яких пробіл і ВЕЛИКА літера
    const sentenceEnd = /([.!?]+)\s+(?=[А-ЯІЇЄЁA-ZÀ-ɏ])/g;
    const parts = [];
    let last = 0, m;

    while ((m = sentenceEnd.exec(safe)) !== null) {
        parts.push(safe.slice(last, m.index + m[1].length).replace(new RegExp(PLACEHOLDER, 'g'), '.').trim());
        last = m.index + m[1].length + (safe.slice(m.index + m[1].length).match(/^\s+/)?.[0].length || 0);
    }
    if (last < safe.length) {
        parts.push(safe.slice(last).replace(new RegExp(PLACEHOLDER, 'g'), '.').trim());
    }

    return parts.filter(s => s.length > 0);
}

function splitLongSentence(sentence, size = blockSize) {
    // Ділимо довге речення по комах/крапках з комою/тире
    const SPLIT_AT = /(?<=[,;—–])\s+(?=\S)/;
    const chunks = sentence.split(SPLIT_AT);
    const result = [];
    let cur = [], wc = 0;

    for (const chunk of chunks) {
        const cw = countWords(chunk);
        if (wc >= Math.floor(size * 0.5) && wc + cw > size - 2) {
            result.push(cur.join(' ').replace(/[,;—–]\s*$/, '').trim());
            cur = [chunk]; wc = cw;
        } else {
            cur.push(chunk); wc += cw;
        }
    }
    if (cur.length) result.push(cur.join(' ').replace(/[,;—–]\s*$/, '').trim());

    // Пунктуації для розбиття могло не бути взагалі (або бути замало) —
    // тоді якийсь шматок і далі перевищує size слів. Такі шматки ріжемо
    // примусово по кількості слів, щоб blockSize реально дотримувався
    // навіть без ком/крапок з комою/тире в реченні.
    // Короткі шматки (< 4 слів) НЕ відкидаємо (це губило слова — реальний
    // баг, знайдений User: перші рядки вірша, що після розбиття по комі
    // давали короткий початковий шматок, зникали з тексту повністю) —
    // приєднуємо їх до попереднього шматка замість дропу.
    const final = [];
    for (const piece of result) {
        if (countWords(piece) > size) {
            final.push(...splitByWordCount(piece, size));
        } else if (final.length > 0 && countWords(piece) < 4) {
            final[final.length - 1] += ' ' + piece;
        } else {
            final.push(piece);
        }
    }
    return final;
}

// Просте примусове розбиття тексту без пунктуації на шматки по size слів.
// Якщо останній залишок виходить занадто малим (< 4 слів), приєднуємо його
// до попереднього шматка замість того, щоб губити слова або створювати
// мікроскопічний блок з 1-2 слів.
function splitByWordCount(text, size) {
    const words = text.split(/\s+/).filter(Boolean);
    const out = [];
    let i = 0;
    while (i < words.length) {
        let end = Math.min(i + size, words.length);
        if (words.length - end > 0 && words.length - end < 4) {
            end = words.length;
        }
        out.push(words.slice(i, end).join(' '));
        i = end;
    }
    return out;
}


// ----- [L2 calcBlockLimit..selectMethod (learning session core)]  (was app.js lines 2436-2747) -----
function calcBlockLimit(minutes) {
    if (minutes === Infinity) return Infinity;
    return Math.max(1, Math.round(minutes / 2.5));
}

function startLearning() {
    const t = translations[currentLang];
    const btn = document.getElementById('setupStartBtn');
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;
    const text = document.getElementById('userText').value.trim();

    currentRawText = text;
    blocks = smartSplitText(text, blockSize);

    clearValidation();
    clearState();
    blockMastery = {};
    generateQueue();
    currentStepIndex = 0;
    newBlocksShownInSession = 0;
    window._sessionBlockLimit = calcBlockLimit(sessionTimeLimit);
    sessionStartTime = Date.now();
    showScreen('learningScreen');
    if (btn) btn.disabled = false;
    showStep();
}

function generateQueue() {
    learningQueue = []; let learned = [];
    blocks.forEach((_, i) => {
        learningQueue.push({ index: i, type: 'new' });
        learned.push(i);
        learningQueue.push({ type: 'rest' });
        learned.forEach((lIdx, sub) => {
            learningQueue.push({ index: lIdx, type: 'review', sub: sub + 1, total: learned.length });
            // If this block is struggling — add one extra review immediately
            if (getBlockStatus(lIdx) === 'struggling') {
                learningQueue.push({ index: lIdx, type: 'review', sub: sub + 1, total: learned.length, extra: true });
            }
        });

        // Big review: after every 3 new blocks, or at the last block (if at least 3 exist)
        const isEvery3 = (i + 1) % 3 === 0;
        const isLast = i === blocks.length - 1;
        if ((isEvery3 || isLast) && i >= 2) {
            learningQueue.push({ type: 'rest' });
            learningQueue.push({ type: 'bigReview', upToIndex: i });
        }

        if (i < blocks.length - 1) learningQueue.push({ type: 'rest' });
    });
}

function resetLearningExtras() {
    window.speechSynthesis.cancel();
    if (window._activeRecognition) { try { window._activeRecognition.abort(); } catch(e) {} window._activeRecognition = null; }
    document.getElementById('mindCard').style.display = 'none';
    document.getElementById('writingArea').style.display = 'none';
    document.getElementById('writingResult').style.display = 'none';
    document.getElementById('audioCard').style.display = 'none';
    document.getElementById('micRecording').style.display = 'none';
    document.getElementById('textDisplay').style.display = 'flex';
    document.getElementById('nextBtn').style.display = 'block';
    currentMethod = null;
}

function showStep() {
    const step = learningQueue[currentStepIndex];
    const t = translations[currentLang];
    if (!step) { showFinal(); return; }
    if (step.type === 'rest') { startRest(); return; }
    if (step.type === 'bigReview') { showBigReview(step.upToIndex); return; }

    applyFontSize();
    resetLearningExtras();

    document.getElementById('learningScreen').style.display = 'block';
    document.getElementById('restScreen').style.display = 'none';
    const display = document.getElementById('textDisplay');
    const hint = document.getElementById('instructionHint');

    if (step.type === 'new') {
        document.getElementById('stepLabel').innerText = `${t.stepNew}  ${step.index + 1} / ${blocks.length}`;
        display.innerText = blocks[step.index];
        animateTextIn(display);
        playNewBlockSound();
        hint.innerText = t.instruction_hint;
        hint.style.display = 'block';
        document.getElementById('methodChoice').style.display = 'none';
        document.getElementById('nextBtn').innerText = t.done;
    } else {
        const status = getBlockStatus(step.index);
        const statusIcon = status === 'mastered'   ? ' ✅'
                         : status === 'struggling' ? ' 🔁'
                         : '';
        document.getElementById('stepLabel').innerText = `${t.stepReview}  ${step.sub} / ${step.total}${statusIcon}`;
        display.innerHTML = `<span class="first-word">${escHtml(blocks[step.index].split(' ')[0])}</span> ...`;
        animateTextIn(display);
        hint.style.display = 'none';
        document.getElementById('methodChoice').style.display = 'block';
        document.getElementById('nextBtn').style.display = 'none'; // hidden until method completes
        document.querySelectorAll('.btn-small').forEach(b => b.classList.remove('active-method'));
        document.getElementById('m-mind').innerText = t.method_mind;
        document.getElementById('m-write').style.display = '';
        document.getElementById('m-write').innerText = t.method_write;
        document.getElementById('m-audio').innerText = t.method_audio;
    }
    document.getElementById('progressFill').style.width = ((currentStepIndex + 1) / learningQueue.length * 100) + '%';
}

function showBigReview(upToIndex) {
    const t = translations[currentLang];
    resetLearningExtras();

    document.getElementById('learningScreen').style.display = 'block';
    document.getElementById('restScreen').style.display = 'none';

    // Collect full text from block 0 to upToIndex
    const fullText = blocks.slice(0, upToIndex + 1).join('\n');
    window._bigReviewText = blocks.slice(0, upToIndex + 1).join(' ');

    // Step label
    const labelTpl = t.bigReviewLabel || 'ALL (1–{n})';
    const label = labelTpl.replace('{n}', upToIndex + 1);
    document.getElementById('stepLabel').innerHTML =
        '<span class="step-badge step-badge-big">' + label + '</span>';

    // Show full text
    const display = document.getElementById('textDisplay');
    display.innerText = fullText;
    display.style.whiteSpace = 'pre-line';
    display.style.display = 'flex';
    animateTextIn(display);

    // Hint
    const hint = document.getElementById('instructionHint');
    hint.innerText = t.bigReviewHint || 'Read all — then reproduce from the start';
    hint.style.display = 'block';

    // Next button calls bigReviewReadDone
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.innerText = t.done;
    nextBtn.style.display = 'block';
    nextBtn.onclick = bigReviewReadDone;

    document.getElementById('methodChoice').style.display = 'none';

    // Progress
    document.getElementById('progressFill').style.width =
        ((currentStepIndex + 1) / learningQueue.length * 100) + '%';

    applyFontSize();
}

function bigReviewReadDone() {
    // Restore standard onclick
    document.getElementById('nextBtn').onclick = nextBlock;
    // Hide text, show method choice
    document.getElementById('textDisplay').style.display = 'none';
    document.getElementById('instructionHint').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('methodChoice').style.display = 'block';
    const t = translations[currentLang];
    document.getElementById('m-mind').innerText = t.method_mind;
    document.getElementById('m-write').style.display = 'none'; // BigReview: no writing
    document.getElementById('m-audio').innerText = t.method_audio;
    document.querySelectorAll('.btn-small').forEach(b => b.classList.remove('active-method'));
}

function renderRestDurOnScreen() {
    const t = translations[currentLang];
    const vals = [5, 10, 20, 30];
    const container = document.getElementById('restDurInline');
    if (!container) return;
    container.innerHTML = '';
    vals.forEach((val, i) => {
        const btn = document.createElement('button');
        btn.className = 'time-card' + (val === restDuration ? ' active' : '');
        btn.innerText = t.restDurOptions[i];
        btn.addEventListener('click', () => {
            restDuration = val;
            container.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            if (window._restInterval) clearInterval(window._restInterval);
            startRestCountdown();
        });
        container.appendChild(btn);
    });
}

let restTimeLeft = 0;
let restPaused = false;

function restTick() {
    const t = translations[currentLang];
    restTimeLeft--;
    document.getElementById('timer').innerText = `00:${restTimeLeft < 10 ? '0' + restTimeLeft : restTimeLeft}`;
    if (restTimeLeft <= 0) {
        clearInterval(window._restInterval);
        const pauseBtn = document.getElementById('restPauseBtn');
        if (pauseBtn) pauseBtn.style.display = 'none';
        playRestDoneSound();
        document.getElementById('resumeBtn').innerText = t.resume;
        document.getElementById('resumeBtn').style.display = 'block';
    }
}

function startRestCountdown() {
    if (window._restInterval) clearInterval(window._restInterval);
    const t = translations[currentLang];
    restTimeLeft = restDuration;
    restPaused = false;
    document.getElementById('resumeBtn').style.display = 'none';
    document.getElementById('timer').innerText = `00:${restTimeLeft < 10 ? '0' + restTimeLeft : restTimeLeft}`;
    document.getElementById('timer').classList.remove('timer-paused');
    const pauseBtn = document.getElementById('restPauseBtn');
    if (pauseBtn) {
        pauseBtn.style.display = 'inline-flex';
        pauseBtn.innerText = '⏸';
        pauseBtn.setAttribute('aria-label', t.restPause || 'Pause');
    }
    window._restInterval = setInterval(restTick, 1000);
}

// F-05: пауза/продовження таймера відпочинку
function toggleRestPause() {
    const t = translations[currentLang];
    const pauseBtn = document.getElementById('restPauseBtn');
    const timerEl = document.getElementById('timer');
    if (!restPaused) {
        clearInterval(window._restInterval);
        restPaused = true;
        if (pauseBtn) { pauseBtn.innerText = '▶'; pauseBtn.setAttribute('aria-label', t.restResume || 'Resume'); }
        if (timerEl) timerEl.classList.add('timer-paused');
    } else {
        restPaused = false;
        if (pauseBtn) { pauseBtn.innerText = '⏸'; pauseBtn.setAttribute('aria-label', t.restPause || 'Pause'); }
        if (timerEl) timerEl.classList.remove('timer-paused');
        window._restInterval = setInterval(restTick, 1000);
    }
}

function startRest() {
    const t = translations[currentLang];
    document.getElementById('learningScreen').style.display = 'none';
    document.getElementById('restScreen').style.display = 'block';
    document.getElementById('restTitle').innerText = t.restTitle;
    document.getElementById('restSubtitle').innerText = t.restSubtitle;
    document.getElementById('restCanvas').style.backgroundImage = codedRests[currentTheme] || codedRests.light;
    const motivEl = document.getElementById('restMotiv');
    if (motivEl) { motivEl.innerText = lastMotivation || ''; }
    renderRestDurOnScreen();
    startRestCountdown();
}

function nextBlock() {
    const t = translations[currentLang];
    const btn = document.getElementById('nextBtn');
    if (btn.disabled) return;
    btn.disabled = true;
    setTimeout(() => { const b = document.getElementById('nextBtn'); if (b) b.disabled = false; }, 350);

    if (btn.innerText === t.check) {
        const revealStep = learningQueue[currentStepIndex];
        if (revealStep && revealStep.type !== 'bigReview') {
            document.getElementById('textDisplay').innerText = blocks[revealStep.index];
        }
        btn.innerText = t.next;
        return;
    }

    const currentStep = learningQueue[currentStepIndex];
    if (currentStep && currentStep.type === 'new' && btn.innerText === t.done) {
        newBlocksShownInSession++;
    }

    currentStepIndex++;
    saveState();

    if (window._sessionBlockLimit !== Infinity &&
        newBlocksShownInSession >= window._sessionBlockLimit &&
        currentStepIndex < learningQueue.length) {
        showSessionPause();
        return;
    }

    showStep();
}

function resumeLearning() {
    const btn = document.getElementById('resumeBtn');
    if (btn) {
        if (btn.disabled) return;
        btn.disabled = true;
        setTimeout(() => { const b = document.getElementById('resumeBtn'); if (b) b.disabled = false; }, 350);
    }
    currentStepIndex++;
    showStep();
}

function selectMethod(m, el) {
    currentMethod = m;
    window.speechSynthesis.cancel();
    document.querySelectorAll('.btn-small').forEach(b => b.classList.remove('active-method'));
    if (el) el.classList.add('active-method');

    if (m === 'mind') showMindInstruction();
    else if (m === 'write') showWritingInput();
    else if (m === 'audio') showAudioMethod();
}


// ----- [L3 mind/write methods, compare, final/pause/session-end]  (was app.js lines 2933-3267) -----
function showMindInstruction() {
    const t = translations[currentLang];
    document.getElementById('textDisplay').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('writingArea').style.display = 'none';
    document.getElementById('writingResult').style.display = 'none';
    document.getElementById('mindCardTitle').innerText = t.mind_title;
    document.getElementById('mindCardBody').innerText = t.mind_body;
    document.getElementById('mindReadyBtn').innerText = t.mind_ready;

    // M-03/M-04: progressive recall hint — reset per exercise
    mindHintLevel = 0;
    const hintBtn = document.getElementById('mindHintBtn');
    const hintDisplay = document.getElementById('mindHintDisplay');
    if (hintBtn) { hintBtn.innerText = '💡 ' + (t.mind_hint_btn || 'Підказка'); hintBtn.disabled = false; hintBtn.style.opacity = '1'; }
    if (hintDisplay) { hintDisplay.style.display = 'none'; hintDisplay.innerText = ''; }

    document.getElementById('mindCard').style.display = 'block';
}

// M-03 (перше слово кожного рядка) + M-04 (перші 2-3 слова) як два рівні
// однієї підказки: level 1 — по одному слову з кожного рядка блоку,
// level 2 — по 2-3 слова з кожного рядка. Для одно-рядкових блоків (звичайний
// review) різниця між M-03/M-04 зникає природно — лишається лише "фраза".
let mindHintLevel = 0;
function showMindHint() {
    if (mindHintLevel >= 2) return;
    mindHintLevel++;
    const t = translations[currentLang];
    const step = learningQueue[currentStepIndex];
    if (!step) return;
    const blockText = step.type === 'bigReview'
        ? blocks.slice(0, step.upToIndex + 1).join('\n')
        : blocks[step.index];

    // Level 1 starts at 2 words/line, not 1 — the review teaser (showStep())
    // already reveals the first word before the method is even chosen, so a
    // 1-word hint would repeat information the user already has instead of
    // advancing it.
    const wordsPerLine = mindHintLevel === 1 ? 2 : 3;
    const hintLines = blockText.split('\n').filter(Boolean).map(line => {
        const words = line.trim().split(/\s+/).filter(Boolean);
        const shown = words.slice(0, Math.min(wordsPerLine, words.length));
        return shown.join(' ') + (shown.length < words.length ? ' …' : '');
    });

    const hintDisplay = document.getElementById('mindHintDisplay');
    hintDisplay.innerText = hintLines.join('\n');
    hintDisplay.style.display = 'block';

    const hintBtn = document.getElementById('mindHintBtn');
    if (mindHintLevel >= 2) {
        hintBtn.disabled = true;
        hintBtn.style.opacity = '0.4';
    } else {
        hintBtn.innerText = '💡 ' + (t.mind_hint_more_btn || 'Ще підказка');
    }
}

function onMindReady() {
    const t = translations[currentLang];
    showMotivToast(getMotivation(currentLang, 'mind'));
    document.getElementById('mindCard').style.display = 'none';
    const step = learningQueue[currentStepIndex];
    const display = document.getElementById('textDisplay');
    const blockText = step.type === 'bigReview'
        ? blocks.slice(0, step.upToIndex + 1).join('\n')
        : blocks[step.index];
    display.innerText = blockText;
    if (step.type === 'bigReview') {
        display.style.whiteSpace = 'pre-line';
    } else {
        display.style.whiteSpace = '';
    }
    display.style.display = 'flex';
    const btn = document.getElementById('nextBtn');
    btn.innerText = t.next;
    btn.style.display = 'block';
}

function showWritingInput() {
    const t = translations[currentLang];
    document.getElementById('textDisplay').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('mindCard').style.display = 'none';
    document.getElementById('writingResult').style.display = 'none';

    const textarea = document.getElementById('writingInput');
    textarea.value = '';
    textarea.placeholder = t.write_placeholder;
    const checkBtn = document.getElementById('writeCheckBtn');
    checkBtn.innerText = t.write_check_btn;
    checkBtn.disabled = true;

    // Reset hint state
    hintUsed = false;
    const hintBtn = document.getElementById('hintBtn');
    const hintDisplay = document.getElementById('hintDisplay');
    hintBtn.innerText = '💡 ' + (t.write_hint_btn || 'Hint');
    hintBtn.disabled = false;
    hintBtn.style.opacity = '1';
    hintDisplay.style.display = 'none';
    hintDisplay.querySelector('.hint-word').innerText = '';

    textarea.oninput = function() {
        const hasText = textarea.value.length > 0;
        checkBtn.disabled = !hasText;
    };

    document.getElementById('writingArea').style.display = 'block';
}

function checkWriting() {
    const cwStep = learningQueue[currentStepIndex];
    const original = cwStep.type === 'bigReview'
        ? (window._bigReviewText || blocks.slice(0, cwStep.upToIndex + 1).join(' '))
        : blocks[cwStep.index];
    const written = document.getElementById('writingInput').value;
    const result = compareTexts(original, written, accuracyLevel);
    showWritingResult(original, written, result);
}

function showHint() {
    if (hintUsed) return;
    const t = translations[currentLang];
    const hintStep = learningQueue[currentStepIndex];
    const original = hintStep.type === 'bigReview'
        ? (window._bigReviewText || blocks.slice(0, hintStep.upToIndex + 1).join(' '))
        : blocks[hintStep.index];
    const written = document.getElementById('writingInput').value;

    const origWords = normalizeText(original).split(' ').filter(Boolean);
    const writWords = normalizeText(written).split(' ').filter(Boolean);

    // Find the first word that is wrong or missing
    let hintIdx = -1;
    for (let i = 0; i < origWords.length; i++) {
        const dist = levenshtein(origWords[i], writWords[i] || '');
        if (dist > 0) { hintIdx = i; break; }
    }
    if (hintIdx === -1 && writWords.length < origWords.length) hintIdx = writWords.length;

    if (hintIdx === -1) return; // already complete

    // The review teaser (showStep()) already reveals word 0 before the method
    // is even chosen, so if nothing typed/correct yet, a hint that only repeats
    // word 0 gives no new information — reveal it together with word 1 instead.
    let hintWord = origWords[hintIdx];
    if (hintStep.type !== 'bigReview' && hintIdx === 0 && origWords[1]) {
        hintWord = origWords[0] + ' ' + origWords[1];
    }

    // Show hint word
    const hintDisplay = document.getElementById('hintDisplay');
    hintDisplay.querySelector('.hint-label').innerText = t.write_hint_label || 'Next word:';
    hintDisplay.querySelector('.hint-word').innerText = hintWord;
    hintDisplay.style.display = 'flex';

    // Disable button — one hint only
    hintUsed = true;
    const hintBtn = document.getElementById('hintBtn');
    hintBtn.disabled = true;
    hintBtn.style.opacity = '0.4';
}

function normalizeText(text) {
    return text.toLowerCase().replace(/[.,!?;:"'()\-—«»]/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m + 1}, (_, i) =>
        Array.from({length: n + 1}, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
}

function compareTexts(original, written, level) {
    const origWords = normalizeText(original).split(' ').filter(w => w.length > 0);
    const writWords = normalizeText(written).split(' ').filter(w => w.length > 0);

    if (level === 'verbatim') {
        const wordResults = origWords.map((word, i) => {
            const writtenWord = writWords[i] || '';
            const dist = levenshtein(word, writtenWord);
            if (dist === 0) return { word, status: 'correct' };
            if (dist <= 1) return { word, status: 'close' };
            return { word, writtenWord, status: 'wrong' };
        });
        const correct = wordResults.filter(r => r.status === 'correct').length;
        const close = wordResults.filter(r => r.status === 'close').length;
        const score = (correct + close * 0.5) / origWords.length;
        return { wordResults, score, passed: score >= 0.95 };
    }

    if (level === 'close') {
        const keyWords = origWords.filter(w => w.length >= 4);
        const wordResults = origWords.map(word => {
            if (word.length < 4) return { word, status: 'neutral' };
            const found = writWords.some(w => levenshtein(word, w) <= 1);
            return { word, status: found ? 'correct' : 'wrong' };
        });
        const found = keyWords.filter(kw => writWords.some(w => levenshtein(kw, w) <= 1)).length;
        const score = keyWords.length > 0 ? found / keyWords.length : 1;
        return { wordResults, score, passed: score >= 0.75 };
    }

    if (level === 'free') {
        function stem(w) { return w.replace(/(ing|ed|tion|s)$/, ''); }
        const keyWords = origWords.filter(w => w.length >= 4);
        const wordResults = origWords.map(word => {
            if (word.length < 4) return { word, status: 'neutral' };
            const found = writWords.some(w => stem(w) === stem(word) || levenshtein(word, w) <= 2);
            return { word, status: found ? 'correct' : 'wrong' };
        });
        const found = keyWords.filter(kw => writWords.some(w => stem(w) === stem(kw) || levenshtein(kw, w) <= 2)).length;
        const score = keyWords.length > 0 ? found / keyWords.length : 1;
        return { wordResults, score, passed: score >= 0.50 };
    }
}

function showWritingResult(original, written, result) {
    const t = translations[currentLang];
    document.getElementById('writingArea').style.display = 'none';
    document.getElementById('writeThinkIcon').style.display = result.passed ? 'none' : 'flex';

    const correctCount = result.wordResults.filter(r => r.status === 'correct' || r.status === 'close').length;
    const totalCount = result.wordResults.filter(r => r.status !== 'neutral').length;
    const pct = Math.round(result.score * 100);
    document.getElementById('writeScoreLine').innerText = `${t.write_score}: ${pct}% (${correctCount} / ${totalCount})`;

    document.getElementById('writeHighlight').innerHTML = result.wordResults.map(r => {
        const cls = { correct: 'wr-correct', close: 'wr-close', wrong: 'wr-wrong' }[r.status] || '';
        return cls
            ? `<span class="${cls}">${escHtml(r.word)} </span>`
            : `<span>${escHtml(r.word)} </span>`;
    }).join('');

    // Motivation
    const motivCategory = result.score >= 0.95 ? 'perfect'
                        : result.score >= 0.75 ? 'great'
                        : result.score >= 0.5  ? 'ok'
                        : 'struggle';
    const motivText = getMotivation(currentLang, motivCategory);
    lastMotivation = motivText;
    const motivEl = document.getElementById('writeMotivation');
    if (motivEl) { motivEl.innerText = motivText; motivEl.style.display = motivText ? 'block' : 'none'; }

    // Update mastery
    const stepRef = learningQueue[currentStepIndex];
    if (stepRef && stepRef.index !== undefined) {
        updateBlockMastery(stepRef.index, result.passed);
    }

    document.getElementById('writeNextBtn').innerText = t.write_next;
    document.getElementById('writingResult').style.display = 'block';
}

function writingNext() {
    document.getElementById('writingResult').style.display = 'none';
    resetLearningExtras();
    currentStepIndex++;
    showStep();
}

function showSessionPause() {
    const t = translations[currentLang];
    ['learningScreen', 'restScreen'].forEach(id => document.getElementById(id).style.display = 'none');
    const el = document.getElementById('sessionPauseScreen');
    document.getElementById('pauseTitle').innerText = t.session_pause_title;
    document.getElementById('pauseBody').innerText = t.session_pause_body
        .replace('{n}', newBlocksShownInSession)
        .replace('{total}', blocks.length);
    document.getElementById('pauseContinueBtn').innerText = t.session_pause_continue;
    document.getElementById('pauseFinishBtn').innerText = t.session_pause_finish;
    el.style.display = 'flex';
}

function pauseContinue() {
    document.getElementById('sessionPauseScreen').style.display = 'none';
    window._sessionBlockLimit = Infinity;
    showStep();
}

function pauseFinish() {
    document.getElementById('sessionPauseScreen').style.display = 'none';
    // Ensure streak counts even if time limit hit before any new blocks were tracked
    if (newBlocksShownInSession <= 0) newBlocksShownInSession = 1;
    showFinal();
}

function showFinal() {
    const t = translations[currentLang];
    const elapsed = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' + secs : secs}`;

    updateStats(newBlocksShownInSession, elapsed / 60);

    ['learningScreen', 'restScreen'].forEach(id => document.getElementById(id).style.display = 'none');
    const el = document.getElementById('finalScreen');
    document.getElementById('finalIcon').innerHTML = '<img src="mascot/heart.png" alt="" class="final-icon-img">';
    const allDone = currentStepIndex >= learningQueue.length;
    if (allDone) {
        clearState();
        addToLearned(currentRawText || document.getElementById('userText').value.trim(), blocks.length);
    }
    document.getElementById('finalTitle').innerText = allDone ? t.finish_all_title : t.finish_title;
    document.getElementById('finalBlocks').innerText = `${blocks.length} ${t.finish_blocks}`;
    document.getElementById('finalTime').innerText = `${t.finish_time}: ${timeStr}`;
    document.getElementById('finalRestartBtn').innerText = t.finish_restart;
    document.getElementById('finalHomeBtn').innerText = t.finish_home;
    // Share button — only on full completion
    const shareBtn = document.getElementById('finalShareBtn');
    if (shareBtn) {
        shareBtn.innerText = t.share_btn || '🔗 Share';
        shareBtn.style.display = allDone ? 'flex' : 'none';
        if (allDone) {
            const rawText = currentRawText || document.getElementById('userText').value.trim();
            lastShareData = { blockCount: blocks.length, timeStr, textSnippet: rawText.replace(/\n/g,' ').slice(0, 60), lang: currentLang };
        }
    }
    const np = document.getElementById('notifPrompt');
    if (np) np.style.display = 'none';
    el.style.display = 'flex';
    showReminderPrompt();
}

function restartLearning() {
    document.getElementById('finalScreen').style.display = 'none';
    currentStepIndex = 0;
    newBlocksShownInSession = 0;
    window._sessionBlockLimit = calcBlockLimit(sessionTimeLimit);
    generateQueue();
    sessionStartTime = Date.now();
    showStep();
}

function goHome() {
    showInputScreen();
}

