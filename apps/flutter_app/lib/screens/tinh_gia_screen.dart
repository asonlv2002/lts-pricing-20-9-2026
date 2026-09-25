// ═══════════════════════════════════════════════════════════════════════════
// TinhGiaScreen — Redesign full mobile-first
// Flow: Thông tin cơ bản → Chọn loại → Cấu trúc lớp → Kích thước → Nâng cao
// Sticky bottom bar với nút Lưu + Reset
//
// `embedded: true` = màn được push từ hub (ModuleRoute đã có header back).
// Bỏ LtsNavyHeader nội bộ để khỏi chồng 2 header. Back dùng PopScope ở parent.
// `onGoHub` giữ để tương thích nếu còn gọi kiểu tab cũ.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../engine/models.dart';
import '../engine/js_runtime.dart';
import '../lib/bo_dau.dart';
import '../lib/thuong_mai.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'package:lts_pricing/lib/chot_gia_allocation.dart';
import 'package:lts_pricing/lib/pricing_display.dart';
import '../widgets/chot_gia_section.dart';
import '../widgets/detail_tables.dart';
import '../widgets/form_widgets.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_overlay.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';
import '../widgets/material_picker.dart';
import '../widgets/moq_tables.dart';
import '../widgets/price_hero.dart';
import '../widgets/result_tabs.dart';

part 'tinh_gia/form_noi_bo.dart';
part 'tinh_gia/form_thuong_mai.dart';
part 'tinh_gia/panel_gia_cong_ngoai.dart';

class TinhGiaScreen extends StatelessWidget {
  final VoidCallback? onGoHub;
  final bool embedded;
  const TinhGiaScreen({super.key, this.onGoHub, this.embedded = false});

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();

    return _MobilePricingWorkspace(
      state: s,
      onGoHub: onGoHub,
      embedded: embedded,
    );
  }
}

// ─── Mobile workspace — mirror web: mode selector → pill nav Nhập/Kết quả ───
class _MobilePricingWorkspace extends StatefulWidget {
  final AppState state;
  final VoidCallback? onGoHub;
  final bool embedded;
  const _MobilePricingWorkspace({
    required this.state,
    this.onGoHub,
    this.embedded = false,
  });
  @override
  State<_MobilePricingWorkspace> createState() =>
      _MobilePricingWorkspaceState();
}

class _MobilePricingWorkspaceState extends State<_MobilePricingWorkspace> {
  int _pane = 0; // 0=input, 1=result
  String _mode = 'internal'; // internal | outsource | commercial
  bool _modeSelected = false;
  AppState get state => widget.state;

  /// Ghi chế độ vào input — mirror `xuLyChonCheDoTinhGia` (web page.tsx:207):
  /// reset form về default, set pricingMode + outsource/commercialMode.
  void _chonCheDo(String mode) {
    state.setInput(CalculateInput({
      ...CalculateInput.defaults().raw,
      'pricingMode': mode,
      if (mode == 'outsource') 'outsource': {'steps': <String>[]},
      if (mode == 'commercial') 'commercialMode': 'form',
    }));
    setState(() {
      _mode = mode;
      _modeSelected = true;
      _pane = 0;
    });
  }

  @override
  void didUpdateWidget(covariant _MobilePricingWorkspace oldWidget) {
    super.didUpdateWidget(oldWidget);
    final pane = state.pendingCalcPane;
    if (pane != null) {
      setState(() {
        _modeSelected = true;
        _pane = pane == 1 ? 1 : 0;
      });
      state.consumeCalcPane();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Embedded (push từ hub): ModuleRoute đã có header back — bỏ LtsNavyHeader
    // nội bộ để khỏi chồng 2 header. Nếu onGoHub null cũng không hiện nút
    // dashboard thừa.
    final showInternalHeader = !widget.embedded;
    final header = showInternalHeader
        ? LtsNavyHeader(
            title: _modeSelected ? 'Tạo bảng tính giá' : 'Chế độ tính giá',
            leading: widget.onGoHub == null
                ? null
                : LtsHeaderCircleButton(
                    icon: Icons.space_dashboard_outlined,
                    tooltip: 'Tổng quan',
                    onTap: widget.onGoHub,
                  ),
          )
        : null;

    if (!_modeSelected) {
      return Column(
        children: [
          if (header != null) header,
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              child: _ChonCheDoTinhGia(onChon: _chonCheDo),
            ),
          ),
        ],
      );
    }

