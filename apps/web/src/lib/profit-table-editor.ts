import type { ProfitRow } from './types';

export function commitProfitThresholdDraft(rows: ProfitRow[], index: number, draft: string) {
  const current = rows[index];
  if (!current) return { rows, changed: false };

  const parsed = Number(draft.replace(/\D/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return { rows, changed: false };

  const min = index === 0 ? 1 : (rows[index - 1]?.threshold ?? 0) + 1;
  const max = index < rows.length - 1 ? (rows[index + 1]?.threshold ?? Number.MAX_SAFE_INTEGER) - 1 : Number.MAX_SAFE_INTEGER;
  const threshold = Math.max(min, Math.min(max, Math.round(parsed)));
  if (threshold === current.threshold) return { rows, changed: false };

  const nextRows = [...rows];
  nextRows[index] = { ...current, threshold };
  return { rows: nextRows, changed: true };
}

export function removeLastAddedProfitRow(rows: ProfitRow[], initialLength: number) {
  if (rows.length <= initialLength) return rows;
  return rows.slice(0, -1);
}
