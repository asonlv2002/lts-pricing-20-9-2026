import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { ConfigSnapshot, ConfigScope, AppConstants } from '../../lib/types';
import type { PolicyCode } from '../../lib/api/service-lts';
import { INITIAL_CONFIG_SNAPSHOTS } from '../../lib/data';
import { luuLocalStorage, LS_CONFIG_SNAPSHOTS } from '../helpers';
import {
  upsertPriceConfigService,
  upsertProductionUpgradePriceConfigService,
  layLichSuPriceConfigService,
  layPriceConfigMoiNhatService,
  xoaPriceConfigService,
  type PriceConfigApi,
} from '../../lib/api/service-lts';
import {
  scopeToConfigName,
  configNameToScope,
  trichXuatDuLieuScope,
  priceConfigToSnapshot,
  gopCpsxUpgradeChoMigrate,
  layConstantKeysTheoScope,
  chonPhienBanMoiNhat,
  ganKeysScopeTuSnapshot,
} from '../../lib/api/price-config-mapper';
import { seedPriceConfigCache } from '../../lib/api/price-config-cache';

const CAC_SCOPE_CAU_HINH: ConfigScope[] = [
  'materials', 'production', 'productionUpgrade', 'profit', 'surcharges', 'interest', 'waste', 'outsource',
];

/** Dedupe mount + login effect cùng lúc gọi bootstrap. */
let bootstrapCauHinhInFlight: Promise<void> | null = null;

export interface ConfigVersioningSlice {
  configSnapshots: ConfigSnapshot[];
  dangLuuPhienBan: boolean;
  dangTaiPhienBan: boolean;
  /** Bootstrap latest-version (CPSX NC + scopes khác) — tách khỏi dangTaiPhienBan. */
  dangTaiCauHinhMoiNhat: boolean;
  dangXemPhienBan: boolean;
  phienBanDangXemId: string | null;
  /** Policies CPSX nâng cao của user hiện tại (từ GET /price-config/production-upgrade/latest).
   *  Share cho TrangCauHinh gate nút lưu + CpsxNangCapTrang render từng section. */
  cpsxNangCapPolicies: PolicyCode[];
  /** True khi đang fetch cpsxNangCapPolicies (phân biệt user không có quyền vs chưa load xong). */
  dangTaiCpsxNangCapPolicies: boolean;

  taiPhienBanDinhMuc: (data: ConfigSnapshot[]) => void;
  taoPhienBanDinhMuc: (params: { scope: ConfigScope; name?: string; effectiveMode: 'date' | 'month'; effectiveFrom: string }) => Promise<void>;
  xoaPhienBanDinhMuc: (id: string) => Promise<{ success: true } | { success: false; pricingSheetNames: string[] }>;
  xemPhienBanDinhMuc: (id: string) => void;
  saoChepPhienBanDinhMuc: (id: string) => void;
  thoatXemPhienBan: () => void;
  taiLichSuPhienBanTuServer: (scope: ConfigScope) => Promise<void>;
  /** Bootstrap: 1 request latest-version thay vì N× history. */
  taiCauHinhMoiNhatTuServer: () => Promise<void>;
  datCpsxNangCapPolicies: (policies: PolicyCode[]) => void;
}

/** Sort list UI: version server trước, rồi thời điểm, rồi tháng hiệu lực. */
const sapXepTheoHieuLuc = (snapshots: ConfigSnapshot[]) =>
  [...snapshots].sort((a, b) => {
    const va = Number(a.version) || 0;
    const vb = Number(b.version) || 0;
    if (vb !== va) return vb - va;
    const ta = String(a.updatedAt || a.createdAt || '');
    const tb = String(b.updatedAt || b.createdAt || '');
    if (tb !== ta) return tb.localeCompare(ta);
    return b.effectiveFrom.localeCompare(a.effectiveFrom);
  });

