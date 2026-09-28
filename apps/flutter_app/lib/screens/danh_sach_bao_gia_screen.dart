// ═══════════════════════════════════════════════════════════════════════════
// DanhSachBaoGiaScreen — mirror web mobile ModuleDuyetBaoGia.tsx (qrev-mcard).
//
// Nguồn dữ liệu 2 chế độ (mirror web `nguon`):
//   - list   : GET /quotations          (nguồn mặc định, có chip lọc trạng thái)
//   - review : GET /quotations/non-draft (chip "Chờ tôi duyệt", chỉ QUOTATION_REVIEWER)
//
// Bố cục 1 hàng lọc (mirror LocSheet): [search][⚙ Bộ lọc (badge)] → mở bottom
// sheet chứa chips. Card (mirror qrev-mcard):
//   r1  : mã BG .................... pill trạng thái (○/● + nhãn)
//   KH  : tên khách hàng (rút gọn "… 3 cụm cuối")
//   sub : ngày cập nhật (toLocaleString vi-VN)
//   foot: chevron ▸/▾ + avatar người lập | [PDF][Link][Mở lại][Xoá] [Nộp|Duyệt/Từ chối|icon]
//   mở rộng: lý do từ chối → danh sách sheet → tóm tắt phản hồi KH
//
// Hành động nhanh (tất cả cần PIN theo PinGuard của BE):
//   - Nộp duyệt (drafted + createdBy === current user)
//   - Duyệt/Từ chối (submitted + QUOTATION_REVIEWER) — từ chối nhập lý do trước
//   - Xoá (original.deletable)
//   - Tạo LSX từ sheet approved
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import 'package:lts_pricing/lib/bo_dau.dart';
import 'package:lts_pricing/lib/lsx_so.dart';
import '../store/app_state.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/auth/pin_sheets.dart';
import '../widgets/lts/lts_overlay.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';
import 'tao_bao_gia_wizard.dart';
import 'tao_lsx_wizard.dart';

// ── Avatar người lập (mirror web ten-hien-thi.ts) ──────────────────────────
const _avatarPalette = <Color>[
  Color(0xFF4F46E5),
  Color(0xFF0891B2),
  Color(0xFF059669),
  Color(0xFFD97706),
  Color(0xFFDB2777),
  Color(0xFF7C3AED),
  Color(0xFF0EA5E9),
  Color(0xFF65A30D),
];

Color _mauAvatarTen(String? ten) {
  final s = ten ?? '';
  if (s.isEmpty) return _avatarPalette.first;
  var sum = 0;
  for (final r in s.runes) {
    sum += r;
  }
  return _avatarPalette[sum.abs() % _avatarPalette.length];
}

/// 2 chữ cái đầu của 2 từ cuối (mirror `layChuCaiDau`).
String _chuCaiDau(String? ten) {
  final tu = (ten ?? '').split(' ').where((t) => t.isNotEmpty).toList();
  final cuoi = tu.length > 2 ? tu.sublist(tu.length - 2) : tu;
  return cuoi.map((w) => w[0]).join().toUpperCase();
}

/// Tên KH "… 3 cụm cuối" (mirror `rutGonTenKhachHang`).
String _rutGonTenKhachHang(String? ten) {
  final tu = (ten ?? '').split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();
  if (tu.isEmpty) return '—';
  if (tu.length <= 3) return tu.join(' ');
  return '… ${tu.sublist(tu.length - 3).join(' ')}';
}

// ── Label helpers (mirror web tenBaoGia/tenKhachHang) ──────────────────────

String _tenBaoGia(BaoGiaApi bg) {
  // Tên BG lưu trong inputValue.quotationName (Flutter/web wizard ghi).
  final iv = bg.inputValue;
  final ten = (iv?['quotationName'] as String?)?.trim();
  if (ten != null && ten.isNotEmpty) return ten;
  return bg.quotationName ?? bg.description ?? 'Báo giá';
}

String _tenKhachHang(BaoGiaApi bg) {
  final sheet = bg.pricingSheets.isNotEmpty ? bg.pricingSheets.first : null;
  final input = sheet?.inputValue;
  final v = (input?['customer'] as String?)?.trim();
  if (v != null && v.isNotEmpty) return v;
  final code = sheet?.customerCodeName?.trim();
  if (code != null && code.isNotEmpty) return code;
  final name = sheet?.customerName?.trim();
  if (name != null && name.isNotEmpty) return name;
  return '—';
}

/// Mã BG cũ lưu trong inputValue.quoteCode (mirror docMaBaoGiaTuPhanTu).
String _maBaoGiaTuInput(BaoGiaApi bg) {
  final iv = bg.inputValue;
  final v = iv?['quoteCode'];
  if (v is String) return v.trim();
  return '';
}

