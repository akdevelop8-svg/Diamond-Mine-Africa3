import React, { useEffect, useState } from 'react';
import { Headphones, Users, Bell, Shield } from 'lucide-react';
import { ASSETS } from '../data/constants.ts';
import { useStore } from '../hooks/useStore.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';

interface HeaderProps {
  onOpenSupport: () => void;
  onNavigateTab: (tab: 'home' | 'earnings' | 'share' | 'account') => void;
  onOpenNotifications: () => void;
  onToggleAdmin: () => void;
  isAdminView: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSupport,
  onNavigateTab,
  onOpenNotifications,
  onToggleAdmin,
  isAdminView,
}) => {
  const { currentUser, notifications } = useStore();
  const [serverUnreadCount, setServerUnreadCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !currentUser) {
      setServerUnreadCount(0);
      return;
    }
    let active = true;
    const refreshUnreadCount = async () => {
      if (!supabase) return;
      const { count, error } = await supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', currentUser.id)
        .eq('read', false);
      if (!error && active) setServerUnreadCount(count ?? 0);
    };
    void refreshUnreadCount();
    const timer = window.setInterval(() => void refreshUnreadCount(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [currentUser?.id]);

  const unreadCount = isSupabaseConfigured
    ? serverUnreadCount
    : notifications.filter((n) => n.userId === currentUser?.id && !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Logo Zone */}
        <div
          onClick={() => onNavigateTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-lg overflow-hidden border border-blue-200 shadow-xs bg-white shrink-0 p-0.5">
            <img
              src={ASSETS.logo}
              alt="Diamond Mine Africa"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base tracking-tight text-slate-900 leading-tight">
              Diamond Mine <span className="text-blue-600">Africa</span>
            </span>
            <span className="text-[10px] text-amber-700 font-medium tracking-wide">
              Mine Today · Grow Tomorrow
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Team Link */}
          <button
            onClick={() => onNavigateTab('share')}
            aria-label="My Team"
            title="My Team Network"
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Team</span>
          </button>

          {/* Customer Service Link */}
          <button
            onClick={onOpenSupport}
            aria-label="Customer Support"
            title="24/7 Support"
            className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Headphones className="w-4 h-4" />
          </button>

          {/* In-App Notifications with Unread Dot */}
          <button
            onClick={onOpenNotifications}
            aria-label="Notifications"
            title="Notifications"
            className="relative p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Demo admin navigation is visible only while an admin demo account is signed in. */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={onToggleAdmin}
              aria-label="Admin Portal Switch"
              title={isAdminView ? 'Switch to Customer View' : 'Open Admin Portal'}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all shadow-xs ${
                isAdminView
                  ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400/50'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden xs:inline">{isAdminView ? 'Customer App' : 'Admin'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
