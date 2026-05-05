"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

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
      const currentUser = session.user;
      setUser(currentUser);
      
      // 2. Xác thực tức thì từ JWT Metadata (Tốc độ mili giây)
      const cachedRole = currentUser.user_metadata?.role || "USER";
      setUserRole(cachedRole);

      // 3. Chạy ngầm đồng bộ với Backend (Không block UI)
      fetch(`${API_URL}/user/profile`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })
        .then(res => res.json())
        .then(result => {
          if (result.status === "success") {
            // Lấy Role một cách an toàn từ kết quả trả về của RPC
            const realRole = result.data?.profile?.role || "USER";
            
            if (realRole !== cachedRole) {
               setUserRole(realRole);
               // Tự động cập nhật lại Metadata nếu phát hiện sai lệch so với DB
               supabase.auth.updateUser({ data: { role: realRole } });
            }
          }
        })
        .catch(e => console.error("AuthContext: Lỗi đồng bộ role ngầm", e));
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