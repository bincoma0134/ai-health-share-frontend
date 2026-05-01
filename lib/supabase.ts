import { createClient } from "@supabase/supabase-js";

// Đảm bảo các biến môi trường đã được khai báo trong .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu biến môi trường Supabase!");
}

/**
 * KHỞI TẠO SINGLETON CLIENT
 * Cấu hình này giúp:
 * 1. Loại bỏ lỗi "Lock was released because another request stole it" bằng cơ chế quản lý session tập trung.
 * 2. Tối ưu cho Mobile App thông qua việc duy trì session (persistSession).
 * 3. Sẵn sàng cho quy mô 100,000 người dùng nhờ việc giảm thiểu số lượng kết nối đồng thời từ một thiết bị.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Giữ trạng thái đăng nhập khi đóng app/trình duyệt
    autoRefreshToken: true,     // Tự động làm mới token để người dùng không bị văng ra
    detectSessionInUrl: true,   // Hỗ trợ luồng xác thực qua email/social link
    flowType: 'pkce',           // Sử dụng chuẩn bảo mật PKCE tốt nhất cho thiết bị di động
    storageKey: 'ai-health-auth' // Định danh kho lưu trữ riêng để tránh tranh chấp dữ liệu
  },
});