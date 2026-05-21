"use client";
import React from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE, INITIAL_SMALL_WIDTH_PRICES } from '../lib/data';
// Debounced persist profit table €” tránh gọi API mỗi keystroke
let boDemLuuBangLoiNhuan: ReturnType<typeof setTimeout>;
const luuBangLoiNhuanTre = () => {
  clearTimeout(boDemLuuBangLoiNhuan);
  boDemLuuBangLoiNhuan = setTimeout(() => {
    dungCuaHangTinhGia.getState().recalculate();
  }, 800);
};
type NhomCauHinh = 'materials' | 'waste' | 'production' | 'outsource' | 'profit' | 'surcharges' | 'interest' | 'formulas';
const layNhomCauHinh = (menuDangChon?: string): NhomCauHinh => {
  switch (menuDangChon) {
    case 'config.materials':
      return 'materials';
    case 'config.waste_norms':
      return 'waste';
    case 'config.production_costs':
      return 'production';
    case 'config.outsource_costs':
      return 'outsource';
    case 'config.profit_margin':
      return 'profit';
    case 'config.surcharges':
      return 'surcharges';
    case 'config.interest':
      return 'interest';
    case 'config.formulas':
      return 'formulas';
    default:
      return 'materials';
  }
};
export default function TrangCauHinh({ menuDangChon }: { menuDangChon?: string }) {
  const { materials: vatLieu, constants: hangSo, profitTable: bangLoiNhuan, smallWidthPrices: bangGiaKhoNho, setMaterialParam: capNhatVatLieu, setConstantParam: capNhatHangSo, setSmallWidthPriceParam: capNhatGiaKhoNho } = dungCuaHangTinhGia();
  const [nhomKhachHang, datNhomKhachHang] = React.useState('other');
  const [hienBangKhoNho, datHienBangKhoNho] = React.useState(false);
  const nhomCauHinh = layNhomCauHinh(menuDangChon);
  const hienVatTu = nhomCauHinh === 'materials';
  const hienHaoHut = nhomCauHinh === 'waste';
  const hienSanXuat = nhomCauHinh === 'production';
  const hienGiaCongNgoai = nhomCauHinh === 'outsource';
  const hienLoiNhuan = nhomCauHinh === 'profit';
  const hienPhuPhi = nhomCauHinh === 'surcharges';
  const hienLaiVay = nhomCauHinh === 'interest';
  const hienCongThuc = nhomCauHinh === 'formulas';
  const tongLaiNam = (hangSo.interestBase ?? 0.10) + (hangSo.interestSpread ?? 0.03);
  const mocNgayLaiVay = [14, 30, 45, 90];
  const dinhDangTyLeLaiNgay = (days: number) => ((tongLaiNam / 365) * days * 100).toFixed(3);
  const chenhLech = nhomKhachHang === 'svlg' ? -0.03 : 0;
  const bangGiaKhoNhoMotDong = vatLieu
    .map(m => bangGiaKhoNho.find(p => p.materialId === m.id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  // Unique material names for ink price table
  const tenDaGap = new Set<string>();
  const vatLieuDuyNhat = vatLieu.filter(m => {
    if (tenDaGap.has(m.name)) return false;
    tenDaGap.add(m.name);
    return true;
  });
  const xuLyDoiGiaMuc = (ten: string, giaTri: number) => {
    // Apply to ALL materials sharing the same name
    vatLieu.forEach(m => {
      if (m.name === ten) {
        capNhatVatLieu(m.id, { inkPricePerColor: giaTri });
      }
    });
  };
  const xuLyDatLai = () => {
    if (!confirm('Reset tất cả giá về mặc định?')) return;
    INITIAL_MATERIALS.forEach((macDinh, i) => {
      const m = vatLieu[i];
      if (m) {
        capNhatVatLieu(m.id, {
          thickness: macDinh.thickness,
          pricePerKg: macDinh.pricePerKg,
          inkPricePerColor: macDinh.inkPricePerColor
        });
      }
    });
    // Reset constants
    const cacKhoaDatLai: (keyof typeof INITIAL_CONSTANTS)[] = [
      'laborCost', 'nhuPrice', 'moPrice', 'ghepCPSX', 'ghepWasteA', 'ghepWasteB', 'ghepWasteC', 'cutBase', 'cutWasteA', 'cutWasteB', 'cutWasteC',
      'cutThreshold1', 'cutThreshold2', 'cutMult1', 'cutMult2', 'cutMult3',
      'zipperPrice', 'zipperWeight', 'tapePrice', 'tapeWeight', 'handlePrice', 'handleWeight',
      'boxPriceDefault', 'bagsPerBoxDefault', 'boxOptions', 'handleOptions',
      'printWasteA', 'printWasteB', 'printWasteC', 'printWasteD',
      'cylPriceA', 'cylPriceB', 'interestBase', 'interestSpread'
    ];
    cacKhoaDatLai.forEach(key => {
      capNhatHangSo(key, INITIAL_CONSTANTS[key] as number);
    });
    // Reset colorSetup
    Object.keys(INITIAL_CONSTANTS.colorSetup).forEach(k => {
      const khoaSo = Number(k);
      if (hangSo.colorSetup[khoaSo] !== INITIAL_CONSTANTS.colorSetup[khoaSo]) {
        capNhatHangSo('colorSetup', { ...INITIAL_CONSTANTS.colorSetup } as any);
      }
    });
  };
  const xuLyDoiCaiDatMau = (soMau: number, giaTri: number) => {
    const caiDatMoi = { ...hangSo.colorSetup, [soMau]: giaTri };
    capNhatHangSo('colorSetup' as any, caiDatMoi as any);
  };
  const xuLyDoiLoaiThung = (khoa: string, truong: 'price' | 'weight', giaTri: number) => {
    const cacLoaiThung = (hangSo.boxOptions ?? []).map(option =>
      option.key === khoa ? { ...option, [truong]: giaTri } : option
    );
    capNhatHangSo('boxOptions' as any, cacLoaiThung as any);
  };
  const xuLyDoiLoaiQuai = (khoa: string, truong: 'price' | 'weight', giaTri: number) => {
    const cacLoaiQuai = (hangSo.handleOptions ?? []).map(option =>
      option.key === khoa ? { ...option, [truong]: giaTri } : option
    );
    capNhatHangSo('handleOptions' as any, cacLoaiQuai as any);
    const macDinh = cacLoaiQuai.find(o => o.key === 'small') ?? cacLoaiQuai[0];
    if (macDinh) {
      capNhatHangSo('handlePrice', macDinh.price as any);
      capNhatHangSo('handleWeight', macDinh.weight as any);
    }
  };
  const dinhDangVnd = (n: number) => n.toLocaleString('vi-VN');
  const layBienLoiNhuan = (i: number, nguong: number) => {
    const from = i === 0 ? 0 : bangLoiNhuan[i - 1]?.threshold ?? 0;
    return { from, to: nguong };
  };
  const capNhatNguongLoiNhuan = (i: number, value: number) => {
    const cuaHang = dungCuaHangTinhGia.getState();
    const bangMoi = [...cuaHang.profitTable];
    const min = i === 0 ? 1 : (bangMoi[i - 1]?.threshold ?? 0) + 1;
    const max = i < bangMoi.length - 1 ? (bangMoi[i + 1]?.threshold ?? Number.MAX_SAFE_INTEGER) - 1 : Number.MAX_SAFE_INTEGER;
    const nguong = Math.max(min, Math.min(max, Math.round(value || 0)));
    bangMoi[i] = { ...bangMoi[i], threshold: nguong };
    dungCuaHangTinhGia.setState({ profitTable: bangMoi });
    cuaHang.recalculate();
    luuBangLoiNhuanTre();
  };
  return (
    <div className="config-page" id="configPage" style={{display: 'block'}}>
      <div className="config-page-inner">
        <div className="config-content">

          {hienVatTu && (
          <>
          {/* â•â•â• 1. Báº£ng giá NVL â•â•â• */}
          <div className="card config-card" id="sect-config-nvl" style={{scrollMarginTop: '80px'}}>
            <div className="config-section-title">
              <span>ðŸ“¦ Giá NguyÃªn Váº­t Liá»‡u Cáº­p Nháº­t Hàng Ngày</span>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <select
                  value={hienBangKhoNho ? 'small' : 'normal'}
                  onChange={(e) => datHienBangKhoNho(e.target.value === 'small')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    minWidth: '150px'
                  }}
                >
                  <option value="normal">Khổ bình thường</option>
                  <option value="small">Khá»• nhá»</option>
                </select>
                <button className="btn btn-sm btn-outline" onClick={xuLyDatLai}>ðŸ”„ Reset mặc định</button>
              </div>
            </div>
            {!hienBangKhoNho ? (
              // Báº£ng khá»• bình thÆ°á»ng
              <>
                <div className="config-table-wrap">
                  <table className="config-table" id="materialPriceTable">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Màng</th>
                        <th>Tỉ tr»ng (g/mÂ³)</th>
                        <th>Đá»™ dày (mic)</th>
                        <th>Giá (VNĐ/kg)</th>
                        <th>Giá (VNĐ/mÂ²)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vatLieu.map((m, idx) => (
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
                <p className="config-note">ðŸ’¡ Chá»‰nh <strong>Đá»™ dày</strong> và <strong>Giá VNĐ/kg</strong> €” giá VNĐ/mÂ² tá»± Đ‘á»™ng tính láº¡i. Thay Đ‘á»•i sáº½ áp dá»¥ng ngay cho láº§n tính giá tiáº¿p theo.</p>
              </>
            ) : (
              // Báº£ng khá»• nhá»
              <>
                <div className="config-table-wrap">
                  <table className="config-table" id="smallWidthPriceTable">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Màng</th>
                        <th>Tỉ tr»ng (g/mÂ³)</th>
                        <th>Đá»™ dày (mic)</th>
                        <th>Khá»• nhá» (mm)</th>
                        <th>Giá (VNĐ/kg)</th>
                        <th>Giá (VNĐ/mÂ²)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bangGiaKhoNhoMotDong.map((p, idx) => {
                        const material = vatLieu.find(m => m.id === p.materialId);
                        if (!material) return null;
                        return (
                          <tr key={p.id}>
                            <td style={{textAlign:'center', color:'var(--dim)'}}>{idx + 1}</td>
                            <td style={{fontWeight:600}}>{material.name}</td>
                            <td>{material.density}</td>
                            <td><input type="number" className="config-inline-input" value={p.thickness ?? material.thickness} onChange={(e) => capNhatGiaKhoNho(p.id, { thickness: parseFloat(e.target.value)||0 })} style={{width:'80px', textAlign:'right'}} /></td>
                            <td><input type="number" className="config-inline-input" value={p.widthThresholdMm} onChange={(e) => capNhatGiaKhoNho(p.id, { widthThresholdMm: parseFloat(e.target.value)||0 })} style={{width:'80px', textAlign:'right'}} /></td>
                            <td><input type="number" className="config-inline-input" value={p.pricePerKg} onChange={(e) => capNhatGiaKhoNho(p.id, { pricePerKg: parseFloat(e.target.value)||0 })} style={{width:'100px', textAlign:'right', fontWeight:700}} /></td>
                            <td style={{fontWeight:700, color:'var(--accent)'}}>{p.pricePerM2?.toLocaleString('vi-VN', {maximumFractionDigits:0})} đ</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="config-note">ðŸ’¡ Khi khổ nguyên vật liệu â‰¤ ngÆ°á»¡ng khá»• nhá», hệ thống sẽ dùng giá khá»• nhá» thay cho giá thÆ°á»ng. Ví dá»¥: khá»• 350mm sáº½ dùng giá má»‘c 400mm náº¿u có.</p>
              </>
            )}
          </div>
          </>
          )}
          {/* â•â•â•â•â•â•â•â•â•â•â• NH“M 1: CHI PHÃ KH‚U IN â•â•â•â•â•â•â•â•â•â•â• */}
          {(hienSanXuat || hienHaoHut || hienPhuPhi || hienCongThuc) && <div className="config-group-header" id="sect-config-in" style={{scrollMarginTop: '80px'}}>ðŸ–¨ï¸ CPSX Khâu in</div>}
          {/* 1.6 ĐÆ¡n giá trá»¥c in */}
          {hienSanXuat && (
          <div className="card config-card">
            <div className="config-section-title"><span>ðŸ–¨ï¸ ĐÆ¡n Giá Trá»¥c In</span></div>
            <div className="cylinder-price-panel">
              <div className="cylinder-price-head">
                <div>Loại trục</div>
                <div>Giá trục</div>
              </div>
              <div className="cylinder-price-row">
                <div><span className="cylinder-type-badge">Trục A</span></div>
                <div className="cylinder-price-input">
                  <input type="number" className="form-input"
                    value={hangSo.cylPriceA ?? 7300000}
                    step="100000" min="0"
                    onChange={e => capNhatHangSo('cylPriceA', parseFloat(e.target.value) || 0)} />
                  <span>đ/m²</span>
                </div>
              </div>
              <div className="cylinder-price-row">
                <div><span className="cylinder-type-badge cylinder-type-badge--b">Trục B</span></div>
                <div className="cylinder-price-input">
                  <input type="number" className="form-input"
                    value={hangSo.cylPriceB ?? 6500000}
                    step="100000" min="0"
                    onChange={e => capNhatHangSo('cylPriceB', parseFloat(e.target.value) || 0)} />
                  <span>đ/m²</span>
                </div>
              </div>
              <div className="cylinder-price-row cylinder-price-row--muted">
                <div><span className="cylinder-type-badge cylinder-type-badge--custom">Trục khác</span></div>
                <div className="cylinder-custom-note">Nhập trong form tính giá khi chọn <strong>Trục khác</strong>.</div>
              </div>
            </div>
          </div>
          )}
          {/* 1.2 Báº£ng giá màu in */}
          {hienSanXuat && (
          <div className="card config-card">
            <div className="config-section-title"><span>ðŸŽ¨ Giá Màu In Theo Loáº¡i Màng</span></div>
            <div className="config-table-wrap">
              <table className="config-table" id="inkPriceTable">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Màng</th>
                    <th>Giá mực/màu (Đ‘)</th>
                  </tr>
                </thead>
                <tbody>
                  {vatLieuDuyNhat.map((m, idx) => (
                    <tr key={m.id}>
                      <td>{idx + 1}</td>
                      <td className="mat-name">{m.name}</td>
                      <td>
                        <input type="number" className="config-inline-input" value={m.inkPricePerColor}
                          onChange={(e) => xuLyDoiGiaMuc(m.name, parseFloat(e.target.value) || 0)}
                          style={{width:'80px', textAlign:'right', fontWeight:700}} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">ðŸ’¡ Giá mực in tính trên mỗi màu in. PET/PA mặc định 135đ, các loại khác 120 Đ‘.</p>
          </div>
          )}
          {/* 1.3 Công Thức Tính Phi Hao In */}
          {hienHaoHut && (
          <div className="card config-card">
            <div className="config-section-title"><span>ðŸ“‰ Công Thức Tính Phi Hao In</span></div>
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
                          value={hangSo.printWasteA}
                          onChange={(e) => capNhatHangSo('printWasteA', parseFloat(e.target.value) || 6000)}
                        /> × B)
                      </span>
                    </th>
                    <th style={{paddingBottom: '8px'}}>
                      Vượt định mức{' '}
                      <input type="number" className="config-inline-input" style={{width:'75px', margin:'0 4px', padding:'4px', fontWeight:700}}
                        value={hangSo.printWasteC}
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
                          value={hangSo.colorSetup[i] || 0}
                          onChange={(e) => xuLyDoiCaiDatMau(i, parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{textAlign:'center', verticalAlign:'middle'}}>
                        <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'8px'}}>
                          <span style={{fontSize:'0.9em', color:'var(--text)'}}>CD / {hangSo.printWasteA}</span>
                          <span style={{fontSize:'0.9em', color:'var(--muted)'}}>×</span>
                          <input type="number" className="config-inline-input" style={{width:'75px'}}
                            value={hangSo.printWasteB}
                            onChange={(e) => capNhatHangSo('printWasteB', parseFloat(e.target.value) || 40)} />
                        </div>
                      </td>
                      <td style={{textAlign:'center', verticalAlign:'middle'}}>
                        <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'8px'}}>
                          <span style={{fontSize:'0.9em', color:'var(--text)'}}>+ max(0, CD - {hangSo.printWasteC}) / {hangSo.printWasteC}</span>
                          <span style={{fontSize:'0.9em', color:'var(--muted)'}}>×</span>
                          <input type="number" className="config-inline-input" style={{width:'75px'}}
                            value={hangSo.printWasteD}
                            onChange={(e) => capNhatHangSo('printWasteD', parseFloat(e.target.value) || 400)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">ðŸ’¡ A, B, C, D là các tham sá»‘ dùng chung cho má»i sá»‘ màu in.</p>
          </div>
          )}
          {/* 1.3 Phá»¥ phí nhÅ© / phá»§ má» */}
          {hienPhuPhi && (
          <div className="card config-card">
            <div className="config-section-title"><span>âœ¨ Phá»¥ Phí NhÅ© / Phá»§ Má»</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>Giá nhũ (Đ‘)</label>
                <input type="number" className="form-input" value={hangSo.nhuPrice} onChange={e => capNhatHangSo('nhuPrice', parseFloat(e.target.value)||0)} />
              </div>
              <div className="config-cpsx-item">
                <label>Giá phá»§ má» (Đ‘)</label>
                <input type="number" className="form-input" value={hangSo.moPrice} onChange={e => capNhatHangSo('moPrice', parseFloat(e.target.value)||0)} />
              </div>
            </div>
            <p className="config-note">ðŸ’¡ Khi tích NhÅ© hoáº·c Phá»§ má» á»Ÿ form nhập liệu, giá trị tương ứng sẽ được cộng vào CPSX in.</p>
          </div>
          )}
          {/* 1.4 CPSX khâu in */}
          {hienSanXuat && (
          <div className="card config-card">
            <div className="config-section-title"><span>ðŸ–¨ï¸ CPSX Khâu in</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>CPSX khâu in (đ/m²)</label>
                <input type="number" className="form-input" value={hangSo.laborCost} onChange={e => capNhatHangSo('laborCost', parseFloat(e.target.value)||0)} />
              </div>
            </div>
            <p className="config-note">ðŸ’¡ Khoáº£n CPSX cố định cá»™ng vào Đ‘Æ¡n giá in: CPSX in = giá má»±c/màu × sá»‘ màu + CPSX khâu in (+ phá»¥ phí náº¿u có).</p>
          </div>
          )}
          {hienLaiVay && (
          <div className="card config-card">
            <div className="config-section-title"><span>Lãi Vay Công Nợ</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>Mức (lãi cơ sở % / nĐƒm)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" className="form-input" style={{ width: '100px' }}
                    value={parseFloat(((hangSo.interestBase ?? 0.10) * 100).toFixed(4))}
                    step="0.1" min="0"
                    onChange={e => capNhatHangSo('interestBase', (parseFloat(e.target.value) || 0) / 100)} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>%/nĐƒm</span>
                </div>
              </div>
              <div className="config-cpsx-item">
                <label>Thêm (lãi tình huống % / năm)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" className="form-input" style={{ width: '100px' }}
                    value={parseFloat(((hangSo.interestSpread ?? 0.03) * 100).toFixed(4))}
                    step="0.1" min="0"
                    onChange={e => capNhatHangSo('interestSpread', (parseFloat(e.target.value) || 0) / 100)} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>%/nĐƒm</span>
                </div>
              </div>
            </div>
            <div className="config-note" style={{marginTop:'12px'}}>
              <div>Tổng lãi = Mức + Thêm = <strong>{(tongLaiNam * 100).toFixed(2)}%/nĐƒm</strong>.</div>
              <div style={{marginTop:'10px', border:'1px solid var(--border)', borderRadius:'10px', overflow:'hidden', background:'var(--surface)'}}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:'1px solid var(--border)', fontWeight:700, color:'var(--muted)', fontSize:'0.78rem'}}>
                  <div style={{padding:'8px 10px', textAlign:'center'}}>Ngày công nợ</div>
                  <div style={{padding:'8px 10px', textAlign:'center'}}>Tỷ lệ lãi</div>
                </div>
                {mocNgayLaiVay.map(days => (
                  <div key={days} style={{display:'grid', gridTemplateColumns:'1fr 1fr', borderTop:'1px solid var(--border)'}}>
                    <div style={{padding:'10px', textAlign:'center', fontWeight:600}}>{days} ngày</div>
                    <div style={{padding:'10px', textAlign:'center', fontSize:'1.05rem', fontWeight:800, color:'var(--accent)'}}>{dinhDangTyLeLaiNgay(days)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
          {/* â•â•â•â•â•â•â•â•â•â•â• NH“M 2: CHI PHÃ KH‚U GHÃ‰P â•â•â•â•â•â•â•â•â•â•â• */}
          {(hienSanXuat || hienHaoHut) && <div className="config-group-header" id="sect-config-ghep" style={{scrollMarginTop: '80px'}}>ðŸ”— CPSX Khâu Ghép</div>}
          {(hienSanXuat || hienHaoHut) && (
          <div className="card config-card">
            <div style={{display:'flex', alignItems:'stretch', gap:'0'}}>
              {/* Cột trái: CPSX Ghép */}
              <div style={{padding:'12px 20px 12px 0', minWidth:'180px', borderRight:'2px solid var(--border)'}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>CPSX Ghép (Đ‘/mÂ²)</div>
                <input type="number" className="form-input" value={hangSo.ghepCPSX} onChange={e => capNhatHangSo('ghepCPSX', parseFloat(e.target.value)||0)} style={{width:'130px'}} />
              </div>
              {/* Cá»™t pháº£i: Phi hao */}
              <div style={{padding:'12px 0 12px 20px', flex:1}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>Phi hao ghép = (Chiá»u dài × A × B) + C</div>
                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>A €” mẫu số</span>
                    <input type="number" className="config-inline-input" style={{width:'80px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.ghepWasteA ?? 3000}
                      onChange={e => capNhatHangSo('ghepWasteA', parseFloat(e.target.value)||3000)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>×</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>B €” hao/A mét</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.ghepWasteB ?? 20}
                      onChange={e => capNhatHangSo('ghepWasteB', parseFloat(e.target.value)||0)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>+</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>C €” cố định (m)</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.ghepWasteC ?? 100}
                      onChange={e => capNhatHangSo('ghepWasteC', parseFloat(e.target.value)||0)} />
                  </div>
                </div>
              </div>
            </div>
            <p className="config-note" style={{marginTop:'8px'}}>ðŸ’¡ Chi phí sản xuất ghép tính trên mỗi mÂ² màng. Phi hao = (Tp ghép × A × B) + C.</p>
          </div>
          )}
          {/* â•â•â•â•â•â•â•â•â•â•â• NH“M 3: CHI PHÃ KH‚U Cáº®T â•â•â•â•â•â•â•â•â•â•â• */}
          {(hienSanXuat || hienHaoHut) && <div className="config-group-header" id="sect-config-cat" style={{scrollMarginTop: '80px'}}>âœ‚ï¸ CPSX Khâu cáº¯t</div>}
          {(hienSanXuat || hienHaoHut) && (
          <div className="card config-card">
            <div style={{display:'flex', alignItems:'stretch', gap:'0'}}>
              {/* Cá»™t trái: CPSX Cáº¯t cÆ¡ báº£n */}
              <div style={{padding:'12px 20px 12px 0', minWidth:'180px', borderRight:'2px solid var(--border)'}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>CPSX Cáº¯t cÆ¡ báº£n (Đ‘)</div>
                <input type="number" className="form-input" value={hangSo.cutBase} onChange={e => capNhatHangSo('cutBase', parseFloat(e.target.value)||0)} style={{width:'130px'}} />
              </div>
              {/* Cá»™t pháº£i: Phi hao cáº¯t */}
              <div style={{padding:'12px 0 12px 20px', flex:1}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>Phi hao cáº¯t = (Chiá»u dài × A × B) + C</div>
                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>A €” mẫu số</span>
                    <input type="number" className="config-inline-input" style={{width:'80px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.cutWasteA ?? 3000}
                      onChange={e => capNhatHangSo('cutWasteA', parseFloat(e.target.value)||3000)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>×</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>B €” hao/A mét</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.cutWasteB ?? 20}
                      onChange={e => capNhatHangSo('cutWasteB', parseFloat(e.target.value)||0)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>+</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>C €” cố định (m)</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.cutWasteC ?? 100}
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
                    <th>Ngưỡng (mÂ²)</th>
                    <th>Há»‡ sá»‘</th>
                    <th>CPSX Cắt thực tế</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Nhá»</td>
                    <td><input type="number" className="config-inline-input" value={hangSo.cutThreshold1} step="0.01" onChange={e => capNhatHangSo('cutThreshold1', parseFloat(e.target.value)||0)} /></td>
                    <td><input type="number" className="config-inline-input" value={hangSo.cutMult1} step="0.1" onChange={e => capNhatHangSo('cutMult1', parseFloat(e.target.value)||0)} /></td>
                    <td className="cut-preview">{(hangSo.cutBase * hangSo.cutMult1).toLocaleString('vi-VN', {maximumFractionDigits:0})}</td>
                  </tr>
                  <tr>
                    <td>Trung bình</td>
                    <td><input type="number" className="config-inline-input" value={hangSo.cutThreshold2} step="0.01" onChange={e => capNhatHangSo('cutThreshold2', parseFloat(e.target.value)||0)} /></td>
                    <td><input type="number" className="config-inline-input" value={hangSo.cutMult2} step="0.1" onChange={e => capNhatHangSo('cutMult2', parseFloat(e.target.value)||0)} /></td>
                    <td className="cut-preview">{(hangSo.cutBase * hangSo.cutMult2).toLocaleString('vi-VN', {maximumFractionDigits:0})}</td>
                  </tr>
                  <tr>
                    <td>Lá»›n</td>
                    <td>€”</td>
                    <td><input type="number" className="config-inline-input" value={hangSo.cutMult3} step="0.1" onChange={e => capNhatHangSo('cutMult3', parseFloat(e.target.value)||0)} /></td>
                    <td className="cut-preview">{(hangSo.cutBase * hangSo.cutMult3).toLocaleString('vi-VN', {maximumFractionDigits:0})}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="config-note">ðŸ’¡ CPSX Cáº¯t = Cáº¯t cÆ¡ báº£n × Há»‡ sá»‘. Ngưỡng dá»±a trÃªn diá»‡n tích túi (mÂ²).</p>
          </div>
          )}
          {/* â•â•â•â•â•â•â•â•â•â•â• NH“M 4: Báº¢NG Lá»¢I NHUáº¬N â•â•â•â•â•â•â•â•â•â•â• */}
          {hienLoiNhuan && <div className="config-group-header" id="sect-config-loinhuan" style={{scrollMarginTop: '80px'}}>ðŸ’° Báº£ng Lá»£i Nhuáº­n</div>}
          {hienLoiNhuan && (
          <div className="card config-card">
            <div className="config-section-title" style={{alignItems: 'center'}}>
              <span>ðŸ“ˆ Tỉ lệ lợi nhuận theo giá vốn</span>
              <div style={{display:'flex', alignItems:'center', gap: '8px'}}>
                <span style={{fontSize:'0.85rem', fontWeight:'normal', color:'var(--muted)'}}>Nhóm Khách hàng:</span>
                <select className="form-select" value={nhomKhachHang} onChange={e => datNhomKhachHang(e.target.value)} style={{width: 'auto', padding: '4px 24px 4px 10px', fontWeight: 'normal', fontSize: '0.85rem'}}>
                  <option value="svlg">Sen Việt và Lương Gia</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>
            <div className="config-table-wrap">
              <table className="config-table" id="bangLoiNhuan">
                <thead>
                  <tr>
                    <th>Tá»«</th>
                    <th>Đáº¿n</th>
                    <th>Con lai (mang in, mang ghep 2 lop, tui 1-2 lop cut seal...)</th>
                    <th>Tui/mang &gt;= 3 lop; tui day dung/zipper; co MPET/AL/giay</th>
                  </tr>
                </thead>
                <tbody>
                  {bangLoiNhuan.map((row, i) => (
                    <tr key={i}>
                      {(() => {
                        const bounds = layBienLoiNhuan(i, row.threshold);
                        return (
                          <>
                            <td>
                              <span style={{fontWeight: 700}}>{dinhDangVnd(bounds.from)}</span>
                            </td>
                            <td>
                              <input className="config-inline-input" type="number" step="1000000"
                                value={row.threshold}
                                onChange={(e) => capNhatNguongLoiNhuan(i, parseFloat(e.target.value) || 0)}
                                style={{width:'130px', textAlign:'right', fontWeight:700}}
                              />
                              <div style={{fontSize:'0.72rem', color:'var(--muted)', marginTop:'2px'}}>&lt; {dinhDangVnd(row.threshold)}</div>
                            </td>
                          </>
                        );
                      })()}
                      <td>
                        <input className="config-inline-input" type="number" step="0.5"
                          value={+((row.col1 + chenhLech) * 100).toFixed(2)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            // Store back: subtract chenhLech
                            const cuaHang = dungCuaHangTinhGia.getState();
                            const bangMoi = [...cuaHang.profitTable];
                            bangMoi[i] = { ...bangMoi[i], col1: (val / 100) - chenhLech };
                            dungCuaHangTinhGia.setState({ profitTable: bangMoi });
                            cuaHang.recalculate();
                            luuBangLoiNhuanTre();
                          }}
                          style={{width:'70px', textAlign:'right'}}
                        /> %
                      </td>
                      <td>
                        <input className="config-inline-input" type="number" step="0.5"
                          value={+((row.col2 + chenhLech) * 100).toFixed(2)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const cuaHang = dungCuaHangTinhGia.getState();
                            const bangMoi = [...cuaHang.profitTable];
                            bangMoi[i] = { ...bangMoi[i], col2: (val / 100) - chenhLech };
                            dungCuaHangTinhGia.setState({ profitTable: bangMoi });
                            cuaHang.recalculate();
                            luuBangLoiNhuanTre();
                          }}
                          style={{width:'70px', textAlign:'right'}}
                        /> %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">ðŸ’¡ Tỉ lệ lợi nhuận tự động tính từ giá vốn. Các con số n y có thá»ƒ chá»‰nh sá»­a và tá»± Đ‘á»™ng lÆ°u.</p>
          </div>
          )}
          {/* â•â•â•â•â•â•â•â•â•â•â• NH“M 5: GIÃ PHá»¤ KIá»†N â•â•â•â•â•â•â•â•â•â•â• */}
          {hienPhuPhi && <div className="config-group-header" id="sect-config-phukien" style={{scrollMarginTop: '80px'}}>ðŸŽ€ Giá Phá»¥ Kiá»‡n</div>}
          {hienPhuPhi && (
          <div className="card config-card">
            <div className="config-section-title"><span>ðŸ’° Cài Đáº·t ĐÆ¡n Giá Phá»¥ Kiá»‡n</span></div>
            <div className="config-table-wrap">
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Phá»¥ kiá»‡n</th>
                    <th>ĐÆ¡n giá</th>
                    <th>Trá»ng lÆ°á»£ng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Zipper</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={hangSo.zipperPrice} onChange={e => capNhatHangSo('zipperPrice', parseFloat(e.target.value)||0)} /> Đ‘/m</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={hangSo.zipperWeight} step="0.1" min="0" onChange={e => capNhatHangSo('zipperWeight', parseFloat(e.target.value)||0)} /> Gr/m</td>
                  </tr>
                  <tr>
                    <td>BĐƒng keo</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={hangSo.tapePrice} onChange={e => capNhatHangSo('tapePrice', parseFloat(e.target.value)||0)} /> Đ‘/m</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={hangSo.tapeWeight} step="0.1" min="0" onChange={e => capNhatHangSo('tapeWeight', parseFloat(e.target.value)||0)} /> Gr/m</td>
                  </tr>
                  {(hangSo.handleOptions ?? []).map(option => (
                    <tr key={option.key}>
                      <td>{option.label}</td>
                      <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={option.price} onChange={e => xuLyDoiLoaiQuai(option.key, 'price', parseFloat(e.target.value)||0)} /> Đ‘/cái</td>
                      <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={option.weight} step="0.1" min="0" onChange={e => xuLyDoiLoaiQuai(option.key, 'weight', parseFloat(e.target.value)||0)} /> Gr/cái</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">ðŸ’¡ ĐÆ¡n giá thay Đ‘á»•i tùy thá»i Đ‘iá»ƒm, tá»± Đ‘á»™ng áp dá»¥ng khi chá»‘t giá cho Đ‘Æ¡n hàng.</p>
          </div>
          )}
          {/* â•â•â•â•â•â•â•â•â•â•â• NH“M 6: Đ“NG G“I THÃ™NG â•â•â•â•â•â•â•â•â•â•â• */}
          {hienGiaCongNgoai && <div className="config-group-header" id="sect-config-donggoi" style={{scrollMarginTop: '80px'}}>ðŸ“¦ Đóng gói thùng</div>}
          {hienGiaCongNgoai && (
          <div className="card config-card">
            <div className="config-section-title"><span>ðŸ“¦ Đá»‹nh má»©c loáº¡i thùng</span></div>
            <div className="config-table-wrap">
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Loại thùng</th>
                    <th>Khá»‘i lÆ°á»£ng (gr/thùng)</th>
                    <th>Giá thùng (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {(hangSo.boxOptions ?? []).map(option => (
                    <tr key={option.key}>
                      <td style={{fontWeight:700}}>{option.label}</td>
                      <td>
                        <input
                          type="number"
                          className="config-inline-input"
                          value={option.weight || 0}
                          onChange={e => xuLyDoiLoaiThung(option.key, 'weight', parseFloat(e.target.value) || 0)}
                          style={{width:'120px', textAlign:'right', fontWeight:700}}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="config-inline-input"
                          value={option.price}
                          onChange={e => xuLyDoiLoaiThung(option.key, 'price', parseFloat(e.target.value) || 0)}
                          style={{width:'120px', textAlign:'right', fontWeight:700}}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">ðŸ’¡ Khi nhập đơn túi, chá»n loáº¡i thùng Đ‘á»ƒ tá»± Đ‘iá»n giá thùng. Sá»‘ túi/thùng do người dùng nhập theo kích thước thực tế của đơn.</p>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

