const multer = require("multer");
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const Tesseract = require("tesseract.js");
const cacheService = require('../utils/cache');

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

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error("Only image files are allowed"));
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported image type. Allowed types: ${allowedTypes.join(', ')}`));
        }
    }
});

const generateImageHash = (buffer) => {
    return crypto.createHash('md5').update(buffer).digest('hex');
};

const performOCR = async (req, res) => {
    try {
        console.log("OCR request received");
        console.log("Request file:", req.file);

        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        const imageHash = generateImageHash(req.file.buffer);
        console.log("Image hash:", imageHash);

        const cachedResult = await cacheService.getCachedOCRResult(imageHash);
        if (cachedResult) {
            console.log(`Cache hit for OCR result: ${imageHash}`);
            return res.json({
                ...cachedResult,
                _cached: true,
                _cachedAt: new Date().toISOString()
            });
        }

        console.log("Processing image with OCR.space API (with tesseract.js fallback)...");
        console.log("File details:", {
            mimetype: req.file.mimetype,
            size: req.file.size,
            buffer: req.file.buffer ? "Buffer present" : "No buffer"
        });

        const apiKey = process.env.OCR_SPACE_API_KEY;
        const language = req.body.language || req.query.language || 'eng';

        let ocrResult;
        let usedOCRSpace = false;

        if (apiKey) {
            const formData = new FormData();
            formData.append('image', req.file.buffer, {
                filename: req.file.originalname || 'image.png',
                contentType: req.file.mimetype
            });
            formData.append('language', language);

            try {
                usedOCRSpace = true;
                const response = await axios.post(
                    'https://api.ocr.space/parse/image',
                    formData,
                    {
                        headers: {
                            'apikey': apiKey,
                            ...formData.getHeaders()
                        },
                        timeout: 60000,
                    }
                );

                console.log("OCR.space API response:", JSON.stringify(response.data).substring(0, 500));

                const responseData = response.data;

                if (responseData.IsErroredOnProcessing) {
                    throw new Error(`OCR processing failed: ${responseData.ErrorMessage || 'Unknown error'}`);
                }

                if (responseData.OCRExitCode !== 1) {
                    throw new Error(`OCR exited with code ${responseData.OCRExitCode}`);
                }

                if (!responseData.ParsedResults || responseData.ParsedResults.length === 0) {
                    return res.status(400).json({
                        error: "No text detected in image",
                        details: "The image might be unclear or contain no readable text"
                    });
                }

                const text = (responseData.ParsedResults[0].ParsedText || '').trim();
                if (!text || text.length < 2) {
                    return res.status(400).json({
                        error: "No valid text detected in image",
                        details: "The image might be unclear or contain no readable text"
                    });
                }

                ocrResult = {
                    text: text,
                    confidence: null,
                    language: responseData.ParsedResults[0].TextOverlay?.Language || language,
                    parsedResults: responseData.ParsedResults,
                    processedAt: new Date().toISOString()
                };

            } catch (apiError) {
                console.warn("OCR.space failed, falling back to tesseract.js:", apiError.message);
            }
        }

        if (!ocrResult) {
            console.log("Falling back to tesseract.js for OCR...");
            try {
                const tempImagePath = path.join(
                    require("os").tmpdir(),
                    `ocr_fallback_${Date.now()}.${req.file.mimetype.split("/")[1] || "png"}`
                );
                fs.writeFileSync(tempImagePath, req.file.buffer);

                const tesseractLang = ocrToTesseractLang[language] || 'eng';
                const tesseractResult = await Tesseract.recognize(tempImagePath, tesseractLang, {
                    logger: (m) => console.log("Tesseract progress:", m.progress * 100, "%"),
                });

                fs.unlinkSync(tempImagePath);

                const tesseractText = (tesseractResult.data.text || "").trim();
                if (!tesseractText || tesseractText.length < 2) {
                    throw new Error("No valid text detected by tesseract.js");
                }

                ocrResult = {
                    text: tesseractText,
                    confidence: tesseractResult.data.confidence ? tesseractResult.data.confidence / 100 : null,
                    language: language,
                    fallback: "tesseract.js",
                    processedAt: new Date().toISOString(),
                };
            } catch (tesseractError) {
                console.error("tesseract.js fallback also failed:", tesseractError.message);
                if (usedOCRSpace) {
                    throw new Error(`OCR.space failed and tesseract.js fallback also failed: ${tesseractError.message}`);
                }
                throw tesseractError;
            }
        }

        await cacheService.cacheOCRResult(imageHash, ocrResult);
        res.json(ocrResult);

    } catch (error) {
        console.error("OCR processing error:", error.message);
        res.status(500).json({
            error: "Failed to process image",
            details: error.message || "Unknown error occurred",
            type: error.name
        });
    }
};

const performBatchOCR = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No image files provided" });
        }

        if (req.files.length > 5) {
            return res.status(400).json({ error: "Maximum 5 images allowed per batch" });
        }

        const apiKey = process.env.OCR_SPACE_API_KEY;

        const results = [];
        const uncachedImages = [];

        for (const file of req.files) {
            const imageHash = generateImageHash(file.buffer);
            const cachedResult = await cacheService.getCachedOCRResult(imageHash);

            if (cachedResult) {
                console.log(`Cache hit for batch OCR: ${imageHash}`);
                results.push({
                    filename: file.originalname,
                    ...cachedResult,
                    _cached: true
                });
            } else {
                uncachedImages.push({ file, imageHash });
            }
        }

        for (const { file, imageHash } of uncachedImages) {
            let ocrResult;
            let usedOCRSpace = false;

            if (apiKey) {
                try {
                    const formData = new FormData();
                    formData.append('image', file.buffer, {
                        filename: file.originalname || 'image.png',
                        contentType: file.mimetype
                    });

                    usedOCRSpace = true;
                    const response = await axios.post(
                        'https://api.ocr.space/parse/image',
                        formData,
                        {
                            headers: {
                                'apikey': apiKey,
                                ...formData.getHeaders()
                            },
                            timeout: 60000,
                        }
                    );

                    const responseData = response.data;

                    if (responseData.IsErroredOnProcessing) {
                        results.push({
                            filename: file.originalname,
                            error: responseData.ErrorMessage || 'OCR processing failed'
                        });
                        continue;
                    }

                    if (responseData.OCRExitCode !== 1 || !responseData.ParsedResults || responseData.ParsedResults.length === 0) {
                        results.push({
                            filename: file.originalname,
                            error: "No text detected in image"
                        });
                        continue;
                    }

                    const text = (responseData.ParsedResults[0].ParsedText || '').trim();
                    ocrResult = {
                        filename: file.originalname,
                        text: text,
                        confidence: null,
                        language: responseData.ParsedResults[0].TextOverlay?.Language || 'eng',
                        parsedResults: responseData.ParsedResults,
                        processedAt: new Date().toISOString()
                    };

                } catch (apiError) {
                    console.warn(`OCR.space failed for ${file.originalname}, trying tesseract.js fallback:`, apiError.message);
                }
            }

            if (!ocrResult) {
                console.log(`Falling back to tesseract.js for ${file.originalname}...`);
                try {
                    const tempImagePath = path.join(
                        require("os").tmpdir(),
                        `ocr_batch_${Date.now()}_${file.originalname}`
                    );
                    fs.writeFileSync(tempImagePath, file.buffer);

                    const tesseractResult = await Tesseract.recognize(tempImagePath, "eng", {
                        logger: () => {},
                    });

                    fs.unlinkSync(tempImagePath);

                    const tesseractText = (tesseractResult.data.text || "").trim();
                    if (tesseractText && tesseractText.length >= 2) {
                        ocrResult = {
                            filename: file.originalname,
                            text: tesseractText,
                            confidence: null,
                            language: "eng",
                            fallback: "tesseract.js",
                            processedAt: new Date().toISOString(),
                        };
                    }
                } catch (_tesseractError) {
                    console.error(`Tesseract fallback failed for ${file.originalname}:`, _tesseractError.message);
                }
            }

            if (ocrResult) {
                await cacheService.cacheOCRResult(imageHash, ocrResult);
                results.push(ocrResult);
            } else {
                results.push({
                    filename: file.originalname,
                    error: "Failed to process image with all OCR engines"
                });
            }
        }

        res.json({
            results,
            total: results.length,
            cached: results.filter(r => r._cached).length,
            processed: results.filter(r => !r._cached && !r.error).length,
            errors: results.filter(r => r.error).length
        });

    } catch (error) {
        console.error("Batch OCR processing error:", error.message);
        res.status(500).json({
            error: "Failed to process batch images",
            details: error.message
        });
    }
};

module.exports = {
    upload,
    performOCR,
    performBatchOCR
};