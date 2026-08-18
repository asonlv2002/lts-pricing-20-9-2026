import type { NextConfig } from "next";

/**
 * SPA shell: path menu/entity (/tao-tinh-gia, /tinh-gia/:id, …) phục vụ app/page.tsx.
 * Client (menu-route + VoTrang) parse window.location.pathname.
 * Không dùng catch-all [...slug] (trùng page.tsx / khó tạo folder trên Windows).
 */
const SPA_PATHS = [
  // menu slugs (1 segment)
  "tao-tinh-gia",
  "tao-tinh-gia-nang-cap",
  "tao-bao-gia",
  "tao-lsx",
  "danh-sach-tinh-gia",
  "danh-sach-bao-gia",
  "danh-sach-lsx",
  "nhat-ky-tinh-gia",
  "danh-sach-khach-hang",
  "nhat-ky-khach-hang",
  "cau-hinh-vat-tu",
  "cau-hinh-chi-phi-sx",
  "cau-hinh-chi-phi-sx-nang-cap",
  "cau-hinh-gia-cong-ngoai",
  "cau-hinh-loi-nhuan",
  "cau-hinh-phu-phi",
  "cau-hinh-lai-vay",
  "cau-hinh-dinh-muc-hao-hut",
  "cau-hinh-cong-thuc",
  "tai-khoan",
  "vai-tro",
  "phan-quyen",
  "cai-dat-he-thong",
  "tai-nguyen-he-thong",
  "nhat-ky-he-thong",
  "tong-quan-bao-gia-da-tao",
  "tong-quan-bao-gia-cho-duyet",
  "tong-quan-khach-hang-moi",
  "tong-quan-san-pham-gan-day",
  "tong-quan-doanh-thu-du-kien",
  "tong-quan-hoat-dong-gan-day",
  "lich-su-bao-gia-theo-khach",
  "lich-su-tinh-gia-theo-khach",
];

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  async rewrites() {
    const menuRewrites = SPA_PATHS.map((slug) => ({
      source: `/${slug}`,
      destination: "/",
    }));
    return [
      ...menuRewrites,
      // mobile hub
      { source: "/hub/:hubId", destination: "/" },
      // entity deep-links
      { source: "/tinh-gia/:id", destination: "/" },
      { source: "/tinh-gia-nang-cao/:id", destination: "/" },
      { source: "/bao-gia/:id", destination: "/" },
      { source: "/khach-hang/:code", destination: "/" },
      { source: "/lsx/:id", destination: "/" },
      // chi tiết trong màn danh sách báo giá
      { source: "/danh-sach-bao-gia/:id", destination: "/" },
    ];
  },
};

export default nextConfig;
