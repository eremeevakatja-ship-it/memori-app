// ===== app.js =====
// UI orchestration: i18n `translations` + `ICONS`, motivational toasts, screen
// show/hide (langScreen -> modeScreen -> ... ), tech-support widget, theme toggle,
// setup-screen settings rendering (block size / accuracy / time / rest / speed /
// font size), share-card generation, and the Text Mode profile screen.
// Plain classic script — every top-level `function` here lands on `window`, which is
// what keeps index.html's inline onclick="..." handlers working with zero changes
// to index.html's handler attributes.
// Split out of the original monolithic app.js (BACKLOG Q-01). Loads LAST: it only
// calls into state.js/audio.js/learning.js/words.js from event handlers (never at
// parse time), so load order relative to this file does not matter functionally —
// it's placed last because it's the most "top of the app" conceptually (screens/i18n).

// ----- [app: ICONS + translations]  (was app.js lines 54-967) -----

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
        audio_recording: "Слухаю вас...", audio_record_error: "Не вдалося. Спробуйте ще.", audio_record_noapi: "Запис голосу не підтримується браузером.", audio_record_denied: "🎙 Дозвольте доступ до мікрофона в налаштуваннях браузера.", audio_record_nomic: "🎙 Мікрофон не знайдено.", audio_record_nospeech: "🎙 Нічого не почуто. Говоріть голосніше.", audio_tts_unavailable: "🔇 Озвучка для цієї мови недоступна на вашому пристрої. Спробуйте встановити мовний голос у налаштуваннях браузера/телефону.",
        resume_title: "Незавершена сесія", resume_progress: "крок {n} з {total}", resume_continue: "Продовжити", resume_fresh: "Новий текст",
        ocr_btn: "Файл", ocr_loading: "Розпізнаємо текст...", ocr_preprocessing: "Готуємо зображення...", ocr_error: "Не вдалося розпізнати. Спробуйте інший файл.", ocr_error_doc: "Формат .doc не підтримується. Збережіть файл як .docx", ocr_error_empty: "Файл не завантажено з хмари. Відкрийте його у Word і збережіть на комп'ютер.", ocr_error_timeout: "Не вдалося завантажити розпізнавач тексту. Перевірте інтернет і спробуйте ще раз.", ocr_cancel: "Скасувати",
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
        wi_title: 'Додайте слова', wi_hint: 'Кожне слово з нового рядка',
        wi_info_title: 'Як вводити слова?',
        wi_info_body: 'Два способи — обирайте зручний:\n\n1. Просто слова, по одному на рядок. Переклад підберемо автоматично на наступному кроці.\n\n2. Слово з перекладом одразу — через тире: dog — собака.\n\nМожна вводити будь-якою з двох мов пари — програма сама зрозуміє, де слово, а де переклад.',
        wi_placeholder: 'dog — собака\ncat — кішка\nto run — бігати',
        wi_min_error: 'Потрібно мінімум 2 пари слів',
        support_title: 'Технічна підтримка', support_type_bug: '🐛 Щось не працює', support_type_idea: '💡 Ідея чи побажання',
        support_placeholder: 'Опишіть, що сталося або що хотіли б додати…', support_submit: 'Надіслати',
        support_min_error: 'Напишіть повідомлення', support_thanks: 'Дякую! Побачу це під час наступного оновлення.',
        support_history_title: 'Мої звернення', support_copy_all: '📋 Скопіювати все',
        support_copied: 'Скопійовано!', support_copy_failed: 'Не вдалося скопіювати',
        support_hint_text: 'Тут можна написати нам, якщо щось не так або є ідея 👋',
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
        wt_save_word: 'Зберегти', wt_skip: 'Пропустити', wt_finish: 'Завершити',
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
        wt_resume_confirm: 'Знайдено незавершене тренування цього набору ({n}/{total}). Продовжити з того ж місця?',
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
        audio_recording: "Listening to you...", audio_record_error: "Couldn't recognize. Try again.", audio_record_noapi: "Voice recording not supported in this browser.", audio_record_denied: "🎙 Allow microphone access in your browser settings.", audio_record_nomic: "🎙 No microphone found.", audio_record_nospeech: "🎙 Nothing heard. Please speak louder.", audio_tts_unavailable: "🔇 Voice for this language isn't available on your device. Try installing a language voice in your browser/phone settings.",
        resume_title: "Unfinished session", resume_progress: "step {n} of {total}", resume_continue: "Continue", resume_fresh: "New text",
        ocr_btn: "File", ocr_loading: "Recognizing text...", ocr_preprocessing: "Preparing image...", ocr_error: "Could not read. Try another file.", ocr_error_doc: ".doc format not supported. Save the file as .docx", ocr_error_empty: "File not downloaded from cloud. Open it in Word and save locally.", ocr_error_timeout: "Could not load the text recognizer. Check your internet connection and try again.", ocr_cancel: "Cancel",
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
        wi_title: 'Add words', wi_hint: 'One word or phrase per line',
        wi_info_title: 'How to enter words?',
        wi_info_body: 'Two ways — pick whichever is easier:\n\n1. Just words, one per line. We\'ll suggest a translation automatically on the next step.\n\n2. Word with translation right away — separated by a dash: dog — собака.\n\nYou can type in either of the two languages of your pair — the app will figure out which is the word and which is the translation.',
        wi_placeholder: 'dog — собака\ncat — кішка\nto run — бігати',
        wi_min_error: 'Please add at least 2 word pairs',
        support_title: 'Technical support', support_type_bug: '🐛 Something\'s broken', support_type_idea: '💡 Idea or request',
        support_placeholder: 'Describe what happened or what you\'d like added…', support_submit: 'Send',
        support_min_error: 'Please write a message', support_thanks: 'Thanks! I\'ll see this before the next update.',
        support_history_title: 'My messages', support_copy_all: '📋 Copy all',
        support_copied: 'Copied!', support_copy_failed: 'Could not copy',
        support_hint_text: 'You can write to us here if something\'s wrong or you have an idea 👋',
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
        wt_save_word: 'Save word', wt_skip: 'Skip', wt_finish: 'Finish',
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
        wt_resume_confirm: 'Found unfinished training for this set ({n}/{total}). Continue where you left off?',
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
        audio_recording: "Słucham cię...", audio_record_error: "Nie rozpoznano. Spróbuj ponownie.", audio_record_noapi: "Nagrywanie głosu nie jest obsługiwane przez tę przeglądarkę.", audio_record_denied: "🎙 Zezwól na dostęp do mikrofonu w ustawieniach przeglądarki.", audio_record_nomic: "🎙 Nie znaleziono mikrofonu.", audio_record_nospeech: "🎙 Nic nie usłyszano. Mów głośniej.", audio_tts_unavailable: "🔇 Głos dla tego języka nie jest dostępny na tym urządzeniu. Spróbuj zainstalować głos językowy w ustawieniach przeglądarki/telefonu.",
        resume_title: "Niedokończona sesja", resume_progress: "krok {n} z {total}", resume_continue: "Kontynuuj", resume_fresh: "Nowy tekst",
        ocr_btn: "Plik", ocr_loading: "Rozpoznawanie tekstu...", ocr_preprocessing: "Przygotowywanie obrazu...", ocr_error: "Nie udało się odczytać. Spróbuj inny plik.", ocr_error_doc: "Format .doc nie jest obsługiwany. Zapisz plik jako .docx", ocr_error_empty: "Plik nie jest pobrany z chmury. Otwórz go w Word i zapisz lokalnie.", ocr_error_timeout: "Nie udało się załadować rozpoznawania tekstu. Sprawdź połączenie z internetem i spróbuj ponownie.", ocr_cancel: "Anuluj",
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
        wi_title: 'Dodaj słowa', wi_hint: 'Każde słowo w nowej linii',
        wi_info_title: 'Jak wpisywać słowa?',
        wi_info_body: 'Dwa sposoby — wybierz wygodniejszy:\n\n1. Same słowa, po jednym w linii. Tłumaczenie zaproponujemy automatycznie w następnym kroku.\n\n2. Słowo od razu z tłumaczeniem — po myślniku: dog — pies.\n\nMożesz pisać w dowolnym z dwóch języków pary — aplikacja sama rozpozna, co jest słowem, a co tłumaczeniem.',
        wi_placeholder: 'dog — pies\ncat — kot\nto run — biegać',
        wi_min_error: 'Potrzeba co najmniej 2 par słów',
        support_title: 'Pomoc techniczna', support_type_bug: '🐛 Coś nie działa', support_type_idea: '💡 Pomysł lub życzenie',
        support_placeholder: 'Opisz, co się stało albo co chciałabyś dodać…', support_submit: 'Wyślij',
        support_min_error: 'Napisz wiadomość', support_thanks: 'Dzięki! Zobaczę to przed kolejną aktualizacją.',
        support_history_title: 'Moje zgłoszenia', support_copy_all: '📋 Skopiuj wszystko',
        support_copied: 'Skopiowano!', support_copy_failed: 'Nie udało się skopiować',
        support_hint_text: 'Tu możesz napisać do nas, jeśli coś nie działa albo masz pomysł 👋',
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
        wt_save_word: 'Zapisz słowo', wt_skip: 'Pomiń', wt_finish: 'Zakończ',
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
        wt_resume_confirm: 'Znaleziono nieukończony trening tego zestawu ({n}/{total}). Kontynuować od tego miejsca?',
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
        audio_recording: "Ich höre dir zu...", audio_record_error: "Nicht erkannt. Nochmal versuchen.", audio_record_noapi: "Sprachaufnahme wird von diesem Browser nicht unterstützt.", audio_record_denied: "🎙 Erlauben Sie den Mikrofonzugriff in den Browsereinstellungen.", audio_record_nomic: "🎙 Kein Mikrofon gefunden.", audio_record_nospeech: "🎙 Nichts gehört. Bitte lauter sprechen.", audio_tts_unavailable: "🔇 Für diese Sprache ist auf diesem Gerät keine Stimme verfügbar. Installiere eine Sprachstimme in den Browser-/Telefoneinstellungen.",
        resume_title: "Unfertige Sitzung", resume_progress: "Schritt {n} von {total}", resume_continue: "Weiter", resume_fresh: "Neuer Text",
        ocr_btn: "Datei", ocr_loading: "Text wird erkannt...", ocr_preprocessing: "Bild wird vorbereitet...", ocr_error: "Lesen fehlgeschlagen. Andere Datei versuchen.", ocr_error_doc: "Format .doc wird nicht unterstützt. Bitte als .docx speichern", ocr_error_empty: "Datei nicht aus der Cloud heruntergeladen. In Word öffnen und lokal speichern.", ocr_error_timeout: "Texterkennung konnte nicht geladen werden. Internetverbindung prüfen und erneut versuchen.", ocr_cancel: "Abbrechen",
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
        wi_title: 'Wörter hinzufügen', wi_hint: 'Ein Wort pro Zeile',
        wi_info_title: 'Wie gebe ich Wörter ein?',
        wi_info_body: 'Zwei Wege — wähle den bequemeren:\n\n1. Nur Wörter, eines pro Zeile. Die Übersetzung schlagen wir dir im nächsten Schritt automatisch vor.\n\n2. Wort direkt mit Übersetzung — mit Gedankenstrich getrennt: dog — Hund.\n\nDu kannst in beiden Sprachen deines Paares tippen — die App erkennt selbst, was das Wort und was die Übersetzung ist.',
        wi_placeholder: 'dog — Hund\ncat — Katze\nto run — laufen',
        wi_min_error: 'Mindestens 2 Wortpaare erforderlich',
        support_title: 'Technischer Support', support_type_bug: '🐛 Etwas funktioniert nicht', support_type_idea: '💡 Idee oder Wunsch',
        support_placeholder: 'Beschreibe, was passiert ist oder was du dir wünschst…', support_submit: 'Senden',
        support_min_error: 'Bitte schreib eine Nachricht', support_thanks: 'Danke! Ich sehe das vor dem nächsten Update.',
        support_history_title: 'Meine Meldungen', support_copy_all: '📋 Alles kopieren',
        support_copied: 'Kopiert!', support_copy_failed: 'Kopieren fehlgeschlagen',
        support_hint_text: 'Hier kannst du uns schreiben, wenn etwas nicht funktioniert oder du eine Idee hast 👋',
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
        wt_save_word: 'Wort merken', wt_skip: 'Überspringen', wt_finish: 'Beenden',
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
        wt_resume_confirm: 'Unvollständiges Training für dieses Set gefunden ({n}/{total}). Dort fortsetzen?',
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
        audio_recording: "Je vous écoute...", audio_record_error: "Non reconnu. Réessayez.", audio_record_noapi: "Enregistrement vocal non supporté par ce navigateur.", audio_record_denied: "🎙 Autorisez l'accès au micro dans les paramètres du navigateur.", audio_record_nomic: "🎙 Aucun microphone trouvé.", audio_record_nospeech: "🎙 Rien entendu. Parlez plus fort.", audio_tts_unavailable: "🔇 Aucune voix disponible pour cette langue sur cet appareil. Essayez d'installer une voix dans les paramètres du navigateur/téléphone.",
        resume_title: "Session inachevée", resume_progress: "étape {n} sur {total}", resume_continue: "Continuer", resume_fresh: "Nouveau texte",
        ocr_btn: "Fichier", ocr_loading: "Lecture en cours...", ocr_preprocessing: "Préparation de l'image...", ocr_error: "Échec de la lecture. Essayez un autre fichier.", ocr_error_doc: "Format .doc non supporté. Enregistrez en .docx", ocr_error_empty: "Fichier non téléchargé depuis le cloud. Ouvrez-le dans Word et sauvegardez localement.", ocr_error_timeout: "Impossible de charger la reconnaissance de texte. Vérifiez votre connexion internet et réessayez.", ocr_cancel: "Annuler",
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
        wi_title: 'Ajouter des mots', wi_hint: 'Un mot par ligne',
        wi_info_title: 'Comment saisir les mots ?',
        wi_info_body: 'Deux façons de faire — choisissez celle qui vous convient :\n\n1. Juste les mots, un par ligne. Nous proposerons une traduction automatiquement à l\'étape suivante.\n\n2. Le mot avec sa traduction directement — séparés par un tiret : dog — chien.\n\nVous pouvez taper dans l\'une ou l\'autre langue de votre paire — l\'application déterminera elle-même quel est le mot et quelle est la traduction.',
        wi_placeholder: 'dog — chien\ncat — chat\nto run — courir',
        wi_min_error: 'Veuillez ajouter au moins 2 paires',
        support_title: 'Assistance technique', support_type_bug: '🐛 Quelque chose ne marche pas', support_type_idea: '💡 Idée ou souhait',
        support_placeholder: 'Décrivez ce qui s\'est passé ou ce que vous aimeriez ajouter…', support_submit: 'Envoyer',
        support_min_error: 'Veuillez écrire un message', support_thanks: 'Merci ! Je verrai ça avant la prochaine mise à jour.',
        support_history_title: 'Mes messages', support_copy_all: '📋 Tout copier',
        support_copied: 'Copié !', support_copy_failed: 'Impossible de copier',
        support_hint_text: 'Vous pouvez nous écrire ici si quelque chose ne va pas ou si vous avez une idée 👋',
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
        wt_save_word: 'Garder le mot', wt_skip: 'Ignorer', wt_finish: 'Terminer',
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
        wt_resume_confirm: 'Entraînement inachevé trouvé pour cet ensemble ({n}/{total}). Continuer où vous en étiez ?',
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
        audio_recording: "Te escucho...", audio_record_error: "No reconocido. Inténtalo de nuevo.", audio_record_noapi: "Grabación de voz no compatible con este navegador.", audio_record_denied: "🎙 Permite el acceso al micrófono en la configuración del navegador.", audio_record_nomic: "🎙 No se encontró micrófono.", audio_record_nospeech: "🎙 No se escuchó nada. Habla más fuerte.", audio_tts_unavailable: "🔇 No hay voz disponible para este idioma en tu dispositivo. Prueba a instalar una voz de idioma en la configuración del navegador/teléfono.",
        resume_title: "Sesión inacabada", resume_progress: "paso {n} de {total}", resume_continue: "Continuar", resume_fresh: "Nuevo texto",
        ocr_btn: "Archivo", ocr_loading: "Leyendo archivo...", ocr_preprocessing: "Preparando la imagen...", ocr_error: "No se pudo leer. Intenta con otro archivo.", ocr_error_doc: "Formato .doc no admitido. Guárdelo como .docx", ocr_error_empty: "Archivo no descargado de la nube. Ábralo en Word y guárdelo localmente.", ocr_error_timeout: "No se pudo cargar el reconocimiento de texto. Comprueba tu conexión a internet e inténtalo de nuevo.", ocr_cancel: "Cancelar",
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
        wi_title: 'Añadir palabras', wi_hint: 'Una palabra por línea',
        wi_info_title: '¿Cómo introducir palabras?',
        wi_info_body: 'Dos formas — elige la que prefieras:\n\n1. Solo palabras, una por línea. Te sugeriremos la traducción automáticamente en el siguiente paso.\n\n2. Palabra con traducción directamente — separadas por un guion: dog — perro.\n\nPuedes escribir en cualquiera de los dos idiomas de tu pareja — la aplicación reconocerá cuál es la palabra y cuál la traducción.',
        wi_placeholder: 'dog — perro\ncat — gato\nto run — correr',
        wi_min_error: 'Por favor añade al menos 2 pares',
        support_title: 'Soporte técnico', support_type_bug: '🐛 Algo no funciona', support_type_idea: '💡 Idea o sugerencia',
        support_placeholder: 'Describe qué pasó o qué te gustaría añadir…', support_submit: 'Enviar',
        support_min_error: 'Escribe un mensaje', support_thanks: '¡Gracias! Lo veré antes de la próxima actualización.',
        support_history_title: 'Mis mensajes', support_copy_all: '📋 Copiar todo',
        support_copied: '¡Copiado!', support_copy_failed: 'No se pudo copiar',
        support_hint_text: 'Aquí puedes escribirnos si algo no funciona o tienes una idea 👋',
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
        wt_save_word: 'Guardar palabra', wt_skip: 'Omitir', wt_finish: 'Terminar',
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
        wt_resume_confirm: 'Se encontró un entrenamiento sin terminar de este conjunto ({n}/{total}). ¿Continuar donde lo dejaste?',
        mode_title: '¿Qué quieres aprender?',
        mode_text_label: 'Texto', mode_text_desc: 'Poema, discurso, artículo, presentación',
        mode_words_label: 'Palabras y Frases', mode_words_desc: 'Nuevo vocabulario, traducciones, tarjetas'
    }
};


