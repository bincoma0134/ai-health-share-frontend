import { Activity } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-2xl flex flex-col items-center justify-center transition-colors duration-500">
      {/* Khối Glass Panel sử dụng animate-float đã khai báo trong globals.css */}
      <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] bg-white/60 dark:bg-black/50 border-slate-200 dark:border-white/10 shadow-2xl flex flex-col items-center gap-6 animate-float">
        
        {/* Vòng xoay kết hợp icon Activity đại diện cho Health Tech */}
        <div className="relative flex items-center justify-center w-24 h-24 bg-[#80BF84]/10 rounded-full">
          <Activity size={40} className="text-[#80BF84] animate-pulse" />
          <div className="absolute inset-0 border-[4px] border-[#80BF84]/30 border-t-[#80BF84] rounded-full animate-spin"></div>
        </div>
        
        <div className="text-center">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-widest uppercase mb-2">Đang tải dữ liệu</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Vui lòng đợi trong giây lát...</p>
        </div>
      </div>
    </div>
  );
}