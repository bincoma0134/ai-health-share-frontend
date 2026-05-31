import { Sparkles } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-brand-base dark:bg-zinc-950 flex flex-col items-center justify-center gap-6 transition-colors duration-500">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div>
        <div className="absolute inset-2 bg-brand-primary rounded-full flex items-center justify-center shadow-lg shadow-brand-trust/30">
          <Sparkles className="text-white w-6 h-6 animate-pulse" />
        </div>
      </div>
      <p className="text-brand-base0 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase animate-pulse">
        Khơi nguồn sức sống...
      </p>
    </div>
  );
}