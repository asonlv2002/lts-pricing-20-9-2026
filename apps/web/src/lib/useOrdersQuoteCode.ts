"use client";
import { useEffect } from 'react';
import { useCalculatorStore } from '../store/CuaHangTinhGia';
import { quoteCodeTuBaoGia, type OrderCoPhienBan } from '@lts/bang-tinh-gia';

/**
 * Đảm bảo cache orders đã tải (1 request/phiên) + trả map quotationId → orders
 * để derive quoteCode báo giá (BE b6028b0). Cần đăng nhập; component gọi hook
 * sẽ re-render khi cache sẵn sàng.
 */
export function useOrdersQuoteCode(): Record<string, OrderCoPhienBan[]> {
  const accessToken = useCalculatorStore((s) => s.accessToken);
  const ordersTheoQuotation = useCalculatorStore((s) => s.ordersTheoQuotation);
  const daTaiOrdersCache = useCalculatorStore((s) => s.daTaiOrdersCache);
  const taiOrdersCache = useCalculatorStore((s) => s.taiOrdersCache);

  useEffect(() => {
    if (accessToken && !daTaiOrdersCache) void taiOrdersCache(accessToken);
  }, [accessToken, daTaiOrdersCache, taiOrdersCache]);

  return ordersTheoQuotation;
}

/** QuoteCode hiển thị: ưu tiên derive từ orders; rỗng nếu BG chưa có LSX. */
export function quoteCodeHienThi(
  bg: { id: string; createdAt: string },
  ordersMap: Record<string, OrderCoPhienBan[]>,
): string {
  return quoteCodeTuBaoGia(bg, ordersMap[bg.id]);
}
