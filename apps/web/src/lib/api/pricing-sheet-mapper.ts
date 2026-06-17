// ═════════════════════════════════════════════════════════════════════════════
// Mapper: HistoryItem (local) → payload POST /pricing-sheet
// ═════════════════════════════════════════════════════════════════════════════
//
// Quy ước lưu trữ:
// - inputValue   : nguyên CalculateInput (HistoryItem.input). Server lưu blob,
//                  frontend tự tính lại kết quả khi tải về.
// - saleResult   : bảng ghi đè của Sale  (HistoryItem.saleOverrides).
// - masterResult : bảng ghi đè của Admin (HistoryItem.adminOverrides).
//
// Override là quyết định thủ công của người dùng nên KHÔNG tính lại được →
// bắt buộc lưu. Bảng rỗng được map thành `undefined` để không gửi key thừa.

import type { HistoryItem } from '../types';
import type { TaoPricingSheetInput } from './service-lts';

function bangGhiDeCoGiaTri(table: HistoryItem['saleOverrides']): unknown | undefined {
  if (!table) return undefined;
  return Object.keys(table).length > 0 ? table : undefined;
}

export function mapHistoryToPricingSheet(
  h: HistoryItem,
  customerCodeName: string,
  note?: string,
): TaoPricingSheetInput {
  return {
    pricingSheetName: h.productName,
    customerCodeName,
    inputValue: h.input,
    saleResult: bangGhiDeCoGiaTri(h.saleOverrides),
    masterResult: bangGhiDeCoGiaTri(h.adminOverrides),
    note: note?.trim() ? note.trim() : undefined,
  };
}