    final hasResult = state.currentResult != null;
    return Column(
      children: [
        if (header != null) header,
        Expanded(
          child: Stack(
            children: [
              Positioned.fill(
                child: IndexedStack(
                  index: _pane,
                  children: [
                    SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (hasResult) ...[
                            LtsMiniPriceStrip(
                              priceText:
                                  '${_fmt(state.ketQuaHienThi.finalPrice)} đ',
                              rightNote:
                                  state.currentInput.productType == 'mang'
                                      ? '/m²'
                                      : '/túi',
                              onTap: () => setState(() => _pane = 1),
                            ),
                            const SizedBox(height: 10),
                          ],
                          _InputForm(state: state, mode: _mode),
                        ],
                      ),
                    ),
                    SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _MobileResultQuickActions(
                              result: state.currentResult == null
                                  ? null
                                  : state.ketQuaHienThi),
                          const SizedBox(height: 12),
                          _ResultPanel(state: state, mode: _mode),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 12,
                child: LtsPillNav(
                  selected: _pane,
                  showResultBadge: hasResult,
                  onSelect: (i) => setState(() => _pane = i),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Màn chọn chế độ — mirror ManHinhChonCheDoTinhGia.tsx (web) ──────────────
class _ChonCheDoTinhGia extends StatelessWidget {
  final ValueChanged<String> onChon;
  const _ChonCheDoTinhGia({required this.onChon});

  @override
  Widget build(BuildContext context) {
    return LtsCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Tạo bảng tính giá',
              style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: LtsT.of(context).text)),
          const SizedBox(height: 6),
          Text(
            'Bạn muốn làm gì? Chọn một hướng để bắt đầu — form nhập sẽ hiện sau khi chọn.',
            style: TextStyle(
                fontSize: 12.5, color: LtsT.of(context).muted, height: 1.4),
          ),
          const SizedBox(height: 20),
          _ModeBtn(
            emoji: '🏭',
            label: 'Nội bộ',
            desc: 'Tính giá LTS full — công thức hiện tại',
            onTap: () => onChon('internal'),
          ),
          const SizedBox(height: 12),
          _ModeBtn(
            emoji: '🔧',
            label: 'Gia công',
            desc: 'Thuê ngoài 1+ công đoạn — chọn CD ngay trên form',
            tinted: true,
            onTap: () => onChon('outsource'),
          ),
          const SizedBox(height: 12),
          _ModeBtn(
            emoji: '🛒',
            label: 'Thương mại',
            desc: 'Mua đi bán lại — nhập giá mua + lợi nhuận',
            onTap: () => onChon('commercial'),
          ),
        ],
      ),
    );
  }
}

class _ModeBtn extends StatelessWidget {
  final String emoji;
  final String label;
  final String desc;
  final bool tinted;
  final VoidCallback? onTap;
  const _ModeBtn({
    required this.emoji,
    required this.label,
    required this.desc,
    this.tinted = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(LtsT.rCard),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        constraints: const BoxConstraints(minHeight: 120),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(LtsT.rCard),
          border: Border.all(
              color: tinted ? p.red.withValues(alpha: 0.35) : p.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 8),
            Text(label,
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: p.text)),
            const SizedBox(height: 4),
            Text(desc,
                style: TextStyle(fontSize: 11, color: p.muted, height: 1.35)),
          ],
        ),
      ),
    );
  }
}

class _MobileResultQuickActions extends StatelessWidget {
  final CalculateResult? result;
  const _MobileResultQuickActions({required this.result});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final r = result;
    return Card(
        child: Padding(
            padding: const EdgeInsets.all(14),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.table_chart_outlined,
                    size: 18, color: scheme.primary),
                const SizedBox(width: 8),
                Expanded(
                    child: Text('Bảng tính nhanh',
                        style: Theme.of(context).textTheme.titleSmall)),
                Text('Xoay ngang',
                    style:
                        TextStyle(fontSize: 11, color: scheme.onSurfaceVariant))
              ]),
              const SizedBox(height: 12),
              GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 2.9,
                  children: [
                    _TableAction(
                        label: 'Tổng quan',
                        icon: Icons.account_balance_wallet_outlined,
                        enabled: r != null,
                        onTap: () => showOverviewTable(context, r!)),
                    _TableAction(
                        label: 'Chi phí',
                        icon: Icons.pie_chart_outline,
                        enabled: r != null,
                        onTap: () => showCostTable(context, r!)),
                    _TableAction(
                        label: 'Sản xuất',
                        icon: Icons.precision_manufacturing_outlined,
                        enabled: r != null,
                        onTap: () => showProductionTable(context, r!)),
                    _TableAction(
                        label: 'Trục in',
                        icon: Icons.album_outlined,
                        enabled: r != null,
                        onTap: () => showCylinderTable(context, r!)),
                  ]),
            ])));
  }
}

class _TableAction extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;
  const _TableAction(
      {required this.label,
      required this.icon,
      required this.enabled,
      required this.onTap});
  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
      onPressed: enabled ? onTap : null,
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          textStyle:
              const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)));
}

String _fmt(num v) => v.round().toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');

