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
        rest_review_invite: "Необов'язково — але якщо хочете, ось що вже встигли вивчити:",
        resume: "Продовжити", check: "Перевірити", next: "Далі",
        finish_title: "Чудово!", finish_blocks: "блоків пройдено",
        finish_time: "Час", finish_restart: "Ще раз", finish_home: "На головну",
        learning_finish_here: "Завершити тут",
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
        write_bigreview_note: "Напишіть усі {n} блоки одним текстом, з самого початку",
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
        session_pause_title: "Гарна робота на сьогодні!",
        session_pause_body: "Ви пройшли {n} з {total} блоків. Продовжите, коли будете готові.",
        session_pause_continue: "Продовжити зараз",
        session_pause_finish: "Закінчити на сьогодні",
        finish_all_title: "Текст вивчено!",
        finish_pass_title: "Чудовий прохід! Ще один — і вивчено 🌱",
        finish_all_body: "Ви пройшли всі блоки. Чудова робота!",
        validation_no_text: "Будь ласка, вставте текст для вивчення",
        validation_too_short: "Текст занадто короткий — потрібно мінімум 4 слова",
        themeLabel: "Тема:", th_light: "Світла", th_dark: "Темна",
        audio_listening: "Слухайте...", audio_repeat: "Повторіть вголос", audio_ready: "Готово", audio_again: "Ще раз",
        audio_your_turn: "Ваша черга — як повторите?", audio_record: "Записати голосом", audio_silent: "Сказати про себе",
        audio_ready_record: "Готові? Запишіть себе або прочитайте подумки",
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
        notif_prompt: "Нагадати тобі завтра? 😊", notif_time_label: "О котрій:",
        notif_dismiss: "Ні, дякую", notif_body: "Час практикуватись! Не переривай серію 🔥",
        notif_confirm: "Нагадування увімкнено ✓", mood_popup_later: "Не зараз",
        inactivity_title: "А хто тут у нас? 👀", inactivity_body: "Ми так сумували! Загляни на хвилинку — потренуй пам'ять, легко і без напруги 🌱",
        instruction_hint: "Прочитайте двічі, повторіть в умі і йдіть далі",
        method_mind: "В умі", method_write: "Письмо", method_audio: "Голосом",
        text_placeholder: "Вставте або введіть текст...",
        profile_btn: "Профіль",
        profile_title: "Профіль",
        profile_in_progress: "В роботі",
        profile_learned: "Вивчено",
        profile_planned: "Плани",
        profile_words_tab: "Слова",
        profile_empty_words: "Ще немає збережених наборів слів",
        profile_words_total: "слів",
        profile_words_mastered: "вивчено",
        profile_words_review: "повторити",
        wptab_sets: "За наборами",
        wptab_dictionary: "Словник",
        wdict_mastered: "Вивчені",
        wdict_review: "На повторення",
        wdict_unlearned: "Не вивчені",
        wdict_search_placeholder: "🔍 Пошук слова...",
        wdict_all_topics: "Усі теми",
        wdict_no_matches: "Нічого не знайдено",
        learned_hero_title: "Молодець, ось що вже вивчено! 🌟",
        learned_not_yet: "Ще не вивчено — повернути в Прогрес",
        learned_group_text_speech: "Текст/промова", learned_group_poem: "Вірші", learned_group_song: "Пісні",
        learned_cat_text: "Текст", learned_cat_speech: "Промова", learned_cat_poem: "Вірш", learned_cat_song: "Пісня",
        learned_group_poem_song: "Вірші/пісні", learned_cat_text_speech: "Текст/промова", learned_cat_poem_song: "Вірш/пісня",
        profile_train: "Тренувати",
        profile_select_words: "🎯 Обрати слова",
        wselect_title: "Обрати слова для тренування",
        wselect_select_all: "Обрати всі",
        wselect_selected: "Обрано: {n}",
        wselect_start_btn: "Тренувати ({n})",
        wselect_diff_lang_toast: "Можна обирати слова лише в межах однієї мовної пари за раз",
        wselect_none_toast: "Оберіть хоча б одне слово",
        profile_empty_progress: "Немає активної сесії",
        progress_empty: "Ще нічого не в роботі — встав текст і почни вчити! 🌱",
        progress_stage_all: "Усі",
        progress_stage_start: "🌱 Перші кроки",
        progress_stage_halfway: "🌿 На півдорозі!",
        progress_stage_almost: "🌳 Ще трішки — і вивчено!",
        profile_empty_learned: "Тут поки порожньо, але це ненадовго 🌱 Довчи перший текст — і він оселиться в бібліотеці.",
        profile_load: "Завантажити",
        profile_edit_text: "✎ Редагувати",
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
        paste_info_title: 'Як додати текст?',
        paste_info_body: 'Три способи — обирайте зручний:\n\n📋 Скопіюйте текст і просто вставте в поле.\n\n📄 Натисніть «Файл» і завантажте документ (doc, txt, pdf) або скріншот/фото з текстом.\n\n📸 Сфотографуйте текст камерою телефону і надішліть як файл — розпізнаємо автоматично.',
        wi_placeholder: 'dog — собака\ncat — кішка\nto run — бігати',
        wi_min_error: 'Потрібно мінімум 2 пари слів',
        support_title: 'Технічна підтримка', support_type_bug: '🐛 Щось не працює', support_type_idea: '💡 Ідея чи побажання', support_type_compliment: '😻 Похваліть нас',
        support_placeholder: 'Опишіть, що сталося або що хотіли б додати…', support_placeholder_bug: 'Опишіть, будь ласка, що сталося — ми уважно розберемось і виправимо 🛠️', support_placeholder_idea: 'Поділіться ідеєю — нам справді цікаво, що можна покращити 💡', support_placeholder_compliment: 'Просто скажіть щось приємне… ми відкладемо це на поганий день 💛', support_submit: 'Надіслати',
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
        wt_auto: '✨ Підібрати автоматично', wt_save: 'Зберегти →', wt_save_edit: 'Зберегти зміни',
        words_saved: 'Набір збережено!',
        wt_type_w2t: '→ Переклад', wt_type_t2w: '→ Слово', wt_type_audio: '🔊 Аудіо',
        wt_listen_prompt: 'Прослухайте та оберіть слово', wt_listen_btn: 'Прослухати',
        wt_correct: '✓ Правильно!', wt_wrong: 'Упс, спробуйте ще раз',
        wt_save_word: 'Зберегти', wt_skip: 'Пропустити', wt_finish: 'Завершити',
        wt_type_spell: '✏️ Напиши', wt_type_dictation: '🎧 Диктант', wt_type_sentence: '📝 Речення', wt_type_speak: '🗣️ Скажи',
        wt_type_match: '🔗 Пари', wt_type_truefalse: '✓✗ Правда чи ні', wt_type_listen: '🎧 Слухай і познач',
        wt_match_prompt: 'Знайдіть пари: слово — переклад', wt_match_mistakes: 'Готово, але були помилки',
        wt_true: '✓ Правда', wt_false: '✗ Неправда',
        wt_listen_pick_prompt: 'Прослухайте і відмітьте слова, які прозвучали',
        wt_spell_prompt: 'Напишіть слово мовою навчання',
        wt_dictation_prompt: 'Прослухайте та напишіть слово',
        wt_speak_prompt: 'Скажіть це слово мовою, яку вивчаєте', wt_speak_record: '🎙 Записати', wt_speak_said: 'Ви сказали:',
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
        mode_words_label: 'Слова та Фрази', mode_words_desc: 'Нова лексика, переклади, словник',
        // MT-02 (2026-08-15) — режим "Фокуси пам'яті"
        mode_memory_label: 'Фокуси пам\'яті',
        mode_memory_desc: 'Техніки, якими користуються чемпіони з пам\'яті',
        mem_subtitle: 'Тут тренуємо саму пам\'ять — не текст і не слова',
        mem_pick_age: 'Оберіть вік — у різному віці працюють різні прийоми',
        mem_group_label: 'Вправи для віку',
        mem_ex_intent_title: 'Якщо-то',
        mem_ex_intent_desc: 'Прийом проти «збирався і забув»',
        mem_ex_intent_full: 'Зараз тренуємо три наміри — більше не варто. Перевір їх, і зможеш додати новий',
        mem_worked_count: 'Спрацювало разів: {n} 🌿',
        mem_step: 'Крок {n} з 3',
        mem_q_action: 'Що ти збираєшся зробити?',
        mem_hint_action: 'Щось одне й конкретне — те, що легко забувається',
        mem_ph_action: 'передзвонити мамі',
        mem_q_trigger: 'Коли саме ти про це згадаєш?',
        mem_hint_trigger: 'Має бути щось, що ти точно помітиш — подія, а не «пізніше»',
        mem_hint_trigger_kid: 'Обери те, що ти сьогодні точно зробиш',
        mem_ph_trigger: 'коли поставлю чайник',
        mem_q_say: 'Скажи це вголос — один раз, повністю',
        mem_hint_say: 'Саме проговорювання і є прийом. Мозок ловить зв\'язок «побачив — зробив»',
        mem_formula: 'ЯКЩО {trigger}, ТО {action}',
        mem_next: 'Далі',
        mem_save: 'Готово',
        mem_saved: 'Записали 🌿',
        mem_need_action: 'Напиши, що збираєшся зробити',
        mem_need_trigger: 'Обери, коли саме',
        mem_limit: 'Три наміри — уже достатньо. Перевір їх спочатку',
        mem_due_q: 'Спрацювало?',
        mem_due_yes: 'Так',
        mem_due_no: 'Ні',
        mem_due_pending: 'Ще не було',
        mem_toast_yes: 'Спрацювало 🌿 Прийом працює',
        mem_toast_no: 'Буває. Спробуй той самий намір, але з помітнішим тригером',
        trg_pencil: 'відкрию пенал',
        trg_dinner: 'сяду вечеряти',
        trg_shoes: 'взую кросівки',
        trg_teeth: 'почищу зуби',
        trg_bag: 'візьму рюкзак',
        nav_learn: 'Навчання', nav_library: 'Бібліотека', nav_progress: 'Прогрес', nav_profile: 'Профіль',
        mode_subtitle: 'Оберіть напрямок — можна змінити будь-коли',
        wl_subtitle: 'Мова, яку вивчаєте, і рідна — для перекладу та вимови',
        wt_topic_subtitle: 'Назва допоможе швидко знайти цей набір у профілі',
        library_title: 'Бібліотека', progress_title: 'Прогрес',
        profile_mood: 'Настрій зараз', profile_about: 'Про тебе',
        profile_optional_note: 'Усе нижче — суто за бажанням 💛 Заповнюй, що хочеш, решту сміливо пропускай.',
        profile_country: 'Країна', profile_city: 'Місто', profile_age: 'Вік', profile_email: 'Пошта', profile_birthdate: 'Дата народження'
    },
    en: {
        welcome: "Welcome. Let's learn without stress.",
        inputLabel: "Paste text:", daysLabel: "Days to learn it?", startBtn: "Start",
        stepNew: "MEMORIZE", stepReview: "REVIEW",
        done: "Done", restTitle: "Break", restSubtitle: "Brain is resting...",
        rest_review_invite: "No pressure — but here's what you've learned so far, if you'd like a peek:",
        resume: "Continue", check: "Check", next: "Next",
        finish_title: "Well done!", finish_blocks: "blocks completed",
        finish_time: "Time", finish_restart: "Try again", finish_home: "Home",
        learning_finish_here: "Finish here",
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
        write_bigreview_note: "Write all {n} blocks as one text, from the very beginning",
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
        session_pause_title: "Nice work today!",
        session_pause_body: "You've covered {n} of {total} blocks. Continue whenever you're ready.",
        session_pause_continue: "Continue now",
        session_pause_finish: "Finish for today",
        finish_all_title: "Text learned!",
        finish_pass_title: "Great run-through! One more pass and it's learned 🌱",
        finish_all_body: "You've completed all blocks. Great work!",
        validation_no_text: "Please paste some text to memorize",
        validation_too_short: "Text is too short — minimum 4 words required",
        themeLabel: "Theme:", th_light: "Light", th_dark: "Dark",
        audio_listening: "Listening...", audio_repeat: "Repeat aloud", audio_ready: "Done", audio_again: "Again",
        audio_your_turn: "Your turn — how will you repeat?", audio_record: "Record voice", audio_silent: "Say to yourself",
        audio_ready_record: "Ready? Record yourself or read it silently",
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
        notif_confirm: "Reminder enabled ✓", mood_popup_later: "Not now",
        inactivity_title: "Well, look who's here! 👀", inactivity_body: "We missed you! Pop in for a minute — a bit of easy, no-pressure memory training 🌱",
        instruction_hint: "Read twice, recall in your mind, then continue",
        method_mind: "Mental", method_write: "Write", method_audio: "Voice",
        text_placeholder: "Paste or type your text...",
        profile_btn: "Profile",
        profile_title: "Profile",
        profile_in_progress: "In progress",
        profile_learned: "Learned",
        profile_planned: "Planned",
        profile_words_tab: "Words",
        profile_empty_words: "No saved word sets yet",
        profile_words_total: "words",
        profile_words_mastered: "mastered",
        profile_words_review: "to review",
        wptab_sets: "By sets",
        wptab_dictionary: "Dictionary",
        wdict_mastered: "Mastered",
        wdict_review: "In review",
        wdict_unlearned: "Not learned",
        wdict_search_placeholder: "🔍 Search a word...",
        wdict_all_topics: "All topics",
        wdict_no_matches: "No matches found",
        learned_hero_title: "Nice work — here's what you've already learned! 🌟",
        learned_not_yet: "Not learned yet — move back to Progress",
        learned_group_text_speech: "Text/speech", learned_group_poem: "Poems", learned_group_song: "Songs",
        learned_cat_text: "Text", learned_cat_speech: "Speech", learned_cat_poem: "Poem", learned_cat_song: "Song",
        learned_group_poem_song: "Poems/songs", learned_cat_text_speech: "Text/speech", learned_cat_poem_song: "Poem/song",
        profile_train: "Train",
        profile_select_words: "🎯 Pick words",
        wselect_title: "Choose words to train",
        wselect_select_all: "Select all",
        wselect_selected: "Selected: {n}",
        wselect_start_btn: "Train ({n})",
        wselect_diff_lang_toast: "You can only pick words from one language pair at a time",
        wselect_none_toast: "Pick at least one word",
        profile_empty_progress: "No active session",
        progress_empty: "Nothing in progress yet — paste a text and start learning! 🌱",
        progress_stage_all: "All",
        progress_stage_start: "🌱 First steps",
        progress_stage_halfway: "🌿 Halfway there!",
        progress_stage_almost: "🌳 Almost there — one more pass!",
        profile_empty_learned: "Empty for now, but not for long 🌱 Finish learning a text and it'll move in here.",
        profile_load: "Load",
        profile_edit_text: "✎ Edit",
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
        paste_info_title: 'How to add text?',
        paste_info_body: 'Three ways — pick whichever is easiest:\n\n📋 Copy the text and just paste it into the field.\n\n📄 Tap «File» and upload a document (doc, txt, pdf) or a screenshot/photo with the text.\n\n📸 Take a photo of the text with your phone\'s camera and send it as a file — we\'ll recognize it automatically.',
        wi_placeholder: 'dog — собака\ncat — кішка\nto run — бігати',
        wi_min_error: 'Please add at least 2 word pairs',
        support_title: 'Technical support', support_type_bug: '🐛 Something\'s broken', support_type_idea: '💡 Idea or request', support_type_compliment: '😻 Praise us',
        support_placeholder: 'Describe what happened or what you\'d like added…', support_placeholder_bug: 'Tell us what happened, please — we\'ll take a good look and fix it 🛠️', support_placeholder_idea: 'Share your idea — we\'d genuinely love to hear what could be better 💡', support_placeholder_compliment: 'Just tell us something nice… we\'ll save it for a rainy day 💛', support_submit: 'Send',
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
        wt_auto: '✨ Suggest automatically', wt_save: 'Save →', wt_save_edit: 'Save changes',
        words_saved: 'Word set saved!',
        wt_type_w2t: '→ Translation', wt_type_t2w: '→ Word', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Listen and choose the word', wt_listen_btn: 'Listen',
        wt_correct: '✓ Correct!', wt_wrong: 'Oops, try again',
        wt_save_word: 'Save word', wt_skip: 'Skip', wt_finish: 'Finish',
        wt_type_spell: '✏️ Spell it', wt_type_dictation: '🎧 Dictation', wt_type_sentence: '📝 Sentence', wt_type_speak: '🗣️ Say it',
        wt_type_match: '🔗 Match', wt_type_truefalse: '✓✗ True or false', wt_type_listen: '🎧 Listen & pick',
        wt_match_prompt: 'Match the words with their translations', wt_match_mistakes: 'Done, but with some mistakes',
        wt_true: '✓ True', wt_false: '✗ False',
        wt_listen_pick_prompt: 'Listen and mark the words you heard',
        wt_spell_prompt: 'Write the word in the learning language',
        wt_dictation_prompt: 'Listen and write the word',
        wt_speak_prompt: 'Say this word in the language you\'re learning', wt_speak_record: '🎙 Record', wt_speak_said: 'You said:',
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
        mode_words_label: 'Words & Phrases', mode_words_desc: 'New vocabulary, translations, flashcards',
        // MT-02 (2026-08-15) — режим "Фокуси пам'яті"
        mode_memory_label: 'Memory Tricks',
        mode_memory_desc: 'The techniques memory champions actually use',
        mem_subtitle: 'Here we train memory itself — not a text, not words',
        mem_pick_age: 'Pick an age — different techniques work at different ages',
        mem_group_label: 'Exercises for age',
        mem_ex_intent_title: 'If-Then',
        mem_ex_intent_desc: 'The trick against “I meant to, and forgot”',
        mem_ex_intent_full: 'Three intentions is enough for now. Check them and you can add another',
        mem_worked_count: 'Times it worked: {n} 🌿',
        mem_step: 'Step {n} of 3',
        mem_q_action: 'What are you planning to do?',
        mem_hint_action: 'One concrete thing — something easy to forget',
        mem_ph_action: 'call mum back',
        mem_q_trigger: 'When exactly will you remember it?',
        mem_hint_trigger: 'Something you will definitely notice — an event, not “later”',
        mem_hint_trigger_kid: 'Pick something you will definitely do today',
        mem_ph_trigger: 'when I put the kettle on',
        mem_q_say: 'Say it out loud — once, in full',
        mem_hint_say: 'Saying it IS the technique. Your brain catches the “see it — do it” link',
        mem_formula: 'IF {trigger}, THEN {action}',
        mem_next: 'Next',
        mem_save: 'Done',
        mem_saved: 'Saved 🌿',
        mem_need_action: 'Write what you are planning to do',
        mem_need_trigger: 'Choose when exactly',
        mem_limit: 'Three intentions is plenty. Check those first',
        mem_due_q: 'Did it work?',
        mem_due_yes: 'Yes',
        mem_due_no: 'No',
        mem_due_pending: 'Not yet',
        mem_toast_yes: 'It worked 🌿 The technique is doing its job',
        mem_toast_no: 'Happens. Try the same intention with a more noticeable trigger',
        trg_pencil: 'I open my pencil case',
        trg_dinner: 'I sit down for dinner',
        trg_shoes: 'I put my trainers on',
        trg_teeth: 'I brush my teeth',
        trg_bag: 'I pick up my backpack',
        nav_learn: 'Learn', nav_library: 'Library', nav_progress: 'Progress', nav_profile: 'Profile',
        mode_subtitle: 'Pick a direction — you can switch anytime',
        wl_subtitle: 'The language you\'re learning, plus your own — for translation and pronunciation',
        wt_topic_subtitle: 'A name helps you find this set again later',
        library_title: 'Library', progress_title: 'Progress',
        profile_mood: 'Mood right now', profile_about: 'About you',
        profile_optional_note: 'Everything below is totally optional 💛 Fill in what you like, skip the rest.',
        profile_country: 'Country', profile_city: 'City', profile_age: 'Age', profile_email: 'Email', profile_birthdate: 'Date of birth'
    },
    pl: {
        welcome: "Witamy. Zacznijmy naukę bez stresu.",
        inputLabel: "Wklej tekst:", daysLabel: "Za ile dni opanować?", startBtn: "Start",
        stepNew: "ZAPAMIĘTAJ", stepReview: "POWTÓRKA",
        done: "Gotowe", restTitle: "Przerwa", restSubtitle: "Mózg odpoczywa...",
        rest_review_invite: "Bez presji — ale oto, czego już się nauczyłeś/aś, jeśli chcesz zerknąć:",
        resume: "Kontynuuj", check: "Sprawdź", next: "Dalej",
        finish_title: "Świetnie!", finish_blocks: "bloków ukończono",
        finish_time: "Czas", finish_restart: "Zacznij od nowa", finish_home: "Strona główna",
        learning_finish_here: "Zakończ tutaj",
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
        write_bigreview_note: "Napiszcie wszystkie {n} bloki jako jeden tekst, od samego początku",
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
        session_pause_title: "Świetna robota jak na dziś!",
        session_pause_body: "Przerobiliście {n} z {total} bloków. Kontynuujcie, kiedy będziecie gotowi.",
        session_pause_continue: "Kontynuuj teraz",
        session_pause_finish: "Zakończ na dziś",
        finish_all_title: "Tekst opanowany!",
        finish_pass_title: "Świetne przejście! Jeszcze raz — i opanowane 🌱",
        finish_all_body: "Ukończyliście wszystkie bloki. Świetna robota!",
        validation_no_text: "Wklej tekst do nauki",
        validation_too_short: "Tekst jest za krótki — minimum 4 słowa",
        themeLabel: "Motyw:", th_light: "Jasny", th_dark: "Ciemny",
        audio_listening: "Słuchaj...", audio_repeat: "Powtórz na głos", audio_ready: "Gotowe", audio_again: "Jeszcze raz",
        audio_your_turn: "Twoja kolej — jak powtórzysz?", audio_record: "Nagraj głos", audio_silent: "Powiedz w myślach",
        audio_ready_record: "Gotowi? Nagraj się lub przeczytaj w myślach",
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
        notif_confirm: "Przypomnienie włączone ✓", mood_popup_later: "Nie teraz",
        inactivity_title: "O, kto to do nas zawitał! 👀", inactivity_body: "Tęskniliśmy! Zajrzyj na chwilę — trochę treningu pamięci, bez napięcia 🌱",
        instruction_hint: "Przeczytaj dwa razy, powtórz w myślach i jedź dalej",
        method_mind: "W myślach", method_write: "Pisanie", method_audio: "Głosem",
        text_placeholder: "Wklej lub wpisz tekst...",
        profile_btn: "Profil",
        profile_title: "Profil",
        profile_in_progress: "W toku",
        profile_learned: "Nauczone",
        profile_planned: "Zaplanowane",
        profile_words_tab: "Słowa",
        profile_empty_words: "Brak zapisanych zestawów słów",
        profile_words_total: "słów",
        profile_words_mastered: "opanowane",
        profile_words_review: "do powtórki",
        wptab_sets: "Wg zestawów",
        wptab_dictionary: "Słownik",
        wdict_mastered: "Opanowane",
        wdict_review: "W trakcie powtórki",
        wdict_unlearned: "Nieopanowane",
        wdict_search_placeholder: "🔍 Szukaj słowa...",
        wdict_all_topics: "Wszystkie tematy",
        wdict_no_matches: "Nic nie znaleziono",
        learned_hero_title: "Brawo, oto czego już się nauczyłaś! 🌟",
        learned_not_yet: "Jeszcze nieopanowane — wróć do Postępu",
        learned_group_text_speech: "Tekst/przemówienie", learned_group_poem: "Wiersze", learned_group_song: "Piosenki",
        learned_cat_text: "Tekst", learned_cat_speech: "Przemówienie", learned_cat_poem: "Wiersz", learned_cat_song: "Piosenka",
        learned_group_poem_song: "Wiersze/piosenki", learned_cat_text_speech: "Tekst/przemówienie", learned_cat_poem_song: "Wiersz/piosenka",
        profile_train: "Trenuj",
        profile_select_words: "🎯 Wybierz słowa",
        wselect_title: "Wybierz słowa do treningu",
        wselect_select_all: "Zaznacz wszystkie",
        wselect_selected: "Wybrano: {n}",
        wselect_start_btn: "Trenuj ({n})",
        wselect_diff_lang_toast: "Możesz wybierać słowa tylko z jednej pary językowej naraz",
        wselect_none_toast: "Wybierz co najmniej jedno słowo",
        profile_empty_progress: "Brak aktywnej sesji",
        progress_empty: "Jeszcze nic w trakcie — wklej tekst i zacznij się uczyć! 🌱",
        progress_stage_all: "Wszystkie",
        progress_stage_start: "🌱 Pierwsze kroki",
        progress_stage_halfway: "🌿 W połowie drogi!",
        progress_stage_almost: "🌳 Jeszcze trochę — i opanowane!",
        profile_empty_learned: "Na razie tu pusto, ale to się zmieni 🌱 Naucz się pierwszego tekstu — i on tu zamieszka.",
        profile_load: "Załaduj",
        profile_edit_text: "✎ Edytuj",
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
        paste_info_title: 'Jak dodać tekst?',
        paste_info_body: 'Trzy sposoby — wybierz wygodniejszy:\n\n📋 Skopiuj tekst i po prostu wklej go w pole.\n\n📄 Naciśnij «Plik» i wgraj dokument (doc, txt, pdf) lub zrzut ekranu/zdjęcie z tekstem.\n\n📸 Zrób zdjęcie tekstu aparatem telefonu i wyślij jako plik — rozpoznamy go automatycznie.',
        wi_placeholder: 'dog — pies\ncat — kot\nto run — biegać',
        wi_min_error: 'Potrzeba co najmniej 2 par słów',
        support_title: 'Pomoc techniczna', support_type_bug: '🐛 Coś nie działa', support_type_idea: '💡 Pomysł lub życzenie', support_type_compliment: '😻 Pochwal nas',
        support_placeholder: 'Opisz, co się stało albo co chciałabyś dodać…', support_placeholder_bug: 'Napisz, proszę, co się stało — na pewno się tym zajmiemy 🛠️', support_placeholder_idea: 'Podziel się pomysłem — naprawdę ciekawi nas, co można poprawić 💡', support_placeholder_compliment: 'Powiedz nam coś miłego… schowamy to na gorszy dzień 💛', support_submit: 'Wyślij',
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
        wt_auto: '✨ Zasugeruj automatycznie', wt_save: 'Zapisz →', wt_save_edit: 'Zapisz zmiany',
        words_saved: 'Zestaw zapisany!',
        wt_type_w2t: '→ Tłumaczenie', wt_type_t2w: '→ Słowo', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Posłuchaj i wybierz słowo', wt_listen_btn: 'Posłuchaj',
        wt_correct: '✓ Dobrze!', wt_wrong: 'Ups, spróbuj jeszcze raz',
        wt_save_word: 'Zapisz słowo', wt_skip: 'Pomiń', wt_finish: 'Zakończ',
        wt_type_spell: '✏️ Napisz', wt_type_dictation: '🎧 Dyktando', wt_type_sentence: '📝 Zdanie', wt_type_speak: '🗣️ Powiedz',
        wt_type_match: '🔗 Pary', wt_type_truefalse: '✓✗ Prawda czy fałsz', wt_type_listen: '🎧 Słuchaj i zaznacz',
        wt_match_prompt: 'Dopasuj słowa do tłumaczeń', wt_match_mistakes: 'Gotowe, ale były błędy',
        wt_true: '✓ Prawda', wt_false: '✗ Fałsz',
        wt_listen_pick_prompt: 'Posłuchaj i zaznacz słowa, które usłyszałeś',
        wt_spell_prompt: 'Napisz słowo w języku docelowym',
        wt_sentence_prompt: 'Uzupełnij brakujące słowo',
        wt_sentence_no_examples: 'Brak jeszcze przykładowych zdań dla tych słów',
        wt_preparing: 'Przygotowuję ćwiczenia…',
        wt_dictation_prompt: 'Posłuchaj i napisz słowo',
        wt_speak_prompt: 'Powiedz to słowo w języku, którego się uczysz', wt_speak_record: '🎙 Nagraj', wt_speak_said: 'Powiedziałeś/aś:',
        wt_check: 'Sprawdź', wt_type_placeholder: 'Wpisz odpowiedź...', wt_hint: 'Podpowiedź',
        wt_wrong_answer_was: 'Poprawnie:',
        wt_result_perfect: '🌟 Idealnie!', wt_result_great: '🎉 Świetnie!',
        wt_result_good: '👍 Nieźle!', wt_result_keep: '💪 Dalej!',
        wt_score_label: 'poprawnych odpowiedzi', wt_restart: 'Jeszcze raz', wt_home: 'Strona główna',
        wt_no_trans: 'Dodaj tłumaczenia, aby rozpocząć trening',
        wt_resume_confirm: 'Znaleziono nieukończony trening tego zestawu ({n}/{total}). Kontynuować od tego miejsca?',
        mode_title: 'Czego chcesz się uczyć?',
        mode_text_label: 'Tekst', mode_text_desc: 'Wiersz, przemowa, artykuł, prezentacja',
        mode_words_label: 'Słowa i Frazy', mode_words_desc: 'Nowe słownictwo, tłumaczenia, fiszki',
        // MT-02 (2026-08-15) — режим "Фокуси пам'яті"
        mode_memory_label: 'Sztuczki pamięci',
        mode_memory_desc: 'Techniki, których naprawdę używają mistrzowie pamięci',
        mem_subtitle: 'Tutaj trenujemy samą pamięć — nie tekst i nie słowa',
        mem_pick_age: 'Wybierz wiek — w różnym wieku działają różne techniki',
        mem_group_label: 'Ćwiczenia dla wieku',
        mem_ex_intent_title: 'Jeśli-to',
        mem_ex_intent_desc: 'Technika przeciw „chciałem i zapomniałem”',
        mem_ex_intent_full: 'Trzy zamiary na razie wystarczą. Sprawdź je, a dodasz kolejny',
        mem_worked_count: 'Zadziałało razy: {n} 🌿',
        mem_step: 'Krok {n} z 3',
        mem_q_action: 'Co zamierzasz zrobić?',
        mem_hint_action: 'Jedna konkretna rzecz — taka, którą łatwo zapomnieć',
        mem_ph_action: 'oddzwonić do mamy',
        mem_q_trigger: 'Kiedy dokładnie sobie o tym przypomnisz?',
        mem_hint_trigger: 'Coś, co na pewno zauważysz — zdarzenie, nie „później”',
        mem_hint_trigger_kid: 'Wybierz coś, co dziś na pewno zrobisz',
        mem_ph_trigger: 'gdy nastawię czajnik',
        mem_q_say: 'Powiedz to na głos — raz, w całości',
        mem_hint_say: 'Wypowiedzenie TO jest technika. Mózg łapie związek „widzę — robię”',
        mem_formula: 'JEŚLI {trigger}, TO {action}',
        mem_next: 'Dalej',
        mem_save: 'Gotowe',
        mem_saved: 'Zapisane 🌿',
        mem_need_action: 'Napisz, co zamierzasz zrobić',
        mem_need_trigger: 'Wybierz, kiedy dokładnie',
        mem_limit: 'Trzy zamiary w zupełności wystarczą. Najpierw sprawdź te',
        mem_due_q: 'Zadziałało?',
        mem_due_yes: 'Tak',
        mem_due_no: 'Nie',
        mem_due_pending: 'Jeszcze nie',
        mem_toast_yes: 'Zadziałało 🌿 Technika działa',
        mem_toast_no: 'Bywa. Spróbuj tego samego z bardziej wyrazistym sygnałem',
        trg_pencil: 'otworzę piórnik',
        trg_dinner: 'usiądę do kolacji',
        trg_shoes: 'założę buty',
        trg_teeth: 'umyję zęby',
        trg_bag: 'wezmę plecak',
        nav_learn: 'Nauka', nav_library: 'Biblioteka', nav_progress: 'Postęp', nav_profile: 'Profil',
        mode_subtitle: 'Wybierz kierunek — możesz zmienić w każdej chwili',
        wl_subtitle: 'Język, którego się uczysz, i twój ojczysty — do tłumaczeń i wymowy',
        wt_topic_subtitle: 'Nazwa pomoże szybko znaleźć ten zestaw w profilu',
        library_title: 'Biblioteka', progress_title: 'Postęp',
        profile_mood: 'Nastrój teraz', profile_about: 'O tobie',
        profile_optional_note: 'Wszystko poniżej jest całkowicie opcjonalne 💛 Wypełnij, co chcesz, resztę śmiało pomiń.',
        profile_country: 'Kraj', profile_city: 'Miasto', profile_age: 'Wiek', profile_email: 'E-mail', profile_birthdate: 'Data urodzenia'
    },
    de: {
        welcome: "Willkommen. Lernen ohne Stress.",
        inputLabel: "Text einfügen:", daysLabel: "In wie vielen Tagen?", startBtn: "Start",
        stepNew: "MERKEN", stepReview: "WIEDERHOLUNG",
        done: "Fertig", restTitle: "Pause", restSubtitle: "Gehirn ruht...",
        rest_review_invite: "Kein Muss — aber hier ist, was du bisher gelernt hast, falls du reinschauen möchtest:",
        resume: "Weiter", check: "Prüfen", next: "Weiter",
        finish_title: "Toll!", finish_blocks: "Blöcke abgeschlossen",
        finish_time: "Zeit", finish_restart: "Nochmal", finish_home: "Startseite",
        learning_finish_here: "Hier beenden",
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
        write_bigreview_note: "Schreiben Sie alle {n} Blöcke als einen Text, von Anfang an",
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
        session_pause_title: "Gute Arbeit für heute!",
        session_pause_body: "Sie haben {n} von {total} Blöcken gelernt. Machen Sie weiter, wenn Sie bereit sind.",
        session_pause_continue: "Jetzt weitermachen",
        session_pause_finish: "Für heute beenden",
        finish_all_title: "Text gelernt!",
        finish_pass_title: "Toller Durchgang! Noch einmal — und gelernt 🌱",
        finish_all_body: "Sie haben alle Blöcke abgeschlossen. Großartig!",
        validation_no_text: "Bitte fügen Sie Text zum Lernen ein",
        validation_too_short: "Text zu kurz — mindestens 4 Wörter erforderlich",
        themeLabel: "Design:", th_light: "Hell", th_dark: "Dunkel",
        audio_listening: "Hören...", audio_repeat: "Laut wiederholen", audio_ready: "Fertig", audio_again: "Nochmal",
        audio_your_turn: "Du bist dran — wie wiederholst du?", audio_record: "Stimme aufnehmen", audio_silent: "Im Stillen sagen",
        audio_ready_record: "Bereit? Nimm dich auf oder lies es im Stillen",
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
        notif_confirm: "Erinnerung aktiviert ✓", mood_popup_later: "Nicht jetzt",
        inactivity_title: "Schau mal, wer da ist! 👀", inactivity_body: "Wir haben dich vermisst! Schau kurz vorbei — ein bisschen Gedächtnistraining, ganz entspannt 🌱",
        instruction_hint: "Zweimal lesen, im Kopf wiederholen, dann weiter",
        method_mind: "Im Kopf", method_write: "Schreiben", method_audio: "Stimme",
        text_placeholder: "Text einfügen oder tippen...",
        profile_btn: "Profil",
        profile_title: "Profil",
        profile_in_progress: "Laufend",
        profile_learned: "Gelernt",
        profile_planned: "Geplant",
        profile_words_tab: "Wörter",
        profile_empty_words: "Noch keine gespeicherten Wortsets",
        profile_words_total: "Wörter",
        profile_words_mastered: "gelernt",
        profile_words_review: "zu wiederholen",
        wptab_sets: "Nach Sets",
        wptab_dictionary: "Wörterbuch",
        wdict_mastered: "Gelernt",
        wdict_review: "In Wiederholung",
        wdict_unlearned: "Nicht gelernt",
        wdict_search_placeholder: "🔍 Wort suchen...",
        wdict_all_topics: "Alle Themen",
        wdict_no_matches: "Nichts gefunden",
        learned_hero_title: "Gut gemacht — das hast du schon gelernt! 🌟",
        learned_not_yet: "Noch nicht gelernt — zurück zum Fortschritt",
        learned_group_text_speech: "Text/Rede", learned_group_poem: "Gedichte", learned_group_song: "Lieder",
        learned_cat_text: "Text", learned_cat_speech: "Rede", learned_cat_poem: "Gedicht", learned_cat_song: "Lied",
        learned_group_poem_song: "Gedichte/Lieder", learned_cat_text_speech: "Text/Rede", learned_cat_poem_song: "Gedicht/Lied",
        profile_train: "Trainieren",
        profile_select_words: "🎯 Wörter wählen",
        wselect_title: "Wörter fürs Training wählen",
        wselect_select_all: "Alle auswählen",
        wselect_selected: "Ausgewählt: {n}",
        wselect_start_btn: "Trainieren ({n})",
        wselect_diff_lang_toast: "Du kannst nur Wörter aus einem Sprachpaar gleichzeitig wählen",
        wselect_none_toast: "Wähle mindestens ein Wort",
        profile_empty_progress: "Keine aktive Sitzung",
        progress_empty: "Noch nichts in Arbeit — füge einen Text ein und leg los! 🌱",
        progress_stage_all: "Alle",
        progress_stage_start: "🌱 Erste Schritte",
        progress_stage_halfway: "🌿 Auf halbem Weg!",
        progress_stage_almost: "🌳 Noch ein bisschen — gleich gelernt!",
        profile_empty_learned: "Noch ist es hier leer — aber nicht mehr lange 🌱 Lerne deinen ersten Text, und er zieht hier ein.",
        profile_load: "Laden",
        profile_edit_text: "✎ Bearbeiten",
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
        paste_info_title: 'Wie füge ich Text hinzu?',
        paste_info_body: 'Drei Wege — wähle den bequemsten:\n\n📋 Text kopieren und einfach in das Feld einfügen.\n\n📄 Auf «Datei» tippen und ein Dokument (doc, txt, pdf) oder einen Screenshot/ein Foto mit dem Text hochladen.\n\n📸 Text mit der Handykamera fotografieren und als Datei senden — wir erkennen ihn automatisch.',
        wi_placeholder: 'dog — Hund\ncat — Katze\nto run — laufen',
        wi_min_error: 'Mindestens 2 Wortpaare erforderlich',
        support_title: 'Technischer Support', support_type_bug: '🐛 Etwas funktioniert nicht', support_type_idea: '💡 Idee oder Wunsch', support_type_compliment: '😻 Lobt uns',
        support_placeholder: 'Beschreibe, was passiert ist oder was du dir wünschst…', support_placeholder_bug: 'Beschreib bitte, was passiert ist — wir schauen es uns in Ruhe an 🛠️', support_placeholder_idea: 'Teil uns deine Idee mit — uns interessiert wirklich, was besser sein könnte 💡', support_placeholder_compliment: 'Sag uns einfach etwas Nettes… wir heben es uns für einen schlechten Tag auf 💛', support_submit: 'Senden',
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
        wt_auto: '✨ Automatisch vorschlagen', wt_save: 'Speichern →', wt_save_edit: 'Änderungen speichern',
        words_saved: 'Wortset gespeichert!',
        wt_type_w2t: '→ Übersetzung', wt_type_t2w: '→ Wort', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Hör zu und wähle das Wort', wt_listen_btn: 'Anhören',
        wt_correct: '✓ Richtig!', wt_wrong: 'Ups, versuch es nochmal',
        wt_save_word: 'Wort merken', wt_skip: 'Überspringen', wt_finish: 'Beenden',
        wt_type_spell: '✏️ Schreiben', wt_type_dictation: '🎧 Diktat', wt_type_sentence: '📝 Satz', wt_type_speak: '🗣️ Sag es',
        wt_type_match: '🔗 Paare', wt_type_truefalse: '✓✗ Wahr oder falsch', wt_type_listen: '🎧 Hören & markieren',
        wt_match_prompt: 'Ordne die Wörter ihren Übersetzungen zu', wt_match_mistakes: 'Fertig, aber mit Fehlern',
        wt_true: '✓ Wahr', wt_false: '✗ Falsch',
        wt_listen_pick_prompt: 'Hör zu und markiere die Wörter, die du gehört hast',
        wt_spell_prompt: 'Schreibe das Wort in der Lernsprache',
        wt_sentence_prompt: 'Fülle das fehlende Wort aus',
        wt_sentence_no_examples: 'Für diese Wörter gibt es noch keine Beispielsätze',
        wt_preparing: 'Übungen werden vorbereitet…',
        wt_dictation_prompt: 'Höre zu und schreibe das Wort',
        wt_speak_prompt: 'Sag dieses Wort in der Sprache, die du lernst', wt_speak_record: '🎙 Aufnehmen', wt_speak_said: 'Du hast gesagt:',
        wt_check: 'Prüfen', wt_type_placeholder: 'Antwort eingeben...', wt_hint: 'Hinweis',
        wt_wrong_answer_was: 'Richtig:',
        wt_result_perfect: '🌟 Perfekt!', wt_result_great: '🎉 Super!',
        wt_result_good: '👍 Nicht schlecht!', wt_result_keep: '💪 Weiter so!',
        wt_score_label: 'richtige Antworten', wt_restart: 'Nochmal', wt_home: 'Startseite',
        wt_no_trans: 'Füge Übersetzungen hinzu, um das Training zu starten',
        wt_resume_confirm: 'Unvollständiges Training für dieses Set gefunden ({n}/{total}). Dort fortsetzen?',
        mode_title: 'Was möchtest du lernen?',
        mode_text_label: 'Text', mode_text_desc: 'Gedicht, Rede, Artikel, Präsentation',
        mode_words_label: 'Wörter & Phrasen', mode_words_desc: 'Neues Vokabular, Übersetzungen, Karteikarten',
        // MT-02 (2026-08-15) — режим "Фокуси пам'яті"
        mode_memory_label: 'Gedächtnistricks',
        mode_memory_desc: 'Die Techniken, die Gedächtnismeister wirklich nutzen',
        mem_subtitle: 'Hier trainieren wir das Gedächtnis selbst — keinen Text, keine Wörter',
        mem_pick_age: 'Wähle ein Alter — in jedem Alter wirken andere Techniken',
        mem_group_label: 'Übungen für Alter',
        mem_ex_intent_title: 'Wenn-Dann',
        mem_ex_intent_desc: 'Der Trick gegen „ich wollte und hab’s vergessen“',
        mem_ex_intent_full: 'Drei Vorhaben reichen erst mal. Prüfe sie, dann geht ein neues',
        mem_worked_count: 'So oft hat es geklappt: {n} 🌿',
        mem_step: 'Schritt {n} von 3',
        mem_q_action: 'Was hast du vor?',
        mem_hint_action: 'Eine konkrete Sache — etwas, das man leicht vergisst',
        mem_ph_action: 'Mama zurückrufen',
        mem_q_trigger: 'Wann genau fällt es dir wieder ein?',
        mem_hint_trigger: 'Etwas, das du sicher bemerkst — ein Ereignis, kein „später“',
        mem_hint_trigger_kid: 'Wähle etwas, das du heute sicher machst',
        mem_ph_trigger: 'wenn ich Wasser aufsetze',
        mem_q_say: 'Sag es laut — einmal, vollständig',
        mem_hint_say: 'Das Aussprechen IST die Technik. Das Gehirn merkt sich „sehen — tun“',
        mem_formula: 'WENN {trigger}, DANN {action}',
        mem_next: 'Weiter',
        mem_save: 'Fertig',
        mem_saved: 'Gespeichert 🌿',
        mem_need_action: 'Schreib, was du vorhast',
        mem_need_trigger: 'Wähle, wann genau',
        mem_limit: 'Drei Vorhaben sind genug. Prüfe die erst',
        mem_due_q: 'Hat es geklappt?',
        mem_due_yes: 'Ja',
        mem_due_no: 'Nein',
        mem_due_pending: 'Noch nicht',
        mem_toast_yes: 'Hat geklappt 🌿 Die Technik wirkt',
        mem_toast_no: 'Kommt vor. Versuch es mit einem auffälligeren Auslöser',
        trg_pencil: 'ich mein Mäppchen öffne',
        trg_dinner: 'ich mich zum Abendessen setze',
        trg_shoes: 'ich meine Schuhe anziehe',
        trg_teeth: 'ich Zähne putze',
        trg_bag: 'ich meinen Rucksack nehme',
        nav_learn: 'Lernen', nav_library: 'Bibliothek', nav_progress: 'Fortschritt', nav_profile: 'Profil',
        mode_subtitle: 'Wähle eine Richtung — du kannst jederzeit wechseln',
        wl_subtitle: 'Die Sprache, die du lernst, und deine Muttersprache — für Übersetzung und Aussprache',
        wt_topic_subtitle: 'Ein Name hilft dir, dieses Set später im Profil wiederzufinden',
        library_title: 'Bibliothek', progress_title: 'Fortschritt',
        profile_mood: 'Aktuelle Stimmung', profile_about: 'Über dich',
        profile_optional_note: 'Alles hier unten ist völlig freiwillig 💛 Trag ein, was du magst, den Rest lässt du einfach weg.',
        profile_country: 'Land', profile_city: 'Stadt', profile_age: 'Alter', profile_email: 'E-Mail', profile_birthdate: 'Geburtsdatum'
    },
    fr: {
        welcome: "Bienvenue. Apprenons sans stress.",
        inputLabel: "Coller le texte :", daysLabel: "En combien de jours ?", startBtn: "Démarrer",
        stepNew: "MÉMORISER", stepReview: "RÉVISION",
        done: "Terminé", restTitle: "Pause", restSubtitle: "Le cerveau se repose...",
        rest_review_invite: "Aucune pression — mais voici ce que vous avez déjà appris, si vous voulez jeter un œil :",
        resume: "Continuer", check: "Vérifier", next: "Suivant",
        finish_title: "Bravo !", finish_blocks: "blocs complétés",
        finish_time: "Temps", finish_restart: "Recommencer", finish_home: "Accueil",
        learning_finish_here: "Terminer ici",
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
        write_bigreview_note: "Écrivez les {n} blocs comme un seul texte, depuis le tout début",
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
        session_pause_title: "Beau travail pour aujourd'hui !",
        session_pause_body: "Vous avez couvert {n} blocs sur {total}. Continuez quand vous serez prêt(e).",
        session_pause_continue: "Continuer maintenant",
        session_pause_finish: "Finir pour aujourd'hui",
        finish_all_title: "Texte appris !",
        finish_pass_title: "Beau parcours ! Encore une fois — et c'est appris 🌱",
        finish_all_body: "Vous avez complété tous les blocs. Excellent travail !",
        validation_no_text: "Veuillez coller du texte à mémoriser",
        validation_too_short: "Texte trop court — minimum 4 mots requis",
        themeLabel: "Thème:", th_light: "Clair", th_dark: "Sombre",
        audio_listening: "Écoutez...", audio_repeat: "Répétez à voix haute", audio_ready: "Terminé", audio_again: "Encore",
        audio_your_turn: "À vous — comment allez-vous répéter ?", audio_record: "Enregistrer la voix", audio_silent: "Dire en silence",
        audio_ready_record: "Prêt ? Enregistrez-vous ou lisez en silence",
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
        notif_confirm: "Rappel activé ✓", mood_popup_later: "Pas maintenant",
        inactivity_title: "Regarde qui voilà ! 👀", inactivity_body: "Tu nous as manqué ! Passe une minute — un petit entraînement de mémoire, sans pression 🌱",
        instruction_hint: "Lisez deux fois, rappelez-vous mentalement, continuez",
        method_mind: "Mental", method_write: "Écriture", method_audio: "Voix",
        text_placeholder: "Collez ou saisissez votre texte...",
        profile_btn: "Profil",
        profile_title: "Profil",
        profile_in_progress: "En cours",
        profile_learned: "Appris",
        profile_planned: "Planifiés",
        profile_words_tab: "Mots",
        profile_empty_words: "Aucun ensemble de mots enregistré",
        profile_words_total: "mots",
        profile_words_mastered: "maîtrisés",
        profile_words_review: "à revoir",
        wptab_sets: "Par ensembles",
        wptab_dictionary: "Dictionnaire",
        wdict_mastered: "Maîtrisés",
        wdict_review: "En révision",
        wdict_unlearned: "Non appris",
        wdict_search_placeholder: "🔍 Rechercher un mot...",
        wdict_all_topics: "Tous les sujets",
        wdict_no_matches: "Aucun résultat",
        learned_hero_title: "Bravo, voici ce que tu as déjà appris ! 🌟",
        learned_not_yet: "Pas encore appris — remettre en Progrès",
        learned_group_text_speech: "Texte/discours", learned_group_poem: "Poèmes", learned_group_song: "Chansons",
        learned_cat_text: "Texte", learned_cat_speech: "Discours", learned_cat_poem: "Poème", learned_cat_song: "Chanson",
        learned_group_poem_song: "Poèmes/chansons", learned_cat_text_speech: "Texte/discours", learned_cat_poem_song: "Poème/chanson",
        profile_train: "Entraîner",
        profile_select_words: "🎯 Choisir des mots",
        wselect_title: "Choisir des mots à s'entraîner",
        wselect_select_all: "Tout sélectionner",
        wselect_selected: "Sélectionnés : {n}",
        wselect_start_btn: "S'entraîner ({n})",
        wselect_diff_lang_toast: "Vous ne pouvez choisir des mots que d'une seule paire de langues à la fois",
        wselect_none_toast: "Choisissez au moins un mot",
        profile_empty_progress: "Aucune session active",
        progress_empty: "Rien en cours pour l'instant — colle un texte et commence à apprendre ! 🌱",
        progress_stage_all: "Tous",
        progress_stage_start: "🌱 Premiers pas",
        progress_stage_halfway: "🌿 À mi-chemin !",
        progress_stage_almost: "🌳 Presque là — encore un peu !",
        profile_empty_learned: "Encore vide, mais plus pour longtemps 🌱 Termine ton premier texte et il s'installera ici.",
        profile_load: "Charger",
        profile_edit_text: "✎ Modifier",
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
        paste_info_title: 'Comment ajouter le texte ?',
        paste_info_body: 'Trois façons de faire — choisissez celle qui vous convient :\n\n📋 Copiez le texte et collez-le simplement dans le champ.\n\n📄 Appuyez sur «Fichier» et importez un document (doc, txt, pdf) ou une capture d\'écran/photo du texte.\n\n📸 Photographiez le texte avec l\'appareil photo de votre téléphone et envoyez-le comme fichier — nous le reconnaîtrons automatiquement.',
        wi_placeholder: 'dog — chien\ncat — chat\nto run — courir',
        wi_min_error: 'Veuillez ajouter au moins 2 paires',
        support_title: 'Assistance technique', support_type_bug: '🐛 Quelque chose ne marche pas', support_type_idea: '💡 Idée ou souhait', support_type_compliment: '😻 Complimentez-nous',
        support_placeholder: 'Décrivez ce qui s\'est passé ou ce que vous aimeriez ajouter…', support_placeholder_bug: 'Dites-nous ce qui s\'est passé, s\'il vous plaît — on va y regarder de près 🛠️', support_placeholder_idea: 'Partagez votre idée — ça nous intéresse vraiment de savoir ce qu\'on pourrait améliorer 💡', support_placeholder_compliment: 'Dites-nous juste quelque chose de gentil… on le gardera pour les mauvais jours 💛', support_submit: 'Envoyer',
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
        wt_auto: '✨ Suggérer automatiquement', wt_save: 'Enregistrer →', wt_save_edit: 'Enregistrer les modifications',
        words_saved: 'Ensemble sauvegardé !',
        wt_type_w2t: '→ Traduction', wt_type_t2w: '→ Mot', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Écoutez et choisissez le mot', wt_listen_btn: 'Écouter',
        wt_correct: '✓ Correct !', wt_wrong: 'Oups, réessaie',
        wt_save_word: 'Garder le mot', wt_skip: 'Ignorer', wt_finish: 'Terminer',
        wt_type_spell: '✏️ Écrire', wt_type_dictation: '🎧 Dictée', wt_type_sentence: '📝 Phrase', wt_type_speak: '🗣️ Dites-le',
        wt_type_match: '🔗 Paires', wt_type_truefalse: '✓✗ Vrai ou faux', wt_type_listen: '🎧 Écoute et coche',
        wt_match_prompt: 'Associez les mots à leur traduction', wt_match_mistakes: 'Terminé, mais avec des erreurs',
        wt_true: '✓ Vrai', wt_false: '✗ Faux',
        wt_listen_pick_prompt: 'Écoutez et cochez les mots que vous avez entendus',
        wt_spell_prompt: 'Écrivez le mot dans la langue cible',
        wt_sentence_prompt: 'Complétez le mot manquant',
        wt_sentence_no_examples: 'Pas encore de phrases d\'exemple pour ces mots',
        wt_preparing: 'Préparation des exercices…',
        wt_dictation_prompt: 'Écoutez et écrivez le mot',
        wt_speak_prompt: 'Dites ce mot dans la langue que vous apprenez', wt_speak_record: '🎙 Enregistrer', wt_speak_said: 'Vous avez dit :',
        wt_check: 'Vérifier', wt_type_placeholder: 'Tapez votre réponse...', wt_hint: 'Indice',
        wt_wrong_answer_was: 'Correct :',
        wt_result_perfect: '🌟 Parfait !', wt_result_great: '🎉 Excellent !',
        wt_result_good: '👍 Pas mal !', wt_result_keep: '💪 Continuez !',
        wt_score_label: 'bonnes réponses', wt_restart: 'Recommencer', wt_home: 'Accueil',
        wt_no_trans: 'Ajoutez des traductions pour commencer l\'entraînement',
        wt_resume_confirm: 'Entraînement inachevé trouvé pour cet ensemble ({n}/{total}). Continuer où vous en étiez ?',
        mode_title: 'Que voulez-vous apprendre ?',
        mode_text_label: 'Texte', mode_text_desc: 'Poème, discours, article, présentation',
        mode_words_label: 'Mots & Phrases', mode_words_desc: 'Nouveau vocabulaire, traductions, fiches',
        // MT-02 (2026-08-15) — режим "Фокуси пам'яті"
        mode_memory_label: 'Tours de mémoire',
        mode_memory_desc: 'Les techniques qu’utilisent vraiment les champions de mémoire',
        mem_subtitle: 'Ici on entraîne la mémoire elle-même — ni texte, ni mots',
        mem_pick_age: 'Choisis un âge — les techniques efficaces changent avec l’âge',
        mem_group_label: 'Exercices pour l’âge',
        mem_ex_intent_title: 'Si-Alors',
        mem_ex_intent_desc: 'La technique contre « je voulais, et j’ai oublié »',
        mem_ex_intent_full: 'Trois intentions suffisent pour l’instant. Vérifie-les et tu pourras en ajouter',
        mem_worked_count: 'Ça a marché : {n} fois 🌿',
        mem_step: 'Étape {n} sur 3',
        mem_q_action: 'Qu’est-ce que tu comptes faire ?',
        mem_hint_action: 'Une chose concrète — de celles qu’on oublie facilement',
        mem_ph_action: 'rappeler maman',
        mem_q_trigger: 'Quand exactement vas-tu y repenser ?',
        mem_hint_trigger: 'Quelque chose que tu remarqueras sûrement — un événement, pas « plus tard »',
        mem_hint_trigger_kid: 'Choisis quelque chose que tu feras sûrement aujourd’hui',
        mem_ph_trigger: 'quand je mets la bouilloire',
        mem_q_say: 'Dis-le à voix haute — une fois, en entier',
        mem_hint_say: 'Le dire, C’EST la technique. Le cerveau retient le lien « je vois — je fais »',
        mem_formula: 'SI {trigger}, ALORS {action}',
        mem_next: 'Suivant',
        mem_save: 'Terminé',
        mem_saved: 'Enregistré 🌿',
        mem_need_action: 'Écris ce que tu comptes faire',
        mem_need_trigger: 'Choisis quand exactement',
        mem_limit: 'Trois intentions, c’est bien assez. Vérifie-les d’abord',
        mem_due_q: 'Ça a marché ?',
        mem_due_yes: 'Oui',
        mem_due_no: 'Non',
        mem_due_pending: 'Pas encore',
        mem_toast_yes: 'Ça a marché 🌿 La technique fonctionne',
        mem_toast_no: 'Ça arrive. Reprends la même intention avec un déclencheur plus visible',
        trg_pencil: 'j’ouvre ma trousse',
        trg_dinner: 'je m’assois pour dîner',
        trg_shoes: 'je mets mes baskets',
        trg_teeth: 'je me brosse les dents',
        trg_bag: 'je prends mon sac',
        nav_learn: 'Apprendre', nav_library: 'Bibliothèque', nav_progress: 'Progrès', nav_profile: 'Profil',
        mode_subtitle: 'Choisissez une direction — vous pouvez changer à tout moment',
        wl_subtitle: 'La langue que vous apprenez, et votre langue maternelle — pour la traduction et la prononciation',
        wt_topic_subtitle: 'Un nom vous aidera à retrouver cet ensemble dans votre profil',
        library_title: 'Bibliothèque', progress_title: 'Progrès',
        profile_mood: 'Humeur du moment', profile_about: 'À propos de toi',
        profile_optional_note: 'Tout ce qui suit est entièrement facultatif 💛 Remplis ce que tu veux, laisse le reste de côté.',
        profile_country: 'Pays', profile_city: 'Ville', profile_age: 'Âge', profile_email: 'E-mail', profile_birthdate: 'Date de naissance'
    },
    es: {
        welcome: "Bienvenido. Aprendamos sin estrés.",
        inputLabel: "Pegar texto:", daysLabel: "¿En cuántos días aprenderlo?", startBtn: "Empezar",
        stepNew: "MEMORIZAR", stepReview: "REPASO",
        done: "Hecho", restTitle: "Descanso", restSubtitle: "El cerebro descansa...",
        rest_review_invite: "Sin presión — pero aquí tienes lo que ya has aprendido, por si quieres echar un vistazo:",
        resume: "Continuar", check: "Comprobar", next: "Siguiente",
        finish_title: "¡Genial!", finish_blocks: "bloques completados",
        finish_time: "Tiempo", finish_restart: "Reintentar", finish_home: "Inicio",
        learning_finish_here: "Terminar aquí",
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
        write_bigreview_note: "Escriban los {n} bloques como un solo texto, desde el principio",
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
        session_pause_title: "¡Buen trabajo por hoy!",
        session_pause_body: "Han cubierto {n} de {total} bloques. Continúen cuando estén listos.",
        session_pause_continue: "Continuar ahora",
        session_pause_finish: "Terminar por hoy",
        finish_all_title: "¡Texto aprendido!",
        finish_pass_title: "¡Buen recorrido! Una vez más y estará aprendido 🌱",
        finish_all_body: "Han completado todos los bloques. ¡Excelente trabajo!",
        validation_no_text: "Por favor, pega texto para memorizar",
        validation_too_short: "Texto demasiado corto — mínimo 4 palabras",
        themeLabel: "Tema:", th_light: "Claro", th_dark: "Oscuro",
        audio_listening: "Escucha...", audio_repeat: "Repite en voz alta", audio_ready: "Listo", audio_again: "Otra vez",
        audio_your_turn: "Tu turno — ¿cómo vas a repetir?", audio_record: "Grabar voz", audio_silent: "Decir en silencio",
        audio_ready_record: "¿Listo? Grábate o léelo en silencio",
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
        notif_confirm: "Recordatorio activado ✓", mood_popup_later: "Ahora no",
        inactivity_title: "¡Mira quién ha vuelto! 👀", inactivity_body: "¡Te echábamos de menos! Pásate un momento — un poco de entrenamiento de memoria, sin presión 🌱",
        instruction_hint: "Lee dos veces, recuerda mentalmente y continúa",
        method_mind: "Mental", method_write: "Escritura", method_audio: "Voz",
        text_placeholder: "Pega o escribe tu texto...",
        profile_btn: "Perfil",
        profile_title: "Perfil",
        profile_in_progress: "En progreso",
        profile_learned: "Aprendido",
        profile_planned: "Planificado",
        profile_words_tab: "Palabras",
        profile_empty_words: "Aún no hay conjuntos de palabras guardados",
        profile_words_total: "palabras",
        profile_words_mastered: "dominadas",
        profile_words_review: "por repasar",
        wptab_sets: "Por conjuntos",
        wptab_dictionary: "Diccionario",
        wdict_mastered: "Dominadas",
        wdict_review: "En repaso",
        wdict_unlearned: "No aprendidas",
        wdict_search_placeholder: "🔍 Buscar una palabra...",
        wdict_all_topics: "Todos los temas",
        wdict_no_matches: "No se encontraron resultados",
        learned_hero_title: "¡Bien hecho! Esto es lo que ya has aprendido 🌟",
        learned_not_yet: "Aún no aprendido — volver a Progreso",
        learned_group_text_speech: "Texto/discurso", learned_group_poem: "Poemas", learned_group_song: "Canciones",
        learned_cat_text: "Texto", learned_cat_speech: "Discurso", learned_cat_poem: "Poema", learned_cat_song: "Canción",
        learned_group_poem_song: "Poemas/canciones", learned_cat_text_speech: "Texto/discurso", learned_cat_poem_song: "Poema/canción",
        profile_train: "Entrenar",
        profile_select_words: "🎯 Elegir palabras",
        wselect_title: "Elige palabras para entrenar",
        wselect_select_all: "Seleccionar todo",
        wselect_selected: "Seleccionadas: {n}",
        wselect_start_btn: "Entrenar ({n})",
        wselect_diff_lang_toast: "Solo puedes elegir palabras de un par de idiomas a la vez",
        wselect_none_toast: "Elige al menos una palabra",
        profile_empty_progress: "Sin sesión activa",
        progress_empty: "Nada en progreso todavía — pega un texto y empieza a aprender! 🌱",
        progress_stage_all: "Todos",
        progress_stage_start: "🌱 Primeros pasos",
        progress_stage_halfway: "🌿 A mitad de camino!",
        progress_stage_almost: "🌳 Casi lo tienes — un poco más!",
        profile_empty_learned: "Todavía vacío, pero no por mucho tiempo 🌱 Aprende tu primer texto y se instalará aquí.",
        profile_load: "Cargar",
        profile_edit_text: "✎ Editar",
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
        paste_info_title: '¿Cómo añadir el texto?',
        paste_info_body: 'Tres formas — elige la que prefieras:\n\n📋 Copia el texto y simplemente pégalo en el campo.\n\n📄 Toca «Archivo» y sube un documento (doc, txt, pdf) o una captura de pantalla/foto con el texto.\n\n📸 Fotografía el texto con la cámara de tu teléfono y envíalo como archivo — lo reconoceremos automáticamente.',
        wi_placeholder: 'dog — perro\ncat — gato\nto run — correr',
        wi_min_error: 'Por favor añade al menos 2 pares',
        support_title: 'Soporte técnico', support_type_bug: '🐛 Algo no funciona', support_type_idea: '💡 Idea o sugerencia', support_type_compliment: '😻 Elógianos',
        support_placeholder: 'Describe qué pasó o qué te gustaría añadir…', support_placeholder_bug: 'Cuéntanos qué pasó, por favor — lo revisaremos con calma 🛠️', support_placeholder_idea: 'Comparte tu idea — de verdad nos interesa saber qué se puede mejorar 💡', support_placeholder_compliment: 'Dinos algo bonito… lo guardaremos para un mal día 💛', support_submit: 'Enviar',
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
        wt_auto: '✨ Sugerir automáticamente', wt_save: 'Guardar →', wt_save_edit: 'Guardar cambios',
        words_saved: '¡Conjunto guardado!',
        wt_type_w2t: '→ Traducción', wt_type_t2w: '→ Palabra', wt_type_audio: '🔊 Audio',
        wt_listen_prompt: 'Escucha y elige la palabra', wt_listen_btn: 'Escuchar',
        wt_correct: '✓ ¡Correcto!', wt_wrong: 'Ups, inténtalo de nuevo',
        wt_save_word: 'Guardar palabra', wt_skip: 'Omitir', wt_finish: 'Terminar',
        wt_type_spell: '✏️ Escribir', wt_type_dictation: '🎧 Dictado', wt_type_sentence: '📝 Frase', wt_type_speak: '🗣️ Dilo',
        wt_type_match: '🔗 Parejas', wt_type_truefalse: '✓✗ Verdadero o falso', wt_type_listen: '🎧 Escucha y marca',
        wt_match_prompt: 'Empareja las palabras con su traducción', wt_match_mistakes: 'Listo, pero con errores',
        wt_true: '✓ Verdadero', wt_false: '✗ Falso',
        wt_listen_pick_prompt: 'Escucha y marca las palabras que oíste',
        wt_spell_prompt: 'Escribe la palabra en el idioma que aprendes',
        wt_sentence_prompt: 'Completa la palabra que falta',
        wt_sentence_no_examples: 'Todavía no hay frases de ejemplo para estas palabras',
        wt_preparing: 'Preparando ejercicios…',
        wt_dictation_prompt: 'Escucha y escribe la palabra',
        wt_speak_prompt: 'Di esta palabra en el idioma que estás aprendiendo', wt_speak_record: '🎙 Grabar', wt_speak_said: 'Dijiste:',
        wt_check: 'Comprobar', wt_type_placeholder: 'Escribe tu respuesta...', wt_hint: 'Pista',
        wt_wrong_answer_was: 'Correcto:',
        wt_result_perfect: '🌟 ¡Perfecto!', wt_result_great: '🎉 ¡Genial!',
        wt_result_good: '👍 ¡No está mal!', wt_result_keep: '💪 ¡Sigue así!',
        wt_score_label: 'respuestas correctas', wt_restart: 'Otra vez', wt_home: 'Inicio',
        wt_no_trans: 'Añade traducciones para comenzar el entrenamiento',
        wt_resume_confirm: 'Se encontró un entrenamiento sin terminar de este conjunto ({n}/{total}). ¿Continuar donde lo dejaste?',
        mode_title: '¿Qué quieres aprender?',
        mode_text_label: 'Texto', mode_text_desc: 'Poema, discurso, artículo, presentación',
        mode_words_label: 'Palabras y Frases', mode_words_desc: 'Nuevo vocabulario, traducciones, tarjetas',
        // MT-02 (2026-08-15) — режим "Фокуси пам'яті"
        mode_memory_label: 'Trucos de memoria',
        mode_memory_desc: 'Las técnicas que de verdad usan los campeones de memoria',
        mem_subtitle: 'Aquí entrenamos la memoria en sí — ni texto, ni palabras',
        mem_pick_age: 'Elige una edad — a cada edad le funcionan técnicas distintas',
        mem_group_label: 'Ejercicios para la edad',
        mem_ex_intent_title: 'Si-Entonces',
        mem_ex_intent_desc: 'La técnica contra «iba a hacerlo y se me olvidó»',
        mem_ex_intent_full: 'Con tres intenciones basta por ahora. Revísalas y podrás añadir otra',
        mem_worked_count: 'Veces que funcionó: {n} 🌿',
        mem_step: 'Paso {n} de 3',
        mem_q_action: '¿Qué vas a hacer?',
        mem_hint_action: 'Una cosa concreta — de las que se olvidan fácilmente',
        mem_ph_action: 'llamar a mamá',
        mem_q_trigger: '¿Cuándo exactamente vas a acordarte?',
        mem_hint_trigger: 'Algo que seguro vas a notar — un suceso, no «luego»',
        mem_hint_trigger_kid: 'Elige algo que hoy vas a hacer seguro',
        mem_ph_trigger: 'cuando ponga el hervidor',
        mem_q_say: 'Dílo en voz alta — una vez, entero',
        mem_hint_say: 'Decirlo ES la técnica. El cerebro capta el vínculo «veo — hago»',
        mem_formula: 'SI {trigger}, ENTONCES {action}',
        mem_next: 'Siguiente',
        mem_save: 'Listo',
        mem_saved: 'Guardado 🌿',
        mem_need_action: 'Escribe qué vas a hacer',
        mem_need_trigger: 'Elige cuándo exactamente',
        mem_limit: 'Tres intenciones son suficientes. Revísalas primero',
        mem_due_q: '¿Funcionó?',
        mem_due_yes: 'Sí',
        mem_due_no: 'No',
        mem_due_pending: 'Todavía no',
        mem_toast_yes: 'Funcionó 🌿 La técnica hace su trabajo',
        mem_toast_no: 'Pasa. Prueba la misma intención con una señal más visible',
        trg_pencil: 'abra el estuche',
        trg_dinner: 'me siente a cenar',
        trg_shoes: 'me ponga las zapatillas',
        trg_teeth: 'me lave los dientes',
        trg_bag: 'coja la mochila',
        nav_learn: 'Aprender', nav_library: 'Biblioteca', nav_progress: 'Progreso', nav_profile: 'Perfil',
        mode_subtitle: 'Elige una dirección — puedes cambiar en cualquier momento',
        wl_subtitle: 'El idioma que aprendes, y tu idioma natal — para traducción y pronunciación',
        wt_topic_subtitle: 'Un nombre te ayudará a encontrar este conjunto en tu perfil',
        library_title: 'Biblioteca', progress_title: 'Progreso',
        profile_mood: 'Estado de ánimo', profile_about: 'Sobre ti',
        profile_optional_note: 'Todo lo de abajo es totalmente opcional 💛 Rellena lo que quieras, omite el resto.',
        profile_country: 'País', profile_city: 'Ciudad', profile_age: 'Edad', profile_email: 'Correo', profile_birthdate: 'Fecha de nacimiento'
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
const SCREENS = ['langScreen','modeScreen','memoryScreen','memoryIntentScreen','inputScreen','setupScreen','learningScreen','restScreen','sessionPauseScreen','finalScreen','profileScreen','wordProfileScreen','progressScreen','wordSelectScreen','profileIdentityScreen','wordLangScreen','wordInputScreen','wordVerifyScreen','wordTopicScreen','wordTrainingScreen','wordResultsScreen'];
// modeScreen/wordLangScreen/wordTopicScreen додано сюди 2026-08-05 (Playful Premium composition
// pass) — раніше короткий контент цих 3 екранів просто прилипав до верху картки, лишаючи ~50%
// картки порожньою внизу. FLEX_SCREENS вже мав готовий механізм (display:flex + min-height +
// justify-content:center з inline style в index.html) для sessionPauseScreen/finalScreen/
// wordResultsScreen — перевикористано той самий шлях замість винаходу нового.
const FLEX_SCREENS = ['sessionPauseScreen','finalScreen','wordResultsScreen','modeScreen','wordLangScreen','wordTopicScreen'];
// Екрани, на яких видно нижню навігацію (Навчання/Бібліотека/Прогрес/Профіль) — тільки
// hub-екрани верхнього рівня (де раніше була кнопка-аватарка) + самі екрани
// бібліотеки/прогресу/профілю (2026-08-07: розділені на 3 окремі екрани, див. коментар
// над #bottomNav в index.html і D-009 addendum у DECISIONS.md).
// НЕ показується під час активного навчання/тренування (один екран — одна дія, README UX Designer).
const BOTTOM_NAV_SCREENS = ['inputScreen','memoryScreen','profileScreen','wordLangScreen','wordProfileScreen','progressScreen','profileIdentityScreen'];
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
    updateBottomNavVisibility(id);
}

