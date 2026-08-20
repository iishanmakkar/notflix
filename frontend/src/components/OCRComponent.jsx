import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';

// Vite serves the worker as a separate asset. PDF.js needs this explicit URL
// before a document is opened, otherwise it cannot render PDF pages for OCR.
const configurePdfWorker = () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
};

configurePdfWorker();

const SUPPORTED_LANGUAGES = [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish (Español)' },
    { code: 'fre', name: 'French (Français)' },
    { code: 'ger', name: 'German (Deutsch)' },
    { code: 'ita', name: 'Italian (Italiano)' },
    { code: 'por', name: 'Portuguese (Português)' },
    { code: 'rus', name: 'Russian (Русский)' },
    { code: 'chs', name: 'Chinese Simplified (简体中文)' },
    { code: 'cht', name: 'Chinese Traditional (繁體中文)' },
    { code: 'jpn', name: 'Japanese (日本語)' },
    { code: 'kor', name: 'Korean (한국어)' },
    { code: 'ara', name: 'Arabic (العربية)' },
    { code: 'hin', name: 'Hindi (हिन्दी)' },
    { code: 'tur', name: 'Turkish (Türkçe)' }
];

const ocrToTesseractLang = {
  eng: 'eng',
  spa: 'spa',
  fre: 'fra',
  ger: 'deu',
  ita: 'ita',
  por: 'por',
  rus: 'rus',
  chs: 'chi_sim',
  cht: 'chi_tra',
  jpn: 'jpn',
  kor: 'kor',
  ara: 'ara',
  hin: 'hin',
  tur: 'tur'
};

