// ═══════════════════════════════════════════════════════════════════════════
// Cấu hình — mirror web mobile MOBILE_HUBS.pricing_config (VoTrang.tsx:650):
//   7 action card (icon box 56 + title 17/800 + sub 13/500 + chevron):
//     1. Vật tư / nguyên vật liệu   → _MaterialsTab
//     2. Chi phí sản xuất           → _ConstantsTab
//     3. Chi phí sản xuất (nâng cấp)→ CpsxNangCapScreen
//     4. Biên lợi nhuận             → _ProfitTab
//     5. Phụ phí                    → _SurchargesTab
//     6. Lãi vay công nợ            → _InterestTab
//     7. Nhật ký thao tác           → NhatKyThaoTacScreen(cauHinh)
// Khối "Phiên bản" nhúng inline trong từng mục (KhoiPhienBan) — mirror web
// KhoiPhienBan(scope), KHÔNG còn màn PhienBanCauHinhScreen riêng.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/auth/auth_header_actions.dart';
import '../widgets/form_widgets.dart';
import '../widgets/khoi_phien_ban.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_module_route.dart';
import '../widgets/lts/lts_toast.dart';
import 'nhat_ky/nhat_ky_scope.dart';
import 'nhat_ky_thao_tac_screen.dart';
import 'cpsx_nang_cap_screen.dart';

class CauHinhScreen extends StatelessWidget {
  const CauHinhScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        LtsNavyHeader(
          title: 'Cấu hình tính giá',
          subtitle: 'Vật liệu · Hằng số · Lợi nhuận',
          action: LtsHeaderCircleButton(
            icon: Icons.restore_rounded,
            tooltip: 'Reset về dữ liệu mặc định',
            onTap: () => _confirmReset(context),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              _ConfigGroupLabel('Cấu hình tính giá'),
              const SizedBox(height: 12),
              LtsActionCard(
                iconBox: LtsIconBox(
                  icon: Icons.inventory_2_rounded,
                  variant: LtsIconVariant.emerald,
                ),
                title: 'Vật tư / nguyên vật liệu',
                subtitle: 'Cập nhật danh mục vật liệu đầu vào.',
                onTap: () => _moSubSection(
                  context,
                  title: 'Vật tư / NVL',
                  child: const _MaterialsTab(),
                ),
              ),
              const SizedBox(height: 16),
              LtsActionCard(
                iconBox: LtsIconBox(
                  icon: Icons.factory_rounded,
                  variant: LtsIconVariant.violet,
                ),
                title: 'Chi phí sản xuất',
                subtitle: 'Thiết lập các chi phí theo công đoạn.',
                onTap: () => _moSubSection(
                  context,
                  title: 'Chi phí sản xuất',
                  child: const _ConstantsTab(),
                ),
              ),
              const SizedBox(height: 16),
              LtsActionCard(
                iconBox: LtsIconBox(
                  icon: Icons.bolt_rounded,
                  variant: LtsIconVariant.orange,
                ),
                title: 'Chi phí sản xuất (nâng cấp)',
                subtitle: 'Giá điện khung giờ và điện/phút theo máy.',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                      builder: (_) => const CpsxNangCapScreen()),
                ),
              ),
              const SizedBox(height: 16),
              LtsActionCard(
                iconBox: LtsIconBox(
                  icon: Icons.percent_rounded,
                  variant: LtsIconVariant.rose,
                ),
                title: 'Biên lợi nhuận',
                subtitle: 'Cấu hình bảng lợi nhuận áp dụng.',
                onTap: () => _moSubSection(
                  context,
                  title: 'Biên lợi nhuận',
                  child: const _ProfitTab(),
                ),
              ),
              const SizedBox(height: 16),
              LtsActionCard(
                iconBox: LtsIconBox(
                  icon: Icons.settings_rounded,
                  variant: LtsIconVariant.orange,
                ),
                title: 'Phụ phí',
                subtitle: 'Thiết lập phụ phí và khoản cộng thêm.',
                onTap: () => _moSubSection(
                  context,
                  title: 'Phụ phí',
                  child: const _SurchargesTab(),
                ),
              ),
              const SizedBox(height: 16),
              LtsActionCard(
                iconBox: LtsIconBox(
                  icon: Icons.monetization_on_rounded,
                  variant: LtsIconVariant.slate,
                ),
                title: 'Lãi vay công nợ',
                subtitle: 'Cấu hình lãi vay theo thời hạn thanh toán.',
                onTap: () => _moSubSection(
                  context,
                  title: 'Lãi vay công nợ',
                  child: const _InterestTab(),
                ),
              ),
              const SizedBox(height: 16),
              LtsActionCard(
                iconBox: LtsIconBox(
                  icon: Icons.manage_search_rounded,
                  variant: LtsIconVariant.orange,
                ),
                title: 'Nhật ký thao tác',
                subtitle: 'Theo dõi thay đổi cấu hình tính giá.',
                onTap: () => _moModule(
                  context,
                  title: 'Nhật ký thao tác',
                  child: const NhatKyThaoTacScreen(scope: PhamViNhatKy.cauHinh),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _moSubSection(
    BuildContext context, {
    required String title,
    required Widget child,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _SubSectionPage(title: title, child: child),
      ),
    );
  }

  void _moModule(
    BuildContext context, {
    required String title,
    required Widget child,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ModuleRoute(
          title: title,
          extras: const [
            LtsHeaderBell(),
            SizedBox(width: 10),
            LtsHeaderAvatar(),
          ],
          child: child,
        ),
      ),
    );
  }

