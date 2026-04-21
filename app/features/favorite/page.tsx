"use client";

import { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, User as UserIcon, 
  Sun, Moon, Bell, LogOut, PlayCircle, MapPin, 
  ShieldCheck, DollarSign, BookmarkMinus, Bookmark
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

interface Service {
  id: string;
  partner_id: string;
  service_name: string;
  description: string;
  price: number;
  video_url?: string;
  likes_count?: number;
  users?: { avatar_url?: string; full_name?: string };
}

export default function FavoriteFeature() {
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
  const [savedServices, setSavedServices] = useState<Service[]>([]);

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
        
        try {
            const res = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            const result = await res.json();
            
            if (result.status === "success") {
                setUserRole(result.data.profile.role);
                // Lấy danh sách đã lưu từ profile
                if (result.data.saved_services) {
                    setSavedServices(result.data.saved_services);
                }
            }
        } catch (error) {
            toast.error("Không thể tải danh sách yêu thích.");
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  // --- HÀM BỎ LƯU (UNSAVE) ---
  const handleUnsave = async (e: React.MouseEvent, serviceId: string) => {
      e.stopPropagation(); // Ngăn không cho click xuyên qua thẻ (tránh chuyển trang)
      
      // Xóa ngay lập tức trên UI để tạo cảm giác mượt mà (Optimistic UI)
      setSavedServices(prev => prev.filter(s => s.id !== serviceId));
      
      try {
          const { data: { session } } = await supabase.auth.getSession();
          await fetch(`https://ai-health-share-backend.onrender.com/interactions/save`, {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json", 
                  "Authorization": `Bearer ${session?.access_token}` 
              },
              body: JSON.stringify({ service_id: serviceId })
          });
          toast.success("Đã xóa khỏi danh sách yêu thích");
      } catch (error) {
          toast.error("Lỗi khi bỏ lưu. Vui lòng thử lại.");
      }
  };

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
      
      
      {/* ================= 2. MAIN FAVORITE AREA ================= */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
        
        {/* THEME & NOTIFICATION CONTROLS */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3 pointer-events-auto">
          <button onClick={handleThemeToggle} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            {isDarkMode ? <Sun size={20} className="group-hover:text-amber-300 transition-colors"/> : <Moon size={20} className="group-hover:text-blue-500 transition-colors"/>}
          </button>
          
          {/* NÚT THÔNG BÁO ĐÃ ĐƯỢC CẬP NHẬT */}
          <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            <Bell size={20} className="group-hover:text-[#80BF84] transition-colors"/>
          </button>
        </div>

        <div className="max-w-[1400px] mx-auto pt-20 md:pt-24 pb-32 px-5 md:px-8 xl:px-12">
            
            {/* Header */}
            <div className="mb-10 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3"><Heart className="text-rose-500 fill-rose-500" size={36} /> Yêu thích</h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Thư viện lưu trữ các liệu trình chăm sóc sức khỏe cá nhân của bạn.</p>
            </div>

            {/* KIỂM TRA ĐĂNG NHẬP HOẶC TRỐNG DỮ LIỆU */}
            {!user ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-slate-200/50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6"><UserIcon size={40} className="text-slate-400 dark:text-zinc-500" /></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Bạn chưa đăng nhập</h3>
                    <p className="text-slate-500 dark:text-zinc-400 mb-8 max-w-sm">Đăng nhập ngay để lưu trữ và xem lại các dịch vụ yêu thích bất cứ lúc nào.</p>
                    <button onClick={() => router.push('/')} className="px-8 py-4 bg-[#80BF84] text-zinc-950 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#80BF84]/20">Quay lại Trang chủ</button>
                </div>
            ) : savedServices.length === 0 ? (
                <div className="glass-panel p-16 rounded-[2rem] bg-white/50 dark:bg-black/30 border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center border-dashed mt-8 animate-fade-in">
                    <div className="w-16 h-16 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4"><BookmarkMinus size={28} className="text-slate-400 dark:text-zinc-500" /></div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Thư viện trống</h4>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6 max-w-sm">Bạn chưa lưu bất kỳ dịch vụ nào. Hãy ra ngoài Feed và bấm lưu những nội dung bổ ích nhé!</p>
                    <button onClick={() => router.push('/features/explore')} className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all">Đi khám phá ngay</button>
                </div>
            ) : (
                /* GRID DỊCH VỤ ĐÃ LƯU */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                    {savedServices.map((service, idx) => (
                        <div key={service.id} onClick={() => router.push(`/?service=${service.id}`)} className="glass-panel p-4 rounded-[2rem] bg-white/70 dark:bg-black/40 border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-4 group cursor-pointer relative overflow-hidden">
                            
                            {/* Nút Bỏ lưu nhanh */}
                            <button 
                                onClick={(e) => handleUnsave(e, service.id)}
                                className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-400 hover:bg-rose-500 hover:text-white hover:border-transparent transition-all border border-white/40 shadow-lg"
                                title="Bỏ lưu"
                            >
                                <Bookmark size={18} className="fill-current" />
                            </button>

                            {/* Thumbnail Video */}
                            <div className="relative w-full aspect-[4/5] rounded-[1.5rem] bg-black overflow-hidden border border-slate-200 dark:border-white/10">
                                <video src={service.video_url || `/video-${(idx % 3) + 1}.mp4`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" loop autoPlay muted playsInline />
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"></div>
                                <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-lg flex items-center gap-1.5 border border-white/10">
                                    <ShieldCheck size={12} className="text-[#80BF84]"/><span className="text-[10px] font-bold text-white uppercase tracking-wider">Đã xác thực</span>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-xl"><PlayCircle size={28} className="text-white"/></div>
                                </div>
                            </div>

                            {/* Thông tin chi tiết */}
                            <div className="flex flex-col gap-2 px-1">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-[#80BF84] transition-colors">{service.service_name}</h3>
                                <div className="flex items-end justify-between mt-2 pt-3 border-t border-slate-200 dark:border-white/10">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gói dịch vụ</span>
                                    <div className="text-lg font-black text-slate-900 dark:text-white flex items-center"><DollarSign size={16} className="text-[#80BF84]"/>{service.price.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* ================= 3. MOBILE BOTTOM DOCK ================= */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl transition-colors duration-500">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => router.push('/features/AI')} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-slate-200/50 dark:bg-zinc-800 p-[2px] shadow-[0_0_20px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-all duration-300"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center transition-colors duration-500"><Sparkles size={26} className="text-slate-400" strokeWidth={2.5} /></div></div>
            </button>
            <button onClick={() => router.push('/features/calendar')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><CalendarDays size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
            {/* NÚT YÊU THÍCH ĐANG ACTIVE */}
            <button className="text-rose-500 transition-colors group"><Heart size={26} strokeWidth={2.5} className="fill-rose-500 group-hover:scale-110 transition-transform" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}