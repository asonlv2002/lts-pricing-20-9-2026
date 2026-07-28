'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload } from 'lucide-react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';

const KICH_THUOC_HOP_LE = new Set(['512x512', '1024x1024']);
const DINH_DANG_HOP_LE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DUNG_LUONG_TOI_DA = 5 * 1024 * 1024;

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

export default function DoiAnhDaiDienModal({ dong }: { dong: () => void }) {
  const taiAnhDaiDien = dungCuaHangTinhGia((s) => s.taiAnhDaiDien);
  const nguoiDung = dungCuaHangTinhGia((s) => s.nguoiDungHienTai);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function chonAnh(nextFile?: File) {
    setLoi(null);
    if (!nextFile) return;
    if (!DINH_DANG_HOP_LE.has(nextFile.type)) {
      setLoi('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (nextFile.size > DUNG_LUONG_TOI_DA) {
      setLoi('Ảnh đại diện không được vượt quá 5 MB.');
      return;
    }

    try {
      const { width, height } = await docKichThuocAnh(nextFile);
      if (!KICH_THUOC_HOP_LE.has(`${width}x${height}`)) {
        setLoi('Ảnh phải có kích thước 512×512 hoặc 1024×1024 px.');
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không thể đọc tệp ảnh.');
    }
  }

  async function luuAnh() {
    if (!file) {
      setLoi('Vui lòng chọn ảnh đại diện.');
      return;
    }
    setDangTai(true);
    setLoi(null);
    try {
      await taiAnhDaiDien(file);
      dong();
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Tải ảnh đại diện thất bại.');
    } finally {
      setDangTai(false);
    }
  }

  return (
    <div className="lts-modal-overlay" onClick={() => !dangTai && dong()}>
      <div className="lts-modal-card lts-avatar-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="lts-modal-head">
          <div className="lts-modal-head-icon"><ImagePlus size={18} /></div>
          <div>
            <h3 id="avatar-modal-title">Đổi ảnh đại diện</h3>
            <p className="lts-modal-sub">Tải ảnh cho tài khoản <strong>@{nguoiDung?.account || '—'}</strong></p>
          </div>
        </div>
        <div className="lts-modal-body">
          <div className="lts-avatar-upload-preview">
            {previewUrl || nguoiDung?.avatarBlobUrl ? (
              <img src={previewUrl || nguoiDung?.avatarBlobUrl || ''} alt="Xem trước ảnh đại diện" />
            ) : (
              <span>{nguoiDung?.fullName.slice(0, 2).toUpperCase()}</span>
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
            <Upload size={16} /> Chọn ảnh
          </button>
          <p className="lts-avatar-upload-hint">JPEG, PNG hoặc WebP · tối đa 5 MB · 512×512 hoặc 1024×1024 px</p>
          {file && <p className="lts-avatar-upload-name">{file.name}</p>}
          {loi && <div className="lts-modal-error" role="alert">{loi}</div>}
        </div>
        <div className="lts-modal-foot">
          <button type="button" className="lts-btn lts-btn--ghost" onClick={dong} disabled={dangTai}>Hủy</button>
          <button type="button" className="lts-btn lts-btn--primary" onClick={luuAnh} disabled={dangTai || !file}>
            {dangTai ? <><Loader2 size={14} className="um-spin" /> Đang lưu...</> : 'Lưu ảnh'}
          </button>
        </div>
      </div>
    </div>
  );
}
