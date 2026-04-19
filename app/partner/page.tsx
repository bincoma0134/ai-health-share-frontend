"use client";

import { useEffect, useState } from "react";
// 🚨 FIX LỖI TẠI ĐÂY: Đã thêm `User as UserIcon` vào danh sách import
import { Wallet, ArrowDownToLine, LogOut, CheckCircle2, Clock, Home, Activity, Sparkles, X, Landmark, User as UserIcon } from "lucide-react";
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

export default function PartnerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState({ balance: 0, total_earned: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // --- STATE MODAL RÚT TIỀN ---
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
          toast.error("Vui lòng đăng nhập để truy cập Ví!");
          router.push("/");
          return;
        }
        setUser(session.user);

        const res = await fetch(`https://ai-health-share-backend.onrender.com/wallets/${session.user.id}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        
        if (!res.ok) throw new Error("Lỗi tải dữ liệu tài chính");
        
        const data = await res.json();
        if (data.status === "success") {
          setWallet(data.data.wallet || { balance: 0, total_earned: 0 });
          setTransactions(data.data.transactions || []);
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartnerData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Số tiền không hợp lệ!"); return;
    }
    if (amount > wallet.balance) {
      toast.error("Số dư không đủ để rút!"); return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Đang thiết lập lệnh chuyển tiền...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập hết hạn!");

      const res = await fetch("https://ai-health-share-backend.onrender.com/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          user_id: user.id,
          amount: amount,
          payout_info: { bank_name: bankName, account_number: accountNumber, account_name: accountName }
        })
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") throw new Error(data.detail || "Lỗi xử lý rút tiền");

      toast.success("Lệnh rút tiền đã được khởi tạo thành công!", { id: toastId });
      setIsWithdrawModalOpen(false);
      setWallet(prev => ({ ...prev, balance: prev.balance - amount }));
      setWithdrawAmount("");
      
      // Tải lại nhẹ lịch sử
      const txRes = await fetch(`https://ai-health-share-backend.onrender.com/wallets/${user.id}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const txData = await txRes.json();
      if (txData.status === "success") setTransactions(txData.data.transactions);

    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isMounted) return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div>
        <div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Sparkles className="text-white w-6 h-6 animate-pulse" />
        </div>
      </div>
      <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">
        Khơi nguồn sức sống...
      </p>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-slate-50 overflow-hidden relative flex flex-col font-sans">
      
      {/* 1. KHU VỰC THẺ VÍ (Apple Wallet Style - Top 40%) */}
      <div className="relative z-10 pt-12 pb-8 px-4 md:px-8 shrink-0 animate-slide-up">
        {/* Nền Gradient mờ phía sau thẻ */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] max-w-4xl h-80 bg-gradient-to-b from-[#80BF84]/30 via-[#99BFF2]/10 to-transparent rounded-full blur-[80px] pointer-events-none -z-10"></div>
        
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Ví của tôi <Sparkles className="text-[#80BF84] w-5 h-5" />
            </h1>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 bg-white/50 rounded-full transition-all active:scale-90 shadow-sm">
              <LogOut size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Thẻ Số Dư (Breathing Card) */}
          <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group">
            {/* Hiệu ứng kính ánh sáng lướt qua */}
            <div className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-45 translate-x-[-150%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              Số dư khả dụng 
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
            </p>
            <p className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter mb-8 drop-shadow-sm">
              {wallet.balance.toLocaleString()} <span className="text-xl text-slate-400 font-bold uppercase tracking-widest">VND</span>
            </p>

            <div className="flex justify-between items-center border-t border-white/60 pt-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tổng đã kiếm</p>
                <p className="text-sm font-bold text-slate-700">{wallet.total_earned.toLocaleString()} VND</p>
              </div>
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#26110F] text-white font-bold rounded-full hover:bg-[#80BF84] active:scale-95 transition-all shadow-lg shadow-slate-900/10"
              >
                Rút tiền <ArrowDownToLine size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC LỊCH SỬ GIAO DỊCH (Bottom 60% - Scrollable) */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 px-4 md:px-8 relative z-0">
        <div className="max-w-xl mx-auto">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 pl-2 sticky top-0 bg-slate-50/80 backdrop-blur-md py-2 z-10">Lịch sử giao dịch</h2>
          
          <div className="flex flex-col gap-3">
            {transactions.length === 0 ? (
              <div className="text-center py-10 bg-white/50 rounded-[2rem] border border-white/60 shadow-sm">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3"><Activity className="text-slate-400" /></div>
                <p className="text-slate-500 font-medium">Chưa có giao dịch nào.</p>
              </div>
            ) : (
              transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} className="glass-card p-4 rounded-3xl flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl shadow-inner ${isPositive ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'}`}>
                        {isPositive ? <CheckCircle2 size={22} strokeWidth={2.5} /> : <Clock size={22} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 md:text-lg">
                          {tx.transaction_type === 'partner_revenue' ? 'Doanh thu dịch vụ' : 
                           tx.transaction_type === 'withdrawal_request' ? 'Rút tiền về thẻ' : 
                           tx.transaction_type === 'affiliate_commission' ? 'Hoa hồng giới thiệu' : 'Hoàn tiền'}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    <div className={`font-black text-lg md:text-xl tracking-tight ${isPositive ? 'text-[#80BF84]' : 'text-slate-800'}`}>
                      {isPositive ? '+' : ''}{tx.amount.toLocaleString()} đ
                    </div>
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
          
          <div className="flex flex-col items-center gap-1 text-[#80BF84] relative">
            <div className="absolute -top-10 bg-[#80BF84] w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-[#80BF84]/30">
              <Wallet size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold mt-5 tracking-wider">Ví tiền</span>
          </div>

          <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-800 transition-colors group">
            <UserIcon size={22} className="group-hover:-translate-y-1 transition-transform" />
            <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 absolute -bottom-2 transition-opacity">Hồ sơ</span>
          </button>
        </div>
      </div>

      {/* --- MODAL RÚT TIỀN (Apple Action Sheet Style) --- */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-md" onClick={() => setIsWithdrawModalOpen(false)}></div>
          
          <div className="w-full sm:max-w-md glass-panel sm:rounded-[3rem] rounded-t-[2.5rem] rounded-b-none p-6 md:p-8 relative z-10 shadow-2xl animate-slide-up">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6 sm:hidden"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Rút tiền về thẻ</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">Khả dụng: <span className="text-[#80BF84]">{wallet.balance.toLocaleString()} VND</span></p>
              </div>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 bg-white/60 text-slate-500 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-2">Số tiền rút (VND)</label>
                <input 
                  type="number" required max={wallet.balance} placeholder="0"
                  className="w-full px-5 py-4 glass-input text-xl font-black text-[#80BF84]"
                  value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              
              <div className="glass-card p-4 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 mb-2 ml-2">
                  <Landmark size={16} className="text-slate-400"/>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thông tin thụ hưởng</span>
                </div>
                <input 
                  type="text" required placeholder="Ngân hàng (VD: Vietcombank)"
                  className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl focus:outline-none focus:border-[#80BF84] transition-colors text-sm font-semibold text-slate-700"
                  value={bankName} onChange={(e) => setBankName(e.target.value)}
                />
                <input 
                  type="text" required placeholder="Số tài khoản"
                  className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl focus:outline-none focus:border-[#80BF84] transition-colors text-sm font-semibold text-slate-700"
                  value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                />
                <input 
                  type="text" required placeholder="TÊN CHỦ TÀI KHOẢN (VIẾT HOA)"
                  className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl focus:outline-none focus:border-[#80BF84] uppercase transition-colors text-sm font-bold text-slate-700"
                  value={accountName} onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              
              <button 
                type="submit" disabled={isSubmitting}
                className="w-full py-4 mt-2 bg-[#26110F] text-white font-bold text-lg rounded-2xl hover:bg-[#80BF84] active:scale-95 transition-all disabled:opacity-50 shadow-lg"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận Rút"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}