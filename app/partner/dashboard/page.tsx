"use client";

import { useEffect, useState } from "react";
import { 
  Home, LayoutDashboard, DollarSign, Sun, Moon, 
  CheckCircle, Clock, CreditCard, Wallet, TrendingUp, ShieldCheck,
  CalendarDays, CalendarClock, Check, X, History, FileText, Building2, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// --- KHỞI TẠO SUPABASE CLIENT & API ---

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Booking {
  id: string;
  user_id: string;
  service_id: string | null;
  video_id: string | null;
  affiliate_id: string | null;
  total_amount: number;
  payment_status: string;
  service_status: string;
  partner_revenue?: number;
  platform_fee?: number;
  affiliate_revenue?: number;
}

export default function PartnerDashboard() {
  const router = useRouter();
  
  // --- STATE HỆ THỐNG ---
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- STATE DỮ LIỆU ---
  const [activeTab, setActiveTab] = useState<'escrow' | 'appointments' | 'wallet' | 'withdrawals'>('escrow');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [walletInfo, setWalletInfo] = useState({ balance: 0, total_earned: 0 });
  const [myWithdrawals, setMyWithdrawals] = useState<any[]>([]);
  
  // State lưu form & Check-in
  const [respondForms, setRespondForms] = useState<Record<string, { start: string, end: string, reason: string }>>({});
  const [checkInCodes, setCheckInCodes] = useState<Record<string, string>>({});
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: '', bank_name: '', account_number: '', account_name: '' });

  // Khởi tạo Theme & Fetch Dữ liệu an toàn
  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      // 1. Lấy dữ liệu Đơn hàng Escrow
      const resBookings = await fetch(`${API_URL}/partner/bookings`, { headers: { "Authorization": `Bearer ${session.access_token}` } });
      const dataBookings = await resBookings.json();
      if (resBookings.ok && dataBookings.status === "success") setBookings(dataBookings.data || []); 

      // 2. Lấy dữ liệu Lịch hẹn (Dành cho Tab mới)
      const resAppts = await fetch(`${API_URL}/appointments/me`, { headers: { "Authorization": `Bearer ${session.access_token}` } });
      const dataAppts = await resAppts.json();
      if (resAppts.ok && dataAppts.status === "success") setAppointments(dataAppts.data || []); 

      // 3. Lấy dữ liệu Ví nội bộ của Partner
      const resWallet = await supabase.from("wallets").select("*").eq("user_id", session.user.id).single();
      if (resWallet.data) setWalletInfo({ balance: Number(resWallet.data.balance), total_earned: Number(resWallet.data.total_earned) });

      // 4. Lấy lịch sử rút tiền
      const resWith = await fetch(`${API_URL}/partner/withdrawals`, { headers: { "Authorization": `Bearer ${session.access_token}` } });
      const dataWith = await resWith.json();
      if (resWith.ok && dataWith.status === "success") setMyWithdrawals(dataWith.data || []);

    } catch (error) {
      toast.error("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') { setIsDarkMode(false); document.documentElement.classList.remove('dark'); } 
    else { setIsDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchData();
  }, [router]);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode; setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // --- HÀM XỬ LÝ: XÁC NHẬN HOÀN THÀNH ESCROW (CŨ) ---
  const handleCompleteService = async (bookingId: string) => {
    const toastId = toast.loading("Đang kết nối trung tâm đối soát Escrow...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/bookings/${bookingId}/complete`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }
      });
      const result = await res.json();
      if (res.ok && result.status === "success") {
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-emerald-600">🎉 Giải ngân thành công!</span>
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">Doanh thu của bạn: +{Number(result.distribution.partner_revenue).toLocaleString()} VND</span>
          </div>, { id: toastId, duration: 5000 }
        );
        fetchData();
      } else toast.error(`Lỗi: ${result.detail || 'Từ chối giải ngân từ hệ thống'}`, { id: toastId });
    } catch (error) { toast.error("Lỗi kết nối đến máy chủ bảo mật.", { id: toastId }); }
  };

  // --- HÀM XỬ LÝ: CHECK-IN & RÚT TIỀN (MỚI THÊM) ---
  const handleCheckIn = async (appointmentId: string) => {
      const code = checkInCodes[appointmentId];
      if (!code || code.length !== 6) return toast.error("Vui lòng nhập đúng mã Check-in 6 số!");
      const tid = toast.loading("Đang xác thực Check-in...");
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${API_URL}/appointments/${appointmentId}/check-in`, {
              method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
              body: JSON.stringify({ check_in_code: code })
          });
          const result = await res.json();
          if (res.ok) { toast.success("Xác thực thành công! Khách đã Check-in.", { id: tid }); fetchData(); }
          else throw new Error(result.detail);
      } catch (e: any) { toast.error(e.message || "Mã Check-in không hợp lệ", { id: tid }); }
  };

  const handleWithdrawal = async () => {
    const tid = toast.loading("Đang gửi yêu cầu giải ngân...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/partner/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          amount: Number(withdrawalForm.amount),
          bank_name: withdrawalForm.bank_name,
          account_number: withdrawalForm.account_number,
          account_name: withdrawalForm.account_name
        })
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message, { id: tid });
        setWithdrawalForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
        fetchData(); // Load lại số dư mới từ DB
      } else throw new Error(result.detail);
    } catch (e: any) { toast.error(e.message, { id: tid }); }
  };

  // --- HÀM XỬ LÝ: DUYỆT LỊCH HẸN (MỚI THÊM) ---
  const handleFormChange = (id: string, field: 'start' | 'end' | 'reason', value: string) => {
      setRespondForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleRespondAppointment = async (appointmentId: string, action: 'ACCEPT' | 'REJECT') => {
      const form = respondForms[appointmentId] || {};
      const tid = toast.loading("Đang gửi phản hồi...");
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const payload: any = { action };
          
          if (action === 'ACCEPT') {
              if (!form.start || !form.end) return toast.error("Vui lòng chọn ngày giờ bắt đầu và kết thúc!", { id: tid });
              payload.start_time = new Date(form.start).toISOString();
              payload.end_time = new Date(form.end).toISOString();
          } else {
              if (!form.reason) return toast.error("Vui lòng nhập lý do từ chối!", { id: tid });
              payload.reason = form.reason;
          }

          const res = await fetch(`${API_URL}/appointments/${appointmentId}/respond`, {
              method: "PATCH", 
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
              body: JSON.stringify(payload)
          });
          const result = await res.json();
          if (res.ok) {
              toast.success(result.message, { id: tid });
              fetchData(); 
          } else throw new Error(result.detail);
      } catch (e: any) { toast.error(e.message || "Lỗi xử lý", { id: tid }); }
  };

  // Lọc chuẩn: Chỉ lấy những đơn hàng hợp lệ (PAID hoặc đã COMPLETED) để tính toán và hiển thị
  const validBookings = bookings.filter(b => b.payment_status === "PAID" || b.service_status === "COMPLETED");
  const totalRevenue = validBookings.filter(b => b.service_status === "COMPLETED").reduce((sum, b) => sum + (Number(b.partner_revenue) || 0), 0);
  const pendingEscrow = validBookings.filter(b => b.service_status !== "COMPLETED").reduce((sum, b) => sum + (Number(b.total_amount) * 0.7), 0); 
  const pendingAppointments = appointments.filter(a => a.status === 'WAITING_PARTNER');

  if (!isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-zinc-950"></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden flex relative transition-colors duration-500 font-be-vietnam">
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>

        <div className="max-w-[1400px] mx-auto pt-24 pb-32 px-4 md:px-8 xl:px-12">
            <div className="mb-8 animate-slide-up flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3 tracking-tight">
                        <ShieldCheck className="text-[#80BF84]" size={36} /> Quản lý Đối tác
                    </h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm">Theo dõi lịch đặt, kiểm soát dòng tiền an toàn và xác nhận giải ngân.</p>
                </div>

                <div className="flex p-1.5 bg-white dark:bg-white/5 shadow-sm rounded-2xl w-full md:w-max border border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('escrow')} className={`px-5 py-2.5 rounded-xl font-bold text-sm flex-1 md:flex-none transition-all flex items-center justify-center gap-2 ${activeTab === 'escrow' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                        <Wallet size={16} /> Escrow
                    </button>
                    <button onClick={() => setActiveTab('appointments')} className={`px-5 py-2.5 rounded-xl font-bold text-sm flex-1 md:flex-none transition-all flex items-center justify-center gap-2 relative ${activeTab === 'appointments' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                        <CalendarClock size={16} /> Lịch hẹn
                        {pendingAppointments.length > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black animate-bounce">{pendingAppointments.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('wallet')} className={`px-5 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all flex items-center justify-center gap-2 ${activeTab === 'wallet' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                        <CreditCard size={16} /> Ví & Rút tiền
                    </button>
                    <button onClick={() => setActiveTab('withdrawals')} className={`px-5 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all flex items-center justify-center gap-2 ${activeTab === 'withdrawals' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                        <History size={16} /> Lịch sử rút tiền
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="w-full flex flex-col gap-6 animate-pulse mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl"></div><div className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl"></div><div className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl"></div></div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    
                    {/* ================= TAB 1: DÒNG TIỀN ESCROW (GIỮ NGUYÊN) ================= */}
                    {activeTab === 'escrow' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="glass-panel p-6 rounded-[2rem] bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex flex-col gap-2 shadow-sm">
                                    <span className="text-xs font-black text-slate-500 dark:text-zinc-400 flex items-center gap-2 tracking-widest uppercase"><Wallet size={16}/> TỔNG ĐƠN GIAO DỊCH</span>
                                    <span className="text-4xl font-black text-slate-800 dark:text-white">{bookings.length} <span className="text-base font-bold text-slate-400">đơn</span></span>
                                </div>
                                <div className="glass-panel p-6 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 flex flex-col gap-2 shadow-sm">
                                    <span className="text-xs font-black text-amber-600 dark:text-amber-500 flex items-center gap-2 tracking-widest uppercase"><Clock size={16}/> ĐANG NEO GIỮ (ƯỚC TÍNH 70%)</span>
                                    <span className="text-4xl font-black text-slate-800 dark:text-white">{pendingEscrow.toLocaleString()} <span className="text-base font-bold text-slate-400">VND</span></span>
                                </div>
                                <div className="glass-panel p-6 rounded-[2rem] bg-gradient-to-br from-[#80BF84]/10 to-transparent border border-[#80BF84]/20 flex flex-col gap-2 shadow-sm">
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-500 flex items-center gap-2 tracking-widest uppercase"><TrendingUp size={16}/> DOANH THU THỰC NHẬN</span>
                                    <span className="text-4xl font-black text-slate-800 dark:text-white">{totalRevenue.toLocaleString()} <span className="text-base font-bold text-slate-400">VND</span></span>
                                </div>
                            </div>

                            <div className="glass-panel rounded-[2.5rem] bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                        <thead>
                                            <tr className="bg-slate-100/50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest border-b border-slate-200 dark:border-white/10">
                                                <th className="p-6 font-black">Mã Đơn</th>
                                                <th className="p-6 font-black">Nguồn đơn</th>
                                                <th className="p-6 font-black">Trạng thái Tiền</th>
                                                <th className="p-6 font-black">Tiến độ Dịch vụ</th>
                                                <th className="p-6 font-black text-right">Doanh thu dự kiến</th>
                                                <th className="p-6 font-black text-center">Giải ngân</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                                            {validBookings.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-16 text-center text-slate-400 dark:text-zinc-600 font-bold flex flex-col items-center gap-3">
                                                        <ShieldCheck size={40} className="opacity-30" />
                                                        Chưa có giao dịch bảo chứng nào được ghi nhận.
                                                    </td>
                                                </tr>
                                            ) : (
                                                validBookings.map((booking) => {
                                                    const appt = appointments.find(a => a.booking_id === booking.id);
                                                    return (
                                                    <tr key={booking.id} className="hover:bg-white dark:hover:bg-white/5 transition-colors group">
                                                        <td className="p-6 font-mono text-xs font-bold text-slate-500 dark:text-zinc-400">#{booking.id.substring(0, 8)}</td>
                                                        <td className="p-6"><span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-white/10 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-300 tracking-wider">{booking.video_id ? 'TỪ TIKTOK FEED' : 'TỪ HỒ SƠ DỊCH VỤ'}</span></td>
                                                        <td className="p-6">
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20"><CreditCard size={14} /> Đã Thanh Toán</div>
                                                        </td>
                                                        <td className="p-6">
                                                            {booking.service_status === "COMPLETED" ? (
                                                                <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-[#80BF84] text-xs font-black"><CheckCircle size={16} /> HOÀN TẤT</div>
                                                            ) : appt?.status === "SERVED" ? (
                                                                <div className="inline-flex items-center gap-1.5 text-blue-500 text-xs font-black"><Check size={16} /> ĐÃ CHECK-IN</div>
                                                            ) : (
                                                                <div className="inline-flex items-center gap-1.5 text-amber-500 text-xs font-black"><Clock size={16} /> CHỜ KHÁCH ĐẾN</div>
                                                            )}
                                                        </td>
                                                        <td className="p-6 font-black text-slate-800 dark:text-white text-right">
                                                            {booking.service_status === "COMPLETED" ? <span className="text-[#80BF84]">{Number(booking.partner_revenue).toLocaleString()} đ</span> : <span>~{(Number(booking.total_amount) * 0.7).toLocaleString()} đ</span>}
                                                        </td>
                                                        <td className="p-6 text-center min-w-[200px]">
                                                            {booking.service_status === "COMPLETED" ? (
                                                                <span className="text-xs font-bold text-slate-400">Đã cộng tiền vào Ví</span>
                                                            ) : appt?.status === "CONFIRMED" ? (
                                                                <div className="flex justify-center gap-2">
                                                                    <input type="text" maxLength={6} placeholder="Mã 6 số..." value={checkInCodes[appt.id] || ''} onChange={e => setCheckInCodes(prev => ({...prev, [appt.id]: e.target.value}))} className="w-24 px-3 py-2 rounded-xl text-center text-xs font-bold border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black focus:border-[#80BF84] outline-none" />
                                                                    <button onClick={() => handleCheckIn(appt.id)} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:scale-105 transition-all">Check-in</button>
                                                                </div>
                                                            ) : appt?.status === "SERVED" ? (
                                                                <button onClick={() => handleCompleteService(booking.id)} className="w-full px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black tracking-widest uppercase rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95">Hoàn Thành & Rút Tiền</button>
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-400 italic">Đang chờ xử lý</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ================= TAB 2: DUYỆT LỊCH HẸN MỚI THÊM ================= */}
                    {activeTab === 'appointments' && (
                        <div className="flex flex-col gap-6">
                            {pendingAppointments.length === 0 ? (
                                <div className="glass-panel p-16 text-center text-slate-400 dark:text-zinc-500 font-bold flex flex-col items-center gap-4 rounded-[2.5rem] bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10">
                                    <CalendarDays size={48} className="opacity-20" />
                                    <p className="text-lg">Tuyệt vời! Hiện tại không có yêu cầu đặt lịch nào đang tồn đọng.</p>
                                </div>
                            ) : (
                                pendingAppointments.map(appt => {
                                    const form = respondForms[appt.id] || {};
                                    return (
                                        <div key={appt.id} className="glass-panel p-6 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col xl:flex-row gap-6">
                                            
                                            {/* Cột thông tin khách hàng */}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[10px] font-black rounded-full uppercase tracking-wider border border-amber-200 dark:border-amber-500/30">
                                                        YÊU CẦU ĐẶT CHỖ MỚI
                                                    </div>
                                                    <span className="font-black text-lg text-[#80BF84] bg-[#80BF84]/10 px-3 py-1 rounded-xl shadow-sm">
                                                        {appt.total_amount ? Number(appt.total_amount).toLocaleString() + ' đ' : 'Chưa có giá'}
                                                    </span>
                                                </div>
                                                
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2">
                                                    {appt.services?.service_name || (appt.video_id ? "Dịch vụ từ Video Khám phá" : "Dịch vụ chăm sóc sức khỏe")}
                                                </h3>
                                                
                                                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 mb-2">
                                                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-2">Khách hàng: <span className="font-bold text-slate-900 dark:text-white">{appt.customer_name || appt.users?.full_name || "Khách ẩn danh"}</span></p>
                                                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-2">Liên hệ: <span className="font-bold text-slate-900 dark:text-white">{appt.customer_phone || appt.users?.phone || "Chưa cập nhật SĐT"}</span></p>
                                                </div>

                                                {appt.note && (
                                                    <div className="mt-4 p-3 bg-slate-50 dark:bg-black/50 rounded-xl border border-slate-100 dark:border-white/5 text-sm text-slate-600 dark:text-zinc-400 italic">
                                                        " {appt.note} "
                                                    </div>
                                                )}
                                            </div>

                                            {/* Cột thao tác Đồng ý / Từ chối */}
                                            <div className="w-full xl:w-[380px] flex flex-col gap-4">
                                                
                                                {/* Khối Đồng Ý */}
                                                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-3">
                                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase"><Check size={14}/> Xếp lịch & Báo giá</span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] text-slate-500 font-bold uppercase pl-1">Giờ Bắt Đầu</label>
                                                            <input type="datetime-local" className="text-xs p-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black outline-none" value={form.start || ''} onChange={e => handleFormChange(appt.id, 'start', e.target.value)} />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] text-slate-500 font-bold uppercase pl-1">Giờ Kết Thúc</label>
                                                            <input type="datetime-local" className="text-xs p-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black outline-none" value={form.end || ''} onChange={e => handleFormChange(appt.id, 'end', e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleRespondAppointment(appt.id, 'ACCEPT')} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-emerald-500/20">Chốt lịch gửi cho khách</button>
                                                </div>

                                                {/* Khối Từ Chối */}
                                                <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-500/20 flex flex-col gap-3">
                                                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 uppercase"><X size={14}/> Từ chối tiếp nhận</span>
                                                    <input type="text" placeholder="Ghi rõ lý do từ chối..." className="text-xs p-2.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-black outline-none" value={form.reason || ''} onChange={e => handleFormChange(appt.id, 'reason', e.target.value)} />
                                                    <button onClick={() => handleRespondAppointment(appt.id, 'REJECT')} className="w-full py-2.5 bg-white dark:bg-black text-rose-600 font-bold rounded-xl text-sm transition-colors border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-900/30">Hủy yêu cầu</button>
                                                </div>

                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}

                    {/* ================= TAB 3: VÍ NỘI BỘ & RÚT TIỀN (MỚI THÊM) ================= */}
                    {activeTab === 'wallet' && (
                        <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-slide-up">
                            {/* Thẻ Ví */}
                            <div className="glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 dark:from-black dark:to-zinc-900 border border-slate-700 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-slate-400 font-bold text-sm tracking-widest uppercase flex items-center gap-2"><Wallet size={18}/> Số dư hiện tại</span>
                                        <span className="text-5xl font-black text-white">{walletInfo.balance.toLocaleString()} <span className="text-2xl text-slate-400">VND</span></span>
                                        <p className="text-emerald-400 text-sm mt-2 font-medium bg-emerald-500/10 w-max px-3 py-1 rounded-lg">Tổng doanh thu đã kiếm: {walletInfo.total_earned.toLocaleString()} VND</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-400 text-xs mb-2 block font-medium">Bảo chứng bởi AI Health Escrow</span>
                                        <div className="h-10 w-16 bg-white/10 rounded-lg backdrop-blur-md border border-white/20"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Rút Tiền */}
                            <div className="glass-panel p-6 md:p-8 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Yêu cầu Giải ngân (Rút tiền)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Ngân hàng thụ hưởng</label>
                                        <input type="text" placeholder="VD: Vietcombank, Techcombank..." value={withdrawalForm.bank_name} onChange={e => setWithdrawalForm({...withdrawalForm, bank_name: e.target.value})} className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black outline-none focus:border-blue-500 transition-colors font-medium text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Số tài khoản</label>
                                        <input type="text" placeholder="Nhập số tài khoản..." value={withdrawalForm.account_number} onChange={e => setWithdrawalForm({...withdrawalForm, account_number: e.target.value})} className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black outline-none focus:border-blue-500 transition-colors font-mono font-medium text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Tên chủ tài khoản</label>
                                        <input type="text" placeholder="NGUYEN VAN A" value={withdrawalForm.account_name} onChange={e => setWithdrawalForm({...withdrawalForm, account_name: e.target.value})} className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black outline-none focus:border-blue-500 transition-colors font-medium uppercase text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Số tiền muốn rút (VND)</label>
                                        <input type="number" placeholder="Tối thiểu 50.000" value={withdrawalForm.amount} onChange={e => setWithdrawalForm({...withdrawalForm, amount: e.target.value})} className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black outline-none focus:border-blue-500 transition-colors font-black text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <button onClick={handleWithdrawal} className="w-full mt-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.01] transition-transform shadow-xl shadow-slate-900/20 dark:shadow-white/10">
                                    Gửi yêu cầu Rút tiền
                                </button>
                                <p className="text-xs text-center text-slate-500 mt-4">Yêu cầu sẽ được Super Admin kiểm duyệt và chuyển khoản trong vòng 24h làm việc.</p>
                            </div>
                        </div>
                    )}

                    {/* ================= TAB 4: LỊCH SỬ RÚT TIỀN (MỚI THÊM) ================= */}
                    {activeTab === 'withdrawals' && (
                        <div className="flex flex-col gap-4 animate-slide-up max-w-4xl mx-auto">
                            {myWithdrawals.length === 0 ? (
                                <div className="glass-panel p-16 text-center text-slate-400 dark:text-zinc-500 font-bold flex flex-col items-center gap-4 rounded-[2.5rem] bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10">
                                    <FileText size={48} className="opacity-20" />
                                    <p className="text-lg">Bạn chưa có yêu cầu rút tiền nào.</p>
                                </div>
                            ) : (
                                myWithdrawals.map(req => (
                                    <div key={req.id} className="p-6 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 hover:-translate-y-1 transition-transform">
                                        
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-widest">#{req.id.split('-')[0]}</span>
                                                <span className="text-xs font-bold text-slate-500">{new Date(req.created_at).toLocaleString('vi-VN')}</span>
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                {Number(req.amount).toLocaleString()} <span className="text-sm font-bold text-slate-400">VND</span>
                                            </h4>
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-black/50 w-max px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5 mt-1">
                                                <Building2 size={14}/> {req.payout_info?.bank_name} <span className="text-slate-300 dark:text-zinc-600">|</span> <span className="font-mono">{req.payout_info?.account_number}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-start md:items-end gap-2">
                                            {req.status === 'PENDING' && (
                                                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-200 dark:border-amber-500/20 flex items-center gap-1.5">
                                                    <Clock size={14} className="animate-pulse"/> Đang chờ duyệt
                                                </span>
                                            )}
                                            {req.status === 'COMPLETED' && (
                                                <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1.5">
                                                    <CheckCircle size={14}/> Đã giải ngân
                                                </span>
                                            )}
                                            {req.status === 'REJECTED' && (
                                                <span className="px-3 py-1.5 bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-200 dark:border-rose-500/20 flex items-center gap-1.5">
                                                    <XCircle size={14}/> Bị từ chối
                                                </span>
                                            )}
                                            
                                            {/* Ghi chú của Admin */}
                                            {req.admin_note && req.status === 'REJECTED' && (
                                                <div className="text-right">
                                                    <p className="text-[11px] font-bold text-rose-500 max-w-xs leading-snug">Lý do: {req.admin_note}</p>
                                                    <p className="text-[10px] font-black text-rose-400 mt-0.5 opacity-80 uppercase tracking-wider">Tiền đã được hoàn lại vào ví</p>
                                                </div>
                                            )}
                                            {req.admin_note && req.status === 'COMPLETED' && (
                                                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 max-w-xs text-left md:text-right mt-1">
                                                    Mã GD: {req.admin_note}
                                                </p>
                                            )}
                                        </div>

                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* ================= MOBILE BOTTOM DOCK ================= */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/partner/profile')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><LayoutDashboard size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button className="text-[#80BF84] transition-colors group"><DollarSign size={26} strokeWidth={2.5} className="scale-110" /></button>
          </div>
        </div>

      </div>
    </div>
  );
}