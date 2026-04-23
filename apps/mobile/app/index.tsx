// ═══════════════════════════════════════════════════════════════════════════
// Trang gốc — chỉ chuyển hướng theo trạng thái phiên (đã chọn vai trò chưa)
// ═══════════════════════════════════════════════════════════════════════════
import { Redirect } from 'expo-router';
import { dungCuaHangAuth } from '../src/store/cua-hang-auth';

export default function TrangGoc() {
  const vaiTro = dungCuaHangAuth((s) => s.vaiTroHienTai);
  return <Redirect href={vaiTro ? '/(tabs)' : '/(auth)/chon-vai-tro'} />;
}
