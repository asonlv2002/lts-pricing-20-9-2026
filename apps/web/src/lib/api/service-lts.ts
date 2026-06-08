// ═════════════════════════════════════════════════════════════════════════════
// API client: Service-LTS (NestJS + Prisma backend)
// Browser gọi trực tiếp Service-LTS, không qua proxy Next.js
// ═════════════════════════════════════════════════════════════════════════════

import { normalizeDisplayText } from '../text-codec';

// ── Constants ────────────────────────────────────────────────────────────
export const SERVICE_LTS_DIRECT_URL = process.env.NEXT_PUBLIC_SERVICE_LTS_URL ?? 'localhost:3001';
export const LS_ACCESS_TOKEN = 'lts_service_access_token';
export const LS_REFRESH_TOKEN = 'lts_service_refresh_token';

// ── Policy catalog ───────────────────────────────────────────────────────
export type PolicyCode =
  | 'ACCOUNT_READ' | 'ACCOUNT_CREATE' | 'ACCOUNT_ACTIVATE' | 'ACCOUNT_DEACTIVATE'
  | 'ACCOUNT_PROTECT' | 'ACCOUNT_PASSWORD_UPDATE_ALL' | 'ROLE_CREATE' | 'ROLE_UPDATE' | 'ROLE_DELETE'
  | 'ROLE_READ' | 'CUSTOMER_CREATE'
  | 'USER_POLICY_GRANT' | 'USER_POLICY_REVOKE';

export interface Policy {
  code: PolicyCode;
  ten: string;
  moTa: string;
  nhom: 'Tài khoản' | 'Nhóm quyền' | 'Cấp phát';
  rui_ro: 'thap' | 'trung' | 'cao';
}

export const POLICY_CATALOG: Policy[] = [
  { code: 'ACCOUNT_READ',       ten: 'Xem tài khoản',         moTa: 'Cho phép đọc danh sách tài khoản và quyền đã cấp.',     nhom: 'Tài khoản', rui_ro: 'thap'  },
  { code: 'ACCOUNT_CREATE',     ten: 'Tạo tài khoản',         moTa: 'Cho phép tạo mới tài khoản người dùng.',                nhom: 'Tài khoản', rui_ro: 'trung' },
  { code: 'ACCOUNT_ACTIVATE',   ten: 'Kích hoạt tài khoản',   moTa: 'Cho phép kích hoạt tài khoản đang vô hiệu.',            nhom: 'Tài khoản', rui_ro: 'trung' },
  { code: 'ACCOUNT_DEACTIVATE', ten: 'Vô hiệu tài khoản',     moTa: 'Cho phép vô hiệu tài khoản đang hoạt động.',            nhom: 'Tài khoản', rui_ro: 'cao'   },
  { code: 'ACCOUNT_PROTECT',    ten: 'Bảo vệ tài khoản',      moTa: 'Cho phép cập nhật cờ bảo vệ (protected) cho tài khoản.', nhom: 'Tài khoản', rui_ro: 'cao'   },
  { code: 'ACCOUNT_PASSWORD_UPDATE_ALL', ten: 'Đặt lại mật khẩu tài khoản', moTa: 'Cho phép cập nhật mật khẩu cho tài khoản khác.', nhom: 'Tài khoản', rui_ro: 'cao' },
  { code: 'ROLE_READ',          ten: 'Xem nhóm quyền',        moTa: 'Cho phép đọc các template nhóm quyền.',                 nhom: 'Nhóm quyền', rui_ro: 'thap'  },
  { code: 'ROLE_CREATE',        ten: 'Tạo nhóm quyền',        moTa: 'Cho phép tạo template nhóm quyền mới.',                 nhom: 'Nhóm quyền', rui_ro: 'trung' },
  { code: 'ROLE_UPDATE',        ten: 'Sửa nhóm quyền',        moTa: 'Cho phép cập nhật template nhóm quyền.',                nhom: 'Nhóm quyền', rui_ro: 'trung' },
  { code: 'ROLE_DELETE',        ten: 'Xóa nhóm quyền',        moTa: 'Cho phép xóa template nhóm quyền.',                     nhom: 'Nhóm quyền', rui_ro: 'cao'   },
  { code: 'CUSTOMER_CREATE',    ten: 'Tạo khách hàng',        moTa: 'Cho phép tạo hồ sơ khách hàng mới.',                    nhom: 'Cấp phát', rui_ro: 'trung' },
  { code: 'USER_POLICY_GRANT',  ten: 'Cấp quyền cho user',    moTa: 'Cho phép cấp policy trực tiếp cho tài khoản.',          nhom: 'Cấp phát', rui_ro: 'cao'   },
  { code: 'USER_POLICY_REVOKE', ten: 'Thu hồi quyền user',    moTa: 'Cho phép thu hồi policy trực tiếp khỏi tài khoản.',     nhom: 'Cấp phát', rui_ro: 'cao'   },
];

