"use client";

import { useEffect, useState, useRef } from "react";
import { User as UserIcon, ShieldCheck, Sparkles, Home, Compass, CalendarDays, Heart, Bookmark, LogOut, Play, Clock, CheckCircle2, Edit3, Camera, X } from "lucide-react";
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
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'saves' | 'history'>('saves');
  
  // State Edit Profile Text
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", bio: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  // File Upload Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify(editForm)
      });
      const result = await res.json();
      if (result.status === "success") {
        setProfileData((prev: any) => ({ ...prev, profile: { ...prev.profile, ...result.data } }));
        toast.success("Hồ sơ đã được nâng cấp!", { id: toastId });
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

  // --- LOGIC UPLOAD ẢNH (AVATAR & COVER) ĐÃ ĐƯỢC TỐI ƯU ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const toastId = toast.loading(`Đang xử lý và tải lên ảnh ${type === 'avatar' ? 'đại diện' : 'bìa'}...`);
    try {
      // 1. Upload ảnh lên Supabase Storage (Bucket: avatars)
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${type}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Khắc phục lỗi trùng lặp file
        });

      if (uploadError) {
        throw new Error("Supabase Storage chặn kết nối. Cậu hãy kiểm tra lại lệnh SQL Policy cấp quyền INSERT nhé!");
      }

      // 2. Lấy link Public của ảnh
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // 3. Cập nhật URL vào bảng Users thông qua API Backend
      const { data: { session } } = await supabase.auth.getSession();
      const updatePayload = type === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl };
      
      const res = await fetch("https://ai-health-share-backend.onrender.com/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify(updatePayload)
      });
      
      const result = await res.json();
      if (result.status === "success") {
        // Cập nhật Giao diện ngay lập tức
        setProfileData((prev: any) => ({ ...prev, profile: { ...prev.profile, ...updatePayload } }));
        toast.success("Cập nhật ảnh thành công!", { id: toastId });
      } else {
        throw new Error("Lỗi lưu thông tin ảnh vào Database");
      }
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      // Reset input file để có thể chọn lại ảnh cũ nếu muốn
      if (type === 'avatar' && avatarInputRef.current) avatarInputRef.current.value = '';
      if (type === 'cover' && coverInputRef.current) coverInputRef.current.value = '';
    }
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
      
      
      {/* 2. MAIN PROFILE AREA */}
      <div className="flex-1 relative h-[100dvh] overflow-y-auto no-scrollbar bg-zinc-950 pb-32 md:pb-0">
        
        {/* INPUT ẨN ĐỂ CHỌN FILE */}
        <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={(e) => handleImageUpload(e, 'avatar')} />
        <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={(e) => handleImageUpload(e, 'cover')} />

        {/* BANNER COVER */}
        <div className="h-48 md:h-64 w-full relative group/cover cursor-pointer" onClick={() => coverInputRef.current?.click()}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#80BF84]/20 via-zinc-900 to-black"></div>
          {profileData?.profile?.cover_url ? (
            <img src={profileData.profile.cover_url} alt="cover" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          ) : (
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
          
          {/* Lớp phủ Hover cho Ảnh bìa */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] z-10">
             <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full text-white font-medium text-sm border border-white/20 shadow-lg">
               <Camera size={16} /> Thay đổi ảnh bìa
             </div>
          </div>
          
          <div className="absolute -bottom-12 left-6 md:left-12 flex items-end gap-5 z-20">
            {/* Avatar Cực mượt */}
            <div 
              onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-zinc-950 bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center shadow-2xl relative overflow-hidden group/avatar cursor-pointer transition-transform hover:scale-105"
            >
              {profileData?.profile?.avatar_url ? (
                <img src={profileData.profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={40} className="text-zinc-500" />
              )}
              
              {/* Lớp phủ Hover cho Avatar */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                <Camera size={24} className="text-white mb-1" />
                <span className="text-[9px] font-bold text-white uppercase tracking-widest">Cập nhật</span>
              </div>
            </div>
          </div>
          
          {/* Các nút công cụ (Cần stopPropagation để không kích hoạt đổi ảnh bìa khi bấm) */}
          <div className="absolute top-6 right-6 flex gap-3 z-20" onClick={(e) => e.stopPropagation()}>
            <button onClick={openEditModal} className="p-2.5 bg-black/40 backdrop-blur-md text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-all border border-white/10 shadow-lg">
              <Edit3 size={18} />
            </button>
            <button onClick={handleLogout} className="p-2.5 bg-black/40 backdrop-blur-md text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all border border-white/10 shadow-lg">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* PROFILE INFO */}
        <div className="pt-16 md:pt-20 px-6 md:px-12 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {profileData?.profile?.full_name || profileData?.profile?.email?.split('@')[0] || "Người dùng"}
          </h2>
          <p className="text-sm font-medium text-zinc-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#80BF84]" /> {profileData?.profile?.email}
          </p>
          
          {profileData?.profile?.bio ? (
            <p className="text-sm text-zinc-300 mt-4 max-w-2xl leading-relaxed whitespace-pre-wrap border-l-2 border-[#80BF84] pl-3">
              {profileData.profile.bio}
            </p>
          ) : (
            <button onClick={openEditModal} className="mt-4 text-xs font-bold text-zinc-500 hover:text-[#80BF84] border border-dashed border-zinc-700 hover:border-[#80BF84] px-4 py-2 rounded-xl transition-colors">
              + Thêm tiểu sử (Bio)
            </button>
          )}

          {/* STATS */}
          <div className="flex items-center gap-8 mt-6">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white">{profileData?.stats?.likes_count || 0}</span>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Đã Thích</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white">{profileData?.stats?.saved_count || 0}</span>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Đang Lưu</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-[#80BF84]">{profileData?.stats?.bookings_count || 0}</span>
              <span className="text-[10px] font-semibold text-[#80BF84]/70 uppercase tracking-widest">Lịch Hẹn</span>
            </div>
          </div>
          
          {/* TABS */}
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

          {/* TAB CONTENT: SAVES */}
          {activeTab === 'saves' && (
            <div className="grid grid-cols-3 gap-1 md:gap-3 mt-4 animate-fade-in">
              {profileData?.saved_services?.length === 0 ? (
                <div className="col-span-3 text-center py-20 text-zinc-500 text-sm">Chưa có dịch vụ nào được lưu.</div>
              ) : (
                profileData?.saved_services?.map((svc: any, idx: number) => (
                  <div key={idx} onClick={() => router.push(`/?service=${svc.id}`)} className="aspect-[3/4] relative bg-zinc-900 md:rounded-2xl overflow-hidden group cursor-pointer border border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                    <div className="absolute bottom-2 left-2 z-20 flex flex-col">
                      <p className="text-white text-xs font-bold truncate max-w-[100px] md:max-w-[150px] drop-shadow-md">{svc.service_name}</p>
                    </div>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center backdrop-blur-sm">
                       <Play className="text-white/80" size={32} fill="currentColor"/>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB CONTENT: BOOKING HISTORY */}
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

      {/* 3. MOBILE BOTTOM DOCK */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max animate-slide-up pointer-events-auto">
        <div className="px-8 py-3.5 rounded-full flex items-center justify-center gap-8 sm:gap-10 shadow-2xl border border-white/10 bg-black/80 backdrop-blur-2xl">
          <button onClick={() => router.push("/")} className="text-zinc-500 hover:text-white transition-colors group"><Home size={26} strokeWidth={2.5} /></button>
          <button onClick={() => toast.info("Đang phát triển")} className="text-zinc-500 hover:text-white transition-colors group"><Compass size={26} strokeWidth={2.5} /></button>
          <button onClick={() => router.push("/")} className="relative -mt-10 group">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#80BF84] to-emerald-300 p-[2px] shadow-[0_0_20px_rgba(128,191,132,0.3)] transition-all duration-300">
              <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center"><Sparkles size={26} className="text-[#80BF84]" strokeWidth={2.5} /></div>
            </div>
          </button>
          <button onClick={() => toast.info("Đang phát triển")} className="text-zinc-500 hover:text-white transition-colors group"><Heart size={26} strokeWidth={2.5} /></button>
          <button className="text-[#80BF84] transition-colors group"><UserIcon size={26} strokeWidth={2.5} /></button>
        </div>
      </div>

      {/* --- EDIT PROFILE MODAL (Chỉ còn Text) --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center md:justify-center md:p-6 pointer-events-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500" onClick={() => setIsEditModalOpen(false)}></div>
          
          <div className="relative w-full md:w-[480px] bg-zinc-950 md:bg-black/80 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/10 flex flex-col animate-slide-up shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="md:hidden flex justify-center pt-3 w-full absolute top-0 z-20">
              <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
            </div>
            
            <div className="pt-8 md:pt-6 pb-4 px-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-b from-black/40 to-transparent">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">Hồ sơ cá nhân</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full transition-all active:scale-90">
                <X size={18} strokeWidth={2.5}/>
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-5 overflow-y-auto max-h-[70vh] no-scrollbar">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Tên hiển thị</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#80BF84] transition-colors"
                  placeholder="Nhập tên của bạn..."
                  value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Tiểu sử (Bio)</label>
                <textarea 
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#80BF84] transition-colors resize-none"
                  placeholder="Giới thiệu đôi nét về bạn..."
                  value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})}
                ></textarea>
              </div>
              
              <button type="submit" disabled={isUpdating} className="w-full py-4 mt-2 bg-gradient-to-tr from-[#80BF84] to-emerald-500 text-zinc-950 font-black text-sm rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}