// ═══════════════════════════════════════════════════════════════════════════
// Lệnh Sản Xuất (LSX) — mirror web mobile ModuleDanhSachLSX (qrev-mcard):
// header + nút Làm mới, 3 chip lọc Tất cả/Chờ duyệt/Đã duyệt, card Số LSX
// (derive BE b6028b0) + pill trạng thái duyệt + avatar người lập, actions
// Xem (PdfPreview) / Xuất PDF / Duyệt✓ / Từ chối✗ (PIN qua showNhapPinSheet).
// Trạng thái duyệt từ BE: hasAdvisorApproved + reason (mirror lsx-server-adapter).
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'package:lts_pricing/lib/file_share.dart';
import 'package:lts_pricing/lib/lsx_docx.dart';
import 'package:lts_pricing/lib/lsx_nang_cao.dart';
import '../widgets/auth/pin_sheets.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';
import 'tao_lsx_wizard.dart';

// ── Avatar người lập (mirror web ten-hien-thi.ts: layChuCaiDau/layMauAvatar) ─
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

String _chuCaiDau(String? ten) {
  final tu = (ten ?? '')
      .split(' ')
      .where((t) => t.isNotEmpty)
      .toList();
  final cuoi = tu.length > 2 ? tu.sublist(tu.length - 2) : tu;
  return cuoi.map((w) => w[0]).join().toUpperCase();
}

String _rutGonTenKhachHang(String? ten) {
  final tu = (ten ?? '')
      .split(RegExp(r'\s+'))
      .where((t) => t.isNotEmpty)
      .toList();
  if (tu.isEmpty) return '—';
  if (tu.length <= 3) return tu.join(' ');
  return '… ${tu.sublist(tu.length - 3).join(' ')}';
}

String _soLsx(ProductionOrder o) =>
    (o.manual['lsxNumber'] as String?) ?? o.id;

class LSXScreen extends StatefulWidget {
  const LSXScreen({super.key});

  @override
  State<LSXScreen> createState() => _LSXScreenState();
}

class _LSXScreenState extends State<LSXScreen> {
  String _query = '';
  String _chip = 'all'; // all | pending | approved
  String? _dangXuLyId;

  Future<void> _lamMoi() async {
    await context.read<AppState>().taiProductionOrdersTuServer();
  }

  // ── Duyệt / Từ chối (mirror web duyetLsx: PIN → PATCH approval) ───────────
  Future<void> _duyet(ProductionOrder order) async {
    final s = context.read<AppState>();
    final ok = await showNhapPinSheet(
      context,
      title: 'Duyệt LSX',
      message: 'Bạn có chắc muốn duyệt LSX "${_soLsx(order)}"?',
      confirmLabel: 'Xác nhận duyệt',
      onConfirm: (pinToken) async {
        setState(() => _dangXuLyId = order.id);
        try {
          await s.duyetLsx(order.id, true, pinToken);
        } finally {
          if (mounted) setState(() => _dangXuLyId = null);
        }
      },
    );
    if (ok == true && mounted) {
      LtsToast.show(context, 'Đã duyệt LSX. Có thể in/xuất PDF.',
          type: LtsToastType.success);
    }
  }

  Future<void> _tuChoi(ProductionOrder order) async {
    final lyDo = await _nhapLyDoDialog();
    if (lyDo == null || lyDo.trim().isEmpty) return;
    if (!mounted) return;
    final s = context.read<AppState>();
    final ok = await showNhapPinSheet(
      context,
      title: 'Từ chối LSX',
      message:
          'Bạn có chắc muốn từ chối LSX "${_soLsx(order)}"?\nLý do: ${lyDo.trim()}',
      confirmLabel: 'Xác nhận',
      onConfirm: (pinToken) async {
        setState(() => _dangXuLyId = order.id);
        try {
          await s.duyetLsx(order.id, false, pinToken, reason: lyDo.trim());
        } finally {
          if (mounted) setState(() => _dangXuLyId = null);
        }
      },
    );
    if (ok == true && mounted) {
      LtsToast.show(context,
          'Đã từ chối LSX. Vẫn ở trạng thái Chờ duyệt, có thể sửa & gửi lại.',
          type: LtsToastType.info);
    }
  }

