const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.patch("/read-all", authMiddleware, markAllNotificationsRead);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.delete("/:id", authMiddleware, deleteNotification);
router.delete("/", authMiddleware, clearAllNotifications);

module.exports = router;
