"use client";

import { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, Crown, Settings, 
  LogOut, ShieldCheck, LayoutDashboard, User as UserIcon, MapPin, MessageSquare,
  ChevronRight, Layout
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface RoleConfig {
  roleName: string;
  colorClass: string;
  bgClass: string;
  glowClass: string;
  profilePath?: string;
  dashboardPath?: string;
  profileLabel?: string;
  dashboardLabel?: string;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { setIsAuthModalOpen } = useUI() as any; 
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [dbProfile, setDbProfile] = useState<any>(null);

  // Lấy dữ liệu profile thật từ API Backend để lấy Avatar mới nhất
  useEffect(() => {
    const getFullProfile = async () => {
        if (!user) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/user/profile`, {
                headers: { "Authorization": `Bearer ${session?.access_token}` }
            });
            const result = await res.json();
            if (result.status === "success") {
                setDbProfile(result.data.profile);
            }
        } catch (err) {
            console.error("Lỗi đồng bộ Avatar Sidebar:", err);
        }
    };
    getFullProfile();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    window.location.reload();
  };

  const getManagementConfig = (role: string): RoleConfig => {
    switch (role) {
      case "SUPER_ADMIN":
        return {
          profilePath: "/admin/profile", 
          dashboardPath: "/admin/dashboard",
          profileLabel: "Hồ sơ Admin", 
          dashboardLabel: "Bảng Điều Khiển",
          colorClass: "text-amber-500", 
          bgClass: "bg-amber-500/10",
          glowClass: "shadow-amber-500/40",
          roleName: "Super Admin"
        };
      case "PARTNER_ADMIN":
      case "PARTNER":
        return {
          profilePath: "/partner/profile", 
          dashboardPath: "/partner/dashboard",
          profileLabel: "Hồ sơ Doanh nghiệp", 
          dashboardLabel: "Quản lý Dịch vụ",
          colorClass: "text-blue-500", 
          bgClass: "bg-blue-500/10",
          glowClass: "shadow-blue-500/40",
          roleName: "Partner Admin"
        };
      case "MODERATOR":
        return {
          profilePath: "/moderator/profile", 
          dashboardPath: "/moderator/dashboard",
          profileLabel: "Hồ sơ Kiểm duyệt", 
          dashboardLabel: "Hàng đợi Phê duyệt",
          colorClass: "text-violet-500", 
          bgClass: "bg-violet-500/10",
          glowClass: "shadow-violet-500/40",
          roleName: "Moderator"
        };
      case "CREATOR":
        return {
          profilePath: "/creator/profile", 
          dashboardPath: "/creator/dashboard",
          profileLabel: "Hồ sơ Sáng tạo", 
          dashboardLabel: "Thống kê Nội dung",
          colorClass: "text-rose-500", 
          bgClass: "bg-rose-500/10",
          glowClass: "shadow-rose-500/40",
          roleName: "Creator"
        };
      default:
        return { 
            roleName: "Thành viên", 
            colorClass: "text-[#80BF84]", 
            bgClass: "bg-[#80BF84]/10",
            glowClass: "shadow-[#80BF84]/20"
        };
    }
  };

  const mgmt = getManagementConfig(userRole);

  const mainLinks = [
    { name: "Trang chủ", icon: Home, path: "/" },
    { name: "Cộng đồng", icon: MessageSquare, path: "/features/community" },
    { name: "Khám phá", icon: Compass, path: "/features/explore" },
    { name: "Bản đồ", icon: MapPin, path: "/features/map" },
    { name: "Lịch hẹn", icon: CalendarDays, path: "/features/calendar" },
  ];

  if (authLoading) return null;

  return (
    <div className="hidden md:flex flex-col w-[280px] h-full bg-white/70 dark:bg-zinc-950/80 backdrop-blur-2xl border-r border-slate-200 dark:border-white/5 z-50 pt-8 shrink-0 shadow-[25px_0_60px_rgba(0,0,0,0.03)] dark:shadow-[25px_0_60px_rgba(0,0,0,0.3)] transition-all duration-500">
      
      {/* LOGO AREA */}
      <div className="px-7 mb-10 cursor-pointer group" onClick={() => router.push('/')}>
        <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#80BF84] rounded-xl flex items-center justify-center shadow-lg shadow-[#80BF84]/30 group-hover:scale-110 transition-transform">
                <Layout size={20} className="text-zinc-950" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">AI<span className="text-[#80BF84]">HEALTH</span></h1>
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto no-scrollbar px-4">
        {/* MAIN NAVIGATION */}
        <div className="space-y-1">
            {mainLinks.map((item) => (
            <button 
                key={item.path} 
                onClick={() => router.push(item.path)} 
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all group ${
                    pathname === item.path 
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-md border border-slate-200 dark:border-white/10' 
                    : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
            >
                <div className="flex items-center gap-4">
                    <item.icon size={20} className={`${pathname === item.path ? 'text-[#80BF84]' : 'group-hover:text-slate-900 dark:group-hover:text-white'} transition-colors`} />
                    <span className="text-sm tracking-tight">{item.name}</span>
                </div>
                {pathname === item.path && <div className="w-1.5 h-1.5 rounded-full bg-[#80BF84] shadow-[0_0_8px_#80BF84]"></div>}
            </button>
            ))}
        </div>

        {/* AI ASSISTANT BUTTON */}
        <div className="mt-6 mb-2">
            <button onClick={() => router.push('/features/AI')} className="w-full relative group">
              <div className="absolute inset-0 bg-[#80BF84] rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-br from-[#80BF84] to-[#6da871] text-zinc-950 shadow-lg group-hover:shadow-[#80BF84]/30 group-hover:-translate-y-0.5 transition-all active:scale-95 border border-white/20">
                <Sparkles size={18} strokeWidth={3} className="animate-pulse" />
                <span className="font-black text-sm tracking-wide uppercase">AI Trợ lý</span>
              </div>
            </button>
        </div>

        {/* ADMIN AREA */}
        {userRole !== "USER" && mgmt.profilePath && mgmt.dashboardPath && (
          <div className="animate-fade-in mt-6 pb-6">
            <div className="px-4 py-3 flex items-center gap-3">
                <div className={`h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200 dark:to-white/10`}></div>
                <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${mgmt.colorClass} whitespace-nowrap`}>Vùng Quản Trị</span>
                <div className={`h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200 dark:to-white/10`}></div>
            </div>
            
            <div className="space-y-1">
                <button onClick={() => router.push(mgmt.profilePath as string)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all border ${pathname === mgmt.profilePath ? `${mgmt.bgClass} ${mgmt.colorClass} border-${mgmt.colorClass.split('-')[1]}-500/20 shadow-lg ${mgmt.glowClass}` : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 border-transparent'}`}>
                    <Crown size={20} /> <span className="text-sm tracking-tight">{mgmt.profileLabel}</span>
                </button>
                <button onClick={() => router.push(mgmt.dashboardPath as string)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all border ${pathname === mgmt.dashboardPath ? `${mgmt.bgClass} ${mgmt.colorClass} border-${mgmt.colorClass.split('-')[1]}-500/20 shadow-lg ${mgmt.glowClass}` : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 border-transparent'}`}>
                    <LayoutDashboard size={20} /> <span className="text-sm tracking-tight">{mgmt.dashboardLabel}</span>
                </button>
            </div>
          </div>
        )}
      </div>

      {/* USER PROFILE CARD - SIÊU NỔI KHỐI (ELEVATED) & DỮ LIỆU THẬT */}
      <div className="mt-auto px-4 pb-8 pt-4 relative">
        {isUserMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
            <div className="absolute bottom-[calc(100%+15px)] left-4 right-4 p-2.5 flex flex-col gap-1 z-50 animate-slide-up bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-white/10 rounded-[2.5rem]">
              <button onClick={() => { setIsUserMenuOpen(false); toast.info("Tính năng đang hoàn thiện!"); }} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm w-full text-left group">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 group-hover:bg-white dark:group-hover:bg-white/20 transition-colors"><Settings size={14} /></div>
                Cài đặt tài khoản
              </button>
              <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-2"></div>
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left group">
                <div className="p-1.5 rounded-lg bg-rose-500/10 group-hover:bg-rose-500 transition-colors"><LogOut size={14} className="group-hover:text-white" /></div>
                Đăng xuất
              </button>
            </div>
          </>
        )}

        {user ? (
            <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
                className={`w-full flex items-center gap-3 p-3.5 rounded-[2.5rem] transition-all border group relative z-10 ${
                    isUserMenuOpen 
                    ? 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-amber-500/30 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] scale-[1.02]' 
                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)] hover:border-slate-300 dark:hover:border-white/20 hover:scale-[1.02] active:scale-95'
                }`}
            >
                {/* Avatar API Thật */}
                <div className={`w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr ${userRole === "SUPER_ADMIN" ? "from-amber-400 to-amber-600 shadow-amber-500/20" : "from-slate-200 to-slate-100 dark:from-zinc-800 dark:to-zinc-700"} shadow-lg shrink-0 overflow-hidden transition-transform ${isUserMenuOpen ? 'scale-90' : 'group-hover:scale-105'}`}>
                    <img 
                        src={dbProfile?.avatar_url || `https://ui-avatars.com/api/?name=${dbProfile?.full_name || user.email}&background=80BF84&color=fff`} 
                        className="w-full h-full object-cover rounded-full border-2 border-white dark:border-zinc-900"
                        alt="avatar"
                    />
                </div>
                
                {/* Tên và Username API Thật */}
                <div className="flex flex-col flex-1 overflow-hidden text-left">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${mgmt.colorClass}`}>{mgmt.roleName}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight mt-0.5">
                        {dbProfile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0]}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 truncate opacity-70">
                        @{dbProfile?.username || user.user_metadata?.username || 'user'}
                    </span>
                </div>
                
                <ChevronRight size={14} className={`text-slate-300 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
            </button>
        ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="w-full flex items-center justify-center gap-3 p-4 rounded-[2.5rem] bg-[#80BF84] text-zinc-950 shadow-xl shadow-[#80BF84]/30 hover:scale-[1.02] active:scale-95 transition-all font-black group border border-white/20">
                <UserIcon size={18} strokeWidth={3} /> <span className="text-sm uppercase tracking-wide">Đăng nhập</span>
            </button>
        )}
      </div>
    </div>
  );
}