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

export interface DauVaoNhapPhanBoChotGia {
  hasChotGia: boolean;
  diff: number;
  hoaHongNhap: number;
  hoaHongEngine: number;
  donViPhanBo?: DonViPhanBoChotGia;
}

export interface KetQuaNhapPhanBoChotGia extends KetQuaPhanBoChotGia {
  khoaNhapCongTy: boolean;
  loi: string[];
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

export function tinhNhapPhanBoChotGia({
  hasChotGia,
  diff,
  hoaHongNhap,
  hoaHongEngine,
  donViPhanBo = 'vnd',
}: DauVaoNhapPhanBoChotGia): KetQuaNhapPhanBoChotGia {
  if (!hasChotGia) {
    return { congTyDisplay: 0, hoaHongDisplay: 0, congTyAmount: 0, hoaHongAmount: 0, khoaNhapCongTy: true, loi: [] };
  }

  const loi: string[] = [];
  const hoaHongDuong = Number.isFinite(hoaHongNhap) ? hoaHongNhap : 0;
  const gioiHanChenhLech = Math.abs(diff);
  const hoaHongDuongTheoTien = donViPhanBo === 'percent'
    ? gioiHanChenhLech * (hoaHongDuong / 100)
    : hoaHongDuong;
  if (hoaHongNhap < 0) {
    loi.push('Hoa hồng không được âm.');
  }
  if (donViPhanBo === 'percent' && hoaHongDuong > 100) {
    loi.push('Hoa hồng không được vượt quá 100%.');
  }
  if (hoaHongDuongTheoTien > gioiHanChenhLech) {
    loi.push(`Hoa hồng không được vượt quá chênh lệch ${lamTronMotSo(gioiHanChenhLech)}đ/đơn vị.`);
  }
  if (diff < 0 && hoaHongDuongTheoTien > hoaHongEngine) {
    loi.push(`Hoa hồng bị trừ không được vượt quá hoa hồng hiện tại ${lamTronMotSo(hoaHongEngine)}đ/đơn vị.`);
  }

  const hoaHongAmount = diff < 0 ? -hoaHongDuongTheoTien : hoaHongDuongTheoTien;
  const congTyAmount = diff - hoaHongAmount;

  return {
    hoaHongDisplay: hoaHongDuong,
    congTyDisplay: donViPhanBo === 'percent' ? Math.max(0, 100 - hoaHongDuong) : Math.abs(congTyAmount),
    hoaHongAmount,
    congTyAmount,
    khoaNhapCongTy: true,
    loi,
  };
}
