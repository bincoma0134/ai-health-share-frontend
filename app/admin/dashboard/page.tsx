"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, Clock, Banknote } from "lucide-react";

export default function AdminDashboard() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch("https://ai-health-share-backend.onrender.com/admin/withdrawals");
      const result = await res.json();
      if (res.ok && result.status === "success") {
        setWithdrawals(result.data);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách rút tiền:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleProcess = async (id: string, status: "APPROVED" | "REJECTED") => {
    let note = "";
    if (status === "REJECTED") {
      const reason = window.prompt("Lý do từ chối (sẽ hoàn lại tiền cho user):");
      if (reason === null) return; // Hủy thao tác
      note = reason;
    } else {
      const confirm = window.confirm("Xác nhận bạn đã chuyển khoản số tiền này cho đối tác?");
      if (!confirm) return;
    }

    try {
      const res = await fetch(`https://ai-health-share-backend.onrender.com/admin/withdraw/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status, admin_note: note })
      });
      const result = await res.json();

      if (res.ok && result.status === "success") {
        alert(`Đã xử lý thành công: ${status}`);
        fetchWithdrawals(); // Reload danh sách
      } else {
        alert("Có lỗi xảy ra: " + result.detail);
      }
    } catch (error) {
      alert("Lỗi kết nối server!");
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-emerald-500">Đang tải dữ liệu Admin...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="text-emerald-500" size={36} />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              SuperAdmin Dashboard
            </h1>
            <p className="text-zinc-400 mt-1">Quản lý dòng tiền và phê duyệt yêu cầu rút tiền.</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/50 text-zinc-400 text-sm border-b border-zinc-800">
                  <th className="p-4 font-medium">Thời gian</th>
                  <th className="p-4 font-medium">User ID</th>
                  <th className="p-4 font-medium">Thông tin Ngân hàng</th>
                  <th className="p-4 font-medium text-right">Số tiền</th>
                  <th className="p-4 font-medium text-center">Trạng thái</th>
                  <th className="p-4 font-medium text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-800/50">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">Không có yêu cầu rút tiền nào.</td>
                  </tr>
                ) : (
                  withdrawals.map((wd) => (
                    <tr key={wd.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="p-4 text-zinc-400">{new Date(wd.created_at).toLocaleString('vi-VN')}</td>
                      <td className="p-4 font-mono text-xs text-zinc-500">{wd.user_id.substring(0, 8)}...</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-emerald-400 uppercase">{wd.payout_info.bank_name}</span>
                          <span className="text-zinc-300">{wd.payout_info.account_number}</span>
                          <span className="text-xs text-zinc-500">{wd.payout_info.account_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-white text-lg">
                        {wd.amount.toLocaleString()} đ
                      </td>
                      <td className="p-4 text-center">
                        {wd.status === "PENDING" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium"><Clock size={14}/> Chờ duyệt</span>}
                        {wd.status === "APPROVED" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium"><CheckCircle size={14}/> Đã Duyệt</span>}
                        {wd.status === "REJECTED" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-medium"><XCircle size={14}/> Đã Hủy</span>}
                      </td>
                      <td className="p-4">
                        {wd.status === "PENDING" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleProcess(wd.id, "APPROVED")} className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition-colors" title="Đã chuyển khoản (Duyệt)">
                              <CheckCircle size={20} />
                            </button>
                            <button onClick={() => handleProcess(wd.id, "REJECTED")} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-colors" title="Từ chối (Hoàn tiền)">
                              <XCircle size={20} />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-zinc-600 font-mono italic">
                            {wd.admin_note || "No note"}
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
    </div>
  );
}