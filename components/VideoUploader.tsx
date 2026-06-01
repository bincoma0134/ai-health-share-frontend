"use client";

import { useState, useRef } from "react";
import { UploadCloud, X, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";

interface VideoUploaderProps {
  onUploadSuccess: (url: string) => void;
  className?: string;
  label?: string;
}

export default function VideoUploader({ onUploadSuccess, className = "", label = "Kéo thả hoặc bấm để chọn Video" }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // THUẬT TOÁN ĐỌC THỜI LƯỢNG VÀ DUNG LƯỢNG (CLIENT-SIDE)
  const validateVideo = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      // 1. Chặn file > 500MB
      if (file.size > 500 * 1024 * 1024) {
        toast.error("Dung lượng file gốc vượt quá 500MB.");
        return resolve(false);
      }

      // 2. Tạo video ảo trong RAM để đo độ dài (không tải lên server)
      const videoElement = document.createElement("video");
      videoElement.preload = "metadata";
      videoElement.onloadedmetadata = () => {
        URL.revokeObjectURL(videoElement.src);
        const duration = videoElement.duration;
        
        // 3. Chặn video dài quá 3 phút (180s)
        if (duration > 180) {
          toast.error(`Video quá dài (${Math.round(duration)}s). Vui lòng chọn video dưới 3 phút.`);
          return resolve(false);
        }
        resolve(true);
      };
      
      videoElement.onerror = () => {
          toast.error("Không thể đọc định dạng video này.");
          resolve(false);
      };
      
      videoElement.src = URL.createObjectURL(file);
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      return toast.error("Vui lòng chọn định dạng Video (MP4, MOV).");
    }

    const isValid = await validateVideo(file);
    if (!isValid) return;

    setPreviewUrl(URL.createObjectURL(file));
    await uploadToBackend(file);
  };

  const uploadToBackend = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading("Đang tải lên và chờ máy chủ nén video...");
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("ai-health-token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/upload/video`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Lỗi từ máy chủ");

      toast.success("Tải lên và xử lý thành công!", { id: toastId });
      onUploadSuccess(data.url); // Trả Link R2 về cho Component Cha
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải lên", { id: toastId });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {!previewUrl ? (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-48 rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-slate-300 dark:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          <UploadCloud size={40} className="text-slate-400 mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">{label}</p>
          <p className="text-xs text-slate-500 mt-1">Hỗ trợ MP4, MOV (Tối đa 3 phút / 500MB)</p>
          <input type="file" ref={fileInputRef} className="hidden" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>
      ) : (
        <div className="relative w-full aspect-[9/16] md:aspect-video max-h-[400px] bg-black rounded-[1.5rem] overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10">
          <video src={previewUrl} className="w-full h-full object-contain opacity-60" autoPlay loop muted playsInline />
          
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 p-4 text-center">
               <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-3"></div>
               <p className="text-white font-black text-sm tracking-widest uppercase animate-pulse">Hệ thống đang nén video...</p>
               <p className="text-brand-muted text-[10px] mt-2 leading-relaxed">Quá trình này có thể mất vài phút. Vui lòng không đóng trang để đảm bảo dữ liệu di động của khách hàng được tiết kiệm tối đa.</p>
            </div>
          )}
          
          {!isUploading && (
            <button onClick={() => { setPreviewUrl(null); onUploadSuccess(""); }} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-rose-500 transition-colors z-20">
              <X size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}