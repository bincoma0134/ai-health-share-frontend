"use client";

import { useEffect, useState } from "react";
import { X, Bell, CheckCircle, ShieldCheck, CalendarDays, Zap, MessageSquare } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/utils/formatTime"; // Đảm bảo đúng đường dẫn

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function NotificationModal() {
  const router = useRouter();
  const { isNotifOpen, setIsNotifOpen } = useUI();
  const [activeNotifTab, setActiveNotifTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (isNotifOpen) loadNotifications();
  }, [isNotifOpen]);

  const loadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.status === "success") setNotifications(result.data);
    } catch (e) {
      console.error("Lỗi load thông báo:", e);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    // 1. Đánh dấu đã đọc nếu chưa đọc
    if (!notif.is_read) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${API_URL}/notifications/${notif.id}/read`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      }
    }

    // 2. Đóng Modal & Điều hướng (nếu có action_url)
    if (notif.action_url) {
      setIsNotifOpen(false);
      router.push(notif.action_url);
    }
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch(e) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  if (!isNotifOpen) return null;

  const filteredNotifs = activeNotifTab === 'all' ? notifications : notifications.filter(n => !n.is_read);

  // Ánh xạ 4 Nhóm Cốt Lõi
  const getIcon = (type: string) => {
    switch (type) {
      case 'BOOKING': return { Icon: CalendarDays, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'SOCIAL': return { Icon: MessageSquare, color: 'text-rose-500', bg: 'bg-rose-500/10' };
      case 'MODERATION': return { Icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'SYSTEM': 
      default: return { Icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-all" onClick={() => setIsNotifOpen(false)} />
      
      <div className="relative w-full md:w-[420px] h-[85vh] md:h-[calc(100vh-48px)] bg-white/80 dark:bg-black/60 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl transition-all animate-slide-up">
        
        {/* Header */}
        <div className="pt-8 pb-4 px-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Thông báo</h3>
          <div className="flex items-center gap-3">
            <button onClick={markAllAsRead} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1" title="Đọc tất cả">
              <CheckCircle size={18} strokeWidth={2.5} /> <span className="hidden md:inline">Đọc hết</span>
            </button>
            <button onClick={() => setIsNotifOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
              <X size={20} className="text-slate-500 dark:text-white"/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-white/10 flex gap-2">
          <button onClick={() => setActiveNotifTab('all')} 
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeNotifTab === 'all' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
            Tất cả
          </button>
          <button onClick={() => setActiveNotifTab('unread')} 
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeNotifTab === 'unread' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
            Chưa đọc
            {notifications.filter(n => !n.is_read).length > 0 && <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-md text-[10px] leading-none">{notifications.filter(n => !n.is_read).length}</span>}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {filteredNotifs.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
              <Bell size={40} className="text-slate-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Trống trải quá!</h3>
              <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Bạn chưa có cập nhật mới nào trong thời gian này.</p>
            </div>
          ) : (
            filteredNotifs.map((n) => {
              const { Icon, color, bg } = getIcon(n.type);
              return (
                <div key={n.id} onClick={() => handleNotificationClick(n)} 
                  className={`p-4 rounded-2xl flex gap-4 items-start transition-all cursor-pointer hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 ${!n.is_read ? 'bg-white/60 dark:bg-white/5' : 'opacity-60 grayscale-[20%]'}`}>
                  
                  <div className={`p-2.5 rounded-xl ${bg} ${color} shrink-0`}>
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className={`text-sm font-black leading-tight ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-400'}`}>
                      {n.title}
                    </h4>
                    <p className={`text-xs mt-1 mb-2 leading-relaxed ${!n.is_read ? 'text-slate-600 dark:text-zinc-300 font-medium' : 'text-slate-500 dark:text-zinc-500'}`}>
                      {n.message}
                    </p>
                    <span className="text-[10.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tight">
                      {formatTimeAgo(n.created_at)}
                    </span>
                  </div>

                  {!n.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}