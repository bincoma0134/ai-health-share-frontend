"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Share2, CalendarPlus } from "lucide-react";

// Định nghĩa cấu trúc dữ liệu trả về từ API
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

  // 1. GỌI API LẤY DỮ LIỆU THẬT
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch("https://ai-health-share-backend.onrender.com/services");
        const result = await response.json();
        
        if (result.status === "success") {
          setServices(result.data);
        }
      } catch (error) {
        console.error("Lỗi kết nối Backend:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  // 2. XỬ LÝ AUTOPLAY VIDEO (Intersection Observer)
  useEffect(() => {
    if (isLoading || services.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.7,
    };

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.play().catch(() => console.log("Trình duyệt chặn Autoplay"));
        } else {
          video.pause();
          video.currentTime = 0;
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [isLoading, services]);

  // Hiển thị màn hình chờ trong lúc gọi API
  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
      <div className="absolute top-0 left-0 w-full z-50 flex justify-between p-4 bg-gradient-to-b from-black/60 to-transparent text-white">
        <h1 className="text-xl font-bold tracking-wide">AI Health Share</h1>
        <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
          Dành cho bạn
        </span>
      </div>

      {services.map((item, index) => {
        // Tạm thời gán vòng lặp 3 video cho các dịch vụ
        const videoNumber = (index % 3) + 1; 

        return (
          <div key={item.id} className="relative h-[100dvh] w-full snap-start snap-always">
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={`/video-${videoNumber}.mp4`}
              className="w-full h-full object-cover"
              loop
              muted
              playsInline
            />

            <div className="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

            <div className="absolute bottom-6 left-4 right-16 text-white">
              <h2 className="text-sm font-semibold text-gray-300 mb-1">
                Zen Spa & Wellness
              </h2>
              <h3 className="text-xl font-bold mb-2 drop-shadow-md">
                {item.service_name}
              </h3>
              <p className="text-sm text-gray-200 line-clamp-2 mb-3 drop-shadow-sm">
                {item.description || "Đang cập nhật mô tả chi tiết cho dịch vụ này."}
              </p>
              <div className="inline-flex items-center px-3 py-1.5 bg-white text-black text-sm font-bold rounded-lg">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
              </div>
            </div>

            <div className="absolute bottom-6 right-4 flex flex-col gap-6 items-center text-white">
              <button className="flex flex-col items-center gap-1 group">
                <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-white/20 transition">
                  <Heart size={26} className="text-white drop-shadow-md" />
                </div>
                <span className="text-xs font-semibold">12.5K</span>
              </button>

              <button className="flex flex-col items-center gap-1 group">
                <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-white/20 transition">
                  <Share2 size={26} className="text-white drop-shadow-md" />
                </div>
                <span className="text-xs font-semibold">Chia sẻ</span>
              </button>

              <button className="flex flex-col items-center gap-1 mt-4 group cursor-pointer animate-bounce">
                <div className="p-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30">
                  <CalendarPlus size={28} className="text-white" />
                </div>
                <span className="text-xs font-bold text-emerald-400 drop-shadow-md">Đặt lịch</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}