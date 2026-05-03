"use client";

import { Crown, Building2, Sparkles, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardButton({ userRole }: { userRole: string }) {
  const router = useRouter();

  if (!["SUPER_ADMIN", "ADMIN", "MODERATOR", "PARTNER_ADMIN", "CREATOR"].includes(userRole)) {
    return null; // Không hiển thị nếu không phải các role trên
  }

  // Cấu hình linh hoạt theo Role
  let btnConfig = { text: "", icon: <></>, colorClass: "", path: "" };

  switch (userRole) {
    case "SUPER_ADMIN":
    case "ADMIN":
      btnConfig = {
        text: "BẢNG ĐIỀU KHIỂN",
        icon: <Crown size={18} strokeWidth={2.5} className="fill-amber-500/20" />,
        colorClass: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30",
        path: "/admin/dashboard",
      };
      break;
    case "MODERATOR":
      btnConfig = {
        text: "TRUNG TÂM KIỂM DUYỆT",
        icon: <ShieldCheck size={18} strokeWidth={2.5} className="fill-violet-500/20" />,
        colorClass: "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-violet-500/30",
        path: "/moderator/dashboard",
      };
      break;
    case "PARTNER_ADMIN":
      btnConfig = {
        text: "QUẢN LÝ CƠ SỞ",
        icon: <Building2 size={18} strokeWidth={2.5} className="fill-blue-500/20" />,
        colorClass: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30",
        path: "/partner/dashboard",
      };
      break;
    case "CREATOR":
      btnConfig = {
        text: "STUDIO SÁNG TẠO",
        icon: <Sparkles size={18} strokeWidth={2.5} className="fill-rose-500/20" />,
        colorClass: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30",
        path: "/creator/dashboard",
      };
      break;
  }

  return (
    <button
      onClick={() => router.push(btnConfig.path)}
      className={`px-8 py-3 font-black rounded-2xl transition-all flex items-center gap-2 active:scale-95 text-xs uppercase tracking-widest border shadow-sm ${btnConfig.colorClass}`}
    >
      {btnConfig.icon} {btnConfig.text}
    </button>
  );
}