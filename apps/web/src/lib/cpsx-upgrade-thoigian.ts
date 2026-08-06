import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayChay,
  CpsxUpgradeThoiGian,
} from './types';

/**
 * Kết quả thời gian SX — QUY TOÀN BỘ RA PHÚT (không dùng giờ).
 * Công thức máy in:
 *   setup (phút) = (số màu × phút setup × 60) ÷ số màu-trong-giờ
 *   chay  (phút) = mét ÷ tốc độ (m/giờ) × 60
 *   bonus (phút) = mét ÷ ngưỡng × 60 (nếu mét ≥ ngưỡng)
 * Công thức máy chạy (ghép/chia/làm túi):
 *   setup (phút) = phút setup
 *   chay  (phút) = số lượng ÷ tốc độ (đv/giờ) × 60
 */
export interface KetQuaThoiGian {
  tongPhut: number;
  chiTiet: {
    setupPhut: number;
    chayPhut: number;
    bonusPhut: number;
  };
}

export function tinhThoiGianMayIn(
  metIn: number,
  soMau: number,
  cfg: CpsxThoiGianMayIn,
): KetQuaThoiGian {
  const met = Number(metIn) || 0;
  const mau = Math.max(0, Number(soMau) || 0);
  const mauSoGio = Math.max(0, Number(cfg.mauSoGioSetup) || 0);
  const phutMoiMau = Math.max(0, Number(cfg.phutSetupMoiMau) || 0);
  const tocDo = Number(cfg.tocDoMetPerHour) || Number(cfg.tocDoNganMetPerHour) || 1;
  const nguong = Math.max(0, Number(cfg.nguongMet) || 0);

  const setupPhut = mauSoGio > 0 ? (mau * phutMoiMau * 60) / mauSoGio : 0;
  const chayPhut = (met / tocDo) * 60;
  const bonusPhut = nguong > 0 && met >= nguong ? (met / nguong) * 60 : 0;

  return {
    tongPhut: setupPhut + chayPhut + bonusPhut,
    chiTiet: { setupPhut, chayPhut, bonusPhut },
  };
}

export function tinhThoiGianMayChay(
  soLuong: number,
  cfg: CpsxThoiGianMayChay,
): KetQuaThoiGian {
  const sl = Math.max(0, Number(soLuong) || 0);
  const phut = Math.max(0, Number(cfg.phutSetup) || 0);
  const tocDo = Math.max(0, Number(cfg.tocDoPerHour) || 0);

  const setupPhut = phut;
  const chayPhut = tocDo > 0 ? (sl / tocDo) * 60 : 0;

  return {
    tongPhut: setupPhut + chayPhut,
    chiTiet: { setupPhut, chayPhut, bonusPhut: 0 },
  };
}

export function chuanHoaCpsxUpgradeThoiGian(
  raw: Partial<CpsxUpgradeThoiGian> | undefined,
  defaults: CpsxUpgradeThoiGian,
): CpsxUpgradeThoiGian {
  return {
    print: { ...defaults.print, ...(raw?.print ?? {}) },
    laminate: { ...defaults.laminate, ...(raw?.laminate ?? {}) },
    slit: { ...defaults.slit, ...(raw?.slit ?? {}) },
    bag: { ...defaults.bag, ...(raw?.bag ?? {}) },
  };
}