// ── API types ────────────────────────────────────────────────────────────
export interface TaiKhoanApi {
  id: string;
  account: string;
  fullName: string | null;
  isActive: boolean;
  isProtected: boolean;
  isSystem?: boolean;
  is_system?: boolean;
  createdAt: string;
  updatedAt?: string;
  policies: Array<{
    id?: string;
    code: string;
    name?: string;
    description?: string | null;
  }>;
}

export interface DangNhapApi {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    account: string;
    fullName?: string | null;
  };
}

export interface TaiKhoan {
  id: string;
  account: string;
  fullName: string;
  isActive: boolean;
  isProtected: boolean;
  isSystem?: boolean;
  policies: PolicyCode[];
  createdAt: string;
  lastLogin?: string;
}

export interface NhomQuyen {
  code: string;
  name: string;
  description: string;
  policies: PolicyCode[];
  granterName?: string;
  updatedAt: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

type TokenProvider = () => TokenPair | null;
type TokenSaver = (tokens: TokenPair) => void;
type SessionInvalidHandler = () => void;

let layTokenHienTai: TokenProvider | null = null;
let luuTokenMoi: TokenSaver | null = null;
let xuLyPhienKhongHopLe: SessionInvalidHandler | null = null;
let dangRefreshPromise: Promise<TokenPair> | null = null;

export class LoiServiceLts extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'LoiServiceLts';
  }
}

export function caiDatQuanLyPhien(config: {
  layTokenHienTai: TokenProvider;
  luuTokenMoi: TokenSaver;
  xuLyPhienKhongHopLe: SessionInvalidHandler;
}) {
  layTokenHienTai = config.layTokenHienTai;
  luuTokenMoi = config.luuTokenMoi;
  xuLyPhienKhongHopLe = config.xuLyPhienKhongHopLe;
}

function dichLoiServer(message: string, status: number): string {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (lower.includes('invalid refresh token')) return 'Hết phiên đăng nhập.';
  if (lower.includes('invalid credentials') || lower.includes('unauthorized')) return 'Tài khoản hoặc mật khẩu không đúng.';
  if (lower.includes('forbidden')) return 'Bạn không có quyền thực hiện thao tác này.';
  if (lower.includes('not found')) return 'Không tìm thấy dữ liệu yêu cầu.';
  if (lower.includes('already exists') || lower.includes('duplicate')) return 'Dữ liệu này đã tồn tại.';
  if (lower.includes('validation') || lower.includes('bad request')) return 'Dữ liệu nhập chưa hợp lệ.';
  if (lower.includes('network') || lower.includes('fetch failed')) return 'Không kết nối được tới máy chủ.';

  if (/^[\x00-\x7F]*$/.test(text)) {
    if (status === 400) return 'Dữ liệu gửi lên chưa hợp lệ.';
    if (status === 401) return 'Hết phiên đăng nhập.';
    if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
    if (status === 409) return 'Dữ liệu này đã tồn tại hoặc bị xung đột.';
    if (status >= 500) return 'Máy chủ đang gặp lỗi, vui lòng thử lại sau.';
  }

  return text;
}

function layLoiTuResponse(status: number, body: unknown): string {
  const defaultMessage = `Máy chủ trả về lỗi ${status}.`;
  if (!body || typeof body !== 'object') return defaultMessage;
  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(item => dichLoiServer(String(item), status)).join(', ');
  if (typeof message === 'string') return dichLoiServer(message, status);
  return defaultMessage;
}

