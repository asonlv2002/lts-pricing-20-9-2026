// ═══════════════════════════════════════════════════════════════════════════
// Auth Slice — service-lts authentication & session management
// ═══════════════════════════════════════════════════════════════════════════
import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import {
  dangNhapService,
  lamMoiTokenService,
  layTaiKhoanService,
  chuyenTaiKhoanApi,
  LS_ACCESS_TOKEN,
  LS_REFRESH_TOKEN,
  POLICY_CATALOG,
  caiDatQuanLyPhien,
  type PolicyCode,
} from '../../lib/api/service-lts';

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
}

function luuToken(accessToken: string, refreshToken: string) {
  try { window.localStorage.setItem(LS_ACCESS_TOKEN, accessToken); } catch {}
  try { window.localStorage.setItem(LS_REFRESH_TOKEN, refreshToken); } catch {}
}

function xoaToken() {
  try { window.localStorage.removeItem(LS_ACCESS_TOKEN); } catch {}
  try { window.localStorage.removeItem(LS_REFRESH_TOKEN); } catch {}
}

function docJwtPayload(token: string): { sub: string; account: string; fullName?: string | null } | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
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
      xoaToken();
      set({
        accessToken: null,
        refreshToken: null,
        nguoiDungHienTai: null,
        isAuthenticated: false,
        authLoading: false,
        authError: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
        sessionChecked: true,
      });
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

      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        nguoiDungHienTai: userProfile
          ? { id: userProfile.id, account: userProfile.account, fullName: userProfile.fullName, policies: userProfile.policies }
          : { id: data.user.id, account: data.user.account, fullName: data.user.fullName || data.user.account, policies: fallbackPolicies },
        isAuthenticated: true,
        authLoading: false,
        sessionChecked: true,
      });

      // Sync role to UISlice based on policies
      const uiRole = userProfile?.policies.includes('ACCOUNT_CREATE') ? 'admin'
        : userProfile?.policies.length ? 'sale' : 'purchase';
      get().setRole(uiRole);
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
    });
  },

  lamMoiPhien: async () => {
    const currentRefresh = get().refreshToken;
    if (!currentRefresh) {
      set({ isAuthenticated: false, sessionChecked: true });
      return;
    }
    try {
      const data = await lamMoiTokenService(currentRefresh);
      luuToken(data.accessToken, data.refreshToken);
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        sessionChecked: true,
      });
    } catch {
      xoaToken();
      set({
        accessToken: null,
        refreshToken: null,
        nguoiDungHienTai: null,
        isAuthenticated: false,
        sessionChecked: true,
      });
    }
  },

  kiemTraVaKhoiPhucPhien: async () => {
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

    // Validate the saved token by making a request
    try {
      const accounts = await layTaiKhoanService(savedAccess);
      const payload = docJwtPayload(savedAccess);
      const self = payload ? accounts.find(a => a.id === payload.sub) : undefined;
      const userProfile = self ? chuyenTaiKhoanApi(self) : null;
      const fallbackPolicies = payload?.account === 'admin'
        ? POLICY_CATALOG.map(policy => policy.code)
        : [];

      set({
        accessToken: savedAccess,
        refreshToken: savedRefresh,
        nguoiDungHienTai: userProfile
          ? { id: userProfile.id, account: userProfile.account, fullName: userProfile.fullName, policies: userProfile.policies }
          : payload
            ? { id: payload.sub, account: payload.account, fullName: payload.fullName || payload.account, policies: fallbackPolicies }
            : null,
        isAuthenticated: true,
        authLoading: false,
        sessionChecked: true,
      });
    } catch {
      // Token might be expired, try refresh
      try {
        const data = await lamMoiTokenService(savedRefresh);
        luuToken(data.accessToken, data.refreshToken);
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          nguoiDungHienTai: {
            id: data.user.id,
            account: data.user.account,
            fullName: data.user.fullName || data.user.account,
            policies: data.user.account === 'admin' ? POLICY_CATALOG.map(policy => policy.code) : [],
          },
          isAuthenticated: true,
          authLoading: false,
          sessionChecked: true,
        });
      } catch {
        xoaToken();
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          authLoading: false,
          sessionChecked: true,
        });
      }
    }
  },

  datAuthError: (error) => set({ authError: error }),
});
};
