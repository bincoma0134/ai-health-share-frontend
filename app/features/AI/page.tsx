"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, User as UserIcon, 
  Sun, Moon, Bell, LogOut, Send, Bot, User as UserAvatar, Trash2
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

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export default function AIFeature() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // --- STATE HỆ THỐNG & AUTH ---
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // --- STATE CHAT ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'welcome-msg', 
      role: 'bot', 
      content: 'Xin chào! Tôi là Trợ lý AI Health. Tôi có thể giúp bạn phân tích triệu chứng, tư vấn liệu trình hoặc tìm kiếm chuyên gia phù hợp. Bạn đang cảm thấy thế nào hôm nay?', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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
    };
    loadData();
  }, []);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // --- LOGIC CHAT ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // MÔ PHỎNG KẾT NỐI API AI (Sẽ đấu nối thực tế ở Backend sau)
    setTimeout(() => {
      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'bot', 
        content: 'Hệ thống đang ghi nhận thông tin của bạn. Trong các bản cập nhật tới, tôi sẽ kết nối trực tiếp với mô hình ngôn ngữ lớn (LLM) từ Backend để đưa ra những phân tích y khoa chuyên sâu và đề xuất liệu trình chính xác nhất!', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 2000);
  };

  const clearChat = () => {
    if(confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện này?")) {
        setMessages([{ 
            id: 'welcome-msg', 
            role: 'bot', 
            content: 'Cuộc trò chuyện đã được làm mới. Tôi có thể giúp gì cho bạn?', 
            timestamp: new Date() 
        }]);
    }
  };

  // --- UTILS ---
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
          method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
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
    } catch (error) { toast.error("Lỗi đăng xuất!", { id: toastId }); }
  };

  const handleGoToProfile = () => {
    setIsUserMenuOpen(false);
    if (userRole === "MODERATOR" || userRole === "SUPER_ADMIN") router.push("/moderator/profile");
    else if (userRole === "PARTNER_ADMIN") router.push("/partner/profile");
    else router.push("/profile");
  };

  if (!isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-zinc-950"></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* ================= 1. LEFT SIDEBAR ================= */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-colors duration-500">
        <div className="px-4 mb-10"><h1 onClick={() => router.push('/')} className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer transition-colors duration-500">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button onClick={() => router.push('/features/explore')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Compass size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Khám phá</span></button>
          <button onClick={() => router.push('/features/calendar')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><CalendarDays size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Lịch hẹn</span></button>
          <button onClick={() => router.push('/features/favorite')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Heart size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /><span className="text-sm tracking-wide">Yêu thích</span></button>
          
          {/* NÚT AI ĐANG ACTIVE */}
          <div className="mt-8 px-2">
            <button className="w-full relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#80BF84] to-emerald-300 rounded-2xl blur-xl opacity-70 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 shadow-xl transition-all"><Sparkles size={20} strokeWidth={3} /><span className="font-black text-sm tracking-wide">AI Trợ lý</span></div>
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

      {/* ================= 2. MAIN AI CHAT AREA ================= */}
      <div className="flex-1 relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
        
        {/* HEADER AREA */}
        <div className="absolute top-0 w-full z-40 p-6 flex justify-between items-center bg-gradient-to-b from-slate-50 dark:from-zinc-950 to-transparent pointer-events-none transition-all">
            <div className="flex items-center gap-3 pointer-events-auto">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#80BF84] to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20"><Bot className="text-zinc-950" size={24} /></div>
                <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">AI Health Assistant</h2>
                    <p className="text-[10px] font-bold text-[#80BF84] uppercase tracking-widest">Sẵn sàng tư vấn</p>
                </div>
            </div>
            
            {/* THEME & UTILS */}
            <div className="flex items-center gap-3 pointer-events-auto">
                <button onClick={clearChat} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all shadow-lg" title="Xóa lịch sử">
                    <Trash2 size={18} />
                </button>
                <button onClick={handleThemeToggle} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
                    {isDarkMode ? <Sun size={20} className="group-hover:text-amber-300 transition-colors"/> : <Moon size={20} className="group-hover:text-blue-500 transition-colors"/>}
                </button>
            </div>
        </div>

        {/* CHAT MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto pt-28 pb-32 px-5 md:px-8 space-y-6 no-scrollbar scroll-smooth">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    
                    {msg.role === 'bot' && (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700 shadow-sm"><Bot size={18} className="text-[#80BF84]" /></div>
                    )}

                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                        <div className={`p-4 md:p-5 text-[15px] leading-relaxed shadow-lg ${
                            msg.role === 'user' 
                            ? 'bg-[#80BF84] text-zinc-950 rounded-[1.5rem] rounded-tr-sm' 
                            : 'bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 rounded-[1.5rem] rounded-tl-sm'
                        }`}>
                            {msg.content}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-2 px-1 uppercase tracking-wider">
                            {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {msg.role === 'user' && (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#80BF84]/20 flex items-center justify-center shrink-0 border border-[#80BF84]/50 shadow-sm"><UserAvatar size={18} className="text-[#80BF84]" /></div>
                    )}
                </div>
            ))}

            {isTyping && (
                <div className="flex gap-4 justify-start animate-fade-in">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700 shadow-sm"><Bot size={18} className="text-[#80BF84]" /></div>
                    <div className="bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[1.5rem] rounded-tl-sm px-5 py-4 flex items-center gap-1.5 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-[#80BF84] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-[#80BF84] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-[#80BF84] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-5 md:px-0 pointer-events-auto">
            <form onSubmit={handleSendMessage} className="relative w-full flex items-end gap-3 p-2 bg-white/70 dark:bg-black/60 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl">
                <textarea 
                    className="flex-1 bg-transparent px-5 py-4 min-h-[56px] max-h-[120px] text-[15px] text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none resize-none no-scrollbar" 
                    placeholder="Mô tả triệu chứng hoặc câu hỏi của bạn..."
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                    rows={1}
                />
                <button type="submit" disabled={!input.trim() || isTyping} className="w-12 h-12 shrink-0 mb-1 mr-1 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all">
                    <Send size={20} className="ml-1"/>
                </button>
            </form>
            <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">AI Health Assistant có thể đưa ra kết quả không chính xác. Hãy luôn tham khảo ý kiến bác sĩ.</p>
        </div>

        {/* ================= 3. MOBILE BOTTOM DOCK ================= */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl transition-colors duration-500">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
            {/* NÚT AI MOBILE ĐANG ACTIVE */}
            <button className="relative -mt-10 group cursor-default">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-300 p-[2px] shadow-[0_0_20px_rgba(128,191,132,0.4)] transition-all duration-300"><div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center transition-colors duration-500"><Sparkles size={26} className="text-[#80BF84]" strokeWidth={2.5} /></div></div>
            </button>

            <button onClick={() => router.push('/features/favorite')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Heart size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            
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