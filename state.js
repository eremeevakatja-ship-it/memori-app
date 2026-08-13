// ===== state.js =====
// Persisted app state: settings, library, user profile identity, mastery tracking,
// stats/streak, notifications, Text Mode session save/resume, Words Mode sets +
// in-progress-training persistence, and the shared escHtml() utility.
// Plain classic script (no `type="module"`) — every top-level `function`/`let`/`const`
// here lives in the shared global scope, exactly like the original monolithic app.js,
// so every inline onclick="..." handler in index.html keeps working unchanged.
// Split out of app.js (BACKLOG Q-01). Must load FIRST: it declares the global state
// variables every other file reads/writes, and runs two immediately-invoked theme/
// settings-restore blocks that must execute before first paint.

// ----- [S1 globals+theme/settings restore IIFEs]  (was app.js lines 1-53) -----
let currentLang = 'uk', currentTheme = 'light';
let ttsSpeed = 1.0, restDuration = 10, fontSizeIndex = 1;
let blockSize = 10; // слів на блок (дефолт)
let currentRawText = '', currentProfileTab = 'progress', lastShareData = null;
let lastMotivation = '';
let blockMastery = {}; // {blockIndex: {recent: [true, false, true]}}  ← last 3 results

// Restore theme preference immediately (before first paint flicker)
(function() {
    try {
        const saved = localStorage.getItem('memori_theme');
        if (saved === 'dark' || saved === 'light') {
            currentTheme = saved;
            document.body.dataset.theme = saved;
        }
    } catch {}
})();
// Restore audio/rest settings
(function() {
    try {
        const s = JSON.parse(localStorage.getItem('memori_settings') || '{}');
        if (s.ttsSpeed)          ttsSpeed     = s.ttsSpeed;
        if (s.restDuration)      restDuration = s.restDuration;
        if (s.blockSize)         blockSize    = s.blockSize;
        if (s.fontSizeIndex !== undefined) fontSizeIndex = s.fontSizeIndex;
    } catch {}
})();
const FONT_SIZES = [1.0, 1.25, 1.55, 1.85];

// Text Mode: метод "Аудіо" на кнопці вибору методу (m-audio, index.html) —
// СКОРИГОВАНО 2026-08-05 (D-008 addendum): раніше тут стояв прапорець
// TEXT_AUDIO_METHOD_ENABLED=false, який ховав УСЮ кнопку методу. User уточнила:
// прибрати вона хотіла лише TTS-прослуховування блоку вголос (speakCurrentBlock,
// audio.js) — запис власного голосу (ASR, startVoiceRecord(), безкоштовний
// SpeechRecognition, працює однаково для будь-якої мови) вона хоче лишити
// доступним. Тепер метод "Аудіо" = лише запис/подумки, без TTS-кроку, тож ховати
// всю кнопку прапорцем більше немає сенсу — showStep()/bigReviewReadDone()
// (learning.js) показують m-audio завжди, як m-mind/m-write.
// Функції speakCurrentBlock/speakAgain/renderAudioSpeedRow (audio.js, state.js)
// НЕ видалені — просто більше не викликаються з цього флоу. Лишені на випадок
// платного TTS у майбутньому — див. D-006/TTS-01.

let blocks = [], currentStepIndex = 0, learningQueue = [];
let sessionStartTime = null;
let accuracyLevel = 'verbatim';
let currentMethod = null;
let hintUsed = false;
let sessionTimeLimit = Infinity;
let newBlocksShownInSession = 0;

// Words Mode State
let wordLangFrom = 'en';
let wordLangTo = 'uk';
let wordLevel = 1;
let wordPairs = []; // [{word, translation}]
// FB-35 (2026-08-11): не null, коли wordVerifyScreen/wordTopicScreen відкриті
// для РЕДАГУВАННЯ вже збереженого набору (editWordSet, words.js), а не для
// створення нового — saveWordSetAndStart() перевіряє це, щоб оновити існуючий
// набір замість створення нового. Скидається на початку звичайного флоу
// створення (showWordLangScreen/showWordInputScreen), щоб не "протекти" в
// наступну сесію створення набору, якщо User вийшла з редагування напівдорозі.
let editingSetId = null;

