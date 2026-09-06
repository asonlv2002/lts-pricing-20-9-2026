import type { CalculateInput } from './types';
import { tinhBaoGia } from './manager-calculation';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';

const CAC_KHOA_LOP = [
  'layer1Id',
  'layer2Id',
  'layer3Id',
  'layer4Id',
  'layer5Id',
] as const;

/**
 * Độ dày tổng (mic) cho báo giá — luôn ưu tiên SNAPSHOT lúc lưu bảng tính giá:
 *
 * 1. `input.totalThicknessMic` (engine đã chốt lúc lưu — gồm keo 3 mic/lớp ghép,
 *    làm tròn bậc 5) → khớp tuyệt đối con số màn hình tính giá, kể cả khi cấu
 *    hình vật liệu đổi sau khi lưu.
 * 2. Thiếu snapshot (dữ liệu cũ) → tính lại bằng engine với cấu hình hiện tại
 *    → tự khớp màn hình tính giá đang mở.
 * 3. Engine không chạy được → cộng mic từng lớp như cách cũ (chỉ để không trống).
 */
export function tinhTongDoDayCuaInput(input?: CalculateInput | null): number {
  if (!input || typeof input !== 'object') return 0;

  const snapshot = Number(input.totalThicknessMic);
  if (Number.isFinite(snapshot) && snapshot > 0) return snapshot;

  try {
    const st = dungCuaHangTinhGia.getState();
    const r = tinhBaoGia(
      input,
      st.materials,
      st.constants,
      st.profitTable,
      st.smallWidthPrices,
    );
    const doDay = Number(r?.totalThickness);
    if (Number.isFinite(doDay) && doDay > 0) return doDay;
  } catch {
    // rơi xuống cách cộng tay bên dưới
  }

  const { materials } = dungCuaHangTinhGia.getState();
  const micOverrides = input.micOverrides ?? {};
  let tong = 0;
  for (const khoaLop of CAC_KHOA_LOP) {
    const matId = input[khoaLop] as string | undefined;
    if (!matId) continue;
    const mat = materials.find((m) => m.id === matId);
    const ghiDe = micOverrides?.[khoaLop];
    tong += Number(ghiDe) || mat?.thickness || 0;
  }
  return tong || 0;
}