const OCRComponent = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errDetails, setErrDetails] = useState(null);
    const [copied, setCopied] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('eng');
    const fileInputRef = useRef(null);

    const handleCopy = () => {
        if (result?.text) {
            navigator.clipboard.writeText(result.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const validateFile = (file) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        const maxSize = 10 * 1024 * 1024; // 10MB for PDFs

        if (!allowedTypes.includes(file.type)) {
            if (file.type === 'application/pdf') {
                return 'Unsupported PDF file. Please upload a valid PDF file.';
            }
            return 'Unsupported file type. Please use JPG, PNG, GIF, WebP, or PDF.';
        }
        if (file.size > maxSize) {
            return `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size for images is 5MB, for PDFs is 10MB.`;
        }
        return null;
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                setErrDetails(null);
                return;
            }
            setSelectedFile(file);
            if (file.type === 'application/pdf') {
                setPreview(null);
                setResult(null);
                setError(null);
                setErrDetails(null);
            } else {
                setPreview(URL.createObjectURL(file));
                setResult(null);
                setError(null);
                setErrDetails(null);
            }
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                setErrDetails(null);
                return;
            }
            setSelectedFile(file);
            if (file.type === 'application/pdf') {
                setPreview(null);
                setResult(null);
                setError(null);
                setErrDetails(null);
            } else {
                setPreview(URL.createObjectURL(file));
                setResult(null);
                setError(null);
                setErrDetails(null);
            }
        }
    };

    const convertPDFToCanvas = async (pdfFile) => {
        const arrayBuffer = await pdfFile.arrayBuffer();
        // Reapply this immediately before creating the loading task. This also
        // covers Vite hot reloads, which can recreate the PDF.js module.
        configurePdfWorker();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const canvases = [];
        const maxPages = Math.min(pdf.numPages, 10);

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await page.render({ canvasContext: context, viewport }).promise;
            canvases.push(canvas.toDataURL('image/png'));
        }

        return { canvases, pageCount: pdf.numPages };
    };

    const processPDF = async (pdfFile) => {
        setLoading(true);
        setError(null);
        setErrDetails(null);
        setResult(null);

        try {
            const { canvases, pageCount } = await convertPDFToCanvas(pdfFile);

            if (canvases.length === 0) {
                throw new Error('No pages detected in PDF or PDF is empty');
            }

            const tesseractLang = ocrToTesseractLang[selectedLanguage] || 'eng';
            const worker = await Tesseract.createWorker(tesseractLang, 1, {
                logger: (m) => console.log('[PDF OCR]', m)
            });

            const allText = [];
            let totalConfidence = 0;
            for (let i = 0; i < canvases.length; i++) {
                const pageCanvas = canvases[i];
                const result = await worker.recognize(pageCanvas);
                allText.push(result.data.text);
                totalConfidence += (result.data.confidence || 90);
            }

            await worker.terminate();

            const extractedText = allText.join('\n\n');
            if (!extractedText || extractedText.trim().length < 10) {
                throw new Error('No text detected in PDF or text is too short');
            }

            const avgConfidence = (totalConfidence / canvases.length) / 100;

            setResult({
                text: extractedText,
                confidence: avgConfidence,
                language: selectedLanguage,
                source: 'pdf',
                pageCount: canvases.length,
                totalPages: pageCount,
                processedAt: new Date().toISOString()
            });

        } catch (err) {
            console.error('PDF OCR Error:', err);
            const errorMessage = err.message || 'Error processing PDF';
            const errorDetails = err.message || 'Failed to convert PDF or extract text';
            setError(errorMessage);
            setErrDetails(errorDetails);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedFile) {
            setError('Please select an image or PDF first');
            return;
        }

        if (selectedFile.type === 'application/pdf') {
            await processPDF(selectedFile);
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('language', selectedLanguage);

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/ocr/process`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(response.data);
        } catch (err) {
            console.error('OCR Error:', err);
            const errorMessage = err.response?.data?.error || 'Error processing image';
            const errorDetails = err.response?.data?.details || err.response?.data?.type || err.message;
            setError(errorMessage);
            setErrDetails(errorDetails);
        } finally {
            setLoading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h2 className="font-display text-3xl font-bold mb-6 text-center">OCR Image Processing</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div 
                    className={`neo-card p-6 transition-all duration-200 ${dragActive ? 'ring-4 ring-offset-2 ring-blue-50' : ''} relative`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerFileInput(); }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="sr-only"
                        aria-label="Choose file"
                    />
                    
                    <div className="text-center">
                        <div className="neo-border neo-shadow inline-flex items-center justify-center w-16 h-16 mb-4 bg-white">
                            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 00-3.182 0l-3.543 3.543a11.067 11.067 0 01-6.166 0l-3.543-3.543a2.25 2.25 0 00-3.182 0L2.25 14.25m0 0l1.5-1.5m0 0l-1.5 1.5m3.063-4.5l14.91-14.91a11.067 11.067 0 0115.76 0l1.503 1.503a11.067 11.067 0 010 15.758L14.31 20.25a11.067 11.067 0 01-15.76 0l1.502-1.502a11.067 11.067 0 010-15.758z" />
                            </svg>
                        </div>
                        <p className="font-display text-xl font-bold mb-1 text-black">Upload Image or PDF</p>
                        <p className="text-gray-60 mb-2">Drag & drop or click to browse</p>
                        <p className="text-sm text-gray-50">Supports: JPG, PNG, WebP, PDF (max 10MB; first 10 PDF pages)</p>
                    </div>

                    {selectedFile && (
                        <div className="mt-4 p-3 neo-border bg-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="neo-border neo-shadow p-2 bg-blue-10">
                                    <svg className="w-5 h-5 text-blue-60" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-black text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                                    <p className="text-xs text-gray-50">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedFile(null);
                                    setPreview(null);
                                    setError(null);
                                    setErrDetails(null);
                                    fileInputRef.current.value = '';
                                }}
                                className="neo-border neo-shadow p-2 text-red-60 hover:bg-red-10 transition-colors"
                                aria-label="Remove file"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {preview && selectedFile && (
                    <div className="neo-card p-4">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-w-full h-auto neo-border mx-auto"
                        />
                    </div>
                )}

                <div className="flex flex-col text-left">
                    <label htmlFor="language-select" className="font-display font-bold text-sm text-black mb-2">Select OCR Language</label>
                    <select
                        id="language-select"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        disabled={loading}
                        className="w-full p-3 neo-border bg-white text-black font-semibold focus:outline-none"
                    >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                                {lang.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={!selectedFile || loading}
                    className={`neo-btn w-full py-4 text-lg ${!selectedFile || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                        </span>
                    ) : (
                        'Extract Text'
                    )}
                </button>
            </form>

            {error && (
                <div className="mt-6 neo-border neo-shadow bg-red-10 p-4 border-red-60">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-60 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        <div className="flex-1">
                            <p className="text-red-60 font-semibold">Error</p>
                            <p className="text-red-60 text-sm mt-1">{error}</p>
                            {errDetails && <p className="text-red-50 text-xs mt-2 font-mono">{errDetails}</p>}
                        </div>
                    </div>
                </div>
            )}

            {result && (
                <div className="mt-6 neo-card p-6 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display text-xl font-bold text-black">Extracted Text:</h3>
                        <button
                            onClick={handleCopy}
                            className="neo-btn px-4 py-2 text-sm whitespace-nowrap"
                        >
                            {copied ? 'Copied!' : 'Copy Text'}
                        </button>
                    </div>
                    <div className="neo-border p-4 bg-white min-h-[150px] whitespace-pre-wrap font-mono text-black">
                        {result.text || 'No text detected'}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        {result.confidence && (
                            <div className="flex items-center gap-2 neo-border px-3 py-2 bg-blue-10">
                                <svg className="w-4 h-4 text-blue-60" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                <span className="font-semibold text-blue-60">Confidence: {(result.confidence * 100).toFixed(2)}%</span>
                            </div>
                        )}
                        {result.language && (
                            <div className="flex items-center gap-2 neo-border px-3 py-2 bg-indigo-10">
                                <svg className="w-4 h-4 text-indigo-60" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                                </svg>
                                <span className="font-semibold text-indigo-60">Language: {result.language}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OCRComponent;
