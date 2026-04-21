"use client";

import { useEffect, useState } from "react";
import { 
  Sun, Moon, Bell, PlaySquare, Eye, Heart, Bookmark, 
  TrendingUp, Star, Film, ChevronRight, BarChart2
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useUI } from "@/context/UIContext";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function CreatorDashboard() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI();
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Mock data cho Analytics
  const analyticsData = [
    { date: "Thứ 2", views: 1200 }, { date: "Thứ 3", views: 2100 },
    { date: "Thứ 4", views: 1800 }, { date: "Thứ 5", views: 3400 },
    { date: "Thứ 6", views: 2800 }, { date: "Thứ 7", views: 5200 },
    { date: "CN", views: 4800 },
  ];

  // Mock data cho Nội dung
  const recentContent = [
    { id: 1, title: "3 Bài tập Yoga giảm đau vai gáy", views: 12400, likes: 3200, status: "PUBLISHED", thumb: "/video-1.mp4" },
    { id: 2, title: "Dinh dưỡng cho người tập Gym", views: 8900, likes: 1500, status: "PUBLISHED", thumb: "/video-2.mp4" },
    { id: 3, title: "Review Spa Trị liệu Cổ Vai Gáy", views: 0, likes: 0, status: "PENDING", thumb: "/video-3.mp4" },
  ];

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vui lòng đăng nhập!");
        router.push("/");
        return;
      }
      setUser(session.user);
      // Tương lai sẽ fetch API thực tế: /creator/dashboard
      setTimeout(() => setIsLoading(false), 800); 
    };
    checkAuth();
  }, [router]);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  if (isLoading || !isMounted) return (
    <div className="flex-1 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 h-[100dvh]">
      <div className="relative">
        <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-50"></div>
        <div className="relative bg-amber-500 p-4 rounded-full"><BarChart2 className="text-white w-6 h-6 animate-bounce" /></div>
      </div>
      <p className="text-amber-500 text-sm font-bold tracking-widest uppercase animate-pulse">Đang phân tích dữ liệu...</p>
    </div>
  );

  return (
    <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-black transition-colors duration-500">
      
      {/* Nút Sáng Tối & Thông báo */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
        <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
          {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
        <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 hover:text-amber-500 transition-all shadow-lg">
          <Bell size={20}/>
        </button>
      </div>

      <div className="max-w-6xl mx-auto pt-20 md:pt-24 pb-32 px-6 md:px-8">
          
          <div className="mb-10 animate-slide-up flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <TrendingUp size={32} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1">Thống kê Nội dung</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Theo dõi sự tăng trưởng và mức độ tương tác của kênh.</p>
                </div>
              </div>
              
              <button className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                  <PlaySquare size={20} /> ĐĂNG VIDEO MỚI
              </button>
          </div>

          {/* 4 WIDGETS THỐNG KÊ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="glass-panel p-5 rounded-[2rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-amber-500/10 group-hover:scale-110 transition-transform"><Eye size={100} /></div>
                  <div className="relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center mb-3"><Eye size={20} strokeWidth={2.5} /></div>
                      <p className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">21,300</p>
                      <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Lượt Xem Video</p>
                  </div>
              </div>

              <div className="glass-panel p-5 rounded-[2rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-rose-500/10 group-hover:scale-110 transition-transform"><Heart size={100} /></div>
                  <div className="relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-3"><Heart size={20} strokeWidth={2.5} /></div>
                      <p className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">4,700</p>
                      <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Lượt Thích</p>
                  </div>
              </div>

              <div className="glass-panel p-5 rounded-[2rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-emerald-500/10 group-hover:scale-110 transition-transform"><Bookmark size={100} /></div>
                  <div className="relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-3"><Bookmark size={20} strokeWidth={2.5} /></div>
                      <p className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">1,250</p>
                      <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Lượt Lưu</p>
                  </div>
              </div>

              <div className="glass-panel p-5 rounded-[2rem] bg-white/70 dark:bg-black/50 border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-blue-500/10 group-hover:scale-110 transition-transform"><Star size={100} /></div>
                  <div className="relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center mb-3"><Star size={20} strokeWidth={2.5} /></div>
                      <p className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">845</p>
                      <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Người Theo Dõi</p>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              
              {/* BIỂU ĐỒ LƯỢT XEM */}
              <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border border-amber-500/20 shadow-xl">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <TrendingUp size={16} className="text-amber-500"/> Xu hướng Lượt xem (7 Ngày)
                  </h3>
                  <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analyticsData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                              <defs>
                                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} opacity={0.5} />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }} dy={10} />
                              <YAxis hide domain={['dataMin', 'auto']} />
                              <Tooltip 
                                  contentStyle={{ borderRadius: '16px', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)', backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', color: isDarkMode ? '#fff' : '#1e293b' }}
                                  itemStyle={{ fontWeight: 800, color: '#f59e0b' }}
                                  formatter={(value) => [`${Number(value).toLocaleString()} lượt`, 'Lượt xem']}
                              />
                              <Area type="monotone" dataKey="views" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* DANH SÁCH VIDEO GẦN ĐÂY */}
              <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border border-slate-200 dark:border-white/10 shadow-xl flex flex-col">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center justify-between">
                      <span className="flex items-center gap-2"><Film size={16} className="text-amber-500"/> Video của bạn</span>
                      <button className="text-[10px] text-amber-500 hover:underline">Xem tất cả</button>
                  </h3>
                  
                  <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar max-h-[300px]">
                      {recentContent.map((item) => (
                          <div key={item.id} className="flex gap-4 p-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer group">
                              <div className="w-16 h-20 rounded-xl bg-black overflow-hidden relative shrink-0">
                                  <video src={item.thumb} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20"><PlaySquare size={16} className="text-white"/></div>
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-amber-500 transition-colors">{item.title}</h4>
                                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                      <span className="flex items-center gap-1"><Eye size={12}/> {item.views.toLocaleString()}</span>
                                      <span className="flex items-center gap-1"><Heart size={12}/> {item.likes.toLocaleString()}</span>
                                  </div>
                                  <div className="mt-1.5">
                                      {item.status === 'PUBLISHED' 
                                        ? <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider">Đã đăng</span>
                                        : <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider">Đang duyệt</span>
                                      }
                                  </div>
                              </div>
                              <div className="flex items-center"><ChevronRight size={16} className="text-slate-300 dark:text-zinc-600 group-hover:text-amber-500 transition-colors"/></div>
                          </div>
                      ))}
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
}