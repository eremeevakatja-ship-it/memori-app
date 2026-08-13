// ===== words.js =====
// Words Mode: language/level/input/verify/topic setup screens, translation fetching
// (Google + MyMemory + auto-detect/smart-direction + alternatives), the word training
// engine (queue building, exercise rendering/checking, fill-in-the-sentence), and the
// Words Mode profile screen.
// Plain classic script — see state.js header for why (no ES modules).
// Split out of app.js (BACKLOG Q-01).

// ----- [W3 WORD_LANGUAGES]  (was app.js lines 3665-3675) -----
// Обмежено мовами, які реально підтримує інтерфейс (переклад UI + TTS + OCR) —
// див. `translations`. Розширювати лише разом з повним перекладом інтерфейсу.
const WORD_LANGUAGES = [
    { code: 'en', flag: 'gb', name: 'English' },
    { code: 'uk', flag: 'ua', name: 'Українська' },
    { code: 'pl', flag: 'pl', name: 'Polski' },
    { code: 'de', flag: 'de', name: 'Deutsch' },
    { code: 'fr', flag: 'fr', name: 'Français' },
    { code: 'es', flag: 'es', name: 'Español' },
];

// Мови з підтвердженою якісною озвучкою на реальному пристрої (2026-08-05);
// uk/pl/fr — браузер на тестовому телефоні User взагалі не має голосу
// (пропонує "додати голос" — системне обмеження пристрою, не баг коду);
// es — ще не перевірено, СВІДОМО не додано сюди й не заблоковано нижче,
// лишається доступним як і було (гейтиться лише наявністю speechSynthesis).
// Використовується в buildWtQueue() нижче, щоб archived-мови (uk/pl/fr) не
// потрапляли в пул audio/dictation вправ Words Mode. Нічого не видалено —
// лише звужено видимість, до платного TTS. Див. DECISIONS.md D-006, BACKLOG.md TTS-01.
const TTS_VERIFIED_LANGS = ['en', 'de'];


// ----- [W4 Words Mode screens flow + translation fetching]  (was app.js lines 3681-4256) -----
function showWordLangScreen() {
    editingSetId = null; // FB-35: звичайний старт створення набору — не редагування
    const t = translations[currentLang];
    showScreen('wordLangScreen');
    updateProfileNavAvatar();
    applyFontSize(); // fontSizeIndex — той самий, спільний для профілю, застосувати одразу і в Words Mode
    setBottomNav('words', 'learn');
    document.getElementById('wlBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('wlHomeBtn').title = document.getElementById('wlHomeBtn').ariaLabel = t.finish_home || 'На головну';
    document.getElementById('wlTitleEl').innerText = t.wl_title || 'Мовна пара';
    const wlSubEl = document.getElementById('wlSubtitleEl');
    if (wlSubEl) wlSubEl.innerText = t.wl_subtitle || '';
    document.getElementById('wlLearningLabel').innerText = t.wl_learning || 'Яку мову вчимо?';
    document.getElementById('wlNativeLabel').innerText = t.wl_native || 'Моя рідна мова';
    document.getElementById('wlNextBtn').innerText = t.wl_next || 'Далі →';
    document.getElementById('wlSameError').style.display = 'none';
    renderWordLangSelects();
}

function renderWordLangSelects() {
    const opts = WORD_LANGUAGES.map(l =>
        `<option value="${l.code}">${l.name}</option>`
    ).join('');
    const fromSel = document.getElementById('wordLangFromSelect');
    const toSel = document.getElementById('wordLangToSelect');
    fromSel.innerHTML = opts;
    toSel.innerHTML = opts;
    fromSel.value = wordLangFrom;
    toSel.value = wordLangTo;
}

function goWordLangNext() {
    const t = translations[currentLang];
    wordLangFrom = document.getElementById('wordLangFromSelect').value;
    wordLangTo = document.getElementById('wordLangToSelect').value;
    if (wordLangFrom === wordLangTo) {
        const errEl = document.getElementById('wlSameError');
        errEl.innerText = t.wl_same_error || 'Оберіть різні мови';
        errEl.style.display = 'block';
        return;
    }
    document.getElementById('wlSameError').style.display = 'none';
    showWordInputScreen();
}

function showWordInputScreen() {
    const t = translations[currentLang];
    showScreen('wordInputScreen');
    document.getElementById('wiBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('wiHomeBtn').title = document.getElementById('wiHomeBtn').ariaLabel = t.finish_home || 'На головну';
    document.getElementById('wiTitleEl').innerText = t.wi_title || 'Додайте слова';
    document.getElementById('wiHintText').innerText = t.wi_hint || 'Кожне слово з нового рядка';
    document.getElementById('wiNextBtn').innerText = t.wl_next || 'Далі →';
    document.getElementById('wordInputTextarea').placeholder = t.wi_placeholder || 'dog — собака\ncat — кішка';
    document.getElementById('wordInputTextarea').value = '';
    document.getElementById('wiValidation').style.display = 'none';
    wordPairs = []; // reset so no stale pairs from previous session
}

function clearWordValidation() {
    document.getElementById('wiValidation').style.display = 'none';
}

function findWordBoundary(str) {
    const isCyr = c => /[а-яА-ЯіІїЇєЄ'ʼ]/.test(c);
    const isLat = c => /[a-zA-Z]/.test(c);

    // Priority 1: direct script change without space (e.g. "можливостейraise")
    for (let i = 0; i < str.length - 1; i++) {
        const a = str[i], b = str[i + 1];
        if ((isCyr(a) && isLat(b)) || (isLat(a) && isCyr(b))) return i + 1;
    }

    // Priority 2: space between different scripts (e.g. "керує go")
    for (let i = 1; i < str.length - 1; i++) {
        if (str[i] === ' ') {
            const prev = str[i - 1], next = str[i + 1];
            if ((isCyr(prev) && isLat(next)) || (isLat(prev) && isCyr(next))) return i + 1;
        }
    }

    // Fallback: last space
    const ls = str.lastIndexOf(' ');
    return ls >= 0 ? ls + 1 : str.length;
}

function parseWordPairs(rawText) {
    if (!rawText.trim()) return [];

    let segments = rawText.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);

    // If single line with no dashes — try comma / semicolon split
    if (segments.length === 1 && !/[—–]/.test(segments[0])) {
        const s = segments[0];
        if (s.includes(',')) segments = s.split(',').map(x => x.trim()).filter(Boolean);
        else if (s.includes(';')) segments = s.split(';').map(x => x.trim()).filter(Boolean);
    }

    const result = [];
    for (const seg of segments) {
        // Multiple em/en dashes → treat as continuous multi-pair line
        const dashCount = (seg.match(/[—–]/g) || []).length;
        if (dashCount > 1) {
            const pieces = seg.split(/\s*[—–]\s*/);
            if (pieces.length >= 3) {
                let word = pieces[0].trim();
                for (let i = 1; i < pieces.length; i++) {
                    const piece = pieces[i].trim();
                    if (i < pieces.length - 1) {
                        const bnd = findWordBoundary(piece);
                        result.push({ word, translation: piece.slice(0, bnd).trim() || null });
                        word = piece.slice(bnd).trim();
                    } else {
                        result.push({ word, translation: piece || null });
                    }
                }
                continue;
            }
        }

        // Single pair
        let m = seg.match(/^(.+?)\s*[—–]\s*(.+)$/);
        if (m) { result.push({ word: m[1].trim(), translation: m[2].trim() }); continue; }
        m = seg.match(/^(.+?)\s+-\s+(.+)$/);
        if (m) { result.push({ word: m[1].trim(), translation: m[2].trim() }); continue; }
        m = seg.match(/^(.+?)\s*=\s*(.+)$/);
        if (m) { result.push({ word: m[1].trim(), translation: m[2].trim() }); continue; }
        m = seg.match(/^(.+?)\t(.+)$/);
        if (m) { result.push({ word: m[1].trim(), translation: m[2].trim() }); continue; }
        // Без явного роздільника: якщо рядок змішує два скрипти (напр. кирилиця+латиниця) —
        // це слово+переклад, межа скриптів їх розділяє. Інакше — це фраза/ідіома/фразове
        // дієслово в одній мові (напр. "to give up", "look after"), рядок лишається ОДНИМ
        // словом-фразою без перекладу, а не розбивається на окремі токени.
        const hasCyr = /[а-яА-ЯіІїЇєЄ'ʼ]/.test(seg);
        const hasLat = /[a-zA-Z]/.test(seg);
        if (hasCyr && hasLat) {
            const bnd = findWordBoundary(seg);
            result.push({ word: seg.slice(0, bnd).trim(), translation: seg.slice(bnd).trim() || null });
            continue;
        }
        result.push({ word: seg.trim(), translation: null });
    }

    return result.filter(p => p.word.length > 0);
}

function goWordInputNext() {
    const t = translations[currentLang];
    const rawText = document.getElementById('wordInputTextarea').value.trim();
    if (!rawText) {
        const errEl = document.getElementById('wiValidation');
        errEl.innerText = t.wi_min_error || 'Потрібно мінімум 2 пари';
        errEl.style.display = 'block';
        return;
    }
    wordPairs = parseWordPairs(rawText);
    if (wordPairs.length < 2) {
        const errEl = document.getElementById('wiValidation');
        errEl.innerText = t.wi_min_error || 'Потрібно мінімум 2 пари';
        errEl.style.display = 'block';
        return;
    }
    showWordVerifyScreen();
}

// FB-35 (2026-08-11, User): "прямо в списку" — один клік з "За наборами"
// (renderWordProfileList, нижче) відкриває ТУ Ж chip-based верифікацію/тему, що
// вже існує для створення нового набору (wordVerifyScreen → wordTopicScreen),
// замість дублювання окремого inline-редактора для декількох слів одразу.
// Пропускає wordLangScreen/wordInputScreen (мовна пара й пари слів уже є) —
// editingSetId сигналізує saveWordSetAndStart() оновити існуючий набір, а не
// створити новий.
function editWordSet(id) {
    const set = loadWordSets().find(s => s.id === id);
    if (!set) return;
    editingSetId = id;
    wordLangFrom = set.langFrom || 'en';
    wordLangTo = set.langTo || 'uk';
    wordLevel = set.level || 1;
    wordPairs = (set.pairs || []).map(p => ({ ...p })); // клон — не чіпати збережений набір, поки не збережено
    showWordVerifyScreen();
}

function showWordVerifyScreen() {
    const t = translations[currentLang];
    showScreen('wordVerifyScreen');
    document.getElementById('wvBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('wvHomeBtn').title = document.getElementById('wvHomeBtn').ariaLabel = t.finish_home || 'На головну';
    document.getElementById('wvTitleEl').innerText = t.wv_title || 'Перевірте список';
    document.getElementById('wvHintEl').innerText = t.wv_hint || 'Натисніть на пару щоб відредагувати';
    document.getElementById('wvHint2Text').innerText = t.wv_hint_cycle || '— спробувати інший варіант перекладу';
    document.getElementById('wvAddBtn').innerText = t.wv_add || '+ Додати слово';
    document.getElementById('wvNextBtn').innerText = t.wv_confirm || 'Все вірно →';
    document.getElementById('wvValidation').style.display = 'none';
    renderWordChips();
}

function renderWordChips() {
    const t = translations[currentLang];
    const noTransLabel = t.wv_no_trans || '+ переклад';
    const altTitle = t.wv_alt_translation || 'Інший варіант перекладу';
    const container = document.getElementById('wordChipsContainer');
    container.innerHTML = wordPairs.map((pair, i) => `
        <div class="word-chip${pair.translation ? '' : ' word-chip-empty'}"
             id="wchip-${i}" onclick="editWordChip(${i})">
            <span class="word-chip-word">${escHtml(pair.word)}</span>
            <span class="word-chip-arrow">→</span>
            <span class="word-chip-trans">${pair.translation
                ? escHtml(pair.translation)
                : `<em class="chip-no-trans">${noTransLabel}</em>`}</span>
            <button class="chip-cycle-btn" title="${altTitle}" aria-label="${altTitle}"
                    onclick="event.stopPropagation(); cycleTranslation(${i})">🔁</button>
        </div>
    `).join('');
    updateAutoTranslateBtn();
}

function updateAutoTranslateBtn() {
    const t = translations[currentLang];
    const btn = document.getElementById('wvAutoTranslateBtn');
    if (!btn) return;
    const missingCount = wordPairs.filter(p => !p.translation && p.word).length;
    btn.style.display = missingCount ? 'block' : 'none';
    if (!btn.disabled) btn.innerText = t.wv_auto_translate || '🌐 Запропонувати переклад';
}

// ===== AUTO-TRANSLATE (Google Translate — free, no key, better quality; MyMemory as fallback) =====
async function fetchTranslationGoogle(text, from, to) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const translated = (data?.[0] || []).map(seg => seg?.[0] || '').join('').trim();
        if (!translated) return null;
        if (translated.toLowerCase() === text.trim().toLowerCase()) return null;
        return translated;
    } catch {
        return null;
    }
}

async function fetchTranslationMyMemory(text, from, to) {
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const translated = data?.responseData?.translatedText;
        if (!translated) return null;
        // Skip echoes and MyMemory's own error placeholders
        if (translated.trim().toLowerCase() === text.trim().toLowerCase()) return null;
        if (/^(MYMEMORY WARNING|INVALID)/i.test(translated)) return null;
        return translated.trim();
    } catch {
        return null;
    }
}

async function fetchTranslation(text, from, to) {
    const fromGoogle = await fetchTranslationGoogle(text, from, to);
    if (fromGoogle) return fromGoogle;
    return fetchTranslationMyMemory(text, from, to); // Google unreachable/blocked — fall back
}

// ===== SMART AUTO-TRANSLATE (визначає напрям перекладу) =====
// autoTranslateMissing() раніше завжди вважала typed-слово мовою, яку
// вчимо (wordLangFrom), і перекладала В wordLangTo. Якщо користувач вводив
// слово рідною мовою (wordLangTo) — воно йшло у тренування як є, без
// перекладу в мову навчання. Тепер визначаємо РЕАЛЬНУ мову введеного слова
// через sl=auto і, якщо вона виявилась wordLangTo, а не wordLangFrom —
// міняємо word/translation місцями, щоб тренована сторона (word) завжди
// лишалась мовою, яку користувач обрав вчити.
async function fetchTranslationAutoDetect(text, tl) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const translated = (data?.[0] || []).map(seg => seg?.[0] || '').join('').trim();
        const detected = data?.[2] || null; // мова джерела, визначена Google при sl=auto
        if (!translated) return null;
        return { translated, detected };
    } catch {
        return null;
    }
}

