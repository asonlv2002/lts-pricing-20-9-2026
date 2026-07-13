/**
 * Rút gọn chuỗi cấu trúc vật liệu cho hiển thị báo giá.
 * Ví dụ:
 *   "LLDPE (gạo) 50 // PET 12" → "LLDPE//PET"
 *   "PET / PA / LLDPE_GAO"     → "PET/PA/LLDPE"
 */

export function boSoCauTruc(s: string): string {
  return (s || "")
    // 1) Bỏ suffix trong ngoặc: "LLDPE (gạo)" → "LLDPE "
    .replace(/\([^)]*\)/g, "")
    // 2) Id dạng LLDPE_GAO, LLDPE_HUT_CHAN_KHONG, …
    .replace(/\bLLDPE_[A-Za-z0-9_]+/gi, "LLDPE")
    // 3) Name suffix còn sót: "LLDPE sữa" → "LLDPE"
    .replace(/\bLLDPE\s+\S+/gi, "LLDPE")
    // 4) Bỏ số mic
    .replace(/\d+/g, "")
    .replace(/\s*\/\/\s*/g, "//")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*\+\s*/g, "+")
    .replace(/\s*\[\s*/g, "[")
    .replace(/\s*\]\s*/g, "]")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Resolve layer id → material.name (fallback id nếu không tìm thấy). */
export function buildStructureFromLayers(
  materials: { id: string; name: string }[],
  layerIds: (string | null | undefined)[],
): string {
  return layerIds
    .filter((id): id is string => !!id)
    .map((id) => materials.find((m) => m.id === id)?.name || id)
    .join(" / ");
}
