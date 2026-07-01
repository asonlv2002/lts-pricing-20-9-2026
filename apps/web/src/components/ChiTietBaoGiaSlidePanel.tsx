"use client";
import React from 'react';
import { X, FileText } from 'lucide-react';
import { normalizeDisplayText } from '../lib/text-codec';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import { QrevStyleInjector } from './qrev-styles';
import type { HistoryItem } from '../lib/types';
import {
  chuyenTrangThaiBaoGia,
  NHAN_TRANG_THAI_BAO_GIA,
  type BaoGiaApi,
  type TrangThaiBaoGiaServer,
} from '../lib/api/service-lts';

const boDau = (chuoi: string) =>
  chuoi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function dinhDangNgay(iso?: string): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime();
  return ms ? new Date(ms).toLocaleString('vi-VN') : '—';
}

function dinhDangSo(n: number): string {
  return Math.round(n || 0).toLocaleString('vi-VN');
}

const MAU_TRANG_THAI: Record<TrangThaiBaoGiaServer, { bg: string; fg: string }> = {
  drafted:           { bg: '#eef2ff', fg: '#4338ca' },
  submitted:         { bg: '#fff7ed', fg: '#c2410c' },
  approved:          { bg: '#ecfdf5', fg: '#047857' },
  rejected:          { bg: '#fef2f2', fg: '#b91c1c' },
  customer_approved: { bg: '#f0fdf4', fg: '#15803d' },
  customer_rejected: { bg: '#fef2f2', fg: '#9f1239' },
  unknown:           { bg: '#f3f4f6', fg: '#6b7280' },
};

function HuyHieuTrangThai({ trangThai }: { trangThai: TrangThaiBaoGiaServer }) {
  const mau = MAU_TRANG_THAI[trangThai];
  return (
    <span className="qrev-badge" style={{ background: mau.bg, color: mau.fg }}>
      <span className="qrev-badge-dot" style={{ background: mau.fg }} />
      {NHAN_TRANG_THAI_BAO_GIA[trangThai]}
    </span>
  );
}

