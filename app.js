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

const ICONS = {
    verbatim: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>`,
    close:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`,
    free:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
    final: {
        light: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
        dark:  `<svg width="64" height="64" viewBox="0 0 24 24" fill="#818cf8" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    }
};

const translations = {
    uk: {
        welcome: "Вітаємо. Почнемо вчити без стресу.",
        inputLabel: "Вставте текст:", daysLabel: "За скільки днів вивчити?", startBtn: "Почати",
        stepNew: "ЗАПАМ'ЯТАЙ", stepReview: "ПОВТОРЕННЯ",
        done: "Готово", restTitle: "Перерва", restSubtitle: "Мозок відпочиває...",
        resume: "Продовжити", check: "Перевірити", next: "Далі",
        finish_title: "Чудово!", finish_blocks: "блоків пройдено",
        finish_time: "Час", finish_restart: "Ще раз", finish_home: "На головну",
        dayOptions: [
            { value: "1", label: "1 день" },
            { value: "2", label: "2 дні" },
            { value: "3", label: "3 дні" },
            { value: "4", label: "4–5 днів" },
            { value: "7", label: "Тиждень" }
        ],
        accuracyLabel: "Як перевіряти відповідь?",
        accuracyLevels: [
            { id: "verbatim", name: "Дослівно",          hint: "Для вірша чи виступу" },
            { id: "close",    name: "Близько до тексту", hint: "Ключові слова збережені" },
            { id: "free",     name: "Вільний переказ",   hint: "Головне — суть" }
        ],
        mind_title: "Розкажіть собі в умі",
        mind_body: "Закрийте очі або подивіться вбік.\nПовільно відтворіть текст подумки від початку до кінця.\nКоли впевнені — натисніть кнопку.",
        mind_ready: "Готово",
        write_placeholder: "Напиши текст по пам'яті...",
        write_check_btn: "Перевірити",
        write_hint_btn: "Підказка",
        write_hint_label: "Наступне слово:",
        mind_hint_btn: "Підказка", mind_hint_more_btn: "Ще підказка",
        write_score: "Правильно",
        write_next: "Далі",
        timeLabel: "Скільки часу маєте зараз?",
        timeOptions: [
            { value: 5,        label: "5 хвилин" },
            { value: 10,       label: "10 хвилин" },
            { value: 15,       label: "15 хвилин" },
            { value: 30,       label: "30 хвилин" },
            { value: Infinity, label: "Без обмежень" }
        ],
        session_pause_title: "На сьогодні досить!",
        session_pause_body: "Ви вивчили {n} з {total} блоків. Завтра продовжуйте звідси.",
        session_pause_continue: "Продовжити зараз",
        session_pause_finish: "Закінчити на сьогодні",
        finish_all_title: "Текст вивчено!",
        finish_all_body: "Ви пройшли всі блоки. Чудова робота!",
        validation_no_text: "Будь ласка, вставте текст для вивчення",
        validation_too_short: "Текст занадто короткий — потрібно мінімум 4 слова",
        themeLabel: "Тема:", th_light: "Світла", th_dark: "Темна",
        audio_listening: "Слухайте...", audio_repeat: "Повторіть вголос", audio_ready: "Готово", audio_again: "Ще раз",
        audio_your_turn: "Ваша черга — як повторите?", audio_record: "Записати голосом", audio_silent: "Сказати про себе",
        audio_recording: "Слухаю вас...", audio_record_error: "Не вдалося. Спробуйте ще.", audio_record_noapi: "Запис голосу не підтримується браузером.", audio_record_denied: "🎙 Дозвольте доступ до мікрофона в налаштуваннях браузера.", audio_record_nomic: "🎙 Мікрофон не знайдено.", audio_record_nospeech: "🎙 Нічого не почуто. Говоріть голосніше.",
        resume_title: "Незавершена сесія", resume_progress: "крок {n} з {total}", resume_continue: "Продовжити", resume_fresh: "Новий текст",
        ocr_btn: "Файл", ocr_loading: "Розпізнаємо текст...", ocr_error: "Не вдалося розпізнати. Спробуйте інший файл.", ocr_error_doc: "Формат .doc не підтримується. Збережіть файл як .docx", ocr_error_empty: "Файл не завантажено з хмари. Відкрийте його у Word і збережіть на комп'ютер.",
        back_lang: "Мова",
        lib_rename_hint: 'Натисніть на назву щоб перейменувати',
        blockSizeLabel: 'Розмір блоку:', blockSizeOptions: ['5 слів', '10 слів', '15 слів'],
        restDurLabel: "Тривалість паузи:", restDurOptions: ["5 сек","10 сек","20 сек","30 сек"],
        restPause: "Пауза", restResume: "Продовжити",
        speedLabel: "Швидкість аудіо:", speedOptions: ["0.5×","0.75×","1×","1.25×"],
        library_label: "Мої тексти", library_empty: "Бібліотека порожня",
        library_save: "Зберегти текст", library_saved: "Збережено ✓", library_duplicate: "Вже збережено",
        stat_streak_lbl: "дні поспіль", stat_blocks_lbl: "блоків", stat_time_lbl: "часу",
        stat_hr: "г", stat_min: "хв",
        notif_prompt: "Нагадати завтра?", notif_time_label: "О котрій:",
        notif_dismiss: "Ні, дякую", notif_body: "Час практикуватись! Не переривай серію 🔥",
        notif_confirm: "Нагадування увімкнено ✓",
        instruction_hint: "Прочитайте двічі, повторіть в умі і йдіть далі",
        method_mind: "В умі", method_write: "Письмо", method_audio: "Аудіо",
        text_placeholder: "Вставте або введіть текст...",
        profile_btn: "Профіль",
        profile_title: "Мій прогрес",
        profile_in_progress: "В роботі",
        profile_learned: "Вивчено",
        profile_planned: "Плани",
        profile_words_tab: "Слова",
        profile_empty_words: "Ще немає збережених наборів слів",
        profile_words_total: "слів",
        profile_words_mastered: "вивчено",
        profile_words_review: "повторити",
        profile_train: "Тренувати",
        profile_empty_progress: "Немає активної сесії",
        profile_empty_learned: "Ще нічого не вивчено. Пройдіть перший текст!",
        profile_load: "Завантажити",
        profile_name_placeholder: "Ваше ім'я",
        profile_settings: "Налаштування",
        share_btn: "Поділитись результатом",
        setupTitle: 'Як будемо вчити?',
        nextBtn: 'Далі',
        days_info_title: 'До коли треба знати?',
        days_info_body: 'Від цього залежить скільки повторень буде щодня.\nЗавтра іспит — обирай 1 день.\nЄ тиждень — темп буде комфортним.',
        accuracy_info_title: 'Що рахується за правильно?',
        accuracy_info_body: 'Дослівно — кожне слово має співпадати. Для вірша чи виступу.\nБлизько — головні слова на місці. Для доповіді чи переказу.\nВільно — суть передана. Для засвоєння ідей.',
        blocksize_info_title: 'Порція тексту',
        blocksize_info_body: 'Порція — шматок тексту, який ти вчиш за один раз.\nМаленька (5 слів) — легше, більше кроків. Для вірша або дітей.\nВелика (15 слів) — менше кроків, але складніше.',
        time_info_title: 'Скільки є часу?',
        time_info_body: 'Якщо часу мало — додаток сам зупиниться і скаже: «На сьогодні досить».\nЗавтра продовжиш з того місця де зупинився.',
        wt_time_info_title: 'Скільки є часу?',
        wt_time_info_body: 'Кількість вправ підбирається під ваш час — менше часу, менше вправ за сесію. Типи вправ (аудіо, письмо, диктант тощо) залежать від обраного рівня, а не від часу. «Без обмежень» — повна тренувальна сесія з усіма типами вправ для вашого рівня.',
        bigReviewLabel: 'ВСЕ РАЗОМ (1–{n} блоки)',
        bigReviewHint: 'Прочитайте весь текст. Потім відтворіть з самого початку 🔁',
        w_mode_link: 'Вчити слова та фрази',
        wl_title: 'Мовна пара', wl_learning: 'Яку мову вчимо?', wl_native: 'Моя рідна мова',
        wl_same_error: 'Оберіть різні мови', wl_next: 'Далі →',
        wlev_title: 'Твій рівень?',
        wlev_levels: ['Ніколи не вчив(ла)', 'Кілька слів — здебільшого з мемів та меню', 'Виживу за кордоном — базовими знаннями і посмішкою', 'Говорю! Помиляюся. Але говорю!', 'Субтитри вмикаю "на всяк випадок"', 'Думаю і сни сняться цією мовою'],
        wi_title: 'Додайте слова', wi_hint: 'Кожне слово з нового рядка. Формат: слово — переклад',
        wi_placeholder: 'dog — собака\ncat — кішка\nto run — бігати',
        wi_min_error: 'Потрібно мінімум 2 пари слів',
        wv_title: 'Перевірте список', wv_hint: 'Натисніть на пару щоб відредагувати',
        wv_add: '+ Додати слово', wv_confirm: 'Все вірно →',
        wv_min_error: 'Потрібно мінімум 2 пари', wv_no_trans: '+ переклад',
        wv_auto_translate: '🌐 Запропонувати переклад', wv_translating: 'Перекладаю…',
        wv_translate_failed: 'Не вдалося перекласти деякі слова', wv_translate_offline: 'Немає інтернету — перевірте з\'єднання',
        wv_alt_translation: 'Інший варіант перекладу', wv_no_alt: 'Інших варіантів немає — введіть свій переклад',
        wv_hint_cycle: '— спробувати інший варіант перекладу',
        wv_alt_info_title: 'Слово має кілька значень?',
        wv_alt_info_body: 'Багато слів мають кілька значень або перекладаються по-різному залежно від контексту. Натисніть 🔁 біля будь-якої пари стільки разів, скільки потрібно — кожен клік підставляє інший варіант перекладу цього слова. Якщо жоден варіант не підійшов — просто натисніть на саму пару і впишіть переклад вручну.',
        wv_alt_wrapped: 'Це всі варіанти — можна ввести свій, якщо жоден не підійшов',
        wt_title: 'Назвіть тему', wt_placeholder: 'Наприклад: Тварини',
        wt_auto: '✨ Підібрати автоматично', wt_save: 'Зберегти →',
        words_saved: 'Набір збережено!',
        wt_type_w2t: '→ Переклад', wt_type_t2w: '→ Слово', wt_type_audio: '🔊 Аудіо',
        wt_listen_prompt: 'Прослухайте та оберіть слово', wt_listen_btn: 'Прослухати',
        wt_correct: '✓ Правильно!', wt_wrong: 'Упс, спробуйте ще раз',
        wt_save: 'Зберегти', wt_skip: 'Пропустити', wt_finish: 'Завершити',
        wt_type_spell: '✏️ Напиши', wt_type_dictation: '🎧 Диктант', wt_type_sentence: '📝 Речення',
        wt_spell_prompt: 'Напишіть слово мовою навчання',
        wt_dictation_prompt: 'Прослухайте та напишіть слово',
        wt_sentence_prompt: 'Впишіть пропущене слово',
        wt_sentence_no_examples: 'Для цих слів поки немає прикладів речень',
        wt_preparing: 'Готую вправи…',
        wt_check: 'Перевірити', wt_type_placeholder: 'Введіть відповідь...', wt_hint: 'Підказка',
        wt_wrong_answer_was: 'Правильно:',
        wt_result_perfect: '🌟 Ідеально!', wt_result_great: '🎉 Чудово!',
        wt_result_good: '👍 Непогано!', wt_result_keep: '💪 Продовжуй!',
        wt_score_label: 'правильних відповідей', wt_restart: 'Ще раз', wt_home: 'На головну',
        wt_no_trans: 'Додайте переклади до слів щоб розпочати тренування',
        mode_title: 'Що хочемо вчити?',
        mode_text_label: 'Текст', mode_text_desc: 'Вірш, монолог, виступ, презентація',
        mode_words_label: 'Слова та Фрази', mode_words_desc: 'Нова лексика, переклади, словник'
    },
    en: {
        welcome: "Welcome. Let's learn without stress.",
        inputLabel: "Paste text:", daysLabel: "Days to learn it?", startBtn: "Start",
        stepNew: "MEMORIZE", stepReview: "REVIEW",
        done: "Done", restTitle: "Break", restSubtitle: "Brain is resting...",
        resume: "Continue", check: "Check", next: "Next",
        finish_title: "Well done!", finish_blocks: "blocks completed",
        finish_time: "Time", finish_restart: "Try again", finish_home: "Home",
        dayOptions: [
            { value: "1", label: "1 day" },
            { value: "2", label: "2 days" },
            { value: "3", label: "3 days" },
            { value: "4", label: "4–5 days" },
            { value: "7", label: "1 week" }
        ],
        accuracyLabel: "How to check your answer?",
        accuracyLevels: [
            { id: "verbatim", name: "Word for word",  hint: "For poems or speeches" },
            { id: "close",    name: "Close to text",  hint: "Key words preserved" },
            { id: "free",     name: "Free retelling", hint: "Main idea matters" }
        ],
        mind_title: "Recall in your mind",
        mind_body: "Close your eyes or look away.\nSlowly recall the text from start to finish.\nWhen you feel ready — press the button.",
        mind_ready: "Done",
        write_placeholder: "Write the text from memory...",
        write_check_btn: "Check",
        write_hint_btn: "Hint",
        write_hint_label: "Next word:",
        mind_hint_btn: "Hint", mind_hint_more_btn: "More hint",
        write_score: "Correct",
        write_next: "Next",
        timeLabel: "How much time do you have?",
        timeOptions: [
            { value: 5,        label: "5 minutes" },
            { value: 10,       label: "10 minutes" },
            { value: 15,       label: "15 minutes" },
            { value: 30,       label: "30 minutes" },
            { value: Infinity, label: "No limit" }
        ],
        session_pause_title: "That's enough for now!",
        session_pause_body: "You've covered {n} of {total} blocks. Continue tomorrow from here.",
        session_pause_continue: "Continue now",
        session_pause_finish: "Finish for today",
        finish_all_title: "Text learned!",
        finish_all_body: "You've completed all blocks. Great work!",
        validation_no_text: "Please paste some text to memorize",
        validation_too_short: "Text is too short — minimum 4 words required",
        themeLabel: "Theme:", th_light: "Light", th_dark: "Dark",
        audio_listening: "Listening...", audio_repeat: "Repeat aloud", audio_ready: "Done", audio_again: "Again",
        audio_your_turn: "Your turn — how will you repeat?", audio_record: "Record voice", audio_silent: "Say to yourself",
        audio_recording: "Listening to you...", audio_record_error: "Couldn't recognize. Try again.", audio_record_noapi: "Voice recording not supported in this browser.", audio_record_denied: "🎙 Allow microphone access in your browser settings.", audio_record_nomic: "🎙 No microphone found.", audio_record_nospeech: "🎙 Nothing heard. Please speak louder.",
        resume_title: "Unfinished session", resume_progress: "step {n} of {total}", resume_continue: "Continue", resume_fresh: "New text",
        ocr_btn: "File", ocr_loading: "Recognizing text...", ocr_error: "Could not read. Try another file.", ocr_error_doc: ".doc format not supported. Save the file as .docx", ocr_error_empty: "File not downloaded from cloud. Open it in Word and save locally.",
        back_lang: "Language",
        lib_rename_hint: 'Tap a title to rename',
        blockSizeLabel: 'Block size:', blockSizeOptions: ['5 words', '10 words', '15 words'],
        restDurLabel: "Break duration:", restDurOptions: ["5 sec","10 sec","20 sec","30 sec"],
        restPause: "Pause", restResume: "Resume",
        speedLabel: "Audio speed:", speedOptions: ["0.5×","0.75×","1×","1.25×"],
        library_label: "My texts", library_empty: "Library is empty",
        library_save: "Save text", library_saved: "Saved ✓", library_duplicate: "Already saved",
        stat_streak_lbl: "days in a row", stat_blocks_lbl: "blocks", stat_time_lbl: "total time",
        stat_hr: "h", stat_min: "min",
        notif_prompt: "Remind me tomorrow?", notif_time_label: "What time:",
        notif_dismiss: "No thanks", notif_body: "Time to practise! Keep your streak going 🔥",
        notif_confirm: "Reminder enabled ✓",
        instruction_hint: "Read twice, recall in your mind, then continue",
        method_mind: "Mental", method_write: "Write", method_audio: "Audio",
        text_placeholder: "Paste or type your text...",
        profile_btn: "Profile",
        profile_title: "My Progress",
        profile_in_progress: "In progress",
        profile_learned: "Learned",
        profile_planned: "Planned",
        profile_words_tab: "Words",
        profile_empty_words: "No saved word sets yet",
        profile_words_total: "words",
        profile_words_mastered: "mastered",
        profile_words_review: "to review",
        profile_train: "Train",
        profile_empty_progress: "No active session",
        profile_empty_learned: "Nothing learned yet. Complete your first text!",
        profile_load: "Load",
        profile_name_placeholder: "Your name",
        profile_settings: "Settings",
        share_btn: "Share result",
        setupTitle: 'How shall we learn?',
        nextBtn: 'Next',
        days_info_title: 'When do you need to know it?',
        days_info_body: "This sets how many repetitions per day.\nExam tomorrow — choose 1 day.\nHave a week — the pace will be comfortable.",
        accuracy_info_title: 'What counts as correct?',
        accuracy_info_body: "Word for word — every word must match. For poems or speeches.\nClose — key words are there. For presentations or retellings.\nFree — the idea comes through. For absorbing concepts.",
        blocksize_info_title: 'Text portion',
        blocksize_info_body: "A portion is a chunk of text you memorise at once.\nSmall (5 words) — easier, more steps. Good for poems or kids.\nLarge (15 words) — fewer steps, but harder to memorise.",
        time_info_title: 'How much time do you have?',
        time_info_body: "If time is short — the app will stop and say: 'That's enough for today'.\nTomorrow you continue from where you left off.",
        wt_time_info_title: 'How much time do you have?',
        wt_time_info_body: "The number of exercises is sized to your time — less time, fewer exercises this session. Exercise types (audio, spelling, dictation, etc.) depend on your chosen level, not on time. 'No limit' gives a full training session with every type unlocked for your level.",
        bigReviewLabel: 'FULL RECALL (1–{n} blocks)',
        bigReviewHint: 'Read all the text. Then reproduce from the very beginning 🔁',
        w_mode_link: 'Learn words & phrases',
        wl_title: 'Language pair', wl_learning: 'Language I\'m learning', wl_native: 'My native language',
        wl_same_error: 'Please choose different languages', wl_next: 'Next →',
        wlev_title: 'Your level?',
        wlev_levels: ['Never studied it', 'A few words — mostly from memes and menus', 'I\'ll survive abroad — with basics and a smile', 'I speak! I make mistakes. But I speak!', 'Subtitles — just in case', 'I think and dream in this language'],
        wi_title: 'Add words', wi_hint: 'One word or phrase per line. Format: word — translation',
        wi_placeholder: 'dog — собака\ncat — кішка\nto run — бігати',
        wi_min_error: 'Please add at least 2 word pairs',
        wv_title: 'Check your list', wv_hint: 'Tap any pair to edit',
        wv_add: '+ Add word', wv_confirm: 'Looks good →',
        wv_min_error: 'At least 2 pairs required', wv_no_trans: '+ translation',
        wv_auto_translate: '🌐 Suggest translation', wv_translating: 'Translating…',
        wv_translate_failed: 'Could not translate some words', wv_translate_offline: 'No internet — check your connection',
        wv_alt_translation: 'Alternative translation', wv_no_alt: 'No other options — type your own translation',
        wv_hint_cycle: '— try another translation option',
        wv_alt_info_title: 'Does this word have several meanings?',
        wv_alt_info_body: 'Many words have several meanings or are translated differently depending on context. Tap 🔁 next to any pair as many times as you need — each tap swaps in another translation for that word. If none of them fit, just tap the pair itself and type your own translation.',
        wv_alt_wrapped: 'That\'s all the options — type your own if none fit',
        wt_title: 'Name this topic', wt_placeholder: 'e.g. Animals',
        wt_auto: '✨ Suggest automatically', wt_save: 'Save →',
        words_saved: 'Word set saved!',
        wt_type_w2t: '→ Translation', wt_type_t2w: '→ Word', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Listen and choose the word', wt_listen_btn: 'Listen',
        wt_correct: '✓ Correct!', wt_wrong: 'Oops, try again',
        wt_save: 'Save word', wt_skip: 'Skip', wt_finish: 'Finish',
        wt_type_spell: '✏️ Spell it', wt_type_dictation: '🎧 Dictation', wt_type_sentence: '📝 Sentence',
        wt_spell_prompt: 'Write the word in the learning language',
        wt_dictation_prompt: 'Listen and write the word',
        wt_sentence_prompt: 'Fill in the missing word',
        wt_sentence_no_examples: 'No example sentences yet for these words',
        wt_preparing: 'Preparing exercises…',
        wt_check: 'Check', wt_type_placeholder: 'Type your answer...', wt_hint: 'Hint',
        wt_wrong_answer_was: 'Correct:',
        wt_result_perfect: '🌟 Perfect!', wt_result_great: '🎉 Great!',
        wt_result_good: '👍 Not bad!', wt_result_keep: '💪 Keep going!',
        wt_score_label: 'correct answers', wt_restart: 'Try again', wt_home: 'Home',
        wt_no_trans: 'Add translations to your words to start training',
        mode_title: 'What do you want to learn?',
        mode_text_label: 'Text', mode_text_desc: 'Poem, speech, article, presentation',
        mode_words_label: 'Words & Phrases', mode_words_desc: 'New vocabulary, translations, flashcards'
    },
    pl: {
        welcome: "Witamy. Zacznijmy naukę bez stresu.",
        inputLabel: "Wklej tekst:", daysLabel: "Za ile dni opanować?", startBtn: "Start",
        stepNew: "ZAPAMIĘTAJ", stepReview: "POWTÓRKA",
        done: "Gotowe", restTitle: "Przerwa", restSubtitle: "Mózg odpoczywa...",
        resume: "Kontynuuj", check: "Sprawdź", next: "Dalej",
        finish_title: "Świetnie!", finish_blocks: "bloków ukończono",
        finish_time: "Czas", finish_restart: "Zacznij od nowa", finish_home: "Strona główna",
        dayOptions: [
            { value: "1", label: "1 dzień" },
            { value: "2", label: "2 dni" },
            { value: "3", label: "3 dni" },
            { value: "4", label: "4–5 dni" },
            { value: "7", label: "Tydzień" }
        ],
        accuracyLabel: "Jak sprawdzać odpowiedź?",
        accuracyLevels: [
            { id: "verbatim", name: "Dosłownie",       hint: "Na wiersz lub wystąpienie" },
            { id: "close",    name: "Blisko tekstu",   hint: "Kluczowe słowa zachowane" },
            { id: "free",     name: "Swobodny przekaz", hint: "Liczy się sens" }
        ],
        mind_title: "Przypomnijcie sobie w myślach",
        mind_body: "Zamknijcie oczy lub odwróćcie wzrok.\nPowoli przypomnijcie sobie tekst od początku do końca.\nGdy jesteście gotowi — naciśnijcie przycisk.",
        mind_ready: "Gotowe",
        write_placeholder: "Napisz tekst z pamięci...",
        write_check_btn: "Sprawdź",
        write_hint_btn: "Podpowiedź",
        write_hint_label: "Następne słowo:",
        mind_hint_btn: "Podpowiedź", mind_hint_more_btn: "Więcej podpowiedzi",
        write_score: "Poprawnie",
        write_next: "Dalej",
        timeLabel: "Ile masz teraz czasu?",
        timeOptions: [
            { value: 5,        label: "5 minut" },
            { value: 10,       label: "10 minut" },
            { value: 15,       label: "15 minut" },
            { value: 30,       label: "30 minut" },
            { value: Infinity, label: "Bez limitu" }
        ],
        session_pause_title: "Na dziś wystarczy!",
        session_pause_body: "Przerobiliście {n} z {total} bloków. Jutro kontynuujcie od tego miejsca.",
        session_pause_continue: "Kontynuuj teraz",
        session_pause_finish: "Zakończ na dziś",
        finish_all_title: "Tekst opanowany!",
        finish_all_body: "Ukończyliście wszystkie bloki. Świetna robota!",
        validation_no_text: "Wklej tekst do nauki",
        validation_too_short: "Tekst jest za krótki — minimum 4 słowa",
        themeLabel: "Motyw:", th_light: "Jasny", th_dark: "Ciemny",
        audio_listening: "Słuchaj...", audio_repeat: "Powtórz na głos", audio_ready: "Gotowe", audio_again: "Jeszcze raz",
        audio_your_turn: "Twoja kolej — jak powtórzysz?", audio_record: "Nagraj głos", audio_silent: "Powiedz w myślach",
        audio_recording: "Słucham cię...", audio_record_error: "Nie rozpoznano. Spróbuj ponownie.", audio_record_noapi: "Nagrywanie głosu nie jest obsługiwane przez tę przeglądarkę.", audio_record_denied: "🎙 Zezwól na dostęp do mikrofonu w ustawieniach przeglądarki.", audio_record_nomic: "🎙 Nie znaleziono mikrofonu.", audio_record_nospeech: "🎙 Nic nie usłyszano. Mów głośniej.",
        resume_title: "Niedokończona sesja", resume_progress: "krok {n} z {total}", resume_continue: "Kontynuuj", resume_fresh: "Nowy tekst",
        ocr_btn: "Plik", ocr_loading: "Rozpoznawanie tekstu...", ocr_error: "Nie udało się odczytać. Spróbuj inny plik.", ocr_error_doc: "Format .doc nie jest obsługiwany. Zapisz plik jako .docx", ocr_error_empty: "Plik nie jest pobrany z chmury. Otwórz go w Word i zapisz lokalnie.",
        back_lang: "Język",
        lib_rename_hint: 'Dotknij tytuł, aby zmienić nazwę',
        blockSizeLabel: 'Rozmiar bloku:', blockSizeOptions: ['5 słów', '10 słów', '15 słów'],
        restDurLabel: "Czas przerwy:", restDurOptions: ["5 sek","10 sek","20 sek","30 sek"],
        restPause: "Pauza", restResume: "Wznów",
        speedLabel: "Prędkość audio:", speedOptions: ["0.5×","0.75×","1×","1.25×"],
        library_label: "Moje teksty", library_empty: "Biblioteka jest pusta",
        library_save: "Zapisz tekst", library_saved: "Zapisano ✓", library_duplicate: "Już zapisany",
        stat_streak_lbl: "dni z rzędu", stat_blocks_lbl: "bloków", stat_time_lbl: "łącznie",
        stat_hr: "g", stat_min: "min",
        notif_prompt: "Przypomnieć jutro?", notif_time_label: "O której:",
        notif_dismiss: "Nie, dziękuję", notif_body: "Czas na praktykę! Nie przerywaj serii 🔥",
        notif_confirm: "Przypomnienie włączone ✓",
        instruction_hint: "Przeczytaj dwa razy, powtórz w myślach i jedź dalej",
        method_mind: "W myślach", method_write: "Pisanie", method_audio: "Audio",
        text_placeholder: "Wklej lub wpisz tekst...",
        profile_btn: "Profil",
        profile_title: "Mój postęp",
        profile_in_progress: "W toku",
        profile_learned: "Nauczone",
        profile_planned: "Zaplanowane",
        profile_words_tab: "Słowa",
        profile_empty_words: "Brak zapisanych zestawów słów",
        profile_words_total: "słów",
        profile_words_mastered: "opanowane",
        profile_words_review: "do powtórki",
        profile_train: "Trenuj",
        profile_empty_progress: "Brak aktywnej sesji",
        profile_empty_learned: "Nic jeszcze nie nauczone. Ukończ pierwszy tekst!",
        profile_load: "Załaduj",
        profile_name_placeholder: "Twoje imię",
        profile_settings: "Ustawienia",
        share_btn: "Udostępnij wynik",
        setupTitle: 'Jak będziemy się uczyć?',
        nextBtn: 'Dalej',
        days_info_title: 'Kiedy musisz to wiedzieć?',
        days_info_body: "To określa liczbę powtórzeń dziennie.\nEgzamin jutro — wybierz 1 dzień.\nMasz tydzień — tempo będzie komfortowe.",
        accuracy_info_title: 'Co liczy się jako poprawne?',
        accuracy_info_body: "Dosłownie — każde słowo musi pasować. Do wiersza lub przemówienia.\nBlisko — kluczowe słowa są na miejscu. Do referatu.\nSwobodnie — sens jest przekazany. Do przyswajania idei.",
        blocksize_info_title: 'Porcja tekstu',
        blocksize_info_body: "Porcja to fragment tekstu, który uczysz się za jednym razem.\nMała (5 słów) — łatwiej, więcej kroków. Dobra do wiersza lub dla dzieci.\nDuża (15 słów) — mniej kroków, ale trudniej zapamiętać.",
        time_info_title: 'Ile masz czasu?',
        time_info_body: "Jeśli czasu jest mało — aplikacja zatrzyma się i powie: «Na dziś wystarczy».\nJutro kontynuujesz od miejsca, gdzie skończyłeś.",
        wt_time_info_title: 'Ile masz czasu?',
        wt_time_info_body: 'Liczba ćwiczeń jest dopasowana do czasu — mniej czasu, mniej ćwiczeń w tej sesji. Typy ćwiczeń (audio, pisanie, dyktando itd.) zależą od wybranego poziomu, nie od czasu. „Bez ograniczeń” to pełna sesja ze wszystkimi typami odblokowanymi dla twojego poziomu.',
        bigReviewLabel: 'CAŁOŚĆ (1–{n} bloki)',
        bigReviewHint: 'Przeczytaj cały tekst. Potem odtwórz od samego początku 🔁',
        w_mode_link: 'Ucz się słów i fraz',
        wl_title: 'Para językowa', wl_learning: 'Jakiego języka się uczę?', wl_native: 'Mój język ojczysty',
        wl_same_error: 'Wybierz różne języki', wl_next: 'Dalej →',
        wlev_title: 'Twój poziom?',
        wlev_levels: ['Nigdy się nie uczyłem(am)', 'Kilka słów — głównie z memów i menu', 'Przeżyję za granicą — z podstawami i uśmiechem', 'Mówię! Mylę się. Ale mówię!', 'Napisy włączam "na wszelki wypadek"', 'Myślę i śnię w tym języku'],
        wi_title: 'Dodaj słowa', wi_hint: 'Każde słowo w nowej linii. Format: słowo — tłumaczenie',
        wi_placeholder: 'dog — pies\ncat — kot\nto run — biegać',
        wi_min_error: 'Potrzeba co najmniej 2 par słów',
        wv_title: 'Sprawdź listę', wv_hint: 'Dotknij pary aby edytować',
        wv_add: '+ Dodaj słowo', wv_confirm: 'Wszystko OK →',
        wv_min_error: 'Wymagane co najmniej 2 pary', wv_no_trans: '+ tłumaczenie',
        wv_auto_translate: '🌐 Zaproponuj tłumaczenie', wv_translating: 'Tłumaczę…',
        wv_translate_failed: 'Nie udało się przetłumaczyć niektórych słów', wv_translate_offline: 'Brak internetu — sprawdź połączenie',
        wv_alt_translation: 'Inny wariant tłumaczenia', wv_no_alt: 'Brak innych opcji — wpisz własne tłumaczenie',
        wv_hint_cycle: '— spróbuj innego wariantu tłumaczenia',
        wv_alt_info_title: 'To słowo ma kilka znaczeń?',
        wv_alt_info_body: 'Wiele słów ma kilka znaczeń albo tłumaczy się różnie w zależności od kontekstu. Dotknij 🔁 przy dowolnej parze tyle razy, ile potrzeba — każde dotknięcie podstawia inny wariant tłumaczenia. Jeśli żaden nie pasuje — po prostu dotknij pary i wpisz tłumaczenie ręcznie.',
        wv_alt_wrapped: 'To wszystkie opcje — możesz wpisać własne, jeśli żadna nie pasuje',
        wt_title: 'Nazwij temat', wt_placeholder: 'np. Zwierzęta',
        wt_auto: '✨ Zasugeruj automatycznie', wt_save: 'Zapisz →',
        words_saved: 'Zestaw zapisany!',
        wt_type_w2t: '→ Tłumaczenie', wt_type_t2w: '→ Słowo', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Posłuchaj i wybierz słowo', wt_listen_btn: 'Posłuchaj',
        wt_correct: '✓ Dobrze!', wt_wrong: 'Ups, spróbuj jeszcze raz',
        wt_save: 'Zapisz słowo', wt_skip: 'Pomiń', wt_finish: 'Zakończ',
        wt_type_spell: '✏️ Napisz', wt_type_dictation: '🎧 Dyktando', wt_type_sentence: '📝 Zdanie',
        wt_spell_prompt: 'Napisz słowo w języku docelowym',
        wt_sentence_prompt: 'Uzupełnij brakujące słowo',
        wt_sentence_no_examples: 'Brak jeszcze przykładowych zdań dla tych słów',
        wt_preparing: 'Przygotowuję ćwiczenia…',
        wt_dictation_prompt: 'Posłuchaj i napisz słowo',
        wt_check: 'Sprawdź', wt_type_placeholder: 'Wpisz odpowiedź...', wt_hint: 'Podpowiedź',
        wt_wrong_answer_was: 'Poprawnie:',
        wt_result_perfect: '🌟 Idealnie!', wt_result_great: '🎉 Świetnie!',
        wt_result_good: '👍 Nieźle!', wt_result_keep: '💪 Dalej!',
        wt_score_label: 'poprawnych odpowiedzi', wt_restart: 'Jeszcze raz', wt_home: 'Strona główna',
        wt_no_trans: 'Dodaj tłumaczenia, aby rozpocząć trening',
        mode_title: 'Czego chcesz się uczyć?',
        mode_text_label: 'Tekst', mode_text_desc: 'Wiersz, przemowa, artykuł, prezentacja',
        mode_words_label: 'Słowa i Frazy', mode_words_desc: 'Nowe słownictwo, tłumaczenia, fiszki'
    },
    de: {
        welcome: "Willkommen. Lernen ohne Stress.",
        inputLabel: "Text einfügen:", daysLabel: "In wie vielen Tagen?", startBtn: "Start",
        stepNew: "MERKEN", stepReview: "WIEDERHOLUNG",
        done: "Fertig", restTitle: "Pause", restSubtitle: "Gehirn ruht...",
        resume: "Weiter", check: "Prüfen", next: "Weiter",
        finish_title: "Toll!", finish_blocks: "Blöcke abgeschlossen",
        finish_time: "Zeit", finish_restart: "Nochmal", finish_home: "Startseite",
        dayOptions: [
            { value: "1", label: "1 Tag" },
            { value: "2", label: "2 Tage" },
            { value: "3", label: "3 Tage" },
            { value: "4", label: "4–5 Tage" },
            { value: "7", label: "1 Woche" }
        ],
        accuracyLabel: "Wie soll die Antwort geprüft werden?",
        accuracyLevels: [
            { id: "verbatim", name: "Wort für Wort",    hint: "Für Gedicht oder Rede" },
            { id: "close",    name: "Nah am Text",      hint: "Schlüsselwörter erhalten" },
            { id: "free",     name: "Freie Wiedergabe", hint: "Hauptidee zählt" }
        ],
        mind_title: "Im Kopf wiederholen",
        mind_body: "Schließen Sie die Augen oder schauen Sie weg.\nWiederholen Sie den Text langsam im Kopf von Anfang bis Ende.\nWenn Sie bereit sind — drücken Sie die Taste.",
        mind_ready: "Fertig",
        write_placeholder: "Schreib den Text aus dem Gedächtnis...",
        write_check_btn: "Prüfen",
        write_hint_btn: "Hinweis",
        write_hint_label: "Nächstes Wort:",
        mind_hint_btn: "Hinweis", mind_hint_more_btn: "Mehr Hinweis",
        write_score: "Richtig",
        write_next: "Weiter",
        timeLabel: "Wie viel Zeit haben Sie jetzt?",
        timeOptions: [
            { value: 5,        label: "5 Minuten" },
            { value: 10,       label: "10 Minuten" },
            { value: 15,       label: "15 Minuten" },
            { value: 30,       label: "30 Minuten" },
            { value: Infinity, label: "Kein Limit" }
        ],
        session_pause_title: "Für heute reicht es!",
        session_pause_body: "Sie haben {n} von {total} Blöcken gelernt. Morgen von hier weiter.",
        session_pause_continue: "Jetzt weitermachen",
        session_pause_finish: "Für heute beenden",
        finish_all_title: "Text gelernt!",
        finish_all_body: "Sie haben alle Blöcke abgeschlossen. Großartig!",
        validation_no_text: "Bitte fügen Sie Text zum Lernen ein",
        validation_too_short: "Text zu kurz — mindestens 4 Wörter erforderlich",
        themeLabel: "Design:", th_light: "Hell", th_dark: "Dunkel",
        audio_listening: "Hören...", audio_repeat: "Laut wiederholen", audio_ready: "Fertig", audio_again: "Nochmal",
        audio_your_turn: "Du bist dran — wie wiederholst du?", audio_record: "Stimme aufnehmen", audio_silent: "Im Stillen sagen",
        audio_recording: "Ich höre dir zu...", audio_record_error: "Nicht erkannt. Nochmal versuchen.", audio_record_noapi: "Sprachaufnahme wird von diesem Browser nicht unterstützt.", audio_record_denied: "🎙 Erlauben Sie den Mikrofonzugriff in den Browsereinstellungen.", audio_record_nomic: "🎙 Kein Mikrofon gefunden.", audio_record_nospeech: "🎙 Nichts gehört. Bitte lauter sprechen.",
        resume_title: "Unfertige Sitzung", resume_progress: "Schritt {n} von {total}", resume_continue: "Weiter", resume_fresh: "Neuer Text",
        ocr_btn: "Datei", ocr_loading: "Text wird erkannt...", ocr_error: "Lesen fehlgeschlagen. Andere Datei versuchen.", ocr_error_doc: "Format .doc wird nicht unterstützt. Bitte als .docx speichern", ocr_error_empty: "Datei nicht aus der Cloud heruntergeladen. In Word öffnen und lokal speichern.",
        back_lang: "Sprache",
        lib_rename_hint: 'Titel antippen zum Umbenennen',
        blockSizeLabel: 'Blockgröße:', blockSizeOptions: ['5 Wörter', '10 Wörter', '15 Wörter'],
        restDurLabel: "Pausendauer:", restDurOptions: ["5 Sek","10 Sek","20 Sek","30 Sek"],
        restPause: "Pause", restResume: "Fortsetzen",
        speedLabel: "Audiogeschwindigkeit:", speedOptions: ["0.5×","0.75×","1×","1.25×"],
        library_label: "Meine Texte", library_empty: "Bibliothek ist leer",
        library_save: "Text speichern", library_saved: "Gespeichert ✓", library_duplicate: "Bereits gespeichert",
        stat_streak_lbl: "Tage in Folge", stat_blocks_lbl: "Blöcke", stat_time_lbl: "Gesamt",
        stat_hr: "Std", stat_min: "Min",
        notif_prompt: "Morgen erinnern?", notif_time_label: "Zu welcher Zeit:",
        notif_dismiss: "Nein danke", notif_body: "Zeit zum Üben! Halte deine Serie aufrecht 🔥",
        notif_confirm: "Erinnerung aktiviert ✓",
        instruction_hint: "Zweimal lesen, im Kopf wiederholen, dann weiter",
        method_mind: "Im Kopf", method_write: "Schreiben", method_audio: "Audio",
        text_placeholder: "Text einfügen oder tippen...",
        profile_btn: "Profil",
        profile_title: "Mein Fortschritt",
        profile_in_progress: "Laufend",
        profile_learned: "Gelernt",
        profile_planned: "Geplant",
        profile_words_tab: "Wörter",
        profile_empty_words: "Noch keine gespeicherten Wortsets",
        profile_words_total: "Wörter",
        profile_words_mastered: "gelernt",
        profile_words_review: "zu wiederholen",
        profile_train: "Trainieren",
        profile_empty_progress: "Keine aktive Sitzung",
        profile_empty_learned: "Noch nichts gelernt. Schließe deinen ersten Text ab!",
        profile_load: "Laden",
        profile_name_placeholder: "Dein Name",
        profile_settings: "Einstellungen",
        share_btn: "Ergebnis teilen",
        setupTitle: 'Wie lernen wir?',
        nextBtn: 'Weiter',
        days_info_title: 'Bis wann müssen Sie es wissen?',
        days_info_body: "Das bestimmt, wie viele Wiederholungen pro Tag.\nPrüfung morgen — wählen Sie 1 Tag.\nSie haben eine Woche — das Tempo wird angenehm sein.",
        accuracy_info_title: 'Was gilt als richtig?',
        accuracy_info_body: "Wort für Wort — jedes Wort muss übereinstimmen. Für Gedicht oder Rede.\nNah — Schlüsselwörter sind vorhanden. Für Vortrag.\nFrei — die Idee kommt durch. Zum Verstehen von Konzepten.",
        blocksize_info_title: 'Textportion',
        blocksize_info_body: "Eine Portion ist ein Textstück, das Sie auf einmal lernen.\nKlein (5 Wörter) — leichter, mehr Schritte. Gut für Gedichte oder Kinder.\nGroß (15 Wörter) — weniger Schritte, aber schwerer zu merken.",
        time_info_title: 'Wie viel Zeit haben Sie?',
        time_info_body: "Wenig Zeit — die App stoppt und sagt: «Für heute reicht es».\nMorgen machen Sie weiter, wo Sie aufgehört haben.",
        wt_time_info_title: 'Wie viel Zeit haben Sie?',
        wt_time_info_body: 'Die Anzahl der Übungen richtet sich nach Ihrer Zeit — weniger Zeit, weniger Übungen in dieser Sitzung. Übungstypen (Audio, Schreiben, Diktat usw.) hängen vom gewählten Level ab, nicht von der Zeit. „Ohne Limit" gibt eine vollständige Sitzung mit allen für Ihr Level freigeschalteten Typen.',
        bigReviewLabel: 'ALLES (1–{n} Blöcke)',
        bigReviewHint: 'Lesen Sie den ganzen Text. Dann reproduzieren Sie von Anfang an 🔁',
        w_mode_link: 'Wörter & Phrasen lernen',
        wl_title: 'Sprachpaar', wl_learning: 'Welche Sprache lerne ich?', wl_native: 'Meine Muttersprache',
        wl_same_error: 'Bitte verschiedene Sprachen wählen', wl_next: 'Weiter →',
        wlev_title: 'Dein Niveau?',
        wlev_levels: ['Nie gelernt', 'Ein paar Wörter — meistens aus Memes und Menüs', 'Überlebe im Ausland — mit Grundkenntnissen und Lächeln', 'Ich spreche! Ich mache Fehler. Aber ich spreche!', 'Untertitel — nur zur Sicherheit', 'Ich denke und träume in dieser Sprache'],
        wi_title: 'Wörter hinzufügen', wi_hint: 'Ein Wort pro Zeile. Format: Wort — Übersetzung',
        wi_placeholder: 'dog — Hund\ncat — Katze\nto run — laufen',
        wi_min_error: 'Mindestens 2 Wortpaare erforderlich',
        wv_title: 'Liste prüfen', wv_hint: 'Tippe auf ein Paar zum Bearbeiten',
        wv_add: '+ Wort hinzufügen', wv_confirm: 'Alles stimmt →',
        wv_min_error: 'Mindestens 2 Paare erforderlich', wv_no_trans: '+ Übersetzung',
        wv_auto_translate: '🌐 Übersetzung vorschlagen', wv_translating: 'Übersetze…',
        wv_translate_failed: 'Einige Wörter konnten nicht übersetzt werden', wv_translate_offline: 'Kein Internet — Verbindung prüfen',
        wv_alt_translation: 'Andere Übersetzung', wv_no_alt: 'Keine weiteren Optionen — eigene Übersetzung eingeben',
        wv_hint_cycle: '— eine andere Übersetzung ausprobieren',
        wv_alt_info_title: 'Hat dieses Wort mehrere Bedeutungen?',
        wv_alt_info_body: 'Viele Wörter haben mehrere Bedeutungen oder werden je nach Kontext unterschiedlich übersetzt. Tippe so oft wie nötig auf 🔁 neben einem Paar — jedes Tippen setzt eine andere Übersetzung ein. Passt keine davon, tippe einfach auf das Paar und gib deine eigene Übersetzung ein.',
        wv_alt_wrapped: 'Das sind alle Optionen — gib deine eigene ein, wenn keine passt',
        wt_title: 'Thema benennen', wt_placeholder: 'z.B. Tiere',
        wt_auto: '✨ Automatisch vorschlagen', wt_save: 'Speichern →',
        words_saved: 'Wortset gespeichert!',
        wt_type_w2t: '→ Übersetzung', wt_type_t2w: '→ Wort', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Hör zu und wähle das Wort', wt_listen_btn: 'Anhören',
        wt_correct: '✓ Richtig!', wt_wrong: 'Ups, versuch es nochmal',
        wt_save: 'Wort merken', wt_skip: 'Überspringen', wt_finish: 'Beenden',
        wt_type_spell: '✏️ Schreiben', wt_type_dictation: '🎧 Diktat', wt_type_sentence: '📝 Satz',
        wt_spell_prompt: 'Schreibe das Wort in der Lernsprache',
        wt_sentence_prompt: 'Fülle das fehlende Wort aus',
        wt_sentence_no_examples: 'Für diese Wörter gibt es noch keine Beispielsätze',
        wt_preparing: 'Übungen werden vorbereitet…',
        wt_dictation_prompt: 'Höre zu und schreibe das Wort',
        wt_check: 'Prüfen', wt_type_placeholder: 'Antwort eingeben...', wt_hint: 'Hinweis',
        wt_wrong_answer_was: 'Richtig:',
        wt_result_perfect: '🌟 Perfekt!', wt_result_great: '🎉 Super!',
        wt_result_good: '👍 Nicht schlecht!', wt_result_keep: '💪 Weiter so!',
        wt_score_label: 'richtige Antworten', wt_restart: 'Nochmal', wt_home: 'Startseite',
        wt_no_trans: 'Füge Übersetzungen hinzu, um das Training zu starten',
        mode_title: 'Was möchtest du lernen?',
        mode_text_label: 'Text', mode_text_desc: 'Gedicht, Rede, Artikel, Präsentation',
        mode_words_label: 'Wörter & Phrasen', mode_words_desc: 'Neues Vokabular, Übersetzungen, Karteikarten'
    },
    fr: {
        welcome: "Bienvenue. Apprenons sans stress.",
        inputLabel: "Coller le texte :", daysLabel: "En combien de jours ?", startBtn: "Démarrer",
        stepNew: "MÉMORISER", stepReview: "RÉVISION",
        done: "Terminé", restTitle: "Pause", restSubtitle: "Le cerveau se repose...",
        resume: "Continuer", check: "Vérifier", next: "Suivant",
        finish_title: "Bravo !", finish_blocks: "blocs complétés",
        finish_time: "Temps", finish_restart: "Recommencer", finish_home: "Accueil",
        dayOptions: [
            { value: "1", label: "1 jour" },
            { value: "2", label: "2 jours" },
            { value: "3", label: "3 jours" },
            { value: "4", label: "4–5 jours" },
            { value: "7", label: "1 semaine" }
        ],
        accuracyLabel: "Comment vérifier la réponse ?",
        accuracyLevels: [
            { id: "verbatim", name: "Mot pour mot",  hint: "Pour poème ou discours" },
            { id: "close",    name: "Proche du texte", hint: "Mots-clés conservés" },
            { id: "free",     name: "Récit libre",   hint: "L'essentiel compte" }
        ],
        mind_title: "Récitez mentalement",
        mind_body: "Fermez les yeux ou regardez ailleurs.\nRépétez lentement le texte dans votre tête du début à la fin.\nQuand vous êtes prêt(e) — appuyez sur le bouton.",
        mind_ready: "Terminé",
        write_placeholder: "Écris le texte de mémoire...",
        write_check_btn: "Vérifier",
        write_hint_btn: "Indice",
        write_hint_label: "Mot suivant :",
        mind_hint_btn: "Indice", mind_hint_more_btn: "Plus d'indice",
        write_score: "Correct",
        write_next: "Suivant",
        timeLabel: "Combien de temps avez-vous ?",
        timeOptions: [
            { value: 5,        label: "5 minutes" },
            { value: 10,       label: "10 minutes" },
            { value: 15,       label: "15 minutes" },
            { value: 30,       label: "30 minutes" },
            { value: Infinity, label: "Sans limite" }
        ],
        session_pause_title: "C'est assez pour aujourd'hui !",
        session_pause_body: "Vous avez couvert {n} blocs sur {total}. Continuez demain depuis ici.",
        session_pause_continue: "Continuer maintenant",
        session_pause_finish: "Finir pour aujourd'hui",
        finish_all_title: "Texte appris !",
        finish_all_body: "Vous avez complété tous les blocs. Excellent travail !",
        validation_no_text: "Veuillez coller du texte à mémoriser",
        validation_too_short: "Texte trop court — minimum 4 mots requis",
        themeLabel: "Thème:", th_light: "Clair", th_dark: "Sombre",
        audio_listening: "Écoutez...", audio_repeat: "Répétez à voix haute", audio_ready: "Terminé", audio_again: "Encore",
        audio_your_turn: "À vous — comment allez-vous répéter ?", audio_record: "Enregistrer la voix", audio_silent: "Dire en silence",
        audio_recording: "Je vous écoute...", audio_record_error: "Non reconnu. Réessayez.", audio_record_noapi: "Enregistrement vocal non supporté par ce navigateur.", audio_record_denied: "🎙 Autorisez l'accès au micro dans les paramètres du navigateur.", audio_record_nomic: "🎙 Aucun microphone trouvé.", audio_record_nospeech: "🎙 Rien entendu. Parlez plus fort.",
        resume_title: "Session inachevée", resume_progress: "étape {n} sur {total}", resume_continue: "Continuer", resume_fresh: "Nouveau texte",
        ocr_btn: "Fichier", ocr_loading: "Lecture en cours...", ocr_error: "Échec de la lecture. Essayez un autre fichier.", ocr_error_doc: "Format .doc non supporté. Enregistrez en .docx", ocr_error_empty: "Fichier non téléchargé depuis le cloud. Ouvrez-le dans Word et sauvegardez localement.",
        back_lang: "Langue",
        lib_rename_hint: 'Appuyez sur un titre pour le renommer',
        blockSizeLabel: 'Taille du bloc :', blockSizeOptions: ['5 mots', '10 mots', '15 mots'],
        restDurLabel: "Durée de pause :", restDurOptions: ["5 sec","10 sec","20 sec","30 sec"],
        restPause: "Pause", restResume: "Reprendre",
        speedLabel: "Vitesse audio :", speedOptions: ["0.5×","0.75×","1×","1.25×"],
        library_label: "Mes textes", library_empty: "Bibliothèque vide",
        library_save: "Enregistrer", library_saved: "Enregistré ✓", library_duplicate: "Déjà enregistré",
        stat_streak_lbl: "jours d'affilée", stat_blocks_lbl: "blocs", stat_time_lbl: "au total",
        stat_hr: "h", stat_min: "min",
        notif_prompt: "Me rappeler demain ?", notif_time_label: "À quelle heure :",
        notif_dismiss: "Non merci", notif_body: "C'est l'heure de pratiquer ! Gardez votre série 🔥",
        notif_confirm: "Rappel activé ✓",
        instruction_hint: "Lisez deux fois, rappelez-vous mentalement, continuez",
        method_mind: "Mental", method_write: "Écriture", method_audio: "Audio",
        text_placeholder: "Collez ou saisissez votre texte...",
        profile_btn: "Profil",
        profile_title: "Ma progression",
        profile_in_progress: "En cours",
        profile_learned: "Appris",
        profile_planned: "Planifiés",
        profile_words_tab: "Mots",
        profile_empty_words: "Aucun ensemble de mots enregistré",
        profile_words_total: "mots",
        profile_words_mastered: "maîtrisés",
        profile_words_review: "à revoir",
        profile_train: "Entraîner",
        profile_empty_progress: "Aucune session active",
        profile_empty_learned: "Rien appris encore. Terminez votre premier texte !",
        profile_load: "Charger",
        profile_name_placeholder: "Votre prénom",
        profile_settings: "Paramètres",
        share_btn: "Partager le résultat",
        setupTitle: 'Comment allons-nous apprendre ?',
        nextBtn: 'Suivant',
        days_info_title: 'Pour quand faut-il savoir ?',
        days_info_body: "Cela détermine le nombre de répétitions par jour.\nExamen demain — choisissez 1 jour.\nVous avez une semaine — le rythme sera confortable.",
        accuracy_info_title: "Qu'est-ce qui compte comme correct ?",
        accuracy_info_body: "Mot pour mot — chaque mot doit correspondre. Pour poème ou discours.\nProche — les mots-clés sont là. Pour exposé.\nLibre — l'idée passe. Pour assimiler des concepts.",
        blocksize_info_title: 'Portion de texte',
        blocksize_info_body: "Une portion est un morceau de texte à mémoriser en une fois.\nPetite (5 mots) — plus facile, plus d'étapes. Pour poèmes ou enfants.\nGrande (15 mots) — moins d'étapes, mais plus difficile.",
        time_info_title: 'Combien de temps avez-vous ?',
        time_info_body: "Peu de temps — l'appli s'arrête et dit : «C'est assez pour aujourd'hui».\nDemain vous reprenez là où vous vous êtes arrêté.",
        wt_time_info_title: 'Combien de temps avez-vous ?',
        wt_time_info_body: "Le nombre d'exercices s'adapte à votre temps — moins de temps, moins d'exercices pour cette session. Les types d'exercices (audio, orthographe, dictée, etc.) dépendent du niveau choisi, pas du temps. « Sans limite » donne une session complète avec tous les types débloqués pour votre niveau.",
        bigReviewLabel: 'TOUT (1–{n} blocs)',
        bigReviewHint: 'Lisez tout le texte. Puis reproduisez depuis le début 🔁',
        w_mode_link: 'Apprendre des mots et phrases',
        wl_title: 'Paire de langues', wl_learning: 'Quelle langue j\'apprends ?', wl_native: 'Ma langue maternelle',
        wl_same_error: 'Choisissez des langues différentes', wl_next: 'Suivant →',
        wlev_title: 'Votre niveau ?',
        wlev_levels: ['Jamais étudié', 'Quelques mots — surtout des mèmes et menus', 'Je survivrai à l\'étranger — avec des bases et un sourire', 'Je parle ! Je fais des erreurs. Mais je parle !', 'Sous-titres — juste au cas où', 'Je pense et rêve dans cette langue'],
        wi_title: 'Ajouter des mots', wi_hint: 'Un mot par ligne. Format : mot — traduction',
        wi_placeholder: 'dog — chien\ncat — chat\nto run — courir',
        wi_min_error: 'Veuillez ajouter au moins 2 paires',
        wv_title: 'Vérifier la liste', wv_hint: 'Appuyez sur une paire pour modifier',
        wv_add: '+ Ajouter un mot', wv_confirm: 'Tout est correct →',
        wv_min_error: 'Au moins 2 paires requises', wv_no_trans: '+ traduction',
        wv_auto_translate: '🌐 Suggérer une traduction', wv_translating: 'Traduction…',
        wv_translate_failed: 'Certains mots n\'ont pas pu être traduits', wv_translate_offline: 'Pas d\'internet — vérifiez la connexion',
        wv_alt_translation: 'Autre traduction', wv_no_alt: 'Pas d\'autres options — saisissez votre propre traduction',
        wv_hint_cycle: '— essayer une autre traduction',
        wv_alt_info_title: 'Ce mot a plusieurs sens ?',
        wv_alt_info_body: 'Beaucoup de mots ont plusieurs sens ou se traduisent différemment selon le contexte. Appuyez sur 🔁 à côté d\'une paire autant de fois que nécessaire — chaque appui propose une autre traduction. Si aucune ne convient, appuyez simplement sur la paire et saisissez votre propre traduction.',
        wv_alt_wrapped: 'Ce sont toutes les options — saisissez la vôtre si aucune ne convient',
        wt_title: 'Nommer le thème', wt_placeholder: 'ex. Animaux',
        wt_auto: '✨ Suggérer automatiquement', wt_save: 'Enregistrer →',
        words_saved: 'Ensemble sauvegardé !',
        wt_type_w2t: '→ Traduction', wt_type_t2w: '→ Mot', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Écoutez et choisissez le mot', wt_listen_btn: 'Écouter',
        wt_correct: '✓ Correct !', wt_wrong: 'Oups, réessaie',
        wt_save: 'Garder le mot', wt_skip: 'Ignorer', wt_finish: 'Terminer',
        wt_type_spell: '✏️ Écrire', wt_type_dictation: '🎧 Dictée', wt_type_sentence: '📝 Phrase',
        wt_spell_prompt: 'Écrivez le mot dans la langue cible',
        wt_sentence_prompt: 'Complétez le mot manquant',
        wt_sentence_no_examples: 'Pas encore de phrases d\'exemple pour ces mots',
        wt_preparing: 'Préparation des exercices…',
        wt_dictation_prompt: 'Écoutez et écrivez le mot',
        wt_check: 'Vérifier', wt_type_placeholder: 'Tapez votre réponse...', wt_hint: 'Indice',
        wt_wrong_answer_was: 'Correct :',
        wt_result_perfect: '🌟 Parfait !', wt_result_great: '🎉 Excellent !',
        wt_result_good: '👍 Pas mal !', wt_result_keep: '💪 Continuez !',
        wt_score_label: 'bonnes réponses', wt_restart: 'Recommencer', wt_home: 'Accueil',
        wt_no_trans: 'Ajoutez des traductions pour commencer l\'entraînement',
        mode_title: 'Que voulez-vous apprendre ?',
        mode_text_label: 'Texte', mode_text_desc: 'Poème, discours, article, présentation',
        mode_words_label: 'Mots & Phrases', mode_words_desc: 'Nouveau vocabulaire, traductions, fiches'
    },
    es: {
        welcome: "Bienvenido. Aprendamos sin estrés.",
        inputLabel: "Pegar texto:", daysLabel: "¿En cuántos días aprenderlo?", startBtn: "Empezar",
        stepNew: "MEMORIZAR", stepReview: "REPASO",
        done: "Hecho", restTitle: "Descanso", restSubtitle: "El cerebro descansa...",
        resume: "Continuar", check: "Comprobar", next: "Siguiente",
        finish_title: "¡Genial!", finish_blocks: "bloques completados",
        finish_time: "Tiempo", finish_restart: "Reintentar", finish_home: "Inicio",
        dayOptions: [
            { value: "1", label: "1 día" },
            { value: "2", label: "2 días" },
            { value: "3", label: "3 días" },
            { value: "4", label: "4–5 días" },
            { value: "7", label: "1 semana" }
        ],
        accuracyLabel: "¿Cómo verificar la respuesta?",
        accuracyLevels: [
            { id: "verbatim", name: "Al pie de la letra", hint: "Para poema o discurso" },
            { id: "close",    name: "Cerca del texto",    hint: "Palabras clave conservadas" },
            { id: "free",     name: "Narración libre",    hint: "Lo importante es la idea" }
        ],
        mind_title: "Reciten mentalmente",
        mind_body: "Cierren los ojos o miren hacia otro lado.\nReciten lentamente el texto de principio a fin.\nCuando estén listos — presionen el botón.",
        mind_ready: "Listo",
        write_placeholder: "Escribe el texto de memoria...",
        write_check_btn: "Verificar",
        write_hint_btn: "Pista",
        write_hint_label: "Siguiente palabra:",
        mind_hint_btn: "Pista", mind_hint_more_btn: "Más pista",
        write_score: "Correcto",
        write_next: "Siguiente",
        timeLabel: "¿Cuánto tiempo tienen ahora?",
        timeOptions: [
            { value: 5,        label: "5 minutos" },
            { value: 10,       label: "10 minutos" },
            { value: 15,       label: "15 minutos" },
            { value: 30,       label: "30 minutos" },
            { value: Infinity, label: "Sin límite" }
        ],
        session_pause_title: "¡Por hoy es suficiente!",
        session_pause_body: "Han cubierto {n} de {total} bloques. Continúen mañana desde aquí.",
        session_pause_continue: "Continuar ahora",
        session_pause_finish: "Terminar por hoy",
        finish_all_title: "¡Texto aprendido!",
        finish_all_body: "Han completado todos los bloques. ¡Excelente trabajo!",
        validation_no_text: "Por favor, pega texto para memorizar",
        validation_too_short: "Texto demasiado corto — mínimo 4 palabras",
        themeLabel: "Tema:", th_light: "Claro", th_dark: "Oscuro",
        audio_listening: "Escucha...", audio_repeat: "Repite en voz alta", audio_ready: "Listo", audio_again: "Otra vez",
        audio_your_turn: "Tu turno — ¿cómo vas a repetir?", audio_record: "Grabar voz", audio_silent: "Decir en silencio",
        audio_recording: "Te escucho...", audio_record_error: "No reconocido. Inténtalo de nuevo.", audio_record_noapi: "Grabación de voz no compatible con este navegador.", audio_record_denied: "🎙 Permite el acceso al micrófono en la configuración del navegador.", audio_record_nomic: "🎙 No se encontró micrófono.", audio_record_nospeech: "🎙 No se escuchó nada. Habla más fuerte.",
        resume_title: "Sesión inacabada", resume_progress: "paso {n} de {total}", resume_continue: "Continuar", resume_fresh: "Nuevo texto",
        ocr_btn: "Archivo", ocr_loading: "Leyendo archivo...", ocr_error: "No se pudo leer. Intenta con otro archivo.", ocr_error_doc: "Formato .doc no admitido. Guárdelo como .docx", ocr_error_empty: "Archivo no descargado de la nube. Ábralo en Word y guárdelo localmente.",
        back_lang: "Idioma",
        lib_rename_hint: 'Toca un título para renombrarlo',
        blockSizeLabel: 'Tamaño del bloque:', blockSizeOptions: ['5 palabras', '10 palabras', '15 palabras'],
        restDurLabel: "Duración pausa:", restDurOptions: ["5 seg","10 seg","20 seg","30 seg"],
        restPause: "Pausa", restResume: "Reanudar",
        speedLabel: "Velocidad audio:", speedOptions: ["0.5×","0.75×","1×","1.25×"],
        library_label: "Mis textos", library_empty: "Biblioteca vacía",
        library_save: "Guardar texto", library_saved: "Guardado ✓", library_duplicate: "Ya guardado",
        stat_streak_lbl: "días seguidos", stat_blocks_lbl: "bloques", stat_time_lbl: "en total",
        stat_hr: "h", stat_min: "min",
        notif_prompt: "¿Recordarme mañana?", notif_time_label: "¿A qué hora?",
        notif_dismiss: "No, gracias", notif_body: "¡Hora de practicar! Mantén tu racha 🔥",
        notif_confirm: "Recordatorio activado ✓",
        instruction_hint: "Lee dos veces, recuerda mentalmente y continúa",
        method_mind: "Mental", method_write: "Escritura", method_audio: "Audio",
        text_placeholder: "Pega o escribe tu texto...",
        profile_btn: "Perfil",
        profile_title: "Mi progreso",
        profile_in_progress: "En progreso",
        profile_learned: "Aprendido",
        profile_planned: "Planificado",
        profile_words_tab: "Palabras",
        profile_empty_words: "Aún no hay conjuntos de palabras guardados",
        profile_words_total: "palabras",
        profile_words_mastered: "dominadas",
        profile_words_review: "por repasar",
        profile_train: "Entrenar",
        profile_empty_progress: "Sin sesión activa",
        profile_empty_learned: "Nada aprendido aún. ¡Completa tu primer texto!",
        profile_load: "Cargar",
        profile_name_placeholder: "Tu nombre",
        profile_settings: "Ajustes",
        share_btn: "Compartir resultado",
        setupTitle: '¿Cómo vamos a aprender?',
        nextBtn: 'Siguiente',
        days_info_title: '¿Para cuándo lo necesitas saber?',
        days_info_body: "Esto determina cuántas repeticiones por día.\nExamen mañana — elige 1 día.\nTienes una semana — el ritmo será cómodo.",
        accuracy_info_title: '¿Qué cuenta como correcto?',
        accuracy_info_body: "Al pie de la letra — cada palabra debe coincidir. Para poema o discurso.\nCerca — las palabras clave están. Para presentación.\nLibre — la idea se transmite. Para asimilar conceptos.",
        blocksize_info_title: 'Porción de texto',
        blocksize_info_body: "Una porción es un trozo de texto que memorizas de una vez.\nPequeña (5 palabras) — más fácil, más pasos. Para poemas o niños.\nGrande (15 palabras) — menos pasos, pero más difícil.",
        time_info_title: '¿Cuánto tiempo tienes?',
        time_info_body: "Poco tiempo — la app se detiene y dice: «Por hoy es suficiente».\nMañana continúas desde donde lo dejaste.",
        wt_time_info_title: '¿Cuánto tiempo tienes?',
        wt_time_info_body: 'El número de ejercicios se ajusta a tu tiempo — menos tiempo, menos ejercicios en esta sesión. Los tipos de ejercicio (audio, ortografía, dictado, etc.) dependen del nivel elegido, no del tiempo. "Sin límite" da una sesión completa con todos los tipos desbloqueados para tu nivel.',
        bigReviewLabel: 'TODO (1–{n} bloques)',
        bigReviewHint: 'Lee todo el texto. Luego reproduce desde el principio 🔁',
        w_mode_link: 'Aprender palabras y frases',
        wl_title: 'Par de idiomas', wl_learning: '¿Qué idioma aprendo?', wl_native: 'Mi idioma nativo',
        wl_same_error: 'Elige idiomas diferentes', wl_next: 'Siguiente →',
        wlev_title: '¿Tu nivel?',
        wlev_levels: ['Nunca lo estudié', 'Unas palabras — sobre todo de memes y menús', 'Sobreviviré en el extranjero — con lo básico y una sonrisa', '¡Hablo! Me equivoco. ¡Pero hablo!', 'Subtítulos — por si acaso', 'Pienso y sueño en este idioma'],
        wi_title: 'Añadir palabras', wi_hint: 'Una palabra por línea. Formato: palabra — traducción',
        wi_placeholder: 'dog — perro\ncat — gato\nto run — correr',
        wi_min_error: 'Por favor añade al menos 2 pares',
        wv_title: 'Verificar la lista', wv_hint: 'Toca un par para editar',
        wv_add: '+ Añadir palabra', wv_confirm: 'Todo correcto →',
        wv_min_error: 'Se requieren al menos 2 pares', wv_no_trans: '+ traducción',
        wv_auto_translate: '🌐 Sugerir traducción', wv_translating: 'Traduciendo…',
        wv_translate_failed: 'No se pudieron traducir algunas palabras', wv_translate_offline: 'Sin internet — comprueba la conexión',
        wv_alt_translation: 'Otra traducción', wv_no_alt: 'No hay más opciones — escribe tu propia traducción',
        wv_hint_cycle: '— probar otra opción de traducción',
        wv_alt_info_title: '¿Esta palabra tiene varios significados?',
        wv_alt_info_body: 'Muchas palabras tienen varios significados o se traducen de forma distinta según el contexto. Toca 🔁 junto a cualquier par tantas veces como necesites — cada toque muestra otra traducción de esa palabra. Si ninguna encaja, simplemente toca el par y escribe tu propia traducción.',
        wv_alt_wrapped: 'Estas son todas las opciones — escribe la tuya si ninguna encaja',
        wt_title: 'Nombrar el tema', wt_placeholder: 'p.ej. Animales',
        wt_auto: '✨ Sugerir automáticamente', wt_save: 'Guardar →',
        words_saved: '¡Conjunto guardado!',
        wt_type_w2t: '→ Traducción', wt_type_t2w: '→ Palabra', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Escucha y elige la palabra', wt_listen_btn: 'Escuchar',
        wt_correct: '✓ ¡Correcto!', wt_wrong: 'Ups, inténtalo de nuevo',
        wt_save: 'Guardar palabra', wt_skip: 'Omitir', wt_finish: 'Terminar',
        wt_type_spell: '✏️ Escribir', wt_type_dictation: '🎧 Dictado', wt_type_sentence: '📝 Frase',
        wt_spell_prompt: 'Escribe la palabra en el idioma que aprendes',
        wt_sentence_prompt: 'Completa la palabra que falta',
        wt_sentence_no_examples: 'Todavía no hay frases de ejemplo para estas palabras',
        wt_preparing: 'Preparando ejercicios…',
        wt_dictation_prompt: 'Escucha y escribe la palabra',
        wt_check: 'Comprobar', wt_type_placeholder: 'Escribe tu respuesta...', wt_hint: 'Pista',
        wt_wrong_answer_was: 'Correcto:',
        wt_result_perfect: '🌟 ¡Perfecto!', wt_result_great: '🎉 ¡Genial!',
        wt_result_good: '👍 ¡No está mal!', wt_result_keep: '💪 ¡Sigue así!',
        wt_score_label: 'respuestas correctas', wt_restart: 'Otra vez', wt_home: 'Inicio',
        wt_no_trans: 'Añade traducciones para comenzar el entrenamiento',
        mode_title: '¿Qué quieres aprender?',
        mode_text_label: 'Texto', mode_text_desc: 'Poema, discurso, artículo, presentación',
        mode_words_label: 'Palabras y Frases', mode_words_desc: 'Nuevo vocabulario, traducciones, tarjetas'
    }
};

const MOTIVATIONS = {
    uk: {
        perfect:  ["Ідеально! 🎯", "Ти — текстовий ніндзя! 🥷", "Таку пам'ять треба запатентувати 💥", "Залізно в голові! 🧲", "Вау! Навіть підказка не знадобилась 🌟"],
        great:    ["Майже! Ще трохи — і назавжди 🧠", "Мозок працює на повну!", "Непогано, непогано 👌", "Є прогрес! Так тримати 📈"],
        ok:       ["Щось є! Продовжуй — воно осяде 🌱", "Ближче ніж здається 💪", "Вже краще! Мозок тренується", "Крок за кроком — і ось воно 🚶"],
        struggle: ["Ейнштейн теж не з першого разу 😄", "Мозок ще думає... Це норм 🐢", "Ок, ще раз — і воно твоє!", "Складно? Значить росте 💡", "Нічого страшного — просто ще раз 🔁"],
        mind:     ["Довіряємо твоєму мозку 🧠", "Сам знаєш краще 😄", "Відчув(ла) — значить запам'ятав(ла)!", "Клас! Ти сам собі суддя 🎓"]
    },
    en: {
        perfect:  ["Perfect! 🎯", "You're a text ninja! 🥷", "That memory deserves an award 💥", "Locked in! 🧲", "Wow, no hints needed 🌟"],
        great:    ["Almost! Just a bit more 🧠", "Brain's firing! Great job", "Not bad, not bad 👌", "Progress! Keep it up 📈"],
        ok:       ["Something's there! Keep going 🌱", "Closer than you think 💪", "Getting better! Brain's warming up", "Step by step 🚶"],
        struggle: ["Einstein didn't get it first try either 😄", "Brain's still thinking... totally normal 🐢", "One more time — it's yours!", "Tough? That means you're growing 💡", "No worries — just one more go 🔁"],
        mind:     ["We trust your brain 🧠", "You know best 😄", "If it felt right, it probably was!", "You're your own judge 🎓"]
    },
    pl: {
        perfect:  ["Idealnie! 🎯", "Jesteś tekstowym ninja! 🥷", "Taka pamięć zasługuje na nagrodę 💥", "Na zawsze w głowie! 🧲", "Wow, bez podpowiedzi! 🌟"],
        great:    ["Prawie! Jeszcze trochę 🧠", "Mózg pracuje pełną parą!", "Nieźle, nieźle 👌", "Postęp! Tak trzymaj 📈"],
        ok:       ["Coś jest! Kontynuuj 🌱", "Bliżej niż myślisz 💪", "Lepiej! Mózg się rozgrzewa", "Krok po kroku 🚶"],
        struggle: ["Einstein też nie za pierwszym razem 😄", "Mózg jeszcze myśli... to normalne 🐢", "Jeszcze raz — i już twoje!", "Trudne? To znaczy, że rośniesz 💡", "Spokojnie — jeszcze jedna próba 🔁"],
        mind:     ["Ufamy twojemu mózgowi 🧠", "Sam wiesz najlepiej 😄", "Jeśli poczułeś — zapamiętałeś!", "Jesteś własnym sędzią 🎓"]
    },
    de: {
        perfect:  ["Perfekt! 🎯", "Du bist ein Text-Ninja! 🥷", "Dieses Gedächtnis verdient eine Auszeichnung 💥", "Fest im Kopf! 🧲", "Wow, ohne Hilfe! 🌟"],
        great:    ["Fast! Noch ein bisschen 🧠", "Gehirn auf Hochtouren!", "Nicht schlecht 👌", "Fortschritt! Weiter so 📈"],
        ok:       ["Etwas ist da! Weiter so 🌱", "Näher als du denkst 💪", "Besser! Das Gehirn wärmt sich auf", "Schritt für Schritt 🚶"],
        struggle: ["Einstein hat's auch nicht beim ersten Mal 😄", "Gehirn denkt noch... ganz normal 🐢", "Noch einmal — und es gehört dir!", "Schwer? Das bedeutet Wachstum 💡", "Kein Problem — einfach nochmal 🔁"],
        mind:     ["Wir vertrauen deinem Gehirn 🧠", "Du weißt es am besten 😄", "Wenn es sich richtig anfühlte — war es so!", "Du bist dein eigener Richter 🎓"]
    },
    fr: {
        perfect:  ["Parfait ! 🎯", "Tu es un ninja du texte ! 🥷", "Cette mémoire mérite un prix 💥", "Gravé dans la tête ! 🧲", "Wow, sans aide ! 🌟"],
        great:    ["Presque ! Encore un peu 🧠", "Le cerveau tourne à plein régime !", "Pas mal du tout 👌", "Du progrès ! Continue 📈"],
        ok:       ["Il y a quelque chose ! Continue 🌱", "Plus près que tu ne le penses 💪", "Mieux ! Le cerveau chauffe", "Pas à pas 🚶"],
        struggle: ["Einstein non plus n'y est pas arrivé du premier coup 😄", "Le cerveau réfléchit encore... c'est normal 🐢", "Encore une fois — et c'est à toi !", "Difficile ? Ça veut dire que tu grandis 💡", "Pas de souci — juste un autre essai 🔁"],
        mind:     ["On fait confiance à ton cerveau 🧠", "Tu sais mieux que quiconque 😄", "Si tu l'as ressenti, tu l'as mémorisé !", "Tu es ton propre juge 🎓"]
    },
    es: {
        perfect:  ["¡Perfecto! 🎯", "¡Eres un ninja del texto! 🥷", "Esa memoria merece un premio 💥", "¡Grabado en la mente! 🧲", "¡Wow, sin pistas! 🌟"],
        great:    ["¡Casi! Un poco más 🧠", "¡El cerebro a tope!", "No está mal 👌", "¡Progreso! Sigue así 📈"],
        ok:       ["¡Algo hay! Continúa 🌱", "Más cerca de lo que crees 💪", "¡Mejor! El cerebro se calienta", "Paso a paso 🚶"],
        struggle: ["Einstein tampoco lo logró al primer intento 😄", "El cerebro aún piensa... es normal 🐢", "¡Una vez más y es tuyo!", "¿Difícil? Eso significa que creces 💡", "Sin problema — otro intento más 🔁"],
        mind:     ["Confiamos en tu cerebro 🧠", "Tú sabes mejor 😄", "Si lo sentiste, lo recordaste", "Eres tu propio juez 🎓"]
    }
};

function getMotivation(lang, category) {
    const pool = (MOTIVATIONS[lang] || MOTIVATIONS.uk)[category];
    if (!pool || !pool.length) return '';
    return pool[Math.floor(Math.random() * pool.length)];
}

function showMotivToast(msg) {
    if (!msg) return;
    let toast = document.getElementById('motivToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'motivToast';
        toast.className = 'motiv-toast';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.classList.remove('motiv-toast-hide');
    toast.classList.add('motiv-toast-show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
        toast.classList.remove('motiv-toast-show');
        toast.classList.add('motiv-toast-hide');
    }, 2000);
}

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

const langToSpeech = { uk: 'uk-UA', en: 'en-GB', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };

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
    lib.unshift({ id: Date.now(), title: text.replace(/\n/g, ' ').slice(0, 70), text, savedAt: Date.now() });
    if (lib.length > MAX_LIBRARY) lib.pop();
    saveLibrary(lib);
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

// ===== OCR + FILE IMPORT =====
const tessLang = { uk: 'ukr', en: 'eng', pl: 'pol', de: 'deu', fr: 'fra', es: 'spa' };

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });
}

function loadTesseract() {
    return new Promise((resolve, reject) => {
        if (window.Tesseract) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

function triggerOCR() {
    document.getElementById('ocrInput').value = '';
    document.getElementById('ocrInput').click();
}

async function handleOCRFile(input) {
    const file = input.files[0];
    if (!file) return;
    const t = translations[currentLang];
    const overlay = document.getElementById('ocrOverlay');
    const status = document.getElementById('ocrStatus');
    const fill = document.getElementById('ocrFill');
    const btn = document.getElementById('ocrBtn');

    overlay.style.display = 'flex';
    status.innerText = t.ocr_loading;
    fill.style.width = '0%';
    btn.disabled = true;

    try {
        let text = '';

        // Empty file = cloud placeholder (OneDrive/iCloud not downloaded)
        if (file.size === 0) throw new Error('file_empty');

        // Detect real file type by magic bytes — reliable regardless of MIME or filename
        const magic = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = e => res(new Uint8Array(e.target.result));
            r.onerror = rej;
            r.readAsArrayBuffer(file.slice(0, 8));
        });

        // PK (50 4B) = ZIP → .docx / .xlsx / .odt ...
        const isZip = magic[0] === 0x50 && magic[1] === 0x4B;
        // %PDF (25 50 44 46)
        const isPdf = magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46;
        // Old .doc: D0 CF 11 E0
        const isLegacyDoc = magic[0] === 0xD0 && magic[1] === 0xCF;
        const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
        const isImage = file.type.startsWith('image/');

        if (isText) {
            fill.style.width = '50%';
            text = await file.text();
            fill.style.width = '100%';

        } else if (isPdf) {
            text = await extractFromPdf(file, fill);

        } else if (isZip) {
            // ZIP-based: .docx, .odt — process with mammoth
            fill.style.width = '30%';
            await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');
            fill.style.width = '70%';
            const ab = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = e => res(e.target.result);
                r.onerror = rej;
                r.readAsArrayBuffer(file);
            });
            const result = await mammoth.extractRawText({ arrayBuffer: ab });
            text = result.value || '';
            fill.style.width = '100%';

        } else if (isLegacyDoc) {
            throw new Error('doc_not_supported');

        } else if (isImage) {
            await loadTesseract();
            const lang = document.getElementById('ocrLang').value || tessLang[currentLang] || 'eng';
            const worker = await Tesseract.createWorker(lang, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        fill.style.width = Math.round(m.progress * 100) + '%';
                    }
                }
            });
            const { data: { text: ocrText } } = await worker.recognize(file);
            await worker.terminate();
            text = ocrText;

        } else {
            // Unknown type — try image OCR as last resort
            await loadTesseract();
            const lang = document.getElementById('ocrLang').value || tessLang[currentLang] || 'eng';
            const worker = await Tesseract.createWorker(lang, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        fill.style.width = Math.round(m.progress * 100) + '%';
                    }
                }
            });
            const { data: { text: ocrText } } = await worker.recognize(file);
            await worker.terminate();
            text = ocrText;
        }

        const cleaned = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
        if (cleaned.length > 3) {
            document.getElementById('userText').value = cleaned;
            clearValidation();
        } else {
            showValidation(t.ocr_error);
        }
    } catch(e) {
        const msg = e.message === 'doc_not_supported' ? (t.ocr_error_doc || '.doc не підтримується. Збережіть як .docx.')
                  : e.message === 'file_empty'        ? (t.ocr_error_empty || 'Файл не завантажено з хмари. Відкрийте його у Word і збережіть локально.')
                  : t.ocr_error;
        showValidation(msg);
    } finally {
        overlay.style.display = 'none';
        btn.disabled = false;
    }
}

async function extractFromPdf(file, fillEl) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const ab = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
        if (fillEl) fillEl.style.width = Math.round((i / pdf.numPages) * 100) + '%';
    }
    return text;
}

const codedRests = {
    light: "linear-gradient(135deg, #d8f3dc, #b7e4c7)",
    dark:  "linear-gradient(135deg, #1a1f35, #1e2a4a)"
};

function playRestDoneSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
}

// F-06: короткий, м'який сигнал на початку НОВОГО блоку (не плутати з playRestDoneSound)
function playNewBlockSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        g.gain.setValueAtTime(0.06, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.18);
    } catch {}
}

// F-04: плавна поява тексту блоку — перезапускає CSS-анімацію на елементі
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
            // Вірш / пісня: кожен рядок = окремий блок
            const lines = trimmed.split('\n')
                .map(l => l.replace(/\s+/g, ' ').trim())
                .filter(l => countWords(l) >= 2);
            blocks.push(...lines);
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
    return result.filter(s => countWords(s) >= 4);
}

// ===== SCREEN MANAGER =====
const SCREENS = ['langScreen','modeScreen','inputScreen','setupScreen','learningScreen','restScreen','sessionPauseScreen','finalScreen','profileScreen','wordProfileScreen','wordLangScreen','wordLevelScreen','wordInputScreen','wordVerifyScreen','wordTopicScreen','wordTrainingScreen','wordResultsScreen'];
const FLEX_SCREENS = ['sessionPauseScreen','finalScreen','wordResultsScreen'];

function showScreen(id) {
    SCREENS.forEach(s => {
        const el = document.getElementById(s);
        if (!el) return;
        if (s === id) {
            el.style.display = FLEX_SCREENS.includes(s) ? 'flex' : 'block';
            if (!FLEX_SCREENS.includes(s) && s !== 'restScreen') {
                el.classList.remove('screen-fade-enter');
                void el.offsetWidth;
                el.classList.add('screen-fade-enter');
            }
        } else {
            el.style.display = 'none';
        }
    });
}

function setLanguage(lang) {
    currentLang = lang;
    showModeScreen();
}

function goBackToLang() {
    showScreen('langScreen');
}

function showModeScreen() {
    const t = translations[currentLang];
    showScreen('modeScreen');
    document.getElementById('modeBackLabel').innerText = t.back_lang || 'Мова';
    document.getElementById('modeTitleEl').innerText = t.mode_title || 'Що хочемо вчити?';
    document.getElementById('modeTextLabel').innerText = t.mode_text_label || 'Текст';
    document.getElementById('modeTextDesc').innerText = t.mode_text_desc || 'Вірш, монолог, виступ, презентація';
    document.getElementById('modeWordsLabel').innerText = t.mode_words_label || 'Слова та Фрази';
    document.getElementById('modeWordsDesc').innerText = t.mode_words_desc || 'Нова лексика, переклади, словник';
    updateThemeToggleFab();
}

function selectMode(mode) {
    if (mode === 'text') {
        showInputScreen();
    } else {
        showWordLangScreen();
    }
}

function showInputScreen() {
    const t = translations[currentLang];
    showScreen('inputScreen');
    document.getElementById('backBtnLabel').innerText = t.back_lang;
    updateThemeToggleFab();
    updateProfileNavAvatar();
    document.getElementById('roleSubtitle').innerText = t.welcome;
    document.getElementById('ocrBtnLabel').innerText = t.ocr_btn;
    document.getElementById('ocrLang').value = tessLang[currentLang] || 'eng';
    document.getElementById('userText').placeholder = t.text_placeholder;
    const savePlannedBtn = document.getElementById('saveToPlannedBtn');
    if (savePlannedBtn) savePlannedBtn.title = t.library_save;
    document.getElementById('inputLabel').innerText = t.inputLabel;
    const nextBtn = document.getElementById('nextToSetupBtn');
    if (nextBtn) nextBtn.innerText = (t.nextBtn || 'Далі') + ' →';
    checkSavedState();
    renderStats();
    checkPendingReminder();
}

function goToSetup() {
    const t = translations[currentLang];
    const text = document.getElementById('userText').value.trim();
    if (!text) {
        showValidation(t.validation_no_text);
        document.getElementById('userText').focus();
        return;
    }
    if (countWords(text) < 4) {
        showValidation(t.validation_too_short);
        return;
    }
    const testBlocks = smartSplitText(text, blockSize);
    if (testBlocks.length === 0) {
        showValidation(t.validation_too_short);
        return;
    }
    clearValidation();
    showSetupScreen();
}

function showSetupScreen() {
    const t = translations[currentLang];
    showScreen('setupScreen');
    document.getElementById('setupTitle').innerText = t.setupTitle || 'Як будемо вчити?';
    document.getElementById('setupStartBtn').innerText = t.startBtn;
    document.getElementById('setupBackLabel').innerText = t.back_lang || 'Назад';
    renderDayOptions();
    renderAccuracyCards();
    renderBlockSizeCards();
    renderTimeOptions();
    // Bind info buttons
    document.getElementById('daysInfoBtn').onclick = () =>
        openInfoPopup(t.days_info_title, t.days_info_body);
    document.getElementById('accuracyInfoBtn').onclick = () =>
        openInfoPopup(t.accuracy_info_title, t.accuracy_info_body);
    document.getElementById('blockSizeInfoBtn').onclick = () =>
        openInfoPopup(t.blocksize_info_title, t.blocksize_info_body);
    document.getElementById('timeInfoBtn').onclick = () =>
        openInfoPopup(t.time_info_title, t.time_info_body);
}

function goBackToInput() {
    showScreen('inputScreen');
}

function openInfoPopup(title, body) {
    document.getElementById('infoPopupTitle').innerText = title;
    document.getElementById('infoPopupBody').innerText = body;
    const popup = document.getElementById('infoPopup');
    popup.style.display = 'flex';
    requestAnimationFrame(() => popup.classList.add('visible'));
}

function closeInfoPopup(event) {
    if (event && event.target !== document.getElementById('infoPopup')) return;
    const popup = document.getElementById('infoPopup');
    popup.classList.remove('visible');
    setTimeout(() => { popup.style.display = 'none'; }, 260);
}

function selectTheme(theme, el) {
    currentTheme = theme;
    document.body.dataset.theme = theme;
    document.querySelectorAll('.theme-card, .lang-theme-btn').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    try { localStorage.setItem('memori_theme', theme); } catch {}
    updateThemeToggleFab();
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    currentTheme = newTheme;
    document.body.dataset.theme = newTheme;
    document.querySelectorAll('.lang-theme-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.theme === newTheme);
    });
    try { localStorage.setItem('memori_theme', newTheme); } catch {}
    updateThemeToggleFab();
}

function updateThemeToggleFab() {
    const sun = document.getElementById('themeIconSun');
    const moon = document.getElementById('themeIconMoon');
    if (!sun || !moon) return;
    sun.style.display = currentTheme === 'dark' ? 'block' : 'none';
    moon.style.display = currentTheme === 'dark' ? 'none' : 'block';
}

function renderDayOptions() {
    const t = translations[currentLang];
    const sel = document.getElementById('studyDays');
    sel.innerHTML = '';
    t.dayOptions.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        sel.appendChild(o);
    });
}

function renderAccuracyCards() {
    const t = translations[currentLang];
    document.getElementById('accuracyLabel').innerText = t.accuracyLabel;
    const container = document.getElementById('accuracyCards');
    container.innerHTML = '';
    t.accuracyLevels.forEach(level => {
        const card = document.createElement('div');
        card.className = 'accuracy-card' + (level.id === accuracyLevel ? ' active' : '');
        card.dataset.level = level.id;
        card.innerHTML = `<div class="acc-icon">${ICONS[level.id]}</div><span class="acc-name">${level.name}</span><span class="acc-hint">${level.hint}</span>`;
        card.addEventListener('click', () => {
            accuracyLevel = level.id;
            document.querySelectorAll('.accuracy-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
        container.appendChild(card);
    });
}

function renderTimeOptions() {
    const t = translations[currentLang];
    document.getElementById('timeLabel').innerText = t.timeLabel;
    const container = document.getElementById('timeCards');
    container.innerHTML = '';
    t.timeOptions.forEach(opt => {
        const card = document.createElement('button');
        card.className = 'time-card' + (opt.value === sessionTimeLimit ? ' active' : '');
        card.innerText = opt.label;
        card.addEventListener('click', () => {
            sessionTimeLimit = opt.value;
            document.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
        container.appendChild(card);
    });
}

function renderRestDurOptions() {
    const t = translations[currentLang];
    const lbl = document.getElementById('restDurLabel');
    if (lbl) lbl.innerText = t.restDurLabel;
    const vals = [5, 10, 20, 30];
    const container = document.getElementById('restDurCards');
    if (!container) return;
    container.innerHTML = '';
    t.restDurOptions.forEach((label, i) => {
        const card = document.createElement('button');
        card.className = 'time-card' + (vals[i] === restDuration ? ' active' : '');
        card.innerText = label;
        card.addEventListener('click', () => {
            restDuration = vals[i];
            saveAppSettings();
            document.querySelectorAll('#restDurCards .time-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
        container.appendChild(card);
    });
}

function renderSpeedOptions() {
    const t = translations[currentLang];
    const lbl = document.getElementById('speedLabel');
    if (lbl) lbl.innerText = t.speedLabel;
    const vals = [0.5, 0.75, 1.0, 1.25];
    const container = document.getElementById('speedCards');
    if (!container) return;
    container.innerHTML = '';
    t.speedOptions.forEach((label, i) => {
        const card = document.createElement('button');
        card.className = 'time-card' + (vals[i] === ttsSpeed ? ' active' : '');
        card.innerText = label;
        card.addEventListener('click', () => {
            ttsSpeed = vals[i];
            saveAppSettings();
            document.querySelectorAll('#speedCards .time-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
        container.appendChild(card);
    });
}

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    const chevron = document.getElementById('settingsChevron');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function renderBlockSizeCards() {
    const t = translations[currentLang];
    const label = document.getElementById('blockSizeLabel');
    if (label) label.innerText = t.blockSizeLabel || 'Розмір блоку:';
    const vals = [5, 10, 15];
    const labels = t.blockSizeOptions || ['5 слів', '10 слів', '15 слів'];
    const container = document.getElementById('blockSizeCards');
    if (!container) return;
    container.innerHTML = '';
    vals.forEach((val, i) => {
        const card = document.createElement('button');
        card.className = 'time-card' + (val === blockSize ? ' active' : '');
        card.innerText = labels[i];
        card.addEventListener('click', () => {
            blockSize = val;
            saveAppSettings();
            container.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
        container.appendChild(card);
    });
}

function applyFontSize() {
    const size = FONT_SIZES[fontSizeIndex];

    // Scale content text (what user reads/writes)
    ['textDisplay', 'audioRepeatText', 'mindCardBody'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.fontSize = size + 'rem';
    });

    // Writing textarea: cap at 1.25rem so it stays comfortable for typing
    const wi = document.getElementById('writingInput');
    if (wi) wi.style.fontSize = Math.min(size, 1.25) + 'rem';

    // Scale method buttons proportionally but softer (so layout doesn't break)
    const btnFontSize = (0.78 + (size - 1.0) * 0.18).toFixed(2);
    const btnPad = size > 1.4 ? '11px 4px' : '10px 6px';
    document.querySelectorAll('.btn-small').forEach(b => {
        b.style.fontSize = btnFontSize + 'rem';
        b.style.padding = btnPad;
    });

    // Scale main action button text slightly too
    const nb = document.getElementById('nextBtn');
    if (nb) nb.style.fontSize = (1.0 + (size - 1.0) * 0.25).toFixed(2) + 'rem';
}

function changeFontSize(dir) {
    fontSizeIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, fontSizeIndex + dir));
    applyFontSize();
    saveAppSettings();
}


function clearValidation() {
    document.getElementById('validationMsg').style.display = 'none';
}

function showValidation(msg) {
    const el = document.getElementById('validationMsg');
    el.innerText = msg;
    el.style.display = 'flex';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Shake the textarea
    const ta = document.getElementById('userText');
    if (ta) {
        ta.classList.remove('shake');
        void ta.offsetWidth; // reflow
        ta.classList.add('shake');
        setTimeout(() => ta.classList.remove('shake'), 400);
    }
}

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
        display.innerHTML = `<span class="first-word">${blocks[step.index].split(' ')[0]}</span> ...`;
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

function resumeLearning() { currentStepIndex++; showStep(); }

function selectMethod(m, el) {
    currentMethod = m;
    window.speechSynthesis.cancel();
    document.querySelectorAll('.btn-small').forEach(b => b.classList.remove('active-method'));
    if (el) el.classList.add('active-method');

    if (m === 'mind') showMindInstruction();
    else if (m === 'write') showWritingInput();
    else if (m === 'audio') showAudioMethod();
}

function showAudioMethod() {
    document.getElementById('textDisplay').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('mindCard').style.display = 'none';
    document.getElementById('writingArea').style.display = 'none';
    document.getElementById('writingResult').style.display = 'none';
    document.getElementById('audioCard').style.display = 'block';
    renderAudioSpeedRow();
    speakCurrentBlock();
}

function speakCurrentBlock() {
    const t = translations[currentLang];
    const step = learningQueue[currentStepIndex];
    const text = step.type === 'bigReview'
        ? (window._bigReviewText || blocks.slice(0, step.upToIndex + 1).join(' '))
        : blocks[step.index];

    document.getElementById('audioStatus').innerText = t.audio_listening;
    document.getElementById('audioRepeatText').style.display = 'none';
    document.getElementById('audioActions').style.display = 'none';
    document.getElementById('audioCard').classList.add('speaking');

    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = langToSpeech[currentLang] || 'en-GB';
    utt.rate = ttsSpeed;
    utt.pitch = 1;
    const voice = wtPickVoice(utt.lang);
    if (voice) utt.voice = voice;

    utt.onend = () => {
        const t = translations[currentLang];
        document.getElementById('audioCard').classList.remove('speaking');
        document.getElementById('audioStatus').innerText = t.audio_your_turn;
        document.getElementById('audioRepeatText').style.display = 'none';
        document.getElementById('audioAgainBtn').innerText = t.audio_again;
        document.getElementById('audioBtnRecord').innerText = t.audio_record;
        document.getElementById('audioBtnSilent').innerText = t.audio_silent;
        document.getElementById('audioActions').style.display = 'flex';
    };

    utt.onerror = () => {
        document.getElementById('audioCard').classList.remove('speaking');
        utt.onend();
    };

    window.speechSynthesis.speak(utt);
}

function speakAgain() {
    speakCurrentBlock();
}

function onAudioReady() {
    window.speechSynthesis.cancel();
    document.getElementById('audioCard').style.display = 'none';
    nextBlock();
}

function onAudioSilent() {
    window.speechSynthesis.cancel();
    document.getElementById('audioCard').style.display = 'none';
    const display = document.getElementById('textDisplay');
    const silentStep = learningQueue[currentStepIndex];
    const silentText = silentStep.type === 'bigReview'
        ? (window._bigReviewText || blocks.slice(0, silentStep.upToIndex + 1).join('\n'))
        : blocks[silentStep.index];
    display.innerText = silentText;
    if (silentStep.type === 'bigReview') display.style.whiteSpace = 'pre-line';
    else display.style.whiteSpace = '';
    display.style.display = 'flex';
    const t = translations[currentLang];
    const btn = document.getElementById('nextBtn');
    btn.innerText = t.next;
    btn.style.display = 'block';
}

async function startVoiceRecord() {
    const t = translations[currentLang];
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        showAudioError(t.audio_record_noapi);
        return;
    }

    // Pre-check microphone permission and request it explicitly
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // release immediately
    } catch (err) {
        // NotAllowedError = user denied; NotFoundError = no mic
        const msg = (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')
            ? (t.audio_record_nomic || '🎙 Мікрофон не знайдено.')
            : (t.audio_record_denied || '🎙 Дозвольте доступ до мікрофона в налаштуваннях браузера.');
        showAudioError(msg);
        return;
    }

    document.getElementById('audioActions').style.display = 'none';
    document.getElementById('micRecording').style.display = 'flex';
    document.getElementById('micStatus').innerText = t.audio_recording;

    const voiceStep = learningQueue[currentStepIndex];
    const text = voiceStep.type === 'bigReview'
        ? (window._bigReviewText || blocks.slice(0, voiceStep.upToIndex + 1).join(' '))
        : blocks[voiceStep.index];
    const recognition = new SR();
    recognition.lang = langToSpeech[currentLang] || 'en-GB';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    window._activeRecognition = recognition;

    recognition.onresult = (event) => {
        window._activeRecognition = null;
        const spoken = event.results[0][0].transcript;
        document.getElementById('micRecording').style.display = 'none';
        document.getElementById('audioCard').style.display = 'none';
        const result = compareTexts(text, spoken, accuracyLevel);
        showWritingResult(text, spoken, result);
    };

    recognition.onerror = (event) => {
        window._activeRecognition = null;
        document.getElementById('micRecording').style.display = 'none';
        document.getElementById('audioActions').style.display = 'flex';
        const errType = event.error;
        let msg;
        if (errType === 'not-allowed' || errType === 'permission-denied') {
            msg = t.audio_record_denied || '🎙 Дозвольте доступ до мікрофона в налаштуваннях браузера.';
        } else if (errType === 'no-speech') {
            msg = t.audio_record_nospeech || '🎙 Нічого не почуто. Говоріть голосніше.';
        } else if (errType === 'audio-capture' || errType === 'not-found') {
            msg = t.audio_record_nomic || '🎙 Мікрофон не знайдено.';
        } else {
            msg = t.audio_record_error;
        }
        document.getElementById('audioStatus').innerText = msg;
    };

    recognition.onend = () => {
        window._activeRecognition = null;
        // If no result came and mic panel still showing → show retry prompt
        if (document.getElementById('micRecording').style.display !== 'none') {
            document.getElementById('micRecording').style.display = 'none';
            document.getElementById('audioActions').style.display = 'flex';
        }
    };

    try {
        recognition.start();
    } catch(e) {
        window._activeRecognition = null;
        document.getElementById('micRecording').style.display = 'none';
        document.getElementById('audioActions').style.display = 'flex';
        document.getElementById('audioStatus').innerText = t.audio_record_noapi;
    }
}

function showAudioError(msg) {
    document.getElementById('micRecording').style.display = 'none';
    document.getElementById('audioActions').style.display = 'flex';
    document.getElementById('audioStatus').innerText = msg;
}

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

    const wordsPerLine = mindHintLevel === 1 ? 1 : 3;
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
    checkBtn.style.opacity = '0.5';

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
        checkBtn.style.opacity = hasText ? '1' : '0.5';
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
    let hintWord = null;
    for (let i = 0; i < origWords.length; i++) {
        const dist = levenshtein(origWords[i], writWords[i] || '');
        if (dist > 0) { hintWord = origWords[i]; break; }
    }
    if (!hintWord) hintWord = origWords[writWords.length] || null;

    if (!hintWord) return; // already complete

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
            ? `<span class="${cls}">${r.word} </span>`
            : `<span>${r.word} </span>`;
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

// ===== SHARE =====
function generateShareCard(blockCount, timeStr, textSnippet, lang) {
    const t = translations[lang] || translations['uk'];
    const W = 600, H = 600;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1b4332');
    bg.addColorStop(1, '#52b788');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative circles
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(W + 60, -60, 260, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-40, H + 40, 200, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Logo top-left
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '600 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Memori', 48, 66);

    // Big block count (center)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 120px "Segoe UI", Arial, sans-serif';
    ctx.fillText(String(blockCount), W / 2, 290);

    // Blocks label
    ctx.font = '600 26px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(t.finish_blocks || 'blocks', W / 2, 340);

    // Time
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`${t.finish_time || 'Time'}: ${timeStr}`, W / 2, 382);

    // Thin separator
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 130, 412); ctx.lineTo(W / 2 + 130, 412);
    ctx.stroke();

    // Text snippet (italic, truncated)
    const snippet = textSnippet.length > 44 ? textSnippet.slice(0, 44) + '…' : textSnippet;
    ctx.font = 'italic 20px "Segoe UI", Georgia, serif';
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.fillText('“' + snippet + '”', W / 2, 450);

    // Bottom tag
    ctx.font = '15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('memori.app', W / 2, 558);

    return canvas;
}

async function shareResult() {
    if (!lastShareData) return;
    const { blockCount, timeStr, textSnippet, lang } = lastShareData;
    const canvas = generateShareCard(blockCount, timeStr, textSnippet, lang);
    const t = translations[lang] || translations['uk'];

    canvas.toBlob(async (blob) => {
        const file = new File([blob], 'memori-result.png', { type: 'image/png' });
        const shareText = `${blockCount} ${t.finish_blocks}`;
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: 'Memori', text: shareText });
                return;
            } catch (e) {
                if (e.name === 'AbortError') return; // user cancelled — don't fallback
            }
        }
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'memori-result.png';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
}

// ===== PROFILE =====

// Один "слот повернення" — куди закрити Профіль назад. Профіль ніколи не
// відкривається сам із себе, тому одного слота (а не стеку) достатньо.
let profileReturnFn = null;

function openProfile(returnFn) {
    profileReturnFn = typeof returnFn === 'function' ? returnFn : showInputScreen;
    showScreen('profileScreen');
    const t = translations[currentLang];
    document.getElementById('profileBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('ptab-progress-lbl').innerText = t.profile_in_progress || 'В роботі';
    document.getElementById('ptab-learned-lbl').innerText = t.profile_learned || 'Вивчено';
    document.getElementById('ptab-planned-lbl').innerText = t.profile_planned || 'Плани';
    currentProfileTab = 'progress';
    document.querySelectorAll('.profile-tab').forEach((btn, i) => btn.classList.toggle('active', i === 0));
    renderProfileHero();
    renderProfileTab('progress');
}

function closeProfile() {
    (profileReturnFn || showInputScreen)();
}

function selectProfileTab(tab, btn) {
    currentProfileTab = tab;
    document.querySelectorAll('.profile-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderProfileTab(tab);
}

function renderProfileTab(tab) {
    const container = document.getElementById('profileContent');
    const t = translations[currentLang];
    container.innerHTML = '';
    const deleteSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;

    if (tab === 'progress') {
        const s = loadState();
        if (!s || !s.blocks || !s.blocks.length) {
            container.innerHTML = `<p class="profile-empty">${t.profile_empty_progress || 'Немає активної сесії'}</p>`;
            return;
        }
        const raw = (s.rawText || '').replace(/\n/g, ' ');
        const title = (raw.length > 60 ? raw.slice(0, 60) + '…' : raw) || '—';
        const date = new Date(s.savedAt).toLocaleDateString();
        const done = s.newBlocksShown || 0;
        container.innerHTML = `
          <div class="profile-item">
            <div class="profile-item-body">
              <div class="profile-item-title">${title}</div>
              <div class="profile-item-meta">${date} · ${done} / ${s.blocks.length} ${t.finish_blocks || 'блоків'}</div>
            </div>
            <div class="profile-item-actions">
              <button class="btn-profile-action" onclick="profileContinue()">${t.resume_continue || 'Продовжити'}</button>
              <button class="btn-profile-delete" onclick="profileDiscardProgress()">${deleteSvg}</button>
            </div>
          </div>`;

    } else if (tab === 'learned') {
        const arr = loadLearned();
        if (arr.length === 0) {
            container.innerHTML = `<p class="profile-empty">${t.profile_empty_learned || 'Ще нічого не вивчено'}</p>`;
            return;
        }
        container.innerHTML = arr.map(entry => {
            const title = entry.title.length > 60 ? entry.title.slice(0, 60) + '…' : entry.title;
            const date = new Date(entry.completedAt).toLocaleDateString();
            return `<div class="profile-item">
              <div class="profile-item-body">
                <div class="profile-item-title">${title}</div>
                <div class="profile-item-meta">${date} · ${entry.blockCount} ${t.finish_blocks || 'блоків'}</div>
              </div>
              <div class="profile-item-actions">
                <button class="btn-profile-action btn-profile-ghost" onclick="profileLearnAgain(${entry.id})">${t.finish_restart || 'Знову'}</button>
                <button class="btn-profile-delete" onclick="profileDeleteLearned(${entry.id})">${deleteSvg}</button>
              </div>
            </div>`;
        }).join('');

    } else if (tab === 'planned') {
        const lib = loadLibrary();
        if (lib.length === 0) {
            container.innerHTML = `<p class="profile-empty">${t.library_empty || 'Бібліотека порожня'}</p>`;
            return;
        }
        const hint = `<p class="profile-list-hint">${t.lib_rename_hint || 'Натисніть на назву щоб перейменувати'}</p>`;
        container.innerHTML = hint + lib.map(entry => {
            const rawTitle = entry.customTitle || entry.title;
            const title = rawTitle.length > 60 ? rawTitle.slice(0, 60) + '…' : rawTitle;
            const date = new Date(entry.savedAt).toLocaleDateString();
            return `<div class="profile-item" id="lib-item-${entry.id}">
              <div class="profile-item-body" onclick="startRenameLibEntry(${entry.id})">
                <div class="profile-item-title" id="lib-title-${entry.id}">${title}</div>
                <div class="profile-item-meta">${date}</div>
              </div>
              <div class="profile-item-actions">
                <button class="btn-profile-action" onclick="profileLoadText(${entry.id})">${t.profile_load || 'Завантажити'}</button>
                <button class="btn-profile-delete" onclick="profileDeletePlanned(${entry.id})">${deleteSvg}</button>
              </div>
            </div>`;
        }).join('');
    }
}

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

function profileContinue() {
    document.getElementById('profileScreen').style.display = 'none';
    resumeSession();
}

function profileDiscardProgress() {
    clearState();
    renderProfileTab('progress');
}

function profileLearnAgain(id) {
    const entry = loadLearned().find(e => e.id === id);
    if (!entry) return;
    document.getElementById('profileScreen').style.display = 'none';
    showInputScreen();
    document.getElementById('userText').value = entry.text;
}

function profileDeleteLearned(id) {
    saveLearned(loadLearned().filter(e => e.id !== id));
    renderProfileTab('learned');
}

function profileLoadText(id) {
    const entry = loadLibrary().find(e => e.id === id);
    if (!entry) return;
    document.getElementById('profileScreen').style.display = 'none';
    showInputScreen();
    document.getElementById('userText').value = entry.text;
}

function profileDeletePlanned(id) {
    saveLibrary(loadLibrary().filter(e => e.id !== id));
    updateLibraryCount();
    renderProfileTab('planned');
}

function profileTrainWordSet(id) {
    const set = loadWordSets().find(s => s.id === id);
    if (!set) return;
    startWordTraining(set); // showScreen('wordTrainingScreen') всередині ховає поточний екран самостійно
}

function profileDeleteWordSet(id) {
    saveWordSets(loadWordSets().filter(s => s.id !== id));
    renderProfileTab('words');
}

function startRenameLibEntry(id) {
    const titleEl = document.getElementById('lib-title-' + id);
    if (!titleEl) return;
    const lib = loadLibrary();
    const entry = lib.find(e => e.id === id);
    if (!entry) return;

    const currentTitle = entry.customTitle || entry.title;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'lib-rename-input';
    input.maxLength = 60;

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    function save() {
        const newTitle = input.value.trim() || entry.title;
        const lib2 = loadLibrary();
        const idx = lib2.findIndex(e => e.id === id);
        if (idx >= 0) {
            lib2[idx].customTitle = newTitle;
            saveLibrary(lib2);
        }
        renderProfileTab('planned');
    }

    input.onblur = save;
    input.onkeydown = e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.value = currentTitle; input.blur(); }
    };
}

// ===== WORDS MODE =====

// Preload TTS voices (async in some browsers)
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

const WORDS_SETS_KEY = 'memoriWords_sets';
function loadWordSets() {
    try { return JSON.parse(localStorage.getItem(WORDS_SETS_KEY)) || []; } catch { return []; }
}
function saveWordSets(sets) {
    try { localStorage.setItem(WORDS_SETS_KEY, JSON.stringify(sets)); } catch {}
}

const WORD_LANGUAGES = [
    { code: 'en', flag: 'gb', name: 'English' },
    { code: 'uk', flag: 'ua', name: 'Українська' },
    { code: 'pl', flag: 'pl', name: 'Polski' },
    { code: 'de', flag: 'de', name: 'Deutsch' },
    { code: 'fr', flag: 'fr', name: 'Français' },
    { code: 'es', flag: 'es', name: 'Español' },
    { code: 'it', flag: 'it', name: 'Italiano' },
    { code: 'pt', flag: 'pt', name: 'Português' },
    { code: 'nl', flag: 'nl', name: 'Nederlands' },
    { code: 'sv', flag: 'se', name: 'Svenska' },
    { code: 'cs', flag: 'cz', name: 'Čeština' },
    { code: 'hu', flag: 'hu', name: 'Magyar' },
    { code: 'ro', flag: 'ro', name: 'Română' },
    { code: 'tr', flag: 'tr', name: 'Türkçe' },
    { code: 'ja', flag: 'jp', name: '日本語' },
    { code: 'zh', flag: 'cn', name: '中文' },
    { code: 'ko', flag: 'kr', name: '한국어' },
    { code: 'ar', flag: 'sa', name: 'العربية' },
];

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showWordLangScreen() {
    const t = translations[currentLang];
    showScreen('wordLangScreen');
    updateProfileNavAvatar();
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
    showWordLevelScreen();
}

function showWordLevelScreen() {
    const t = translations[currentLang];
    showScreen('wordLevelScreen');
    document.getElementById('wlevBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('wlevTitleEl').innerText = t.wlev_title || 'Твій рівень?';
    document.getElementById('wlevNextBtn').innerText = t.wl_next || 'Далі →';
    document.getElementById('wordTimeLabel').innerText = t.timeLabel;
    const wordTimeInfoBtn = document.getElementById('wordTimeInfoBtn');
    if (wordTimeInfoBtn) wordTimeInfoBtn.onclick = () => openInfoPopup(
        t.wt_time_info_title || t.time_info_title,
        t.wt_time_info_body || t.time_info_body
    );
    renderWordLevels();
    renderWordTimeOptions();
}

// Скільки часу є зараз на тренування слів — визначає РОЗМІР черги вправ.
// Рівень на типи вправ не впливає (всі типи доступні на будь-якому рівні).
let wordSessionTime = Infinity;
function renderWordTimeOptions() {
    const t = translations[currentLang];
    const container = document.getElementById('wordTimeCards');
    if (!container) return;
    container.innerHTML = '';
    t.timeOptions.forEach(opt => {
        const card = document.createElement('button');
        card.className = 'time-card' + (opt.value === wordSessionTime ? ' active' : '');
        card.innerText = opt.label;
        card.addEventListener('click', () => {
            wordSessionTime = opt.value;
            container.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
        container.appendChild(card);
    });
}

function renderWordLevels() {
    const t = translations[currentLang];
    const levels = t.wlev_levels || ['Never studied it', 'Have basic knowledge', 'Can manage abroad', 'Speak fluently'];
    const container = document.getElementById('wordLevelCards');
    container.innerHTML = levels.map((label, i) => {
        const id = i + 1;
        return `<button class="word-level-card${wordLevel === id ? ' active' : ''}"
                        onclick="selectWordLevel(${id}, this)">
            <span class="word-level-num">${id}</span>
            <span class="word-level-text">${label}</span>
        </button>`;
    }).join('');
}

function selectWordLevel(id, btn) {
    wordLevel = id;
    document.querySelectorAll('.word-level-card').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function showWordInputScreen() {
    const t = translations[currentLang];
    showScreen('wordInputScreen');
    document.getElementById('wiBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('wiTitleEl').innerText = t.wi_title || 'Додайте слова';
    document.getElementById('wiHintEl').innerText = t.wi_hint || 'Кожне слово з нового рядка. Формат: слово — переклад';
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
        fetchTranslation(p.word, wordLangFrom, wordLangTo).then(tr => ({ i, tr }))
    ));

    let failed = 0;
    results.forEach(({ i, tr }) => {
        if (tr) wordPairs[i].translation = tr;
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

    altTransIndex[key] = (altTransIndex[key] + 1) % list.length;
    pair.translation = list[altTransIndex[key]];
    renderWordChips();
    if (altTransIndex[key] === 0 && list.length > 1) {
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

const WT_TTS_LANG = {
    en: 'en-US', uk: 'uk-UA', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR',
    es: 'es-ES', it: 'it-IT', pt: 'pt-BR', nl: 'nl-NL', sv: 'sv-SE',
    cs: 'cs-CZ', hu: 'hu-HU', ro: 'ro-RO', tr: 'tr-TR',
    ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', ar: 'ar-SA',
};

// Скільки поспіль "чистих" (без жодної помилки) проходжень слова треба,
// щоб вважати його вивченим у профілі — навмисно проста метрика, без SRS/дат.
const WT_MASTERY_THRESHOLD = 2;

// Викликається в кінці тренування (showWordResults) — рахує per-слово чи
// пройдено БЕЗ жодної помилки цей раз (по всіх типах вправ і requeue-спробах
// для цього слова), і оновлює masteryScore прямо на об'єкті pair усередині
// wtSet.pairs (той самий об'єкт, що і в wtQueue[i].pair — filter/sort його не
// клонують), а тоді зберігає назад у memoriWords_sets.
function updateWordMastery() {
    if (!wtSet) return;
    const byPair = new Map();
    wtQueue.forEach(ex => {
        if (!byPair.has(ex.pair)) byPair.set(ex.pair, []);
        byPair.get(ex.pair).push(ex);
    });
    byPair.forEach((exs, pair) => {
        const attempted = exs.filter(e => e.correct !== undefined && e.correct !== null);
        if (!attempted.length) return; // не дійшли до цього слова цей раз
        const allCorrect = attempted.every(e => e.correct === true);
        pair.masteryScore = allCorrect ? (pair.masteryScore || 0) + 1 : 0;
    });
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

    // Тип "Речення" доступний на будь-якому рівні — приклади підтягуємо
    // заздалегідь (мережевий запит на пару), інакше чергу нема з чого будувати.
    showScreen('wordTrainingScreen');
    showWtLoading(t.wt_preparing || 'Готую вправи…');
    await prefetchSentenceExamples(valid);
    hideWtLoading();

    wtQueue = buildWtQueue(valid, wordSessionTime);
    wtIndex = 0;
    wtCorrect = 0;
    wtCurrentAudioPair = null;
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
        return raw.map(e => e[0]).filter(Boolean);
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
    const sorted = [...examples].sort((a, b) => a.split(/\s+/).length - b.split(/\s+/).length);
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
    const pool = ['w2t', 't2w', hasSpeech ? 'audio' : null, 'spell', hasSpeech ? 'dictation' : null, 'sentence'].filter(Boolean);

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
        if (checkBtn) { checkBtn.title = t.wt_check || 'Перевірити'; checkBtn.style.display = 'flex'; }
        // Show hint button
        const hintBtn = document.getElementById('wtHintBtn');
        if (hintBtn) {
            hintBtn.style.display = 'inline-flex';
            hintBtn.disabled = false;
            hintBtn.classList.remove('wt-hint-used');
            document.getElementById('wtHintLabel').innerText = t.wt_hint || 'Підказка';
        }
        // Clear wrong state on every keystroke
        input.oninput = () => {
            input.classList.remove('wt-input-wrong');
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
        // Keep input enabled for retry — user can edit and resubmit
    }
}

function wtSkipWord() {
    // Mark as skipped (not counted as correct or wrong), advance
    if (wtIndex < wtQueue.length) {
        wtQueue[wtIndex].correct = null; // skipped
    }
    wtIndex++;
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
    }
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
// ──────────────────────────────────────────────────────────

// Обирає найкращий доступний голос для мови (не перший-ліпший):
// перевага хмарним голосам (зазвичай природніші за локальні SAPI)
// і голосам з "Natural"/"Neural" у назві (Windows/Edge online-голоси).
function wtPickVoice(lang) {
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang.split('-')[0].toLowerCase();
    const candidates = voices.filter(v => v.lang === lang || v.lang.toLowerCase().startsWith(prefix));
    if (!candidates.length) return null;

    const score = v => {
        let s = 0;
        if (v.lang === lang) s += 4;                       // точний регіональний збіг (напр. en-US)
        if (!v.localService) s += 3;                        // хмарний голос — зазвичай природніший
        if (/natural|neural|online/i.test(v.name)) s += 2;  // Windows/Edge "Natural" голоси
        if (v.default) s += 1;
        return s;
    };
    return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

function wtSetSpeed(rate) {
    wtAudioRate = rate;
    document.querySelectorAll('.wt-speed-btn').forEach(b => {
        b.classList.toggle('wt-speed-active', parseFloat(b.dataset.rate) === rate);
    });
    wtPlayAudio();
}

function wtPlayAudio() {
    if (!wtCurrentAudioPair) return;
    const lang = WT_TTS_LANG[wordLangFrom] || langToSpeech[wordLangFrom] || 'en-US';
    const utt = new SpeechSynthesisUtterance(wtCurrentAudioPair.word);
    utt.lang = lang;
    utt.rate = wtAudioRate;

    // Explicitly set voice so browser doesn't fall back to system default
    const voice = wtPickVoice(lang);
    if (voice) {
        utt.voice = voice;
    } else {
        // No matching voice installed — show the word as fallback
        const qEl = document.getElementById('wtQuestion');
        if (qEl.dataset.audioFallback !== '1') {
            qEl.dataset.audioFallback = '1';
            qEl.innerText = wtCurrentAudioPair.word;
        }
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
}

function wtNext() {
    // Reset typing input and wrapper state
    const inp = document.getElementById('wtTypeInput');
    if (inp) { inp.classList.remove('wt-input-correct', 'wt-input-wrong'); inp.value = ''; inp.disabled = false; inp.oninput = null; }
    const wr = document.querySelector('.wt-type-wrap');
    if (wr) wr.classList.remove('wt-wrap-correct', 'wt-wrap-wrong');
    const hb = document.getElementById('wtHintBtn');
    if (hb) { hb.style.display = 'none'; hb.disabled = false; hb.classList.remove('wt-hint-used'); }
    wtIndex++;
    renderWtExercise();
}

function showWordResults() {
    updateWordMastery();
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
