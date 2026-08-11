// ═══════════════════════════════════════════════════════════════════════════
// Chữ ký LSX — helper gắn chữ ký người lập vào lệnh sản xuất.
// Chữ ký được snapshot dưới dạng base64 PNG data URL:
//   - @react-pdf (PDF) chỉ nhận data URL, KHÔNG hỗ trợ WebP (chỉ jpg/png/svg)
//   - Server trả chữ ký dạng WebP → phải chuyển qua canvas về PNG trước khi nhúng
// ═══════════════════════════════════════════════════════════════════════════
import { dungCuaHangTinhGia } from "../store/CuaHangTinhGia";
import type { LSXManualFields } from "./types";

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Decode 1 blob (mọi định dạng) → PNG data URL qua canvas (nền trắng). */
export function blobSangPngDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Chữ ký PNG base64 của user hiện tại (null nếu chưa upload / không đọc được). */
export async function layChuKyDataUrl(): Promise<string | null> {
  const signatureBlobUrl =
    dungCuaHangTinhGia.getState().nguoiDungHienTai?.signatureBlobUrl ?? null;
  if (!signatureBlobUrl) return null;
  try {
    const res = await fetch(signatureBlobUrl);
    if (!res.ok) return null;
    return await blobSangPngDataUrl(await res.blob());
  } catch {
    return null;
  }
}

/**
 * Snapshot chữ ký người tạo vào manual lúc tạo/cập nhật LSX.
 * Không ghi đè nếu manual đã có chữ ký (giữ người ký ban đầu).
 */
export async function themChuKyVaoManual(
  manual: LSXManualFields,
): Promise<LSXManualFields> {
  if (manual.preparedBySignature) return manual;
  const signature = await layChuKyDataUrl();
  return signature ? { ...manual, preparedBySignature: signature } : manual;
}