async function fetchTranslationSmart(word, langFrom, langTo) {
    const auto = await fetchTranslationAutoDetect(word, langTo);
    if (auto && auto.detected === langTo && auto.detected !== langFrom) {
        // Ввели слово мовою перекладу, а не мовою навчання — перекладаємо
        // НАЗАД у langFrom, і typed-текст стає перекладом, а не тренованим словом.
        const back = await fetchTranslation(word, langTo, langFrom);
        return back ? { word: back, translation: word } : null;
    }
    if (auto && auto.translated && auto.translated.trim().toLowerCase() !== word.trim().toLowerCase()) {
        return { word, translation: auto.translated };
    }
    // sl=auto не дав результату (мережа/блок/збіг слів) — стара поведінка як фолбек
    const fallback = await fetchTranslation(word, langFrom, langTo);
    return fallback ? { word, translation: fallback } : null;
}

async function autoTranslateMissing() {
    const t = translations[currentLang];
    const btn = document.getElementById('wvAutoTranslateBtn');
    const missing = wordPairs.map((p, i) => ({ p, i })).filter(x => !x.p.translation && x.p.word);
    if (!missing.length) return;

    if ('onLine' in navigator && !navigator.onLine) {
        showMotivToast(t.wv_translate_offline || 'Немає інтернету — перевірте з\'єднання');
        return;
    }

    if (btn) { btn.disabled = true; btn.innerText = t.wv_translating || 'Перекладаю…'; }

    const results = await Promise.all(missing.map(({ p, i }) =>
        fetchTranslationSmart(p.word, wordLangFrom, wordLangTo).then(r => ({ i, r }))
    ));

    let failed = 0;
    results.forEach(({ i, r }) => {
        if (r) { wordPairs[i].word = r.word; wordPairs[i].translation = r.translation; }
        else failed++;
    });

    if (btn) btn.disabled = false;
    renderWordChips(); // also resets the button label/visibility
    if (failed) showMotivToast(t.wv_translate_failed || 'Не вдалося перекласти деякі слова');
}

// ===== ALTERNATIVE TRANSLATIONS (для слів з кількома значеннями) =====
// Google's bilingual-dictionary endpoint (dt=bd) повертає переклад згруповано
// за частинами мови (іменник/дієслово/...), що і дає різні значення одного слова.
async function fetchTranslationAlternatives(text, from, to) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&dt=bd&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const primary = (data?.[0] || []).map(seg => seg?.[0] || '').join('').trim();
        const dict = data?.[1] || []; // [[partOfSpeech, [words...], [...], srcWord, posIndex], ...]

        const seen = new Set();
        const list = [];
        const add = w => {
            const key = (w || '').trim().toLowerCase();
            if (key && !seen.has(key)) { seen.add(key); list.push(w.trim()); }
        };
        add(primary);
        dict.forEach(group => (group?.[1] || []).forEach(add));
        return list;
    } catch {
        return [];
    }
}

const altTransCache = {};  // `${from}|${to}|${word}` -> string[]
const altTransIndex = {};  // те саме — поточна позиція в списку

async function cycleTranslation(index) {
    const t = translations[currentLang];
    const pair = wordPairs[index];
    if (!pair || !pair.word) return;
    const key = `${wordLangFrom}|${wordLangTo}|${pair.word.trim().toLowerCase()}`;
    const chip = document.getElementById('wchip-' + index);
    const cycleBtn = chip ? chip.querySelector('.chip-cycle-btn') : null;

    // Не кешуємо порожній результат назавжди — [] є truthy, тож без .length-перевірки
    // одна тимчасова мережева невдача назавжди "замикала" слово на "варіантів немає".
    if (!altTransCache[key] || !altTransCache[key].length) {
        if (cycleBtn) cycleBtn.classList.add('chip-cycle-loading');
        let list = await fetchTranslationAlternatives(pair.word, wordLangFrom, wordLangTo);
        if (!list.length) list = await fetchTranslationAlternatives(pair.word, wordLangFrom, wordLangTo); // один ретрай на випадок тимчасового збою
        altTransCache[key] = list;
        altTransIndex[key] = -1;
        if (cycleBtn) cycleBtn.classList.remove('chip-cycle-loading');
    }

    const list = altTransCache[key];
    if (!list.length) {
        showMotivToast(t.wv_no_alt || 'Інших варіантів немає — введіть свій переклад');
        editWordChip(index);
        return;
    }

    const prevIndex = altTransIndex[key];
    altTransIndex[key] = (prevIndex + 1) % list.length;
    pair.translation = list[altTransIndex[key]];
    renderWordChips();
    if (list.length > 1 && prevIndex === list.length - 1) {
        showMotivToast(t.wv_alt_wrapped || 'Це всі варіанти — можна ввести свій, якщо жоден не підійшов');
    }
}

function editWordChip(index) {
    const pair = wordPairs[index];
    const chip = document.getElementById('wchip-' + index);
    if (!chip || chip.classList.contains('chip-editing')) return;
    const t = translations[currentLang];
    chip.classList.add('chip-editing');
    chip.onclick = null;
    chip.innerHTML = `
        <div class="chip-edit-row1">
            <input class="chip-edit-word" type="text" value="${escHtml(pair.word)}" placeholder="${t.wl_learning || 'слово'}">
            <span class="word-chip-arrow">→</span>
            <input class="chip-edit-trans" type="text" value="${escHtml(pair.translation || '')}" placeholder="${t.wv_no_trans || 'переклад'}">
        </div>
        <div class="chip-edit-row2">
            <button class="chip-save-btn" onclick="event.stopPropagation(); saveWordChip(${index})">✓</button>
            <button class="chip-delete-btn" onclick="event.stopPropagation(); deleteWordChip(${index})">✕</button>
        </div>
    `;
    const wordInput = chip.querySelector('.chip-edit-word');
    wordInput.focus();
    wordInput.select();
    chip.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') saveWordChip(index);
        });
    });
}

function saveWordChip(index) {
    const chip = document.getElementById('wchip-' + index);
    if (!chip) return;
    const word = (chip.querySelector('.chip-edit-word')?.value || '').trim();
    const trans = (chip.querySelector('.chip-edit-trans')?.value || '').trim();
    if (!word) { deleteWordChip(index); return; }
    wordPairs[index] = { ...wordPairs[index], word, translation: trans || null };
    renderWordChips();
}

function deleteWordChip(index) {
    wordPairs.splice(index, 1);
    renderWordChips();
}

function addWordPairBtn() {
    wordPairs.push({ word: '', translation: null });
    renderWordChips();
    editWordChip(wordPairs.length - 1);
    const container = document.getElementById('wordChipsContainer');
    if (container) container.scrollTop = container.scrollHeight;
}

function goWordVerifyNext() {
    const t = translations[currentLang];
    wordPairs = wordPairs.filter(p => p.word && p.word.trim().length > 0);
    if (wordPairs.length < 2) {
        const errEl = document.getElementById('wvValidation');
        errEl.innerText = t.wv_min_error || 'Потрібно мінімум 2 пари';
        errEl.style.display = 'block';
        return;
    }
    showWordTopicScreen();
}

