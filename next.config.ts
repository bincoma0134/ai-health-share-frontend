/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nếu đang chạy build trên Vercel thì tắt export, nếu chạy ở máy Mỹ thì giữ export để nén App
  output: process.env.VERCEL ? undefined : 'export', 
  
  // Các cấu hình khác giữ nguyên...
  images: { unoptimized: true } 
};

module.exports = nextConfig;