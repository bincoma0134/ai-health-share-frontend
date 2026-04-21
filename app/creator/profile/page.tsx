"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Sun, Moon, Bell, Edit3, Image as ImageIcon, Save, 
  Video, Sparkles, Star, Link2
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function CreatorProfile() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI();
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // --- THÔNG TIN CREATOR ---
  const [profileData, setProfileData] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    cover_url: "",
    social_tiktok: "",
    social_youtube: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
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
            
            // 🚨 Kiểm tra quyền CREATOR
            if (p.role !== "CREATOR" && p.role !== "SUPER_ADMIN") {
                toast.error("Truy cập trái phép! Khu vực dành riêng cho Creator.");
                router.push("/");
                return;
            }
            
            setProfileData({
                full_name: p.full_name || "",
                bio: p.bio || "",
                avatar_url: p.avatar_url || "",
                cover_url: p.cover_url || "",
                social_tiktok: p.metadata?.tiktok || "",
                social_youtube: p.metadata?.youtube || ""
            });

            if (p.theme_preference === 'light') {
                setIsDarkMode(false);
                document.documentElement.classList.remove('dark');
            }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setIsUploadingImage(true);
      const toastId = toast.loading(`Đang tải ảnh ${type === 'avatar' ? 'đại diện' : 'bìa'}...`);

      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-${type}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (type === 'avatar') setProfileData({ ...profileData, avatar_url: publicUrlData.publicUrl });
          else setProfileData({ ...profileData, cover_url: publicUrlData.publicUrl });

          toast.success("Tải ảnh lên thành công!", { id: toastId });
      } catch (error: any) {
          toast.error(`Lỗi tải ảnh: ${error.message}`, { id: toastId });
      } finally { setIsUploadingImage(false); }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    const toastId = toast.loading("Đang cập nhật hồ sơ sáng tạo...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const payload = {
            ...profileData,
            metadata: { tiktok: profileData.social_tiktok, youtube: profileData.social_youtube }
        };

        await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
            body: JSON.stringify(payload)
        });
        toast.success("Cập nhật thành công!", { id: toastId });
    } catch (e) {
        toast.error("Có lỗi xảy ra khi lưu!", { id: toastId });
    } finally { setIsSavingProfile(false); }
  };

  if (isLoading || !isMounted) return (
    <div className="flex-1 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 h-[100dvh]">
      <Star className="text-amber-500 w-10 h-10 animate-spin-slow" />
      <p className="text-amber-500 text-sm font-bold tracking-widest uppercase animate-pulse">Đang nạp dữ liệu Creator...</p>
    </div>
  );

  return (
    <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-black transition-colors duration-500">
      
      {/* Nút Sáng Tối & Thông báo */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
        <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
          {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
        <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 hover:text-amber-500 transition-all shadow-lg">
          <Bell size={20}/>
        </button>
      </div>

      <div className="max-w-4xl mx-auto pt-20 md:pt-24 pb-32 px-6 md:px-8">
          
          <div className="mb-10 animate-slide-up flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <Video size={32} strokeWidth={2.5} />
              </div>
              <div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1">Hồ sơ Sáng tạo</h2>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">Nơi định hình phong cách và thương hiệu cá nhân của bạn.</p>
              </div>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-amber-500/20 flex flex-col gap-8 shadow-2xl relative">
                  
                  {isUploadingImage && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-50 rounded-[2.5rem] flex items-center justify-center">
                          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                  )}

                  {/* Ảnh bìa & Avatar */}
                  <div onClick={() => coverInputRef.current?.click()} className="relative w-full h-48 md:h-64 rounded-3xl bg-slate-200 dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-amber-500/30 flex flex-col items-center justify-center group overflow-hidden cursor-pointer transition-colors hover:border-amber-500/50">
                      {profileData.cover_url ? (
                          <img src={profileData.cover_url} className="w-full h-full object-cover" />
                      ) : (
                          <><ImageIcon size={32} className="text-slate-400 dark:text-zinc-600 mb-2 group-hover:scale-110 transition-transform" /><span className="text-sm font-semibold text-slate-500 dark:text-zinc-500">Tải lên Ảnh Bìa Kênh</span></>
                      )}
                      <div className="absolute inset-0 bg-amber-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                      <input type="file" accept="image/*" ref={coverInputRef} className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
                  </div>

                  <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-24 px-4 md:px-8 relative z-10">
                    <div onClick={() => avatarInputRef.current?.click()} className="relative w-28 h-28 md:w-36 md:h-36 rounded-full border-[6px] border-white dark:border-zinc-950 bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shadow-xl group cursor-pointer overflow-hidden transition-transform hover:scale-105">
                        {profileData.avatar_url ? (
                            <img src={profileData.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <Star size={40} className="text-amber-400 dark:text-amber-600" />
                        )}
                        <div className="absolute inset-0 bg-amber-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                        <input type="file" accept="image/*" ref={avatarInputRef} className="hidden" onChange={(e) => handleImageUpload(e, 'avatar')} />
                    </div>
                    <div className="text-center md:text-left flex-1 mb-2">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase tracking-widest rounded-full border border-amber-500/20 flex items-center gap-1 w-max mx-auto md:mx-0 mb-2">
                          <Sparkles size={12}/> Verified Creator
                        </span>
                    </div>
                  </div>

                  {/* Form Nhập liệu */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="flex flex-col gap-2">
                          <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Tên Kênh / Họ Tên</label>
                          <input type="text" className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white focus:border-amber-500 focus:ring-amber-500/20" placeholder="VD: Healthie By My" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} />
                      </div>
                      
                      <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Mô tả Bản thân (Bio)</label>
                          <textarea rows={3} className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white resize-none focus:border-amber-500 focus:ring-amber-500/20" placeholder="Chia sẻ kiến thức về Yoga, Dinh dưỡng và Sức khỏe tinh thần..." value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} />
                      </div>

                      {/* Social Links */}
                      <div className="md:col-span-2 mt-4"><h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Link2 className="text-amber-500" size={18}/> Liên kết Mạng xã hội</h4></div>
                      
                      <div className="flex flex-col gap-2">
                          <div className="relative group">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-500 transition-colors"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                              <input type="text" className="glass-input pl-12 pr-5 py-4 w-full dark:bg-white/5 dark:text-white focus:border-pink-500 focus:ring-pink-500/20" placeholder="Link TikTok / Instagram" value={profileData.social_tiktok} onChange={e => setProfileData({...profileData, social_tiktok: e.target.value})} />
                          </div>
                      </div>
                      <div className="flex flex-col gap-2">
                          <div className="relative group">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors"><path d="M2.5 7.1C2.6 5.3 4.1 4 6 4h12c1.9 0 3.4 1.3 3.5 3.1 0 1.6.1 3.2.1 4.9s0 3.3-.1 4.9c-.1 1.8-1.6 3.1-3.5 3.1H6c-1.9 0-3.4-1.3-3.5-3.1C2.4 15.2 2.4 13.6 2.4 12s0-3.2.1-4.9z"/><path d="m10 8 6 4-6 4z"/></svg>
                              <input type="text" className="glass-input pl-12 pr-5 py-4 w-full dark:bg-white/5 dark:text-white focus:border-red-500 focus:ring-red-500/20" placeholder="Link Kênh YouTube" value={profileData.social_youtube} onChange={e => setProfileData({...profileData, social_youtube: e.target.value})} />
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-white/10 mt-2">
                      <button onClick={handleSaveProfile} disabled={isSavingProfile || isUploadingImage} className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50">
                          {isSavingProfile ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={20}/>}
                          LƯU HỒ SƠ
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}