  /// Dialog nhập lý do bắt buộc (mirror web NhapLyDoTruocPinModal).
  Future<String?> _nhapLyDoDialog() {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Từ chối LSX'),
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

  // ── Xem / Xuất PDF ────────────────────────────────────────────────────────
  Future<void> _xem(ProductionOrder order) async {
    final bytes = await _buildPdfBytes(order);
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => SizedBox(
        height: MediaQuery.of(ctx).size.height * 0.9,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text('Xem LSX — ${_soLsx(order)}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 14)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PdfPreview(
                build: (format) => bytes,
                pdfFileName: 'LSX_${order.id}.pdf',
                useActions: false,
                canChangeOrientation: false,
                canChangePageFormat: false,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _xuatPdf(ProductionOrder order) async {
    final bytes = await _buildPdfBytes(order);
    await Printing.layoutPdf(onLayout: (format) => bytes,
        name: 'LSX_${order.id}.pdf');
  }

  Future<void> _xuatDocx(ProductionOrder order) async {
    final bytes = LsxDocx.build(
      soLsx: _soLsx(order),
      snapshot: order.snapshot,
      manual: order.manual,
      nangCaoSpec: layNangCaoSpec(order),
    );
    await chiaSeTep(bytes, 'LSX_${order.id}.docx');
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final p = LtsT.of(context);
    if (!s.isAuthenticated) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text('Cần đăng nhập để xem danh sách LSX từ máy chủ.',
              style: TextStyle(fontSize: 13, color: p.muted)),
        ),
      );
    }

    final laNguoiDuyet =
        s.nguoiDungHienTai?.coQuyen('ORDER_REVIEWER') ?? false;

    // Sort createdAt desc (mirror web mapServerOrdersToLsxRows).
    final all = [...s.productionOrders]..sort((a, b) {
        final ta = DateTime.tryParse(a.createdAt)?.millisecondsSinceEpoch ?? 0;
        final tb = DateTime.tryParse(b.createdAt)?.millisecondsSinceEpoch ?? 0;
        return tb.compareTo(ta);
      });

    // Đếm theo chip (trên toàn bộ data, trước search — mirror demTheoChip).
    var demApproved = 0;
    for (final o in all) {
      if (o.laDaDuyet) demApproved++;
    }
    final demPending = all.length - demApproved;

    final q = _query.trim().toLowerCase();
    final filtered = all.where((o) {
      if (_chip == 'pending' && o.laDaDuyet) return false;
      if (_chip == 'approved' && !o.laDaDuyet) return false;
      if (q.isEmpty) return true;
      final soLsx = _soLsx(o).toLowerCase();
      final cus = (o.snapshot['customer'] ?? '').toString().toLowerCase();
      final name = (o.snapshot['productName'] ?? '').toString().toLowerCase();
      final structure =
          (o.snapshot['structure'] ?? '').toString().toLowerCase();
      return soLsx.contains(q) ||
          o.id.toLowerCase().contains(q) ||
          cus.contains(q) ||
          name.contains(q) ||
          structure.contains(q) ||
          o.quoteId.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _lamMoi,
        child: CustomScrollView(
          slivers: [
            // ── Header: title + đếm + Làm mới ──────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Danh sách LSX (${filtered.length})',
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: p.text),
                      ),
                    ),
                    TextButton.icon(
                      onPressed:
                          s.dangTaiLsx ? null : () => _lamMoi(),
                      icon: s.dangTaiLsx
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.refresh, size: 16),
                      label: const Text('Làm mới'),
                    ),
                  ],
                ),
              ),
            ),
            // ── Search ─────────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: TextField(
                  decoration: InputDecoration(
                    isDense: true,
                    hintText:
                        'Tìm số LSX, khách hàng, sản phẩm, mã BG...',
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
            // ── Chips lọc trạng thái ───────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _chipBtn('all', 'Tất cả', all.length),
                      _chipBtn('pending', 'Chờ duyệt', demPending),
                      _chipBtn('approved', 'Đã duyệt', demApproved),
                    ],
                  ),
                ),
              ),
            ),
            // ── Lỗi ────────────────────────────────────────────────────────
            if (s.loiLsx != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Text(s.loiLsx!,
                          style: const TextStyle(
                              fontSize: 13, color: Color(0xFFB42318))),
                      const SizedBox(height: 8),
                      OutlinedButton(
                          onPressed: _lamMoi,
                          child: const Text('Thử lại')),
                    ],
                  ),
                ),
              )
            // ── Loading lần đầu ────────────────────────────────────────────
            else if (s.dangTaiLsx && all.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 12),
                      Text('Đang tải LSX...',
                          style: TextStyle(fontSize: 13, color: p.muted)),
                    ],
                  ),
                ),
              )
            // ── Rỗng ───────────────────────────────────────────────────────
            else if (all.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inbox_outlined,
                          size: 56, color: p.dim),
                      const SizedBox(height: 12),
                      Text('Chưa có LSX nào.',
                          style: TextStyle(color: p.muted)),
                      const SizedBox(height: 4),
                      Text('Tạo LSX ở mục "Tạo lệnh sản xuất" trước.',
                          style: TextStyle(fontSize: 12, color: p.muted)),
                    ],
                  ),
                ),
              )
            else if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Text('Không tìm thấy LSX phù hợp',
                      style: TextStyle(fontSize: 13, color: p.muted)),
                ),
              )
            // ── Danh sách card ─────────────────────────────────────────────
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 88),
                sliver: SliverList.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) => _LSXCard(
                    order: filtered[i],
                    laNguoiDuyet: laNguoiDuyet,
                    dangXuLy: _dangXuLyId == filtered[i].id,
                    onXem: () => _xem(filtered[i]),
                    onXuatPdf: () => _xuatPdf(filtered[i]),
                    onXuatDocx: () => _xuatDocx(filtered[i]),
                    onDuyet: () => _duyet(filtered[i]),
                    onTuChoi: () => _tuChoi(filtered[i]),
                  ),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'lsx-fab-tao',
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => TaoLsxWizard(
                onSuccess: (order) {
                  // LSX list sẽ tự reload qua AppState.taiProductionOrdersTuServer
                  // được gọi bên trong wizard. Không cần làm gì thêm ở đây.
                },
              ),
            ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Tạo LSX'),
      ),
    );
  }

  Widget _chipBtn(String key, String label, int dem) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text('$label $dem', style: const TextStyle(fontSize: 12)),
        selected: _chip == key,
        onSelected: (_) => setState(() => _chip = key),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Card LSX — mirror web qrev-mcard
