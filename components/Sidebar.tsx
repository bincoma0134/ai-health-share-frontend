"use client";

import { useState } from "react";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, Crown, Settings, 
  LogOut, ShieldCheck, LayoutDashboard, User as UserIcon, MapPin, MessageSquare 
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface RoleConfig {
  roleName: string;
  colorClass: string;
  bgClass?: string;
  profilePath?: string;
  dashboardPath?: string;
  profileLabel?: string;
  dashboardLabel?: string;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole, isLoading } = useAuth();
  const { setIsAuthModalOpen } = useUI(); 
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
          colorClass: "text-violet-500", 
          bgClass: "bg-violet-500/10",
          roleName: "Super Admin"
        };
      case "PARTNER_ADMIN":
        return {
          profilePath: "/partner/profile", 
          dashboardPath: "/partner/dashboard",
          profileLabel: "Hồ sơ Doanh nghiệp", 
          dashboardLabel: "Quản lý Dịch vụ",
          colorClass: "text-[#80BF84]", 
          bgClass: "bg-[#80BF84]/10",
          roleName: "Partner Admin"
        };
      case "MODERATOR":
        return {
          profilePath: "/moderator/profile", 
          dashboardPath: "/moderator/dashboard",
          profileLabel: "Hồ sơ Kiểm duyệt", 
          dashboardLabel: "Hàng đợi Phê duyệt",
          colorClass: "text-blue-500", 
          bgClass: "bg-blue-500/10",
          roleName: "Moderator"
        };
      case "CREATOR":
        return {
          profilePath: "/creator/profile", 
          dashboardPath: "/creator/dashboard",
          profileLabel: "Hồ sơ Sáng tạo", 
          dashboardLabel: "Thống kê Nội dung",
          colorClass: "text-amber-500", 
          bgClass: "bg-amber-500/10",
          roleName: "Creator"
        };
      default:
        return { roleName: "Thành viên", colorClass: "text-slate-500 dark:text-zinc-400" };
    }
  };

  const mgmt = getManagementConfig(userRole);

  const mainLinks = [
    { name: "Trang chủ", icon: Home, path: "/" },
    { name: "Cộng đồng", icon: MessageSquare, path: "/features/community" },
    { name: "Khám phá", icon: Compass, path: "/features/explore" },
    { name: "Bản đồ", icon: MapPin, path: "/features/map" },
    { name: "Lịch hẹn", icon: CalendarDays, path: "/features/calendar" },
    //{ name: "Yêu thích", icon: Heart, path: "/features/favorite" },
  ];

  if (isLoading) return null;

  return (
    <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 shrink-0 shadow-xl transition-all duration-500">
      
      <div className="px-4 mb-8 cursor-pointer" onClick={() => router.push('/')}>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">AI<span className="text-[#80BF84]">HEALTH</span></h1>
      </div>
      
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto no-scrollbar px-4">
        
        {mainLinks.map((item) => (
          <button key={item.path} onClick={() => router.push(item.path)} className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${pathname === item.path ? 'bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-200/30 dark:hover:bg-white/5'}`}>
            <item.icon size={22} className={pathname === item.path ? 'text-[#80BF84]' : ''} />
            <span className="text-sm tracking-wide">{item.name}</span>
          </button>
        ))}

        <div className="mt-4 mb-2">
            <button onClick={() => router.push('/features/AI')} className="w-full relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#80BF84] to-emerald-300 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 shadow-xl group-hover:scale-[1.02] transition-all"><Sparkles size={20} strokeWidth={3} /><span className="font-black text-sm tracking-wide">AI Trợ lý</span></div>
            </button>
        </div>

        {userRole !== "USER" && mgmt.profilePath && mgmt.dashboardPath && (
          <div className="animate-fade-in pb-4">
            <div className="w-full h-px bg-slate-200 dark:bg-white/10 my-4"></div>
            <div className="px-4 py-2 mb-1"><span className={`text-[10px] font-black uppercase tracking-[0.2em] ${mgmt.colorClass}`}>Vùng Quản Trị</span></div>
            
            <button onClick={() => router.push(mgmt.profilePath as string)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all mb-1 ${pathname === mgmt.profilePath ? `${mgmt.bgClass} ${mgmt.colorClass}` : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-200/30 dark:hover:bg-white/5'}`}>
              <Crown size={22} /> <span className="text-sm">{mgmt.profileLabel}</span>
            </button>
            
            <button onClick={() => router.push(mgmt.dashboardPath as string)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${pathname === mgmt.dashboardPath ? `${mgmt.bgClass} ${mgmt.colorClass}` : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-200/30 dark:hover:bg-white/5'}`}>
              <LayoutDashboard size={22} /> <span className="text-sm">{mgmt.dashboardLabel}</span>
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto px-4 pb-6 pt-4 border-t border-slate-200 dark:border-white/10 relative">
        
        {isUserMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
            <div className="absolute bottom-[calc(100%+10px)] left-4 right-4 p-2 flex flex-col gap-1 z-50 animate-slide-up bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl">
              <button onClick={() => { setIsUserMenuOpen(false); toast.info("Tính năng Cài đặt hệ thống đang được phát triển!"); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm w-full text-left">
                <Settings size={16} /> Cài đặt
              </button>
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left">
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          </>
        )}

        {user ? (
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="w-full flex items-center gap-3 p-2 rounded-[1.25rem] hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-300 dark:hover:border-white/10 text-left group">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-300 dark:border-zinc-700 group-hover:border-[#80BF84] transition-colors">
                    <UserIcon size={20} className="text-slate-400 dark:text-zinc-500" />
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${mgmt.colorClass}`}>{mgmt.roleName}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">{user.user_metadata?.full_name || user.email.split('@')[0]}</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-500 truncate">@username_placeholder</span>
                </div>
            </button>
        ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-[1.25rem] bg-[#80BF84]/10 text-[#80BF84] hover:bg-[#80BF84] hover:text-zinc-950 transition-all font-bold group">
                <UserIcon size={20} className="group-hover:scale-110 transition-transform" /> <span className="text-sm">Đăng nhập ngay</span>
            </button>
        )}
      </div>
    </div>
  );
}