// Scope labels (ASCII-safe for server logs)
const SCOPE_LABEL: Record<ConfigScope, string> = {
  materials: 'Vat lieu & gia kho nho',
  production: 'Chi phi san xuat',
  productionUpgrade: 'CPSX nang cao',
  profit: 'Bang loi nhuan',
  surcharges: 'Phu phi & phu kien',
  interest: 'Lai vay cong no',
  waste: 'Tham so hao hut',
  outsource: 'Gia cong ngoai',
};

/** Mirror price-config-mapper — xem/phien ban apply theo key scope */
const SCOPE_CONSTANT_KEYS: Record<ConfigScope, (keyof AppConstants)[]> = {
  materials: layConstantKeysTheoScope('materials'),
  production: layConstantKeysTheoScope('production'),
  productionUpgrade: layConstantKeysTheoScope('productionUpgrade'),
  profit: [],
  surcharges: layConstantKeysTheoScope('surcharges'),
  interest: layConstantKeysTheoScope('interest'),
  waste: layConstantKeysTheoScope('waste'),
  outsource: [],
};

function taoSnapshotLocal(
  scope: ConfigScope,
  name: string | undefined,
  effectiveMode: 'date' | 'month',
  effectiveFrom: string,
  state: { materials: ConfigSnapshot['materials']; smallWidthPrices: ConfigSnapshot['smallWidthPrices']; constants: ConfigSnapshot['constants']; profitTable: ConfigSnapshot['profitTable'] },
): ConfigSnapshot {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    scope,
    name: name?.trim() || undefined,
    effectiveMode,
    effectiveFrom,
    createdAt: now,
    updatedAt: now,
    materials: structuredClone(state.materials),
    smallWidthPrices: structuredClone(state.smallWidthPrices),
    constants: structuredClone(state.constants),
    profitTable: structuredClone(state.profitTable),
  };
}

