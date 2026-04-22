"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, Crown, Sparkles, MapPin, Link as LinkIcon, Calendar } from "lucide-react";
import PostItem from "@/components/PostItem";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function PublicProfilePage() {
  const { username } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/user/public/${username}`);
        const result = await res.json();
        if (result.status === "success") setData(result.data);
      } catch (err) { console.error("Lỗi fetch profile:", err); }
      finally { setLoading(false); }
    };
    if (username) fetchProfile();
  }, [username]);

  if (loading) return <div className="h-screen flex items-center justify-center dark:bg-zinc-950 text-[#80BF84] font-black animate-pulse text-2xl">AI HEALTH IS LOADING...</div>;
  if (!data) return <div className="h-screen flex items-center justify-center dark:bg-zinc-950 text-white">Không tìm thấy người dùng!</div>;

  const { profile, posts } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 font-be-vietnam">
      {/* 1. Header & Cover */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-[#80BF84]/30 to-emerald-900/40">
        <div className="absolute inset-0 backdrop-blur-sm"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-24 relative z-10">
        <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/50 dark:border-white/10 p-8 shadow-2xl">
          
          {/* 2. Profile Info Section */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-zinc-800 shadow-2xl overflow-hidden bg-slate-200">
              <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=80BF84&color=fff`} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-center md:text-left pb-2">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{profile.full_name}</h1>
                <span className="px-3 py-1 bg-[#80BF84]/20 border border-[#80BF84]/30 text-[#80BF84] text-[10px] font-black rounded-full uppercase tracking-widest">{profile.role}</span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 font-bold mb-4">@{profile.username}</p>
              <p className="text-slate-700 dark:text-zinc-300 font-medium max-w-xl">{profile.bio || "Người dùng này chưa cập nhật tiểu sử."}</p>
            </div>
          </div>

          {/* 3. Dựa vào Role để hiển thị nội dung đặc thù */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Sidebar Trái: Thông tin chi tiết */}
            <div className="space-y-6">
              <div className="p-6 bg-slate-100/50 dark:bg-black/20 rounded-3xl border border-slate-200/50 dark:border-white/5">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Giới thiệu</h4>
                <div className="space-y-4 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                  <div className="flex items-center gap-3"><MapPin size={16}/> Hà Nội, Việt Nam</div>
                  <div className="flex items-center gap-3 text-[#80BF84]"><LinkIcon size={16}/> foxil.org</div>
                  <div className="flex items-center gap-3"><Calendar size={16}/> Tham gia T4/2024</div>
                </div>
              </div>
            </div>

            {/* Cột Phải: Danh sách bài viết (FEED) */}
            <div className="lg:col-span-2">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                Hoạt động gần đây <div className="h-px flex-1 bg-slate-200 dark:bg-white/5"></div>
              </h4>
              
              {posts.length > 0 ? (
                posts.map((post: any) => <PostItem key={post.id} post={post} />)
              ) : (
                <div className="text-center py-20 bg-slate-100/30 dark:bg-white/5 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/5">
                  <p className="text-slate-400 font-bold">Chưa có bài viết nào được đăng tải.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}