// Word Training State
let wtSet = null;
let wtQueue = [];
let wtIndex = 0;
let wtCorrect = 0;
let wtCurrentAudioPair = null;
let wtAudioRate = 1.0;
// Куди веде "←" з 1-ї вправи раунду (немає попередньої вправи, щоб гортати) —
// функція показу екрану, з якого стартувало це тренування; null → профіль.
let wtReturnScreen = null;
// Пари, чий masteryScore вже підбито (комітнуто в localStorage) цієї сесії —
// щоб updateWordMastery(), яка тепер викликається інкрементально після
// кожної вправи (а не лише в кінці), не рахувала той самий "чистий прохід" двічі.
let wtSettledPairs = new Set();
// Мітка старту поточної сесії Words Mode тренування (Date.now()) — потрібна,
// щоб showWordResults() (words.js) могла порахувати реальний час сесії й
// передати його в updateStats() (FB-08). Виставляється в 3 точках входу:
// startWordTraining() (свіжий старт), applyWtSavedProgress() (продовження
// збереженого прогресу — і явне, і тихе boot-resume). Скидається щоразу,
// щоб час "заморожений" закритою вкладкою між сесіями не потрапляв у
// підрахунок.
let wtSessionStartTime = null;

// ----- [S3 updateBlockMastery/getBlockStatus]  (was app.js lines 1038-1053) -----
function updateBlockMastery(blockIndex, passed) {
    if (blockMastery[blockIndex] === undefined) blockMastery[blockIndex] = { recent: [] };
    const m = blockMastery[blockIndex];
    m.recent.push(passed);
    if (m.recent.length > 3) m.recent.shift();
}

function getBlockStatus(blockIndex) {
    const m = blockMastery[blockIndex];
    if (!m || m.recent.length < 2) return 'neutral';
    const last2 = m.recent.slice(-2);
    if (last2.every(r => r === true))  return 'mastered';
    if (last2.every(r => r === false)) return 'struggling';
    return 'neutral';
}


// ----- [S4 STATE_KEY session save/resume]  (was app.js lines 1056-1135) -----
const STATE_KEY = 'memori_v1';

function saveState() {
    if (!blocks.length) return;
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify({
            lang: currentLang, theme: currentTheme,
            rawText: document.getElementById('userText').value,
            blocks, queue: learningQueue,
            stepIndex: currentStepIndex,
            newBlocksShown: newBlocksShownInSession,
            accuracyLevel, sessionTimeLimit,
            ttsSpeed, restDuration, fontSizeIndex,
            blockMastery,
            savedAt: Date.now()
        }));
    } catch {}
}

function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem(STATE_KEY));
        if (!s || !s.blocks || !s.blocks.length) return null;
        if (Date.now() - s.savedAt > 24 * 60 * 60 * 1000) { localStorage.removeItem(STATE_KEY); return null; }
        return s;
    } catch { return null; }
}

function clearState() { localStorage.removeItem(STATE_KEY); }

function checkSavedState() {
    const s = loadState();
    const banner = document.getElementById('resumeBanner');
    if (!s) { banner.style.display = 'none'; return; }
    const t = translations[currentLang];
    // Перші 40 символів тексту як "назва"
    const snippet = (s.rawText || '').replace(/\n/g, ' ').trim().slice(0, 40);
    const titlePart = snippet ? `"${snippet}${snippet.length >= 40 ? '…' : ''}"` : t.resume_title;
    const progressPart = t.resume_progress
        .replace('{n}', s.newBlocksShown || 0)
        .replace('{total}', s.blocks.length);
    document.getElementById('resumeBannerText').innerText = `${titlePart} · ${progressPart}`;
    document.getElementById('resumeSessionBtn').innerText = t.resume_continue;
    document.getElementById('clearSessionBtn').innerText = t.resume_fresh;
    banner.style.display = 'flex';
}

function resumeSession() {
    const s = loadState();
    if (!s) return;
    currentLang = s.lang;
    currentTheme = s.theme;
    blocks = s.blocks;
    learningQueue = s.queue;
    currentStepIndex = s.stepIndex;
    newBlocksShownInSession = s.newBlocksShown;
    accuracyLevel = s.accuracyLevel;
    sessionTimeLimit = s.sessionTimeLimit;
    if (s.ttsSpeed) ttsSpeed = s.ttsSpeed;
    if (s.restDuration) restDuration = s.restDuration;
    if (s.fontSizeIndex !== undefined) {
        fontSizeIndex = s.fontSizeIndex;
        applyFontSize();
    }
    if (s.blockMastery) blockMastery = s.blockMastery;
    document.body.dataset.theme = currentTheme;
    document.getElementById('userText').value = s.rawText;
    const banner = document.getElementById('resumeBanner');
    if (banner) banner.style.display = 'none';
    showScreen('learningScreen');
    window._sessionBlockLimit = calcBlockLimit(sessionTimeLimit);
    sessionStartTime = Date.now();
    showStep();
}

