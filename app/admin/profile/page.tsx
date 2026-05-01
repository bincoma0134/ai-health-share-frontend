"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Sun, Moon, Bell, Edit3, Image as ImageIcon, Save, 
  Video, Sparkles, Link2, LayoutGrid, Heart, MessageCircle, Play, 
  MoreHorizontal, Share2, Clock, CheckCircle, Plus, FileText, 
  Eye, LogOut, UploadCloud, X, Trash2, Crown, Activity, Database, Server, ShieldCheck, Lock
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NotificationModal from "@/components/NotificationModal";
import { useUI } from "@/context/UIContext";
import { supabase } from "@/lib/supabase";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function SuperAdminProfile() {
  const router = useRouter();
  const { isNotifOpen, setIsNotifOpen, theme, toggleTheme } = useUI() as any;
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'videos' | 'posts' | 'settings'>('activity');

  // --- DỮ LIỆU ---
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState({ followers_count: 0, active_services: 0, system_stability: 99.9 });
  const [videos, setVideos] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  // --- MOCK SYSTEM LOGS DÀNH RIÊNG CHO TAB HOẠT ĐỘNG ---
  const [systemLogs] = useState([
      { id: 1, type: 'success', msg: 'Hệ thống sao lưu dữ liệu (Database Backup) thành công.', time: '10 phút trước', icon: Database },
      { id: 2, type: 'warning', msg: 'Cảnh báo lưu lượng truy cập tăng cao tại Cụm Server A.', time: '1 giờ trước', icon: Activity },
      { id: 3, type: 'info', msg: 'Đồng bộ hóa trạng thái giao dịch Escrow với cổng thanh toán.', time: '3 giờ trước', icon: Server },
      { id: 4, type: 'success', msg: 'Trí tuệ nhân tạo (AI Engine) phản hồi ổn định ở mức 115ms.', time: '1 ngày trước', icon: Sparkles },
  ]);

  // --- FORM HỒ SƠ ---
  const [editForm, setEditForm] = useState({ username: "", full_name: "", bio: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // --- MODALS ---
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [studioData, setStudioData] = useState({ title: "", content: "", price: "" });
  const [studioFile, setStudioFile] = useState<File | null>(null);
  const [studioPreview, setStudioPreview] = useState<string | null>(null);
  const [isStudioUploading, setIsStudioUploading] = useState(false);

  const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
  const [postData, setPostData] = useState({ content: "" });
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const [isPostUploading, setIsPostUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const studioInputRef = useRef<HTMLInputElement>(null);
  const postInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push("/"); return; }
    setUser(session.user);
    
    try {
      const fetchOpts = { headers: { "Authorization": `Bearer ${session.access_token}` } };
      
      let pData = null, sData = null, cData = null;

      try { pData = await (await fetch(`${API_URL}/user/profile`, fetchOpts)).json(); } catch (e) {}
      try { sData = await (await fetch(`${API_URL}/admin/profile-stats`, fetchOpts)).json(); } catch (e) {}
      try { cData = await (await fetch(`${API_URL}/admin/my-content`, fetchOpts)).json(); } catch (e) {}
      
      // Xác thực Profile
      if (pData && pData.status === "success" && pData.data.profile) {
          const p = pData.data.profile;
          if (p.role !== "SUPER_ADMIN") {
              toast.error("Truy cập trái phép! Chỉ dành cho Super Admin.");
              router.push("/");
              return;
          }
          setProfileData(p);
          setEditForm({ username: p.username || "", full_name: p.full_name || "", bio: p.bio || "" });
      }

      // Nạp Dữ liệu Stats & Content
      if (sData && sData.status === "success") setStats(sData.data);
      if (cData && cData.status === "success") {
          setVideos(cData.data.videos || []);
          setPosts(cData.data.community_posts || []);
      }
    } catch (error) { toast.error("Lỗi đồng bộ dữ liệu hệ thống."); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [router]);

  const handleLogout = async () => { 
      await supabase.auth.signOut(); 
      router.push("/"); 
  };

  const handleShareProfile = () => {
      const url = `${window.location.origin}/${profileData?.username}`;
      navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết Hồ sơ Công khai!");
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const tid = toast.loading("Đang cập nhật hồ sơ...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/user/profile`, { 
          method: "PATCH", 
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, 
          body: JSON.stringify(editForm) 
      });
      if (!res.ok) throw new Error("Lỗi lưu hồ sơ");
      toast.success("Hồ sơ hệ thống đã được lưu!", { id: tid });
      fetchData();
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsUpdating(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      setIsUploadingImage(true);
      const tid = toast.loading(`Đang tải ảnh ${type} hệ thống...`);
      try {
          const fileName = `${user.id}-${type}-${Date.now()}.${file.name.split('.').pop()}`;
          const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
          if (upErr) throw new Error("Lỗi tải ảnh");
          
          const publicUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
          const { data: { session } } = await supabase.auth.getSession();
          
          await fetch(`${API_URL}/user/profile`, { 
              method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, 
              body: JSON.stringify(type === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl }) 
          });
          toast.success("Cập nhật ảnh thành công!", { id: tid });
          fetchData();
      } catch (e: any) { toast.error(e.message, { id: tid }); } 
      finally { setIsUploadingImage(false); }
  };

  // TẠO VIDEO (ADMIN ĐƯỢC AUTO-APPROVE)
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioFile || !studioData.title) return toast.error("Cần Video và Tiêu đề!");
    setIsStudioUploading(true);
    const tid = toast.loading("Đang đẩy Video lên hệ thống...");
    try {
        const fileName = `studio-${Date.now()}.${studioFile.name.split('.').pop()}`;
        const { error: upErr } = await supabase.storage.from('media').upload(fileName, studioFile);
        if (upErr) throw new Error("Lỗi tải video");
        const videoUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;
        
        const { data: { session } } = await supabase.auth.getSession();
        const payload = { title: studioData.title, content: studioData.content, price: studioData.price ? parseFloat(studioData.price) : null, video_url: videoUrl };
        await fetch(`${API_URL}/tiktok/feeds`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload) });

        toast.success("Video đã được Đăng trực tiếp (Auto-Approved)!", { id: tid });
        setStudioData({ title: "", content: "", price: "" }); setStudioFile(null); setStudioPreview(null);
        setIsAddVideoModalOpen(false); fetchData(); 
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsStudioUploading(false); }
  };

  // TẠO POST CỘNG ĐỒNG
  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postData.content) return toast.error("Nội dung không được rỗng!");
    setIsPostUploading(true);
    const tid = toast.loading("Đang phát sóng bài đăng...");
    try {
        let imageUrl = null;
        if (postFile) {
            const fileName = `posts-${Date.now()}.${postFile.name.split('.').pop()}`;
            await supabase.storage.from('media').upload(fileName, postFile);
            imageUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const payload = { content: postData.content, image_url: imageUrl };
        await fetch(`${API_URL}/community/posts`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload) });

        toast.success("Bài viết đã được công bố!", { id: tid });
        setPostData({ content: "" }); setPostFile(null); setPostPreview(null);
        setIsAddPostModalOpen(false); fetchData(); 
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsPostUploading(false); }
  };

  if (isLoading) return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center transition-colors duration-500">
          <Crown className="text-amber-500 w-10 h-10 animate-pulse" />
          <p className="text-slate-500 mt-4 text-xs font-black tracking-widest uppercase">Xác thực hệ thống...</p>
      </div>
  );

  return (
    <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 font-be-vietnam">
      
      <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={e => handleImageUpload(e, 'avatar')} />
      <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={e => handleImageUpload(e, 'cover')} />

      {/* TOP NAV */}
      <div className="absolute top-0 w-full z-40 p-6 flex justify-end items-center bg-gradient-to-b from-slate-50 dark:from-zinc-950 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-lg hover:text-amber-500 transition-all">
              {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-amber-500 shadow-lg transition-all"><Bell size={20} /></button>
          </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {isNotifOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in"><NotificationModal /></div>}

          {/* --- COVER IMAGE (Đồng bộ Partner) --- */}
          <div className="relative w-full h-48 md:h-64 bg-slate-200 dark:bg-zinc-900 group cursor-pointer overflow-hidden" onClick={() => coverInputRef.current?.click()}>
              {profileData?.cover_url ? (
                  <img src={profileData.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="cover" />
              ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-amber-900/40 flex items-center justify-center">
                      <div className="flex flex-col items-center opacity-30"><Crown size={40} className="mb-2 text-amber-500"/> <span className="text-sm font-bold text-amber-500">Tải lên ảnh bìa</span></div>
                  </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 md:px-12 pb-32 relative z-10">
              
              {/* --- HEADER INFO --- */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 mb-10 animate-fade-in">
                  
                  {/* Avatar lồi lên khỏi Cover */}
                  <div className="relative shrink-0 -mt-16 md:-mt-20">
                      <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-400 to-yellow-600 rounded-full blur-md opacity-40"></div>
                      <div onClick={() => avatarInputRef.current?.click()} className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-white dark:bg-zinc-950 p-1.5 shadow-2xl cursor-pointer group z-10 border-2 border-white dark:border-zinc-950">
                          <img src={profileData?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.full_name}&background=1e293b&color=fbbf24`} className="w-full h-full object-cover rounded-full" />
                          <div className="absolute inset-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-gradient-to-r from-slate-900 to-slate-800 text-amber-400 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-xl border border-amber-500/30 whitespace-nowrap">
                          <Crown size={12} className="fill-amber-400/20"/> SUPER ADMIN
                      </div>
                  </div>

                  <div className="flex-1 w-full pt-4 md:pt-6 text-center md:text-left">
                      {/* Row 1: Tên và Nút chức năng ngang hàng */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                          <div>
                              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center justify-center md:justify-start gap-2 mb-1">
                                  {profileData?.full_name || "Quản Trị Viên"} <Crown size={24} className="text-amber-500" />
                              </h1>
                              <h2 className="text-base font-medium text-slate-500 dark:text-zinc-400">@{profileData?.username || "admin"}</h2>
                          </div>
                          
                          <div className="flex items-center justify-center md:justify-end gap-3 mt-2 md:mt-0">
                              <button onClick={() => router.push(`/${profileData?.username}`)} className="px-6 py-3.5 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-amber-400 dark:text-slate-900 font-black rounded-2xl hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 text-sm uppercase tracking-widest border border-amber-500/20">
                                  <Eye size={18} strokeWidth={3} /> Xem công khai
                              </button>
                              <button onClick={handleShareProfile} className="p-3.5 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-amber-500/10 hover:text-amber-500 transition-all shadow-sm active:scale-90"><Share2 size={18} /></button>
                              <button onClick={handleLogout} className="p-3.5 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-rose-500 rounded-xl hover:bg-rose-50 transition-all shadow-sm active:scale-90"><LogOut size={18} /></button>
                          </div>
                      </div>

                      {/* Row 2: CHỈ SỐ ADMIN */}
                      <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
                          <div className="flex items-center gap-2">
                              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{(stats.followers_count).toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Người quan<br/>tâm</span>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
                          <div className="flex items-center gap-2">
                              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{(stats.active_services).toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Dịch vụ<br/>Active</span>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
                          <div className="flex items-center gap-2">
                              <span className="text-xl md:text-2xl font-black text-amber-500">{stats.system_stability}%</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Độ ổn định<br/>hệ thống</span>
                          </div>
                      </div>

                      <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto md:mx-0 leading-relaxed">
                          {profileData?.bio || "Quản trị viên Hệ thống AI Health Share. Theo dõi, vận hành và quản lý tính toàn vẹn của nền tảng."}
                      </p>
                  </div>
              </div>

              {/* TABS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative items-start border-t border-slate-200 dark:border-white/10 pt-10">
                  <div className="lg:col-span-8">
                      <div className="flex justify-start gap-8 border-b border-slate-200 dark:border-white/10 pb-4 overflow-x-auto no-scrollbar">
                          <button onClick={() => setActiveTab('activity')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'activity' ? 'text-amber-500 border-b-2 border-amber-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                              <Activity size={16}/> HOẠT ĐỘNG
                          </button>
                          <button onClick={() => setActiveTab('videos')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'videos' ? 'text-amber-500 border-b-2 border-amber-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                              <LayoutGrid size={16}/> STUDIO
                          </button>
                          <button onClick={() => setActiveTab('posts')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'posts' ? 'text-amber-500 border-b-2 border-amber-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                              <MessageCircle size={16}/> BÀI ĐĂNG
                          </button>
                          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'settings' ? 'text-amber-500 border-b-2 border-amber-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                              <ShieldCheck size={16}/> HỒ SƠ & BẢO MẬT
                          </button>
                      </div>

                      <div className="mt-10">
                          {/* TAB 1: HOẠT ĐỘNG HỆ THỐNG (SYSTEM LOGS) */}
                          {activeTab === 'activity' && (
                              <div className="animate-fade-in space-y-6">
                                  <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight mb-6">Nhật ký Hệ thống Tự động</h3>
                                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-white/10 before:to-transparent">
                                      {systemLogs.map((log) => (
                                          <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 dark:border-zinc-950 bg-white dark:bg-zinc-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                  <log.icon size={16} className={log.type === 'success' ? 'text-emerald-500' : log.type === 'warning' ? 'text-amber-500' : 'text-blue-500'} />
                                              </div>
                                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm transition-transform hover:-translate-y-1">
                                                  <div className="flex items-center justify-between mb-2">
                                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${log.type === 'success' ? 'bg-emerald-50 text-emerald-600' : log.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>SYS_{log.type}</span>
                                                      <span className="text-[10px] font-bold text-slate-400">{log.time}</span>
                                                  </div>
                                                  <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">{log.msg}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* TAB 2: STUDIO */}
                          {activeTab === 'videos' && (
                              <div className="animate-fade-in space-y-6">
                                  <div className="flex justify-between items-center mb-6">
                                      <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Studio Video ({videos.length})</h3>
                                      <button onClick={() => setIsAddVideoModalOpen(true)} className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
                                          <Video size={16}/> Tải Video lên
                                      </button>
                                  </div>

                                  {videos.length === 0 ? (
                                      <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                                          <Video size={40} className="mx-auto text-slate-300 dark:text-zinc-700 mb-3"/>
                                          <p className="text-slate-500 font-bold">Chưa có video nội bộ hệ thống.</p>
                                      </div>
                                  ) : (
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                          {videos.map(vid => (
                                              <div key={vid.id} className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden group border border-slate-200 dark:border-white/10 shadow-sm">
                                                  <video src={vid.video_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" muted playsInline />
                                                  <div className="absolute top-3 left-3 z-10">
                                                      {/* Đã chỉnh sửa nhãn auto-approved cho Admin */}
                                                      <span className="px-2 py-1 rounded-md text-[8px] font-black uppercase backdrop-blur-md border bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                                                          <CheckCircle size={10} /> ĐÃ DUYỆT
                                                      </span>
                                                  </div>
                                                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                                                      <h3 className="text-white text-xs font-bold line-clamp-2 leading-tight mb-2 drop-shadow-md">{vid.title}</h3>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          )}

                          {/* TAB 3: BÀI ĐĂNG CỘNG ĐỒNG */}
                          {activeTab === 'posts' && (
                              <div className="animate-fade-in space-y-6">
                                  <div className="flex justify-between items-center mb-6">
                                      <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Thông báo Cộng đồng ({posts.length})</h3>
                                      <button onClick={() => setIsAddPostModalOpen(true)} className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
                                          <Edit3 size={16}/> Viết thông báo
                                      </button>
                                  </div>

                                  <div className="space-y-6">
                                      {posts.map(post => (
                                          <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm">
                                              <div className="flex items-center gap-3 mb-4">
                                                  <img src={profileData?.avatar_url} className="w-10 h-10 rounded-full" />
                                                  <div>
                                                      <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">{profileData?.full_name} <Crown size={12} className="text-amber-500"/></p>
                                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString('vi-VN')} • System Announcement</p>
                                                  </div>
                                              </div>
                                              <p className="text-sm text-slate-700 dark:text-zinc-300 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                              {post.image_url && (
                                                  <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-black max-h-[400px]">
                                                      <img src={post.image_url} className="w-full h-full object-cover" />
                                                  </div>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* TAB 4: HỒ SƠ & BẢO MẬT */}
                          {activeTab === 'settings' && (
                              <div className="animate-fade-in bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-6 md:p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-lg relative">
                                  {isUploadingImage && (
                                      <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-50 rounded-[3rem] flex items-center justify-center">
                                          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                      </div>
                                  )}
                                  
                                  <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight mb-6 flex items-center gap-2"><Edit3 size={20} className="text-amber-500"/> Thông tin Hiển thị</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                      <div className="flex flex-col gap-2">
                                          <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Username (Định danh hệ thống)</label>
                                          <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                                      </div>
                                      <div className="flex flex-col gap-2">
                                          <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Tên Admin Hiển Thị</label>
                                          <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                                      </div>
                                  </div>
                                  <div className="flex flex-col gap-2 mb-8">
                                      <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Mô tả đặc quyền / Vị trí</label>
                                      <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
                                  </div>

                                  <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight mb-4 pt-6 border-t border-slate-200 dark:border-white/10 flex items-center gap-2"><ShieldCheck size={20} className="text-amber-500"/> Cài đặt Bảo mật Mạng lưới</h3>
                                  <div className="space-y-4 mb-8">
                                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><Lock size={18}/></div>
                                              <div><p className="text-sm font-bold text-slate-900 dark:text-white">Xác thực 2 lớp (2FA)</p><p className="text-[10px] text-slate-500 font-medium mt-0.5">Bảo vệ quyền can thiệp cấp cao.</p></div>
                                          </div>
                                          <div className="w-12 h-6 bg-amber-500 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                                      </div>
                                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><Activity size={18}/></div>
                                              <div><p className="text-sm font-bold text-slate-900 dark:text-white">Cảnh báo đăng nhập lạ</p><p className="text-[10px] text-slate-500 font-medium mt-0.5">Gửi email khi IP thay đổi đột ngột.</p></div>
                                          </div>
                                          <div className="w-12 h-6 bg-amber-500 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                                      </div>
                                  </div>

                                  <button onClick={handleUpdateProfile} disabled={isUpdating} className="w-full py-5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-black rounded-2xl shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase flex justify-center items-center gap-2">
                                      {isUpdating ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <Save size={18}/>} LƯU CẤU HÌNH HỆ THỐNG
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* CỘT PHẢI: HIỆU SUẤT */}
                  <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8 lg:pt-[52px]">
                      <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[3rem] p-8 border border-slate-200 dark:border-white/10 relative overflow-hidden shadow-lg flex flex-col">
                          <div className="flex items-center gap-2 text-amber-500 font-black text-xs mb-4 uppercase tracking-widest">
                              <Crown size={16} strokeWidth={3} /> QUYỀN LỰC TỐI CAO
                          </div>
                          <div className="flex items-baseline gap-1 mb-2">
                              <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">Level 5</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-medium leading-relaxed mt-2 border-t border-slate-200 dark:border-white/10 pt-4">
                              Tài khoản có đặc quyền cao nhất. Vui lòng cẩn trọng với các thao tác xóa và sửa đổi hệ thống.
                          </p>
                      </div>
                  </div>      
              </div>
          </div>
      </main>

      {/* ================= MODAL: TẢI VIDEO LÊN STUDIO ================= */}
      {isAddVideoModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddVideoModalOpen(false)}></div>
            <div className="relative w-full max-w-[800px] bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Video size={20} className="text-amber-500"/> Đăng Video Lên Studio</h3>
                    <button onClick={() => setIsAddVideoModalOpen(false)} className="p-2 bg-slate-200/50 dark:bg-white/5 rounded-full text-slate-500"><X size={16}/></button>
                </div>
                
                <div className="p-6 md:p-8 overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-5 flex justify-center items-center">
                            <div className="w-[240px] aspect-[9/16] rounded-[2.5rem] border-[6px] border-slate-900 bg-black shadow-2xl relative overflow-hidden flex flex-col group">
                                {studioPreview ? (
                                    <>
                                        <video src={studioPreview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                        <button onClick={() => {setStudioFile(null); setStudioPreview(null)}} className="absolute top-4 left-4 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white"><X size={16}/></button>
                                    </>
                                ) : (
                                    <div onClick={() => studioInputRef.current?.click()} className="absolute inset-4 rounded-[1.5rem] border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center cursor-pointer p-6 text-center hover:bg-slate-800 transition-colors">
                                        <Video size={40} className="text-amber-500 mb-4" />
                                        <p className="text-white font-bold text-sm">Tải Video Ngắn<br/><span className="text-xs text-slate-400 font-normal mt-1 block">Tỉ lệ 9:16</span></p>
                                    </div>
                                )}
                                <input type="file" accept="video/*" ref={studioInputRef} className="hidden" onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if(f) { setStudioFile(f); setStudioPreview(URL.createObjectURL(f)); }
                                }} />
                            </div>
                        </div>

                        <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl mb-2 flex items-center gap-2">
                                <CheckCircle size={16} className="text-emerald-500 shrink-0"/>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Đặc quyền Admin: Video sẽ được hệ thống TỰ ĐỘNG DUYỆT ngay khi đăng.</span>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tiêu đề (Bắt buộc)</label>
                                <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" placeholder="Viết một tiêu đề thu hút..." value={studioData.title} onChange={e => setStudioData({...studioData, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Mô tả nội dung</label>
                                <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none" placeholder="Chia sẻ thêm thông tin..." value={studioData.content} onChange={e => setStudioData({...studioData, content: e.target.value})} />
                            </div>
                            
                            <button onClick={handleAddVideo} disabled={isStudioUploading || !studioFile} className="w-full py-4 mt-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-black rounded-xl shadow-lg active:scale-95 transition-all text-xs tracking-widest uppercase flex justify-center items-center gap-2 disabled:opacity-50">
                                {isStudioUploading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>} 
                                ĐĂNG VIDEO & PHÁT SÓNG
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ================= MODAL: TẠO BÀI ĐĂNG CỘNG ĐỒNG ================= */}
      {isAddPostModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddPostModalOpen(false)}></div>
            <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Edit3 size={20} className="text-amber-500"/> Tạo Thông Báo Hệ Thống</h3>
                    <button onClick={() => setIsAddPostModalOpen(false)} className="p-2 bg-slate-200/50 dark:bg-white/5 rounded-full text-slate-500"><X size={16}/></button>
                </div>
                
                <form onSubmit={handleAddPost} className="p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                        <img src={profileData?.avatar_url} className="w-10 h-10 rounded-full" />
                        <div><div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1">{profileData?.full_name} <Crown size={12} className="text-amber-500"/></div><div className="text-[10px] text-slate-500 font-black uppercase">Thông báo trực tiếp</div></div>
                    </div>

                    <textarea rows={5} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none" placeholder="Viết thông báo cho cộng đồng..." value={postData.content} onChange={e => setPostData({...postData, content: e.target.value})} required />

                    <div className="relative h-40 w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors overflow-hidden" onClick={() => postInputRef.current?.click()}>
                        {postPreview ? (
                            <img src={postPreview} className="w-full h-full object-cover"/>
                        ) : (
                            <><UploadCloud className="text-slate-400 mb-2"/><p className="text-xs font-bold text-slate-500">Tải lên ảnh đính kèm (Tùy chọn)</p></>
                        )}
                        <input type="file" accept="image/*" ref={postInputRef} className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if(f) { setPostFile(f); setPostPreview(URL.createObjectURL(f)); }
                        }} />
                    </div>

                    <button type="submit" disabled={isPostUploading} className="w-full py-4 mt-4 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-black rounded-xl shadow-lg active:scale-95 transition-all text-xs tracking-widest uppercase flex justify-center items-center gap-2">
                        {isPostUploading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>} PHÁT SÓNG THÔNG BÁO
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}