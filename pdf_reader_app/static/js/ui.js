/**
 * File: pdf_reader_app/static/js/ui.js
 *
 * Description: Manages all direct UI manipulations, such as updating text,
 * toggling classes, and controlling element visibility and state.
 */

import { elements } from './dom.js';
import state from './state.js';
import {updateCurrentAudioSpeed} from './playback.js';

export function updateStatus(message) {
    elements.statusMessage.textContent = message;
}

export function updatePlaybackState() {
    const isPremium = elements.apiKeyInput.classList.contains('valid-key');
    const canSeek = isPremium && (state.isSpeaking || state.isPaused);

    elements.playBtn.disabled = state.isSpeaking && !state.isPaused;
    elements.pauseBtn.disabled = !state.isSpeaking || state.isPaused;
    elements.stopBtn.disabled = !state.isSpeaking && !state.isPaused;

    // NEW: Enable/disable seek buttons
    elements.rewindBtn.disabled = !canSeek;
    elements.forwardBtn.disabled = !canSeek;

    // Also update the jump button visibility
    checkAndShowJumpButton();
}

export function enablePlaybackControls(isEnabled) {
    elements.playBtn.disabled = !isEnabled;
    elements.prevBtn.disabled = !isEnabled;
    elements.nextBtn.disabled = !isEnabled;
    // Pause and Stop are handled by updatePlaybackState
    elements.pauseBtn.disabled = true;
    elements.stopBtn.disabled = true;
    // Seek buttons are also disabled initially
    elements.rewindBtn.disabled = true;
    elements.forwardBtn.disabled = true;
}

export function highlightSentence(spans) {
    clearHighlight();
    state.currentHighlight = spans;
    state.currentHighlight.forEach((span) => {
        span.classList.add('highlight');
    });
    // Check if we need to show the jump button instead of scrolling
    checkAndShowJumpButton();
}

export function clearHighlight() {
    if (state.currentHighlight.length > 0) {
        state.currentHighlight.forEach(span => span.classList.remove('highlight'));
        state.currentHighlight = [];
    }
    // When highlights are cleared (e.g., on stop), hide the jump button
    elements.jumpToReadingBtn.classList.add('hidden');
}

/**
 * Checks if the currently playing sentence is visible in the viewport.
 * If not, it shows the "Jump to Reading" button.
 */
export function checkAndShowJumpButton() {
    if (!state.isSpeaking || state.currentHighlight.length === 0) {
        elements.jumpToReadingBtn.classList.add('hidden');
        return;
    }

    const firstSpan = state.currentHighlight[0];
    const rect = firstSpan.getBoundingClientRect();
    const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );

    if (isInViewport) {
        elements.jumpToReadingBtn.classList.add('hidden');
    } else {
        elements.jumpToReadingBtn.classList.remove('hidden');
    }
}

/**
 * Smoothly scrolls the view back to the currently playing sentence.
 */
export function jumpToCurrentSentence() {
    if (state.currentHighlight.length > 0) {
        state.currentHighlight[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    }
}

/**
 * NEW: Toggles the class on the controls bar based on scroll position.
 */
export function handleScroll() {
    if (window.scrollY > 50) {
        elements.controls.classList.add('scrolled');
    } else {
        elements.controls.classList.remove('scrolled');
    }
}


export function updateApiStatus() {
    elements.apiKeyStatus.innerHTML = `API Key is valid. Session cost: <span class="font-semibold text-green-700">$${state.totalApiCost.toFixed(6)}</span>`;
}

export function updateCurrentVoiceDisplay() {
    elements.currentVoiceDisplay.textContent = `Current Voice: ${state.selectedVoiceName}`;
}

export function showApiKeyModal() {
    elements.apiKeyModal.classList.remove('hidden');
}

export function hideApiKeyModal() {
    elements.apiKeyModal.classList.add('hidden');
}

export function showVoiceModal() {
    elements.voiceModal.classList.remove('hidden');
}

export function hideVoiceModal() {
    elements.voiceModal.classList.add('hidden');
}

export function resetUIForNewFile() {
    elements.pdfContainer.innerHTML = '';
    enablePlaybackControls(false);
    updateStatus('Loading PDF...');
    if (elements.apiKeyInput.classList.contains('valid-key')) {
        updateApiStatus();
    }
}

/**
 * Updates the speed display element with the current speed.
 */
export function updateSpeedDisplay() {
    const speed = state.readingSpeed;
    elements.speedDisplay.textContent = `${speed.toFixed(1)}x`;
}

function setReadingSpeed(speed) {
    const newSpeed = Math.max(0.3, Math.min(speed, 3.0));
    state.readingSpeed = parseFloat(newSpeed.toFixed(2));
}

/**
 * Handles the click event for the increase speed button.
 */
export function handleIncreaseSpeed() {
    let currentSpeed = state.readingSpeed;
    setReadingSpeed(currentSpeed + 0.2);
    updateSpeedDisplay();
    updateCurrentAudioSpeed(); // Update speed of currently playing audio
}


/**
 * Handles the click event for the decrease speed button.
 */
export function handleDecreaseSpeed() {
    let currentSpeed = state.readingSpeed;
    setReadingSpeed(currentSpeed - 0.2);
    updateSpeedDisplay();
    updateCurrentAudioSpeed(); // Update speed of currently playing audio
}