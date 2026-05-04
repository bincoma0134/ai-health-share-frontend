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
  const [isBuffering, setIsBuffering] = useState(false); // Thêm state này để chống giật cục
  const [isMuted, setIsMuted] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);
  const indicatorTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      setIsBuffering(true); // Bắt đầu phát -> Đang đệm
      video.muted = isMuted; 
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false); // Phát thành công -> Hết đệm
          })
          .catch(() => {
            setIsPlaying(false);
            setIsBuffering(false); // Lỗi -> Hiện nút Play
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      setIsBuffering(false);
      if (video.currentTime > 0) video.currentTime = 0;
    }
  }, [isActive, isMuted]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;

    if (videoRef.current) {
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

      {/* Chỉ hiện nút Play khi thực sự KHÔNG chơi VÀ KHÔNG đệm */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-500 animate-fade-in pointer-events-none">
           <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full border border-white/30 flex items-center justify-center shadow-2xl">
              <Play className="text-white w-10 h-10 ml-1 fill-white" />
           </div>
        </div>
      )}

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