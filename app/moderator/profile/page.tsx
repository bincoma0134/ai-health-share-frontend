"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Home, User as UserIcon, ShieldCheck, CheckCircle, Clock, 
  Save, Sun, Moon, Bell, Edit3, ShieldAlert, Sparkles, Image as ImageIcon, 
  Eye, LogOut, LayoutDashboard, Link2, Plus, Trash2, Shield, Share2
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NotificationModal from "@/components/NotificationModal";
import { useUI } from "@/context/UIContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Thiếu biến môi trường Supabase!");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface LocalUIContext {
  isNotifOpen: boolean;
  setIsNotifOpen: (val: boolean) => void;
  theme: string;
  toggleTheme: () => void;
}

type SocialPlatform = 'facebook' | 'tiktok' | 'instagram' | 'youtube' | 'website';
interface SocialLink { platform: SocialPlatform; url: string; }

export default function ModeratorProfilePage() {
  const router = useRouter();
  const { isNotifOpen, setIsNotifOpen, theme, toggleTheme } = useUI() as unknown as LocalUIContext;
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'info'>('overview');

  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState({ pendingTotal: 0, approvedByMe: 0, totalProcessed: 0 });

  const [editForm, setEditForm] = useState({ username: "", full_name: "", bio: "", address: "" });
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push("/"); return; }
    setUser(session.user);
    
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      
      if (result.status === "success" && result.data.profile) {
          const p = result.data.profile;
          const s = result.data.stats;
          
          if (p.role !== "MODERATOR" && p.role !== "SUPER_ADMIN") {
              toast.error("Truy cập trái phép! Bạn không phải Kiểm duyệt viên.");
              router.push("/");
              return;
          }
          
          setProfileData(p);
          setStats({
              pendingTotal: s?.pending_total || 0,
              approvedByMe: s?.approved_count || 0,
              totalProcessed: s?.total_processed || 0
          });

          setEditForm({
              username: p.username || "",
              full_name: p.full_name || "",
              bio: p.bio || "",
              address: p.address || ""
          });

          try {
              const parsed = p.social_links ? JSON.parse(p.social_links) : [];
              setSocials(Array.isArray(parsed) ? parsed : []);
          } catch { setSocials([]); }
      }

    } catch (error) { toast.error("Không thể tải thông tin hồ sơ."); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const handleShareProfile = () => {
      const url = `${window.location.origin}/${profileData?.username}`;
      navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết Hồ sơ Kiểm duyệt!");
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const tid = toast.loading("Đang lưu hồ sơ...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { ...editForm, social_links: JSON.stringify(socials) };
      const res = await fetch(`${API_URL}/user/profile`, { 
          method: "PATCH", 
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, 
          body: JSON.stringify(payload) 
      });
      const result = await res.json();
      if (!res.ok || result.status !== "success") throw new Error("Lỗi lưu hồ sơ");
      
      setProfileData({ ...profileData, ...result.data });
      toast.success("Hồ sơ kiểm duyệt viên đã được cập nhật!", { id: tid });
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsUpdating(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      if (!file.type.startsWith("image/")) return toast.error("Chỉ chấp nhận định dạng hình ảnh!");

      setIsUploadingImage(true);
      const tid = toast.loading(`Đang tải ảnh ${type === 'avatar' ? 'đại diện' : 'bìa'}...`);
      try {
          const fileName = `${user.id}-${type}-${Date.now()}.${file.name.split('.').pop()}`;
          const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
          if (upErr) throw new Error("Lỗi tải ảnh");
          
          const publicUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
          const { data: { session } } = await supabase.auth.getSession();
          
          const payload = type === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl };
          const res = await fetch(`${API_URL}/user/profile`, { 
              method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, 
              body: JSON.stringify(payload) 
          });
          
          if (!res.ok) throw new Error("Lỗi lưu ảnh");
          setProfileData({ ...profileData, ...payload });
          toast.success("Cập nhật ảnh thành công!", { id: tid });
      } catch (e: any) { toast.error(e.message, { id: tid }); } 
      finally { setIsUploadingImage(false); }
  };

  const addSocial = () => setSocials([...socials, { platform: 'facebook', url: '' }]);
  const removeSocial = (idx: number) => setSocials(socials.filter((_, i) => i !== idx));
  const updateSocial = (idx: number, field: keyof SocialLink, value: string) => { const ns = [...socials]; ns[idx] = { ...ns[idx], [field]: value }; setSocials(ns); };

  if (isLoading) return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
          <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-violet-400 rounded-full animate-ping opacity-70"></div>
              <div className="absolute inset-2 bg-violet-500 rounded-full flex items-center justify-center shadow-lg"><Shield className="text-white w-6 h-6 animate-pulse" /></div>
          </div>
          <p className="text-violet-500 text-sm font-black tracking-widest uppercase animate-pulse">Đang nạp không gian làm việc...</p>
      </div>
  );

  return (
    <div className="flex-1 relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 overflow-hidden font-be-vietnam">
      
      <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={e => handleImageUpload(e, 'avatar')} />
      <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={e => handleImageUpload(e, 'cover')} />

      {/* TOP BAR */}
      <div className="absolute top-0 w-full z-40 p-6 flex justify-end items-center bg-gradient-to-b from-slate-50 dark:from-zinc-950 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={toggleTheme} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-lg group transition-all">
              {theme === "dark" ? <Sun size={20} className="group-hover:text-amber-300" /> : <Moon size={20} className="group-hover:text-violet-500" />}
            </button>
            <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-violet-500 shadow-lg transition-all"><Bell size={20} /></button>
          </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {isNotifOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in"><NotificationModal /></div>}

          {/* CHUẨN HÓA COVER IMAGE */}
          <div className="relative w-full h-48 md:h-64 bg-slate-200 dark:bg-zinc-900 group cursor-pointer overflow-hidden border-b border-slate-200 dark:border-white/5" onClick={() => coverInputRef.current?.click()}>
              {profileData?.cover_url ? (
                  <img src={profileData.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="cover" />
              ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 flex items-center justify-center">
                      <div className="flex flex-col items-center opacity-50"><ImageIcon size={32} className="mb-2 text-violet-600 dark:text-violet-400"/> <span className="text-sm font-bold text-violet-700 dark:text-violet-300">Tải lên ảnh bìa</span></div>
                  </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 md:px-12 pb-32 relative z-10">
            
            {/* HEADER INFO CHUẨN MASTER LAYOUT */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 mb-10">
                {/* Avatar lồi lên */}
                <div className="relative group cursor-pointer shrink-0 -mt-16 md:-mt-20" onClick={() => avatarInputRef.current?.click()}>
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-violet-500 to-fuchsia-400 rounded-full blur-md opacity-40"></div>
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-zinc-950 shadow-2xl bg-white p-1.5">
                    <img src={profileData?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.full_name}&background=8b5cf6&color=fff`} className="w-full h-full object-cover group-hover:scale-105 transition-transform rounded-full" alt="avatar" />
                  </div>
                  <div className="absolute inset-1.5 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-[10px] font-black rounded-full shadow-lg border border-white/20 whitespace-nowrap uppercase flex items-center gap-1 z-20 tracking-widest">
                    <Shield size={10} fill="currentColor"/> MODERATOR
                  </div>
                </div>

                <div className="flex-1 w-full pt-4 md:pt-6">
                  {/* Row 1: Tên và Nút chức năng ngang hàng */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6 text-center md:text-left">
                      <div className="flex flex-col gap-1">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-md flex items-center justify-center md:justify-start gap-2">
                            {profileData?.full_name || "Kiểm duyệt viên"} <ShieldCheck size={24} className="text-violet-500" />
                        </h1>
                        <h2 className="text-base font-medium text-slate-500 dark:text-zinc-400 tracking-tight">@{profileData?.username || "moderator"}</h2>
                      </div>

                      <div className="flex items-center justify-center md:justify-end gap-3 mt-2 md:mt-0">
                        <button onClick={() => router.push(`/${profileData?.username}`)} className="px-6 py-3.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-black rounded-2xl hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center gap-2 active:scale-95 text-sm uppercase tracking-widest">
                            <Eye size={18} strokeWidth={3} /> Xem công khai
                        </button>
                        <button onClick={handleShareProfile} className="p-3.5 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-500 transition-all shadow-sm active:scale-90">
                            <Share2 size={18} />
                        </button>
                        <button onClick={handleLogout} className="p-3.5 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shadow-sm active:scale-90">
                            <LogOut size={18} />
                        </button>
                      </div>
                  </div>

                  {/* Row 2: THỐNG KÊ */}
                  <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
                      <div className="flex items-center gap-2 group cursor-pointer">
                          <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{profileData?.following_count || "0"}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Đang quan<br/>tâm</span>
                      </div>
                      <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
                      <div className="flex items-center gap-2 group cursor-pointer">
                          <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{profileData?.followers_count || "0"}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Người quan<br/>tâm</span>
                      </div>
                      <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
                      <div className="flex items-center gap-2 group cursor-pointer">
                          <span className="text-xl md:text-2xl font-black text-violet-500">{stats.totalProcessed}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Đã kiểm<br/>duyệt</span>
                      </div>
                  </div>

                  {/* Row 3: Bio */}
                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-300 max-w-2xl mx-auto md:mx-0 text-center md:text-left leading-relaxed">
                      {profileData?.bio || "Thành viên Ban quản trị nội dung. Đóng góp duy trì một môi trường nền tảng an toàn, minh bạch."}
                  </p>
                </div>
            </div>

            {/* TAB MENU CHUẨN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative items-start border-t border-slate-200 dark:border-white/10 pt-10">
                <div className="lg:col-span-8">
                    <div className="flex justify-start gap-8 border-b border-slate-200 dark:border-white/10 pb-4 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'overview' ? 'text-violet-500 border-b-2 border-violet-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600'}`}>
                            <LayoutDashboard size={16}/> BẢNG ĐIỀU KHIỂN
                        </button>
                        <button onClick={() => setActiveTab('info')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'info' ? 'text-violet-500 border-b-2 border-violet-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Edit3 size={16}/> HỒ SƠ CÁ NHÂN
                        </button>
                    </div>

                    <div className="mt-10">
                        {/* 1. TAB BẢNG ĐIỀU KHIỂN */}
                        {activeTab === 'overview' && (
                             <div className="animate-fade-in space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-amber-500/20 shadow-lg relative overflow-hidden group">
                                        <div className="absolute -right-6 -top-6 text-amber-500/10 dark:text-amber-500/5 group-hover:scale-110 transition-transform"><Clock size={160} /></div>
                                        <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                            <div className="flex items-center gap-3"><div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl"><Clock size={20} strokeWidth={3} /></div><h3 className="font-bold text-slate-700 dark:text-zinc-300">Hàng đợi chờ duyệt</h3></div>
                                            <div>
                                                <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.pendingTotal}</span>
                                                <span className="text-slate-500 dark:text-zinc-400 font-medium ml-2">Mục chờ xử lý</span>
                                            </div>
                                            <button onClick={() => router.push('/moderator/dashboard')} className="w-max mt-2 text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">Vào khu vực duyệt &rarr;</button>
                                        </div>
                                    </div>

                                    <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-lg relative overflow-hidden group">
                                        <div className="absolute -right-6 -top-6 text-emerald-500/10 dark:text-emerald-500/5 group-hover:scale-110 transition-transform"><CheckCircle size={160} /></div>
                                        <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                            <div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><CheckCircle size={20} strokeWidth={3} /></div><h3 className="font-bold text-slate-700 dark:text-zinc-300">Hiệu suất cá nhân</h3></div>
                                            <div>
                                                <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.approvedByMe}</span>
                                                <span className="text-slate-500 dark:text-zinc-400 font-medium ml-2">Mục đã xử lý</span>
                                            </div>
                                            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-zinc-500 flex items-center gap-1"><Sparkles size={14} className="text-emerald-500"/> Cảm ơn sự cống hiến của bạn!</p>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        )}

                        {/* 2. TAB HỒ SƠ & MẠNG XÃ HỘI */}
                        {activeTab === 'info' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-lg space-y-6 relative">
                                    {isUploadingImage && (
                                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-50 rounded-[2rem] flex items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Username định danh</label>
                                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 shadow-inner" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                                        <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium ml-1">Tên định danh dùng để hiển thị trên URL hồ sơ công khai.</p>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Họ tên / Bí danh kiểm duyệt</label>
                                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 shadow-inner" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                                        <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium ml-1">Tên hiển thị công khai trên các quyết định và hoạt động của bạn.</p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Giới thiệu chuyên môn</label>
                                        <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 shadow-inner" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
                                    </div>
                                    
                                    <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><Link2 size={16}/> Mạng xã hội</label>
                                            <button onClick={addSocial} className="text-violet-500 hover:text-violet-600 font-black text-xs flex items-center gap-1 bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 rounded-lg"><Plus size={14}/> Thêm Link</button>
                                        </div>
                                        <div className="space-y-4">
                                            {socials.map((social, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/5">
                                                    <select value={social.platform} onChange={(e) => updateSocial(idx, 'platform', e.target.value as SocialPlatform)} className="w-full sm:w-1/3 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-zinc-300">
                                                        <option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="website">Website</option>
                                                    </select>
                                                    <div className="w-full sm:flex-1 flex items-center gap-2">
                                                        <input type="url" placeholder="https://..." value={social.url} onChange={(e) => updateSocial(idx, 'url', e.target.value)} className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500" />
                                                        <button onClick={() => removeSocial(idx)} className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl"><Trash2 size={18}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button onClick={handleUpdateProfile} disabled={isUpdating} className="w-full py-5 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase">LƯU THÔNG TIN HỒ SƠ</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI: HIỆU SUẤT KIỂM DUYỆT */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8 lg:pt-[52px]">
                    <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[3rem] p-8 border border-slate-200 dark:border-white/10 relative overflow-hidden shadow-lg flex flex-col">
                        <div className="flex items-center gap-2 text-violet-500 font-black text-xs mb-4 uppercase tracking-widest">
                            <ShieldCheck size={16} strokeWidth={3} /> HIỆU SUẤT KIỂM DUYỆT
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">Tích cực</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-medium leading-relaxed">
                            Cảm ơn bạn đã đóng góp duy trì một môi trường nội dung minh bạch và an toàn cho AI Health Share.
                        </p>
                        <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-5">
                            <ShieldAlert size={120} className="text-violet-500" />
                        </div>
                    </div>
                </div>
            </div>
          </div>
      </main>

      {/* MOBILE BOTTOM DOCK */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
        <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
          <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
          <button className="text-violet-500 transition-colors group"><UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
          <button onClick={() => router.push('/moderator/dashboard')} className="relative text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group">
              <LayoutDashboard size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              {stats.pendingTotal > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950"></span>}
          </button>
        </div>
      </div>
    </div>
  );
}