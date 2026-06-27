export type DonViPhanBoChotGia = 'vnd' | 'percent';

export interface DauVaoPhanBoChotGia {
  hasChotGia: boolean;
  diff: number;
  phanBoCongTy: number;
  donViPhanBo: DonViPhanBoChotGia;
}

export interface KetQuaPhanBoChotGia {
  congTyDisplay: number;
  hoaHongDisplay: number;
  congTyAmount: number;
  hoaHongAmount: number;
}

const lamTronMotSo = (value: number) => +value.toFixed(1);

export function tinhHienThiPhanBoChotGia({
  hasChotGia,
  diff,
  phanBoCongTy,
  donViPhanBo,
}: DauVaoPhanBoChotGia): KetQuaPhanBoChotGia {
  if (!hasChotGia) {
    return { congTyDisplay: 0, hoaHongDisplay: 0, congTyAmount: 0, hoaHongAmount: 0 };
  }

  if (donViPhanBo === 'percent') {
    const congTyPct = phanBoCongTy;
    const hoaHongPct = 100 - congTyPct;
    return {
      congTyDisplay: lamTronMotSo(congTyPct),
      hoaHongDisplay: lamTronMotSo(hoaHongPct),
      congTyAmount: diff * (congTyPct / 100),
      hoaHongAmount: diff * (hoaHongPct / 100),
    };
  }

  const hoaHongAmount = diff >= 0 ? diff - phanBoCongTy : diff + phanBoCongTy;
  return {
    congTyDisplay: lamTronMotSo(phanBoCongTy),
    hoaHongDisplay: lamTronMotSo(hoaHongAmount),
    congTyAmount: diff < 0 ? diff : phanBoCongTy,
    hoaHongAmount,
  };
}
