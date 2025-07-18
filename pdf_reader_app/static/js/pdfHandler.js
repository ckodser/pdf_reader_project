/**
 * File: pdf_reader_app/static/js/pdfHandler.js
 *
 * Description: Handles the logic for reading and extracting text from a user-uploaded PDF file
 * using the PDF.js library.
 */

import { updateTextArea, showLoading } from './ui.js';

// Set the worker source for PDF.js. This is required for the library to work correctly.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

/**
 * Extracts text from a given PDF file.
 * @param {File} file - The PDF file uploaded by the user.
 */
export async function extractTextFromPdf(file) {
    showLoading(true);
    updateTextArea('Extracting text from PDF...');

    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            const pdfData = new Uint8Array(event.target.result);
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }

            updateTextArea(fullText.trim());
        } catch (error) {
            console.error('Error parsing PDF:', error);
            updateTextArea('Failed to extract text from PDF. Please try another file.');
        } finally {
            showLoading(false);
        }
    };

    reader.onerror = () => {
        console.error('Error reading file.');
        updateTextArea('Error reading the selected file.');
        showLoading(false);
    };

    reader.readAsArrayBuffer(file);
}