// ----- [UX-01 Bottom nav: Навчання/Бібліотека/Прогрес/Профіль]  (2026-08-05, розділено 2026-08-07) -----
// Одна спільна панель для обох напрямків (Text/Words) — навMode вирішує куди ведуть кнопки,
// а не дублювання розмітки. Див. DECISIONS.md D-009/D-009 addendum для архітектурної
// історії (чому спершу "Прогрес" і "Профіль" вели на один екран, а тепер Бібліотека і
// Прогрес — окремі екрани, а Профіль — лише особисте).
let navContext = 'text';    // 'text' | 'words' — який напрямок зараз активний для навігації
let navActiveTab = 'learn'; // 'learn' | 'library' | 'progress' | 'profile' — яка кнопка підсвічена

function updateBottomNavVisibility(id) {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    const show = BOTTOM_NAV_SCREENS.includes(id);
    nav.style.display = show ? 'flex' : 'none';
    document.body.classList.toggle('nav-visible', show);
    if (show) syncNavFabOffset();
}

// FB-23 (2026-08-09): буфер під FAB/бульбашку підтримки раніше був фіксованим
// 96px, розрахованим на припущену висоту бару ~59.6px (1 рядок тексту). User
// повідомила, що нав-бар все одно перекриває кнопку підтримки — ймовірна
// причина: масштабування шрифту ОС (accessibility "більший текст") розтягує
// `.bottom-nav-item` по висоті понад цей запас, і фіксований буфер його не
// наздоганяє. Тепер висота бару читається напряму з DOM (offsetHeight) замість
// припущення, тож FAB завжди підіймається рівно на nav-висота+18px, незалежно
// від масштабу шрифту, довжини перекладу мітки чи розміру екрана.
function syncNavFabOffset() {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    // Бар тепер full-width і впритул до низу екрана (.bottom-nav bottom:0),
    // тому власного відступу немає — лише видимий проміжок над верхнім краєм бару.
    // Разом: FAB підіймається на nav.offsetHeight + 18px від низу екрана.
    const navBottomOffset = 0;
    const visibleGap = 18;
    document.documentElement.style.setProperty('--nav-fab-offset', (nav.offsetHeight + navBottomOffset + visibleGap) + 'px');
}

