// ═════════════════════════════════════════════════════════════════════════════
// API client: Service-LTS (NestJS + Prisma backend)
// Browser gọi trực tiếp Service-LTS, không qua proxy Next.js
// ═════════════════════════════════════════════════════════════════════════════

import { normalizeDisplayText } from "../text-codec";

// ── Constants ────────────────────────────────────────────────────────────
export const SERVICE_LTS_DIRECT_URL =
  process.env.NEXT_PUBLIC_SERVICE_LTS_URL ?? "http://localhost:3001";
export const LS_ACCESS_TOKEN = "lts_service_access_token";
export const LS_REFRESH_TOKEN = "lts_service_refresh_token";
/** Cache policies theo userId — JWT không chứa policies; tránh gọi GET /auth/accounts lúc login. */
export const LS_USER_POLICIES = "lts_service_user_policies";

// ── Policy catalog ───────────────────────────────────────────────────────
export type PolicyCode =
  | "ACCOUNT_MANAGER"
  | "ROLE_MANAGER"
  | "CUSTOMER_MANAGER"
  | "USER_POLICY_GRANT"
  | "USER_POLICY_REVOKE"
  | "QUOTATION_REVIEWER"
  | "PRODUCT_MANAGER" // legacy, server không hỗ trợ
  | "PRICING_SHEET_ADVISOR"
  | "PRICE_CONFIG_MANAGER"
  | "ORDER_REVIEWER"
  | "ACTIVITY_MONITOR"
  | "SYSTEM_MONITOR"
  // ── CPSX nâng cao ──────────────────────────────────────────
  | "CPSX_UPGRADE_EDIT_ELECTRIC_TIME_FRAME"
  | "CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE"
  | "CPSX_UPGRADE_EDIT_LABOR_PRINT"
  | "CPSX_UPGRADE_EDIT_LABOR_LAMINATE"
  | "CPSX_UPGRADE_EDIT_LABOR_SLIT"
  | "CPSX_UPGRADE_EDIT_LABOR_BAG"
  | "CPSX_UPGRADE_EDIT_INK_OPP"
  | "CPSX_UPGRADE_EDIT_INK_PET"
  | "CPSX_UPGRADE_EDIT_INK_PE"
  | "CPSX_UPGRADE_EDIT_SOLVENT"
  | "CPSX_UPGRADE_EDIT_ADHESIVE"
  | "CPSX_UPGRADE_EDIT_INK_RATE"
  | "CPSX_UPGRADE_EDIT_ADHESIVE_RATE"
  | "CPSX_UPGRADE_EDIT_TIME_PRINT"
  | "CPSX_UPGRADE_EDIT_TIME_LAMINATE"
  | "CPSX_UPGRADE_EDIT_TIME_SLIT"
  | "CPSX_UPGRADE_EDIT_TIME_BAG";

export const CO_QUYEN_CPSX_UPGRADE_PREFIX = "CPSX_UPGRADE_EDIT_";

export function laPolicyCpsxUpgrade(code: string): boolean {
  return code.startsWith(CO_QUYEN_CPSX_UPGRADE_PREFIX);
}

export interface Policy {
  code: PolicyCode;
  ten: string;
  moTa: string;
  nhom:
    | "Tài khoản"
    | "Vai trò"
    | "Cấp phát"
    | "Báo giá"
    | "Sản phẩm"
    | "Quản trị"
    | "CPSX nâng cao";
  rui_ro: "thap" | "trung" | "cao";
}

