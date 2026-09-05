import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { CalculateInput, HistoryItem, QuoteProductLine, QuoteStatus, QuoteTerms } from '../../lib/types';
import { tinhBaoGia, lapDongSanXuat } from '../../lib/manager-calculation';
import { dongBoCotLoiNhuan, tinhDonGiaThuongMaiHieuLuc, tinhGiaThuongMai } from '../../lib/engine';
import { tinhKetQuaNangCaoHieuLuc } from '../../lib/dac-ta-nang-cao';
import {
  layDanhSachPricingSheetService,
  layPricingSheetTheoIdService,
} from '../../lib/api/service-lts';
import {
  mapPricingSheetToHistory,
  mapPricingSheetsToHistory,
  gomPriceConfigIdsTuSheets,
  layCtxChoPricingSheet,
} from '../../lib/api/pricing-sheet-mapper';
import {
  xayEngineCtxTuPriceConfigs,
  lietKePinIdThieu,
  coProductionUpgradeTrongConfigs,
} from '../../lib/api/price-config-mapper';
import { layConfigsTheoIdsCoCache } from '../../lib/api/price-config-cache';
import { giuMucDangMoKhiTaiServer, timMucLichSuTheoId } from '../../lib/history-identity';
import { trichCpsxNangCao, apCpsxNangCaoVaoHangSo } from '../../lib/cpsx-nang-cao-pin';
import { dinhDangDateLegacy } from '../../lib/history-datetime';

export interface HistorySlice {
  history: HistoryItem[];
  loadedHistoryId: string | null;
  originalCustomerLoaded: string | null;

  addCurrentToHistory: () => void;
  removeHistoryItem: (id: string) => void;
  /** Sync load; pin async nếu có priceConfigIds (fire-and-forget apply). */
  loadHistoryItem: (id: string) => void;
  /** Mở sheet + pin config theo priceConfigIds (await). */
  moBangTinhVoiPin: (id: string) => Promise<boolean>;
  taiBangTinhTuServer: (pricingSheetId: string) => Promise<boolean>;
  taiLichSuTuServer: () => Promise<boolean>;
  updateQuoteStatus: (id: string, status: QuoteStatus) => void;
  themHienTaiVaoLichSu: () => void;
  capNhatHienTaiVaoLichSu: () => void;

  saoChepBangTinh: (id: string) => void;
  khoaBaoGia: (id: string) => void;
  moKhoaBaoGia: (id: string) => void;
  huyBaoGia: (id: string) => void;
  kiemTraHetHan: () => void;
  capNhatDieuKhoan: (id: string, terms: QuoteTerms) => void;
  phanCongBaoGia: (quoteId: string, sellerId: string, sellerName: string) => void;
  ganTiersBaoGia: (quoteId: string, tiers: { historyItemId: string; quantity: number; finalPrice: number; chotGia?: number }[]) => void;
  taoBaoGiaMoi: (payload: {
    customer: string;
    products: QuoteProductLine[];
    terms: QuoteTerms;
    sendForApproval: boolean;
    quotationId?: string;
  }) => string | null;
  patchHistoryItem: (id: string, patch: Partial<Pick<HistoryItem, 'customer' | 'productName' | 'chotGia' | 'quoteStatus' | 'quotationId'>>) => void;
}

function tinhNgayHieuLuc(terms?: QuoteTerms): string | undefined {
  if (!terms || terms.validityDays <= 0) return undefined;
  return new Date(Date.now() + terms.validityDays * 86400000).toISOString();
}

/** Dedup concurrent GET pricing-sheet (auth + page mount). */
let dangTaiLichSuPromise: Promise<boolean> | null = null;

// Tìm mã khách hàng (codeName) từ tên khách (display name) trong HistoryItem.
// Đọc từ localStorage LS_CUSTOMERS.
function timMaKhachHang(tenKhach: string): string | null {
  try {
    const raw = localStorage.getItem('lts_customers');
    if (!raw) return null;
    const list = JSON.parse(raw) as Array<{ companyName?: string; contactName?: string; customerCode?: string; id?: string }>;
    const q = (tenKhach || '').trim().toLowerCase();
    if (!q) return null;
    const found = list.find(c => {
      const ten = (c.companyName || c.contactName || c.customerCode || c.id || '').toLowerCase();
      return ten === q || (c.customerCode || '').toLowerCase() === q;
    });
    return found?.customerCode?.trim() || null;
  } catch {
    return null;
  }
}

