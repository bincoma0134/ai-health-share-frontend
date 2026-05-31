"use client";

import { useState, useEffect } from "react";
import { X, CalendarPlus, ShieldCheck, Ticket, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useVoucherStore } from "@/store/useVoucherStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  serviceId?: string;
  serviceName: string;
  price: number;
}

export default function BookingModal({ isOpen, onClose, partnerId, serviceId, serviceName, price }: BookingModalProps) {
  const { user } = useAuth();
  const { myVouchers } = useVoucherStore();
  
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Voucher State
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | null>(null);

  // Lọc các voucher khả dụng cho Đơn hàng này
  const validVouchers = myVouchers.filter((v: any) => {
    const isUnused = v.wallet_status === 'UNUSED';
    const isValidIssuer = v.issuer_type === 'ADMIN' || v.issuer_id === partnerId;
    const isEnoughValue = price >= v.min_order_value;
    return isUnused && isValidIssuer && isEnoughValue;
  });

  // Tính toán toán học: Hóa đơn tạm tính
  let discountAmount = 0;
  if (selectedVoucherCode) {
    const appliedVoucher = validVouchers.find((v: any) => v.code === selectedVoucherCode);
    if (appliedVoucher) {
      if (appliedVoucher.discount_type === 'PERCENTAGE') {
        discountAmount = (price * appliedVoucher.discount_value) / 100;
        if (appliedVoucher.max_discount_amount) {
          discountAmount = Math.min(discountAmount, appliedVoucher.max_discount_amount);
        }
      } else {
        discountAmount = appliedVoucher.discount_value;
      }
    }
  }
  const finalPrice = Math.max(0, price - discountAmount);

  // Reset state khi mở lại Modal
  useEffect(() => {
    if (isOpen) {
      setDate("");
      setTime("");
      setNote("");
      setSelectedVoucherCode(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập để đặt lịch!");
      return;
    }

    // MVP Logic: Cảnh báo dùng App nhưng vẫn cho qua
    if (selectedVoucherCode) {
      toast.info("Tính năng áp dụng Voucher hoạt động mượt mà nhất trên App Mobile. Hệ thống vẫn tiếp tục xử lý yêu cầu của bạn (Bản thử nghiệm)...", { duration: 4000 });
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("ai-health-token");
      const res = await fetch(`${API_URL}/appointments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          partner_id: partnerId,
          service_id: serviceId || null,
          appointment_date: `${date}T${time}:00`,
          notes: note,
          // voucher_code: selectedVoucherCode // Tạm thời để Frontend xử lý UI, Backend sẽ ráp vào sau ở API
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Đặt lịch thành công! Đối tác sẽ sớm xác nhận.");
        onClose();
      } else {
        toast.error(data.detail || "Không thể đặt lịch. Vui lòng thử lại!");
      }
    } catch (error) {
      toast.error("Lỗi kết nối máy chủ!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Nền mờ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      
      {/* Hộp thoại */}
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl animate-slide-up border border-slate-200 dark:border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
            <CalendarPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Đặt Lịch Hẹn</h2>
            <p className="text-sm text-slate-500 font-medium truncate">{serviceName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 ml-1">Ngày hẹn</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 ml-1">Giờ hẹn</label>
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 ml-1">Ghi chú (Tùy chọn)</label>
            <textarea rows={2} placeholder="Yêu cầu đặc biệt..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-colors resize-none" />
          </div>

          {/* KHỐI VOUCHER (MỚI) */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
            <label className="text-xs font-black text-slate-700 dark:text-zinc-300 ml-1 mb-2 flex items-center gap-1.5 uppercase tracking-widest">
              <Ticket size={12} className="text-[#80BF84]"/> Ưu đãi của bạn
            </label>
            {validVouchers.length === 0 ? (
              <p className="text-sm text-slate-400 italic px-2">Không có mã giảm giá khả dụng cho dịch vụ này.</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                {validVouchers.map((v: any) => (
                  <div 
                    key={v.user_voucher_id}
                    onClick={() => setSelectedVoucherCode(selectedVoucherCode === v.code ? null : v.code)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedVoucherCode === v.code ? 'bg-emerald-50 dark:bg-[#80BF84]/10 border-[#80BF84]' : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 hover:border-[#80BF84]/50'}`}
                  >
                    <div>
                      <h4 className="font-bold text-sm">{v.discount_type === 'PERCENTAGE' ? `Giảm ${v.discount_value}%` : `Giảm ${(v.discount_value / 1000)}K`}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Mã: {v.code}</p>
                    </div>
                    {selectedVoucherCode === v.code && <CheckCircle2 size={18} className="text-[#80BF84]" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KHỐI TẠM TÍNH HÓA ĐƠN */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl space-y-2 mt-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Giá dịch vụ</span>
              <span className="font-medium">{price.toLocaleString()}đ</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-[#80BF84] font-bold">
                <span>Voucher giảm</span>
                <span>-{discountAmount.toLocaleString()}đ</span>
              </div>
            )}
            <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1"></div>
            <div className="flex justify-between text-lg font-black">
              <span>Tạm tính</span>
              <span className="text-blue-600 dark:text-blue-400">{finalPrice.toLocaleString()}đ</span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-3 mt-4">
            <ShieldCheck size={20} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-blue-800 dark:text-blue-300 font-medium">
              Bạn <strong>chưa cần thanh toán lúc này</strong>. Tổng tiền sẽ được hệ thống bảo chứng an toàn <strong>sau khi cơ sở xác nhận có lịch trống</strong>.
            </p>
          </div>
          
          <button type="submit" disabled={isSubmitting} className="relative w-full py-4 mt-2 bg-gradient-to-tr from-slate-800 to-slate-900 dark:from-white dark:to-slate-200 text-white dark:text-zinc-950 font-black text-lg rounded-2xl active:scale-95 transition-all shadow-xl overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full skew-x-12 transition-transform duration-500"></div>
            <span className="relative flex items-center justify-center gap-2">
              {isSubmitting ? <Clock className="animate-spin" size={20} /> : "XÁC NHẬN ĐẶT LỊCH"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}