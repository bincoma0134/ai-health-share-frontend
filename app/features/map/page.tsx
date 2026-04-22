"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { 
  Sun, Moon, Bell, Search, MapPin, X, ChevronRight, 
  ShieldCheck, Plus, Minus, Target, Layers, Filter
} from "lucide-react";
import { toast } from "sonner";
import { useUI } from "@/context/UIContext";
import { useRouter } from "next/navigation";

// Import Map động để tránh lỗi SSR
const MapClient = dynamic(() => import("@/components/MapClient"), { ssr: false });

// ==========================================
// MOCK DATA: DỮ LIỆU GIẢ LẬP ĐỂ DEMO MVP
// ==========================================
const MOCK_PARTNERS = [
  { id: 'p1', full_name: 'Lotus Healing Spa', latitude: 21.028511, longitude: 105.804817, avatar_url: 'https://ui-avatars.com/api/?name=Lotus&background=80BF84&color=fff', tags: ['Spa y tế', 'Massage'], distance: '1.2' },
  { id: 'p2', full_name: 'Zenith Yoga & Fitness', latitude: 21.032511, longitude: 105.810817, avatar_url: 'https://ui-avatars.com/api/?name=Zenith&background=3b82f6&color=fff', tags: ['Yoga', 'Fitness'], distance: '2.5' },
  { id: 'p3', full_name: 'An Tâm Clinic', latitude: 21.024511, longitude: 105.800817, avatar_url: 'https://ui-avatars.com/api/?name=An+Tam&background=f59e0b&color=fff', tags: ['Clinic', 'Trị liệu'], distance: '0.8' },
  { id: 'p4', full_name: 'Elite Wellness Center', latitude: 21.029511, longitude: 105.795817, avatar_url: 'https://ui-avatars.com/api/?name=Elite&background=8b5cf6&color=fff', tags: ['Fitness', 'Massage'], distance: '3.1' },
  { id: 'p5', full_name: 'Tâm An Trị Liệu Cổ Vai Gáy', latitude: 21.020511, longitude: 105.808817, avatar_url: 'https://ui-avatars.com/api/?name=Tam+An&background=ec4899&color=fff', tags: ['Trị liệu', 'Massage'], distance: '4.0' },
  { id: 'p6', full_name: 'Glow Beauty & Spa', latitude: 21.035511, longitude: 105.802817, avatar_url: 'https://ui-avatars.com/api/?name=Glow&background=14b8a6&color=fff', tags: ['Spa y tế'], distance: '1.5' },
  { id: 'p7', full_name: 'Omkara Yoga Studio', latitude: 21.026511, longitude: 105.815817, avatar_url: 'https://ui-avatars.com/api/?name=Omkara&background=8b5cf6&color=fff', tags: ['Yoga', 'Thiền định'], distance: '2.2' },
  { id: 'p8', full_name: 'Dr. Care Medical Spa', latitude: 21.031511, longitude: 105.798817, avatar_url: 'https://ui-avatars.com/api/?name=Dr+Care&background=0ea5e9&color=fff', tags: ['Clinic', 'Spa y tế'], distance: '1.9' },
];

const MOCK_SERVICES: Record<string, any[]> = {
  p1: [{ id: 's1', service_name: 'Massage Body Đá Nóng', price: 450000 }, { id: 's2', service_name: 'Trị liệu Cổ Vai Gáy', price: 350000 }],
  p2: [{ id: 's3', service_name: 'Yoga 1 kèm 1', price: 500000 }, { id: 's4', service_name: 'Thẻ tập Fitness Tháng', price: 800000 }],
  p3: [{ id: 's5', service_name: 'Khám & Tư vấn Dinh dưỡng', price: 200000 }, { id: 's6', service_name: 'Trị liệu Thần kinh cột sống', price: 600000 }],
  p4: [{ id: 's7', service_name: 'Bơi lội Thủy trị liệu', price: 300000 }, { id: 's8', service_name: 'Massage Thể thao', price: 550000 }],
  p5: [{ id: 's9', service_name: 'Bấm huyệt đả thông', price: 250000 }, { id: 's10', service_name: 'Ngâm chân thảo dược', price: 150000 }],
  p6: [{ id: 's11', service_name: 'Chăm sóc da chuyên sâu', price: 700000 }, { id: 's12', service_name: 'Gội đầu dưỡng sinh', price: 120000 }],
  p7: [{ id: 's13', service_name: 'Lớp Yoga Trị liệu', price: 150000 }, { id: 's14', service_name: 'Thiền chuông xoay', price: 200000 }],
  p8: [{ id: 's15', service_name: 'Điều trị mụn chuẩn y khoa', price: 800000 }, { id: 's16', service_name: 'Trẻ hóa da công nghệ cao', price: 1500000 }],
};

