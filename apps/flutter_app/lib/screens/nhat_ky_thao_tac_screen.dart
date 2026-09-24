// ═══════════════════════════════════════════════════════════════════════════
// NhatKyThaoTacScreen — màn Nhật ký thao tác dùng chung cho 4 phạm vi.
//
// Mirror web: ModuleNhatKy.tsx (3 menu nhat-ky-tinh-gia / -cau-hinh /
// -he-thong) + CustomerAuditTab của ModuleKhachHang.tsx (nhat-ky-khach-hang).
//
// Điểm vào (mỗi hub truyền 1 `scope`):
//   - TinhGiaHubScreen  → PhamViNhatKy.tinhGia
//   - CauHinhScreen     → PhamViNhatKy.cauHinh
//   - KhachHangHubScreen→ PhamViNhatKy.khachHang
//   - ThemScreen        → PhamViNhatKy.heThong
//
// BE tự filter theo policy ACTIVITY_MONITOR: có → xem all; không → của mình.
// ignore_for_file: constant_identifier_names
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:lts_pricing/lib/activity_log_mapper.dart';
import 'package:lts_pricing/lib/audit_format.dart';
import 'package:lts_pricing/lib/audit_models.dart';
import 'package:lts_pricing/lib/nhat_ky_loc.dart';
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_module_route.dart';
import '../widgets/lts/lts_toast.dart';
import 'cau_hinh_screen.dart';
import 'danh_sach_bao_gia_screen.dart';
import 'khach_hang_screen.dart';
import 'lich_su_screen.dart';
import 'lsx_screen.dart';
import 'nhat_ky/bo_loc_nhat_ky.dart';
import 'nhat_ky/khach_hang_nhat_ky.dart';
import 'nhat_ky/nhat_ky_scope.dart';
import 'nhat_ky/timeline_nhat_ky.dart';
import 'tai_khoan_screen.dart';

const int _BATCH = 20;

class NhatKyThaoTacScreen extends StatefulWidget {
  final PhamViNhatKy scope;
  const NhatKyThaoTacScreen({super.key, required this.scope});

  @override
  State<NhatKyThaoTacScreen> createState() => _NhatKyThaoTacScreenState();
}

