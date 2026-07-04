"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, Send, CheckCircle2, XCircle, Eye, X, ClipboardEdit, FileText, Inbox } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { normalizeDisplayText } from '../lib/text-codec';
import { QrevStyleInjector } from './qrev-styles';
import { coQuyenDuyetBaoGia } from '../lib/permissions';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import type { CalculateInput, HistoryItem } from '../lib/types';
import ChiTietBaoGiaSlidePanel from './ChiTietBaoGiaSlidePanel';
import ConfirmDialog from './ConfirmDialog';
import { previewBaoGia, buildHistoryItemFromServerData } from '../lib/baoGiaExport';
import {
  layDanhSachBaoGiaService,
  layBaoGiaChoDuyetService,
  layTaiKhoanService,
  nopBaoGiaService,
  duyetBaoGiaService,
  taoBanSuaBaoGiaService,
  capNhatBaoGiaService,
  chuyenTrangThaiBaoGia,
  NHAN_TRANG_THAI_BAO_GIA,
  type BaoGiaApi,
  type TaiKhoanApi,
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

// Màu badge theo từng trạng thái chi tiết của server.
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

// ── Bộ lọc chip: gộp 2 trạng thái "khách ..." vào nhóm tương ứng ──────────────
type BoLoc = 'all' | 'drafted' | 'submitted' | 'approved' | 'rejected';

function thuocBoLoc(trangThai: TrangThaiBaoGiaServer, loc: BoLoc): boolean {
  switch (loc) {
    case 'all': return true;
    case 'drafted': return trangThai === 'drafted';
    case 'submitted': return trangThai === 'submitted';
    case 'approved': return trangThai === 'approved' || trangThai === 'customer_approved';
    case 'rejected': return trangThai === 'rejected' || trangThai === 'customer_rejected';
    default: return true;
  }
}

const CHIP_LABELS: { key: BoLoc; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'drafted', label: 'Nháp' },
  { key: 'submitted', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Bị từ chối' },
];

// ── Avatar màu theo id (để bảng đỡ đơn điệu) ─────────────────────────────────
const AVATAR_COLORS = ['#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#2563eb', '#9333ea', '#dc2626'];
function mauAvatar(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function docInputBangTinh(value: unknown): Partial<CalculateInput> {
  return laObject(value) ? (value as Partial<CalculateInput>) : {};
}

function tenBaoGia(bg: BaoGiaApi): string {
  return normalizeDisplayText(bg.quotationName || bg.pricingSheets?.[0]?.pricingSheetName || 'Báo giá');
}

function tuKhoaBaoGia(bg: BaoGiaApi): string {
  const pricingText = (bg.pricingSheets ?? []).map(sheet => {
    const input = docInputBangTinh(sheet.inputValue);
    return [sheet.pricingSheetName, input.productName, input.customer, sheet.customer?.codeName, sheet.customerCodeName]
      .filter(Boolean)
      .join(' ');
  }).join(' ');
  return boDau(`${tenBaoGia(bg)} ${pricingText}`);
}

function nguoiTaoBaoGia(bg: BaoGiaApi): string | undefined {
  return bg.original?.actorName ?? undefined;
}

type Nguon = 'list' | 'review';

export default function ModuleDuyetBaoGia() {
  const accessToken = dungCuaHangTinhGia(s => s.accessToken);
  const isAuthenticated = dungCuaHangTinhGia(s => s.isAuthenticated);
  const nguoiDung = dungCuaHangTinhGia(s => s.nguoiDungHienTai);
  const policies = nguoiDung?.policies ?? [];
  const laNguoiDuyet = coQuyenDuyetBaoGia(policies);

  const [danhSachTaiKhoan, datDanhSachTaiKhoan] = useState<TaiKhoanApi[]>([]);
  const daTaiTaiKhoan = useRef(false);

  useEffect(() => {
    if (!accessToken || daTaiTaiKhoan.current) return;
    daTaiTaiKhoan.current = true;
    layTaiKhoanService(accessToken).then(datDanhSachTaiKhoan).catch(() => {});
  }, [accessToken]);

  const banDoTaiKhoan = useMemo(() => {
    const map = new Map<string, string>();
    for (const tk of danhSachTaiKhoan) {
      if (tk.fullName) map.set(tk.id, tk.fullName);
    }
    return map;
  }, [danhSachTaiKhoan]);

  // Nguồn dữ liệu: 'list' = GET /quotations; 'review' = quotation-in-review (chỉ reviewer)
  const [nguon, datNguon] = useState<Nguon>('list');
  const [boLoc, datBoLoc] = useState<BoLoc>('all');
  const [danhSach, datDanhSach] = useState<BaoGiaApi[]>([]);
  const [tuKhoa, datTuKhoa] = useState('');
  const [dangTai, datDangTai] = useState(false);
  const [loi, datLoi] = useState('');
  const [thongBao, datThongBao] = useState('');
  const [dangXuLyId, datDangXuLyId] = useState<string | null>(null);
  const [chiTiet, datChiTiet] = useState<BaoGiaApi | null>(null);
  const [confirm, setConfirm] = useState<{ bg: BaoGiaApi; title: string; message: string; onConfirm: () => void } | null>(null);

  const lamMoi = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      datDanhSach([]);
      datLoi('Cần đăng nhập để xem báo giá từ máy chủ.');
      return;
    }
    datDangTai(true);
    datLoi('');
    try {
      const data = nguon === 'review'
        ? await layBaoGiaChoDuyetService(accessToken)
        : await layDanhSachBaoGiaService(accessToken);
      datDanhSach(data);
    } catch (error) {
      datLoi(error instanceof Error ? error.message : 'Không tải được danh sách báo giá.');
      datDanhSach([]);
    } finally {
      datDangTai(false);
    }
  }, [accessToken, isAuthenticated, nguon]);

  useEffect(() => { void lamMoi(); }, [lamMoi]);

  // Đếm số lượng theo từng chip (trên dữ liệu nguồn 'list').
  const demTheoChip = useMemo(() => {
    const dem: Record<BoLoc, number> = { all: danhSach.length, drafted: 0, submitted: 0, approved: 0, rejected: 0 };
    for (const bg of danhSach) {
      const tt = chuyenTrangThaiBaoGia(bg.updateStatus);
      if (thuocBoLoc(tt, 'drafted')) dem.drafted++;
      if (thuocBoLoc(tt, 'submitted')) dem.submitted++;
      if (thuocBoLoc(tt, 'approved')) dem.approved++;
      if (thuocBoLoc(tt, 'rejected')) dem.rejected++;
    }
    return dem;
  }, [danhSach]);

  const ketQua = useMemo(() => {
    const q = boDau(tuKhoa.trim());
    return danhSach.filter(bg => {
      const tt = chuyenTrangThaiBaoGia(bg.updateStatus);
      if (nguon === 'list' && !thuocBoLoc(tt, boLoc)) return false;
      if (q && !tuKhoaBaoGia(bg).includes(q)) return false;
      return true;
    });
  }, [danhSach, tuKhoa, boLoc, nguon]);

  const hienThongBao = useCallback((msg: string) => {
    datThongBao(msg);
    setTimeout(() => datThongBao(''), 4000);
  }, []);

  const nopBaoGia = useCallback(async (bg: BaoGiaApi) => {
    if (!accessToken) return;
    setConfirm({
      bg,
      title: 'Gửi duyệt báo giá',
      message: `Bạn có chắc muốn gửi báo giá "${tenBaoGia(bg)}" để duyệt?`,
      onConfirm: async () => {
        setConfirm(null);
        datDangXuLyId(bg.id);
        datLoi('');
        try {
          await nopBaoGiaService(bg.id, accessToken);
          hienThongBao('Đã nộp báo giá để chờ duyệt.');
          await lamMoi();
        } catch (error) {
          datLoi(error instanceof Error ? error.message : 'Không nộp được báo giá.');
        } finally {
          datDangXuLyId(null);
        }
      },
    });
  }, [accessToken, lamMoi, hienThongBao]);

  const duyetBaoGia = useCallback(async (bg: BaoGiaApi, quyetDinh: 'approved' | 'rejected') => {
    if (!accessToken) return;
    const label = quyetDinh === 'approved' ? 'duyệt' : 'từ chối';
    setConfirm({
      bg,
      title: quyetDinh === 'approved' ? 'Duyệt báo giá' : 'Từ chối báo giá',
      message: `Bạn có chắc muốn ${label} báo giá "${tenBaoGia(bg)}"?`,
      onConfirm: async () => {
        setConfirm(null);
        datDangXuLyId(bg.id);
        datLoi('');
        try {
          await duyetBaoGiaService(bg.id, quyetDinh, accessToken);
          hienThongBao(quyetDinh === 'approved' ? 'Đã duyệt báo giá.' : 'Đã từ chối báo giá.');
          await lamMoi();
        } catch (error) {
          datLoi(error instanceof Error ? error.message : 'Không cập nhật được trạng thái báo giá.');
        } finally {
          datDangXuLyId(null);
        }
      },
    });
  }, [accessToken, lamMoi, hienThongBao]);

  const taoBanSua = useCallback(async (bg: BaoGiaApi) => {
    if (!accessToken) return;
    datDangXuLyId(bg.id);
    datLoi('');
    try {
      await taoBanSuaBaoGiaService({
        quotationId: bg.id,
        quotationName: `${tenBaoGia(bg)} (bản sửa)`,
        inputValue: bg.inputValue ?? {},
      }, accessToken);
      hienThongBao('Đã tạo bản sửa (nháp mới) từ báo giá bị từ chối.');
      await lamMoi();
    } catch (error) {
      datLoi(error instanceof Error ? error.message : 'Không tạo được bản sửa.');
    } finally {
      datDangXuLyId(null);
    }
  }, [accessToken, lamMoi, hienThongBao]);

  const capNhatBaoGia = useCallback((bg: BaoGiaApi) => {
    if (!accessToken) return;
    setConfirm({
      bg,
      title: 'Cập nhật báo giá',
      message: `Bạn có chắc muốn cập nhật báo giá "${tenBaoGia(bg)}" và gửi lại duyệt?`,
      onConfirm: async () => {
        setConfirm(null);
        datDangXuLyId(bg.id);
        datLoi('');
        try {
          await capNhatBaoGiaService(bg.id, { duLieuDauVao: bg.inputValue }, accessToken);
          hienThongBao('Đã cập nhật báo giá.');
          await lamMoi();
        } catch (loi) {
          datLoi(loi instanceof Error ? loi.message : 'Không cập nhật được báo giá.');
        } finally {
          datDangXuLyId(null);
        }
      },
    });
  }, [accessToken, lamMoi, hienThongBao]);

  const chonChip = (key: BoLoc) => {
    datNguon('list');
    datBoLoc(key);
  };

  const layKhachHangLocal = (): Array<{ companyName?: string; customerCode?: string; address?: string; invoiceAddress?: string; taxCode?: string; phone?: string }> => {
    try { return JSON.parse(window.localStorage.getItem('lts_customers') || '[]'); } catch { return []; }
  };

  const renderHanhDong = (bg: BaoGiaApi, trangThai: TrangThaiBaoGiaServer) => {
    const dangXuLy = dangXuLyId === bg.id;

    const handleXemBaoGia = (e: React.MouseEvent) => {
      e.stopPropagation();
      const item = buildHistoryItemFromServerData(bg as any);
      const customerName = (item.customer || bg.pricingSheets?.[0]?.customer?.codeName || '') as string;
      const customers = layKhachHangLocal();
      const c = customers.find(kh => kh.companyName === customerName || kh.customerCode === customerName);
      previewBaoGia(item as HistoryItem, {
        address: c?.address || c?.invoiceAddress || '',
        taxCode: c?.taxCode || '',
        phone: c?.phone || '',
      }).catch(err => alert('Lỗi xem báo giá: ' + (err instanceof Error ? err.message : err)));
    };

    return (
      <div className="qrev-row-actions" onClick={e => e.stopPropagation()}>
        <button className="qrev-btn-icon" title="Xem chi tiết" onClick={() => datChiTiet(bg)}>
          <Eye size={15} />
        </button>
        {trangThai === 'drafted' && (
          <button className="qrev-btn-icon qrev-btn-icon--primary" title="Nộp duyệt" disabled={dangXuLy} onClick={() => void nopBaoGia(bg)}>
            <Send size={15} />
          </button>
        )}
        {trangThai === 'drafted' && bg.createdBy === nguoiDung?.id && (
          <button className="qrev-btn-icon" title="Cập nhật" disabled={dangXuLy} onClick={() => capNhatBaoGia(bg)}>
            <RefreshCw size={15} />
          </button>
        )}
        {trangThai === 'submitted' && laNguoiDuyet && (
          <>
            <button className="qrev-btn-icon qrev-btn-icon--ok" title="Duyệt" disabled={dangXuLy} onClick={() => void duyetBaoGia(bg, 'approved')}>
              <CheckCircle2 size={15} />
            </button>
            <button className="qrev-btn-icon qrev-btn-icon--danger" title="Từ chối" disabled={dangXuLy} onClick={() => void duyetBaoGia(bg, 'rejected')}>
              <XCircle size={15} />
            </button>
          </>
        )}
        {(trangThai === 'rejected' || trangThai === 'customer_rejected') && (
          <button className="qrev-btn-icon" title="Tạo bản sửa" disabled={dangXuLy} onClick={() => void taoBanSua(bg)}>
            <ClipboardEdit size={15} />
          </button>
        )}
        {(trangThai === 'rejected' || trangThai === 'customer_rejected') && bg.createdBy === nguoiDung?.id && (
          <button className="qrev-btn-icon" title="Cập nhật" disabled={dangXuLy} onClick={() => capNhatBaoGia(bg)}>
            <RefreshCw size={15} />
          </button>
        )}
        <button className="qrev-btn-icon" title="Xem PDF báo giá" onClick={handleXemBaoGia}>
          <FileText size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="qrev-root">
      <QrevStyleInjector />

      <header className="qrev-header">
        <div className="qrev-header-left">
          <h1 className="qrev-title">
            Danh sách báo giá
            <span className="qrev-title-count"> ({ketQua.length})</span>
          </h1>
        </div>
        <div className="qrev-header-right">
          <button className="qrev-btn qrev-btn--ghost" onClick={() => void lamMoi()} disabled={dangTai}>
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </header>

      <div className="qrev-search-bar">
        <Search size={16} className="qrev-search-icon" />
        <input
          className="qrev-search-input"
          aria-label="Tìm kiếm báo giá"
          placeholder="Tìm theo tên báo giá..."
          value={tuKhoa}
          onChange={e => datTuKhoa(e.target.value)}
        />
        {tuKhoa && (
          <button className="qrev-btn-icon qrev-search-clear" aria-label="Xóa" onClick={() => datTuKhoa('')}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="qrev-chips">
        {CHIP_LABELS.map(chip => (
          <button
            key={chip.key}
            className={nguon === 'list' && boLoc === chip.key ? 'qrev-chip qrev-chip--active' : 'qrev-chip'}
            onClick={() => chonChip(chip.key)}
          >
            {chip.label} <span className="qrev-chip-count">{demTheoChip[chip.key]}</span>
          </button>
        ))}
        {laNguoiDuyet && (
          <button
            className={nguon === 'review' ? 'qrev-chip qrev-chip--active qrev-chip--review' : 'qrev-chip qrev-chip--review'}
            onClick={() => { datNguon('review'); datBoLoc('all'); }}
          >
            <Inbox size={12} /> Chờ tôi duyệt
          </button>
        )}
      </div>

      {thongBao && <div className="qrev-alert qrev-alert--ok">{thongBao}</div>}
      {loi && <div className="qrev-alert qrev-alert--err">{loi}</div>}

      <div className="qrev-table-shell">
        {dangTai ? (
          <div className="qrev-empty"><p>Đang tải báo giá...</p></div>
        ) : ketQua.length === 0 ? (
          <div className="qrev-empty">
            <Inbox size={40} />
            <p>{nguon === 'review' ? 'Không có báo giá nào đang chờ duyệt.' : 'Chưa có báo giá nào.'}</p>
            <span>{nguon === 'review' ? 'Báo giá sẽ xuất hiện khi nhân viên nộp duyệt.' : 'Tạo báo giá ở mục “Tạo bảng báo giá”.'}</span>
          </div>
        ) : (
          <div className="qrev-table-wrap">
            <table className="qrev-table">
              <thead>
                <tr>
                  <th>Báo giá</th>
                  <th>Sale</th>
                  <th>Cập nhật</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {ketQua.map(bg => {
                  const trangThai = chuyenTrangThaiBaoGia(bg.updateStatus);
                  const saleName = nguoiTaoBaoGia(bg);
                  return (
                    <tr key={bg.id} className="qrev-row" onClick={() => datChiTiet(bg)}>
                      <td>
                        <div className="qrev-cell-quote">
                          <div className="qrev-avatar" style={{ background: mauAvatar(bg.id) }}><FileText size={15} /></div>
                          <div className="qrev-cell-quote-text">
                            <span className="qrev-cell-name">{tenBaoGia(bg)}</span>
                            <span className="qrev-cell-sub">{dinhDangNgay(bg.createdAt)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="qrev-cell-sale">{saleName ? normalizeDisplayText(saleName) : '—'}</td>
                      <td className="qrev-cell-date">{dinhDangNgay(bg.updatedAt)}</td>
                      <td><HuyHieuTrangThai trangThai={trangThai} /></td>
                      <td>{renderHanhDong(bg, trangThai)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="qrev-table-bottom-spacer" aria-hidden="true" />
          </div>
        )}
      </div>

      {chiTiet && (
        <ChiTietBaoGiaSlidePanel
          baoGia={chiTiet}
          onClose={() => datChiTiet(null)}
          banDoTaiKhoan={banDoTaiKhoan}
          laNguoiDuyet={laNguoiDuyet}
          dangXuLy={dangXuLyId === chiTiet.id}
          onNop={bg => { datChiTiet(null); void nopBaoGia(bg); }}
          onDuyet={(bg, quyetDinh) => { datChiTiet(null); void duyetBaoGia(bg, quyetDinh); }}
          onTaoBanSua={bg => { datChiTiet(null); void taoBanSua(bg); }}
          onCapNhat={chiTiet.createdBy === nguoiDung?.id ? (bg) => { datChiTiet(null); capNhatBaoGia(bg); } : undefined}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
