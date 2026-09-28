// ═══════════════════════════════════════════════════════════════════════════
// TaiKhoanScreen — mirror ModulePhanQuyen.tsx (mức web mobile).
//
// Đổi 28/09/2026: bỏ TabBar — mỗi mục là 1 MÀN RIÊNG (view param), mirror
// web tách card. Danh sách tài khoản redesign học KhachHangScreen (search +
// chip lọc + LtsCard). Tap 1 tài khoản → popup to trượt từ dưới (phân quyền).
//
// 4 view:
//   TaiKhoanView.taiKhoan      — danh sách + popup cấp/thu hồi quyền
//   TaiKhoanView.vaiTro        — list + tạo/sửa/xóa vai trò
//   TaiKhoanView.yeuCauMK      — duyệt / từ chối yêu cầu đặt lại MK
//   TaiKhoanView.bangPhanQuyen — ma trận quyền theo vai trò / tài khoản (chỉ xem)
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:lts_pricing/lib/audit_format.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';

enum TaiKhoanView { taiKhoan, vaiTro, yeuCauMK, bangPhanQuyen }

/// Tên tiếng Việt của policy (mirror web `POLICY_CATALOG`). Fallback về code
/// khi policy mới chưa có trong map.
String _tenQuyen(String code) => POLICY_LABELS[code] ?? code;

class TaiKhoanScreen extends StatefulWidget {
  /// Mục đang mở — mỗi giá trị là 1 màn riêng (không còn TabBar).
  final TaiKhoanView view;
  const TaiKhoanScreen({super.key, this.view = TaiKhoanView.taiKhoan});

  @override
  State<TaiKhoanScreen> createState() => _TaiKhoanScreenState();
}

typedef _PolicyCatalogItem = ({String code, String name, String description});

class _TaiKhoanScreenState extends State<TaiKhoanScreen> {
  List<TaiKhoanApi>? _users;
  List<VaiTroApi>? _roles;
  List<YeuCauDatLaiMatKhauApi>? _resetRequests;
  List<_PolicyCatalogItem>? _policyCatalog;
  String? _loi;
  bool _dangTai = false;

