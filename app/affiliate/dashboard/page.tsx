"use client";

import { useState } from "react";
import { Wallet, TrendingUp, History, Search, ArrowDownLeft, ArrowUpRight, CreditCard, X } from "lucide-react";

export default function AffiliateDashboard() {
  const [userId, setUserId] = useState("");
  const [walletData, setWalletData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // --- STATE CHO RÚT TIỀN ---
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankInfo, setBankInfo] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWallet = async () => {
    if (!userId.trim()) return;
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch(`https://ai-health-share-backend.onrender.com/wallets/${userId}`);
      const result = await res.json();
      
      if (res.ok && result.status === "success") {
        setWalletData(result.data);
      } else {
        setError("Không tìm thấy dữ liệu ví cho ID này.");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);

    if (amount <= 0 || amount > walletData.wallet.balance) {
      alert("Số tiền rút không hợp lệ hoặc vượt quá số dư khả dụng!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("https://ai-health-share-backend.onrender.com/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          amount: amount,
          payout_info: {
            bank_name: bankInfo.bankName,
            account_number: bankInfo.accountNumber,
            account_name: bankInfo.accountName.toUpperCase()
          }
        })
      });
      const data = await res.json();

      if (res.ok && data.status === "success") {
        alert("🎉 Yêu cầu rút tiền thành công! Đang chờ Admin phê duyệt.");
        setIsWithdrawModalOpen(false);
        setWithdrawAmount("");
        setBankInfo({ bankName: "", accountNumber: "", accountName: "" });
        fetchWallet(); // Lấy lại dữ liệu ví để update số dư ngay lập tức
      } else {
        alert(`Lỗi: ${data.detail || "Không thể tạo yêu cầu"}`);
      }
    } catch (err) {
      alert("Lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Affiliate & Wallet Dashboard
          </h1>
          <p className="text-zinc-400 mt-2">Theo dõi doanh thu tự động và yêu cầu rút tiền.</p>
        </div>

        {/* Khung Test: Nhập ID để xem Ví */}
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 mb-8 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="Nhập User ID để tra cứu số dư ví..." 
              className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-emerald-500 focus:outline-none"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchWallet}
            disabled={isLoading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {isLoading ? "Đang tải..." : "Tra cứu"}
          </button>
        </div>

        {error && <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}

        {/* Hiển thị Dữ liệu Ví */}
        {walletData && (
          <div className="space-y-6 animate-fade-in">
            {/* Thẻ Thống kê */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <Wallet className="text-emerald-400" />
                    <h3 className="font-semibold">Số dư khả dụng</h3>
                  </div>
                  {/* NÚT RÚT TIỀN */}
                  <button 
                    onClick={() => setIsWithdrawModalOpen(true)}
                    disabled={walletData.wallet.balance <= 0}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Rút tiền ngay
                  </button>
                </div>
                <p className="text-4xl font-bold text-white">
                  {walletData.wallet.balance.toLocaleString()} <span className="text-xl text-zinc-500">VND</span>
                </p>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                <div className="flex items-center gap-3 text-zinc-400 mb-4">
                  <TrendingUp className="text-teal-400" />
                  <h3 className="font-semibold">Tổng doanh thu tích lũy</h3>
                </div>
                <p className="text-4xl font-bold text-white">
                  {walletData.wallet.total_earned.toLocaleString()} <span className="text-xl text-zinc-500">VND</span>
                </p>
              </div>
            </div>

            {/* Bảng Lịch sử giao dịch */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl mt-8">
              <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
                <History className="text-zinc-400" />
                <h3 className="font-bold text-lg text-white">Lịch sử dòng tiền</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/50 text-zinc-400 text-sm border-b border-zinc-800">
                      <th className="p-4 font-medium">Thời gian</th>
                      <th className="p-4 font-medium">Loại giao dịch</th>
                      <th className="p-4 font-medium text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-zinc-800/50">
                    {walletData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-zinc-500">Chưa có giao dịch nào.</td>
                      </tr>
                    ) : (
                      walletData.transactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="p-4 text-zinc-400">
                            {new Date(tx.created_at).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-4">
                            {tx.transaction_type === 'affiliate_commission' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-medium">
                                <ArrowDownLeft size={14} /> Hoa hồng Affiliate
                              </span>
                            ) : tx.transaction_type === 'partner_revenue' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                                <ArrowUpRight size={14} /> Doanh thu Dịch vụ
                              </span>
                            ) : tx.transaction_type === 'withdrawal_request' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-medium">
                                <CreditCard size={14} /> Rút tiền về thẻ
                              </span>
                            ) : (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 text-xs font-medium">
                                Khác
                              </span>
                            )}
                          </td>
                          <td className={`p-4 text-right font-bold ${tx.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} VND
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RÚT TIỀN */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard className="text-emerald-400" /> Yêu cầu Rút tiền
                </h3>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-sm text-zinc-400">Số dư khả dụng hiện tại:</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{walletData?.wallet.balance.toLocaleString()} VND</p>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Số tiền muốn rút (VND)</label>
                  <input 
                    type="number" required min="10000" max={walletData?.wallet.balance}
                    placeholder="VD: 500000"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Ngân hàng thụ hưởng</label>
                  <input 
                    type="text" required placeholder="VD: Vietcombank, MB Bank..."
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    value={bankInfo.bankName} onChange={(e) => setBankInfo({...bankInfo, bankName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Số tài khoản</label>
                  <input 
                    type="text" required placeholder="Nhập số tài khoản..."
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    value={bankInfo.accountNumber} onChange={(e) => setBankInfo({...bankInfo, accountNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Tên chủ tài khoản</label>
                  <input 
                    type="text" required placeholder="VD: NGUYEN VAN A"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 uppercase"
                    value={bankInfo.accountName} onChange={(e) => setBankInfo({...bankInfo, accountName: e.target.value})}
                  />
                </div>
                
                <button 
                  type="submit" disabled={isSubmitting}
                  className="w-full py-4 mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận Rút tiền"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}