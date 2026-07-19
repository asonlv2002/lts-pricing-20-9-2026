import {
  coCongDoanGc,
  tinhHatHaoGc,
  tinhCpsxGcM2,
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
assert(tinhCpsxGcM2(3000, 6000) === 18_000_000, 'cpsx m2');
assert(tinhCpsxGcDonVi(80, 100_000) === 8_000_000, 'cpsx bag');

console.log('gia-cong-ngoai helpers OK');
