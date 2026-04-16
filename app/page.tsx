"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, X, User as UserIcon, LogOut, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
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
    const toastId = toast.loading("Đang kết nối không gian an toàn..."); 
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Chào mừng bạn trở lại!", { id: toastId });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Khởi tạo thành công! Hãy bắt đầu hành trình của bạn.", { id: toastId });
      }
      setIsAuthModalOpen(false);
      setEmail(""); setPassword("");
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
    const toastId = toast.loading("Đang thiết lập cổng bảo chứng Escrow...");

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
        toast.success("Đang mở cổng thanh toán PayOS...", { id: toastId });
        window.open(bookingData.checkout_url, '_blank'); 
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
      <div className="h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div>
          <div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Sparkles className="text-white w-6 h-6 animate-pulse" />
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase animate-pulse">Khơi nguồn sức sống...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-100 overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      
      {/* HEADER (Light Glassmorphism) */}
      <div className="absolute top-0 w-full z-50 p-4 md:p-8 flex justify-between items-center pointer-events-none transition-all">
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter drop-shadow-sm pointer-events-auto flex items-center gap-1">
          AI<span className="text-emerald-500">HEALTH</span>
        </h1>
        {user ? (
          <div className="flex items-center gap-3 pointer-events-auto animate-fade-in">
            <div className="flex items-center gap-2 glass-panel px-4 py-2.5 rounded-full border-white/80">
              <UserIcon size={16} className="text-emerald-600" />
              <span className="text-sm font-semibold text-slate-700 truncate max-w-[120px]">{user.email.split("@")[0]}</span>
            </div>
            <button onClick={handleLogout} className="p-3 glass-panel text-rose-500 rounded-full hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-90 transition-all shadow-sm">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="pointer-events-auto px-6 py-3 glass-panel text-slate-800 font-bold rounded-full hover:bg-white/80 active:scale-95 transition-all shadow-sm flex items-center gap-2"
          >
            Đăng nhập <ChevronRight size={16} className="text-emerald-500"/>
          </button>
        )}
      </div>

      {/* FEED DỊCH VỤ */}
      {services.map((item, index) => {
        const videoNumber = (index % 3) + 1;
        return (
          <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always bg-slate-100 overflow-hidden flex items-end md:items-center justify-center p-4 pb-24 md:p-12">
             
             {/* Nền Video với lớp màng sương (Frosted Overlay) */}
             <div className="absolute inset-0 w-full h-full">
               <video src={`/video-${videoNumber}.mp4`} className="w-full h-full object-cover opacity-60 mix-blend-multiply" loop autoPlay muted playsInline />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-100/90 via-slate-100/30 to-slate-100/10 backdrop-blur-[2px]"></div>
             </div>
             
             {/* Thẻ Nội dung Glassmorphism (Apple Style) */}
             <div className="relative z-10 w-full max-w-4xl glass-card p-6 md:p-10 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-slide-up">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-600 mb-4 uppercase tracking-wider">
                    <ShieldCheck size={14} /> Chuyên gia xác thực
                  </div>
                  <h3 className="text-3xl md:text-5xl font-black text-slate-800 mb-4 leading-tight tracking-tight text-balance">
                    {item.service_name}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm md:text-base line-clamp-2 md:line-clamp-none max-w-lg mb-6">
                    {item.description || "Trải nghiệm dịch vụ chăm sóc sức khỏe toàn diện, được cá nhân hóa bởi đội ngũ chuyên gia hàng đầu. Phục hồi năng lượng, cân bằng thân tâm."}
                  </p>
                  
                  <div className="inline-flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-500 tracking-tighter">{item.price.toLocaleString()}</span>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">VND</span>
                  </div>
                </div>

                <div className="w-full md:w-auto flex-shrink-0 pt-4 md:pt-0 border-t border-slate-200/50 md:border-none">
                  <button 
                    onClick={() => {
                      if (!user) { toast.info("Vui lòng đăng nhập!"); setIsAuthModalOpen(true); return; }
                      setActiveService(item); setIsModalOpen(true);
                    }}
                    className="w-full md:w-auto group flex items-center justify-center gap-3 px-8 py-5 bg-slate-800 text-white rounded-[2rem] hover:bg-slate-900 active:scale-95 transition-all shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-emerald-500/30"
                  >
                    <span className="font-bold text-lg">Đặt lịch ngay</span>
                    <div className="p-1.5 bg-white/20 rounded-full group-hover:bg-emerald-500 transition-colors">
                      <CalendarPlus size={20} />
                    </div>
                  </button>
                </div>
             </div>
          </div>
        );
      })}

      {/* --- MODAL AUTH (Liquid Glass Form) --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop mờ cực mạnh thay thế nền đen */}
          <div className="absolute inset-0 bg-slate-200/40 backdrop-blur-md" onClick={() => setIsAuthModalOpen(false)}></div>
          
          <div className="w-full max-w-sm glass-panel rounded-[3rem] p-8 relative z-10 animate-slide-up shadow-2xl">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 bg-white/50 rounded-full transition-all active:scale-90">
              <X size={20} strokeWidth={3} />
            </button>
            
            <div className="mb-8 mt-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-emerald-500/30 rotate-12">
                <Sparkles className="text-white w-8 h-8 -rotate-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                {isLoginMode ? "Chào mừng trở lại" : "Khởi tạo tài khoản"}
              </h3>
              <p className="text-slate-500 text-sm font-medium">Bảo chứng thanh toán an toàn 100%.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <input 
                type="email" required placeholder="Email của bạn"
                className="w-full px-5 py-4 glass-input"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" required placeholder="Mật khẩu (tối thiểu 6 ký tự)" minLength={6}
                className="w-full px-5 py-4 glass-input"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              
              <button 
                type="submit" disabled={authLoading}
                className="w-full py-4 mt-4 bg-slate-800 text-white font-bold text-lg rounded-2xl hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition-all duration-300 disabled:opacity-50"
              >
                {authLoading ? "Đang xử lý..." : (isLoginMode ? "Đăng nhập" : "Tiếp tục")}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-medium text-slate-500">
              {isLoginMode ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-emerald-600 font-bold hover:underline underline-offset-4">
                {isLoginMode ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* --- MODAL ĐẶT LỊCH (Premium Check-out Style) --- */}
      {isModalOpen && activeService && user && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-300/30 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>

          <div className="w-full sm:max-w-md glass-panel sm:rounded-[3rem] rounded-t-[2.5rem] rounded-b-none p-6 md:p-8 relative z-10 animate-slide-up shadow-2xl flex flex-col max-h-[90dvh]">
            
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6 sm:hidden"></div>

            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Xác nhận lịch hẹn</h3>
                <div className="flex items-center gap-1 mt-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                   <ShieldCheck size={14}/> Thanh toán bảo chứng Escrow
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            
            {/* Receipt Card (Thiết kế như vé máy bay/thẻ tín dụng trong suốt) */}
            <div className="mb-8 p-6 bg-white/60 border border-white rounded-[2rem] shadow-sm relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
              
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gói dịch vụ</p>
              <p className="text-xl text-slate-800 font-black leading-tight mb-6 relative z-10">{activeService.service_name}</p>
              
              <div className="flex justify-between items-end border-t border-slate-200/50 pt-4 relative z-10">
                <p className="text-sm font-semibold text-slate-500">Tổng thanh toán</p>
                <p className="text-2xl text-emerald-500 font-black tracking-tighter">
                  {activeService.price.toLocaleString()} <span className="text-sm text-slate-400 font-bold tracking-widest uppercase">VND</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleBooking} className="flex flex-col gap-6 overflow-y-auto no-scrollbar pb-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-2">Mã chuyên gia / Ưu đãi (Tùy chọn)</label>
                <div className="relative">
                  <input 
                    type="text" placeholder="Nhập mã giới thiệu..."
                    className="w-full px-5 py-4 glass-input font-medium uppercase"
                    value={affiliateCode} onChange={(e) => setAffiliateCode(e.target.value)}
                  />
                  {affiliateCode && <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />}
                </div>
              </div>
              
              <button 
                type="submit" disabled={isSubmitting}
                className="w-full py-4 mt-2 flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-emerald-500/30"
              >
                {isSubmitting ? "Đang bảo mật giao dịch..." : (
                  <>Tiếp tục thanh toán <ChevronRight size={20} strokeWidth={3}/></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}