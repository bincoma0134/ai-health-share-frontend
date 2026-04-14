"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Share2, CalendarPlus, X } from "lucide-react"; // Thêm icon X để đóng Modal

// ... (Giữ nguyên phần interface Service)
interface Service {
  id: string;
  partner_id: string;
  service_name: string;
  description: string;
  price: number;
}

export default function UserFeed() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // --- STATE MỚI CHO LUỒNG ĐẶT LỊCH ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [email, setEmail] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ... (Giữ nguyên useEffect gọi API /services và useEffect xử lý Autoplay Video)
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch("https://ai-health-share-backend.onrender.com/services");
        const result = await response.json();
        if (result.status === "success") setServices(result.data);
      } catch (error) {
        console.error("Lỗi:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

// Hàm xử lý Đặt lịch (Bản hoàn thiện & Đầy đủ biến)
const handleBooking = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!activeService) return;
  
  setIsSubmitting(true);
  try {
    // BƯỚC 1: TẠO USER
    const userRes = await fetch("https://ai-health-share-backend.onrender.com/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, role: "USER" }) // Từ khóa ĐÃ CHUẨN XÁC
    });
    const userData = await userRes.json();

    if (!userRes.ok || userData.status !== "success") {
      const errorDetail = typeof userData.detail === "object" ? JSON.stringify(userData.detail) : userData.detail;
      throw new Error(`(Tạo User) ${errorDetail || "Lỗi không xác định từ Backend"}`);
    }

    // DÒNG QUAN TRỌNG: Lấy ID người dùng vừa tạo (Biến bị thiếu lúc nãy)
    const userId = userData.data.id;

    // BƯỚC 2: TẠO BOOKING
    const bookingRes = await fetch("https://ai-health-share-backend.onrender.com/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId, // Biến này hiện đã được khai báo ở trên
        service_id: activeService.id,
        affiliate_code: affiliateCode || null,
        total_amount: activeService.price
      })
    });
    const bookingData = await bookingRes.json();

    if (!bookingRes.ok || bookingData.status !== "success") {
      const errorDetail = typeof bookingData.detail === "object" ? JSON.stringify(bookingData.detail) : bookingData.detail;
      throw new Error(`(Tạo Booking) ${errorDetail || "Lỗi ghi nhận giao dịch"}`);
    }

    // THÀNH CÔNG
    alert("🎉 Đặt lịch thành công! Hệ thống Escrow đã ghi nhận.");
    setIsModalOpen(false);
    setEmail("");
    setAffiliateCode("");

  } catch (error: any) {
    console.error("Chi tiết lỗi:", error);
    alert(`Lỗi hệ thống: ${error.message}`);
  } finally {
    setIsSubmitting(false);
  }
};

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      {/* ... (Giữ nguyên phần Header) */}

      {services.map((item, index) => {
        const videoNumber = (index % 3) + 1;
        return (
          <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always">
             {/* ... (Giữ nguyên Video Player và Layout text) */}
             <video src={`/video-${videoNumber}.mp4`} className="w-full h-full object-cover" loop muted playsInline />
             <div className="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
             
             <div className="absolute bottom-6 left-4 right-16 text-white">
                {/* ... (Giữ nguyên thông tin dịch vụ) */}
                <h3 className="text-xl font-bold mb-2">{item.service_name}</h3>
                <div className="inline-flex px-3 py-1.5 bg-white text-black text-sm font-bold rounded-lg">
                  {item.price} VND
                </div>
             </div>

            <div className="absolute bottom-6 right-4 flex flex-col gap-6 items-center text-white">
              {/* NÚT ĐẶT LỊCH ĐÃ ĐƯỢC GẮN SỰ KIỆN */}
              <button 
                onClick={() => {
                  setActiveService(item);
                  setIsModalOpen(true);
                }}
                className="flex flex-col items-center gap-1 mt-4 group cursor-pointer animate-bounce"
              >
                <div className="p-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30">
                  <CalendarPlus size={28} className="text-white" />
                </div>
                <span className="text-xs font-bold text-emerald-400">Đặt lịch</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* --- FORM MODAL ĐẶT LỊCH --- */}
      {isModalOpen && activeService && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl p-6 border-t border-zinc-800 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Xác nhận Đặt lịch</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-zinc-800 rounded-full text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-zinc-800 rounded-xl">
              <p className="text-sm text-gray-400">Dịch vụ đang chọn:</p>
              <p className="text-white font-semibold">{activeService.service_name}</p>
              <p className="text-emerald-400 font-bold mt-1">{activeService.price} VND</p>
            </div>

            <form onSubmit={handleBooking} className="flex flex-col gap-4">
              <div>
                <input 
                  type="email" required placeholder="Nhập Email của bạn"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <input 
                  type="text" placeholder="Mã giới thiệu (Nếu có)"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  value={affiliateCode} onChange={(e) => setAffiliateCode(e.target.value)}
                />
              </div>
              
              <button 
                type="submit" disabled={isSubmitting}
                className="w-full py-4 mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận & Giữ chỗ"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}