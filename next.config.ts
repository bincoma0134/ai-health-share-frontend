import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Bắt buộc để Capacitor có thể bọc lại thành App
  images: {
    unoptimized: true, // Tắt tối ưu ảnh của Next.js vì App không có server để xử lý
  },
};

export default nextConfig;

