"use client";

import { type FormEvent, useEffect, useState } from "react";
import { 
  CalendarPlus, X, User as UserIcon, ShieldCheck, Sparkles, Home, Compass, 
  Heart, MessageCircle, Bookmark, Share2, Plus,
  Sun, Moon, Bell, LogOut, CheckCircle, Video
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CommentModal from "@/components/CommentModal";   



const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// --- SCHEMA MỚI DÀNH CHO STUDIO VIDEO TRANG CHỦ ---
interface StudioVideo {
  id: string;
  author_id: string;
  title: string;
  content: string;
  price?: number;
  video_url: string;
  likes_count?: number;
  saves_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  author?: { avatar_url?: string; full_name?: string; username?: string; role?: string };
}

export default function UserFeed() {
  const router = useRouter();
  
  const [videos, setVideos] = useState<StudioVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- AUTH & ROLE STATE ---
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // --- BOOKING STATE (ESCROW) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<StudioVideo | null>(null);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  
  // --- COMMENT STATE ---
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activeCommentVideoId, setActiveCommentVideoId] = useState<string | null>(null);

  // Biến này để lấy ra dữ liệu của video đang được mở
  const activeVideoData = videos.find(v => v.id === activeCommentVideoId);

  const handleCommentSuccess = () => {
    if (!activeCommentVideoId) return;
    setVideos(prev => prev.map(v => v.id === activeCommentVideoId ? { ...v, comments_count: (v.comments_count || 0) + 1 } : v));
  };

  // THÊM MỚI HÀM NÀY ĐỂ TRỪ SỐ KHI XÓA
  const handleCommentDeleted = () => {
    if (!activeCommentVideoId) return;
    setVideos(prev => prev.map(v => v.id === activeCommentVideoId ? { ...v, comments_count: Math.max((v.comments_count || 0) - 1, 0) } : v));
  };


  // --- NOTIFICATION STATE ---
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'system', title: 'Chào mừng đến với AI Health!', desc: 'Hệ thống đã sẵn sàng.', time: 'Vừa xong', isRead: false, icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ]);

  // --- THEME & SYSTEM STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);
  const [isMounted, setIsMounted] = useState(false); 

  // --- FETCH VIDEOS TỪ API STUDIO MỚI ---
  const fetchVideos = async (userId?: string) => {
    try {
      const url = userId ? `${API_URL}/tiktok/feeds?user_id=${userId}` : `${API_URL}/tiktok/feeds`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Backend error");
      const result = await response.json();
      if (result.status === "success") setVideos(result.data);
    } catch (error) {
      toast.error("Máy chủ đang đồng bộ dữ liệu...");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true); 
    let isSubscribed = true;
    
    const storedTheme = localStorage.getItem('theme') || 'dark';
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, curSession) => {
      if (!isSubscribed) return;

      if (curSession?.user) {
        setUser(curSession.user);
        setAccessToken(curSession.access_token);
        // GỌI VIDEO KÈM USER ID ĐỂ HIỆN TIM/SAVE
        fetchVideos(curSession.user.id); 

        const { data: userData } = await supabase.from("users").select("role, theme_preference").eq("id", curSession.user.id).single();
        if (userData && isSubscribed) {
           setUserRole(userData.role);
           if (userData.theme_preference === 'light') {
              setIsDarkMode(false);
              document.documentElement.classList.remove('dark');
              localStorage.setItem('theme', 'light');
           }
        }
      } else {
        setUser(null);
        setAccessToken(null);
        setUserRole("USER");
        fetchVideos(); 
      }
    });

    return () => {
      isSubscribed = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- AUTH LOGIC ---
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
        toast.success("Khởi tạo thành công! Hãy bắt đầu hành trình.", { id: toastId });
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
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}` } });
      if (error) throw error;
    } catch (error: any) { toast.error(`Lỗi đăng nhập Google: ${error.message}`); }
  };

  const handleUserAvatarClick = () => {
    if (!user) setIsAuthModalOpen(true);
    else setIsUserMenuOpen(prev => !prev);
  };

  const handleGoToProfile = () => {
    setIsUserMenuOpen(false);
    if (userRole === "SUPER_ADMIN") router.push("/admin/profile");
    else if (userRole === "MODERATOR") router.push("/moderator/profile");
    else if (userRole === "PARTNER_ADMIN") router.push("/partner/profile");
    else router.push("/user/profile");
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    const toastId = toast.loading("Đang đăng xuất...");
    try {
      await supabase.auth.signOut();
      window.location.href = "/";
      setUser(null);
      setAccessToken(null);
      setUserRole("USER");
      toast.success("Đã đăng xuất thành công!", { id: toastId });
    } catch (error: any) { toast.error("Lỗi đăng xuất!", { id: toastId }); }
  };

  // --- INTERACTION LOGIC (Gọi API Studio) ---
  const handleInteraction = async (videoId: string, action: 'like' | 'save' | 'share') => {
    if (!user || !accessToken) {
      toast.info(`Vui lòng đăng nhập để thao tác!`);
      setIsAuthModalOpen(true);
      return;
    }

    // Chỉ cập nhật giao diện Like/Save ngay lập tức (Share không cần đổi màu icon)
    if (action !== 'share') {
      setVideos(prev => prev.map(v => {
        if (v.id === videoId) {
          if (action === 'like') return { ...v, is_liked: !v.is_liked, likes_count: (v.likes_count || 0) + (v.is_liked ? -1 : 1) };
          if (action === 'save') return { ...v, is_saved: !v.is_saved, saves_count: (v.saves_count || 0) + (v.is_saved ? -1 : 1) };
        }
        return v;
      }));
    }

    try {
      await fetch(`${API_URL}/tiktok/feeds/${videoId}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` }
      });
    } catch (error) { fetchVideos(); }
  };

  const handleOpenComments = (videoId: string) => {
    setActiveCommentVideoId(videoId); // Sửa từ setActiveVideoId thành setActiveCommentVideoId
    setIsCommentModalOpen(true);
  };

  const handleShare = async (videoId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/?video=${videoId}`);
    toast.success("Đã sao chép liên kết vào khay nhớ tạm!");
    if (user && accessToken) {
      await handleInteraction(videoId, 'share');
    }
  };

  // --- LUỒNG BOOKING MỚI: GỬI YÊU CẦU ĐẶT LỊCH (CHƯA THANH TOÁN) ---
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideo || !user || !accessToken) return;
    
    if (!bookingName.trim() || !bookingPhone.trim()) {
      toast.error("Vui lòng nhập đầy đủ Họ tên và Số điện thoại!");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Đang gửi yêu cầu đến cơ sở...");
    
    try {
      const code = affiliateCode.trim();

      if (code !== "") {
        const validateRes = await fetch(`${API_URL}/affiliates/validate?code=${code}`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        if (!validateRes.ok) throw new Error("Mã giới thiệu không hợp lệ hoặc không tồn tại!");
      }

      // GỌI API MỚI: Gửi request đến Partner (Status sẽ là WAITING_PARTNER)
      const bookingRes = await fetch(`${API_URL}/appointments/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({ 
          partner_id: activeVideo.author_id, // Lấy ID chủ video làm partner_id
          video_id: activeVideo.id, 
          affiliate_code: code || null, 
          total_amount: activeVideo.price || 0,
          customer_name: bookingName.trim(),
          customer_phone: bookingPhone.trim(),
          note: bookingNote.trim()
        })
      });
      
      const bookingData = await bookingRes.json();
      
      if (!bookingRes.ok) throw new Error(bookingData.detail || "Lỗi gửi yêu cầu");
      
      // Hiển thị thông báo thành công và không chuyển hướng PayOS
      toast.success(bookingData.message || "Yêu cầu đã được gửi! Vui lòng theo dõi tại tab 'Lịch hẹn'.", { id: toastId, duration: 5000 });
      
      // Đóng modal & dọn dẹp form
      setIsModalOpen(false);
      setBookingName("");
      setBookingPhone("");
      setBookingNote("");
      setAffiliateCode("");
      
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
    
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', themeStr);

    if (user && accessToken) {
      try {
        await fetch(`${API_URL}/user/profile`, {
          method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
          body: JSON.stringify({ theme_preference: themeStr })
        });
      } catch (error) { console.error("Lỗi đồng bộ Theme"); }
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setHasNotification(false);
    toast.success("Đã đánh dấu tất cả là đã đọc");
  };

  const handleOpenNotification = () => {
    setIsNotificationOpen(true);
    setHasNotification(false);
  };

  if (isLoading || !isMounted) {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
        <div className="relative w-16 h-16"><div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div><div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"><Sparkles className="text-white w-6 h-6 animate-pulse" /></div></div>
        <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">Khơi nguồn sức sống...</p>
      </div>
    );
  }

  const filteredNotifs = activeNotifTab === 'all' ? notifications : notifications.filter(n => !n.isRead);

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* ================= MAIN FEED AREA ================= */}
      <div className="flex-1 relative h-[100dvh]">
        <div className="md:hidden absolute top-0 w-full z-40 p-6 flex justify-between items-center pointer-events-none transition-all">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 transition-colors duration-500">AI<span className="text-[#80BF84]">HEALTH</span></h1>
        </div>

        {/* THEME & NOTIFICATION CONTROLS */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3 pointer-events-auto">
          <button onClick={handleThemeToggle} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            {isDarkMode ? <Sun size={20} className="group-hover:text-amber-300 transition-colors"/> : <Moon size={20} className="group-hover:text-blue-500 transition-colors"/>}
          </button>
          <button onClick={handleOpenNotification} className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
            <Bell size={20} className="group-hover:text-[#80BF84] transition-colors"/>
            {hasNotification && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.8)]"></span>}
          </button>
        </div>

        <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
          {videos.length === 0 && (
             <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
                 <Video size={48} className="mb-4 opacity-30"/>
                 <p className="font-bold text-slate-500 dark:text-zinc-500">Chưa có video nào được đăng tải trên Studio.</p>
             </div>
          )}

          {videos.map((item, index) => {
            const fallbackVideo = `/video-${(index % 3) + 1}.mp4`;
            return (
              <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center transition-colors duration-500">
                <div className="hidden md:block absolute inset-0 w-full h-full">
                  <video src={item.video_url || fallbackVideo} className="w-full h-full object-cover opacity-10 dark:opacity-30 blur-[60px] scale-125 transition-opacity duration-500" loop autoPlay muted playsInline />
                </div>
                <div className="relative w-full h-full md:h-[94vh] md:w-auto md:aspect-[9/16] md:rounded-[2.5rem] overflow-hidden bg-black md:border border-slate-200 dark:border-white/10 md:shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:md:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500">
                    <video src={item.video_url || fallbackVideo} className="absolute inset-0 w-full h-full object-cover opacity-90" loop autoPlay muted playsInline />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                    
                    <div className="absolute bottom-[100px] md:bottom-[40px] left-4 md:left-6 z-10 max-w-[75%] pointer-events-auto animate-slide-up">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-full text-[10px] font-bold text-[#80BF84] mb-3 uppercase tracking-wider shadow-sm">
                          <ShieldCheck size={12} /> Dịch vụ xác thực
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-xl mb-1.5 text-balance">{item.title}</h3>
                        <p className="text-zinc-200 dark:text-zinc-300 text-xs md:text-sm line-clamp-2 drop-shadow-md font-medium mb-4 pr-4">{item.content}</p>
                        
                        {item.price && (
                          <button onClick={() => { if (!user) { setIsAuthModalOpen(true); return; } setActiveVideo(item); setIsModalOpen(true); }} className="group flex items-center gap-3 pl-2 pr-5 py-2 bg-white/20 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 text-white rounded-[2rem] hover:bg-white/30 dark:hover:bg-white/20 active:scale-95 transition-all shadow-xl shadow-black/20">
                            <div className="w-10 h-10 bg-[#80BF84] rounded-full flex items-center justify-center text-zinc-950 shadow-sm group-hover:scale-110 transition-transform"><CalendarPlus size={20} strokeWidth={2.5} /></div>
                            <div className="flex flex-col text-left"><span className="font-bold text-sm tracking-wide drop-shadow-sm leading-tight">Đặt gói này</span><span className="text-[10px] font-semibold text-[#80BF84] leading-tight">{item.price.toLocaleString()} VND</span></div>
                          </button>
                        )}
                    </div>

                    <div className="absolute bottom-[100px] md:bottom-[40px] right-3 md:right-4 z-20 flex flex-col items-center gap-5 md:gap-6 pointer-events-auto">
                        <div className="relative mb-2 group cursor-pointer active:scale-90 transition-transform" onClick={() => {
                           if (item.author?.username) router.push(`/${item.author.username}`);
                        }}>
                          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center shadow-lg group-hover:border-[#80BF84] transition-colors">
                             {item.author?.avatar_url ? <img src={item.author.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={24} className="text-zinc-400" />}
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#80BF84] rounded-full flex items-center justify-center border-2 border-zinc-900 group-hover:scale-110 transition-transform"><Plus size={12} className="text-zinc-950" strokeWidth={4} /></div>
                        </div>

                        <button onClick={() => handleInteraction(item.id, 'like')} className="flex flex-col items-center gap-1 group">
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_liked ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' : 'bg-white/20 dark:bg-black/40 border border-white/30 dark:border-white/10 text-white group-hover:bg-rose-500/30 dark:group-hover:bg-rose-500/20 group-hover:text-rose-400 group-hover:border-rose-500/50'}`}><Heart size={24} strokeWidth={2} className={`group-active:scale-75 transition-transform ${item.is_liked ? 'fill-rose-500' : ''}`} /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.likes_count || 0}</span>
                        </button>
                        
                        <button 
                          onClick={() => handleOpenComments(item.id)} // "item.id" chính là videoId
                          className="flex flex-col items-center gap-1 group"
                        >
                          <div className="p-3 rounded-full bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/30 dark:border-white/10 text-white group-hover:bg-white/30 transition-all">
                            <MessageCircle size={24} />
                          </div>
                          <span className="text-xs font-bold text-white drop-shadow-md">
                            {item.comments_count || 0}
                          </span>
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

        {/* ================= MOBILE BOTTOM DOCK ================= */}
        
      </div>

      {/* ================= CÁC COMPONENTS MODAL CON ================= */}
      
      <CommentModal 
        isOpen={isCommentModalOpen} 
        onClose={() => setIsCommentModalOpen(false)} 
        videoId={activeCommentVideoId || ""} 
        videoAuthorId={activeVideoData?.author_id || ""} 
        user={user} 
        userRole={userRole} 
        onCommentAdded={handleCommentSuccess} 
        onCommentDeleted={handleCommentDeleted} 
      />
      
      {/* Modal Thông báo */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-[110] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-colors duration-500" onClick={() => setIsNotificationOpen(false)}></div>
          <div className="relative w-full md:w-[420px] h-[85vh] md:h-[calc(100vh-48px)] bg-white/80 dark:bg-black/60 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl transition-colors duration-500 animate-slide-up">
             <div className="pt-8 pb-4 px-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center transition-colors duration-500">
               <h3 className="text-xl font-black text-slate-900 dark:text-white transition-colors duration-500">Thông báo</h3>
               <div className="flex items-center gap-3">
                  <button onClick={markAllAsRead} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1" title="Đánh dấu tất cả đã đọc"><CheckCircle size={18}/></button>
                  <button onClick={() => setIsNotificationOpen(false)} className="text-slate-500 dark:text-white hover:text-slate-900 transition-colors"><X size={20}/></button>
               </div>
             </div>
             <div className="px-6 py-3 border-b border-slate-200 dark:border-white/10 flex gap-2">
               <button onClick={() => setActiveNotifTab('all')} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeNotifTab === 'all' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>Tất cả</button>
               <button onClick={() => setActiveNotifTab('unread')} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeNotifTab === 'unread' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  Chưa đọc
                  {notifications.filter(n => !n.isRead).length > 0 && <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-md text-[10px] leading-none">{notifications.filter(n => !n.isRead).length}</span>}
               </button>
             </div>
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
                                <div className={`p-2.5 rounded-xl ${notif.bg} ${notif.color} shrink-0`}><Icon size={20} strokeWidth={2.5} /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1"><h4 className={`text-sm font-black leading-tight ${!notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>{notif.title}</h4></div>
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

      {/* Modal Đặt Lịch - Escrow TỪ STUDIO VIDEO */}
      {isModalOpen && activeVideo && user && (
        <div className="fixed inset-0 z-[150] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-500" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-10 z-10 shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/50 dark:border-white/10 animate-slide-up">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#80BF84]/10 border border-[#80BF84]/20 rounded-full text-[10px] font-bold text-[#80BF84] mb-3 uppercase tracking-wider">
                  <Sparkles size={12} /> Đặt lịch từ Video
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight pr-4">{activeVideo.title}</h3>
                <p className="text-[#80BF84] font-black text-lg mt-1">{activeVideo.price?.toLocaleString()} VND</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition-colors shrink-0"><X size={20}/></button>
            </div>

            <form onSubmit={handleBooking} className="flex flex-col gap-4">
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
                  {/* Hộp thông báo tiền xử lý giá tiền / Escrow */}
                  <div className="p-4 mb-5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                      <ShieldCheck size={20} className="text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] leading-relaxed text-blue-800 dark:text-blue-300 font-medium">
                          Bạn <strong>chưa cần thanh toán lúc này</strong>. Tổng tiền <strong className="text-blue-600 dark:text-blue-400">{activeVideo.price?.toLocaleString()} VND</strong> sẽ được hệ thống bảo chứng an toàn <strong>sau khi cơ sở xác nhận có lịch trống</strong> dành cho bạn.
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

      {/* Modal Đăng Nhập / Đăng Ký */}
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