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


// ----- [W4 Words Mode screens flow + translation fetching]  (was app.js lines 3681-4256) -----
function showWordLangScreen() {
    const t = translations[currentLang];
    showScreen('wordLangScreen');
    updateProfileNavAvatar();
    applyFontSize(); // fontSizeIndex — той самий, спільний для профілю, застосувати одразу і в Words Mode
    document.getElementById('wlBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('wlTitleEl').innerText = t.wl_title || 'Мовна пара';
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
        // 3+ пробіл-розділених токенів без роздільника: якщо одна мова —
        // це просто список окремих слів; якщо дві мови — межа скриптів
        // відділяє слово від (можливо багатослівного) перекладу
        const tokens = seg.split(/\s+/).filter(Boolean);
        if (tokens.length >= 3) {
            const hasCyr = /[а-яА-ЯіІїЇєЄ'ʼ]/.test(seg);
            const hasLat = /[a-zA-Z]/.test(seg);
            if (hasCyr && hasLat) {
                const bnd = findWordBoundary(seg);
                result.push({ word: seg.slice(0, bnd).trim(), translation: seg.slice(bnd).trim() || null });
            } else {
                tokens.forEach(w => result.push({ word: w, translation: null }));
            }
            continue;
        }
        m = seg.match(/^(\S+)\s+(.+)$/);
        if (m) { result.push({ word: m[1].trim(), translation: m[2].trim() }); continue; }
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

function showWordVerifyScreen() {
    const t = translations[currentLang];
    showScreen('wordVerifyScreen');
    document.getElementById('wvBackLabel').innerText = t.back_lang || 'Назад';
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
            <span class="chip-edit-icon">✎</span>
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
        <input class="chip-edit-word" type="text" value="${escHtml(pair.word)}" placeholder="${t.wl_learning || 'слово'}">
        <span class="word-chip-arrow">→</span>
        <input class="chip-edit-trans" type="text" value="${escHtml(pair.translation || '')}" placeholder="${t.wv_no_trans || 'переклад'}">
        <button class="chip-save-btn" onclick="event.stopPropagation(); saveWordChip(${index})">✓</button>
        <button class="chip-delete-btn" onclick="event.stopPropagation(); deleteWordChip(${index})">✕</button>
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
    wordPairs[index] = { word, translation: trans || null };
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
    document.getElementById('wtTitleEl').innerText = t.wt_title || 'Назвіть тему';
    document.getElementById('wordTopicInput').placeholder = t.wt_placeholder || 'Наприклад: Тварини';
    document.getElementById('wtAutoBtn').innerText = t.wt_auto || '✨ Підібрати автоматично';
    document.getElementById('wtSaveBtn').innerText = t.wt_save || 'Зберегти →';
    // Always auto-suggest based on current wordPairs (prevents stale previous topic)
    document.getElementById('wordTopicInput').value = '';
    autoSuggestTopic();
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
    startWordTraining(newSet);
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
        if (!byPair.has(ex.pair)) byPair.set(ex.pair, []);
        byPair.get(ex.pair).push(ex);
    });
    let changed = false;
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
    });
    if (!changed) return;
    wtSet.lastTrainedAt = Date.now();

    const sets = loadWordSets();
    const idx = sets.findIndex(s => s.id === wtSet.id);
    if (idx >= 0) {
        sets[idx].pairs = wtSet.pairs;
        sets[idx].lastTrainedAt = wtSet.lastTrainedAt;
        saveWordSets(sets);
    }
}

