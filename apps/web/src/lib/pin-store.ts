// ═══════════════════════════════════════════════════════════════════════════
// Mã PIN duyệt — lưu hash SHA-256 trong localStorage (FE trước, không cần BE).
// Khi backend cung cấp API PIN, chỉ cần thay phần lưu/verify trong file này,
// các modal không đổi.
// ═══════════════════════════════════════════════════════════════════════════
const LS_PIN_KEY = "lts_pin_duyet_v1";

/** Số lần nhập sai tối đa trước khi khóa. */
export const SO_LAN_SAI_TOI_DA = 5;
/** Thời gian khóa sau khi nhập sai quá nhiều (ms). */
export const THOI_GIAN_KHOA_MS = 30_000;

let soLanSai = 0;
let khoaDen: number | null = null;

export function pinHopLe(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

async function bamPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`lts-pin-duyet:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasPin(): boolean {
  try {
    const raw = window.localStorage.getItem(LS_PIN_KEY);
    return !!raw && raw.startsWith("sha256:");
  } catch {
    return false;
  }
}

/** Đặt PIN mới (validate 6 chữ số). Chỉ lưu hash, không lưu plaintext. */
export async function setPin(pin: string): Promise<void> {
  if (!pinHopLe(pin)) throw new Error("Mã PIN phải gồm đúng 6 chữ số.");
  const hash = await bamPin(pin);
  try {
    window.localStorage.setItem(LS_PIN_KEY, `sha256:${hash}`);
    soLanSai = 0;
    khoaDen = null;
  } catch {
    throw new Error("Không lưu được mã PIN trên máy này.");
  }
}

export function dangKhoa(): boolean {
  if (khoaDen && Date.now() > khoaDen) {
    khoaDen = null;
    soLanSai = 0;
  }
  return khoaDen !== null;
}

/** Còn bao nhiêu lần thử trước khi bị khóa. */
export function soLanThuConLai(): number {
  return Math.max(0, SO_LAN_SAI_TOI_DA - soLanSai);
}

/** Kiểm tra PIN nhập vào có đúng không (có khóa sau 5 lần sai / 30 giây). */
export async function verifyPin(pin: string): Promise<boolean> {
  if (dangKhoa()) return false;
  if (!hasPin() || !pinHopLe(pin)) {
    soLanSai += 1;
    if (soLanSai >= SO_LAN_SAI_TOI_DA) khoaDen = Date.now() + THOI_GIAN_KHOA_MS;
    return false;
  }
  const stored = (window.localStorage.getItem(LS_PIN_KEY) || "").slice("sha256:".length);
  const hash = await bamPin(pin);
  if (hash === stored) {
    soLanSai = 0;
    return true;
  }
  soLanSai += 1;
  if (soLanSai >= SO_LAN_SAI_TOI_DA) khoaDen = Date.now() + THOI_GIAN_KHOA_MS;
  return false;
}

/** Đổi PIN: verify PIN cũ trước, sau đó đặt PIN mới. */
export async function doiPin(pinCu: string, pinMoi: string): Promise<void> {
  if (!(await verifyPin(pinCu))) {
    throw new Error("Mã PIN hiện tại không đúng.");
  }
  await setPin(pinMoi);
}
