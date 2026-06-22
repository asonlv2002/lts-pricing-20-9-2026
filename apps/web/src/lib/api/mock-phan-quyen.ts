// ═════════════════════════════════════════════════════════════════════════════
// Mock Service: Phân quyền offline
// Mô phỏng toàn bộ CRUD tài khoản + vai trò khi NEXT_PUBLIC_OFFLINE_MODE=true
// Dữ liệu lưu localStorage, seed lần đầu nếu chưa có.
// ═════════════════════════════════════════════════════════════════════════════

import { type TaiKhoanApi, type VaiTroApi, type PolicyCode, type ActivityLogServerApi, POLICY_CATALOG } from './service-lts';
import { decodeBase64UrlUtf8 } from '../text-codec';

// ── localStorage keys ───────────────────────────────────────────────────────
const LS_MOCK_ACCOUNTS = 'lts_mock_accounts';
const LS_MOCK_ROLES = 'lts_mock_roles';
const LS_MOCK_ACTIVITY_LOGS = 'lts_mock_activity_logs';

// ── Seed data ───────────────────────────────────────────────────────────────
const SEED_ACCOUNTS: TaiKhoanApi[] = [
  {
    id: 'mock-1', account: 'admin', fullName: 'Quản trị hệ thống',
    isActive: true, isProtected: true, isSystem: false,
    createdAt: '2025-08-12T00:00:00Z', updatedAt: '2026-05-25T08:42:00Z',
    policies: POLICY_CATALOG.map(p => ({ code: p.code, name: p.ten })),
  },
  {
    id: 'mock-2', account: 'thu.lts', fullName: 'Lê Thị Thu',
    isActive: true, isProtected: false, isSystem: false,
    createdAt: '2025-09-03T00:00:00Z', updatedAt: '2026-05-24T17:21:00Z',
    policies: (['ACCOUNT_READ', 'ACCOUNT_CREATE', 'ROLE_READ', 'USER_POLICY_GRANT'] as PolicyCode[]).map(c => ({ code: c, name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c })),
  },
  {
    id: 'mock-3', account: 'nguyen.an', fullName: 'Nguyễn Văn An',
    isActive: true, isProtected: false, isSystem: false,
    createdAt: '2025-10-19T00:00:00Z', updatedAt: '2026-05-25T09:05:00Z',
    policies: (['ACCOUNT_READ', 'ROLE_READ'] as PolicyCode[]).map(c => ({ code: c, name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c })),
  },
  {
    id: 'mock-4', account: 'phuong.kt', fullName: 'Trần Thanh Phương',
    isActive: false, isProtected: false, isSystem: false,
    createdAt: '2025-11-08T00:00:00Z',
    policies: (['ACCOUNT_READ'] as PolicyCode[]).map(c => ({ code: c, name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c })),
  },
  {
    id: 'mock-5', account: 'quan.bd', fullName: 'Lý Hoài Quân',
    isActive: true, isProtected: false, isSystem: false,
    createdAt: '2026-01-22T00:00:00Z', updatedAt: '2026-05-23T14:11:00Z',
    policies: (['ACCOUNT_READ', 'ROLE_READ', 'ROLE_CREATE', 'ROLE_UPDATE'] as PolicyCode[]).map(c => ({ code: c, name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c })),
  },
  {
    id: 'mock-6', account: 'mai.nv', fullName: 'Phạm Hương Mai',
    isActive: true, isProtected: false, isSystem: false,
    createdAt: '2026-02-17T00:00:00Z', updatedAt: '2026-05-22T11:00:00Z',
    policies: (['ACCOUNT_READ'] as PolicyCode[]).map(c => ({ code: c, name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c })),
  },
];

