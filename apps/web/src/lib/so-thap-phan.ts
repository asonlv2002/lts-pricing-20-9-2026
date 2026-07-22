/**
 * Chuẩn hóa chuỗi số thập phân: nhận cả `,` và `.`,
 * hiển thị/lưu về dấu chấm. Bỏ dấu chấm thừa sau dấu thập phân đầu.
 */
export function chuanHoaSoThapPhan(chuoi: string): string {
  let s = chuoi.trim().replace(/\s/g, '').replace(/,/g, '.');
  s = s.replace(/[^0-9.]/g, '');
  const lanChamDau = s.indexOf('.');
  if (lanChamDau >= 0) {
    s = s.slice(0, lanChamDau + 1) + s.slice(lanChamDau + 1).replace(/\./g, '');
  }
  return s;
}

/** Parse số thập phân từ input người dùng (0,35 hoặc 0.35 → 0.35). */
export function parseSoThapPhan(chuoi: string): number {
  const chuan = chuanHoaSoThapPhan(chuoi);
  if (chuan === '' || chuan === '.') return 0;
  const n = parseFloat(chuan);
  return isNaN(n) ? 0 : n;
}