/// Chuỗi gom từ khóa để search (mirror web `tuKhoaBaoGia`), đã bỏ dấu.
String _tuKhoaTimKiem(BaoGiaApi bg, String maBg) {
  final parts = <String>[
    maBg,
    _tenBaoGia(bg),
    _tenKhachHang(bg),
  ];
  for (final sh in bg.pricingSheets) {
    parts.add(sh.pricingSheetName ?? '');
    final iv = sh.inputValue;
    parts.add((iv['productName'] as String?) ?? '');
    parts.add((iv['customer'] as String?) ?? '');
    parts.add(sh.customerCodeName ?? '');
    parts.add(sh.customerName ?? '');
  }
  return boDau(parts.where((e) => e.isNotEmpty).join(' '));
}

/// Bộ lọc chip — 1-1 với 4 status server (mirror web BoLoc).
enum _BoLoc { all, drafted, submitted, approved, rejected }

/// Nguồn dữ liệu (mirror web `nguon`).
enum _Nguon { list, review }

class DanhSachBaoGiaScreen extends StatefulWidget {
  const DanhSachBaoGiaScreen({super.key});

  @override
  State<DanhSachBaoGiaScreen> createState() => _DanhSachBaoGiaScreenState();
}

class _DanhSachBaoGiaScreenState extends State<DanhSachBaoGiaScreen> {
  List<BaoGiaApi> _tatCa = const [];
  bool _dangTai = false;
  String? _loi;
  _Nguon _nguon = _Nguon.list;
  _BoLoc _boLoc = _BoLoc.all;
  String _query = '';
  String? _expandedId;
  String? _dangXuLySheetId;
  Timer? _autoRefresh;

