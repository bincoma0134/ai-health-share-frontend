"use client";

import { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, User as UserIcon, 
  Sun, Moon, Bell, LogOut, Clock, MapPin, CheckCircle, XCircle, 
  ChevronRight, CalendarX2
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext"; // IMPORT CONTEXT THÔNG BÁO

// --- KHỞI TẠO SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu biến môi trường Supabase!");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- INTERFACE ---
interface Booking {
  id: string;
  service_id: string;
  total_amount: number;
  payment_status: string;
  service_status: string;
  created_at: string;
  services?: { service_name?: string };
}

export default function CalendarFeature() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI(); // LẤY HÀM MỞ THÔNG BÁO
  
  // --- STATE HỆ THỐNG & AUTH ---
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // --- STATE DỮ LIỆU ---
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  useEffect(() => {
    setIsMounted(true);
    
    // Khởi tạo Theme
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // Lấy Profile để lấy Role và Danh sách Bookings
        try {
            const res = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            const result = await res.json();
            
            if (result.status === "success") {
                setUserRole(result.data.profile.role);
                // Backend đang trả về danh sách đặt lịch trong result.data.bookings
                if (result.data.bookings) {
                    setBookings(result.data.bookings);
                }
            }
        } catch (error) {
            toast.error("Không thể tải dữ liệu lịch hẹn.");
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

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

  const handleGoToProfile = () => {
    setIsUserMenuOpen(false);
    if (userRole === "MODERATOR" || userRole === "SUPER_ADMIN") router.push("/moderator/profile");
    else if (userRole === "PARTNER_ADMIN") router.push("/partner/profile");
    else router.push("/profile");
  };

  // --- LỌC DỮ LIỆU ---
  const filteredBookings = bookings.filter(b => {
      const status = b.service_status.toLowerCase();
      if (activeTab === 'upcoming') return status === 'pending' || status === 'waiting';
      if (activeTab === 'completed') return status === 'completed';
      if (activeTab === 'cancelled') return status === 'cancelled' || status === 'rejected';
      return false;
  });

  // --- COMPONENT LOADING ĐỒNG BỘ ---
  if (isLoading || !isMounted) return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div>
        <div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"><Sparkles className="text-white w-6 h-6 animate-pulse" /></div>
      </div>
      <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">Khơi nguồn sức sống...</p>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* ================= 1. LEFT SIDEBAR (DÙNG CHUNG) ================= */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-colors duration-500">
        <div className="px-4 mb-10"><h1 onClick={() => router.push('/')} className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer transition-colors duration-500">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button onClick={() => router.push('/features/explore')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Compass size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Khám phá</span></button>
          
          {/* NÚT LỊCH HẸN ĐANG ACTIVE */}
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white font-bold transition-all"><CalendarDays size={24} strokeWidth={2.5} className="text-[#80BF84]" /><span className="text-sm tracking-wide">Lịch hẹn</span></button>
          
          <button onClick={() => router.push('/features/favorite')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Heart size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Yêu thích</span></button>
          <div className="mt-8 px-2">
            <button onClick={() => router.push('/features/AI')} className="w-full relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#80BF84] to-emerald-300 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 shadow-xl group-hover:scale-[1.02] transition-all"><Sparkles size={20} strokeWidth={3} /><span className="font-black text-sm tracking-wide">AI Trợ lý</span></div>
            </button>
          </div>
        </div>
        
        {/* NÚT AVATAR VÀ MENU DESKTOP */}
        <div className="mt-auto px-2 relative">
          {isUserMenuOpen && user && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
              <div className="absolute bottom-full mb-3 left-2 right-2 p-2 flex flex-col gap-1 z-50 animate-fade-in bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl">
                  <button onClick={handleGoToProfile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm w-full text-left"><UserIcon size={16} /> Trang cá nhân</button>
                  <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left"><LogOut size={16} /> Đăng xuất</button>
              </div>
            </>
          )}

          <button onClick={() => { if(!user) router.push('/'); else setIsUserMenuOpen(!isUserMenuOpen); }} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group border border-transparent hover:border-slate-300 dark:hover:border-white/10">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center border border-slate-300 dark:border-zinc-700 group-hover:border-[#80BF84] transition-colors"><UserIcon size={16} /></div>
            <span className="text-sm tracking-wide truncate max-w-[120px] text-left">{user ? user.email.split('@')[0] : "Đăng nhập"}</span>
          </button>
        </div>
      </div>

      {/* ================= 2. MAIN CALENDAR AREA ================= */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
        
        {/* THEME & NOTIFICATION CONTROLS */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3 pointer-events-auto">
          <button onClick={handleThemeToggle} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            {isDarkMode ? <Sun size={20} className="group-hover:text-amber-300 transition-colors"/> : <Moon size={20} className="group-hover:text-blue-500 transition-colors"/>}
          </button>
          
          {/* NÚT THÔNG BÁO ĐÃ ĐƯỢC CẬP NHẬT GỌI MODAL */}
          <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            <Bell size={20} className="group-hover:text-[#80BF84] transition-colors"/>
          </button>
        </div>

        <div className="max-w-4xl mx-auto pt-20 md:pt-24 pb-32 px-5 md:px-8">
            
            <div className="mb-8 md:mb-10 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3"><CalendarDays className="text-[#80BF84]" size={36} /> Lịch hẹn của bạn</h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Theo dõi và quản lý các lịch trình chăm sóc sức khỏe sắp tới.</p>
            </div>

            {/* KIỂM TRA ĐĂNG NHẬP */}
            {!user ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-slate-200/50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6"><UserIcon size={40} className="text-slate-400 dark:text-zinc-500" /></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Bạn chưa đăng nhập</h3>
                    <p className="text-slate-500 dark:text-zinc-400 mb-8 max-w-sm">Đăng nhập vào hệ thống để theo dõi toàn bộ hành trình chăm sóc sức khỏe của bạn.</p>
                    <button onClick={() => router.push('/')} className="px-8 py-4 bg-[#80BF84] text-zinc-950 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#80BF84]/20">Quay lại Trang chủ</button>
                </div>
            ) : (
                <div className="animate-fade-in">
                    {/* BỘ LỌC TABS */}
                    <div className="flex p-1.5 bg-slate-200/50 dark:bg-white/5 backdrop-blur-md rounded-2xl w-full md:w-max mb-8 border border-slate-300 dark:border-white/10 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('upcoming')} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === 'upcoming' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>Sắp tới</button>
                        <button onClick={() => setActiveTab('completed')} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === 'completed' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>Đã hoàn thành</button>
                        <button onClick={() => setActiveTab('cancelled')} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === 'cancelled' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>Đã hủy</button>
                    </div>

                    {/* DANH SÁCH LỊCH HẸN */}
                    <div className="flex flex-col gap-5">
                        {filteredBookings.length === 0 ? (
                            <div className="glass-panel p-12 rounded-[2rem] bg-white/50 dark:bg-black/30 border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center border-dashed">
                                <div className="w-16 h-16 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4"><CalendarX2 size={28} className="text-slate-400 dark:text-zinc-500" /></div>
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Không có lịch hẹn nào</h4>
                                <p className="text-slate-500 dark:text-zinc-400 text-sm">Bạn chưa có lịch trình nào trong danh sách này.</p>
                            </div>
                        ) : (
                            filteredBookings.map((booking) => {
                                const dateObj = new Date(booking.created_at); // Dùng created_at làm ngày đặt tạm thời
                                const dayStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' });
                                const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div key={booking.id} className="glass-panel p-5 md:p-6 rounded-[1.5rem] bg-white/70 dark:bg-black/40 border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row gap-5 items-start md:items-center group cursor-pointer">
                                        
                                        {/* Khối Ngày tháng */}
                                        <div className="w-full md:w-28 flex md:flex-col items-center justify-between md:justify-center p-4 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                                            <div className="flex flex-col items-start md:items-center">
                                                <span className="text-xs font-bold text-[#80BF84] uppercase tracking-wider mb-1">Ngày hẹn</span>
                                                <span className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{dayStr}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-black rounded-lg shadow-sm border border-slate-200 dark:border-white/10 mt-0 md:mt-3">
                                                <Clock size={12} className="text-slate-400 dark:text-zinc-500" /><span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{timeStr}</span>
                                            </div>
                                        </div>

                                        {/* Thông tin dịch vụ */}
                                        <div className="flex-1 flex flex-col gap-2">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                {activeTab === 'upcoming' && <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-full uppercase tracking-wider border border-amber-500/20 flex items-center gap-1"><Clock size={10}/> Chờ phục vụ</span>}
                                                {activeTab === 'completed' && <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-[#80BF84] text-[10px] font-black rounded-full uppercase tracking-wider border border-emerald-500/20 flex items-center gap-1"><CheckCircle size={10}/> Đã hoàn thành</span>}
                                                {activeTab === 'cancelled' && <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-full uppercase tracking-wider border border-rose-500/20 flex items-center gap-1"><XCircle size={10}/> Đã hủy</span>}
                                                
                                                {booking.payment_status === 'PAID' ? (
                                                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full uppercase tracking-wider border border-blue-500/20">Đã thanh toán Escrow</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-full uppercase tracking-wider border border-slate-500/20">Chưa thanh toán</span>
                                                )}
                                            </div>
                                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white line-clamp-2">{booking.services?.service_name || "Dịch vụ trị liệu chăm sóc sức khỏe"}</h3>
                                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><MapPin size={14}/> Tại cơ sở Đối tác AI Health</p>
                                        </div>

                                        {/* Giá và Nút */}
                                        <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-white/10 mt-2 md:mt-0">
                                            <div className="text-left md:text-right">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Giá trị</div>
                                                <div className="text-lg font-black text-[#80BF84]">{booking.total_amount.toLocaleString()} đ</div>
                                            </div>
                                            <button className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-zinc-400 group-hover:bg-[#80BF84] group-hover:text-zinc-950 transition-colors">
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* ================= 3. MOBILE BOTTOM DOCK (DÙNG CHUNG) ================= */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl transition-colors duration-500">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => router.push('/features/AI')} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-slate-200/50 dark:bg-zinc-800 p-[2px] shadow-[0_0_20px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-all duration-300"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center transition-colors duration-500"><Sparkles size={26} className="text-slate-400" strokeWidth={2.5} /></div></div>
            </button>
            
            {/* NÚT LỊCH HẸN MOBILE ĐANG ACTIVE */}
            <button className="text-[#80BF84] transition-colors group"><CalendarDays size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
            {/* KHU VỰC AVATAR MOBILE CÓ MENU */}
            <div className="relative">
              {isUserMenuOpen && user && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute bottom-full mb-6 right-0 w-48 p-2 flex flex-col gap-1 z-50 animate-fade-in bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl">
                      <button onClick={handleGoToProfile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm w-full text-left"><UserIcon size={16} /> Trang cá nhân</button>
                      <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left"><LogOut size={16} /> Đăng xuất</button>
                  </div>
                </>
              )}
              <button onClick={() => { if(!user) router.push('/'); else setIsUserMenuOpen(!isUserMenuOpen); }} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group">
                <UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}