class _NhatKyThaoTacScreenState extends State<NhatKyThaoTacScreen>
    with WidgetsBindingObserver {
  DuLieuNhatKy? _duLieu;
  List<AuditEntry> _entries = const [];
  String? _loi;
  bool _dangTai = false;
  int? _lanCuoiTai;

  late KhoangThoiGian _khoang;
  String? _customFrom;
  String? _customTo;
  String _search = '';
  String _targetSearch = '';
  String _filterUser = '';
  Set<AuditAction> _filterActions = {};
  Set<TargetType> _filterModule = {};
  Set<String> _filterField = {};
  bool _hienBoLoc = false;
  int _visibleCount = _BATCH;

  final ScrollController _scroll = ScrollController();
  Timer? _autoRefresh;

  CauHinhPhamVi get _cfg => CAU_HINH_PHAM_VI[widget.scope]!;

  @override
  void initState() {
    super.initState();
    _khoang = _cfg.khoangMacDinh;
    WidgetsBinding.instance.addObserver(this);
    _scroll.addListener(_themKhiCuon);
    _tai(force: true);
    _khoiDongAutoRefresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _autoRefresh?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
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

  void _themLanCuoi() =>
      setState(() => _lanCuoiTai = DateTime.now().millisecondsSinceEpoch);

  Future<void> _tai({bool force = false}) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    if (_dangTai) return;
    if (!force &&
        _lanCuoiTai != null &&
        DateTime.now().millisecondsSinceEpoch - _lanCuoiTai! < 5000) {
      return; // rate-limit 5s
    }
    setState(() {
      _dangTai = true;
      _loi = null;
    });
    try {
      final data = await layNhatKyDayDuService(token);
      if (!mounted) return;
      final mapped = mapActivityLogs(
        data.logs,
        (actorId) {
          if (actorId == null) return null;
          for (final u in data.accounts) {
            if (u.id == actorId) {
              return (
                id: u.id,
                fullName: u.fullName.isNotEmpty ? u.fullName : u.account,
              );
            }
          }
          return null;
        },
        _resolveTarget(data),
      );
      setState(() {
        _duLieu = data;
        _entries = mapped;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() => _loi =
          err is LoiServiceLts ? err.message : 'Không tải được nhật ký.');
    } finally {
      if (mounted) {
        setState(() => _dangTai = false);
        _themLanCuoi();
      }
    }
  }

  TargetResolver _resolveTarget(DuLieuNhatKy data) {
    final customerMap = <String, String>{};
    for (final c in data.customers) {
      final name = c.versions.isNotEmpty
          ? c.versions.first.organizationName
          : c.codeName;
      customerMap[c.id] = name.isEmpty ? c.codeName : name;
    }
    final userMap = <String, String>{};
    for (final u in data.accounts) {
      userMap[u.id] = u.fullName.isNotEmpty ? u.fullName : u.account;
    }
    final quotationMap = <String, String>{};
    for (final bg in data.quotations) {
      final label = nhanBaoGiaChoLog(bg);
      if (label.isNotEmpty) quotationMap[bg.id] = label;
    }
    return (resourceType, resourceId) {
      if (resourceId == null || resourceId.isEmpty) return null;
      if (resourceType == 'customer' || resourceType == 'customer_manager') {
        return customerMap[resourceId];
      }
      if (resourceType == 'account' || resourceType == 'user_policy') {
        return userMap[resourceId];
      }
      if (resourceType == 'quotation') {
        return quotationMap[resourceId];
      }
      return null;
    };
  }

  // ── Lọc ─────────────────────────────────────────────────────────────────
  List<AuditEntry> get _theoPhamVi {
    final types = _cfg.targetTypes;
    final base = types == null
        ? _entries
        : _entries.where((e) => types.contains(e.targetType)).toList();
    return _cfg.kieuKhachHang ? dedupeAuditEntries(base) : base;
  }

  List<AuditEntry> get _hienThi {
    final bien = bienKhoangThoiGian(_khoang,
        customFrom: _customFrom, customTo: _customTo);
    final q = _search.trim().toLowerCase();
    final tq = _targetSearch.trim().toLowerCase();
    var list = _theoPhamVi.where((e) {
      final t = DateTime.tryParse(e.timestamp)?.toLocal();
      if (t != null && (t.isBefore(bien.start) || t.isAfter(bien.end))) {
        return false;
      }
      if (_filterActions.isNotEmpty && !_filterActions.contains(e.action)) {
        return false;
      }
      if (_filterUser.isNotEmpty && e.userId != _filterUser) return false;
      if (_filterModule.isNotEmpty && !_filterModule.contains(e.targetType)) {
        return false;
      }
      if (_filterField.isNotEmpty) {
        final keys = <String>{...?e.before?.keys, ...?e.after?.keys};
        if (!_filterField.any(keys.contains)) return false;
      }
      if (tq.isNotEmpty) {
        final hit = (e.targetId).toLowerCase().contains(tq) ||
            (e.targetName ?? '').toLowerCase().contains(tq) ||
            (e.note ?? '').toLowerCase().contains(tq) ||
            jsonEncode(e.before ?? {}).toLowerCase().contains(tq) ||
            jsonEncode(e.after ?? {}).toLowerCase().contains(tq);
        if (!hit) return false;
      }
      if (q.isNotEmpty) {
        final hit = e.userName.toLowerCase().contains(q) ||
            (e.targetName ?? '').toLowerCase().contains(q) ||
            e.targetId.toLowerCase().contains(q) ||
            (e.note ?? '').toLowerCase().contains(q) ||
            jsonEncode(e.before ?? {}).toLowerCase().contains(q) ||
            jsonEncode(e.after ?? {}).toLowerCase().contains(q);
        if (!hit) return false;
      }
      return true;
    }).toList();
    list.sort((a, b) {
      final ta = DateTime.tryParse(b.timestamp)?.millisecondsSinceEpoch ?? 0;
      final tb = DateTime.tryParse(a.timestamp)?.millisecondsSinceEpoch ?? 0;
      return ta.compareTo(tb);
    });
    return list;
  }

  List<({String id, String name})> get _allUsers {
    final seen = <String>{};
    final out = <({String id, String name})>[];
    for (final e in _theoPhamVi) {
      if (seen.contains(e.userId)) continue;
      seen.add(e.userId);
      out.add((id: e.userId, name: e.userName.isEmpty ? e.userId : e.userName));
    }
    return out;
  }

  List<({String label, VoidCallback clear})> get _chips {
    final chips = <({String label, VoidCallback clear})>[];
    if (_khoang != _cfg.khoangMacDinh) {
      chips.add((
        label: NHAN_KHOANG_THOI_GIAN[_khoang]!,
        clear: () => setState(() => _khoang = _cfg.khoangMacDinh),
      ));
    }
    if (_filterUser.isNotEmpty) {
      final u = _allUsers.where((x) => x.id == _filterUser).toList();
      chips.add((
        label: u.isNotEmpty ? u.first.name : _filterUser,
        clear: () => setState(() => _filterUser = ''),
      ));
    }
    for (final a in _filterActions) {
      chips.add((
        label: NHAN_ACTION_TIMELINE[a] ?? a.name,
        clear: () =>
            setState(() => _filterActions = {..._filterActions}..remove(a)),
      ));
    }
    for (final m in _filterModule) {
      chips.add((
        label: NHAN_TARGET_TYPE[m] ?? m.name,
        clear: () =>
            setState(() => _filterModule = {..._filterModule}..remove(m)),
      ));
    }
    if (_targetSearch.isNotEmpty) {
      chips.add((
        label: 'Mục tiêu: $_targetSearch',
        clear: () => setState(() => _targetSearch = ''),
      ));
    }
    return chips;
  }

  void _xoaTatCa() {
    setState(() {
      _search = '';
      _khoang = _cfg.khoangMacDinh;
      _customFrom = null;
      _customTo = null;
      _filterActions = {};
      _filterUser = '';
      _filterModule = {};
      _filterField = {};
      _targetSearch = '';
      _hienBoLoc = false;
      _visibleCount = _BATCH;
    });
  }

  void _themKhiCuon() {
    if (!_scroll.hasClients) return;
    final max = _scroll.position.maxScrollExtent;
    if (_scroll.offset >= max - 200) {
      final total = _hienThi.length;
      if (_visibleCount < total) {
        setState(() => _visibleCount += _BATCH);
      }
    }
  }

  // ── CSV (mirror audit.ts `xuatNhatKyCsv`) ───────────────────────────────
  Future<void> _xuatCsv() async {
    final entries = _hienThi;
    const headers = [
      'Thời gian',
      'Người thực hiện',
      'Hành động',
      'Loại',
      'Mục tiêu',
      'IP',
      'Thiết bị',
      'Ghi chú',
    ];
    String esc(String v) => '"${v.replaceAll('"', '""')}"';
    final rows = entries.map((e) => [
          _thoiGianDayDu(e.timestamp),
          e.userName.isEmpty ? 'Không xác định' : e.userName,
          NHAN_ACTION_TIMELINE[e.action] ?? e.action.name,
          NHAN_TARGET_TYPE[e.targetType] ?? e.targetType.name,
          (e.targetName ?? '').isNotEmpty
              ? e.targetName!
              : (NHAN_TARGET_TYPE[e.targetType] ?? 'Dữ liệu'),
          e.ipAddress ?? '',
          e.device ?? '',
          e.note ?? '',
        ]);
    final csv = [
      headers.map(esc).join(','),
      ...rows.map((r) => r.map(esc).join(',')),
    ].join('\n');
    final bytes = Uint8List.fromList(utf8.encode('\ufeff$csv'));
    final now = DateTime.now();
    final ngay =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    try {
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'nhat-ky-thao-tac-$ngay.csv',
      );
    } catch (_) {
      if (mounted) {
        LtsToast.show(context, 'Không xuất được CSV.',
            type: LtsToastType.error);
      }
    }
  }

  // ── Mở dữ liệu liên quan (mirror `openRelated`) ─────────────────────────
  void _moLienQuan(AuditEntry entry) {
    Widget? child;
    String? title;
    switch (entry.targetType) {
      case TargetType.quote:
        title = 'Danh sách báo giá';
        child = const DanhSachBaoGiaScreen();
      case TargetType.history:
        title = 'Lịch sử báo giá';
        child = const LichSuScreen();
      case TargetType.customer:
        title = 'Khách hàng';
        child = const KhachHangScreen();
      case TargetType.order:
        title = 'Lệnh sản xuất';
        child = const LSXScreen();
      case TargetType.config:
        title = 'Cấu hình tính giá';
        child = const CauHinhScreen();
      case TargetType.permission:
        title = 'Tài khoản & quyền';
        child = const TaiKhoanScreen();
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ModuleRoute(title: title!, child: child!),
      ),
    );
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

    final loc = _hienThi;
    final hienThi = loc.take(_visibleCount).toList();
    final grouped = nhomTheoNgay(hienThi);
    final coQuyenMonitor =
        s.nguoiDungHienTai?.coQuyen('ACTIVITY_MONITOR') ?? false;

    return RefreshIndicator(
      onRefresh: () => _tai(force: true),
      child: CustomScrollView(
        controller: _scroll,
        slivers: [
          // ── Thanh lọc ───────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    decoration: InputDecoration(
                      isDense: true,
                      hintText:
                          'Tìm theo tên người dùng, tên khách hàng, mô tả...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _search.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () => setState(() => _search = ''),
                            ),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(LtsT.rInput)),
                    ),
                    onChanged: (v) => setState(() {
                      _search = v;
                      _visibleCount = _BATCH;
                    }),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      SizedBox(
                        width: 140,
                        child: DropdownButtonFormField<KhoangThoiGian>(
                          initialValue: _khoang,
                          isDense: true,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(
                                borderRadius:
                                    BorderRadius.circular(LtsT.rInput)),
                          ),
                          items: [
                            for (final e in NHAN_KHOANG_THOI_GIAN.entries)
                              DropdownMenuItem(
                                value: e.key,
                                child: Text(e.value,
                                    style: const TextStyle(fontSize: 13)),
                              ),
                          ],
                          onChanged: (v) {
                            if (v == null) return;
                            setState(() {
                              _khoang = v;
                              _visibleCount = _BATCH;
                            });
                            if (v == KhoangThoiGian.custom) _chonKhoangNgay();
                          },
                        ),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                          foregroundColor: _hienBoLoc ? p.accent : p.muted,
                          side: BorderSide(
                              color: _hienBoLoc ? p.accent : p.border),
                        ),
                        onPressed: () =>
                            setState(() => _hienBoLoc = !_hienBoLoc),
                        icon: const Icon(Icons.filter_list_rounded, size: 16),
                        label: Text(
                          _chips.isNotEmpty
                              ? 'Thêm bộ lọc (${_chips.length})'
                              : 'Thêm bộ lọc',
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                          foregroundColor: p.muted,
                          side: BorderSide(color: p.border),
                        ),
                        onPressed: _xuatCsv,
                        icon: const Icon(Icons.download_rounded, size: 16),
                        label: const Text('Xuất CSV',
                            style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                  if (_khoang == KhoangThoiGian.custom) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _oNgay('Từ', _customFrom, (v) {
                            setState(() => _customFrom = v);
                          }),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _oNgay('Đến', _customTo, (v) {
                            setState(() => _customTo = v);
                          }),
                        ),
                      ],
                    ),
                  ],
                  if (_hienBoLoc) ...[
                    const SizedBox(height: 10),
                    BoLocNhatKy(
                      filterActions: _filterActions,
                      filterModule: _filterModule,
                      filterField: _filterField,
                      filterUser: _filterUser,
                      targetSearch: _targetSearch,
                      allUsers: _allUsers,
                      hienThiUser: coQuyenMonitor,
                      hienThiField: _cfg.kieuKhachHang,
                      hienThiModule: !_cfg.kieuKhachHang,
                      onActions: (v) => setState(() {
                        _filterActions = v;
                        _visibleCount = _BATCH;
                      }),
                      onModule: (v) => setState(() {
                        _filterModule = v;
                        _visibleCount = _BATCH;
                      }),
                      onField: (v) => setState(() {
                        _filterField = v;
                        _visibleCount = _BATCH;
                      }),
                      onUser: (v) => setState(() {
                        _filterUser = v;
                        _visibleCount = _BATCH;
                      }),
                      onTargetSearch: (v) => setState(() {
                        _targetSearch = v;
                        _visibleCount = _BATCH;
                      }),
                    ),
                  ],
                  ChipDangLoc(chips: _chips, onClearAll: _xoaTatCa),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text('${loc.length} bản ghi',
                          style: TextStyle(fontSize: 12.5, color: p.muted)),
                      const SizedBox(width: 12),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          foregroundColor: p.muted,
                          side: BorderSide(color: p.border),
                          minimumSize: const Size(0, 34),
                        ),
                        onPressed: _dangTai ? null : () => _tai(force: true),
                        icon: _dangTai
                            ? const SizedBox(
                                width: 12,
                                height: 12,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.refresh_rounded, size: 14),
                        label: Text(_dangTai ? 'Đang tải...' : 'Làm mới',
                            style: const TextStyle(fontSize: 12.5)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Banner read-only
                  Container(
                    width: double.infinity,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF0F9FF),
                      border: Border.fromBorderSide(
                          BorderSide(color: Color(0xFFBAE6FD))),
                      borderRadius: BorderRadius.all(Radius.circular(8)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.lock_outline_rounded,
                            size: 14, color: Color(0xFF0369A1)),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Nhật ký thao tác không thể chỉnh sửa hoặc xóa bởi bất kỳ ai, kể cả quản trị viên.',
                            style: TextStyle(
                                fontSize: 12.5, color: Color(0xFF0369A1)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Body ────────────────────────────────────────────────────────
          if (_loi != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Text(_loi!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 13, color: Color(0xFFB42318))),
                    const SizedBox(height: 10),
                    OutlinedButton(
                        onPressed: () => _tai(force: true),
                        child: const Text('Thử lại')),
                  ],
                ),
              ),
            )
          else if (_duLieu == null)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (loc.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.schedule_rounded, size: 40, color: p.dim),
                      const SizedBox(height: 12),
                      Text(_cfg.emptyText,
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13.5, color: p.muted)),
                      if (_cfg.emptySub.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(_cfg.emptySub,
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 12, color: p.dim)),
                      ],
                      const SizedBox(height: 12),
                      OutlinedButton(
                          onPressed: _xoaTatCa,
                          child: const Text('Xóa bộ lọc')),
                    ],
                  ),
                ),
              ),
            )
          else
            SliverToBoxAdapter(
              child: _cfg.kieuKhachHang
                  ? KhachHangNhatKy(
                      grouped: grouped,
                      currentUser: s.nguoiDungHienTai,
                      users: _duLieu?.accounts ?? const [],
                      accessToken: s.accessToken,
                    )
                  : TimelineNhatKy(
                      grouped: grouped,
                      chiHienGiaTriMoi: _cfg.chiHienGiaTriMoi,
                      onOpen: _moLienQuan,
                    ),
            ),
          if (_loi == null && _duLieu != null && _visibleCount < loc.length)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(
                    child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }

  Widget _oNgay(String label, String? value, ValueChanged<String?> onPick) {
    return InkWell(
      onTap: () async {
        final now = DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: value != null ? (DateTime.tryParse(value) ?? now) : now,
          firstDate: DateTime(2020),
          lastDate: DateTime(now.year + 1),
        );
        if (picked == null) return;
        final v =
            '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
        onPick(v);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          isDense: true,
          labelText: label,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(LtsT.rInput)),
        ),
        child: Text(
          value == null || value.isEmpty
              ? 'Chọn ngày'
              : '${value.substring(8, 10)}/${value.substring(5, 7)}/${value.substring(0, 4)}',
          style: TextStyle(fontSize: 13, color: LtsT.of(context).text),
        ),
      ),
    );
  }

  Future<void> _chonKhoangNgay() async {
    final now = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(now.year + 1),
      initialDateRange: _customFrom != null && _customTo != null
          ? DateTimeRange(
              start: DateTime.tryParse(_customFrom!) ?? now,
              end: DateTime.tryParse(_customTo!) ?? now,
            )
          : null,
    );
    if (range == null) return;
    String fmt(DateTime d) =>
        '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    setState(() {
      _customFrom = fmt(range.start);
      _customTo = fmt(range.end);
    });
  }
}

String _thoiGianDayDu(String iso) {
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return iso;
  String p2(int v) => v.toString().padLeft(2, '0');
  return '${p2(dt.day)}/${p2(dt.month)}/${dt.year} ${p2(dt.hour)}:${p2(dt.minute)}';
}
