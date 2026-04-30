"use client";

import { useState } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, LayoutGrid, Sparkles, Clock, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

export default function CreatorView({ profile, videos = [], posts = [], likedPosts = [], savedPosts = [] }: any) {
  const [activeTab, setActiveTab] = useState("videos");

  const handleShare = () => {
      const profileUrl = window.location.href;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Đã sao chép liên kết kênh!");
  };

  return (
    <div className="animate-slide-up pb-20">
      
      {/* --- COVER IMAGE --- */}
      <div className="relative w-full h-48 md:h-64 bg-slate-200 dark:bg-zinc-900 rounded-[2rem] md:rounded-[3rem] overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-white/5">
          {profile?.cover_url ? (
              <img src={profile.cover_url} className="w-full h-full object-cover" alt="cover" />
          ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-rose-900/40 to-pink-900/40 flex items-center justify-center">
                 <Sparkles className="text-rose-500/30 w-20 h-20" />
              </div>
          )}
      </div>

      {/* --- STACK PHÍA TRÊN: THÔNG TIN CREATOR --- */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mb-12 px-2 md:px-8">
        
        {/* Avatar đè lên Cover (Hiệu ứng Glow Rose) */}
        <div className="relative group shrink-0 -mt-20 md:-mt-24 z-10">
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-rose-400 to-pink-600 rounded-full blur-md opacity-40 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-zinc-950 shadow-2xl bg-white p-1.5">
            <img 
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=f43f5e&color=fff`} 
              className="w-full h-full object-cover rounded-full" 
              alt="avatar"
            />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-rose-600 to-pink-500 text-white text-[10px] font-black rounded-full shadow-xl flex items-center gap-1.5 border border-white/20 whitespace-nowrap uppercase tracking-widest">
            <Sparkles size={12} className="fill-white/20" /> CREATOR
          </div>
        </div>

        {/* Thông tin Text & Các nút (Xếp dọc chuẩn Admin Master Layout) */}
        <div className="flex-1 w-full pt-2 text-center md:text-left">
          
          {/* Tên & Username */}
          <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center justify-center md:justify-start gap-3 mb-1 drop-shadow-md">
                  {profile?.full_name || "Nhà Sáng Tạo"} <CheckCircle size={24} className="text-rose-500 fill-rose-500/20" />
              </h1>
              <h2 className="text-base font-medium text-slate-500 dark:text-zinc-400 tracking-tight">
                  @{profile?.username || "creator"}
              </h2>
          </div>
          
          {/* Nút Action Đưa xuống dưới Username */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
              <button className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95 text-xs uppercase tracking-widest shadow-lg">
                  <UserPlus size={18} strokeWidth={2.5} /> Quan tâm
              </button>
              <button className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90">
                  <MessageCircle size={18} />
              </button>
              <button onClick={handleShare} className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 hover:text-rose-500 transition-all shadow-sm active:scale-90">
                  <Share2 size={18} />
              </button>
              <button className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90">
                  <MoreHorizontal size={18} />
              </button>
          </div>

          {/* CHỈ SỐ CREATOR */}
          <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
              <div className="flex items-center gap-2 group cursor-pointer">
                  <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{(profile?.following_count || 0).toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Đang quan<br/>tâm</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
              <div className="flex items-center gap-2 group cursor-pointer">
                  <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{(profile?.followers_count || 0).toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Người quan<br/>tâm</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
              <div className="flex items-center gap-2 group cursor-pointer">
                  <span className="text-xl md:text-2xl font-black text-rose-500">{(profile?.total_likes || 0).toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Lượt<br/>thích</span>
              </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto md:mx-0">
            {profile?.bio || "Nhà sáng tạo nội dung của hệ sinh thái AI Health. Chia sẻ kiến thức và hành trình sống khỏe mỗi ngày. 🌱"}
          </p>
        </div>
      </div>

      {/* --- STACK PHÍA DƯỚI: TABS --- */}
      <div className="border-t border-slate-200 dark:border-white/10 pt-4 px-2 md:px-8">
        <div className="flex justify-center md:justify-start gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: "videos", label: "Video", icon: LayoutGrid },
            { id: "posts", label: "Bài đăng", icon: MessageCircle },
            { id: "saved", label: "Đã lưu", icon: Bookmark, private: true },
            { id: "liked", label: "Đã thích", icon: Heart, private: true },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-xs font-black transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                ? "border-rose-500 text-rose-500" 
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <tab.icon size={16} strokeWidth={3} />
              <span className="uppercase tracking-widest">{tab.label}</span>
              {tab.private && <Lock size={12} className="ml-1 opacity-30" />}
            </button>
          ))}
        </div>

        {/* TAB NỘI DUNG: VIDEOS / LƯU TRỮ */}
        {(activeTab === "videos" || activeTab === "saved" || activeTab === "liked") && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
            {(activeTab === "videos" ? videos : activeTab === "liked" ? likedPosts : savedPosts).map((item: any) => (
              <div key={item.id} className="relative aspect-[9/16] bg-zinc-800 rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg border border-slate-200 dark:border-white/10">
                <img src={item.image_url || `https://picsum.photos/seed/${item.id}/400/600`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100" alt="post" />
                
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 pt-12">
                  <div className="flex justify-between items-end">
                      <h3 className="text-white text-xs font-bold line-clamp-2 leading-tight drop-shadow-md">
                          {item.title || "Video Sáng Tạo"}
                      </h3>
                      <div className="flex items-center gap-1 text-rose-400 text-[10px] font-black shrink-0 ml-2">
                          <Heart size={12} className="fill-current" /> <span>{item.likes_count || 0}</span>
                      </div>
                  </div>
                </div>
              </div>
            ))}

            {(activeTab === "videos" ? videos : activeTab === "liked" ? likedPosts : savedPosts).length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                  <LayoutGrid size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
                  <p className="text-slate-500 font-bold">Chưa có video nào để hiển thị.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB NỘI DUNG: BÀI ĐĂNG CỘNG ĐỒNG */}
        {activeTab === "posts" && (
            <div className="max-w-2xl mx-auto space-y-6 mt-8 pb-20">
                {posts.map((post: any) => (
                    <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=f43f5e&color=fff`} className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10" />
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                    {profile?.full_name} <Sparkles size={12} className="text-rose-500"/>
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {new Date(post.created_at).toLocaleDateString('vi-VN')}
                                </p>
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

                {posts.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                        <MessageCircle size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
                        <p className="text-slate-500 font-bold">Chưa có bài viết nào trên cộng đồng.</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}