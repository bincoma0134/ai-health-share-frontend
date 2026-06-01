"use client";

import { useEffect, useState } from "react";
import { useVoucherStore } from "@/store/useVoucherStore";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { Ticket, CheckCircle2, Lock, AlertCircle, ShoppingBag, Crown, Store, Clock, Zap, X, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation"; // Thêm router để điều hướng

export default function VoucherPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setIsAuthModalOpen } = useUI() as any;
  const { publicVouchers, myVouchers, isLoading, fetchPublicVouchers, claimVoucher } = useVoucherStore();
  const [activeTab, setActiveTab] = useState<"PUBLIC" | "WALLET">("PUBLIC");
  
  // State quản lý Pop-up Modal
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);

  useEffect(() => {
    fetchPublicVouchers();
  }, [fetchPublicVouchers]);

  // VÁ LỖI TURN TRƯỚC: Luồng đồng bộ trạng thái Ví (Self-healing state)
  // Đảm bảo khi F5, giao diện tự động đi lấy Ví về nếu đã đăng nhập
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("ai-health-token");
      if (token) {
        useVoucherStore.getState().fetchMyVouchers(token);
      }
    } else {
      useVoucherStore.getState().clearVouchers();
    }
  }, [user]);

  const handleClaim = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation(); // Chặn sự kiện click nảy sang thẻ Card bên dưới
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const token = localStorage.getItem("ai-health-token") || "";
    await claimVoucher(code, token);
  };

  // Hàm xử lý điều hướng chuẩn xác khi bấm nút "Áp dụng"
  const handleUseVoucher = (voucher: any) => {
    setSelectedVoucher(null); // Đóng pop-up
    if (voucher.issuer_type === 'ADMIN') {
      router.push('/features/explore'); // Mã toàn sàn -> Đi ra chợ tổng
    } else {
      // Dẫn link chuẩn cấp 1 theo username (VD: /partner03)
      const targetUrl = voucher.partner_username ? `/${voucher.partner_username}` : `/${voucher.issuer_id}`;
      router.push(targetUrl);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');
  
  const getFomoDetails = (validUntil: string, used: number, total: number) => {
    const percent = Math.min(100, Math.round((used / total) * 100));
    const isRunningOut = percent >= 80;
    const daysLeft = Math.ceil((new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    const isExpiring = daysLeft <= 3;
    return { percent, isRunningOut, daysLeft, isExpiring };
  };

  return (
    <div className="h-[100dvh] md:h-full overflow-y-auto no-scrollbar bg-brand-base dark:bg-[#09090b] text-slate-900 dark:text-white p-4 md:p-8 animate-fade-in pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & TABS */}
        <div className="mb-8 relative z-10">
          <h1 className="text-3xl font-black bg-gradient-to-r from-brand-primary to-brand-primary bg-clip-text text-transparent mb-6 flex items-center gap-3">
            <SparklesIcon /> Trung Tâm Ưu Đãi
          </h1>
          <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 pb-1">
            <button 
              onClick={() => setActiveTab("PUBLIC")}
              className={`pb-3 font-bold px-2 transition-all ${activeTab === "PUBLIC" ? "text-brand-primary border-b-2 border-brand-primary" : "text-brand-base0 hover:text-slate-700 dark:hover:text-white"}`}
            >
              Săn Mã Đỉnh
            </button>
            <button 
              onClick={() => { if(!user) setIsAuthModalOpen(true); else setActiveTab("WALLET"); }}
              className={`pb-3 font-bold px-2 transition-all flex items-center gap-2 ${activeTab === "WALLET" ? "text-brand-primary border-b-2 border-brand-primary" : "text-brand-base0 hover:text-slate-700 dark:hover:text-white"}`}
            >
              Ví Của Tôi 
              {user && myVouchers.length > 0 && (
                <span className="bg-brand-primary text-zinc-900 text-[10px] px-2 py-0.5 rounded-full font-black">{myVouchers.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        {isLoading && activeTab === "PUBLIC" ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* TAB PUBLIC (KHO MÃ) */}
            {activeTab === "PUBLIC" && publicVouchers.map((v: any) => {
              const isClaimed = myVouchers.some(myV => myV.voucher_id === v.id || myV.id === v.id);
              const isAdmin = v.issuer_type === 'ADMIN';
              const fomo = getFomoDetails(v.valid_until, v.used_quantity, v.total_quantity);
              
              return (
                <div 
                  key={v.id} 
                  onClick={() => setSelectedVoucher(v)} // Bấm vào Card để mở Modal
                  className={`p-5 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border backdrop-blur-xl cursor-pointer
                  ${isAdmin 
                    ? 'bg-gradient-to-br from-amber-500/10 to-amber-200/5 border-amber-500/30 shadow-[0_10px_30px_rgba(245,158,11,0.1)]' 
                    : 'bg-white/60 dark:bg-white/[0.02] border-white dark:border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.04)]'}
                `}>
                  {isAdmin && (
                    <div className="absolute -right-12 top-6 bg-amber-500 text-zinc-900 text-[9px] font-black tracking-widest uppercase py-1 px-12 rotate-45 shadow-lg">
                      Độc quyền
                    </div>
                  )}

                  <div className="flex gap-4 items-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isAdmin ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-white/5 text-brand-primary'}`}>
                      {isAdmin ? <Crown className="w-8 h-8" /> : <Store className="w-8 h-8" />}
                    </div>
                    
                    <div className="flex-1 pr-4">
                      <div className="mb-2">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-black rounded uppercase tracking-wider border border-amber-500/20">
                            <Crown size={10}/> Mã Toàn Sàn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-primary/10 text-emerald-700 dark:text-brand-primary text-[10px] font-black rounded uppercase tracking-wider border border-brand-primary/30">
                            <Store size={10}/> {v.partner_name || "Mã Cơ Sở"}
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-xl tracking-tight leading-none mb-1.5">
                        {v.discount_type === 'PERCENTAGE' ? `Giảm ${v.discount_value}%` : `Giảm ${(v.discount_value / 1000)}K`}
                      </h3>
                      <p className="text-xs text-brand-base0 dark:text-zinc-400 font-medium">Đơn tối thiểu {v.min_order_value.toLocaleString()}đ</p>
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-2">
                    <div className="w-2 h-4 rounded-r-full bg-brand-base dark:bg-[#09090b] -ml-5 border-y border-r border-inherit"></div>
                    <div className="flex-1 border-t-2 border-dashed border-slate-200 dark:border-zinc-800 opacity-60"></div>
                    <div className="w-2 h-4 rounded-l-full bg-brand-base dark:bg-[#09090b] -mr-5 border-y border-l border-inherit"></div>
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-brand-base0 flex items-center gap-1">
                          <Zap size={10} className={fomo.isRunningOut ? "text-rose-500" : "text-amber-500"}/> 
                          Đã dùng {fomo.percent}%
                        </span>
                        {fomo.isExpiring && <span className="text-rose-500 animate-pulse flex items-center gap-1"><Clock size={10}/> Còn {fomo.daysLeft} ngày</span>}
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${fomo.isRunningOut ? 'bg-rose-500' : 'bg-gradient-to-r from-brand-primary to-brand-primary'}`} 
                          style={{ width: `${fomo.percent}%` }}
                        ></div>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => handleClaim(e, v.code)}
                      disabled={isClaimed}
                      className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 active:scale-95 z-10 ${
                        isClaimed 
                        ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed' 
                        : isAdmin 
                          ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400 shadow-[0_5px_15px_rgba(245,158,11,0.3)] hover:-translate-y-0.5' 
                          : 'bg-brand-primary text-zinc-900 hover:bg-brand-primary shadow-[0_5px_15px_rgba(128,191,132,0.3)] hover:-translate-y-0.5'
                      }`}
                    >
                      {isClaimed ? 'ĐÃ LƯU' : 'LƯU MÃ'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* TAB WALLET (VÍ CỦA TÔI) */}
            {activeTab === "WALLET" && myVouchers.length === 0 && (
              <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-20 opacity-60">
                <div className="w-20 h-20 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-bold text-lg">Ví của bạn đang trống</p>
                <p className="text-sm text-brand-base0">Hãy ra ngoài săn những ưu đãi độc quyền nhé!</p>
              </div>
            )}

            {activeTab === "WALLET" && myVouchers.map((v: any) => {
              const isLocked = v.wallet_status === 'LOCKED';
              const isUsed = v.wallet_status === 'USED';
              const isUnused = v.wallet_status === 'UNUSED';
              
              return (
                <div 
                  key={v.user_voucher_id} 
                  onClick={() => setSelectedVoucher(v)} // Bấm vào Ví cũng mở Modal
                  className={`p-5 rounded-[2rem] flex gap-4 items-center transition-all border cursor-pointer hover:scale-[1.02]
                  ${isUnused ? 'bg-white/60 dark:bg-white/[0.02] border-l-4 border-l-brand-primary border-white/50 dark:border-white/10 shadow-sm' 
                  : isLocked ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-500 border-amber-500/20 opacity-90' 
                  : 'bg-brand-base dark:bg-zinc-900 border-l-4 border-l-slate-400 border-transparent grayscale opacity-50'}
                `}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 
                    ${isUnused ? 'bg-slate-100 dark:bg-zinc-800' : isLocked ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-slate-200 dark:bg-zinc-800'}
                  `}>
                    {isUnused ? <Ticket className="text-brand-primary w-6 h-6" /> : isLocked ? <Lock className="text-amber-500 w-6 h-6" /> : <CheckCircle2 className="text-slate-400 w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-black text-lg">
                      {v.discount_type === 'PERCENTAGE' ? `Giảm ${v.discount_value}%` : `Giảm ${(v.discount_value / 1000)}K`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-200 dark:bg-zinc-800 rounded text-[10px] font-mono font-black tracking-widest">{v.code}</span>
                      {v.issuer_type === 'ADMIN' && <Crown size={12} className="text-amber-500"/>}
                    </div>
                    <p className={`text-[10px] font-bold mt-2 ${isLocked ? 'text-amber-600' : 'text-brand-base0'}`}>
                      {isUnused ? `Dùng trước: ${formatDate(v.valid_until)}` : isLocked ? 'Đang kẹt trong giao dịch' : 'Đã sử dụng / Hết hạn'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* POP-UP CHI TIẾT VOUCHER & ĐIỀU HƯỚNG */}
      {/* ========================================== */}
      {selectedVoucher && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in" onClick={() => setSelectedVoucher(null)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] z-[101] animate-slide-up overflow-hidden border border-slate-200 dark:border-white/10 p-6 pt-8 text-center">
            
            <button 
              onClick={() => setSelectedVoucher(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-zinc-800 rounded-full text-brand-base0 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Icon Avatar */}
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4 shadow-inner ${selectedVoucher.issuer_type === 'ADMIN' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-white/5 text-brand-primary'}`}>
              {selectedVoucher.issuer_type === 'ADMIN' ? <Crown className="w-10 h-10" /> : <Store className="w-10 h-10" />}
            </div>

            <h2 className="text-3xl font-black mb-2 tracking-tight">
              {selectedVoucher.discount_type === 'PERCENTAGE' ? `Giảm ${selectedVoucher.discount_value}%` : `Giảm ${(selectedVoucher.discount_value / 1000)}K`}
            </h2>
            <div className="inline-block px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-xl font-mono text-sm font-black tracking-widest mb-6">
              {selectedVoucher.code}
            </div>

            {/* Khối mô tả */}
            <div className="p-4 bg-brand-base dark:bg-white/5 rounded-2xl text-left text-sm text-slate-600 dark:text-zinc-300 mb-6 space-y-3">
              <p>
                <strong className="text-slate-900 dark:text-white block mb-0.5">Loại ưu đãi:</strong> 
                {selectedVoucher.issuer_type === 'ADMIN' ? 'Mã Độc Quyền Toàn Sàn' : `Cơ sở phát hành: ${selectedVoucher.partner_name || "Đang tải..."}`}
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white block mb-0.5">Điều kiện áp dụng:</strong> 
                {selectedVoucher.issuer_type === 'ADMIN' ? 'Áp dụng cho tất cả các dịch vụ trên hệ thống.' : 'Chỉ áp dụng cho các dịch vụ của đối tác phát hành.'}
              </p>
              <div className="h-px bg-slate-200 dark:bg-white/10 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Đơn tối thiểu:</span>
                <strong className="text-slate-900 dark:text-white">{selectedVoucher.min_order_value.toLocaleString()}đ</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Hạn sử dụng:</span>
                <strong className="text-slate-900 dark:text-white">{formatDate(selectedVoucher.valid_until)}</strong>
              </div>
            </div>

            {/* Nút Action Điều Hướng */}
            <button 
              onClick={() => handleUseVoucher(selectedVoucher)}
              className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
                ${selectedVoucher.issuer_type === 'ADMIN' 
                  ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400 shadow-amber-500/30' 
                  : 'bg-brand-primary text-zinc-900 hover:bg-brand-primary shadow-brand-primary/30'}
              `}
            >
              {selectedVoucher.issuer_type === 'ADMIN' ? 'SĂN DỊCH VỤ NGAY' : 'XEM DỊCH VỤ ĐỐI TÁC'}
              <ExternalLink size={18} />
            </button>
            
          </div>
        </>
      )}
    </div>
  );
}

function SparklesIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-trust flex items-center justify-center shadow-lg shadow-brand-primary/30">
      <Ticket className="w-4 h-4 text-zinc-900" />
    </div>
  );
}