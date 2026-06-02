import type { VatLieu } from '@lts/kieu-du-lieu';
export interface KetQuaToiUuDoDay {

  layerId: string;          // layer id (idLop1, idLop2...)

  materialId?: string;      // selected material id after optimization

  originalMaterialId?: string; // original material id

  adjustedThickness: number;  // adjusted thickness (mic)

  originalThickness: number;  // original thickness (mic)

  isLLDPE: boolean;          // whether this is LLDPE

}

type VatLieuDangChonToiUu = {

  id: string;                 // layer key: layer1Id, idLop1...

  materialId?: string;        // material id in catalog

  doDay: number;

  laLLDPE?: boolean;

};

export function toiUuDoDay(

  mucTieu: number,                      // target thickness (mic)

  vatLieuDangChon: VatLieuDangChonToiUu[],

  danhSachVatLieu: VatLieu[],          // full material catalog

): {

  ketQua: KetQuaToiUuDoDay[];

  tongDoDayVatLieu: number;

  tongDoDayKeo: number;

  tongThucTe: number;                    // material + glue

  datYeuCau: boolean;                   // within [mucTieu-5, mucTieu+5]?

  canhBao?: string;

} {

  const soLopGhep = vatLieuDangChon.length - 1; // layer 1 is print, remaining layers are lamination


  const keoPerLop = 3;


  const tongDoDayKeo = soLopGhep * keoPerLop;


  const minChapNhan = mucTieu - 5;


  const maxChapNhan = mucTieu + 5;





  const timVatLieu = (lop: VatLieuDangChonToiUu) =>


    danhSachVatLieu.find(v => v.id === lop.materialId) ??


    danhSachVatLieu.find(v => v.id === lop.id);





  const laLLDPE = (vl?: VatLieu, lop?: VatLieuDangChonToiUu): boolean =>


    !!lop?.laLLDPE ||


    !!vl?.ten.toLowerCase().includes('lldpe') ||


    !!vl?.nhom?.toLowerCase().includes('lldpe');





  const coTheNhapMicTuDo = (vl?: VatLieu, lop?: VatLieuDangChonToiUu): boolean =>


    !!vl?.doiDuocMic || laLLDPE(vl, lop);





  type LuaChonLop = {


    layerId: string;


    materialId?: string;


    originalMaterialId?: string;


    doDay: number;


    originalThickness: number;


    isLLDPE: boolean;


    costPerM2: number;


    popularityRank: number;


  };





  const giaMoiM2 = (vl: VatLieu | undefined, doDay: number): number => {


    if (!vl) return Number.MAX_SAFE_INTEGER;


    return vl.giaMoiKg * doDay * vl.khoiLuongRieng / 1000;


  };





  const coLopBOPPHoacMatt = vatLieuDangChon.some(lop => {


    const vl = timVatLieu(lop);


    const nhom = vl?.nhom?.toLowerCase() ?? '';


    const ten = vl?.ten?.toLowerCase() ?? '';


    return nhom === 'bopp' || nhom === 'matt opp' || ten.includes('bopp') || ten.includes('matt opp');


  });





  const diemPhoBien = (vl: VatLieu | undefined, doDay: number): number => {


    const nhom = vl?.nhom?.toLowerCase() ?? '';


    const ten = vl?.ten?.toLowerCase() ?? '';


    const laBOPPHoacMatt = nhom === 'bopp' || nhom === 'matt opp' || ten.includes('bopp') || ten.includes('matt opp');


    if (laBOPPHoacMatt) {


      if (doDay === 18) return 0;


      if (doDay === 20) return 1;


      return 10 + doDay;


    }


    if (coLopBOPPHoacMatt && (nhom === 'cpp' || ten === 'cpp')) {


      if (doDay === 50) return 0;


      if (doDay === 40) return 1;


      if (doDay === 30) return 2;


      return 10 + doDay;


    }


    return 5;


  };





  const taoLuaChonChoLop = (lop: VatLieuDangChonToiUu): LuaChonLop[] => {


    const vlHienTai = timVatLieu(lop);


    const originalMaterialId = vlHienTai?.id ?? lop.materialId;


    const laPe = laLLDPE(vlHienTai, lop);





    if (coTheNhapMicTuDo(vlHienTai, lop)) {


      const minPE = 30;


      const maxCanThiet = Math.max(


        minPE,


        lop.doDay,


        maxChapNhan - tongDoDayKeo,


      );


      const maxPE = Math.ceil((maxCanThiet + 20) / 5) * 5;


      const ds: LuaChonLop[] = [];


      for (let mic = minPE; mic <= maxPE; mic += 5) {


        ds.push({


          layerId: lop.id,


          materialId: vlHienTai?.id ?? lop.materialId,


          originalMaterialId,


          doDay: mic,


          originalThickness: lop.doDay,


          isLLDPE: laPe,


          costPerM2: giaMoiM2(vlHienTai, mic),


          popularityRank: diemPhoBien(vlHienTai, mic),


        });


      }


      return ds;


    }





    const vatLieuCungNhom = vlHienTai?.nhom


      ? danhSachVatLieu.filter(v => v.nhom === vlHienTai.nhom)


      : vlHienTai ? [vlHienTai] : [];





    if (vatLieuCungNhom.length === 0) {


      return [{


        layerId: lop.id,


        materialId: lop.materialId,


        originalMaterialId,


        doDay: lop.doDay,


        originalThickness: lop.doDay,


        isLLDPE: !!lop.laLLDPE,


        costPerM2: Number.MAX_SAFE_INTEGER,


        popularityRank: 99,


      }];


    }





    return vatLieuCungNhom


      .slice()


      .sort((a, b) => a.doDay - b.doDay || a.id.localeCompare(b.id))


      .map(vl => ({


        layerId: lop.id,


        materialId: vl.id,


        originalMaterialId,


        doDay: vl.doDay,


        originalThickness: lop.doDay,


        isLLDPE: laLLDPE(vl, lop),


        costPerM2: giaMoiM2(vl, vl.doDay),


        popularityRank: diemPhoBien(vl, vl.doDay),


      }));


  };





  const cacLuaChonTheoLop = vatLieuDangChon.map(taoLuaChonChoLop);





  let ketQuaTotNhat: LuaChonLop[] | null = null;


  let tongVatLieuTotNhat = 0;


  let tongThucTeTotNhat = vatLieuDangChon.reduce((sum, lop) => sum + lop.doDay, 0) + tongDoDayKeo;


  let chiPhiTotNhat = Infinity;


  let diemPhoBienTotNhat = Infinity;





  const soSanhTotHon = (chon: LuaChonLop[], tongVatLieu: number, tongThucTe: number) => {


    const diemPhoBien = chon.reduce((sum, c) => sum + c.popularityRank, 0);


    if (diemPhoBien < diemPhoBienTotNhat) return true;


    if (diemPhoBien > diemPhoBienTotNhat) return false;


    const chiPhi = chon.reduce((sum, c) => sum + c.costPerM2, 0);


    if (chiPhi < chiPhiTotNhat - 0.0001) return true;


    if (Math.abs(chiPhi - chiPhiTotNhat) > 0.0001) return false;


    const doLech = Math.abs(tongThucTe - mucTieu);


    const doLechTotNhat = Math.abs(tongThucTeTotNhat - mucTieu);


    if (doLech < doLechTotNhat) return true;


    if (doLech > doLechTotNhat) return false;


    return tongVatLieu < tongVatLieuTotNhat;


  };


  const tinhKhoangDoDayCoDungSai = (chon: Pick<LuaChonLop, 'doDay' | 'isLLDPE'>[]) => {
    const tongDanhDinh = chon.reduce((sum, c) => sum + c.doDay, 0) + tongDoDayKeo;
    const tongDungSaiAm = chon.reduce((sum, c) => sum + (c.isLLDPE ? 3 : 0), 0);
    const tongDungSaiDuong = chon.reduce((sum, c) => sum + (c.isLLDPE ? 3 : 0), 0);
    return {
      danhDinh: tongDanhDinh,
      thapNhat: tongDanhDinh - tongDungSaiAm,
      caoNhat: tongDanhDinh + tongDungSaiDuong,
    };
  };

  const datDungSaiThanhPham = (chon: Pick<LuaChonLop, 'doDay' | 'isLLDPE'>[]) => {
    const khoang = tinhKhoangDoDayCoDungSai(chon);
    return khoang.thapNhat >= minChapNhan && khoang.caoNhat <= maxChapNhan;
  };





  const dfs = (idx: number, tongVatLieu: number, chon: LuaChonLop[]) => {


    if (idx >= cacLuaChonTheoLop.length) {


      const tongThucTe = tongVatLieu + tongDoDayKeo;


      if (!datDungSaiThanhPham(chon)) return;


      if (soSanhTotHon(chon, tongVatLieu, tongThucTe)) {


        ketQuaTotNhat = chon.map(c => ({ ...c }));


        tongVatLieuTotNhat = tongVatLieu;


        tongThucTeTotNhat = tongThucTe;


        chiPhiTotNhat = chon.reduce((sum, c) => sum + c.costPerM2, 0);


        diemPhoBienTotNhat = chon.reduce((sum, c) => sum + c.popularityRank, 0);


      }


      return;


    }





    for (const luaChon of cacLuaChonTheoLop[idx]) {


      const tongMoi = tongVatLieu + luaChon.doDay;


      if (tongMoi + tongDoDayKeo > maxChapNhan + 20) continue;


      dfs(idx + 1, tongMoi, [...chon, luaChon]);


    }


  };





  dfs(0, 0, []);





  const ketQua: KetQuaToiUuDoDay[] = (ketQuaTotNhat ?? vatLieuDangChon.map(lop => {


    const vl = timVatLieu(lop);


    return {


      layerId: lop.id,


      materialId: vl?.id ?? lop.materialId,


      originalMaterialId: vl?.id ?? lop.materialId,


      doDay: lop.doDay,


      originalThickness: lop.doDay,


      isLLDPE: laLLDPE(vl, lop),


      costPerM2: giaMoiM2(vl, lop.doDay),


      popularityRank: diemPhoBien(vl, lop.doDay),


    };


  })).map(k => ({


    layerId: k.layerId,


    materialId: k.materialId,


    originalMaterialId: k.originalMaterialId,


    adjustedThickness: k.doDay,


    originalThickness: k.originalThickness,


    isLLDPE: k.isLLDPE,


  }));





  const tongVatLieu = ketQua.reduce((sum, k) => sum + k.adjustedThickness, 0);


  const tongThucTe = tongVatLieu + tongDoDayKeo;


  const khoangDoDay = tinhKhoangDoDayCoDungSai(ketQua.map(k => ({ doDay: k.adjustedThickness, isLLDPE: k.isLLDPE })));

  const datYeuCau = khoangDoDay.thapNhat >= minChapNhan && khoangDoDay.caoNhat <= maxChapNhan;

  const canhBao = !datYeuCau

    ? `Không tìm được tổ hợp độ dày thỏa mãn ${minChapNhan}-${maxChapNhan} mic sau dung sai NVL (danh định: ${tongThucTe} mic, thực tế: ${khoangDoDay.thapNhat}-${khoangDoDay.caoNhat} mic). Vui lòng chọn vật liệu khác.`

    : undefined;

  return {


    ketQua,


    tongDoDayVatLieu: tongVatLieu,


    tongDoDayKeo,


    tongThucTe,


    datYeuCau,


    canhBao,


  };


}






