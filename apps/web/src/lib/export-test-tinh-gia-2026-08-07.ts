// ═══════════════════════════════════════════════════════════════════════════
// Test Tính Giá (AGENTS.md) — Bước 3: gắn nhận xét AI vào kết quả code
// và xuất xlsx docs/test-tinh-gia-2026-08-07.xlsx
// Chạy: pnpm --filter web exec tsx src/lib/export-test-tinh-gia-2026-08-07.ts
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..', '..', '..');
const raw = JSON.parse(
  readFileSync(join(root, 'docs', 'test-tinh-gia-2026-08-07-raw.json'), 'utf8'),
);

const fmt = (n: number | null | undefined, le = 0): string | number =>
  n == null || !Number.isFinite(n) ? '—' : Number(n.toFixed(le));

// ── Nhận xét AI (Bước 2 — tự lập luận phán đoán, không tra tài liệu cũ) ────
const NOTES: Record<string, { danhGia: string; nhanXet: string }> = {
  C01: { danhGia: 'ĐẠT', nhanXet: 'OPP 100%: 1.286 đ/m² = (16g×57.905 + 9g×40.000)/1000. Đúng công thức, khớp bảng tham chiếu.' },
  C02: { danhGia: 'ĐẠT', nhanXet: 'Phủ 50%: 823 đ/m² — chỉ giảm phần mực (16g×0,5×57.905 = 463 đ), dung môi giữ nguyên. Ghi chú hiển thị "× 50%". Fix tỷ lệ phủ hoạt động đúng.' },
  C03: { danhGia: 'ĐẠT', nhanXet: 'PET 100%: 1.728 đ/m². Giá mực PET 85.511 đ/kg cao hơn OPP (57.905) — hợp lý, mực PET đắt hơn.' },
  C04: { danhGia: 'ĐẠT', nhanXet: 'PET 50%: 1.044 đ/m² — giảm đúng 684 đ phần mực (16g×0,5×85.511).' },
  C05: { danhGia: 'ĐẠT', nhanXet: 'PA → bảng PET (1.728 đ/m² = (16g×85.511 + 9g×40.000)/1000) — đúng rule "màng còn lại". ĐÃ FIX: fallback chonNhomMuc đổi từ OPP sang PET.' },
  C06: { danhGia: 'ĐẠT', nhanXet: 'LLDPE → bảng PE riêng (87.696 đ/kg) + DM_OPP — đúng rule: PE/LLDPE dùng bảng PE.' },
  C07: { danhGia: 'ĐẠT', nhanXet: '1 màu: 412 đ/m² (4g mực + 4,5g DM). Đúng.' },
  C08: { danhGia: 'ĐẠT', nhanXet: '2 màu: 703 đ/m². Đúng.' },
  C09: { danhGia: 'ĐẠT', nhanXet: '3 màu: 995 đ/m². Đúng.' },
  C10: { danhGia: 'ĐẠT', nhanXet: '4 màu: 1.286 đ/m². Đúng.' },
  C11: { danhGia: 'ĐẠT', nhanXet: '5 màu: 1.578 đ/m². Đúng.' },
  C12: { danhGia: 'ĐẠT', nhanXet: '6 màu: 1.870 đ/m². Đúng.' },
  C13: { danhGia: 'ĐẠT', nhanXet: '7 màu: 2.161 đ/m². Đúng.' },
  C14: { danhGia: 'ĐẠT', nhanXet: '8 màu: 2.453 đ/m². Tăng tuyến tính 4g/màu (1→8 màu: 412→2.453), thời gian in 56→208 phút (setup 20 phút/màu). Hợp lý.' },
  C15: { danhGia: 'ĐẠT', nhanXet: '0 màu: CP mực = 0, thời gian in chỉ còn phần chạy (33 phút, setup 0). Đúng.' },
  C16: { danhGia: 'CHƯA', nhanXet: '12 màu: CP mực clamp về 8 màu (2.453 đ/m²) NHƯNG thời gian in 294 phút tính theo 12 màu (setup 240 phút). 2 bảng không nhất quán — nghi bất nhất giữa tinhCpMucDungMoiIn (clamp 8) và tinhThoiGianMayIn (không clamp).' },
  C17: { danhGia: 'ĐẠT', nhanXet: 'ĐÃ FIX: bảng nâng cao hiện có 2 cột "CP Nhũ + Mờ" (50.000 đ/m²) + thành tiền 82,5M → tổng nâng cao khớp engine (86,8M). Lấy thẳng metallicSurcharge (Nhũ + Phủ mờ + phí in khác) × diện tích.' },
  C18: { danhGia: 'ĐẠT', nhanXet: 'Màng in BOPP: chỉ 1 dòng in, không có chia/làm túi. Đúng.' },
  C19: { danhGia: 'LƯU Ý', nhanXet: 'Màng in truyền 50% qua API: bảng nâng cao giảm (823 đ/m²) nhưng giá engine KHÔNG đổi (11,02M) — engine màng in bỏ qua tỷ lệ phủ. UI đang khóa 50% cho màng in nên ít gặp, nhưng cần thống nhất khi API truyền.' },
  C20: { danhGia: 'ĐẠT', nhanXet: 'Ghép 2 lớp: 1 dòng ghép, keo 420 đ/m². Đúng.' },
  C21: { danhGia: 'ĐẠT', nhanXet: 'Ghép 3 lớp: 2 dòng ghép, keo 420 đ/m² mỗi dòng. Đúng.' },
  C22: { danhGia: 'ĐẠT', nhanXet: 'Ghép 4 lớp: 3 dòng ghép. Đúng.' },
  C23: { danhGia: 'ĐẠT', nhanXet: 'Ghép 5 lớp: 4 dòng ghép, keo ×4 lần. Đúng.' },
  C24: { danhGia: 'ĐẠT', nhanXet: 'Túi zipper: dòng làm túi hiện, thành tiền = 1.512.000 đ (zipperTotal). Đúng.' },
  C25: { danhGia: 'ĐẠT', nhanXet: 'Màng: không có dòng chia/làm túi. Đúng.' },
  C26: { danhGia: 'ĐẠT', nhanXet: 'Mét in 62.353 ≥ ngưỡng 40.000: bonus 90 phút đã cộng (668,9 phút = setup 80 + chạy 499 + bonus 90). Đúng.' },
  C27: { danhGia: 'LƯU Ý', nhanXet: 'Đối chiếu: tổng nâng cao (5,97M) cao hơn engine (4,33M) ~38% ở cùng input. Chênh do 2 model mực khác nhau (bảng ₫/kg × g/m² vs giá mực đơn giản). Cần PM xác nhận mức chênh chấp nhận được.' },
  C28: { danhGia: 'ĐẠT', nhanXet: 'OPP 1 màu 50%: 296 đ/m² (100% = 412) — giảm đúng 50% phần mực 4g. Thời gian in không đổi so với 100%.' },
  C29: { danhGia: 'ĐẠT', nhanXet: 'OPP 2 màu 50%: 472 đ/m² (100% = 703).' },
  C30: { danhGia: 'ĐẠT', nhanXet: 'OPP 3 màu 50%: 647 đ/m² (100% = 995).' },
  C31: { danhGia: 'ĐẠT', nhanXet: 'OPP 4 màu 50%: 823 đ/m² — khớp C02.' },
  C32: { danhGia: 'ĐẠT', nhanXet: 'OPP 5 màu 50%: 999 đ/m² (100% = 1.578).' },
  C33: { danhGia: 'ĐẠT', nhanXet: 'OPP 6 màu 50%: 1.175 đ/m² (100% = 1.870).' },
  C34: { danhGia: 'ĐẠT', nhanXet: 'OPP 7 màu 50%: 1.351 đ/m² (100% = 2.161).' },
  C35: { danhGia: 'ĐẠT', nhanXet: 'OPP 8 màu 50%: 1.526 đ/m² (100% = 2.453) — cực đại số màu + phủ 50% vẫn giảm đúng.' },
  C36: { danhGia: 'ĐẠT', nhanXet: 'PET 1 màu 50%: 351 đ/m² (100% = 522).' },
  C37: { danhGia: 'ĐẠT', nhanXet: 'PET 2 màu 50%: 582 đ/m² (100% = 924).' },
  C38: { danhGia: 'ĐẠT', nhanXet: 'PET 3 màu 50%: 813 đ/m² (100% = 1.326).' },
  C39: { danhGia: 'ĐẠT', nhanXet: 'PET 4 màu 50%: 1.044 đ/m² — khớp C04.' },
  C40: { danhGia: 'ĐẠT', nhanXet: 'PET 5 màu 50%: 1.275 đ/m² (100% = 2.130).' },
  C41: { danhGia: 'ĐẠT', nhanXet: 'PET 6 màu 50%: 1.506 đ/m² (100% = 2.532).' },
  C42: { danhGia: 'ĐẠT', nhanXet: 'PET 7 màu 50%: 1.737 đ/m² (100% = 2.934).' },
  C43: { danhGia: 'ĐẠT', nhanXet: 'PET 8 màu 50%: 1.968 đ/m² (100% = 3.336) — cực đại số màu + 50% đúng.' },
  C44: { danhGia: 'ĐẠT', nhanXet: 'LLDPE (bảng PE) 4 màu 50%: 1.062 đ/m² (100% = 1.763) — bảng PE cũng áp tỷ lệ phủ đúng.' },
  C45: { danhGia: 'ĐẠT', nhanXet: 'PA 4 màu 50%: 1.044 đ/m² = bảng PET + 50% — đúng rule "màng còn lại" kết hợp tỷ lệ phủ.' },
  C46: { danhGia: 'ĐẠT', nhanXet: 'Kết hợp 50% + nhũ/mờ: mực giảm đúng (1.286→823 đ/m²) NHƯNG CP Nhũ+Mờ giữ nguyên 400 đ/m² — đúng kỳ vọng (phí nhũ không phụ thuộc tỷ lệ phủ).' },
  C47: { danhGia: 'ĐẠT', nhanXet: 'Màng in BOPP + nhũ/mờ: CP Nhũ+Mờ hiện 400 đ/m² × diện tích, tổng nâng cao khớp engine.' },
  C48: { danhGia: 'ĐẠT', nhanXet: 'Màng ghép 2 lớp (filmType mangGhep): 1 dòng ghép (LLDPE), không có chia/làm túi — đúng.' },
  C49: { danhGia: 'ĐẠT', nhanXet: 'Dual structure: tách 3 dòng (LLDPE | MPET | LLDPE) — đúng: 2 dải LLDPE bị MPET ngắt giữa nên tách riêng; keo 420 đ/m² mỗi dòng.' },
  C50: { danhGia: 'LƯU Ý', nhanXet: 'In gia công ngoài (vendor, đ/m²): bảng nâng cao VẪN tính CP mực + DM theo số màu — cần PM xác nhận khi in GC ngoài, mực do bên GC lo hay LTS trả. Giá NVL hiển thị đ/m² (không đ/kg).' },
  C51: { danhGia: 'ĐẠT', nhanXet: 'PET MATTE (PET_MATT12) làm lớp in → nhóm pet đúng (1.728 đ/m²).' },
  C52: { danhGia: 'ĐẠT', nhanXet: 'LLDPE (bảng PE) 8 màu: 3.406 đ/m² = (32g × 87.696 + 15g × 40.000)/1000 — cực đại đúng.' },
  C54: { danhGia: 'ĐẠT', nhanXet: 'Đủ 3 phụ kiện: dòng làm túi = Zipper + Băng keo + Quai, thành tiền = tổng 3 loại.' },
};

