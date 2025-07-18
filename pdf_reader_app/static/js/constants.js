/**
 * File: pdf_reader_app/static/js/constants.js
 *
 * Description: Stores static configuration and data for the application.
 * This includes the PDF.js worker source URL and data for voice tiers.
 */

// URL for the PDF.js worker script. This is required by the library.
export const PDF_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;

// Data object describing the different Google Cloud TTS voice tiers, their pricing, and descriptions.
export const VOICE_TIER_DATA = {
    'Standard': {
        name: 'Standard',
        price: 4.00,
        desc: 'Basic, robotic-sounding synthesis. Use Case: Simple notifications, non-customer-facing alerts, basic accessibility features.',
        freeTier: '4 million',
        sku: '9D01-5995-B545'
    },
    'WaveNet': {
        name: 'WaveNet',
        price: 16.00,
        desc: "High-fidelity, natural-sounding voices based on DeepMind's original model. Use Case: Interactive Voice Response (IVR), article narration, voice assistants.",
        freeTier: '1 million',
        sku: 'FEBD-04B6-769B'
    },
    'Neural2': {
        name: 'Neural2',
        price: 16.00,
        desc: "Google's next-generation high-fidelity voices, often with regional or feature advantages. Use Case: Similar to WaveNet, for applications requiring the latest voice technology.",
        freeTier: '1 million',
        sku: 'FEBD-04B6-769B'
    },
    'Polyglot': {
        name: 'Polyglot',
        price: 16.00,
        desc: 'Voices designed to speak multiple languages fluently within the same synthesis request. Use Case: Global applications, multilingual content delivery, dynamic translation services.',
        freeTier: '1 million',
        sku: 'FEBD-04B6-769B'
    },
    'Chirp 3: HD': {
        name: 'Chirp 3: HD',
        price: 30.00,
        desc: 'High-definition voices for superior audio clarity and quality. Use Case: High-quality audio production, professional voiceovers.',
        freeTier: '1 million',
        sku: 'F977-2280-6F1B'
    },
    'Instant Custom Voice': {
        name: 'Instant Custom Voice',
        price: 60.00,
        desc: 'Allows creation of a unique voice from provided audio samples. Use Case: Establishing a basic but unique brand voice identity.',
        freeTier: 'N/A',
        sku: 'A247-37D7-C094'
    },
    'Studio': {
        name: 'Studio',
        price: 160.00,
        desc: 'Highest-quality, most expressive, and directable voices available. Use Case: Premium media, character voices for gaming/entertainment, high-end brand assistants.',
        freeTier: '1 million',
        sku: '84AB-48C0-F9C3'
    }
};
