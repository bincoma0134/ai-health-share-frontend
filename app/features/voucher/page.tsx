"use client";

import { useEffect, useState } from "react";
import { useVoucherStore } from "@/store/useVoucherStore";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { Ticket, CheckCircle2, Lock, AlertCircle, ShoppingBag, Crown, Store, Clock, Zap } from "lucide-react";

export default function VoucherPage() {
  const { user } = useAuth();
  const { setIsAuthModalOpen } = useUI() as any;
  const { publicVouchers, myVouchers, isLoading, fetchPublicVouchers, claimVoucher } = useVoucherStore();
  const [activeTab, setActiveTab] = useState<"PUBLIC" | "WALLET">("PUBLIC");

  useEffect(() => {
    fetchPublicVouchers();
  }, [fetchPublicVouchers]);

  // Luồng đồng bộ trạng thái Ví (Self-healing state)
  // Lắng nghe sự xuất hiện của User (sau khi AuthContext lấy Profile xong)
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("ai-health-token");
      if (token) {
        useVoucherStore.getState().fetchMyVouchers(token);
      }
    } else {
      // Nếu không có user (đăng xuất), xóa sạch ví trên giao diện
      useVoucherStore.getState().clearVouchers();
    }
  }, [user]); // Bất cứ khi nào object 'user' thay đổi, useEffect này sẽ chạy lại

  const handleClaim = async (code: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const token = localStorage.getItem("ai-health-token") || "";
    await claimVoucher(code, token);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');
  
  // Hàm tính toán hiệu ứng FOMO
  const getFomoDetails = (validUntil: string, used: number, total: number) => {
    const percent = Math.min(100, Math.round((used / total) * 100));
    const isRunningOut = percent >= 80;
    const daysLeft = Math.ceil((new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    const isExpiring = daysLeft <= 3;
    return { percent, isRunningOut, daysLeft, isExpiring };
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-white p-4 md:p-8 animate-fade-in pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & TABS */}
        <div className="mb-8 relative z-10">
          <h1 className="text-3xl font-black bg-gradient-to-r from-[#80BF84] to-emerald-400 bg-clip-text text-transparent mb-6 flex items-center gap-3">
            <SparklesIcon /> Trung Tâm Ưu Đãi
          </h1>
          <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 pb-1">
            <button 
              onClick={() => setActiveTab("PUBLIC")}
              className={`pb-3 font-bold px-2 transition-all ${activeTab === "PUBLIC" ? "text-[#80BF84] border-b-2 border-[#80BF84]" : "text-slate-500 hover:text-slate-700 dark:hover:text-white"}`}
            >
              Săn Mã Đỉnh
            </button>
            <button 
              onClick={() => { if(!user) setIsAuthModalOpen(true); else setActiveTab("WALLET"); }}
              className={`pb-3 font-bold px-2 transition-all flex items-center gap-2 ${activeTab === "WALLET" ? "text-[#80BF84] border-b-2 border-[#80BF84]" : "text-slate-500 hover:text-slate-700 dark:hover:text-white"}`}
            >
              Ví Của Tôi 
              {user && myVouchers.length > 0 && (
                <span className="bg-[#80BF84] text-zinc-900 text-[10px] px-2 py-0.5 rounded-full font-black">{myVouchers.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        {isLoading && activeTab === "PUBLIC" ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#80BF84] border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* ========================================== */}
            {/* TAB PUBLIC (KHO MÃ) - GAMIFICATION & FOMO */}
            {/* ========================================== */}
            {activeTab === "PUBLIC" && publicVouchers.map((v: any) => {
              const isClaimed = myVouchers.some(myV => myV.voucher_id === v.id || myV.id === v.id);
              const isAdmin = v.issuer_type === 'ADMIN';
              const fomo = getFomoDetails(v.valid_until, v.used_quantity, v.total_quantity);
              
              return (
                <div key={v.id} className={`p-5 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border backdrop-blur-xl
                  ${isAdmin 
                    ? 'bg-gradient-to-br from-amber-500/10 to-amber-200/5 border-amber-500/30 shadow-[0_10px_30px_rgba(245,158,11,0.1)]' 
                    : 'bg-white/60 dark:bg-white/[0.02] border-white dark:border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.04)]'}
                `}>
                  {/* Ribbon Độc quyền */}
                  {isAdmin && (
                    <div className="absolute -right-12 top-6 bg-amber-500 text-zinc-900 text-[9px] font-black tracking-widest uppercase py-1 px-12 rotate-45 shadow-lg">
                      Độc quyền
                    </div>
                  )}

                  <div className="flex gap-4 items-center">
                    {/* Icon Hình Trụ */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isAdmin ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-white/5 text-[#80BF84]'}`}>
                      {isAdmin ? <Crown className="w-8 h-8" /> : <Store className="w-8 h-8" />}
                    </div>
                    
                    {/* Thông tin cốt lõi */}
                    <div className="flex-1 pr-4">
                      <h3 className="font-black text-xl tracking-tight leading-none mb-1.5">
                        {v.discount_type === 'PERCENTAGE' ? `Giảm ${v.discount_value}%` : `Giảm ${(v.discount_value / 1000)}K`}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Đơn tối thiểu {v.min_order_value.toLocaleString()}đ</p>
                      {v.max_discount_amount && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Tối đa {v.max_discount_amount.toLocaleString()}đ</p>
                      )}
                    </div>
                  </div>

                  {/* Đường cắt Ticket rãnh cưa */}
                  <div className="w-full flex items-center gap-2">
                    <div className="w-2 h-4 rounded-r-full bg-slate-50 dark:bg-[#09090b] -ml-5 border-y border-r border-inherit"></div>
                    <div className="flex-1 border-t-2 border-dashed border-slate-200 dark:border-zinc-800 opacity-60"></div>
                    <div className="w-2 h-4 rounded-l-full bg-slate-50 dark:bg-[#09090b] -mr-5 border-y border-l border-inherit"></div>
                  </div>

                  {/* Thanh Tiến Trình & Nút Bấm */}
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Zap size={10} className={fomo.isRunningOut ? "text-rose-500" : "text-amber-500"}/> 
                          Đã dùng {fomo.percent}%
                        </span>
                        {fomo.isExpiring && <span className="text-rose-500 animate-pulse flex items-center gap-1"><Clock size={10}/> Còn {fomo.daysLeft} ngày</span>}
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${fomo.isRunningOut ? 'bg-rose-500' : 'bg-gradient-to-r from-[#80BF84] to-emerald-400'}`} 
                          style={{ width: `${fomo.percent}%` }}
                        ></div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleClaim(v.code)}
                      disabled={isClaimed}
                      className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 active:scale-95 ${
                        isClaimed 
                        ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed' 
                        : isAdmin 
                          ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400 shadow-[0_5px_15px_rgba(245,158,11,0.3)] hover:-translate-y-0.5' 
                          : 'bg-[#80BF84] text-zinc-900 hover:bg-emerald-400 shadow-[0_5px_15px_rgba(128,191,132,0.3)] hover:-translate-y-0.5'
                      }`}
                    >
                      {isClaimed ? 'ĐÃ LƯU' : 'LƯU MÃ'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ========================================== */}
            {/* TAB WALLET (VÍ CỦA TÔI) - PHÂN LOẠI RÕ RÀNG */}
            {/* ========================================== */}
            {activeTab === "WALLET" && myVouchers.length === 0 && (
              <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-20 opacity-60">
                <div className="w-20 h-20 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-bold text-lg">Ví của bạn đang trống</p>
                <p className="text-sm text-slate-500">Hãy ra ngoài săn những ưu đãi độc quyền nhé!</p>
              </div>
            )}

            {activeTab === "WALLET" && myVouchers.map((v: any) => {
              const isLocked = v.wallet_status === 'LOCKED';
              const isUsed = v.wallet_status === 'USED';
              const isUnused = v.wallet_status === 'UNUSED';
              
              return (
                <div key={v.user_voucher_id} className={`p-5 rounded-[2rem] flex gap-4 items-center transition-all border
                  ${isUnused ? 'bg-white/60 dark:bg-white/[0.02] border-l-4 border-l-[#80BF84] border-white/50 dark:border-white/10 shadow-sm' 
                  : isLocked ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-500 border-amber-500/20 opacity-90' 
                  : 'bg-slate-50 dark:bg-zinc-900 border-l-4 border-l-slate-400 border-transparent grayscale opacity-50'}
                `}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 
                    ${isUnused ? 'bg-slate-100 dark:bg-zinc-800' : isLocked ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-slate-200 dark:bg-zinc-800'}
                  `}>
                    {isUnused ? <Ticket className="text-[#80BF84] w-6 h-6" /> : isLocked ? <Lock className="text-amber-500 w-6 h-6" /> : <CheckCircle2 className="text-slate-400 w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-black text-lg">
                      {v.discount_type === 'PERCENTAGE' ? `Giảm ${v.discount_value}%` : `Giảm ${(v.discount_value / 1000)}K`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-200 dark:bg-zinc-800 rounded text-[10px] font-mono font-black tracking-widest">{v.code}</span>
                      {v.issuer_type === 'ADMIN' && <Crown size={12} className="text-amber-500"/>}
                    </div>
                    <p className={`text-[10px] font-bold mt-2 ${isLocked ? 'text-amber-600' : 'text-slate-500'}`}>
                      {isUnused ? `Dùng trước: ${formatDate(v.valid_until)}` : isLocked ? 'Đang kẹt trong giao dịch' : 'Đã sử dụng / Hết hạn'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Mini Component Icon
function SparklesIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#80BF84] to-emerald-500 flex items-center justify-center shadow-lg shadow-[#80BF84]/30">
      <Ticket className="w-4 h-4 text-zinc-900" />
    </div>
  );
}