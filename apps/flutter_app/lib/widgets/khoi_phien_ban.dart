// ═══════════════════════════════════════════════════════════════════════════
// KhoiPhienBan — khối "Phiên bản" nhúng inline trong từng mục cấu hình,
// mirror `KhoiPhienBan({ scope })` của web (TrangCauHinh.tsx:79):
//   - Hiệu lực từ (month) + nút Lưu (gate PRICE_CONFIG_MANAGER).
//   - Dòng tóm tắt "Phiên bản đã lưu: N" + mở danh sách.
//   - Mỗi bản: v{version} + tên + hiệu lực + ngày tạo + "Áp vào app" + Xóa.
// Gọi API store sẵn có (taiLichSuPhienBanCauHinh / luuPhienBanCauHinh /
// xemPhienBanCauHinh / xoaPhienBanCauHinh).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:lts_pricing/api/service_lts_client.dart';
import 'package:lts_pricing/lib/pricing_server_mapper.dart';
import '../store/app_state.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'lts/lts_toast.dart';

class KhoiPhienBan extends StatefulWidget {
  /// configName BE: MATERIALS / PRODUCTION / PRODUCTION_UPGRADE /
  /// SURCHARGES / INTEREST / WASTE / PROFIT.
  final String configName;

  /// Nhãn hiển thị của scope (vd "Vật liệu & Zipper") — dùng trong tiêu đề
  /// và nội dung xác nhận.
  final String nhanScope;

  const KhoiPhienBan({
    super.key,
    required this.configName,
    required this.nhanScope,
  });

  @override
  State<KhoiPhienBan> createState() => _KhoiPhienBanState();
}

class _KhoiPhienBanState extends State<KhoiPhienBan> {
  bool _mo = false;
  bool _moDanhSach = false;
  late final TextEditingController _thangCtrl;

  @override
  void initState() {
    super.initState();
    _thangCtrl = TextEditingController(
      text: DateTime.now().toIso8601String().substring(0, 7),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final s = context.read<AppState>();
      if (s.isAuthenticated) {
        s.taiLichSuPhienBanCauHinh(widget.configName);
      }
    });
  }

  @override
  void dispose() {
    _thangCtrl.dispose();
    super.dispose();
  }

  bool get _laQuanLy =>
      context.read<AppState>().nguoiDungHienTai?.coQuyen('PRICE_CONFIG_MANAGER') ??
      false;

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final p = LtsT.of(context);
    if (!s.isAuthenticated) return const SizedBox.shrink();

    final latest = s.phienBanMoiNhat[widget.configName];
    final lichSu =
        s.lichSuPhienBan[widget.configName] ?? const <PriceConfigApi>[];

    return Container(
      margin: const EdgeInsets.only(top: 14),
      decoration: BoxDecoration(
        color: p.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => setState(() => _mo = !_mo),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
              child: Row(
                children: [
                  Icon(Icons.history_toggle_off_rounded,
                      size: 18, color: p.accent),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Phiên bản — ${widget.nhanScope}',
                        style: const TextStyle(
                            fontSize: 13.5, fontWeight: FontWeight.w700)),
                  ),
                  Icon(_mo ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                      size: 20, color: p.muted),
                ],
              ),
            ),
          ),
          if (_mo) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _thangCtrl,
                          enabled: !s.dangLuuPhienBan,
                          decoration: const InputDecoration(
                            isDense: true,
                            labelText: 'Hiệu lực từ (yyyy-MM)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      if (_laQuanLy)
                        FilledButton.icon(
                          onPressed: s.dangLuuPhienBan ? null : _luu,
                          icon: s.dangLuuPhienBan
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2))
                              : const Icon(Icons.save_rounded, size: 18),
                          label: Text(
                              s.dangLuuPhienBan ? 'Đang lưu...' : 'Lưu'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    latest != null
                        ? 'Bản mới nhất: v${latest.version}'
                            '${thongTinPhienBanTu(latest).name.isNotEmpty ? ' · ${thongTinPhienBanTu(latest).name}' : ''}'
                            ' · hiệu lực ${thongTinPhienBanTu(latest).effectiveFrom}'
                        : 'Chưa có phiên bản trên server.',
                    style: TextStyle(fontSize: 12, color: p.muted),
                  ),
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: () {
                      setState(() => _moDanhSach = !_moDanhSach);
                      if (_moDanhSach) {
                        s.taiLichSuPhienBanCauHinh(widget.configName);
                      }
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Phiên bản đã lưu: '
                              '${s.dangTaiLichSuPhienBan(widget.configName) ? 'Đang tải...' : lichSu.length}',
                              style: const TextStyle(
                                  fontSize: 12.5, fontWeight: FontWeight.w600),
                            ),
                          ),
                          Text(
                            _moDanhSach
                                ? 'Đóng'
                                : (lichSu.isEmpty
                                    ? 'Chưa có phiên bản nào'
                                    : 'Xem ›'),
                            style: TextStyle(fontSize: 12, color: p.accent),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_moDanhSach) ...[
                    if (s.dangTaiLichSuPhienBan(widget.configName) &&
                        lichSu.isEmpty)
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
                          laQuanLy: _laQuanLy,
                          laMoiNhat: latest != null && pc.id == latest.id,
                          onXem: () => _xem(pc),
                          onXoa: () => _xoa(pc),
                        ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _luu() async {
    final s = context.read<AppState>();
    final thang = _thangCtrl.text.trim();
    if (!RegExp(r'^\d{4}-\d{2}$').hasMatch(thang)) {
      LtsToast.show(context, 'Tháng hiệu lực phải dạng yyyy-MM.',
          type: LtsToastType.error);
      return;
    }
    try {
      await s.luuPhienBanCauHinh(
        configName: widget.configName,
        effectiveFrom: thang,
      );
      if (!mounted) return;
      LtsToast.show(
        context,
        'Đã lưu phiên bản ${widget.nhanScope.toLowerCase()} lên server.',
        type: LtsToastType.success,
        duration: const Duration(seconds: 2),
      );
      setState(() => _moDanhSach = true);
    } on LoiServiceLts catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.message, type: LtsToastType.error);
    } catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.toString(), type: LtsToastType.error);
    }
  }

  Future<void> _xem(PriceConfigApi pc) async {
    final tt = thongTinPhienBanTu(pc);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Áp phiên bản v${pc.version} vào app?'),
        content: Text(
          'Cấu hình ${widget.nhanScope.toLowerCase()} hiện tại sẽ bị thay thế bằng '
          'phiên bản ${tt.name.isNotEmpty ? '"${tt.name}"' : 'v${pc.version}'} '
          '(hiệu lực ${tt.effectiveFrom}, tạo ${Fmt.dateTime(pc.createdAt)}).\n\n'
          'Mọi chỉnh sửa chưa lưu sẽ mất.',
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
      'của ${widget.nhanScope.toLowerCase()} vào app.',
      type: LtsToastType.success,
      duration: const Duration(seconds: 2),
    );
  }

  Future<void> _xoa(PriceConfigApi pc) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Xóa phiên bản v${pc.version}?'),
        content: Text(
          'Phiên bản "${thongTinPhienBanTu(pc).name}" của ${widget.nhanScope.toLowerCase()} '
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
      await s.xoaPhienBanCauHinh(pc.id, widget.configName);
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