const AVATAR_COLORS = ['#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#2563eb', '#9333ea', '#dc2626'];
function mauAvatar(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function InfoRow({ label, value, bold, mono, color }: { label: string; value: string; bold?: boolean; mono?: boolean; color?: string }) {
  return (
    <div className="qrev-info-row">
      <span className="qrev-info-label">{label}</span>
      <span className="qrev-info-value" style={{ fontWeight: bold ? 700 : 500, fontFamily: mono ? 'monospace' : undefined, color }}>
        {value}
      </span>
    </div>
  );
}

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function docInputBangTinh(value: unknown): Partial<import('../lib/types').CalculateInput> {
  return laObject(value) ? (value as Partial<import('../lib/types').CalculateInput>) : {};
}

function cauTrucTuInput(input: Partial<import('../lib/types').CalculateInput>): string {
  return [input.layer1Id, input.layer2Id, input.layer3Id, input.layer4Id, input.layer5Id]
    .filter(Boolean)
    .join(' / ');
}

function tenBaoGia(bg: BaoGiaApi): string {
  return normalizeDisplayText(bg.quotationName || bg.pricingSheets?.[0]?.pricingSheetName || 'Báo giá');
}

function nguoiTaoBaoGia(bg: BaoGiaApi, banDoTaiKhoan?: Map<string, string>): string | undefined {
  if (bg.createdBy && banDoTaiKhoan?.has(bg.createdBy)) {
    return banDoTaiKhoan.get(bg.createdBy);
  }
  return bg.original?.actorName
    ?? bg.pricingSheets?.find(sheet => sheet.original?.actorName)?.original?.actorName
    ?? undefined;
}

export interface ChiTietBaoGiaPanelProps {
  baoGia: BaoGiaApi;
  onClose: () => void;
  banDoTaiKhoan?: Map<string, string>;
  laNguoiDuyet?: boolean;
  dangXuLy?: boolean;
  onNop?: (bg: BaoGiaApi) => void;
  onDuyet?: (bg: BaoGiaApi, quyetDinh: 'approved' | 'rejected') => void;
  onTaoBanSua?: (bg: BaoGiaApi) => void;
}

export default function ChiTietBaoGiaSlidePanel({
  baoGia, onClose, banDoTaiKhoan,
  laNguoiDuyet = false, dangXuLy = false,
  onNop, onDuyet, onTaoBanSua,
}: ChiTietBaoGiaPanelProps) {
  const trangThai = chuyenTrangThaiBaoGia(baoGia.updateStatus);
  const item = (baoGia.inputValue ?? {}) as Partial<HistoryItem>;
  const pricingSheets = baoGia.pricingSheets ?? [];
  const firstSheet = pricingSheets[0];
  const firstInput = docInputBangTinh(firstSheet?.inputValue);
  const coSnapshotCu = !!(item.productName || item.quoteProducts?.length || item.input);
  const meta = getPricingDisplayMeta(coSnapshotCu ? (item.input ?? {}) : firstInput);
  const coGiaChot = typeof item.chotGia === 'number' && item.chotGia > 0;
  const dsSanPham = item.quoteProducts ?? [];
  const khachHang = item.customer || firstInput.customer || firstSheet?.customer?.codeName || firstSheet?.customerCodeName || '—';
  const tenSanPham = item.productName || firstInput.productName || firstSheet?.pricingSheetName || (pricingSheets.length ? `${pricingSheets.length} sản phẩm` : '—');
  const cauTruc = item.structure || cauTrucTuInput(firstInput) || '—';
  const soLuong = typeof item.quantity === 'number' ? item.quantity : firstInput.quantity;
  const nguoiLap = nguoiTaoBaoGia(baoGia, banDoTaiKhoan);

  const coFooter = (onNop || onDuyet || onTaoBanSua) && (
    trangThai === 'drafted' || (trangThai === 'submitted' && laNguoiDuyet)
    || trangThai === 'rejected' || trangThai === 'customer_rejected'
  );

  return (
    <>
      <QrevStyleInjector />
      <div className="qrev-overlay" onClick={onClose} />
      <aside className="qrev-slide-panel" role="dialog" aria-modal="true" aria-label="Chi tiết báo giá">
        <div className="qrev-panel-header">
          <div className="qrev-panel-avatar" style={{ background: mauAvatar(baoGia.id) }}>
            <FileText size={18} />
          </div>
          <div className="qrev-panel-title">
            <span className="qrev-panel-name">{tenBaoGia(baoGia)}</span>
            <span className="qrev-panel-meta">
              Tạo {dinhDangNgay(baoGia.createdAt)} · Cập nhật {dinhDangNgay(baoGia.updatedAt)}
            </span>
          </div>
          <button className="qrev-btn-icon qrev-btn-icon--close" aria-label="Đóng" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="qrev-panel-body">
          <div className="qrev-panel-row">
            <span className="qrev-panel-label">Trạng thái</span>
            <HuyHieuTrangThai trangThai={trangThai} />
          </div>

          <div className="qrev-panel-section-title">Thông tin chung</div>
          <div className="qrev-info-grid">
            <InfoRow label="Khách hàng" value={normalizeDisplayText(String(khachHang))} />
            <InfoRow label="Sản phẩm" value={normalizeDisplayText(String(tenSanPham))} />
            <InfoRow label="Cấu trúc" value={normalizeDisplayText(cauTruc)} mono />
            {typeof soLuong === 'number' && (
              <InfoRow label="Số lượng" value={`${dinhDangSo(soLuong)} ${meta.quantityUnitForHistory}`} />
            )}
            {nguoiLap && <InfoRow label="Sale" value={normalizeDisplayText(nguoiLap)} />}
          </div>

          {typeof item.finalPrice === 'number' && (
            <>
              <div className="qrev-panel-section-title">Giá</div>
              <div className="qrev-info-grid">
                <InfoRow label={meta.priceTitle} value={`${dinhDangSo(item.finalPrice)} ₫`} bold />
                {coGiaChot && (
                  <InfoRow label={meta.closedPriceTitle} value={`${dinhDangSo(item.chotGia!)} ₫`} bold color="#059669" />
                )}
              </div>
            </>
          )}

          {dsSanPham.length > 0 && (
            <>
              <div className="qrev-panel-section-title">Sản phẩm trong báo giá</div>
              <div className="qrev-info-grid">
                {dsSanPham.map(sp => (
                  <div key={sp.sourceHistoryItemId} className="qrev-product-line">
                    <div className="qrev-product-name">{sp.productName}</div>
                    <div className="qrev-product-struct">{sp.structure}</div>
                    {sp.tiers.map((tier, i) => (
                      <div key={i} className="qrev-product-tier">
                        {dinhDangSo(tier.quantity)} {meta.quantityUnitForHistory}: <b>{dinhDangSo(tier.chotGia ?? tier.finalPrice)} ₫</b>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {dsSanPham.length === 0 && pricingSheets.length > 0 && (
            <>
              <div className="qrev-panel-section-title">Sản phẩm trong báo giá</div>
              <div className="qrev-info-grid">
                {pricingSheets.map(sheet => {
                  const input = docInputBangTinh(sheet.inputValue);
                  const sheetMeta = getPricingDisplayMeta(input);
                  const sheetStructure = cauTrucTuInput(input);
                  return (
                    <div key={sheet.id} className="qrev-product-line">
                      <div className="qrev-product-name">{normalizeDisplayText(input.productName || sheet.pricingSheetName || 'Sản phẩm')}</div>
                      {sheetStructure && <div className="qrev-product-struct">{normalizeDisplayText(sheetStructure)}</div>}
                      {typeof input.quantity === 'number' && (
                        <div className="qrev-product-tier">Số lượng: <b>{dinhDangSo(input.quantity)} {sheetMeta.quantityUnitForHistory}</b></div>
                      )}
                      {typeof input.numColors === 'number' && (
                        <div className="qrev-product-tier">Màu in: <b>{input.numColors > 0 ? `${input.numColors} màu` : 'Không in'}</b></div>
                      )}
                      {(input.spreadWidth || input.cutStep) && (
                        <div className="qrev-product-tier">
                          Kích thước: <b>{input.spreadWidth ? `${Math.round(input.spreadWidth * 1000)}mm` : '—'} × {input.cutStep ? `${Math.round(input.cutStep * 1000)}mm` : '—'}</b>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {coFooter && (
          <div className="qrev-panel-footer">
            {trangThai === 'drafted' && onNop && (
              <button className="qrev-btn qrev-btn--primary" disabled={dangXuLy} onClick={() => onNop(baoGia)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg> Nộp duyệt
              </button>
            )}
            {trangThai === 'submitted' && laNguoiDuyet && onDuyet && (
              <>
                <button className="qrev-btn qrev-btn--ok" disabled={dangXuLy} onClick={() => onDuyet(baoGia, 'approved')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Duyệt
                </button>
                <button className="qrev-btn qrev-btn--danger" disabled={dangXuLy} onClick={() => onDuyet(baoGia, 'rejected')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Từ chối
                </button>
              </>
            )}
            {(trangThai === 'rejected' || trangThai === 'customer_rejected') && onTaoBanSua && (
              <button className="qrev-btn qrev-btn--ghost" disabled={dangXuLy} onClick={() => onTaoBanSua(baoGia)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Tạo bản sửa
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
