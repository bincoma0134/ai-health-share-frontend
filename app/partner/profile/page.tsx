"use client";

import { useEffect, useState, useRef } from "react";
import { 
  ShieldCheck, Bookmark, LogOut, Play, Clock, CheckCircle2, Edit3, Camera, X, Sun, Moon, 
  Bell, Eye, LayoutGrid, Video, Sparkles, DollarSign, UploadCloud, MapPin, FileText, 
  Link2, Plus, Trash2, Package, Info, Tag, BadgeCheck, Star, ImageIcon, Shield, Building2, Share2, MessageCircle, Heart
} from "lucide-react";
 
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NotificationModal from "@/components/NotificationModal";
import { useUI } from "@/context/UIContext";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import CommentModal from "@/components/CommentModal";

const MiniMapPicker = dynamic(() => import("@/components/MiniMapPicker"), { ssr: false });


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type SocialPlatform = 'facebook' | 'tiktok' | 'instagram' | 'youtube' | 'website';
interface SocialLink { platform: SocialPlatform; url: string; }

export default function PartnerProfilePage() {
  const router = useRouter();
  const { isNotifOpen, setIsNotifOpen, theme, toggleTheme } = useUI() as any;
  
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'info' | 'studio' | 'reviews'>('services');
  
  const [myServices, setMyServices] = useState<any[]>([]);
  const [myVideos, setMyVideos] = useState<any[]>([]);

  const [editForm, setEditForm] = useState({ username: "", full_name: "", bio: "", physical_address: "", latitude: 21.028511, longitude: 105.804817 });
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [isEditVideoModalOpen, setIsEditVideoModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);

  const [newService, setNewService] = useState({ service_name: "", description: "", price: "", tags: "" });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>('image'); 
  const [isUploading, setIsUploading] = useState(false);

  const [studioData, setStudioData] = useState({ title: "", content: "", price: "" });
  const [studioFile, setStudioFile] = useState<File | null>(null);
  const [studioPreview, setStudioPreview] = useState<string | null>(null);
  const [isStudioUploading, setIsStudioUploading] = useState(false);

  // --- EXPANDED VIEW & INTERACTION STATE ---
  const [expandedService, setExpandedService] = useState<any>(null);
  const [expandedVideo, setExpandedVideo] = useState<any>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activeCommentVideoId, setActiveCommentVideoId] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const studioInputRef = useRef<HTMLInputElement>(null);

  // --- LOGIC TƯƠNG TÁC THỰC TẾ TRONG STUDIO ---
  const handleInteraction = async (videoId: string, action: 'like' | 'save' | 'share') => {
      if (action === 'share') {
          navigator.clipboard.writeText(`${window.location.origin}/?video=${videoId}`);
          toast.success("Đã sao chép liên kết!");
          return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      setMyVideos(prev => prev.map(v => {
          if (v.id === videoId) {
              if (action === 'like') return { ...v, is_liked: !v.is_liked, likes_count: (v.likes_count || 0) + (v.is_liked ? -1 : 1) };
              if (action === 'save') return { ...v, is_saved: !v.is_saved, saves_count: (v.saves_count || 0) + (v.is_saved ? -1 : 1) };
          }
          return v;
      }));
      
      // Đồng bộ vào View mở rộng nếu đang xem
      if (expandedVideo && expandedVideo.id === videoId) {
          setExpandedVideo((prev: any) => {
              if (action === 'like') return { ...prev, is_liked: !prev.is_liked, likes_count: (prev.likes_count || 0) + (prev.is_liked ? -1 : 1) };
              if (action === 'save') return { ...prev, is_saved: !prev.is_saved, saves_count: (prev.saves_count || 0) + (prev.is_saved ? -1 : 1) };
              return prev;
          });
      }

      try {
          await fetch(`${API_URL}/tiktok/feeds/${videoId}/${action}`, {
              method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` }
          });
      } catch (error) { fetchData(); } // Reset nếu API lỗi
  };
  
  const handleOpenComments = (videoId: string) => {
      setActiveCommentVideoId(videoId);
      setIsCommentModalOpen(true);
  };
  
  const handleCommentSuccess = () => {
      setMyVideos(prev => prev.map(v => v.id === activeCommentVideoId ? { ...v, comments_count: (v.comments_count || 0) + 1 } : v));
      if (expandedVideo && expandedVideo.id === activeCommentVideoId) setExpandedVideo((prev: any) => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
  };

  const handleCommentDeleted = () => {
      setMyVideos(prev => prev.map(v => v.id === activeCommentVideoId ? { ...v, comments_count: Math.max((v.comments_count || 0) - 1, 0) } : v));
      if (expandedVideo && expandedVideo.id === activeCommentVideoId) setExpandedVideo((prev: any) => ({ ...prev, comments_count: Math.max((prev.comments_count || 0) - 1, 0) }));
  };

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/"); return; }
    setUser(session.user);

    try {
      const [resP, resS, resV] = await Promise.all([
        fetch(`${API_URL}/user/profile`, { headers: { "Authorization": `Bearer ${session.access_token}` } }),
        fetch(`${API_URL}/partner/my-services`, { headers: { "Authorization": `Bearer ${session.access_token}` } }),
        fetch(`${API_URL}/partner/my-tiktok-feeds`, { headers: { "Authorization": `Bearer ${session.access_token}` } })
      ]);
      
      const [dataP, dataS, dataV] = await Promise.all([resP.json(), resS.json(), resV.json()]);

      if (dataP.status === "success") {
        setProfileData(dataP.data);
        setEditForm({
          username: dataP.data.profile.username || "",
          full_name: dataP.data.profile.full_name || "",
          bio: dataP.data.profile.bio || "",
          physical_address: dataP.data.profile.physical_address || "",
          latitude: dataP.data.profile.latitude || 21.028511,
          longitude: dataP.data.profile.longitude || 105.804817
        });
        try {
          const parsed = dataP.data.profile.social_links ? JSON.parse(dataP.data.profile.social_links) : [];
          setSocials(Array.isArray(parsed) ? parsed : []);
        } catch { setSocials([]); }
      }
      
      if (dataS.status === "success") setMyServices(dataS.data);
      if (dataV.status === "success") setMyVideos(dataV.data);

    } catch (error) { toast.error("Lỗi mạng khi tải dữ liệu"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const handleGeocode = async () => {
    if (!editForm.physical_address) return toast.error("Vui lòng nhập địa chỉ để tìm kiếm!");
    setIsGeocoding(true);
    const tid = toast.loading("Đang tìm kiếm tọa độ...");
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editForm.physical_address)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
            setEditForm(prev => ({ ...prev, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
            toast.success("Đã tìm thấy vị trí!", { id: tid });
        } else {
            toast.error("Không tìm thấy, vui lòng kéo ghim thủ công.", { id: tid });
        }
    } catch { toast.error("Lỗi kết nối bản đồ", { id: tid }); }
    finally { setIsGeocoding(false); }
  };

  const handleShareProfile = () => {
      const url = `${window.location.origin}/${profileData?.profile?.username}`;
      navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết Hồ sơ Doanh nghiệp!");
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const tid = toast.loading("Đang lưu hồ sơ...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { ...editForm, social_links: JSON.stringify(socials) };
      const res = await fetch(`${API_URL}/user/profile`, { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok || result.status !== "success") throw new Error(result.detail || "Lỗi lưu hồ sơ");
      
      setProfileData((prev: any) => ({ ...prev, profile: { ...prev.profile, ...result.data } }));
      toast.success("Hồ sơ đã được cập nhật!", { id: tid });
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
          if (upErr) throw new Error("Lỗi tải ảnh lên Storage");
          
          const publicUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
          const { data: { session } } = await supabase.auth.getSession();
          
          const payload = type === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl };
          const res = await fetch(`${API_URL}/user/profile`, { 
              method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, 
              body: JSON.stringify(payload) 
          });
          
          if (!res.ok) throw new Error("Lỗi lưu ảnh");
          setProfileData((prev: any) => ({ ...prev, profile: { ...prev.profile, ...payload } }));
          toast.success("Cập nhật ảnh thành công!", { id: tid });
      } catch (e: any) { toast.error(e.message, { id: tid }); } 
      finally { setIsUploadingImage(false); }
  };

  const addSocial = () => setSocials([...socials, { platform: 'facebook', url: '' }]);
  const removeSocial = (idx: number) => setSocials(socials.filter((_, i) => i !== idx));
  const updateSocial = (idx: number, field: keyof SocialLink, value: string) => { const ns = [...socials]; ns[idx] = { ...ns[idx], [field]: value }; setSocials(ns); };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.service_name || !newService.price) return toast.error("Vui lòng điền đủ Tên và Giá!");
    setIsUploading(true);
    const tid = toast.loading("Đang gửi dịch vụ đi kiểm duyệt...");
    try {
        let mediaUrl = null;
        if (mediaFile) {
            const fileName = `services/${user.id}-${Date.now()}.${mediaFile.name.split('.').pop()}`;
            const { error: upErr } = await supabase.storage.from('media').upload(fileName, mediaFile);
            if (upErr) throw new Error("Lỗi tải tệp minh họa");
            mediaUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;
        }
        const { data: { session } } = await supabase.auth.getSession();
        const payload = { ...newService, price: parseFloat(newService.price), tags: newService.tags.split(',').map(t => t.trim()).filter(Boolean), [mediaType === 'video' ? 'video_url' : 'image_url']: mediaUrl };
        const res = await fetch(`${API_URL}/services`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload) });
        const result = await res.json();
        if (!res.ok || result.status !== "success") throw new Error(result.detail || "Lỗi tạo dịch vụ");
        toast.success("Đã gửi dịch vụ đi chờ kiểm duyệt!", { id: tid });
        setIsAddModalOpen(false); setNewService({ service_name: "", description: "", price: "", tags: "" }); setMediaFile(null); setMediaType('image');
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
        const payload = { service_name: editingService.service_name, description: editingService.description, price: parseFloat(editingService.price), tags: Array.isArray(editingService.tags) ? editingService.tags : editingService.tags.split(',').map((t: string) => t.trim()).filter(Boolean) };
        const res = await fetch(`${API_URL}/partner/my-services/${editingService.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload) });
        const result = await res.json();
        if (!res.ok || result.status !== "success") throw new Error(result.detail || "Lỗi chỉnh sửa");
        toast.success("Bản sửa đổi đã được gửi đi chờ kiểm duyệt!", { id: tid });
        setIsEditModalOpen(false); fetchData();
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsUploading(false); }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Bạn muốn gửi yêu cầu xóa dịch vụ này?")) return;
    const tid = toast.loading("Đang gửi yêu cầu xóa...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/partner/my-services/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${session?.access_token}` } });
        if (!res.ok) throw new Error("Lỗi xóa");
        toast.success("Yêu cầu xóa đã được gửi chờ duyệt!", { id: tid }); fetchData();
    } catch (e: any) { toast.error(e.message, { id: tid }); }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioFile || !studioData.title) return toast.error("Cần có Video và Tiêu đề!");
    setIsStudioUploading(true);
    const tid = toast.loading("Đang gửi video đi kiểm duyệt...");
    try {
        const fileName = `studio-${Date.now()}.${studioFile.name.split('.').pop()}`;
        const { error: upErr } = await supabase.storage.from('media').upload(fileName, studioFile);
        if (upErr) throw new Error("Lỗi tải video lên Storage");
        const videoUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;
        const { data: { session } } = await supabase.auth.getSession();
        const payload = { title: studioData.title, content: studioData.content, price: studioData.price ? parseFloat(studioData.price) : null, video_url: videoUrl };
        const res = await fetch(`${API_URL}/tiktok/feeds`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Lỗi đăng bài");
        toast.success("Video đã được gửi đi chờ duyệt!", { id: tid });
        setStudioData({ title: "", content: "", price: "" }); setStudioFile(null); setStudioPreview(null);
        setIsAddVideoModalOpen(false); fetchData(); 
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsStudioUploading(false); }
  };

  const handleEditVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStudioUploading(true);
    const tid = toast.loading("Đang gửi bản sửa đổi video...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const payload = { title: editingVideo.title, content: editingVideo.content, price: editingVideo.price ? parseFloat(editingVideo.price) : null };
        const res = await fetch(`${API_URL}/partner/my-tiktok-feeds/${editingVideo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Lỗi chỉnh sửa video");
        toast.success("Bản sửa đổi video đã được gửi đi chờ duyệt!", { id: tid });
        setIsEditVideoModalOpen(false); fetchData();
    } catch (e: any) { toast.error(e.message, { id: tid }); }
    finally { setIsStudioUploading(false); }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Bạn muốn gửi yêu cầu gỡ video này khỏi Trang chủ?")) return;
    const tid = toast.loading("Đang gửi yêu cầu gỡ...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/partner/my-tiktok-feeds/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${session?.access_token}` } });
        if (!res.ok) throw new Error("Lỗi gỡ video");
        toast.success("Yêu cầu gỡ video đã được gửi chờ duyệt!", { id: tid }); fetchData();
    } catch (e: any) { toast.error(e.message, { id: tid }); }
  };

  const renderTags = (tagsRaw: any) => {
    let tagsArray: string[] = [];
    try { tagsArray = typeof tagsRaw === 'string' ? JSON.parse(tagsRaw) : (Array.isArray(tagsRaw) ? tagsRaw : []); } catch { }
    return tagsArray.map((t, i) => (<span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">#{t}</span>));
  };

  const StatusBadge = ({ status }: { status: string }) => {
      const config: any = {
          'APPROVED': { label: 'Đang phát sóng', class: 'bg-emerald-500 text-white' },
          'PENDING': { label: 'Chờ xét duyệt', class: 'bg-amber-500 text-white' },
          'REJECTED': { label: 'Cần điều chỉnh', class: 'bg-rose-500 text-white' },
          'PENDING_DELETE': { label: 'Đang chờ gỡ', class: 'bg-rose-500 text-white' },
          'DELETED': { label: 'Đã gỡ', class: 'bg-slate-500 text-white' } 
      };
      const c = config[status] || config['PENDING'];
      return <span className={`px-2 py-1 text-[9px] font-black rounded-md uppercase border backdrop-blur-md ${c.class}`}>{c.label}</span>;
  };

  // Thay thế Loading cũ bằng chuẩn mới của Hệ thống Role
  if (isLoading) return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center transition-colors duration-500">
          <Building2 className="text-blue-500 w-10 h-10 animate-pulse" />
          <p className="text-slate-500 mt-4 text-xs font-black tracking-widest uppercase">Đang nạp không gian doanh nghiệp...</p>
      </div>
  );

  return (
    <div className="flex-1 relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 overflow-hidden font-be-vietnam">
      
      <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={e => handleImageUpload(e, 'avatar')} />
      <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={e => handleImageUpload(e, 'cover')} />

      <div className="absolute top-0 w-full z-40 p-6 flex justify-end items-center bg-gradient-to-b from-slate-50 dark:from-zinc-950 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={toggleTheme} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-lg group transition-all">
              {theme === "dark" ? <Sun size={20} className="group-hover:text-amber-300" /> : <Moon size={20} className="group-hover:text-blue-500" />}
            </button>
            <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-blue-500 shadow-lg transition-all"><Bell size={20} /></button>
          </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {isNotifOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in"><NotificationModal /></div>}

          {/* CHUẨN HOÁ COVER IMAGE */}
          <div className="relative w-full h-48 md:h-64 bg-slate-200 dark:bg-zinc-900 group cursor-pointer overflow-hidden border-b border-slate-200 dark:border-white/5" onClick={() => coverInputRef.current?.click()}>
              {profileData?.profile?.cover_url ? (
                  <img src={profileData.profile.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="cover" />
              ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 flex items-center justify-center">
                      <div className="flex flex-col items-center opacity-50"><Building2 size={40} className="mb-2 text-blue-500 dark:text-blue-400"/> <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Tải lên ảnh bìa cơ sở</span></div>
                  </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 md:px-12 pb-32 relative z-10">
            
            {/* CHUẨN HOÁ HEADER THEO MASTER ADMIN */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 mb-10 animate-fade-in">
                
                {/* Avatar lồi lên */}
                <div className="relative shrink-0 -mt-16 md:-mt-20 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-400 to-cyan-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition duration-1000"></div>
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-zinc-950 shadow-2xl bg-white p-1.5">
                    <img src={profileData?.profile?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.profile?.full_name}&background=3b82f6&color=fff`} className="w-full h-full object-cover rounded-full" alt="avatar" />
                  </div>
                  <div className="absolute inset-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Edit3 className="text-white"/></div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black rounded-full shadow-xl border border-white/20 whitespace-nowrap uppercase flex items-center gap-1.5 tracking-widest z-20">
                    <Building2 size={12} className="fill-white/20"/> BUSINESS
                  </div>
                </div>

                {/* Thông tin & Các nút (Ngang hàng) */}
                <div className="flex-1 w-full pt-4 md:pt-6 text-center md:text-left">
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                      <div>
                          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center justify-center md:justify-start gap-2 mb-1 drop-shadow-md">
                              {profileData?.profile?.full_name || "Doanh nghiệp"} <BadgeCheck size={24} className="text-blue-500" />
                          </h1>
                          <h2 className="text-base font-medium text-slate-500 dark:text-zinc-400 tracking-tight">@{profileData?.profile?.username || "business_account"}</h2>
                      </div>
                      
                      <div className="flex items-center justify-center md:justify-end gap-3 mt-2 md:mt-0">
                          <button onClick={() => router.push(`/${profileData?.profile?.username}`)} className="px-6 py-3.5 bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-black rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 active:scale-95 text-sm uppercase tracking-widest">
                              <Eye size={18} strokeWidth={3} /> Xem công khai
                          </button>
                          <button onClick={handleShareProfile} className="p-3.5 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500 transition-all shadow-sm active:scale-90">
                              <Share2 size={18} />
                          </button>
                          <button onClick={handleLogout} className="p-3.5 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shadow-sm active:scale-90">
                              <LogOut size={18} />
                          </button>
                      </div>
                  </div>

                  {/* THỐNG KÊ (Chuẩn Admin) */}
                  <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
                      <div className="flex items-center gap-2 group cursor-pointer">
                          <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white transition-colors">{profileData?.profile?.followers_count || 0}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Người quan<br/>tâm</span>
                      </div>
                      <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
                      <div className="flex items-center gap-2 group cursor-pointer">
                          <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white transition-colors">{myServices.length || 0}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Dịch vụ<br/>Active</span>
                      </div>
                      <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
                      <div className="flex items-center gap-2 group cursor-pointer">
                          <span className="text-xl md:text-2xl font-black text-blue-500 transition-colors">{profileData?.profile?.reputation_points || 92}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Điểm<br/>Uy tín</span>
                      </div>
                  </div>

                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto md:mx-0 leading-relaxed">
                      {profileData?.profile?.bio || "Đối tác y tế chính thức của AI Health. Cung cấp dịch vụ chăm sóc sức khỏe chủ động và chuyên nghiệp."}
                  </p>
                </div>
            </div>

            {/* TABS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative items-start border-t border-slate-200 dark:border-white/10 pt-10">
                <div className="lg:col-span-8">
                    <div className="flex justify-start gap-8 border-b border-slate-200 dark:border-white/10 pb-4 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('services')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'services' ? 'text-blue-500 border-b-2 border-blue-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                            <Package size={16}/> QUẢN LÝ DỊCH VỤ
                        </button>
                        <button onClick={() => setActiveTab('studio')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'studio' ? 'text-blue-500 border-b-2 border-blue-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                            <Video size={16}/> STUDIO VIDEO
                        </button>
                        <button onClick={() => setActiveTab('reviews')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'reviews' ? 'text-blue-500 border-b-2 border-blue-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                            <Star size={16}/> LỊCH SỬ ĐÁNH GIÁ
                        </button>
                        <button onClick={() => setActiveTab('info')} className={`flex items-center gap-2 text-xs font-black transition-all whitespace-nowrap ${activeTab === 'info' ? 'text-blue-500 border-b-2 border-blue-500 pb-4 -mb-5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                            <Edit3 size={16}/> HỒ SƠ DOANH NGHIỆP
                        </button>
                    </div>

                    <div className="mt-10">
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
                                             <div key={svc.id} onClick={() => setExpandedService(svc)} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-2xl hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300 group flex flex-col relative cursor-pointer">
                                                <div className="relative h-44 overflow-hidden shrink-0 bg-slate-100 dark:bg-black">
                                                    {svc.image_url ? ( <img src={svc.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="service" />
                                                    ) : svc.video_url ? ( <video src={svc.video_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted playsInline />
                                                    ) : ( <div className="w-full h-full flex items-center justify-center text-slate-400"><Package size={32}/></div> )}
                                                    
                                                    {/* Nhãn trạng thái */}
                                                    <div className="absolute top-4 left-4 z-10"><StatusBadge status={svc.status} /></div>

                                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <button onClick={(e) => { 
                                                            e.stopPropagation();
                                                            let parsedTags = [];
                                                            try { parsedTags = typeof svc.tags === 'string' ? JSON.parse(svc.tags) : svc.tags; } catch {}
                                                            setEditingService({...svc, tags: parsedTags || []}); 
                                                            setIsEditModalOpen(true); 
                                                        }} className="p-2.5 bg-white/90 dark:bg-black/80 backdrop-blur-md text-blue-600 dark:text-blue-400 rounded-xl shadow-lg hover:bg-blue-50 dark:hover:bg-white/10 transition-colors"><Edit3 size={16}/></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteService(svc.id); }} className="p-2.5 bg-white/90 dark:bg-black/80 backdrop-blur-md text-rose-600 dark:text-rose-400 rounded-xl shadow-lg hover:bg-rose-50 dark:hover:bg-white/10 transition-colors"><Trash2 size={16}/></button>
                                                    </div>
                                                </div>
                                                <div className="p-6 flex-1 flex flex-col">
                                                    <h4 className="font-black text-lg text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-500 transition-colors">{svc.service_name}</h4>
                                                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">{svc.description}</p>
                                                    <div className="flex flex-wrap gap-1.5 mb-4">{renderTags(svc.tags)}</div>
                                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-4">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá trọn gói</span>
                                                        <span className="text-xl font-black text-blue-600 dark:text-blue-400">{parseFloat(svc.price).toLocaleString('vi-VN')} đ</span>
                                                    </div>
                                                </div>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                        )}

                        {activeTab === 'studio' && (
                             <div className="animate-fade-in space-y-6">
                                 <div className="flex justify-between items-center mb-6">
                                     <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Video của tôi ({myVideos.length})</h3>
                                     <button onClick={() => setIsAddVideoModalOpen(true)} className="px-5 py-2.5 bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2">
                                         <Video size={16}/> Tải Video lên
                                     </button>
                                 </div>

                                 {myVideos.length === 0 ? (
                                     <div className="text-center py-20 bg-white/40 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                                         <Video size={48} className="mx-auto text-slate-300 dark:text-zinc-600 mb-4" />
                                         <p className="text-slate-500 font-bold">Chưa có video nào được tải lên Studio.</p>
                                     </div>
                                 ) : (
                                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                         {myVideos.map(vid => (
                                             <div key={vid.id} onClick={() => setExpandedVideo(vid)} className="aspect-[9/16] rounded-[2rem] overflow-hidden bg-black relative group shadow-sm hover:shadow-2xl border border-slate-200 dark:border-white/10 hover:border-blue-500/50 cursor-pointer hover:-translate-y-1 transition-all duration-300">
                                                 <video src={vid.video_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" muted playsInline />
                                                 
                                                 <div className="absolute top-4 left-4 z-10"><StatusBadge status={vid.status} /></div>
                                                 
                                                 <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingVideo(vid); setIsEditVideoModalOpen(true); }} className="p-2.5 bg-white/90 dark:bg-black/80 backdrop-blur-md text-blue-600 dark:text-blue-400 rounded-xl shadow-lg hover:bg-blue-50 dark:hover:bg-white/10 transition-colors"><Edit3 size={16}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteVideo(vid.id); }} className="p-2.5 bg-white/90 dark:bg-black/80 backdrop-blur-md text-rose-600 dark:text-rose-400 rounded-xl shadow-lg hover:bg-rose-50 dark:hover:bg-white/10 transition-colors"><Trash2 size={16}/></button>
                                                 </div>
                                                 
                                                 <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                                                     <p className="text-white text-sm font-black line-clamp-2 leading-tight drop-shadow-md mb-1">{vid.title}</p>
                                                     {vid.price ? (
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 rounded-lg">
                                                            <DollarSign size={12} className="text-blue-400"/>
                                                            <span className="text-blue-400 text-xs font-black">{parseFloat(vid.price).toLocaleString('vi-VN')} đ</span>
                                                        </div>
                                                     ) : null}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="animate-fade-in space-y-8">
                                <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-lg">
                                    <div className="flex items-center gap-2 text-amber-500 font-black text-xs mb-6 uppercase tracking-widest">
                                        <Star size={16} fill="currentColor" /> ĐÁNH GIÁ TRỰC TUYẾN
                                    </div>
                                    <div className="flex items-center gap-6 mb-10">
                                        <span className="text-6xl font-black text-slate-900 dark:text-white">4.8</span>
                                        <div>
                                            <div className="flex gap-1 text-amber-400 mb-1">
                                                {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={20} fill="currentColor" />)}
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 uppercase">Dựa trên 124 lượt đánh giá</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Phản hồi gần đây</h3>
                                        {[
                                            { name: "Nguyễn V. A", stars: 5, comment: "Dịch vụ rất chuyên nghiệp, không gian thư giãn tuyệt đối." },
                                            { name: "Trần T. B", stars: 5, comment: "Bác sĩ tư vấn rất tận tâm, sẽ quay lại vào tuần sau." },
                                            { name: "Lê C.", stars: 4, comment: "Chất lượng tốt, máy móc hiện đại và sạch sẽ." }
                                        ].map((fb, idx) => (
                                            <div key={idx} className="p-5 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all hover:scale-[1.01]">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{fb.name}</h4>
                                                    <div className="flex gap-0.5 text-amber-400">
                                                        {Array.from({ length: fb.stars }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium italic leading-relaxed">"{fb.comment}"</p>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full mt-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                                        Xem tất cả đánh giá
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-lg space-y-6 relative">
                                    {isUploadingImage && (
                                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-50 rounded-[2rem] flex items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Username định danh</label>
                                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-inner" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Tên doanh nghiệp hiển thị</label>
                                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-inner" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Địa chỉ cơ sở (Bản đồ)</label>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="VD: 18 Ngõ 28 Nguyên Hồng..." className="flex-1 bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-inner" value={editForm.physical_address} onChange={e => setEditForm({...editForm, physical_address: e.target.value})} />
                                            <button type="button" onClick={handleGeocode} disabled={isGeocoding} className="px-6 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center min-w-[120px]">
                                                {isGeocoding ? <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div> : "Tìm tọa độ"}
                                            </button>
                                        </div>
                                        
                                        {/* Bản đồ Mini cho phép kéo thả Marker */}
                                        <div className="w-full h-[250px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner relative z-0">
                                            <MiniMapPicker 
                                                position={[editForm.latitude, editForm.longitude]} 
                                                onChange={(lat: number, lng: number) => setEditForm(prev => ({...prev, latitude: lat, longitude: lng}))} 
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold italic ml-1">* Bạn có thể nắm kéo chiếc ghim trên bản đồ để đặt vị trí chính xác nhất.</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Tiểu sử</label>
                                        <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-inner" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
                                    </div>
                                    <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><Link2 size={16}/> Mạng xã hội</label>
                                            <button onClick={addSocial} className="text-blue-500 hover:text-blue-600 font-black text-xs flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg"><Plus size={14}/> Thêm Link</button>
                                        </div>
                                        <div className="space-y-4">
                                            {socials.map((social, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/5">
                                                    <select value={social.platform} onChange={(e) => updateSocial(idx, 'platform', e.target.value as SocialPlatform)} className="w-full sm:w-1/3 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-zinc-300">
                                                        <option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="website">Website</option>
                                                    </select>
                                                    <div className="w-full sm:flex-1 flex items-center gap-2">
                                                        <input type="url" placeholder="https://..." value={social.url} onChange={(e) => updateSocial(idx, 'url', e.target.value)} className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500" />
                                                        <button onClick={() => removeSocial(idx)} className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl"><Trash2 size={18}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={handleUpdateProfile} disabled={isUpdating} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase">LƯU THÔNG TIN HỒ SƠ</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI: ĐIỂM UY TÍN (Theo form mẫu Master) */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8 lg:pt-[52px]">
                    <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[3rem] p-8 border border-slate-200 dark:border-white/10 relative overflow-hidden shadow-lg flex flex-col">
                        <div className="flex items-center gap-2 text-blue-500 font-black text-xs mb-4 uppercase tracking-widest">
                            <ShieldCheck size={16} strokeWidth={3} /> ĐIỂM UY TÍN
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{profileData?.profile?.reputation_points || 92}</span>
                            <span className="text-xl font-bold text-slate-400">/100</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-medium leading-relaxed mt-2 border-t border-slate-200 dark:border-white/10 pt-4">
                            Hoạt động tốt và phản hồi tích cực giúp tăng điểm.
                        </p>
                    </div>
                </div>      
            </div>
          </div>
      </main>

      {/* ================= MODAL: THÊM DỊCH VỤ ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
            <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Package size={20} className="text-blue-500"/> Thêm Dịch Vụ Mới</h3>
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
                            <><UploadCloud className="text-slate-400 mb-2"/><p className="text-xs font-bold text-slate-500">Tải lên {mediaType === 'image' ? 'Ảnh' : 'Video'} dịch vụ</p></>
                        )}
                        <input id="media-up" type="file" accept={mediaType === 'image' ? "image/*" : "video/*"} className="hidden" onChange={(e) => e.target.files?.[0] && setMediaFile(e.target.files[0])} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tên dịch vụ</label>
                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={newService.service_name} onChange={e => setNewService({...newService, service_name: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Giá tiền (VNĐ)</label>
                            <input type="number" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-black text-blue-600 focus:outline-none focus:border-blue-500" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tags (cách nhau phẩy)</label>
                            <input type="text" placeholder="VD: Mới nhất, Hot" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={newService.tags} onChange={e => setNewService({...newService, tags: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Mô tả chi tiết</label>
                        <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isUploading} className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs flex justify-center items-center gap-2">
                        {isUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>} GỬI ĐI CHỜ KIỂM DUYỆT
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* ================= MODAL: SỬA DỊCH VỤ ================= */}
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
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Giá tiền (VNĐ)</label>
                            <input type="number" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-black text-blue-600 focus:outline-none focus:border-blue-500" value={editingService.price} onChange={e => setEditingService({...editingService, price: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nhãn dán (cách nhau phẩy)</label>
                            <input type="text" placeholder="VD: Mới nhất, Hot" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" 
                              value={Array.isArray(editingService.tags) ? editingService.tags.join(', ') : ''} 
                              onChange={e => setEditingService({...editingService, tags: e.target.value.split(',').map((t: string) => t.trim()).filter((t: string) => t)})} 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Mô tả chi tiết</label>
                        <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none" value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isUploading} className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs flex justify-center items-center gap-2">
                        {isUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>} GỬI BẢN SỬA CHỜ DUYỆT LẠI
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* ================= MODAL: THÊM VIDEO STUDIO ================= */}
      {isAddVideoModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddVideoModalOpen(false)}></div>
            <div className="relative w-full max-w-[800px] bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Video size={20} className="text-blue-500"/> Tải Video Lên Studio</h3>
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
                                        <Video size={40} className="text-blue-500 mb-4" />
                                        <p className="text-white font-bold text-sm">Tải Video Ngắn<br/><span className="text-xs text-slate-400 font-normal mt-1 block">Tỉ lệ 9:16</span></p>
                                    </div>
                                )}
                                <input type="file" accept="video/*" ref={studioInputRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) { setStudioFile(f); setStudioPreview(URL.createObjectURL(f)); } }} />
                            </div>
                        </div>
                        <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tên video (Bắt buộc)</label>
                                <input type="text" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" placeholder="Nhập tiêu đề thu hút..." value={studioData.title} onChange={e => setStudioData({...studioData, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Mô tả nội dung</label>
                                <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none" placeholder="Chia sẻ thêm về dịch vụ..." value={studioData.content} onChange={e => setStudioData({...studioData, content: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Giá tham khảo (VNĐ)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <input type="number" className="w-full bg-slate-100/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-5 py-3.5 text-sm font-black text-blue-600 focus:outline-none focus:border-blue-500" placeholder="0" value={studioData.price} onChange={e => setStudioData({...studioData, price: e.target.value})} />
                                </div>
                            </div>
                            <button onClick={handleAddVideo} disabled={isStudioUploading || !studioFile} className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all text-xs tracking-widest uppercase flex justify-center items-center gap-2 disabled:opacity-50">
                                {isStudioUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>} GỬI ĐI CHỜ KIỂM DUYỆT
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ================= MODAL: SỬA VIDEO STUDIO ================= */}
      {isEditVideoModalOpen && editingVideo && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditVideoModalOpen(false)}></div>
            <div className="relative w-full max-w-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Edit3 size={20} className="text-blue-500"/> Sửa Thông Tin Video</h3>
                    <button onClick={() => setIsEditVideoModalOpen(false)} className="p-2 bg-slate-200/50 dark:bg-white/5 rounded-full text-slate-500"><X size={16}/></button>
                </div>
                <form onSubmit={handleEditVideo} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tên video</label>
                        <input type="text" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingVideo.title} onChange={e => setEditingVideo({...editingVideo, title: e.target.value})} required />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Giá tham khảo (VNĐ)</label>
                        <input type="number" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-black text-blue-600 focus:outline-none focus:border-blue-500" value={editingVideo.price || ''} onChange={e => setEditingVideo({...editingVideo, price: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Mô tả nội dung</label>
                        <textarea rows={3} className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none" value={editingVideo.content} onChange={e => setEditingVideo({...editingVideo, content: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isStudioUploading} className="w-full py-4 mt-2 bg-blue-600 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs flex justify-center items-center gap-2">
                        {isStudioUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>} GỬI BẢN SỬA CHỜ DUYỆT LẠI
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* ================= MODAL: XEM TRƯỚC DỊCH VỤ (EXPANDED VIEW) ================= */}
      {expandedService && (
        <div className="fixed inset-0 z-[140] flex justify-center items-center p-4 md:p-6">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl transition-opacity duration-500 animate-fade-in" onClick={() => setExpandedService(null)}></div>
          
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-slate-200 dark:border-white/10 animate-slide-up max-h-[90vh]">
            
            {/* Media bên trái */}
            <div className="w-full md:w-1/2 h-64 md:h-auto bg-slate-100 dark:bg-black relative flex items-center justify-center shrink-0">
                {expandedService.image_url ? (
                    <img src={expandedService.image_url} className="w-full h-full object-cover" alt={expandedService.service_name} />
                ) : expandedService.video_url ? (
                    <video src={expandedService.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                    <Package size={60} className="text-slate-300 dark:text-zinc-800"/>
                )}
                <div className="absolute top-4 left-4"><StatusBadge status={expandedService.status} /></div>
                <button onClick={() => setExpandedService(null)} className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-md text-white"><X size={20}/></button>
            </div>

            {/* Thông tin bên phải */}
            <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto no-scrollbar relative">
                <button onClick={() => setExpandedService(null)} className="hidden md:flex absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition-colors"><X size={20}/></button>
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-4 uppercase tracking-wider w-max">
                  <ShieldCheck size={12} /> Thông tin dịch vụ
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-4">{expandedService.service_name}</h2>
                <div className="flex flex-wrap gap-2 mb-6">{renderTags(expandedService.tags)}</div>
                
                <div className="flex-1">
                    <p className="text-sm md:text-base text-slate-600 dark:text-zinc-400 leading-relaxed mb-8 whitespace-pre-wrap">{expandedService.description}</p>
                </div>
                
                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giá trọn gói</p>
                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{Number(expandedService.price).toLocaleString()} <span className="text-base text-slate-500">đ</span></p>
                    </div>
                    {/* Thay nút đặt lịch thành nút Edit */}
                    <button 
                        onClick={() => {
                            let parsedTags = [];
                            try { parsedTags = typeof expandedService.tags === 'string' ? JSON.parse(expandedService.tags) : expandedService.tags; } catch {}
                            setEditingService({...expandedService, tags: parsedTags || []}); 
                            setExpandedService(null);
                            setIsEditModalOpen(true); 
                        }} 
                        className="w-full sm:w-auto px-8 py-4 bg-slate-900 dark:bg-white hover:bg-blue-600 dark:hover:bg-blue-500 text-white dark:text-zinc-950 dark:hover:text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                        <Edit3 size={18}/> Chỉnh sửa dịch vụ
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: XEM VIDEO STUDIO (CHUẨN TIKTOK 9:16 + CENTERED) ================= */}
      {expandedVideo && (
        <div className="fixed inset-0 z-[140] flex justify-center items-center overflow-hidden transition-all duration-500">
          {/* Backdrop mờ cực đại: Click để dọn sạch toàn bộ Video & Bình luận */}
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl animate-fade-in" 
               onClick={() => { 
                   setExpandedVideo(null); 
                   setIsCommentModalOpen(false);
                   setActiveCommentVideoId(null);
               }}>
               {/* Background mờ chuyển động từ chính video */}
               <video src={expandedVideo.video_url} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[100px] scale-110" muted playsInline autoPlay loop />
          </div>
          
          {/* Cấu trúc Container chuẩn 9:16 căn giữa */}
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none p-4 md:p-10">
            <div className="relative h-full max-h-[92vh] aspect-[9/16] bg-black rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 animate-slide-up pointer-events-auto">
                
                {/* Video Player Main */}
                <video src={expandedVideo.video_url} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
                
                {/* Overlay Đen mờ dưới chân để nổi text */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none"></div>
                
                {/* Nút thoát (Góc trái): Đảm bảo đóng cả video và bình luận */}
                <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
                    <button onClick={() => { 
                                setExpandedVideo(null); 
                                setIsCommentModalOpen(false); 
                                setActiveCommentVideoId(null);
                            }} 
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-rose-500/30 hover:text-rose-400 transition-all active:scale-90 flex items-center justify-center shadow-lg">
                        <X size={20} strokeWidth={3}/>
                    </button>
                    <StatusBadge status={expandedVideo.status} />
                </div>

                {/* NÚT CHỈNH SỬA (Vị trí Top-Right tinh tế - Chuẩn Studio Quản trị) */}
                <button onClick={() => { setEditingVideo(expandedVideo); setExpandedVideo(null); setIsCommentModalOpen(false); setIsEditVideoModalOpen(true); }} 
                        className="absolute top-6 right-6 z-30 group flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-blue-600 hover:border-blue-400 hover:scale-105 transition-all shadow-xl active:scale-95">
                    <Edit3 size={16} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Chỉnh sửa</span>
                </button>

                {/* Thông tin video bên trái */}
                <div className="absolute bottom-[40px] left-6 z-20 max-w-[80%] pointer-events-auto animate-slide-up">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#80BF84]/20 backdrop-blur-md border border-[#80BF84]/30 rounded-full text-[9px] font-black text-[#80BF84] mb-4 uppercase tracking-widest">
                      <ShieldCheck size={10} /> Dịch vụ xác thực
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-2xl mb-1">{expandedVideo.title}</h3>
                    <p className="text-zinc-200 text-xs line-clamp-2 drop-shadow-md font-medium mb-5 pr-4 opacity-90">{expandedVideo.content}</p>
                    
                    {expandedVideo.price && (
                      <div className="flex items-center gap-3 pl-1.5 pr-6 py-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full w-max shadow-2xl">
                        <div className="w-8 h-8 bg-[#80BF84] rounded-full flex items-center justify-center text-zinc-950 shadow-inner"><DollarSign size={16} strokeWidth={3} /></div>
                        <div className="flex flex-col"><span className="text-[8px] font-black text-[#80BF84] uppercase leading-none mb-0.5">Giá tham khảo</span><span className="font-black text-sm leading-none">{parseFloat(expandedVideo.price).toLocaleString()} đ</span></div>
                      </div>
                    )}
                </div>

                {/* Dải công cụ tương tác xã hội bên phải */}
                <div className="absolute bottom-[40px] right-3 z-20 flex flex-col items-center gap-6 pointer-events-auto">
                    {/* Avatar Partner & Plus Sign */}
                    <div className="relative mb-2">
                      <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800 shadow-xl">
                         <img src={profileData?.profile?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.profile?.full_name}&background=3b82f6&color=fff`} className="w-full h-full object-cover"/>
                      </div>
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-[#80BF84] rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-md"><Plus size={10} className="text-zinc-950" strokeWidth={4} /></div>
                    </div>

                    <button onClick={() => handleInteraction(expandedVideo.id, 'like')} className="flex flex-col items-center gap-1 group">
                        <div className={`p-3.5 rounded-full backdrop-blur-md transition-all ${expandedVideo.is_liked ? 'bg-rose-500/30 text-rose-500 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-black/40 border border-white/10 text-white hover:bg-rose-500/20'}`}>
                            <Heart size={26} strokeWidth={2.5} className={`${expandedVideo.is_liked ? 'fill-rose-500 scale-110' : 'group-active:scale-75'} transition-all`} />
                        </div>
                        <span className="text-[10px] font-black text-white drop-shadow-xl">{expandedVideo.likes_count || 0}</span>
                    </button>
                    
                    <button onClick={() => handleOpenComments(expandedVideo.id)} className="flex flex-col items-center gap-1 group">
                        <div className="p-3.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all active:scale-95">
                            <MessageCircle size={26} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-white drop-shadow-xl">{expandedVideo.comments_count || 0}</span>
                    </button>
                    
                    <button onClick={() => handleInteraction(expandedVideo.id, 'save')} className="flex flex-col items-center gap-1 group">
                        <div className={`p-3.5 rounded-full backdrop-blur-md transition-all ${expandedVideo.is_saved ? 'bg-amber-500/30 text-amber-500 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-black/40 border border-white/10 text-white hover:bg-amber-500/20'}`}>
                            <Bookmark size={26} strokeWidth={2.5} className={`${expandedVideo.is_saved ? 'fill-amber-500 scale-110' : 'group-active:scale-75'} transition-all`} />
                        </div>
                        <span className="text-[10px] font-black text-white drop-shadow-xl">{expandedVideo.saves_count || 0}</span>
                    </button>

                    <button onClick={() => handleInteraction(expandedVideo.id, 'share')} className="flex flex-col items-center gap-1 group">
                        <div className="p-3.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all">
                            <Share2 size={26} strokeWidth={2.5} />
                        </div>
                        <span className="text-[9px] font-black text-white drop-shadow-md uppercase tracking-tighter">Chia sẻ</span>
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DRAWER BÌNH LUẬN: ĐỈNH TẦNG HIỂN THỊ (FIX Z-INDEX) ================= */}
      {/* Chỉ render wrapper khi isCommentModalOpen = true để tránh div tàng hình chặn click toàn trang */}
      {isCommentModalOpen && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            <div className="pointer-events-auto h-full w-full">
                <CommentModal 
                  isOpen={isCommentModalOpen} 
                  onClose={() => setIsCommentModalOpen(false)} 
                  videoId={activeCommentVideoId || ""} 
                  videoAuthorId={profileData?.profile?.id || ""} 
                  user={user} 
                  userRole={profileData?.profile?.role || "PARTNER"} 
                  onCommentAdded={handleCommentSuccess} 
                  onCommentDeleted={handleCommentDeleted} 
                />
            </div>
        </div>
      )}

    </div>
  );
}