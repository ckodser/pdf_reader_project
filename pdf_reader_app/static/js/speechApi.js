/**
 * File: pdf_reader_app/static/js/speechApi.js
 *
 * Description: A wrapper for the browser's SpeechSynthesis API. It handles
 * fetching voices and provides a clean interface for speaking, pausing,
 * resuming, and stopping speech synthesis.
 */

let voices = [];

/**
 * Fetches and stores the available synthesis voices.
 * @returns {Promise<SpeechSynthesisVoice[]>} A promise that resolves with the array of voices.
 */
function loadVoices() {
    return new Promise((resolve) => {
        voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
            return;
        }
        // Voices are loaded asynchronously, so we need to listen for the event.
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve(voices);
        };
    });
}

/**
 * Speaks a given text chunk using a specific voice.
 * @param {string} textChunk - The piece of text to speak.
 * @param {string} voiceName - The name of the voice to use.
 * @returns {SpeechSynthesisUtterance} The utterance object that can be monitored.
 */
function speak(textChunk, voiceName) {
    const utterance = new SpeechSynthesisUtterance(textChunk);
    const selectedVoice = voices.find(voice => voice.name === voiceName);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    window.speechSynthesis.speak(utterance);
    return utterance;
}

// Export the functions to be used by other modules.
export const SpeechApi = {
    loadVoices,
    speak,
    pause: () => window.speechSynthesis.pause(),
    resume: () => window.speechSynthesis.resume(),
    stop: () => window.speechSynthesis.cancel(), // `cancel` stops the current and clears the queue.
    isSpeaking: () => window.speechSynthesis.speaking,
    isPaused: () => window.speechSynthesis.paused,
};
