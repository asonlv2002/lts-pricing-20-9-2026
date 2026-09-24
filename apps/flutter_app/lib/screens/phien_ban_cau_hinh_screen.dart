// ═══════════════════════════════════════════════════════════════════════════
// Phiên bản cấu hình (P2) — mirror web "Lịch sử phiên bản" trong TrangCauHinh.
// 7 scope: MATERIALS / PRODUCTION / PRODUCTION_UPGRADE / SURCHARGES /
// INTEREST / WASTE / PROFIT.
//  - Bootstrap: GET /price-config/latest-version → apply vào store (BE thắng
//    LS cache khi đã login — mirror taiCauHinhMoiNhatTuServer).
//  - Xem 1 bản: áp blob vào working store (mirror saoChepPhienBanDinhMuc).
//  - Lưu phiên bản: trích working store → POST /price-config (UPGRADE → PUT).
//    Chỉ hiện với PRICE_CONFIG_MANAGER (mirror chiDoc của web).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:lts_pricing/api/service_lts_client.dart';
import 'package:lts_pricing/lib/pricing_server_mapper.dart';
import '../store/app_state.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_toast.dart';

class _ScopeDinhNghia {
  final String configName;
  final String tieuDe;
  final String moTa;
  final IconData icon;
  const _ScopeDinhNghia({
    required this.configName,
    required this.tieuDe,
    required this.moTa,
    required this.icon,
  });
}

const _cacScope = <_ScopeDinhNghia>[
  _ScopeDinhNghia(
    configName: 'MATERIALS',
    tieuDe: 'Vật liệu & Zipper',
    moTa: 'Giá NVL, khổ cuộn, giá zipper',
    icon: Icons.inventory_2_rounded,
  ),
  _ScopeDinhNghia(
    configName: 'PRODUCTION',
    tieuDe: 'Chi phí sản xuất',
    moTa: 'Nhân công, cắt, ghép, trục in, mực',
    icon: Icons.factory_rounded,
  ),
  _ScopeDinhNghia(
    configName: 'PRODUCTION_UPGRADE',
    tieuDe: 'Sản xuất nâng cao (CPSX)',
    moTa: 'Điện / nhân công / mực theo khung nâng cao',
    icon: Icons.bolt_rounded,
  ),
  _ScopeDinhNghia(
    configName: 'SURCHARGES',
    tieuDe: 'Phụ thu',
    moTa: 'Băng keo, quai, thùng, vận chuyển',
    icon: Icons.add_shopping_cart_rounded,
  ),
  _ScopeDinhNghia(
    configName: 'INTEREST',
    tieuDe: 'Lãi vay',
    moTa: 'Lãi suất, hạn thanh toán',
    icon: Icons.percent_rounded,
  ),
  _ScopeDinhNghia(
    configName: 'WASTE',
    tieuDe: 'Hao hụt',
    moTa: 'Hao hụt in / ghép / cắt',
    icon: Icons.delete_sweep_rounded,
  ),
  _ScopeDinhNghia(
    configName: 'PROFIT',
    tieuDe: 'Bảng lợi nhuận',
    moTa: 'Ngưỡng giá vốn & cột LN',
    icon: Icons.trending_up_rounded,
  ),
];

class PhienBanCauHinhScreen extends StatefulWidget {
  const PhienBanCauHinhScreen({super.key});
  @override
  State<PhienBanCauHinhScreen> createState() => _PhienBanCauHinhScreenState();
}

