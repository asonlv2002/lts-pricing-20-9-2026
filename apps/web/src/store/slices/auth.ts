// ═══════════════════════════════════════════════════════════════════════════
// Auth Slice — service-lts authentication & session management
// ═══════════════════════════════════════════════════════════════════════════
import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import {
  dangNhapService,
  lamMoiTokenService,
  lamMoiTokenQuaQuanLyPhien,
  layTaiKhoanService,
  layTrangThaiBaoMatService,
  layAnhDaiDienService,
  taiAnhDaiDienService,
  layChuKyService,
  taiChuKyService,
  doiMatKhauService,
  chuyenTaiKhoanApi,
  LS_ACCESS_TOKEN,
  LS_REFRESH_TOKEN,
  LS_USER_POLICIES,
  POLICY_CATALOG,
  caiDatQuanLyPhien,
  LoiServiceLts,
  type PolicyCode,
} from '../../lib/api/service-lts';
import { laLoiRefreshHetPhien, quyetDinhDongBoTokenThongQuaStorage } from '../../lib/auth-session';
import { vaiTroTuPolicies } from '../../lib/permissions';
import { decodeBase64UrlUtf8, normalizeDisplayText } from '../../lib/text-codec';
import { blobSangPngDataUrl } from '../../lib/chu-ky';

export interface AuthSlice {
  // ── State ──────────────────────────────────────────────────────────────
  accessToken: string | null;
  refreshToken: string | null;
  nguoiDungHienTai: {
    id: string;
    account: string;
    fullName: string;
    policies: PolicyCode[];
    avatarUrl: string | null;
    avatarBlobUrl: string | null;
    signatureUrl: string | null;
    signatureBlobUrl: string | null;
    /** Chữ ký PNG data URL (bền — không phụ thuộc blob URL sống của phiên). */
    chuKyDataUrl: string | null;
  } | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  sessionChecked: boolean;

  // ── Actions ────────────────────────────────────────────────────────────
  login: (account: string, password: string) => Promise<void>;
  /** Áp token + profile sau login / consume password-reset (cùng shape DangNhapApi). */
  apDungPhienTuDangNhap: (data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      account: string;
      fullName?: string | null;
      avatarUrl?: string | null;
      signatureUrl?: string | null;
    };
  }) => Promise<void>;
  logout: () => void;
  lamMoiPhien: () => Promise<void>;
  kiemTraVaKhoiPhucPhien: () => Promise<void>;
  datAuthError: (error: string | null) => void;
  doiMatKhau: (currentPassword: string, newPassword: string) => Promise<void>;
  taiAnhDaiDien: (file: File) => Promise<void>;
  taiLaiAnhDaiDien: () => Promise<void>;
  taiChuKy: (file: File) => Promise<void>;
  taiLaiChuKy: () => Promise<void>;
}

function luuToken(accessToken: string, refreshToken: string) {
  try { window.localStorage.setItem(LS_ACCESS_TOKEN, accessToken); } catch {}
  try { window.localStorage.setItem(LS_REFRESH_TOKEN, refreshToken); } catch {}
}

function xoaToken() {
  try { window.localStorage.removeItem(LS_ACCESS_TOKEN); } catch {}
  try { window.localStorage.removeItem(LS_REFRESH_TOKEN); } catch {}
}

type PolicyCache = {
  userId: string;
  account?: string;
  fullName?: string;
  policies: PolicyCode[];
};

function locPolicyHopLe(codes: unknown): PolicyCode[] {
  if (!Array.isArray(codes)) return [];
  return codes.filter((code): code is PolicyCode =>
    typeof code === 'string' && POLICY_CATALOG.some(p => p.code === code),
  );
}

function docCachePolicies(userId: string): PolicyCode[] {
  try {
    const raw = window.localStorage.getItem(LS_USER_POLICIES);
    if (!raw) return [];
    const data = JSON.parse(raw) as PolicyCache;
    if (data?.userId !== userId) return [];
    return locPolicyHopLe(data.policies);
  } catch {
    return [];
  }
}

