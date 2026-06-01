"use client";

import { useState, useRef } from "react";
import { UploadCloud, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  className?: string;
  label?: string;
}

export default function ImageUploader({ onUploadSuccess, className = "", label = "Kéo thả hoặc bấm để chọn Ảnh" }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return toast.error("Vui lòng chọn định dạng Hình ảnh (JPG, PNG, WEBP).");
    }

    setPreviewUrl(URL.createObjectURL(file));
    await uploadAndCompress(file);
  };

  const uploadAndCompress = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading("Đang nén và tải lên hình ảnh...");

    try {
      // 1. THUẬT TOÁN NÉN ẢNH (CLIENT-SIDE)
      const options = {
        maxSizeMB: 0.5, // Ép dung lượng tối đa 500KB
        maxWidthOrHeight: 1920, // Ép độ phân giải tối đa
        useWebWorker: true,
        fileType: "image/webp" // Ép sang WebP siêu nhẹ
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // 2. GỬI LÊN BACKEND
      const formData = new FormData();
      formData.append("file", compressedFile, compressedFile.name.replace(/\.[^/.]+$/, ".webp"));

      const token = localStorage.getItem("ai-health-token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/upload/image`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Lỗi từ máy chủ");

      toast.success("Tải ảnh thành công!", { id: toastId });
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
          className={`w-full h-40 rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-slate-300 dark:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          <UploadCloud size={32} className="text-slate-400 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">{label}</p>
          <p className="text-xs text-slate-500 mt-1">Tự động nén WebP để tối ưu tốc độ</p>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>
      ) : (
        <div className="relative w-full aspect-video md:aspect-[21/9] max-h-[300px] bg-brand-base rounded-[1.5rem] overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10">
          <img src={previewUrl} className="w-full h-full object-cover opacity-80" alt="Preview" />
          
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
               <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
               <p className="text-white font-black text-xs uppercase tracking-widest">Đang xử lý...</p>
            </div>
          )}
          
          {!isUploading && (
            <button onClick={() => { setPreviewUrl(null); onUploadSuccess(""); }} className="absolute top-3 right-3 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-rose-500 transition-colors z-20">
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}