"use client";
import React, { useState } from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { lapDongSanXuat, tinhGiaHieuLuc, xuLyDongGhiDe, type UniRow } from '../lib/manager-calculation';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import { TECHNICAL_TABLE_MOBILE_LABELS as MOBILE_LABELS } from '../lib/technical-table-mobile-labels';
import type { Material, OverrideRowKey, OverrideFields, OverrideTable, HistoryItem } from '../lib/types';
import { kiemTraMaKhachHang, laKhachHangThuocQuyen, type KhachHangCoTen } from '../lib/customer-api';
import { coQuyenCoVanBangTinh } from '../lib/permissions';
import { 
  LoiServiceLts,
  taoPricingSheetService, 
  capNhatPricingSheetResultService, 
  capNhatPricingSheetAdvisorResultService 
} from '../lib/api/service-lts';
import { 
  mapHistoryToPricingSheet, 
  mapHistoryToResultPatch, 
  mapHistoryToAdvisorPatch 
} from '../lib/api/pricing-sheet-mapper';
import { quyetDinhPricingSheetSync } from '../lib/pricing-sheet-sync';
import { LS_CUSTOMERS, loadCustomers } from '../store/helpers';
import { countOverrideChanges, formatMaterialOptionLabel } from '../lib/override-display';
import { tinhHienThiPhanBoChotGia } from '../lib/chot-gia-allocation';

