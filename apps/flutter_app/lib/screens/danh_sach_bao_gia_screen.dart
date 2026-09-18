// ═══════════════════════════════════════════════════════════════════════════
// DanhSachBaoGiaScreen — mirror web mobile MOBILE_HUBS.pricing_quote →
// "Danh sách báo giá" (ModuleDuyetBaoGia.tsx, key = 'danh-sach-bao-gia').
//
// Gọi GET /quotations (server tự filter theo policy QUOTATION_REVIEWER).
// Render 5 chip filter: Tất cả | Khởi tạo | Chờ duyệt | Đã duyệt | Bị từ chối.
//
// Mỗi row card: mã BG (YYMM.STT từ inputValue.quoteCode) + tên BG + KH +
// sản phẩm + SL + giá + avatar người lập + trạng thái. Tap row → expand
// show pricingSheets (từng sheet có hasCustomerApproved) + nút "Tạo LSX"
// nếu sheet đã KH-duyệt.
//
// Hành động nhanh (icon-only):
//   - Nộp duyệt (drafted + createdBy === current user): PIN guard
//   - Duyệt/Từ chối (submitted + QUOTATION_REVIEWER): PIN guard
//   - Tạo LSX từ sheet approved: gọi create-orders (PIN guard)
//   - Xoá (drafted + createdBy === current user): PIN guard
//
// Vì Phase 5 chưa cần wizard, action "Tạo LSX" sẽ chuyển sang Phase 7
// (sau khi có wizard). Phase 5 chỉ focus list + review/approve.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';

class DanhSachBaoGiaScreen extends StatefulWidget {
  const DanhSachBaoGiaScreen({super.key});

  @override
  State<DanhSachBaoGiaScreen> createState() => _DanhSachBaoGiaScreenState();
}

class _DanhSachBaoGiaScreenState extends State<DanhSachBaoGiaScreen> {
  List<BaoGiaApi> _tatCa = const [];
  bool _dangTai = false;
  String? _loi;
  TrangThaiBaoGiaServer _chip = TrangThaiBaoGiaServer.unknown; // all
  String _query = '';
  String? _expandedId;
  Timer? _autoRefresh;

  static const _chips = <(TrangThaiBaoGiaServer, String)>[
    (TrangThaiBaoGiaServer.unknown, 'Tất cả'),
    (TrangThaiBaoGiaServer.drafted, 'Khởi tạo'),
    (TrangThaiBaoGiaServer.submitted, 'Chờ duyệt'),
    (TrangThaiBaoGiaServer.approved, 'Đã duyệt'),
    (TrangThaiBaoGiaServer.rejected, 'Bị từ chối'),
  ];

  @override
  void initState() {
    super.initState();
    _tai(force: true);
    _autoRefresh =
        Timer.periodic(const Duration(seconds: 30), (_) => _tai());
  }

  @override
  void dispose() {
    _autoRefresh?.cancel();
    super.dispose();
  }

