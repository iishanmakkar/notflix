import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, FileCheck2, FilePlus2, FileX2, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const notificationIcon = {
  note_submitted: FilePlus2,
  note_approved: FileCheck2,
  note_rejected: FileX2,
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const loadNotifications = async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, { headers: headers() });
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Notifications should never interrupt the main application flow.
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const markRead = async (notification) => {
    if (!notification.isRead) {
      await fetch(`${API_BASE}/api/notifications/${notification._id}/read`, {
        method: "PATCH",
        headers: headers(),
      });
      setNotifications((items) => items.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setIsOpen(false);
  };

  const markAllRead = async () => {
    await fetch(`${API_BASE}/api/notifications/read-all`, { method: "PATCH", headers: headers() });
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    await fetch(`${API_BASE}/api/notifications`, { method: "DELETE", headers: headers() });
    setNotifications([]);
    setUnreadCount(0);
  };

  const deleteOne = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`${API_BASE}/api/notifications/${id}`, { method: "DELETE", headers: headers() });
    setNotifications((items) => items.filter((item) => item._id !== id));
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative grid h-10 w-10 place-items-center border-2 border-black bg-white text-black shadow-[3px_3px_0_#000]"
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 min-w-5 rounded-full border-2 border-black bg-[var(--red-50)] px-1 text-xs font-black leading-5 text-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section className="absolute right-0 z-50 mt-3 w-96 max-w-[calc(100vw-2rem)] border-2 border-black bg-white shadow-[6px_6px_0_#000]" aria-label="Notifications">
          <header className="flex items-center justify-between border-b-2 border-black bg-[var(--blue-20)] px-4 py-3">
            <div>
              <h2 className="font-display text-xl">NOTIFICATIONS</h2>
              <p className="text-xs font-bold">{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-black underline">
                  <CheckCheck className="h-4 w-4" /> READ ALL
                </button>
              )}
              {notifications.length > 0 && (
                <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 text-xs font-black underline text-red-600">
                  <Trash2 className="h-4 w-4" /> CLEAR ALL
                </button>
              )}
            </div>
          </header>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length ? notifications.map((notification) => {
              const Icon = notificationIcon[notification.type] || Bell;
              return (
                <div key={notification._id} className="group relative">
                  <Link
                    to={notification.link || "/"}
                    onClick={() => markRead(notification)}
                    className={`flex gap-3 border-b border-[var(--gray-30)] p-4 text-left transition-colors hover:bg-[var(--blue-10)] ${notification.isRead ? "bg-white" : "bg-[var(--blue-10)]"}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-white"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{notification.title}</span>
                      <span className="mt-1 block text-sm text-[var(--gray-60)]">{notification.message}</span>
                      <span className="mt-1 block text-xs font-bold text-[var(--gray-50)]">{new Date(notification.createdAt).toLocaleString()}</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => deleteOne(notification._id, e)}
                    className="absolute right-2 top-2 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white hover:bg-red-600"
                    title="Delete notification"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            }) : <p className="p-8 text-center text-sm font-bold text-[var(--gray-60)]">No notifications yet.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