window.addEventListener('resize', () => {
    if (document.body.classList.contains('nav-visible')) syncNavFabOffset();
});

function setBottomNav(context, tab) {
    navContext = context;
    navActiveTab = tab;
    renderBottomNav();
}

function renderBottomNav() {
    const t = translations[currentLang];
    const learnLbl = document.getElementById('navLearnLbl');
    const libLbl = document.getElementById('navLibraryLbl');
    const progLbl = document.getElementById('navProgressLbl');
    const profLbl = document.getElementById('navProfileLbl');
    if (learnLbl) learnLbl.innerText = t.nav_learn || 'Навчання';
    if (libLbl) libLbl.innerText = t.nav_library || 'Бібліотека';
    if (progLbl) progLbl.innerText = t.nav_progress || 'Прогрес';
    if (profLbl) profLbl.innerText = t.nav_profile || 'Профіль';
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === navActiveTab);
    });
}

// 2026-08-07: "Бібліотека" і "Прогрес" знову 2 окремі пункти (не дублікати цього разу —
// кожен веде на СВІЙ екран: openProfile/openWordProfile = списки текстів/наборів слів
// (тепер без hero), showProgressScreen = нове, memori_stats, openProfileIdentity = нове,
// лише особисте — hero переїхав туди). Див. коментар над #bottomNav в index.html.
function bottomNavGo(tab) {
    if (navContext === 'words') {
        if (tab === 'learn') showWordLangScreen();
        else if (tab === 'library') openWordProfile(showWordLangScreen, 'progress');
        else if (tab === 'progress') showProgressScreen(showWordLangScreen);
        else openProfileIdentity(showWordLangScreen);
    } else {
        if (tab === 'learn') showInputScreen();
        else if (tab === 'library') openProfile(showInputScreen, 'progress');
        else if (tab === 'progress') showProgressScreen(showInputScreen);
        else openProfileIdentity(showInputScreen);
    }
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
    const memLbl = document.getElementById('modeMemoryLabel');
    const memDsc = document.getElementById('modeMemoryDesc');
    if (memLbl) memLbl.innerText = t.mode_memory_label || "Фокуси пам'яті";
    if (memDsc) memDsc.innerText = t.mode_memory_desc || "Техніки, якими користуються чемпіони з пам'яті";
    const modeSubEl = document.getElementById('modeSubtitleEl');
    if (modeSubEl) modeSubEl.innerText = t.mode_subtitle || '';
    updateThemeToggleFab();
}