// ─── Result Panel ────────────────────────────────────────────────────────────
class _ResultPanel extends StatelessWidget {
  final AppState state;
  final String mode;
  const _ResultPanel({required this.state, required this.mode});

  @override
  Widget build(BuildContext context) {
    final inp = state.currentInput.raw;
    final laThuongMai = inp['pricingMode'] == 'commercial';
    final laMoTa = (inp['commercialMode'] ?? 'form') == 'description';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.lastError != null)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.08),
              border:
                  Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: AppColors.danger, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Lỗi: ${state.lastError}',
                      style: TextStyle(
                          color: AppColors.danger,
                          fontSize: 12,
                          fontWeight: FontWeight.w500)),
                ),
              ],
            ),
          ),
        if (laThuongMai)
          _ThuongMaiResult(state: state, laMoTa: laMoTa)
        else ...[
          PriceHero(
              result: state.currentResult == null ? null : state.ketQuaHienThi,
              productType: state.currentInput.productType,
              chotGia: state.currentChotGia,
              giaDeXuatHienThi: state.currentResult == null
                  ? null
                  : state.giaDeXuatHienThi(state.ketQuaHienThi.finalPrice)),
          if (state.currentResult != null) ...[
            const SizedBox(height: 12),
            ChotGiaSection(
              state: state,
              giaDeXuatOverride: state
                  .giaDeXuatHienThi(state.ketQuaHienThi.finalPrice),
            ),
            const SizedBox(height: 12),
            BreakdownPanel(result: state.ketQuaHienThi),
            const SizedBox(height: 12),
            ResultTabs(state: state),
            const SizedBox(height: 12),
            MoqTableSection(state: state),
            const SizedBox(height: 12),
            RollMoqSection(state: state),
          ],
        ],
        if (state.currentResult != null || laMoTa) ...[
          const SizedBox(height: 12),
          _ResultActionBar(state: state),
        ],
      ],
    );
  }
}