async function goiRaw(path: string, options: RequestInit = {}, token?: string): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${SERVICE_LTS_DIRECT_URL}${path}`, { ...options, headers });
}

async function docJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function lamMoiTokenTuHeThong(): Promise<TokenPair> {
  if (dangRefreshPromise) return dangRefreshPromise;

  const promise = (async () => {
    if (!layTokenHienTai) throw new Error('Session manager chưa được cấu hình.');
    const current = layTokenHienTai();
    if (!current?.refreshToken) throw new Error('Không có refresh token để làm mới phiên.');

    const data = await lamMoiTokenService(current.refreshToken);
    const nextTokens: TokenPair = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
    luuTokenMoi?.(nextTokens);
    return nextTokens;
  })();

  dangRefreshPromise = promise;
  try {
    return await promise;
  } finally {
    dangRefreshPromise = null;
  }
}

export async function lamMoiTokenQuaQuanLyPhien(): Promise<TokenPair> {
  return lamMoiTokenTuHeThong();
}

// ── Generic fetch ────────────────────────────────────────────────────────
async function goiService<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') {
    const { mockPhanQuyen } = await import('./mock-phan-quyen');
    return mockPhanQuyen<T>(path, options);
  }

  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  let res: Response;
  try {
    res = await goiRaw(path, options, firstToken);
  } catch {
    throw new LoiServiceLts('Không kết nối được tới máy chủ.');
  }

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw(path, options, tokens.accessToken);
      } catch {
        throw new LoiServiceLts('Không kết nối được tới máy chủ.');
      }
    } catch (error) {
      if (error instanceof LoiServiceLts && error.status === 401) {
        xuLyPhienKhongHopLe?.();
        throw new LoiServiceLts('Hết phiên đăng nhập.', 401);
      }
      throw error;
    }
  }

  if (!res.ok) {
    const body = await docJson(res);
    throw new LoiServiceLts(layLoiTuResponse(res.status, body), res.status);
  }

  const body = await docJson(res);
  return body as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────
// Login & refresh đi THẲNG tới NestJS (không qua proxy Next.js) để backend
// thấy IP thật của client. Yêu cầu backend bật CORS cho domain frontend.
export async function dangNhapService(account: string, password: string): Promise<DangNhapApi> {
  return goiService<DangNhapApi>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
}

export async function lamMoiTokenService(refreshToken: string): Promise<DangNhapApi> {
  return goiService<DangNhapApi>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function doiMatKhauService(token: string, currentPassword: string, newPassword: string): Promise<DangNhapApi> {
  return goiService<DangNhapApi>('/auth/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  }, token);
}

export async function datLaiMatKhauTaiKhoanService(token: string, userId: string, newPassword: string): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(`/auth/${encodeURIComponent(userId)}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ newPassword }),
  }, token);
}

// ── Accounts ─────────────────────────────────────────────────────────────
export async function layTaiKhoanService(token: string, name?: string): Promise<TaiKhoanApi[]> {
  const query = name?.trim() ? `?name=${encodeURIComponent(name.trim())}` : '';
  return goiService<TaiKhoanApi[]>(`/auth/accounts${query}`, {}, token);
}

export async function taoTaiKhoanService(token: string, input: { account: string; password: string; fullName: string }): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>('/auth/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}

export async function kichHoatTaiKhoanService(token: string, userId: string): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(`/auth/accounts/${userId}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: true }),
  }, token);
}

export async function voHieuTaiKhoanService(token: string, userId: string): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(`/auth/accounts/${userId}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: false }),
  }, token);
}

export async function capNhatBaoVeService(token: string, userId: string, isProtected: boolean): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(`/auth/accounts/${userId}/protection`, {
    method: 'PATCH',
    body: JSON.stringify({ isProtected }),
  }, token);
}