function selectMode(mode) {
    if (mode === 'text') {
        showInputScreen();
    } else if (mode === 'memory') {
        openMemoryScreen();
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
    setBottomNav('text', 'learn');
    document.getElementById('roleSubtitle').innerText = t.welcome;
    document.getElementById('ocrBtnLabel').innerText = t.ocr_btn;
    const ocrCancelBtn = document.getElementById('ocrCancelBtn');
    if (ocrCancelBtn) ocrCancelBtn.innerText = t.ocr_cancel || 'Скасувати';
    const savedOcrLang = localStorage.getItem('memori_ocr_lang_pref');
    document.getElementById('ocrLang').value = savedOcrLang || tessLang[currentLang] || 'eng';
    document.getElementById('userText').placeholder = t.text_placeholder;
    document.getElementById('inputLabel').innerText = t.inputLabel;
    const nextBtn = document.getElementById('nextToSetupBtn');
    if (nextBtn) nextBtn.innerText = (t.nextBtn || 'Далі') + ' →';
    checkSavedState();
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
    saveToLibrary(text);
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
// ===== TECH SUPPORT (локально + опційний webhook, див. D-002) =====
// Звернення завжди зберігаються в localStorage цього браузера/пристрою —
// це лишається основним каналом і власною історією User (попап,
// "📋 Скопіювати все"). Локальне сховище per-device: звернення з чужих
// пристроїв User не бачить, поки сама не перевірить той пристрій.
// ДОДАТКОВО (2026-08-05): якщо SUPPORT_WEBHOOK_URL заповнено, кожне
// звернення також fire-and-forget відправляється на Google Apps Script,
// який дописує рядок у Google Sheet User — так вона бачить звернення
// з будь-якого пристрою, не тільки свого. Webhook ніколи не замінює
// localStorage і не блокує UI: мережева помилка/CORS/недеплой — тихо
// ігнорується, збереження і toast відбуваються незалежно від неї.
// Заповнити рядком після деплою Google Apps Script — див. STATUS.md.
const SUPPORT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbw3wQ-gTV7Ye3AlWaeN-P9ay6Ya5ZUabVXcviacwcWCRlx0XARDfYJVQS_ifIIdKfCK1A/exec';
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

// Поки User ще не обрала мову інтерфейсу (на langScreen, currentLang завжди має
// технічне значення-заглушку 'uk' з state.js) — підтримка англійською, бо це
// міжнародна мова і для будь-кого зрозуміліша, ніж вгадана заглушка. Щойно мову
// обрано (setLanguage → showModeScreen), підтримка одразу переходить на неї.
function getSupportLang() {
    return (currentScreenId === 'langScreen' || currentScreenId === null) ? 'en' : currentLang;
}

function openSupportPopup() {
    dismissSupportHint();
    const t = translations[getSupportLang()];
    document.getElementById('supportPopupTitle').innerText = t.support_title || 'Технічна підтримка';
    document.getElementById('supportTypeBugBtn').innerText = t.support_type_bug || '🐛 Щось не працює';
    document.getElementById('supportTypeIdeaBtn').innerText = t.support_type_idea || '💡 Ідея чи побажання';
    document.getElementById('supportTypeComplimentBtn').innerText = t.support_type_compliment || '😻 Похваліть нас';
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

const SUPPORT_TYPE_BTN_IDS = { bug: 'supportTypeBugBtn', idea: 'supportTypeIdeaBtn', compliment: 'supportTypeComplimentBtn' };

function selectSupportType(type, btn) {
    supportType = type;
    document.querySelectorAll('.support-type-btn').forEach(b => b.classList.remove('active'));
    const target = btn || document.getElementById(SUPPORT_TYPE_BTN_IDS[type] || 'supportTypeBugBtn');
    if (target) target.classList.add('active');
    const t = translations[getSupportLang()];
    const textarea = document.getElementById('supportTextarea');
    if (textarea) {
        const placeholders = { bug: t.support_placeholder_bug, idea: t.support_placeholder_idea, compliment: t.support_placeholder_compliment };
        textarea.placeholder = placeholders[type] || t.support_placeholder || 'Опишіть, що сталося або що хотіли б додати…';
    }
}

function getSupportMessages() {
    try { return JSON.parse(localStorage.getItem('memori_support') || '[]'); }
    catch { return []; }
}

function submitSupportMessage() {
    const supportLang = getSupportLang();
    const t = translations[supportLang];
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
        lang: supportLang,
        createdAt: new Date().toISOString(),
    });
    localStorage.setItem('memori_support', JSON.stringify(list));
    // Додатковий канал (не заміна localStorage) — fire-and-forget, ніколи
    // не блокує UI і не показує помилку користувачу, якщо мережа/webhook недоступні.
    if (SUPPORT_WEBHOOK_URL !== '') {
        try {
            fetch(SUPPORT_WEBHOOK_URL, {
                method: 'POST',
                body: JSON.stringify({ type: supportType, text, screen: currentScreenId, lang: supportLang, createdAt: new Date().toISOString() }),
            }).catch(() => {});
        } catch {}
    }
    textarea.value = '';
    document.getElementById('supportValidation').style.display = 'none';
    showMotivToast(t.support_thanks || 'Дякую! Побачу це під час наступного оновлення.');
    renderSupportHistory();
}

const SUPPORT_TYPE_ICON = { bug: '🐛', idea: '💡', compliment: '😻' };
const SUPPORT_TYPE_TAG = { bug: 'BUG', idea: 'IDEA', compliment: 'COMPLIMENT' };

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
                <span>${SUPPORT_TYPE_ICON[m.type] || '💬'}</span>
                <span>${new Date(m.createdAt).toLocaleString(currentLang)}</span>
                <button type="button" class="support-history-delete" onclick="deleteSupportMessage('${m.id}')" aria-label="Delete">×</button>
            </div>
            <div class="support-history-text">${escHtml(m.text)}</div>
        </div>
    `).join('');
}

function deleteSupportMessage(id) {
    localStorage.setItem('memori_support', JSON.stringify(getSupportMessages().filter(m => m.id !== id)));
    renderSupportHistory();
}

function copyAllSupportMessages() {
    const t = translations[currentLang];
    const list = getSupportMessages();
    if (!list.length) return;
    const text = list.map(m =>
        `[${SUPPORT_TYPE_TAG[m.type] || 'MSG'}] ${new Date(m.createdAt).toLocaleString()} — ${m.screen || '?'}\n${m.text}`
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
    ctx.fillText('Everlea', 48, 66);

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
                await navigator.share({ files: [file], title: 'Everlea', text: shareText });
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

// 2026-08-07 (re-split): profileScreen тепер ЛИШЕ "Вивчено" — В роботі/Плани
// переїхали в progressScreen (showProgressScreen нижче), бо User: розподіл
// Бібліотека/Прогрес мав бути "в роботі + плани" в Прогресі, а Бібліотека =
// лише завершене. Один список без вкладок — renderLearnedLibrary() нижче.
// focus-параметр історичний (D-009/D-009 addendum у DECISIONS.md) — нема куди
// скролити, сигнатура лишена незмінною, щоб не ламати виклик bottomNavGo('library').
function openProfile(returnFn, focus) {
    profileReturnFn = typeof returnFn === 'function' ? returnFn : showInputScreen;
    showScreen('profileScreen');
    const t = translations[currentLang];
    document.getElementById('profileBackLabel').innerText = t.back_lang || 'Назад';
    const titleEl = document.getElementById('libraryTitleEl');
    if (titleEl) titleEl.innerText = t.library_title || 'Бібліотека';
    renderLearnedLibrary();
    updateProfileNavAvatar();
    setBottomNav('text', 'library');
}

function closeProfile() {
    (profileReturnFn || showInputScreen)();
}

// ----- [Progress screen]  (2026-08-07, розділено; re-split того ж дня: тепер БЕЗ
// статистики — User попросила прибрати memori_stats з UI зовсім, не переносити.
// FB-41 (2026-08-11, User): "плани не потрібні" — 2 таби В роботі/Плани злиті в
// ОДИН список (renderTextProgress нижче): усе, що ще не досягло
// TEXT_MASTERY_THRESHOLD проходжень (state.js), з творчою позначкою стадії.
// Words-контекст: 1 секція "За наборами" (переїхала з wordProfileScreen), без
// вкладок — немає "плани"-еквіваленту для окремих слів. -----
let progressReturnFn = null;
// FB-38 (2026-08-11): мовний фільтр для об'єднаного списку Прогресу — null = 🌐 Всі.
let progressLangFilter = null;
function setProgressLangFilter(code) {
    progressLangFilter = code;
    renderTextProgress('progressContent');
}
// (2026-08-12, User): стадія проходження (🌱/🌿/🌳, вже показана як бейдж на
// кожній картці) винесена окремим рядком чіпів під мовним фільтром — той самий
// renderLangFilterBar-патерн (.lang-filter-bar/.lang-filter-chip), null = усі стадії.
let progressStageFilter = null;
function setProgressStageFilter(stage) {
    progressStageFilter = stage;
    renderTextProgress('progressContent');
}
const PROGRESS_STAGE_ORDER = ['start', 'halfway', 'almost'];
function renderStageFilterBar(activeStage, availableStages, stageMeta) {
    const t = translations[currentLang];
    const present = PROGRESS_STAGE_ORDER.filter(s => availableStages.includes(s));
    if (present.length < 2) return ''; // нема сенсу фільтрувати, якщо всі записи в одній стадії
    const chip = (val, label) => `<button class="lang-filter-chip${activeStage === val ? ' active' : ''}" onclick="setProgressStageFilter(${val === null ? 'null' : `'${val}'`})">${label}</button>`;
    return `<div class="lang-filter-bar">${chip(null, t.progress_stage_all || 'Усі')}${present.map(s => chip(s, stageMeta[s].label)).join('')}</div>`;
}

function showProgressScreen(returnFn) {
    progressReturnFn = typeof returnFn === 'function' ? returnFn : showInputScreen;
    showScreen('progressScreen');
    const t = translations[currentLang];
    document.getElementById('progressBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('progressTitleEl').innerText = t.progress_title || 'Прогрес';
    setBottomNav(navContext, 'progress');
    if (navContext === 'words') {
        renderWordProfileList('progressContent');
    } else {
        renderTextProgress('progressContent');
    }
}

function closeProgressScreen() {
    (progressReturnFn || showInputScreen)();
}

// ----- [Profile Identity screen]  (2026-08-07, nav split) -----
// ЛИШЕ особисте: ім'я/фото (renderProfileHero, без змін логіки) + настрій (FB-14,
// простий toggle без історії) + країна/місто/вік/пошта (усі необов'язкові, без
// валідації). Спільний для Text і Words — та сама людина, той самий memori_profile.
let identityReturnFn = null;

function openProfileIdentity(returnFn) {
    identityReturnFn = typeof returnFn === 'function' ? returnFn : showInputScreen;
    showScreen('profileIdentityScreen');
    const t = translations[currentLang];
    document.getElementById('identityBackLabel').innerText = t.back_lang || 'Назад';
    document.getElementById('identityTitleEl').innerText = t.profile_title || 'Профіль';
    const aboutLbl = document.getElementById('profileAboutLabel');
    const emailLbl = document.getElementById('profileEmailLabel');
    const optionalNoteLbl = document.getElementById('profileOptionalNote');
    if (optionalNoteLbl) optionalNoteLbl.innerText = t.profile_optional_note || '';
    if (aboutLbl) aboutLbl.innerText = t.profile_about || 'Про тебе';
    if (emailLbl) emailLbl.innerText = t.profile_email || 'Пошта';
    const countryEl = document.getElementById('profileCountryInput');
    const cityEl = document.getElementById('profileCityInput');
    const ageEl = document.getElementById('profileAgeInput');
    const emailEl = document.getElementById('profileEmailInput');
    if (countryEl) countryEl.placeholder = t.profile_country || 'Країна';
    if (cityEl) cityEl.placeholder = t.profile_city || 'Місто';
    if (ageEl) ageEl.placeholder = (t.profile_birthdate || 'Дата народження') + ' (ДД.ММ.РРРР)';
    if (emailEl) emailEl.placeholder = t.profile_email || 'Пошта';
    renderProfileHero();
    renderProfileIdentityFields();
    updateProfileNavAvatar();
    setBottomNav(navContext, 'profile');
}

function closeProfileIdentity() {
    (identityReturnFn || showInputScreen)();
}

function renderProfileIdentityFields() {
    const profile = loadProfile();
    const countryEl = document.getElementById('profileCountryInput');
    const cityEl = document.getElementById('profileCityInput');
    const ageEl = document.getElementById('profileAgeInput');
    const emailEl = document.getElementById('profileEmailInput');
    if (countryEl) countryEl.value = profile.country || '';
    if (cityEl) cityEl.value = profile.city || '';
    if (ageEl) ageEl.value = formatBirthdateForDisplay(profile.birthdate);
    if (emailEl) emailEl.value = profile.email || '';
    renderProfileAgeDisplay(profile.birthdate);
}

function renderProfileAgeDisplay(birthdateStr) {
    const disp = document.getElementById('profileAgeDisplay');
    if (!disp) return;
    const age = calcAge(birthdateStr);
    disp.innerText = age === null ? '' : `· ${age}`;
}

function saveProfileAbout(field, input) {
    const profile = loadProfile();
    if (field === 'birthdate') {
        const iso = parseBirthdateInput(input.value);
        profile.birthdate = iso; // null (нерозпізнаний формат/порожньо) — просто не зберігаємо
        input.value = formatBirthdateForDisplay(iso);
        saveProfile(profile);
        renderProfileAgeDisplay(iso);
        return;
    }
    const maxLen = field === 'email' ? 80 : 60;
    profile[field] = input.value.trim().slice(0, maxLen);
    saveProfile(profile);
}

// FB-41 (2026-08-11, User): "плани не потрібні" — колишні 2 таби В роботі/Плани
// злиті в ОДИН список. Кожен запис Плани (loadLibrary, state.js) тепер несе
// passCount (скільки повних проходжень уже було) — TEXT_MASTERY_THRESHOLD
// проходжень і запис сам переїжджає в Learned (registerTextPass, state.js).
// Тут — лише відображення поточної стадії з творчим підписом, замість дублю
// "В роботі"/"Плани" з різними списками для того самого тексту.
function textProgressStage(entry, activeState) {
    const passCount = entry.passCount || 0;
    if (passCount >= 1) return 'almost'; // ще один прохід — і вивчено
    if (activeState && activeState.rawText === entry.text && activeState.blocks && activeState.blocks.length) {
        const pct = (activeState.newBlocksShown || 0) / activeState.blocks.length;
        if (pct >= 0.5) return 'halfway';
    }
    return 'start';
}

function renderTextProgress(containerId) {
    const container = document.getElementById(containerId || 'progressContent');
    if (!container) return;
    const t = translations[currentLang];
    const deleteSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;

    const activeState = loadState();
    const allLib = loadLibrary();
    // Захисний фолбек: активна сесія завжди мала б уже бути в Плани (saveToLibrary
    // при goToSetup), але якщо запис звідкись зник (напр. видалений вручну в іншій
    // вкладці) — не ховати активний прогрес, показати синтетичний запис.
    const entries = activeState && activeState.rawText && !allLib.find(e => e.text === activeState.rawText)
        ? [{ id: '__active__', title: (activeState.rawText || '').replace(/\n/g, ' ').slice(0, 70), text: activeState.rawText, savedAt: activeState.savedAt, lang: null, passCount: 0 }, ...allLib]
        : allLib;

    if (entries.length === 0) {
        container.innerHTML = `<p class="profile-empty">${t.progress_empty || 'Ще нічого не в роботі — встав текст на головному екрані 🌱'}</p>`;
        return;
    }

    const stageMeta = {
        start:   { cls: 'stage-start',   label: t.progress_stage_start   || '🌱 Перші кроки' },
        halfway: { cls: 'stage-halfway', label: t.progress_stage_halfway || '🌿 На півдорозі!' },
        almost:  { cls: 'stage-almost',  label: t.progress_stage_almost  || '🌳 Ще трішки — і вивчено!' },
    };

    const availableLangs = [...new Set(entries.map(e => e.lang).filter(Boolean))];
    const langFilterBar = renderLangFilterBar(progressLangFilter, availableLangs, 'setProgressLangFilter');
    const byLang = progressLangFilter ? entries.filter(e => e.lang === progressLangFilter) : entries;

    const withStage = byLang.map(entry => ({ entry, stage: textProgressStage(entry, activeState) }));
    const availableStages = [...new Set(withStage.map(x => x.stage))];
    const stageFilterBar = renderStageFilterBar(progressStageFilter, availableStages, stageMeta);
    const filterBar = langFilterBar + stageFilterBar;
    const filtered = (progressStageFilter ? withStage.filter(x => x.stage === progressStageFilter) : withStage).map(x => x.entry);

    if (filtered.length === 0) {
        container.innerHTML = filterBar + `<p class="profile-empty">${t.progress_empty || 'Ще нічого не в роботі — встав текст на головному екрані 🌱'}</p>`;
        return;
    }

    const hint = `<p class="profile-list-hint">${t.lib_rename_hint || 'Натисніть на назву щоб перейменувати'}</p>`;
    container.innerHTML = filterBar + hint + filtered.map(entry => {
        const isActive = activeState && activeState.rawText === entry.text;
        const rawTitle = entry.customTitle || entry.title;
        const title = rawTitle.length > 60 ? rawTitle.slice(0, 60) + '…' : rawTitle;
        const date = new Date(entry.savedAt).toLocaleDateString();
        const flag = LANG_FLAGS[entry.lang] || '';
        const stage = stageMeta[textProgressStage(entry, activeState)];
        const isSynthetic = entry.id === '__active__';
        const mainBtn = isActive
            ? `<button class="btn-profile-action" onclick="profileContinue()">${t.resume_continue || 'Продовжити'}</button>`
            : `<button class="btn-profile-action" onclick="profileLoadText('${entry.id}')">${t.profile_load || 'Завантажити'}</button>`;
        const editBtn = isSynthetic ? '' : `<button class="btn-profile-action btn-profile-ghost" onclick="editPlannedText('${entry.id}')">${t.profile_edit_text || '✎ Редагувати'}</button>`;
        const deleteBtn = isSynthetic
            ? `<button class="btn-profile-delete" onclick="profileDiscardProgress()">${deleteSvg}</button>`
            : `<button class="btn-profile-delete" onclick="profileDeletePlanned('${entry.id}')">${deleteSvg}</button>`;
        return `<div class="profile-item" id="lib-item-${entry.id}">
          <div class="profile-item-body" ${isSynthetic ? '' : `onclick="startRenameLibEntry('${entry.id}')"`}>
            <span class="progress-stage-badge ${stage.cls}">${stage.label}</span>
            <div class="profile-item-title" id="lib-title-${entry.id}">${flag ? flag + ' ' : ''}${escHtml(title)}</div>
            <div class="profile-item-meta">${date}</div>
          </div>
          <div class="profile-item-actions">
            ${mainBtn}
            ${editBtn}
            ${deleteBtn}
          </div>
        </div>`;
    }).join('');
}

// ===== "ВИВЧЕНО" (profileScreen, Бібліотека, Text-контекст) =====
// FB-22 (2026-08-08): звели до 2 категорій — "Текст/промова" і "Вірш/пісня" —
// АВТО-визначених за римою (detectHasRhyme, нижче) при addToLearned() (state.js),
// замість попередніх 4 значень, які ставились вручну (2026-08-07: "вгадати
// автоматично неможливо" — рішення переглянуте User 2026-08-08). Старі записи
// зі значеннями 'text'/'speech'/'poem'/'song' і далі коректно читаються —
// normalizeLearnedCategory() мапить legacy-значення на нові 2 категорії
// (дані не мігруються, лише трактуються на льоту). Ручний перевибір
// (changeLearnedCategory) лишається доступним — евристика рими недосконала,
// виправити одним кліком простіше, ніж намагатись розпізнати ідеально.
const LEARNED_CATEGORIES = ['text_speech', 'poem_song'];

function normalizeLearnedCategory(raw) {
    if (raw === 'poem' || raw === 'song' || raw === 'poem_song') return 'poem_song';
    return 'text_speech'; // 'text' | 'speech' | 'text_speech' | відсутнє/легасі
}

// FB-38 (2026-08-11): мовний фільтр для "Вивчено" — null = 🌐 Всі.
let learnedLangFilter = null;
function setLearnedLangFilter(code) {
    learnedLangFilter = code;
    renderLearnedLibrary();
}
// FB-41 (2026-08-11, User): "в бібліотеці... фільтр про мові та по слову/словах" —
// той самий пошук-патерн, що вже є в Словнику слів (updateWdictSearch, words.js).
let learnedSearch = '';
function updateLearnedSearch(value) {
    learnedSearch = value;
    renderLearnedLibrary();
    const inp = document.getElementById('learnedSearchInput');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

function renderLearnedLibrary() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    const t = translations[currentLang];
    const allArr = loadLearned();
    if (allArr.length === 0) {
        container.innerHTML = `<p class="profile-empty">${t.profile_empty_learned || 'Ще нічого не вивчено'}</p>`;
        return;
    }
    const availableLangs = [...new Set(allArr.map(e => e.lang).filter(Boolean))];
    const filterBar = renderLangFilterBar(learnedLangFilter, availableLangs, 'setLearnedLangFilter');
    const q = learnedSearch.trim().toLowerCase();
    let arr = learnedLangFilter ? allArr.filter(e => e.lang === learnedLangFilter) : allArr;
    if (q) arr = arr.filter(e => (e.customTitle || e.title || '').toLowerCase().includes(q) || (e.text || '').toLowerCase().includes(q));
    const searchBar = allArr.length > 3
        ? `<input type="text" id="learnedSearchInput" class="word-dict-search" placeholder="${t.wdict_search_placeholder || '🔍 Пошук слова...'}" value="${escHtml(learnedSearch)}" oninput="updateLearnedSearch(this.value)">`
        : '';
    const deleteSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
    const undoSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7"/></svg>`;

    const groups = { text_speech: [], poem_song: [] };
    arr.forEach(entry => groups[normalizeLearnedCategory(entry.category)].push(entry));

    const catOptions = entry => {
        const cat = normalizeLearnedCategory(entry.category);
        return LEARNED_CATEGORIES.map(val => {
            const labelKey = 'learned_cat_' + val;
            return `<option value="${val}"${cat === val ? ' selected' : ''}>${escHtml(t[labelKey] || val)}</option>`;
        }).join('');
    };

    const renderItem = entry => {
        const title = entry.title.length > 60 ? entry.title.slice(0, 60) + '…' : entry.title;
        const date = new Date(entry.completedAt).toLocaleDateString();
        const flag = LANG_FLAGS[entry.lang] || '';
        return `<div class="profile-item profile-item-learned">
          <div class="profile-item-body">
            <div class="profile-item-title">${flag ? flag + ' ' : ''}${escHtml(title)}</div>
            <div class="profile-item-meta">${date} · ${entry.blockCount} ${t.finish_blocks || 'блоків'}</div>
          </div>
          <div class="profile-item-learned-row2">
            <select class="learned-cat-select" onchange="changeLearnedCategory(${entry.id}, this.value)">${catOptions(entry)}</select>
            <div class="profile-item-actions">
              <button class="btn-profile-action btn-profile-ghost" onclick="profileLearnAgain(${entry.id})">${t.finish_restart || 'Знову'}</button>
              <button class="btn-profile-action btn-profile-ghost" title="${t.learned_not_yet || 'Ще не вивчено — повернути в Прогрес'}" onclick="demoteLearnedEntry(${entry.id}); renderLearnedLibrary();">${undoSvg}</button>
              <button class="btn-profile-delete" onclick="profileDeleteLearned(${entry.id})">${deleteSvg}</button>
            </div>
          </div>
        </div>`;
    };

    const renderGroup = (label, rows) => rows.length ? `<div class="word-dict-group">
        <div class="word-dict-group-title">${escHtml(label)}<span class="word-dict-count">${rows.length}</span></div>
        ${rows.map(renderItem).join('')}
      </div>` : '';

    const hero = `<p class="learned-hero-title">${escHtml(t.learned_hero_title || 'Молодець, ось що вже вивчено! 🌟')}</p>`;
    if (arr.length === 0) {
        container.innerHTML = filterBar + searchBar + hero + `<p class="profile-empty">${t.wdict_no_matches || 'Нічого не знайдено'}</p>`;
        return;
    }
    container.innerHTML = filterBar + searchBar + hero +
        renderGroup(t.learned_group_text_speech || 'Текст/промова', groups.text_speech) +
        renderGroup(t.learned_group_poem_song || 'Вірші/пісні', groups.poem_song);
}