  /// Chip lọc trạng thái (mirror web CHIP_LABELS).
  static const _chips = <(_BoLoc, String)>[
    (_BoLoc.all, 'Tất cả'),
    (_BoLoc.drafted, 'Khởi tạo'),
    (_BoLoc.submitted, 'Chờ duyệt'),
    (_BoLoc.approved, 'Đã duyệt'),
    (_BoLoc.rejected, 'Bị từ chối'),
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
      final ds = _nguon == _Nguon.review
          ? await layBaoGiaChoDuyetService(token)
          : await layDanhSachBaoGiaService(token);
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

  /// Map bg.id → mã BG (YYMM.STT derive từ orders; fallback quoteCode).
  Map<String, String> _maBaoGiaMap(AppState s) {
    final ordersMap = s.ordersTheoBaoGia;
    final out = <String, String>{};
    for (final bg in _tatCa) {
      final derived = quoteCodeTuBaoGia(bg.createdAt, ordersMap[bg.id]);
      out[bg.id] = derived.isNotEmpty ? derived : _maBaoGiaTuInput(bg);
    }
    return out;
  }

  bool _thuocBoLoc(TrangThaiBaoGiaServer tt, _BoLoc loc) {
    switch (loc) {
      case _BoLoc.all:
        return true;
      case _BoLoc.drafted:
        return tt == TrangThaiBaoGiaServer.drafted;
      case _BoLoc.submitted:
        return tt == TrangThaiBaoGiaServer.submitted;
      case _BoLoc.approved:
        return tt == TrangThaiBaoGiaServer.approved;
      case _BoLoc.rejected:
        return tt == TrangThaiBaoGiaServer.rejected;
    }
  }

  List<BaoGiaApi> _hienThi(Map<String, String> maMap) {
    final q = boDau(_query.trim());
    return _tatCa.where((bg) {
      // Nguồn 'review' bỏ qua bộ lọc trạng thái (mirror web ketQua).
      if (_nguon == _Nguon.list && !_thuocBoLoc(bg.trangThai, _boLoc)) {
        return false;
      }
      if (q.isEmpty) return true;
      return _tuKhoaTimKiem(bg, maMap[bg.id] ?? '').contains(q);
    }).toList();
  }

  Map<_BoLoc, int> get _demTheoChip {
    final out = <_BoLoc, int>{
      _BoLoc.all: _tatCa.length,
      _BoLoc.drafted: 0,
      _BoLoc.submitted: 0,
      _BoLoc.approved: 0,
      _BoLoc.rejected: 0,
    };
    for (final bg in _tatCa) {
      out[_BoLoc.drafted] =
          out[_BoLoc.drafted]! + (bg.trangThai == TrangThaiBaoGiaServer.drafted ? 1 : 0);
      out[_BoLoc.submitted] = out[_BoLoc.submitted]! +
          (bg.trangThai == TrangThaiBaoGiaServer.submitted ? 1 : 0);
      out[_BoLoc.approved] = out[_BoLoc.approved]! +
          (bg.trangThai == TrangThaiBaoGiaServer.approved ? 1 : 0);
      out[_BoLoc.rejected] = out[_BoLoc.rejected]! +
          (bg.trangThai == TrangThaiBaoGiaServer.rejected ? 1 : 0);
    }
    return out;
  }

  void _chonChip(_BoLoc key) {
    setState(() {
      _nguon = _Nguon.list;
      _boLoc = key;
    });
    _tai(force: true);
  }

  void _chonNguonReview() {
    setState(() {
      _nguon = _Nguon.review;
      _boLoc = _BoLoc.all;
    });
    _tai(force: true);
  }

  /// Mở bottom sheet "Bộ lọc" (mirror LocSheet) chứa chips + chip "Chờ tôi duyệt".
  Future<void> _moBoLoc(bool laNguoiDuyet, Map<_BoLoc, int> dem) async {
    await showLtsSheet<void>(
      context,
      title: 'Bộ lọc',
      builder: (ctx) => SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final c in _chips)
                _ChipPill(
                  label: c.$2,
                  count: dem[c.$1] ?? 0,
                  active: _nguon == _Nguon.list && _boLoc == c.$1,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _chonChip(c.$1);
                  },
                ),
              if (laNguoiDuyet)
                _ChipPill(
                  label: 'Chờ tôi duyệt',
                  count: null,
                  active: _nguon == _Nguon.review,
                  dashed: true,
                  icon: Icons.inbox_outlined,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _chonNguonReview();
                  },
                ),
            ],
          ),
        ),
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
          child: Text('Cần đăng nhập để xem báo giá.',
              style: TextStyle(fontSize: 13, color: p.muted)),
        ),
      );
    }
    final dem = _demTheoChip;
    final maMap = _maBaoGiaMap(s);
    final hienThi = _hienThi(maMap);
    final laNguoiDuyet =
        s.nguoiDungHienTai?.policies.contains('QUOTATION_REVIEWER') ?? false;
    final soLuongLoc =
        (_nguon == _Nguon.review ? 1 : 0) + (_boLoc != _BoLoc.all ? 1 : 0);

    return RefreshIndicator(
      onRefresh: () => _tai(force: true),
      child: CustomScrollView(
        slivers: [
          // ── Header: title + đếm + Làm mới ────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Danh sách báo giá (${hienThi.length})',
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: p.text),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _dangTai ? null : () => _tai(force: true),
                    icon: _dangTai
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.refresh, size: 16),
                    label: const Text('Làm mới'),
                  ),
                ],
              ),
            ),
          ),
          // ── Search + nút Bộ lọc (mirror LocSheet 1 hàng) ──────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        isDense: true,
                        hintText: 'Tìm số BG, khách hàng, sản phẩm...',
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
                  const SizedBox(width: 8),
                  _NutBoLoc(
                    soLuong: soLuongLoc,
                    onTap: () => _moBoLoc(laNguoiDuyet, dem),
                  ),
                ],
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
          else if (_dangTai && _tatCa.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Text('Đang tải báo giá...',
                    style: TextStyle(fontSize: 14, color: p.muted)),
              ),
            )
          else if (_tatCa.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyBaoGia(nguonReview: _nguon == _Nguon.review),
            )
          else if (hienThi.isEmpty)
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
                itemCount: hienThi.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (ctx, i) {
                  final bg = hienThi[i];
                  return _BaoGiaCard(
                    bg: bg,
                    maBaoGia: maMap[bg.id] ?? '',
                    accessToken: s.accessToken,
                    expanded: _expandedId == bg.id,
                    laNguoiDuyet: laNguoiDuyet,
                    currentUserId: s.nguoiDungHienTai?.id ?? '',
                    onTap: () => setState(() {
                      _expandedId = _expandedId == bg.id ? null : bg.id;
                    }),
                    onDuyet: (approved) => _duyet(bg, approved),
                    onNop: () => _nop(bg),
                    onXoa: () => _xoa(bg),
                    onSua: () => _sua(bg),
                    onTaoLsx: (sheet) => _taoLsx(bg, sheet),
                    dangXuLySheetId: _dangXuLySheetId,
                    onKhachDuyet: (sheet) => _customerDecide(bg, sheet, true),
                    onKhachTuChoi: (sheet) => _customerDecide(bg, sheet, false),
                    onXemPdf: () =>
                        s.xuatBaoGiaPdf(bg, quoteCode: maMap[bg.id] ?? ''),
                    onCopyLink: () => _saoChepLienKet(bg),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  // ── Nộp duyệt (PIN) ───────────────────────────────────────────────────────
  Future<void> _nop(BaoGiaApi bg) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    final ok = await showNhapPinSheet(
      context,
      title: 'Gửi duyệt báo giá',
      message: 'Bạn có chắc muốn gửi báo giá "${_tenBaoGia(bg)}" để duyệt?',
      confirmLabel: 'Xác nhận nộp',
      onConfirm: (pinToken) async {
        setState(() => _dangTai = true);
        try {
          await nopBaoGiaService(token, bg.id, pinToken: pinToken);
        } finally {
          if (mounted) setState(() => _dangTai = false);
        }
      },
    );
    if (ok == true && mounted) {
      LtsToast.show(context, 'Đã nộp báo giá để chờ duyệt.',
          type: LtsToastType.success);
      await _tai(force: true);
    }
  }

  // ── Duyệt / Từ chối (PIN; từ chối nhập lý do trước) ──────────────────────
  Future<void> _duyet(BaoGiaApi bg, bool approved) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;

    String? lyDo;
    if (!approved) {
      lyDo = await _nhapLyDoDialog();
      if (lyDo == null || lyDo.trim().isEmpty) return;
      if (!mounted) return;
    }

    final ok = await showNhapPinSheet(
      context,
      title: approved ? 'Duyệt báo giá' : 'Từ chối báo giá',
      message: approved
          ? 'Bạn có chắc muốn duyệt báo giá "${_tenBaoGia(bg)}"?'
          : 'Bạn có chắc muốn từ chối báo giá "${_tenBaoGia(bg)}"?\nLý do: ${lyDo!.trim()}',
      confirmLabel: 'Xác nhận',
      onConfirm: (pinToken) async {
        setState(() => _dangTai = true);
        try {
          await duyetBaoGiaService(
            token,
            bg.id,
            approved: approved,
            statusReason: approved ? null : lyDo,
            pinToken: pinToken,
          );
        } finally {
          if (mounted) setState(() => _dangTai = false);
        }
      },
    );
    if (ok == true && mounted) {
      LtsToast.show(context,
          approved ? 'Đã duyệt báo giá.' : 'Đã từ chối báo giá.',
          type: LtsToastType.success);
      await _tai(force: true);
    }
  }

  /// Dialog nhập lý do bắt buộc (mirror web NhapLyDoTruocPinModal).
  Future<String?> _nhapLyDoDialog() {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Từ chối báo giá'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Nhập lý do từ chối (bắt buộc):',
                  style: TextStyle(fontSize: 13)),
              const SizedBox(height: 8),
              TextField(
                controller: controller,
                autofocus: true,
                maxLines: 3,
                maxLength: 500,
                onChanged: (_) => setDlg(() {}),
                decoration:
                    const InputDecoration(hintText: 'Ví dụ: Sai số lượng...'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: controller.text.trim().isEmpty
                  ? null
                  : () => Navigator.of(ctx).pop(controller.text.trim()),
              child: const Text('Tiếp tục'),
            ),
          ],
        ),
      ),
    );
  }

  // ── Xoá (PIN) ─────────────────────────────────────────────────────────────
  Future<void> _xoa(BaoGiaApi bg) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    final ok = await showNhapPinSheet(
      context,
      title: 'Xóa báo giá',
      message:
          'Bạn có chắc muốn xóa báo giá "${_tenBaoGia(bg)}"? Hành động này không thể hoàn tác.',
      confirmLabel: 'Xác nhận xoá',
      onConfirm: (pinToken) async {
        setState(() => _dangTai = true);
        try {
          await xoaBaoGiaService(token, bg.id, pinToken: pinToken);
        } finally {
          if (mounted) setState(() => _dangTai = false);
        }
      },
    );
    if (ok == true && mounted) {
      LtsToast.show(context, 'Đã xóa báo giá.', type: LtsToastType.success);
      await _tai(force: true);
    }
  }

  // ── Tạo LSX: mở wizard (PIN nằm trong wizard) ────────────────────────────
  Future<void> _taoLsx(BaoGiaApi bg, PricingSheetApi sheet) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TaoLsxWizard(
          prefillQuotationId: bg.id,
          prefillSheetId: sheet.id,
        ),
      ),
    );
    if (mounted) await _tai(force: true);
  }

  // ── Mở lại/sửa báo giá: tải bản mới nhất rồi mở wizard edit ──────────────
  Future<void> _sua(BaoGiaApi bg) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() => _dangTai = true);
    try {
      final fresh = await layBaoGiaTheoIdService(token, bg.id);
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => TaoBaoGiaWizard(suaBaoGia: fresh),
        ),
      );
    } catch (err) {
      if (!mounted) return;
      LtsToast.show(
        context,
        err is LoiServiceLts
            ? err.message
            : 'Không tải được báo giá để chỉnh sửa.',
        type: LtsToastType.error,
      );
    } finally {
      if (mounted) {
        setState(() => _dangTai = false);
        await _tai(force: true);
      }
    }
  }

  // ── Sao chép liên kết chia sẻ BG (deep-link web /bao-gia/<id>) ───────────
  Future<void> _saoChepLienKet(BaoGiaApi bg) async {
    final url = ServiceLtsClient.instance.taoUrlChiaSeBaoGia(bg.id);
    if (url == null) {
      LtsToast.show(context, 'Báo giá chưa có mã để chia sẻ.',
          type: LtsToastType.warning);
      return;
    }
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    LtsToast.show(context, 'Đã sao chép liên kết', type: LtsToastType.success);
  }

  // ── Phản hồi KH từng sheet (customer-decide, PIN) ─────────────────────────
  Future<void> _customerDecide(
    BaoGiaApi bg,
    PricingSheetApi sheet,
    bool approved,
  ) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    final sheetLabel = sheet.pricingSheetName ?? sheet.id;
    final hanhDong = approved ? 'duyệt' : 'bỏ';
    final ok = await showNhapPinSheet(
      context,
      title: 'Xác nhận phản hồi khách',
      message: 'Đánh dấu khách đã $hanhDong bảng tính "$sheetLabel"?',
      confirmLabel: 'Xác nhận',
      onConfirm: (pinToken) async {
        setState(() => _dangXuLySheetId = sheet.id);
        try {
          await customerDecideBaoGiaService(
            token,
            bg.id,
            decisions: [(pricingSheetId: sheet.id, approved: approved)],
            pinToken: pinToken,
          );
        } finally {
          if (mounted) setState(() => _dangXuLySheetId = null);
        }
      },
    );
    if (ok == true && mounted) {
      LtsToast.show(context, 'Đã ghi nhận khách $hanhDong bảng tính.',
          type: LtsToastType.success);
      await _tai(force: true);
    }
  }
}