export const POLICY_CATALOG: Policy[] = [
  {
    code: "ACCOUNT_MANAGER",
    ten: "Quản lý tài khoản",
    moTa: "Quản lý tài khoản, duyệt yêu cầu đặt lại mật khẩu và thông tin đăng nhập.",
    nhom: "Tài khoản",
    rui_ro: "cao",
  },
  {
    code: "ROLE_MANAGER",
    ten: "Quản lý vai trò",
    moTa: "Đọc, tạo, sửa và xóa mẫu vai trò.",
    nhom: "Vai trò",
    rui_ro: "cao",
  },

  {
    code: "CUSTOMER_MANAGER",
    ten: "Quản lý người phụ trách khách hàng",
    moTa: "Cho phép thêm hoặc xóa người phụ trách trên hồ sơ khách hàng.",
    nhom: "Cấp phát",
    rui_ro: "trung",
  },
  {
    code: "USER_POLICY_GRANT",
    ten: "Cấp quyền cho user",
    moTa: "Cho phép cấp policy trực tiếp cho tài khoản.",
    nhom: "Cấp phát",
    rui_ro: "cao",
  },
  {
    code: "USER_POLICY_REVOKE",
    ten: "Thu hồi quyền user",
    moTa: "Cho phép thu hồi policy trực tiếp khỏi tài khoản.",
    nhom: "Cấp phát",
    rui_ro: "cao",
  },
  {
    code: "QUOTATION_REVIEWER",
    ten: "Duyệt báo giá",
    moTa: "Cho phép xem và duyệt/từ chối các báo giá đã nộp.",
    nhom: "Báo giá",
    rui_ro: "cao",
  },
  {
    code: "ORDER_REVIEWER",
    ten: "Duyệt đơn sản xuất",
    moTa:
      "Cho phép xem toàn bộ đơn sản xuất (QuotationPricingSheetOrder) và duyệt quyết định cố vấn (hasAdvisorApproved).",
    nhom: "Báo giá",
    rui_ro: "cao",
  },
  {
    code: "PRODUCT_MANAGER",
    ten: "Quản lý sản phẩm (legacy)",
    moTa:
      "Legacy policy từ web, server không còn cung cấp. Giữ trong catalog để không phá policy cũ đã cấp; UI nên bỏ qua khi so khớp quyền thực tế.",
    nhom: "Sản phẩm",
    rui_ro: "trung",
  },
  {
    code: "PRICING_SHEET_ADVISOR",
    ten: "Cố vấn bảng tính giá",
    moTa: "Cho phép cập nhật kết quả cố vấn (masterResult) trên bảng tính giá.",
    nhom: "Báo giá",
    rui_ro: "cao",
  },
  {
    code: "PRICE_CONFIG_MANAGER",
    ten: "Quản lý cấu hình tính giá",
    moTa: "Cho phép tạo và cập nhật phiên bản cấu hình tính giá (vật liệu, chi phí SX, lợi nhuận, ...).",
    nhom: "Báo giá",
    rui_ro: "cao",
  },
  {
    code: "ACTIVITY_MONITOR",
    ten: "Xem nhật ký thao tác toàn hệ thống",
    moTa: "Cho phép đọc nhật ký thao tác của tất cả người dùng (không có policy này chỉ xem được log của chính mình).",
    nhom: "Quản trị",
    rui_ro: "trung",
  },
  {
    code: "SYSTEM_MONITOR",
    ten: "Quản lý tài nguyên hệ thống",
    moTa: "Cho phép theo dõi tài nguyên VPS và container theo thời gian thực.",
    nhom: "Quản trị",
    rui_ro: "trung",
  },
  // ── CPSX nâng cao ──────────────────────────────────────────
  {
    code: "CPSX_UPGRADE_EDIT_ELECTRIC_TIME_FRAME",
    ten: "CPSX — Giá điện theo khung giờ",
    moTa: "Cho phép sửa bảng giá điện theo khung giờ trong CPSX nâng cao.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE",
    ten: "CPSX — Điện/phút mỗi máy",
    moTa: "Cho phép sửa công suất + hiệu suất của từng máy.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_LABOR_PRINT",
    ten: "CPSX — Lương CN máy in",
    moTa: "Cho phép sửa lương công nhân máy in.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_LABOR_LAMINATE",
    ten: "CPSX — Lương CN máy ghép",
    moTa: "Cho phép sửa lương công nhân máy ghép.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_LABOR_SLIT",
    ten: "CPSX — Lương CN máy chia",
    moTa: "Cho phép sửa lương công nhân máy chia.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_LABOR_BAG",
    ten: "CPSX — Lương CN máy làm túi",
    moTa: "Cho phép sửa lương công nhân máy làm túi.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_INK_OPP",
    ten: "CPSX — Bảng giá mực in OPP",
    moTa: "Cho phép sửa bảng giá mực in OPP.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_INK_PET",
    ten: "CPSX — Bảng giá mực in PET",
    moTa: "Cho phép sửa bảng giá mực in PET.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_INK_PE",
    ten: "CPSX — Bảng giá mực in PE",
    moTa: "Cho phép sửa bảng giá mực in PE.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_SOLVENT",
    ten: "CPSX — Bảng giá dung môi",
    moTa: "Cho phép sửa bảng giá dung môi in + ghép.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_ADHESIVE",
    ten: "CPSX — Bảng giá keo ghép",
    moTa: "Cho phép sửa bảng giá keo ghép.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_INK_RATE",
    ten: "CPSX — Định mức mực in + DM in",
    moTa: "Cho phép sửa định mức mực in và dung môi in theo số màu.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_ADHESIVE_RATE",
    ten: "CPSX — Định mức keo + DM ghép",
    moTa: "Cho phép sửa định mức keo khô và dung môi pha keo.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_TIME_PRINT",
    ten: "CPSX — Thời gian SX máy in",
    moTa: "Cho phép sửa thời gian sản xuất máy in.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_TIME_LAMINATE",
    ten: "CPSX — Thời gian SX máy ghép",
    moTa: "Cho phép sửa thời gian sản xuất máy ghép.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_TIME_SLIT",
    ten: "CPSX — Thời gian SX máy chia",
    moTa: "Cho phép sửa thời gian sản xuất máy chia.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
  {
    code: "CPSX_UPGRADE_EDIT_TIME_BAG",
    ten: "CPSX — Thời gian SX máy làm túi",
    moTa: "Cho phép sửa thời gian sản xuất máy làm túi.",
    nhom: "CPSX nâng cao",
    rui_ro: "cao",
  },
];

// ── API types ────────────────────────────────────────────────────────────
export interface TaiKhoanApi {
  id: string;
  account: string;
  fullName: string | null;
  isActive: boolean;
  isSystem?: boolean;
  is_system?: boolean;
  avatarUrl?: string | null;
  signatureUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  policies: Array<{
    id?: string;
    code: string;
    name?: string;
    description?: string | null;
  }>;
  priceConfigPolicies?: Array<{
    configName: string;
    policies: string[];
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
    avatarUrl?: string | null;
    signatureUrl?: string | null;
  };
}

/** GET /auth/me/security — trạng thái bảo mật của tài khoản đang đăng nhập. */
export interface TrangThaiBaoMatApi {
  hasPin: boolean;
}

/** POST /auth/pin/verify — token ngắn hạn (mặc định 1 phút) dùng để gọi route duyệt. */
export interface XacThucPinApi {
  pinToken: string;
  expiresIn: number;
}

export interface TaiKhoan {
  id: string;
  account: string;
  fullName: string;
  isActive: boolean;
  isSystem?: boolean;
  avatarUrl?: string | null;
  signatureUrl?: string | null;
  policies: PolicyCode[];
  priceConfigPolicies?: Array<{
    configName: string;
    policies: string[];
  }>;
  createdAt: string;
  lastLogin?: string;
}

export interface AnhDaiDienUploadApi {
  id: string;
  account: string;
  fullName: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
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
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LoiServiceLts";
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

/** Lấy message thô từ body NestJS (string | string[]). */
function trichMessageTuBody(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join(", ");
  if (typeof message === "string") return message;
  return "";
}

/**
 * 401 do sai PIN / pin-token — KHÔNG phải hết phiên JWT.
 * Tránh refresh + logout khi verify PIN sai (BE trả 401 Invalid PIN).
 */
export function laLoiPinHttp(message: string): boolean {
  const lower = message.trim().toLowerCase();
  if (!lower) return false;
  return (
    lower.includes("invalid pin") ||
    lower.includes("missing pin token") ||
    lower.includes("pin token expired") ||
    lower.includes("pin must be exactly 6 digits") ||
    lower.includes("mã pin")
  );
}

function dichLoiServer(message: string, status: number): string {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (lower.includes("invalid refresh token")) return "Hết phiên đăng nhập.";
  if (lower.includes("invalid credentials") || lower.includes("unauthorized"))
    return "Tài khoản hoặc mật khẩu không đúng.";
  if (lower.includes("missing pin token"))
    return "Vui lòng nhập mã PIN để xác nhận thao tác.";
  if (lower.includes("pin token expired"))
    return "Phiên xác nhận mã PIN đã hết hạn, vui lòng nhập lại mã PIN.";
  if (lower.includes("invalid pin token"))
    return "Mã PIN xác nhận không hợp lệ, vui lòng nhập lại.";
  if (lower.includes("invalid pin"))
    return "Mã PIN không đúng.";
  if (lower.includes("pin must be exactly 6 digits"))
    return "Mã PIN phải gồm đúng 6 chữ số.";
  if (lower.includes("password reset code must be exactly 6 digits"))
    return "Mã đặt lại mật khẩu phải gồm đúng 6 chữ số.";
  if (lower.includes("invalid password reset code"))
    return "Mã đặt lại mật khẩu không đúng.";
  if (lower.includes("invalid password reset request"))
    return "Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";
  if (lower.includes("password reset request expired"))
    return "Yêu cầu đặt lại mật khẩu đã hết hạn.";
  if (lower.includes("password reset request was already reviewed"))
    return "Yêu cầu này đã được xử lý trước đó.";
  if (lower.includes("forbidden"))
    return "Bạn không có quyền thực hiện thao tác này.";
  if (lower.includes("not found")) return "Không tìm thấy dữ liệu yêu cầu.";
  if (lower.includes("already exists") || lower.includes("duplicate"))
    return "Dữ liệu này đã tồn tại.";
  if (lower.includes("validation") || lower.includes("bad request"))
    return "Dữ liệu nhập chưa hợp lệ.";
  if (lower.includes("network") || lower.includes("fetch failed"))
    return "Không kết nối được tới máy chủ.";
  if (
    status === 429 ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  ) {
    return "Máy chủ đang giới hạn truy cập, vui lòng thử lại sau.";
  }

  if (/^[\x00-\x7F]*$/.test(text)) {
    if (status === 400) return "Dữ liệu gửi lên chưa hợp lệ.";
    if (status === 401) return "Hết phiên đăng nhập.";
    if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (status === 404) return "Không tìm thấy dữ liệu yêu cầu.";
    if (status === 409) return "Dữ liệu này đã tồn tại hoặc bị xung đột.";
    if (status === 429)
      return "Máy chủ đang giới hạn truy cập, vui lòng thử lại sau.";
    if (status >= 500) return "Máy chủ đang gặp lỗi, vui lòng thử lại sau.";
  }

  return text;
}

function layLoiTuResponse(status: number, body: unknown): string {
  const defaultMessage = `Máy chủ trả về lỗi ${status}.`;
  if (!body || typeof body !== "object") return defaultMessage;
  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message))
    return message
      .map((item) => dichLoiServer(String(item), status))
      .join(", ");
  if (typeof message === "string") return dichLoiServer(message, status);
  return defaultMessage;
}

