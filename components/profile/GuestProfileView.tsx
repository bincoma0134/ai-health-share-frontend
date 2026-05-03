"use client";

import { UserCircle, CalendarDays, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { useUI } from "@/context/UIContext";

export default function GuestProfileView() {
  const { setIsAuthModalOpen } = useUI() as any;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in pt-20 pb-32">
        <div className="relative mb-8">
            <div className="absolute inset-0 bg-[#80BF84] blur-[50px] opacity-30 rounded-full animate-pulse"></div>
            <div className="w-32 h-32 rounded-full bg-white/20 dark:bg-black/40 backdrop-blur-2xl border border-white/40 dark:border-white/10 flex items-center justify-center shadow-2xl relative z-10">
                <UserCircle size={64} className="text-[#80BF84]" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#80BF84] rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-zinc-950 z-20 shadow-lg">
                <Sparkles size={18} className="text-zinc-950" />
            </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">
            Hành trình sức khỏe <br /> của riêng bạn
        </h2>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mb-10 max-w-sm font-medium">
            Đăng nhập để mở khóa không gian lưu trữ cá nhân và nhận tư vấn từ mạng lưới chuyên gia AI Health.
        </p>

        {/* Khối hiệu ứng tò mò (Curiosity Gap) */}
        <div className="w-full max-w-sm space-y-4 mb-10 pointer-events-none">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-sm opacity-80 blur-[1px]">
                <CalendarDays className="text-slate-400" />
                <div className="flex-1 text-left">
                    <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/10 rounded-full mb-2"></div>
                    <div className="h-2 w-1/2 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                </div>
                <ShieldCheck className="text-slate-300 dark:text-white/5" />
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-sm opacity-50 blur-[2px]">
                <Heart className="text-slate-400" />
                <div className="flex-1 text-left">
                    <div className="h-3 w-2/3 bg-slate-200 dark:bg-white/10 rounded-full mb-2"></div>
                    <div className="h-2 w-1/3 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                </div>
            </div>
        </div>

        <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="relative w-full max-w-sm py-4 bg-gradient-to-tr from-slate-800 to-slate-900 dark:from-white dark:to-slate-200 text-white dark:text-zinc-950 font-black text-lg rounded-2xl active:scale-95 transition-all shadow-xl overflow-hidden group"
        >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full skew-x-12 transition-transform duration-500"></div>
            Đăng nhập / Đăng ký ngay
        </button>
    </div>
  );
}