const SEED_ROLES: VaiTroApi[] = [
  {
    id: 'role-1', code: 'SUPER_ADMIN', name: 'Quản trị tối cao',
    description: 'Toàn quyền hệ thống — chỉ dành cho 1–2 tài khoản gốc.',
    granterId: 'mock-1', granter: { id: 'mock-1', account: 'admin', fullName: 'Quản trị hệ thống' },
    policies: POLICY_CATALOG.map(p => ({ id: `pol-${p.code}`, code: p.code, name: p.ten, description: p.moTa, createdAt: '2025-08-12T00:00:00Z', updatedAt: '2025-08-12T00:00:00Z' })),
    createdAt: '2025-08-12T00:00:00Z', updatedAt: '2025-08-12T00:00:00Z',
  },
  {
    id: 'role-2', code: 'HR_MANAGER', name: 'Quản lý nhân sự',
    description: 'Tạo & quản lý tài khoản nhân viên, không động đến cấu hình quyền.',
    granterId: 'mock-3', granter: { id: 'mock-3', account: 'nguyen.an', fullName: 'Nguyễn Văn An' },
    policies: (['ACCOUNT_READ', 'ACCOUNT_CREATE', 'ACCOUNT_ACTIVATE', 'ACCOUNT_DEACTIVATE'] as PolicyCode[]).map(c => ({
      id: `pol-${c}`, code: c, name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c,
      description: POLICY_CATALOG.find(p => p.code === c)?.moTa ?? '', createdAt: '2026-03-04T00:00:00Z', updatedAt: '2026-03-04T00:00:00Z',
    })),
    createdAt: '2026-03-04T00:00:00Z', updatedAt: '2026-03-04T00:00:00Z',
  },
  {
    id: 'role-3', code: 'ROLE_DESIGNER', name: 'Thiết kế vai trò',
    description: 'Tạo & sửa mẫu vai trò, không gán cho user.',
    granterId: 'mock-2', granter: { id: 'mock-2', account: 'thu.lts', fullName: 'Lê Thị Thu' },
    policies: (['ROLE_READ', 'ROLE_CREATE', 'ROLE_UPDATE'] as PolicyCode[]).map(c => ({
      id: `pol-${c}`, code: c, name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c,
      description: POLICY_CATALOG.find(p => p.code === c)?.moTa ?? '', createdAt: '2026-04-18T00:00:00Z', updatedAt: '2026-04-18T00:00:00Z',
    })),
    createdAt: '2026-04-18T00:00:00Z', updatedAt: '2026-04-18T00:00:00Z',
  },
  {
    id: 'role-4', code: 'AUDITOR', name: 'Kiểm toán nội bộ',
    description: 'Chỉ đọc — phục vụ kiểm tra phân quyền & tài khoản.',
    granterId: 'mock-2', granter: { id: 'mock-2', account: 'thu.lts', fullName: 'Lê Thị Thu' },
    policies: (['ACCOUNT_READ', 'ROLE_READ'] as PolicyCode[]).map(c => ({
      id: `pol-${c}`, code: c, name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c,
      description: POLICY_CATALOG.find(p => p.code === c)?.moTa ?? '', createdAt: '2026-05-09T00:00:00Z', updatedAt: '2026-05-09T00:00:00Z',
    })),
    createdAt: '2026-05-09T00:00:00Z', updatedAt: '2026-05-09T00:00:00Z',
  },
];

