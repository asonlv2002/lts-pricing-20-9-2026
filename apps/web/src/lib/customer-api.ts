export const CUSTOMER_CODE_NAME_PATTERN = '^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$';
const CUSTOMER_CODE_NAME_REGEX = new RegExp(CUSTOMER_CODE_NAME_PATTERN);

export const THONG_BAO_MA_KHACH_HANG_BAT_BUOC = 'Vui lòng nhập mã khách hàng.';
export const THONG_BAO_MA_KHACH_HANG_SAI_DINH_DANG = 'Mã khách hàng chỉ dùng chữ in hoa, số và dấu gạch dưới. Ví dụ hợp lệ: KH001, ACME_01';

export type CustomerStatusApi = 'active' | 'inactive' | string;

export interface CustomerVersionApi {
  version: number;
  organizationName: string;
  taxCode?: string | null;
  contactName: string;
  phoneNumber: string;
  email: string;
  address: string;
  status: CustomerStatusApi;
  changeNote?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface CustomerManagerApi {
  id?: string;
  userId?: string;
  managerId?: string;
  account?: string;
  fullName: string | null;
  canWrite: boolean;
}

export interface CustomerManagerUi {
  userId: string;
  account?: string;
  fullName: string | null;
  canWrite: boolean;
}

export interface CustomerManagerPayload {
  managerId: string;
  canWrite: boolean;
}

export interface CustomerManagerOption {
  id: string;
  name: string;
}

export interface TaiKhoanPhanCong {
  id: string;
  account: string;
  fullName: string | null;
  isActive: boolean;
}

export interface CustomerApi {
  codeName: string;
  createdBy?: string | null;
  createdAt: string;
  versions: CustomerVersionApi[];
}

export interface CustomerUi {
  id: string;
  customerType?: 'company' | 'individual';
  customerCode: string;
  companyName: string;
  taxCode?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  invoiceAddress?: string;
  address?: string;
  region?: string;
  customerGroup?: string;
  sellerId?: string | null;
  sellerName?: string;
  secondarySellerId?: string | null;
  secondarySellerName?: string;
  managers?: CustomerManagerUi[];
  contactTitle?: string;
  contactNotes?: string;
  assignmentHistory?: string[];
  assignmentNote?: string;
  status: 'active' | 'inactive';
  crmStatus?: 'lead' | 'negotiating' | 'active' | 'paused' | 'inactive';
  isLocked: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  versions?: CustomerVersionApi[];
}

export function chuyenCustomerManagersApiSangUi(managers: CustomerManagerApi[] = []): CustomerManagerUi[] {
  return managers
    .map((manager) => ({
      userId: (manager.userId || manager.id || manager.managerId || '').trim(),
      account: manager.account,
      fullName: manager.fullName,
      canWrite: manager.canWrite === true,
    }))
    .filter((manager) => manager.userId.length > 0);
}

export function chuyenCustomerManagersSangPayload(managers: CustomerManagerUi[] = []): CustomerManagerPayload[] {
  const seen = new Set<string>();
  const payload: CustomerManagerPayload[] = [];

  for (const manager of managers) {
    const managerId = manager.userId.trim();
    if (!managerId || seen.has(managerId)) continue;
    seen.add(managerId);
    payload.push({ managerId, canWrite: manager.canWrite === true });
  }

  return payload;
}

export function locTaiKhoanActive<T extends TaiKhoanPhanCong>(accounts: T[] = []): T[] {
  return accounts.filter((account) => account.isActive === true);
}

export function tomTatNguoiPhuTrach(managers: CustomerManagerUi[] = []): { primary: string; secondary: string } {
  if (managers.length === 0) return { primary: 'Chưa phân công', secondary: '' };

  const writable = managers.find((manager) => manager.canWrite) ?? managers[0];
  const writableLabel = writable.canWrite ? 'Được sửa' : 'Chỉ xem';
  const writableName = writable.fullName || writable.account || writable.userId;

  if (managers.length === 1) {
    return { primary: writableName, secondary: writableLabel };
  }

  return {
    primary: `${managers.length} người phụ trách`,
    secondary: `${writableName} · ${writableLabel}`,
  };
}

export function layLuaChonNguoiPhuTrach(customers: Pick<CustomerUi, 'managers'>[] = []): CustomerManagerOption[] {
  const options = new Map<string, CustomerManagerOption>();

  for (const customer of customers) {
    for (const manager of customer.managers ?? []) {
      if (!manager.userId || options.has(manager.userId)) continue;
      options.set(manager.userId, {
        id: manager.userId,
        name: manager.fullName || manager.account || manager.userId,
      });
    }
  }

  return [...options.values()].sort((left, right) => left.name.localeCompare(right.name, 'vi'));
}

export function sapXepPhienBanKhachHang(versions: CustomerVersionApi[] = []): CustomerVersionApi[] {
  return [...versions].sort((left, right) => right.version - left.version);
}

export function kiemTraMaKhachHang(value: string): { hopLe: boolean; maKhachHang: string; loi?: string } {
  const maKhachHang = value.trim();
  if (!maKhachHang) return { hopLe: false, maKhachHang, loi: THONG_BAO_MA_KHACH_HANG_BAT_BUOC };
  if (!CUSTOMER_CODE_NAME_REGEX.test(maKhachHang)) {
    return { hopLe: false, maKhachHang, loi: THONG_BAO_MA_KHACH_HANG_SAI_DINH_DANG };
  }
  return { hopLe: true, maKhachHang };
}

export function kiemTraThongTinKhachHang(customer: CustomerUi): { hopLe: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!customer.companyName.trim()) errors.companyName = 'Vui lòng nhập tên khách hàng.';
  if (!customer.contactName?.trim()) errors.contactName = 'Vui lòng nhập người liên hệ.';
  if (!customer.phone?.trim()) errors.phone = 'Vui lòng nhập số điện thoại.';
  if (!customer.email?.trim()) {
    errors.email = 'Vui lòng nhập email khách hàng.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    errors.email = 'Email chưa đúng định dạng.';
  }
  if (!(customer.address || customer.invoiceAddress || '').trim()) errors.address = 'Vui lòng nhập địa chỉ khách hàng.';
  return { hopLe: Object.keys(errors).length === 0, errors };
}

