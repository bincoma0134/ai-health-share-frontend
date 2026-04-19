"use client";

import { useEffect, useState, useRef } from "react";
import { 
    Home, User as UserIcon, UploadCloud, Image as ImageIcon, Video, Save, 
    Link2, DollarSign, FileText, Sun, Moon, Edit3, X, MapPin, Star, 
    ShieldCheck, MessageSquare, Plus, Trash2, LayoutDashboard, Globe, Music,
    Users, Camera, PlayCircle, Sparkles, Heart, Activity // <-- Đã bổ sung Sparkles và Heart
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

// Type cho Social Links
type SocialPlatform = 'facebook' | 'tiktok' | 'instagram' | 'youtube' | 'website';
interface SocialLink { platform: SocialPlatform; url: string; }

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
    address: "",
    avatar_url: "",
    cover_url: ""
  });
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // --- MOCK STATE THỐNG KÊ (Hiển thị UI) ---
  const [partnerStats, setPartnerStats] = useState({
    trustScore: 92,
    avgRating: 4.8,
    totalReviews: 124,
    recentFeedback: [
      { id: 1, name: "Nguyễn V. A", rating: 5, comment: "Dịch vụ rất chuyên nghiệp, không gian thư giãn tuyệt đối." },
      { id: 2, name: "Trần T. B", rating: 5, comment: "Bác sĩ tư vấn rất tận tâm, sẽ quay lại vào tuần sau." },
    ]
  });

  // --- STATE UPLOAD VIDEO ---
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
            if (p.role === "USER") {
                toast.error("Bạn không có quyền truy cập Hậu trường Doanh nghiệp!");
                router.push("/");
                return;
            }
            setProfileData({
                full_name: p.full_name || "",
                bio: p.bio || "",
                address: p.address || "", 
                avatar_url: p.avatar_url || "",
                cover_url: p.cover_url || ""
            });
            
            // Parse Social Links (Bảo vệ lỗi JSON)
            try {
              if (p.social_links) {
                const parsed = JSON.parse(p.social_links);
                setSocials(Array.isArray(parsed) ? parsed : []);
              }
            } catch(e) { setSocials([]); }

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
  };

  // --- LOGIC SOCIAL LINKS ---
  const addSocialLink = () => {
    if (socials.length >= 5) {
      toast.warning("Chỉ được thêm tối đa 5 liên kết mạng xã hội.");
      return;
    }
    setSocials([...socials, { platform: 'website', url: '' }]);
  };

  const updateSocial = (index: number, key: keyof SocialLink, value: string) => {
    const updated = [...socials];
    updated[index][key] = value as SocialPlatform;
    setSocials(updated);
  };

  const removeSocial = (index: number) => {
    setSocials(socials.filter((_, i) => i !== index));
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Users size={18} className="text-blue-500" />;
      case 'instagram': return <Camera size={18} className="text-pink-500" />;
      case 'youtube': return <PlayCircle size={18} className="text-red-500" />;
      case 'tiktok': return <Music size={18} className="text-slate-800 dark:text-white" />;
      default: return <Globe size={18} className="text-emerald-500" />;
    }
  };

  // --- LOGIC SAVE PROFILE ---
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    const toastId = toast.loading("Đang cập nhật hồ sơ...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Gói socials thành chuỗi JSON để không phải sửa Backend schema ngay
        const payload = { ...profileData, social_links: JSON.stringify(socials) };

        await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
            body: JSON.stringify(payload)
        });
        toast.success("Cập nhật hồ sơ thành công!", { id: toastId });
    } catch (e) {
        toast.error("Có lỗi xảy ra!", { id: toastId });
    } finally {
        setIsSavingProfile(false);
    }
  };

  // --- LOGIC XỬ LÝ VIDEO ---
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "video/mp4" && file.type !== "video/quicktime") {
        toast.error("Chỉ chấp nhận định dạng Video (MP4, MOV)");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Kích thước video tối đa là 50MB");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !videoData.service_name || !videoData.price) {
        toast.error("Vui lòng điền đủ Tên dịch vụ, Giá và chọn Video!");
        return;
    }
    setIsUploadingVideo(true);
    const toastId = toast.loading("Đang tải video lên máy chủ, vui lòng không tắt trang...");
    
    try {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('video_partner')
            .upload(fileName, videoFile, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error("Lỗi Upload Supabase: " + uploadError.message);

        const { data: { publicUrl } } = supabase.storage.from('video_partner').getPublicUrl(fileName);

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("https://ai-health-share-backend.onrender.com/services", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
                service_name: videoData.service_name,
                description: videoData.description,
                price: parseFloat(videoData.price),
                video_url: publicUrl
            })
        });

        const result = await response.json();
        if (result.status !== "success") throw new Error(result.detail || "Không thể lưu dữ liệu");

        toast.success("Đăng video thành công! Video đang chờ duyệt.", { id: toastId });
        setVideoFile(null); setVideoPreview(null); setVideoData({ service_name: "", description: "", price: "" });
    } catch (e: any) {
        toast.error(e.message || "Lỗi tải video!", { id: toastId });
    } finally {
        setIsUploadingVideo(false);
    }
  };

  if (isLoading || !isMounted) return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div>
        <div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Sparkles className="text-white w-6 h-6 animate-pulse" />
        </div>
      </div>
      <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">
        Khơi nguồn sức sống...
      </p>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden flex relative transition-colors duration-500">
      
      {/* 1. LEFT SIDEBAR */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-10" onClick={() => router.push('/')}><h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white font-bold transition-all"><LayoutDashboard size={24} strokeWidth={2.5} className="text-[#80BF84]" /><span className="text-sm tracking-wide">Tổng quan</span></button>
          <button onClick={() => router.push('/partner/dashboard')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><DollarSign size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Dòng tiền</span></button>
        </div>
      </div>

      {/* 2. MAIN BACKSTAGE AREA */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>

        <div className="max-w-[1400px] mx-auto pt-24 pb-32 px-4 md:px-8 xl:px-12">
            <div className="mb-10 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">Hậu trường Doanh nghiệp</h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Tùy chỉnh nhận diện thương hiệu và tải lên video dịch vụ chất lượng cao.</p>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex p-1.5 bg-slate-200/50 dark:bg-white/5 backdrop-blur-md rounded-2xl w-max mb-8 border border-slate-300 dark:border-white/10 animate-slide-up">
                <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    <UserIcon size={18} /> Hồ sơ
                </button>
                <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'video' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    <Video size={18} /> Studio
                </button>
            </div>

            {/* CONTENT TABS */}
            <div className="animate-fade-in relative z-10">
                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* CỘT 1: FORM CẬP NHẬT HỒ SƠ (Chiếm 2/3) */}
                        <div className="xl:col-span-2 glass-panel p-6 md:p-8 rounded-[2rem] bg-white/70 dark:bg-black/40 border-slate-200 dark:border-white/10 shadow-2xl flex flex-col gap-8">
                            
                            {/* Khối Ảnh Cover & Avatar */}
                            <div>
                                <div className="relative w-full h-40 md:h-56 rounded-3xl bg-slate-200 dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center group overflow-hidden cursor-pointer transition-colors">
                                    {profileData.cover_url ? (
                                        <img src={profileData.cover_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <><ImageIcon size={32} className="text-slate-400 dark:text-zinc-600 mb-2 group-hover:scale-110 transition-transform" /><span className="text-sm font-semibold text-slate-500 dark:text-zinc-500">Tải lên Ảnh Bìa Doanh Nghiệp</span></>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                                </div>
                                <div className="relative -mt-16 md:-mt-20 ml-8 w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-zinc-950 bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shadow-xl group cursor-pointer overflow-hidden z-10">
                                    {profileData.avatar_url ? (
                                        <img src={profileData.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon size={40} className="text-slate-400 dark:text-zinc-600" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="text-white"/></div>
                                </div>
                            </div>

                            {/* Khối Thông tin Text */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Tên Thương Hiệu</label>
                                    <input type="text" className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white" placeholder="VD: Dr. AI Health Spa" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1 flex items-center gap-1"><MapPin size={16}/> Địa chỉ cơ sở</label>
                                    <input type="text" className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white" placeholder="VD: 123 Nguyễn Văn Cừ, Hà Nội" value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} />
                                </div>
                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1 flex items-center gap-1"><FileText size={16}/> Giới thiệu chi tiết (Bio)</label>
                                    <textarea rows={3} className="glass-input px-5 py-4 w-full dark:bg-white/5 dark:text-white resize-none" placeholder="Chia sẻ về kinh nghiệm, công nghệ và sứ mệnh chăm sóc sức khỏe của bạn..." value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} />
                                </div>
                            </div>

                            {/* Khối Liên kết Mạng xã hội Động */}
                            <div className="bg-slate-100/50 dark:bg-white/5 p-5 rounded-3xl border border-slate-200 dark:border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1 flex items-center gap-2"><Link2 size={16}/> Mạng Xã Hội ({socials.length}/5)</label>
                                    <button onClick={addSocialLink} disabled={socials.length >= 5} className="flex items-center gap-1 px-3 py-1.5 bg-[#80BF84]/10 text-[#80BF84] rounded-lg hover:bg-[#80BF84]/20 disabled:opacity-50 transition-colors text-sm font-bold">
                                        <Plus size={16}/> Thêm Link
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {socials.length === 0 && <p className="text-sm text-slate-400 text-center py-2 italic">Chưa có liên kết nào. Thêm link để tăng độ uy tín.</p>}
                                    {socials.map((social, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    {getSocialIcon(social.platform)}
                                                </div>
                                                <select 
                                                    value={social.platform} 
                                                    onChange={e => updateSocial(index, 'platform', e.target.value)}
                                                    className="appearance-none glass-input pl-10 pr-6 py-3 bg-white dark:bg-zinc-900 text-sm font-medium w-32 border-none ring-1 ring-slate-200 dark:ring-white/10"
                                                >
                                                    <option value="website">Website</option>
                                                    <option value="facebook">Facebook</option>
                                                    <option value="tiktok">TikTok</option>
                                                    <option value="instagram">Instagram</option>
                                                    <option value="youtube">Youtube</option>
                                                </select>
                                            </div>
                                            <input 
                                                type="text" 
                                                className="glass-input px-4 py-3 flex-1 text-sm bg-white dark:bg-zinc-900 border-none ring-1 ring-slate-200 dark:ring-white/10" 
                                                placeholder="Nhập đường dẫn URL..." 
                                                value={social.url} 
                                                onChange={e => updateSocial(index, 'url', e.target.value)} 
                                            />
                                            <button onClick={() => removeSocial(index)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex items-center gap-2 px-8 py-4 bg-[#80BF84] text-zinc-950 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(128,191,132,0.4)]">
                                    {isSavingProfile ? <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"/> : <Save size={20}/>}
                                    CẬP NHẬT THÔNG TIN
                                </button>
                            </div>
                        </div>

                        {/* CỘT 2: DASHBOARD THỐNG KÊ (Chiếm 1/3) */}
                        <div className="xl:col-span-1 flex flex-col gap-6">
                            {/* Card Trust Score */}
                            <div className="glass-panel p-6 rounded-[2rem] bg-gradient-to-br from-[#80BF84]/10 to-emerald-900/10 border border-[#80BF84]/20 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                                <div className="absolute -right-10 -top-10 text-[#80BF84]/5 rotate-12"><ShieldCheck size={160} /></div>
                                <h3 className="text-zinc-500 dark:text-zinc-400 font-bold mb-2 flex items-center gap-2"><ShieldCheck size={20} className="text-[#80BF84]"/> ĐIỂM UY TÍN</h3>
                                <div className="flex items-end gap-1">
                                    <span className="text-6xl font-black text-slate-800 dark:text-white drop-shadow-[0_0_15px_rgba(128,191,132,0.5)]">{partnerStats.trustScore}</span>
                                    <span className="text-2xl font-bold text-slate-400 mb-1">/100</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-3 font-medium">Hoạt động tốt và phản hồi tích cực giúp tăng điểm.</p>
                            </div>

                            {/* Card Đánh giá */}
                            <div className="glass-panel p-6 rounded-[2rem] bg-white/70 dark:bg-black/40 border-slate-200 dark:border-white/10 shadow-lg">
                                <h3 className="text-zinc-500 dark:text-zinc-400 font-bold mb-4 flex items-center gap-2"><Star size={20} className="text-amber-400"/> ĐÁNH GIÁ</h3>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="text-5xl font-black text-slate-800 dark:text-white">{partnerStats.avgRating}</div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex text-amber-400"><Star size={18} fill="currentColor"/><Star size={18} fill="currentColor"/><Star size={18} fill="currentColor"/><Star size={18} fill="currentColor"/><Star size={18} fill="currentColor" className="opacity-40"/></div>
                                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-bold">Dựa trên {partnerStats.totalReviews} lượt đánh giá</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Phản hồi gần đây</h4>
                                    {partnerStats.recentFeedback.map(fb => (
                                        <div key={fb.id} className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-white">{fb.name}</span>
                                                <div className="flex text-amber-400"><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/></div>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-zinc-300 italic">"{fb.comment}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'video' && (
                    <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] bg-white/70 dark:bg-black/40 border-slate-200 dark:border-white/10 shadow-2xl">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            
                            {/* CỘT TRÁI: PREVIEW ĐIỆN THOẠI (TikTok Style) */}
                            <div className="lg:col-span-5 flex justify-center">
                                <div className="w-full max-w-[340px] aspect-[9/16] bg-black rounded-[3rem] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col group">
                                    {videoPreview ? (
                                        <>
                                            <video src={videoPreview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                            {/* UI Overlay kiểu TikTok/Reels */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                                            
                                            {/* Cột Icon bên phải */}
                                            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-20 pointer-events-none">
                                                <div className="w-12 h-12 rounded-full bg-slate-200/20 backdrop-blur-sm flex items-center justify-center border border-white/20"><Heart size={24} fill="white" className="text-white"/></div>
                                                <div className="w-12 h-12 rounded-full bg-slate-200/20 backdrop-blur-sm flex items-center justify-center border border-white/20"><MessageSquare size={24} fill="white" className="text-white"/></div>
                                                <div className="w-12 h-12 rounded-full bg-slate-200/20 backdrop-blur-sm flex items-center justify-center border border-white/20"><Save size={24} fill="white" className="text-white"/></div>
                                            </div>

                                            {/* Đĩa nhạc xoay */}
                                            <div className="absolute right-4 bottom-6 w-12 h-12 rounded-full bg-zinc-800 animate-spin flex items-center justify-center border-4 border-zinc-900 pointer-events-none z-20">
                                                <Music size={16} className="text-[#80BF84]"/>
                                            </div>

                                            {/* Nội dung bên dưới */}
                                            <div className="absolute inset-x-0 bottom-0 p-5 pr-20 flex flex-col justify-end z-20 pointer-events-none">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-8 h-8 rounded-full bg-[#80BF84] flex items-center justify-center"><UserIcon size={16} className="text-zinc-900"/></div>
                                                    <span className="text-white font-bold text-sm">{profileData.full_name || "@doanhnghiep"}</span>
                                                </div>
                                                <h4 className="text-white font-black text-lg leading-tight mb-1 line-clamp-2 drop-shadow-md">{videoData.service_name || "Tiêu đề dịch vụ..."}</h4>
                                                <p className="text-zinc-200 text-sm line-clamp-2 drop-shadow-md">{videoData.description || "Mô tả trải nghiệm chi tiết sẽ hiển thị ở đây..."}</p>
                                                <div className="mt-3 px-3 py-1.5 bg-[#80BF84]/90 backdrop-blur-md rounded-lg w-max flex items-center gap-1">
                                                    <DollarSign size={14} className="text-zinc-900"/><span className="text-zinc-900 font-bold text-sm">{videoData.price ? Number(videoData.price).toLocaleString() + ' đ' : 'Giá dịch vụ'}</span>
                                                </div>
                                            </div>

                                            <button onClick={() => {setVideoFile(null); setVideoPreview(null)}} className="absolute top-6 left-6 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-rose-500 transition-colors z-30"><X size={20}/></button>
                                        </>
                                    ) : (
                                        <div onClick={() => fileInputRef.current?.click()} className="absolute inset-4 rounded-[2.5rem] border-2 border-dashed border-slate-600 bg-slate-900 hover:bg-slate-800 transition-colors flex flex-col items-center justify-center cursor-pointer p-6 text-center group-hover:border-[#80BF84]/50">
                                            <div className="w-20 h-20 bg-[#80BF84]/10 rounded-full flex items-center justify-center mb-6"><Video size={40} className="text-[#80BF84]" /></div>
                                            <p className="text-white font-bold text-lg mb-2">Tải Lên Video Ngắn</p>
                                            <p className="text-zinc-400 text-sm leading-relaxed">Định dạng MP4/MOV.<br/>Tỷ lệ khung hình 9:16.<br/>Dung lượng tối đa 50MB.</p>
                                        </div>
                                    )}
                                    <input type="file" accept="video/mp4,video/quicktime" ref={fileInputRef} onChange={handleVideoSelect} className="hidden" />
                                </div>
                            </div>

                            {/* CỘT PHẢI: FORM NHẬP LIỆU DỊCH VỤ */}
                            <div className="lg:col-span-7 flex flex-col gap-6 justify-center">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2"><Sparkles className="text-[#80BF84]"/> Thông Tin Dịch Vụ</h3>
                                    <p className="text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">Nội dung này sẽ hiển thị trực tiếp trên Video và liên kết với luồng thanh toán Escrow bảo chứng.</p>
                                </div>

                                <div className="p-6 bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl flex flex-col gap-6 mt-2">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Tiêu đề Thu hút (Hiển thị trên video)</label>
                                        <input type="text" maxLength={60} className="glass-input px-5 py-4 w-full bg-white dark:bg-zinc-900 text-lg font-bold border-none ring-1 ring-slate-200 dark:ring-white/10" placeholder="VD: Trị liệu Cổ Vai Gáy Chuyên Sâu 60 Phút" value={videoData.service_name} onChange={e => setVideoData({...videoData, service_name: e.target.value})} />
                                        <span className="text-xs text-right text-slate-400">{videoData.service_name.length}/60</span>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Mô tả trải nghiệm thực tế</label>
                                        <textarea rows={4} className="glass-input px-5 py-4 w-full bg-white dark:bg-zinc-900 resize-none border-none ring-1 ring-slate-200 dark:ring-white/10" placeholder="Mô tả công dụng, quy trình hoặc cảm nhận để thuyết phục khách hàng..." value={videoData.description} onChange={e => setVideoData({...videoData, description: e.target.value})} />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">Giá Dịch vụ Escrow (VND)</label>
                                        <div className="relative">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={20}/></div>
                                            <input type="number" className="glass-input pl-12 pr-5 py-4 w-full bg-white dark:bg-zinc-900 font-black text-2xl text-[#80BF84] border-none ring-1 ring-slate-200 dark:ring-white/10" placeholder="500000" value={videoData.price} onChange={e => setVideoData({...videoData, price: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleUploadVideo} disabled={isUploadingVideo || !videoFile} className={`mt-4 flex justify-center items-center gap-2 py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${videoFile ? 'bg-[#80BF84] text-zinc-950 hover:scale-[1.02] active:scale-95 shadow-[#80BF84]/40' : 'bg-slate-300 dark:bg-zinc-800 text-slate-500 dark:text-zinc-600 cursor-not-allowed'}`}>
                                    {isUploadingVideo ? <div className="w-6 h-6 border-4 border-zinc-950 border-t-transparent rounded-full animate-spin"/> : <UploadCloud size={24}/>}
                                    {isUploadingVideo ? 'ĐANG ĐẨY LÊN HỆ THỐNG...' : 'XUẤT BẢN VIDEO LÊN FEED'}
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button className="text-[#80BF84] hover:text-emerald-500 transition-colors group"><LayoutDashboard size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => router.push('/partner/dashboard')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><DollarSign size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

