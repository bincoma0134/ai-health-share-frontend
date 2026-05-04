"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

interface FeedVideoPlayerProps {
  videoUrl: string;
  isActive: boolean; // Component cha (Feed) sẽ báo cho nó biết có đang nằm giữa màn hình không
}

export default function FeedVideoPlayer({ videoUrl, isActive }: FeedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Bắt buộc Mute lúc đầu để qua mặt trình duyệt
  const [showIndicator, setShowIndicator] = useState(false); // Hiệu ứng Kính Mờ lúc chạm
  const indicatorTimeout = useRef<NodeJS.Timeout | null>(null);

  // Xử lý khi cuộn tới/cuộn đi - Ép Autoplay an toàn
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // Ép tắt tiếng ở tầng DOM để trình duyệt cho phép Autoplay 100%
      video.muted = isMuted; 
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            console.log("Autoplay bị chặn, chờ tương tác...");
            setIsPlaying(false);
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      if (video.currentTime > 0) video.currentTime = 0; // Reset an toàn
    }
  }, [isActive, isMuted]);

  // Hành động Click toàn màn hình
  const handleTogglePlay = (e: React.MouseEvent) => {
    // Không chặn click nếu nhấn vào các nút bên dưới (tim, comment...)
    if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;

    if (videoRef.current) {
      // Nếu là lần chạm đầu tiên, tự động bật tiếng luôn
      if (isMuted) setIsMuted(false);

      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
      triggerIndicator();
    }
  };

  // Hiệu ứng "Chớp" Icon ở giữa màn hình
  const triggerIndicator = () => {
    setShowIndicator(true);
    if (indicatorTimeout.current) clearTimeout(indicatorTimeout.current);
    indicatorTimeout.current = setTimeout(() => setShowIndicator(false), 800);
  };

  return (
    <div className="absolute inset-0 w-full h-full cursor-pointer" onClick={handleTogglePlay}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        loop
        playsInline
        autoPlay={isActive}
        muted={isMuted}
        preload="auto"
      />

      {/* Lớp Overlay Đen mờ & Nút Play trung tâm khi Tạm dừng */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-500 animate-fade-in pointer-events-none">
           <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full border border-white/30 flex items-center justify-center shadow-2xl">
              <Play className="text-white w-10 h-10 ml-1 fill-white" />
           </div>
        </div>
      )}

      {/* Biểu tượng Indicator chớp tắt khi tương tác (Giữ nguyên logic cũ nhưng tinh chỉnh icon) */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 transition-all duration-300 pointer-events-none ${
          showIndicator ? "opacity-100 scale-100" : "opacity-0 scale-150"
        }`}
      >
        {isPlaying ? (
          <Pause className="text-white w-12 h-12 opacity-80 fill-white" />
        ) : (
          <Play className="text-white w-12 h-12 ml-1 opacity-80 fill-white" />
        )}
      </div>
    </div>
  );
}