class _PhienBanCauHinhScreenState extends State<PhienBanCauHinhScreen> {
  final _dangMoLichSu = <String>{};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final s = context.read<AppState>();
      if (s.isAuthenticated && s.phienBanMoiNhat.isEmpty && !s.dangTaiCauHinh) {
        s.taiCauHinhTuServer();
      }
    });
  }

  bool get _laQuanLy =>
      context.read<AppState>().nguoiDungHienTai?.coQuyen('PRICE_CONFIG_MANAGER') ??
      false;

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final p = LtsT.of(context);

    if (!s.isAuthenticated) {
      return ListView(
        padding: const EdgeInsets.all(32),
        children: [
          Icon(Icons.lock_outline_rounded, size: 48, color: p.muted),
          const SizedBox(height: 16),
          Text(
            'Cần đăng nhập để xem và lưu phiên bản cấu hình.',
            textAlign: TextAlign.center,
            style: TextStyle(color: p.muted),
          ),
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: () => s.taiCauHinhTuServer(force: true),
      child: ListView(
        // Nội dung ít hơn viewport vẫn kéo-overscroll được để pull-to-refresh.
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          if (s.dangTaiCauHinh) ...[
            const LinearProgressIndicator(minHeight: 2),
            const SizedBox(height: 12),
          ],
          if (s.loiCauHinh != null) ...[
            Text(
              'Lỗi tải cấu hình: ${s.loiCauHinh}',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            const SizedBox(height: 12),
          ],
          Text(
            'Bản mới nhất theo server — tự áp vào app khi đăng nhập. '
            'Bản lưu mới sẽ đồng bộ cho mọi thiết bị dùng chung tài khoản.',
            style: TextStyle(fontSize: 13, color: p.muted),
          ),
          const SizedBox(height: 16),
          for (final scope in _cacScope) ...[
            _ScopeCard(
              scope: scope,
              laQuanLy: _laQuanLy,
              dangMoLichSu: _dangMoLichSu.contains(scope.configName),
              onToggleLichSu: () {
                setState(() {
                  if (!_dangMoLichSu.remove(scope.configName)) {
                    _dangMoLichSu.add(scope.configName);
                  }
                });
                if (_dangMoLichSu.contains(scope.configName)) {
                  s.taiLichSuPhienBanCauHinh(scope.configName);
                }
              },
              onLuu: () => _luuPhienBan(scope),
              onXem: (pc) => _xemPhienBan(scope, pc),
              onXoa: (pc) => _xoaPhienBan(scope, pc),
            ),
            const SizedBox(height: 14),
          ],
        ],
      ),
    );
  }

  Future<void> _xemPhienBan(_ScopeDinhNghia scope, PriceConfigApi pc) async {
    final tt = thongTinPhienBanTu(pc);
    // Áp bản cũ đè working store là hành động phá vở — web dùng preview
    // readonly, Flutter chưa có nên bắt buộc xác nhận trước.
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Áp phiên bản v${pc.version} vào app?'),
        content: Text(
          'Cấu hình ${scope.tieuDe.toLowerCase()} hiện tại sẽ bị thay thế bằng '
          'phiên bản ${tt.name.isNotEmpty ? '"${tt.name}"' : 'v${pc.version}'} '
          '(hiệu lực ${tt.effectiveFrom}, tạo ${Fmt.dateTime(pc.createdAt)}).\n\n'
          'Mọi chỉnh sửa chưa lưu sẽ mất. Có thể kéo-tải-lại màn này để quay về '
          'bản mới nhất trên server.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Áp vào app'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    final s = context.read<AppState>();
    await s.xemPhienBanCauHinh(pc);
    if (!mounted) return;
    LtsToast.show(
      context,
      'Đã áp phiên bản ${tt.name.isNotEmpty ? '"${tt.name}"' : 'v${pc.version}'} '
      'của ${scope.tieuDe.toLowerCase()} vào app.',
      type: LtsToastType.success,
      duration: const Duration(seconds: 2),
    );
  }

  Future<void> _xoaPhienBan(_ScopeDinhNghia scope, PriceConfigApi pc) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Xóa phiên bản v${pc.version}?'),
        content: Text(
          'Phiên bản "${thongTinPhienBanTu(pc).name}" của ${scope.tieuDe.toLowerCase()} '
          'sẽ bị xóa khỏi server. Không thể hoàn tác.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final s = context.read<AppState>();
    try {
      await s.xoaPhienBanCauHinh(pc.id, scope.configName);
      if (!mounted) return;
      LtsToast.show(context, 'Đã xóa phiên bản.',
          type: LtsToastType.success, duration: const Duration(seconds: 2));
    } on LoiServiceLts catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.message, type: LtsToastType.error);
    } catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.toString(), type: LtsToastType.error);
    }
  }

  Future<void> _luuPhienBan(_ScopeDinhNghia scope) async {
    final s = context.read<AppState>();
    final thangHienTai = DateTime.now().toIso8601String().substring(0, 7);
    final tenCtrl = TextEditingController();
    final thangCtrl = TextEditingController(text: thangHienTai);

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Lưu phiên bản ${scope.tieuDe}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Chụp lại trạng thái hiện tại của ${scope.tieuDe.toLowerCase()} '
              'trong app thành 1 phiên bản mới trên server.',
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: tenCtrl,
              decoration: const InputDecoration(
                labelText: 'Tên phiên bản (tuỳ chọn)',
                hintText: 'vd: Cập nhật giá tháng 9',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: thangCtrl,
              decoration: const InputDecoration(
                labelText: 'Tháng hiệu lực (yyyy-MM)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    final ten = tenCtrl.text;
    final thang = thangCtrl.text.trim();
    tenCtrl.dispose();
    thangCtrl.dispose();
    if (ok != true) return;

    final hopLe = RegExp(r'^\d{4}-\d{2}$').hasMatch(thang);
    if (!hopLe) {
      LtsToast.show(context, 'Tháng hiệu lực phải dạng yyyy-MM.',
          type: LtsToastType.error);
      return;
    }

    try {
      // luuPhienBanCauHinh đã tự reload lịch sử + chốt working = bản vừa lưu
      // (không gọi taiLichSuPhienBanCauHinh thêm lần nữa — tránh double fetch).
      await s.luuPhienBanCauHinh(
        configName: scope.configName,
        name: ten,
        effectiveFrom: thang,
      );
      if (!mounted) return;
      LtsToast.show(
        context,
        'Đã lưu phiên bản ${scope.tieuDe.toLowerCase()} lên server.',
        type: LtsToastType.success,
        duration: const Duration(seconds: 2),
      );
      setState(() => _dangMoLichSu.add(scope.configName));
    } on LoiServiceLts catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.message, type: LtsToastType.error);
    } catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.toString(), type: LtsToastType.error);
    }
  }
}

