/**
 * File: pdf_reader_app/static/js/playback.js
 *
 * Description: Manages all audio playback. Now includes logic to upload
 * newly synthesized audio to the server for persistent caching.
 */

import { elements } from './dom.js';
import state from './state.js';
import { updatePlaybackState, highlightSentence, clearHighlight, updateStatus, updateApiStatus } from './ui.js';
import { VOICE_TIER_DATA } from './constants.js';
import { getVoiceTier, stringToHash } from './utils.js';

// --- Playback Controls ---
export function play() {
    if (!state.sentences.length || (state.isSpeaking && !state.isPaused)) return;
    if (state.isPaused) {
        if (elements.apiKeyInput.classList.contains('valid-key')) {
            state.globalAudioElement.play();
        } else {
            window.speechSynthesis.resume();
        }
        state.isPaused = false;
        state.isSpeaking = true;
        updatePlaybackState();
        return;
    }
    state.isSpeaking = true;
    state.isPaused = false;
    updatePlaybackState();
    speakSentence();
}
export function pause() {
    if (state.isSpeaking && !state.isPaused) {
        if (elements.apiKeyInput.classList.contains('valid-key')) {
            state.globalAudioElement.pause();
        } else {
            window.speechSynthesis.pause();
        }
        state.isPaused = true;
        updatePlaybackState();
    }
}
export function stop() {
    window.speechSynthesis.cancel();
    if (state.globalAudioElement && !state.globalAudioElement.paused) {
        state.globalAudioElement.pause();
        state.globalAudioElement.removeAttribute('src');
        state.globalAudioElement.load();
    }
    handleSpeechEnd(false);
}
export function resetPlayback() {
    stop();
    state.pdfDoc = null;
    state.fileHash = null; // Reset file hash
    state.sentences = [];
    state.currentSentenceIndex = 0;
    state.audioCache.forEach(url => {
        // Only revoke blob URLs, not server URLs
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    state.audioCache.clear();
    state.abstractFound = false;
    state.totalApiCost = 0;
    if (elements.apiKeyInput.classList.contains('valid-key')) {
        updateApiStatus();
    }
}

// --- Navigation ---
export function previousSentence() {
    jumpToSentenceAndPlay(state.currentSentenceIndex - 1);
}
export function nextSentence() {
    jumpToSentenceAndPlay(state.currentSentenceIndex + 1);
}
export function jumpToSentenceAndPlay(index) {
    if (index < 0 || index >= state.sentences.length) return;
    stop();
    state.currentSentenceIndex = index;
    play();
}
export function seekBackward() {
    if (!state.globalAudioElement || !state.isSpeaking) return;
    state.globalAudioElement.currentTime = Math.max(0, state.globalAudioElement.currentTime - 15);
}
export function seekForward() {
    if (!state.globalAudioElement || !state.isSpeaking) return;
    const newTime = state.globalAudioElement.currentTime + 15;
    if (newTime < state.globalAudioElement.duration) {
        state.globalAudioElement.currentTime = newTime;
    }
}

// --- Core Speech Logic ---
async function speakSentence() {
    if (state.currentSentenceIndex >= state.sentences.length) {
        handleSpeechEnd(true);
        return;
    }
    let sentence = state.sentences[state.currentSentenceIndex];
    const { textToSpeak, shouldSkip } = filterSentence(sentence);
    if (shouldSkip || !textToSpeak.trim()) {
        state.currentSentenceIndex++;
        speakSentence();
        return;
    }
    highlightSentence(sentence.spans);
    const useGoogleApi = elements.apiKeyInput.value.trim() && elements.apiKeyInput.classList.contains('valid-key');
    if (useGoogleApi) {
        await speakWithGoogleApi(textToSpeak);
    } else {
        speakWithBrowserApi(textToSpeak);
    }
}
function speakWithBrowserApi(textToSpeak) {
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.onend = () => {
        if (!state.isSpeaking) return;
        state.currentSentenceIndex++;
        speakSentence();
    };
    utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        handleSpeechEnd(true);
    };
    window.speechSynthesis.speak(utterance);
}
async function speakWithGoogleApi(textToSpeak) {
    prefetchNextSentences();
    const sentenceHash = stringToHash(textToSpeak);
    const cacheKey = `${sentenceHash}-${state.selectedVoiceName}`;

    const playAudioFromUrl = (url) => {
        state.globalAudioElement.src = url;
        state.globalAudioElement.onended = () => {
            if (!state.isSpeaking) return;
            state.currentSentenceIndex++;
            speakSentence();
        };
        const playPromise = state.globalAudioElement.play();
        if (playPromise) {
            playPromise.catch(error => {
                console.error("Audio playback failed:", error);
                updateStatus("Playback failed. Click Play to resume.");
                stop();
            });
        }
    };

    const cachedUrl = state.audioCache.get(cacheKey);
    if (cachedUrl && cachedUrl !== 'fetching') {
        playAudioFromUrl(cachedUrl);
        return;
    }

    try {
        const audioUrl = await fetchAndCacheAudio(textToSpeak);
        if (audioUrl) {
            playAudioFromUrl(audioUrl);
        } else {
            state.currentSentenceIndex++;
            speakSentence();
        }
    } catch (error) {
        console.error(error);
        updateStatus(error.message);
        handleSpeechEnd(true);
    }
}

/**
 * Fetches audio from Google TTS if not in cache, then uploads the result to our server.
 * @param {string} textToSpeak - The text to synthesize.
 * @returns {Promise<string|null>} The local URL (blob or server) for the audio.
 */
async function fetchAndCacheAudio(textToSpeak) {
    const apiKey = elements.apiKeyInput.value.trim();
    const sentenceHash = stringToHash(textToSpeak);
    const cacheKey = `${sentenceHash}-${state.selectedVoiceName}`;
    if (state.audioCache.has(cacheKey)) {
        const url = state.audioCache.get(cacheKey);
        return url !== 'fetching' ? url : null;
    }

    try {
        state.audioCache.set(cacheKey, 'fetching');
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text: textToSpeak },
                voice: { languageCode: state.selectedVoiceName.substring(0, 5), name: state.selectedVoiceName },
                audioConfig: { audioEncoding: 'MP3' }
            })
        });
        if (!response.ok) throw new Error(`Google TTS Error: ${(await response.json()).error.message}`);

        const data = await response.json();
        const audioBlob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });

        // Upload the new audio to our server for persistent caching
        await uploadAudioToServer(state.fileHash, sentenceHash, state.selectedVoiceName, audioBlob);

        const localUrl = URL.createObjectURL(audioBlob);
        state.audioCache.set(cacheKey, localUrl); // Cache the local blob URL for immediate playback

        const tierKey = getVoiceTier(state.selectedVoiceName);
        const pricePerMillion = VOICE_TIER_DATA[tierKey]?.price || 0;
        state.totalApiCost += (textToSpeak.length / 1000000) * pricePerMillion;
        updateApiStatus();

        return localUrl;
    } catch (error) {
        console.error(`Fetch/Cache error:`, error);
        state.audioCache.delete(cacheKey);
        return null;
    }
}

