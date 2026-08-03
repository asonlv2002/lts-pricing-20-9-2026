import type {
  CpsxElectricMachine,
  CpsxUpgradeElectric,
  ElectricPriceSource,
  ElectricTimeSlot,
} from './types';

export function tinhGiaDienTbCong(slots: ElectricTimeSlot[]): number {
  if (!slots.length) return 0;
  const sum = slots.reduce((s, slot) => s + (Number(slot.pricePerKwh) || 0), 0);
  return sum / slots.length;
}

export function tinhGiaDienTbTrongSo(slots: ElectricTimeSlot[]): number {
  let weightSum = 0;
  let weighted = 0;
  for (const slot of slots) {
    const h = Number(slot.hours) || 0;
    const p = Number(slot.pricePerKwh) || 0;
    if (h <= 0) continue;
    weightSum += h;
    weighted += h * p;
  }
  if (weightSum <= 0) return 0;
  return weighted / weightSum;
}

export function tinhDienMoiPhut(
  powerKw: number,
  efficiency: number,
  pricePerKwh: number | null | undefined,
): number | null {
  if (pricePerKwh == null || !Number.isFinite(pricePerKwh)) return null;
  const kw = Number(powerKw) || 0;
  const eff = Number(efficiency) || 0;
  return (kw * eff * pricePerKwh) / 60;
}

export function giaTheoNguon(
  source: ElectricPriceSource,
  slots: ElectricTimeSlot[],
  manualPrice?: number | null,
): number | null {
  if (source === 'average') return tinhGiaDienTbCong(slots);
  if (source === 'weighted') return tinhGiaDienTbTrongSo(slots);
  if (source === 'manual') {
    if (manualPrice == null || !Number.isFinite(manualPrice)) return null;
    return manualPrice;
  }
  return null;
}

/** Sau khi sửa slots: average/weighted recompute; manual giữ nguyên. */
export function dongBoGiaDangApSauSuaSlot(
  state: CpsxUpgradeElectric,
): CpsxUpgradeElectric {
  const src = state.appliedSource;
  if (src === 'average' || src === 'weighted') {
    const next = giaTheoNguon(src, state.slots);
    return { ...state, appliedPricePerKwh: next };
  }
  return state;
}

export function chuanHoaMayDien(
  raw: Partial<CpsxElectricMachine> | undefined,
  fallback: CpsxElectricMachine,
): CpsxElectricMachine {
  return {
    powerKw:
      Number(raw?.powerKw) > 0 ? Number(raw?.powerKw) : fallback.powerKw,
    efficiency:
      Number(raw?.efficiency) > 0 ? Number(raw?.efficiency) : fallback.efficiency,
  };
}

export function chuanHoaCpsxUpgradeElectric(
  raw: Partial<CpsxUpgradeElectric> | undefined,
  fallback: CpsxUpgradeElectric,
): CpsxUpgradeElectric {
  const slots =
    Array.isArray(raw?.slots) && raw!.slots!.length > 0
      ? raw!.slots!.map((s, i) => ({
          id: s.id || `slot_${i + 1}`,
          label: s.label || `Khung ${i + 1}`,
          hours: Number(s.hours) >= 0 ? Number(s.hours) : 0,
          pricePerKwh: Number(s.pricePerKwh) >= 0 ? Number(s.pricePerKwh) : 0,
        }))
      : fallback.slots.map((s) => ({ ...s }));

  const src = raw?.appliedSource;
  let appliedSource: ElectricPriceSource =
    src === 'average' || src === 'weighted' || src === 'manual'
      ? src
      : (fallback.appliedSource ?? 'average');

  let appliedPricePerKwh: number | null =
    raw?.appliedPricePerKwh == null
      ? null
      : Number.isFinite(Number(raw.appliedPricePerKwh))
        ? Number(raw.appliedPricePerKwh)
        : null;

  // Chưa có nguồn hợp lệ → mặc định TB cộng
  if (appliedSource == null) {
    appliedSource = 'average';
  }

  if (
    (appliedSource === 'average' || appliedSource === 'weighted') &&
    (appliedPricePerKwh == null || !Number.isFinite(appliedPricePerKwh))
  ) {
    appliedPricePerKwh = giaTheoNguon(appliedSource, slots);
  } else if (
    appliedSource === 'manual' &&
    (appliedPricePerKwh == null || !Number.isFinite(appliedPricePerKwh))
  ) {
    appliedPricePerKwh = tinhGiaDienTbCong(slots);
  }

  const m = raw?.machines;
  return {
    slots,
    appliedSource,
    appliedPricePerKwh,
    machines: {
      print: chuanHoaMayDien(m?.print, fallback.machines.print),
      laminate: chuanHoaMayDien(m?.laminate, fallback.machines.laminate),
      slit: chuanHoaMayDien(m?.slit, fallback.machines.slit),
      bag: chuanHoaMayDien(m?.bag, fallback.machines.bag),
    },
  };
}
