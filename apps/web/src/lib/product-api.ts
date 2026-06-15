import { laySanPhamService, taoSanPhamService, xoaSanPhamService, type SanPhamApi } from './api/service-lts';

export const PRODUCT_CODE_PATTERN = '^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$';
const PRODUCT_CODE_REGEX = new RegExp(PRODUCT_CODE_PATTERN);

export const THONG_BAO_MA_SAN_PHAM_BAT_BUOC = 'Vui lòng nhập mã sản phẩm.';
export const THONG_BAO_MA_SAN_PHAM_SAI_DINH_DANG =
  'Mã sản phẩm chỉ dùng chữ in hoa, số và dấu gạch dưới. Ví dụ hợp lệ: TUI_GAO_5KG, MANG_PE_OPP';
export const THONG_BAO_TEN_SAN_PHAM_BAT_BUOC = 'Vui lòng nhập tên sản phẩm.';

export const LS_PRODUCTS = 'lts_products';

export interface SanPhamUi {
  id: string;
  productCode: string;
  productName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export function kiemTraMaSanPham(value: string): { hopLe: boolean; ma: string; loi?: string } {
  const ma = (value ?? '').trim();
  if (!ma) return { hopLe: false, ma, loi: THONG_BAO_MA_SAN_PHAM_BAT_BUOC };
  if (!PRODUCT_CODE_REGEX.test(ma)) {
    return { hopLe: false, ma, loi: THONG_BAO_MA_SAN_PHAM_SAI_DINH_DANG };
  }
  return { hopLe: true, ma };
}

export function kiemTraThongTinSanPham(input: { productCode: string; productName: string }): {
  hopLe: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const checkCode = kiemTraMaSanPham(input.productCode);
  if (!checkCode.hopLe) errors.productCode = checkCode.loi ?? THONG_BAO_MA_SAN_PHAM_SAI_DINH_DANG;
  if (!input.productName?.trim()) errors.productName = THONG_BAO_TEN_SAN_PHAM_BAT_BUOC;
  return { hopLe: Object.keys(errors).length === 0, errors };
}

export function chuyenSanPhamApiSangUi(sp: SanPhamApi): SanPhamUi {
  return {
    id: sp.id,
    productCode: sp.productCode,
    productName: sp.productName,
    description: sp.description ?? '',
    createdAt: sp.createdAt,
    updatedAt: sp.updatedAt,
  };
}

export function loadProducts(): SanPhamUi[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_PRODUCTS);
    return raw ? (JSON.parse(raw) as SanPhamUi[]) : [];
  } catch {
    return [];
  }
}

export function luuProducts(items: SanPhamUi[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_PRODUCTS, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

export function gopSanPhamVaoCache(items: SanPhamUi[]): SanPhamUi[] {
  const seen = new Set<string>();
  const merged: SanPhamUi[] = [];
  for (const sp of items) {
    const key = sp.productCode.trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(sp);
  }
  return merged;
}

export async function dongBoDanhSachSanPham(token?: string): Promise<SanPhamUi[]> {
  const data = await laySanPhamService(token);
  const ui = (Array.isArray(data) ? data : []).map(chuyenSanPhamApiSangUi);
  const merged = gopSanPhamVaoCache(ui);
  luuProducts(merged);
  return merged;
}

export async function taoSanPhamMoi(
  input: { productCode: string; productName: string; description?: string },
  token?: string,
): Promise<SanPhamUi> {
  const validation = kiemTraThongTinSanPham(input);
  if (!validation.hopLe) {
    throw new Error(Object.values(validation.errors)[0]);
  }
  const created = await taoSanPhamService(
    {
      productCode: input.productCode.trim(),
      productName: input.productName.trim(),
      description: input.description?.trim() || undefined,
    },
    token,
  );
  const ui = chuyenSanPhamApiSangUi(created);
  const cache = loadProducts();
  const next = gopSanPhamVaoCache([ui, ...cache]);
  luuProducts(next);
  return ui;
}

export async function xoaSanPham(id: string, token?: string): Promise<void> {
  await xoaSanPhamService(id, token);
  const cache = loadProducts().filter(sp => sp.id !== id);
  luuProducts(cache);
}
