"use client";
// src/components/LSXFormModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal form để admin điền tay các trường còn thiếu khi tạo Lệnh Sản Xuất.
// Pre-fill tự động từ HistoryItem, phân nhánh theo productType (mang / tui).
// Layout giống y mẫu thực tế QT.ISO-22-BM02 (bảng có border, nền xanh/vàng).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { X, FileText, Loader2, FileDown } from 'lucide-react';

import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { LsxSourceData, ProductionOrder, LSXManualFields } from '../lib/types';
import { classifyLsxBagType, classifyLsxBagTypeByKey, ALL_LSX_BAG_TYPES, resolveLsxStageFlags, resolveLsxBagVisibleFields, type LsxBagTypeInfo } from '../lib/lsx-bag-classification';
import { exportLSXtoDOCX } from '../lib/lsxExport';
import { exportLSXtoPDF } from './LsxPdfDocument';
import { genMsp } from '../lib/lsx-msp';
import { formatLsxFoldBottom } from '../lib/lsx-quy-cach';
import { resolveLsxDivideSpec } from '../lib/lsx-divide';
import {
  buildManualFromSource,
  buildSnapshotFromSource,
  genOrderId,
  syncLegacyLaminateFields,
  type LamLayerPart,
  type LamLayerRow,
} from '../lib/lsx-build-order';

// ── CSS cho form giống mẫu thực ─────────────────────────────────────────────
const styles = {
  // Bảng chung
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    tableLayout: 'fixed' as const,
    fontSize: '12px',
    fontFamily: '"Times New Roman", Times, serif',
  },
  td: {
    border: '1px solid #333',
    padding: '3px 6px',
    verticalAlign: 'middle' as const,
    fontSize: '12px',
    lineHeight: '1.4',
    overflow: 'hidden' as const,
    wordBreak: 'break-word' as const,
  },
  lbl: {
    border: '1px solid #333',
    padding: '3px 6px',
    fontWeight: 700 as const,
    fontSize: '11px',
    whiteSpace: 'normal' as const,
    background: '#f8f8f8',
    verticalAlign: 'middle' as const,
    lineHeight: '1.3',
    color: '#222',
    overflow: 'hidden' as const,
    wordBreak: 'break-word' as const,
  },
  hdrGreen: {
    background: '#2E7D32',
    color: '#fff',
    fontWeight: 700 as const,
    fontSize: '16px',
    textAlign: 'center' as const,
    padding: '6px',
    letterSpacing: '3px',
    border: '1px solid #333',
  },
  secYellow: {
    background: '#FFF9C4',
    fontWeight: 700 as const,
    fontSize: '12px',
    padding: '4px 8px',
    border: '1px solid #333',
    textAlign: 'center' as const,
    letterSpacing: '1px',
  },
  secBlue: {
    background: '#BBDEFB',
    fontWeight: 700 as const,
    fontSize: '12px',
    textAlign: 'center' as const,
    padding: '4px 8px',
    border: '1px solid #333',
    letterSpacing: '1px',
  },
  footerCell: {
    textAlign: 'center' as const,
    padding: '8px',
    height: '60px',
    verticalAlign: 'top' as const,
    border: '1px solid #333',
    fontSize: '12px',
  },
  input: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box' as const,
    border: '1px solid #ccc',
    borderRadius: '2px',
    padding: '2px 4px',
    fontSize: '11px',
    fontFamily: '"Times New Roman", Times, serif',
    background: '#fffff0',
    outline: 'none',
  },
  inputNum: {
    width: '100%',
    maxWidth: '80px',
    minWidth: 0,
    boxSizing: 'border-box' as const,
    border: '1px solid #ccc',
    borderRadius: '2px',
    padding: '2px 4px',
    fontSize: '11px',
    fontFamily: '"Times New Roman", Times, serif',
    background: '#fffff0',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box' as const,
    border: '1px solid #ccc',
    borderRadius: '2px',
    padding: '2px 4px',
    fontSize: '11px',
    fontFamily: '"Times New Roman", Times, serif',
    background: '#fffff0',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '28px',
  },
  boldVal: {
    fontWeight: 700 as const,
    color: '#c00',
  },
  pageNum: {
    textAlign: 'center' as const,
    fontSize: '10px',
    color: '#888',
    marginTop: '4px',
    borderTop: '1px solid #333',
    padding: '3px 0',
  },
  cellRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  // Giá trị chỉ đọc trong Máy làm túi — nhập ở khối Quy cách (mục I)
  roVal: {
    fontWeight: 700 as const,
    fontSize: '11px',
    flex: 1,
    minWidth: 0,
  },
};


// ── Inline input components ─────────────────────────────────────────────────
function TI({ value, onChange, placeholder, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties
}) {
  return (
    <input
      style={{ ...styles.input, ...style }}
      value={value}
      placeholder={placeholder ?? ''}
      onChange={e => onChange(e.target.value)}
      onFocus={e => e.target.style.background = '#fff8dc'}
      onBlur={e => e.target.style.background = '#fffff0'}
    />
  );
}

function NI({ value, onChange, placeholder, style }: {
  value: number; onChange: (v: number) => void; placeholder?: string; style?: React.CSSProperties
}) {
  return (
    <input
      style={{ ...styles.inputNum, ...style }}
      type="number"
      value={value === 0 ? '' : value}
      placeholder={placeholder ?? '0'}
      onChange={e => onChange(Number(e.target.value) || 0)}
      onFocus={e => e.target.style.background = '#fff8dc'}
      onBlur={e => e.target.style.background = '#fffff0'}
    />
  );
}

