"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

// 1. Thêm biến môi trường để trỏ về đúng Backend đang chạy
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface AuthContextType {
  user: any;
  userRole: string;
  isLoading: boolean;
  refreshProfile: (session?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("USER");
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (session?: any) => {
    let currentSession = session;

    // Nếu không có session truyền vào (trường hợp gọi refreshProfile), tự đi lấy
    if (!currentSession) {
      const { data } = await supabase.auth.getSession();
      currentSession = data.session;
    }

    if (currentSession?.user) {
      const currentUser = currentSession.user;
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
            const realRole = result.data?.profile?.role || "USER";
            if (realRole !== cachedRole) {
               setUserRole(realRole);
               supabase.auth.updateUser({ data: { role: realRole } });
            }
          }
        })
        .catch(e => console.error("AuthContext: Lỗi đồng bộ role ngầm", e));
    } else {
       // Reset state nếu không có session (Đăng xuất)
       setUser(null);
       setUserRole("USER");
    }
    setIsLoading(false);
  };

  useEffect(() => { 
    // 1. Chạy lần đầu khi F5
    supabase.auth.getSession().then(({ data: { session } }) => {
       loadProfile(session);
    });

    // 2. ĐẶT TRẠM GÁC LẮNG NGHE SỰ KIỆN TỰ ĐỘNG (Bảo đảm Soft Routing hoạt động)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Mỗi khi đăng nhập/đăng xuất thành công, hàm này tự động chạy
        loadProfile(session);
      }
    );

    return () => {
       authListener.subscription.unsubscribe();
    };
  }, []);

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