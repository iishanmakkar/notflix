const Note = require("../models/Note");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");
const User = require("../models/User");
const Notification = require("../models/Notification");
const streamifier = require('streamifier');
const cacheService = require('../utils/cache');

const isOwnerOrAdmin = (note, user) =>
  user.role === "admin" || String(note.uploadedBy?._id || note.uploadedBy) === String(user._id);

const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check cache first
    const cachedNote = await cacheService.getCachedNote(id);
    if (cachedNote) {
      if (cachedNote.status !== "approved" && !isOwnerOrAdmin(cachedNote, req.user)) {
        return res.status(403).json({ error: "You do not have access to this note" });
      }
      console.log(`📦 Cache hit for note: ${id}`);
      return res.status(200).json({
        ...cachedNote,
        _cached: true,
        _cachedAt: new Date().toISOString()
      });
    }

    const note = await Note.findById(id).populate("uploadedBy", "name email");

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (note.status !== "approved" && !isOwnerOrAdmin(note, req.user)) {
      return res.status(403).json({ error: "You do not have access to this note" });
    }

    if (note.isPremium && (!req.user || (!req.user.isPremium && req.user.role !== "admin"))) {
      return res.status(403).json({ error: "Premium subscription required to view this note" });
    }

    // Cache the note for future requests
    await cacheService.cacheNote(id, note);

    res.status(200).json(note);
  } catch (err) {
    console.error("GET NOTE ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to fetch note" });
  }
};

const getAllNotes = async (req, res) => {
  try {
    const { subject } = req.query;
    let filter = { status: 'approved' };
    if (subject) {
      filter.subject = subject.toLowerCase();
    }

    const cachedNotes = await cacheService.getCachedNotesList(subject);
    if (cachedNotes) {
      return res.status(200).json({
        notes: Array.isArray(cachedNotes) ? cachedNotes : Object.values(cachedNotes),
        _cached: true,
        _cachedAt: new Date().toISOString()
      });
    }

    const notes = await Note.find(filter)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    await cacheService.cacheNotesList(subject, notes);

    res.status(200).json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

const uploadNote = async (req, res) => {
  try {
    console.log("Upload request received:", {
      body: req.body,
      file: req.file,
      user: req.user
    });

    const { title, description, subject, isPremium } = req.body;
    const uploadedBy = req.user._id;

    // Basic validations
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: "Title is required and should be at least 3 characters long." });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({ error: "Description is required and should be at least 5 characters long." });
    }

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: "Subject is required and must be a string." });
    }

    const normalizedSubject = subject.trim();

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Get file extension from original filename
    const fileExtension = req.file.originalname.split('.').pop();
    
    // Clean the title for use in filename
    const cleanTitle = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace special chars and spaces with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    // Create a unique identifier (last 6 chars of timestamp)
    const uniqueId = Date.now().toString().slice(-6);
    
    // Combine title and unique ID for the filename
    const publicId = `${cleanTitle}-${uniqueId}`;

    // Upload to Cloudinary using stream
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "notflix",
          resource_type: "auto",
          public_id: publicId,
          type: "upload",
          access_mode: "public",
          format: fileExtension,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const cloudinaryResult = await uploadPromise;
    console.log("File uploaded to Cloudinary:", cloudinaryResult);

    // Create new note - admin uploads are auto-approved, others go to pending review
    const isAdmin = req.user.role === 'admin';
    const newNote = new Note({
      title: title.trim(),
      content: description.trim(),
      subject: normalizedSubject,
      uploadedBy,
      fileUrl: cloudinaryResult.secure_url,
      cloudinaryId: cloudinaryResult.public_id,
      isPremium: isPremium === 'true',
      status: isAdmin ? 'approved' : 'pending',
      ...(isAdmin && {
        reviewedAt: new Date(),
        reviewedBy: uploadedBy,
      }),
    });

    // Save note to database
    const savedNote = await newNote.save();
    console.log("Note saved successfully:", savedNote);

    // Update user's notes array
    await User.findByIdAndUpdate(uploadedBy, {
      $push: { notes: savedNote._id }
    });
    console.log("User's notes array updated");

    // Only notify admins for pending (non-admin) uploads
    if (!isAdmin) {
      const admins = await User.find({ role: "admin" }).select("_id");
      if (admins.length) {
        await Notification.insertMany(admins.map((admin) => ({
          recipient: admin._id,
          actor: uploadedBy,
          type: "note_submitted",
          title: "New note awaiting review",
          message: `${req.user.name} uploaded “${savedNote.title}”.`,
          link: "/admin",
        })));
      }
    }

    // Invalidate relevant caches
    await cacheService.invalidateNoteCache(savedNote._id);

    res.status(201).json({ 
      message: isAdmin ? "Note uploaded and auto-approved" : "Note uploaded successfully", 
      note: savedNote 
    });

  } catch (err) {
    console.error("UPLOAD ERROR >>>", {
      message: err.message,
      stack: err.stack,
      name: err.name
    });

    res.status(500).json({ 
      error: err.message || "Failed to upload note. Please try again.",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, subject } = req.body;

    const updateData = {};

    if (title && typeof title === 'string' && title.trim().length >= 3) {
      updateData.title = title.trim();
    }

    if (description && typeof description === 'string' && description.trim().length >= 5) {
      updateData.description = description.trim();
    }

    if (subject && typeof subject === 'string') {
      updateData.subject = subject.trim().toLowerCase();
    }

    const existingNote = await Note.findById(id);
    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (!isOwnerOrAdmin(existingNote, req.user)) {
      return res.status(403).json({ error: "You can only update your own notes" });
    }

    // If a new file is uploaded, delete the old one and update
    if (req.file) {
      if (existingNote.cloudinaryId) {
        await cloudinary.uploader.destroy(existingNote.cloudinaryId);
      }
      const extension = req.file.originalname.split('.').pop();
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "notflix", resource_type: "auto", type: "upload", access_mode: "public", format: extension },
          (error, result) => error ? reject(error) : resolve(result)
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
      updateData.fileUrl = uploadResult.secure_url;
      updateData.cloudinaryId = uploadResult.public_id;
    }

    const updatedNote = await Note.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("uploadedBy", "name email");

    // Invalidate relevant caches
    await cacheService.invalidateNoteCache(id);

    res.status(200).json({
      message: "Note updated successfully",
      note: updatedNote
    });
  } catch (err) {
    console.error("UPDATE NOTE ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to update note" });
  }
};