  // ── Danh sách tài khoản: search + chip lọc ──
  String _query = '';
  String _chip = 'all'; // all | active | inactive

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _tai());
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
      switch (widget.view) {
        case TaiKhoanView.taiKhoan:
          _users = await layTaiKhoanService(token);
          _policyCatalog ??= await layDanhSachPolicyService(token)
              .catchError((_) => <_PolicyCatalogItem>[]);
        case TaiKhoanView.vaiTro:
          _roles = await layVaiTroService(token);
          _policyCatalog ??= await layDanhSachPolicyService(token)
              .catchError((_) => <_PolicyCatalogItem>[]);
        case TaiKhoanView.yeuCauMK:
          _resetRequests = await layYeuCauDatLaiMatKhauService(token);
        case TaiKhoanView.bangPhanQuyen:
          _roles = await layVaiTroService(token);
          _users = await layTaiKhoanService(token);
      }
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
    if (!s.isAuthenticated) return const SizedBox.shrink();
    if (_loi != null) return _loiView();
    switch (widget.view) {
      case TaiKhoanView.taiKhoan:
        return _manTaiKhoan(context, s.nguoiDungHienTai!);
      case TaiKhoanView.vaiTro:
        return _manVaiTro(context);
      case TaiKhoanView.yeuCauMK:
        return _manYeuCauMK(context);
      case TaiKhoanView.bangPhanQuyen:
        return _manBangPhanQuyen(context);
    }
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
                onPressed: _tai, child: const Text('Thử lại')),
          ],
        ),
      );

  Widget _trong(String text) => Center(
        child: Text(text,
            style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
      );

  // ── Màn 1: Tài khoản (học KhachHangScreen) ───────────────────────────────
  Widget _manTaiKhoan(BuildContext context, NguoiDungHienTai user) {
    final p = LtsT.of(context);
    final coQuyenQL = user.coQuyen('ACCOUNT_MANAGER');
    final all = _users ?? const <TaiKhoanApi>[];
    final q = _query.trim().toLowerCase();

    final filtered = all.where((u) {
      if (_chip == 'active' && !u.isActive) return false;
      if (_chip == 'inactive' && u.isActive) return false;
      if (q.isEmpty) return true;
      return u.account.toLowerCase().contains(q) ||
          u.fullName.toLowerCase().contains(q) ||
          u.policies.any((c) => c.toLowerCase().contains(q));
    }).toList();

    final dem = {
      'all': all.length,
      'active': all.where((u) => u.isActive).length,
      'inactive': all.where((u) => !u.isActive).length,
    };

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: coQuyenQL
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF5B4DFF),
              onPressed: () => _moTaoTaiKhoan(context),
              icon: const Icon(Icons.person_add_alt_rounded,
                  color: Colors.white),
              label: const Text('Tạo tài khoản',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700)),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _tai,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: TextField(
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: 'Tìm tài khoản, họ tên, mã quyền…',
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
                        ('active', 'Đang hoạt động'),
                        ('inactive', 'Đã vô hiệu'),
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
                            child:
                                CircularProgressIndicator(strokeWidth: 2)),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            if (_users == null)
              const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()))
            else if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Text('Không có tài khoản phù hợp',
                      style: TextStyle(fontSize: 13, color: p.muted)),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 90),
                sliver: SliverList.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final u = filtered[i];
                    return _TaiKhoanCard(
                      u: u,
                      onTap: () => _moPopupTaiKhoan(context, u),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _moPopupTaiKhoan(BuildContext context, TaiKhoanApi u) async {
    final s = context.read<AppState>();
    final user = s.nguoiDungHienTai!;
    final coQuyenQuyen = user.coQuyen('USER_POLICY_GRANT') ||
        user.coQuyen('USER_POLICY_REVOKE');
    final coQuyenQL = user.coQuyen('ACCOUNT_MANAGER');
    final catalog = _policyCatalog ?? const <_PolicyCatalogItem>[];
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _PopupTaiKhoan(
        user: u,
        catalog: catalog,
        coQuyenQuyen: coQuyenQuyen,
        coQuyenQL: coQuyenQL,
      ),
    );
    if (changed == true && mounted) await _tai();
  }

  Future<void> _moTaoTaiKhoan(BuildContext context) async {
    final acc = TextEditingController();
    final fullName = TextEditingController();
    final password = TextEditingController();
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
                decoration: const InputDecoration(labelText: 'Họ và tên')),
            const SizedBox(height: 10),
            TextField(
                controller: password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Mật khẩu')),
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
                  if (mounted) await _tai();
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
    acc.dispose();
    fullName.dispose();
    password.dispose();
  }

  // ── Màn 2: Vai trò ───────────────────────────────────────────────────────
  Widget _manVaiTro(BuildContext context) {
    final s = context.read<AppState>();
    final coQuyen = s.nguoiDungHienTai?.coQuyen('ROLE_MANAGER') ?? false;
    final token = s.accessToken;
    final roles = _roles ?? const <VaiTroApi>[];
    return Stack(
      children: [
        if (_roles == null)
          const Center(child: CircularProgressIndicator())
        else if (roles.isEmpty)
          _trong('Chưa có vai trò nào.')
        else
          RefreshIndicator(
            onRefresh: _tai,
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
                            const _ChipNho('Hệ thống', Color(0xFF6B7280)),
                        ],
                      ),
                      if ((r.description ?? '').isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(r.description!,
                              style: const TextStyle(
                                  fontSize: 12, color: Color(0xFF6B7280))),
                        ),
                      const SizedBox(height: 6),
                      Text('${r.policies.length} quyền',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF6B7280))),
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
                                                  const Color(0xFFDC2626)),
                                          onPressed: () =>
                                              Navigator.pop(d, true),
                                          child: const Text('Xóa')),
                                    ],
                                  ),
                                );
                                if (ok == true && token != null) {
                                  try {
                                    await xoaVaiTroService(token, r.code);
                                    if (mounted) await _tai();
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
                  decoration: const InputDecoration(labelText: 'Tên vai trò')),
              const SizedBox(height: 10),
              TextField(
                  controller: desc,
                  decoration: const InputDecoration(labelText: 'Mô tả')),
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
                      title: Text(_tenQuyen(pol.code),
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
                    if (mounted) await _tai();
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
    code.dispose();
    name.dispose();
    desc.dispose();
  }

  // ── Màn 3: Yêu cầu đặt lại mật khẩu ─────────────────────────────────────
  Widget _manYeuCauMK(BuildContext context) {
    if (_resetRequests == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final reqs = _resetRequests!;
    if (reqs.isEmpty) {
      return _trong('Không có yêu cầu đặt lại mật khẩu.');
    }
    return RefreshIndicator(
      onRefresh: _tai,
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
                            onPressed: () => _duyetReset(r, 'rejected'),
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
                            onPressed: () => _duyetReset(r, 'accepted'),
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
      YeuCauDatLaiMatKhauApi r, String decision) async {
    final token = context.read<AppState>().accessToken;
    if (token == null) return;
    try {
      final kq = await duyetYeuCauDatLaiMatKhauService(token, r.id, decision);
      if (!mounted) return;
      await _tai();
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

  // ── Màn 4: Bảng phân quyền (theo vai trò — chỉ xem) ──────────────────────
  Widget _manBangPhanQuyen(BuildContext context) {
    if (_roles == null || _users == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final roles = _roles!;
    final users = _users!;
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
                  title: Text(_tenQuyen(c),
                      style: const TextStyle(fontSize: 12.5)),
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
                  title: Text(_tenQuyen(c),
                      style: const TextStyle(fontSize: 12.5)),
                ),
            ],
          ),
      ],
    );
  }
}

