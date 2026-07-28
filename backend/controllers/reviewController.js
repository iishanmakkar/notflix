const Review = require("../models/Review");
const Note = require("../models/Note");
const cacheService = require("../utils/cache");
const mongoose = require("mongoose");

const createReview = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const note = await Note.findById(noteId);
    if (!note) return res.status(404).json({ error: "Note not found" });
    if (note.status !== "approved") return res.status(403).json({ error: "Cannot review unapproved note" });

    const existing = await Review.findOne({ note: noteId, user: req.user._id });
    if (existing) return res.status(400).json({ error: "You have already reviewed this note" });

    const review = await Review.create({
      note: noteId,
      user: req.user._id,
      rating,
      comment: comment || "",
    });

    await updateNoteRating(noteId);
    await cacheService.invalidateNoteCache(noteId);

    const populated = await Review.findById(review._id).populate("user", "name");
    res.status(201).json({ review: populated });
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

    const [reviews, total] = await Promise.all([
      Review.find({ note: noteId })
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments({ note: noteId })
    ]);

    res.json({
      reviews,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalReviews: total,
        hasMore: pageNum * limitNum < total
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
    const review = await Review.findOne({ note: noteId, user: req.user._id }).populate("user", "name");
    if (!review) return res.status(404).json({ error: "No review found" });
    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch review" });
  }
};

const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, user: req.user._id },
      { rating, comment: comment || "" },
      { new: true }
    ).populate("user", "name");

    if (!review) return res.status(404).json({ error: "Review not found" });

    await updateNoteRating(review.note);
    await cacheService.invalidateNoteCache(review.note);

    res.json({ review });
  } catch (err) {
    console.error("UPDATE REVIEW ERROR >>>", err);
    res.status(500).json({ error: "Failed to update review" });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findOneAndDelete({ _id: reviewId, user: req.user._id });
    if (!review) return res.status(404).json({ error: "Review not found" });

    await updateNoteRating(review.note);
    await cacheService.invalidateNoteCache(review.note);

    res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("DELETE REVIEW ERROR >>>", err);
    res.status(500).json({ error: "Failed to delete review" });
  }
};

const updateNoteRating = async (noteId) => {
  const agg = await Review.aggregate([
    { $match: { note: new mongoose.Types.ObjectId(noteId) } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);
  const { avgRating = 0, count = 0 } = agg[0] || {};
  await Note.findByIdAndUpdate(noteId, {
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: count
  });
};

module.exports = { createReview, getReviews, getUserReview, updateReview, deleteReview };