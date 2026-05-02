"use client";

import { useState } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, LayoutGrid 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function RegularUserView({ profile, posts = [], likedPosts = [], savedPosts = [] }: any) {
  const [activeTab, setActiveTab] = useState("videos");

  // Khai báo kết nối Backend
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const [isFollowing, setIsFollowing] = useState(profile?.is_followed || false);
  const [followersCount, setFollowersCount] = useState(profile?.followers_count || 0);

  const handleToggleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("Vui lòng đăng nhập!");
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowersCount((prev: number) => wasFollowing ? Math.max(0, prev - 1) : prev + 1);

    try {
        const res = await fetch(`${API_URL}/user/follow/${profile.id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }});
        if (!res.ok) throw new Error("Lỗi");
    } catch {
        setIsFollowing(wasFollowing);
        setFollowersCount((prev: number) => wasFollowing ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleShare = () => {
      const profileUrl = window.location.href;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Đã sao chép liên kết!");
  };

  return (
    <div className="animate-slide-up">
      {/* --- STACK PHÍA TRÊN: THÔNG TIN CÁ NHÂN --- */}
      <div className="flex flex-col md:flex-row items-start gap-10 mb-12">
        {/* Avatar với Glow Glassmorphism */}
        <div className="relative group shrink-0">
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#80BF84] to-emerald-400 rounded-full blur-md opacity-20"></div>
          <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl backdrop-blur-md bg-slate-100">
            <img 
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=80BF84&color=fff`} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt="avatar"
            />
          </div>
        </div>

        <div className="flex-1 pt-2">
          {/* SỬA LỖI: Tên hiển thị (Bold) trên, Username (Small) dưới */}
          <div className="flex flex-col gap-1 mb-6 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-md">
              {profile.full_name || "Chưa có tên"}
            </h1>
            <h2 className="text-base md:text-lg font-medium text-slate-500 dark:text-zinc-400 tracking-tight">
              @{profile.username || "username"}
            </h2>
          </div>

          {/* Buttons: Glassmorphism trau chuốt */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-8">
            <button 
              onClick={handleToggleFollow} 
              className={`relative px-10 py-3.5 font-black rounded-2xl transition-all duration-300 ease-out flex items-center justify-center gap-2 overflow-hidden group active:scale-95 min-w-[160px] shadow-lg ${
                isFollowing 
                ? 'bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/30' 
                : 'bg-gradient-to-br from-[#80BF84] to-[#6da871] text-zinc-950 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_15px_25px_-6px_rgba(128,191,132,0.5)]'
              }`}
            >
              {!isFollowing && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12"></div>}
              {isFollowing ? (
                <><span className="group-hover:hidden">Đã theo dõi</span><span className="hidden group-hover:block">Hủy theo dõi</span></>
              ) : (
                <><UserPlus size={20} strokeWidth={3} className="group-hover:rotate-12 group-hover:scale-110 transition-transform" /> Theo dõi</>
              )}
            </button>

            <button className="px-8 py-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/50 dark:border-white/10 text-slate-900 dark:text-white font-black rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-all flex items-center gap-2 shadow-xl active:scale-95">
              <MessageCircle size={20} strokeWidth={3} /> <span>Nhắn tin</span>
            </button>

            <div className="flex gap-2">
              <button onClick={handleShare} className="p-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/50 dark:border-white/10 text-slate-500 hover:text-[#80BF84] rounded-xl transition-all shadow-xl active:scale-90">
                <Share2 size={20} />
              </button>
              <button className="p-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/50 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all shadow-xl active:scale-90">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          {/* Chỉ số Stats */}
          <div className="flex justify-center md:justify-start gap-10 mb-6 px-2">
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{(profile?.following_count || 0).toLocaleString()}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang theo dõi</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 border-x border-slate-200 dark:border-white/10 px-8">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{followersCount.toLocaleString()}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người theo dõi</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">3099</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thích</span>
            </div>
          </div>

          <p className="text-center md:text-left text-base text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl px-2">
            {profile.bio || "Người dùng này chưa cập nhật tiểu sử."}
          </p>
        </div>
      </div>

      {/* --- STACK PHÍA DƯỚI: TABS & VIDEO GRID --- */}
      <div className="border-t border-slate-200 dark:border-white/10">
        <div className="flex justify-center md:justify-start gap-12 sticky top-0 bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-md z-20">
          {[
            { id: "videos", label: "Videos", icon: LayoutGrid },
            { id: "saved", label: "Đã lưu", icon: Bookmark, private: true },
            { id: "liked", label: "Đã thích", icon: Heart, private: true }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-5 text-xs font-black transition-all border-t-2 -mt-[2px] ${
                activeTab === tab.id 
                ? "border-[#80BF84] text-[#80BF84]" 
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <tab.icon size={18} strokeWidth={3} />
              <span className="uppercase tracking-widest">{tab.label}</span>
              {tab.private && <Lock size={12} className="ml-1 opacity-30" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mt-8">
          {(activeTab === "videos" ? posts : activeTab === "liked" ? likedPosts : savedPosts).map((item: any) => (
            <div key={item.id} className="relative aspect-[3/4] bg-zinc-800 rounded-[2rem] overflow-hidden group cursor-pointer shadow-2xl border border-white/5">
              <img src={item.image_url || `https://picsum.photos/seed/${item.id}/400/600`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="post" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent flex flex-col justify-between p-5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex justify-end"><Share2 size={18} className="text-white/60 hover:text-white" /></div>
                <div className="flex items-center gap-2 text-white text-sm font-black"><Play size={18} className="fill-white" /> <span>{item.likes_count || 0}</span></div>
              </div>
            </div>
          ))}
        </div>

        {activeTab === "videos" && posts.length === 0 && (
          <div className="text-center py-32 bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[4rem] mt-8 border-2 border-dashed border-slate-200 dark:border-white/10">
            <div className="w-20 h-20 bg-white/50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <LayoutGrid size={32} className="text-[#80BF84] opacity-50" />
            </div>
            <p className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-widest">Chưa có video được đăng tải</p>
            <p className="text-slate-400 text-sm font-bold mt-2">Theo dõi người dùng để xem những cập nhật mới nhất.</p>
          </div>
        )}
      </div>
    </div>
  );
}