function clearSession() {
    clearState();
    document.getElementById('resumeBanner').style.display = 'none';
}


// ----- [S5 LIBRARY + APP SETTINGS + saveToLibrary + LEARNED TEXTS]  (was app.js lines 1136-1233) -----
// ===== LIBRARY =====
const LIBRARY_KEY = 'memori_library';
const MAX_LIBRARY = 20;

function loadLibrary() {
    try { return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || []; } catch { return []; }
}
function saveLibrary(lib) {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); } catch {}
}
function updateLibraryCount() { /* library toggle panel removed — no-op */ }

// ===== APP SETTINGS (audio speed, rest duration) =====
const SETTINGS_KEY = 'memori_settings';
function saveAppSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ttsSpeed, restDuration, blockSize, fontSizeIndex })); } catch {}
}
function setTtsSpeed(val) {
    ttsSpeed = val;
    saveAppSettings();
    document.querySelectorAll('.speed-chip').forEach((c, i) =>
        c.classList.toggle('active', [0.5, 0.75, 1.0, 1.25][i] === val));
}
function setRestDuration(val) {
    restDuration = val;
    saveAppSettings();
    document.querySelectorAll('#restDurInline .time-card').forEach((c, i) =>
        c.classList.toggle('active', [5, 10, 20, 30][i] === val));
}
function renderAudioSpeedRow() {
    const row = document.getElementById('audioSpeedRow');
    if (!row) return;
    const vals = [0.5, 0.75, 1.0, 1.25];
    row.innerHTML = vals.map(v =>
        `<button class="speed-chip${v === ttsSpeed ? ' active' : ''}" onclick="setTtsSpeed(${v})">${v === 1.0 ? '1×' : v + '×'}</button>`
    ).join('');
}

// FB-38 (2026-08-11, User): "фільтр типу все... і по мовах обирають" — той самий
// прапор-чіп патерн у всіх 4 списках (Плани/Вивчено — Text; За наборами/Словник —
// Words). 🌐 = "Всі" (без перекладу — як і прапори, самопояснювальний символ,
// той самий принцип, що вже є в #ocrLang/langScreen). Показуються лише прапори
// мов, що РЕАЛЬНО зустрічаються серед поточних записів (availableCodes) — не всі
// 6 завжди, щоб не засмічувати рядок чіпами без жодного запису під ними.
const LANG_FLAGS = { uk: '🇺🇦', en: '🇬🇧', pl: '🇵🇱', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸' };
function renderLangFilterBar(activeCode, availableCodes, onSelectFnName) {
    if (!availableCodes.length) return '';
    const chip = (code, label) => `<button class="lang-filter-chip${activeCode === code ? ' active' : ''}" onclick="${onSelectFnName}(${code === null ? 'null' : `'${code}'`})">${label}</button>`;
    return `<div class="lang-filter-bar">${chip(null, '🌐')}${availableCodes.map(c => chip(c, LANG_FLAGS[c] || '❔')).join('')}</div>`;
}

// FB-38 (2026-08-11, User): мова тексту для фільтра Прогрес/Бібліотека по мовах —
// НЕ евристика/мережевий детект, а той самий прапор (#ocrLang), що User уже й так
// обирає на inputScreen поруч з текстовим полем ("Мова тексту", раніше — лише для
// OCR). За словами User, це і є "прапор якої мови вносять текст" — найнадійніше
// джерело, бо це явний вибір, а не здогад. tessLang (audio.js) мапить app-код
// (uk/en/pl/de/fr/es) → tesseract-код (ukr/eng/...); тут — обернена мапа.
function currentTextLangCode() {
    const sel = document.getElementById('ocrLang');
    const tessCode = sel ? sel.value : null;
    if (!tessCode) return null;
    for (const [appCode, tc] of Object.entries(tessLang)) if (tc === tessCode) return appCode;
    return null;
}

// 2026-08-10: раніше зберігав текст у Бібліотеку лише по кліку на окрему кнопку
// (прибрана — незрозуміла функція для User). Тепер викликається автоматично
// з goToSetup() при переході від вводу тексту до налаштувань — без кнопки,
// без тосту, без очищення textarea (текст ще потрібен на екрані налаштувань).
function saveToLibrary(text) {
    if (!text || text.length < 10) return;
    const lib = loadLibrary();
    if (lib.find(e => e.text === text)) return;
    lib.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), title: text.replace(/\n/g, ' ').slice(0, 70), text, savedAt: Date.now(), lang: currentTextLangCode(), passCount: 0 });
    if (lib.length > MAX_LIBRARY) lib.pop();
    saveLibrary(lib);
}