async function goiRaw(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<Response> {
  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
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
    if (!layTokenHienTai)
      throw new Error("Session manager chưa được cấu hình.");
    const current = layTokenHienTai();
    if (!current?.refreshToken)
      throw new Error("Không có refresh token để làm mới phiên.");

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
async function goiService<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  lanThu = 0,
): Promise<T> {
  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  let res: Response;
  try {
    res = await goiRaw(path, options, firstToken);
  } catch {
    throw new LoiServiceLts("Không kết nối được tới máy chủ.");
  }

  const laAuthPublic =
    path === "/auth/login" ||
    path === "/auth/refresh" ||
    path === "/auth/password-reset-requests" ||
    path === "/auth/password-reset-requests/verify" ||
    path === "/auth/password-reset-requests/consume";

  if (res.status === 401 && !laAuthPublic) {
    // Đọc body trước: 401 Invalid PIN ≠ hết phiên JWT — không refresh/logout.
    const body401 = await docJson(res);
    if (laLoiPinHttp(trichMessageTuBody(body401))) {
      throw new LoiServiceLts(layLoiTuResponse(401, body401), 401);
    }

    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw(path, options, tokens.accessToken);
      } catch {
        throw new LoiServiceLts("Không kết nối được tới máy chủ.");
      }
    } catch (error) {
      // Pin error có thể ném từ nhánh dưới (hiếm) — không logout.
      if (error instanceof LoiServiceLts && laLoiPinHttp(error.message)) {
        throw error;
      }
      if (error instanceof LoiServiceLts && error.status === 401) {
        xuLyPhienKhongHopLe?.();
        throw new LoiServiceLts("Hết phiên đăng nhập.", 401);
      }
      throw error;
    }

    // Sau refresh vẫn 401: phân biệt PIN vs phiên.
    if (res.status === 401) {
      const bodyRetry = await docJson(res);
      if (laLoiPinHttp(trichMessageTuBody(bodyRetry))) {
        throw new LoiServiceLts(layLoiTuResponse(401, bodyRetry), 401);
      }
      xuLyPhienKhongHopLe?.();
      throw new LoiServiceLts("Hết phiên đăng nhập.", 401);
    }
  }

  // Retry 1 lần khi 429 (rate limit) — GET + POST by-ids
  if (res.status === 429 && lanThu < 1) {
    const retryAfter = Number(res.headers.get("Retry-After"));
    const waitMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 10_000)
        : 1500;
    await new Promise((r) => setTimeout(r, waitMs));
    return goiService<T>(path, options, token, lanThu + 1);
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
export async function dangNhapService(
  account: string,
  password: string,
): Promise<DangNhapApi> {
  return goiService<DangNhapApi>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ account, password }),
  });
}

export async function lamMoiTokenService(
  refreshToken: string,
): Promise<DangNhapApi> {
  return goiService<DangNhapApi>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function doiMatKhauService(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<DangNhapApi> {
  return goiService<DangNhapApi>(
    "/auth/me/password",
    {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    token,
  );
}

// ── Password reset request (public + ACCOUNT_MANAGER) ───────────────────
export type PasswordResetStatus = "pending" | "accepted" | "verified";

export interface PasswordResetRequestApi {
  id: string;
  userId: string;
  status: PasswordResetStatus;
  expiresAt: string;
  createdAt: string;
  user?: {
    id: string;
    account: string;
    fullName: string | null;
    isActive: boolean;
  };
}

export interface PasswordResetReviewApi {
  id: string;
  decision: "accepted" | "rejected";
  code?: string;
  expiresAt?: string;
}

export interface PasswordResetVerifyApi {
  id: string;
  status: PasswordResetStatus;
  expiresAt: string;
}

/** POST /auth/password-reset-requests — public, body { account }. Luôn { ok: true }. */
export async function taoYeuCauDatLaiMatKhauService(
  account: string,
): Promise<{ ok: true }> {
  return goiService<{ ok: true }>("/auth/password-reset-requests", {
    method: "POST",
    body: JSON.stringify({ account: account.trim() }),
  });
}

/** GET /auth/me/password-reset-requests — JWT, request hiện tại hoặc null. */
export async function layYeuCauDatLaiMatKhauCuaToiService(
  token: string,
): Promise<PasswordResetRequestApi | null> {
  return goiService<PasswordResetRequestApi | null>(
    "/auth/me/password-reset-requests",
    {},
    token,
  );
}

/** GET /auth/password-reset-requests — ACCOUNT_MANAGER. */
export async function danhSachYeuCauDatLaiMatKhauService(
  token: string,
): Promise<PasswordResetRequestApi[]> {
  return goiService<PasswordResetRequestApi[]>(
    "/auth/password-reset-requests",
    {},
    token,
  );
}

/** PATCH /auth/password-reset-requests/:id/review — ACCOUNT_MANAGER. */
export async function duyetYeuCauDatLaiMatKhauService(
  token: string,
  requestId: string,
  decision: "accepted" | "rejected",
): Promise<PasswordResetReviewApi> {
  return goiService<PasswordResetReviewApi>(
    `/auth/password-reset-requests/${encodeURIComponent(requestId)}/review`,
    {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    },
    token,
  );
}

/** POST /auth/password-reset-requests/verify — public. */
export async function xacThucMaDatLaiMatKhauService(
  account: string,
  code: string,
): Promise<PasswordResetVerifyApi> {
  return goiService<PasswordResetVerifyApi>(
    "/auth/password-reset-requests/verify",
    {
      method: "POST",
      body: JSON.stringify({ account: account.trim(), code: code.trim() }),
    },
  );
}

/** POST /auth/password-reset-requests/consume — public → tokens như login. */
export async function datMatKhauMoiTuYeuCauService(
  account: string,
  requestId: string,
  newPassword: string,
): Promise<DangNhapApi> {
  return goiService<DangNhapApi>("/auth/password-reset-requests/consume", {
    method: "POST",
    body: JSON.stringify({
      account: account.trim(),
      id: requestId,
      newPassword,
    }),
  });
}

// GET /auth/me/security — tài khoản có đặt mã PIN chưa (PIN lưu trên máy chủ).
export async function layTrangThaiBaoMatService(token?: string): Promise<TrangThaiBaoMatApi> {
  return goiService<TrangThaiBaoMatApi>("/auth/me/security", {}, token);
}

// PUT /auth/me/pin — đặt hoặc thay mã PIN 6 số (bắt buộc nhập mật khẩu hiện tại).
export async function datPinService(
  currentPassword: string,
  pin: string,
  token?: string,
): Promise<{ pinSet: boolean }> {
  return goiService<{ pinSet: boolean }>(
    "/auth/me/pin",
    {
      method: "PUT",
      body: JSON.stringify({ currentPassword, pin }),
    },
    token,
  );
}

// POST /auth/pin/verify — xác thực mã PIN, trả pin token ngắn hạn (mặc định 1 phút).
export async function xacThucPinService(
  pin: string,
  token?: string,
): Promise<XacThucPinApi> {
  return goiService<XacThucPinApi>(
    "/auth/pin/verify",
    {
      method: "POST",
      body: JSON.stringify({ pin }),
    },
    token,
  );
}

export async function taiAnhDaiDienService(
  file: Blob,
  token?: string,
): Promise<AnhDaiDienUploadApi> {
  const formData = new FormData();
  formData.append("avatar", file);
  return goiService<AnhDaiDienUploadApi>(
    "/auth/me/avatar",
    {
      method: "POST",
      body: formData,
    },
    token,
  );
}

export async function layAnhDaiDienService(token?: string): Promise<Blob> {
  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  let res: Response;
  try {
    res = await goiRaw("/auth/me/avatar", {}, firstToken);
  } catch {
    throw new LoiServiceLts("Không kết nối được tới máy chủ.");
  }

  if (res.status === 401) {
    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw("/auth/me/avatar", {}, tokens.accessToken);
      } catch {
        throw new LoiServiceLts("Không kết nối được tới máy chủ.");
      }
    } catch (error) {
      if (error instanceof LoiServiceLts && error.status === 401) {
        xuLyPhienKhongHopLe?.();
        throw new LoiServiceLts("Hết phiên đăng nhập.", 401);
      }
      throw error;
    }
  }

  if (!res.ok) {
    const body = await docJson(res);
    throw new LoiServiceLts(layLoiTuResponse(res.status, body), res.status);
  }

  return res.blob();
}

export interface ChuKyUploadApi {
  id: string;
  account: string;
  fullName: string | null;
  isActive: boolean;
  signatureUrl: string | null;
  createdAt: string;
}

// ── Chữ ký LSX ────────────────────────────────────────────────────────────
// Contract backend (đã implement trong service-lts):
//   POST /auth/signatures (multipart "signature") → ChuKyUploadApi
//   GET  /auth/me/signature → image blob
//   GET  /auth/signatures/:fileName → image blob theo token
export async function taiChuKyService(
  file: Blob,
  token?: string,
): Promise<ChuKyUploadApi> {
  const formData = new FormData();
  formData.append("signature", file);
  return goiService<ChuKyUploadApi>(
    "/auth/signatures",
    {
      method: "POST",
      body: formData,
    },
    token,
  );
}

export async function layChuKyService(token?: string): Promise<Blob> {
  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  let res: Response;
  try {
    res = await goiRaw("/auth/me/signature", {}, firstToken);
  } catch {
    throw new LoiServiceLts("Không kết nối được tới máy chủ.");
  }

  if (res.status === 401) {
    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw("/auth/me/signature", {}, tokens.accessToken);
      } catch {
        throw new LoiServiceLts("Không kết nối được tới máy chủ.");
      }
    } catch (error) {
      if (error instanceof LoiServiceLts && error.status === 401) {
        xuLyPhienKhongHopLe?.();
        throw new LoiServiceLts("Hết phiên đăng nhập.", 401);
      }
      throw error;
    }
  }

  if (!res.ok) {
    const body = await docJson(res);
    throw new LoiServiceLts(layLoiTuResponse(res.status, body), res.status);
  }

  return res.blob();
}

