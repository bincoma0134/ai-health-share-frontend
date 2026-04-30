"use client";

import { useEffect, useState } from "react";
import { 
  Sun, Moon, Bell, PlaySquare, Eye, Heart, MessageCircle, 
  TrendingUp, Star, Film, ChevronRight, BarChart2, ShieldCheck, Video, LayoutGrid, Sparkles
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useUI } from "@/context/UIContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Thiếu biến môi trường Supabase!");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface LocalUIContext {
  isNotifOpen: boolean;
  setIsNotifOpen: (val: boolean) => void;
  theme: string;
  toggleTheme: () => void;
}

export default function CreatorDashboard() {
  const router = useRouter();
  const { setIsNotifOpen, theme, toggleTheme } = useUI() as unknown as LocalUIContext;
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const [stats, setStats] = useState({ total_videos: 0, total_posts: 0, total_likes: 0, approval_rate: 0 });
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => { 
    setIsMounted(true); 
    fetchDashboardData(); 
  }, [router]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/"); return; }
      setUser(session.user);

      const fetchOpts = { headers: { "Authorization": `Bearer ${session.access_token}` } };
      
      const [sRes, cRes] = await Promise.all([
          fetch(`${API_URL}/creator/stats`, fetchOpts).then(r => r.json()).catch(() => null),
          fetch(`${API_URL}/creator/content`, fetchOpts).then(r => r.json()).catch(() => null)
      ]);

      if (sRes && sRes.status === "success") {
          setStats(sRes.data);
      }

      if (cRes && cRes.status === "success") {
          const videos = cRes.data.videos || [];
          const posts = cRes.data.community_posts || [];
          
          setRecentVideos(videos.slice(0, 5)); // Lấy 5 video mới nhất
          setRecentPosts(posts.slice(0, 5));   // Lấy 5 post mới nhất

          // Logic tính toán biểu đồ 7 ngày từ dữ liệu thô
          const last7Days = Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              return d.toISOString().split('T')[0];
          });

          const generatedChartData = last7Days.map(dateStr => {
              const vCount = videos.filter((v: any) => v.created_at.startsWith(dateStr)).length;
              const pCount = posts.filter((p: any) => p.created_at.startsWith(dateStr)).length;
              const [, month, day] = dateStr.split('-');
              return { date: `${day}/${month}`, Video: vCount, "Bài Đăng": pCount };
          });

          setChartData(generatedChartData);
      }
    } catch (error) {
      toast.error("Lỗi đồng bộ dữ liệu Dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  if (isLoading) return (
    <div className="flex-1 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 h-[100dvh]">
      <div className="relative">
        <div className="absolute inset-0 bg-rose-400 rounded-full animate-ping opacity-50"></div>
        <div className="relative bg-rose-500 p-4 rounded-full"><BarChart2 className="text-white w-6 h-6 animate-bounce" /></div>
      </div>
      <p className="text-rose-500 text-sm font-bold tracking-widest uppercase animate-pulse">Đang phân tích hiệu suất...</p>
    </div>
  );

  return (
    <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 font-be-vietnam">
      
      {/* Nút Sáng Tối & Thông báo */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
        <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-sm">
          {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
        </button>
        <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 hover:text-rose-500 transition-all shadow-sm">
          <Bell size={18}/>
        </button>
      </div>

      <div className="max-w-6xl mx-auto pt-20 md:pt-24 pb-32 px-6 md:px-12">
          
          <div className="mb-10 animate-slide-up flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 rounded-2xl border border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-inner">
                    <Sparkles size={32} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 tracking-tighter">Trung tâm Sáng tạo</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm">Theo dõi hiệu suất, tăng trưởng và chất lượng nội dung.</p>
                </div>
              </div>
              
              <button onClick={() => router.push('/creator/profile')} className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] text-sm uppercase tracking-widest">
                  <PlaySquare size={18} /> ĐĂNG NỘI DUNG MỚI
              </button>
          </div>

          {/* 4 WIDGETS THỐNG KÊ THẬT */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-pink-500/10 dark:text-pink-500/5 group-hover:scale-110 transition-transform"><Film size={100} /></div>
                  <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4"><Film size={24} strokeWidth={2.5} /></div>
                      <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{stats.total_videos}</p>
                      <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Video Đã Đăng</p>
                  </div>
              </div>

              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-fuchsia-500/10 dark:text-fuchsia-500/5 group-hover:scale-110 transition-transform"><MessageCircle size={100} /></div>
                  <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center mb-4"><MessageCircle size={24} strokeWidth={2.5} /></div>
                      <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{stats.total_posts}</p>
                      <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Bài Viết Cộng Đồng</p>
                  </div>
              </div>

              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-rose-500/10 dark:text-rose-500/5 group-hover:scale-110 transition-transform"><Heart size={100} /></div>
                  <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4"><Heart size={24} strokeWidth={2.5} /></div>
                      <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{stats.total_likes.toLocaleString()}</p>
                      <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Tổng Lượt Thích</p>
                  </div>
              </div>

              <div className="p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-rose-500 to-pink-500 shadow-xl relative overflow-hidden group text-white">
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform"><ShieldCheck size={100} /></div>
                  <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-md"><ShieldCheck size={24} strokeWidth={2.5} /></div>
                      <p className="text-3xl md:text-4xl font-black">{stats.approval_rate}%</p>
                      <p className="text-[10px] md:text-xs font-bold text-rose-100 uppercase tracking-widest mt-1">Chất lượng / Uy tín</p>
                  </div>
              </div>
          </div>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              
              {/* BIỂU ĐỒ HIỆU SUẤT ĐĂNG BÀI */}
              <div className="lg:col-span-8 p-6 md:p-8 rounded-[3rem] bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-lg">
                  <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <TrendingUp size={16} className="text-rose-500"/> Hiệu suất đăng bài (7 Ngày qua)
                  </h3>
                  <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                              <defs>
                                  <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} dy={10} />
                              <YAxis hide domain={['dataMin', 'auto']} />
                              <Tooltip 
                                  contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
                                  itemStyle={{ fontWeight: 800 }}
                              />
                              <Area type="monotone" dataKey="Video" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorVideos)" />
                              <Area type="monotone" dataKey="Bài Đăng" stroke="#ec4899" strokeWidth={4} fillOpacity={1} fill="url(#colorPosts)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* TỔNG HỢP GẦN ĐÂY */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* STUDIO VIDEOS LIST */}
                  <div className="p-6 md:p-8 rounded-[3rem] bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-lg flex-1">
                      <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                          <span className="flex items-center gap-2"><Video size={16} className="text-rose-500"/> Studio Video</span>
                          <button onClick={() => router.push('/creator/profile')} className="text-[10px] text-rose-500 hover:underline">Quản lý</button>
                      </h3>
                      
                      <div className="space-y-4">
                          {recentVideos.length === 0 ? (
                              <p className="text-sm text-slate-500 text-center py-4">Chưa có video nào.</p>
                          ) : recentVideos.map((item) => (
                              <div key={item.id} className="flex gap-4 p-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer group">
                                  <div className="w-14 h-16 rounded-xl bg-black overflow-hidden relative shrink-0">
                                      <video src={item.video_url} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20"><PlaySquare size={14} className="text-white"/></div>
                                  </div>
                                  <div className="flex-1 flex flex-col justify-center min-w-0">
                                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mb-1 group-hover:text-rose-500 transition-colors">{item.title}</h4>
                                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                          <span className="flex items-center gap-1"><Heart size={12}/> {item.likes_count || 0}</span>
                                          <span className={`px-1.5 py-0.5 rounded uppercase tracking-widest ${item.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{item.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* BÀI VIẾT CỘNG ĐỒNG LIST */}
                  <div className="p-6 md:p-8 rounded-[3rem] bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-lg flex-1">
                      <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                          <span className="flex items-center gap-2"><MessageCircle size={16} className="text-pink-500"/> Cộng đồng</span>
                      </h3>
                      <div className="space-y-4">
                          {recentPosts.length === 0 ? (
                              <p className="text-sm text-slate-500 text-center py-4">Chưa có bài đăng nào.</p>
                          ) : recentPosts.map((item) => (
                              <div key={item.id} className="flex gap-4 items-center p-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer group">
                                  {item.image_url ? (
                                      <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" />
                                  ) : (
                                      <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center"><MessageCircle size={20}/></div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.content}</p>
                                      <p className="text-[10px] text-slate-400 mt-1">{new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
}