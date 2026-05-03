"use client";

import { Home, Map, Sparkles, CalendarDays, User as UserIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole } = useAuth();
  const { setIsAuthModalOpen } = useUI() as any;

  const handleProfileClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    // Tự động điều hướng Profile theo Role
    if (userRole === "SUPER_ADMIN") router.push("/admin/profile");
    else if (userRole === "MODERATOR") router.push("/moderator/profile");
    else if (userRole === "PARTNER_ADMIN" || userRole === "PARTNER") router.push("/partner/profile");
    else if (userRole === "CREATOR") router.push("/creator/profile");
    else router.push("/user/profile");
  };

  return (
    <div 
      className="md:hidden fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px] z-[90] bottom-4"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      {/* 🔮 THE GLASS PILL: Nền kính siêu mờ (Ultra-premium Glassmorphism) */}
      <div className="relative bg-white/30 dark:bg-[#09090b]/40 backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-4 py-3 flex justify-between items-center">
        
        {/* 1. Trang chủ */}
        <button onClick={() => router.push('/')} className={`flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-all duration-300 ${pathname === '/' ? 'text-[#80BF84] drop-shadow-md' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
          <Home size={22} strokeWidth={pathname === '/' ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wide">Trang chủ</span>
        </button>

        {/* 2. Bản đồ */}
        <button onClick={() => router.push('/features/map')} className={`flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-all duration-300 ${pathname.includes('/features/map') ? 'text-[#80BF84] drop-shadow-md' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
          <Map size={22} strokeWidth={pathname.includes('/features/map') ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wide">Bản đồ</span>
        </button>

        {/* 3. AI Trợ lý - Nút nổi "Pha lê" (Crystal Float Button) */}
        <div className="relative flex-[1.2] flex justify-center">
            <button onClick={() => router.push('/features/AI')} className="absolute -top-10 group active:scale-95 transition-transform duration-300">
              {/* Lớp viền kính mờ ngoài cùng */}
              <div className="w-[62px] h-[62px] rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-[1px] shadow-[0_10px_30px_rgba(128,191,132,0.35)] border border-white/60 dark:border-white/10">
                {/* Khối cầu bên trong */}
                <div className="w-full h-full bg-gradient-to-tr from-white/95 to-white/70 dark:from-zinc-900/95 dark:to-zinc-800/70 rounded-full flex items-center justify-center">
                  <Sparkles size={28} className="text-[#80BF84] group-hover:scale-110 transition-transform duration-500" strokeWidth={2.5} />
                </div>
              </div>
            </button>
        </div>

        {/* 4. Lịch hẹn */}
        <button onClick={() => router.push('/features/calendar')} className={`flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-all duration-300 ${pathname.includes('/features/calendar') ? 'text-[#80BF84] drop-shadow-md' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
          <CalendarDays size={22} strokeWidth={pathname.includes('/features/calendar') ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wide">Lịch hẹn</span>
        </button>

        {/* 5. Hồ sơ cá nhân */}
        <button onClick={handleProfileClick} className={`flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-all duration-300 ${pathname.includes('profile') ? 'text-[#80BF84] drop-shadow-md' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
          <UserIcon size={22} strokeWidth={pathname.includes('profile') ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wide">Hồ sơ</span>
        </button>

      </div>
    </div>
  );
}