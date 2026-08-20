const { supabase } = require("../utils/supabaseClient");

const normalizeNotification = (notif) => {
  if (!notif) return null;
  const n = {
    ...notif,
    _id: notif.id,
    createdAt: notif.createdAt || notif.created_at,
    updatedAt: notif.updatedAt || notif.updated_at
  };
  if (n.actor && typeof n.actor === 'object') {
    n.actor = {
      ...n.actor,
      _id: n.actor.id
    };
  }
  return n;
};

const getNotifications = async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const [notifResult, countResult] = await Promise.all([
      supabase
        .from("notifications")
        .select(`
          *,
          actor:users!notifications_actor_fkey (
            id,
            name
          )
        `)
        .eq("recipient", userId)
        .order("createdAt", { ascending: false })
        .limit(50),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient", userId)
        .eq("isRead", false)
    ]);

    if (notifResult.error) throw notifResult.error;
    if (countResult.error) throw countResult.error;

    const normNotifs = (notifResult.data || []).map(normalizeNotification);
    res.json({
      notifications: normNotifs,
      unreadCount: countResult.count || 0
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR >>>", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

const markNotificationRead = async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const { data: notification, error } = await supabase
      .from("notifications")
      .update({ isRead: true })
      .eq("id", req.params.id)
      .eq("recipient", userId)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ notification: normalizeNotification(notification) });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
};

const markAllNotificationsRead = async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ isRead: true })
      .eq("recipient", userId)
      .eq("isRead", false);

    if (error) throw error;

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
};

const deleteNotification = async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const { data: notification, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", req.params.id)
      .eq("recipient", userId)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
};

const clearAllNotifications = async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("recipient", userId);

    if (error) throw error;

    res.json({ message: "All notifications cleared" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear notifications" });
  }
};

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications };
