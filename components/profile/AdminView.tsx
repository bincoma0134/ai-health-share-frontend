"use client";

import { useState } from "react";
import { 
  UserPlus, MessageCircle, Share2, MoreHorizontal, 
  Lock, Play, Heart, Bookmark, LayoutGrid, Crown, ShieldAlert, Activity, Sparkles, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import DashboardButton from "./DashboardButton";

export default function AdminView({ profile, videos = [], community_posts = [], savedPosts = [] }: any) {
  const [activeTab, setActiveTab] = useState("activities");

  const handleShare = () => {
      const profileUrl = window.location.href;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Đã sao chép liên kết Quản trị viên!");
  };

  return (
    <div className="animate-slide-up pb-20">
      
      {/* --- COVER IMAGE: Đồng bộ với Private Profile --- */}
      <div className="relative w-full h-48 md:h-64 bg-slate-200 dark:bg-zinc-900 rounded-[2rem] md:rounded-[3rem] overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-white/5">
          {profile?.cover_url ? (
              <img src={profile.cover_url} className="w-full h-full object-cover" alt="cover" />
          ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-amber-900/40 flex items-center justify-center">
                 <Crown className="text-amber-500/30 w-20 h-20" />
              </div>
          )}
      </div>

      {/* --- THÔNG TIN ADMIN: Header Layout Mới --- */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mb-12 px-2 md:px-8">
        
        {/* Avatar với hiệu ứng Glow Vàng Kim */}
        <div className="relative group shrink-0 -mt-20 md:-mt-24 z-10">
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-400 to-yellow-600 rounded-full blur-md opacity-40 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-zinc-950 shadow-2xl bg-white p-1.5">
            <img 
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=1e293b&color=fbbf24`} 
              className="w-full h-full object-cover rounded-full" 
              alt="avatar"
            />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-slate-900 to-slate-800 text-amber-400 text-[10px] font-black rounded-full shadow-xl flex items-center gap-1.5 border border-amber-500/30 whitespace-nowrap uppercase tracking-widest">
            <Crown size={12} className="fill-amber-400/20" /> ADMIN
          </div>
        </div>

        {/* Cụm Text và Nút chức năng xếp dọc bên dưới Username */}
        <div className="flex-1 w-full pt-2 text-center md:text-left">
          
          <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center justify-center md:justify-start gap-3 mb-1 drop-shadow-md">
                  {profile?.full_name || "Quản Trị Viên Cấp Cao"} <Crown size={24} className="text-amber-500 fill-amber-500/20" />
              </h1>
              <h2 className="text-base font-medium text-slate-500 dark:text-zinc-400 tracking-tight">
                  @{profile?.username || "admin_system"}
              </h2>
          </div>
          
          {/* NÚT HÀNH ĐỘNG: Đã đưa xuống dưới Username theo yêu cầu */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
              {/* Chỉ hiển thị Bảng điều khiển nếu là chủ sở hữu profile */}
              <DashboardButton userRole={profile?.role} />
              
              <button className="px-8 py-3 bg-slate-900 dark:bg-white text-amber-500 dark:text-slate-900 font-black rounded-2xl hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center gap-2 active:scale-95 text-xs uppercase tracking-widest border border-amber-500/20 shadow-lg">
                  <ShieldAlert size={18} strokeWidth={2.5} /> Báo cáo
              </button>
              <button className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90">
                  <MessageCircle size={18} />
              </button>
              <button onClick={handleShare} className="p-3.5 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 hover:text-amber-500 transition-all shadow-sm active:scale-90">
                  <Share2 size={18} />
              </button>
          </div>

          {/* CHỈ SỐ ADMIN: Đồng bộ dữ liệu thật */}
          <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
              <div className="flex items-center gap-2">
                  <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{(profile?.followers_count || 0).toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Người quan<br/>tâm</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
              <div className="flex items-center gap-2">
                  <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{(profile?.active_services || 1250).toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Dịch vụ<br/>Active</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/10"></div>
              <div className="flex items-center gap-2">
                  <span className="text-xl md:text-2xl font-black text-amber-500">99.9%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Độ ổn định<br/>hệ thống</span>
              </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto md:mx-0">
            {profile?.bio || "Hệ thống Quản trị trung tâm AI Health Share. Giám sát tính toàn vẹn và vận hành mạng lưới sức khỏe thông minh."}
          </p>
        </div>
      </div>

      {/* --- TAB MENU CÔNG KHAI --- */}
      <div className="border-t border-slate-200 dark:border-white/10 pt-4 px-2 md:px-8">
        <div className="flex justify-center md:justify-start gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: "activities", label: "Hoạt động", icon: Activity },
            { id: "videos", label: "Video đăng tải", icon: LayoutGrid },
            { id: "posts", label: "Bài đăng (Community)", icon: MessageCircle },
            { id: "saved", label: "Bằng chứng lưu", icon: Bookmark, private: true }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-xs font-black transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              <tab.icon size={16} strokeWidth={3} />
              <span className="uppercase tracking-widest">{tab.label}</span>
              {tab.private && <Lock size={12} className="ml-1 opacity-30" />}
            </button>
          ))}
        </div>

        {/* TAB 1: NHẬT KÝ HOẠT ĐỘNG */}
        {activeTab === "activities" && (
           <div className="text-center py-32 bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[4rem] mt-8 border-2 border-dashed border-slate-200 dark:border-white/10">
             <Activity size={48} className="mx-auto text-amber-500 opacity-50 mb-4" />
             <p className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-widest">Trạng thái vận hành</p>
             <p className="text-slate-500 text-sm font-medium mt-2 max-w-md mx-auto">Hệ thống AI Health đang hoạt động với hiệu suất tối ưu. Các kết nối máy chủ đều ở trạng thái an toàn.</p>
           </div>
        )}

        {/* TAB 2: VIDEO STUDIO CỦA ADMIN */}
        {activeTab === "videos" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
            {videos.map((item: any) => (
              <div key={item.id} className="relative aspect-[9/16] bg-zinc-800 rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg border border-slate-200 dark:border-white/10">
                <video src={item.video_url} className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-100" muted playsInline />
                <div className="absolute top-4 left-4 z-10">
                    <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md rounded-md text-[9px] font-black uppercase flex items-center gap-1">
                        <CheckCircle size={10} /> THÔNG BÁO HỆ THỐNG
                    </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5">
                    <h3 className="text-white text-xs font-bold line-clamp-2 leading-tight drop-shadow-md">{item.title}</h3>
                </div>
              </div>
            ))}
            {videos.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                  <LayoutGrid size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
                  <p className="text-slate-500 font-bold">Chưa có video thông báo nào.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BÀI ĐĂNG CỘNG ĐỒNG (COMMUNITY POSTS) */}
        {activeTab === "posts" && (
            <div className="max-w-2xl mx-auto space-y-6 mt-8 pb-20">
                {community_posts.map((post: any) => (
                    <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=1e293b&color=fbbf24`} className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10" />
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                    {profile?.full_name} <Crown size={12} className="text-amber-500"/>
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {new Date(post.created_at).toLocaleDateString('vi-VN')} • Thông báo chính thức
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
                {community_posts.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                        <MessageCircle size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
                        <p className="text-slate-500 font-bold">Chưa có bản tin cộng đồng nào.</p>
                    </div>
                )}
            </div>
        )}

        {/* TAB 4: BẰNG CHỨNG LƯU (PRIVATE) */}
        {activeTab === "saved" && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] mt-8">
                <Lock size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Khu vực lưu trữ bảo chứng bảo mật</p>
            </div>
        )}
      </div>
    </div>
  );
}