// ─── Action bar cuối result panel: Tính giá · Lưu · Reset · Copy (mirror web) ─
class _ResultActionBar extends StatelessWidget {
  final AppState state;
  const _ResultActionBar({required this.state});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final r = state.currentResult;
    final coSheetCu = state.loadedHistoryId != null;
    return LtsCard(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        alignment: WrapAlignment.center,
        children: [
          FilledButton.icon(
            onPressed: () => _tinhGia(context, state),
            icon: const Icon(Icons.calculate_outlined, size: 18),
            label: const Text('Tính giá'),
            style: FilledButton.styleFrom(backgroundColor: p.accent),
          ),
          // Mirror web: sheet đã lưu → Cập nhật + Lưu mới; bảng mới → Lưu báo giá.
          if (r != null && coSheetCu) ...[
            FilledButton.tonalIcon(
              onPressed: () => _luu(context, state, capNhat: true),
              icon: const Icon(Icons.sync_outlined, size: 18),
              label: const Text('Cập nhật'),
            ),
            FilledButton.tonalIcon(
              onPressed: () => _luu(context, state, capNhat: false),
              icon: const Icon(Icons.bookmark_add_outlined, size: 18),
              label: const Text('Lưu mới'),
            ),
          ] else if (r != null)
            FilledButton.tonalIcon(
              onPressed: () => _luu(context, state, capNhat: false),
              icon: const Icon(Icons.bookmark_add_outlined, size: 18),
              label: const Text('Lưu báo giá'),
            ),
          OutlinedButton(
            onPressed: () => state.resetInputGiuLoaiHinh(),
            child: const Text('Reset'),
          ),
          if (r != null)
            OutlinedButton.icon(
              onPressed: () => state.xuatChiTietA4(
                  state.chiTietExportHienTai()),
              icon: const Icon(Icons.visibility_outlined, size: 18),
              label: const Text('Xem'),
            ),
          if (r != null)
            IconButton.outlined(
              tooltip: 'Copy kết quả',
              icon: const Icon(Icons.copy_outlined, size: 18),
              onPressed: () => _copyResult(context, state),
            ),
        ],
      ),
    );
  }

  /// Lưu vào lịch sử. [capNhat] = true → cập nhật sheet đang mở (giữ id);
  /// false → tạo mục mới. Mirror web nút 🔄 Cập nhật / 📄 Lưu mới.
  Future<void> _luu(BuildContext context, AppState state,
      {required bool capNhat}) async {
    if ((state.currentInput.productName).trim().isEmpty) {
      LtsToast.show(context, 'Vui lòng nhập tên sản phẩm trước khi lưu.',
          type: LtsToastType.error);
      return;
    }
    final idCu = state.loadedHistoryId;
    await state.saveCurrentToHistory(force: true);
    if (!context.mounted) return;
    // "Lưu mới": tách khỏi sheet cũ — nếu server không đổi id, xoá con trỏ để
    // lần sau vẫn là bảng mới (mirror web tạo bản ghi mới).
    if (!capNhat && idCu != null && state.loadedHistoryId == idCu) {
      state.markSavedAsNew();
    }
    LtsToast.show(
      context,
      capNhat ? 'Đã cập nhật bảng tính giá' : 'Đã lưu báo giá',
      type: LtsToastType.success,
      duration: const Duration(seconds: 2),
    );
  }

  void _tinhGia(BuildContext context, AppState state) {
    final i = state.currentInput.raw;
    final laThuongMai = i['pricingMode'] == 'commercial';
    final laMoTa = laThuongMai && (i['commercialMode'] ?? 'form') == 'description';
    final productType = (i['productType'] as String?) ?? '';
    final bagType = (i['bagType'] as String?) ?? '';
    final filmType = (i['filmType'] as String?) ?? '';
    final quantity = (i['quantity'] as num?)?.toDouble() ?? 0;
    final spreadWidth = (i['spreadWidth'] as num?)?.toDouble() ?? 0;
    final cutStep = (i['cutStep'] as num?)?.toDouble() ?? 0;
    final numColors = (i['numColors'] as num?)?.toInt();

    final errors = <String>[];
    // Thương mại "mô tả khác" không cần thông số kỹ thuật.
    if (!laMoTa) {
      if (productType.isEmpty) errors.add('Chưa chọn loại sản phẩm');
      if (productType == 'tui' && bagType.isEmpty)
        errors.add('Chưa chọn loại túi');
      if (productType == 'mang' && filmType.isEmpty)
        errors.add('Chưa chọn loại màng');
      if (spreadWidth <= 0) errors.add('Chưa nhập khổ trải');
      if (cutStep <= 0) errors.add('Chưa nhập bước cắt');
      if (numColors == null) errors.add('Chưa chọn số màu in');
    }
    if (quantity <= 0) errors.add('Chưa nhập số lượng');

    if (errors.isNotEmpty) {
      LtsToast.show(
        context,
        errors.join('\n'),
        type: LtsToastType.error,
      );
      return;
    }

    state.recomputeNow();
    if (state.lastError != null) {
      LtsToast.show(
        context,
        'Lỗi: ${state.lastError}',
        type: LtsToastType.error,
      );
    } else if (state.currentResult != null) {
      LtsToast.show(
        context,
        'Đã tính xong',
        type: LtsToastType.success,
        duration: const Duration(seconds: 2),
      );
    }
  }

  void _copyResult(BuildContext context, AppState state) async {
    final r = state.currentResult;
    if (r == null) return;
    final rh = state.ketQuaHienThi;
    final i = state.currentInput;
    final isMang = i.productType == 'mang';
    final filmRollLength = i.get<num>('filmRollLength')?.toInt() ?? 6000;
    final fmtPct = (double n) => '${(n * 100).toStringAsFixed(2)}%';
    final fmtVnd = (double v) => v.round().toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
    final text = [
      '${i.customer.isEmpty ? 'N/A' : i.customer} — ${i.productName.isEmpty ? 'N/A' : i.productName}',
      'Cấu trúc: ${r.structureText} | Độ dày: ${r.d('totalThickness').toStringAsFixed(1)}mic',
      isMang
          ? 'Diện tích: ${fmtVnd(i.quantity.toDouble())} m² | KT: ${(r.d('spreadWidth') * 1000).toStringAsFixed(0)}×${(r.d('cutStep') * 1000).toStringAsFixed(0)} mm² | Cuộn: ${fmtVnd(filmRollLength.toDouble())}m/cuộn'
          : 'SL: ${fmtVnd(i.quantity.toDouble())} túi | KT: ${(r.d('spreadWidth') * 1000).toStringAsFixed(0)}×${(r.d('cutStep') * 1000).toStringAsFixed(0)} mm²',
      isMang
          ? 'GIÁ ĐỀ XUẤT: ${fmtVnd(rh.finalPrice)} đ/m² (chưa VAT)'
          : 'GIÁ ĐỀ XUẤT: ${fmtVnd(rh.finalPrice)} đ/túi (chưa VAT)',
      'Giá vốn: ${fmtVnd(rh.costPerUnit)} đ | LN: ${fmtPct(rh.profitRate)} | DT: ${(rh.revenue / 1000000).toStringAsFixed(1)}tr',
      'Trục in: ${(r.cylinderCost / 1000000).toStringAsFixed(1)}tr (riêng)',
    ].join('\n');

    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      LtsToast.show(
        context,
        'Đã copy kết quả vào clipboard',
        type: LtsToastType.success,
        duration: const Duration(seconds: 2),
      );
    }
  }
}
