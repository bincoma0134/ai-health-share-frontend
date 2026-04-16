"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, X, User as UserIcon, LogOut, ChevronRight, ShieldCheck } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

// --- KHỞI TẠO SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu biến môi trường Supabase! Vui lòng kiểm tra file .env.local");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Service {
  id: string;
  partner_id: string;
  service_name: string;
  description: string;
  price: number;
}

export default function UserFeed() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- STATE AUTH ---
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // --- STATE BOOKING ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    const fetchServices = async () => {
      try {
        const response = await fetch("https://ai-health-share-backend.onrender.com/services");
        const result = await response.json();
        if (result.status === "success") setServices(result.data);
      } catch (error) {
        toast.error("Không thể tải danh sách dịch vụ. Vui lòng thử lại!");
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();

    return () => authListener.subscription.unsubscribe();
  }, []);

  // --- XỬ LÝ AUTH ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const toastId = toast.loading("Đang xử lý xác thực..."); 
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Đăng nhập thành công!", { id: toastId });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Đăng ký thành công! Bạn đã có thể đặt lịch.", { id: toastId });
      }
      setIsAuthModalOpen(false);
      setEmail("");
      setPassword("");
    } catch (error: any) {
      toast.error(`Lỗi xác thực: ${error.message}`, { id: toastId });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Đã đăng xuất an toàn.");
  };

  // --- XỬ LÝ ĐẶT LỊCH ---
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService || !user) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading("Đang khởi tạo cổng thanh toán an toàn...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");

      const bookingRes = await fetch("https://ai-health-share-backend.onrender.com/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          user_id: user.id,
          service_id: activeService.id,
          affiliate_code: affiliateCode || null,
          total_amount: activeService.price
        })
      });
      const bookingData = await bookingRes.json();

      if (!bookingRes.ok || bookingData.status !== "success") throw new Error(bookingData.detail || "Lỗi ghi nhận giao dịch");

      if (bookingData.checkout_url) {
        toast.success("Đang mở cổng thanh toán ở tab mới...", { id: toastId });
        window.open(bookingData.checkout_url, '_blank'); 
        setIsModalOpen(false);
        setAffiliateCode("");
      } else {
        toast.success("🎉 Đặt lịch thành công! Hệ thống đã ghi nhận.", { id: toastId });
        setIsModalOpen(false);
        setAffiliateCode("");
      }
    } catch (error: any) {
      toast.error(`Lỗi hệ thống: ${error.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    } 
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm animate-pulse">Đang tải không gian sống khỏe...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      
      {/* HEADER (Floating Glassmorphism) */}
      <div className="absolute top-0 w-full z-50 p-4 md:p-6 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <h1 className="text-2xl font-bold text-white tracking-widest drop-shadow-md pointer-events-auto">
          AI<span className="text-emerald-400">HEALTH</span>
        </h1>
        {user ? (
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 glass-panel px-4 py-2 rounded-full">
              <UserIcon size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white truncate max-w-[120px]">{user.email.split("@")[0]}</span>
            </div>
            <button onClick={handleLogout} className="p-2.5 glass-panel text-red-400 rounded-full hover:bg-red-500/20 active:scale-95 transition-all">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="pointer-events-auto px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all"
          >
            Đăng nhập
          </button>
        )}
      </div>

      {/* FEED VIDEO */}
      {services.map((item, index) => {
        const videoNumber = (index % 3) + 1;
        return (
          <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always bg-zinc-900 overflow-hidden">
             {/* Fallback màu nền & Video */}
             <video src={`/video-${videoNumber}.mp4`} className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-lighten" loop autoPlay muted playsInline />
             
             {/* Smooth Gradients tạo chiều sâu */}
             <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />
             
             {/* Nội dung dịch vụ */}
             <div className="absolute bottom-8 left-4 right-20 md:left-8 text-white z-10 drop-shadow-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-zinc-200 mb-3 border border-white/10">
                  <ShieldCheck size={14} className="text-emerald-400"/> Dịch vụ được xác thực
                </div>
                <h3 className="text-3xl font-bold mb-3 leading-tight text-balance">{item.service_name}</h3>
                <div className="inline-flex items-center px-4 py-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-lg font-bold rounded-2xl">
                  {item.price.toLocaleString()} VND
                </div>
             </div>

            {/* Nút Call-to-Action (CTA) */}
            <div className="absolute bottom-8 right-4 md:right-8 flex flex-col gap-6 items-center text-white z-10">
              <button 
                onClick={() => {
                  if (!user) {
                    toast.info("Vui lòng đăng nhập để đặt lịch!");
                    setIsAuthModalOpen(true);
                    return;
                  }
                  setActiveService(item);
                  setIsModalOpen(true);
                }}
                className="group flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-110 active:scale-95"
              >
                <div className="p-4 rounded-full bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] group-hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all">
                  <CalendarPlus size={28} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white drop-shadow-md">Đặt lịch</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* --- FORM MODAL AUTH (Refined) --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-panel rounded-[2rem] p-8 relative">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:rotate-90 transition-all">
              <X size={24} />
            </button>
            
            <div className="mb-8 text-center">
              <h3 className="text-3xl font-bold text-white tracking-tight mb-2">
                {isLoginMode ? "Mừng trở lại" : "Tạo Tài Khoản"}
              </h3>
              <p className="text-zinc-400 text-sm">Hành trình sống khỏe bắt đầu từ đây.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <input 
                type="email" required placeholder="Email của bạn"
                className="w-full px-5 py-4 bg-black/50 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" required placeholder="Mật khẩu (tối thiểu 6 ký tự)" minLength={6}
                className="w-full px-5 py-4 bg-black/50 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              
              <button 
                type="submit" disabled={authLoading}
                className="w-full py-4 mt-2 bg-white text-black font-bold text-lg rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50"
              >
                {authLoading ? "Đang xử lý..." : (isLoginMode ? "Đăng nhập" : "Đăng ký")}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-400">
              {isLoginMode ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-white font-bold hover:underline">
                {isLoginMode ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* --- FORM MODAL ĐẶT LỊCH (Premium Step-by-Step Feel) --- */}
      {isModalOpen && activeService && user && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-lg sm:p-4 transition-opacity">
          <div className="w-full sm:max-w-md bg-zinc-950 sm:rounded-[2.5rem] rounded-t-[2.5rem] p-6 sm:p-8 border border-zinc-800/50 shadow-2xl animate-slide-up">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">Xác nhận đặt lịch</h3>
                <p className="text-sm text-zinc-400 mt-1">Hoàn tất thủ tục bảo chứng an toàn</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                <X size={20} />
              </button>
            </div>
            
            {/* Thẻ hiển thị Dịch vụ giống Apple Pay */}
            <div className="mb-6 p-5 glass-panel rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1 font-semibold">Gói Dịch Vụ</p>
              <p className="text-lg text-white font-bold leading-tight mb-4 pr-8">{activeService.service_name}</p>
              
              <div className="flex justify-between items-end">
                <p className="text-xs text-zinc-500">Thanh toán qua Escrow</p>
                <p className="text-2xl text-emerald-400 font-black">{activeService.price.toLocaleString()} <span className="text-sm">VND</span></p>
              </div>
            </div>

            <form onSubmit={handleBooking} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Mã chuyên gia / KOL (Nếu có)</label>
                <div className="relative">
                  <input 
                    type="text" placeholder="Nhập mã giới thiệu..."
                    className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white uppercase placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:bg-zinc-900/50 transition-all"
                    value={affiliateCode} onChange={(e) => setAffiliateCode(e.target.value)}
                  />
                  {affiliateCode && <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />}
                </div>
              </div>
              
              <button 
                type="submit" disabled={isSubmitting}
                className="w-full py-4 mt-4 flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg rounded-2xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Đang kết nối..." : (
                  <>Thanh toán PayOS <ChevronRight size={20}/></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}