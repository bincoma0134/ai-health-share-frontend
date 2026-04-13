"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function PartnerDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    axios.get("https://ai-health-share-backend.onrender.com/bookings")
      .then((res) => {
        setBookings(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi kết nối:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Hàm xử lý khi Đối tác bấm nút thay đổi trạng thái
  const handleStatusUpdate = async (id: string, newServiceStatus: string, newPaymentStatus?: string) => {
    try {
      const payload: any = { service_status: newServiceStatus };
      if (newPaymentStatus) payload.payment_status = newPaymentStatus;

      await axios.patch(`https://ai-health-share-backend.onrender.com/bookings/${id}`, payload);
      fetchBookings(); // Tải lại danh sách sau khi cập nhật thành công
    } catch (error) {
      alert("Có lỗi xảy ra khi cập nhật!");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Partner Dashboard</h1>
        <p className="text-gray-500 mb-8">Quản lý dòng tiền Escrow và Lịch hẹn</p>

        {loading ? (
          <p className="text-blue-500 font-medium">Đang tải dữ liệu từ server...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">Mã Booking</th>
                  <th className="p-4 font-semibold text-gray-600">Số tiền</th>
                  <th className="p-4 font-semibold text-gray-600">Dòng tiền</th>
                  <th className="p-4 font-semibold text-gray-600">Trạng thái Dịch vụ</th>
                  <th className="p-4 font-semibold text-gray-600">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="p-4 text-sm font-mono text-gray-500">{b.id.substring(0, 8)}...</td>
                    <td className="p-4 font-medium text-gray-800">{b.total_amount.toLocaleString()} VNĐ</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.payment_status === 'REVENUE_SPLIT' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.service_status === 'COMPLETED' ? 'bg-green-100 text-green-700' : b.service_status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {b.service_status}
                      </span>
                    </td>
                    <td className="p-4 space-x-2">
                      {b.service_status === 'PENDING' && (
                        <button 
                          onClick={() => handleStatusUpdate(b.id, 'CHECKED_IN', 'PAID_ESCROW')}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                        >
                          Khách Check-in
                        </button>
                      )}
                      {b.service_status === 'CHECKED_IN' && (
                        <button 
                          onClick={() => handleStatusUpdate(b.id, 'COMPLETED', 'REVENUE_SPLIT')}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                        >
                          Hoàn thành & Chia tiền
                        </button>
                      )}
                      {b.service_status === 'COMPLETED' && (
                        <span className="text-sm text-gray-400 italic">Đã đối soát</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}