export const createConfigVersioningSlice: StateCreator<CuaHangTinhGia, [], [], ConfigVersioningSlice> = (set, get) => ({
  configSnapshots: INITIAL_CONFIG_SNAPSHOTS,
  dangLuuPhienBan: false,
  dangTaiPhienBan: false,
  dangTaiCauHinhMoiNhat: false,
  dangXemPhienBan: false,
  phienBanDangXemId: null,
  cpsxNangCapPolicies: [],
  dangTaiCpsxNangCapPolicies: false,

  datCpsxNangCapPolicies: (policies) => set({ cpsxNangCapPolicies: policies, dangTaiCpsxNangCapPolicies: false }),

  taiPhienBanDinhMuc: (data) => set({ configSnapshots: sapXepTheoHieuLuc(data) }),

  taoPhienBanDinhMuc: async ({ scope, name, effectiveMode, effectiveFrom }) => {
    const state = get();
    const token = state.accessToken;

    if (state.isAuthenticated && token) {
      set({ dangLuuPhienBan: true });
      try {
        const configName = scopeToConfigName(scope);
        const scopeData = trichXuatDuLieuScope(scope, {
          materials: state.materials,
          smallWidthPrices: state.smallWidthPrices,
          constants: state.constants,
          profitTable: state.profitTable,
        });

        const inputValue = {
          name: name?.trim() || undefined,
          effectiveMode,
          effectiveFrom,
          ...scopeData,
        };

        // CPSX nâng cao: route mới PUT /price-config/production-upgrade (BE 3cc0a4e, auth-only).
        // Scope khác: giữ POST /price-config chung.
        const priceConfig = scope === 'productionUpgrade'
          ? await upsertProductionUpgradePriceConfigService(token, { inputValue })
          : await upsertPriceConfigService({ configName, inputValue }, token);

        await get().taiLichSuPhienBanTuServer(scope);

        // Chốt working config = bản vừa lưu / mới nhất theo version server
        const afterSave = get();
        const sameScope = afterSave.configSnapshots.filter(
          (sn) => (sn.scope ?? 'materials') === scope,
        );
        const moiNhat =
          sameScope.find((sn) => sn.id === priceConfig.id) ??
          chonPhienBanMoiNhat(sameScope);
        if (moiNhat) {
          afterSave.saoChepPhienBanDinhMuc(moiNhat.id);
          get().luuSessionConfigSnapshot();
        }

        set({ dangLuuPhienBan: false });

        return;
      } catch (e) {
        console.warn('Luu phien ban len server that bai, fallback localStorage:', e);
        set({ dangLuuPhienBan: false });
      }
    }

    const snapshot = taoSnapshotLocal(scope, name, effectiveMode, effectiveFrom, state);
    set((s) => {
      const configSnapshots = sapXepTheoHieuLuc([snapshot, ...s.configSnapshots]);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      return { configSnapshots };
    });
  },

  taiLichSuPhienBanTuServer: async (scope) => {
    const state = get();
    const token = state.accessToken;
    if (!state.isAuthenticated || !token) return;

    set({ dangTaiPhienBan: true });
    try {
      const configName = scopeToConfigName(scope);
      const versions = await layLichSuPriceConfigService(configName, token);

      // fallback live — tránh gộp constants stale vào snapshot
      const live = get();
      const snapshots = versions.map((pc: PriceConfigApi) =>
        priceConfigToSnapshot(pc, scope, {
          materials: live.materials,
          smallWidthPrices: live.smallWidthPrices,
          constants: live.constants,
          profitTable: live.profitTable,
        }),
      );

      set((s) => {
        const otherScopes = s.configSnapshots.filter(snap => snap.scope !== scope);
        const merged = sapXepTheoHieuLuc([...snapshots, ...otherScopes]);
        luuLocalStorage(LS_CONFIG_SNAPSHOTS, merged);
        return { configSnapshots: merged, dangTaiPhienBan: false };
      });

      // Giống nút Xem bản mới nhất: history load xong → apply working config
      // (F5/bootstrap race thường để constants = DEFAULT trong khi list đã đúng BE)
      if (!get().dangXemPhienBan) {
        const sameScope = get().configSnapshots.filter(
          (sn) => (sn.scope ?? 'materials') === scope,
        );
        const latest = chonPhienBanMoiNhat(sameScope);
        if (latest) {
          get().saoChepPhienBanDinhMuc(latest.id);
          if (scope === 'productionUpgrade') {
            get().luuSessionConfigSnapshot();
          }
        }
      }
    } catch (e) {
      console.warn('Tai lich su phien ban tu server that bai:', e);
      set({ dangTaiPhienBan: false });
    }
  },

  taiCauHinhMoiNhatTuServer: async () => {
    if (bootstrapCauHinhInFlight) return bootstrapCauHinhInFlight;

    const run = async () => {
      const state = get();
      const token = state.accessToken;
      if (!state.isAuthenticated || !token) {
        set({ dangTaiCauHinhMoiNhat: false });
        return;
      }

      set({ dangTaiCauHinhMoiNhat: true });
      try {
        // Parallel: latest 1 bản/scope + full history CPSX NC (cùng nguồn nút Xem)
        const [listRaw, upgradeHistoryRaw] = await Promise.all([
          layPriceConfigMoiNhatService(token),
          layLichSuPriceConfigService('PRODUCTION_UPGRADE', token).catch((err) => {
            console.warn('Tai lich su PRODUCTION_UPGRADE that bai:', err);
            return null as PriceConfigApi[] | null;
          }),
        ]);
        let list = listRaw;
        const upgradeHistoryOk = Array.isArray(upgradeHistoryRaw);
        let upgradeHistory: PriceConfigApi[] = upgradeHistoryOk ? upgradeHistoryRaw! : [];

        // Migrate-on-read: chưa có PRODUCTION_UPGRADE (latest + history rỗng)
        // → chỉ tách key NC CÓ TRONG blob PRODUCTION (không gộp session/DEFAULT).
        const coUpgrade =
          list.some((pc) => pc.configName === 'PRODUCTION_UPGRADE')
          || upgradeHistory.length > 0;
        if (!coUpgrade) {
          const prodLatest = list.find((pc) => pc.configName === 'PRODUCTION');
          const payload = gopCpsxUpgradeChoMigrate(prodLatest?.inputValue);
          if (payload) {
            try {
              const nowMonth = new Date().toISOString().slice(0, 7);
              const created = await upsertProductionUpgradePriceConfigService(
                token,
                {
                  inputValue: {
                    name: 'Migrate tu PRODUCTION',
                    effectiveMode: 'month',
                    effectiveFrom: nowMonth,
                    ...payload,
                  },
                },
              );
              list = [...list.filter((pc) => pc.configName !== 'PRODUCTION_UPGRADE'), created];
              upgradeHistory = [created];
            } catch (migErr) {
              console.warn('Migrate PRODUCTION_UPGRADE that bai (tiep tuc khong UPGRADE):', migErr);
            }
          }
        }

        // Cache: latest + toàn bộ history UPGRADE (pin sheet / by-ids)
        const cacheList = [
          ...list,
          ...upgradeHistory.filter((u) => !list.some((l) => l.id === u.id)),
        ];
        seedPriceConfigCache(cacheList);

        const live = get();
        const fallback = {
          materials: live.materials,
          smallWidthPrices: live.smallWidthPrices,
          constants: live.constants,
          profitTable: live.profitTable,
        };

        // Scopes khác: 1 bản latest. CPSX NC: full history (giống Xem).
        const snapshotsKhac = list
          .filter((pc) => pc.configName !== 'PRODUCTION_UPGRADE')
          .map((pc) => {
            const scope = configNameToScope(pc.configName);
            if (!scope) return null;
            return priceConfigToSnapshot(pc, scope, fallback) as ConfigSnapshot;
          })
          .filter((s): s is ConfigSnapshot => s !== null);

        const snapshotsUpgrade = (
          upgradeHistoryOk || upgradeHistory.length > 0
            ? upgradeHistory
            : list.filter((pc) => pc.configName === 'PRODUCTION_UPGRADE')
        ).map(
          (pc) =>
            priceConfigToSnapshot(pc, 'productionUpgrade', fallback) as ConfigSnapshot,
        );

        // Scope đã có data server → thay hẳn, không giữ local stale cùng scope
        const serverScopes = new Set<ConfigScope>();
        for (const sn of snapshotsKhac) {
          serverScopes.add((sn.scope ?? 'materials') as ConfigScope);
        }
        if (upgradeHistoryOk || snapshotsUpgrade.length > 0) {
          serverScopes.add('productionUpgrade');
        }

        set((s) => {
          const others = s.configSnapshots.filter(
            (sn) => !serverScopes.has((sn.scope ?? 'materials') as ConfigScope),
          );
          const merged = sapXepTheoHieuLuc([
            ...snapshotsKhac,
            ...snapshotsUpgrade,
            ...others,
          ]);
          luuLocalStorage(LS_CONFIG_SNAPSHOTS, merged);
          return { configSnapshots: merged };
        });

        const after = get();
        // Apply theo thứ tự: production trước, productionUpgrade sau (4 key NC)
        for (const scope of CAC_SCOPE_CAU_HINH) {
          const candidates = after.configSnapshots.filter(
            (sn) => (sn.scope ?? 'materials') === scope,
          );
          const latest = chonPhienBanMoiNhat(candidates);
          if (latest) after.saoChepPhienBanDinhMuc(latest.id);
        }
        // Snapshot session sau khi apply latest — pin sheet restore về đây
        get().luuSessionConfigSnapshot();
      } catch (e) {
        console.warn('Tải cấu hình mới nhất thất bại:', e);
      } finally {
        set({ dangTaiCauHinhMoiNhat: false });
      }
    };

    bootstrapCauHinhInFlight = run().finally(() => {
      bootstrapCauHinhInFlight = null;
    });
    return bootstrapCauHinhInFlight;
  },

  xoaPhienBanDinhMuc: async (id) => {
    const state = get();
    const token = state.accessToken;

    if (state.isAuthenticated && token) {
      const ketQua = await xoaPriceConfigService(id, token);
      if (ketQua.success) {
        set((s) => {
          const configSnapshots = s.configSnapshots.filter(snapshot => snapshot.id !== id);
          luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
          return { configSnapshots };
        });
      }
      return ketQua;
    }

    set((s) => {
      const configSnapshots = s.configSnapshots.filter(snapshot => snapshot.id !== id);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      return { configSnapshots };
    });
    return { success: true as const };
  },

  xemPhienBanDinhMuc: (id) => {
    const state = get();
    const snapshot = state.configSnapshots.find(item => item.id === id);
    if (!snapshot) return;

    const scope = snapshot.scope ?? 'materials';
    const keys = SCOPE_CONSTANT_KEYS[scope] ?? [];

    if (scope === 'materials') {
      state.replaceFullConfig({
        materials: structuredClone(snapshot.materials),
        smallWidthPrices: structuredClone(snapshot.smallWidthPrices),
        // Giá Zipper thuộc scope materials — apply theo key từ mapper
        constants: ganKeysScopeTuSnapshot(state.constants, snapshot.constants, keys),
        profitTable: state.profitTable,
      });
    } else if (scope === 'profit') {
      state.replaceFullConfig({
        materials: state.materials,
        smallWidthPrices: state.smallWidthPrices,
        constants: state.constants,
        profitTable: structuredClone(snapshot.profitTable),
      });
    } else if (keys.length > 0) {
      const constantsMoi = ganKeysScopeTuSnapshot(state.constants, snapshot.constants, keys);
      state.replaceFullConfig({
        materials: state.materials,
        smallWidthPrices: state.smallWidthPrices,
        constants: constantsMoi,
        profitTable: state.profitTable,
      });
    }

    set({ dangXemPhienBan: true, phienBanDangXemId: id });
  },

  saoChepPhienBanDinhMuc: (id) => {
    const state = get();
    const snapshot = state.configSnapshots.find(item => item.id === id);
    if (!snapshot) return;

    const scope = snapshot.scope ?? 'materials';
    const keys = SCOPE_CONSTANT_KEYS[scope] ?? [];

    if (scope === 'materials') {
      state.replaceFullConfig({
        materials: structuredClone(snapshot.materials),
        smallWidthPrices: structuredClone(snapshot.smallWidthPrices),
        // Giá Zipper thuộc scope materials — apply theo key từ mapper
        constants: ganKeysScopeTuSnapshot(state.constants, snapshot.constants, keys),
        profitTable: state.profitTable,
      });
    } else if (scope === 'profit') {
      state.replaceFullConfig({
        materials: state.materials,
        smallWidthPrices: state.smallWidthPrices,
        constants: state.constants,
        profitTable: structuredClone(snapshot.profitTable),
      });
    } else if (keys.length > 0) {
      const constantsMoi = ganKeysScopeTuSnapshot(state.constants, snapshot.constants, keys);
      state.replaceFullConfig({
        materials: state.materials,
        smallWidthPrices: state.smallWidthPrices,
        constants: constantsMoi,
        profitTable: state.profitTable,
      });
    }

    set({ dangXemPhienBan: false, phienBanDangXemId: null });
  },

  thoatXemPhienBan: () => {
    const state = get();
    const phienBanDangXemId = state.phienBanDangXemId;
    if (!phienBanDangXemId) { set({ dangXemPhienBan: false }); return; }

    const snapshot = state.configSnapshots.find(s => s.id === phienBanDangXemId);
    const scope = snapshot?.scope ?? 'materials';
    const candidates = state.configSnapshots.filter(
      (s) => (s.scope ?? 'materials') === scope,
    );
    const latest = chonPhienBanMoiNhat(candidates);
    if (latest) {
      get().saoChepPhienBanDinhMuc(latest.id);
      get().luuSessionConfigSnapshot();
    } else {
      set({ dangXemPhienBan: false, phienBanDangXemId: null });
    }
  },
});
