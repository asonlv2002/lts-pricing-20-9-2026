import {
  coCongDoanGc,
  tinhHatHaoGc,
  tinhCpsxGcDienTich,
  tinhCpsxGcDonVi,
} from '../gia-cong-ngoai';
import type { GiaCongNgoai } from '@lts/kieu-du-lieu';

function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}

const gc: GiaCongNgoai = {
  congDoan: ['in', 'ghep'],
  in: { nguonMang: 'lts', tyLePhiHao: 20, phiHaoSetupM: 1000, giaGcMoiM2: 3000 },
};

assert(coCongDoanGc(gc, 'in') === true, 'has in');
assert(coCongDoanGc(gc, 'chia') === false, 'no chia');
assert(Math.abs(tinhHatHaoGc(10000, 20, 1000) - 3000) < 0.01, 'waste 20%+1000');
assert(tinhCpsxGcDienTich(2500, 1000, 0, 1) === 2_500_000, 'cpsx dien tich');
assert(tinhCpsxGcDienTich(3000, 5000, 1000, 0.6) === 10_800_000, 'cpsx met+hao x kho');
assert(tinhCpsxGcDonVi(80, 100_000) === 8_000_000, 'cpsx bag');

console.log('gia-cong-ngoai helpers OK');