  Future<void> _tai({bool force = false}) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    if (_dangTai && !force) return;
    setState(() {
      _dangTai = true;
      _loi = null;
    });
    try {
      final ds = await layDanhSachBaoGiaService(token);
      if (mounted) setState(() => _tatCa = ds);
    } catch (err) {
      if (mounted) {
        setState(() => _loi = err is LoiServiceLts
            ? err.message
            : 'Không tải được danh sách báo giá.');
      }
    } finally {
      if (mounted) setState(() => _dangTai = false);
    }
  }

  List<BaoGiaApi> get _hienThi {
    final q = _query.trim().toLowerCase();
    return _tatCa.where((bg) {
      if (_chip != TrangThaiBaoGiaServer.unknown &&
          bg.trangThai != _chip) {
        return false;
      }
      if (q.isEmpty) return true;
      final id = bg.id.toLowerCase();
      final name = (bg.quotationName ?? bg.description ?? '').toLowerCase();
      return id.contains(q) || name.contains(q);
    }).toList();
  }

  Map<TrangThaiBaoGiaServer, int> get _dem {
    final out = <TrangThaiBaoGiaServer, int>{
      TrangThaiBaoGiaServer.unknown: _tatCa.length,
    };
    for (final bg in _tatCa) {
      out[bg.trangThai] = (out[bg.trangThai] ?? 0) + 1;
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final s = context.watch<AppState>();
    if (!s.isAuthenticated) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text('Cần đăng nhập để xem báo giá.',
              style: TextStyle(fontSize: 13, color: p.muted)),
        ),
      );
    }
    final dem = _dem;
    final laNguoiDuyet = s.nguoiDungHienTai?.policies
            .contains('QUOTATION_REVIEWER') ??
        false;

    return RefreshIndicator(
      onRefresh: () => _tai(force: true),
      child: CustomScrollView(
        slivers: [
          // ── Search ────────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: TextField(
                decoration: InputDecoration(
                  isDense: true,
                  hintText: 'Tìm mã BG, tên báo giá…',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  suffixIcon: _query.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () => setState(() => _query = ''),
                        ),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
          ),
          // ── Status chips ──────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final c in _chips)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(
                            '${c.$2} ${dem[c.$1] ?? 0}',
                            style: const TextStyle(fontSize: 12),
                          ),
                          selected: _chip == c.$1,
                          onSelected: (_) => setState(() => _chip = c.$1),
                        ),
                      ),
                    if (_dangTai) ...[
                      const SizedBox(width: 4),
                      const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2)),
                    ],
                  ],
                ),
              ),
            ),
          ),
          // ── Body ──────────────────────────────────────────────────────────
          if (_loi != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(_loi!,
                        style: const TextStyle(
                            fontSize: 13, color: Color(0xFFB42318))),
                    const SizedBox(height: 8),
                    OutlinedButton(
                        onPressed: () => _tai(force: true),
                        child: const Text('Thử lại')),
                  ],
                ),
              ),
            )
          else if (_hienThi.isEmpty && _tatCa.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text('Chưa có báo giá nào',
                      style: TextStyle(fontSize: 13, color: p.muted)),
                ),
              ),
            )
          else if (_hienThi.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Text('Không có báo giá nào khớp bộ lọc',
                    style: TextStyle(fontSize: 13, color: p.muted)),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 32),
              sliver: SliverList.separated(
                itemCount: _hienThi.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (ctx, i) => _BaoGiaCard(
                  bg: _hienThi[i],
                  expanded: _expandedId == _hienThi[i].id,
                  laNguoiDuyet: laNguoiDuyet,
                  currentUserId: s.nguoiDungHienTai?.id ?? '',
                  onTap: () => setState(() {
                    _expandedId =
                        _expandedId == _hienThi[i].id ? null : _hienThi[i].id;
                  }),
                  onDuyet: (approved) => _duyet(_hienThi[i], approved),
                  onNop: () => _nop(_hienThi[i]),
                  onXoa: () => _xoa(_hienThi[i]),
                  onTaoLsx: (sheet) => _taoLsx(_hienThi[i], sheet),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _nop(BaoGiaApi bg) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() => _dangTai = true);
    try {
      await nopBaoGiaService(token, bg.id);
      if (!mounted) return;
      LtsToast.show(context, 'Đã nộp duyệt báo giá',
          type: LtsToastType.success);
      await _tai(force: true);
    } on LoiServiceLts catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.message, type: LtsToastType.error);
    } finally {
      if (mounted) setState(() => _dangTai = false);
    }
  }

  Future<void> _duyet(BaoGiaApi bg, bool approved) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() => _dangTai = true);
    try {
      await duyetBaoGiaService(token, bg.id, approved: approved);
      if (!mounted) return;
      LtsToast.show(context,
          approved ? 'Đã duyệt báo giá' : 'Đã từ chối báo giá',
          type: LtsToastType.success);
      await _tai(force: true);
    } on LoiServiceLts catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.message, type: LtsToastType.error);
    } finally {
      if (mounted) setState(() => _dangTai = false);
    }
  }

  Future<void> _xoa(BaoGiaApi bg) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() => _dangTai = true);
    try {
      await xoaBaoGiaService(token, bg.id);
      if (!mounted) return;
      LtsToast.show(context, 'Đã xoá báo giá', type: LtsToastType.success);
      await _tai(force: true);
    } on LoiServiceLts catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.message, type: LtsToastType.error);
    } finally {
      if (mounted) setState(() => _dangTai = false);
    }
  }

  Future<void> _taoLsx(BaoGiaApi bg, PricingSheetApi sheet) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() => _dangTai = true);
    try {
      final res =
          await createQuotationPricingSheetOrdersService(token, bg.id);
      if (!mounted) return;
      LtsToast.show(context,
          'Đã tạo ${res.createdCount} LSX từ sheet "${sheet.pricingSheetName ?? sheet.id}"',
          type: LtsToastType.success);
      // Refresh cả LSX list (LSXScreen sẽ tự reload khi mở lại).
      await s.taiProductionOrdersTuServer();
    } on LoiServiceLts catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.message, type: LtsToastType.error);
    } finally {
      if (mounted) setState(() => _dangTai = false);
    }
  }
}