// ── Card tài khoản (học _KhachHangCard) ─────────────────────────────────────
class _TaiKhoanCard extends StatelessWidget {
  final TaiKhoanApi u;
  final VoidCallback onTap;
  const _TaiKhoanCard({required this.u, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final Color badgeColor;
    final String badgeText;
    if (u.isSystem) {
      badgeColor = const Color(0xFF6B7280);
      badgeText = 'Hệ thống';
    } else if (u.isActive) {
      badgeColor = p.green;
      badgeText = 'Đang hoạt động';
    } else {
      badgeColor = p.red;
      badgeText = 'Đã vô hiệu';
    }
    final hien = u.policies.take(3).toList();
    final conLai = u.policies.length - hien.length;

    return LtsCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('${u.fullName} (@${u.account})',
                    style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: p.text)),
              ),
              _ChipNho(badgeText, badgeColor),
            ],
          ),
          const SizedBox(height: 6),
          Text('${u.policies.length} quyền',
              style: TextStyle(fontSize: 12, color: p.muted)),
          if (hien.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final c in hien) _PolicyChip(code: c),
                if (conLai > 0)
                  _ChipNho('+$conLai', const Color(0xFF64748B)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _PolicyChip extends StatelessWidget {
  final String code;
  const _PolicyChip({required this.code});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFF5B4DFF).withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(_tenQuyen(code),
          style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: Color(0xFF5B4DFF))),
    );
  }
}

// ── Popup phân quyền (to, trượt từ dưới lên) ─────────────────────────────────
class _PopupTaiKhoan extends StatefulWidget {
  final TaiKhoanApi user;
  final List<_PolicyCatalogItem> catalog;
  final bool coQuyenQuyen;
  final bool coQuyenQL;
  const _PopupTaiKhoan({
    required this.user,
    required this.catalog,
    required this.coQuyenQuyen,
    required this.coQuyenQL,
  });

  @override
  State<_PopupTaiKhoan> createState() => _PopupTaiKhoanState();
}

class _PopupTaiKhoanState extends State<_PopupTaiKhoan> {
  late Set<String> _hienTai;
  late Set<String> _selected;
  late bool _isActive;
  String _query = '';
  bool _dangLuu = false;

  @override
  void initState() {
    super.initState();
    _hienTai = widget.user.policies.toSet();
    _selected = {..._hienTai};
    _isActive = widget.user.isActive;
  }

  List<_PolicyCatalogItem> get _filteredCatalog {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return widget.catalog;
    return widget.catalog
        .where((p) =>
            p.code.toLowerCase().contains(q) ||
            p.name.toLowerCase().contains(q) ||
            _tenQuyen(p.code).toLowerCase().contains(q))
        .toList();
  }

  int get _soThem =>
      _selected.where((c) => !_hienTai.contains(c)).length;
  int get _soThuHoi =>
      _hienTai.where((c) => !_selected.contains(c)).length;

