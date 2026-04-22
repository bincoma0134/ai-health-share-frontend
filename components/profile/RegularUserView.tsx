"use client";

import { useState } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, LayoutGrid 
} from "lucide-react";
import { toast } from "sonner";

export default function RegularUserView({ profile, posts = [], likedPosts = [], savedPosts = [] }: any) {
  const [activeTab, setActiveTab] = useState("videos");

  const handleShare = () => {
    const profileUrl = window.location.href;
    navigator.clipboard.writeText(profileUrl);
    toast.success("Đã sao chép liên kết trang cá nhân!");
  };

  return (
    <div className="animate-slide-up">
      {/* --- STACK PHÍA TRÊN: THÔNG TIN CÁ NHÂN --- */}
      <div className="flex flex-col md:flex-row items-start gap-8 mb-10">
        {/* Avatar */}
        <div className="relative group">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl transition-transform group-hover:scale-105">
            <img 
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=80BF84&color=fff`} 
              className="w-full h-full object-cover" 
              alt="avatar"
            />
          </div>
        </div>

        {/* Info & Buttons */}
        <div className="flex-1">
          <div className="flex flex-col gap-1 mb-4">
            <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {profile.username || "username"}
                </h1>
            </div>
            <h2 className="text-lg font-bold text-slate-600 dark:text-zinc-400">
              {profile.full_name}
            </h2>
          </div>

          {/* Buttons: Message, Kết bạn, Share */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button className="px-8 py-2.5 bg-[#80BF84] text-zinc-950 font-black rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-[#80BF84]/20">
              Kết bạn
            </button>
            <button className="px-6 py-2.5 bg-white/70 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center gap-2">
              <MessageCircle size={18} /> Nhắn tin
            </button>
            <button onClick={handleShare} className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-[#80BF84] transition-colors">
              <Share2 size={20} />
            </button>
            <button className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* Counts: Following, Followers, Likes */}
          <div className="flex gap-8 mb-6 font-bold text-sm">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
              <span className="text-lg font-black">22</span> <span className="text-slate-500 font-medium lowercase">Đang theo dõi</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
              <span className="text-lg font-black">196</span> <span className="text-slate-500 font-medium lowercase">Người theo dõi</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
              <span className="text-lg font-black">3099</span> <span className="text-slate-500 font-medium lowercase">Thích</span>
            </div>
          </div>

          {/* Tiểu sử */}
          <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium leading-relaxed max-w-xl">
            {profile.bio || "Người dùng này chưa cập nhật tiểu sử."}
          </p>
        </div>
      </div>

      {/* --- STACK PHÍA DƯỚI: TABS & VIDEO GRID --- */}
      <div className="border-t border-slate-200 dark:border-white/5">
        <div className="flex justify-center md:justify-start gap-12">
          {[
            { id: "videos", label: "Videos", icon: LayoutGrid },
            { id: "saved", label: "Đã lưu", icon: Bookmark, private: true },
            { id: "liked", label: "Đã thích", icon: Heart, private: true }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-sm font-black transition-all border-t-2 -mt-[2px] ${
                activeTab === tab.id 
                ? "border-slate-900 dark:border-white text-slate-900 dark:text-white" 
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.private && <Lock size={12} className="ml-1 opacity-40" />}
            </button>
          ))}
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-3 gap-1 md:gap-4 mt-6">
          {(activeTab === "videos" ? posts : activeTab === "liked" ? likedPosts : savedPosts).map((item: any) => (
            <div key={item.id} className="relative aspect-[3/4] bg-zinc-800 rounded-xl overflow-hidden group cursor-pointer shadow-lg">
              <img 
                src={item.image_url || `https://picsum.photos/seed/${item.id}/400/600`} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt="post-thumbnail"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex items-center gap-1.5 text-white text-xs font-black">
                  <Play size={14} className="fill-white" /> {item.likes_count || 0}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {activeTab === "videos" && posts.length === 0 && (
          <div className="text-center py-24 bg-slate-100/50 dark:bg-white/5 rounded-[2.5rem] mt-4 border-2 border-dashed border-slate-200 dark:border-white/5">
            <LayoutGrid size={48} className="mx-auto text-slate-300 dark:text-zinc-800 mb-4" />
            <p className="text-slate-400 font-bold">Chưa có video nào được đăng tải.</p>
          </div>
        )}
      </div>
    </div>
  );
}