import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { UIProvider } from "@/context/UIContext";
import NotificationModal from "@/components/NotificationModal";

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
        <UIProvider>
          {children}
          <NotificationModal />
        </UIProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}