  bool get _coThayDoiQuyen => _soThem > 0 || _soThuHoi > 0;
  bool get _choSuaQuyen =>
      widget.coQuyenQuyen && _isActive && !widget.user.isSystem;

  Future<void> _doiTrangThai(bool v) async {
    try {
      await kichHoatTaiKhoanService(
          context.read<AppState>().accessToken!, widget.user.id, v);
      if (mounted) setState(() => _isActive = v);
    } catch (err) {
      if (!mounted) return;
      LtsToast.show(
        context,
        err is LoiServiceLts ? err.message : 'Đổi trạng thái thất bại.',
        type: LtsToastType.error,
      );
    }
  }

  Future<void> _luu() async {
    if (!_coThayDoiQuyen) {
      Navigator.pop(context, true);
      return;
    }
    setState(() => _dangLuu = true);
    final token = context.read<AppState>().accessToken!;
    try {
      final moi = _selected.where((c) => !_hienTai.contains(c)).toList();
      final bo = _hienTai.where((c) => !_selected.contains(c)).toList();
      if (moi.isNotEmpty) await capQuyenService(token, widget.user.id, moi);
      if (bo.isNotEmpty) await thuHoiQuyenService(token, widget.user.id, bo);
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (err) {
      if (!mounted) return;
      setState(() => _dangLuu = false);
      LtsToast.show(
        context,
        err is LoiServiceLts ? err.message : 'Lưu quyền thất bại.',
        type: LtsToastType.error,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final u = widget.user;
    final catalog = _filteredCatalog;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, controller) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: p.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(u.fullName,
                          style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: p.text)),
                      const SizedBox(height: 3),
                      Text('@${u.account}',
                          style: TextStyle(fontSize: 12.5, color: p.muted)),
                    ],
                  ),
                ),
                _ChipNho(
                    u.isSystem
                        ? 'Hệ thống'
                        : (_isActive ? 'Đang hoạt động' : 'Đã vô hiệu'),
                    u.isSystem
                        ? const Color(0xFF6B7280)
                        : (_isActive ? p.green : p.red)),
              ],
            ),
          ),
          if (widget.coQuyenQL && !u.isSystem)
            SwitchListTile(
              dense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 20),
              title: const Text('Kích hoạt tài khoản',
                  style: TextStyle(fontSize: 13.5)),
              value: _isActive,
              onChanged: _doiTrangThai,
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: TextField(
              decoration: InputDecoration(
                isDense: true,
                hintText: 'Tìm quyền…',
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
          if (!_choSuaQuyen && !u.isSystem)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
              child: Row(
                children: [
                  Icon(Icons.visibility_outlined, size: 14, color: p.muted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      _isActive
                          ? 'Bạn không có quyền cấp / thu hồi — chỉ xem.'
                          : 'Tài khoản đã vô hiệu — không thể phân quyền.',
                      style: TextStyle(fontSize: 11.5, color: p.muted),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: catalog.isEmpty
                ? Center(
                    child: Text('Không có quyền phù hợp.',
                        style: TextStyle(fontSize: 13, color: p.muted)))
                : ListView.builder(
                    controller: controller,
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    itemCount: catalog.length,
                    itemBuilder: (ctx, i) {
                      final pol = catalog[i];
                      final chon = _selected.contains(pol.code);
                      return CheckboxListTile(
                        dense: true,
                        value: chon,
                        title: Text(_tenQuyen(pol.code),
                            style: const TextStyle(fontSize: 13.5)),
                        onChanged: _choSuaQuyen
                            ? (v) => setState(() {
                                  if (v == true) {
                                    _selected.add(pol.code);
                                  } else {
                                    _selected.remove(pol.code);
                                  }
                                })
                            : null,
                      );
                    },
                  ),
          ),
          Container(
            padding: EdgeInsets.fromLTRB(
                20, 10, 20, MediaQuery.viewInsetsOf(context).bottom + 16),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: p.border)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_coThayDoiQuyen)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '+$_soThem thêm  ·  −$_soThuHoi thu hồi',
                        style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF5B4DFF)),
                      ),
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _dangLuu
                            ? null
                            : () => Navigator.pop(context, false),
                        child: const Text('Hủy'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF5B4DFF)),
                        onPressed: _dangLuu ? null : _luu,
                        child: _dangLuu
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : const Text('Lưu thay đổi',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
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