export async function layChuKyReviewerService(
  urlOrPath: string,
  token?: string,
): Promise<Blob> {
  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  const path = /^https?:\/\//i.test(urlOrPath)
    ? new URL(urlOrPath).pathname
    : urlOrPath;
  let res: Response;
  try {
    res = await goiRaw(path, {}, firstToken);
  } catch {
    throw new LoiServiceLts("Không kết nối được tới máy chủ.");
  }

  if (res.status === 401) {
    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw(path, {}, tokens.accessToken);
      } catch {
        throw new LoiServiceLts("Không kết nối được tới máy chủ.");
      }
    } catch (error) {
      if (error instanceof LoiServiceLts && error.status === 401) {
        xuLyPhienKhongHopLe?.();
        throw new LoiServiceLts("Hết phiên đăng nhập.", 401);
      }
      throw error;
    }
  }

  if (!res.ok) {
    const body = await docJson(res);
    throw new LoiServiceLts(layLoiTuResponse(res.status, body), res.status);
  }

  return res.blob();
}

// ── Accounts ─────────────────────────────────────────────────────────────
export async function layTaiKhoanService(
  token: string,
  name?: string,
): Promise<TaiKhoanApi[]> {
  const query = name?.trim() ? `?name=${encodeURIComponent(name.trim())}` : "";
  return goiService<TaiKhoanApi[]>(`/auth/accounts${query}`, {}, token);
}

export async function taoTaiKhoanService(
  token: string,
  input: { account: string; password: string; fullName: string },
): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(
    "/auth/accounts",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
}

export async function kichHoatTaiKhoanService(
  token: string,
  userId: string,
  isActive: boolean,
): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(
    `/auth/accounts/${userId}/activate`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
    token,
  );
}

// ── User policies ─────────────────────────────────────────────────────────
export async function capQuyenService(
  token: string,
  userId: string,
  policyCodes: PolicyCode[],
): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(
    `/policies/accounts/${userId}`,
    {
      method: "POST",
      body: JSON.stringify({ policyCodes }),
    },
    token,
  );
}

export async function thuHoiQuyenService(
  token: string,
  userId: string,
  policyCodes: PolicyCode[],
): Promise<TaiKhoanApi> {
  return goiService<TaiKhoanApi>(
    `/policies/accounts/${userId}`,
    {
      method: "DELETE",
      body: JSON.stringify({ policyCodes }),
    },
    token,
  );
}

// ── Policy catalog từ server (validate) ────────────────────────────────────
export interface PolicyServerApi {
  code: string;
  name: string;
  description: string;
}

// GET /policies — danh sách policy thật từ backend.
export async function layDanhSachPolicyService(
  token?: string,
): Promise<PolicyServerApi[]> {
  const data = await goiService<PolicyServerApi[]>("/policies", {}, token);
  return Array.isArray(data) ? data : [];
}

export interface KetQuaLechPolicy {
  // Code server có nhưng catalog frontend chưa khai báo.
  thieuTrongCatalog: string[];
  // Code catalog khai báo nhưng server không còn cung cấp.
  duTrongCatalog: string[];
}

// So sánh policy server với POLICY_CATALOG hardcode. Chỉ để cảnh báo lệch, không chặn UI.
export function kiemTraLechPolicy(
  serverPolicies: PolicyServerApi[],
): KetQuaLechPolicy {
  const serverCodes = new Set(serverPolicies.map((p) => p.code));
  const catalogCodes = new Set<string>(POLICY_CATALOG.map((p) => p.code));
  return {
    thieuTrongCatalog: [...serverCodes].filter(
      (code) => !catalogCodes.has(code),
    ),
    duTrongCatalog: [...catalogCodes].filter((code) => !serverCodes.has(code)),
  };
}

