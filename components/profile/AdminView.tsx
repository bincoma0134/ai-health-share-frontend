"use client";

import { useState } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, LayoutGrid, Crown, ShieldAlert, Activity
} from "lucide-react";
import { toast } from "sonner";

export default function AdminView({ profile, posts = [], likedPosts = [], savedPosts = [] }: any) {
  const [activeTab, setActiveTab] = useState("activities");

  const handleShare = () => {
      const profileUrl = window.location.href;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Đã sao chép liên kết Quản trị viên!");
  };

  return (
    <div className="animate-slide-up">
      {/* --- STACK PHÍA TRÊN: THÔNG TIN QUẢN TRỊ VIÊN TỐI CAO --- */}
      <div className="flex flex-col md:flex-row items-start gap-10 mb-12">
        <div className="relative group shrink-0">
          {/* Glow hiệu ứng Đen/Vàng Kim Quyền lực */}
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-400 to-slate-800 rounded-full blur-md opacity-40 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl backdrop-blur-md bg-slate-100">
            <img 
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=1e293b&color=fbbf24`} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[20%]" 
              alt="avatar"
            />
          </div>
          {/* Badge Role "Super Admin" */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-slate-900 to-slate-800 text-amber-400 text-[10px] font-black rounded-full shadow-xl flex items-center gap-1.5 border border-amber-500/30 whitespace-nowrap uppercase tracking-widest">
            <Crown size={12} className="fill-amber-400/20" /> Tối cao
          </div>
        </div>

        <div className="flex-1 pt-2">
          {/* Tên & Username */}
          <div className="flex flex-col gap-1 mb-6 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-md flex items-center justify-center md:justify-start gap-3">
              {profile.full_name || "Quản Trị Viên"}
              <Crown size={24} className="text-amber-500 fill-amber-500/20" />
            </h1>
            <h2 className="text-base md:text-lg font-medium text-slate-500 dark:text-zinc-400 tracking-tight">
              @{profile.username || "admin_system"}
            </h2>
          </div>

          {/* Buttons Group (Tone Dark/Gold) */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-8">
            <button className="px-10 py-3.5 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-amber-400 dark:text-slate-900 font-black rounded-2xl hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all active:scale-95 flex items-center gap-2 shadow-lg border border-amber-500/20">
              <ShieldAlert size={20} strokeWidth={2.5} /> <span>Báo cáo</span>
            </button>

            <button className="px-8 py-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-all flex items-center gap-2 shadow-xl active:scale-95">
              <MessageCircle size={20} strokeWidth={3} /> <span>Liên hệ</span>
            </button>

            <div className="flex gap-2">
              <button onClick={handleShare} className="p-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-amber-500 rounded-xl transition-all shadow-xl active:scale-90">
                <Share2 size={20} />
              </button>
              <button className="p-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all shadow-xl active:scale-90">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          {/* Stats: Chỉ số bao quát toàn hệ thống */}
          <div className="flex justify-center md:justify-start gap-8 mb-6 px-2">
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">12.4K</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người dùng</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 border-x border-slate-200 dark:border-white/10 px-8">
              <span className="text-2xl font-black text-slate-900 dark:text-white">1,250</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dịch vụ Active</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-2xl font-black text-amber-500 dark:text-amber-400">99.9%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Độ ổn định</span>
            </div>
          </div>

          <p className="text-center md:text-left text-base text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl px-2">
            {profile.bio || "Quản trị viên hệ thống AI Health Share. Chịu trách nhiệm vận hành, giám sát và duy trì tính toàn vẹn của nền tảng."}
          </p>
        </div>
      </div>

      {/* --- STACK PHÍA DƯỚI: TABS --- */}
      <div className="border-t border-slate-200 dark:border-white/10">
        <div className="flex justify-center md:justify-start gap-10 sticky top-0 bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-md z-20">
          {[
            { id: "activities", label: "Hoạt động", icon: Activity },
            { id: "videos", label: "Video đăng tải", icon: LayoutGrid },
            { id: "saved", label: "Bằng chứng lưu", icon: Bookmark, private: true }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-5 text-xs font-black transition-all border-t-2 -mt-[2px] ${
                activeTab === tab.id 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <tab.icon size={18} strokeWidth={3} />
              <span className="uppercase tracking-widest">{tab.label}</span>
              {tab.private && <Lock size={12} className="ml-1 opacity-30" />}
            </button>
          ))}
        </div>

        {/* Màn hình trống cho Hoạt động hệ thống */}
        {activeTab === "activities" && (
           <div className="text-center py-32 bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[4rem] mt-8 border-2 border-dashed border-slate-200 dark:border-white/10">
             <Activity size={32} className="mx-auto text-amber-500 opacity-50 mb-4" />
             <p className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-widest">Nhật ký hoạt động</p>
             <p className="text-slate-400 text-sm font-bold mt-2">Hệ thống đang hoạt động ổn định. Không có cảnh báo bảo mật nào.</p>
           </div>
        )}

        {/* Lưới Video (Nếu Admin có đăng thông báo) */}
        {(activeTab === "videos" || activeTab === "saved") && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mt-8 pb-20">
            {(activeTab === "videos" ? posts : savedPosts).map((item: any) => (
              <div key={item.id} className="relative aspect-[3/4] bg-zinc-800 rounded-[2rem] overflow-hidden group cursor-pointer shadow-xl border border-white/5 hover:-translate-y-1 transition-transform">
                <img src={item.image_url || `https://picsum.photos/seed/${item.id}/400/600`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="post" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent flex flex-col justify-between p-5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex justify-end"><Share2 size={18} className="text-white/60" /></div>
                  <div className="flex items-center gap-2 text-white text-sm font-black"><Play size={18} className="fill-white" /> <span>{item.likes_count || 0}</span></div>
                </div>
              </div>
            ))}

            {(activeTab === "videos" ? posts : savedPosts).length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-400 font-bold">Chưa có dữ liệu.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}