// ═══════════════════════════════════════════════════════════════════════════
class _LSXCard extends StatelessWidget {
  final ProductionOrder order;
  final bool laNguoiDuyet;
  final bool dangXuLy;
  final VoidCallback onXem;
  final VoidCallback onXuatPdf;
  final VoidCallback onXuatDocx;
  final VoidCallback onDuyet;
  final VoidCallback onTuChoi;

  const _LSXCard({
    required this.order,
    required this.laNguoiDuyet,
    required this.dangXuLy,
    required this.onXem,
    required this.onXuatPdf,
    required this.onXuatDocx,
    required this.onDuyet,
    required this.onTuChoi,
  });

  // Mirror web mcard status pill: approved > reason > pending.
  (String, Color) _pill(LtsPalette p) {
    if (order.laDaDuyet) return ('● Đã duyệt', p.green);
    if (order.reason.isNotEmpty) return ('● Bị từ chối', p.red);
    return ('● Chờ duyệt', p.orange);
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final (nhanTrangThai, mauTrangThai) = _pill(p);
    final coTheDuyet =
        laNguoiDuyet && !order.laDaDuyet && order.reason.isEmpty;
    final cus = (order.snapshot['customer'] ?? '').toString();
    final sp = (order.snapshot['productName'] ?? '').toString();
    final structure = (order.snapshot['structure'] ?? '').toString();

    return LtsCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Số LSX + pill trạng thái
          Row(
            children: [
              Expanded(
                child: Text(_soLsx(order),
                    style: TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: p.text)),
              ),
              LtsStatusChip(
                label: nhanTrangThai,
                fg: mauTrangThai,
                bg: mauTrangThai.withValues(alpha: 0.12),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Khách hàng (rút gọn 3 cụm cuối)
          Text(_rutGonTenKhachHang(cus),
              style: TextStyle(fontSize: 13, color: p.text),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          // Sản phẩm · cấu trúc
          if (sp.isNotEmpty)
            Text(structure.isNotEmpty ? '$sp · $structure' : sp,
                style: TextStyle(fontSize: 12, color: p.muted),
                maxLines: 2,
                overflow: TextOverflow.ellipsis),
          // Lý do từ chối
          if (!order.laDaDuyet && order.reason.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Lý do: ${order.reason}',
                style: TextStyle(fontSize: 11, color: p.red)),
          ],
          const SizedBox(height: 10),
          // Footer: avatar người lập + thời gian + actions
          Row(
            children: [
              if (order.nguoiLap.isNotEmpty) ...[
                Tooltip(
                  message: order.nguoiLap,
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _mauAvatarTen(order.nguoiLap),
                    ),
                    alignment: Alignment.center,
                    child: Text(_chuCaiDau(order.nguoiLap),
                        style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: Colors.white)),
                  ),
                ),
                const SizedBox(width: 6),
              ] else
                Text('—',
                    style: TextStyle(fontSize: 12, color: p.dim)),
              const SizedBox(width: 2),
              Text(Fmt.dateTime(order.createdAt),
                  style: TextStyle(fontSize: 11, color: p.muted)),
              const Spacer(),
              _actIcon(
                icon: Icons.visibility_outlined,
                tooltip: 'Xem LSX',
                onTap: onXem,
              ),
              _actIcon(
                icon: Icons.picture_as_pdf_outlined,
                tooltip: 'Xuất PDF',
                onTap: onXuatPdf,
              ),
              _actIcon(
                icon: Icons.description_outlined,
                tooltip: 'Xuất DOCX',
                onTap: onXuatDocx,
              ),
              if (coTheDuyet) ...[
                if (dangXuLy)
                  const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2))
                else ...[
                  _actIcon(
                    icon: Icons.check_circle,
                    tooltip: 'Duyệt',
                    color: p.green,
                    onTap: onDuyet,
                  ),
                  _actIcon(
                    icon: Icons.cancel_outlined,
                    tooltip: 'Từ chối',
                    color: p.red,
                    onTap: onTuChoi,
                  ),
                ],
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _actIcon({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    Color? color,
  }) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onTap,
      icon: Icon(icon, size: 18, color: color),
      visualDensity: VisualDensity.compact,
      padding: const EdgeInsets.all(4),
      constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF build — dùng chung cho Xem (PdfPreview) + Xuất PDF (Printing.layoutPdf)
// ═══════════════════════════════════════════════════════════════════════════

/// Map tên công đoạn trong nangCaoSpec → LsxStageKey (để thêm nhãn GIA CÔNG).
LsxStageKey _stageKey(String congDoan) {
  final cd = congDoan.toLowerCase();
  if (cd.startsWith('ghép')) return LsxStageKey.ghep;
  if (cd.startsWith('chia')) return LsxStageKey.chia;
  if (cd.startsWith('làm túi')) return LsxStageKey.lamTui;
  return LsxStageKey.inCd;
}

String _khoMangText(LsxNangCaoRow r) {
  if (r.khoMangLabel != null && r.khoMangLabel!.trim().isNotEmpty) {
    return r.khoMangLabel!;
  }
  if (r.khoMang != null && r.khoMang! > 0) {
    return '${(r.khoMang! * 1000).round()}mm';
  }
  return '—';
}

Future<Uint8List> _buildPdfBytes(ProductionOrder order) async {
  final doc = pw.Document();
  final s = order.snapshot;
  final m = order.manual;
  final spec = layNangCaoSpec(order);

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(28),
      build: (ctx) => [
        pw.Container(
          padding: const pw.EdgeInsets.all(8),
          decoration: pw.BoxDecoration(border: pw.Border.all(width: 1)),
          child: pw.Row(children: [
            pw.Expanded(
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('CÔNG TY CP LAI TRƯỜNG SƠN',
                      style: pw.TextStyle(
                          fontSize: 12, fontWeight: pw.FontWeight.bold)),
                  pw.Text('LTS Pricing — Phần mềm báo giá bao bì',
                      style: const pw.TextStyle(fontSize: 9)),
                ],
              ),
            ),
            pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.end, children: [
              pw.Text('Ký mã hiệu: QT.ISO-22-BM02',
                  style: const pw.TextStyle(fontSize: 9)),
              pw.Text('Lần ban hành: 02 — 01/03/2025',
                  style: const pw.TextStyle(fontSize: 9)),
            ]),
          ]),
        ),
        pw.SizedBox(height: 8),
        pw.Center(
          child: pw.Text('LỆNH SẢN XUẤT',
              style: pw.TextStyle(
                  fontSize: 16, fontWeight: pw.FontWeight.bold)),
        ),
        pw.Center(
          child: pw.Text('Số: ${m['lsxNumber'] ?? order.id}',
              style: const pw.TextStyle(fontSize: 11)),
        ),
        pw.SizedBox(height: 12),