function luuCachePolicies(userId: string, policies: PolicyCode[], meta?: { account?: string; fullName?: string }) {
  try {
    const payload: PolicyCache = {
      userId,
      account: meta?.account,
      fullName: meta?.fullName,
      policies: locPolicyHopLe(policies),
    };
    window.localStorage.setItem(LS_USER_POLICIES, JSON.stringify(payload));
  } catch {}
}

function policiesChoUser(userId: string, account: string): PolicyCode[] {
  const cached = docCachePolicies(userId);
  if (cached.length > 0) return cached;
  // Fallback admin gốc khi chưa từng cache (JWT không chứa policies).
  if (account === 'admin') return POLICY_CATALOG.map(p => p.code);
  return [];
}

const THONG_BAO_HET_PHIEN = 'Hết phiên đăng nhập.';
let dangKiemTraPhien: Promise<void> | null = null;

function resetPhienHetHan(set: Parameters<StateCreator<CuaHangTinhGia, [], [], AuthSlice>>[0], get?: () => CuaHangTinhGia) {
  xoaToken();
  if (get) {
    get().dungTheoDoiMetricHeThong();
    thuHoiAnhDaiDien(get().nguoiDungHienTai);
    thuHoiChuKy(get().nguoiDungHienTai);
  }
  set({
    accessToken: null,
    refreshToken: null,
    nguoiDungHienTai: null,
    isAuthenticated: false,
    authLoading: false,
    authError: THONG_BAO_HET_PHIEN,
    sessionChecked: true,
    role: 'sale',
    activeModule: 'calculator',
    pricingEntry: 'pick' as const,
  });
}

function docJwtPayload(token: string): { sub: string; account: string; fullName?: string | null } | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(decodeBase64UrlUtf8(payload));
  } catch {
    return null;
  }
}

function normalizeUserDisplayName(value?: string | null, fallback?: string): string {
  return normalizeDisplayText(value || fallback || '');
}

function taoNguoiDungHienTai(
  user: {
    id: string;
    account: string;
    fullName: string;
    policies: PolicyCode[];
    avatarUrl?: string | null;
    signatureUrl?: string | null;
  },
) {
  return {
    ...user,
    avatarUrl: user.avatarUrl ?? null,
    avatarBlobUrl: null,
    signatureUrl: user.signatureUrl ?? null,
    signatureBlobUrl: null,
    chuKyDataUrl: null,
  };
}

function thuHoiAnhDaiDien(user: AuthSlice['nguoiDungHienTai']) {
  if (user?.avatarBlobUrl) URL.revokeObjectURL(user.avatarBlobUrl);
}

function thuHoiChuKy(user: AuthSlice['nguoiDungHienTai']) {
  if (user?.signatureBlobUrl) URL.revokeObjectURL(user.signatureBlobUrl);
}

/**
 * Làm giàu policies từ GET /auth/accounts khi user có ACCOUNT_MANAGER.
 * 403 / lỗi khác → bỏ qua, không coi là hết phiên.
 */
async function lamGiauPoliciesTuDanhSachTaiKhoan(
  get: () => CuaHangTinhGia,
  set: Parameters<StateCreator<CuaHangTinhGia, [], [], AuthSlice>>[0],
  accessToken: string,
  userId: string,
) {
  try {
    const accounts = await layTaiKhoanService(accessToken);
    const self = accounts.find(a => a.id === userId);
    if (!self) return;
    const profile = chuyenTaiKhoanApi(self);
    const policies = locPolicyHopLe(profile.policies);
    luuCachePolicies(userId, policies, {
      account: profile.account,
      fullName: profile.fullName,
    });
    const current = get().nguoiDungHienTai;
    if (!current || current.id !== userId) return;
    set((state) => {
      const moi = state.nguoiDungHienTai;
      if (!moi || moi.id !== userId) return state;
      return {
        ...state,
        nguoiDungHienTai: {
          ...moi,
          account: profile.account,
          fullName: normalizeUserDisplayName(profile.fullName, profile.account),
          policies,
          avatarUrl: profile.avatarUrl ?? moi.avatarUrl,
          signatureUrl: profile.signatureUrl ?? moi.signatureUrl,
          avatarBlobUrl: moi.avatarBlobUrl,
          signatureBlobUrl: moi.signatureBlobUrl,
          chuKyDataUrl: moi.chuKyDataUrl,
        },
      };
    });
    get().setRole(vaiTroTuPolicies(policies));
  } catch (error) {
    // 403 = không có ACCOUNT_MANAGER — bình thường với sale.
    if (error instanceof LoiServiceLts && (error.status === 403 || error.status === 401)) return;
  }
}

