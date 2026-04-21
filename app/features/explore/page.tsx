"use client";

import { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, User as UserIcon, 
  Sun, Moon, Bell, Play, CalendarPlus, ShieldCheck, Search, SlidersHorizontal,
  LogOut
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import GlobalLoading from "../../loading";
import { useUI } from "@/context/UIContext"; // ĐÃ THÊM IMPORT

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Service {
  id: string;
  partner_id: string;
  service_name: string;
  description: string;
  price: number;
  video_url?: string;
  service_type_enum?: string;
  users?: { avatar_url?: string; full_name?: string };
}

export default function ExploreFeature() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI(); // ĐÃ THÊM HOOK
  
  // --- STATE HỆ THỐNG & AUTH ---
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // --- STATE DỮ LIỆU ---
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'RELAXATION' | 'TREATMENT'>('ALL');

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            // Lấy thêm Role để Menu Profile hoạt động chuẩn xác
            const profileRes = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            const profileResult = await profileRes.json();
            if (profileResult.status === "success") {
                setUserRole(profileResult.data.profile.role);
            }
        }

        // Fetch Dịch vụ (dùng đường dẫn tuyệt đối)
        const res = await fetch("https://ai-health-share-backend.onrender.com/services");
        if (!res.ok) throw new Error("Lỗi mạng: Backend không phản hồi");
        
        const result = await res.json();
        if (result.status === "success") {
          setServices(result.data || []);
        }
      } catch (error: any) {
        console.error("Fetch Error:", error);
        toast.error("Không thể kết nối đến máy chủ. Máy chủ có thể đang khởi động lại (mất ~30s).");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // --- HANDLERS TƯƠNG TÁC ---
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

  const handleBooking = (serviceId: string) => {
    if (!user) {
        toast.info("Vui lòng đăng nhập để đặt lịch!");
        router.push('/');
        return;
    }
    toast.info("Tính năng đặt lịch từ trang Khám phá đang được hoàn thiện!");
  };

  // --- LOGIC LỌC DỮ LIỆU ---
  const filteredServices = services.filter(service => {
    const matchesSearch = service.service_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'ALL' || service.service_type_enum === activeFilter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading || !isMounted) return <GlobalLoading />;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      
      {/* ================= 2. MAIN CONTENT ================= */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        {/* THEME & CONTROLS */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3 pointer-events-auto">
          <button onClick={handleThemeToggle} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            {isDarkMode ? <Sun size={20} className="group-hover:text-amber-300 transition-colors"/> : <Moon size={20} className="group-hover:text-blue-500 transition-colors"/>}
          </button>
          
          {/* NÚT THÔNG BÁO ĐÃ ĐƯỢC CẬP NHẬT */}
          <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            <Bell size={20} className="group-hover:text-[#80BF84] transition-colors"/>
          </button>
        </div>

        <div className="max-w-6xl mx-auto pt-20 md:pt-24 pb-32 px-5 md:px-8">
            <div className="mb-8 md:mb-10 animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">Khám phá Dịch vụ</h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Tìm kiếm liệu trình chăm sóc sức khỏe phù hợp với bạn nhất.</p>
            </div>

            {/* THANH TÌM KIẾM & BỘ LỌC (Ethereal Glass) */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 md:mb-10 animate-slide-up">
                <div className="relative flex-1 group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 group-focus-within:text-[#80BF84] transition-colors"><Search size={20}/></div>
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm theo tên dịch vụ, mô tả..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] dark:focus:border-[#80BF84]/50 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all font-medium"
                    />
                </div>
                
                <div className="flex p-1.5 bg-white/60 dark:bg-white/5 backdrop-blur-2xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-x-auto no-scrollbar shrink-0">
                    <button onClick={() => setActiveFilter('ALL')} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 md:flex-none ${activeFilter === 'ALL' ? 'bg-[#80BF84] text-zinc-950' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}><SlidersHorizontal size={16}/> Tất cả</button>
                    <button onClick={() => setActiveFilter('RELAXATION')} className={`flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 md:flex-none ${activeFilter === 'RELAXATION' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>Thư giãn</button>
                    <button onClick={() => setActiveFilter('TREATMENT')} className={`flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 md:flex-none ${activeFilter === 'TREATMENT' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>Trị liệu</button>
                </div>
            </div>

            {/* LƯỚI KẾT QUẢ TÌM KIẾM */}
            {filteredServices.length === 0 ? (
                <div className="w-full p-16 flex flex-col items-center justify-center rounded-[3rem] bg-white/60 dark:bg-white/5 backdrop-blur-3xl border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none animate-fade-in text-center border-dashed">
                    <div className="w-20 h-20 bg-slate-200/50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6"><Search size={32} className="text-slate-400 dark:text-zinc-600" /></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Không tìm thấy kết quả</h3>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Thử thay đổi từ khóa hoặc bộ lọc xem sao nhé.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    {filteredServices.map((service, index) => (
                        <div key={service.id} className="p-5 flex flex-col group relative overflow-hidden rounded-[1.5rem] bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300">
                            
                            <div className="w-full aspect-[4/3] bg-slate-800 dark:bg-zinc-900 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center dark:group-hover:shadow-black/50 group-hover:shadow-lg transition-all cursor-pointer">
                                <video src={service.video_url || `/video-${(index % 3) + 1}.mp4`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" muted playsInline />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"><Play size={24} className="ml-1"/></div></div>
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shrink-0 border border-white/20">
                                        {service.users?.avatar_url ? <img src={service.users.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={12} className="m-auto mt-1.5 text-slate-400 dark:text-zinc-500"/>}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 truncate">{service.users?.full_name || "Đối tác AI Health"}</span>
                                    <div className="ml-auto px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 rounded-md shrink-0 flex items-center gap-1"><ShieldCheck size={10}/> Uy tín</div>
                                </div>
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">{service.service_name}</h4>
                                <p className="text-xl font-black text-[#80BF84] mb-2">{service.price.toLocaleString()} VND</p>
                            </div>

                            <button onClick={() => handleBooking(service.id)} className="mt-4 w-full py-3.5 bg-[#80BF84]/10 dark:bg-[#80BF84]/20 hover:bg-[#80BF84] dark:hover:bg-[#80BF84] text-[#80BF84] dark:text-emerald-400 hover:text-zinc-950 dark:hover:text-zinc-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                                <CalendarPlus size={18}/> Đặt lịch
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* ================= 3. MOBILE BOTTOM DOCK (ĐÃ ĐỒNG BỘ) ================= */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl transition-colors duration-500">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            
            {/* NÚT KHÁM PHÁ MOBILE ĐANG ACTIVE */}
            <button className="text-[#80BF84] transition-colors group"><Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
            {/* NÚT AI TRỢ LÝ ĐÃ ĐƯỢC CHUYỂN VỀ TRẠNG THÁI INACTIVE (CHƯM SÁNG) */}
            <button onClick={() => router.push('/features/AI')} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-slate-200/50 dark:bg-zinc-800 p-[2px] shadow-[0_0_20px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-all duration-300"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center transition-colors duration-500"><Sparkles size={26} className="text-slate-400" strokeWidth={2.5} /></div></div>
            </button>
            
            <button onClick={() => router.push('/features/calendar')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><CalendarDays size={26} strokeWidth={2.5} /></button>
            
            {/* KHU VỰC AVATAR MOBILE CÓ MENU (ĐÃ ĐƯỢC THÊM VÀO) */}
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