// FB-41 (2026-08-11, User): "вірш який давно вчила і також не довчила" опинявся
// в Бібліотеці — бо ОДИН природний прохід тексту до кінця (allDone) вважався
// "вивчено", хоча для User "реально вивчила" = "кілька вдалих проходжень"
// (підтверджено прямим запитанням). Раніше showFinal() (learning.js) викликав
// addToLearned() напряму при allDone===true; тепер — через цю функцію, яка
// рахує проходження і архівує в Learned лише після TEXT_MASTERY_THRESHOLD.
// Той самий принцип, що вже є в Words Mode (WT_MASTERY_THRESHOLD=2 чистих
// проходжень слова, words.js) — узгоджено на тому самому числі.
const TEXT_MASTERY_THRESHOLD = 2;
function registerTextPass(text, blockCount) {
    if (!text || text.length < 10) return false;
    const lib = loadLibrary();
    const idx = lib.findIndex(e => e.text === text);
    const passCount = idx >= 0 ? (lib[idx].passCount || 0) + 1 : 1;
    if (idx >= 0) {
        lib[idx].passCount = passCount;
        lib[idx].lastPracticedAt = Date.now();
    }
    if (passCount >= TEXT_MASTERY_THRESHOLD) {
        addToLearned(text, blockCount); // сам прибирає запис з Плани, якщо він там є
        return true;
    }
    saveLibrary(lib);
    return false;
}

// ===== LEARNED TEXTS =====
const LEARNED_KEY = 'memori_learned';

function loadLearned() {
    try { return JSON.parse(localStorage.getItem(LEARNED_KEY)) || []; } catch { return []; }
}
function saveLearned(arr) {
    try { localStorage.setItem(LEARNED_KEY, JSON.stringify(arr)); } catch {}
}
function addToLearned(text, blockCount) {
    if (!text || text.length < 10) return;
    const arr = loadLearned();
    // Remove duplicate if already exists
    const idx = arr.findIndex(e => e.text === text);
    if (idx >= 0) arr.splice(idx, 1);
    arr.unshift({
        id: Date.now(),
        title: text.replace(/\n/g, ' ').slice(0, 70),
        text, blockCount,
        completedAt: Date.now(),
        // FB-22 (2026-08-08): авто-визначення за римою (detectHasRhyme, app.js) —
        // 2 категорії: 'poem_song' (римований текст) чи 'text_speech' (звичайний).
        // Груба евристика (збіг закінчень рядків, не фонетичний аналіз) — можна
        // виправити вручну в "Вивчено" (changeLearnedCategory), якщо помилилась.
        category: detectHasRhyme(text) ? 'poem_song' : 'text_speech',
        // FB-38: той самий прапор мови тексту, що й у saveToLibrary() вище —
        // якщо запис уже існував у "Плани" з lang, тут перечитується заново з
        // #ocrLang (той самий DOM-стан протягом усього проходження тексту),
        // не переноситься зі старого library-запису, щоб не дублювати джерело правди.
        lang: currentTextLangCode()
    });
    if (arr.length > 50) arr.pop();
    saveLearned(arr);
    // Promote from library → learned (remove if same text)
    const lib = loadLibrary().filter(e => e.text !== text);
    saveLibrary(lib);
    updateLibraryCount();
}

