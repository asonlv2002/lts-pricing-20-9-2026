"use client";
import React, { useState } from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { lapDongSanXuat, tinhGiaHieuLuc, xuLyDongGhiDe, type UniRow } from '../lib/manager-calculation';
import { chuanBiUniRowsNangCao, lapDongVatLieuNangCao, lapDongNhanCongDien, tinhTongNangCao, tinhKetQuaNangCaoHieuLuc } from '../lib/dac-ta-nang-cao';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import { TECHNICAL_TABLE_MOBILE_LABELS as MOBILE_LABELS } from '../lib/technical-table-mobile-labels';
import { buildNangCaoSpecFromPricing, type LsxNangCaoRow } from '../lib/lsx-nang-cao';
import type { AppConstants, CalculateResult, Material, OverrideRowKey, OverrideFields, OverrideTable, HistoryItem } from '../lib/types';
import { kiemTraMaKhachHang, laKhachHangThuocQuyen, type KhachHangCoTen } from '../lib/customer-api';
import { coQuyenCoVanBangTinh, coQuyenQuanLyKhachHang, cotBang2TheoQuyen, type PolicyCode } from '../lib/permissions';import { 
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
import { tinhNhapPhanBoChotGia } from '../lib/chot-gia-allocation';
import { tinhGiaDeXuatHienThi } from '../lib/gia-de-xuat-hien-thi';
import { tinhGiaThuongMai, type KetQuaThuongMai } from '../lib/engine';
import { timMucLichSuTheoId } from '../lib/history-identity';
import { dieuHuongModuleApp } from '../lib/menu-route';
import { apCpsxNangCaoVaoHangSo, trichCpsxNangCao } from '../lib/cpsx-nang-cao-pin';
import { exportPricingDetailToA4 } from '../lib/pricing-detail-export';
import BangDacTaNangCao from './BangDacTaNangCao';

// ── Collapsible card dùng trong phần kết quả ────────────────────────────────
// Mặc định đóng. resetKey đổi → đóng lại (trừ khi giuTrangThaiKhiReset).
function TheThuGon({
  title: tieuDe,
  children,
  resetKey,
  style,
  giuTrangThaiKhiReset = false,
  moDinh = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  resetKey: string | number;
  style?: React.CSSProperties;
  /** true = không ép đóng khi kết quả tính lại (user giữ trạng thái mở/đóng) */
  giuTrangThaiKhiReset?: boolean;
  /** true = khởi tạo ở trạng thái mở */
  moDinh?: boolean;
}) {
  const [mo, datMo] = useState(moDinh);
  React.useEffect(() => {
    if (!giuTrangThaiKhiReset) datMo(false);
  }, [resetKey, giuTrangThaiKhiReset]);

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
/** Label Chia "30.400\n(0,300)" → 2 dòng UI */
function HienThiMetKho({ label }: { label: string }) {
  const i = label.indexOf('\n');
  if (i < 0) return <>{label}</>;
  return (
    <span className="dac-ta-met-kho">
      <span className="dac-ta-met-kho__met">{label.slice(0, i)}</span>
      <span className="dac-ta-met-kho__kho">{label.slice(i + 1)}</span>
    </span>
  );
}
function dinhDangVND(n: number) { return dinhDangSo(n) + ' đ'; }
function dinhDangPhanTram(n: number) {
  const val = n * 100;
  return parseFloat(val.toFixed(2)) + '%';
}
function dinhDangM2(n: number) { return dinhDangSo(n, 4) + ' m²'; }

function oSoGc(
  noiDung: React.ReactNode,
  danhDau: boolean,
  opts?: { className?: string; dataLabel?: string },
): React.ReactElement {
  const cls = ['num', opts?.className, danhDau ? 'gc-cell' : ''].filter(Boolean).join(' ');
  return (
    <td className={cls} data-label={opts?.dataLabel}>
      {danhDau ? <span className="gc-cell__dot" title="Gia công" aria-label="Gia công" /> : null}
      {noiDung}
    </td>
  );
}


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
function OCoTheGhiDe({ khoaDong, truong, giaTriGoc, giaTriGhiDe, duocSua, khiDat, soLe = 0, onAfterSet, inline = false, hienThiTuyChinh, laGiaCong = false }: {
  khoaDong: OverrideRowKey;
  truong: keyof OverrideFields;
  giaTriGoc: number;
  giaTriGhiDe: number | undefined;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  soLe?: number;
  onAfterSet?: (value: number | undefined) => void;
  /** true = chỉ nội dung (không bọc <td>) — dùng khi gộp nhiều ô trong 1 cell */
  inline?: boolean;
  /** Format hiển thị thay cho dinhDangSo (vd. "(40.000/kg)") */
  hienThiTuyChinh?: (n: number) => string;
  /** Gia công ngoài — chấm đỏ góc ô (giống bảng gốc) */
  laGiaCong?: boolean;
}) {
  const giaTriHienThi = giaTriGhiDe ?? giaTriGoc;
  const daThayDoi = giaTriGhiDe !== undefined && Math.abs(giaTriGhiDe - giaTriGoc) > 0.001;
  const [dangSua, datDangSua] = React.useState(false);
  const [giaTriTam, datGiaTriTam] = React.useState('');
  const chuHienThi = hienThiTuyChinh
    ? hienThiTuyChinh(giaTriHienThi)
    : dinhDangSo(giaTriHienThi, soLe);
  const chamGc = laGiaCong
    ? <span className="gc-cell__dot" title="Gia công" aria-label="Gia công" />
    : null;

  const xacNhan = () => {
    datDangSua(false);
    const soDaDoc = parseFloat(giaTriTam);
    if (isNaN(soDaDoc) || soDaDoc < 0 || Math.abs(soDaDoc - giaTriGoc) < 0.001) {
      khiDat(khoaDong, truong, undefined);
      onAfterSet?.(undefined);
    } else {
      khiDat(khoaDong, truong, soDaDoc);
      onAfterSet?.(soDaDoc);
    }
  };

  const noiDung = !duocSua ? (
    <span className={daThayDoi ? 'override-changed' : undefined}
      title={daThayDoi ? `Gốc: ${hienThiTuyChinh ? hienThiTuyChinh(giaTriGoc) : dinhDangSo(giaTriGoc, soLe)}` : undefined}>
      {chuHienThi}
    </span>
  ) : dangSua ? (
    <input className="override-input" type="number" step="any"
      value={giaTriTam}
      onChange={e => datGiaTriTam(e.target.value)}
      onBlur={xacNhan}
      onKeyDown={e => { if (e.key === 'Enter') xacNhan(); if (e.key === 'Escape') datDangSua(false); }}
      autoFocus />
  ) : (
    <span className="override-display"
      onClick={() => { datGiaTriTam(String(Math.round(giaTriHienThi * 10000) / 10000)); datDangSua(true); }}>
      {chuHienThi}
      <span className="override-indicator"> ✎</span>
    </span>
  );

  if (inline) return noiDung;

  if (!duocSua) {
    return (
      <td className={`num ${daThayDoi ? 'override-changed' : ''} ${laGiaCong ? 'gc-cell' : ''}`}
          title={daThayDoi ? `Gốc: ${dinhDangSo(giaTriGoc, soLe)}` : undefined}
          data-label={truong}>
        {chamGc}
        {chuHienThi}
      </td>
    );
  }

  return (
    <td className={`num override-cell ${daThayDoi ? 'override-changed' : ''} ${laGiaCong ? 'gc-cell' : ''}`}
        title={daThayDoi ? `Gốc: ${dinhDangSo(giaTriGoc, soLe)}` : undefined}
        data-label={truong}>
      {chamGc}
      {noiDung}
    </td>
  );
}


function datGhiDeChiTiet(
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void,
  ghiDeHienTai: OverrideTable,
  khoaDong: OverrideRowKey,
  chiTietIndex: number,
  truong: 'width' | 'matPrice' | 'rawMatPrice' | 'materialId' | 'materialName',
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


function OChiTietCoTheGhiDe({ khoaDong, chiTietIndex, truong, giaTriGoc, giaTriGhiDe, duocSua, khiDat, ghiDeHienTai, soLe = 0, onAfterSet }: {
  khoaDong: OverrideRowKey;
  chiTietIndex: number;
  truong: 'width' | 'matPrice' | 'rawMatPrice';
  giaTriGoc: number;
  giaTriGhiDe: number | undefined;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  ghiDeHienTai: OverrideTable;
  soLe?: number;
  onAfterSet?: (value: number | undefined) => void;
}) {
  const giaTriHienThi = giaTriGhiDe ?? giaTriGoc;
  const daThayDoi = giaTriGhiDe !== undefined && Math.abs(giaTriGhiDe - giaTriGoc) > 0.001;
  const [dangSua, datDangSua] = React.useState(false);
  const [giaTriTam, datGiaTriTam] = React.useState('');
  const xacNhan = () => {
    datDangSua(false);
    const soDaDoc = parseFloat(giaTriTam);
    const resolved = isNaN(soDaDoc) || soDaDoc < 0 || Math.abs(soDaDoc - giaTriGoc) < 0.001 ? undefined : soDaDoc;
    datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, truong, resolved);
    onAfterSet?.(resolved);
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

function OChonVatLieuChiTiet({ khoaDong, chiTietIndex, giaTriGoc, giaTriGhiDe, duocSua, khiDat, ghiDeHienTai, materials, engineParams }: {
  khoaDong: OverrideRowKey;
  chiTietIndex: number;
  giaTriGoc: { id?: string; name: string; matPrice: number };
  giaTriGhiDe: { materialId?: string; materialName?: string; matPrice?: number } | undefined;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  ghiDeHienTai: OverrideTable;
  materials: Material[];
  engineParams?: { numColors: number; coverageRatio: number; metallicSurcharge: number; laborCost: number; isPrintFilm: boolean; printFilmInkBOPP: number; printFilmInkOther: number };
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
          datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'rawMatPrice', undefined);
          if (khoaDong === 'print') khiDat(khoaDong, 'cpsx', undefined);
          return;
        }
        const giaM2 = mat.pricePerM2 ?? (mat.pricePerKg * mat.thickness * mat.density / 1000);
        datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'materialId', mat.id);
        datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'materialName', mat.name);
        datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'matPrice', giaM2);
        datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'rawMatPrice', mat.pricePerKg);
        if (khoaDong === 'print' && engineParams && engineParams.numColors > 0) {
          const ep = engineParams;
          if (ep.isPrintFilm) {
            const isBOPP = mat.id.toUpperCase().includes('BOPP') || mat.name.toUpperCase().includes('BOPP');
            const giaMuc = isBOPP ? ep.printFilmInkBOPP : ep.printFilmInkOther;
            khiDat(khoaDong, 'cpsx', ep.numColors * giaMuc + ep.metallicSurcharge);
          } else {
            const giaMuc = mat.inkPricePerColor || (mat.isPETorPA ? 135 : 120);
            khiDat(khoaDong, 'cpsx', ep.numColors * giaMuc * ep.coverageRatio + ep.laborCost + ep.metallicSurcharge);
          }
        }
      }}>
        <option value={giaTriGoc.id ?? ''}>{tenGoc}</option>
        {materials.filter(m => m.id !== giaTriGoc.id).map(m => <option key={m.id} value={m.id}>{formatMaterialOptionLabel(m)}</option>)}
      </select>
    </td>
  );
}