function showWordTopicScreen() {
    const t = translations[currentLang];
    showScreen('wordTopicScreen');
    document.getElementById('wtBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('wtTopicHomeBtn').title = document.getElementById('wtTopicHomeBtn').ariaLabel = t.finish_home || 'На головну';
    document.getElementById('wtTitleEl').innerText = t.wt_title || 'Назвіть тему';
    const wtSubEl = document.getElementById('wtTopicSubtitleEl');
    if (wtSubEl) wtSubEl.innerText = t.wt_topic_subtitle || '';
    document.getElementById('wordTopicInput').placeholder = t.wt_placeholder || 'Наприклад: Тварини';
    document.getElementById('wtAutoBtn').innerText = t.wt_auto || '✨ Підібрати автоматично';
    // FB-35: при редагуванні існуючого набору (editingSetId) — тема вже задана
    // раніше User свідомо, не переписувати авто-підбором наново; лише при
    // створенні нового набору тема завжди чиста + авто-suggest (як і раніше).
    const editingSet = editingSetId ? loadWordSets().find(s => s.id === editingSetId) : null;
    document.getElementById('wtSaveBtn').innerText = editingSet ? (t.wt_save_edit || 'Зберегти зміни') : (t.wt_save || 'Зберегти →');
    if (editingSet) {
        document.getElementById('wordTopicInput').value = editingSet.topic || '';
    } else {
        document.getElementById('wordTopicInput').value = '';
        autoSuggestTopic();
    }
}

const TOPIC_CATEGORIES = [
    // ── Keyword categories first (most specific) ──────────────
    {
        id: 'animals',
        kw: ['dog','cat','bird','fish','horse','cow','pig','sheep','lion','tiger','bear','wolf','fox','rabbit','elephant','monkey','snake','dolphin','whale','eagle','owl','penguin','parrot','deer','hamster','собака','кіт','птах','риба','кінь','корова','свиня','вівця','лев','тигр','ведмідь','вовк','лисиця','кролик','слон','мавпа','змія','дельфін','кит','орел','сова'],
        label: { uk: 'Тварини', en: 'Animals', pl: 'Zwierzęta', de: 'Tiere', fr: 'Animaux', es: 'Animales' }
    },
    {
        id: 'food',
        kw: ['apple','bread','coffee','tea','water','milk','egg','cheese','meat','rice','soup','salad','cake','juice','wine','pizza','pasta','fruit','vegetable','chicken','sugar','salt','butter','яблуко','хліб','кава','чай','вода','молоко','яйце','сир','мясо','рис','суп','салат','торт','сік','вино','піца','фрукт','овоч'],
        label: { uk: 'Їжа та напої', en: 'Food & Drinks', pl: 'Jedzenie i napoje', de: 'Essen & Trinken', fr: 'Alimentation', es: 'Comida y bebidas' }
    },
    {
        id: 'travel',
        kw: ['hotel','airport','passport','ticket','flight','trip','journey','luggage','visa','tour','beach','mountain','country','border','customs','готель','аеропорт','паспорт','квиток','рейс','подорож','валіза','віза','тур','пляж','гора','країна','кордон','митниця'],
        label: { uk: 'Подорожі', en: 'Travel', pl: 'Podróże', de: 'Reisen', fr: 'Voyages', es: 'Viajes' }
    },
    {
        id: 'sports',
        kw: ['sport','football','soccer','basketball','tennis','swim','run','jump','kick','score','team','player','game','match','race','gym','coach','спорт','футбол','баскетбол','теніс','плавання','біг','стрибок','гол','команда','гравець','гра','матч','тренер'],
        label: { uk: 'Спорт', en: 'Sports', pl: 'Sport', de: 'Sport', fr: 'Sport', es: 'Deporte' }
    },
    {
        id: 'work',
        kw: ['work','job','office','meeting','project','manager','colleague','salary','company','business','report','deadline','boss','employee','career','робота','офіс','зустріч','проект','менеджер','колега','зарплата','компанія','бізнес','звіт','дедлайн','начальник','кар\'єра'],
        label: { uk: 'Робота та бізнес', en: 'Work & Business', pl: 'Praca i biznes', de: 'Arbeit & Business', fr: 'Travail & Business', es: 'Trabajo y negocios' }
    },
    {
        id: 'body',
        kw: ['head','eye','ear','nose','mouth','hand','arm','leg','foot','heart','stomach','back','face','hair','tooth','finger','shoulder','голова','очі','вухо','ніс','рот','рука','нога','серце','живіт','обличчя','волосся','зуб','палець','плече'],
        label: { uk: 'Тіло людини', en: 'Human Body', pl: 'Ciało człowieka', de: 'Menschlicher Körper', fr: 'Corps humain', es: 'Cuerpo humano' }
    },
    {
        id: 'emotions',
        kw: ['happy','sad','angry','afraid','love','hate','fear','joy','worry','stress','anxious','excited','bored','tired','proud','lonely','щасливий','сумний','злий','боятися','любов','ненавидіти','страх','радість','тривога','стрес','збуджений','нудний','втомлений','самотній'],
        label: { uk: 'Емоції та почуття', en: 'Emotions & Feelings', pl: 'Emocje i uczucia', de: 'Emotionen & Gefühle', fr: 'Émotions & Sentiments', es: 'Emociones y sentimientos' }
    },
    {
        id: 'home',
        kw: ['house','home','room','kitchen','bedroom','bathroom','window','door','furniture','chair','table','bed','sofa','lamp','floor','wall','garden','будинок','дім','кімната','кухня','спальня','ванна','вікно','двері','меблі','стілець','стіл','ліжко','диван','підлога','стіна','сад'],
        label: { uk: 'Дім та побут', en: 'Home & Living', pl: 'Dom i życie codzienne', de: 'Zuhause & Alltag', fr: 'Maison & Vie quotidienne', es: 'Hogar y vida' }
    },
    {
        id: 'nature',
        kw: ['tree','flower','sun','moon','star','river','sea','ocean','mountain','forest','rain','snow','wind','cloud','earth','lake','sky','природа','дерево','квітка','сонце','місяць','зірка','річка','море','океан','гора','ліс','дощ','сніг','вітер','хмара','озеро','небо'],
        label: { uk: 'Природа', en: 'Nature', pl: 'Przyroda', de: 'Natur', fr: 'Nature', es: 'Naturaleza' }
    },
    {
        id: 'technology',
        kw: ['computer','phone','internet','software','app','website','data','email','keyboard','screen','wifi','digital','program','code','технологія','комп\'ютер','телефон','інтернет','програма','застосунок','сайт','дані','клавіатура','екран','цифровий','код'],
        label: { uk: 'Технології', en: 'Technology', pl: 'Technologia', de: 'Technologie', fr: 'Technologie', es: 'Tecnología' }
    },
    {
        id: 'clothes',
        kw: ['shirt','pants','dress','shoe','hat','jacket','coat','skirt','sock','glove','scarf','tie','belt','suit','одяг','сорочка','штани','сукня','взуття','капелюх','куртка','пальто','спідниця','шкарпетки','рукавиця','шарф','краватка','ремінь','костюм'],
        label: { uk: 'Одяг', en: 'Clothes', pl: 'Ubrania', de: 'Kleidung', fr: 'Vêtements', es: 'Ropa' }
    },
    {
        id: 'transport',
        kw: ['car','bus','train','plane','ship','bike','taxi','metro','road','drive','автомобіль','автобус','поїзд','літак','корабель','велосипед','таксі','метро','дорога','водити'],
        label: { uk: 'Транспорт', en: 'Transport', pl: 'Transport', de: 'Transport', fr: 'Transport', es: 'Transporte' }
    },
    // ── Pattern-based (checked last — only if no keyword match) ──
    {
        id: 'phrasal',
        test: pairs => pairs.filter(p => /^(give|take|look|make|get|come|go|put|set|turn|bring|break|keep|hold|run|fall|cut|pick|call|carry|pass|pull|sit|stand|throw|wake)\s+(up|out|in|on|off|down|away|back|over|through|around|along|into)\b/i.test(p.word)).length >= Math.max(2, pairs.length * 0.35),
        label: { uk: 'Фразові дієслова', en: 'Phrasal Verbs', pl: 'Czasowniki frazowe', de: 'Phrasal Verbs', fr: 'Verbes à particule', es: 'Verbos frasales' }
    },
    {
        id: 'idioms',
        test: pairs => pairs.filter(p => p.word.trim().split(/\s+/).length >= 3).length >= pairs.length * 0.6,
        label: { uk: 'Ідіоми та фрази', en: 'Idioms & Phrases', pl: 'Idiomy i frazy', de: 'Idiome & Phrasen', fr: 'Idiomes & Phrases', es: 'Modismos y frases' }
    },
];

function autoSuggestTopic() {
    const t = translations[currentLang];
    const lang = currentLang;
    // Flatten all words + translations for matching
    const allText = wordPairs.flatMap(p => [p.word, p.translation || '']).join(' ').toLowerCase();

    for (const cat of TOPIC_CATEGORIES) {
        let matched = false;
        if (cat.test) {
            matched = cat.test(wordPairs);
        } else if (cat.kw) {
            const hits = cat.kw.filter(kw => allText.includes(kw.toLowerCase())).length;
            matched = hits >= Math.min(2, Math.ceil(wordPairs.length * 0.25));
        }
        if (matched) {
            document.getElementById('wordTopicInput').value = cat.label[lang] || cat.label.en;
            document.getElementById('wordTopicInput').focus();
            return;
        }
    }

    // Fallback: first 2 words + "та інші" / "and more"
    const first2 = wordPairs.slice(0, 2).map(p => p.word).join(', ');
    const more = wordPairs.length > 2
        ? (lang === 'uk' ? ' та інші' : lang === 'pl' ? ' i inne' : lang === 'de' ? ' u.a.' : lang === 'fr' ? ' et autres' : lang === 'es' ? ' y más' : ' & more')
        : '';
    document.getElementById('wordTopicInput').value = first2 + more;
    document.getElementById('wordTopicInput').focus();
}

function saveWordSetAndStart() {
    const t = translations[currentLang];
    const topicInput = document.getElementById('wordTopicInput').value.trim();
    const topic = topicInput || wordPairs.slice(0, 2).map(p => p.word).join(', ');

    // FB-35 (2026-08-11): редагування існуючого набору (editWordSet вище) —
    // оновити на місці й повернутись у "За наборами", а не створювати новий
    // набір і форсувати тренування (як для звичайного створення нижче).
    if (editingSetId) {
        const sets = loadWordSets();
        const idx = sets.findIndex(s => s.id === editingSetId);
        if (idx >= 0) {
            const oldPairs = sets[idx].pairs || [];
            // Зберегти masteryScore для пар, що не змінились (той самий
            // word+translation, що й раніше) — інакше правка ОДНОГО слова
            // скидала б прогрес по ВСІХ інших словах набору.
            const mergedPairs = wordPairs.map(p => {
                const prev = oldPairs.find(op => op.word === p.word && op.translation === p.translation);
                return { ...p, masteryScore: prev ? (prev.masteryScore || 0) : 0 };
            });
            sets[idx] = { ...sets[idx], topic, langFrom: wordLangFrom, langTo: wordLangTo, pairs: mergedPairs };
            saveWordSets(sets);
        }
        editingSetId = null;
        showProgressScreen(progressReturnFn);
        return;
    }

    const newSet = {
        id: Date.now(),
        topic,
        langFrom: wordLangFrom,
        langTo: wordLangTo,
        level: wordLevel,
        pairs: [...wordPairs],
        savedAt: Date.now(),
    };
    const sets = loadWordSets();
    sets.unshift(newSet);
    saveWordSets(sets);
    startWordTraining(newSet, showWordTopicScreen);
}

// ===== WORD TRAINING ENGINE =====


// ----- [W5 word training engine + answer matching]  (was app.js lines 4264-4904) -----
// Скільки поспіль "чистих" (без жодної помилки) проходжень слова треба,
// щоб вважати його вивченим у профілі — навмисно проста метрика, без SRS/дат.
const WT_MASTERY_THRESHOLD = 2;

// Раніше викликалась ЛИШЕ в кінці тренування (showWordResults) — якщо вкладку
// закривали посеред черги (навіть 14/15 вправ), увесь прогрес мастері губився.
// Тепер викликається інкрементально після КОЖНОЇ вправи (wtNext/wtSkipWord/
// wtGoBack), а не тільки наприкінці — для кожного слова: рахує чи пройдено
// БЕЗ жодної помилки (по всіх типах вправ і requeue-спробах для цього слова),
// щойно останнє наявне на цей момент входження цього слова в черзі отримало
// відповідь (correct !== undefined) — тобто НЕ чекаючи проходження всієї черги.
// `wtSettledPairs` захищає від повторного нарахування того самого "чистого
// проходу" при кожному повторному виклику цієї функції протягом сесії.
// Оновлює masteryScore прямо на об'єкті pair усередині wtSet.pairs (той самий
// об'єкт, що і в wtQueue[i].pair — filter/sort його не клонують), і зберігає
// назад у memoriWords_sets одразу, а не в кінці.
function updateWordMastery() {
    if (!wtSet) return;
    const byPair = new Map();
    wtQueue.forEach(ex => {
        if (ex.type === 'match') {
            // Раунд match тримає кілька пар в одній вправі (ex.pairs) — розкладаємо
            // на синтетичні "вправа на 1 пару" записи по pairResults[i], щоб
            // mastery рахувалась per-word так само, як і для решти типів.
            if (!Array.isArray(ex.pairs)) return;
            ex.pairs.forEach((p, i) => {
                if (!byPair.has(p)) byPair.set(p, []);
                const matched = ex.pairResults ? ex.pairResults[i] : undefined;
                const hadMistake = ex.pairHadMistake ? ex.pairHadMistake[i] : false;
                byPair.get(p).push({ correct: matched === true ? !hadMistake : undefined });
            });
            return;
        }
        if (ex.type === 'listen') {
            // Аналогічно match: раунд тримає кілька слів, розкладаємо на
            // синтетичні записи. Правильність per-word — чи збіглася позначка
            // "прозвучало/не прозвучало" з тим, чи слово справді звучало, а
            // не whole-round результат (справедливіше: одна помилка з 6 слів
            // не повинна скидати mastery решти 5 правильно розпізнаних).
            if (!Array.isArray(ex.pairs)) return;
            const spokenSet = new Set(ex.spokenIndices || []);
            const selectedSet = new Set(ex.selected || []);
            const resolved = ex.correct !== undefined;
            ex.pairs.forEach((p, i) => {
                if (!byPair.has(p)) byPair.set(p, []);
                byPair.get(p).push({ correct: resolved ? (spokenSet.has(i) === selectedSet.has(i)) : undefined });
            });
            return;
        }
        if (!byPair.has(ex.pair)) byPair.set(ex.pair, []);
        byPair.get(ex.pair).push(ex);
    });
    let changed = false;
    const touchedPairs = [];
    byPair.forEach((exs, pair) => {
        if (wtSettledPairs.has(pair)) return; // вже підбито цієї сесії — не рахувати вдруге
        const resolved = exs.filter(e => e.correct !== undefined);
        if (resolved.length < exs.length) return; // ще є невідповіджені вправи цього слова — зачекати
        const attempted = resolved.filter(e => e.correct !== null); // без пропущених (skip)
        if (!attempted.length) return; // усі наявні вправи цього слова пропущені — нема що рахувати
        wtSettledPairs.add(pair);
        const allCorrect = attempted.every(e => e.correct === true);
        pair.masteryScore = allCorrect ? (pair.masteryScore || 0) + 1 : 0;
        changed = true;
        touchedPairs.push(pair);
    });
    if (!changed) return;
    wtSet.lastTrainedAt = Date.now();

    const sets = loadWordSets();

    // FB-19: комбінована сесія (wordSelectScreen) — wtSet.pairs змішує слова з кількох
    // РІЗНИХ реальних наборів, тому "перезаписати pairs цілого набору" (як нижче для
    // звичайного випадку) тут не працює — нема одного набору-власника. __originMap
    // (startSelectedWordTraining) знає, з якого реального set.id і на якій позиції
    // взято кожен pair-об'єкт цієї сесії — записуємо masteryScore точково, у кожен
    // реальний набір окремо, а не в неіснуючий "__virtual_selection__".
    if (wtSet.__virtual && wtSet.__originMap) {
        const dirtySetIds = new Set();
        touchedPairs.forEach(pair => {
            const origin = wtSet.__originMap.get(pair);
            if (!origin) return;
            const setIdx = sets.findIndex(s => s.id === origin.setId);
            if (setIdx < 0) return;
            const byIdx = (sets[setIdx].pairs || [])[origin.idx];
            const target = (byIdx && byIdx.word === pair.word && byIdx.translation === pair.translation)
                ? byIdx
                : (sets[setIdx].pairs || []).find(p => p.word === pair.word && p.translation === pair.translation);
            if (!target) return;
            target.masteryScore = pair.masteryScore;
            sets[setIdx].lastTrainedAt = wtSet.lastTrainedAt;
            dirtySetIds.add(origin.setId);
        });
        if (dirtySetIds.size) saveWordSets(sets);
        return;
    }

    const idx = sets.findIndex(s => s.id === wtSet.id);
    if (idx >= 0) {
        sets[idx].pairs = wtSet.pairs;
        sets[idx].lastTrainedAt = wtSet.lastTrainedAt;
        saveWordSets(sets);
    }
}

// Відновлює wtQueue/wtIndex/wtCorrect зі збереженого прогресу (saveWtProgress)
// і одразу показує wordTrainingScreen — спільна логіка для confirm-діалогу
// (startWordTraining, коли User сам обирає набір з незавершеним прогресом)
// і для тихого авто-resume при відкритті додатку (checkAppBootResume, state.js).
function applyWtSavedProgress(set, saved) {
    wtSet = set;
    wordLangFrom = set.langFrom || 'en';
    wordLangTo   = set.langTo   || 'uk';
    wordLevel    = set.level    || 1;
    // Пари в збереженому JSON — окремі клоновані об'єкти після
    // JSON.parse, а не ті самі референси, що в set.pairs. Прив'язуємо
    // назад до реальних об'єктів пар цього набору (за word+translation),
    // щоб masteryScore і надалі писався в правильне місце.
    // FB-17: match/listen тримають КІЛЬКА пар в ex.pairs (масив), решта типів —
    // одну в ex.pair. Код нижче раніше скрізь читав лише ex.pair.word, що падало
    // (TypeError, ex.pair === undefined) для цих 2 типів при 24h-autoresume чи
    // ручному "Продовжити" — знайдено QA під час тестування FB-15, не виправлено.
    const rebind = p => set.pairs.find(sp => sp.word === p.word && sp.translation === p.translation) || p;
    wtQueue = saved.wtQueue.map(ex => {
        if (ex.type === 'match' || ex.type === 'listen') {
            return Array.isArray(ex.pairs) ? { ...ex, pairs: ex.pairs.map(rebind) } : ex;
        }
        return { ...ex, pair: rebind(ex.pair) };
    });
    wtIndex = saved.wtIndex;
    wtCorrect = saved.wtCorrect || 0;
    wtCurrentAudioPair = null;

    // Пари, чиї всі наявні на момент збереження вправи вже отримали
    // відповідь, вже підбили masteryScore ДО перезапуску (інкрементальне
    // збереження) — позначаємо їх settled, щоб updateWordMastery() не
    // нарахувала той самий "чистий прохід" вдруге. match/listen (ex.pairs,
    // не ex.pair) свідомо пропускаються тут — точне повторення логіки
    // "чистого проходу" для раундів з кількох слів живе лише в
    // updateWordMastery(), не дублюємо тут; гірший випадок — той самий
    // раунд рахується ще раз після resume, а не крах.
    wtSettledPairs = new Set();
    const byPair = new Map();
    wtQueue.forEach(ex => {
        if (!ex.pair) return;
        if (!byPair.has(ex.pair)) byPair.set(ex.pair, []);
        byPair.get(ex.pair).push(ex);
    });
    byPair.forEach((exs, pair) => {
        if (exs.every(e => e.correct !== undefined)) wtSettledPairs.add(pair);
    });

    // Нова мітка старту саме цього продовження, не оригінального старту
    // (той міг бути годинами тому, до закриття вкладки/24h boot-resume) —
    // інакше updateStats() (FB-08) порахувала б "хвилини" геть завищено.
    wtSessionStartTime = Date.now();

    showScreen('wordTrainingScreen');
    renderWtExercise();
}

async function startWordTraining(set, returnScreenFn) {
    const t = translations[currentLang];
    const valid = (set.pairs || []).filter(p => p.word && p.translation);
    if (!valid.length) {
        showMotivToast(t.wt_no_trans || 'Додайте переклади до слів');
        showModeScreen();
        return;
    }
    wtReturnScreen = typeof returnScreenFn === 'function' ? returnScreenFn : null;
    wtSet = set;
    wordLangFrom = set.langFrom || 'en';
    wordLangTo   = set.langTo   || 'uk';
    wordLevel    = set.level    || 1;

    // Якщо є незавершений прогрес саме для цього набору (вкладку закрили
    // посеред тренування) — пропонуємо продовжити з того ж місця, а не
    // почати повністю заново (див. WT_PROGRESS_KEY / saveWtProgress).
    const saved = loadWtProgress();
    if (saved && saved.setId === set.id) {
        const msg = (t.wt_resume_confirm || 'Знайдено незавершене тренування цього набору ({n}/{total}). Продовжити з того ж місця?')
            .replace('{n}', saved.wtIndex).replace('{total}', saved.wtQueue.length);
        if (window.confirm(msg)) {
            applyWtSavedProgress(set, saved);
            return;
        } else {
            clearWtProgress();
        }
    }

    // Тип "Речення" доступний на будь-якому рівні — приклади підтягуємо
    // заздалегідь (мережевий запит на пару), інакше чергу нема з чого будувати.
    showScreen('wordTrainingScreen');
    showWtLoading(t.wt_preparing || 'Готую вправи…');
    await prefetchSentenceExamples(valid);
    hideWtLoading();

    wtQueue = buildWtQueue(valid, Infinity); // завжди повний прохід усіма типами вправ по кожному слову
    wtIndex = 0;
    wtCorrect = 0;
    wtCurrentAudioPair = null;
    wtSettledPairs = new Set();
    wtSessionStartTime = Date.now();
    clearWtProgress();
    showScreen('wordTrainingScreen');
    renderWtExercise();
    // Той самий пробіл, що і в startLearning() (Text Mode, QA 2026-08-09):
    // saveWtProgress() раніше викликався лише ПІСЛЯ першої відповіді — закриття
    // вкладки на першій вправі (жодної відповіді ще не дано) не залишало
    // прогресу в localStorage, 24h-resume не міг спрацювати взагалі.
    saveWtProgress();
}

function showWtLoading(text) {
    const overlay = document.getElementById('wtLoadingOverlay');
    if (!overlay) return;
    document.getElementById('wtLoadingStatus').innerText = text;
    overlay.style.display = 'flex';
}
function hideWtLoading() {
    const overlay = document.getElementById('wtLoadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ===== FILL-IN-THE-SENTENCE (тип "sentence") =====
// Приклади речень з бідірекційного словника Google (dt=ex) — одномовні,
// слово в них обгорнуте в <b>...</b>. Покриття нерівномірне: добре для
// en/de/fr/es, майже відсутнє для uk/pl та для фраз з кількох слів —
// тому тип доступний лише для пар, де реально знайшлись приклади.
let wtSentenceExamples = {}; // `${lang}|${word}` -> string[] (з <b>) або [] якщо перевірено й нема

async function fetchExampleSentences(word, lang) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(lang)}&tl=${encodeURIComponent(lang)}&dt=ex&q=${encodeURIComponent(word)}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const raw = data?.[13]?.[0] || [];
        // Тільки приклади, де слово справді позначене <b> — інакше
        // пропуск (blankOutSentence) буде нема куди ставити
        return raw.map(e => e[0]).filter(Boolean).filter(s => /<b>.*?<\/b>/i.test(s));
    } catch {
        return [];
    }
}

