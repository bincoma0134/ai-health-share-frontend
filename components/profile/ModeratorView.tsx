"use client";

import { useState } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, Sparkles, Shield, ShieldCheck, LayoutGrid
} from "lucide-react";
import { toast } from "sonner";

export default function ModeratorView({ profile, likedPosts = [], savedPosts = [] }: any) {
  const [activeTab, setActiveTab] = useState("liked");

  const handleShare = () => {
      const profileUrl = window.location.href;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Đã sao chép liên kết Moderator!");
  };

  return (
    <div className="animate-slide-up pb-20">
      
      {/* --- COVER IMAGE --- */}
      <div className="relative w-full h-48 md:h-64 bg-slate-200 dark:bg-zinc-900 rounded-[2rem] md:rounded-[3rem] overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-white/5">
          {profile?.cover_url ? (
              <img src={profile.cover_url} className="w-full h-full object-cover" alt="cover" />
          ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40 flex items-center justify-center">
                 <Shield className="text-violet-500/30 w-20 h-20" />
              </div>
          )}
      </div>

      {/* --- STACK PHÍA TRÊN: THÔNG TIN MODERATOR --- */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mb-12 px-2 md:px-8">
        
        {/* Avatar đè lên Cover (Hiệu ứng Glow Violet) */}
        <div className="relative group shrink-0 -mt-20 md:-mt-24 z-10">
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-zinc-950 shadow-2xl bg-white p-1.5">
            <img 
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=8b5cf6&color=fff`} 
              className="w-full h-full object-cover rounded-full transition-transform duration-700 group-hover:scale-110" 
              alt="avatar"
            />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-[10px] font-black rounded-full shadow-xl flex items-center gap-1.5 border border-white/20 whitespace-nowrap uppercase tracking-widest">
            <Shield size={12} fill="currentColor" className="text-violet-200" /> MODERATOR
          </div>
        </div>

        {/* Thông tin Text & Các nút (Xếp dọc chuẩn Admin Master Layout) */}
        <div className="flex-1 w-full pt-2 text-center md:text-left">
          
          {/* Tên & Username */}
          <div className="mb-4">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-md flex items-center justify-center md:justify-start gap-2 mb-1">
              {profile?.full_name || "Kiểm Duyệt Viên"}
              <ShieldCheck size={24} className="text-violet-500" />
            </h1>
            <h2 className="text-base font-medium text-slate-500 dark:text-zinc-400 tracking-tight">
              @{profile?.username || "moderator_account"}
            </h2>
          </div>

          {/* Nút Action Đưa xuống dưới Username */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
            <button className="px-8 py-3.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-black rounded-2xl hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center gap-2 active:scale-95 text-xs uppercase tracking-widest shadow-lg">
              <UserPlus size={18} strokeWidth={2.5} /> Quan tâm
            </button>
            <button className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90">
              <MessageCircle size={18} />
            </button>
            <button onClick={handleShare} className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 hover:text-violet-500 transition-all shadow-sm active:scale-90">
              <Share2 size={18} />
            </button>
            <button className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90">
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* CHỈ SỐ MODERATOR */}
          <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white transition-colors">{profile?.following_count || "0"}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Đang quan<br/>tâm</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white transition-colors">{profile?.followers_count || "0"}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Người quan<br/>tâm</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-xl md:text-2xl font-black text-violet-500 transition-colors">Tích cực</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Đã kiểm<br/>duyệt</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto md:mx-0">
            {profile?.bio || "Thành viên Ban quản trị nội dung. Đóng góp duy trì một môi trường nền tảng an toàn, minh bạch. 🛡️"}
          </p>
        </div>
      </div>

      {/* --- STACK PHÍA DƯỚI: TABS --- */}
      <div className="border-t border-slate-200 dark:border-white/10 pt-4 px-2 md:px-8">
        <div className="flex justify-center md:justify-start gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: "liked", label: "Đã thích", icon: Heart },
            { id: "saved", label: "Đã lưu", icon: Bookmark, private: true }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-xs font-black transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                ? "border-violet-500 text-violet-500" 
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <tab.icon size={16} strokeWidth={3} />
              <span className="uppercase tracking-widest">{tab.label}</span>
              {tab.private && <Lock size={12} className="ml-1 opacity-30" />}
            </button>
          ))}
        </div>

        {/* Lưới Video (Đã lưu / Đã thích) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
          {(activeTab === "liked" ? likedPosts : savedPosts).map((item: any) => (
            <div key={item.id} className="relative aspect-[9/16] bg-zinc-800 rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg border border-slate-200 dark:border-white/10">
              <img src={item.image_url || `https://picsum.photos/seed/${item.id}/400/600`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100" alt="post" />
              
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 pt-12 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex justify-between items-end">
                    <h3 className="text-white text-xs font-bold line-clamp-2 leading-tight drop-shadow-md">{item.title || "Video"}</h3>
                    <div className="flex items-center gap-1 text-violet-400 text-[10px] font-black shrink-0 ml-2">
                        <Play size={12} className="fill-current" /> <span>{item.likes_count || 0}</span>
                    </div>
                </div>
              </div>
              
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-violet-500 transition-colors"><Share2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State cho Video */}
        {(activeTab === "liked" ? likedPosts : savedPosts).length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] mt-8">
            <LayoutGrid size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
            <p className="text-slate-500 font-bold">Chưa có nội dung {activeTab === "liked" ? "đã thích" : "đã lưu"}.</p>
          </div>
        )}
      </div>
    </div>
  );
}