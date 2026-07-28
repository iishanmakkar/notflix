const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const { createReview, getReviews, getUserReview, updateReview, deleteReview } = require("../controllers/reviewController");

router.get("/:noteId", getReviews);
router.get("/:noteId/user", authMiddleware, getUserReview);

router.post("/:noteId", authMiddleware, createReview);
router.put("/:reviewId", authMiddleware, updateReview);
router.delete("/:reviewId", authMiddleware, deleteReview);

module.exports = router;