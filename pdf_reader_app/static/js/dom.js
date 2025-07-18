/**
 * File: pdf_reader_app/static/js/dom.js
 *
 * Description: Centralizes all DOM element selections. Exporting a single
 * object of elements prevents repetitive `getElementById` calls across the application.
 */

export const elements = {
    // Main Controls
    pdfUpload: document.getElementById('pdf-upload'),
    controls: document.getElementById('controls'),
    speedDisplay: document.getElementById('speed-display'),
    playBtn: document.getElementById('play-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    stopBtn: document.getElementById('stop-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    // NEW: Speed selection
    increaseSpeedBtn: document.getElementById('increase-speed-btn'),
    decreaseSpeedBtn: document.getElementById('decrease-speed-btn'),
    // NEW: Seek buttons
    rewindBtn: document.getElementById('rewind-btn'),
    forwardBtn: document.getElementById('forward-btn'),
    // NEW: Control wrappers for dynamic layout
    fileUploadWrapper: document.getElementById('file-upload-wrapper'),
    playbackButtonsWrapper: document.getElementById('playback-buttons-wrapper'),
    // Viewer and Status
    viewerContainer: document.getElementById('viewer-container'),
    statusMessage: document.getElementById('status-message'),
    pdfContainer: document.getElementById('pdf-container'),
    // Filtering Toggles
    skipAuthorsToggle: document.getElementById('skip-authors'),
    skipCitationsToggle: document.getElementById('skip-citations'),
    skipMathToggle: document.getElementById('skip-math'),
    skipFigureCaptionsToggle: document.getElementById('skip-figure-captions'),
    skipHeadersFootersToggle: document.getElementById('skip-headers-footers'),

    // API Key Section
    apiKeyInput: document.getElementById('api-key-input'),
    validateKeyBtn: document.getElementById('validate-key-btn'),
    clearKeyBtn: document.getElementById('clear-key-btn'),
    apiKeyStatus: document.getElementById('api-key-status'),
    apiKeyHelpLink: document.getElementById('api-key-help-link'),

    // Voice Selection Section
    voiceSelectionContainer: document.getElementById('voice-selection-container'),
    changeVoiceBtn: document.getElementById('change-voice-btn'),
    currentVoiceDisplay: document.getElementById('current-voice-display'),

    // API Key Help Modal
    apiKeyModal: document.getElementById('api-key-modal'),
    closeApiKeyModalBtn: document.getElementById('close-api-key-modal-btn'),

    // Voice Selection Modal
    voiceModal: document.getElementById('voice-modal'),
    closeVoiceModalBtn: document.getElementById('close-voice-modal-btn'),
    languageSelect: document.getElementById('language-select'),
    voiceTierContainer: document.getElementById('voice-tier-container'),
    saveVoiceSelectionBtn: document.getElementById('save-voice-selection-btn'),

    // Jump to Reading Button
    jumpToReadingBtn: document.getElementById('jump-to-reading-btn'),
};