const rows = raw.map((r: Record<string, unknown>, i: number) => {
  const note = NOTES[String(r.id)] ?? { danhGia: '—', nhanXet: '' };
  return {
    STT: i + 1,
    'Case': r.id,
    'Nhóm': r.nhom,
    'Mô tả trường hợp': r.moTa,
    'Số màu': r.soMau,
    'Phủ mực': r.coverage,
    'Lớp in': r.lop1,
    'Nhóm mực': String(r.nhomMuc).toUpperCase(),
    'CP mực+DM (đ/m²)': fmt(r.cpMucInDongIn as number, 1),
    'Thành tiền mực (VNĐ)': fmt(r.thanhTienMucIn as number),
    'CP Nhũ+Mờ (đ/m²)': fmt(r.cpNhuMo as number, 1),
    'Thành tiền Nhũ+Mờ (VNĐ)': fmt(r.thanhTienNhuMo as number),
    'Công thức (tooltip)': r.ghiChuIn,
    'Số dòng ghép': r.soDongGhep,
    'Vật liệu ghép': r.vatLieuGhep,
    'Keo (đ/m²)': fmt(r.cpKeoDongGhep as number, 0),
    'Thành tiền keo (VNĐ)': fmt(r.tongTienKeo as number),
    'Có dòng chia': r.coDongChia ? 'X' : '',
    'Có dòng làm túi': r.coDongLamTui ? 'X' : '',
    'Thành tiền làm túi (VNĐ)': fmt(r.lamTuiTienNVL as number),
    'TG in (phút)': fmt(r.tgInPhut as number, 1),
    'TG ghép (phút)': fmt(r.tgGhepPhut as number, 1),
    'TG chia (phút)': fmt(r.tgChiaPhut as number, 1),
    'TG làm túi (phút)': fmt(r.tgTuiPhut as number, 1),
    'Tổng CP VL (VNĐ)': fmt(r.tongVL as number),
    'Tổng NC+điện (VNĐ)': fmt(r.tongNCD as number),
    'Tổng nâng cao (VNĐ)': fmt(r.tongGiaThanhNangCao as number),
    'Engine CPSX (VNĐ)': fmt(r.engineTotalProdCost as number),
    'Engine đơn giá (đ/cái)': fmt(r.engineCostPerUnit as number),
    'Kết luận': note.danhGia,
    'Nhận xét AI': note.nhanXet,
  };
});

