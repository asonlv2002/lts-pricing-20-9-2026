'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Check, Download, FileSpreadsheet, Upload, X,
} from 'lucide-react';
import {
  computeImportStats,
  downloadTemplate,
  generateErrorReport,
  MAX_IMPORT_ROWS,
  parseImportFile,
  processImportRows,
  type ImportRow,
  type ImportRowStatus,
} from '../../lib/customer-import';
import {
  kiemTraMaKhachHang,
} from '../../lib/customer-api';
import type { CustomerManagerUi } from '../../lib/customer-api';
import {
  taoMaKhachHangService,
  luuThongTinKhachHangService,
} from '../../lib/api/service-lts';
import { chuyenCustomerUiSangThongTinApi } from '../../lib/customer-api';

interface ExistingCustomer {
  customerCode: string;
  companyName: string;
  phone?: string;
}

type PanelStep = 'upload' | 'preview' | 'importing' | 'result';

interface ImportKhachHangPanelProps {
  customers: ExistingCustomer[];
  accessToken?: string;
  currentSellerId?: string;
  onClose: () => void;
  onImported: () => void;
}

const STATUS_ICON: Record<ImportRowStatus, string> = {
  ok: '✅',
  duplicate_code: '⚠️',
  duplicate_name_phone: '⚠️',
  missing_fields: '❌',
  invalid_code: '❌',
  invalid_phone: '❌',
  invalid_email: '❌',
};

const STATUS_LABEL: Record<ImportRowStatus, string> = {
  ok: 'Mới',
  duplicate_code: 'Trùng mã KH',
  duplicate_name_phone: 'Trùng tên + SĐT',
  missing_fields: 'Thiếu',
  invalid_code: 'Sai mã KH',
  invalid_phone: 'SĐT sai',
  invalid_email: 'Email sai',
};

function isErrorStatus(s: ImportRowStatus): boolean {
  return s === 'duplicate_code' || s === 'missing_fields' || s === 'invalid_code' || s === 'invalid_phone' || s === 'invalid_email';
}

function isWarnStatus(s: ImportRowStatus): boolean {
  return s === 'duplicate_name_phone';
}