// FB-41 (2026-08-11, User): записи, що потрапили в "Вивчено" ДО впровадження
// TEXT_MASTERY_THRESHOLD (за старим правилом "1 прохід=вивчено") — не
// перераховуються заднім числом (неможливо надійно визначити, скільки
// проходжень насправді було). User сама повертає такий запис у Прогрес —
// ручне коригування, той самий принцип, що й changeLearnedCategory (app.js).
function demoteLearnedEntry(id) {
    const arr = loadLearned();
    const entry = arr.find(e => String(e.id) === String(id));
    if (!entry) return;
    saveLearned(arr.filter(e => String(e.id) !== String(id)));
    const lib = loadLibrary();
    if (!lib.find(e => e.text === entry.text)) {
        lib.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), title: entry.title, text: entry.text, savedAt: Date.now(), lang: entry.lang, passCount: TEXT_MASTERY_THRESHOLD - 1 });
        saveLibrary(lib);
    }
}

// ===== USER PROFILE (avatar + name) =====

// ----- [S6 USER PROFILE identity]  (was app.js lines 1234-1361) -----
const PROFILE_KEY = 'memori_profile';

function loadProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; }
}
function saveProfile(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}

// FB-44 (2026-08-13): вік рахується від дати народження замість статичного
// числа, щоб лишався актуальним з часом. Повертає null, якщо дата не задана
// або в майбутньому (birthdate-поле має max=сьогодні, але про всяк випадок).
function calcAge(birthdateStr) {
    if (!birthdateStr) return null;
    const birth = new Date(birthdateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    if (birth > today) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function updateProfileNavAvatar() {
    // Клас-селектор замість id — профіль-кнопка тепер живе і на inputScreen, і на wordLangScreen.
    const profile = loadProfile();
    document.querySelectorAll('.profile-nav-avatar').forEach(img => {
        if (profile.avatar) {
            img.src = profile.avatar;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    });
    document.querySelectorAll('.profile-nav-icon-img').forEach(icon => {
        icon.style.display = profile.avatar ? 'none' : 'block';
    });
}

function triggerAvatarUpload() {
    document.getElementById('avatarInput').click();
}

async function handleAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    try {
        const dataUrl = await cropImageToDataURL(file, 200);
        const profile = loadProfile();
        profile.avatar = dataUrl;
        saveProfile(profile);
        renderProfileHero();
        updateProfileNavAvatar();
    } catch(e) {}
    input.value = '';
}

function cropImageToDataURL(file, size) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            // Centre-crop to square
            const min = Math.min(img.width, img.height);
            const sx = (img.width - min) / 2;
            const sy = (img.height - min) / 2;
            ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = reject;
        img.src = url;
    });
}

// Ім'я/фото — єдина спільна ідентичність для обох напрямків (Text/Words),
// тому ці елементи можуть існувати в DOM двічі (по одному на кожен профіль-екран).
// closest('.profile-name-wrap') прив'язує клік до ПРАВИЛЬНОЇ пари display/input,
// а не завжди до першої знайденої.
function startEditName(el) {
    const wrap = el.closest('.profile-name-wrap');
    const input = wrap.querySelector('.profile-name-input');
    const profile = loadProfile();
    input.value = profile.name || '';
    el.style.display = 'none';
    input.style.display = 'block';
    input.focus();
    input.select();
}

function saveProfileName(input) {
    const val = input.value.trim().slice(0, 40);
    const profile = loadProfile();
    profile.name = val;
    saveProfile(profile);
    input.style.display = 'none';
    renderProfileHero();
}

function renderProfileHero() {
    const t = translations[currentLang];
    const profile = loadProfile();

    // Avatar — оновлює ВСІ інстанси (обидва профіль-екрани), де б вони не були
    document.querySelectorAll('.profile-avatar-img').forEach(img => {
        if (profile.avatar) { img.src = profile.avatar; img.style.display = 'block'; }
        else { img.style.display = 'none'; }
    });
    document.querySelectorAll('.profile-avatar-placeholder').forEach(ph => {
        ph.style.display = profile.avatar ? 'none' : 'flex';
    });

    // Ім'я — так само, всі інстанси
    document.querySelectorAll('.profile-name-display').forEach(display => {
        display.style.display = 'block';
        const wrap = display.closest('.profile-name-wrap');
        const input = wrap && wrap.querySelector('.profile-name-input');
        if (input) input.style.display = 'none';
        if (profile.name) {
            display.innerText = profile.name;
            display.classList.remove('profile-name-empty');
        } else {
            display.innerText = t.profile_name_placeholder || "Ваше ім'я";
            display.classList.add('profile-name-empty');
        }
    });

    // Text-mode статистика — лишається тільки в Text-профілі (окремий напрямок = окрема "пам'ять")
    const statsEl = document.getElementById('profileHeroStats');
    if (statsEl) {
        const learned = loadLearned();
        const stats = loadStats();
        const learnedTxt = `${learned.length} ${t.profile_learned || 'вивчено'}`;
        const streakTxt = stats.streak > 0 ? `· 🔥 ${stats.streak} ${t.stat_streak_lbl}` : '';
        statsEl.innerText = learnedTxt + (streakTxt ? ' ' + streakTxt : '');
    }
}


