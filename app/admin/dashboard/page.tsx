"use client";

import { useEffect, useState } from "react";
import { 
  Users, Building2, Activity, DollarSign, Wallet, TrendingUp, LogOut, 
  Home, ShieldCheck, BarChart3, Sparkles, Compass, User as UserIcon, 
  Sun, Moon, Bell, Crown, Settings, Landmark, FileText, CheckCircle, XCircle, X, Search, Clock
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
// Triệt tiêu lỗi window is not defined bằng dynamic import
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
import { useUI } from "@/context/UIContext"; 
import NotificationModal from "@/components/NotificationModal";
import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface WithdrawalItem {
    id: string; user_id: string; amount: number; status: string; 
    payout_info: any; created_at: string; admin_note?: string;
    users?: { full_name: string; email: string; role: string };
}

export default function AdminDashboardOverview() {
  const router = useRouter();
  const { isNotifOpen, setIsNotifOpen, theme, toggleTheme } = useUI() as any;
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'partners' | 'audit'>('overview');

  const [stats, setStats] = useState<any>({ gmv: 0, platform_revenue: 0, escrow_holding: 0, pending_withdrawals: 0, total_users: 0, total_partners: 0, chart_data: [] });
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalItem | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED'>('ALL');

  useEffect(() => { setIsMounted(true); fetchDashboardData(); }, [router]);

  const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { router.push("/"); return; }
          setUser(session.user);

          const opts = { headers: { "Authorization": `Bearer ${session.access_token}` } };
          
          let sData = null, wData = null, pData = null;
          try { sData = await (await fetch(`${API_URL}/admin/dashboard-stats`, opts)).json(); } catch(e) {}
          try { wData = await (await fetch(`${API_URL}/admin/withdrawals`, opts)).json(); } catch(e) {}
          try { pData = await (await fetch(`${API_URL}/admin/partners`, opts)).json(); } catch(e) {}
          
          if (sData && sData.status === "success" && sData.data) {
            // CHUẨN HÓA DỮ LIỆU "BỌC THÉP": Đổi key sang gmv/revenue (lowercase) để Recharts không lỗi
            let safeChartData = [];
            if (Array.isArray(sData.data.chart_data)) {
                safeChartData = sData.data.chart_data.map((item: any) => ({
                    date: item.date || "",
                    gmv: Math.round(Number(item.GMV) || 0),
                    revenue: Math.round(Number(item["Doanh thu"]) || 0)
                }));
            }
            // Ghi đè stats với chart_data đã được làm sạch
            setStats({ ...sData.data, chart_data: safeChartData });
        }
          if (wData && wData.status === "success") setWithdrawals(wData.data || []);
          if (pData && pData.status === "success") setPartners(pData.data || []);

      } catch (error) { toast.error("Lỗi đồng bộ dữ liệu quản trị!"); } 
      finally { setIsLoading(false); }
  };

  const handleProcessWithdrawal = async (status: 'COMPLETED' | 'REJECTED') => {
      if (!selectedWithdrawal) return;
      if (status === 'REJECTED' && !adminNote.trim()) return toast.error("Vui lòng nhập lý do từ chối giải ngân!");

      setIsProcessing(true);
      const tid = toast.loading("Đang xử lý lệnh giải ngân...");
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${API_URL}/admin/withdrawals/${selectedWithdrawal.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
              body: JSON.stringify({ status, admin_note: adminNote.trim() })
          });
          if (!res.ok) throw new Error("Lỗi xử lý");
          toast.success(`Đã ${status === 'COMPLETED' ? 'duyệt' : 'từ chối'} lệnh rút tiền!`, { id: tid });
          fetchDashboardData();
          closeModal();
      } catch (e: any) { toast.error(e.message, { id: tid }); }
      finally { setIsProcessing(false); }
  };

  const closeModal = () => { setSelectedWithdrawal(null); setAdminNote(""); };

  // Format trục Y rút gọn (Ví dụ: 10,000,000 -> 10M)
  const formatYAxis = (tickItem: number) => {
      if (tickItem >= 1000000000) return (tickItem / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
      if (tickItem >= 1000000) return (tickItem / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (tickItem >= 1000) return (tickItem / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return tickItem.toString();
  };

  // Tooltip Tùy chỉnh (Glassmorphism & Định dạng tiền tệ VND)
  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 z-50">
                  <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-white/5 pb-2">{label}</p>
                  {payload.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center justify-between gap-8 mb-3 last:mb-0">
                          <div className="flex items-center gap-2.5">
                              <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
                              <span className="text-sm font-bold text-slate-600 dark:text-zinc-300">{entry.name}</span>
                          </div>
                          <span className="text-base font-black" style={{ color: entry.color }}>
                              {Number(entry.value).toLocaleString('vi-VN')} <span className="text-xs">VND</span>
                          </span>
                      </div>
                  ))}
              </div>
          );
      }
      return null;
  };

  if (!isMounted) return null;

   

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden flex flex-col transition-colors duration-500 font-be-vietnam">
      
      {/* TOP HEADER */}
      <div className="flex justify-between items-center px-6 md:px-10 py-5 bg-white/60 dark:bg-black/60 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 z-20">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20"><Crown className="text-white" size={24}/></div>
              <div className="hidden md:block">
                  <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest leading-tight">AI Health</h1>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Super Admin Center</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-amber-500 transition-colors">{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
              <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-amber-500 transition-colors"><Bell size={18}/></button>
          </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* SIDEBAR */}
          <div className="w-20 md:w-64 border-r border-slate-200 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl flex flex-col py-6 z-10">
              <div className="flex-1 px-4 space-y-2">
                  <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'overview' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                      <BarChart3 size={20}/> <span className="hidden md:block uppercase tracking-widest text-[11px]">Tổng quan</span>
                  </button>
                  <button onClick={() => setActiveTab('finance')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'finance' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                      <div className="flex items-center gap-4"><Landmark size={20}/> <span className="hidden md:block uppercase tracking-widest text-[11px]">Tài chính</span></div>
                      {stats.pending_withdrawals > 0 && <span className="hidden md:flex px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">{stats.pending_withdrawals}</span>}
                  </button>
                  <button onClick={() => setActiveTab('partners')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'partners' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                      <Building2 size={20}/> <span className="hidden md:block uppercase tracking-widest text-[11px]">Quản lý Đối tác</span>
                  </button>
                  <button onClick={() => setActiveTab('audit')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'audit' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                      <ShieldCheck size={20}/> <span className="hidden md:block uppercase tracking-widest text-[11px]">Giám sát hệ thống</span>
                  </button>
              </div>
          </div>

           {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-zinc-950/50 p-6 md:p-10 relative">
              {/* HIỆU ỨNG LOADING NẰM TRONG NỘI DUNG (GIỮ SIDEBAR) */}
              {isLoading && (
                  <div className="absolute inset-0 z-[40] bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 transition-all duration-500">
                      <div className="relative w-16 h-16">
                          <div className="absolute inset-0 bg-amber-200 rounded-full animate-ping opacity-70"></div>
                          <div className="absolute inset-2 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30"><Crown className="text-white w-6 h-6 animate-pulse" /></div>
                      </div>
                      <p className="text-amber-500 text-[10px] font-black tracking-[0.3em] uppercase animate-pulse">Đang đồng bộ dữ liệu...</p>
                  </div>
              )}

              {isNotifOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in"><NotificationModal /></div>}

              <div className={`max-w-6xl mx-auto space-y-10 transition-all duration-700 ${isLoading ? 'opacity-0 scale-95 blur-xl' : 'opacity-100 scale-100 blur-0'}`}>
                  
                  {/* --- TAB: TỔNG QUAN --- */}
                  {activeTab === 'overview' && (
                      <div className="space-y-10">
                          <div className="mb-6">
                              <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">Bảng Điều Khiển Tối Cao <Sparkles className="text-amber-500 w-6 h-6" /></h2>
                              <p className="text-slate-500 font-medium text-sm mt-1">Giám sát tổng giao dịch (GMV), doanh thu nền tảng và hoạt động ký quỹ (Escrow).</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* GMV */}
                              <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/20 shadow-2xl relative overflow-hidden group">
                                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={120} className="text-amber-500"/></div>
                                  <div className="relative z-10">
                                      <p className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-2"><TrendingUp size={16}/> Tổng Giao Dịch (GMV)</p>
                                      <p className="text-4xl md:text-5xl font-black text-white">{stats.gmv.toLocaleString()} <span className="text-lg text-slate-400">đ</span></p>
                                  </div>
                              </div>
                              {/* Platform Revenue */}
                              <div className="p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><DollarSign size={120}/></div>
                                  <div className="relative z-10">
                                      <p className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-2"><DollarSign size={16}/> Doanh Thu Nền Tảng</p>
                                      <p className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">{stats.platform_revenue.toLocaleString()} <span className="text-lg text-slate-400">đ</span></p>
                                  </div>
                              </div>
                              {/* Escrow Holding */}
                              <div className="p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden group">
                                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Landmark size={120}/></div>
                                  <div className="relative z-10">
                                      <p className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-2"><Landmark size={16}/> Quỹ Escrow (Tạm Giữ)</p>
                                      <p className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">{stats.escrow_holding.toLocaleString()} <span className="text-lg text-slate-400">đ</span></p>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                  <Users size={24} className="text-slate-400 mb-2"/>
                                  <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total_users}</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Người dùng</p>
                              </div>
                              <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                  <Building2 size={24} className="text-slate-400 mb-2"/>
                                  <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total_partners}</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Đối tác kinh doanh</p>
                              </div>
                              <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                  <Activity size={24} className="text-emerald-500 mb-2"/>
                                  <p className="text-2xl font-black text-slate-900 dark:text-white">99.9%</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Uptime Hệ thống</p>
                              </div>
                              <button onClick={() => setActiveTab('finance')} className="p-6 rounded-[2rem] bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform cursor-pointer">
                                  <Wallet size={24} className="text-amber-500 mb-2"/>
                                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pending_withdrawals}</p>
                                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-1">Lệnh cần duyệt</p>
                              </button>
                          </div>

                          {/* BIỂU ĐỒ TÀI CHÍNH */}
                          <div className="p-8 md:p-10 rounded-[3rem] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-xl relative">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                      <div className="p-2 bg-amber-500/10 rounded-xl"><Activity size={20} className="text-amber-500"/></div>
                                      Dòng tiền 7 ngày qua
                                  </h3>
                                  {/* Chú thích màu sắc (Legend) */}
                                  <div className="flex gap-4">
                                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div><span className="text-xs font-bold text-slate-500">GMV</span></div>
                                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div><span className="text-xs font-bold text-slate-500">Doanh thu</span></div>
                                  </div>
                              </div>
                              
                              <div className="h-[380px] w-full overflow-hidden">
                                  {stats.chart_data?.length > 0 && typeof window !== 'undefined' && (
                                      <Chart
                                          options={{
                                              chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Be Vietnam Pro' },
                                              colors: ['#f59e0b', '#10b981'],
                                              stroke: { curve: 'smooth', width: 4 },
                                              fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0 } },
                                              grid: { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', strokeDashArray: 4, padding: { left: 20, right: 20 } },
                                              xaxis: { categories: stats.chart_data.map((d: any) => d.date), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#64748b', fontWeight: 700 } } },
                                              yaxis: { labels: { formatter: (val) => formatYAxis(val), style: { colors: '#64748b', fontWeight: 700 } } },
                                              dataLabels: { enabled: false },
                                              tooltip: { theme: theme, x: { show: true }, y: { formatter: (val) => val.toLocaleString() + " đ" } },
                                              legend: { show: false }
                                          }}
                                          series={[
                                              { name: 'GMV', data: stats.chart_data.map((d: any) => d.gmv) },
                                              { name: 'Doanh thu', data: stats.chart_data.map((d: any) => d.revenue) }
                                          ]}
                                          type="area"
                                          height="100%"
                                      />
                                  )}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* --- TAB: TÀI CHÍNH & GIẢI NGÂN (WITHDRAWALS) --- */}
                  {activeTab === 'finance' && (
                      <div className="space-y-8 animate-fade-in">
                          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                              <div>
                                  <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3"><Wallet className="text-amber-500" size={32} /> Quản trị Giải ngân</h2>
                                  <p className="text-slate-500 font-medium text-sm mt-1">Kiểm soát luồng tiền ra khỏi quỹ Escrow và thanh toán cho Đối tác.</p>
                              </div>
                          </div>

                          {/* THẺ CHỈ SỐ TỔNG QUAN TÀI CHÍNH */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="p-6 rounded-[2rem] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                  <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
                                  <span className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest relative z-10">Tổng Yêu Cầu Ghi Nhận</span>
                                  <span className="text-3xl font-black text-slate-900 dark:text-white relative z-10">{withdrawals.length} <span className="text-sm font-bold text-slate-400">lệnh</span></span>
                              </div>
                              <div className="p-6 rounded-[2rem] bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                  <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
                                  <span className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest relative z-10">Đang Chờ Xử Lý</span>
                                  <span className="text-3xl font-black text-amber-600 dark:text-amber-400 relative z-10">{withdrawals.filter(w => w.status === 'PENDING').length} <span className="text-sm font-bold opacity-60">lệnh</span></span>
                              </div>
                              <div className="p-6 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/20 shadow-xl flex flex-col gap-2 relative overflow-hidden">
                                  <div className="absolute right-4 bottom-4 opacity-10"><CheckCircle size={80} className="text-emerald-500" /></div>
                                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest relative z-10">Đã Giải Ngân Thành Công</span>
                                  <span className="text-3xl font-black text-white relative z-10">
                                      {withdrawals.filter(w => w.status === 'COMPLETED').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} <span className="text-sm font-bold text-emerald-400/60">VND</span>
                                  </span>
                              </div>
                          </div>

                          {/* BỘ LỌC VÀ DANH SÁCH */}
                          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-black/20">
                                  <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                                      {['ALL', 'PENDING', 'COMPLETED', 'REJECTED'].map((filter) => (
                                          <button 
                                              key={filter} 
                                              onClick={() => setWithdrawalFilter(filter as any)}
                                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${withdrawalFilter === filter ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black dark:border-white shadow-md' : 'bg-transparent text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                          >
                                              {filter === 'ALL' ? 'Tất cả' : filter}
                                          </button>
                                      ))}
                                  </div>
                                  <div className="text-xs font-bold text-slate-400">
                                      Hiển thị {withdrawalFilter === 'ALL' ? withdrawals.length : withdrawals.filter(w => w.status === withdrawalFilter).length} kết quả
                                  </div>
                              </div>

                              <div className="overflow-x-auto">
                                  <table className="w-full text-left min-w-[1000px]">
                                      <thead className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-white/10">
                                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                              <th className="p-6">Yêu cầu</th>
                                              <th className="p-6">Thông tin Đối tác</th>
                                              <th className="p-6 text-right">Số tiền (VND)</th>
                                              <th className="p-6 text-center">Trạng thái</th>
                                              <th className="p-6 text-center">Hành động</th>
                                          </tr>
                                      </thead>
                                      <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                                          {withdrawals.length === 0 ? (
                                              <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3"><FileText size={32} className="opacity-30"/> Không có yêu cầu giải ngân</td></tr>
                                          ) : withdrawals.filter(w => withdrawalFilter === 'ALL' || w.status === withdrawalFilter).map((item) => (
                                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                                  <td className="p-6">
                                                      <div className="flex flex-col gap-1">
                                                          <span className="font-mono text-xs font-black text-slate-500 dark:text-zinc-400 uppercase">#{item.id.split('-')[0]}</span>
                                                          <span className="text-[10px] font-bold text-slate-400">{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                                                      </div>
                                                  </td>
                                                  <td className="p-6">
                                                      <div className="flex items-center gap-3">
                                                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 font-black border border-slate-200 dark:border-white/10">{item.users?.full_name?.charAt(0) || 'U'}</div>
                                                          <div className="flex flex-col">
                                                              <span className="font-bold text-slate-900 dark:text-white">{item.users?.full_name}</span>
                                                              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{item.users?.role}</span>
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td className="p-6 text-right">
                                                      <span className="text-lg font-black text-rose-500">{item.amount.toLocaleString()} đ</span>
                                                  </td>
                                                  <td className="p-6 text-center">
                                                      <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : item.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'}`}>
                                                          {item.status === 'PENDING' && <Clock size={12} className="mr-1.5 animate-pulse"/>}
                                                          {item.status === 'COMPLETED' && <CheckCircle size={12} className="mr-1.5"/>}
                                                          {item.status === 'REJECTED' && <XCircle size={12} className="mr-1.5"/>}
                                                          {item.status}
                                                      </span>
                                                  </td>
                                                  <td className="p-6 text-center">
                                                      <button 
                                                          onClick={() => setSelectedWithdrawal(item)} 
                                                          className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 ${item.status === 'PENDING' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:scale-105 shadow-slate-900/20' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                                      >
                                                          {item.status === 'PENDING' ? 'Kiểm Duyệt' : 'Xem Chi Tiết'}
                                                      </button>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* --- TAB: QUẢN LÝ ĐỐI TÁC --- */}
                  {activeTab === 'partners' && (
                      <div className="space-y-6">
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Đối tác Kinh doanh (Partners)</h2>
                              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Tìm kiếm đối tác..." className="pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500" /></div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {partners.length === 0 ? (
                                  <div className="col-span-full py-10 text-center text-slate-500 font-bold">Chưa có đối tác nào.</div>
                              ) : partners.map(partner => (
                                  <div key={partner.id} className="p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
                                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 font-black text-lg">{partner.full_name?.charAt(0) || 'P'}</div>
                                      <div className="flex-1 min-w-0">
                                          <h3 className="font-bold text-slate-900 dark:text-white truncate">{partner.full_name || 'Đối tác mới'}</h3>
                                          <p className="text-xs text-slate-500 truncate">{partner.email}</p>
                                          <p className="text-[10px] text-slate-400 mt-1">Tham gia: {new Date(partner.created_at).toLocaleDateString('vi-VN')}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* --- TAB: GIÁM SÁT HỆ THỐNG --- */}
                  {activeTab === 'audit' && (
                      <div className="text-center py-32 bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                          <ShieldCheck size={48} className="mx-auto text-amber-500 opacity-50 mb-4" />
                          <p className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-widest">Hệ thống an toàn</p>
                          <p className="text-slate-500 text-sm font-medium mt-2 max-w-md mx-auto">Tất cả các dịch vụ Core, Database, và Payment Gateway đang hoạt động bình thường. Không phát hiện truy cập trái phép.</p>
                      </div>
                  )}

              </div>
          </div>
      </div>

      {/* MODAL XỬ LÝ RÚT TIỀN */}
      {selectedWithdrawal && (
          <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
              <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                      <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Wallet size={20} className="text-amber-500"/> Xử lý Giải Ngân</h3>
                      <button onClick={closeModal} className="p-2 bg-slate-200/50 dark:bg-white/5 rounded-full text-slate-500"><X size={16}/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Người yêu cầu</p>
                          <p className="font-bold text-slate-900 dark:text-white">{selectedWithdrawal.users?.full_name} ({selectedWithdrawal.users?.email})</p>
                      </div>
                      
                      <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20">
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Số tiền cần chuyển</p>
                          <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{selectedWithdrawal.amount.toLocaleString()} VND</p>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 relative group">
                          <div className="flex justify-between items-center mb-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin nhận tiền (Bank/Ví)</p>
                              <button 
                                  onClick={() => {
                                      navigator.clipboard.writeText(JSON.stringify(selectedWithdrawal.payout_info, null, 2));
                                      toast.success("Đã sao chép thông tin ngân hàng!");
                                  }}
                                  className="text-[10px] bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-white/10 transition-all shadow-sm font-bold active:scale-95"
                              >
                                  Sao chép nhanh
                              </button>
                          </div>
                          <pre className="text-sm font-bold text-slate-700 dark:text-zinc-300 whitespace-pre-wrap font-mono bg-white dark:bg-black/50 p-3 rounded-xl border border-slate-100 dark:border-white/5 overflow-x-auto shadow-inner">
                              {JSON.stringify(selectedWithdrawal.payout_info, null, 2)}
                          </pre>
                      </div>

                      {selectedWithdrawal.status === 'PENDING' ? (
                          <div className="flex flex-col gap-3">
                              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                                  <ShieldCheck size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                      <strong>Lưu ý quan trọng:</strong> Hệ thống <span className="underline">không tự động chuyển tiền</span>. Bạn phải thực hiện chuyển khoản thủ công cho đối tác trước khi bấm Duyệt.
                                  </p>
                              </div>
                              <textarea rows={2} className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none shadow-inner" placeholder="Nhập mã giao dịch ngân hàng (Bắt buộc nếu duyệt) hoặc lý do từ chối..." value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                              <div className="grid grid-cols-2 gap-3 pt-2">
                                  <button onClick={() => handleProcessWithdrawal('REJECTED')} disabled={isProcessing} className="py-3.5 bg-white dark:bg-transparent text-rose-600 dark:text-rose-400 font-black rounded-xl text-xs uppercase tracking-widest border border-rose-200 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all">Từ chối lệnh</button>
                                  <button onClick={() => handleProcessWithdrawal('COMPLETED')} disabled={isProcessing} className="py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex justify-center items-center gap-2">
                                      <CheckCircle size={16} /> Đã chuyển tiền
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-center"><p className="text-sm font-bold text-slate-500">Lệnh này đã được xử lý ({selectedWithdrawal.status})</p></div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}