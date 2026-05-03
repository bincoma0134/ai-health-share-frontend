// Nhớ đổi tên file page.tsx (logic cũ) thành UserProfileClient.tsx nhé!
import UserProfileClient from "./UserProfileClient";

// ❌ Đã xóa dòng: export const dynamic = 'force-dynamic' 
// 👉 Để Next.js tự động linh hoạt: Lên Vercel thì chạy động, Build APK thì chạy tĩnh.

// Mẹo đánh lừa Next.js khi nén App: Tạo sẵn 1 đường dẫn ảo cho "admin"
export function generateStaticParams() {
  return [{ username: "admin" }]; 
}

// BẮT BUỘC: Hứng { params } từ URL và truyền xuống cho Client Component 
// để tránh lỗi "đứt gãy logic" (mất params.username) mà Mỹ gặp lúc chiều.
export default function UserProfilePage({ params }: { params: { username: string } }) {
  return <UserProfileClient params={params} />;
}