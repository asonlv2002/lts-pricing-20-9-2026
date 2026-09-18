// ═══════════════════════════════════════════════════════════════════════════
// NhatKyThaoTacScreen — màn "Nhật ký thao tác" tổng hệ thống (mirror
// web mobile MOBILE_HUBS.pricing_quote → "Nhật ký thao tác" → menuKey
// 'nhat-ky-tinh-gia' trong ModuleNhatKy.tsx).
//
// Gọi GET /activity-logs, không filter (server tự filter theo policy
// ACTIVITY_MONITOR). Hiển thị log cho mọi resourceType: pricing_sheet,
// quotation, customer, customer_manager, quotation_pricing_sheet_order,
// user_policy, price_config. Có thể coi như "audit log toàn hệ thống".
//
// Khác biệt so với KhachHangAuditLogScreen:
//   - Filter theo resourceType (chip) thay vì nhom
//   - KHÔNG filter sẵn customer.* — show tất cả
//   - Auto-refresh 30s khi màn mở, pause khi background
//   - Search toàn cục (resourceId, actorName, action, customerName)
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_surfaces.dart';

class NhatKyThaoTacScreen extends StatefulWidget {
  const NhatKyThaoTacScreen({super.key});

  @override
  State<NhatKyThaoTacScreen> createState() => _NhatKyThaoTacScreenState();
}

