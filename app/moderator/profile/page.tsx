"use client";

import { useEffect, useState } from "react";
import { 
    Home, User as UserIcon, ShieldCheck, CheckCircle, Clock, 
    Save, Sun, Moon, Bell, Edit3, ShieldAlert, Sparkles
  } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- KHỞI TẠO SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu biến môi trường Supabase!");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ModeratorProfile() {
  const router = useRouter();
  
  // --- STATE HỆ THỐNG ---
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);

  // --- STATE FORM HỒ SƠ ---
  const [profileData, setProfileData] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    cover_url: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- STATE THỐNG KÊ (Mock Data - Sẽ nối API sau) ---
  const [stats, setStats] = useState({
    pendingTotal: 0,
    approvedByMe: 0
  });

  useEffect(() => {
    setIsMounted(true);
    
    // Khởi tạo Theme
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Vui lòng đăng nhập!");
        router.push("/");
        return;
      }
      setUser(session.user);
      
      try {
        const res = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const result = await res.json();
        
        if (result.status === "success" && result.data.profile) {
            const p = result.data.profile;
            
            // 🚨 BẢO MẬT: Chặn truy cập nếu không phải MODERATOR hoặc SUPER_ADMIN
            if (p.role !== "MODERATOR" && p.role !== "SUPER_ADMIN") {
                toast.error("Truy cập trái phép! Bạn không phải Kiểm duyệt viên.");
                router.push("/");
                return;
            }
            
            setProfileData({
                full_name: p.full_name || "",
                bio: p.bio || "",
                avatar_url: p.avatar_url || "",
                cover_url: p.cover_url || ""
            });

            // Đồng bộ theme
            if (p.theme_preference === 'light') {
                setIsDarkMode(false);
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }

            // MÔ PHỎNG FETCH API THỐNG KÊ (Sẽ viết endpoint thật ở Backend sau)
            setTimeout(() => {
               setStats({ pendingTotal: 42, approvedByMe: 156 });
            }, 500);
        }
      } catch (error) {
        toast.error("Không thể tải thông tin hồ sơ.");
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, [router]);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    const toastId = toast.loading("Đang cập nhật hồ sơ kiểm duyệt...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
            body: JSON.stringify(profileData)
        });
        toast.success("Cập nhật thành công!", { id: toastId });
    } catch (e) {
        toast.error("Có lỗi xảy ra!", { id: toastId });
    } finally {
        setIsSavingProfile(false);
    }
  };

  if (isLoading || !isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-black"></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* 1. LEFT SIDEBAR DESKTOP */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-10" onClick={() => router.push('/')}><h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold transition-all border border-blue-500/20"><UserIcon size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Hồ sơ Cán bộ</span></button>
          
          {/* NÚT DẪN SANG DASHBOARD KIỂM DUYỆT */}
          <button onClick={() => router.push('/moderator/dashboard')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group">
            <div className="relative">
                <ShieldCheck size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                {stats.pendingTotal > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950"></span>}
            </div>
            <span className="text-sm tracking-wide">Duyệt Video</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN MODERATOR AREA */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Nút Sáng Tối & Thông báo */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
          <button className="relative w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            <Bell size={20}/>
            {hasNotification && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse"></span>}
          </button>
        </div>

        <div className="max-w-5xl mx-auto pt-24 pb-32 px-6 md:px-12">
            
            <div className="mb-10 animate-slide-up flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl border border-blue-500/20 text-blue-600 dark:text-blue-400"><ShieldAlert size={32} strokeWidth={2.5} /></div>
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1">Hồ sơ Kiểm duyệt</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Bảo vệ tính toàn vẹn và chất lượng nội dung của hệ thống.</p>
                </div>
            </div>

            {/* 🚀 KHU VỰC THỐNG KÊ (ANALYTICS WIDGETS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 animate-slide-up">
                {/* Thẻ 1: Hàng đợi hệ thống */}
                <div className="glass-panel p-6 md:p-8 rounded-[2rem] bg-white/70 dark:bg-black/50 border border-amber-500/20 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-amber-500/10 dark:text-amber-500/5 group-hover:scale-110 transition-transform"><Clock size={160} /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-3"><div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl"><Clock size={20} strokeWidth={3} /></div><h3 className="font-bold text-slate-700 dark:text-zinc-300">Hàng đợi Hệ thống</h3></div>
                        <div>
                            <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.pendingTotal}</span>
                            <span className="text-slate-500 dark:text-zinc-400 font-medium ml-2">Video chờ duyệt</span>
                        </div>
                        <button onClick={() => router.push('/moderator/dashboard')} className="w-max mt-2 text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">Đi tới Bảng điều khiển &rarr;</button>
                    </div>
                </div>

                {/* Thẻ 2: Đã duyệt bởi tôi */}
                <div className="glass-panel p-6 md:p-8 rounded-[2rem] bg-white/70 dark:bg-black/50 border border-emerald-500/20 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-emerald-500/10 dark:text-emerald-500/5 group-hover:scale-110 transition-transform"><CheckCircle size={160} /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><CheckCircle size={20} strokeWidth={3} /></div><h3 className="font-bold text-slate-700 dark:text-zinc-300">Hiệu suất Cá nhân</h3></div>
                        <div>
                            <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.approvedByMe}</span>
                            <span className="text-slate-500 dark:text-zinc-400 font-medium ml-2">Video đã xử lý</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1"><Sparkles size={14} className="text-emerald-500"/> Cảm ơn sự cống hiến của bạn!</p>
                    </div>
                </div>
            </div>

            {/* KHU VỰC HỒ SƠ */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-white/10 flex flex-col gap-8 shadow-2xl">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Thông tin Cán bộ</h3>
                    
                    {/* Ảnh bìa & Avatar */}
                    <div className="relative w-full h-40 md:h-56 rounded-3xl bg-slate-200 dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center group overflow-hidden cursor-pointer">
                        {profileData.cover_url && <img src={profileData.cover_url} className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                    </div>

                    <div className="relative -mt-16 md:-mt-20 ml-8 w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-zinc-950 bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shadow-xl group cursor-pointer overflow-hidden z-10">
                         {profileData.avatar_url ? <img src={profileData.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-slate-400 dark:text-zinc-600" />}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                    </div>

                    {/* Form Nhập liệu */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Họ và Tên Cán bộ</label>
                            <input type="text" className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white" placeholder="VD: Nguyễn Văn A" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Giới thiệu (Chỉ quản trị viên mới thấy)</label>
                            <textarea rows={3} className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white resize-none" placeholder="Kinh nghiệm y khoa, chuyên ngành kiểm duyệt..." value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                        <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                            {isSavingProfile ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={20}/>}
                            LƯU HỒ SƠ
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* 3. MOBILE BOTTOM DOCK */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors group"><UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => router.push('/moderator/dashboard')} className="relative text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group">
                <ShieldCheck size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                {stats.pendingTotal > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950"></span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}