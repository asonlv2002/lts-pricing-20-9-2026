"use client";
import React, { useState } from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { buildProductionRows, calculateEffectivePricing, resolveOverrideRows, type UniRow } from '../lib/manager-calculation';
import type { OverrideRowKey, OverrideFields, OverrideTable } from '../lib/types';

// ── Collapsible card dùng trong phần kết quả ────────────────────────────────
// Mỗi lần render với resetKey mới → luôn bắt đầu ở trạng thái ĐÓNG
function CollapsibleCard({
  title,
  children,
  resetKey,
  style,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  resetKey: string | number;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  // Đặt lại về đóng khi resetKey thay đổi (tức là khi có kết quả mới)
  React.useEffect(() => { setOpen(false); }, [resetKey]);

  return (
    <div className="card" style={style}>
      <div
        className="card-title collapsible"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        {title}
        <span className={`card-collapse-arrow${open ? ' open' : ''}`}>▼</span>
      </div>
      <div className={`card-body-collapsible${open ? ' open' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// Format helpers mirroring the original engine.js
function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtVND(n: number) { return fmt(n) + ' đ'; }
function fmtPercent(n: number) {
  const val = n * 100;
  return parseFloat(val.toFixed(2)) + '%';
}
function fmtM2(n: number) { return fmt(n, 4) + ' m²'; }

// ── Overridable Cell (click-to-edit inline) ──────────────────────────────────
function OverridableCell({ rowKey, field, sourceVal, overrideVal, canEdit, onSet, decimals = 0 }: {
  rowKey: OverrideRowKey;
  field: keyof OverrideFields;
  sourceVal: number;
  overrideVal: number | undefined;
  canEdit: boolean;
  onSet: (rk: OverrideRowKey, f: keyof OverrideFields, v: number | undefined) => void;
  decimals?: number;
}) {
  const displayVal = overrideVal ?? sourceVal;
  const isChanged = overrideVal !== undefined && Math.abs(overrideVal - sourceVal) > 0.001;
  const [editing, setEditing] = React.useState(false);
  const [tempVal, setTempVal] = React.useState('');

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(tempVal);
    // Từ chối: NaN, số âm (khổ/số mét/phi hao/giá VL không thể âm),
    // hoặc gần bằng giá trị nguồn (revert về gốc)
    if (isNaN(parsed) || parsed < 0 || Math.abs(parsed - sourceVal) < 0.001) {
      onSet(rowKey, field, undefined); // revert
    } else {
      onSet(rowKey, field, parsed);
    }
  };

  if (!canEdit) {
    return (
      <td className={`num ${isChanged ? 'override-changed' : ''}`}
          title={isChanged ? `Gốc: ${fmt(sourceVal, decimals)}` : undefined}
          data-label={field}>
        {fmt(displayVal, decimals)}
      </td>
    );
  }

  return (
    <td className={`num override-cell ${isChanged ? 'override-changed' : ''}`}
        title={isChanged ? `Gốc: ${fmt(sourceVal, decimals)}` : undefined}
        data-label={field}>
      {editing ? (
        <input className="override-input" type="number" step="any"
          value={tempVal}
          onChange={e => setTempVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus />
      ) : (
        <span className="override-display"
          onClick={() => { setTempVal(String(Math.round(displayVal * 10000) / 10000)); setEditing(true); }}>
          {fmt(displayVal, decimals)}
          {canEdit && <span className="override-indicator"> ✎</span>}
        </span>
      )}
    </td>
  );
}

// ── Override Table Section ────────────────────────────────────────────────────
function OverrideTableSection({ title, colorClass, uniRows, sourceOverrides, currentOverrides, canEdit, onSet, onSave, onSaveNew, loadedHistoryId }: {
  title: string;
  colorClass: 'sale' | 'admin';
  uniRows: UniRow[];
  sourceOverrides: OverrideTable;
  currentOverrides: OverrideTable;
  canEdit: boolean;
  onSet: (rk: OverrideRowKey, f: keyof OverrideFields, v: number | undefined) => void;
  onSave: (id: string) => void;
  onSaveNew: () => void; // gọi khi chưa có loadedHistoryId — tự lưu history rồi persist
  loadedHistoryId: string | null;
}) {
  const { rows: resolvedRows, totalCPSX, totalCPVL } = resolveOverrideRows(uniRows, sourceOverrides, currentOverrides);

  return (
    <div className={`override-section override-section--${colorClass}`}>
      <div className="override-section-header">
        <div className="override-section-title">
          {colorClass === 'sale' ? '💼' : '👑'} {title}
        </div>
        {!canEdit && <span className="override-readonly-badge">Chỉ xem</span>}
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Công đoạn</th><th>Vật liệu</th>
              <th className="num">Khổ (m)</th><th className="num">Thành phẩm (m)</th>
              <th className="num">Phi hao</th><th className="num">Đầu vào VL</th>
              <th className="num">CPSX (đ/m²)</th><th className="num">Thành tiền CPSX</th>
              <th className="num">CP vật liệu (đ/m²)</th><th className="num">Thành tiền CPVL</th>
            </tr>
          </thead>
          <tbody>
            {resolvedRows.map((row) => (
              <tr key={row.rowKey}>
                <td data-label="Công đoạn">{row.stage}</td>
                <td data-label="Vật liệu">{row.mat}</td>
                <OverridableCell rowKey={row.rowKey} field="width" sourceVal={row.srcWidth}
                  overrideVal={currentOverrides[row.rowKey]?.width} canEdit={canEdit} onSet={onSet} decimals={3} />
                <OverridableCell rowKey={row.rowKey} field="meters" sourceVal={row.srcMeters}
                  overrideVal={currentOverrides[row.rowKey]?.meters} canEdit={canEdit} onSet={onSet} decimals={0} />
                <OverridableCell rowKey={row.rowKey} field="waste" sourceVal={row.srcWaste}
                  overrideVal={currentOverrides[row.rowKey]?.waste} canEdit={canEdit} onSet={onSet} decimals={0} />
                <OverridableCell rowKey={row.rowKey} field="inputVL" sourceVal={row.srcInputVL}
                  overrideVal={currentOverrides[row.rowKey]?.inputVL} canEdit={canEdit} onSet={onSet} decimals={0} />
                <td className="num" data-label="CPSX (đ/m²)">{fmt(row.cpsx, 0)}</td>
                <td className="num" data-label="Thành tiền CPSX">{fmt(row.costCPSX, 0)}</td>
                {row.matPrice != null ? (
                  <OverridableCell rowKey={row.rowKey} field="matPrice" sourceVal={row.srcMatPrice ?? 0}
                    overrideVal={currentOverrides[row.rowKey]?.matPrice} canEdit={canEdit && row.matPrice != null} onSet={onSet} decimals={1} />
                ) : (
                  <td className="num" data-label="CP vật liệu">—</td>
                )}
                <td className="num" data-label="Thành tiền CPVL">{row.costMat != null ? fmt(row.costMat, 0) : '—'}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={7}>TỔNG</td>
              <td className="num">{fmt(totalCPSX, 0)}</td>
              <td className="num"></td>
              <td className="num">{fmt(totalCPVL, 0)}</td>
            </tr>
            <tr className="total-row" style={{ fontSize: '1.05em' }}>
              <td colSpan={7}><strong>TỔNG GIÁ VỐN SẢN XUẤT</strong></td>
              <td colSpan={3} className="num" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                {fmt(totalCPSX + totalCPVL, 0)} đ
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="override-save-row">
          <button
            className="btn btn-sm btn-green"
            onClick={() => loadedHistoryId ? onSave(loadedHistoryId) : onSaveNew()}
          >
            💾 Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManagerView() {
  const { result, activeView, input, constants, profitTable, setChotGiaForLatest: datGiaChotChoMoiNhat, currentChotGia, setCurrentChotGia: datGiaChotHienTai, addCurrentToHistory: themVaoLichSu, setActiveModule: datPhan,
    role, loadedHistoryId, history,
    saleOverrides, adminOverrides, showSaleOverrides, showAdminOverrides,
    setSaleOverride: datGhiDeSale, setAdminOverride: datGhiDeAdmin, setShowSaleOverrides: datHienGhiDeSale, setShowAdminOverrides: datHienGhiDeAdmin, persistOverrides: luuGhiDe, calculateForInput,
  } = dungCuaHangTinhGia();
  const [selectedRollMat, setSelectedRollMat] = React.useState('');

  if (activeView !== 'manager') return null;

  if (!result) {
    return (
      <div className="empty-state" id="emptyState">
        <div className="icon">📦</div>
        <p>Nhập đầy đủ thông tin đơn hàng để xem kết quả tính giá</p>
        <p style={{marginTop: '8px', fontSize: '0.78rem', color: 'var(--dim)'}}>Kết quả sẽ <strong>tự động cập nhật</strong> ngay khi bạn thay đổi bất kỳ thông số nào</p>
      </div>
    );
  }
  const r = result;
  const rInput = r.input;
  const isMang = rInput.productType === 'mang';

  const { uniRows, totalCPSX, totalCPVL, grandTotal } = buildProductionRows(r, constants);
  const { effTotalProdCost, effProfitRate, effProfitAmount, effRevenue, effCostPerUnit } = calculateEffectivePricing({
    result: r,
    uniRows,
    saleOverrides,
    adminOverrides,
    profitTable,
  });

  // Key dùng để reset tất cả collapsible về đóng mỗi khi có kết quả tính mới
  // (dùng effCostPerUnit tạm, effFinalPriceWithComm sẽ được tính ở phần breakdown bên dưới)
  const resultKey = `${effCostPerUnit}|${rInput.quantity}|${r.totalThickness}|${rInput.spreadWidth}|${rInput.cutStep}`;
  const filmRollLength = (rInput as any).filmRollLength || 6000;
  const unitLabel = isMang ? 'm²' : 'túi'; // đơn vị hiển thị

  // ── Summary info ──
  const numColorsText = rInput.numColors && rInput.numColors > 0 ? `${rInput.numColors} màu` : 'Không in';
  const spreadMm = +(rInput.spreadWidth * 1000).toFixed(0);
  const cutMm = +(rInput.cutStep * 1000).toFixed(0);
  
  const filmMap: Record<string, string> = {
    'mangIn': 'Màng in',
    'mangGhep': 'Màng ghép',
    'mangDongGoi': 'Màng đóng gói tự động',
    // legacy keys
    'mangGhepKoIn': 'Màng ghép không in',
    'mangGhepCoIn': 'Màng ghép có in',
  };
  const bagMap: Record<string, string> = {
    '3bien': '3 biên', '4bien': '4 biên', 'xephong_lech': 'Xếp hông dán lưng lệch',
    'xephong_giua': 'Xếp hông dán lưng giữa', 'dayDung': 'Đáy đứng', 'cutSeal': 'Cut seal'
  };
  let bagStr = bagMap[rInput.bagType] || '';
  if (!isMang && bagStr) {
    if (rInput.hasZipper) {
      if (rInput.bagType === 'cutSeal') {
        bagStr = 'Cute seal nắp băng keo';
      } else {
        bagStr = 'Zipper ' + bagStr;
      }
    }
  } else if (isMang) {
    bagStr = filmMap[rInput.filmType] || 'Màng cuộn';
  }

  const cylPerUnit = r.cylinderCostPerUnit;
  const numTr = rInput.numColors || 0;
  const cylTotal = r.cylinderCost;

  // Commission phải tính lại từ effCostPerUnit (sau override), không dùng r.commissionPerUnit (engine gốc)
  // Vì: commissionPerUnit = commissionRate × costPerUnit → costPerUnit thay đổi thì commission thay đổi theo
  const effCommissionPerUnit = rInput.commissionFixedVND > 0
    ? rInput.commissionFixedVND
    : rInput.commissionRate * effCostPerUnit;

  // ── Breakdown items ──
  const breakdownItems: [string, string][] = [
    [`Giá ban đầu (Vốn + ${fmtPercent(effProfitRate)} LN)`, fmt(effCostPerUnit, 1) + ' đ'],
  ];
  if (rInput.hasZipper) breakdownItems.push(['Chi phí Zipper', fmt(r.zipperPerUnit, 1) + ' đ']);
  if (rInput.hasTape) breakdownItems.push(['Chi phí Băng keo', fmt(r.tapePerUnit, 1) + ' đ']);
  if (rInput.hasHandle) breakdownItems.push(['Chi phí Quai', fmt(r.handlePerUnit, 1) + ' đ']);
  breakdownItems.push(
    [isMang ? 'Chi phí Đóng gói' : 'Chi phí Thùng giấy', fmt(r.boxPerUnit, 1) + ' đ'],
    ['Chi phí Vận chuyển', fmt(r.shippingPerUnit, 1) + ' đ'],
    [`Lãi vay vốn (${fmtPercent((r.interestBase ?? 0) + (r.interestSpread ?? 0))}/năm)`, fmt(r.interestPerUnit, 1) + ' đ'],
    ['Hoa hồng kinh doanh', fmt(effCommissionPerUnit, 1) + ' đ']
  );
  if (rInput.cylIncluded && (r.cylAllocPerUnit ?? 0) > 0) {
    breakdownItems.push([`Trục in phân bổ (bao trục / 200k m²)`, fmt(r.cylAllocPerUnit ?? 0, 2) + ' đ']);
  }

  const cylAllocTotal = rInput.cylIncluded ? ((r.cylAllocPerUnit ?? 0) * rInput.quantity) : 0;
  const totalCommission = effCommissionPerUnit * rInput.quantity;
  const commissionPct = effCostPerUnit > 0 ? (effCommissionPerUnit / effCostPerUnit) : 0;
  const chotGiaNum = currentChotGia || 0;
  const hasChotGia = chotGiaNum > 0;
  // effFinalPrice tính lại với commission mới
  const effFinalPriceWithComm = effCostPerUnit
    + r.zipperPerUnit + r.tapePerUnit + r.handlePerUnit
    + r.boxPerUnit + r.shippingPerUnit + r.interestPerUnit + effCommissionPerUnit
    + (r.cylAllocPerUnit ?? 0);
  const shownPrice = hasChotGia ? chotGiaNum : effFinalPriceWithComm;
  const diff = hasChotGia ? chotGiaNum - effFinalPriceWithComm : 0;
  const rawNewCommission = effCommissionPerUnit + diff;
  const profitDropFromChot = rawNewCommission < 0 ? Math.abs(rawNewCommission) * rInput.quantity : 0;
  const profitDropPct = rawNewCommission < 0 && effProfitAmount > 0 ? (profitDropFromChot / effProfitAmount) : 0;
  const newCommissionPerUnit = Math.max(0, rawNewCommission);
  const doanhThuChot = shownPrice * rInput.quantity;
  const tongHoaHongChot = newCommissionPerUnit * rInput.quantity;
  const tongChiPhi = effTotalProdCost + r.zipperTotal + r.tapeTotal + r.handleTotal + r.boxTotal + r.shippingTotal + (r.interestPerUnit * rInput.quantity);
  const loiNhuanCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
  const pctLoiNhuanCongTyChot = effTotalProdCost > 0 ? (loiNhuanCongTyChot / effTotalProdCost) : 0;
  const commissionPctShown = effCostPerUnit > 0 ? (newCommissionPerUnit / effCostPerUnit) : 0;

  // ── MOQ Table ──
  const moqLevels = [5000, 10000, 15000, 20000, 30000, 40000, 50000, 70000, 100000, 150000, 200000];
  const currentQty = rInput.quantity;
  if (!moqLevels.includes(currentQty) && currentQty > 0) {
    moqLevels.push(currentQty);
    moqLevels.sort((a, b) => a - b);
  }

  const matCols: any[] = [];
  if (r.layers.print && r.layers.print.material) matCols.push({ type: 'print', name: r.layers.print.material.name.split(' ')[0], fullName: r.layers.print.material.name });
  if (r.layers.laminations) {
    r.layers.laminations.forEach((lam: any) => {
      if (!lam.material) return;
      const label = lam.materials?.length > 1 ? lam.materials.map((m: any) => m.name.split(' ')[0]).join('+') : lam.material.name.split(' ')[0];
      const full = lam.materials?.length > 1 ? lam.materials.map((m: any) => m.name).join(' + ') : lam.material.name;
      matCols.push({ type: 'lam', layerNum: lam.layerNum, name: label, fullName: full });
    });
  }

  const getLayerData = (res: any, col: any) => {
    if (col.type === 'print') return res.layers.print || null;
    return res.layers.laminations?.find((l: any) => l.layerNum === col.layerNum) || null;
  };
  const calcKg = (layerMat: any, meters: number, width: number) => {
    if (!layerMat) return 0;
    const density = layerMat.matDoHienThi ?? layerMat.density ?? 0;
    return meters * width * layerMat.thickness * density / 1000;
  };
  const renderMaterialBreakdown = (layerData: any) => {
    if (!layerData?.materials || !layerData?.chiTietVatLieu) return null;
    return <div style={{ marginTop: '4px', fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.35 }}>
      {layerData.chiTietVatLieu.map((item: any, idx: number) => (
        <div key={idx}>{item.viTri ? `${item.viTri}. ` : ''}{item.vaiTro === 'front' ? 'TRƯỚC' : item.vaiTro === 'back_bottom' ? 'ĐÁY+SAU' : ''} {item.ten}: {fmt(item.kho, 3)}m</div>
      ))}
    </div>;
  };

  const moqResults = moqLevels.map(qty => {
    const inp = { ...rInput, quantity: qty };
    const res = calculateForInput(inp);
    return { qty, res, isCurrent: qty === currentQty };
  }).filter(x => x.res);

  // ── Roll MOQ Table ──
  const rollOptions = matCols;
  const getRollColId = (col: any) => (col.type === 'print' ? 'print' : `lam-${col.layerNum}`);
  const selectedCol = rollOptions.find((c) => getRollColId(c) === selectedRollMat) || rollOptions[0];
  const selectedData = selectedCol ? getLayerData(r, selectedCol) : null;
  const selectedMat = selectedData?.material;
  const isKgBase = !!selectedMat && (selectedMat.name.toUpperCase().includes('LLDPE') || selectedMat.name.toUpperCase() === 'PE');
  const rollLevels = isKgBase ? [200, 300, 400, 500, 600, 700] : [1, 2, 3, 4, 5, 6];
  const rollLen = selectedMat?.rollLength || 6000;
  const totalSelectedMeters = selectedData ? selectedData.meters + selectedData.waste : 0;
  const otherLayers = rollOptions.filter((c) => c !== selectedCol);
  const getMetersFromKg = (layerMat: any, targetKg: number, width: number) => {
    if (!layerMat || width <= 0) return 0;
    return targetKg * 1000 / (width * layerMat.thickness * layerMat.matDoHienThi);
  };
  const findEstQtyForMeters = (targetMeters: number) => {
    let low = 100;
    let high = 1000000;
    let bestQty = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const res = calculateForInput({ ...rInput, quantity: mid });
      if (!res) return low;
      const layerData = selectedCol ? getLayerData(res, selectedCol) : null;
      const currentMeters = layerData ? layerData.meters + layerData.waste : 0;
      if (currentMeters <= targetMeters) {
        bestQty = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.floor(bestQty / 100) * 100;
  };
  const rollRows = selectedCol && selectedData && selectedMat ? rollLevels.map((levelVal) => {
    const availableMeters = isKgBase
      ? getMetersFromKg(selectedMat, levelVal, selectedData.width)
      : levelVal * rollLen;
    const estQty = findEstQtyForMeters(availableMeters);
    if (estQty <= 0) return null;
    const res = calculateForInput({ ...rInput, quantity: estQty });
    if (!res) return null;
    let isCurrent = false;
    if (isKgBase) {
      const currentKg = calcKg(selectedMat, totalSelectedMeters, selectedData.width);
      isCurrent = (Math.ceil(currentKg / 100) * 100) === levelVal;
    } else {
      isCurrent = levelVal === Math.ceil(totalSelectedMeters / rollLen);
    }
    return {
      levelVal,
      availableMeters,
      estQty,
      res,
      isCurrent,
      selectedKg: calcKg(selectedMat, availableMeters, selectedData.width),
    };
  }).filter(Boolean) : [];

  // ── Weight items ──
  const weightItems: [string, string][] = [
    [isMang ? 'Diện tích băng (m²/m dài)' : 'Diện tích 1 túi', fmtM2(r.bagArea)],
    ['Tổng diện tích đơn hàng', fmt(r.totalArea, 1) + ' m²'],
    ...(!isMang ? [
      ['Trọng lượng / túi (Tare)', fmt(r.tareWeight, 2) + ' gr'] as [string, string],
      ['Tổng trọng lượng', fmt(r.tareWeight * rInput.quantity / 1000, 1) + ' kg'] as [string, string],
      ['Trọng lượng (tấn)', fmt(r.tareWeight * rInput.quantity / 1000000, 3) + ' tấn'] as [string, string],
    ] : [
      ['Chiều dài cuộn TP', fmt(filmRollLength) + ' m/cuộn'] as [string, string],
    ]),
  ];

  return (
    <div className="panel active" id="panel-manager">
      <div className="manager-layout" style={{position: 'relative'}}>
        
        <div className="manager-content">
          
          {/* ═══ SECTION: Báo Giá Gợi Ý ═══ */}
          <div id="sect-sale" className="manager-section-anchor"></div>
          <div className="card" style={{marginBottom: '14px', padding: 0, background: 'transparent', border: 'none', boxShadow: 'none'}}>
            
            <div className="price-hero">
              <div className="label">{hasChotGia ? `Giá chốt / ${unitLabel}` : `Giá đề xuất / ${unitLabel}`}</div>
              <div className="value" id="s-price" style={hasChotGia ? {color:'var(--green)'} : undefined}>
                {fmt(shownPrice, 0)}
              </div>
              {hasChotGia && (
                <div style={{fontSize:'0.82rem', color:'var(--muted)', marginTop:'2px', marginBottom:'2px'}}>
                  (giá đề xuất {fmt(effFinalPriceWithComm, 0)} đ/{unitLabel})
                </div>
              )}
              {rInput.cylIncluded && (r.cylAllocPerUnit ?? 0) > 0 && (
                <div style={{fontSize:'0.78rem', color:'var(--primary)', marginTop:'2px', fontWeight:600}}>
                  📌 Có bao trục (+{fmt(r.cylAllocPerUnit ?? 0, 2)} đ/{unitLabel})
                </div>
              )}
              <div className="unit">(chưa VAT)</div>

              {/* Giá cuộn cho màng — gộp giá cuộn + DT cuộn vào 1 ô */}
              {isMang && r.filmRollArea > 0 && (
                <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'12px 24px', marginTop:'12px', fontSize:'0.92rem'}}>
                  <div style={{background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 16px', textAlign:'center'}}>
                    <div style={{fontSize:'0.72rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.03em'}}>Giá / cuộn ({fmt(spreadMm)}mm × {fmt(filmRollLength)}m)</div>
                    <div style={{fontWeight:700, color:'var(--green)', fontSize:'1.1rem'}}>{fmt(Math.round(shownPrice) * r.filmRollArea, 0)} đ</div>
                    <div style={{fontSize:'0.78rem', color:'var(--muted)', marginTop:'4px'}}>DT cuộn: {fmt(r.filmRollArea, 1)} m² · {fmt(Math.round(shownPrice), 0)} đ/m²</div>
                  </div>
                </div>
              )}

              <div className="sub" id="s-structure">
                <div style={{fontWeight:600, color:'var(--text)', fontSize:'1.05rem', marginBottom:'12px'}}>{rInput.customer} — {rInput.productName}</div>
                <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 20px', fontSize:'0.9rem', margin:'0 auto', maxWidth:'600px'}}>
                  <div><strong>Chất liệu:</strong> {r.structureText}</div>
                  {isMang ? (
                    <div><strong>Diện tích:</strong> {fmt(rInput.quantity)} m²</div>
                  ) : (
                    <div><strong>Số lượng:</strong> {fmt(rInput.quantity)} túi</div>
                  )}
                  <div><strong>Số màu:</strong> {numColorsText}</div>
                  <div><strong>Kích thước:</strong> KT {spreadMm} mm x BC {cutMm} mm</div>
                  <div><strong>Độ dày:</strong> {r.totalThickness} mic</div>
                  <div><strong>Diện tích {isMang ? 'băng' : '1 túi'}:</strong> {fmtM2(r.bagArea)}</div>
                  {!isMang && <div><strong>Trọng lượng:</strong> {fmt(r.tareWeight, 2)} gr</div>}
                  <div><strong>Loại {isMang ? 'màng' : 'túi'}:</strong> {bagStr}</div>
                  {isMang && (
                    <div><strong>Cuộn màng TP:</strong> {fmt(filmRollLength)} m/cuộn ({fmt(r.filmRollArea, 1)} m²/cuộn)</div>
                  )}
                  {numTr > 0 && (
                    <div><strong>Trục in:</strong> D {fmt(r.cylLength * 1000)} mm x CV {fmt(r.cylCircum * 1000)} mm - {fmt(cylPerUnit)} đ/trục * {numTr} trục = {fmt(cylTotal)} đ</div>
                  )}
                </div>
              </div>
            </div>

            <div className="chot-gia-row">
              <div className="form-group">
                <label className="form-label">Giá bán chốt (đ/{unitLabel})</label>
                <input
                  className="form-input"
                  placeholder="Nhập giá chốt..."
                  style={{borderColor: 'var(--green)'}}
                  value={currentChotGia > 0 ? String(Math.round(currentChotGia)) : ''}
                  onChange={(e) => datGiaChotHienTai(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                />
              </div>
              <button
                className="btn btn-sm btn-green"
                style={{marginBottom: 0, height: '40px'}}
                onClick={() => {
                  if (!chotGiaNum) return;
                  datGiaChotChoMoiNhat(chotGiaNum);
                }}
              >
                ✓ Lưu giá chốt
              </button>
              <button
                className="btn btn-sm btn-accent"
                style={{marginBottom: 0, height: '40px'}}
                title="Lưu bảng tính này vào lịch sử báo giá"
                onClick={() => {
                  themVaoLichSu();
                  // Hiện toast clickable 5s — click để vào lịch sử
                  const container = document.getElementById('toastContainer');
                  if (!container) return;
                  const toast = document.createElement('div');
                  toast.className = 'toast toast-clickable';
                  toast.innerHTML = '💾 Đã lưu báo giá! <span style="text-decoration:underline;margin-left:6px;">Xem lịch sử →</span>';
                  toast.addEventListener('click', () => {
                    datPhan('history_db');
                    toast.remove();
                  });
                  container.appendChild(toast);
                  setTimeout(() => toast.remove(), 5000);
                }}
              >
                💾 Lưu báo giá
              </button>
            </div>
            <div id="chotAnalysis">
              {hasChotGia ? (
                <div className={`chot-analysis ${diff >= 0 ? 'positive' : 'negative'}`}>
                  <div className="chot-row">
                    <span className="chot-label">{diff >= 0 ? '✅' : '⚠️'} Chênh lệch / {unitLabel}</span>
                    <span className="chot-value">{diff >= 0 ? '+' : ''}{fmt(diff, 1)} đ/{unitLabel}</span>
                  </div>
                  <div className="chot-row" style={{fontWeight:700}}>
                    <span className="chot-label">Doanh thu tổng</span>
                    <span className="chot-value">{fmt(shownPrice)} đ/{unitLabel} × {fmt(rInput.quantity)} {unitLabel} = {fmt(doanhThuChot)} đ</span>
                  </div>
                  <div className="chot-row">
                    <span className="chot-label">LN công ty ({fmtPercent(pctLoiNhuanCongTyChot)})</span>
                    <span className="chot-value">{fmt(loiNhuanCongTyChot)} đ</span>
                  </div>
                  <div className="chot-row">
                    <span className="chot-label">% Hoa hồng ({fmtPercent(commissionPctShown)})</span>
                    <span className="chot-value">{fmt(tongHoaHongChot)} đ</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{height: '14px'}}></div>

            <div className="stat-grid" id="s-stats">
              <div className="stat-card green" style={{position: 'relative'}}>
                <div className="stat-label">Lợi Nhuận</div>
                <div className="stat-value" style={{fontSize: '1.15rem'}}>
                  {fmt(hasChotGia ? loiNhuanCongTyChot : effProfitAmount)}đ <span style={{fontSize: '0.85rem'}}>({fmtPercent(hasChotGia ? pctLoiNhuanCongTyChot : effProfitRate)})</span>
                </div>
                {profitDropFromChot > 0 && (
                  <div style={{color:'#d9534f', fontSize:'0.85rem', fontWeight:700, marginTop:'8px'}}>⚠️ Giảm {fmt(profitDropFromChot)} đ ({fmtPercent(profitDropPct)}) LN so với đề xuất</div>
                )}
              </div>
              <div className="stat-card cyan">
                <div className="stat-label">Doanh thu</div>
                <div className="stat-value">{fmt(hasChotGia ? doanhThuChot : effRevenue)} đ</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-label">{hasChotGia ? `Giá Chốt/${isMang ? 'm²' : 'Túi'}` : `Giá Bán/${isMang ? 'm²' : 'Túi'}`}</div>
                <div className="stat-value">{fmt(shownPrice, 0)} đ</div>
              </div>
              <div className="stat-card pink">
                <div className="stat-label">Hoa hồng</div>
                <div className="stat-value" style={{fontSize: '1.15rem'}}>
                  {fmt(hasChotGia ? tongHoaHongChot : totalCommission)} đ
                  <div style={{fontSize:'0.85rem', fontWeight:'normal', marginTop:'4px'}}>
                    {fmt(hasChotGia ? newCommissionPerUnit : effCommissionPerUnit, 1)} đ/{unitLabel} ({fmtPercent(hasChotGia ? commissionPctShown : commissionPct)})
                  </div>
                </div>
              </div>
            </div>

            {/* Chi tiết giá bán đề xuất */}
            <CollapsibleCard
              resetKey={resultKey}
              style={{marginBottom: '14px'}}
              title={<><span className="icon">💰</span> Chi tiết giá {hasChotGia ? 'chốt' : 'đề xuất'} / {unitLabel}</>}
            >
              <ul className="breakdown-list" id="s-breakdown">
                {breakdownItems.map(([l, v], i) => (
                  <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
                ))}
                <li className="bl-total">
                  <span className="bl-label" style={{color:'var(--orange)'}}>GIÁ BÁN ĐỀ XUẤT / {unitLabel.toUpperCase()}</span>
                  <span className="bl-value" style={{color:'var(--orange)'}}>{fmt(effFinalPriceWithComm, 0)} đ</span>
                </li>
                {hasChotGia && (
                  <li className="bl-total" style={{borderTop: '1px dashed var(--border)', marginTop: '6px', paddingTop: '8px'}}>
                    <span className="bl-label" style={{color:'var(--green)'}}>GIÁ BÁN CHỐT / {unitLabel.toUpperCase()}</span>
                    <span className="bl-value" style={{color:'var(--green)'}}>
                      {fmt(chotGiaNum, 0)} đ
                      <span style={{fontSize:'0.75em', fontWeight:400, marginLeft:'8px', color: diff >= 0 ? 'var(--green)' : 'var(--red)'}}>
                        ({diff >= 0 ? '+' : ''}{fmt(diff, 0)} đ)
                      </span>
                    </span>
                  </li>
                )}
              </ul>
            </CollapsibleCard>
          </div>

          {/* ═══ SECTION: Đặc tả kỹ thuật & nguyên liệu ═══ */}
          <div id="sect-tech" className="manager-section-anchor"></div>
          <CollapsibleCard
            resetKey={resultKey}
            style={{marginBottom: '14px'}}
            title={<><span className="icon">🏭</span> Đặc tả kỹ thuật &amp; nguyên liệu</>}
          >
            <div className="table-responsive">
              <table className="data-table" id="m-t-unified-table">
                <thead>
                  <tr>
                    <th>Công đoạn</th><th>Vật liệu</th>
                    <th className="num">Khổ (m)</th><th className="num">Thành phẩm (m)</th><th className="num">Phi hao</th><th className="num">Đầu vào VL</th>
                    <th className="num">CPSX (đ/m²)</th><th className="num">Thành tiền CPSX</th>
                    <th className="num">CP vật liệu (đ/m²)</th><th className="num">Thành tiền CPVL</th>
                  </tr>
                </thead>
                <tbody>
                  {uniRows.map((row, idx) => {
                    let dWidth = row.stage !== 'CẮT' ? rInput.spreadWidth * rInput.numImages + 0.02 : row.width;
                    let dMeters = row.meters;
                    let dWaste = row.waste;
                    let inputVL = dMeters + dWaste;

                    if (row.materialDetails?.length) {
                      const totalDetailWidth = row.materialDetails.reduce((sum, detail) => sum + detail.width, 0) || row.width;
                      const rowSpan = row.materialDetails.length;
                      return row.materialDetails.map((detail, detailIdx) => {
                        const detailCostCPSX = row.costCPSX * detail.width / totalDetailWidth;
                        return (
                          <tr key={`${idx}-${detailIdx}`} className="detail-group-row">
                            {detailIdx === 0 && <td data-label="Công đoạn" rowSpan={rowSpan}>{row.stage}</td>}
                            <td data-label="Vật liệu">{detail.name}</td>
                            <td className="num" data-label="Khổ (m)">{fmt(detail.width, 3)}</td>
                            <td className="num" data-label="Thành phẩm (m)">{fmt(dMeters, 0)}</td>
                            <td className="num" data-label="Phi hao">{fmt(dWaste, 0)}</td>
                            <td className="num highlight" data-label="Đầu vào VL">{fmt(inputVL, 0)}</td>
                            <td className="num" data-label="CPSX (đ/m²)">{fmt(row.cpsx, 0)}</td>
                            <td className="num" data-label="Thành tiền CPSX">{fmt(detailCostCPSX, 0)}</td>
                            <td className="num" data-label="CP vật liệu (đ/m²)">{fmt(detail.matPrice, 1)}</td>
                            <td className="num" data-label="Thành tiền CPVL">{fmt(detail.costMat, 0)}</td>
                          </tr>
                        );
                      });
                    }

                    return (
                      <tr key={idx}>
                        <td data-label="Công đoạn">{row.stage}</td>
                        <td data-label="Vật liệu">{row.mat}</td>
                        <td className="num" data-label="Khổ (m)">{fmt(dWidth, 3)}</td>
                        <td className="num" data-label="Thành phẩm (m)">{fmt(dMeters, 0)}</td>
                        <td className="num" data-label="Phi hao">{fmt(dWaste, 0)}</td>
                        <td className="num highlight" data-label="Đầu vào VL">{fmt(inputVL, 0)}</td>
                        <td className="num" data-label="CPSX (đ/m²)">{fmt(row.cpsx, 0)}</td>
                        <td className="num" data-label="Thành tiền CPSX">{fmt(row.costCPSX, 0)}</td>
                        <td className="num" data-label="CP vật liệu (đ/m²)">{row.matPrice != null ? fmt(row.matPrice, 1) : '—'}</td>
                        <td className="num" data-label="Thành tiền CPVL">{row.costMat != null ? fmt(row.costMat, 0) : '—'}</td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td colSpan={7}>TỔNG</td>
                    <td className="num">{fmt(totalCPSX, 0)}</td>
                    <td className="num"></td>
                    <td className="num">{fmt(totalCPVL, 0)}</td>
                  </tr>
                  <tr className="total-row" style={{fontSize: '1.05em'}}>
                    <td colSpan={7}><strong>TỔNG GIÁ VỐN SẢN XUẤT</strong></td>
                    <td colSpan={3} className="num" style={{color: 'var(--accent)', fontWeight: 800}}>{fmt(grandTotal, 0)} đ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* ═══ SECTION: Override Toggle + Tables ═══ */}
          {(() => {
            const loadedItem = loadedHistoryId ? history.find(h => h.id === loadedHistoryId) : null;
            const quoteStatus = loadedItem?.quoteStatus ?? 'drafted';
            const canSaleEdit = role === 'sale' && quoteStatus === 'drafted';
            const canAdminEdit = role === 'admin';
            // Source for bảng Admin = sale-resolved values (engine overridden by sale)

            // Khi chưa có loadedHistoryId: tự lưu history trước rồi persist override
            const handleSaveNew = () => {
              themVaoLichSu();
              // loadedHistoryId vừa được set bởi themVaoLichSu (sync state)
              const newId = dungCuaHangTinhGia.getState().loadedHistoryId;
              if (newId) luuGhiDe(newId);
            };
            const emptyOv: OverrideTable = {};

            return (
              <>
                <div className="override-toggle-row">
                  <button
                    className={`override-toggle-btn sale ${showSaleOverrides ? 'active' : ''}`}
                    onClick={() => datHienGhiDeSale(!showSaleOverrides)}
                  >
                    {showSaleOverrides ? '− Ẩn' : '＋'} Thay đổi từ Sale
                  </button>
                  <button
                    className={`override-toggle-btn admin ${showAdminOverrides ? 'active' : ''}`}
                    onClick={() => datHienGhiDeAdmin(!showAdminOverrides)}
                  >
                    {showAdminOverrides ? '− Ẩn' : '＋'} Thay đổi từ Admin
                  </button>
                </div>

                {showSaleOverrides && (
                  <OverrideTableSection
                    title="Bảng thay đổi từ Sale"
                    colorClass="sale"
                    uniRows={uniRows}
                    sourceOverrides={emptyOv}
                    currentOverrides={saleOverrides}
                    canEdit={canSaleEdit}
                    onSet={datGhiDeSale}
                    onSave={luuGhiDe}
                    onSaveNew={handleSaveNew}
                    loadedHistoryId={loadedHistoryId}
                  />
                )}

                {showAdminOverrides && (
                  <OverrideTableSection
                    title="Bảng thay đổi từ Admin"
                    colorClass="admin"
                    uniRows={uniRows}
                    sourceOverrides={saleOverrides}
                    currentOverrides={adminOverrides}
                    canEdit={canAdminEdit}
                    onSet={datGhiDeAdmin}
                    onSave={luuGhiDe}
                    onSaveNew={handleSaveNew}
                    loadedHistoryId={loadedHistoryId}
                  />
                )}
              </>
            );
          })()}

          {/* ═══ SECTION: Bảng giá theo số lượng (MOQ) ═══ */}
          <div id="sect-moq" className="manager-section-anchor"></div>
          <CollapsibleCard
            resetKey={resultKey}
            style={{marginBottom: '14px', marginTop: '14px'}}
            title={<><span className="icon">📦</span> Bảng giá theo số lượng (MOQ)</>}
          >
            <div className="info-box">
              <span className="icon">💡</span>
              So sánh giá khi thay đổi số lượng đặt hàng. Dòng tô sáng là số lượng hiện tại.
            </div>
            <div className="table-responsive">
              <table className="moq-table" id="moq-table">
                <thead>
                  <tr>
                    <th>Số lượng</th><th>LN %</th><th>Giá vốn+LN/{unitLabel}</th><th>Giá đề xuất</th><th>Tổng DT</th>
                    {matCols.map((col, i) => <th key={i}>{col.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {moqResults.map(({qty, res, isCurrent}) => {
                    if (!res) return null;
                    return (
                      <tr key={qty} className={isCurrent ? 'moq-highlight' : ''}>
                        <td data-label="Số lượng" style={{fontWeight: isCurrent ? 700 : 400}}>{fmt(qty)}</td>
                        <td data-label="LN %">{fmtPercent(res.profitRate)}</td>
                        <td data-label="Giá vốn+LN">{fmt(res.costPerUnit, 1)}</td>
                        <td data-label="Giá đề xuất" style={{fontWeight:700, color: isCurrent ? 'var(--accent)' : 'inherit'}}>{fmt(res.finalPrice, 0)}</td>
                        <td data-label="Tổng DT">{fmt(res.finalPrice * qty / 1000000, 2)}tr</td>
                        {matCols.map((col, ci) => {
                          const layerData = getLayerData(res, col);
                          const layerMeters = layerData ? (layerData.meters + layerData.waste) / rInput.numImages : 0;
                          const kg = calcKg(layerData?.material, layerMeters, layerData?.width || 0);
                          return (
                            <td key={ci} data-label={col.name}>
                              {fmt(layerMeters, 0)} m<br/>
                              <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({fmt(kg, 1)} kg)</span>
                              {renderMaterialBreakdown(layerData)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* ═══ SECTION: Số lượng theo cuộn màng (Roll MOQ) ═══ */}
          <div id="sect-roll" className="manager-section-anchor"></div>
          <CollapsibleCard
            resetKey={resultKey}
            style={{marginBottom: '14px'}}
            title={<><span className="icon">🎞️</span> SỐ LƯỢNG THEO CUỘN MÀNG</>}
          >
            <div className="info-box">
              <span className="icon">💡</span>
              Số lượng tối ưu theo cuộn màng tiêu chuẩn của lớp in. Giúp đặt hàng khớp cuộn, giảm hao hụt.
            </div>
            <div className="table-responsive">
              <table className="moq-table" id="moq-roll-table">
                <tbody>
                  {!selectedCol || !selectedData || !selectedMat ? (
                    <tr>
                      <td colSpan={5} style={{textAlign:'center', color:'var(--muted)', padding:'20px'}}>Không có lớp màng phù hợp để tính MOQ cuộn</td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <th>
                          <select
                            className="form-select"
                            value={getRollColId(selectedCol)}
                            onChange={(e) => setSelectedRollMat(e.target.value)}
                            style={{fontWeight:700, color:'var(--accent)', border:'1.5px solid var(--accent)', padding:'4px 24px 4px 8px', borderRadius:'6px', cursor:'pointer', background:'transparent', display:'inline-block', fontSize:'0.85rem', margin:0, textTransform:'uppercase'}}
                          >
                            {rollOptions.map((c, i) => {
                              const colIsKg = c.fullName.toUpperCase().includes('LLDPE') || c.fullName.toUpperCase() === 'PE';
                              return (
                                <option key={i} value={getRollColId(c)}>
                                  {c.name} {colIsKg ? '(KG)' : '(CUỘN)'}
                                </option>
                              );
                            })}
                          </select>
                        </th>
                        <th>SL {unitLabel}</th>
                        {otherLayers.map((c, i) => <th key={i}>{c.name}</th>)}
                        <th>Giá đề xuất</th>
                        <th>Tổng DT</th>
                      </tr>
                      {rollRows.map((row: any, idx: number) => (
                        <tr key={idx} className={row.isCurrent ? 'moq-highlight' : ''}>
                          <td data-label={isKgBase ? 'Khối lượng (kg)' : 'Chỉ số Cuộn'}>
                            {isKgBase ? (
                              <>
                                <span style={{fontWeight:700}}>{fmt(row.levelVal)} kg</span><br />
                                <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({fmt(row.availableMeters, 0)} m)</span>
                              </>
                            ) : (
                              <>
                                <span style={{fontWeight:700}}>{row.levelVal} cuộn</span><br />
                                <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({fmt(row.availableMeters, 0)}m - {fmt(row.selectedKg, 1)} kg)</span>
                              </>
                            )}
                          </td>
                          <td data-label={`SL ${unitLabel}`} style={{fontWeight: row.isCurrent ? 700 : 400}}>{fmt(row.estQty)}</td>
                          {otherLayers.map((col: any, i: number) => {
                            const layerData = getLayerData(row.res, col);
                            const layerMeters = layerData ? (layerData.meters + layerData.waste) / rInput.numImages : 0;
                            const kg = calcKg(layerData?.material, layerMeters, layerData?.width || 0);
                            return (
                              <td data-label={col.name} key={i}>
                                {fmt(layerMeters, 0)} m<br />
                                <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({fmt(kg, 1)} kg)</span>
                                {renderMaterialBreakdown(layerData)}
                              </td>
                            );
                          })}
                          <td data-label="Giá đề xuất" style={{fontWeight:700, color: row.isCurrent ? 'var(--accent)' : 'inherit'}}>{fmt(row.res.finalPrice, 0)}</td>
                          <td data-label="Tổng DT">{fmt(row.res.finalPrice * row.estQty / 1000000, 2)}tr</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* ═══ SECTION: Trọng lượng & Vận chuyển ═══ */}
          <div id="sect-weight" className="manager-section-anchor"></div>
          <CollapsibleCard
            resetKey={resultKey}
            style={{marginTop: '14px'}}
            title={<><span className="icon">⚖️</span> Trọng lượng &amp; Vận chuyển</>}
          >
            <ul className="breakdown-list" id="m-t-weight">
              {weightItems.map(([l, v], i) => (
                <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
              ))}
            </ul>
          </CollapsibleCard>

        </div> {/* End manager-content */}

        {/* RIGHT: Floating TOC Sub-Menu */}
        <div className="manager-toc" style={{width: '200px', position: 'fixed', right: '12px', top: '80px', background: 'var(--surface)', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', zIndex: 90}}>
          <div style={{fontSize:'0.85rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', marginBottom:'12px', letterSpacing:'0.5px'}}>Mục lục các bảng</div>
          <a href="#sect-sale" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>1. Bảng Báo Giá Gợi Ý</a>
          <a href="#sect-tech" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>2. Bảng Đặc Tả Kỹ Thuật</a>
          <a href="#sect-moq" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>3. Bảng Giá Theo MOQ</a>
          <a href="#sect-roll" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>4. Bảng MOQ Cuộn Màng</a>
          <a href="#sect-weight" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>5. Trọng Lượng &amp; Vận Chuyển</a>
        </div>

      </div> {/* End manager-layout */}
    </div>
  );
}
