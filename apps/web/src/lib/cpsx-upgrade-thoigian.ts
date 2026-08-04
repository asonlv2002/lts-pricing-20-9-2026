import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayChay,
  CpsxUpgradeThoiGian,
} from './types';

export interface KetQuaThoiGian {
  tongGio: number;
  tongPhut: number;
  chiTiet: {
    setup: number;
    chay: number;
    bonus: number;
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

  const setup = mauSoGio > 0 ? (mau * phutMoiMau) / mauSoGio : 0;
  const chay = met / tocDo;
  const bonus = nguong > 0 && met >= nguong ? met / nguong : 0;
  const tongGio = setup + chay + bonus;

  return {
    tongGio,
    tongPhut: tongGio * 60,
    chiTiet: { setup, chay, bonus },
  };
}

export function tinhThoiGianMayChay(
  met: number,
  cfg: CpsxThoiGianMayChay,
): KetQuaThoiGian {
  const soLuong = Math.max(0, Number(met) || 0);
  const phut = Math.max(0, Number(cfg.phutSetup) || 0);
  const tocDo = Math.max(0, Number(cfg.tocDoPerHour) || 0);

  const setup = phut / 60;
  const chay = tocDo > 0 ? soLuong / tocDo : 0;
  const tongGio = setup + chay;

  return {
    tongGio,
    tongPhut: tongGio * 60,
    chiTiet: { setup, chay, bonus: 0 },
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
