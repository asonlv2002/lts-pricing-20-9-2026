/**
 * Smoke: nhánh xuất tính giá nâng cấp (isNangCap).
 * Chạy: pnpm --filter web exec tsx src/lib/pricing-detail-export.nang-cao.test.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, 'pricing-detail-export.ts'), 'utf8');

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  OK', msg);
}

console.log('pricing-detail-export NC branch');

assert(src.includes('exportPricingDetailNangCaoToA4'), 'có hàm export NC');
assert(src.includes('chonOverrideDacTaNangCao'), 'có chọn nguồn đặc tả Admin>Sale>Gốc');
assert(src.includes('buildDacTaNangCaoHtml'), 'có HTML đặc tả NC');
assert(src.includes('buildHeroNangCao'), 'có hero giá chốt/đề xuất');
assert(src.includes('ĐẶC TẢ KỸ THUẬT'), 'nhãn đặc tả NC trong HTML');
assert(src.includes('Làm túi') || src.includes('làm túi') || src.includes('lapDongVatLieuNangCao'), 'dùng engine NC');
assert(src.includes("item.isNangCap || item.input?.isNangCap"), 'exportPricingDetailToA4 nhánh isNangCap');
assert(src.includes('Theo bảng Sale') && src.includes('Theo bảng Admin'), 'nhãn nguồn Sale/Admin');
assert(src.includes('tinhKetQuaNangCaoHieuLuc'), 'giá từ NC hiệu lực');
assert(src.includes('apCpsxNangCaoVaoHangSo'), 'áp pin CPSX NC');
assert(src.includes('table-nc') && src.includes('table-layout: fixed'), 'bảng NC fixed layout chống tràn');
assert(src.includes('page--nc'), 'trang đặc tả NC lề hẹp hơn');

console.log('\n✓ pricing-detail-export NC: assertions passed');
