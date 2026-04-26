"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// 1. Thêm biến môi trường để trỏ về đúng Backend đang chạy
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface AuthContextType {
  user: any;
  userRole: string;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      try {
        // 2. Sửa lại đường dẫn fetch để gọi về Backend Local
        const res = await fetch(`${API_URL}/user/profile`, {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const result = await res.json();
        if (result.status === "success") {
          setUserRole(result.data.profile.role);
        } else {
            console.error("Backend trả về lỗi:", result);
        }
      } catch (e) { 
          // Log rõ lỗi ra để dễ kiểm soát thay vì chỉ in string cứng
          console.error("AuthContext: Lỗi fetch role", e); 
      }
    }
    setIsLoading(false);
  };

  useEffect(() => { loadProfile(); }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, isLoading, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được dùng trong AuthProvider");
  return context;
};