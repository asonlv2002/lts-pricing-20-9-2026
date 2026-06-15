"use client";
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Search, Trash2, X, PackageSearch, RefreshCw } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import {
  loadProducts,
  dongBoDanhSachSanPham,
  taoSanPhamMoi,
  xoaSanPham,
  kiemTraThongTinSanPham,
  PRODUCT_CODE_PATTERN,
  type SanPhamUi,
} from '../lib/product-api';

const boDau = (chuoi: string) =>
  chuoi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function dinhDangNgay(iso?: string): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime();
  return ms ? new Date(ms).toLocaleDateString('vi-VN') : '—';
}

interface FormThemSanPham {
  productCode: string;
  productName: string;
  description: string;
}

const FORM_RONG: FormThemSanPham = { productCode: '', productName: '', description: '' };

export default function ModuleSanPham() {
  const { accessToken, isAuthenticated } = dungCuaHangTinhGia() as {
    accessToken?: string;
    isAuthenticated?: boolean;
  };

  const [danhSach, datDanhSach] = useState<SanPhamUi[]>(() => loadProducts());
  const [tuKhoa, datTuKhoa] = useState('');
  const [dangTai, datDangTai] = useState(false);
  const [loiTai, datLoiTai] = useState('');

  const [moModal, datMoModal] = useState(false);
  const [form, datForm] = useState<FormThemSanPham>(FORM_RONG);
  const [loiForm, datLoiForm] = useState<Record<string, string>>({});
  const [dangLuu, datDangLuu] = useState(false);

  const [xoaTarget, datXoaTarget] = useState<SanPhamUi | null>(null);
  const [dangXoa, datDangXoa] = useState(false);
  const [loiXoa, datLoiXoa] = useState('');

  const lamMoiTuServer = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      datDanhSach(loadProducts());
      return;
    }
    datDangTai(true);
    datLoiTai('');
    try {
      const data = await dongBoDanhSachSanPham(accessToken);
      datDanhSach(data);
    } catch (error) {
      datLoiTai(error instanceof Error ? error.message : 'Không tải được danh sách sản phẩm.');
      datDanhSach(loadProducts());
    } finally {
      datDangTai(false);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    void lamMoiTuServer();
  }, [lamMoiTuServer]);

  const ketQua = useMemo(() => {
    const q = boDau(tuKhoa.trim());
    if (!q) return danhSach;
    return danhSach.filter(sp => boDau(`${sp.productCode} ${sp.productName} ${sp.description ?? ''}`).includes(q));
  }, [danhSach, tuKhoa]);

  const moFormThem = () => {
    datForm(FORM_RONG);
    datLoiForm({});
    datMoModal(true);
  };

  const luuSanPham = async () => {
    const validation = kiemTraThongTinSanPham({ productCode: form.productCode, productName: form.productName });
    if (!validation.hopLe) {
      datLoiForm(validation.errors);
      return;
    }
    if (danhSach.some(sp => sp.productCode.toUpperCase() === form.productCode.trim().toUpperCase())) {
      datLoiForm({ productCode: 'Mã sản phẩm này đã tồn tại. Vui lòng chọn mã khác.' });
      return;
    }
    if (!isAuthenticated || !accessToken) {
      datLoiForm({ productCode: 'Bạn cần đăng nhập máy chủ để tạo sản phẩm.' });
      return;
    }
    datDangLuu(true);
    try {
      await taoSanPhamMoi(
        { productCode: form.productCode, productName: form.productName, description: form.description },
        accessToken,
      );
      datDanhSach(loadProducts());
      datMoModal(false);
      datForm(FORM_RONG);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không tạo được sản phẩm.';
      datLoiForm({
        productCode:
          message.includes('đã tồn tại') || message.includes('xung đột')
            ? 'Mã sản phẩm này đã được sử dụng. Vui lòng chọn mã khác.'
            : message,
      });
    } finally {
      datDangLuu(false);
    }
  };

  const xacNhanXoa = async () => {
    if (!xoaTarget) return;
    if (!isAuthenticated || !accessToken) {
      datLoiXoa('Bạn cần đăng nhập máy chủ để xóa sản phẩm.');
      return;
    }
    datDangXoa(true);
    datLoiXoa('');
    try {
      await xoaSanPham(xoaTarget.id, accessToken);
      datDanhSach(loadProducts());
      datXoaTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không xóa được sản phẩm.';
      datLoiXoa(
        message.includes('tồn tại') || message.includes('referenced') || message.includes('xung đột')
          ? 'Không thể xóa: sản phẩm đang được dùng bởi báo giá.'
          : message,
      );
    } finally {
      datDangXoa(false);
    }
  };

  return (
    <div className="crm-root" style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>Quản lý sản phẩm</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Danh mục sản phẩm dùng cho bảng tính giá và báo giá.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => void lamMoiTuServer()}
            disabled={dangTai}
          >
            <RefreshCw size={14} className={dangTai ? 'spin' : undefined} /> Làm mới
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={moFormThem}
          >
            <Plus size={14} /> Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14, maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 32 }}
          placeholder="Tìm mã hoặc tên sản phẩm..."
          value={tuKhoa}
          onChange={e => datTuKhoa(e.target.value)}
        />
      </div>

      {loiTai && (
        <div style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: 10 }}>{loiTai}</div>
      )}

      {/* Table desktop */}
      {ketQua.length === 0 ? (
        <div className="crm-empty" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
          <PackageSearch size={36} style={{ opacity: 0.5 }} />
          <p style={{ marginTop: 12 }}>
            {tuKhoa ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm nào. Bấm "Thêm sản phẩm" để tạo mới.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive product-table-wrap">
          <table className="data-table product-table">
            <thead>
              <tr>
                <th>Mã sản phẩm</th>
                <th>Tên sản phẩm</th>
                <th>Mô tả</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'center', width: 70 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {ketQua.map(sp => (
                <tr key={sp.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    <span className="product-mobile-primary">{sp.productCode}</span>
                    <span className="product-mobile-secondary">{sp.productName}</span>
                  </td>
                  <td className="product-col-name">{sp.productName}</td>
                  <td className="product-col-desc" style={{ color: 'var(--muted)' }}>{sp.description || '—'}</td>
                  <td className="product-col-date" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{dinhDangNgay(sp.createdAt)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      title="Xóa sản phẩm"
                      aria-label={`Xóa ${sp.productCode}`}
                      onClick={() => { datLoiXoa(''); datXoaTarget(sp); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal thêm sản phẩm */}
      {moModal && (
        <>
          <div onClick={() => !dangLuu && datMoModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Thêm sản phẩm"
            className="product-modal"
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 'min(460px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 48px)', overflow: 'auto',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              boxShadow: '0 24px 60px rgba(15,23,42,.28)', zIndex: 61, padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Thêm sản phẩm mới</h3>
              <button onClick={() => !dangLuu && datMoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Mã sản phẩm *</label>
              <input
                className="form-input"
                placeholder="VD: TUI_GAO_5KG"
                pattern={PRODUCT_CODE_PATTERN}
                value={form.productCode}
                onChange={e => { datForm(f => ({ ...f, productCode: e.target.value.toUpperCase() })); datLoiForm(l => ({ ...l, productCode: '' })); }}
                autoFocus
              />
              {loiForm.productCode
                ? <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: 5 }}>{loiForm.productCode}</div>
                : <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 5 }}>Chữ in HOA, số và dấu gạch dưới. VD: TUI_GAO_5KG</div>}
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Tên sản phẩm *</label>
              <input
                className="form-input"
                placeholder="VD: Túi gạo thơm 5kg"
                value={form.productName}
                onChange={e => { datForm(f => ({ ...f, productName: e.target.value })); datLoiForm(l => ({ ...l, productName: '' })); }}
              />
              {loiForm.productName && <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: 5 }}>{loiForm.productName}</div>}
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-input"
                rows={3}
                style={{ resize: 'vertical' }}
                placeholder="Mô tả thêm (tùy chọn)"
                value={form.description}
                onChange={e => datForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn btn-outline" onClick={() => datMoModal(false)} disabled={dangLuu}>Hủy</button>
              <button className="btn btn-primary" onClick={() => void luuSanPham()} disabled={dangLuu}>
                {dangLuu ? 'Đang lưu...' : 'Lưu sản phẩm'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal xác nhận xóa */}
      {xoaTarget && (
        <>
          <div onClick={() => !dangXoa && datXoaTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 'min(400px, calc(100vw - 32px))', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, boxShadow: '0 24px 60px rgba(15,23,42,.28)', zIndex: 61, padding: 20,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '1.02rem', fontWeight: 800 }}>Xóa sản phẩm</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: '0 0 16px' }}>
              Bạn có chắc chắn muốn xóa &quot;{xoaTarget.productCode} — {xoaTarget.productName}&quot;?
            </p>
            {loiXoa && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 12 }}>{loiXoa}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => datXoaTarget(null)} disabled={dangXoa}>Hủy</button>
              <button className="btn btn-red" onClick={() => void xacNhanXoa()} disabled={dangXoa}>
                {dangXoa ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
