"use client";

import { useEffect, useState } from "react";
import { 
  Home, User as UserIcon, ShieldCheck, Sun, Moon, Bell, 
  Play, CheckCircle, XCircle, Clock, AlertTriangle, FileText, X
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

interface PendingService {
  id: string;
  partner_id: string;
  service_name: string;
  description: string;
  price: number;
  created_at: string;
  users?: { full_name?: string; email?: string; avatar_url?: string };
}

export default function ModeratorDashboard() {
  const router = useRouter();
  
  // --- STATE HỆ THỐNG ---
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);

  // --- STATE DỮ LIỆU ---
  const [pendingServices, setPendingServices] = useState<PendingService[]>([]);
  const [selectedService, setSelectedService] = useState<PendingService | null>(null);
  
  // --- STATE XỬ LÝ (MODERATION) ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

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
      if (!session?.user) {
        toast.error("Vui lòng đăng nhập!");
        router.push("/");
        return;
      }
      setUser(session.user);
      
      try {
        // Kiểm tra Role
        const { data: profileData } = await supabase.from("users").select("role, theme_preference").eq("id", session.user.id).single();
        if (!profileData || (profileData.role !== "MODERATOR" && profileData.role !== "SUPER_ADMIN")) {
            toast.error("Truy cập bị từ chối!");
            router.push("/");
            return;
        }

        if (profileData.theme_preference === 'light') {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }

        fetchPendingServices(session.access_token);
      } catch (error) {
        toast.error("Lỗi xác thực.");
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [router]);

  const fetchPendingServices = async (token: string) => {
      try {
          const res = await fetch("https://ai-health-share-backend.onrender.com/moderation/services", {
              headers: { "Authorization": `Bearer ${token}` }
          });
          const result = await res.json();
          if (result.status === "success") {
              setPendingServices(result.data);
          }
      } catch (error) {
          toast.error("Không thể tải danh sách chờ duyệt.");
      }
  };

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleModerate = async (status: 'APPROVED' | 'REJECTED') => {
      if (!selectedService) return;
      if (status === 'REJECTED' && !rejectNote.trim()) {
          toast.error("Vui lòng nhập lý do từ chối để Doanh nghiệp sửa lại!");
          return;
      }

      setIsProcessing(true);
      const toastId = toast.loading(`Đang xử lý ${status === 'APPROVED' ? 'Duyệt' : 'Từ chối'}...`);

      try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`https://ai-health-share-backend.onrender.com/moderation/services/${selectedService.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
              body: JSON.stringify({ 
                  status: status, 
                  moderation_note: status === 'REJECTED' ? rejectNote.trim() : "" 
              })
          });
          
          const result = await res.json();
          if (result.status === "success") {
              toast.success(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} video thành công!`, { id: toastId });
              // Xóa video khỏi danh sách chờ
              setPendingServices(prev => prev.filter(s => s.id !== selectedService.id));
              closeModal();
          } else {
              throw new Error(result.detail || "Lỗi xử lý");
          }
      } catch (e: any) {
          toast.error(e.message, { id: toastId });
      } finally {
          setIsProcessing(false);
      }
  };

  const closeModal = () => {
      setSelectedService(null);
      setShowRejectInput(false);
      setRejectNote("");
  };

  if (isLoading || !isMounted) return <div className="h-[100dvh] bg-slate-50 dark:bg-black"></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* 1. LEFT SIDEBAR DESKTOP */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-10" onClick={() => router.push('/')}><h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer">AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button onClick={() => router.push('/moderator/profile')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><UserIcon size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Hồ sơ Cán bộ</span></button>
          
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold transition-all border border-blue-500/20 group">
            <div className="relative">
                <ShieldCheck size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                {pendingServices.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950"></span>}
            </div>
            <span className="text-sm tracking-wide">Duyệt Video</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN MODERATOR AREA */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Nút Sáng Tối & Thông báo */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
          <button className="relative w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            <Bell size={20}/>
            {hasNotification && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse"></span>}
          </button>
        </div>

        <div className="max-w-6xl mx-auto pt-24 pb-32 px-6 md:px-12">
            
            <div className="mb-10 animate-slide-up flex justify-between items-end">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">Hàng đợi Kiểm duyệt</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Danh sách các Video và Dịch vụ đang chờ quyết định của bạn.</p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 font-bold">
                    <Clock size={18}/>
                    <span>{pendingServices.length} đang chờ</span>
                </div>
            </div>

            {/* LƯỚI VIDEO CHỜ DUYỆT */}
            {pendingServices.length === 0 ? (
                <div className="glass-panel w-full p-16 flex flex-col items-center justify-center rounded-[3rem] border border-slate-200 dark:border-white/10 animate-fade-in text-center">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"><CheckCircle size={48} className="text-emerald-500" /></div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Tuyệt vời! Không còn gì để duyệt.</h3>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Tất cả video đã được xử lý xong. Hệ thống hiện đang an toàn.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                    {pendingServices.map((service, index) => (
                        <div key={service.id} onClick={() => setSelectedService(service)} className="glass-panel rounded-3xl p-5 bg-white/60 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-slate-200 dark:border-white/10 cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                            {/* Khung giả lập Thumbnail Video */}
                            <div className="w-full aspect-[4/3] bg-slate-800 dark:bg-zinc-900 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center">
                                {/* Dùng video mặc định để demo UI */}
                                <video src={`/video-${(index % 3) + 1}.mp4`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"><Play size={24} className="ml-1"/></div></div>
                                <div className="absolute top-3 left-3 px-2 py-1 bg-amber-500/90 text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-md">PENDING</div>
                            </div>
                            
                            {/* Thông tin đối tác */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
                                    {service.users?.avatar_url ? <img src={service.users.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={16} className="text-slate-400 dark:text-zinc-500"/>}
                                </div>
                                <div className="flex-1 truncate">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{service.users?.full_name || service.users?.email}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">{new Date(service.created_at).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>

                            {/* Thông tin dịch vụ */}
                            <h4 className="font-black text-lg text-slate-900 dark:text-white leading-tight mb-1 truncate">{service.service_name}</h4>
                            <p className="text-sm font-bold text-[#80BF84]">{service.price.toLocaleString()} VND</p>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* 3. MOBILE BOTTOM DOCK */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/moderator/profile')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><UserIcon size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /></button>
            <button className="relative text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors group">
                <ShieldCheck size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                {pendingServices.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950"></span>}
            </button>
          </div>
        </div>

      </div>

      {/* --- REVIEW MODAL (CỬA SỔ DUYỆT) --- */}
      {selectedService && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 md:p-8 pointer-events-auto">
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl transition-colors duration-500" onClick={closeModal}></div>
            
            <div className="relative w-full max-w-5xl max-h-[90vh] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-3xl rounded-[3rem] z-10 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col md:flex-row animate-slide-up">
                
                {/* Trái: Video Player (9:16) */}
                <div className="w-full md:w-1/2 bg-black h-[40vh] md:h-full relative flex items-center justify-center">
                    <video src={`/video-${(pendingServices.indexOf(selectedService) % 3) + 1}.mp4`} className="w-full h-full object-cover md:object-contain" autoPlay loop controls playsInline />
                    <button onClick={closeModal} className="md:hidden absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white"><X size={20}/></button>
                </div>

                {/* Phải: Chi tiết & Thao tác */}
                <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col h-full max-h-[50vh] md:max-h-full overflow-y-auto no-scrollbar">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
    {selectedService.users?.avatar_url ? (
        <img src={selectedService.users.avatar_url} className="w-full h-full object-cover"/>
    ) : (
        <UserIcon size={24} className="text-slate-400 dark:text-zinc-600" />
    )}
</div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedService.users?.full_name || "Partner"}</p>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">{selectedService.users?.email}</p>
                            </div>
                        </div>
                        <button onClick={closeModal} className="hidden md:flex text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white"><X size={24}/></button>
                    </div>

                    <div className="flex-1">
                        <div className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg mb-3">ĐANG CHỜ DUYỆT</div>
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 leading-tight">{selectedService.service_name}</h3>
                        <p className="text-2xl font-black text-[#80BF84] mb-6">{selectedService.price.toLocaleString()} VND</p>
                        
                        <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 mb-6">
                            <div className="flex items-center gap-2 mb-2 text-slate-700 dark:text-zinc-300 font-bold"><FileText size={18}/> Mô tả chi tiết:</div>
                            <p className="text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-wrap">{selectedService.description}</p>
                        </div>

                        {/* Input Lý do từ chối */}
                        {showRejectInput && (
                            <div className="mb-6 animate-fade-in">
                                <label className="flex items-center gap-2 text-sm font-bold text-rose-500 mb-2"><AlertTriangle size={16}/> Ghi chú Từ chối (Bắt buộc):</label>
                                <textarea rows={3} className="w-full p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none" placeholder="Video vi phạm chính sách số..." value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row gap-3">
                        {!showRejectInput ? (
                            <button onClick={() => setShowRejectInput(true)} className="flex-1 py-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 font-black rounded-2xl transition-colors flex items-center justify-center gap-2"><XCircle size={20}/> TỪ CHỐI</button>
                        ) : (
                            <button onClick={() => handleModerate('REJECTED')} disabled={isProcessing} className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2">{isProcessing ? "Đang xử lý..." : "XÁC NHẬN TỪ CHỐI"}</button>
                        )}
                        <button onClick={() => handleModerate('APPROVED')} disabled={isProcessing || showRejectInput} className={`flex-1 py-4 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${showRejectInput ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-zinc-800 text-slate-500' : 'bg-blue-600 text-white active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)]'}`}>
                            {isProcessing ? "Đang xử lý..." : <><CheckCircle size={20}/> PHÊ DUYỆT LÊN FEED</>}
                        </button>
                    </div>
                </div>

            </div>
        </div>
      )}

    </div>
  );
}