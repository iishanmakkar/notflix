const { supabase } = require("../utils/supabaseClient");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");
const streamifier = require('streamifier');
const cacheService = require('../utils/cache');

const isOwnerOrAdmin = (note, user) =>
  user.role === "admin" || String(note.uploadedBy?.id || note.uploadedBy?._id || note.uploadedBy) === String(user.id || user._id);

const normalizeNote = (note) => {
  if (!note) return null;
  const n = {
    ...note,
    _id: note.id,
    createdAt: note.createdAt || note.created_at,
    updatedAt: note.updatedAt || note.updated_at
  };
  if (n.uploadedBy && typeof n.uploadedBy === 'object') {
    n.uploadedBy = {
      ...n.uploadedBy,
      _id: n.uploadedBy.id
    };
  }
  if (n.reviewedBy && typeof n.reviewedBy === 'object') {
    n.reviewedBy = {
      ...n.reviewedBy,
      _id: n.reviewedBy.id
    };
  }
  return n;
};

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

    const { data: note, error } = await supabase
      .from("notes")
      .select(`
        *,
        uploadedBy:users!notes_uploadedBy_fkey (
          id,
          name,
          email
        )
      `)
      .eq("id", id)
      .single();

    if (error || !note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const normNote = normalizeNote(note);

    if (normNote.status !== "approved" && !isOwnerOrAdmin(normNote, req.user)) {
      return res.status(403).json({ error: "You do not have access to this note" });
    }

    if (normNote.isPremium && (!req.user || (!req.user.isPremium && req.user.role !== "admin"))) {
      return res.status(403).json({ error: "Special access needed. Coming soon!" });
    }

    // Cache the note for future requests
    await cacheService.cacheNote(id, normNote);

    res.status(200).json(normNote);
  } catch (err) {
    console.error("GET NOTE ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to fetch note" });
  }
};

