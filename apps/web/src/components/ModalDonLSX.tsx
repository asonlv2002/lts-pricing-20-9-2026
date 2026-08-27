"use client";
// src/components/ModalDonLSX.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal form de tao LSX (legacy wrapper, giu de tuong thich).
// Form body da tach ra LsxFormFields (xem components/lsx/LsxFormFields.tsx).
// Modal chi them: backdrop, top bar, footer button, submit logic.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Loader2, FileDown } from 'lucide-react';

import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { LsxSourceData, ProductionOrder, LSXManualFields } from '../lib/types';
import { classifyLsxBagType } from '../lib/lsx-bag-classification';
import { exportLSXtoDOCX } from '../lib/lsxExport';
import { exportLSXtoPDF } from './LsxPdfDocument';
import { genMsp } from '../lib/lsx-msp';
import { themChuKyVaoManual } from '../lib/chu-ky';
import {
  buildManualFromSource,
  buildSnapshotFromSource,
  genOrderId,
} from '../lib/lsx-build-order';
import { LsxFormFields } from './lsx/LsxFormFields';

interface Props {
  sources: LsxSourceData[];
  activeIndex: number;
  onClose: () => void;
}

function buildShortLabel(s: LsxSourceData): string {
  const loai = s.input.productType === 'mang' ? 'Màng' : 'Túi';
  const sl = s.input.quantity.toLocaleString('vi-VN');
  const dv = s.input.productType === 'mang' ? 'm²' : 'túi';
  return `${s.productName} (${loai}, ${sl} ${dv})`;
}

export default function LSXFormModal({ sources, activeIndex, onClose }: Props) {
  const {
    materials, constants, profitTable, smallWidthPrices,
    productionOrders, themLSX, currentSellerName,
  } = dungCuaHangTinhGia();

  const sourceData = sources[activeIndex] ?? sources[0];
  const inp = sourceData.input;

  const autoBagType = useMemo(
    () => classifyLsxBagType(inp.bagType, inp.hasZipper),
    [inp.bagType, inp.hasZipper],
  );

  function initManual(s: LsxSourceData, bagInfo: ReturnType<typeof classifyLsxBagType>) {
    return buildManualFromSource(s, {
      materials,
      constants,
      profitTable,
      smallWidthPrices,
      productionOrders,
      preparedBy: currentSellerName,
    }, bagInfo);
  }

  const [manual, setManual] = useState<LSXManualFields>(() => initManual(sourceData, autoBagType));
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!sourceData) return;
    const bagInfo = classifyLsxBagType(sourceData.input.bagType, sourceData.input.hasZipper);
    setManual(initManual(sourceData, bagInfo));
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceData.id]);

  async function handleSubmit(format: 'docx' | 'pdf' = 'docx') {
    if (!sourceData.customer?.trim()) {
      alert('Vui lòng có Khách hàng trước khi lưu LSX.');
      return;
    }
    if (!manual.tenSP?.trim() && !sourceData.productName?.trim()) {
      alert('Vui lòng nhập Tên sản phẩm.');
      return;
    }
    setLoading(true);

    try {
      const manualToSave: LSXManualFields = {
        ...manual,
        msp: manual.msp?.trim() || genMsp(productionOrders),
        tenSP: manual.tenSP?.trim() || sourceData.productName || '',
      };
      const manualCoChuKy = await themChuKyVaoManual(manualToSave);
      const order: ProductionOrder = {
        id: genOrderId(),
        quoteId: sourceData.id,
        createdAt: new Date().toISOString(),
        status: 'created',
        manual: manualCoChuKy,
        snapshot: buildSnapshotFromSource(sourceData, manualCoChuKy, materials),
      };

      await themLSX(order);
      if (format === 'pdf') {
        await exportLSXtoPDF(order, null);
      } else {
        await exportLSXtoDOCX(order, null);
      }

      setDone(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error('[LSX] Export error:', err);
      alert('Có lỗi khi xuất file. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          background: '#fff',
          borderRadius: '4px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          width: 'min(860px, 95vw)',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal top bar (close button) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '2px solid #2E7D32',
          background: '#f9f9f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#2E7D32', whiteSpace: 'nowrap' }}>
              📋 Tạo Lệnh Sản Xuất
            </div>
            <div style={{
              fontSize: '11px', fontWeight: 600, color: '#333',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }} title={buildShortLabel(sourceData)}>
              {buildShortLabel(sourceData)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '4px', flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body (60+ fields, extracted to LsxFormFields) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#fff' }}>
          <LsxFormFields source={sourceData} value={manual} onChange={setManual} />
        </div>

        {/* Footer buttons */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          padding: '10px 16px',
          borderTop: '2px solid #2E7D32',
          flexShrink: 0,
          background: '#f9f9f9',
        }}>
          {done ? (
            <div style={{ color: '#2E7D32', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✓ Đã lưu & xuất thành công!
            </div>
          ) : (
            <>
              <button className="btn btn-outline" onClick={onClose} disabled={loading} style={{ fontSize: '12px' }}>
                Huỷ
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#1976D2', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleSubmit('docx')}
                disabled={loading}
              >
                {loading ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
                Lưu & Xuất DOCX
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#059669', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleSubmit('pdf')}
                disabled={loading}
              >
                {loading ? <Loader2 size={14} className="spin" /> : <FileDown size={14} />}
                Lưu & Xuất PDF
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
