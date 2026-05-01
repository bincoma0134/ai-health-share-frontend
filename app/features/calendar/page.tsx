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

        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex gap-8 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500"><Home size={26} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500"><Compass size={26} /></button>
            <button className="text-[#80BF84]"><CalendarDays size={26} /></button>
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="text-slate-500"><UserIcon size={26} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}