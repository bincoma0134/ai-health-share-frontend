import { create } from 'zustand';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface VoucherStore {
  myVouchers: any[];
  publicVouchers: any[];
  isLoading: boolean;
  fetchMyVouchers: (token: string) => Promise<void>;
  fetchPublicVouchers: () => Promise<void>;
  claimVoucher: (code: string, token: string) => Promise<boolean>;
  clearVouchers: () => void;
}

export const useVoucherStore = create<VoucherStore>((set, get) => ({
  myVouchers: [],
  publicVouchers: [],
  isLoading: false,

  fetchMyVouchers: async (token) => {
    try {
      const res = await fetch(`${API_URL}/vouchers/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.status === "success") {
        set({ myVouchers: result.data || [] });
      }
    } catch (error) {
      console.error("Lỗi lấy ví voucher:", error);
    }
  },

  fetchPublicVouchers: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/vouchers/public`);
      const result = await res.json();
      if (result.status === "success") {
        set({ publicVouchers: result.data || [] });
      }
    } catch (error) {
      console.error("Lỗi lấy kho voucher:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  claimVoucher: async (code, token) => {
    try {
      const res = await fetch(`${API_URL}/vouchers/${code}/claim`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (res.ok && result.status === "success") {
        toast.success("Đã lưu mã thành công!");
        await get().fetchMyVouchers(token); // Tự động load lại ví ngay lập tức
        return true;
      } else {
        toast.error(result.detail || "Không thể lưu mã này!");
        return false;
      }
    } catch (error) {
      toast.error("Lỗi kết nối máy chủ!");
      return false;
    }
  },

  clearVouchers: () => set({ myVouchers: [] })
}));