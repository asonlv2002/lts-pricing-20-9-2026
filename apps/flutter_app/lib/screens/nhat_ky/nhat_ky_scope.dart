// ═══════════════════════════════════════════════════════════════════════════
// nhat_ky_scope — Cấu hình 4 phạm vi của màn Nhật ký thao tác, mirror 4 menu
// `nhat-ky-*` của web (ModuleNhatKy.tsx `auditLog` useMemo + `chiHienGiaTriMoi`
// + CustomerAuditTab của ModuleKhachHang.tsx):
//
//   pricing_quote  → nhat-ky-tinh-gia   : history + quote + order, chỉ giá trị mới
//   pricing_config → nhat-ky-cau-hinh   : config,                   chỉ giá trị mới
//   customers      → nhat-ky-khach-hang : customer,                 summary card
//   system         → nhat-ky-he-thong   : config + permission,      before/after
// ignore_for_file: constant_identifier_names
// ═══════════════════════════════════════════════════════════════════════════
import 'package:lts_pricing/lib/audit_models.dart';
import 'package:lts_pricing/lib/nhat_ky_loc.dart';

enum PhamViNhatKy { tinhGia, cauHinh, khachHang, heThong }

class CauHinhPhamVi {
  final String tieuDe;
  final String emptyText;
  final String emptySub;
  final Set<TargetType>? targetTypes;
  final bool chiHienGiaTriMoi;
  final bool kieuKhachHang;
  final KhoangThoiGian khoangMacDinh;
  const CauHinhPhamVi({
    required this.tieuDe,
    required this.emptyText,
    required this.emptySub,
    this.targetTypes,
    this.chiHienGiaTriMoi = false,
    this.kieuKhachHang = false,
    this.khoangMacDinh = KhoangThoiGian.today,
  });
}

const Map<PhamViNhatKy, CauHinhPhamVi> CAU_HINH_PHAM_VI = {
  PhamViNhatKy.tinhGia: CauHinhPhamVi(
    tieuDe: 'Nhật ký thao tác',
    emptyText: 'Không có thao tác nào trong khoảng thời gian này',
    emptySub: '',
    targetTypes: {
      TargetType.history,
      TargetType.quote,
      TargetType.order,
    },
    chiHienGiaTriMoi: true,
  ),
  PhamViNhatKy.cauHinh: CauHinhPhamVi(
    tieuDe: 'Nhật ký thao tác',
    emptyText: 'Chưa có nhật ký cấu hình tính giá nào được ghi nhận',
    emptySub: 'Các thay đổi cấu hình sẽ được ghi lại tại đây',
    targetTypes: {TargetType.config},
    chiHienGiaTriMoi: true,
  ),
  PhamViNhatKy.khachHang: CauHinhPhamVi(
    tieuDe: 'Nhật ký khách hàng',
    emptyText: 'Chưa có nhật ký thao tác',
    emptySub: 'Các thao tác trên khách hàng sẽ được ghi lại tại đây',
    targetTypes: {TargetType.customer},
    kieuKhachHang: true,
    khoangMacDinh: KhoangThoiGian.days7,
  ),
  PhamViNhatKy.heThong: CauHinhPhamVi(
    tieuDe: 'Nhật ký hệ thống',
    emptyText: 'Không có thao tác nào trong khoảng thời gian này',
    emptySub: '',
    targetTypes: {TargetType.config, TargetType.permission},
  ),
};
