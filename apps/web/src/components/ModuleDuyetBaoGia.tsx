"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Search,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  FileEdit,
  Loader2,
  Inbox,
  Trash2,
  ChevronDown,
  ChevronRight,
  Factory,
} from "lucide-react";
import { dungCuaHangTinhGia } from "../store/CuaHangTinhGia";
import { normalizeDisplayText } from "../lib/text-codec";
import { taoUrlChiaSeBaoGia } from "../lib/bao-gia-route";
import {
  docIdChiTietDanhSachBaoGia,
  dongBoUrlChiTietDanhSachBaoGia,
} from "../lib/menu-route";
import { QrevStyleInjector } from "./qrev-styles";
import { coQuyenDuyetBaoGia } from "../lib/permissions";
import type { CalculateInput, HistoryItem } from "../lib/types";
import NhapPinDuyetModal from "./auth/NhapPinDuyetModal";
import NhapLyDoTruocPinModal from "./auth/NhapLyDoTruocPinModal";
import {
  buildHistoryItemFromServerData,
} from "../lib/baoGiaExport";
import BaoGiaPreviewModal from "./BaoGiaPreviewModal";
import { layChuKyReviewerDataUrl } from "../lib/chu-ky";
import NutSaoChepLienKet from "./NutSaoChepLienKet";
import {
  layDanhSachBaoGiaService,
  layBaoGiaChoDuyetService,
  layBaoGiaTheoIdService,
  nopBaoGiaService,
  duyetBaoGiaService,
  customerDecideBaoGiaService,
  xoaBaoGiaService,
  chuyenTrangThaiBaoGia,
  NHAN_TRANG_THAI_BAO_GIA,
  type BaoGiaApi,
  type PricingSheetApi,
  type TrangThaiBaoGiaServer,
} from "../lib/api/service-lts";

const boDau = (chuoi: string) =>
  chuoi
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

function dinhDangNgay(iso?: string): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime();
  return ms ? new Date(ms).toLocaleString("vi-VN") : "—";
}

function dinhDangSo(n: number): string {
  return Math.round(n || 0).toLocaleString("vi-VN");
}

// Màu badge theo từng trạng thái chi tiết của server.
// Server chỉ trả 4 trạng thái (draft/submitted/approved/rejected); phản hồi khách nằm
// ở pricing_sheets.hasCustomerApproved, không phải status quotation.
const MAU_TRANG_THAI: Record<
  TrangThaiBaoGiaServer,
  { bg: string; fg: string }
> = {
  drafted: { bg: "#eef2ff", fg: "#4338ca" },
  submitted: { bg: "#fff7ed", fg: "#c2410c" },
  approved: { bg: "#ecfdf5", fg: "#047857" },
  rejected: { bg: "#fef2f2", fg: "#b91c1c" },
  unknown: { bg: "#f3f4f6", fg: "#6b7280" },
};

function HuyHieuTrangThai({ trangThai }: { trangThai: TrangThaiBaoGiaServer }) {
  const mau = MAU_TRANG_THAI[trangThai];
  return (
    <span className="qrev-badge" style={{ background: mau.bg, color: mau.fg }}>
      <span className="qrev-badge-dot" style={{ background: mau.fg }} />
      {NHAN_TRANG_THAI_BAO_GIA[trangThai]}
    </span>
  );
}

// ── Bộ lọc chip: 1-1 với 4 status server (không có 'customer_*') ────────────
type BoLoc = "all" | "drafted" | "submitted" | "approved" | "rejected";

function thuocBoLoc(trangThai: TrangThaiBaoGiaServer, loc: BoLoc): boolean {
  switch (loc) {
    case "all":
      return true;
    case "drafted":
      return trangThai === "drafted";
    case "submitted":
      return trangThai === "submitted";
    case "approved":
      return trangThai === "approved";
    case "rejected":
      return trangThai === "rejected";
    default:
      return true;
  }
}

const CHIP_LABELS: { key: BoLoc; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "drafted", label: "Khởi tạo" },
  { key: "submitted", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Bị từ chối" },
];

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function docInputBangTinh(value: unknown): Partial<CalculateInput> {
  return laObject(value) ? (value as Partial<CalculateInput>) : {};
}

