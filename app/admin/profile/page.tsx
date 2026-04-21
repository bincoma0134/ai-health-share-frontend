"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Home, User as UserIcon, CheckCircle, Clock, Compass, CalendarDays, Heart, Sparkles,
  Save, Sun, Moon, Bell, Edit3, ShieldAlert, Image as ImageIcon, Activity,
  Crown, BarChart3, Users, LogOut, Settings
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext"; // IMPORT CONTEXT THÔNG BÁO

// --- KHỞI TẠO SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SuperAdminProfile() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI(); // LẤY HÀM MỞ THÔNG BÁO
  
  // --- STATE HỆ THỐNG & AUTH ---
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // --- STATE FORM HỒ SƠ ---
  const [profileData, setProfileData] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    cover_url: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // --- REFS CHO NÚT UPLOAD ẢNH ---
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // --- STATE THỐNG KÊ (Mock Data - Chờ API Bảng điều khiển) ---
  const [stats, setStats] = useState({
    totalPartners: 0,
    platformRevenue: 0
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
            
            // 🚨 BẢO MẬT: Chặn truy cập TUYỆT ĐỐI nếu không phải SUPER_ADMIN
            if (p.role !== "SUPER_ADMIN") {
                toast.error("Truy cập trái phép! Khu vực chỉ dành cho Quản trị viên cấp cao.");
                router.push("/");
                return;
            }
            
            setProfileData({
                full_name: p.full_name || "",
                bio: p.bio || "",
                avatar_url: p.avatar_url || "",
                cover_url: p.cover_url || ""
            });

            if (p.theme_preference === 'light') {
                setIsDarkMode(false);
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }

            // Mock Data tạm thời cho Admin (Sẽ làm API thống kê tổng sau)
            setTimeout(() => {
                setStats({ totalPartners: 245, platformRevenue: 1580000000 });
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

  const handleThemeToggle = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const themeStr = newMode ? 'dark' : 'light';
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', themeStr);

    if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({ theme_preference: themeStr })
        });
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    const toastId = toast.loading("Đang đăng xuất...");
    try {
      await supabase.auth.signOut();
      toast.success("Đã đăng xuất thành công!", { id: toastId });
      router.push("/");
    } catch (error) {
      toast.error("Lỗi đăng xuất!", { id: toastId });
    }
  };

  // --- LOGIC UPLOAD ẢNH TRỰC TIẾP LÊN SUPABASE STORAGE ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      if (!file.type.startsWith("image/")) {
          toast.error("Chỉ chấp nhận định dạng hình ảnh!");
          return;
      }

      setIsUploadingImage(true);
      const toastId = toast.loading(`Đang tải ảnh ${type === 'avatar' ? 'đại diện' : 'bìa'} lên hệ thống...`);

      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-${type}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

          if (type === 'avatar') {
              setProfileData({ ...profileData, avatar_url: publicUrlData.publicUrl });
          } else {
              setProfileData({ ...profileData, cover_url: publicUrlData.publicUrl });
          }

          toast.success("Tải ảnh lên thành công! Nhớ bấm Lưu Hồ Sơ nhé.", { id: toastId });
      } catch (error: any) {
          toast.error(`Lỗi tải ảnh: ${error.message}`, { id: toastId });
      } finally {
          setIsUploadingImage(false);
      }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    const toastId = toast.loading("Đang cập nhật hồ sơ...");
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

  if (isLoading || !isMounted) return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-violet-200 rounded-full animate-ping opacity-70"></div>
        <div className="absolute inset-2 bg-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30"><Crown className="text-white w-6 h-6 animate-pulse" /></div>
      </div>
      <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">Xác thực quyền hạn...</p>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      

      {/* 2. MAIN ADMIN AREA */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Nút Sáng Tối & Thông báo */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
          
          {/* NÚT THÔNG BÁO ĐÃ NỐI BACKEND BẰNG HÀM setIsNotifOpen */}
          <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 hover:text-violet-500 transition-all shadow-lg">
            <Bell size={20}/>
            {hasNotification && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse"></span>}
          </button>
        </div>

        <div className="max-w-5xl mx-auto pt-20 md:pt-24 pb-32 px-6 md:px-12">
            
            <div className="mb-10 animate-slide-up flex items-center gap-4">
                <div className="p-3 bg-violet-500/10 dark:bg-violet-500/20 rounded-2xl border border-violet-500/20 text-violet-600 dark:text-violet-400"><Crown size={32} strokeWidth={2.5} /></div>
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1">Hồ sơ</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Trung tâm định danh và cấu hình của Super Admin nền tảng.</p>
                </div>
            </div>

            {/* KHU VỰC THỐNG KÊ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 animate-slide-up">
                {/* Thẻ 1: Tổng Doanh Nghiệp */}
                <div className="glass-panel p-6 md:p-8 rounded-[2rem] bg-white/70 dark:bg-black/50 border border-violet-500/20 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-violet-500/10 dark:text-violet-500/5 group-hover:scale-110 transition-transform"><Users size={160} /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-3"><div className="p-2 bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl"><Users size={20} strokeWidth={3} /></div><h3 className="font-bold text-slate-700 dark:text-zinc-300">Tổng Doanh Nghiệp</h3></div>
                        <div>
                            <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.totalPartners}</span>
                            <span className="text-slate-500 dark:text-zinc-400 font-medium ml-2">Đối tác vận hành</span>
                        </div>
                        <button onClick={() => router.push('/admin/dashboard')} className="w-max mt-2 text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">Đi tới Bảng điều khiển &rarr;</button>
                    </div>
                </div>

                {/* Thẻ 2: Doanh Thu Nền Tảng */}
                <div className="glass-panel p-6 md:p-8 rounded-[2rem] bg-white/70 dark:bg-black/50 border border-emerald-500/20 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-emerald-500/10 dark:text-emerald-500/5 group-hover:scale-110 transition-transform"><BarChart3 size={160} /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><Activity size={20} strokeWidth={3} /></div><h3 className="font-bold text-slate-700 dark:text-zinc-300">Doanh thu Hệ thống (GTV)</h3></div>
                        <div>
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{(stats.platformRevenue / 1000000).toLocaleString()}M</span>
                            <span className="text-slate-500 dark:text-zinc-400 font-medium ml-2">VNĐ</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1"><Sparkles size={14} className="text-emerald-500"/> Nền tảng đang tăng trưởng tốt.</p>
                    </div>
                </div>
            </div>

            {/* KHU VỰC HỒ SƠ ADMIN */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-violet-500/20 flex flex-col gap-8 shadow-2xl relative">
                    {/* Lớp phủ Đang tải */}
                    {isUploadingImage && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-50 rounded-[2.5rem] flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Định danh Quản trị viên</h3>
                    
                    {/* Ảnh bìa & Avatar */}
                    <div onClick={() => coverInputRef.current?.click()} className="relative w-full h-40 md:h-56 rounded-3xl bg-slate-200 dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-violet-500/30 flex flex-col items-center justify-center group overflow-hidden cursor-pointer transition-colors hover:border-violet-500/50">
                        {profileData.cover_url ? (
                            <img src={profileData.cover_url} className="w-full h-full object-cover" />
                        ) : (
                            <><ImageIcon size={32} className="text-slate-400 dark:text-zinc-600 mb-2 group-hover:scale-110 transition-transform" /><span className="text-sm font-semibold text-slate-500 dark:text-zinc-500">Tải lên Ảnh Bìa</span></>
                        )}
                        <div className="absolute inset-0 bg-violet-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                        <input type="file" accept="image/*" ref={coverInputRef} className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
                    </div>

                    <div onClick={() => avatarInputRef.current?.click()} className="relative -mt-16 md:-mt-20 ml-8 w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-zinc-950 bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shadow-xl group cursor-pointer overflow-hidden z-10 transition-transform hover:scale-105">
                        {profileData.avatar_url ? (
                            <img src={profileData.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <Crown size={40} className="text-violet-400 dark:text-violet-600" />
                        )}
                        <div className="absolute inset-0 bg-violet-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                        <input type="file" accept="image/*" ref={avatarInputRef} className="hidden" onChange={(e) => handleImageUpload(e, 'avatar')} />
                    </div>

                    {/* Form Nhập liệu */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Bí danh / Họ tên Admin</label>
                            <input type="text" className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white focus:border-violet-500 focus:ring-violet-500/20" placeholder="VD: Admin Khởi Tạo" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Mô tả đặc quyền</label>
                            <textarea rows={3} className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white resize-none focus:border-violet-500 focus:ring-violet-500/20" placeholder="Quản lý dữ liệu toàn cục, phê duyệt đối tác..." value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                        <button onClick={handleSaveProfile} disabled={isSavingProfile || isUploadingImage} className="flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed">
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
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} /></button>
            
            {/* Nút Center điều hướng sang Dashboard Admin */}
            <button onClick={() => router.push('/admin/dashboard')} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-400 p-[2px] shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:scale-105 transition-all duration-300"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center"><Settings size={26} className="text-violet-500 group-hover:rotate-90 transition-transform duration-500" strokeWidth={2.5} /></div></div>
            </button>
            
            <button className="text-violet-600 dark:text-violet-400 transition-colors group"><Crown size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
            <div className="relative">
              {isUserMenuOpen && user && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute bottom-full mb-6 right-0 w-48 p-2 flex flex-col gap-1 z-50 animate-fade-in bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl">
                      <button className="flex items-center gap-3 px-3 py-3 rounded-xl bg-violet-50 dark:bg-white/10 text-violet-600 dark:text-white font-bold transition-all text-sm w-full text-left"><Crown size={16} /> Hồ sơ Admin</button>
                      <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left"><LogOut size={16} /> Đăng xuất</button>
                  </div>
                </>
              )}
              <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group">
                <UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}