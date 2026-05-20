"use client";
import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Clock, Building2, Calendar,
  Send, ShieldCheck, PackageCheck, Eye, Users, ChevronDown, ChevronRight,
} from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { lapDongSanXuat, tinhBaoGia, xuLyDongGhiDe } from '../lib/manager-calculation';
import type { HistoryItem, QuoteStatus, OverrideTable } from '../lib/types';
import { QUOTE_STATUS_CONFIG } from '../lib/types';

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════
const CAC_BUOC_QUY_TRINH: QuoteStatus[] = ['drafted', 'sent', 'pending_approval', 'approved', 'completed'];

// Bước Admin được phép xem & thao tác (không có drafted/sent vì đó là phía Sale)
const CAC_BUOC_ADMIN: QuoteStatus[] = ['pending_approval', 'approved', 'completed'];

const ICON_BUOC: Record<QuoteStatus, React.ReactNode> = {
  drafted:          <FileText size={13} />,
  sent:             <Send size={13} />,
  pending_approval: <Clock size={13} />,
  approved:         <ShieldCheck size={13} />,
  completed:        <PackageCheck size={13} />,
};

function layTrangThai(muc: HistoryItem): QuoteStatus {
  // Luôn dùng quoteStatus tường minh; fallback 'drafted' nếu muc cũ chưa có truong này
  return muc.quoteStatus ?? 'drafted';
}

// Một muc "đã gửi lên admin" khi status >= pending_approval
function daGuiAdmin(muc: HistoryItem): boolean {
  const s = layTrangThai(muc);
  return s === 'pending_approval' || s === 'approved' || s === 'completed';
}

function dinhDangSo(n: number) { return n.toLocaleString('vi-VN'); }

