"use client";

import { useState } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, LayoutGrid, ShieldCheck, 
  Star, Package, BadgeCheck, TrendingUp, Building2, X
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

// Khởi tạo Supabase & API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function PartnerView({ profile, posts = [], likedPosts = [], savedPosts = [], services = [], reviews = [], stats = {} }: any) {
  const [activeTab, setActiveTab] = useState("services");
  const [sortOrder, setSortOrder] = useState("newest");

  // --- STATE CỬA SỔ ĐẶT LỊCH (BOOKING MODAL) ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LOGIC GỬI YÊU CẦU ĐẶT LỊCH CHUẨN CORE FLOW ---
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !profile?.id) return;
    if (!bookingName.trim() || !bookingPhone.trim()) {
        toast.error("Vui lòng nhập đầy đủ Họ tên và Số điện thoại!");
        return;
    }

    setIsSubmitting(true);
    const tid = toast.loading("Đang gửi yêu cầu đến cơ sở...");
    
    try {
        if (!supabase) throw new Error("Lỗi cấu hình hệ thống!");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Vui lòng đăng nhập để đặt lịch!");

        const res = await fetch(`${API_URL}/appointments/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
            body: JSON.stringify({ 
                partner_id: profile.id, // Lấy ID của chủ Profile làm Partner ID
                service_id: selectedService.id, 
                total_amount: selectedService.price || 0,
                customer_name: bookingName.trim(),
                customer_phone: bookingPhone.trim(),
                note: bookingNote.trim()
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Lỗi gửi yêu cầu");
        
        toast.success(data.message || "Yêu cầu đã gửi! Theo dõi tại tab Lịch hẹn.", { id: tid, duration: 5000 });
        setIsBookingModalOpen(false);
        setBookingName(""); setBookingPhone(""); setBookingNote("");
    } catch (error: any) { 
        toast.error(error.message, { id: tid }); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

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
            <button className="px-8 py-3.5 bg-blue-600 dark:bg-blue-500 text-white font-black rounded-2xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center gap-2 active:scale-95 text-xs uppercase tracking-widest shadow-lg">
              <UserPlus size={18} strokeWidth={2.5} /> Quan tâm
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
              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white transition-colors">{profile?.followers_count || 0}</span>
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
                      <div key={svc.id} className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/10 overflow-hidden hover:shadow-xl hover:border-blue-500/50 transition-all group flex flex-col">
                          <div className="relative h-40 overflow-hidden shrink-0">
                              <img src={svc.image_url || svc.image || "https://picsum.photos/400"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute top-3 left-3 flex gap-2">
                                  {(svc.tags || []).map((tag: string) => (
                                      <span key={tag} className="px-2.5 py-1 bg-rose-500 text-white text-[10px] font-black uppercase rounded-lg shadow-md flex items-center gap-1">
                                          {tag === "Hot" && <TrendingUp size={10}/>} {tag}
                                      </span>
                                  ))}
                              </div>
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                  <h3 className="font-black text-slate-900 dark:text-white line-clamp-2">{svc.service_name || svc.name}</h3>
                                  <BadgeCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />
                              </div>
                              <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">{svc.description || svc.desc}</p>
                              <div className="flex items-end justify-between mt-auto">
                                  <div className="text-blue-600 dark:text-blue-400 font-black text-lg">
                                      {parseFloat(svc.price).toLocaleString('vi-VN')}đ
                                  </div>
                                  <button onClick={() => { setSelectedService(svc); setIsBookingModalOpen(true); }} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-black rounded-xl hover:scale-105 transition-transform shadow-lg">
                                      Đặt ngay
                                  </button>
                              </div>
                          </div>
                      </div>
                   ))}
                </div>
              </div>
            )}

            {/* TAB: VIDEOS / LIKED / SAVED */}
            {(activeTab === "videos" || activeTab === "liked" || activeTab === "saved") && (
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
               {(activeTab === "videos" ? posts : activeTab === "liked" ? likedPosts : savedPosts).map((item: any) => (
                 <div key={item.id} className="relative aspect-[9/16] bg-zinc-800 rounded-[2rem] overflow-hidden group cursor-pointer shadow-2xl border border-white/5">
                   <video src={item.video_url || item.image_url} className="w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover:scale-110 group-hover:opacity-100" muted playsInline />
                   <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-transparent flex flex-col justify-end p-4 pt-12 opacity-0 group-hover:opacity-100 transition-all duration-300">
                     <div className="flex justify-between items-end">
                        <h3 className="text-white text-xs font-bold line-clamp-2 leading-tight drop-shadow-md">{item.title}</h3>
                        <div className="flex items-center gap-1.5 text-white text-xs font-black shrink-0"><Play size={16} className="fill-white" /> <span>{item.likes_count || 0}</span></div>
                     </div>
                   </div>
                   <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-blue-500 transition-colors"><Share2 size={14} /></button>
                   </div>
                 </div>
               ))}
               {posts.length === 0 && activeTab === "videos" && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                      <LayoutGrid size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
                      <p className="text-slate-500 font-bold">Doanh nghiệp chưa đăng tải video nào.</p>
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
                        <span className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter">{stats.reputation || "92"}</span>
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

      {/* ================= MODAL: CỬA SỔ ĐẶT LỊCH (CORE FLOW) ================= */}
      {isBookingModalOpen && selectedService && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsBookingModalOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck size={20} className="text-[#80BF84]"/> Gửi yêu cầu dịch vụ
                    </h3>
                    <button onClick={() => setIsBookingModalOpen(false)} className="p-2 bg-slate-200/50 dark:bg-white/5 rounded-full text-slate-500 hover:text-rose-500 transition-colors"><X size={16}/></button>
                </div>
                
                <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                    {/* Thông tin dịch vụ */}
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 mb-2">
                        <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{selectedService.service_name || selectedService.name}</h4>
                        <p className="text-[#80BF84] font-black mt-1">{parseFloat(selectedService.price).toLocaleString('vi-VN')} VND</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Họ và tên</label>
                            <input type="text" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84]" placeholder="Nhập tên..." value={bookingName} onChange={e => setBookingName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Số điện thoại</label>
                            <input type="text" className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84]" placeholder="Nhập SĐT..." value={bookingPhone} onChange={e => setBookingPhone(e.target.value)} required />
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Lời nhắn cho cơ sở (Tùy chọn)</label>
                        <textarea rows={2} className="w-full bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] resize-none" placeholder="Ví dụ: Mình muốn tư vấn thêm về da..." value={bookingNote} onChange={e => setBookingNote(e.target.value)} />
                    </div>

                    {/* Hộp thông báo tiền xử lý Escrow */}
                    <div className="p-4 mt-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                        <ShieldCheck size={20} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-300 font-medium">
                            Bạn <strong>chưa cần thanh toán lúc này</strong>. Tổng tiền <strong className="text-blue-600 dark:text-blue-400">{parseFloat(selectedService.price).toLocaleString()} VND</strong> sẽ được yêu cầu thanh toán bảo chứng <strong>sau khi cơ sở phản hồi & ấn định lịch trống</strong>.
                        </p>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-4 bg-gradient-to-tr from-slate-800 to-slate-900 dark:from-white dark:to-slate-200 text-white dark:text-zinc-950 font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest flex justify-center items-center gap-2">
                        {isSubmitting && <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"/>} 
                        {isSubmitting ? "ĐANG GỬI..." : "GỬI YÊU CẦU ĐẶT LỊCH"}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}