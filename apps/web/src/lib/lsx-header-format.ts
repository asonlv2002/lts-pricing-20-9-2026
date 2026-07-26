export function formatLsxHeaderDate(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) return '…/…/20…';

  const vietnamese = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vietnamese) {
    const [, day, month, year] = vietnamese;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  return raw;
}
