import type { HistoryItem } from './types';

export function timMucLichSuTheoId(
  history: HistoryItem[],
  id: string | null | undefined,
): HistoryItem | undefined {
  if (!id) return undefined;
  return history.find(h => h.id === id || h.pricingSheetId === id);
}

export function giuMucDangMoKhiTaiServer(
  serverHistory: HistoryItem[],
  currentHistory: HistoryItem[],
  loadedHistoryId: string | null | undefined,
): HistoryItem[] {
  if (!loadedHistoryId) return serverHistory;
  const currentLoaded = timMucLichSuTheoId(currentHistory, loadedHistoryId);
  if (timMucLichSuTheoId(serverHistory, loadedHistoryId)) return serverHistory;
  if (currentLoaded?.pricingSheetId && timMucLichSuTheoId(serverHistory, currentLoaded.pricingSheetId)) return serverHistory;
  if (!currentLoaded) return serverHistory;
  return [currentLoaded, ...serverHistory].slice(0, 200);
}
