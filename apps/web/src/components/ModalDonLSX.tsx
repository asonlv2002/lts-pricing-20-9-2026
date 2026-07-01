"use client";
// src/components/LSXFormModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal form để admin điền tay các trường còn thiếu khi tạo Lệnh Sản Xuất.
// Pre-fill tự động từ HistoryItem, phân nhánh theo productType (mang / tui).
// Layout giống y mẫu thực tế QT.ISO-22-BM02 (bảng có border, nền xanh/vàng).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { X, FileDown, FileText, Loader2, ChevronDown } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { LsxSourceData, ProductionOrder, LSXManualFields } from '../lib/types';
import { classifyLsxBagType, classifyLsxBagTypeByKey, ALL_LSX_BAG_TYPES, type LsxBagTypeInfo } from '../lib/lsx-bag-classification';
import { exportLSXtoPDF, exportLSXtoDOCX } from '../lib/lsxExport';

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toLocaleDateString('vi-VN'); // dd/mm/yyyy
}

function genLSXNumber(existing: ProductionOrder[]): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const seq = (existing.length + 1).toString().padStart(3, '0');
  return `LSX-${ymd}-${seq}`;
}

function genOrderId(): string {
  return `lsx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getMaterialName(materials: { id: string; name: string }[], id?: string | null): string {
  if (!id) return '';
  return materials.find(m => m.id === id)?.name ?? id;
}

// ── Default manual fields ─────────────────────────────────────────────────────
function defaultManual(lsxNumber: string, preparedBy: string): LSXManualFields {
  return {
    lsxNumber,
    issuedDate: todayStr(),
    preparedBy,
    approvedBy: '',
    deliveryDate: '',
    notes: '',
    msp: '',
    tenSP: '',
    maMucNhu: '',
    quyCachNote: '',
    quyCachCuon: '',
    chieuRaCuonSP: '',
    soLuongDHNote: '',
    printFilmName: '',
    printWastePercent: 0,
    printProductQty: 0,
    numCylinders: 0,
    cylDiameter: 0,
    cylWidth: 0,
    rollOutWidth: 0,
    materialQtySupplied: 0,
    printNotes: '',
    cylInfo: '',
    printDirection: '',
    printMST: '',
    printProductUnit: 'MD',
    divideWidth: 0,
    rollLength: 0,
    divideRollOutWidth: 0,
    divideDeliveryReq: '',
    divideNotes: '',
    laminateFilm1: '',
    laminateFilm1Width: 0,
    lamWaste: 0,
    lamProductQty: 0,
    lamBTP: 0,
    laminateFilm2: '',
    laminateNotes: '',
    lamMaterialSupplyQty: '',
    lamProductUnit: 'MD',
    lamBTPNote: '',
    packagingInfo: '',
    packagingNotes: '',
    deliveryNotes: '',
    sealEdge: '',
    foldBottom: '',
    tearNotch: '',
    hanTruoc: 0,
    hanSau: 0,
    hanBien: 0,
    hanDau: 0,
    xepHong: 0,
    holePunchInfo: '',
    ventHoleInfo: '',
    bagWasteMeters: 0,
    bagLuuY: '',
    useSemicircularMold: false,
    useDualCutter: false,
    bagMachineWaste: 0,
    bagDeliveryReq: '',
    bagMachineNotes: '',
    tamZipperCachMieng: 0,
    loTreoInfo: '',
    danLung: 0,
    danLungLech: 0,
    danDay: 0,
    nap: 0,
    songSieuAm: 0,
    docQuaiXach: false,
    danKeoNap: false,
  };
}

// ── CSS cho form giống mẫu thực ─────────────────────────────────────────────
const styles = {
  // Bảng chung
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '12px',
    fontFamily: '"Times New Roman", Times, serif',
  },
  td: {
    border: '1px solid #333',
    padding: '3px 6px',
    verticalAlign: 'middle' as const,
    fontSize: '12px',
    lineHeight: '1.4',
  },
  lbl: {
    border: '1px solid #333',
    padding: '3px 6px',
    fontWeight: 700 as const,
    fontSize: '11px',
    whiteSpace: 'nowrap' as const,
    background: '#f8f8f8',
    verticalAlign: 'middle' as const,
    lineHeight: '1.4',
    color: '#222',
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
    border: '1px solid #ccc',
    borderRadius: '2px',
    padding: '2px 4px',
    fontSize: '11px',
    fontFamily: '"Times New Roman", Times, serif',
    background: '#fffff0',
    outline: 'none',
  },
  inputNum: {
    width: '80px',
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
  const { materials, productionOrders, themLSX, currentSellerName } = dungCuaHangTinhGia();

  const [currentIndex, setCurrentIndex] = useState(activeIndex);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sourceData = sources[currentIndex] ?? sources[0];
  const inp = sourceData.input;
  const isMang = inp.productType === 'mang';
  const isTui = !isMang;
  const khoMM = Math.round(inp.spreadWidth * 1000);
  const dlMM = Math.round(inp.cutStep * 1000);

  const autoBagType = useMemo(() => classifyLsxBagType(inp.bagType, inp.hasZipper), [inp.bagType, inp.hasZipper]);
  const [overrideBagTypeKey, setOverrideBagTypeKey] = useState<string>('');

  function getActiveBagType(): LsxBagTypeInfo {
    if (overrideBagTypeKey) return classifyLsxBagTypeByKey(overrideBagTypeKey);
    return autoBagType;
  }

  function applyBagDefaults(m: LSXManualFields, info: LsxBagTypeInfo): LSXManualFields {
    const defs = info.defaults;
    for (const key of Object.keys(defs) as (keyof LSXManualFields)[]) {
      (m as unknown as Record<string, unknown>)[key] = defs[key];
    }
    return m;
  }

  function initManual(s: LsxSourceData, bagInfo: LsxBagTypeInfo) {
    const i = s.input;
    const m = defaultManual(genLSXNumber(productionOrders), currentSellerName);
    const tui = i.productType !== 'mang';
    m.tenSP = s.productName || '';
    m.printFilmName = getMaterialName(materials, i.layer1Id);
    if (tui) {
      m.laminateFilm1 = getMaterialName(materials, i.layer2Id);
      m.laminateFilm1Width = Math.round(i.spreadWidth * 1000);
    }
    m.numCylinders = (i.numColors || 0) as number;
    m.soLuongDHNote = `${i.quantity.toLocaleString('vi-VN')} ${tui ? 'túi' : 'm²'}`;
    if (tui) applyBagDefaults(m, bagInfo);
    return m;
  }

  const [manual, setManual] = useState<LSXManualFields>(() => initManual(sourceData, autoBagType));
  const [loading, setLoading] = useState<'pdf' | 'docx' | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const s = sources[currentIndex] ?? sources[0];
    if (!s) return;
    const bagInfo = classifyLsxBagType(s.input.bagType, s.input.hasZipper);
    setOverrideBagTypeKey('');
    setManual(initManual(s, bagInfo));
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const showDropdown = sources.length > 1;

  const activeBagType = getActiveBagType();

  function isFieldVisible(field: keyof LSXManualFields): boolean {
    if (!isTui) return false;
    const commonFields: (keyof LSXManualFields)[] = [
      'soLuongDHNote', 'packagingNotes', 'deliveryNotes',
      'bagWasteMeters', 'bagMachineNotes', 'bagDeliveryReq', 'bagLuuY', 'bagMachineWaste',
    ];
    if (commonFields.includes(field)) return true;
    if (activeBagType.key === 'fallback') return true;
    return activeBagType.extraFields.includes(field);
  }

  const upd = useCallback(<K extends keyof LSXManualFields>(key: K, val: LSXManualFields[K]) => {
    setManual(prev => ({ ...prev, [key]: val }));
  }, []);

  // Tạo snapshot từ HistoryItem + materials
  function buildSnapshot(): ProductionOrder['snapshot'] {
    const getMat = (id?: string | null) => getMaterialName(materials, id);
    const result = sourceData.input;
    const area = result.quantity * result.spreadWidth * result.cutStep;
    return {
      customer: sourceData.customer,
      productName: sourceData.productName,
      productType: inp.productType,
      structure: sourceData.structure,
      quantity: inp.quantity,
      spreadWidth: inp.spreadWidth,
      cutStep: inp.cutStep,
      numColors: inp.numColors,
      bagType: inp.bagType,
      hasZipper: inp.hasZipper || false,
      cylLength: inp.cylLength,
      cylCircum: inp.cylCircum,
      filmRollLength: inp.filmRollLength,
      layer1Name: getMat(inp.layer1Id),
      layer2Name: getMat(inp.layer2Id),
      layer3Name: getMat(inp.layer3Id),
      layer4Name: getMat(inp.layer4Id),
      layer5Name: getMat(inp.layer5Id),
      chotGia: sourceData.chotGia || sourceData.finalPrice,
      totalArea: Math.round(area * 100) / 100,
    };
  }

  async function handleSubmit(format: 'pdf' | 'docx') {
    setLoading(format);
    try {
      const order: ProductionOrder = {
        id: genOrderId(),
        quoteId: sourceData.id,
        createdAt: new Date().toISOString(),
        status: 'created',
        manual,
        snapshot: buildSnapshot(),
      };

      // Lưu vào store + server
      await themLSX(order);

      // Xuất file
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
      setLoading(null);
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
            {showDropdown && (
              <div style={{ position: 'relative' }}>
                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                    border: '1px solid #2E7D32', borderRadius: 4,
                    background: dropdownOpen ? '#e8f5e9' : '#fff',
                    color: '#2E7D32', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {buildShortLabel(sourceData)} <ChevronDown size={12} />
                </button>
                {dropdownOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1099 }} onClick={() => setDropdownOpen(false)} />
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, zIndex: 1100,
                      background: '#fff', border: '1px solid #ccc', borderRadius: 6,
                      boxShadow: '0 6px 20px rgba(0,0,0,0.15)', minWidth: 280, marginTop: 4,
                      overflow: 'hidden',
                    }}>
                      {sources.map((s, i) => (
                        <div
                          key={s.id}
                          style={{
                            padding: '7px 12px', fontSize: '12px', cursor: 'pointer',
                            background: i === currentIndex ? '#e8f5e9' : '#fff',
                            color: i === currentIndex ? '#2E7D32' : '#333',
                            fontWeight: i === currentIndex ? 700 : 400,
                            borderBottom: i < sources.length - 1 ? '1px solid #eee' : 'none',
                          }}
                          onClick={() => { setCurrentIndex(i); setDropdownOpen(false); }}
                        >
                          {buildShortLabel(s)}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
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
                <td style={styles.td}>
                  <TI value={manual.quyCachNote || `R:${khoMM}mm x D:${dlMM}mm`} onChange={v => upd('quyCachNote', v)} placeholder="R:250mm x D:500mm (±2mm)" />
                </td>
                {isMang && (
                  <>
                    <td style={styles.lbl}>Quy cách cuộn:</td>
                    <td colSpan={5} style={styles.td}>
                      <TI value={manual.quyCachCuon} onChange={v => upd('quyCachCuon', v)} placeholder="K500mm x 1000m" />
                    </td>
                  </>
                )}
                {isTui && <td style={styles.td} colSpan={6}></td>}
              </tr>
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
                  {inp.numColors ? `${String(inp.numColors).padStart(2, '0')} màu` : '...'}{' '}
                </td>
                <td style={styles.lbl} colSpan={2}>Số lượng ĐH:</td>
                <td colSpan={4} style={styles.td}>
                  <TI value={manual.soLuongDHNote} onChange={v => upd('soLuongDHNote', v)} placeholder="5.400 túi -6.000 túi" style={{ ...styles.boldVal }} />
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
          <table style={styles.table}>
            <tbody>
              <tr>
                <td colSpan={8} style={styles.secYellow}>II. CÔNG VIỆC CẦN THỰC HIỆN</td>
              </tr>
            </tbody>
          </table>

          {/* ═══════ MÁY IN + MÁY GHÉP (cạnh nhau) ═══════ */}
          <table style={styles.table}>
            <tbody>
              <tr>
                <td colSpan={4} style={{ ...styles.secBlue, width: '50%' }}>MÁY IN</td>
                <td colSpan={4} style={{ ...styles.secBlue, width: '50%' }}>{isTui ? 'MÁY GHÉP' : 'MÁY CHIA'}</td>
              </tr>

              {/* Row 1: Màng in + Khổ | Màng ghép + Khổ */}
              <tr>
                <td style={styles.lbl}>Màng in:</td>
                <td style={styles.td}>
                  <TI value={manual.printFilmName} onChange={v => upd('printFilmName', v)} placeholder="PA15" style={{ fontWeight: 700 }} />
                </td>
                <td style={styles.lbl}>Khổ:</td>
                <td style={{ ...styles.td, fontWeight: 700 }}>
                  <TI value={String(khoMM)} onChange={() => {}} placeholder="640" style={{ fontWeight: 700 }} />mm
                </td>
                {isTui ? (
                  <>
                    <td style={styles.lbl}>Màng ghép:</td>
                    <td style={styles.td}>
                      <TI value={manual.laminateFilm1} onChange={v => upd('laminateFilm1', v)} placeholder=":LLDPE130" style={{ fontWeight: 700 }} />
                    </td>
                    <td style={styles.lbl}>Khổ:</td>
                    <td style={styles.td}>
                      <NI value={manual.laminateFilm1Width} onChange={v => upd('laminateFilm1Width', v)} placeholder="640" />mm
                    </td>
                  </>
                ) : (
                  <>
                    <td style={styles.lbl}>Khổ màng:</td>
                    <td style={styles.td}>{khoMM}mm</td>
                    <td style={styles.lbl}>Khổ chia:</td>
                    <td style={styles.td}>
                      <NI value={manual.divideWidth} onChange={v => upd('divideWidth', v)} placeholder="mm" />mm
                    </td>
                  </>
                )}
              </tr>

              {/* Row 2: Trục in: D × W, MST | ĐM phi hao */}
              <tr>
                <td style={styles.lbl}>Trục in:</td>
                <td style={styles.td}>
                  D:<NI value={manual.cylDiameter} onChange={v => upd('cylDiameter', v)} placeholder="750" style={{ width: '50px' }} />
                  {' x '}
                  <NI value={manual.cylWidth} onChange={v => upd('cylWidth', v)} placeholder="500" style={{ width: '50px' }} />mm
                </td>
                <td style={styles.lbl} colSpan={2}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span>Số trục:</span>
                    <TI value={manual.numCylinders ? `${String(manual.numCylinders).padStart(2, '0')} trục` : ''} onChange={v => {
                      const n = parseInt(v) || 0;
                      upd('numCylinders', n);
                    }} placeholder="08 trục" style={{ width: '70px', fontWeight: 700 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                    <span>Chiều:</span>
                    <TI value={manual.printDirection} onChange={v => upd('printDirection', v)} placeholder="Đầu chữ ra trước" style={{ width: '100%' }} />
                  </div>
                </td>
                {isTui ? (
                  <>
                    <td style={styles.lbl}>Định mức phi hao:</td>
                    <td style={styles.td}>
                      <NI value={manual.lamWaste} onChange={v => upd('lamWaste', v)} placeholder="120" /> m
                    </td>
                    <td style={styles.lbl} colSpan={2} rowSpan={1}></td>
                  </>
                ) : (
                  <>
                    <td style={styles.lbl}>Chiều dài cuộn:</td>
                    <td style={styles.td}>
                      <NI value={manual.rollLength} onChange={v => upd('rollLength', v)} placeholder="m" /> m
                    </td>
                    <td style={styles.lbl}>Chiều ra cuộn:</td>
                    <td style={styles.td}>
                      <NI value={manual.divideRollOutWidth} onChange={v => upd('divideRollOutWidth', v)} placeholder="mm" />mm
                    </td>
                  </>
                )}
              </tr>

              {/* Row 3: MST | TP ghép */}
              <tr>
                <td style={styles.lbl}>MST:</td>
                <td colSpan={3} style={styles.td}>
                  <TI value={manual.printMST} onChange={v => upd('printMST', v)} placeholder="" />
                </td>
                {isTui ? (
                  <>
                    <td style={styles.lbl}>Thành phẩm ghép:</td>
                    <td style={styles.td}>
                      <NI value={manual.lamProductQty} onChange={v => upd('lamProductQty', v)} placeholder="3.180" style={{ width: '70px' }} />
                      {' '}
                      <TI value={manual.lamProductUnit} onChange={v => upd('lamProductUnit', v)} placeholder="MD" style={{ width: '30px' }} />
                      {' '}
                      <span style={{ fontSize: '10px' }}>(ghép hết</span>
                    </td>
                    <td colSpan={2} style={styles.td}>
                      <TI value={manual.lamBTPNote} onChange={v => upd('lamBTPNote', v)} placeholder="BTP in 3.300m)" style={{ fontSize: '10px' }} />
                    </td>
                  </>
                ) : (
                  <td colSpan={4} style={styles.td}></td>
                )}
              </tr>

              {/* Row 4: ĐM phi hao | SL cấp vật tư */}
              <tr>
                <td style={styles.lbl}>Định mức phi hao:</td>
                <td colSpan={3} style={styles.td}>
                  <NI value={manual.printWastePercent} onChange={v => upd('printWastePercent', v)} placeholder="2.320" style={{ width: '80px' }} /> M
                </td>
                {isTui ? (
                  <>
                    <td style={styles.lbl}>Số lượng cấp vật tư:</td>
                    <td colSpan={3} style={styles.td}>
                      <TI value={manual.lamMaterialSupplyQty} onChange={v => upd('lamMaterialSupplyQty', v)} placeholder="" />
                    </td>
                  </>
                ) : (
                  <>
                    <td style={styles.lbl}>Ghi chú:</td>
                    <td colSpan={3} style={styles.td}>
                      <TI value={manual.divideNotes} onChange={v => upd('divideNotes', v)} placeholder="" />
                    </td>
                  </>
                )}
              </tr>

              {/* Row 5: Thành phẩm in | Ghi chú */}
              <tr>
                <td style={styles.lbl}>Thành phẩm in:</td>
                <td colSpan={3} style={styles.td}>
                  <b><NI value={manual.printProductQty} onChange={v => upd('printProductQty', v)} placeholder="3.300" style={{ ...styles.boldVal, width: '80px' }} /></b>
                  {' '}
                  <TI value={manual.printProductUnit} onChange={v => upd('printProductUnit', v)} placeholder="MD" style={{ width: '30px' }} />
                </td>
                {isTui ? (
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

              {/* Row 6: Ghi chú máy in (dài) */}
              <tr>
                <td style={styles.lbl}>Ghi chú:</td>
                <td colSpan={3} style={styles.td}>
                  <TA value={manual.printNotes} onChange={v => upd('printNotes', v)}
                    placeholder="PA15-640: tồn kho&#10;=> Duyệt Chạy mẫu sắc theo Epson giấy có chữ ký khách, Nội dung theo file, Sáng duyệt lại mẫu in" rows={3} />
                </td>
                {isTui ? (
                  <td colSpan={4} style={styles.td}></td>
                ) : (
                  <td colSpan={4} style={styles.td}></td>
                )}
              </tr>

              {/* Row 7: Trục in (vế) */}
              <tr>
                <td style={styles.lbl}>- Trục in:</td>
                <td colSpan={3} style={styles.td}>
                  <TI value={manual.cylInfo} onChange={v => upd('cylInfo', v)} placeholder="23/3 vế" />
                </td>
                <td colSpan={4} style={styles.td}></td>
              </tr>
            </tbody>
          </table>

          {/* ═══════ MÁY LÀM TÚI (chỉ túi — full width) ═══════ */}
          {isTui && (
            <table style={styles.table}>
              <tbody>
                <tr>
                  <td colSpan={8} style={styles.secBlue}>MÁY LÀM TÚI</td>
                </tr>

                {/* Row: Số lượng + Kiểu túi (LSX) */}
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

                {/* Row: Đơn hàng notes + Chiều rộng/dài */}
                <tr>
                  <td style={styles.lbl} rowSpan={2}>Đơn hàng</td>
                  <td colSpan={3} rowSpan={2} style={styles.td}>
                    <TA value={manual.packagingNotes} onChange={v => upd('packagingNotes', v)}
                      placeholder="Không bược thiếu, Không được dư.&#10;Lưu ý:&#10;- Lót màng nhựa PE hoặc OPP bên trong -&#10;Test túi đổ gạo 2.5m để đảm bảo túi không bung đường hàn." rows={4} />
                  </td>
                  <td style={styles.lbl}>Chiều rộng:</td>
                  <td style={styles.td}>
                    <NI value={khoMM} onChange={() => {}} placeholder="250" />mm
                  </td>
                  <td style={styles.lbl}>Chiều dài:</td>
                  <td style={styles.td}>
                    <NI value={dlMM} onChange={() => {}} placeholder="500" />mm
                  </td>
                </tr>

                {/* Row: Hàn biên, Hàn đáu */}
                <tr>
                  <td style={styles.lbl}>Hàn biên:</td>
                  <td style={styles.td}>
                    <NI value={manual.hanBien} onChange={v => upd('hanBien', v)} placeholder="10" />mm
                  </td>
                  <td style={styles.lbl}>Hàn đáu:</td>
                  <td style={styles.td}>
                    <NI value={manual.hanDau} onChange={v => upd('hanDau', v)} placeholder="50" />mm
                  </td>
                </tr>

                {/* Row: YÊU CẦU GIAO HÀNG + các field động */}
                <tr>
                  <td style={styles.lbl}>YÊU CẦU GIAO HÀNG:</td>
                  <td colSpan={3} rowSpan={4} style={{ ...styles.td, verticalAlign: 'top' }}>
                    <TA value={manual.deliveryNotes} onChange={v => upd('deliveryNotes', v)}
                      placeholder="=> PHÁT HIỆN LỖI BÁO CẤP TRÊN ĐỂ&#10;PHÂN LOẠI" rows={4} />
                  </td>
                  {isFieldVisible('xepHong') ? (
                    <>
                      <td style={styles.lbl}>Xếp hông:</td>
                      <td style={styles.td}>
                        <NI value={manual.xepHong} onChange={v => upd('xepHong', v)} placeholder="60" />mm
                      </td>
                    </>
                  ) : (
                    <td colSpan={2} style={styles.td}></td>
                  )}
                  <td colSpan={2} style={styles.td}></td>
                </tr>

                {/* Row: Dán lưng / Dán lưng lệch */}
                {isFieldVisible('danLung') && (
                  <tr>
                    <td style={styles.lbl}>Dán lưng:</td>
                    <td style={styles.td}>
                      <NI value={manual.danLung} onChange={v => upd('danLung', v)} placeholder="13" />mm
                    </td>
                    <td colSpan={2} style={styles.td}></td>
                  </tr>
                )}
                {isFieldVisible('danLungLech') && (
                  <tr>
                    <td style={styles.lbl}>Dán lưng lệch:</td>
                    <td style={styles.td}>
                      <NI value={manual.danLungLech} onChange={v => upd('danLungLech', v)} placeholder="10" />mm
                    </td>
                    <td style={styles.lbl}>Dán đáy:</td>
                    <td style={styles.td}>
                      <NI value={manual.danDay} onChange={v => upd('danDay', v)} placeholder="10" />mm
                    </td>
                  </tr>
                )}
                {isFieldVisible('nap') && (
                  <tr>
                    <td style={styles.lbl}>Nắp:</td>
                    <td style={styles.td}>
                      <NI value={manual.nap} onChange={v => upd('nap', v)} placeholder="35" />mm
                    </td>
                    <td style={styles.lbl}>Sóng siêu âm:</td>
                    <td style={styles.td}>
                      <NI value={manual.songSieuAm} onChange={v => upd('songSieuAm', v)} placeholder="32" />mm
                    </td>
                  </tr>
                )}
                {!isFieldVisible('danLung') && !isFieldVisible('danLungLech') && !isFieldVisible('nap') && (
                  <tr><td colSpan={4} style={styles.td}></td></tr>
                )}

                {/* Row: Đục lỗ / Tâm zipper */}
                {isFieldVisible('holePunchInfo') && (
                  <tr>
                    <td colSpan={4} style={styles.td}>
                      <TI value={manual.holePunchInfo} onChange={v => upd('holePunchInfo', v)}
                        placeholder="Đục 3 lỗ trên quai xách( Theo Market)" />
                    </td>
                  </tr>
                )}
                {isFieldVisible('tamZipperCachMieng') && (
                  <tr>
                    <td style={styles.lbl}>Tâm zipper cách miệng:</td>
                    <td style={styles.td}>
                      <NI value={manual.tamZipperCachMieng} onChange={v => upd('tamZipperCachMieng', v)} placeholder="30" />mm
                    </td>
                    <td colSpan={2} style={styles.td}></td>
                  </tr>
                )}

                {/* Row: Lỗ thông hơi / Nhấn xé V */}
                <tr>
                  {isFieldVisible('ventHoleInfo') ? (
                    <td colSpan={2} style={styles.td}>
                      <span style={{ fontSize: '11px' }}>Đục lỗ thông hơi </span>
                      <TI value={manual.ventHoleInfo} onChange={v => upd('ventHoleInfo', v)} placeholder="6 lỗ/ mặt : Ø1mm" style={{ width: '60%' }} />
                    </td>
                  ) : isFieldVisible('tearNotch') ? (
                    <td colSpan={2} style={styles.td}>
                      <span style={{ fontSize: '11px' }}>Nhấn xé V: </span>
                      <TI value={manual.tearNotch} onChange={v => upd('tearNotch', v)} placeholder="2 bên cách miệng 15mm" style={{ width: '60%' }} />
                    </td>
                  ) : isFieldVisible('loTreoInfo') ? (
                    <td colSpan={2} style={styles.td}>
                      <span style={{ fontSize: '11px' }}>Lỗ treo: </span>
                      <TI value={manual.loTreoInfo} onChange={v => upd('loTreoInfo', v)} placeholder="Ø8mm ở giữa" style={{ width: '60%' }} />
                    </td>
                  ) : (
                    <td colSpan={2} style={styles.td}></td>
                  )}
                  {(isFieldVisible('sealEdge') || isFieldVisible('foldBottom') || isFieldVisible('docQuaiXach') || isFieldVisible('danKeoNap')) ? (
                    <td colSpan={2} style={styles.td}>
                      {isFieldVisible('sealEdge') && <><span style={{ fontSize: '11px' }}>Dán biên: </span><TI value={manual.sealEdge} onChange={v => upd('sealEdge', v)} placeholder="10mm" style={{ width: '50%' }} /></>}
                      {isFieldVisible('foldBottom') && <><span style={{ fontSize: '11px' }}>Xếp đáy: </span><TI value={manual.foldBottom} onChange={v => upd('foldBottom', v)} placeholder="100mm" style={{ width: '50%' }} /></>}
                      {isFieldVisible('docQuaiXach') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.docQuaiXach} onChange={e => upd('docQuaiXach', e.target.checked)} />Đọc quai xách</label>}
                      {isFieldVisible('danKeoNap') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.danKeoNap} onChange={e => upd('danKeoNap', e.target.checked)} />Dán keo nắp</label>}
                    </td>
                  ) : (
                    <td colSpan={2} style={styles.td}></td>
                  )}
                </tr>

                {/* Row: Khuôn bán nguyệt + Dao cắt 2 nhịp */}
                {(isFieldVisible('useSemicircularMold') || isFieldVisible('useDualCutter')) && (
                  <tr>
                    <td colSpan={2} style={styles.td}>
                      {isFieldVisible('useSemicircularMold') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.useSemicircularMold} onChange={e => upd('useSemicircularMold', e.target.checked)} />Dùng khuôn đáy bán nguyệt</label>}
                    </td>
                    <td colSpan={2} style={styles.td}>
                      {isFieldVisible('useDualCutter') && <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}><input type="checkbox" checked={manual.useDualCutter} onChange={e => upd('useDualCutter', e.target.checked)} />Dùng dao cắt 2 nhịp</label>}
                    </td>
                  </tr>
                )}

                {/* Row: ĐM phi hao + Ghi chú */}
                <tr>
                  <td style={styles.lbl}>Định mức phi hao:</td>
                  <td style={styles.td}>
                    <NI value={manual.bagWasteMeters} onChange={v => upd('bagWasteMeters', v)} placeholder="210" /> M~
                  </td>
                  <td colSpan={2} style={styles.td}></td>
                </tr>

                {/* Row: Ghi chú máy túi */}
                <tr>
                  <td colSpan={4} style={styles.td}></td>
                  <td style={styles.lbl}>Ghi chú:</td>
                  <td colSpan={3} style={{ ...styles.td, fontWeight: 700, color: '#c00' }}>
                    <TI value={manual.bagMachineNotes} onChange={v => upd('bagMachineNotes', v)} placeholder="Chạy quy cách túi theo market." style={{ fontWeight: 700, color: '#c00' }} />
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ═══════ MÁY CHIA (chỉ màng) ═══════ */}
          {isMang && (
            <table style={styles.table}>
              <tbody>
                <tr>
                  <td colSpan={8} style={styles.secBlue}>YÊU CẦU GIAO HÀNG</td>
                </tr>
                <tr>
                  <td colSpan={8} style={{ ...styles.td, padding: '6px 8px' }}>
                    <TA value={manual.divideDeliveryReq} onChange={v => upd('divideDeliveryReq', v)}
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
              <button className="btn btn-outline" onClick={onClose} disabled={!!loading} style={{ fontSize: '12px' }}>
                Huỷ
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#1976D2', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleSubmit('docx')}
                disabled={!!loading}
              >
                {loading === 'docx' ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
                Lưu & Xuất DOCX
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#2E7D32', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleSubmit('pdf')}
                disabled={!!loading}
              >
                {loading === 'pdf' ? <Loader2 size={14} className="spin" /> : <FileDown size={14} />}
                Lưu & Xuất PDF
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
