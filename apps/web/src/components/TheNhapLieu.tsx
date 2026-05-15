"use client";
import React from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';

// --- FORMAT NUMBER INPUT ---
const FormattedNumberInput = ({ value, onChange, placeholder, min, step, className }: any) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [localValue, setLocalValue] = React.useState('');

  React.useEffect(() => {
    if (!isFocused) {
      if (value === 0) setLocalValue('');
      else {
        const strVal = value.toString();
        if (strVal.includes('.')) setLocalValue(strVal);
        else setLocalValue(strVal.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawStr = e.target.value;
    const hasCommaDecimal = rawStr.includes(',');

    // If user enters decimal with comma, keep decimal behavior.
    if (hasCommaDecimal) {
      const normalized = rawStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
      const dotCount = (normalized.match(/\./g) || []).length;
      if (dotCount > 1) return;
      setLocalValue(rawStr);
      const floatVal = parseFloat(normalized);
      if (!isNaN(floatVal)) onChange(floatVal);
      if (normalized === '' || normalized === '.') onChange(0);
      return;
    }

    // Default VN number mode: dots are thousand separators, not decimals.
    const raw = rawStr.replace(/[^0-9]/g, '');
    if (raw === '') {
      setLocalValue('');
      onChange(0);
      return;
    }
    setLocalValue(raw.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
    onChange(parseFloat(raw));
  };

  return <input type="text" inputMode="numeric" className={className} placeholder={placeholder} min={min} step={step}
    value={localValue}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    onChange={handleChange} />;
};

// --- DECIMAL INPUT ---
const DecimalInput = ({ value, onChange, placeholder, min, step, className, disabled, style }: any) => {
  const [localVal, setLocalVal] = React.useState(value === 0 ? '' : value.toString());
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setLocalVal(value === 0 ? '' : value.toString());
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(',', '.');
    raw = raw.replace(/[^0-9.]/g, '');

    const dotCount = (raw.match(/\./g) || []).length;
    if (dotCount > 1) return;

    setLocalVal(raw);

    if (raw === '' || raw === '.') {
      onChange(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
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
      value={localVal}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={disabled}
      style={style}
    />
  );
};

export default function InputCard() {
  const { input, setInput: capNhatDauVao, materials, advancedOpen, setAdvancedOpen: datMoRongNangCao, result, resetInput: datLaiDauVao, addCurrentToHistory: themVaoLichSu, optimizeCurrentThickness } = dungCuaHangTinhGia();
  const [layerGroups, setLayerGroups] = React.useState<Record<string, string>>({});

  const handleProductType = (val: string) => {
    capNhatDauVao({ productType: val, bagType: '', filmType: '' });
  };

  const handleLayerChange = (layerKey: string, val: string) => {
    const partial: any = { [layerKey]: val || null };
    if (layerKey === 'layer2Id' && !val) {
      partial.layer2AltId = null;
      partial.layer2Lengths = undefined;
    }
    if (layerKey === 'layer2Id' && val && input.layer2AltId) {
      const newMat = materials.find(m => m.id === val);
      const altMat = materials.find(m => m.id === input.layer2AltId);
      if (newMat && altMat && newMat.thickness !== altMat.thickness) {
        partial.layer2AltId = null;
        partial.layer2Lengths = undefined;
      }
    }
    if (!val) {
      if (layerKey === 'layer1Id') { partial.layer2Id = null; partial.layer3Id = null; partial.layer4Id = null; partial.layer5Id = null; }
      if (layerKey === 'layer2Id') { partial.layer3Id = null; partial.layer4Id = null; partial.layer5Id = null; }
      if (layerKey === 'layer3Id') { partial.layer4Id = null; partial.layer5Id = null; }
      if (layerKey === 'layer4Id') { partial.layer5Id = null; }
    }
    const newMicOverrides = { ...input.micOverrides };
    delete newMicOverrides[layerKey];
    if (layerKey === 'layer2Id' && !val) delete newMicOverrides.layer2AltId;
    partial.micOverrides = newMicOverrides;

    capNhatDauVao(partial);
  };

  const handleLayerMainSelect = (layerKey: string, val: string) => {
    if (val.startsWith('GROUP_')) {
      const groupName = val.replace('GROUP_', '');
      setLayerGroups(prev => ({ ...prev, [layerKey]: val }));

      const defaultMat = materials
        .filter(m => m.group === groupName)
        .sort((a, b) => a.thickness - b.thickness)[0];
      handleLayerChange(layerKey, defaultMat?.id || '');
    } else {
      setLayerGroups(prev => ({ ...prev, [layerKey]: '' }));
      handleLayerChange(layerKey, val);
    }
  };

  const handleMicOverride = (layerKey: string, val: number) => {
    capNhatDauVao({ micOverrides: { ...input.micOverrides, [layerKey]: val } });
  };


  const getLayer2LayoutSegments = () => {
    const mainMat = materials.find(m => m.id === input.layer2Id);
    const altMat = materials.find(m => m.id === (input as any).layer2AltId);
    const lengths = (input as any).layer2Lengths || { mat1: 0, mat2: 0 };
    if (!mainMat || !altMat) return [];

    const pairingMode = (input as any).layer2PairingMode || 'bottom_to_bottom';
    const isTwoImages = (input.numImages || 1) >= 2;
    if (!isTwoImages) {
      const normalOrder = [
        { mat: mainMat, width: Math.max(lengths.mat1 || 0, 0), source: 'main' },
        { mat: altMat, width: Math.max(lengths.mat2 || 0, 0), source: 'alt' },
      ];
      return pairingMode === 'front_to_front' ? normalOrder.reverse() : normalOrder;
    }

    const mainSideWidth = Math.max((lengths.mat1 || 0) / 2, 0);
    const altSideWidth = Math.max((lengths.mat2 || 0) / 2, 0);

    if (pairingMode === 'front_to_front') {
      return [
        { mat: altMat, width: altSideWidth, source: 'alt' },
        { mat: mainMat, width: mainSideWidth, source: 'main' },
        { mat: mainMat, width: mainSideWidth, source: 'main' },
        { mat: altMat, width: altSideWidth, source: 'alt' },
      ];
    }

    return [
      { mat: mainMat, width: mainSideWidth, source: 'main' },
      { mat: altMat, width: altSideWidth, source: 'alt' },
      { mat: altMat, width: altSideWidth, source: 'alt' },
      { mat: mainMat, width: mainSideWidth, source: 'main' },
    ];
  };

  const Layer2ChoiceCard = ({ active, title, subtitle, onClick }: { active: boolean; title: string; subtitle?: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="btn btn-secondary" style={{ flex: 1, minWidth: '135px', justifyContent: 'flex-start', textAlign: 'left', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'rgba(79,70,229,0.08)' : 'var(--surface2)', color: 'var(--text)', padding: '10px 12px' }}>
      <span style={{ marginRight: '8px', color: active ? '#059669' : 'transparent', fontWeight: 900 }}>{active ? '?' : '?'}</span>
      <span><strong>{title}</strong>{subtitle ? <><br/><small style={{ color: 'var(--muted)' }}>{subtitle}</small></> : null}</span>
    </button>
  );

  const renderLayerSelect = (label: string, layerKey: keyof typeof input, disabled: boolean) => {
    const matId = input[layerKey] as string | null | undefined;
    const mat = materials.find(m => m.id === matId);

    const currentGroup = layerGroups[layerKey] || (mat?.group ? `GROUP_${mat.group}` : '');
    const mainVal = currentGroup || matId || '';

    const flatOptions = materials.filter(m => !m.group);
    const groupNames = Array.from(new Set(materials.filter(m => m.group).map(m => m.group as string)));

    return (
      <div className="form-group">
        <label className="form-label">{label}</label>
        <select className="form-select" value={mainVal} onChange={e => handleLayerMainSelect(layerKey, e.target.value)} disabled={disabled}>
          <option value="">— {disabled || layerKey !== 'layer1Id' ? 'Không' : 'Chọn'} —</option>
          {flatOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          {groupNames.map(g => <option key={g} value={`GROUP_${g}`}>{g}</option>)}
        </select>

        {currentGroup && currentGroup.startsWith('GROUP_') && (
          <div className="mic-adjust" style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Độ dày (mic)</label>
            <select className="form-select" value={matId || ''} onChange={e => handleLayerChange(layerKey, e.target.value)}>
              <option value="">— Chọn độ dày —</option>
              {materials.filter(m => m.group === currentGroup.replace('GROUP_', '')).map(m => (
                <option key={m.id} value={m.id}>{m.thickness}</option>
              ))}
            </select>
          </div>
        )}

        {mat && mat.adjustableMic && (
          <div className="mic-adjust" style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Độ dày tuỳ chỉnh (mic)</label>
            <DecimalInput className="form-input"
              value={(input.micOverrides && input.micOverrides[layerKey]) || mat.thickness}
              onChange={(val: number) => handleMicOverride(layerKey, val)} />
          </div>
        )}
      </div>
    );
  };

  const CommissionHint = () => {
    const { result, input: storeInput } = dungCuaHangTinhGia.getState();
    const val = input.commissionInputValue || 0;
    if (!result || !val) return <div className="commission-hint"></div>;
    const unitLabel = storeInput.productType === 'mang' ? 'm²' : 'túi';
    if (input.commissionUnit === 'percent') {
      const vndPerUnit = (val / 100) * result.costPerUnit;
      return <div className="commission-hint">= {vndPerUnit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} đ/{unitLabel}</div>;
    } else {
      const pct = result.costPerUnit > 0 ? (val / result.costPerUnit * 100) : 0;
      return <div className="commission-hint">= {pct.toFixed(2)}% (trên giá vốn+LN)</div>;
    }
  };

  const handleCommissionChange = (val: number, unit: 'percent' | 'vnd') => {
    capNhatDauVao({
      commissionInputValue: val,
      commissionUnit: unit,
      commissionRate: unit === 'percent' ? val / 100 : 0,
      commissionFixedVND: unit === 'vnd' ? val : 0
    });
  };

  const StructurePreview = () => {
    const getLayer = (id: string | null | undefined) => materials.find(m => m.id === id);
    const layers = [
      { mat: getLayer(input.layer1Id), override: input.micOverrides?.layer1Id },
      { mat: getLayer(input.layer2Id), override: input.micOverrides?.layer2Id, alt: getLayer((input as any).layer2AltId), altOverride: input.micOverrides?.layer2AltId },
      { mat: getLayer(input.layer3Id), override: input.micOverrides?.layer3Id },
      { mat: getLayer(input.layer4Id), override: input.micOverrides?.layer4Id },
      { mat: getLayer(input.layer5Id), override: input.micOverrides?.layer5Id }
    ].filter(l => l.mat);

    if (layers.length === 0) {
      return (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', height: '42px' }}>
          <div style={{ flex: 1, background: 'linear-gradient(135deg, #94a3b8, #cbd5e1)', opacity: 0.35, borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>—</div>
          </div>
        </div>
      );
    }

    const sumMic = layers.reduce((s, l: any) => s + Math.max(l.override || l.mat!.thickness, l.alt ? (l.altOverride || l.alt.thickness) : 0), 0);
    const glueMic = (layers.length - 1) * 3;
    const totalMic = sumMic + glueMic;
    const target = input.targetThickness || 0;
    const outOfRange = target > 0 && (totalMic < target - 5 || totalMic > target + 5);

    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {layers.map((l, i) => (
            <React.Fragment key={i}>
              <div style={{ flex: 1, minWidth: '40px', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '6px 4px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text)' }}>{l.mat!.name.split(' ')[0]}{(l as any).alt ? ` + ${(l as any).alt.name.split(' ')[0]}` : ''}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{Math.max(l.override || l.mat!.thickness, (l as any).alt ? ((l as any).altOverride || (l as any).alt.thickness) : 0)}mic</div>
              </div>
              {i < layers.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.7 }}>3mic</div>
              )}
            </React.Fragment>
          ))}
        </div>
        {layers.length > 0 && (
          <div style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
            Tổng: <strong>{totalMic}</strong> mic (vật liệu {sumMic} + keo {glueMic})
            {target > 0 && <span> — Mục tiêu: {target} mic (±5)</span>}
          </div>
        )}
        {outOfRange && (
          <div style={{ fontSize: '0.75rem', marginTop: '4px', padding: '6px 10px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '4px', color: '#dc2626' }}>
            Tổng độ dày {totalMic} mic nằm ngoài khoảng [{target - 5}, {target + 5}]. Vui lòng điều chỉnh lớp vật liệu.
          </div>
        )}
      </div>
    );
  };

  const paymentDaysLocal = input.paymentDays || 30;
  const showStructure =
    (input.productType === 'tui' && !!input.bagType) ||
    (input.productType === 'mang' && !!input.filmType);

  const handleCopy = async () => {
    if (!result) {
      alert('Chưa có kết quả để copy.');
      return;
    }
    const isMang = result.input.productType === 'mang';
    const fmtPct = (n: number) => parseFloat((n * 100).toFixed(2)) + '%';
    const rollLength = (result.input as any).filmRollLength || 6000;
    const text = [
      `${result.input.customer || 'N/A'} — ${result.input.productName || 'N/A'}`,
      `Cấu trúc: ${result.structureText} | Độ dày: ${result.totalThickness}mic`,
      isMang
        ? `Diện tích: ${result.input.quantity.toLocaleString('vi-VN')} m² | KT: ${+(result.input.spreadWidth * 1000).toFixed(0)}×${+(result.input.cutStep * 1000).toFixed(0)} mm² | Cuộn: ${rollLength.toLocaleString('vi-VN')}m/cuộn`
        : `SL: ${result.input.quantity.toLocaleString('vi-VN')} túi | KT: ${+(result.input.spreadWidth * 1000).toFixed(0)}×${+(result.input.cutStep * 1000).toFixed(0)} mm²`,
      isMang
        ? `GIÁ ĐỀ XUẤT: ${Math.round(result.finalPrice).toLocaleString('vi-VN')} đ/m² (chưa VAT)`
        : `GIÁ ĐỀ XUẤT: ${Math.round(result.finalPrice).toLocaleString('vi-VN')} đ/túi (chưa VAT)`,
      `Giá vốn: ${result.costPerUnit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} | LN: ${fmtPct(result.profitRate)} | DT: ${(result.revenue / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`,
      `Trục in: ${(result.cylinderCost / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr (riêng)`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
  };

  const handleReset = () => {
    setLayerGroups({});
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
          <select className="form-select" value={input.productType} onChange={e => handleProductType(e.target.value)}>
            <option value="">— Chọn —</option>
            <option value="tui">Túi</option>
            <option value="mang">Màng</option>
          </select>
        </div>
        {input.productType === 'tui' && (
          <div className="form-group">
            <label className="form-label">Loại túi</label>
            <select className="form-select" value={input.bagType} onChange={e => capNhatDauVao({ bagType: e.target.value })}>
              <option value="">— Chọn —</option>
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
            <select className="form-select" value={input.filmType} onChange={e => capNhatDauVao({ filmType: e.target.value })}>
              <option value="">— Chọn —</option>
              <option value="mangIn">Màng in</option>
              <option value="mangGhep">Màng ghép</option>
              <option value="mangDongGoi">Màng đóng gói tự động</option>
            </select>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">{input.productType === 'mang' ? 'Diện tích (m²)' : 'Số lượng'}</label>
        <FormattedNumberInput className="form-input" value={input.quantity || 0} onChange={(val: number) => capNhatDauVao({ quantity: val })} />
      </div>

      {/* Chiều dài cuộn màng thành phẩm — chỉ hiện khi chọn màng */}
      {input.productType === 'mang' && (
        <div className="form-group">
          <label className="form-label">Chiều dài mỗi cuộn màng TP (m)</label>
          <FormattedNumberInput className="form-input" placeholder="VD: 6000" value={(input as any).filmRollLength || 6000} onChange={(val: number) => capNhatDauVao({ filmRollLength: val } as any)} />
        </div>
      )}

      <div className="divider"></div>

      {showStructure && (
        <div id="structureSection">
          <div className="card-title" style={{ fontSize: '0.78rem' }}><span className="icon">🏗️</span> Cấu trúc</div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Khổ trải (m)</label>
              <DecimalInput className="form-input" value={input.spreadWidth || 0} step="0.01" min="0.05" onChange={(val: number) => capNhatDauVao({ spreadWidth: val })} />
            </div>
            <div className="form-group">
              <label className="form-label">Bước cắt (m)</label>
              <DecimalInput className="form-input" value={input.cutStep || 0} step="0.001" min="0.05" onChange={(val: number) => capNhatDauVao({ cutStep: val })} />
            </div>
            <div className="form-group">
              <label className="form-label">Số hình trên khổ</label>
              <DecimalInput className="form-input" value={input.numImages || 0} step="1" min="1" onChange={(val: number) => capNhatDauVao({ numImages: val })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Số màu in</label>
            <select className="form-select" value={input.numColors === null ? '' : input.numColors} onChange={e => {
              const val = e.target.value;
              capNhatDauVao({ numColors: val === '' ? null : parseInt(val) });
            }}>
              <option value="">— Chọn —</option>
              <option value="0">Không in</option>
              <option value="1">1 màu</option><option value="2">2 màu</option>
              <option value="3">3 màu</option><option value="4">4 màu</option>
              <option value="5">5 màu</option><option value="6">6 màu</option>
              <option value="7">7 màu</option><option value="8">8 màu</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Độ dày mục tiêu (mic)</label>
            <FormattedNumberInput className="form-input" value={input.targetThickness || 0}
              placeholder="VD: 150" onChange={(val: number) => capNhatDauVao({ targetThickness: val })} />
          </div>

          <StructurePreview />

          {/* Nút tối ưu độ dày */}
          {showStructure && (input.targetThickness ?? 0) > 0 && (
            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const target = input.targetThickness;
                  if (!target || target <= 0) return;

                  try {
                    const result = optimizeCurrentThickness();
                    if (result && result.result) {
                      const newOverrides = { ...(input as any).micOverrides };
                      const layerUpdates: Record<string, string> = {};
                      result.result.ketQua.forEach((kq: any) => {
                        const layerId = kq.layerId;
                        const adjusted = kq.adjustedThickness;
                        const currentMat = materials.find((m: any) => m.id === (input as any)[layerId]);
                        const selectedMat = materials.find((m: any) => m.id === (kq.materialId || currentMat?.id));
                        if (kq.materialId && kq.materialId !== currentMat?.id) {
                          layerUpdates[layerId] = kq.materialId;
                        }
                        if (selectedMat && adjusted !== selectedMat.thickness) {
                          newOverrides[layerId] = adjusted;
                        } else {
                          delete newOverrides[layerId];
                        }
                      });
                      capNhatDauVao({ ...layerUpdates, micOverrides: newOverrides });

                      const datYeuCau = (result.result as any).datYeuCau;
                      const tongThucTe = (result.result as any).tongThucTe;
                      alert(datYeuCau
                        ? `Đã tối ưu: ${tongThucTe} mic (thỏa [${target - 5}, ${target + 5}])`
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

          {renderLayerSelect('Lớp 1', 'layer1Id', false)}
          {!(input as any).layer2AltId ? (
            <>
              {renderLayerSelect('Lớp 2', 'layer2Id', !input.layer1Id)}
              {input.layer2Id && (
                <div style={{ marginTop: '-6px', marginBottom: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => capNhatDauVao({
                      layer2AltId: input.layer2Id,
                      layer2Lengths: { mat1: input.spreadWidth || 0, mat2: 0 },
                      layer2FrontPart: 'main',
                      layer2PairingMode: 'bottom_to_bottom',
                    } as any)}
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
                  const isTwoImages = (input.numImages || 1) >= 2;
                  const pairingMode = (input as any).layer2PairingMode || 'bottom_to_bottom';
                  const outerIsMain = pairingMode === 'bottom_to_bottom';
                  const outerMat = outerIsMain ? materials.find(m => m.id === input.layer2Id) : materials.find(m => m.id === (input as any).layer2AltId);
                  const centerMat = outerIsMain ? materials.find(m => m.id === (input as any).layer2AltId) : materials.find(m => m.id === input.layer2Id);
                  const sideWidth = outerIsMain
                    ? ((input as any).layer2Lengths?.mat1 || 0) / (isTwoImages ? 2 : 1)
                    : ((input as any).layer2Lengths?.mat2 || 0) / (isTwoImages ? 2 : 1);
                  const centerWidth = outerIsMain
                    ? ((input as any).layer2Lengths?.mat2 || 0)
                    : ((input as any).layer2Lengths?.mat1 || 0);
                  const setOuterMaterial = (val: string) => {
                    if (outerIsMain) handleLayerChange('layer2Id', val);
                    else capNhatDauVao({ layer2AltId: val || null } as any);
                  };
                  const setCenterMaterial = (val: string) => {
                    if (outerIsMain) capNhatDauVao({ layer2AltId: val || null } as any);
                    else handleLayerChange('layer2Id', val);
                  };
                  const setOuterWidth = (val: number) => {
                    const current = (input as any).layer2Lengths || { mat1: 0, mat2: 0 };
                    if (outerIsMain) capNhatDauVao({ layer2Lengths: { ...current, mat1: val * (isTwoImages ? 2 : 1) } } as any);
                    else capNhatDauVao({ layer2Lengths: { ...current, mat2: val * (isTwoImages ? 2 : 1) } } as any);
                  };
                  const setCenterWidth = (val: number) => {
                    const current = (input as any).layer2Lengths || { mat1: 0, mat2: 0 };
                    if (outerIsMain) capNhatDauVao({ layer2Lengths: { ...current, mat2: val } } as any);
                    else capNhatDauVao({ layer2Lengths: { ...current, mat1: val } } as any);
                  };
                  const matchingOuterOptions = materials.filter(m => !centerMat || (m.thickness === centerMat.thickness && m.id !== centerMat.id) || m.id === outerMat?.id);
                  const matchingCenterOptions = materials.filter(m => !outerMat || (m.thickness === outerMat.thickness && m.id !== outerMat.id) || m.id === centerMat?.id);
                  return (
                    <div className={isTwoImages ? 'layer2-segment-grid layer2-segment-grid--three' : 'layer2-segment-grid'}>
                      <div className="layer2-segment-cell">
                        <select aria-label="Vật liệu ngoài" className="form-select" value={outerMat?.id || ''} onChange={e => setOuterMaterial(e.target.value)}>
                          <option value="">-- Chọn vật liệu --</option>
                          {matchingOuterOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <DecimalInput className="form-input" value={sideWidth} placeholder="m" step="0.001" onChange={setOuterWidth} />
                      </div>

                      <div className="layer2-segment-cell">
                        <select aria-label="Vật liệu giữa" className="form-select" value={centerMat?.id || ''} onChange={e => setCenterMaterial(e.target.value)}>
                          <option value="">-- Chọn vật liệu --</option>
                          {matchingCenterOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <DecimalInput className="form-input" value={centerWidth} placeholder="m" step="0.001" onChange={setCenterWidth} />
                      </div>

                      {isTwoImages && (
                        <div className="layer2-segment-cell layer2-segment-cell--locked">
                          <div className="layer2-locked-select">{outerMat?.name || '--'}</div>
                          <div className="layer2-locked-input">{sideWidth ? sideWidth.toString() : ''}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const pairingMode = (input as any).layer2PairingMode || 'bottom_to_bottom';
                  const segments = getLayer2LayoutSegments();
                  return segments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <div>
                        <label className="form-label">Xem trước bố trí khổ</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', flex: 1 }}>
                            {pairingMode === 'bottom_to_bottom' ? 'Vật liệu chính ở hai bên' : 'Vật liệu phụ ở hai bên'}
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            onClick={() => capNhatDauVao({ layer2PairingMode: pairingMode === 'bottom_to_bottom' ? 'front_to_front' : 'bottom_to_bottom' } as any)}
                          >
                            Đảo
                          </button>
                        </div>
                        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', minHeight: '54px' }}>
                          {segments.map((seg: any, idx: number) => (
                            <div key={idx} style={{ flex: Math.max(seg.width || 0.01, 0.01), minWidth: '58px', padding: '10px 6px', borderRight: idx < segments.length - 1 ? '1px solid var(--border)' : 'none', background: seg.source === 'main' ? 'rgba(8,145,178,0.10)' : 'rgba(217,119,6,0.10)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)' }}>{seg.mat.name.split(' ')[0]}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {(() => {
                  const lengths = (input as any).layer2Lengths;
                  if (!lengths) return null;
                  if ((input as any).layer2AltId === input.layer2Id) {
                    return <div style={{ padding: '8px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid #dc2626', borderRadius: '6px', color: '#dc2626', fontSize: '0.8rem' }}>Vật liệu phụ phải khác vật liệu chính trong lớp 2</div>;
                  }
                  const mainMat = materials.find(m => m.id === input.layer2Id);
                  const altMat = materials.find(m => m.id === (input as any).layer2AltId);
                  if (mainMat && altMat && mainMat.thickness !== altMat.thickness) {
                    return <div style={{ padding: '8px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid #dc2626', borderRadius: '6px', color: '#dc2626', fontSize: '0.8rem' }}>Hai vật liệu trong lớp 2 phải cùng độ dày ({mainMat.thickness} mic ≠ {altMat.thickness} mic)</div>;
                  }
                  if (lengths.mat1 <= 0 || lengths.mat2 <= 0) {
                    return <div style={{ padding: '8px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid #dc2626', borderRadius: '6px', color: '#dc2626', fontSize: '0.8rem' }}>Khổ vật liệu 1 và 2 phải lớn hơn 0m</div>;
                  }
                  const total = lengths.mat1 + lengths.mat2;
                  const spreadWidthM = input.spreadWidth || 0;
                  const diff = Math.abs(total - spreadWidthM);
                  if (diff > 0.0005) {
                    return <div style={{ padding: '8px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid #dc2626', borderRadius: '6px', color: '#dc2626', fontSize: '0.8rem' }}>Tổng khổ ({total.toFixed(3)}m) khác khổ trải ({spreadWidthM.toFixed(3)}m)</div>;
                  }
                  return <div style={{ padding: '6px', background: 'rgba(5, 150, 105, 0.1)', border: '1px solid #059669', borderRadius: '6px', color: '#059669', fontSize: '0.75rem' }}>Tổng khổ khớp với khổ trải</div>;
                })()}

                <button className="btn btn-secondary" type="button" onClick={() => capNhatDauVao({ layer2AltId: null, layer2Lengths: undefined, layer2FrontPart: 'main', layer2PairingMode: 'bottom_to_bottom' } as any)}>Bỏ cấu trúc phụ</button>
              </div>
            </div>
          )}
          {renderLayerSelect('Lớp 3', 'layer3Id', !input.layer2Id)}
          {renderLayerSelect('Lớp 4', 'layer4Id', !input.layer3Id)}
          {renderLayerSelect('Lớp 5', 'layer5Id', !input.layer4Id)}

          <div className="advanced-toggle" onClick={() => datMoRongNangCao(!advancedOpen)}>
            <span>⚙️ Tùy chỉnh nâng cao</span>
            <span className={`advanced-arrow ${advancedOpen ? 'open' : ''}`}>▸</span>
          </div>

          <div className={`advanced-section ${advancedOpen ? 'open' : ''}`}>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Phủ mực (%)</label>
                <DecimalInput className="form-input" value={input.coverageRatio === 1 ? 0 : Math.round(input.coverageRatio * 100)} placeholder="100" min="0" max="100" onChange={(val: number) => capNhatDauVao({ coverageRatio: (val === 0 ? 1 : val / 100) })} />
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
                  <div className="form-group"><label className="form-check"><input type="checkbox" checked={input.hasHandle} onChange={e => capNhatDauVao({ hasHandle: e.target.checked })} /> Quai</label></div>
                </div>
              </>
            )}

            <div className="advanced-sub-title">🖨️ Trục in</div>

            {/* Hàng 1: Dài | Chu vi | Loại trục */}
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Dài (m)</label>
                <DecimalInput className="form-input" step="0.01" value={input.cylLength || 0}
                  onChange={(val: number) => capNhatDauVao({ cylLength: val })} />
                {!!input.cylLength && input.cylLength < 0.7 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Dưới tối thiểu (0.7m)</div> : null}
                {!!input.cylLength && input.cylLength > 1.25 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Vượt tối đa (1.25m)</div> : null}
              </div>
              <div className="form-group">
                <label className="form-label">Chu vi (m)</label>
                <DecimalInput className="form-input" step="0.01" value={input.cylCircum || 0}
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
                <FormattedNumberInput className="form-input" value={input.cylUnitPrice || 0}
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
                <FormattedNumberInput className="form-input" value={input.boxPrice || 0} onChange={(val: number) => capNhatDauVao({ boxPrice: val })} />
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Túi/thùng</label>
                  <FormattedNumberInput className="form-input" value={input.bagsPerBox || 0} onChange={(val: number) => capNhatDauVao({ bagsPerBox: val })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá thùng (đ)</label>
                  <FormattedNumberInput className="form-input" value={input.boxPrice || 0} onChange={(val: number) => capNhatDauVao({ boxPrice: val })} />
                </div>
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vận chuyển (đ/km)</label>
                <FormattedNumberInput className="form-input" value={input.shippingPerKm || 0} onChange={(val: number) => capNhatDauVao({ shippingPerKm: val })} />
              </div>
              <div className="form-group">
                <label className="form-label">Khoảng cách (km)</label>
                <DecimalInput className="form-input" value={input.shippingKm || 0} onChange={(val: number) => capNhatDauVao({ shippingKm: val })} />
              </div>
            </div>

            <div className="advanced-sub-title">⏳ Thanh toán</div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Thời hạn thanh toán</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[14, 30, 45, 90].map(days => (
                  <label key={days} className="form-check" style={{ marginBottom: 0, padding: '6px 12px', border: `1px solid ${paymentDaysLocal === days ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '6px', cursor: 'pointer', background: paymentDaysLocal === days ? 'var(--primary-light, #eff6ff)' : 'transparent' }}>
                    <input type="radio" style={{ marginRight: '6px' }} checked={paymentDaysLocal === days} onChange={() => capNhatDauVao({ paymentDays: days })} />
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
                <FormattedNumberInput className="form-input" value={input.commissionInputValue || 0} onChange={(val: number) => handleCommissionChange(val, input.commissionUnit)} />
                <select className="form-select" value={input.commissionUnit} onChange={e => handleCommissionChange(input.commissionInputValue, e.target.value as 'percent' | 'vnd')} style={{ width: '90px', flexShrink: 0 }}>
                  <option value="percent">%</option>
                  <option value="vnd">VND</option>
                </select>
              </div>
              <CommissionHint />
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
            const isValid =
              !!input.productType &&
              (input.productType !== 'tui' || !!input.bagType) &&
              (input.productType !== 'mang' || !!input.filmType) &&
              (input.quantity || 0) > 0 &&
              (input.spreadWidth || 0) > 0 &&
              (input.cutStep || 0) > 0 &&
              input.numColors !== null;
            if (!isValid) {
              alert('Vui lòng nhập đầy đủ thông tin đơn hàng.');
              return;
            }
            if (!result) {
              alert('Vui lòng nhập đầy đủ thông tin đơn hàng.');
              return;
            }
            themVaoLichSu();
            const unitLabel = input.productType === 'mang' ? 'm²' : 'túi';
            alert(`Giá đề xuất: ${Math.round(result.finalPrice).toLocaleString('vi-VN')} đ/${unitLabel}`);
          }}
        >
          ⚡ Tính giá
        </button>
      </div>

      <div className="quick-actions">
        <button className="btn btn-sm btn-outline" onClick={handleReset}>🔄 Đặt lại</button>
        <button className="btn btn-sm btn-outline" onClick={handleCopy}>📋 Sao chép</button>
      </div>
    </div>
  );
}