const phatHien = [
  ['STT', 'Phát hiện', 'Mức độ', 'Chi tiết'],
  [1, 'Tỷ lệ phủ 50% áp đúng cho OPP & PET ở bảng nâng cao', 'ĐẠT', 'C01-C04 + C28-C45: giảm đúng 50% phần mực mọi số màu 1-8 (OPP 412→296 … 2.453→1.526; PET 522→351 … 3.336→1.968 đ/m²), dung môi giữ nguyên, tooltip "× 50%". LLDPE 1.763→1.062, PA 1.728→1.044 cũng đúng.'],
  [2, 'PA (nylon) map sang bảng mực PET', 'ĐÃ FIX', 'C05: PA → bảng PET (1.728 đ/m²) đúng rule "màng còn lại". Fallback chonNhomMuc đổi từ OPP sang PET; test PA/giấy/rỗng đã cập nhật.'],
  [3, 'Số màu >8: CP mực clamp 8 nhưng thời gian in tính theo số màu thật', 'LỖI BẤT NHẤT', 'C16: 12 màu → mực 2.453 đ/m² (8 màu) nhưng thời gian 294 phút (12 màu setup 240 phút). tinhCpMucDungMoiIn clamp 8, tinhThoiGianMayIn không clamp.'],
  [4, 'In nhũ + Phủ mờ đã bổ sung vào bảng nâng cao', 'ĐÃ FIX', 'C17: 2 cột mới "CP Nhũ + Mờ (đ/m²)" + "Thành tiền Nhũ + Mờ" — lấy metallicSurcharge (gồm Nhũ + Phủ mờ + phí in khác) × diện tích, tổng nâng cao khớp engine (86,8M).'],
  [5, 'Màng in: bảng nâng cao tôn trọng 50% nhưng giá engine không đổi', 'BẤT NHẤT', 'C18-C19: màng in truyền coverageRatio=0.5 qua API → bảng giảm 1.286→823 đ/m², giá engine giữ 11,02M (engine màng in bỏ qua tỷ lệ phủ). UI đang khóa 50% cho màng in.'],
  [6, 'Tổng nâng cao luôn cao hơn tổng engine (~38%)', 'CẦN XÁC NHẬN', 'C27: 5,97M vs 4,33M cùng input. Do 2 model mực khác nhau (bảng ₫/kg × định mức g/m² vs giá mực đơn giản theo màu).'],
  [7, 'Ghép 2→5 lớp, chia, làm túi, bonus ≥40.000m', 'ĐẠT', 'C20-C26: số dòng ghép 1/2/3/4 đúng, keo 420 đ/m² mỗi lớp, zipper hiện dòng làm túi, màng ẩn chia/làm túi, bonus 90 phút đã cộng.'],
  [8, 'Dãy đủ 1-8 màu × phủ 50% cho OPP & PET', 'ĐẠT', 'C28-C43: 16 case khớp tuyến tính 100% − 50% phần mực; thời gian in không đổi so với cùng số màu ở 100%. Bổ sung thêm LLDPE 50% (C44) và PA 50% (C45).'],
  [9, 'Ghép 2 VL song song (dual structure) tách dòng đúng', 'ĐẠT', 'C49: LLDPE | MPET | LLDPE (3 dòng — 2 dải LLDPE bị MPET ngắt giữa), keo 420 đ/m² mỗi dòng, khổ Σ = khổ trải.'],
  [10, 'Kết hợp 50% phủ + nhũ/mờ: nhũ KHÔNG giảm theo tỷ lệ phủ', 'ĐẠT', 'C46: mực 1.286→823 đ/m² nhưng CP Nhũ+Mờ giữ nguyên 400 đ/m² — đúng (phí nhũ không phụ thuộc phủ mực). C47: màng in + nhũ cũng đúng.'],
  [11, 'In gia công ngoài: bảng nâng cao vẫn tính CP mực + DM', 'CẦN XÁC NHẬN', 'C50: khi in vendor (đ/m²), bảng nâng cao vẫn hiển thị CP mực + DM theo số màu — cần PM xác nhận mực do bên GC lo hay LTS trả.'],
  [12, 'Màng ghép (mangGhep) & PET MATTE nhận diện đúng', 'ĐẠT', 'C48: màng 2 lớp → 1 dòng ghép, không chia/làm túi. C51: PET_MATT12 → bảng PET.'],
];

