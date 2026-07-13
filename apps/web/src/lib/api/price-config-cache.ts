import {
  layPriceConfigTheoIdsService,
  type PriceConfigApi,
} from './service-lts';

/** Cache RAM — seed từ latest-version + by-ids; tránh 429 khi mở nhiều sheet. */
const cache = new Map<string, PriceConfigApi>();

export function seedPriceConfigCache(list: PriceConfigApi[]): void {
  for (const pc of list) {
    if (pc?.id) cache.set(pc.id, pc);
  }
}

export function getPriceConfigFromCache(id: string): PriceConfigApi | undefined {
  return cache.get(id);
}

export function clearPriceConfigCache(): void {
  cache.clear();
}

export async function layConfigsTheoIdsCoCache(
  ids: string[],
  token?: string,
): Promise<PriceConfigApi[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];

  const missing = unique.filter((id) => !cache.has(id));
  if (missing.length) {
    const fetched = await layPriceConfigTheoIdsService(missing, token);
    seedPriceConfigCache(fetched);
  }

  return unique
    .map((id) => cache.get(id))
    .filter((pc): pc is PriceConfigApi => !!pc);
}
