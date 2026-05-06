"use client";

import { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, User as UserIcon, 
  Sun, Bell, Clock, MapPin, CheckCircle, 
  QrCode, AlertCircle, CreditCard, XCircle,
  Phone, MessageCircle, FileText, Activity, Receipt
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

// Khởi tạo ApexCharts an toàn trong Next.js
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function CalendarFeature() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI();
  
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'waiting' | 'payment' | 'upcoming' | 'history'>('upcoming');
  const [checkInCodes, setCheckInCodes] = useState<Record<string, string>>({});
  
  // State quản lý UI Modal xác nhận hủy lịch
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // --- TRẠNG THÁI & HÀM XỬ LÝ CHO PARTNER HUB ---
  const [partnerViewMode, setPartnerViewMode] = useState<'timeline' | 'analytics'>('timeline');

  // Hàm "Ma thuật" nâng cấp: Chuyển đổi sang các chỉ số vận hành chuẩn mực
  const getPartnerMetrics = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let todayCount = 0; 
      let pendingCheckInCount = 0; 
      let pendingPaymentCount = 0; 
      let cancelledTotal = 0;
      let weeklyRev = 0;

      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date(today); d.setDate(d.getDate() - i);
          return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      }).reverse();

      const revByDay: Record<string, number> = {};
      last7Days.forEach(d => revByDay[d] = 0);

      appointments.forEach(a => {
          const startObj = a.start_time ? new Date(a.start_time) : null;
          const dateStr = startObj ? startObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
          const status = a.status?.toUpperCase();
          
          // 1. Đếm lịch hôm nay
          if (startObj && startObj >= today && startObj < new Date(today.getTime() + 86400000)) {
              todayCount++;
              if (status === 'CONFIRMED') pendingCheckInCount++;
          }
          
          // 2. Đếm đơn chờ thanh toán (Toàn thời gian)
          if (status === 'PENDING_PAYMENT') pendingPaymentCount++;
          
          // 3. Đếm đơn đã hủy (Toàn thời gian)
          if (status === 'CANCELLED') cancelledTotal++;

          // 4. Xử lý dữ liệu biểu đồ (Vẫn giữ để không đứt gãy chart)
          if (status === 'COMPLETED') {
              if (revByDay[dateStr] !== undefined) {
                  revByDay[dateStr] += Number(a.total_amount || 0);
                  weeklyRev += Number(a.total_amount || 0);
              }
          }
      });

      return { todayCount, pendingCheckInCount, pendingPaymentCount, cancelledTotal, weeklyRev, last7Days, revByDay };
  };

  const metrics = getPartnerMetrics();

  // --- LOGIC SIDE DRAWER CHI TIẾT ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerTitle] = useState({ title: "", type: "" });
  const [selectedAppointments, setSelectedList] = useState<any[]>([]);

  const openMetricDetails = (type: 'today' | 'checkin' | 'payment' | 'cancelled') => {
      const now = new Date();
      const todayStr = now.toDateString();
      
      let filtered: any[] = [];
      let title = "";

      if (type === 'today') {
          title = "Lịch hẹn hôm nay";
          filtered = appointments.filter(a => a.start_time && new Date(a.start_time).toDateString() === todayStr);
      } else if (type === 'checkin') {
          title = "Danh sách chờ Check-in";
          filtered = appointments.filter(a => a.status === 'CONFIRMED');
      } else if (type === 'payment') {
          title = "Đơn chờ thanh toán";
          filtered = appointments.filter(a => a.status === 'PENDING_PAYMENT');
      } else if (type === 'cancelled') {
          title = "Lịch trình đã hủy";
          filtered = appointments.filter(a => a.status === 'CANCELLED');
      }

      setSelectedList(filtered);
      setDrawerTitle({ title, type });
      setIsDrawerOpen(true);
  };

  // --- LOGIC GOOGLE CALENDAR GRID ---
  const hours = Array.from({ length: 18 }, (_, i) => i + 5); // Hiển thị từ 5 AM đến 10 PM
  const startOfCurrentWeek = () => {
      const d = new Date();
      const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
  };
  const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = startOfCurrentWeek();
      d.setDate(d.getDate() + i);
      return d;
  });

  const getEventStyle = (startTime: string, endTime: string) => {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const startHour = start.getHours();
      const startMin = start.getMinutes();
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);

      // Mỗi 1 giờ tương ứng với 80px trong Grid
      const top = (startHour - 5) * 80 + (startMin / 60) * 80;
      const height = (duration / 60) * 80;

      return { top: `${top}px`, height: `${height}px` };
  };
  
  // Cấu hình UI cho biểu đồ ApexCharts
  const chartOptions: any = {
      chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit' },
      theme: { mode: isDarkMode ? 'dark' : 'light' },
      colors: ['#80BF84'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '40%' } },
      xaxis: { categories: metrics.last7Days, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#64748b', fontWeight: 600 } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (val: number) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(val), style: { colors: isDarkMode ? '#9ca3af' : '#64748b', fontWeight: 600 } } },
      dataLabels: { enabled: false },
      grid: { borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', strokeDashArray: 4 },
      tooltip: { y: { formatter: (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val) } }
  };
  const chartSeries = [{ name: 'Doanh thu', data: metrics.last7Days.map(d => metrics.revByDay[d]) }];

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') { setIsDarkMode(false); document.documentElement.classList.remove('dark'); } 
    else { setIsDarkMode(true); document.documentElement.classList.add('dark'); }

    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        try {
            // 1. KIỂM TRA PHẢN HỒI TỪ PAYOS (PAYMENT VERIFICATION)
            const urlParams = new URLSearchParams(window.location.search);
            const orderCode = urlParams.get('orderCode');
            const cancel = urlParams.get('cancel'); // PayOS trả về cancel=true nếu khách hủy thanh toán

            if (orderCode) {
                if (cancel === 'true') {
                    toast.error("Bạn đã hủy thanh toán giao dịch.");
                } else {
                    const tid = toast.loading("Đang xác nhận kết quả thanh toán...");
                    const vRes = await fetch(`${API_URL}/appointments/payment/verify?orderCode=${orderCode}`, {
                        headers: { "Authorization": `Bearer ${session.access_token}` }
                    });
                    const vData = await vRes.json();
                    if (vRes.ok && vData.status === "success" && vData.message !== "Đã xác nhận trước đó") {
                        toast.success("Thanh toán bảo chứng thành công!", { id: tid });
                        setActiveTab('upcoming'); // Tự động nhảy sang tab Sắp tới cho khách
                    } else if (!vRes.ok) {
                        toast.error(vData.detail || "Thanh toán chưa hoàn tất.", { id: tid });
                    }
                }
                // Xóa params trên URL để F5 không bị load lại thông báo
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // 2. TẢI DỮ LIỆU PROFILE & LỊCH HẸN
            const pRes = await fetch(`${API_URL}/user/profile`, { headers: { "Authorization": `Bearer ${session.access_token}` } });
            const pData = await pRes.json();
            if (pData.status === "success") setUserRole(pData.data.profile.role);

            const aRes = await fetch(`${API_URL}/appointments/me`, { headers: { "Authorization": `Bearer ${session.access_token}` } });
            const aData = await aRes.json();
            if (aData.status === "success") setAppointments(aData.data);
        } catch (error) { toast.error("Không thể tải dữ liệu lịch hẹn."); }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleThemeToggle = async () => { 
    const newMode = !isDarkMode; setIsDarkMode(newMode);
    const themeStr = newMode ? 'dark' : 'light';
    if (newMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', themeStr);
  };

  const formatPrice = (price: number) => {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // BƯỚC 3 CỦA LUỒNG: USER THANH TOÁN (GỌI API TẠO LINK PAYOS)
  const handlePayment = async (appointmentId: string) => {
    const tid = toast.loading("Đang tạo liên kết thanh toán an toàn...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/appointments/${appointmentId}/pay`, {
            method: "POST", 
            headers: { "Authorization": `Bearer ${session?.access_token}` }
        });
        const result = await res.json();
        
        if (res.ok && result.checkout_url) {
            toast.success("Đang chuyển hướng sang cổng thanh toán...", { id: tid });
            // Chuyển hướng người dùng sang trang PayOS
            window.location.href = result.checkout_url;
        } else {
            throw new Error(result.detail || "Hệ thống chưa tạo được link thanh toán.");
        }
    } catch (e: any) { 
        toast.error(e.message || "Lỗi thanh toán", { id: tid }); 
    }
};

  // BƯỚC 4 CỦA LUỒNG: PARTNER XÁC NHẬN HOÀN THÀNH (CHECK-IN)
  // BỔ SUNG: HÀM HỦY LỊCH (USER CHỦ ĐỘNG HỦY)
  const handleCancelAppointment = async (appointmentId: string) => {
    setCancelConfirmId(null); // Đóng popup xác nhận
    const tid = toast.loading("Đang tiến hành hủy yêu cầu...");
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
            method: "PATCH", 
            headers: { "Authorization": `Bearer ${session?.access_token}` }
        });
        const result = await res.json();
        if (res.ok) {
            toast.success(result.message, { id: tid });
            setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'CANCELLED', rejection_reason: 'Người dùng chủ động hủy bỏ yêu cầu' } : a));
            setActiveTab('history');
        } else throw new Error(result.detail);
    } catch (e: any) { toast.error(e.message || "Lỗi khi hủy lịch", { id: tid }); }
};
  const handleComplete = async (appointmentId: string) => {
      const code = checkInCodes[appointmentId];
      if (!code) { toast.error("Vui lòng nhập mã 6 số từ khách!"); return; }

      const tid = toast.loading("Đang xác thực mã và hoàn thành...");
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${API_URL}/appointments/${appointmentId}/check-in`, {
              method: "PATCH", 
              headers: { "Authorization": `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ check_in_code: code })
          });
          const result = await res.json();
          if (res.ok) {
              toast.success(result.message, { id: tid });
              setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'SERVED' } : a));
              setActiveTab('upcoming'); // Vẫn giữ ở Tab Sắp tới để hiển thị trạng thái Đã Check-in
          } else throw new Error(result.detail);
      } catch (e: any) { toast.error(e.message || "Mã không hợp lệ", { id: tid }); }
  };

  const isMyClient = userRole === 'PARTNER' || userRole === 'PARTNER_ADMIN';

  const filteredAppointments = appointments.filter(a => {
      const status = a.status.toUpperCase();
      if (activeTab === 'waiting') return status === 'WAITING_PARTNER';
      if (activeTab === 'payment') return status === 'PENDING_PAYMENT';
      if (activeTab === 'upcoming') return status === 'CONFIRMED' || status === 'SERVED';
      if (activeTab === 'history') return status === 'COMPLETED' || status === 'CANCELLED';
      return false;
  });

  if (isLoading || !isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-zinc-950"></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-zinc-950">
        
        {/* HEADER CONTROLS */}
        <div className="absolute top-6 right-6 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-lg transition-transform hover:scale-110"><Sun size={20}/></button>
          <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-lg transition-transform hover:scale-110"><Bell size={20}/></button>
        </div>

        <div className="max-w-4xl mx-auto pt-20 pb-32 px-5">
            <div className="mb-10 animate-slide-up">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3"><CalendarDays className="text-[#80BF84]" size={36} /> Lịch hẹn của tôi</h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Theo dõi và quản lý hành trình sức khỏe.</p>
            </div>

            {!user ? (
                 <div className="flex flex-col items-center justify-center py-20 text-center"><h3 className="text-xl font-bold">Vui lòng đăng nhập</h3></div>
            ) : isMyClient ? (
                <div className="animate-fade-in flex flex-col gap-6">
                    {/* THỐNG KÊ TOP METRICS - PHIÊN BẢN TƯƠNG TÁC */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                        {/* 1. Lịch hôm nay */}
                        <button onClick={() => openMetricDetails('today')} className="p-5 text-left rounded-[2rem] bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-xl hover:border-blue-500/40 active:scale-95 group">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lịch hôm nay</p>
                                <CalendarDays size={16} className="text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-4xl font-black text-slate-900 dark:text-white">{metrics.todayCount}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Tổng số cuộc hẹn</p>
                        </button>

                        {/* 2. Chờ Check-in */}
                        <button onClick={() => openMetricDetails('checkin')} className="p-5 text-left rounded-[2rem] bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-xl hover:border-emerald-500/40 active:scale-95 group">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Chờ Check-in</p>
                                <CheckCircle size={16} className="text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{metrics.pendingCheckInCount}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Khách sắp đến</p>
                        </button>

                        {/* 3. Chờ thanh toán */}
                        <button onClick={() => openMetricDetails('payment')} className="p-5 text-left rounded-[2rem] bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-xl hover:border-amber-500/40 active:scale-95 group">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Chờ thanh toán</p>
                                <Clock size={16} className="text-amber-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-4xl font-black text-amber-600 dark:text-amber-400">{metrics.pendingPaymentCount}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Cần xác nhận bảo chứng</p>
                        </button>

                        {/* 4. Đơn đã hủy */}
                        <button onClick={() => openMetricDetails('cancelled')} className="p-5 text-left rounded-[2rem] bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-xl hover:border-rose-500/40 active:scale-95 group">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Đơn đã hủy</p>
                                <XCircle size={16} className="text-rose-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-4xl font-black text-rose-600 dark:text-rose-400">{metrics.cancelledTotal}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Lịch trình thất thoát</p>
                        </button>
                    </div>

                    {/* VIEW TOGGLE */}
                    <div className="flex p-1.5 bg-white dark:bg-white/5 shadow-sm rounded-2xl w-full md:w-max border border-slate-200 dark:border-white/10">
                        <button onClick={() => setPartnerViewMode('timeline')} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all ${partnerViewMode === 'timeline' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Trục thời gian</button>
                        <button onClick={() => setPartnerViewMode('analytics')} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all ${partnerViewMode === 'analytics' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Biểu đồ Thống kê</button>
                    </div>

                    {/* RENDER VIEW */}
                    {partnerViewMode === 'analytics' ? (
                        <div className="p-6 rounded-[1.5rem] bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-white/10 shadow-sm animate-fade-in">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Activity className="text-[#80BF84]" size={20} /> Doanh thu 7 ngày qua</h3>
                            <div className="h-[300px] w-full">
                                <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height="100%" />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#0f0f11] rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col animate-fade-in h-[800px]">
                            {/* Calendar Header */}
                            <div className="grid grid-cols-[80px_1fr] border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                                <div className="p-4 border-r border-slate-200 dark:border-white/10 flex items-center justify-center font-bold text-[10px] text-slate-400">GMT+07</div>
                                <div className="grid grid-cols-7">
                                    {weekDays.map((day, i) => (
                                        <div key={i} className={`p-4 text-center border-r last:border-0 border-slate-200 dark:border-white/10 ${day.toDateString() === new Date().toDateString() ? 'bg-[#80BF84]/10' : ''}`}>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{day.toLocaleDateString('vi-VN', { weekday: 'short' })}</p>
                                            <p className={`text-xl font-black mt-1 ${day.toDateString() === new Date().toDateString() ? 'text-[#80BF84]' : 'text-slate-900 dark:text-white'}`}>{day.getDate()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Calendar Body */}
                            <div className="flex-1 overflow-y-auto relative no-scrollbar bg-white dark:bg-black/20">
                                <div className="grid grid-cols-[80px_1fr] min-h-[1440px]">
                                    {/* Giờ bên trái */}
                                    <div className="border-r border-slate-200 dark:border-white/10">
                                        {hours.map(h => (
                                            <div key={h} className="h-[80px] border-b border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-400 p-2 text-right uppercase">
                                                {h > 12 ? `${h-12} PM` : `${h} AM`}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Lưới lịch hẹn */}
                                    <div className="grid grid-cols-7 relative">
                                        {/* Vẽ các đường kẻ ngang */}
                                        {hours.map(h => (
                                            <div key={h} className="absolute w-full border-b border-slate-100 dark:border-white/5" style={{ top: `${(h-5)*80}px` }}></div>
                                        ))}
                                        
                                        {/* Vẽ các đường kẻ dọc */}
                                        {Array.from({length: 6}).map((_, i) => (
                                            <div key={i} className="absolute h-full border-r border-slate-100 dark:border-white/5" style={{ left: `${(i+1)*(100/7)}%` }}></div>
                                        ))}

                                        {/* Render Event Blocks */}
                                        {appointments
                                            .filter(a => ['CONFIRMED', 'SERVED', 'COMPLETED'].includes(a.status) && a.start_time)
                                            .map((appt) => {
                                                const start = new Date(appt.start_time);
                                                const dayIndex = (start.getDay() + 6) % 7; // Chuyển Chủ nhật từ 0 sang index 6
                                                const { top, height } = getEventStyle(appt.start_time, appt.end_time);
                                                const isConfirmed = appt.status === 'CONFIRMED';
                                                
                                                return (
                                                    <div 
                                                        key={appt.id}
                                                        className={`absolute mx-1 rounded-xl p-2 border-l-4 shadow-sm transition-all hover:scale-[1.02] hover:z-10 cursor-pointer overflow-hidden
                                                            ${isConfirmed ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-400' : 
                                                              appt.status === 'SERVED' ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-400' : 
                                                              'bg-slate-50 dark:bg-white/10 border-slate-400 text-slate-600 dark:text-slate-400 grayscale'}`}
                                                        style={{ 
                                                            top, height, 
                                                            left: `${dayIndex * (100/7)}%`, 
                                                            width: `calc(${(100/7)}% - 8px)` 
                                                        }}
                                                        onClick={() => {
                                                            if (isConfirmed) {
                                                                toast.info(`Khách: ${appt.users?.full_name}. Mã xác nhận: ${appt.check_in_code}`);
                                                            }
                                                        }}
                                                    >
                                                        <p className="text-[10px] font-black uppercase leading-tight truncate">{appt.services?.service_name}</p>
                                                        <p className="text-[9px] font-bold opacity-80 mt-0.5">{new Date(appt.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</p>
                                                        <div className="flex items-center gap-1 mt-2">
                                                            <div className="w-4 h-4 rounded-full bg-white/50 dark:bg-black/20 flex items-center justify-center"><UserIcon size={8}/></div>
                                                            <span className="text-[9px] font-black truncate">{appt.users?.full_name}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                        {/* Current Time Indicator (Sợi chỉ đỏ của Google) */}
                                        <div className="absolute w-full flex items-center z-20 pointer-events-none" style={{ top: `${(new Date().getHours() - 5) * 80 + (new Date().getMinutes() / 60) * 80}px` }}>
                                            <div className="w-3 h-3 rounded-full bg-rose-500 -ml-1.5 shadow-sm"></div>
                                            <div className="flex-1 h-0.5 bg-rose-500/50"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-fade-in">
                    
                    {/* TABS CẤU TRÚC MỚI */}
                    <div className="flex p-1.5 bg-white dark:bg-white/5 shadow-sm rounded-2xl w-full md:w-max mb-8 border border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
                        {!isMyClient && (
                            <>
                                <button onClick={() => setActiveTab('waiting')} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all ${activeTab === 'waiting' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Đang chờ</button>
                                <button onClick={() => setActiveTab('payment')} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all ${activeTab === 'payment' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Thanh toán</button>
                            </>
                        )}
                        <button onClick={() => setActiveTab('upcoming')} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all ${activeTab === 'upcoming' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Sắp tới</button>
                        <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Lịch sử</button>
                    </div>

                    <div className="flex flex-col gap-6">
                        {filteredAppointments.length === 0 ? (
                             <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600">
                                 <FileText size={48} className="mb-4 opacity-50" />
                                 <p className="font-medium text-lg">Chưa có dữ liệu ở mục này</p>
                             </div>
                        ) : (
                            filteredAppointments.map((appt) => {
                                const startObj = appt.start_time ? new Date(appt.start_time) : null;
                                const dayStr = startObj ? startObj.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' }) : "Chờ xác nhận";
                                const timeStr = startObj ? startObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "--:--";
                                const deadlineStr = appt.payment_deadline ? new Date(appt.payment_deadline).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : "";

                                const currentStatus = appt.status.toUpperCase();
                                // Placeholder thông tin tương lai chúng ta sẽ fill từ DB
                                const servicePrice = appt.services?.price || 500000; 
                                const duration = "60 phút";

                                return (
                                    <div key={appt.id} className={`group flex flex-col md:flex-row overflow-hidden rounded-[1.5rem] border shadow-sm transition-all hover:shadow-xl bg-white dark:bg-[#0f0f11] border-slate-200 dark:border-white/10`}>
                                        
                                        {/* CỘT THỜI GIAN (Trái) */}
                                        <div className="w-full md:w-36 p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5 relative">
                                            {currentStatus === 'CONFIRMED' && <div className="absolute top-0 left-0 w-full h-1 bg-[#80BF84]"></div>}
                                            <CalendarDays size={24} className="text-slate-300 dark:text-zinc-600 mb-2" />
                                            <span className="text-2xl font-black text-slate-800 dark:text-white text-center leading-tight">{dayStr}</span>
                                            <div className="flex items-center gap-1.5 mt-2 bg-white dark:bg-black px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 shadow-sm">
                                                <Clock size={14} className="text-[#80BF84]"/>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{timeStr}</span>
                                            </div>
                                        </div>

                                        {/* CỘT NỘI DUNG (Giữa) */}
                                        <div className="flex-1 p-6">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider
                                                    ${currentStatus === 'WAITING_PARTNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50' : 
                                                      currentStatus === 'PENDING_PAYMENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/50 animate-pulse' : 
                                                      currentStatus === 'CONFIRMED' ? 'bg-[#80BF84]/20 text-emerald-800 dark:text-[#80BF84] border border-[#80BF84]/30' : 
                                                      currentStatus === 'COMPLETED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50' : 'bg-slate-200 text-slate-600 border border-slate-300/50'}`}>
                                                    {currentStatus.replace('_', ' ')}
                                                </span>
                                                <span className="font-black text-lg text-slate-900 dark:text-white">
                                                    {formatPrice(servicePrice)}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-1">{appt.services?.service_name || "Dịch vụ Chăm sóc Sức khỏe"}</h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                            {isMyClient ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-500 shrink-0"><UserIcon size={16}/></div>
                                                        <span className="font-semibold line-clamp-1">{appt.users?.full_name || "Khách hàng ẩn danh"}</span>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => appt.partner?.username && router.push(`/${appt.partner.username}`)}
                                                        className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-[#80BF84] hover:bg-[#80BF84]/5 transition-all cursor-pointer group/addr text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-500 group-hover/addr:text-[#80BF84] group-hover/addr:bg-white dark:group-hover/addr:bg-black transition-colors shrink-0">
                                                            <MapPin size={16}/>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 dark:text-white line-clamp-1">Xem trang cơ sở</span>
                                                            <span className="text-[10px] opacity-70 line-clamp-1">{appt.partner?.physical_address || "Đang cập nhật địa chỉ"}</span>
                                                        </div>
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-500"><Activity size={16}/></div>
                                                    <span className="font-semibold">Thời lượng: {duration}</span>
                                                </div>
                                            </div>

                                            {/* Công cụ tương tác nhỏ */}
                                            <div className="flex items-center gap-4 mt-2">
                                                <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition-colors"><MessageCircle size={14}/> Nhắn tin</button>
                                                <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-green-500 transition-colors"><Phone size={14}/> Gọi điện</button>
                                            </div>

                                            {currentStatus === 'CANCELLED' && appt.rejection_reason && (
                                                <p className="text-sm text-rose-500 mt-4 flex items-center gap-1.5 p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl"><XCircle size={16}/> LÝ DO TỪ CHỐI: {appt.rejection_reason}</p>
                                            )}
                                        </div>

                                        {/* CỘT THAO TÁC / QR (Phải) */}
                                        <div className="w-full md:w-64 p-6 bg-slate-50/50 dark:bg-[#141416] border-t md:border-t-0 md:border-l border-slate-100 dark:border-white/5 flex flex-col justify-center gap-3">
                                            
                                            {/* Giao diện User */}
                                            {!isMyClient && currentStatus === 'WAITING_PARTNER' && (
                                                <div className="flex flex-col gap-3">
                                                    <div className="text-center p-4 rounded-xl border border-dashed border-slate-300 dark:border-white/20">
                                                        <Clock size={24} className="mx-auto text-slate-400 mb-2 animate-pulse" />
                                                        <p className="text-xs font-medium text-slate-500">Cơ sở đang kiểm tra lịch trống và sẽ gửi báo giá sớm.</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setCancelConfirmId(appt.id)}
                                                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5 border border-rose-100 dark:border-rose-500/20"
                                                    >
                                                        <XCircle size={16}/> Hủy yêu cầu
                                                    </button>
                                                </div>
                                            )}

                                            {!isMyClient && currentStatus === 'PENDING_PAYMENT' && (
                                                <div className="flex flex-col gap-3">
                                                    <div className="text-center p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                                                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase mb-1">Hạn thanh toán</p>
                                                        <p className="text-sm font-black text-rose-700 dark:text-rose-300">{deadlineStr}</p>
                                                    </div>
                                                    <button onClick={() => handlePayment(appt.id)} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-slate-500/20">
                                                        <Receipt size={16} /> Thanh toán ngay
                                                    </button>
                                                    <button 
                                                        onClick={() => setCancelConfirmId(appt.id)}
                                                        className="w-full py-2.5 mt-1 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-500/30"
                                                    >
                                                        Hủy yêu cầu này
                                                    </button>
                                                </div>
                                            )}  

{!isMyClient && currentStatus === 'CONFIRMED' && (
    <div className="text-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-dashed border-emerald-300 dark:border-emerald-500/30">
        <QrCode size={32} className="mx-auto text-emerald-600 mb-2" />
        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase mb-1">Mã xác nhận tại quầy</p>
        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em]">{appt.check_in_code || "------"}</p>
    </div>
)}

                        {/* Nút để User chốt đơn sau khi làm dịch vụ xong */}
                        {!isMyClient && currentStatus === 'SERVED' && (
                            <div className="flex flex-col gap-3">
                                <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">Cơ sở đã phục vụ</p>
                                    <p className="text-sm font-black text-blue-700 dark:text-blue-300">Vui lòng xác nhận để giải ngân</p>
                                </div>
                                <button 
                                    onClick={async () => {
                                        const tid = toast.loading("Đang xác nhận hoàn thành...");
                                        try {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            const res = await fetch(`${API_URL}/appointments/${appt.id}/user-confirm`, {
                                                method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                                                body: JSON.stringify({ is_satisfied: true })
                                            });
                                            if (res.ok) {
                                                toast.success("Cảm ơn bạn! Lịch hẹn đã chuyển vào Lịch sử.", { id: tid });
                                                setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'COMPLETED' } : a));
                                                setActiveTab('history');
                                            } else throw new Error();
                                        } catch { toast.error("Lỗi xác nhận", { id: tid }); }
                                    }} 
                                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <CheckCircle size={16} className="inline mr-1" /> Xác nhận hài lòng
                                </button>
                            </div>
                        )}

                        {/* Giao diện Partner */}
                        {isMyClient && currentStatus === 'CONFIRMED' && (
                            <>
                                                    <div className="text-center">
                                                        <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Xác nhận khách đến</p>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nhập 6 số mã khách" 
                                                            className="w-full px-4 py-3 mb-3 text-lg rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black text-center font-black tracking-widest outline-none focus:border-[#80BF84]"
                                                            value={checkInCodes[appt.id] || ''}
                                                            onChange={(e) => setCheckInCodes({...checkInCodes, [appt.id]: e.target.value})}
                                                        />
                                                    </div>
                                                    <button onClick={() => handleComplete(appt.id)} className="w-full flex items-center justify-center gap-2 py-3 bg-[#80BF84] text-zinc-950 font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-emerald-500/20">
                                                        <CheckCircle size={18} /> Hoàn tất dịch vụ
                                                    </button>
                                                </>
                                            )}

                                            {currentStatus === 'COMPLETED' && (
                                                <div className="text-center p-4">
                                                    <CheckCircle size={32} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                                                    <p className="text-sm font-bold text-slate-500">Đã phục vụ xong</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
        {/* ================= MODAL XÁC NHẬN HỦY LỊCH TÙY CHỈNH ================= */}
        {cancelConfirmId && (
            <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 animate-fade-in">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCancelConfirmId(null)}></div>
                <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-2xl p-6 text-center animate-slide-up">
                    <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-rose-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Hủy yêu cầu đặt lịch?</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-6 leading-relaxed">
                        Thao tác này không thể hoàn tác. Cơ sở sẽ nhận được thông báo hủy từ bạn.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => handleCancelAppointment(cancelConfirmId)} className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-500/20">
                            Vâng, Hủy lịch
                        </button>
                        <button onClick={() => setCancelConfirmId(null)} className="w-full py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-bold rounded-xl transition-colors">
                            Không, Giữ lại
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* CŨ: <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">... */}

        
      {/* ================= SIDE DRAWER CHI TIẾT ĐƠN HÀNG ================= */}
        <div className={`fixed inset-0 z-[120] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop mờ */}
            <div className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-[2px]" onClick={() => setIsDrawerOpen(false)}></div>
            
            {/* Nội dung Drawer */}
            <div className={`absolute top-0 right-0 h-full w-full md:w-[450px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-l border-slate-200 dark:border-white/10 shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Drawer Header */}
                <div className="p-8 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{drawerData.title}</h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Tổng cộng: {selectedAppointments.length} bản ghi</p>
                    </div>
                    <button onClick={() => setIsDrawerOpen(false)} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-white">
                        <Receipt size={24} />
                    </button>
                </div>

                {/* Drawer Body - Danh sách đơn */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                    {selectedAppointments.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <Activity size={48} className="mb-4" />
                            <p className="font-bold">Không có dữ liệu hiển thị</p>
                        </div>
                    ) : (
                        selectedAppointments.map((appt) => (
                            <div key={appt.id} className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all group/item">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 overflow-hidden border border-white dark:border-zinc-700 shadow-sm">
                                            {appt.users?.avatar_url ? <img src={appt.users.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={20}/>}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white text-sm">{appt.users?.full_name || "Ẩn danh"}</p>
                                            <p className="text-[10px] font-bold text-slate-500">{appt.users?.phone || "Không có SĐT"}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900 dark:text-white text-sm">{formatPrice(appt.total_amount || 0)}</p>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                            appt.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' :
                                            appt.status === 'PENDING_PAYMENT' ? 'bg-amber-500/10 text-amber-500' :
                                            appt.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                                        }`}>{appt.status.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-400">
                                        <Activity size={14} className="text-[#80BF84]" />
                                        <span>{appt.services?.service_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-400">
                                        <Clock size={14} className="text-[#80BF84]" />
                                        <span>{new Date(appt.start_time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                </div>

                                {/* Hành động nhanh trong Drawer */}
                                {appt.status === 'CONFIRMED' && (
                                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                        <input 
                                            type="text" 
                                            placeholder="Mã 6 số" 
                                            className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black font-black tracking-widest outline-none focus:border-[#80BF84]"
                                            onChange={(e) => setCheckInCodes({...checkInCodes, [appt.id]: e.target.value})}
                                        />
                                        <button onClick={() => handleComplete(appt.id)} className="px-4 py-2 bg-[#80BF84] text-zinc-900 text-xs font-black rounded-xl shadow-lg shadow-[#80BF84]/20 hover:scale-105 transition-transform">Xác nhận</button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}