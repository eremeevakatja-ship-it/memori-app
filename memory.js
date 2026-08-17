// ===== Фокуси пам'яті — режим тренування самої пам'яті =====
// Винесено з app.js 2026-08-15: app.js уже 190 КБ і це записаний борг T-01.
// Стан — state.js, секції [S3] і [S4]. Правила — AGENTS/memory-trainer/README.md,
// доказова база — _manager/MEMORY-TRAINING-RESEARCH.md.
//
// 🔴 Три правила, реалізовані в коді, які НЕ можна тихо прибрати:
//   1. До 8 років прогрес рахуємо за ВИКОНАННЯМ техніки, не за результатом
//      пригадування (utilization deficiency: дитина робить усе правильно, а
//      результат ще не росте — бал показав би їй провал, якого немає)
//   2. Палац пам'яті доступний з 10 років, не раніше
//   3. Тригер "якщо-то" для 5-9 — тільки з готового списку фізичних подій

// Пул конкретних, легко уявних іменників. Саме конкретність робить мнемотехніку
// робочою: абстрактне слово нема з чим зв'язати образом. Слова навмисно НЕ
// беруться з Words Mode — там користувач вчить лексику, а тут тренує пам'ять,
// і змішувати ці дві задачі означало б підмінити тренування вивченням.
const MEM_WORDS = {
  uk: ['ложка','слон','парасолька','цеглина','кавун','драбина','свічка','гітара','подушка','крокодил','чайник','ковзани','лампа','морква','капелюх','велосипед','дзеркало','піаніно','валіза','сокира','м’яч','годинник','черевик','ведмідь'],
  en: ['spoon','elephant','umbrella','brick','melon','ladder','candle','guitar','pillow','crocodile','kettle','skates','lamp','carrot','hat','bicycle','mirror','piano','suitcase','axe','ball','clock','boot','bear'],
  pl: ['łyżka','słoń','parasol','cegła','arbuz','drabina','świeca','gitara','poduszka','krokodyl','czajnik','łyżwy','lampa','marchewka','kapelusz','rower','lustro','pianino','walizka','siekiera','piłka','zegar','but','niedźwiedź'],
  de: ['Löffel','Elefant','Regenschirm','Ziegel','Melone','Leiter','Kerze','Gitarre','Kissen','Krokodil','Kessel','Schlittschuhe','Lampe','Karotte','Hut','Fahrrad','Spiegel','Klavier','Koffer','Axt','Ball','Uhr','Stiefel','Bär'],
  fr: ['cuillère','éléphant','parapluie','brique','melon','échelle','bougie','guitare','oreiller','crocodile','bouilloire','patins','lampe','carotte','chapeau','vélo','miroir','piano','valise','hache','ballon','horloge','botte','ours'],
  es: ['cuchara','elefante','paraguas','ladrillo','melón','escalera','vela','guitarra','almohada','cocodrilo','hervidor','patines','lámpara','zanahoria','sombrero','bicicleta','espejo','piano','maleta','hacha','pelota','reloj','bota','oso']
};

// Приклади зв'язки для кнопки "Не придумав(ла)? Приклад" — коли дитина не
// може вигадати взаємодію сама. Шаблон, не готова відповідь для конкретної
// пари: пар (24 слова × 24 слова) забагато, щоб авторити кожну вручну.
// uk/pl — обидва слова навмисно лишаються в називному відмінку (єднальна
// конструкція "A і B ...", а не "A робить щось із B"): MEM_WORDS зберігає
// іменники лише в називному, а відмінювання під довільну пару слів код
// відтворити не може — дієслово з керуванням дало б граматично зламаний
// приклад ("перетворюється на парасолька" замість "на парасольку").
const MEM_IMAGERY_TEMPLATES = {
  uk: ['{a} і {b} раптом ожили та потоваришували', '{a} і {b} злилися в одну істоту', '{a} і {b} закружляли одне навколо одного', '{a} і {b} помінялися місцями', '{a} і {b} перетворились одне на одного'],
  en: ['{a} rides on {b}', '{a} hides under {b}', '{a} carries {b} on its head', '{a} hugs {b}', '{a} turns into {b}'],
  pl: ['{a} i {b} nagle ożyły i się zaprzyjaźniły', '{a} i {b} zlały się w jedno', '{a} i {b} zaczęły tańczyć wokół siebie', '{a} i {b} zamieniły się miejscami', '{a} i {b} zamieniły się w siebie nawzajem'],
  de: ['{a} und {b} werden plötzlich lebendig und Freunde', '{a} und {b} verschmelzen zu einem Wesen', '{a} und {b} tanzen umeinander', '{a} und {b} tauschen die Plätze', '{a} und {b} verwandeln sich ineinander'],
  fr: ['{a} chevauche {b}', '{a} se cache sous {b}', '{a} porte {b} sur la tête', '{a} serre {b} dans ses bras', '{a} se transforme en {b}'],
  es: ['{a} monta en {b}', '{a} se esconde bajo {b}', '{a} lleva {b} en la cabeza', '{a} abraza a {b}', '{a} se convierte en {b}']
};

