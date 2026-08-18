import type {
  AppConstants,
  CpsxUpgradeElectric,
  CpsxUpgradeInk,
  CpsxUpgradeLabor,
  CpsxUpgradeThoiGian,
} from './types';
import { CPSX_UPGRADE_CONSTANT_KEYS } from './api/price-config-mapper';

/** Snapshot CPSX nâng cao gắn vào sheet đã lưu — đóng băng NC/điện/mực/TG. */
export interface PinnedCpsxNangCao {
  cpsxUpgradeLabor?: CpsxUpgradeLabor;
  cpsxUpgradeElectric?: CpsxUpgradeElectric;
  cpsxUpgradeInk?: CpsxUpgradeInk;
  cpsxUpgradeThoiGian?: CpsxUpgradeThoiGian;
}

export function trichCpsxNangCao(hangSo: AppConstants | null | undefined): PinnedCpsxNangCao | undefined {
  if (!hangSo) return undefined;
  const out: PinnedCpsxNangCao = {};
  let co = false;
  for (const key of CPSX_UPGRADE_CONSTANT_KEYS) {
    const v = hangSo[key];
    if (v != null) {
      (out as Record<string, unknown>)[key] = structuredClone(v);
      co = true;
    }
  }
  return co ? out : undefined;
}

/** Ghi đè 4 key CPSX NC từ pin lên hangSo base (materials/LN giữ nguyên). */
export function apCpsxNangCaoVaoHangSo(
  base: AppConstants,
  pin: PinnedCpsxNangCao | null | undefined,
): AppConstants {
  if (!pin) return base;
  const next = { ...base };
  for (const key of CPSX_UPGRADE_CONSTANT_KEYS) {
    const v = pin[key as keyof PinnedCpsxNangCao];
    if (v != null) {
      (next as Record<string, unknown>)[key] = structuredClone(v);
    }
  }
  return next;
}

export function laKeyCpsxNangCao(key: string): boolean {
  return (CPSX_UPGRADE_CONSTANT_KEYS as string[]).includes(key);
}