// ----- [S7 STATS]  (was app.js lines 1362-1421) -----
// ===== STATS =====
const STATS_KEY = 'memori_stats';

function loadStats() {
    try {
        return JSON.parse(localStorage.getItem(STATS_KEY)) ||
            { streak: 0, lastDate: null, totalBlocks: 0, totalMinutes: 0 };
    } catch {
        return { streak: 0, lastDate: null, totalBlocks: 0, totalMinutes: 0 };
    }
}

function saveStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {}
}

function updateStats(blocksLearned, minutesSpent) {
    if (blocksLearned <= 0) return;
    const s = loadStats();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.lastDate === today) {
        // Session already counted today — just add to totals
    } else if (s.lastDate === yesterday) {
        s.streak = (s.streak || 0) + 1;
    } else {
        s.streak = 1;
    }
    s.lastDate = today;
    s.totalBlocks = (s.totalBlocks || 0) + blocksLearned;
    s.totalMinutes = (s.totalMinutes || 0) + minutesSpent;
    saveStats(s);
}

// 2026-08-07: #statsBar видалено з UI (User: прибрати статистику зовсім, не
// переносити) — ця функція більше нізвідки не викликається, лишена лише тому,
// що логіка updateStats()/loadStats() і далі пише дані (можливо знадобиться
// пізніше). Null-guard на випадок майбутнього виклику без існуючого #statsBar.
function renderStats() {
    const s = loadStats();
    const t = translations[currentLang];
    const bar = document.getElementById('statsBar');
    if (!bar) return;
    if (!s.lastDate) { bar.style.display = 'none'; return; }

    document.getElementById('statStreakVal').innerText = s.streak;
    document.getElementById('statStreakLbl').innerText = t.stat_streak_lbl || 'days';
    document.getElementById('statBlocksVal').innerText = s.totalBlocks;
    document.getElementById('statBlocksLbl').innerText = t.stat_blocks_lbl || 'blocks';

    const totalMins = Math.round(s.totalMinutes);
    let timeStr;
    if (totalMins >= 60) {
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        timeStr = m > 0 ? `${h}${t.stat_hr} ${m}${t.stat_min}` : `${h}${t.stat_hr}`;
    } else {
        timeStr = `${totalMins}${t.stat_min}`;
    }
    document.getElementById('statTimeVal').innerText = timeStr;
    document.getElementById('statTimeLbl').innerText = t.stat_time_lbl || 'time';
    bar.style.display = 'flex';
}

// ===== NOTIFICATIONS =====

// ----- [S8 NOTIFICATIONS]  (was app.js lines 1422-1484) -----
const NOTIF_KEY = 'memori_notif';

function loadNotifPref() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || null; } catch { return null; }
}
function saveNotifPref(pref) {
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(pref)); } catch {}
}

function showReminderPrompt() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;
    const pref = loadNotifPref();
    if (pref && pref.enabled) return;           // already enabled
    if (pref && pref.enabled === false) return;  // explicitly dismissed
    const t = translations[currentLang];
    const el = document.getElementById('notifPrompt');
    if (!el) return;
    document.getElementById('notifPromptText').innerText = t.notif_prompt || 'Remind me tomorrow?';
    document.getElementById('notifDismissBtn').innerText = t.notif_dismiss || 'No thanks';
    el.style.display = 'block';
}

async function enableReminder(hour) {
    const perm = await Notification.requestPermission();
    const el = document.getElementById('notifPrompt');
    if (perm !== 'granted') {
        if (el) el.style.display = 'none';
        return;
    }
    saveNotifPref({ enabled: true, hour, lastRemindedDate: null });
    if (el) {
        const t = translations[currentLang];
        el.innerHTML = `<p style="font-size:0.85rem;font-weight:700;color:var(--primary);margin:8px 0;">${t.notif_confirm || 'Reminder enabled ✓'}</p>`;
    }
}