function imageryHelpText(a, b) {
  const pool = MEM_IMAGERY_TEMPLATES[currentLang] || MEM_IMAGERY_TEMPLATES.en;
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  return tpl.replace('{a}', a).replace('{b}', b);
}

function memWords(n) {
  const pool = (MEM_WORDS[currentLang] || MEM_WORDS.en).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// Реєстр вправ. `ages` — де вправа доказово працює; порожній список означав би
// "усі", але ми його не використовуємо: кожна вправа мусить свій вік назвати.
// Джерело меж — розділ 3 дослідження, не здоровий глузд.
const MEM_EXERCISES = [
  { id: 'intent',  icon: '🔗', ages: ['5-7','8-9','10-12','13-17','18+'], open: () => startIntentExercise() },
  { id: 'recall',  icon: '⏳', ages: ['5-7','8-9','10-12','13-17','18+'], open: () => startRecallExercise() },
  { id: 'chain',   icon: '📖', ages: ['5-7','8-9','10-12','13-17','18+'], open: () => startChainExercise() },
  { id: 'imagery', icon: '🎨', ages: ['5-7','8-9'],                       open: () => startImageryExercise() },
  { id: 'palace',  icon: '🏛️', ages: ['10-12','13-17','18+'],             open: () => startPalaceExercise() }
];

let memIntentDraft = { text: '', trigger: '', step: 1 };
const MEM_KID_TRIGGERS = ['trg_pencil', 'trg_dinner', 'trg_shoes', 'trg_teeth', 'trg_bag'];

// ---------- Хаб режиму ----------

function openMemoryScreen() {
    showScreen('memoryScreen');
    setBottomNav('memory', 'learn');
    updateThemeToggleFab();
    updateProfileNavAvatar();
    renderMemoryScreen();
}

function renderMemoryScreen() {
    const t = translations[currentLang] || translations.en;
    const group = getMemoryGroup();
    document.getElementById('memBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('memTitle').innerText = t.mode_memory_label || 'Фокуси пам’яті';
    document.getElementById('memSubtitle').innerText = group ? (t.mem_subtitle || '') : (t.mem_pick_age || '');
    document.getElementById('memGroupLabel').innerText = t.mem_group_label || '';
    document.getElementById('memGroupChips').innerHTML = MEMORY_GROUPS.map(g =>
        '<button class="mem-chip' + (g === group ? ' active' : '') + '" onclick="pickMemoryGroup(\'' + g + '\')">' + g + '</button>'
    ).join('');
    renderMemoryDue();
    renderMemoryExercises(group);
    const st = getMemoryStats();
    document.getElementById('memFoot').innerText =
        st.worked > 0 ? (t.mem_worked_count || '').replace('{n}', st.worked) : '';
}

function pickMemoryGroup(g) { setMemoryGroup(g); renderMemoryScreen(); }

function renderMemoryExercises(group) {
    const t = translations[currentLang] || translations.en;
    const wrap = document.getElementById('memExerciseList');
    if (!group) { wrap.innerHTML = ''; return; }
    const intentsFull = getActiveIntentions().length >= MEMORY_MAX_INTENTIONS;

    wrap.innerHTML = MEM_EXERCISES.filter(ex => ex.ages.indexOf(group) !== -1).map(function (ex) {
        const blocked = (ex.id === 'intent' && intentsFull);
        const stat = getMemoryExercise(ex.id);
        // 🔴 Для 5-7 підпис прогресу — лише скільки разів ВИКОНАВ, без "згадав N з M".
        let note = '';
        if (stat.done > 0) {
            note = memoryScoreByExecution() || !stat.lastTotal
                ? (t.mem_done_times || '').replace('{n}', stat.done)
                : (t.mem_best_recall || '').replace('{n}', stat.bestRecalled).replace('{total}', stat.lastTotal);
        }
        return '<button class="mem-ex-card' + (blocked ? ' disabled' : '') + '" ' + (blocked ? 'disabled' : '') +
               ' onclick="openMemExercise(\'' + ex.id + '\')">' +
                 '<div class="mem-ex-icon">' + ex.icon + '</div>' +
                 '<div class="mem-ex-body">' +
                   '<div class="mem-ex-title">' + escHtml(t['mem_ex_' + ex.id + '_title'] || ex.id) + '</div>' +
                   '<div class="mem-ex-desc">' + escHtml(blocked ? (t.mem_ex_intent_full || '') : (t['mem_ex_' + ex.id + '_desc'] || '')) + '</div>' +
                   (note ? '<div class="mem-ex-note">' + escHtml(note) + '</div>' : '') +
                 '</div>' +
               '</button>';
    }).join('');
}

function openMemExercise(id) {
    const ex = MEM_EXERCISES.find(e => e.id === id);
    if (ex) ex.open();
}

// Перевірки, що назріли: і наміри ("спрацювало?"), і відкладені пригадування
function renderMemoryDue() {
    const t = translations[currentLang] || translations.en;
    const wrap = document.getElementById('memDueWrap');
    const intents = getIntentionsDueCheck();
    const recalls = getRecallsDue();
    if (!intents.length && !recalls.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
    wrap.style.display = 'block';
    wrap.innerHTML =
      intents.map(i =>
        '<div class="mem-due-card">' +
          '<div class="mem-due-q">' + escHtml(t.mem_due_q || '') + '</div>' +
          '<div class="mem-due-phrase">' + escHtml(memIntentPhrase(i.trigger, i.text)) + '</div>' +
          '<div class="mem-due-actions">' +
            '<button class="btn-small" onclick="answerIntent(\'' + i.id + '\',\'yes\')">' + escHtml(t.mem_due_yes || '') + '</button>' +
            '<button class="btn-small" onclick="answerIntent(\'' + i.id + '\',\'no\')">' + escHtml(t.mem_due_no || '') + '</button>' +
            '<button class="btn-ghost" onclick="answerIntent(\'' + i.id + '\',\'pending\')">' + escHtml(t.mem_due_pending || '') + '</button>' +
          '</div>' +
        '</div>').join('') +
      recalls.map(rc =>
        '<div class="mem-due-card">' +
          '<div class="mem-due-q">' + escHtml(t.mem_recall_due_q || '') + '</div>' +
          '<div class="mem-due-phrase">' + escHtml((t.mem_recall_due_sub || '').replace('{n}', rc.words.length)) + '</div>' +
          '<div class="mem-due-actions">' +
            '<button class="btn-small" onclick="startRecallCheck(\'' + rc.id + '\')">' + escHtml(t.mem_recall_check_btn || '') + '</button>' +
          '</div>' +
        '</div>').join('');
}

function answerIntent(id, result) {
    const t = translations[currentLang] || translations.en;
    checkIntention(id, result);
    if (result === 'yes') showMotivToast(t.mem_toast_yes || '');
    // 🔴 Тон на "Ні" — без докору: проблема в тригері, не в людині.
    if (result === 'no') showMotivToast(t.mem_toast_no || '');
    renderMemoryScreen();
}

function memIntentPhrase(trigger, text) {
    const t = translations[currentLang] || translations.en;
    const trg = MEM_KID_TRIGGERS.indexOf(trigger) !== -1 ? (t[trigger] || trigger) : trigger;
    return (t.mem_formula || 'IF {trigger}, THEN {action}').replace('{trigger}', trg).replace('{action}', text);
}

// Спільний каркас екрана вправи, щоб кожна не малювала топбар заново
function memExScreen(html) {
    showScreen('memoryExScreen');
    const t = translations[currentLang] || translations.en;
    document.getElementById('memExBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('memExBody').innerHTML = html;
}

function memStepLbl(n, total) {
    const t = translations[currentLang] || translations.en;
    return escHtml((t.mem_step || 'Крок {n} з {total}').replace('{n}', n).replace('{total}', total));
}

// ---------- MT-02 · Якщо-то (implementation intentions) ----------

function startIntentExercise() {
    memIntentDraft = { text: '', trigger: '', step: 1 };
    showScreen('memoryIntentScreen');
    renderIntentStep();
}

function renderIntentStep() {
    const t = translations[currentLang] || translations.en;
    const group = getMemoryGroup();
    const kidMode = (group === '5-7' || group === '8-9');
    document.getElementById('memIntentBackLabel').innerText = t.back_lang || 'Назад';
    const body = document.getElementById('memIntentBody');

    if (memIntentDraft.step === 1) {
        body.innerHTML =
            '<p class="mem-step-num">' + memStepLbl(1, 3) + '</p>' +
            '<p class="mem-step-q">' + escHtml(t.mem_q_action || '') + '</p>' +
            '<p class="mem-step-hint">' + escHtml(t.mem_hint_action || '') + '</p>' +
            '<input id="memIntentText" class="mem-input" maxlength="60" placeholder="' + escHtml(t.mem_ph_action || '') + '" />' +
            '<button class="btn-start-main" onclick="intentNext()">' + escHtml(t.mem_next || '') + '</button>';
        const inp = document.getElementById('memIntentText');
        inp.value = memIntentDraft.text; inp.focus();
        return;
    }
    if (memIntentDraft.step === 2) {
        // 🔴 5-9 — тільки готові фізичні тригери: дитині потрібна помітна подія,
        // а не контекст ("коли будеш у школі" не спрацює, "відкрию пенал" спрацює).
        const opts = kidMode
            ? MEM_KID_TRIGGERS.map(k => '<button class="mem-trg-btn' + (memIntentDraft.trigger === k ? ' active' : '') +
                '" onclick="pickTrigger(\'' + k + '\')">' + escHtml(t[k] || k) + '</button>').join('')
            : '<input id="memIntentTrigger" class="mem-input" maxlength="60" placeholder="' + escHtml(t.mem_ph_trigger || '') + '" />';
        body.innerHTML =
            '<p class="mem-step-num">' + memStepLbl(2, 3) + '</p>' +
            '<p class="mem-step-q">' + escHtml(t.mem_q_trigger || '') + '</p>' +
            '<p class="mem-step-hint">' + escHtml(kidMode ? (t.mem_hint_trigger_kid || '') : (t.mem_hint_trigger || '')) + '</p>' +
            '<div class="mem-trg-list">' + opts + '</div>' +
            '<button class="btn-start-main" onclick="intentNext()">' + escHtml(t.mem_next || '') + '</button>';
        const ti = document.getElementById('memIntentTrigger');
        if (ti) { ti.value = memIntentDraft.trigger; ti.focus(); }
        return;
    }
    // Крок 3 — проговорити фразу. Це і Є кодування наміру, тому вона велика й
    // окрема, а не дрібний підсумковий рядок.
    body.innerHTML =
        '<p class="mem-step-num">' + memStepLbl(3, 3) + '</p>' +
        '<p class="mem-step-q">' + escHtml(t.mem_q_say || '') + '</p>' +
        '<div class="mem-formula">' + escHtml(memIntentPhrase(memIntentDraft.trigger, memIntentDraft.text)) + '</div>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_hint_say || '') + '</p>' +
        '<button class="btn-start-main" onclick="saveIntent()">' + escHtml(t.mem_save || '') + '</button>';
}

function pickTrigger(k) { memIntentDraft.trigger = k; renderIntentStep(); }

function intentNext() {
    const t = translations[currentLang] || translations.en;
    if (memIntentDraft.step === 1) {
        const v = (document.getElementById('memIntentText').value || '').trim();
        if (!v) { showMotivToast(t.mem_need_action || ''); return; }
        memIntentDraft.text = v; memIntentDraft.step = 2; renderIntentStep(); return;
    }
    if (memIntentDraft.step === 2) {
        const ti = document.getElementById('memIntentTrigger');
        if (ti) memIntentDraft.trigger = (ti.value || '').trim();
        if (!memIntentDraft.trigger) { showMotivToast(t.mem_need_trigger || ''); return; }
        memIntentDraft.step = 3; renderIntentStep();
    }
}

function saveIntent() {
    const t = translations[currentLang] || translations.en;
    if (!addIntention(memIntentDraft.text, memIntentDraft.trigger)) { showMotivToast(t.mem_limit || ''); return; }
    bumpMemoryExercise('intent');
    showMotivToast(t.mem_saved || '');
    openMemoryScreen();
}

// ---------- MT-01 · Відкладене пригадування (spaced retrieval) ----------
// Найсильніший доказ при найменших зусиллях. Суть саме у ВІДКЛАДЕНІЙ перевірці:
// негайне пригадування майже нічого не дає, працює повернення через час.

let memRecall = { words: [], stage: 'show', checkId: null };

function startRecallExercise() {
    const group = getMemoryGroup();
    const n = (group === '5-7') ? 4 : (group === '8-9' ? 6 : 8);
    memRecall = { words: memWords(n), stage: 'show', checkId: null };
    renderRecallShow();
}

function renderRecallShow() {
    const t = translations[currentLang] || translations.en;
    memExScreen(
        '<p class="mem-step-num">' + memStepLbl(1, 2) + '</p>' +
        '<p class="mem-step-q">' + escHtml(t.mem_recall_show_q || '') + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_recall_show_hint || '') + '</p>' +
        '<div class="mem-wordgrid">' + memRecall.words.map(w => '<span class="mem-word">' + escHtml(w) + '</span>').join('') + '</div>' +
        '<button class="btn-start-main" onclick="renderRecallAnswer()">' + escHtml(t.mem_recall_ready || '') + '</button>'
    );
}

// Пригадування — вибором зі списку, де є і зайві слова. Для дитини це посильно,
// а для дорослого лишається справжнім пригадуванням, бо дистрактори з того ж пулу.
function renderRecallAnswer(checkId) {
    const t = translations[currentLang] || translations.en;
    const shown = memRecall.words;
    const pool = (MEM_WORDS[currentLang] || MEM_WORDS.en).filter(w => shown.indexOf(w) === -1);
    const distract = pool.slice(0, Math.min(shown.length, pool.length));
    const opts = shown.concat(distract).sort(() => Math.random() - 0.5);
    memRecall.checkId = checkId || null;
    memExScreen(
        '<p class="mem-step-num">' + memStepLbl(2, 2) + '</p>' +
        '<p class="mem-step-q">' + escHtml(t.mem_recall_pick_q || '') + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_recall_pick_hint || '') + '</p>' +
        '<div class="mem-wordgrid">' + opts.map(w =>
            '<button class="mem-word mem-word-btn" data-w="' + escHtml(w) + '" onclick="this.classList.toggle(\'picked\')">' + escHtml(w) + '</button>').join('') + '</div>' +
        '<button class="btn-start-main" onclick="finishRecall()">' + escHtml(t.mem_save || '') + '</button>'
    );
}

function finishRecall() {
    const t = translations[currentLang] || translations.en;
    const picked = Array.from(document.querySelectorAll('.mem-word-btn.picked')).map(b => b.dataset.w);
    const correct = picked.filter(w => memRecall.words.indexOf(w) !== -1).length;
    const total = memRecall.words.length;

    if (memRecall.checkId) {
        // Це відкладена перевірка вже збереженого набору
        const rc = loadMemoryState().recalls.find(r => r.id === memRecall.checkId);
        const stage = rc ? recallStageDue(rc) : null;
        if (stage) saveRecallResult(memRecall.checkId, stage, correct);
    } else {
        addRecallSet(memRecall.words, correct);
    }
    bumpMemoryExercise('recall', correct, total);
    // 🔴 Для 5-7 не називаємо цифру взагалі — лише що вправу зроблено.
    showMotivToast(memoryScoreByExecution()
        ? (t.mem_done_toast || '')
        : (t.mem_recall_result || '').replace('{n}', correct).replace('{total}', total));
    openMemoryScreen();
}

function startRecallCheck(id) {
    const rc = loadMemoryState().recalls.find(r => r.id === id);
    if (!rc) { openMemoryScreen(); return; }
    memRecall = { words: rc.words, stage: 'check', checkId: id };
    renderRecallAnswer(id);
}

// ---------- MT-03 · Ланцюжок-історія (story method) ----------

let memChain = { words: [], idx: 0 };

function startChainExercise() {
    const group = getMemoryGroup();
    const n = (group === '5-7') ? 5 : (group === '8-9' ? 7 : 10);
    memChain = { words: memWords(n), idx: 0 };
    renderChainStep();
}

function renderChainStep() {
    const t = translations[currentLang] || translations.en;
    const w = memChain.words[memChain.idx];
    const prev = memChain.idx > 0 ? memChain.words[memChain.idx - 1] : null;
    // 🔴 Приклад-зразок показуємо ЩОРАЗУ, а не один раз на початку:
    // production deficiency — дитина не згадає прийом сама, навіть якщо вміє.
    const prompt = prev
        ? (t.mem_chain_link || '').replace('{prev}', prev).replace('{next}', w)
        : (t.mem_chain_first || '').replace('{word}', w);
    memExScreen(
        '<p class="mem-step-num">' + escHtml((t.mem_chain_counter || '{n}/{total}')
            .replace('{n}', memChain.idx + 1).replace('{total}', memChain.words.length)) + '</p>' +
        '<div class="mem-chain-word">' + escHtml(w) + '</div>' +
        '<p class="mem-step-q">' + escHtml(prompt) + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_chain_hint || '') + '</p>' +
        '<button class="btn-start-main" onclick="chainNext()">' +
            escHtml(memChain.idx + 1 < memChain.words.length ? (t.mem_next || '') : (t.mem_chain_recall_btn || '')) + '</button>'
    );
}

function chainNext() {
    if (memChain.idx + 1 < memChain.words.length) { memChain.idx++; renderChainStep(); return; }
    renderChainRecall();
}

function renderChainRecall() {
    const t = translations[currentLang] || translations.en;
    memExScreen(
        '<p class="mem-step-q">' + escHtml(t.mem_chain_recall_q || '') + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_chain_recall_hint || '') + '</p>' +
        '<div class="mem-wordgrid" id="memChainSlots">' + memChain.words.map((w, i) =>
            '<button class="mem-word mem-word-btn" data-w="' + escHtml(w) + '" onclick="this.classList.toggle(\'picked\')">' +
            escHtml(w) + '</button>').join('') + '</div>' +
        '<button class="btn-start-main" onclick="finishChain()">' + escHtml(t.mem_save || '') + '</button>'
    );
}

