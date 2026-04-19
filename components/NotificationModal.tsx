"use client";

import { useEffect, useState } from "react";
import { X, Bell, CheckCircle, ShieldCheck, CalendarDays } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function NotificationModal() {
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
      const res = await fetch("https://ai-health-share-backend.onrender.com/notifications", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.status === "success") setNotifications(result.data);
    } catch (e) {
      console.error("Lỗi load thông báo");
    }
  };

  const markAsRead = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`https://ai-health-share-backend.onrender.com/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${session?.access_token}` }
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    // Logic này có thể mở rộng ở Backend, tạm thời update Local UI
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success("Đã đánh dấu tất cả là đã đọc");
  };

  if (!isNotifOpen) return null;

  const filteredNotifs = activeNotifTab === 'all' ? notifications : notifications.filter(n => !n.is_read);

  // Ánh xạ Icon dựa trên Type (Đồng bộ thiết kế từ page.tsx)
  const getIcon = (type: string) => {
    switch (type) {
      case 'BOOKING': return { Icon: CalendarDays, color: 'text-[#80BF84]', bg: 'bg-[#80BF84]/10' };
      default: return { Icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
      {/* Overlay: Đồng bộ page.tsx */}
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-all" onClick={() => setIsNotifOpen(false)} />
      
      {/* Panel: Thiết kế Ethereal Glass */}
      <div className="relative w-full md:w-[420px] h-[85vh] md:h-[calc(100vh-48px)] bg-white/80 dark:bg-black/60 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl transition-all animate-slide-up">
        
        {/* Header: Typography Black */}
        <div className="pt-8 pb-4 px-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Thông báo</h3>
          <div className="flex items-center gap-3">
            <button onClick={markAllAsRead} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors" title="Đọc tất cả">
              <CheckCircle size={20}/>
            </button>
            <button onClick={() => setIsNotifOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
              <X size={20} className="text-slate-500 dark:text-white"/>
            </button>
          </div>
        </div>

        {/* Tabs: Đồng bộ style page.tsx */}
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

        {/* List: Tối ưu hiển thị */}
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
                <div key={n.id} onClick={() => !n.is_read && markAsRead(n.id)} 
                  className={`p-4 rounded-2xl flex gap-4 items-start transition-all cursor-pointer hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 ${!n.is_read ? 'bg-white/60 dark:bg-white/5' : 'opacity-60'}`}>
                  <div className={`p-2.5 rounded-xl ${bg} ${color} shrink-0`}>
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-black leading-tight ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>{n.title}</h4>
                    <p className={`text-xs mt-1 mb-2 leading-relaxed ${!n.is_read ? 'text-slate-600 dark:text-zinc-400 font-medium' : 'text-slate-500 dark:text-zinc-500'}`}>{n.message}</p>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tighter">
                      {new Date(n.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#80BF84] shrink-0 mt-2 shadow-[0_0_8px_rgba(128,191,132,0.8)]" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}