/**
 * File: pdf_reader_app/static/js/utils.js
 *
 * Description: Contains small, reusable helper functions used across different modules.
 */

import { VOICE_TIER_DATA } from './constants.js';

/**
 * Saves a cookie with a 1-year expiration.
 * @param {string} name - The name of the cookie.
 * @param {string} value - The value of the cookie.
 */
export function saveCookie(name, value) {
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=strict`;
}

/**
 * Retrieves a cookie by name.
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string|null} The cookie value or null if not found.
 */
export function getCookie(name) {
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find(row => row.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

/**
 * Converts a 2-letter country code into a flag emoji.
 * @param {string} countryCode - The ISO 3166-1 alpha-2 country code.
 * @returns {string} The flag emoji.
 */
export function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

/**
 * Determines the voice tier based on the voice name.
 * @param {string} voiceName - The full name of the voice from the Google API.
 * @returns {string} The tier key (e.g., 'WaveNet', 'Studio').
 */
export function getVoiceTier(voiceName) {
    const lowerCaseName = voiceName.toLowerCase();
    // Order is important, check for more specific names first.
    if (lowerCaseName.includes('studio')) return 'Studio';
    if (lowerCaseName.includes('instant')) return 'Instant Custom Voice';
    if (lowerCaseName.includes('chirp')) return 'Chirp 3: HD';
    if (lowerCaseName.includes('wavenet')) return 'WaveNet';
    if (lowerCaseName.includes('neural2')) return 'Neural2';
    if (lowerCaseName.includes('polyglot')) return 'Polyglot';
    return 'Standard';
}

/**
 * Creates a simple numeric hash from a string.
 * Used for creating a consistent cache key for sentences.
 * @param {string} str - The string to hash.
 * @returns {number} The resulting hash.
 */
export function stringToHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) + hash) + char; /* hash * 33 + c */
    }
    return hash;
}

/**
 * NEW: Asynchronously computes the SHA-256 hash of a file.
 * This serves as a unique identifier for the PDF content.
 * @param {File} file - The file to hash.
 * @returns {Promise<string>} A promise that resolves with the hex string of the hash.
 */
export async function hashFile(file) {
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