async function prefetchSentenceExamples(pairs) {
    await Promise.all(pairs.map(async p => {
        const key = `${wordLangFrom}|${p.word.trim().toLowerCase()}`;
        if (wtSentenceExamples[key]) return; // вже маємо (напр. повторний запуск того ж сету)
        wtSentenceExamples[key] = await fetchExampleSentences(p.word, wordLangFrom);
    }));
}

function hasSentenceExamples(pair) {
    const key = `${wordLangFrom}|${pair.word.trim().toLowerCase()}`;
    return !!(wtSentenceExamples[key] && wtSentenceExamples[key].length);
}

// Груба евристика складності: сортуємо за довжиною (слів) і беремо
// коротше речення для рівня 3, довше/складніше — для рівня 4.
// Це НЕ справжня CEFR-оцінка складності, лише орієнтир на довжину.
function pickSentenceForLevel(examples, level) {
    if (!examples.length) return null;
    const wordCount = s => s.replace(/<\/?b>/gi, '').trim().split(/\s+/).filter(Boolean).length;

    // Абсолютні межі довжини по рівню (не лише відносне сортування) —
    // відсікає однослівні уривки та занадто довгі/складні речення
    const [minWords, maxWords] = level >= 4 ? [6, 20] : [3, 12];
    let pool = examples.filter(s => { const n = wordCount(s); return n >= minWords && n <= maxWords; });
    if (!pool.length) pool = examples; // краще так-сяке речення, ніж жодного

    const sorted = [...pool].sort((a, b) => wordCount(a) - wordCount(b));
    if (sorted.length === 1) return sorted[0];
    const frac = level >= 4 ? 0.75 : 0.15;
    const idx = Math.min(sorted.length - 1, Math.round(frac * (sorted.length - 1)));
    return sorted[idx];
}

// Приходить рядок з <b>слово</b> — прибираємо тег разом зі словом і
// замінюємо на пропуск, решту тексту екрануємо (зовнішні дані з API).
function blankOutSentence(sentenceWithTag) {
    const parts = sentenceWithTag.split(/<b>.*?<\/b>/i);
    return parts.map(escHtml).join('<span class="wt-sentence-blank">_____</span>');
}

// Рівень визначає СКЛАДНІСТЬ (які типи вправ розблоковані — кумулятивно,
// як у мовних додатках: вищий рівень має доступ до всіх типів нижчих +
// свій), а РОЗМІР черги визначає обраний ЧАС (як і в Text Mode), а не
// рівень. Так аудіо/письмо/диктант не "зникають" на нижчих рівнях —
// вони просто рідше трапляються, бо на менший час влазить менше раундів.
// "Без обмежень" = один повний прохід по всіх розблокованих типах.
const WT_SEC_PER_EXERCISE = 20; // грубий орієнтир: recognition швидше, typed — довше, в середньому
const WT_MATCH_MAX_PER_ROUND = 6; // максимум пар в одному раунді matching (вимога User)

// Ділить пари на раунди matching по ≤6 пар кожен — якщо влазить в один раунд,
// повертає його одним елементом; інакше ділить порівну (round-robin, різниця
// в розмірі раундів не більш ніж на 1 пару) на мінімальну кількість раундів,
// що вкладається в ліміт.
function buildMatchRounds(pairs) {
    const rnd = arr => [...arr].sort(() => Math.random() - 0.5);
    const list = rnd(pairs);
    if (list.length < 2) return []; // нема з чим складати пари
    if (list.length <= WT_MATCH_MAX_PER_ROUND) return [list];

    const roundCount = Math.ceil(list.length / WT_MATCH_MAX_PER_ROUND);
    const groups = Array.from({ length: roundCount }, () => []);
    list.forEach((p, i) => groups[i % roundCount].push(p));
    return groups;
}

const WT_LISTEN_MAX_PER_ROUND = 6;

// Ділить пари на раунди "Слухай і познач" по ≤6 слів кожен (та сама схема
// round-robin, що й buildMatchRounds), і для кожного раунду одразу вирішує,
// яка ПІДмножина слів реально прозвучить (spokenIndices, індекси в межах
// вже перетасованого round.pairs) — приблизно половина, мінімум 1, лишає
// хоч одне непрозвучене (інакше "яких прозвучало" вироджується в "усі").
function buildListenRounds(pairs) {
    const rnd = arr => [...arr].sort(() => Math.random() - 0.5);
    const list = rnd(pairs);
    if (list.length < 3) return []; // замало слів, щоб було з чого відрізняти "почуте" від "не почутого"

    let groups;
    if (list.length <= WT_LISTEN_MAX_PER_ROUND) {
        groups = [list];
    } else {
        const roundCount = Math.ceil(list.length / WT_LISTEN_MAX_PER_ROUND);
        groups = Array.from({ length: roundCount }, () => []);
        list.forEach((p, i) => groups[i % roundCount].push(p));
    }

    return groups.map(group => {
        const shuffled = rnd(group);
        const n = shuffled.length;
        const spokenCount = Math.max(1, Math.min(n - 1, Math.round(n / 2)));
        const allIdx = Array.from({ length: n }, (_, i) => i);
        const spokenIndices = rnd(allIdx).slice(0, spokenCount).sort((a, b) => a - b);
        return { type: 'listen', pairs: shuffled, spokenIndices, selected: [] };
    });
}

// ~50/50: показуємо або реальний переклад пари (isCorrect=true), або
// переклад-дистрактор з іншої пари цього набору (isCorrect=false) — вирішується
// одразу при побудові черги (не в момент рендеру), щоб "назад" показував ту
// саму версію питання, а не тасував наново. Якщо в наборі немає іншої пари з
// відмінним перекладом — не з чого зробити хибний варіант, показуємо правдивий.
function buildTrueFalseItem(pair, allPairs) {
    const isTrue = Math.random() < 0.5;
    if (isTrue) return { pair, type: 'truefalse', tfCorrect: true, tfShown: pair.translation };
    const others = allPairs.filter(p => p !== pair && p.translation && p.translation !== pair.translation);
    if (!others.length) return { pair, type: 'truefalse', tfCorrect: true, tfShown: pair.translation };
    const decoy = others[Math.floor(Math.random() * others.length)];
    return { pair, type: 'truefalse', tfCorrect: false, tfShown: decoy.translation };
}

function buildWtQueue(pairs, timeMinutes = Infinity) {
    const rnd = arr => [...arr].sort(() => Math.random() - 0.5);
    const hasSpeech = 'speechSynthesis' in window;

    // audio/dictation озвучують pair.word мовою wordLangFrom (мова що вчимо, не
    // wordLangTo/не мова інтерфейсу — див. wtPlayAudio() в audio.js). Архівовано
    // 2026-08-05 для uk/pl/fr (немає голосу на тестовому пристрої User) — es
    // свідомо лишається як і раніше (лише hasSpeech), ще не перевірено.
    const ttsWordOk = hasSpeech &&
        (TTS_VERIFIED_LANGS.includes(wordLangFrom) || wordLangFrom === 'es');

    // FB-48 (2026-08-13): "🗣️ Скажи" — ASR-аналог до "spell", той самий
    // напрямок (переклад показано, слово мовою навчання — відповідь), лише
    // голосом замість клавіатури. На відміну від TTS (ttsWordOk вище) — ASR
    // у цьому застосунку свідомо НЕ обмежується списком мов (D-008 addendum,
    // DECISIONS.md): розпізнавання мовлення однаково доступне для будь-якої
    // мови браузера, гейт лише по наявності самого API.
    const hasASR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    // Рівень НЕ впливає на те, які типи вправ трапляються — усі типи доступні
    // на будь-якому рівні (лише фічі браузера/наявність прикладів фільтрують пул).
    // Час — єдине, що визначає РОЗМІР черги (менше часу = менше вправ).
    // 'sentence' тимчасово вимкнено — якість речень з Google Translate
    // недостатня; повернути, коли буде нормальна генерація (див. AI-бекенд)
    const pool = ['w2t', 't2w', ttsWordOk ? 'audio' : null, 'spell', ttsWordOk ? 'dictation' : null, hasASR ? 'speak' : null, 'truefalse'].filter(Boolean);

    // "sentence" доступний лише для пар з реально знайденими прикладами —
    // фільтруємо саме цей тип по конкретному раунду пар, інші типи без змін.
    const pairsForType = (type, list) =>
        type === 'sentence' ? list.filter(hasSentenceExamples) :
        list;

    const q = [];
    if (timeMinutes === Infinity) {
        // Повний прохід — по одному раунду кожного розблокованого типу
        pool.forEach(type => pairsForType(type, rnd(pairs)).forEach(p => q.push(
            type === 'truefalse' ? buildTrueFalseItem(p, pairs) :
            { pair: p, type })));
        buildMatchRounds(pairs).forEach(group => q.push({
            type: 'match', pairs: group, pairResults: undefined, pairHadMistake: undefined,
            mistakeCount: 0, roundScored: false,
        }));
        if (ttsWordOk) buildListenRounds(pairs).forEach(round => q.push(round));
        return q;
    }

    const target = Math.max(pairs.length, Math.round(timeMinutes * 60 / WT_SEC_PER_EXERCISE));
    // Раунд-робін по пулу типів (перемішуючи пари в кожному раунді заново),
    // поки не назбираємо потрібну кількість — так усі типи встигають
    // з'явитись навіть у короткій сесії, а не тільки перший за списком.
    let stalled = false;
    while (q.length < target && !stalled) {
        stalled = true;
        for (const type of pool) {
            const list = pairsForType(type, rnd(pairs));
            if (list.length) stalled = false;
            list.forEach(p => q.push({ pair: p, type }));
            if (q.length >= target) break;
        }
    }
    return q.slice(0, target);
}

// Помилка → слово повертається в чергу трохи пізніше (не одразу наступною),
// і так триває, поки не буде відповіді правильно.
function requeueWtExercise(ex) {
    const insertAt = Math.min(wtIndex + 3, wtQueue.length);
    // truefalse несе дані поза pair/type (tfCorrect/tfShown) — плейн
    // {pair,type} загубив би їх.
    let item;
    if (ex.type === 'truefalse') {
        item = buildTrueFalseItem(ex.pair, wtSet.pairs.filter(p => p.word && p.translation));
    } else {
        item = { pair: ex.pair, type: ex.type };
    }
    wtQueue.splice(insertAt, 0, item);
}

