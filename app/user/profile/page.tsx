"use client";

import { useEffect, useState, useRef } from "react";
import { 
  User as UserIcon, ShieldCheck, Bookmark, LogOut, Play, Clock, 
  CheckCircle2, Edit3, Camera, X, Sun, Moon, Bell, Eye, LayoutGrid
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NotificationModal from "@/components/NotificationModal";
import Loading from "@/app/loading"; // <--- Bổ sung Import Loading của hệ thống
import { useUI } from "@/context/UIContext";

// --- KHỞI TẠO SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Thiếu biến môi trường Supabase!");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function PrivateProfilePage() {
  const router = useRouter();
  const { isNotifOpen, setIsNotifOpen, theme, toggleTheme } = useUI();
  
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'saves' | 'history'>('saves');
  
  // State Edit Profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", bio: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  // File Upload Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vui lòng đăng nhập để xem hồ sơ!");
        router.push("/");
        return;
      }
      setUser(session.user);

      try {
        const res = await fetch(`${API_URL}/user/profile`, {
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

  // --- LOGIC CẬP NHẬT TÊN & BIO ---
  const openEditModal = () => {
    setEditForm({
      full_name: profileData?.profile?.full_name || "",
      bio: profileData?.profile?.bio || ""
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const toastId = toast.loading("Đang cập nhật hồ sơ...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify(editForm)
      });
      const result = await res.json();
      if (result.status === "success") {
        setProfileData((prev: any) => ({ ...prev, profile: { ...prev.profile, ...result.data } }));
        toast.success("Hồ sơ đã được đồng bộ!", { id: toastId });
        setIsEditModalOpen(false);
      } else {
        throw new Error(result.detail || "Lỗi cập nhật");
      }
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  // --- LOGIC UPLOAD ẢNH ĐẠI DIỆN ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const toastId = toast.loading(`Đang tải lên ảnh đại diện...`);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-avatar-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw new Error("Lỗi kết nối Storage Supabase!");

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${API_URL}/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ avatar_url: publicUrl })
      });
      
      const result = await res.json();
      if (result.status === "success") {
        setProfileData((prev: any) => ({ ...prev, profile: { ...prev.profile, avatar_url: publicUrl } }));
        toast.success("Cập nhật ảnh thành công!", { id: toastId });
      } else {
        throw new Error("Lỗi lưu thông tin ảnh");
      }
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // SỬ DỤNG HIỆU ỨNG LOADING TỪ app/loading.tsx
  if (isLoading) return <Loading />;

  return (
    <div className="flex-1 relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 overflow-hidden font-be-vietnam">
      
      {/* INPUT ẨN ĐỂ CHỌN FILE */}
      <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarUpload} />

      {/* TOP BAR ĐIỀU KHIỂN */}
      <div className="absolute top-0 w-full z-40 p-6 flex justify-end items-center bg-gradient-to-b from-slate-50 dark:from-zinc-950 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={toggleTheme} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/20 active:scale-95 transition-all shadow-lg group">
              {theme === "dark" ? <Sun size={20} className="group-hover:text-amber-300" /> : <Moon size={20} className="group-hover:text-blue-500" />}
            </button>
            <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-[#80BF84] hover:bg-[#80BF84]/10 active:scale-95 transition-all shadow-lg">
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

          {/* WRAPPER ĐỒNG BỘ 1:1 VỚI PUBLIC VIEW */}
          <div className="max-w-4xl mx-auto p-6 md:p-12 pt-28 pb-32 animate-slide-up">
            
            {/* --- STACK PHÍA TRÊN: THÔNG TIN CÁ NHÂN --- */}
            <div className="flex flex-col md:flex-row items-start gap-10 mb-12">
                
                {/* AVATAR GLOW CHUẨN PUBLIC VIEW */}
                <div className="relative group shrink-0">
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#80BF84] to-emerald-400 rounded-full blur-md opacity-20"></div>
                  <div 
                    onClick={() => avatarInputRef.current?.click()}
                    className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl backdrop-blur-md bg-slate-100 cursor-pointer"
                  >
                    <img 
                      src={profileData?.profile?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.profile?.full_name || "NU"}&background=80BF84&color=fff`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt="avatar"
                    />
                    <div className="absolute inset-0 bg-black/40 dark:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                      <Camera size={24} className="text-white mb-1" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Cập nhật</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 pt-2">
                  {/* TÊN & USERNAME CHUẨN PUBLIC VIEW */}
                  <div className="flex flex-col gap-1 mb-6 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-md">
                      {profileData?.profile?.full_name || profileData?.profile?.email?.split('@')[0] || "Chưa có tên"}
                    </h1>
                    <h2 className="text-base md:text-lg font-medium text-slate-500 dark:text-zinc-400 tracking-tight">
                      @{profileData?.profile?.username || "username_chua_cap_nhat"}
                    </h2>
                  </div>

                  {/* BUTTONS: VIEW AS & EDIT */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-8">
                    
                    {/* View As Button */}
                    <button 
                      onClick={() => profileData?.profile?.username ? router.push(`/${profileData.profile.username}`) : toast.error("Vui lòng thiết lập Username trước!")}
                      className="px-10 py-3.5 bg-gradient-to-br from-[#80BF84] to-[#6da871] text-zinc-950 font-black rounded-2xl hover:shadow-[0_0_25px_rgba(128,191,132,0.4)] transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                    >
                      <Eye size={20} strokeWidth={3} /> <span>Xem công khai</span>
                    </button>

                    {/* Edit Button */}
                    <button 
                      onClick={openEditModal}
                      className="px-8 py-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/50 dark:border-white/10 text-slate-900 dark:text-white font-black rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-all flex items-center gap-2 shadow-xl active:scale-95"
                    >
                      <Edit3 size={20} strokeWidth={3} /> <span>Chỉnh sửa</span>
                    </button>

                    <div className="flex gap-2">
                      <button onClick={handleLogout} className="p-3.5 bg-white/40 dark:bg-white/5 backdrop-blur-3xl border border-white/50 dark:border-white/10 text-rose-500 hover:text-rose-600 rounded-xl transition-all shadow-xl active:scale-90">
                        <LogOut size={20} />
                      </button>
                    </div>
                  </div>

                  {/* STATS CHUẨN PUBLIC VIEW */}
                  <div className="flex justify-center md:justify-start gap-10 mb-6 px-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{profileData?.stats?.likes_count || 0}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã Thích</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 border-x border-slate-200 dark:border-white/10 px-8">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{profileData?.stats?.saved_count || 0}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang Lưu</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{profileData?.stats?.bookings_count || 0}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch Hẹn</span>
                    </div>
                  </div>

                  {/* BIO */}
                  <p className="text-center md:text-left text-base text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl px-2">
                    {profileData?.profile?.bio || "Người dùng này chưa cập nhật tiểu sử."}
                  </p>
                </div>
            </div>

            {/* --- STACK PHÍA DƯỚI: TABS NỘI DUNG PRIVATE --- */}
            <div className="border-t border-slate-200 dark:border-white/10">
              <div className="flex justify-center md:justify-start gap-12 sticky top-0 bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-md z-20">
                <button onClick={() => setActiveTab('saves')} className={`flex items-center gap-2 py-5 text-xs font-black transition-all border-t-2 -mt-[2px] ${activeTab === 'saves' ? 'border-[#80BF84] text-[#80BF84]' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                  <Bookmark size={18} strokeWidth={3}/> <span className="uppercase tracking-widest">Dịch vụ đã lưu</span>
                </button>
                <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 py-5 text-xs font-black transition-all border-t-2 -mt-[2px] ${activeTab === 'history' ? 'border-[#80BF84] text-[#80BF84]' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
                  <Clock size={18} strokeWidth={3}/> <span className="uppercase tracking-widest">Lịch sử khám</span>
                </button>
              </div>

              <div className="mt-8">
                  {/* TAB CONTENT: SAVES */}
                  {activeTab === 'saves' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 animate-fade-in">
                      {profileData?.saved_services?.length === 0 ? (
                        <div className="col-span-full text-center py-32 bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[4rem] mt-8 border-2 border-dashed border-slate-200 dark:border-white/10">
                          <div className="w-20 h-20 bg-white/50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                              <LayoutGrid size={32} className="text-[#80BF84] opacity-50" />
                          </div>
                          <p className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-widest">Chưa lưu dịch vụ</p>
                        </div>
                      ) : (
                        profileData?.saved_services?.map((svc: any, idx: number) => (
                          <div key={idx} onClick={() => router.push(`/?service=${svc.id}`)} className="relative aspect-[3/4] bg-zinc-800 rounded-[2rem] overflow-hidden group cursor-pointer shadow-2xl border border-white/5">
                            <img src={svc.image_url || `https://picsum.photos/seed/${svc.id}/400/600`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="post" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent flex flex-col justify-between p-5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                               <div className="flex justify-end"><Play size={24} className="fill-white text-white" /></div>
                               <p className="text-white text-sm font-black line-clamp-2">{svc.service_name}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT: BOOKING HISTORY */}
                  {activeTab === 'history' && (
                    <div className="flex flex-col gap-4 animate-fade-in">
                      {profileData?.bookings?.length === 0 ? (
                        <div className="text-center py-32 bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[4rem] mt-8 border-2 border-dashed border-slate-200 dark:border-white/10">
                          <p className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-widest">Chưa có lịch hẹn</p>
                        </div>
                      ) : (
                        profileData?.bookings?.map((bk: any, idx: number) => (
                          <div key={idx} className="p-6 rounded-[2rem] bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${bk.payment_status === 'UNPAID' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                  {bk.payment_status === 'UNPAID' ? 'Chờ thanh toán' : 'Đã thanh toán'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">Mã: #{bk.order_code}</span>
                              </div>
                              <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{bk.services?.service_name || "Gói dịch vụ"}</h4>
                              <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mt-2">Ngày tạo: {new Date(bk.created_at).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div className="text-left md:text-right w-full md:w-auto">
                              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{parseFloat(bk.total_amount).toLocaleString()} <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase">VNĐ</span></p>
                              {bk.service_status === 'COMPLETED' && (
                                <p className="text-xs text-emerald-500 font-black flex items-center justify-start md:justify-end gap-1 mt-2"><CheckCircle2 size={14}/> Đã hoàn thành</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
              </div>
            </div>

          </div>
      </main>

      {/* --- EDIT PROFILE MODAL (Glassmorphism Mới) --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center p-4 md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-500" onClick={() => setIsEditModalOpen(false)}></div>
          
          <div className="relative w-full md:w-[480px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 dark:border-white/10 flex flex-col animate-slide-up shadow-2xl overflow-hidden">
            <div className="pt-6 pb-4 px-8 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">Chỉnh sửa hồ sơ</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/50 dark:bg-white/5 rounded-full transition-all active:scale-90">
                <X size={18} strokeWidth={3}/>
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Tên hiển thị</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] dark:focus:border-[#80BF84] transition-colors shadow-inner"
                  placeholder="Nhập tên của bạn..."
                  value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Tiểu sử (Bio)</label>
                <textarea 
                  rows={4}
                  className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#80BF84] dark:focus:border-[#80BF84] transition-colors resize-none shadow-inner"
                  placeholder="Giới thiệu đôi nét về bạn..."
                  value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})}
                ></textarea>
              </div>
              
              <button type="submit" disabled={isUpdating} className="w-full py-4 mt-4 bg-[#80BF84] hover:bg-[#6da871] text-zinc-950 font-black rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {isUpdating ? "Đang xử lý..." : "Lưu thay đổi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}