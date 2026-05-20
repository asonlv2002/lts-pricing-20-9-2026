"use client";
import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';

// --- FORMAT NUMBER INPUT ---
const ONhapSoDinhDang = ({ value, onChange, placeholder, min, step, className }: any) => {
  const [dangNhap, datDangNhap] = React.useState(false);
  const [giaTriNoiBo, datGiaTriNoiBo] = React.useState('');

  React.useEffect(() => {
    if (!dangNhap) {
      if (value === 0) datGiaTriNoiBo('');
      else {
        const chuoiGiaTri = value.toString();
        if (chuoiGiaTri.includes('.')) datGiaTriNoiBo(chuoiGiaTri);
        else datGiaTriNoiBo(chuoiGiaTri.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
      }
    }
  }, [value, dangNhap]);

  const xuLyThayDoi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phanThoStr = e.target.value;
    const coDauPhayThapPhan = phanThoStr.includes(',');

    // If user enters decimal with comma, keep decimal behavior.
    if (coDauPhayThapPhan) {
      const daChuanHoa = phanThoStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
      const soDauCham = (daChuanHoa.match(/\./g) || []).length;
      if (soDauCham > 1) return;
      datGiaTriNoiBo(phanThoStr);
      const soThapPhan = parseFloat(daChuanHoa);
      if (!isNaN(soThapPhan)) onChange(soThapPhan);
      if (daChuanHoa === '' || daChuanHoa === '.') onChange(0);
      return;
    }

    // Default VN number mode: dots are thousand separators, not decimals.
    const phanTho = phanThoStr.replace(/[^0-9]/g, '');
    if (phanTho === '') {
      datGiaTriNoiBo('');
      onChange(0);
      return;
    }
    datGiaTriNoiBo(phanTho.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
    onChange(parseFloat(phanTho));
  };

  return <input type="text" inputMode="numeric" className={className} placeholder={placeholder} min={min} step={step}
    value={giaTriNoiBo}
    onFocus={() => datDangNhap(true)}
    onBlur={() => datDangNhap(false)}
    onChange={xuLyThayDoi} />;
};

// --- DECIMAL INPUT ---
const ONhapSoThapPhan = ({ value, onChange, placeholder, min, step, className, disabled, style }: any) => {
  const [giaTriNoiBo, datGiaTriNoiBo] = React.useState(value === 0 ? '' : value.toString());
  const [dangNhap, datDangNhap] = React.useState(false);

  React.useEffect(() => {
    if (!dangNhap) {
      datGiaTriNoiBo(value === 0 ? '' : value.toString());
    }
  }, [value, dangNhap]);

  const xuLyThayDoi = (e: React.ChangeEvent<HTMLInputElement>) => {
    let phanTho = e.target.value.replace(',', '.');
    phanTho = phanTho.replace(/[^0-9.]/g, '');

    const soDauCham = (phanTho.match(/\./g) || []).length;
    if (soDauCham > 1) return;

    datGiaTriNoiBo(phanTho);

    if (phanTho === '' || phanTho === '.') {
      onChange(0);
      return;
    }
    const soDaDoc = parseFloat(phanTho);
    if (!isNaN(soDaDoc)) {
      onChange(soDaDoc);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      min={min}
      step={step}
      value={giaTriNoiBo}
      onChange={xuLyThayDoi}
      onFocus={() => datDangNhap(true)}
      onBlur={() => datDangNhap(false)}
      disabled={disabled}
      style={style}
    />
  );
};

export default function TheNhapLieu() {
  const { input, setInput: capNhatDauVao, materials, constants, advancedOpen, setAdvancedOpen: datMoRongNangCao, result, resetInput: datLaiDauVao, addCurrentToHistory: themVaoLichSu, optimizeCurrentThickness } = dungCuaHangTinhGia();
  const [nhomTheoLop, datNhomTheoLop] = React.useState<Record<string, string>>({});

  const xuLyLoaiSanPham = (val: string) => {
    capNhatDauVao({ productType: val, bagType: '', filmType: '' });
  };

  const xuLyDoiLop = (khoaLop: string, val: string) => {
    const phanCapNhat: any = { [khoaLop]: val || null };
    if (khoaLop === 'layer2Id' && !val) {
      phanCapNhat.layer2AltId = null;
      phanCapNhat.layer2Lengths = undefined;
    }
    if (khoaLop === 'layer2Id' && val && input.layer2AltId) {
      const vatLieuMoi = materials.find(m => m.id === val);
      const vatLieuPhu = materials.find(m => m.id === input.layer2AltId);
      if (vatLieuMoi && vatLieuPhu && vatLieuMoi.thickness !== vatLieuPhu.thickness) {
        phanCapNhat.layer2AltId = null;
        phanCapNhat.layer2Lengths = undefined;
      }
    }
    if (!val) {
      if (khoaLop === 'layer1Id') { phanCapNhat.layer2Id = null; phanCapNhat.layer3Id = null; phanCapNhat.layer4Id = null; phanCapNhat.layer5Id = null; }
      if (khoaLop === 'layer2Id') { phanCapNhat.layer3Id = null; phanCapNhat.layer4Id = null; phanCapNhat.layer5Id = null; }
      if (khoaLop === 'layer3Id') { phanCapNhat.layer4Id = null; phanCapNhat.layer5Id = null; }
      if (khoaLop === 'layer4Id') { phanCapNhat.layer5Id = null; }
    }
    const ghiDeMicMoi = { ...input.micOverrides };
    delete ghiDeMicMoi[khoaLop];
    if (khoaLop === 'layer2Id' && !val) delete ghiDeMicMoi.layer2AltId;
    phanCapNhat.micOverrides = ghiDeMicMoi;

    capNhatDauVao(phanCapNhat);
  };

  const xuLyChonVatLieuChinh = (khoaLop: string, val: string) => {
    if (val.startsWith('GROUP_')) {
      const tenNhom = val.replace('GROUP_', '');
      datNhomTheoLop(mucTruoc => ({ ...mucTruoc, [khoaLop]: val }));

      const vatLieuMacDinh = materials
        .filter(m => m.group === tenNhom)
        .sort((a, b) => a.thickness - b.thickness)[0];
      xuLyDoiLop(khoaLop, vatLieuMacDinh?.id || '');
    } else {
      datNhomTheoLop(mucTruoc => ({ ...mucTruoc, [khoaLop]: '' }));
      xuLyDoiLop(khoaLop, val);
    }
  };

  const xuLyGhiDeMic = (khoaLop: string, val: number) => {
    capNhatDauVao({ micOverrides: { ...input.micOverrides, [khoaLop]: val } });
  };


  const layPhanBoLop2 = () => {
    const vatLieuChinh = materials.find(m => m.id === input.layer2Id);
    const vatLieuPhu = materials.find(m => m.id === (input as any).layer2AltId);
    const doDaiLop2 = (input as any).layer2Lengths || { mat1: 0, mat2: 0 };
    if (!vatLieuChinh || !vatLieuPhu) return [];

    const kieuGhep = (input as any).layer2PairingMode || 'bottom_to_bottom';
    const khoChinh = Math.max(doDaiLop2.mat1 || 0, 0);
    const khoPhu = Math.max(doDaiLop2.mat2 || 0, 0);
    const laHaiHinh = (input.numImages || 1) >= 2;
    const bienMoiMep = laHaiHinh ? 0.01 : 0;

    const phanTho = !laHaiHinh
      ? (kieuGhep === 'front_to_front'
          ? [
              { vatLieu: vatLieuPhu, width: khoPhu, source: 'alt' },
              { vatLieu: vatLieuChinh, width: khoChinh, source: 'main' },
            ]
          : [
              { vatLieu: vatLieuChinh, width: khoChinh, source: 'main' },
              { vatLieu: vatLieuPhu, width: khoPhu, source: 'alt' },
            ])
      : (kieuGhep === 'front_to_front'
          ? [
              { vatLieu: vatLieuPhu, width: khoPhu + bienMoiMep, source: 'alt' },
              { vatLieu: vatLieuChinh, width: khoChinh, source: 'main' },
              { vatLieu: vatLieuChinh, width: khoChinh, source: 'main' },
              { vatLieu: vatLieuPhu, width: khoPhu + bienMoiMep, source: 'alt' },
            ]
          : [
              { vatLieu: vatLieuChinh, width: khoChinh + bienMoiMep, source: 'main' },
              { vatLieu: vatLieuPhu, width: khoPhu, source: 'alt' },
              { vatLieu: vatLieuPhu, width: khoPhu, source: 'alt' },
              { vatLieu: vatLieuChinh, width: khoChinh + bienMoiMep, source: 'main' },
            ]);

    return phanTho.reduce((cacPhan: any[], muc) => {
      const mucTruoc = cacPhan[cacPhan.length - 1];
      if (mucTruoc && mucTruoc.source === muc.source && mucTruoc.vatLieu.id === muc.vatLieu.id) {
        mucTruoc.width += muc.width;
      } else {
        cacPhan.push({ ...muc });
      }
      return cacPhan;
    }, []);
  };

  const hienThiChonLop = (label: string, khoaLop: keyof Pick<typeof input, 'layer1Id' | 'layer2Id' | 'layer3Id' | 'layer4Id' | 'layer5Id'>, disabled: boolean) => {
    const maVatLieu = input[khoaLop] as string | null | undefined;
    const vatLieu = materials.find(m => m.id === maVatLieu);

    const nhomHienTai = nhomTheoLop[khoaLop] || (vatLieu?.group && vatLieu.group !== 'LLDPE' ? `GROUP_${vatLieu.group}` : '');
    const giaTriChinh = nhomHienTai || maVatLieu || '';

    const luaChonLe = materials.filter(m => !m.group || m.group === 'LLDPE');
    const tenCacNhom = Array.from(new Set(materials.filter(m => m.group && m.group !== 'LLDPE').map(m => m.group as string)));

    return (
      <div className="form-group">
        <label className="form-label">{label}</label>
        <select className="form-select" value={giaTriChinh} onChange={e => xuLyChonVatLieuChinh(khoaLop, e.target.value)} disabled={disabled}>
          <option value="">{disabled || khoaLop !== 'layer1Id' ? 'Không' : 'Chọn'}</option>
          {luaChonLe.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          {tenCacNhom.map(g => <option key={g} value={`GROUP_${g}`}>{g}</option>)}
        </select>

        {nhomHienTai && nhomHienTai.startsWith('GROUP_') && (
          <div className="mic-adjust" style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Độ dày (mic)</label>
            <select className="form-select" value={maVatLieu || ''} onChange={e => xuLyDoiLop(khoaLop, e.target.value)}>
              <option value="">Chọn độ dày</option>
              {materials.filter(m => m.group === nhomHienTai.replace('GROUP_', '')).map(m => (
                <option key={m.id} value={m.id}>{m.thickness}</option>
              ))}
            </select>
          </div>
        )}

        {vatLieu && vatLieu.adjustableMic && (
          <div className="mic-adjust" style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Độ dày tuỳ chỉnh (mic)</label>
            <ONhapSoThapPhan className="form-input"
              value={(input.micOverrides && input.micOverrides[khoaLop]) || vatLieu.thickness}
              onChange={(val: number) => xuLyGhiDeMic(khoaLop, val)} />
          </div>
        )}
      </div>
    );
  };

  const GoiYHoaHong = () => {
    const { result, input: dauVaoCuaHang } = dungCuaHangTinhGia.getState();
    const val = input.commissionInputValue || 0;
    if (!result || !val) return <div className="commission-hint"></div>;
    const nhanDonVi = dauVaoCuaHang.productType === 'mang' ? 'm²' : 'túi';
    if (input.commissionUnit === 'percent') {
      const vndPerUnit = (val / 100) * result.costPerUnit;
      return <div className="commission-hint">= {vndPerUnit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} đ/{nhanDonVi}</div>;
    } else {
      const pct = result.costPerUnit > 0 ? (val / result.costPerUnit * 100) : 0;
      return <div className="commission-hint">= {pct.toFixed(2)}% (trên giá vốn+LN)</div>;
    }
  };

  const xuLyDoiHoaHong = (val: number, unit: 'percent' | 'vnd') => {
    capNhatDauVao({
      commissionInputValue: val,
      commissionUnit: unit,
      commissionRate: unit === 'percent' ? val / 100 : 0,
      commissionFixedVND: unit === 'vnd' ? val : 0
    });
  };

  const xuLyDoiLoaiThung = (key: string) => {
    if (key === 'custom' || key === '') {
      capNhatDauVao({ boxOptionKey: key === 'custom' ? 'custom' : null });
      return;
    }

    const daChon = constants.boxOptions?.find(option => option.key === key);
    if (!daChon) return;
    capNhatDauVao({
      boxOptionKey: daChon.key,
      boxPrice: daChon.price,
      boxWeight: daChon.weight || 0,
    });
  };

  const xuLyGhiDeThung = (field: 'bagsPerBox' | 'boxPrice' | 'boxWeight', val: number) => {
    capNhatDauVao({ [field]: val } as any);
  };

  const XemTruocCauTruc = () => {
    const layLop = (id: string | null | undefined) => materials.find(m => m.id === id);
    const cacLop = [
      { vatLieu: layLop(input.layer1Id), override: input.micOverrides?.layer1Id },
      { vatLieu: layLop(input.layer2Id), override: input.micOverrides?.layer2Id, alt: layLop((input as any).layer2AltId), altOverride: input.micOverrides?.layer2AltId },
      { vatLieu: layLop(input.layer3Id), override: input.micOverrides?.layer3Id },
      { vatLieu: layLop(input.layer4Id), override: input.micOverrides?.layer4Id },
      { vatLieu: layLop(input.layer5Id), override: input.micOverrides?.layer5Id }
    ].filter(l => l.vatLieu);

    if (cacLop.length === 0) {
      return (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', height: '42px' }}>
          <div style={{ flex: 1, background: 'linear-gradient(135deg, #94a3b8, #cbd5e1)', opacity: 0.35, borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>—</div>
          </div>
        </div>
      );
    }

    const tongMicVatLieu = cacLop.reduce((s, l: any) => s + Math.max(l.override || l.vatLieu!.thickness, l.alt ? (l.altOverride || l.alt.thickness) : 0), 0);
    const micKeo = (cacLop.length - 1) * 3;
    const tongMic = tongMicVatLieu + micKeo;
    const mucTieu = input.targetThickness || 0;
    const ngoaiKhoang = mucTieu > 0 && (tongMic < mucTieu - 5 || tongMic > mucTieu + 5);

    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {cacLop.map((l, i) => (
            <React.Fragment key={i}>
              <div style={{ flex: 1, minWidth: '40px', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '6px 4px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text)' }}>{l.vatLieu!.name.split(' ')[0]}{(l as any).alt ? ` + ${(l as any).alt.name.split(' ')[0]}` : ''}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{Math.max(l.override || l.vatLieu!.thickness, (l as any).alt ? ((l as any).altOverride || (l as any).alt.thickness) : 0)}mic</div>
              </div>
              {i < cacLop.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.7 }}>3mic</div>
              )}
            </React.Fragment>
          ))}
        </div>
        {cacLop.length > 0 && (
          <div style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
            Tổng: <strong>{tongMic}</strong> mic (vật liệu {tongMicVatLieu} + keo {micKeo})
            {mucTieu > 0 && <span> — Mục tiêu: {mucTieu} mic (±5)</span>}
          </div>
        )}
        {ngoaiKhoang && (
          <div style={{ fontSize: '0.75rem', marginTop: '4px', padding: '6px 10px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '4px', color: '#dc2626' }}>
            Tổng độ dày {tongMic} mic nằm ngoài khoảng [{mucTieu - 5}, {mucTieu + 5}]. Vui lòng điều chỉnh lớp vật liệu.
          </div>
        )}
      </div>
    );
  };

  const soNgayThanhToanHienTai = input.paymentDays || 30;
  const laNhapMangTheoMet = input.productType === 'mang' && (input.filmQuantityUnit || 'm2') === 'meter';
  const slMangGoc = input.filmInputQuantity ?? input.quantity ?? 0;
  const dienTichMangQuyDoi = laNhapMangTheoMet ? slMangGoc * (input.spreadWidth || 0) : (input.quantity || 0);
  const soCuonMangQuyDoi = ((input.filmRollLength || 6000) > 0 && (input.spreadWidth || 0) > 0)
    ? dienTichMangQuyDoi / ((input.filmRollLength || 6000) * (input.spreadWidth || 0))
    : 0;
  const hienCauTruc =
    (input.productType === 'tui' && !!input.bagType) ||
    (input.productType === 'mang' && !!input.filmType);

  const xuLySaoChep = async () => {
    if (!result) {
      alert('Chưa có kết quả để copy.');
      return;
    }
    const laMang = result.input.productType === 'mang';
    const dinhDangPhanTram = (n: number) => parseFloat((n * 100).toFixed(2)) + '%';
    const chieuDaiCuon = (result.input as any).filmRollLength || 6000;
    const text = [
      `${result.input.customer || 'N/A'} — ${result.input.productName || 'N/A'}`,
      `Cấu trúc: ${result.structureText} | Độ dày: ${result.totalThickness}mic`,
      laMang
        ? `Diện tích: ${result.input.quantity.toLocaleString('vi-VN')} m² | KT: ${+(result.input.spreadWidth * 1000).toFixed(0)}×${+(result.input.cutStep * 1000).toFixed(0)} mm² | Cuộn: ${chieuDaiCuon.toLocaleString('vi-VN')}m/cuộn`
        : `SL: ${result.input.quantity.toLocaleString('vi-VN')} túi | KT: ${+(result.input.spreadWidth * 1000).toFixed(0)}×${+(result.input.cutStep * 1000).toFixed(0)} mm²`,
      laMang
        ? `GIÁ ĐỀ XUẤT: ${Math.round(result.finalPrice).toLocaleString('vi-VN')} đ/m² (chưa VAT)`
        : `GIÁ ĐỀ XUẤT: ${Math.round(result.finalPrice).toLocaleString('vi-VN')} đ/túi (chưa VAT)`,
      `Giá vốn: ${result.costPerUnit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} | LN: ${dinhDangPhanTram(result.profitRate)} | DT: ${(result.revenue / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`,
      `Trục in: ${(result.cylinderCost / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr (riêng)`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
  };

  const xuLyDatLai = () => {
    datNhomTheoLop({});
    datLaiDauVao();
  };

  return (
    <div className="card input-form-card" style={{ position: 'sticky', top: '64px' }}>
      <div className="auto-calc-badge"><div className="pulse-dot"></div> Tự động tính khi thay đổi</div>
      <div className="card-title"><span className="icon">📝</span> Thông tin đơn hàng</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Khách hàng</label>
          <input className="form-input" placeholder="Tên khách hàng" value={input.customer} onChange={e => capNhatDauVao({ customer: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tên hàng</label>
          <input className="form-input" placeholder="Tên sản phẩm" value={input.productName} onChange={e => capNhatDauVao({ productName: e.target.value })} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Loại sản phẩm</label>
          <select className="form-select" value={input.productType} onChange={e => xuLyLoaiSanPham(e.target.value)}>
            <option value="">Chọn</option>
            <option value="tui">Túi</option>
            <option value="mang">Màng</option>
          </select>
        </div>
        {input.productType === 'tui' && (
          <div className="form-group">
            <label className="form-label">Loại túi</label>
            <select className="form-select" value={input.bagType} onChange={e => capNhatDauVao({ bagType: e.target.value })}>
              <option value="">Chọn</option>
              <option value="3bien">3 biên</option>
              <option value="4bien">4 biên</option>
              <option value="xephong_lech">Xếp hông dán lưng lệch</option>
              <option value="xephong_giua">Xếp hông dán lưng giữa</option>
              <option value="dayDung">Đáy đứng</option>
              <option value="cutSeal">Cut seal</option>
            </select>
          </div>
        )}
        {input.productType === 'mang' && (
          <div className="form-group">
            <label className="form-label">Loại màng</label>
            <select
              className="form-select"
              value={input.filmType}
              onChange={e => {
                const filmType = e.target.value;
                capNhatDauVao({
                  filmType,
                  ...(filmType === 'mangIn' ? {
                    layer2Id: null,
                    layer2AltId: null,
                    layer2Lengths: undefined,
                    layer3Id: null,
                    layer4Id: null,
                    layer5Id: null,
                  } : {}),
                } as any);
              }}
            >
              <option value="">Chọn</option>
              <option value="mangIn">Màng in</option>
              <option value="mangGhep">Màng ghép</option>
              <option value="mangDongGoi">Màng đóng gói tự động</option>
            </select>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">{input.productType === 'mang' ? 'Số lượng màng' : 'Số lượng'}</label>
        {input.productType === 'mang' ? (
          <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ONhapSoDinhDang className="form-input" value={slMangGoc || 0} onChange={(val: number) => capNhatDauVao({ filmInputQuantity: val } as any)} />
              <select className="form-select" style={{ width: '110px' }} value={input.filmQuantityUnit || 'm2'} onChange={e => capNhatDauVao({ filmQuantityUnit: e.target.value as any } as any)}>
                <option value="m2">m²</option>
                <option value="meter">mét</option>
              </select>
            </div>
            <div className="form-hint" style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--muted)' }}>
              Quy đổi: {dienTichMangQuyDoi.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²
              {soCuonMangQuyDoi > 0 ? ` · ≈ ${soCuonMangQuyDoi.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} cuộn` : ''}
            </div>
          </>
        ) : (
          <ONhapSoDinhDang className="form-input" value={input.quantity || 0} onChange={(val: number) => capNhatDauVao({ quantity: val })} />
        )}
      </div>

      {/* Chiều dài cuộn màng thành phẩm — chỉ hiện khi chọn màng */}
      {input.productType === 'mang' && (
        <div className="form-group">
          <label className="form-label">Chiều dài mỗi cuộn màng TP (m)</label>
          <ONhapSoDinhDang className="form-input" placeholder="VD: 6000" value={(input as any).filmRollLength || 6000} onChange={(val: number) => capNhatDauVao({ filmRollLength: val } as any)} />
        </div>
      )}

      <div className="divider"></div>

      {hienCauTruc && (
        <div id="structureSection">
          <div className="card-title" style={{ fontSize: '0.78rem' }}><span className="icon">🏗️</span> Cấu trúc</div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Khổ trải (m)</label>
              <ONhapSoThapPhan className="form-input" value={input.spreadWidth || 0} step="0.01" min="0.05" onChange={(val: number) => capNhatDauVao({ spreadWidth: val })} />
            </div>
            <div className="form-group">
              <label className="form-label">Bước cắt (m)</label>
              <ONhapSoThapPhan className="form-input" value={input.cutStep || 0} step="0.001" min="0.05" onChange={(val: number) => capNhatDauVao({ cutStep: val })} />
            </div>
            <div className="form-group">
              <label className="form-label">Số hình trên khổ</label>
              <ONhapSoThapPhan className="form-input" value={input.numImages || 0} step="1" min="1" onChange={(val: number) => capNhatDauVao({ numImages: val })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Số màu in</label>
            <select className="form-select" value={input.numColors === null ? '' : input.numColors} onChange={e => {
              const val = e.target.value;
              capNhatDauVao({ numColors: val === '' ? null : parseInt(val) });
            }}>
              <option value="">Chọn</option>
              <option value="0">Không in</option>
              <option value="1">1 màu</option><option value="2">2 màu</option>
              <option value="3">3 màu</option><option value="4">4 màu</option>
              <option value="5">5 màu</option><option value="6">6 màu</option>
              <option value="7">7 màu</option><option value="8">8 màu</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Độ dày mục tiêu (mic)</label>
            <ONhapSoDinhDang className="form-input" value={input.targetThickness || 0}
              placeholder="VD: 150" onChange={(val: number) => capNhatDauVao({ targetThickness: val })} />
          </div>

          <XemTruocCauTruc />

          {/* Nút tối ưu độ dày */}
          {hienCauTruc && (input.targetThickness ?? 0) > 0 && (
            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const mucTieu = input.targetThickness;
                  if (!mucTieu || mucTieu <= 0) return;

                  try {
                    const result = optimizeCurrentThickness();
                    if (result && result.result) {
                      const ghiDeMoi = { ...(input as any).micOverrides };
                      const capNhatLop: Record<string, string> = {};
                      result.result.ketQua.forEach((kq: any) => {
                        const layerId = kq.layerId;
                        const doDayDaChinh = kq.adjustedThickness;
                        const vatLieuDangChon = materials.find((m: any) => m.id === (input as any)[layerId]);
                        const vatLieuDuocChon = materials.find((m: any) => m.id === (kq.materialId || vatLieuDangChon?.id));
                        if (kq.materialId && kq.materialId !== vatLieuDangChon?.id) {
                          capNhatLop[layerId] = kq.materialId;
                        }
                        if (vatLieuDuocChon && doDayDaChinh !== vatLieuDuocChon.thickness) {
                          ghiDeMoi[layerId] = doDayDaChinh;
                        } else {
                          delete ghiDeMoi[layerId];
                        }
                      });
                      capNhatDauVao({ ...capNhatLop, micOverrides: ghiDeMoi });

                      const datYeuCau = (result.result as any).datYeuCau;
                      const tongThucTe = (result.result as any).tongThucTe;
                      alert(datYeuCau
                        ? `Đã tối ưu: ${tongThucTe} mic (thỏa [${mucTieu - 5}, ${mucTieu + 5}])`
                        : ((result.result as any).canhBao || 'Không đạt yêu cầu'));
                    }
                  } catch (e: any) {
                    alert('Lỗi tối ưu: ' + e.message);
                  }
                }}
              >
                🔧 Tính độ dày
              </button>
            </div>
          )}

          {hienThiChonLop('Lớp 1', 'layer1Id', false)}
          {!(input as any).layer2AltId ? (
            <>
              {hienThiChonLop('Lớp 2', 'layer2Id', !input.layer1Id)}
              {input.layer2Id && (
                <div style={{ marginTop: '-6px', marginBottom: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      const vatLieuChinh = materials.find(m => m.id === input.layer2Id);
                      const vatLieuPhu = materials.find(m => m.id !== input.layer2Id && (!vatLieuChinh || m.thickness === vatLieuChinh.thickness));
                      capNhatDauVao({
                        layer2AltId: vatLieuPhu?.id || null,
                        layer2Lengths: { mat1: (input.spreadWidth || 0) / 2, mat2: (input.spreadWidth || 0) / 2 },
                        layer2FrontPart: 'main',
                        layer2PairingMode: 'bottom_to_bottom',
                      } as any);
                    }}
                  >
                    + Thêm cấu trúc
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Lớp 2</label>
              <div className="layer2-split-stack">
                {(() => {
                  const kieuGhep = (input as any).layer2PairingMode || 'bottom_to_bottom';
                  const ngoaiLaChinh = kieuGhep === 'bottom_to_bottom';
                  const vatLieuNgoai = ngoaiLaChinh ? materials.find(m => m.id === input.layer2Id) : materials.find(m => m.id === (input as any).layer2AltId);
                  const vatLieuGiua = ngoaiLaChinh ? materials.find(m => m.id === (input as any).layer2AltId) : materials.find(m => m.id === input.layer2Id);
                  const khoNgoai = ngoaiLaChinh
                    ? ((input as any).layer2Lengths?.mat1 || 0)
                    : ((input as any).layer2Lengths?.mat2 || 0);
                  const khoGiua = ngoaiLaChinh
                    ? ((input as any).layer2Lengths?.mat2 || 0)
                    : ((input as any).layer2Lengths?.mat1 || 0);
                  const datVatLieuNgoai = (val: string) => {
                    if (ngoaiLaChinh) xuLyDoiLop('layer2Id', val);
                    else capNhatDauVao({ layer2AltId: val || null } as any);
                  };
                  const datVatLieuGiua = (val: string) => {
                    if (ngoaiLaChinh) capNhatDauVao({ layer2AltId: val || null } as any);
                    else xuLyDoiLop('layer2Id', val);
                  };
                  const datKhoNgoai = (val: number) => {
                    const hienTai = (input as any).layer2Lengths || { mat1: 0, mat2: 0 };
                    if (ngoaiLaChinh) capNhatDauVao({ layer2Lengths: { ...hienTai, mat1: val } } as any);
                    else capNhatDauVao({ layer2Lengths: { ...hienTai, mat2: val } } as any);
                  };
                  const datKhoGiua = (val: number) => {
                    const hienTai = (input as any).layer2Lengths || { mat1: 0, mat2: 0 };
                    if (ngoaiLaChinh) capNhatDauVao({ layer2Lengths: { ...hienTai, mat2: val } } as any);
                    else capNhatDauVao({ layer2Lengths: { ...hienTai, mat1: val } } as any);
                  };
                  const luaChonVatLieuNgoai = materials.filter(m => !vatLieuGiua || (m.thickness === vatLieuGiua.thickness && m.id !== vatLieuGiua.id) || m.id === vatLieuNgoai?.id);
                  const luaChonVatLieuGiua = materials.filter(m => !vatLieuNgoai || (m.thickness === vatLieuNgoai.thickness && m.id !== vatLieuNgoai.id) || m.id === vatLieuGiua?.id);
                  return (
                    <>
                    <div className="layer2-segment-grid">
                      <div className="layer2-segment-cell">
                        <select aria-label="Vật liệu ngoài" className="form-select" value={vatLieuNgoai?.id || ''} onChange={e => datVatLieuNgoai(e.target.value)}>
                          <option value="">-- Chọn vật liệu --</option>
                          {luaChonVatLieuNgoai.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <ONhapSoThapPhan className="form-input" value={khoNgoai} placeholder="m" step="0.001" onChange={datKhoNgoai} />
                      </div>

                      <div className="layer2-segment-cell">
                        <select aria-label="Vật liệu giữa" className="form-select" value={vatLieuGiua?.id || ''} onChange={e => datVatLieuGiua(e.target.value)}>
                          <option value="">-- Chọn vật liệu --</option>
                          {luaChonVatLieuGiua.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <ONhapSoThapPhan className="form-input" value={khoGiua} placeholder="m" step="0.001" onChange={datKhoGiua} />
                      </div>
                    </div>
                    </>
                  );
                })()}

                {(() => {
                  const kieuGhep = (input as any).layer2PairingMode || 'bottom_to_bottom';
                  const cacPhan = layPhanBoLop2();
                  return cacPhan.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <div>
                        <label className="form-label">Preview bố trí lớp 2</label>
                        <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
                          <div style={{ display: 'flex', flex: 1, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', minHeight: '54px' }}>
                          {cacPhan.map((seg: any, idx: number) => (
                            <div key={idx} style={{ flex: Math.max(seg.width || 0.01, 0.01), minWidth: '58px', padding: '10px 6px', borderRight: idx < cacPhan.length - 1 ? '1px solid var(--border)' : 'none', background: seg.source === 'main' ? 'rgba(8,145,178,0.10)' : 'rgba(217,119,6,0.10)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)' }}>{seg.vatLieu.name.split(' ')[0]}</div>
                            </div>
                          ))}
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            title="Đảo vật tư nằm giữa"
                            aria-label="Đảo vật tư nằm giữa"
                            style={{ width: '44px', padding: 0, fontSize: '1rem', flexShrink: 0 }}
                            onClick={() => capNhatDauVao({ layer2PairingMode: kieuGhep === 'bottom_to_bottom' ? 'front_to_front' : 'bottom_to_bottom' } as any)}
                          >
                            <ArrowLeftRight size={18} strokeWidth={2.4} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                <button className="btn btn-secondary" type="button" onClick={() => capNhatDauVao({ layer2AltId: null, layer2Lengths: undefined, layer2FrontPart: 'main', layer2PairingMode: 'bottom_to_bottom' } as any)}>Bỏ cấu trúc phụ</button>
              </div>
            </div>
          )}
          {hienThiChonLop('Lớp 3', 'layer3Id', !input.layer2Id)}
          {hienThiChonLop('Lớp 4', 'layer4Id', !input.layer3Id)}
          {hienThiChonLop('Lớp 5', 'layer5Id', !input.layer4Id)}

          <div className="advanced-toggle" onClick={() => datMoRongNangCao(!advancedOpen)}>
            <span>⚙️ Tùy chỉnh nâng cao</span>
            <span className={`advanced-arrow ${advancedOpen ? 'open' : ''}`}>▸</span>
          </div>

          <div className={`advanced-section ${advancedOpen ? 'open' : ''}`}>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Phủ mực (%)</label>
                <ONhapSoThapPhan className="form-input" value={input.coverageRatio === 1 ? 0 : Math.round(input.coverageRatio * 100)} placeholder="100" min="0" max="100" onChange={(val: number) => capNhatDauVao({ coverageRatio: (val === 0 ? 1 : val / 100) })} />
              </div>
            </div>

            <div className="form-row-3" style={{ marginTop: '10px' }}>
              <div className="form-group">
                <label className="form-check"><input type="checkbox" checked={(input as any).hasNhu || false} onChange={e => capNhatDauVao({ hasNhu: e.target.checked } as any)} /> Nhũ</label>
              </div>
              <div className="form-group">
                <label className="form-check"><input type="checkbox" checked={(input as any).hasMo || false} onChange={e => capNhatDauVao({ hasMo: e.target.checked } as any)} /> Phủ mờ</label>
              </div>
            </div>

            {input.productType !== 'mang' && (
              <>
                <div className="advanced-sub-title">🎀 Phụ kiện</div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-check"><input type="checkbox" checked={input.hasZipper} onChange={e => capNhatDauVao({ hasZipper: e.target.checked })} /> Zipper (378đ/m)</label></div>
                  <div className="form-group"><label className="form-check"><input type="checkbox" checked={input.hasTape} onChange={e => capNhatDauVao({ hasTape: e.target.checked })} /> Băng keo</label></div>
                                    <div className="form-group">
                    <label className="form-check"><input type="checkbox" checked={input.hasHandle} onChange={e => capNhatDauVao({ hasHandle: e.target.checked, handleOptionKey: e.target.checked ? (input.handleOptionKey || constants.handleOptions?.[0]?.key || null) : null })} /> Quai</label>
                    {input.hasHandle && (
                      <select className="form-select" style={{ marginTop: '6px' }} value={input.handleOptionKey || constants.handleOptions?.[0]?.key || ''} onChange={e => capNhatDauVao({ handleOptionKey: e.target.value as any })}>
                        {(constants.handleOptions ?? []).map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="advanced-sub-title">🖨️ Trục in</div>

            {/* Hàng 1: Dài | Chu vi | Loại trục */}
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Dài (m)</label>
                <ONhapSoThapPhan className="form-input" step="0.01" value={input.cylLength || 0}
                  onChange={(val: number) => capNhatDauVao({ cylLength: val })} />
                {!!input.cylLength && input.cylLength < 0.7 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Dưới tối thiểu (0.7m)</div> : null}
                {!!input.cylLength && input.cylLength > 1.25 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Vượt tối đa (1.25m)</div> : null}
              </div>
              <div className="form-group">
                <label className="form-label">Chu vi (m)</label>
                <ONhapSoThapPhan className="form-input" step="0.01" value={input.cylCircum || 0}
                  onChange={(val: number) => capNhatDauVao({ cylCircum: val })} />
                {!!input.cylCircum && input.cylCircum < 0.4 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Dưới tối thiểu (0.4m)</div> : null}
                {!!input.cylCircum && input.cylCircum > 0.9 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Vượt tối đa (0.9m)</div> : null}
              </div>
              <div className="form-group">
                <label className="form-label">Loại trục</label>
                <select className="form-select" value={input.cylType ?? 'A'}
                  onChange={e => capNhatDauVao({ cylType: e.target.value as 'A' | 'B' | 'custom' })}>
                  <option value="A">Trục A</option>
                  <option value="B">Trục B</option>
                  <option value="custom">Trục khác</option>
                </select>
              </div>
            </div>

            {/* Hàng 2 (chỉ hiện khi chọn Trục khác): Đơn giá */}
            {(input.cylType ?? 'A') === 'custom' && (
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label">Đơn giá trục khác (đ/m²)</label>
                <ONhapSoDinhDang className="form-input" value={input.cylUnitPrice || 0}
                  onChange={(val: number) => capNhatDauVao({ cylUnitPrice: val })} />
              </div>
            )}

            {/* Preview + Bao trục */}
            <div className="cylinder-preview" style={{ marginBottom: '10px' }}>
              DT: <span className="cyl-val">{((input.cylLength || 0) * (input.cylCircum || 0)).toFixed(4)} m²</span>
              {' · '} 1 trục: <span className="cyl-val">{(((input.cylLength || 0) * (input.cylCircum || 0) * (input.cylUnitPrice || 7300000)) || 0).toLocaleString('vi-VN')} đ</span>
              {' · '} Cả bộ ({input.numColors || 0} màu): <span className="cyl-val">{(((input.cylLength || 0) * (input.cylCircum || 0) * (input.cylUnitPrice || 7300000) * (input.numColors || 0)) || 0).toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-check" style={{ alignItems: 'flex-start', gap: '8px' }}>
                <input type="checkbox" checked={input.cylIncluded ?? false} onChange={e => capNhatDauVao({ cylIncluded: e.target.checked })} style={{ marginTop: '2px' }} />
                <span>
                  <strong>Bao trục</strong> — phân bổ chi phí bộ trục vào đơn giá sản phẩm
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
                    Định mức 200.000 m² · {input.productType === 'mang' ? 'màng: cộng đ/m²' : 'túi: cộng đ/túi'}
                  </div>
                </span>
              </label>
            </div>

            <div className="advanced-sub-title">📦 Đóng gói & Vận chuyển</div>
            {input.productType === 'mang' ? (
              <div className="form-group">
                <label className="form-label">Đóng gói (đ/cuộn)</label>
                <ONhapSoDinhDang className="form-input" value={input.boxPrice || 0} onChange={(val: number) => capNhatDauVao({ boxPrice: val })} />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Loại thùng</label>
                  <div className="form-row" style={{ alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <select
                        className="form-select"
                        value={input.boxOptionKey ?? ''}
                        onChange={e => xuLyDoiLoaiThung(e.target.value)}
                      >
                        <option value="">Chọn loại thùng</option>
                        {(constants.boxOptions ?? []).map(option => (
                          <option key={option.key} value={option.key}>
                            {option.label} / {option.price.toLocaleString('vi-VN')} đ
                          </option>
                        ))}
                        <option value="custom">Tự nhập</option>
                      </select>
                    </div>
                    <div style={{ flex: '0 0 120px' }}>
                      <label className="form-label" style={{ fontSize: '0.68rem' }}>SL túi/thùng</label>
                      <ONhapSoDinhDang className="form-input" value={input.bagsPerBox || 0} onChange={(val: number) => xuLyGhiDeThung('bagsPerBox', val)} />
                    </div>
                  </div>
                </div>
                {input.boxOptionKey === 'custom' && (
                  <div className="form-group">
                    <label className="form-label">Giá thùng tự nhập (đ)</label>
                    <ONhapSoDinhDang className="form-input" value={input.boxPrice || 0} onChange={(val: number) => xuLyGhiDeThung('boxPrice', val)} />
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '-4px', marginBottom: '8px' }}>
                  Khối lượng thùng: {(input.boxWeight || 0).toLocaleString('vi-VN')} gr/thùng
                </div>
              </>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vận chuyển (đ/km)</label>
                <ONhapSoDinhDang className="form-input" value={input.shippingPerKm || 0} onChange={(val: number) => capNhatDauVao({ shippingPerKm: val })} />
              </div>
              <div className="form-group">
                <label className="form-label">Khoảng cách (km)</label>
                <ONhapSoThapPhan className="form-input" value={input.shippingKm || 0} onChange={(val: number) => capNhatDauVao({ shippingKm: val })} />
              </div>
            </div>

            <div className="advanced-sub-title">⏳ Thanh toán</div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Thời hạn thanh toán</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[14, 30, 45, 90].map(days => (
                  <label key={days} className="form-check" style={{ marginBottom: 0, padding: '6px 12px', border: `1px solid ${soNgayThanhToanHienTai === days ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '6px', cursor: 'pointer', background: soNgayThanhToanHienTai === days ? 'var(--primary-light, #eff6ff)' : 'transparent' }}>
                    <input type="radio" style={{ marginRight: '6px' }} checked={soNgayThanhToanHienTai === days} onChange={() => capNhatDauVao({ paymentDays: days })} />
                    {days} ngày
                  </label>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '6px' }}>
                Lãi suất cấu hình tại Bảng Định Mức
              </div>
            </div>

            <div className="advanced-sub-title">💵 Hoa hồng</div>
            <div className="form-group">
              <label className="form-label">Hoa hồng</label>
              <div className="commission-row">
                <ONhapSoDinhDang className="form-input" value={input.commissionInputValue || 0} onChange={(val: number) => xuLyDoiHoaHong(val, input.commissionUnit)} />
                <select className="form-select" value={input.commissionUnit} onChange={e => xuLyDoiHoaHong(input.commissionInputValue, e.target.value as 'percent' | 'vnd')} style={{ width: '90px', flexShrink: 0 }}>
                  <option value="percent">%</option>
                  <option value="vnd">VND</option>
                </select>
              </div>
              <GoiYHoaHong />
            </div>

          </div>
        </div>
      )}

      <div className="divider"></div>

      <div style={{ marginTop: '14px' }}>
        <button
          className="btn btn-primary"
          id="btnCalculate"
          onClick={() => {
            const hopLe =
              !!input.productType &&
              (input.productType !== 'tui' || !!input.bagType) &&
              (input.productType !== 'mang' || !!input.filmType) &&
              (input.quantity || 0) > 0 &&
              (input.spreadWidth || 0) > 0 &&
              (input.cutStep || 0) > 0 &&
              input.numColors !== null;
            if (!hopLe) {
              alert('Vui lòng nhập đầy đủ thông tin đơn hàng.');
              return;
            }
            if (!result) {
              alert('Vui lòng nhập đầy đủ thông tin đơn hàng.');
              return;
            }
            themVaoLichSu();
            const nhanDonVi = input.productType === 'mang' ? 'm²' : 'túi';
            alert(`Giá đề xuất: ${Math.round(result.finalPrice).toLocaleString('vi-VN')} đ/${nhanDonVi}`);
          }}
        >
          ⚡ Tính giá
        </button>
      </div>

      <div className="quick-actions">
        <button className="btn btn-sm btn-outline" onClick={xuLyDatLai}>🔄 Đặt lại</button>
        <button className="btn btn-sm btn-outline" onClick={xuLySaoChep}>📋 Sao chép</button>
      </div>
    </div>
  );
}
