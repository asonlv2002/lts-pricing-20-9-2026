import type { VatLieu, HangSo, GiaVatLieuKhoNho } from '@lts/kieu-du-lieu';
import { layGiaVatLieuTheoKho } from './vat-lieu';

export interface ChiTietVatLieuGhep {
  vatLieuId: string;
  ten: string;
  kho: number;
  donGia: number;
  chiPhiVL: number;
  vaiTro?: 'front' | 'back_bottom';
  viTri?: number;
  viTriBatDau?: number;
  viTriKetThuc?: number;
}

export interface KetQuaLopGhep {
  soLop: number;
  kho: number;
  met: number;
  hatHao: number;
  cpsx: number;
  chiPhiSX: number;
  chiPhiVL: number;
  donGia: number;
  chiTietVatLieu?: ChiTietVatLieuGhep[];
  tongCong: number;
}

export function tinhCongDoanGhep(params: {
  lop2: VatLieu | null;
  lop2Phu: VatLieu | null;
  lop3: VatLieu | null;
  lop4: VatLieu | null;
  lop5: VatLieu | null;
  khoCat: number;
  metCat: number;
  hatHaoCat: number;
  khoTrai: number;
  soHinh: number;
  hangSo: HangSo;
  chieuDaiLop2?: { vl1: number; vl2: number };
  matTruocLop2?: 'main' | 'alt';
  kieuGhepLop2?: 'bottom_to_bottom' | 'front_to_front';
  bangGiaKhoNho?: GiaVatLieuKhoNho[];
}): { danhSachGhep: KetQuaLopGhep[]; tongHatHaoGhep: number; tongChiPhiGhep: number } {
  const { lop2, lop2Phu, lop3, lop4, lop5, khoCat, metCat, hatHaoCat, khoTrai, soHinh, hangSo, chieuDaiLop2, matTruocLop2, kieuGhepLop2, bangGiaKhoNho } = params;

  const danhSachGhep: KetQuaLopGhep[] = [];

  const chuoiGhep = [
    { lop: lop2, lopPhu: lop2Phu, soLop: 2 },
    { lop: lop3, lopPhu: undefined as VatLieu | null | undefined, soLop: 3 },
    { lop: lop4, lopPhu: undefined as VatLieu | null | undefined, soLop: 4 },
    { lop: lop5, lopPhu: undefined as VatLieu | null | undefined, soLop: 5 },
  ].filter(item => !!item.lop);

  const metGhepTheoLop = new Map<number, number>();
  let metCanThiet = metCat + hatHaoCat;

  [...chuoiGhep].reverse().forEach(({ soLop }) => {
    metGhepTheoLop.set(soLop, metCanThiet);
    const hHGhepA = hangSo.hatHaoGhepA || 3000;
    const hHGhepB = hangSo.hatHaoGhepB || 20;
    const hHGhepC = hangSo.hatHaoGhepC || 100;
    metCanThiet = metCanThiet + (metCanThiet / hHGhepA * hHGhepB + hHGhepC);
  });

  chuoiGhep.forEach(({ lop, lopPhu, soLop }) => {
    if (!lop) return;
    const kho = khoCat;
    const met = metGhepTheoLop.get(soLop) ?? metCanThiet;
    const hHGhepA = hangSo.hatHaoGhepA || 3000;
    const hHGhepB = hangSo.hatHaoGhepB || 20;
    const hHGhepC = hangSo.hatHaoGhepC || 100;
    const hatHao = met / hHGhepA * hHGhepB + hHGhepC;
    const cpsx = hangSo.cpSXGhep;
    const chiPhiSX = cpsx * (hatHao + met) * kho;
    const donGiaLop = layGiaVatLieuTheoKho(lop, kho, bangGiaKhoNho);
    let chiPhiVL = donGiaLop * (hatHao + met) * kho;
    let chiTietVatLieu: ChiTietVatLieuGhep[] | undefined;

    if (soLop === 2 && lopPhu) {
      if (chieuDaiLop2 && chieuDaiLop2.vl1 > 0 && chieuDaiLop2.vl2 > 0) {
        const soHinhThucTe = Math.max(1, soHinh || 1);
        const khoLopChinh = chieuDaiLop2.vl1 / 1000;
        const khoLopPhu = chieuDaiLop2.vl2 / 1000;
        const bienMoiMep = 0.01;

        const themChiTiet = (vl: VatLieu, khoSegment: number) => {
          const donGia = layGiaVatLieuTheoKho(vl, khoSegment, bangGiaKhoNho);
          return { vatLieuId: vl.id, ten: vl.ten, kho: khoSegment, donGia, chiPhiVL: donGia * (hatHao + met) * khoSegment };
        };

        const matTruoc = matTruocLop2 ?? 'main';
        const kieuGhep = kieuGhepLop2 ?? 'bottom_to_bottom';

        const taoPhan = (vaiTro: 'front' | 'back_bottom') => {
          const dungLopChinh = (vaiTro === 'front') === (matTruoc === 'main');
          return { vl: dungLopChinh ? lop : lopPhu, kho: dungLopChinh ? khoLopChinh : khoLopPhu, vaiTro };
        };

        const matTruocPhan = taoPhan('front');
        const daySauPhan = taoPhan('back_bottom');

        const thuTuPhan = soHinhThucTe > 1
          ? (kieuGhep === 'front_to_front'
              ? [daySauPhan, matTruocPhan, matTruocPhan, daySauPhan]
              : [matTruocPhan, daySauPhan, daySauPhan, matTruocPhan])
          : [matTruocPhan, daySauPhan];

        const chiTietTho = thuTuPhan.map((phan, idx) => ({
          ...themChiTiet(phan.vl, phan.kho + (idx === 0 || idx === thuTuPhan.length - 1 ? bienMoiMep : 0)),
          vaiTro: phan.vaiTro as 'front' | 'back_bottom',
          viTri: idx + 1,
        }));

        chiTietVatLieu = chiTietTho.reduce((ds: ChiTietVatLieuGhep[], item) => {
          const truoc = ds[ds.length - 1];
          if (truoc && truoc.vatLieuId === item.vatLieuId) {
            const khoMoi = truoc.kho + item.kho;
            const donGiaMoi = layGiaVatLieuTheoKho(item.vatLieuId === lop.id ? lop : lopPhu!, khoMoi, bangGiaKhoNho);
            truoc.kho = khoMoi;
            truoc.donGia = donGiaMoi;
            truoc.chiPhiVL = donGiaMoi * (hatHao + met) * khoMoi;
            truoc.viTriKetThuc = item.viTri;
            return ds;
          }
          ds.push({ ...item, viTriBatDau: item.viTri, viTriKetThuc: item.viTri });
          return ds;
        }, []);
      } else {
        const soHinhThucTe = Math.max(1, soHinh || 1);
        const bien = 0.01;
        const khoMotCauTruc = khoTrai + bien;
        const khoGiua = Math.max(0, khoTrai * soHinhThucTe + 0.02 - khoMotCauTruc * 2);
        const khoLopChinh = soHinhThucTe > 1 ? khoMotCauTruc * 2 : khoMotCauTruc;
        const khoLopPhu = soHinhThucTe > 1 ? khoGiua : Math.max(0, kho - khoLopChinh);
        const donGiaLopChinh = layGiaVatLieuTheoKho(lop, khoLopChinh, bangGiaKhoNho);
        const donGiaLopPhu = layGiaVatLieuTheoKho(lopPhu, khoLopPhu, bangGiaKhoNho);
        chiTietVatLieu = [
          { vatLieuId: lop.id, ten: lop.ten, kho: khoLopChinh, donGia: donGiaLopChinh, chiPhiVL: donGiaLopChinh * (hatHao + met) * khoLopChinh },
          { vatLieuId: lopPhu.id, ten: lopPhu.ten, kho: khoLopPhu, donGia: donGiaLopPhu, chiPhiVL: donGiaLopPhu * (hatHao + met) * khoLopPhu },
        ];
      }
      chiPhiVL = chiTietVatLieu!.reduce((sum, item) => sum + item.chiPhiVL, 0);
    }

    danhSachGhep.push({ soLop, kho, met, hatHao, cpsx, chiPhiSX, chiPhiVL, donGia: donGiaLop, chiTietVatLieu, tongCong: chiPhiSX + chiPhiVL });
    metCanThiet = met + hatHao;
  });

  const tongHatHaoGhep = danhSachGhep.reduce((t, g) => t + g.hatHao, 0);
  const tongChiPhiGhep = danhSachGhep.reduce((t, g) => t + g.tongCong, 0);

  return { danhSachGhep, tongHatHaoGhep, tongChiPhiGhep };
}