  Future<void> _confirmReset(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.restore_rounded, size: 32),
        title: const Text('Reset cấu hình về mặc định?'),
        content: const Text(
          'Sẽ thay thế Vật liệu / Hằng số / Bảng lợi nhuận hiện tại '
          'bằng dữ liệu gốc đi kèm app (/data ở root repo).\n\n'
          'Lịch sử báo giá và Lệnh sản xuất KHÔNG bị ảnh hưởng.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    await context.read<AppState>().resetConfigToDefaults();
    if (!context.mounted) return;
    LtsToast.show(
      context,
      'Đã reset về dữ liệu mặc định',
      type: LtsToastType.success,
      duration: const Duration(seconds: 2),
    );
  }
}

class _SubSectionPage extends StatelessWidget {
  final String title;
  final Widget child;
  const _SubSectionPage({required this.title, required this.child});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LtsT.of(context).shellBg,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: LtsT.of(context).navyTop,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: child,
    );
  }
}

class _ConfigGroupLabel extends StatelessWidget {
  final String text;
  const _ConfigGroupLabel(this.text);
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.7,
        color: p.muted,
      ),
    );
  }
}

// ── Materials ────────────────────────────────────────────────────────────────
class _MaterialsTab extends StatefulWidget {
  const _MaterialsTab();
  @override
  State<_MaterialsTab> createState() => _MaterialsTabState();
}

class _MaterialsTabState extends State<_MaterialsTab> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final all = s.materials;
    final filtered = _query.isEmpty
        ? all
        : all.where((m) {
            final q = _query.toLowerCase();
            return m.name.toLowerCase().contains(q) ||
                m.id.toLowerCase().contains(q) ||
                (m.group ?? '').toLowerCase().contains(q);
          }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        TextField(
          decoration: InputDecoration(
            hintText: 'Tìm vật liệu…',
            prefixIcon: const Icon(Icons.search, size: 20),
            suffixIcon: _query.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => setState(() => _query = ''),
                  )
                : null,
          ),
          onChanged: (v) => setState(() => _query = v),
        ),
        const SizedBox(height: 12),
        Text('${filtered.length} / ${all.length} vật liệu',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        for (final m in filtered) ...[
          _MaterialCard(
            material: m,
            onUpdate: (updated) {
              final idx = all.indexWhere((x) => x.id == m.id);
              if (idx < 0) return;
              final next = List<MaterialDef>.of(all);
              next[idx] = updated;
              s.setMaterials(next);
            },
          ),
          const SizedBox(height: 8),
        ],
        const SizedBox(height: 12),
        _SmallWidthSection(state: s),
        const KhoiPhienBan(
          configName: 'MATERIALS',
          nhanScope: 'Vật liệu & Zipper',
        ),
      ],
    );
  }
}

// ── Giá khổ nhỏ (mirror web bảng "Giá khổ nhỏ" trong tab Vật tư) ─────────────
class _SmallWidthSection extends StatelessWidget {
  final AppState state;
  const _SmallWidthSection({required this.state});

  @override
  Widget build(BuildContext context) {
    final s = state;
    final list = s.smallWidthPrices;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('GIÁ KHỔ NHỎ',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: LtsT.of(context).muted,
            )),
        const SizedBox(height: 6),
        Text(
          'Khi khổ NVL ≤ ngưỡng (mm), hệ thống dùng giá khổ nhỏ thay cho giá thường.',
          style: TextStyle(fontSize: 11.5, color: LtsT.of(context).muted),
        ),
        const SizedBox(height: 10),
        if (list.isEmpty)
          const Text('Chưa có bảng giá khổ nhỏ.')
        else
          for (final p in list) ...[
            _SmallWidthCard(
              price: p,
              onUpdate: (updated) {
                final idx = list.indexWhere((x) => x.id == p.id);
                if (idx < 0) return;
                final next = List<SmallWidthMaterialPrice>.of(list);
                next[idx] = updated;
                s.setSmallWidthPrices(next);
              },
            ),
            const SizedBox(height: 8),
          ],
      ],
    );
  }
}