        pw.Text('I. THÔNG TIN SẢN PHẨM',
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
        pw.SizedBox(height: 4),
        pw.TableHelper.fromTextArray(
          cellStyle: const pw.TextStyle(fontSize: 9),
          headerStyle: pw.TextStyle(
              fontSize: 9, fontWeight: pw.FontWeight.bold),
          headerDecoration:
              const pw.BoxDecoration(color: PdfColors.grey200),
          columnWidths: const {
            0: pw.FlexColumnWidth(1.2),
            1: pw.FlexColumnWidth(2),
          },
          data: [
            ['Khách hàng', s['customer']?.toString() ?? ''],
            ['Tên sản phẩm', s['productName']?.toString() ?? ''],
            if ((m['msp']?.toString() ?? '').isNotEmpty)
              ['Mã sản phẩm', m['msp'].toString()],
            ['Cấu trúc', s['structure']?.toString() ?? ''],
            ['Loại SP', s['productType']?.toString() ?? ''],
            if ((m['quyCachNote']?.toString() ?? '').isNotEmpty)
              ['Quy cách', m['quyCachNote'].toString()],
            if ((m['quyCachCuon']?.toString() ?? '').isNotEmpty)
              ['Quy cách cuộn', m['quyCachCuon'].toString()],
            ['Khổ trải (m)', s['spreadWidth']?.toString() ?? ''],
            ['Bước cắt (m)', s['cutStep']?.toString() ?? ''],
            ['Số màu', s['numColors']?.toString() ?? ''],
            ['Số lượng', Fmt.n(s['quantity'] as num? ?? 0)],
            if ((m['soLuongDHNote']?.toString() ?? '').isNotEmpty)
              ['SL đơn hàng', m['soLuongDHNote'].toString()],
          ],
        ),
        pw.SizedBox(height: 14),

        pw.Text('II. THÔNG TIN LỆNH',
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
        pw.SizedBox(height: 4),
        pw.TableHelper.fromTextArray(
          cellStyle: const pw.TextStyle(fontSize: 9),
          headerDecoration:
              const pw.BoxDecoration(color: PdfColors.grey200),
          columnWidths: const {
            0: pw.FlexColumnWidth(1.2),
            1: pw.FlexColumnWidth(2),
          },
          data: [
            ['Ngày phát hành', m['issuedDate']?.toString() ?? ''],
            ['Người lập', m['preparedBy']?.toString() ?? ''],
            ['Người duyệt', m['approvedBy']?.toString() ?? ''],
            if ((m['deliveryDate']?.toString() ?? '').isNotEmpty)
              ['Ngày giao hàng', m['deliveryDate'].toString()],
            if ((m['deliveryNotes']?.toString() ?? '').isNotEmpty)
              ['Yêu cầu giao hàng', m['deliveryNotes'].toString()],
            ['Ghi chú', m['notes']?.toString() ?? ''],
          ],
        ),

        if (spec.isNotEmpty) ...[
          pw.SizedBox(height: 14),
          pw.Text('III. ĐẶC TẢ KỸ THUẬT (CHỐT)',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
          pw.SizedBox(height: 4),
          pw.TableHelper.fromTextArray(
            cellStyle: const pw.TextStyle(fontSize: 8),
            headerStyle: pw.TextStyle(
                fontSize: 8, fontWeight: pw.FontWeight.bold),
            headerDecoration:
                const pw.BoxDecoration(color: PdfColors.grey200),
            columnWidths: const {
              0: pw.FlexColumnWidth(1.6),
              1: pw.FlexColumnWidth(2),
              2: pw.FlexColumnWidth(1.2),
              3: pw.FlexColumnWidth(1.2),
              4: pw.FlexColumnWidth(1.2),
            },
            data: [
              ['Công đoạn', 'Vật liệu', 'Khổ màng', 'Thành phẩm', 'Phi hao'],
              for (final r in spec)
                [
                  stageLabel(order, r.congDoan, _stageKey(r.congDoan)),
                  r.vatLieu,
                  _khoMangText(r),
                  r.thanhPham?.toString() ?? '—',
                  r.phiHao?.toString() ?? '—',
                ],
            ],
          ),
        ],

        pw.SizedBox(height: 30),
        pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceAround, children: [
          pw.Column(children: [
            pw.Text('Người lập',
                style: pw.TextStyle(
                    fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 50),
            pw.Text(m['preparedBy']?.toString() ?? '',
                style: const pw.TextStyle(fontSize: 9)),
          ]),
          pw.Column(children: [
            pw.Text('Người duyệt',
                style: pw.TextStyle(
                    fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 50),
            pw.Text(m['approvedBy']?.toString() ?? '',
                style: const pw.TextStyle(fontSize: 9)),
          ]),
        ]),
      ],
    ),
  );

  return doc.save();
}