// Tải policy server và log cảnh báo nếu lệch với catalog hardcode. Trả về kết quả lệch (hoặc null nếu lỗi).
export async function canhBaoLechPolicyService(
  token?: string,
): Promise<KetQuaLechPolicy | null> {
  try {
    const serverPolicies = await layDanhSachPolicyService(token);
    const lech = kiemTraLechPolicy(serverPolicies);
    if (lech.thieuTrongCatalog.length > 0) {
      console.warn(
        "[policy] Server có policy chưa khai báo trong POLICY_CATALOG:",
        lech.thieuTrongCatalog,
      );
    }
    if (lech.duTrongCatalog.length > 0) {
      console.warn(
        "[policy] POLICY_CATALOG khai báo policy server không cung cấp:",
        lech.duTrongCatalog,
      );
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
  policies: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  }>;
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
  rolePolicies: Array<{
    policy: { id: string; code: string; name: string; description: string };
  }>;
}

function chuyenVaiTroUpsertApi(role: VaiTroUpsertApi): VaiTro {
  return {
    code: role.code,
    name: role.name,
    description: role.description ?? "",
    policies: role.rolePolicies
      .map((rp) => rp.policy.code)
      .filter((code): code is PolicyCode =>
        POLICY_CATALOG.some((p) => p.code === code),
      ),
    updatedAt: role.updatedAt,
  };
}

export function chuyenVaiTroApi(role: VaiTroApi): VaiTro {
  return {
    code: role.code,
    name: role.name,
    description: role.description,
    policies: role.policies
      .map((p) => p.code)
      .filter((code): code is PolicyCode =>
        POLICY_CATALOG.some((p) => p.code === code),
      ),
    granterName: normalizeDisplayText(
      role.granter?.fullName ?? role.granter?.account ?? "",
    ),
    updatedAt: role.updatedAt,
  };
}

export async function layVaiTroService(
  token: string,
  name?: string,
): Promise<VaiTro[]> {
  const query = name ? `?name=${encodeURIComponent(name)}` : "";
  const data = await goiService<VaiTroApi[]>(`/auth/roles${query}`, {}, token);
  return (Array.isArray(data) ? data : []).map(chuyenVaiTroApi);
}

export async function luuVaiTroService(
  token: string,
  input: {
    code: string;
    name: string;
    description: string;
    policyCodes: PolicyCode[];
  },
): Promise<VaiTro> {
  const data = await goiService<VaiTroUpsertApi>(
    "/auth/roles",
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
    token,
  );
  return chuyenVaiTroUpsertApi(data);
}

export async function xoaVaiTroService(
  token: string,
  code: string,
): Promise<void> {
  await goiService<unknown>(
    `/auth/roles/${encodeURIComponent(code)}`,
    { method: "DELETE" },
    token,
  );
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

export async function layKhachHangService(
  token?: string,
): Promise<KhachHangApi[]> {
  return goiService<KhachHangApi[]>("/customers", {}, token);
}

export async function taoMaKhachHangService(
  codeName: string,
  token?: string,
): Promise<KhachHangApi> {
  return goiService<KhachHangApi>(
    "/customers",
    {
      method: "POST",
      body: JSON.stringify({ codeName }),
    },
    token,
  );
}

export async function luuThongTinKhachHangService(
  codeName: string,
  input: CapNhatKhachHangInput,
  token?: string,
): Promise<KhachHangApi> {
  return goiService<KhachHangApi>(
    `/customers/${encodeURIComponent(codeName)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
    token,
  );
}

export async function layNguoiPhuTrachKhachHangService(
  codeName: string,
  token?: string,
): Promise<KhachHangManagerApi[]> {
  return goiService<KhachHangManagerApi[]>(
    `/customers/${encodeURIComponent(codeName)}/managers`,
    {},
    token,
  );
}

export async function luuNguoiPhuTrachKhachHangService(
  codeName: string,
  managers: LuuKhachHangManagerInput[],
  token?: string,
): Promise<{ codeName: string; managers: KhachHangManagerApi[] }> {
  const managerIds = managers.map((manager) => manager.managerId);
  return goiService<{ codeName: string; managers: KhachHangManagerApi[] }>(
    `/customers/${encodeURIComponent(codeName)}/managers`,
    {
      method: "PUT",
      body: JSON.stringify({ managerIds }),
    },
    token,
  );
}

// GET /customers/{codeName} — chi tiết 1 khách hàng (lazy-load thay vì tải toàn bộ list).
export async function layChiTietKhachHangService(
  codeName: string,
  token?: string,
): Promise<KhachHangApi> {
  return goiService<KhachHangApi>(
    `/customers/${encodeURIComponent(codeName)}`,
    {},
    token,
  );
}

// GET /customers/{codeName}/versions/latest — phiên bản mới nhất của khách hàng.
export async function layPhienBanMoiNhatKhachHangService(
  codeName: string,
  token?: string,
): Promise<KhachHangApiVersion> {
  return goiService<KhachHangApiVersion>(
    `/customers/${encodeURIComponent(codeName)}/versions/latest`,
    {},
    token,
  );
}

// GET /customers/{codeName}/versions/{versionId} — một phiên bản cụ thể.
export async function layPhienBanKhachHangService(
  codeName: string,
  versionId: string,
  token?: string,
): Promise<KhachHangApiVersion> {
  return goiService<KhachHangApiVersion>(
    `/customers/${encodeURIComponent(codeName)}/versions/${encodeURIComponent(versionId)}`,
    {},
    token,
  );
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
  pricingSheetName?: string;
  inputValue: unknown;
  saleResult?: unknown;
  useLatestPriceConfigs?: boolean;
}

// PATCH /pricing-sheet/{id}/advisor-result — cập nhật masterResult (cần quyền PRICING_SHEET_ADVISOR)
export interface CapNhatPricingSheetAdvisorInput {
  result?: unknown;
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
  hasCustomerApproved?: boolean | null;
  note?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  priceConfigIds?: string[];
  original?: {
    actorName?: string | null;
    customerName?: string | null;
    deletable?: boolean;
    canUpdate?: boolean;
    canAdminUpdate?: boolean;
  } | null;
}

export async function taoPricingSheetService(
  input: TaoPricingSheetInput,
  token?: string,
): Promise<PricingSheetApi> {
  return goiService<PricingSheetApi>(
    "/pricing-sheet",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
}

export async function layDanhSachPricingSheetService(
  token?: string,
): Promise<PricingSheetApi[]> {
  const data = await goiService<PricingSheetApi[]>("/pricing-sheet", {}, token);
  return Array.isArray(data) ? data : [];
}

// GET /pricing-sheet/{id} — 1 sheet (deep-link / mở chi tiết, tránh list all).
export async function layPricingSheetTheoIdService(
  id: string,
  token?: string,
): Promise<PricingSheetApi> {
  return goiService<PricingSheetApi>(
    `/pricing-sheet/${encodeURIComponent(id)}`,
    {},
    token,
  );
}

// PATCH /pricing-sheet/{id}/result — cập nhật inputValue và saleResult (Sale/Admin)
export async function capNhatPricingSheetResultService(
  id: string,
  input: CapNhatPricingSheetResultInput,
  token?: string,
): Promise<PricingSheetApi> {
  return goiService<PricingSheetApi>(
    `/pricing-sheet/${encodeURIComponent(id)}/result`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
    token,
  );
}

// PATCH /pricing-sheet/{id}/advisor-result — cập nhật masterResult (cần quyền PRICING_SHEET_ADVISOR)
export async function capNhatPricingSheetAdvisorResultService(
  id: string,
  input: CapNhatPricingSheetAdvisorInput,
  token?: string,
): Promise<PricingSheetApi> {
  return goiService<PricingSheetApi>(
    `/pricing-sheet/${encodeURIComponent(id)}/advisor-result`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
    token,
  );
}

export async function xoaPricingSheetService(
  id: string,
  token?: string,
): Promise<{ success: true } | { success: false }> {
  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  let res: Response;
  try {
    res = await goiRaw(
      `/pricing-sheet/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      firstToken,
    );
  } catch {
    throw new LoiServiceLts("Không kết nối được tới máy chủ.");
  }

  if (res.status === 401) {
    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw(
          `/pricing-sheet/${encodeURIComponent(id)}`,
          { method: "DELETE" },
          tokens.accessToken,
        );
      } catch {
        throw new LoiServiceLts("Không kết nối được tới máy chủ.");
      }
    } catch (error) {
      if (error instanceof LoiServiceLts && error.status === 401) {
        xuLyPhienKhongHopLe?.();
        throw new LoiServiceLts("Hết phiên đăng nhập.", 401);
      }
      throw error;
    }
  }

  if (res.ok) return { success: true };
  return { success: false };
}

