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

type MatLite = { id: string; name: string; thickness?: number };

/** Một mặt: name + thickness nối // (giống buildSideStructure BG). */
export function buildSideStructureText(
  materials: MatLite[],
  layer1Id?: string | null,
  layer2Id?: string | null,
  layer3Id?: string | null,
  layer4Id?: string | null,
  layer5Id?: string | null,
): string {
  const parts: string[] = [];
  for (const id of [layer1Id, layer2Id, layer3Id, layer4Id, layer5Id]) {
    if (!id) continue;
    const m = materials.find((mat) => mat.id === id);
    if (!m) {
      parts.push(id);
      continue;
    }
    if (m.thickness != null && m.thickness > 0) {
      parts.push(`${m.name} ${m.thickness}`);
    } else {
      parts.push(m.name);
    }
  }
  return parts.join("//");
}

/** bagSpec fields cần cho nhãn 2 mặt (giống wizard BG). */
export type ChatLieuBagSpecLite = {
  structureBack?: string;
  structureSwapped?: boolean;
  bottomFollows?: "front" | "back";
  bagType?: string;
  hasStructureBack?: boolean;
};

/**
 * Chuỗi "Chất liệu" giống wizard/PDF báo giá:
 * - 1 cấu trúc: PET//MPET//LLDPE
 * - 2 cấu trúc: Mặt trước: …, Mặt sau: … (+ Đáy nếu dayDung)
 */
export function formatChatLieuNhuBaoGia(
  materials: MatLite[],
  input: {
    layer1Id?: string | null;
    layer2Id?: string | null;
    layer2AltId?: string | null;
    layer3Id?: string | null;
    layer4Id?: string | null;
    layer5Id?: string | null;
    bagType?: string;
  },
  bagSpec?: ChatLieuBagSpecLite | null,
): string {
  const frontRaw = buildSideStructureText(
    materials,
    input.layer1Id,
    input.layer2Id,
    input.layer3Id,
    input.layer4Id,
    input.layer5Id,
  );

  const hasDual =
    !!(input.layer2Id && input.layer2AltId) ||
    !!(bagSpec?.structureBack || bagSpec?.hasStructureBack);

  if (!hasDual) {
    return boSoCauTruc(frontRaw);
  }

  const backRaw =
    (bagSpec?.structureBack && bagSpec.structureBack.trim()) ||
    buildSideStructureText(
      materials,
      input.layer1Id,
      input.layer2AltId,
      input.layer3Id,
      input.layer4Id,
      input.layer5Id,
    );

  const swapped = !!bagSpec?.structureSwapped;
  const front = boSoCauTruc(swapped ? backRaw : frontRaw);
  const back = boSoCauTruc(swapped ? frontRaw : backRaw);

  const bagType = bagSpec?.bagType || input.bagType || "";
  if (bagType === "dayDung") {
    const bottomFollows = bagSpec?.bottomFollows === "back" ? "back" : "front";
    if (bottomFollows === "back") {
      return `Mặt trước: ${front}, Mặt sau + Đáy: ${back}`;
    }
    return `Mặt trước + Đáy: ${front}, Mặt sau: ${back}`;
  }

  return `Mặt trước: ${front}, Mặt sau: ${back}`;
}
