import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// IMPORT ĐẦY ĐỦ CÁC CÔNG CỤ VÀ COMPONENT TOÀN CỤC
import { UIProvider } from "@/context/UIContext";
import { AuthProvider } from "@/context/AuthContext";
import NotificationModal from "@/components/NotificationModal";
import AuthModal from "@/components/AuthModal";
import Sidebar from "@/components/Sidebar";

const beVietnam = Be_Vietnam_Pro({ 
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam", 
});

export const metadata: Metadata = {
  title: "AI Health Share",
  description: "Nền tảng sức khỏe toàn diện - Bảo chứng Escrow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${beVietnam.variable} antialiased`}>
        {/* Bọc toàn bộ ứng dụng bằng các Provider */}
        <AuthProvider>
          <UIProvider>
            <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-50 dark:bg-black font-be-vietnam">
              {/* Sidebar thông minh dùng chung */}
              <Sidebar />
              {/* Vùng chứa nội dung các trang tính năng */}
              <main className="flex-1 h-full overflow-hidden relative">
                {children}
              </main>
            </div>
            
            {/* Các Modal nổi ở cấp cao nhất */}
            <NotificationModal />
            <AuthModal />
          </UIProvider>
        </AuthProvider>
        
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}