// FB-22 (2026-08-08): груба евристика рими для авто-категоризації "Вивчено" —
// НЕ лінгвістичний/фонетичний аналіз (для цього потрібен словник вимови на
// 6 мов), лише збіг закінчень рядків (останні 2 символи останнього слова
// кожного непорожнього рядка, без пунктуації) — той самий клас компромісу,
// що й pickSentenceForLevel (words.js): орієнтир, не точна оцінка. Перевіряє
// і сусідні рядки (схема AABB), і через рядок (ABAB) — дві найпоширеніші
// римувальні схеми. Поріг: мінімум 2 пари, що "римуються" за цією евристикою,
// і мінімум 3 значущі рядки — інакше вважаємо звичайним текстом/промовою.
// Хибні спрацювання виправні вручну (changeLearnedCategory) — не критично.
// Поріг навмисно низький (1 пара, не 2) — орфографічна нерегулярність
// англійської (high/sky звучать римовано, пишуться геть по-різному) означає,
// що навіть у справжньому вірші/пісні друга пара часто НЕ збігається за цією
// евристикою; вимога 2 пар пропускала занадто багато реальних віршів.
function learnedLineEnding(line) {
    const words = line.trim().replace(/[.,!?;:"'()—–…]/g, '').split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    let last = words[words.length - 1].toLowerCase();
    // Груба нормалізація "німого" e (care/name/like) — без цього кроку
    // орфографічно різні, але римовані закінчення (напр. англ. "star"/"care")
    // не збіглись би взагалі. Стосується здебільшого англійської; для решти
    // 5 мов цей патерн (приголосна+e в кінці слова) трапляється рідше і
    // нешкідливо, якщо збіг все одно не знайдеться.
    if (last.length >= 3 && last.endsWith('e') && !/[aeiouy]/.test(last[last.length - 2])) {
        last = last.slice(0, -1);
    }
    return last.length >= 2 ? last.slice(-2) : last;
}

function detectHasRhyme(text) {
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) return false;
    const endings = lines.map(learnedLineEnding);
    let rhymingPairs = 0;
    for (let i = 0; i < endings.length - 1; i++) {
        if (endings[i] && endings[i] === endings[i + 1]) rhymingPairs++; // AABB — сусідні рядки
        if (i < endings.length - 2 && endings[i] && endings[i] === endings[i + 2]) rhymingPairs++; // ABAB — через рядок
    }
    return rhymingPairs >= 1;
}

function changeLearnedCategory(id, category) {
    if (!LEARNED_CATEGORIES.includes(category)) return;
    const arr = loadLearned();
    const entry = arr.find(e => e.id === id);
    if (!entry) return;
    entry.category = category;
    saveLearned(arr);
    renderLearnedLibrary();
}

// ----- [app: profile text actions (continue/discard/learnAgain/deleteLearned/loadText/deletePlanned)]  (was app.js lines 3510-3549) -----
// 2026-08-07 (re-split): "В роботі"/"Плани" тепер живуть на progressScreen, тому
// continue/loadText ховають #progressScreen (не #profileScreen). "Вивчено" лишається
// на profileScreen (Бібліотека) — learnAgain/deleteLearned без змін цього боку.
function profileContinue() {
    document.getElementById('progressScreen').style.display = 'none';
    resumeSession();
}

function profileDiscardProgress() {
    clearState();
    renderTextProgress('progressContent');
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
    renderLearnedLibrary();
}

function profileLoadText(id) {
    // String(): id тепер рядок (Date.now()+'-'+random, після фіксу колізії id),
    // але записи, збережені ДО цього фіксу, можуть мати старий числовий id —
    // порівнюємо як рядки, щоб працювало для обох форматів.
    const entry = loadLibrary().find(e => String(e.id) === String(id));
    if (!entry) return;
    document.getElementById('progressScreen').style.display = 'none';
    showInputScreen();
    document.getElementById('userText').value = entry.text;
}

function profileDeletePlanned(id) {
    const entry = loadLibrary().find(e => String(e.id) === String(id));
    // Захист: якщо запис, що видаляється, — водночас активна сесія (STATE_KEY),
    // чистимо і її — інакше лишається "осиротіла" резюмована сесія на текст,
    // якого вже нема в Прогресі (24h auto-resume міг би її повернути нізвідки).
    if (entry) {
        const s = loadState();
        if (s && s.rawText === entry.text) clearState();
    }
    saveLibrary(loadLibrary().filter(e => String(e.id) !== String(id)));
    updateLibraryCount();
    renderTextProgress('progressContent');
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
        renderTextProgress('progressContent');
    }

    input.onblur = save;
    input.onkeydown = e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.value = currentTitle; input.blur(); }
    };
}