// -- Price Config ---------------------------------------------------------------
export interface PriceConfigApi {
  id: string;
  configName: string;
  version: number;
  inputValue: unknown;
  createdBy: string | null;
  createdAt: string;
  /** Policies của user đang gọi API trên config này (do BE filter theo actor). */
  policies?: string[];
}

// ── Price Config Policies ────────────────────────────────────────────────────
export interface PriceConfigPoliciesApi {
  userId: string;
  configPolicies: Array<{
    configName: string;
    policies: string[];
  }>;
}

export async function replaceUserPriceConfigPoliciesService(
  token: string,
  userId: string,
  configPolicies: Array<{ configName: string; policies: string[] }>,
): Promise<PriceConfigPoliciesApi> {
  return goiService<PriceConfigPoliciesApi>(
    `/price-config/${encodeURIComponent(userId)}/configPolicies`,
    {
      method: "POST",
      body: JSON.stringify({ configPolicies }),
    },
    token,
  );
}

export async function layUserPriceConfigPoliciesService(
  token: string,
  userId: string,
): Promise<PriceConfigPoliciesApi> {
  return goiService<PriceConfigPoliciesApi>(
    `/price-config/${encodeURIComponent(userId)}/configPolicies`,
    {},
    token,
  );
}

export async function upsertPriceConfigService(
  input: { configName: string; inputValue: unknown },
  token?: string,
): Promise<PriceConfigApi> {
  return goiService<PriceConfigApi>(
    "/price-config",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
}

export async function layPriceConfigMoiNhatService(
  token?: string,
): Promise<PriceConfigApi[]> {
  const data = await goiService<PriceConfigApi[]>(
    "/price-config/latest-version",
    {},
    token,
  );
  return Array.isArray(data) ? data : [];
}

// GET /price-config/production-upgrade/:version — endpoint chuyên cho CPSX nâng cao
// (BE commit 3cc0a4e, route auth-only). version = 'latest' hoặc số dương.
export async function layProductionUpgradePriceConfigService(
  token: string,
  version: 'latest' | number = 'latest',
): Promise<PriceConfigApi> {
  return goiService<PriceConfigApi>(
    `/price-config/production-upgrade/${version}`,
    {},
    token,
  );
}

// PUT /price-config/production-upgrade — tạo version mới CPSX nâng cao.
export async function upsertProductionUpgradePriceConfigService(
  token: string,
  body: { inputValue: unknown },
): Promise<PriceConfigApi> {
  return goiService<PriceConfigApi>(
    '/price-config/production-upgrade',
    { method: 'PUT', body: JSON.stringify(body) },
    token,
  );
}

// POST /price-config/by-ids — batch load theo id (1 request, tránh N× GET / 429).
export async function layPriceConfigTheoIdsService(
  ids: string[],
  token?: string,
): Promise<PriceConfigApi[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];
  const data = await goiService<PriceConfigApi[]>(
    "/price-config/by-ids",
    {
      method: "POST",
      body: JSON.stringify({ ids: unique }),
    },
    token,
  );
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
): Promise<
  { success: true } | { success: false; pricingSheetNames: string[] }