export default function MapExplorePage() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI();
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // States
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [partnerServices, setPartnerServices] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeFilter, setActiveFilter] = useState("Tất cả");

  const [mapState, setMapState] = useState({
    center: [21.028511, 105.804817] as [number, number],
    zoom: 14,
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
  }, []);

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

  // LOGIC LỌC DỮ LIỆU
  const filteredPartners = useMemo(() => {
    if (activeFilter === "Tất cả") return MOCK_PARTNERS;
    return MOCK_PARTNERS.filter(p => p.tags.includes(activeFilter));
  }, [activeFilter]);

  return (
    <div className="relative h-[100dvh] w-full bg-slate-100 dark:bg-zinc-950 overflow-hidden font-be-vietnam transition-colors duration-500">
      
      {/* 1. LAYER BẢN ĐỒ */}
      <div className="absolute inset-0 z-0">
        {mapState.mapType === "satellite" && (
            <div className="absolute inset-0 bg-black/20 z-[1] pointer-events-none transition-opacity duration-500"></div>
        )}
        <MapClient 
          partners={filteredPartners} 
          mapState={mapState} 
          userLocation={userLocation}
          onMarkerClick={(p: any) => {
            setSelectedPartner(p);
            setPartnerServices(MOCK_SERVICES[p.id] || []);
            setMapState(prev => ({ ...prev, center: [p.latitude, p.longitude], zoom: 16 }));
          }} 
        />
      </div>

      {/* 2. CỤM ĐIỀU KHIỂN TOP */}
      <div className="absolute top-8 left-6 right-6 z-40 flex flex-col items-center gap-4 pointer-events-none">
        
        <div className="w-full max-w-4xl flex items-center gap-3">
            <div className="relative flex-1 group pointer-events-auto">
                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[40px] rounded-[2rem] border border-white/40 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.15)] group-focus-within:ring-2 ring-[#80BF84]/50 transition-all duration-500"></div>
                <div className="relative flex items-center px-6 py-4 md:py-5">
                    <Search size={22} className="text-slate-500 dark:text-zinc-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Tìm dịch vụ, clinic quanh bạn..." 
                      className="bg-transparent border-none outline-none flex-1 ml-4 text-slate-900 dark:text-white font-bold text-lg placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                    />
                    <div className="w-px h-8 bg-slate-300 dark:bg-white/10 mx-4 hidden md:block" />
                    <button className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#80BF84] text-zinc-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg">
                      <Filter size={14}/> Lọc
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto shrink-0">
              <button onClick={handleThemeToggle} className="w-12 h-12 md:w-14 md:h-14 rounded-[1.5rem] bg-white/60 dark:bg-black/60 backdrop-blur-[40px] border border-white/40 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
                {isDarkMode ? <Sun size={22}/> : <Moon size={22}/>}
              </button>
              <button onClick={() => setIsNotifOpen(true)} className="relative w-12 h-12 md:w-14 md:h-14 rounded-[1.5rem] bg-white/60 dark:bg-black/60 backdrop-blur-[40px] border border-white/40 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
                <Bell size={22}/>
                <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse shadow-lg"></span>
              </button>
            </div>
        </div>

        {/* BỘ LỌC TỪ KHÓA CÓ TƯƠNG TÁC */}
        <div className="flex gap-2 w-full max-w-2xl overflow-x-auto no-scrollbar pb-2 px-2 pointer-events-auto justify-center">
          {["Tất cả", "Massage", "Clinic", "Yoga", "Trị liệu", "Spa y tế", "Fitness", "Thiền định"].map((cat) => (
            <button 
              key={cat} 
              onClick={() => {
                setActiveFilter(cat);
                setSelectedPartner(null); // Tắt card nếu đang mở
              }}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 border backdrop-blur-[20px] ${
                activeFilter === cat 
                ? 'bg-[#80BF84] text-zinc-950 border-[#80BF84] shadow-[0_0_20px_rgba(128,191,132,0.4)] scale-105' 
                : 'bg-white/40 dark:bg-black/40 text-slate-700 dark:text-zinc-300 border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAP CONTROLS */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 pointer-events-auto">
        <div className="flex flex-col bg-white/60 dark:bg-black/60 backdrop-blur-[40px] rounded-[2rem] border border-white/40 dark:border-white/10 shadow-2xl overflow-hidden p-1">
          <button onClick={() => setMapState(p => ({ ...p, zoom: Math.min(p.zoom + 1, 18) }))} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-[#80BF84] hover:text-zinc-950 transition-all text-slate-700 dark:text-zinc-300"><Plus size={20}/></button>
          <div className="h-px w-8 bg-slate-300 dark:bg-white/10 mx-auto" />
          <button onClick={() => setMapState(p => ({ ...p, zoom: Math.max(p.zoom - 1, 5) }))} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-[#80BF84] hover:text-zinc-950 transition-all text-slate-700 dark:text-zinc-300"><Minus size={20}/></button>
        </div>

        <button onClick={handleLocateMe} className="w-14 h-14 bg-white/60 dark:bg-black/60 backdrop-blur-[40px] rounded-[1.5rem] border border-white/40 dark:border-white/10 shadow-2xl flex items-center justify-center text-blue-500 hover:scale-110 active:scale-95 transition-all">
          <Target size={24} strokeWidth={2.5}/>
        </button>
        
        <button onClick={() => setMapState(p => ({ ...p, mapType: p.mapType === "street" ? "satellite" : "street" }))} className={`w-14 h-14 rounded-[1.5rem] backdrop-blur-[40px] border shadow-2xl flex items-center justify-center transition-all ${mapState.mapType === "satellite" ? 'bg-[#80BF84] text-zinc-950 border-[#80BF84]' : 'bg-white/60 dark:bg-black/60 text-amber-500 border-white/40 dark:border-white/10'}`}>
          <Layers size={24}/>
        </button>
      </div>

      {/* 4. PARTNER INFO CARD */}
      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-[92%] md:w-[500px] z-50 transition-all duration-700 ease-in-out transform ${selectedPartner ? 'translate-y-0 opacity-100' : 'translate-y-40 opacity-0 pointer-events-none'}`}>
          {selectedPartner && (
            <div className="relative group pointer-events-auto">
                <div className="absolute inset-[-2px] bg-gradient-to-tr from-[#80BF84]/40 to-emerald-500/40 rounded-[3rem] blur-2xl opacity-50"></div>
                <div className="relative bg-white/80 dark:bg-zinc-950/90 backdrop-blur-[50px] rounded-[3rem] border border-white/60 dark:border-[#80BF84]/30 shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">
                    <div className="p-8 pb-6 flex items-start gap-6">
                        <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-zinc-900 border border-[#80BF84]/20 overflow-hidden shrink-0 shadow-inner">
                            <img src={selectedPartner.avatar_url} className="w-full h-full object-cover" alt="partner" />
                        </div>
                        <div className="flex-1 overflow-hidden pt-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 bg-[#80BF84]/10 text-[#80BF84] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#80BF84]/20 flex items-center gap-1"><ShieldCheck size={10}/> Đã xác thực</span>
                              <span className="px-3 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-slate-300 dark:border-zinc-700">{selectedPartner.tags[0]}</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate tracking-tight">{selectedPartner.full_name}</h3>
                            <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 flex items-center gap-1.5 mt-2"><MapPin size={14} className="text-rose-500"/> {selectedPartner.distance} km • Quanh đây</p>
                        </div>
                        <button onClick={() => setSelectedPartner(null)} className="p-3 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all text-slate-400"><X size={20}/></button>
                    </div>
                    
                    <div className="px-8 pb-6">
                        <div className="flex gap-3 overflow-x-auto no-scrollbar">
                            {partnerServices.map(s => (
                                <div key={s.id} className="min-w-[200px] bg-white/60 dark:bg-white/5 rounded-[1.5rem] p-5 border border-slate-200 dark:border-white/10 hover:border-[#80BF84] transition-all cursor-pointer group/item">
                                    <p className="text-xs font-black text-slate-800 dark:text-zinc-200 truncate mb-1 group-hover/item:text-[#80BF84]">{s.service_name}</p>
                                    <p className="text-sm font-black text-[#80BF84]">{s.price.toLocaleString()}đ</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 pt-2">
                        <button onClick={() => router.push(`/partner/profile/${selectedPartner.id}`)} className="w-full py-5 bg-gradient-to-r from-[#80BF84] to-emerald-600 text-zinc-950 font-black text-sm rounded-[2rem] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                            ĐẶT LỊCH NGAY <ChevronRight size={20}/>
                        </button>
                    </div>
                </div>
            </div>
          )}
      </div>

    </div>
  );
}