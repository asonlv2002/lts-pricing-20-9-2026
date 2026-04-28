// ═══════════════════════════════════════════════════════════════════════════
// Cửa hàng — (Đã đơn giản hoá) chế độ chọn vai trò không cần user CRUD
// Giữ file này để tương thích import; sẽ mở rộng lại khi cần multi-user thực sự
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';

interface CuaHangNguoiDung {
  daKhoiTao: boolean;
  khoiTaoMacDinh: () => void;
}

export const dungCuaHangNguoiDung = create<CuaHangNguoiDung>()((set) => ({
  daKhoiTao: false,
  khoiTaoMacDinh: () => set({ daKhoiTao: true }),
}));
