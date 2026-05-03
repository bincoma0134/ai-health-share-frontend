"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sun, Moon, Bell } from "lucide-react";
import NotificationModal from "@/components/NotificationModal";
import RegularUserView from "@/components/profile/RegularUserView";
import CreatorView from "@/components/profile/CreatorView";
import PartnerView from "@/components/profile/PartnerView";
import ModeratorView from "@/components/profile/ModeratorView";
import AdminView from "@/components/profile/AdminView"; 
import GuestProfileView from "@/components/profile/GuestProfileView";
import { useUI } from "@/context/UIContext";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const username = params.username;
  const { isNotifOpen, setIsNotifOpen } = useUI() as any;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (username === "guest") {
        setLoading(false);
        return;
      }
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

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    setTheme(nextTheme);
  };

  if (loading) return null; 

  if (username === "guest") {
    return (
      <div className="flex-1 relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 overflow-hidden font-be-vietnam">
         <GuestProfileView />
      </div>
    );
  }

  if (!data) return (
    <div className="h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white font-black text-xl uppercase tracking-tighter">
      NGƯỜI DÙNG KHÔNG TỒN TẠI!
    </div>
  );

  return (
    <div className="flex-1 relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 overflow-hidden font-be-vietnam">
      
      {/* Top Bar */}
      <div className="absolute top-0 w-full z-40 p-6 flex justify-end items-center bg-gradient-to-b from-slate-50 dark:from-zinc-950 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
              <button onClick={handleToggleTheme} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 active:scale-95 transition-all shadow-lg shadow-black/5 group">
                  {theme === "dark" ? <Sun size={20} className="group-hover:text-amber-300 transition-colors" /> : <Moon size={20} className="group-hover:text-blue-500 transition-colors" />}
              </button>
              <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#80BF84] hover:bg-[#80BF84]/10 active:scale-95 transition-all shadow-lg shadow-black/5">
                  <Bell size={20} />
              </button>
          </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {isNotifOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 dark:bg-black/40 backdrop-blur-sm animate-fade-in">
                <NotificationModal />
            </div>
          )}

          <div className="max-w-4xl mx-auto p-6 md:p-12 pt-28 pb-32">
            {/* BẮT BUỘC TRUYỀN CẢ VIDEOS VÀ POSTS VÀO COMPONENTS */}
            {data.profile.role === "SUPER_ADMIN" || data.profile.role === "ADMIN" ? (
              <AdminView 
                profile={data.profile} 
                videos={data.videos || []} 
                posts={data.community_posts || []} 
                savedPosts={data.savedPosts || []}
              />
            ) : data.profile.role === "PARTNER_ADMIN" || data.profile.role === "PARTNER" ? (
              <PartnerView 
                profile={data.profile} 
                videos={data.videos || []}
                posts={data.community_posts || []} 
                likedPosts={data.likedPosts || []}
                savedPosts={data.savedPosts || []}
                services={data.services || []} 
                reviews={data.reviews || []}
                stats={data.stats || {}}
              />
            ) : data.profile.role === "CREATOR" ? (
              <CreatorView 
                profile={data.profile} 
                videos={data.videos || []}
                posts={data.community_posts || []} 
                likedPosts={data.likedPosts || []}
                savedPosts={data.savedPosts || []}
              />
            ) : data.profile.role === "MODERATOR" ? (
              <ModeratorView 
                profile={data.profile} 
                likedPosts={data.likedPosts || []}
                savedPosts={data.savedPosts || []}
              />
            ) : (
              <RegularUserView 
                profile={data.profile} 
                posts={data.community_posts || []} 
                likedPosts={data.likedPosts || []}
                savedPosts={data.savedPosts || []}
              />
            )}
          </div>
      </main>
    </div>
  );
}