"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { 
  Sun, Moon, Bell, Search, MapPin, X, Star, ChevronRight, ShieldCheck 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext";

// Import MapClient động để tránh lỗi SSR của Next.js
const MapClient = dynamic(() => import("@/components/MapClient"), { ssr: false });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function MapExplorePage() {
  const router = useRouter();
  const { setIsNotifOpen } = useUI();
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [partnerServices, setPartnerServices] = useState<any[]>([]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Lấy danh sách Đối tác (PARTNER_ADMIN)
    const fetchMapData = async () => {
      const { data: pData } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, bio, latitude, longitude')
        .eq('role', 'PARTNER_ADMIN');
      
      if (pData) setPartners(pData);
    };
    fetchMapData();
  }, []);

  // Khi bấm vào 1 Partner trên bản đồ -> Load dịch vụ của họ
  const handleMarkerClick = async (partner: any) => {
    setSelectedPartner(partner);
    setPartnerServices([]); // Reset list
    
    const { data: sData } = await supabase
      .from('services')
      .select('*')
      .eq('partner_id', partner.id)
      .eq('status', 'APPROVED'); // Chỉ lấy dịch vụ đã duyệt
      
    if (sData) setPartnerServices(sData);
  };

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <div className="relative h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden transition-colors duration-500">
      
      {/* LỚP 1: BẢN ĐỒ LEAFLET */}
      <div className="absolute inset-0 z-0">
        <MapClient partners={partners} onMarkerClick={handleMarkerClick} />
      </div>

      {/* LỚP 2: NÚT ĐIỀU KHIỂN & THANH TÌM KIẾM (TRÔI NỔI) */}
      <div className="absolute top-6 left-6 right-6 md:top-8 md:left-8 md:right-8 z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pointer-events-none">
        
        {/* Thanh tìm kiếm Glassmorphism */}
        <div className="w-full md:w-[400px] relative pointer-events-auto shadow-2xl rounded-full">
            <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-2xl rounded-full border border-white/50 dark:border-white/10"></div>
            <div className="relative flex items-center px-5 py-4">
                <Search size={20} className="text-slate-400 dark:text-zinc-500" />
                <input type="text" placeholder="Tìm kiếm dịch vụ, spa quanh bạn..." className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-medium ml-3 placeholder:text-slate-400 dark:placeholder:text-zinc-600" />
            </div>
        </div>

        {/* Nút Theme & Chuông */}
        <div className="flex items-center gap-3 pointer-events-auto ml-auto">
          <button onClick={handleThemeToggle} className="w-12 h-12 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/50 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
          <button onClick={() => setIsNotifOpen(true)} className="w-12 h-12 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/50 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
            <Bell size={20}/>
          </button>
        </div>
      </div>

      {/* LỚP 3: BẢNG THÔNG TIN DOANH NGHIỆP (KHI ĐƯỢC CHỌN) */}
      <div className={`absolute bottom-6 md:bottom-8 left-6 md:left-8 right-6 md:auto w-auto md:w-[400px] z-20 transition-all duration-500 ease-out transform ${selectedPartner ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        
        {selectedPartner && (
            <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-3xl rounded-[2rem] border border-white/50 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[60vh] md:max-h-[70vh]">
                
                {/* Header Partner */}
                <div className="p-6 border-b border-slate-200 dark:border-white/10 relative shrink-0">
                    <button onClick={() => setSelectedPartner(null)} className="absolute top-4 right-4 p-2 rounded-full bg-slate-200/50 dark:bg-white/10 text-slate-500 dark:text-zinc-400 hover:bg-slate-300/50 transition-colors"><X size={18}/></button>
                    
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-16 h-16 rounded-full border-2 border-[#80BF84] overflow-hidden bg-slate-200 dark:bg-zinc-800 shrink-0">
                            {selectedPartner.avatar_url ? <img src={selectedPartner.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><MapPin className="text-slate-400"/></div>}
                        </div>
                        <div>
                            <div className="flex items-center gap-1"><ShieldCheck size={14} className="text-[#80BF84]"/><span className="text-[10px] font-black text-[#80BF84] uppercase tracking-wider">Đã xác thực</span></div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight line-clamp-1">{selectedPartner.full_name || "Tên Doanh Nghiệp"}</h3>
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-500 mt-1"><Star size={12} className="fill-amber-500"/> 4.9 (120+ đánh giá)</div>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 line-clamp-2">{selectedPartner.bio || "Cơ sở cung cấp dịch vụ chăm sóc sức khỏe chuẩn y khoa."}</p>
                </div>

                {/* Danh sách Dịch vụ */}
                <div className="p-6 overflow-y-auto no-scrollbar flex-1 bg-slate-50/50 dark:bg-black/20">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-4">Các dịch vụ nổi bật</h4>
                    <div className="space-y-3">
                        {partnerServices.length === 0 ? (
                            <p className="text-sm text-center font-medium text-slate-400 py-4">Đang tải dịch vụ...</p>
                        ) : (
                            partnerServices.map(service => (
                                <div key={service.id} className="group bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between hover:border-[#80BF84] transition-colors cursor-pointer">
                                    <div className="pr-4">
                                        <h5 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-[#80BF84] transition-colors">{service.service_name}</h5>
                                        <p className="text-[#80BF84] font-black text-sm mt-1">{service.price.toLocaleString()} đ</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-[#80BF84] group-hover:text-white transition-colors">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>

    </div>
  );
}