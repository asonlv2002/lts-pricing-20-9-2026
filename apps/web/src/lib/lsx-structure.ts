/** Cấu trúc vật liệu dành riêng cho LSX — giữ tên + độ dày mic thực tế. */

import type { CalculateInput } from './types';
import { normalizeMaterialBaseName } from './format-structure';

type MaterialLite = { id: string; name: string; thickness?: number };

export interface LsxStructureMetadata {
  bottomFollows?: 'front' | 'back';
  structureSwapped?: boolean;
}

/** "Matt OPP" + 20 → "Matt OPP20"; "PET 12" + 12 → "PET12". */
export function formatLsxMaterialWithMic(
  materials: MaterialLite[],
  id?: string | null,
  micOverride?: number,
): string {
  if (!id) return '';
  const material = materials.find((m) => m.id === id);
  if (!material) return id;

  const normalized = normalizeMaterialBaseName(material.name) || material.name.trim();
  const base = normalized.replace(/\s*\d+(?:[.,]\d+)?\s*$/u, '').trim();
  const mic = micOverride ?? material.thickness;
  return mic != null && mic > 0 ? `${base}${mic}` : normalized.replace(/\s+/g, ' ').trim();
}

function buildLsxSideStructure(
  materials: MaterialLite[],
  input: CalculateInput,
  layer2Id?: string | null,
): string {
  const mic = input.micOverrides || {};
  return [
    ['layer1Id', input.layer1Id],
    ['layer2Id', layer2Id],
    ['layer3Id', input.layer3Id],
    ['layer4Id', input.layer4Id],
    ['layer5Id', input.layer5Id],
  ]
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([key, id]) => {
      const overrideKey = key === 'layer2Id' && id === input.layer2AltId
        ? 'layer2AltId'
        : key;
      return formatLsxMaterialWithMic(materials, id, mic[overrideKey]);
    })
    .filter(Boolean)
    .join('//');
}

export function formatLsxStructure(
  materials: MaterialLite[],
  input: CalculateInput,
  metadata: LsxStructureMetadata = {},
): string {
  const main = buildLsxSideStructure(materials, input, input.layer2Id);
  if (!input.layer2AltId) return main;

  const alt = buildLsxSideStructure(materials, input, input.layer2AltId);
  const front = metadata.structureSwapped ? alt : main;
  const back = metadata.structureSwapped ? main : alt;

  if (input.bagType === 'dayDung') {
    return metadata.bottomFollows === 'back'
      ? `Mặt trước: ${front}, Mặt sau + Đáy: ${back}`
      : `Mặt trước + Đáy: ${front}, Mặt sau: ${back}`;
  }

  return `Mặt trước: ${front}, Mặt sau: ${back}`;
}
