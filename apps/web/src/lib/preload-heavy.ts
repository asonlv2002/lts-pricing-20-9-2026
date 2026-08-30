/**
 * preload-heavy.ts - Preload các thư viện nặng (pdf/docx) ngay khi vào app.
 * Lý do: 2 thư viện này hiện đang bị import đúng lúc user bấm "Xem trước / Xuất" —
 * đúng cái lúc dễ dính lỗi tải chunk khi vừa deploy bản mới. Tải sẵn từ đầu để
 * mọi thao tác sau chỉ lấy từ bộ nhớ, gần như không bao giờ gặp ChunkLoadError.
 */

export type LoaderThuVien = () => Promise<unknown>;

const DEFAULT_LOADERS: LoaderThuVien[] = [
  () => import("@react-pdf/renderer"),
  () => import("docx"),
];

/**
 * Tải trước các thư viện nặng. Không bao giờ throw (allSettled + catch), nên an
 * toàn gọi fire-and-forget lúc app mount. Nhận tham số loaders để test dễ dàng.
 */
export async function taiTruocThuVienNang(
  loaders: LoaderThuVien[] = DEFAULT_LOADERS,
): Promise<void> {
  await Promise.all(
    loaders.map((loader) =>
      loader().catch((_error: unknown) => {
        // Preload thất bại không được phá app — việc import "đúng lúc" vẫn chạy như cũ.
      }),
    ),
  );
}