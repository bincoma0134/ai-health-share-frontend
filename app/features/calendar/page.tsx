"use client";

import React, { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, User as UserIcon, 
  Sun, Bell, Clock, MapPin, CheckCircle, 
  QrCode, AlertCircle, CreditCard, XCircle,
  Phone, MessageCircle, FileText, Activity, Receipt, Ticket, X
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { useVoucherStore } from "@/store/useVoucherStore";

// Khởi tạo ApexCharts an toàn trong Next.js
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function CalendarFeature() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI();
  const { refreshProfile } = useAuth();
  
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

  // --- VOUCHER STORE & HÀM TOÁN HỌC AUTO-APPLY ---
  const { myVouchers, fetchMyVouchers } = useVoucherStore();

  useEffect(() => {
      const token = localStorage.getItem("ai-health-token");
      if (token && user) fetchMyVouchers(token);
  }, [user]);

  const getCalculatedPrices = (appt: any) => {
      let originalPrice = appt.services?.price || appt.total_amount || 0; 
      let finalPrice = appt.total_amount || 0;
      let discountAmount = originalPrice - finalPrice;
      
      if (appt.status === 'PENDING_PAYMENT' || appt.status === 'WAITING_PARTNER') {
          const validVouchers = myVouchers.filter((v: any) => v.wallet_status === 'UNUSED' && (v.issuer_type === 'ADMIN' || v.issuer_id === appt.partner_id) && originalPrice >= v.min_order_value);
          if (validVouchers.length > 0) {
              let maxDiscount = 0;
              validVouchers.forEach((v: any) => {
                  let cur = v.discount_type === 'PERCENTAGE' ? (originalPrice * v.discount_value) / 100 : v.discount_value;
                  if (v.discount_type === 'PERCENTAGE' && v.max_discount_amount) cur = Math.min(cur, v.max_discount_amount);
                  if (cur > maxDiscount) maxDiscount = cur;
              });
              if (maxDiscount > 0) {
                  discountAmount = maxDiscount;
                  finalPrice = Math.max(0, originalPrice - discountAmount);
              }
          }
      }
      return { originalPrice, finalPrice, discountAmount, hasVoucher: discountAmount > 0 };
  };

  // --- TRẠNG THÁI & HÀM XỬ LÝ CHO PARTNER HUB ---

  // State quản lý UI Hóa đơn Kế toán (Preview) trước khi sang PayOS
  const [paymentPreview, setPaymentPreview] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

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

      // Các biến chứa dữ liệu cho Dashboard mở rộng
      const hourlyData = Array(15).fill(0); // Từ 7:00 đến 21:00
      let totalCompleted = 0;
      const serviceMix: Record<string, number> = {};
      let totalAppointments = 0;

      appointments.forEach(a => {
          const startObj = a.start_time ? new Date(a.start_time) : null;
          const dateStr = startObj ? startObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
          const status = a.status?.toUpperCase();
          totalAppointments++;
          
          if (startObj && startObj >= today && startObj < new Date(today.getTime() + 86400000)) {
              todayCount++;
              if (status === 'CONFIRMED') pendingCheckInCount++;
          }
          
          if (status === 'PENDING_PAYMENT') pendingPaymentCount++;
          if (status === 'CANCELLED') cancelledTotal++;

          // Phân tích Giờ cao điểm (Peak Hours)
          if (startObj) {
              const hour = startObj.getHours();
              if (hour >= 7 && hour <= 21) hourlyData[hour - 7]++;
          }

          if (status === 'COMPLETED' || status === 'SERVED') {
              totalCompleted++;
              
              // TÍNH TOÁN KẾ TOÁN ESCROW: Phân tách Doanh thu theo loại Voucher
              let actualPartnerRevenue = Number(a.total_amount || 0);
              
              // Nếu khách dùng mã Nền tảng (ADMIN) cấp -> Hệ thống tự lấy tiền túi bù cho Partner
              // Nên doanh thu của Partner tính theo Giá gốc dịch vụ.
              if (a.vouchers && a.vouchers.issuer_type === 'ADMIN') {
                  actualPartnerRevenue = Number(a.services?.price || a.total_amount || 0);
              }

              // Phân tích Doanh thu 7 ngày
              if (revByDay[dateStr] !== undefined) {
                  revByDay[dateStr] += actualPartnerRevenue;
                  weeklyRev += actualPartnerRevenue;
              }
              // Phân tích Cơ cấu dịch vụ (Service Mix)
              const serviceName = a.services?.service_name || "Dịch vụ khác";
              serviceMix[serviceName] = (serviceMix[serviceName] || 0) + actualPartnerRevenue;
          }
      });

      const aov = totalCompleted > 0 ? weeklyRev / totalCompleted : 0;
      
      // Xử lý Top 4 Dịch vụ có doanh thu cao nhất
      const topServices = Object.entries(serviceMix).sort((a, b) => b[1] - a[1]).slice(0, 4);

      return { 
          todayCount, pendingCheckInCount, pendingPaymentCount, cancelledTotal, weeklyRev, last7Days, revByDay,
          hourlyData, totalCompleted, totalAppointments, aov, topServices
      };
  };

  const metrics = getPartnerMetrics();

  // --- LOGIC SIDE DRAWER: DANH SÁCH & CHI TIẾT ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'list' | 'detail'>('list');
  const [drawerData, setDrawerTitle] = useState({ title: "", type: "" });
  const [selectedAppointments, setSelectedList] = useState<any[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

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
      setDrawerMode('list');
      setIsDrawerOpen(true);
  };

  const openAppointmentDetail = (appt: any, fromList = false) => {
      setSelectedDetail(appt);
      setDrawerMode('detail');
      // Nếu mở trực tiếp từ Grid, xóa thông tin Title của list cũ để ẩn nút "Quay lại"
      if (!fromList) setDrawerTitle({ title: "", type: "" }); 
      setIsDrawerOpen(true);
  };

  // --- LOGIC GOOGLE CALENDAR GRID 2.0 ---
  const hours = Array.from({ length: 18 }, (_, i) => i + 5);
  const calendarRef = typeof window !== 'undefined' ? (null as any) : null; // Ref để auto-scroll
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setDate(monday.getDate() + i);
      return monday;
  });

  // Hàm tính toán vị trí: Thuật toán Xếp Lớp (Layered Stacking) chuẩn Google Calendar
  const getPositionedEvents = (dayAppointments: any[]) => {
    const events = [...dayAppointments].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    return events.map((event, i) => {
        const start = new Date(event.start_time).getTime();
        const end = new Date(event.end_time).getTime();
        
        // Tìm các sự kiện BẮT ĐẦU TRƯỚC và chồng lấn lên sự kiện này để tính khoảng thò ra (offset)
        const overlappingBefore = events.filter((other, j) => {
            if (j >= i) return false;
            const startOther = new Date(other.start_time).getTime();
            const endOther = new Date(other.end_time).getTime();
            return (start < endOther && end > startOther);
        });

        const offset = Math.min(overlappingBefore.length, 4); // Lệch tối đa 4 lớp để không tràn cột
        const duration = (end - start) / (1000 * 60);
        
        // Kiểm tra xem sự kiện này có bị trùng với BẤT KỲ sự kiện nào khác không
        const hasOverlap = events.some((other, j) => i !== j && (new Date(other.start_time).getTime() < end && new Date(other.end_time).getTime() > start));

        return {
            ...event,
            top: (new Date(event.start_time).getHours() - 5) * 100 + (new Date(event.start_time).getMinutes() / 60) * 100,
            height: Math.max((duration / 60) * 100, 25),
            offsetLeftPx: hasOverlap ? (offset * 14) + 2 : 2, // Mỗi lớp thụt vào 14px để lộ chữ
            widthPercent: hasOverlap ? 85 : 100, // Nếu trùng thì thẻ rộng 85%, đứng một mình rộng 100%
            zIndex: 10 + offset // Thẻ sau đè lên thẻ trước
        };
    });
};
  
  // --- CẤU HÌNH UI CHO DASHBOARD ĐA BIỂU ĐỒ ---
  const commonOptions = {
      chart: { toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit', parentHeightOffset: 0 },
      theme: { mode: isDarkMode ? 'dark' : 'light' },
      grid: { borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', strokeDashArray: 4, padding: { top: 0, right: 0, bottom: 0, left: 10 } },
      dataLabels: { enabled: false },
  };

  // 1. Biểu đồ Doanh thu (Bar)
  const revChartOptions: any = {
      ...commonOptions,
      colors: ['#80BF84'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '40%' } },
      xaxis: { categories: metrics.last7Days, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#64748b', fontWeight: 600 } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (val: number) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(val), style: { colors: isDarkMode ? '#9ca3af' : '#64748b', fontWeight: 600 } } },
      tooltip: { y: { formatter: (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val) }, theme: isDarkMode ? 'dark' : 'light' }
  };

  // 2. Phễu Trạng thái (Donut)
  const statusChartOptions: any = {
      ...commonOptions, chart: { type: 'donut', background: 'transparent' },
      colors: ['#10b981', '#f59e0b', '#f43f5e', '#64748b'],
      labels: ['Đã xong', 'Chờ xử lý', 'Đã hủy', 'Khác'],
      plotOptions: { pie: { donut: { size: '75%', labels: { show: true, name: { show: true }, value: { show: true, formatter: (v: string) => v, color: isDarkMode ? '#fff' : '#000', fontSize: '24px', fontWeight: 800 }, total: { show: true, showAlways: true, label: 'Tổng đơn', color: isDarkMode ? '#9ca3af' : '#64748b', formatter: function (w: any) { return w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0) } } } } } },
      stroke: { show: true, colors: isDarkMode ? '#0f0f11' : '#ffffff', width: 2 },
      legend: { show: false }
  };

  // 3. Giờ Cao Điểm (Heat/Bar)
  const peakHourOptions: any = {
      ...commonOptions, colors: ['#3b82f6'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      xaxis: { categories: ['7h', '8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h'], labels: { style: { colors: isDarkMode ? '#9ca3af' : '#64748b', fontSize: '9px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { show: false },
      tooltip: { y: { formatter: (val: number) => `${val} lượt khách` } }
  };

  // 4. Cơ cấu Dịch vụ (Horizontal Bar)
  const serviceOptions: any = {
      ...commonOptions, colors: ['#8b5cf6'],
      plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '50%' } },
      xaxis: { labels: { formatter: (val: number) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(val), style: { colors: isDarkMode ? '#9ca3af' : '#64748b' } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { colors: isDarkMode ? '#d1d5db' : '#334155', fontWeight: 600 }, maxWidth: 120 } },
      tooltip: { y: { formatter: (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val) } }
  };

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') { setIsDarkMode(false); document.documentElement.classList.remove('dark'); } 
    else { setIsDarkMode(true); document.documentElement.classList.add('dark'); }

    const loadData = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
      if (token) {
        try {
            // 2. TẢI DỮ LIỆU PROFILE TRƯỚC ĐỂ LẤY THÔNG TIN ĐỊNH DANH USER
            const pRes = await fetch(`${API_URL}/user/profile`, { headers: { "Authorization": `Bearer ${token}` } });
            const pData = await pRes.json();
            if (pData.status === "success" && pData.data?.profile) {
                setUser(pData.data.profile);
                setUserRole(pData.data.profile.role);
            }

            // 1. KIỂM TRA PHẢN HỒI TỪ PAYOS (PAYMENT VERIFICATION)
            const urlParams = new URLSearchParams(window.location.search);
            const orderCode = urlParams.get('orderCode');
            const cancel = urlParams.get('cancel');

            if (orderCode) {
                if (cancel === 'true') {
                    toast.error("Bạn đã hủy thanh toán giao dịch.");
                } else {
                    const tid = toast.loading("Đang xác nhận kết quả thanh toán...");
                    const vRes = await fetch(`${API_URL}/appointments/payment/verify?orderCode=${orderCode}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    const vData = await vRes.json();
                    if (vRes.ok && vData.status === "success" && vData.message !== "Đã xác nhận trước đó") {
                        toast.success("Thanh toán bảo chứng thành công!", { id: tid });
                        setActiveTab('upcoming');
                    } else if (!vRes.ok) {
                        toast.error(vData.detail || "Thanh toán chưa hoàn tất.", { id: tid });
                    }
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // 3. TẢI DANH SÁCH LỊCH HẸN
            const aRes = await fetch(`${API_URL}/appointments/me`, { headers: { "Authorization": `Bearer ${token}` } });
            const aData = await aRes.json();
            if (aData.status === "success") setAppointments(aData.data);
        } catch (error) { toast.error("Không thể tải dữ liệu lịch hẹn."); }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Hiệu ứng tự động cuộn lưới lịch về thời gian hiện tại
  useEffect(() => {
    if (isMounted && !isLoading) {
        setTimeout(() => {
            const calendarBody = document.getElementById('calendar-body');
            if (calendarBody) {
                const nowHour = new Date().getHours();
                const scrollPos = (nowHour - 7) * 100; // Cuộn đến mốc trước giờ hiện tại 2 tiếng để dễ nhìn
                calendarBody.scrollTo({ top: scrollPos, behavior: 'smooth' });
            }
        }, 800);
    }
  }, [isMounted, isLoading]);

  const handleThemeToggle = async () => { 
    const newMode = !isDarkMode; setIsDarkMode(newMode);
    const themeStr = newMode ? 'dark' : 'light';
    if (newMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', themeStr);
  };

  const formatPrice = (price: number) => {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // BƯỚC 3.1: GỌI API LẤY PREVIEW HÓA ĐƠN & AUTO-APPLY VOUCHER
  const handlePaymentClick = async (appointmentId: string) => {
    const tid = toast.loading("Đang chuẩn bị hóa đơn...");
    try {
        const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
        const res = await fetch(`${API_URL}/appointments/${appointmentId}/preview`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await res.json();
        if (res.ok && result.data) {
            setPaymentPreview({ ...result.data, appointmentId });
            setIsPreviewModalOpen(true);
            toast.dismiss(tid);
        } else {
            throw new Error(result.detail || "Không thể lấy hóa đơn.");
        }
    } catch (e: any) { 
        toast.error(e.message || "Lỗi khi lấy hóa đơn", { id: tid }); 
    }
  };

  // BƯỚC 3.2: XÁC NHẬN CHỐT ĐƠN & CHUYỂN PAYOS
  const confirmPayment = async () => {
    if (!paymentPreview?.appointmentId) return;
    setIsCreatingPayment(true);
    const tid = toast.loading("Đang tạo liên kết thanh toán an toàn...");
    try {
        const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
        const res = await fetch(`${API_URL}/appointments/${paymentPreview.appointmentId}/pay`, {
            method: "POST", 
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await res.json();
        
        if (res.ok && result.checkout_url) {
            toast.success("Đang chuyển hướng sang cổng thanh toán...", { id: tid });
            window.location.href = result.checkout_url;
        } else {
            throw new Error(result.detail || "Hệ thống chưa tạo được link thanh toán.");
        }
    } catch (e: any) { 
        toast.error(e.message || "Lỗi thanh toán", { id: tid }); 
        setIsCreatingPayment(false);
    }
  };

  // BƯỚC 4 CỦA LUỒNG: PARTNER XÁC NHẬN HOÀN THÀNH (CHECK-IN)
  // BỔ SUNG: HÀM HỦY LỊCH (USER CHỦ ĐỘNG HỦY)
  const handleCancelAppointment = async (appointmentId: string) => {
    setCancelConfirmId(null);
    const tid = toast.loading("Đang tiến hành hủy yêu cầu...");
    try {
        const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
        const res = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
            method: "PATCH", 
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await res.json();
        if (res.ok) {
            toast.success(result.message + " (Voucher ưu đãi đã được trả lại vào Ví)", { id: tid });
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
          const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
          const res = await fetch(`${API_URL}/appointments/${appointmentId}/check-in`, {
              method: "PATCH", 
              headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
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

                    {/* RENDER VIEW - DASHBOARD QUẢN TRỊ 2.0 */}
                    {partnerViewMode === 'analytics' ? (
                        <div className="flex flex-col gap-6 animate-fade-in">
                            
                            {/* Dòng 1: High-level KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-5 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-[#80BF84] text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                                    <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Tổng doanh thu (7 Ngày)</p>
                                    <p className="text-3xl font-black">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(metrics.weeklyRev)}</p>
                                </div>
                                <div className="p-5 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Giá trị đơn trung bình (AOV)</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(metrics.aov)}</p>
                                </div>
                                <div className="p-5 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tổng lịch hẹn đã phục vụ</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{metrics.totalCompleted} <span className="text-sm font-medium text-slate-500">/ {metrics.totalAppointments} đơn</span></p>
                                </div>
                            </div>

                            {/* Dòng 2: Biểu đồ chính */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Doanh thu (Chiếm 2/3) */}
                                <div className="md:col-span-2 p-6 rounded-[2rem] bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-lg">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2"><Activity size={16} className="text-[#80BF84]"/> Dòng tiền 7 ngày qua</h3>
                                    <div className="h-[280px] w-full">
                                        <ReactApexChart options={revChartOptions} series={[{ name: 'Doanh thu', data: metrics.last7Days.map(d => metrics.revByDay[d]) }]} type="bar" height="100%" />
                                    </div>
                                </div>
                                
                                {/* Phễu Trạng thái (Chiếm 1/3) */}
                                <div className="p-6 rounded-[2rem] bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-lg flex flex-col">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2"><Compass size={16} className="text-blue-500"/> Tỷ lệ trạng thái</h3>
                                    <div className="flex-1 flex items-center justify-center min-h-[250px]">
                                        <ReactApexChart 
                                            options={statusChartOptions} 
                                            series={[metrics.totalCompleted, metrics.pendingPaymentCount + metrics.pendingCheckInCount, metrics.cancelledTotal, Math.max(0, metrics.totalAppointments - metrics.totalCompleted - metrics.pendingPaymentCount - metrics.pendingCheckInCount - metrics.cancelledTotal)]} 
                                            type="donut" height="100%" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dòng 3: Insigths sâu */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Giờ cao điểm */}
                                <div className="p-6 rounded-[2rem] bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-lg">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1 uppercase tracking-widest flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Mật độ giờ cao điểm</h3>
                                    <p className="text-xs text-slate-500 mb-4">Dựa trên thời gian bắt đầu của tất cả lịch hẹn</p>
                                    <div className="h-[220px] w-full">
                                        <ReactApexChart options={peakHourOptions} series={[{ name: 'Khách hàng', data: metrics.hourlyData }]} type="bar" height="100%" />
                                    </div>
                                </div>

                                {/* Cơ cấu dịch vụ */}
                                <div className="p-6 rounded-[2rem] bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-lg">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1 uppercase tracking-widest flex items-center gap-2"><Receipt size={16} className="text-purple-500"/> Top Dịch vụ mang lại doanh thu</h3>
                                    <p className="text-xs text-slate-500 mb-4">Các dịch vụ có tỷ trọng dòng tiền lớn nhất</p>
                                    <div className="h-[220px] w-full">
                                        <ReactApexChart 
                                            options={{...serviceOptions, xaxis: { ...serviceOptions.xaxis, categories: metrics.topServices.map(s => s[0]) }}} 
                                            series={[{ name: 'Doanh thu', data: metrics.topServices.map(s => s[1]) }]} 
                                            type="bar" height="100%" 
                                        />
                                    </div>
                                </div>
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

                            {/* Calendar Body 2.0 - Đã tích hợp Phân cấp lưới và Rich Event Cards */}
                            <div 
                                id="calendar-body"
                                className="flex-1 overflow-y-auto relative no-scrollbar bg-white dark:bg-[#0a0a0c]"
                            >
                                <div className="grid grid-cols-[80px_1fr] min-h-[1800px] relative">
                                    
                                    {/* CỘT GIỜ (BÊN TRÁI) */}
                                    <div className="border-r border-slate-200 dark:border-white/10 bg-slate-50/30 dark:bg-black/20">
                                        {hours.map(h => (
                                            <div key={h} className="h-[100px] relative">
                                                <span className="absolute top-[-10px] right-3 text-[11px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-tighter">
                                                    {h > 12 ? `${h-12} PM` : h === 12 ? '12 PM' : `${h} AM`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* LƯỚI LỊCH TRÌNH 7 CỘT */}
                                    <div className="grid grid-cols-7 relative">
                                        {/* Đường kẻ ngang (Giờ chính & 30 phút) */}
                                        {hours.map(h => (
                                            <React.Fragment key={h}>
                                                <div className="absolute w-full border-b border-slate-200 dark:border-white/10" style={{ top: `${(h-5)*100}px` }}></div>
                                                <div className="absolute w-full border-b border-dashed border-slate-100 dark:border-white/5" style={{ top: `${(h-5)*100 + 50}px` }}></div>
                                            </React.Fragment>
                                        ))}
                                        
                                        {/* Đường kẻ dọc phân tách ngày */}
                                        {Array.from({length: 6}).map((_, i) => (
                                            <div key={i} className="absolute h-full border-r border-slate-200 dark:border-white/10" style={{ left: `${(i+1)*(100/7)}%` }}></div>
                                        ))}

                                        {/* RENDER CÁC KHỐI SỰ KIỆN THEO NGÀY (Xử lý Overlap) */}
                                        {weekDays.map((day, dIdx) => {
                                            const dayApps = appointments.filter(a => 
                                                ['CONFIRMED', 'SERVED', 'COMPLETED'].includes(a.status) && 
                                                a.start_time && new Date(a.start_time).toDateString() === day.toDateString()
                                            );
                                            const positioned = getPositionedEvents(dayApps);

                                            return positioned.map((appt) => {
                                                const isConfirmed = appt.status === 'CONFIRMED';
                                                const isServed = appt.status === 'SERVED';
                                                
                                                return (
                                                    <div 
                                                        key={appt.id}
                                                        className={`absolute rounded-lg px-2 py-1.5 border-[1.5px] border-white dark:border-[#0a0a0c] transition-all hover:shadow-2xl cursor-pointer group/card overflow-hidden select-none
                                                            ${isConfirmed ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-400' : 
                                                              isServed ? 'bg-blue-500 text-white shadow-sm hover:bg-blue-400' : 
                                                              'bg-slate-400 text-white opacity-80 hover:bg-slate-300'}`}
                                                        style={{ 
                                                            top: `${appt.top}px`, 
                                                            height: `${appt.height}px`, 
                                                            left: `calc(${dIdx * (100/7)}% + ${appt.offsetLeftPx}px)`, 
                                                            width: `calc(${(100/7)}% * ${appt.widthPercent / 100} - 4px)`,
                                                            zIndex: appt.zIndex || 10
                                                        }}
                                                        onClick={() => openAppointmentDetail(appt)}
                                                    >
                                                        {/* Google Style: Ưu tiên Title và tối giản hóa khi hẹp */}
                                                        <div className="flex flex-col h-full">
                                                            <p className={`font-black leading-tight truncate tracking-tight ${appt.height < 40 ? 'text-[9px]' : 'text-[11px]'}`}>
                                                                {appt.services?.service_name}
                                                            </p>
                                                            
                                                            {appt.height > 45 && (
                                                                <div className="flex items-center gap-1 mt-1 opacity-90 transition-all group-hover/card:translate-x-0.5">
                                                                    <span className="text-[9px] font-bold truncate">
                                                                        {appt.users?.full_name} • {new Date(appt.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Subtle Indicator: Chỉ hiện khi hover để tránh rối mắt */}
                                                        <div className="absolute bottom-1 right-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                            <Activity size={10} className="text-white/50" />
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })}

                                        {/* CURRENT TIME INDICATOR (Sợi chỉ đỏ tinh tế) */}
                                        <div 
                                            className="absolute w-full flex items-center z-40 pointer-events-none transition-all duration-1000" 
                                            style={{ top: `${(new Date().getHours() - 5) * 100 + (new Date().getMinutes() / 60) * 100}px` }}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-rose-500 border-4 border-white dark:border-[#0a0a0c] -ml-2 shadow-md"></div>
                                            <div className="flex-1 h-0.5 bg-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]"></div>
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
                                
                                // TOÁN HỌC VOUCHER BỌC THÉP (Tự động áp mã tính toán trên UI)
                                const { originalPrice, finalPrice, discountAmount, hasVoucher } = getCalculatedPrices(appt);
                                
                                const duration = "60 phút";

                                return (
                                    <div key={appt.id} className={`group flex flex-col md:flex-row overflow-hidden rounded-[1.5rem] border shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#80BF84]/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border-slate-200/50 dark:border-white/10 relative`}>
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"></div>
                                        
                                        {/* CỘT THỜI GIAN (Trái) */}
                                        <div className="w-full md:w-36 p-6 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-black/20 border-b md:border-b-0 md:border-r border-slate-100/50 dark:border-white/5 relative shrink-0">
                                            {currentStatus === 'CONFIRMED' && <div className="absolute top-0 left-0 w-full h-1 bg-[#80BF84] shadow-[0_0_10px_#80BF84]"></div>}
                                            <CalendarDays size={24} className="text-slate-300 dark:text-zinc-600 mb-2 group-hover:scale-110 transition-transform" />
                                            <span className="text-3xl font-black text-slate-800 dark:text-white text-center leading-tight tracking-tighter">{dayStr}</span>
                                            <div className="flex items-center gap-1.5 mt-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-white/10 shadow-sm">
                                                <Clock size={12} className="text-[#80BF84]"/>
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{timeStr}</span>
                                            </div>
                                        </div>

                                        {/* CỘT NỘI DUNG (Giữa) */}
                                        <div className="flex-1 p-6 relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex flex-col gap-2.5">
                                                    <span className={`w-max px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest shadow-sm
                                                        ${currentStatus === 'WAITING_PARTNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/50' : 
                                                          currentStatus === 'PENDING_PAYMENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200/50 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 
                                                          currentStatus === 'CONFIRMED' ? 'bg-[#80BF84]/20 text-emerald-800 dark:text-[#80BF84] border border-[#80BF84]/30' : 
                                                          currentStatus === 'COMPLETED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200/50' : 'bg-slate-200 text-slate-600 border border-slate-300/50 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                                                        {currentStatus.replace('_', ' ')}
                                                    </span>
                                                    {hasVoucher && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 border border-emerald-500/20 rounded-md w-max backdrop-blur-sm">
                                                            <Ticket size={10} className="text-emerald-600 dark:text-emerald-400" />
                                                            <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Đã dùng Voucher</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right flex flex-col items-end justify-center h-full">
                                                    {hasVoucher ? (
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="flex flex-col items-end">
                                                                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded uppercase tracking-tighter mb-0.5 w-max shadow-sm border border-rose-500/20">-{formatPrice(discountAmount)}</span>
                                                                <span className="font-bold text-slate-400 dark:text-zinc-500 line-through text-sm opacity-60">{formatPrice(originalPrice)}</span>
                                                            </div>
                                                            <p className="font-black text-3xl text-blue-600 dark:text-blue-400 drop-shadow-md tracking-tighter">{formatPrice(finalPrice)}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="font-black text-2xl text-slate-900 dark:text-white drop-shadow-sm tracking-tight">{formatPrice(finalPrice)}</p>
                                                    )}
                                                </div>
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
                                                    <button onClick={() => handlePaymentClick(appt.id)} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-slate-500/20">
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
                                            const token = typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null;
                                            const res = await fetch(`${API_URL}/appointments/${appt.id}/user-confirm`, {
                                                method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
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

        
      {/* ================= MODAL XÁC NHẬN HÓA ĐƠN TRƯỚC THANH TOÁN (PREVIEW) ================= */}
      {isPreviewModalOpen && paymentPreview && (
        <div className="fixed inset-0 z-[200] flex justify-center items-center p-4 animate-fade-in pointer-events-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isCreatingPayment && setIsPreviewModalOpen(false)}></div>
          
          <div className="relative w-full max-w-sm bg-white/40 dark:bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200/50 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-6 overflow-hidden animate-slide-up">
              {/* Decor Background Effect */}
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Receipt size={20} className="text-blue-500"/> Xác nhận Hóa đơn</h3>
                  <button onClick={() => !isCreatingPayment && setIsPreviewModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100/50 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                      <X size={16} />
                  </button>
              </div>

              <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-700 dark:text-zinc-300">
                      <span>Giá dịch vụ gốc</span>
                      <span>{formatPrice(paymentPreview.original_amount)}</span>
                  </div>

                  {paymentPreview.discount_amount > 0 ? (
                      <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 px-3 py-2.5 rounded-xl border border-emerald-100/50 dark:border-emerald-500/20 shadow-sm">
                              <span className="flex items-center gap-2"><Ticket size={16}/> Ưu đãi Voucher</span>
                              <span>- {formatPrice(paymentPreview.discount_amount)}</span>
                          </div>
                          {paymentPreview.applied_voucher_code && (
                              <p className="text-right text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest bg-white/50 dark:bg-black/20 w-max ml-auto px-2 py-1 rounded-md">
                                  Mã tự động áp dụng: {paymentPreview.applied_voucher_code}
                              </p>
                          )}
                      </div>
                  ) : (
                      <p className="text-right text-[10px] italic text-slate-500 dark:text-zinc-500 bg-white/50 dark:bg-black/20 w-max ml-auto px-2 py-1 rounded-md">Không có ưu đãi nào được áp dụng</p>
                  )}
              </div>

              {/* Đường cắt rãnh cưa */}
              <div className="relative py-6 z-10">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t-2 border-dashed border-slate-300/50 dark:border-zinc-600/50"></div>
                  </div>
                  <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full shadow-inner"></div>
                  <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full shadow-inner"></div>
              </div>

              <div className="flex justify-between items-end relative z-10 mb-8">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Tổng thanh toán</span>
                  <span className="font-black text-4xl text-blue-600 dark:text-blue-400 drop-shadow-md tracking-tighter">{formatPrice(paymentPreview.final_amount)}</span>
              </div>

              <button 
                  onClick={confirmPayment} 
                  disabled={isCreatingPayment}
                  className="relative w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-500/30 overflow-hidden group z-10 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full skew-x-12 transition-transform duration-500"></div>
                  {isCreatingPayment ? <Activity className="animate-spin" size={18}/> : <CreditCard size={18} />}
                  {isCreatingPayment ? "ĐANG CHUYỂN HƯỚNG..." : "XÁC NHẬN THANH TOÁN"}
              </button>
          </div>
        </div>
      )}

      {/* ================= THIẾT KẾ FLOATING SIDE DRAWER (ĐA NĂNG) ================= */}
        <div className={`fixed inset-0 z-[120] transition-all duration-500 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop mờ mềm mại */}
            <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-500" onClick={() => setIsDrawerOpen(false)}></div>
            
            {/* Nội dung Drawer - Thiết kế nổi (Floating), bo góc siêu mềm */}
            <div className={`absolute top-2 right-2 md:top-4 md:right-4 bottom-2 md:bottom-4 w-[calc(100%-16px)] md:w-[450px] bg-white/95 dark:bg-[#121214]/95 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-out flex flex-col overflow-hidden ${isDrawerOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}>
                
                {/* Header Dùng chung */}
                <div className="px-8 py-6 flex justify-between items-start border-b border-slate-100 dark:border-white/5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02]">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                            {drawerMode === 'list' ? drawerData.title : "Chi tiết Lịch hẹn"}
                        </h3>
                        {drawerMode === 'list' && (
                            <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Tổng cộng: {selectedAppointments.length} bản ghi</p>
                        )}
                        {drawerMode === 'detail' && selectedDetail && (
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-2 px-2.5 py-1 rounded-full inline-block ${
                                selectedDetail.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                selectedDetail.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                selectedDetail.status === 'SERVED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                selectedDetail.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 
                                'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                            }`}>
                                {selectedDetail.status.replace('_', ' ')}
                            </p>
                        )}
                    </div>
                    <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center transition-all text-slate-500 dark:text-white active:scale-95">
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Nội dung bên trong (Cuộn độc lập) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                    
                    {/* CHẾ ĐỘ 1: XEM DANH SÁCH METRICS */}
                    {drawerMode === 'list' && (
                        selectedAppointments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                <Activity size={48} className="mb-4" />
                                <p className="font-bold">Không có dữ liệu hiển thị</p>
                            </div>
                        ) : (
                            selectedAppointments.map((appt) => (
                                <div key={appt.id} onClick={() => openAppointmentDetail(appt, true)} className="p-5 rounded-[1.5rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 transition-all group/item cursor-pointer">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 overflow-hidden border border-white dark:border-zinc-700 shadow-sm shrink-0">
                                                {appt.users?.avatar_url ? <img src={appt.users.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={20}/>}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white text-sm line-clamp-1">{appt.customer_name || appt.users?.full_name || "Khách hàng ẩn danh"}</p>
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">{appt.customer_phone || appt.users?.phone || "Không có SĐT"}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-black text-[#80BF84] dark:text-[#80BF84] text-sm">{formatPrice(appt.total_amount || 0)}</p>
                                            <span className={`text-[9px] font-black uppercase ${
                                                appt.status === 'CONFIRMED' ? 'text-emerald-500' :
                                                appt.status === 'PENDING_PAYMENT' ? 'text-amber-500' :
                                                appt.status === 'CANCELLED' ? 'text-rose-500' : 'text-slate-500'
                                            }`}>{appt.status.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-400">
                                            <Activity size={14} className="text-[#80BF84]" />
                                            <span className="line-clamp-1">{appt.services?.service_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-400">
                                            <Clock size={14} className="text-[#80BF84]" />
                                            <span>{new Date(appt.start_time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )
                    )}

                    {/* CHẾ ĐỘ 2: CHI TIẾT 1 ĐƠN HÀNG */}
                    {drawerMode === 'detail' && selectedDetail && (
                        <div className="animate-fade-in space-y-6">
                            {/* Thông tin Khách hàng */}
                            <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Thông tin khách hàng</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[1.25rem] bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-500 overflow-hidden border-2 border-white dark:border-zinc-700 shadow-sm shrink-0">
                                        {selectedDetail.users?.avatar_url ? <img src={selectedDetail.users.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={24}/>}
                                    </div>
                                    <div>
                                        <p className="font-black text-xl text-slate-900 dark:text-white">{selectedDetail.customer_name || selectedDetail.users?.full_name || "Khách hàng ẩn danh"}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* Ưu tiên lấy SĐT khách để lại trong đơn hàng */}
                                            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                                                {selectedDetail.customer_phone || selectedDetail.users?.phone || "Không có SĐT"}
                                            </span>
                                            {(selectedDetail.customer_phone || selectedDetail.users?.phone) && (
                                                <a href={`tel:${selectedDetail.customer_phone || selectedDetail.users?.phone}`} className="w-6 h-6 rounded-full bg-[#80BF84]/20 flex items-center justify-center text-[#80BF84] hover:bg-[#80BF84] hover:text-white transition-colors">
                                                    <Phone size={10} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {selectedDetail.note && (
                                    <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-black/20 text-sm font-medium text-slate-600 dark:text-zinc-400 italic">
                                        "{selectedDetail.note}"
                                    </div>
                                )}
                            </div>

                            {/* Thông tin Dịch vụ & Thanh toán Kế toán (Hóa đơn Glassmorphism) */}
                            <div className="p-6 rounded-[2rem] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] space-y-5 relative overflow-hidden">
                                {/* Decor Background Effect */}
                                <div className="absolute -right-12 -top-12 w-40 h-40 bg-[#80BF84]/10 dark:bg-[#80BF84]/20 rounded-full blur-3xl pointer-events-none"></div>

                                <div className="flex items-center justify-between mb-2 relative z-10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết thanh toán</p>
                                    <Receipt size={16} className="text-slate-400" />
                                </div>
                                
                                <div className="flex items-start gap-3 mb-4 p-4 rounded-2xl bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/5 relative z-10">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-center shadow-inner shrink-0 border border-slate-100 dark:border-white/5">
                                        <Activity size={20} className="text-[#80BF84]" />
                                    </div>
                                    <div className="flex-1 mt-0.5">
                                        <span className="font-bold text-sm text-slate-800 dark:text-zinc-200 line-clamp-2 leading-snug">{selectedDetail.services?.service_name || "Dịch vụ Y tế"}</span>
                                        <span className="text-[10px] font-bold text-slate-500 mt-1 block">Cung cấp bởi: {selectedDetail.partner?.full_name || "Hệ thống AI Health"}</span>
                                    </div>
                                </div>

                                {(() => {
                                    const { originalPrice: dOrig, finalPrice: dFinal, discountAmount: dDisc, hasVoucher: dHasVoucher } = getCalculatedPrices(selectedDetail);
                                    return (
                                        <>
                                            <div className="space-y-3 px-2 relative z-10">
                                                <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-zinc-400">
                                                    <span>Giá niêm yết</span>
                                                    <span>{formatPrice(dOrig)}</span>
                                                </div>
                                                
                                                {dHasVoucher && (
                                                    <div className="flex justify-between items-center text-sm font-black text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-500/10 px-3 py-2.5 rounded-xl border border-rose-100/50 dark:border-rose-500/20 shadow-sm">
                                                        <span className="flex items-center gap-2"><Ticket size={16}/> Voucher giảm</span>
                                                        <span>- {formatPrice(dDisc)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Đường cắt hóa đơn Ticket */}
                                            <div className="relative py-4 z-10">
                                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                    <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-zinc-700/80"></div>
                                                </div>
                                                <div className="absolute left-[-32px] top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 dark:bg-[#0a0a0a] rounded-full border-r border-slate-200/50 dark:border-white/10 shadow-inner"></div>
                                                <div className="absolute right-[-32px] top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 dark:bg-[#0a0a0a] rounded-full border-l border-slate-200/50 dark:border-white/10 shadow-inner"></div>
                                            </div>
                                            
                                            <div className="flex justify-between items-end px-2 relative z-10">
                                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Tổng thanh toán</span>
                                                <div className="flex items-center gap-3">
                                                    {dHasVoucher && <span className="font-bold text-slate-400 dark:text-zinc-500 line-through text-lg opacity-60">{formatPrice(dOrig)}</span>}
                                                    <span className="font-black text-4xl text-blue-600 dark:text-blue-400 drop-shadow-md tracking-tighter">{formatPrice(dFinal)}</span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}

                                <div className="mt-6 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-500/20 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner"><Clock size={16} /></div>
                                        <div>
                                            <p className="font-black text-sm text-blue-900 dark:text-blue-300 tracking-tight">
                                                {new Date(selectedDetail.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedDetail.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                            <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 mt-0.5 uppercase tracking-widest">{new Date(selectedDetail.start_time).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    {selectedDetail.status === 'CONFIRMED' && <CheckCircle size={22} className="text-blue-500 drop-shadow-sm" />}
                                </div>
                            </div>

                            {/* Khu vực Xử lý Trạng thái đặc biệt */}
                            {selectedDetail.status === 'CONFIRMED' && (
                                <div className="p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 text-center">
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4">Hoàn tất dịch vụ</p>
                                    <input 
                                        type="text" 
                                        placeholder="Nhập 6 số mã khách" 
                                        className="w-full px-4 py-4 text-center rounded-[1.5rem] border border-emerald-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-black text-xl tracking-[0.3em] outline-none focus:ring-2 focus:ring-emerald-500/50 mb-4 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-600"
                                        value={checkInCodes[selectedDetail.id] || ''}
                                        onChange={(e) => setCheckInCodes({...checkInCodes, [selectedDetail.id]: e.target.value})}
                                    />
                                    <button 
                                        onClick={() => handleComplete(selectedDetail.id)} 
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-[1.5rem] shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={20} /> Xác nhận mã & Check-in
                                    </button>
                                </div>
                            )}

                            {selectedDetail.status === 'CANCELLED' && selectedDetail.rejection_reason && (
                                <div className="p-5 rounded-[1.5rem] bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle size={16} />
                                        <span className="text-xs font-black uppercase">Lý do từ chối/Hủy</span>
                                    </div>
                                    <p className="text-sm font-medium">{selectedDetail.rejection_reason}</p>
                                </div>
                            )}

                            {/* Điều hướng luồng quay lại nếu đi vào từ Danh sách */}
                            {drawerData.title && (
                                <button 
                                    onClick={() => setDrawerMode('list')}
                                    className="w-full py-3 mt-4 text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-white font-bold text-sm transition-colors"
                                >
                                    &larr; Quay lại danh sách
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}