// ── Collapsible card dùng trong phần kết quả ────────────────────────────────
// Mỗi lần render với resetKey mới → luôn bắt đầu ở trạng thái ĐÓNG
function TheThuGon({
  title: tieuDe,
  children,
  resetKey,
  style,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  resetKey: string | number;
  style?: React.CSSProperties;
}) {
  const [mo, datMo] = useState(false);
  // Đặt lại về đóng khi resetKey thay đổi (tức là khi có kết quả mới)
  React.useEffect(() => { datMo(false); }, [resetKey]);

  return (
    <div className="card" style={style}>
      <div
        className="card-title collapsible"
        onClick={() => datMo(v => !v)}
        aria-expanded={mo}
      >
        {tieuDe}
        <span className={`card-collapse-arrow${mo ? ' open' : ''}`}>▼</span>
      </div>
      <div className={`card-body-collapsible${mo ? ' open' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// Format helpers mirroring the original engine.js
function dinhDangSo(n: number | null | undefined, soLe = 0): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('vi-VN', { minimumFractionDigits: soLe, maximumFractionDigits: soLe });
}
function dinhDangVND(n: number) { return dinhDangSo(n) + ' đ'; }
function dinhDangPhanTram(n: number) {
  const val = n * 100;
  return parseFloat(val.toFixed(2)) + '%';
}
function dinhDangM2(n: number) { return dinhDangSo(n, 4) + ' m²'; }

function layNhanVatLieu(materials: Material[], id: string | undefined, tenDuPhong: string): string {
  const material = id ? materials.find(m => m.id === id) : undefined;
  return material ? formatMaterialOptionLabel(material) : tenDuPhong;
}

function coGhiDeDong(rowOverride: Partial<OverrideFields> | undefined, fields: Array<keyof OverrideFields>): boolean {
  return !!rowOverride && fields.some(field => rowOverride[field] !== undefined);
}

function coGhiDeChiTiet(detailOverride: NonNullable<OverrideFields['detailOverrides']>[number] | undefined, fields: Array<keyof NonNullable<OverrideFields['detailOverrides']>[number]>): boolean {
  return !!detailOverride && fields.some(field => detailOverride[field] !== undefined);
}

// ── Overridable Cell (click-to-edit inline) ──────────────────────────────────
function OCoTheGhiDe({ khoaDong, truong, giaTriGoc, giaTriGhiDe, duocSua, khiDat, soLe = 0 }: {
  khoaDong: OverrideRowKey;
  truong: keyof OverrideFields;
  giaTriGoc: number;
  giaTriGhiDe: number | undefined;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  soLe?: number;
}) {
  const giaTriHienThi = giaTriGhiDe ?? giaTriGoc;
  const daThayDoi = giaTriGhiDe !== undefined && Math.abs(giaTriGhiDe - giaTriGoc) > 0.001;
  const [dangSua, datDangSua] = React.useState(false);
  const [giaTriTam, datGiaTriTam] = React.useState('');

  const xacNhan = () => {
    datDangSua(false);
    const soDaDoc = parseFloat(giaTriTam);
    // Từ chối: NaN, số âm (khổ/số mét/phi hao/giá VL không thể âm),
    // hoặc gần bằng giá trị nguồn (revert về gốc)
    if (isNaN(soDaDoc) || soDaDoc < 0 || Math.abs(soDaDoc - giaTriGoc) < 0.001) {
      khiDat(khoaDong, truong, undefined); // revert
    } else {
      khiDat(khoaDong, truong, soDaDoc);
    }
  };

  if (!duocSua) {
    return (
      <td className={`num ${daThayDoi ? 'override-changed' : ''}`}
          title={daThayDoi ? `Gốc: ${dinhDangSo(giaTriGoc, soLe)}` : undefined}
          data-label={truong}>
        {dinhDangSo(giaTriHienThi, soLe)}
      </td>
    );
  }

  return (
    <td className={`num override-cell ${daThayDoi ? 'override-changed' : ''}`}
        title={daThayDoi ? `Gốc: ${dinhDangSo(giaTriGoc, soLe)}` : undefined}
        data-label={truong}>
      {dangSua ? (
        <input className="override-input" type="number" step="any"
          value={giaTriTam}
          onChange={e => datGiaTriTam(e.target.value)}
          onBlur={xacNhan}
          onKeyDown={e => { if (e.key === 'Enter') xacNhan(); if (e.key === 'Escape') datDangSua(false); }}
          autoFocus />
      ) : (
        <span className="override-display"
          onClick={() => { datGiaTriTam(String(Math.round(giaTriHienThi * 10000) / 10000)); datDangSua(true); }}>
          {dinhDangSo(giaTriHienThi, soLe)}
          {duocSua && <span className="override-indicator"> ✎</span>}
        </span>
      )}
    </td>
  );
}


function datGhiDeChiTiet(
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void,
  ghiDeHienTai: OverrideTable,
  khoaDong: OverrideRowKey,
  chiTietIndex: number,
  truong: 'width' | 'matPrice' | 'materialId' | 'materialName',
  giaTri: number | string | undefined,
) {
  const hienTai = ghiDeHienTai[khoaDong]?.detailOverrides ?? {};
  const dongHienTai = { ...(hienTai[chiTietIndex] ?? {}) };
  if (giaTri === undefined) delete dongHienTai[truong];
  else (dongHienTai as Record<string, number | string>)[truong] = giaTri;
  const tiepTheo = { ...hienTai };
  if (Object.keys(dongHienTai).length) tiepTheo[chiTietIndex] = dongHienTai;
  else delete tiepTheo[chiTietIndex];
  khiDat(khoaDong, 'detailOverrides', Object.keys(tiepTheo).length ? tiepTheo : undefined);
}


function OChiTietCoTheGhiDe({ khoaDong, chiTietIndex, truong, giaTriGoc, giaTriGhiDe, duocSua, khiDat, ghiDeHienTai, soLe = 0 }: {
  khoaDong: OverrideRowKey;
  chiTietIndex: number;
  truong: 'width' | 'matPrice';
  giaTriGoc: number;
  giaTriGhiDe: number | undefined;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  ghiDeHienTai: OverrideTable;
  soLe?: number;
}) {
  const giaTriHienThi = giaTriGhiDe ?? giaTriGoc;
  const daThayDoi = giaTriGhiDe !== undefined && Math.abs(giaTriGhiDe - giaTriGoc) > 0.001;
  const [dangSua, datDangSua] = React.useState(false);
  const [giaTriTam, datGiaTriTam] = React.useState('');
  const xacNhan = () => {
    datDangSua(false);
    const soDaDoc = parseFloat(giaTriTam);
    datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, truong,
      isNaN(soDaDoc) || soDaDoc < 0 || Math.abs(soDaDoc - giaTriGoc) < 0.001 ? undefined : soDaDoc);
  };
  if (!duocSua) {
    return <td className={`num ${daThayDoi ? 'override-changed' : ''}`}>{dinhDangSo(giaTriHienThi, soLe)}</td>;
  }
  return (
    <td className={`num override-cell ${daThayDoi ? 'override-changed' : ''}`}>
      {dangSua ? (
        <input className="override-input" type="number" step="any" value={giaTriTam}
          onChange={e => datGiaTriTam(e.target.value)} onBlur={xacNhan}
          onKeyDown={e => { if (e.key === 'Enter') xacNhan(); if (e.key === 'Escape') datDangSua(false); }} autoFocus />
      ) : (
        <span className="override-display" onClick={() => { datGiaTriTam(String(Math.round(giaTriHienThi * 10000) / 10000)); datDangSua(true); }}>
          {dinhDangSo(giaTriHienThi, soLe)}<span className="override-indicator"> ✎</span>
        </span>
      )}
    </td>
  );
}

function OChonVatLieuChiTiet({ khoaDong, chiTietIndex, giaTriGoc, giaTriGhiDe, duocSua, khiDat, ghiDeHienTai, materials }: {
  khoaDong: OverrideRowKey;
  chiTietIndex: number;
  giaTriGoc: { id?: string; name: string; matPrice: number };
  giaTriGhiDe: { materialId?: string; materialName?: string; matPrice?: number } | undefined;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  ghiDeHienTai: OverrideTable;
  materials: Material[];
}) {
  const tenHienThi = layNhanVatLieu(materials, giaTriGhiDe?.materialId ?? giaTriGoc.id, giaTriGhiDe?.materialName ?? giaTriGoc.name);
  const idHienThi = giaTriGhiDe?.materialId ?? giaTriGoc.id ?? '';
  const daThayDoi = !!giaTriGhiDe?.materialId && giaTriGhiDe.materialId !== giaTriGoc.id;
  const tenGoc = layNhanVatLieu(materials, giaTriGoc.id, giaTriGoc.name);
  if (!duocSua) return <td className={daThayDoi ? 'override-changed' : ''} title={daThayDoi ? `Gốc: ${tenGoc}` : undefined} data-label="Vật liệu">{tenHienThi}</td>;
  return (
    <td className={`override-cell ${daThayDoi ? 'override-changed' : ''}`} title={daThayDoi ? `Gốc: ${tenGoc}` : undefined} data-label="Vật liệu">
      <select className="override-input" value={idHienThi} onChange={e => {
        const mat = materials.find(m => m.id === e.target.value);
        if (!mat || mat.id === giaTriGoc.id) {
          datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'materialId', undefined);
          datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'materialName', undefined);
          datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'matPrice', undefined);
          return;
        }
        const giaM2 = mat.pricePerM2 ?? (mat.pricePerKg * mat.thickness * mat.density / 1000);
        datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'materialId', mat.id);
        datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'materialName', mat.name);
        datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'matPrice', giaM2);
      }}>
        <option value={giaTriGoc.id ?? ''}>{tenGoc}</option>
        {materials.filter(m => m.id !== giaTriGoc.id).map(m => <option key={m.id} value={m.id}>{formatMaterialOptionLabel(m)}</option>)}
      </select>
    </td>
  );
}

function OChonVatLieuDong({ khoaDong, giaTriGocId, giaTriGocTen, giaTriGocGia, ghiDeHienTai, duocSua, khiDat, materials }: {
  khoaDong: OverrideRowKey;
  giaTriGocId?: string;
  giaTriGocTen: string;
  giaTriGocGia: number;
  ghiDeHienTai: OverrideTable;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  materials: Material[];
}) {
  const cur = ghiDeHienTai[khoaDong];
  const tenHienThi = layNhanVatLieu(materials, cur?.materialId ?? giaTriGocId, cur?.mat ?? giaTriGocTen);
  const idHienThi = cur?.materialId ?? giaTriGocId ?? '';
  const daThayDoi = !!cur?.materialId && cur.materialId !== giaTriGocId;
  const tenGoc = layNhanVatLieu(materials, giaTriGocId, giaTriGocTen);
  if (!duocSua || !giaTriGocId) return <td className={daThayDoi ? 'override-changed' : ''} title={daThayDoi ? `Gốc: ${tenGoc}` : undefined} data-label="Vật liệu">{tenHienThi}</td>;
  return (
    <td className={`override-cell ${daThayDoi ? 'override-changed' : ''}`} title={daThayDoi ? `Gốc: ${tenGoc}` : undefined} data-label="Vật liệu">
      <select className="override-input" value={idHienThi} onChange={e => {
        const mat = materials.find(m => m.id === e.target.value);
        if (!mat || mat.id === giaTriGocId) {
          khiDat(khoaDong, 'materialId', undefined);
          khiDat(khoaDong, 'mat', undefined);
          khiDat(khoaDong, 'matPrice', undefined);
          return;
        }
        const giaM2 = mat.pricePerM2 ?? (mat.pricePerKg * mat.thickness * mat.density / 1000);
        khiDat(khoaDong, 'materialId', mat.id);
        khiDat(khoaDong, 'mat', mat.name);
        khiDat(khoaDong, 'matPrice', giaM2);
      }}>
        <option value={giaTriGocId}>{tenGoc}</option>
        {materials.filter(m => m.id !== giaTriGocId).map(m => <option key={m.id} value={m.id}>{formatMaterialOptionLabel(m)}</option>)}
      </select>
    </td>
  );
}

function OChuCoTheGhiDe({ khoaDong, truong, giaTriGoc, giaTriGhiDe, duocSua, khiDat }: {
  khoaDong: OverrideRowKey;
  truong: keyof OverrideFields;
  giaTriGoc: string;
  giaTriGhiDe: string | undefined;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
}) {
  const giaTriHienThi = giaTriGhiDe ?? giaTriGoc;
  const daThayDoi = giaTriGhiDe !== undefined && giaTriGhiDe !== giaTriGoc;
  const [dangSua, datDangSua] = React.useState(false);
  const [giaTriTam, datGiaTriTam] = React.useState('');
  const xacNhan = () => {
    datDangSua(false);
    const v = giaTriTam.trim();
    khiDat(khoaDong, truong, !v || v === giaTriGoc ? undefined : v);
  };
  if (!duocSua) return <td className={daThayDoi ? 'override-changed' : ''} title={daThayDoi ? `Gốc: ${giaTriGoc}` : undefined}>{giaTriHienThi}</td>;
  return (
    <td className={`override-cell ${daThayDoi ? 'override-changed' : ''}`} title={daThayDoi ? `Gốc: ${giaTriGoc}` : undefined}>
      {dangSua ? (
        <input className="override-input" type="text" value={giaTriTam}
          onChange={e => datGiaTriTam(e.target.value)} onBlur={xacNhan}
          onKeyDown={e => { if (e.key === 'Enter') xacNhan(); if (e.key === 'Escape') datDangSua(false); }} autoFocus />
      ) : (
        <span className="override-display" onClick={() => { datGiaTriTam(giaTriHienThi); datDangSua(true); }}>
          {giaTriHienThi}{duocSua && <span className="override-indicator"> ✎</span>}
        </span>
      )}
    </td>
  );
}

// ── Override Table Section ────────────────────────────────────────────────────
function BangGhiDe({ title: tieuDe, lopMau, cacDongSanXuat, ghiDeNguon, ghiDeHienTai, chenhLechGiaGocDonVi, donViChenhLech, duocSua, khiDat, khiLuu, khiLuuMoi, loadedHistoryId, materials, giaDaThayDoiDonVi, effTotalProdCost, profitRatePct, defaultProfitRatePct, khiDatProfitRate, soLuong }: {
  title: string;
  lopMau: 'sale' | 'admin';
  cacDongSanXuat: UniRow[];
  ghiDeNguon: OverrideTable;
  ghiDeHienTai: OverrideTable;
  chenhLechGiaGocDonVi?: number;
  donViChenhLech?: 'tui' | 'm2';
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  khiLuu: (id: string) => void;
  khiLuuMoi: () => void;
  loadedHistoryId: string | null;
  materials: Material[];
  giaDaThayDoiDonVi: number;
  effTotalProdCost: number;
  profitRatePct: number;
  defaultProfitRatePct: number;
  khiDatProfitRate: (v: number) => void;
  soLuong: number;
}) {
  const { rows: cacDongDaXuLy, totalCPSX: tongCPSX, totalCPVL: tongCPVL } = xuLyDongGhiDe(cacDongSanXuat, ghiDeNguon, ghiDeHienTai);
  const coThayDoi = countOverrideChanges(ghiDeHienTai) > 0;
  const cpMangIn = cacDongSanXuat.find(row => (row.printFilmCost ?? 0) > 0)?.printFilmCost ?? 0;
  const coCpMangIn = cpMangIn > 0;
  const donViChenhLechText = donViChenhLech === 'm2' ? 'ĐỒNG / MÉT VUÔNG' : 'ĐỒNG / TÚI';
  const chenhLechGiaGocLamTron = Math.round(chenhLechGiaGocDonVi ?? 0);
  const chenhLechGiaGocText = `${chenhLechGiaGocLamTron > 0 ? '+' : ''}${dinhDangSo(chenhLechGiaGocLamTron, 0)}`;
  const lopChenhLechGia = chenhLechGiaGocLamTron > 0 ? 'override-price-delta--up' : chenhLechGiaGocLamTron < 0 ? 'override-price-delta--down' : 'override-price-delta--flat';

  return (
    <div className={`override-section override-section--${lopMau}`}>
      <div className="override-section-header">
        <div className="override-section-title">
          {lopMau === 'sale' ? '💼' : '👑'} {tieuDe}
        </div>
        {!duocSua && <span className="override-readonly-badge">Chỉ xem</span>}
      </div>
      <div className="table-responsive">
        <table className="data-table technical-material-table">
          <thead>
            <tr>
              <th data-mobile-label={MOBILE_LABELS.stage}>Công đoạn</th><th data-mobile-label={MOBILE_LABELS.material}>Vật liệu</th>
              <th className="num" data-mobile-label={MOBILE_LABELS.width}>Kho vao (m)</th><th className="num" data-mobile-label={MOBILE_LABELS.meters}>Thanh pham (m)</th>
              <th className="num" data-mobile-label={MOBILE_LABELS.waste}>Phi hao</th><th className="num" data-mobile-label={MOBILE_LABELS.inputMaterial}>Đầu vào VL</th>
              <th className="num" data-mobile-label={MOBILE_LABELS.cpsx}>CPSX (đ/m²)</th><th className="num" data-mobile-label={MOBILE_LABELS.totalCpsx}>Thành tiền CPSX</th>
              <th className="num" data-mobile-label={MOBILE_LABELS.materialPrice}>CP vật liệu (đ/m²)</th><th className="num" data-mobile-label={MOBILE_LABELS.totalMaterial}>Thành tiền CPVL</th>
            </tr>
          </thead>
          <tbody>
            {cacDongDaXuLy.flatMap((row, rowIndex) => {
              if (row.materialDetails?.length) {
                const totalDetailWidth = row.materialDetails.reduce((sum, detail) => sum + detail.width, 0) || row.width || 1;
                const rawDetailCosts = row.materialDetails.map(detail => detail.matPrice * row.inputVL * detail.width);
                const rawDetailTotal = rawDetailCosts.reduce((sum, v) => sum + v, 0);
                return row.materialDetails.map((detail, detailIdx) => {
                  const detailCostCPSX = row.costCPSX * detail.width / totalDetailWidth;
                  const detailCostMat = row.costMat != null && rawDetailTotal > 0
                    ? row.costMat * rawDetailCosts[detailIdx] / rawDetailTotal
                    : detail.matPrice * row.inputVL * detail.width;
                  const dongGoc = cacDongSanXuat.find(dong => dong.rowKey === row.rowKey);
                  const chiTietGoc = dongGoc?.materialDetails?.[detailIdx];
                  const ghiDeNguonChiTiet = ghiDeNguon[row.rowKey]?.detailOverrides?.[detailIdx];
                  const ghiDeHienTaiChiTiet = ghiDeHienTai[row.rowKey]?.detailOverrides?.[detailIdx];
                  const coDoiCPSX = coGhiDeDong(ghiDeHienTai[row.rowKey], ['meters', 'waste', 'cpsx']) || coGhiDeChiTiet(ghiDeHienTaiChiTiet, ['width']);
                  const coDoiCPVL = coGhiDeDong(ghiDeHienTai[row.rowKey], ['meters', 'waste']) || coGhiDeChiTiet(ghiDeHienTaiChiTiet, ['width', 'matPrice', 'materialId', 'materialName']);
                  return (
                    <tr key={`${row.rowKey}-${detailIdx}`} className="detail-group-row">
                      <td data-label="Công đoạn">{row.stage}</td>
                      <OChonVatLieuChiTiet khoaDong={row.rowKey} chiTietIndex={detailIdx}
                        giaTriGoc={{
                          id: ghiDeNguonChiTiet?.materialId ?? chiTietGoc?.materialId,
                          name: ghiDeNguonChiTiet?.materialName ?? chiTietGoc?.name ?? detail.name,
                          matPrice: ghiDeNguonChiTiet?.matPrice ?? chiTietGoc?.matPrice ?? detail.matPrice,
                        }}
                        giaTriGhiDe={ghiDeHienTaiChiTiet} duocSua={duocSua} khiDat={khiDat} ghiDeHienTai={ghiDeHienTai} materials={materials} />
                      <OChiTietCoTheGhiDe khoaDong={row.rowKey} chiTietIndex={detailIdx} truong="width" giaTriGoc={chiTietGoc?.width ?? detail.width}
                        giaTriGhiDe={ghiDeHienTaiChiTiet?.width} duocSua={duocSua} khiDat={khiDat} ghiDeHienTai={ghiDeHienTai} soLe={3} />
                      <OCoTheGhiDe khoaDong={row.rowKey} truong="meters" giaTriGoc={row.srcMeters}
                        giaTriGhiDe={Math.abs(row.meters - row.srcMeters) > 0.001 ? row.meters : ghiDeHienTai[row.rowKey]?.meters} duocSua={duocSua} khiDat={khiDat} soLe={0} />
                      <OCoTheGhiDe khoaDong={row.rowKey} truong="waste" giaTriGoc={row.srcWaste}
                        giaTriGhiDe={ghiDeHienTai[row.rowKey]?.waste} duocSua={duocSua} khiDat={khiDat} soLe={0} />
                      <OCoTheGhiDe khoaDong={row.rowKey} truong="inputVL" giaTriGoc={row.srcInputVL}
                        giaTriGhiDe={Math.abs(row.inputVL - row.srcInputVL) > 0.001 ? row.inputVL : ghiDeHienTai[row.rowKey]?.inputVL} duocSua={false} khiDat={khiDat} soLe={0} />
                      <OCoTheGhiDe khoaDong={row.rowKey} truong="cpsx" giaTriGoc={row.srcCpsx}
                        giaTriGhiDe={ghiDeHienTai[row.rowKey]?.cpsx} duocSua={duocSua} khiDat={khiDat} soLe={0} />
                      <td className={`num ${coDoiCPSX ? 'override-changed' : ''}`} data-label="Thành tiền CPSX">{dinhDangSo(detailCostCPSX, 0)}</td>
                      <OChiTietCoTheGhiDe khoaDong={row.rowKey} chiTietIndex={detailIdx} truong="matPrice" giaTriGoc={chiTietGoc?.matPrice ?? detail.matPrice}
                        giaTriGhiDe={ghiDeHienTaiChiTiet?.matPrice} duocSua={duocSua} khiDat={khiDat} ghiDeHienTai={ghiDeHienTai} soLe={1} />
                      <td className={`num ${coDoiCPVL ? 'override-changed' : ''}`} data-label="Thành tiền CPVL">{dinhDangSo(detailCostMat, 0)}</td>
                    </tr>
                  );
                });
              }

              return [(() => {
                const dongGoc = cacDongSanXuat.find(dong => dong.rowKey === row.rowKey);
                const ghiDeDong = ghiDeHienTai[row.rowKey];
                const coDoiCPSX = coGhiDeDong(ghiDeDong, ['width', 'meters', 'waste', 'cpsx']);
                const coDoiCPVL = coGhiDeDong(ghiDeDong, ['width', 'meters', 'waste', 'matPrice', 'mat', 'materialId']);
                return (
                <tr key={row.rowKey}>
                  <td data-label="Công đoạn">{row.stage}</td>
                  <OChonVatLieuDong khoaDong={row.rowKey} giaTriGocId={ghiDeNguon[row.rowKey]?.materialId ?? dongGoc?.materialId} giaTriGocTen={ghiDeNguon[row.rowKey]?.mat ?? dongGoc?.mat ?? row.mat} giaTriGocGia={ghiDeNguon[row.rowKey]?.matPrice ?? dongGoc?.matPrice ?? 0} ghiDeHienTai={ghiDeHienTai} duocSua={duocSua} khiDat={khiDat} materials={materials} />
                  <OCoTheGhiDe khoaDong={row.rowKey} truong="width" giaTriGoc={row.srcWidth}
                    giaTriGhiDe={ghiDeHienTai[row.rowKey]?.width} duocSua={duocSua} khiDat={khiDat} soLe={3} />
                  <OCoTheGhiDe khoaDong={row.rowKey} truong="meters" giaTriGoc={row.srcMeters}
                    giaTriGhiDe={Math.abs(row.meters - row.srcMeters) > 0.001 ? row.meters : ghiDeHienTai[row.rowKey]?.meters} duocSua={duocSua} khiDat={khiDat} soLe={0} />
                  <OCoTheGhiDe khoaDong={row.rowKey} truong="waste" giaTriGoc={row.srcWaste}
                    giaTriGhiDe={ghiDeHienTai[row.rowKey]?.waste} duocSua={duocSua} khiDat={khiDat} soLe={0} />
                  <OCoTheGhiDe khoaDong={row.rowKey} truong="inputVL" giaTriGoc={row.srcInputVL}
                    giaTriGhiDe={Math.abs(row.inputVL - row.srcInputVL) > 0.001 ? row.inputVL : ghiDeHienTai[row.rowKey]?.inputVL} duocSua={false} khiDat={khiDat} soLe={0} />
                  <OCoTheGhiDe khoaDong={row.rowKey} truong="cpsx" giaTriGoc={row.srcCpsx}
                    giaTriGhiDe={ghiDeHienTai[row.rowKey]?.cpsx} duocSua={duocSua} khiDat={khiDat} soLe={0} />
                  <td className={`num ${coDoiCPSX ? 'override-changed' : ''}`} data-label="Thành tiền CPSX">{dinhDangSo(row.costCPSX, 0)}</td>
                  {row.matPrice != null ? (
                    <OCoTheGhiDe khoaDong={row.rowKey} truong="matPrice" giaTriGoc={row.srcMatPrice ?? 0}
                      giaTriGhiDe={ghiDeHienTai[row.rowKey]?.matPrice} duocSua={duocSua && row.matPrice != null} khiDat={khiDat} soLe={1} />
                  ) : (
                    <td className="num" data-label="CP vật liệu">—</td>
                  )}
                  <td className={`num ${coDoiCPVL ? 'override-changed' : ''}`} data-label="Thành tiền CPVL">{row.costMat != null ? dinhDangSo(row.costMat, 0) : '—'}</td>
                </tr>
                );
              })()];
            })}
            {coCpMangIn && (
              <tr className="total-row">
                <td colSpan={9}>CP theo thời gian in</td>
                <td className="num">{dinhDangSo(cpMangIn, 0)} đ</td>
              </tr>
            )}
            <tr className="total-row" style={{ fontSize: '1.05em' }}>
              <td colSpan={7}><strong>TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN</strong></td>
              <td colSpan={3} className={`num ${coThayDoi ? 'override-changed' : ''}`} style={{ color: coThayDoi ? undefined : 'var(--accent)', fontWeight: 800 }}>
                {dinhDangSo(tongCPSX + tongCPVL + cpMangIn, 0)} đ
              </td>
            </tr>
            {giaDaThayDoiDonVi > 0 && (
              (() => {
                const effectivePct = profitRatePct || 0;
                const isOverridden = profitRatePct > 0;
                const baseCost = effTotalProdCost / soLuong;
                const dt = baseCost * (1 + effectivePct / 100) * soLuong;
                const ln = baseCost * (effectivePct / 100) * soLuong;
                return (
                  <tr className={`override-profit-rate-row override-profit-rate-row--${lopMau}${isOverridden ? ' override-profit-rate-row--overridden' : ''}`}>
                    <td colSpan={4} className="override-profit-label">
                      Tỷ lệ LN:{' '}
                      {duocSua ? (
                        <input
                          className={`profit-rate-input${isOverridden ? ' profit-rate-input--overridden' : ''}`}
                          type="number"
                          step="0.1"
                          value={profitRatePct > 0 ? profitRatePct : defaultProfitRatePct}
                          onChange={(e) => khiDatProfitRate(Number(e.target.value) || 0)}
                          placeholder={String(defaultProfitRatePct)}
                        />
                      ) : (
                        <span className="profit-rate-value">{effectivePct}%</span>
                      )}
                      {duocSua && <span className="profit-rate-pct-suffix">%</span>}
                    </td>
                    <td colSpan={3} className="num">
                      LN: {dinhDangSo(Math.round(ln), 0)} đ
                    </td>
                    <td colSpan={3} className="num">
                      Giá thành SX cơ bản: {dinhDangSo(Math.round(dt), 0)} đ
                    </td>
                  </tr>
                );
              })()
            )}
            {chenhLechGiaGocDonVi != null && (
              <tr className={`total-row override-price-delta-row ${lopChenhLechGia}`}>
                <td colSpan={10}>
                  CHÊNH LỆCH SO VỚI GIÁ GỐC: <strong>{chenhLechGiaGocText} {donViChenhLechText}</strong>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {duocSua && (
        <div className="override-save-row">
          <button
            className="btn btn-sm btn-green"
            onClick={() => loadedHistoryId ? khiLuu(loadedHistoryId) : khiLuuMoi()}
          >
            💾 Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}

// ── Helpers đẩy pricing sheet lên server ────────────────────────────────────
// Tìm mã khách hàng (codeName) từ tên khách trong HistoryItem.
function timMaKhachHang(tenKhach: string): string | null {
  try {
    const raw = localStorage.getItem(LS_CUSTOMERS);
    if (!raw) return null;
    const list = JSON.parse(raw) as Array<{ companyName?: string; contactName?: string; customerCode?: string; id?: string }>;
    const q = (tenKhach || '').trim().toLowerCase();
    if (!q) return null;
    const found = list.find(c => {
      const ten = (c.companyName || c.contactName || c.customerCode || c.id || '').toLowerCase();
      return ten === q || (c.customerCode || '').toLowerCase() === q;
    });
    return found?.customerCode?.trim() || null;
  } catch {
    return null;
  }
}

function hienToastLuuGhiDe() {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = '💾 Đã lưu thay đổi Sale/Admin';
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function hienToastCanhBao(noiDung: string) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = '#fef3c7';
  toast.style.border = '1px solid #f59e0b';
  toast.style.color = '#92400e';
  toast.textContent = noiDung;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

// Đẩy 1 pricing sheet lên server (chạy ngầm, không hiện toast).
// Bỏ qua im lặng nếu offline / chưa đăng nhập. Hiện toast nếu thiếu mã khách hàng.
async function syncPricingSheetToServer(
  h: HistoryItem | undefined,
  isAuthenticated: boolean,
  accessToken: string | null,
): Promise<void> {
  if (!h) return;

  const decision = quyetDinhPricingSheetSync(h, isAuthenticated, accessToken, h?.pricingSheetId);
  if (decision.action === 'skip') return;

  try {
    if (decision.action === 'postCreate') {
      const maKH = timMaKhachHang(h.customer);
      if (!maKH) {
        hienToastCanhBao(`Không tìm thấy mã khách hàng "${h.customer}". Bảng tính chỉ lưu cục bộ, chưa đẩy lên máy chủ.`);
        return;
      }
      const checkKH = kiemTraMaKhachHang(maKH);
      if (!checkKH.hopLe) {
        hienToastCanhBao(`Mã khách hàng không hợp lệ: ${checkKH.loi ?? maKH}. Bảng tính chỉ lưu cục bộ.`);
        return;
      }
      const sheet = await taoPricingSheetService(mapHistoryToPricingSheet(h, checkKH.maKhachHang), accessToken ?? undefined);
      // Lưu pricingSheetId vào history item
      if (sheet?.id) {
        const state = dungCuaHangTinhGia.getState();
        const updatedHistory = state.history.map(x => x.id === h.id ? { ...x, pricingSheetId: sheet.id, priceConfigIds: sheet.priceConfigIds } : x);
        dungCuaHangTinhGia.setState({ history: updatedHistory });
      }
    } else if (decision.action === 'patch') {
      if (!h.pricingSheetId) return;
      await capNhatPricingSheetResultService(h.pricingSheetId, mapHistoryToResultPatch(h), accessToken ?? undefined);
      if (decision.includeAdvisor) {
        await capNhatPricingSheetAdvisorResultService(h.pricingSheetId, mapHistoryToAdvisorPatch(h), accessToken ?? undefined);
      }
    }
  } catch (e) {
    const msg = e instanceof LoiServiceLts ? e.message : 'Không thể đồng bộ bảng tính lên máy chủ.';
    console.warn('Đồng bộ pricing sheet thất bại:', msg);
    hienToastCanhBao(msg);
  }
}

export default function ManHinhQuanLy() {
  const { result: ketQua, activeView: manHinhDangMo, input, constants: hangSo, profitTable: bangLoiNhuan, currentChotGia: giaChotHienTai, setCurrentChotGia: datGiaChotHienTai, addCurrentToHistory: themVaoLichSu, capNhatHienTaiVaoLichSu: capNhatVaoLichSu, setActiveModule: datPhan,
    role,   loadedHistoryId: loadedHistoryId,
  originalCustomerLoaded: originalCustomerLoaded, history: lichSu, materials,
    currentSellerId: idNhanVienHienTai,
    saleOverrides: ghiDeSale, adminOverrides: ghiDeAdmin, showSaleOverrides: hienGhiDeSale, showAdminOverrides: hienGhiDeAdmin,
    saleProfitRatePct, adminProfitRatePct, setSaleProfitRatePct: datSaleProfitRatePct, setAdminProfitRatePct: datAdminProfitRatePct,
    setSaleOverride: datGhiDeSale, setAdminOverride: datGhiDeAdmin, setShowSaleOverrides: datHienGhiDeSale, setShowAdminOverrides: datHienGhiDeAdmin, persistOverrides: luuGhiDe, calculateForInput,
  accessToken, isAuthenticated,
} = dungCuaHangTinhGia();

// Tính toán trạng thái nút Lưu và banner
const currentCustomerCode = timMaKhachHang(input.customer);
const loadedItem = loadedHistoryId ? lichSu.find(h => h.id === loadedHistoryId) : null;
const isSameCustomer = loadedItem && originalCustomerLoaded && currentCustomerCode && originalCustomerLoaded === currentCustomerCode;
const buttonLabel = loadedItem
  ? (isSameCustomer ? "🔄 Cập nhật" : "📄 Tạo bảng tính mới")
  : "💾 Lưu báo giá";
  const showBanner = loadedItem && !isSameCustomer;
  const [vatLieuCuonDangChon, datVatLieuCuonDangChon] = React.useState('');
  const [phanBoCongTy, datPhanBoCongTy] = React.useState<number>(0);
  const [donViPhanBo, datDonViPhanBo] = React.useState<'vnd' | 'percent'>('vnd');
  const [tabDangMo, datTabDangMo] = React.useState<'sale' | 'admin'>('sale');

  // Sale chỉ được lưu khi khách hàng thuộc danh sách mình quản lý (hoặc khách vừa tạo
  // mới — vốn đã được gán sellerId/managers của sale). Admin không bị giới hạn.
  // Trả true nếu hợp lệ, ngược lại alert + trả false.
  const kiemTraKhachHangQuyen = () => {
    if (laKhachHangThuocQuyen(input.customer, loadCustomers() as KhachHangCoTen[], role, idNhanVienHienTai)) return true;
    alert(input.customer.trim()
      ? 'Bạn chỉ được lưu cho khách hàng mình quản lý. Vui lòng chọn từ gợi ý hoặc tạo khách mới.'
      : 'Vui lòng chọn khách hàng bạn quản lý trước khi lưu.');
    return false;
  };

  if (manHinhDangMo !== 'manager') return null;

  if (!ketQua) {
    return (
      <div className="empty-state" id="emptyState">
        <div className="icon">📦</div>
        <p>Nhập đầy đủ thông tin đơn hàng để xem kết quả tính giá</p>
        <p style={{marginTop: '8px', fontSize: '0.78rem', color: 'var(--dim)'}}>Kết quả sẽ <strong>tự động cập nhật</strong> ngay khi bạn thay đổi bất kỳ thông số nào</p>
      </div>
    );
  }
  const r = ketQua;
  const dauVaoKq = r.input;
  const hienThiGia = getPricingDisplayMeta(dauVaoKq);
  const laMang = hienThiGia.isFilm;

  const { uniRows: cacDongSanXuat, totalCPSX: tongCPSX, totalCPVL: tongCPVL, grandTotal: tongCong } = lapDongSanXuat(r, hangSo);
  const cpTheoThoiGianIn = cacDongSanXuat.find(row => (row.printFilmCost ?? 0) > 0)?.printFilmCost ?? 0;
  // Giá trị gốc từ engine (không bị ảnh hưởng bởi admin/sale override)
  const tongChiPhiSXHieuLuc = r.totalProductionCost;
  const tyLeLoiNhuanHieuLuc = r.profitRate;
  const tienLoiNhuanHieuLuc = r.profitAmount;
  const giaVonDonViHieuLuc = r.costPerUnit;

  // Key dùng để reset tất cả collapsible về đóng mỗi khi có kết quả tính mới
  // (dùng giaVonDonViHieuLuc tạm, effFinalPriceWithComm sẽ được tính ở phần breakdown bên dưới)
  const khoaKetQua = `${giaVonDonViHieuLuc}|${dauVaoKq.quantity}|${r.totalThickness}|${dauVaoKq.spreadWidth}|${dauVaoKq.cutStep}`;
  const chieuDaiCuonMang = (dauVaoKq as any).chieuDaiCuonMang || (dauVaoKq as any).filmRollLength || 6000;
  const nhanDonVi = hienThiGia.unit; // đơn vị hiển thị
  const dienTichMoiCuonMang = laMang ? (dauVaoKq.spreadWidth || 0) * chieuDaiCuonMang : 0;
  const soLuongCuonMang = laMang && dienTichMoiCuonMang > 0 ? dauVaoKq.quantity / dienTichMoiCuonMang : 0;

  // ── Summary info ──
  const chuSoMau = dauVaoKq.numColors && dauVaoKq.numColors > 0 ? `${dauVaoKq.numColors} màu` : 'Không in';
  const khoTraiMm = +(dauVaoKq.spreadWidth * 1000).toFixed(0);
  const buocCatMm = +(dauVaoKq.cutStep * 1000).toFixed(0);

  const tenLoaiMang: Record<string, string> = {
    'mangIn': 'Màng in',
    'mangGhep': 'Màng ghép',
    'mangDongGoi': 'Màng đóng gói tự động',
    // legacy keys
    'mangGhepKoIn': 'Màng ghép không in',
    'mangGhepCoIn': 'Màng ghép có in',
  };
  const tenLoaiTui: Record<string, string> = {
    '3bien': '3 biên', '4bien': '4 biên', 'xephong_lech': 'Xếp hông dán lưng lệch',
    'xephong_giua': 'Xếp hông dán lưng giữa', 'dayDung': 'Đáy đứng', 'cutSeal': 'Cut seal'
  };
  let chuoiLoaiTui = tenLoaiTui[dauVaoKq.bagType] || '';
  if (!laMang && chuoiLoaiTui) {
    if (dauVaoKq.hasZipper) {
      if (dauVaoKq.bagType === 'cutSeal') {
        chuoiLoaiTui = 'Cute seal nắp băng keo';
      } else {
        chuoiLoaiTui = 'Zipper ' + chuoiLoaiTui;
      }
    }
  } else if (laMang) {
    chuoiLoaiTui = tenLoaiMang[dauVaoKq.filmType] || 'Màng cuộn';
  }

  const cylPerUnit = r.cylinderCostPerUnit;
  const numTr = dauVaoKq.numColors || 0;
  const cylTotal = r.cylinderCost;
  const laMangIn = hienThiGia.isPrintFilm;

  // Commission từ engine gốc (không bị ảnh hưởng bởi admin/sale override)
  const effCommissionPerUnit = r.commissionPerUnit;

  // ── Breakdown items ──
  const breakdownItems: [string, string][] = [
    [`${hienThiGia.initialPriceLabel} (Vốn + ${dinhDangPhanTram(tyLeLoiNhuanHieuLuc)} LN)`, dinhDangSo(giaVonDonViHieuLuc, 1) + ' đ'],
  ];
  if (dauVaoKq.hasZipper) breakdownItems.push(['Chi phí Zipper', dinhDangSo(r.zipperPerUnit, 1) + ' đ']);
  if (dauVaoKq.hasTape) breakdownItems.push(['Chi phí Băng keo', dinhDangSo(r.tapePerUnit, 1) + ' đ']);
  if (dauVaoKq.hasHandle) breakdownItems.push(['Chi phí Quai', dinhDangSo(r.handlePerUnit, 1) + ' đ']);
  breakdownItems.push(
    [laMang ? 'Chi phí Đóng gói' : 'Chi phí Thùng giấy', dinhDangSo(r.boxPerUnit, 1) + ' đ'],
    [hienThiGia.shippingLabel, laMangIn ? `${dinhDangSo(r.shippingTotal, 0)} đ · ${dinhDangSo(r.shippingPerUnit, 1)} đ/${nhanDonVi}` : dinhDangSo(r.shippingPerUnit, 1) + ' đ'],
    [hienThiGia.interestLabel(r.interestBase || 0, r.paymentDays ?? dauVaoKq.paymentDays ?? 30), dinhDangSo(r.interestPerUnit, 1) + ` đ${laMangIn ? `/${nhanDonVi}` : ''}`],
    ['Hoa hồng kinh doanh', dinhDangSo(effCommissionPerUnit, 1) + ' đ']
  );
  if (dauVaoKq.cylIncluded && (r.cylAllocPerUnit ?? 0) > 0) {
    breakdownItems.push([`Trục in phân bổ (bao trục / 200k m²)`, dinhDangSo(r.cylAllocPerUnit ?? 0, 2) + ' đ']);
  }

  const cylAllocTotal = dauVaoKq.cylIncluded ? ((r.cylAllocPerUnit ?? 0) * dauVaoKq.quantity) : 0;
  const totalCommission = effCommissionPerUnit * dauVaoKq.quantity;
  const commissionPct = giaVonDonViHieuLuc > 0 ? (effCommissionPerUnit / giaVonDonViHieuLuc) : 0;
  const chotGiaNum = giaChotHienTai || 0;
  const hasChotGia = chotGiaNum > 0;
  // Giá cuối cùng từ engine gốc
  const effFinalPriceWithComm = r.finalPrice;
  const shownPrice = hasChotGia ? chotGiaNum : effFinalPriceWithComm;
  const diff = hasChotGia ? chotGiaNum - effFinalPriceWithComm : 0;
  const phanBoHoaHong = donViPhanBo === 'percent'
    ? diff * ((100 - phanBoCongTy) / 100)
    : diff >= 0 ? diff - phanBoCongTy : diff + phanBoCongTy;
  const hienThiPhanBoChotGia = tinhHienThiPhanBoChotGia({ hasChotGia, diff, phanBoCongTy, donViPhanBo });
  const hoaHongAllocation = phanBoHoaHong;
  const rawNewCommission = effCommissionPerUnit + hoaHongAllocation;
  const profitDropFromChot = rawNewCommission < 0 ? Math.abs(rawNewCommission) * dauVaoKq.quantity : 0;
  const profitDropPct = rawNewCommission < 0 && tienLoiNhuanHieuLuc > 0 ? (profitDropFromChot / tienLoiNhuanHieuLuc) : 0;
  const newCommissionPerUnit = Math.max(0, rawNewCommission);
  const doanhThuChot = shownPrice * dauVaoKq.quantity;
  const tongHoaHongChot = newCommissionPerUnit * dauVaoKq.quantity;
  const tongChiPhi = tongChiPhiSXHieuLuc + r.zipperTotal + r.tapeTotal + r.handleTotal + r.boxTotal + r.shippingTotal + (r.interestPerUnit * dauVaoKq.quantity);
  const loiNhuanCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
  const pctLoiNhuanCongTyChot = tongChiPhiSXHieuLuc > 0 ? (loiNhuanCongTyChot / tongChiPhiSXHieuLuc) : 0;
  const commissionPctShown = giaVonDonViHieuLuc > 0 ? (newCommissionPerUnit / giaVonDonViHieuLuc) : 0;
  const tinhGiaSauGhiDeDonVi = (saleOverrides: OverrideTable, adminOverrides: OverrideTable, spPct = 0, apPct = 0) => {
    const { effCostPerUnit, effTotalProdCost } = tinhGiaHieuLuc({
      result: r,
      uniRows: cacDongSanXuat,
      saleOverrides,
      adminOverrides,
      saleProfitRatePct: spPct,
      adminProfitRatePct: apPct,
      profitTable: bangLoiNhuan,
      constants: hangSo,
    });
    const hoaHongDonVi = dauVaoKq.commissionFixedVND > 0
      ? dauVaoKq.commissionFixedVND
      : dauVaoKq.commissionRate * effCostPerUnit;
    const giaDonVi = effCostPerUnit
      + r.zipperPerUnit + r.tapePerUnit + r.handlePerUnit
      + r.boxPerUnit + r.shippingPerUnit + r.interestPerUnit + hoaHongDonVi
      + (r.cylAllocPerUnit ?? 0);
    return { giaDonVi, tongChiPhiSX: effTotalProdCost };
  };
  const saleResult = tinhGiaSauGhiDeDonVi(ghiDeSale, {}, saleProfitRatePct, 0);
  const giaSauGhiDeSaleDonVi = saleResult.giaDonVi;
  const tongCPSXSale = saleResult.tongChiPhiSX;
  const adminResult = tinhGiaSauGhiDeDonVi({}, ghiDeAdmin, 0, adminProfitRatePct);
  const giaSauGhiDeAdminDonVi = adminResult.giaDonVi;
  const tongCPSXAdmin = adminResult.tongChiPhiSX;
  const donViChenhLechGia = laMang ? 'm2' : 'tui';
  const { effProfitRate: saleBaseRate } = tinhGiaHieuLuc({
    result: r, uniRows: cacDongSanXuat,
    saleOverrides: ghiDeSale, adminOverrides: {},
    saleProfitRatePct: 0, adminProfitRatePct: 0,
    profitTable: bangLoiNhuan, constants: hangSo,
  });
  const { effProfitRate: adminBaseRate } = tinhGiaHieuLuc({
    result: r, uniRows: cacDongSanXuat,
    saleOverrides: {}, adminOverrides: ghiDeAdmin,
    saleProfitRatePct: 0, adminProfitRatePct: 0,
    profitTable: bangLoiNhuan, constants: hangSo,
  });
  const saleDefaultPct = +(saleBaseRate * 100).toFixed(1);
  const adminDefaultPct = +(adminBaseRate * 100).toFixed(1);

  // ── MOQ Table ──
  const moqLevels = [5000, 10000, 15000, 20000, 30000, 40000, 50000, 70000, 100000, 150000, 200000];
  const currentQty = dauVaoKq.quantity;
  if (!moqLevels.includes(currentQty) && currentQty > 0) {
    moqLevels.push(currentQty);
    moqLevels.sort((a, b) => a - b);
  }

  const matCols: any[] = [];
  if (r.layers.print && r.layers.print.material) matCols.push({ type: 'print', name: r.layers.print.material.name.split(' ')[0], fullName: r.layers.print.material.name });
  if (r.layers.laminations) {
    r.layers.laminations.forEach((lam: any) => {
      if (!lam.material) return;
      const label = lam.materials?.length > 1 ? lam.materials.map((m: any) => m.name.split(' ')[0]).join('+') : lam.material.name.split(' ')[0];
      const full = lam.materials?.length > 1 ? lam.materials.map((m: any) => m.name).join(' + ') : lam.material.name;
      matCols.push({ type: 'lam', layerNum: lam.layerNum, name: label, fullName: full });
    });
  }

  const getLayerData = (res: any, col: any) => {
    if (col.type === 'print') return res.layers.print || null;
    return res.layers.laminations?.find((l: any) => l.layerNum === col.layerNum) || null;
  };
  const calcKg = (layerMat: any, meters: number, width: number) => {
    if (!layerMat) return 0;
    const density = layerMat.matDoHienThi ?? layerMat.density ?? 0;
    return meters * width * layerMat.thickness * density / 1000;
  };
  const calcKgForLayer = (layerData: any, meters: number) => {
    if (!layerData) return 0;
    if (layerData.chiTietVatLieu?.length && layerData.materials?.length) {
      return layerData.chiTietVatLieu.reduce((sum: number, item: any) => {
        const mat = layerData.materials.find((m: any) => m.id === item.vatLieuId);
        return sum + calcKg(mat, meters, item.kho);
      }, 0);
    }
    return calcKg(layerData.material, meters, layerData.width || 0);
  };
  const renderMaterialBreakdown = (layerData: any, totalMeters?: number) => {
    if (!layerData?.materials || !layerData?.chiTietVatLieu) return null;
    const met = totalMeters ?? (layerData.meters + layerData.waste);
    // Deduplicate: gộp các entries cùng vatLieuId, cộng kho, lấy soLan từ entry đầu tiên
    const deduped = (layerData.chiTietVatLieu as any[]).reduce((acc: any[], item: any) => {
      const existing = acc.find((x: any) => x.vatLieuId === item.vatLieuId);
      if (existing) {
        existing.kho += item.kho;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, []);
    return <div style={{ marginTop: '4px', fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.5 }}>
      {deduped.map((item: any, idx: number) => {
        const soLan: number = item.soLan ?? 1;
        const kgTotal = (() => {
          const mat = layerData.materials?.find((m: any) => m.id === item.vatLieuId);
          if (!mat) return 0;
          const density = mat.matDoHienThi ?? mat.density ?? 0;
          return met * item.kho * mat.thickness * density / 1000;
        })();
        return (
          <div key={idx}>
            <span style={{ fontWeight: 600, color: 'var(--text, #1e293b)' }}>{item.ten}:</span>{' '}
            {soLan > 1
              ? <>{dinhDangSo(met, 0)}m × {soLan} = {dinhDangSo(met * soLan, 0)}m</>
              : <>{dinhDangSo(met, 0)}m</>
            }{' '}| {dinhDangSo(kgTotal, 1)} kg
          </div>
        );
      })}
    </div>;
  };

  const moqResults = moqLevels.map(qty => {
    const inp = { ...dauVaoKq, quantity: qty };
    const res = calculateForInput(inp);
    return { qty, res, isCurrent: qty === currentQty };
  }).filter(x => x.res);

  // ── Roll MOQ Table ──
  const rollOptions = matCols;
  const getRollColId = (col: any) => (col.type === 'print' ? 'print' : `lam-${col.layerNum}`);
  const selectedCol = rollOptions.find((c) => getRollColId(c) === vatLieuCuonDangChon) || rollOptions[0];
  const selectedData = selectedCol ? getLayerData(r, selectedCol) : null;
  const selectedMat = selectedData?.material;
  const isKgBase = !laMang && !!selectedMat && (selectedMat.name.toUpperCase().includes('LLDPE') || selectedMat.name.toUpperCase() === 'PE');
  const rollLevels = isKgBase ? [200, 300, 400, 500, 600, 700] : [1, 2, 3, 4, 5, 6];
  const rollLen = laMang ? chieuDaiCuonMang : (selectedMat?.rollLength || 6000);
  const filmRollAreaTP = dauVaoKq.spreadWidth * rollLen;
  const totalSelectedMeters = selectedData ? selectedData.meters + selectedData.waste : 0;
  const otherLayers = rollOptions.filter((c) => c !== selectedCol);
  const getMetersFromKg = (layerMat: any, targetKg: number, width: number) => {
    if (!layerMat || width <= 0) return 0;
    const density = layerMat.matDoHienThi ?? layerMat.density ?? 0;
    const thickness = layerMat.thickness ?? 0;
    if (density <= 0 || thickness <= 0) return 0;
    return targetKg * 1000 / (width * thickness * density);
  };
  const findEstQtyForMeters = (targetMeters: number) => {
    let low = 100;
    let high = 1000000;
    let bestQty = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const res = calculateForInput({ ...dauVaoKq, quantity: mid });
      if (!res) return low;
      const layerData = selectedCol ? getLayerData(res, selectedCol) : null;
      const currentMeters = layerData ? layerData.meters + layerData.waste : 0;
      if (currentMeters <= targetMeters) {
        bestQty = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.floor(bestQty / 100) * 100;
  };
  const rollRows = selectedCol && selectedData && selectedMat ? rollLevels.map((levelVal) => {
    const availableMeters = laMang
      ? levelVal * rollLen
      : isKgBase
        ? getMetersFromKg(selectedMat, levelVal, selectedData.width)
        : levelVal * rollLen;
    const areaM2 = laMang ? availableMeters * (dauVaoKq.spreadWidth || 0) : 0;
    const estQty = laMang
      ? Math.round(areaM2)
      : findEstQtyForMeters(availableMeters);
    if (estQty <= 0) return null;
    const res = calculateForInput({ ...dauVaoKq, quantity: estQty });
    if (!res) return null;
    let isCurrent = false;
    if (laMang) {
      isCurrent = levelVal === Math.ceil(dauVaoKq.quantity / filmRollAreaTP);
    } else if (isKgBase) {
      const currentKg = calcKgForLayer(selectedData, totalSelectedMeters);
      isCurrent = (Math.ceil(currentKg / 100) * 100) === levelVal;
    } else {
      isCurrent = levelVal === Math.ceil(totalSelectedMeters / rollLen);
    }
    return {
      levelVal,
      availableMeters,
      areaM2,
      estQty,
      res,
      isCurrent,
      selectedKg: calcKgForLayer(selectedData, availableMeters),
    };
  }).filter(Boolean) : [];

  // ── Weight items ──
  const weightItems: [string, string][] = [
    [laMang ? 'Diện tích băng (m²/m dài)' : 'Diện tích 1 túi', dinhDangM2(r.bagArea)],
    ['Tổng diện tích đơn hàng', dinhDangSo(r.totalArea, 1) + ' m²'],
    ...(!laMang ? [
      ['Trọng lượng / túi (Tare)', dinhDangSo(r.tareWeight, 2) + ' gr'] as [string, string],
      ['Khối lượng thùng quy đổi', dinhDangSo((dauVaoKq.boxWeight || 0) / (dauVaoKq.bagsPerBox || 1), 2) + ' gr/túi'] as [string, string],
      ['Tổng trọng lượng', dinhDangSo(r.tareWeight * dauVaoKq.quantity / 1000, 1) + ' kg'] as [string, string],
      ['Trọng lượng (tấn)', dinhDangSo(r.tareWeight * dauVaoKq.quantity / 1000000, 3) + ' tấn'] as [string, string],
    ] : [
      ['Chiều dài cuộn TP', dinhDangSo(chieuDaiCuonMang) + ' m/cuộn'] as [string, string],
      ['Số lượng cuộn', dinhDangSo(soLuongCuonMang, 2) + ' cuộn'] as [string, string],
    ]),
  ];

  return (
    <div className="panel active" id="panel-manager">
      <div className="manager-layout" style={{position: 'relative'}}>

        <div className="manager-content">

          {/* ═══ SECTION: Báo Giá Gợi Ý ═══ */}
          <div id="sect-sale" className="manager-section-anchor"></div>
          <div className="card" style={{marginBottom: '14px', padding: 0, background: 'transparent', border: 'none', boxShadow: 'none'}}>

            <div className="price-hero">
              <div className="label">{hasChotGia ? `Giá chốt / ${nhanDonVi}` : `Giá đề xuất / ${nhanDonVi}`}</div>
              <div className="value" id="s-price" style={hasChotGia ? {color:'var(--green)'} : undefined}>
                {dinhDangSo(shownPrice, 0)}
              </div>
              {hasChotGia && (
                <div style={{fontSize:'0.82rem', color:'var(--muted)', marginTop:'2px', marginBottom:'2px'}}>
                  (giá đề xuất {dinhDangSo(effFinalPriceWithComm, 0)} đ/{nhanDonVi})
                </div>
              )}
              {dauVaoKq.cylIncluded && (r.cylAllocPerUnit ?? 0) > 0 && (
                <div style={{fontSize:'0.78rem', color:'var(--primary)', marginTop:'2px', fontWeight:600}}>
                  📌 Có bao trục (+{dinhDangSo(r.cylAllocPerUnit ?? 0, 2)} đ/{nhanDonVi})
                </div>
              )}
              <div className="unit">(chưa VAT)</div>

              {/* Giá cuộn cho màng — gộp giá cuộn + DT cuộn vào 1 ô */}
              {laMang && r.filmRollArea > 0 && (
                <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'12px 24px', marginTop:'12px', fontSize:'0.92rem'}}>
                  <div style={{background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 16px', textAlign:'center'}}>
                    <div style={{fontSize:'0.72rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.03em'}}>Giá / cuộn ({dinhDangSo(khoTraiMm)}mm × {dinhDangSo(chieuDaiCuonMang)}m)</div>
                    <div style={{fontWeight:700, color:'var(--green)', fontSize:'1.1rem'}}>{dinhDangSo(Math.round(shownPrice) * r.filmRollArea, 0)} đ</div>
                    <div style={{fontSize:'0.78rem', color:'var(--muted)', marginTop:'4px'}}>DT cuộn: {dinhDangSo(r.filmRollArea, 1)} m² · {dinhDangSo(Math.round(shownPrice), 0)} đ/m²</div>
                  </div>
                </div>
              )}

              <div className="sub" id="s-structure">
                <div style={{fontWeight:600, color:'var(--text)', fontSize:'1.05rem', marginBottom:'12px'}}>{dauVaoKq.customer} — {dauVaoKq.productName}</div>
                <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 20px', fontSize:'0.9rem', margin:'0 auto', maxWidth:'600px'}}>
                  <div><strong>Chất liệu:</strong> {r.structureText}</div>
                  {laMang ? (
                    <>
                      <div><strong>Diện tích:</strong> {dinhDangSo(dauVaoKq.quantity)} m²</div>
                      <div><strong>Số lượng cuộn:</strong> {dinhDangSo(soLuongCuonMang, 2)} cuộn</div>
                    </>
                  ) : (
                    <div><strong>Số lượng:</strong> {dinhDangSo(dauVaoKq.quantity)} túi</div>
                  )}
                  <div><strong>Số màu:</strong> {chuSoMau}</div>
                  <div><strong>Kích thước:</strong> KT {khoTraiMm} mm x BC {buocCatMm} mm</div>
                  <div><strong>Độ dày:</strong> {r.totalThickness} mic</div>
                  <div><strong>Diện tích {laMang ? 'băng' : '1 túi'}:</strong> {dinhDangM2(r.bagArea)}</div>
                  {!laMang && <div><strong>Trọng lượng:</strong> {dinhDangSo(r.tareWeight, 2)} gr</div>}
                  <div><strong>Loại {laMang ? 'màng' : 'túi'}:</strong> {chuoiLoaiTui}</div>
                  {laMang && (
                    <div><strong>Cuộn màng TP:</strong> {dinhDangSo(chieuDaiCuonMang)} m/cuộn ({dinhDangSo(r.filmRollArea, 1)} m²/cuộn)</div>
                  )}
                  {numTr > 0 && (
                    <div><strong>Trục in:</strong> D {dinhDangSo(r.cylLength * 1000)} mm x CV {dinhDangSo(r.cylCircum * 1000)} mm - {dinhDangSo(cylPerUnit)} đ/trục * {numTr} trục = {dinhDangSo(cylTotal)} đ</div>
                  )}
                </div>
              </div>
            </div>

            <div className="chot-gia-row">
              <div className="form-group" style={{flex: 1}}>
                <label className="form-label">Giá bán chốt (đ/{nhanDonVi})</label>
                <input
                  className="form-input"
                  placeholder="Nhập giá chốt..."
                  style={{borderColor: 'var(--green)'}}
                  value={giaChotHienTai > 0 ? String(Math.round(giaChotHienTai)) : ''}
                  onChange={(e) => datGiaChotHienTai(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                />
              </div>
              <div className="form-group" style={{flex: 1.5, opacity: hasChotGia ? 1 : 0.5, pointerEvents: hasChotGia ? 'auto' : 'none'}}>
                <label className="form-label" style={{whiteSpace:'nowrap'}}>Phân bổ chênh lệch {hasChotGia ? `(${diff >= 0 ? '+' : ''}${dinhDangSo(diff, 1)}đ/${nhanDonVi})` : ''}</label>
                <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                  <span style={{fontSize:'0.78rem', whiteSpace:'nowrap'}}>Công ty</span>
                  <input
                    className="form-input"
                    type="number"
                    step="any"
                    style={{flex: 1, textAlign:'right', minWidth:0}}
                    value={+(phanBoCongTy).toFixed(1)}
                    onChange={(e) => { datPhanBoCongTy(Number(e.target.value) || 0) }}
                    disabled={hasChotGia && diff < 0 && effCommissionPerUnit <= 0}
                    placeholder={donViPhanBo === 'percent' ? '100' : '0'}
                  />
                  <span style={{fontSize:'0.78rem', whiteSpace:'nowrap'}}>Hoa hồng</span>
                  <input
                    className="form-input"
                    type="number"
                    step="any"
                    readOnly
                    style={{flex: 1, textAlign:'right', minWidth:0, background:'var(--surface2)', color:'var(--muted)'}}
                    value={hienThiPhanBoChotGia.hoaHongDisplay}
                  />
                  <select
                    className="form-input"
                    style={{width:'62px', padding:'6px 2px', flexShrink:0}}
                    value={donViPhanBo}
                    onChange={(e) => {
                      const next = e.target.value as 'vnd' | 'percent';
                      if (hasChotGia && diff !== 0) {
                          datPhanBoCongTy(next === 'percent'
                            ? Math.abs(diff) > 0 ? +(phanBoCongTy / Math.abs(diff) * 100).toFixed(1) : 0
                            : +(phanBoCongTy * Math.abs(diff) / 100).toFixed(1));
                        }
                      datDonViPhanBo(next);
                    }}
                  >
                    <option value="vnd">VNĐ</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
              {loadedItem ? (
                <>
                  <button
                    className="btn btn-sm btn-green"
                    style={{marginBottom: 0, height: '40px'}}
                    title="Cập nhật bảng tính giá hiện tại"
                    onClick={() => {
                      if (!(input.productName || '').trim()) {
                        alert('Vui lòng nhập tên sản phẩm trước khi lưu.');
                        return;
                      }
                      if (!kiemTraKhachHangQuyen()) return;
                      capNhatVaoLichSu();
                      const h = dungCuaHangTinhGia.getState().history.find(x => x.id === loadedHistoryId);
                      void syncPricingSheetToServer(h, isAuthenticated, accessToken);
                      const container = document.getElementById('toastContainer');
                      if (!container) return;
                      const toast = document.createElement('div');
                      toast.className = 'toast toast-clickable';
                      toast.innerHTML = '🔄 Đã cập nhật bảng tính giá! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>';
                      toast.addEventListener('click', () => { datPhan('history_db'); toast.remove(); });
                      container.appendChild(toast);
                      setTimeout(() => toast.remove(), 5000);
                    }}
                  >
                    🔄 Cập nhật
                  </button>
                  <button
                    className="btn btn-sm btn-accent"
                    style={{marginBottom: 0, height: '40px'}}
                    title="Tạo bảng tính giá mới"
                    onClick={() => {
                      if (!(input.productName || '').trim()) {
                        alert('Vui lòng nhập tên sản phẩm trước khi lưu.');
                        return;
                      }
                      if (!kiemTraKhachHangQuyen()) return;
                      themVaoLichSu();
                      const newId = dungCuaHangTinhGia.getState().loadedHistoryId;
                      const h = dungCuaHangTinhGia.getState().history.find(x => x.id === newId);
                      void syncPricingSheetToServer(h, isAuthenticated, accessToken);
                      const container = document.getElementById('toastContainer');
                      if (!container) return;
                      const toast = document.createElement('div');
                      toast.className = 'toast toast-clickable';
                      toast.innerHTML = '💾 Đã lưu báo giá mới! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>';
                      toast.addEventListener('click', () => { datPhan('history_db'); toast.remove(); });
                      container.appendChild(toast);
                      setTimeout(() => toast.remove(), 5000);
                    }}
                  >
                    📄 Lưu mới
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-sm btn-accent"
                  style={{marginBottom: 0, height: '40px'}}
                  title="Lưu bảng tính này vào lịch sử báo giá"
                  onClick={() => {
                    if (!(input.productName || '').trim()) {
                      alert('Vui lòng nhập tên sản phẩm trước khi lưu.');
                      return;
                    }
                    if (!kiemTraKhachHangQuyen()) return;
                    themVaoLichSu();
                    const newId = dungCuaHangTinhGia.getState().loadedHistoryId;
                    const h = dungCuaHangTinhGia.getState().history.find(x => x.id === newId);
                    void syncPricingSheetToServer(h, isAuthenticated, accessToken);
                    const container = document.getElementById('toastContainer');
                    if (!container) return;
                    const toast = document.createElement('div');
                    toast.className = 'toast toast-clickable';
                    toast.innerHTML = '💾 Đã lưu báo giá! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>';
                    toast.addEventListener('click', () => { datPhan('history_db'); toast.remove(); });
                    container.appendChild(toast);
                    setTimeout(() => toast.remove(), 5000);
                  }}
                >
                  💾 Lưu báo giá
                </button>
              )}
            </div>
            <div id="chotAnalysis">
              {hasChotGia ? (
                <div className={`chot-analysis ${diff >= 0 ? 'positive' : 'negative'}`}>
                  <div className="chot-row">
                    <span className="chot-label">{diff >= 0 ? '✅' : '⚠️'} Chênh lệch / {nhanDonVi}</span>
                    <span className="chot-value">{diff >= 0 ? '+' : ''}{dinhDangSo(diff, 1)} đ/{nhanDonVi}</span>
                  </div>
                  <div className="chot-row" style={{fontSize:'0.82rem', color:'var(--muted)'}}>
                    <span className="chot-label">
                      {donViPhanBo === 'percent'
                        ? <>↳ Công ty: {dinhDangSo(hienThiPhanBoChotGia.congTyDisplay, 1)}% = {dinhDangSo(hienThiPhanBoChotGia.congTyAmount, 1)}đ | Hoa hồng: {dinhDangSo(hienThiPhanBoChotGia.hoaHongDisplay, 1)}% = {dinhDangSo(hienThiPhanBoChotGia.hoaHongAmount, 1)}đ</>
                        : <>↳ Công ty: {dinhDangSo(hienThiPhanBoChotGia.congTyAmount, 1)}đ | Hoa hồng: {dinhDangSo(hoaHongAllocation, 1)}đ</>}
                    </span>
                  </div>
                  <div className="chot-row" style={{fontWeight:700}}>
                    <span className="chot-label">Doanh thu tổng</span>
                    <span className="chot-value">{dinhDangSo(shownPrice)} đ/{nhanDonVi} × {dinhDangSo(dauVaoKq.quantity)} {nhanDonVi} = {dinhDangSo(doanhThuChot)} đ</span>
                  </div>
                  <div className="chot-row">
                    <span className="chot-label">LN công ty ({dinhDangPhanTram(pctLoiNhuanCongTyChot)})</span>
                    <span className="chot-value">{dinhDangSo(loiNhuanCongTyChot)} đ</span>
                  </div>
                  <div className="chot-row">
                    <span className="chot-label">% Hoa hồng ({dinhDangPhanTram(commissionPctShown)})</span>
                    <span className="chot-value">{dinhDangSo(tongHoaHongChot)} đ</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{height: '14px'}}></div>

            <div className="stat-grid" id="s-stats">
              <div className="stat-card green" style={{position: 'relative'}}>
                <div className="stat-label">{hienThiGia.profitLabel}</div>
                <div className="stat-value" style={{fontSize: '1.15rem'}}>
                  {dinhDangSo(tienLoiNhuanHieuLuc)}đ <span style={{fontSize: '0.85rem'}}>({dinhDangPhanTram(tyLeLoiNhuanHieuLuc)})</span>
                </div>
              </div>
              <div className="stat-card cyan">
                <div className="stat-label">Doanh thu</div>
                <div className="stat-value">{dinhDangSo(r.finalPrice * dauVaoKq.quantity)} đ</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-label">{hienThiGia.salePriceTitle}</div>
                <div className="stat-value">{dinhDangSo(effFinalPriceWithComm, 0)} đ</div>
              </div>
              <div className="stat-card pink">
                <div className="stat-label">Hoa hồng</div>
                <div className="stat-value" style={{fontSize: '1.15rem'}}>
                  {dinhDangSo(totalCommission)} đ
                  <div style={{fontSize:'0.85rem', fontWeight:'normal', marginTop:'4px'}}>
                    {dinhDangSo(effCommissionPerUnit, 1)} đ/{nhanDonVi} ({dinhDangPhanTram(commissionPct)})
                  </div>
                </div>
              </div>
            </div>

            {/* Chi tiết giá bán đề xuất */}
            <TheThuGon
              resetKey={khoaKetQua}
              style={{marginBottom: '14px'}}
              title={<><span className="icon">💰</span> Chi tiết giá {hasChotGia ? 'chốt' : 'đề xuất'} / {nhanDonVi}</>}
            >
              <ul className="breakdown-list" id="s-breakdown">
                {breakdownItems.map(([l, v], i) => (
                  <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
                ))}
                <li className="bl-total">
                  <span className="bl-label" style={{color:'var(--orange)'}}>GIÁ BÁN ĐỀ XUẤT / {nhanDonVi.toUpperCase()}</span>
                  <span className="bl-value" style={{color:'var(--orange)'}}>{dinhDangSo(effFinalPriceWithComm, 0)} đ</span>
                </li>
                {hasChotGia && (
                  <li className="bl-total" style={{borderTop: '1px dashed var(--border)', marginTop: '6px', paddingTop: '8px'}}>
                    <span className="bl-label" style={{color:'var(--green)'}}>GIÁ BÁN CHỐT / {nhanDonVi.toUpperCase()}</span>
                    <span className="bl-value" style={{color:'var(--green)'}}>
                      {dinhDangSo(chotGiaNum, 0)} đ
                      <span style={{fontSize:'0.75em', fontWeight:400, marginLeft:'8px', color: diff >= 0 ? 'var(--green)' : 'var(--red)'}}>
                        ({diff >= 0 ? '+' : ''}{dinhDangSo(diff, 0)} đ)
                      </span>
                    </span>
                  </li>
                )}
              </ul>
            </TheThuGon>
          </div>

          {/* ═══ SECTION: Đặc tả kỹ thuật & nguyên liệu ═══ */}
          <div id="sect-tech" className="manager-section-anchor"></div>
          <TheThuGon
            resetKey={khoaKetQua}
            style={{marginBottom: '14px'}}
            title={<><span className="icon">🏭</span> Đặc tả kỹ thuật &amp; nguyên liệu</>}
          >
            <div className="table-responsive">
              <table className="data-table" id="m-t-unified-table">
                <thead>
                  <tr>
                    <th>Công đoạn</th><th>Vật liệu</th>
                    <th className="num">Kho vao (m)</th><th className="num">Thanh pham (m)</th><th className="num">Phi hao</th><th className="num">Dau vao VL</th>
                    <th className="num">CPSX (đ/m²)</th><th className="num">Thành tiền CPSX</th>
                    <th className="num">CP vật liệu (đ/m²)</th><th className="num">Thành tiền CPVL</th>
                  </tr>
                </thead>
                <tbody>
                  {cacDongSanXuat.map((row, idx) => {
                    const dWidth = row.width;
                    const dMeters = row.meters;
                    const dWaste = row.waste;
                    const inputVL = dMeters + dWaste;

                    if (row.materialDetails?.length) {
                      const totalDetailWidth = row.materialDetails.reduce((sum, detail) => sum + detail.width, 0) || row.width;
                      const rowSpan = row.materialDetails.length;
                      return row.materialDetails.map((detail, detailIdx) => {
                        const detailCostCPSX = row.costCPSX * detail.width / totalDetailWidth;
                        return (
                          <tr key={`${idx}-${detailIdx}`} className="detail-group-row">
                            {detailIdx === 0 && <td data-label="Công đoạn" rowSpan={rowSpan}>{row.stage}</td>}
                            <td data-label="Vật liệu">{detail.name}</td>
                            <td className="num" data-label="Kho vao (m)">{dinhDangSo(detail.width, 3)}</td>
                            <td className="num" data-label="Thành phẩm (m)">{dinhDangSo(dMeters, 0)}</td>
                            <td className="num" data-label="Phi hao">{dinhDangSo(dWaste, 0)}</td>
                            <td className="num highlight" data-label="Đầu vào VL">{dinhDangSo(inputVL, 0)}</td>
                            <td className="num" data-label="CPSX (đ/m²)">{dinhDangSo(row.cpsx, 0)}</td>
                            <td className="num" data-label="Thành tiền CPSX">{dinhDangSo(detailCostCPSX, 0)}</td>
                            <td className="num" data-label="CP vật liệu (đ/m²)">{dinhDangSo(detail.matPrice, 1)}</td>
                            <td className="num" data-label="Thành tiền CPVL">{dinhDangSo(detail.costMat, 0)}</td>
                          </tr>
                        );
                      });
                    }

                    return (
                      <tr key={idx}>
                        <td data-label="Công đoạn">{row.stage}</td>
                        <td data-label="Vật liệu">{row.mat}</td>
                        <td className="num" data-label="Kho vao (m)">{dinhDangSo(dWidth, 3)}</td>
                        <td className="num" data-label="Thành phẩm (m)">{dinhDangSo(dMeters, 0)}</td>
                        <td className="num" data-label="Phi hao">{dinhDangSo(dWaste, 0)}</td>
                        <td className="num highlight" data-label="Đầu vào VL">{dinhDangSo(inputVL, 0)}</td>
                        <td className="num" data-label="CPSX (đ/m²)">{dinhDangSo(row.cpsx, 0)}</td>
                        <td className="num" data-label="Thành tiền CPSX">{dinhDangSo(row.costCPSX, 0)}</td>
                        <td className="num" data-label="CP vật liệu (đ/m²)">{row.matPrice != null ? dinhDangSo(row.matPrice, 1) : '—'}</td>
                        <td className="num" data-label="Thành tiền CPVL">{row.costMat != null ? dinhDangSo(row.costMat, 0) : '—'}</td>
                      </tr>
                    );
                  })}
                  {laMangIn && cpTheoThoiGianIn > 0 && (
                    <tr className="total-row">
                      <td colSpan={9}>CP theo thời gian in</td>
                      <td className="num">{dinhDangSo(cpTheoThoiGianIn, 0)} đ</td>
                    </tr>
                  )}
                  <tr className="total-row" style={{fontSize: '1.05em'}}>
                    <td colSpan={7}><strong>TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN</strong></td>
                    <td colSpan={3} className="num" style={{color: 'var(--accent)', fontWeight: 800}}>{dinhDangSo(tongCong, 0)} đ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TheThuGon>

          {/* ═══ SECTION: Override Tables (tabbed) ═══ */}
          {(() => {
            const loadedItem = loadedHistoryId ? lichSu.find(h => h.id === loadedHistoryId) : null;
            const nguoiDungHienTai = dungCuaHangTinhGia.getState().nguoiDungHienTai;
            const policies = nguoiDungHienTai?.policies ?? [];
            const coQuyenAdvisor = coQuyenCoVanBangTinh(policies);
            const canSaleEdit = !coQuyenAdvisor;
            const canAdminEdit = coQuyenAdvisor;

            const handleSave = (idLichSu: string) => {
              luuGhiDe(idLichSu);
              hienToastLuuGhiDe();
              const h = dungCuaHangTinhGia.getState().history.find(x => x.id === idLichSu);
              void syncPricingSheetToServer(h, isAuthenticated, accessToken);
            };

            const handleSaveNew = () => {
              if (!kiemTraKhachHangQuyen()) return;
              themVaoLichSu();
              const newId = dungCuaHangTinhGia.getState().loadedHistoryId;
              if (newId) {
                luuGhiDe(newId);
                hienToastLuuGhiDe();
                const h = dungCuaHangTinhGia.getState().history.find(x => x.id === newId);
                void syncPricingSheetToServer(h, isAuthenticated, accessToken);
              }
            };
            const emptyOv: OverrideTable = {};
            const saleCoThayDoi = countOverrideChanges(ghiDeSale) > 0;
            const adminCoThayDoi = countOverrideChanges(ghiDeAdmin) > 0;

            const renderSaleTable = () => (
              <BangGhiDe
                title="Thay đổi từ Sale"
                lopMau="sale"
                cacDongSanXuat={cacDongSanXuat}
                ghiDeNguon={emptyOv}
                ghiDeHienTai={ghiDeSale}
                chenhLechGiaGocDonVi={giaSauGhiDeSaleDonVi - r.finalPrice}
                donViChenhLech={donViChenhLechGia}
                duocSua={canSaleEdit}
                khiDat={datGhiDeSale}
                khiLuu={handleSave}
                khiLuuMoi={handleSaveNew}
                loadedHistoryId={loadedHistoryId}
                materials={materials}
                giaDaThayDoiDonVi={giaSauGhiDeSaleDonVi}
                effTotalProdCost={tongCPSXSale}
                profitRatePct={saleProfitRatePct}
                defaultProfitRatePct={saleDefaultPct}
                khiDatProfitRate={datSaleProfitRatePct}
                soLuong={dauVaoKq.quantity}
              />
            );

            const renderAdminTable = () => (
              <BangGhiDe
                title="Thay đổi từ Admin"
                lopMau="admin"
                cacDongSanXuat={cacDongSanXuat}
                ghiDeNguon={emptyOv}
                ghiDeHienTai={ghiDeAdmin}
                chenhLechGiaGocDonVi={giaSauGhiDeAdminDonVi - r.finalPrice}
                donViChenhLech={donViChenhLechGia}
                duocSua={canAdminEdit}
                khiDat={datGhiDeAdmin}
                khiLuu={handleSave}
                khiLuuMoi={handleSaveNew}
                loadedHistoryId={loadedHistoryId}
                materials={materials}
                giaDaThayDoiDonVi={giaSauGhiDeAdminDonVi}
                effTotalProdCost={tongCPSXAdmin}
                profitRatePct={adminProfitRatePct}
                defaultProfitRatePct={adminDefaultPct}
                khiDatProfitRate={datAdminProfitRatePct}
                soLuong={dauVaoKq.quantity}
              />
            );

            return (
              <div className="override-tab-wrapper" style={{marginTop: '14px'}}>
                <div className="override-tab-bar">
                  <button
                    className={`override-tab ${tabDangMo === 'sale' ? 'active' : ''}`}
                    onClick={() => datTabDangMo('sale')}
                  >
                    💼 Sale{saleCoThayDoi ? ' ●' : ''}
                  </button>
                  <button
                    className={`override-tab ${tabDangMo === 'admin' ? 'active' : ''}`}
                    onClick={() => datTabDangMo('admin')}
                  >
                    👑 Admin{adminCoThayDoi ? ' ●' : ''}
                  </button>
                </div>
                {tabDangMo === 'sale' ? renderSaleTable() : renderAdminTable()}
              </div>
            );
          })()}

          {/* ═══ SECTION: Bảng giá theo số lượng (MOQ) ═══ */}
          <div id="sect-moq" className="manager-section-anchor"></div>
          <TheThuGon
            resetKey={khoaKetQua}
            style={{marginBottom: '14px', marginTop: '14px'}}
            title={<><span className="icon">📦</span> Bảng giá theo số lượng (MOQ)</>}
          >
            <div className="info-box">
              <span className="icon">💡</span>
              So sánh giá khi thay đổi số lượng đặt hàng. Dòng tô sáng là số lượng hiện tại.
            </div>
            <div className="table-responsive">
              <table className="moq-table" id="moq-table">
                <thead>
                  <tr>
                    <th>Số lượng</th><th>LN %</th><th>Giá vốn+LN/{nhanDonVi}</th><th>Giá đề xuất</th><th>Tổng DT</th>
                    {matCols.map((col, i) => <th key={i}>{col.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {moqResults.map(({qty, res, isCurrent}) => {
                    if (!res) return null;
                    return (
                      <tr key={qty} className={isCurrent ? 'moq-highlight' : ''}>
                        <td data-label="Số lượng" style={{fontWeight: isCurrent ? 700 : 400}}>{dinhDangSo(qty)}</td>
                        <td data-label="LN %">{dinhDangPhanTram(res.profitRate)}</td>
                        <td data-label="Giá vốn+LN">{dinhDangSo(res.costPerUnit, 1)}</td>
                        <td data-label="Giá đề xuất" style={{fontWeight:700, color: isCurrent ? 'var(--accent)' : 'inherit'}}>{dinhDangSo(res.finalPrice, 0)}</td>
                        <td data-label="Tổng DT">{dinhDangSo(res.finalPrice * qty / 1000000, 2)}tr</td>
                        {matCols.map((col, ci) => {
                          const layerData = getLayerData(res, col);
                          const layerMetersTotal = layerData ? (layerData.meters + layerData.waste) : 0;
                          const kgTotal = calcKgForLayer(layerData, layerMetersTotal);
                          return (
                            <td key={ci} data-label={col.name}>
                              {!layerData?.chiTietVatLieu?.length && (
                                <>
                                  {dinhDangSo(layerMetersTotal, 0)} m<br/>
                                  <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({dinhDangSo(kgTotal, 1)} kg)</span>
                                </>
                              )}
                              {renderMaterialBreakdown(layerData, layerMetersTotal)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TheThuGon>

          {/* ═══ SECTION: Số lượng theo cuộn màng (Roll MOQ) ═══ */}
          <div id="sect-roll" className="manager-section-anchor"></div>
          <TheThuGon
            resetKey={khoaKetQua}
            style={{marginBottom: '14px'}}
            title={<><span className="icon">🎞️</span> SỐ LƯỢNG THEO CUỘN MÀNG</>}
          >
            <div className="info-box">
              <span className="icon">💡</span>
              {laMang
                ? 'Số lượng theo cuộn màng thành phẩm: SL = số cuộn × khổ TP × chiều dài cuộn TP.'
                : 'Số lượng tối ưu theo cuộn màng tiêu chuẩn của lớp in. Giúp đặt hàng khớp cuộn, giảm hao hụt.'}
            </div>
            <div className="table-responsive">
              <table className="moq-table" id="moq-roll-table">
                <tbody>
                  {!selectedCol || !selectedData || !selectedMat ? (
                    <tr>
                      <td colSpan={5} style={{textAlign:'center', color:'var(--muted)', padding:'20px'}}>Không có lớp màng phù hợp để tính MOQ cuộn</td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <th>
                          <select
                            className="form-select"
                            value={getRollColId(selectedCol)}
                            onChange={(e) => datVatLieuCuonDangChon(e.target.value)}
                            style={{fontWeight:700, color:'var(--accent)', border:'1.5px solid var(--accent)', padding:'4px 24px 4px 8px', borderRadius:'6px', cursor:'pointer', background:'transparent', display:'inline-block', fontSize:'0.85rem', margin:0, textTransform:'uppercase'}}
                          >
                            {rollOptions.map((c, i) => {
                              const colIsKg = c.fullName.toUpperCase().includes('LLDPE') || c.fullName.toUpperCase() === 'PE';
                              return (
                                <option key={i} value={getRollColId(c)}>
                                  {c.name} {colIsKg ? '(KG)' : '(CUỘN)'}
                                </option>
                              );
                            })}
                          </select>
                        </th>
                        {laMang ? (
                          <>
                            <th>Mét dài TP</th>
                            <th>Diện tích tính giá (m²)</th>
                          </>
                        ) : (
                          <th>SL {nhanDonVi}</th>
                        )}
                        {otherLayers.map((c, i) => <th key={i}>{c.name}</th>)}
                        <th>Giá đề xuất</th>
                        <th>Tổng DT</th>
                      </tr>
                      {rollRows.map((row: any, idx: number) => (
                        <tr key={idx} className={row.isCurrent ? 'moq-highlight' : ''}>
                          <td data-label={isKgBase ? 'Khối lượng (kg)' : 'Chỉ số Cuộn'}>
                            {isKgBase ? (
                              <>
                                <span style={{fontWeight:700}}>{dinhDangSo(row.levelVal)} kg</span><br />
                                <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({dinhDangSo(row.availableMeters, 0)} m)</span>
                              </>
                            ) : (
                              <>
                                <span style={{fontWeight:700}}>{row.levelVal} cuộn</span><br />
                                <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>
                                  {laMang
                                    ? `${dinhDangSo(row.availableMeters, 0)}m × ${dinhDangSo(dauVaoKq.spreadWidth, 3)}m = ${dinhDangSo(row.estQty, 0)} m²`
                                    : `(${dinhDangSo(row.availableMeters, 0)}m - ${dinhDangSo(row.selectedKg, 1)} kg)`}
                                </span>
                                {selectedData?.chiTietVatLieu?.length && renderMaterialBreakdown(selectedData, row.availableMeters)}
                              </>
                            )}
                          </td>
                          {laMang ? (
                            <>
                              <td data-label="Mét dài TP" style={{fontWeight: row.isCurrent ? 700 : 400}}>{dinhDangSo(row.availableMeters, 0)} m</td>
                              <td data-label="Diện tích tính giá" style={{fontWeight: row.isCurrent ? 700 : 400}}>
                                {dinhDangSo(row.areaM2, 0)} m²
                                <br />
                                <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>
                                  {dinhDangSo(row.availableMeters, 0)}m × {dinhDangSo(dauVaoKq.spreadWidth, 3)}m
                                </span>
                              </td>
                            </>
                          ) : (
                            <td data-label={`SL ${nhanDonVi}`} style={{fontWeight: row.isCurrent ? 700 : 400}}>{dinhDangSo(row.estQty)}</td>
                          )}
                          {otherLayers.map((col: any, i: number) => {
                            const layerData = getLayerData(row.res, col);
                            const layerMetersTotal = layerData ? (layerData.meters + layerData.waste) : 0;
                            const kgTotal = calcKgForLayer(layerData, layerMetersTotal);
                            return (
                              <td data-label={col.name} key={i}>
                                {!layerData?.chiTietVatLieu?.length && (
                                  <>
                                    {dinhDangSo(layerMetersTotal, 0)} m<br />
                                    <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({dinhDangSo(kgTotal, 1)} kg)</span>
                                  </>
                                )}
                                {renderMaterialBreakdown(layerData, layerMetersTotal)}
                              </td>
                            );
                          })}
                          <td data-label="Giá đề xuất" style={{fontWeight:700, color: row.isCurrent ? 'var(--accent)' : 'inherit'}}>{dinhDangSo(row.res.finalPrice, 0)}</td>
                          <td data-label="Tổng DT">{dinhDangSo(row.res.finalPrice * row.estQty / 1000000, 2)}tr</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </TheThuGon>

          {/* ═══ SECTION: Trọng lượng & Vận chuyển ═══ */}
          <div id="sect-weight" className="manager-section-anchor"></div>
          <TheThuGon
            resetKey={khoaKetQua}
            style={{marginTop: '14px'}}
            title={<><span className="icon">⚖️</span> Trọng lượng &amp; Vận chuyển</>}
          >
            <ul className="breakdown-list" id="m-t-weight">
              {weightItems.map(([l, v], i) => (
                <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
              ))}
            </ul>
          </TheThuGon>
        </div> {/* End manager-content */}

      </div> {/* End manager-layout */}
    </div>
  );
}