> {
  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  let res: Response;
  try {
    res = await goiRaw(
      `/price-config/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      firstToken,
    );
  } catch {
    throw new LoiServiceLts("Không kết nối được tới máy chủ.");
  }

  if (res.status === 401) {
    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw(
          `/price-config/${encodeURIComponent(id)}`,
          { method: "DELETE" },
          tokens.accessToken,
        );
      } catch {
        throw new LoiServiceLts("Không kết nối được tới máy chủ.");
      }
    } catch (error) {
      if (error instanceof LoiServiceLts && error.status === 401) {
        xuLyPhienKhongHopLe?.();
        throw new LoiServiceLts("Hết phiên đăng nhập.", 401);
      }
      throw error;
    }
  }

  if (res.ok) return { success: true };

  const body = await docJson(res);
  const pricingSheetNames: string[] = Array.isArray(
    (body as { pricingSheetNames?: unknown })?.pricingSheetNames,
  )
    ? (body as { pricingSheetNames: unknown[] }).pricingSheetNames.map(String)
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
  reviewerSignatureUrl?: string | null;
  pricingSheets?: PricingSheetApi[];
  original?: { actorName?: string | null; deletable?: boolean; canUpdate?: boolean } | null;
  createdAt: string;
  updatedAt: string;
}

export async function taoBaoGiaService(
  input: TaoBaoGiaInput,
  token?: string,
): Promise<BaoGiaApi> {
  return goiService<BaoGiaApi>(
    "/quotations",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
}

// ── Mapping giữa local QuoteStatus (8 gia tri) và server TrangThaiBaoGiaServer (4) ──
//
// Local QuoteStatus (lib/types.ts) co 8 gia tri de phan biet lifecycle UI
// (sent/cancelled/completed/expired). Server chi co 4 gia tri (drafted/submitted/
// approved/rejected). Khi goi server, can mapping ve 4 gia tri.
//
// Local state có the giu 8 gia tri de hien thi lich su lifecycle; API sync thi
// mapping 8 -> 4.

import type { QuoteStatus as QuoteStatusLocal } from '../types';

const MAP_LOCAL_TO_SERVER: Partial<Record<QuoteStatusLocal, TrangThaiBaoGiaServer>> = {
  drafted: 'drafted',
  pending_approval: 'submitted',
  approved: 'approved',
  sent: 'approved',       // local "da gui khach" = server "approved" (admin da duyet)
  rejected: 'rejected',
  // cancelled / completed / expired: khong co tuong duong server
  // (xem ghi chu ben duoi).
};

const MAP_SERVER_TO_LOCAL: Record<TrangThaiBaoGiaServer, QuoteStatusLocal> = {
  drafted: 'drafted',
  submitted: 'pending_approval',
  approved: 'approved',
  rejected: 'rejected',
  unknown: 'drafted',      // fallback an toan
};

/** Mapping local QuoteStatus (UI) sang server updateStatus (API). */
export function quoteStatusToServer(s: QuoteStatusLocal): TrangThaiBaoGiaServer | null {
  // cancelled / completed / expired khong the dong bo len server.
  // Nguoi goi nen xu ly rieng (vi du: "huy bao gia" can goi endpoint rieng, khong phai doi status).
  return MAP_LOCAL_TO_SERVER[s] ?? null;
}

/** Mapping server updateStatus (API) sang local QuoteStatus (UI). */
export function serverToQuoteStatus(s: TrangThaiBaoGiaServer | string | null | undefined): QuoteStatusLocal {
  const v = chuyenTrangThaiBaoGia(typeof s === 'string' ? s : null);
  return MAP_SERVER_TO_LOCAL[v];
}

/** Tra ve true neu trang thai local co the dong bo len server. */
export function coTheDongBoStatus(s: QuoteStatusLocal): boolean {
  return MAP_LOCAL_TO_SERVER[s] != null;
}

// Trạng thái báo giá theo server thật (xem backend quotation_status.ts).
// Enum server chỉ có 4 giá trị: draft | submitted | approved | rejected.
// - 'drafted'  : báo giá nháp, chưa nộp duyệt
// - 'submitted': đã nộp, đang chờ người duyệt xử lý
// - 'approved' : đã duyệt nội bộ (sau đó khách phản hồi từng sheet qua /customer-decide)
// - 'rejected' : bị từ chối nội bộ
// - 'unknown'  : giá trị server lạ, chưa ánh xạ được
// (Trước đây có 'customer_approved'/'customer_rejected' nhưng server không trả:
//  phản hồi của khách nằm ở pricing_sheets.hasCustomerApproved, không phải status quotation.)
export type TrangThaiBaoGiaServer =
  | "drafted"
  | "submitted"
  | "approved"
  | "rejected"
  | "unknown";

// Backend phơi updateStatus dạng string; hàm này quy đổi về tập trạng thái UI dùng.
// Server chỉ trả 4 giá trị; mọi giá trị khác (kể cả 'customer approved' cũ) đều về 'unknown'.
export function chuyenTrangThaiBaoGia(
  updateStatus?: string | null,
): TrangThaiBaoGiaServer {
  const value = (updateStatus ?? "").trim().toLowerCase();
  if (!value || value === "draft" || value === "drafted") return "drafted";
  if (value === "submitted") return "submitted";
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "unknown";
}

export const NHAN_TRANG_THAI_BAO_GIA: Record<TrangThaiBaoGiaServer, string> = {
  drafted: "Khởi tạo",
  submitted: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  unknown: "Không xác định",
};

// GET /quotations — danh sách báo giá thuộc các khách hàng đang quản lý.
export async function layDanhSachBaoGiaService(
  token?: string,
): Promise<BaoGiaApi[]> {
  const data = await goiService<BaoGiaApi[]>("/quotations", {}, token);
  return Array.isArray(data) ? data : [];
}

// GET /quotations/{id} — chi tiết báo giá (cùng quyền xem như list).
export async function layBaoGiaTheoIdService(
  id: string,
  token?: string,
): Promise<BaoGiaApi> {
  return goiService<BaoGiaApi>(
    `/quotations/${encodeURIComponent(id)}`,
    {},
    token,
  );
}

// PATCH /quotations/{id}/status_update — nộp một báo giá nháp để chờ duyệt.
export async function nopBaoGiaService(
  quotationId: string,
  token?: string,
): Promise<BaoGiaApi> {
  return goiService<BaoGiaApi>(
    `/quotations/${encodeURIComponent(quotationId)}/status_update`,
    {
      method: "PATCH",
      body: JSON.stringify({}),
    },
    token,
  );
}

// GET /quotations/non-draft — báo giá đã nộp đang chờ duyệt (cần QUOTATION_REVIEWER).
export async function layBaoGiaChoDuyetService(
  token?: string,
): Promise<BaoGiaApi[]> {
  const data = await goiService<BaoGiaApi[]>(
    "/quotations/non-draft",
    {},
    token,
  );
  return Array.isArray(data) ? data : [];
}

// PATCH /quotations/{id}/review_update_status — duyệt hoặc từ chối báo giá đã nộp.
// Route yêu cầu PIN (PinGuard): truyền pinToken qua header x-pin-token.
export async function duyetBaoGiaService(
  quotationId: string,
  updateStatus: "approved" | "rejected",
  token?: string,
  pinToken?: string,
): Promise<BaoGiaApi> {
  const headers = pinToken ? { "x-pin-token": pinToken } : undefined;
  return goiService<BaoGiaApi>(
    `/quotations/${encodeURIComponent(quotationId)}/review_update_status`,
    {
      method: "PATCH",
      body: JSON.stringify({ updateStatus }),
      headers,
    },
    token,
  );
}

// Dữ liệu đầu vào cập nhật báo giá (gửi lại duyệt).
export interface CapNhatBaoGiaInput {
  moTa?: string;
  duLieuDauVao?: unknown;
  dsPricingSheetId?: string[];
}

// PATCH /quotations/{id}/customer-decide — khách (creator) đánh dấu duyệt/bỏ từng pricing sheet.
export interface CustomerDecideItem {
  pricingSheetId: string;
  hasCustomerApproved: boolean;
}

// PATCH /quotations/{id}/customer-decide
// Chỉ creator được gọi, chỉ khi quotation đang ở trạng thái 'approved'.
// Phản hồi của khách nằm ở pricing_sheets.hasCustomerApproved, KHÔNG đổi updateStatus quotation.
//
// Body PHẢI là mảng trực tiếp, KHÔNG wrap thành object (xem quotations.controller.ts
// @Body() customerDecisions: CustomerDecidePricingSheetDto[]). Nếu wrap, server
// sẽ ép về array rỗng → 400 "At least one pricing sheet decision is required".
export async function customerDecideBaoGiaService(
  idBaoGia: string,
  decisions: CustomerDecideItem[],
  token?: string,
): Promise<BaoGiaApi> {
  return goiService<BaoGiaApi>(
    `/quotations/${encodeURIComponent(idBaoGia)}/customer-decide`,
    {
      method: "PATCH",
      body: JSON.stringify(decisions),
    },
    token,
  );
}

// Helper: lấy các pricing sheet đã được khách duyệt (hasCustomerApproved = true)
// từ danh sách quotations approved. Dùng cho tab "Tạo LSX".
export function locSheetKhaDungChoLSX(
  quotations: BaoGiaApi[],
): Array<{ quotation: BaoGiaApi; sheet: NonNullable<BaoGiaApi["pricingSheets"]>[number] }> {
  const ketQua: Array<{
    quotation: BaoGiaApi;
    sheet: NonNullable<BaoGiaApi["pricingSheets"]>[number];
  }> = [];
  for (const quotation of quotations) {
    if (chuyenTrangThaiBaoGia(quotation.updateStatus) !== "approved") continue;
    for (const sheet of quotation.pricingSheets ?? []) {
      if (sheet.hasCustomerApproved === true) {
        ketQua.push({ quotation, sheet });
      }
    }
  }
  return ketQua;
}

// PATCH /quotations/{id}/update — cập nhật báo giá nháp / bị từ chối và gửi lại duyệt.
export async function capNhatBaoGiaService(
  idBaoGia: string,
  duLieu: CapNhatBaoGiaInput,
  token?: string,
): Promise<BaoGiaApi> {
  const thanDuLieu: Record<string, unknown> = {};
  if (duLieu.moTa !== undefined) thanDuLieu.description = duLieu.moTa;
  if (duLieu.duLieuDauVao !== undefined)
    thanDuLieu.inputValue = duLieu.duLieuDauVao;
  if (duLieu.dsPricingSheetId !== undefined)
    thanDuLieu.pricingSheetIds = duLieu.dsPricingSheetId;
  return goiService<BaoGiaApi>(
    `/quotations/${encodeURIComponent(idBaoGia)}/update`,
    {
      method: "PATCH",
      body: JSON.stringify(thanDuLieu),
    },
    token,
  );
}

export async function xoaBaoGiaService(
  id: string,
  token?: string,
): Promise<{ success: true } | { success: false }> {
  const firstToken = token ?? layTokenHienTai?.()?.accessToken;
  let res: Response;
  try {
    res = await goiRaw(
      `/quotations/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      firstToken,
    );
  } catch {
    throw new LoiServiceLts("Không kết nối được tới máy chủ.");
  }

  if (res.status === 401) {
    try {
      const tokens = await lamMoiTokenTuHeThong();
      try {
        res = await goiRaw(
          `/quotations/${encodeURIComponent(id)}`,
          { method: "DELETE" },
          tokens.accessToken,
        );
      } catch {
        throw new LoiServiceLts("Không kết nối được tới máy chủ.");
      }
    } catch (error) {
      if (error instanceof LoiServiceLts && error.status === 401) {
        xuLyPhienKhongHopLe?.();
        throw new LoiServiceLts("Hết phiên đăng nhập.", 401);
      }
      throw error;
    }
  }

  if (res.ok) return { success: true };
  return { success: false };
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
export async function layNhatKyHeThongService(
  token?: string,
): Promise<ActivityLogServerApi[]> {
  const data = await goiService<ActivityLogServerApi[]>(
    "/activity-logs",
    {},
    token,
  );
  return Array.isArray(data) ? data : [];
}

export interface SystemMetricSnapshotApi {
  timestamp: string;
  host: {
    cpuUsagePercent: number | null;
    memoryTotalBytes: number | null;
    memoryAvailableBytes: number | null;
    memoryUsedBytes: number | null;
    memoryUsedPercent: number | null;
    filesystemSizeBytes: number | null;
    filesystemAvailableBytes: number | null;
    filesystemUsedBytes: number | null;
    filesystemUsedPercent: number | null;
    loadAverage1m: number | null;
  };
  containers: {
    running: number | null;
    cpuUsagePercent: number | null;
    memoryWorkingSetBytes: number | null;
    memoryWorkingSetPercentOfHost: number | null;
  };
  exporters: {
    cadvisor: { url: string; up: boolean };
    nodeExporter: { url: string; up: boolean };
  };
}

export async function layMetricHeThongService(
  token?: string,
): Promise<SystemMetricSnapshotApi> {
  return goiService<SystemMetricSnapshotApi>(
    "/system/metric/collect",
    {},
    token,
  );
}

// ── Quotation Pricing Sheet Orders (LSX) ──────────────────────────────
// Server endpoint: /quotations/orders và /quotations/orders/{id} và /quotations/{id}/create-orders
// Bảng: quotation_pricing_sheet_order. Mỗi order = 1 LSX tạo từ 1 pricing sheet đã KH-duyệt.

/** Một order (LSX) trong response server. */
export interface QuotationPricingSheetOrderApi {
  id: string;
  quotationId: string;
  pricingSheetId: string;
  hasPrintedOrder: boolean;
  hasAdvisorApproved: boolean;
  /** Lý do từ chối/duyệt do advisor ghi (server trả qua order.reason). */
  reason?: string | null;
  inputValue: unknown | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  pricingSheet?: PricingSheetApi | null;
  /** Phần "original" server gắn thêm — chữ ký người duyệt LSX (approver). */
  original?: { approverSignatureUrl?: string | null } | null;
}

/** Một quotation gom các orders của nó. Dùng cho list view. */
export interface QuotationPricingSheetOrdersByQuotationApi {
  id: string;
  customerId: string;
  description?: string | null;
  inputValue?: unknown | null;
  updateStatus: string;
  createdBy: string;
  reviewerId?: string | null;
  reviewerSignatureUrl?: string | null;
  creator?: { id: string; account?: string; fullName?: string } | null;
  createdAt: string;
  updatedAt: string;
  orders: QuotationPricingSheetOrderApi[];
  original?: { actorName?: string | null; deletable?: boolean; canUpdate?: boolean } | null;
}

/** Response của POST /quotations/{id}/create-orders. */
export interface CreateQuotationPricingSheetOrdersResponseApi {
  quotationId: string;
  createdCount: number;
  orders: QuotationPricingSheetOrderApi[];
}

// GET /quotations/orders — danh sách orders gom theo quotation.
// User thường: chỉ customers họ manage. ORDER_REVIEWER: tất cả.
export async function listQuotationPricingSheetOrdersService(
  token?: string,
): Promise<QuotationPricingSheetOrdersByQuotationApi[]> {
  const data = await goiService<QuotationPricingSheetOrdersByQuotationApi[]>(
    "/quotations/orders",
    {},
    token,
  );
  return Array.isArray(data) ? data : [];
}

// GET /quotations/orders/{id} — 1 order (deep-link /lsx/<id>).
export async function getQuotationPricingSheetOrderService(
  orderId: string,
  token?: string,
): Promise<QuotationPricingSheetOrderApi> {
  return goiService<QuotationPricingSheetOrderApi>(
    `/quotations/orders/${encodeURIComponent(orderId)}`,
    {},
    token,
  );
}

/** Shell quotation tối thiểu từ 1 order (hydrate wizard sửa khi deep-link). */
export function shellQuotationFromOrder(
  order: QuotationPricingSheetOrderApi,
): QuotationPricingSheetOrdersByQuotationApi {
  const sheet = order.pricingSheet;
  const customerCode =
    sheet?.customerCodeName || sheet?.customer?.codeName || '';
  return {
    id: order.quotationId,
    customerId: customerCode,
    description: null,
    inputValue: null,
    updateStatus: 'APPROVED',
    createdBy: order.createdBy,
    createdAt: order.createdAt,
    updatedAt: order.createdAt,
    orders: [order],
  };
}

// POST /quotations/{id}/create-orders — tạo orders từ các pricing sheet đã KH-duyệt.
// Server tự bỏ qua sheet đã có order; response trả TẤT CẢ orders (cả cũ + mới) sort createdAt desc.
export async function createQuotationPricingSheetOrdersService(
  quotationId: string,
  token?: string,
): Promise<CreateQuotationPricingSheetOrdersResponseApi> {
  return goiService<CreateQuotationPricingSheetOrdersResponseApi>(
    `/quotations/${encodeURIComponent(quotationId)}/create-orders`,
    {
      method: "POST",
    },
    token,
  );
}

// PATCH /quotations/orders/{id} — cập nhật inputValue (form LSX).
// inputValue: unknown — server lưu dưới dạng Prisma.Json. null = clear.
export interface UpdateQuotationPricingSheetOrderInput {
  inputValue: unknown;
}

export async function updateQuotationPricingSheetOrderService(
  orderId: string,
  data: UpdateQuotationPricingSheetOrderInput,
  token?: string,
): Promise<QuotationPricingSheetOrderApi> {
  return goiService<QuotationPricingSheetOrderApi>(
    `/quotations/orders/${encodeURIComponent(orderId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    token,
  );
}

// PATCH /quotations/orders/{id}/approval — advisor duyệt / từ chối order.
// Yêu cầu policy ORDER_REVIEWER + PIN (PinGuard): truyền pinToken qua header x-pin-token.
// Set hasAdvisorApproved = true | false + approvedBy = actor.
// reason: lý do từ chối (hoặc duyệt) — chỉ gửi khi có giá trị.
export async function updateOrderApprovalService(
  orderId: string,
  hasAdvisorApproved: boolean,
  token?: string,
  pinToken?: string,
  reason?: string | null,
): Promise<QuotationPricingSheetOrderApi> {
  const headers = pinToken ? { "x-pin-token": pinToken } : undefined;
  const body: Record<string, unknown> = { hasAdvisorApproved };
  if (reason) {
    body.reason = reason;
  }
  return goiService<QuotationPricingSheetOrderApi>(
    `/quotations/orders/${encodeURIComponent(orderId)}/approval`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      headers,
    },
    token,
  );
}

// ── Transform ────────────────────────────────────────────────────────────
export function chuyenTaiKhoanApi(user: TaiKhoanApi): TaiKhoan {
  return {
    id: user.id,
    account: user.account,
    fullName: normalizeDisplayText(user.fullName || user.account),
    isActive: user.isActive,
    isSystem: Boolean(user.isSystem ?? user.is_system),
    avatarUrl: user.avatarUrl ?? null,
    signatureUrl: user.signatureUrl ?? null,
    policies: (Array.isArray(user.policies) ? user.policies : [])
      .map((p) => p.code)
      .filter((code): code is PolicyCode =>
        POLICY_CATALOG.some((policy) => policy.code === code),
      ),
    priceConfigPolicies: Array.isArray(user.priceConfigPolicies)
      ? user.priceConfigPolicies
      : undefined,
    createdAt: user.createdAt,
    lastLogin: user.updatedAt,
  };
}