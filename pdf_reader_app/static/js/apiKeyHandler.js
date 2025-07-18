/**
 * File: pdf_reader_app/static/js/apiKeyHandler.js
 *
 * Description: Handles all logic related to the Google Cloud TTS API key
 * and the voice selection modal.
 */

import { elements } from './dom.js';
import state from './state.js';
import { saveCookie, getCookie, getFlagEmoji, getVoiceTier } from './utils.js';
import { VOICE_TIER_DATA } from './constants.js';
import { updateApiStatus, updateCurrentVoiceDisplay, hideVoiceModal } from './ui.js';

export function loadApiKeyFromCookie() {
    const key = getCookie('googleTtsApiKey');
    if (key) {
        elements.apiKeyInput.value = key;
        validateAndSaveApiKey();
    }
}

export function loadVoiceSettingsFromCookie() {
    const voiceName = getCookie('selectedVoiceName');
    if (voiceName) {
        state.selectedVoiceName = voiceName;
    }
    updateCurrentVoiceDisplay();
}

export function clearApiKey() {
    elements.apiKeyInput.value = '';
    document.cookie = 'googleTtsApiKey=;path=/;max-age=0;samesite=strict';
    elements.apiKeyInput.classList.remove('valid-key', 'invalid-key');
    elements.apiKeyInput.disabled = false;
    elements.apiKeyStatus.innerHTML = `To use premium voices, you need a Google Cloud API key. <a href="#" id="api-key-help-link" class="text-blue-600 hover:underline">How do I get a key?</a>`;
    elements.voiceSelectionContainer.classList.add('hidden');
    elements.validateKeyBtn.classList.remove('hidden');
    elements.clearKeyBtn.classList.add('hidden');
    state.allVoices = [];
    state.totalApiCost = 0;
}

export async function validateAndSaveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    if (!apiKey) {
        elements.apiKeyStatus.textContent = 'Please enter an API key.';
        return;
    }

    elements.apiKeyStatus.textContent = 'Validating key...';
    elements.apiKeyInput.classList.remove('valid-key', 'invalid-key');

    try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`);
        const data = await response.json();

        if (response.ok && data.voices) {
            elements.apiKeyInput.classList.add('valid-key');
            updateApiStatus();
            elements.apiKeyInput.disabled = true;
            saveCookie('googleTtsApiKey', apiKey);
            state.allVoices = data.voices;
            populateLanguageSelector();
            renderVoiceTiers();
            elements.voiceSelectionContainer.classList.remove('hidden');
            elements.validateKeyBtn.classList.add('hidden');
            elements.clearKeyBtn.classList.remove('hidden');
        } else {
            throw new Error(data.error?.message || 'Invalid API Key or configuration.');
        }
    } catch (error) {
        console.error('API Key validation error:', error);
        elements.apiKeyInput.classList.add('invalid-key');
        elements.apiKeyStatus.textContent = `Error: ${error.message}`;
        elements.voiceSelectionContainer.classList.add('hidden');
    }
}

function populateLanguageSelector() {
    const languageMap = new Map();
    state.allVoices.forEach(voice => {
        voice.languageCodes.forEach(code => {
            if (!languageMap.has(code)) {
                try {
                     languageMap.set(code, { name: new Intl.DisplayNames(['en'], { type: 'language' }).of(code.split('-')[0]), code: code });
                } catch (e) {
                    languageMap.set(code, { name: code, code: code });
                }
            }
        });
    });

    const sortedLanguages = [...languageMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    elements.languageSelect.innerHTML = '';
    sortedLanguages.forEach(({ name, code }) => {
        const option = document.createElement('option');
        const countryCode = code.split('-')[1] || '';
        option.value = code;
        option.textContent = `${getFlagEmoji(countryCode)} ${name} (${code})`;
        elements.languageSelect.appendChild(option);
    });

    const savedLang = getCookie('selectedLanguage') || 'en-US';
    elements.languageSelect.value = savedLang;
}

export function renderVoiceTiers() {
    const selectedLang = elements.languageSelect.value;
    const voicesForLang = state.allVoices.filter(v => v.languageCodes.includes(selectedLang));
    const tiers = {};

    voicesForLang.forEach(voice => {
        const tierKey = getVoiceTier(voice.name);
        if (!tiers[tierKey]) tiers[tierKey] = [];
        tiers[tierKey].push(voice);
    });

    elements.voiceTierContainer.innerHTML = '';
    Object.keys(VOICE_TIER_DATA).forEach(tierKey => {
        if (tiers[tierKey]) {
            const tierInfo = VOICE_TIER_DATA[tierKey];
            const card = document.createElement('div');
            card.className = 'voice-tier-card border rounded-lg p-4';
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <h4 class="text-lg font-bold">${tierInfo.name}</h4>
                    <span class="text-sm font-semibold text-green-600">$${tierInfo.price.toFixed(2)} / 1M chars</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">${tierInfo.desc}</p>
                <div class="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 grid grid-cols-2 gap-x-4">
                    <span><strong>SKU:</strong> ${tierInfo.sku}</span>
                    <span><strong>Free Tier:</strong> ${tierInfo.freeTier === 'N/A' ? 'N/A' : `${tierInfo.freeTier} chars/month`}</span>
                </div>
                <div class="mt-3 space-y-2">
                    ${tiers[tierKey].map(voice => `
                        <label class="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input type="radio" name="voice-selection" value="${voice.name}" class="mr-3" ${voice.name === state.selectedVoiceName ? 'checked' : ''}>
                            <span>${voice.name} (${voice.ssmlGender.toLowerCase()})</span>
                        </label>
                    `).join('')}
                </div>
            `;
            elements.voiceTierContainer.appendChild(card);
        }
    });
}

export function saveVoiceSelection() {
    const selectedRadio = document.querySelector('input[name="voice-selection"]:checked');
    if (selectedRadio) {
        state.selectedVoiceName = selectedRadio.value;
        saveCookie('selectedVoiceName', state.selectedVoiceName);
        saveCookie('selectedLanguage', elements.languageSelect.value);
        updateCurrentVoiceDisplay();
        hideVoiceModal();
        state.audioCache.clear(); // Clear cache as voice changed
    } else {
        alert('Please select a voice.');
    }
}
