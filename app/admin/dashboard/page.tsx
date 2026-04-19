"use client";

import { useEffect, useState } from "react";
import { 
  Users, Building2, Activity, DollarSign, Wallet, TrendingUp, LogOut, 
  Home, ShieldCheck, BarChart3, Sparkles, Compass, CalendarDays, Heart, 
  User as UserIcon, Sun, Moon, Bell, Crown, Settings 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useUI } from "@/context/UIContext"; // IMPORT CONTEXT THÔNG BÁO
import GlobalLoading from "../../loading"; 

// --- KHỞI TẠO SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboardOverview() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI(); // LẤY HÀM MỞ THÔNG BÁO
  
  // --- STATE HỆ THỐNG & AUTH ---
  const [user, setUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);

  // --- STATE DỮ LIỆU ---
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topPartners, setTopPartners] = useState<any[]>([]);

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

    const fetchDashboardData = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session) {
          toast.error("Vui lòng đăng nhập!");
          router.push("/");
          return;
        }

        // 🚨 RBAC: KIỂM TRA ROLE SUPER_ADMIN TỪ BẢNG USERS
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, theme_preference')
          .eq('id', session.user.id)
          .single();

        if (profileError || profile?.role !== 'SUPER_ADMIN') {
          toast.error("Truy cập từ chối! Bạn không có quyền SUPER_ADMIN.");
          router.push("/");
          return;
        }

        setUser(session.user);
        if (profile.theme_preference === 'light') {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }

        // GỌI API BACKEND DỮ LIỆU THẬT
        const res = await fetch("https://ai-health-share-backend.onrender.com/admin/dashboard", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });

        const data = await res.json();
        
        if (!res.ok || data.status !== "success") {
          throw new Error(data.detail || "Không thể tải dữ liệu thống kê từ Server");
        }
        
        setStats(data.data.stats);
        setRevenueData(data.data.revenue_chart);
        setTopPartners(data.data.top_partners);

      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleThemeToggle = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const themeStr = newMode ? 'dark' : 'light';
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', themeStr);

    if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({ theme_preference: themeStr })
        });
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    const toastId = toast.loading("Đang đăng xuất...");
    try {
      await supabase.auth.signOut();
      toast.success("Đã đăng xuất thành công!", { id: toastId });
      router.push("/");
    } catch (error) {
      toast.error("Lỗi đăng xuất!", { id: toastId });
    }
  };

  if (isLoading || !isMounted) return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-violet-200 rounded-full animate-ping opacity-70"></div>
        <div className="absolute inset-2 bg-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30"><BarChart3 className="text-white w-6 h-6 animate-pulse" /></div>
      </div>
      <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">Đang đồng bộ dữ liệu...</p>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* 1. LEFT SIDEBAR DESKTOP */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-8" onClick={() => router.push('/')}><h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar pb-6">
          {/* Main App Links */}
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button onClick={() => router.push('/features/explore')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Compass size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Khám phá</span></button>
          <button onClick={() => router.push('/features/calendar')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><CalendarDays size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Lịch hẹn</span></button>
          <button onClick={() => router.push('/features/favorite')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Heart size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Yêu thích</span></button>
          <div className="mt-2 px-2">
            <button onClick={() => router.push('/features/AI')} className="w-full relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#80BF84] to-emerald-300 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 shadow-xl group-hover:scale-[1.02] transition-all"><Sparkles size={20} strokeWidth={3} /><span className="font-black text-sm tracking-wide">AI Trợ lý</span></div>
            </button>
          </div>
          
          <div className="w-full h-px bg-slate-200 dark:bg-white/10 my-4"></div>
          
          {/* Admin Specific Links */}
          <div className="px-4 py-2"><span className="text-xs font-black text-violet-500 tracking-wider uppercase">Vùng Quản Trị</span></div>
          
          <button onClick={() => router.push('/admin/profile')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:bg-violet-500/20 dark:hover:text-violet-400 font-bold transition-all group"><Crown size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Hồ sơ Tối cao</span></button>
          
          {/* Nút Đang Active */}
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold transition-all border border-violet-500/20">
            <Settings size={24} strokeWidth={2.5} className="animate-[spin_4s_linear_infinite]" />
            <span className="text-sm tracking-wide">Bảng Điều Khiển</span>
          </button>
        </div>

        {/* NÚT AVATAR VÀ MENU DESKTOP */}
        <div className="mt-auto px-2 relative pt-4 border-t border-slate-200 dark:border-white/10">
          {isUserMenuOpen && user && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
              <div className="absolute bottom-full mb-3 left-2 right-2 p-2 flex flex-col gap-1 z-50 animate-fade-in bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl">
                  <button onClick={() => router.push('/admin/profile')} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm w-full text-left"><Crown size={16} /> Hồ sơ Admin</button>
                  <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left"><LogOut size={16} /> Đăng xuất</button>
              </div>
            </>
          )}
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group border border-transparent hover:border-slate-300 dark:hover:border-white/10">
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center border border-violet-300 dark:border-violet-500/50 group-hover:border-violet-500 transition-colors"><Crown size={16} className="text-violet-600 dark:text-violet-400" /></div>
            <span className="text-sm tracking-wide truncate max-w-[120px] text-left">{user ? user.email.split('@')[0] : "Admin"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN ADMIN DASHBOARD AREA */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Nút Sáng Tối & Thông báo */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
          
          {/* NÚT THÔNG BÁO ĐÃ ĐƯỢC KẾT NỐI */}
          <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 hover:text-violet-500 transition-all shadow-lg">
            <Bell size={20}/>
            {hasNotification && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse"></span>}
          </button>
        </div>

        <div className="max-w-5xl mx-auto pt-20 md:pt-24 pb-32 px-6 md:px-12">
            
            <div className="mb-10 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">Tổng Quan <Sparkles className="text-violet-500 w-6 h-6 md:w-8 md:h-8" /></h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Theo dõi hiệu suất và sức khỏe toàn diện của nền tảng.</p>
            </div>

            {/* 1. WIDGET DOANH THU CHÍNH */}
            <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border border-emerald-500/20 shadow-xl relative overflow-hidden group mb-8 animate-slide-up">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-400/20 transition-colors duration-700"></div>
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-500" /> Tổng LTV Giao Dịch
                </p>
                <p className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">
                    {stats?.total_revenue?.toLocaleString() || 0} <span className="text-xl text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest">VND</span>
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-500/20">
                    <TrendingUp size={14} /> Dữ liệu cập nhật theo thời gian thực
                </div>
            </div>

            {/* 2. LƯỚI WIDGET THỐNG KÊ (GRID) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="p-5 flex flex-col justify-center rounded-[2rem] bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner"><Users size={20} strokeWidth={2.5} /></div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{stats?.total_users || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">Người dùng</p>
                </div>
                
                <div className="p-5 flex flex-col justify-center rounded-[2rem] bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400 flex items-center justify-center mb-3 shadow-inner"><Building2 size={20} strokeWidth={2.5} /></div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{stats?.total_partners || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">Đối tác (Spa)</p>
                </div>

                <div className="p-5 flex flex-col justify-center rounded-[2rem] bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-500/20 text-teal-500 dark:text-teal-400 flex items-center justify-center mb-3 shadow-inner"><Activity size={20} strokeWidth={2.5} /></div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{stats?.total_services || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">Dịch vụ</p>
                </div>

                <button onClick={() => toast.info("Đang tích hợp chức năng rút tiền!")} className="p-5 flex flex-col justify-center rounded-[2rem] bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none hover:bg-orange-50/50 dark:hover:bg-orange-500/10 transition-colors text-left group cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform"><Wallet size={20} strokeWidth={2.5} /></div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{stats?.pending_withdrawals || 0}</p>
                    <p className="text-[10px] font-bold text-orange-400 dark:text-orange-500 uppercase tracking-widest mt-1">Yêu cầu rút</p>
                </button>
            </div>

            {/* 3. BIỂU ĐỒ DOANH THU & TOP ĐỐI TÁC */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                
                {/* BIỂU ĐỒ */}
                <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border border-violet-500/20 shadow-xl">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp size={16} className="text-violet-500"/> Biến động Doanh Thu (7 Ngày)
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} opacity={0.5} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }} dy={10} />
                                <YAxis hide domain={['dataMin - 10000000', 'auto']} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)', backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', color: isDarkMode ? '#fff' : '#1e293b' }}
                                    itemStyle={{ fontWeight: 800 }}
                                    formatter={(value) => [`${Number(value).toLocaleString()} đ`, 'Doanh thu'] as [string, string]}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* LEADERBOARD */}
                <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-black/50 border border-violet-500/20 shadow-xl flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Building2 size={16} className="text-violet-500"/> Đối Tác Nổi Bật
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[250px]">
                        {topPartners?.length === 0 ? (
                            <div className="text-center py-10 flex flex-col items-center">
                                <Activity size={32} className="text-slate-300 dark:text-zinc-700 mb-2"/>
                                <p className="text-sm font-medium text-slate-400 dark:text-zinc-500">Hệ thống đang tích lũy dữ liệu...</p>
                            </div>
                        ) : (
                            topPartners?.map((partner, index) => (
                                <div key={index} className="bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/10 p-4 rounded-3xl flex items-center justify-between shadow-sm hover:bg-white/80 dark:hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black text-sm border border-violet-100 dark:border-violet-500/50">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 dark:text-zinc-200 text-sm truncate max-w-[120px] md:max-w-[180px]">{partner.email}</p>
                                            <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">{partner.total_bookings} lượt đặt</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-[#80BF84]">{partner.total_revenue?.toLocaleString()} đ</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>

        {/* 3. MOBILE BOTTOM DOCK */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} /></button>
            
            {/* Nút Center Dashboard Đang Active */}
            <button className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-400 p-[2px] shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:scale-105 transition-all duration-300">
                <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center">
                    <Settings size={26} className="text-violet-500 animate-[spin_4s_linear_infinite]" strokeWidth={2.5} />
                </div>
              </div>
            </button>
            
            <button onClick={() => router.push('/admin/profile')} className="text-slate-500 dark:text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors group"><Crown size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
            <div className="relative">
              {isUserMenuOpen && user && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute bottom-full mb-6 right-0 w-48 p-2 flex flex-col gap-1 z-50 animate-fade-in bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl">
                      <button onClick={() => router.push('/admin/profile')} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm w-full text-left"><Crown size={16} /> Hồ sơ Admin</button>
                      <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left"><LogOut size={16} /> Đăng xuất</button>
                  </div>
                </>
              )}
              <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group">
                <UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}