/**
 * Uploads a generated audio blob to the Django server.
 * @param {string} fileHash - The hash of the parent PDF file.
 * @param {number} sentenceHash - The hash of the sentence text.
 * @param {string} voiceModel - The name of the voice model used.
 * @param {Blob} audioBlob - The generated audio data.
 */
async function uploadAudioToServer(fileHash, sentenceHash, voiceModel, audioBlob) {
    if (!fileHash) {
        console.error("Cannot upload to server: fileHash is missing.");
        return;
    }
    const formData = new FormData();
    formData.append('file_hash', fileHash);
    formData.append('sentence_hash', sentenceHash);
    formData.append('voice_model', voiceModel);
    formData.append('audio_file', audioBlob, 'audio.mp3');

    try {
        const response = await fetch('/api/cache-audio/', {
            method: 'POST',
            body: formData,
        });
        if (response.ok) {
            console.log(`Successfully cached audio for sentence ${sentenceHash} on server.`);
        } else {
            console.error(`Failed to cache audio on server: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error uploading audio to server:", error);
    }
}


async function prefetchNextSentences() {
    const prefetchCount = 3;
    for (let i = 1; i <= prefetchCount; i++) {
        const nextIndex = state.currentSentenceIndex + i;
        if (nextIndex < state.sentences.length) {
            const sentence = state.sentences[nextIndex];
            const { textToSpeak, shouldSkip } = filterSentence(sentence);
            if (!shouldSkip && textToSpeak.trim()) {
                fetchAndCacheAudio(textToSpeak);
            }
        }
    }
}
function handleSpeechEnd(resetIndex = true) {
    state.isSpeaking = false;
    state.isPaused = false;
    if (resetIndex) {
        state.currentSentenceIndex = 0;
    }
    clearHighlight();
    updatePlaybackState();
}
function filterSentence(sentence) {
    let textToSpeak = sentence.text;
    if (elements.skipAuthorsToggle.checked && !state.abstractFound) {
        const lowerText = textToSpeak.toLowerCase();
        if (lowerText.startsWith('abstract') || lowerText.startsWith('introduction') || lowerText.match(/^\d\.\s+introduction/)) {
            state.abstractFound = true;
            return filterSentence(sentence);
        } else {
            return { textToSpeak: '', shouldSkip: true };
        }
    }
    if (elements.skipHeadersFootersToggle.checked) {
        const y_percent = sentence.y / sentence.pageHeight;
        if ((y_percent < 0.08 || y_percent > 0.92) && textToSpeak.length < 150) {
            return { textToSpeak: '', shouldSkip: true };
        }
    }
    if (elements.skipFigureCaptionsToggle.checked) {
        if (/^(figure|fig|table)\s*\d+/i.test(textToSpeak)) {
            return { textToSpeak: '', shouldSkip: true };
        }
    }
    if (elements.skipCitationsToggle.checked) {
        const citationRegex = new RegExp('\\s?' + '\\(' + '((see|e\\.g\\.,?)\\s)?' + '([A-Z][\\w-]+(?:\\s(et al\\.|&|and)\\s[A-Z][\\w-]+)*,?\\s\\d{4}[a-z]?' + '(;\\s)?' + ')+' + '((, p\\.|, pp\\.|:)\\s?\\d+)?' + '\\)' + '|' + '\\s?\\[[\\d,;\\s-]+\\]', 'g');
        textToSpeak = textToSpeak.replace(citationRegex, '');
    }
    if (elements.skipMathToggle.checked) {
        const mathSymbols = (textToSpeak.match(/[=+\-−×÷∑∫√α-ωΑ-Ω]/g) || []).length;
        if (mathSymbols > 1 && textToSpeak.length < 100) {
            return { textToSpeak: '', shouldSkip: true };
        }
    }
    textToSpeak = textToSpeak.replace(/\s\s+/g, ' ').trim();
    return { textToSpeak, shouldSkip: false };
}