// ── localStorage helpers ────────────────────────────────────────────────────
function layAccounts(): TaiKhoanApi[] {
  if (typeof window === 'undefined') return SEED_ACCOUNTS;
  const raw = localStorage.getItem(LS_MOCK_ACCOUNTS);
  if (!raw) {
    localStorage.setItem(LS_MOCK_ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
    return SEED_ACCOUNTS;
  }
  try { return JSON.parse(raw) as TaiKhoanApi[]; } catch { return SEED_ACCOUNTS; }
}

function luuAccounts(data: TaiKhoanApi[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_MOCK_ACCOUNTS, JSON.stringify(data));
}

function layRoles(): VaiTroApi[] {
  if (typeof window === 'undefined') return SEED_ROLES;
  const raw = localStorage.getItem(LS_MOCK_ROLES);
  if (!raw) {
    localStorage.setItem(LS_MOCK_ROLES, JSON.stringify(SEED_ROLES));
    return SEED_ROLES;
  }
  try { return JSON.parse(raw) as VaiTroApi[]; } catch { return SEED_ROLES; }
}

// ── Activity Logs seed ─────────────────────────────────────────────────────
const SEED_ACTIVITY_LOGS: ActivityLogServerApi[] = [
  {
    id: 'log-1', actorId: 'mock-2', action: 'customer.created',
    resourceType: 'customer', resourceId: 'cust-ACME',
    metadata: {
      previousVersion: {},
      currentVersion: { codeName: 'ACME_01' },
    },
    createdAt: '2026-06-19T08:30:00Z',
  },
  {
    id: 'log-2', actorId: 'mock-2', action: 'customer.version_created',
    resourceType: 'customer', resourceId: 'cust-ACME',
    metadata: {
      previousVersion: { organizationName: 'ACME Cũ' },
      currentVersion: { organizationName: 'ACME Mới', phoneNumber: '0901234567' },
    },
    createdAt: '2026-06-19T10:15:00Z',
  },
  {
    id: 'log-3', actorId: 'mock-3', action: 'pricing_sheet.created',
    resourceType: 'pricing_sheet', resourceId: 'ps-001',
    metadata: {
      previousVersion: {},
      currentVersion: {
        pricingSheetName: 'ACME_01 pricing sheet',
        customerId: 'cust-ACME',
      },
    },
    createdAt: '2026-06-19T11:00:00Z',
  },
  {
    id: 'log-4', actorId: 'mock-3', action: 'pricing_sheet.advisor_result_updated',
    resourceType: 'pricing_sheet', resourceId: 'ps-001',
    metadata: {
      previousVersion: { masterResult: { total: 120 } },
      currentVersion: { masterResult: { total: 125 } },
    },
    createdAt: '2026-06-19T14:20:00Z',
  },
  {
    id: 'log-5', actorId: 'mock-3', action: 'quotation.created',
    resourceType: 'quotation', resourceId: 'quo-001',
    metadata: {
      previousVersion: {},
      currentVersion: {
        customerId: 'cust-ACME',
        description: 'Báo giá đợt 1',
        updateStatus: 'draft',
      },
    },
    createdAt: '2026-06-19T15:00:00Z',
  },
  {
    id: 'log-6', actorId: 'mock-3', action: 'quotation.submitted',
    resourceType: 'quotation', resourceId: 'quo-001',
    metadata: {
      previousVersion: { updateStatus: 'draft' },
      currentVersion: { updateStatus: 'submitted' },
    },
    createdAt: '2026-06-19T15:30:00Z',
  },
  {
    id: 'log-7', actorId: 'mock-1', action: 'quotation.review_status_updated',
    resourceType: 'quotation', resourceId: 'quo-001',
    metadata: {
      previousVersion: { updateStatus: 'submitted' },
      currentVersion: { updateStatus: 'approved' },
    },
    createdAt: '2026-06-19T16:00:00Z',
  },
  {
    id: 'log-8', actorId: 'mock-1', action: 'account.created',
    resourceType: 'account', resourceId: 'mock-3',
    metadata: {
      previousVersion: {},
      currentVersion: { account: 'nguyen.an', isActive: true },
    },
    createdAt: '2026-06-18T09:00:00Z',
  },
];

function layActivityLogs(): ActivityLogServerApi[] {
  if (typeof window === 'undefined') return SEED_ACTIVITY_LOGS;
  const raw = localStorage.getItem(LS_MOCK_ACTIVITY_LOGS);
  if (!raw) {
    localStorage.setItem(LS_MOCK_ACTIVITY_LOGS, JSON.stringify(SEED_ACTIVITY_LOGS));
    return SEED_ACTIVITY_LOGS;
  }
  try { return JSON.parse(raw) as ActivityLogServerApi[]; } catch { return SEED_ACTIVITY_LOGS; }
}

function luuRoles(data: VaiTroApi[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_MOCK_ROLES, JSON.stringify(data));
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function taoId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function layBody(options: RequestInit): Record<string, unknown> {
  if (!options.body) return {};
  try { return JSON.parse(options.body as string) as Record<string, unknown>; } catch { return {}; }
}

async function delay(): Promise<void> {
  await new Promise(r => setTimeout(r, 50));
}

// ── JWT helpers ─────────────────────────────────────────────────────────────
function decodeJwtPayload(token: string): { sub: string; account: string } | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(decodeBase64UrlUtf8(payload));
  } catch {
    return null;
  }
}

function userCoQuyenActivityMonitor(token: string | undefined): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.sub) return false;
  const accounts = layAccounts();
  const user = accounts.find(a => a.id === payload.sub);
  if (!user) return false;
  return (user.policies ?? []).some(p => p.code === 'ACTIVITY_MONITOR');
}

