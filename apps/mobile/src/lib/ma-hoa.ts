// ═══════════════════════════════════════════════════════════════════════════
// Mã hoá — hash mật khẩu bằng SHA-256 (expo-crypto)
// Dùng cho xác thực login offline-first
// ═══════════════════════════════════════════════════════════════════════════
import * as Crypto from 'expo-crypto';

const MUOI = 'lts-pricing-mobile';  // salt tĩnh — đủ chống peek, không chống rainbow table

export async function mhPassword(matKhau: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${MUOI}:${matKhau}`
  );
}

export async function kiemTraPassword(
  matKhauNhap: string,
  hashLuuTru: string
): Promise<boolean> {
  const hash = await mhPassword(matKhauNhap);
  return hash === hashLuuTru;
}
