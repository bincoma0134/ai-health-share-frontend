"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { 
  Sun, Moon, Bell, Search, MapPin, X, Star, ChevronRight, 
  ShieldCheck, Plus, Minus, Target, Layers, Filter, Compass, Navigation 
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

  // Trạng thái điều khiển Map
  const [mapState, setMapState] = useState({
    center: [21.028511, 105.804817] as [number, number],
    zoom: 13,
    mapType: "street" // street | satellite
  });

  const [activeFilter, setActiveFilter] = useState("Tất cả");

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

  // --- MAP ACTIONS ---
  const handleZoomIn = () => setMapState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 1, 18) }));
  const handleZoomOut = () => setMapState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 5) }));
  
  const handleLocateMe = () => {
    if (!navigator.geolocation) return toast.error("Trình duyệt không hỗ trợ định vị.");
    toast.promise(new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setMapState(prev => ({ ...prev, center: coords, zoom: 15 }));
          resolve(coords);
        },
        (err) => reject(err)
      );
    }), { loading: "Đang dò tìm tọa độ của bạn...", success: "Đã định vị thành công!", error: "Không thể lấy vị trí." });
  };

  const toggleMapType = () => setMapState(prev => ({ ...prev, mapType: prev.mapType === "street" ? "satellite" : "street" }));

  return (
    <div className="relative h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden font-be-vietnam">
      
      {/* 1. LAYER BẢN ĐỒ */}
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

      {/* 2. THANH TÌM KIẾM & HỆ THỐNG (TOP) */}
      <div className="absolute top-6 left-6 right-6 z-20 flex justify-between gap-4 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto bg-white/70 dark:bg-black/70 backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl flex items-center px-5 py-4 transition-all focus-within:ring-2 ring-[#80BF84]/50">
          <Search size={20} className="text-slate-400" />
          <input type="text" placeholder="Tìm Spa, Clinic, Gym..." className="bg-transparent border-none outline-none flex-1 ml-3 text-slate-900 dark:text-white font-bold" />
          <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-3" />
          <Filter size={18} className="text-[#80BF84] cursor-pointer" />
        </div>

        <div className="flex gap-3 pointer-events-auto">
          <button onClick={() => setIsNotifOpen(true)} className="w-12 h-12 rounded-2xl bg-white/70 dark:bg-black/70 backdrop-blur-2xl border border-white/50 dark:border-white/10 flex items-center justify-center shadow-xl hover:text-[#80BF84] transition-all"><Bell size={20}/></button>
        </div>
      </div>

      {/* 3. BỘ LỌC CHUYÊN BIỆT (TOP CENTER) */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex gap-2 pointer-events-auto">
        {["Tất cả", "Trị liệu", "Spa y tế", "Fitness", "Yoga"].map(cat => (
          <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-lg backdrop-blur-xl border ${activeFilter === cat ? 'bg-[#80BF84] text-zinc-950 border-[#80BF84]' : 'bg-white/60 dark:bg-black/60 text-slate-500 dark:text-zinc-400 border-white/20 hover:bg-white dark:hover:bg-zinc-800'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* 4. MAP CONTROLS (RIGHT CENTER) - MOCKUP MẠNH MẼ */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 pointer-events-auto">
        <div className="flex flex-col bg-white/80 dark:bg-black/80 backdrop-blur-2xl rounded-2xl border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden">
          <button onClick={handleZoomIn} className="p-4 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-zinc-300 border-b border-slate-100 dark:border-white/5"><Plus size={20}/></button>
          <button onClick={handleZoomOut} className="p-4 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-zinc-300"><Minus size={20}/></button>
        </div>

        <button onClick={handleLocateMe} className="w-12 h-12 bg-white/80 dark:bg-black/80 backdrop-blur-2xl rounded-2xl border border-white/50 dark:border-white/10 shadow-2xl flex items-center justify-center text-blue-500 hover:scale-110 active:scale-95 transition-all"><Target size={20} strokeWidth={2.5}/></button>
        
        <button onClick={toggleMapType} className="w-12 h-12 bg-white/80 dark:bg-black/80 backdrop-blur-2xl rounded-2xl border border-white/50 dark:border-white/10 shadow-2xl flex items-center justify-center text-amber-500 hover:scale-110 active:scale-95 transition-all">
          <Layers size={20}/>
          <span className="absolute right-full mr-3 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Đổi lớp nền</span>
        </button>
      </div>

      {/* 5. CARD THÔNG TIN (BOTTOM) */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] md:w-[450px] z-30 transition-all duration-700 ease-in-out ${selectedPartner ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
          {selectedPartner && (
            <div className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur-3xl rounded-[2.5rem] border border-[#80BF84]/30 shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden">
                <div className="p-6 pb-4 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-[#80BF84]/20 overflow-hidden shrink-0">
                        <img src={selectedPartner.avatar_url || "/partner-placeholder.png"} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-1"><ShieldCheck size={14} className="text-[#80BF84]"/><span className="text-[10px] font-black text-[#80BF84] uppercase tracking-widest">Bảo chứng Escrow</span></div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">{selectedPartner.full_name}</h3>
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12}/> 2.5 km • Đống Đa, Hà Nội</p>
                    </div>
                    <button onClick={() => setSelectedPartner(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><X size={20}/></button>
                </div>
                
                <div className="px-6 py-4 space-y-3 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                    {partnerServices.slice(0, 2).map(s => (
                        <div key={s.id} className="flex justify-between items-center group cursor-pointer">
                            <div className="flex-1 overflow-hidden pr-4"><p className="text-sm font-bold text-slate-700 dark:text-zinc-200 truncate group-hover:text-[#80BF84] transition-colors">{s.service_name}</p></div>
                            <div className="text-sm font-black text-[#80BF84] shrink-0">{s.price.toLocaleString()}đ</div>
                        </div>
                    ))}
                </div>

                <div className="p-6 pt-2">
                    <button onClick={() => router.push(`/partner/profile/${selectedPartner.id}`)} className="w-full py-4 bg-gradient-to-r from-[#80BF84] to-emerald-500 text-zinc-950 font-black text-sm rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                        CHI TIẾT CƠ SỞ <ChevronRight size={18}/>
                    </button>
                </div>
            </div>
          )}
      </div>

    </div>
  );
}