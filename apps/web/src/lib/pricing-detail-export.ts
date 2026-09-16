import type { AppConstants, CalculateResult, HistoryItem, Material, OverrideTable, ProfitRow, SmallWidthMaterialPrice } from './types';
import { tinhBaoGia, lapDongSanXuat, xuLyDongGhiDe, tinhGiaHieuLuc } from './manager-calculation';
import { tinhGiaThuongMai } from './engine';
import type { UniRow } from './manager-calculation';
import {
  chuanBiUniRowsNangCao,
  lapDongNhanCongDien,
  lapDongVatLieuNangCao,
  tinhKetQuaNangCaoHieuLuc,
  tinhTongNangCao,
  type DongNhanCongDien,
  type DongVatLieuNangCao,
} from './dac-ta-nang-cao';
import { apCpsxNangCaoVaoHangSo } from './cpsx-nang-cao-pin';
import { countOverrideChanges } from './override-display';
import { getPricingDisplayMeta, isPrintFilm } from './pricing-display';
import { tinhNhapPhanBoChotGia } from './chot-gia-allocation';
import { cotBang2TheoQuyen, type CotBang2Cpsx } from './permissions';
import type { PolicyCode } from './api/service-lts';
import { layConfigsTheoIdsCoCache } from './api/price-config-cache';
import { lietKePinIdThieu, xayEngineCtxTuPriceConfigs } from './api/price-config-mapper';

// ── Helpers ─────────────────────────────────────────────────────────────────────
function dinhDangSo(n: number, d = 0): string {
  return Math.round(n).toLocaleString('vi-VN');
}
function dinhDangSoLe(n: number, d = 1): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: d });
}
function dinhDangM2(n: number): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
function dinhDangPhanTram(n: number): string {
  return parseFloat((n * 100).toFixed(2)) + '%';
}

function coGhiDeDong(ov: Record<string, unknown> | undefined, fields: string[]): boolean {
  if (!ov) return false;
  return fields.some(f => ov[f] !== undefined);
}

function coGhiDeChiTiet(detail: Record<string, unknown> | undefined, fields: string[]): boolean {
  if (!detail) return false;
  return fields.some(f => detail[f] !== undefined);
}

const TEN_LOAI_MANG: Record<string, string> = {
  mangIn: 'Màng in',
  mangGhep: 'Màng ghép',
  mangDongGoi: 'Màng đóng gói tự động',
  mangGhepKoIn: 'Màng ghép không in',
  mangGhepCoIn: 'Màng ghép có in',
};
const TEN_LOAI_TUI: Record<string, string> = {
  '3bien': '3 biên', '4bien': '4 biên', xephong_lech: 'Xếp hông dán lưng lệch',
  xephong_giua: 'Xếp hông dán lưng giữa', dayDung: 'Đáy đứng', cutSeal: 'Cut seal',
  cutSealNapKeo: 'Cut seal mở miệng có nắp keo',
};

// ── CSS ─────────────────────────────────────────────────────────────────────────
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 10.5pt; color: #1e293b; background: #f1f5f9; }
.pdf-toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between;
  padding: 8px 24px; background: #fff; border-bottom: 2px solid #e2e8f0; }
