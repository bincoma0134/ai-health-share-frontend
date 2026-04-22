"use client";

import { useState } from "react";
import { X, Mail, Lock, ShieldCheck, User as UserIcon, Phone } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useUI } from "@/context/UIContext";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen } = useUI();
  
  // States quản lý luồng mới
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER" | "SET_USERNAME">("LOGIN");
  const [identifier, setIdentifier] = useState(""); // Cho Login: Email/Phone/Username
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [pwdStrength, setPwdStrength] = useState(0);

  // Thuật toán tính độ mạnh mật khẩu real-time
  const evaluatePassword = (val: string) => {
    setPassword(val);
    let score = 0;
    if (val.length >= 6) score += 30; // Tiêu chí tối thiểu
    if (val.length >= 8) score += 20;
    if (/[A-Z]/.test(val)) score += 20;
    if (/[0-9]/.test(val)) score += 15;
    if (/[^A-Za-z0-9]/.test(val)) score += 15;
    setPwdStrength(Math.min(score, 100));
  };

  if (!isAuthModalOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Đang xử lý yêu cầu...");

    try {
      if (authMode === "LOGIN") {
        // BƯỚC 1: Phân giải Email từ Username/Phone qua Backend
        const res = await fetch("http://localhost:8000/auth/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);

        // BƯỚC 2: Đăng nhập bằng Email đã phân giải
        const { error } = await supabase.auth.signInWithPassword({ email: data.email, password });
        if (error) throw error;
        toast.success("Chào mừng bạn trở lại!", { id: toastId });
        setIsAuthModalOpen(false);
        window.location.reload();

      } else if (authMode === "REGISTER") {
        if (pwdStrength < 30) throw new Error("Mật khẩu phải có ít nhất 6 ký tự!");
        // Tạo tài khoản
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { phone } } });
        if (error) throw error;
        toast.success("Khởi tạo thành công! Vui lòng chọn Username.", { id: toastId });
        setAuthMode("SET_USERNAME"); // Chuyển sang bước ép nhập Username

      } else if (authMode === "SET_USERNAME") {
        // Gọi Backend để lưu Username
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Mất phiên đăng nhập, vui lòng tải lại trang.");

        const res = await fetch("http://localhost:8000/auth/set-username", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);

        toast.success("Hoàn tất thiết lập hồ sơ!", { id: toastId });
        setIsAuthModalOpen(false);
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl animate-fade-in" onClick={() => setIsAuthModalOpen(false)} />
      
      <div className="relative w-full max-w-md bg-white/90 dark:bg-zinc-950/90 backdrop-blur-3xl rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-[#80BF84] to-transparent shadow-[0_0_20px_rgba(128,191,132,0.8)]" />

        <div className="p-8 md:p-10 flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{authMode === "LOGIN" ? "Đăng nhập" : "Tham gia mạng lưới"}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">Hệ thống bảo chứng sức khỏe AI Health.</p>
            </div>
            <button onClick={() => setIsAuthModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"><X size={24}/></button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* --- GIAO DIỆN ĐĂNG NHẬP --- */}
            {authMode === "LOGIN" && (
              <>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                  <input type="text" placeholder="Email, Số điện thoại hoặc Username" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                  <input type="password" placeholder="Mật khẩu" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </>
            )}

            {/* --- GIAO DIỆN ĐĂNG KÝ (BƯỚC 1) --- */}
            {authMode === "REGISTER" && (
              <>
                <div className="flex gap-3">
                    <div className="relative group flex-1">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={18} />
                      <input type="email" placeholder="Email" className="w-full pl-11 pr-4 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="relative group flex-1">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={18} />
                      <input type="tel" placeholder="Số điện thoại" className="w-full pl-11 pr-4 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                  <input type="password" placeholder="Tạo mật khẩu (Tối thiểu 6 ký tự)" className="w-full pl-12 pr-5 pt-4 pb-6 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={password} onChange={e => evaluatePassword(e.target.value)} required />
                  
                  {/* Thanh đo độ mạnh mật khẩu */}
                  <div className="absolute bottom-2 left-12 right-5 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${pwdStrength < 40 ? 'bg-rose-500' : pwdStrength < 70 ? 'bg-amber-400' : 'bg-[#80BF84]'}`} style={{ width: `${pwdStrength}%` }}></div>
                  </div>
                </div>
              </>
            )}

            {/* --- GIAO DIỆN CHỌN USERNAME (BƯỚC 2) --- */}
            {authMode === "SET_USERNAME" && (
              <div className="relative group animate-fade-in">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                <input type="text" placeholder="Tạo Username duy nhất của bạn" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={username} onChange={e => setUsername(e.target.value)} required />
                <p className="text-[10px] text-slate-500 mt-2 px-1">*Username dùng để hiển thị trên Cộng đồng và Link Affiliate.</p>
              </div>
            )}

            <button type="submit" disabled={loading || (authMode === "REGISTER" && pwdStrength < 30)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-black text-lg rounded-2xl disabled:opacity-50 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-slate-400 border-t-white dark:border-zinc-300 dark:border-t-zinc-900 rounded-full animate-spin"/> : <ShieldCheck size={20}/>}
              {authMode === "LOGIN" ? "Xác thực truy cập" : authMode === "REGISTER" ? "Khởi tạo tài khoản" : "Hoàn tất"}
            </button>
          </form>

          <div className="my-8 relative text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/10"></div></div>
            <span className="relative px-4 bg-white/0 dark:bg-zinc-950/0 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Hoặc kết nối qua</span>
          </div>

          <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          <p className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-zinc-400">
            {authMode === "LOGIN" ? "Chưa có định danh?" : "Đã là thành viên?"}
            <button
              onClick={() => setAuthMode(authMode === "LOGIN" ? "REGISTER" : "LOGIN")}
              className="ml-2 text-[#80BF84] font-black hover:underline underline-offset-4 transition-all"
            >
              {authMode === "LOGIN" ? "Đăng ký ngay" : "Đăng nhập tại đây"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}