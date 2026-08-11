'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PenLine, Loader2, Upload, Undo2, Trash2 } from 'lucide-react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';
import {
  CHU_KY_CANVAS_SIZE,
  doiTọaĐộ,
  veLaiCanvas,
  canvasSangFile,
  type NetVe,
} from '../../lib/chu-ky-ve';

const DINH_DANG_HOP_LE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const KICH_THUOC_HOP_LE = new Set(['256x256', '512x512', '1024x1024']);
const DUNG_LUONG_TOI_DA = 5 * 1024 * 1024;

type Tab = 've' | 'tai';

function docKichThuocAnh(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc tệp ảnh.'));
    };
    image.src = url;
  });
}

export default function DoiChuKyModal({ dong }: { dong: () => void }) {
  const taiChuKy = dungCuaHangTinhGia((s) => s.taiChuKy);
  const nguoiDung = dungCuaHangTinhGia((s) => s.nguoiDungHienTai);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tab, setTab] = useState<Tab>('ve');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [thanhCong, setThanhCong] = useState(false);

  // ── Vẽ chữ ký ────────────────────────────────────────────
  const [strokes, setStrokes] = useState<NetVe[]>([]);
  const [dangVe, setDangVe] = useState(false);
  const netHienTai = useRef<NetVe | null>(null);

  useEffect(() => {
    if (canvasRef.current) veLaiCanvas(canvasRef.current, strokes);
  }, [strokes]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function diemVe(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return doiTọaĐộ(e.clientX, e.clientY, rect);
  }

  function batDauVe(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const p = diemVe(e);
    if (!p) return;
    setLoi(null);
    setDangVe(true);
    netHienTai.current = { points: [p] };
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function dangVeDi(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dangVe || !netHienTai.current) return;
    const p = diemVe(e);
    if (!p) return;
    const last = netHienTai.current.points[netHienTai.current.points.length - 1];
    if (last && Math.abs(last.x - p.x) < 1 && Math.abs(last.y - p.y) < 1) return;
    netHienTai.current.points.push(p);
    veLaiCanvas(canvasRef.current!, [...strokes, netHienTai.current]);
  }

  function ketThucVe() {
    if (!dangVe) return;
    setDangVe(false);
    const stroke = netHienTai.current;
    if (stroke && stroke.points.length > 0) {
      setStrokes((s) => [...s, stroke]);
    }
    netHienTai.current = null;
  }

  function undoNet() {
    setStrokes((s) => (s.length > 0 ? s.slice(0, -1) : s));
  }

  function xoaHet() {
    netHienTai.current = null;
    setStrokes([]);
    if (canvasRef.current) veLaiCanvas(canvasRef.current, []);
  }

  // ── Upload ảnh ───────────────────────────────────────────
  async function chonAnh(nextFile?: File) {
    setLoi(null);
    if (!nextFile) return;
    if (!DINH_DANG_HOP_LE.has(nextFile.type)) {
      setLoi('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (nextFile.size > DUNG_LUONG_TOI_DA) {
      setLoi('Ảnh chữ ký không được vượt quá 5 MB.');
      return;
    }

    try {
      const { width, height } = await docKichThuocAnh(nextFile);
      if (!KICH_THUOC_HOP_LE.has(`${width}x${height}`)) {
        setLoi('Ảnh phải có kích thước 256×256, 512×512 hoặc 1024×1024 px.');
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không thể đọc tệp ảnh.');
    }
  }

  // ── Lưu ──────────────────────────────────────────────────
  async function luuChuKy() {
    let tep: File | null = null;
    if (tab === 've') {
      if (strokes.length === 0) {
        setLoi('Vui lòng vẽ chữ ký trước khi lưu.');
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      tep = await canvasSangFile(canvas);
    } else {
      tep = file;
    }
    if (!tep) {
      setLoi(tab === 've' ? 'Không tạo được ảnh chữ ký.' : 'Vui lòng chọn ảnh chữ ký.');
      return;
    }
    setDangTai(true);
    setLoi(null);
    try {
      await taiChuKy(tep);
      setThanhCong(true);
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Lưu chữ ký thất bại.');
    } finally {
      setDangTai(false);
    }
  }

  const hienPreview = tab === 'tai' && (previewUrl || nguoiDung?.signatureBlobUrl);

  return (
    <div className="lts-modal-overlay" onClick={() => !dangTai && dong()}>
      <div className="lts-modal-card lts-avatar-modal lts-signature-modal" role="dialog" aria-modal="true" aria-labelledby="chu-ky-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="lts-modal-head">
          <div className="lts-modal-head-icon"><PenLine size={18} /></div>
          <div>
            <h3 id="chu-ky-modal-title">Đổi chữ ký LSX</h3>
            <p className="lts-modal-sub">Chữ ký sẽ tự động gắn vào PDF LSX do <strong>@{nguoiDung?.account || '—'}</strong> tạo</p>
          </div>
        </div>

        <div className="lts-modal-body">
          {thanhCong ? (
            <div className="lts-modal-success">
              <div className="lts-modal-success-icon">&#10003;</div>
              <h3>Lưu chữ ký thành công</h3>
              <p>Chữ ký sẽ xuất hiện trên các LSX bạn tạo từ bây giờ.</p>
            </div>
          ) : (
            <>
              <div className="lts-signature-tabs" role="tablist" aria-label="Cách tạo chữ ký">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 've'}
                  className={`lts-signature-tab ${tab === 've' ? 'lts-signature-tab--active' : ''}`}
                  onClick={() => { setTab('ve'); setLoi(null); }}
                >
                  <PenLine size={14} /> Vẽ chữ ký
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'tai'}
                  className={`lts-signature-tab ${tab === 'tai' ? 'lts-signature-tab--active' : ''}`}
                  onClick={() => { setTab('tai'); setLoi(null); }}
                >
                  <Upload size={14} /> Tải ảnh lên
                </button>
              </div>

              {tab === 've' ? (
                <>
                  <div className="lts-signature-canvas-wrap">
                    <canvas
                      ref={canvasRef}
                      className="lts-signature-canvas"
                      width={CHU_KY_CANVAS_SIZE}
                      height={CHU_KY_CANVAS_SIZE}
                      onPointerDown={batDauVe}
                      onPointerMove={dangVeDi}
                      onPointerUp={ketThucVe}
                      onPointerLeave={ketThucVe}
                      aria-label="Vùng vẽ chữ ký"
                    />
                  </div>
                  <div className="lts-signature-actions">
                    <button type="button" className="lts-btn lts-btn--ghost" onClick={undoNet} disabled={strokes.length === 0}>
                      <Undo2 size={14} /> Undo
                    </button>
                    <button type="button" className="lts-btn lts-btn--ghost" onClick={xoaHet} disabled={strokes.length === 0}>
                      <Trash2 size={14} /> Xóa hết
                    </button>
                  </div>
                  <p className="lts-avatar-upload-hint">Vẽ chữ ký bằng chuột hoặc ngón tay · nền trắng, nét đen</p>
                </>
              ) : (
                <>
                  <div className="lts-avatar-upload-preview">
                    {hienPreview ? (
                      <img src={hienPreview || ''} alt="Xem trước chữ ký" style={{ objectFit: 'contain', background: '#fff' }} />
                    ) : (
                      <span><PenLine size={28} /></span>
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    className="lts-avatar-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => chonAnh(event.target.files?.[0])}
                    disabled={dangTai}
                  />
                  <button type="button" className="lts-avatar-file-button" onClick={() => inputRef.current?.click()} disabled={dangTai}>
                    <Upload size={16} /> {previewUrl ? 'Chọn ảnh khác' : 'Chọn ảnh chữ ký'}
                  </button>
                  <p className="lts-avatar-upload-hint">JPEG, PNG hoặc WebP · tối đa 5 MB · 256×256 / 512×512 / 1024×1024 px</p>
                  {file && <p className="lts-avatar-upload-name">{file.name}</p>}
                </>
              )}

              {loi && <div className="lts-modal-error" role="alert">{loi}</div>}
            </>
          )}
        </div>

        {!thanhCong && (
          <div className="lts-modal-foot">
            <button type="button" className="lts-btn lts-btn--ghost" onClick={dong} disabled={dangTai}>Hủy</button>
            <button
              type="button"
              className="lts-btn lts-btn--primary"
              onClick={luuChuKy}
              disabled={dangTai || (tab === 'tai' && !file)}
            >
              {dangTai ? <><Loader2 size={14} className="um-spin" /> Đang lưu...</> : 'Lưu chữ ký'}
            </button>
          </div>
        )}
        {thanhCong && (
          <div className="lts-modal-foot">
            <button type="button" className="lts-btn lts-btn--primary" onClick={dong}>Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
}
