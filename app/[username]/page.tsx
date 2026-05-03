import UserProfileClient from "./UserProfileClient";

// Mẹo đánh lừa Next.js khi nén App: Tạo sẵn 1 đường dẫn ảo
export function generateStaticParams() {
  return [{ username: "admin" }]; 
}

export default function UserProfilePage() {
  return <UserProfileClient />;
}