"use client";

import { useEffect, useState } from "react";
import { Wallet, ArrowDownToLine, History, LogOut, CheckCircle2, Clock } from "lucide-react";
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

  // --- STATE MODAL RÚT TIỀN ---
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
          toast.error("Vui lòng đăng nhập để truy cập Partner Portal!");
          router.push("/");
          return;
        }
        setUser(session.user);

        const res = await fetch(`https://ai-health-share-backend.onrender.com/wallets/${session.user.id}`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        
        if (!res.ok) throw new Error("Lỗi khi tải dữ liệu Ví");
        
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
      toast.error("Số tiền không hợp lệ!");
      return;
    }
    if (amount > wallet.balance) {
      toast.error("Số dư không đủ để rút!");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Đang gửi yêu cầu rút tiền...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập hết hạn!");

      const res = await fetch("https://ai-health-share-backend.onrender.com/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: amount,
          payout_info: { bank_name: bankName, account_number: accountNumber, account_name: accountName }
        })
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") throw new Error(data.detail || "Lỗi xử lý rút tiền");

      toast.success("Đã gửi yêu cầu rút tiền thành công! Admin sẽ sớm xét duyệt.", { id: toastId });
      setIsWithdrawModalOpen(false);
      setWallet(prev => ({ ...prev, balance: prev.balance - amount }));
      setWithdrawAmount("");
      
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI TỐI ƯU: LOADING SKELETON (Đã giữ nguyên từ Phase 3) ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-4 md:p-8 animate-pulse">
        <div className="flex justify-between items-center mb-8 bg-zinc-900/30 p-6 rounded-[2rem] border border-zinc-800/50">
          <div className="space-y-3"><div className="h-6 w-48 bg-zinc-800 rounded-lg"></div><div className="h-4 w-32 bg-zinc-800/50 rounded-lg"></div></div>
          <div className="h-10 w-28 bg-zinc-800 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900/30 p-6 rounded-[2rem] border border-zinc-800/50 h-48 flex flex-col justify-between"><div className="h-5 w-32 bg-zinc-800 rounded-lg"></div><div className="h-10 w-48 bg-zinc-800 rounded-lg"></div><div className="h-12 w-full bg-emerald-900/20 rounded-xl"></div></div>
          <div className="bg-zinc-900/30 p-6 rounded-[2rem] border border-zinc-800/50 h-48 flex flex-col justify-center gap-4"><div className="h-5 w-40 bg-zinc-800 rounded-lg"></div><div className="h-10 w-48 bg-zinc-800 rounded-lg"></div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 relative overflow-hidden">
      {/* Background Gradient siêu mượt */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 glass-panel p-5 md:p-6 rounded-[2rem]">
          <div>
            <h1 className="text-2xl font-bold tracking-wider">PARTNER<span className="text-emerald-400">PORTAL</span></h1>
            <p className="text-sm text-zinc-400 mt-1">Xin chào, <span className="text-white font-medium">{user?.email}</span></p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 rounded-2xl transition-all">
            <LogOut size={18} /> <span className="hidden md:inline font-medium">Đăng xuất</span>
          </button>
        </div>

        {/* DASHBOARD TÀI CHÍNH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Box Số Dư */}
          <div className="glass-panel p-6 md:p-8 rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700"><Wallet size={160} /></div>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none"></div>
            
            <div className="flex items-center gap-3 text-emerald-400 mb-4 relative z-10">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><Wallet size={20} /></div>
              <h3 className="font-semibold text-sm uppercase tracking-wider">Số dư khả dụng</h3>
            </div>
            
            <p className="text-4xl md:text-5xl font-black text-white mb-8 relative z-10 tracking-tight">
              {wallet.balance.toLocaleString()} <span className="text-xl text-emerald-400 font-medium">VND</span>
            </p>
            
            <button 
              onClick={() => setIsWithdrawModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] relative z-10"
            >
              <ArrowDownToLine size={20} /> Yêu cầu Rút tiền
            </button>
          </div>

          {/* Box Tổng Doanh Thu */}
          <div className="glass-panel p-6 md:p-8 rounded-[2rem] flex flex-col justify-center relative overflow-hidden">
            <h3 className="text-zinc-400 font-semibold mb-3 text-sm uppercase tracking-wider">Tổng doanh thu tích lũy (LTV)</h3>
            <p className="text-4xl font-bold text-white tracking-tight">
              {wallet.total_earned.toLocaleString()} <span className="text-xl text-zinc-500 font-medium">VND</span>
            </p>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mb-10"></div>
          </div>
        </div>

        {/* LỊCH SỬ GIAO DỊCH */}
        <div className="glass-panel p-6 md:p-8 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-zinc-800 rounded-xl"><History size={20} className="text-emerald-400" /></div>
            <h2 className="text-xl font-bold">Lịch sử giao dịch</h2>
          </div>
          
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-center text-zinc-500 py-10 font-medium">Hệ thống chưa ghi nhận giao dịch nào.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-4 md:p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full shadow-inner ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                      {tx.amount > 0 ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold text-white md:text-lg">
                        {tx.transaction_type === 'partner_revenue' ? 'Doanh thu dịch vụ' : 
                         tx.transaction_type === 'withdrawal_request' ? 'Rút tiền về thẻ' : 
                         tx.transaction_type === 'affiliate_commission' ? 'Hoa hồng Affiliate' : 'Hoàn tiền'}
                      </p>
                      <p className="text-xs md:text-sm text-zinc-500 mt-0.5">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <div className={`font-black md:text-lg tracking-tight ${tx.amount > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} đ
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL RÚT TIỀN (Apple Style) */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-lg sm:p-4 transition-opacity animate-fade-in">
          <div className="w-full max-w-md bg-zinc-950 sm:rounded-[2.5rem] rounded-t-[2.5rem] p-6 sm:p-8 border border-zinc-800/50 shadow-2xl animate-slide-up">
            
            <div className="mb-8 text-center relative">
               <div className="mx-auto w-12 h-1 bg-zinc-800 rounded-full mb-6 sm:hidden"></div> {/* Kéo để đóng trên Mobile */}
               <h3 className="text-2xl font-bold text-white tracking-tight">Rút Tiền Về Thẻ</h3>
               <p className="text-sm text-zinc-400 mt-2">Số dư khả dụng: <span className="text-emerald-400 font-bold">{wallet.balance.toLocaleString()} VND</span></p>
            </div>
            
            <form onSubmit={handleWithdraw} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Số tiền (VND)</label>
                <input 
                  type="number" required max={wallet.balance}
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-bold text-lg focus:border-emerald-500 focus:bg-zinc-900/50 focus:outline-none transition-all placeholder:font-normal placeholder:text-zinc-600"
                  value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Ngân hàng</label>
                <input 
                  type="text" required placeholder="VD: Vietcombank, MB Bank..."
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:border-emerald-500 focus:outline-none transition-all"
                  value={bankName} onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Số tài khoản</label>
                <input 
                  type="text" required placeholder="Nhập số tài khoản..."
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:border-emerald-500 focus:outline-none transition-all"
                  value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Tên chủ tài khoản</label>
                <input 
                  type="text" required placeholder="VIẾT HOA KHÔNG DẤU"
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white uppercase focus:border-emerald-500 focus:outline-none transition-all"
                  value={accountName} onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 mt-8">
                <button 
                  type="button" onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 active:scale-95 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit" disabled={isSubmitting}
                  className="flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận Rút"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}