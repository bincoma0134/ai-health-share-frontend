"use client";

import { useState, useEffect } from "react";
import { Ticket, Plus, X, CheckCircle2, Clock, AlertCircle, ShieldCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function VoucherManager() {
  const { user, userRole } = useAuth();
  const [activeView, setActiveView] = useState<"LIST" | "CREATE">("LIST");
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE FORM TẠO MÃ ---
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "PERCENTAGE",
    discount_value: "",
    max_discount_amount: "",
    min_order_value: "",
    total_quantity: "",
    valid_until: ""
  });

  // 1. LUỒNG LẤY DỮ LIỆU ĐỒNG BỘ BACKEND MAIN.PY
  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("ai-health-token");
      const endpoint = (userRole === "SUPER_ADMIN" || userRole === "MODERATOR") 
        ? `${API_URL}/admin/vouchers` 
        : `${API_URL}/partner/vouchers`; 

      const res = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok) setVouchers(result.data || []);
    } catch (error) {
      console.error("Lỗi tải danh sách mã:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchVouchers();
  }, [user, userRole]);

  // 2. LUỒNG TẠO MÃ BỌC THÉP SCHEMA
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const tid = toast.loading("Đang khởi tạo mã ưu đãi...");
    
    try {
      const token = localStorage.getItem("ai-health-token");
      
      // Bổ sung valid_from và applicable_services để Backend Pydantic không báo lỗi 422
      const payload = {
        code: formData.code.toUpperCase(),
        issuer_type: userRole === "SUPER_ADMIN" ? "ADMIN" : "PARTNER",
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        min_order_value: Number(formData.min_order_value),
        applicable_services: [],
        total_quantity: Number(formData.total_quantity),
        valid_from: new Date().toISOString(),
        valid_until: new Date(formData.valid_until).toISOString()
      };

      const res = await fetch(`${API_URL}/vouchers/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Không thể tạo mã");

      toast.success(userRole === "PARTNER_ADMIN" ? "Đã gửi yêu cầu tạo mã chờ duyệt!" : "Tạo mã thành công!", { id: tid });
      setActiveView("LIST");
      fetchVouchers(); // Refresh list
      
      // Reset form
      setFormData({
        code: "", discount_type: "PERCENTAGE", discount_value: "", max_discount_amount: "", min_order_value: "", total_quantity: "", valid_until: ""
      });

    } catch (error: any) {
      toast.error(error.message, { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. LUỒNG KIỂM DUYỆT (CHỈ DÀNH CHO MODERATOR/ADMIN) ĐỒNG BỘ BACKEND
  const handleUpdateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    const tid = toast.loading("Đang cập nhật trạng thái...");
    try {
      const token = localStorage.getItem("ai-health-token");
      const res = await fetch(`${API_URL}/admin/vouchers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      toast.success("Cập nhật thành công!", { id: tid });
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.message, { id: tid });
    }
  };

  return (
    <div className="w-full animate-fade-in">
      {/* HEADER ĐIỀU HƯỚNG */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Ticket className="text-[#80BF84]" /> Quản Lý Ưu Đãi
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {userRole === "PARTNER_ADMIN" ? "Tạo và quản lý các mã giảm giá cho cơ sở của bạn." : "Trạm kiểm duyệt và phát hành mã toàn sàn."}
          </p>
        </div>
        
        {activeView === "LIST" ? (
          <button onClick={() => setActiveView("CREATE")} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg">
            <Plus size={18} /> Tạo mã mới
          </button>
        ) : (
          <button onClick={() => setActiveView("LIST")} className="px-6 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
            Hủy bỏ
          </button>
        )}
      </div>

      {/* VIEW 1: DANH SÁCH MÃ */}
      {activeView === "LIST" && (
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
          {isLoading ? (
             <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#80BF84] border-t-transparent rounded-full animate-spin"></div></div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-20 opacity-60">
              <Ticket className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="font-bold text-lg">Chưa có mã ưu đãi nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-zinc-400 font-bold">
                  <tr>
                    <th className="p-5">Mã Code</th>
                    <th className="p-5">Loại giảm</th>
                    <th className="p-5">Đã dùng / Tổng</th>
                    <th className="p-5">Hạn sử dụng</th>
                    <th className="p-5">Trạng thái</th>
                    {(userRole === "MODERATOR" || userRole === "SUPER_ADMIN") && <th className="p-5">Duyệt</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-5 font-black font-mono text-[#80BF84] tracking-widest">{v.code}</td>
                      <td className="p-5 font-medium text-slate-700 dark:text-zinc-300">
                        {v.discount_type === 'PERCENTAGE' ? `${v.discount_value}%` : `${(v.discount_value/1000)}K`}
                      </td>
                      <td className="p-5 font-bold">
                        <span className="text-slate-900 dark:text-white">{v.used_quantity}</span> / <span className="text-slate-500">{v.total_quantity}</span>
                      </td>
                      <td className="p-5 text-slate-500">{new Date(v.valid_until).toLocaleDateString('vi-VN')}</td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider
                          ${v.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20' : 
                            v.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 animate-pulse' : 
                            'bg-rose-100 text-rose-700 dark:bg-rose-500/20'}`}>
                          {v.status}
                        </span>
                      </td>
                      {/* Cột Action cho MODERATOR */}
                      {(userRole === "MODERATOR" || userRole === "SUPER_ADMIN") && (
                        <td className="p-5 flex gap-2">
                          {v.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleUpdateStatus(v.id, "APPROVED")} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors"><CheckCircle2 size={16}/></button>
                              <button onClick={() => handleUpdateStatus(v.id, "REJECTED")} className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors"><X size={16}/></button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: FORM KHỞI TẠO MÃ */}
      {activeView === "CREATE" && (
        <form onSubmit={handleCreateVoucher} className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Mã Ưu Đãi (Code)</label>
              <input type="text" required placeholder="VD: CHAOHE2026" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl font-mono uppercase font-black focus:border-[#80BF84] outline-none transition-colors" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Loại chiết khấu</label>
              <select className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl font-bold focus:border-[#80BF84] outline-none transition-colors appearance-none" value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                <option value="PERCENTAGE">Giảm theo Phần trăm (%)</option>
                <option value="FIXED_AMOUNT">Giảm Tiền mặt (VNĐ)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Mức giảm</label>
              <input type="number" required placeholder={formData.discount_type === 'PERCENTAGE' ? "VD: 20 (%)" : "VD: 50000 (VNĐ)"} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl font-bold focus:border-[#80BF84] outline-none transition-colors" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Giảm tối đa (Tùy chọn)</label>
              <input type="number" placeholder="Chỉ dùng khi giảm %..." className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl font-bold focus:border-[#80BF84] outline-none transition-colors" value={formData.max_discount_amount} onChange={e => setFormData({...formData, max_discount_amount: e.target.value})} disabled={formData.discount_type === 'FIXED_AMOUNT'} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Đơn tối thiểu áp dụng</label>
              <input type="number" required placeholder="VD: 200000" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl font-bold focus:border-[#80BF84] outline-none transition-colors" value={formData.min_order_value} onChange={e => setFormData({...formData, min_order_value: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Số lượng</label>
                <input type="number" required placeholder="VD: 100" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl font-bold focus:border-[#80BF84] outline-none transition-colors" value={formData.total_quantity} onChange={e => setFormData({...formData, total_quantity: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Hạn sử dụng</label>
                <input type="date" required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl font-bold focus:border-[#80BF84] outline-none transition-colors" value={formData.valid_until} onChange={e => setFormData({...formData, valid_until: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
             <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#80BF84] to-emerald-500 text-zinc-950 font-black rounded-2xl active:scale-95 transition-all shadow-[0_10px_20px_rgba(128,191,132,0.3)] flex justify-center items-center gap-2 uppercase tracking-widest text-sm">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div> : <Send size={18} />}
                {userRole === "PARTNER_ADMIN" ? "Gửi Yêu Cầu Duyệt" : "Phát Hành Mã"}
             </button>
          </div>
        </form>
      )}
    </div>
  );
}