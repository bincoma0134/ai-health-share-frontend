"use client";

import { useEffect, useState } from "react";
import { 
  Home, ShieldCheck, Sun, Moon, CheckCircle, XCircle, 
  Clock, AlertTriangle, FileText, X, LayoutDashboard, Package, Video, 
  Trash2, Search, History, ShieldAlert, TrendingUp, PieChart as PieChartIcon, Activity, Eye
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Thiếu cấu hình!");
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface QueueItem {
    id: string; type: 'service' | 'video'; title: string; description?: string;
    price?: number; media_url?: string; image_url?: string; video_url?: string;
    status: string; created_at: string; updated_at?: string; moderation_note?: string;
    author?: { full_name?: string; email?: string; avatar_url?: string };
}

const CHART_COLORS = ['#8b5cf6', '#f43f5e'];

export default function ModeratorDashboard() {
  const router = useRouter();
  const { theme, toggleTheme } = useUI() as any;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'history'>('overview');
  const [filterType, setFilterType] = useState<'all' | 'service' | 'video' | 'delete' | 'edit'>('all');
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<any>({ total_processed: 0, approved_count: 0, rejected_count: 0, chart_data: [] });
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => { setIsMounted(true); fetchAllData(); }, [router]);

  const fetchAllData = async () => {
      setIsLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { router.push("/"); return; }

          const [qRes, hRes, sRes] = await Promise.all([
              fetch(`${API_URL}/moderation/queue`, { headers: { "Authorization": `Bearer ${session.access_token}` } }),
              fetch(`${API_URL}/moderation/history`, { headers: { "Authorization": `Bearer ${session.access_token}` } }),
              fetch(`${API_URL}/moderation/stats`, { headers: { "Authorization": `Bearer ${session.access_token}` } })
          ]);
          
          const qData = await qRes.json();
          const hData = await hRes.json();
          const sData = await sRes.json();
          
          if (qData.status === "success") setQueue(qData.data || []);
          if (hData.status === "success") setHistory(hData.data || []);
          if (sData.status === "success") setStats(sData.data || { total_processed: 0, approved_count: 0, rejected_count: 0, chart_data: [] });
      } catch (error) { 
          toast.error("Lỗi đồng bộ dữ liệu hệ thống!"); 
      } finally { 
          setIsLoading(false); 
      }
  };

  const handleModerate = async (action: 'APPROVED' | 'REJECTED' | 'DELETED') => {
      if (!selectedItem) return;
      if (action === 'REJECTED' && !rejectNote.trim()) return toast.error("Bắt buộc phải nhập lý do từ chối!");

      setIsProcessing(true);
      const tid = toast.loading(`Đang xử lý ${action}...`);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${API_URL}/moderation/action/${selectedItem.type}/${selectedItem.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
              body: JSON.stringify({ action, note: rejectNote.trim() })
          });
          if (!res.ok) throw new Error("Lỗi xử lý");
          toast.success("Xử lý thành công!", { id: tid });
          fetchAllData(); // Lập tức tải lại biểu đồ & danh sách
          closeModal();
      } catch (e: any) { toast.error(e.message, { id: tid }); }
      finally { setIsProcessing(false); }
  };

  const closeModal = () => { setSelectedItem(null); setShowRejectInput(false); setRejectNote(""); };

  const filteredQueue = (queue || []).filter(q => {
      if (filterType === 'service') return q.type === 'service' && q.status === 'PENDING';
      if (filterType === 'video') return q.type === 'video' && q.status === 'PENDING';
      if (filterType === 'delete') return q.status === 'PENDING_DELETE';
      if (filterType === 'edit') return q.status === 'PENDING_UPDATE';
      return true;
  });

  const getMediaUrl = (item: QueueItem) => item.media_url || item.video_url || item.image_url;

  // Xác định xem item đang mở trong Modal là để "Xem lại" (History) hay "Ra quyết định" (Queue)
  const isReadonlyModal = selectedItem && ['APPROVED', 'REJECTED', 'DELETED'].includes(selectedItem.status);

  if (!isMounted) return null;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden flex flex-col transition-colors duration-500 font-be-vietnam">
      
      {/* TOP HEADER */}
      <div className="flex justify-between items-center px-6 md:px-10 py-5 bg-white/60 dark:bg-black/60 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 z-20">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg"><ShieldCheck className="text-white" size={24}/></div>
              <div className="hidden md:block">
                  <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest leading-tight">AI Health</h1>
                  <p className="text-[10px] text-violet-500 font-bold uppercase tracking-widest">Moderator Workspace</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-violet-500 transition-colors">{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
              <button onClick={() => router.push('/moderator/profile')} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-violet-500 transition-colors"><Home size={18}/></button>
          </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
          {/* SIDEBAR */}
          <div className="w-20 md:w-64 border-r border-slate-200 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl flex flex-col py-6 z-10">
              <div className="flex-1 px-4 space-y-2">
                  <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'overview' ? 'bg-violet-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                      <LayoutDashboard size={20}/> <span className="hidden md:block">Tổng quan</span>
                  </button>
                  <button onClick={() => setActiveTab('queue')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'queue' ? 'bg-violet-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                      <div className="flex items-center gap-4"><Clock size={20}/> <span className="hidden md:block">Hàng đợi</span></div>
                      {(queue || []).length > 0 && <span className="hidden md:flex px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">{queue.length}</span>}
                  </button>
                  <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'history' ? 'bg-violet-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                      <History size={20}/> <span className="hidden md:block">Lịch sử xử lý</span>
                  </button>
              </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-zinc-950/50 p-6 md:p-10">
              {isLoading ? (
                  <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                  <div className="animate-fade-in max-w-[1400px] mx-auto space-y-10">
                      
                      {/* --- OVERVIEW THỐNG KÊ THỰC TẾ --- */}
                      {activeTab === 'overview' && (
                          <div className="space-y-10">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Clock size={100}/></div>
                                      <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Clock size={16}/> Hệ thống tồn đọng</span>
                                      <span className="text-5xl font-black text-slate-900 dark:text-white">{(queue || []).length}</span>
                                  </div>
                                  <div className="p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck size={100}/></div>
                                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2"><CheckCircle size={16}/> Hiệu suất cá nhân</span>
                                      <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.total_processed}</span>
                                  </div>
                                  <div className="p-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-[2.5rem] shadow-xl flex flex-col gap-2 text-white relative overflow-hidden">
                                      <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingUp size={100}/></div>
                                      <span className="text-xs font-bold text-violet-200 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16}/> Tỷ lệ phê duyệt</span>
                                      <span className="text-5xl font-black">{stats.total_processed > 0 ? Math.round((stats.approved_count / stats.total_processed) * 100) : 0}%</span>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                  <div className="lg:col-span-2 p-8 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                                      <h3 className="text-sm font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-8 flex items-center gap-2"><Activity size={18} className="text-violet-500"/> Biểu đồ 7 ngày qua</h3>
                                      <div className="h-[350px] w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                              <AreaChart data={stats.chart_data || []}>
                                                  <defs>
                                                      <linearGradient id="colorDuyet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                                                      <linearGradient id="colorTuChoi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                                                  </defs>
                                                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                                  <Tooltip contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                                  <Area type="monotone" dataKey="Duyệt" stroke="#8b5cf6" strokeWidth={4} fill="url(#colorDuyet)" />
                                                  <Area type="monotone" dataKey="Từ chối" stroke="#f43f5e" strokeWidth={4} fill="url(#colorTuChoi)" />
                                              </AreaChart>
                                          </ResponsiveContainer>
                                      </div>
                                  </div>
                                  <div className="p-8 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
                                      <h3 className="text-sm font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-8"><PieChartIcon size={18} className="inline mr-2 text-rose-500"/> Cơ cấu quyết định</h3>
                                      <div className="flex-1 w-full relative min-h-[250px]">
                                          {stats.total_processed > 0 ? (
                                              <ResponsiveContainer width="100%" height="100%">
                                                  <PieChart>
                                                      <Pie data={[{name: 'Duyệt', value: stats.approved_count}, {name: 'Từ chối', value: stats.rejected_count}]} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                                                          <Cell fill="#8b5cf6" /><Cell fill="#f43f5e" />
                                                      </Pie>
                                                      <Tooltip />
                                                  </PieChart>
                                              </ResponsiveContainer>
                                          ) : (
                                              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Trống</div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* --- QUEUE LIST --- */}
                      {activeTab === 'queue' && (
                          <div className="space-y-6">
                              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
                                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Hàng Đợi Xử Lý</h2>
                                  <div className="flex flex-wrap gap-2">
                                      {[{id:'all', label:'Tất cả'}, {id:'service', label:'Dịch vụ'}, {id:'video', label:'Video'}, {id:'delete', label:'Yêu cầu gỡ'}, {id:'edit', label:'Bản cập nhật'}].map(f => (
                                          <button key={f.id} onClick={() => setFilterType(f.id as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === f.id ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-violet-500'}`}>
                                              {f.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              {filteredQueue.length === 0 ? (
                                  <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
                                      <ShieldCheck size={48} className="mx-auto text-emerald-500 opacity-50 mb-4"/>
                                      <p className="font-black text-lg text-slate-700 dark:text-zinc-300">Không có yêu cầu nào!</p>
                                  </div>
                              ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                      {filteredQueue.map(item => (
                                          <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200 dark:border-white/10 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group">
                                              <div className="flex justify-between items-center mb-3">
                                                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center gap-1 ${item.type === 'service' ? 'bg-blue-100 text-blue-600' : 'bg-fuchsia-100 text-fuchsia-600'}`}>
                                                      {item.type === 'service' ? <Package size={10}/> : <Video size={10}/>} {item.type}
                                                  </span>
                                                  <span className={`text-[10px] font-black uppercase ${item.status.includes('DELETE') ? 'text-rose-500' : item.status.includes('UPDATE') ? 'text-amber-500' : 'text-violet-500'}`}>
                                                      {item.status.split('_').pop()}
                                                  </span>
                                              </div>
                                              <div className="aspect-[16/9] rounded-xl bg-slate-100 dark:bg-black overflow-hidden mb-3 relative">
                                                  {getMediaUrl(item) ? (
                                                      getMediaUrl(item)?.includes('.mp4') ? <video src={getMediaUrl(item)} className="w-full h-full object-cover opacity-80" /> : <img src={getMediaUrl(item)} className="w-full h-full object-cover" />
                                                  ) : <FileText size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300"/>}
                                                  <div className="absolute inset-0 bg-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"><Search className="text-white"/></div>
                                              </div>
                                              <h3 className="font-bold text-slate-900 dark:text-white truncate">{item.title}</h3>
                                              <p className="text-xs text-slate-500 mt-1 truncate">Bởi: {item.author?.full_name}</p>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}

                      {/* --- HISTORY TABLE MỚI --- */}
                      {activeTab === 'history' && (
                          <div className="space-y-6">
                              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Lịch Sử Ra Quyết Định</h2>
                              <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                                  <div className="overflow-x-auto no-scrollbar">
                                      <table className="w-full text-left min-w-[1000px]">
                                          <thead className="bg-slate-50 dark:bg-black/50 border-b border-slate-200 dark:border-white/10">
                                              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                  <th className="p-5">STT</th>
                                                  <th className="p-5">Thời gian</th>
                                                  <th className="p-5">Người duyệt</th>
                                                  <th className="p-5">Đối tác</th>
                                                  <th className="p-5">Bản ghi</th>
                                                  <th className="p-5">Trạng thái</th>
                                                  <th className="p-5">Ghi chú</th>
                                              </tr>
                                          </thead>
                                          <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                                              {(history || []).length === 0 ? (
                                                  <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Chưa có lịch sử</td></tr>
                                              ) : (
                                                  history.map((item, idx) => (
                                                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                          <td className="p-5 font-black text-xs text-slate-400">{idx + 1}</td>
                                                          
                                                          <td className="p-5">
                                                              <span className="font-bold text-slate-900 dark:text-white block">
                                                                  {new Date(item.updated_at || item.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                                              </span>
                                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                  {new Date(item.updated_at || item.created_at).toLocaleDateString('vi-VN')}
                                                              </span>
                                                          </td>

                                                          <td className="p-5">
                                                              <div className="flex items-center gap-2">
                                                                  <div className="w-7 h-7 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-lg"><ShieldCheck size={14}/></div>
                                                                  <span className="font-bold text-slate-700 dark:text-zinc-300 text-xs">Bạn (Moderator)</span>
                                                              </div>
                                                          </td>

                                                          <td className="p-5 flex items-center gap-2">
                                                              <img src={item.author?.avatar_url || `https://ui-avatars.com/api/?name=${item.author?.full_name}`} className="w-7 h-7 rounded-full border border-slate-200 dark:border-white/10"/>
                                                              <span className="font-bold text-slate-700 dark:text-zinc-300 text-xs truncate max-w-[120px]">{item.author?.full_name}</span>
                                                          </td>

                                                          <td className="p-5">
                                                              <button onClick={() => setSelectedItem(item)} className="px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors">
                                                                  <Eye size={12}/> Xem
                                                              </button>
                                                          </td>

                                                          <td className="p-5">
                                                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border ${item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : item.status === 'DELETED' ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/10' : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                                                                  {item.status}
                                                              </span>
                                                          </td>

                                                          <td className="p-5 text-xs text-slate-500 italic max-w-[150px] truncate" title={item.moderation_note}>{item.moderation_note || '-'}</td>
                                                      </tr>
                                                  ))
                                              )}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          </div>
                      )}

                  </div>
              )}
          </div>
      </div>

      {/* --- MODAL XỬ LÝ & XEM CHI TIẾT (DÙNG CHUNG THÔNG MINH) --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 md:p-8">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={closeModal}></div>
            <div className="relative w-full max-w-6xl h-[90vh] bg-slate-100 dark:bg-zinc-950 rounded-[2rem] z-10 shadow-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row animate-slide-up">
                
                <div className={`w-full md:w-3/5 h-1/2 md:h-full flex ${selectedItem.status === 'PENDING_UPDATE' ? 'divide-x divide-white/20' : ''}`}>
                    {selectedItem.status === 'PENDING_UPDATE' && (
                        <div className="flex-1 bg-slate-200 dark:bg-zinc-900 relative p-6 flex flex-col">
                            <div className="absolute top-4 left-4"><span className="px-2 py-1 bg-slate-500 text-white text-[10px] font-black rounded-md">BẢN CŨ ĐANG LƯU</span></div>
                            <div className="flex-1 mt-8 opacity-70 grayscale overflow-y-auto no-scrollbar">
                                <h3 className="text-xl font-bold line-through">{selectedItem.title}</h3>
                                <p className="text-rose-500 font-bold my-2">{(selectedItem.price || 0) - 50000} VND</p>
                                <p className="text-sm">{selectedItem.description}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-4">
                        {selectedItem.status === 'PENDING_UPDATE' && <div className="absolute top-4 left-4 z-10"><span className="px-2 py-1 bg-amber-500 text-white text-[10px] font-black rounded-md">BẢN CẬP NHẬT MỚI</span></div>}
                        {selectedItem.status === 'PENDING_DELETE' && <div className="absolute inset-0 bg-rose-500/20 z-10 pointer-events-none flex items-center justify-center"><ShieldAlert size={100} className="text-rose-500 opacity-50"/></div>}
                        
                        {/* THÔNG BÁO DÀNH CHO TAB LỊCH SỬ (ĐÃ XỬ LÝ) */}
                        {isReadonlyModal && <div className="absolute top-4 right-4 z-10"><span className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg flex items-center gap-1"><CheckCircle size={14}/> ĐÃ HOÀN TẤT XỬ LÝ</span></div>}

                        <div className="w-full max-h-full overflow-hidden flex justify-center rounded-xl">
                            {getMediaUrl(selectedItem) ? (
                                getMediaUrl(selectedItem)?.includes('.mp4') ? <video src={getMediaUrl(selectedItem)} className="max-w-full max-h-full object-contain" controls autoPlay loop /> : <img src={getMediaUrl(selectedItem)} className="max-w-full max-h-full object-contain" />
                            ) : <FileText size={64} className="text-slate-600"/>}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-2/5 bg-white dark:bg-zinc-900 h-1/2 md:h-full flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-20">
                    <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <img src={selectedItem.author?.avatar_url || `https://ui-avatars.com/api/?name=${selectedItem.author?.full_name}`} className="w-10 h-10 rounded-full border border-slate-200"/>
                            <div><p className="text-sm font-black text-slate-900 dark:text-white">{selectedItem.author?.full_name}</p><p className="text-[10px] text-slate-500">ID: {selectedItem.id.split('-')[0]}</p></div>
                        </div>
                        <button onClick={closeModal} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500"><X size={18}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white leading-snug">{selectedItem.title}</h2>
                        {selectedItem.price && <p className="text-lg font-black text-emerald-500">{selectedItem.price.toLocaleString()} VND</p>}
                        <div className="p-4 bg-slate-50 dark:bg-black/30 rounded-xl text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap border border-slate-200 dark:border-white/5">{selectedItem.description || "Nội dung này không có mô tả chi tiết."}</div>
                        
                        {/* Hiện Ghi chú cũ nếu xem trong Lịch sử */}
                        {isReadonlyModal && selectedItem.moderation_note && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                                <label className="block text-[10px] font-black text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-widest">Ghi chú của bạn:</label>
                                <p className="text-sm text-slate-700 dark:text-zinc-300 italic">{selectedItem.moderation_note}</p>
                            </div>
                        )}

                        {showRejectInput && !isReadonlyModal && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl animate-fade-in">
                                <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-2 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={14}/> Nhập lý do (Bắt buộc):</label>
                                <textarea rows={3} className="w-full p-3 bg-white dark:bg-black/50 border border-rose-200 dark:border-rose-500/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none" placeholder="Vd: Video mờ, giá không hợp lý..." value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex flex-col gap-3">
                        
                        {isReadonlyModal ? (
                            <button onClick={closeModal} className="w-full py-4 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-black rounded-xl hover:bg-slate-300 dark:hover:bg-zinc-700 transition-all flex justify-center gap-2">
                                ĐÓNG CỬA SỔ
                            </button>
                        ) : selectedItem.status === 'PENDING_DELETE' ? (
                            <><button onClick={() => handleModerate('DELETED')} disabled={isProcessing} className="w-full py-4 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-all flex justify-center gap-2 shadow-lg shadow-rose-500/20"><Trash2 size={20}/> DUYỆT CHO PHÉP XÓA</button><button onClick={() => handleModerate('APPROVED')} disabled={isProcessing} className="w-full py-4 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-black rounded-xl hover:bg-slate-300 dark:hover:bg-zinc-700 transition-all flex justify-center gap-2"><XCircle size={20}/> TỪ CHỐI YÊU CẦU XÓA</button></>
                        ) : (
                            <>
                                {!showRejectInput ? (<button onClick={() => setShowRejectInput(true)} className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-xl border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 transition-all">YÊU CẦU ĐIỀU CHỈNH</button>) : (<button onClick={() => handleModerate('REJECTED')} disabled={isProcessing} className="w-full py-3 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-all">XÁC NHẬN TỪ CHỐI</button>)}
                                <button onClick={() => handleModerate('APPROVED')} disabled={isProcessing || showRejectInput} className={`w-full py-4 font-black rounded-xl transition-all flex justify-center gap-2 ${showRejectInput ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-zinc-800 text-slate-400' : 'bg-violet-500 text-white hover:bg-violet-600 shadow-lg shadow-violet-500/20'}`}><CheckCircle size={20}/> PHÊ DUYỆT {selectedItem.status === 'PENDING_UPDATE' ? 'BẢN SỬA' : 'LÊN FEED'}</button>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
      )}
    </div>
  );
}