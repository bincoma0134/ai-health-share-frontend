"use client";

import { useEffect, useState } from "react";
import { 
  Home, Compass, CalendarDays, Sparkles, User as UserIcon, 
  Sun, Moon, Bell, Play, CalendarPlus, ShieldCheck, Search, SlidersHorizontal,
  LogOut, MapPin, Star, Activity, Filter, X
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext"; 

// --- SUPABASE CONFIG ---
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
  image_url?: string;
  service_type_enum?: string;
  users?: { avatar_url?: string; full_name?: string; physical_address?: string; username?: string };
}

export default function ExploreFeature() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI();
  
  // --- STATE HỆ THỐNG & AUTH ---
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // --- STATE DỮ LIỆU & LỌC ---
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'RELAXATION' | 'TREATMENT'>('ALL');

  // --- BOOKING STATE (ESCROW) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [expandedService, setExpandedService] = useState<Service | null>(null);

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
            const profileRes = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            const profileResult = await profileRes.json();
            if (profileResult.status === "success") setUserRole(profileResult.data.profile.role);
        }

        // Fetch Dịch vụ (Data Mock hoặc API thật)
        const res = await fetch("https://ai-health-share-backend.onrender.com/services");
        if (res.ok) {
            const result = await res.json();
            if (result.status === "success") setServices(result.data || []);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        // Giả lập delay một chút để xem hiệu ứng Skeleton đẹp mắt
        setTimeout(() => setIsLoading(false), 800);
      }
    };

    loadData();
  }, []);

  // --- HANDLERS ---
  const handleThemeToggle = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const themeStr = newMode ? 'dark' : 'light';
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', themeStr);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    const toastId = toast.loading("Đang đăng xuất...");
    try {
        await supabase.auth.signOut();
        toast.success("Đã đăng xuất thành công!", { id: toastId });
        router.push("/");
    } catch { toast.error("Lỗi đăng xuất!", { id: toastId }); }
  };

  const handleGoToProfile = () => {
    setIsUserMenuOpen(false);
    if (userRole === "MODERATOR" || userRole === "SUPER_ADMIN") router.push("/moderator/profile");
    else if (userRole === "PARTNER_ADMIN") router.push("/partner/profile");
    else router.push("/profile");
  };

  const handlePartnerClick = (username?: string) => {
    if (username) router.push(`/${username}`);
  };

  const handleBookingClick = (service: Service) => {
    if (!user) {
        toast.error("Vui lòng đăng nhập để đặt lịch!");
        router.push('/');
        return;
    }
    setActiveService(service);
    setIsModalOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService || !user) return;
    
    if (!bookingName.trim() || !bookingPhone.trim()) {
      toast.error("Vui lòng nhập đầy đủ Họ tên và Số điện thoại!");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Đang gửi yêu cầu đến cơ sở...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập hết hạn!");

      const code = affiliateCode.trim();
      if (code !== "") {
        const validateRes = await fetch(`https://ai-health-share-backend.onrender.com/affiliates/validate?code=${code}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        if (!validateRes.ok) throw new Error("Mã giới thiệu không hợp lệ hoặc không tồn tại!");
      }

      // GỌI API MỚI: Gửi request đến Partner (Status sẽ là WAITING_PARTNER)
      const bookingRes = await fetch(`https://ai-health-share-backend.onrender.com/appointments/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ 
          partner_id: activeService.partner_id,
          service_id: activeService.id, 
          affiliate_code: code || null, 
          total_amount: activeService.price || 0,
          customer_name: bookingName.trim(),
          customer_phone: bookingPhone.trim(),
          note: bookingNote.trim()
        })
      });
      
      const bookingData = await bookingRes.json();
      
      if (!bookingRes.ok) throw new Error(bookingData.detail || "Lỗi gửi yêu cầu");
      
      toast.success(bookingData.message || "Yêu cầu đã được gửi! Vui lòng theo dõi tại tab 'Lịch hẹn'.", { id: toastId, duration: 5000 });
      
      // Đóng modal & reset form
      setIsModalOpen(false);
      setBookingName("");
      setBookingPhone("");
      setBookingNote("");
      setAffiliateCode("");
      
      // Điều hướng người dùng sang trang theo dõi Lịch hẹn
      router.push('/features/calendar');
      
    } catch (error: any) { 
      toast.error(error.message, { id: toastId }); 
    } finally { 
      setIsSubmitting(false); 
    } 
  };

  // --- LOGIC LỌC DỮ LIỆU ---
  const filteredServices = services.filter(service => {
    const matchesSearch = service.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'ALL' || service.service_type_enum === activeFilter;
    return matchesSearch && matchesFilter;
  });

  if (!isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-[#0a0a0a]"></div>;

  return (
    <div className="flex-1 relative h-[100dvh] bg-slate-50 dark:bg-[#09090b] overflow-hidden flex flex-col font-be-vietnam transition-colors duration-500">
      
      {/* ================= HEADER (STICKY GLASSMORPHISM) ================= */}
      <header className="absolute top-0 inset-x-0 z-50 px-6 md:px-10 py-5 bg-slate-50/80 dark:bg-[#09090b]/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Khám phá <Sparkles size={24} className="text-[#80BF84] hidden md:block" />
              </h1>
          </div>
          
          <div className="flex items-center gap-3 pointer-events-auto">
              <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => setIsNotifOpen(true)} className="relative w-10 h-10 rounded-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md">
                  <Bell size={18} />
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-50 dark:border-zinc-950"></span>
              </button>
          </div>
      </header>

      {/* ================= MAIN SCROLL AREA ================= */}
      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 pb-32">
          
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
              
              {/* --- SEARCH & FILTER SECTION --- */}
              <div className="flex flex-col xl:flex-row gap-5 mb-10 animate-slide-up">
                  {/* Search Bar */}
                  <div className="relative flex-1 group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors">
                          <Search size={22} strokeWidth={2.5}/>
                      </div>
                      <input 
                          type="text" 
                          placeholder="Bạn đang tìm dịch vụ gì hôm nay?..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-full text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] dark:focus:border-[#80BF84] shadow-sm hover:shadow-md transition-all placeholder:font-medium placeholder:text-slate-400"
                      />
                  </div>
                  
                  {/* Filter Pills */}
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 xl:pb-0 shrink-0">
                      <div className="p-4 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-full border border-slate-200 dark:border-white/10 text-slate-400 shrink-0">
                          <Filter size={18} />
                      </div>
                      <button onClick={() => setActiveFilter('ALL')} className={`px-6 py-3.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm ${activeFilter === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md scale-105' : 'bg-white/60 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800'}`}>Tất cả dịch vụ</button>
                      <button onClick={() => setActiveFilter('RELAXATION')} className={`px-6 py-3.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm ${activeFilter === 'RELAXATION' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md scale-105' : 'bg-white/60 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800'}`}>Thư giãn & Phục hồi</button>
                      <button onClick={() => setActiveFilter('TREATMENT')} className={`px-6 py-3.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm ${activeFilter === 'TREATMENT' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md scale-105' : 'bg-white/60 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800'}`}>Trị liệu chuyên sâu</button>
                  </div>
              </div>

              {/* --- BỘ HIỂN THỊ DỮ LIỆU --- */}
              {isLoading ? (
                  // SKELETON LOADING UI (Rất chuyên nghiệp)
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {[1, 2, 3, 4].map(i => (
                          <div key={i} className="bg-white/40 dark:bg-zinc-900/40 rounded-[2rem] border border-slate-200/50 dark:border-white/5 p-4 animate-pulse">
                              <div className="w-full aspect-[4/3] bg-slate-200 dark:bg-zinc-800 rounded-2xl mb-4"></div>
                              <div className="flex gap-3 mb-3"><div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0"></div><div className="flex-1"><div className="h-3 w-1/2 bg-slate-200 dark:bg-zinc-800 rounded-full mb-2"></div><div className="h-2 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded-full"></div></div></div>
                              <div className="h-5 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-full mb-4"></div>
                              <div className="h-8 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded-full mb-4"></div>
                              <div className="h-12 w-full bg-slate-200 dark:bg-zinc-800 rounded-xl"></div>
                          </div>
                      ))}
                  </div>
              ) : filteredServices.length === 0 ? (
                  // EMPTY STATE
                  <div className="w-full py-20 flex flex-col items-center justify-center rounded-[3rem] bg-white/40 dark:bg-zinc-900/40 border-2 border-dashed border-slate-200 dark:border-white/10 animate-fade-in text-center">
                      <div className="w-24 h-24 bg-slate-100 dark:bg-black rounded-full flex items-center justify-center mb-6 shadow-inner"><Search size={40} className="text-slate-400" /></div>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Không có dịch vụ nào</h3>
                      <p className="text-slate-500 font-medium">Rất tiếc, chúng tôi không tìm thấy dịch vụ nào khớp với tìm kiếm của bạn.</p>
                  </div>
              ) : (
                  // DATA GRID
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                      {filteredServices.map((service, index) => (
                          <div key={service.id} onClick={() => setExpandedService(service)} className="cursor-pointer group flex flex-col bg-white dark:bg-[#121214] rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-slate-200 dark:hover:shadow-none transition-all duration-500 hover:-translate-y-1">
                              
                              {/* Media Thumbnail */}
                              <div className="w-full aspect-[4/3] bg-slate-100 dark:bg-black relative overflow-hidden shrink-0">
                                  {service.image_url ? (
                                      <img src={service.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={service.service_name} />
                                  ) : service.video_url ? (
                                      <video src={service.video_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" muted loop autoPlay playsInline />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-emerald-50 dark:from-zinc-800 dark:to-zinc-900">
                                          <Activity size={40} className="text-slate-300 dark:text-zinc-700"/>
                                      </div>
                                  )}
                                  
                                  {/* Overlay Badges */}
                                  <div className="absolute top-4 right-4 flex gap-2">
                                      <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 border border-white/20">
                                          <Star size={12} className="text-amber-400 fill-amber-400"/> 4.9
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Card Content */}
                              <div className="p-6 flex-1 flex flex-col">
                                  {/* Author Info */}
                                  <div className="flex items-center gap-3 mb-4">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                                          {service.users?.avatar_url ? <img src={service.users.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={16} className="m-auto mt-2 text-slate-400"/>}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">{service.users?.full_name || "Đối tác Y tế"}</p>
                                          <p className="text-[10px] font-bold text-slate-500 truncate flex items-center gap-1"><MapPin size={10}/> {service.users?.physical_address || "Cơ sở xác thực"}</p>
                                      </div>
                                      <ShieldCheck size={18} className="text-blue-500 shrink-0" />
                                  </div>

                                  <h3 className="font-black text-lg text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2">{service.service_name}</h3>
                                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">{service.description}</p>
                                  
                                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                                      <div>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Giá trọn gói</p>
                                          <p className="text-xl font-black text-[#80BF84]">{Number(service.price).toLocaleString()} <span className="text-xs text-slate-500">đ</span></p>
                                      </div>
                                      <button onClick={(e) => { e.stopPropagation(); handleBookingClick(service); }} className="w-12 h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg group-hover:bg-[#80BF84] group-hover:text-zinc-950">
                                          <CalendarPlus size={20} />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </main>

      {/* ================= MOBILE BOTTOM DOCK ================= */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
        <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl transition-colors duration-500">
          <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
          
          <button className="text-[#80BF84] transition-colors group relative">
            <Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#80BF84] rounded-full"></span>
          </button>
          
          <button onClick={() => router.push('/features/AI')} className="relative -mt-10 group">
            <div className="w-14 h-14 rounded-full bg-slate-200/50 dark:bg-zinc-800 p-[2px] shadow-[0_0_20px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-all duration-300"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center transition-colors duration-500"><Sparkles size={26} className="text-slate-400" strokeWidth={2.5} /></div></div>
          </button>
          
          <button onClick={() => router.push('/features/calendar')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><CalendarDays size={26} strokeWidth={2.5} /></button>
          
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

      {/* ================= MODAL CHI TIẾT DỊCH VỤ (EXPANDED VIEW) ================= */}
      {expandedService && (
        <div className="fixed inset-0 z-[140] flex justify-center items-center p-4 md:p-6">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl transition-opacity duration-500 animate-fade-in" onClick={() => setExpandedService(null)}></div>
          
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-slate-200 dark:border-white/10 animate-slide-up max-h-[90vh]">
            
            {/* Cột trái: Media (Video/Image) */}
            <div className="w-full md:w-1/2 h-64 md:h-auto bg-black relative flex items-center justify-center shrink-0">
                {expandedService.image_url ? (
                    <img src={expandedService.image_url} className="w-full h-full object-cover" alt={expandedService.service_name} />
                ) : expandedService.video_url ? (
                    <video src={expandedService.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                    <Activity size={60} className="text-zinc-800"/>
                )}
                <button onClick={() => setExpandedService(null)} className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-md text-white"><X size={20}/></button>
            </div>

            {/* Cột phải: Thông tin */}
            <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto no-scrollbar relative">
                <button onClick={() => setExpandedService(null)} className="hidden md:flex absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition-colors"><X size={20}/></button>
                
                {/* Thông tin Partner (Clickable) */}
                <div 
                    onClick={(e) => { e.stopPropagation(); handlePartnerClick(expandedService.users?.username); }}
                    className="flex items-center gap-3 mb-6 p-3 -ml-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group/partner"
                >
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 group-hover/partner:border-[#80BF84] transition-colors">
                        {expandedService.users?.avatar_url ? <img src={expandedService.users.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={24} className="m-auto mt-3 text-slate-400"/>}
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white group-hover/partner:text-[#80BF84] transition-colors">{expandedService.users?.full_name || "Đối tác Y tế"}</p>
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1"><MapPin size={12}/> {expandedService.users?.physical_address || "Cơ sở xác thực"}</p>
                    </div>
                    <ShieldCheck size={20} className="text-blue-500 ml-auto opacity-50 group-hover/partner:opacity-100 transition-opacity" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#80BF84]/10 border border-[#80BF84]/20 rounded-full text-[10px] font-bold text-[#80BF84] mb-4 uppercase tracking-wider w-max">
                  <Sparkles size={12} /> {expandedService.service_type_enum === 'TREATMENT' ? 'Trị liệu' : 'Thư giãn'}
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-4">{expandedService.service_name}</h2>
                <p className="text-sm md:text-base text-slate-600 dark:text-zinc-400 leading-relaxed mb-8 flex-1 whitespace-pre-wrap">{expandedService.description}</p>
                
                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giá dịch vụ</p>
                        <p className="text-3xl font-black text-[#80BF84]">{Number(expandedService.price).toLocaleString()} <span className="text-base text-slate-500">VND</span></p>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpandedService(null);
                            handleBookingClick(expandedService);
                        }} 
                        className="w-full sm:w-auto px-8 py-4 bg-[#80BF84] hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl shadow-xl hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                        <CalendarPlus size={18}/> Đặt lịch ngay
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ĐẶT LỊCH DỊCH VỤ ================= */}
      {isModalOpen && activeService && user && (
        <div className="fixed inset-0 z-[150] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-500" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-10 z-10 shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/50 dark:border-white/10 animate-slide-up">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#80BF84]/10 border border-[#80BF84]/20 rounded-full text-[10px] font-bold text-[#80BF84] mb-3 uppercase tracking-wider">
                  <Sparkles size={12} /> Đặt lịch dịch vụ
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight pr-4">{activeService.service_name}</h3>
                <p className="text-[#80BF84] font-black text-lg mt-1">{activeService.price?.toLocaleString()} VND</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition-colors shrink-0"><X size={20}/></button>
            </div>

            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 ml-1">Họ và tên</label>
                      <input type="text" placeholder="Nhập tên của bạn..." className="w-full px-5 py-3.5 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] focus:ring-1 focus:ring-[#80BF84]/50 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" required value={bookingName} onChange={e => setBookingName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 ml-1">Số điện thoại</label>
                      <input type="tel" placeholder="09xx..." className="w-full px-5 py-3.5 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] focus:ring-1 focus:ring-[#80BF84]/50 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" required value={bookingPhone} onChange={e => setBookingPhone(e.target.value)} />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 ml-1">Lời nhắn nhủ (Tùy chọn)</label>
                  <textarea placeholder="Bạn có yêu cầu đặc biệt gì cho dịch vụ này không?" rows={2} className="w-full px-5 py-3.5 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] focus:ring-1 focus:ring-[#80BF84]/50 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-600" value={bookingNote} onChange={e => setBookingNote(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 ml-1">Mã giới thiệu (Tùy chọn)</label>
                  <input type="text" placeholder="Nhập mã ưu đãi..." className="w-full px-5 py-3.5 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium uppercase focus:outline-none focus:border-[#80BF84] focus:ring-1 focus:ring-[#80BF84]/50 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 placeholder:normal-case" value={affiliateCode} onChange={e => setAffiliateCode(e.target.value)} />
              </div>

              <div className="mt-6">
                  <div className="p-4 mb-5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                      <ShieldCheck size={20} className="text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] leading-relaxed text-blue-800 dark:text-blue-300 font-medium">
                          Bạn <strong>chưa cần thanh toán lúc này</strong>. Tổng tiền <strong className="text-blue-600 dark:text-blue-400">{activeService.price?.toLocaleString()} VND</strong> sẽ được hệ thống bảo chứng an toàn <strong>sau khi cơ sở xác nhận có lịch trống</strong> dành cho bạn.
                      </p>
                  </div>
                  
                  <button type="submit" disabled={isSubmitting} className="relative w-full py-4 bg-gradient-to-tr from-slate-800 to-slate-900 dark:from-white dark:to-slate-200 text-white dark:text-zinc-950 font-black text-lg rounded-2xl active:scale-95 transition-all shadow-xl overflow-hidden group">
                    <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full skew-x-12 transition-transform duration-500"></div>
                    {isSubmitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu đặt lịch"}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}