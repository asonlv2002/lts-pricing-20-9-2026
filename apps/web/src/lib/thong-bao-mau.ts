"use client";

// apps/web/src/lib/thong-bao-mau.ts
import { useCallback, useState } from "react";

export type LoaiThongBao = "Báo giá" | "LSX" | "Hệ thống" | "CRM" | "Bảo mật";

export interface ThongBaoMau {
  id: string;
  tieuDe: string;
  thoiGian: string;
  loai: LoaiThongBao;
  daDoc: boolean;
}

export const THONG_BAO_MAU: ThongBaoMau[] = [
  {
    id: "n1",
    tieuDe: "Báo giá #BG-2401 đã được duyệt",
    thoiGian: "2 phút trước",
    loai: "Báo giá",
    daDoc: false,
  },
  {
    id: "n2",
    tieuDe: "LSX #LSX-118 chuyển sang Sản xuất",
    thoiGian: "1 giờ trước",
    loai: "LSX",
    daDoc: false,
  },
  {
    id: "n3",
    tieuDe: "Cập nhật bảng lợi nhuận hệ thống",
    thoiGian: "Hôm qua",
    loai: "Hệ thống",
    daDoc: false,
  },
  {
    id: "n4",
    tieuDe: "Khách hàng ACME_01 gán sale mới",
    thoiGian: "2 ngày trước",
    loai: "CRM",
    daDoc: true,
  },
  {
    id: "n5",
    tieuDe: "Phiên đăng nhập từ thiết bị mới",
    thoiGian: "3 ngày trước",
    loai: "Bảo mật",
    daDoc: true,
  },
];

export function useDanhSachThongBao() {
  const [danhSach, datDanhSach] = useState<ThongBaoMau[]>(() =>
    THONG_BAO_MAU.map((n) => ({ ...n })),
  );
  const soChuaDoc = danhSach.filter((n) => !n.daDoc).length;
  const danhDauDaDoc = useCallback((id: string) => {
    datDanhSach((list) =>
      list.map((n) => (n.id === id ? { ...n, daDoc: true } : n)),
    );
  }, []);
  const danhDauTatCaDaDoc = useCallback(() => {
    datDanhSach((list) => list.map((n) => ({ ...n, daDoc: true })));
  }, []);
  return { danhSach, soChuaDoc, danhDauDaDoc, danhDauTatCaDaDoc };
}
