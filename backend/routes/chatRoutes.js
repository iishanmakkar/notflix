const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

// Get messages for a specific room (public)
router.get('/messages/:room', async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room", req.params.room)
      .order("timestamp", { ascending: true });

    if (error) throw error;

    const formattedMessages = (messages || []).map((message) => ({
      _id: message.id,
      sender: String(message.sender),
      senderName: message.senderName,
      content: message.content,
      room: message.room,
      isAdmin: message.isAdmin,
      timestamp: message.timestamp,
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Delete a message (admin only)
router.delete('/messages/:messageId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { data: message, error: fetchErr } = await supabase
      .from("messages")
      .select("id")
      .eq("id", req.params.messageId)
      .single();
    
    if (fetchErr || !message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const { error: deleteErr } = await supabase
      .from("messages")
      .delete()
      .eq("id", req.params.messageId);

    if (deleteErr) throw deleteErr;
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
});

module.exports = router;
