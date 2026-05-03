"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, User as UserIcon, 
  Sun, Moon, Bell, LogOut, Send, Bot, User as UserAvatar, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import { useUI } from "@/context/UIContext";
import { supabase } from "@/lib/supabase";


interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export default function AIFeature() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { setIsNotifOpen } = useUI();
  
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([{ 
      id: 'welcome-msg', 
      role: 'bot', 
      content: 'Xin chào! Tôi là Trợ lý AI Health. Hệ thống đã sẵn sàng phân tích và tư vấn. Bạn cần giúp gì hôm nay?', 
      timestamp: new Date() 
  }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        fetch("https://ai-health-share-backend.onrender.com/user/profile", {
            headers: { "Authorization": `Bearer ${session.access_token}` }
        }).then(res => res.json()).then(result => {
            if (result.status === "success") setUserRole(result.data.profile.role);
        }).catch(err => console.error("Lỗi lấy Profile:", err));

        fetch("https://ai-health-share-backend.onrender.com/ai/history", {
            headers: { "Authorization": `Bearer ${session.access_token}` }
        }).then(res => res.json()).then(result => {
            if (result.status === "success" && result.data.length > 0) {
                const history = result.data.map((m: any) => ({
                    id: m.id,
                    role: m.role === 'assistant' ? 'bot' : 'user',
                    content: m.content,
                    timestamp: new Date(m.created_at)
                }));
                setMessages(history); 
            }
        }).catch(err => console.error("Lỗi load History:", err));
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error("Vui lòng đăng nhập để sử dụng AI Assistant.");

      const apiMessages = newMessages.map(msg => ({ role: msg.role, content: msg.content }));

      const response = await fetch("https://ai-health-share-backend.onrender.com/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Lỗi HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === "success" && result.data?.reply) {
        const botMsg: ChatMessage = { id: Date.now().toString(), role: 'bot', content: result.data.reply, timestamp: new Date() };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error("Phản hồi từ LLM không hợp lệ.");
      }
    } catch (error: any) {
      toast.error(error.message);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: `Sự cố: ${error.message}`, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if(confirm("Bạn có chắc muốn làm mới cuộc trò chuyện? (Lịch sử sẽ bị ẩn khỏi màn hình này)")) {
        setMessages([{ id: 'welcome-msg', role: 'bot', content: 'Cuộc trò chuyện đã được làm mới. Tôi có thể giúp gì cho bạn?', timestamp: new Date() }]);
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
        fetch("https://ai-health-share-backend.onrender.com/user/profile", {
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
      toast.success("Đã đăng xuất!", { id: toastId });
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
      
      
      {/* 2. MAIN AI CHAT AREA */}
      <div className="flex-1 relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
        <div className="absolute top-0 w-full z-40 p-6 flex justify-between items-center bg-gradient-to-b from-slate-50 dark:from-zinc-950 to-transparent pointer-events-none transition-all">
            <div className="flex items-center gap-3 pointer-events-auto">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#80BF84] to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20"><Bot className="text-zinc-950" size={24} /></div>
                <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">AI Health Assistant</h2>
                    <p className="text-[10px] font-bold text-[#80BF84] uppercase tracking-widest">Phân tích đa luồng</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 pointer-events-auto">
                <button onClick={clearChat} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all shadow-lg" title="Xóa lịch sử">
                    <Trash2 size={18} />
                </button>

                {/* ĐÂY LÀ NÚT CHUÔNG ĐÃ ĐƯỢC GẮN STATE MỞ MODAL */}
                <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#80BF84] hover:bg-[#80BF84]/10 active:scale-95 transition-all shadow-lg" title="Thông báo">
                    <Bell size={18} />
                </button>

                <button onClick={handleThemeToggle} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-lg group">
                    {isDarkMode ? <Sun size={20} className="group-hover:text-amber-300 transition-colors"/> : <Moon size={20} className="group-hover:text-blue-500 transition-colors"/>}
                </button>
            </div>
        </div>

        {/* CHAT MESSAGES */}
        <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto pt-28 pb-32 px-5 md:px-8 space-y-6 no-scrollbar scroll-smooth">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    {msg.role === 'bot' && (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700 shadow-sm"><Bot size={18} className="text-[#80BF84]" /></div>
                    )}

                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                        <div className={`p-4 md:p-6 text-[15px] leading-relaxed transition-all duration-300 ${
                            msg.role === 'user' 
                            ? 'bg-[#80BF84] text-zinc-950 rounded-[1.5rem] rounded-tr-sm whitespace-pre-wrap font-medium shadow-md dark:shadow-[0_0_15px_rgba(128,191,132,0.2)]' 
                            : 'bg-white/80 dark:bg-zinc-900/60 backdrop-blur-2xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 rounded-[1.5rem] rounded-tl-sm shadow-lg dark:shadow-[0_0_15px_rgba(128,191,132,0.15)]'
                        }`}>
                            {msg.role === 'user' ? (
                                msg.content
                            ) : (
                                <ReactMarkdown
                                  components={{
                                    p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-lg font-black mb-2 mt-4 text-emerald-600 dark:text-emerald-400" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2 mt-3" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                                  }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            )}
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
                    <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[1.5rem] rounded-tl-sm px-5 py-4 flex items-center gap-1.5 shadow-lg dark:shadow-[0_0_15px_rgba(128,191,132,0.15)]">
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
            <form onSubmit={handleSendMessage} className="relative w-full flex items-end gap-3 p-2 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl focus-within:border-[#80BF84]/50 dark:focus-within:shadow-[0_0_20px_rgba(128,191,132,0.15)] transition-all duration-300">
                <textarea 
                    className="flex-1 bg-transparent px-5 py-4 min-h-[56px] max-h-[120px] text-[15px] font-medium text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none resize-none no-scrollbar" 
                    placeholder="VN Share xin chào..."
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                    rows={1}
                />
                <button type="submit" disabled={!input.trim() || isTyping} className="w-12 h-12 shrink-0 mb-1 mr-1 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all">
                    <Send size={20} className="ml-1"/>
                </button>
            </form>
            <p className="text-center text-[10px] text-slate-400 mt-3 font-semibold">AI Health Assistant có thể đưa ra kết quả không chính xác. Hãy luôn tham khảo ý kiến bác sĩ.</p>
        </div>

        {/* 3. MOBILE BOTTOM DOCK */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl transition-colors duration-500">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
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