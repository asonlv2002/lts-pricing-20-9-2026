// ═════════════════════════════════════════════════════════════════════════════
// API client: Service-LTS (NestJS + Prisma backend)
// Browser gọi trực tiếp Service-LTS, không qua proxy Next.js
// ═════════════════════════════════════════════════════════════════════════════

import { normalizeDisplayText } from '../text-codec';

// ── Constants ────────────────────────────────────────────────────────────
export const SERVICE_LTS_DIRECT_URL = process.env.NEXT_PUBLIC_SERVICE_LTS_URL ?? 'http://localhost:3001';
export const LS_ACCESS_TOKEN = 'lts_service_access_token';
export const LS_REFRESH_TOKEN = 'lts_service_refresh_token';

// ── Policy catalog ───────────────────────────────────────────────────────
export type PolicyCode =
  | 'ACCOUNT_READ' | 'ACCOUNT_CREATE' | 'ACCOUNT_ACTIVATE'
  | 'ACCOUNT_PASSWORD_UPDATE_ALL' | 'ROLE_CREATE' | 'ROLE_UPDATE' | 'ROLE_DELETE'
  | 'ROLE_READ' | 'CUSTOMER_CREATE' | 'CUSTOMER_MANAGER'
  | 'USER_POLICY_GRANT' | 'USER_POLICY_REVOKE'
  | 'QUOTATION_REVIEWER' | 'PRODUCT_MANAGER' | 'PRICING_SHEET_ADVISOR'
  | 'PRICE_CONFIG_MANAGER' | 'ACTIVITY_MONITOR';

export interface Policy {
  code: PolicyCode;
  ten: string;
  moTa: string;
  nhom: 'Tài khoản' | 'Vai trò' | 'Cấp phát' | 'Báo giá' | 'Sản phẩm' | 'Quản trị';
  rui_ro: 'thap' | 'trung' | 'cao';
}

export const POLICY_CATALOG: Policy[] = [
  { code: 'ACCOUNT_READ',       ten: 'Xem tài khoản',         moTa: 'Cho phép đọc danh sách tài khoản và quyền đã cấp.',     nhom: 'Tài khoản', rui_ro: 'thap'  },
  { code: 'ACCOUNT_CREATE',     ten: 'Tạo tài khoản',         moTa: 'Cho phép tạo mới tài khoản người dùng.',                nhom: 'Tài khoản', rui_ro: 'trung' },
  { code: 'ACCOUNT_ACTIVATE',   ten: 'Kích hoạt / vô hiệu tài khoản', moTa: 'Cho phép kích hoạt hoặc vô hiệu tài khoản người dùng.', nhom: 'Tài khoản', rui_ro: 'trung' },
  { code: 'ACCOUNT_PASSWORD_UPDATE_ALL', ten: 'Đặt lại mật khẩu tài khoản', moTa: 'Cho phép cập nhật mật khẩu cho tài khoản khác.', nhom: 'Tài khoản', rui_ro: 'cao' },
  { code: 'ROLE_READ',          ten: 'Xem vai trò',          moTa: 'Cho phép đọc các mẫu vai trò.',                         nhom: 'Vai trò', rui_ro: 'thap'  },
  { code: 'ROLE_CREATE',        ten: 'Tạo vai trò',          moTa: 'Cho phép tạo mẫu vai trò mới.',                         nhom: 'Vai trò', rui_ro: 'trung' },
  { code: 'ROLE_UPDATE',        ten: 'Sửa vai trò',          moTa: 'Cho phép cập nhật mẫu vai trò.',                         nhom: 'Vai trò', rui_ro: 'trung' },
  { code: 'ROLE_DELETE',        ten: 'Xóa vai trò',          moTa: 'Cho phép xóa mẫu vai trò.',                              nhom: 'Vai trò', rui_ro: 'cao'   },
  { code: 'CUSTOMER_CREATE',    ten: 'Tạo khách hàng',        moTa: 'Cho phép tạo hồ sơ khách hàng mới.',                    nhom: 'Cấp phát', rui_ro: 'trung' },
  { code: 'CUSTOMER_MANAGER',   ten: 'Quản lý người phụ trách khách hàng', moTa: 'Cho phép thêm hoặc xóa người phụ trách trên hồ sơ khách hàng.', nhom: 'Cấp phát', rui_ro: 'trung' },
  { code: 'USER_POLICY_GRANT',  ten: 'Cấp quyền cho user',    moTa: 'Cho phép cấp policy trực tiếp cho tài khoản.',          nhom: 'Cấp phát', rui_ro: 'cao'   },
  { code: 'USER_POLICY_REVOKE', ten: 'Thu hồi quyền user',    moTa: 'Cho phép thu hồi policy trực tiếp khỏi tài khoản.',     nhom: 'Cấp phát', rui_ro: 'cao'   },
  { code: 'QUOTATION_REVIEWER', ten: 'Duyệt báo giá',         moTa: 'Cho phép xem và duyệt/từ chối các báo giá đã nộp.',     nhom: 'Báo giá',  rui_ro: 'cao'   },
  { code: 'PRODUCT_MANAGER',    ten: 'Quản lý sản phẩm',      moTa: 'Cho phép xóa sản phẩm và quản lý danh mục sản phẩm.',   nhom: 'Sản phẩm', rui_ro: 'trung' },
  { code: 'PRICING_SHEET_ADVISOR', ten: 'Cố vấn bảng tính giá', moTa: 'Cho phép cập nhật kết quả cố vấn (masterResult) trên bảng tính giá.', nhom: 'Báo giá', rui_ro: 'cao' },
  { code: 'PRICE_CONFIG_MANAGER', ten: 'Quản lý cấu hình tính giá', moTa: 'Cho phép tạo và cập nhật phiên bản cấu hình tính giá (vật liệu, chi phí SX, lợi nhuận, ...).', nhom: 'Báo giá', rui_ro: 'cao' },
  { code: 'ACTIVITY_MONITOR',     ten: 'Xem nhật ký thao tác toàn hệ thống', moTa: 'Cho phép đọc nhật ký thao tác của tất cả người dùng (không có policy này chỉ xem được log của chính mình).', nhom: 'Quản trị', rui_ro: 'trung' },
];