function OChonVatLieuDong({ khoaDong, giaTriGocId, giaTriGocTen, giaTriGocGia, ghiDeHienTai, duocSua, khiDat, materials, engineParams }: {
  khoaDong: OverrideRowKey;
  giaTriGocId?: string;
  giaTriGocTen: string;
  giaTriGocGia: number;
  ghiDeHienTai: OverrideTable;
  duocSua: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  materials: Material[];
  engineParams?: { numColors: number; coverageRatio: number; metallicSurcharge: number; laborCost: number; isPrintFilm: boolean; printFilmInkBOPP: number; printFilmInkOther: number };
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
          khiDat(khoaDong, 'rawMatPrice', undefined);
          if (khoaDong === 'print') khiDat(khoaDong, 'cpsx', undefined);
          return;
        }
        const giaM2 = mat.pricePerM2 ?? (mat.pricePerKg * mat.thickness * mat.density / 1000);
        khiDat(khoaDong, 'materialId', mat.id);
        khiDat(khoaDong, 'mat', mat.name);
        khiDat(khoaDong, 'matPrice', giaM2);
        khiDat(khoaDong, 'rawMatPrice', mat.pricePerKg);
        if (khoaDong === 'print' && engineParams && engineParams.numColors > 0) {
          const ep = engineParams;
          if (ep.isPrintFilm) {
            const isBOPP = mat.id.toUpperCase().includes('BOPP') || mat.name.toUpperCase().includes('BOPP');
            const giaMuc = isBOPP ? ep.printFilmInkBOPP : ep.printFilmInkOther;
            khiDat(khoaDong, 'cpsx', ep.numColors * giaMuc + ep.metallicSurcharge);
          } else {
            const giaMuc = mat.inkPricePerColor || (mat.isPETorPA ? 135 : 120);
            khiDat(khoaDong, 'cpsx', ep.numColors * giaMuc * ep.coverageRatio + ep.laborCost + ep.metallicSurcharge);
          }
        }
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
function BangGhiDe({ title: tieuDe, lopMau, cacDongSanXuat, ghiDeNguon, ghiDeHienTai, chenhLechGiaGocDonVi, donViChenhLech, duocSua, coTheLuu = true, khiDat, khiLuu, khiLuuMoi, loadedHistoryId, materials, giaDaThayDoiDonVi, effTotalProdCost, profitRatePct, defaultProfitRatePct, khiDatProfitRate, soLuong, engineParams, printFilmParams }: {
  title: string;
  lopMau: 'sale' | 'admin';
  cacDongSanXuat: UniRow[];
  ghiDeNguon: OverrideTable;
  ghiDeHienTai: OverrideTable;
  chenhLechGiaGocDonVi?: number;
  donViChenhLech?: 'tui' | 'm2';
  duocSua: boolean;
  coTheLuu?: boolean;
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
  engineParams?: { numColors: number; coverageRatio: number; metallicSurcharge: number; laborCost: number; isPrintFilm: boolean; printFilmInkBOPP: number; printFilmInkOther: number };
  printFilmParams?: { numColors: number; setupMin: number; setupDiv: number; threshold: number; speed: number; laborPerHr: number };
}) {
  const { rows: cacDongDaXuLy, totalCPSX: tongCPSX, totalCPVL: tongCPVL, printFilmCost: cpMangIn } = xuLyDongGhiDe(cacDongSanXuat, ghiDeNguon, ghiDeHienTai, printFilmParams);
  const cpMangInGoc = cacDongSanXuat.find(row => (row.printFilmCost ?? 0) > 0)?.printFilmCost ?? 0;
  const coDoiCpMangIn = Math.abs(cpMangIn - cpMangInGoc) > 0.01;
  const coThayDoi = countOverrideChanges(ghiDeHienTai) > 0 || coDoiCpMangIn;
  const coCpMangIn = cpMangIn > 0;
  const donViChenhLechText = donViChenhLech === 'm2' ? 'ĐỒNG / MÉT VUÔNG' : 'ĐỒNG / TÚI';
  const chenhLechGiaGocLamTron = Math.round(chenhLechGiaGocDonVi ?? 0);
  const chenhLechGiaGocText = `${chenhLechGiaGocLamTron > 0 ? '+' : ''}${dinhDangSo(chenhLechGiaGocLamTron, 0)}`;
  const lopChenhLechGia = chenhLechGiaGocLamTron > 0 ? 'override-price-delta--up' : chenhLechGiaGocLamTron < 0 ? 'override-price-delta--down' : 'override-price-delta--flat';

  const layGiaTriGocRawMat = (matId: string | undefined, matName: string): number => {
    if (matName === '-' || !matName) return 0;
    const m = matId ? materials.find(x => x.id === matId) : materials.find(x => x.name === matName);
    return m?.pricePerKg ?? 0;
  };

  const tinhMatPriceTuRaw = (rawMat: number, matId?: string, matName?: string, rk?: OverrideRowKey, detailIdx?: number) => {
    if (!matName || matName === '-' || rawMat <= 0) return;
    const m = matId ? materials.find(x => x.id === matId) : materials.find(x => x.name === matName);
    if (!m || m.thickness <= 0 || m.density <= 0) return;
    const newMatPrice = rawMat * m.thickness * m.density / 1000;
    if (detailIdx !== undefined && rk) {
      datGhiDeChiTiet(khiDat, ghiDeHienTai, rk, detailIdx, 'matPrice', newMatPrice);
    } else if (rk) {
      khiDat(rk, 'matPrice', newMatPrice);
    }
  };

  // Local string state cho ô "Tỷ lệ LN" — cho phép hiển thị rỗng khi user xóa hết
  const [giaTriTamPct, datGiaTriTamPct] = React.useState<string>('');
  const phanTramHienThi = (() => {
    if (giaTriTamPct !== '') return giaTriTamPct;
    if (profitRatePct > 0) return String(profitRatePct);
    return '0';
  })();
  const xuLyThayDoiPct = (raw: string) => {
    datGiaTriTamPct(raw);
    if (raw === '') { khiDatProfitRate(0); return; }
    const so = Number(raw);
    khiDatProfitRate(Number.isFinite(so) && so >= 0 ? so : 0);
  };
  React.useEffect(() => { datGiaTriTamPct(''); }, [profitRatePct]);

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
              <th className="num" data-mobile-label={MOBILE_LABELS.width}>khổ màng NVL (m)</th><th className="num" data-mobile-label={MOBILE_LABELS.meters}>thành phẩm (m)</th>
              <th className="num" data-mobile-label={MOBILE_LABELS.waste}>phi hao (m)</th><th className="num" data-mobile-label={MOBILE_LABELS.inputMaterial}>đầu vào NVL (m)</th>
              <th className="num" data-mobile-label={MOBILE_LABELS.cpsx}>CPSX (đ/m²)</th><th className="num" data-mobile-label={MOBILE_LABELS.totalCpsx}>Thành tiền CPSX</th>
              <th className="num" data-mobile-label={MOBILE_LABELS.rawMaterialPrice}>Giá NVL (đ/kg)</th>
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
                        giaTriGhiDe={ghiDeHienTaiChiTiet} duocSua={duocSua} khiDat={khiDat} ghiDeHienTai={ghiDeHienTai} materials={materials} engineParams={engineParams} />
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
                      <OChiTietCoTheGhiDe khoaDong={row.rowKey} chiTietIndex={detailIdx} truong="rawMatPrice"
                        giaTriGoc={layGiaTriGocRawMat(
                          ghiDeNguonChiTiet?.materialId ?? chiTietGoc?.materialId,
                          ghiDeNguonChiTiet?.materialName ?? chiTietGoc?.name ?? detail.name,
                        )}
                        giaTriGhiDe={ghiDeHienTaiChiTiet?.rawMatPrice} duocSua={duocSua} khiDat={khiDat} ghiDeHienTai={ghiDeHienTai} soLe={0}
                        onAfterSet={(v) => {
                          if (v !== undefined) {
                            const effId = ghiDeHienTaiChiTiet?.materialId ?? ghiDeNguonChiTiet?.materialId ?? chiTietGoc?.materialId;
                            const effName = ghiDeHienTaiChiTiet?.materialName ?? ghiDeNguonChiTiet?.materialName ?? chiTietGoc?.name ?? detail.name;
                            tinhMatPriceTuRaw(v, effId, effName, row.rowKey, detailIdx);
                          }
                        }} />
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
                  <OChonVatLieuDong khoaDong={row.rowKey} giaTriGocId={ghiDeNguon[row.rowKey]?.materialId ?? dongGoc?.materialId} giaTriGocTen={ghiDeNguon[row.rowKey]?.mat ?? dongGoc?.mat ?? row.mat} giaTriGocGia={ghiDeNguon[row.rowKey]?.matPrice ?? dongGoc?.matPrice ?? 0} ghiDeHienTai={ghiDeHienTai} duocSua={duocSua} khiDat={khiDat} materials={materials} engineParams={engineParams} />
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
                  <OCoTheGhiDe khoaDong={row.rowKey} truong="rawMatPrice"
                    giaTriGoc={layGiaTriGocRawMat(
                      ghiDeNguon[row.rowKey]?.materialId ?? dongGoc?.materialId ?? row.materialId,
                      ghiDeNguon[row.rowKey]?.mat ?? dongGoc?.mat ?? row.mat,
                    )}
                    giaTriGhiDe={ghiDeHienTai[row.rowKey]?.rawMatPrice} duocSua={duocSua} khiDat={khiDat} soLe={0}
                    onAfterSet={(v) => {
                      if (v !== undefined) {
                        const effId = ghiDeHienTai[row.rowKey]?.materialId ?? ghiDeNguon[row.rowKey]?.materialId ?? dongGoc?.materialId ?? row.materialId;
                        const effName = ghiDeHienTai[row.rowKey]?.mat ?? ghiDeNguon[row.rowKey]?.mat ?? dongGoc?.mat ?? row.mat;
                        tinhMatPriceTuRaw(v, effId, effName, row.rowKey);
                      }
                    }} />
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
              <tr className={`total-row ${coDoiCpMangIn ? 'override-changed' : ''}`}>
                <td colSpan={10}>CP theo thời gian in</td>
                <td className="num">{dinhDangSo(cpMangIn, 0)} đ</td>
              </tr>
            )}
            <tr className="total-row" style={{ fontSize: '1.05em' }}>
              <td colSpan={8}><strong>TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN</strong></td>
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
                          value={phanTramHienThi}
                          onChange={(e) => xuLyThayDoiPct(e.target.value)}
                          onBlur={() => datGiaTriTamPct('')}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              datGiaTriTamPct('');
                              (e.currentTarget as HTMLInputElement).blur();
                            }
                          }}
                          placeholder={String(defaultProfitRatePct)}
                        />
                      ) : (
                        <span className="profit-rate-value">{effectivePct}%</span>
                      )}
                      {duocSua && <span className="profit-rate-pct-suffix">%</span>}
                    </td>
                    <td colSpan={7} className="num">
                      LN: {dinhDangSo(Math.round(ln), 0)} đ
                    </td>
                  </tr>
                );
              })()
            )}
            {chenhLechGiaGocDonVi != null && (
              <tr className={`total-row override-price-delta-row ${lopChenhLechGia}`}>
                <td colSpan={11}>
                  CHÊNH LỆCH SO VỚI GIÁ GỐC: <strong>{chenhLechGiaGocText} {donViChenhLechText}</strong>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {duocSua && coTheLuu && (
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

// ═══════════════════════════════════════════════════════════════════════════
// Đặc tả kỹ thuật nâng cao — Bảng ghi đè (Sale/Admin độc lập, so với GỐC)
// Bảng 1: vật liệu + mực/DM/keo (tái sử dụng xuLyDongGhiDe để lan truyền
// meters/waste/inputVL ngược dòng — đúng concept bảng ghi đè cũ).
// Bảng 2: thời gian SX × (CP nhân công + CP điện), ghi đè tay từng cột.
// ═══════════════════════════════════════════════════════════════════════════
function BangDacTaNangCaoGhiDe({ lopMau, result: r, uniRows, constants: hangSo, materials, ghiDeHienTai, duocSua, coTheLuu = true, khiDat, khiLuu, khiLuuMoi, loadedHistoryId, soLuong, profitRatePct, defaultProfitRatePct, khiDatProfitRate, engineParams }: {
  lopMau: 'sale' | 'admin';
  result: CalculateResult;
  uniRows: UniRow[];
  constants: AppConstants;
  materials: Material[];
  ghiDeHienTai: OverrideTable;
  duocSua: boolean;
  coTheLuu?: boolean;
  khiDat: (rk: OverrideRowKey, f: keyof OverrideFields, v: OverrideFields[keyof OverrideFields] | undefined) => void;
  khiLuu: (id: string) => void;
  khiLuuMoi: () => void;
  loadedHistoryId: string | null;
  soLuong: number;
  profitRatePct: number;
  defaultProfitRatePct: number;
  khiDatProfitRate: (v: number) => void;
  engineParams: { numColors: number; coverageRatio: number; metallicSurcharge: number; laborCost: number; isPrintFilm: boolean; printFilmInkBOPP: number; printFilmInkOther: number };
}) {
  // Gốc + hiện tại: túi+chia luôn neo cut + lan ÷N (TP ghép = ĐV túi/N).
  const dongGoc = chuanBiUniRowsNangCao({ uniRows, result: r, hangSo });
  const dongDaXuLy = chuanBiUniRowsNangCao({
    uniRows,
    result: r,
    hangSo,
    activeOv: ghiDeHienTai,
  });
  const dongVatLieuGoc = lapDongVatLieuNangCao(r, dongGoc, hangSo, materials);
  const dongVatLieu = lapDongVatLieuNangCao(r, dongDaXuLy, hangSo, materials, ghiDeHienTai);
  const dongNCDGoc = lapDongNhanCongDien(r, hangSo);
  const dongNCD = lapDongNhanCongDien(r, hangSo, ghiDeHienTai);
  const tongGoc = tinhTongNangCao(dongVatLieuGoc, dongNCDGoc);
  const tong = tinhTongNangCao(dongVatLieu, dongNCD);
  const coThayDoi = countOverrideChanges(ghiDeHienTai) > 0 || profitRatePct > 0;
  const donViChenhLech = r.input.productType === 'mang' ? 'ĐỒNG / MÉT VUÔNG' : 'ĐỒNG / TÚI';
  const tongNhanCong = dongNCD.reduce((s, d) => s + d.thanhTienNhanCong, 0);
  const tongDien = dongNCD.reduce((s, d) => s + d.thanhTienDien, 0);
  const effectivePct = profitRatePct > 0
    ? profitRatePct
    : (Number.isFinite(Number(defaultProfitRatePct)) ? Number(defaultProfitRatePct) : 0);
  const pctGoc = Number.isFinite(Number(defaultProfitRatePct)) ? Number(defaultProfitRatePct) : 0;
  // Chênh lệch đ/túi (hoặc đ/m²) = chênh CP SX + chênh phần LN (giống bảng ghi đè cũ)
  const chenhCp = tong.tongGiaThanh - tongGoc.tongGiaThanh;
  const chenhLn = tong.tongGiaThanh * (effectivePct / 100) - tongGoc.tongGiaThanh * (pctGoc / 100);
  const chenhLech = chenhCp + chenhLn;
  const chenhLechDonVi = soLuong > 0 ? chenhLech / soLuong : 0;
  const chenhLechText = `${chenhLechDonVi >= 0 ? '+' : ''}${dinhDangSo(Math.round(chenhLechDonVi), 0)}`;
  const lopChenhLech = Math.round(chenhLechDonVi) > 0
    ? 'override-price-delta-row--up'
    : Math.round(chenhLechDonVi) < 0
      ? 'override-price-delta-row--down'
      : 'override-price-delta-row--flat';
  const ln = tong.tongGiaThanh * (effectivePct / 100);
  /** Bảng 2 hiện theo quyền CPSX nâng cao (cột NC/điện/thời gian riêng biệt).
   *  Ẩn luôn nếu không còn cột NC hoặc Điện nào (chỉ còn cột Thời gian → ẩn). */
  const cpsxPolicies = dungCuaHangTinhGia((s) => s.cpsxNangCapPolicies);
  const cot = cotBang2TheoQuyen(cpsxPolicies);
  const hienBangNhanCongDien = cot.coLuong || cot.coDien;
  const bang2LabelColSpan = 1 + (cot.coThoiGian ? 1 : 0) + (cot.coLuong ? 1 : 0);

  // Local string state cho ô "Tỷ lệ LN" — cho phép hiển thị rỗng khi user xóa hết
  const [giaTriTamPct, datGiaTriTamPct] = React.useState<string>('');
  const phanTramHienThi = (() => {
    if (giaTriTamPct !== '') return giaTriTamPct;
    if (profitRatePct > 0) return String(profitRatePct);
    return '0';
  })();
  const xuLyThayDoiPct = (raw: string) => {
    datGiaTriTamPct(raw);
    if (raw === '') { khiDatProfitRate(0); return; }
    const so = Number(raw);
    khiDatProfitRate(Number.isFinite(so) && so >= 0 ? so : 0);
  };
  React.useEffect(() => { datGiaTriTamPct(''); }, [profitRatePct]);

  const timDongGoc = (rowKey: OverrideRowKey, chiTietIndex?: number) =>
    dongVatLieuGoc.find(d => d.rowKey === rowKey && (chiTietIndex === undefined || d.chiTietIndex === chiTietIndex));

  const hangTyLeLn = (duocSua || coThayDoi) ? (() => {
    const isOverridden = profitRatePct > 0;
    return (
      <div className={`override-profit-rate-row override-profit-rate-row--${lopMau}${isOverridden ? ' override-profit-rate-row--overridden' : ''}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px' }}>
        <span className="override-profit-label">
          Tỷ lệ LN:{' '}
          {duocSua ? (
            <input
              className={`profit-rate-input${isOverridden ? ' profit-rate-input--overridden' : ''}`}
              type="number"
              step="0.1"
              value={phanTramHienThi}
              onChange={(e) => xuLyThayDoiPct(e.target.value)}
              onBlur={() => datGiaTriTamPct('')}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  datGiaTriTamPct('');
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              placeholder={String(defaultProfitRatePct)}
            />
          ) : (
            <span className="profit-rate-value">{phanTramHienThi}%</span>
          )}
          {duocSua && <span className="profit-rate-pct-suffix">%</span>}
        </span>
        <span className="num">LN: {dinhDangSo(Math.round(ln), 0)} đ</span>
      </div>
    );
  })() : null;

  return (
    <div className={`override-section override-section--${lopMau}`}>
      <div className="override-section-header">
        <div className="override-section-title">
          {lopMau === 'sale' ? '💼' : '👑'} {lopMau === 'sale' ? 'Thay đổi từ Sale' : 'Thay đổi từ Admin'}
        </div>
        {!duocSua && <span className="override-readonly-badge">Chỉ xem</span>}
      </div>

      {/* ═══ Table 1: Vật liệu + mực/dung môi/keo ═══ */}
      <div className="table-responsive">
        <table className="data-table" id={`m-t-advanced-override-material-${lopMau}`}>
          <thead>
            <tr>
              <th>Công đoạn</th>
              <th>Vật liệu</th>
              <th className="num">Khổ màng (m)</th>
              <th className="num">Thành phẩm (m)</th>
              <th className="num">Phi hao (m)</th>
              <th className="num">Đầu vào NVL (m)</th>
              <th className="num" title="CP vật liệu (đ/m²); dòng phụ = giá NVL (đ/kg) nếu có">CP vật liệu (đ/m²)</th>
              <th className="num">Thành tiền CPNVL</th>
              <th className="num" title="Giá mực in, dung môi, keo ghép + nhũ/phủ mờ (đ/m²)">Giá mực, DM, keo (đ/m²)</th>
              <th className="num">Thành tiền mực, DM, keo</th>
            </tr>
          </thead>
          <tbody>
            {dongVatLieu.map((row, idx) => {
              const goc = timDongGoc(row.rowKey, row.chiTietIndex);
              const ovDong = ghiDeHienTai[row.rowKey];
              const ovChiTiet = row.chiTietIndex !== undefined
                ? ovDong?.detailOverrides?.[row.chiTietIndex]
                : undefined;
              // Mét/khổ/phi hao — riêng khỏi đổi VL (giá/mã) để ô ĐV không cam khi chỉ đổi vật liệu
              const coDoiMetOv = coGhiDeDong(ovDong, ['meters', 'waste', 'inputVL', 'width']);
              const coDoiGiaVL = coGhiDeDong(ovDong, ['rawMatPrice', 'matPrice', 'materialId'])
                || coGhiDeChiTiet(ovChiTiet, ['rawMatPrice', 'matPrice', 'materialId', 'materialName']);
              // Dòng synthetic Chia/Lật mặt: chi phí 0, không cho ghi đè Table 1
              const laDongSynthetic = row.rowKey === 'matte' || row.rowKey === 'chia';
              // Gia công ngoài: khóa ghi đè (CP đã nằm trong giá GC; chấm đỏ từng ô)
              const laGc = !!row.isGiaCongNgoai;
              const suaT1 = duocSua && !laDongSynthetic && !laGc;
              const coDoiMuc = ovDong?.cpMucKeoPerM2 !== undefined
                || (row.cpMucKeo != null && goc?.cpMucKeo != null
                  && Math.abs(row.cpMucKeo - goc.cpMucKeo) > 0.001);
              // Dòng Chia/synthetic: so với gốc (label hoặc số) vì không có ghi đè trực tiếp
              const coDoiKhoLabel = !!(row.khoMangLabel && goc
                && (row.khoMangLabel !== (goc.khoMangLabel ?? '')
                  || Math.abs((row.khoMang ?? 0) - (goc.khoMang ?? 0)) > 0.0005));
              const coDoiTpLabel = !!(row.thanhPhamLabel && goc
                && (row.thanhPhamLabel !== (goc.thanhPhamLabel ?? '')
                  || Math.abs((row.thanhPham ?? 0) - (goc.thanhPham ?? 0)) > 0.001));
              const coDoiDvLabel = !!(row.dauVaoNvlLabel && goc
                && (row.dauVaoNvlLabel !== (goc.dauVaoNvlLabel ?? '')
                  || Math.abs((row.dauVaoNVL ?? 0) - (goc.dauVaoNVL ?? 0)) > 0.001));
              const coDoiMetSo = !!goc && (
                Math.abs((row.thanhPham ?? 0) - (goc.thanhPham ?? 0)) > 0.001
                || Math.abs((row.phiHao ?? 0) - (goc.phiHao ?? 0)) > 0.001
                || Math.abs((row.dauVaoNVL ?? 0) - (goc.dauVaoNVL ?? 0)) > 0.001
                || Math.abs((row.khoMang ?? 0) - (goc.khoMang ?? 0)) > 0.0005
              );
              const coDoiMet = coDoiMetOv || coDoiMetSo || coDoiKhoLabel || coDoiTpLabel || coDoiDvLabel;
              // Thành tiền: đổi mét HOẶC đổi VL/giá
              const coDoiVL = coDoiMet || coDoiGiaVL;
              // Đầu vào NVL: chỉ cam khi mét/ĐV thật sự đổi — không theo materialId/giá
              const coDoiDauVao = coDoiMet;
              // Phụ kiện (Zipper/…) đã gộp vào dòng Làm túi
              return (
                <tr key={`${row.rowKey}-${row.chiTietIndex ?? 0}`}>
                  <td data-label="Công đoạn" className="dac-ta-nang-cao__stage">{row.congDoan}</td>
                  {laDongSynthetic ? (
                    <td data-label="Vật liệu">{row.vatLieu}</td>
                  ) : row.chiTietIndex !== undefined && goc ? (
                    <OChonVatLieuChiTiet khoaDong={row.rowKey} chiTietIndex={row.chiTietIndex}
                      giaTriGoc={{ id: goc.materialId, name: goc.vatLieu, matPrice: goc.cpVatLieu ?? 0 }}
                      giaTriGhiDe={ghiDeHienTai[row.rowKey]?.detailOverrides?.[row.chiTietIndex]}
                      duocSua={suaT1} khiDat={khiDat} ghiDeHienTai={ghiDeHienTai} materials={materials} engineParams={engineParams} />
                  ) : (
                    <OChonVatLieuDong khoaDong={row.rowKey}
                      giaTriGocId={goc?.materialId} giaTriGocTen={goc?.vatLieu ?? row.vatLieu} giaTriGocGia={goc?.cpVatLieu ?? 0}
                      ghiDeHienTai={ghiDeHienTai} duocSua={suaT1} khiDat={khiDat} materials={materials} engineParams={engineParams} />
                  )}
                  {row.khoMangLabel ? (
                    oSoGc(row.khoMangLabel, laGc, { className: coDoiKhoLabel ? 'override-changed' : '', dataLabel: 'Khổ màng (m)' })
                  ) : (
                    <OCoTheGhiDe khoaDong={row.rowKey} truong="width" giaTriGoc={goc?.khoMang ?? row.khoMang ?? 0}
                      giaTriGhiDe={ghiDeHienTai[row.rowKey]?.width} duocSua={suaT1} khiDat={khiDat} soLe={3} laGiaCong={laGc} />
                  )}
                  {row.thanhPhamLabel ? (
                    oSoGc(<HienThiMetKho label={row.thanhPhamLabel} />, laGc, {
                      className: `dac-ta-met-kho-cell ${coDoiTpLabel ? 'override-changed' : ''}`,
                      dataLabel: 'Thành phẩm (m)',
                    })
                  ) : (
                    <OCoTheGhiDe khoaDong={row.rowKey} truong="meters"
                      giaTriGoc={goc?.thanhPham ?? 0}
                      giaTriGhiDe={Math.abs((row.thanhPham ?? 0) - (goc?.thanhPham ?? 0)) > 0.001 ? (row.thanhPham ?? undefined) : ghiDeHienTai[row.rowKey]?.meters}
                      duocSua={suaT1} khiDat={khiDat} soLe={0} laGiaCong={laGc} />
                  )}
                  <OCoTheGhiDe khoaDong={row.rowKey} truong="waste"
                    giaTriGoc={goc?.phiHao ?? 0}
                    giaTriGhiDe={ghiDeHienTai[row.rowKey]?.waste}
                    duocSua={suaT1} khiDat={khiDat} soLe={0} laGiaCong={laGc} />
                  {oSoGc(
                    row.dauVaoNvlLabel ? <HienThiMetKho label={row.dauVaoNvlLabel} /> : dinhDangSo(row.dauVaoNVL, 0),
                    laGc,
                    {
                      className: `highlight${row.dauVaoNvlLabel ? ' dac-ta-met-kho-cell' : ''} ${coDoiDauVao ? 'override-changed' : ''}`,
                      dataLabel: 'Đầu vào NVL (m)',
                    },
                  )}
                  {(() => {
                    const coCp = row.cpVatLieu != null;
                    const donViPhu = row.donViGiaNVL;            // 'kg' | 'm' | null
                    const giaPhuGoc = row.giaNVL;
                    const giaPhuHien = giaPhuGoc != null && giaPhuGoc > 0
                      ? (ghiDeHienTai[row.rowKey]?.rawMatPrice ?? giaPhuGoc)
                      : ghiDeHienTai[row.rowKey]?.rawMatPrice;
                    const hienPhu = giaPhuHien != null && Number(giaPhuHien) > 0;
                    const coDoiCp = ovDong?.matPrice !== undefined || ovDong?.rawMatPrice !== undefined;
                    const nhanDonViPhu = donViPhu === 'm' ? ' đ/m' : donViPhu === 'kg' ? '/kg' : '';
                    if (!coCp && !hienPhu) {
                      return oSoGc('—', laGc, { dataLabel: 'CP vật liệu (đ/m²)' });
                    }
                    if (laDongSynthetic || !suaT1) {
                      return oSoGc(
                        <span className="cp-vl-gop">
                          {coCp && (
                            <span className="cp-vl-gop__m2">{dinhDangSo(row.cpVatLieu, 1)}</span>
                          )}
                          {hienPhu && (
                            <span className={donViPhu === 'm' ? 'cp-vl-gop__m' : 'cp-vl-gop__kg'}>
                              ({dinhDangSo(Number(giaPhuHien), 0)}{nhanDonViPhu})
                            </span>
                          )}
                        </span>,
                        laGc,
                        { className: coDoiCp ? 'override-changed' : '', dataLabel: 'CP vật liệu (đ/m²)' },
                      );
                    }
                    return (
                      <td className={`num override-cell ${coDoiCp ? 'override-changed' : ''} ${laGc ? 'gc-cell' : ''}`} data-label="CP vật liệu (đ/m²)">
                        {laGc ? <span className="gc-cell__dot" title="Gia công" aria-label="Gia công" /> : null}
                        <span className="cp-vl-gop">
                          {coCp && (
                            <span className="cp-vl-gop__m2">
                              <OCoTheGhiDe khoaDong={row.rowKey} truong="matPrice"
                                giaTriGoc={goc?.cpVatLieu ?? 0}
                                giaTriGhiDe={ghiDeHienTai[row.rowKey]?.matPrice}
                                duocSua={suaT1} khiDat={khiDat} soLe={1} inline laGiaCong={laGc} />
                            </span>
                          )}
                          {hienPhu && (
                            <span className={donViPhu === 'm' ? 'cp-vl-gop__m' : 'cp-vl-gop__kg'}>
                              <OCoTheGhiDe khoaDong={row.rowKey} truong="rawMatPrice"
                                giaTriGoc={goc?.giaNVL ?? row.giaNVL ?? 0}
                                giaTriGhiDe={ghiDeHienTai[row.rowKey]?.rawMatPrice}
                                duocSua={suaT1} khiDat={khiDat} soLe={0} inline laGiaCong={laGc}
                                hienThiTuyChinh={(n) => `(${dinhDangSo(n, 0)}${nhanDonViPhu})`}
                                onAfterSet={(raw) => {
                                  if (raw === undefined) {
                                    khiDat(row.rowKey, 'matPrice', undefined);
                                    return;
                                  }
                                  // Zipper (đ/m): chỉ lưu rawMatPrice, không quy đổi sang matPrice đ/m²
                                  if (donViPhu === 'm') return;
                                  const matId = ghiDeHienTai[row.rowKey]?.materialId ?? goc?.materialId ?? row.materialId;
                                  const matName = ghiDeHienTai[row.rowKey]?.mat ?? goc?.vatLieu ?? row.vatLieu;
                                  const m = matId
                                    ? materials.find(x => x.id === matId)
                                    : materials.find(x => x.name === matName);
                                  if (!m || m.thickness <= 0 || m.density <= 0) return;
                                  khiDat(row.rowKey, 'matPrice', raw * m.thickness * m.density / 1000);
                                }}
                              />
                            </span>
                          )}
                        </span>
                      </td>
                    );
                  })()}
                  {oSoGc(dinhDangSo(row.thanhTienNVL, 0), laGc, {
                    className: coDoiVL ? 'override-changed' : '',
                    dataLabel: 'Thành tiền CPNVL',
                  })}
                  {row.cpMucKeo != null && !laDongSynthetic ? (
                    <OCoTheGhiDe khoaDong={row.rowKey} truong="cpMucKeoPerM2"
                      giaTriGoc={goc?.cpMucKeo ?? 0}
                      giaTriGhiDe={
                        ghiDeHienTai[row.rowKey]?.cpMucKeoPerM2 !== undefined
                          ? ghiDeHienTai[row.rowKey]?.cpMucKeoPerM2
                          : Math.abs((row.cpMucKeo ?? 0) - (goc?.cpMucKeo ?? 0)) > 0.001
                            ? (row.cpMucKeo ?? undefined)
                            : undefined
                      }
                      duocSua={suaT1} khiDat={khiDat} soLe={1} laGiaCong={laGc} />
                  ) : row.cpMucKeo != null ? (
                    oSoGc(dinhDangSo(row.cpMucKeo, 1), laGc, {
                      className: 'dac-ta-nang-cao__muc',
                      dataLabel: 'Giá mực, DM, keo (đ/m²)',
                    })
                  ) : (
                    oSoGc('—', laGc, {
                      className: 'dac-ta-nang-cao__muc',
                      dataLabel: 'Giá mực, DM, keo (đ/m²)',
                    })
                  )}
                  {oSoGc(dinhDangSo(row.thanhTienMucKeo, 0), laGc, {
                    className: `dac-ta-nang-cao__muc ${coDoiMuc || coDoiVL ? 'override-changed' : ''}`,
                    dataLabel: 'Thành tiền mực, DM, keo',
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ═══ Table 2 (theo quyền CPSX NC) + cụm 3 dòng tổng ═══ */}
      <div className={`dac-ta-nang-cao__split${hienBangNhanCongDien ? '' : ' dac-ta-nang-cao__split--totals-only'}`}>
        {hienBangNhanCongDien && (
          <div className="dac-ta-nang-cao__split-table">
            <div className="table-responsive">
              <table className="data-table" id={`m-t-advanced-override-labor-${lopMau}`}>
                <thead>
                  <tr>
                    <th>Công đoạn</th>
                    {cot.coThoiGian && <th className="num">Thời gian SX (phút)</th>}
                    {cot.coLuong && <th className="num">Giá nhân công (đ/phút)</th>}
                    {cot.coLuong && <th className="num">Thành tiền nhân công (VNĐ)</th>}
                    {cot.coDien && <th className="num">Giá điện (đ/phút)</th>}
                    {cot.coDien && <th className="num">Thành tiền điện</th>}
                  </tr>
                </thead>
                <tbody>
                  {dongNCD.map((row, idx) => {
                    const ovDong = ghiDeHienTai[row.rowKey];
                    // Chỉ cho sửa Thời gian SX; CP NC / điện chỉ xem
                    const coDoiTG = coGhiDeDong(ovDong, ['thoiGianPhut']);
                    // Gia công ngoài: TG/CP = 0, khóa sửa + chấm đỏ
                    const laGc = !!row.isGiaCongNgoai;
                    const suaTg = duocSua && !laGc;
                    return (
                      <tr key={`${lopMau}-ncd-${idx}`}>
                        <td data-label="Công đoạn" className="dac-ta-nang-cao__stage">{row.congDoan}</td>
                        {cot.coThoiGian && (
                          <OCoTheGhiDe khoaDong={row.rowKey} truong="thoiGianPhut"
                            giaTriGoc={dongNCDGoc[idx]?.thoiGianPhut ?? 0} giaTriGhiDe={ghiDeHienTai[row.rowKey]?.thoiGianPhut}
                            duocSua={suaTg} khiDat={khiDat} soLe={0} laGiaCong={laGc} />
                        )}
                        {cot.coLuong && (
                          <OCoTheGhiDe khoaDong={row.rowKey} truong="cpNhanCongPerPhut"
                            giaTriGoc={dongNCDGoc[idx]?.cpNhanCongPerPhut ?? 0} giaTriGhiDe={ghiDeHienTai[row.rowKey]?.cpNhanCongPerPhut}
                            duocSua={false} khiDat={khiDat} soLe={0} laGiaCong={laGc} />
                        )}
                        {cot.coLuong && oSoGc(dinhDangSo(row.thanhTienNhanCong, 0), laGc, {
                          className: coDoiTG ? 'override-changed' : '',
                          dataLabel: 'Thành tiền nhân công (VNĐ)',
                        })}
                        {cot.coDien && (
                          <OCoTheGhiDe khoaDong={row.rowKey} truong="cpDienPerPhut"
                            giaTriGoc={dongNCDGoc[idx]?.cpDienPerPhut ?? 0} giaTriGhiDe={ghiDeHienTai[row.rowKey]?.cpDienPerPhut}
                            duocSua={false} khiDat={khiDat} soLe={0} laGiaCong={laGc} />
                        )}
                        {cot.coDien && oSoGc(dinhDangSo(row.thanhTienDien, 0), laGc, {
                          className: coDoiTG ? 'override-changed' : '',
                          dataLabel: 'Thành tiền điện',
                        })}
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td colSpan={bang2LabelColSpan}><strong>Tổng nhân công / điện</strong></td>
                    {cot.coLuong && (
                      <td className="num" style={{ color: 'var(--accent)', fontWeight: 800 }}>{dinhDangSo(tongNhanCong, 0)}</td>
                    )}
                    {cot.coDien && <td />}
                    {cot.coDien && (
                      <td className="num" style={{ color: 'var(--accent)', fontWeight: 800 }}>{dinhDangSo(tongDien, 0)}</td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="dac-ta-nang-cao__totals">
          <div className="dac-ta-nang-cao__total-row">
            <span className="dac-ta-nang-cao__total-label">Tổng thành tiền CP Vật liệu<small>(nguyên vật liệu + dung môi + keo ghép + khác)</small></span>
            <strong className="dac-ta-nang-cao__total-value">{dinhDangSo(tong.tongVatLieu, 0)} đ</strong>
          </div>
          <div className="dac-ta-nang-cao__total-row">
            <span className="dac-ta-nang-cao__total-label">Tổng thành tiền chi phí Nhân công + điện</span>
            <strong className={`dac-ta-nang-cao__total-value ${Math.abs(tong.tongNhanCongDien - tongGoc.tongNhanCongDien) > 1 ? 'override-changed' : ''}`}>{dinhDangSo(tong.tongNhanCongDien, 0)} đ</strong>
          </div>
          <div className="dac-ta-nang-cao__total-row dac-ta-nang-cao__total-row--grand">
            <span className="dac-ta-nang-cao__total-label">Tổng giá thành sản xuất cơ bản</span>
            <strong className={`dac-ta-nang-cao__total-value ${coThayDoi ? 'override-changed' : ''}`}>{dinhDangSo(tong.tongGiaThanh, 0)} đ</strong>
          </div>
        </div>
      </div>

      {hangTyLeLn}
      <div className={`total-row override-price-delta-row ${lopChenhLech}`} style={{ padding: '8px 12px', marginTop: 4 }}>
        CHÊNH LỆCH SO VỚI GIÁ GỐC: <strong>{chenhLechText} {donViChenhLech}</strong>
      </div>

      {duocSua && coTheLuu && (
        <div className="override-save-row">
          <button className="btn btn-sm btn-green" onClick={() => loadedHistoryId ? khiLuu(loadedHistoryId) : khiLuuMoi()}>💾 Lưu thay đổi</button>
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

/** Tính nangCaoSpec từ store hiện tại (chỉ khi đang ở chế độ nâng cao & có result). */
function tinhNangCaoSpecTuStore(state: ReturnType<typeof dungCuaHangTinhGia.getState>): LsxNangCaoRow[] | undefined {
  if (!state.cheDoNangCao || !state.result) return undefined;
  const overrides = Object.keys(state.adminOverrides || {}).length > 0
    ? state.adminOverrides
    : state.saleOverrides;
  return buildNangCaoSpecFromPricing(
    state.result,
    lapDongSanXuat(state.result, state.constants).uniRows,
    state.constants,
    state.materials,
    overrides,
  );
}

/** Merge nangCaoSpec vào inputValue (đè spec cũ nếu có). */
function ganNangCaoSpecVaoInput(inputValue: unknown, spec: LsxNangCaoRow[] | undefined): unknown {
  if (!laObject(inputValue)) return inputValue;
  return { ...inputValue, nangCaoSpec: spec };
}
function laObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

// Đẩy 1 pricing sheet lên server (chạy ngầm, không hiện toast).
// Bỏ qua im lặng nếu offline / chưa đăng nhập. Hiện toast nếu thiếu mã khách hàng.
// syncAdvisor: user advisor → luôn PATCH masterResult (kể cả rỗng để xóa ghi đè Admin).
async function syncPricingSheetToServer(
  h: HistoryItem | undefined,
  isAuthenticated: boolean,
  accessToken: string | null,
  opts?: { syncAdvisor?: boolean },
): Promise<void> {
  if (!h) return;

  const decision = quyetDinhPricingSheetSync(h, isAuthenticated, accessToken, h?.pricingSheetId, opts);
  if (decision.action === 'skip') return;

  // Snap bảng đặc tả nâng cao vào inputValue để LSX (tạo sau này) đọc lại được
  // — đồng thời khoá "ảnh chụp" theo engine hiện tại.
  const state = dungCuaHangTinhGia.getState();
  const nangCaoSpec = tinhNangCaoSpecTuStore(state);
  if (h) h.input = ganNangCaoSpecVaoInput(h.input, nangCaoSpec) as HistoryItem['input'];

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
        dungCuaHangTinhGia.setState({
          history: updatedHistory,
        });
      }
    } else if (decision.action === 'patch') {
      if (!h.pricingSheetId) return;
      // Sheet đã pin (có priceConfigIds) → useLatest=false; chưa pin → true
      const sheet = await capNhatPricingSheetResultService(
        h.pricingSheetId,
        mapHistoryToResultPatch(h),
        accessToken ?? undefined,
      );
      if (sheet?.priceConfigIds) {
        const state = dungCuaHangTinhGia.getState();
        dungCuaHangTinhGia.setState({
          history: state.history.map((x) =>
            x.id === h.id || x.pricingSheetId === h.pricingSheetId
              ? { ...x, priceConfigIds: sheet.priceConfigIds }
              : x,
          ),
        });
      }
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

export default function ManHinhQuanLy({ nangCap = false, isCommercial = false, commercialMode, ketQuaThuongMai }: { nangCap?: boolean; isCommercial?: boolean; commercialMode?: 'form' | 'description'; ketQuaThuongMai?: KetQuaThuongMai }) {
  const { result: ketQua, activeView: manHinhDangMo, input, constants: hangSo, profitTable: bangLoiNhuan, currentChotGia: giaChotHienTai, setCurrentChotGia: datGiaChotHienTai, addCurrentToHistory: themVaoLichSu, capNhatHienTaiVaoLichSu: capNhatVaoLichSu,
    role,   loadedHistoryId: loadedHistoryId,
  originalCustomerLoaded: originalCustomerLoaded, history: lichSu, materials,
    currentSellerId: idNhanVienHienTai,
    saleOverrides: ghiDeSale, adminOverrides: ghiDeAdmin, showSaleOverrides: hienGhiDeSale, showAdminOverrides: hienGhiDeAdmin,
    saleProfitRatePct, adminProfitRatePct, setSaleProfitRatePct: datSaleProfitRatePct, setAdminProfitRatePct: datAdminProfitRatePct,
    setSaleOverride: datGhiDeSale, setAdminOverride: datGhiDeAdmin, setShowSaleOverrides: datHienGhiDeSale, setShowAdminOverrides: datHienGhiDeAdmin, persistOverrides: luuGhiDe, calculateForInput,
    phanBoCongTy = 0, donViPhanBo, setPhanBoCongTy, setDonViPhanBo,
  accessToken, isAuthenticated, isDirty,
} = dungCuaHangTinhGia();

// Tính toán trạng thái nút Lưu và banner
const currentCustomerCode = timMaKhachHang(input.customer);
const loadedItem = timMucLichSuTheoId(lichSu, loadedHistoryId) ?? null;
// Sheet NC đã lưu: 4 key CPSX NC từ pin lúc lưu — không bám store.constants đang sửa
const hangSoNc = (nangCap && loadedItem?.pinnedCpsxNangCao)
  ? apCpsxNangCaoVaoHangSo(hangSo, loadedItem.pinnedCpsxNangCao)
  : hangSo;
const isSameCustomer = loadedItem && originalCustomerLoaded && currentCustomerCode && originalCustomerLoaded === currentCustomerCode;
const buttonLabel = loadedItem
  ? (isSameCustomer ? "🔄 Cập nhật" : "📄 Tạo bảng tính mới")
  : "💾 Lưu tính giá";
  const showBanner = loadedItem && !isSameCustomer;
  const [vatLieuCuonDangChon, datVatLieuCuonDangChon] = React.useState('');
  const [tabDangMo, datTabDangMo] = React.useState<'sale' | 'admin'>('sale');
  const [tabDangMoNangCao, datTabDangMoNangCao] = React.useState<'sale' | 'admin'>('sale');
  const [phanBoDangNhap, datPhanBoDangNhap] = React.useState<{ field: 'company' | 'commission' | null; value: string }>({ field: null, value: '' });

  // Sale chỉ được lưu khi khách hàng thuộc danh sách mình quản lý (hoặc khách vừa tạo
  // mới — vốn đã được gán sellerId/managers của sale). Admin / CUSTOMER_MANAGER không bị giới hạn.
  // Trả true nếu hợp lệ, ngược lại alert + trả false.
  const kiemTraKhachHangQuyen = () => {
    const st = dungCuaHangTinhGia.getState();
    const policies = st.nguoiDungHienTai?.policies ?? [];
    // CUSTOMER_MANAGER / PRICING_SHEET_ADVISOR: làm việc với mọi khách hàng.
    if (coQuyenQuanLyKhachHang(policies) || coQuyenCoVanBangTinh(policies)) return true;
    if (laKhachHangThuocQuyen(input.customer, loadCustomers() as KhachHangCoTen[], role, idNhanVienHienTai)) return true;
    alert(input.customer.trim()
      ? 'Bạn chỉ được lưu cho khách hàng mình quản lý. Vui lòng chọn từ gợi ý hoặc tạo khách mới.'
      : 'Vui lòng chọn khách hàng bạn quản lý trước khi lưu.');
    return false;
  };

  // Lưu ghi đè (sale/admin chung) + đẩy pricing sheet lên server.
  const xuLyLuuGhiDe = (idLichSu: string) => {
    luuGhiDe(idLichSu);
    hienToastLuuGhiDe();
    const st = dungCuaHangTinhGia.getState();
    const h = timMucLichSuTheoId(st.history, idLichSu);
    const syncAdvisor = coQuyenCoVanBangTinh(st.nguoiDungHienTai?.policies ?? []);
    void syncPricingSheetToServer(h, isAuthenticated, accessToken, { syncAdvisor })
      .then(() => { dungCuaHangTinhGia.getState().taiLichSuTuServer(); });
  };

  const xuLyLuuGhiDeMoi = () => {
    if (!kiemTraKhachHangQuyen()) return;
    themVaoLichSu();
    const newId = dungCuaHangTinhGia.getState().loadedHistoryId;
    if (newId) xuLyLuuGhiDe(newId);
  };

  /** Xuất A4: snapshot màn tạo BT (giá chốt + đặc tả NC; Admin > Sale > Gốc). */
  const xuLyXuatChiTietNangCap = () => {
    if (!ketQua) return;
    const st = dungCuaHangTinhGia.getState();
    const loaded = timMucLichSuTheoId(st.history, st.loadedHistoryId);
    const pin = loaded?.pinnedCpsxNangCao ?? trichCpsxNangCao(hangSoNc);
    const item: HistoryItem = {
      id: loaded?.id ?? 'draft-export',
      date: loaded?.date ?? new Date().toLocaleString('vi-VN'),
      customer: input.customer || '—',
      productName: input.productName || '—',
      structure: ketQua.structureText,
      quantity: input.quantity,
      finalPrice: ketQua.finalPrice,
      profitRate: ketQua.profitRate,
      chotGia: giaChotHienTai > 0 ? giaChotHienTai : undefined,
      saleOverrides: ghiDeSale,
      adminOverrides: ghiDeAdmin,
      saleProfitRatePct: saleProfitRatePct || undefined,
      adminProfitRatePct: adminProfitRatePct || undefined,
      isNangCap: true,
      pinnedCpsxNangCao: pin,
      input: { ...input, isNangCap: true },
      sellerName: loaded?.sellerName,
    };
    void exportPricingDetailToA4(item, materials, hangSoNc, bangLoiNhuan, st.cpsxNangCapPolicies, coQuyenCoVanBangTinh(st.nguoiDungHienTai?.policies ?? []), st.accessToken, st.smallWidthPrices);
  };

  // Quyền sửa tab nâng cao — giống bảng ghi đè cũ (advisor ↔ admin/sale)
  const coQuyenAdvisorNangCao = coQuyenCoVanBangTinh(dungCuaHangTinhGia.getState().nguoiDungHienTai?.policies ?? []);
  const canSaleEditNangCao = !coQuyenAdvisorNangCao;
  const canAdminEditNangCao = coQuyenAdvisorNangCao;
  const coTheLuuSaleNangCao = loadedItem?.canUpdate !== false;
  const coTheLuuAdminNangCao = loadedItem?.canAdminUpdate !== false;

  if (manHinhDangMo !== 'manager') return null;

  // Tính giá Thương mại — chế độ "Mô tả khác": chỉ hiện card mô tả, không tính giá
  if (isCommercial && commercialMode === 'description') {
    const kqTM = tinhGiaThuongMai(input);
    const donViTM = kqTM.unitLabel; // "/Túi" | "/m²" | "/m" | "/<custom>"
    const donViTMGoc = donViTM.replace('/', '');
    const soLuongTM = Math.max(0, Number(input.quantity) || 0);
    const laCoSL = soLuongTM > 0;
    // Kết quả tổng hợp từ tinhBaoGia (synthesizeResultFromCommercial) — 1 nguồn công thức
    // với kết quả lưu lịch sử: mua+LN, VC (đ/km × km), thùng, phụ phí, lãi vay, hoa hồng.
    const kqTongHop = ketQua;
    const phiVC = Math.max(0, kqTongHop?.shippingTotal ?? 0);
    const vcPerUnit = kqTongHop?.shippingPerUnit ?? 0;
    const thungPerUnit = kqTongHop?.boxPerUnit ?? 0;
    const laiVayPerUnit = kqTongHop?.interestPerUnit ?? 0;
    const hoaHongPerUnit = kqTongHop?.commissionPerUnit ?? 0;
    const soTuiMotThung = Math.max(1, Number(input.bagsPerBox) || 1);
    const trongLuongThung = Math.max(0, Number(input.boxWeight) || 0);
    const trongLuongMoiDonVi = Math.max(0, Number(input.commercialUnitWeight) || 0);
    // Tổng trọng lượng (vận chuyển tổng lô) = trọng lượng đơn hàng + trọng lượng thùng
    // (số thùng × trọng lượng thùng) — khớp yêu cầu nghiệp vụ.
    const soLuongThung = laCoSL && Number(input.bagsPerBox) > 0 ? soLuongTM / Number(input.bagsPerBox) : 0;
    const trongLuongThungTongGr = soLuongThung * trongLuongThung;
    const tongTrongLuongGr = soLuongTM * trongLuongMoiDonVi + trongLuongThungTongGr;
    const tongTrongLuongKg = tongTrongLuongGr / 1000;
    const tongTrongLuongTan = tongTrongLuongGr / 1000000;
    const lnLabel = kqTM.profitUnit === 'percent'
      ? `${dinhDangSo(kqTM.profitRawValue, 2)}% (= ${dinhDangSo(kqTM.profitPerUnit, 0)} đ${donViTM})`
      : `${dinhDangSo(kqTM.profitRawValue, 0)} đ${donViTM} (= ${dinhDangSo(kqTM.profitPct * 100, 2)}%)`;
    const tongCongPerUnit = kqTongHop?.finalPrice
      ?? (kqTM.unitPriceVnd + vcPerUnit + thungPerUnit + kqTM.extraFeePerUnit + laiVayPerUnit + hoaHongPerUnit);
    const giaHienThi = laCoSL ? tongCongPerUnit : 0;
    const chuoiMotaTM = (input.commercialDescription || '').trim();

    // ── Chốt giá + phân bổ chênh lệch (mirror màn kết quả đầy đủ) ──
    const giaDeXuatTM = giaHienThi;
    const chotGiaNum = giaChotHienTai || 0;
    const hasChotGia = chotGiaNum > 0;
    const shownPriceTM = hasChotGia ? chotGiaNum : giaDeXuatTM;
    const diffTM = hasChotGia ? chotGiaNum - giaDeXuatTM : 0;
    const hienThiPhanBoChotGia = tinhNhapPhanBoChotGia({
      hasChotGia,
      diff: diffTM,
      hoaHongNhap: phanBoCongTy,
      hoaHongEngine: hoaHongPerUnit,
      donViPhanBo,
    });
    const phanBoHoaHongTM = hienThiPhanBoChotGia.hoaHongAmount;
    const coLoiPhanBoTM = hienThiPhanBoChotGia.loi.length > 0;
    const giaTriNhapCongTyTM = coLoiPhanBoTM ? 'Lỗi phân bổ' : dinhDangSo(hienThiPhanBoChotGia.congTyDisplay, 1);
    const giaTriNhapHoaHongTM = phanBoDangNhap.field === 'commission'
      ? phanBoDangNhap.value
      : String(+(hienThiPhanBoChotGia.hoaHongDisplay).toFixed(1));
    const newCommissionPerUnitTM = Math.max(0, hoaHongPerUnit + phanBoHoaHongTM);
    const doanhThuChotTM = shownPriceTM * soLuongTM;
    const tongHoaHongChotTM = newCommissionPerUnitTM * soLuongTM;
    // Chi phí/sp = mua + VC + thùng + phụ phí + lãi vay (KHÔNG gồm LN, không gồm hoa hồng)
    const chiPhiDonViTM = kqTM.purchasePrice + vcPerUnit + thungPerUnit + kqTM.extraFeePerUnit + laiVayPerUnit;
    const tongChiPhiTM = chiPhiDonViTM * soLuongTM;
    const loiNhuanCongTyChotTM = doanhThuChotTM - tongChiPhiTM - tongHoaHongChotTM;
    const pctLoiNhuanCongTyChotTM = tongChiPhiTM > 0 ? loiNhuanCongTyChotTM / tongChiPhiTM : 0;
    const commissionPctShownTM = tongChiPhiTM > 0 ? (newCommissionPerUnitTM * soLuongTM / tongChiPhiTM) : 0;

    // ── Thẻ thống kê ──
    const doanhThuTM = giaDeXuatTM * soLuongTM;
    const hoaHongTongTM = hoaHongPerUnit * soLuongTM;
    const tongMuaTM = kqTM.purchasePrice * soLuongTM;
    const hoaHongPctTM = tongMuaTM > 0 ? hoaHongTongTM / tongMuaTM : 0;

    // Xuất A4 — bản thương mại 1 trang, dùng chung nguồn với 👁 Xem ở danh sách lịch sử
    const xuLyXemChiTietTM = () => {
      const st = dungCuaHangTinhGia.getState();
      const item: HistoryItem = {
        id: loadedItem?.id ?? 'draft-export',
        date: loadedItem?.date ?? new Date().toLocaleString('vi-VN'),
        customer: input.customer || '—',
        productName: input.productName || '—',
        structure: kqTongHop?.structureText || 'Mô tả khác',
        quantity: input.quantity,
        finalPrice: giaDeXuatTM,
        profitRate: kqTM.profitPct,
        chotGia: hasChotGia ? chotGiaNum : undefined,
        isThuongMai: true,
        input: { ...input },
        sellerName: loadedItem?.sellerName,
      };
      void exportPricingDetailToA4(item, st.materials, st.constants, st.profitTable, undefined, undefined, st.accessToken, st.smallWidthPrices);
    };

    // Lưu bảng tính "Mô tả khác" — logic khớp nút Lưu của màn kết quả đầy đủ:
    // check tên SP → quyền khách → themVaoLichSu/capNhatVaoLichSu → sync server → toast.
    // Result đã được synthesize trong tinhBaoGia (structureText = nội dung mô tả).
    const luuMotaBaoGia = (kieu: 'moi' | 'capNhat') => {
      if (!(input.productName || '').trim()) {
        alert('Vui lòng nhập tên sản phẩm trước khi lưu.');
        return;
      }
      if (!kiemTraKhachHangQuyen()) return;
      if (kieu === 'capNhat') capNhatVaoLichSu(); else themVaoLichSu();
      const st = dungCuaHangTinhGia.getState();
      const h = timMucLichSuTheoId(st.history, st.loadedHistoryId);
      const syncAdvisor = coQuyenCoVanBangTinh(st.nguoiDungHienTai?.policies ?? []);
      void syncPricingSheetToServer(h, isAuthenticated, accessToken, { syncAdvisor })
        .then(() => { dungCuaHangTinhGia.getState().taiLichSuTuServer(); });
      const container = document.getElementById('toastContainer');
      if (container) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-clickable';
        toast.innerHTML = kieu === 'capNhat'
          ? '🔄 Đã cập nhật bảng tính giá! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>'
          : '💾 Đã lưu báo giá! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>';
        toast.addEventListener('click', () => { dieuHuongModuleApp('history_db'); toast.remove(); });
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
      }
    };

    return (
      <div className="panel active" id="panel-manager">
        <div className="manager-content">
          <div className="card" style={{ marginBottom: 14, padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <div className="price-hero">
              <div className="label">{hasChotGia ? `Giá bán chốt ${donViTM}` : `Giá đề xuất ${donViTM}`}</div>
              <div className="value" id="s-price" style={laCoSL ? undefined : { color: 'var(--muted)' }}>
                {laCoSL ? dinhDangSo(shownPriceTM, 0) : '—'}
              </div>
              <div className="unit">
                {laCoSL
                  ? `(đã gồm mua + LN + phụ phí + VC + thùng + lãi vay + hoa hồng)`
                  : 'nhập Số lượng + Đơn giá mua + LN để tính'}
              </div>
              <div className="sub" id="s-structure">
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '1.05rem', marginBottom: 12 }}>
                  {input.customer || '—'} — {input.productName || '—'}
                </div>
                {laCoSL && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: chuoiMotaTM ? 10 : 0 }}>
                    Số lượng: <strong style={{ color: 'var(--text)' }}>{dinhDangSo(soLuongTM, 0)}</strong> {kqTM.unitLabel.replace('/', '')}
                  </div>
                )}
                {chuoiMotaTM && (
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    background: 'var(--surface2, rgba(0,0,0,0.04))',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary, var(--text))',
                    lineHeight: 1.55,
                  }}>
                    {chuoiMotaTM}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Chốt giá + phân bổ chênh lệch ═══ */}
          <div className="chot-gia-row">
            <div className="form-group" style={{flex: 1}}>
              <label className="form-label">Giá bán chốt (đ{donViTM})</label>
              <input
                className="form-input"
                placeholder="Nhập giá chốt..."
                style={{borderColor: 'var(--green)'}}
                value={giaChotHienTai > 0 ? String(Math.round(giaChotHienTai)) : ''}
                onChange={(e) => datGiaChotHienTai(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
              />
            </div>
            <div className="form-group" style={{flex: 1.5, opacity: hasChotGia ? 1 : 0.5, pointerEvents: hasChotGia ? 'auto' : 'none'}}>
              <label className="form-label" style={{whiteSpace:'nowrap'}}>Phân bổ chênh lệch {hasChotGia ? `(${diffTM >= 0 ? '+' : ''}${dinhDangSo(diffTM, 1)}đ${donViTM})` : ''}</label>
              <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                <span style={{fontSize:'0.78rem', whiteSpace:'nowrap'}}>Hoa hồng</span>
                <input
                  className="form-input"
                  type="text"
                  inputMode="decimal"
                  style={{flex: 1, textAlign:'right', minWidth:0}}
                  value={giaTriNhapHoaHongTM}
                  onBlur={() => datPhanBoDangNhap({ field: null, value: '' })}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/-/g, '');
                    if (raw.trim() === '') {
                      datPhanBoDangNhap({ field: 'commission', value: '' });
                      setPhanBoCongTy(0);
                      return;
                    }
                    const hoaHong = Number(raw.replace(',', '.'));
                    if (!Number.isFinite(hoaHong)) {
                      datPhanBoDangNhap({ field: 'commission', value: raw });
                      return;
                    }
                    const nextHoaHong = donViPhanBo === 'percent'
                      ? Math.min(100, Math.max(0, hoaHong))
                      : Math.max(0, hoaHong);
                    datPhanBoDangNhap({ field: 'commission', value: donViPhanBo === 'percent' && hoaHong > 100 ? '100' : raw });
                    setPhanBoCongTy(nextHoaHong);
                  }}
                  placeholder="0"
                />
                <span style={{fontSize:'0.78rem', whiteSpace:'nowrap'}}>Công ty</span>
                <input
                  className="form-input"
                  type="text"
                  inputMode="decimal"
                  style={{
                    flex: 1,
                    textAlign:'right',
                    minWidth:0,
                    background: 'var(--subtle, #f8fafc)',
                    color: coLoiPhanBoTM ? '#dc2626' : undefined,
                    fontWeight: coLoiPhanBoTM ? 700 : undefined,
                    borderColor: coLoiPhanBoTM ? '#dc2626' : undefined,
                  }}
                  value={giaTriNhapCongTyTM}
                  readOnly
                  aria-readonly="true"
                />
                <select
                  className="form-input"
                  style={{width:'62px', padding:'6px 2px', flexShrink:0}}
                  value={donViPhanBo}
                  onChange={(e) => {
                    const next = e.target.value as 'vnd' | 'percent';
                    if (hasChotGia && diffTM !== 0) {
                        const absDiff = Math.abs(diffTM);
                        setPhanBoCongTy(next === 'percent'
                          ? Math.min(100, +(donViPhanBo === 'vnd' && absDiff > 0 ? (phanBoCongTy / absDiff * 100) : phanBoCongTy).toFixed(1))
                          : +(donViPhanBo === 'percent' ? (phanBoCongTy * absDiff / 100) : phanBoCongTy).toFixed(1));
                      }
                    datPhanBoDangNhap({ field: null, value: '' });
                    setDonViPhanBo(next);
                  }}
                >
                  <option value="vnd">VNĐ</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>
            {loadedItem ? (
              <>
                {loadedItem?.canUpdate === true && (
                  <button
                    className="btn btn-sm btn-green"
                    style={{ marginBottom: 0, height: '40px' }}
                    title="Cập nhật bảng tính giá hiện tại"
                    onClick={() => luuMotaBaoGia('capNhat')}
                  >
                    🔄 Cập nhật
                  </button>
                )}
                <button
                  className="btn btn-sm btn-green"
                  style={{ marginBottom: 0, height: '40px' }}
                  title="Tạo bảng tính giá mới"
                  onClick={() => luuMotaBaoGia('moi')}
                >
                  📄 Lưu mới
                </button>
              </>
            ) : (
              <button
                className="btn btn-sm btn-green"
                style={{ marginBottom: 0, height: '40px' }}
                title="Lưu bảng tính giá vào lịch sử"
                onClick={() => luuMotaBaoGia('moi')}
              >
                💾 Lưu báo giá
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ marginBottom: 0, height: '40px' }}
              title="Xem chi tiết bảng tính (A4)"
              onClick={xuLyXemChiTietTM}
            >
              👁 Xem
            </button>
          </div>

          <div id="chotAnalysis">
            {hasChotGia ? (
              <div className={`chot-analysis ${diffTM >= 0 ? 'positive' : 'negative'}`}>
                <div className="chot-row">
                  <span className="chot-label">{diffTM >= 0 ? '✅' : '⚠️'} Chênh lệch / {donViTMGoc}</span>
                  <span className="chot-value">{diffTM >= 0 ? '+' : ''}{dinhDangSo(diffTM, 1)} đ/{donViTMGoc}</span>
                </div>
                <div className="chot-row" style={{fontSize:'0.82rem', color:'var(--muted)'}}>
                  <span className="chot-label">
                    {donViPhanBo === 'percent'
                      ? <>↳ Hoa hồng: {dinhDangSo(hienThiPhanBoChotGia.hoaHongDisplay, 1)}% = {dinhDangSo(hienThiPhanBoChotGia.hoaHongAmount, 1)}đ | Công ty: {dinhDangSo(hienThiPhanBoChotGia.congTyDisplay, 1)}% = {dinhDangSo(hienThiPhanBoChotGia.congTyAmount, 1)}đ</>
                      : <>↳ Hoa hồng: {dinhDangSo(phanBoHoaHongTM, 1)}đ | Công ty: {dinhDangSo(hienThiPhanBoChotGia.congTyAmount, 1)}đ</>}
                  </span>
                </div>
                {hienThiPhanBoChotGia.loi.map((msg, index) => (
                  <div key={index} className="chot-row" style={{fontSize:'0.82rem', color: '#b45309'}}>
                    <span className="chot-label">⚠ {msg}</span>
                  </div>
                ))}
                <div className="chot-row" style={{fontWeight:700}}>
                  <span className="chot-label">Doanh thu tổng</span>
                  <span className="chot-value">{dinhDangSo(shownPriceTM)} đ/{donViTMGoc} × {dinhDangSo(soLuongTM)} {donViTMGoc} = {dinhDangSo(doanhThuChotTM)} đ</span>
                </div>
                <div className="chot-row">
                  <span className="chot-label">LN công ty ({dinhDangPhanTram(pctLoiNhuanCongTyChotTM)})</span>
                  <span className="chot-value">{dinhDangSo(loiNhuanCongTyChotTM)} đ</span>
                </div>
                <div className="chot-row">
                  <span className="chot-label">% Hoa hồng ({dinhDangPhanTram(commissionPctShownTM)})</span>
                  <span className="chot-value">{dinhDangSo(tongHoaHongChotTM)} đ</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="stat-grid" id="s-stats">
            <div className="stat-card green">
              <div className="stat-label">Lợi nhuận</div>
              <div className="stat-value" style={{fontSize: '1.15rem'}}>
                {dinhDangSo(kqTM.profitVnd)}đ <span style={{fontSize: '0.85rem'}}>({dinhDangPhanTram(kqTM.profitPct)})</span>
              </div>
            </div>
            <div className="stat-card cyan">
              <div className="stat-label">Doanh thu</div>
              <div className="stat-value">{dinhDangSo(doanhThuTM)} đ</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-label">Giá Bán{donViTM}</div>
              <div className="stat-value">{dinhDangSo(giaDeXuatTM, 0)} đ</div>
            </div>
            <div className="stat-card pink">
              <div className="stat-label">Hoa hồng</div>
              <div className="stat-value" style={{fontSize: '1.15rem'}}>
                {dinhDangSo(hoaHongTongTM)} đ
                <div style={{fontSize:'0.85rem', fontWeight:'normal', marginTop:'4px'}}>
                  {dinhDangSo(hoaHongPerUnit, 1)} đ{donViTM} ({dinhDangPhanTram(hoaHongPctTM)})
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Chi tiết giá đề xuất ═══ */}
          <TheThuGon
            resetKey={`${kqTM.unitPriceVnd}|${soLuongTM}|${kqTM.profitRawValue}|${input.paymentDays}|${input.commissionInputValue}|${input.commissionUnit}|${input.shippingPerKm}|${input.shippingKm}|${input.boxPrice}|${input.bagsPerBox}|${giaChotHienTai}`}
            style={{ marginBottom: '14px' }}
            title={<><span className="icon">💰</span> Chi tiết giá {hasChotGia ? 'chốt' : 'đề xuất'}{donViTM ? ` ${donViTM}` : ''}</>}
          >
            <ul className="breakdown-list" id="s-breakdown">
              <li><span className="bl-label">Đơn giá mua</span><span className="bl-value">{dinhDangSo(kqTM.purchasePrice, 0)} đ{donViTM}</span></li>
              <li><span className="bl-label">Lợi nhuận</span><span className="bl-value">{lnLabel}</span></li>
              {kqTM.extraFee > 0 && (
                <li><span className="bl-label">Phụ phí khác</span><span className="bl-value">{dinhDangSo(kqTM.extraFeePerUnit, 0)} đ{donViTM}</span></li>
              )}
              {phiVC > 0 && (
                <li><span className="bl-label">Vận chuyển / đơn vị</span><span className="bl-value">{dinhDangSo(vcPerUnit, 0)} đ{donViTM}</span></li>
              )}
              {thungPerUnit > 0 && (
                <li><span className="bl-label">Phí thùng / đơn vị</span><span className="bl-value">{dinhDangSo(thungPerUnit, 0)} đ{donViTM}</span></li>
              )}
              {laiVayPerUnit > 0 && (
                <li><span className="bl-label">Lãi vay vốn ({dinhDangSo((hangSo.interestBase || 0) + (hangSo.interestSpread || 0), 2)}%/năm · {input.paymentDays ?? 30} ngày)</span><span className="bl-value">{dinhDangSo(laiVayPerUnit, 0)} đ{donViTM}</span></li>
              )}
              {hoaHongPerUnit > 0 && (
                <li><span className="bl-label">Hoa hồng kinh doanh</span><span className="bl-value">{dinhDangSo(hoaHongPerUnit, 0)} đ{donViTM}</span></li>
              )}
              <li className="bl-total">
                <span className="bl-label" style={{ color: 'var(--orange)' }}>GIÁ ĐỀ XUẤT{donViTM ? ` ${donViTM.toUpperCase()}` : ''}</span>
                <span className="bl-value" style={{ color: 'var(--orange)' }}>{laCoSL ? `${dinhDangSo(tongCongPerUnit, 0)} đ` : '—'}</span>
              </li>
              {hasChotGia && (
                <li className="bl-total" style={{borderTop: '1px dashed var(--border)', marginTop: '6px', paddingTop: '8px'}}>
                  <span className="bl-label" style={{color:'var(--green)'}}>GIÁ BÁN CHỐT{donViTM ? ` ${donViTM.toUpperCase()}` : ''}</span>
                  <span className="bl-value" style={{color:'var(--green)'}}>
                    {dinhDangSo(chotGiaNum, 0)} đ
                    <span style={{fontSize:'0.75em', fontWeight:400, marginLeft:'8px', color: diffTM >= 0 ? 'var(--green)' : 'var(--red)'}}>
                      ({diffTM >= 0 ? '+' : ''}{dinhDangSo(diffTM, 0)} đ)
                    </span>
                  </span>
                </li>
              )}
              {laCoSL && (
                <li style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--muted)' }}>
                  × {dinhDangSo(soLuongTM, 0)} {donViTMGoc} = <strong style={{ color: 'var(--text)' }}>{dinhDangSo(tongCongPerUnit * soLuongTM, 0)} đ</strong> tổng lô
                </li>
              )}
            </ul>
          </TheThuGon>

          {/* ═══ Trọng lượng & Vận chuyển ═══ */}
          <TheThuGon
            resetKey={`${trongLuongMoiDonVi}|${soLuongTM}|${phiVC}`}
            style={{ marginTop: '14px' }}
            title={<><span className="icon">⚖️</span> Trọng lượng &amp; Vận chuyển</>}
          >
            <ul className="breakdown-list" id="m-t-weight">
              <li><span className="bl-label">Trọng lượng / đơn vị</span><span className="bl-value">{trongLuongMoiDonVi > 0 ? `${dinhDangSo(trongLuongMoiDonVi, 2)} gr` : '— (nhập ở Thu mua)'}</span></li>
              <li><span className="bl-label">Tổng trọng lượng đơn hàng</span><span className="bl-value">{soLuongTM * trongLuongMoiDonVi > 0 ? `${dinhDangSo((soLuongTM * trongLuongMoiDonVi) / 1000, 1)} kg` : '—'}</span></li>
              <li><span className="bl-label">Trọng lượng thùng ({dinhDangSo(soLuongThung, 0)} thùng × {dinhDangSo(trongLuongThung, 0)} gr)</span><span className="bl-value">{trongLuongThungTongGr > 0 ? `${dinhDangSo(trongLuongThungTongGr / 1000, 1)} kg` : '—'}</span></li>
              <li><span className="bl-label">Vận chuyển tổng lô</span><span className="bl-value">{tongTrongLuongKg > 0 ? `${dinhDangSo(tongTrongLuongKg, 1)} kg` : '—'}</span></li>
              <li><span className="bl-label">Trọng lượng (tấn)</span><span className="bl-value">{tongTrongLuongTan > 0 ? `${dinhDangSo(tongTrongLuongTan, 3)} tấn` : '—'}</span></li>
              <li><span className="bl-label">Vận chuyển (tổng phí)</span><span className="bl-value">{phiVC > 0 ? `${dinhDangSo(phiVC, 0)} đ` : '— (nhập đ/km × km ở Phụ phí)'}</span></li>
              {laCoSL && phiVC > 0 && (
                <li><span className="bl-label">Vận chuyển / đơn vị</span><span className="bl-value">{dinhDangSo(vcPerUnit, 0)} đ{donViTM}</span></li>
              )}
            </ul>
          </TheThuGon>

          {/* ═══ Mô tả báo giá (nội dung textarea ở form) ═══ */}
          {chuoiMotaTM && (
            <TheThuGon
              resetKey="commercial-description"
              giuTrangThaiKhiReset
              moDinh
              style={{ marginTop: '14px' }}
              title={<><span className="icon">📝</span> Mô tả báo giá</>}
            >
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6 }}>
                {chuoiMotaTM}
              </div>
            </TheThuGon>
          )}
        </div>
      </div>
    );
  }

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

  const engineOverrideParams = {
    numColors: dauVaoKq.numColors ?? 0,
    coverageRatio: dauVaoKq.coverageRatio ?? 1,
    metallicSurcharge: dauVaoKq.metallicSurcharge ?? 0,
    laborCost: hangSo.laborCost ?? 0,
    isPrintFilm: hienThiGia.isPrintFilm,
    printFilmInkBOPP: hangSo.printFilmInkPriceBopp ?? 150,
    printFilmInkOther: hangSo.printFilmInkPriceOther ?? 200,
  };

  const printFilmOverrideParams = hienThiGia.isPrintFilm ? {
    numColors: dauVaoKq.numColors ?? 0,
    setupMin: hangSo.printFilmSetupMinutesPerColor ?? 20,
    setupDiv: hangSo.printFilmSetupHourDivisor ?? 60,
    threshold: hangSo.printFilmLengthThreshold ?? 40000,
    speed: hangSo.printFilmShortRunSpeed ?? 7500,
    laborPerHr: hangSo.printFilmLaborCostPerHour ?? 1200000,
  } : undefined;

  const { uniRows: cacDongSanXuat, totalCPSX: tongCPSX, totalCPVL: tongCPVL, grandTotal: tongCong } = lapDongSanXuat(r, hangSoNc);
  const cpTheoThoiGianIn = cacDongSanXuat.find(row => (row.printFilmCost ?? 0) > 0)?.printFilmCost ?? 0;

  // ── Tab nâng cấp: giá mỗi sản phẩm lấy từ TỔNG bảng đặc tả nâng cao ──
  const ketQuaNangCao = nangCap
    ? tinhKetQuaNangCaoHieuLuc({
        result: r,
        uniRows: cacDongSanXuat,
        constants: hangSoNc,
        materials,
        saleOverrides: ghiDeSale,
        adminOverrides: ghiDeAdmin,
        // LN% ghi đè Sale/Admin chỉ preview trong tab — màn hình giá luôn theo LN hệ thống
        saleProfitRatePct: 0,
        adminProfitRatePct: 0,
        profitTable: bangLoiNhuan,
      })
    : null;
  const rHieuLuc = ketQuaNangCao ? ketQuaNangCao.result : r;

  // Snapshot LN khi mở sheet đã lưu: thẻ "Lợi nhuận" phải giữ nguyên rate+amount
  // dù admin có sửa bảng LN ở Cấu hình. Item cũ chưa có profitAmount → fallback live.
  const laSheetDaLuu = !!loadedItem;
  const tongChiPhiSXHieuLuc = rHieuLuc.totalProductionCost;
  const tyLeLoiNhuanHieuLuc = laSheetDaLuu
    ? (loadedItem!.profitRate ?? rHieuLuc.profitRate)
    : rHieuLuc.profitRate;
  const tienLoiNhuanHieuLuc = laSheetDaLuu
    ? (loadedItem!.profitAmount ?? rHieuLuc.profitAmount)
    : rHieuLuc.profitAmount;
  // LN hệ thống — thẻ LN trên cùng không bị ảnh hưởng bởi Sale/Admin
  // (dùng engine gốc `r` theo bảng LN, không hút % ghi đè Sale/Admin)
  const tyLeLoiNhuanGoc = laSheetDaLuu
    ? (loadedItem!.profitRate ?? r.profitRate)
    : r.profitRate;
  const tienLoiNhuanGoc = laSheetDaLuu
    ? (loadedItem!.profitAmount ?? r.profitAmount)
    : r.profitAmount;
  const giaVonDonViHieuLuc = rHieuLuc.costPerUnit;

  // Key dùng để reset tất cả collapsible về đóng mỗi khi có kết quả tính mới
  // (dùng giaVonDonViHieuLuc tạm, effFinalPriceWithComm sẽ được tính ở phần breakdown bên dưới)
  const khoaKetQua = `${giaVonDonViHieuLuc}|${dauVaoKq.quantity}|${rHieuLuc.totalThickness}|${dauVaoKq.spreadWidth}|${dauVaoKq.cutStep}`;
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
    'xephong_giua': 'Xếp hông dán lưng giữa', 'dayDung': 'Đáy đứng', 'cutSeal': 'Cut seal',
    'cutSealNapKeo': 'Cut seal mở miệng có nắp keo'
  };
  let chuoiLoaiTui = tenLoaiTui[dauVaoKq.bagType] || '';
  if (!laMang && chuoiLoaiTui) {
    if (dauVaoKq.hasTape && dauVaoKq.bagType === 'cutSeal') {
      chuoiLoaiTui = 'Cut seal mở miệng có nắp keo';
    }
    if (dauVaoKq.hasZipper) {
      chuoiLoaiTui = 'Zipper ' + chuoiLoaiTui;
    }
  } else if (laMang) {
    chuoiLoaiTui = tenLoaiMang[dauVaoKq.filmType] || 'Màng cuộn';
  }

  const cylPerUnit = rHieuLuc.cylinderCostPerUnit;
  const numTr = dauVaoKq.numColors || 0;
  const cylTotal = rHieuLuc.cylinderCost;
  const laMangIn = hienThiGia.isPrintFilm;

  // Commission từ engine gốc (không bị ảnh hưởng bởi admin/sale override)
  const effCommissionPerUnit = rHieuLuc.commissionPerUnit;

  // Tính giá Thương mại — override giá bán nếu user chọn mode=form.
  // BIG price = đơn giá cuối / đơn vị (để khớp với cách hiển thị đ/túi, đ/m² hiện tại).
  const ketQuaThuongMaiHieuLuc = isCommercial && commercialMode === 'form'
    ? (ketQuaThuongMai ?? tinhGiaThuongMai(input))
    : null;

  // Label LN cho breakdown "Vốn + X% LN" — ưu tiên commercial's LN (user nhập ở [Thu mua]).
  // Format A: VND primary → "20₫/sp (= 10,00%)" | % primary → "10,00%".
  // profitRawValue là số user nhập trực tiếp (10 = 10%, KHÔNG phải decimal 0.1) — KHÔNG dùng dinhDangPhanTram (× 100).
  const lnLabelThuongMai = ketQuaThuongMaiHieuLuc
    ? (ketQuaThuongMaiHieuLuc.profitUnit === 'percent'
        ? `${dinhDangSo(ketQuaThuongMaiHieuLuc.profitRawValue, 2)}%`
        : `${dinhDangSo(ketQuaThuongMaiHieuLuc.profitRawValue, 0)} đ${ketQuaThuongMaiHieuLuc.unitLabel} (= ${dinhDangSo(ketQuaThuongMaiHieuLuc.profitPct * 100, 2)}%)`)
    : `${dinhDangPhanTram(tyLeLoiNhuanHieuLuc)}%`;

  // ── Breakdown items ──
  // Commercial-form: dòng 1 dùng commercial's unitPriceVnd (mua + LN/sp, KHÔNG gồm extraFee & chi phí engine).
  // Nội bộ / Gia công: giữ nguyên giaVonDonViHieuLuc.
  const giaVonDauDong = ketQuaThuongMaiHieuLuc
    ? ketQuaThuongMaiHieuLuc.unitPriceVnd
    : giaVonDonViHieuLuc;

  const breakdownItems: [string, string][] = [
    [`${hienThiGia.initialPriceLabel} (Vốn + ${lnLabelThuongMai} LN)`, dinhDangSo(giaVonDauDong, 1) + ' đ'],
  ];
  if (dauVaoKq.hasTape) breakdownItems.push(['Chi phí Băng keo', dinhDangSo(rHieuLuc.tapePerUnit, 1) + ' đ']);
  if (dauVaoKq.hasHandle) breakdownItems.push(['Chi phí Quai', dinhDangSo(rHieuLuc.handlePerUnit, 1) + ' đ']);
  breakdownItems.push(
    [laMang ? 'Chi phí Đóng gói' : 'Chi phí Thùng giấy', dinhDangSo(rHieuLuc.boxPerUnit, 1) + ' đ'],
    [hienThiGia.shippingLabel, laMangIn ? `${dinhDangSo(rHieuLuc.shippingTotal, 0)} đ · ${dinhDangSo(rHieuLuc.shippingPerUnit, 1)} đ/${nhanDonVi}` : dinhDangSo(rHieuLuc.shippingPerUnit, 1) + ' đ'],
    [hienThiGia.interestLabel(rHieuLuc.interestBase || 0, rHieuLuc.paymentDays ?? dauVaoKq.paymentDays ?? 30), dinhDangSo(rHieuLuc.interestPerUnit, 1) + ` đ${laMangIn ? `/${nhanDonVi}` : ''}`],
    ['Hoa hồng kinh doanh', dinhDangSo(effCommissionPerUnit, 1) + ' đ']
  );

  if ((rHieuLuc.gcShippingPerUnit ?? 0) > 0) {
    breakdownItems.push(['Vận chuyển (gia công)', dinhDangSo(rHieuLuc.gcShippingPerUnit ?? 0, 1) + ' đ']);
  }
  if ((rHieuLuc.gcPackagingPerUnit ?? 0) > 0) {
    breakdownItems.push(['Đóng gói (gia công)', dinhDangSo(rHieuLuc.gcPackagingPerUnit ?? 0, 1) + ' đ']);
  }
  if ((rHieuLuc.gcOtherPerUnit ?? 0) > 0) {
    breakdownItems.push(['Phụ phí khác (gia công)', dinhDangSo(rHieuLuc.gcOtherPerUnit ?? 0, 1) + ' đ']);
  }
  if (dauVaoKq.cylIncluded && (rHieuLuc.cylAllocPerUnit ?? 0) > 0) {
    breakdownItems.push([`Trục in phân bổ (bao trục / 200k m²)`, dinhDangSo(rHieuLuc.cylAllocPerUnit ?? 0, 2) + ' đ']);
  }
  // Commercial-form: dòng Phụ phí khác (tách riêng, không chịu HH, cộng vào tổng).
  if (ketQuaThuongMaiHieuLuc && ketQuaThuongMaiHieuLuc.extraFee > 0) {
    breakdownItems.push(['Phụ phí khác', dinhDangSo(ketQuaThuongMaiHieuLuc.extraFeePerUnit, 1) + ' đ']);
  }

  // Tổng per-unit = sum tất cả dòng breakdown (không parse string, dùng numeric trực tiếp).
  // Commercial-form: dùng tổng này cho cả card lớn & breakdown "GIÁ BÁN ĐỀ XUẤT" (đã bao gồm Thùng/VC/Lãi vay/HH/Phụ phí).
  // Nội bộ / Gia công: giữ rHieuLuc.finalPrice (engine final price).
  const tongBreakdown =
    giaVonDauDong
    + (dauVaoKq.hasTape ? rHieuLuc.tapePerUnit : 0)
    + (dauVaoKq.hasHandle ? rHieuLuc.handlePerUnit : 0)
    + rHieuLuc.boxPerUnit
    + rHieuLuc.shippingPerUnit
    + rHieuLuc.interestPerUnit
    + effCommissionPerUnit
    + (rHieuLuc.gcShippingPerUnit ?? 0)
    + (rHieuLuc.gcPackagingPerUnit ?? 0)
    + (rHieuLuc.gcOtherPerUnit ?? 0)
    + (dauVaoKq.cylIncluded ? (rHieuLuc.cylAllocPerUnit ?? 0) : 0)
    + (ketQuaThuongMaiHieuLuc?.extraFeePerUnit ?? 0);

  const cylAllocTotal = dauVaoKq.cylIncluded ? ((rHieuLuc.cylAllocPerUnit ?? 0) * dauVaoKq.quantity) : 0;
  const totalCommission = effCommissionPerUnit * dauVaoKq.quantity;
  const commissionPct = tongChiPhiSXHieuLuc > 0 ? (effCommissionPerUnit * dauVaoKq.quantity / tongChiPhiSXHieuLuc) : 0;
  const chotGiaNum = giaChotHienTai || 0;
  const hasChotGia = chotGiaNum > 0;
  // Tính giá Thương mại — override giá bán nếu user chọn mode=form.
  // BIG price = đơn giá cuối / đơn vị (để khớp với cách hiển thị đ/túi, đ/m² hiện tại).
  // (ketQuaThuongMaiHieuLuc đã được khai báo ở trên — phục vụ breakdown label)
  // Giá cuối cùng từ engine gốc (hoặc TỔNG breakdown khi commercial-form: mua + LN + Thùng + VC + Lãi vay + HH + Phụ phí).
  const effFinalPriceWithComm = ketQuaThuongMaiHieuLuc ? tongBreakdown : rHieuLuc.finalPrice;
  // ── Giá đề xuất hiển thị ──
  // Mở lại sheet NC đã lưu (chưa chỉnh input / chưa đụng ô ghi đè nào của Sale hay Admin)
  // → giữ đúng giá snapshot lúc lưu, không bị cuốn theo cấu hình hệ thống đã đổi sau đó.
  const {
    dongBang: dongBangGiaDeXuat,
    giaDeXuat: giaDeXuatHienThi,
    coLechCauHinh: coLechGiaDeXuatLuu,
  } = tinhGiaDeXuatHienThi({
    nangCap,
    loadedItem,
    isDirty,
    saleOverrides: ghiDeSale,
    adminOverrides: ghiDeAdmin,
    giaTinhLai: effFinalPriceWithComm,
  });
  const shownPrice = hasChotGia ? chotGiaNum : giaDeXuatHienThi;
  const diff = hasChotGia ? chotGiaNum - giaDeXuatHienThi : 0;
  const hienThiPhanBoChotGia = tinhNhapPhanBoChotGia({
    hasChotGia,
    diff,
    hoaHongNhap: phanBoCongTy,
    hoaHongEngine: effCommissionPerUnit,
    donViPhanBo,
  });
  const phanBoHoaHong = hienThiPhanBoChotGia.hoaHongAmount;
  const canhBaoPhanBoChotGia = hienThiPhanBoChotGia.loi;
  const coLoiPhanBo = canhBaoPhanBoChotGia.length > 0;
  const giaTriNhapCongTy = coLoiPhanBo
    ? 'Lỗi phân bổ'
    : dinhDangSo(hienThiPhanBoChotGia.congTyDisplay, 1);
  const giaTriNhapHoaHong = phanBoDangNhap.field === 'commission'
    ? phanBoDangNhap.value
    : String(+(hienThiPhanBoChotGia.hoaHongDisplay).toFixed(1));
  const hoaHongAllocation = phanBoHoaHong;
  const rawNewCommission = effCommissionPerUnit + hoaHongAllocation;
  const profitDropFromChot = rawNewCommission < 0 ? Math.abs(rawNewCommission) * dauVaoKq.quantity : 0;
  const profitDropPct = rawNewCommission < 0 && tienLoiNhuanHieuLuc > 0 ? (profitDropFromChot / tienLoiNhuanHieuLuc) : 0;
  const newCommissionPerUnit = Math.max(0, rawNewCommission);
  const doanhThuChot = shownPrice * dauVaoKq.quantity;
  const tongHoaHongChot = newCommissionPerUnit * dauVaoKq.quantity;
  // Giá đề xuất KHÔNG còn cộng tiền zipper — ngoại lệ GC làm túi "chưa gộp zipper"
  // (tiền zipper rời mua giao bên GC vẫn nằm trong zipperPerUnit/zipperTotal của engine).
  const coGcChuaGomZipper =
    dauVaoKq.pricingMode === 'outsource' &&
    (dauVaoKq.outsource?.steps ?? []).includes('bag') &&
    dauVaoKq.outsource?.bag?.zipperMode === 'excluded';
  const tienZipperHieuLuc = coGcChuaGomZipper ? rHieuLuc.zipperTotal : 0;
  const tienZipperPerDonVi = coGcChuaGomZipper ? rHieuLuc.zipperPerUnit : 0;
  const tongChiPhi = tongChiPhiSXHieuLuc + tienZipperHieuLuc + rHieuLuc.tapeTotal + rHieuLuc.handleTotal + rHieuLuc.boxTotal + rHieuLuc.shippingTotal + (rHieuLuc.interestPerUnit * dauVaoKq.quantity) + cylAllocTotal + (rHieuLuc.gcShippingTotal ?? 0) + (rHieuLuc.gcPackagingTotal ?? 0) + (rHieuLuc.gcOtherTotal ?? 0);
  const loiNhuanCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
  const pctLoiNhuanCongTyChot = tongChiPhiSXHieuLuc > 0 ? (loiNhuanCongTyChot / tongChiPhiSXHieuLuc) : 0;
  const commissionPctShown = tongChiPhiSXHieuLuc > 0 ? (newCommissionPerUnit * dauVaoKq.quantity / tongChiPhiSXHieuLuc) : 0;
  const tinhGiaSauGhiDeDonVi = (saleOverrides: OverrideTable, adminOverrides: OverrideTable, spPct = 0, apPct = 0) => {
    const { effCostPerUnit, effTotalProdCost } = tinhGiaHieuLuc({
      result: r,
      uniRows: cacDongSanXuat,
      saleOverrides,
      adminOverrides,
      saleProfitRatePct: spPct,
      adminProfitRatePct: apPct,
      profitTable: bangLoiNhuan,
      constants: hangSoNc,
      materials,
    });
    const hoaHongDonVi = dauVaoKq.commissionFixedVND > 0
      ? dauVaoKq.commissionFixedVND
      : dauVaoKq.commissionRate * (dauVaoKq.quantity > 0 ? effTotalProdCost / dauVaoKq.quantity : 0);
    const giaDonVi = effCostPerUnit
      + tienZipperPerDonVi + rHieuLuc.tapePerUnit + rHieuLuc.handlePerUnit
      + rHieuLuc.boxPerUnit + rHieuLuc.shippingPerUnit + rHieuLuc.interestPerUnit + hoaHongDonVi
      + (rHieuLuc.cylAllocPerUnit ?? 0)
      + (rHieuLuc.gcShippingPerUnit ?? 0) + (rHieuLuc.gcPackagingPerUnit ?? 0) + (rHieuLuc.gcOtherPerUnit ?? 0);
    return { giaDonVi, tongChiPhiSX: effTotalProdCost };
  };
  const saleResult = tinhGiaSauGhiDeDonVi(ghiDeSale, {}, saleProfitRatePct, 0);
  const giaSauGhiDeSaleDonVi = saleResult.giaDonVi;
  const tongCPSXSale = saleResult.tongChiPhiSX;
  const adminResult = tinhGiaSauGhiDeDonVi({}, ghiDeAdmin, 0, adminProfitRatePct);
  const giaSauGhiDeAdminDonVi = adminResult.giaDonVi;
  const tongCPSXAdmin = adminResult.tongChiPhiSX;
  const donViChenhLechGia = laMang ? 'm2' : 'tui';
  const saleBaseRate = nangCap
    ? tinhKetQuaNangCaoHieuLuc({
        result: r, uniRows: cacDongSanXuat, constants: hangSoNc, materials,
        saleOverrides: ghiDeSale, adminOverrides: {},
        saleProfitRatePct: 0, adminProfitRatePct: 0,
        profitTable: bangLoiNhuan,
      }).tyLeLoiNhuan
    : tinhGiaHieuLuc({
        result: r, uniRows: cacDongSanXuat,
        saleOverrides: ghiDeSale, adminOverrides: {},
        saleProfitRatePct: 0, adminProfitRatePct: 0,
        profitTable: bangLoiNhuan, constants: hangSo, materials,
      }).effProfitRate;
  const adminBaseRate = nangCap
    ? tinhKetQuaNangCaoHieuLuc({
        result: r, uniRows: cacDongSanXuat, constants: hangSoNc, materials,
        saleOverrides: {}, adminOverrides: ghiDeAdmin,
        saleProfitRatePct: 0, adminProfitRatePct: 0,
        profitTable: bangLoiNhuan,
      }).tyLeLoiNhuan
    : tinhGiaHieuLuc({
        result: r, uniRows: cacDongSanXuat,
        saleOverrides: {}, adminOverrides: ghiDeAdmin,
        saleProfitRatePct: 0, adminProfitRatePct: 0,
        profitTable: bangLoiNhuan, constants: hangSo, materials,
      }).effProfitRate;
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
  if (rHieuLuc.layers.print && rHieuLuc.layers.print.material) matCols.push({ type: 'print', name: rHieuLuc.layers.print.material.name.split(' ')[0], fullName: rHieuLuc.layers.print.material.name });
  if (rHieuLuc.layers.laminations) {
    rHieuLuc.layers.laminations.forEach((lam: any) => {
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
    if (!res) return { qty, res, isCurrent: qty === currentQty };
    // Tab nâng cấp: mỗi mức SL tính lại bảng đặc tả nâng cao → giá mới
    // (LN% ghi đè Sale/Admin chỉ preview trong tab — MOQ theo LN hệ thống)
    const resHieuLuc = nangCap
      ? tinhKetQuaNangCaoHieuLuc({
          result: res,
          uniRows: lapDongSanXuat(res, hangSoNc).uniRows,
          constants: hangSoNc,
          materials,
          saleOverrides: ghiDeSale,
          adminOverrides: ghiDeAdmin,
          saleProfitRatePct: 0,
          adminProfitRatePct: 0,
          profitTable: bangLoiNhuan,
        }).result
      : res;
    return { qty, res: resHieuLuc, isCurrent: qty === currentQty };
  }).filter(x => x.res);

  // ── Roll MOQ Table ──
  const rollOptions = matCols;
  const getRollColId = (col: any) => (col.type === 'print' ? 'print' : `lam-${col.layerNum}`);
  const selectedCol = rollOptions.find((c) => getRollColId(c) === vatLieuCuonDangChon) || rollOptions[0];
  const selectedData = selectedCol ? getLayerData(r, selectedCol) : null;
  const selectedMat = selectedData?.material;
  const isKgBase = !laMang && !!selectedMat && (selectedMat.name.toUpperCase().includes('LLDPE') || selectedMat.name.toUpperCase() === 'PE');
  const rollLevels = isKgBase ? [200, 300, 400, 500, 600, 700] : [1, 2, 3, 4, 5, 6];
  const rollLen = laMang ? (selectedMat?.rollLength || chieuDaiCuonMang) : (selectedMat?.rollLength || 6000);
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
    const areaM2 = laMang ? availableMeters * (dauVaoKq.spreadWidth || 0) * (dauVaoKq.numImages || 1) : 0;
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
  const trongLuongThungTongGr = !laMang && (dauVaoKq.bagsPerBox || 0) > 0
    ? (dauVaoKq.quantity / dauVaoKq.bagsPerBox) * (dauVaoKq.boxWeight || 0)
    : 0;
  const weightItems: [string, string][] = [
    [laMang ? 'Diện tích băng (m²/m dài)' : `Diện tích 1 ${nhanDonVi}`, dinhDangM2(rHieuLuc.bagArea)],
    ['Tổng diện tích đơn hàng', dinhDangSo(rHieuLuc.totalArea, 1) + ' m²'],
    ...(!laMang ? [
      [`Trọng lượng / ${nhanDonVi} (Tare)`, dinhDangSo(rHieuLuc.tareWeight, 2) + ' gr'] as [string, string],
      [`Khối lượng thùng quy đổi (${dinhDangSo(trongLuongThungTongGr / 1000, 1)} kg tổng thùng)`, dinhDangSo((dauVaoKq.boxWeight || 0) / (dauVaoKq.bagsPerBox || 1), 2) + ' gr'] as [string, string],
      ['Vận chuyển tổng lô (đơn hàng + thùng)', dinhDangSo(rHieuLuc.tareWeight * dauVaoKq.quantity / 1000, 1) + ' kg'] as [string, string],
      ['Trọng lượng (tấn)', dinhDangSo(rHieuLuc.tareWeight * dauVaoKq.quantity / 1000000, 3) + ' tấn'] as [string, string],
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
                  (giá đề xuất {dinhDangSo(giaDeXuatHienThi, 0)} đ/{nhanDonVi})
                </div>
              )}
              {dongBangGiaDeXuat && coLechGiaDeXuatLuu && (
                <div style={{fontSize:'0.78rem', color:'var(--muted)', marginTop:'4px', marginBottom:'2px'}}>
                  (giá giữ nguyên theo bảng tính đã lưu — đơn giá/định mức hệ thống đã đổi từ đó)
                </div>
              )}
              {dauVaoKq.cylIncluded && (rHieuLuc.cylAllocPerUnit ?? 0) > 0 && (
                <div style={{fontSize:'0.78rem', color:'var(--primary)', marginTop:'2px', fontWeight:600}}>
                  📌 Có bao trục (+{dinhDangSo(rHieuLuc.cylAllocPerUnit ?? 0, 2)} đ/{nhanDonVi})
                </div>
              )}
              <div className="unit">(chưa VAT)</div>

              {/* Giá cuộn cho màng — gộp giá cuộn + DT cuộn vào 1 ô */}
              {laMang && rHieuLuc.filmRollArea > 0 && (
                <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'12px 24px', marginTop:'12px', fontSize:'0.92rem'}}>
                  <div style={{background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 16px', textAlign:'center'}}>
                    <div style={{fontSize:'0.72rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.03em'}}>Giá / cuộn ({dinhDangSo(khoTraiMm)}mm × {dinhDangSo(chieuDaiCuonMang)}m)</div>
                    <div style={{fontWeight:700, color:'var(--green)', fontSize:'1.1rem'}}>{dinhDangSo(Math.round(shownPrice) * rHieuLuc.filmRollArea, 0)} đ</div>
                    <div style={{fontSize:'0.78rem', color:'var(--muted)', marginTop:'4px'}}>DT cuộn: {dinhDangSo(rHieuLuc.filmRollArea, 1)} m² · {dinhDangSo(Math.round(shownPrice), 0)} đ/m²</div>
                  </div>
                </div>
              )}

              <div className="sub" id="s-structure">
                <div style={{fontWeight:600, color:'var(--text)', fontSize:'1.05rem', marginBottom:'12px'}}>{dauVaoKq.customer} — {dauVaoKq.productName}</div>
                <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 20px', fontSize:'0.9rem', margin:'0 auto', maxWidth:'600px'}}>
                  <div><strong>Chất liệu:</strong> {rHieuLuc.structureText}</div>
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
                  <div><strong>Độ dày:</strong> {rHieuLuc.totalThickness} mic</div>
                  <div><strong>Diện tích {laMang ? 'băng' : '1 túi'}:</strong> {dinhDangM2(rHieuLuc.bagArea)}</div>
                  {!laMang && <div><strong>Trọng lượng:</strong> {dinhDangSo(rHieuLuc.tareWeight, 2)} gr</div>}
                  <div><strong>Loại {laMang ? 'màng' : 'túi'}:</strong> {chuoiLoaiTui}</div>
                  {laMang && (
                    <div><strong>Cuộn màng TP:</strong> {dinhDangSo(chieuDaiCuonMang)} m/cuộn ({dinhDangSo(rHieuLuc.filmRollArea, 1)} m²/cuộn)</div>
                  )}
                  {numTr > 0 && (
                    <div><strong>Trục in:</strong> D {dinhDangSo(rHieuLuc.cylLength * 1000)} mm x CV {dinhDangSo(rHieuLuc.cylCircum * 1000)} mm - {dinhDangSo(cylPerUnit)} đ/trục * {numTr} trục = {dinhDangSo(cylTotal)} đ</div>
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
                  <span style={{fontSize:'0.78rem', whiteSpace:'nowrap'}}>Hoa hồng</span>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    style={{flex: 1, textAlign:'right', minWidth:0}}
                    value={giaTriNhapHoaHong}
                    onBlur={() => datPhanBoDangNhap({ field: null, value: '' })}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/-/g, '');
                      if (raw.trim() === '') {
                        datPhanBoDangNhap({ field: 'commission', value: '' });
                        setPhanBoCongTy(0);
                        return;
                      }
                      const hoaHong = Number(raw.replace(',', '.'));
                      if (!Number.isFinite(hoaHong)) {
                        datPhanBoDangNhap({ field: 'commission', value: raw });
                        return;
                      }
                      const nextHoaHong = donViPhanBo === 'percent'
                        ? Math.min(100, Math.max(0, hoaHong))
                        : Math.max(0, hoaHong);
                      datPhanBoDangNhap({ field: 'commission', value: donViPhanBo === 'percent' && hoaHong > 100 ? '100' : raw });
                      setPhanBoCongTy(nextHoaHong);
                    }}
                    placeholder="0"
                  />
                  <span style={{fontSize:'0.78rem', whiteSpace:'nowrap'}}>Công ty</span>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    style={{
                      flex: 1,
                      textAlign:'right',
                      minWidth:0,
                      background: 'var(--subtle, #f8fafc)',
                      color: coLoiPhanBo ? '#dc2626' : undefined,
                      fontWeight: coLoiPhanBo ? 700 : undefined,
                      borderColor: coLoiPhanBo ? '#dc2626' : undefined,
                    }}
                    value={giaTriNhapCongTy}
                    readOnly
                    aria-readonly="true"
                  />
                  <select
                    className="form-input"
                    style={{width:'62px', padding:'6px 2px', flexShrink:0}}
                    value={donViPhanBo}
                    onChange={(e) => {
                      const next = e.target.value as 'vnd' | 'percent';
                      if (hasChotGia && diff !== 0) {
                          const absDiff = Math.abs(diff);
                          setPhanBoCongTy(next === 'percent'
                            ? Math.min(100, +(donViPhanBo === 'vnd' && absDiff > 0 ? (phanBoCongTy / absDiff * 100) : phanBoCongTy).toFixed(1))
                            : +(donViPhanBo === 'percent' ? (phanBoCongTy * absDiff / 100) : phanBoCongTy).toFixed(1));
                        }
                      datPhanBoDangNhap({ field: null, value: '' });
                      setDonViPhanBo(next);
                    }}
                  >
                    <option value="vnd">VNĐ</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
              {loadedItem ? (
                <>
                  {loadedItem?.canUpdate === true && (
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
                      const state = dungCuaHangTinhGia.getState();
                      const h = timMucLichSuTheoId(state.history, loadedHistoryId);
                      const syncAdvisor = coQuyenCoVanBangTinh(state.nguoiDungHienTai?.policies ?? []);
                      void syncPricingSheetToServer(h, isAuthenticated, accessToken, { syncAdvisor })
    .then(() => { dungCuaHangTinhGia.getState().taiLichSuTuServer(); });
                      const container = document.getElementById('toastContainer');
                      if (!container) return;
                      const toast = document.createElement('div');
                      toast.className = 'toast toast-clickable';
                      toast.innerHTML = '🔄 Đã cập nhật bảng tính giá! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>';
                      toast.addEventListener('click', () => { dieuHuongModuleApp('history_db'); toast.remove(); });
                      container.appendChild(toast);
                      setTimeout(() => toast.remove(), 5000);
                    }}
                  >
                    🔄 Cập nhật
                  </button>
                  )}
                  <button
                    className="btn btn-sm btn-green"
                    style={{marginBottom: 0, height: '40px'}}
                    title="Tạo bảng tính giá mới"
                    onClick={() => {
                      if (!(input.productName || '').trim()) {
                        alert('Vui lòng nhập tên sản phẩm trước khi lưu.');
                        return;
                      }
                      if (!kiemTraKhachHangQuyen()) return;
                      themVaoLichSu();
                      const stateMoi = dungCuaHangTinhGia.getState();
                      const newId = stateMoi.loadedHistoryId;
                      const h = timMucLichSuTheoId(stateMoi.history, newId);
                      const syncAdvisor = coQuyenCoVanBangTinh(stateMoi.nguoiDungHienTai?.policies ?? []);
                      void syncPricingSheetToServer(h, isAuthenticated, accessToken, { syncAdvisor })
    .then(() => { dungCuaHangTinhGia.getState().taiLichSuTuServer(); });
                      const container = document.getElementById('toastContainer');
                      if (!container) return;
                      const toast = document.createElement('div');
                      toast.className = 'toast toast-clickable';
                      toast.innerHTML = '💾 Đã lưu báo giá mới! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>';
                      toast.addEventListener('click', () => { dieuHuongModuleApp('history_db'); toast.remove(); });
                      container.appendChild(toast);
                      setTimeout(() => toast.remove(), 5000);
                    }}
                  >
                    📄 Lưu mới
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-sm btn-green"
                  style={{marginBottom: 0, height: '40px'}}
                    title="Lưu bảng tính giá vào lịch sử"
                    onClick={() => {
                    if (!(input.productName || '').trim()) {
                      alert('Vui lòng nhập tên sản phẩm trước khi lưu.');
                      return;
                    }
                    if (!kiemTraKhachHangQuyen()) return;
                    themVaoLichSu();
                    const stateMoi = dungCuaHangTinhGia.getState();
                    const newId = stateMoi.loadedHistoryId;
                    const h = timMucLichSuTheoId(stateMoi.history, newId);
                    const syncAdvisor = coQuyenCoVanBangTinh(stateMoi.nguoiDungHienTai?.policies ?? []);
                    void syncPricingSheetToServer(h, isAuthenticated, accessToken, { syncAdvisor })
    .then(() => { dungCuaHangTinhGia.getState().taiLichSuTuServer(); });
                    const container = document.getElementById('toastContainer');
                    if (!container) return;
                    const toast = document.createElement('div');
                    toast.className = 'toast toast-clickable';
                    toast.innerHTML = '💾 Đã lưu báo giá! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>';
                    toast.addEventListener('click', () => { dieuHuongModuleApp('history_db'); toast.remove(); });
                    container.appendChild(toast);
                    setTimeout(() => toast.remove(), 5000);
                  }}
                >
                   💾 Lưu báo giá
                 </button>
               )}
               {nangCap && (
                 <button
                   type="button"
                   className="btn btn-sm btn-outline"
                   style={{ marginBottom: 0, height: '40px' }}
                   title="Xem chi tiết bảng tính nâng cấp"
                   onClick={xuLyXuatChiTietNangCap}
                 >
                   👁 Xem
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
                        ? <>↳ Hoa hồng: {dinhDangSo(hienThiPhanBoChotGia.hoaHongDisplay, 1)}% = {dinhDangSo(hienThiPhanBoChotGia.hoaHongAmount, 1)}đ | Công ty: {dinhDangSo(hienThiPhanBoChotGia.congTyDisplay, 1)}% = {dinhDangSo(hienThiPhanBoChotGia.congTyAmount, 1)}đ</>
                        : <>↳ Hoa hồng: {dinhDangSo(hoaHongAllocation, 1)}đ | Công ty: {dinhDangSo(hienThiPhanBoChotGia.congTyAmount, 1)}đ</>}
                    </span>
                  </div>
                  {canhBaoPhanBoChotGia.map((msg, index) => (
                    <div key={index} className="chot-row" style={{fontSize:'0.82rem', color: '#b45309'}}>
                      <span className="chot-label">⚠ {msg}</span>
                    </div>
                  ))}
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
              <div className="stat-card green">
                <div className="stat-label">{hienThiGia.profitLabel}</div>
                <div className="stat-value" style={{fontSize: '1.15rem'}}>
                  {dinhDangSo(tienLoiNhuanGoc)}đ <span style={{fontSize: '0.85rem'}}>({dinhDangPhanTram(tyLeLoiNhuanGoc)})</span>
                </div>
              </div>
              <div className="stat-card cyan">
                <div className="stat-label">Doanh thu</div>
                <div className="stat-value">{dinhDangSo((dongBangGiaDeXuat ? giaDeXuatHienThi : rHieuLuc.finalPrice) * dauVaoKq.quantity)} đ</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-label">{hienThiGia.salePriceTitle}</div>
                <div className="stat-value">
                  {dinhDangSo(hasChotGia ? chotGiaNum : giaDeXuatHienThi, 0)} đ
                  {hasChotGia && (
                    <div style={{fontSize:'0.78rem', fontWeight:400, marginTop:'4px', color:'var(--muted)'}}>
                      đề xuất {dinhDangSo(giaDeXuatHienThi, 0)} đ · {diff >= 0 ? '+' : ''}{dinhDangSo(diff, 0)} đ
                    </div>
                  )}
                </div>
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
                  <span className="bl-value" style={{color:'var(--orange)'}}>{dinhDangSo(giaDeXuatHienThi, 0)} đ</span>
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
          {!nangCap && !isCommercial && (<>
          <div id="sect-tech" className="manager-section-anchor"></div>
          <TheThuGon
            resetKey={khoaKetQua}
            giuTrangThaiKhiReset
            style={{marginBottom: '14px'}}
            title={<><span className="icon">🏭</span> Đặc tả kỹ thuật &amp; nguyên liệu</>}
          >
            <div className="table-responsive">
              <table className="data-table" id="m-t-unified-table">
                <thead>
                   <tr>
                    <th>Công đoạn</th><th>Vật liệu</th>
                    <th className="num">khổ màng NVL (m)</th><th className="num">thành phẩm (m)</th><th className="num">phi hao (m)</th><th className="num">đầu vào NVL (m)</th>
                    <th className="num">CPSX (đ/m²)</th><th className="num">Thành tiền CPSX</th>
                    <th className="num">Giá NVL (đ/kg)</th>
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
                            {detailIdx === 0 && (
                              <td data-label="Công đoạn" rowSpan={rowSpan}>
                                {row.stage}
                              </td>
                            )}
                            <td data-label="Vật liệu">{detail.name}</td>
                            <td className="num" data-label="khổ màng NVL (m)">{dinhDangSo(detail.width, 3)}</td>
                            <td className="num" data-label="thành phẩm (m)">{dinhDangSo(dMeters, 0)}</td>
                            {oSoGc(dinhDangSo(dWaste, 0), !!row.isOutsourced, { dataLabel: "phi hao (m)" })}
                            <td className="num highlight" data-label="đầu vào NVL (m)">{dinhDangSo(inputVL, 0)}</td>
                            {oSoGc(dinhDangSo(row.cpsx, 0), !!row.isOutsourced, { dataLabel: "CPSX (đ/m²)" })}
                            {oSoGc(dinhDangSo(detailCostCPSX, 0), !!row.isOutsourced, { dataLabel: "Thành tiền CPSX" })}
                            {(() => {
                              if (row.matPriceIsPerM2) {
                                return oSoGc("—", false, { dataLabel: "Giá NVL" });
                              }
                              const giaDetail = (() => {
                                const m = detail.materialId ? materials.find(x => x.id === detail.materialId) : materials.find(x => x.name === detail.name);
                                if (m) return m.pricePerKg;
                                const u = detail.name.toUpperCase();
                                if (u.includes('MPET')) return 55000;
                                if (u.includes('PET')) return 45000;
                                if (u.includes('LLDPE') || u === 'PE') return 40000;
                                return 0;
                              })();
                              return oSoGc(giaDetail > 0 ? `${dinhDangSo(giaDetail, 0)} đ/kg` : "—", !!row.isOutsourced && giaDetail > 0, { dataLabel: "Giá NVL" });
                            })()}
                            {oSoGc(dinhDangSo(detail.matPrice, 1), !!row.isOutsourced, { dataLabel: "CP vật liệu (đ/m²)" })}
                            {oSoGc(dinhDangSo(detail.costMat, 0), !!row.isOutsourced, { dataLabel: "Thành tiền CPVL" })}
                          </tr>
                        );
                      });
                    }

                    return (
                      <tr key={idx}>
                        <td data-label="Công đoạn">
                          {row.stage}
                        </td>
                        <td data-label="Vật liệu">{row.mat}</td>
                        <td className="num" data-label="khổ màng NVL (m)">{dinhDangSo(dWidth, 3)}</td>
                        <td className="num" data-label="thành phẩm (m)">{dinhDangSo(dMeters, 0)}</td>
                        {oSoGc(dinhDangSo(dWaste, 0), !!row.isOutsourced, { dataLabel: "phi hao (m)" })}
                        <td className="num highlight" data-label="đầu vào NVL (m)">{dinhDangSo(inputVL, 0)}</td>
                        {oSoGc(dinhDangSo(row.cpsx, 0), !!row.isOutsourced, { dataLabel: "CPSX (đ/m²)" })}
                        {oSoGc(dinhDangSo(row.costCPSX, 0), !!row.isOutsourced, { dataLabel: "Thành tiền CPSX" })}
                        {(() => {
                          if (row.matPriceIsPerM2 && row.matPrice != null) {
                          return oSoGc("—", false, { dataLabel: "Giá NVL" });
                        }
                          const giaRow = (() => {
                            if (row.mat === '-' || row.mat === '') return 0;
                            const m = row.materialId ? materials.find(x => x.id === row.materialId) : materials.find(x => x.name === row.mat);
                            if (m) return m.pricePerKg;
                            const u = row.mat.toUpperCase();
                            if (u.includes('MPET')) return 55000;
                            if (u.includes('PET')) return 45000;
                            if (u.includes('LLDPE') || u === 'PE') return 40000;
                            return 0;
                          })();
                          return oSoGc(giaRow > 0 ? `${dinhDangSo(giaRow, 0)} đ/kg` : "—", !!row.isOutsourced && giaRow > 0, { dataLabel: "Giá NVL" });
                        })()}
                        {oSoGc(row.matPrice != null ? dinhDangSo(row.matPrice, 1) : "—", !!row.isOutsourced && row.matPrice != null, { dataLabel: "CP vật liệu (đ/m²)" })}
                        {oSoGc(row.costMat != null ? dinhDangSo(row.costMat, 0) : "—", !!row.isOutsourced && row.costMat != null, { dataLabel: "Thành tiền CPVL" })}
                      </tr>
                    );
                  })}
                  {laMangIn && cpTheoThoiGianIn > 0 && (
                    <tr className="total-row">
                      <td colSpan={10}>CP theo thời gian in</td>
                      <td className="num">{dinhDangSo(cpTheoThoiGianIn, 0)} đ</td>
                    </tr>
                  )}
                  <tr className="total-row" style={{fontSize: '1.05em'}}>
                    <td colSpan={8}><strong>TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN</strong></td>
                    <td colSpan={3} className="num" style={{color: 'var(--accent)', fontWeight: 800}}>{dinhDangSo(tongCong, 0)} đ</td>
                  </tr>
                </tbody>
              </table>
            </div>

          {/* ═══ SECTION: Override Tables (tabbed) ═══ */}
          {(() => {
            const loadedItem = timMucLichSuTheoId(lichSu, loadedHistoryId) ?? null;
            const nguoiDungHienTai = dungCuaHangTinhGia.getState().nguoiDungHienTai;
            const policies = nguoiDungHienTai?.policies ?? [];
            const coQuyenAdvisor = coQuyenCoVanBangTinh(policies);
            const canSaleEdit = !coQuyenAdvisor;
            const canAdminEdit = coQuyenAdvisor;
            const coTheLuuSale = loadedItem?.canUpdate !== false;
            const coTheLuuAdmin = loadedItem?.canAdminUpdate !== false;

            const handleSave = (idLichSu: string) => xuLyLuuGhiDe(idLichSu);
            const handleSaveNew = () => xuLyLuuGhiDeMoi();
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
                chenhLechGiaGocDonVi={giaSauGhiDeSaleDonVi - rHieuLuc.finalPrice}
                donViChenhLech={donViChenhLechGia}
                duocSua={canSaleEdit}
                coTheLuu={coTheLuuSale}
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
                engineParams={engineOverrideParams}
                printFilmParams={printFilmOverrideParams}
              />
            );

            const renderAdminTable = () => (
              <BangGhiDe
                title="Thay đổi từ Admin"
                lopMau="admin"
                cacDongSanXuat={cacDongSanXuat}
                ghiDeNguon={emptyOv}
                ghiDeHienTai={ghiDeAdmin}
                chenhLechGiaGocDonVi={giaSauGhiDeAdminDonVi - rHieuLuc.finalPrice}
                donViChenhLech={donViChenhLechGia}
                duocSua={canAdminEdit}
                coTheLuu={coTheLuuAdmin}
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
                engineParams={engineOverrideParams}
                printFilmParams={printFilmOverrideParams}
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

          </TheThuGon>
          </>)}

          {/* ═══ SECTION: Đặc tả kỹ thuật & nguyên liệu (nâng cao) ═══ */}
          {nangCap && !isCommercial && (<>
          <div id="sect-tech-advanced" className="manager-section-anchor"></div>
          <TheThuGon
            resetKey={khoaKetQua}
            giuTrangThaiKhiReset
            style={{marginBottom: '14px', marginTop: '14px'}}
            title={<><span className="icon">🔬</span> Đặc tả kỹ thuật &amp; nguyên liệu (nâng cao)</>}
          >
            <BangDacTaNangCao
              result={r}
              uniRows={cacDongSanXuat}
              constants={hangSoNc}
              materials={materials}
            />

            <div className="override-tab-wrapper" style={{ marginTop: '14px' }}>
              <div className="override-tab-bar">
                <button
                  className={`override-tab ${tabDangMoNangCao === 'sale' ? 'active' : ''}`}
                  onClick={() => datTabDangMoNangCao('sale')}
                >
                  💼 Sale{countOverrideChanges(ghiDeSale) > 0 ? ' ●' : ''}
                </button>
                <button
                  className={`override-tab ${tabDangMoNangCao === 'admin' ? 'active' : ''}`}
                  onClick={() => datTabDangMoNangCao('admin')}
                >
                  👑 Admin{countOverrideChanges(ghiDeAdmin) > 0 ? ' ●' : ''}
                </button>
              </div>
              {tabDangMoNangCao === 'sale' ? (
                <BangDacTaNangCaoGhiDe lopMau="sale" result={r} uniRows={cacDongSanXuat} constants={hangSoNc} materials={materials}
                  ghiDeHienTai={ghiDeSale} duocSua={canSaleEditNangCao} coTheLuu={coTheLuuSaleNangCao}
                  khiDat={datGhiDeSale} khiLuu={xuLyLuuGhiDe} khiLuuMoi={xuLyLuuGhiDeMoi} loadedHistoryId={loadedHistoryId}
                  soLuong={dauVaoKq.quantity} profitRatePct={saleProfitRatePct} defaultProfitRatePct={saleDefaultPct} khiDatProfitRate={datSaleProfitRatePct} engineParams={engineOverrideParams} />
              ) : (
                <BangDacTaNangCaoGhiDe lopMau="admin" result={r} uniRows={cacDongSanXuat} constants={hangSoNc} materials={materials}
                  ghiDeHienTai={ghiDeAdmin} duocSua={canAdminEditNangCao} coTheLuu={coTheLuuAdminNangCao}
                  khiDat={datGhiDeAdmin} khiLuu={xuLyLuuGhiDe} khiLuuMoi={xuLyLuuGhiDeMoi} loadedHistoryId={loadedHistoryId}
                  soLuong={dauVaoKq.quantity} profitRatePct={adminProfitRatePct} defaultProfitRatePct={adminDefaultPct} khiDatProfitRate={datAdminProfitRatePct} engineParams={engineOverrideParams} />
              )}
            </div>
          </TheThuGon>
          </>)}

          {/* ═══ SECTION: Bảng giá theo số lượng (MOQ) ═══ */}
          {!isCommercial && (<>
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
                        <td data-label="Giá đề xuất" style={{fontWeight:700, color: isCurrent ? 'var(--accent)' : 'inherit'}}>{dinhDangSo(dongBangGiaDeXuat && isCurrent ? giaDeXuatHienThi : res.finalPrice, 0)}</td>
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
                                    ? `${dinhDangSo(row.availableMeters, 0)}m × ${dinhDangSo(dauVaoKq.spreadWidth, 3)}m${(dauVaoKq.numImages || 1) > 1 ? ` × ${dauVaoKq.numImages}` : ''} = ${dinhDangSo(row.areaM2, 0)} m²`
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
                                  {dinhDangSo(row.availableMeters, 0)}m × {dinhDangSo(dauVaoKq.spreadWidth, 3)}m{(dauVaoKq.numImages || 1) > 1 ? ` × ${dauVaoKq.numImages}` : ''}
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
          </>)}

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
