"use client";

import { useState, useEffect } from "react";
import { X, CalendarPlus, ShieldCheck, Ticket, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useVoucherStore } from "@/store/useVoucherStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  serviceId?: string; // Có thể là video_id hoặc service_id
  serviceName: string;
  price: number;
}

export default function BookingModal({ isOpen, onClose, partnerId, serviceId, serviceName, price }: BookingModalProps) {
  const { user } = useAuth();
  const { myVouchers } = useVoucherStore();
  
  // BẢO TOÀN 100% STATE GỐC CỦA PAGE.TSX
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Voucher State
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | null>(null);
  const [isAutoApplied, setIsAutoApplied] = useState(false); // Cờ chặn loop

  // 1. Lọc voucher khả dụng trong Ví
  const validVouchers = myVouchers.filter((v: any) => {
    const isUnused = v.wallet_status === 'UNUSED';
    const isValidIssuer = v.issuer_type === 'ADMIN' || v.issuer_id === partnerId;
    const isEnoughValue = price >= v.min_order_value;
    return isUnused && isValidIssuer && isEnoughValue;
  });

  // 2. Thuật toán tính mức giảm thực tế của 1 mã (Bọc thép Max Discount)
  const calculateDiscount = (v: any) => {
    if (v.discount_type === 'PERCENTAGE') {
      let amount = (price * Number(v.discount_value)) / 100;
      if (v.max_discount_amount) amount = Math.min(amount, Number(v.max_discount_amount));
      return amount;
    }
    return Number(v.discount_value);
  };

  // 3. TỰ ĐỘNG CHỌN MÃ GIẢM SÂU NHẤT KHI MỞ POP-UP
  useEffect(() => {
    if (isOpen && validVouchers.length > 0 && !isAutoApplied) {
      let bestVoucher = validVouchers[0];
      let maxDiscount = calculateDiscount(bestVoucher);

      validVouchers.forEach((v: any) => {
        const currentDiscount = calculateDiscount(v);
        if (currentDiscount > maxDiscount) {
          maxDiscount = currentDiscount;
          bestVoucher = v;
        }
      });

      setSelectedVoucherCode(bestVoucher.code);
      setIsAutoApplied(true);
    }
  }, [isOpen, validVouchers, isAutoApplied, price]);

  // 4. Kế toán tạm tính Hóa đơn
  let discountAmount = 0;
  if (selectedVoucherCode) {
    const appliedVoucher = validVouchers.find((v: any) => v.code === selectedVoucherCode);
    if (appliedVoucher) {
      discountAmount = calculateDiscount(appliedVoucher);
    }
  }
  const finalPrice = Math.max(0, price - discountAmount);

  // 5. Dọn dẹp Form và Reset Cờ Auto-Apply khi Đóng Pop-up
  useEffect(() => {
    if (!isOpen) {
      setBookingName("");
      setBookingPhone("");
      setBookingNote("");
      setAffiliateCode("");
      setSelectedVoucherCode(null);
      setIsAutoApplied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // BẢO TOÀN 100% LOGIC GỌI API GỐC CỦA PAGE.TSX
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập để đặt lịch!");
      return;
    }

    if (!bookingName.trim() || !bookingPhone.trim()) {
      toast.error("Vui lòng nhập đầy đủ Họ tên và Số điện thoại!");
      return;
    }

    // MVP Logic: Cảnh báo dùng App nhưng vẫn cho qua
    if (selectedVoucherCode) {
      toast.info("Tính năng áp dụng Voucher hoạt động mượt mà nhất trên App Mobile. Hệ thống vẫn tiếp tục xử lý yêu cầu của bạn (Bản thử nghiệm)...", { duration: 4000 });
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Đang gửi yêu cầu đến cơ sở...");

    try {
      const token = localStorage.getItem("ai-health-token") || "";
      const code = affiliateCode.trim();

      if (code !== "") {
        try {
          const validateRes = await fetch(`${API_URL}/affiliates/validate?code=${code}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!validateRes.ok) {
            const errData = await validateRes.json().catch(() => ({}));
            throw new Error(errData.detail || "Mã giới thiệu không hợp lệ hoặc không tồn tại!");
          }
        } catch (err: any) {
          // Xử lý riêng lỗi "Failed to fetch" do mạng hoặc CORS
          if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
             throw new Error("Không thể xác thực mã giới thiệu do lỗi mạng. Vui lòng thử lại!");
          }
          throw new Error(err.message || "Mã giới thiệu không hợp lệ!");
        }
      }

      // Khôi phục API /appointments/request
      const bookingRes = await fetch(`${API_URL}/appointments/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          partner_id: partnerId, 
          video_id: serviceId, // Truyền serviceId vào trường video_id như logic cũ
          affiliate_code: code || null, 
          total_amount: price || 0,
          customer_name: bookingName.trim(),
          customer_phone: bookingPhone.trim(),
          note: bookingNote.trim(),
          voucher_code: selectedVoucherCode || null
        })
      });
      
      const bookingData = await bookingRes.json();
      
      if (!bookingRes.ok) throw new Error(bookingData.detail || "Lỗi gửi yêu cầu");
      
      toast.success(bookingData.message || "Yêu cầu đã được gửi! Vui lòng theo dõi tại tab 'Lịch hẹn'.", { id: toastId, duration: 5000 });
      onClose();
      
    } catch (error: any) { 
      toast.error(error.message, { id: toastId }); 
    } finally { 
      setIsSubmitting(false); 
    } 
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-center items-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 z-10 shadow-2xl border border-slate-200 dark:border-white/10 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[10px] font-bold text-brand-primary mb-3 uppercase tracking-wider">
              <Sparkles size={12} /> Đặt lịch dịch vụ
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight pr-4">{serviceName}</h3>
            <p className="text-brand-primary font-black text-lg mt-1">{price.toLocaleString()} VND</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-brand-base0 dark:text-zinc-400 transition-colors shrink-0"><X size={18}/></button>
        </div>

        <form onSubmit={handleBooking} className="flex flex-col gap-4">
          {/* KHÔI PHỤC LẠI FORM GỐC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-base0 dark:text-zinc-400 ml-1">Họ và tên</label>
                  <input type="text" placeholder="Nhập tên của bạn..." className="w-full px-5 py-3.5 bg-brand-base dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary transition-all" required value={bookingName} onChange={e => setBookingName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-base0 dark:text-zinc-400 ml-1">Số điện thoại</label>
                  <input type="tel" placeholder="09xx..." className="w-full px-5 py-3.5 bg-brand-base dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary transition-all" required value={bookingPhone} onChange={e => setBookingPhone(e.target.value)} />
              </div>
          </div>

          <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-base0 dark:text-zinc-400 ml-1">Lời nhắn nhủ (Tùy chọn)</label>
              <textarea placeholder="Bạn có yêu cầu đặc biệt gì cho dịch vụ này không?" rows={2} className="w-full px-5 py-3.5 bg-brand-base dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary transition-all resize-none" value={bookingNote} onChange={e => setBookingNote(e.target.value)} />
          </div>

          <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-base0 dark:text-zinc-400 ml-1">Mã giới thiệu (Tùy chọn)</label>
              <input type="text" placeholder="Nhập mã ưu đãi..." className="w-full px-5 py-3.5 bg-brand-base dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-2xl text-slate-900 dark:text-white font-medium uppercase focus:outline-none focus:border-brand-primary transition-all" value={affiliateCode} onChange={e => setAffiliateCode(e.target.value)} />
          </div>

          {/* KHỐI VOUCHER */}
          <div className="mt-2 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <label className="text-xs font-black text-slate-700 dark:text-zinc-300 ml-1 mb-2 flex items-center gap-1.5 uppercase tracking-widest">
              <Ticket size={12} className="text-brand-primary"/> Ưu đãi của bạn
            </label>
            {validVouchers.length === 0 ? (
              <p className="text-sm text-slate-400 italic px-2">Không có mã giảm giá khả dụng cho dịch vụ này.</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                {validVouchers.map((v: any) => (
                  <div 
                    key={v.user_voucher_id}
                    onClick={() => setSelectedVoucherCode(selectedVoucherCode === v.code ? null : v.code)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedVoucherCode === v.code ? 'bg-emerald-50 dark:bg-brand-primary/10 border-brand-primary' : 'bg-brand-base dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 hover:border-brand-primary/50'}`}
                  >
                    <div>
                      <h4 className="font-bold text-sm">{v.discount_type === 'PERCENTAGE' ? `Giảm ${v.discount_value}%` : `Giảm ${(v.discount_value / 1000)}K`}</h4>
                      <p className="text-[10px] text-brand-base0 mt-0.5">Mã: {v.code}</p>
                    </div>
                    {selectedVoucherCode === v.code && <CheckCircle2 size={18} className="text-brand-primary" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KHỐI TẠM TÍNH HÓA ĐƠN */}
          <div className="bg-brand-base dark:bg-zinc-800/50 p-4 rounded-xl space-y-2 mt-2">
            <div className="flex justify-between text-sm text-brand-base0">
              <span>Giá dịch vụ</span>
              <span className="font-medium">{price.toLocaleString()}đ</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-brand-primary font-bold">
                <span>Voucher giảm</span>
                <span>-{discountAmount.toLocaleString()}đ</span>
              </div>
            )}
            <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1"></div>
            <div className="flex justify-between text-lg font-black">
              <span>Tạm tính</span>
              <span className="text-brand-trust dark:text-blue-400">{finalPrice.toLocaleString()}đ</span>
            </div>
          </div>

          <div className="mt-4">
              <div className="p-4 mb-5 bg-blue-50 dark:bg-brand-trust/10 border border-blue-200 dark:border-brand-trust/20 rounded-xl flex items-start gap-3">
                  <ShieldCheck size={20} className="text-brand-trust shrink-0 mt-0.5" />
                  <p className="text-[13px] leading-relaxed text-blue-800 dark:text-blue-300 font-medium">
                      Bạn <strong>chưa cần thanh toán lúc này</strong>. Tổng tiền <strong className="text-brand-trust dark:text-blue-400">{finalPrice.toLocaleString()} VND</strong> sẽ được hệ thống bảo chứng an toàn <strong>sau khi cơ sở xác nhận có lịch trống</strong> dành cho bạn.
                  </p>
              </div>
              
              <button type="submit" disabled={isSubmitting} className="relative w-full py-4 bg-gradient-to-tr from-slate-800 to-slate-900 dark:from-white dark:to-slate-200 text-white dark:text-zinc-950 font-black text-lg rounded-2xl active:scale-95 transition-all shadow-xl overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full skew-x-12 transition-transform duration-500"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {isSubmitting ? <Clock className="animate-spin" size={20} /> : "GỬI YÊU CẦU ĐẶT LỊCH"}
                </span>
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}