// ----- [app: MOTIVATIONS/getMotivation/showMotivToast]  (was app.js lines 968-1037) -----
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


// ----- [app: SCREEN MANAGER]  (was app.js lines 1922-2045) -----
// ===== SCREEN MANAGER =====
const SCREENS = ['langScreen','modeScreen','inputScreen','setupScreen','learningScreen','restScreen','sessionPauseScreen','finalScreen','profileScreen','wordProfileScreen','wordLangScreen','wordInputScreen','wordVerifyScreen','wordTopicScreen','wordTrainingScreen','wordResultsScreen'];
const FLEX_SCREENS = ['sessionPauseScreen','finalScreen','wordResultsScreen'];
let currentScreenId = null; // для контексту у зверненнях підтримки — на якому екрані була проблема

function showScreen(id) {
    currentScreenId = id;
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
    maybeShowSupportHint();
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

function saveOcrLangPref() {
    const val = document.getElementById('ocrLang').value;
    localStorage.setItem('memori_ocr_lang_pref', val);
}

function showInputScreen() {
    const t = translations[currentLang];
    showScreen('inputScreen');
    document.getElementById('backBtnLabel').innerText = t.back_lang;
    updateThemeToggleFab();
    updateProfileNavAvatar();
    document.getElementById('roleSubtitle').innerText = t.welcome;
    document.getElementById('ocrBtnLabel').innerText = t.ocr_btn;
    const ocrCancelBtn = document.getElementById('ocrCancelBtn');
    if (ocrCancelBtn) ocrCancelBtn.innerText = t.ocr_cancel || 'Скасувати';
    const savedOcrLang = localStorage.getItem('memori_ocr_lang_pref');
    document.getElementById('ocrLang').value = savedOcrLang || tessLang[currentLang] || 'eng';
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

// Кнопка підтримки — fixed знизу зліва, і на вузьких екранах попапи-bottom-sheet
// (info-popup-overlay) розтягуються на всю ширину саме в тому куті — ховаємо
// кнопку, поки відкритий будь-який такий попап, щоб вона не перекривала текст.

// ----- [app: support-fab-visibility + info popup]  (was app.js lines 2046-2068) -----
function updateSupportFabVisibility() {
    const wrap = document.querySelector('.support-fab-wrap');
    if (!wrap) return;
    const anyPopupOpen = document.querySelector('.info-popup-overlay.visible');
    wrap.style.display = anyPopupOpen ? 'none' : '';
}

function openInfoPopup(title, body) {
    document.getElementById('infoPopupTitle').innerText = title;
    document.getElementById('infoPopupBody').innerText = body;
    const popup = document.getElementById('infoPopup');
    popup.style.display = 'flex';
    requestAnimationFrame(() => { popup.classList.add('visible'); updateSupportFabVisibility(); });
}

function closeInfoPopup(event) {
    if (event && event.target !== document.getElementById('infoPopup')) return;
    const popup = document.getElementById('infoPopup');
    popup.classList.remove('visible');
    updateSupportFabVisibility();
    setTimeout(() => { popup.style.display = 'none'; }, 260);
}


// ----- [app: TECH SUPPORT]  (was app.js lines 2069-2198) -----
// ===== TECH SUPPORT (локально, без бекенду — див. D-002) =====
// Звернення зберігаються лише в localStorage цього браузера/пристрою.
// User переглядає їх сама в цьому ж попапі і копіює текстом, щоб
// передати в наступну сесію розробки. Без email/webhook — свідомий вибір
// User (без нового зовнішнього сервісу і без витоку даних інших людей).
let supportType = 'bug';

// Одноразова підказка-хмаринка над кнопкою підтримки — маскот сам по собі
// не читається як "кнопка звернення", тож пояснюємо це один раз на пристрій
// (не при кожному візиті), одразу після вибору мови, коли ми вже знаємо currentLang.
function maybeShowSupportHint() {
    let seen;
    try { seen = localStorage.getItem('memori_support_hint_seen'); } catch { return; }
    if (seen) return;
    const t = translations[currentLang];
    setTimeout(() => {
        const bubble = document.getElementById('supportHintBubble');
        if (!bubble) return;
        document.getElementById('supportHintText').innerText = t.support_hint_text || 'Тут можна написати нам, якщо щось не так 👋';
        bubble.style.display = 'block';
        setTimeout(dismissSupportHint, 6000);
    }, 1200);
}

function dismissSupportHint() {
    const bubble = document.getElementById('supportHintBubble');
    if (bubble) bubble.style.display = 'none';
    try { localStorage.setItem('memori_support_hint_seen', '1'); } catch {}
}

function openSupportPopup() {
    dismissSupportHint();
    const t = translations[currentLang];
    document.getElementById('supportPopupTitle').innerText = t.support_title || 'Технічна підтримка';
    document.getElementById('supportTypeBugBtn').innerText = t.support_type_bug || '🐛 Щось не працює';
    document.getElementById('supportTypeIdeaBtn').innerText = t.support_type_idea || '💡 Ідея чи побажання';
    document.getElementById('supportTextarea').placeholder = t.support_placeholder || 'Опишіть, що сталося або що хотіли б додати…';
    document.getElementById('supportTextarea').value = '';
    document.getElementById('supportSubmitBtn').innerText = t.support_submit || 'Надіслати';
    document.getElementById('supportHistoryTitle').childNodes[0].nodeValue = (t.support_history_title || 'Мої звернення') + ' (';
    document.getElementById('supportCopyBtn').innerText = t.support_copy_all || '📋 Скопіювати все';
    document.getElementById('supportValidation').style.display = 'none';
    selectSupportType('bug');
    renderSupportHistory();
    const popup = document.getElementById('supportPopup');
    popup.style.display = 'flex';
    requestAnimationFrame(() => { popup.classList.add('visible'); updateSupportFabVisibility(); });
}

function closeSupportPopup(event) {
    if (event && event.target !== document.getElementById('supportPopup')) return;
    const popup = document.getElementById('supportPopup');
    popup.classList.remove('visible');
    updateSupportFabVisibility();
    setTimeout(() => { popup.style.display = 'none'; }, 260);
}

function selectSupportType(type, btn) {
    supportType = type;
    document.querySelectorAll('.support-type-btn').forEach(b => b.classList.remove('active'));
    const target = btn || document.getElementById(type === 'bug' ? 'supportTypeBugBtn' : 'supportTypeIdeaBtn');
    if (target) target.classList.add('active');
}

function getSupportMessages() {
    try { return JSON.parse(localStorage.getItem('memori_support') || '[]'); }
    catch { return []; }
}

function submitSupportMessage() {
    const t = translations[currentLang];
    const textarea = document.getElementById('supportTextarea');
    const text = textarea.value.trim();
    if (!text) {
        const errEl = document.getElementById('supportValidation');
        errEl.innerText = t.support_min_error || 'Напишіть повідомлення';
        errEl.style.display = 'block';
        return;
    }
    const list = getSupportMessages();
    list.unshift({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: supportType,
        text,
        screen: currentScreenId,
        lang: currentLang,
        createdAt: new Date().toISOString(),
    });
    localStorage.setItem('memori_support', JSON.stringify(list));
    textarea.value = '';
    document.getElementById('supportValidation').style.display = 'none';
    showMotivToast(t.support_thanks || 'Дякую! Побачу це під час наступного оновлення.');
    renderSupportHistory();
}

function renderSupportHistory() {
    const list = getSupportMessages();
    const container = document.getElementById('supportHistoryList');
    const wrap = document.getElementById('supportHistoryWrap');
    const countEl = document.getElementById('supportHistoryCount');
    if (!container || !wrap) return;
    wrap.style.display = list.length ? 'block' : 'none';
    if (countEl) countEl.innerText = String(list.length);
    container.innerHTML = list.map(m => `
        <div class="support-history-item">
            <div class="support-history-meta">
                <span>${m.type === 'bug' ? '🐛' : '💡'}</span>
                <span>${new Date(m.createdAt).toLocaleString(currentLang)}</span>
            </div>
            <div class="support-history-text">${escHtml(m.text)}</div>
        </div>
    `).join('');
}

function copyAllSupportMessages() {
    const t = translations[currentLang];
    const list = getSupportMessages();
    if (!list.length) return;
    const text = list.map(m =>
        `[${m.type === 'bug' ? 'BUG' : 'IDEA'}] ${new Date(m.createdAt).toLocaleString()} — ${m.screen || '?'}\n${m.text}`
    ).join('\n\n---\n\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showMotivToast(t.support_copied || 'Скопійовано!'))
            .catch(() => showMotivToast(t.support_copy_failed || 'Не вдалося скопіювати'));
    } else {
        showMotivToast(t.support_copy_failed || 'Не вдалося скопіювати');
    }
}


// ----- [app: THEME]  (was app.js lines 2199-2226) -----
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


// ----- [app: settings render cards + font size + validation]  (was app.js lines 2227-2435) -----
function renderDayOptions() {
    const t = translations[currentLang];
    const lbl = document.getElementById('daysLabel');
    if (lbl) lbl.innerText = t.daysLabel;
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
            container.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
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

    // Words Mode: раніше жоден елемент тренування слів не масштабувався
    // (fontSizeIndex взагалі ігнорувався в цьому режимі) — застосовуємо ту
    // саму логіку, що й для Text Mode вище.
    const wtQuestion = document.getElementById('wtQuestion');
    if (wtQuestion) wtQuestion.style.fontSize = size + 'rem';

    const wtTypeInput = document.getElementById('wtTypeInput');
    if (wtTypeInput) wtTypeInput.style.fontSize = Math.min(size, 1.25) + 'rem';

    document.querySelectorAll('.wt-choice').forEach(b => {
        b.style.fontSize = btnFontSize + 'rem';
        b.style.padding = btnPad;
    });

    const wtActionFontSize = (1.0 + (size - 1.0) * 0.25).toFixed(2) + 'rem';
    document.querySelectorAll('.btn-wt-check').forEach(b => {
        b.style.fontSize = wtActionFontSize;
    });
    document.querySelectorAll('.btn-wt-skip-word, .btn-wt-hint').forEach(b => {
        b.style.fontSize = btnFontSize + 'rem';
    });

    // Text Mode: результат "Письмо" (write-highlight/score) раніше не масштабувався —
    // та сама формула (size+'rem'), що й для textDisplay/audioRepeatText/mindCardBody вище.
    const writeHighlight = document.getElementById('writeHighlight');
    if (writeHighlight) writeHighlight.style.fontSize = size + 'rem';

    const writeScoreLine = document.getElementById('writeScoreLine');
    if (writeScoreLine) writeScoreLine.style.fontSize = size + 'rem';
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


// ----- [app: SHARE]  (was app.js lines 3268-3360) -----
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


// ----- [app: PROFILE (Text mode)]  (was app.js lines 3361-3465) -----
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
              <div class="profile-item-title">${escHtml(title)}</div>
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
                <div class="profile-item-title">${escHtml(title)}</div>
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
              <div class="profile-item-body" onclick="startRenameLibEntry('${entry.id}')">
                <div class="profile-item-title" id="lib-title-${entry.id}">${escHtml(title)}</div>
                <div class="profile-item-meta">${date}</div>
              </div>
              <div class="profile-item-actions">
                <button class="btn-profile-action" onclick="profileLoadText('${entry.id}')">${t.profile_load || 'Завантажити'}</button>
                <button class="btn-profile-delete" onclick="profileDeletePlanned('${entry.id}')">${deleteSvg}</button>
              </div>
            </div>`;
        }).join('');
    }
}


// ----- [app: profile text actions (continue/discard/learnAgain/deleteLearned/loadText/deletePlanned)]  (was app.js lines 3510-3549) -----
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
    // String(): id тепер рядок (Date.now()+'-'+random, після фіксу колізії id),
    // але записи, збережені ДО цього фіксу, можуть мати старий числовий id —
    // порівнюємо як рядки, щоб працювало для обох форматів.
    const entry = loadLibrary().find(e => String(e.id) === String(id));
    if (!entry) return;
    document.getElementById('profileScreen').style.display = 'none';
    showInputScreen();
    document.getElementById('userText').value = entry.text;
}

function profileDeletePlanned(id) {
    saveLibrary(loadLibrary().filter(e => String(e.id) !== String(id)));
    updateLibraryCount();
    renderProfileTab('planned');
}


// ----- [app: startRenameLibEntry]  (was app.js lines 3560-3596) -----

function startRenameLibEntry(id) {
    const titleEl = document.getElementById('lib-title-' + id);
    if (!titleEl) return;
    const lib = loadLibrary();
    const entry = lib.find(e => String(e.id) === String(id));
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
        const idx = lib2.findIndex(e => String(e.id) === String(id));
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

