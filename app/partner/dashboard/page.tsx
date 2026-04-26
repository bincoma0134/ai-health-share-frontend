"use client";

import { useEffect, useState } from "react";
import { 
  Home, LayoutDashboard, DollarSign, Sun, Moon, 
  CheckCircle, Clock, CreditCard, Wallet, TrendingUp, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// --- KHỞI TẠO SUPABASE CLIENT & API ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Thiếu biến môi trường Supabase!");
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Đồng bộ Interface chuẩn từ Database mới cập nhật
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
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Khởi tạo Theme & Fetch Dữ liệu an toàn
  const fetchBookings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      // Gọi API mới chuẩn của hệ thống kèm xác thực
      const response = await fetch(`${API_URL}/partner/bookings`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      
      if (response.ok && result.status === "success") {
        setBookings(result.data || []); 
      }
    } catch (error) {
      toast.error("Không thể kết nối đến máy chủ Escrow an toàn.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    
    // Đồng bộ Theme
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    fetchBookings();
  }, [router]);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // --- HÀM XỬ LÝ: XÁC NHẬN HOÀN THÀNH (BẢO CHỨNG) ---
  const handleCompleteService = async (bookingId: string) => {
    const toastId = toast.loading("Đang kết nối trung tâm đối soát Escrow...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${API_URL}/bookings/${bookingId}/complete`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        }
      });
      
      const result = await res.json();

      if (res.ok && result.status === "success") {
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-emerald-600">🎉 Giải ngân thành công!</span>
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">Doanh thu của bạn: +{Number(result.distribution.partner_revenue).toLocaleString()} VND</span>
            {Number(result.distribution.affiliate_revenue) > 0 && (
                <span className="text-[10px] text-amber-600">Hoa hồng giới thiệu: {Number(result.distribution.affiliate_revenue).toLocaleString()} VND</span>
            )}
          </div>, 
          { id: toastId, duration: 5000 }
        );
        // Tải lại danh sách để lấy số liệu doanh thu thực tế từ Backend
        fetchBookings();
      } else {
        toast.error(`Lỗi: ${result.detail || 'Từ chối giải ngân từ hệ thống'}`, { id: toastId });
      }
    } catch (error) {
      toast.error("Lỗi kết nối đến máy chủ bảo mật.", { id: toastId });
    }
  };

  // --- TÍNH TOÁN THỐNG KÊ (DỰA VÀO DỮ LIỆU DB CHUẨN) ---
  // Tổng doanh thu thực tế đã giải ngân (Lấy từ cột partner_revenue của database)
  const totalRevenue = bookings
    .filter(b => b.service_status === "COMPLETED")
    .reduce((sum, b) => sum + (Number(b.partner_revenue) || 0), 0);
    
  // Số tiền đang neo giữ chờ giải ngân (Ước tính 70% giá trị các đơn chưa hoàn thành)
  const pendingEscrow = bookings
    .filter(b => b.service_status !== "COMPLETED")
    .reduce((sum, b) => sum + (Number(b.total_amount) * 0.7), 0); 

  // --- BẢO VỆ GIAO DIỆN KHI CHƯA MOUNT ---
  if (!isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-zinc-950"></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden flex relative transition-colors duration-500 font-be-vietnam">
      
      {/* ================= MAIN DASHBOARD AREA ================= */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Nút Theme Toggle */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>

        <div className="max-w-[1400px] mx-auto pt-24 pb-32 px-4 md:px-8 xl:px-12">
            
            {/* Header */}
            <div className="mb-8 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3 tracking-tight">
                    <ShieldCheck className="text-[#80BF84]" size={36} /> Quản lý Dòng tiền Escrow
                </h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm">Theo dõi lịch đặt, kiểm soát dòng tiền an toàn và xác nhận giải ngân.</p>
            </div>

            {/* Loading State Skeleton */}
            {isLoading ? (
                <div className="w-full flex flex-col gap-6 animate-pulse mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl"></div><div className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl"></div><div className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl"></div></div>
                    <div className="h-96 bg-slate-200 dark:bg-zinc-800 rounded-3xl w-full mt-4"></div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    
                    {/* Mini Stats */}
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

                    {/* Glass Table */}
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
                                    {bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-16 text-center text-slate-400 dark:text-zinc-600 font-bold flex flex-col items-center gap-3">
                                                <ShieldCheck size={40} className="opacity-30" />
                                                Chưa có giao dịch bảo chứng nào được ghi nhận.
                                            </td>
                                        </tr>
                                    ) : (
                                        bookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-white dark:hover:bg-white/5 transition-colors group">
                                                <td className="p-6 font-mono text-xs font-bold text-slate-500 dark:text-zinc-400">
                                                    #{booking.id.substring(0, 8)}
                                                </td>
                                                <td className="p-6">
                                                    <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-white/10 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-300 tracking-wider">
                                                        {booking.video_id ? 'TỪ TIKTOK FEED' : 'TỪ HỒ SƠ DỊCH VỤ'}
                                                    </span>
                                                </td>
                                                
                                                {/* Payment Status */}
                                                <td className="p-6">
                                                    {booking.payment_status === "PAID" ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
                                                            <CreditCard size={14} /> Khách Đã Thanh Toán
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-zinc-400 text-xs font-bold border border-slate-300 dark:border-white/10">
                                                            <Clock size={14} /> Chờ Thanh Toán
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Service Status */}
                                                <td className="p-6">
                                                    {booking.service_status === "COMPLETED" ? (
                                                        <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-[#80BF84] text-xs font-black">
                                                            <CheckCircle size={16} /> HOÀN TẤT
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 text-amber-500 text-xs font-black">
                                                            <Clock size={16} /> ĐANG NEO GIỮ
                                                        </div>
                                                    )}
                                                </td>
                                                
                                                {/* Doanh thu */}
                                                <td className="p-6 font-black text-slate-800 dark:text-white text-right">
                                                    {booking.service_status === "COMPLETED" 
                                                      ? <span className="text-[#80BF84]">{Number(booking.partner_revenue).toLocaleString()} đ</span>
                                                      : <span>~{(Number(booking.total_amount) * 0.7).toLocaleString()} đ</span>
                                                    }
                                                </td>

                                                {/* Action Button */}
                                                <td className="p-6 text-center">
                                                    <button
                                                        onClick={() => handleCompleteService(booking.id)}
                                                        disabled={booking.service_status === "COMPLETED" || booking.payment_status !== "PAID"}
                                                        title={booking.payment_status !== "PAID" ? "Chờ khách hàng thanh toán để có thể giải ngân" : "Bấm để xác nhận hoàn thành dịch vụ"}
                                                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-black tracking-widest uppercase rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                                                    >
                                                        Hoàn Thành
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
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