const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (!isOwnerOrAdmin(note, req.user)) {
      return res.status(403).json({ error: "You can only delete your own notes" });
    }

    // Fire-and-forget Cloudinary delete (non-blocking)
    if (note.cloudinaryId) {
      cloudinary.uploader.destroy(note.cloudinaryId).catch(err =>
        console.warn('Cloudinary delete warning:', err.message)
      );
    }

    // Run independent operations in parallel
    await Promise.all([
      User.findByIdAndUpdate(note.uploadedBy, { $pull: { notes: note._id } }),
      Note.findByIdAndDelete(id),
      cacheService.invalidateNoteCache(id),
    ]);

    res.status(200).json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("DELETE NOTE ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to delete note" });
  }
};

const getPendingNotes = async (req, res) => {
  try {
    const notes = await Note.find({ status: 'pending' })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(notes);
  } catch (err) {
    console.error("GET PENDING NOTES ERROR >>>", err);
    res.status(500).json({ error: "Failed to fetch pending notes" });
  }
};

const reviewNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { status, reviewComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'" });
    }

    const trimmedComment = typeof reviewComment === "string" ? reviewComment.trim() : "";

    const note = await Note.findByIdAndUpdate(
      noteId,
      {
        status,
        reviewComment: trimmedComment,
        reviewedAt: new Date(),
        reviewedBy: req.user._id,
      },
      { new: true }
    ).populate("uploadedBy", "name email");

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Run notification creation and cache invalidation in parallel
    await Promise.all([
      Notification.create({
        recipient: note.uploadedBy,
        actor: req.user._id,
        type: status === "approved" ? "note_approved" : "note_rejected",
        title: status === "approved" ? "Your note was approved" : "Your note was rejected",
        message: status === "approved"
          ? `Your note “${note.title}” is now available to students.`
          : `Your note “${note.title}” was not approved.${trimmedComment ? ` Feedback: ${trimmedComment}` : ""}`,
        link: "/notes",
      }),
      cacheService.invalidateNoteCache(noteId),
    ]);

    res.status(200).json({
      message: `Note ${status} successfully`,
      note: note
    });
  } catch (err) {
    console.error("REVIEW NOTE ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to review note" });
  }
};

const getAllNotesAdmin = async (req, res) => {
  try {
    const { status, subject, page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
    
    let filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (subject) {
      filter.subject = subject.toLowerCase();
    }

    const skip = (pageNumber - 1) * pageSize;
    
    const notes = await Note.find(filter)
      .populate("uploadedBy", "name email")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const total = await Note.countDocuments(filter);

    res.status(200).json({
      notes,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / pageSize),
        totalNotes: total,
        hasNext: pageNumber * pageSize < total,
        hasPrev: pageNumber > 1
      }
    });
  } catch (err) {
    console.error("GET ALL NOTES ADMIN ERROR >>>", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

const incrementViews = async (req, res) => {
  try {
    const { id } = req.params;
    await Note.findByIdAndUpdate(id, { $inc: { views: 1 } });
    await cacheService.invalidateNoteCache(id);
    res.status(200).json({ message: "View counted" });
  } catch (err) {
    console.error("INCREMENT VIEWS ERROR >>>", err);
    res.status(500).json({ error: "Failed to count view" });
  }
};

const downloadNote = async (req, res) => {
  try {
    const { id } = req.params;

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (note.status !== "approved") {
      return res.status(403).json({ error: "This note is not yet available for download" });
    }

    if (note.isPremium && (!req.user || !req.user.isPremium && req.user?.role !== "admin")) {
      return res.status(403).json({ error: "Premium access required" });
    }

    try {
      await Note.findByIdAndUpdate(id, { $inc: { downloads: 1 } });
      await cacheService.invalidateNoteCache(id);
    } catch (_err) {
      console.warn('Failed to increment download count');
    }

    return res.redirect(note.fileUrl);
  } catch (err) {
    console.error("DOWNLOAD NOTE ERROR >>>", err);
    res.status(500).json({ error: "Failed to download note" });
  }
};

module.exports = {
  getNoteById,
  getAllNotes,
  uploadNote,
  updateNote,
  deleteNote,
  getPendingNotes,
  reviewNote,
  getAllNotesAdmin,
  downloadNote,
  incrementViews,
};