async function startWordTraining(set) {
    const t = translations[currentLang];
    const valid = (set.pairs || []).filter(p => p.word && p.translation);
    if (!valid.length) {
        showMotivToast(t.wt_no_trans || 'Додайте переклади до слів');
        showModeScreen();
        return;
    }
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
            // Пари в збереженому JSON — окремі клоновані об'єкти після
            // JSON.parse, а не ті самі референси, що в set.pairs. Прив'язуємо
            // назад до реальних об'єктів пар цього набору (за word+translation),
            // щоб masteryScore і надалі писався в правильне місце.
            wtQueue = saved.wtQueue.map(ex => {
                const match = set.pairs.find(p => p.word === ex.pair.word && p.translation === ex.pair.translation);
                return { ...ex, pair: match || ex.pair };
            });
            wtIndex = saved.wtIndex;
            wtCorrect = saved.wtCorrect || 0;
            wtCurrentAudioPair = null;

            // Пари, чиї всі наявні на момент збереження вправи вже отримали
            // відповідь, вже підбили masteryScore ДО перезапуску (інкрементальне
            // збереження) — позначаємо їх settled, щоб updateWordMastery() не
            // нарахувала той самий "чистий прохід" вдруге.
            wtSettledPairs = new Set();
            const byPair = new Map();
            wtQueue.forEach(ex => {
                if (!byPair.has(ex.pair)) byPair.set(ex.pair, []);
                byPair.get(ex.pair).push(ex);
            });
            byPair.forEach((exs, pair) => {
                if (exs.every(e => e.correct !== undefined)) wtSettledPairs.add(pair);
            });

            showScreen('wordTrainingScreen');
            renderWtExercise();
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
    clearWtProgress();
    showScreen('wordTrainingScreen');
    renderWtExercise();
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

function buildWtQueue(pairs, timeMinutes = Infinity) {
    const rnd = arr => [...arr].sort(() => Math.random() - 0.5);
    const hasSpeech = 'speechSynthesis' in window;

    // Рівень НЕ впливає на те, які типи вправ трапляються — усі типи доступні
    // на будь-якому рівні (лише фічі браузера/наявність прикладів фільтрують пул).
    // Час — єдине, що визначає РОЗМІР черги (менше часу = менше вправ).
    // 'sentence' тимчасово вимкнено — якість речень з Google Translate
    // недостатня; повернути, коли буде нормальна генерація (див. AI-бекенд)
    const pool = ['w2t', 't2w', hasSpeech ? 'audio' : null, 'spell', hasSpeech ? 'dictation' : null].filter(Boolean);

    // "sentence" доступний лише для пар з реально знайденими прикладами —
    // фільтруємо саме цей тип по конкретному раунду пар, інші типи без змін.
    const pairsForType = (type, list) => type === 'sentence' ? list.filter(hasSentenceExamples) : list;

    const q = [];
    if (timeMinutes === Infinity) {
        // Повний прохід — по одному раунду кожного розблокованого типу
        pool.forEach(type => pairsForType(type, rnd(pairs)).forEach(p => q.push({ pair: p, type })));
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
    wtQueue.splice(insertAt, 0, { pair: ex.pair, type: ex.type });
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
    };
    document.getElementById('wtTypeBadge').innerText = badges[type] || type;

    // Reset feedback, next, skip, back
    document.getElementById('wtFeedback').style.display = 'none';
    document.getElementById('wtNextBtn').style.display = 'none';
    const skipBtn = document.getElementById('wtSkipWordBtn');
    if (skipBtn) skipBtn.style.display = 'block';
    const backBtn = document.getElementById('wtBackBtn');
    if (backBtn) backBtn.style.display = wtIndex > 0 ? 'inline-block' : 'none';

    const qEl = document.getElementById('wtQuestion');
    const audioWrap = document.getElementById('wtAudioWrap');
    const choicesEl = document.getElementById('wtChoices');
    const typeArea = document.getElementById('wtTypeArea');

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
        // For audio: show word + translation in feedback
        if (ex.type === 'audio' && ex.pair.translation) {
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
            feedback.innerText = t.wt_wrong || 'Упс, спробуйте ще раз';
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
        // Multi-word phrase: look at what user already typed and reveal next word
        const typedNorm = normalizeAnswer(input.value || '');
        const typedTokens = typedNorm.split(' ').filter(Boolean);

        // Count correctly matched words from the start
        let matchedCount = 0;
        for (let i = 0; i < typedTokens.length && i < correctTokens.length; i++) {
            if (typedTokens[i] === correctTokens[i]) {
                matchedCount = i + 1;
            } else {
                break;
            }
        }

        const showCount = Math.min(matchedCount + 1, correctTokens.length);
        hint = correctTokens.slice(0, showCount).join(' ');

        ex.hintUsed = true;
        if (hint === normalized) {
            hintBtn.disabled = true;
            hintBtn.classList.add('wt-hint-used');
        }
        // else keep button enabled so user can reveal next words one by one
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
    if (wtIndex <= 0) return;
    wtIndex--;
    const ex = wtQueue[wtIndex];
    if (ex) {
        // Undo score if this exercise was counted as correct
        if (ex.correct === true) wtCorrect = Math.max(0, wtCorrect - 1);
        ex.correct = undefined;
        ex.hintUsed = false;
        ex.hadWrongTyped = false;
        ex.attempts = 0;
        // Ця вправа знову "не відповідена" — дозволяємо пере-оцінити mastery
        // цього слова пізніше замість заморожування попереднього значення.
        wtSettledPairs.delete(ex.pair);
    }
    saveWtProgress();
    renderWtExercise();
}

// ── Smart answer matching ──────────────────────────────────
function normalizeAnswer(str) {
    // Removes parenthetical content entirely: "rub (the paste) into" → "rub into"
    return str
        .trim()
        .toLowerCase()
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .replace(/[''`]/g, "'")
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

function showWordResults() {
    updateWordMastery();
    clearWtProgress(); // сесія завершена нормально — прогрес більше не потрібен
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
    showModeScreen();
}

// ----- [W1 WORD PROFILE screen (openWordProfile/renderWordProfileList)]  (was app.js lines 3466-3509) -----
// ===== WORD PROFILE (окремий напрямок — спільні тільки ім'я+фото через renderProfileHero) =====

function openWordProfile(returnFn) {
    profileReturnFn = typeof returnFn === 'function' ? returnFn : showWordLangScreen;
    showScreen('wordProfileScreen');
    const t = translations[currentLang];
    document.getElementById('wordProfileBackLabel').innerText = t.back_lang || 'Назад';
    renderProfileHero();
    renderWordProfileList();
}

function renderWordProfileList() {
    const t = translations[currentLang];
    const container = document.getElementById('wordProfileContent');
    const deleteSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;

    const sets = loadWordSets();
    if (sets.length === 0) {
        container.innerHTML = `<p class="profile-empty">${t.profile_empty_words || 'Ще немає збережених наборів слів'}</p>`;
        return;
    }
    container.innerHTML = sets.map(set => {
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
            <button class="btn-profile-delete" onclick="profileDeleteWordSet(${set.id})">${deleteSvg}</button>
          </div>
        </div>`;
    }).join('');
}


// ----- [W2 profileTrainWordSet/profileDeleteWordSet]  (was app.js lines 3550-3559) -----
function profileTrainWordSet(id) {
    const set = loadWordSets().find(s => s.id === id);
    if (!set) return;
    startWordTraining(set); // showScreen('wordTrainingScreen') всередині ховає поточний екран самостійно
}

function profileDeleteWordSet(id) {
    saveWordSets(loadWordSets().filter(s => s.id !== id));
    renderWordProfileList();
}