function dismissReminderPrompt() {
    saveNotifPref({ enabled: false });
    const el = document.getElementById('notifPrompt');
    if (el) el.style.display = 'none';
}

async function checkPendingReminder() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const pref = loadNotifPref();
    if (!pref || !pref.enabled) return;
    const today = new Date().toISOString().slice(0, 10);
    if (pref.lastRemindedDate === today) return;
    const stats = loadStats();
    if (stats.lastDate === today) return;            // already practiced today
    if (new Date().getHours() < (pref.hour || 20)) return; // not time yet
    pref.lastRemindedDate = today;
    saveNotifPref(pref);
    const body = (translations[currentLang] || translations.en).notif_body || 'Time to practise! 🔥';
    try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification('Memori 🌿', { body, icon: './icon-192.png', badge: './icon-192.png' });
    } catch {
        try { new Notification('Memori 🌿', { body, icon: './icon-192.png' }); } catch {}
    }
}


// FB-47 (2026-08-13): попап "скучили", якщо User не заходила 30+ днів. На
// відміну від checkPendingReminder() — це не push-нотифікація (не потребує
// Notification permission), а звичайний openInfoPopup() (app.js) на старті
// застосунку. INACTIVITY_NOTIFIED_KEY зберігає lastDate, за яким уже
// показали попап — щоб не показувати повторно щодня, поки User не
// попрактикується знову (після чого stats.lastDate зміниться і лічильник
// природно скинеться).
const INACTIVITY_NOTIFIED_KEY = 'memori_inactivity_notified';
function checkInactivityPopup() {
    const stats = loadStats();
    if (!stats.lastDate) return; // ще жодного разу не практикувались — нема з чим порівнювати
    const daysSince = Math.floor((Date.now() - new Date(stats.lastDate).getTime()) / (24 * 60 * 60 * 1000));
    if (daysSince < 30) return;
    let notified = null;
    try { notified = localStorage.getItem(INACTIVITY_NOTIFIED_KEY); } catch {}
    if (notified === stats.lastDate) return;
    try { localStorage.setItem(INACTIVITY_NOTIFIED_KEY, stats.lastDate); } catch {}
    const t = translations[currentLang] || translations.en;
    openInfoPopup(t.inactivity_title || 'А хто тут у нас? 👀', t.inactivity_body || 'Ми так сумували! 🌱');
}

// ----- [S9 Words Mode sets + wt-progress persistence]  (was app.js lines 3625-3664) -----
const WORDS_SETS_KEY = 'memoriWords_sets';
function loadWordSets() {
    try { return JSON.parse(localStorage.getItem(WORDS_SETS_KEY)) || []; } catch { return []; }
}
function saveWordSets(sets) {
    try { localStorage.setItem(WORDS_SETS_KEY, JSON.stringify(sets)); } catch {}
}

// ===== Words Mode: збереження прогресу ПІД ЧАС тренування (не лише в кінці) =====
// На відміну від Text Mode (saveState() пише кожен крок), тренування слів раніше
// було повністю stateless до showWordResults() — закриття вкладки посеред черги
// втрачало все. Зберігаємо чергу+позицію після кожної вправи, і на наступний запуск
// того ж набору пропонуємо продовжити з того ж місця.
const WT_PROGRESS_KEY = 'memoriWords_progress';

function saveWtProgress() {
    if (!wtSet || !wtQueue.length) return;
    try {
        localStorage.setItem(WT_PROGRESS_KEY, JSON.stringify({
            setId: wtSet.id,
            wtQueue, wtIndex, wtCorrect,
            lang: currentLang,
            savedAt: Date.now()
        }));
    } catch {}
}

function loadWtProgress() {
    try {
        const s = JSON.parse(localStorage.getItem(WT_PROGRESS_KEY));
        if (!s || !Array.isArray(s.wtQueue) || !s.wtQueue.length) return null;
        if (Date.now() - s.savedAt > 24 * 60 * 60 * 1000) { localStorage.removeItem(WT_PROGRESS_KEY); return null; }
        if (s.wtIndex >= s.wtQueue.length) return null; // вже було завершено
        return s;
    } catch { return null; }
}

function clearWtProgress() {
    try { localStorage.removeItem(WT_PROGRESS_KEY); } catch {}
}


// ----- [S2 escHtml (shared utility)]  (was app.js lines 3676-3680) -----
function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