function tenBaoGia(bg: BaoGiaApi): string {
  return normalizeDisplayText(
    bg.quotationName || bg.pricingSheets?.[0]?.pricingSheetName || "Báo giá",
  );
}

function tenKhachHang(bg: BaoGiaApi): string {
  const sheet = bg.pricingSheets?.[0];
  const input = docInputBangTinh(sheet?.inputValue);
  return normalizeDisplayText(
    input.customer || sheet?.customer?.codeName || sheet?.original?.customerName || "—",
  );
}

function tenSanPham(bg: BaoGiaApi): string {
  const sheet = bg.pricingSheets?.[0];
  const input = docInputBangTinh(sheet?.inputValue);
  return normalizeDisplayText(input.productName || "—");
}

function tuKhoaBaoGia(bg: BaoGiaApi): string {
  const pricingText = (bg.pricingSheets ?? [])
    .map((sheet) => {
      const input = docInputBangTinh(sheet.inputValue);
      return [
        sheet.pricingSheetName,
        input.productName,
        input.customer,
        sheet.customer?.codeName,
        sheet.customerCodeName,
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join(" ");
  return boDau(`${tenBaoGia(bg)} ${pricingText}`);
}

function nguoiTaoBaoGia(bg: BaoGiaApi): string | undefined {
  return bg.original?.actorName ?? undefined;
}

/** Đếm phản hồi khách theo từng pricing sheet. */
function demPhanHoiKhach(sheets: PricingSheetApi[] | undefined) {
  const dem = { daDuyet: 0, bo: 0, cho: 0 };
  if (!sheets) return dem;
  for (const s of sheets) {
    if (s.hasCustomerApproved === true) dem.daDuyet += 1;
    else if (s.hasCustomerApproved === false) dem.bo += 1;
    else dem.cho += 1;
  }
  return dem;
}

type Nguon = "list" | "review";

export default function ModuleDuyetBaoGia({
  khiDieuHuong,
}: {
  khiDieuHuong?: (menuKey: string) => void;
}) {
  const accessToken = dungCuaHangTinhGia((s) => s.accessToken);
  const isAuthenticated = dungCuaHangTinhGia((s) => s.isAuthenticated);
  const nguoiDung = dungCuaHangTinhGia((s) => s.nguoiDungHienTai);
  const datBaoGiaDangSua = dungCuaHangTinhGia((s) => s.datBaoGiaDangSua);
  const datNguonWizard = dungCuaHangTinhGia((s) => s.datNguonWizard);
  const datLsxTaoTuSheet = dungCuaHangTinhGia((s) => s.datLsxTaoTuSheet);
  const datLsxDangSua = dungCuaHangTinhGia((s) => s.datLsxDangSua);
  const policies = nguoiDung?.policies ?? [];
  const laNguoiDuyet = coQuyenDuyetBaoGia(policies);

  const [previewState, setPreviewState] = useState<{
    item: HistoryItem;
    customerInfo: { address?: string; taxCode?: string; phone?: string; fax?: string; description?: string };
    reviewerSignatureDataUrl?: string | null;
  } | null>(null);

  // Nguồn dữ liệu: 'list' = GET /quotations; 'review' = quotation-in-review (chỉ reviewer)
  const [nguon, datNguon] = useState<Nguon>("list");
  const [boLoc, datBoLoc] = useState<BoLoc>("all");
  const [danhSach, datDanhSach] = useState<BaoGiaApi[]>([]);
  const [tuKhoa, datTuKhoa] = useState("");
  const [dangTai, datDangTai] = useState(false);
  const [loi, datLoi] = useState("");
  const [thongBao, datThongBao] = useState("");
  const [dangXuLyId, datDangXuLyId] = useState<string | null>(null);
  const [dangXemBgId, setDangXemBgId] = useState<string | null>(null);
  const [nhapPin, setNhapPin] = useState<{
    bg: BaoGiaApi;
    title: string;
    message: string;
    onConfirm: (pinToken: string) => Promise<void> | void;
  } | null>(null);
  // Bước nhập lý do trước khi mở popup PIN khi "Từ chối".
  // UI-only: lý do sẽ được nối với server sau khi có BE.
  const [nhapLyDo, setNhapLyDo] = useState<{
    bg: BaoGiaApi;
  } | null>(null);
  // Expand dropdown cho từng BG để xem/duyệt từng pricing sheet.
  // URL /danh-sach-bao-gia/<id> = auto-expand hàng đó.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedIdRef = useRef<string | null>(null);
  /** Bỏ qua 1 lần sync URL sau khi state tự cập nhật. */
  const urlDangDongBo = useRef(false);

  const lamMoi = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      datDanhSach([]);
      datLoi("Cần đăng nhập để xem báo giá từ máy chủ.");
      return;
    }
    datDangTai(true);
    datLoi("");
    try {
      const data =
        nguon === "review"
          ? await layBaoGiaChoDuyetService(accessToken)
          : await layDanhSachBaoGiaService(accessToken);
      datDanhSach(data);
    } catch (error) {
      datLoi(
        error instanceof Error
          ? error.message
          : "Không tải được danh sách báo giá.",
      );
      datDanhSach([]);
    } finally {
      datDangTai(false);
    }
  }, [accessToken, isAuthenticated, nguon]);

  useEffect(() => {
    void lamMoi();
  }, [lamMoi]);

  // Đếm số lượng theo từng chip (trên dữ liệu nguồn 'list').
  const demTheoChip = useMemo(() => {
    const dem: Record<BoLoc, number> = {
      all: danhSach.length,
      drafted: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };
    for (const bg of danhSach) {
      const tt = chuyenTrangThaiBaoGia(bg.updateStatus);
      if (thuocBoLoc(tt, "drafted")) dem.drafted++;
      if (thuocBoLoc(tt, "submitted")) dem.submitted++;
      if (thuocBoLoc(tt, "approved")) dem.approved++;
      if (thuocBoLoc(tt, "rejected")) dem.rejected++;
    }
    return dem;
  }, [danhSach]);

  const ketQua = useMemo(() => {
    const q = boDau(tuKhoa.trim());
    return danhSach.filter((bg) => {
      const tt = chuyenTrangThaiBaoGia(bg.updateStatus);
      if (nguon === "list" && !thuocBoLoc(tt, boLoc)) return false;
      if (q && !tuKhoaBaoGia(bg).includes(q)) return false;
      return true;
    });
  }, [danhSach, tuKhoa, boLoc, nguon]);

  const hienThongBao = useCallback((msg: string) => {
    datThongBao(msg);
    setTimeout(() => datThongBao(""), 4000);
  }, []);

  const nopBaoGia = useCallback(
    async (bg: BaoGiaApi) => {
      if (!accessToken) return;
      // Nộp báo giá cần nhập mã PIN (server gắn PinGuard trên route status_update).
      setNhapPin({
        bg,
        title: "Gửi duyệt báo giá",
        message: `Bạn có chắc muốn gửi báo giá "${tenBaoGia(bg)}" để duyệt?`,
        onConfirm: async (pinToken: string) => {
          datDangXuLyId(bg.id);
          datLoi("");
          try {
            await nopBaoGiaService(bg.id, accessToken, pinToken);
            setNhapPin(null);
            hienThongBao("Đã nộp báo giá để chờ duyệt.");
            await lamMoi();
          } catch (error) {
            // Ném lại để modal PIN giữ mở + hiện lỗi (không đóng sớm).
            throw error instanceof Error
              ? error
              : new Error("Không nộp được báo giá.");
          } finally {
            datDangXuLyId(null);
          }
        },
      });
    },
    [accessToken, lamMoi, hienThongBao],
  );

  const duyetBaoGia = useCallback(
    async (bg: BaoGiaApi, quyetDinh: "approved" | "rejected") => {
      if (!accessToken) return;
      const label = quyetDinh === "approved" ? "duyệt" : "từ chối";
      // Từ chối: nhập lý do TRƯỚC (UI-only), rồi mới mở popup PIN.
      if (quyetDinh === "rejected") {
        setNhapLyDo({ bg });
        return;
      }
      // Duyệt VÀ Từ chối đều cần nhập mã PIN (server gắn PinGuard trên cả 2 chiều).
      setNhapPin({
        bg,
        title: "Duyệt báo giá",
        message: `Bạn có chắc muốn duyệt báo giá "${tenBaoGia(bg)}"?`,
        onConfirm: async (pinToken: string) => {
          datDangXuLyId(bg.id);
          datLoi("");
          try {
            await duyetBaoGiaService(bg.id, "approved", accessToken, pinToken);
            setNhapPin(null);
            hienThongBao("Đã duyệt báo giá.");
            await lamMoi();
          } catch (error) {
            // Ném lại để modal PIN giữ mở + hiện lỗi (không đóng sớm).
            throw error instanceof Error
              ? error
              : new Error("Không cập nhật được trạng thái báo giá.");
          } finally {
            datDangXuLyId(null);
          }
        },
      });
      return;
    },
    [accessToken, lamMoi, hienThongBao],
  );

  // Sau khi user nhập lý do ở popup lý do → mở popup PIN kèm lý do.
  const tiepTucTuChoiSauLyDo = useCallback(
    (lyDo: string) => {
      if (!nhapLyDo || !accessToken) return;
      const bg = nhapLyDo.bg;
      setNhapLyDo(null);
      const muonTuChoi = `Bạn có chắc muốn từ chối báo giá "${tenBaoGia(bg)}"?`;
      setNhapPin({
        bg,
        title: "Từ chối báo giá",
        message: lyDo ? `${muonTuChoi}\nLý do: ${lyDo}` : muonTuChoi,
        onConfirm: async (pinToken: string) => {
          datDangXuLyId(bg.id);
          datLoi("");
          try {
            await duyetBaoGiaService(
              bg.id,
              "rejected",
              accessToken,
              pinToken,
              lyDo || null,
            );
            setNhapPin(null);
            hienThongBao("Đã từ chối báo giá.");
            await lamMoi();
          } catch (error) {
            // Ném lại để modal PIN giữ mở + hiện lỗi (không đóng sớm).
            throw error instanceof Error
              ? error
              : new Error("Không cập nhật được trạng thái báo giá.");
          } finally {
            datDangXuLyId(null);
          }
        },
      });
    },
    [nhapLyDo, accessToken, lamMoi, hienThongBao],
  );

  const xoaBaoGia = useCallback(
    async (bg: BaoGiaApi) => {
      if (!accessToken) return;
      // Xóa báo giá cần nhập mã PIN (server gắn PinGuard trên route DELETE).
      setNhapPin({
        bg,
        title: "Xóa báo giá",
        message: `Bạn có chắc muốn xóa báo giá "${tenBaoGia(bg)}"? Hành động này không thể hoàn tác.`,
        onConfirm: async (pinToken: string) => {
          datDangXuLyId(bg.id);
          datLoi("");
          try {
            const ketQua = await xoaBaoGiaService(bg.id, accessToken, pinToken);
            if (!ketQua.success) {
              throw new Error("Không thể xóa báo giá này.");
            }
            setNhapPin(null);
            hienThongBao("Đã xóa báo giá.");
            await lamMoi();
          } catch (error) {
            // Ném lại để modal PIN giữ mở + hiện lỗi (không đóng sớm).
            throw error instanceof Error
              ? error
              : new Error("Không xóa được báo giá.");
          } finally {
            datDangXuLyId(null);
          }
        },
      });
    },
    [accessToken, lamMoi, hienThongBao],
  );

  // Customer (creator) danh dau duyet/bo cho tung pricing sheet.
  // Chi cho phep khi:
  //   - quotation o trang thai 'approved' (server yeu cau)
  //   - actor la createdBy (server yeu cau)
  // Phan hoi KH nam o pricing_sheets.hasCustomerApproved, KHONG doi quotation.updateStatus.
  const customerDecideSheet = useCallback(
    async (
      bg: BaoGiaApi,
      sheet: PricingSheetApi,
      quyetDinh: "duyet" | "bo",
    ) => {
      if (!accessToken) return;
      const sheetLabel = sheet.pricingSheetName || sheet.id;
      const hanhDongText = quyetDinh === "duyet" ? "duyệt" : "bỏ";
      // Phản hồi khách cần nhập mã PIN (server gắn PinGuard trên route customer-decide).
      setNhapPin({
        bg,
        title: `Xác nhận phản hồi khách`,
        message: `Đánh dấu khách đã ${hanhDongText} bảng tính "${sheetLabel}"?`,
        onConfirm: async (pinToken: string) => {
          datDangXuLyId(bg.id);
          datLoi("");
          try {
            await customerDecideBaoGiaService(
              bg.id,
              [{ pricingSheetId: sheet.id, hasCustomerApproved: quyetDinh === "duyet" }],
              accessToken,
              pinToken,
            );
            setNhapPin(null);
            hienThongBao(`Đã ghi nhận khách ${hanhDongText} bảng tính.`);
            // Reload row de cap nhat hasCustomerApproved + updatedAt.
            const fresh = await layBaoGiaTheoIdService(bg.id, accessToken);
            datDanhSach((prev) =>
              prev.map((b) => (b.id === fresh.id ? fresh : b)),
            );
          } catch (error) {
            // Ném lại để modal PIN giữ mở + hiện lỗi (không đóng sớm).
            throw error instanceof Error
              ? error
              : new Error(`Không ghi nhận được phản hồi khách.`);
          } finally {
            datDangXuLyId(null);
          }
        },
      });
    },
    [accessToken, hienThongBao],
  );

  const capNhatBaoGia = useCallback(
    async (bg: BaoGiaApi) => {
      if (!accessToken) return;
      datDangXuLyId(bg.id);
      datLoi("");
      try {
        const fresh = await layBaoGiaTheoIdService(bg.id, accessToken);
        datBaoGiaDangSua(fresh);
        datNguonWizard(nguon === "review" ? "duyet" : "list");
        khiDieuHuong?.("tao-bao-gia");
      } catch (error) {
        datLoi(
          error instanceof Error
            ? error.message
            : "Không tải được báo giá để chỉnh sửa.",
        );
      } finally {
        datDangXuLyId(null);
      }
    },
    [accessToken, datBaoGiaDangSua, datNguonWizard, khiDieuHuong, nguon],
  );

  const taoLsxTuSheet = useCallback(
    (bg: BaoGiaApi, sheet: PricingSheetApi) => {
      datLsxDangSua(null);
      datLsxTaoTuSheet({ baoGia: bg, sheet });
      khiDieuHuong?.("tao-lsx");
    },
    [datLsxDangSua, datLsxTaoTuSheet, khiDieuHuong],
  );

  // Toggle expand: đồng thời đồng bộ URL /danh-sach-bao-gia/<id> ↔ danh sách thu gọn.
  const toggleExpand = useCallback((bg: BaoGiaApi) => {
    const seExpand = expandedIdRef.current !== bg.id;
    expandedIdRef.current = seExpand ? bg.id : null;
    setExpandedId(seExpand ? bg.id : null);
    urlDangDongBo.current = true;
    dongBoUrlChiTietDanhSachBaoGia(seExpand ? bg.id : null, "push");
  }, []);

  // Đồng bộ khi popstate / F5: URL có <id> → expand đúng hàng; URL base → collapse.
  useEffect(() => {
    const dongBoTuUrl = () => {
      if (urlDangDongBo.current) {
        urlDangDongBo.current = false;
        return;
      }
      const id = docIdChiTietDanhSachBaoGia(window.location.pathname);
      if (id !== expandedIdRef.current) {
        expandedIdRef.current = id;
        setExpandedId(id);
      }
    };
    dongBoTuUrl();
    window.addEventListener("popstate", dongBoTuUrl);
    return () => window.removeEventListener("popstate", dongBoTuUrl);
  }, []);

  const chonChip = (key: BoLoc) => {
    datNguon("list");
    datBoLoc(key);
  };

  const layKhachHangLocal = (): Array<{
    companyName?: string;
    customerCode?: string;
    address?: string;
    invoiceAddress?: string;
    taxCode?: string;
    phone?: string;
  }> => {
    try {
      return JSON.parse(window.localStorage.getItem("lts_customers") || "[]");
    } catch {
      return [];
    }
  };

  const renderHanhDong = (bg: BaoGiaApi, _trangThai: TrangThaiBaoGiaServer) => {
    const dangXuLy = dangXuLyId === bg.id;
    const dangXem = dangXemBgId === bg.id;

    const handleXemBaoGia = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setDangXemBgId(bg.id);
      const item = buildHistoryItemFromServerData(bg as any);
      const customerName = (item.customer ||
        bg.pricingSheets?.[0]?.customer?.codeName ||
        "") as string;
      const customers = layKhachHangLocal();
      const c = customers.find(
        (kh) =>
          kh.companyName === customerName || kh.customerCode === customerName,
      );
      const customerInfo = {
        address: c?.address || c?.invoiceAddress || "",
        taxCode: c?.taxCode || "",
        phone: c?.phone || "",
      };
      // Guard FE: chỉ lấy chữ ký người duyệt khi báo giá đã duyệt (approved).
      // Bị từ chối (rejected) → về P.Kinh Doanh, KHÔNG hiện chữ ký.
      const laDaDuyet = chuyenTrangThaiBaoGia(bg.updateStatus) === "approved";
      const reviewerSignatureDataUrl = laDaDuyet
        ? await layChuKyReviewerDataUrl(bg.reviewerSignatureUrl)
        : null;
      setDangXemBgId(null);
      setPreviewState({
        item: item as HistoryItem,
        customerInfo,
        reviewerSignatureDataUrl,
      });
    };

    return (
      <div className="qrev-row-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="qrev-btn-icon"
          title="Xem PDF báo giá"
          disabled={dangXem}
          onClick={handleXemBaoGia}
        >
          {dangXem ? <Loader2 size={15} className="um-spin" /> : <Eye size={15} />}
        </button>
        <NutSaoChepLienKet
          url={taoUrlChiaSeBaoGia(bg.id)}
          variant="qrev"
          size={15}
        />
        <button
          className="qrev-btn-icon qrev-btn-icon--primary"
          title="Mở lại bảng báo giá"
          onClick={() => void capNhatBaoGia(bg)}
        >
          <FileEdit size={15} />
        </button>
        {bg.original?.deletable === true && (
          <button
            className="qrev-btn-icon qrev-btn-icon--danger"
            title="Xóa"
            disabled={dangXuLy}
            onClick={() => void xoaBaoGia(bg)}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="qrev-root">
      <QrevStyleInjector />

      <header className="qrev-header">
        <div className="qrev-header-left">
          <h1 className="qrev-title">
            Danh sách báo giá
            <span className="qrev-title-count"> ({ketQua.length})</span>
          </h1>
        </div>
        <div className="qrev-header-right">
          <button
            className="qrev-btn qrev-btn--ghost"
            onClick={() => void lamMoi()}
            disabled={dangTai}
          >
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </header>

      <div className="qrev-search-bar">
        <Search size={16} className="qrev-search-icon" />
        <input
          className="qrev-search-input"
          aria-label="Tìm kiếm báo giá"
          placeholder="Tìm theo tên báo giá..."
          value={tuKhoa}
          onChange={(e) => datTuKhoa(e.target.value)}
        />
        {tuKhoa && (
          <button
            className="qrev-btn-icon qrev-search-clear"
            aria-label="Xóa"
            onClick={() => datTuKhoa("")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="qrev-chips">
        {CHIP_LABELS.map((chip) => (
          <button
            key={chip.key}
            className={
              nguon === "list" && boLoc === chip.key
                ? "qrev-chip qrev-chip--active"
                : "qrev-chip"
            }
            onClick={() => chonChip(chip.key)}
          >
            {chip.label}{" "}
            <span className="qrev-chip-count">{demTheoChip[chip.key]}</span>
          </button>
        ))}
        {laNguoiDuyet && (
          <button
            className={
              nguon === "review"
                ? "qrev-chip qrev-chip--active qrev-chip--review"
                : "qrev-chip qrev-chip--review"
            }
            onClick={() => {
              datNguon("review");
              datBoLoc("all");
            }}
          >
            <Inbox size={12} /> Chờ tôi duyệt
          </button>
        )}
      </div>

      {thongBao && <div className="qrev-alert qrev-alert--ok">{thongBao}</div>}
      {loi && <div className="qrev-alert qrev-alert--err">{loi}</div>}

      <div className="qrev-table-shell">
        {dangTai ? (
          <div className="qrev-empty">
            <p>Đang tải báo giá...</p>
          </div>
        ) : ketQua.length === 0 ? (
          <div className="qrev-empty">
            <Inbox size={40} />
            <p>
              {nguon === "review"
                ? "Không có báo giá nào đang chờ duyệt."
                : "Chưa có báo giá nào."}
            </p>
            <span>
              {nguon === "review"
                ? "Báo giá sẽ xuất hiện khi nhân viên nộp duyệt."
                : "Tạo báo giá ở mục “Tạo bảng báo giá”."}
            </span>
          </div>
        ) : (
          <div className="qrev-table-wrap">
            <table className="qrev-table">
              <thead>
                <tr>
                  <th>Báo giá</th>
                  <th>Người lập</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                  <th>Duyệt</th>
                </tr>
              </thead>
              <tbody>
                {ketQua.map((bg) => {
                  const trangThai = chuyenTrangThaiBaoGia(bg.updateStatus);
                  const saleName = nguoiTaoBaoGia(bg);
                  const isExpanded = expandedId === bg.id;
                  const laCreator = bg.createdBy === nguoiDung?.id;
                  const sheets = bg.pricingSheets ?? [];
                  const phanHoi = demPhanHoiKhach(sheets);
                  const coThePhanHoi = trangThai === "approved" && laCreator;
                  return (
                    <React.Fragment key={bg.id}>
                    <tr
                      className="qrev-row"
                      onClick={() => toggleExpand(bg)}
                    >
                      <td>
                        <div className="qrev-cell-quote">
                          <button
                            className="qrev-btn-icon"
                            aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
                            title={isExpanded ? "Thu gọn" : "Mở rộng"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(bg);
                            }}
                            style={{ flexShrink: 0 }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <span className="qrev-cell-name">
                            {tenKhachHang(bg)}
                          </span>
                        </div>
                      </td>
                      <td className="qrev-cell-sale">
                        {saleName ? normalizeDisplayText(saleName) : "—"}
                      </td>
                      <td className="qrev-cell-date">
                        {dinhDangNgay(bg.updatedAt)}
                      </td>
                      <td>
                        <HuyHieuTrangThai trangThai={trangThai} />
                      </td>
                      <td>{renderHanhDong(bg, trangThai)}</td>
                      <td>
                        {trangThai === "drafted" && bg.createdBy === nguoiDung?.id && (
                          <div className="qrev-row-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="qrev-btn-icon qrev-btn-icon--primary"
                              title="Nộp duyệt"
                              disabled={dangXuLyId === bg.id}
                              onClick={() => void nopBaoGia(bg)}
                            >
                              <Send size={15} />
                            </button>
                          </div>
                        )}
                        {trangThai === "submitted" && laNguoiDuyet && (
                          <div className="qrev-row-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="qrev-btn-icon qrev-btn-icon--ok"
                              title="Duyệt"
                              disabled={dangXuLyId === bg.id}
                              onClick={() => void duyetBaoGia(bg, "approved")}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              className="qrev-btn-icon qrev-btn-icon--danger"
                              title="Từ chối"
                              disabled={dangXuLyId === bg.id}
                              onClick={() => void duyetBaoGia(bg, "rejected")}
                            >
                              <XCircle size={15} />
                            </button>
                          </div>
                        )}
                        {trangThai === "approved" && (
                          <span title="Đã duyệt" aria-label="Đã duyệt">
                            <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                          </span>
                        )}
                        {trangThai === "rejected" && (
                          <span title="Đã từ chối" aria-label="Đã từ chối">
                            <XCircle size={16} style={{ color: "#dc2626" }} />
                          </span>
                        )}

                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: "#f0f9ff" }}>
                        <td colSpan={6} style={{ padding: "12px 16px" }}>
                          {trangThai === "rejected" && bg.statusReason && (
                            <div
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "6px 10px", borderRadius: 6, marginBottom: 6,
                                background: "#fef2f2", border: "1px solid #fecaca",
                                color: "#b91c1c", fontSize: "0.75rem", fontWeight: 600,
                              }}
                            >
                              <XCircle size={14} style={{ flexShrink: 0 }} />
                              <span>Lý do bị từ chối: {bg.statusReason}</span>
                            </div>
                          )}
                          {sheets.length === 0 ? (
                            <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                              Báo giá này không có bảng tính nào.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {sheets.map((sheet) => {
                                const isPending = dangXuLyId === bg.id;
                                const canEdit = coThePhanHoi && !isPending;
                                const hienTai =
                                  sheet.hasCustomerApproved === true
                                    ? "da_duyet"
                                    : sheet.hasCustomerApproved === false
                                    ? "bo"
                                    : "cho";
                                return (
                                  <div
                                    key={sheet.id}
                                    style={{
                                      display: "flex", alignItems: "center", gap: 10,
                                      padding: "6px 10px", borderRadius: 6,
                                      background: "#fff", border: "1px solid #e2e8f0",
                                      fontSize: "0.82rem", flexWrap: "wrap",
                                    }}
                                  >
                                    <span style={{ flex: 1, minWidth: 200, fontWeight: 500 }}>
                                      {sheet.pricingSheetName || sheet.id}
                                    </span>
                                    {hienTai === "da_duyet" && (
                                      <span style={{ color: "#047857", fontWeight: 600 }}>
                                        ✅ Khách đã duyệt
                                      </span>
                                    )}
                                    {hienTai === "bo" && (
                                      <span style={{ color: "#9f1239", fontWeight: 600 }}>
                                        ❌ Khách bỏ
                                      </span>
                                    )}
                                    {hienTai === "da_duyet" && trangThai === "approved" && (
                                      <button
                                        type="button"
                                        className="qrev-btn qrev-btn--primary"
                                        style={{ fontSize: "0.74rem", padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          taoLsxTuSheet(bg, sheet);
                                        }}
                                        title="Tạo lệnh sản xuất từ sheet này"
                                      >
                                        <Factory size={13} /> Tạo LSX
                                      </button>
                                    )}
                                    {canEdit && (
                                      <div style={{ display: "flex", gap: 4 }}>
                                        {hienTai !== "da_duyet" && (
                                          <button
                                            className="qrev-btn qrev-btn--ok"
                                            style={{ fontSize: "0.74rem", padding: "3px 8px" }}
                                            disabled={isPending}
                                            onClick={() => void customerDecideSheet(bg, sheet, "duyet")}
                                          >
                                            ✓ KH Duyệt
                                          </button>
                                        )}
                                        {hienTai !== "bo" && (
                                          <button
                                            className="qrev-btn qrev-btn--danger"
                                            style={{ fontSize: "0.74rem", padding: "3px 8px" }}
                                            disabled={isPending}
                                            onClick={() => void customerDecideSheet(bg, sheet, "bo")}
                                          >
                                            ✕ KH từ chối
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              <div
                                style={{
                                  fontSize: "0.74rem", color: "var(--muted)",
                                  paddingTop: 4, borderTop: "1px dashed #e2e8f0",
                                }}
                              >
                                Tóm tắt: {phanHoi.daDuyet}/{sheets.length} đã duyệt
                                {" • "}{phanHoi.bo}/{sheets.length} khách bỏ
                                {" • "}{phanHoi.cho}/{sheets.length} chờ
                                {!coThePhanHoi && trangThai === "approved" && (
                                  <span style={{ marginLeft: 6, fontStyle: "italic" }}>
                                    (Chỉ người tạo báo giá mới có thể cập nhật phản hồi khách.)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="qrev-table-bottom-spacer" aria-hidden="true" />
          </div>
        )}
      </div>

      <NhapLyDoTruocPinModal
        open={!!nhapLyDo}
        title="Từ chối báo giá"
        message={nhapLyDo ? `Bạn có chắc muốn từ chối báo giá "${tenBaoGia(nhapLyDo.bg)}"?` : ""}
        confirmLabel="Tiếp tục"
        onConfirm={tiepTucTuChoiSauLyDo}
        onClose={() => setNhapLyDo(null)}
      />

      <NhapPinDuyetModal
        open={!!nhapPin}
        title={nhapPin?.title || ""}
        message={nhapPin?.message || ""}
        onConfirm={async (pinToken: string) => {
          if (!nhapPin) return;
          await nhapPin.onConfirm(pinToken);
        }}
        onClose={() => setNhapPin(null)}
      />

      {previewState && (
        <BaoGiaPreviewModal
          open={!!previewState}
          onClose={() => setPreviewState(null)}
          item={previewState.item}
          customerInfo={previewState.customerInfo}
          reviewerSignatureDataUrl={previewState.reviewerSignatureDataUrl}
        />
      )}
    </div>
  );
}
