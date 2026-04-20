// giao_dien/thanh_phan/thanh_ben.dart — Sidebar (đồng bộ AppShell.tsx + .lts-sidebar)
// Khớp:
//   .lts-sidebar          → width 240, background #0F172A
//   .lts-sidebar--collapsed → width 72
//   .lts-sidebar-logo     → height 60, border-bottom alpha 0.06
//   .lts-nav-item.active  → background var(--accent), shadow 0 4px 14px alpha 0.4
//   .lts-role-label       → uppercase, letter-spacing 0.1em
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../khung_chinh/chu_de.dart';

// ─── Cấu hình menu items (đồng bộ MENU_ITEMS trong AppShell.tsx) ─────────────
class _MenuCauHinh {
  final String id;
  final String nhan;
  final IconData bieu;
  final List<VaiTro> roles;
  const _MenuCauHinh({required this.id, required this.nhan, required this.bieu, required this.roles});
}

const _danhSachMenu = [
  _MenuCauHinh(id: 'mayTinh',    nhan: 'Tính giá Sản phẩm', bieu: Icons.calculate_outlined,        roles: [VaiTro.admin, VaiTro.sale]),
  _MenuCauHinh(id: 'baoGia',     nhan: 'Danh sách Báo giá', bieu: Icons.description_outlined,      roles: [VaiTro.admin, VaiTro.sale]),
  _MenuCauHinh(id: 'lichSu',     nhan: 'Lịch sử tính giá',  bieu: Icons.history,                   roles: [VaiTro.admin, VaiTro.sale]),
  _MenuCauHinh(id: 'lenhSX',     nhan: 'Lệnh Sản Xuất',     bieu: Icons.assignment_outlined,       roles: [VaiTro.admin, VaiTro.purchase]),
  _MenuCauHinh(id: 'bangDinhMuc',nhan: 'Bảng định mức',     bieu: Icons.factory_outlined,          roles: [VaiTro.admin, VaiTro.purchase]),
  _MenuCauHinh(id: 'khachHang',  nhan: 'Khách hàng (CRM)',  bieu: Icons.people_outline,            roles: [VaiTro.admin, VaiTro.sale]),
  _MenuCauHinh(id: 'seller',     nhan: 'Quản lý Seller',    bieu: Icons.business_center_outlined,  roles: [VaiTro.admin]),
  _MenuCauHinh(id: 'taiKhoan',   nhan: 'Tài khoản hệ thống',bieu: Icons.manage_accounts_outlined,  roles: [VaiTro.admin]),
  _MenuCauHinh(id: 'caiDat',     nhan: 'Cài đặt hệ thống',  bieu: Icons.settings_outlined,         roles: [VaiTro.admin]),
];

// ─── Sidebar chính ────────────────────────────────────────────────────────────
class ThanhBen extends StatelessWidget {
  final bool daMo;
  const ThanhBen({super.key, required this.daMo});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final menuHienThi = _danhSachMenu.where((m) => m.roles.contains(kho.vaiTro)).toList();
    final mauNen = ChuDe.mauSidebarTheo(toi);

