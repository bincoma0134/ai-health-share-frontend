"use client";

import { useEffect, useState } from "react";
import { Users, Building2, Activity, DollarSign, Wallet, TrendingUp, LogOut, Home, ShieldCheck, BarChart3, Sparkles } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// --- KHỞI TẠO SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu biến môi trường Supabase!");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboardOverview() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topPartners, setTopPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError || profile?.role !== 'SUPER_ADMIN') {
          toast.error("Truy cập từ chối! Bạn không có quyền SUPER_ADMIN.");
          router.push("/");
          return;
        }

        setUser(session.user);

        // GỌI API BACKEND DỮ LIỆU THẬT
        const res = await fetch("https://ai-health-share-backend.onrender.com/admin/dashboard", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });

        const data = await res.json();
        
        if (!res.ok || data.status !== "success") {
          throw new Error(data.detail || "Không thể tải dữ liệu thống kê từ Server");
        }
        
        // Gán dữ liệu thật vào State
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-70"></div>
          <div className="absolute inset-2 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BarChart3 className="text-white w-6 h-6 animate-pulse" />
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase animate-pulse">Đang đồng bộ dữ liệu thực tế...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-slate-50 overflow-hidden relative flex flex-col font-sans">
      
      {/* Background Gradient */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[150%] max-w-4xl h-96 bg-gradient-to-b from-indigo-300/30 via-purple-300/10 to-transparent rounded-full blur-[80px] pointer-events-none -z-10"></div>

      {/* KHU VỰC CUỘN CHÍNH */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 px-4 md:px-8 relative z-0 animate-slide-up">
        <div className="max-w-4xl mx-auto pt-12">
          
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Tổng Quan <Sparkles className="text-indigo-500 w-5 h-5" />
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Hệ sinh thái AI Health</p>
            </div>
            <button onClick={handleLogout} className="p-2.5 text-slate-400 hover:text-rose-500 bg-white/60 rounded-full transition-all active:scale-90 shadow-sm border border-white/80">
              <LogOut size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* 1. WIDGET DOANH THU CHÍNH */}
          <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] mb-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" /> Tổng LTV Giao Dịch
            </p>
            <p className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter drop-shadow-sm">
              {stats?.total_revenue?.toLocaleString() || 0} <span className="text-xl text-slate-400 font-bold uppercase tracking-widest">VND</span>
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100">
              <TrendingUp size={14} /> Dữ liệu cập nhật theo thời gian thực
            </div>
          </div>

          {/* 2. LƯỚI WIDGET THỐNG KÊ (GRID) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-center">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3 shadow-inner"><Users size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-slate-800">{stats?.total_users || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Người dùng</p>
            </div>
            
            <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-center">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-3 shadow-inner"><Building2 size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-slate-800">{stats?.total_partners || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Đối tác (Spa)</p>
            </div>

            <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-center">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center mb-3 shadow-inner"><Activity size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-slate-800">{stats?.total_services || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dịch vụ</p>
            </div>

            <button 
              onClick={() => router.push('/admin')}
              className="glass-card p-5 rounded-[2rem] flex flex-col justify-center hover:bg-orange-50/50 transition-colors text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform"><Wallet size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-slate-800">{stats?.pending_withdrawals || 0}</p>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1">Yêu cầu rút</p>
            </button>
          </div>

          {/* 3. BIỂU ĐỒ DOANH THU */}
          <div className="glass-panel p-6 rounded-[2.5rem] mb-8">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500"/> Biến động Doanh Thu (7 Ngày)
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                  <YAxis hide domain={['dataMin - 10000000', 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', color: '#1e293b' }}
                    itemStyle={{ fontWeight: 800 }}
                    formatter={(value: number) => [`${value.toLocaleString()} đ`, 'Doanh thu']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. TOP ĐỐI TÁC (LEADERBOARD) */}
          <div className="glass-panel p-6 md:p-8 rounded-[2.5rem]">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500"/> Đối Tác Nổi Bật
            </h3>
            <div className="space-y-3">
              {topPartners?.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-slate-400">Hệ thống đang tích lũy dữ liệu...</p>
                </div>
              ) : (
                topPartners?.map((partner, index) => (
                  <div key={index} className="bg-white/50 border border-white/60 p-4 rounded-3xl flex items-center justify-between shadow-sm hover:bg-white/80 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center font-black text-sm border border-indigo-100">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-sm truncate max-w-[150px] md:max-w-xs">{partner.email}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{partner.total_bookings} lượt đặt</p>
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

      {/* FLOATING BOTTOM DOCK */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up w-max max-w-[90%]">
        <div className="glass-panel px-6 py-4 rounded-[2rem] flex items-center justify-center gap-8 shadow-2xl shadow-indigo-900/10 border-white/80">
          
          <button onClick={() => router.push("/")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-800 transition-colors group relative">
            <Home size={22} className="group-hover:-translate-y-1 transition-transform" />
            <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 absolute -bottom-2 transition-opacity">Feed</span>
          </button>
          
          <div className="flex flex-col items-center gap-1 text-indigo-500 relative">
            <div className="absolute -top-10 bg-indigo-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <BarChart3 size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold mt-5 tracking-wider">Thống kê</span>
          </div>

          <button onClick={() => router.push("/admin")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-500 transition-colors group relative">
            <div className="relative">
              <ShieldCheck size={22} className="group-hover:-translate-y-1 transition-transform" />
              {stats?.pending_withdrawals > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border-2 border-white"></span></span>
              )}
            </div>
            <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 absolute -bottom-2 transition-opacity">Duyệt</span>
          </button>

        </div>
      </div>

    </div>
  );
}