function finishChain() {
    const t = translations[currentLang] || translations.en;
    const picked = Array.from(document.querySelectorAll('.mem-word-btn.picked')).length;
    bumpMemoryExercise('chain', picked, memChain.words.length);
    showMotivToast(memoryScoreByExecution()
        ? (t.mem_chain_done_kid || '')
        : (t.mem_recall_result || '').replace('{n}', picked).replace('{total}', memChain.words.length));
    openMemoryScreen();
}

// ---------- MT-08 · Повторення + інтерактивні образи (5-9) ----------
// Ядро для наймолодших. 🔴 Прогрес ТІЛЬКИ за виконанням — жодних балів,
// серій і відсотків: до 8 років результат ще не росте, і цифра збрехала б.

let memImagery = { pairs: [], idx: 0, mode: 'imagery', rehearsal: [], step: 0, help: null };
let memImageryRecall = { idx: 0, correct: 0 };

function startImageryExercise() {
    // Дві техніки чергуються між заходами: обидві доказово тренувались на 5-9
    const useRehearsal = getMemoryExercise('imagery').done % 2 === 1;
    if (useRehearsal) {
        memImagery = { mode: 'rehearsal', rehearsal: memWords(5), step: 0, pairs: [], idx: 0, help: null };
        renderRehearsalStep();
    } else {
        const w = memWords(6);
        memImagery = { mode: 'imagery', pairs: [[w[0],w[1]],[w[2],w[3]],[w[4],w[5]]], idx: 0, rehearsal: [], step: 0, help: null };
        renderImageryStep();
    }
}

