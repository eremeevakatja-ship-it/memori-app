// ===== audio.js =====
// TTS voice picking/speaking (Text Mode audio review method + Words Mode word audio),
// OCR/file import (Tesseract + PDF text extraction), and small sound effects.
// Plain classic script — see state.js header for why (no ES modules).
// Split out of app.js (BACKLOG Q-01).

// ----- [A1 langToSpeech]  (was app.js lines 1054-1055) -----
const langToSpeech = { uk: 'uk-UA', en: 'en-GB', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };


// ----- [A2 OCR + FILE IMPORT]  (was app.js lines 1485-1744) -----
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

// OCR_LOAD_TIMEOUT_MS: якщо CDN просто "мовчить" (не віддає ні успіх, ні явну
// помилку — типова поведінка нестабільного мобільного інтернету), без цього
// таймауту користувач лишається перед вічним спінером назавжди.
const OCR_LOAD_TIMEOUT_MS = 14000;

function loadTesseract() {
    const load = new Promise((resolve, reject) => {
        if (window.Tesseract) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('ocr_load_failed'));
        document.head.appendChild(s);
    });
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ocr_load_timeout')), OCR_LOAD_TIMEOUT_MS);
    });
    return Promise.race([load, timeout]);
}

// ocrRequestId: монотонний токен поточної OCR-спроби. cancelOCR() інкрементує
// його — будь-який ще недовершений handleOCRFile() бачить, що його id
// застарів, і тихо ігнорує свій результат/помилку замість того, щоб
// перезаписати екран, який користувач уже закрив і почав заново.
let ocrRequestId = 0;

function cancelOCR() {
    ocrRequestId++;
    const overlay = document.getElementById('ocrOverlay');
    const btn = document.getElementById('ocrBtn');
    if (overlay) overlay.style.display = 'none';
    if (btn) btn.disabled = false;
}

function triggerOCR() {
    document.getElementById('ocrInput').value = '';
    document.getElementById('ocrInput').click();
}

// Downscale (never upscale) to ~1900px on the long side + grayscale/contrast-stretch on canvas.
// Speeds up Tesseract (less pixel data to scan) and improves accuracy on uneven phone-photo lighting.
// Falls back to returning the original file untouched if anything goes wrong (e.g. canvas errors),
// so OCR still runs instead of hard-failing.
async function preprocessImageForOcr(file) {
    const MAX_DIM = 1900;
    let objectUrl;
    try {
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            objectUrl = URL.createObjectURL(file);
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = objectUrl;
        });

        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (!width || !height) return file;

        const longSide = Math.max(width, height);
        if (longSide > MAX_DIM) {
            const scale = MAX_DIM / longSide;
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
        // else: image already smaller than MAX_DIM — keep as-is, never upscale

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const pixelCount = width * height;

        // Pass 1: grayscale (luminosity) + find min/max for contrast stretch
        const gray = new Float32Array(pixelCount);
        let min = 255, max = 0;
        for (let i = 0, p = 0; p < pixelCount; i += 4, p++) {
            const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            gray[p] = g;
            if (g < min) min = g;
            if (g > max) max = g;
        }

        // Pass 2: linear contrast stretch — spreads the narrow gray range typical of an
        // unevenly-lit phone photo across the full 0-255 range
        const range = Math.max(max - min, 1);
        for (let i = 0, p = 0; p < pixelCount; i += 4, p++) {
            const v = Math.min(255, Math.max(0, ((gray[p] - min) * 255) / range));
            data[i] = data[i + 1] = data[i + 2] = v;
        }
        ctx.putImageData(imageData, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        return blob || file;
    } catch (e) {
        return file;
    } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
}

// Shared by the isImage and "unknown type, try image OCR" branches below — same worker setup,
// same preprocessing, same PSM tuned for a single block of poem/text text.
async function recognizeImageText(file, fill, status, t) {
    await loadTesseract();

    status.innerText = t.ocr_preprocessing || t.ocr_loading;
    fill.style.width = '5%';
    const processedBlob = await preprocessImageForOcr(file);

    status.innerText = t.ocr_loading;
    const lang = document.getElementById('ocrLang').value || tessLang[currentLang] || 'eng';
    const worker = await Tesseract.createWorker(lang, 1, {
        logger: m => {
            if (m.status === 'recognizing text') {
                fill.style.width = Math.round(m.progress * 100) + '%';
            }
        }
    });
    // Poem/text photo = one simple block of text, not a page layout — SINGLE_BLOCK is a much
    // better fit than Tesseract's default page segmentation for this use case
    await worker.setParameters({ tessedit_pageseg_mode: '6' });
    const { data: { text: ocrText } } = await worker.recognize(processedBlob);
    await worker.terminate();
    return ocrText;
}