class _NhatKyThaoTacScreenState extends State<NhatKyThaoTacScreen>
    with WidgetsBindingObserver {
  List<HoatDongApi>? _tatCa;
  String? _loi;
  bool _dangTai = false;
  String _chipResource = 'all'; // all | pricing_sheet | quotation | customer | order | permission
  String _chipNhom = 'all'; // all | created | updated | review | order | assigned | other
  String _query = '';
  Timer? _autoRefresh;

  static const _resourceChips = <(String, String, String)>[
    ('all', 'Tất cả', 'Mọi thao tác'),
    ('pricing_sheet', 'Bảng tính', 'pricing_sheet.*'),
    ('quotation', 'Báo giá', 'quotation.*'),
    ('customer', 'Khách hàng', 'customer.* / customer_manager.*'),
    ('order', 'LSX', 'quotation_pricing_sheet_order.*'),
    ('permission', 'Phân quyền', 'user_policy / account'),
  ];

  static const _nhomChips = <(String, String)>[
    ('all', 'Tất cả'),
    ('created', 'Tạo'),
    ('updated', 'Sửa'),
    ('review', 'Duyệt/Từ chối'),
    ('order', 'Tạo LSX'),
    ('assigned', 'Phân công'),
    ('other', 'Khác'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _tai(force: true);
    _khoiDongAutoRefresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _autoRefresh?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Pause refresh khi app background để tiết kiệm pin + data.
    if (state == AppLifecycleState.resumed) {
      _khoiDongAutoRefresh();
    } else {
      _autoRefresh?.cancel();
      _autoRefresh = null;
    }
  }

  void _khoiDongAutoRefresh() {
    _autoRefresh?.cancel();
    _autoRefresh = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _tai(),
    );
  }

  Future<void> _tai({bool force = false}) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    if (_dangTai) return;
    if (!force &&
        _tatCa != null &&
        _lanCuoiTai != null &&
        DateTime.now().millisecondsSinceEpoch - _lanCuoiTai! < 5000) {
      return; // 5s rate-limit
    }
    setState(() {
      _dangTai = true;
      _loi = null;
    });
    try {
      final ds = await layHoatDongService(token);
      if (mounted) setState(() => _tatCa = ds);
    } catch (err) {
      if (mounted) {
        setState(() =>
            _loi = err is LoiServiceLts ? err.message : 'Không tải được nhật ký.');
      }
    } finally {
      if (mounted) setState(() => _dangTai = false);
    }
  }

  int? _lanCuoiTai;

  List<HoatDongApi> get _locTheoResource {
    final ds = _tatCa ?? const <HoatDongApi>[];
    if (_chipResource == 'all') return ds;
    if (_chipResource == 'customer') {
      return ds
          .where((h) =>
              h.resourceType == 'customer' ||
              h.resourceType == 'customer_manager')
          .toList();
    }
    if (_chipResource == 'order') {
      return ds
          .where((h) => h.resourceType == 'quotation_pricing_sheet_order')
          .toList();
    }
    if (_chipResource == 'permission') {
      return ds
          .where((h) =>
              h.resourceType == 'user_policy' || h.resourceType == 'account')
          .toList();
    }
    return ds.where((h) => h.resourceType == _chipResource).toList();
  }

  List<HoatDongApi> get _hienThi {
    final ds = _locTheoResource;
    final q = _query.trim().toLowerCase();
    return ds.where((h) {
      if (_chipNhom != 'all' && h.nhom != _chipNhom) return false;
      if (q.isEmpty) return true;
      return h.tenNguoiThucHien.toLowerCase().contains(q) ||
          h.nhanViet.toLowerCase().contains(q) ||
          h.nhanResource.toLowerCase().contains(q) ||
          (h.resourceId?.toLowerCase().contains(q) ?? false) ||
          h.action.toLowerCase().contains(q);
    }).toList();
  }

  Map<String, int> get _demNhom {
    final ds = _locTheoResource;
    final out = <String, int>{'all': ds.length};
    for (final n in ['created', 'updated', 'review', 'order', 'assigned', 'other']) {
      out[n] = ds.where((h) => h.nhom == n).length;
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
          child: Text('Cần đăng nhập để xem nhật ký thao tác.',
              style: TextStyle(fontSize: 13, color: p.muted)),
        ),
      );
    }
    _lanCuoiTai = DateTime.now().millisecondsSinceEpoch;
    final dem = _demNhom;

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
                  hintText: 'Tìm người, hành động, mã tài nguyên…',
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
          // ── Resource type chips ───────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final c in _resourceChips)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(
                            '${c.$2} ${_demTheoResource(c.$1)}',
                            style: const TextStyle(fontSize: 12),
                          ),
                          tooltip: c.$3,
                          selected: _chipResource == c.$1,
                          onSelected: (_) =>
                              setState(() => _chipResource = c.$1),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          // ── Nhóm chips (hành động) ────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final c in _nhomChips)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(
                            '${c.$2} ${dem[c.$1] ?? 0}',
                            style: const TextStyle(fontSize: 12),
                          ),
                          selected: _chipNhom == c.$1,
                          onSelected: (_) => setState(() => _chipNhom = c.$1),
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
          else if (_tatCa == null)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_hienThi.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text('Chưa có nhật ký thao tác',
                      style: TextStyle(fontSize: 13, color: p.muted)),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 32),
              sliver: SliverList.separated(
                itemCount: _hienThi.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (ctx, i) => _LogCard(h: _hienThi[i]),
              ),
            ),
        ],
      ),
    );
  }

  int _demTheoResource(String key) {
    final ds = _tatCa ?? const <HoatDongApi>[];
    if (key == 'all') return ds.length;
    if (key == 'customer') {
      return ds
          .where((h) =>
              h.resourceType == 'customer' ||
              h.resourceType == 'customer_manager')
          .length;
    }
    if (key == 'order') {
      return ds
          .where((h) => h.resourceType == 'quotation_pricing_sheet_order')
          .length;
    }
    if (key == 'permission') {
      return ds
          .where((h) =>
              h.resourceType == 'user_policy' || h.resourceType == 'account')
          .length;
    }
    return ds.where((h) => h.resourceType == key).length;
  }
}

