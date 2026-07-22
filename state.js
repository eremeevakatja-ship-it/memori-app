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

// Word Training State
let wtSet = null;
let wtQueue = [];
let wtIndex = 0;
let wtCorrect = 0;
let wtCurrentAudioPair = null;
let wtAudioRate = 1.0;
// Пари, чий masteryScore вже підбито (комітнуто в localStorage) цієї сесії —
// щоб updateWordMastery(), яка тепер викликається інкрементально після
// кожної вправи (а не лише в кінці), не рахувала той самий "чистий прохід" двічі.
let wtSettledPairs = new Set();

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
        if (Date.now() - s.savedAt > 14 * 24 * 60 * 60 * 1000) { localStorage.removeItem(STATE_KEY); return null; }
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

function saveToLibrary() {
    const text = document.getElementById('userText').value.trim();
    const t = translations[currentLang];
    const btn = document.getElementById('saveToPlannedBtn');
    if (!btn || text.length < 10) return;

    const lib = loadLibrary();
    if (lib.find(e => e.text === text)) {
        btn.title = t.library_duplicate;
        btn.style.color = 'var(--primary)';
        setTimeout(() => { btn.style.color = ''; btn.title = t.library_save; }, 1800);
        return;
    }
    lib.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), title: text.replace(/\n/g, ' ').slice(0, 70), text, savedAt: Date.now() });
    if (lib.length > MAX_LIBRARY) lib.pop();
    saveLibrary(lib);
    // Очистити textarea одразу після збереження — інакше наступний вставлений
    // текст лишається змішаним зі старим (курсор/значення нікуди не ділись).
    document.getElementById('userText').value = '';
    clearValidation();
    // Visual feedback — bookmark fills green briefly
    btn.style.color = 'var(--primary)';
    btn.querySelector('svg').setAttribute('fill', 'currentColor');
    setTimeout(() => {
        btn.style.color = '';
        btn.querySelector('svg').setAttribute('fill', 'none');
        btn.title = t.library_save;
    }, 1800);
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
        completedAt: Date.now()
    });
    if (arr.length > 50) arr.pop();
    saveLearned(arr);
    // Promote from library → learned (remove if same text)
    const lib = loadLibrary().filter(e => e.text !== text);
    saveLibrary(lib);
    updateLibraryCount();
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

function renderStats() {
    const s = loadStats();
    const t = translations[currentLang];
    const bar = document.getElementById('statsBar');
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
        reg.showNotification('Memori 🌿', { body, icon: './mascot/cat-face.png', badge: './icon.svg' });
    } catch {
        try { new Notification('Memori 🌿', { body, icon: './mascot/cat-face.png' }); } catch {}
    }
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
            savedAt: Date.now()
        }));
    } catch {}
}

function loadWtProgress() {
    try {
        const s = JSON.parse(localStorage.getItem(WT_PROGRESS_KEY));
        if (!s || !Array.isArray(s.wtQueue) || !s.wtQueue.length) return null;
        if (Date.now() - s.savedAt > 7 * 24 * 60 * 60 * 1000) { localStorage.removeItem(WT_PROGRESS_KEY); return null; }
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

