"use client";

import { useEffect, useState } from "react";
import { Wallet, ArrowDownToLine, History, LogOut, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- KHỞI TẠO SUPABASE CLIENT (Dùng ANON_KEY ở Frontend) ---
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

  // --- KIỂM TRA BẢO MẬT & FETCH DATA ---
  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        // 1. Kiểm tra "Thẻ từ" (JWT)
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
          toast.error("Vui lòng đăng nhập để truy cập Partner Portal!");
          router.push("/");
          return;
        }
        setUser(session.user);

        // 2. Gọi API lấy dữ liệu Ví (Kẹp JWT theo đúng nguyên tắc)
        const res = await fetch(`https://ai-health-share-backend.onrender.com/wallets/${session.user.id}`, {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
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

  // --- XỬ LÝ ĐĂNG XUẤT ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // --- XỬ LÝ GỬI YÊU CẦU RÚT TIỀN ---
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
          payout_info: {
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountName
          }
        })
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.detail || "Lỗi xử lý rút tiền");
      }

      toast.success("Đã gửi yêu cầu rút tiền thành công! Admin sẽ sớm xét duyệt.", { id: toastId });
      setIsWithdrawModalOpen(false);
      
      // Trừ trực tiếp trên giao diện để có cảm giác real-time
      setWallet(prev => ({ ...prev, balance: prev.balance - amount }));
      setWithdrawAmount("");
      
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI TỐI ƯU: LOADING SKELETON ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-4 md:p-8 animate-pulse">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center mb-8 bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50">
          <div className="space-y-3">
            <div className="h-6 w-48 bg-zinc-800 rounded-lg"></div>
            <div className="h-4 w-32 bg-zinc-800/50 rounded-lg"></div>
          </div>
          <div className="h-10 w-28 bg-zinc-800 rounded-xl"></div>
        </div>

        {/* Skeleton Box Tài chính */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 h-48 flex flex-col justify-between">
            <div className="h-5 w-32 bg-zinc-800 rounded-lg"></div>
            <div className="h-10 w-48 bg-zinc-800 rounded-lg"></div>
            <div className="h-12 w-full bg-emerald-900/20 rounded-xl"></div>
          </div>
          <div className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 h-48 flex flex-col justify-center gap-4">
            <div className="h-5 w-40 bg-zinc-800 rounded-lg"></div>
            <div className="h-10 w-48 bg-zinc-800 rounded-lg"></div>
          </div>
        </div>

        {/* Skeleton Danh sách */}
        <div className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 space-y-4">
          <div className="h-6 w-40 bg-zinc-800 rounded-lg mb-6"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-4 bg-zinc-950/50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-zinc-800 rounded"></div>
                  <div className="h-3 w-24 bg-zinc-800/50 rounded"></div>
                </div>
              </div>
              <div className="h-5 w-24 bg-zinc-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      {/* HEADER TÁCH BIỆT */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900/50 p-4 md:p-6 rounded-2xl border border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">PARTNER<span className="text-emerald-400">PORTAL</span></h1>
          <p className="text-sm text-zinc-400 mt-1">Xin chào, <span className="text-white">{user?.email}</span></p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition">
          <LogOut size={18} /> <span className="hidden md:inline">Đăng xuất</span>
        </button>
      </div>

      {/* DASHBOARD TÀI CHÍNH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Box Số Dư */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-zinc-900 p-6 rounded-3xl border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5"><Wallet size={120} /></div>
          <div className="flex items-center gap-3 text-emerald-400 mb-2 relative z-10">
            <Wallet size={24} />
            <h3 className="font-semibold">Số dư khả dụng</h3>
          </div>
          <p className="text-4xl font-bold text-white mb-6 relative z-10">
            {wallet.balance.toLocaleString()} <span className="text-xl text-emerald-400 font-medium">VND</span>
          </p>
          <button 
            onClick={() => setIsWithdrawModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition relative z-10"
          >
            <ArrowDownToLine size={20} /> Yêu cầu Rút tiền
          </button>
        </div>

        {/* Box Tổng Doanh Thu */}
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 flex flex-col justify-center">
          <h3 className="text-zinc-400 font-semibold mb-2">Tổng doanh thu tích lũy (LTV)</h3>
          <p className="text-3xl font-bold text-white">
            {wallet.total_earned.toLocaleString()} <span className="text-lg text-zinc-500 font-medium">VND</span>
          </p>
        </div>
      </div>

      {/* LỊCH SỬ BIẾN ĐỘNG (DÒNG TIỀN) */}
      <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <History className="text-emerald-400" />
          <h2 className="text-xl font-bold">Lịch sử giao dịch</h2>
        </div>
        
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">Bạn chưa có giao dịch nào phát sinh.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-4 bg-zinc-950 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {tx.amount > 0 ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {tx.transaction_type === 'partner_revenue' ? 'Doanh thu dịch vụ' : 
                       tx.transaction_type === 'withdrawal_request' ? 'Rút tiền về thẻ' : 
                       tx.transaction_type === 'affiliate_commission' ? 'Hoa hồng Affiliate' : 'Hoàn tiền'}
                    </p>
                    <p className="text-xs text-zinc-500">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
                <div className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} đ
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL NHẬP THÔNG TIN RÚT TIỀN */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 rounded-3xl p-6 border border-zinc-800 animate-slide-up">
            <h3 className="text-2xl font-bold text-white mb-6">Rút Tiền Về Ngân Hàng</h3>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Số tiền muốn rút (VND)</label>
                <input 
                  type="number" required max={wallet.balance}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Tối đa khả dụng: ${wallet.balance.toLocaleString()}`}
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Ngân hàng thụ hưởng</label>
                <input 
                  type="text" required placeholder="VD: Vietcombank, MB Bank..."
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  value={bankName} onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Số tài khoản</label>
                <input 
                  type="text" required placeholder="Nhập số tài khoản..."
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tên chủ tài khoản</label>
                <input 
                  type="text" required placeholder="VIẾT HOA KHÔNG DẤU"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white uppercase focus:border-emerald-500 focus:outline-none"
                  value={accountName} onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  type="button" onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition"
                >
                  Hủy
                </button>
                <button 
                  type="submit" disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition disabled:opacity-50"
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