function renderImageryStep() {
    const t = translations[currentLang] || translations.en;
    const p = memImagery.pairs[memImagery.idx];
    memExScreen(
        '<p class="mem-step-num">' + escHtml((t.mem_chain_counter || '{n}/{total}')
            .replace('{n}', memImagery.idx + 1).replace('{total}', memImagery.pairs.length)) + '</p>' +
        '<div class="mem-pair"><span class="mem-chain-word">' + escHtml(p[0]) + '</span>' +
            '<span class="mem-pair-plus">+</span>' +
            '<span class="mem-chain-word">' + escHtml(p[1]) + '</span></div>' +
        '<p class="mem-step-q">' + escHtml(t.mem_imagery_q || '') + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_imagery_hint || '') + '</p>' +
        (memImagery.help ? '<p class="mem-step-hint mem-imagery-example">💡 ' + escHtml(memImagery.help) + '</p>' : '') +
        (memImagery.help ? '' : '<button class="btn-ghost" onclick="imageryShowHelp()">' + escHtml(t.mem_imagery_help_btn || '') + '</button>') +
        '<button class="btn-start-main" onclick="imageryNext()">' + escHtml(t.mem_imagery_done || '') + '</button>'
    );
}

// Дитина не може вигадати зв'язку сама — показуємо один готовий приклад для
// САМЕ цієї пари (не загальну підказку, вона вже видна на кожному кроці).
function imageryShowHelp() {
    const p = memImagery.pairs[memImagery.idx];
    memImagery.help = imageryHelpText(p[0], p[1]);
    renderImageryStep();
}