export function chuyenCustomerApiSangUi(customer: CustomerApi): CustomerUi {
  const latest = customer.versions?.[0];
  const status = latest?.status === 'inactive' ? 'inactive' : 'active';
  return {
    id: customer.codeName,
    customerType: 'company',
    customerCode: customer.codeName,
    companyName: latest?.organizationName || 'Chưa có thông tin chi tiết',
    taxCode: latest?.taxCode ?? '',
    contactName: latest?.contactName ?? '',
    phone: latest?.phoneNumber ?? '',
    email: latest?.email ?? '',
    invoiceAddress: latest?.address ?? '',
    address: latest?.address ?? '',
    region: '',
    customerGroup: '',
    sellerId: null,
    sellerName: '',
    secondarySellerId: null,
    secondarySellerName: '',
    contactTitle: '',
    contactNotes: '',
    assignmentHistory: [],
    assignmentNote: '',
    status,
    crmStatus: 'lead',
    isLocked: false,
    notes: latest ? latest.changeNote ?? '' : 'Khách hàng này mới được tạo mã. Vui lòng bổ sung thông tin liên hệ và địa chỉ.',
    createdAt: customer.createdAt,
    updatedAt: latest?.createdAt ?? customer.createdAt,
    versions: customer.versions ?? [],
  };
}

export function chuyenCustomerUiSangThongTinApi(customer: CustomerUi) {
  const validation = kiemTraThongTinKhachHang(customer);
  if (!validation.hopLe) {
    throw new Error(Object.values(validation.errors)[0] ?? 'Thông tin khách hàng chưa hợp lệ.');
  }
  return {
    organizationName: customer.companyName.trim(),
    taxCode: customer.taxCode?.trim() || undefined,
    contactName: customer.contactName?.trim() ?? '',
    phoneNumber: customer.phone?.trim() ?? '',
    email: customer.email?.trim() ?? '',
    address: (customer.address || customer.invoiceAddress || '').trim(),
    status: customer.status || 'active',
    changeNote: customer.notes?.trim() || 'Tạo hồ sơ khách hàng.',
  };
}