class _BaoGiaCard extends StatelessWidget {
  final BaoGiaApi bg;
  final bool expanded;
  final bool laNguoiDuyet;
  final String currentUserId;
  final VoidCallback onTap;
  final void Function(bool approved) onDuyet;
  final VoidCallback onNop;
  final VoidCallback onXoa;
  final void Function(PricingSheetApi sheet) onTaoLsx;
  const _BaoGiaCard({
    required this.bg,
    required this.expanded,
    required this.laNguoiDuyet,
    required this.currentUserId,
    required this.onTap,
    required this.onDuyet,
    required this.onNop,
    required this.onXoa,
    required this.onTaoLsx,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final isCreator = bg.createdBy == currentUserId;
    final coTheNop = bg.trangThai == TrangThaiBaoGiaServer.drafted && isCreator;
    final coTheDuyet = bg.trangThai == TrangThaiBaoGiaServer.submitted &&
        laNguoiDuyet;
    final coTheXoa = bg.trangThai == TrangThaiBaoGiaServer.drafted && isCreator;
    final firstSheet = bg.pricingSheets.isNotEmpty ? bg.pricingSheets.first : null;
    final firstInput = firstSheet?.inputValue;
    final kh =
        (firstInput?['customer'] as String?) ?? firstSheet?.customerCodeName ?? '—';
    final sp =
        (firstInput?['productName'] as String?) ?? firstSheet?.pricingSheetName ?? '—';

    return LtsCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          bg.quotationName ?? bg.description ?? 'Báo giá',
                          style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: p.text),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      _TrangThaiBadge(tt: bg.trangThai),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('$kh · $sp',
                      style: TextStyle(fontSize: 12.5, color: p.muted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  if (bg.statusReason != null &&
                      bg.statusReason!.isNotEmpty &&
                      bg.trangThai == TrangThaiBaoGiaServer.rejected) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        border: Border.all(color: const Color(0xFFFECACA)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.cancel_outlined,
                              size: 14, color: Color(0xFFB91C1C)),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text('Lý do: ${bg.statusReason}',
                                style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFFB91C1C)),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(children: [
                    if (bg.actorName != null && bg.actorName!.isNotEmpty) ...[
                      Icon(Icons.person_outline,
                          size: 12, color: p.muted),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(bg.actorName!,
                            style: TextStyle(fontSize: 12, color: p.muted),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Icon(Icons.access_time, size: 12, color: p.muted),
                    const SizedBox(width: 4),
                    Text(Fmt.dateTime(bg.createdAt),
                        style: TextStyle(fontSize: 12, color: p.muted)),
                    const Spacer(),
                    if (coTheNop)
                      _ActionBtn(
                        icon: Icons.send_outlined,
                        tooltip: 'Nộp duyệt',
                        onTap: onNop,
                      ),
                    if (coTheDuyet) ...[
                      _ActionBtn(
                        icon: Icons.check_circle_outline,
                        tooltip: 'Duyệt',
                        onTap: () => onDuyet(true),
                        color: const Color(0xFF16A34A),
                      ),
                      const SizedBox(width: 4),
                      _ActionBtn(
                        icon: Icons.cancel_outlined,
                        tooltip: 'Từ chối',
                        onTap: () => onDuyet(false),
                        color: const Color(0xFFDC2626),
                      ),
                    ],
                    if (coTheXoa)
                      _ActionBtn(
                        icon: Icons.delete_outline,
                        tooltip: 'Xoá',
                        onTap: onXoa,
                        color: const Color(0xFFB91C1C),
                      ),
                  ]),
                ],
              ),
            ),
          ),
          if (expanded && bg.pricingSheets.isNotEmpty)
            Container(
              decoration: BoxDecoration(
                color: p.shellBg,
                border: Border(
                    top: BorderSide(color: p.border.withValues(alpha: 0.6))),
              ),
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Bảng tính trong báo giá (${bg.pricingSheets.length}):',
                      style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: p.muted)),
                  const SizedBox(height: 6),
                  for (final sh in bg.pricingSheets) ...[
                    _SheetRow(
                      sh: sh,
                      approvedBG: bg.trangThai == TrangThaiBaoGiaServer.approved,
                      onTaoLsx: () => onTaoLsx(sh),
                    ),
                    const SizedBox(height: 4),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _SheetRow extends StatelessWidget {
  final PricingSheetApi sh;
  final bool approvedBG;
  final VoidCallback onTaoLsx;
  const _SheetRow({
    required this.sh,
    required this.approvedBG,
    required this.onTaoLsx,
  });
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              sh.pricingSheetName ?? sh.id,
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w600, color: p.text),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (approvedBG)
            TextButton.icon(
              onPressed: onTaoLsx,
              icon: const Icon(Icons.precision_manufacturing_outlined, size: 14),
              label: const Text('Tạo LSX', style: TextStyle(fontSize: 11.5)),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                visualDensity: VisualDensity.compact,
              ),
            ),
        ],
      ),
    );
  }
}

