import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'export',
  images: { 
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-aa98d811ddf846eaa1ff90eebea1ea78.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  }
}
 
export default nextConfig