function renderWtExercise() {
    const t = translations[currentLang];
    if (wtIndex >= wtQueue.length) { showWordResults(); return; }

    const { pair, type } = wtQueue[wtIndex];
    const validPairs = wtSet.pairs.filter(p => p.word && p.translation);
    const choiceCount = validPairs.length < 3 ? 2 : validPairs.length < 4 ? 3 : 4;

    // Persistent button labels
    const finishLbl = document.getElementById('wtFinishLabel');
    if (finishLbl) finishLbl.innerText = t.wt_finish || 'Завершити';
    const skipWordBtn = document.getElementById('wtSkipWordBtn');
    if (skipWordBtn) skipWordBtn.innerText = t.wt_skip || 'Пропустити слово';

    // Progress
    document.getElementById('wtProgressFill').style.width =
        Math.round(wtIndex / wtQueue.length * 100) + '%';
    document.getElementById('wtCounter').innerText =
        (wtIndex + 1) + ' / ' + wtQueue.length;

    // Type badge
    const badges = {
        w2t: t.wt_type_w2t || '→ Переклад',
        t2w: t.wt_type_t2w || '→ Слово',
        audio: t.wt_type_audio || '🔊 Аудіо',
        spell: t.wt_type_spell || '✏️ Напиши',
        dictation: t.wt_type_dictation || '🎧 Диктант',
        sentence: t.wt_type_sentence || '📝 Речення',
        speak: t.wt_type_speak || '🗣️ Скажи',
        match: t.wt_type_match || '🔗 Пари',
        truefalse: t.wt_type_truefalse || '✓✗ Правда чи ні',
        listen: t.wt_type_listen || '🎧 Слухай і познач',
    };
    document.getElementById('wtTypeBadge').innerText = badges[type] || type;

    // Reset feedback, next, skip, back
    document.getElementById('wtFeedback').style.display = 'none';
    document.getElementById('wtNextBtn').style.display = 'none';
    const skipBtn = document.getElementById('wtSkipWordBtn');
    if (skipBtn) skipBtn.style.display = 'block';
    const backBtn = document.getElementById('wtBackBtn');
    if (backBtn) backBtn.style.display = 'inline-block';

    const qEl = document.getElementById('wtQuestion');
    const audioWrap = document.getElementById('wtAudioWrap');
    const choicesEl = document.getElementById('wtChoices');
    const typeArea = document.getElementById('wtTypeArea');
    const matchArea = document.getElementById('wtMatchArea');
    const listenArea = document.getElementById('wtListenArea');

    if (type === 'match') {
        audioWrap.style.display = 'none';
        choicesEl.style.display = 'none';
        typeArea.style.display = 'none';
        listenArea.style.display = 'none';
        matchArea.style.display = 'flex';
        document.getElementById('wtSpeakWrap').style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none'; // "пропустити слово" не має сенсу для раунду з кількох пар
        qEl.innerText = t.wt_match_prompt || 'Знайдіть пари: слово — переклад';
        renderWtMatchExercise(wtQueue[wtIndex]);
        return;
    }
    matchArea.style.display = 'none';

    if (type === 'listen') {
        audioWrap.style.display = 'none';
        choicesEl.style.display = 'none';
        typeArea.style.display = 'none';
        listenArea.style.display = 'block';
        document.getElementById('wtSpeakWrap').style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none'; // так само, як match — раунд з кількох слів
        qEl.innerText = t.wt_listen_pick_prompt || 'Прослухайте і відмітьте слова, які прозвучали';
        renderWtListenExercise(wtQueue[wtIndex]);
        return;
    }
    listenArea.style.display = 'none';

    if (type === 'truefalse') {
        const tfEx = wtQueue[wtIndex];
        audioWrap.style.display = 'none';
        typeArea.style.display = 'none';
        document.getElementById('wtSpeakWrap').style.display = 'none';
        choicesEl.style.display = 'grid';
        qEl.innerHTML = `<div class="wt-tf-word">${escHtml(pair.word)}</div>` +
            `<div class="wt-tf-eq">=</div>` +
            `<div class="wt-tf-trans">${escHtml(tfEx.tfShown)}</div>`;
        choicesEl.className = 'wt-choices wt-choices-col1';
        choicesEl.innerHTML =
            `<button class="wt-choice" data-correct="${tfEx.tfCorrect === true}" onclick="wtSelectChoice(this, ${tfEx.tfCorrect === true})">${escHtml(t.wt_true || '✓ Правда')}</button>` +
            `<button class="wt-choice" data-correct="${tfEx.tfCorrect === false}" onclick="wtSelectChoice(this, ${tfEx.tfCorrect === false})">${escHtml(t.wt_false || '✗ Неправда')}</button>`;
        return;
    }

    if (type === 'speak') {
        audioWrap.style.display = 'none';
        choicesEl.style.display = 'none';
        typeArea.style.display = 'none';
        document.getElementById('wtSpeakWrap').style.display = 'flex';
        qEl.innerHTML = `<div class="wt-sentence-prompt">${escHtml(t.wt_speak_prompt || 'Скажіть це слово мовою, яку вивчаєте')}</div>${escHtml(pair.translation)}`;
        document.getElementById('wtSpeakRecordLabel').innerText = t.wt_speak_record || '🎙 Записати';
        document.getElementById('wtSpeakRecordBtn').style.display = 'flex';
        document.getElementById('wtSpeakRecordBtn').disabled = false;
        document.getElementById('wtMicRecording').style.display = 'none';
        return;
    }
    document.getElementById('wtSpeakWrap').style.display = 'none';

    const isTyping = (type === 'spell' || type === 'dictation' || type === 'sentence');

    if (isTyping) {
        // Hide multiple-choice, show typing area
        choicesEl.style.display = 'none';
        typeArea.style.display = 'block';
        audioWrap.style.display = type === 'dictation' ? 'block' : 'none';

        const input = document.getElementById('wtTypeInput');
        input.value = '';
        input.disabled = false;
        input.placeholder = t.wt_type_placeholder || 'Введіть відповідь...';
        const checkBtn = document.getElementById('wtCheckBtn');
        if (checkBtn) {
            checkBtn.title = t.wt_check || 'Перевірити';
            checkBtn.style.display = 'flex';
            const checkLabel = document.getElementById('wtCheckLabel');
            if (checkLabel) checkLabel.innerText = t.wt_check || 'Перевірити';
        }
        // Show hint button
        const hintBtn = document.getElementById('wtHintBtn');
        if (hintBtn) {
            hintBtn.style.display = 'inline-flex';
            hintBtn.disabled = false;
            hintBtn.classList.remove('wt-hint-used');
            document.getElementById('wtHintLabel').innerText = t.wt_hint || 'Підказка';
        }
        // Clear wrong state on every keystroke — must also clear the wrap (border/background
        // pink stays otherwise, even though the input's own red text resets, which reads as
        // "still broken, can't retry")
        input.oninput = () => {
            input.classList.remove('wt-input-wrong');
            const wrap = document.querySelector('.wt-type-wrap');
            if (wrap) wrap.classList.remove('wt-wrap-wrong');
            const fb = document.getElementById('wtFeedback');
            if (fb.classList.contains('wt-fb-wrong')) fb.style.display = 'none';
        };

        if (type === 'spell') {
            // Show translation → user types the word
            qEl.innerText = pair.translation;
            wtCurrentAudioPair = null;
        } else if (type === 'sentence') {
            // Речення з пропуском замість цільового слова + переклад як підказка
            const key = `${wordLangFrom}|${pair.word.trim().toLowerCase()}`;
            const examples = wtSentenceExamples[key] || [];
            const sentence = pickSentenceForLevel(examples, wordLevel);
            const prompt = escHtml(t.wt_sentence_prompt || 'Впишіть пропущене слово');
            qEl.innerHTML = sentence
                ? `<div class="wt-sentence-prompt">${prompt}</div>
                   <div class="wt-sentence-text">${blankOutSentence(sentence)}</div>
                   <div class="wt-sentence-hint">= ${escHtml(pair.translation)}</div>`
                : escHtml(t.wt_sentence_no_examples || 'Для цих слів поки немає прикладів речень');
            wtCurrentAudioPair = null;
        } else {
            // dictation: show prompt, auto-play audio, user types the word
            qEl.innerText = t.wt_dictation_prompt || 'Прослухайте та напишіть слово';
            document.getElementById('wtListenBtn').innerText = '🔊 ' + (t.wt_listen_btn || 'Прослухати');
            wtCurrentAudioPair = pair;
            setTimeout(wtPlayAudio, 350);
        }

        setTimeout(() => input.focus(), 100);

    } else {
        // Multiple-choice exercises (w2t, t2w, audio)
        typeArea.style.display = 'none';
        choicesEl.style.display = 'grid';

        if (type === 'audio') {
            qEl.innerText = t.wt_listen_prompt || 'Прослухайте та оберіть слово';
            document.getElementById('wtListenBtn').innerText = '🔊 ' + (t.wt_listen_btn || 'Прослухати');
            audioWrap.style.display = 'block';
            wtCurrentAudioPair = pair;
            setTimeout(wtPlayAudio, 350);
        } else {
            audioWrap.style.display = 'none';
            wtCurrentAudioPair = null;
            qEl.innerText = type === 'w2t' ? pair.word : pair.translation;
        }

        // Generate choices
        const correctAnswer = type === 'w2t' ? pair.translation : pair.word;
        const distractors = getWtDistractors(pair, validPairs, type, choiceCount - 1);
        const choices = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

        choicesEl.className = 'wt-choices' + (choices.length === 2 ? ' wt-choices-col1' : '');
        choicesEl.innerHTML = choices.map(ch =>
            `<button class="wt-choice" data-correct="${ch === correctAnswer}"
                     onclick="wtSelectChoice(this, ${ch === correctAnswer})">${escHtml(ch)}</button>`
        ).join('');
    }

    // Кожна вправа перемальовує choices/input наново (innerHTML) — inline
    // fontSize з попереднього виклику applyFontSize() злітає разом з розміткою,
    // тому застосовуємо знову ПІСЛЯ рендеру розмітки цієї вправи, не лише при вході в екран.
    applyFontSize();
}