class _TrangThaiBadge extends StatelessWidget {
  final TrangThaiBaoGiaServer tt;
  const _TrangThaiBadge({required this.tt});
  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    String label;
    switch (tt) {
      case TrangThaiBaoGiaServer.drafted:
        bg = const Color(0xFFF1F5F9);
        fg = const Color(0xFF475569);
        label = 'Khởi tạo';
        break;
      case TrangThaiBaoGiaServer.submitted:
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFB45309);
        label = 'Chờ duyệt';
        break;
      case TrangThaiBaoGiaServer.approved:
        bg = const Color(0xFFDCFCE7);
        fg = const Color(0xFF15803D);
        label = 'Đã duyệt';
        break;
      case TrangThaiBaoGiaServer.rejected:
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFB91C1C);
        label = 'Bị từ chối';
        break;
      case TrangThaiBaoGiaServer.unknown:
        bg = const Color(0xFFF3F4F6);
        fg = const Color(0xFF6B7280);
        label = 'Không rõ';
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: fg.withValues(alpha: 0.3)),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final Color? color;
  const _ActionBtn({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.color,
  });
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return SizedBox(
      width: 32,
      height: 32,
      child: IconButton(
        icon: Icon(icon, size: 16, color: color ?? p.accent),
        tooltip: tooltip,
        onPressed: onTap,
        padding: EdgeInsets.zero,
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}
