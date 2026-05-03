"use client";

import { useState, useEffect, useRef } from "react";
import { X, Mail, Lock, ShieldCheck, User as UserIcon, Phone, Smartphone, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useUI } from "@/context/UIContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type AuthStep = "LOGIN" | "REGISTER_CREDENTIALS" | "VERIFY_OTP" | "SETUP_PROFILE";

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen } = useUI();
  const router = useRouter();
  
  const [authMode, setAuthMode] = useState<AuthStep>("LOGIN");
  const [loginMethod, setLoginMethod] = useState<"EMAIL" | "PHONE">("EMAIL");
  
  const [identifier, setIdentifier] = useState(""); 
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [otpValues, setOtpValues] = useState<string[]>(Array(8).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [pwdStrength, setPwdStrength] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isAuthModalOpen) return null;

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

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; 
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);
    if (value !== "" && index < 7) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (pastedData) {
      const newOtp = [...otpValues];
      for (let i = 0; i < pastedData.length; i++) newOtp[i] = pastedData[i];
      setOtpValues(newOtp);
      otpRefs.current[pastedData.length < 8 ? pastedData.length : 7]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    const toastId = toast.loading("Đang gửi lại mã OTP...");
    try {
      // FIX TYPESCRIPT: Chia tách rõ ràng cấu trúc payload
      const resendPayload = loginMethod === "EMAIL" 
        ? { email: email, type: 'signup' as const } 
        : { phone: phone, type: 'sms' as const };

      const { error } = await supabase.auth.resend(resendPayload);

      if (error) throw error;
      toast.success("Đã gửi lại mã OTP mới!", { id: toastId });
      setCountdown(60);
      setOtpValues(Array(8).fill("")); 
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Đang xử lý yêu cầu...");

    try {
      if (authMode === "LOGIN") {
        const res = await fetch(`${API_URL}/auth/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Không tìm thấy tài khoản");

        // Thay vì chỉ bắt lỗi, ta lấy thêm authData để trích xuất username[cite: 13]
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email: data.email, password });
        if (error) throw error;
        toast.success("Chào mừng bạn trở lại!", { id: toastId });
        setIsAuthModalOpen(false);
        
        // Điều hướng thẳng về profile của user đó[cite: 13]
        const loggedInUsername = authData?.user?.user_metadata?.username;
        // Cho trình duyệt 800ms để Supabase ghi Session Cookie hoàn tất trước khi chuyển trang
        setTimeout(() => {
            if (loggedInUsername) {
                window.location.href = `/user-profile?u=${loggedInUsername}`;
            } else {
                window.location.reload(); 
            }
        }, 800);

      } else if (authMode === "REGISTER_CREDENTIALS") {
        if (pwdStrength < 30) throw new Error("Mật khẩu quá yếu!");
        if (password !== confirmPassword) throw new Error("Mật khẩu xác nhận không khớp!");

        // FIX TYPESCRIPT: Tách biệt cấu trúc Đăng ký
        const signUpPayload = loginMethod === "EMAIL"
            ? { email: email, password }
            : { phone: phone, password };

        const { error } = await supabase.auth.signUp(signUpPayload);
        
        if (error) throw error;
        toast.success("Mã xác nhận đã được gửi!", { id: toastId });
        setCountdown(60); 
        setAuthMode("VERIFY_OTP");

      } else if (authMode === "VERIFY_OTP") {
        const finalOtp = otpValues.join("");
        if (finalOtp.length < 8) throw new Error("Vui lòng nhập đủ 8 số OTP!");

        // FIX TYPESCRIPT: Tách biệt cấu trúc Xác thực OTP
        const verifyPayload = loginMethod === "EMAIL"
            ? { email: email, token: finalOtp, type: 'signup' as const }
            : { phone: phone, token: finalOtp, type: 'sms' as const };

        const { error } = await supabase.auth.verifyOtp(verifyPayload);

        if (error) throw error;
        toast.success("Xác thực thành công! Hãy thiết lập hồ sơ.", { id: toastId });
        setAuthMode("SETUP_PROFILE");

      } else if (authMode === "SETUP_PROFILE") {
        if (!username || !fullName) throw new Error("Vui lòng nhập đầy đủ thông tin!");

        const checkRes = await fetch(`${API_URL}/auth/check-username`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });
        const checkData = await checkRes.json();
        if (!checkRes.ok) throw new Error(checkData.detail);

        const { error } = await supabase.auth.updateUser({
          data: { username, full_name: fullName, phone: loginMethod === "PHONE" ? phone : "" }
        });

        if (error) throw error;
        toast.success("Khởi tạo tài khoản hoàn tất!", { id: toastId });
        setIsAuthModalOpen(false);
        
        // Chờ Cookie được ghi lại sau khi update thông tin
        setTimeout(() => {
            window.location.href = `/user-profile?u=${username}`;
        }, 800);
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

            {authMode === "VERIFY_OTP" && (
                <div className="space-y-6 animate-slide-up">
                    <div className="p-4 rounded-2xl bg-[#80BF84]/10 border border-[#80BF84]/20 text-slate-700 dark:text-zinc-300 text-sm font-medium text-center">
                        Mã xác thực đã được gửi tới <br/><b className="text-[#80BF84] text-base">{loginMethod === "EMAIL" ? email : phone}</b>
                    </div>
                    
                    <div className="flex justify-between gap-1 sm:gap-2" onPaste={handleOtpPaste}>
                        {otpValues.map((value, index) => (
                            <input
                                key={index}
                                ref={el => { otpRefs.current[index] = el; }}
                                type="text"
                                maxLength={1}
                                className="w-9 h-12 md:w-11 md:h-14 text-center text-lg md:text-xl font-black bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] focus:ring-1 focus:ring-[#80BF84]/50 transition-all"
                                value={value}
                                onChange={e => handleOtpChange(index, e.target.value)}
                                onKeyDown={e => handleOtpKeyDown(index, e)}
                            />
                        ))}
                    </div>

                    <div className="flex justify-between items-center px-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Chưa nhận được mã?</span>
                        <button 
                            type="button" 
                            onClick={handleResendOtp}
                            disabled={countdown > 0}
                            className="text-xs font-bold text-[#80BF84] disabled:text-slate-400 dark:disabled:text-zinc-600 hover:underline transition-all"
                        >
                            {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã OTP"}
                        </button>
                    </div>
                </div>
            )}

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
                    <div className="pt-2">
                      <p className="text-[11px] text-slate-500 font-medium">* Các thông tin như Ngày sinh, Giới tính có thể cập nhật sau.</p>
                    </div>
                </div>
            )}

            <button type="submit" disabled={loading || (authMode === "REGISTER_CREDENTIALS" && pwdStrength < 30) || (authMode === "VERIFY_OTP" && otpValues.join("").length < 8)} className="w-full py-4 mt-2 bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-black text-lg rounded-2xl disabled:opacity-50 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3">
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
                    type="button"
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
                  <button type="button" onClick={() => setAuthMode(authMode === "LOGIN" ? "REGISTER_CREDENTIALS" : "LOGIN")} className="ml-2 text-[#80BF84] font-black hover:underline underline-offset-4 transition-all">
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