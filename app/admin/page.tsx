"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, Clock, LogOut } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- KHỞI TẠO SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu biến môi trường Supabase!");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🔒 EMAIL ADMIN BẢO MẬT (Chỉ email này mới được vào trang Admin)
const ADMIN_EMAIL = "clonestest011@gmail.com";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session) {
          toast.error("Vui lòng đăng nhập!");
          router.push("/");
          return;
        }

        // 🚨 THAY ĐỔI TẠI ĐÂY: Truy vấn vào bảng public.users để lấy Role thực tế
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (userError || userData?.role !== 'SUPER ADMIN') {
          toast.error("Truy cập bị từ chối! Bạn không phải SuperAdmin.");
          router.push("/partner");
          return;
        }

        setUser(session.user);

        // Lấy danh sách yêu cầu rút tiền (Giữ nguyên đoạn fetch cũ)
        const res = await fetch("https://ai-health-share-backend.onrender.com/admin/withdrawals", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        
        if (!res.ok) throw new Error("Lỗi tải dữ liệu Quản trị");
        const data = await res.json();
        if (data.status === "success") setRequests(data.data || []);

      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleProcessRequest = async (id: string, status: "APPROVED" | "REJECTED") => {
    if (!confirm(`Bạn có chắc chắn muốn ${status === "APPROVED" ? "DUYỆT (Đã chuyển tiền)" : "TỪ CHỐI (Hoàn tiền)"} yêu cầu này?`)) return;
    
    setProcessingId(id);
    const toastId = toast.loading("Đang xử lý trên hệ thống...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập hết hạn!");

      const res = await fetch(`https://ai-health-share-backend.onrender.com/admin/withdraw/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          status: status,
          admin_note: status === "APPROVED" ? "Đã chuyển khoản thành công" : "Từ chối do sai thông tin ngân hàng"
        })
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.detail || "Lỗi xử lý");
      }

      toast.success(data.message, { id: toastId });
      
      // Cập nhật lại UI ngay lập tức
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: status } : req));

    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      {/* HEADER ADMIN */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900/80 p-4 md:p-6 rounded-2xl border border-zinc-800 shadow-lg shadow-emerald-900/10">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} className="text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-wider">SUPER<span className="text-emerald-400">ADMIN</span></h1>
            <p className="text-sm text-zinc-400 mt-1">Trạm kiểm soát dòng tiền trung tâm</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 md:px-4 md:py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition flex items-center gap-2">
          <LogOut size={18} /> <span className="hidden md:inline">Đăng xuất</span>
        </button>
      </div>

      {/* BẢNG YÊU CẦU RÚT TIỀN */}
      <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Clock className="text-emerald-400" /> Quản lý Yêu cầu Rút tiền
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                <th className="pb-3 font-medium px-4">Thời gian</th>
                <th className="pb-3 font-medium px-4">User ID</th>
                <th className="pb-3 font-medium px-4">Số tiền (VND)</th>
                <th className="pb-3 font-medium px-4">Thông tin Ngân hàng</th>
                <th className="pb-3 font-medium px-4">Trạng thái</th>
                <th className="pb-3 font-medium px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-zinc-500">Hệ thống đang rảnh, không có yêu cầu nào!</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="border-b border-zinc-800/50 hover:bg-zinc-950/50 transition">
                    <td className="py-4 px-4 text-zinc-400">{new Date(req.created_at).toLocaleString('vi-VN')}</td>
                    <td className="py-4 px-4"><span className="px-2 py-1 bg-zinc-800 rounded text-xs">{req.user_id.substring(0, 8)}...</span></td>
                    <td className="py-4 px-4 font-bold text-emerald-400">{req.amount.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <p className="text-white font-medium">{req.payout_info?.bank_name}</p>
                      <p className="text-zinc-400 text-xs">{req.payout_info?.account_number} - {req.payout_info?.account_name}</p>
                    </td>
                    <td className="py-4 px-4">
                      {req.status === 'PENDING' && <span className="text-orange-400 bg-orange-400/10 px-2 py-1 rounded-md text-xs font-bold">CHỜ DUYỆT</span>}
                      {req.status === 'APPROVED' && <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md text-xs font-bold">ĐÃ DUYỆT</span>}
                      {req.status === 'REJECTED' && <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded-md text-xs font-bold">TỪ CHỐI</span>}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {req.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleProcessRequest(req.id, "APPROVED")}
                            disabled={processingId === req.id}
                            className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition"
                            title="Duyệt (Đã chuyển tiền)"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleProcessRequest(req.id, "REJECTED")}
                            disabled={processingId === req.id}
                            className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                            title="Từ chối (Hoàn tiền vào ví)"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}