// FB-35 (2026-08-11, User): "прямо в списку" — редагування ВМІСТУ тексту (не лише
// назви, як startRenameLibEntry вище) inline, без переходу на окремий екран.
// Замінює тіло+дії картки на textarea + ✓/✕ (той самий іконно-кнопковий патерн,
// що й chip-save-btn/chip-delete-btn у editWordChip, words.js).
function editPlannedText(id) {
    const item = document.getElementById('lib-item-' + id);
    if (!item || item.classList.contains('editing-text')) return;
    const lib = loadLibrary();
    const entry = lib.find(e => String(e.id) === String(id));
    if (!entry) return;
    const t = translations[currentLang];
    item.classList.add('editing-text');
    item.innerHTML = `
        <textarea class="lib-edit-textarea">${escHtml(entry.text)}</textarea>
        <div class="profile-item-actions">
            <button class="chip-save-btn" onclick="savePlannedTextEdit('${id}')">✓</button>
            <button class="chip-delete-btn" onclick="renderTextProgress('progressContent')">✕</button>
        </div>`;
    const ta = item.querySelector('.lib-edit-textarea');
    ta.focus();
}

function savePlannedTextEdit(id) {
    const item = document.getElementById('lib-item-' + id);
    const ta = item ? item.querySelector('.lib-edit-textarea') : null;
    if (!ta) return;
    const newText = ta.value.trim();
    if (!newText) { renderTextProgress('progressContent'); return; }
    const lib = loadLibrary();
    const idx = lib.findIndex(e => String(e.id) === String(id));
    if (idx >= 0) {
        lib[idx].text = newText;
        // Автозаголовок оновлюється лише якщо User не задавала свій вручну
        // (customTitle) — той самий принцип, що й у profileLearnAgain нижче:
        // явний ручний вибір не затирається автоматикою.
        if (!lib[idx].customTitle) lib[idx].title = newText.replace(/\n/g, ' ').slice(0, 70);
        saveLibrary(lib);
    }
    renderTextProgress('progressContent');
}

