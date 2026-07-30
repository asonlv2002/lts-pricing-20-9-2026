"use client";
// src/components/lsx/LsxFormFields.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Form body (60+ fields, 13 sections) của Lệnh Sản Xuất.
// Tách ra từ ModalDonLSX.tsx (kế thừa 100% logic, chỉ đổi từ modal sang
// controlled component để dùng được cho cả wizard section 3 và slide-in edit).
//
// Props:
//   - source: LsxSourceData (để lấy productType, hasZipper, layer IDs, khoMM, dlMM)
//   - value: LSXManualFields (controlled)
//   - onChange: (next: LSXManualFields) => void
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useMemo } from 'react';

import type { LsxSourceData, LSXManualFields } from '../../lib/types';
import { classifyLsxBagType, classifyLsxBagTypeByKey, ALL_LSX_BAG_TYPES, resolveLsxStageFlags, resolveLsxBagVisibleFields, type LsxBagTypeInfo } from '../../lib/lsx-bag-classification';
import { formatLsxFoldBottom } from '../../lib/lsx-quy-cach';

// ── CSS cho form giống mẫu thực ─────────────────────────────────────────────
const styles = {
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
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    background: '#fff',
    padding: '2px 4px',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    background: '#fff',
    padding: '2px 4px',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '32px',
    boxSizing: 'border-box' as const,
  },
  cellRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  boldVal: { fontWeight: 700, fontSize: '13px' },
  roVal: { fontSize: '12px', color: '#222', padding: '0 4px' },
  pageNum: {
    textAlign: 'right' as const,
    fontSize: '10px',
    color: '#666',
    marginTop: '4px',
  },
};

