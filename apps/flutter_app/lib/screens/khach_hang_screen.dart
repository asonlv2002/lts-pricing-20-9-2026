// ═══════════════════════════════════════════════════════════════════════════
// KhachHangScreen — mirror ModuleKhachHang.tsx (mức web mobile):
//   list GET /customers + search + 5 chip filter (Tất cả / Đang dùng /
//   Ngừng / Đã khóa / Chưa phân — có count badge) + tạo/sửa thông tin +
//   phân công người phụ trách.
//
// Từ 18/09/2026: truy cập qua hub `KhachHangHubScreen` (tab Khách hàng
// trong HomeShell), push từ `ModuleRoute` (đã có header back). Do đó
// screen này render thuần list, không cần LtsNavyHeader nội bộ.
//
// Tạo mới: 1-step bottom sheet (codeName + tất cả field) thay vì 2-step
// cũ — mirror web mobile CustomerForm.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';

class KhachHangScreen extends StatefulWidget {
  const KhachHangScreen({super.key});

  @override
  State<KhachHangScreen> createState() => _KhachHangScreenState();
}

class _KhachHangScreenState extends State<KhachHangScreen> {
  List<KhachHang>? _danhSach;
  String? _loi;
  bool _dangTai = false;
  String _query = '';
  // all | active | inactive | locked | unassigned
  String _chip = 'all';

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
      final ds = await layKhachHangService(token);
      if (mounted) setState(() => _danhSach = ds);
    } catch (err) {
      if (mounted) {
        setState(() =>
            _loi = err is LoiServiceLts ? err.message : 'Không tải được khách hàng.');
      }
    } finally {
      if (mounted) setState(() => _dangTai = false);
    }
  }

  Map<String, int> get _dem {
    final all = _danhSach ?? const <KhachHang>[];
    return {
      'all': all.length,
      'active': all.where((kh) => (kh.moiNhat?.status ?? '') == 'active').length,
      'inactive':
          all.where((kh) => (kh.moiNhat?.status ?? '') == 'inactive').length,
      'locked': all.where((kh) => kh.isLocked).length,
      'unassigned': all.where((kh) => kh.managers.isEmpty).length,
    };
  }

  List<KhachHang> get _filtered {
    final all = _danhSach ?? const <KhachHang>[];
    final q = _query.trim().toLowerCase();
    return all.where((kh) {
      final v = kh.moiNhat;
      final status = v?.status ?? '';
      if (_chip == 'active' && status != 'active') return false;
      if (_chip == 'inactive' && status != 'inactive') return false;
      if (_chip == 'locked' && !kh.isLocked) return false;
      if (_chip == 'unassigned' && kh.managers.isNotEmpty) return false;
      if (q.isEmpty) return true;
      return kh.codeName.toLowerCase().contains(q) ||
          (v?.organizationName.toLowerCase().contains(q) ?? false) ||
          (v?.contactName.toLowerCase().contains(q) ?? false) ||
          (v?.phoneNumber.contains(q) ?? false) ||
          (v?.email.toLowerCase().contains(q) ?? false) ||
          (v?.address.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final s = context.watch<AppState>();
    if (!s.isAuthenticated) {
      return const SizedBox.shrink();
    }
    final coQuyenSua = s.nguoiDungHienTai?.coQuyen('CUSTOMER_MANAGER') ?? false;
    final dem = _dem;

    return Scaffold(
      floatingActionButton: coQuyenSua
          ? FloatingActionButton.extended(
              onPressed: () => _moTaoMoi(context),
              icon: const Icon(Icons.person_add_alt_1_rounded),
              label: const Text('Thêm KH'),
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
                    hintText: 'Tìm mã, tổ chức, liên hệ, SĐT, email, địa chỉ…',
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
                        ('active', 'Đang dùng'),
                        ('inactive', 'Ngừng'),
                        ('locked', 'Đã khóa'),
                        ('unassigned', 'Chưa phân'),
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
            else if (_danhSach == null)
              const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()))
            else if (_filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Text('Không có khách hàng phù hợp',
                      style: TextStyle(fontSize: 13, color: p.muted)),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 90),
                sliver: SliverList.separated(
                  itemCount: _filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final kh = _filtered[i];
                    final v = kh.moiNhat;
                    return _KhachHangCard(
                      kh: kh,
                      v: v,
                      onTap: () => _moChiTiet(context, kh, coQuyenSua),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _moTaoMoi(BuildContext context) async {
    final codeCtrl = TextEditingController();
    final org = TextEditingController();
    final tax = TextEditingController();
    final contact = TextEditingController();
    final phone = TextEditingController();
    final email = TextEditingController();
    final address = TextEditingController();
    String status = 'active';
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 16,
              bottom: MediaQuery.viewInsetsOf(ctx).bottom + 24),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Tạo khách hàng mới',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                const Text(
                    'Nhập mã KH cùng thông tin liên hệ. Có thể bổ sung sau.',
                    style: TextStyle(
                        fontSize: 12.5, color: Color(0xFF6B7280))),
                const SizedBox(height: 14),
                _field(codeCtrl, 'Mã khách hàng (codeName)', required: true),
                _field(org, 'Tên công ty / tổ chức', required: true),
                _field(tax, 'Mã số thuế'),
                _field(contact, 'Người liên hệ', required: true),
                _field(phone, 'Số điện thoại',
                    keyboard: TextInputType.phone, required: true),
                _field(email, 'Email',
                    keyboard: TextInputType.emailAddress),
                _field(address, 'Địa chỉ giao hàng', maxLines: 2),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Text('Trạng thái:',
                        style: TextStyle(fontSize: 13)),
                    const SizedBox(width: 12),
                    ChoiceChip(
                        label: const Text('Đang dùng'),
                        selected: status == 'active',
                        onSelected: (_) =>
                            setSheet(() => status = 'active')),
                    const SizedBox(width: 8),
                    ChoiceChip(
                        label: const Text('Ngừng'),
                        selected: status == 'inactive',
                        onSelected: (_) =>
                            setSheet(() => status = 'inactive')),
                  ],
                ),
                const SizedBox(height: 16),
                FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF5B4DFF)),
                  onPressed: () async {
                    final code = codeCtrl.text.trim();
                    final ten = org.text.trim();
                    final lh = contact.text.trim();
                    final sdt = phone.text.trim();
                    if (code.isEmpty || ten.isEmpty || lh.isEmpty || sdt.isEmpty) {
                      LtsToast.show(
                        ctx,
                        'Cần nhập mã KH, tên tổ chức, người liên hệ và SĐT.',
                        type: LtsToastType.warning,
                      );
                      return;
                    }
                    final token = context.read<AppState>().accessToken!;
                    try {
                      // Bước 1: tạo codeName (POST /customers).
                      final kh = await taoMaKhachHangService(token, code);
                      // Bước 2: PATCH /customers/:codeName để ghi version đầu tiên.
                      await luuThongTinKhachHangService(
                        token,
                        code,
                        organizationName: ten,
                        taxCode: tax.text.trim().isEmpty ? null : tax.text.trim(),
                        contactName: lh,
                        phoneNumber: sdt,
                        email: email.text.trim(),
                        address: address.text.trim(),
                        status: status,
                        changeNote: 'Tạo mới',
                      );
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx, true);
                      if (!mounted) return;
                      context.read<AppState>().themThongBao(
                          'Đã tạo khách hàng ${kh.codeName}.', 'Khách hàng');
                      await _tai();
                    } catch (err) {
                      if (!ctx.mounted) return;
                      LtsToast.show(
                        ctx,
                        err is LoiServiceLts
                            ? err.message
                            : 'Tạo khách hàng thất bại.',
                        type: LtsToastType.error,
                      );
                    }
                  },
                  child: const Text('Tạo khách hàng'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (saved == true) {
      codeCtrl.dispose();
      org.dispose();
      tax.dispose();
      contact.dispose();
      phone.dispose();
      email.dispose();
      address.dispose();
    } else {
      codeCtrl.dispose();
      org.dispose();
      tax.dispose();
      contact.dispose();
      phone.dispose();
      email.dispose();
      address.dispose();
    }
  }

  Future<void> _moChiTiet(
      BuildContext context, KhachHang kh, bool coQuyenSua) async {
    final v = kh.moiNhat;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(v?.organizationName ?? kh.codeName,
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(
                '${kh.codeName} · ${_trangThaiText(kh, v?.status)}',
                style: const TextStyle(
                    fontSize: 12, color: Color(0xFF6B7280))),
            const SizedBox(height: 12),
            _thongTin('MST', v?.taxCode ?? '—'),
            _thongTin('Người liên hệ', v?.contactName ?? '—'),
            _thongTin('SĐT', v?.phoneNumber ?? '—'),
            _thongTin('Email', v?.email ?? '—'),
            _thongTin('Địa chỉ', v?.address ?? '—'),
            _thongTin(
                'Người phụ trách',
                kh.managers.isEmpty
                    ? '—'
                    : kh.managers.map((m) => m.fullName).join(', ')),
            if (coQuyenSua) ...[
              const SizedBox(height: 14),
              FilledButton(
                style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF5B4DFF)),
                onPressed: () {
                  Navigator.pop(ctx);
                  _moSuaThongTin(context, kh);
                },
                child: const Text('Sửa thông tin'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _moPhanCong(context, kh);
                },
                child: const Text('Phân công người phụ trách'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _thongTin(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
                width: 120,
                child: Text(label,
                    style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF6B7280)))),
            Expanded(
                child: Text(value,
                    style: const TextStyle(fontSize: 12.5))),
          ],
        ),
      );

  String _trangThaiText(KhachHang kh, String? status) {
    if (kh.isLocked) return 'Đã khóa';
    if (status == 'active') return 'Đang dùng';
    if (status == 'inactive') return 'Ngừng';
    return status ?? '—';
  }

  Future<void> _moSuaThongTin(BuildContext context, KhachHang kh) async {
    final v = kh.moiNhat;
    final org = TextEditingController(text: v?.organizationName ?? '');
    final tax = TextEditingController(text: v?.taxCode ?? '');
    final contact = TextEditingController(text: v?.contactName ?? '');
    final phone = TextEditingController(text: v?.phoneNumber ?? '');
    final email = TextEditingController(text: v?.email ?? '');
    final address = TextEditingController(text: v?.address ?? '');
    String status = v?.status ?? 'active';
    final note = TextEditingController();

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
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Sửa thông tin — ${kh.codeName}',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 14),
                _field(org, 'Tên công ty / tổ chức'),
                _field(tax, 'Mã số thuế'),
                _field(contact, 'Người liên hệ'),
                _field(phone, 'Số điện thoại',
                    keyboard: TextInputType.phone),
                _field(email, 'Email',
                    keyboard: TextInputType.emailAddress),
                _field(address, 'Địa chỉ giao hàng', maxLines: 2),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Text('Trạng thái:',
                        style: TextStyle(fontSize: 13)),
                    const SizedBox(width: 12),
                    ChoiceChip(
                        label: const Text('Đang dùng'),
                        selected: status == 'active',
                        onSelected: (_) => setSheet(() => status = 'active')),
                    const SizedBox(width: 8),
                    ChoiceChip(
                        label: const Text('Ngừng'),
                        selected: status == 'inactive',
                        onSelected: (_) =>
                            setSheet(() => status = 'inactive')),
                  ],
                ),
                const SizedBox(height: 10),
                _field(note, 'Ghi chú thay đổi (changeNote)'),
                const SizedBox(height: 16),
                FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF5B4DFF)),
                  onPressed: () async {
                    if (org.text.trim().isEmpty ||
                        contact.text.trim().isEmpty) {
                      return;
                    }
                    final state = context.read<AppState>();
                    final token = state.accessToken!;
                    try {
                      await luuThongTinKhachHangService(
                        token,
                        kh.codeName,
                        organizationName: org.text.trim(),
                        taxCode: tax.text.trim(),
                        contactName: contact.text.trim(),
                        phoneNumber: phone.text.trim(),
                        email: email.text.trim(),
                        address: address.text.trim(),
                        status: status,
                        changeNote: note.text.trim(),
                      );
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx);
                      if (!mounted) return;
                      state.themThongBao(
                          'Đã lưu thông tin khách hàng ${kh.codeName}.',
                          'Khách hàng');
                      await _tai();
                    } catch (err) {
                      if (!ctx.mounted) return;
                      LtsToast.show(
                        ctx,
                        err is LoiServiceLts
                            ? err.message
                            : 'Lưu thông tin thất bại.',
                        type: LtsToastType.error,
                      );
                    }
                  },
                  child: const Text('Lưu thông tin'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
          {TextInputType? keyboard,
          int maxLines = 1,
          bool required = false}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: TextField(
          controller: c,
          keyboardType: keyboard,
          maxLines: maxLines,
          decoration: InputDecoration(
            labelText: required ? '$label *' : label,
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10)),
            isDense: true,
          ),
        ),
      );

  Future<void> _moPhanCong(BuildContext context, KhachHang kh) async {
    final s = context.read<AppState>();
    List<TaiKhoanApi>? accounts;
    try {
      accounts = await layTaiKhoanService(s.accessToken!);
    } catch (_) {}
    if (!mounted || accounts == null) return;
    final active = accounts.where((a) => a.isActive).toList();
    final selected = {
      for (final m in kh.managers)
        if (m.userId != null) m.userId!: true,
    };

    if (!context.mounted) return;
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
              Text('Phân công người phụ trách — ${kh.codeName}',
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: active.length,
                  itemBuilder: (c, i) => CheckboxListTile(
                    dense: true,
                    value: selected[active[i].id] ?? false,
                    title: Text(
                        '${active[i].fullName} (@${active[i].account})',
                        style: const TextStyle(fontSize: 13.5)),
                    onChanged: (v) =>
                        setSheet(() => selected[active[i].id] = v ?? false),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF5B4DFF)),
                onPressed: () async {
                  final token = s.accessToken!;
                  try {
                    await luuNguoiPhuTrachKhachHangService(
                        token,
                        kh.codeName,
                        selected.entries
                            .where((e) => e.value)
                            .map((e) => e.key)
                            .toList());
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    if (mounted) await _tai();
                  } catch (err) {
                    if (!ctx.mounted) return;
                    LtsToast.show(
                      ctx,
                      err is LoiServiceLts
                          ? err.message
                          : 'Lưu phân công thất bại.',
                      type: LtsToastType.error,
                    );
                  }
                },
                child: const Text('Lưu phân công'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KhachHangCard extends StatelessWidget {
  final KhachHang kh;
  final KhachHangVersion? v;
  final VoidCallback onTap;
  const _KhachHangCard({
    required this.kh,
    required this.v,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final status = v?.status ?? '';
    final isLocked = kh.isLocked;
    final Color badgeColor;
    final String badgeText;
    if (isLocked) {
      badgeColor = const Color(0xFFDC2626);
      badgeText = 'Đã khóa';
    } else if (status == 'active') {
      badgeColor = p.green;
      badgeText = 'Đang dùng';
    } else if (status == 'inactive') {
      badgeColor = p.muted;
      badgeText = 'Ngừng';
    } else {
      badgeColor = p.muted;
      badgeText = status.isEmpty ? '—' : status;
    }
    return LtsCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  (v?.organizationName.isNotEmpty == true
                          ? v!.organizationName
                          : kh.codeName),
                  style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      color: p.text),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(badgeText,
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: badgeColor)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(kh.codeName,
              style: TextStyle(fontSize: 11.5, color: p.muted)),
          const SizedBox(height: 6),
          Text(
              'LH: ${v?.contactName ?? '—'} · ${v?.phoneNumber ?? '—'}',
              style: TextStyle(fontSize: 12.5, color: p.text)),
          const SizedBox(height: 3),
          Text(
              'MST: ${v?.taxCode?.isNotEmpty == true ? v!.taxCode : '—'} · ${v?.email ?? '—'}',
              style: TextStyle(fontSize: 11.5, color: p.muted)),
          if (v?.address.isNotEmpty == true) ...[
            const SizedBox(height: 3),
            Text(v!.address,
                style: TextStyle(fontSize: 11.5, color: p.muted),
                maxLines: 2,
                overflow: TextOverflow.ellipsis),
          ],
          if (kh.managers.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
                'Phụ trách: ${kh.managers.map((m) => m.fullName).join(', ')}',
                style: TextStyle(fontSize: 11.5, color: p.muted)),
          ],
        ],
      ),
    );
  }
}
