"use client";

import { useEffect, useState } from "react";
import { 
  CalendarPlus, X, User as UserIcon, ShieldCheck, Sparkles, Home, Compass, 
  CalendarDays, Heart, MessageCircle, Bookmark, Share2, Plus,
  Sun, Moon, Bell, LogOut, Send, CheckCircle, CreditCard
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  video_url?: string;
  likes_count?: number;
  saves_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  users?: { avatar_url?: string; full_name?: string };
}

interface Comment {
  id: string;
  user_id: string;
  service_id: string;
  content: string;
  created_at: string;
  users?: { email?: string; avatar_url?: string; full_name?: string };
}

export default function UserFeed() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- STATE AUTH & ROLE ---
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // --- STATE MENU PROFILE ---
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // --- STATE BOOKING & COMMENT ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activeCommentServiceId, setActiveCommentServiceId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // --- STATE NOTIFICATION (Tích hợp trực tiếp) ---
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'system', title: 'Video của bạn đã được duyệt!', desc: 'Video "Massage Cổ Vai Gáy" đã chính thức xuất hiện trên Feed. Xin chúc mừng!', time: '10 phút trước', isRead: false, icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 2, type: 'booking', title: 'Bạn có lịch hẹn sắp tới', desc: 'Lịch hẹn "Trị liệu Da Mặt" của bạn sẽ bắt đầu vào 15:00 ngày mai.', time: '2 giờ trước', isRead: false, icon: CalendarDays, color: 'text-[#80BF84]', bg: 'bg-[#80BF84]/10' },
    { id: 3, type: 'payment', title: 'Thanh toán thành công', desc: 'Đơn hàng qua cổng Escrow đã được bảo chứng an toàn.', time: '1 ngày trước', isRead: true, icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 4, type: 'social', title: 'Có người bình luận về video', desc: 'Nguyễn Văn A đã để lại bình luận: "Dịch vụ tuyệt vời quá ạ!"', time: '2 ngày trước', isRead: true, icon: MessageCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]);

  // --- STATE AI CHAT ASSISTANT ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
    { role: 'bot', content: 'Xin chào! Tôi là trợ lý AI Health của bạn. Tôi có thể lắng nghe những căng thẳng của bạn hoặc tư vấn dịch vụ trị liệu phù hợp. Bạn đang cảm thấy thế nào hôm nay?' }
  ]);

  // --- STATE THEME & HYDRATION ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);
  const [isMounted, setIsMounted] = useState(false); 

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

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        fetchServices(session.user.id);
        
        const { data } = await supabase.from("users").select("role, theme_preference").eq("id", session.user.id).single();
        if (data) {
           setUserRole(data.role);
           if (data.theme_preference === 'light') {
              setIsDarkMode(false);
              document.documentElement.classList.remove('dark');
              localStorage.setItem('theme', 'light');
           }
        }
      } else {
        fetchServices();
      }

      supabase.auth.onAuthStateChange(async (_event, curSession) => {
        if (curSession?.user) {
          setUser(curSession.user);
          fetchServices(curSession.user.id);
          const { data } = await supabase.from("users").select("role").eq("id", curSession.user.id).single();
          if (data) setUserRole(data.role);
        } else {
          setUser(null);
          setUserRole("USER");
          fetchServices();
        }
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

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(`Lỗi đăng nhập Google: ${error.message}`);
    }
  };

  const handleUserAvatarClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setIsUserMenuOpen(prev => !prev);
    }
  };

  const handleGoToProfile = () => {
    setIsUserMenuOpen(false);
    if (userRole === "MODERATOR" || userRole === "SUPER_ADMIN") {
      router.push("/moderator/profile");
    } else if (userRole === "PARTNER_ADMIN") {
      router.push("/partner/profile");
    } else {
      router.push("/profile");
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    const toastId = toast.loading("Đang đăng xuất...");
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole("USER");
      toast.success("Đã đăng xuất thành công!", { id: toastId });
    } catch (error: any) {
      toast.error("Lỗi đăng xuất!", { id: toastId });
    }
  };

  const handleInteraction = async (serviceId: string, action: 'like' | 'save') => {
    if (!user) {
      toast.info(`Vui lòng đăng nhập để ${action === 'like' ? 'thích' : 'lưu'} video!`);
      setIsAuthModalOpen(true);
      return;
    }

    setServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        if (action === 'like') return { ...s, is_liked: !s.is_liked, likes_count: (s.likes_count || 0) + (s.is_liked ? -1 : 1) };
        else return { ...s, is_saved: !s.is_saved, saves_count: (s.saves_count || 0) + (s.is_saved ? -1 : 1) };
      }
      return s;
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`https://ai-health-share-backend.onrender.com/interactions/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ service_id: serviceId })
      });
    } catch (error) {
      fetchServices(user.id); 
    }
  };

  const handleOpenComments = async (serviceId: string) => {
    setActiveCommentServiceId(serviceId);
    setIsCommentModalOpen(true);
    setIsLoadingComments(true);
    try {
       const res = await fetch(`https://ai-health-share-backend.onrender.com/comments/${serviceId}`);
       const data = await res.json();
       if (data.status === 'success') setComments(data.data);
    } catch (e) {
       toast.error("Không thể tải bình luận.");
    } finally {
       setIsLoadingComments(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
       toast.info("Vui lòng đăng nhập để bình luận!");
       setIsCommentModalOpen(false);
       setIsAuthModalOpen(true);
       return;
    }
    if (!newComment.trim() || !activeCommentServiceId) return;

    try {
       const { data: { session } } = await supabase.auth.getSession();
       const res = await fetch(`https://ai-health-share-backend.onrender.com/comments`, {
         method: "POST",
         headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
         body: JSON.stringify({ service_id: activeCommentServiceId, content: newComment.trim() })
       });
       const data = await res.json();
       if (data.status === 'success') {
          setComments([data.data, ...comments]);
          setNewComment("");
          setServices(prev => prev.map(s => s.id === activeCommentServiceId ? {...s, comments_count: (s.comments_count || 0) + 1} : s));
       }
    } catch (e) { toast.error("Lỗi khi gửi bình luận."); }
  };

  const handleShare = (serviceId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/?service=${serviceId}`);
    toast.success("Đã sao chép liên kết vào khay nhớ tạm!");
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatTyping) return;
    setChatMessages(prev => [...prev, { role: 'user', content: chatInput.trim() }]);
    setChatInput("");
    setIsChatTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'bot', content: 'Tôi sẽ phân tích triệu chứng này ở Backend sắp tới!' }]);
      setIsChatTyping(false);
    }, 1500);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService || !user) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Đang thiết lập cổng bảo chứng Escrow...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập đã hết hạn.");
      const bookingRes = await fetch("https://ai-health-share-backend.onrender.com/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: user.id, service_id: activeService.id, affiliate_code: affiliateCode || null, total_amount: activeService.price })
      });
      const bookingData = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(bookingData.detail || "Lỗi ghi nhận giao dịch");
      if (bookingData.checkout_url) window.location.href = bookingData.checkout_url; 
      else toast.error("Hệ thống chưa tạo được link thanh toán.", { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    } 
  };

  const handleThemeToggle = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const themeStr = newMode ? 'dark' : 'light';
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', themeStr);

    if (user) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${session?.access_token}` 
          },
          body: JSON.stringify({ theme_preference: themeStr })
        });
      } catch (error) {
        console.error("Lỗi đồng bộ Theme:", error);
      }
    }
  };

  // --- LOGIC THÔNG BÁO ---
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setHasNotification(false);
    toast.success("Đã đánh dấu tất cả là đã đọc");
  };

  const filteredNotifs = activeNotifTab === 'all' ? notifications : notifications.filter(n => !n.isRead);

  const handleOpenNotification = () => {
    setIsNotificationOpen(true);
    setHasNotification(false); // Xóa chấm đỏ khi mở
  }

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
        <div className="relative w-16 h-16"><div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div><div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"><Sparkles className="text-white w-6 h-6 animate-pulse" /></div></div>
        <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">Khơi nguồn sức sống...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* 1. LEFT SIDEBAR DESKTOP */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-colors duration-500">
        <div className="px-4 mb-10"><h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer transition-colors duration-500">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} className="text-[#80BF84]" /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button onClick={() => router.push('/features/explore')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Compass size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Khám phá</span></button>
          <button onClick={() => router.push('/features/calendar')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><CalendarDays size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Lịch hẹn</span></button>
          <button onClick={() => router.push('/features/favorite')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Heart size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Yêu thích</span></button>
          <div className="mt-8 px-2">
            <button onClick={() => setIsChatOpen(true)} className="w-full relative group">
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
                  <button onClick={handleGoToProfile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm w-full text-left">
                    <UserIcon size={16} /> Trang cá nhân
                  </button>
                  <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left">
                    <LogOut size={16} /> Đăng xuất
                  </button>
              </div>
            </>
          )}

          <button onClick={handleUserAvatarClick} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group border border-transparent hover:border-slate-300 dark:hover:border-white/10">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center border border-slate-300 dark:border-zinc-700 group-hover:border-[#80BF84] transition-colors"><UserIcon size={16} /></div>
            <span className="text-sm tracking-wide truncate max-w-[120px] text-left">{user ? user.email.split('@')[0] : "Đăng nhập"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN FEED AREA */}
      <div className="flex-1 relative h-[100dvh]">
        
        {/* MOBILE HEADER (Logo) */}
        <div className="md:hidden absolute top-0 w-full z-40 p-6 flex justify-between items-center pointer-events-none transition-all"><h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 transition-colors duration-500">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>

        {/* THEME & NOTIFICATION CONTROLS */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={handleThemeToggle} 
            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group"
          >
            {!isMounted ? <div className="w-5 h-5"></div> : isDarkMode ? <Sun size={20} className="group-hover:text-amber-300 transition-colors"/> : <Moon size={20} className="group-hover:text-blue-500 transition-colors"/>}
          </button>
          <button 
            onClick={handleOpenNotification} 
            className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group"
          >
            <Bell size={20} className="group-hover:text-[#80BF84] transition-colors"/>
            {hasNotification && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.8)]"></span>
            )}
          </button>
        </div>

        <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
          {services.map((item, index) => {
            const videoNumber = (index % 3) + 1;
            const desktopRatioClass = "md:aspect-[9/16]"; 

            return (
              <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center transition-colors duration-500">
                {/* Nền mờ Desktop dùng video thật */}
                <div className="hidden md:block absolute inset-0 w-full h-full"><video src={item.video_url || `/video-${videoNumber}.mp4`} className="w-full h-full object-cover opacity-10 dark:opacity-30 blur-[60px] scale-125 transition-opacity duration-500" loop autoPlay muted playsInline /></div>
                <div className={`relative w-full h-full md:h-[94vh] md:w-auto ${desktopRatioClass} md:rounded-[2.5rem] overflow-hidden bg-black md:border border-slate-200 dark:border-white/10 md:shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:md:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500`}>
                    
                    {/* Video Player chính dùng video thật */}
                    <video src={item.video_url || `/video-${videoNumber}.mp4`} className="absolute inset-0 w-full h-full object-cover opacity-90" loop autoPlay muted playsInline />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                    
                    <div className="absolute bottom-[100px] md:bottom-[40px] left-4 md:left-6 z-10 max-w-[75%] pointer-events-auto animate-slide-up">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-full text-[10px] font-bold text-[#80BF84] mb-3 uppercase tracking-wider shadow-sm"><ShieldCheck size={12} /> Dịch vụ xác thực</div>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-xl mb-1.5 text-balance">{item.service_name}</h3>
                        <p className="text-zinc-200 dark:text-zinc-300 text-xs md:text-sm line-clamp-2 drop-shadow-md font-medium mb-4 pr-4">{item.description}</p>
                        <button onClick={() => { if (!user) { setIsAuthModalOpen(true); return; } setActiveService(item); setIsModalOpen(true); }} className="group flex items-center gap-3 pl-2 pr-5 py-2 bg-white/20 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 text-white rounded-[2rem] hover:bg-white/30 dark:hover:bg-white/20 active:scale-95 transition-all shadow-xl shadow-black/20">
                          <div className="w-10 h-10 bg-[#80BF84] rounded-full flex items-center justify-center text-zinc-950 shadow-sm group-hover:scale-110 transition-transform"><CalendarPlus size={20} strokeWidth={2.5} /></div>
                          <div className="flex flex-col text-left"><span className="font-bold text-sm tracking-wide drop-shadow-sm leading-tight">Đặt gói này</span><span className="text-[10px] font-semibold text-[#80BF84] leading-tight">{item.price.toLocaleString()} VND</span></div>
                        </button>
                    </div>

                    <div className="absolute bottom-[100px] md:bottom-[40px] right-3 md:right-4 z-20 flex flex-col items-center gap-5 md:gap-6 pointer-events-auto">
                        <div className="relative mb-2 group cursor-pointer active:scale-90 transition-transform" onClick={() => {
                           if (item.partner_id) {
                              router.push(`/partner/profile/${item.partner_id}`);
                           } else {
                              toast.error("Doanh nghiệp này chưa cập nhật hồ sơ công khai!");
                           }
                        }}>
                          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center shadow-lg group-hover:border-[#80BF84] transition-colors">
                             {item.users?.avatar_url ? (
                                <img src={item.users.avatar_url} className="w-full h-full object-cover"/>
                             ) : (
                                <UserIcon size={24} className="text-zinc-400" />
                             )}
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#80BF84] rounded-full flex items-center justify-center border-2 border-zinc-900 group-hover:scale-110 transition-transform"><Plus size={12} className="text-zinc-950" strokeWidth={4} /></div>
                        </div>

                        <button onClick={() => handleInteraction(item.id, 'like')} className="flex flex-col items-center gap-1 group">
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_liked ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' : 'bg-white/20 dark:bg-black/40 border border-white/30 dark:border-white/10 text-white group-hover:bg-rose-500/30 dark:group-hover:bg-rose-500/20 group-hover:text-rose-400 group-hover:border-rose-500/50'}`}><Heart size={24} strokeWidth={2} className={`group-active:scale-75 transition-transform ${item.is_liked ? 'fill-rose-500' : ''}`} /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.likes_count || 0}</span>
                        </button>
                        <button onClick={() => handleOpenComments(item.id)} className="flex flex-col items-center gap-1 group">
                          <div className="p-3 rounded-full bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/30 dark:border-white/10 text-white group-hover:bg-white/30 dark:group-hover:bg-white/20 transition-all"><MessageCircle size={24} strokeWidth={2} className="group-active:scale-75 transition-transform" /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.comments_count || 0}</span>
                        </button>
                        <button onClick={() => handleInteraction(item.id, 'save')} className="flex flex-col items-center gap-1 group">
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_saved ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-white/20 dark:bg-black/40 border border-white/30 dark:border-white/10 text-white group-hover:bg-amber-500/30 dark:group-hover:bg-amber-500/20 group-hover:text-amber-400 group-hover:border-amber-500/50'}`}><Bookmark size={24} strokeWidth={2} className={`group-active:scale-75 transition-transform ${item.is_saved ? 'fill-amber-400' : ''}`} /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.saves_count || 0}</span>
                        </button>
                        <button onClick={() => handleShare(item.id)} className="flex flex-col items-center gap-1 group">
                          <div className="p-3 rounded-full bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/30 dark:border-white/10 text-white group-hover:bg-white/30 dark:group-hover:bg-white/20 transition-all"><Share2 size={24} strokeWidth={2} className="group-active:scale-75 transition-transform" /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">Chia sẻ</span>
                        </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. MOBILE BOTTOM DOCK CÓ MENU */}
        <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl transition-colors duration-500">
            <button onClick={() => router.push('/')} className="text-[#80BF84] hover:text-emerald-600 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => setIsChatOpen(true)} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-300 p-[2px] shadow-[0_0_20px_rgba(128,191,132,0.3)] group-hover:scale-105 transition-all duration-300"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center transition-colors duration-500"><Sparkles size={26} className="text-[#80BF84]" strokeWidth={2.5} /></div></div>
            </button>
            <button onClick={() => router.push('/features/favorite')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Heart size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
            {/* KHU VỰC AVATAR MOBILE CÓ MENU */}
            <div className="relative">
              {isUserMenuOpen && user && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute bottom-full mb-6 right-0 w-48 p-2 flex flex-col gap-1 z-50 animate-fade-in bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl">
                      <button onClick={handleGoToProfile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm w-full text-left">
                        <UserIcon size={16} /> Trang cá nhân
                      </button>
                      <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left">
                        <LogOut size={16} /> Đăng xuất
                      </button>
                  </div>
                </>
              )}
              <button onClick={handleUserAvatarClick} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group">
                <UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* --- MODAL CHAT --- */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[110] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-colors duration-500" onClick={() => setIsChatOpen(false)}></div>
          <div className="relative w-full md:w-[420px] h-[85vh] md:h-[calc(100vh-48px)] bg-white/70 dark:bg-black/50 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl transition-colors duration-500">
             <div className="pt-8 pb-4 px-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center transition-colors duration-500"><h3 className="text-base font-bold text-slate-900 dark:text-white transition-colors duration-500">AI Trợ Lý</h3><button onClick={() => setIsChatOpen(false)} className="text-slate-500 dark:text-white hover:text-slate-900 transition-colors"><X size={18}/></button></div>
             <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar flex flex-col">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                    <div className={`p-4 text-sm ${msg.role === 'user' ? 'bg-[#80BF84] text-zinc-950 rounded-[1.5rem] rounded-tr-sm' : 'bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white rounded-[1.5rem] rounded-tl-sm transition-colors duration-500'}`}>{msg.content}</div>
                  </div>
                ))}
             </div>
             <form onSubmit={handleSendChatMessage} className="p-4 border-t border-slate-200 dark:border-white/10 flex gap-3 transition-colors duration-500">
               <input type="text" className="flex-1 bg-slate-200/50 dark:bg-white/5 rounded-full px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors duration-500" value={chatInput} onChange={e => setChatInput(e.target.value)} />
               <button type="submit" className="w-10 h-10 rounded-full bg-[#80BF84] text-zinc-950 flex items-center justify-center"><Send size={16}/></button>
             </form>
          </div>
        </div>
      )}

      {/* --- MODAL THÔNG BÁO (NÂNG CẤP) --- */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-[110] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-colors duration-500" onClick={() => setIsNotificationOpen(false)}></div>
          <div className="relative w-full md:w-[420px] h-[85vh] md:h-[calc(100vh-48px)] bg-white/80 dark:bg-black/60 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl transition-colors duration-500 animate-slide-up">

             {/* Header Thông báo */}
             <div className="pt-8 pb-4 px-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center transition-colors duration-500">
               <h3 className="text-xl font-black text-slate-900 dark:text-white transition-colors duration-500">Thông báo</h3>
               <div className="flex items-center gap-3">
                  <button onClick={markAllAsRead} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1" title="Đánh dấu tất cả đã đọc"><CheckCircle size={18}/></button>
                  <button onClick={() => setIsNotificationOpen(false)} className="text-slate-500 dark:text-white hover:text-slate-900 transition-colors"><X size={20}/></button>
               </div>
             </div>

             {/* Tabs Lọc */}
             <div className="px-6 py-3 border-b border-slate-200 dark:border-white/10 flex gap-2">
               <button onClick={() => setActiveNotifTab('all')} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeNotifTab === 'all' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>Tất cả</button>
               <button onClick={() => setActiveNotifTab('unread')} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeNotifTab === 'unread' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  Chưa đọc
                  {notifications.filter(n => !n.isRead).length > 0 && <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-md text-[10px] leading-none">{notifications.filter(n => !n.isRead).length}</span>}
               </button>
             </div>

             {/* Danh sách Thông báo */}
             <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {filteredNotifs.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
                        <Bell size={40} className="text-slate-300 dark:text-zinc-700 mb-4" />
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Bạn đã xem hết thông báo!</h3>
                        <p className="text-slate-500 dark:text-zinc-400 text-xs">Chưa có cập nhật mới nào trong thời gian này.</p>
                    </div>
                ) : (
                    filteredNotifs.map((notif) => {
                        const Icon = notif.icon;
                        return (
                            <div key={notif.id} className={`p-4 rounded-2xl flex gap-4 items-start transition-all cursor-pointer hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 ${!notif.isRead ? 'bg-white/60 dark:bg-white/5' : 'opacity-70'}`}>
                                <div className={`p-2.5 rounded-xl ${notif.bg} ${notif.color} shrink-0`}>
                                    <Icon size={20} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-black leading-tight ${!notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>{notif.title}</h4>
                                    </div>
                                    <p className={`text-xs mt-1 mb-2 ${!notif.isRead ? 'text-slate-600 dark:text-zinc-400 font-medium' : 'text-slate-500 dark:text-zinc-500'}`}>{notif.desc}</p>
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">{notif.time}</span>
                                </div>
                                {!notif.isRead && <div className="w-2 h-2 rounded-full bg-[#80BF84] shrink-0 mt-2"></div>}
                            </div>
                        )
                    })
                )}
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL BÌNH LUẬN --- */}
      {isCommentModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/40 backdrop-blur-sm transition-colors duration-500" onClick={() => setIsCommentModalOpen(false)}></div>
          <div className="relative w-full md:w-[420px] h-[75vh] md:h-[calc(100vh-48px)] bg-white/70 dark:bg-black/50 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl transition-colors duration-500">
             <div className="pt-8 pb-4 px-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center transition-colors duration-500"><h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors duration-500">Bình luận</h3><button onClick={() => setIsCommentModalOpen(false)} className="text-slate-500 dark:text-white hover:text-slate-900 transition-colors"><X size={18}/></button></div>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {comments.map(c => (
                   <div key={c.id} className="flex gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">{c.users?.avatar_url ? <img src={c.users.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={16} className="m-auto mt-3 text-slate-500 dark:text-zinc-500"/>}</div>
                     <div className="flex-1"><p className="text-xs font-bold text-slate-900 dark:text-white transition-colors duration-500">{c.users?.full_name || "Người dùng"}</p><p className="text-sm text-slate-600 dark:text-slate-300 transition-colors duration-500">{c.content}</p></div>
                   </div>
               ))}
             </div>
             <form onSubmit={handlePostComment} className="p-4 border-t border-slate-200 dark:border-white/10 flex gap-3 transition-colors duration-500">
               <input type="text" className="flex-1 bg-slate-200/50 dark:bg-white/5 rounded-full px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors duration-500" value={newComment} onChange={e => setNewComment(e.target.value)} />
               <button type="submit" className="w-10 h-10 rounded-full bg-[#80BF84] text-zinc-950 flex items-center justify-center"><Send size={16}/></button>
             </form>
          </div>
        </div>
      )}

      {/* --- MODAL ĐẶT LỊCH --- */}
      {isModalOpen && activeService && user && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl transition-colors duration-500" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl rounded-[3rem] p-8 z-10 shadow-2xl border border-slate-200 dark:border-white/10 transition-colors duration-500">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 transition-colors duration-500">Xác nhận lịch hẹn</h3>
            <form onSubmit={handleBooking} className="flex flex-col gap-6">
              <input type="text" placeholder="Mã giới thiệu..." className="w-full px-5 py-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium uppercase focus:outline-none focus:border-[#80BF84] transition-colors duration-500" value={affiliateCode} onChange={e => setAffiliateCode(e.target.value)} />
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#80BF84] text-zinc-950 font-black text-lg rounded-2xl active:scale-95 transition-all">Tiếp tục thanh toán</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL ĐĂNG NHẬP --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl transition-colors duration-500" onClick={() => setIsAuthModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl rounded-[3rem] p-8 z-10 shadow-2xl border border-slate-200 dark:border-white/10 transition-colors duration-500 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white transition-colors duration-500">{isLoginMode ? "Đăng nhập" : "Đăng ký"}</h3>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" placeholder="Email" className="w-full px-5 py-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] transition-colors duration-500" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Mật khẩu" className="w-full px-5 py-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] transition-colors duration-500" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="submit" disabled={authLoading} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black rounded-2xl active:scale-95 transition-all flex justify-center items-center gap-2">
                {authLoading ? <div className="w-5 h-5 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin"/> : null}
                {isLoginMode ? "Đăng nhập" : "Tạo tài khoản"}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/10"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white/90 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 transition-colors duration-500">Hoặc tiếp tục với</span></div>
              </div>
              
              <button onClick={handleGoogleLogin} type="button" className="mt-4 w-full flex items-center justify-center gap-3 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all font-bold text-slate-700 dark:text-white group">
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 dark:text-zinc-400 transition-colors duration-500">
                {isLoginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
                <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="ml-1 font-bold text-[#80BF84] hover:underline">
                  {isLoginMode ? "Đăng ký ngay" : "Đăng nhập"}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}