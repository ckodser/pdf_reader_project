/**
 * File: pdf_reader_app/static/js/config.js
 *
 * Description: This file contains configuration variables for the application.
 * Separating configuration makes it easy to update settings without
 * searching through other logic files.
 */

// Exporting configuration object to be used by other modules.
export const config = {
    // Defines the maximum number of characters for each chunk of text sent to the TTS engine.
    // The SpeechSynthesis API has limits, so chunking is necessary for long texts.
    MAX_CHUNK_LENGTH: 150,
};
