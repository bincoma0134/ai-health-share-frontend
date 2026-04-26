"use client";

import { useState } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, LayoutGrid, ShieldCheck, 
  Star, Package, BadgeCheck, TrendingUp
} from "lucide-react";
import { toast } from "sonner";

export default function PartnerView({ profile, posts = [], likedPosts = [], savedPosts = [], services = [], reviews = [], stats = {} }: any) {
  const [activeTab, setActiveTab] = useState("services");
  const [sortOrder, setSortOrder] = useState("newest");

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
    <div className="animate-slide-up">
      {/* --- STACK PHÍA TRÊN: THÔNG TIN DOANH NGHIỆP --- */}
      <div className="flex flex-col md:flex-row items-start gap-10 mb-10">
        <div className="relative group shrink-0">
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-500 to-[#80BF84] rounded-full blur-md opacity-30"></div>
          <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl backdrop-blur-md bg-white">
            <img 
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=80BF84&color=fff`} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt="avatar"
            />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black rounded-full shadow-lg flex items-center gap-1 border border-white/20 whitespace-nowrap">
            <ShieldCheck size={12} fill="currentColor" className="text-blue-200" /> BUSINESS
          </div>
        </div>

        <div className="flex-1 pt-2">
          {/* Tên & Username */}
          <div className="flex flex-col gap-1 mb-6 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-md flex items-center justify-center md:justify-start gap-2">
              {profile.full_name || "Tên Doanh Nghiệp"}
              <BadgeCheck size={24} className="text-blue-500" />
            </h1>
            <h2 className="text-base md:text-lg font-medium text-slate-500 dark:text-zinc-400 tracking-tight">
              @{profile.username || "business_account"}
            </h2>
          </div>

          {/* Buttons Group */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-8">
            <button className="px-10 py-3.5 bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-black rounded-2xl hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all active:scale-95 flex items-center gap-2 shadow-lg">
              <UserPlus size={20} strokeWidth={3} /> <span>Quan tâm</span>
            </button>

            <button className="px-8 py-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/50 dark:border-white/10 text-slate-900 dark:text-white font-black rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-all flex items-center gap-2 shadow-xl active:scale-95">
              <MessageCircle size={20} strokeWidth={3} /> <span>Tư vấn ngay</span>
            </button>

            <div className="flex gap-2">
              <button onClick={handleShare} className="p-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/50 dark:border-white/10 text-slate-500 hover:text-blue-500 rounded-xl transition-all shadow-xl active:scale-90">
                <Share2 size={20} />
              </button>
              <button className="p-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/50 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all shadow-xl active:scale-90">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          {/* Quick Stats (Lượt theo dõi / Thích) */}
          <div className="flex justify-center md:justify-start gap-10 mb-6 px-2">
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">2.5K</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang theo dõi</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 border-x border-slate-200 dark:border-white/10 px-10">
              <span className="text-2xl font-black text-slate-900 dark:text-white">125K</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người theo dõi</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">850K</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lượt Thích</span>
            </div>
          </div>

          <p className="text-center md:text-left text-base text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl px-2">
            {profile.bio || "Đối tác y tế chính thức của AI Health. Chuyên cung cấp các dịch vụ chăm sóc sức khỏe chủ động chất lượng cao."}
          </p>
        </div>
      </div>

      {/* --- GRID LAYOUT: CHIA TÁCH NỘI DUNG VÀ ĐÁNH GIÁ --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-slate-200 dark:border-white/10 pt-8">
        
        {/* CỘT TRÁI (CHIẾM 2 PHẦN): TABS & DANH SÁCH */}
        <div className="lg:col-span-2">
          {/* Menu Tabs */}
          <div className="flex justify-start gap-8 sticky top-0 bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-md z-20 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: "services", label: "Dịch vụ", icon: Package },
              { id: "videos", label: "Video", icon: LayoutGrid },
              { id: "liked", label: "Đã thích", icon: Heart, private: true },
              { id: "saved", label: "Đã lưu", icon: Bookmark, private: true }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 text-xs font-black transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id 
                  ? "border-blue-500 text-blue-500" 
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                }`}
              >
                <tab.icon size={18} strokeWidth={3} />
                <span className="uppercase tracking-widest">{tab.label}</span>
                {tab.private && <Lock size={12} className="ml-1 opacity-30" />}
              </button>
            ))}
          </div>

          <div className="mt-6 pb-20">
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
                              <img src={svc.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute top-3 left-3 flex gap-2">
                                  {svc.tags.map((tag: string) => (
                                      <span key={tag} className="px-2.5 py-1 bg-rose-500 text-white text-[10px] font-black uppercase rounded-lg shadow-md flex items-center gap-1">
                                          {tag === "Hot" && <TrendingUp size={10}/>} {tag}
                                      </span>
                                  ))}
                              </div>
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                  <h3 className="font-black text-slate-900 dark:text-white line-clamp-2">{svc.name}</h3>
                                  {svc.verified && <BadgeCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />}
                              </div>
                              <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">{svc.desc}</p>
                              <div className="flex items-end justify-between mt-auto">
                                  <div className="text-blue-600 dark:text-blue-400 font-black text-lg">
                                      {svc.price.toLocaleString('vi-VN')}đ
                                  </div>
                                  <button className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-black rounded-xl hover:scale-105 transition-transform shadow-lg">
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
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4 animate-fade-in">
               {(activeTab === "videos" ? posts : activeTab === "liked" ? likedPosts : savedPosts).map((item: any) => (
                 <div key={item.id} className="relative aspect-[3/4] bg-zinc-800 rounded-[2rem] overflow-hidden group cursor-pointer shadow-2xl border border-white/5">
                   <img src={item.image_url || `https://picsum.photos/seed/${item.id}/400/600`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="post" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                     <div className="flex justify-end"><Share2 size={16} className="text-white/60 hover:text-white" /></div>
                     <div className="flex items-center gap-1.5 text-white text-xs font-black"><Play size={16} className="fill-white" /> <span>{item.likes_count || 0}</span></div>
                   </div>
                 </div>
               ))}
               {posts.length === 0 && activeTab === "videos" && <p className="col-span-full text-center text-slate-400 py-10 font-bold">Chưa có video nào.</p>}
             </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (CHIẾM 1 PHẦN): UY TÍN & ĐÁNH GIÁ (Sticky) */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 self-start">
            
            {/* THẺ ĐIỂM UY TÍN */}
            <div className="bg-[#f0f9f1] dark:bg-[#80BF84]/10 rounded-[2rem] p-6 border border-[#80BF84]/20 relative overflow-hidden shadow-sm">
                <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10">
                    <ShieldCheck size={120} className="text-[#80BF84]" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-[#649e67] dark:text-[#80BF84] font-black text-sm mb-4 justify-center md:justify-start">
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
    </div>
  );
}