// ── User policies ─────────────────────────────────────────────────────────
export async function capQuyenService(token: string, userId: string, policyCodes: PolicyCode[]): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(`/policies/accounts/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ policyCodes }),
  }, token);
}

export async function thuHoiQuyenService(token: string, userId: string, policyCodes: PolicyCode[]): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(`/policies/accounts/${userId}`, {
    method: 'DELETE',
    body: JSON.stringify({ policyCodes }),
  }, token);
}

// ── Roles ─────────────────────────────────────────────────────────────────
// GET /auth/roles trả về policies đã được flatten (roleListSelect)
export interface NhomQuyenApi {
  id: string;
  code: string;
  name: string;
  description: string;
  granterId: string | null;
  granter: { id: string; account: string; fullName: string | null } | null;
  policies: Array<{ id: string; code: string; name: string; description: string; createdAt: string; updatedAt: string }>;
  createdAt: string;
  updatedAt: string;
}

// PUT /auth/roles và DELETE /auth/roles/:code trả về rolePolicies chưa flatten (publicRoleSelect)
interface NhomQuyenUpsertApi {
  id: string;
  code: string;
  name: string;
  description: string | null;
  granterId: string | null;
  createdAt: string;
  updatedAt: string;
  rolePolicies: Array<{ policy: { id: string; code: string; name: string; description: string } }>;
}

function chuyenNhomQuyenUpsertApi(role: NhomQuyenUpsertApi): NhomQuyen {
  return {
    code: role.code,
    name: role.name,
    description: role.description ?? '',
    policies: role.rolePolicies
      .map(rp => rp.policy.code)
      .filter((code): code is PolicyCode => POLICY_CATALOG.some(p => p.code === code)),
    updatedAt: role.updatedAt,
  };
}

export function chuyenNhomQuyenApi(role: NhomQuyenApi): NhomQuyen {
  return {
    code: role.code,
    name: role.name,
    description: role.description,
    policies: role.policies
      .map(p => p.code)
      .filter((code): code is PolicyCode => POLICY_CATALOG.some(p => p.code === code)),
    granterName: normalizeDisplayText(role.granter?.fullName ?? role.granter?.account ?? ''),
    updatedAt: role.updatedAt,
  };
}

export async function layNhomQuyenService(token: string, name?: string): Promise<NhomQuyen[]> {
  const query = name ? `?name=${encodeURIComponent(name)}` : '';
  const data = await goiService<NhomQuyenApi[]>(`/auth/roles${query}`, {}, token);
  return (Array.isArray(data) ? data : []).map(chuyenNhomQuyenApi);
}

export async function luuNhomQuyenService(token: string, input: { code: string; name: string; description: string; policyCodes: PolicyCode[] }): Promise<NhomQuyen> {
  const data = await goiService<NhomQuyenUpsertApi>('/auth/roles', {
    method: 'PUT',
    body: JSON.stringify(input),
  }, token);
  return chuyenNhomQuyenUpsertApi(data);
}

export async function xoaNhomQuyenService(token: string, code: string): Promise<void> {
  await goiService<unknown>(`/auth/roles/${encodeURIComponent(code)}`, { method: 'DELETE' }, token);
}

// ── Customers ─────────────────────────────────────────────────────────────
export interface KhachHangApiVersion {
  version: number;
  organizationName: string;
  taxCode?: string | null;
  contactName: string;
  phoneNumber: string;
  email: string;
  address: string;
  status: string;
  changeNote?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface KhachHangApi {
  codeName: string;
  createdBy?: string | null;
  createdAt: string;
  versions: KhachHangApiVersion[];
  managers?: KhachHangManagerApi[];
}

export interface KhachHangManagerApi {
  id?: string;
  userId?: string;
  managerId?: string;
  account?: string;
  fullName: string | null;
  createdAt?: string;
}

export interface LuuKhachHangManagerInput {
  managerId: string;
}

export interface CapNhatKhachHangInput {
  organizationName: string;
  taxCode?: string;
  contactName: string;
  phoneNumber: string;
  email: string;
  address: string;
  status?: string;
  changeNote?: string;
}

export async function layKhachHangService(token?: string): Promise<KhachHangApi[]> {
  return goiService<KhachHangApi[]>('/customers', {}, token);
}

export async function taoMaKhachHangService(codeName: string, token?: string): Promise<KhachHangApi> {
  return goiService<KhachHangApi>('/customers', {
    method: 'POST',
    body: JSON.stringify({ codeName }),
  }, token);
}

export async function luuThongTinKhachHangService(codeName: string, input: CapNhatKhachHangInput, token?: string): Promise<KhachHangApi> {
  return goiService<KhachHangApi>(`/customers/${encodeURIComponent(codeName)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }, token);
}

export async function layNguoiPhuTrachKhachHangService(codeName: string, token?: string): Promise<KhachHangManagerApi[]> {
  return goiService<KhachHangManagerApi[]>(`/customers/${encodeURIComponent(codeName)}/managers`, {}, token);
}

export async function luuNguoiPhuTrachKhachHangService(
  codeName: string,
  managers: LuuKhachHangManagerInput[],
  token?: string,
): Promise<{ codeName: string; managers: KhachHangManagerApi[] }> {
  return goiService<{ codeName: string; managers: KhachHangManagerApi[] }>(`/customers/${encodeURIComponent(codeName)}/managers`, {
    method: 'PUT',
    body: JSON.stringify({ managers }),
  }, token);
}

// ── Transform ────────────────────────────────────────────────────────────
export function chuyenTaiKhoanApi(user: TaiKhoanApi): TaiKhoan {
  return {
    id: user.id,
    account: user.account,
    fullName: normalizeDisplayText(user.fullName || user.account),
    isActive: user.isActive,
    isProtected: user.isProtected,
    isSystem: Boolean(user.isSystem ?? user.is_system),
    policies: (Array.isArray(user.policies) ? user.policies : [])
      .map(p => p.code)
      .filter((code): code is PolicyCode => POLICY_CATALOG.some(policy => policy.code === code)),
    createdAt: user.createdAt,
    lastLogin: user.updatedAt,
  };
}