function getWtDistractors(correct, all, type, count) {
    const key = type === 'w2t' ? 'translation' : 'word';
    const correctVal = correct[key];
    const pool = all.filter(p => p[key] && p[key] !== correctVal).map(p => p[key]);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

function wtSelectChoice(btn, isCorrect) {
    if (btn.disabled) return;
    const t = translations[currentLang];
    const ex = wtQueue[wtIndex];
    if (!ex.attempts) ex.attempts = 0;

    const feedback = document.getElementById('wtFeedback');
    const nextBtn = document.getElementById('wtNextBtn');
    const skipBtn = document.getElementById('wtSkipWordBtn');

    if (isCorrect) {
        // Success
        if (ex.attempts === 0) wtCorrect++;  // only 1st-try counts
        btn.classList.add('wt-correct');
        document.querySelectorAll('.wt-choice').forEach(b => b.disabled = true);

        feedback.className = 'wt-feedback wt-fb-correct';
        // For audio: show word + translation in feedback.
        // For truefalse: if the shown translation was the FAKE one (tfCorrect===false,
        // user correctly guessed "Неправда"), the real translation was never displayed
        // anywhere — reveal it here too, same pattern as audio (FB-01).
        if (ex.type === 'audio' && ex.pair.translation) {
            feedback.innerHTML = (t.wt_correct || '✓ Правильно!') +
                `<div class="wt-reveal-word"><b>${escHtml(ex.pair.word)}</b><span class="wt-reveal-arrow">→</span>${escHtml(ex.pair.translation)}</div>`;
        } else if (ex.type === 'truefalse' && ex.tfCorrect === false && ex.pair.translation) {
            feedback.innerHTML = (t.wt_correct || '✓ Правильно!') +
                `<div class="wt-reveal-word"><b>${escHtml(ex.pair.word)}</b><span class="wt-reveal-arrow">→</span>${escHtml(ex.pair.translation)}</div>`;
        } else {
            feedback.innerText = t.wt_correct || '✓ Правильно!';
        }
        feedback.style.display = 'block';
        if (skipBtn) skipBtn.style.display = 'none';
        nextBtn.innerText = (wtIndex + 1 < wtQueue.length) ? (t.next || 'Далі') + ' →' : (t.done || 'Готово');
        nextBtn.style.display = 'block';
        ex.correct = (ex.attempts === 0);

    } else {
        ex.attempts++;
        btn.classList.add('wt-wrong');
        btn.disabled = true; // disable only this wrong choice

        if (ex.attempts >= 2) {
            // 2nd miss — reveal correct, requeue this word for later, and move on
            document.querySelector('.wt-choice[data-correct="true"]')?.classList.add('wt-reveal');
            document.querySelectorAll('.wt-choice').forEach(b => b.disabled = true);
            feedback.className = 'wt-feedback wt-fb-wrong';
            // truefalse: the button reveal above only marks which BUTTON ("Правда"/
            // "Неправда") was correct — it never shows the actual translation. When the
            // shown translation was fake (tfCorrect===false), also surface the real one
            // here, same reveal pattern as dictation's wrong-answer case (FB-01).
            if (ex.type === 'truefalse' && ex.tfCorrect === false && ex.pair.translation) {
                feedback.innerHTML = (t.wt_wrong || 'Упс, спробуйте ще раз') +
                    `<div class="wt-reveal-word wt-reveal-word-wrong"><b>${escHtml(ex.pair.word)}</b><span class="wt-reveal-arrow">→</span>${escHtml(ex.pair.translation)}</div>`;
            } else {
                feedback.innerText = t.wt_wrong || 'Упс, спробуйте ще раз';
            }
            feedback.style.display = 'block';
            if (skipBtn) skipBtn.style.display = 'none';
            ex.correct = false;
            requeueWtExercise(ex);
            nextBtn.innerText = (wtIndex + 1 < wtQueue.length) ? (t.next || 'Далі') + ' →' : (t.done || 'Готово');
            nextBtn.style.display = 'block';
        } else {
            // 1st miss — let them try again, just show hint
            feedback.className = 'wt-feedback wt-fb-wrong';
            feedback.innerText = t.wt_wrong || 'Упс, спробуйте ще раз';
            feedback.style.display = 'block';
        }
    }
}

// ===== MATCH EXERCISE (type: 'match') =====
// Один пункт черги = один раунд (до 6 пар, buildMatchRounds()). Клік по слову
// й перекладу з протилежних колонок — якщо індекси пари збігаються, пара
// "закривається"; інакше коротка помилка й обидві кнопки розблоковуються.
// wtMatchSelWord/wtMatchSelTrans — транзієнтний UI-стан вибору (НЕ зберігається
// в ex, скидається щорендеру), на відміну від pairResults/mistakeCount, які
// живуть на самому об'єкті вправи й переживають saveWtProgress()/reload.
let wtMatchSelWord = null, wtMatchSelTrans = null;

function shuffleIndices(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    return arr.sort(() => Math.random() - 0.5);
}

function renderWtMatchExercise(ex) {
    if (!ex.pairResults) ex.pairResults = new Array(ex.pairs.length).fill(undefined);
    if (!ex.pairHadMistake) ex.pairHadMistake = new Array(ex.pairs.length).fill(false);
    if (!ex.wordOrder) ex.wordOrder = shuffleIndices(ex.pairs.length);
    if (!ex.transOrder) ex.transOrder = shuffleIndices(ex.pairs.length);
    // doneOrder — порядок ЗАВЕРШЕННЯ пар (FB-15), окремо від wordOrder/transOrder
    // (порядок показу в нетасованих колонках). Старий збережений прогрес (до
    // FB-15) має pairResults, але не doneOrder — при першому рендері такого
    // знімка бекфілимо doneOrder за індексом пари (реальний порядок завершення
    // для старих даних невідомий, індексний порядок — найкраще наближення,
    // і жодна пара не губиться/не дублюється в done-області).
    if (!ex.doneOrder) ex.doneOrder = [];
    ex.pairResults.forEach((r, i) => {
        if (r === true && !ex.doneOrder.includes(i)) ex.doneOrder.push(i);
    });
    wtMatchSelWord = null;
    wtMatchSelTrans = null;

    const wordsCol = document.getElementById('wtMatchWordsCol');
    const transCol = document.getElementById('wtMatchTransCol');
    const doneArea = document.getElementById('wtMatchDoneArea');
    wordsCol.innerHTML = ex.wordOrder.filter(pi => ex.pairResults[pi] !== true).map(pi =>
        `<button class="wt-match-chip" data-idx="${pi}" onclick="wtMatchSelect('word', ${pi})">${escHtml(ex.pairs[pi].word)}</button>`
    ).join('');
    transCol.innerHTML = ex.transOrder.filter(pi => ex.pairResults[pi] !== true).map(pi =>
        `<button class="wt-match-chip" data-idx="${pi}" onclick="wtMatchSelect('trans', ${pi})">${escHtml(ex.pairs[pi].translation)}</button>`
    ).join('');
    if (doneArea) {
        doneArea.innerHTML = ex.doneOrder.map(pi =>
            `<div class="wt-match-done-row"><b>${escHtml(ex.pairs[pi].word)}</b><span class="wt-reveal-arrow">→</span>${escHtml(ex.pairs[pi].translation)}</div>`
        ).join('');
    }

    if (ex.pairResults.every(r => r === true)) wtMatchFinishRound(ex);
}

function wtMatchSelect(side, pairIdx) {
    const ex = wtQueue[wtIndex];
    if (!ex || ex.type !== 'match' || ex.pairResults[pairIdx] === true) return;

    if (side === 'word') wtMatchSelWord = wtMatchSelWord === pairIdx ? null : pairIdx;
    else wtMatchSelTrans = wtMatchSelTrans === pairIdx ? null : pairIdx;

    document.querySelectorAll('#wtMatchWordsCol .wt-match-chip').forEach(b =>
        b.classList.toggle('wt-match-selected', Number(b.dataset.idx) === wtMatchSelWord));
    document.querySelectorAll('#wtMatchTransCol .wt-match-chip').forEach(b =>
        b.classList.toggle('wt-match-selected', Number(b.dataset.idx) === wtMatchSelTrans));

    if (wtMatchSelWord === null || wtMatchSelTrans === null) return;

    if (wtMatchSelWord === wtMatchSelTrans) {
        ex.pairResults[wtMatchSelWord] = true;
        if (!ex.doneOrder) ex.doneOrder = [];
        ex.doneOrder.push(wtMatchSelWord);
        wtMatchSelWord = null;
        wtMatchSelTrans = null;
        saveWtProgress();
        // Повний перерендер — природно "переносить" пару з колонок у
        // done-область (замість точкового додавання класів, як раніше);
        // renderWtMatchExercise сама викликає wtMatchFinishRound, коли всі
        // пари зматчені, тому окремий виклик тут не потрібен.
        renderWtMatchExercise(ex);
    } else {
        const wordBtn = document.querySelector(`#wtMatchWordsCol .wt-match-chip[data-idx="${wtMatchSelWord}"]`);
        const transBtn = document.querySelector(`#wtMatchTransCol .wt-match-chip[data-idx="${wtMatchSelTrans}"]`);
        ex.mistakeCount = (ex.mistakeCount || 0) + 1;
        ex.pairHadMistake[wtMatchSelWord] = true;
        ex.pairHadMistake[wtMatchSelTrans] = true;
        wordBtn.classList.add('wt-match-wrong');
        transBtn.classList.add('wt-match-wrong');
        wtMatchSelWord = null;
        wtMatchSelTrans = null;
        saveWtProgress();
        setTimeout(() => {
            wordBtn.classList.remove('wt-match-wrong', 'wt-match-selected');
            transBtn.classList.remove('wt-match-wrong', 'wt-match-selected');
        }, 500);
    }
}

// roundScored захищає від подвійного нарахування wtCorrect, якщо раунд
// довелось перерендерити вже завершеним (напр. reload рівно між останньою
// парою і кліком "Далі" — ex.correct не встиг потрапити у збережений знімок,
// а pairResults уже всі true).
function wtMatchFinishRound(ex) {
    const t = translations[currentLang];
    ex.correct = !ex.mistakeCount;
    if (ex.correct && !ex.roundScored) wtCorrect++;
    ex.roundScored = true;
    const feedback = document.getElementById('wtFeedback');
    feedback.className = 'wt-feedback ' + (ex.correct ? 'wt-fb-correct' : 'wt-fb-wrong');
    feedback.innerText = ex.correct ? (t.wt_correct || '✓ Правильно!') : (t.wt_match_mistakes || 'Готово, але були помилки');
    feedback.style.display = 'block';
    const nextBtn = document.getElementById('wtNextBtn');
    nextBtn.innerText = (wtIndex + 1 < wtQueue.length) ? (t.next || 'Далі') + ' →' : (t.done || 'Готово');
    nextBtn.style.display = 'block';
    saveWtProgress();
}

// ===== LISTEN & PICK (type: 'listen') =====
// Один пункт черги = один раунд (до 6 слів, buildListenRounds()). Кнопка
// "Прослухати" озвучує ЛИШЕ підмножину слів (ex.spokenIndices) у випадковому
// порядку з паузами; студент відмічає на сітці ЯКІ слова, на його думку,
// прозвучали, і підтверджує "Перевірити" — одна спроба на раунд (без
// requeue/2-мисс, як у MC-типів; на відміну від Match тут немає негайного
// фідбеку по кожному кліку, лише по всьому раунду одразу).
function renderWtListenExercise(ex) {
    const t = translations[currentLang];
    if (!ex.selected) ex.selected = [];
    document.getElementById('wtListenPlayLabel').innerText = t.wt_listen_btn || 'Прослухати';
    document.getElementById('wtListenCheckBtn').innerText = t.wt_check || 'Перевірити';
    const checkBtn = document.getElementById('wtListenCheckBtn');
    checkBtn.style.display = ex.correct === undefined ? 'block' : 'none';
    renderWtListenChips(ex);
}

function renderWtListenChips(ex) {
    const grid = document.getElementById('wtListenGrid');
    const revealed = ex.correct !== undefined;
    const spokenSet = new Set(ex.spokenIndices);
    grid.innerHTML = ex.pairs.map((p, i) => {
        const sel = (ex.selected || []).includes(i);
        let cls = 'wt-listen-chip';
        if (sel) cls += ' wt-listen-selected';
        if (revealed) {
            if (spokenSet.has(i)) cls += ' wt-listen-correct-answer';
            else if (sel) cls += ' wt-listen-wrong-answer';
        }
        return `<button class="${cls}" data-idx="${i}" ${revealed ? 'disabled' : ''} onclick="wtListenToggle(${i})">${escHtml(p.word)}</button>`;
    }).join('');
}

async function wtListenPlayRound() {
    const ex = wtQueue[wtIndex];
    if (!ex || ex.type !== 'listen' || ex.playing) return;
    const t = translations[currentLang];
    const lang = WT_TTS_LANG[wordLangFrom] || langToSpeech[wordLangFrom] || 'en-US';
    await getVoicesReady();
    if (wtQueue[wtIndex] !== ex) return; // перейшли далі, поки чекали голоси
    const voice = wtPickVoice(lang);
    if (!voice) {
        showMotivToast(t.audio_tts_unavailable || 'Аудіо недоступне для цієї мови');
        return;
    }
    ex.playing = true;
    if (!ex.playOrder) ex.playOrder = [...ex.spokenIndices].sort(() => Math.random() - 0.5);
    window.speechSynthesis.cancel();
    for (const idx of ex.playOrder) {
        if (wtQueue[wtIndex] !== ex) break; // вийшли з раунду під час програвання
        await new Promise(resolve => {
            const utt = new SpeechSynthesisUtterance(ex.pairs[idx].word);
            utt.lang = lang;
            utt.rate = wtAudioRate;
            utt.voice = voice;
            utt.onend = resolve;
            utt.onerror = resolve;
            window.speechSynthesis.speak(utt);
        });
        await new Promise(r => setTimeout(r, 450));
    }
    ex.playing = false;
}

function wtListenToggle(idx) {
    const ex = wtQueue[wtIndex];
    if (!ex || ex.type !== 'listen' || ex.correct !== undefined) return;
    if (!ex.selected) ex.selected = [];
    const pos = ex.selected.indexOf(idx);
    if (pos >= 0) ex.selected.splice(pos, 1); else ex.selected.push(idx);
    saveWtProgress();
    renderWtListenChips(ex);
}

function wtListenCheck() {
    const ex = wtQueue[wtIndex];
    if (!ex || ex.type !== 'listen' || ex.correct !== undefined) return;
    const t = translations[currentLang];
    const selectedSet = new Set(ex.selected || []);
    const spokenSet = new Set(ex.spokenIndices);
    const isCorrect = selectedSet.size === spokenSet.size && [...selectedSet].every(i => spokenSet.has(i));
    ex.correct = isCorrect;
    if (isCorrect) wtCorrect++;
    renderWtListenChips(ex);
    document.getElementById('wtListenCheckBtn').style.display = 'none';

    const feedback = document.getElementById('wtFeedback');
    feedback.className = 'wt-feedback ' + (isCorrect ? 'wt-fb-correct' : 'wt-fb-wrong');
    if (isCorrect) {
        // Reveal word→translation for every word that actually played this round,
        // same reveal pattern as the audio/dictation exercises (FB-02).
        const revealHtml = ex.spokenIndices
            .map(i => ex.pairs[i])
            .filter(p => p && p.translation)
            .map(p => `<div class="wt-reveal-word"><b>${escHtml(p.word)}</b><span class="wt-reveal-arrow">→</span>${escHtml(p.translation)}</div>`)
            .join('');
        feedback.innerHTML = (t.wt_correct || '✓ Правильно!') + revealHtml;
    } else {
        feedback.innerText = t.wt_match_mistakes || 'Готово, але були помилки';
    }
    feedback.style.display = 'block';
    const nextBtn = document.getElementById('wtNextBtn');
    nextBtn.innerText = (wtIndex + 1 < wtQueue.length) ? (t.next || 'Далі') + ' →' : (t.done || 'Готово');
    nextBtn.style.display = 'block';
    saveWtProgress();
}

function wtShowHint() {
    const ex = wtQueue[wtIndex];
    if (!ex) return;
    const hintBtn = document.getElementById('wtHintBtn');
    const input = document.getElementById('wtTypeInput');

    const normalized = normalizeAnswer(ex.pair.word);
    const correctTokens = normalized.split(' ').filter(Boolean);

    let hint;
    if (correctTokens.length <= 1) {
        // Single word: show first 2 chars
        hint = normalized.slice(0, 2);
        ex.hintUsed = true;
        hintBtn.disabled = true;
        hintBtn.classList.add('wt-hint-used');
    } else {
        // FB-40 (2026-08-11, User): раніше підказка для фрази була ПРОГРЕСИВНОЮ —
        // кожне повторне натискання відкривало ще одне слово, і при кількох
        // натисканнях (природний рух, коли одного слова не досить, щоб згадати
        // решту) підказка врешті видавала ВСЮ фразу цілком. User: "не має
        // показувати всю тільки частину а далі вже сам має додумати" — той самий
        // принцип, що вже діє для одного слова вище (перші 2 літери, кнопка
        // одразу вимикається, ще раз не натиснути). Тепер і фраза: лише ПЕРШЕ
        // слово, кнопка одразу деактивується — решту треба додумати самостійно.
        hint = correctTokens[0];
        ex.hintUsed = true;
        hintBtn.disabled = true;
        hintBtn.classList.add('wt-hint-used');
    }

    input.value = hint;
    input.focus();
    setTimeout(() => { input.selectionStart = input.selectionEnd = hint.length; }, 0);

    // Clear any wrong state since user is retrying with hint
    input.classList.remove('wt-input-wrong');
    const wrap = document.querySelector('.wt-type-wrap');
    if (wrap) wrap.classList.remove('wt-wrap-wrong');
    const fb = document.getElementById('wtFeedback');
    if (fb) fb.style.display = 'none';
}

// FB-48 (2026-08-13): "🗣️ Скажи" — ASR-аналог до "✏️ Напиши" (spell), той
// самий напрямок: показують переклад (рідною мовою), просять відповісти
// словом мовою навчання — тільки голосом замість клавіатури. Розпізнається
// мовою wordLangFrom (мова навчання, бо кажуть саме слово, не переклад).
// Той самий мікрофонний флоу, що й startVoiceRecord() у audio.js (Text Mode
// "Голосом"), але зав'язаний на Words Mode DOM (#wtSpeakWrap/#wtMicRecording)
// і на wtCheckSpoken() замість showWritingResult() — рахунок і фідбек мають
// виглядати як в інших wt-вправах.
async function wtStartSpeak() {
    const t = translations[currentLang];
    const ex = wtQueue[wtIndex];
    if (!ex) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const feedback = document.getElementById('wtFeedback');
    const recordBtn = document.getElementById('wtSpeakRecordBtn');
    const micWrap = document.getElementById('wtMicRecording');

    const showMicError = (msg) => {
        micWrap.style.display = 'none';
        recordBtn.style.display = 'flex';
        feedback.className = 'wt-feedback wt-fb-wrong';
        feedback.innerText = msg;
        feedback.style.display = 'block';
    };

    if (!SR) { showMicError(t.audio_record_noapi || 'Запис голосу не підтримується браузером.'); return; }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // release immediately
    } catch (err) {
        const msg = (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')
            ? (t.audio_record_nomic || '🎙 Мікрофон не знайдено.')
            : (t.audio_record_denied || '🎙 Дозвольте доступ до мікрофона в налаштуваннях браузера.');
        showMicError(msg);
        return;
    }

    feedback.style.display = 'none';
    recordBtn.style.display = 'none';
    micWrap.style.display = 'flex';
    document.getElementById('wtSpeakStatus').innerText = t.audio_recording || 'Слухаю вас...';

    const recognition = new SR();
    recognition.lang = WT_TTS_LANG[wordLangFrom] || langToSpeech[wordLangFrom] || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        micWrap.style.display = 'none';
        wtCheckSpoken(spoken);
    };

    recognition.onerror = (event) => {
        const errType = event.error;
        const msg = (errType === 'not-allowed' || errType === 'permission-denied') ? (t.audio_record_denied || '🎙 Дозвольте доступ до мікрофона в налаштуваннях браузера.')
                  : errType === 'no-speech' ? (t.audio_record_nospeech || '🎙 Нічого не почуто. Говоріть голосніше.')
                  : (errType === 'audio-capture' || errType === 'not-found') ? (t.audio_record_nomic || '🎙 Мікрофон не знайдено.')
                  : (t.audio_record_error || 'Не вдалося. Спробуйте ще.');
        showMicError(msg);
    };

    recognition.onend = () => {
        if (micWrap.style.display !== 'none') showMicError(t.audio_record_error || 'Не вдалося. Спробуйте ще.');
    };

    try {
        recognition.start();
    } catch (e) {
        showMicError(t.audio_record_noapi || 'Запис голосу не підтримується браузером.');
    }
}

function wtCheckSpoken(spoken) {
    const t = translations[currentLang];
    const ex = wtQueue[wtIndex];
    if (!ex) return;

    const isCorrect = isAnswerCorrect(spoken, ex.pair.word);
    const feedback = document.getElementById('wtFeedback');
    const skipBtn = document.getElementById('wtSkipWordBtn');
    const nextBtn = document.getElementById('wtNextBtn');
    const recordBtn = document.getElementById('wtSpeakRecordBtn');

    if (isCorrect) {
        if (!ex.hadWrongSpoken) wtCorrect++;
        feedback.className = 'wt-feedback wt-fb-correct';
        feedback.innerHTML = (t.wt_correct || '✓ Правильно!') +
            `<div class="wt-reveal-word"><b>${escHtml(spoken)}</b></div>`;
        feedback.style.display = 'block';
        recordBtn.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';
        nextBtn.innerText = (wtIndex + 1 < wtQueue.length) ? (t.next || 'Далі') + ' →' : (t.done || 'Готово');
        nextBtn.style.display = 'block';
        ex.correct = !ex.hadWrongSpoken;
    } else {
        ex.hadWrongSpoken = true;
        ex.correct = false;
        feedback.className = 'wt-feedback wt-fb-wrong';
        feedback.innerHTML = (t.wt_wrong || 'Упс, спробуйте ще раз') +
            `<div class="wt-reveal-word wt-reveal-word-wrong">${escHtml(t.wt_speak_said || 'Ви сказали:')} <b>${escHtml(spoken)}</b><span class="wt-reveal-arrow">→</span>${escHtml(ex.pair.word)}</div>`;
        feedback.style.display = 'block';
        // Лишаємо кнопку запису — можна спробувати ще раз, той самий принцип retry, що й wtCheckTyped
        recordBtn.style.display = 'flex';
    }
}