// ── Card 1 scope ─────────────────────────────────────────────────────────────
class _ScopeCard extends StatelessWidget {
  final _ScopeDinhNghia scope;
  final bool laQuanLy;
  final bool dangMoLichSu;
  final VoidCallback onToggleLichSu;
  final VoidCallback onLuu;
  final void Function(PriceConfigApi) onXem;
  final void Function(PriceConfigApi) onXoa;

  const _ScopeCard({
    required this.scope,
    required this.laQuanLy,
    required this.dangMoLichSu,
    required this.onToggleLichSu,
    required this.onLuu,
    required this.onXem,
    required this.onXoa,
  });

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final p = LtsT.of(context);
    final latest = s.phienBanMoiNhat[scope.configName];
    final lichSu = s.lichSuPhienBan[scope.configName] ?? const <PriceConfigApi>[];

    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: p.border),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(scope.icon, size: 20, color: p.accent),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(scope.tieuDe,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700)),
                    Text(scope.moTa,
                        style:
                            TextStyle(fontSize: 12, color: p.muted)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (latest != null) ...[
            Text(
              'Bản mới nhất: v${latest.version}'
              '${thongTinPhienBanTu(latest).name.isNotEmpty ? ' · ${thongTinPhienBanTu(latest).name}' : ''}'
              ' · hiệu lực ${thongTinPhienBanTu(latest).effectiveFrom}'
              ' · ${Fmt.dateTime(latest.createdAt)}',
              style: TextStyle(fontSize: 12, color: p.muted),
            ),
          ] else ...[
            Text('Chưa có phiên bản trên server.',
                style: TextStyle(fontSize: 12, color: p.muted)),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: onToggleLichSu,
                icon: Icon(dangMoLichSu
                    ? Icons.expand_less_rounded
                    : Icons.history_rounded),
                label: Text(dangMoLichSu ? 'Đóng' : 'Lịch sử'),
              ),
              const SizedBox(width: 10),
              if (laQuanLy)
                FilledButton.icon(
                  onPressed: s.dangLuuPhienBan ? null : onLuu,
                  icon: s.dangLuuPhienBan
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save_rounded),
                  label: Text(s.dangLuuPhienBan ? 'Đang lưu...' : 'Lưu phiên bản'),
                ),
            ],
          ),
          if (dangMoLichSu) ...[
            const SizedBox(height: 10),
            if (s.dangTaiLichSuPhienBan(scope.configName) && lichSu.isEmpty)
              const Padding(
                padding: EdgeInsets.all(8),
                child: LinearProgressIndicator(minHeight: 2),
              )
            else if (lichSu.isEmpty)
              Padding(
                padding: const EdgeInsets.all(8),
                child: Text('Chưa có lịch sử phiên bản.',
                    style: TextStyle(fontSize: 12, color: p.muted)),
              )
            else
              for (final pc in lichSu)
                _PhienBanRow(
                  pc: pc,
                  laQuanLy: laQuanLy,
                  laMoiNhat: latest != null && pc.id == latest.id,
                  onXem: () => onXem(pc),
                  onXoa: () => onXoa(pc),
                ),
          ],
        ],
      ),
    );
  }
}

class _PhienBanRow extends StatelessWidget {
  final PriceConfigApi pc;
  final bool laQuanLy;
  final bool laMoiNhat;
  final VoidCallback onXem;
  final VoidCallback onXoa;

  const _PhienBanRow({
    required this.pc,
    required this.laQuanLy,
    required this.laMoiNhat,
    required this.onXem,
    required this.onXoa,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final tt = thongTinPhienBanTu(pc);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('v${pc.version}',
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w700)),
                    if (laMoiNhat) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: p.accent.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('MỚI NHẤT',
                            style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: p.accent)),
                      ),
                    ],
                    if (tt.name.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(tt.name,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13)),
                      ),
                    ],
                  ],
                ),
                Text(
                  'Hiệu lực ${tt.effectiveFrom} · ${Fmt.dateTime(pc.createdAt)}'
                  '${pc.createdBy != null && pc.createdBy!.isNotEmpty ? ' · ${pc.createdBy}' : ''}',
                  style: TextStyle(fontSize: 11, color: p.muted),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: onXem,
            child: const Text('Áp vào app'),
          ),
          if (laQuanLy)
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded, size: 20),
              tooltip: 'Xóa phiên bản',
              onPressed: onXoa,
            ),
        ],
      ),
    );
  }
}