function TA({ value, onChange, placeholder, rows }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      style={styles.textarea}
      value={value}
      placeholder={placeholder ?? ''}
      rows={rows || 2}
      onChange={e => onChange(e.target.value)}
      onFocus={e => e.target.style.background = '#fff8dc'}
      onBlur={e => e.target.style.background = '#fffff0'}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const isMang = inp.productType === 'mang';
  const isTui = !isMang;
  const khoMM = Math.round(inp.spreadWidth * 1000);
  const khoMangMM = Math.round(inp.originalWidthMm || khoMM);
  const dlMM = Math.round(inp.cutStep * 1000);

  const autoBagType = useMemo(() => classifyLsxBagType(inp.bagType, inp.hasZipper), [inp.bagType, inp.hasZipper]);
  const [overrideBagTypeKey, setOverrideBagTypeKey] = useState<string>('');

  function getActiveBagType(): LsxBagTypeInfo {
    if (overrideBagTypeKey) return classifyLsxBagTypeByKey(overrideBagTypeKey);
    return autoBagType;
  }

  function initManual(s: LsxSourceData, bagInfo: LsxBagTypeInfo) {
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
    setOverrideBagTypeKey('');
    setManual(initManual(sourceData, bagInfo));
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceData.id]);

  const activeBagType = getActiveBagType();


  const showIn = (inp.numColors ?? 0) > 0;
  const stageFlags = useMemo(
    () => resolveLsxStageFlags({
      productType: inp.productType,
      numColors: inp.numColors,
      layer1Id: inp.layer1Id,
      layer2Id: inp.layer2Id,
      layer3Id: inp.layer3Id,
      layer4Id: inp.layer4Id,
      layer5Id: inp.layer5Id,
      layer2AltId: inp.layer2AltId,
      hasDivide: inp.hasDivide,
      divideWidthMm: inp.divideWidthMm,
    }, manual.divideWidth),
    [inp.productType, inp.numColors, inp.layer1Id, inp.layer2Id, inp.layer3Id, inp.layer4Id, inp.layer5Id, inp.layer2AltId, inp.hasDivide, inp.divideWidthMm, manual.divideWidth],
  );
  const showGhep = stageFlags.showGhep;
  const showChia = stageFlags.showChia;
  const showTui = stageFlags.showTui;
  const laminateLayers = manual.laminateLayers ?? [];

  function updLamLayer(li: number, patch: Partial<LamLayerRow>) {
    setManual(prev => {
      const layers = [...(prev.laminateLayers ?? [])];
      if (!layers[li]) return prev;
      layers[li] = { ...layers[li], ...patch };
      const next = { ...prev, laminateLayers: layers };
      syncLegacyLaminateFields(next, layers);
      return next;
    });
  }

  function updLamPart(li: number, pi: number, patch: Partial<LamLayerPart>) {
    setManual(prev => {
      const layers = [...(prev.laminateLayers ?? [])];
      if (!layers[li]) return prev;
      const parts = [...layers[li].parts];
      if (!parts[pi]) return prev;
      parts[pi] = { ...parts[pi], ...patch };
      layers[li] = { ...layers[li], parts };
      const next = { ...prev, laminateLayers: layers };
      syncLegacyLaminateFields(next, layers);
      return next;
    });
  }


  function isFieldVisible(field: keyof LSXManualFields): boolean {
    if (!isTui) return false;
    const commonFields: (keyof LSXManualFields)[] = [
      'soLuongDHNote', 'packagingNotes', 'deliveryNotes',
      'bagWasteMeters', 'bagMachineNotes', 'bagDeliveryReq', 'bagLuuY', 'bagMachineWaste',
    ];
    if (commonFields.includes(field)) return true;
    if (activeBagType.key === 'fallback') return true;
    const visible = resolveLsxBagVisibleFields(activeBagType, !!inp.hasZipper);
    return visible.includes(field);
  }


  const upd = useCallback(<K extends keyof LSXManualFields>(key: K, val: LSXManualFields[K]) => {
    setManual(prev => ({ ...prev, [key]: val }));
  }, []);

  const divideOrderForValidation = useMemo<ProductionOrder>(() => ({
    id: 'lsx-form-preview',
    quoteId: sourceData.id,
    createdAt: '',
    status: 'created',
    manual,
    snapshot: buildSnapshotFromSource(sourceData, manual, materials),
  }), [manual, materials, sourceData]);
  const divideSpec = useMemo(
    () => resolveLsxDivideSpec(divideOrderForValidation),
    [divideOrderForValidation],
  );

  function setDivideMode(custom: boolean) {
    setManual(prev => ({
      ...prev,
      divideWidths: custom
        ? Array.from(
            { length: Math.max(0, Math.round(prev.divideElements || 0)) },
            (_, index) => prev.divideWidths?.[index] ?? (prev.divideWidth || inp.divideWidthMm || 0),
          )
        : undefined,
    }));
  }

  function updateDividePart(index: number, width: number) {
    setManual(prev => {
      const widths = Array.from(
        { length: Math.max(0, Math.round(prev.divideElements || 0)) },
        (_, itemIndex) => prev.divideWidths?.[itemIndex] ?? (prev.divideWidth || inp.divideWidthMm || 0),
      );
      widths[index] = width;
      return { ...prev, divideWidths: widths };
    });
  }

  function divideControls(compact = false) {
    const custom = divideSpec.custom;
    const validColor = divideSpec.valid ? '#2e7d32' : '#c62828';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
        <div style={styles.cellRow}>
          <span style={{ fontWeight: 700, fontSize: '11px' }}>Khổ màng:</span>
          <span>{khoMangMM}mm</span>
        </div>
        <div style={styles.cellRow}>
          <span style={{ fontWeight: 700, fontSize: '11px' }}>Số phần tử chia:</span>
          <NI
            value={manual.divideElements || 0}
            onChange={v => {
              const n = Math.max(0, Math.round(v));
              setManual(prev => {
                const next: LSXManualFields = { ...prev, divideElements: n };
                if (Array.isArray(prev.divideWidths) && prev.divideWidths.length > 0) {
                  next.divideWidths = Array.from(
                    { length: n },
                    (_, index) => prev.divideWidths?.[index] ?? (prev.divideWidth || inp.divideWidthMm || 0),
                  );
                }
                return next;
              });
            }}
            placeholder="vd: 4"
            style={{ width: '50px', maxWidth: '50px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setDivideMode(false)}
            style={{
              border: `1px solid ${!custom ? '#1565c0' : '#bbb'}`,
              background: !custom ? '#e3f2fd' : '#fff',
              color: !custom ? '#0d47a1' : '#555',
              borderRadius: 3,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Chia đều
          </button>
          <button
            type="button"
            onClick={() => setDivideMode(true)}
            disabled={(manual.divideElements || 0) <= 0}
            style={{
              border: `1px solid ${custom ? '#1565c0' : '#bbb'}`,
              background: custom ? '#e3f2fd' : '#fff',
              color: custom ? '#0d47a1' : '#555',
              borderRadius: 3,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 700,
              cursor: (manual.divideElements || 0) > 0 ? 'pointer' : 'not-allowed',
              opacity: (manual.divideElements || 0) > 0 ? 1 : 0.5,
            }}
          >
            Tuỳ chỉnh
          </button>
        </div>
        {!custom ? (
          <div style={styles.cellRow}>
            <span style={{ fontWeight: 700, fontSize: '11px' }}>Khổ chia:</span>
            <NI value={manual.divideWidth} onChange={v => upd('divideWidth', v)} placeholder="mm" style={{ width: '70px', maxWidth: '70px' }} />
            <span>mm × {manual.divideElements || 0}</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
            {divideSpec.widths.map((width, index) => (
              <label key={index} style={{ ...styles.cellRow, flexWrap: 'nowrap' }}>
                <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>Phần tử {index + 1}:</span>
                <NI value={width} onChange={v => updateDividePart(index, v)} placeholder="mm" style={{ width: '64px', maxWidth: '64px' }} />
                <span>mm</span>
              </label>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: validColor }}>
          {(manual.divideElements || 0) > 0
            ? `Tổng khổ chia: ${divideSpec.totalWidthMm} / ${khoMangMM}mm`
            : 'Chưa nhập chi tiết chia'}
          {!divideSpec.valid && <div style={{ marginTop: 2 }}>{divideSpec.error}</div>}
        </div>
      </div>
    );
  }

  async function handleSubmit(format: 'docx' | 'pdf' = 'docx') {
    if (!sourceData.customer?.trim()) {
      alert('Vui lòng có Khách hàng trước khi lưu LSX.');
      return;
    }
    if (!manual.tenSP?.trim() && !sourceData.productName?.trim()) {
      alert('Vui lòng nhập Tên sản phẩm.');
      return;
    }
    if (showChia && !divideSpec.valid) {
      alert(divideSpec.error);
      return;
    }
    setLoading(true);

    try {
      const manualToSave: LSXManualFields = {
        ...manual,
        msp: manual.msp?.trim() || genMsp(productionOrders),
        tenSP: manual.tenSP?.trim() || sourceData.productName || '',
      };
      const order: ProductionOrder = {
        id: genOrderId(),
        quoteId: sourceData.id,
        createdAt: new Date().toISOString(),
        status: 'created',
        manual: manualToSave,
        snapshot: buildSnapshotFromSource(sourceData, manualToSave, materials),
      };

      await themLSX(order);
      if (format === 'pdf') {
        await exportLSXtoPDF(order);
      } else {
        await exportLSXtoDOCX(order);
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

        {/* ═══ BODY — scrollable, looks like the real form ═══ */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '12px 16px',
          background: '#fff',
        }}>

          {/* ═══════ HEADER TABLE ═══════ */}
          <table style={styles.table}>
            <tbody>
              <tr>
                <td rowSpan={4} style={{
                  ...styles.td, width: '52%', fontWeight: 700, fontSize: '12px', padding: '6px 8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '42px', height: '42px', background: '#2E7D32', color: '#fff',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 900, flexShrink: 0,
                      border: '2px solid #1B5E20',
                    }}>LTS</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>Công Ty CP TM và SX Bao Bì</div>
                      <div style={{ fontSize: '11px' }}>Lai Trường Sơn- Long An</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...styles.lbl, width: '18%' }}>Ký mã hiệu</td>
                <td style={{ ...styles.td, fontWeight: 700 }}>QT.ISO-22-BM02</td>
              </tr>
              <tr>
                <td style={styles.lbl}>Lần ban hành</td>
                <td style={styles.td}>02</td>
              </tr>
              <tr>
                <td style={styles.lbl}>Số:</td>
                <td style={styles.td}>
                  <TI value={manual.lsxNumber} onChange={v => upd('lsxNumber', v)} placeholder="2603.42" />
                </td>
              </tr>
              <tr>
                <td style={styles.lbl}>Ngày:</td>
                <td style={styles.td}>
                  <TI value={manual.issuedDate} onChange={v => upd('issuedDate', v)} placeholder="dd.mm.yyyy" />
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══════ TITLE — LỆNH SẢN XUẤT ═══════ */}
          <table style={styles.table}>
            <tbody>
              <tr><td style={styles.hdrGreen}>LỆNH SẢN XUẤT</td></tr>
            </tbody>
          </table>

          {/* ═══════ I. THÔNG TIN SẢN PHẨM ═══════ */}
          <table style={styles.table}>
            <tbody>
              <tr>
                <td colSpan={8} style={styles.secYellow}>I . THÔNG TIN SẢN PHẨM</td>
              </tr>
              <tr>
                <td style={styles.lbl}>Khách hàng:</td>
                <td colSpan={3} style={{ ...styles.td, fontWeight: 700 }}>
                  {sourceData.customer || '...'}
                </td>
                <td style={styles.lbl} colSpan={4}></td>
              </tr>
              <tr>
                <td style={styles.lbl}>MSP:</td>
                <td style={styles.td}>
                  <TI value={manual.msp} onChange={v => upd('msp', v)} placeholder="TP_077020TU" />
                </td>
                <td style={styles.lbl}>Tên SP:</td>
                <td colSpan={5} style={styles.td}>
                  <TI value={manual.tenSP} onChange={v => upd('tenSP', v)} placeholder="TÚI GẠO THƠM SUM VẦY 5KG" style={{ fontWeight: 700 }} />
                </td>
              </tr>
              <tr>
                <td style={styles.lbl}>Cấu trúc:</td>
                <td style={styles.td}>
                  {sourceData.structure || '...'}
                </td>
                <td style={styles.lbl}>Khổ màng:</td>
                <td colSpan={5} style={styles.td}><b>K{khoMM}mm</b></td>
              </tr>
              <tr>
                <td style={styles.lbl}>Quy cách:</td>
                <td style={styles.td} colSpan={isTui ? 3 : 1}>
                  <TI value={manual.quyCachNote} onChange={v => upd('quyCachNote', v)} placeholder={`R:${khoMM}mm x D:${dlMM}mm`} />
                </td>
                {isMang && (
                  <>
                    <td style={styles.lbl}>Quy cách cuộn:</td>
                    <td colSpan={5} style={styles.td}>
                      <TI value={manual.quyCachCuon} onChange={v => upd('quyCachCuon', v)} placeholder="K500mm x 1000m" />
                    </td>
                  </>
                )}
                {isTui && (
                  <>
                    <td style={styles.lbl}>Dung sai R:</td>
                    <td style={styles.td}>
                      <div style={styles.cellRow}>
                        <NI value={manual.quyCachToleranceWidthMm ?? 2} onChange={v => upd('quyCachToleranceWidthMm', v)} placeholder="2" style={{ width: '44px', maxWidth: '44px' }} />
                        <span>mm</span>
                      </div>
                    </td>
                    <td style={styles.lbl}>Dung sai D:</td>
                    <td style={styles.td}>
                      <div style={styles.cellRow}>
                        <NI value={manual.quyCachToleranceLengthMm ?? 2} onChange={v => upd('quyCachToleranceLengthMm', v)} placeholder="2" style={{ width: '44px', maxWidth: '44px' }} />
                        <span>mm</span>
                      </div>
                    </td>
                  </>
                )}
              </tr>
              {isTui && (
                <>
                  <tr>
                    <td style={styles.lbl}>Zipper cách miệng:</td>
                    <td style={styles.td} colSpan={3}>
                      <div style={styles.cellRow}>
                        <NI value={manual.tamZipperCachMieng} onChange={v => upd('tamZipperCachMieng', v)} placeholder="30" style={{ width: '50px', maxWidth: '50px' }} />
                        <span>mm</span>
                      </div>
                    </td>
                    <td style={styles.lbl}>Nhấn xé &quot;v&quot;:</td>
                    <td style={styles.td} colSpan={3}>
                      <TI value={manual.tearNotch} onChange={v => upd('tearNotch', v)} placeholder="2 bên cách miệng 15mm" />
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.lbl}>Dán biên:</td>
                    <td style={styles.td} colSpan={3}>
                      <TI value={manual.sealEdge} onChange={v => upd('sealEdge', v)} placeholder="10mm" />
                    </td>
                    <td style={styles.lbl}>Xếp đáy:</td>
                    <td style={styles.td} colSpan={3}>
                      <div style={styles.cellRow}>
                        <TI value={manual.foldBottom} onChange={v => upd('foldBottom', v)} placeholder="100mm" style={{ flex: 1, minWidth: 0 }} />
                        {!!formatLsxFoldBottom(manual.foldBottom) && (
                          <span style={{ fontSize: '10px', color: '#555', whiteSpace: 'nowrap' }}>
                            {formatLsxFoldBottom(manual.foldBottom)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              )}
              {isMang && (
                <tr>
                  <td style={styles.lbl}>Chiều ra cuộn:</td>
                  <td style={styles.td}>
                    <TI value={manual.chieuRaCuonSP} onChange={v => upd('chieuRaCuonSP', v)} placeholder="Mặt in ra ngoài" />
                  </td>
                  <td style={styles.td} colSpan={6}></td>
                </tr>
              )}
              <tr>
                <td style={styles.lbl}>Số màu:</td>
                <td style={styles.td}>
                  {inp.numColors ? `${String(inp.numColors).padStart(2, '0')} màu` : 'Không in'}
                </td>
                <td style={styles.lbl} colSpan={2}>Số lượng ĐH:</td>
                <td colSpan={2} style={styles.td}>
                  <TI value={manual.soLuongDHNote} onChange={v => upd('soLuongDHNote', v)} placeholder="5.400 túi" style={{ ...styles.boldVal }} />
                </td>
                <td style={styles.lbl}>Dung sai:</td>
                <td style={styles.td}>
                  <div style={styles.cellRow}>
                    <NI value={manual.quantityTolerancePercent ?? 10} onChange={v => upd('quantityTolerancePercent', v)} placeholder="10" style={{ width: '50px', maxWidth: '50px' }} />
                    <span>%</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={styles.lbl}>Mã mực nhủ:</td>
                <td colSpan={5} style={styles.td}>
                  <TI value={manual.maMucNhu} onChange={v => upd('maMucNhu', v)} placeholder="Q-Chromax Pet GD-Z07" />
                </td>
              </tr>
              <tr>
                <td colSpan={8} style={{ ...styles.td, fontSize: '10px', color: '#c00', fontStyle: 'italic' }}>
                  {`=> không được thiếu, Không dc dư quá số lượng trên`}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══════ II. CÔNG VIỆC CẦN THỰC HIỆN ═══════ */}
          {(showIn || showGhep || showChia || showTui) && (
            <table style={styles.table}>
              <tbody>
                <tr>
                  <td colSpan={8} style={styles.secYellow}>II. CÔNG VIỆC CẦN THỰC HIỆN</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ═══════ Hàng 1: MÁY IN | MÁY GHÉP ═══════ */}
          {(showIn || showGhep) && (
            <table style={styles.table}>
              <tbody>
                <tr>
                  {showIn && (
                    <td colSpan={showGhep ? 4 : 8} style={{ ...styles.secBlue, width: showGhep ? '50%' : '100%' }}>MÁY IN</td>
                  )}
                  {showGhep && (
                    <td colSpan={showIn ? 4 : 8} style={{ ...styles.secBlue, width: showIn ? '50%' : '100%' }}>MÁY GHÉP</td>
                  )}
                </tr>

                {(showIn || showGhep) && (
                  <tr>
                    {showIn && (
                      <>
                        <td style={styles.lbl}>Màng in:</td>
                        <td style={styles.td}>
                          <TI value={manual.printFilmName} onChange={v => upd('printFilmName', v)} placeholder="PA15" style={{ fontWeight: 700 }} />
                        </td>
                        <td style={styles.lbl}>Khổ:</td>
                        <td style={{ ...styles.td, fontWeight: 700 }} colSpan={showGhep ? 1 : 5}>
                          <div style={styles.cellRow}>
                            <TI value={String(khoMM)} onChange={() => {}} placeholder="640" style={{ fontWeight: 700, width: '60px', maxWidth: '60px' }} />
                            <span>mm</span>
                          </div>
                        </td>
                      </>
                    )}
                    {showGhep && laminateLayers.length > 0 && (
                      <>
                        <td style={styles.lbl}>{laminateLayers[0].label}:</td>
                        <td style={styles.td} colSpan={showIn ? 3 : 7}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                            {laminateLayers[0].parts.map((p, pi) => (
                              <div key={pi} style={styles.cellRow}>
                                <TI
                                  value={p.name}
                                  onChange={v => updLamPart(0, pi, { name: v })}
                                  placeholder="LLDPE130"
                                  style={{ fontWeight: 700, flex: 1, minWidth: 0 }}
                                />
                                <span style={{ fontSize: 11 }}>Khổ</span>
                                <NI
                                  value={p.widthMm}
                                  onChange={v => updLamPart(0, pi, { widthMm: v })}
                                  placeholder="640"
                                  style={{ width: '56px', maxWidth: '56px' }}
                                />
                                <span>mm</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </>
                    )}
                    {showGhep && laminateLayers.length === 0 && (
                      <td colSpan={showIn ? 4 : 8} style={styles.td}></td>
                    )}
                  </tr>
                )}

                {/* Thêm dòng màng ghép 2..N */}
                {showGhep && laminateLayers.slice(1).map((layer, idx) => {
                  const li = idx + 1;
                  return (
                    <tr key={`lam-${li}-${layer.label}`}>
                      {showIn && <td colSpan={4} style={styles.td}></td>}
                      <td style={styles.lbl}>{layer.label}:</td>
                      <td style={styles.td} colSpan={showIn ? 3 : 7}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                          {layer.parts.map((p, pi) => (
                            <div key={pi} style={styles.cellRow}>
                              <TI
                                value={p.name}
                                onChange={v => updLamPart(li, pi, { name: v })}
                                placeholder="MPET12"
                                style={{ fontWeight: 700, flex: 1, minWidth: 0 }}
                              />
                              <span style={{ fontSize: 11 }}>Khổ</span>
                              <NI
                                value={p.widthMm}
                                onChange={v => updLamPart(li, pi, { widthMm: v })}
                                placeholder="640"
                                style={{ width: '56px', maxWidth: '56px' }}
                              />
                              <span>mm</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}


                {/* Phi hao từng lần ghép */}
                {showGhep && laminateLayers.length > 0 && (
                  <tr>
                    {showIn ? (
                      <>
                        <td style={styles.lbl}>Trục in:</td>
                        <td style={styles.td}>
                          <div style={styles.cellRow}>
                            <span>Dài:</span>
                            <NI value={manual.cylDiameter} onChange={v => upd('cylDiameter', v)} placeholder="750" style={{ width: '50px', maxWidth: '50px' }} />
                            <span>x</span>
                            <span>Chu vi:</span>
                            <NI value={manual.cylWidth} onChange={v => upd('cylWidth', v)} placeholder="500" style={{ width: '50px', maxWidth: '50px' }} />
                            <span>mm</span>
                          </div>
                        </td>
                        <td style={styles.lbl} colSpan={2}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                            <div style={styles.cellRow}>
                              <span>Số trục:</span>
                              <TI value={manual.numCylinders ? `${String(manual.numCylinders).padStart(2, '0')} trục` : ''} onChange={v => {
                                const n = parseInt(v) || 0;
                                upd('numCylinders', n);
                              }} placeholder="08 trục" style={{ width: '70px', maxWidth: '70px', fontWeight: 700 }} />
                            </div>
                            <div style={styles.cellRow}>
                              <span>Chiều:</span>
                              <TI value={manual.printDirection} onChange={v => upd('printDirection', v)} placeholder="Đầu chữ ra trước" style={{ flex: 1, minWidth: 0 }} />
                            </div>
                          </div>
                        </td>
                      </>
                    ) : null}
                    <td style={styles.lbl}>ĐM phi hao:</td>
                    <td style={styles.td} colSpan={showIn ? 3 : 7}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        {laminateLayers.map((layer, li) => (
                          <div key={`waste-${li}-${layer.label}`} style={styles.cellRow}>
                            <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28 }}>L{li + 1}:</span>
                            <NI
                              value={layer.wasteMeters}
                              onChange={v => updLamLayer(li, { wasteMeters: v })}
                              placeholder="120"
                              style={{ width: '70px', maxWidth: '70px' }}
                            />
                            <span>m</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}

                {showIn && !showGhep && (
                  <tr>
                    <td style={styles.lbl}>Trục in:</td>
                    <td style={styles.td}>
                      <div style={styles.cellRow}>
                        <span>Dài:</span>
                        <NI value={manual.cylDiameter} onChange={v => upd('cylDiameter', v)} placeholder="750" style={{ width: '50px', maxWidth: '50px' }} />
                        <span>x</span>
                        <span>Chu vi:</span>
                        <NI value={manual.cylWidth} onChange={v => upd('cylWidth', v)} placeholder="500" style={{ width: '50px', maxWidth: '50px' }} />
                        <span>mm</span>
                      </div>
                    </td>
                    <td style={styles.lbl} colSpan={2}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <div style={styles.cellRow}>
                          <span>Số trục:</span>
                          <TI value={manual.numCylinders ? `${String(manual.numCylinders).padStart(2, '0')} trục` : ''} onChange={v => {
                            const n = parseInt(v) || 0;
                            upd('numCylinders', n);
                          }} placeholder="08 trục" style={{ width: '70px', maxWidth: '70px', fontWeight: 700 }} />
                        </div>
                        <div style={styles.cellRow}>
                          <span>Chiều:</span>
                          <TI value={manual.printDirection} onChange={v => upd('printDirection', v)} placeholder="Đầu chữ ra trước" style={{ flex: 1, minWidth: 0 }} />
                        </div>
                      </div>
                    </td>
                    <td colSpan={4} style={styles.td}></td>
                  </tr>
                )}

                {showIn && (
                  <tr>
                    <td style={styles.lbl}>MST:</td>
                    <td colSpan={3} style={styles.td}>
                      <TI value={manual.printMST} onChange={v => upd('printMST', v)} placeholder="" />
                    </td>
                    {showGhep ? (
                      <>
                        <td style={styles.lbl}>Thành phẩm ghép:</td>
                        <td style={styles.td}>
                          <div style={styles.cellRow}>
                            <NI value={manual.lamProductQty} onChange={v => upd('lamProductQty', v)} placeholder="3.180" style={{ width: '70px', maxWidth: '70px' }} />
                            <TI value={manual.lamProductUnit} onChange={v => upd('lamProductUnit', v)} placeholder="MD" style={{ width: '36px', maxWidth: '36px' }} />
                            <span style={{ fontSize: '10px' }}>(ghép hết</span>
                          </div>
                        </td>
                        <td colSpan={2} style={styles.td}>
                          <TI value={manual.lamBTPNote} onChange={v => upd('lamBTPNote', v)} placeholder="BTP in 3.300m)" style={{ fontSize: '10px' }} />
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} style={styles.td}></td>
                    )}
                  </tr>
                )}

                {!showIn && showGhep && (
                  <tr>
                    <td style={styles.lbl}>Thành phẩm ghép:</td>
                    <td style={styles.td} colSpan={3}>
                      <div style={styles.cellRow}>
                        <NI value={manual.lamProductQty} onChange={v => upd('lamProductQty', v)} placeholder="3.180" style={{ width: '70px', maxWidth: '70px' }} />
                        <TI value={manual.lamProductUnit} onChange={v => upd('lamProductUnit', v)} placeholder="MD" style={{ width: '36px', maxWidth: '36px' }} />
                        <span style={{ fontSize: '10px' }}>(ghép hết</span>
                      </div>
                    </td>
                    <td colSpan={4} style={styles.td}>
                      <TI value={manual.lamBTPNote} onChange={v => upd('lamBTPNote', v)} placeholder="BTP in 3.300m)" style={{ fontSize: '10px' }} />
                    </td>
                  </tr>
                )}

                {showIn && (
                  <tr>
                    <td style={styles.lbl}>Định mức phi hao:</td>
                    <td colSpan={3} style={styles.td}>
                      <div style={styles.cellRow}>
                        <NI value={manual.printWastePercent} onChange={v => upd('printWastePercent', v)} placeholder="2.320" style={{ width: '80px', maxWidth: '80px' }} />
                        <span>M</span>
                      </div>
                    </td>
                    {showGhep ? (
                      <>
                        <td style={styles.lbl}>Số lượng cấp vật tư:</td>
                        <td colSpan={3} style={styles.td}>
                          <TI value={manual.lamMaterialSupplyQty} onChange={v => upd('lamMaterialSupplyQty', v)} placeholder="" />
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} style={styles.td}></td>
                    )}
                  </tr>
                )}

                {!showIn && showGhep && (
                  <tr>
                    <td style={styles.lbl}>Số lượng cấp vật tư:</td>
                    <td colSpan={7} style={styles.td}>
                      <TI value={manual.lamMaterialSupplyQty} onChange={v => upd('lamMaterialSupplyQty', v)} placeholder="" />
                    </td>
                  </tr>
                )}

                {showIn && (
                  <tr>
                    <td style={styles.lbl}>Thành phẩm in:</td>
                    <td colSpan={3} style={styles.td}>
                      <div style={styles.cellRow}>
                        <b><NI value={manual.printProductQty} onChange={v => upd('printProductQty', v)} placeholder="3.300" style={{ ...styles.boldVal, width: '80px', maxWidth: '80px' }} /></b>
                        <TI value={manual.printProductUnit} onChange={v => upd('printProductUnit', v)} placeholder="MD" style={{ width: '36px', maxWidth: '36px' }} />
                      </div>
                    </td>
                    {showGhep ? (
                      <>
                        <td style={styles.lbl}>Ghi chú:</td>
                        <td colSpan={3} style={styles.td}>
                          <TI value={manual.laminateNotes} onChange={v => upd('laminateNotes', v)} placeholder="LLDPE130-K640: tồn kho" />
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} style={styles.td}></td>
                    )}
                  </tr>
                )}

                {!showIn && showGhep && (
                  <tr>
                    <td style={styles.lbl}>Ghi chú:</td>
                    <td colSpan={7} style={styles.td}>
                      <TI value={manual.laminateNotes} onChange={v => upd('laminateNotes', v)} placeholder="LLDPE130-K640: tồn kho" />
                    </td>
                  </tr>
                )}

                {showIn && (
                  <>
                    <tr>
                      <td style={styles.lbl}>Ghi chú:</td>
                      <td colSpan={showGhep ? 3 : 7} style={styles.td}>
                        <TA value={manual.printNotes} onChange={v => upd('printNotes', v)}
                          placeholder="PA15-640: tồn kho&#10;=> Duyệt Chạy mẫu sắc theo Epson giấy có chữ ký khách" rows={3} />
                      </td>
                      {showGhep && <td colSpan={4} style={styles.td}></td>}
                    </tr>
                    <tr>
                      <td style={styles.lbl}>- Trục in:</td>
                      <td colSpan={showGhep ? 3 : 7} style={styles.td}>
                        <TI value={manual.cylInfo} onChange={v => upd('cylInfo', v)} placeholder="23/3 vế" />
                      </td>
                      {showGhep && <td colSpan={4} style={styles.td}></td>}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}

          {/* ═══════ Hàng 2: MÁY CHIA | MÁY LÀM TÚI ═══════ */}
          {(showChia || showTui) && (
            <table style={styles.table}>
              <tbody>
                <tr>
                  {showChia && (
                    <td colSpan={showTui ? 4 : 8} style={{ ...styles.secBlue, width: showTui ? '50%' : '100%' }}>MÁY CHIA</td>
                  )}
                  {showTui && (
                    <td colSpan={showChia ? 4 : 8} style={{ ...styles.secBlue, width: showChia ? '50%' : '100%' }}>MÁY LÀM TÚI</td>
                  )}
                </tr>

                {showChia && !showTui && (
                  <>
                    <tr>
                      <td colSpan={8} style={{ ...styles.td, verticalAlign: 'top' }}>{divideControls()}</td>
                    </tr>
                    <tr>
                      <td style={styles.lbl}>Chiều dài cuộn:</td>
                      <td style={styles.td}>
                        <div style={styles.cellRow}>
                          <NI value={manual.rollLength} onChange={v => upd('rollLength', v)} placeholder="m" />
                          <span>m</span>
                        </div>
                      </td>
                      <td style={styles.lbl}>Chiều ra cuộn:</td>
                      <td style={styles.td} colSpan={5}>
                        <div style={styles.cellRow}>
                          <NI value={manual.divideRollOutWidth} onChange={v => upd('divideRollOutWidth', v)} placeholder="mm" />
                          <span>mm</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.lbl}>Ghi chú:</td>
                      <td colSpan={7} style={styles.td}>
                        <TI value={manual.divideNotes} onChange={v => upd('divideNotes', v)} placeholder="" />
                      </td>
                    </tr>
                    {isMang && (
                      <tr>
                        <td style={styles.lbl}>Yêu cầu giao:</td>
                        <td colSpan={7} style={styles.td}>
                          <TA value={manual.divideDeliveryReq} onChange={v => upd('divideDeliveryReq', v)} placeholder="Yêu cầu giao hàng..." rows={2} />
                        </td>
                      </tr>
                    )}
                  </>
                )}


                {showChia && showTui && (
                  <tr>
                    <td colSpan={4} style={{ ...styles.td, verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        {divideControls(true)}
                        <div style={styles.cellRow}>
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>Chiều dài:</span>
                          <NI value={manual.rollLength} onChange={v => upd('rollLength', v)} placeholder="m" style={{ width: '70px', maxWidth: '70px' }} />
                          <span>m</span>
                        </div>
                        <div style={styles.cellRow}>
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>Ghi chú:</span>
                          <TI value={manual.divideNotes} onChange={v => upd('divideNotes', v)} placeholder="" style={{ flex: 1, minWidth: 0 }} />
                        </div>
                      </div>
                    </td>
                    <td colSpan={4} style={{ ...styles.td, verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        <div style={styles.cellRow}>
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>Số lượng:</span>
                          <TI value={manual.soLuongDHNote} onChange={v => upd('soLuongDHNote', v)} placeholder="5.400 túi" style={{ ...styles.boldVal, flex: 1, minWidth: 0 }} />
                        </div>
                        <div style={styles.cellRow}>
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>Kiểu túi:</span>
                          <select
                            style={{ ...styles.input, fontWeight: 700, fontSize: '12px', flex: 1, minWidth: 0 }}
                            value={overrideBagTypeKey || autoBagType.key}
                            onChange={e => {
                              const key = e.target.value;
                              setOverrideBagTypeKey(key === autoBagType.key ? '' : key);
                              upd('lsxBagTypeOverride', key === autoBagType.key ? undefined : key);
                            }}
                          >
                            {ALL_LSX_BAG_TYPES.map(t => (
                              <option key={t.key} value={t.key}>
                                {t.label}{t.key === autoBagType.key ? ' (tự suy)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={styles.cellRow}>
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>R:</span>
                          <span>{khoMM}mm</span>
                          <span style={{ fontWeight: 700, fontSize: '11px', marginLeft: 8 }}>D:</span>
                          <span>{dlMM}mm</span>
                        </div>
                        <div style={styles.cellRow}>
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>Hàn biên:</span>
                          <NI value={manual.hanBien} onChange={v => upd('hanBien', v)} placeholder="10" style={{ width: '50px', maxWidth: '50px' }} />
                          <span>mm</span>
                          <span style={{ fontWeight: 700, fontSize: '11px', marginLeft: 8 }}>Hàn đầu:</span>
                          <NI value={manual.hanDau} onChange={v => upd('hanDau', v)} placeholder="50" style={{ width: '50px', maxWidth: '50px' }} />
                          <span>mm</span>
                        </div>
                        {isFieldVisible('xepHong') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontWeight: 700, fontSize: '11px' }}>Xếp hông:</span>
                            <NI value={manual.xepHong} onChange={v => upd('xepHong', v)} placeholder="60" style={{ width: '50px', maxWidth: '50px' }} />
                            <span>mm</span>
                          </div>
                        )}
                        {isFieldVisible('danLung') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontWeight: 700, fontSize: '11px' }}>Dán lưng:</span>
                            <NI value={manual.danLung} onChange={v => upd('danLung', v)} placeholder="13" style={{ width: '50px', maxWidth: '50px' }} />
                            <span>mm</span>
                          </div>
                        )}
                        {isFieldVisible('danLungLech') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontWeight: 700, fontSize: '11px' }}>Dán lưng lệch:</span>
                            <NI value={manual.danLungLech} onChange={v => upd('danLungLech', v)} placeholder="10" style={{ width: '50px', maxWidth: '50px' }} />
                            <span>mm</span>
                            <span style={{ fontWeight: 700, fontSize: '11px', marginLeft: 8 }}>Dán đáy:</span>
                            <NI value={manual.danDay} onChange={v => upd('danDay', v)} placeholder="10" style={{ width: '50px', maxWidth: '50px' }} />
                            <span>mm</span>
                          </div>
                        )}
                        {isFieldVisible('nap') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontWeight: 700, fontSize: '11px' }}>Nắp:</span>
                            <NI value={manual.nap} onChange={v => upd('nap', v)} placeholder="35" style={{ width: '50px', maxWidth: '50px' }} />
                            <span>mm</span>
                            <span style={{ fontWeight: 700, fontSize: '11px', marginLeft: 8 }}>Sóng SA:</span>
                            <NI value={manual.songSieuAm} onChange={v => upd('songSieuAm', v)} placeholder="32" style={{ width: '50px', maxWidth: '50px' }} />
                            <span>mm</span>
                          </div>
                        )}
                        {isFieldVisible('tamZipperCachMieng') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontWeight: 700, fontSize: '11px' }}>Tâm zipper:</span>
                            <span style={styles.roVal}>{manual.tamZipperCachMieng ? `${manual.tamZipperCachMieng}mm` : '—'}</span>
                          </div>
                        )}
                        {isFieldVisible('holePunchInfo') && (
                          <TI value={manual.holePunchInfo} onChange={v => upd('holePunchInfo', v)} placeholder="Đục 3 lỗ quai xách" />
                        )}
                        {isFieldVisible('ventHoleInfo') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontSize: '11px' }}>Lỗ thông hơi:</span>
                            <TI value={manual.ventHoleInfo} onChange={v => upd('ventHoleInfo', v)} placeholder="6 lỗ/mặt Ø1mm" style={{ flex: 1, minWidth: 0 }} />
                          </div>
                        )}
                        {isFieldVisible('tearNotch') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontSize: '11px' }}>Nhấn xé V:</span>
                            <span style={styles.roVal}>{manual.tearNotch || '—'}</span>
                          </div>
                        )}
                        {isFieldVisible('loTreoInfo') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontSize: '11px' }}>Lỗ treo:</span>
                            <TI value={manual.loTreoInfo} onChange={v => upd('loTreoInfo', v)} placeholder="Ø8mm ở giữa" style={{ flex: 1, minWidth: 0 }} />
                          </div>
                        )}
                        {isFieldVisible('sealEdge') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontSize: '11px' }}>Dán biên:</span>
                            <span style={styles.roVal}>{manual.sealEdge || '—'}</span>
                          </div>
                        )}
                        {isFieldVisible('foldBottom') && (
                          <div style={styles.cellRow}>
                            <span style={{ fontSize: '11px' }}>Xếp đáy:</span>
                            <span style={styles.roVal}>{formatLsxFoldBottom(manual.foldBottom) || '—'}</span>
                          </div>
                        )}
                        <div style={styles.cellRow}>
                          {(isFieldVisible('useSemicircularMold') || isFieldVisible('docQuaiXach') || isFieldVisible('danKeoNap') || isFieldVisible('useDualCutter')) && (
                            <>
                              {isFieldVisible('useSemicircularMold') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.useSemicircularMold} onChange={e => upd('useSemicircularMold', e.target.checked)} />Khuôn bán nguyệt</label>}
                              {isFieldVisible('useDualCutter') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.useDualCutter} onChange={e => upd('useDualCutter', e.target.checked)} />Dao 2 nhịp</label>}
                              {isFieldVisible('docQuaiXach') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.docQuaiXach} onChange={e => upd('docQuaiXach', e.target.checked)} />Đục quai xách</label>}
                              {isFieldVisible('danKeoNap') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.danKeoNap} onChange={e => upd('danKeoNap', e.target.checked)} />Dán keo nắp</label>}
                            </>
                          )}
                        </div>
                        <div style={styles.cellRow}>
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>ĐM phi hao:</span>
                          <NI value={manual.bagWasteMeters} onChange={v => upd('bagWasteMeters', v)} placeholder="210" style={{ width: '60px', maxWidth: '60px' }} />
                          <span>M</span>
                        </div>
                        <div style={styles.cellRow}>
                          <span style={{ fontWeight: 700, fontSize: '11px', color: '#c00' }}>Ghi chú:</span>
                          <TI value={manual.bagMachineNotes} onChange={v => upd('bagMachineNotes', v)} placeholder="Chạy theo market" style={{ flex: 1, minWidth: 0, fontWeight: 700, color: '#c00' }} />
                        </div>
                        <TA value={manual.packagingNotes} onChange={v => upd('packagingNotes', v)}
                          placeholder="Đơn hàng / đóng gói..." rows={2} />
                        <TA value={manual.deliveryNotes} onChange={v => upd('deliveryNotes', v)}
                          placeholder="Yêu cầu giao hàng..." rows={2} />
                      </div>
                    </td>
                  </tr>
                )}

                {!showChia && showTui && (
                  <>
                    <tr>
                      <td style={styles.lbl}>Số lượng :</td>
                      <td colSpan={3} style={styles.td}>
                        <TI value={manual.soLuongDHNote} onChange={v => upd('soLuongDHNote', v)} placeholder="5.400 túi -6.000 túi" style={{ ...styles.boldVal }} />
                      </td>
                      <td style={styles.lbl}>Kiểu túi (LSX):</td>
                      <td colSpan={3} style={styles.td}>
                        <select
                          style={{ ...styles.input, fontWeight: 700, fontSize: '12px' }}
                          value={overrideBagTypeKey || autoBagType.key}
                          onChange={e => {
                            const key = e.target.value;
                            setOverrideBagTypeKey(key === autoBagType.key ? '' : key);
                            upd('lsxBagTypeOverride', key === autoBagType.key ? undefined : key);
                          }}
                        >
                          {ALL_LSX_BAG_TYPES.map(t => (
                            <option key={t.key} value={t.key}>
                              {t.label}{t.key === autoBagType.key ? ' (tự suy)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.lbl} rowSpan={2}>Đơn hàng</td>
                      <td colSpan={3} rowSpan={2} style={styles.td}>
                        <TA value={manual.packagingNotes} onChange={v => upd('packagingNotes', v)}
                          placeholder="Không bược thiếu, Không được dư." rows={4} />
                      </td>
                      <td style={styles.lbl}>Chiều rộng:</td>
                      <td style={styles.td}>
                        <div style={styles.cellRow}><NI value={khoMM} onChange={() => {}} placeholder="250" /><span>mm</span></div>
                      </td>
                      <td style={styles.lbl}>Chiều dài:</td>
                      <td style={styles.td}>
                        <div style={styles.cellRow}><NI value={dlMM} onChange={() => {}} placeholder="500" /><span>mm</span></div>
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.lbl}>Hàn biên:</td>
                      <td style={styles.td}>
                        <div style={styles.cellRow}><NI value={manual.hanBien} onChange={v => upd('hanBien', v)} placeholder="10" /><span>mm</span></div>
                      </td>
                      <td style={styles.lbl}>Hàn đầu:</td>
                      <td style={styles.td}>
                        <div style={styles.cellRow}><NI value={manual.hanDau} onChange={v => upd('hanDau', v)} placeholder="50" /><span>mm</span></div>
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.lbl}>YÊU CẦU GIAO HÀNG:</td>
                      <td colSpan={3} style={{ ...styles.td, verticalAlign: 'top' }}>
                        <TA value={manual.deliveryNotes} onChange={v => upd('deliveryNotes', v)}
                          placeholder="=> PHÁT HIỆN LỖI BÁO CẤP TRÊN" rows={3} />
                      </td>
                      <td colSpan={4} style={{ ...styles.td, verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                          {isFieldVisible('xepHong') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontWeight: 700, fontSize: '11px' }}>Xếp hông:</span>
                              <NI value={manual.xepHong} onChange={v => upd('xepHong', v)} placeholder="60" style={{ width: '50px', maxWidth: '50px' }} />
                              <span>mm</span>
                            </div>
                          )}
                          {isFieldVisible('danLung') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontWeight: 700, fontSize: '11px' }}>Dán lưng:</span>
                              <NI value={manual.danLung} onChange={v => upd('danLung', v)} placeholder="13" style={{ width: '50px', maxWidth: '50px' }} />
                              <span>mm</span>
                            </div>
                          )}
                          {isFieldVisible('danLungLech') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontWeight: 700, fontSize: '11px' }}>Dán lưng lệch:</span>
                              <NI value={manual.danLungLech} onChange={v => upd('danLungLech', v)} placeholder="10" style={{ width: '50px', maxWidth: '50px' }} />
                              <span>mm</span>
                              <span style={{ fontWeight: 700, fontSize: '11px', marginLeft: 6 }}>Dán đáy:</span>
                              <NI value={manual.danDay} onChange={v => upd('danDay', v)} placeholder="10" style={{ width: '50px', maxWidth: '50px' }} />
                              <span>mm</span>
                            </div>
                          )}
                          {isFieldVisible('nap') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontWeight: 700, fontSize: '11px' }}>Nắp:</span>
                              <NI value={manual.nap} onChange={v => upd('nap', v)} placeholder="35" style={{ width: '50px', maxWidth: '50px' }} />
                              <span>mm</span>
                              <span style={{ fontWeight: 700, fontSize: '11px', marginLeft: 6 }}>Sóng SA:</span>
                              <NI value={manual.songSieuAm} onChange={v => upd('songSieuAm', v)} placeholder="32" style={{ width: '50px', maxWidth: '50px' }} />
                              <span>mm</span>
                            </div>
                          )}
                          {isFieldVisible('tamZipperCachMieng') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontWeight: 700, fontSize: '11px' }}>Tâm zipper:</span>
                              <span style={styles.roVal}>{manual.tamZipperCachMieng ? `${manual.tamZipperCachMieng}mm` : '—'}</span>
                            </div>
                          )}
                          {isFieldVisible('holePunchInfo') && (
                            <TI value={manual.holePunchInfo} onChange={v => upd('holePunchInfo', v)} placeholder="Đục 3 lỗ quai xách" />
                          )}
                          {isFieldVisible('ventHoleInfo') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontSize: '11px' }}>Lỗ thông hơi:</span>
                              <TI value={manual.ventHoleInfo} onChange={v => upd('ventHoleInfo', v)} placeholder="6 lỗ/mặt Ø1mm" style={{ flex: 1, minWidth: 0 }} />
                            </div>
                          )}
                          {isFieldVisible('tearNotch') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontSize: '11px' }}>Nhấn xé V:</span>
                              <span style={styles.roVal}>{manual.tearNotch || '—'}</span>
                            </div>
                          )}
                          {isFieldVisible('loTreoInfo') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontSize: '11px' }}>Lỗ treo:</span>
                              <TI value={manual.loTreoInfo} onChange={v => upd('loTreoInfo', v)} placeholder="Ø8mm ở giữa" style={{ flex: 1, minWidth: 0 }} />
                            </div>
                          )}
                          {isFieldVisible('sealEdge') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontSize: '11px' }}>Dán biên:</span>
                              <span style={styles.roVal}>{manual.sealEdge || '—'}</span>
                            </div>
                          )}
                          {isFieldVisible('foldBottom') && (
                            <div style={styles.cellRow}>
                              <span style={{ fontSize: '11px' }}>Xếp đáy:</span>
                              <span style={styles.roVal}>{formatLsxFoldBottom(manual.foldBottom) || '—'}</span>
                            </div>
                          )}
                          <div style={styles.cellRow}>
                            {isFieldVisible('useSemicircularMold') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.useSemicircularMold} onChange={e => upd('useSemicircularMold', e.target.checked)} />Khuôn bán nguyệt</label>}
                            {isFieldVisible('useDualCutter') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.useDualCutter} onChange={e => upd('useDualCutter', e.target.checked)} />Dao 2 nhịp</label>}
                            {isFieldVisible('docQuaiXach') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.docQuaiXach} onChange={e => upd('docQuaiXach', e.target.checked)} />Đục quai xách</label>}
                            {isFieldVisible('danKeoNap') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.danKeoNap} onChange={e => upd('danKeoNap', e.target.checked)} />Dán keo nắp</label>}
                          </div>
                          <div style={styles.cellRow}>
                            <span style={{ fontWeight: 700, fontSize: '11px' }}>ĐM phi hao:</span>
                            <NI value={manual.bagWasteMeters} onChange={v => upd('bagWasteMeters', v)} placeholder="210" style={{ width: '60px', maxWidth: '60px' }} />
                            <span>M</span>
                          </div>
                          <div style={styles.cellRow}>
                            <span style={{ fontWeight: 700, fontSize: '11px', color: '#c00' }}>Ghi chú:</span>
                            <TI value={manual.bagMachineNotes} onChange={v => upd('bagMachineNotes', v)} placeholder="Chạy theo market" style={{ flex: 1, minWidth: 0, fontWeight: 700, color: '#c00' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}

          {/* ═══════ YÊU CẦU GIAO HÀNG (màng, không chia) ═══════ */}
          {isMang && !showChia && (
            <table style={styles.table}>
              <tbody>
                <tr>
                  <td colSpan={8} style={styles.secBlue}>YÊU CẦU GIAO HÀNG</td>
                </tr>
                <tr>
                  <td colSpan={8} style={{ ...styles.td, padding: '6px 8px' }}>
                    <TA value={manual.deliveryNotes} onChange={v => upd('deliveryNotes', v)}
                      placeholder="Yêu cầu giao hàng..." rows={3} />
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ═══════ FOOTER: Người lập / Người duyệt ═══════ */}
          <table style={{ ...styles.table, marginTop: '4px' }}>
            <tbody>
              <tr>
                <td style={{ ...styles.footerCell, width: '50%' }}>
                  <b>Người lập:</b>
                  <div style={{ marginTop: '6px' }}>
                    <TI value={manual.preparedBy} onChange={v => upd('preparedBy', v)} placeholder="Họ tên" style={{ textAlign: 'center', width: '60%', margin: '0 auto' }} />
                  </div>
                </td>
                <td style={{ ...styles.footerCell, width: '50%' }}>
                  <b>Người duyệt:</b>
                  <div style={{ marginTop: '6px' }}>
                    <TI value={manual.approvedBy} onChange={v => upd('approvedBy', v)} placeholder="Họ tên" style={{ textAlign: 'center', width: '60%', margin: '0 auto' }} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Page num */}
          <div style={styles.pageNum}>Trang 1/1</div>
        </div>

        {/* ═══════ FOOTER BUTTONS ═══════ */}
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