function wtCheckTyped() {
    const t = translations[currentLang];
    const ex = wtQueue[wtIndex];
    if (!ex) return;

    const input = document.getElementById('wtTypeInput');
    const typed = input.value;
    if (!typed.trim()) return;

    const isCorrect = isAnswerCorrect(typed, ex.pair.word);
    const feedback = document.getElementById('wtFeedback');
    const skipBtn = document.getElementById('wtSkipWordBtn');
    const nextBtn = document.getElementById('wtNextBtn');

    const wrap = document.querySelector('.wt-type-wrap');
    if (isCorrect) {
        if (!ex.hadWrongTyped) wtCorrect++;
        input.disabled = true;
        input.classList.remove('wt-input-wrong');
        input.classList.add('wt-input-correct');
        if (wrap) { wrap.classList.remove('wt-wrap-wrong'); wrap.classList.add('wt-wrap-correct'); }
        feedback.className = 'wt-feedback wt-fb-correct';
        // Dictation: reveal translation so the meaning is clear even if it wasn't recalled
        if (ex.type === 'dictation' && ex.pair.translation) {
            feedback.innerHTML = (t.wt_correct || '✓ Правильно!') +
                `<div class="wt-reveal-word"><b>${escHtml(ex.pair.word)}</b><span class="wt-reveal-arrow">→</span>${escHtml(ex.pair.translation)}</div>`;
        } else {
            feedback.innerText = t.wt_correct || '✓ Правильно!';
        }
        feedback.style.display = 'block';
        const cb = document.getElementById('wtCheckBtn');
        if (cb) cb.style.display = 'none';
        const hb = document.getElementById('wtHintBtn');
        if (hb) hb.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';
        nextBtn.innerText = (wtIndex + 1 < wtQueue.length) ? (t.next || 'Далі') + ' →' : (t.done || 'Готово');
        nextBtn.style.display = 'block';
        ex.correct = !ex.hadWrongTyped;
    } else {
        ex.hadWrongTyped = true;
        ex.correct = false;
        input.classList.add('wt-input-wrong');
        input.classList.remove('wt-input-correct');
        if (wrap) { wrap.classList.add('wt-wrap-wrong'); wrap.classList.remove('wt-wrap-correct'); }
        feedback.className = 'wt-feedback wt-fb-wrong';
        // Dictation: reveal word + translation so the meaning is clear even if it wasn't recalled
        if (ex.type === 'dictation' && ex.pair.translation) {
            feedback.innerHTML = (t.wt_wrong || 'Упс, спробуйте ще раз') +
                `<div class="wt-reveal-word wt-reveal-word-wrong"><b>${escHtml(ex.pair.word)}</b><span class="wt-reveal-arrow">→</span>${escHtml(ex.pair.translation)}</div>`;
        } else {
            feedback.innerText = (t.wt_wrong || 'Упс, спробуйте ще раз') +
                '\n' + (t.wt_wrong_answer_was || 'Правильно:') + ' ' + ex.pair.word;
        }
        feedback.style.display = 'block';
        // Keep input enabled for retry — refocus + select so it's obvious you can
        // just start typing over it (tapping "Перевірити" blurs the field and closes
        // the mobile keyboard, which was the actual source of "не зрозуміло як")
        input.focus();
        input.select();
        // The mobile keyboard opening shrinks the visible viewport and can cover this
        // feedback text (it sits below the input) — nudge it back into view once the
        // keyboard animation settles, so "спробуйте ще раз" is actually visible.
        setTimeout(() => feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300);
    }
}

function wtSkipWord() {
    // Mark as skipped (not counted as correct or wrong), advance
    if (wtIndex < wtQueue.length) {
        wtQueue[wtIndex].correct = null; // skipped
    }
    wtIndex++;
    updateWordMastery(); // інкрементально — не чекає кінця черги
    saveWtProgress();
    renderWtExercise();
}

function wtGoBack() {
    if (wtIndex <= 0) {
        if (typeof wtReturnScreen === 'function') {
            wtReturnScreen();
        } else {
            openWordProfile(showWordLangScreen, 'progress');
        }
        return;
    }
    wtIndex--;
    const ex = wtQueue[wtIndex];
    if (ex) {
        // Undo score if this exercise was counted as correct
        if (ex.correct === true) wtCorrect = Math.max(0, wtCorrect - 1);
        ex.correct = undefined;
        ex.hintUsed = false;
        ex.hadWrongTyped = false;
        ex.attempts = 0;
        if (ex.type === 'match') {
            // Раунд matching перезапускається з нуля (нова тасовка), а не
            // з half-довершеним станом — узгоджено з тим, що інші типи теж
            // скидають attempts/hadWrongTyped при поверненні назад.
            ex.pairResults = undefined;
            ex.pairHadMistake = undefined;
            ex.wordOrder = undefined;
            ex.transOrder = undefined;
            ex.doneOrder = undefined;
            ex.mistakeCount = 0;
            ex.roundScored = false;
            ex.pairs.forEach(p => wtSettledPairs.delete(p));
        } else if (ex.type === 'listen') {
            ex.selected = [];
            ex.correct = undefined;
            ex.playOrder = undefined;
            ex.playing = false;
            ex.pairs.forEach(p => wtSettledPairs.delete(p));
        } else {
            // Ця вправа знову "не відповідена" — дозволяємо пере-оцінити mastery
            // цього слова пізніше замість заморожування попереднього значення.
            wtSettledPairs.delete(ex.pair);
        }
    }
    saveWtProgress();
    renderWtExercise();
}

