"use client";

import { useEffect, useState } from "react";
import { 
  User as UserIcon, ShieldCheck, Sparkles, Home, Compass, 
  CalendarDays, Heart, MessageCircle, Bookmark, Share2, Plus,
  Sun, Moon, Bell, LogOut, CheckCircle, Video, X
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CommentModal from "@/components/CommentModal";
import { useUI } from "@/context/UIContext";

// --- KHỞI TẠO SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu biến môi trường Supabase!");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ĐỒNG BỘ SCHEMA BÀI ĐĂNG CỘNG ĐỒNG (STUDIO)
interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  price?: number;
  video_url?: string;
  likes_count?: number;
  saves_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  author?: { avatar_url?: string; full_name?: string; username?: string; role?: string };
}

export default function UserFeed() {
  const router = useRouter();
  
  const [posts, setPosts] = useState<Post[]>([]);
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

  // --- COMMENT STATE ---
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  // --- NOTIFICATION STATE ---
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'system', title: 'Video của bạn đã được lên Feed!', desc: 'Video Studio của bạn đã tiếp cận được 100 người.', time: '10 phút trước', isRead: false, icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ]);

  // --- THEME & SYSTEM STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);
  const [isMounted, setIsMounted] = useState(false); 

  // --- FETCH FEED POSTS (STUDIO) ---
  const fetchPosts = async () => {
    try {
      // GỌI ĐÚNG API CỘNG ĐỒNG (STUDIO FEED)
      const response = await fetch("https://ai-health-share-backend.onrender.com/community/posts");
      if (!response.ok) throw new Error("Lỗi mạng: Backend không phản hồi");
      const result = await response.json();
      if (result.status === "success") setPosts(result.data);
    } catch (error) {
      toast.error("Máy chủ AI Health đang khởi động. Vui lòng đợi...");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true); 
    let isSubscribed = true; 
    let authListener: any = null; 
    
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const initAuth = () => {
      const { data } = supabase.auth.onAuthStateChange(async (_event, curSession) => {
        if (!isSubscribed) return; 

        if (curSession?.user) {
          setUser(curSession.user);
          setAccessToken(curSession.access_token);
          fetchPosts(); // Fetch lại khi đăng nhập

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
          fetchPosts(); 
        }
      });
      authListener = data;
    };

    const timeoutId = setTimeout(initAuth, 100);

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
      if (authListener) authListener.subscription.unsubscribe();
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
        toast.success("Khởi tạo thành công!", { id: toastId });
      }
      setIsAuthModalOpen(false);
      setEmail(""); setPassword("");
    } catch (error: any) {
      toast.error(`Lỗi xác thực: ${error.message}`, { id: toastId });
    } finally {
      setAuthLoading(false);
    }
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
    else router.push("/profile");
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    const toastId = toast.loading("Đang đăng xuất...");
    try {
      await supabase.auth.signOut();
      toast.success("Đã đăng xuất thành công!", { id: toastId });
    } catch (error: any) { toast.error("Lỗi đăng xuất!", { id: toastId }); }
  };

  // --- INTERACTION LOGIC (SỬA LẠI ĐÚNG API COMMUNITY) ---
  const handleInteraction = async (postId: string, action: 'like' | 'save') => {
    if (!user || !accessToken) {
      toast.info(`Vui lòng đăng nhập để ${action === 'like' ? 'thích' : 'lưu'} video!`);
      setIsAuthModalOpen(true);
      return;
    }

    // Cập nhật UI ngay lập tức
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        if (action === 'like') return { ...p, is_liked: !p.is_liked, likes_count: (p.likes_count || 0) + (p.is_liked ? -1 : 1) };
        else return { ...p, is_saved: !p.is_saved, saves_count: (p.saves_count || 0) + (p.is_saved ? -1 : 1) };
      }
      return p;
    }));

    try {
      await fetch(`https://ai-health-share-backend.onrender.com/community/posts/${postId}/${action}`, {
        method: "POST", headers: { "Authorization": `Bearer ${accessToken}` }
      });
    } catch (error) { fetchPosts(); } // Lỗi thì fetch lại
  };

  const handleOpenComments = (postId: string) => {
    setActiveCommentPostId(postId);
    setIsCommentModalOpen(true);
  };

  const handleShare = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/?post=${postId}`);
    toast.success("Đã sao chép liên kết video!");
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
        await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
          method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
          body: JSON.stringify({ theme_preference: themeStr })
        });
      } catch (error) { console.error("Lỗi đồng bộ Theme:", error); }
    }
  };

  if (isLoading || !isMounted) {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
        <div className="relative w-16 h-16"><div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div><div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"><Sparkles className="text-white w-6 h-6 animate-pulse" /></div></div>
        <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">Đang tải bảng tin...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* ================= TIKTOK FEED AREA ================= */}
      <div className="flex-1 relative h-[100dvh]">
        
        {/* LOGO */}
        <div className="md:hidden absolute top-0 w-full z-40 p-6 flex justify-between items-center pointer-events-none transition-all">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1">AI<span className="text-[#80BF84]">HEALTH</span></h1>
        </div>

        {/* CONTROLS */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3 pointer-events-auto">
          <button onClick={handleThemeToggle} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20} className="text-amber-300"/> : <Moon size={20} className="text-blue-500"/>}
          </button>
          <button onClick={() => {setIsNotificationOpen(true); setHasNotification(false);}} className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 transition-all shadow-lg">
            <Bell size={20} />
            {hasNotification && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.8)]"></span>}
          </button>
        </div>

        <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
          
          {posts.length === 0 && (
             <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
                 <Video size={48} className="mb-4 opacity-30"/>
                 <p className="font-bold">Bảng tin đang trống. Hãy quay lại sau!</p>
             </div>
          )}

          {posts.map((item, index) => {
            const videoNumber = (index % 3) + 1; // Fallback video
            return (
              <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center transition-colors duration-500">
                <div className="hidden md:block absolute inset-0 w-full h-full"><video src={item.video_url || `/video-${videoNumber}.mp4`} className="w-full h-full object-cover opacity-10 dark:opacity-30 blur-[60px] scale-125 transition-opacity duration-500" loop autoPlay muted playsInline /></div>
                
                <div className="relative w-full h-full md:h-[94vh] md:w-auto md:aspect-[9/16] md:rounded-[2.5rem] overflow-hidden bg-black md:border border-slate-200 dark:border-white/10 md:shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:md:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500">
                    <video src={item.video_url || `/video-${videoNumber}.mp4`} className="absolute inset-0 w-full h-full object-cover opacity-90" loop autoPlay muted playsInline />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                    
                    {/* THÔNG TIN BÀI ĐĂNG (TRÁI) */}
                    <div className="absolute bottom-[100px] md:bottom-[40px] left-4 md:left-6 z-10 max-w-[75%] pointer-events-auto animate-slide-up">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-full text-[10px] font-bold text-amber-400 mb-3 uppercase tracking-wider shadow-sm"><Sparkles size={12} /> Studio Post</div>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-xl mb-1.5 text-balance">{item.title || "Video nổi bật"}</h3>
                        <p className="text-zinc-200 dark:text-zinc-300 text-xs md:text-sm line-clamp-2 drop-shadow-md font-medium mb-4 pr-4">{item.content}</p>
                        
                        {/* NÚT XEM HỒ SƠ THAY VÌ ĐẶT LỊCH */}
                        <button onClick={() => {
                            if (!item.author?.username) return toast.info("Người dùng này chưa tạo username");
                            router.push(`/${item.author.username}`);
                        }} className="group flex items-center gap-3 pl-2 pr-5 py-2 bg-white/20 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 text-white rounded-[2rem] hover:bg-white/30 transition-all shadow-xl">
                          <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><UserIcon size={20} strokeWidth={2.5} /></div>
                          <div className="flex flex-col text-left"><span className="font-bold text-sm tracking-wide drop-shadow-sm leading-tight">Xem hồ sơ</span><span className="text-[10px] font-semibold text-white/70 leading-tight">@{item.author?.username || "user"}</span></div>
                        </button>
                    </div>

                    {/* THANH TƯƠNG TÁC (PHẢI) */}
                    <div className="absolute bottom-[100px] md:bottom-[40px] right-3 md:right-4 z-20 flex flex-col items-center gap-5 md:gap-6 pointer-events-auto">
                        <div className="relative mb-2 group cursor-pointer active:scale-90 transition-transform" onClick={() => {
                           if (item.author?.username) router.push(`/${item.author.username}`);
                        }}>
                          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800 flex items-center justify-center shadow-lg group-hover:border-[#80BF84] transition-colors">
                             {item.author?.avatar_url ? <img src={item.author.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={24} className="text-zinc-400" />}
                          </div>
                          {item.author?.role === 'PARTNER_ADMIN' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-zinc-900 group-hover:scale-110 transition-transform"><ShieldCheck size={12} className="text-white" strokeWidth={4} /></div>}
                        </div>

                        <button onClick={() => handleInteraction(item.id, 'like')} className="flex flex-col items-center gap-1 group">
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_liked ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' : 'bg-white/20 border border-white/30 text-white'}`}><Heart size={24} strokeWidth={2} className={`${item.is_liked ? 'fill-rose-500' : ''}`} /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.likes_count || 0}</span>
                        </button>
                        
                        <button onClick={() => handleOpenComments(item.id)} className="flex flex-col items-center gap-1 group">
                          <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white transition-all"><MessageCircle size={24} strokeWidth={2}/></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.comments_count || 0}</span>
                        </button>
                        
                        <button onClick={() => handleInteraction(item.id, 'save')} className="flex flex-col items-center gap-1 group">
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_saved ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-white/20 border border-white/30 text-white'}`}><Bookmark size={24} strokeWidth={2} className={`${item.is_saved ? 'fill-amber-400' : ''}`} /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.saves_count || 0}</span>
                        </button>
                        
                        <button onClick={() => handleShare(item.id)} className="flex flex-col items-center gap-1 group">
                          <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white transition-all"><Share2 size={24} strokeWidth={2}/></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">Chia sẻ</span>
                        </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= MOBILE BOTTOM DOCK ================= */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl transition-colors duration-500">
            <button className="text-[#80BF84] transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors"><Compass size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/AI')} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-300 p-[2px] shadow-[0_0_20px_rgba(128,191,132,0.3)] group-hover:scale-105 transition-all"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center"><Sparkles size={26} className="text-[#80BF84]" strokeWidth={2.5} /></div></div>
            </button>
            <button onClick={() => router.push('/features/favorite')} className="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors"><Heart size={26} strokeWidth={2.5} /></button>
            
            <div className="relative">
              {isUserMenuOpen && user && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute bottom-full mb-6 right-0 w-48 p-2 flex flex-col gap-1 z-50 animate-fade-in bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-2xl border border-slate-200 dark:border-white/10 rounded-2xl">
                      <button onClick={handleGoToProfile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all text-sm w-full text-left"><UserIcon size={16} /> Trang cá nhân</button>
                      <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold transition-all text-sm w-full text-left"><LogOut size={16} /> Đăng xuất</button>
                  </div>
                </>
              )}
              <button onClick={handleUserAvatarClick} className="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors group">
                <UserIcon size={26} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      
      <CommentModal 
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        serviceId={activeCommentPostId || ""} // Note: Component CommentModal nên sửa prop thành postId sau này
        user={user}
        userRole={userRole}
      />

      {/* Notification Modal */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-[110] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsNotificationOpen(false)}></div>
          <div className="relative w-full md:w-[420px] h-[85vh] md:h-[calc(100vh-48px)] bg-white/80 dark:bg-black/60 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 flex flex-col shadow-2xl animate-slide-up">
             <div className="pt-8 pb-4 px-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
               <h3 className="text-xl font-black text-slate-900 dark:text-white">Thông báo</h3>
               <button onClick={() => setIsNotificationOpen(false)} className="text-slate-500 hover:text-slate-900"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
                <Bell size={40} className="text-slate-300 dark:text-zinc-700 mb-4" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Bạn đã xem hết thông báo!</h3>
                <p className="text-slate-500 text-xs">Chưa có cập nhật mới nào.</p>
             </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl" onClick={() => setIsAuthModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl rounded-[3rem] p-8 z-10 shadow-2xl border border-slate-200 dark:border-white/10 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{isLoginMode ? "Đăng nhập" : "Đăng ký"}</h3>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-500 hover:text-slate-900"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" placeholder="Email" className="w-full px-5 py-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84]" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Mật khẩu" className="w-full px-5 py-4 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84]" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="submit" disabled={authLoading} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black rounded-2xl active:scale-95 transition-all">
                {isLoginMode ? "Đăng nhập" : "Tạo tài khoản"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}