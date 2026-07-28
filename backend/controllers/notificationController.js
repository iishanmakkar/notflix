const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("actor", "name");
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR >>>", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete(
      { _id: req.params.id, recipient: req.user._id }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.json({ message: "All notifications cleared" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear notifications" });
  }
};

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications };
