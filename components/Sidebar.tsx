"use client";

import { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, Sparkles, Crown, Settings, 
  LogOut, LayoutDashboard, User as UserIcon, MapPin, MessageSquare,
  ChevronRight, Layout, Ticket
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { toast } from "sonner";

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
  const { user, userRole, isLoading: authLoading, refreshProfile } = useAuth();
  const { setIsAuthModalOpen } = useUI() as any; 
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [dbProfile, setDbProfile] = useState<any>(null);

  // Lấy dữ liệu profile thật từ API Backend để lấy Avatar mới nhất
  useEffect(() => {
    const getFullProfile = async () => {
        if (!user) return;
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
            if (!token) return;
            const res = await fetch(`${API_URL}/user/profile`, {
                headers: { "Authorization": `Bearer ${token}` }
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

  // Lấy dữ liệu profile thật từ API Backend để lấy Avatar mới nhất
  useEffect(() => {
    const getFullProfile = async () => {
        if (!user) return;
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
            if (!token) return;
            const res = await fetch(`${API_URL}/user/profile`, {
                headers: { "Authorization": `Bearer ${token}` }
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
    const toastId = toast.loading("Đang đăng xuất an toàn...");
    if (typeof window !== "undefined") localStorage.removeItem("ai-health-token");
    refreshProfile();    
    router.push("/");
    toast.success("Hẹn gặp lại bạn!", { id: toastId });
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
    { name: "Ưu đãi", icon: Ticket, path: "/features/voucher" },
  ];

  // KIỂN TRÚC UI SHELL: Hiển thị ngay lập tức ở mili giây thứ 0, không chờ đợi (Loại bỏ blur-sm, delay)
  return (
    <div className="hidden md:flex flex-col w-[280px] h-[calc(100dvh-2.5rem)] my-5 ml-5 rounded-[2.8rem] bg-white/[0.02] dark:bg-black/[0.05] backdrop-blur-[100px] border border-white/20 dark:border-white/10 z-50 pt-8 shrink-0 shadow-none transition-all duration-500 overflow-hidden relative group/sidebar">
      
      {/* Lớp viền sáng mỏng (Clear Glass Refraction) góc Top-Left đặc trưng */}
      <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none border border-gradient-to-br from-white/80 via-white/20 to-transparent dark:from-white/20 dark:via-white/5 dark:to-transparent z-50"></div>

      {/* LOGO AREA */}
      <div className="px-7 mb-10 cursor-pointer group" onClick={() => router.push('/')}>
        <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#80BF84] rounded-xl flex items-center justify-center shadow-lg shadow-[#80BF84]/30 group-hover:scale-110 transition-transform">
                <Layout size={20} className="text-zinc-950" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">AI<span className="text-[#80BF84]">HEALTH</span></h1>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar px-4 relative z-10">
        {/* MAIN NAVIGATION: Glass-Pill Active States */}
        <div className="space-y-1.5">
            {mainLinks.map((item) => (
            <button 
                key={item.path} 
                onClick={() => router.push(item.path)} 
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[1.4rem] font-black transition-all duration-500 group/btn ${
                    pathname === item.path 
                    ? 'bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.3)] border border-white dark:border-white/20 scale-[1.02]' 
                    : 'text-slate-500 dark:text-zinc-400 hover:bg-white/30 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
                <div className="flex items-center gap-3.5">
                    <div className={`p-2 rounded-xl transition-all duration-300 ${pathname === item.path ? 'bg-[#80BF84] text-zinc-950 shadow-lg shadow-[#80BF84]/30' : 'bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 group-hover/btn:text-[#80BF84]'}`}>
                        <item.icon size={18} strokeWidth={pathname === item.path ? 2.5 : 2} />
                    </div>
                    <span className="text-sm tracking-tight">{item.name}</span>
                </div>
                {pathname === item.path && <div className="w-1.5 h-1.5 rounded-full bg-[#80BF84] shadow-[0_0_10px_#80BF84] animate-pulse"></div>}
            </button>
            ))}
        </div>

        {/* AI ASSISTANT BUTTON: Elevated Premium Glow */}
        <div className="mt-6 mb-2">
            <button onClick={() => router.push('/features/AI')} className="w-full relative group/ai">
              <div className="absolute inset-0 bg-gradient-to-r from-[#80BF84] to-emerald-500 rounded-[1.5rem] blur-xl opacity-30 group-hover/ai:opacity-60 transition-opacity duration-500"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-[1.5rem] bg-gradient-to-br from-[#80BF84] via-[#75b479] to-[#5e9662] text-zinc-950 font-black shadow-lg group-hover/ai:shadow-[#80BF84]/50 group-hover/ai:-translate-y-0.5 transition-all duration-300 active:scale-95 border border-white/40 dark:border-white/20">
                <Sparkles size={18} strokeWidth={3} className="animate-pulse" />
                <span className="text-sm tracking-widest uppercase font-black">AI Trợ lý</span>
              </div>
            </button>
        </div>

        {/* ADMIN AREA: Refined Kính Chìm/Nổi */}
        {userRole !== "USER" && mgmt.profilePath && mgmt.dashboardPath && (
          <div className="animate-fade-in mt-6 pb-6">
            <div className="px-4 py-3 flex items-center gap-3">
                <div className={`h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200 dark:to-white/10`}></div>
                <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${mgmt.colorClass} whitespace-nowrap`}>Vùng Quản Trị</span>
                <div className={`h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200 dark:to-white/10`}></div>
            </div>
            
            <div className="space-y-1.5">
                <button onClick={() => router.push(mgmt.profilePath as string)} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[1.4rem] font-black transition-all duration-500 border ${pathname === mgmt.profilePath ? `${mgmt.bgClass} ${mgmt.colorClass} border-white/40 dark:border-white/20 shadow-lg ${mgmt.glowClass} scale-[1.02] bg-white/80 dark:bg-white/10` : 'text-slate-500 dark:text-zinc-400 hover:bg-white/30 dark:hover:bg-white/5 border-transparent'}`}>
                    <div className={`p-2 rounded-xl ${pathname === mgmt.profilePath ? 'bg-white/20 dark:bg-white/10 text-current' : 'bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400'}`}>
                        <Crown size={18} strokeWidth={pathname === mgmt.profilePath ? 2.5 : 2} />
                    </div>
                    <span className="text-sm tracking-tight">{mgmt.profileLabel}</span>
                </button>
                <button onClick={() => router.push(mgmt.dashboardPath as string)} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[1.4rem] font-black transition-all duration-500 border ${pathname === mgmt.dashboardPath ? `${mgmt.bgClass} ${mgmt.colorClass} border-white/40 dark:border-white/20 shadow-lg ${mgmt.glowClass} scale-[1.02] bg-white/80 dark:bg-white/10` : 'text-slate-500 dark:text-zinc-400 hover:bg-white/30 dark:hover:bg-white/5 border-transparent'}`}>
                    <div className={`p-2 rounded-xl ${pathname === mgmt.dashboardPath ? 'bg-white/20 dark:bg-white/10 text-current' : 'bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400'}`}>
                        <LayoutDashboard size={18} strokeWidth={pathname === mgmt.dashboardPath ? 2.5 : 2} />
                    </div>
                    <span className="text-sm tracking-tight">{mgmt.dashboardLabel}</span>
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
                className={`w-full flex items-center gap-3.5 p-3 rounded-[2rem] transition-all duration-500 border group relative z-10 ${
                    isUserMenuOpen 
                    ? 'bg-white/80 dark:bg-white/10 backdrop-blur-xl border-white dark:border-white/20 shadow-[0_15px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] scale-[1.02]' 
                    : 'bg-white/40 dark:bg-white/[0.03] backdrop-blur-md border-white/60 dark:border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.05)] hover:border-white dark:hover:border-white/20 hover:bg-white/60 dark:hover:bg-white/[0.06] hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] hover:scale-[1.02] active:scale-95'
                }`}
            >
                {/* Avatar API Thật */}
                <div className={`w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr ${userRole === "SUPER_ADMIN" ? "from-amber-400 to-amber-600 shadow-amber-500/20" : "from-slate-300 to-white dark:from-zinc-700 dark:to-zinc-600"} shadow-md shrink-0 overflow-hidden transition-transform duration-500 ${isUserMenuOpen ? 'scale-90' : 'group-hover:scale-105'}`}>
                    <img 
                        src={dbProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbProfile?.full_name || user?.email || 'User')}&background=80BF84&color=fff`} 
                        className="w-full h-full object-cover rounded-full border border-white dark:border-zinc-800"
                        alt="avatar"
                    />
                </div>
                
                {/* Tên và Username API Thật */}
                <div className="flex flex-col flex-1 overflow-hidden text-left">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${mgmt.colorClass}`}>{mgmt.roleName}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight mt-0.5">
                        {dbProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 truncate opacity-80">
                        @{dbProfile?.username || user.user_metadata?.username || 'user'}
                    </span>
                </div>
                
                <ChevronRight size={14} className={`text-slate-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
            </button>
        ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="w-full flex items-center justify-center gap-3 p-4 rounded-[2rem] bg-gradient-to-br from-[#80BF84] to-[#6da871] text-zinc-950 font-black shadow-lg shadow-[#80BF84]/30 hover:shadow-[#80BF84]/50 hover:scale-[1.02] active:scale-95 transition-all border border-white/40 dark:border-white/20">
                <UserIcon size={18} strokeWidth={3} /> <span className="text-sm uppercase tracking-wider font-black">Đăng nhập</span>
            </button>
        )}
      </div>
    </div>
  );
}