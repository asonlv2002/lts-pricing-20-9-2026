import { tinhPhuKien } from '../phu-kien';
import type { HangSo } from '@lts/kieu-du-lieu';

function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}

const hangSo = {
  giaKhoa: 378,
  giaBangKeo: 200,
  giaQuaiXach: 650,
} as HangSo;

// included zipper → 0
const a = tinhPhuKien({
  soLuong: 1000, buocCat: 0.3, hangSo,
  coKhoa: true, coBangKeo: false, coQuaiXach: false,
  khoiLuongKhoa: 1, khoiLuongBangKeo: 0,
  tuyChonGc: { boZipper: true },
});
assert(a.tongTienKhoa === 0, 'zipper included = 0');

// excluded + custom price
const b = tinhPhuKien({
  soLuong: 1000, buocCat: 0.3, hangSo,
  coKhoa: true, coBangKeo: false, coQuaiXach: false,
  khoiLuongKhoa: 1, khoiLuongBangKeo: 0,
  tuyChonGc: { giaZipperMoiM: 500 },
});
assert(b.tongTienKhoa === 1000 * 0.3 * 500, 'zipper custom 500');

// tape included
const c = tinhPhuKien({
  soLuong: 1000, buocCat: 0.3, hangSo,
  coKhoa: false, coBangKeo: true, coQuaiXach: false,
  khoiLuongKhoa: 0, khoiLuongBangKeo: 1,
  tuyChonGc: { boBangKeo: true },
});
assert(c.tongTienBangKeo === 0, 'tape included = 0');

// tape excluded custom
const d = tinhPhuKien({
  soLuong: 1000, buocCat: 0.3, hangSo,
  coKhoa: false, coBangKeo: true, coQuaiXach: false,
  khoiLuongKhoa: 0, khoiLuongBangKeo: 1,
  tuyChonGc: { giaBangKeoMoiM: 250 },
});
assert(d.tongTienBangKeo === 1000 * 0.3 * 250, 'tape custom 250');

// default constants when no GC override
const e = tinhPhuKien({
  soLuong: 1000, buocCat: 0.3, hangSo,
  coKhoa: true, coBangKeo: true, coQuaiXach: false,
  khoiLuongKhoa: 1, khoiLuongBangKeo: 1,
});
assert(e.tongTienKhoa === 1000 * 0.3 * 378, 'default zipper');
assert(e.tongTienBangKeo === 1000 * 0.3 * 200, 'default tape');

console.log('phu-kien OK');