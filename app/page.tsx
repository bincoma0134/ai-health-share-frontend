"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, X, User as UserIcon, ShieldCheck, Sparkles, Home, Compass, CalendarDays, Heart, MessageCircle, Bookmark, Share2, Plus, Send } from "lucide-react";
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
  const [userRole, setUserRole] = useState<string>("USER"); // State mới lưu trữ Role
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

  // --- STATE COMMENT ---
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activeCommentServiceId, setActiveCommentServiceId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // --- STATE AI CHAT ASSISTANT ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
    { role: 'bot', content: 'Xin chào! Tôi là trợ lý AI Health của bạn. Tôi có thể lắng nghe những căng thẳng của bạn hoặc tư vấn dịch vụ trị liệu phù hợp. Bạn đang cảm thấy thế nào hôm nay?' }
  ]);

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Khởi tạo trạng thái và lấy Role từ DB
      if (session?.user) {
        setUser(session.user);
        fetchServices(session.user.id);
        const { data } = await supabase.from("users").select("role").eq("id", session.user.id).single();
        if (data) setUserRole(data.role);
      } else {
        fetchServices();
      }

      // Lắng nghe thay đổi phiên đăng nhập
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

  // --- LOGIC ĐIỀU HƯỚNG THÔNG MINH THEO ROLE ---
  const handleProfileClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    // Nếu là Doanh nghiệp (PARTNER) hoặc ADMIN, đẩy về Dashboard. Ngược lại đẩy về Profile thường.
    if (userRole === "PARTNER_ADMIN" || userRole === "SUPER_ADMIN") {
      router.push("/partner/dashboard");
    } else {
      router.push("/profile");
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

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col items-center justify-center gap-6">
        <div className="relative w-16 h-16"><div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div><div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"><Sparkles className="text-white w-6 h-6 animate-pulse" /></div></div>
        <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">Khơi nguồn sức sống...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-hidden flex relative">
      
      {/* 1. LEFT SIDEBAR DESKTOP */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-black/40 backdrop-blur-3xl border-r border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-10"><h1 className="text-3xl font-black text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/10 text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} className="text-[#80BF84]" /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button onClick={() => toast.info("Đang phát triển")} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group"><Compass size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Khám phá</span></button>
          <button onClick={() => toast.info("Đang phát triển")} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group"><CalendarDays size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Lịch hẹn</span></button>
          <button onClick={() => toast.info("Đang phát triển")} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group"><Heart size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Yêu thích</span></button>
          <div className="mt-8 px-2">
            <button onClick={() => setIsChatOpen(true)} className="w-full relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#80BF84] to-emerald-300 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 shadow-xl group-hover:scale-[1.02] transition-all"><Sparkles size={20} strokeWidth={3} /><span className="font-black text-sm tracking-wide">AI Trợ lý</span></div>
            </button>
          </div>
        </div>
        <div className="mt-auto px-2">
          <button onClick={handleProfileClick} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group border border-transparent hover:border-white/10">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 group-hover:border-[#80BF84] transition-colors"><UserIcon size={16} /></div>
            <span className="text-sm tracking-wide truncate max-w-[120px] text-left">{user ? user.email.split('@')[0] : "Đăng nhập"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN FEED AREA */}
      <div className="flex-1 relative h-[100dvh]">
        <div className="md:hidden absolute top-0 w-full z-40 p-6 flex justify-between items-center pointer-events-none transition-all"><h1 className="text-2xl font-black text-white tracking-tighter drop-shadow-lg flex items-center gap-1">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
          {services.map((item, index) => {
            const videoNumber = (index % 3) + 1;
            const desktopRatioClass = "md:aspect-[9/16]"; 

            return (
              <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always bg-black overflow-hidden flex items-center justify-center">
                <div className="hidden md:block absolute inset-0 w-full h-full"><video src={`/video-${videoNumber}.mp4`} className="w-full h-full object-cover opacity-30 blur-[60px] scale-125" loop autoPlay muted playsInline /></div>
                <div className={`relative w-full h-full md:h-[94vh] md:w-auto ${desktopRatioClass} md:rounded-[2.5rem] overflow-hidden bg-black md:border md:border-white/10 md:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500`}>
                    <video src={`/video-${videoNumber}.mp4`} className="absolute inset-0 w-full h-full object-cover opacity-90" loop autoPlay muted playsInline />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-[100px] md:bottom-[40px] left-4 md:left-6 z-10 max-w-[75%] pointer-events-auto animate-slide-up">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-[#80BF84] mb-3 uppercase tracking-wider shadow-sm"><ShieldCheck size={12} /> Dịch vụ xác thực</div>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-xl mb-1.5 text-balance">{item.service_name}</h3>
                        <p className="text-zinc-300 text-xs md:text-sm line-clamp-2 drop-shadow-md font-medium mb-4 pr-4">{item.description}</p>
                        <button onClick={() => { if (!user) { setIsAuthModalOpen(true); return; } setActiveService(item); setIsModalOpen(true); }} className="group flex items-center gap-3 pl-2 pr-5 py-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-[2rem] hover:bg-white/20 active:scale-95 transition-all shadow-xl shadow-black/20">
                          <div className="w-10 h-10 bg-[#80BF84] rounded-full flex items-center justify-center text-zinc-950 shadow-sm group-hover:scale-110 transition-transform"><CalendarPlus size={20} strokeWidth={2.5} /></div>
                          <div className="flex flex-col text-left"><span className="font-bold text-sm tracking-wide drop-shadow-sm leading-tight">Đặt gói này</span><span className="text-[10px] font-semibold text-[#80BF84] leading-tight">{item.price.toLocaleString()} VND</span></div>
                        </button>
                    </div>

                    <div className="absolute bottom-[100px] md:bottom-[40px] right-3 md:right-4 z-20 flex flex-col items-center gap-5 md:gap-6 pointer-events-auto">
                        
                        {/* 🚀 ĐIỂM CHẠM VÀO PROFILE DOANH NGHIỆP CÓ BỌC LỖI */}
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
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_liked ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' : 'bg-black/40 border border-white/10 text-white group-hover:bg-rose-500/20 group-hover:text-rose-400 group-hover:border-rose-500/50'}`}><Heart size={24} strokeWidth={2} className={`group-active:scale-75 transition-transform ${item.is_liked ? 'fill-rose-500' : ''}`} /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.likes_count || 0}</span>
                        </button>
                        <button onClick={() => handleOpenComments(item.id)} className="flex flex-col items-center gap-1 group">
                          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white group-hover:bg-white/20 transition-all"><MessageCircle size={24} strokeWidth={2} className="group-active:scale-75 transition-transform" /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.comments_count || 0}</span>
                        </button>
                        <button onClick={() => handleInteraction(item.id, 'save')} className="flex flex-col items-center gap-1 group">
                          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${item.is_saved ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-black/40 border border-white/10 text-white group-hover:bg-amber-500/20 group-hover:text-amber-400 group-hover:border-amber-500/50'}`}><Bookmark size={24} strokeWidth={2} className={`group-active:scale-75 transition-transform ${item.is_saved ? 'fill-amber-400' : ''}`} /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">{item.saves_count || 0}</span>
                        </button>
                        <button onClick={() => handleShare(item.id)} className="flex flex-col items-center gap-1 group">
                          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white group-hover:bg-white/20 transition-all"><Share2 size={24} strokeWidth={2} className="group-active:scale-75 transition-transform" /></div>
                          <span className="text-xs font-bold text-white drop-shadow-md">Chia sẻ</span>
                        </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. MOBILE BOTTOM DOCK */}
        <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-white/10 bg-black/60 backdrop-blur-2xl">
            <button className="text-[#80BF84] hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => toast.info("Đang phát triển")} className="text-zinc-500 hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => setIsChatOpen(true)} className="relative -mt-10 group">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-300 p-[2px] shadow-[0_0_20px_rgba(128,191,132,0.3)] group-hover:scale-105 transition-all duration-300"><div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center"><Sparkles size={26} className="text-[#80BF84]" strokeWidth={2.5} /></div></div>
            </button>
            <button onClick={() => toast.info("Đang phát triển")} className="text-zinc-500 hover:text-white transition-colors group"><Heart size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={handleProfileClick} className="text-zinc-500 hover:text-white transition-colors group"><UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
          </div>
        </div>
      </div>

      {/* --- MODAL CHAT & BÌNH LUẬN & ĐẶT LỊCH --- */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[110] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsChatOpen(false)}></div>
          <div className="relative w-full md:w-[420px] h-[85vh] md:h-[calc(100vh-48px)] bg-black/50 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/10 flex flex-col shadow-2xl">
             <div className="pt-8 pb-4 px-6 border-b border-white/10 flex justify-between items-center"><h3 className="text-base font-bold text-white">AI Trợ Lý</h3><button onClick={() => setIsChatOpen(false)}><X size={18}/></button></div>
             <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar flex flex-col">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                    <div className={`p-4 text-sm ${msg.role === 'user' ? 'bg-[#80BF84] text-zinc-950 rounded-[1.5rem] rounded-tr-sm' : 'bg-white/10 text-white rounded-[1.5rem] rounded-tl-sm'}`}>{msg.content}</div>
                  </div>
                ))}
             </div>
             <form onSubmit={handleSendChatMessage} className="p-4 border-t border-white/10 flex gap-3">
               <input type="text" className="flex-1 bg-white/5 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none" value={chatInput} onChange={e => setChatInput(e.target.value)} />
               <button type="submit" className="w-10 h-10 rounded-full bg-[#80BF84] text-zinc-950 flex items-center justify-center"><Send size={16}/></button>
             </form>
          </div>
        </div>
      )}

      {isCommentModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center md:justify-end md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCommentModalOpen(false)}></div>
          <div className="relative w-full md:w-[420px] h-[75vh] md:h-[calc(100vh-48px)] bg-black/50 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/10 flex flex-col">
             <div className="pt-8 pb-4 px-6 border-b border-white/10 flex justify-between items-center"><h3 className="text-lg font-bold text-white">Bình luận</h3><button onClick={() => setIsCommentModalOpen(false)}><X size={18}/></button></div>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {comments.map(c => (
                   <div key={c.id} className="flex gap-3">
                     <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">{c.users?.avatar_url ? <img src={c.users.avatar_url}/> : <UserIcon size={16}/>}</div>
                     <div className="flex-1"><p className="text-xs font-medium">{c.users?.full_name || "Người dùng"}</p><p className="text-sm">{c.content}</p></div>
                   </div>
               ))}
             </div>
             <form onSubmit={handlePostComment} className="p-4 border-t border-white/10 flex gap-3">
               <input type="text" className="flex-1 bg-white/5 rounded-full px-4 py-2.5 text-sm text-white" value={newComment} onChange={e => setNewComment(e.target.value)} />
               <button type="submit" className="w-10 h-10 rounded-full bg-[#80BF84]"><Send size={16}/></button>
             </form>
          </div>
        </div>
      )}

      {isModalOpen && activeService && user && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md glass-panel rounded-[3rem] p-8 z-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-8">Xác nhận lịch hẹn</h3>
            <form onSubmit={handleBooking} className="flex flex-col gap-6">
              <input type="text" placeholder="Mã giới thiệu..." className="w-full px-5 py-4 glass-input font-medium uppercase" value={affiliateCode} onChange={e => setAffiliateCode(e.target.value)} />
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#80BF84] text-white font-bold text-lg rounded-2xl">Tiếp tục thanh toán</button>
            </form>
          </div>
        </div>
      )}

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setIsAuthModalOpen(false)}></div>
          <div className="relative w-full max-w-sm glass-panel rounded-[3rem] p-8 z-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-6">{isLoginMode ? "Đăng nhập" : "Đăng ký"}</h3>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" placeholder="Email" className="w-full px-5 py-4 glass-input" value={email} onChange={e => setEmail(e.target.value)} />
              <input type="password" placeholder="Mật khẩu" className="w-full px-5 py-4 glass-input" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" className="w-full py-4 bg-[#26110F] text-white font-bold rounded-2xl">Xác nhận</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}