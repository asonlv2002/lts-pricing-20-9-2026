import type { Material, OverrideFields, OverrideTable } from './types';

const ROW_LABELS: Record<string, string> = {
  print: 'In',
  'lam-2': 'Ghép L2',
  'lam-3': 'Ghép L3',
  'lam-4': 'Ghép L4',
  'lam-5': 'Ghép L5',
  cut: 'Cắt',
  chia: 'Chia',
  matte: 'Lật mặt',
};

const FIELD_LABELS: Record<string, string> = {
  stage: 'Công đoạn',
  mat: 'Vật liệu',
  materialId: 'Mã vật liệu',
  width: 'Khổ',
  meters: 'Thành phẩm',
  waste: 'Phi hao',
  inputVL: 'Đầu vào VL',
  cpsx: 'CPSX',
  costCPSX: 'Thành tiền CPSX',
  matPrice: 'CP vật liệu',
  costMat: 'Thành tiền CPVL',
  materialName: 'Vật liệu',
  rawMatPrice: 'Giá NVL',
  doDay: 'Độ dày (mic)',
  cpMucKeoPerM2: 'Giá mực, DM, keo',
  thoiGianPhut: 'Thời gian SX',
  cpNhanCongPerPhut: 'Giá nhân công',
  cpDienPerPhut: 'Giá điện',
};

export interface OverrideChangeDisplay {
  key: string;
  label: string;
  value: string;
}

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

function formatOverrideValue(value: unknown): string {
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') return value;
  return String(value ?? '');
}

export function formatMaterialOptionLabel(material: Pick<Material, 'name' | 'thickness'>): string {
  return `${material.name} ${formatNumber(material.thickness)} mic`;
}

export function countOverrideChanges(overrides?: OverrideTable): number {
  if (!overrides) return 0;
  return Object.values(overrides).reduce((sum, row) => {
    if (!row) return sum;
    return sum + Object.entries(row).reduce((rowSum, [field, value]) => {
      if (field === 'materialId') return rowSum;
      if (field !== 'detailOverrides' || !value || typeof value !== 'object') return rowSum + 1;
      return rowSum + Object.values(value as NonNullable<OverrideFields['detailOverrides']>).reduce(
        (detailSum, detail) => detailSum + Object.keys(detail).filter(detailField => detailField !== 'materialId').length,
        0,
      );
    }, 0);
  }, 0);
}

export function listOverrideChanges(overrides?: OverrideTable): OverrideChangeDisplay[] {
  if (!overrides) return [];
  const changes: OverrideChangeDisplay[] = [];
  for (const [rowKey, row] of Object.entries(overrides)) {
    if (!row) continue;
    const rowLabel = ROW_LABELS[rowKey] || rowKey;
    for (const [field, value] of Object.entries(row)) {
      if (field === 'detailOverrides' && value && typeof value === 'object') {
        for (const [detailIndex, detail] of Object.entries(value as NonNullable<OverrideFields['detailOverrides']>)) {
          for (const [detailField, detailValue] of Object.entries(detail)) {
            if (detailField === 'materialId') continue;
            changes.push({
              key: `${rowKey}-detail-${detailIndex}-${detailField}`,
              label: `${rowLabel} · Dòng ${Number(detailIndex) + 1} · ${FIELD_LABELS[detailField] || detailField}`,
              value: formatOverrideValue(detailValue),
            });
          }
        }
        continue;
      }
      if (field === 'materialId') continue;
      changes.push({
        key: `${rowKey}-${field}`,
        label: `${rowLabel} · ${FIELD_LABELS[field] || field}`,
        value: formatOverrideValue(value),
      });
    }
  }
  return changes;
}
