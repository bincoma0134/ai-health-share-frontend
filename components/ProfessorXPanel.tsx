"use client";

import React, { useEffect, useState } from "react";
import { Crown, Sparkles, User, Building2, ShieldCheck, Activity, Eye, RefreshCw, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface RoleConfig {
  role: string;
  email: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export default function ProfessorXPanel() {
  const [isProfessorX, setIsProfessorX] = useState<boolean>(false);
  const [isOpenPanel, setIsOpenPanel] = useState<boolean>(false);
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  // Cấu hình danh sách tài khoản thực tế được ánh xạ qua luồng Auth
  const roleAccounts: RoleConfig[] = [
    { role: "SUPER_ADMIN", email: "admin.gsx@gmail.com", label: "Super Admin Tối Cao", icon: <Crown size={14} />, color: "text-red-500" },
    { role: "PARTNER_ADMIN", email: "partner.gsx@gmail.com", label: "Đối Tác Spa (Lưới Kín)", icon: <Building2 size={14} />, color: "text-amber-500" },
    { role: "CREATOR", email: "creator.gsx@gmail.com", label: "Creator Sáng Tạo", icon: <Sparkles size={14} />, color: "text-fuchsia-500" },
    { role: "MODERATOR", email: "moderator.gsx@gmail.com", label: "Ban Kiểm Duyệt", icon: <ShieldCheck size={14} />, color: "text-blue-500" },
    { role: "USER", email: "user.gsx@gmail.com", label: "Khách Hàng VIP", icon: <User size={14} />, color: "text-emerald-500" }
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkIdentity = async () => {
      const token = localStorage.getItem("ai-health-token");
      if (!token) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/user/profile`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const resData = await res.json();
        
        if (resData?.status === "success" && resData?.data?.profile) {
          const email = resData.data.profile.email;
          setCurrentEmail(email);

          // Kích hoạt bảng điều khiển nếu tài khoản thuộc hệ sinh thái gsx@gmail.com
          if (email.endsWith(".gsx@gmail.com")) {
            setIsProfessorX(true);
          }
        }
      } catch (error) {
        console.error("Professor X Authentication Verification Error:", error);
      }
    };

    checkIdentity();
  }, []);

  const handleSwitchRoleNative = async (targetEmail: string, targetLabel: string) => {
    if (targetEmail === currentEmail) {
      toast.warning("Bạn đã ở trong vai trò của tài khoản này rồi.");
      return;
    }

    setIsSwitching(true);
    const tid = toast.loading(`Hệ thống đang cấu trúc lại dữ liệu phân vai: [${targetLabel}]...`);

    try {
      // Gọi API đăng nhập thực tế của Backend, sử dụng mật khẩu master chung mà cậu chọn thiết lập ở lần đầu đăng nhập
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          password: "gsx123456" // Khớp mật khẩu master chung cho chuỗi tài khoản demo
        })
      });

      const result = await res.json();

      if (res.ok && result.access_token) {
        // Ghi đè token lưu trữ toàn cục để hệ thống NextJS nhận diện phiên làm việc mới hoàn toàn
        localStorage.setItem("ai-health-token", result.access_token);
        toast.success(`Chuyển vai thành công! Đang đồng bộ giao diện [${targetLabel}]...`, { id: tid });
        
        // Ánh xạ chính xác tuyến đường URL Dashboard theo từng Role để tối ưu tốc độ nạp UI
        let targetPath = "/";
        if (targetEmail.includes("admin.gsx")) targetPath = "/admin/dashboard";
        else if (targetEmail.includes("partner.gsx")) targetPath = "/partner/dashboard";
        else if (targetEmail.includes("creator.gsx")) targetPath = "/creator/dashboard";
        else if (targetEmail.includes("moderator.gsx")) targetPath = "/moderator/dashboard";
        else if (targetEmail.includes("user.gsx")) targetPath = "/features/calendar";

        // Thay đổi URL trực tiếp giúp trình duyệt dọn sạch bộ nhớ cache cũ và tải Sidebar mới trong 200ms
        window.location.href = targetPath;
      } else {
        throw new Error(result.detail || "Không thể thực hiện phiên đăng nhập giả lập.");
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi đồng bộ phân vai hệ thống", { id: tid });
      setIsSwitching(false);
    }
  };

  if (!isProfessorX) return null;

  const activeConfig = roleAccounts.find(account => account.email === currentEmail);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-be-vietnam">
      {/* NÚT BẤM KÍCH HOẠT QUYỀN LỰC */}
      <button 
        onClick={() => setIsOpenPanel(!isOpenPanel)}
        disabled={isSwitching}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-zinc-900 to-black border-2 border-amber-500 shadow-2xl flex items-center justify-center text-amber-500 hover:scale-110 active:scale-95 transition-all animate-bounce disabled:opacity-50"
      >
        <Crown size={26} className={isSwitching ? "animate-spin" : "animate-pulse"} />
      </button>

      {/* BẢNG ĐIỀU KHIỂN CHI TIẾT */}
      {isOpenPanel && (
        <div className="absolute bottom-18 right-0 w-80 bg-zinc-950/95 backdrop-blur-xl border border-amber-500/30 p-6 rounded-[2rem] shadow-2xl space-y-5 text-white">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                <Sparkles size={16} /> Giáo Sư X Panel
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">Cố Vấn Cấp Cao & Trưởng Ban Kiểm Thử</p>
            </div>
            <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center gap-1">
              <Activity size={10} className="text-amber-500 animate-spin" />
              <span className="text-[9px] font-black text-amber-500 uppercase">Native</span>
            </div>
          </div>

          {/* HIỂN THỊ TRẠNG THÁI HIỆN TẠI */}
          <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 flex flex-col gap-1">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Tài khoản hiện tại:</span>
            <span className="text-xs font-bold text-white truncate">{currentEmail}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${activeConfig?.color || "text-zinc-400"}`}>
              Role: {activeConfig?.role || "UNKNOWN"}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Kích hoạt đặc quyền đổi vai:</p>
            
            {roleAccounts.map((item) => (
              <button
                key={item.role}
                onClick={() => handleSwitchRoleNative(item.email, item.label)}
                disabled={isSwitching}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all disabled:opacity-40 ${
                  currentEmail === item.email 
                    ? "bg-amber-500 text-zinc-950 border-amber-500 shadow-lg shadow-amber-500/10 font-black" 
                    : "bg-zinc-900/50 text-zinc-300 border-white/5 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={currentEmail === item.email ? "text-zinc-950" : "text-zinc-400"}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {currentEmail === item.email && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-950 text-amber-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Eye size={10} /> Active
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-white/5 text-center">
            <p className="text-[9px] font-medium text-zinc-500 flex items-center justify-center gap-1">
              <KeyRound size={10} /> Đăng nhập bảo mật thực tế bằng luồng Auth hệ thống
            </p>
          </div>
        </div>
      )}
    </div>
  );
}