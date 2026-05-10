import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import BottomNavigation from "@/components/BottomNavigation";

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
          <div className="h-[100dvh] w-full overflow-hidden bg-black font-be-vietnam relative z-0 transition-colors duration-500">
              {/* Sidebar: Chuyển sang lớp nổi (Fixed) để đè lên nền Ambilight của Page */}
              <div className="hidden md:block fixed inset-y-0 left-0 z-50 pointer-events-none">
                <div className="pointer-events-auto h-full">
                  <Sidebar />
                </div>
              </div>

              {/* Vùng chứa nội dung chính: Mở rộng toàn màn hình để Video Feed làm nền cho cả Sidebar */}
              <main className="h-full w-full overflow-hidden relative bg-transparent md:pl-[300px]">
                {children}
              </main>
              {/* Thanh điều hướng Mobile (Tự động ẩn trên Desktop) */}
              <BottomNavigation />
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