"use client";

import { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, User as UserIcon, 
  Sun, Moon, Bell, LogOut, Search, Filter, PlayCircle, MapPin, 
  ShieldCheck, DollarSign
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

export default function ExploreFeature() {
  const router = useRouter();
  
  // --- STATE HỆ THỐNG & AUTH ---
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // --- STATE KHÁM PHÁ ---
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

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
            if (result.status === "success") setUserRole(result.data.profile.role);
        } catch (error) {
            console.error("Lỗi lấy Profile:", error);
        }
      }

      // Fetch toàn bộ dịch vụ APPROVED kèm kiểm tra phản hồi
      try {
        const response = await fetch("https://ai-health-share-backend.onrender.com/services");
        
        if (!response.ok) {
            throw new Error(`Server báo lỗi: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === "success") {
            setServices(result.data || []);
        }
      } catch (error: any) {
        console.error("Explore Fetch Error:", error);
        // Không toast lỗi nếu chỉ là do mạng lag để tránh làm phiền user
        if (error.message !== "Failed to fetch") {
            toast.error("Máy chủ đang bận, vui lòng thử lại sau.");
        }
      } finally {
        setIsLoading(false);
      }
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

  // --- LOGIC TÌM KIẾM & LỌC ---
  const filteredServices = services.filter(service => {
      const matchesSearch = service.service_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            service.description.toLowerCase().includes(searchQuery.toLowerCase());
      // Hiện tại giả định lọc bằng Text vì Backend chưa chuẩn hóa service_type đồng bộ
      const matchesCategory = activeCategory === "ALL" || 
                              (activeCategory === "TREATMENT" && service.service_name.toLowerCase().includes("trị liệu")) ||
                              (activeCategory === "RELAXATION" && service.service_name.toLowerCase().includes("thư giãn"));
      return matchesSearch && matchesCategory;
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
      
      {/* ================= 1. LEFT SIDEBAR ================= */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-colors duration-500">
        <div className="px-4 mb-10"><h1 onClick={() => router.push('/')} className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer transition-colors duration-500">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          
          {/* NÚT KHÁM PHÁ ĐANG ACTIVE */}
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white font-bold transition-all"><Compass size={24} strokeWidth={2.5} className="text-[#80BF84]" /><span className="text-sm tracking-wide">Khám phá</span></button>
          
          <button onClick={() => router.push('/features/calendar')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><CalendarDays size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Lịch hẹn</span></button>
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

      {/* ================= 2. MAIN EXPLORE AREA ================= */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
        
        {/* THEME & NOTIFICATION CONTROLS */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3 pointer-events-auto">
          <button onClick={handleThemeToggle} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            {isDarkMode ? <Sun size={20} className="group-hover:text-amber-300 transition-colors"/> : <Moon size={20} className="group-hover:text-blue-500 transition-colors"/>}
          </button>
          <button onClick={() => router.push('/features/notification')} className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            <Bell size={20} className="group-hover:text-[#80BF84] transition-colors"/>
          </button>
        </div>

        <div className="max-w-[1400px] mx-auto pt-20 md:pt-24 pb-32 px-5 md:px-8 xl:px-12">
            
            {/* Header & Search Bar */}
            <div className="mb-10 animate-slide-up flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3"><Compass className="text-[#80BF84]" size={36} /> Khám phá</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Tìm kiếm các liệu trình chăm sóc sức khỏe và cơ sở uy tín nhất.</p>
                </div>

                <div className="relative w-full md:w-[400px]">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Search size={20}/></div>
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm dịch vụ, triệu chứng..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 backdrop-blur-xl rounded-[1.5rem] text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#80BF84]/50 transition-all shadow-lg shadow-slate-200/20 dark:shadow-none" 
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-100 dark:bg-white/10 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Filter size={18}/></button>
                </div>
            </div>

            <div className="animate-fade-in">
                {/* CATEGORY TABS */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 pb-2">
                    {["ALL", "TREATMENT", "RELAXATION"].map((cat) => (
                        <button 
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2.5 rounded-[1.25rem] font-bold text-sm transition-all whitespace-nowrap border ${
                                activeCategory === cat 
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-transparent shadow-lg shadow-slate-900/20 dark:shadow-white/10 scale-105' 
                                : 'bg-white/50 dark:bg-white/5 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
                            }`}
                        >
                            {cat === "ALL" ? "Tất cả" : cat === "TREATMENT" ? "Trị liệu chuyên sâu" : "Thư giãn & Phục hồi"}
                        </button>
                    ))}
                </div>

                {/* GRID DỊCH VỤ */}
                {filteredServices.length === 0 ? (
                    <div className="glass-panel p-16 rounded-[2rem] bg-white/50 dark:bg-black/30 border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center border-dashed mt-8">
                        <div className="w-16 h-16 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4"><Search size={28} className="text-slate-400 dark:text-zinc-500" /></div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Không tìm thấy kết quả</h4>
                        <p className="text-slate-500 dark:text-zinc-400 text-sm">Thử thay đổi từ khóa hoặc bộ lọc xem sao nhé.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredServices.map((service, idx) => (
                            <div key={service.id} onClick={() => router.push(`/?service=${service.id}`)} className="glass-panel p-4 rounded-[2rem] bg-white/70 dark:bg-black/40 border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-4 group cursor-pointer">
                                
                                {/* Thumbnail Video / Trải nghiệm */}
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
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shrink-0 border border-slate-300 dark:border-zinc-700">
                                            {service.users?.avatar_url ? <img src={service.users.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={12} className="m-auto mt-1.5 text-slate-500" />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 truncate">{service.users?.full_name || "Đối tác AI Health"}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-[#80BF84] transition-colors">{service.service_name}</h3>
                                    <div className="flex items-end justify-between mt-2 pt-3 border-t border-slate-200 dark:border-white/10">
                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-500"><Heart size={14} className="fill-transparent group-hover:fill-rose-500 group-hover:text-rose-500 transition-colors"/><span className="text-xs font-bold">{service.likes_count || 0}</span></div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white flex items-center"><DollarSign size={16} className="text-[#80BF84]"/>{service.price.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* ================= 3. MOBILE BOTTOM DOCK ================= */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl transition-colors duration-500">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            
            {/* NÚT KHÁM PHÁ ĐANG ACTIVE */}
            <button className="text-[#80BF84] transition-colors group"><Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
            <button onClick={() => router.push('/features/AI')} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-slate-200/50 dark:bg-zinc-800 p-[2px] shadow-[0_0_20px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-all duration-300"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center transition-colors duration-500"><Sparkles size={26} className="text-slate-400" strokeWidth={2.5} /></div></div>
            </button>
            <button onClick={() => router.push('/features/calendar')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><CalendarDays size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
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