export const createHistorySlice: StateCreator<CuaHangTinhGia, [], [], HistorySlice> = (set, get) => ({
  history: [],
  loadedHistoryId: null,
  originalCustomerLoaded: null,

  addCurrentToHistory: () => {
    set((state) => {
      if (!state.result) return state;
      const now = new Date();

      // Tính mã khách hàng hiện tại
      const currentCustomerCode = timMaKhachHang(state.input.customer) || null;

      // Tab nâng cấp: giá lưu theo bảng đặc tả nâng cao (có ghi đè dòng).
      // LN% ghi đè Sale/Admin KHÔNG áp vào giá lưu — chỉ preview trong tab;
      // pct vẫn được lưu vào item để trang phụ PDF/tab hiện scenario.
      const laNangCap = !!state.cheDoNangCao;
      const ketQuaLuu = laNangCap
        ? tinhKetQuaNangCaoHieuLuc({
            result: state.result,
            uniRows: lapDongSanXuat(state.result, state.constants).uniRows,
            constants: state.constants,
            materials: state.materials,
            saleOverrides: state.saleOverrides,
            adminOverrides: state.adminOverrides,
            saleProfitRatePct: 0,
            adminProfitRatePct: 0,
            profitTable: state.profitTable,
          }).result
        : state.result;

      // Tính giá Thương mại (mua + LN + Thùng/VC/Lãi vay/HH/Trục/Phụ phí) — khớp panel.
      const giaThuongMai = tinhDonGiaThuongMaiHieuLuc(state.input, state.result);
      const finalPriceHieuLuc = giaThuongMai ?? ketQuaLuu.finalPrice;
      const ketQuaTM = giaThuongMai ? tinhGiaThuongMai(state.input) : null;
      const profitRateHieuLuc = ketQuaTM ? ketQuaTM.profitPct : ketQuaLuu.profitRate;
      const profitAmountHieuLuc = ketQuaTM ? ketQuaTM.profitVnd : ketQuaLuu.profitAmount;

      const isoNow = now.toISOString();
      const item: HistoryItem = {
        id: String(now.getTime()),
        date: dinhDangDateLegacy(now),
        createdAt: isoNow,
        updatedAt: isoNow,
        customer: state.input.customer || 'N/A',
        productName: state.input.productName || 'N/A',
        structure: state.result.structureText,
        quantity: state.input.quantity,
        finalPrice: finalPriceHieuLuc,
        chotGia: state.currentChotGia || undefined,
        profitRate: profitRateHieuLuc,
        profitAmount: profitAmountHieuLuc,
        isQuote: false,
        sellerId: state.currentSellerId,
        sellerName: state.currentSellerName,
        saleOverrides: Object.keys(state.saleOverrides).length > 0 ? state.saleOverrides : undefined,
        adminOverrides: Object.keys(state.adminOverrides).length > 0 ? state.adminOverrides : undefined,
        saleProfitRatePct: state.saleProfitRatePct || undefined,
        adminProfitRatePct: state.adminProfitRatePct || undefined,
        isNangCap: laNangCap || undefined,
        isThuongMai: state.input.pricingMode === 'commercial' || undefined,
        // Sheet NC: đóng băng CPSX nâng cao lúc lưu — không bám session đang sửa sau này
        pinnedCpsxNangCao: laNangCap ? trichCpsxNangCao(state.constants) : undefined,
        input: { ...state.input, isNangCap: laNangCap || undefined },
        originalCustomer: currentCustomerCode ?? undefined,
        // Lưu mới → luôn tạo sheet mới trên server (không copy pricingSheetId từ item cũ)
      };
      const history = [item, ...state.history].slice(0, 200);

      return {
        history,
        isDirty: false,
        loadedHistoryId: item.id,
        originalCustomerLoaded: currentCustomerCode,
      };
    });
  },

  removeHistoryItem: (id) => {
    set((state) => {
      const item = state.history.find(h => h.id === id);
      const history = state.history.filter(h => h.id !== id);

      return { history };
    });
  },

  loadHistoryItem: (id) => {
    void get().moBangTinhVoiPin(id);
  },

  moBangTinhVoiPin: async (id) => {
    const state = get();
    const item = timMucLichSuTheoId(state.history, id);
    if (!item) return false;

    const laNangCap = !!(item.isNangCap || item.input?.isNangCap);
    const laThuongMai = !!(
      item.isThuongMai || item.input?.pricingMode === 'commercial'
    );
    // Apply pin TRƯỚC khi tính result — nâng cao/thường cùng dùng constants đã ghim
    const pinIds = (item.priceConfigIds ?? []).map((x) => String(x).trim()).filter(Boolean);
    let pinCpsxTuCtx = item.pinnedCpsxNangCao;
    if (pinIds.length && state.accessToken) {
      try {
        const configs = await layConfigsTheoIdsCoCache(pinIds, state.accessToken);
        const thieuIds = lietKePinIdThieu(pinIds, configs);
        if (thieuIds.length) {
          console.warn(
            'Pin priceConfigIds thiếu bản ghi (không hydrate đủ — tránh CPSX session latest):',
            thieuIds,
          );
        }
        if (configs.length) {
          const fallback = {
            materials: state.sessionConfigSnapshot?.materials ?? state.materials,
            constants: state.sessionConfigSnapshot?.constants ?? state.constants,
            profitTable: state.sessionConfigSnapshot?.profitTable ?? state.profitTable,
            smallWidthPrices: state.sessionConfigSnapshot?.smallWidthPrices ?? state.smallWidthPrices,
          };
          const ctx = xayEngineCtxTuPriceConfigs(configs, fallback, pinIds);
          get().applyPinnedConfig(ctx, pinIds);
          // Snapshot NC từ ctx pin (server sheet có thể chưa có pinnedCpsxNangCao)
          // Pin hydrate thành công → snapshot NC từ ctx (source of truth, không giữ local stale)
          const snapNc = trichCpsxNangCao(ctx.constants);
          if (snapNc) pinCpsxTuCtx = snapNc;
          if (laNangCap && !coProductionUpgradeTrongConfigs(configs) && !snapNc) {
            console.warn(
              'Sheet NC: pin không có PRODUCTION_UPGRADE / CPSX NC — giá có thể thiếu mực/NC/điện ghim',
              pinIds,
            );
          }
        } else {
          console.warn('Pin priceConfigIds không tải được config, dùng session (có thể lệch CPSX):', pinIds);
          get().restoreSessionConfig();
        }
      } catch (e) {
        console.warn('Không tải được price-config pin, dùng session:', e);
        get().restoreSessionConfig();
      }
    } else {
      if (pinIds.length && !state.accessToken) {
        console.warn('Có pin nhưng chưa đăng nhập — không load được CPSX lúc lưu, dùng session');
      }
      get().restoreSessionConfig();
    }

    const s = get();
    // Sheet NC: 4 key CPSX NC từ snapshot item hoặc vừa hydrate từ pin
    const hangSoSheet = pinCpsxTuCtx
      ? apCpsxNangCaoVaoHangSo(s.constants, pinCpsxTuCtx)
      : s.constants;
    const synced = dongBoCotLoiNhuan({ ...item.input }, s.materials);
    // Ghi snapshot NC vào history nếu thiếu (mở lại sheet server)
    const nextHistory =
      laNangCap && pinCpsxTuCtx && !item.pinnedCpsxNangCao
        ? s.history.map((h) =>
            h.id === item.id || h.pricingSheetId === item.pricingSheetId
              ? { ...h, pinnedCpsxNangCao: pinCpsxTuCtx }
              : h,
          )
        : s.history;
    set({
      history: nextHistory,
      dauVao: synced,
      input: { ...synced, isNangCap: laNangCap || undefined },
      constants: hangSoSheet,
      result: tinhBaoGia(synced, s.materials, hangSoSheet, s.profitTable, s.smallWidthPrices),
      currentChotGia: item.input?.chotGia ?? item.chotGia ?? 0,
      phanBoCongTy: item.input?.phanBoCongTy ?? 0,
      donViPhanBo: item.input?.donViPhanBo ?? 'vnd',
      activeView: 'manager' as const,
      pricingEntry: 'form' as const,
      isDirty: false,
      loadedHistoryId: item.id,
      cheDoNangCao: laNangCap,
      cheDoThuongMai: laThuongMai,
      saleOverrides: item.saleOverrides ?? {},
      adminOverrides: item.adminOverrides ?? {},
      saleProfitRatePct: item.saleProfitRatePct ?? 0,
      adminProfitRatePct: item.adminProfitRatePct ?? 0,
      showSaleOverrides: !!item.saleOverrides && Object.keys(item.saleOverrides).length > 0,
      showAdminOverrides: !!item.adminOverrides && Object.keys(item.adminOverrides).length > 0,
      originalCustomerLoaded: item.originalCustomer ?? timMaKhachHang(item.customer) ?? null,
    });
    return true;
  },

  taiBangTinhTuServer: async (pricingSheetId) => {
    const state = get();
    const token = state.accessToken;
    if (!token) return false;
    try {
      let sheet;
      try {
        sheet = await layPricingSheetTheoIdService(pricingSheetId, token);
      } catch {
        const sheets = await layDanhSachPricingSheetService(token);
        sheet = sheets.find(s => s.id === pricingSheetId);
      }
      if (!sheet) return false;
      const rawInput = sheet.inputValue as CalculateInput | null | undefined;
      if (!rawInput || typeof rawInput !== 'object' || !rawInput.productType) return false;

      const fallback = {
        materials: state.sessionConfigSnapshot?.materials ?? state.materials,
        constants: state.sessionConfigSnapshot?.constants ?? state.constants,
        profitTable: state.sessionConfigSnapshot?.profitTable ?? state.profitTable,
        smallWidthPrices: state.sessionConfigSnapshot?.smallWidthPrices ?? state.smallWidthPrices,
      };
      const pinIds = (sheet.priceConfigIds ?? []).map((x) => String(x).trim()).filter(Boolean);
      let configs: Awaited<ReturnType<typeof layConfigsTheoIdsCoCache>> = [];
      if (pinIds.length) {
        try {
          configs = await layConfigsTheoIdsCoCache(pinIds, token);
          const thieuIds = lietKePinIdThieu(pinIds, configs);
          if (thieuIds.length) {
            console.warn(
              'Pin sheet thiếu bản ghi price-config (tránh CPSX session latest):',
              thieuIds,
            );
          }
          if (configs.length) {
            const ctx = xayEngineCtxTuPriceConfigs(configs, fallback, pinIds);
            get().applyPinnedConfig(ctx, pinIds);
          } else {
            console.warn('Pin sheet không resolve được config, dùng session:', pinIds);
            get().restoreSessionConfig();
          }
        } catch (e) {
          console.warn('Không tải được price-config pin, dùng session:', e);
          get().restoreSessionConfig();
        }
      } else {
        get().restoreSessionConfig();
      }

      // Map history + giá bằng ctx pin (không dùng latest session)
      const ctxMap = layCtxChoPricingSheet(sheet, fallback, configs);
      const syncedInput = dongBoCotLoiNhuan({ ...rawInput }, ctxMap.materials);
      const mapped = mapPricingSheetToHistory(sheet, ctxMap);
      const laNangCap = !!(mapped?.isNangCap || rawInput.isNangCap);
      const laThuongMai = !!(
        mapped?.isThuongMai || rawInput.pricingMode === 'commercial'
      );
      if (laNangCap && pinIds.length && !coProductionUpgradeTrongConfigs(configs) && !mapped?.pinnedCpsxNangCao) {
        console.warn(
          'Sheet NC từ server: pin không hydrate CPSX nâng cao — kiểm tra PRODUCTION_UPGRADE trong priceConfigIds',
          pinIds,
        );
      }
      // hangSo = ctx pin (+ snapshot NC nếu có) — không lấy s.constants session
      const hangSoSheet = mapped?.pinnedCpsxNangCao
        ? apCpsxNangCaoVaoHangSo(ctxMap.constants, mapped.pinnedCpsxNangCao)
        : ctxMap.constants;

      set((prev) => {
        let nextHistory = prev.history;
        if (mapped) {
          const idx = prev.history.findIndex(
            (h) => h.id === mapped.id || h.pricingSheetId === mapped.id,
          );
          nextHistory =
            idx >= 0
              ? prev.history.map((h, i) => (i === idx ? { ...h, ...mapped } : h))
              : [mapped, ...prev.history].slice(0, 200);
        }
        return {
          history: nextHistory,
          materials: ctxMap.materials,
          constants: hangSoSheet,
          profitTable: ctxMap.profitTable,
          smallWidthPrices: ctxMap.smallWidthPrices,
          dauVao: syncedInput,
          input: { ...syncedInput, isNangCap: laNangCap || undefined },
          result: tinhBaoGia(
            syncedInput,
            ctxMap.materials,
            hangSoSheet,
            ctxMap.profitTable,
            ctxMap.smallWidthPrices,
          ),
          currentChotGia: syncedInput.chotGia || 0,
          phanBoCongTy: syncedInput.phanBoCongTy ?? 0,
          donViPhanBo: syncedInput.donViPhanBo ?? 'vnd',
          activeView: 'manager' as const,
          pricingEntry: 'form' as const,
          isDirty: false,
          loadedHistoryId: sheet.id,
          cheDoNangCao: laNangCap,
          cheDoThuongMai: laThuongMai,
          originalCustomerLoaded: sheet.customerCodeName || sheet.customer?.codeName || null,
          saleOverrides: mapped?.saleOverrides ?? {},
          adminOverrides: mapped?.adminOverrides ?? {},
          saleProfitRatePct: mapped?.saleProfitRatePct ?? 0,
          adminProfitRatePct: mapped?.adminProfitRatePct ?? 0,
          showSaleOverrides: !!(mapped?.saleOverrides && Object.keys(mapped.saleOverrides).length > 0),
          showAdminOverrides: !!(mapped?.adminOverrides && Object.keys(mapped.adminOverrides).length > 0),
        };
      });
      return true;
    } catch {
      return false;
    }
  },

  taiLichSuTuServer: async () => {
    if (dangTaiLichSuPromise) return dangTaiLichSuPromise;
    dangTaiLichSuPromise = (async () => {
      const state = get();
      const token = state.accessToken;
      if (!token) return false;
      try {
        const sheets = await layDanhSachPricingSheetService(token);
        // Session = fallback khi sheet không pin; mỗi sheet pin → constants lúc lưu
        const fallback = {
          materials: state.sessionConfigSnapshot?.materials ?? state.materials,
          constants: state.sessionConfigSnapshot?.constants ?? state.constants,
          profitTable: state.sessionConfigSnapshot?.profitTable ?? state.profitTable,
          smallWidthPrices: state.sessionConfigSnapshot?.smallWidthPrices ?? state.smallWidthPrices,
        };
        const pinIds = gomPriceConfigIdsTuSheets(sheets);
        const configs = pinIds.length
          ? await layConfigsTheoIdsCoCache(pinIds, token)
          : [];
        const mapped = mapPricingSheetsToHistory(sheets, fallback, configs);
        set({ history: giuMucDangMoKhiTaiServer(mapped, state.history, state.loadedHistoryId) });
        return true;
      } catch {
        return false;
      } finally {
        dangTaiLichSuPromise = null;
      }
    })();
    return dangTaiLichSuPromise;
  },

  updateQuoteStatus: (id, status) => {
    set((state) => {
      const old = state.history.find(h => h.id === id);
      const history = state.history.map(h => h.id === id ? { ...h, quoteStatus: status } : h);

      if (old) {
        setTimeout(() => {
          get().luuPhienBan(id, `Trước đổi trạng thái → ${status}`);
        }, 0);
      }

      return { history };
    });
  },

  themHienTaiVaoLichSu: () => get().addCurrentToHistory(),

  capNhatHienTaiVaoLichSu: () => {
    set((state) => {
      if (!state.loadedHistoryId || !state.result) return state;
      const old = timMucLichSuTheoId(state.history, state.loadedHistoryId);
      if (!old) return state;

      const laNangCap = !!state.cheDoNangCao;
      // Giữ CPSX NC lúc lưu; sheet legacy chưa pin → ghim lần cập nhật đầu
      const pinCpsx = laNangCap
        ? (old.pinnedCpsxNangCao ?? trichCpsxNangCao(state.constants))
        : old.pinnedCpsxNangCao;
      const hangSoLuu = laNangCap
        ? apCpsxNangCaoVaoHangSo(state.constants, pinCpsx)
        : state.constants;
      // LN% ghi đè Sale/Admin KHÔNG áp vào giá cập nhật — chỉ preview trong tab.
      const ketQuaLuu = laNangCap
        ? tinhKetQuaNangCaoHieuLuc({
            result: state.result,
            uniRows: lapDongSanXuat(state.result, hangSoLuu).uniRows,
            constants: hangSoLuu,
            materials: state.materials,
            saleOverrides: state.saleOverrides,
            adminOverrides: state.adminOverrides,
            saleProfitRatePct: 0,
            adminProfitRatePct: 0,
            profitTable: state.profitTable,
          }).result
        : state.result;

      // Tính giá Thương mại (mua + LN + Thùng/VC/Lãi vay/HH/Trục/Phụ phí) — khớp panel.
      const giaThuongMai = tinhDonGiaThuongMaiHieuLuc(state.input, state.result);
      const finalPriceHieuLuc = giaThuongMai ?? ketQuaLuu.finalPrice;
      const ketQuaTM = giaThuongMai ? tinhGiaThuongMai(state.input) : null;
      const profitRateHieuLuc = ketQuaTM ? ketQuaTM.profitPct : ketQuaLuu.profitRate;
      const profitAmountHieuLuc = ketQuaTM ? ketQuaTM.profitVnd : ketQuaLuu.profitAmount;

      const now = new Date();
      const isoNow = now.toISOString();
      const updated: HistoryItem = {
        ...old,
        date: dinhDangDateLegacy(now),
        createdAt: old.createdAt ?? isoNow,
        updatedAt: isoNow,
        customer: state.input.customer || old.customer,
        productName: state.input.productName || old.productName,
        structure: state.result.structureText,
        quantity: state.input.quantity,
        finalPrice: finalPriceHieuLuc,
        chotGia: state.currentChotGia || undefined,
        profitRate: profitRateHieuLuc,
        profitAmount: profitAmountHieuLuc,
        saleOverrides: Object.keys(state.saleOverrides).length > 0 ? state.saleOverrides : undefined,
        adminOverrides: Object.keys(state.adminOverrides).length > 0 ? state.adminOverrides : undefined,
        input: { ...state.input, isNangCap: laNangCap || undefined },
        sellerId: state.currentSellerId || old.sellerId,
        sellerName: state.currentSellerName || old.sellerName,
        saleProfitRatePct: state.saleProfitRatePct || undefined,
        adminProfitRatePct: state.adminProfitRatePct || undefined,
        pinnedCpsxNangCao: pinCpsx,
        isNangCap: laNangCap || undefined,
        isThuongMai: state.input.pricingMode === 'commercial' || undefined,
      };
      // Cập nhật → đưa lên đầu danh sách
      const history = [
        updated,
        ...state.history.filter((h) => {
          if (h.id === old.id) return false;
          if (old.pricingSheetId && h.pricingSheetId === old.pricingSheetId) return false;
          return true;
        }),
      ].slice(0, 200);

      return { history, isDirty: false };
    });
  },

  saoChepBangTinh: (id) => {
    set((state) => {
      const item = state.history.find(h => h.id === id);
      if (!item) return state;

      const now = new Date();
      const isoNow = now.toISOString();
      const clone: HistoryItem = {
        ...structuredClone(item),
        id: String(now.getTime()),
        date: dinhDangDateLegacy(now),
        createdAt: isoNow,
        updatedAt: isoNow,
        pricingSheetId: undefined,
        priceConfigIds: undefined,
        quoteStatus: undefined,
        quoteCode: undefined,
        isQuote: false,
        quoteProducts: undefined,
        tiers: undefined,
        locked: false,
        lockedBy: undefined,
        lockedAt: undefined,
        sellerId: state.currentSellerId,
        sellerName: state.currentSellerName,
      };
      const history = [clone, ...state.history].slice(0, 200);

      return { history };
    });
  },

  khoaBaoGia: (id) => {
    set((state) => {
      const history = state.history.map(h => h.id === id
        ? { ...h, locked: true, lockedBy: state.currentSellerId, lockedAt: new Date().toISOString() }
        : h
      );
      return { history };
    });
  },

  moKhoaBaoGia: (id) => {
    set((state) => {
      const history = state.history.map(h => h.id === id
        ? { ...h, locked: false, lockedBy: undefined, lockedAt: undefined }
        : h
      );
      return { history };
    });
  },

  huyBaoGia: (id) => {
    set((state) => {
      const history = state.history.map(h => h.id === id ? { ...h, quoteStatus: 'cancelled' as QuoteStatus } : h);

      return { history };
    });
  },

  kiemTraHetHan: () => {
    set((state) => {
      const now = Date.now();
      let changed = false;
      const history = state.history.map(h => {
        if (!h.validUntil) return h;
        if (h.quoteStatus === 'cancelled' || h.quoteStatus === 'expired' || h.quoteStatus === 'completed') return h;
        if (new Date(h.validUntil).getTime() < now) {
          changed = true;
          return { ...h, quoteStatus: 'expired' as QuoteStatus };
        }
        return h;
      });
      if (changed) {
          return { history };
      }
      return state;
    });
  },

  capNhatDieuKhoan: (id, terms) => {
    set((state) => {
      const validUntil = tinhNgayHieuLuc(terms);
      const history = state.history.map(h => h.id === id ? { ...h, terms, validUntil } : h);

      setTimeout(() => {
       get().luuPhienBan(id, 'Trước cập nhật điều khoản');
      }, 0);

      return { history };
    });
  },

  phanCongBaoGia: (quoteId, sellerId, sellerName) => {
    set((state) => {
      const history = state.history.map(h => h.id === quoteId ? { ...h, sellerId, sellerName } : h);

      return { history };
    });
  },

  ganTiersBaoGia: (quoteId, tiers) => {
    set((state) => {
      const history = state.history.map(h => h.id === quoteId ? { ...h, tiers } : h);
      return { history };
    });
  },

  taoBaoGiaMoi: ({ customer, products, terms, sendForApproval, quotationId }) => {
    if (products.length === 0) return null;
    const state = get();
    const now = new Date();
    const quoteCode = state.taoMaBaoGia();
    const first = products[0];
    const status: QuoteStatus = sendForApproval ? 'pending_approval' : 'drafted';
    const item: HistoryItem = {
      id: String(now.getTime()),
      date: now.toLocaleDateString('vi-VN'),
      customer,
      productName: products.length === 1 ? first.productName : `Báo giá ${products.length} sản phẩm`,
      structure: products.length === 1 ? first.structure : products.map(p => p.structure).join(' + '),
      quantity: products.reduce((sum, p) => sum + (p.quantity || 0), 0),
      finalPrice: first.finalPrice || (() => {
        const r = tinhBaoGia({ ...first.input }, state.materials, state.constants, state.profitTable, state.smallWidthPrices);
        return r?.finalPrice ?? 0;
      })(),
      chotGia: first.chotGia,
      profitRate: first.profitRate,
      quoteStatus: status,
      quotationId,
      quoteCode,
      isQuote: true,
      quoteProducts: products,
      terms,
      validUntil: tinhNgayHieuLuc(terms),
      sellerId: state.currentSellerId,
      sellerName: state.currentSellerName,
      input: { ...first.input },
    };
    const history = [item, ...state.history].slice(0, 200);
    set({ history, loadedHistoryId: item.id });

    return item.id;
  },

  patchHistoryItem: (id, patch) => {
    set((state) => {
      const old = state.history.find(h => h.id === id);
      if (!old) return state;
      const history = state.history.map(h => h.id === id ? { ...h, ...patch } : h);
      return { history };
    });
  },
});