function imageryNext() {
    memImagery.help = null;
    if (memImagery.idx + 1 < memImagery.pairs.length) { memImagery.idx++; renderImageryStep(); return; }
    memImageryRecall = { idx: 0, correct: 0 };
    renderImageryRecallStep();
}

// Продовження, без якого вправа нічого не тренує: показуємо одне слово з
// пари, просимо згадати друге. Дистрактори — інші слова з набору й пулу.
function renderImageryRecallStep() {
    const t = translations[currentLang] || translations.en;
    const pair = memImagery.pairs[memImageryRecall.idx];
    const cue = pair[0], answer = pair[1];
    const otherAnswers = memImagery.pairs.filter((_, i) => i !== memImageryRecall.idx).map(p => p[1]);
    const used = memImagery.pairs.reduce((acc, p) => acc.concat(p), []);
    const pool = (MEM_WORDS[currentLang] || MEM_WORDS.en).filter(w => used.indexOf(w) === -1);
    const distract = otherAnswers.concat(pool).slice(0, 2);
    const opts = [answer].concat(distract).sort(() => Math.random() - 0.5);
    memExScreen(
        '<p class="mem-step-num">' + escHtml((t.mem_chain_counter || '{n}/{total}')
            .replace('{n}', memImageryRecall.idx + 1).replace('{total}', memImagery.pairs.length)) + '</p>' +
        '<div class="mem-chain-word">' + escHtml(cue) + '</div>' +
        '<p class="mem-step-q">' + escHtml(t.mem_imagery_recall_q || '') + '</p>' +
        '<div class="mem-wordgrid">' + opts.map(w =>
            '<button class="mem-word mem-word-btn" data-w="' + escHtml(w) + '" onclick="pickImageryRecall(this)">' + escHtml(w) + '</button>').join('') + '</div>'
    );
}

