/**
 * File: pdf_reader_app/static/js/audioPlayer.js
 *
 * Description: Manages the logic of audio playback. It takes text,
 * chunks it, and uses the SpeechApi to play it sequentially. It also
 * manages the playback state (playing, paused, stopped).
 */

import { config } from './config.js';
import { SpeechApi } from './speechApi.js';
import { getSelectedVoice } from './ui.js';

let textQueue = [];
let currentChunkIndex = 0;

/**
 * Splits a long text into smaller, speakable chunks.
 * @param {string} text - The full text to be chunked.
 * @returns {string[]} An array of text chunks.
 */
function chunkText(text) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.substring(i, i + config.MAX_CHUNK_LENGTH));
        i += config.MAX_CHUNK_LENGTH;
    }
    return chunks;
}

/**
 * Plays the next chunk in the queue. This function is called recursively
 * via the utterance's 'onend' event to ensure continuous playback.
 */
function playNextChunk() {
    if (currentChunkIndex >= textQueue.length) {
        // Reached the end of the text
        stop();
        return;
    }

    const chunk = textQueue[currentChunkIndex];
    const utterance = SpeechApi.speak(chunk, getSelectedVoice());

    // When this chunk is finished, play the next one.
    utterance.onend = () => {
        currentChunkIndex++;
        playNextChunk();
    };

    utterance.onerror = (event) => {
        console.error('An error occurred during speech synthesis:', event.error);
        stop(); // Stop playback on error
    };
}

/**
 * Starts the playback process from the beginning.
 * @param {string} text - The text to play.
 */
export function play(text) {
    if (SpeechApi.isSpeaking()) {
        SpeechApi.stop();
    }
    textQueue = chunkText(text);
    currentChunkIndex = 0;
    playNextChunk();
}

/**
 * Pauses the current playback.
 */
export function pause() {
    SpeechApi.pause();
}

/**
 * Resumes playback from a paused state.
 */
export function resume() {
    SpeechApi.resume();
}

/**
 * Stops playback completely and clears the queue.
 */
export function stop() {
    SpeechApi.stop();
    textQueue = [];
    currentChunkIndex = 0;
}
