const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  // Supabase user IDs are UUID strings, not MongoDB ObjectIds.
  sender: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true,
    enum: ["general", "doubt", "community", "reviews"],
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
messageSchema.index({ room: 1, timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 
