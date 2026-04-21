"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { 
  Sun, Moon, Bell, Search, MapPin, X, Star, ChevronRight, 
  ShieldCheck, Plus, Minus, Target, Layers, Filter, Sparkles
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useUI } from "@/context/UIContext";

const MapClient = dynamic(() => import("@/components/MapClient"), { ssr: false });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function MapExplorePage() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [partnerServices, setPartnerServices] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeFilter, setActiveFilter] = useState("Tất cả");

  const [mapState, setMapState] = useState({
    center: [21.028511, 105.804817] as [number, number],
    zoom: 13,
    mapType: "street"
  });

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'PARTNER_ADMIN');
    if (data) setPartners(data);
  };

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return toast.error("Trình duyệt không hỗ trợ định vị.");
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserLocation(coords);
      setMapState(prev => ({ ...prev, center: coords, zoom: 15 }));
    });
  };

  return (
    <div className="relative h-[100dvh] w-full bg-slate-100 dark:bg-zinc-950 overflow-hidden font-be-vietnam transition-colors duration-500">
      
      {/* 1. LAYER BẢN ĐỒ & OVERLAY THÔNG MINH */}
      <div className="absolute inset-0 z-0">
        {/* Lớp phủ mờ khi dùng Satellite để tăng độ tương phản cho UI */}
        {mapState.mapType === "satellite" && (
            <div className="absolute inset-0 bg-black/20 z-[1] pointer-events-none transition-opacity duration-500"></div>
        )}
        <MapClient 
          partners={partners} 
          mapState={mapState} 
          userLocation={userLocation}
          onMarkerClick={async (p: any) => {
            setSelectedPartner(p);
            const { data } = await supabase.from('services').select('*').eq('partner_id', p.id).eq('status', 'APPROVED');
            if (data) setPartnerServices(data);
            setMapState(prev => ({ ...prev, center: [p.latitude || 21.0285, p.longitude || 105.8048], zoom: 16 }));
          }} 
        />
      </div>

      {/* 2. CỤM ĐIỀU KHIỂN TOP (SEARCH + THEME + NOTIF) */}
      <div className="absolute top-8 left-6 right-6 z-40 flex flex-col items-center gap-4 pointer-events-none">
        
        <div className="w-full max-w-4xl flex items-center gap-3">
            {/* Thanh tìm kiếm Glassmorphism Nâng cao */}
            <div className="relative flex-1 group pointer-events-auto">
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[40px] rounded-[2rem] border border-white/40 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.15)] group-focus-within:ring-2 ring-[#80BF84]/50 transition-all duration-500"></div>
                <div className="relative flex items-center px-6 py-4 md:py-5">
                    <Search size={22} className="text-slate-500 dark:text-zinc-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Tìm dịch vụ quanh bạn..." 
                      className="bg-transparent border-none outline-none flex-1 ml-4 text-slate-900 dark:text-white font-bold text-lg placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                    />
                    <div className="w-px h-8 bg-slate-300 dark:bg-white/10 mx-4 hidden md:block" />
                    <button className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#80BF84] text-zinc-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg">
                      <Filter size={14}/> Lọc
                    </button>
                </div>
            </div>

            {/* Nút Sáng/Tối & Thông báo (Phục hồi) */}
            <div className="flex items-center gap-2 pointer-events-auto shrink-0">
              <button onClick={handleThemeToggle} className="w-12 h-12 md:w-14 md:h-14 rounded-[1.5rem] bg-white/50 dark:bg-black/50 backdrop-blur-[40px] border border-white/40 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
                {isDarkMode ? <Sun size={22}/> : <Moon size={22}/>}
              </button>
              <button onClick={() => setIsNotifOpen(true)} className="relative w-12 h-12 md:w-14 md:h-14 rounded-[1.5rem] bg-white/50 dark:bg-black/50 backdrop-blur-[40px] border border-white/40 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
                <Bell size={22}/>
                <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse shadow-lg"></span>
              </button>
            </div>
        </div>

        {/* 3. BỘ LỌC TỪ KHÓA NỔI BẬT - SOPHISTICATED PILLS (Phù hợp mọi bản đồ) */}
        <div className="flex gap-2 w-full max-w-2xl overflow-x-auto no-scrollbar pb-2 px-2 pointer-events-auto justify-center">
          {["Tất cả", "Massage", "Clinic", "Yoga", "Trị liệu"].map((cat) => (
            <button 
              key={cat} 
              onClick={() => setActiveFilter(cat)}
              className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 border backdrop-blur-[20px] ${
                activeFilter === cat 
                ? 'bg-[#80BF84] text-zinc-950 border-[#80BF84] shadow-lg scale-105' 
                : 'bg-white/30 dark:bg-black/30 text-slate-700 dark:text-zinc-300 border-white/40 dark:border-white/5 hover:bg-white/60 dark:hover:bg-black/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. MAP CONTROLS - VERTICAL FLOATING DOCK */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
        <div className="flex flex-col bg-white/40 dark:bg-black/40 backdrop-blur-[40px] rounded-[2rem] border border-white/40 dark:border-white/10 shadow-2xl overflow-hidden p-1">
          <button onClick={() => setMapState(p => ({ ...p, zoom: p.zoom + 1 }))} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-[#80BF84] hover:text-zinc-950 transition-all text-slate-700 dark:text-zinc-300"><Plus size={20}/></button>
          <div className="h-px w-8 bg-slate-300 dark:bg-white/10 mx-auto" />
          <button onClick={() => setMapState(p => ({ ...p, zoom: p.zoom - 1 }))} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-[#80BF84] hover:text-zinc-950 transition-all text-slate-700 dark:text-zinc-300"><Minus size={20}/></button>
        </div>

        <button onClick={handleLocateMe} className="w-14 h-14 bg-white/50 dark:bg-black/50 backdrop-blur-[40px] rounded-[1.5rem] border border-white/40 dark:border-white/10 shadow-2xl flex items-center justify-center text-blue-500 hover:scale-110 active:scale-95 transition-all group">
          <Target size={24} strokeWidth={2.5}/>
        </button>
        
        <button onClick={() => setMapState(p => ({ ...p, mapType: p.mapType === "street" ? "satellite" : "street" }))} className={`w-14 h-14 rounded-[1.5rem] backdrop-blur-[40px] border shadow-2xl flex items-center justify-center transition-all ${mapState.mapType === "satellite" ? 'bg-[#80BF84] text-zinc-950 border-[#80BF84]' : 'bg-white/50 dark:bg-black/50 text-amber-500 border-white/40 dark:border-white/10'}`}>
          <Layers size={24}/>
        </button>
      </div>

      {/* 5. PARTNER INFO CARD (BOTTOM) */}
      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-[92%] md:w-[500px] z-50 transition-all duration-700 ease-in-out transform ${selectedPartner ? 'translate-y-0 opacity-100' : 'translate-y-40 opacity-0 pointer-events-none'}`}>
          {selectedPartner && (
            <div className="relative group">
                <div className="absolute inset-[-2px] bg-gradient-to-tr from-[#80BF84]/40 to-emerald-500/40 rounded-[3rem] blur-2xl opacity-50"></div>
                <div className="relative bg-white/70 dark:bg-zinc-950/85 backdrop-blur-[50px] rounded-[3rem] border border-white/60 dark:border-[#80BF84]/20 shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden">
                    <div className="p-8 pb-6 flex items-start gap-6">
                        <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-zinc-900 border border-[#80BF84]/20 overflow-hidden shrink-0 shadow-inner">
                            <img src={selectedPartner.avatar_url || "https://ui-avatars.com/api/?name=Partner&background=80BF84&color=fff"} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 overflow-hidden pt-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 bg-[#80BF84]/10 text-[#80BF84] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#80BF84]/20 flex items-center gap-1"><ShieldCheck size={10}/> Verified Partner</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate tracking-tight">{selectedPartner.full_name}</h3>
                            <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 flex items-center gap-1.5 mt-2"><MapPin size={14} className="text-rose-500"/> 1.8 km • Hà Nội</p>
                        </div>
                        <button onClick={() => setSelectedPartner(null)} className="p-3 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all text-slate-400"><X size={20}/></button>
                    </div>
                    
                    <div className="px-8 pb-6">
                        <div className="flex gap-3 overflow-x-auto no-scrollbar">
                            {partnerServices.map(s => (
                                <div key={s.id} className="min-w-[200px] bg-white/50 dark:bg-white/5 rounded-[1.5rem] p-5 border border-slate-200 dark:border-white/5 hover:border-[#80BF84] transition-all cursor-pointer group/item">
                                    <p className="text-xs font-black text-slate-800 dark:text-zinc-200 truncate mb-1 group-hover/item:text-[#80BF84]">{s.service_name}</p>
                                    <p className="text-sm font-black text-[#80BF84]">{s.price.toLocaleString()}đ</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 pt-2">
                        <button onClick={() => router.push(`/partner/profile/${selectedPartner.id}`)} className="w-full py-5 bg-gradient-to-r from-[#80BF84] to-emerald-600 text-zinc-950 font-black text-sm rounded-[2rem] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                            KHÁM PHÁ CHI TIẾT <ChevronRight size={20}/>
                        </button>
                    </div>
                </div>
            </div>
          )}
      </div>

    </div>
  );
}