function chaySideEffectSauDangNhap(get: () => CuaHangTinhGia) {
  get().batDauTheoDoiMetricHeThong();
  get().taiLaiAnhDaiDien().catch(() => {});
  get().taiLaiChuKy().catch(() => {});
  get().taiLichSuTuServer().catch(() => {});
}

export const createAuthSlice: StateCreator<CuaHangTinhGia, [], [], AuthSlice> = (set, get) => {
  caiDatQuanLyPhien({
    layTokenHienTai: () => {
      const state = get();
      if (!state.accessToken || !state.refreshToken) return null;
      return { accessToken: state.accessToken, refreshToken: state.refreshToken };
    },
    luuTokenMoi: ({ accessToken, refreshToken }) => {
      luuToken(accessToken, refreshToken);
      set({ accessToken, refreshToken, isAuthenticated: true });
    },
    xuLyPhienKhongHopLe: () => {
      resetPhienHetHan(set, get);
    },
  });

  // Đồng bộ phiên giữa các tab: khi tab khác rotate/xoá token trong
  // localStorage, tab này nhận token mới (hoặc đăng xuất theo) thay vì gửi
  // token cũ đã bị thu hồi lên BE rồi bị 401 "Hết phiên đăng nhập.".
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      // Key refresh token là định danh của cặp token — event của key access
      // sẽ được xử lý gián tiếp khi đọc lại cả 2 key ở event refresh.
      if (event.key !== LS_REFRESH_TOKEN) return;
      let accessTokenLs: string | null = null;
      let refreshTokenLs: string | null = null;
      try {
        accessTokenLs = window.localStorage.getItem(LS_ACCESS_TOKEN);
        refreshTokenLs = window.localStorage.getItem(LS_REFRESH_TOKEN);
      } catch {
        return;
      }
      const quyetDinh = quyetDinhDongBoTokenThongQuaStorage({
        refreshTokenLs,
        accessTokenLs,
        refreshTokenHienTai: get().refreshToken,
      });
      if (quyetDinh.hanhDong === 'apDung') {
        set({
          accessToken: quyetDinh.accessToken,
          refreshToken: quyetDinh.refreshToken,
          isAuthenticated: true,
        });
      } else if (quyetDinh.hanhDong === 'dangXuat') {
        get().logout();
      }
    });
  }

  return ({
  accessToken: null,
  refreshToken: null,
  nguoiDungHienTai: null,
  isAuthenticated: false,
  authLoading: false,
  authError: null,
  sessionChecked: false,

  apDungPhienTuDangNhap: async (data) => {
    luuToken(data.accessToken, data.refreshToken);

    const userPolicies = policiesChoUser(data.user.id, data.user.account);
    luuCachePolicies(data.user.id, userPolicies, {
      account: data.user.account,
      fullName: data.user.fullName ?? undefined,
    });

    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      nguoiDungHienTai: taoNguoiDungHienTai({
        id: data.user.id,
        account: data.user.account,
        fullName: normalizeUserDisplayName(data.user.fullName, data.user.account),
        policies: userPolicies,
        avatarUrl: data.user.avatarUrl,
        signatureUrl: data.user.signatureUrl,
      }),
      isAuthenticated: true,
      authLoading: false,
      authError: null,
      sessionChecked: true,
    });

    get().setRole(vaiTroTuPolicies(userPolicies));
    chaySideEffectSauDangNhap(get);

    // Nền: enrich policies nếu user có quyền list accounts (không block UI).
    void lamGiauPoliciesTuDanhSachTaiKhoan(get, set, data.accessToken, data.user.id);
  },

  login: async (account, password) => {
    set({ authLoading: true, authError: null });
    try {
      const data = await dangNhapService(account, password);
      await get().apDungPhienTuDangNhap(data);
    } catch (error) {
      xoaToken();
      set({
        accessToken: null,
        refreshToken: null,
        nguoiDungHienTai: null,
        isAuthenticated: false,
        authLoading: false,
        authError: error instanceof Error ? error.message : 'Login failed.',
        sessionChecked: true,
        role: 'sale',
        activeModule: 'calculator',
        pricingEntry: 'pick' as const,
      });
      throw error;
    }
  },

  logout: () => {
    get().dungTheoDoiMetricHeThong();
    thuHoiAnhDaiDien(get().nguoiDungHienTai);
    thuHoiChuKy(get().nguoiDungHienTai);
    xoaToken();
    // Giữ cache policies theo user để F5/login sau vẫn có menu đúng.
    set({
      accessToken: null,
      refreshToken: null,
      nguoiDungHienTai: null,
      isAuthenticated: false,
      authLoading: false,
      authError: null,
      sessionChecked: true,
      role: 'sale',
      activeModule: 'calculator',
      pricingEntry: 'pick' as const,
    });
  },

  lamMoiPhien: async () => {
    const currentRefresh = get().refreshToken;
    if (!currentRefresh) {
      set({ isAuthenticated: false, sessionChecked: true });
      return;
    }
    try {
      const data = await lamMoiTokenQuaQuanLyPhien();
      luuToken(data.accessToken, data.refreshToken);
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        sessionChecked: true,
      });
    } catch (error) {
      if (laLoiRefreshHetPhien(error)) {
        resetPhienHetHan(set, get);
      } else {
        console.warn('Không làm mới được phiên đăng nhập, sẽ thử lại sau:', error);
      }
    }
  },

  kiemTraVaKhoiPhucPhien: async () => {
    const state = get();
    if (state.sessionChecked) return;

    if (dangKiemTraPhien) return dangKiemTraPhien;

    dangKiemTraPhien = (async () => {
      if (get().sessionChecked) return;

      set({ authLoading: true });

      let savedAccess: string | null = null;
      let savedRefresh: string | null = null;
      try {
        savedAccess = window.localStorage.getItem(LS_ACCESS_TOKEN);
        savedRefresh = window.localStorage.getItem(LS_REFRESH_TOKEN);
      } catch {}

      if (!savedAccess || !savedRefresh) {
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          authLoading: false,
          sessionChecked: true,
        });
        return;
      }

      // Hydrate tokens trước để 401 auto-refresh dùng được refresh token.
      set({ accessToken: savedAccess, refreshToken: savedRefresh });

      const apDungUserTuToken = (
        accessToken: string,
        refreshToken: string,
        user: { id: string; account: string; fullName?: string | null; avatarUrl?: string | null; signatureUrl?: string | null },
      ) => {
        const userPolicies = policiesChoUser(user.id, user.account);
        set({
          accessToken,
          refreshToken,
          nguoiDungHienTai: taoNguoiDungHienTai({
            id: user.id,
            account: user.account,
            fullName: normalizeUserDisplayName(user.fullName, user.account),
            policies: userPolicies,
            avatarUrl: user.avatarUrl,
            signatureUrl: user.signatureUrl,
          }),
          isAuthenticated: true,
          authLoading: false,
          sessionChecked: true,
        });
        get().setRole(vaiTroTuPolicies(userPolicies));
        chaySideEffectSauDangNhap(get);
        void lamGiauPoliciesTuDanhSachTaiKhoan(get, set, accessToken, user.id);
      };

      try {
        // Validate phiên bằng API JWT-only (không cần ACCOUNT_MANAGER).
        await layTrangThaiBaoMatService(savedAccess);
        const payload = docJwtPayload(get().accessToken || savedAccess);
        if (!payload?.sub || !payload.account) {
          throw new Error('Invalid token payload');
        }
        const act = get();
        apDungUserTuToken(
          act.accessToken || savedAccess,
          act.refreshToken || savedRefresh,
          {
            id: payload.sub,
            account: payload.account,
            fullName: payload.fullName,
          },
        );
      } catch (error) {
        // Chỉ refresh khi 401; 403/khác không được coi là hết phiên.
        const canRefresh =
          error instanceof LoiServiceLts && error.status === 401
          || (error instanceof Error && /hết phiên|unauthorized|bearer token/i.test(error.message));

        if (!canRefresh) {
          // Lỗi mạng / 5xx: vẫn hydrate JWT + cache, không logout.
          const payload = docJwtPayload(savedAccess);
          if (payload?.sub && payload.account) {
            apDungUserTuToken(savedAccess, savedRefresh, {
              id: payload.sub,
              account: payload.account,
              fullName: payload.fullName,
            });
            return;
          }
          resetPhienHetHan(set, get);
          return;
        }

        try {
          const data = await lamMoiTokenService(savedRefresh);
          luuToken(data.accessToken, data.refreshToken);
          apDungUserTuToken(data.accessToken, data.refreshToken, data.user);
        } catch {
          resetPhienHetHan(set, get);
        }
      }
    })().finally(() => {
      dangKiemTraPhien = null;
    });

    return dangKiemTraPhien;
  },

  datAuthError: (error) => set({ authError: error }),

  doiMatKhau: async (currentPassword, newPassword) => {
    const token = get().accessToken;
    if (!token) throw new Error('Chưa đăng nhập.');
    const data = await doiMatKhauService(token, currentPassword, newPassword);
    luuToken(data.accessToken, data.refreshToken);
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
  },

  taiAnhDaiDien: async (file) => {
    const token = get().accessToken;
    const user = get().nguoiDungHienTai;
    if (!token || !user) throw new Error('Chưa đăng nhập.');

    const data = await taiAnhDaiDienService(file, token);
    const blob = await layAnhDaiDienService();
    const avatarBlobUrl = URL.createObjectURL(blob);
    thuHoiAnhDaiDien(user);
    set({
      nguoiDungHienTai: {
        ...user,
        avatarUrl: data.avatarUrl,
        avatarBlobUrl,
      },
    });
  },

  taiLaiAnhDaiDien: async () => {
    const user = get().nguoiDungHienTai;
    if (!user) return;

    try {
      const blob = await layAnhDaiDienService();
      const avatarBlobUrl = URL.createObjectURL(blob);
      thuHoiAnhDaiDien(user);
      set({
        nguoiDungHienTai: {
          ...user,
          avatarUrl: user.avatarUrl ?? '/auth/me/avatar',
          avatarBlobUrl,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Không tìm thấy')) return;
      throw error;
    }
  },

  taiChuKy: async (file) => {
    const token = get().accessToken;
    const user = get().nguoiDungHienTai;
    if (!token || !user) throw new Error('Chưa đăng nhập.');

    const data = await taiChuKyService(file, token);
    const blob = await layChuKyService();
    const signatureBlobUrl = URL.createObjectURL(blob);
    const chuKyDataUrl = await blobSangPngDataUrl(blob);
    thuHoiChuKy(user);
    set((state) => {
      const moi = state.nguoiDungHienTai;
      if (!moi || moi.id !== user.id) return state;
      return {
        ...state,
        nguoiDungHienTai: {
          ...moi,
          signatureUrl: data.signatureUrl,
          signatureBlobUrl,
          chuKyDataUrl: chuKyDataUrl ?? moi.chuKyDataUrl,
        },
      };
    });
  },

  taiLaiChuKy: async () => {
    const user = get().nguoiDungHienTai;
    if (!user) return;

    try {
      const blob = await layChuKyService();
      const signatureBlobUrl = URL.createObjectURL(blob);
      const chuKyDataUrl = await blobSangPngDataUrl(blob);
      thuHoiChuKy(user);
      set((state) => {
        const moi = state.nguoiDungHienTai;
        if (!moi || moi.id !== user.id) return state;
        return {
          ...state,
          nguoiDungHienTai: {
            ...moi,
            signatureUrl: user.signatureUrl ?? '/auth/me/signature',
            signatureBlobUrl,
            chuKyDataUrl: chuKyDataUrl ?? moi.chuKyDataUrl,
          },
        };
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Không tìm thấy')) return;
      throw error;
    }
  },
});
}