function pickImageryRecall(btn) {
    const pair = memImagery.pairs[memImageryRecall.idx];
    if (btn.dataset.w === pair[1]) memImageryRecall.correct++;
    memImageryRecall.idx++;
    if (memImageryRecall.idx < memImagery.pairs.length) { renderImageryRecallStep(); return; }
    finishImageryRecall();
}

function finishImageryRecall() {
    const t = translations[currentLang] || translations.en;
    bumpMemoryExercise('imagery', memImageryRecall.correct, memImagery.pairs.length);
    showMotivToast(memoryScoreByExecution()
        ? (t.mem_done_toast || '')
        : (t.mem_recall_result || '').replace('{n}', memImageryRecall.correct).replace('{total}', memImagery.pairs.length));
    openMemoryScreen();
}

function renderRehearsalStep() {
    const t = translations[currentLang] || translations.en;
    const upTo = memImagery.rehearsal.slice(0, memImagery.step + 1);
    memExScreen(
        '<p class="mem-step-num">' + escHtml((t.mem_chain_counter || '{n}/{total}')
            .replace('{n}', memImagery.step + 1).replace('{total}', memImagery.rehearsal.length)) + '</p>' +
        '<p class="mem-step-q">' + escHtml(t.mem_rehearsal_q || '') + '</p>' +
        '<div class="mem-wordgrid">' + upTo.map(w => '<span class="mem-word">' + escHtml(w) + '</span>').join('') + '</div>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_rehearsal_hint || '') + '</p>' +
        '<button class="btn-start-main" onclick="rehearsalNext()">' + escHtml(t.mem_rehearsal_done || '') + '</button>'
    );
}

