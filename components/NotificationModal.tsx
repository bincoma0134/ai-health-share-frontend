"use client";

import { useEffect, useState } from "react";
import { X, Bell } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function NotificationModal() {
  const { isNotifOpen, setIsNotifOpen } = useUI();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if(isNotifOpen) loadNotifications();
  }, [isNotifOpen]);

  const loadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if(!session) return;
    const res = await fetch("https://ai-health-share-backend.onrender.com/notifications", {
      headers: { "Authorization": `Bearer ${session.access_token}` }
    });
    const result = await res.json();
    if(result.status === "success") setNotifications(result.data);
  };

  const markAsRead = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`https://ai-health-share-backend.onrender.com/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${session?.access_token}` }
    });
    setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n));
  };

  if (!isNotifOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Lớp nền tối */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsNotifOpen(false)} />
      
      {/* Panel thông báo trượt từ phải sang */}
      <div className="relative w-full max-w-md h-full bg-slate-50 dark:bg-zinc-950 border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col animate-slide-left">
        <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
          <h3 className="font-black text-xl flex items-center gap-2 text-slate-900 dark:text-white">
            <Bell size={24} className="text-[#80BF84]"/> Thông báo
          </h3>
          <button onClick={() => setIsNotifOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
            <X size={20} className="text-slate-500 dark:text-slate-400"/>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-zinc-500 text-sm mt-10 font-medium">Bạn chưa có thông báo nào.</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} onClick={() => !n.is_read && markAsRead(n.id)} 
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 ${
                  n.is_read 
                  ? 'bg-transparent border border-transparent hover:bg-slate-100 dark:hover:bg-white/5' 
                  : 'bg-white dark:bg-zinc-900/80 border border-[#80BF84]/30 shadow-md dark:shadow-[0_0_15px_rgba(128,191,132,0.15)]'
                }`}>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className={`text-[15px] font-bold ${n.is_read ? 'text-slate-600 dark:text-zinc-400' : 'text-slate-900 dark:text-white'}`}>{n.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                  {!n.is_read && <div className="w-2.5 h-2.5 rounded-full bg-[#80BF84] shrink-0 mt-1.5 shadow-[0_0_8px_rgba(128,191,132,0.8)]" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}