// ===== BOOT-TIME AUTO-RESUME (24h) =====
// User: "закрив вкладку посеред навчання — хочу, щоб при відкритті протягом
// 24 год додаток сам продовжив з того ж місця, ніби я нікуди не виходив".
// Тому на старті додатку, ще до першого показу langScreen, перевіряємо
// збережений прогрес (Text Mode: STATE_KEY / Words Mode: WT_PROGRESS_KEY,
// обидва тепер тримають дані лише 24 год — state.js) і одразу заходимо в
// нього, без банера/діалогу з підтвердженням. Це безпечно саме тому, що на
// learningScreen і wordTrainingScreen тепер завжди є кнопка "назад"/"на
// головну" — вихід з автовідновленої сесії завжди під рукою.
function checkAppBootResume() {
    const textSaved = loadState();
    const wordSaved = loadWtProgress();
    if (!textSaved && !wordSaved) return;

    if (textSaved && (!wordSaved || textSaved.savedAt >= wordSaved.savedAt)) {
        resumeSession();
        return;
    }
    if (wordSaved) {
        const set = loadWordSets().find(s => s.id === wordSaved.setId);
        if (!set) return;
        if (wordSaved.lang) currentLang = wordSaved.lang;
        applyWtSavedProgress(set, wordSaved);
    }
}
checkAppBootResume();
checkInactivityPopup();



