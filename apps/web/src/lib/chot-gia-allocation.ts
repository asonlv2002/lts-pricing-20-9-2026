export type DonViPhanBoChotGia = 'vnd' | 'percent';

export interface DauVaoPhanBoChotGia {
  hasChotGia: boolean;
  diff: number;
  phanBoCongTy: number;
  donViPhanBo: DonViPhanBoChotGia;
}

export interface DauVaoCanhBaoPhanBoChotGia {
  hasChotGia: boolean;
  diff: number;
  congTyAmount: number;
  hoaHongAmount: number;
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

  const hoaHongAmount = diff - phanBoCongTy;
  return {
    congTyDisplay: lamTronMotSo(phanBoCongTy),
    hoaHongDisplay: lamTronMotSo(hoaHongAmount),
    congTyAmount: phanBoCongTy,
    hoaHongAmount,
  };
}

export function taoCanhBaoPhanBoChotGia({
  hasChotGia,
  diff,
  congTyAmount,
  hoaHongAmount,
}: DauVaoCanhBaoPhanBoChotGia): string[] {
  if (!hasChotGia) return [];

  const canhBao: string[] = [];
  const tongPhanBo = congTyAmount + hoaHongAmount;
  if (Math.abs(tongPhanBo - diff) > 0.01) {
    canhBao.push('Tổng Công ty + Hoa hồng chưa bằng chênh lệch giá chốt.');
  }

  return canhBao;
}
