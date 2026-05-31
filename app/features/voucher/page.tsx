"use client";

import { useEffect, useState } from "react";
import { useVoucherStore } from "@/store/useVoucherStore";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { Ticket, CheckCircle2, Lock, AlertCircle, ShoppingBag } from "lucide-react";

export default function VoucherPage() {
  const { user } = useAuth();
  const { setIsAuthModalOpen } = useUI();
  const { publicVouchers, myVouchers, isLoading, fetchPublicVouchers, claimVoucher } = useVoucherStore();
  const [activeTab, setActiveTab] = useState<"PUBLIC" | "WALLET">("PUBLIC");

  useEffect(() => {
    fetchPublicVouchers();
  }, [fetchPublicVouchers]);

  const handleClaim = async (code: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const token = localStorage.getItem("ai-health-token") || "";
    await claimVoucher(code, token);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-white p-4 md:p-8 animate-fade-in pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & TABS */}
        <div className="mb-8">
          <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent mb-6">
            Trung Tâm Ưu Đãi
          </h1>
          <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 pb-1">
            <button 
              onClick={() => setActiveTab("PUBLIC")}
              className={`pb-3 font-bold px-2 transition-all ${activeTab === "PUBLIC" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-white"}`}
            >
              Săn Mã Đỉnh
            </button>
            <button 
              onClick={() => { if(!user) setIsAuthModalOpen(true); else setActiveTab("WALLET"); }}
              className={`pb-3 font-bold px-2 transition-all flex items-center gap-2 ${activeTab === "WALLET" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-white"}`}
            >
              Ví Của Tôi 
              {user && myVouchers.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">{myVouchers.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        {isLoading && activeTab === "PUBLIC" ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* TAB PUBLIC (KHO MÃ) */}
            {activeTab === "PUBLIC" && publicVouchers.map((v: any) => {
              const isClaimed = myVouchers.some(myV => myV.id === v.id);
              return (
                <div key={v.id} className="glass-panel p-5 rounded-3xl flex gap-4 items-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Ticket className="text-emerald-500 w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-lg">{v.discount_type === 'PERCENTAGE' ? `Giảm ${v.discount_value}%` : `Giảm ${v.discount_value.toLocaleString()}đ`}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Đơn tối thiểu {v.min_order_value.toLocaleString()}đ</p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-2">HSD: {formatDate(v.valid_until)}</p>
                  </div>
                  <button 
                    onClick={() => handleClaim(v.code)}
                    disabled={isClaimed}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isClaimed ? 'bg-slate-200 dark:bg-white/10 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'}`}
                  >
                    {isClaimed ? 'Đã Lưu' : 'Lưu Ngay'}
                  </button>
                </div>
              );
            })}

            {/* TAB WALLET (VÍ CỦA TÔI) */}
            {activeTab === "WALLET" && myVouchers.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-20 opacity-50">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                <p className="font-bold">Ví bạn đang trống. Hãy ra ngoài săn mã nhé!</p>
              </div>
            )}

            {activeTab === "WALLET" && myVouchers.map((v: any) => (
              <div key={v.user_voucher_id} className={`glass-panel p-5 rounded-3xl flex gap-4 items-center border-l-4 ${v.wallet_status === 'UNUSED' ? 'border-l-emerald-500' : v.wallet_status === 'LOCKED' ? 'border-l-amber-500 opacity-70' : 'border-l-slate-400 opacity-40 grayscale'}`}>
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  {v.wallet_status === 'UNUSED' ? <CheckCircle2 className="text-emerald-500 w-8 h-8" /> : v.wallet_status === 'LOCKED' ? <Lock className="text-amber-500 w-8 h-8" /> : <AlertCircle className="text-slate-400 w-8 h-8" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg">{v.discount_type === 'PERCENTAGE' ? `Giảm ${v.discount_value}%` : `Giảm ${v.discount_value.toLocaleString()}đ`}</h3>
                  <div className="inline-block px-2 py-1 bg-slate-200 dark:bg-white/10 rounded font-mono text-xs font-bold mt-1 mb-2">{v.code}</div>
                  <p className="text-[10px] font-bold text-slate-500">
                    {v.wallet_status === 'UNUSED' ? `Dùng trước: ${formatDate(v.valid_until)}` : v.wallet_status === 'LOCKED' ? 'Đang kẹt trong giao dịch' : 'Đã sử dụng'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}