// ── Input components ──────────────────────────────────────────────────────────
function TI({ value, onChange, placeholder, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties;
}) {
  return (
    <input
      type="text"
      style={{ ...styles.input, ...style }}
      value={value}
      placeholder={placeholder ?? ''}
      onChange={e => onChange(e.target.value)}
      onFocus={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#0891b2'; }}
      onBlur={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
    />
  );
}

function NI({ value, onChange, placeholder, style }: {
  value: number; onChange: (v: number) => void; placeholder?: string; style?: React.CSSProperties;
}) {
  return (
    <input
      type="number"
      style={{ ...styles.input, ...style }}
      value={Number.isFinite(value) ? value : 0}
      placeholder={placeholder ?? ''}
      onChange={e => onChange(Number(e.target.value) || 0)}
      onFocus={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#0891b2'; }}
      onBlur={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
    />
  );
}

function TA({ value, onChange, placeholder, rows }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      style={styles.textarea}
      value={value}
      placeholder={placeholder ?? ''}
      rows={rows || 2}
      onChange={e => onChange(e.target.value)}
      onFocus={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#0891b2'; }}
      onBlur={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export interface LsxFormFieldsProps {
  source: LsxSourceData;
  value: LSXManualFields;
  onChange: (next: LSXManualFields) => void;
}

export function LsxFormFields({ source, value: manual, onChange: setManual }: LsxFormFieldsProps) {
  const inp = source.input;
  const isMang = inp.productType === 'mang';
  const isTui = !isMang;
  const khoMM = Math.round(inp.spreadWidth * 1000);
  const dlMM = Math.round(inp.cutStep * 1000);

  const autoBagType = useMemo(
    () => classifyLsxBagType(inp.bagType, inp.hasZipper),
    [inp.bagType, inp.hasZipper],
  );
  const [overrideBagTypeKey, setOverrideBagTypeKey] = useState<string>('');

  function getActiveBagType(): LsxBagTypeInfo {
    if (overrideBagTypeKey) return classifyLsxBagTypeByKey(overrideBagTypeKey);
    return autoBagType;
  }

  const activeBagType = getActiveBagType();

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

  function updLamLayer(li: number, patch: { wasteMeters?: number }) {
    setManual({
      ...manual,
      laminateLayers: laminateLayers.map((l, idx) =>
        idx === li ? { ...l, ...patch } : l,
      ),
    });
  }

  function updLamPart(li: number, pi: number, patch: { name?: string; widthMm?: number }) {
    setManual({
      ...manual,
      laminateLayers: laminateLayers.map((l, idx) =>
        idx === li
          ? { ...l, parts: l.parts.map((p, pidx) => pidx === pi ? { ...p, ...patch } : p) }
          : l,
      ),
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
    setManual({ ...manual, [key]: val });
  }, [manual, setManual]);

  function divideControls(_inTwoCols = false) {
    const widths = manual.divideWidths ?? [];
    const isCustom = Array.isArray(manual.divideWidths) && manual.divideWidths.length > 0;
    const elements = Math.max(1, manual.divideElements ?? (widths.length || 1));
    const defaultW = manual.divideWidth ?? 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={styles.cellRow}>
          <span style={{ fontWeight: 700, fontSize: '11px' }}>Kiểu chia:</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="lsx-divide-mode"
              checked={!isCustom}
              onChange={() => setManual({ ...manual, divideWidths: undefined })}
            />
            Chia đều
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', cursor: 'pointer', marginLeft: 8 }}>
            <input
              type="radio"
              name="lsx-divide-mode"
              checked={isCustom}
              onChange={() => {
                const n = Math.max(1, elements);
                const next = Array.from({ length: n }, (_, i) => widths[i] ?? defaultW);
                setManual({ ...manual, divideElements: n, divideWidths: next });
              }}
            />
            Tuỳ chỉnh
          </label>
        </div>
        <div style={styles.cellRow}>
          <span style={{ fontWeight: 700, fontSize: '11px' }}>Khổ:</span>
          <NI
            value={manual.divideWidth ?? 0}
            onChange={v => {
              if (isCustom) {
                const next = Array.from({ length: elements }, (_, i) => widths[i] || v);
                setManual({ ...manual, divideWidth: v, divideWidths: next });
              } else {
                setManual({ ...manual, divideWidth: v, divideWidths: undefined });
              }
            }}
            placeholder="mm"
            style={{ width: '70px', maxWidth: '70px' }}
          />
          <span>mm</span>
          <span style={{ fontWeight: 700, fontSize: '11px', marginLeft: 8 }}>Số phần tử:</span>
          <NI
            value={elements}
            onChange={v => {
              const n = Math.max(1, Math.floor(v) || 1);
              if (isCustom) {
                const next = Array.from({ length: n }, (_, i) => widths[i] ?? defaultW);
                setManual({ ...manual, divideElements: n, divideWidths: next });
              } else {
                setManual({ ...manual, divideElements: n, divideWidths: undefined });
              }
            }}
            placeholder="1"
            style={{ width: '50px', maxWidth: '50px' }}
          />
        </div>
        {isCustom && Array.from({ length: elements }).map((_, i) => (
          <div key={i} style={styles.cellRow}>
            <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28 }}>P{i + 1}:</span>
            <NI
              value={widths[i] ?? defaultW}
              onChange={v => {
                const next = Array.from({ length: elements }, (_, j) =>
                  j === i ? v : (widths[j] ?? defaultW),
                );
                setManual({ ...manual, divideWidths: next });
              }}
              placeholder="mm"
              style={{ width: '70px', maxWidth: '70px' }}
            />
            <span>mm</span>
          </div>
        ))}
        {!isCustom && elements > 0 && defaultW > 0 && (
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            = {defaultW}mm × {elements} phần tử
          </div>
        )}
        <div style={styles.cellRow}>
          <span style={{ fontWeight: 700, fontSize: '11px' }}>Chiều dài:</span>
          <NI value={manual.rollLength} onChange={v => upd('rollLength', v)} placeholder="m" style={{ width: '70px', maxWidth: '70px' }} />
          <span>m</span>
        </div>
        <div style={styles.cellRow}>
          <span style={{ fontWeight: 700, fontSize: '11px' }}>Chiều ra cuộn:</span>
          <NI value={manual.divideRollOutWidth} onChange={v => upd('divideRollOutWidth', v)} placeholder="mm" style={{ width: '70px', maxWidth: '70px' }} />
          <span>mm</span>
        </div>
        <div style={styles.cellRow}>
          <span style={{ fontWeight: 700, fontSize: '11px' }}>Ghi chú:</span>
          <TI value={manual.divideNotes} onChange={v => upd('divideNotes', v)} placeholder="" style={{ flex: 1, minWidth: 0 }} />
        </div>
        <div style={styles.cellRow}>
          <span style={{ fontWeight: 700, fontSize: '11px' }}>Y/c giao:</span>
          <TI
            value={manual.divideDeliveryReq}
            onChange={v => upd('divideDeliveryReq', v)}
            placeholder="Yêu cầu giao hàng..."
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff' }}>
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
              {source.customer || '...'}
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
              {source.structure || '...'}
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
      {(showGhep || showChia || showTui) && (
        <table style={styles.table}>
          <tbody>
            <tr>
              <td colSpan={8} style={styles.secYellow}>II. CÔNG VIỆC CẦN THỰC HIỆN</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* ═══════ Hàng 1: MÁY IN | MÁY GHÉP ═══════ */}
      {(showGhep) && (
        <table style={styles.table}>
          <tbody>
            <tr>
              {showGhep && (
                <td colSpan={8} style={{ ...styles.secBlue }}>MÁY GHÉP</td>
              )}
            </tr>

            {showGhep && laminateLayers.length > 0 && (
              <>
                <tr>
                  <td style={styles.lbl}>{laminateLayers[0].label}:</td>
                  <td colSpan={7} style={styles.td}>
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
                </tr>

                {laminateLayers.slice(1).map((layer, idx) => {
                  const li = idx + 1;
                  return (
                    <tr key={`lam-${li}-${layer.label}`}>
                      <td style={styles.lbl}>{layer.label}:</td>
                      <td colSpan={7} style={styles.td}>
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

                <tr>
                  <td style={styles.lbl}>ĐM phi hao:</td>
                  <td colSpan={7} style={styles.td}>
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
              </>
            )}

            {showGhep && (
              <>
                <tr>
                  <td style={styles.lbl}>Thành phẩm ghép:</td>
                  <td colSpan={3} style={styles.td}>
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
                <tr>
                  <td style={styles.lbl}>Số lượng cấp vật tư:</td>
                  <td colSpan={3} style={styles.td}>
                    <TI value={manual.lamMaterialSupplyQty} onChange={v => upd('lamMaterialSupplyQty', v)} placeholder="" />
                  </td>
                  <td style={styles.lbl}>Ghi chú:</td>
                  <td colSpan={3} style={styles.td}>
                    <TI value={manual.laminateNotes} onChange={v => upd('laminateNotes', v)} placeholder="LLDPE130-K640: tồn kho" />
                  </td>
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
              <tr>
                <td colSpan={8} style={{ ...styles.td, verticalAlign: 'top' }}>{divideControls()}</td>
              </tr>
            )}


            {showChia && showTui && (
              <tr>
                <td colSpan={4} style={{ ...styles.td, verticalAlign: 'top' }}>
                  {divideControls(true)}
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
                    {isFieldVisible('holePunchInfo') && (
                      <TI value={manual.holePunchInfo} onChange={v => upd('holePunchInfo', v)} placeholder="Đục 3 lỗ quai xách" />
                    )}
                    {isFieldVisible('ventHoleInfo') && (
                      <div style={styles.cellRow}>
                        <span style={{ fontSize: '11px' }}>Lỗ thông hơi:</span>
                        <TI value={manual.ventHoleInfo} onChange={v => upd('ventHoleInfo', v)} placeholder="6 lỗ/mặt Ø1mm" style={{ flex: 1, minWidth: 0 }} />
                      </div>
                    )}
                    {isFieldVisible('loTreoInfo') && (
                      <div style={styles.cellRow}>
                        <span style={{ fontSize: '11px' }}>Lỗ treo:</span>
                        <TI value={manual.loTreoInfo} onChange={v => upd('loTreoInfo', v)} placeholder="Ø8mm ở giữa" style={{ flex: 1, minWidth: 0 }} />
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
                      {isFieldVisible('holePunchInfo') && (
                        <TI value={manual.holePunchInfo} onChange={v => upd('holePunchInfo', v)} placeholder="Đục 3 lỗ quai xách" />
                      )}
                      {isFieldVisible('ventHoleInfo') && (
                        <div style={styles.cellRow}>
                          <span style={{ fontSize: '11px' }}>Lỗ thông hơi:</span>
                          <TI value={manual.ventHoleInfo} onChange={v => upd('ventHoleInfo', v)} placeholder="6 lỗ/mặt Ø1mm" style={{ flex: 1, minWidth: 0 }} />
                        </div>
                      )}
                      {isFieldVisible('loTreoInfo') && (
                        <div style={styles.cellRow}>
                          <span style={{ fontSize: '11px' }}>Lỗ treo:</span>
                          <TI value={manual.loTreoInfo} onChange={v => upd('loTreoInfo', v)} placeholder="Ø8mm ở giữa" style={{ flex: 1, minWidth: 0 }} />
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
  );
}

export default LsxFormFields;
