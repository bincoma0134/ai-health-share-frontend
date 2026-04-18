"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Home, Compass, CalendarDays, Heart, User as UserIcon, Sparkles, 
  UploadCloud, Image as ImageIcon, Video, Save, Link2, DollarSign, 
  FileText, CheckCircle, Sun, Moon, Bell, Edit3, X, Play
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

export default function PartnerBackstage() {
  const router = useRouter();
  
  // --- STATE HỆ THỐNG ---
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'video'>('profile');

  // --- STATE FORM HỒ SƠ ---
  const [profileData, setProfileData] = useState({
    full_name: "",
    bio: "",
    social_links: "",
    avatar_url: "",
    cover_url: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- STATE UPLOAD VIDEO (STUDIO) ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoData, setVideoData] = useState({
    service_name: "",
    description: "",
    price: ""
  });
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Fetch data hồ sơ hiện tại từ Backend
      try {
        const res = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const result = await res.json();
        if (result.status === "success" && result.data.profile) {
            const p = result.data.profile;
            // Bảo mật: Nếu không phải Partner/Admin, đá ra trang chủ
            if (p.role === "USER") {
                toast.error("Bạn không có quyền truy cập Hậu trường Doanh nghiệp!");
                router.push("/");
                return;
            }
            setProfileData({
                full_name: p.full_name || "",
                bio: p.bio || "",
                social_links: p.social_links || "", // Đã dự kiến trong Database
                avatar_url: p.avatar_url || "",
                cover_url: p.cover_url || ""
            });
            if (p.theme_preference === 'light') {
                setIsDarkMode(false);
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
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

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    // Bỏ qua bước đồng bộ backend ở đây để code gọn nhẹ
  };

  // --- LOGIC XỬ LÝ VIDEO KÉO THẢ ---
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "video/mp4" && file.type !== "video/quicktime") {
        toast.error("Chỉ chấp nhận định dạng Video (MP4, MOV)");
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // Limit 50MB
        toast.error("Kích thước video tối đa là 50MB");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
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
        toast.success("Cập nhật hồ sơ thành công!", { id: toastId });
    } catch (e) {
        toast.error("Có lỗi xảy ra!", { id: toastId });
    } finally {
        setIsSavingProfile(false);
    }
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !videoData.service_name || !videoData.price) {
        toast.error("Vui lòng điền đủ Tên dịch vụ, Giá và chọn Video!");
        return;
    }
    setIsUploadingVideo(true);
    const toastId = toast.loading("Đang tải video lên máy chủ (Bucket: video_partner)...");
    
    try {
        // MÔ PHỎNG UPLOAD (Sẽ code thật ở Backend sau)
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        toast.success("Đăng video dịch vụ thành công! Khách hàng đã có thể nhìn thấy bạn.", { id: toastId });
        setVideoFile(null);
        setVideoPreview(null);
        setVideoData({ service_name: "", description: "", price: "" });
    } catch (e) {
        toast.error("Lỗi tải video!", { id: toastId });
    } finally {
        setIsUploadingVideo(false);
    }
  };

  if (isLoading || !isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-black"></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* 1. LEFT SIDEBAR (Dùng chung kiến trúc trang chủ) */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-10" onClick={() => router.push('/')}><h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white font-bold transition-all"><UserIcon size={24} strokeWidth={2.5} className="text-[#80BF84]" /><span className="text-sm tracking-wide">Hậu trường</span></button>
          <button onClick={() => router.push('/partner/dashboard')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><DollarSign size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Dòng tiền</span></button>
        </div>
      </div>

      {/* 2. MAIN BACKSTAGE AREA */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Header Toggles */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>

        <div className="max-w-5xl mx-auto pt-24 pb-32 px-6 md:px-12">
            
            <div className="mb-10 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">Hậu trường Doanh nghiệp</h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Tùy chỉnh mặt tiền cửa hàng và tải lên các video dịch vụ chất lượng cao.</p>
            </div>

            {/* TAB NAVIGATION KÍNH MỜ */}
            <div className="flex p-1.5 bg-slate-200/50 dark:bg-white/5 backdrop-blur-md rounded-2xl w-max mb-8 border border-slate-300 dark:border-white/10 animate-slide-up">
                <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    <UserIcon size={18} /> Hồ sơ & Nhận diện
                </button>
                <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'video' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    <Video size={18} /> Đăng Video Dịch vụ
                </button>
            </div>

            {/* CONTENT TABS */}
            <div className="animate-fade-in relative z-10">
                {activeTab === 'profile' && (
                    <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-white/10 flex flex-col gap-8 shadow-2xl">
                        
                        {/* Ảnh bìa & Avatar */}
                        <div className="relative w-full h-48 md:h-64 rounded-3xl bg-slate-200 dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center group overflow-hidden cursor-pointer transition-colors">
                            {profileData.cover_url ? (
                                <img src={profileData.cover_url} className="w-full h-full object-cover" />
                            ) : (
                                <><ImageIcon size={32} className="text-slate-400 dark:text-zinc-600 mb-2 group-hover:scale-110 transition-transform" /><span className="text-sm font-semibold text-slate-500 dark:text-zinc-500">Tải lên Ảnh Bìa (Bucket: avatars)</span></>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                        </div>

                        <div className="relative -mt-20 md:-mt-24 ml-8 w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-zinc-950 bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shadow-xl group cursor-pointer overflow-hidden z-10">
                             {profileData.avatar_url ? (
                                <img src={profileData.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={40} className="text-slate-400 dark:text-zinc-600" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="text-white"/></div>
                        </div>

                        {/* Form Nhập liệu */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Tên Hiển Thị / Thương Hiệu</label>
                                <input type="text" className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white" placeholder="VD: Dr. AI Health Spa" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1 flex items-center gap-2"><Link2 size={16}/> Liên kết Mạng Xã Hội</label>
                                <input type="text" className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white" placeholder="VD: https://tiktok.com/@abc" value={profileData.social_links} onChange={e => setProfileData({...profileData, social_links: e.target.value})} />
                            </div>
                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1 flex items-center gap-2"><FileText size={16}/> Tiểu sử chuyên gia (Bio)</label>
                                <textarea rows={4} className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white resize-none" placeholder="Giới thiệu về kinh nghiệm, chứng chỉ và sứ mệnh của bạn..." value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                            <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex items-center gap-2 px-8 py-4 bg-[#80BF84] text-zinc-950 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(128,191,132,0.4)]">
                                {isSavingProfile ? <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"/> : <Save size={20}/>}
                                CẬP NHẬT HỒ SƠ
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'video' && (
                    <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-white/10 shadow-2xl">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            
                            {/* CỘT TRÁI: PREVIEW ĐIỆN THOẠI 9:16 (TikTok Studio Style) */}
                            <div className="lg:col-span-5 flex justify-center">
                                <div className="w-full max-w-[320px] aspect-[9/16] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center group">
                                    {videoPreview ? (
                                        <>
                                            <video src={videoPreview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none p-6 flex flex-col justify-end">
                                                <h4 className="text-white font-bold text-lg leading-tight mb-1">{videoData.service_name || "Tên dịch vụ..."}</h4>
                                                <p className="text-zinc-300 text-xs line-clamp-2">{videoData.description || "Mô tả dịch vụ sẽ hiển thị ở đây..."}</p>
                                            </div>
                                            <button onClick={() => {setVideoFile(null); setVideoPreview(null)}} className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-rose-500 transition-colors"><X size={16}/></button>
                                        </>
                                    ) : (
                                        <div onClick={() => fileInputRef.current?.click()} className="absolute inset-4 rounded-[2.5rem] border-2 border-dashed border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 transition-colors flex flex-col items-center justify-center cursor-pointer p-6 text-center">
                                            <div className="w-16 h-16 bg-[#80BF84]/20 rounded-full flex items-center justify-center mb-4"><UploadCloud size={32} className="text-[#80BF84]" /></div>
                                            <p className="text-white font-bold mb-2">Chọn Video để Tải lên</p>
                                            <p className="text-zinc-400 text-xs">Định dạng MP4. Dọc (9:16).<br/>Tối đa 50MB.<br/>Sẽ lưu vào Bucket: video_partner</p>
                                        </div>
                                    )}
                                    <input type="file" accept="video/mp4,video/quicktime" ref={fileInputRef} onChange={handleVideoSelect} className="hidden" />
                                </div>
                            </div>

                            {/* CỘT PHẢI: FORM NHẬP LIỆU DỊCH VỤ */}
                            <div className="lg:col-span-7 flex flex-col gap-6 justify-center">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Cấu hình Dịch vụ</h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Thông tin này sẽ đính kèm dưới Video và liên kết trực tiếp với cổng thanh toán Escrow.</p>
                                </div>

                                <div className="flex flex-col gap-2 mt-4">
                                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Tiêu đề Dịch vụ / Video</label>
                                    <input type="text" maxLength={60} className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white text-lg font-bold" placeholder="VD: Liệu trình Trị liệu Cổ Vai Gáy Chuyên Sâu" value={videoData.service_name} onChange={e => setVideoData({...videoData, service_name: e.target.value})} />
                                    <span className="text-xs text-right text-slate-400">{videoData.service_name.length}/60</span>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Mô tả chi tiết</label>
                                    <textarea rows={3} className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white resize-none" placeholder="Giới thiệu công dụng, quy trình thực hiện..." value={videoData.description} onChange={e => setVideoData({...videoData, description: e.target.value})} />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Giá Dịch vụ (VND)</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={20}/></div>
                                        <input type="number" className="glass-input pl-12 pr-5 py-4 w-full dark:bg-white/5 dark:text-white font-black text-xl text-[#80BF84]" placeholder="500000" value={videoData.price} onChange={e => setVideoData({...videoData, price: e.target.value})} />
                                    </div>
                                </div>

                                <button onClick={handleUploadVideo} disabled={isUploadingVideo || !videoFile} className={`mt-6 flex justify-center items-center gap-2 py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${videoFile ? 'bg-[#80BF84] text-zinc-950 hover:scale-[1.02] active:scale-95 shadow-[#80BF84]/40' : 'bg-slate-300 dark:bg-zinc-800 text-slate-500 dark:text-zinc-600 cursor-not-allowed'}`}>
                                    {isUploadingVideo ? <div className="w-6 h-6 border-4 border-zinc-950 border-t-transparent rounded-full animate-spin"/> : <UploadCloud size={24}/>}
                                    {isUploadingVideo ? 'ĐANG TẢI LÊN MÁY CHỦ...' : 'XUẤT BẢN VIDEO DỊCH VỤ'}
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* 3. MOBILE BOTTOM DOCK (Kiến trúc dùng chung) */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button className="text-[#80BF84] hover:text-emerald-500 transition-colors group"><UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => router.push('/partner/dashboard')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><DollarSign size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon phụ trợ mượn tạm từ Lucide
const Camera = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>