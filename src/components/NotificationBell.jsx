import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Bell, CheckCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('http://localhost:4000/notifications', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notifId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`http://localhost:4000/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
        );
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      setMarkingAll(true);
      const res = await fetch('http://localhost:4000/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotifIcon = (message) => {
    if (!message) return '📋';
    const lower = message.toLowerCase();
    if (lower.includes('booking') || lower.includes('reserv')) return '🚗';
    if (lower.includes('cancel')) return '❌';
    if (lower.includes('confirm') || lower.includes('approved')) return '✅';
    if (lower.includes('payment')) return '💳';
    return '🔔';
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          if (!isOpen) fetchNotifications();
          setIsOpen(!isOpen);
        }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full border border-[#D8D4C8] bg-white hover:bg-[#F7F5F0] transition-colors"
      >
        <Bell className="w-4 h-4 text-[#0B0D10]" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold leading-none text-white bg-[#E8542E] rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-[360px] bg-white rounded-2xl shadow-2xl border border-[#D8D4C8]/80 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8D4C8]/60">
              <div>
                <h3 className="font-display font-bold text-base text-[#0B0D10]">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-[#0B0D10]/50 font-body mt-0.5">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={markingAll}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#E8542E] hover:bg-[#E8542E]/10 rounded-lg transition-colors disabled:opacity-50 font-body"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F7F5F0] transition-colors text-[#0B0D10]/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-[#D8D4C8]/30">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 bg-[#F7F5F0] rounded-full flex items-center justify-center mb-3 text-xl">
                    🔔
                  </div>
                  <p className="font-display font-semibold text-sm text-[#0B0D10]">All caught up!</p>
                  <p className="text-xs text-[#0B0D10]/50 mt-1 font-body">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors ${
                      notif.is_read
                        ? 'bg-white hover:bg-[#FAFAF9]'
                        : 'bg-[#FAFAF9] hover:bg-[#F3F1EC]'
                    }`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-full bg-white border border-[#D8D4C8]/60 flex items-center justify-center shrink-0 text-base shadow-sm">
                      {getNotifIcon(notif.message)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug font-body ${notif.is_read ? 'text-[#0B0D10]/60' : 'text-[#0B0D10] font-medium'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[11px] text-[#0B0D10]/40 mt-1 font-body">
                        {formatTime(notif.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#E8542E] shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-[#D8D4C8]/60 bg-[#FAFAF9]">
                <p className="text-xs text-center text-[#0B0D10]/40 font-body">
                  Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
