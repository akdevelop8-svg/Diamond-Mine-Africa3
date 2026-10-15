import React, { useEffect, useState } from 'react';
import { X, Bell, CheckCheck } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { InAppNotification } from '../types.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';

interface NotificationDrawerProps { isOpen: boolean; onClose: () => void; }
export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { currentUser, notifications } = useStore();
  const [serverNotifications, setServerNotifications] = useState<InAppNotification[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadServerNotifications = async () => {
    if (!supabase || !currentUser) return;
    setLoading(true); setError('');
    try {
      const { data, error: queryError } = await supabase.from('notifications')
        .select('id,profile_id,title,message,related_request_id,read,created_at')
        .eq('profile_id', currentUser.id).order('created_at', { ascending: false }).limit(100);
      if (queryError) throw queryError;
      setServerNotifications((data ?? []).map((row) => ({
        id: String(row.id), userId: String(row.profile_id), title: String(row.title), message: String(row.message),
        relatedRequestId: row.related_request_id ? String(row.related_request_id) : undefined,
        read: Boolean(row.read), createdAt: String(row.created_at),
      })));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load notifications.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen && currentUser && isSupabaseConfigured) void loadServerNotifications(); }, [isOpen, currentUser?.id]);
  if (!isOpen || !currentUser) return null;

  const userNotifs = (isSupabaseConfigured ? serverNotifications : notifications.filter((n) => n.userId === currentUser.id))
    .slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleMarkAllRead = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error: rpcError } = await supabase.rpc('dma_mark_all_notifications_read');
      if (rpcError) setError(rpcError.message); else await loadServerNotifications();
    } else store.markAllNotificationsRead(currentUser.id);
  };
  const handleMarkRead = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error: rpcError } = await supabase.rpc('dma_mark_notification_read', { p_notification_id: id });
      if (rpcError) setError(rpcError.message); else setServerNotifications((rows) => rows.map((n) => n.id === id ? { ...n, read: true } : n));
    } else store.markNotificationRead(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col border-l border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50"><div className="flex items-center gap-2"><Bell className="w-5 h-5 text-blue-600"/><h3 className="font-display font-bold text-sm text-slate-900">Notification Center</h3></div><div className="flex items-center gap-1"><button onClick={() => void handleMarkAllRead()} title="Mark all as read" className="p-1.5 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold rounded-md hover:bg-blue-50 transition-colors"><CheckCheck className="w-4 h-4"/><span className="hidden xs:inline">Read All</span></button><button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"><X className="w-5 h-5"/></button></div></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">{error}</div>}
          {loading ? <p className="py-12 text-center text-slate-400">Loading notifications…</p> : userNotifs.length === 0 ? <div className="text-center py-12 text-slate-400"><Bell className="w-8 h-8 mx-auto mb-2 opacity-40"/><p>No notifications yet.</p></div> : userNotifs.map((n) => <div key={n.id} onClick={() => void handleMarkRead(n.id)} role="button" tabIndex={0} className={`p-3.5 rounded-xl border transition-all cursor-pointer ${n.read ? 'bg-white border-slate-200 text-slate-600' : 'bg-blue-50/60 border-blue-200 text-slate-900 font-medium shadow-xs'}`}><div className="flex items-start justify-between gap-2"><h4 className="font-display font-bold text-slate-900 text-xs">{n.title}</h4>{!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1"/>}</div><p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{n.message}</p><div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100"><span>{new Date(n.createdAt).toLocaleString()}</span>{n.relatedRequestId && <span className="font-mono text-blue-600 font-semibold">#{n.relatedRequestId}</span>}</div></div>)}
        </div>
      </div>
    </div>
  );
};
