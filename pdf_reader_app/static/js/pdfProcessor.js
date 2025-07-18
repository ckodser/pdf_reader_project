/**
 * File: pdf_reader_app/static/js/pdfProcessor.js
 *
 * Description: Contains all logic for loading, rendering, and parsing
 * PDF files using the PDF.js library. Renders pages to SVG for high quality.
 * Now includes file hashing and pre-fetching the server-side cache.
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
        // Use the globally available pdfjsLib
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

/**
 * Renders a single PDF page as an SVG for high quality, and prepares
 * the text layer for interactivity.
 * @param {number} pageNum The page number to render.
 */
async function renderPage(pageNum) {
    const page = await state.pdfDoc.getPage(pageNum);
    const scale = 2.0; // Higher scale for better text layer accuracy and SVG quality
    const viewport = page.getViewport({ scale });

    const pageDiv = document.createElement('div');
    pageDiv.className = 'pdf-page';

    // UPDATED: Container for the SVG output. This replaces the <canvas>.
    const svgContainer = document.createElement('div');
    svgContainer.className = 'svg-container';

    // The text layer will be positioned over the SVG.
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'text-layer';

    pageDiv.append(svgContainer, textLayerDiv);
    elements.pdfContainer.appendChild(pageDiv);

    // UPDATED: Use SVGGraphics to render the page to an SVG element instead of a canvas.
    try {
        const operatorList = await page.getOperatorList();
        const svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
        const svg = await svgGfx.getSVG(operatorList, viewport);

        // Style the SVG to be responsive within its container.
        svg.style.width = '100%';
        svg.style.height = 'auto';

        svgContainer.appendChild(svg);

        // Defer text layer processing until after the SVG has been added to the DOM.
        // We pass the svgContainer to correctly calculate the text layer positions.
        requestAnimationFrame(async () => {
            await processTextLayer(page, svgContainer, textLayerDiv, viewport);
        });
    } catch (svgError) {
        console.error(`Error rendering page ${pageNum} to SVG:`, svgError);
        pageDiv.textContent = `Error rendering page ${pageNum}.`;
    }
}

function groupTextIntoSentences(textItems) {
    if (!textItems.length) return [];

    const sentences = [];
    let currentSentenceFragments = [];
    const endOfSentenceRegex = /([.?!])\s*$/;
    // Improved abbreviation regex to handle more cases.
    const abbreviationRegex = /(Mr|Mrs|Ms|Dr|Jr|Sr|etc|i\.e|e\.g)\.$/i;

    textItems.forEach(item => {
        if (!item.str.trim()) return;
        currentSentenceFragments.push(item);
        const trimmedText = item.str.trim();
        // Check for sentence end, but ignore if it looks like an abbreviation.
        if (endOfSentenceRegex.test(trimmedText) && !abbreviationRegex.test(trimmedText)) {
            sentences.push({ fragments: currentSentenceFragments });
            currentSentenceFragments = [];
        }
    });

    // Add any remaining text as the last sentence.
    if (currentSentenceFragments.length > 0) {
        sentences.push({ fragments: currentSentenceFragments });
    }
    return sentences;
}

/**
 * Extracts text from the page, groups it into sentences, and creates
 * invisible, clickable spans over the text for interaction.
 * @param {PDFPageProxy} page The PDF.js page object.
 * @param {HTMLElement} renderOutputContainer The container holding the rendered SVG.
 * @param {HTMLElement} textLayerDiv The div that will contain the interactive spans.
 * @param {PageViewport} viewport The viewport used for rendering.
 */
async function processTextLayer(page, renderOutputContainer, textLayerDiv, viewport) {
    const textContent = await page.getTextContent();

    textLayerDiv.innerHTML = '';

    // UPDATED: Use the SVG container's dimensions for scaling calculations, not a canvas.
    const containerRect = renderOutputContainer.getBoundingClientRect();
    const displayScaleX = containerRect.width / viewport.width;
    const displayScaleY = containerRect.height / viewport.height;

    const groupedSentences = groupTextIntoSentences(textContent.items);
    const sentenceBaseIndex = state.sentences.length;

    groupedSentences.forEach((sentenceData, i) => {
        const sentenceIndex = sentenceBaseIndex + i;
        const sentenceSpans = [];
        let sentenceText = '';

        sentenceData.fragments.forEach(item => {
            sentenceText += item.str;

            // Get text item's position and dimensions from PDF data.
            const x_pdf = item.transform[4];
            const y_pdf = item.transform[5];
            const width_pdf = item.width;
            const height_pdf = item.height;

            // Convert PDF coordinates to scaled viewport coordinates.
            const x_viewport = x_pdf * viewport.scale;
            const width_viewport = width_pdf * viewport.scale;
            const height_viewport = height_pdf * viewport.scale;
            // Y coordinate is inverted in PDF space, so we adjust it.
            const y_viewport = viewport.height - (y_pdf * viewport.scale) - height_viewport;

            const span = document.createElement('span');

            // Position and scale the span to match the rendered text in the SVG.
            span.style.left = `${x_viewport * displayScaleX}px`;
            span.style.top = `${y_viewport * displayScaleY}px`;
            span.style.width = `${width_viewport * displayScaleX}px`;
            span.style.height = `${height_viewport * displayScaleY}px`;

            span.addEventListener('click', () => {
                jumpToSentenceAndPlay(sentenceIndex);
            });
            sentenceSpans.push(span);
        });

        // Add hover listeners to the collection of spans for this sentence.
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
                // Store original y-position for scrolling calculations.
                y: sentenceData.fragments[0].transform[5],
                pageHeight: viewport.height / viewport.scale
            });
        }
    });
}