const getAllNotes = async (req, res) => {
  try {
    const { subject } = req.query;
    
    const cachedNotes = await cacheService.getCachedNotesList(subject);
    if (cachedNotes) {
      return res.status(200).json({
        notes: Array.isArray(cachedNotes) ? cachedNotes : Object.values(cachedNotes),
        _cached: true,
        _cachedAt: new Date().toISOString()
      });
    }

    let query = supabase
      .from("notes")
      .select(`
        *,
        uploadedBy:users!notes_uploadedBy_fkey (
          id,
          name,
          email
        )
      `)
      .eq("status", "approved");

    if (subject) {
      query = query.eq("subject", subject.toLowerCase());
    }

    const { data: notes, error } = await query
      .order("createdAt", { ascending: false })
      .limit(50);

    if (error) throw error;

    const normNotes = (notes || []).map(normalizeNote);

    await cacheService.cacheNotesList(subject, normNotes);

    res.status(200).json({ notes: normNotes });
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
    const uploadedBy = req.user.id || req.user._id;

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

    const isAdmin = req.user.role === 'admin';
    const noteInsert = {
      title: title.trim(),
      content: description.trim(),
      subject: normalizedSubject,
      uploadedBy,
      fileUrl: cloudinaryResult.secure_url,
      cloudinaryId: cloudinaryResult.public_id,
      isPremium: isPremium === 'true',
      status: isAdmin ? 'approved' : 'pending',
      ...(isAdmin && {
        reviewedAt: new Date().toISOString(),
        reviewedBy: uploadedBy,
      }),
    };

    // Save note to database
    const { data: savedNote, error } = await supabase
      .from("notes")
      .insert(noteInsert)
      .select(`
        *,
        uploadedBy:users!notes_uploadedBy_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) throw error;
    console.log("Note saved successfully:", savedNote);

    const normSavedNote = normalizeNote(savedNote);

    // Only notify admins for pending (non-admin) uploads
    if (!isAdmin) {
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length) {
        const notifs = admins.map((admin) => ({
          recipient: admin.id,
          actor: uploadedBy,
          type: "note_submitted",
          title: "New note awaiting review",
          message: `${req.user.name} uploaded “${normSavedNote.title}”.`,
          link: "/admin",
        }));
        await supabase.from("notifications").insert(notifs);
      }
    }

    // Invalidate relevant caches
    await cacheService.invalidateNoteCache(normSavedNote.id);

    res.status(201).json({ 
      message: isAdmin ? "Note uploaded and auto-approved" : "Note uploaded successfully", 
      note: normSavedNote 
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
      updateData.content = description.trim();
    }

    if (subject && typeof subject === 'string') {
      updateData.subject = subject.trim().toLowerCase();
    }

    const { data: existingNote, error: fetchErr } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    const normExistingNote = normalizeNote(existingNote);

    if (!isOwnerOrAdmin(normExistingNote, req.user)) {
      return res.status(403).json({ error: "You can only update your own notes" });
    }

    // If a new file is uploaded, delete the old one and update
    if (req.file) {
      if (normExistingNote.cloudinaryId) {
        await cloudinary.uploader.destroy(normExistingNote.cloudinaryId);
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

    const { data: updatedNote, error: updateErr } = await supabase
      .from("notes")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        uploadedBy:users!notes_uploadedBy_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (updateErr) throw updateErr;

    const normUpdatedNote = normalizeNote(updatedNote);

    // Invalidate relevant caches
    await cacheService.invalidateNoteCache(id);

    res.status(200).json({
      message: "Note updated successfully",
      note: normUpdatedNote
    });
  } catch (err) {
    console.error("UPDATE NOTE ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to update note" });
  }
};

const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: note, error: fetchErr } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const normNote = normalizeNote(note);

    if (!isOwnerOrAdmin(normNote, req.user)) {
      return res.status(403).json({ error: "You can only delete your own notes" });
    }

    // Fire-and-forget Cloudinary delete (non-blocking)
    if (normNote.cloudinaryId) {
      cloudinary.uploader.destroy(normNote.cloudinaryId).catch(err =>
        console.warn('Cloudinary delete warning:', err.message)
      );
    }

    // Delete note from database
    const { error: deleteErr } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    await cacheService.invalidateNoteCache(id);

    res.status(200).json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("DELETE NOTE ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to delete note" });
  }
};

const getPendingNotes = async (req, res) => {
  try {
    const { data: notes, error } = await supabase
      .from("notes")
      .select(`
        *,
        uploadedBy:users!notes_uploadedBy_fkey (
          id,
          name,
          email
        )
      `)
      .eq("status", "pending")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    const normNotes = (notes || []).map(normalizeNote);
    res.status(200).json(normNotes);
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

    const { data: note, error: updateErr } = await supabase
      .from("notes")
      .update({
        status,
        reviewComment: trimmedComment,
        reviewedAt: new Date().toISOString(),
        reviewedBy: req.user.id || req.user._id,
      })
      .eq("id", noteId)
      .select(`
        *,
        uploadedBy:users!notes_uploadedBy_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (updateErr || !note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const normNote = normalizeNote(note);

    // Create notification and invalidate cache in parallel
    await Promise.all([
      supabase.from("notifications").insert({
        recipient: normNote.uploadedBy.id || normNote.uploadedBy._id || normNote.uploadedBy,
        actor: req.user.id || req.user._id,
        type: status === "approved" ? "note_approved" : "note_rejected",
        title: status === "approved" ? "Your note was approved" : "Your note was rejected",
        message: status === "approved"
          ? `Your note “${normNote.title}” is now available to students.`
          : `Your note “${normNote.title}” was not approved.${trimmedComment ? ` Feedback: ${trimmedComment}` : ""}`,
        link: "/notes",
      }),
      cacheService.invalidateNoteCache(noteId),
    ]);

    res.status(200).json({
      message: `Note ${status} successfully`,
      note: normNote
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
    
    let query = supabase
      .from("notes")
      .select(`
        *,
        uploadedBy:users!notes_uploadedBy_fkey (
          id,
          name,
          email
        ),
        reviewedBy:users!notes_reviewedBy_fkey (
          id,
          name
        )
      `, { count: "exact" });
    
    if (status) {
      query = query.eq("status", status);
    }
    
    if (subject) {
      query = query.eq("subject", subject.toLowerCase());
    }

    const skip = (pageNumber - 1) * pageSize;
    const { data: notes, count: total, error } = await query
      .order("createdAt", { ascending: false })
      .range(skip, skip + pageSize - 1);

    if (error) throw error;

    const normNotes = (notes || []).map(normalizeNote);

    res.status(200).json({
      notes: normNotes,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil((total || 0) / pageSize),
        totalNotes: total || 0,
        hasNext: pageNumber * pageSize < (total || 0),
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
    const { error } = await supabase.rpc("increment_views", { note_id: id });
    if (error) throw error;
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

    const token = req.query.token;
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const { findUserById } = require("../utils/db");
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await findUserById(decoded.userId);
        if (user) {
          req.user = user;
        }
      } catch (err) {
        console.warn("Download token verification failed:", err.message);
      }
    }

    const { data: note, error: fetchErr } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const normNote = normalizeNote(note);

    if (normNote.status !== "approved") {
      return res.status(403).json({ error: "This note is not yet available for download" });
    }

    if (normNote.isPremium && (!req.user || !req.user.isPremium && req.user?.role !== "admin")) {
      return res.status(403).json({ error: "Special access needed. Coming soon!" });
    }

    try {
      await supabase.rpc("increment_downloads", { note_id: id });
      await cacheService.invalidateNoteCache(id);
    } catch (_err) {
      console.warn('Failed to increment download count');
    }

    // Force browser local download by setting attachment headers and streaming the file
    const safeTitle = normNote.title.replace(/[^a-zA-Z0-9]/g, "_");
    const extension = normNote.fileUrl.split('.').pop() || 'pdf';
    
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${extension}"`);
    res.setHeader('Content-Type', extension === 'pdf' ? 'application/pdf' : 'application/octet-stream');

    const fileStreamResponse = await axios({
      method: 'get',
      url: normNote.fileUrl,
      responseType: 'stream'
    });
    
    fileStreamResponse.data.pipe(res);
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
