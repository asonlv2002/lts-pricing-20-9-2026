export function formatLsxOrderQuantity(
  note: string,
  quantityTolerancePercent: number,
): string {
  if (!note || !quantityTolerancePercent) return note.replace(/\s*\(±\d+(?:[.,]\d+)?%\)/, '');
  const base = note.replace(/\s*\(±\d+(?:[.,]\d+)?%\)/, '');
  return `${base} (±${quantityTolerancePercent}%)`;
}
