// giao_dien/thanh_phan/thanh_ben.dart — Sidebar (giống AppShell.tsx)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../khung_chinh/chu_de.dart';

// ─── Cấu hình menu items (giống MENU_ITEMS trong AppShell.tsx) ────────────────
class _MenuCauHinh {
  final String id;
  final String nhan;
  final IconData bieu;
  final List<VaiTro> roles;
  const _MenuCauHinh({required this.id, required this.nhan, required this.bieu, required this.roles});
}

const _danhSachMenu = [
  _MenuCauHinh(id: 'mayTinh',    nhan: 'Tính giá Sản phẩm', bieu: Icons.calculate_outlined,  roles: [VaiTro.admin, VaiTro.sale]),
  _MenuCauHinh(id: 'baoGia',     nhan: 'Danh sách Báo giá',  bieu: Icons.description_outlined, roles: [VaiTro.admin, VaiTro.sale]),
  _MenuCauHinh(id: 'lichSu',     nhan: 'Lịch sử tính giá',   bieu: Icons.history,              roles: [VaiTro.admin, VaiTro.sale]),
  _MenuCauHinh(id: 'lenhSX',     nhan: 'Lệnh Sản Xuất',      bieu: Icons.assignment_outlined,  roles: [VaiTro.admin, VaiTro.purchase]),
  _MenuCauHinh(id: 'bangDinhMuc',nhan: 'Bảng định mức',       bieu: Icons.factory_outlined,     roles: [VaiTro.admin, VaiTro.purchase]),
  _MenuCauHinh(id: 'khachHang',  nhan: 'Khách hàng (CRM)',    bieu: Icons.people_outline,       roles: [VaiTro.admin, VaiTro.sale]),
  _MenuCauHinh(id: 'seller',     nhan: 'Quản lý Seller',      bieu: Icons.business_center_outlined, roles: [VaiTro.admin]),
  _MenuCauHinh(id: 'taiKhoan',   nhan: 'Tài khoản hệ thống', bieu: Icons.manage_accounts_outlined, roles: [VaiTro.admin]),
  _MenuCauHinh(id: 'caiDat',     nhan: 'Cài đặt hệ thống',   bieu: Icons.settings_outlined,    roles: [VaiTro.admin]),
];

// ─── Sidebar chính ────────────────────────────────────────────────────────────
class ThanhBen extends StatelessWidget {
  final bool daMo;
  const ThanhBen({super.key, required this.daMo});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final menuHienThi = _danhSachMenu.where((m) => m.roles.contains(kho.vaiTro)).toList();

    return AnimatedContainer(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeInOut,
      width: daMo ? 240 : 72,
      color: ChuDe.mauSidebar,
      child: Column(
        children: [
          // ── Logo + toggle ──────────────────────────────────────────────────
          Container(
            height: 60,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.white.withAlpha(15))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (daMo)
                  RichText(text: const TextSpan(
                    text: 'LTS',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 0.03),
                    children: [TextSpan(text: 'PRICING', style: TextStyle(color: ChuDe.mauTrucToi, fontSize: 18))],
                  ))
                else
                  const Text('LTS', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800)),
                IconButton(
                  icon: Icon(daMo ? Icons.menu : Icons.menu_open, color: Colors.white54, size: 20),
                  onPressed: () => kho.doiSidebar(!daMo),
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
          ),

          // ── Nav items ─────────────────────────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(8),
              children: menuHienThi.map((m) => _NavItem(
                id: m.id,
                nhan: m.nhan,
                bieu: m.bieu,
                kho: kho,
                daMo: daMo,
              )).toList(),
            ),
          ),

          // ── Footer: Role selector ──────────────────────────────────────────
          _RoleSelector(kho: kho, daMo: daMo),
        ],
      ),
    );
  }
}

// ─── Nav item ─────────────────────────────────────────────────────────────────
class _NavItem extends StatelessWidget {
  final String id;
  final String nhan;
  final IconData bieu;
  final KhoChinhLuuTru kho;
  final bool daMo;
  const _NavItem({required this.id, required this.nhan, required this.bieu, required this.kho, required this.daMo});

  @override
  Widget build(BuildContext context) {
    final active = kho.moduleDangXem == id;
    return Container(
      margin: const EdgeInsets.only(bottom: 3),
      child: Tooltip(
        message: daMo ? '' : nhan,
        preferBelow: false,
        child: InkWell(
          onTap: () => kho.doiModule(id),
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: active ? ChuDe.mauTrucSang : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              boxShadow: active
                  ? [BoxShadow(color: ChuDe.mauTrucSang.withAlpha(100), blurRadius: 14, offset: const Offset(0, 4))]
                  : [],
            ),
            child: Row(
              children: [
                Icon(bieu, size: 20, color: active ? Colors.white : Colors.white54),
                if (daMo) ...[
                  const SizedBox(width: 10),
                  Expanded(child: Text(nhan, style: TextStyle(
                    fontSize: 13,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    color: active ? Colors.white : Colors.white54,
                  ))),
                  if (active)
                    const Icon(Icons.chevron_right, size: 14, color: Colors.white54),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Role selector footer ─────────────────────────────────────────────────────
class _RoleSelector extends StatelessWidget {
  final KhoChinhLuuTru kho;
  final bool daMo;
  const _RoleSelector({required this.kho, required this.daMo});

  @override
  Widget build(BuildContext context) {
    final vt = kho.vaiTro;
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.white.withAlpha(15))),
      ),
      child: daMo
          ? PopupMenuButton<VaiTro>(
              onSelected: kho.doiVaiTro,
              color: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  Text(vt.bieu, style: const TextStyle(fontSize: 14)),
                  const SizedBox(width: 8),
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(vt.ten, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                    ],
                  )),
                  const Icon(Icons.expand_less, size: 14, color: Colors.white38),
                ]),
              ),
              itemBuilder: (_) => VaiTro.values.map((v) => PopupMenuItem(
                value: v,
                child: Row(children: [
                  Text(v.bieu, style: const TextStyle(fontSize: 14)),
                  const SizedBox(width: 8),
                  Text(v.ten, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                  if (v == vt) ...[
                    const Spacer(),
                    const Icon(Icons.check, size: 14, color: Color(0xFF4F46E5)),
                  ],
                ]),
              )).toList(),
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
