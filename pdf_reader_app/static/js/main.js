/**
 * File: pdf_reader_app/static/js/main.js
 *
 * Description: The main entry point for the application. It initializes all modules
 * and connects UI events to their respective handler functions.
 */

import { PDF_WORKER_SRC } from './constants.js';
import { elements } from './dom.js';
import { loadApiKeyFromCookie, loadVoiceSettingsFromCookie, validateAndSaveApiKey, clearApiKey, renderVoiceTiers, saveVoiceSelection } from './apiKeyHandler.js';
import { handleFileSelect } from './pdfProcessor.js';
import * as playback from './playback.js';
import { showApiKeyModal, hideApiKeyModal, showVoiceModal, hideVoiceModal, checkAndShowJumpButton, jumpToCurrentSentence, handleScroll } from './ui.js';

function initialize() {
    // Set the worker source for PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

    // Load settings from cookies
    loadApiKeyFromCookie();
    loadVoiceSettingsFromCookie();

    // Attach all event listeners
    elements.pdfUpload.addEventListener('change', handleFileSelect);
    elements.playBtn.addEventListener('click', playback.play);
    elements.pauseBtn.addEventListener('click', playback.pause);
    elements.stopBtn.addEventListener('click', playback.stop);
    elements.prevBtn.addEventListener('click', playback.previousSentence);
    elements.nextBtn.addEventListener('click', playback.nextSentence);
    // NEW: Seek button listeners
    elements.rewindBtn.addEventListener('click', playback.seekBackward);
    elements.forwardBtn.addEventListener('click', playback.seekForward);

    // API Key and Voice Selection Listeners
    elements.validateKeyBtn.addEventListener('click', validateAndSaveApiKey);
    elements.clearKeyBtn.addEventListener('click', clearApiKey);
    elements.apiKeyHelpLink.addEventListener('click', (e) => {
        e.preventDefault();
        showApiKeyModal();
    });
    elements.closeApiKeyModalBtn.addEventListener('click', hideApiKeyModal);
    elements.changeVoiceBtn.addEventListener('click', showVoiceModal);
    elements.closeVoiceModalBtn.addEventListener('click', hideVoiceModal);
    elements.languageSelect.addEventListener('change', renderVoiceTiers);
    elements.saveVoiceSelectionBtn.addEventListener('click', saveVoiceSelection);

    // Jump to Reading Button Listener
    elements.jumpToReadingBtn.addEventListener('click', jumpToCurrentSentence);

    // Listen for scroll events to show/hide the jump button and update controls
    window.addEventListener('scroll', () => {
        checkAndShowJumpButton();
        handleScroll();
    }, { passive: true });


    // Stop playback if the user leaves the page
    window.addEventListener('beforeunload', playback.stop);
}

// Run the initializer when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', initialize);