const ws1 = XLSX.utils.json_to_sheet(rows);
const ws2 = XLSX.utils.aoa_to_sheet(phatHien);

const COL_W = [
  5, 6, 12, 46, 8, 9, 12, 10, 16, 17, 12, 15, 60, 10, 26, 10, 15, 12, 16, 10, 10, 10, 12, 14, 15, 15, 15, 14, 10, 70,
];
ws1['!cols'] = COL_W.map(w => ({ wch: w }));
ws1['!freeze'] = { xSplit: 0, ySplit: 1 };
ws1['!autofilter'] = { ref: `A1:AD${rows.length + 1}` };
ws2['!cols'] = [{ wch: 5 }, { wch: 52 }, { wch: 18 }, { wch: 90 }];
ws2['!freeze'] = { xSplit: 0, ySplit: 1 };

const cacNhom = [...new Set(rows.map((r: Record<string, unknown>) => String(r['Nhóm'])))];
const chuoiNhom = cacNhom.map(n => `${n} ${rows.filter((r: Record<string, unknown>) => r['Nhóm'] === n).length}`).join(', ');

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws1, 'Kết quả & phân tích');
XLSX.utils.book_append_sheet(wb, ws2, 'Phát hiện chính');

const out = join(root, 'docs', 'test-tinh-gia-2026-08-07.xlsx');
XLSX.writeFile(wb, out);
writeFileSync(
  join(root, 'docs', 'test-tinh-gia-2026-08-07-report.md'),
  `# Test Tính Giá — Bảng Đặc tả kỹ thuật nâng cao (2026-08-07)

File đầy đủ: docs/test-tinh-gia-2026-08-07.xlsx

- Tổng case: ${rows.length} (${chuoiNhom})
- ĐẠT: ${rows.filter((r: Record<string, unknown>) => r['Kết luận'] === 'ĐẠT').length} · CHƯA: ${rows.filter((r: Record<string, unknown>) => r['Kết luận'] === 'CHƯA').length} · LƯU Ý: ${rows.filter((r: Record<string, unknown>) => r['Kết luận'] === 'LƯU Ý').length}

## Phát hiện chính

1. Tỷ lệ phủ 50% áp đúng cho OPP & PET ở bảng nâng cao (C01-C04).
2. PA rơi vào nhóm mực OPP — checklist ghi PA thuộc "in mực PET" → nghi ngờ lỗi mapping (C05).
3. Số màu >8: mực clamp 8 nhưng thời gian in tính theo số màu thật → bất nhất (C16).
4. In nhũ (phi kim loại) không xuất hiện trong bảng nâng cao (C17).
5. Màng in: bảng nâng cao tôn trọng 50% nhưng giá engine không đổi (C19).
6. Tổng nâng cao cao hơn tổng engine ~38% (C27).
`,
  'utf8',
);
console.log('WROTE', out, 'rows=', rows.length);