// ── Mock router ─────────────────────────────────────────────────────────────
export async function mockPhanQuyen<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  await delay();

  const method = (options.method ?? 'GET').toUpperCase();

  // ── GET /auth/accounts ──────────────────────────────────────────────────
  if (path.startsWith('/auth/accounts') && method === 'GET' && !path.includes('/activate') && !path.includes('/deactivate') && !path.includes('/protection') && !path.includes('/policies')) {
    const accounts = layAccounts();
    const url = new URL(path, 'http://localhost');
    const name = url.searchParams.get('name')?.toLowerCase();
    const filtered = name
      ? accounts.filter(a => a.account.toLowerCase().includes(name) || (a.fullName ?? '').toLowerCase().includes(name))
      : accounts;
    return filtered as unknown as T;
  }

  // ── POST /auth/accounts ─────────────────────────────────────────────────
  if (path === '/auth/accounts' && method === 'POST') {
    const body = layBody(options);
    const accounts = layAccounts();
    const existing = accounts.find(a => a.account === body.account);
    if (existing) throw new Error('Dữ liệu này đã tồn tại.');

    const newUser: TaiKhoanApi = {
      id: taoId(),
      account: body.account as string,
      fullName: (body.fullName as string) || null,
      isActive: true,
      isProtected: false,
      isSystem: false,
      createdAt: new Date().toISOString(),
      policies: [],
    };
    accounts.unshift(newUser);
    luuAccounts(accounts);
    return newUser as unknown as T;
  }

  // ── PATCH /auth/:userId/password ───────────────────────────────────────
  const passwordMatch = path.match(/^\/auth\/([^/]+)\/password$/);
  if (passwordMatch && method === 'PATCH') {
    const body = layBody(options);
    if (!body.newPassword) throw new Error('Dữ liệu gửi lên chưa hợp lệ.');
    const accounts = layAccounts();
    const user = accounts.find(a => a.id === passwordMatch[1]);
    if (!user) throw new Error('Không tìm thấy dữ liệu yêu cầu.');
    user.updatedAt = new Date().toISOString();
    luuAccounts(accounts);
    return user as unknown as T;
  }

  // ── PATCH /auth/accounts/:id/activate ───────────────────────────────────
  const activateMatch = path.match(/^\/auth\/accounts\/([^/]+)\/activate$/);
  if (activateMatch && method === 'PATCH') {
    const accounts = layAccounts();
    const user = accounts.find(a => a.id === activateMatch[1]);
    if (!user) throw new Error('Không tìm thấy dữ liệu yêu cầu.');
    user.isActive = true;
    user.updatedAt = new Date().toISOString();
    luuAccounts(accounts);
    return user as unknown as T;
  }

  // ── PATCH /auth/accounts/:id/deactivate ─────────────────────────────────
  const deactivateMatch = path.match(/^\/auth\/accounts\/([^/]+)\/deactivate$/);
  if (deactivateMatch && method === 'PATCH') {
    const accounts = layAccounts();
    const user = accounts.find(a => a.id === deactivateMatch[1]);
    if (!user) throw new Error('Không tìm thấy dữ liệu yêu cầu.');
    user.isActive = false;
    user.updatedAt = new Date().toISOString();
    luuAccounts(accounts);
    return user as unknown as T;
  }

  // ── PATCH /auth/accounts/:id/protection ─────────────────────────────────
  const protectionMatch = path.match(/^\/auth\/accounts\/([^/]+)\/protection$/);
  if (protectionMatch && method === 'PATCH') {
    const body = layBody(options);
    const accounts = layAccounts();
    const user = accounts.find(a => a.id === protectionMatch[1]);
    if (!user) throw new Error('Không tìm thấy dữ liệu yêu cầu.');
    user.isProtected = Boolean(body.isProtected);
    user.updatedAt = new Date().toISOString();
    luuAccounts(accounts);
    return user as unknown as T;
  }

  // ── POST /auth/accounts/:id/policies (cấp quyền) ───────────────────────
  const grantMatch = path.match(/^\/auth\/accounts\/([^/]+)\/policies$/);
  if (grantMatch && method === 'POST') {
    const body = layBody(options);
    const policyCodes = (body.policyCodes ?? []) as string[];
    const accounts = layAccounts();
    const user = accounts.find(a => a.id === grantMatch[1]);
    if (!user) throw new Error('Không tìm thấy dữ liệu yêu cầu.');

    const existingCodes = new Set(user.policies.map(p => p.code));
    for (const code of policyCodes) {
      if (!existingCodes.has(code)) {
        user.policies.push({ code, name: POLICY_CATALOG.find(p => p.code === code)?.ten ?? code });
      }
    }
    user.updatedAt = new Date().toISOString();
    luuAccounts(accounts);
    return user as unknown as T;
  }

  // ── DELETE /auth/accounts/:id/policies (thu hồi quyền) ─────────────────
  const revokeMatch = path.match(/^\/auth\/accounts\/([^/]+)\/policies$/);
  if (revokeMatch && method === 'DELETE') {
    const body = layBody(options);
    const policyCodes = new Set((body.policyCodes ?? []) as string[]);
    const accounts = layAccounts();
    const user = accounts.find(a => a.id === revokeMatch[1]);
    if (!user) throw new Error('Không tìm thấy dữ liệu yêu cầu.');

    user.policies = user.policies.filter(p => !policyCodes.has(p.code));
    user.updatedAt = new Date().toISOString();
    luuAccounts(accounts);
    return user as unknown as T;
  }

  // ── GET /auth/roles ─────────────────────────────────────────────────────
  if (path.startsWith('/auth/roles') && method === 'GET') {
    const roles = layRoles();
    const url = new URL(path, 'http://localhost');
    const name = url.searchParams.get('name')?.toLowerCase();
    const filtered = name
      ? roles.filter(r => r.name.toLowerCase().includes(name) || r.code.toLowerCase().includes(name))
      : roles;
    return filtered as unknown as T;
  }

  // ── PUT /auth/roles (upsert) ────────────────────────────────────────────
  if (path === '/auth/roles' && method === 'PUT') {
    const body = layBody(options);
    const roles = layRoles();
    const code = body.code as string;
    const policyCodes = (body.policyCodes ?? []) as PolicyCode[];
    const now = new Date().toISOString();

    const existing = roles.find(r => r.code === code);
    if (existing) {
      existing.name = (body.name as string) ?? existing.name;
      existing.description = (body.description as string) ?? existing.description;
      existing.policies = policyCodes.map(c => ({
        id: `pol-${c}`, code: c,
        name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c,
        description: POLICY_CATALOG.find(p => p.code === c)?.moTa ?? '',
        createdAt: now, updatedAt: now,
      }));
      existing.updatedAt = now;
      luuRoles(roles);
      // Trả về format VaiTroUpsertApi (PUT response)
      return {
        id: existing.id, code: existing.code, name: existing.name,
        description: existing.description, granterId: existing.granterId,
        createdAt: existing.createdAt, updatedAt: existing.updatedAt,
        rolePolicies: existing.policies.map(p => ({ policy: p })),
      } as unknown as T;
    }

    const newRole: VaiTroApi = {
      id: taoId(), code, name: (body.name as string) ?? code,
      description: (body.description as string) ?? '',
      granterId: null, granter: null,
      policies: policyCodes.map(c => ({
        id: `pol-${c}`, code: c,
        name: POLICY_CATALOG.find(p => p.code === c)?.ten ?? c,
        description: POLICY_CATALOG.find(p => p.code === c)?.moTa ?? '',
        createdAt: now, updatedAt: now,
      })),
      createdAt: now, updatedAt: now,
    };
    roles.push(newRole);
    luuRoles(roles);
    return {
      id: newRole.id, code: newRole.code, name: newRole.name,
      description: newRole.description, granterId: null,
      createdAt: newRole.createdAt, updatedAt: newRole.updatedAt,
      rolePolicies: newRole.policies.map(p => ({ policy: p })),
    } as unknown as T;
  }

  // ── DELETE /auth/roles/:code ────────────────────────────────────────────
  const deleteRoleMatch = path.match(/^\/auth\/roles\/([^/]+)$/);
  if (deleteRoleMatch && method === 'DELETE') {
    const code = decodeURIComponent(deleteRoleMatch[1]);
    const roles = layRoles();
    const idx = roles.findIndex(r => r.code === code);
    if (idx === -1) throw new Error('Không tìm thấy dữ liệu yêu cầu.');
    roles.splice(idx, 1);
    luuRoles(roles);
    return null as unknown as T;
  }

  // ── GET /activity-logs ──────────────────────────────────────────────────
  if (path === '/activity-logs' && method === 'GET') {
    const logs = layActivityLogs();
    if (userCoQuyenActivityMonitor(token)) return logs as unknown as T;
    // Không có ACTIVITY_MONITOR → chỉ trả log của chính user hiện tại
    const payload = token ? decodeJwtPayload(token) : null;
    const userId = payload?.sub ?? null;
    return logs.filter(l => l.actorId === userId) as unknown as T;
  }

  // ── Fallback ────────────────────────────────────────────────────────────
  throw new Error(`Mock chưa hỗ trợ: ${method} ${path}`);
}