async function handleOCRFile(input) {
    const file = input.files[0];
    if (!file) return;
    const myOcrId = ++ocrRequestId;
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
            text = await recognizeImageText(file, fill, status, t);

        } else {
            // Unknown type — try image OCR as last resort
            text = await recognizeImageText(file, fill, status, t);
        }

        // Користувач міг натиснути "Скасувати" поки йшло розпізнавання — не
        // перезаписуємо textarea і не показуємо результат застарілої спроби.
        if (myOcrId !== ocrRequestId) return;

        const cleaned = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
        if (cleaned.length > 3) {
            document.getElementById('userText').value = cleaned;
            clearValidation();
        } else {
            showValidation(t.ocr_error);
        }
    } catch(e) {
        if (myOcrId !== ocrRequestId) return; // скасовано — помилку не показуємо
        const msg = e.message === 'doc_not_supported'     ? (t.ocr_error_doc || '.doc не підтримується. Збережіть як .docx.')
                  : e.message === 'file_empty'            ? (t.ocr_error_empty || 'Файл не завантажено з хмари. Відкрийте його у Word і збережіть локально.')
                  : e.message === 'ocr_load_timeout'      ? (t.ocr_error_timeout || 'Не вдалося завантажити розпізнавач тексту. Перевірте інтернет і спробуйте ще раз.')
                  : e.message === 'ocr_load_failed'       ? (t.ocr_error_timeout || 'Не вдалося завантажити розпізнавач тексту. Перевірте інтернет і спробуйте ще раз.')
                  : t.ocr_error;
        showValidation(msg);
    } finally {
        // Якщо це вже неактуальна (скасована/перезапущена) спроба — cancelOCR()
        // або новіший виклик handleOCRFile() уже привели overlay/btn у потрібний
        // стан; не чіпаємо їх повторно, щоб не збити стан свіжішої спроби.
        if (myOcrId === ocrRequestId) {
            overlay.style.display = 'none';
            btn.disabled = false;
        }
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


// ----- [A3 sound effects]  (was app.js lines 1745-1773) -----
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

// ----- [A4 Text Mode audio review method]  (was app.js lines 2748-2932) -----
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

async function speakCurrentBlock() {
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
    const lang = langToSpeech[currentLang] || 'en-GB';
    // Chrome (and some mobile browsers) load the voice list asynchronously —
    // wait for it (with a safety timeout) before deciding a voice is missing,
    // otherwise a first-load race can wrongly report "no voice available".
    await getVoicesReady();
    const voice = wtPickVoice(lang);

    if (!voice) {
        // No voice installed for this language on this device — say so
        // plainly instead of silently speaking with the wrong system voice
        // or making no sound at all (STATUS.md TTS bug-fix 2026-07-21).
        document.getElementById('audioCard').classList.remove('speaking');
        document.getElementById('audioStatus').innerText = t.audio_tts_unavailable;
        document.getElementById('audioRepeatText').style.display = 'none';
        document.getElementById('audioAgainBtn').innerText = t.audio_again;
        document.getElementById('audioBtnRecord').innerText = t.audio_record;
        document.getElementById('audioBtnSilent').innerText = t.audio_silent;
        document.getElementById('audioActions').style.display = 'flex';
        return;
    }

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = ttsSpeed;
    utt.pitch = 1;
    utt.voice = voice;

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


// ----- [A5 getVoicesReady (+ immediate preload call)]  (was app.js lines 3597-3624) -----
// ===== WORDS MODE =====

// Preload TTS voices (async in some browsers, e.g. Chrome only populates
// getVoices() after the `onvoiceschanged` event fires, sometimes well after
// the page has rendered). getVoicesReady() lets callers await the real list
// instead of racing getVoices() before it's populated — with a short safety
// timeout in case the event never fires (some browsers/platforms don't
// dispatch it even though voices were already available).
let _voicesReadyPromise = null;
function getVoicesReady() {
    if (!('speechSynthesis' in window)) return Promise.resolve([]);
    if (_voicesReadyPromise) return _voicesReadyPromise;
    _voicesReadyPromise = new Promise(resolve => {
        const already = window.speechSynthesis.getVoices();
        if (already && already.length) { resolve(already); return; }
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve(window.speechSynthesis.getVoices());
        };
        window.speechSynthesis.onvoiceschanged = finish;
        setTimeout(finish, 400); // safety net if the event never fires
    });
    return _voicesReadyPromise;
}
if ('speechSynthesis' in window) getVoicesReady();


// ----- [A6 WT_TTS_LANG]  (was app.js lines 4257-4263) -----
const WT_TTS_LANG = {
    en: 'en-US', uk: 'uk-UA', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR',
    es: 'es-ES', it: 'it-IT', pt: 'pt-BR', nl: 'nl-NL', sv: 'sv-SE',
    cs: 'cs-CZ', hu: 'hu-HU', ro: 'ro-RO', tr: 'tr-TR',
    ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', ar: 'ar-SA',
};


// ----- [A7 wtPickVoice/wtSetSpeed/wtPlayAudio]  (was app.js lines 4905-4971) -----
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

async function wtPlayAudio() {
    if (!wtCurrentAudioPair) return;
    const pairAtCall = wtCurrentAudioPair;
    const lang = WT_TTS_LANG[wordLangFrom] || langToSpeech[wordLangFrom] || 'en-US';

    // Chrome (and some mobile browsers) load the voice list asynchronously —
    // wait for it (with a safety timeout) before deciding a voice is missing.
    await getVoicesReady();
    // User may have moved to a different word/exercise while voices were
    // loading — bail out rather than overwriting the now-current question.
    if (wtCurrentAudioPair !== pairAtCall) return;

    const voice = wtPickVoice(lang);
    const qEl = document.getElementById('wtQuestion');

    if (!voice) {
        // No matching voice installed — show the word as fallback, with the
        // reason spelled out so it doesn't look like a silent failure. Keyed
        // by word+lang (not a one-shot flag) so the explanation still shows
        // up on every exercise where the voice is missing, not just the first.
        const t = translations[currentLang];
        const fallbackKey = pairAtCall.word + '|' + lang;
        if (qEl.dataset.audioFallbackFor !== fallbackKey) {
            qEl.dataset.audioFallbackFor = fallbackKey;
            qEl.innerText = pairAtCall.word + ' — ' + t.audio_tts_unavailable;
        }
        return;
    }

    const utt = new SpeechSynthesisUtterance(pairAtCall.word);
    utt.lang = lang;
    utt.rate = wtAudioRate;
    utt.voice = voice;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
}
