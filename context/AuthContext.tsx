"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

  const refreshProfile = async (explicitToken?: string) => {
    setIsLoading(true);
    const token = explicitToken || (typeof window !== "undefined" ? localStorage.getItem("ai-health-token") : null);
    if (!token) {
      setUser(null);
      setUserRole("USER");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.status === "success" && result.data?.profile) {
        const profile = result.data.profile;
        // Đúc lại object user chuẩn hóa thông tin để đánh lừa các file frontend khác không bị lỗi cấu trúc dữ liệu
        setUser({
          ...profile,
          id: profile.id,
          email: profile.email,
          user_metadata: { role: profile.role }
        });
        setUserRole(profile.role || "USER");
      } else {
        if (typeof window !== "undefined") localStorage.removeItem("ai-health-token");
        setUser(null);
        setUserRole("USER");
      }
    } catch (e) {
      console.error("AuthContext: Lỗi đồng bộ profile", e);
      setUser(null);
      setUserRole("USER");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được dùng trong AuthProvider");
  return context;
};