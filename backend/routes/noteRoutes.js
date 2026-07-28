const express = require("express");
const router = express.Router();
const { upload, validateUploadedFile, handleMulterError } = require("../middlewares/upload");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { adminMiddleware } = require("../middlewares/adminMiddleware");
const { rateLimits } = require("../middlewares/rateLimit");

const {
  getAllNotes,
  uploadNote,
  updateNote,
  getNoteById,
  deleteNote,
  getPendingNotes,
  reviewNote,
  getAllNotesAdmin,
  downloadNote,
  incrementViews,
} = require("../controllers/noteController");


// Regular user routes
router.get("/", getAllNotes);
router.post("/", rateLimits.notesUpload, authMiddleware, upload, handleMulterError, validateUploadedFile, uploadNote);

// Admin routes
// These must be registered before /:id so "admin" is not interpreted as a note ID.
router.get("/admin/all", rateLimits.admin, authMiddleware, adminMiddleware, getAllNotesAdmin);
router.get("/admin/pending", rateLimits.admin, authMiddleware, adminMiddleware, getPendingNotes);
router.post("/admin/review/:noteId", rateLimits.admin, authMiddleware, adminMiddleware, reviewNote);

// View count
router.post("/:id/view", rateLimits.notes, incrementViews);

// Download note file (public redirect, auth handled by controller for privacy)
router.get("/:id/download", downloadNote);

router.get("/:id", rateLimits.notes, authMiddleware, getNoteById);
router.put("/:id", rateLimits.notesUpload, authMiddleware, upload, handleMulterError, validateUploadedFile, updateNote);
router.delete("/:id", rateLimits.notes, authMiddleware, deleteNote);

module.exports = router;
