import UserProfileClient from "./UserProfileClient";

// Cho phép Vercel tạo trang động cho những người dùng không nằm trong list static
export const dynamicParams = true; 

// Giữ nguyên để đánh lừa bộ nén APK
export function generateStaticParams() {
  return [{ username: "admin" }]; 
}

// BẮT BUỘC: Chuyển sang async để await params (Chuẩn Next.js 15+)
export default async function UserProfilePage({ 
  params 
}: { 
  params: Promise<{ username: string }> 
}) {
  const resolvedParams = await params; // Giải mã Promise để lấy username thực tế
  
  return <UserProfileClient params={resolvedParams} />;
}