/**
 * Rút gọn chuỗi cấu trúc vật liệu cho hiển thị báo giá.
 * Ví dụ:
 *   "LLDPE (gạo) 50 // PET 12" → "LLDPE//PET"
 *   "PET / PA / LLDPE_GAO"     → "PET/PA/LLDPE"
 */

/**
 * Chuẩn hóa tên gốc VL (giữ mic gắn riêng sau).
 * "LLDPE thường" / "LLDPE (gạo)" / "LLDPE_GAO" → "LLDPE"
 */
export function normalizeMaterialBaseName(name: string): string {
  return (name || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\bLLDPE_[A-Za-z0-9_]+/gi, "LLDPE")
    .replace(/\bLLDPE\s+\S+/gi, "LLDPE")
    // PA variants (PA 0-3/4-6/7-9 màu + id PA_0_3/PA_4_6/PA_7_9) — chuẩn hóa về "PA"
    // khớp pattern LLDPE. Khi có variant mới, thêm vào white-list.
    .replace(/\bPA\s+(?:0-3|4-6|7-9)\s+m[àa]u/gi, "PA")
    .replace(/\bPA_[A-Za-z0-9_]+/gi, "PA")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function boSoCauTruc(s: string): string {
  return normalizeMaterialBaseName(s || "")
    // Bỏ số mic
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

/**
 * Cấu trúc MẶT TRƯỚC cho wizard báo giá — build từ layer IDs, bỏ notation
 * web ghép `[A + B]` của engine (đơn 2 mặt: alt = mặt sau, không phải lớp ghép).
 * Trả null nếu đơn không phải 2 mặt hoặc material id không resolve được.
 */
export function cauTrucMatTrucTuLop(
  materials: MatLite[],
  input: {
    layer1Id?: string | null;
    layer2Id?: string | null;
    layer2AltId?: string | null;
    layer3Id?: string | null;
    layer4Id?: string | null;
    layer5Id?: string | null;
  },
): string | null {
  if (!input.layer2Id || !input.layer2AltId) return null;
  const ids = [input.layer1Id, input.layer2Id, input.layer3Id, input.layer4Id, input.layer5Id];
  if (!ids.every((id) => !id || materials.some((m) => m.id === id))) return null;
  return boSoCauTruc(
    buildSideStructureText(
      materials,
      input.layer1Id,
      input.layer2Id,
      input.layer3Id,
      input.layer4Id,
      input.layer5Id,
    ),
  ) || null;
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