// ── API types ────────────────────────────────────────────────────────────
export interface TaiKhoanApi {
  id: string;
  account: string;
  fullName: string | null;
  isActive: boolean;
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
  isSystem?: boolean;
  policies: PolicyCode[];
  createdAt: string;
  lastLogin?: string;
}

export interface VaiTro {
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

export async function kichHoatTaiKhoanService(token: string, userId: string, isActive: boolean): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(`/auth/accounts/${userId}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
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

// ── Policy catalog từ server (validate) ────────────────────────────────────
export interface PolicyServerApi {
  code: string;
  name: string;
  description: string;
}

// GET /policies — danh sách policy thật từ backend.
export async function layDanhSachPolicyService(token?: string): Promise<PolicyServerApi[]> {
  const data = await goiService<PolicyServerApi[]>('/policies', {}, token);
  return Array.isArray(data) ? data : [];
}

export interface KetQuaLechPolicy {
  // Code server có nhưng catalog frontend chưa khai báo.
  thieuTrongCatalog: string[];
  // Code catalog khai báo nhưng server không còn cung cấp.
  duTrongCatalog: string[];
}

// So sánh policy server với POLICY_CATALOG hardcode. Chỉ để cảnh báo lệch, không chặn UI.
export function kiemTraLechPolicy(serverPolicies: PolicyServerApi[]): KetQuaLechPolicy {
  const serverCodes = new Set(serverPolicies.map(p => p.code));
  const catalogCodes = new Set<string>(POLICY_CATALOG.map(p => p.code));
  return {
    thieuTrongCatalog: [...serverCodes].filter(code => !catalogCodes.has(code)),
    duTrongCatalog: [...catalogCodes].filter(code => !serverCodes.has(code)),
  };
}

// Tải policy server và log cảnh báo nếu lệch với catalog hardcode. Trả về kết quả lệch (hoặc null nếu lỗi).
export async function canhBaoLechPolicyService(token?: string): Promise<KetQuaLechPolicy | null> {
  try {
    const serverPolicies = await layDanhSachPolicyService(token);
    const lech = kiemTraLechPolicy(serverPolicies);
    if (lech.thieuTrongCatalog.length > 0) {
      console.warn('[policy] Server có policy chưa khai báo trong POLICY_CATALOG:', lech.thieuTrongCatalog);
    }
    if (lech.duTrongCatalog.length > 0) {
      console.warn('[policy] POLICY_CATALOG khai báo policy server không cung cấp:', lech.duTrongCatalog);
    }
    return lech;
  } catch {
    return null;
  }
}

// ── Roles ─────────────────────────────────────────────────────────────────
// GET /auth/roles trả về policies đã được flatten (roleListSelect)
export interface VaiTroApi {
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
interface VaiTroUpsertApi {
  id: string;
  code: string;
  name: string;
  description: string | null;
  granterId: string | null;
  createdAt: string;
  updatedAt: string;
  rolePolicies: Array<{ policy: { id: string; code: string; name: string; description: string } }>;
}

function chuyenVaiTroUpsertApi(role: VaiTroUpsertApi): VaiTro {
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

export function chuyenVaiTroApi(role: VaiTroApi): VaiTro {
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

export async function layVaiTroService(token: string, name?: string): Promise<VaiTro[]> {
  const query = name ? `?name=${encodeURIComponent(name)}` : '';
  const data = await goiService<VaiTroApi[]>(`/auth/roles${query}`, {}, token);
  return (Array.isArray(data) ? data : []).map(chuyenVaiTroApi);
}

export async function luuVaiTroService(token: string, input: { code: string; name: string; description: string; policyCodes: PolicyCode[] }): Promise<VaiTro> {
  const data = await goiService<VaiTroUpsertApi>('/auth/roles', {
    method: 'PUT',
    body: JSON.stringify(input),
  }, token);
  return chuyenVaiTroUpsertApi(data);
}

export async function xoaVaiTroService(token: string, code: string): Promise<void> {
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
  id: string;
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
  const managerIds = managers.map(manager => manager.managerId);
  return goiService<{ codeName: string; managers: KhachHangManagerApi[] }>(`/customers/${encodeURIComponent(codeName)}/managers`, {
    method: 'PUT',
    body: JSON.stringify({ managerIds }),
  }, token);
}

// GET /customers/{codeName} — chi tiết 1 khách hàng (lazy-load thay vì tải toàn bộ list).
export async function layChiTietKhachHangService(codeName: string, token?: string): Promise<KhachHangApi> {
  return goiService<KhachHangApi>(`/customers/${encodeURIComponent(codeName)}`, {}, token);
}

// GET /customers/{codeName}/versions/latest — phiên bản mới nhất của khách hàng.
export async function layPhienBanMoiNhatKhachHangService(codeName: string, token?: string): Promise<KhachHangApiVersion> {
  return goiService<KhachHangApiVersion>(`/customers/${encodeURIComponent(codeName)}/versions/latest`, {}, token);
}

// GET /customers/{codeName}/versions/{versionId} — một phiên bản cụ thể.
export async function layPhienBanKhachHangService(codeName: string, versionId: string, token?: string): Promise<KhachHangApiVersion> {
  return goiService<KhachHangApiVersion>(`/customers/${encodeURIComponent(codeName)}/versions/${encodeURIComponent(versionId)}`, {}, token);
}

// ── Pricing Sheet ────────────────────────────────────────────────────────
// POST /pricing-sheet — tạo pricing sheet (input + override sale + override admin).
// Server lưu nguyên `inputValue`, `saleResult`, `masterResult` dưới dạng JSON object
// free-form. Frontend tự tính lại kết quả khi tải về (chỉ override mới cần lưu).
export interface TaoPricingSheetInput {
  pricingSheetName: string;
  customerCodeName: string;
  inputValue: unknown;
  saleResult?: unknown;
  masterResult?: unknown;
  quotationId?: string;
  note?: string;
}

// PATCH /pricing-sheet/{id}/result — cập nhật inputValue và saleResult
export interface CapNhatPricingSheetResultInput {
  inputValue: unknown;
  saleResult?: unknown;
  useLatestPriceConfigs?: boolean;
}

// PATCH /pricing-sheet/{id}/advisor-result — cập nhật masterResult (cần quyền PRICING_SHEET_ADVISOR)
export interface CapNhatPricingSheetAdvisorInput {
  masterResult?: unknown;
}

export interface PricingSheetApi {
  id: string;
  pricingSheetName: string;
  customerCodeName?: string;
  customer?: { codeName?: string | null } | null;
  inputValue?: unknown;
  saleResult?: unknown | null;
  masterResult?: unknown | null;
  quotationId?: string | null;
  note?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  priceConfigIds?: string[];
  original?: { actorName?: string | null; customerName?: string | null } | null;
}

export async function taoPricingSheetService(
  input: TaoPricingSheetInput,
  token?: string,
): Promise<PricingSheetApi> {
  return goiService<PricingSheetApi>('/pricing-sheet', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}

export async function layDanhSachPricingSheetService(token?: string): Promise<PricingSheetApi[]> {
  const data = await goiService<PricingSheetApi[]>('/pricing-sheet', {}, token);
  return Array.isArray(data) ? data : [];
}

// PATCH /pricing-sheet/{id}/result — cập nhật inputValue và saleResult (Sale/Admin)
export async function capNhatPricingSheetResultService(
  id: string,
  input: CapNhatPricingSheetResultInput,
  token?: string,
): Promise<PricingSheetApi> {
  return goiService<PricingSheetApi>(`/pricing-sheet/${encodeURIComponent(id)}/result`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }, token);
}

// PATCH /pricing-sheet/{id}/advisor-result — cập nhật masterResult (cần quyền PRICING_SHEET_ADVISOR)
export async function capNhatPricingSheetAdvisorResultService(
  id: string,
  input: CapNhatPricingSheetAdvisorInput,
  token?: string,
): Promise<PricingSheetApi> {
  return goiService<PricingSheetApi>(`/pricing-sheet/${encodeURIComponent(id)}/advisor-result`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }, token);
}

// -- Price Config ---------------------------------------------------------------
export interface PriceConfigApi {
  id: string;
  configName: string;
  version: number;
  inputValue: unknown;
  createdBy: string | null;
  createdAt: string;
}

export async function upsertPriceConfigService(
  input: { configName: string; inputValue: unknown },
  token?: string,
): Promise<PriceConfigApi> {
  return goiService<PriceConfigApi>('/price-config', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}

export async function layPriceConfigMoiNhatService(token?: string): Promise<PriceConfigApi[]> {
  const data = await goiService<PriceConfigApi[]>('/price-config/latest-version', {}, token);
  return Array.isArray(data) ? data : [];
}

export async function layLichSuPriceConfigService(
  configName: string,
  token?: string,
): Promise<PriceConfigApi[]> {
  const data = await goiService<PriceConfigApi[]>(
    `/price-config/${encodeURIComponent(configName)}`,
    {},
    token,
  );
  return Array.isArray(data) ? data : [];
}

export async function xoaPriceConfigService(
  id: string,
  token?: string,
): Promise<{ success: true } | { success: false; pricingSheetNames: string[] }> {
  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  let res: Response;
  try {
    res = await goiRaw(`/price-config/${encodeURIComponent(id)}`, { method: 'DELETE' }, firstToken);
  } catch {
    throw new LoiServiceLts('Không kết nối được tới máy chủ.');
  }

  if (res.status === 401) {
    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw(`/price-config/${encodeURIComponent(id)}`, { method: 'DELETE' }, tokens.accessToken);
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

  if (res.ok) return { success: true };

  const body = await docJson(res);
  const pricingSheetNames: string[] = Array.isArray((body as { pricingSheetNames?: unknown })?.pricingSheetNames)
    ? ((body as { pricingSheetNames: unknown[] }).pricingSheetNames.map(String))
    : [];
  return { success: false, pricingSheetNames };
}

// -- Quotations ----------------------------------------------------------------
// Frontend phải tạo pricing sheet trước, lấy id rồi gắn vào quotation này.
export interface TaoBaoGiaInput {
  customerCodeName: string;
  description?: string;
  inputValue: unknown;
  pricingSheetIds: string[];
}

export interface BaoGiaApi {
  id: string;
  customerId?: string | null;
  productId?: string | null;
  description?: string | null;
  quotationName?: string | null;
  inputValue?: unknown;
  updateStatus?: string | null;
  createdBy?: string | null;
  reviewerId?: string | null;
  pricingSheets?: PricingSheetApi[];
  original?: { actorName?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export async function taoBaoGiaService(input: TaoBaoGiaInput, token?: string): Promise<BaoGiaApi> {
  return goiService<BaoGiaApi>('/quotations', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}

// Trạng thái báo giá theo server thật (xem backend quotation_status.ts).
// Enum server: draft | submitted | approved | rejected | customer approved | customer rejected
// - 'drafted'           : báo giá nháp, chưa nộp duyệt
// - 'submitted'         : đã nộp, đang chờ người duyệt xử lý
// - 'approved'          : đã duyệt nội bộ
// - 'rejected'          : bị từ chối nội bộ
// - 'customer_approved' : khách hàng đã duyệt
// - 'customer_rejected' : khách hàng từ chối
// - 'unknown'           : giá trị server lạ, chưa ánh xạ được
export type TrangThaiBaoGiaServer =
  | 'drafted' | 'submitted' | 'approved' | 'rejected'
  | 'customer_approved' | 'customer_rejected' | 'unknown';

// Backend phơi updateStatus dạng string; hàm này quy đổi về tập trạng thái UI dùng.
export function chuyenTrangThaiBaoGia(updateStatus?: string | null): TrangThaiBaoGiaServer {
  const value = (updateStatus ?? '').trim().toLowerCase();
  if (!value || value === 'draft' || value === 'drafted') return 'drafted';
  if (value === 'submitted') return 'submitted';
  if (value === 'approved') return 'approved';
  if (value === 'rejected') return 'rejected';
  if (value === 'customer approved') return 'customer_approved';
  if (value === 'customer rejected') return 'customer_rejected';
  return 'unknown';
}

export const NHAN_TRANG_THAI_BAO_GIA: Record<TrangThaiBaoGiaServer, string> = {
  drafted: 'Nháp',
  submitted: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
  customer_approved: 'Khách đã duyệt',
  customer_rejected: 'Khách từ chối',
  unknown: 'Không xác định',
};

export interface SuaBaoGiaInput {
  quotationId: string;
  quotationName: string;
  inputValue: unknown;
}

// PATCH /quotations — tạo bản sửa (nháp mới) từ báo giá bị từ chối.
export async function taoBanSuaBaoGiaService(input: SuaBaoGiaInput, token?: string): Promise<BaoGiaApi> {
  return goiService<BaoGiaApi>('/quotations', {
    method: 'PATCH',
    body: JSON.stringify(input),
  }, token);
}

// GET /quotations — danh sách báo giá thuộc các khách hàng đang quản lý.
export async function layDanhSachBaoGiaService(token?: string): Promise<BaoGiaApi[]> {
  const data = await goiService<BaoGiaApi[]>('/quotations', {}, token);
  return Array.isArray(data) ? data : [];
}

// PATCH /quotations/{id}/status_update — nộp một báo giá nháp để chờ duyệt.
export async function nopBaoGiaService(quotationId: string, token?: string): Promise<BaoGiaApi> {
  return goiService<BaoGiaApi>(`/quotations/${encodeURIComponent(quotationId)}/status_update`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  }, token);
}

// GET /quotations/non-draft — báo giá đã nộp đang chờ duyệt (cần QUOTATION_REVIEWER).
export async function layBaoGiaChoDuyetService(token?: string): Promise<BaoGiaApi[]> {
  const data = await goiService<BaoGiaApi[]>('/quotations/non-draft', {}, token);
  return Array.isArray(data) ? data : [];
}

// PATCH /quotations/{id}/review_update_status — duyệt hoặc từ chối báo giá đã nộp.
export async function duyetBaoGiaService(
  quotationId: string,
  updateStatus: 'approved' | 'rejected',
  token?: string,
): Promise<BaoGiaApi> {
  return goiService<BaoGiaApi>(`/quotations/${encodeURIComponent(quotationId)}/review_update_status`, {
    method: 'PATCH',
    body: JSON.stringify({ updateStatus }),
  }, token);
}

// ── Activity Logs ────────────────────────────────────────────────────────
// Server resourceType: 'customer' | 'pricing_sheet' | 'quotation' | 'account' | 'role' | 'user_policy' | 'customer_manager'
// Server action: xem activity-log-actions.ts (backend)
export interface ActivityLogServerApi {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// GET /activity-logs — có policy ACTIVITY_MONITOR mới trả toàn bộ log.
// Không có policy thì backend chỉ trả log có actorId === user hiện tại.
export async function layNhatKyHeThongService(token?: string): Promise<ActivityLogServerApi[]> {
  const data = await goiService<ActivityLogServerApi[]>('/activity-logs', {}, token);
  return Array.isArray(data) ? data : [];
}

// ── Transform ────────────────────────────────────────────────────────────
export function chuyenTaiKhoanApi(user: TaiKhoanApi): TaiKhoan {
  return {
    id: user.id,
    account: user.account,
    fullName: normalizeDisplayText(user.fullName || user.account),
    isActive: user.isActive,
    isSystem: Boolean(user.isSystem ?? user.is_system),
    policies: (Array.isArray(user.policies) ? user.policies : [])
      .map(p => p.code)
      .filter((code): code is PolicyCode => POLICY_CATALOG.some(policy => policy.code === code)),
    createdAt: user.createdAt,
    lastLogin: user.updatedAt,
  };
}
