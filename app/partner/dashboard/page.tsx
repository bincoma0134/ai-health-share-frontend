"use client";

import { useEffect, useState } from "react";
import { 
  Home, LayoutDashboard, DollarSign, Sun, Moon, 
  CheckCircle, Clock, CreditCard, Wallet, TrendingUp, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Đồng bộ Interface chuẩn từ AI_STATE.md
interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  affiliate_id: string | null;
  total_amount: number;
  payment_status: string;
  service_status: string;
}

export default function PartnerDashboard() {
  const router = useRouter();
  
  // --- STATE HỆ THỐNG ---
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- STATE DỮ LIỆU ---
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Khởi tạo Theme & Fetch Dữ liệu
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

    // Fetch Bookings
    const fetchBookings = async () => {
      try {
        const response = await fetch("https://ai-health-share-backend.onrender.com/bookings");
        const result = await response.json();
        
        if (result.status === "success" || Array.isArray(result)) {
          setBookings(result.data || result); 
        }
      } catch (error) {
        toast.error("Không thể kết nối đến máy chủ Escrow.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // --- HÀM XỬ LÝ: XÁC NHẬN HOÀN THÀNH ---
  const handleCompleteService = async (bookingId: string) => {
    // Thay confirm() của trình duyệt bằng custom logic hoặc để user click thẳng rồi toast
    const toastId = toast.loading("Đang xử lý giải ngân tự động...");
    
    try {
      const res = await fetch(`https://ai-health-share-backend.onrender.com/bookings/${bookingId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      const result = await res.json();

      if (res.ok && result.status === "success") {
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold">🎉 Giải ngân thành công!</span>
            <span className="text-sm">Đối tác: +{result.distribution.partner_revenue.toLocaleString()} VND</span>
            {result.distribution.affiliate_revenue > 0 && (
                <span className="text-sm text-emerald-600">Affiliate: +{result.distribution.affiliate_revenue.toLocaleString()} VND</span>
            )}
          </div>, 
          { id: toastId, duration: 5000 }
        );
        // Cập nhật State nội bộ thay vì reload trang
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, service_status: "completed" } : b));
      } else {
        toast.error(`Lỗi: ${result.detail || 'Không thể giải ngân'}`, { id: toastId });
      }
    } catch (error) {
      toast.error("Lỗi kết nối đến server.", { id: toastId });
    }
  };

  // --- TÍNH TOÁN THỐNG KÊ NHANH ---
  const totalRevenue = bookings.filter(b => b.service_status === "completed").reduce((sum, b) => sum + b.total_amount * 0.7, 0);
  const pendingEscrow = bookings.filter(b => b.service_status !== "completed").reduce((sum, b) => sum + b.total_amount * 0.7, 0);

  // --- BẢO VỆ GIAO DIỆN KHI CHƯA MOUNT ---
  if (!isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-zinc-950"></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden flex relative transition-colors duration-500">
      
      
      {/* ================= 2. MAIN DASHBOARD AREA ================= */}
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
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                    <ShieldCheck className="text-[#80BF84]" size={36} /> Partner Escrow
                </h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Quản lý dòng tiền, theo dõi lịch đặt và thực hiện giải ngân thông minh.</p>
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
                        <div className="glass-panel p-6 rounded-[2rem] bg-white/70 dark:bg-black/40 border-slate-200 dark:border-white/10 flex flex-col gap-2">
                            <span className="text-sm font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-2"><Wallet size={16}/> TỔNG ĐƠN HÀNG</span>
                            <span className="text-3xl font-black text-slate-800 dark:text-white">{bookings.length} <span className="text-lg font-medium text-slate-400">đơn</span></span>
                        </div>
                        <div className="glass-panel p-6 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 flex flex-col gap-2">
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2"><Clock size={16}/> ĐANG NEO GIỮ (ESCROW)</span>
                            <span className="text-3xl font-black text-slate-800 dark:text-white">{pendingEscrow.toLocaleString()} <span className="text-lg font-medium text-slate-400">VND</span></span>
                        </div>
                        <div className="glass-panel p-6 rounded-[2rem] bg-gradient-to-br from-[#80BF84]/10 to-transparent border border-[#80BF84]/20 flex flex-col gap-2">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-2"><TrendingUp size={16}/> ĐÃ GIẢI NGÂN (ƯỚC TÍNH)</span>
                            <span className="text-3xl font-black text-slate-800 dark:text-white">{totalRevenue.toLocaleString()} <span className="text-lg font-medium text-slate-400">VND</span></span>
                        </div>
                    </div>

                    {/* Glass Table */}
                    <div className="glass-panel rounded-[2rem] bg-white/70 dark:bg-black/40 border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-200/50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                                        <th className="p-5 font-bold">Mã Đơn (ID)</th>
                                        <th className="p-5 font-bold">Khách hàng (ID)</th>
                                        <th className="p-5 font-bold">Tổng tiền</th>
                                        <th className="p-5 font-bold">Thanh toán</th>
                                        <th className="p-5 font-bold">Tiến độ Dịch vụ</th>
                                        <th className="p-5 font-bold text-right">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-200 dark:divide-white/5">
                                    {bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-10 text-center text-slate-500 dark:text-zinc-500 font-medium italic">
                                                Chưa có dữ liệu Booking nào trong hệ thống.
                                            </td>
                                        </tr>
                                    ) : (
                                        bookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="p-5 font-mono text-xs text-slate-500 dark:text-zinc-500">
                                                    {booking.id.substring(0, 8)}...
                                                </td>
                                                <td className="p-5 font-medium text-slate-700 dark:text-zinc-300">
                                                    <span className="truncate max-w-[120px] inline-block" title={booking.user_id}>
                                                        {booking.user_id.substring(0, 8)}...
                                                    </span>
                                                </td>
                                                <td className="p-5 font-black text-slate-800 dark:text-white">
                                                    {booking.total_amount.toLocaleString()} đ
                                                </td>
                                                
                                                {/* Payment Status */}
                                                <td className="p-5">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-bold shadow-inner">
                                                        <CreditCard size={14} />
                                                        {booking.payment_status}
                                                    </div>
                                                </td>

                                                {/* Service Status */}
                                                <td className="p-5">
                                                    {booking.service_status.toLowerCase() === "waiting" || booking.service_status.toLowerCase() === "pending" ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
                                                            <Clock size={14} /> Đang chờ
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#80BF84]/20 text-emerald-700 dark:text-[#80BF84] text-xs font-bold border border-[#80BF84]/30">
                                                            <CheckCircle size={14} /> Đã hoàn thành
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Action Button */}
                                                <td className="p-5 text-right">
                                                    <button
                                                        onClick={() => handleCompleteService(booking.id)}
                                                        disabled={booking.service_status === "completed"}
                                                        className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-black rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                                                    >
                                                        XÁC NHẬN
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

        {/* ================= 3. MOBILE BOTTOM DOCK (DÙNG CHUNG) ================= */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/partner/profile')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><LayoutDashboard size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button className="text-[#80BF84] hover:text-emerald-500 transition-colors group"><DollarSign size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
          </div>
        </div>

      </div>
    </div>
  );
}