export default function ImportKhachHangPanel({
  customers,
  accessToken,
  currentSellerId,
  onClose,
  onImported,
}: ImportKhachHangPanelProps) {
  const [step, setStep] = useState<PanelStep>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: string[];
    skipped: { code: string; reason: string }[];
    errors: { code: string; reason: string }[];
  }>({ success: [], skipped: [], errors: [] });
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'overwrite'>('skip');
  const [errorMode, setErrorMode] = useState<'skip' | 'force'>('skip');
  const [defaultSellerId, setDefaultSellerId] = useState<string>(currentSellerId ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|csv)$/i)) {
      alert('Chỉ hỗ trợ file .xlsx hoặc .csv');
      return;
    }

    setFileName(file.name);
    setStep('preview');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const parsed = parseImportFile(buffer, file.name);
        if (parsed.length === 0) {
          alert('Không tìm thấy dữ liệu trong file. Kiểm tra lại định dạng.');
          setStep('upload');
          return;
        }

        const existing = customers.map(c => ({
          customerCode: c.customerCode,
          companyName: c.companyName,
          phone: c.phone ?? '',
        }));

        const processed = processImportRows(parsed, existing);
        setRows(processed);
      } catch {
        alert('Không đọc được file. Kiểm tra lại định dạng file.');
        setStep('upload');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [customers]);

  const toggleRow = (idx: number) => {
    setRows(prev => prev.map(r => r.index === idx ? { ...r, selected: !r.selected } : r));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const resetToUpload = () => {
    setStep('upload');
    setRows([]);
    setFileName('');
    setImportResult({ success: [], skipped: [], errors: [] });
  };

  const doImport = async () => {
    const selected = rows.filter(r => r.selected);
    if (selected.length === 0) {
      alert('Không có dòng nào được chọn để tải.');
      return;
    }

    if (!accessToken) {
      alert('Bạn cần đăng nhập để tải khách hàng lên server.');
      return;
    }

    setStep('importing');
    setImporting(true);

    const success: string[] = [];
    const skipped: { code: string; reason: string }[] = [];
    const errors: { code: string; reason: string }[] = [];

    for (const row of selected) {
      const check = kiemTraMaKhachHang(row.raw.customerCode);
      if (!check.hopLe) {
        errors.push({ code: row.raw.customerCode || `Dòng ${row.index}`, reason: check.loi ?? 'Mã KH không hợp lệ' });
        continue;
      }

      const codeName = check.maKhachHang;

      try {
        await taoMaKhachHangService(codeName, accessToken);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lỗi tạo mã KH';
        if (msg.includes('đã tồn tại') || msg.includes('xung đột')) {
          skipped.push({ code: codeName, reason: `Mã KH ${codeName} đã tồn tại trên server` });
          continue;
        }
        errors.push({ code: codeName, reason: msg });
        continue;
      }

      try {
        const customerUi = {
          id: codeName,
          customerType: row.raw.customerType,
          customerCode: codeName,
          companyName: row.raw.companyName,
          taxCode: row.raw.taxCode || undefined,
          contactName: row.raw.contactName,
          phone: row.raw.phone,
          email: row.raw.email,
          invoiceAddress: row.raw.invoiceAddress || undefined,
          address: row.raw.address,
          customerGroup: row.raw.customerGroup || undefined,
          sellerId: defaultSellerId || null,
          sellerName: '',
          secondarySellerId: null,
          secondarySellerName: '',
          managers: [] as CustomerManagerUi[],
          contactNotes: row.raw.contactNotes || undefined,
          assignmentNote: row.raw.assignmentNote || undefined,
          status: 'active' as const,
          isLocked: false,
          notes: row.raw.notes || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await luuThongTinKhachHangService(codeName, chuyenCustomerUiSangThongTinApi(customerUi as any), accessToken);
        success.push(codeName);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lỗi lưu thông tin KH';
        errors.push({ code: codeName, reason: msg });
      }
    }

    setImportResult({ success, skipped, errors });
    setImporting(false);
    setStep('result');
  };

  const stats = computeImportStats(rows);

  return (
    <>
      <div className="crm2-overlay crm2-overlay--open" onClick={onClose} />
      <div className="crm2-slide-panel crm2-slide-panel--open crm2-import-panel" role="dialog" aria-modal="true" aria-label="Nhập khách hàng từ Excel">
        <div className="crm2-panel-header">
          <div>
            <div className="crm2-wizard-kicker">Nhập hàng loạt</div>
            <h2 className="crm2-wizard-title">Nhập khách hàng từ Excel</h2>
          </div>
          <button type="button" className="crm2-btn-icon crm2-wizard-close" aria-label="Đóng" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="crm2-panel-body crm2-import-body">
          {step === 'upload' && (
            <div className="crm2-import-upload">
              <div
                ref={dropRef}
                className="crm2-import-dropzone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet size={48} strokeWidth={1.2} />
                <p className="crm2-import-dropzone-title">Kéo thả file vào đây</p>
                <p className="crm2-import-dropzone-sub">hoặc click để chọn file</p>
                <p className="crm2-import-dropzone-hint">Hỗ trợ .xlsx, .csv (tối đa {MAX_IMPORT_ROWS} dòng)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
              </div>

              <div className="crm2-import-template">
                <button type="button" className="crm2-btn crm2-btn--ghost" onClick={downloadTemplate}>
                  <Download size={15} /> Tải file mẫu Excel
                </button>
                <p className="crm2-import-template-hint">
                  File cần có hàng đầu tiên là tiêu đề cột: Mã KH, Tên công ty, Địa chỉ, SĐT, Email...
                </p>
              </div>
            </div>
          )}

          {(step === 'preview' || step === 'importing') && (
            <div className="crm2-import-preview">
              <div className="crm2-import-file-info">
                <FileSpreadsheet size={16} />
                <span>{fileName}</span>
                <span className="crm2-import-file-rows">· {stats.total} dòng</span>
              </div>

              <div className="crm2-import-stats">
                <span className="crm2-import-stat crm2-import-stat--ok">
                  <Check size={14} /> {stats.ok} Mới
                </span>
                <span className="crm2-import-stat crm2-import-stat--warn">
                  <AlertTriangle size={14} /> {stats.duplicate} Trùng
                </span>
                <span className="crm2-import-stat crm2-import-stat--error">
                  <AlertTriangle size={14} /> {stats.error} Lỗi
                </span>
                <span className="crm2-import-stat crm2-import-stat--will">
                  Sẽ tải: {stats.willImport} khách hàng
                </span>
              </div>

              <div className="crm2-import-table-wrap">
                <table className="crm2-import-table">
                  <thead>
                    <tr>
                      <th className="crm2-import-th-check"></th>
                      <th className="crm2-import-th-status"></th>
                      <th>Tên / Mã KH</th>
                      <th>Loại</th>
                      <th>SĐT</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <React.Fragment key={row.index}>
                        <tr className={`crm2-import-row ${isErrorStatus(row.status) ? 'crm2-import-row--error' : ''} ${isWarnStatus(row.status) ? 'crm2-import-row--warn' : ''}`}>
                          <td className="crm2-import-td-check">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRow(row.index)}
                              disabled={isErrorStatus(row.status) && row.status === 'missing_fields'}
                            />
                          </td>
                          <td className="crm2-import-td-status">
                            <span className="crm2-import-status-icon">{STATUS_ICON[row.status]}</span>
                          </td>
                          <td className="crm2-import-td-name">
                            <div className="crm2-import-name">{row.raw.companyName || (row.raw.customerType === 'individual' ? row.raw.contactName : '') || <em>(trống)</em>}</div>
                            <div className="crm2-import-code">{row.raw.customerCode || <em>(trống)</em>}</div>
                          </td>
                          <td className="crm2-import-td-type">
                            {row.raw.customerType === 'individual' ? 'CN' : 'DN'}
                          </td>
                          <td className="crm2-import-td-phone">
                            {row.raw.phone || <em>(trống)</em>}
                          </td>
                          <td className="crm2-import-td-note">
                            {row.note ? (
                              <span className={`crm2-import-note ${isErrorStatus(row.status) ? 'crm2-import-note--error' : 'crm2-import-note--warn'}`}>
                                {STATUS_LABEL[row.status]}{row.note ? `: ${row.note.replace(STATUS_LABEL[row.status], '').replace(/^:\s*/, '').replace(/^Thiếu: /, 'Thiếu ')}` : ''}
                              </span>
                            ) : (
                              <span className="crm2-import-note crm2-import-note--ok">—</span>
                            )}
                          </td>
                        </tr>
                        {row.duplicateInfo && (
                          <tr className="crm2-import-dup-info">
                            <td colSpan={6}>
                              <span>{STATUS_ICON[row.status]} {row.duplicateInfo}</span>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="crm2-import-options">
                <div className="crm2-import-option">
                  <span className="crm2-import-option-label">Dòng trùng:</span>
                  <label className="crm2-import-radio">
                    <input type="radio" checked={duplicateMode === 'skip'} onChange={() => setDuplicateMode('skip')} />
                    Bỏ qua
                  </label>
                  <label className="crm2-import-radio">
                    <input type="radio" checked={duplicateMode === 'overwrite'} onChange={() => setDuplicateMode('overwrite')} />
                    Ghi đè
                  </label>
                </div>
                <div className="crm2-import-option">
                  <span className="crm2-import-option-label">Dòng lỗi:</span>
                  <label className="crm2-import-radio">
                    <input type="radio" checked={errorMode === 'skip'} onChange={() => setErrorMode('skip')} />
                    Bỏ qua
                  </label>
                  <label className="crm2-import-radio">
                    <input type="radio" checked={errorMode === 'force'} onChange={() => setErrorMode('force')} />
                    Vẫn tải
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="crm2-import-result">
              <div className="crm2-import-result-card">
                <div className="crm2-import-result-icon">✅</div>
                <h3>Nhập hoàn tất!</h3>
                <div className="crm2-import-result-summary">
                  <p>{importResult.success.length} khách hàng đã được tạo thành công</p>
                  {importResult.skipped.length > 0 && <p>{importResult.skipped.length} dòng bị bỏ qua (trùng)</p>}
                  {importResult.errors.length > 0 && <p>{importResult.errors.length} dòng bị lỗi</p>}
                </div>
              </div>

              {(importResult.skipped.length > 0 || importResult.errors.length > 0) && (
                <div className="crm2-import-error-log">
                  <h4>Chi tiết</h4>
                  <ul>
                    {importResult.errors.map((e, i) => (
                      <li key={`err-${i}`} className="crm2-import-log-item crm2-import-log-item--error">
                        ❌ {e.code}: {e.reason}
                      </li>
                    ))}
                    {importResult.skipped.map((s, i) => (
                      <li key={`skip-${i}`} className="crm2-import-log-item crm2-import-log-item--warn">
                        ⚠️ {s.code}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(importResult.skipped.length > 0 || importResult.errors.length > 0) && (
                <button
                  type="button"
                  className="crm2-btn crm2-btn--ghost"
                  onClick={() => generateErrorReport(importResult)}
                >
                  <Download size={14} /> Tải báo cáo lỗi .csv
                </button>
              )}
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className="crm2-import-actions">
            <button type="button" className="crm2-btn crm2-btn--ghost" onClick={resetToUpload}>
              ← Chọn file khác
            </button>
            <button
              type="button"
              className={`crm2-btn crm2-btn--primary${stats.error > 0 ? ' crm2-btn--muted' : ''}`}
              onClick={doImport}
            >
              <Upload size={15} /> Tải khách hàng
            </button>
          </div>
        )}

        {step === 'importing' && (
          <div className="crm2-import-actions">
            <span className="crm2-import-progress">Đang tải khách hàng lên server...</span>
          </div>
        )}

        {step === 'result' && (
          <div className="crm2-import-actions">
            <button
              type="button"
              className="crm2-btn crm2-btn--primary"
              onClick={() => {
                onImported();
                onClose();
              }}
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .crm2-import-panel {
          width: 580px;
          max-width: 92vw;
          z-index: 1420;
        }

        .crm2-import-body {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 20px 24px;
        }

        .crm2-import-upload {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .crm2-import-dropzone {
          border: 2px dashed var(--border, #d1d5db);
          border-radius: 12px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary, #6b7280);
        }

        .crm2-import-dropzone:hover {
          border-color: var(--primary, #3b82f6);
          background: var(--primary-light, #eff6ff);
        }

        .crm2-import-dropzone-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text, #1f2937);
          margin: 0;
        }

        .crm2-import-dropzone-sub {
          font-size: 0.88rem;
          color: var(--muted, #6b7280);
          margin: 0;
        }

        .crm2-import-dropzone-hint {
          font-size: 0.78rem;
          color: var(--muted, #9ca3af);
          margin: 0;
        }

        .crm2-import-template {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .crm2-import-template-hint {
          font-size: 0.78rem;
          color: var(--muted, #9ca3af);
          margin: 0;
          text-align: center;
        }

        .crm2-import-preview {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          overflow: hidden;
        }

        .crm2-import-file-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text, #1f2937);
        }

        .crm2-import-file-rows {
          color: var(--muted, #6b7280);
          font-weight: 400;
        }

        .crm2-import-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .crm2-import-stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .crm2-import-stat--ok { color: #16a34a; }
        .crm2-import-stat--warn { color: #d97706; }
        .crm2-import-stat--error { color: #dc2626; }
        .crm2-import-stat--will { color: var(--primary, #3b82f6); margin-left: auto; }

        .crm2-import-table-wrap {
          flex: 1;
          overflow: auto;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 8px;
        }

        .crm2-import-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .crm2-import-table thead {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--surface2, #f9fafb);
        }

        .crm2-import-table th {
          padding: 8px 10px;
          text-align: left;
          font-weight: 700;
          font-size: 0.76rem;
          color: var(--text-secondary, #6b7280);
          border-bottom: 2px solid var(--border, #e5e7eb);
          white-space: nowrap;
        }

        .crm2-import-th-check { width: 36px; text-align: center; }
        .crm2-import-th-status { width: 36px; text-align: center; }

        .crm2-import-table td {
          padding: 7px 10px;
          border-bottom: 1px solid var(--border, #f3f4f6);
          vertical-align: top;
        }

        .crm2-import-td-check {
          text-align: center;
          width: 36px;
        }

        .crm2-import-td-status {
          text-align: center;
          width: 36px;
        }

        .crm2-import-status-icon {
          font-size: 0.95rem;
        }

        .crm2-import-row--error {
          background: rgba(220, 38, 38, 0.04);
        }

        .crm2-import-row--warn {
          background: rgba(217, 119, 6, 0.04);
        }

        .crm2-import-td-name {
          min-width: 140px;
        }

        .crm2-import-name {
          font-weight: 600;
          color: var(--text, #1f2937);
          line-height: 1.3;
        }

        .crm2-import-code {
          font-size: 0.75rem;
          color: var(--muted, #6b7280);
          margin-top: 2px;
        }

        .crm2-import-td-type {
          width: 36px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--muted, #6b7280);
        }

        .crm2-import-td-phone {
          width: 90px;
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .crm2-import-td-note {
          min-width: 80px;
          font-size: 0.76rem;
        }

        .crm2-import-note--error { color: #dc2626; }
        .crm2-import-note--warn { color: #d97706; }
        .crm2-import-note--ok { color: var(--muted, #9ca3af); }

        .crm2-import-dup-info td {
          padding: 4px 10px 7px 46px;
          font-size: 0.75rem;
          color: #d97706;
          background: rgba(217, 119, 6, 0.04);
          border-bottom: 1px solid var(--border, #f3f4f6);
        }

        .crm2-import-options {
          display: flex;
          gap: 24px;
          padding: 12px 0;
          border-top: 1px solid var(--border, #e5e7eb);
        }

        .crm2-import-option {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .crm2-import-option-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text, #1f2937);
        }

        .crm2-import-radio {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .crm2-import-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 24px;
          border-top: 1px solid var(--border, #e5e7eb);
          background: var(--surface, #fff);
        }

        .crm2-btn--muted {
          opacity: 0.45;
          pointer-events: none;
        }

        .crm2-import-progress {
          font-size: 0.88rem;
          color: var(--primary, #3b82f6);
          font-weight: 600;
        }

        .crm2-import-result {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          text-align: center;
        }

        .crm2-import-result-card {
          padding: 32px 24px;
          background: var(--surface2, #f9fafb);
          border-radius: 12px;
          border: 1px solid var(--border, #e5e7eb);
        }

        .crm2-import-result-icon {
          font-size: 2.5rem;
          margin-bottom: 8px;
        }

        .crm2-import-result-card h3 {
          margin: 0 0 12px;
          font-size: 1.1rem;
          color: var(--text, #1f2937);
        }

        .crm2-import-result-summary p {
          margin: 4px 0;
          font-size: 0.88rem;
          color: var(--text-secondary, #6b7280);
        }

        .crm2-import-error-log {
          width: 100%;
          text-align: left;
        }

        .crm2-import-error-log h4 {
          margin: 0 0 8px;
          font-size: 0.88rem;
          color: var(--text, #1f2937);
        }

        .crm2-import-error-log ul {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 0.8rem;
        }

        .crm2-import-log-item {
          padding: 4px 0;
        }

        .crm2-import-log-item--error { color: #dc2626; }
        .crm2-import-log-item--warn { color: #d97706; }
      `}</style>
    </>
  );
}