/// Empty state (mirror web qrev-empty): icon + p + span, khác nhau theo nguồn.
class _EmptyBaoGia extends StatelessWidget {
  final bool nguonReview;
  const _EmptyBaoGia({required this.nguonReview});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: CustomPaint(
          painter: _DashedRoundedBorder(color: p.border, radius: 12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 56),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.inbox_outlined,
                    size: 40, color: p.dim.withValues(alpha: 0.4)),
                const SizedBox(height: 10),
                Text(
                  nguonReview
                      ? 'Không có báo giá nào đang chờ duyệt.'
                      : 'Chưa có báo giá nào.',
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: p.text),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  nguonReview
                      ? 'Báo giá sẽ xuất hiện khi nhân viên nộp duyệt.'
                      : 'Tạo báo giá ở mục “Tạo bảng báo giá”.',
                  style: TextStyle(fontSize: 13, color: p.muted),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Nút "⚙ Bộ lọc" + badge số điều kiện đang lọc (mirror .lts-loc-open).
class _NutBoLoc extends StatelessWidget {
  final int soLuong;
  final VoidCallback onTap;
  const _NutBoLoc({required this.soLuong, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Material(
      color: p.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: p.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          height: 44,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.tune, size: 15, color: p.text),
                const SizedBox(width: 6),
                Text('Bộ lọc',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: p.text)),
                if (soLuong > 0) ...[
                  const SizedBox(width: 6),
                  Container(
                    constraints: const BoxConstraints(minWidth: 18),
                    height: 18,
                    padding: const EdgeInsets.symmetric(horizontal: 5),
                    decoration: BoxDecoration(
                      color: p.accent,
                      borderRadius: BorderRadius.circular(9),
                    ),
                    alignment: Alignment.center,
                    child: Text('$soLuong',
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.white)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Chip lọc pill (mirror .qrev-chip / .qrev-chip--review nét đứt).
class _ChipPill extends StatelessWidget {
  final String label;
  final int? count;
  final bool active;
  final bool dashed;
  final IconData? icon;
  final VoidCallback onTap;
  const _ChipPill({
    required this.label,
    required this.count,
    required this.active,
    required this.onTap,
    this.dashed = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final fg = active ? Colors.white : p.text;
    final borderColor = active ? p.accent : p.border;
    final content = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 5),
          ],
          Text(label,
              style: TextStyle(
                  fontSize: 12.5, fontWeight: FontWeight.w600, color: fg)),
          if (count != null) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              decoration: BoxDecoration(
                color: active
                    ? Colors.white.withValues(alpha: 0.25)
                    : Colors.black.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text('$count',
                  style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
            ),
          ],
        ],
      ),
    );
    // Nét đứt (mirror .qrev-chip--review border-style: dashed) — Flutter không
    // hỗ trợ dashed gốc nên vẽ bằng CustomPaint khi chip không active.
    if (dashed && !active) {
      return Material(
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
          side: BorderSide.none,
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(999),
          child: CustomPaint(
            painter: _DashedRoundedBorder(color: borderColor, radius: 999),
            child: content,
          ),
        ),
      );
    }
    return Material(
      color: active ? p.accent : p.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(999),
        side: BorderSide(color: borderColor),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: content,
      ),
    );
  }
}