class _SmallWidthCard extends StatelessWidget {
  final SmallWidthMaterialPrice price;
  final ValueChanged<SmallWidthMaterialPrice> onUpdate;
  const _SmallWidthCard({required this.price, required this.onUpdate});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final p = price;
    return Card(
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          shape: const RoundedRectangleBorder(),
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          leading: Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: scheme.tertiary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('≤${p.widthThresholdMm.round()}',
                style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    color: scheme.tertiary)),
          ),
          title: Text(p.materialId,
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
                '${Fmt.n(p.pricePerKg.round())} đ/kg  ·  ${p.thickness ?? 0}μ',
                style: Theme.of(context).textTheme.bodySmall),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _Field(
                    label: 'Ngưỡng khổ',
                    initial: p.widthThresholdMm,
                    suffix: 'mm',
                    onChanged: (v) =>
                        onUpdate(p.copyWith(widthThresholdMm: v)),
                  ),
                  _Field(
                    label: 'Giá / kg',
                    initial: p.pricePerKg,
                    suffix: 'đ',
                    onChanged: (v) => onUpdate(p.copyWith(pricePerKg: v)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MaterialCard extends StatelessWidget {
  final MaterialDef material;
  final ValueChanged<MaterialDef> onUpdate;
  const _MaterialCard({required this.material, required this.onUpdate});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final m = material;
    return Card(
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          shape: const RoundedRectangleBorder(),
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          leading: Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('${m.thickness}μ',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: scheme.primary)),
          ),
          title: Text(m.name,
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
                '${m.id}  ·  ${Fmt.n(m.pricePerKg.round())} đ/kg  ·  ${m.group ?? "—"}',
                style: Theme.of(context).textTheme.bodySmall),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _Field(
                    label: 'Giá / kg',
                    initial: m.pricePerKg,
                    onChanged: (v) => onUpdate(m.copyWith(pricePerKg: v)),
                    suffix: 'đ',
                  ),
                  _Field(
                    label: 'Mực / màu',
                    initial: m.inkPricePerColor,
                    onChanged: (v) => onUpdate(m.copyWith(inkPricePerColor: v)),
                    suffix: 'đ',
                  ),
                  _Field(
                    label: 'Dài cuộn',
                    initial: m.rollLength,
                    onChanged: (v) => onUpdate(m.copyWith(rollLength: v)),
                    suffix: 'm',
                  ),
                  _Field(
                    label: 'Khối lượng riêng',
                    initial: m.density,
                    onChanged: (v) => onUpdate(m.copyWith(density: v)),
                    integer: false,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final String label;
  final double initial;
  final ValueChanged<double> onChanged;
  final String? suffix;
  final bool integer;
  const _Field({
    required this.label,
    required this.initial,
    required this.onChanged,
    this.suffix,
    this.integer = true,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: LabeledField(
        label: label,
        child: NumField(
          initial: initial,
          integer: integer,
          suffix: suffix,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

// ── Constants — Chi phí sản xuất (mirror web scope production + waste) ───────
class _ConstantsTab extends StatelessWidget {
  const _ConstantsTab();

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final c = s.constants;

    Widget row(String k, String label,
        {bool integer = false, String? suffix, String? hint}) {
      final v = (c.raw[k] as num?)?.toDouble() ?? 0;
      return LabeledField(
        label: label,
        suffix: suffix != null ? '($suffix)' : null,
        hint: hint,
        child: NumField(
          initial: v,
          integer: integer,
          suffix: suffix,
          onChanged: (newV) => s.setConstants(c.withField(k, newV)),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        SectionCard(
          title: 'Sản xuất — In / Ghép / Cắt',
          subtitle: 'Hệ số phi hao và chi phí cơ bản',
          icon: Icons.factory_outlined,
          iconColor: AppColors.info,
          children: [
            row('ghepCPSX', 'CPSX Ghép', integer: true, suffix: 'đ'),
            row('cutBase', 'CP Cắt cơ bản', integer: true, suffix: 'đ'),
            row('laborCost', 'CPSX khâu in', integer: true, suffix: 'đ/m²'),
            const SizedBox(height: 4),
            Text('PHI HAO IN', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: row('printWasteA', 'A', integer: true)),
              const SizedBox(width: 10),
              Expanded(child: row('printWasteB', 'B', integer: true)),
            ]),
            Row(children: [
              Expanded(child: row('printWasteC', 'C', integer: true)),
              const SizedBox(width: 10),
              Expanded(child: row('printWasteD', 'D', integer: true)),
            ]),
          ],
        ),
        const SizedBox(height: 14),

        // ── Hao hụt ghép / cắt (mirror web scope waste) ──
        SectionCard(
          title: 'Hao hụt Ghép / Cắt',
          subtitle: 'A = mét, B/C = hệ số theo khổ',
          icon: Icons.delete_sweep_outlined,
          iconColor: AppColors.warning,
          children: [
            Text('GHÉP', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: row('ghepWasteA', 'A', integer: true)),
              const SizedBox(width: 10),
              Expanded(child: row('ghepWasteB', 'B', integer: true)),
              const SizedBox(width: 10),
              Expanded(child: row('ghepWasteC', 'C', integer: true)),
            ]),
            const SizedBox(height: 12),
            Text('CẮT', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: row('cutWasteA', 'A', integer: true)),
              const SizedBox(width: 10),
              Expanded(child: row('cutWasteB', 'B', integer: true)),
              const SizedBox(width: 10),
              Expanded(child: row('cutWasteC', 'C', integer: true)),
            ]),
          ],
        ),
        const SizedBox(height: 14),

        // ── Ngưỡng hệ số cắt (mirror web cutThreshold/cutMult) ──
        SectionCard(
          title: 'Hệ số cắt theo bước cắt',
          subtitle: 'Ngưỡng (m) và hệ số nhân',
          icon: Icons.content_cut_outlined,
          iconColor: AppColors.muted,
          children: [
            Row(children: [
              Expanded(
                  child: row('cutThreshold1', 'Ngưỡng 1', suffix: 'm')),
              const SizedBox(width: 12),
              Expanded(child: row('cutMult1', 'Hệ số 1')),
            ]),
            Row(children: [
              Expanded(
                  child: row('cutThreshold2', 'Ngưỡng 2', suffix: 'm')),
              const SizedBox(width: 12),
              Expanded(child: row('cutMult2', 'Hệ số 2')),
            ]),
            row('cutMult3', 'Hệ số 3 (lớn)'),
          ],
        ),
        const SizedBox(height: 14),

        // ── Định mức màng in (mirror web printFilm*, trừ phần vận chuyển) ──
        SectionCard(
          title: 'Màng in — định mức',
          subtitle: 'Setup / tốc độ / chi phí giờ',
          icon: Icons.print_outlined,
          iconColor: AppColors.accent,
          children: [
            Row(children: [
              Expanded(
                  child: row('printFilmInkPriceBopp', 'Mực BOPP',
                      integer: true, suffix: 'đ/m²')),
              const SizedBox(width: 12),
              Expanded(
                  child: row('printFilmInkPriceOther', 'Mực khác',
                      integer: true, suffix: 'đ/m²')),
            ]),
            Row(children: [
              Expanded(
                  child: row('printFilmSetupMinutesPerColor',
                      'Phút setup/màu')),
              const SizedBox(width: 12),
              Expanded(
                  child: row('printFilmSetupHourDivisor', 'Mẫu số giờ setup')),
            ]),
            Row(children: [
              Expanded(
                  child: row('printFilmLengthThreshold', 'Ngưỡng mét màng in',
                      integer: true, suffix: 'm')),
              const SizedBox(width: 12),
              Expanded(
                  child: row('printFilmShortRunSpeed', 'Tốc độ chạy ngắn',
                      integer: true, suffix: 'm/h')),
            ]),
            row('printFilmLaborCostPerHour', 'Chi phí giờ màng in',
                integer: true, suffix: 'đ/h'),
          ],
        ),
        const SizedBox(height: 14),

        // ── Phụ phí in tùy chọn (mirror web customPrintSurcharges) ──
        _OptionsEditor(
          tieuDe: 'Phụ phí in tùy chọn',
          subtitle: 'Nhãn · Giá (đ/m²) · Khối lượng',
          icon: Icons.auto_awesome_outlined,
          items: (c.raw['customPrintSurcharges'] as List?) ?? const [],
          onChanged: (next) =>
              s.setConstants(c.withField('customPrintSurcharges', next)),
        ),
        const SizedBox(height: 14),

        const KhoiPhienBan(
          configName: 'PRODUCTION',
          nhanScope: 'Chi phí sản xuất',
        ),
        const KhoiPhienBan(
          configName: 'WASTE',
          nhanScope: 'Hao hụt',
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}

// ── Phụ phí (mirror web scope surcharges) ────────────────────────────────────
class _SurchargesTab extends StatelessWidget {
  const _SurchargesTab();

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final c = s.constants;

    Widget row(String k, String label,
        {bool integer = false, String? suffix, String? hint}) {
      final v = (c.raw[k] as num?)?.toDouble() ?? 0;
      return LabeledField(
        label: label,
        suffix: suffix != null ? '($suffix)' : null,
        hint: hint,
        child: NumField(
          initial: v,
          integer: integer,
          suffix: suffix,
          onChanged: (newV) => s.setConstants(c.withField(k, newV)),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        SectionCard(
          title: 'Trục in',
          icon: Icons.album_outlined,
          iconColor: AppColors.muted,
          children: [
            row('cylPriceA', 'Đơn giá trục A', integer: true, suffix: 'đ/m²'),
            row('cylPriceB', 'Đơn giá trục B', integer: true, suffix: 'đ/m²'),
          ],
        ),
        const SizedBox(height: 14),

        SectionCard(
          title: 'Phụ kiện',
          subtitle: 'Khoá · băng keo · quai xách',
          icon: Icons.extension_outlined,
          iconColor: AppColors.success,
          children: [
            row('zipperPrice', 'Giá khoá', integer: true, suffix: 'đ'),
            row('tapePrice', 'Giá băng keo', integer: true, suffix: 'đ'),
            row('handlePrice', 'Giá quai xách', integer: true, suffix: 'đ'),
          ],
        ),
        const SizedBox(height: 14),

        // ── Phụ phí in: nhũ, phủ mờ (mirror web nhuPrice/moPrice) ──
        SectionCard(
          title: 'Phụ phí in',
          subtitle: 'Nhũ / Phủ mờ (đ/m²)',
          icon: Icons.auto_awesome_outlined,
          iconColor: AppColors.info,
          children: [
            Row(children: [
              Expanded(
                  child: row('nhuPrice', 'Nhũ', integer: true, suffix: 'đ/m²')),
              const SizedBox(width: 12),
              Expanded(
                  child:
                      row('moPrice', 'Phủ mờ', integer: true, suffix: 'đ/m²')),
            ]),
          ],
        ),
        const SizedBox(height: 14),

        // ── Thùng giấy (mirror web boxOptions) ──
        _OptionsEditor(
          tieuDe: 'Thùng giấy',
          subtitle: 'Nhãn · Giá · Khối lượng',
          icon: Icons.inventory_outlined,
          items: (c.raw['boxOptions'] as List?) ?? const [],
          onChanged: (next) =>
              s.setConstants(c.withField('boxOptions', next)),
        ),
        const SizedBox(height: 14),

        // ── Quai xách (mirror web handleOptions) ──
        _OptionsEditor(
          tieuDe: 'Quai xách',
          subtitle: 'Nhãn · Giá · Khối lượng',
          icon: Icons.shopping_bag_outlined,
          items: (c.raw['handleOptions'] as List?) ?? const [],
          onChanged: (next) =>
              s.setConstants(c.withField('handleOptions', next)),
        ),
        const SizedBox(height: 14),

        // ── Vận chuyển (mirror web shippingPerKmDefault + printFilm shipping) ──
        SectionCard(
          title: 'Vận chuyển',
          subtitle: 'Cước chung + màng in',
          icon: Icons.local_shipping_outlined,
          iconColor: AppColors.accent,
          children: [
            row('shippingPerKmDefault', 'Cước / km mặc định',
                integer: true, suffix: 'đ/km'),
            row('shippingKmDefault', 'Km mặc định',
                integer: true, suffix: 'km'),
            const SizedBox(height: 4),
            Text('MÀNG IN', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                  child: row('printFilmShippingThresholdM2',
                      'Ngưỡng VC (m²)', integer: true)),
              const SizedBox(width: 12),
              Expanded(
                  child: row('printFilmShippingLargeOrderM2',
                      'Mốc đơn lớn (m²)', integer: true)),
            ]),
            row('printFilmShippingBaseCost', 'Phí VC cơ bản',
                integer: true, suffix: 'đ'),
          ],
        ),
        const SizedBox(height: 14),

        const KhoiPhienBan(
          configName: 'SURCHARGES',
          nhanScope: 'Phụ phí',
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}

// ── Lãi vay công nợ (mirror web scope interest) ──────────────────────────────
class _InterestTab extends StatelessWidget {
  const _InterestTab();

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final c = s.constants;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        SectionCard(
          title: 'Lãi suất',
          subtitle: 'Mức cơ sở + thêm = lãi áp dụng',
          icon: Icons.percent_outlined,
          iconColor: AppColors.warning,
          children: [
            Row(children: [
              Expanded(
                child: LabeledField(
                  label: 'Lãi cơ sở',
                  hint: 'VD: 0.10 = 10%',
                  child: NumField(
                    initial: c.interestBase,
                    onChanged: (v) =>
                        s.setConstants(c.withField('interestBase', v)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: LabeledField(
                  label: 'Lãi thêm',
                  hint: 'VD: 0.03 = 3%',
                  child: NumField(
                    initial: c.interestSpread,
                    onChanged: (v) =>
                        s.setConstants(c.withField('interestSpread', v)),
                  ),
                ),
              ),
            ]),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border:
                    Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.calculate_outlined,
                      size: 16, color: AppColors.warning),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Tổng lãi áp dụng',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.warning)),
                  ),
                  Text('${Fmt.pct(c.interestBase + c.interestSpread)}% / năm',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.warning)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // ── Lãi vay dành riêng cho màn in (mirror web printFilmInterestRate) ──
        SectionCard(
          title: 'Lãi vay dành riêng cho màn in',
          subtitle: 'Chỉ áp dụng cho Màng in chỉ có công đoạn in',
          icon: Icons.print_outlined,
          iconColor: AppColors.accent,
          children: [
            LabeledField(
              label: 'Lãi vay màng in',
              hint: 'VD: 0.01 = 1%',
              child: NumField(
                initial: (c.raw['printFilmInterestRate'] as num?)?.toDouble() ??
                    0.01,
                onChanged: (v) =>
                    s.setConstants(c.withField('printFilmInterestRate', v)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // ── Mốc công nợ thêm (mirror web customPaymentDays) ──
        _SoListEditor(
          tieuDe: 'Mốc công nợ thêm',
          subtitle: 'Ngày (ngoài 14/30/45/75/90)',
          icon: Icons.event_outlined,
          values: ((c.raw['customPaymentDays'] as List?) ?? const [])
              .map((e) => (e as num).toInt())
              .toList(),
          suffix: 'ngày',
          onChanged: (next) =>
              s.setConstants(c.withField('customPaymentDays', next)),
        ),
        const SizedBox(height: 14),

        const KhoiPhienBan(
          configName: 'INTEREST',
          nhanScope: 'Lãi vay',
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}

// ── Options editor (key/label/price/weight) — mirror web boxOptions/handleOptions ─
class _OptionsEditor extends StatelessWidget {
  final String tieuDe;
  final String? subtitle;
  final IconData icon;
  final List<dynamic> items;
  final ValueChanged<List<dynamic>> onChanged;
  const _OptionsEditor({
    required this.tieuDe,
    this.subtitle,
    required this.icon,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final list = items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    return SectionCard(
      title: tieuDe,
      subtitle: subtitle ?? 'Nhãn · Giá · Khối lượng',
      icon: icon,
      iconColor: AppColors.success,
      children: [
        for (int i = 0; i < list.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(children: [
              Expanded(
                flex: 3,
                child: _TextInline(
                  value: (list[i]['label'] ?? '').toString(),
                  onChanged: (v) {
                    final next = list.map((e) => Map<String, dynamic>.of(e)).toList();
                    next[i]['label'] = v;
                    onChanged(next);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: _NumInline(
                  value: ((list[i]['price'] as num?) ?? 0).toDouble(),
                  onChanged: (v) {
                    final next = list.map((e) => Map<String, dynamic>.of(e)).toList();
                    next[i]['price'] = v;
                    onChanged(next);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: _NumInline(
                  value: ((list[i]['weight'] as num?) ?? 0).toDouble(),
                  onChanged: (v) {
                    final next = list.map((e) => Map<String, dynamic>.of(e)).toList();
                    next[i]['weight'] = v;
                    onChanged(next);
                  },
                ),
              ),
            ]),
          ),
      ],
    );
  }
}

// ── Editor list số nguyên (customPaymentDays) ─────────────────────────────────
class _SoListEditor extends StatefulWidget {
  final String tieuDe;
  final String subtitle;
  final IconData icon;
  final List<int> values;
  final String suffix;
  final ValueChanged<List<int>> onChanged;
  const _SoListEditor({
    required this.tieuDe,
    required this.subtitle,
    required this.icon,
    required this.values,
    required this.suffix,
    required this.onChanged,
  });

  @override
  State<_SoListEditor> createState() => _SoListEditorState();
}

class _SoListEditorState extends State<_SoListEditor> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _them() {
    final v = int.tryParse(_ctrl.text.replaceAll(RegExp(r'\D'), ''));
    if (v == null || v <= 0 || widget.values.contains(v)) return;
    widget.onChanged([...widget.values, v]..sort());
    _ctrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: widget.tieuDe,
      subtitle: widget.subtitle,
      icon: widget.icon,
      iconColor: AppColors.info,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final v in widget.values)
              Chip(
                label: Text('$v ${widget.suffix}'),
                onDeleted: () => widget.onChanged(
                    widget.values.where((e) => e != v).toList()),
              ),
          ],
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: TextField(
              controller: _ctrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                isDense: true,
                border: OutlineInputBorder(),
                hintText: 'Thêm mốc...',
              ),
              onSubmitted: (_) => _them(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed: _them,
            icon: const Icon(Icons.add, size: 18),
          ),
        ]),
      ],
    );
  }
}

class _TextInline extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  const _TextInline({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      initialValue: value,
      decoration: const InputDecoration(
        isDense: true,
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      ),
      onChanged: onChanged,
    );
  }
}

class _NumInline extends StatelessWidget {
  final double value;
  final ValueChanged<double> onChanged;
  const _NumInline({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      initialValue: value == value.roundToDouble()
          ? value.toInt().toString()
          : value.toString(),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textAlign: TextAlign.right,
      decoration: const InputDecoration(
        isDense: true,
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      ),
      onChanged: (v) => onChanged(double.tryParse(v) ?? 0),
    );
  }
}

// ── Profit table ─────────────────────────────────────────────────────────────
// Mirror web "Bảng Lợi Nhuận" (TrangCauHinh.tsx:2786-3003):
//   • Dropdown nhóm khách: Khách lớn (largeCol*) / Khách thường (col*).
//   • Cột "Từ" (chặn dưới) + "Đến" (sửa ngưỡng, có ràng buộc).
//   • 2 cột % LN (cột 2 = khách lớn/nhiều lớp, cột 1 = còn lại) — nhập trực tiếp.
//   • Thêm mốc cuối (+10.000.000) / xoá mốc vừa thêm.
// Ghi thẳng vào store (setProfitTable) — engine tự recompute (mirror web).
class _ProfitTab extends StatefulWidget {
  const _ProfitTab();

  @override
  State<_ProfitTab> createState() => _ProfitTabState();
}

class _ProfitTabState extends State<_ProfitTab> {
  bool _khachLon = false;
  final Map<int, TextEditingController> _nguongCtrl = {};
  final Map<int, TextEditingController> _pctCtrl = {};

  bool get _chiDoc {
    final s = context.read<AppState>();
    final coQuyen = s.nguoiDungHienTai?.coQuyen('PRICE_CONFIG_MANAGER') ?? false;
    // Guest (chưa đăng nhập) vẫn sửa được như web chưa login.
    if (s.nguoiDungHienTai == null) return false;
    return !coQuyen;
  }

  @override
  void dispose() {
    for (final c in _nguongCtrl.values) {
      c.dispose();
    }
    for (final c in _pctCtrl.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _ctrlCho(
      Map<int, TextEditingController> map, int i, String initial) {
    return map.putIfAbsent(i, () => TextEditingController(text: initial));
  }

  double _col(ProfitRow r, String key) {
    switch (key) {
      case 'largeCol1':
        return r.largeCol1 ?? 0;
      case 'largeCol2':
        return r.largeCol2 ?? 0;
      case 'col1':
        return r.col1;
      default:
        return r.col2;
    }
  }

  ProfitRow _withCol(ProfitRow r, String key, double v) {
    switch (key) {
      case 'largeCol1':
        return ProfitRow(
            threshold: r.threshold,
            col1: r.col1,
            col2: r.col2,
            largeCol1: v,
            largeCol2: r.largeCol2);
      case 'largeCol2':
        return ProfitRow(
            threshold: r.threshold,
            col1: r.col1,
            col2: r.col2,
            largeCol1: r.largeCol1,
            largeCol2: v);
      case 'col1':
        return ProfitRow(
            threshold: r.threshold,
            col1: v,
            col2: r.col2,
            largeCol1: r.largeCol1,
            largeCol2: r.largeCol2);
      default:
        return ProfitRow(
            threshold: r.threshold,
            col1: r.col1,
            col2: v,
            largeCol1: r.largeCol1,
            largeCol2: r.largeCol2);
    }
  }

  Future<void> _suaCol(int i, String key, double value) async {
    final s = context.read<AppState>();
    final rows = List<ProfitRow>.of(s.profitTable);
    if (i < 0 || i >= rows.length) return;
    rows[i] = _withCol(rows[i], key, value);
    await s.setProfitTable(rows);
  }

  /// Commit ngưỡng dòng [i] từ draft — mirror `commitProfitThresholdDraft`
  /// (profit-table-editor.ts:3): parse số, clamp trong (dòng trước, dòng sau),
  /// bỏ nếu <= 0 hoặc không đổi.
  Future<void> _luuNguong(int i) async {
    final s = context.read<AppState>();
    final rows = List<ProfitRow>.of(s.profitTable);
    if (i < 0 || i >= rows.length) return;
    final ctrl = _nguongCtrl[i];
    if (ctrl == null) return;
    final parsed = int.tryParse(ctrl.text.replaceAll(RegExp(r'\D'), '')) ?? 0;
    if (parsed <= 0) {
      ctrl.text = Fmt.n(rows[i].threshold);
      return;
    }
    final min = i == 0 ? 1 : rows[i - 1].threshold.toInt() + 1;
    final max = i < rows.length - 1
        ? rows[i + 1].threshold.toInt() - 1
        : 9007199254740991;
    final threshold = parsed.clamp(min, max).toDouble();
    ctrl.text = Fmt.n(threshold);
    if (threshold == rows[i].threshold) return;
    rows[i] = ProfitRow(
      threshold: threshold,
      col1: rows[i].col1,
      col2: rows[i].col2,
      largeCol1: rows[i].largeCol1,
      largeCol2: rows[i].largeCol2,
    );
    await s.setProfitTable(rows);
  }

  Future<void> _themMoc() async {
    final s = context.read<AppState>();
    final rows = List<ProfitRow>.of(s.profitTable);
    final dongCuoi = rows.isNotEmpty ? rows.last : null;
    final mocMoi = (dongCuoi?.threshold ?? 0) + 10000000;
    rows.add(ProfitRow(
      threshold: mocMoi,
      col1: dongCuoi?.col1 ?? 0,
      col2: dongCuoi?.col2 ?? 0,
      largeCol1: dongCuoi?.largeCol1 ?? 0,
      largeCol2: dongCuoi?.largeCol2 ?? 0,
    ));
    await s.setProfitTable(rows);
  }

  Future<void> _xoaMocCuoi() async {
    final s = context.read<AppState>();
    final rows = List<ProfitRow>.of(s.profitTable);
    // Mirror `removeLastAddedProfitRow`: chỉ xoá khi vượt độ dài bảng gốc.
    if (rows.length <= s.profitTableMacDinh.length) return;
    rows.removeLast();
    await s.setProfitTable(rows);
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final rows = s.profitTable;
    final scheme = Theme.of(context).colorScheme;
    final col1Key = _khachLon ? 'largeCol1' : 'col1';
    final col2Key = _khachLon ? 'largeCol2' : 'col2';
    final coTheXoa = rows.length > s.profitTableMacDinh.length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Icon(Icons.info_outline, color: scheme.primary, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Lợi nhuận theo bậc tổng chi phí. Tổng < ngưỡng → áp dụng cột tương ứng.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 14),
        // Dropdown nhóm khách hàng (mirror web select nhomKhachHang).
        Row(children: [
          Text('Nhóm khách hàng:',
              style: TextStyle(fontSize: 12.5, color: LtsT.of(context).muted)),
          const SizedBox(width: 10),
          Expanded(
            child: DropdownField<String>(
              options: const [('other', 'Khách thường'), ('svlg', 'Khách lớn')],
              selected: _khachLon ? 'svlg' : 'other',
              enabled: !_chiDoc,
              onChanged: (v) => setState(() => _khachLon = v == 'svlg'),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(children: [
              Expanded(
                  flex: 3,
                  child: Text('Từ',
                      style: Theme.of(context).textTheme.labelMedium)),
              Expanded(
                  flex: 3,
                  child: Text('Đến (ngưỡng)',
                      style: Theme.of(context).textTheme.labelMedium)),
              Expanded(
                  flex: 2,
                  child: Center(
                      child: Text('Cột 2',
                          style: Theme.of(context).textTheme.labelMedium))),
              Expanded(
                  flex: 2,
                  child: Center(
                      child: Text('Cột 1',
                          style: Theme.of(context).textTheme.labelMedium))),
              const SizedBox(width: 28),
            ]),
          ),
        ),
        const SizedBox(height: 8),
        for (int i = 0; i < rows.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Card(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Row(children: [
                  // "Từ" = ngưỡng dòng trước (chặn dưới).
                  Expanded(
                    flex: 3,
                    child: Text(
                      Fmt.n(i == 0 ? 0 : rows[i - 1].threshold),
                      style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: scheme.onSurfaceVariant),
                    ),
                  ),
                  // "Đến" — input ngưỡng.
                  Expanded(
                    flex: 3,
                    child: _InlineNum(
                      controller: _ctrlCho(_nguongCtrl, i,
                          Fmt.n(rows[i].threshold)),
                      enabled: !_chiDoc,
                      onCommit: () => _luuNguong(i),
                    ),
                  ),
                  // Cột 2 % LN.
                  Expanded(
                    flex: 2,
                    child: Center(
                      child: _PctField(
                        controller: _ctrlCho(_pctCtrl, i * 2,
                            _pctText(_col(rows[i], col2Key))),
                        enabled: !_chiDoc,
                        color: AppColors.success,
                        onChanged: (v) => _suaCol(i, col2Key, v),
                      ),
                    ),
                  ),
                  // Cột 1 % LN.
                  Expanded(
                    flex: 2,
                    child: Center(
                      child: _PctField(
                        controller: _ctrlCho(_pctCtrl, i * 2 + 1,
                            _pctText(_col(rows[i], col1Key))),
                        enabled: !_chiDoc,
                        color: AppColors.muted,
                        onChanged: (v) => _suaCol(i, col1Key, v),
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 28,
                    child: (i == rows.length - 1 && coTheXoa && !_chiDoc)
                        ? IconButton(
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            tooltip: 'Xóa mốc cuối',
                            icon: const Icon(Icons.close,
                                size: 18, color: AppColors.danger),
                            onPressed: _xoaMocCuoi,
                          )
                        : const SizedBox.shrink(),
                  ),
                ]),
              ),
            ),
          ),
        const SizedBox(height: 6),
        if (!_chiDoc)
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: _themMoc,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Thêm mốc lợi nhuận'),
            ),
          ),
        const SizedBox(height: 8),
        Text(
          'Tỉ lệ lợi nhuận tự động tính từ giá vốn. Các con số này có thể chỉnh sửa và tự động lưu.',
          style: TextStyle(fontSize: 11.5, color: LtsT.of(context).muted),
        ),
        const KhoiPhienBan(
          configName: 'PROFIT',
          nhanScope: 'Bảng lợi nhuận',
        ),
      ],
    );
  }

  static String _pctText(double v) {
    final pct = v * 100;
    final rounded = (pct * 100).round() / 100;
    return rounded == rounded.roundToDouble()
        ? rounded.toInt().toString()
        : rounded.toString();
  }
}

/// Input số inline (ngưỡng) — commit khi rời ô / Enter.
class _InlineNum extends StatelessWidget {
  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onCommit;
  const _InlineNum(
      {required this.controller, required this.enabled, required this.onCommit});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: TextInputType.number,
      textAlign: TextAlign.right,
      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
      decoration: const InputDecoration(
        isDense: true,
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      ),
      onSubmitted: (_) => onCommit(),
      onTapOutside: (_) {
        onCommit();
        FocusManager.instance.primaryFocus?.unfocus();
      },
    );
  }
}

/// Input % LN inline — cập nhật ngay khi gõ (mirror web onChange).
class _PctField extends StatelessWidget {
  final TextEditingController controller;
  final bool enabled;
  final Color color;
  final ValueChanged<double> onChanged;
  const _PctField({
    required this.controller,
    required this.enabled,
    required this.color,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 64,
      child: TextField(
        controller: controller,
        enabled: enabled,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textAlign: TextAlign.right,
        style: TextStyle(
            fontSize: 12.5, fontWeight: FontWeight.w700, color: color),
        decoration: const InputDecoration(
          isDense: true,
          suffixText: '%',
          border: OutlineInputBorder(),
          contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 8),
        ),
        onChanged: (v) => onChanged((double.tryParse(v) ?? 0) / 100),
      ),
    );
  }
}
