"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, Clock, LogOut, Home, Activity, Sparkles, X, Landmark, CheckCircle2 } from "lucide-react";
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

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 1. Lấy phiên đăng nhập hiện tại
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session) {
          toast.error("Vui lòng đăng nhập!");
          router.push("/");
          return;
        }

        // 2. 🚨 KIỂM TRA ROLE (RBAC) TỪ DATABASE
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError || profile?.role !== 'SUPER_ADMIN') {
          toast.error("Truy cập từ chối! Bạn không có quyền SUPER_ADMIN.");
          router.push("/");
          return;
        }

        // Đã xác thực thành công Role
        setUser(session.user);

        // 3. Fetch danh sách yêu cầu rút tiền
        const res = await fetch("https://ai-health-share-backend.onrender.com/admin/withdrawals", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });

        if (!res.ok) throw new Error("Không thể tải danh sách rút tiền");
        
        const data = await res.json();
        if (data.status === "success") {
          setRequests(data.data || []);
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleProcessRequest = async (requestId: string, action: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    const toastId = toast.loading("Đang xử lý yêu cầu...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập hết hạn!");

      const res = await fetch(`https://ai-health-share-backend.onrender.com/admin/withdraw/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: action })
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") throw new Error(data.detail || "Lỗi xử lý hệ thống");

      toast.success(action === "APPROVED" ? "Đã duyệt và ghi nhận chuyển tiền!" : "Đã từ chối và hoàn tiền lại ví!", { id: toastId });
      
      // Cập nhật lại UI không cần reload
      setRequests(requests.map(req => req.id === requestId ? { ...req, status: action } : req));
      
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-70"></div>
          <div className="absolute inset-2 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="text-white w-6 h-6 animate-pulse" />
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase animate-pulse">Khởi tạo không gian quản trị...</p>
      </div>
    );
  }

  // Phân loại mảng để PENDING luôn nổi lên trên cùng
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const processedRequests = requests.filter(r => r.status !== 'PENDING');
  const displayRequests = [...pendingRequests, ...processedRequests];

  return (
    <div className="h-[100dvh] bg-slate-50 overflow-hidden relative flex flex-col font-sans">
      
      {/* 1. KHU VỰC HEADER TỔNG QUAN (Apple Style - Top 25%) */}
      <div className="relative z-10 pt-12 pb-6 px-4 md:px-8 shrink-0 animate-slide-up">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[150%] max-w-4xl h-80 bg-gradient-to-b from-indigo-300/30 via-purple-300/10 to-transparent rounded-full blur-[80px] pointer-events-none -z-10"></div>
        
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Super Admin <ShieldCheck className="text-indigo-500 w-5 h-5" />
            </h1>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 bg-white/50 rounded-full transition-all active:scale-90 shadow-sm">
              <LogOut size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-4">
             <div className="glass-panel px-6 py-4 rounded-[2rem] flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chờ xử lý</p>
                <p className="text-3xl font-black text-slate-800">{pendingRequests.length} <span className="text-sm font-medium text-slate-500">lệnh</span></p>
             </div>
             <div className="glass-panel px-6 py-4 rounded-[2rem] flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Đã hoàn tất</p>
                <p className="text-3xl font-black text-slate-800">{processedRequests.length} <span className="text-sm font-medium text-slate-500">lệnh</span></p>
             </div>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC DANH SÁCH LỆNH RÚT TIỀN (Bottom 75% - Scrollable) */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 px-4 md:px-8 relative z-0">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 pl-2 sticky top-0 bg-slate-50/80 backdrop-blur-md py-2 z-10">Danh sách lệnh rút</h2>
          
          <div className="flex flex-col gap-4">
            {displayRequests.length === 0 ? (
              <div className="text-center py-12 bg-white/50 rounded-[2rem] border border-white/60 shadow-sm">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3"><Activity className="text-slate-400" /></div>
                <p className="text-slate-500 font-medium">Chưa có yêu cầu rút tiền nào.</p>
              </div>
            ) : (
              displayRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isApproved = req.status === 'APPROVED';
                const payout = req.payout_info || {};

                return (
                  <div key={req.id} className={`glass-card p-5 md:p-6 rounded-[2rem] border ${isPending ? 'border-indigo-100 shadow-indigo-900/5' : 'border-white/60 shadow-sm opacity-80'} transition-all`}>
                    
                    {/* Header Card: User ID và Trạng Thái */}
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200/50">
                      <div className="flex items-center gap-2">
                         <div className={`p-2 rounded-full ${isPending ? 'bg-indigo-50 text-indigo-500' : isApproved ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                           {isPending ? <Clock size={16} strokeWidth={3}/> : isApproved ? <CheckCircle2 size={16} strokeWidth={3}/> : <XCircle size={16} strokeWidth={3}/>}
                         </div>
                         <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã Đối tác</p>
                           <p className="text-xs font-mono text-slate-600 font-semibold">{req.user_id.substring(0, 13)}...</p>
                         </div>
                      </div>
                      
                      {/* Badge Trạng thái */}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                        isPending ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 
                        isApproved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
                        'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}>
                        {isPending ? 'CHỜ DUYỆT' : isApproved ? 'Đã Xử Lý' : 'TỪ CHỐI'}
                      </span>
                    </div>

                    {/* Body Card: Thông tin tài khoản & Số tiền */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
                       <div className="flex-1 w-full">
                          <p className="text-3xl font-black text-slate-800 tracking-tighter mb-4">
                            {req.amount.toLocaleString()} <span className="text-base text-slate-400 font-bold uppercase tracking-widest">VND</span>
                          </p>
                          
                          <div className="bg-white/60 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                             <Landmark size={18} className="text-slate-400 mt-0.5 shrink-0"/>
                             <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-700 truncate">{payout.bank_name || "N/A"}</p>
                                <p className="text-sm font-semibold text-slate-600 font-mono my-0.5">{payout.account_number || "N/A"}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{payout.account_name || "N/A"}</p>
                             </div>
                          </div>
                       </div>

                       {/* Action Buttons (Chỉ hiện khi PENDING) */}
                       {isPending && (
                         <div className="flex w-full md:w-auto md:flex-col gap-3 shrink-0">
                            <button 
                              onClick={() => handleProcessRequest(req.id, "APPROVED")}
                              disabled={processingId === req.id}
                              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-[#80BF84] text-white font-bold rounded-2xl hover:bg-[#6ca870] active:scale-95 transition-all shadow-lg shadow-[#80BF84]/30 disabled:opacity-50"
                            >
                              <CheckCircle size={18} strokeWidth={2.5}/> Duyệt
                            </button>
                            <button 
                              onClick={() => handleProcessRequest(req.id, "REJECTED")}
                              disabled={processingId === req.id}
                              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-rose-500 font-bold rounded-2xl border border-rose-100 hover:bg-rose-50 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                            >
                              <X size={18} strokeWidth={2.5}/> Từ chối
                            </button>
                         </div>
                       )}
                    </div>

                    <p className="text-[10px] text-slate-400 font-semibold mt-4 text-right">
                      Yêu cầu lúc: {new Date(req.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. FLOATING BOTTOM DOCK (Thanh điều hướng đáy) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
        <div className="glass-panel px-6 py-4 rounded-[2rem] flex items-center gap-8 shadow-2xl shadow-slate-900/10 border-white/80">
          <button onClick={() => router.push("/")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-800 transition-colors group">
            <Home size={22} className="group-hover:-translate-y-1 transition-transform" />
            <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 absolute -bottom-2 transition-opacity">Feed</span>
          </button>
          
          <div className="flex flex-col items-center gap-1 text-indigo-500 relative">
            <div className="absolute -top-10 bg-indigo-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldCheck size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold mt-5 tracking-wider">Hệ thống</span>
          </div>

          <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-800 transition-colors group">
            <LogOut size={22} className="group-hover:-translate-y-1 transition-transform" />
            <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 absolute -bottom-2 transition-opacity">Thoát</span>
          </button>
        </div>
      </div>

    </div>
  );
}