// ── Smart answer matching ──────────────────────────────────
// FB-39 (2026-08-11, User): фраза/речення набране без розділових знаків (крапка
// в кінці, тире, кома тощо) мало зараховуватись правильним, якщо решта збігається
// — раніше нормалізація знімала лише дужки/лапки, розділові знаки лишались і
// ламали збіг. `.,;:!?…` та лапки-ялинки просто прибираються (не несуть сенсу для
// правильності відповіді); тире/дефіс замінюється на пробіл, а не прибирається
// зовсім — щоб "well-known" (типовий приклад) не злипався у "wellknown", коли
// користувач набирає його через пробіл.
const PUNCT_STRIP_RE = /[.,;:!?…"«»""]/g;
const PUNCT_DASH_RE = /[–—-]/g;

function normalizeAnswer(str) {
    // Removes parenthetical content entirely: "rub (the paste) into" → "rub into"
    return str
        .trim()
        .toLowerCase()
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .replace(/[''`]/g, "'")
        .replace(PUNCT_STRIP_RE, '')
        .replace(PUNCT_DASH_RE, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeNoParens(str) {
    // Removes only the paren chars, keeps content: "rub (the paste) into" → "rub the paste into"
    return str
        .trim()
        .toLowerCase()
        .replace(/[()[\]]/g, '')
        .replace(/[''`]/g, "'")
        .replace(PUNCT_STRIP_RE, '')
        .replace(PUNCT_DASH_RE, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isAnswerCorrect(typed, correct) {
    if (!typed || !typed.trim()) return false;
    // Try removing parenthetical content
    const t1 = normalizeAnswer(typed), c1 = normalizeAnswer(correct);
    if (t1 === c1) return true;
    // Try keeping content but removing paren chars: "rub the paste into" = "rub (the paste) into"
    const t2 = normalizeNoParens(typed), c2 = normalizeNoParens(correct);
    if (t2 === c2) return true;
    // Accept any alternative before ; or ,
    const alts1 = correct.split(/[;,]/).map(normalizeAnswer).filter(Boolean);
    if (alts1.some(p => t1 === p)) return true;
    const alts2 = correct.split(/[;,]/).map(normalizeNoParens).filter(Boolean);
    if (alts2.some(p => t2 === p)) return true;
    return false;
}

// ----- [W6 wtNext..wtGoHome]  (was app.js lines 4972-5018) -----

function wtNext() {
    // Reset typing input and wrapper state
    const inp = document.getElementById('wtTypeInput');
    if (inp) { inp.classList.remove('wt-input-correct', 'wt-input-wrong'); inp.value = ''; inp.disabled = false; inp.oninput = null; }
    const wr = document.querySelector('.wt-type-wrap');
    if (wr) wr.classList.remove('wt-wrap-correct', 'wt-wrap-wrong');
    const hb = document.getElementById('wtHintBtn');
    if (hb) { hb.style.display = 'none'; hb.disabled = false; hb.classList.remove('wt-hint-used'); }
    wtIndex++;
    updateWordMastery(); // інкрементально — не чекає кінця черги
    saveWtProgress();
    renderWtExercise();
}

// Унікальні пари слів, задіяні в поточній wtQueue — рахує кожне слово раз,
// незалежно від того, скільки типів вправ (w2t/t2w/audio/spell/.../truefalse)
// його практикували. 'match'/'listen' — раундові вправи з кількома парами
// одразу (ex.pairs), решта типів — одна пара на вправу (ex.pair).
function wtSessionUniquePairCount() {
    const pairs = new Set();
    wtQueue.forEach(ex => {
        if (ex.type === 'match' || ex.type === 'listen') {
            (ex.pairs || []).forEach(p => pairs.add(p));
        } else if (ex.pair) {
            pairs.add(ex.pair);
        }
    });
    return pairs.size;
}

function showWordResults() {
    updateWordMastery();
    clearWtProgress(); // сесія завершена нормально — прогрес більше не потрібен

    // FB-08: Words Mode раніше взагалі не оновлював загальну статистику
    // (streak/totalBlocks/totalMinutes, statsBar/profileHeroStats) — рахувалась
    // лише з Text Mode (learning.js:showFinal). "blocksLearned" тут = к-сть
    // УНІКАЛЬНИХ слів цієї сесії, не к-сть виконаних вправ (wtQueue.length):
    // один блок у Text Mode — це один смисловий шматок контенту, який студент
    // вивчив, а не кожен окремий повтор/прохід по ньому. Аналогічно тут —
    // одиниця вивченого контенту це слово, а не одна з ~5-9 вправ-форматів
    // (w2t/t2w/audio/spell/dictation/truefalse/match/listen), якими це
    // саме слово практикується в одному повному проході. Рахувати wtQueue.length
    // напряму завищило б "блоки" в рази порівняно з Text Mode й спотворило б
    // сенс лічильника на statsBar. updateStats() сама виходить рано, якщо N<=0.
    if (wtSessionStartTime) {
        const wordsLearned = wtSessionUniquePairCount();
        const minutesSpent = (Date.now() - wtSessionStartTime) / 60000;
        updateStats(wordsLearned, minutesSpent);
        wtSessionStartTime = null; // спожито — наступна сесія виставить свою мітку заново
    }

    const t = translations[currentLang];
    showScreen('wordResultsScreen');
    const total = wtQueue.length;
    const pct = total ? Math.round(wtCorrect / total * 100) : 0;

    const title = pct >= 90 ? (t.wt_result_perfect || '🌟 Ідеально!')
                : pct >= 70 ? (t.wt_result_great   || '🎉 Чудово!')
                : pct >= 50 ? (t.wt_result_good    || '👍 Непогано!')
                :             (t.wt_result_keep    || '💪 Продовжуй!');

    document.getElementById('wrTitle').innerText = title;
    document.getElementById('wrFraction').innerText = wtCorrect + ' / ' + total;
    document.getElementById('wrPct').innerText = pct + '%';
    document.getElementById('wrSetName').innerText = wtSet?.topic || '';
    document.getElementById('wrRestartBtn').innerText = t.wt_restart || 'Ще раз';
    document.getElementById('wrHomeBtn').innerText = t.wt_home || 'На головну';
}

function wtFinish() {
    showWordResults();
}

function wtRestart() {
    if (wtSet) startWordTraining(wtSet);
}

function wtGoHome() {
    showScreen('langScreen');
}

// ----- [W1 WORD PROFILE screen (openWordProfile/renderWordProfileList)]  (was app.js lines 3466-3509) -----
// ===== WORD PROFILE (окремий напрямок — 2026-08-07 re-split: тепер ЛИШЕ "Словник" —
// "За наборами" переїхало в progressScreen (app.js showProgressScreen), бо User:
// розподіл Бібліотека/Прогрес мав бути "за наборами" в Прогресі, Бібліотека = лише
// Словник. Один список без вкладок. Hero — profileIdentityScreen, app.js) =====

// 2026-08-07: focus-параметр історичний (D-009/D-009 addendum у DECISIONS.md) —
// нема куди скролити, сигнатура лишена незмінною, щоб не ламати виклик bottomNavGo('library').
function openWordProfile(returnFn, focus) {
    profileReturnFn = typeof returnFn === 'function' ? returnFn : showWordLangScreen;
    showScreen('wordProfileScreen');
    const t = translations[currentLang];
    document.getElementById('wordProfileBackLabel').innerText = t.back_lang || 'Назад';
    const titleEl = document.getElementById('wordLibraryTitleEl');
    if (titleEl) titleEl.innerText = t.library_title || 'Бібліотека';
    renderWordDictionary();
    updateProfileNavAvatar();
    setBottomNav('words', 'library');
}

// ===== WORD DICTIONARY (FB-09, 2026-08-07) =====
// Зведений список УСІХ окремих слів з УСІХ наборів одночасно (на відміну від
// renderWordProfileList — той показує статистику ПО НАБОРАХ, не окремі слова).
// Групування — лише на основі pair.masteryScore (0..WT_MASTERY_THRESHOLD),
// іншого сигналу зараз просто немає на кожній парі.
// ОБМЕЖЕННЯ (свідомо, задокументовано і в звіті): немає часової мітки
// останнього тренування слова (lastPracticedAt чи подібне) — тому "На
// повторення" тут means "є частковий прогрес, але ще не закріпилось"
// (0 < masteryScore < WT_MASTERY_THRESHOLD), а НЕ "вивчено давно і забувається
// з часом" (справжня recency-логіка). Щоб порахувати чесно другий варіант,
// треба буде додати timestamp на pair (напр. виставляти в updateWordMastery(),
// words.js ~636) і саме тоді переробити цю функцію — навмисно НЕ робиться
// зараз, але й нічого тут не заважає додати поле пізніше.
// FB-37/FB-38 (2026-08-11, User): "і пошук по слову і фільтр за темою/набором" +
// мовний фільтр — Словник зростатиме зі списком, без структури важко буде
// щось знайти. 3 незалежні фільтри (search AND topic AND lang), персистентні
// на екрані (module-level, не скидаються на кожен рендер).
let wdictSearch = '';
let wdictTopicFilter = null;
let wdictLangFilter = null;
function updateWdictSearch(value) {
    wdictSearch = value;
    renderWordDictionary();
    // Пошук триґерить повний re-render контейнера (той самий innerHTML-патерн,
    // що й усюди в цьому файлі) — без ручного повернення фокусу/каретки інпут
    // втрачав би фокус на кожному символі, бо стара DOM-нода знищується.
    const inp = document.getElementById('wdictSearchInput');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}
function setWdictTopicFilter(topic) {
    wdictTopicFilter = topic || null;
    renderWordDictionary();
}
function setWdictLangFilter(code) {
    wdictLangFilter = code;
    renderWordDictionary();
}

function renderWordDictionary() {
    const t = translations[currentLang];
    const container = document.getElementById('wordDictionaryContent');
    const sets = loadWordSets();

    const allTopics = [...new Set(sets.map(s => s.topic).filter(Boolean))];
    const availableLangs = [...new Set(sets.map(s => s.langFrom).filter(Boolean))];
    const q = wdictSearch.trim().toLowerCase();

    const mastered = [];
    const review = [];
    const unlearned = [];
    sets.forEach(set => {
        if (wdictTopicFilter && set.topic !== wdictTopicFilter) return;
        if (wdictLangFilter && set.langFrom !== wdictLangFilter) return;
        (set.pairs || []).forEach(p => {
            if (!p.word || !p.translation) return;
            const topic = set.topic || '—';
            if (q && !p.word.toLowerCase().includes(q) && !p.translation.toLowerCase().includes(q) && !topic.toLowerCase().includes(q)) return;
            const score = p.masteryScore || 0;
            const row = { word: p.word, translation: p.translation, topic, lang: set.langFrom };
            if (score >= WT_MASTERY_THRESHOLD) mastered.push(row);
            else if (score > 0) review.push(row);
            else unlearned.push(row);
        });
    });

    // FB-19 (переїхало з progressContent за вказівкою User, 2026-08-09: вибір
    // слів на тренування — дія над бібліотекою слів, а не над прогресом) —
    // точка входу до вибору окремих слів (з одного чи кількох наборів) для
    // тренування, замість завжди цілого набору. profileReturnFn — той самий
    // слот, яким openWordProfile відкрили цей екран, щоб "Назад" з вибору слів
    // повертав саме сюди (Бібліотека), а не на wordLangScreen напряму.
    const hasSelectableWords = sets.some(s => (s.pairs || []).some(p => p.word && p.translation));
    const selectBtn = hasSelectableWords
        ? `<button class="btn-profile-select-words" onclick="openWordSelectScreen(() => openWordProfile(profileReturnFn))">${t.profile_select_words || '🎯 Обрати слова'}</button>`
        : '';

    if (!sets.length) {
        container.innerHTML = selectBtn + `<p class="profile-empty">${t.profile_empty_words || 'Ще немає збережених наборів слів'}</p>`;
        return;
    }

    const topicOptions = `<option value=""${wdictTopicFilter ? '' : ' selected'}>${t.wdict_all_topics || 'Усі теми'}</option>` +
        allTopics.map(tp => `<option value="${escHtml(tp)}"${wdictTopicFilter === tp ? ' selected' : ''}>${escHtml(tp)}</option>`).join('');
    const controls = `<div class="word-dict-controls">
        <input type="text" id="wdictSearchInput" class="word-dict-search" placeholder="${t.wdict_search_placeholder || '🔍 Пошук слова...'}" value="${escHtml(wdictSearch)}" oninput="updateWdictSearch(this.value)">
        ${allTopics.length > 1 ? `<select class="word-dict-topic-select" onchange="setWdictTopicFilter(this.value)">${topicOptions}</select>` : ''}
      </div>` + renderLangFilterBar(wdictLangFilter, availableLangs, 'setWdictLangFilter');

    if (!mastered.length && !review.length && !unlearned.length) {
        container.innerHTML = selectBtn + controls + `<p class="profile-empty">${t.wdict_no_matches || 'Нічого не знайдено'}</p>`;
        return;
    }

    // 2026-08-07: чіп замість рядка на всю ширину — User: "не один під одним а
    // один біля одного, бо шукати неможливо". Сітка (word-dict-group-rows, CSS
    // grid) навколо чіпів всередині кожної групи, сама категоризація (mastered/
    // review/unlearned) без змін.
    const renderRow = row => `<div class="word-dict-row">
        <div class="word-dict-pair"><span class="word-dict-word">${escHtml(row.word)}</span><span class="word-dict-arrow">→</span><span class="word-dict-trans">${escHtml(row.translation)}</span></div>
        <div class="word-dict-topic">${LANG_FLAGS[row.lang] ? LANG_FLAGS[row.lang] + ' ' : ''}${escHtml(row.topic)}</div>
    </div>`;

    // Порожні групи — жодного заголовка взагалі (вимога User), не "0 слів".
    const renderGroup = (label, rows) => rows.length ? `<div class="word-dict-group">
        <div class="word-dict-group-title">${escHtml(label)}<span class="word-dict-count">${rows.length}</span></div>
        <div class="word-dict-group-rows">${rows.map(renderRow).join('')}</div>
      </div>` : '';

    container.innerHTML = selectBtn + controls +
        renderGroup(t.wdict_mastered || 'Вивчені', mastered) +
        renderGroup(t.wdict_review || 'На повторення', review) +
        renderGroup(t.wdict_unlearned || 'Не вивчені', unlearned);
}

// 2026-08-07 (re-split): переїхав з wordProfileScreen у progressScreen (Words-контекст,
// "За наборами" тепер частина Прогресу) — containerId тому обов'язковий параметр,
// дефолту на неіснуючий #wordProfileContent більше немає сенсу тримати.
// FB-38 (2026-08-11): мовний фільтр для "За наборами" — за set.langFrom (мова, яку
// вчать), не langTo (рідна/перекладна) — той самий напрям, що вже показаний у
// langPair-мета-рядку кожного набору (EN → UK тощо) нижче.
let wordSetsLangFilter = null;
function setWordSetsLangFilter(code) {
    wordSetsLangFilter = code;
    renderWordProfileList('progressContent');
}

function renderWordProfileList(containerId) {
    const t = translations[currentLang];
    const container = document.getElementById(containerId);
    if (!container) return;
    const deleteSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;

    const allSets = loadWordSets();
    if (allSets.length === 0) {
        container.innerHTML = `<p class="profile-empty">${t.profile_empty_words || 'Ще немає збережених наборів слів'}</p>`;
        return;
    }
    const availableLangs = [...new Set(allSets.map(s => s.langFrom).filter(Boolean))];
    const filterBar = renderLangFilterBar(wordSetsLangFilter, availableLangs, 'setWordSetsLangFilter');
    const sets = wordSetsLangFilter ? allSets.filter(s => s.langFrom === wordSetsLangFilter) : allSets;
    if (sets.length === 0) {
        container.innerHTML = filterBar + `<p class="profile-empty">${t.profile_empty_words || 'Ще немає збережених наборів слів'}</p>`;
        return;
    }
    container.innerHTML = filterBar + sets.map(set => {
        const total = (set.pairs || []).length;
        const mastered = (set.pairs || []).filter(p => (p.masteryScore || 0) >= WT_MASTERY_THRESHOLD).length;
        const review = total - mastered;
        const pct = total ? Math.round(mastered / total * 100) : 0;
        const rawTitle = set.topic || '—';
        const title = rawTitle.length > 60 ? rawTitle.slice(0, 60) + '…' : rawTitle;
        const langPair = `${(set.langFrom || '').toUpperCase()} → ${(set.langTo || '').toUpperCase()}`;
        const meta = `${langPair} · ${total} ${t.profile_words_total || 'слів'} · ${mastered} ${t.profile_words_mastered || 'вивчено'} · ${review} ${t.profile_words_review || 'повторити'}`;
        return `<div class="profile-item">
          <div class="profile-item-body">
            <div class="profile-item-title">${escHtml(title)}</div>
            <div class="profile-item-meta">${meta}</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="profile-item-actions">
            <button class="btn-profile-action" onclick="profileTrainWordSet(${set.id})">${t.profile_train || 'Тренувати'}</button>
            <button class="btn-profile-action btn-profile-ghost" onclick="editWordSet(${set.id})">${t.profile_edit_text || '✎ Редагувати'}</button>
            <button class="btn-profile-delete" onclick="profileDeleteWordSet(${set.id})">${deleteSvg}</button>
          </div>
        </div>`;
    }).join('');
}


// ----- [FB-19: обрати окремі слова з одного чи кількох наборів для тренування] -----
// На відміну від profileTrainWordSet (завжди весь набір) — тут користувач сам відмічає
// конкретні слова чекбоксами, або одразу весь набір ("Обрати всі" в заголовку картки).
// Комбінувати можна лише набори ОДНІЄЇ мовної пари (langFrom/langTo) — уся логіка вправ
// (wordLangFrom/wordLangTo/wordLevel, буде виставлено з першого обраного слова в
// startWordTraining) розрахована на один узгоджений напрям навчання за сесію; вибір
// слова з іншої пари відхиляється з тостом, а не мовчки ламає чергу вправ.
let wselectSelection = new Map(); // key `${setId}:${idx}` -> {setId, idx, pair, langFrom, langTo, level}
let wselectActiveLangPair = null; // {from, to} — виставляється по першому обраному слову
let wselectReturnScreen = null;

function openWordSelectScreen(returnFn) {
    wselectReturnScreen = typeof returnFn === 'function' ? returnFn : showWordLangScreen;
    wselectSelection = new Map();
    wselectActiveLangPair = null;
    showScreen('wordSelectScreen');
    const t = translations[currentLang];
    document.getElementById('wselectBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('wselectTitleEl').innerText = t.wselect_title || 'Обрати слова';
    renderWordSelectList();
    updateWselectBar();
}

function closeWordSelectScreen() {
    (wselectReturnScreen || showWordLangScreen)();
}

function renderWordSelectList() {
    const t = translations[currentLang];
    const container = document.getElementById('wselectContent');
    if (!container) return;
    const sets = loadWordSets();
    const rendered = sets.map(set => {
        const pairs = set.pairs || [];
        const rows = pairs.map((p, i) => {
            if (!p.word || !p.translation) return '';
            const key = set.id + ':' + i;
            const checked = wselectSelection.has(key);
            return `<label class="wselect-checkbox-row wselect-word-row">
              <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleWordSelect(${set.id}, ${i}, this.checked)">
              <span class="wselect-word-text">${escHtml(p.word)} → ${escHtml(p.translation)}</span>
            </label>`;
        }).join('');
        if (!rows) return '';
        const validCount = pairs.filter(p => p.word && p.translation).length;
        const selectedInSet = [...wselectSelection.values()].filter(v => v.setId === set.id).length;
        const allChecked = validCount > 0 && selectedInSet === validCount;
        const rawTitle = set.topic || '—';
        const title = rawTitle.length > 60 ? rawTitle.slice(0, 60) + '…' : rawTitle;
        const langPair = `${(set.langFrom || '').toUpperCase()} → ${(set.langTo || '').toUpperCase()}`;
        return `<div class="wselect-set-card">
          <div class="wselect-set-header">
            <label class="wselect-checkbox-row wselect-set-all">
              <input type="checkbox" ${allChecked ? 'checked' : ''} onchange="toggleSetSelectAll(${set.id}, this.checked)">
              <span class="wselect-set-title">${escHtml(title)}</span>
            </label>
            <span class="wselect-set-meta">${langPair}</span>
          </div>
          <div class="wselect-word-list">${rows}</div>
        </div>`;
    }).join('');
    container.innerHTML = rendered || `<p class="profile-empty">${t.profile_empty_words || 'Ще немає збережених наборів слів'}</p>`;
}

function updateWselectBar() {
    const t = translations[currentLang];
    const n = wselectSelection.size;
    const countEl = document.getElementById('wselectCount');
    const btn = document.getElementById('wselectStartBtn');
    if (countEl) countEl.innerText = (t.wselect_selected || 'Обрано: {n}').replace('{n}', n);
    if (btn) {
        btn.innerText = (t.wselect_start_btn || 'Тренувати ({n})').replace('{n}', n);
        btn.disabled = n === 0;
    }
}

function toggleWordSelect(setId, idx, checked) {
    const set = loadWordSets().find(s => s.id === setId);
    if (!set) return;
    const pair = (set.pairs || [])[idx];
    if (!pair) return;
    const key = setId + ':' + idx;
    if (checked) {
        const pairLang = { from: set.langFrom || 'en', to: set.langTo || 'uk' };
        if (wselectActiveLangPair && (wselectActiveLangPair.from !== pairLang.from || wselectActiveLangPair.to !== pairLang.to)) {
            showMotivToast(translations[currentLang].wselect_diff_lang_toast || 'Можна обирати слова лише в межах однієї мовної пари за раз');
            renderWordSelectList(); // знімає щойно позначений браузером чекбокс — вибір не зберігся в мапі
            updateWselectBar();
            return;
        }
        wselectActiveLangPair = pairLang;
        wselectSelection.set(key, { setId, idx, pair, langFrom: pairLang.from, langTo: pairLang.to, level: set.level || 1 });
    } else {
        wselectSelection.delete(key);
        if (wselectSelection.size === 0) wselectActiveLangPair = null;
    }
    updateWselectBar();
}

function toggleSetSelectAll(setId, checked) {
    const set = loadWordSets().find(s => s.id === setId);
    if (!set) return;
    const pairLang = { from: set.langFrom || 'en', to: set.langTo || 'uk' };
    if (checked && wselectActiveLangPair && (wselectActiveLangPair.from !== pairLang.from || wselectActiveLangPair.to !== pairLang.to)) {
        showMotivToast(translations[currentLang].wselect_diff_lang_toast || 'Можна обирати слова лише в межах однієї мовної пари за раз');
        renderWordSelectList();
        updateWselectBar();
        return;
    }
    (set.pairs || []).forEach((p, i) => {
        if (!p.word || !p.translation) return;
        const key = setId + ':' + i;
        if (checked) {
            wselectSelection.set(key, { setId, idx: i, pair: p, langFrom: pairLang.from, langTo: pairLang.to, level: set.level || 1 });
        } else {
            wselectSelection.delete(key);
        }
    });
    if (checked) wselectActiveLangPair = pairLang;
    else if (wselectSelection.size === 0) wselectActiveLangPair = null;
    renderWordSelectList();
    updateWselectBar();
}

// Будує "віртуальний" набір з обраних слів (можливо з кількох реальних наборів) і
// запускає ним звичайний startWordTraining. __originMap — pair-об'єкт → {setId, idx} —
// дозволяє updateWordMastery() записати прогрес точково назад у КОЖЕН реальний набір
// (див. коментар там), а не в неіснуючий id "__virtual_selection__".
function startSelectedWordTraining() {
    const t = translations[currentLang];
    if (!wselectSelection.size) {
        showMotivToast(t.wselect_none_toast || 'Оберіть хоча б одне слово');
        return;
    }
    const sets = loadWordSets();
    const originMap = new Map();
    const virtualPairs = [];
    let langFrom, langTo, level;
    wselectSelection.forEach(sel => {
        const set = sets.find(s => s.id === sel.setId);
        if (!set) return;
        const pair = (set.pairs || [])[sel.idx];
        if (!pair || !pair.word || !pair.translation) return;
        if (langFrom === undefined) { langFrom = set.langFrom || 'en'; langTo = set.langTo || 'uk'; level = set.level || 1; }
        virtualPairs.push(pair);
        originMap.set(pair, { setId: set.id, idx: sel.idx });
    });
    if (!virtualPairs.length) {
        showMotivToast(t.wselect_none_toast || 'Оберіть хоча б одне слово');
        return;
    }
    const virtualSet = {
        id: '__virtual_selection__',
        __virtual: true,
        __originMap: originMap,
        topic: t.wselect_title || 'Обрані слова',
        langFrom, langTo, level,
        pairs: virtualPairs
    };
    startWordTraining(virtualSet, () => openWordSelectScreen(wselectReturnScreen));
}

// ----- [W2 profileTrainWordSet/profileDeleteWordSet]  (was app.js lines 3550-3559) -----
function profileTrainWordSet(id) {
    const set = loadWordSets().find(s => s.id === id);
    if (!set) return;
    startWordTraining(set); // showScreen('wordTrainingScreen') всередині ховає поточний екран самостійно
}

function profileDeleteWordSet(id) {
    saveWordSets(loadWordSets().filter(s => s.id !== id));
    // "За наборами" тепер живе лише на progressScreen (re-split, 2026-08-07) —
    // єдине місце, звідки ця кнопка може бути натиснута.
    renderWordProfileList('progressContent');
}
