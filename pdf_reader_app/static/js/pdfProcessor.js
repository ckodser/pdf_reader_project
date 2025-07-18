/**
 * File: pdf_reader_app/static/js/pdfProcessor.js
 *
 * Description: Contains all logic for loading, rendering, and parsing
 * PDF files using the PDF.js library. Now includes file hashing and pre-fetching
 * the server-side cache.
 */

import { elements } from './dom.js';
import state from './state.js';
import { updateStatus, enablePlaybackControls, resetUIForNewFile } from './ui.js';
import { resetPlayback, jumpToSentenceAndPlay } from './playback.js';
import { hashFile } from './utils.js';

export async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        updateStatus('Please select a valid PDF file.');
        return;
    }

    resetPlayback();
    resetUIForNewFile();
    updateStatus('Analyzing file...');

    try {
        // 1. Hash the file to get a unique identifier
        const fileHash = await hashFile(file);
        state.fileHash = fileHash; // Store the hash in the global state

        // 2. Fetch existing cache from the server for this file
        updateStatus('Checking for cached audio...');
        await fetchServerCache(fileHash);

        // 3. Read the file and load the PDF for rendering
        const typedarray = new Uint8Array(await file.arrayBuffer());
        await loadPdf(typedarray);

    } catch (error) {
        console.error("Error during file processing:", error);
        updateStatus("Could not process file.");
    }
}

/**
 * Fetches the pre-existing cache for a given file hash from the server
 * and populates the local audio cache.
 * @param {string} fileHash - The SHA-256 hash of the PDF file.
 */
async function fetchServerCache(fileHash) {
    try {
        const response = await fetch(`/api/get-cache/${fileHash}/`);
        if (!response.ok) {
            console.warn("Could not fetch server cache or none exists for this file.");
            return;
        }
        const serverCache = await response.json();
        const serverCacheSize = Object.keys(serverCache).length;

        if (serverCacheSize > 0) {
            console.log(`Loaded ${serverCacheSize} audio clips from server cache.`);
            // Merge the server cache (which contains URLs) into the local cache map.
            for (const key in serverCache) {
                state.audioCache.set(key, serverCache[key]);
            }
        }
    } catch (error) {
        console.error("Error fetching server cache:", error);
    }
}


async function loadPdf(pdfData) {
    try {
        state.pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        updateStatus(`Rendering ${state.pdfDoc.numPages} page(s)...`);

        state.sentences = [];
        elements.pdfContainer.innerHTML = '';
        for (let i = 1; i <= state.pdfDoc.numPages; i++) {
            await renderPage(i);
        }

        updateStatus(`Ready to play. Found ${state.sentences.length} sentences.`);
        enablePlaybackControls(true);
    } catch (error) {
        console.error('Error loading PDF:', error);
        updateStatus(`Error: ${error.message}`);
        enablePlaybackControls(false);
    }
}

async function renderPage(pageNum) {
    const page = await state.pdfDoc.getPage(pageNum);
    const scale = 2.0; // Higher scale for better text layer accuracy
    const viewport = page.getViewport({ scale });

    const pageDiv = document.createElement('div');
    pageDiv.className = 'pdf-page';

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-canvas';
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'text-layer';

    pageDiv.append(canvas, textLayerDiv);
    elements.pdfContainer.appendChild(pageDiv);

    await page.render({ canvasContext: context, viewport }).promise;

    // Defer text layer processing until after the canvas has been painted
    requestAnimationFrame(async () => {
        await processTextLayer(page, canvas, textLayerDiv, viewport);
    });
}

function groupTextIntoSentences(textItems) {
    if (!textItems.length) return [];

    const sentences = [];
    let currentSentenceFragments = [];
    const endOfSentenceRegex = /([.?!])\s*$/;
    const abbreviationRegex = /(Mr|Mrs|Ms|Dr|Jr|Sr|etc)\.$/i;

    textItems.forEach(item => {
        if (!item.str.trim()) return;
        currentSentenceFragments.push(item);
        const trimmedText = item.str.trim();
        if (endOfSentenceRegex.test(trimmedText) && !abbreviationRegex.test(trimmedText)) {
            sentences.push({ fragments: currentSentenceFragments });
            currentSentenceFragments = [];
        }
    });

    if (currentSentenceFragments.length > 0) {
        sentences.push({ fragments: currentSentenceFragments });
    }
    return sentences;
}

async function processTextLayer(page, canvas, textLayerDiv, viewport) {
    const textContent = await page.getTextContent();

    textLayerDiv.innerHTML = '';

    const canvasRect = canvas.getBoundingClientRect();
    const displayScaleX = canvasRect.width / viewport.width;
    const displayScaleY = canvasRect.height / viewport.height;

    const groupedSentences = groupTextIntoSentences(textContent.items);
    const sentenceBaseIndex = state.sentences.length;

    groupedSentences.forEach((sentenceData, i) => {
        const sentenceIndex = sentenceBaseIndex + i;
        const sentenceSpans = [];
        let sentenceText = '';

        sentenceData.fragments.forEach(item => {
            sentenceText += item.str;

            const x_pdf = item.transform[4];
            const y_pdf = item.transform[5];
            const width_pdf = item.width;
            const height_pdf = item.height;

            const x_canvas = x_pdf * viewport.scale;
            const width_canvas = width_pdf * viewport.scale;
            const height_canvas = height_pdf * viewport.scale;
            const y_canvas = viewport.height - (y_pdf * viewport.scale) - height_canvas;

            const span = document.createElement('span');

            span.style.left = `${x_canvas * displayScaleX}px`;
            span.style.top = `${y_canvas * displayScaleY}px`;
            span.style.width = `${width_canvas * displayScaleX}px`;
            span.style.height = `${height_canvas * displayScaleY}px`;

            span.addEventListener('click', () => {
                jumpToSentenceAndPlay(sentenceIndex);
            });
            sentenceSpans.push(span);
        });

        // Add hover listeners to the collection of spans for this sentence
        sentenceSpans.forEach(span => {
            textLayerDiv.appendChild(span);
            span.addEventListener('mouseenter', () => {
                sentenceSpans.forEach(s => s.classList.add('hover-highlight'));
            });
            span.addEventListener('mouseleave', () => {
                sentenceSpans.forEach(s => s.classList.remove('hover-highlight'));
            });
        });

        if (sentenceSpans.length > 0) {
             state.sentences.push({
                text: sentenceText.replace(/\s+/g, ' ').trim(),
                spans: sentenceSpans,
                index: sentenceIndex,
                y: sentenceData.fragments[0].transform[5],
                pageHeight: viewport.height / viewport.scale
            });
        }
    });
}
