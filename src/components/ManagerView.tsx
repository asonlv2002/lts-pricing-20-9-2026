"use client";
import React from 'react';
import { useCalculatorStore } from '../store/calculatorStore';
import { calculate } from '../lib/engine';

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

export default function ManagerView() {
  const { result, activeView, input, materials, constants, profitTable, setChotGiaForLatest } = useCalculatorStore();
  const [chotGia, setChotGia] = React.useState('');
  const [selectedRollMat, setSelectedRollMat] = React.useState('');
  React.useEffect(() => {
    setChotGia('');
  }, [result?.input.customer, result?.input.productName, result?.input.quantity]);

  if (activeView !== 'manager') return null;

  if (!result) {
    return (
      <div className="empty-state" id="emptyState">
        <div className="icon">📦</div>
        <p>Nhập thông tin đơn hàng và nhấn <strong>Tính Giá</strong> để xem kết quả</p>
        <p style={{marginTop: '8px', fontSize: '0.78rem', color: 'var(--dim)'}}>Hoặc thay đổi bất kỳ thông số — kết quả sẽ tự động cập nhật</p>
      </div>
    );
  }
  const r = result;
  const rInput = r.input;

  // ── Summary info ──
  const numColorsText = rInput.numColors && rInput.numColors > 0 ? `${rInput.numColors} màu` : 'Không in';
  const spreadMm = +(rInput.spreadWidth * 1000).toFixed(0);
  const cutMm = +(rInput.cutStep * 1000).toFixed(0);
  
  const bagMap: Record<string, string> = {
    '3bien': '3 biên', '4bien': '4 biên', 'xephong_lech': 'Xếp hông dán lưng lệch',
    'xephong_giua': 'Xếp hông dán lưng giữa', 'dayDung': 'Đáy đứng', 'cutSeal': 'Cut seal'
  };
  let bagStr = bagMap[rInput.bagType] || '';
  if (rInput.productType === 'tui' && bagStr) {
    if (rInput.hasZipper) {
      if (rInput.bagType === 'cutSeal') {
        bagStr = 'Cute seal nắp băng keo';
      } else {
        bagStr = 'Zipper ' + bagStr;
      }
    }
  } else if (rInput.productType === 'mang') {
    bagStr = 'Màng cuộn';
  }

  const cylPerUnit = r.cylinderCostPerUnit;
  const numTr = rInput.numColors || 0;
  const cylTotal = r.cylinderCost;

  // ── Breakdown items ──
  const breakdownItems: [string, string][] = [
    [`Giá ban đầu (Vốn + ${fmtPercent(r.profitRate)} LN)`, fmt(r.costPerUnit, 1) + ' đ'],
  ];
  if (rInput.hasZipper) breakdownItems.push(['Chi phí Zipper', fmt(r.zipperPerUnit, 1) + ' đ']);
  if (rInput.hasTape) breakdownItems.push(['Chi phí Băng keo', fmt(r.tapePerUnit, 1) + ' đ']);
  if (rInput.hasHandle) breakdownItems.push(['Chi phí Quai', fmt(r.handlePerUnit, 1) + ' đ']);
  breakdownItems.push(
    ['Chi phí Thùng giấy', fmt(r.boxPerUnit, 1) + ' đ'],
    ['Chi phí Vận chuyển', fmt(r.shippingPerUnit, 1) + ' đ'],
    [`Lãi vay vốn (${fmtPercent(r.interestRate30)})`, fmt(r.interestPerUnit, 1) + ' đ'],
    ['Hoa hồng kinh doanh', fmt(r.commissionPerUnit, 1) + ' đ']
  );

  const totalCommission = r.commissionPerUnit * rInput.quantity;
  const commissionPct = r.costPerUnit > 0 ? (r.commissionPerUnit / r.costPerUnit) : 0;
  const chotGiaNum = Number(chotGia.replace(/[^\d.]/g, '')) || 0;
  const hasChotGia = chotGiaNum > 0;
  const shownPrice = hasChotGia ? chotGiaNum : r.finalPrice;
  const diff = hasChotGia ? chotGiaNum - r.finalPrice : 0;
  const newCommissionPerUnit = Math.max(0, r.commissionPerUnit + diff);
  const doanhThuChot = shownPrice * rInput.quantity;
  const tongHoaHongChot = newCommissionPerUnit * rInput.quantity;
  const tongChiPhi = r.totalProductionCost + r.zipperTotal + r.tapeTotal + r.handleTotal + r.boxTotal + r.shippingTotal + (r.interestPerUnit * rInput.quantity);
  const loiNhuanCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
  const pctLoiNhuanCongTyChot = r.totalProductionCost > 0 ? (loiNhuanCongTyChot / r.totalProductionCost) : 0;
  const commissionPctShown = r.costPerUnit > 0 ? (newCommissionPerUnit / r.costPerUnit) : 0;

  // ── Unified production table rows ──
  const uniRows: any[] = [];
  let totalCPSX = 0, totalCPVL = 0;

  const printInput = r.printMeters + r.printWaste;
  totalCPSX += r.printCostCPSX;
  totalCPVL += r.printCostMaterial;
  uniRows.push({
    stage: 'CPSX IN', mat: r.layers.print.material.name,
    width: r.printNLWidth, meters: r.printMeters, waste: r.printWaste,
    cpsx: r.printCPSX, costCPSX: r.printCostCPSX,
    matPrice: r.layers.print.material.pricePerM2, costMat: r.printCostMaterial
  });

  if (r.layers.laminations) {
    r.layers.laminations.forEach((lam: any) => {
      totalCPSX += lam.costCPSX;
      totalCPVL += lam.costMat;
      uniRows.push({
        stage: `GHÉP (Lớp ${lam.layerNum})`, mat: lam.material.name,
        width: lam.width, meters: lam.meters, waste: lam.waste,
        cpsx: constants.ghepCPSX, costCPSX: lam.costCPSX,
        matPrice: lam.material.pricePerM2, costMat: lam.costMat
      });
    });
  }

  totalCPSX += r.cutCostCPSX;
  uniRows.push({
    stage: 'CẮT', mat: '—',
    width: r.cutWidth, meters: r.cutMeters, waste: r.cutWaste,
    cpsx: r.cutCPSX, costCPSX: r.cutCostCPSX,
    matPrice: null, costMat: null
  });

  const grandTotal = totalCPSX + totalCPVL;

  // ── MOQ Table ──
  const moqLevels = [5000, 10000, 15000, 20000, 30000, 40000, 50000, 70000, 100000, 150000, 200000];
  const currentQty = rInput.quantity;
  if (!moqLevels.includes(currentQty) && currentQty > 0) {
    moqLevels.push(currentQty);
    moqLevels.sort((a, b) => a - b);
  }

  const matCols: any[] = [];
  if (r.layers.print) matCols.push({ type: 'print', name: r.layers.print.material.name.split(' ')[0], fullName: r.layers.print.material.name });
  if (r.layers.laminations) {
    r.layers.laminations.forEach((lam: any) => {
      matCols.push({ type: 'lam', layerNum: lam.layerNum, name: lam.material.name.split(' ')[0], fullName: lam.material.name });
    });
  }

  const getLayerData = (res: any, col: any) => {
    if (col.type === 'print') return res.layers.print || null;
    return res.layers.laminations?.find((l: any) => l.layerNum === col.layerNum) || null;
  };
  const calcKg = (layerMat: any, meters: number, width: number) => {
    if (!layerMat) return 0;
    return meters * width * layerMat.thickness * layerMat.density / 1000;
  };

  const moqResults = moqLevels.map(qty => {
    const inp = { ...rInput, quantity: qty };
    const res = calculate(inp, materials, constants, profitTable);
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
    return targetKg * 1000 / (width * layerMat.thickness * layerMat.density);
  };
  const findEstQtyForMeters = (targetMeters: number) => {
    let low = 100;
    let high = 1000000;
    let bestQty = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const res = calculate({ ...rInput, quantity: mid }, materials, constants, profitTable);
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
    const res = calculate({ ...rInput, quantity: estQty }, materials, constants, profitTable);
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
    ['Diện tích 1 túi', fmtM2(r.bagArea)],
    ['Tổng diện tích đơn hàng', fmt(r.totalArea, 1) + ' m²'],
    ['Trọng lượng / túi (Tare)', fmt(r.tareWeight, 2) + ' gr'],
    ['Tổng trọng lượng', fmt(r.tareWeight * rInput.quantity / 1000, 1) + ' kg'],
    ['Trọng lượng (tấn)', fmt(r.tareWeight * rInput.quantity / 1000000, 3) + ' tấn']
  ];

  return (
    <div className="panel active" id="panel-manager">
      <div className="manager-layout" style={{position: 'relative'}}>
        
        <div className="manager-content">
          
          {/* ═══ SECTION: Báo Giá Gợi Ý ═══ */}
          <div id="sect-sale" className="manager-section-anchor"></div>
          <div className="card" style={{marginBottom: '14px', padding: 0, background: 'transparent', border: 'none', boxShadow: 'none'}}>
            
            <div className="price-hero">
              <div className="label">Giá đề xuất / túi</div>
              <div className="value" id="s-price">
                {fmt(shownPrice, 0)}
                {hasChotGia && <span style={{fontSize:'0.45em', fontWeight:700, color:'var(--green)', verticalAlign:'middle', background:'rgba(46,204,113,0.15)', padding:'4px 8px', borderRadius:'12px', marginLeft:'8px'}}>Giá chốt</span>}
              </div>
              <div className="unit">(chưa VAT)</div>
              <div className="sub" id="s-structure">
                <div style={{fontWeight:600, color:'var(--text)', fontSize:'1.05rem', marginBottom:'12px'}}>{rInput.customer} — {rInput.productName}</div>
                <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 20px', fontSize:'0.9rem', margin:'0 auto', maxWidth:'600px'}}>
                  <div><strong>Chất liệu:</strong> {r.structureText}</div>
                  <div><strong>Số lượng:</strong> {fmt(rInput.quantity)} túi</div>
                  <div><strong>Số màu:</strong> {numColorsText}</div>
                  <div><strong>Kích thước:</strong> KT {spreadMm} mm x BC {cutMm} mm</div>
                  <div><strong>Độ dày:</strong> {r.totalThickness} mic</div>
                  <div><strong>Diện tích:</strong> {fmtM2(r.bagArea)}</div>
                  <div><strong>Trọng lượng:</strong> {fmt(r.tareWeight, 2)} gr</div>
                  <div><strong>Loại {rInput.productType === 'mang' ? 'sản phẩm' : 'túi'}:</strong> {bagStr}</div>
                  {numTr > 0 && (
                    <div><strong>Trục in:</strong> D {fmt(r.cylLength * 1000)} mm x CV {fmt(r.cylCircum * 1000)} mm - {fmt(cylPerUnit)} đ/trục * {numTr} trục = {fmt(cylTotal)} đ</div>
                  )}
                </div>
              </div>
            </div>

            <div className="chot-gia-row">
              <div className="form-group">
                <label className="form-label">Giá bán chốt (đ/túi)</label>
                <input
                  className="form-input"
                  placeholder="Nhập giá chốt..."
                  style={{borderColor: 'var(--green)'}}
                  value={chotGia}
                  onChange={(e) => setChotGia(e.target.value)}
                />
              </div>
              <button
                className="btn btn-sm btn-green"
                style={{marginBottom: 0, height: '40px'}}
                onClick={() => {
                  if (!chotGiaNum) return;
                  setChotGiaForLatest(chotGiaNum);
                }}
              >
                ✓ Lưu
              </button>
            </div>
            <div id="chotAnalysis">
              {hasChotGia ? (
                <div className="info-box">
                  <span className="icon">ℹ️</span>
                  Giá chốt làm thay đổi lợi nhuận công ty còn {fmt(loiNhuanCongTyChot, 0)} đ ({fmtPercent(pctLoiNhuanCongTyChot)}) và hoa hồng {fmt(newCommissionPerUnit, 1)} đ/túi ({fmtPercent(commissionPctShown)}).
                </div>
              ) : null}
            </div>

            <div style={{height: '14px'}}></div>

            <div className="stat-grid" id="s-stats">
              <div className="stat-card green" style={{position: 'relative'}}>
                <div className="stat-label">Lợi Nhuận</div>
                <div className="stat-value" style={{fontSize: '1.15rem'}}>
                  {fmt(hasChotGia ? loiNhuanCongTyChot : r.profitAmount)}đ <span style={{fontSize: '0.85rem'}}>({fmtPercent(hasChotGia ? pctLoiNhuanCongTyChot : r.profitRate)})</span>
                </div>
              </div>
              <div className="stat-card cyan">
                <div className="stat-label">Doanh thu túi</div>
                <div className="stat-value">{fmt(hasChotGia ? doanhThuChot : r.revenue)} đ</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-label">Giá Bán/Túi</div>
                <div className="stat-value">{fmt(shownPrice, 0)} đ</div>
              </div>
              <div className="stat-card pink">
                <div className="stat-label">Hoa hồng</div>
                <div className="stat-value" style={{fontSize: '1.15rem'}}>
                  {fmt(hasChotGia ? tongHoaHongChot : totalCommission)} đ
                  <div style={{fontSize:'0.85rem', fontWeight:'normal', marginTop:'4px'}}>
                    {fmt(hasChotGia ? newCommissionPerUnit : r.commissionPerUnit, 1)} đ/túi ({fmtPercent(hasChotGia ? commissionPctShown : commissionPct)})
                  </div>
                </div>
              </div>
            </div>

            {/* Chi tiết giá bán đề xuất / túi */}
            <div className="card" style={{marginBottom: '14px'}}>
              <div className="card-title"><span className="icon">💰</span> Chi tiết giá bán đề xuất / túi</div>
              <ul className="breakdown-list" id="s-breakdown">
                {breakdownItems.map(([l, v], i) => (
                  <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
                ))}
                <li className="bl-total">
                  <span className="bl-label" style={{color:'var(--orange)'}}>GIÁ BÁN ĐỀ XUẤT / TÚI</span>
                  <span className="bl-value" style={{color:'var(--orange)'}}>{fmt(shownPrice, 0)} đ</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ═══ SECTION: Đặc tả kỹ thuật & nguyên liệu ═══ */}
          <div id="sect-tech" className="manager-section-anchor"></div>
          <div className="card" style={{marginBottom: '14px'}}>
            <div className="card-title"><span className="icon">🏭</span> Đặc tả kỹ thuật & nguyên liệu</div>
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
                    let dMeters = row.meters / rInput.numImages;
                    let inputVL = row.meters + row.waste;
                    return (
                      <tr key={idx}>
                        <td>{row.stage}</td><td>{row.mat}</td>
                        <td className="num">{fmt(dWidth, 3)}</td>
                        <td className="num">{fmt(dMeters, 0)}</td>
                        <td className="num">{fmt(row.waste, 0)}</td>
                        <td className="num highlight">{fmt(inputVL, 0)}</td>
                        <td className="num">{fmt(row.cpsx, 0)}</td>
                        <td className="num">{fmt(row.costCPSX, 0)}</td>
                        <td className="num">{row.matPrice != null ? fmt(row.matPrice, 1) : '—'}</td>
                        <td className="num">{row.costMat != null ? fmt(row.costMat, 0) : '—'}</td>
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
          </div>

          {/* ═══ SECTION: Bảng giá theo số lượng (MOQ) ═══ */}
          <div id="sect-moq" className="manager-section-anchor"></div>
          <div className="card" style={{marginBottom: '14px', marginTop: '14px'}}>
            <div className="card-title"><span className="icon">📦</span> Bảng giá theo số lượng (MOQ)</div>
            <div className="info-box">
              <span className="icon">💡</span>
              So sánh giá khi thay đổi số lượng đặt hàng. Dòng tô sáng là số lượng hiện tại.
            </div>
            <div className="table-responsive">
              <table className="moq-table" id="moq-table">
                <thead>
                  <tr>
                    <th>Số lượng</th><th>LN %</th><th>Giá vốn+LN/túi</th><th>Giá đề xuất</th><th>Tổng DT</th>
                    {matCols.map((col, i) => <th key={i}>{col.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {moqResults.map(({qty, res, isCurrent}) => {
                    if (!res) return null;
                    return (
                      <tr key={qty} className={isCurrent ? 'moq-highlight' : ''}>
                        <td style={{fontWeight: isCurrent ? 700 : 400}}>{fmt(qty)}</td>
                        <td>{fmtPercent(res.profitRate)}</td>
                        <td>{fmt(res.costPerUnit, 1)}</td>
                        <td style={{fontWeight:700, color: isCurrent ? 'var(--accent)' : 'inherit'}}>{fmt(res.finalPrice, 0)}</td>
                        <td>{fmt(res.finalPrice * qty / 1000000, 2)}tr</td>
                        {matCols.map((col, ci) => {
                          const layerData = getLayerData(res, col);
                          const layerMeters = layerData ? layerData.meters + layerData.waste : 0;
                          const kg = calcKg(layerData?.material, layerMeters, layerData?.width || 0);
                          return (
                            <td key={ci}>
                              {fmt(layerMeters, 0)} m<br/>
                              <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({fmt(kg, 1)} kg)</span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ SECTION: Số lượng theo cuộn màng (Roll MOQ) ═══ */}
          <div id="sect-roll" className="manager-section-anchor"></div>
          <div className="card" style={{marginBottom: '14px'}}>
            <div className="card-title"><span className="icon">🎞️</span> SỐ LƯỢNG THEO CUỘN MÀNG</div>
            <div className="info-box">
              <span className="icon">💡</span>
              Số lượng tối ưu theo cuộn màng tiêu chuẩn của lớp in. Giúp đặt hàng khớp cuộn, giảm hao hụt.
            </div>
            <div className="table-responsive">
              <table className="moq-table" id="moq-roll-table">
                <thead>
                  <tr>
                    <th>Cuộn (mật độ)</th>
                    <th>Số lượng</th>
                    <th>LN %</th>
                    <th>Giá đề xuất</th>
                    <th>Tổng DT</th>
                  </tr>
                </thead>
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
                        <th>SL túi</th>
                        {otherLayers.map((c, i) => <th key={i}>{c.name}</th>)}
                        <th>Giá đề xuất</th>
                        <th>Tổng DT</th>
                      </tr>
                      {rollRows.map((row: any, idx: number) => (
                        <tr key={idx} className={row.isCurrent ? 'moq-highlight' : ''}>
                          <td>
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
                          <td style={{fontWeight: row.isCurrent ? 700 : 400}}>{fmt(row.estQty)}</td>
                          {otherLayers.map((col: any, i: number) => {
                            const layerData = getLayerData(row.res, col);
                            const layerMeters = layerData ? layerData.meters + layerData.waste : 0;
                            const kg = calcKg(layerData?.material, layerMeters, layerData?.width || 0);
                            return (
                              <td key={i}>
                                {fmt(layerMeters, 0)} m<br />
                                <span style={{fontSize:'0.75rem', color:'var(--muted)', fontWeight:400}}>({fmt(kg, 1)} kg)</span>
                              </td>
                            );
                          })}
                          <td style={{fontWeight:700, color: row.isCurrent ? 'var(--accent)' : 'inherit'}}>{fmt(row.res.finalPrice, 0)}</td>
                          <td>{fmt(row.res.finalPrice * row.estQty / 1000000, 2)}tr</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ SECTION: Trọng lượng & Vận chuyển ═══ */}
          <div id="sect-weight" className="manager-section-anchor"></div>
          <div className="card" style={{marginTop: '14px'}}>
            <div className="card-title"><span className="icon">⚖️</span> Trọng lượng & Vận chuyển</div>
            <ul className="breakdown-list" id="m-t-weight">
              {weightItems.map(([l, v], i) => (
                <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
              ))}
            </ul>
          </div>

        </div> {/* End manager-content */}

        {/* RIGHT: Floating TOC Sub-Menu */}
        <div className="manager-toc" style={{width: '250px', position: 'fixed', right: '20px', top: '80px', background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', zIndex: 90}}>
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
