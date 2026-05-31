"use client";

import { useState, useEffect } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, LayoutGrid, ShieldCheck, 
  Star, Package, BadgeCheck, TrendingUp, Building2, X, DollarSign, CalendarPlus, Sparkles, Plus, Clock, 
  Ticket, CheckCircle2, AlertCircle, Tag
} from "lucide-react";
import { toast } from "sonner";
import DashboardButton from "./DashboardButton";
import CommentModal from "@/components/CommentModal";
import BookingModal from "@/components/BookingModal";
import { useVoucherStore } from "@/store/useVoucherStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function PartnerView({ profile, videoTiktokFeeds = [], communityPosts = [], likedTiktokFeeds = [], savedTiktokFeeds = [], services = [], reviews = [], stats = {}, isOwner }: any) {  
  const [activeTab, setActiveTab] = useState("services");
  const [sortOrder, setSortOrder] = useState("newest");

  // --- LOCAL STATES CHO TƯƠNG TÁC XÃ HỘI ---
  const [localVideos, setLocalVideos] = useState<any[]>(videoTiktokFeeds);
  const [expandedService, setExpandedService] = useState<any>(null);
  const [expandedVideo, setExpandedVideo] = useState<any>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activeCommentVideoId, setActiveCommentVideoId] = useState<string | null>(null);

  // Khởi tạo luồng kết nối dữ liệu Voucher đa tầng
  const { publicVouchers, myVouchers, fetchPublicVouchers, claimVoucher } = useVoucherStore();
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);

  useEffect(() => {
    fetchPublicVouchers();
  }, [fetchPublicVouchers]);

  const partnerVouchers = publicVouchers.filter((v: any) => 
    v.status === 'APPROVED' && 
    (v.issuer_type === 'ADMIN' || (v.issuer_type === 'PARTNER' && v.issuer_id === profile?.id))
  );

  // Đồng bộ Video Feed khi Props thay đổi
  useEffect(() => { setLocalVideos(videoTiktokFeeds); }, [videoTiktokFeeds]);

  const handleInteraction = async (videoId: string, action: 'like' | 'save' | 'share') => {
      if (action === 'share') {
          navigator.clipboard.writeText(`${window.location.origin}/?video=${videoId}`);
          toast.success("Đã sao chép liên kết!");
          return;
      }
      const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
      if (!token) { toast.info("Vui lòng đăng nhập để thao tác!"); return; }
      
      setLocalVideos(prev => prev.map(v => {
          if (v.id === videoId) {
              if (action === 'like') return { ...v, is_liked: !v.is_liked, likes_count: (v.likes_count || 0) + (v.is_liked ? -1 : 1) };
              if (action === 'save') return { ...v, is_saved: !v.is_saved, saves_count: (v.saves_count || 0) + (v.is_saved ? -1 : 1) };
          }
          return v;
      }));
      
      if (expandedVideo && expandedVideo.id === videoId) {
          setExpandedVideo((prev: any) => {
              if (action === 'like') return { ...prev, is_liked: !prev.is_liked, likes_count: (prev.likes_count || 0) + (prev.is_liked ? -1 : 1) };
              if (action === 'save') return { ...prev, is_saved: !prev.is_saved, saves_count: (prev.saves_count || 0) + (prev.is_saved ? -1 : 1) };
              return prev;
          });
      }

      try {
          await fetch(`${API_URL}/tiktok/feeds/${videoId}/${action}`, {
              method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
          });
      } catch (error) { } 
  };

  const handleOpenComments = (videoId: string) => {
      setActiveCommentVideoId(videoId);
      setIsCommentModalOpen(true);
  };

  const handleCommentSuccess = () => {
      setLocalVideos(prev => prev.map(v => v.id === activeCommentVideoId ? { ...v, comments_count: (v.comments_count || 0) + 1 } : v));
      if (expandedVideo && expandedVideo.id === activeCommentVideoId) setExpandedVideo((prev: any) => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
  };

  const handleCommentDeleted = () => {
      setLocalVideos(prev => prev.map(v => v.id === activeCommentVideoId ? { ...v, comments_count: Math.max((v.comments_count || 0) - 1, 0) } : v));
      if (expandedVideo && expandedVideo.id === activeCommentVideoId) setExpandedVideo((prev: any) => ({ ...prev, comments_count: Math.max((prev.comments_count || 0) - 1, 0) }));
  };

  // --- STATE FOLLOW ---
  const [isFollowing, setIsFollowing] = useState(profile?.is_followed || false);
  const [followersCount, setFollowersCount] = useState(profile?.followers_count || 0);

  const handleToggleFollow = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
    if (!token) return toast.error("Vui lòng đăng nhập để quan tâm cơ sở này!");
    
    // Optimistic Update (Cập nhật giao diện trước)
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowersCount((prev: number) => wasFollowing ? Math.max(0, prev - 1) : prev + 1);

    try {
        const res = await fetch(`${API_URL}/user/follow/${profile.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Lỗi server");
    } catch (err: any) {
        toast.error(err.message);
        // Rollback (Phục hồi state nếu lỗi)
        setIsFollowing(wasFollowing);
        setFollowersCount((prev: number) => wasFollowing ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  // --- STATE CỬA SỔ ĐẶT LỊCH (BOOKING MODAL) ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Logic Booking đã được đẩy vào Component tái sử dụng BookingModal

  // Dữ liệu mẫu (Mock) cho Dịch vụ
  const mockServices = services.length > 0 ? services : [
    { id: 1, name: "Gói Khám Tổng Quát Tầm Soát Ung Thư", price: 1500000, tags: ["Hot", "Giảm 20%"], verified: true, image: "https://picsum.photos/seed/s1/400/300", desc: "Tầm soát toàn diện 12 hạng mục quan trọng..." },
    { id: 2, name: "Trị Liệu Cổ Vai Gáy Chuyên Sâu", price: 450000, tags: ["Mới nhất"], verified: true, image: "https://picsum.photos/seed/s2/400/300", desc: "Sử dụng công nghệ AI kết hợp y học cổ truyền." }
  ];

  // Dữ liệu mẫu (Mock) cho Đánh giá (Feedback)
  const mockReviews = reviews.length > 0 ? reviews : [
    { id: 1, user: { full_name: "Nguyễn V. A", avatar_url: "" }, rating: 5, comment: "Dịch vụ rất chuyên nghiệp, không gian thư giãn tuyệt đối." },
    { id: 2, user: { full_name: "Trần T. B", avatar_url: "" }, rating: 5, comment: "Bác sĩ tư vấn rất tận tâm, sẽ quay lại vào tuần sau." },
    { id: 3, user: { full_name: "Lê C.", avatar_url: "" }, rating: 4, comment: "Chất lượng tốt, máy móc hiện đại và sạch sẽ." }
  ];

  const handleShare = () => {
      const profileUrl = window.location.href;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Đã sao chép liên kết doanh nghiệp!");
  };

  return (
    <div className="animate-slide-up pb-20">
      {/* --- COVER IMAGE --- */}
      <div className="relative w-full h-48 md:h-64 bg-slate-200 dark:bg-zinc-900 rounded-[2rem] md:rounded-[3rem] overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-white/5">
          {profile?.cover_url ? (
              <img src={profile.cover_url} className="w-full h-full object-cover" alt="cover" />
          ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 flex items-center justify-center">
                 <Building2 className="text-blue-500/30 w-20 h-20" />
              </div>
          )}
      </div>

      {/* --- STACK PHÍA TRÊN: THÔNG TIN DOANH NGHIỆP --- */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mb-12 px-2 md:px-8">
        
        {/* Avatar đè lên Cover (Hiệu ứng Glow Blue) */}
        <div className="relative group shrink-0 -mt-20 md:-mt-24 z-10">
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-400 to-cyan-600 rounded-full blur-md opacity-40"></div>
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-zinc-950 shadow-2xl bg-white p-1.5">
            <img 
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=3b82f6&color=fff`} 
              className="w-full h-full object-cover rounded-full transition-transform duration-700 group-hover:scale-110" 
              alt="avatar"
            />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black rounded-full shadow-xl flex items-center gap-1 border border-white/20 whitespace-nowrap uppercase tracking-widest">
            <Building2 size={12} fill="currentColor" className="text-blue-200" /> BUSINESS
          </div>
        </div>

        {/* Thông tin Text & Các nút (Xếp dọc chuẩn Admin Master Layout) */}
        <div className="flex-1 w-full pt-2 text-center md:text-left">
          
          {/* Tên & Username */}
          <div className="mb-4">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-md flex items-center justify-center md:justify-start gap-2 mb-1">
              {profile.full_name || "Doanh Nghiệp"}
              <BadgeCheck size={24} className="text-blue-500" />
            </h1>
            <h2 className="text-base font-medium text-slate-500 dark:text-zinc-400 tracking-tight">
              @{profile.username || "business_account"}
            </h2>
          </div>

          {/* Nút Action Đưa xuống dưới Username */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
            {isOwner && <DashboardButton userRole={profile?.role} />}
            <button 
              onClick={handleToggleFollow} 
              className={`relative px-8 py-3.5 font-black rounded-2xl transition-all duration-300 ease-out flex items-center justify-center gap-2 overflow-hidden group active:scale-95 text-xs uppercase tracking-widest min-w-[160px] ${
                isFollowing 
                ? 'bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/30' 
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)] hover:shadow-[0_15px_25px_-6px_rgba(59,130,246,0.6)]'
              }`}
            >
              {!isFollowing && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12"></div>}
              {isFollowing ? (
                <><span className="group-hover:hidden">Đã quan tâm</span><span className="hidden group-hover:block">Hủy quan tâm</span></>
              ) : (
                <><UserPlus size={18} strokeWidth={2.5} className="group-hover:rotate-12 group-hover:scale-110 transition-transform" /> Quan tâm</>
              )}
            </button>
            <button className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90">
              <MessageCircle size={18} />
            </button>
            <button onClick={handleShare} className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 hover:text-blue-500 transition-all shadow-sm active:scale-90">
              <Share2 size={18} />
            </button>
            <button className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90">
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* CHỈ SỐ BUSINESS */}
          <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white transition-colors">{followersCount.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Người quan<br/>tâm</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white transition-colors">{services?.length || mockServices.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Dịch vụ<br/>Active</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-xl md:text-2xl font-black text-blue-500 transition-colors">{profile?.reputation_points || 92}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Điểm<br/>Uy tín</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto md:mx-0">
            {profile.bio || "Đối tác y tế chính thức của AI Health. Chuyên cung cấp các dịch vụ chăm sóc sức khỏe chủ động chất lượng cao."}
          </p>
        </div>
      </div>

      {/* --- GRID LAYOUT: CHIA TÁCH NỘI DUNG VÀ ĐÁNH GIÁ --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-slate-200 dark:border-white/10 pt-8 px-2 md:px-8">
        
        {/* CỘT TRÁI (CHIẾM 2 PHẦN): TABS & DANH SÁCH */}
        <div className="lg:col-span-2">
          {/* Menu Tabs */}
          <div className="flex justify-start gap-8 sticky top-0 bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-md z-20 overflow-x-auto no-scrollbar pb-2 border-b border-slate-200 dark:border-white/10">
            {[
              { id: "services", label: "Dịch vụ", icon: Package },
              { id: "videos", label: "Video", icon: LayoutGrid },
              { id: "vouchers", label: `Ưu đãi (${partnerVouchers.length})`, icon: Ticket },
              { id: "liked", label: "Đã thích", icon: Heart, private: true },
              { id: "saved", label: "Đã lưu", icon: Bookmark, private: true }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 text-xs font-black transition-all border-b-2 whitespace-nowrap -mb-[9px] ${
                  activeTab === tab.id 
                  ? "border-blue-500 text-blue-500" 
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                }`}
              >
                <tab.icon size={16} strokeWidth={3} />
                <span className="uppercase tracking-widest">{tab.label}</span>
                {tab.private && <Lock size={12} className="ml-1 opacity-30" />}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {/* TAB: DỊCH VỤ */}
            {activeTab === "services" && (
              <div className="animate-fade-in">
                {/* Bộ lọc sắp xếp */}
                <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar pb-2">
                   {["newest", "price_asc", "price_desc"].map((sort) => (
                      <button 
                          key={sort} 
                          onClick={() => setSortOrder(sort)}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                              sortOrder === sort 
                              ? 'bg-blue-500 text-white border-blue-500 shadow-md' 
                              : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                      >
                          {sort === "newest" ? "Mới nhất" : sort === "price_asc" ? "Giá tăng dần" : "Giá giảm dần"}
                      </button>
                   ))}
                </div>

                {/* Danh sách Dịch vụ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {mockServices.map((svc: any) => (
                      <div key={svc.id} onClick={() => setExpandedService(svc)} className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/10 overflow-hidden hover:shadow-2xl hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col cursor-pointer">
                          <div className="relative h-44 overflow-hidden shrink-0 bg-slate-100 dark:bg-black">
                              {/* Ưu tiên hiển thị Video nếu có, không thì hiện ảnh */}
                              {svc.video_url ? (
                                  <video 
                                    src={svc.video_url} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                    autoPlay muted loop playsInline 
                                  />
                              ) : (
                                  <img 
                                    src={svc.image_url || svc.image || "https://picsum.photos/400"} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                    alt={svc.service_name || svc.name}
                                  />
                              )}
                              
                              <div className="absolute top-4 left-4 flex gap-2 z-10">
                                  {(svc.tags || []).map((tag: string) => (
                                      <span key={tag} className="px-2.5 py-1 bg-rose-500 text-white text-[10px] font-black uppercase rounded-lg shadow-md flex items-center gap-1">
                                          {tag === "Hot" && <TrendingUp size={10}/>} {tag}
                                      </span>
                                  ))}
                              </div>
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                  <h3 className="font-black text-lg text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-500 transition-colors">{svc.service_name || svc.name}</h3>
                                  <BadgeCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />
                              </div>
                              <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">{svc.description || svc.desc}</p>
                              <div className="flex items-end justify-between mt-auto border-t border-slate-100 dark:border-white/5 pt-4">
                                  <div>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Giá trọn gói</span>
                                      <span className="text-blue-600 dark:text-blue-400 font-black text-xl">{parseFloat(svc.price).toLocaleString('vi-VN')} đ</span>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); setSelectedService(svc); setIsBookingModalOpen(true); }} className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white">
                                      <CalendarPlus size={18} />
                                  </button>
                              </div>
                          </div>
                      </div>
                   ))}
                </div>
              </div>
            )}

            {/* TAB: VIDEOS / LIKED / SAVED */}
            {/* TAB: VIDEOS / LIKED / SAVED */}
            {(activeTab === "videos" || activeTab === "liked" || activeTab === "saved") && (
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
               {(activeTab === "videos" ? localVideos : activeTab === "liked" ? likedTiktokFeeds : savedTiktokFeeds).map((item: any) => (
                 <div key={item.id} onClick={() => { if(activeTab === 'videos') setExpandedVideo(item); }} className={`relative aspect-[9/16] bg-zinc-900 rounded-[2.2rem] overflow-hidden group shadow-sm border border-white/5 transition-all duration-500 ${activeTab === 'videos' ? 'cursor-pointer hover:shadow-2xl hover:border-blue-500/40 hover:-translate-y-1.5' : ''}`}>
                   <video src={item.video_url || item.image_url} className="w-full h-full object-cover opacity-85 transition-all duration-1000 group-hover:scale-110 group-hover:opacity-100" muted playsInline />
                   
                   {/* Overlay: Hiển thị Tim & Lượt xem trực quan ngay Preview */}
                   <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                       <div className="flex items-center gap-1 px-2 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black text-white shadow-lg">
                           <Heart size={10} className={item.is_liked ? "fill-rose-500 text-rose-500" : "text-white"} />
                           <span>{item.likes_count || 0}</span>
                       </div>
                   </div>

                   {/* Thông tin đáy thẻ: Glassmorphism Design */}
                   <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent p-5 pt-16 pointer-events-none flex flex-col justify-end">
                      <p className="text-white text-[11px] font-black line-clamp-2 leading-snug drop-shadow-xl mb-2 group-hover:text-blue-400 transition-colors">{item.title}</p>
                      
                      {item.price ? (
                          <div className="flex items-center gap-2">
                              <div className="px-2.5 py-1 bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 rounded-lg shadow-inner">
                                  <span className="text-blue-400 text-[10px] font-black tracking-tight">{parseFloat(item.price).toLocaleString('vi-VN')} đ</span>
                              </div>
                              <div className="w-6 h-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0">
                                  <Play size={10} className="fill-white text-white ml-0.5" />
                              </div>
                          </div>
                      ) : (
                          <div className="w-7 h-7 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center">
                              <Play size={12} className="fill-white text-white ml-0.5" />
                          </div>
                      )}
                   </div>

                   {/* Quick Actions (Hover Only) */}
                   <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 z-20">
                      <button onClick={(e) => { e.stopPropagation(); handleInteraction(item.id, 'share'); }} className="p-2.5 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full hover:bg-blue-600 transition-all shadow-xl">
                          <Share2 size={14} strokeWidth={2.5} />
                      </button>
                   </div>
                 </div>
               ))}
               {videoTiktokFeeds.length === 0 && activeTab === "videos" && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                      <LayoutGrid size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
                      <p className="text-slate-500 font-bold">Doanh nghiệp chưa đăng tải video nào.</p>
                  </div>
               )}
             </div>
            )}

            {/* TAB: VOUCHERS (ƯU ĐÃI CƠ SỞ) */}
            {activeTab === "vouchers" && (
                <div className="space-y-4 animate-fade-in">
                    {partnerVouchers.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-[2rem]">
                            <Ticket size={40} className="text-slate-300 mx-auto mb-3 animate-pulse" />
                            <p className="text-sm font-medium text-slate-400 dark:text-zinc-500">Cơ sở hiện chưa phát hành mã ưu đãi nào.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {partnerVouchers.map((v: any) => {
                                const isClaimed = myVouchers.some((mv: any) => mv.voucher_id === v.id);
                                const isExpired = new Date(v.valid_until) < new Date();
                                const isOut = Number(v.used_quantity) >= Number(v.total_quantity);

                                return (
                                    <div key={v.id} className="relative flex bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                        <div className={`w-4 flex flex-col justify-between items-center py-2 ${v.issuer_type === 'ADMIN' ? 'bg-amber-500' : 'bg-[#80BF84]'}`}>
                                            <div className="w-2 h-2 rounded-full bg-slate-50 dark:bg-zinc-950 -ml-4"></div>
                                            <div className="w-2 h-2 rounded-full bg-slate-50 dark:bg-zinc-950 -ml-4"></div>
                                            <div className="w-2 h-2 rounded-full bg-slate-50 dark:bg-zinc-950 -ml-4"></div>
                                        </div>

                                        <div className="flex-1 p-5 flex flex-col justify-between gap-3">
                                            <div>
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${v.issuer_type === 'ADMIN' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                                                        {v.issuer_type === 'ADMIN' ? 'Toàn sàn' : 'Độc quyền cơ sở'}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                                                        <Clock size={12} /> HSD: {new Date(v.valid_until).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>

                                                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                                    Giảm {v.discount_type === 'PERCENTAGE' ? `${Number(v.discount_value)}%` : `${Number(v.discount_value).toLocaleString()}đ`}
                                                </h4>
                                                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1">
                                                    Đơn tối thiểu: {Number(v.min_order_value).toLocaleString()}đ
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-dashed border-slate-100 dark:border-zinc-800 pt-3 mt-1">
                                                <button 
                                                    onClick={() => setSelectedVoucher(v)}
                                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                                >
                                                    Xem chi tiết &rarr;
                                                </button>

                                                <button
                                                    disabled={isClaimed || isExpired || isOut}
                                                    onClick={async () => {
                                                        const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
                                                        if (!token) return toast.info("Vui lòng đăng nhập để lưu ưu đãi!");
                                                        try {
                                                            await claimVoucher(v.code, token);
                                                        } catch (err: any) { }
                                                    }}
                                                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
                                                        isClaimed 
                                                            ? 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed flex items-center gap-1'
                                                            : isExpired || isOut
                                                            ? 'bg-rose-50 text-rose-400 dark:bg-rose-500/10 dark:text-rose-500/30 cursor-not-allowed'
                                                            : v.issuer_type === 'ADMIN'
                                                            ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400 shadow-sm shadow-amber-500/20'
                                                            : 'bg-[#80BF84] text-zinc-900 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20'
                                                    }`}
                                                >
                                                    {isClaimed ? (
                                                        <>
                                                            <CheckCircle2 size={12} /> Đã lưu
                                                        </>
                                                    ) : isExpired ? 'Hết hạn' : isOut ? 'Hết lượt' : 'Lưu mã'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (CHIẾM 1 PHẦN): UY TÍN & ĐÁNH GIÁ (Sticky) */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 self-start">
            
            {/* THẺ ĐIỂM UY TÍN */}
            <div className="bg-[#f0f9f1] dark:bg-blue-500/10 rounded-[2rem] p-6 border border-blue-200 dark:border-blue-500/20 relative overflow-hidden shadow-sm">
                <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10">
                    <ShieldCheck size={120} className="text-blue-500" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-sm mb-4 justify-center md:justify-start uppercase tracking-widest">
                        <ShieldCheck size={18} strokeWidth={3} /> ĐIỂM UY TÍN
                    </div>
                    <div className="flex items-baseline gap-1 mb-2 justify-center md:justify-start">
                        <span className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.reputation || profile?.reputation_points || "92"}</span>
                        <span className="text-2xl font-bold text-slate-400 dark:text-slate-500">/100</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium text-center md:text-left mt-2">
                        Hoạt động tốt và phản hồi tích cực giúp tăng điểm.
                    </p>
                </div>
            </div>

            {/* THẺ ĐÁNH GIÁ TỔNG QUAN */}
            <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-[2rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-2 text-amber-500 font-black text-sm mb-6">
                    <Star size={18} strokeWidth={3} /> ĐÁNH GIÁ
                </div>
                
                <div className="flex items-center gap-4 mb-8">
                    <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">4.8</span>
                    <div>
                        <div className="flex text-amber-400 mb-1.5">
                            {[...Array(5)].map((_, i) => <Star key={i} size={18} className="fill-amber-400" />)}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">Dựa trên 124 lượt đánh giá</p>
                    </div>
                </div>

                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Phản hồi gần đây</h4>
                <div className="space-y-3">
                    {mockReviews.slice(0,3).map((rev: any) => (
                        <div key={rev.id} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white">{rev.user.full_name}</h5>
                                <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < rev.rating ? "fill-amber-400" : "fill-transparent text-slate-300"} />)}
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-zinc-400 italic leading-relaxed">"{rev.comment}"</p>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-5 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-black text-slate-600 dark:text-zinc-300 transition-colors uppercase tracking-widest">
                    Xem tất cả đánh giá
                </button>
            </div>

            </div>
      </div>

      {/* ================= MODAL: XEM TRƯỚC DỊCH VỤ (EXPANDED VIEW PUBLIC) ================= */}
      {expandedService && (
        <div className="fixed inset-0 z-[140] flex justify-center items-center p-4 md:p-6">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl transition-opacity duration-500 animate-fade-in" onClick={() => setExpandedService(null)}></div>
          
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-slate-200 dark:border-white/10 animate-slide-up max-h-[90vh]">
            
            <div className="w-full md:w-1/2 h-64 md:h-auto bg-slate-100 dark:bg-black relative flex items-center justify-center shrink-0">
                {expandedService.image_url || expandedService.image ? (
                    <img src={expandedService.image_url || expandedService.image} className="w-full h-full object-cover" alt={expandedService.service_name || expandedService.name} />
                ) : expandedService.video_url ? (
                    <video src={expandedService.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                    <Package size={60} className="text-slate-300 dark:text-zinc-800"/>
                )}
                <button onClick={() => setExpandedService(null)} className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-md text-white"><X size={20}/></button>
            </div>

            <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto no-scrollbar relative">
                <button onClick={() => setExpandedService(null)} className="hidden md:flex absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition-colors"><X size={20}/></button>
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#80BF84]/10 border border-[#80BF84]/20 rounded-full text-[10px] font-bold text-[#80BF84] mb-4 uppercase tracking-wider w-max">
                  <Sparkles size={12} /> Thông tin dịch vụ
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-4">{expandedService.service_name || expandedService.name}</h2>
                <div className="flex flex-wrap gap-2 mb-6">{(expandedService.tags || []).map((tag: string, i: number) => <span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">#{tag}</span>)}</div>
                
                <div className="flex-1">
                    <p className="text-sm md:text-base text-slate-600 dark:text-zinc-400 leading-relaxed mb-8 whitespace-pre-wrap">{expandedService.description || expandedService.desc}</p>
                </div>
                
                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giá trọn gói</p>
                        <p className="text-3xl font-black text-[#80BF84]">{Number(expandedService.price).toLocaleString()} <span className="text-base text-slate-500">đ</span></p>
                    </div>
                    {/* Nút Đặt lịch ngay cho Public View */}
                    <button 
                        onClick={() => {
                            setSelectedService(expandedService);
                            setExpandedService(null);
                            setIsBookingModalOpen(true);
                        }} 
                        className="w-full sm:w-auto px-8 py-4 bg-[#80BF84] hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl shadow-xl hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                        <CalendarPlus size={18}/> Đặt lịch ngay
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: XEM VIDEO STUDIO PUBLIC (CHUẨN TIKTOK 9:16 + CENTERED) ================= */}
      {expandedVideo && (
        <div className="fixed inset-0 z-[140] flex justify-center items-center overflow-hidden transition-all duration-500">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl animate-fade-in" 
               onClick={() => { 
                   setExpandedVideo(null); 
                   setIsCommentModalOpen(false);
                   setActiveCommentVideoId(null);
               }}>
               <video src={expandedVideo.video_url} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[100px] scale-110" muted playsInline autoPlay loop />
          </div>
          
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none p-4 md:p-10">
            <div className="relative h-full max-h-[92vh] aspect-[9/16] bg-black rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 animate-slide-up pointer-events-auto">
                
                <video src={expandedVideo.video_url} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none"></div>
                
                <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
                    <button onClick={() => { 
                                setExpandedVideo(null); 
                                setIsCommentModalOpen(false); 
                                setActiveCommentVideoId(null);
                            }} 
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-rose-500/30 hover:text-rose-400 transition-all active:scale-90 flex items-center justify-center shadow-lg">
                        <X size={20} strokeWidth={3}/>
                    </button>
                </div>

                {/* Nút Đặt lịch từ Video (Top-Right) */}
                {expandedVideo.price && (
                    <button onClick={() => { 
                                setSelectedService(expandedVideo);
                                setExpandedVideo(null); 
                                setIsCommentModalOpen(false);
                                setIsBookingModalOpen(true); 
                            }} 
                            className="absolute top-6 right-6 z-30 group flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#80BF84]/90 backdrop-blur-xl border border-[#80BF84] text-zinc-950 hover:bg-[#80BF84] hover:scale-105 transition-all shadow-[0_0_20px_rgba(128,191,132,0.4)] active:scale-95">
                        <CalendarPlus size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Đặt lịch</span>
                    </button>
                )}

                <div className="absolute bottom-[40px] left-6 z-20 max-w-[70%] pointer-events-auto animate-slide-up">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[9px] font-black text-white mb-4 uppercase tracking-widest">
                      <ShieldCheck size={10} /> {profile?.full_name || "Dịch vụ xác thực"}
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-2xl mb-1">{expandedVideo.title}</h3>
                    <p className="text-zinc-200 text-xs line-clamp-2 drop-shadow-md font-medium mb-5 pr-4 opacity-90">{expandedVideo.content}</p>
                    
                    {expandedVideo.price && (
                      <div className="flex items-center gap-3 pl-1.5 pr-6 py-2 bg-black/40 backdrop-blur-xl border border-white/10 text-white rounded-full w-max shadow-2xl">
                        <div className="w-8 h-8 bg-[#80BF84] rounded-full flex items-center justify-center text-zinc-950 shadow-inner"><DollarSign size={16} strokeWidth={3} /></div>
                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Giá tham khảo</span><span className="font-black text-sm leading-none text-[#80BF84]">{parseFloat(expandedVideo.price).toLocaleString()} đ</span></div>
                      </div>
                    )}
                </div>

                <div className="absolute bottom-[40px] right-3 z-20 flex flex-col items-center gap-6 pointer-events-auto">
                    <div className="relative mb-2">
                      <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800 shadow-xl">
                         <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=3b82f6&color=fff`} className="w-full h-full object-cover"/>
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

      {/* ================= DRAWER BÌNH LUẬN AN TOÀN (Z-INDEX 200) ================= */}
      {isCommentModalOpen && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            <div className="pointer-events-auto h-full w-full">
                <CommentModal 
                  isOpen={isCommentModalOpen} 
                  onClose={() => setIsCommentModalOpen(false)} 
                  videoId={activeCommentVideoId || ""} 
                  videoAuthorId={profile?.id || ""} 
                  user={null} // Auth do hệ thống tự check bên trong component
                  userRole={"USER"} 
                  onCommentAdded={handleCommentSuccess} 
                  onCommentDeleted={handleCommentDeleted} 
                />
            </div>
        </div>
      )}

      {/* ================= MODAL ĐẶT LỊCH CỐT LÕI (DÙNG CHUNG) ================= */}
      {selectedService && profile && (
        <BookingModal 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)}
          partnerId={profile.id}
          serviceId={selectedService.id}
          serviceName={selectedService.service_name || selectedService.name || selectedService.title}
          price={selectedService.price || 0}
        />
      )}
    </div>
  );
}