"use client";

import { useEffect, useState, useRef } from "react";
import { 
  ShieldCheck, Bookmark, LogOut, Play, Clock, CheckCircle2, Edit3, Camera, X, Sun, Moon, 
  Bell, Eye, LayoutGrid, Video, Sparkles, DollarSign, UploadCloud, MapPin, FileText, 
  Link2, Plus, Trash2, Package, Info, Tag, BadgeCheck, Star, ImageIcon
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NotificationModal from "@/components/NotificationModal";
import Loading from "@/app/loading";
import { useUI } from "@/context/UIContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Thiếu biến môi trường Supabase!");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type SocialPlatform = 'facebook' | 'tiktok' | 'instagram' | 'youtube' | 'website';
interface SocialLink { platform: SocialPlatform; url: string; }

export default function PartnerProfilePage() {
  const router = useRouter();
  const { isNotifOpen, setIsNotifOpen, theme, toggleTheme } = useUI();
  
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [myVideos, setMyVideos] = useState<any[]>([]); // THÊM MỚI: State lưu video studio
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'info' | 'studio'>('services');
  
  // --- STATE HỒ SƠ ---
  const [editForm, setEditForm] = useState({ username: "", full_name: "", bio: "", address: "" });
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- MODAL STATE ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  // --- FORM DỊCH VỤ ---
  const [newService, setNewService] = useState({ service_name: "", description: "", price: "", tags: "" });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>('image'); 
  const [isUploading, setIsUploading] = useState(false);

  // --- STUDIO STATE ---
  const [studioData, setStudioData] = useState({ title: "", content: "", price: "" });
  const [studioFile, setStudioFile] = useState<File | null>(null);
  const [studioPreview, setStudioPreview] = useState<string | null>(null);
  const [isStudioUploading, setIsStudioUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const studioInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/"); return; }
    setUser(session.user);

    try {
      const [resP, resS, resV] = await Promise.all([
        fetch(`${API_URL}/user/profile`, { headers: { "Authorization": `Bearer ${session.access_token}` } }),
        fetch(`${API_URL}/partner/my-services`, { headers: { "Authorization": `Bearer ${session.access_token}` } }),
        fetch(`${API_URL}/partner/my-videos`, { headers: { "Authorization": `Bearer ${session.access_token}` } }) // THÊM MỚI
      ]);
      
      const [dataP, dataS, dataV] = await Promise.all([resP.json(), resS.json(), resV.json()]);

      if (dataP.status === "success") {
        setProfileData(dataP.data);
        setEditForm({
          username: dataP.data.profile.username || "",
          full_name: dataP.data.profile.full_name || "",
          bio: dataP.data.profile.bio || "",
          address: dataP.data.profile.address || ""
        });
        try {
          const parsed = dataP.data.profile.social_links ? JSON.parse(dataP.data.profile.social_links) : [];
          setSocials(Array.isArray(parsed) ? parsed : []);
        } catch { setSocials([]); }
      }
      
      if (dataS.status === "success") setMyServices(dataS.data);
      if (dataV.status === "success") setMyVideos(dataV.data); // THÊM MỚI

    } catch (error) { toast.error("Lỗi mạng khi tải dữ liệu"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [router]);

  // ================= API HÀNH ĐỘNG HỒ SƠ =================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const tid = toast.loading("Đang lưu hồ sơ...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { ...editForm, social_links: JSON.stringify(socials) };
      const res = await fetch(`${API_URL}/user/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok || result.status !== "success") throw new Error(result.detail || "Lỗi lưu hồ sơ");
      
      setProfileData((prev: any) => ({ ...prev, profile: { ...prev.profile, ...result.data } }));
      toast.success("Hồ sơ đã được cập nhật!", { id: tid });
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsUpdating(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const tid = toast.loading(`Đang tải lên ảnh...`);
    try {
      const fileName = `${user.id}-avatar-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (upErr) throw new Error("Lỗi tải ảnh lên Storage");
      
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${API_URL}/user/profile`, { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify({ avatar_url: publicUrl }) });
      const result = await res.json();
      if (!res.ok || result.status !== "success") throw new Error("Lỗi lưu ảnh");

      setProfileData((prev: any) => ({ ...prev, profile: { ...prev.profile, avatar_url: publicUrl } }));
      toast.success("Cập nhật ảnh thành công!", { id: tid });
    } catch (e: any) { toast.error(e.message, { id: tid }); }
  };

  const addSocial = () => setSocials([...socials, { platform: 'facebook', url: '' }]);
  const removeSocial = (idx: number) => setSocials(socials.filter((_, i) => i !== idx));
  const updateSocial = (idx: number, field: keyof SocialLink, value: string) => {
      const ns = [...socials]; ns[idx] = { ...ns[idx], [field]: value }; setSocials(ns);
  };

  // ================= API QUẢN LÝ DỊCH VỤ =================
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.service_name || !newService.price) return toast.error("Vui lòng điền đủ Tên và Giá!");
    setIsUploading(true);
    const tid = toast.loading("Đang gửi đi kiểm duyệt..."); // ĐỔI TOAST
    try {
        let mediaUrl = null;
        if (mediaFile) {
            const fileName = `services/${user.id}-${Date.now()}.${mediaFile.name.split('.').pop()}`;
            const { error: upErr } = await supabase.storage.from('media').upload(fileName, mediaFile);
            if (upErr) throw new Error("Lỗi tải tệp Storage");
            mediaUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const payload = {
            ...newService,
            price: parseFloat(newService.price),
            tags: newService.tags.split(',').map(t => t.trim()).filter(Boolean),
            [mediaType === 'video' ? 'video_url' : 'image_url']: mediaUrl
        };

        const res = await fetch(`${API_URL}/services`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok || result.status !== "success") throw new Error(result.detail || "Lỗi tạo dịch vụ");

        toast.success("Đã gửi dịch vụ đi chờ kiểm duyệt!", { id: tid }); // ĐỔI TOAST
        setIsAddModalOpen(false);
        setNewService({ service_name: "", description: "", price: "", tags: "" });
        setMediaFile(null); setMediaType('image');
        fetchData();
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsUploading(false); }
  };

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    const tid = toast.loading("Đang gửi bản sửa đổi...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const payload = {
            service_name: editingService.service_name,
            description: editingService.description,
            price: parseFloat(editingService.price),
            tags: Array.isArray(editingService.tags) ? editingService.tags : editingService.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        };
        const res = await fetch(`${API_URL}/partner/my-services/${editingService.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok || result.status !== "success") throw new Error(result.detail || "Lỗi chỉnh sửa");

        toast.success("Bản sửa đổi đã được gửi đi chờ kiểm duyệt lại!", { id: tid });
        setIsEditModalOpen(false);
        fetchData();
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsUploading(false); }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Bạn muốn gửi yêu cầu xóa dịch vụ này?")) return;
    const tid = toast.loading("Đang gửi yêu cầu xóa...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/partner/my-services/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${session?.access_token}` } });
        const result = await res.json();
        if (!res.ok || result.status !== "success") throw new Error(result.detail || "Lỗi xóa");

        toast.success("Yêu cầu xóa đã được gửi chờ duyệt!", { id: tid });
        fetchData();
    } catch (e: any) { toast.error(e.message, { id: tid }); }
  };

  // ================= API STUDIO =================
  const handleUploadStudio = async () => {
    if (!studioFile || !studioData.title) return toast.error("Cần có Video và Tiêu đề!");
    setIsStudioUploading(true);
    const tid = toast.loading("Đang gửi video đi kiểm duyệt..."); // ĐỔI TOAST
    try {
        const fileName = `studio-${Date.now()}.${studioFile.name.split('.').pop()}`;
        const { error: upErr } = await supabase.storage.from('media').upload(fileName, studioFile);
        if (upErr) throw new Error("Lỗi tải video lên Storage");
        const videoUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;
        
        const { data: { session } } = await supabase.auth.getSession();
        const payload = {
            title: studioData.title, content: studioData.content,
            price: studioData.price ? parseFloat(studioData.price) : null,
            video_url: videoUrl
        };

        const res = await fetch(`${API_URL}/studio/videos`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok || result.status !== "success") throw new Error(result.detail || "Lỗi đăng bài");

        toast.success("Video đã được gửi đi chờ duyệt!", { id: tid }); // ĐỔI TOAST
        setStudioData({ title: "", content: "", price: "" });
        setStudioFile(null); setStudioPreview(null);
        fetchData(); // Tải lại danh sách video
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsStudioUploading(false); }
  };

  const renderTags = (tagsRaw: any) => {
    let tagsArray: string[] = [];
    try {
        if (typeof tagsRaw === 'string') tagsArray = JSON.parse(tagsRaw);
        else if (Array.isArray(tagsRaw)) tagsArray = tagsRaw;
    } catch { tagsArray = []; }
    return tagsArray.map((t, i) => (
        <span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">#{t}</span>
    ));
  };

  // HELPER: RENDER TRẠNG THÁI BADGE
  const StatusBadge = ({ status }: { status: string }) => {
      const config: any = {
          'APPROVED': { label: 'Đã duyệt', class: 'bg-emerald-500 text-white' },
          'PENDING': { label: 'Chờ duyệt', class: 'bg-amber-500 text-white' },
          'REJECTED': { label: 'Bị từ chối', class: 'bg-rose-500 text-white' },
          'PENDING_DELETE': { label: 'Chờ xóa', class: 'bg-rose-500 text-white' }
      };
      const c = config[status] || config['PENDING'];
      return <span className={`px-2 py-1 text-[9px] font-black rounded-md uppercase border backdrop-blur-md ${c.class}`}>{c.label}</span>;
  };

  if (isLoading) return <Loading />;

  return (
    <div className="flex-1 relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 overflow-hidden font-be-vietnam">
      
      <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarUpload} />

      {/* TOP BAR */}
      <div className="absolute top-0 w-full z-40 p-6 flex justify-end items-center bg-gradient-to-b from-slate-50 dark:from-zinc-950 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={toggleTheme} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-lg group transition-all">
              {theme === "dark" ? <Sun size={20} className="group-hover:text-amber-300" /> : <Moon size={20} className="group-hover:text-blue-500" />}
            </button>
            <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#80BF84] shadow-lg transition-all"><Bell size={20} /></button>
          </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {isNotifOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in"><NotificationModal /></div>}

          <div className="max-w-6xl mx-auto p-6 md:p-12 pt-28 pb-32 animate-slide-up">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row items-start gap-10 mb-10">
                <div className="relative group shrink-0 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full blur-md opacity-20"></div>
                  <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl backdrop-blur-md bg-white">
                    <img src={profileData?.profile?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.profile?.full_name}&background=80BF84&color=fff`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="avatar" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black rounded-full shadow-lg border border-white/20 whitespace-nowrap uppercase">
                    <ShieldCheck size={10} className="inline mr-1"/> BUSINESS
                  </div>
                </div>

                <div className="flex-1 pt-2">
                  <div className="flex flex-col gap-1 mb-6 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-md flex items-center justify-center md:justify-start gap-2">
                        {profileData?.profile?.full_name || "Doanh nghiệp"} <BadgeCheck size={24} className="text-blue-500" />
                    </h1>
                    <h2 className="text-base md:text-lg font-medium text-slate-500 dark:text-zinc-400 tracking-tight">@{profileData?.profile?.username}</h2>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <button onClick={() => router.push(`/${profileData?.profile?.username}`)} className="px-8 py-3.5 bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-black rounded-2xl hover:shadow-xl transition-all flex items-center gap-2 active:scale-95 shadow-lg">
                        <Eye size={20} strokeWidth={3} /> <span>Xem công khai</span>
                    </button>
                    <button onClick={handleLogout} className="p-3.5 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-rose-500 rounded-xl hover:bg-rose-50 transition-all shadow-md active:scale-90"><LogOut size={20} /></button>
                  </div>
                </div>
            </div>

            {/* TAB MENU */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative items-start border-t border-slate-200 dark:border-white/10 pt-10">
                <div className="lg:col-span-8">
                    <div className="flex justify-start gap-8 border-b border-slate-200 dark:border-white/10 pb-4 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('services')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'services' ? 'text-blue-500 border-b-2 border-blue-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Package size={16}/> QUẢN LÝ DỊCH VỤ
                        </button>
                        <button onClick={() => setActiveTab('studio')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'studio' ? 'text-blue-500 border-b-2 border-blue-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Video size={16}/> STUDIO TẢI VIDEO
                        </button>
                        <button onClick={() => setActiveTab('info')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'info' ? 'text-blue-500 border-b-2 border-blue-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Edit3 size={16}/> HỒ SƠ & MẠNG XÃ HỘI
                        </button>
                    </div>

                    <div className="mt-10">
                        {/* QUẢN LÝ DỊCH VỤ */}
                        {activeTab === 'services' && (
                             <div className="animate-fade-in space-y-6">
                                 <div className="flex justify-between items-center mb-6">
                                     <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Dịch vụ hiện tại ({myServices.length})</h3>
                                     <button onClick={() => setIsAddModalOpen(true)} className="px-5 py-2.5 bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2">
                                         <Plus size={16}/> Thêm dịch vụ
                                     </button>
                                 </div>

                                 {myServices.length === 0 ? (
                                     <div className="text-center py-20 bg-white/40 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                                         <Package size={48} className="mx-auto text-slate-300 dark:text-zinc-600 mb-4" />
                                         <p className="text-slate-500 font-bold">Bạn chưa có dịch vụ nào.</p>
                                     </div>
                                 ) : (
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         {myServices.map(svc => (
                                             <div key={svc.id} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col relative">
                                                <div className="relative h-44 overflow-hidden shrink-0 bg-slate-100 dark:bg-black">
                                                    {svc.image_url ? (
                                                        <img src={svc.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="service" />
                                                    ) : svc.video_url ? (
                                                        <video src={svc.video_url} className="w-full h-full object-cover" muted playsInline />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400"><Package size={32}/></div>
                                                    )}
                                                    
                                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <button onClick={() => { 
                                                            let parsedTags = [];
                                                            try { parsedTags = typeof svc.tags === 'string' ? JSON.parse(svc.tags) : svc.tags; } catch {}
                                                            setEditingService({...svc, tags: parsedTags || []}); 
                                                            setIsEditModalOpen(true); 
                                                        }} className="p-2 bg-white/90 text-blue-600 rounded-lg shadow-lg hover:bg-blue-50 transition-colors"><Edit3 size={16}/></button>
                                                        <button onClick={() => handleDeleteService(svc.id)} className="p-2 bg-white/90 text-rose-600 rounded-lg shadow-lg hover:bg-rose-50 transition-colors"><Trash2 size={16}/></button>
                                                    </div>

                                                    <div className="absolute bottom-3 left-3 z-10">
                                                        <StatusBadge status={svc.status} />
                                                    </div>
                                                </div>
                                                <div className="p-5 flex-1 flex flex-col">
                                                    <h4 className="font-black text-slate-900 dark:text-white line-clamp-2 mb-2">{svc.service_name}</h4>
                                                    <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">{svc.description}</p>
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {renderTags(svc.tags)}
                                                    </div>
                                                    <div className="text-blue-600 dark:text-blue-400 font-black text-lg border-t border-slate-100 dark:border-white/5 pt-3">
                                                        {parseFloat(svc.price).toLocaleString('vi-VN')}đ
                                                    </div>
                                                </div>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                        )}

                        {/* STUDIO TẢI VIDEO */}
                        {activeTab === 'studio' && (
                             <div className="animate-fade-in space-y-12">
                                 {/* FORM ĐĂNG BÀI */}
                                 <div className="relative p-6 md:p-10 rounded-[3rem] bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-xl overflow-hidden">
                                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-500/10 via-transparent to-transparent pointer-events-none"></div>
                                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                                         <div className="lg:col-span-5 flex justify-center items-center">
                                             <div className="w-[240px] aspect-[9/16] rounded-[2.5rem] border-[6px] border-slate-900 bg-black shadow-2xl relative overflow-hidden flex flex-col group">
                                                 {studioPreview ? (
                                                     <>
                                                         <video src={studioPreview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                                         <button onClick={() => {setStudioFile(null); setStudioPreview(null)}} className="absolute top-4 left-4 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white"><X size={16}/></button>
                                                     </>
                                                 ) : (
                                                     <div onClick={() => studioInputRef.current?.click()} className="absolute inset-4 rounded-[1.5rem] border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center cursor-pointer p-6 text-center hover:bg-slate-800 transition-colors">
                                                         <Video size={40} className="text-blue-500 mb-4" />
                                                         <p className="text-white font-bold text-sm">Tải Video Ngắn<br/><span className="text-xs text-slate-400 font-normal mt-1 block">Tỉ lệ 9:16</span></p>
                                                     </div>
                                                 )}
                                                 <input type="file" accept="video/*" ref={studioInputRef} className="hidden" onChange={(e) => {
                                                     const f = e.target.files?.[0];
                                                     if(f) { setStudioFile(f); setStudioPreview(URL.createObjectURL(f)); }
                                                 }} />
                                             </div>
                                         </div>

                                         <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
                                             <div className="mb-4">
                                                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                                    <Sparkles className="text-blue-500" size={28}/> Xuất bản Studio
                                                </h3>
                                                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">Video sẽ được gửi đến kiểm duyệt viên trước khi lên Bảng tin.</p>
                                             </div>
                                             <div className="space-y-4">
                                                <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" placeholder="Tên video..." value={studioData.title} onChange={e => setStudioData({...studioData, title: e.target.value})} />
                                                <textarea rows={2} className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none" placeholder="Mô tả..." value={studioData.content} onChange={e => setStudioData({...studioData, content: e.target.value})} />
                                                <div className="relative">
                                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                                    <input type="number" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-black text-blue-600 focus:outline-none focus:border-blue-500" placeholder="Giá tham khảo..." value={studioData.price} onChange={e => setStudioData({...studioData, price: e.target.value})} />
                                                </div>
                                                <button onClick={handleUploadStudio} disabled={isStudioUploading || !studioFile} className="w-full py-5 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase flex justify-center items-center gap-2">
                                                    {isStudioUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>} 
                                                    GỬI ĐI CHỜ KIỂM DUYỆT
                                                </button>
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 {/* DANH SÁCH VIDEO HIỆN CÓ */}
                                 <div className="space-y-6">
                                     <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Video của tôi ({myVideos.length})</h3>
                                     {myVideos.length === 0 ? (
                                         <div className="text-center py-20 bg-white/40 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                                             <Video size={48} className="mx-auto text-slate-300 dark:text-zinc-600 mb-4" />
                                             <p className="text-slate-500 font-bold">Chưa có video nào được tải lên.</p>
                                         </div>
                                     ) : (
                                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                             {myVideos.map(vid => (
                                                 <div key={vid.id} className="aspect-[9/16] rounded-2xl overflow-hidden bg-black relative group shadow-lg border border-white/10">
                                                     <video src={vid.video_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted playsInline />
                                                     <div className="absolute top-3 left-3 z-10"><StatusBadge status={vid.status} /></div>
                                                     <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                         <p className="text-white text-[11px] font-black line-clamp-1">{vid.title}</p>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             </div>
                        )}

                        {/* HỒ SƠ */}
                        {activeTab === 'info' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-lg space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Username</label>
                                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Tên hiển thị</label>
                                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Địa chỉ</label>
                                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Tiểu sử</label>
                                        <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-inner" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
                                    </div>
                                    <button onClick={handleUpdateProfile} disabled={isUpdating} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase">LƯU HỒ SƠ</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI: UY TÍN */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8 lg:pt-[52px]">
                    <div className="bg-[#f2f8f3] dark:bg-[#80BF84]/10 rounded-[2rem] p-8 border border-[#80BF84]/20 relative overflow-hidden shadow-sm flex flex-col items-center">
                        <div className="absolute -right-6 -top-6 opacity-[0.03] dark:opacity-5"><ShieldCheck size={180} className="text-[#80BF84]" /></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="flex items-center gap-2 text-[#649e67] dark:text-[#80BF84] font-black text-xs mb-4 uppercase tracking-widest"><ShieldCheck size={16} strokeWidth={3} /> ĐIỂM UY TÍN</div>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-[5rem] leading-none font-black text-slate-800 dark:text-white tracking-tighter">{profileData?.profile?.reputation_points || 92}</span>
                                <span className="text-3xl font-bold text-slate-400">/100</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
      </main>

      {/* MODAL THÊM DỊCH VỤ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
            <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Package size={20} className="text-blue-500"/> Thêm Dịch Vụ</h3>
                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-200/50 dark:bg-white/5 rounded-full text-slate-500"><X size={16}/></button>
                </div>
                <form onSubmit={handleAddService} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <button type="button" onClick={() => {setMediaType('image'); setMediaFile(null);}} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${mediaType === 'image' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}>
                            <ImageIcon size={24}/> <span className="text-[10px] font-black uppercase">Ảnh minh họa</span>
                        </button>
                        <button type="button" onClick={() => {setMediaType('video'); setMediaFile(null);}} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${mediaType === 'video' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}>
                            <Video size={24}/> <span className="text-[10px] font-black uppercase">Video giới thiệu</span>
                        </button>
                    </div>
                    <div className="relative h-40 w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden" onClick={() => document.getElementById('media-up')?.click()}>
                        {mediaFile ? (
                            mediaType === 'image' ? <img src={URL.createObjectURL(mediaFile)} className="w-full h-full object-cover"/> : <video src={URL.createObjectURL(mediaFile)} className="w-full h-full object-cover" muted />
                        ) : (
                            <>
                                <UploadCloud className="text-slate-400 mb-2"/>
                                <p className="text-xs font-bold text-slate-500">Tải {mediaType === 'image' ? 'Ảnh' : 'Video'}</p>
                            </>
                        )}
                        <input id="media-up" type="file" accept={mediaType === 'image' ? "image/*" : "video/*"} className="hidden" onChange={(e) => e.target.files?.[0] && setMediaFile(e.target.files[0])} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tên dịch vụ</label>
                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={newService.service_name} onChange={e => setNewService({...newService, service_name: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Giá (VNĐ)</label>
                            <input type="number" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-black text-blue-600 focus:outline-none focus:border-blue-500" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tags</label>
                            <input type="text" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={newService.tags} onChange={e => setNewService({...newService, tags: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Mô tả</label>
                        <textarea rows={2} className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isUploading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl active:scale-95 transition-all text-xs flex justify-center items-center gap-2">
                        {isUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>} 
                        GỬI ĐI CHỜ KIỂM DUYỆT
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL SỬA DỊCH VỤ */}
      {isEditModalOpen && editingService && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
            <div className="relative w-full max-w-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Edit3 size={20} className="text-blue-500"/> Sửa Dịch Vụ</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-200/50 dark:bg-white/5 rounded-full text-slate-500"><X size={16}/></button>
                </div>
                <form onSubmit={handleEditService} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tên dịch vụ</label>
                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingService.service_name} onChange={e => setEditingService({...editingService, service_name: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Giá (VNĐ)</label>
                            <input type="number" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-black text-blue-600 focus:outline-none focus:border-blue-500" value={editingService.price} onChange={e => setEditingService({...editingService, price: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nhãn dán</label>
                            <input type="text" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" 
                              value={Array.isArray(editingService.tags) ? editingService.tags.join(', ') : ''} 
                              onChange={e => setEditingService({...editingService, tags: e.target.value.split(',').map((t: string) => t.trim()).filter((t: string) => t)})} 
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={isUploading} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl active:scale-95 transition-all text-xs flex justify-center items-center gap-2">
                        {isUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                        GỬI BẢN SỬA CHỜ DUYỆT LẠI
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}