    return AnimatedContainer(
      duration: ChuDe.thoiGianAnim,
      curve: Curves.easeInOut,
      width: daMo ? ChuDe.chieuRongSidebar : ChuDe.chieuRongSidebarThuGon,
      decoration: BoxDecoration(
        color: mauNen,
        border: Border(right: BorderSide(color: Colors.white.withValues(alpha: 0.04))),
      ),
      child: Column(
        children: [
          // ── Logo + nút toggle (.lts-sidebar-logo) ─────────────────────────
          Container(
            height: ChuDe.chieuCaoTopbar, // 60 — bằng topbar để hai phần khít nhau
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: ChuDe.mauVienSidebar)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (daMo)
                  // .lts-sidebar-brand : "LTS" trắng + "PRICING" tím nhạt
                  RichText(
                    text: const TextSpan(
                      text: 'LTS',
                      style: TextStyle(
                        color: ChuDe.mauChuSidebar,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                      children: [
                        TextSpan(
                          text: 'PRICING',
                          style: TextStyle(
                            color: ChuDe.mauTrucToi, // .lts-brand-accent #818CF8
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  // .lts-sidebar-brand-mini
                  const Text(
                    'LTS',
                    style: TextStyle(
                      color: ChuDe.mauChuSidebar,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                IconButton(
                  // .lts-sidebar-toggle
                  icon: Icon(daMo ? Icons.menu_open : Icons.menu, color: ChuDe.mauNhatSidebar, size: 20),
                  onPressed: () => kho.doiSidebar(!daMo),
                  tooltip: daMo ? 'Thu gọn menu' : 'Mở menu',
                  hoverColor: Colors.white.withValues(alpha: 0.07),
                  padding: const EdgeInsets.all(8),
                  constraints: const BoxConstraints(),
                  splashRadius: 18,
                ),
              ],
            ),
          ),

          // ── Nav items (.lts-sidebar-nav) ──────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              children: menuHienThi
                  .map((m) => _NavItem(
                        id: m.id,
                        nhan: m.nhan,
                        bieu: m.bieu,
                        kho: kho,
                        daMo: daMo,
                      ))
                  .toList(),
            ),
          ),

          // ── Footer: Role selector (.lts-sidebar-footer) ───────────────────
          _RoleSelector(kho: kho, daMo: daMo),
        ],
      ),
    );
  }
}

// ─── Nav item (.lts-nav-item) ────────────────────────────────────────────────
class _NavItem extends StatefulWidget {
  final String id;
  final String nhan;
  final IconData bieu;
  final KhoChinhLuuTru kho;
  final bool daMo;
  const _NavItem({required this.id, required this.nhan, required this.bieu, required this.kho, required this.daMo});

  @override
  State<_NavItem> createState() => _NavItemState();
}

class _NavItemState extends State<_NavItem> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final active = widget.kho.moduleDangXem == widget.id;

    // Màu nền: active = accent · hover = white 6% · default = transparent
    final Color mauNen = active
        ? ChuDe.mauTrucSang
        : (_hover ? Colors.white.withValues(alpha: 0.06) : Colors.transparent);
    // Màu chữ/icon: active = trắng · hover = #E2E8F0 · default = #64748B
    final Color mauChu = active
        ? Colors.white
        : (_hover ? ChuDe.mauChuToi : ChuDe.mauNhatSidebar);

    return Padding(
      padding: const EdgeInsets.only(bottom: 3),
      child: MouseRegion(
        onEnter: (_) => setState(() => _hover = true),
        onExit: (_) => setState(() => _hover = false),
        cursor: SystemMouseCursors.click,
        child: Tooltip(
          message: widget.daMo ? '' : widget.nhan,
          preferBelow: false,
          child: GestureDetector(
            onTap: () => widget.kho.doiModule(widget.id),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: mauNen,
                borderRadius: BorderRadius.circular(10),
                boxShadow: active
                    ? [
                        BoxShadow(
                          color: ChuDe.mauTrucSang.withValues(alpha: 0.40),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : const [],
              ),
              child: Row(
                children: [
                  Icon(widget.bieu, size: 20, color: mauChu),
                  if (widget.daMo) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        widget.nhan,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                          color: mauChu,
                        ),
                      ),
                    ),
                    // Chevron khi active (.lts-nav-chevron)
                    if (active)
                      Icon(Icons.chevron_right, size: 14, color: Colors.white.withValues(alpha: 0.7)),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Role selector footer (.lts-sidebar-footer + .lts-role-select) ──────────
class _RoleSelector extends StatelessWidget {
  final KhoChinhLuuTru kho;
  final bool daMo;
  const _RoleSelector({required this.kho, required this.daMo});

  @override
  Widget build(BuildContext context) {
    final vt = kho.vaiTro;
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 12, 8, 16),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: ChuDe.mauVienSidebar)),
      ),
      child: daMo
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // .lts-role-label — uppercase, letter-spacing 0.1em
                const Padding(
                  padding: EdgeInsets.only(left: 4, bottom: 6),
                  child: Text(
                    'GÓC NHÌN / PHÂN QUYỀN',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: ChuDe.mauNhanNhomSidebar,
                    ),
                  ),
                ),
                // .lts-role-select
                PopupMenuButton<VaiTro>(
                  onSelected: kho.doiVaiTro,
                  color: const Color(0xFF1E293B),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                    child: Row(
                      children: [
                        Text(vt.bieu, style: const TextStyle(fontSize: 14)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            vt.ten,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: ChuDe.mauChuToi,
                            ),
                          ),
                        ),
                        Icon(Icons.expand_less, size: 14, color: Colors.white.withValues(alpha: 0.4)),
                      ],
                    ),
                  ),
                  itemBuilder: (_) => VaiTro.values
                      .map((v) => PopupMenuItem(
                            value: v,
                            child: Row(
                              children: [
                                Text(v.bieu, style: const TextStyle(fontSize: 14)),
                                const SizedBox(width: 8),
                                Text(v.ten, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                if (v == vt) ...[
                                  const Spacer(),
                                  const Icon(Icons.check, size: 14, color: ChuDe.mauTrucSang),
                                ],
                              ],
                            ),
                          ))
                      .toList(),
                ),
              ],
            )
          : Tooltip(
              message: '${vt.bieu} ${vt.ten}',
              child: Center(
                child: Text(vt.bieu, style: const TextStyle(fontSize: 16)),
              ),
            ),
    );
  }
}
