"use client";
import React from 'react';
import { useCalculatorStore } from '../store/calculatorStore';

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
  const { input, setInput, materials, advancedOpen, setAdvancedOpen, result, resetInput, addCurrentToHistory } = useCalculatorStore();
  const [layerGroups, setLayerGroups] = React.useState<Record<string, string>>({});

  const handleProductType = (val: string) => {
    setInput({ productType: val, bagType: '', filmType: '' });
  };

  const handleLayerChange = (layerKey: string, val: string) => {
    const partial: any = { [layerKey]: val || null };
    if (!val) {
      if (layerKey === 'layer1Id') { partial.layer2Id = null; partial.layer3Id = null; partial.layer4Id = null; partial.layer5Id = null; }
      if (layerKey === 'layer2Id') { partial.layer3Id = null; partial.layer4Id = null; partial.layer5Id = null; }
      if (layerKey === 'layer3Id') { partial.layer4Id = null; partial.layer5Id = null; }
      if (layerKey === 'layer4Id') { partial.layer5Id = null; }
    }
    const newMicOverrides = { ...input.micOverrides };
    delete newMicOverrides[layerKey];
    partial.micOverrides = newMicOverrides;

    setInput(partial);
  };

  const handleLayerMainSelect = (layerKey: string, val: string) => {
    if (val.startsWith('GROUP_')) {
      setLayerGroups(prev => ({ ...prev, [layerKey]: val }));
      handleLayerChange(layerKey, '');
    } else {
      setLayerGroups(prev => ({ ...prev, [layerKey]: '' }));
      handleLayerChange(layerKey, val);
    }
  };

  const handleMicOverride = (layerKey: string, val: number) => {
    setInput({ micOverrides: { ...input.micOverrides, [layerKey]: val } });
  };

  const renderLayerSelect = (label: string, layerKey: keyof typeof input, disabled: boolean) => {
    const matId = input[layerKey] as string | null | undefined;
    const mat = materials.find(m => m.id === matId);

    const currentGroup = layerGroups[layerKey] || (mat?.group ? `GROUP_${mat.group}` : '');
    const mainVal = currentGroup || matId || '';

    const flatOptions = materials.filter(m => !m.group);
    const groupNames = Array.from(new Set(materials.filter(m => m.group).map(m => m.group as string)));
    const layer1OnlyGroups = ['BOPP', 'Matt OPP'];

    return (
      <div className="form-group">
        <label className="form-label">{label}</label>
        <select className="form-select" value={mainVal} onChange={e => handleLayerMainSelect(layerKey, e.target.value)} disabled={disabled}>
          <option value="">— {disabled || layerKey !== 'layer1Id' ? 'Không' : 'Chọn'} —</option>
          {flatOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          {groupNames.map(g => {
            if (layerKey !== 'layer1Id' && layer1OnlyGroups.includes(g)) return null;
            return <option key={g} value={`GROUP_${g}`}>{g}</option>;
          })}
        </select>

        {currentGroup && currentGroup.startsWith('GROUP_') && (
          <div className="mic-adjust" style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            <label className="form-label" style={{ fontSize: '0.72rem' }}>Độ dày (mic)</label>
            <select className="form-select" value={matId || ''} onChange={e => handleLayerChange(layerKey, e.target.value)}>
              <option value="">— Chọn Độ Dày —</option>
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
    const { result, input: storeInput } = useCalculatorStore.getState();
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
    setInput({
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
      { mat: getLayer(input.layer2Id), override: input.micOverrides?.layer2Id },
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

    return (
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {layers.map((l, i) => (
          <div key={i} style={{ flex: 1, minWidth: '40px', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '6px 4px', borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text)' }}>{l.mat!.name.split(' ')[0]}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{l.override || l.mat!.thickness}mic</div>
          </div>
        ))}
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
    resetInput();
  };

  return (
    <div className="card" id="inputCard" style={{ position: 'sticky', top: '64px' }}>
      <div className="auto-calc-badge"><div className="pulse-dot"></div> Tự động tính khi thay đổi</div>
      <div className="card-title"><span className="icon">📝</span> Thông tin đơn hàng</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Khách hàng</label>
          <input className="form-input" placeholder="Tên khách hàng" value={input.customer} onChange={e => setInput({ customer: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tên hàng</label>
          <input className="form-input" placeholder="Tên sản phẩm" value={input.productName} onChange={e => setInput({ productName: e.target.value })} />
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
            <select className="form-select" value={input.bagType} onChange={e => setInput({ bagType: e.target.value })}>
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
            <select className="form-select" value={input.filmType} onChange={e => setInput({ filmType: e.target.value })}>
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
        <FormattedNumberInput className="form-input" value={input.quantity || 0} onChange={(val: number) => setInput({ quantity: val })} />
      </div>

      {/* Chiều dài cuộn màng thành phẩm — chỉ hiện khi chọn màng */}
      {input.productType === 'mang' && (
        <div className="form-group">
          <label className="form-label">Chiều dài mỗi cuộn màng TP (m)</label>
          <FormattedNumberInput className="form-input" placeholder="VD: 6000" value={(input as any).filmRollLength || 6000} onChange={(val: number) => setInput({ filmRollLength: val } as any)} />
        </div>
      )}

      <div className="divider"></div>

      {showStructure && (
        <div id="structureSection">
          <div className="card-title" style={{ fontSize: '0.78rem' }}><span className="icon">🏗️</span> Cấu trúc</div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Khổ trải (m)</label>
              <DecimalInput className="form-input" value={input.spreadWidth || 0} step="0.01" min="0.05" onChange={(val: number) => setInput({ spreadWidth: val })} />
            </div>
            <div className="form-group">
              <label className="form-label">Bước cắt (m)</label>
              <DecimalInput className="form-input" value={input.cutStep || 0} step="0.001" min="0.05" onChange={(val: number) => setInput({ cutStep: val })} />
            </div>
            <div className="form-group">
              <label className="form-label">Số con hình</label>
              <DecimalInput className="form-input" value={input.numImages || 0} step="1" min="1" onChange={(val: number) => setInput({ numImages: val })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Số màu in</label>
            <select className="form-select" value={input.numColors === null ? '' : input.numColors} onChange={e => {
              const val = e.target.value;
              setInput({ numColors: val === '' ? null : parseInt(val) });
            }}>
              <option value="">— Chọn —</option>
              <option value="0">Không in</option>
              <option value="1">1 màu</option><option value="2">2 màu</option>
              <option value="3">3 màu</option><option value="4">4 màu</option>
              <option value="5">5 màu</option><option value="6">6 màu</option>
              <option value="7">7 màu</option><option value="8">8 màu</option>
            </select>
          </div>

          <StructurePreview />

          {renderLayerSelect('Lớp 1', 'layer1Id', false)}
          {renderLayerSelect('Lớp 2', 'layer2Id', !input.layer1Id)}
          {renderLayerSelect('Lớp 3', 'layer3Id', !input.layer2Id)}
          {renderLayerSelect('Lớp 4', 'layer4Id', !input.layer3Id)}
          {renderLayerSelect('Lớp 5', 'layer5Id', !input.layer4Id)}

          <div className="advanced-toggle" onClick={() => setAdvancedOpen(!advancedOpen)}>
            <span>⚙️ Tùy chỉnh nâng cao</span>
            <span className={`advanced-arrow ${advancedOpen ? 'open' : ''}`}>▸</span>
          </div>

          <div className={`advanced-section ${advancedOpen ? 'open' : ''}`}>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Phủ mực (%)</label>
                <DecimalInput className="form-input" value={input.coverageRatio === 1 ? 0 : Math.round(input.coverageRatio * 100)} placeholder="100" min="0" max="100" onChange={(val: number) => setInput({ coverageRatio: (val === 0 ? 1 : val / 100) })} />
              </div>
            </div>

            <div className="form-row-3" style={{ marginTop: '10px' }}>
              <div className="form-group">
                <label className="form-check"><input type="checkbox" checked={(input as any).hasNhu || false} onChange={e => setInput({ hasNhu: e.target.checked } as any)} /> Nhũ</label>
              </div>
              <div className="form-group">
                <label className="form-check"><input type="checkbox" checked={(input as any).hasMo || false} onChange={e => setInput({ hasMo: e.target.checked } as any)} /> Phủ mờ</label>
              </div>
            </div>

            {input.productType !== 'mang' && (
              <>
                <div className="advanced-sub-title">🎀 Phụ kiện</div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-check"><input type="checkbox" checked={input.hasZipper} onChange={e => setInput({ hasZipper: e.target.checked })} /> Zipper (378đ/m)</label></div>
                  <div className="form-group"><label className="form-check"><input type="checkbox" checked={input.hasTape} onChange={e => setInput({ hasTape: e.target.checked })} /> Băng keo</label></div>
                  <div className="form-group"><label className="form-check"><input type="checkbox" checked={input.hasHandle} onChange={e => setInput({ hasHandle: e.target.checked })} /> Quai</label></div>
                </div>
              </>
            )}

            <div className="advanced-sub-title">🖨️ Trục in</div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Dài (m)</label>
                <DecimalInput className="form-input" step="0.01" value={input.cylLength || 0} onChange={() => { }} disabled />
                {!!input.cylLength && input.cylLength < 0.7 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Dưới tối thiểu (0.7m)</div> : null}
                {!!input.cylLength && input.cylLength > 1.25 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Vượt tối đa (1.25m)</div> : null}
              </div>
              <div className="form-group">
                <label className="form-label">Chu vi (m)</label>
                <DecimalInput className="form-input" step="0.01" value={input.cylCircum || 0} onChange={() => { }} disabled />
                {!!input.cylCircum && input.cylCircum < 0.4 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Dưới tối thiểu (0.4m)</div> : null}
                {!!input.cylCircum && input.cylCircum > 0.9 ? <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>⚠️ Vượt tối đa (0.9m)</div> : null}
              </div>
              <div className="form-group">
                <label className="form-label">Đơn giá (đ/m²)</label>
                <FormattedNumberInput className="form-input" value={input.cylUnitPrice || 0} onChange={(val: number) => setInput({ cylUnitPrice: val })} />
              </div>
            </div>
            <div className="cylinder-preview">
              DT: <span className="cyl-val">{((input.cylLength || 0) * (input.cylCircum || 0)).toFixed(4)} m²</span>
              {' · '} 1 trục: <span className="cyl-val">{(((input.cylLength || 0) * (input.cylCircum || 0) * (input.cylUnitPrice || 7300000)) || 0).toLocaleString('vi-VN')} đ</span>
              {' · '} Cả bộ ({input.numColors || 0} màu): <span className="cyl-val">{(((input.cylLength || 0) * (input.cylCircum || 0) * (input.cylUnitPrice || 7300000) * (input.numColors || 0)) || 0).toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="advanced-sub-title">📦 Đóng gói & Vận chuyển</div>
            {input.productType === 'mang' ? (
              <div className="form-group">
                <label className="form-label">Đóng gói (đ/cuộn)</label>
                <FormattedNumberInput className="form-input" value={input.boxPrice || 0} onChange={(val: number) => setInput({ boxPrice: val })} />
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Túi/thùng</label>
                  <FormattedNumberInput className="form-input" value={input.bagsPerBox || 0} onChange={(val: number) => setInput({ bagsPerBox: val })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá thùng (đ)</label>
                  <FormattedNumberInput className="form-input" value={input.boxPrice || 0} onChange={(val: number) => setInput({ boxPrice: val })} />
                </div>
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vận chuyển (đ/km)</label>
                <FormattedNumberInput className="form-input" value={input.shippingPerKm || 0} onChange={(val: number) => setInput({ shippingPerKm: val })} />
              </div>
              <div className="form-group">
                <label className="form-label">Khoảng cách (km)</label>
                <DecimalInput className="form-input" value={input.shippingKm || 0} onChange={(val: number) => setInput({ shippingKm: val })} />
              </div>
            </div>

            <div className="advanced-sub-title">⏳ Thanh toán</div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Ngày giải ngân</label>
              {[
                { days: 14, defaultRate: 0.1 },
                { days: 30, defaultRate: 0.25 },
                { days: 90, defaultRate: 0.75 }
              ].map(term => (
                <div key={term.days} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-check" style={{ marginBottom: 0 }}>
                    <input type="radio" checked={paymentDaysLocal === term.days} onChange={() => setInput({ paymentDays: term.days, paymentInterestRate: term.defaultRate / 100 })} /> {term.days} ngày
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DecimalInput step="0.01" className="form-input"
                      value={paymentDaysLocal === term.days ? parseFloat((input.paymentInterestRate * 100).toFixed(2)) : term.defaultRate}
                      onChange={(val: number) => paymentDaysLocal === term.days && setInput({ paymentInterestRate: val / 100 })}
                      style={{ width: '70px', textAlign: 'right', marginBottom: 0 }}
                      disabled={paymentDaysLocal !== term.days} />
                    <span style={{ fontSize: '0.8em', color: 'var(--muted)' }}>%</span>
                  </div>
                </div>
              ))}
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
            addCurrentToHistory();
            const unitLabel = input.productType === 'mang' ? 'm²' : 'túi';
            alert(`Giá đề xuất: ${Math.round(result.finalPrice).toLocaleString('vi-VN')} đ/${unitLabel}`);
          }}
        >
          ⚡ Tính Giá
        </button>
      </div>

      <div className="quick-actions">
        <button className="btn btn-sm btn-outline" onClick={handleReset}>🔄 Reset</button>
        <button className="btn btn-sm btn-outline" onClick={handleCopy}>📋 Copy</button>
      </div>
    </div>
  );
}
