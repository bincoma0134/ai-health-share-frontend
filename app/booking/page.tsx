"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function UserFeed() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State mới: Lưu trữ mã giới thiệu khách hàng nhập vào
  const [affiliateCode, setAffiliateCode] = useState(""); 

  const MOCK_USER_ID = "87d62c5d-22c1-4ba1-942c-0b3a6e407641"; 

  useEffect(() => {
    axios.get("https://ai-health-share-backend.onrender.com/services")
      .then((res) => {
        setServices(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi lấy dịch vụ:", err);
        setLoading(false);
      });
  }, []);

  const handleBooking = async (serviceId: string, price: number) => {
    try {
      await axios.post("https://ai-health-share-backend.onrender.com/bookings", {
        user_id: MOCK_USER_ID,
        service_id: serviceId,
        total_amount: price,
        // Gửi mã affiliate lên Backend (nếu khách không nhập thì gửi null)
        affiliate_code: affiliateCode.trim() !== "" ? affiliateCode : null 
      });
      alert("🎉 Đặt lịch thành công! Hệ thống Escrow đã ghi nhận giao dịch và người giới thiệu.");
      setAffiliateCode(""); // Xóa trắng ô nhập mã sau khi đặt xong
    } catch (error) {
      alert("Có lỗi xảy ra khi đặt lịch!");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Trải nghiệm Sống Khỏe</h1>
        
        {loading ? (
          <p className="text-gray-500 text-center">Đang tải liệu trình...</p>
        ) : (
          <div className="space-y-6">
            {services.map((svc) => (
              <div key={svc.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <div className="h-48 bg-slate-200 flex items-center justify-center relative">
                  <span className="text-slate-400 text-sm font-medium">Video Trải Nghiệm Thật</span>
                  <div className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded text-xs font-bold text-blue-600">
                    Xác Thực
                  </div>
                </div>
                
                <div className="p-5">
                  <h2 className="text-lg font-bold text-gray-800">{svc.service_name}</h2>
                  <p className="text-gray-500 text-sm mt-1 mb-4 line-clamp-2">
                    {svc.description || "Liệu trình phục hồi chuyên sâu, chuẩn y khoa không xâm lấn."}
                  </p>
                  
                  <div className="flex flex-col mt-4 space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-rose-600">
                        {svc.price.toLocaleString()} VNĐ
                      </span>
                    </div>
                    
                    {/* Ô nhập mã Affiliate */}
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        placeholder="Mã người giới thiệu (KOL)" 
                        value={affiliateCode}
                        onChange={(e) => setAffiliateCode(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button 
                        onClick={() => handleBooking(svc.id, svc.price)}
                        className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition active:scale-95 whitespace-nowrap"
                      >
                        Đặt lịch ngay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}