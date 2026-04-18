"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Home, Compass, CalendarDays, Heart, Sparkles, User as UserIcon, 
  Sun, Moon, Bell, ShieldCheck, Star, Award, CheckCircle, MapPin, 
  Play, CalendarPlus, MessageSquareQuote, ArrowLeft
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import GlobalLoading from "../../../loading"; // Import loading chuẩn

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PartnerPublicProfile() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'REVIEWS'>('SERVICES');

  // Dữ liệu API
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const fetchPartnerProfile = async () => {
      try {
        const res = await fetch(`https://ai-health-share-backend.onrender.com/partner/profile/${partnerId}`);
        const result = await res.json();

        if (!res.ok || result.status !== "success") {
            throw new Error(result.detail || "Không thể tải hồ sơ doanh nghiệp.");
        }

        setProfile(result.data.profile);
        setServices(result.data.services || []);
        setReviews(result.data.reviews || []);
        setStats(result.data.stats);

      } catch (error: any) {
        toast.error(error.message);
        router.push('/'); // Quay về trang chủ nếu lỗi
      } finally {
        setIsLoading(false);
      }
    };

    if (partnerId) fetchPartnerProfile();
  }, [partnerId, router]);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleBooking = (service: any) => {
    // Chuyển logic đặt lịch thực tế vào đây sau, hiện tại thông báo
    toast.success(`Đã chọn đặt lịch: ${service.service_name}`);
  };

  if (isLoading || !isMounted) return <GlobalLoading />;
  if (!profile) return null;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex relative transition-colors duration-500">
      
      {/* 1. LEFT SIDEBAR */}
      <div className="hidden md:flex flex-col w-[260px] h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-slate-200 dark:border-white/10 z-50 pt-8 pb-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-4 mb-10"><h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg flex items-center gap-1 cursor-pointer" onClick={() => router.push('/')}>AI<span className="text-[#80BF84]">HEALTH</span></h1></div>
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all"><Home size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Trang chủ</span></button>
          <button onClick={() => router.push('/features/explore')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Compass size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Khám phá</span></button>
          <button onClick={() => router.push('/features/calendar')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><CalendarDays size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Lịch hẹn</span></button>
          <button onClick={() => router.push('/features/favorite')} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold transition-all group"><Heart size={24} strokeWidth={2.5} /><span className="text-sm tracking-wide">Yêu thích</span></button>
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-black">
        
        {/* Nút Back (Đặc biệt hữu ích trên Mobile) */}
        <div className="absolute top-6 left-6 md:hidden z-[60]">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-lg">
                <ArrowLeft size={20} />
            </button>
        </div>

        {/* Nút Sáng Tối & Thông báo */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
          <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>

        {/* HERO SECTION */}
        <div className="relative w-full h-48 md:h-72 bg-slate-200 dark:bg-zinc-900 overflow-hidden">
            {profile.cover_url ? (
                <img src={profile.cover_url} className="w-full h-full object-cover opacity-90" alt="Cover" />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        </div>

        {/* THÔNG TIN HỒ SƠ */}
        <div className="max-w-5xl mx-auto px-6 md:px-12 -mt-16 md:-mt-20 relative z-10 animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 mb-8">
                {/* Avatar */}
                <div className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 md:border-8 border-slate-50 dark:border-black bg-white dark:bg-zinc-900 overflow-hidden shrink-0 shadow-2xl">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                    ) : (
                        <UserIcon size={48} className="w-full h-full p-6 text-slate-400 dark:text-zinc-600" />
                    )}
                </div>
                
                <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white">{profile.full_name || "Đối tác AI Health"}</h2>
                        <ShieldCheck className="text-blue-500" size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-slate-600 dark:text-zinc-400 font-medium text-sm md:text-base max-w-2xl">{profile.bio || "Cơ sở chăm sóc sức khỏe và trị liệu uy tín."}</p>
                </div>
            </div>

            {/* TRUST SCORE WIDGETS */}
            <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10">
                <div className="p-4 md:p-6 bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center shadow-xl shadow-slate-200/50 dark:shadow-none transition-transform hover:-translate-y-1">
                    <Star size={24} className="text-amber-400 fill-amber-400 mb-2" />
                    <span className="text-xl md:text-3xl font-black text-slate-900 dark:text-white">{stats?.avg_rating || "5.0"}</span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-center mt-1">Đánh giá</span>
                </div>
                <div className="p-4 md:p-6 bg-emerald-500/10 dark:bg-emerald-500/10 backdrop-blur-2xl border border-emerald-500/20 rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center shadow-xl shadow-emerald-500/10 dark:shadow-none transition-transform hover:-translate-y-1">
                    <Award size={24} className="text-emerald-500 mb-2" />
                    <span className="text-xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">{profile.reputation_points || 0}</span>
                    <span className="text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-500/70 uppercase tracking-widest text-center mt-1">Điểm Uy tín</span>
                </div>
                <div className="p-4 md:p-6 bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center shadow-xl shadow-slate-200/50 dark:shadow-none transition-transform hover:-translate-y-1">
                    <Play size={24} className="text-blue-500 mb-2" />
                    <span className="text-xl md:text-3xl font-black text-slate-900 dark:text-white">{stats?.total_services || 0}</span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-center mt-1">Dịch vụ</span>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex border-b border-slate-200 dark:border-white/10 mb-8">
                <button 
                    onClick={() => setActiveTab('SERVICES')} 
                    className={`pb-4 px-4 font-bold text-sm md:text-base transition-colors relative ${activeTab === 'SERVICES' ? 'text-emerald-500' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    Liệu trình & Video
                    {activeTab === 'SERVICES' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('REVIEWS')} 
                    className={`pb-4 px-4 font-bold text-sm md:text-base transition-colors relative flex items-center gap-2 ${activeTab === 'REVIEWS' ? 'text-emerald-500' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    Đánh giá khách hàng <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-xs rounded-full">{stats?.total_reviews || 0}</span>
                    {activeTab === 'REVIEWS' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full"></div>}
                </button>
            </div>

            {/* TAB CONTENT */}
            <div className="pb-32">
                {activeTab === 'SERVICES' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {services.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-slate-500 dark:text-zinc-500">Đối tác này chưa đăng dịch vụ nào.</div>
                        ) : (
                            services.map((service, index) => (
                                <div key={service.id} className="p-4 flex flex-col group relative overflow-hidden rounded-[1.5rem] bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300">
                                    <div className="w-full aspect-[4/3] bg-slate-800 dark:bg-zinc-900 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center">
                                        <video src={service.video_url || `/video-${(index % 3) + 1}.mp4`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" muted playsInline />
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"><Play size={24} className="ml-1"/></div></div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">{service.service_name}</h4>
                                        <p className="text-xl font-black text-[#80BF84] mb-2">{service.price.toLocaleString()} VND</p>
                                    </div>
                                    <button onClick={() => handleBooking(service)} className="mt-4 w-full py-3 bg-[#80BF84]/10 dark:bg-[#80BF84]/20 hover:bg-[#80BF84] text-[#80BF84] hover:text-zinc-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                                        <CalendarPlus size={18}/> Đặt lịch ngay
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'REVIEWS' && (
                    <div className="space-y-4 animate-fade-in">
                        {reviews.length === 0 ? (
                            <div className="py-12 text-center flex flex-col items-center">
                                <MessageSquareQuote size={40} className="text-slate-300 dark:text-zinc-700 mb-3" />
                                <p className="text-slate-500 dark:text-zinc-500 font-medium">Chưa có đánh giá nào cho đối tác này.</p>
                            </div>
                        ) : (
                            reviews.map((review) => (
                                <div key={review.id} className="p-5 rounded-[1.5rem] bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-sm flex gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800 shrink-0">
                                    {review['users!partner_reviews_user_id_fkey']?.avatar_url ? <img src={review['users!partner_reviews_user_id_fkey'].avatar_url} className="w-full h-full object-cover"/> : <UserIcon className="w-full h-full p-2 text-slate-400 dark:text-zinc-600" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h5 className="font-bold text-slate-900 dark:text-white">{review['users!partner_reviews_user_id_fkey']?.full_name || "Khách hàng"}</h5>
                                            <div className="flex text-amber-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} className={i < review.rating ? "fill-amber-400" : "text-slate-300 dark:text-zinc-700"} />
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 mb-2 block">{new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                                        <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">{review.comment}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* 3. MOBILE BOTTOM DOCK */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max pointer-events-auto">
          <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl">
            <button onClick={() => router.push('/')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/explore')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/calendar')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><CalendarDays size={26} strokeWidth={2.5} /></button>
            <button onClick={() => router.push('/features/favorite')} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors group"><Heart size={26} strokeWidth={2.5} /></button>
          </div>
        </div>

      </div>
    </div>
  );
}