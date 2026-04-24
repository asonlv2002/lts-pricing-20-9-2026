import { Material, ProfitRow, AppConstants } from './types';
// Single source of truth: /data ở root repo (dùng chung cho web + Flutter)
import materialsJson  from '@data/materials.json';
import constantsJson  from '@data/constants.json';
import profitJson     from '@data/profitTable.json';

// ── Materials ────────────────────────────────────────────────────────────────
export const INITIAL_MATERIALS: Material[] = (materialsJson as Omit<Material, 'pricePerM2'>[]).map(m => ({
  ...m,
  pricePerM2: m.pricePerKg * m.thickness * m.density / 1000,
}));

// ── Profit table ─────────────────────────────────────────────────────────────
export const INITIAL_PROFIT_TABLE: ProfitRow[] = profitJson.rows as ProfitRow[];

export const PROFIT_DEFAULT = profitJson.profitDefault;

// ── App constants ─────────────────────────────────────────────────────────────
export const INITIAL_CONSTANTS: AppConstants = {
  ...constantsJson,
  // JSON stores colorSetup keys as strings → convert back to number keys
  colorSetup: Object.fromEntries(
    Object.entries(constantsJson.colorSetup).map(([k, v]) => [Number(k), v])
  ) as Record<number, number>,
};
