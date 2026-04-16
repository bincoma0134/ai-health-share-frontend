"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, X, User as UserIcon, ShieldCheck, Sparkles, Home, Compass, CalendarDays, MessageCircleHeart, Heart, MessageCircle, Bookmark, Share2, Plus } from "lucide-react";
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
  likes_count?: number;
  saves_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
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
    // 1. Khởi tạo phiên làm việc và lấy dữ liệu
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      fetchServices(session?.user?.id);

      supabase.auth.onAuthStateChange((_event, curSession) => {
        setUser(curSession?.user || null);
        fetchServices(curSession?.user?.id);
      });
    };
    initialize();
  }, []);

  const fetchServices = async (currentUserId?: string) => {
    try {
      let url = "https://ai-health-share-backend.onrender.com/services";
      if (currentUserId) url += `?user_id=${currentUserId}`;
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === "success") setServices(result.data);
    } catch (error) {
      toast.error("Không thể tải danh sách dịch vụ.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleProfileClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      if (window.confirm("Trang Hồ sơ đang được cập nhật. Bạn có muốn Đăng xuất không?")) {
        handleLogout();
      }
    }
  };

  // --- LOGIC TƯƠNG TÁC: LIKE & SAVE ---
  const handleInteraction = async (serviceId: string, action: 'like' | 'save') => {
    if (!user) {
      toast.info(`Vui lòng đăng nhập để ${action === 'like' ? 'thích' : 'lưu'} video!`);
      setIsAuthModalOpen(true);
      return;
    }

    // 1. Optimistic Update (Cập nhật UI ngay lập tức để tạo độ mượt)
    setServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        if (action === 'like') {
          return { ...s, is_liked: !s.is_liked, likes_count: (s.likes_count || 0) + (s.is_liked ? -1 : 1) };
        } else {
          return { ...s, is_saved: !s.is_saved, saves_count: (s.saves_count || 0) + (s.is_saved ? -1 : 1) };
        }
      }
      return s;
    }));

    // 2. Gửi API chạy ngầm
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://ai-health-share-backend.onrender.com/interactions/${action}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ service_id: serviceId })
      });
      const data = await res.json();
      if (data.status !== "success") throw new Error("Ghi nhận thất bại");
    } catch (error) {
      toast.error(`Lỗi hệ thống khi thực hiện hành động.`);
      fetchServices(user.id); // Revert lại dữ liệu cũ nếu lỗi
    }
  };

  // --- LOGIC CHIA SẺ ---
  const handleShare = (serviceId: string) => {
    const link = `${window.location.origin}/?service=${serviceId}`;
    navigator.clipboard.writeText(link);
    toast.success("Đã sao chép liên kết vào khay nhớ tạm!");
  };

  const handleBooking = async (e: React.FormEvent) => {
    // Logic booking giữ nguyên... (Để trống ở đây cho gọn, cậu tự thay bằng code booking chuẩn nhé, hoặc tôi sẽ gửi bản full nếu cần).
    e.preventDefault();
    if (!activeService || !user) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Đang thiết lập cổng bảo chứng Escrow...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập đã hết hạn!");
      const bookingRes = await fetch("https://ai-health-share-backend.onrender.com/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: user.id, service_id: activeService.id, affiliate_code: affiliateCode || null, total_amount: activeService.price })
      });
      const bookingData = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(bookingData.detail || "Lỗi ghi nhận giao dịch");
      const checkoutUrl = bookingData.checkout_url || bookingData.data?.checkout_url || bookingData.checkoutUrl || bookingData.data?.checkoutUrl;
      if (checkoutUrl) {
        toast.success("Đang chuyển hướng đến PayOS...", { id: toastId });
        window.location.href = checkoutUrl; 
      } else {
        toast.error("Hệ thống chưa tạo được link thanh toán.", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    } 
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col items-center justify-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div>
          <div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Sparkles className="text-white w-6 h-6 animate-pulse" />
          </div>
        </div>
        <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">Khơi nguồn sức sống...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-hidden flex relative">
      
      {/* 1. LEFT SIDEBAR DESKTOP */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-black/40 backdrop-blur-3xl border-r border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-10">
          <h1 className="text-3xl font-black text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer">
            AI<span className="text-[#80BF84]">HEALTH</span>
          </h1>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/10 text-white font-bold transition-all">
            <Home size={24} strokeWidth={2.5} className="text-[#80BF84]" />
            <span className="text-sm tracking-wide">Trang chủ</span>
          </button>
          <button onClick={() => toast.info("Đang phát triển")} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group">
            <Compass size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm tracking-wide">Khám phá</span>
          </button>
          <button onClick={() => toast.info("Đang phát triển")} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group">
            <CalendarDays size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm tracking-wide">Lịch hẹn</span>
          </button>
          <button onClick={() => toast.info("Đang phát triển")} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group">
            <Heart size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm tracking-wide">Yêu thích</span>
          </button>

          {/* AI Assistant Button */}
          <div className="mt-8 px-2">
            <button onClick={() => toast.info("AI Trợ lý đang được đánh thức...")} className="w-full relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#80BF84] to-emerald-300 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 shadow-xl group-hover:scale-[1.02] transition-all">
                 <Sparkles size={20} strokeWidth={3} />
                 <span className="font-black text-sm tracking-wide">AI Trợ lý</span>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-auto px-2">
          <button onClick={handleProfileClick} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group border border-transparent hover:border-white/10">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 group-hover:border-[#80BF84] transition-colors">
              <UserIcon size={16} />
            </div>
            <span className="text-sm tracking-wide truncate max-w-[120px] text-left">
              {user ? user.email.split('@')[0] : "Đăng nhập"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. MAIN FEED AREA */}
      <div className="flex-1 relative h-[100dvh]">
        <div className="md:hidden absolute top-0 w-full z-40 p-6 flex justify-between items-center pointer-events-none transition-all">
          <h1 className="text-2xl font-black text-white tracking-tighter drop-shadow-lg flex items-center gap-1">
            AI<span className="text-[#80BF84]">HEALTH</span>
          </h1>
        </div>

        <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
          {services.map((item, index) => {
            const videoNumber = (index % 3) + 1;
            const desktopRatioClass = "md:aspect-[9/16]"; 

            return (
              <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always bg-black overflow-hidden flex items-center justify-center">
                
                <div className="hidden md:block absolute inset-0 w-full h-full">
                   <video src={`/video-${videoNumber}.mp4`} className="w-full h-full object-cover opacity-30 blur-[60px] scale-125" loop autoPlay muted playsInline />
                </div>
                
                <div className={`relative w-full h-full md:h-[94vh] md:w-auto ${desktopRatioClass} md:rounded-[2rem] overflow-hidden bg-black md:border md:border-white/10 md:shadow-2xl md:shadow-black/50 transition-all duration-500`}>
                    <video src={`/video-${videoNumber}.mp4`} className="absolute inset-0 w-full h-full object-cover opacity-90" loop autoPlay muted playsInline />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                    
                    <div className="absolute bottom-[100px] md:bottom-[40px] left-4 md:left-6 z-10 max-w-[75%] pointer-events-auto animate-slide-up">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-[#80BF84] mb-3 uppercase tracking-wider shadow-sm">
                          <ShieldCheck size={12} /> Dịch vụ xác thực
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-xl mb-1.5 text-balance">{item.service_name}</h3>
                        <p className="text-zinc-300 text-xs md:text-sm line-clamp-2 drop-shadow-md font-medium mb-4 pr-4">{item.description}</p>

                        <button onClick={() => { if (!user) { setIsAuthModalOpen(true); return; } setActiveService(item); setIsModalOpen(true); }} className="group flex items-center gap-3 pl-2 pr-5 py-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-[2rem] hover:bg-white/20 active:scale-95 transition-all shadow-xl shadow-black/20">
                          <div className="w-10 h-10 bg-[#80BF84] rounded-full flex items-center justify-center text-zinc-950 shadow-sm group-hover:scale-110 transition-transform">
                            <CalendarPlus size={20} strokeWidth={2.5} />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-sm tracking-wide drop-shadow-sm leading-tight">Đặt gói này</span>
                            <span className="text-[10px] font-semibold text-[#80BF84] leading-tight">{item.price.toLocaleString()} VND</span>
                          </div>
                        </button>
                    </div>

                    {/* --- THANH TƯƠNG TÁC (TÍCH HỢP DATA THẬT) --- */}
                    <div className="absolute bottom-[100px] md:bottom-[40px] right-3 md:right-4 z-20 flex flex-col items-center gap-5 md:gap-6 pointer-events-auto">
                        
                        <div className="relative mb-2 group cursor-pointer active:scale-90 transition-transform" onClick={() => toast.info("Xem hồ sơ chuyên gia")}>
                          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center shadow-lg">
                             <UserIcon size={24} className="text-zinc-400" />
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-zinc-900 group-hover:scale-110 transition-transform">
                             <Plus size={12} className="text-white" strokeWidth={3} />
                          </div>
                        </div>

                        {/* NÚT THẢ TIM (Tương tác thật) */}
                        <button onClick={() => handleInteraction(item.id, 'like')} className="flex flex-col items-center gap-1 group">
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_liked ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' : 'bg-black/40 border border-white/10 text-white group-hover:bg-rose-500/20 group-hover:text-rose-400 group-hover:border-rose-500/50'}`}>
                            <Heart size={24} strokeWidth={2} className={`group-active:scale-75 transition-transform ${item.is_liked ? 'fill-rose-500' : ''}`} />
                          </div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.likes_count || 0}</span>
                        </button>

                        <button onClick={() => toast.info("Tính năng bình luận đang mở")} className="flex flex-col items-center gap-1 group">
                          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white group-hover:bg-white/20 transition-all">
                            <MessageCircle size={24} strokeWidth={2} className="group-active:scale-75 transition-transform" />
                          </div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{Math.floor(Math.random() * 50) + 12}</span>
                        </button>

                        {/* NÚT LƯU BOOKMARK (Tương tác thật) */}
                        <button onClick={() => handleInteraction(item.id, 'save')} className="flex flex-col items-center gap-1 group">
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_saved ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-black/40 border border-white/10 text-white group-hover:bg-amber-500/20 group-hover:text-amber-400 group-hover:border-amber-500/50'}`}>
                            <Bookmark size={24} strokeWidth={2} className={`group-active:scale-75 transition-transform ${item.is_saved ? 'fill-amber-400' : ''}`} />
                          </div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.saves_count || 0}</span>
                        </button>

                        {/* NÚT CHIA SẺ (Tương tác thật) */}
                        <button onClick={() => handleShare(item.id)} className="flex flex-col items-center gap-1 group">
                          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white group-hover:bg-white/20 transition-all">
                            <Share2 size={24} strokeWidth={2} className="group-active:scale-75 transition-transform" />
                          </div>
                          <span className="text-xs font-bold text-white drop-shadow-md">Chia sẻ</span>
                        </button>

                    </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. MOBILE BOTTOM DOCK TIKTOK (Chỉ < md) */}
        <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-white/10 bg-black/60 backdrop-blur-2xl">
            <button className="text-[#80BF84] hover:text-white transition-colors group">
              <Home size={26} strokeWidth={2.5} />
            </button>
            <button onClick={() => toast.info("Đang phát triển")} className="text-zinc-500 hover:text-white transition-colors group">
              <Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            </button>
            <button onClick={() => toast.info("AI Trợ lý đang được đánh thức...")} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-300 p-[2px] shadow-[0_0_20px_rgba(128,191,132,0.3)] group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(128,191,132,0.5)] transition-all duration-300">
                <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center">
                   <Sparkles size={26} className="text-[#80BF84]" strokeWidth={2.5} />
                </div>
              </div>
            </button>
            <button onClick={() => toast.info("Đang phát triển")} className="text-zinc-500 hover:text-white transition-colors group">
              <Heart size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            </button>
            <button onClick={handleProfileClick} className="text-zinc-500 hover:text-white transition-colors group">
              <UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

      </div>

      {/* --- MODAL AUTH --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setIsAuthModalOpen(false)}></div>
          <div className="w-full max-w-sm glass-panel rounded-[3rem] p-8 relative z-10 shadow-2xl">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 bg-white/50 rounded-full transition-all active:scale-90">
              <X size={20} strokeWidth={3} />
            </button>
            <div className="mb-8 mt-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#80BF84] to-[#99BFF2] rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-[#80BF84]/30 rotate-12">
                <Sparkles className="text-zinc-950 w-8 h-8 -rotate-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{isLoginMode ? "Chào mừng trở lại" : "Khởi tạo tài khoản"}</h3>
              <p className="text-slate-500 text-sm font-medium">Bảo chứng thanh toán an toàn 100%.</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" required placeholder="Email của bạn" className="w-full px-5 py-4 glass-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input type="password" required placeholder="Mật khẩu" minLength={6} className="w-full px-5 py-4 glass-input" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="submit" disabled={authLoading} className="w-full py-4 mt-4 bg-[#26110F] text-white font-bold text-lg rounded-2xl hover:bg-[#80BF84] active:scale-95 transition-all disabled:opacity-50">
                {authLoading ? "Đang xử lý..." : (isLoginMode ? "Đăng nhập" : "Tiếp tục")}
              </button>
            </form>
            <p className="mt-8 text-center text-sm font-medium text-slate-500">
              {isLoginMode ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-[#80BF84] font-bold hover:underline">{isLoginMode ? "Đăng ký ngay" : "Đăng nhập"}</button>
            </p>
          </div>
        </div>
      )}

      {/* --- MODAL ĐẶT LỊCH CHUẨN XÁC --- */}
      {isModalOpen && activeService && user && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
          <div className="w-full sm:max-w-md glass-panel sm:rounded-[3rem] rounded-t-[2.5rem] rounded-b-none p-6 md:p-8 relative z-10 shadow-2xl flex flex-col max-h-[90dvh]">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6 sm:hidden"></div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Xác nhận lịch hẹn</h3>
                <div className="flex items-center gap-1 mt-1.5 text-xs font-bold text-[#80BF84] bg-white/60 border border-white/80 w-fit px-2 py-1 rounded-md">
                   <ShieldCheck size={14}/> Thanh toán bảo chứng Escrow
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            
            <div className="mb-8 p-6 bg-white/60 border border-white rounded-[2rem] shadow-sm relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#99BFF2]/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gói dịch vụ</p>
              <p className="text-xl text-slate-800 font-black leading-tight mb-6 relative z-10">{activeService.service_name}</p>
              <div className="flex justify-between items-end border-t border-slate-200/50 pt-4 relative z-10">
                <p className="text-sm font-semibold text-slate-500">Tổng thanh toán</p>
                <p className="text-2xl text-[#80BF84] font-black tracking-tighter">
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
                  {affiliateCode && <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-[#80BF84]" size={20} />}
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-2 flex justify-center items-center gap-2 bg-[#80BF84] hover:bg-[#6ca870] text-white font-bold text-lg rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-[#80BF84]/30">
                {isSubmitting ? "Đang bảo mật giao dịch..." : "Tiếp tục thanh toán"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}