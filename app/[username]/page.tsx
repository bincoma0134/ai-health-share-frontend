"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar"; 
import NotificationModal from "@/components/NotificationModal";
import RegularUserView from "@/components/profile/RegularUserView";
import { useUI } from "@/context/UIContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function UserProfilePage() {
  const { username } = useParams();
  const { isNotifOpen } = useUI();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await fetch(`${API_URL}/user/public/${username}`);
        const result = await res.json();
        if (result.status === "success") setData(result.data);
      } catch (err) {
        console.error("Lỗi tải hồ sơ:", err);
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchProfileData();
  }, [username]);

  if (loading) return <div className="h-screen flex items-center justify-center dark:bg-zinc-950 text-[#80BF84] font-black text-2xl animate-pulse">AI HEALTH IS LOADING...</div>;
  if (!data) return <div className="h-screen flex items-center justify-center dark:bg-zinc-950 text-white">Người dùng không tồn tại!</div>;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 overflow-hidden font-be-vietnam">
      
      {/* 1. Sidebar Hệ thống */}
      <Sidebar />

      {/* 2. Main Scroll Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative">
        
        {/* Header ẩn/hiện Modal Thông báo nếu cần */}
        {isNotifOpen && <NotificationModal />}

        <div className="max-w-4xl mx-auto p-6 md:p-12 pb-32">
          {/* Render Giao diện USER */}
          <RegularUserView 
            profile={data.profile} 
            posts={data.posts} 
            // likedPosts={data.likedPosts} // Sau này truyền dữ liệu thật từ Backend
            // savedPosts={data.savedPosts}
          />
        </div>
      </main>

    </div>
  );
}