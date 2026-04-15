import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner"; // Nhúng thư viện Toast
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cập nhật lại Tiêu đề và Mô tả cho chuyên nghiệp
export const metadata: Metadata = {
  title: "AI Health Share",
  description: "Nền tảng Escrow & Affiliate Y tế tự động",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi" // Đổi sang tiếng Việt
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* HỆ THỐNG THÔNG BÁO TOAST GLOBALS */}
        <Toaster position="top-center" richColors theme="dark" />
        
        {children}
      </body>
    </html>
  );
}