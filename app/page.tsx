"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, X, User as UserIcon, LogOut } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner"; // IMPORT THƯ VIỆN TOAST

// --- KHỞI TẠO SUPABASE CLIENT (BẢO MẬT 100%) ---
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
  
  // --- STATE AUTH (ĐĂNG NHẬP) ---
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

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

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- HÀM XỬ LÝ AUTH ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    // Tạo 1 loading toast để người dùng biết hệ thống đang xử lý
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

// --- HÀM XỬ LÝ ĐẶT LỊCH (CÓ BẢO MẬT TOKEN) ---
const handleBooking = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!activeService || !user) return;
  
  setIsSubmitting(true);
  const toastId = toast.loading("Đang xử lý thanh toán & Escrow...");

  try {
    // 1. Lấy "Thẻ từ" (Access Token) từ hệ thống Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");

    // 2. Kẹp Thẻ từ vào Header của gói tin gửi đi
    const bookingRes = await fetch("https://ai-health-share-backend.onrender.com/bookings", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}` // Đây là chiếc chìa khóa!
      },
      body: JSON.stringify({
        user_id: user.id,
        service_id: activeService.id,
        affiliate_code: affiliateCode || null,
        total_amount: activeService.price
      })
    });
    const bookingData = await bookingRes.json();

    if (!bookingRes.ok || bookingData.status !== "success") {
      throw new Error(bookingData.detail || "Lỗi ghi nhận giao dịch");
    }

    toast.success("🎉 Đặt lịch thành công! Hệ thống đã ghi nhận.", { id: toastId });
    setIsModalOpen(false);
    setAffiliateCode("");

  } catch (error: any) {
    toast.error(`Lỗi hệ thống: ${error.message}`, { id: toastId });
  } finally {
    setIsSubmitting(false);
  }
};


  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      
      {/* HEADER */}
      <div className="absolute top-0 w-full z-50 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="text-xl font-bold text-white tracking-wider">HEALTH<span className="text-emerald-400">SHARE</span></h1>
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-700 backdrop-blur-sm">
              <UserIcon size={16} className="text-emerald-400" />
              <span className="text-xs font-medium text-white truncate max-w-[100px]">{user.email.split("@")[0]}</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition"
          >
            Đăng nhập
          </button>
        )}
      </div>

      {/* FEED VIDEO */}
      {services.map((item, index) => {
        const videoNumber = (index % 3) + 1;
        return (
          <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always">
             <video src={`/video-${videoNumber}.mp4`} className="w-full h-full object-cover" loop autoPlay muted playsInline />
             <div className="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
             
             <div className="absolute bottom-6 left-4 right-16 text-white">
                <h3 className="text-xl font-bold mb-2">{item.service_name}</h3>
                <div className="inline-flex px-3 py-1.5 bg-white text-black text-sm font-bold rounded-lg">
                  {item.price.toLocaleString()} VND
                </div>
             </div>

            <div className="absolute bottom-6 right-4 flex flex-col gap-6 items-center text-white">
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
                className="flex flex-col items-center gap-1 mt-4 group cursor-pointer animate-bounce"
              >
                <div className="p-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30">
                  <CalendarPlus size={28} className="text-white" />
                </div>
                <span className="text-xs font-bold text-emerald-400">Đặt lịch</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* --- FORM MODAL AUTH --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-zinc-900 rounded-3xl p-6 border border-zinc-800 relative">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-bold text-white text-center mb-6">
              {isLoginMode ? "Đăng Nhập" : "Tạo Tài Khoản"}
            </h3>

            <form onSubmit={handleAuth} className="space-y-4">
              <input 
                type="email" required placeholder="Email của bạn"
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" required placeholder="Mật khẩu (tối thiểu 6 ký tự)" minLength={6}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              
              <button 
                type="submit" disabled={authLoading}
                className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl transition disabled:opacity-50"
              >
                {authLoading ? "Đang xử lý..." : (isLoginMode ? "Vào ứng dụng" : "Đăng ký ngay")}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-zinc-900 text-zinc-500">Hoặc tiếp tục với</span></div>
              </div>
              
              <button 
                onClick={() => toast.info("Tính năng đăng nhập Google đang được tích hợp. Vui lòng dùng Email!")}
                className="w-full mt-4 py-3 flex items-center justify-center gap-2 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                Google (Sắp ra mắt)
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-zinc-400">
              {isLoginMode ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-emerald-400 font-bold hover:underline">
                {isLoginMode ? "Đăng ký" : "Đăng nhập"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* --- FORM MODAL ĐẶT LỊCH --- */}
      {isModalOpen && activeService && user && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl p-6 border-t border-zinc-800 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Xác nhận Đặt lịch</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-zinc-800 rounded-full text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-zinc-800 rounded-xl">
              <p className="text-sm text-gray-400">Dịch vụ đang chọn:</p>
              <p className="text-white font-semibold">{activeService.service_name}</p>
              <p className="text-emerald-400 font-bold mt-1">{activeService.price.toLocaleString()} VND</p>
            </div>

            <form onSubmit={handleBooking} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Mã giảm giá / Giới thiệu (Nếu có)</label>
                <input 
                  type="text" placeholder="Nhập mã KOL..."
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white uppercase focus:outline-none focus:border-emerald-500"
                  value={affiliateCode} onChange={(e) => setAffiliateCode(e.target.value)}
                />
              </div>
              
              <button 
                type="submit" disabled={isSubmitting}
                className="w-full py-4 mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận & Giữ chỗ"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}