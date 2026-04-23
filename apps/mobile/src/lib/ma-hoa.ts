// ═══════════════════════════════════════════════════════════════════════════
// Mã hoá — hash mật khẩu bằng SHA-256 (js-sha256, JS thuần, không native)
// Thay thế expo-crypto sau khi gỡ Expo
// ═══════════════════════════════════════════════════════════════════════════
import { sha256 } from 'js-sha256';

const MUOI = 'lts-pricing-mobile';  // salt tĩnh — đủ chống peek, không chống rainbow table

export async function mhPassword(matKhau: string): Promise<string> {
  return sha256(`${MUOI}:${matKhau}`);
}

export async function kiemTraPassword(
  matKhauNhap: string,
  hashLuuTru: string
): Promise<boolean> {
  const hash = await mhPassword(matKhauNhap);
  return hash === hashLuuTru;
}
