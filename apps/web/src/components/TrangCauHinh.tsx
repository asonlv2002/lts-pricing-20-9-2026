"use client";
import React from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { ConfigScope } from '../lib/types';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE, INITIAL_SMALL_WIDTH_PRICES } from '../lib/data';

let boDemLuuBangLoiNhuan: ReturnType<typeof setTimeout>;
const luuBangLoiNhuanTre = () => {
  clearTimeout(boDemLuuBangLoiNhuan);
  boDemLuuBangLoiNhuan = setTimeout(() => {
    dungCuaHangTinhGia.getState().recalculate();
  }, 800);
};

const SCOPE_LABEL: Record<ConfigScope, string> = {
  materials:  'vật liệu & giá khổ nhỏ',
  production: 'chi phí sản xuất',
  profit:     'bảng lợi nhuận',
  surcharges: 'phụ phí & phụ kiện',
  interest:   'lãi vay công nợ',
  waste:      'tham số hao hụt',
  outsource:  'gia công ngoài',
};

function KhoiPhienBan({ scope }: { scope: ConfigScope }) {
  const {
    configSnapshots: tatCaPhienBan,
    selectedConfigSnapshotId: phienBanDangChon,
    taoPhienBanDinhMuc,
    xoaPhienBanDinhMuc,
    apDungPhienBanDinhMuc,
  } = dungCuaHangTinhGia();

  const phienBan = tatCaPhienBan.filter(s => (s.scope ?? 'materials') === scope);
  const dangChonId = phienBanDangChon[scope] ?? null;

  const [ten, datTen] = React.useState('');
  const [mocHieuLuc, datMocHieuLuc] = React.useState(() => new Date().toISOString().slice(0, 7));

  const xuLyLuu = () => {
    if (!mocHieuLuc) return;
    taoPhienBanDinhMuc({ scope, name: ten, effectiveMode: 'month', effectiveFrom: mocHieuLuc });
    datTen('');
  };

  const xuLyApDung = (id: string) => {
    const s = tatCaPhienBan.find(x => x.id === id);
    const tenPb = s?.name || 'Không tên';
    const hieuLuc = s ? `${s.effectiveMode === 'month' ? 'Tháng' : 'Ngày'} ${s.effectiveFrom}` : '';
    if (!confirm(`Áp dụng phiên bản "${tenPb}" (${hieuLuc})?\n\nDữ liệu ${SCOPE_LABEL[scope]} hiện tại sẽ bị thay thế.`)) return;
    apDungPhienBanDinhMuc(id);
  };

  const xuLyXoa = (id: string) => {
    if (!confirm('Xóa phiên bản này?')) return;
    xoaPhienBanDinhMuc(id);
  };

  return (
    <div className="card config-card" id={`sect-config-versions-${scope}`} style={{scrollMarginTop: '80px'}}>
      <div className="config-section-title"><span>Phiên bản — {SCOPE_LABEL[scope]}</span></div>
      <div className="config-cpsx-grid" style={{marginBottom: '16px'}}>
        <div className="config-cpsx-item">
          <label>Tên phiên bản</label>
          <input className="form-input" value={ten} placeholder="VD: Tháng 05/2026"
            onChange={e => datTen(e.target.value)} />
        </div>
        <div className="config-cpsx-item">
          <label>Hiệu lực từ</label>
          <input className="form-input" type="month"
            value={mocHieuLuc} onChange={e => datMocHieuLuc(e.target.value)} />
        </div>
        <div className="config-cpsx-item" style={{justifyContent: 'flex-end'}}>
          <button className="btn btn-primary" onClick={xuLyLuu} disabled={!mocHieuLuc}>
            Lưu
          </button>
        </div>
      </div>
      <div className="config-table-wrap">
        <table className="config-table">
          <thead>
            <tr>
              <th>Tên phiên bản</th>
              <th>Hiệu lực</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {phienBan.length === 0 ? (
              <tr>
                <td colSpan={5} style={{textAlign: 'center', color: 'var(--dim)'}}>Chưa có phiên bản nào.</td>
              </tr>
            ) : phienBan.map(snapshot => {
              const dangApDung = dangChonId === snapshot.id;
              return (
                <tr key={snapshot.id} style={dangApDung ? {background: 'var(--accent-subtle, rgba(59,130,246,0.07))'} : undefined}>
                  <td style={{fontWeight: 600}}>{snapshot.name || 'Không tên'}</td>
                  <td>{snapshot.effectiveMode === 'month' ? 'Tháng' : 'Ngày'} {snapshot.effectiveFrom}</td>
                  <td>{new Date(snapshot.createdAt).toLocaleString('vi-VN')}</td>
                  <td>
                    {dangApDung
                      ? <span style={{color: 'var(--accent)', fontWeight: 700, fontSize: '0.82rem'}}>✓ Đang áp dụng</span>
                      : <span style={{color: 'var(--muted)', fontSize: '0.82rem'}}>Đã lưu</span>}
                  </td>
                  <td>
                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                      {!dangApDung && (
                        <button className="btn btn-sm btn-primary" onClick={() => xuLyApDung(snapshot.id)}>Áp dụng</button>
                      )}
                      <button className="btn btn-sm btn-outline" onClick={() => xuLyXoa(snapshot.id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="config-note">Phiên bản lưu {SCOPE_LABEL[scope]} tại thời điểm bấm lưu.</p>
    </div>
  );
}

type NhomCauHinh = 'materials' | 'waste' | 'production' | 'outsource' | 'profit' | 'surcharges' | 'interest' | 'formulas';
const layNhomCauHinh = (menuDangChon?: string): NhomCauHinh => {
  switch (menuDangChon) {
    case 'config.materials':      return 'materials';
    case 'config.waste_norms':    return 'waste';
    case 'config.production_costs': return 'production';
    case 'config.outsource_costs':  return 'outsource';
    case 'config.profit_margin':  return 'profit';
    case 'config.surcharges':     return 'surcharges';
    case 'config.interest':       return 'interest';
    case 'config.formulas':       return 'formulas';
    default:                      return 'materials';
  }
};

export default function TrangCauHinh({ menuDangChon }: { menuDangChon?: string }) {
  const {
    materials: vatLieu,
    constants: hangSo,
    profitTable: bangLoiNhuan,
    smallWidthPrices: bangGiaKhoNho,
    setMaterialParam: capNhatVatLieu,
    setConstantParam: capNhatHangSo,
    setSmallWidthPriceParam: capNhatGiaKhoNho,
    addMaterial: themVatLieu,
    removeMaterial: xoaVatLieu,
  } = dungCuaHangTinhGia();
  const [nhomKhachHang, datNhomKhachHang] = React.useState('other');
  const [hienBangKhoNho, datHienBangKhoNho] = React.useState(false);
  const [ngayCongNoMoi, datNgayCongNoMoi] = React.useState('');
  const customMaterialSeq = React.useRef(0);
  const nhomCauHinh = layNhomCauHinh(menuDangChon);
  const hienVatTu = nhomCauHinh === 'materials';
  const hienHaoHut = nhomCauHinh === 'waste';
  const hienSanXuat = nhomCauHinh === 'production';
  const hienGiaCongNgoai = nhomCauHinh === 'outsource';
  const hienLoiNhuan = nhomCauHinh === 'profit';
  const hienPhuPhi = nhomCauHinh === 'surcharges';
  const hienLaiVay = nhomCauHinh === 'interest';
  const hienCongThuc = nhomCauHinh === 'formulas';
  // anCotCPSX: ẩn cột CPSX khi chỉ xem hao hụt riêng lẻ
  // anCotPhiHao: không dùng nữa (CPSX luôn hiện cả hai cột)
  const anCotCPSX = hienHaoHut && !hienSanXuat && !hienCongThuc;
  const anCotPhiHao = false;
  const tongLaiNam = hangSo.interestBase + hangSo.interestSpread;
  const mocNgayLaiVay = [14, 30, 45, 75, 90, ...(hangSo.customPaymentDays ?? [])].sort((a, b) => a - b);
  const dinhDangTyLeLaiNgay = (days: number) => ((tongLaiNam / 365) * days * 100).toFixed(3);
  const soNgayCongNoMoi = Number(ngayCongNoMoi);
  const hopLeNgayCongNoMoi = Number.isInteger(soNgayCongNoMoi) && soNgayCongNoMoi > 0 && !mocNgayLaiVay.includes(soNgayCongNoMoi);
  const capNhatNgayCongNoMoi = (value: string) => {
    if (/^\d*$/.test(value)) datNgayCongNoMoi(value);
  };
  const themNgayCongNo = () => {
    if (!hopLeNgayCongNoMoi) return;
    capNhatHangSo('customPaymentDays', [...(hangSo.customPaymentDays ?? []), soNgayCongNoMoi]);
    datNgayCongNoMoi('');
  };
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
  const xuLyDoiLoaiThung = (khoa: string, truong: 'price' | 'weight' | 'label', giaTri: number | string) => {
    const cacLoaiThung = (hangSo.boxOptions ?? []).map(option =>
      option.key === khoa ? { ...option, [truong]: giaTri } : option
    );
    capNhatHangSo('boxOptions' as any, cacLoaiThung as any);
  };
  const xuLyDoiLoaiQuai = (khoa: string, truong: 'price' | 'weight' | 'label', giaTri: number | string) => {
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
  const docSoVnd = (value: string) => Number(value.replace(/\D/g, '')) || 0;
  const layBienLoiNhuan = (i: number, nguong: number) => {
    const from = i === 0 ? 0 : (bangLoiNhuan[i - 1]?.threshold ?? 0);
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
  const themMocLoiNhuan = () => {
    const cuaHang = dungCuaHangTinhGia.getState();
    const dongCuoi = cuaHang.profitTable[cuaHang.profitTable.length - 1];
    const mocMoi = (dongCuoi?.threshold ?? 0) + 10000000;
    const bangMoi = [
      ...cuaHang.profitTable,
      {
        threshold: mocMoi,
        col1: dongCuoi?.col1 ?? 0,
        col2: dongCuoi?.col2 ?? 0,
      },
    ];
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
          <KhoiPhienBan scope="materials" />
          {/* 1. B?ng gi? nvl */}
          <div className="card config-card" id="sect-config-nvl" style={{scrollMarginTop: '80px'}}>
            <div className="config-section-title">
              <span>📦 Giá Nguyên Vật Liệu Cập Nhật Hàng Ngày</span>
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
                  <option value="small">Khổ nhỏ</option>
                </select>
                <button className="btn btn-sm btn-outline" onClick={xuLyDatLai}>🔄 Reset mặc định</button>
              </div>
            </div>
            {!hienBangKhoNho ? (
              // Bảng khổ bình thường
              <>
                <div className="config-table-wrap">
                  <table className="config-table" id="materialPriceTable">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Màng</th>
                        <th>Tỉ trọng (g/cm³)</th>
                        <th>Độ dày (mic)</th>
                        <th>Giá (VNĐ/kg)</th>
                        <th>Giá (VNĐ/m²)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vatLieu.map((m, idx) => {
                        const laCustom = m.id.startsWith('custom-');
                        return (
                          <tr key={m.id}>
                            <td style={{textAlign:'center', color:'var(--dim)'}}>{idx + 1}</td>
                            <td style={{fontWeight:600}}>
                              {laCustom
                                ? <input type="text" className="config-inline-input" value={m.name}
                                    onChange={e => capNhatVatLieu(m.id, { name: e.target.value })}
                                    style={{width:'120px', fontWeight:600}} />
                                : m.name}
                            </td>
                            <td>
                              {laCustom
                                ? <input type="number" className="config-inline-input" value={m.density}
                                    onChange={e => capNhatVatLieu(m.id, { density: parseFloat(e.target.value)||0 })}
                                    style={{width:'70px', textAlign:'right'}} />
                                : m.density}
                            </td>
                            <td><input type="number" className="config-inline-input" value={m.thickness} onChange={(e) => capNhatVatLieu(m.id, { thickness: parseFloat(e.target.value)||0 })} style={{width:'80px', textAlign:'right'}} /></td>
                            <td><input type="number" className="config-inline-input" value={m.pricePerKg} onChange={(e) => capNhatVatLieu(m.id, { pricePerKg: parseFloat(e.target.value)||0 })} style={{width:'100px', textAlign:'right', fontWeight:700}} /></td>
                            <td style={{fontWeight:700, color:'var(--accent)'}}>{m.pricePerM2?.toLocaleString('vi-VN', {maximumFractionDigits:0})} đ</td>
                            <td style={{textAlign:'center'}}>
                              {laCustom && (
                                <button className="btn btn-sm" title="Xóa màng này"
                                  style={{color:'var(--danger,#e53e3e)', background:'transparent', border:'none', cursor:'pointer', fontSize:'1rem', padding:'2px 6px'}}
                                  onClick={() => { if (confirm(`Xóa màng "${m.name}"?`)) xoaVatLieu(m.id); }}>
                                  ✕
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={7} style={{paddingTop:'10px', display:'flex', gap:'8px', flexWrap:'wrap'}}>
                          <button className="btn btn-sm btn-outline" onClick={() => {
                            customMaterialSeq.current += 1;
                            const id = `custom-${vatLieu.length}-${customMaterialSeq.current}`;
                            themVatLieu({ id, name: 'Vật liệu mới', group: 'khac', density: 1.0, thickness: 20, pricePerKg: 0, isPETorPA: false, rollLength: 5000, inkPricePerColor: 120 });
                          }}>
                            + Thêm vật liệu khác
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="config-note">Chỉnh <strong>độ dày</strong> và <strong>giá VNĐ/kg</strong> - giá VNĐ/m² tự động tính lại. Thay đổi sẽ áp dụng ngay cho lần tính giá tiếp theo.</p>
              </>
            ) : (
              // Bảng khổ nhỏ
              <>
                <div className="config-table-wrap">
                  <table className="config-table" id="smallWidthPriceTable">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Màng</th>
                        <th>Tỉ trọng (g/cm³)</th>
                        <th>Độ dày (mic)</th>
                        <th>Khổ nhỏ (mm)</th>
                        <th>Giá (VNĐ/kg)</th>
                        <th>Giá (VNĐ/m²)</th>
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
                <p className="config-note">💡 Khi khổ nguyên vật liệu ≤ ngưỡng khổ nhỏ, hệ thống sẽ dùng giá khổ nhỏ thay cho giá thường. Ví dụ: khổ 350mm sẽ dùng giá mốc 400mm nếu có.</p>
              </>
            )}
          </div>
          </>
          )}
          {/* NHOM 1: CHI PHI KHAU IN */}
          {hienSanXuat && <KhoiPhienBan scope="production" />}
          {hienHaoHut && <KhoiPhienBan scope="waste" />}
          {hienPhuPhi && <KhoiPhienBan scope="surcharges" />}
          {hienCongThuc && <KhoiPhienBan scope="production" />}
          {hienCongThuc && <KhoiPhienBan scope="waste" />}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && <div className="config-group-header" id="sect-config-in" style={{scrollMarginTop: '80px'}}>🖨️ CPSX Khâu in</div>}
          {/* 1.2 Bảng giá màu in */}
          {hienSanXuat && (
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
            <p className="config-note">Giá mực in tính trên mỗi màu in. Danh sách loại màng lấy từ bảng Giá Nguyên Vật Liệu; muốn thêm/xóa loại màng, hãy thao tác tại bảng đó. PET/PA mặc định 135đ, các loại khác 120đ.</p>
          </div>
          )}
          {/* 1.3 Công Thức Tính Phi Hao In */}
          {(hienHaoHut || hienSanXuat) && (
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
            <p className="config-note">💡 A, B, C, D là các tham số dùng chung cho mọi số màu in.</p>
          </div>
          )}
          {/* 1.3 Phụ phí nhũ / phủ mờ */}
          {hienSanXuat && (
          <div className="card config-card">
            <div className="config-section-title"><span>✨ Chi Phí Nhũ / Phủ Mờ</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>Giá nhũ (đ)</label>
                <input type="number" className="form-input" value={hangSo.nhuPrice} onChange={e => capNhatHangSo('nhuPrice', parseFloat(e.target.value)||0)} />
              </div>
              <div className="config-cpsx-item">
                <label>Giá phủ mờ (đ)</label>
                <input type="number" className="form-input" value={hangSo.moPrice} onChange={e => capNhatHangSo('moPrice', parseFloat(e.target.value)||0)} />
              </div>
            </div>
            <p className="config-note">💡 Khi tích Nhũ hoặc Phủ mờ ở form nhập liệu, giá trị tương ứng sẽ được cộng vào CPSX in.</p>
          </div>
          )}
          {/* 1.4 CPSX khâu in */}
          {hienSanXuat && (
          <div className="card config-card">
            <div className="config-section-title"><span>🖨️ CPSX Khâu in</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>CPSX khâu in (đ/m²)</label>
                <input type="number" className="form-input" value={hangSo.laborCost} onChange={e => capNhatHangSo('laborCost', parseFloat(e.target.value)||0)} />
              </div>
            </div>
            <p className="config-note">Khoản CPSX cố định cộng vào đơn giá in: CPSX in = giá mực/màu x số màu + CPSX khâu in (+ phụ phí nếu có).</p>
          </div>
          )}
          {hienLaiVay && <KhoiPhienBan scope="interest" />}
          {hienLaiVay && (
          <div className="card config-card">
            <div className="config-section-title"><span>Lãi Vay Công Nợ</span></div>
            <div className="config-cpsx-grid">
              <div className="config-cpsx-item">
                <label>Mức (lãi cơ sở % / năm)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" className="form-input" style={{ width: '100px' }}
                    value={parseFloat((hangSo.interestBase * 100).toFixed(4))}
                    step="0.1" min="0"
                    onChange={e => capNhatHangSo('interestBase', (parseFloat(e.target.value) || 0) / 100)} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>%/năm</span>
                </div>
              </div>
              <div className="config-cpsx-item">
                <label>Thêm (lãi tình huống % / năm)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" className="form-input" style={{ width: '100px' }}
                    value={parseFloat((hangSo.interestSpread * 100).toFixed(4))}
                    step="0.1" min="0"
                    onChange={e => capNhatHangSo('interestSpread', (parseFloat(e.target.value) || 0) / 100)} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>%/năm</span>
                </div>
              </div>
            </div>
            <div className="config-note" style={{marginTop:'12px'}}>
              <div>Tổng lãi = Mức + Thêm = <strong>{(tongLaiNam * 100).toFixed(2)}%/năm</strong>.</div>
              <div style={{marginTop:'10px', border:'1px solid var(--border)', borderRadius:'10px', overflow:'hidden', background:'var(--surface)'}}>
                <div style={{display:'grid', gridTemplateColumns:'72px 1fr 1fr', borderBottom:'1px solid var(--border)', fontWeight:700, color:'var(--muted)', fontSize:'0.78rem'}}>
                  <div style={{padding:'8px 10px'}}></div>
                  <div style={{padding:'8px 10px', textAlign:'center'}}>Ngày công nợ</div>
                  <div style={{padding:'8px 10px', textAlign:'center'}}>Tỷ lệ lãi</div>
                </div>
                {mocNgayLaiVay.map(days => (
                  <div key={days} style={{display:'grid', gridTemplateColumns:'72px 1fr 1fr', borderTop:'1px solid var(--border)'}}>
                    <div style={{padding:'6px 8px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      {(hangSo.customPaymentDays ?? []).includes(days) && (
                        <button className="btn btn-sm" style={{color:'var(--danger)', background:'transparent', border:'none', cursor:'pointer', fontSize:'0.9rem', padding:'2px 6px'}}
                          onClick={() => capNhatHangSo('customPaymentDays', (hangSo.customPaymentDays ?? []).filter(d => d !== days))}>✕</button>
                      )}
                    </div>
                    <div style={{padding:'10px', textAlign:'center', fontWeight:600}}>{days} ngày</div>
                    <div style={{padding:'10px', textAlign:'center', fontSize:'1.05rem', fontWeight:800, color:'var(--accent)'}}>{dinhDangTyLeLaiNgay(days)}%</div>
                  </div>
                ))}
                <div style={{display:'grid', gridTemplateColumns:'72px 1fr 1fr', borderTop:'1px solid var(--border)'}}>
                  <div style={{padding:'6px 8px', display:'flex', alignItems:'center', justifyContent:'flex-start'}}>
                    <button className="btn btn-sm btn-outline" disabled={!hopLeNgayCongNoMoi} onClick={themNgayCongNo}>+ Thêm</button>
                  </div>
                  <div style={{padding:'8px 10px', display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="form-input"
                      placeholder="Số ngày"
                      value={ngayCongNoMoi}
                      onChange={e => capNhatNgayCongNoMoi(e.target.value)}
                      onKeyDown={e => {
                        if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                        if (e.key === 'Enter') themNgayCongNo();
                      }}
                      style={{width:'110px', textAlign:'center'}}
                    />
                  </div>
                  <div style={{padding:'10px', textAlign:'center', fontSize:'1.05rem', fontWeight:800, color:'var(--accent)'}}>
                    {hopLeNgayCongNoMoi ? `${dinhDangTyLeLaiNgay(soNgayCongNoMoi)}%` : '--'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
          {/* NHOM 2: CHI PHI KHAU GHEP */}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && <div className="config-group-header" id="sect-config-ghep" style={{scrollMarginTop: '80px'}}>🔗 CPSX Khâu Ghép</div>}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && (
          <div className="card config-card">
            <div style={{display:'flex', alignItems:'stretch', gap:'0'}}>
              {/* Cột trái: CPSX Ghép */}
              <div style={{padding:'12px 20px 12px 0', minWidth:'180px', borderRight:'2px solid var(--border)', display: anCotCPSX ? 'none' : undefined}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>CPSX ghép (đ/m²)</div>
                <input type="number" className="form-input" value={hangSo.ghepCPSX} onChange={e => capNhatHangSo('ghepCPSX', parseFloat(e.target.value)||0)} style={{width:'130px'}} />
              </div>
              {/* Cột phải: Phi hao */}
              <div style={{padding:'12px 0 12px 20px', flex:1, display: anCotPhiHao ? 'none' : undefined}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>Phi hao ghép = (Chiều dài × A × B) + C</div>
                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>A - mẫu số</span>
                    <input type="number" className="config-inline-input" style={{width:'80px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.ghepWasteA ?? 3000}
                      onChange={e => capNhatHangSo('ghepWasteA', parseFloat(e.target.value)||3000)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>×</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>B - hao/A mét</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.ghepWasteB ?? 20}
                      onChange={e => capNhatHangSo('ghepWasteB', parseFloat(e.target.value)||0)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>+</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>C - cố định (m)</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.ghepWasteC ?? 100}
                      onChange={e => capNhatHangSo('ghepWasteC', parseFloat(e.target.value)||0)} />
                  </div>
                </div>
              </div>
            </div>
            <p className="config-note" style={{marginTop:'8px'}}>💡 Chi phí sản xuất ghép tính trên mỗi m² màng. Phi hao = (Tp ghép × A × B) + C.</p>
          </div>
          )}
          {/* NHOM 3: CHI PHI KHAU CAT */}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && <div className="config-group-header" id="sect-config-cat" style={{scrollMarginTop: '80px'}}>✂️ CPSX Khâu Cắt</div>}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && (
          <div className="card config-card">
            <div style={{display:'flex', alignItems:'stretch', gap:'0'}}>
              {/* Cột trái: CPSX Cắt cơ bản */}
              <div style={{padding:'12px 20px 12px 0', minWidth:'180px', borderRight:'2px solid var(--border)', display: anCotCPSX ? 'none' : undefined}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>CPSX cắt cơ bản (đ)</div>
                <input type="number" className="form-input" value={hangSo.cutBase} onChange={e => capNhatHangSo('cutBase', parseFloat(e.target.value)||0)} style={{width:'130px'}} />
              </div>
              {/* Cột phải: Phi hao cắt */}
              <div style={{padding:'12px 0 12px 20px', flex:1, display: anCotPhiHao ? 'none' : undefined}}>
                <div style={{fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px'}}>Phi hao cắt = (Chiều dài × A × B) + C</div>
                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>A - mẫu số</span>
                    <input type="number" className="config-inline-input" style={{width:'80px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.cutWasteA ?? 3000}
                      onChange={e => capNhatHangSo('cutWasteA', parseFloat(e.target.value)||3000)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>×</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>B - hao/A mét</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.cutWasteB ?? 20}
                      onChange={e => capNhatHangSo('cutWasteB', parseFloat(e.target.value)||0)} />
                  </div>
                  <span style={{color:'var(--muted)', fontSize:'1.1rem', marginTop:'16px'}}>+</span>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
                    <span style={{fontSize:'0.75rem', color:'var(--muted)'}}>C - cố định (m)</span>
                    <input type="number" className="config-inline-input" style={{width:'70px', fontWeight:700, textAlign:'center'}}
                      value={hangSo.cutWasteC ?? 100}
                      onChange={e => capNhatHangSo('cutWasteC', parseFloat(e.target.value)||0)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="config-table-wrap" style={{marginTop:'12px', display: anCotCPSX ? 'none' : undefined}}>
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
                    <td>Lớn</td>
                    <td>-</td>
                    <td><input type="number" className="config-inline-input" value={hangSo.cutMult3} step="0.1" onChange={e => capNhatHangSo('cutMult3', parseFloat(e.target.value)||0)} /></td>
                    <td className="cut-preview">{(hangSo.cutBase * hangSo.cutMult3).toLocaleString('vi-VN', {maximumFractionDigits:0})}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="config-note">💡 CPSX Cắt = Cắt cơ bản × Hệ số. Ngưỡng dựa trên diện tích túi (m²).</p>
          </div>
          )}
          {hienLoiNhuan && <KhoiPhienBan scope="profit" />}
          {/* NHOM 4: BANG LOI NHUAN */}
          {hienLoiNhuan && <div className="config-group-header" id="sect-config-loinhuan" style={{scrollMarginTop: '80px'}}>💰 Bảng Lợi Nhuận</div>}
          {hienLoiNhuan && (
          <div className="card config-card">
            <div className="config-section-title" style={{alignItems: 'center'}}>
              <span>📈 Tỉ lệ lợi nhuận theo giá vốn</span>
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
                    <th>Từ</th>
                    <th>Đến</th>
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
                              <input className="config-inline-input" type="text" inputMode="numeric"
                                value={dinhDangVnd(row.threshold)}
                                onChange={(e) => capNhatNguongLoiNhuan(i, docSoVnd(e.target.value))}
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
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{paddingTop:'10px', textAlign:'left'}}>
                      <button className="btn btn-sm btn-outline" onClick={themMocLoiNhuan}>
                        + Thêm mốc lợi nhuận
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="config-note">Tỉ lệ lợi nhuận tự động tính từ giá vốn. Các con số này có thể chỉnh sửa và tự động lưu.</p>
          </div>
          )}
          {/* NHOM 5: GIA PHU KIEN */}
          {hienPhuPhi && (
          <div className="card config-card">
            <div className="config-section-title"><span>🖨️ Đơn Giá Trục In</span></div>
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
              {(hangSo.customCylTypes ?? []).map((cyl, idx) => (
                <div className="cylinder-price-row" key={cyl.key}>
                  <div><input type="text" className="config-inline-input" value={cyl.label} style={{width:'100px', fontWeight:600}}
                    onChange={e => { const arr = [...(hangSo.customCylTypes ?? [])]; arr[idx] = {...cyl, label: e.target.value}; capNhatHangSo('customCylTypes', arr); }} /></div>
                  <div className="cylinder-price-input">
                    <input type="number" className="form-input" value={cyl.price} step="100000" min="0"
                      onChange={e => { const arr = [...(hangSo.customCylTypes ?? [])]; arr[idx] = {...cyl, price: parseFloat(e.target.value)||0}; capNhatHangSo('customCylTypes', arr); }} />
                    <span>đ/m²</span>
                    <button className="btn btn-sm" style={{color:'var(--danger)', background:'transparent', border:'none', cursor:'pointer', fontSize:'1rem', padding:'2px 6px'}}
                      onClick={() => { const arr = (hangSo.customCylTypes ?? []).filter((_,i) => i !== idx); capNhatHangSo('customCylTypes', arr); }}>✕</button>
                  </div>
                </div>
              ))}
              <div style={{marginTop: 8}}>
                <button className="btn btn-sm btn-outline" onClick={() => {
                  const arr = [...(hangSo.customCylTypes ?? [])];
                  const key = `cyl-${Date.now()}`;
                  arr.push({ key, label: `Trục ${String.fromCharCode(67 + arr.length)}`, price: 6000000 });
                  capNhatHangSo('customCylTypes', arr);
                }}>+ Thêm loại trục</button>
              </div>
            </div>
          </div>
          )}
          {hienPhuPhi && <div className="config-group-header" id="sect-config-phukien" style={{scrollMarginTop: '80px'}}>🎀 Giá Phụ Kiện</div>}
          {hienPhuPhi && (
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
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={hangSo.zipperPrice} onChange={e => capNhatHangSo('zipperPrice', parseFloat(e.target.value)||0)} /> đ/m</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={hangSo.zipperWeight} step="0.1" min="0" onChange={e => capNhatHangSo('zipperWeight', parseFloat(e.target.value)||0)} /> Gr/m</td>
                  </tr>
                  <tr>
                    <td>Băng keo</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={hangSo.tapePrice} onChange={e => capNhatHangSo('tapePrice', parseFloat(e.target.value)||0)} /> đ/m</td>
                    <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={hangSo.tapeWeight} step="0.1" min="0" onChange={e => capNhatHangSo('tapeWeight', parseFloat(e.target.value)||0)} /> Gr/m</td>
                  </tr>
                  {(hangSo.handleOptions ?? []).map(option => (
                    <tr key={option.key}>
                      <td>
                        {option.key.startsWith('custom-')
                          ? <input type="text" className="config-inline-input" value={option.label} style={{width:'100px', fontWeight:600}} onChange={e => xuLyDoiLoaiQuai(option.key, 'label', e.target.value)} />
                          : option.label}
                      </td>
                      <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={option.price} onChange={e => xuLyDoiLoaiQuai(option.key, 'price', parseFloat(e.target.value)||0)} /> đ/cái</td>
                      <td>
                        <input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={option.weight} step="0.1" min="0" onChange={e => xuLyDoiLoaiQuai(option.key, 'weight', parseFloat(e.target.value)||0)} /> Gr/cái
                        {option.key.startsWith('custom-') && <button className="btn btn-sm" style={{color:'var(--danger)', background:'transparent', border:'none', cursor:'pointer', marginLeft:4}} onClick={() => {
                          const arr = (hangSo.handleOptions ?? []).filter(o => o.key !== option.key);
                          capNhatHangSo('handleOptions', arr);
                        }}>✕</button>}
                      </td>
                    </tr>
                  ))}
                  {(hangSo.customAccessories ?? []).map((acc, idx) => (
                    <tr key={acc.key}>
                      <td><input type="text" className="config-inline-input" value={acc.label} style={{width:'100px', fontWeight:600}} onChange={e => {
                        const arr = [...(hangSo.customAccessories ?? [])]; arr[idx] = {...acc, label: e.target.value}; capNhatHangSo('customAccessories', arr);
                      }} /></td>
                      <td><input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={acc.price} onChange={e => {
                        const arr = [...(hangSo.customAccessories ?? [])]; arr[idx] = {...acc, price: parseFloat(e.target.value)||0}; capNhatHangSo('customAccessories', arr);
                      }} /> {acc.unit === 'per_meter' ? 'đ/m' : 'đ/cái'}</td>
                      <td>
                        <input type="number" className="config-inline-input" style={{width:'80px',textAlign:'right',fontWeight:700, background:'transparent'}} value={acc.weight} step="0.1" min="0" onChange={e => {
                          const arr = [...(hangSo.customAccessories ?? [])]; arr[idx] = {...acc, weight: parseFloat(e.target.value)||0}; capNhatHangSo('customAccessories', arr);
                        }} /> {acc.unit === 'per_meter' ? 'Gr/m' : 'Gr/cái'}
                        <button className="btn btn-sm" style={{color:'var(--danger)', background:'transparent', border:'none', cursor:'pointer', marginLeft:4}} onClick={() => {
                          const arr = (hangSo.customAccessories ?? []).filter((_,i) => i !== idx); capNhatHangSo('customAccessories', arr);
                        }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">Đơn giá thay đổi tùy thời điểm, tự động áp dụng khi chốt giá cho đơn hàng.</p>
          </div>
          )}
          {/* NHOM 6: DONG GOI THUNG */}
          {hienPhuPhi && <div className="config-group-header" id="sect-config-donggoi" style={{scrollMarginTop: '80px'}}>📦 Đóng gói thùng</div>}
          {hienPhuPhi && (
          <div className="card config-card">
            <div className="config-section-title"><span>📦 Định mức loại thùng</span></div>
            <div className="config-table-wrap">
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Loại thùng</th>
                    <th>Khối lượng (gr/thùng)</th>
                    <th>Giá thùng (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {(hangSo.boxOptions ?? []).map(option => (
                    <tr key={option.key}>
                      <td style={{fontWeight:700}}>
                        {option.key.startsWith('custom-')
                          ? <input type="text" className="config-inline-input" value={option.label} style={{width:'120px', fontWeight:700}} onChange={e => xuLyDoiLoaiThung(option.key, 'label', e.target.value)} />
                          : option.label}
                      </td>
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
                        {option.key.startsWith('custom-') && <button className="btn btn-sm" style={{color:'var(--danger)', background:'transparent', border:'none', cursor:'pointer', marginLeft:4}} onClick={() => {
                          const arr = (hangSo.boxOptions ?? []).filter(o => o.key !== option.key);
                          capNhatHangSo('boxOptions', arr);
                        }}>✕</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} style={{paddingTop:10, textAlign:'left'}}>
                    <button className="btn btn-sm btn-outline" onClick={() => {
                      const arr = [...(hangSo.boxOptions ?? [])];
                      arr.push({ key: `custom-${Date.now()}`, label: 'Thùng mới', price: 0, weight: 0 });
                      capNhatHangSo('boxOptions', arr);
                    }}>+ Thêm loại thùng</button>
                  </td></tr>
                </tfoot>
              </table>
            </div>
            <p className="config-note">Khi nhập đơn túi, chọn loại thùng để tự điền giá thùng. Số túi/thùng do người dùng nhập theo kích thước thực tế của đơn.</p>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