/// Vẽ viền nét đứt bo tròn (mirror CSS `border-style: dashed`).
class _DashedRoundedBorder extends CustomPainter {
  final Color color;
  final double radius;
  const _DashedRoundedBorder({required this.color, required this.radius});

  @override
  void paint(Canvas canvas, Size size) {
    final r = Rect.fromLTWH(0.5, 0.5, size.width - 1, size.height - 1);
    final rr = RRect.fromRectAndRadius(r, Radius.circular(radius));
    final path = Path()..addRRect(rr);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    const dash = 4.0;
    const gap = 3.0;
    for (final metric in path.computeMetrics()) {
      var dist = 0.0;
      while (dist < metric.length) {
        final next = (dist + dash).clamp(0.0, metric.length);
        canvas.drawPath(metric.extractPath(dist, next), paint);
        dist = next + gap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRoundedBorder old) =>
      old.color != color || old.radius != radius;
}

class _BaoGiaCard extends StatelessWidget {
  final BaoGiaApi bg;
  final String maBaoGia;
  final String? accessToken;
  final bool expanded;
  final bool laNguoiDuyet;
  final String currentUserId;
  final VoidCallback onTap;
  final void Function(bool approved) onDuyet;
  final VoidCallback onNop;
  final VoidCallback onXoa;
  final VoidCallback onSua;
  final void Function(PricingSheetApi sheet) onTaoLsx;
  final String? dangXuLySheetId;
  final void Function(PricingSheetApi sheet) onKhachDuyet;
  final void Function(PricingSheetApi sheet) onKhachTuChoi;
  final VoidCallback onXemPdf;
  final VoidCallback onCopyLink;
  const _BaoGiaCard({
    required this.bg,
    required this.maBaoGia,
    required this.accessToken,
    required this.expanded,
    required this.laNguoiDuyet,
    required this.currentUserId,
    required this.onTap,
    required this.onDuyet,
    required this.onNop,
    required this.onXoa,
    required this.onSua,
    required this.onTaoLsx,
    required this.dangXuLySheetId,
    required this.onKhachDuyet,
    required this.onKhachTuChoi,
    required this.onXemPdf,
    required this.onCopyLink,
  });

  /// Nhãn pill trạng thái (mirror web mcard status pill).
  (String, Color) _pill(LtsPalette p) {
    final coNutDuyet = (bg.trangThai == TrangThaiBaoGiaServer.drafted &&
            bg.createdBy == currentUserId) ||
        (bg.trangThai == TrangThaiBaoGiaServer.submitted && laNguoiDuyet);
    if (coNutDuyet) {
      return bg.trangThai == TrangThaiBaoGiaServer.submitted
          ? ('● Chờ duyệt', p.orange)
          : ('○ Bản nháp', p.muted);
    }
    switch (bg.trangThai) {
      case TrangThaiBaoGiaServer.approved:
        return ('● Đã duyệt', p.green);
      case TrangThaiBaoGiaServer.rejected:
        return ('● Từ chối', p.red);
      case TrangThaiBaoGiaServer.submitted:
        return ('● Chờ duyệt', p.orange);
      case TrangThaiBaoGiaServer.drafted:
        return ('○ Chưa nộp', p.muted);
      case TrangThaiBaoGiaServer.unknown:
        return ('○ Chưa nộp', p.muted);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final isCreator = bg.createdBy == currentUserId;
    final coNutGuiDuyet =
        bg.trangThai == TrangThaiBaoGiaServer.drafted && isCreator;
    final coNutDuyet =
        bg.trangThai == TrangThaiBaoGiaServer.submitted && laNguoiDuyet;
    final coTheXoa = bg.deletable;
    // Phản hồi KH: chỉ người tạo báo giá, khi BG đã duyệt.
    final coThePhanHoi =
        bg.trangThai == TrangThaiBaoGiaServer.approved && isCreator;

    // Trạng thái KH duyệt từng sheet (từ quotationPricingSheets).
    final approvalById = <String, bool?>{
      for (final l in bg.pricingSheetLinks) l.sheet.id: l.hasCustomerApproved,
    };
    final demDaDuyet = approvalById.values.where((v) => v == true).length;
    final demTuChoi = approvalById.values.where((v) => v == false).length;
    final tongSheet = bg.pricingSheets.length;
    final demCho = tongSheet - demDaDuyet - demTuChoi;

    final (nhanTrangThai, mauTrangThai) = _pill(p);
    final kh = _tenKhachHang(bg);
    final actor = bg.actorName?.trim();
    final ngayIso = bg.updatedAt.isNotEmpty ? bg.updatedAt : bg.createdAt;

    return LtsCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Dòng 1: mã BG + pill trạng thái
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          maBaoGia.isEmpty ? '—' : maBaoGia,
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                            color: p.text,
                            letterSpacing: 0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      LtsStatusChip(
                        label: nhanTrangThai,
                        fg: mauTrangThai,
                        bg: mauTrangThai.withValues(alpha: 0.12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Dòng 2: tên khách hàng (rút gọn 3 cụm cuối)
                  Text(
                    _rutGonTenKhachHang(kh),
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: p.text),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  // Dòng 3: ngày cập nhật
                  Text(
                    Fmt.dateTimeSec(ngayIso),
                    style: TextStyle(fontSize: 12, color: p.muted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          // Footer: chevron + avatar | nhóm Thao tác + nhóm Duyệt
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 0, 6, 6),
            child: Row(
              children: [
                IconButton(
                  onPressed: onTap,
                  tooltip: expanded ? 'Thu gọn' : 'Mở rộng',
                  icon: Icon(
                    expanded
                        ? Icons.keyboard_arrow_down_rounded
                        : Icons.keyboard_arrow_right_rounded,
                    size: 20,
                    color: p.muted,
                  ),
                  visualDensity: VisualDensity.compact,
                  padding: const EdgeInsets.all(4),
                  constraints:
                      const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
                const SizedBox(width: 2),
                if (actor != null && actor.isNotEmpty)
                  _NguoiLapAvatar(
                    ten: actor,
                    avatarUrl: bg.avatarUrlResolved,
                    accessToken: accessToken,
                  )
                else
                  Text('—', style: TextStyle(fontSize: 12, color: p.dim)),
                const SizedBox(width: 4),
                // Nút hành động: canh phải, tự cuộn ngang nếu màn quá hẹp
                // (mirror web .qrev-mcard-actions flex-shrink:0).
                Expanded(
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      reverse: true,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // renderHanhDong: PDF · Link · Mở lại · Xoá
                          _ActionBtn(
                            icon: Icons.visibility_outlined,
                            tooltip: 'Xem PDF báo giá',
                            onTap: onXemPdf,
                          ),
                          _ActionBtn(
                            icon: Icons.link,
                            tooltip: 'Sao chép liên kết',
                            onTap: onCopyLink,
                          ),
                          _ActionBtn(
                            icon: Icons.edit_outlined,
                            tooltip: 'Mở lại báo giá',
                            onTap: onSua,
                            color: p.accent,
                          ),
                          if (coTheXoa)
                            _ActionBtn(
                              icon: Icons.delete_outline,
                              tooltip: 'Xóa',
                              onTap: onXoa,
                              color: const Color(0xFFB91C1C),
                            ),
                          // renderDuyet: Nộp | Duyệt/Từ chối | icon tĩnh | dash
                          if (coNutGuiDuyet)
                            _ActionBtn(
                              icon: Icons.send_outlined,
                              tooltip: 'Nộp duyệt',
                              onTap: onNop,
                              color: p.accent,
                            )
                          else if (coNutDuyet) ...[
                            _ActionBtn(
                              icon: Icons.check_circle_outline,
                              tooltip: 'Duyệt',
                              onTap: () => onDuyet(true),
                              color: const Color(0xFF16A34A),
                            ),
                            _ActionBtn(
                              icon: Icons.cancel_outlined,
                              tooltip: 'Từ chối',
                              onTap: () => onDuyet(false),
                              color: const Color(0xFFDC2626),
                            ),
                          ] else if (bg.trangThai ==
                              TrangThaiBaoGiaServer.approved)
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8),
                              child: Icon(Icons.check_circle,
                                  size: 16, color: Color(0xFF16A34A)),
                            )
                          else if (bg.trangThai ==
                              TrangThaiBaoGiaServer.rejected)
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8),
                              child: Icon(Icons.cancel,
                                  size: 16, color: Color(0xFFDC2626)),
                            )
                          else
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 10),
                              child: Text('-',
                                  style: TextStyle(
                                      fontSize: 13, color: p.muted)),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Phần mở rộng (mirror renderChiTietBaoGia)
          if (expanded)
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
                  // Lý do từ chối (mirror web: đặt trong phần mở rộng)
                  if (bg.trangThai == TrangThaiBaoGiaServer.rejected &&
                      bg.statusReason != null &&
                      bg.statusReason!.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        border: Border.all(color: const Color(0xFFFECACA)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.cancel_outlined,
                              size: 14, color: Color(0xFFB91C1C)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                                'Lý do bị từ chối: ${bg.statusReason}',
                                style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFFB91C1C))),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  if (bg.pricingSheets.isEmpty)
                    Text('Báo giá này không có bảng tính nào.',
                        style: TextStyle(fontSize: 12.5, color: p.muted))
                  else ...[
                    for (final sh in bg.pricingSheets) ...[
                      _SheetRow(
                        sh: sh,
                        daKhachDuyet: approvalById[sh.id],
                        approvedBG:
                            bg.trangThai == TrangThaiBaoGiaServer.approved,
                        coThePhanHoi: coThePhanHoi,
                        dangXuLy: dangXuLySheetId == sh.id,
                        onTaoLsx: () => onTaoLsx(sh),
                        onKhachDuyet: () => onKhachDuyet(sh),
                        onKhachTuChoi: () => onKhachTuChoi(sh),
                      ),
                      const SizedBox(height: 4),
                    ],
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Tóm tắt: $demDaDuyet/$tongSheet đã duyệt • '
                        '$demTuChoi/$tongSheet KH đã từ chối • '
                        '$demCho/$tongSheet chờ'
                        '${!coThePhanHoi && bg.trangThai == TrangThaiBaoGiaServer.approved ? ' (Chỉ người tạo báo giá mới có thể cập nhật phản hồi khách.)' : ''}',
                        style: TextStyle(
                            fontSize: 11,
                            fontStyle: FontStyle.italic,
                            color: p.muted),
                      ),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Avatar người lập (mirror AvatarNguoiLap): ảnh server nếu có, else chữ cái đầu.
class _NguoiLapAvatar extends StatelessWidget {
  final String ten;
  final String? avatarUrl;
  final String? accessToken;
  const _NguoiLapAvatar({
    required this.ten,
    this.avatarUrl,
    this.accessToken,
  });

  @override
  Widget build(BuildContext context) {
    final coAnh = avatarUrl != null && avatarUrl!.isNotEmpty;
    final fallback = Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: _mauAvatarTen(ten),
      ),
      alignment: Alignment.center,
      child: Text(_chuCaiDau(ten),
          style: const TextStyle(
              fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white)),
    );
    return Tooltip(
      message: ten,
      child: coAnh
          ? ClipOval(
              child: Image.network(
                avatarUrl!,
                width: 22,
                height: 22,
                fit: BoxFit.cover,
                headers: accessToken != null && accessToken!.isNotEmpty
                    ? {'Authorization': 'Bearer $accessToken'}
                    : null,
                errorBuilder: (_, __, ___) => fallback,
              ),
            )
          : fallback,
    );
  }
}

class _SheetRow extends StatelessWidget {
  final PricingSheetApi sh;
  final bool? daKhachDuyet;
  final bool approvedBG;
  final bool coThePhanHoi;
  final bool dangXuLy;
  final VoidCallback onTaoLsx;
  final VoidCallback onKhachDuyet;
  final VoidCallback onKhachTuChoi;
  const _SheetRow({
    required this.sh,
    required this.daKhachDuyet,
    required this.approvedBG,
    required this.coThePhanHoi,
    required this.dangXuLy,
    required this.onTaoLsx,
    required this.onKhachDuyet,
    required this.onKhachTuChoi,
  });
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final coTheTaoLsx = approvedBG && daKhachDuyet == true;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: p.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sh.pricingSheetName ?? sh.id,
                  style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600, color: p.text),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (daKhachDuyet == true)
                  Text('✅ Khách đã duyệt',
                      style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: p.green)),
                if (daKhachDuyet == false)
                  Text('❌ KH đã từ chối',
                      style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: p.red)),
              ],
            ),
          ),
          const SizedBox(width: 6),
          // Nút phản hồi KH (chỉ creator + BG approved) + Tạo LSX
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (coThePhanHoi && daKhachDuyet != true)
                _SheetBtn(
                  icon: Icons.check,
                  label: 'KH Duyệt',
                  color: const Color(0xFF047857),
                  onTap: dangXuLy ? null : onKhachDuyet,
                ),
              if (coThePhanHoi && daKhachDuyet != true) const SizedBox(width: 4),
              if (coThePhanHoi && daKhachDuyet != false)
                _SheetBtn(
                  icon: Icons.close,
                  label: 'KH từ chối',
                  color: const Color(0xFFB91C1C),
                  onTap: dangXuLy ? null : onKhachTuChoi,
                ),
              if (coThePhanHoi && daKhachDuyet != false) const SizedBox(width: 4),
              if (coTheTaoLsx)
                _SheetBtn(
                  icon: Icons.precision_manufacturing_outlined,
                  label: 'Tạo LSX',
                  color: p.accent,
                  onTap: onTaoLsx,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Nút nhỏ có viền hộp (mirror web .qrev-btn).
class _SheetBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;
  const _SheetBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final fg = onTap == null ? p.dim : color;
    return Material(
      color: p.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(7),
        side: BorderSide(color: fg.withValues(alpha: 0.5)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(7),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 13, color: fg),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600, color: fg),
              ),
            ],
          ),
        ),
      ),
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
    final fg = color ?? p.muted;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Material(
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(color: color ?? p.border),
        ),
        child: Tooltip(
          message: tooltip,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 36,
              height: 36,
              child: Icon(icon, size: 17, color: fg),
            ),
          ),
        ),
      ),
    );
  }
}