// ===== [A3] Фокуси пам'яті — екрани режиму (MT-02, 2026-08-15) =====
// Третій режим: тренуємо саму пам'ять, а не матеріал. Стан — state.js [S3].
// Правила, реалізовані тут, які НЕ можна тихо прибрати при рефакторингу:
//   • 5-7 років — прогрес за виконанням техніки, без балів (utilization deficiency)
//   • тригер "якщо-то" для 5-9 — тільки з готового списку фізичних подій
//   • максимум 3 активні наміри: ми тренуємо формулу, а не ведемо список справ
// Джерела — _manager/MEMORY-TRAINING-RESEARCH.md, правила — AGENTS/memory-trainer/

// Готові фізичні тригери для 5-9. Саме фізичні, бо дитині потрібна помітна подія,
// а не контекст ("коли будеш у школі" не спрацює, "коли відкриєш пенал" спрацює).
const MEM_KID_TRIGGERS = ['trg_pencil', 'trg_dinner', 'trg_shoes', 'trg_teeth', 'trg_bag'];

let memIntentDraft = { text: '', trigger: '', step: 1 };

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
    document.getElementById('memSubtitle').innerText = group
        ? (t.mem_subtitle || '')
        : (t.mem_pick_age || '');
    document.getElementById('memGroupLabel').innerText = t.mem_group_label || '';

    const chips = MEMORY_GROUPS.map(g =>
        '<button class="mem-chip' + (g === group ? ' active' : '') + '" onclick="pickMemoryGroup(\'' + g + '\')">' + g + '</button>'
    ).join('');
    document.getElementById('memGroupChips').innerHTML = chips;

    renderMemoryDue();
    renderMemoryExercises(group);

    // Свідомо БЕЗ відсотків і без порівняння з нормою (Правило №4 агента).
    // Показуємо лише скільки разів формула спрацювала — заохочення, не оцінка.
    const st = getMemoryStats();
    document.getElementById('memFoot').innerText =
        st.worked > 0 ? (t.mem_worked_count || '').replace('{n}', st.worked) : '';
}

function pickMemoryGroup(g) {
    setMemoryGroup(g);
    renderMemoryScreen();
}

function renderMemoryExercises(group) {
    const t = translations[currentLang] || translations.en;
    const wrap = document.getElementById('memExerciseList');
    if (!group) { wrap.innerHTML = ''; return; }
    const full = getActiveIntentions().length >= MEMORY_MAX_INTENTIONS;
    // Перший реліз — одна вправа. Розмітка навмисно узагальнена, щоб наступні
    // (ланцюжок-історія, палац пам'яті) додавались рядком, а не переписуванням.
    wrap.innerHTML =
        '<button class="mem-ex-card' + (full ? ' disabled' : '') + '" ' + (full ? 'disabled' : '') + ' onclick="startIntentExercise()">' +
          '<div class="mem-ex-icon">🔗</div>' +
          '<div class="mem-ex-body">' +
            '<div class="mem-ex-title">' + escHtml(t.mem_ex_intent_title || '') + '</div>' +
            '<div class="mem-ex-desc">' + escHtml(full ? (t.mem_ex_intent_full || '') : (t.mem_ex_intent_desc || '')) + '</div>' +
          '</div>' +
        '</button>';
}

function renderMemoryDue() {
    const t = translations[currentLang] || translations.en;
    const wrap = document.getElementById('memDueWrap');
    const due = getIntentionsDueCheck();
    if (!due.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
    wrap.style.display = 'block';
    wrap.innerHTML = due.map(i =>
        '<div class="mem-due-card">' +
          '<div class="mem-due-q">' + escHtml(t.mem_due_q || '') + '</div>' +
          '<div class="mem-due-phrase">' + escHtml(memIntentPhrase(i.trigger, i.text)) + '</div>' +
          '<div class="mem-due-actions">' +
            '<button class="btn-small" onclick="answerIntent(\'' + i.id + '\',\'yes\')">' + escHtml(t.mem_due_yes || '') + '</button>' +
            '<button class="btn-small" onclick="answerIntent(\'' + i.id + '\',\'no\')">' + escHtml(t.mem_due_no || '') + '</button>' +
            '<button class="btn-ghost" onclick="answerIntent(\'' + i.id + '\',\'pending\')">' + escHtml(t.mem_due_pending || '') + '</button>' +
          '</div>' +
        '</div>').join('');
}

function answerIntent(id, result) {
    const t = translations[currentLang] || translations.en;
    checkIntention(id, result);
    if (result === 'yes') showMotivToast(t.mem_toast_yes || '');
    // 🔴 Тон на "Ні" — без докору: проблема в тригері, не в людині. Одноразового
    // формулювання доказово мало, тому пропонуємо переформулювати, а не картаємо.
    if (result === 'no') showMotivToast(t.mem_toast_no || '');
    renderMemoryScreen();
}

function memIntentPhrase(trigger, text) {
    const t = translations[currentLang] || translations.en;
    const trg = MEM_KID_TRIGGERS.indexOf(trigger) !== -1 ? (t[trigger] || trigger) : trigger;
    return (t.mem_formula || 'IF {trigger}, THEN {action}')
        .replace('{trigger}', trg).replace('{action}', text);
}

// ---- Вправа "Якщо-то": 3 кроки на одному екрані ----

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
    const stepLbl = (n) => escHtml((t.mem_step || 'Крок {n} з 3').replace('{n}', n));

    if (memIntentDraft.step === 1) {
        body.innerHTML =
            '<p class="mem-step-num">' + stepLbl(1) + '</p>' +
            '<p class="mem-step-q">' + escHtml(t.mem_q_action || '') + '</p>' +
            '<p class="mem-step-hint">' + escHtml(t.mem_hint_action || '') + '</p>' +
            '<input id="memIntentText" class="mem-input" maxlength="60" placeholder="' + escHtml(t.mem_ph_action || '') + '" />' +
            '<button class="btn-start-main" onclick="intentNext()">' + escHtml(t.mem_next || '') + '</button>';
        const inp = document.getElementById('memIntentText');
        inp.value = memIntentDraft.text;
        inp.focus();
        return;
    }

    if (memIntentDraft.step === 2) {
        // 5-9 — тільки готові фізичні тригери. 10+ — свій, бо вже здатні самі
        // оцінити, що вони точно помітять.
        const opts = kidMode
            ? MEM_KID_TRIGGERS.map(k =>
                '<button class="mem-trg-btn' + (memIntentDraft.trigger === k ? ' active' : '') + '" onclick="pickTrigger(\'' + k + '\')">' + escHtml(t[k] || k) + '</button>').join('')
            : '<input id="memIntentTrigger" class="mem-input" maxlength="60" placeholder="' + escHtml(t.mem_ph_trigger || '') + '" />';
        body.innerHTML =
            '<p class="mem-step-num">' + stepLbl(2) + '</p>' +
            '<p class="mem-step-q">' + escHtml(t.mem_q_trigger || '') + '</p>' +
            '<p class="mem-step-hint">' + escHtml(kidMode ? (t.mem_hint_trigger_kid || '') : (t.mem_hint_trigger || '')) + '</p>' +
            '<div class="mem-trg-list">' + opts + '</div>' +
            '<button class="btn-start-main" onclick="intentNext()">' + escHtml(t.mem_next || '') + '</button>';
        const ti = document.getElementById('memIntentTrigger');
        if (ti) { ti.value = memIntentDraft.trigger; ti.focus(); }
        return;
    }

    // Крок 3 — проговорити повну фразу. Це і Є саме кодування наміру, а не
    // підсумковий екран: тому фраза велика й окремо, а не дрібним рядком.
    body.innerHTML =
        '<p class="mem-step-num">' + stepLbl(3) + '</p>' +
        '<p class="mem-step-q">' + escHtml(t.mem_q_say || '') + '</p>' +
        '<div class="mem-formula">' + escHtml(memIntentPhrase(memIntentDraft.trigger, memIntentDraft.text)) + '</div>' +
        '<p class="mem-step-hint">' + escHtml(t.mem_hint_say || '') + '</p>' +
        '<button class="btn-start-main" onclick="saveIntent()">' + escHtml(t.mem_save || '') + '</button>';
}

function pickTrigger(k) {
    memIntentDraft.trigger = k;
    renderIntentStep();
}

function intentNext() {
    const t = translations[currentLang] || translations.en;
    if (memIntentDraft.step === 1) {
        const v = (document.getElementById('memIntentText').value || '').trim();
        if (!v) { showMotivToast(t.mem_need_action || ''); return; }
        memIntentDraft.text = v;
        memIntentDraft.step = 2;
        renderIntentStep();
        return;
    }
    if (memIntentDraft.step === 2) {
        const ti = document.getElementById('memIntentTrigger');
        if (ti) memIntentDraft.trigger = (ti.value || '').trim();
        if (!memIntentDraft.trigger) { showMotivToast(t.mem_need_trigger || ''); return; }
        memIntentDraft.step = 3;
        renderIntentStep();
    }
}

function saveIntent() {
    const t = translations[currentLang] || translations.en;
    if (!addIntention(memIntentDraft.text, memIntentDraft.trigger)) {
        showMotivToast(t.mem_limit || '');
        return;
    }
    showMotivToast(t.mem_saved || '');
    openMemoryScreen();
}
