// ═══════════════════════════════════════════════════════════════════════════
// TaiKhoanScreen — mirror ModulePhanQuyen.tsx (mức web mobile), 4 view:
//   Tài khoản (list + filter + tạo + activate + cấp/thu hồi policy)
//   Vai trò (list + tạo/sửa + xóa)
//   Yêu cầu đặt lại MK (duyệt / từ chối → mã xác thực)
//   Bảng phân quyền (ma trận theo vai trò — chỉ xem)
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_toast.dart';

class TaiKhoanScreen extends StatefulWidget {
  const TaiKhoanScreen({super.key});

  @override
  State<TaiKhoanScreen> createState() => _TaiKhoanScreenState();
}

class _TaiKhoanScreenState extends State<TaiKhoanScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;
  List<TaiKhoanApi>? _users;
  List<VaiTroApi>? _roles;
  List<YeuCauDatLaiMatKhauApi>? _resetRequests;
  List<({String code, String name, String description})>? _policyCatalog;
  String? _loi;
  bool _dangTai = false;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
    _tab.addListener(() {
      if (!_tab.indexIsChanging) return;
      _taiChoView(_tab.index);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _taiChoView(0));
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _taiChoView(int index) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() {
      _dangTai = true;
      _loi = null;
    });
    try {
      switch (index) {
        case 0:
          _users = await layTaiKhoanService(token);
        case 1:
          _roles = await layVaiTroService(token);
        case 2:
          _resetRequests = await layYeuCauDatLaiMatKhauService(token);
        case 3:
          _roles = await layVaiTroService(token);
          _users = await layTaiKhoanService(token);
      }
      _policyCatalog ??= await layDanhSachPolicyService(token).catchError(
          (_) => <({String code, String name, String description})>[]);
      if (mounted) setState(() {});
    } catch (err) {
      if (mounted) {
        setState(() =>
            _loi = err is LoiServiceLts ? err.message : 'Không tải được dữ liệu.');
      }
    } finally {
      if (mounted) setState(() => _dangTai = false);
    }
  }

  void _thongBaoLoi(Object err) {
    LtsToast.show(
      context,
      err is LoiServiceLts ? err.message : 'Thao tác thất bại.',
      type: LtsToastType.error,
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final user = s.nguoiDungHienTai;
    if (!s.isAuthenticated) return const SizedBox.shrink();

    return Column(
      children: [
        TabBar(
          controller: _tab,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelColor: const Color(0xFF5B4DFF),
          unselectedLabelColor: p_muted(context),
          indicatorColor: const Color(0xFF5B4DFF),
          tabs: const [
            Tab(text: 'Tài khoản'),
            Tab(text: 'Vai trò'),
            Tab(text: 'Yêu cầu đặt lại MK'),
            Tab(text: 'Bảng phân quyền'),
          ],
        ),
        Expanded(
          child: _loi != null
              ? _loiView()
              : TabBarView(
                  controller: _tab,
                  children: [
                    _viewTaiKhoan(context, user!),
                    _viewVaiTro(context),
                    _viewYeuCauMK(context),
                    _viewMaTran(context),
                  ],
                ),
        ),
      ],
    );
  }

  Color p_muted(BuildContext context) {
    final p = LtsT.of(context);
    return p.muted;
  }

  Widget _loiView() => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_loi!,
                style: const TextStyle(
                    fontSize: 13, color: Color(0xFFB42318))),
            const SizedBox(height: 8),
            OutlinedButton(
                onPressed: () => _taiChoView(_tab.index),
                child: const Text('Thử lại')),
          ],
        ),
      );

  Widget _trong(String text) => Center(
        child: Text(text,
            style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
      );

  // ── View 1: Tài khoản ────────────────────────────────────────────────────
  Widget _viewTaiKhoan(BuildContext context, NguoiDungHienTai user) {
    final coQuyenQL = user.coQuyen('ACCOUNT_MANAGER');
    final coQuyenQuyen = user.coQuyen('USER_POLICY_GRANT') ||
        user.coQuyen('USER_POLICY_REVOKE');
    final all = _users ?? const <TaiKhoanApi>[];
    final filtered = all.where((u) {
      if (_filter == 'all') return true;
      if (_filter == 'active') return u.isActive;
      return !u.isActive;
    }).toList();

    return Stack(
      children: [
        Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
              child: Row(
                children: [
                  for (final c in const [
                    ('all', 'Tất cả'),
                    ('active', 'Đang hoạt động'),
                    ('inactive', 'Đã vô hiệu'),
                  ])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(c.$2,
                            style: const TextStyle(fontSize: 12)),
                        selected: _filter == c.$1,
                        onSelected: (_) => setState(() => _filter = c.$1),
                      ),
                    ),
                  const Spacer(),
                  if (_dangTai)
                    const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2)),
                ],
              ),
            ),
            Expanded(
              child: filtered.isEmpty
                  ? _trong('Chưa có tài khoản để hiển thị.')
                  : RefreshIndicator(
                      onRefresh: () => _taiChoView(0),
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final u = filtered[i];
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: LtsT.of(ctx).surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: LtsT.of(ctx).border),
                              boxShadow: LtsT.shadowSm,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                          '${u.fullName} (@${u.account})',
                                          style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w800)),
                                    ),
                                    if (u.isSystem)
                                      const _ChipNho('Hệ thống',
                                          Color(0xFF6B7280))
                                    else
                                      _ChipNho(
                                          u.isActive
                                              ? 'Đang hoạt động'
                                              : 'Đã vô hiệu',
                                          u.isActive
                                              ? const Color(0xFF16A34A)
                                              : const Color(0xFFDC2626)),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text('${u.policies.length} quyền',
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF6B7280))),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    OutlinedButton(
                                      onPressed: coQuyenQuyen
                                          ? () => _moCapQuyen(ctx, u)
                                          : null,
                                      child: const Text('Cấp / thu hồi quyền',
                                          style: TextStyle(fontSize: 12.5)),
                                    ),
                                    const Spacer(),
                                    if (coQuyenQL && !u.isSystem)
                                      Switch(
                                        value: u.isActive,
                                        onChanged: (v) async {
                                          try {
                                            await kichHoatTaiKhoanService(
                                                context
                                                    .read<AppState>()
                                                    .accessToken!,
                                                u.id,
                                                v);
                                            await _taiChoView(0);
                                          } catch (err) {
                                            _thongBaoLoi(err);
                                          }
                                        },
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
        if (coQuyenQL)
          Positioned(
            right: 16,
            bottom: 20,
            child: FloatingActionButton.extended(
              backgroundColor: const Color(0xFF5B4DFF),
              onPressed: () => _moTaoTaiKhoan(context),
              icon: const Icon(Icons.person_add_alt_rounded,
                  color: Colors.white),
              label: const Text('Tạo tài khoản',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ),
      ],
    );
  }

  Future<void> _moTaoTaiKhoan(BuildContext context) async {
    final acc = TextEditingController();
    fn(String label) => TextEditingController();
    final fullName = fn('fullName');
    final password = fn('password');
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 16,
            bottom: MediaQuery.viewInsetsOf(ctx).bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Tạo tài khoản mới',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            TextField(
                controller: acc,
                decoration: const InputDecoration(
                    labelText: 'Tài khoản đăng nhập')),
            const SizedBox(height: 10),
            TextField(
                controller: fullName,
                decoration:
                    const InputDecoration(labelText: 'Họ và tên')),
            const SizedBox(height: 10),
            TextField(
                controller: password,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Mật khẩu')),
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF5B4DFF)),
              onPressed: () async {
                if (acc.text.trim().isEmpty ||
                    password.text.isEmpty ||
                    fullName.text.trim().isEmpty) {
                  return;
                }
                try {
                  await taoTaiKhoanService(
                      context.read<AppState>().accessToken!,
                      acc.text.trim(),
                      password.text,
                      fullName.text.trim());
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  if (mounted) await _taiChoView(0);
                } catch (err) {
                  _thongBaoLoi(err);
                }
              },
              child: const Text('Tạo tài khoản'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _moCapQuyen(BuildContext context, TaiKhoanApi u) async {
    final token = context.read<AppState>().accessToken!;
    final catalog = _policyCatalog;
    if (catalog == null || catalog.isEmpty) return;
    final selected = {
      for (final c in u.policies) c: true,
    };

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Quyền — @${u.account}',
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: catalog.length,
                  itemBuilder: (c, i) {
                    final pol = catalog[i];
                    final chon = selected[pol.code] ?? false;
                    return CheckboxListTile(
                      dense: true,
                      value: chon,
                      title: Text(pol.name,
                          style: const TextStyle(fontSize: 13.5)),
                      subtitle: Text(pol.code,
                          style: const TextStyle(
                              fontSize: 10.5, color: Color(0xFF9AA3B2))),
                      onChanged: (v) =>
                          setSheet(() => selected[pol.code] = v ?? false),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF5B4DFF)),
                onPressed: () async {
                  try {
                    final hienTai =
                        u.policies.toSet();
                    final moi = selected.entries
                        .where((e) => e.value && !hienTai.contains(e.key))
                        .map((e) => e.key)
                        .toList();
                    final bo = selected.entries
                        .where((e) => !e.value && hienTai.contains(e.key))
                        .map((e) => e.key)
                        .toList();
                    if (moi.isNotEmpty) {
                      await capQuyenService(token, u.id, moi);
                    }
                    if (bo.isNotEmpty) {
                      await thuHoiQuyenService(token, u.id, bo);
                    }
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    if (mounted) await _taiChoView(0);
                  } catch (err) {
                    _thongBaoLoi(err);
                  }
                },
                child: const Text('Lưu thay đổi quyền'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── View 2: Vai trò ──────────────────────────────────────────────────────
  Widget _viewVaiTro(BuildContext context) {
    final coQuyen = context
            .read<AppState>()
            .nguoiDungHienTai
            ?.coQuyen('ROLE_MANAGER') ??
        false;
    final roles = _roles ?? const <VaiTroApi>[];
    return Stack(
      children: [
        roles.isEmpty
            ? _trong('Chưa có vai trò nào.')
            : RefreshIndicator(
                onRefresh: () => _taiChoView(1),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 90),
                  itemCount: roles.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final r = roles[i];
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: LtsT.of(ctx).surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: LtsT.of(ctx).border),
                        boxShadow: LtsT.shadowSm,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text('${r.name} (${r.code})',
                                    style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800)),
                              ),
                              if (r.isSystem)
                                const _ChipNho(
                                    'Hệ thống', Color(0xFF6B7280)),
                            ],
                          ),
                          if ((r.description ?? '').isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(r.description!,
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF6B7280))),
                            ),
                          const SizedBox(height: 6),
                          Text('${r.policies.length} quyền',
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF6B7280))),
                          if (coQuyen && !r.isSystem) ...[
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                OutlinedButton(
                                  onPressed: () => _moSuaVaiTro(ctx, r),
                                  child: const Text('Sửa',
                                      style: TextStyle(fontSize: 12.5)),
                                ),
                                const SizedBox(width: 8),
                                TextButton(
                                  onPressed: () async {
                                    final ok = await showDialog<bool>(
                                      context: ctx,
                                      builder: (d) => AlertDialog(
                                        title: Text('Xóa vai trò "${r.name}"?'),
                                        actions: [
                                          TextButton(
                                              onPressed: () =>
                                                  Navigator.pop(d, false),
                                              child: const Text('Hủy')),
                                          FilledButton(
                                              style: FilledButton.styleFrom(
                                                  backgroundColor:
                                                      const Color(
                                                          0xFFDC2626)),
                                              onPressed: () =>
                                                  Navigator.pop(d, true),
                                              child: const Text('Xóa')),
                                        ],
                                      ),
                                    );
                                    if (ok == true) {
                                      try {
                                        await xoaVaiTroService(
                                            context
                                                .read<AppState>()
                                                .accessToken!,
                                            r.code);
                                        await _taiChoView(1);
                                      } catch (err) {
                                        _thongBaoLoi(err);
                                      }
                                    }
                                  },
                                  child: const Text('Xóa',
                                      style: TextStyle(
                                          fontSize: 12.5,
                                          color: Color(0xFFDC2626))),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
              ),
        if (coQuyen)
          Positioned(
            right: 16,
            bottom: 20,
            child: FloatingActionButton.extended(
              backgroundColor: const Color(0xFF5B4DFF),
              onPressed: () => _moSuaVaiTro(context, null),
              icon:
                  const Icon(Icons.add_moderator_rounded, color: Colors.white),
              label: const Text('Tạo vai trò',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ),
      ],
    );
  }

  Future<void> _moSuaVaiTro(BuildContext context, VaiTroApi? r) async {
    final token = context.read<AppState>().accessToken!;
    final catalog = _policyCatalog;
    if (catalog == null) return;
    final code = TextEditingController(text: r?.code ?? '');
    final name = TextEditingController(text: r?.name ?? '');
    final desc = TextEditingController(text: r?.description ?? '');
    final selected = {
      for (final c in r?.policies ?? const <String>[]) c: true,
    };

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 16,
              bottom: MediaQuery.viewInsetsOf(ctx).bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(r == null ? 'Tạo vai trò' : 'Sửa vai trò ${r.name}',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              TextField(
                  controller: code,
                  enabled: r == null,
                  decoration: const InputDecoration(
                      labelText: 'Mã vai trò (code)')),
              const SizedBox(height: 10),
              TextField(
                  controller: name,
                  decoration:
                      const InputDecoration(labelText: 'Tên vai trò')),
              const SizedBox(height: 10),
              TextField(
                  controller: desc,
                  decoration:
                      const InputDecoration(labelText: 'Mô tả')),
              const SizedBox(height: 10),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Chọn quyền',
                    style: TextStyle(
                        fontSize: 12.5, fontWeight: FontWeight.w700)),
              ),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: catalog.length,
                  itemBuilder: (c, i) {
                    final pol = catalog[i];
                    return CheckboxListTile(
                      dense: true,
                      value: selected[pol.code] ?? false,
                      title: Text(pol.name,
                          style: const TextStyle(fontSize: 13.5)),
                      onChanged: (v) =>
                          setSheet(() => selected[pol.code] = v ?? false),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF5B4DFF)),
                onPressed: () async {
                  if (name.text.trim().isEmpty || code.text.trim().isEmpty) {
                    return;
                  }
                  try {
                    await luuVaiTroService(
                      token,
                      code: code.text.trim(),
                      name: name.text.trim(),
                      description: desc.text.trim(),
                      policyCodes: selected.entries
                          .where((e) => e.value)
                          .map((e) => e.key)
                          .toList(),
                    );
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    if (mounted) await _taiChoView(1);
                  } catch (err) {
                    _thongBaoLoi(err);
                  }
                },
                child: const Text('Lưu vai trò'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── View 3: Yêu cầu đặt lại mật khẩu ────────────────────────────────────
  Widget _viewYeuCauMK(BuildContext context) {
    final reqs = _resetRequests ?? const <YeuCauDatLaiMatKhauApi>[];
    if (reqs.isEmpty) {
      return _trong('Không có yêu cầu đặt lại mật khẩu.');
    }
    return RefreshIndicator(
      onRefresh: () => _taiChoView(2),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 30),
        itemCount: reqs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (ctx, i) {
          final r = reqs[i];
          final choDuyet = r.status == 'pending';
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: LtsT.of(ctx).surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: LtsT.of(ctx).border),
              boxShadow: LtsT.shadowSm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text('@${r.account}',
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w800)),
                    ),
                    _ChipNho(
                        choDuyet
                            ? 'Chờ duyệt'
                            : r.status == 'verified'
                                ? 'Đã xác thực'
                                : 'Đã duyệt',
                        choDuyet
                            ? const Color(0xFFD97706)
                            : const Color(0xFF16A34A)),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Gửi lúc: ${r.createdAt}',
                    style: const TextStyle(
                        fontSize: 11.5, color: Color(0xFF6B7280))),
                if (choDuyet)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => _duyetReset(ctx, r, 'rejected'),
                            child: const Text('Từ chối',
                                style: TextStyle(
                                    fontSize: 12.5,
                                    color: Color(0xFFDC2626))),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF16A34A)),
                            onPressed: () => _duyetReset(ctx, r, 'accepted'),
                            child: const Text('Duyệt',
                                style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _duyetReset(
      BuildContext context, YeuCauDatLaiMatKhauApi r, String decision) async {
    try {
      final kq = await duyetYeuCauDatLaiMatKhauService(
          context.read<AppState>().accessToken!, r.id, decision);
      if (!mounted) return;
      await _taiChoView(2);
      if (decision == 'accepted' && kq.code != null && mounted) {
        showDialog(
          context: context,
          builder: (d) => AlertDialog(
            title: const Text('Đã duyệt — mã xác thực'),
            content: SelectableText(kq.code!,
                style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 4)),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(d),
                  child: const Text('Đóng')),
            ],
          ),
        );
      }
    } catch (err) {
      _thongBaoLoi(err);
    }
  }

  // ── View 4: Bảng phân quyền (theo vai trò — chỉ xem) ────────────────────
  Widget _viewMaTran(BuildContext context) {
    final roles = _roles ?? const <VaiTroApi>[];
    final users = _users ?? const <TaiKhoanApi>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 30),
      children: [
        const Text('Theo vai trò',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        for (final r in roles)
          ExpansionTile(
            tilePadding: const EdgeInsets.symmetric(horizontal: 10),
            title: Text('${r.name} (${r.code})',
                style: const TextStyle(fontSize: 13.5)),
            subtitle: Text('${r.policies.length} quyền',
                style: const TextStyle(fontSize: 11.5)),
            children: [
              for (final c in r.policies)
                ListTile(
                  dense: true,
                  leading: const Icon(Icons.verified_outlined,
                      size: 16, color: Color(0xFF16A34A)),
                  title: Text(c, style: const TextStyle(fontSize: 12.5)),
                ),
            ],
          ),
        const SizedBox(height: 14),
        const Text('Theo tài khoản',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        for (final u in users)
          ExpansionTile(
            tilePadding: const EdgeInsets.symmetric(horizontal: 10),
            title: Text('@${u.account}',
                style: const TextStyle(fontSize: 13.5)),
            subtitle: Text('${u.policies.length} quyền',
                style: const TextStyle(fontSize: 11.5)),
            children: [
              for (final c in u.policies)
                ListTile(
                  dense: true,
                  leading: const Icon(Icons.verified_outlined,
                      size: 16, color: Color(0xFF16A34A)),
                  title: Text(c, style: const TextStyle(fontSize: 12.5)),
                ),
            ],
          ),
      ],
    );
  }
}

class _ChipNho extends StatelessWidget {
  final String text;
  final Color color;
  const _ChipNho(this.text, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(text,
          style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: color)),
    );
  }
}
