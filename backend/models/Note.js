const mongoose = require("mongoose");
const User = require("./User");

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewComment: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reviewedAt: {
      type: Date
    },
    subject: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true
    },
    cloudinaryId: {
      type: String,
      required: true
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Indexes for query performance
noteSchema.index({ status: 1, createdAt: -1 });
noteSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model("Note", noteSchema);
