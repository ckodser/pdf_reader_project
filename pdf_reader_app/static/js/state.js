/**
 * File: pdf_reader_app/static/js/state.js
 *
 * Description: Manages the application's dynamic state. Consolidating state
 * into one module makes it easier to track and debug data changes.
 */

const state = {
    pdfDoc: null,
    fileHash: null, // NEW: To store the SHA-256 hash of the current PDF file.
    sentences: [],
    currentSentenceIndex: 0,
    isSpeaking: false,
    isPaused: false,
    currentHighlight: [],
    globalAudioElement: new Audio(), // Single, reusable audio element
    audioCache: new Map(),
    allVoices: [],
    selectedVoiceName: 'en-US-Wavenet-D', // Default premium voice
    totalApiCost: 0,
    abstractFound: false,
};

// We export the state object directly, but in a larger app, you might
// use setter functions to control state modifications.
export default state;
