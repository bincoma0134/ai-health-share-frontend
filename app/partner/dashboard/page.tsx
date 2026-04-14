"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, CreditCard } from "lucide-react"; // Đảm bảo cậu đã cài 'lucide-react'

// Đồng bộ Interface chuẩn từ AI_STATE.md
interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  affiliate_id: string | null;
  total_amount: number;
  payment_status: string;
  service_status: string;
}

export default function PartnerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // FETCH DỮ LIỆU TỪ BACKEND
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch("https://ai-health-share-backend.onrender.com/bookings");
        const result = await response.json();
        
        // Giả định backend trả về format: { status: "success", data: [...] }
        if (result.status === "success" || Array.isArray(result)) {
          setBookings(result.data || result); 
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu Escrow:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

// HÀM XỬ LÝ: XÁC NHẬN HOÀN THÀNH DỊCH VỤ (Kích hoạt luồng tiền)
const handleCompleteService = async (bookingId: string) => {
    const isConfirmed = window.confirm("Xác nhận khách hàng đã hoàn thành dịch vụ? Hệ thống sẽ tự động chia hoa hồng.");
    if (!isConfirmed) return;

    try {
      const res = await fetch(`https://ai-health-share-backend.onrender.com/bookings/${bookingId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      const result = await res.json();

      if (res.ok && result.status === "success") {
        alert(`🎉 Giải ngân thành công! \n- Đối tác nhận: ${result.distribution.partner_revenue.toLocaleString()} VND\n- Affiliate nhận: ${result.distribution.affiliate_revenue.toLocaleString()} VND`);
        window.location.reload(); // Refresh lại danh sách để cập nhật trạng thái UI
      } else {
        alert(`Lỗi: ${result.detail}`);
      }
    } catch (error) {
      alert("Lỗi kết nối đến server. Vui lòng kiểm tra lại mạng.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
}

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header Dashboard */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Partner Escrow Dashboard
          </h1>
          <p className="text-zinc-400 mt-2">Quản lý các lịch đặt và dòng tiền dịch vụ.</p>
        </div>

        {/* Bảng Dữ liệu Booking */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/50 text-zinc-400 text-sm border-b border-zinc-800">
                  <th className="p-4 font-medium">Mã Đơn (ID)</th>
                  <th className="p-4 font-medium">Khách hàng</th>
                  <th className="p-4 font-medium">Tổng tiền</th>
                  <th className="p-4 font-medium">Thanh toán</th>
                  <th className="p-4 font-medium">Tiến độ Dịch vụ</th>
                  <th className="p-4 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-800/50">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Chưa có dữ liệu Booking nào trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="p-4 font-mono text-xs text-zinc-500">
                        {booking.id.substring(0, 8)}...
                      </td>
                      <td className="p-4">
                        <span className="truncate max-w-[150px] inline-block" title={booking.user_id}>
                          {booking.user_id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-emerald-400">
                        {booking.total_amount.toLocaleString()} VND
                      </td>
                      
                      {/* Cột Payment Status */}
                      <td className="p-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20">
                          <CreditCard size={14} />
                          {booking.payment_status}
                        </div>
                      </td>

                      {/* Cột Service Status */}
                      <td className="p-4">
                        {booking.service_status.toLowerCase() === "waiting" ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                            <Clock size={14} />
                            Đang chờ
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            <CheckCircle size={14} />
                            Đã hoàn thành
                          </div>
                        )}
                      </td>

                      {/* Nút Hành động */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleCompleteService(booking.id)}
                          disabled={booking.service_status === "completed"}
                          className="px-4 py-2 bg-zinc-800 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Xác nhận Hoàn thành
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}