.pdf-toolbar-title { font-weight: 700; font-size: 13pt; }
.pdf-toolbar-actions { display: flex; gap: 8px; }
.btn-print { padding: 6px 18px; background: #0891b2; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 10.5pt; }
.btn-close { padding: 6px 12px; background: #e2e8f0; color: #475569; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 10.5pt; }
.pdf-pages { max-width: 210mm; margin: 24px auto; overflow-x: hidden; }

.page { background: #fff; padding: 18mm 15mm; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-radius: 4px; overflow-x: hidden; }
.page-title { text-align: center; font-size: 9pt; color: #94a3b8; margin-bottom: 8px; font-style: italic; }
@media print {
  @page { size: A4; margin: 15mm; }
  body { background: #fff; }
  .pdf-toolbar { display: none; }
  .pdf-pages { margin: 0; }
  .page { box-shadow: none; margin: 0; padding: 0; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
}

h1 { font-size: 16pt; font-weight: 800; text-align: center; margin-bottom: 4px; color: #0f172a; }
.section { margin-top: 18px; }
.section-title { font-size: 11pt; font-weight: 700; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #e2e8f0; color: #334155; }
.section-title .icon { margin-right: 4px; }
.info-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
.info-box .name-line { font-weight: 700; font-size: 11pt; color: #0f172a; margin-bottom: 8px; }
.info-grid { display: flex; flex-wrap: wrap; gap: 4px 24px; }
.info-item { font-size: 9.5pt; }
.info-item strong { font-weight: 600; color: #475569; }

.price-box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 16px; }
.price-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
.price-row.chot { font-weight: 700; font-size: 10.5pt; }
.price-row.chenh { color: #059669; font-weight: 600; }
.price-row.sub { font-size: 8.5pt; color: #64748b; padding-left: 12px; }
.price-row.doanhthu { font-weight: 700; padding-top: 6px; border-top: 1px dashed #e2e8f0; margin-top: 6px; }

.stat-row { display: flex; gap: 10px; margin-top: 10px; }
.stat-card { flex: 1; border-radius: 8px; padding: 8px 12px; text-align: center; border: 1px solid; }
.stat-card.green { background: #f0fdf4; border-color: #bbf7d0; }
.stat-card.cyan { background: #ecfeff; border-color: #a5f3fc; }
.stat-card.orange { background: #fff7ed; border-color: #fed7aa; }
.stat-card.pink { background: #fdf2f8; border-color: #fbcfe8; }
.stat-label { font-size: 7.5pt; text-transform: uppercase; font-weight: 600; color: #64748b; margin-bottom: 2px; }
.stat-value { font-weight: 700; font-size: 10.5pt; }
.stat-sub { font-size: 7.5pt; color: #64748b; margin-top: 1px; }

.breakdown-box { border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 10px; padding: 8px 16px; }
.breakdown-title { font-size: 9pt; font-weight: 600; color: #64748b; margin-bottom: 6px; }
.bl-row { display: flex; justify-content: space-between; font-size: 9pt; padding: 2px 0; }
.bl-label { color: #475569; }
.bl-value { font-weight: 600; }
.bl-total { font-weight: 700; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px; }

table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
th { background: #dbeafe; font-weight: 700; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.02em;
  padding: 5px 6px; border: 1px solid #bae6fd; white-space: nowrap; text-align: center; }
td { padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; }
td.left { text-align: left; }
.total-row td { font-weight: 700; border-top: 2px solid #94a3b8; background: #f8fafc; }
.cell-changed { background: #ffedd5 !important; font-weight: 700; }
.cell-propagated { background: #fff7ed !important; }
.override-price-delta-row td { font-weight: 700; font-size: 9pt; padding: 8px 10px; }
.override-price-delta-row--up td { color: #059669; background: #f0fdf4; }
.override-price-delta-row--down td { color: #dc2626; background: #fef2f2; }

.hero-price { text-align: center; padding: 16px 12px 8px; }
.hero-price .hp-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; }
.hero-price .hp-value { font-size: 28pt; font-weight: 800; color: #0f172a; line-height: 1.1; margin: 4px 0; }
.hero-price .hp-value.chot { color: #059669; }
.hero-price .hp-sub { font-size: 9pt; color: #64748b; }
.hero-price .hp-meta { margin-top: 12px; font-size: 9.5pt; color: #334155; }
.hero-price .hp-name { font-weight: 700; font-size: 11pt; color: #0f172a; margin-bottom: 8px; }
.nc-badge { display: inline-block; background: rgba(124,58,237,0.12); color: #7c3aed; font-weight: 700; font-size: 8pt; padding: 2px 8px; border-radius: 999px; margin-left: 6px; vertical-align: middle; }
.dac-ta-note { font-size: 8pt; color: #64748b; margin: 6px 0 0; font-style: italic; }
.totals-nc { margin-top: 10px; border: 1px solid #c7d2fe; border-radius: 8px; overflow: hidden; }
.totals-nc .tr { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e0e7ff; font-size: 9pt; }
.totals-nc .tr:last-child { border-bottom: none; background: #eef2ff; font-weight: 800; }
.totals-nc .tr .lbl small { display: block; font-weight: 400; color: #64748b; font-size: 7.5pt; }
.met-kho { white-space: pre-line; line-height: 1.25; font-size: inherit; }

/* Bảng NC 10 cột — ép vừa khổ A4, không tràn ngang */
.page--nc { padding: 12mm 8mm; overflow-x: hidden; }
.table-wrap-nc { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
table.table-nc {
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
  font-size: 6.5pt;
  margin-top: 6px;
}
table.table-nc th {
  white-space: normal;
  word-break: break-word;
  hyphens: auto;
  font-size: 5.8pt;
  line-height: 1.15;
  padding: 3px 2px;
  letter-spacing: 0;
  text-transform: none;
}
table.table-nc td {
  padding: 3px 2px;
  word-break: break-word;
  overflow-wrap: anywhere;
  font-size: 6.5pt;
  line-height: 1.2;
}
table.table-nc td.left { word-break: break-word; }
table.table-nc-ncd { table-layout: auto; }
table.table-nc-ncd th { white-space: nowrap; font-size: 6.5pt; text-transform: uppercase; }

@media print {
  td, th { font-size: 7pt; }
  .section { page-break-inside: avoid; }
  .page--nc { padding: 0; }
  table.table-nc { font-size: 6pt; }
  table.table-nc th { font-size: 5.5pt; padding: 2px 1px; }
  table.table-nc td { font-size: 6pt; padding: 2px 1px; }
  .table-wrap-nc { overflow: visible; }
}
`;

// ── Section builders ────────────────────────────────────────────────────────────

function buildThongTinChung(r: CalculateResult, item: HistoryItem): string {
  const i = item.input;
  const laMang = i.productType === 'mang';
  const laMotaTM = i.pricingMode === 'commercial' && (i.commercialMode || 'form') === 'description';
  const soMau = i.numColors && i.numColors > 0 ? `${i.numColors} màu` : 'Không in';
  const khoMm = Math.round(i.spreadWidth * 1000);
  const buocMm = Math.round(i.cutStep * 1000);
  let loai = laMang
    ? (TEN_LOAI_MANG[i.filmType] || 'Màng cuộn')
    : (TEN_LOAI_TUI[i.bagType] || '');
  if (!laMang && loai) {
    if (i.hasTape && i.bagType === 'cutSeal') loai = 'Cut seal mở miệng có nắp keo';
    if (i.hasZipper) loai = 'Zipper ' + loai;
  }

  // Sheet thương mại "Mô tả khác": không có thông số kỹ thuật — chỉ KH/SP/SL/đơn vị/trọng lượng/mô tả.
  if (laMotaTM) {
    const donVi = getPricingDisplayMeta(i).unit;
    const trongLuong = Math.max(0, Number((i as any).commercialUnitWeight) || 0);
    const moTa = (i.commercialDescription || '').trim();
    return `
    <div class="section">
      <div class="section-title"><span class="icon">📋</span> THÔNG TIN CHUNG</div>
      <div class="info-box">
        <div class="name-line">${item.customer} — ${item.productName}</div>
        <div class="info-grid">
          <div class="info-item"><strong>Số lượng:</strong> ${dinhDangSo(i.quantity)} ${donVi}</div>
          ${trongLuong > 0 ? `<div class="info-item"><strong>Trọng lượng / đơn vị:</strong> ${dinhDangSoLe(trongLuong, 2)} gr</div>` : ''}
        </div>
        ${moTa ? `<div class="info-item" style="white-space:pre-wrap;margin-top:6px;"><strong>Mô tả:</strong> ${moTa}</div>` : ''}
        ${item.sellerName ? `<div style="margin-top:6px;font-size:9pt;color:#64748b;">Sale: ${item.sellerName}</div>` : ''}
      </div>
    </div>`;
  }

  let trucIn = '';
  if (i.numColors && i.numColors > 0 && r.cylLength > 0) {
    const d = Math.round(r.cylLength * 1000);
    const cv = Math.round(r.cylCircum * 1000);
    const giaTruc = r.cylinderCostPerUnit;
    const tongTruc = r.cylinderCost;
    trucIn = `<div><strong>Trục in:</strong> D ${dinhDangSo(d)} mm x CV ${dinhDangSo(cv)} mm<br>${dinhDangSo(giaTruc)} đ/trục × ${i.numColors} trục = ${dinhDangSo(tongTruc)} đ</div>`;
  }

  let cuonMang = '';
  if (laMang) {
    const cl = i.filmRollLength || 6000;
    cuonMang = `<div><strong>Cuộn màng TP:</strong> ${dinhDangSo(cl)} m/cuộn (${dinhDangSoLe(r.filmRollArea, 1)} m²/cuộn)</div>`;
  }

  return `
    <div class="section">
      <div class="section-title"><span class="icon">📋</span> THÔNG TIN CHUNG</div>
      <div class="info-box">
        <div class="name-line">${item.customer} — ${item.productName}</div>
        <div class="info-grid">
          <div class="info-item"><strong>Chất liệu:</strong> ${r.structureText}</div>
          <div class="info-item"><strong>${laMang ? 'Diện tích' : 'Số lượng'}:</strong> ${dinhDangSo(i.quantity)} ${laMang ? 'm²' : getPricingDisplayMeta(i).unit}</div>
          <div class="info-item"><strong>Số màu:</strong> ${soMau}</div>
          <div class="info-item"><strong>Kích thước:</strong> KT ${khoMm} mm x BC ${buocMm} mm</div>
          <div class="info-item"><strong>Độ dày:</strong> ${r.totalThickness} mic</div>
          <div class="info-item"><strong>Diện tích ${laMang ? 'băng' : '1 túi'}:</strong> ${dinhDangM2(r.bagArea)}</div>
          ${!laMang ? `<div class="info-item"><strong>Trọng lượng:</strong> ${dinhDangSoLe(r.tareWeight, 2)} gr</div>` : ''}
          <div class="info-item"><strong>Loại ${laMang ? 'màng' : 'túi'}:</strong> ${loai}</div>
        </div>
        ${cuonMang}
        ${trucIn}
        ${item.sellerName ? `<div style="margin-top:6px;font-size:9pt;color:#64748b;">Sale: ${item.sellerName}</div>` : ''}
      </div>
    </div>`;
}

function buildGia(r: CalculateResult, item: HistoryItem, constants: AppConstants, profitTable: ProfitRow[]): string {
  const meta = getPricingDisplayMeta(item.input);
  const coChot = typeof item.chotGia === 'number' && item.chotGia > 0;
  // Một nguồn giá đề xuất = r.finalPrice (đã tính trên ctx pin) — tránh lệch với stat "Giá bán"/"Giá cuối cùng"
  const giaDeXuat = r.finalPrice || item.finalPrice || 0;
  const chotGia = coChot ? item.chotGia! : 0;
  const diff = coChot ? chotGia - r.finalPrice : 0;
  // TM (mua đi bán lại): công thức số khớp màn tính giá thương mại — chi phí/sp
  // = mua + VC + thùng + phụ phí + lãi vay (KHÔNG gồm LN). r.totalProductionCost
  // của result TM tổng hợp đã gồm LN → dùng nó sẽ trừ LN 2 lần.
  const laThuongMai = !!(item.isThuongMai || item.input?.pricingMode === 'commercial');
  const tmKq = laThuongMai ? tinhGiaThuongMai(item.input) : null;

  // Phân bổ chốt giá
  const hoaHongEngine = r.commissionPerUnit;
  const donViPb = ((item.input as any).donViPhanBo as 'vnd' | 'percent') || 'vnd';
  const phanBoCongTy = (item.input as any).phanBoCongTy ?? 0;
  const phanBo = tinhNhapPhanBoChotGia({
    hasChotGia: coChot,
    diff,
    hoaHongNhap: phanBoCongTy,
    hoaHongEngine,
    donViPhanBo: donViPb,
  });

  // Doanh thu + LN
  let doanhThuChot = 0, loiNhuanCongTyChot = 0, pctLN = 0;
  let tongHoaHongChot = 0, commissionPctShown = 0;
  if (coChot) {
    doanhThuChot = chotGia * item.quantity;
    const hhMoi = Math.max(0, hoaHongEngine + phanBo.hoaHongAmount);
    tongHoaHongChot = Math.round(hhMoi * item.quantity);
    if (tmKq) {
      // TM — khớp màn tính giá: LN công ty = DT chốt − (mua+VC+thùng+phụ phí+lãi vay)×SL − HH
      const chiPhiDonVi = tmKq.purchasePrice + (r.shippingPerUnit ?? 0) + (r.boxPerUnit ?? 0)
        + tmKq.extraFeePerUnit + (r.interestPerUnit ?? 0);
      const tongChiPhi = chiPhiDonVi * item.quantity;
      loiNhuanCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
      pctLN = tongChiPhi > 0 ? (loiNhuanCongTyChot / tongChiPhi) * 100 : 0;
      commissionPctShown = tongChiPhi > 0 ? (hhMoi * item.quantity / tongChiPhi) * 100 : 0;
    } else {
      // Giá đề xuất KHÔNG còn cộng tiền zipper — ngoại lệ GC làm túi "chưa gộp zipper".
      const coGcChuaGomZipper =
        item.input.pricingMode === 'outsource' &&
        (item.input.outsource?.steps ?? []).includes('bag') &&
        item.input.outsource?.bag?.zipperMode === 'excluded';
      const tongChiPhi = r.totalProductionCost + (coGcChuaGomZipper ? r.zipperTotal : 0) + r.tapeTotal
        + r.handleTotal + r.boxTotal + r.shippingTotal
        + r.interestPerUnit * item.quantity;
      loiNhuanCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
      pctLN = r.totalProductionCost > 0 ? (loiNhuanCongTyChot / r.totalProductionCost) * 100 : 0;
      commissionPctShown = r.costPerUnit > 0 ? (hhMoi / r.costPerUnit) * 100 : 0;
    }
  }

  // 4 stat boxes
  const tienLN = r.profitAmount;
  const tyLeLN = r.profitRate;
  const doanhThu = tmKq ? (r.finalPrice || 0) * item.quantity : r.revenue;
  const giaBan = coChot ? chotGia : r.finalPrice;
  const totalCommission = r.commissionPerUnit * item.quantity;
  // TM: % hoa hồng theo tổng tiền mua (khớp hoaHongPctTM trên màn tính giá)
  const commissionPct = tmKq
    ? (tmKq.purchaseTotal > 0 ? totalCommission / tmKq.purchaseTotal : 0)
    : (r.totalProductionCost > 0 ? (r.commissionPerUnit * item.quantity / r.totalProductionCost) : 0);

  // Breakdown items
  const blItems: [string, string][] = [];
  if (tmKq) {
    // TM — khớp khối "Chi tiết giá" trên màn tính giá thương mại
    blItems.push(['Đơn giá mua', dinhDangSoLe(tmKq.purchasePrice, 0) + ' đ']);
    blItems.push([
      tmKq.profitUnit === 'percent'
        ? `Lợi nhuận (${dinhDangSoLe(tmKq.profitRawValue, 2)}%)`
        : `Lợi nhuận (${dinhDangSoLe(tmKq.profitRawValue, 0)} đ${tmKq.unitLabel})`,
      dinhDangSoLe(tmKq.profitPerUnit, 1) + ' đ',
    ]);
    if (tmKq.extraFeePerUnit > 0) {
      blItems.push(['Phụ phí khác', dinhDangSoLe(tmKq.extraFeePerUnit, 1) + ' đ']);
    }
    if ((r.shippingPerUnit ?? 0) > 0) {
      blItems.push(['Vận chuyển / đơn vị', dinhDangSoLe(r.shippingPerUnit, 1) + ' đ']);
    }
    if ((r.boxPerUnit ?? 0) > 0) {
      blItems.push(['Phí thùng / đơn vị', dinhDangSoLe(r.boxPerUnit, 1) + ' đ']);
    }
    if ((r.interestPerUnit ?? 0) > 0) {
      blItems.push([meta.interestLabel(r.interestBase || 0, r.paymentDays ?? 30), dinhDangSoLe(r.interestPerUnit, 1) + ' đ']);
    }
    if ((r.commissionPerUnit ?? 0) > 0) {
      blItems.push(['Hoa hồng kinh doanh', dinhDangSoLe(r.commissionPerUnit, 1) + ' đ']);
    }
  } else {
    blItems.push([`${meta.initialPriceLabel} (Vốn + ${dinhDangPhanTram(tyLeLN)} LN)`, dinhDangSoLe(r.costPerUnit, 1) + ' đ']);
    // Zipper đã gộp vào dòng Làm túi trên bảng đặc tả — không hiện dòng riêng (đồng bộ màn hình, b07d8ca)
    if (item.input.hasTape) blItems.push(['Chi phí Băng keo', dinhDangSoLe(r.tapePerUnit, 1) + ' đ']);
    if (item.input.hasHandle) blItems.push(['Chi phí Quai', dinhDangSoLe(r.handlePerUnit, 1) + ' đ']);
    blItems.push(
      [item.input.productType === 'mang' ? 'Chi phí Đóng gói' : 'Chi phí Thùng giấy', dinhDangSoLe(r.boxPerUnit, 1) + ' đ'],
      [meta.shippingLabel, dinhDangSoLe(r.shippingPerUnit, 1) + ' đ'],
      [meta.interestLabel(r.interestBase || 0, r.paymentDays ?? 30), dinhDangSoLe(r.interestPerUnit, 1) + ` đ${isPrintFilm(item.input) ? '/' + meta.unit : ''}`],
      ['Hoa hồng kinh doanh', dinhDangSoLe(r.commissionPerUnit, 1) + ' đ'],
    );
    if (item.input.pricingMode === 'outsource') {
      if ((r.gcShippingPerUnit ?? 0) > 0) {
        blItems.push(['Vận chuyển (gia công)', dinhDangSoLe(r.gcShippingPerUnit ?? 0, 1) + ' đ']);
      }
      if ((r.gcPackagingPerUnit ?? 0) > 0) {
        blItems.push(['Đóng gói (gia công)', dinhDangSoLe(r.gcPackagingPerUnit ?? 0, 1) + ' đ']);
      }
      if ((r.gcOtherPerUnit ?? 0) > 0) {
        blItems.push(['Phụ phí khác (gia công)', dinhDangSoLe(r.gcOtherPerUnit ?? 0, 1) + ' đ']);
      }
    }
    if (item.input.cylIncluded && (r.cylAllocPerUnit ?? 0) > 0) {
      blItems.push(['Trục in phân bổ (bao trục / 200k m²)', dinhDangSoLe(r.cylAllocPerUnit ?? 0, 2) + ' đ']);
    }
  }
  if (coChot) {
    blItems.push(['+ Chênh lệch chốt giá', dinhDangSoLe(diff, 1) + ' đ']);
  }

  let html = `
    <div class="section">
      <div class="section-title"><span class="icon">💰</span> GIÁ</div>
      <div class="price-box">`;

  if (coChot) {
    html += `<div class="price-row chot">Giá chốt / ${meta.unit} <span>${dinhDangSo(chotGia)} đ</span></div>`;
    html += `<div class="price-row chenh">✅ Chênh lệch / ${meta.unit} <span>${diff >= 0 ? '+' : ''}${dinhDangSoLe(diff, 1)} đ/${meta.unit}</span></div>`;
    html += `<div class="price-row sub">↳ Hoa hồng: ${dinhDangSoLe(phanBo.hoaHongAmount, 1)}đ | Công ty: ${dinhDangSoLe(phanBo.congTyAmount, 1)}đ</div>`;
    html += `<div class="price-row doanhthu">Doanh thu tổng <span>${dinhDangSo(chotGia)} đ/${meta.unit} × ${dinhDangSo(item.quantity)} ${meta.unit} = ${dinhDangSo(doanhThuChot)} đ</span></div>`;
    html += `<div class="price-row">LN công ty (${dinhDangSoLe(pctLN, 2)}%) <span>${dinhDangSo(loiNhuanCongTyChot)} đ</span></div>`;
    html += `<div class="price-row">% Hoa hồng (${dinhDangSoLe(commissionPctShown, 2)}%) <span>${dinhDangSo(tongHoaHongChot)} đ</span></div>`;
  } else {
    html += `<div class="price-row chot">Giá đề xuất / ${meta.unit} <span>${dinhDangSo(giaDeXuat)} đ</span></div>`;
  }

  // 4 stat boxes
  html += `
    <div class="stat-row">
      <div class="stat-card green">
        <div class="stat-label">${meta.profitLabel}</div>
        <div class="stat-value">${dinhDangSo(tienLN)}đ</div>
        <div class="stat-sub">(${dinhDangPhanTram(tyLeLN)})</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-label">Doanh thu</div>
        <div class="stat-value">${dinhDangSo(doanhThu)} đ</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">${meta.salePriceTitle}</div>
        <div class="stat-value">${dinhDangSo(giaBan)} đ</div>
      </div>
      <div class="stat-card pink">
        <div class="stat-label">Hoa hồng</div>
        <div class="stat-value">${dinhDangSo(totalCommission)} đ</div>
        <div class="stat-sub">${dinhDangSoLe(r.commissionPerUnit, 1)} đ/${meta.unit} (${dinhDangPhanTram(commissionPct)})</div>
      </div>
    </div>`;

  // Breakdown
  html += `
    <div class="breakdown-box">
      <div class="breakdown-title">Chi tiết giá ${coChot ? 'chốt' : 'đề xuất'} / ${meta.unit}</div>`;
  for (const [l, v] of blItems) {
    html += `<div class="bl-row"><span class="bl-label">${l}</span><span class="bl-value">${v}</span></div>`;
  }
  html += `<div class="bl-row bl-total"><span>Giá cuối cùng / ${meta.unit}</span><span>${dinhDangSoLe(coChot ? chotGia : r.finalPrice, 1)} đ</span></div>`;
  html += `</div></div></div>`;

  return html;
}

function buildCPSXTable(r: CalculateResult, constants: AppConstants, materials: Material[]): string {
  const { uniRows } = lapDongSanXuat(r, constants);
  let rowsHtml = '';
  let tong = 0;
  for (const row of uniRows) {
    const stageLabel = row.stage;
    const name = row.mat && row.mat !== '-' ? row.mat : '—';
    const cpvl = row.costMat != null ? dinhDangSo(row.costMat) : '—';
    const doDay = row.materialId ? materials.find(m => m.id === row.materialId)?.thickness : undefined;
    rowsHtml += `<tr>
      <td class="left">${stageLabel}</td>
      <td class="left">${name}</td>
      <td>${doDay != null ? dinhDangSo(doDay) : '—'}</td>
      <td>${dinhDangSoLe(row.width, 3)}</td>
      <td>${dinhDangSo(row.meters)}</td>
      <td>${dinhDangSo(row.waste)}</td>
      <td>${dinhDangSo(row.meters + row.waste)}</td>
      <td>${dinhDangSo(row.cpsx)}</td>
      <td>${cpvl}</td>
    </tr>`;
    tong += row.costCPSX + (row.costMat ?? 0);
  }

  return `
    <div class="section">
      <div class="section-title"><span class="icon">🏭</span> BẢNG CPSX — CHI TIẾT CÔNG ĐOẠN SẢN XUẤT</div>
      <table>
        <thead><tr>
          <th class="left">Công đoạn</th><th class="left">Vật liệu</th><th>Dày (mic)</th>
          <th>Khổ NVL (m)</th><th>TP (m)</th><th>Hao (m)</th><th>Đầu vào NVL (m)</th>
          <th>CPSX (đ/m²)</th><th>CPVL (đ)</th>
        </tr></thead>
        <tbody>
          ${rowsHtml}
          <tr class="total-row"><td colspan="9">TỔNG: ${dinhDangSo(tong)} đ</td></tr>
        </tbody>
      </table>
    </div>`;
}

function buildOverrideTable(
  title: string,
  icon: string,
  uniRows: ReturnType<typeof lapDongSanXuat>['uniRows'],
  sourceOv: OverrideTable,
  currentOv: OverrideTable,
  profitRatePct: number,
  defaultProfitRatePct: number,
  r: CalculateResult,
  constants: AppConstants,
  profitTable: ProfitRow[],
  quantity: number,
  materials: Material[],
): string {
  const changeCount = countOverrideChanges(currentOv);
  if (changeCount === 0) return '';

  const { rows, totalCPSX, totalCPVL, grandTotal } = xuLyDongGhiDe(uniRows, sourceOv, currentOv);

  // Effective pricing for this override level
  const effPricing = tinhGiaHieuLuc({
    result: r, uniRows,
    saleOverrides: sourceOv,
    adminOverrides: currentOv,
    saleProfitRatePct: 0,
    adminProfitRatePct: profitRatePct || 0,
    profitTable, constants,
  });

  const baseFinalPrice = r.finalPrice;
  const chenhLech = effPricing.effCostPerUnit - r.costPerUnit;
  const donViText = r.input.productType === 'mang' ? 'MÉT VUÔNG' : 'TÚI';
  const chenhLechText = `${chenhLech >= 0 ? '+' : ''}${dinhDangSo(chenhLech)}`;
  const lopChenhLech = chenhLech >= 0 ? 'override-price-delta-row--up' : 'override-price-delta-row--down';

  let rowsHtml = '';

  for (const row of rows) {
    if (row.materialDetails?.length) {
      for (let di = 0; di < row.materialDetails.length; di++) {
        const detail = row.materialDetails[di];
        const dtOv = currentOv[row.rowKey]?.detailOverrides?.[di];
        const coDoiWidth = coGhiDeChiTiet(dtOv, ['width']);
        const coDoiMatPrice = coGhiDeChiTiet(dtOv, ['matPrice', 'materialId', 'materialName']);
        const coDoiCPSX = coGhiDeDong(currentOv[row.rowKey], ['meters', 'waste', 'cpsx']) || coDoiWidth;
        const coDoiCPVL = coGhiDeDong(currentOv[row.rowKey], ['meters', 'waste']) || coDoiWidth || coDoiMatPrice;
        const widthChanged = Math.abs(detail.width - (row.srcWidth)) > 0.001;
        const metersChanged = Math.abs(row.meters - row.srcMeters) > 0.001;
        const wasteChanged = Math.abs(row.waste - row.srcWaste) > 0.001;
        const inputVLChanged = Math.abs(row.inputVL - row.srcInputVL) > 0.001;
        const cpsxChanged = coGhiDeDong(currentOv[row.rowKey], ['cpsx']);
        const matPriceChanged = coGhiDeChiTiet(dtOv, ['matPrice']);
        const cpvl = di === row.materialDetails.length - 1 ? (row.costMat != null ? dinhDangSo(row.costMat) : '—') : '';
        const doDay = (dtOv?.materialId ?? detail.materialId)
          ? materials.find(m => m.id === (dtOv?.materialId ?? detail.materialId))?.thickness
          : undefined;

        rowsHtml += `<tr>
          <td class="left">${row.stage}</td>
          <td class="left">${detail.name}</td>
          <td>${doDay != null ? dinhDangSo(doDay) : '—'}</td>
          <td class="${coDoiCPSX ? 'cell-changed' : ''}">${dinhDangSoLe(detail.width, 3)}</td>
          <td class="${metersChanged ? 'cell-changed' : ''}">${dinhDangSo(row.meters)}</td>
          <td class="${wasteChanged ? 'cell-changed' : ''}">${dinhDangSo(row.waste)}</td>
          <td class="${inputVLChanged ? 'cell-propagated' : ''}">${dinhDangSo(row.inputVL)}</td>
          <td class="${cpsxChanged ? 'cell-changed' : ''}">${dinhDangSo(row.cpsx)}</td>
          <td class="${coDoiCPVL ? 'cell-changed' : ''}">${cpvl}</td>
        </tr>`;
      }
    } else {
      const metersChanged = Math.abs(row.meters - row.srcMeters) > 0.001;
      const wasteChanged = coGhiDeDong(currentOv[row.rowKey], ['waste']) || Math.abs(row.waste - row.srcWaste) > 0.001;
      const inputVLChanged = Math.abs(row.inputVL - row.srcInputVL) > 0.001;
      const cpsxChanged = coGhiDeDong(currentOv[row.rowKey], ['cpsx']) || Math.abs(row.cpsx - row.srcCpsx) > 0.001;
      const matPriceChanged = coGhiDeDong(currentOv[row.rowKey], ['matPrice', 'mat', 'materialId']);
      const coDoiCPSX = coGhiDeDong(currentOv[row.rowKey], ['width', 'meters', 'waste', 'cpsx']);
      const coDoiCPVL = coGhiDeDong(currentOv[row.rowKey], ['width', 'meters', 'waste', 'matPrice', 'mat', 'materialId']);

      const name = row.mat && row.mat !== '-' ? row.mat : '—';
      const cpvl = row.costMat != null ? dinhDangSo(row.costMat) : '—';
      const cpvlChanged = coDoiCPVL;
      const doDay = (currentOv[row.rowKey]?.materialId ?? row.materialId)
        ? materials.find(m => m.id === (currentOv[row.rowKey]?.materialId ?? row.materialId))?.thickness
        : undefined;

      rowsHtml += `<tr>
        <td class="left">${row.stage}</td>
        <td class="left">${name}</td>
        <td>${doDay != null ? dinhDangSo(doDay) : '—'}</td>
        <td class="${coDoiCPSX ? 'cell-changed' : ''}">${dinhDangSoLe(row.width, 3)}</td>
        <td class="${metersChanged ? 'cell-changed' : ''}">${dinhDangSo(row.meters)}</td>
        <td class="${wasteChanged ? 'cell-changed' : ''}">${dinhDangSo(row.waste)}</td>
        <td class="${inputVLChanged ? 'cell-propagated' : ''}">${dinhDangSo(row.inputVL)}</td>
        <td class="${cpsxChanged ? 'cell-changed' : ''}">${dinhDangSo(row.cpsx)}</td>
        <td class="${cpvlChanged ? 'cell-changed' : ''}">${cpvl}</td>
      </tr>`;
    }
  }

  const totalChanged = Math.abs(grandTotal - r.totalProductionCost) > 1;

  // Tỷ lệ LN
  let profitRateHtml = '';
  const effectivePct = profitRatePct || defaultProfitRatePct;
  const baseCost = effPricing.effTotalProdCost / quantity;
  const ln = baseCost * (effectivePct / 100) * quantity;
  profitRateHtml = `<tr class="total-row"><td colspan="9">Tỷ lệ LN: ${effectivePct}% &mdash; LN: ${dinhDangSo(Math.round(ln))} đ</td></tr>`;

  return `
    <div class="section">
      <div class="section-title"><span class="icon">${icon}</span> ${title} (${changeCount} thay đổi)</div>
      <table>
        <thead><tr>
          <th class="left">C.đoạn</th><th class="left">Vật liệu</th><th>Dày (mic)</th>
          <th>Khổ (m)</th><th>TP (m)</th><th>Hao (m)</th><th>Đ.vào NVL (m)</th>
          <th>CPSX (đ/m²)</th><th>CPVL (đ)</th>
        </tr></thead>
        <tbody>
          ${rowsHtml}
          <tr class="total-row ${totalChanged ? 'cell-changed' : ''}">
            <td colspan="9">TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN &mdash; ${dinhDangSo(grandTotal)} đ</td>
          </tr>
          ${profitRateHtml}
          <tr class="total-row override-price-delta-row ${lopChenhLech}">
            <td colspan="9">CHÊNH LỆCH SO VỚI GIÁ GỐC: <strong>${chenhLechText} ĐỒNG / ${donViText}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

// ── Nâng cao: đặc tả + xuất ───────────────────────────────────────────────────

function ovCoData(ov?: OverrideTable | null): boolean {
  return !!ov && Object.keys(ov).length > 0;
}

/**
 * Dựng 1 khối "ĐẶC TẢ ... (NÂNG CAO)" theo cặp source/active override.
 * Gọi riêng cho từng nguồn: BẢN GỐC ({} / {}), Sale ({} / sale), Admin (sale / admin).
 */
function xuatBangDacTaNangCao(params: {
  r0: CalculateResult;
  uniRows: UniRow[];
  hangSo: AppConstants;
  materials: Material[];
  sourceOv: OverrideTable;
  activeOv: OverrideTable;
  nhanNguon: string;
  cot: CotBang2Cpsx;
  coQuyenCoVan: boolean;
}): string {
  const { r0, uniRows, hangSo, materials, sourceOv, activeOv, nhanNguon, cot, coQuyenCoVan } = params;
  const hasAnyOv = ovCoData(activeOv);
  const dongXuLy = chuanBiUniRowsNangCao({
    uniRows,
    result: r0,
    hangSo,
    sourceOv,
    activeOv: hasAnyOv ? activeOv : {},
  });
  const dongVL = lapDongVatLieuNangCao(
    r0,
    dongXuLy,
    hangSo,
    materials,
    hasAnyOv ? activeOv : undefined,
  );
  const dongNCD = lapDongNhanCongDien(r0, hangSo, hasAnyOv ? activeOv : undefined);
  const tong = tinhTongNangCao(dongVL, dongNCD);
  return buildDacTaNangCaoHtml(dongVL, dongNCD, tong, nhanNguon, cot, coQuyenCoVan, materials);
}

function dinhDangOMet(n: number | null | undefined, label?: string, soLe = 0): string {
  if (label) return `<span class="met-kho">${label.replace(/\n/g, '<br/>')}</span>`;
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN', { maximumFractionDigits: soLe, minimumFractionDigits: soLe > 0 ? Math.min(soLe, 3) : 0 });
}

function buildDacTaNangCaoHtml(
  dongVL: DongVatLieuNangCao[],
  dongNCD: DongNhanCongDien[],
  tong: { tongVatLieu: number; tongNhanCongDien: number; tongGiaThanh: number },
  nhanNguon: string,
  cot: CotBang2Cpsx,
  coQuyenCoVan: boolean,
  materials: Material[],
): string {
  let t1 = '';
  for (const row of dongVL) {
    const nhanDonViPhu = row.donViGiaNVL === 'm' ? ' đ/m' : row.donViGiaNVL === 'kg' ? '/kg' : '';
    const cpVl = row.cpVatLieu != null
      ? `${dinhDangSoLe(row.cpVatLieu, 1)}${row.giaNVL != null && row.giaNVL > 0 ? `<br/><small>(${dinhDangSo(row.giaNVL)}${nhanDonViPhu})</small>` : ''}`
      : (row.giaNVL != null && row.giaNVL > 0 ? `(${dinhDangSo(row.giaNVL)}${nhanDonViPhu})` : '—');
    const doDay = row.materialId ? materials.find(m => m.id === row.materialId)?.thickness : undefined;
    t1 += `<tr>
      <td class="left">${row.congDoan || ''}</td>
      <td class="left">${row.vatLieu || '—'}</td>
      <td>${doDay != null ? dinhDangSo(doDay) : '—'}</td>
      <td>${row.khoMangLabel ?? (row.khoMang != null ? dinhDangSoLe(row.khoMang, 3) : '—')}</td>
      <td>${dinhDangOMet(row.thanhPham, row.thanhPhamLabel, 0)}</td>
      <td>${row.phiHao != null ? dinhDangSo(row.phiHao) : '—'}</td>
      <td>${dinhDangOMet(row.dauVaoNVL, row.dauVaoNvlLabel, 0)}</td>
      <td>${cpVl}</td>
      <td>${row.thanhTienNVL != null ? dinhDangSo(row.thanhTienNVL) : '—'}</td>
      <td>${row.cpMucKeo != null ? dinhDangSoLe(row.cpMucKeo, 1) : '—'}</td>
      <td>${row.thanhTienMucKeo != null ? dinhDangSo(row.thanhTienMucKeo) : '—'}</td>
    </tr>`;
  }

  let t2 = '';
  let tongNc = 0;
  let tongDien = 0;
  for (const row of dongNCD) {
    tongNc += row.thanhTienNhanCong;
    tongDien += row.thanhTienDien;
    t2 += `<tr>`
      + `<td class="left">${row.congDoan}</td>`
      + (cot.coThoiGian ? `<td>${row.thoiGianPhut != null ? dinhDangSo(row.thoiGianPhut) : '—'}</td>` : '')
      + (cot.coLuong ? `<td>${row.cpNhanCongPerPhut != null ? dinhDangSo(row.cpNhanCongPerPhut) : '—'}</td><td>${dinhDangSo(row.thanhTienNhanCong)}</td>` : '')
      + (cot.coDien ? `<td>${row.cpDienPerPhut != null ? dinhDangSo(row.cpDienPerPhut) : '—'}</td><td>${dinhDangSo(row.thanhTienDien)}</td>` : '')
      + `</tr>`;
  }
  const bang2LabelColSpan = 1 + (cot.coThoiGian ? 1 : 0) + (cot.coLuong ? 1 : 0);
  t2 += `<tr class="total-row">`
    + `<td class="left" colspan="${bang2LabelColSpan}">Tổng nhân công / điện</td>`
    + (cot.coLuong ? `<td>${dinhDangSo(tongNc)}</td>` : '')
    + (cot.coDien ? `<td></td><td>${dinhDangSo(tongDien)}</td>` : '')
    + `</tr>`;

  const hienBang2 = coQuyenCoVan && (cot.coLuong || cot.coDien);
  const bang2Html = hienBang2 ? `
      <div class="table-wrap-nc">
      <table class="table-nc table-nc-ncd" style="margin-top:12px">
        <thead><tr>
          <th class="left">Công đoạn</th>${cot.coThoiGian ? '<th>TG SX (phút)</th>' : ''}${cot.coLuong ? '<th>Giá NC (đ/phút)</th><th>TT nhân công</th>' : ''}${cot.coDien ? '<th>Giá điện (đ/phút)</th><th>TT điện</th>' : ''}
        </tr></thead>
        <tbody>${t2}</tbody>
      </table>
      </div>` : '';

  return `
    <div class="section">
      <div class="section-title"><span class="icon">🔬</span> ĐẶC TẢ KỸ THUẬT &amp; NGUYÊN LIỆU (NÂNG CAO)
        <span class="nc-badge">${nhanNguon}</span>
      </div>
      <div class="table-wrap-nc">
      <table class="table-nc">
        <colgroup>
          <col style="width:8%"/><col style="width:10%"/><col style="width:7%"/>
          <col style="width:8%"/><col style="width:8%"/><col style="width:6%"/>
          <col style="width:8%"/><col style="width:10%"/><col style="width:12%"/><col style="width:11%"/><col style="width:12%"/>
        </colgroup>
        <thead><tr>
          <th class="left">C.đoạn</th><th class="left">Vật liệu</th><th>Dày (mic)</th>
          <th>Khổ (m)</th><th>TP (m)</th><th>PH (m)</th><th>ĐV NVL (m)</th>
          <th>CP VL (đ/m²)</th><th>TT CPNVL</th>
          <th>Mực/DM/keo (đ/m²)</th><th>TT mực/DM/keo</th>
        </tr></thead>
        <tbody>${t1}</tbody>
      </table>
      </div>
      ${bang2Html}
      <div class="totals-nc">
        <div class="tr"><span class="lbl">Tổng thành tiền CP Vật liệu<small>(nguyên vật liệu + dung môi + keo ghép + khác)</small></span><span>${dinhDangSo(tong.tongVatLieu)} đ</span></div>
        <div class="tr"><span class="lbl">Tổng thành tiền chi phí Nhân công + điện</span><span>${dinhDangSo(tong.tongNhanCongDien)} đ</span></div>
        <div class="tr"><span class="lbl">TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN</span><span>${dinhDangSo(tong.tongGiaThanh)} đ</span></div>
      </div>
      <p class="dac-ta-note">Giá mỗi sản phẩm tab nâng cấp lấy từ tổng giá thành sản xuất cơ bản ở trên (sau ghi đè hiệu lực).</p>
    </div>`;
}

function buildHeroNangCao(r: CalculateResult, item: HistoryItem, giaHieuLuc: number): string {
  const i = item.input;
  const laMang = i.productType === 'mang';
  const meta = getPricingDisplayMeta(i);
  const coChot = typeof item.chotGia === 'number' && item.chotGia > 0;
  const chot = coChot ? item.chotGia! : 0;
  const deXuat = giaHieuLuc;
  const shown = coChot ? chot : deXuat;
  const soMau = i.numColors && i.numColors > 0 ? `${i.numColors} màu` : 'Không in';
  const khoMm = Math.round(i.spreadWidth * 1000);
  const buocMm = Math.round(i.cutStep * 1000);
  let loai = laMang
    ? (TEN_LOAI_MANG[i.filmType] || 'Màng cuộn')
    : (TEN_LOAI_TUI[i.bagType] || '');
  if (!laMang && loai) {
    if (i.hasTape && i.bagType === 'cutSeal') loai = 'Cut seal mở miệng có nắp keo';
    if (i.hasZipper) loai = 'Zipper ' + loai;
  }
  let trucIn = '';
  if (i.numColors && i.numColors > 0 && r.cylLength > 0) {
    const d = Math.round(r.cylLength * 1000);
    const cv = Math.round(r.cylCircum * 1000);
    trucIn = `<div><strong>Trục in:</strong> D ${dinhDangSo(d)} mm x CV ${dinhDangSo(cv)} mm — ${dinhDangSo(r.cylinderCostPerUnit)} đ/trục × ${i.numColors} = ${dinhDangSo(r.cylinderCost)} đ</div>`;
  }

  return `
    <div class="hero-price">
      <div class="hp-label">${coChot ? `Giá chốt / ${meta.unit}` : `Giá đề xuất / ${meta.unit}`}</div>
      <div class="hp-value${coChot ? ' chot' : ''}">${dinhDangSo(shown)}</div>
      ${coChot ? `<div class="hp-sub">(giá đề xuất ${dinhDangSo(deXuat)} đ/${meta.unit})</div>` : ''}
      <div class="hp-sub">(chưa VAT)</div>
      <div class="hp-meta">
        <div class="hp-name">${item.customer} — ${item.productName}</div>
        <div class="info-grid" style="justify-content:center">
          <div class="info-item"><strong>Chất liệu:</strong> ${r.structureText}</div>
          <div class="info-item"><strong>${laMang ? 'Diện tích' : 'Số lượng'}:</strong> ${dinhDangSo(i.quantity)} ${laMang ? 'm²' : 'túi'}</div>
          <div class="info-item"><strong>Số màu:</strong> ${soMau}</div>
          <div class="info-item"><strong>Kích thước:</strong> KT ${khoMm} mm x BC ${buocMm} mm</div>
          <div class="info-item"><strong>Độ dày:</strong> ${r.totalThickness} mic</div>
          <div class="info-item"><strong>Diện tích ${laMang ? 'băng' : '1 túi'}:</strong> ${dinhDangM2(r.bagArea)}</div>
          ${!laMang ? `<div class="info-item"><strong>Trọng lượng:</strong> ${dinhDangSoLe(r.tareWeight, 2)} gr</div>` : ''}
          <div class="info-item"><strong>Loại ${laMang ? 'màng' : 'túi'}:</strong> ${loai}</div>
        </div>
        ${trucIn}
      </div>
    </div>`;
}

function moCuaSoHtml(title: string, toolbarTitle: string, pagesHtml: string): void {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>
<div class="pdf-toolbar">
  <span class="pdf-toolbar-title">${toolbarTitle}</span>
  <div class="pdf-toolbar-actions">
    <button class="btn-print" onclick="window.print()">🖨 In PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Đóng</button>
  </div>
</div>
<div class="pdf-pages">
  ${pagesHtml}
</div>
</body></html>`;
  const win = window.open('', '_blank', 'width=1100,height=900');
  if (!win) { alert('Trình duyệt chặn popup. Vui lòng cho phép popup.'); return; }
  win.document.write(fullHtml);
  win.document.close();
}

function exportPricingDetailNangCaoToA4(
  item: HistoryItem,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
  cot: CotBang2Cpsx,
  coQuyenCoVan: boolean,
  smallWidthPrices: SmallWidthMaterialPrice[] = [],
): void {
  const hangSo = apCpsxNangCaoVaoHangSo(constants, item.pinnedCpsxNangCao);
  const r0 = tinhBaoGia(item.input, materials, hangSo, profitTable, smallWidthPrices);
  if (!r0) {
    alert('Không thể tính lại bảng giá nâng cao. Dữ liệu có thể không hợp lệ.');
    return;
  }
  const { uniRows } = lapDongSanXuat(r0, hangSo);
  const saleOv = item.saleOverrides ?? {};
  const adminOv = item.adminOverrides ?? {};
  // Giá hero A4 theo LN hệ thống — LN% ghi đè Sale/Admin chỉ là scenario preview.
  const kq = tinhKetQuaNangCaoHieuLuc({
    result: r0,
    uniRows,
    constants: hangSo,
    materials,
    saleOverrides: saleOv,
    adminOverrides: adminOv,
    saleProfitRatePct: 0,
    adminProfitRatePct: 0,
    profitTable,
  });
  const r = kq.result;
  const itemGia: HistoryItem = {
    ...item,
    finalPrice: r.finalPrice,
    profitRate: r.profitRate,
  };

  let pagesHtml = '';
  pagesHtml += `<div class="page">
    <h1>CHI TIẾT BẢNG TÍNH GIÁ <span class="nc-badge">NÂNG CẤP</span></h1>
    <div style="text-align:center;font-size:9pt;color:#64748b;margin-bottom:8px;">Ngày ${item.date}</div>
    ${buildHeroNangCao(r, itemGia, r.finalPrice)}
    ${buildGia(r, itemGia, hangSo, profitTable)}
  </div>`;

  // Luôn có BẢN GỐC — cho đối chiếu khi có ghi đè Admin/Sale.
  pagesHtml += `<div class="page page--nc">
    <div class="page-title">CHI TIẾT BẢNG TÍNH GIÁ NÂNG CẤP — ${item.productName} (BẢN GỐC)</div>
    ${xuatBangDacTaNangCao({ r0, uniRows, hangSo, materials, sourceOv: {}, activeOv: {}, nhanNguon: 'BẢN GỐC', cot, coQuyenCoVan })}
  </div>`;

  // Từng bảng thay đổi (giống bản cũ): Sale, rồi Admin chồng trên Sale — chỉ khi có dữ liệu.
  if (ovCoData(saleOv)) {
    pagesHtml += `<div class="page page--nc">
      <div class="page-title">CHI TIẾT BẢNG TÍNH GIÁ NÂNG CẤP — ${item.productName} (SAU THAY ĐỔI SALE)</div>
      ${xuatBangDacTaNangCao({ r0, uniRows, hangSo, materials, sourceOv: {}, activeOv: saleOv, nhanNguon: '💼 Theo bảng Sale', cot, coQuyenCoVan })}
    </div>`;
  }

  if (ovCoData(adminOv)) {
    pagesHtml += `<div class="page page--nc">
      <div class="page-title">CHI TIẾT BẢNG TÍNH GIÁ NÂNG CẤP — ${item.productName} (SAU THAY ĐỔI ADMIN)</div>
      ${xuatBangDacTaNangCao({ r0, uniRows, hangSo, materials, sourceOv: saleOv, activeOv: adminOv, nhanNguon: '👑 Theo bảng Admin', cot, coQuyenCoVan })}
    </div>`;
  }

  moCuaSoHtml(
    `Chi tiết NC ${item.productName}`,
    `Chi tiết bảng tính giá nâng cấp — ${item.productName}`,
    pagesHtml,
  );
}

// ── Ctx engine cho xem lại ──────────────────────────────────────────────────────

interface CtxEngineXemLai {
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
}

/** Ctx engine cho A4 xem lại: ưu tiên pin priceConfigIds (config LÚC LƯU) để
 *  khớp giá cột "Giá" ở danh sách tính giá; không pin / tải fail → fallback session. */
async function layCtxEngineChoXemLai(
  item: HistoryItem,
  fallback: CtxEngineXemLai,
  accessToken: string | null | undefined,
): Promise<CtxEngineXemLai> {
  const pinIds = (item.priceConfigIds ?? []).map((x) => String(x).trim()).filter(Boolean);
  if (!pinIds.length || !accessToken) return fallback;
  try {
    const configs = await layConfigsTheoIdsCoCache(pinIds, accessToken);
    if (!configs.length) return fallback;
    const thieuIds = lietKePinIdThieu(pinIds, configs);
    if (thieuIds.length) {
      console.warn('A4 xem lại: pin priceConfigIds thiếu bản ghi (phần thiếu rơi về session):', thieuIds);
    }
    return xayEngineCtxTuPriceConfigs(configs, fallback, pinIds);
  } catch (e) {
    console.warn('A4 xem lại: không tải được price-config pin, dùng session:', e);
    return fallback;
  }
}

// ── Main export ─────────────────────────────────────────────────────────────────
export async function exportPricingDetailToA4(
  item: HistoryItem,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
  cpsxPolicies?: PolicyCode[],
  coQuyenCoVan?: boolean,
  accessToken?: string | null,
  smallWidthPrices?: SmallWidthMaterialPrice[],
): Promise<void> {
  const ctx = await layCtxEngineChoXemLai(
    item,
    { materials, constants, profitTable, smallWidthPrices: smallWidthPrices ?? [] },
    accessToken,
  );

  // Tính giá thương mại: KHÔNG đi qua bảng đặc tả nâng cao — check TRƯỚC isNangCap.
  // Item TM từng nhiễm cờ isNangCap (bug lưu lệch cờ) phải vẫn xuất trang TM,
  // không chạy nhánh NC (tính LN bảng giá trên giá đã gồm LN → sai toàn bộ số).
  const laThuongMai = !!(item.isThuongMai || item.input?.pricingMode === 'commercial');
  if (laThuongMai) {
    const r = tinhBaoGia(item.input, ctx.materials, ctx.constants, ctx.profitTable, ctx.smallWidthPrices);
    if (!r) {
      alert('Không thể tính lại bảng giá này. Dữ liệu có thể không hợp lệ.');
      return;
    }
    const pagesHtml = `<div class="page">
      <h1>CHI TIẾT BẢNG TÍNH GIÁ</h1>
      <div style="text-align:center;font-size:9pt;color:#64748b;margin-bottom:12px;">Ngày ${item.date}</div>
      ${buildThongTinChung(r, item)}
      ${buildGia(r, item, ctx.constants, ctx.profitTable)}
    </div>`;
    moCuaSoHtml(
      `Chi tiết ${item.productName}`,
      `Chi tiết bảng tính giá — ${item.productName}`,
      pagesHtml,
    );
    return;
  }

  if (item.isNangCap || item.input?.isNangCap) {
    const cot = cpsxPolicies
      ? cotBang2TheoQuyen(cpsxPolicies)
      : { coDien: true, coLuong: true, coThoiGian: true };
    exportPricingDetailNangCaoToA4(item, ctx.materials, ctx.constants, ctx.profitTable, cot, coQuyenCoVan !== false, ctx.smallWidthPrices);
    return;
  }

  const r = tinhBaoGia(item.input, ctx.materials, ctx.constants, ctx.profitTable, ctx.smallWidthPrices);
  if (!r) {
    alert('Không thể tính lại bảng giá này. Dữ liệu có thể không hợp lệ.');
    return;
  }

  const { uniRows } = lapDongSanXuat(r, ctx.constants);
  const emptyOv: OverrideTable = {};

  const saleOv = item.saleOverrides && Object.keys(item.saleOverrides).length > 0 ? item.saleOverrides : {};
  const adminOv = item.adminOverrides && Object.keys(item.adminOverrides).length > 0 ? item.adminOverrides : {};

  const saleDefaultPct = +(r.profitRate * 100).toFixed(1);
  const adminDefaultPct = saleDefaultPct;

  let pagesHtml = '';

  pagesHtml += `<div class="page">
    <h1>CHI TIẾT BẢNG TÍNH GIÁ</h1>
    <div style="text-align:center;font-size:9pt;color:#64748b;margin-bottom:12px;">Ngày ${item.date}</div>
    ${buildThongTinChung(r, item)}
    ${buildGia(r, item, ctx.constants, ctx.profitTable)}
  </div>`;

  pagesHtml += `<div class="page">
    <div class="page-title">CHI TIẾT BẢNG TÍNH GIÁ — ${item.productName} (tiếp theo)</div>
    ${buildCPSXTable(r, ctx.constants, ctx.materials)}
  </div>`;

  if (Object.keys(saleOv).length > 0) {
    const saleTable = buildOverrideTable('THAY ĐỔI TỪ SALE', '💼', uniRows, emptyOv, saleOv,
      item.saleProfitRatePct ?? 0, saleDefaultPct, r, ctx.constants, ctx.profitTable, item.quantity, ctx.materials);
    pagesHtml += `<div class="page">
      <div class="page-title">CHI TIẾT BẢNG TÍNH GIÁ — ${item.productName} (tiếp theo)</div>
      ${saleTable}
    </div>`;
  }

  if (Object.keys(adminOv).length > 0) {
    const adminTable = buildOverrideTable('THAY ĐỔI TỪ ADMIN', '👑', uniRows, saleOv, adminOv,
      item.adminProfitRatePct ?? 0, adminDefaultPct, r, ctx.constants, ctx.profitTable, item.quantity, ctx.materials);
    pagesHtml += `<div class="page">
      <div class="page-title">CHI TIẾT BẢNG TÍNH GIÁ — ${item.productName} (tiếp theo)</div>
      ${adminTable}
    </div>`;
  }

  moCuaSoHtml(
    `Chi tiết ${item.productName}`,
    `Chi tiết bảng tính giá — ${item.productName}`,
    pagesHtml,
  );
}
