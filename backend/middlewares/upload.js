const multer = require("multer");

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific file types
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
}).single('file');

const hasValidFileSignature = (file) => {
  const header = file.buffer.subarray(0, 8);
  if (file.mimetype === 'application/pdf') return header.toString('ascii', 0, 5) === '%PDF-';
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return header[0] === 0x50 && header[1] === 0x4b;
  }
  // Plain-text notes must not contain binary control bytes.
  return !file.buffer.subarray(0, 1024).includes(0);
};

const validateUploadedFile = (req, res, next) => {
  if (!req.file || !hasValidFileSignature(req.file)) {
    return res.status(400).json({ error: 'The uploaded file content does not match its declared type.' });
  }
  return next();
};

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
  console.error('Upload error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  
  next(err);
};

// Image upload configuration (for profile pictures)
const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
}).single('profileImage');

module.exports = { upload, uploadImage, validateUploadedFile, handleMulterError };