function rehearsalNext() {
    if (memImagery.step + 1 < memImagery.rehearsal.length) { memImagery.step++; renderRehearsalStep(); return; }
    renderRehearsalCheck();
}

// Продовження: слова ховаються, і дитина (чи хтось поруч) підтверджує, чи
// вийшло сказати всі без підказки — самозвіт, бо в 5-9 набирати текст важко,
// а мовний ввід тут недоступний.
function renderRehearsalCheck() {
    const t = translations[currentLang] || translations.en;
    memExScreen(
        '<p class="mem-step-q">' + escHtml((t.mem_rehearsal_check_q || '').replace('{n}', memImagery.rehearsal.length)) + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_rehearsal_check_hint || '') + '</p>' +
        '<div class="mem-due-actions">' +
          '<button class="btn-small" onclick="finishRehearsal(true)">' + escHtml(t.mem_due_yes || '') + '</button>' +
          '<button class="btn-small" onclick="finishRehearsal(false)">' + escHtml(t.mem_due_no || '') + '</button>' +
        '</div>'
    );
}

function finishRehearsal(ok) {
    const t = translations[currentLang] || translations.en;
    bumpMemoryExercise('imagery', ok ? memImagery.rehearsal.length : 0, memImagery.rehearsal.length);
    showMotivToast(memoryScoreByExecution()
        ? (t.mem_done_toast || '')
        : (ok ? (t.mem_toast_yes || '') : (t.mem_toast_no || '')));
    openMemoryScreen();
}

// ---------- MT-05 · Палац пам'яті (10+) ----------
// 🔴 Вік 10+ забезпечується реєстром MEM_EXERCISES: раніше техніка доказово
// не працює, бо потрібна абстрактна просторова структура.
// Маршрут задається один раз і перевикористовується — у цьому вся суть палацу.

let memPalace = { items: [], idx: 0 };

function startPalaceExercise() {
    if (getPalaceLocations().length < 5) { renderPalaceSetup(); return; }
    const locs = getPalaceLocations();
    memPalace = { items: memWords(locs.length), idx: 0 };
    renderPalaceWalk();
}

function renderPalaceSetup() {
    const t = translations[currentLang] || translations.en;
    const cur = getPalaceLocations();
    let rows = '';
    for (let i = 0; i < 10; i++) {
        rows += '<input class="mem-input mem-loc-input" data-i="' + i + '" maxlength="40" placeholder="' +
                escHtml((t.mem_palace_loc_ph || '{n}').replace('{n}', i + 1)) + '" value="' + escHtml(cur[i] || '') + '" />';
    }
    memExScreen(
        '<p class="mem-step-q">' + escHtml(t.mem_palace_setup_q || '') + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_palace_setup_hint || '') + '</p>' +
        rows +
        '<button class="btn-start-main" onclick="savePalace()">' + escHtml(t.mem_save || '') + '</button>'
    );
}

function savePalace() {
    const t = translations[currentLang] || translations.en;
    const vals = Array.from(document.querySelectorAll('.mem-loc-input')).map(i => i.value);
    const clean = vals.filter(v => (v || '').trim());
    if (clean.length < 5) { showMotivToast(t.mem_palace_need5 || ''); return; }
    savePalaceLocations(vals);
    startPalaceExercise();
}

