"use client";

import { useState } from "react";
import { X, Mail, Lock, ShieldCheck, User as UserIcon, Phone, Smartphone, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useUI } from "@/context/UIContext";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type AuthStep = "LOGIN" | "REGISTER_CREDENTIALS" | "VERIFY_OTP" | "SETUP_PROFILE";

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen } = useUI();
  
  // Quản lý luồng (Wizard Steps)
  const [authMode, setAuthMode] = useState<AuthStep>("LOGIN");
  const [loginMethod, setLoginMethod] = useState<"EMAIL" | "PHONE">("EMAIL");
  
  // Dữ liệu Form
  const [identifier, setIdentifier] = useState(""); 
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [pwdStrength, setPwdStrength] = useState(0);

  if (!isAuthModalOpen) return null;

  // Thuật toán đo mật khẩu
  const evaluatePassword = (val: string) => {
    setPassword(val);
    let score = 0;
    if (val.length >= 6) score += 30; 
    if (val.length >= 8) score += 20;
    if (/[A-Z]/.test(val)) score += 20;
    if (/[0-9]/.test(val)) score += 15;
    if (/[^A-Za-z0-9]/.test(val)) score += 15;
    setPwdStrength(Math.min(score, 100));
  };

  const getStrengthLabel = () => {
    if (pwdStrength === 0) return { text: "", color: "bg-slate-200 dark:bg-zinc-800" };
    if (pwdStrength < 50) return { text: "Yếu", color: "bg-rose-500" };
    if (pwdStrength < 80) return { text: "Khá", color: "bg-amber-400" };
    return { text: "Mạnh", color: "bg-[#80BF84]" };
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Đang xử lý yêu cầu...");

    try {
      if (authMode === "LOGIN") {
        // --- LUỒNG ĐĂNG NHẬP ---
        const res = await fetch(`${API_URL}/auth/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Không tìm thấy tài khoản");

        const { error } = await supabase.auth.signInWithPassword({ email: data.email, password });
        if (error) throw error;
        toast.success("Chào mừng bạn trở lại!", { id: toastId });
        setIsAuthModalOpen(false);
        window.location.reload();

      } else if (authMode === "REGISTER_CREDENTIALS") {
        // --- BƯỚC 1: TẠO MẬT KHẨU & GỬI OTP ---
        if (pwdStrength < 30) throw new Error("Mật khẩu quá yếu!");
        if (password !== confirmPassword) throw new Error("Mật khẩu xác nhận không khớp!");

        const signUpPayload =
          loginMethod === "EMAIL"
            ? { email, password }
            : { phone, password };

        const { error } = await supabase.auth.signUp(signUpPayload);
        
        if (error) throw error;
        toast.success("Mã xác nhận đã được gửi!", { id: toastId });
        setAuthMode("VERIFY_OTP");

      } else if (authMode === "VERIFY_OTP") {
        // --- BƯỚC 2: XÁC THỰC OTP ---
        if (otp.length < 6) throw new Error("Mã OTP không hợp lệ!");

        const verifyPayload =
          loginMethod === "EMAIL"
            ? { email, token: otp, type: "signup" as const }
            : { phone, token: otp, type: "sms" as const };

        const { error } = await supabase.auth.verifyOtp(verifyPayload);

        if (error) throw error;
        toast.success("Xác thực thành công! Hãy thiết lập hồ sơ.", { id: toastId });
        setAuthMode("SETUP_PROFILE");

      } else if (authMode === "SETUP_PROFILE") {
        // --- BƯỚC 3: CẬP NHẬT HỒ SƠ ---
        if (!username || !fullName) throw new Error("Vui lòng điền đủ thông tin!");

        // Check Username từ Backend
        const checkRes = await fetch(`${API_URL}/auth/check-username`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });
        const checkData = await checkRes.json();
        if (!checkRes.ok) throw new Error(checkData.detail);

        // Lưu thông tin vào phiên đăng nhập hiện tại
        const { error } = await supabase.auth.updateUser({
            data: { username, full_name: fullName, phone: loginMethod === "PHONE" ? phone : "" }
        });

        if (error) throw error;
        toast.success("Khởi tạo tài khoản hoàn tất!", { id: toastId });
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
      
      <div className="relative w-full max-w-md bg-white/90 dark:bg-zinc-950/90 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-slide-up">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-[#80BF84] to-transparent shadow-[0_0_20px_rgba(128,191,132,0.8)]" />

        <div className="p-8 md:p-10 flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar">
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {authMode === "LOGIN" ? "Đăng nhập" : "Tham gia mạng lưới"}
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {authMode === "VERIFY_OTP" ? "Nhập mã bảo mật để tiếp tục." : 
                 authMode === "SETUP_PROFILE" ? "Định hình danh tính của bạn." : 
                 "Hệ thống bảo chứng sức khỏe AI Health."}
              </p>
            </div>
            <button onClick={() => setIsAuthModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"><X size={20}/></button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* =========================================
                MÀN HÌNH ĐĂNG NHẬP
            ========================================= */}
            {authMode === "LOGIN" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                    <input type="text" placeholder="Email, SĐT hoặc Username" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                    <input type="password" placeholder="Mật khẩu" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
            )}

            {/* =========================================
                BƯỚC 1: NHẬP EMAIL & MẬT KHẨU
            ========================================= */}
            {authMode === "REGISTER_CREDENTIALS" && (
                <div className="space-y-4 animate-fade-in">
                  {loginMethod === "EMAIL" ? (
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                        <input type="email" placeholder="Nhập Email của bạn" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={email} onChange={e => setEmail(e.target.value)} required />
                      </div>
                  ) : (
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                        <input type="tel" placeholder="Nhập Số điện thoại" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={phone} onChange={e => setPhone(e.target.value)} required />
                      </div>
                  )}

                  <div className="relative group">
                    <Lock className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                    <input type="password" placeholder="Tạo mật khẩu (Tối thiểu 6 ký tự)" className="w-full pl-12 pr-5 pt-3 pb-6 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={password} onChange={e => evaluatePassword(e.target.value)} required />
                    
                    {/* Thanh đo độ mạnh mật khẩu */}
                    <div className="absolute bottom-2 left-12 right-5 flex items-center gap-2">
                        <div className="flex-1 flex gap-1 h-1.5">
                            <div className={`flex-1 rounded-full transition-all duration-300 ${pwdStrength > 0 ? getStrengthLabel().color : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                            <div className={`flex-1 rounded-full transition-all duration-300 ${pwdStrength >= 50 ? getStrengthLabel().color : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                            <div className={`flex-1 rounded-full transition-all duration-300 ${pwdStrength >= 80 ? getStrengthLabel().color : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                        </div>
                        <span className={`text-[9px] font-black uppercase w-10 text-right ${pwdStrength > 0 ? 'text-slate-600 dark:text-zinc-300' : 'text-transparent'}`}>{getStrengthLabel().text}</span>
                    </div>
                  </div>

                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                    <input type="password" placeholder="Xác nhận lại mật khẩu" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  </div>
                </div>
            )}

            {/* =========================================
                BƯỚC 2: NHẬP MÃ OTP
            ========================================= */}
            {authMode === "VERIFY_OTP" && (
                <div className="space-y-4 animate-slide-up">
                    <div className="p-4 rounded-2xl bg-[#80BF84]/10 border border-[#80BF84]/20 text-[#80BF84] text-sm font-medium mb-4">
                        Mã xác thực gồm 6 chữ số đã được gửi tới <b>{loginMethod === "EMAIL" ? email : phone}</b>.
                    </div>
                    <div className="relative group">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                        <input type="text" placeholder="Nhập mã OTP (6 số)" maxLength={6} className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-black tracking-[0.5em] focus:outline-none focus:border-[#80BF84] transition-all" value={otp} onChange={e => setOtp(e.target.value)} required />
                    </div>
                </div>
            )}

            {/* =========================================
                BƯỚC 3: THIẾT LẬP HỒ SƠ 
            ========================================= */}
            {authMode === "SETUP_PROFILE" && (
                <div className="space-y-4 animate-slide-up">
                    <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                        <input type="text" placeholder="Tạo Username (Duy nhất)" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#80BF84] transition-colors" size={20} />
                        <input type="text" placeholder="Tên hiển thị (Ví dụ: Nguyễn Văn A)" className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#80BF84] transition-all" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    {/* Placeholder cho tương lai */}
                    <div className="pt-2">
                      <p className="text-[11px] text-slate-500 font-medium">* Các thông tin như Ngày sinh, Sở thích có thể bổ sung sau trong phần Cài đặt.</p>
                    </div>
                </div>
            )}

            {/* NÚT SUBMIT ĐỘNG */}
            <button type="submit" disabled={loading || (authMode === "REGISTER_CREDENTIALS" && pwdStrength < 30)} className="w-full py-4 mt-2 bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-black text-lg rounded-2xl disabled:opacity-50 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3">
              {loading ? <div className="w-5 h-5 border-2 border-slate-400 border-t-white dark:border-zinc-300 dark:border-t-zinc-900 rounded-full animate-spin"/> : 
                authMode === "LOGIN" ? <ShieldCheck size={20}/> :
                authMode === "VERIFY_OTP" ? <CheckCircle2 size={20}/> :
                <ArrowRight size={20}/>
              }
              {authMode === "LOGIN" ? "Xác thực truy cập" : 
               authMode === "VERIFY_OTP" ? "Xác nhận OTP" : 
               authMode === "SETUP_PROFILE" ? "Hoàn tất hồ sơ" : 
               "Tiếp tục"}
            </button>
          </form>

          {/* CHỈ HIỆN CÁC TÙY CHỌN KHÁC Ở MÀN ĐẦU TIÊN */}
          {(authMode === "LOGIN" || authMode === "REGISTER_CREDENTIALS") && (
              <>
                <div className="my-6 relative text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/10"></div></div>
                  <span className="relative px-4 bg-white dark:bg-zinc-950 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Hoặc kết nối qua</span>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleGoogleLogin} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </button>
                  
                  <button 
                    onClick={() => {
                        setAuthMode("REGISTER_CREDENTIALS");
                        setLoginMethod(loginMethod === "EMAIL" ? "PHONE" : "EMAIL");
                    }} 
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all group"
                  >
                    {loginMethod === "EMAIL" ? <Smartphone size={16} className="text-slate-500 group-hover:text-[#80BF84] transition-colors"/> : <Mail size={16} className="text-slate-500 group-hover:text-[#80BF84] transition-colors"/>}
                    {loginMethod === "EMAIL" ? "Số điện thoại" : "Dùng Email"}
                  </button>
                </div>

                <p className="mt-6 text-center text-sm font-medium text-slate-500 dark:text-zinc-400">
                  {authMode === "LOGIN" ? "Chưa có định danh?" : "Đã là thành viên?"}
                  <button onClick={() => setAuthMode(authMode === "LOGIN" ? "REGISTER_CREDENTIALS" : "LOGIN")} className="ml-2 text-[#80BF84] font-black hover:underline underline-offset-4 transition-all">
                    {authMode === "LOGIN" ? "Đăng ký ngay" : "Đăng nhập tại đây"}
                  </button>
                </p>
              </>
          )}
        </div>
      </div>
    </div>
  );
}