class _LogCard extends StatelessWidget {
  final HoatDongApi h;
  const _LogCard({required this.h});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final color = _mauHanhDong(h.nhom);
    return LtsCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                    color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  h.nhanViet,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: p.text),
                ),
              ),
              _ResourceBadge(label: h.nhanResource),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${h.tenKhachHang.isEmpty ? (h.resourceId ?? '—') : h.tenKhachHang}'
            '${h.resourceId == null ? '' : ' · ${h.resourceId}'}',
            style: TextStyle(fontSize: 12, color: p.muted),
          ),
          const SizedBox(height: 6),
          Text(
            h.tenNguoiThucHien.isEmpty
                ? Fmt.dateTime(h.createdAt)
                : '${h.tenNguoiThucHien} · ${Fmt.dateTime(h.createdAt)}',
            style: TextStyle(fontSize: 12.5, color: p.text),
          ),
          if (_hienThiDiff(h)) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: p.shellBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: p.border),
              ),
              child: _buildDiff(context, h),
            ),
          ],
        ],
      ),
    );
  }

  Color _mauHanhDong(String nhom) {
    switch (nhom) {
      case 'created':
        return const Color(0xFF16A34A);
      case 'updated':
        return const Color(0xFF2563EB);
      case 'assigned':
        return const Color(0xFFEA580C);
      case 'review':
        return const Color(0xFF8B5CF6);
      case 'order':
        return const Color(0xFF0D9488);
      default:
        return const Color(0xFF6B7280);
    }
  }

  bool _hienThiDiff(HoatDongApi h) {
    if (h.nhom == 'created') return false;
    final m = h.metadata;
    return m['previousVersion'] is Map || m['currentVersion'] is Map;
  }

  Widget _buildDiff(BuildContext context, HoatDongApi h) {
    final p = LtsT.of(context);
    if (h.nhom == 'assigned') {
      final prev = _nhanQuanLy(h.metadata['previousVersion']);
      final curr = _nhanQuanLy(h.metadata['currentVersion']);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _dongDiff('Trước', prev, p.muted),
          _dongDiff('Sau', curr, p.text),
        ],
      );
    }
    final prev =
        (h.metadata['previousVersion'] as Map?)?.cast<String, dynamic>() ??
            const {};
    final curr =
        (h.metadata['currentVersion'] as Map?)?.cast<String, dynamic>() ??
            const {};
    final hien = <Widget>[];
    // Customer diff: tổ chức / LH / SĐT / MST / email / địa chỉ
    const customerLabels = {
      'organizationName': 'Tên',
      'contactName': 'LH',
      'phoneNumber': 'SĐT',
      'email': 'Email',
      'taxCode': 'MST',
      'address': 'Địa chỉ',
      'status': 'TT',
    };
    for (final e in customerLabels.entries) {
      final pV = prev[e.key]?.toString() ?? '';
      final cV = curr[e.key]?.toString() ?? '';
      if (pV == cV) continue;
      hien.add(_dongDiff(e.value, '$pV → $cV', p.text));
    }
    // Pricing sheet diff: finalPrice + structureText
    final pFp = (prev['finalPrice'] as num?)?.toDouble();
    final cFp = (curr['finalPrice'] as num?)?.toDouble();
    if (pFp != cFp && (pFp != null || cFp != null)) {
      hien.add(_dongDiff(
          'Giá', '${pFp ?? '—'} → ${cFp ?? '—'}', p.text));
    }
    final pStr = prev['structureText']?.toString() ?? '';
    final cStr = curr['structureText']?.toString() ?? '';
    if (pStr != cStr && (pStr.isNotEmpty || cStr.isNotEmpty)) {
      hien.add(_dongDiff('Cấu trúc', '$pStr → $cStr', p.text));
    }
    // Quotation diff: updateStatus (trước → sau)
    final pSt = prev['updateStatus']?.toString() ?? '';
    final cSt = curr['updateStatus']?.toString() ?? '';
    if (pSt != cSt && (pSt.isNotEmpty || cSt.isNotEmpty)) {
      hien.add(_dongDiff(
          'Trạng thái BG', '$pSt → $cSt', p.text));
    }
    if (hien.isEmpty) {
      return Text('Đã cập nhật', style: TextStyle(fontSize: 12, color: p.muted));
    }
    return Column(
        crossAxisAlignment: CrossAxisAlignment.start, children: hien);
  }

  String _nhanQuanLy(dynamic v) {
    if (v is! Map) return '—';
    final managers = v['managers'];
    if (managers is! List || managers.isEmpty) return '—';
    return managers
        .map((e) => e is Map ? (e['fullName']?.toString() ?? '') : '')
        .where((s) => s.isNotEmpty)
        .join(', ');
  }

  Widget _dongDiff(String label, String value, Color color) => Padding(
        padding: const EdgeInsets.only(bottom: 3),
        child: Text.rich(
          TextSpan(children: [
            TextSpan(
              text: '$label: ',
              style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: color.withValues(alpha: 0.7)),
            ),
            TextSpan(
              text: value,
              style: TextStyle(fontSize: 11.5, color: color),
            ),
          ]),
        ),
      );
}

class _ResourceBadge extends StatelessWidget {
  final String label;
  const _ResourceBadge({required this.label});
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: p.accent.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 10.5, fontWeight: FontWeight.w700, color: p.accent)),
    );
  }
}
