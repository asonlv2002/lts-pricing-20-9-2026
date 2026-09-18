// ═══════════════════════════════════════════════════════════════════════════
// KhachHangAuditLogScreen — mirror web mobile "Nhật ký khách hàng"
// (menuDangChon = 'nhat-ky-khach-hang' trong ModuleKhachHang.tsx:2071):
//   Gọi GET /activity-logs, filter customer.* / customer_manager.*,
//   render danh sách: actor · action · codeName · time · metadata diff.
// BE tự filter theo policy ACTIVITY_MONITOR: có → xem all; không → của mình.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_surfaces.dart';

class KhachHangAuditLogScreen extends StatefulWidget {
  const KhachHangAuditLogScreen({super.key});

  @override
  State<KhachHangAuditLogScreen> createState() =>
      _KhachHangAuditLogScreenState();
}

class _KhachHangAuditLogScreenState extends State<KhachHangAuditLogScreen> {
  List<HoatDongApi>? _tatCa;
  String? _loi;
  bool _dangTai = false;
  String _chip = 'all'; // all | created | updated | assigned
  String _query = '';

  @override
  void initState() {
    super.initState();
    _tai();
  }

  Future<void> _tai() async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
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

  List<HoatDongApi> get _hienThi {
    final ds = locLogKhachHang(_tatCa ?? const <HoatDongApi>[]);
    final q = _query.trim().toLowerCase();
    return ds.where((h) {
      if (_chip != 'all' && h.nhom != _chip) return false;
      if (q.isEmpty) return true;
      return h.tenKhachHang.toLowerCase().contains(q) ||
          h.tenNguoiThucHien.toLowerCase().contains(q) ||
          h.nhanViet.toLowerCase().contains(q) ||
          (h.resourceId?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  Map<String, int> get _dem {
    final ds = locLogKhachHang(_tatCa ?? const <HoatDongApi>[]);
    return {
      'all': ds.length,
      'created': ds.where((h) => h.nhom == 'created').length,
      'updated': ds.where((h) => h.nhom == 'updated').length,
      'assigned': ds.where((h) => h.nhom == 'assigned').length,
    };
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final s = context.watch<AppState>();
    if (!s.isAuthenticated) {
      return const SizedBox.shrink();
    }
    final dem = _dem;

    return RefreshIndicator(
      onRefresh: _tai,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: TextField(
                decoration: InputDecoration(
                  isDense: true,
                  hintText: 'Tìm mã KH, người thực hiện, hành động…',
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
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final c in const [
                      ('all', 'Tất cả'),
                      ('created', 'Tạo mới'),
                      ('updated', 'Cập nhật'),
                      ('assigned', 'Phân công'),
                    ])
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
                        onPressed: _tai, child: const Text('Thử lại')),
                  ],
                ),
              ),
            )
          else if (_tatCa == null)
            const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()))
          else if (_hienThi.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Text('Chưa có nhật ký khách hàng',
                    style: TextStyle(fontSize: 13, color: p.muted)),
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
            ],
          ),
          const SizedBox(height: 4),
          Text(
            h.resourceId == null
                ? h.tenKhachHang
                : '${h.tenKhachHang} · ${h.resourceId}',
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
    // updated: list field thay đổi (LH / SĐT / MST / email / địa chỉ / tên).
    final prev = (h.metadata['previousVersion'] as Map?)?.cast<String, dynamic>() ?? const {};
    final curr = (h.metadata['currentVersion'] as Map?)?.cast<String, dynamic>() ?? const {};
    final hien = <Widget>[];
    const label = {
      'organizationName': 'Tên',
      'contactName': 'LH',
      'phoneNumber': 'SĐT',
      'email': 'Email',
      'taxCode': 'MST',
      'address': 'Địa chỉ',
      'status': 'TT',
    };
    for (final e in label.entries) {
      final pV = prev[e.key]?.toString() ?? '';
      final cV = curr[e.key]?.toString() ?? '';
      if (pV == cV) continue;
      hien.add(_dongDiff(e.value, '$pV → $cV', p.text));
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
