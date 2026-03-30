// src/instrumentation.ts
// Được Next.js gọi MỘT LẦN khi server khởi động (không phải mỗi request).
// Đảm bảo tất cả data files tồn tại trước khi xử lý request đầu tiên.

export async function register() {
  // Chỉ chạy trên Node.js runtime (không chạy trên Edge runtime hoặc client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDataFiles } = await import('./lib/db');
    try {
      await initDataFiles();
      console.log('[startup] Data files initialized in data/');
    } catch (err) {
      // Non-fatal — app vẫn khởi động được, route handlers sẽ tự init khi cần
      console.error('[startup] Failed to initialize data files:', err);
    }
  }
}