function doiNgayVnSangMs(date?: string): number {
  if (!date) return 0;
  const [day, month, year] = date.split('/').map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function namTrongKhoangNgay(item: HistoryItem, tuNgay: string, denNgay: string): boolean {
  const ms = doiNgayVnSangMs(item.date);
  if (!ms) return true;
  if (tuNgay && ms < new Date(tuNgay).setHours(0, 0, 0, 0)) return false;
  if (denNgay && ms > new Date(denNgay).setHours(23, 59, 59, 999)) return false;
  return true;
}

// ── Override diff helpers ────────────────────────────────────────────────────
const NHAN_DONG: Record<string, string> = {
  print: 'In', 'lam-2': 'Ghép L2', 'lam-3': 'Ghép L3',
  'lam-4': 'Ghép L4', 'lam-5': 'Ghép L5', cut: 'Cắt',
};
const NHAN_TRUONG: Record<string, string> = {
  width: 'Khổ', meters: 'Thành phẩm', waste: 'Phi hao',
  inputVL: 'Đầu vào VL', matPrice: 'CP vật liệu',
};

function demGhiDe(ov?: OverrideTable): number {
  if (!ov) return 0;
  return Object.values(ov).reduce((s, r) => s + (r ? Object.keys(r).length : 0), 0);
}

function hienThiKhacBietGhiDe(ov: OverrideTable | undefined, lopNhom: string, nhanNhom: string) {
  if (!ov) return null;
  const cacMuc = Object.entries(ov) as [string, Record<string, number>][];
  if (cacMuc.length === 0) return null;
  return (
    <>
      <div className={`override-diff-group-title ${lopNhom}`}>{nhanNhom}</div>
      {cacMuc.map(([rk, cacTruong]) =>
        Object.entries(cacTruong).map(([truong, giaTri]) => (
          <div key={`${rk}-${truong}`} className="override-diff-item">
            <span className="diff-label">{NHAN_DONG[rk] || rk} · {NHAN_TRUONG[truong] || truong}</span>
            <span className="diff-arrow">→</span>
            <span className="diff-new">{typeof giaTri === 'number' ? giaTri.toLocaleString('vi-VN') : giaTri}</span>
          </div>
        ))
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN STATUS DROPDOWN — chỉ cho phép chọn trong CAC_BUOC_ADMIN
// ════════════════════════════════════════════════════════════
function HopChonTrangThaiAdmin({ muc, khiCapNhat }: {
  muc: HistoryItem;
  khiCapNhat: (id: string, status: QuoteStatus) => void;
}) {
  const [mo, datMo] = useState(false);
  const hienTai = layTrangThai(muc);
  const cauHinh = QUOTE_STATUS_CONFIG[hienTai];

  return (
    <div className="qcard-status-dropdown-wrap" onClick={e => e.stopPropagation()}>
      <button
        className="qcard-status-trigger"
        style={{ color: cauHinh.color, background: cauHinh.bg, borderColor: cauHinh.color + '55' }}
        onClick={() => datMo(v => !v)}
        title="Đổi trạng thái"
      >
        <span className="qcard-status-dot" style={{ background: cauHinh.color }} />
        <span className="qcard-status-trigger-icon">{ICON_BUOC[hienTai]}</span>
        <span>{cauHinh.label}</span>
        <span className="qcard-status-trigger-caret">▾</span>
      </button>

      {mo && (
        <>
          <div className="qcard-dropdown-backdrop" onClick={() => datMo(false)} />
          <div className="qcard-dropdown">
            {CAC_BUOC_ADMIN.map((buoc) => {
              const cauHinhBuoc = QUOTE_STATUS_CONFIG[buoc];
              const dangChon = buoc === hienTai;
              return (
                <button
                  key={buoc}
                  className={`qcard-dropdown-item ${dangChon ? 'active' : ''}`}
                  onClick={() => { khiCapNhat(muc.id, buoc); datMo(false); }}
                >
                  <span className="qcard-dropdown-dot" style={{ background: cauHinhBuoc.color }} />
                  <span className="qcard-dropdown-icon">{ICON_BUOC[buoc]}</span>
                  <span className="qcard-dropdown-label">{cauHinhBuoc.label}</span>
                  <span className="qcard-dropdown-desc">{cauHinhBuoc.description}</span>
                  {dangChon && <span className="qcard-dropdown-check">âœ“</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SALE STATUS BADGE + NÚT GỬI ADMIN
// Seller chỉ có 2 hành động:
//   drafted → nút "Gửi Admin" → pending_approval
//   pending_approval / approved / completed → badge đọc-only
// ════════════════════════════════════════════════════════════
function DieuKhienTrangThaiSale({ muc, khiCapNhat }: {
  muc: HistoryItem;
  khiCapNhat: (id: string, status: QuoteStatus) => void;
}) {
  const [xacNhan, datXacNhan] = useState(false);
  const hienTai = layTrangThai(muc);
  const cauHinh = QUOTE_STATUS_CONFIG[hienTai];

  if (hienTai === 'drafted') {
    return (
      <div className="qcard-sale-controls" onClick={e => e.stopPropagation()}>
        {/* Badge đang soạn */}
        <span className="qcard-status-trigger"
          style={{ color: cauHinh.color, background: cauHinh.bg, borderColor: cauHinh.color + '55', cursor: 'default' }}>
          <span className="qcard-status-dot" style={{ background: cauHinh.color }} />
          <span className="qcard-status-trigger-icon">{ICON_BUOC[hienTai]}</span>
          <span>{cauHinh.label}</span>
        </span>

        {/* Nút Gửi */}
        {!xacNhan ? (
          <button
            className="qcard-send-btn"
            onClick={() => datXacNhan(true)}
            title="Gửi báo giá cho Admin duyệt"
          >
            <Send size={12} />
            Gửi Admin
          </button>
        ) : (
          <div className="qcard-send-xacNhan">
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Xác nhận gửi?</span>
            <button className="qcard-send-btn qcard-send-btn--yes"
              onClick={() => { khiCapNhat(muc.id, 'pending_approval'); datXacNhan(false); }}>
              âœ“
            </button>
            <button className="qcard-send-btn qcard-send-btn--no"
              onClick={() => datXacNhan(false)}>
              âœ•
            </button>
          </div>
        )}
      </div>
    );
  }

  // Đã gửi → read-only badge
  return (
    <span
      className="qcard-status-trigger"
      style={{ color: cauHinh.color, background: cauHinh.bg, borderColor: cauHinh.color + '55', cursor: 'default' }}
      title={cauHinh.description}
    >
      <span className="qcard-status-dot" style={{ background: cauHinh.color }} />
      <span className="qcard-status-trigger-icon">{ICON_BUOC[hienTai]}</span>
      <span>{cauHinh.label}</span>
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// QUOTATION CARD — dùng chung, nhận control node từ ngoài
// ════════════════════════════════════════════════════════════
function QuotationCard({ muc, onClick, statusControl }: {
  muc: HistoryItem;
  onClick: () => void;
  statusControl: React.ReactNode;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const spreadMm  = muc.input.spreadWidth ? Math.round(muc.input.spreadWidth * 1000) : 0;
  const cutMm     = muc.input.cutStep     ? Math.round(muc.input.cutStep     * 1000) : 0;
  const sizeStr   = spreadMm && cutMm ? `${spreadMm} × ${cutMm} mm` : '—';
  const numColors = muc.input.numColors ?? 0;
  const shownPrice = muc.chotGia && muc.chotGia > 0 ? muc.chotGia : muc.finalPrice;
  const diff      = muc.chotGia && muc.chotGia > 0 ? muc.chotGia - muc.finalPrice : 0;
  const diffPct   = diff !== 0 && muc.finalPrice > 0 ? (diff / muc.finalPrice) * 100 : 0;
  const saleCount = demGhiDe(muc.saleOverrides);
  const adminCount = demGhiDe(muc.adminOverrides);
  const hasAnyOverrides = saleCount > 0 || adminCount > 0;
  const { materials, constants, profitTable, smallWidthPrices } = dungCuaHangTinhGia();

  const specRows = useMemo(() => {
    const res = tinhBaoGia(muc.input, materials, constants, profitTable, smallWidthPrices);
    if (!res) return [];
    const base = lapDongSanXuat(res, constants).uniRows;
    const source = adminCount > 0 ? (muc.saleOverrides ?? {}) : {};
    const current = adminCount > 0 ? (muc.adminOverrides ?? {}) : (muc.saleOverrides ?? {});
    return xuLyDongGhiDe(base, source, current).rows;
  }, [muc.input, muc.saleOverrides, muc.adminOverrides, materials, constants, profitTable, smallWidthPrices, adminCount]);

  return (
    <div className="quote-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="quote-header">
        <div className="quote-id-wrap">
          <FileText size={14} className="quote-icon" />
          <span className="quote-id">{muc.date}</span>
        </div>
        {statusControl}
      </div>

      <div className="quote-body">
        <h3 className="quote-title">{muc.productName || '—'}</h3>

        <div className="quote-meta">
          <div className="quote-meta-muc">
            <Building2 size={13} style={{ color: '#4f46e5' }} />
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{muc.customer || '—'}</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr',
            background: 'var(--surface2)', padding: '10px 12px',
            borderRadius: '8px', gap: '5px', fontSize: '0.8rem',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Chất liệu:</span>
              <strong style={{ color: 'var(--text)', fontSize: '0.76rem' }}>{muc.structure || '—'}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Kích thước:</span>
              <strong style={{ color: 'var(--text)' }}>{sizeStr}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Số lượng:</span>
              <span><strong style={{ color: 'var(--accent)' }}>{dinhDangSo(muc.quantity)}</strong> túi</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Màu in:</span>
              <span>{numColors > 0 ? `${numColors} màu` : 'Không in'}</span>
            </div>
          </div>

          <div className="quote-meta-muc" style={{ marginTop: '4px' }}>
            <Calendar size={12} />
            <span style={{ fontSize: '0.76rem' }}>Ngày lập: {muc.date}</span>
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          paddingTop: '10px', marginTop: '6px', marginBottom: '10px', fontSize: '0.82rem',
        }}>
          <div>
            <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá đề xuất / túi</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{dinhDangSo(muc.finalPrice)} đ</div>
          </div>
          {muc.chotGia && muc.chotGia > 0 ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá chốt / túi</div>
              <div style={{ fontWeight: 700, color: 'var(--green)' }}>
                {dinhDangSo(muc.chotGia)} đ
                <span style={{ fontSize: '0.72rem', marginLeft: 4, color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  ({diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá chốt</div>
              <div style={{ color: 'var(--dim)', fontSize: '0.82rem' }}>Chưa chốt</div>
            </div>
          )}
        </div>

        <div className="quote-price-box">
          <div className="quote-price-label">Tổng giá trị ước tính</div>
          <div className="quote-price-giaTriue">
            {dinhDangSo(Math.round(shownPrice * muc.quantity))} <span className="quote-currency">VNĐ</span>
          </div>
        </div>
      </div>

      {/* Override diff button */}
      {hasAnyOverrides && (
        <>
          <button className="override-diff-toggle"
            onClick={(e) => { e.stopPropagation(); setShowDiff(!showDiff); }}>
            {showDiff ? '▾ Ẩn thay đổi' : '▸ Xem thay đổi'}
            <span className="override-diff-count">{saleCount} Sale / {adminCount} Admin</span>
          </button>
          {showDiff && (
            <div className="override-diff-summary" onClick={e => e.stopPropagation()}>
              {hienThiKhacBietGhiDe(muc.saleOverrides, 'sale', '💼 Sale')}
              {hienThiKhacBietGhiDe(muc.adminOverrides, 'admin', '👑 Admin')}
              <div className="override-diff-group-title" style={{ marginTop: 8 }}>📋 Đặc tả kỹ thuật sau thay đổi</div>
              {specRows.flatMap(row => row.materialDetails?.length
                ? row.materialDetails.map((d, idx) => (
                  <div key={`${row.rowKey}-${idx}`} className="override-diff-item">
                    <span className="diff-label">{row.stage} · {d.name}</span>
                    <span className="diff-arrow">→</span>
                    <span className="diff-new">Khổ {d.width.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}m · VL {(row.inputVL).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}m · {d.matPrice.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}đ/m²</span>
                  </div>
                ))
                : [(
                  <div key={row.rowKey} className="override-diff-item">
                    <span className="diff-label">{row.stage} · {row.mat || '—'}</span>
                    <span className="diff-arrow">→</span>
                    <span className="diff-new">Khổ {row.width.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}m · TP {row.meters.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}m · Hao {row.waste.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}m · VL {row.inputVL.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}m</span>
                  </div>
                )]
              )}
            </div>
          )}
        </>
      )}

      <div className="quote-footer" style={{ justifyContent: 'center', color: 'var(--muted)', fontSize: '0.75rem', gap: 4 }}>
        <Eye size={12} />
        Nhấn để mở bảng tính giá
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STATS BAR
// ════════════════════════════════════════════════════════════
function StatsBar({ mucs, isAdmin }: { mucs: HistoryItem[]; isAdmin: boolean }) {
  const buocs = isAdmin ? CAC_BUOC_ADMIN : CAC_BUOC_QUY_TRINH;
  const counts = useMemo(() => {
    const c: Record<QuoteStatus, number> = { drafted: 0, sent: 0, pending_approval: 0, approved: 0, completed: 0 };
    mucs.forEach(h => { c[layTrangThai(h)]++; });
    return c;
  }, [mucs]);

  const revenue = mucs
    .filter(h => layTrangThai(h) === 'completed')
    .reduce((sum, h) => sum + (h.chotGia || h.finalPrice) * h.quantity, 0);

  return (
    <div className="quote-stats-overview">
      {buocs.map(buoc => {
        const cauHinh = QUOTE_STATUS_CONFIG[buoc];
        return (
          <div key={buoc} className="quote-stat-card">
            <div className="quote-stat-giaTri" style={{ color: cauHinh.color, fontSize: '1.5rem' }}>{counts[buoc]}</div>
            <div className="quote-stat-lbl">{cauHinh.label}</div>
          </div>
        );
      })}
      <div className="quote-stat-card quote-stat-card--total">
        <div className="quote-stat-giaTri">{(revenue / 1_000_000).toFixed(1)}<small> Tr</small></div>
        <div className="quote-stat-lbl">Doanh thu (Hoàn thành)</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN VIEW — nhóm theo seller, chỉ thấy muc đã gửi
// ════════════════════════════════════════════════════════════
function AdminView({ mucs, search, chiTimKhachHang = false, onOpen, onStatusUpdate }: {
  mucs: HistoryItem[];
  search: string;
  chiTimKhachHang?: boolean;
  onOpen: (id: string) => void;
  onStatusUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    // Admin chỉ thấy muc đã gửi (status != drafted)
    const visible = mucs.filter(daGuiAdmin);

    const q = search.trim().toLowerCase();
    const filtered = q
      ? visible.filter(i => chiTimKhachHang
        ? i.customer.toLowerCase().includes(q)
        : i.customer.toLowerCase().includes(q) ||
          i.productName.toLowerCase().includes(q) ||
          i.structure.toLowerCase().includes(q) ||
          (i.sellerName || '').toLowerCase().includes(q)
      )
      : visible;

    const map = new Map<string, { id: string; name: string; mucs: HistoryItem[] }>();
    filtered.forEach(muc => {
      const sid = muc.sellerId || 'unknown';
      const sname = muc.sellerName || 'Không rõ';
      if (!map.has(sid)) map.set(sid, { id: sid, name: sname, mucs: [] });
      map.get(sid)!.mucs.push(muc);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [mucs, search, chiTimKhachHang]);

  const toggle = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // Badge "chờ duyệt" count toàn bộ
  const pendingCount = mucs.filter(i => layTrangThai(i) === 'pending_approval').length;

  if (groups.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>
          {mucs.filter(daGuiAdmin).length === 0
            ? 'Chưa có báo giá nào được gửi lên.'
            : 'Không có báo giá phù hợp.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner chờ duyệt */}
      {pendingCount > 0 && (
        <div className="qadmin-pending-banner">
          <Clock size={15} />
          <span>Có <strong>{pendingCount}</strong> báo giá đang chờ bạn duyệt</span>
        </div>
      )}

      {groups.map(group => {
        const isOpen = !collapsed[group.id];
        const pendingInGroup = group.mucs.filter(h => layTrangThai(h) === 'pending_approval').length;
        const groupRevenue = group.mucs
          .filter(h => layTrangThai(h) === 'completed')
          .reduce((s, h) => s + (h.chotGia || h.finalPrice) * h.quantity, 0);

        return (
          <div key={group.id} className="qgroup">
            <button className="qgroup-header" onClick={() => toggle(group.id)}>
              <span className="qgroup-icon"><Users size={16} /></span>
              <span className="qgroup-name">{group.name}</span>
              <span className="qgroup-count">{group.mucs.length} báo giá</span>
              {pendingInGroup > 0 && (
                <span className="qgroup-pending">{pendingInGroup} chờ duyệt</span>
              )}
              {groupRevenue > 0 && (
                <span className="qgroup-revenue">
                  {(groupRevenue / 1_000_000).toFixed(1)} Tr VNĐ
                </span>
              )}
              <span className="qgroup-chevron">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>

            {isOpen && (
              <div className="quote-grid" style={{ padding: '12px 16px 16px' }}>
                {group.mucs.map(muc => (
                  <QuotationCard
                    key={muc.id}
                    muc={muc}
                    onClick={() => onOpen(muc.id)}
                    statusControl={
                      <HopChonTrangThaiAdmin muc={muc} khiCapNhat={onStatusUpdate} />
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SALE VIEW — tất cả báo giá của mình, nút gửi khi drafted
// ════════════════════════════════════════════════════════════
function SaleView({ mucs, search, chiTimKhachHang = false, onOpen, onStatusUpdate }: {
  mucs: HistoryItem[];
  search: string;
  chiTimKhachHang?: boolean;
  onOpen: (id: string) => void;
  onStatusUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return mucs;
    const q = search.toLowerCase();
    return mucs.filter(i => chiTimKhachHang
      ? i.customer.toLowerCase().includes(q)
      : i.customer.toLowerCase().includes(q) ||
        i.productName.toLowerCase().includes(q) ||
        i.structure.toLowerCase().includes(q)
    );
  }, [mucs, search, chiTimKhachHang]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>{mucs.length === 0
          ? 'Bạn chưa có báo giá nào. Hãy lưu bảng tính giá đầu tiên!'
          : 'Không có báo giá phù hợp.'}
        </p>
      </div>
    );
  }

  return (
    <div className="quote-grid">
      {filtered.map(muc => (
        <QuotationCard
          key={muc.id}
          muc={muc}
          onClick={() => onOpen(muc.id)}
          statusControl={
            <DieuKhienTrangThaiSale muc={muc} khiCapNhat={onStatusUpdate} />
          }
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function QuotationModule({ role, menuDangChon }: { role: string; hienTaiSellerId?: string; menuDangChon?: string }) {
  const { history, loadHistoryItem: taiLichSu, setActiveModule: datPhan, updateQuoteStatus: capNhatTrangThaiDon, currentSellerId: hienTaiSellerId } = dungCuaHangTinhGia();
  const [search, setSearch] = useState('');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');

  const isAdmin = role === 'admin';
  const laLichSuBaoGiaTheoKhach = menuDangChon === 'customers.quote_history';

  const myItems = useMemo(() => {
    let items = isAdmin ? history : history.filter(h => h.sellerId === hienTaiSellerId);
    if (menuDangChon === 'overview.quotes_pending') items = items.filter(h => layTrangThai(h) === 'pending_approval');
    if (menuDangChon === 'orders.confirmed') items = items.filter(h => layTrangThai(h) === 'completed' || !!h.chotGia);
    if (menuDangChon === 'pricing.create_quote') items = items.filter(h => layTrangThai(h) === 'drafted');
    if (laLichSuBaoGiaTheoKhach) {
      items = items.filter(h => daGuiAdmin(h) && namTrongKhoangNgay(h, tuNgay, denNgay));
    }
    return items;
  }, [history, isAdmin, hienTaiSellerId, menuDangChon, laLichSuBaoGiaTheoKhach, tuNgay, denNgay]);

  // Stats cho admin: chỉ đếm muc đã gửi
  const statsItems = isAdmin ? myItems.filter(daGuiAdmin) : myItems;

  const handleOpen = (id: string) => {
    taiLichSu(id);
    datPhan('calculator');
  };

  return (
    <div className="crm-root quote-root">
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder={laLichSuBaoGiaTheoKhach ? 'Nhập tên công ty/khách hàng, ví dụ: AAA...' : isAdmin ? 'Tìm theo seller, khách hàng, sản phẩm...' : 'Tìm khách hàng, sản phẩm, chất liệu...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="crm-search-clear" onClick={() => setSearch('')}>âœ•</button>}
        </div>
        {laLichSuBaoGiaTheoKhach ? (
          <div className="crm-toolbar-right" style={{ gap: 8 }}>
            <input className="form-input" type="date" value={tuNgay} onChange={e => setTuNgay(e.target.value)} style={{ width: 150 }} title="Từ ngày" />
            <input className="form-input" type="date" value={denNgay} onChange={e => setDenNgay(e.target.value)} style={{ width: 150 }} title="Đến ngày" />
          </div>
        ) : isAdmin && (
          <div className="crm-toolbar-right">
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '0 8px', whiteSpace: 'nowrap' }}>
              👑 Xem theo Seller
            </span>
          </div>
        )}
      </div>

      <StatsBar mucs={statsItems} isAdmin={isAdmin} />

      <div className="crm-list quote-list-container">
        {isAdmin ? (
          <AdminView
            mucs={myItems}
            search={search}
            chiTimKhachHang={laLichSuBaoGiaTheoKhach}
            onOpen={handleOpen}
            onStatusUpdate={capNhatTrangThaiDon}
          />
        ) : (
          <SaleView
            mucs={myItems}
            search={search}
            chiTimKhachHang={laLichSuBaoGiaTheoKhach}
            onOpen={handleOpen}
            onStatusUpdate={capNhatTrangThaiDon}
          />
        )}
      </div>
    </div>
  );
}
