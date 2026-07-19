import { tongPhuPhiGcTheoLoai, tinhPhuPhiGcVaoDonGia } from '../gia-cong-ngoai';
import type { GiaCongNgoai } from '@lts/kieu-du-lieu';

function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}

const gc: GiaCongNgoai = {
  congDoan: ['lam_tui', 'chia'],
  lamTui: {
    tyLePhiHao: 0,
    phiHaoSetupM: 0,
    giaGcMoiTui: 80,
    vanChuyenVnd: 200_000,
    dongGoiVnd: 50_000,
  },
  chia: {
    tyLePhiHao: 0,
    phiHaoSetupM: 0,
    giaGcMoiM2: 1000,
    vanChuyenVnd: 300_000,
  },
};

const raw = tongPhuPhiGcTheoLoai(gc);
assert(raw.vanChuyen === 500_000, 'sum VC');
assert(raw.dongGoi === 50_000, 'sum DG');
assert(raw.khac === 0, 'khac 0');

// Example: LN 20%, r = 1.068%, SL 10000, S_vc=500000
const r = 0.01068;
const chiPhiDonVi = 1000 / 1.2; // not used directly - we pass laiSuat and chiPhi so r matches
// User example: base price with LN = 1000, interest on that = 1.068% of 1000
// For fee formula: r = laiSuatPerDonVi/chiPhiDonVi where chiPhiDonVi is pre-accessory cost+LN unit
// Use chiPhiDonVi=1000, laiSuat=10.68 so r=0.01068, LN=0.20
const out = tinhPhuPhiGcVaoDonGia({
  tongVanChuyen: 500_000,
  tongDongGoi: 0,
  tongKhac: 0,
  tyLeLoiNhuan: 0.20,
  laiSuatPerDonVi: 10.68,
  chiPhiDonVi: 1000,
  soLuong: 10_000,
});
assert(Math.abs(out.tongVanChuyenGc - 605_340) < 1, 'S\' VC ' + out.tongVanChuyenGc);
assert(Math.abs(out.vanChuyenGcPerDonVi - 60.534) < 0.01, 'per unit ' + out.vanChuyenGcPerDonVi);

console.log('phu-phi-gc OK');
