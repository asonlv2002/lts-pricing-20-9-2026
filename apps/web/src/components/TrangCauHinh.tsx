"use client";
import React from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE } from '../lib/data';

// Debounced persist profit table — tránh gọi API mỗi keystroke
let _profitPersistTimer: ReturnType<typeof setTimeout>;
const debouncedPersistProfitTable = () => {
  clearTimeout(_profitPersistTimer);
  _profitPersistTimer = setTimeout(() => {
    dungCuaHangTinhGia.getState().recalculate();
  }, 800);
};

export default function ConfigPage() {
  const { materials, constants, profitTable, setMaterialParam: capNhatVatLieu, setConstantParam: capNhatHangSo } = dungCuaHangTinhGia();
  const [customerGroup, setCustomerGroup] = React.useState('other');

  const offset = customerGroup === 'svlg' ? -0.03 : 0;

  // Unique material names for ink price table
  const seenNames = new Set<string>();
  const uniqueMaterials = materials.filter(m => {
    if (seenNames.has(m.name)) return false;
    seenNames.add(m.name);
    return true;
  });

  const handleInkPriceChange = (name: string, val: number) => {
    // Apply to ALL materials sharing the same name
    materials.forEach(m => {
      if (m.name === name) {
        capNhatVatLieu(m.id, { inkPricePerColor: val });
      }
    });
  };

  const handleReset = () => {
    if (!confirm('Reset tất cả giá về mặc định?')) return;
    INITIAL_MATERIALS.forEach((def, i) => {
      const m = materials[i];
      if (m) {
        capNhatVatLieu(m.id, { 
          thickness: def.thickness, 
          pricePerKg: def.pricePerKg, 
          inkPricePerColor: def.inkPricePerColor 
        });
      }
    });
    // Reset constants
    const resetKeys: (keyof typeof INITIAL_CONSTANTS)[] = [
      'laborCost', 'nhuPrice', 'moPrice', 'ghepCPSX', 'ghepWasteA', 'ghepWasteB', 'ghepWasteC', 'cutBase', 'cutWasteA', 'cutWasteB', 'cutWasteC',
      'cutThreshold1', 'cutThreshold2', 'cutMult1', 'cutMult2', 'cutMult3',
      'zipperPrice', 'zipperWeight', 'tapePrice', 'tapeWeight', 'handlePrice', 'handleWeight',
      'printWasteA', 'printWasteB', 'printWasteC', 'printWasteD',
      'cylPriceA', 'cylPriceB', 'interestBase', 'interestSpread'
    ];
    resetKeys.forEach(key => {
      capNhatHangSo(key, INITIAL_CONSTANTS[key] as number);
    });
    // Reset colorSetup
    Object.keys(INITIAL_CONSTANTS.colorSetup).forEach(k => {
      const numK = Number(k);
      if (constants.colorSetup[numK] !== INITIAL_CONSTANTS.colorSetup[numK]) {
        capNhatHangSo('colorSetup', { ...INITIAL_CONSTANTS.colorSetup } as any);
      }
    });
  };

  const handleColorSetupChange = (colorNum: number, val: number) => {
    const newSetup = { ...constants.colorSetup, [colorNum]: val };
    capNhatHangSo('colorSetup' as any, newSetup as any);
  };

  const getRangeLabel = (i: number, threshold: number) => {
    if (i === 0) return 'Dưới 9.900.000';
    if (threshold === 19000000) return '10.000.000 - 19.000.000';
    if (threshold === 30000000) return '20.000.000 - 30.000.000';
    if (threshold === 40000000) return '31.000.000 - 40.000.000';
    if (threshold === 60000000) return '41.000.000 - 60.000.000';
    if (threshold === 80000000) return '61.000.000 - 80.000.000';
    if (threshold === 100000000) return '81.000.000 - 100.000.000';
    if (threshold === 150000000) return '101.000.000 - 150.000.000';
    if (threshold === 200000000) return '151.000.000 - 200.000.000';
    if (threshold === 300000000) return '201.000.000 - 300.000.000';
    if (threshold === 400000000) return '301.000.000 - 400.000.000';
    if (threshold === 600000000) return '401.000.000 - 600.000.000';
    return `Trên ${profitTable[i-1]?.threshold.toLocaleString('vi-VN')}`;
  };

  return (
    <div className="config-page" id="configPage" style={{display: 'block'}}>
      <div className="config-page-inner">
        <div className="config-page-header">
          <h2>🏭 Bảng Định Mức Chi Phí</h2>
          <p className="config-page-subtitle">Giá trị đầu vào dùng cho tính toán sản xuất</p>
        </div>

        {/* RIGHT: Floating TOC Sub-Menu */}
        <div className="manager-toc" style={{width: '200px', position: 'fixed', right: '20px', top: '80px', background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', zIndex: 90}}>
          <div style={{fontSize:'0.85rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', marginBottom:'12px', letterSpacing:'0.5px'}}>Mục lục</div>
          <a href="#sect-config-nvl" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>📦 Bảng Giá NVL</a>
          <a href="#sect-config-in" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>🖨️ CPSX Khâu in</a>
          <a href="#sect-config-ghep" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>🔗 CPSX Khâu Ghép</a>
          <a href="#sect-config-cat" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>✂️ CPSX Khâu cắt</a>
          <a href="#sect-config-loinhuan" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>💰 Lợi Nhuận</a>
          <a href="#sect-config-phukien" className="toc-link" style={{display:'block', padding:'8px 12px', marginBottom:'4px', textDecoration:'none', color:'var(--text)', borderRadius:'6px', fontSize:'0.9rem', fontWeight:600, background:'var(--bg)'}}>🎀 Giá Phụ Kiện</a>
        </div>

        <div className="config-content">
          
          {/* ═══ 1. Bảng giá NVL ═══ */}
          <div className="card config-card" id="sect-config-nvl" style={{scrollMarginTop: '80px'}}>
            <div className="config-section-title">
              <span>📦 Giá Nguyên Vật Liệu Cập Nhật Hàng Ngày</span>
              <button className="btn btn-sm btn-outline" onClick={handleReset}>🔄 Reset mặc định</button>
            </div>
            <div className="config-table-wrap">
              <table className="config-table" id="materialPriceTable">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Màng</th>
                    <th>Tỉ trọng (g/m³)</th>
                    <th>Độ dày (mic)</th>
                    <th>Giá (VNĐ/kg)</th>
                    <th>Giá (VNĐ/m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => (
                    <tr key={m.id}>
                      <td style={{textAlign:'center', color:'var(--dim)'}}>{idx + 1}</td>
                      <td style={{fontWeight:600}}>{m.name} <span style={{fontSize:'0.75rem', color:'var(--dim)'}}>{m.id}</span></td>
                      <td>{m.density}</td>
                      <td><input type="number" className="config-inline-input" value={m.thickness} onChange={(e) => capNhatVatLieu(m.id, { thickness: parseFloat(e.target.value)||0 })} style={{width:'80px', textAlign:'right'}} /></td>
                      <td><input type="number" className="config-inline-input" value={m.pricePerKg} onChange={(e) => capNhatVatLieu(m.id, { pricePerKg: parseFloat(e.target.value)||0 })} style={{width:'100px', textAlign:'right', fontWeight:700}} /></td>
                      <td style={{fontWeight:700, color:'var(--accent)'}}>{m.pricePerM2?.toLocaleString('vi-VN', {maximumFractionDigits:0})} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">💡 Chỉnh <strong>Độ dày</strong> và <strong>Giá VNĐ/kg</strong> — giá VNĐ/m² tự động tính lại. Thay đổi sẽ áp dụng ngay cho lần tính giá tiếp theo.</p>
          </div>

          {/* ═══════════ NHÓM 1: CHI PHÍ KHÂU IN ═══════════ */}
          <div className="config-group-header" id="sect-config-in" style={{scrollMarginTop: '80px'}}>🖨️ CPSX Khâu in</div>

          {/* 1.2 Bảng giá màu in */}
          <div className="card config-card">
            <div className="config-section-title"><span>🎨 Giá Màu In Theo Loại Màng</span></div>
            <div className="config-table-wrap">
              <table className="config-table" id="inkPriceTable">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Màng</th>
                    <th>Giá mực/màu (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueMaterials.map((m, idx) => (
                    <tr key={m.id}>
                      <td>{idx + 1}</td>
                      <td className="mat-name">{m.name}</td>
                      <td>
                        <input type="number" className="config-inline-input" value={m.inkPricePerColor}
                          onChange={(e) => handleInkPriceChange(m.name, parseFloat(e.target.value) || 0)}
                          style={{width:'80px', textAlign:'right', fontWeight:700}} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">💡 Giá mực in tính trên mỗi màu in. PET/PA mặc định 135 đ, các loại khác 120 đ.</p>
          </div>

          {/* 1.3 Công Thức Tính Phi Hao In */}
          <div className="card config-card">
            <div className="config-section-title"><span>📉 Công Thức Tính Phi Hao In</span></div>
            <div className="config-table-wrap">
              <table className="config-table" id="printWasteTable">
                <thead>
                  <tr>
                    <th>Số màu in</th>
                    <th>Phi hao set up (m)</th>
                    <th style={{paddingBottom: '8px'}}>
                      Phi hao<br/>
                      <span style={{fontSize:'0.8rem', fontWeight:'normal', textTransform:'none'}}>
                        (CD / <input type="number" className="config-inline-input" style={{width:'75px', margin:'0 4px', padding:'4px', fontWeight:700}}
                          value={constants.printWasteA}
                          onChange={(e) => capNhatHangSo('printWasteA', parseFloat(e.target.value) || 6000)}
                        /> × B)
                      </span>
                    </th>
                    <th style={{paddingBottom: '8px'}}>
                      Vượt định mức{' '}
                      <input type="number" className="config-inline-input" style={{width:'75px', margin:'0 4px', padding:'4px', fontWeight:700}}
                        value={constants.printWasteC}
                        onChange={(e) => capNhatHangSo('printWasteC', parseFloat(e.target.value) || 50000)}
                      /> m<br/>
                      <span style={{fontSize:'0.75rem', fontWeight:'normal', textTransform:'none'}}>(cộng thêm CD / C × D)</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[8,7,6,5,4,3,2,1].map(i => (
                    <tr key={i}>
                      <td>{i} màu</td>
                      <td>
                        <input className="config-inline-input" type="number" style={{width:'70px'}}
                          value={constants.colorSetup[i] || 0}
                          onChange={(e) => handleColorSetupChange(i, parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{textAlign:'center', verticalAlign:'middle'}}>
                        <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'8px'}}>
                          <span style={{fontSize:'0.9em', color:'var(--text)'}}>CD / {constants.printWasteA}</span>
                          <span style={{fontSize:'0.9em', color:'var(--muted)'}}>×</span>
                          <input type="number" className="config-inline-input" style={{width:'75px'}}
                            value={constants.printWasteB}
                            onChange={(e) => capNhatHangSo('printWasteB', parseFloat(e.target.value) || 40)} />
                        </div>
                      </td>
                      <td style={{textAlign:'center', verticalAlign:'middle'}}>
                        <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'8px'}}>
                          <span style={{fontSize:'0.9em', color:'var(--text)'}}>+ CD / {constants.printWasteC}</span>
                          <span style={{fontSize:'0.9em', color:'var(--muted)'}}>×</span>
                          <input type="number" className="config-inline-input" style={{width:'75px'}}
                            value={constants.printWasteD}
                            onChange={(e) => capNhatHangSo('printWasteD', parseFloat(e.target.value) || 400)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">💡 A, B, C, D là các tham số dùng chung cho mọi số màu in.</p>
          </div>

          {/* 1.3 Phụ phí nhũ / phủ mờ */}
          <div className="card config-card">
            <div className="config-section-title"><span>✨ Phụ Phí Nhũ / Phủ Mờ</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>Giá nhũ (đ)</label>
                <input type="number" className="form-input" value={constants.nhuPrice} onChange={e => capNhatHangSo('nhuPrice', parseFloat(e.target.value)||0)} />
              </div>
              <div className="config-cpsx-item">
                <label>Giá phủ mờ (đ)</label>
                <input type="number" className="form-input" value={constants.moPrice} onChange={e => capNhatHangSo('moPrice', parseFloat(e.target.value)||0)} />
              </div>
            </div>
            <p className="config-note">💡 Khi tích Nhũ hoặc Phủ mờ ở form nhập liệu, giá trị tương ứng sẽ được cộng vào CPSX in.</p>
          </div>

          {/* 1.4 Chi phí nhân công và chi phí khác */}
          <div className="card config-card">
            <div className="config-section-title"><span>👷 Chi Phí Nhân Công & Chi Phí Khác</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>Chi phí nhân công + khác (đ)</label>
                <input type="number" className="form-input" value={constants.laborCost} onChange={e => capNhatHangSo('laborCost', parseFloat(e.target.value)||0)} />
              </div>
            </div>
            <p className="config-note">💡 Chi phí nhân công và chi phí khác được cộng vào CPSX in cho mỗi đơn hàng.</p>
          </div>

          {/* 1.5 Lãi vay */}
          <div className="card config-card">
            <div className="config-section-title"><span>💰 Lãi Vay</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>Mức (lãi cơ sở, % / năm)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" className="form-input" style={{ width: '100px' }}
                    value={parseFloat(((constants.interestBase ?? 0.10) * 100).toFixed(4))}
                    step="0.1" min="0"
                    onChange={e => capNhatHangSo('interestBase', (parseFloat(e.target.value) || 0) / 100)} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>%/năm</span>
                </div>
              </div>
              <div className="config-cpsx-item">
                <label>Thêm (lãi tình huống, % / năm)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" className="form-input" style={{ width: '100px' }}
                    value={parseFloat(((constants.interestSpread ?? 0.03) * 100).toFixed(4))}
                    step="0.1" min="0"
                    onChange={e => capNhatHangSo('interestSpread', (parseFloat(e.target.value) || 0) / 100)} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>%/năm</span>
                </div>
              </div>
            </div>
            <p className="config-note">
              💡 Tổng lãi = Mức + Thêm = <strong>{(((constants.interestBase ?? 0.10) + (constants.interestSpread ?? 0.03)) * 100).toFixed(2)}%/năm</strong>.
              Công thức: lãi/đơn = (Mức + Thêm) ÷ 12 × (số ngày ÷ 30) × giá vốn.
            </p>
          </div>

          {/* 1.6 Đơn giá trục in */}
          <div className="card config-card">
            <div className="config-section-title"><span>🖨️ Đơn Giá Trục In</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>Trục A (đ/m²)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" className="form-input" style={{ width: '130px' }}
                    value={constants.cylPriceA ?? 7300000}
                    step="100000" min="0"
                    onChange={e => capNhatHangSo('cylPriceA', parseFloat(e.target.value) || 0)} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>đ/m²</span>
                </div>
              </div>
              <div className="config-cpsx-item">
                <label>Trục B (đ/m²)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" className="form-input" style={{ width: '130px' }}
                    value={constants.cylPriceB ?? 6500000}
                    step="100000" min="0"
                    onChange={e => capNhatHangSo('cylPriceB', parseFloat(e.target.value) || 0)} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>đ/m²</span>
                </div>
              </div>
            </div>
            <p className="config-note">💡 Trục Khác: người dùng tự nhập trực tiếp trên form nhập liệu.</p>
          </div>

          {/* ═══════════ NHÓM 2: CHI PHÍ KHÂU GHÉP ═══════════ */}
          <div className="config-group-header" id="sect-config-ghep" style={{scrollMarginTop: '80px'}}>🔗 CPSX Khâu Ghép</div>

          <div className="card config-card">
            <div style={{display:'flex', alignItems:'stretch', gap:'0'}}>
              {/* Cột trái: CPSX Ghép */}
              <div style={{padding:'12px 20px 12px 0', minWidth:'180px', borderRight:'2px solid var(--border)'}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>CPSX Ghép (đ/m²)</div>
                <input type="number" className="form-input" value={constants.ghepCPSX} onChange={e => capNhatHangSo('ghepCPSX', parseFloat(e.target.value)||0)} style={{width:'130px'}} />
              </div>
              {/* Cột phải: Phi hao */}
              <div style={{padding:'12px 0 12px 20px', flex:1}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>Phi hao ghép = (Chiều dài ÷ A × B) + C</div>
                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>A — mẫu số</span>
                    <input type="number" className="config-inline-input" style={{width:'80px', fontWeight:700, textAlign:'center'}}
                      value={constants.ghepWasteA ?? 3000}
                      onChange={e => capNhatHangSo('ghepWasteA', parseFloat(e.target.value)||3000)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>×</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>B — hao/A mét</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={constants.ghepWasteB ?? 20}
                      onChange={e => capNhatHangSo('ghepWasteB', parseFloat(e.target.value)||0)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>+</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>C — cố định (m)</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={constants.ghepWasteC ?? 100}
                      onChange={e => capNhatHangSo('ghepWasteC', parseFloat(e.target.value)||0)} />
                  </div>
                </div>
              </div>
            </div>
            <p className="config-note" style={{marginTop:'8px'}}>💡 Chi phí sản xuất ghép tính trên mỗi m² màng. Phi hao = (Tp ghép ÷ A × B) + C.</p>
          </div>

          {/* ═══════════ NHÓM 3: CHI PHÍ KHÂU CẮT ═══════════ */}
          <div className="config-group-header" id="sect-config-cat" style={{scrollMarginTop: '80px'}}>✂️ CPSX Khâu cắt</div>

          <div className="card config-card">
            <div style={{display:'flex', alignItems:'stretch', gap:'0'}}>
              {/* Cột trái: CPSX Cắt cơ bản */}
              <div style={{padding:'12px 20px 12px 0', minWidth:'180px', borderRight:'2px solid var(--border)'}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>CPSX Cắt cơ bản (đ)</div>
                <input type="number" className="form-input" value={constants.cutBase} onChange={e => capNhatHangSo('cutBase', parseFloat(e.target.value)||0)} style={{width:'130px'}} />
              </div>
              {/* Cột phải: Phi hao cắt */}
              <div style={{padding:'12px 0 12px 20px', flex:1}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>Phi hao cắt = (Chiều dài ÷ A × B) + C</div>
                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>A — mẫu số</span>
                    <input type="number" className="config-inline-input" style={{width:'80px', fontWeight:700, textAlign:'center'}}
                      value={constants.cutWasteA ?? 3000}
                      onChange={e => capNhatHangSo('cutWasteA', parseFloat(e.target.value)||3000)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>×</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>B — hao/A mét</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={constants.cutWasteB ?? 20}
                      onChange={e => capNhatHangSo('cutWasteB', parseFloat(e.target.value)||0)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>+</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>C — cố định (m)</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={constants.cutWasteC ?? 100}
                      onChange={e => capNhatHangSo('cutWasteC', parseFloat(e.target.value)||0)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="config-table-wrap" style={{marginTop:'12px'}}>
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Diện tích túi</th>
                    <th>Ngưỡng (m²)</th>
                    <th>Hệ số</th>
                    <th>CPSX Cắt thực tế</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Nhỏ</td>
                    <td><input type="number" className="config-inline-input" value={constants.cutThreshold1} step="0.01" onChange={e => capNhatHangSo('cutThreshold1', parseFloat(e.target.value)||0)} /></td>
                    <td><input type="number" className="config-inline-input" value={constants.cutMult1} step="0.1" onChange={e => capNhatHangSo('cutMult1', parseFloat(e.target.value)||0)} /></td>
                    <td className="cut-preview">{(constants.cutBase * constants.cutMult1).toLocaleString('vi-VN', {maximumFractionDigits:0})}</td>
                  </tr>
                  <tr>
                    <td>Trung bình</td>
                    <td><input type="number" className="config-inline-input" value={constants.cutThreshold2} step="0.01" onChange={e => capNhatHangSo('cutThreshold2', parseFloat(e.target.value)||0)} /></td>
                    <td><input type="number" className="config-inline-input" value={constants.cutMult2} step="0.1" onChange={e => capNhatHangSo('cutMult2', parseFloat(e.target.value)||0)} /></td>
                    <td className="cut-preview">{(constants.cutBase * constants.cutMult2).toLocaleString('vi-VN', {maximumFractionDigits:0})}</td>
                  </tr>
                  <tr>
                    <td>Lớn</td>
                    <td>—</td>
                    <td><input type="number" className="config-inline-input" value={constants.cutMult3} step="0.1" onChange={e => capNhatHangSo('cutMult3', parseFloat(e.target.value)||0)} /></td>
                    <td className="cut-preview">{(constants.cutBase * constants.cutMult3).toLocaleString('vi-VN', {maximumFractionDigits:0})}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="config-note">💡 CPSX Cắt = Cắt cơ bản × Hệ số. Ngưỡng dựa trên diện tích túi (m²).</p>
          </div>

          {/* ═══════════ NHÓM 4: BẢNG LỢI NHUẬN ═══════════ */}
          <div className="config-group-header" id="sect-config-loinhuan" style={{scrollMarginTop: '80px'}}>💰 Bảng Lợi Nhuận</div>

          <div className="card config-card">
            <div className="config-section-title" style={{alignItems: 'center'}}>
              <span>📈 Tỉ Lệ Lợi Nhuận Theo Giá Vốn</span>
              <div style={{display:'flex', alignItems:'center', gap: '8px'}}>
                <span style={{fontSize:'0.85rem', fontWeight:'normal', color:'var(--muted)'}}>Nhóm Khách hàng:</span>
                <select className="form-select" value={customerGroup} onChange={e => setCustomerGroup(e.target.value)} style={{width: 'auto', padding: '4px 24px 4px 10px', fontWeight: 'normal', fontSize: '0.85rem'}}>
                  <option value="svlg">Sen Việt và Lương Gia</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>
            <div className="config-table-wrap">
              <table className="config-table" id="profitTable">
                <thead>
                  <tr>
                    <th>Giá Vốn</th>
                    <th>Túi 3,4 biên, màng ghép: 2 lớp</th>
                    <th>Túi zipper, Đáy đứng, MPET, AL, giấy, màng ghép 3 lớp..</th>
                  </tr>
                </thead>
                <tbody>
                  {profitTable.map((row, i) => (
                    <tr key={i}>
                      <td>{getRangeLabel(i, row.threshold)}</td>
                      <td>
                        <input className="config-inline-input" type="number" step="0.5" 
                          value={+((row.col1 + offset) * 100).toFixed(2)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            // Store back: subtract offset
                            const store = dungCuaHangTinhGia.getState();
                            const newTable = [...store.profitTable];
                            newTable[i] = { ...newTable[i], col1: (val / 100) - offset };
                            dungCuaHangTinhGia.setState({ profitTable: newTable });
                            store.recalculate();
                            debouncedPersistProfitTable();
                          }}
                          style={{width:'70px', textAlign:'right'}}
                        /> %
                      </td>
                      <td>
                        <input className="config-inline-input" type="number" step="0.5"
                          value={+((row.col2 + offset) * 100).toFixed(2)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const store = dungCuaHangTinhGia.getState();
                            const newTable = [...store.profitTable];
                            newTable[i] = { ...newTable[i], col2: (val / 100) - offset };
                            dungCuaHangTinhGia.setState({ profitTable: newTable });
                            store.recalculate();
                            debouncedPersistProfitTable();
                          }}
                          style={{width:'70px', textAlign:'right'}}
                        /> %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">💡 Tỉ lệ lợi nhuận tự động tính từ giá vốn. Các con số này có thể chỉnh sửa và tự động lưu.</p>
          </div>

          {/* ═══════════ NHÓM 5: GIÁ PHỤ KIỆN ═══════════ */}
          <div className="config-group-header" id="sect-config-phukien" style={{scrollMarginTop: '80px'}}>🎀 Giá Phụ Kiện</div>

          <div className="card config-card">
            <div className="config-section-title"><span>💰 Cài Đặt Đơn Giá Phụ Kiện</span></div>
            <div className="config-table-wrap">
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Phụ kiện</th>
                    <th>Đơn giá</th>
                    <th>Trọng lượng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Zipper</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={constants.zipperPrice} onChange={e => capNhatHangSo('zipperPrice', parseFloat(e.target.value)||0)} /> đ/m</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={constants.zipperWeight} step="0.1" min="0" onChange={e => capNhatHangSo('zipperWeight', parseFloat(e.target.value)||0)} /> Gr/m</td>
                  </tr>
                  <tr>
                    <td>Băng keo</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={constants.tapePrice} onChange={e => capNhatHangSo('tapePrice', parseFloat(e.target.value)||0)} /> đ/m</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={constants.tapeWeight} step="0.1" min="0" onChange={e => capNhatHangSo('tapeWeight', parseFloat(e.target.value)||0)} /> Gr/m</td>
                  </tr>
                  <tr>
                    <td>Quai</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={constants.handlePrice} onChange={e => capNhatHangSo('handlePrice', parseFloat(e.target.value)||0)} /> đ/cái</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={constants.handleWeight} step="0.1" min="0" onChange={e => capNhatHangSo('handleWeight', parseFloat(e.target.value)||0)} /> Gr/cái</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="config-note">💡 Đơn giá thay đổi tùy thời điểm, tự động áp dụng khi chốt giá cho đơn hàng.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
