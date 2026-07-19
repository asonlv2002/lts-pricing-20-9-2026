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
  doiMatKhauService,
  chuyenTaiKhoanApi,
  LS_ACCESS_TOKEN,
  LS_REFRESH_TOKEN,
  POLICY_CATALOG,
  caiDatQuanLyPhien,
  type PolicyCode,
} from '../../lib/api/service-lts';
import { laLoiRefreshHetPhien } from '../../lib/auth-session';
import { vaiTroTuPolicies } from '../../lib/permissions';
import { decodeBase64UrlUtf8, normalizeDisplayText } from '../../lib/text-codec';

export interface AuthSlice {
  // ── State ──────────────────────────────────────────────────────────────
  accessToken: string | null;
  refreshToken: string | null;
  nguoiDungHienTai: {
    id: string;
    account: string;
    fullName: string;
    policies: PolicyCode[];
  } | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  sessionChecked: boolean;

  // ── Actions ────────────────────────────────────────────────────────────
  login: (account: string, password: string) => Promise<void>;
  logout: () => void;
  lamMoiPhien: () => Promise<void>;
  kiemTraVaKhoiPhucPhien: () => Promise<void>;
  datAuthError: (error: string | null) => void;
  doiMatKhau: (currentPassword: string, newPassword: string) => Promise<void>;
}

function luuToken(accessToken: string, refreshToken: string) {
  try { window.localStorage.setItem(LS_ACCESS_TOKEN, accessToken); } catch {}
  try { window.localStorage.setItem(LS_REFRESH_TOKEN, refreshToken); } catch {}
}

function xoaToken() {
  try { window.localStorage.removeItem(LS_ACCESS_TOKEN); } catch {}
  try { window.localStorage.removeItem(LS_REFRESH_TOKEN); } catch {}
}

const THONG_BAO_HET_PHIEN = 'Hết phiên đăng nhập.';
let dangKiemTraPhien: Promise<void> | null = null;

function resetPhienHetHan(set: Parameters<StateCreator<CuaHangTinhGia, [], [], AuthSlice>>[0]) {
  xoaToken();
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
      resetPhienHetHan(set);
    },
  });

  return ({
  accessToken: null,
  refreshToken: null,
  nguoiDungHienTai: null,
  isAuthenticated: false,
  authLoading: false,
  authError: null,
  sessionChecked: false,

  login: async (account, password) => {
    set({ authLoading: true, authError: null });
    try {
      const data = await dangNhapService(account, password);
      luuToken(data.accessToken, data.refreshToken);

      // Fetch user's own profile to get policies
      let userProfile: ReturnType<typeof chuyenTaiKhoanApi> | null = null;
      try {
        const accounts = await layTaiKhoanService(data.accessToken);
        const self = accounts.find(a => a.id === data.user.id);
        if (self) userProfile = chuyenTaiKhoanApi(self);
      } catch {}

      const fallbackPolicies = data.user.account === 'admin'
        ? POLICY_CATALOG.map(policy => policy.code)
        : [];

      const userPolicies = userProfile?.policies ?? fallbackPolicies;

      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
          nguoiDungHienTai: userProfile
          ? { id: userProfile.id, account: userProfile.account, fullName: normalizeUserDisplayName(userProfile.fullName, userProfile.account), policies: userPolicies }
          : { id: data.user.id, account: data.user.account, fullName: normalizeUserDisplayName(data.user.fullName, data.user.account), policies: userPolicies },
        isAuthenticated: true,
        authLoading: false,
        sessionChecked: true,
      });

      get().setRole(vaiTroTuPolicies(userPolicies));
      // Tải danh sách lịch sử từ server sau khi đăng nhập thành công
      get().taiLichSuTuServer().catch(() => {});
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
    xoaToken();
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
        resetPhienHetHan(set);
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

    // Hydrate tokens before validation so the 401 auto-refresh path can use the saved refresh token.
    set({ accessToken: savedAccess, refreshToken: savedRefresh });

    // Validate the saved token by making a request
    try {
      const accounts = await layTaiKhoanService(savedAccess);
      const payload = docJwtPayload(savedAccess);
      const self = payload ? accounts.find(a => a.id === payload.sub) : undefined;
      const userProfile = self ? chuyenTaiKhoanApi(self) : null;
      const fallbackPolicies = payload?.account === 'admin'
        ? POLICY_CATALOG.map(policy => policy.code)
        : [];

      const currentState = get();
      const actTokens = currentState.accessToken && currentState.refreshToken
        ? { accessToken: currentState.accessToken, refreshToken: currentState.refreshToken }
        : { accessToken: savedAccess, refreshToken: savedRefresh };

      set({
        ...actTokens,
        nguoiDungHienTai: userProfile
          ? { id: userProfile.id, account: userProfile.account, fullName: normalizeUserDisplayName(userProfile.fullName, userProfile.account), policies: userProfile.policies }
          : payload
            ? { id: payload.sub, account: payload.account, fullName: normalizeUserDisplayName(payload.fullName, payload.account), policies: fallbackPolicies }
            : null,
        isAuthenticated: true,
        authLoading: false,
        sessionChecked: true,
      });

      get().setRole(vaiTroTuPolicies(userProfile?.policies ?? fallbackPolicies));
      // Tải danh sách lịch sử từ server sau khi khôi phục phiên
      get().taiLichSuTuServer().catch(() => {});
    } catch {
      // Token might be expired, try refresh
      try {
        const data = await lamMoiTokenService(savedRefresh);
        luuToken(data.accessToken, data.refreshToken);

        // Fetch full user profile with policies after refresh
        let userProfile: ReturnType<typeof chuyenTaiKhoanApi> | null = null;
        try {
          const accounts = await layTaiKhoanService(data.accessToken);
          const self = accounts.find(a => a.id === data.user.id);
          if (self) userProfile = chuyenTaiKhoanApi(self);
        } catch {}

        const fallbackPolicies = data.user.account === 'admin'
          ? POLICY_CATALOG.map(policy => policy.code)
          : [];

        const userPolicies = userProfile?.policies ?? fallbackPolicies;

        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          nguoiDungHienTai: userProfile
            ? { id: userProfile.id, account: userProfile.account, fullName: normalizeUserDisplayName(userProfile.fullName, userProfile.account), policies: userPolicies }
            : { id: data.user.id, account: data.user.account, fullName: normalizeUserDisplayName(data.user.fullName, data.user.account), policies: userPolicies },
          isAuthenticated: true,
          authLoading: false,
          sessionChecked: true,
        });

        get().setRole(vaiTroTuPolicies(userPolicies));
        // Tải danh sách lịch sử từ server sau khi làm mới phiên
        get().taiLichSuTuServer().catch(() => {});
      } catch {
        resetPhienHetHan(set);
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
    const user = get().nguoiDungHienTai;
    const data = await doiMatKhauService(token, currentPassword, newPassword);
    // Server returns new token pair — update session
    luuToken(data.accessToken, data.refreshToken);
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
  },
});
};
