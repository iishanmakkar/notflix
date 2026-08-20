const { supabase } = require("../utils/supabaseClient");
const cacheService = require("../utils/cache");

const normalizeReview = (review) => {
  if (!review) return null;
  const r = {
    ...review,
    _id: review.id,
    createdAt: review.createdAt || review.created_at,
    updatedAt: review.updatedAt || review.updated_at
  };
  if (r.user && typeof r.user === 'object') {
    r.user = {
      ...r.user,
      _id: r.user.id
    };
  }
  return r;
};

const createReview = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id || req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const { data: note, error: fetchErr } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single();

    if (fetchErr || !note) return res.status(404).json({ error: "Note not found" });
    if (note.status !== "approved") return res.status(403).json({ error: "Cannot review unapproved note" });

    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("note", noteId)
      .eq("user", userId)
      .maybeSingle();

    if (existing) return res.status(400).json({ error: "You have already reviewed this note" });

    const { data: review, error: createErr } = await supabase
      .from("reviews")
      .insert({
        note: noteId,
        user: userId,
        rating,
        comment: comment || "",
      })
      .select(`
        *,
        user:users!reviews_user_fkey (
          id,
          name
        )
      `)
      .single();

    if (createErr) throw createErr;

    await updateNoteRating(noteId);
    await cacheService.invalidateNoteCache(noteId);

    const normReview = normalizeReview(review);
    res.status(201).json({ review: normReview });
  } catch (err) {
    console.error("CREATE REVIEW ERROR >>>", err);
    res.status(500).json({ error: err.message || "Failed to create review" });
  }
};

const getReviews = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const { data: reviews, count: total, error } = await supabase
      .from("reviews")
      .select(`
        *,
        user:users!reviews_user_fkey (
          id,
          name
        )
      `, { count: "exact" })
      .eq("note", noteId)
      .order("createdAt", { ascending: false })
      .range(skip, skip + limitNum - 1);

    if (error) throw error;

    const normReviews = (reviews || []).map(normalizeReview);

    res.json({
      reviews: normReviews,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil((total || 0) / limitNum),
        totalReviews: total || 0,
        hasMore: pageNum * limitNum < (total || 0)
      }
    });
  } catch (err) {
    console.error("GET REVIEWS ERROR >>>", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

const getUserReview = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id || req.user._id;

    const { data: review, error } = await supabase
      .from("reviews")
      .select(`
        *,
        user:users!reviews_user_fkey (
          id,
          name
        )
      `)
      .eq("note", noteId)
      .eq("user", userId)
      .single();

    if (error || !review) return res.status(404).json({ error: "No review found" });
    res.json({ review: normalizeReview(review) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch review" });
  }
};

const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id || req.user._id;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const updateFields = {};
    if (rating) updateFields.rating = rating;
    if (comment !== undefined) updateFields.comment = comment || "";

    const { data: review, error } = await supabase
      .from("reviews")
      .update(updateFields)
      .eq("id", reviewId)
      .eq("user", userId)
      .select(`
        *,
        user:users!reviews_user_fkey (
          id,
          name
        )
      `)
      .single();

    if (error || !review) return res.status(404).json({ error: "Review not found" });

    await updateNoteRating(review.note);
    await cacheService.invalidateNoteCache(review.note);

    res.json({ review: normalizeReview(review) });
  } catch (err) {
    console.error("UPDATE REVIEW ERROR >>>", err);
    res.status(500).json({ error: "Failed to update review" });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id || req.user._id;

    const { data: review, error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("user", userId)
      .select()
      .single();

    if (error || !review) return res.status(404).json({ error: "Review not found" });

    await updateNoteRating(review.note);
    await cacheService.invalidateNoteCache(review.note);

    res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("DELETE REVIEW ERROR >>>", err);
    res.status(500).json({ error: "Failed to delete review" });
  }
};

const updateNoteRating = async (noteId) => {
  try {
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("note", noteId);

    if (error) throw error;

    const count = reviews.length;
    const avgRating = count > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count 
      : 0;

    const roundedRating = Math.round(avgRating * 10) / 10;

    await supabase
      .from("notes")
      .update({
        rating: roundedRating,
        reviewCount: count
      })
      .eq("id", noteId);
  } catch (err) {
    console.error("Error in updateNoteRating:", err);
  }
};

module.exports = { createReview, getReviews, getUserReview, updateReview, deleteReview };