function renderPalaceWalk() {
    const t = translations[currentLang] || translations.en;
    const locs = getPalaceLocations();
    const loc = locs[memPalace.idx];
    const item = memPalace.items[memPalace.idx];
    memExScreen(
        '<p class="mem-step-num">' + escHtml((t.mem_chain_counter || '{n}/{total}')
            .replace('{n}', memPalace.idx + 1).replace('{total}', memPalace.items.length)) + '</p>' +
        '<div class="mem-formula">' + escHtml((t.mem_palace_place || '{item} → {loc}')
            .replace('{item}', item).replace('{loc}', loc)) + '</div>' +
        '<p class="mem-step-q">' + escHtml(t.mem_palace_q || '') + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_palace_hint || '') + '</p>' +
        '<button class="btn-start-main" onclick="palaceNext()">' +
            escHtml(memPalace.idx + 1 < memPalace.items.length ? (t.mem_next || '') : (t.mem_chain_recall_btn || '')) + '</button>'
    );
}

function palaceNext() {
    if (memPalace.idx + 1 < memPalace.items.length) { memPalace.idx++; renderPalaceWalk(); return; }
    renderPalaceRecall();
}

// Пригадування — по маршруту, локація за локацією: саме проходження маршруту
// і є прийом, тому питаємо в порядку локацій, а не списком.
function renderPalaceRecall() {
    const t = translations[currentLang] || translations.en;
    const locs = getPalaceLocations();
    memExScreen(
        '<p class="mem-step-q">' + escHtml(t.mem_palace_recall_q || '') + '</p>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_palace_recall_hint || '') + '</p>' +
        locs.slice(0, memPalace.items.length).map((l, i) =>
            '<div class="mem-loc-row"><span class="mem-loc-name">' + escHtml(l) + '</span>' +
            '<input class="mem-input mem-loc-answer" data-i="' + i + '" maxlength="40" /></div>').join('') +
        '<button class="btn-start-main" onclick="finishPalace()">' + escHtml(t.mem_save || '') + '</button>'
    );
}

function finishPalace() {
    const t = translations[currentLang] || translations.en;
    const answers = Array.from(document.querySelectorAll('.mem-loc-answer'));
    let ok = 0;
    answers.forEach(inp => {
        const i = parseInt(inp.dataset.i, 10);
        if ((inp.value || '').trim().toLowerCase() === (memPalace.items[i] || '').toLowerCase()) ok++;
    });
    bumpMemoryExercise('palace', ok, memPalace.items.length);
    showMotivToast((t.mem_recall_result || '').replace('{n}', ok).replace('{total}', memPalace.items.length));
    openMemoryScreen();
}

// ---------- Журнал: "Спрацювало" / "В роботі" ----------

let memLogView = 'worked';

function openMemoryLog(view) {
    memLogView = view;
    showScreen('memoryLogScreen');
    setBottomNav('memory', view === 'worked' ? 'library' : 'progress');
    updateThemeToggleFab();
    updateProfileNavAvatar();
    renderMemoryLog();
}

function renderMemoryLog() {
    const t = translations[currentLang] || translations.en;
    const all = loadMemoryState().intentions;
    const worked = memLogView === 'worked';
    const items = worked ? all.filter(i => i.result === 'yes') : all.filter(i => !i.checkedAt);

    document.getElementById('memLogBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('memLogTitle').innerText = worked ? (t.mem_log_worked_title || '') : (t.mem_log_active_title || '');
    document.getElementById('memLogSubtitle').innerText = worked ? (t.mem_log_worked_sub || '') : (t.mem_log_active_sub || '');

    const wrap = document.getElementById('memLogList');
    // У "В роботі" показуємо ще й лічильники вправ — це і є прогрес режиму
    let exHtml = '';
    if (!worked) {
        const group = getMemoryGroup();
        exHtml = MEM_EXERCISES.filter(e => e.ages.indexOf(group) !== -1).map(function (e) {
            const st = getMemoryExercise(e.id);
            if (!st.done) return '';
            return '<div class="mem-log-item"><div class="mem-log-phrase">' + e.icon + ' ' +
                   escHtml(t['mem_ex_' + e.id + '_title'] || e.id) + ' — ' +
                   escHtml((t.mem_done_times || '').replace('{n}', st.done)) + '</div></div>';
        }).join('');
    }
    if (!items.length && !exHtml) {
        wrap.innerHTML = '<p class="mem-log-empty">' +
            escHtml(worked ? (t.mem_log_empty_worked || '') : (t.mem_log_empty_active || '')) + '</p>';
        return;
    }
    wrap.innerHTML = exHtml + items.map(function (i) {
        return '<div class="mem-log-item">' +
            '<div class="mem-log-phrase">' + escHtml(memIntentPhrase(i.trigger, i.text)) + '</div>' +
            (worked ? '' : '<button class="btn-ghost mem-log-del" onclick="dropIntention(\'' + i.id + '\')">' +
              escHtml(t.mem_log_drop || '') + '</button>') +
        '</div>';
    }).join('');
}

function dropIntention(id) { deleteIntention(id); renderMemoryLog(); }
