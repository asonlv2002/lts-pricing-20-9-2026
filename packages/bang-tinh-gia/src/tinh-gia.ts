// @lts/bang-tinh-gia — Engine tính giá bao bì
// Pure TypeScript — không phụ thuộc DOM, Node, hay bất kỳ framework nào.

import type { DauVaoTinhGia, KetQuaTinhGia, VatLieu, HangSo, ChiTietLop, ChiTietLopCat } from '@lts/kieu-du-lieu';
import type { DongLoiNhuan } from '@lts/hang-so';
import { layVatLieu, nhanBanVatLieu, layGiaVatLieuTheoKho } from './vat-lieu';
import { traLoiNhuan, chonCotLoiNhuanApDung } from './loi-nhuan';
import { tinhKichThuoc } from './kich-thuoc';
import { tinhHaoHutCat } from './hao-hut';
import { tinhCongDoanIn } from './cong-doan-in';
import { tinhCongDoanCat } from './cong-doan-cat';
import { tinhPhuKien } from './phu-kien';
import { tinhDongGoi } from './dong-goi';
import { tinhVanChuyen, tinhLaiVay, tinhHoaHong } from './tai-chinh';
import { tinhTrucIn } from './truc-in';
import { tinhDoDayVaGSM, taoChuoiCauTruc } from './cau-truc';
export { layVatLieu } from './vat-lieu';
export { traLoiNhuan } from './loi-nhuan';
export { toiUuDoDay, type KetQuaToiUuDoDay } from './toi-uu-do-day';
export function tinhGia(


  dauVao: DauVaoTinhGia,


  danhSachVatLieu: VatLieu[],


  hangSo: HangSo,


  bangLoiNhuan: DongLoiNhuan[]


): KetQuaTinhGia | null {


  const {


    soLuong, khoTrai, buocCat, soMau,


    phiKimLoai = 0,


    khoiLuongQuaiXach = 0, khoiLuongKhoa = 0, khoiLuongBangKeo = 0,


    tyLePhuMucMuc = 1,


    tyLeHoaHong = 0, coKhoa = false, coBangKeo = false, coQuaiXach = false,


    cuocVanChuyenPerKm, soKmVanChuyen, giaThuung, soTuiPerThuung, khoiLuongThuung = 0,


    ghiDeDayLop = {},


  } = dauVao;





  const lop1 = dauVao.idLop1 ? nhanBanVatLieu(layVatLieu(dauVao.idLop1, danhSachVatLieu), ghiDeDayLop, 'idLop1') : null;


  const lop2 = dauVao.idLop2 ? nhanBanVatLieu(layVatLieu(dauVao.idLop2, danhSachVatLieu), ghiDeDayLop, 'idLop2') : null;


  const lop2Phu = dauVao.idLop2Phu ? nhanBanVatLieu(layVatLieu(dauVao.idLop2Phu, danhSachVatLieu), ghiDeDayLop, 'idLop2Phu') : null;


  const lop3 = dauVao.idLop3 ? nhanBanVatLieu(layVatLieu(dauVao.idLop3, danhSachVatLieu), ghiDeDayLop, 'idLop3') : null;


  const lop4 = dauVao.idLop4 ? nhanBanVatLieu(layVatLieu(dauVao.idLop4, danhSachVatLieu), ghiDeDayLop, 'idLop4') : null;


  const lop5 = dauVao.idLop5 ? nhanBanVatLieu(layVatLieu(dauVao.idLop5, danhSachVatLieu), ghiDeDayLop, 'idLop5') : null;





  if (!lop1 || soLuong <= 0 || khoTrai <= 0 || buocCat <= 0 || !dauVao.loaiSanPham || dauVao.soMau === null) return null;


  if (dauVao.loaiSanPham === 'tui' && !dauVao.loaiTui) return null;


  if (dauVao.loaiSanPham === 'mang' && !dauVao.loaiMang) return null;





  const doDayMucTieu = dauVao.doDayMucTieu || 0;





  const soHinh = dauVao.soHinh || 1;


  const laMang = dauVao.loaiSanPham === 'mang';





  const { dienTichTui, tongDienTich, khoCatIn, chieuDaiMang, khoCat, metCat } = tinhKichThuoc({ soLuong, khoTrai, buocCat, soHinh, laMang });

  const hatHaoCat = tinhHaoHutCat(metCat, hangSo);

  const danhSachGhep: any[] = [];


  const chuoiGhep = [


    { lop: lop2, lopPhu: lop2Phu, soLop: 2 }, { lop: lop3, soLop: 3 },


    { lop: lop4, soLop: 4 }, { lop: lop5, soLop: 5 },


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


    const donGiaLop = layGiaVatLieuTheoKho(lop, kho, dauVao.bangGiaKhoNho);


    let chiPhiVL = donGiaLop * (hatHao + met) * kho;


    let chiTietVatLieu: any[] | undefined;


    if (soLop === 2 && lopPhu) {


      if (dauVao.chieuDaiLop2 && dauVao.chieuDaiLop2.vl1 > 0 && dauVao.chieuDaiLop2.vl2 > 0) {


        const soHinhThucTe = Math.max(1, soHinh || 1);


        const khoLopChinh = dauVao.chieuDaiLop2.vl1 / 1000;


        const khoLopPhu = dauVao.chieuDaiLop2.vl2 / 1000;


        const bienMoiMep = 0.01;


        const themChiTiet = (vl: VatLieu, khoSegment: number) => {


          const donGia = layGiaVatLieuTheoKho(vl, khoSegment, dauVao.bangGiaKhoNho);


          return {


            vatLieuId: vl.id,


            ten: vl.ten,


            kho: khoSegment,


            donGia,


            chiPhiVL: donGia * (hatHao + met) * khoSegment,


          };


        };


        const matTruoc = dauVao.matTruocLop2 ?? 'main';


        const kieuGhep = dauVao.kieuGhepLop2 ?? 'bottom_to_bottom';


        const taoPhan = (vaiTro: 'front' | 'back_bottom') => {


          const dungLopChinh = (vaiTro === 'front') === (matTruoc === 'main');


          return {


            vl: dungLopChinh ? lop : lopPhu,


            kho: dungLopChinh ? khoLopChinh : khoLopPhu,


            vaiTro,


          };


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


          vaiTro: phan.vaiTro,


          viTri: idx + 1,


        }));


        chiTietVatLieu = chiTietTho.reduce((ds: any[], item) => {


          const truoc = ds[ds.length - 1];


          if (truoc && truoc.vatLieuId === item.vatLieuId) {


            const khoMoi = truoc.kho + item.kho;


            const donGiaMoi = layGiaVatLieuTheoKho(item.vatLieuId === lop.id ? lop : lopPhu, khoMoi, dauVao.bangGiaKhoNho);


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


        const donGiaLopChinh = layGiaVatLieuTheoKho(lop, khoLopChinh, dauVao.bangGiaKhoNho);


        const donGiaLopPhu = layGiaVatLieuTheoKho(lopPhu, khoLopPhu, dauVao.bangGiaKhoNho);


        chiTietVatLieu = [


          { vatLieuId: lop.id, ten: lop.ten, kho: khoLopChinh, donGia: donGiaLopChinh, chiPhiVL: donGiaLopChinh * (hatHao + met) * khoLopChinh },


          { vatLieuId: lopPhu.id, ten: lopPhu.ten, kho: khoLopPhu, donGia: donGiaLopPhu, chiPhiVL: donGiaLopPhu * (hatHao + met) * khoLopPhu },


        ];


      }


      chiPhiVL = chiTietVatLieu.reduce((sum, item) => sum + item.chiPhiVL, 0);


    }


    danhSachGhep.push({ soLop, kho, met, hatHao, cpsx, chiPhiSX, chiPhiVL, donGia: donGiaLop, chiTietVatLieu, tongCong: chiPhiSX + chiPhiVL });


    metCanThiet = met + hatHao;


  });





  const tongHatHaoGhep = danhSachGhep.reduce((t, g) => t + g.hatHao, 0);


  const tongChiPhiGhep = danhSachGhep.reduce((t, g) => t + g.tongCong, 0);





  const khoNLIn = khoCat;


  const metIn = metCat + hatHaoCat + tongHatHaoGhep;





  const { hatHaoIn, cpSXIn, chiPhiSXIn, donGiaVatLieuIn, chiPhiVatLieuIn, tongChiPhiIn } = tinhCongDoanIn({ lop1, soMau: soMau!, metIn, khoNLIn, hangSo, tyLePhuMucMuc, phiKimLoai, bangGiaKhoNho: dauVao.bangGiaKhoNho });

  const { cpSXCat, chiPhiSXCat, tongChiPhiCat } = tinhCongDoanCat({ laMang, dienTichTui, metCat, hatHaoCat, khoCat, hangSo });

  const tongChiPhiSX = tongChiPhiIn + tongChiPhiGhep + tongChiPhiCat;

  const cotLoiNhuanApDung = chonCotLoiNhuanApDung({ dauVao, lop1, lop2, lop2Phu, lop3, lop4, lop5, coKhoa });
  const tyLeLoiNhuan = traLoiNhuan(tongChiPhiSX, cotLoiNhuanApDung, bangLoiNhuan);


  const soTienLoiNhuan = tyLeLoiNhuan * tongChiPhiSX;


  const doanhThu = tongChiPhiSX + soTienLoiNhuan;


  const chiPhiDonVi = soLuong > 0 ? doanhThu / soLuong : 0;





  const { tongDoDay, tongGSM } = tinhDoDayVaGSM({ lop1, lop2, lop2Phu, lop3, lop4, lop5 });

  const { tongTienKhoa, khoaPerDonVi, tongTienBangKeo, bangKeoPerDonVi, tongTienQuaiXach, quaiXachPerDonVi, khoiLuongPhuKienThemPerDonVi } = tinhPhuKien({ soLuong, buocCat, hangSo, coKhoa, coBangKeo, coQuaiXach, khoiLuongKhoa, khoiLuongBangKeo });

  const chieuDaiCuonMang = dauVao.chieuDaiCuonMang || 6000;
  const soTuiPerThuungThucTe = soTuiPerThuung || 0;
  const giaThuungThucTe = giaThuung || 0;
  const { dienTichCuonMang, soThuung, tongTienThuung, thuungPerDonVi, phiDongGoiPerDonVi } = tinhDongGoi({ laMang, soLuong, khoTrai, chieuDaiCuonMang, giaThuungThucTe, soTuiPerThuungThucTe });

  const dienTichDonVi = laMang ? 1.0 : dienTichTui;


  const khoiLuongThuungPerDonVi = !laMang && soTuiPerThuungThucTe > 0 ? khoiLuongThuung / soTuiPerThuungThucTe : 0;
  const khoiLuongTare = tongGSM * dienTichDonVi + khoiLuongQuaiXach + khoiLuongPhuKienThemPerDonVi + khoiLuongThuungPerDonVi;





  const { cuocVanChuyenThucTePerKm, soKmThucTe, tyLeCuocVanChuyen, tongCuocVanChuyen, cuocVanChuyenPerDonVi } = tinhVanChuyen({ soLuong, cuocVanChuyenPerKm, soKmVanChuyen });

  const { ngayThanhToanThucTe, laiSuatCoBan, laiSuatThem, laiSuatPerDonVi } = tinhLaiVay({ chiPhiDonVi, ngayThanhToan: dauVao.ngayThanhToan, laiSuatCoBan: hangSo.laiSuatCoBan, laiSuatThem: hangSo.laiSuatThem });

  const { hoaHongPerDonVi } = tinhHoaHong({ chiPhiDonVi, tyLeHoaHong, donViHoaHong: dauVao.donViHoaHong, hoaHongCoDinhVND: dauVao.hoaHongCoDinhVND });

  const { chieuDaiTrucThucTe, chuViTrucThucTe, dienTichTruc, chiPhiTrucPerDonVi, chiPhiTruc, chiPhiTrucPhanBo } = tinhTrucIn({ dauVao, hangSo, soMau: soMau || 0, laMang, dienTichTui });

  const giaCuoiCung = chiPhiDonVi + khoaPerDonVi + bangKeoPerDonVi + quaiXachPerDonVi


    + thuungPerDonVi + cuocVanChuyenPerDonVi + laiSuatPerDonVi + hoaHongPerDonVi + chiPhiTrucPhanBo;


  const ngaySanXuat = Math.ceil(soLuong / 30000) + 4;





  const chuoiCauTruc = taoChuoiCauTruc({ lop1, lop2, lop2Phu, lop3, lop4, lop5 });

  return {


    dauVao, chuoiCauTruc, tongDoDay, tongGSM,


    dienTichTui, tongDienTich, khoCatIn, chieuDaiMang,


    khoCat, metCat, hatHaoCat, cpSXCat, chiPhiSXCat, tongChiPhiCat,


    khoNLIn, metIn, hatHaoIn, cpSXIn, chiPhiSXIn, chiPhiVatLieuIn, tongChiPhiIn,


    tongChiPhiSX, tongChiPhiGhep, tyLeLoiNhuan, soTienLoiNhuan, doanhThu, chiPhiDonVi,


    khoaPerDonVi, tongTienKhoa, bangKeoPerDonVi, tongTienBangKeo,


    quaiXachPerDonVi, tongTienQuaiXach,


    thuungPerDonVi, tongTienThuung, giaThuungThucTe, soTuiPerThuungThucTe, soThuung,


    dienTichCuonMang, phiDongGoiPerDonVi, khoiLuongTare,


    cuocVanChuyenPerDonVi, tongCuocVanChuyen, tyLeCuocVanChuyen, cuocVanChuyenThucTePerKm, soKmThucTe,


    laiSuatPerDonVi, laiSuatCoBan, laiSuatThem, ngayThanhToan: ngayThanhToanThucTe,


    hoaHongPerDonVi, giaCuoiCung,


    chiPhiTruc, chiPhiTrucPerDonVi, chiPhiTrucPhanBo,


    dienTichTruc: dienTichTruc,


    chieuDaiTruc: chieuDaiTrucThucTe, chuViTruc: chuViTrucThucTe, ngaySanXuat,


    cacLop: {


      in: { vatLieu: chiPhiVatLieuIn, donGia: donGiaVatLieuIn, kho: khoNLIn, met: metIn, hatHao: hatHaoIn, cpsx: cpSXIn, chiPhiSX: chiPhiSXIn, chiPhiVL: chiPhiVatLieuIn, tongCong: tongChiPhiIn } as ChiTietLop,


      ghep: danhSachGhep.map(g => ({ vatLieu: g.chiPhiVL, donGia: g.donGia, chiTietVatLieu: g.chiTietVatLieu, kho: g.kho, met: g.met, hatHao: g.hatHao, cpsx: g.cpsx, chiPhiSX: g.chiPhiSX, chiPhiVL: g.chiPhiVL, tongCong: g.tongCong } as ChiTietLop)),


      cat: { kho: khoCat, met: metCat, hatHao: hatHaoCat, cpsx: cpSXCat, chiPhiSX: chiPhiSXCat, tongCong: tongChiPhiCat } as ChiTietLopCat,


    },


  };


}







