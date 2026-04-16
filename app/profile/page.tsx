"use client";

import { useEffect, useState } from "react";
import { User as UserIcon, ShieldCheck, Sparkles, Home, Compass, CalendarDays, Heart, Bookmark, LogOut, Play, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- KHỞI TẠO SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Thiếu biến môi trường Supabase!");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UserProfile() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'saves' | 'history'>('saves');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vui lòng đăng nhập để xem hồ sơ!");
        router.push("/");
        return;
      }

      try {
        const res = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        const result = await res.json();
        
        if (result.status === "success") {
          setProfileData(result.data);
        } else {
          throw new Error("Lỗi tải dữ liệu");
        }
      } catch (error) {
        toast.error("Không thể tải hồ sơ cá nhân.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Đã đăng xuất an toàn.");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col items-center justify-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div>
          <div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <UserIcon className="text-white w-6 h-6 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-hidden flex relative font-sans">
      
      {/* 1. LEFT SIDEBAR DESKTOP (Giữ nguyên cấu trúc điều hướng) */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-black/40 backdrop-blur-3xl border-r border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-10">
          <h1 onClick={() => router.push("/")} className="text-3xl font-black text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer">
            AI<span className="text-[#80BF84]">HEALTH</span>
          </h1>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push("/")} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group">
            <Home size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm tracking-wide">Trang chủ</span>
          </button>
          <button onClick={() => toast.info("Đang phát triển")} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all group">
            <Compass size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm tracking-wide">Khám phá</span>
          </button>
          
          {/* Nút AI */}
          <div className="mt-8 px-2">
            <button onClick={() => router.push("/")} className="w-full relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#80BF84] to-emerald-300 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 shadow-xl group-hover:scale-[1.02] transition-all">
                 <Sparkles size={20} strokeWidth={3} />
                 <span className="font-black text-sm tracking-wide">AI Trợ lý</span>
              </div>
            </button>
          </div>
        </div>

        {/* Nút Hồ sơ (Active state) */}
        <div className="mt-auto px-2">
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/10 text-white font-bold transition-all group border border-white/20 shadow-inner">
            <div className="w-8 h-8 rounded-full bg-[#80BF84] text-zinc-900 flex items-center justify-center shadow-sm">
              <UserIcon size={16} strokeWidth={2.5}/>
            </div>
            <span className="text-sm tracking-wide truncate max-w-[120px] text-left">Hồ sơ của tôi</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN PROFILE AREA */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar bg-zinc-950 pb-32 md:pb-0">
        
        {/* BANNER COVER */}
        <div className="h-48 md:h-64 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#80BF84]/20 via-zinc-900 to-black"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
          <div className="absolute -bottom-10 left-6 md:left-12 flex items-end gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-zinc-950 bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center shadow-2xl relative overflow-hidden">
               <UserIcon size={40} className="text-zinc-500" />
               <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
            </div>
          </div>
          {/* Nút Đăng xuất */}
          <button onClick={handleLogout} className="absolute top-6 right-6 p-2.5 bg-black/40 backdrop-blur-md text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all border border-white/10 group">
            <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform"/>
          </button>
        </div>

        {/* PROFILE INFO */}
        <div className="pt-14 md:pt-16 px-6 md:px-12 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{profileData?.profile?.email?.split('@')[0] || "Người dùng"}</h2>
          <p className="text-sm font-medium text-zinc-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#80BF84]" /> Thành viên Health Share
          </p>

          {/* STATS */}
          <div className="flex items-center gap-8 mt-6">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white">{profileData?.stats?.likes_count || 0}</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Đã Thích</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white">{profileData?.stats?.saved_count || 0}</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Đang Lưu</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-[#80BF84]">{profileData?.stats?.bookings_count || 0}</span>
              <span className="text-xs font-semibold text-[#80BF84]/70 uppercase tracking-widest">Lịch Hẹn</span>
            </div>
          </div>

          {/* TABS NATIVE TIKTOK STYLE */}
          <div className="flex items-center border-b border-white/10 mt-10">
            <button onClick={() => setActiveTab('saves')} className={`flex-1 pb-4 text-sm font-bold transition-all relative ${activeTab === 'saves' ? 'text-white' : 'text-zinc-500'}`}>
              <div className="flex justify-center items-center gap-2"><Bookmark size={18}/> Dịch vụ đã lưu</div>
              {activeTab === 'saves' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-t-full"></div>}
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex-1 pb-4 text-sm font-bold transition-all relative ${activeTab === 'history' ? 'text-white' : 'text-zinc-500'}`}>
              <div className="flex justify-center items-center gap-2"><Clock size={18}/> Lịch sử khám</div>
              {activeTab === 'history' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-t-full"></div>}
            </button>
          </div>

          {/* TAB CONTENT: SAVED SERVICES (Grid View) */}
          {activeTab === 'saves' && (
            <div className="grid grid-cols-3 gap-1 md:gap-3 mt-4 animate-fade-in">
              {profileData?.saved_services?.length === 0 ? (
                <div className="col-span-3 text-center py-20 text-zinc-500 text-sm">Chưa có dịch vụ nào được lưu.</div>
              ) : (
                profileData?.saved_services?.map((svc: any, idx: number) => (
                  <div key={idx} onClick={() => router.push(`/?service=${svc.id}`)} className="aspect-[3/4] relative bg-zinc-900 md:rounded-2xl overflow-hidden group cursor-pointer border border-white/5">
                    {/* Placeholder Video Thumbnail */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                    <div className="absolute bottom-2 left-2 z-20 flex flex-col">
                      <p className="text-white text-xs font-bold truncate max-w-[100px] md:max-w-[150px] drop-shadow-md">{svc.service_name}</p>
                    </div>
                    {/* Overlay Hover */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center backdrop-blur-sm">
                       <Play className="text-white/80" size={32} fill="currentColor"/>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB CONTENT: BOOKING HISTORY (List View) */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-3 mt-6 animate-fade-in">
              {profileData?.bookings?.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 text-sm">Bạn chưa có lịch hẹn nào.</div>
              ) : (
                profileData?.bookings?.map((bk: any, idx: number) => (
                  <div key={idx} className="p-5 rounded-[1.5rem] bg-white/5 border border-white/10 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/10 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${bk.payment_status === 'UNPAID' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                           {bk.payment_status === 'UNPAID' ? 'Chờ thanh toán' : 'Đã thanh toán'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">{bk.order_code}</span>
                      </div>
                      <h4 className="text-base font-bold text-white leading-tight">{bk.services?.service_name || "Gói dịch vụ cao cấp"}</h4>
                      <p className="text-xs text-zinc-400 mt-1">Ngày tạo: {new Date(bk.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto">
                      <p className="text-lg font-black text-[#80BF84]">{parseFloat(bk.total_amount).toLocaleString()} <span className="text-[10px] text-[#80BF84]/70">VND</span></p>
                      {bk.service_status === 'COMPLETED' && (
                         <p className="text-xs text-emerald-500 font-medium flex items-center justify-start md:justify-end gap-1 mt-1"><CheckCircle2 size={12}/> Đã hoàn thành</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* 3. MOBILE BOTTOM DOCK (Chỉ < md) */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
        <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-white/10 bg-black/80 backdrop-blur-2xl">
          <button onClick={() => router.push("/")} className="text-zinc-500 hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
          <button onClick={() => toast.info("Đang phát triển")} className="text-zinc-500 hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} /></button>
          
          {/* AI Assistant Button (MOBILE) */}
          <button onClick={() => router.push("/")} className="relative -mt-10 group">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-300 p-[2px] shadow-[0_0_20px_rgba(128,191,132,0.3)] transition-all duration-300">
              <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center"><Sparkles size={26} className="text-[#80BF84]" strokeWidth={2.5} /></div>
            </div>
          </button>

          <button onClick={() => toast.info("Đang phát triển")} className="text-zinc-500 hover:text-white transition-colors group"><Heart size={26} strokeWidth={2.5} /></button>
          <button className="text-[#80BF84] transition-colors group"><UserIcon size={26} strokeWidth={2.5} /></button>
        </div>
      </div>

    </div>
  );
}