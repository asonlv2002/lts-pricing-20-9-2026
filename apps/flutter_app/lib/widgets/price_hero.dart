// ═══════════════════════════════════════════════════════════════════════════
// Price Hero — Mirror đúng ManHinhQuanLy.tsx của web
// 5 section: Báo giá | Đặc tả kỹ thuật | MOQ | MOQ cuộn | Trọng lượng
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../engine/models.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import 'detail_tables.dart';
import 'expandable_table.dart';

// ─── PriceHero card gradient lớn ─────────────────────────────────────────────
class PriceHero extends StatelessWidget {
  final CalculateResult? result;
  final String productType;
  const PriceHero({super.key, required this.result, required this.productType});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final r = result;

    if (r == null) {
      return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: AppGradients.subtle(scheme),
          border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.5)),
        ),
        padding: const EdgeInsets.all(20),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: scheme.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(Icons.calculate_outlined, color: scheme.primary, size: 26),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Bắt đầu tính giá', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text('Nhập thông tin đơn hàng để xem kết quả',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
            ]),
          ),
        ]),
      );
    }

    final isMang = productType == 'mang';
    final finalPrice = r.finalPrice;
    final rollArea = r.d('dienTichCuonMang');

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: AppGradients.hero(scheme),
        boxShadow: [BoxShadow(color: scheme.primary.withValues(alpha: 0.30), blurRadius: 28, offset: const Offset(0, 12))],
      ),
      child: Stack(children: [
        Positioned(right: -25, top: -25, child: Container(width: 130, height: 130, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.07), shape: BoxShape.circle))),
        Positioned(right: 55, bottom: -40, child: Container(width: 90, height: 90, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.05), shape: BoxShape.circle))),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              _TypeBadge(isMang: isMang),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withValues(alpha: 0.25))),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF4ADE80), shape: BoxShape.circle)),
                  const SizedBox(width: 5),
                  const Text('Tự động', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                ]),
              ),
            ]),
            const SizedBox(height: 14),
            Text(isMang ? 'GIÁ ĐỀ XUẤT / m²' : 'GIÁ ĐỀ XUẤT / cái',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Colors.white.withValues(alpha: 0.80))),
            const SizedBox(height: 2),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Flexible(child: FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft,
                child: Text(Fmt.n(finalPrice.round()), style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w900, color: Colors.white, height: 1.0, letterSpacing: -2)))),
              Padding(padding: const EdgeInsets.only(bottom: 8, left: 6),
                child: Text('₫', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: 0.85)))),
            ]),
            const SizedBox(height: 6),
            if (r.structureText.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.layers_outlined, size: 12, color: Colors.white.withValues(alpha: 0.80)),
                  const SizedBox(width: 5),
                  Flexible(child: Text(r.structureText, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, letterSpacing: 0.3, color: Colors.white.withValues(alpha: 0.95)), maxLines: 2, overflow: TextOverflow.ellipsis)),
                ]),
              ),
            const SizedBox(height: 16),
            // màng extra: giá cuộn
            if (isMang && rollArea > 0) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white.withValues(alpha: 0.20))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Giá / cuộn', style: TextStyle(fontSize: 9.5, color: Colors.white.withValues(alpha: 0.80), fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                  const SizedBox(height: 2),
                  Text('${Fmt.n((finalPrice * rollArea).round())} ₫', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white)),
                  Text('DT cuộn: ${Fmt.d3(rollArea)} m²', style: TextStyle(fontSize: 10.5, color: Colors.white.withValues(alpha: 0.75))),
                ]),
              ),
              const SizedBox(height: 12),
            ],
            Row(children: [
              _HeroStat(label: 'Giá vốn/đv', value: Fmt.vnd(r.costPerUnit), icon: Icons.inventory_2_outlined),
              const SizedBox(width: 8),
              _HeroStat(label: 'Lợi nhuận', value: '${Fmt.pct(r.profitRate)}%', icon: Icons.trending_up),
              const SizedBox(width: 8),
              if (isMang && rollArea > 0)
                _HeroStat(label: 'Giá/cuộn', value: Fmt.vnd(finalPrice * rollArea), icon: Icons.album_outlined)
              else
                _HeroStat(label: 'Tổng DT', value: '${Fmt.shortM(r.revenue)}₫', icon: Icons.bar_chart_outlined),
            ]),
          ]),
        ),
      ]),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  final bool isMang;
  const _TypeBadge({required this.isMang});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withValues(alpha: 0.25))),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(isMang ? Icons.view_stream_outlined : Icons.shopping_bag_outlined, size: 13, color: Colors.white),
      const SizedBox(width: 5),
      Text(isMang ? 'MÀNG' : 'TÚI', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8)),
    ]),
  );
}

class _HeroStat extends StatelessWidget {
  final String label, value;
  final IconData icon;
  const _HeroStat({required this.label, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withValues(alpha: 0.18))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 12, color: Colors.white.withValues(alpha: 0.75)),
          const SizedBox(width: 4),
          Flexible(child: Text(label, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, letterSpacing: 0.2, color: Colors.white.withValues(alpha: 0.80)), maxLines: 1, overflow: TextOverflow.ellipsis)),
        ]),
        const SizedBox(height: 3),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft,
          child: Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.3))),
      ]),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BreakdownPanel — 5 sections giống web
// ═══════════════════════════════════════════════════════════════════════════
class BreakdownPanel extends StatelessWidget {
  final CalculateResult result;
  const BreakdownPanel({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final r = result;
    final raw = r.raw;
    final inp = (raw['input'] as Map?)?.cast<String, dynamic>() ?? raw;
    final isMang = (inp['productType'] as String?) == 'mang';
    final unitLabel = isMang ? 'm²' : 'túi';
    final numColors = (inp['numColors'] as num?)?.toInt() ?? 0;
    final spreadMm = ((inp['spreadWidth'] as num?) ?? 0) * 1000;
    final cutMm   = ((inp['cutStep'] as num?) ?? 0) * 1000;
    final numImages = (inp['numImages'] as num?)?.toInt() ?? 1;
    final filmRollLength = (inp['filmRollLength'] as num?)?.toInt() ?? 6000;
    final bagType  = (inp['bagType'] as String?) ?? '';
    final filmType = (inp['filmType'] as String?) ?? '';
    final qty = (inp['quantity'] as num?) ?? 0;
    final customer  = (inp['customer'] as String?) ?? '';
    final productName = (inp['productName'] as String?) ?? '';
    final hasZipper = (inp['hasZipper'] as bool?) ?? false;
    final cylInc    = (inp['cylIncluded'] as bool?) ?? false;

    // Bag/film type labels
    const bagMap = {'3bien':'3 biên','4bien':'4 biên','xephong_lech':'Xếp hông dán lưng lệch','xephong_giua':'Xếp hông dán lưng giữa','dayDung':'Đáy đứng','cutSeal':'Cut seal'};
    const filmMap = {'mangIn':'Màng in','mangGhep':'Màng ghép','mangDongGoi':'Màng đóng gói tự động'};
    String typeStr = isMang ? (filmMap[filmType] ?? 'Màng cuộn') : (hasZipper ? 'Zipper ${bagMap[bagType] ?? bagType}' : (bagMap[bagType] ?? bagType));

    final numColorsText = numColors > 0 ? '$numColors màu' : 'Không in';
    final rollArea = r.d('dienTichCuonMang');

    // uniRows từ engine raw output
    final layers = raw['layers'] as Map?;
    final printLayer  = layers?['print'] as Map?;
    final laminations = (layers?['laminations'] as List?) ?? [];

    // ─── Section 1: Thông tin cơ bản ─────────────────────────────────────
    final infoItems = <_KVItem>[
      _KVItem('Khách hàng', customer.isEmpty ? '—' : customer),
      _KVItem('Sản phẩm', productName.isEmpty ? '—' : productName),
      _KVItem('Cấu trúc màng', r.structureText),
      _KVItem(isMang ? 'Diện tích' : 'Số lượng', '${Fmt.n(qty)} $unitLabel'),
      _KVItem('Số màu in', numColorsText),
      _KVItem('Kích thước', 'KT ${spreadMm.toStringAsFixed(0)} mm × BC ${cutMm.toStringAsFixed(0)} mm'),
      _KVItem('Loại ${isMang ? 'màng' : 'túi'}', typeStr),
      _KVItem('Độ dày', '${r.d('totalThickness').toStringAsFixed(1)} mic'),
      _KVItem('Định lượng (GSM)', '${r.d('totalGSM').toStringAsFixed(2)} g/m²'),
      _KVItem('Diện tích ${isMang ? 'băng' : '1 túi'}', '${Fmt.d4(r.d('bagArea'))} m²'),
      if (!isMang) _KVItem('Trọng lượng / túi', '${Fmt.d3(r.d('tareWeight'))} g'),
      if (isMang) _KVItem('Cuộn màng TP', '$filmRollLength m/cuộn (${Fmt.d3(rollArea)} m²/cuộn)'),
      if (numColors > 0) _KVItem('Trục in', 'D ${(r.d('cylLength')*1000).toStringAsFixed(0)} mm × CV ${(r.d('cylCircum')*1000).toStringAsFixed(0)} mm'),
    ];

    // ─── Section 2: Stat grid ─────────────────────────────────────────────
    final profitRate   = r.profitRate;
    final profitAmount = r.profitAmount;
    final revenue      = r.revenue;
    final finalPrice   = r.finalPrice;
    final commission   = r.d('commissionPerUnit') * (qty is int ? qty : qty.toInt());
    final commPerUnit  = r.d('commissionPerUnit');
    final commPct      = r.costPerUnit > 0 ? commPerUnit / r.costPerUnit : 0.0;

    // ─── Section 3: Breakdown giá ─────────────────────────────────────────
    final breakdownPairs = <_KVItem>[
      _KVItem('Giá ban đầu (Vốn + ${Fmt.pct(profitRate)}% LN)', '${Fmt.n(r.costPerUnit.round())} đ'),
      if (hasZipper) _KVItem('Chi phí Zipper', '${Fmt.n(r.d('zipperPerUnit').round())} đ'),
      if ((inp['hasTape'] as bool?) == true) _KVItem('Chi phí Băng keo', '${Fmt.n(r.d('tapePerUnit').round())} đ'),
      if ((inp['hasHandle'] as bool?) == true) _KVItem('Chi phí Quai', '${Fmt.n(r.d('handlePerUnit').round())} đ'),
      _KVItem(isMang ? 'Chi phí Đóng gói' : 'Chi phí Thùng giấy', '${Fmt.n(r.d('boxPerUnit').round())} đ'),
      _KVItem('Chi phí Vận chuyển', '${Fmt.n(r.d('cuocVanChuyenPerDonVi').round())} đ'),
      _KVItem('Lãi vay vốn (${Fmt.pct((r.d('laiSuatCoBan') + r.d('laiSuatThem')))}%/năm)', '${Fmt.n(r.d('laiSuatPerDonVi').round())} đ'),
      _KVItem('Hoa hồng kinh doanh', '${Fmt.n(commPerUnit.round())} đ'),
      if (cylInc && r.d('chiPhiTrucPhanBo') > 0)
        _KVItem('Trục in phân bổ (bao / 200k m²)', '+${Fmt.n(r.d('chiPhiTrucPhanBo').round())} đ'),
    ];

    // ─── Section 4: Bảng đặc tả kỹ thuật (uniRows) ──────────────────────
    // Mirror uniRows của web
    final List<_UniRow> uniRows = [];
    if (printLayer != null) {
      final mat = printLayer['material'] as Map?;
      uniRows.add(_UniRow(
        stage: 'CPSX IN', mat: (mat?['name'] as String?) ?? '',
        width: (printLayer['kho'] as num?)?.toDouble() ?? 0,
        meters: (printLayer['met'] as num?)?.toDouble() ?? 0,
        waste: (printLayer['hatHao'] as num?)?.toDouble() ?? 0,
        cpsx: (printLayer['cpsx'] as num?)?.toDouble() ?? 0,
        costCPSX: (printLayer['chiPhiSX'] as num?)?.toDouble() ?? 0,
        matPrice: (mat?['pricePerM2'] as num?)?.toDouble(),
        costMat: (printLayer['chiPhiVL'] as num?)?.toDouble() ?? 0,
      ));
    }
    for (final lam in laminations) {
      final lamMap = lam as Map;
      final mat = lamMap['material'] as Map?;
      final layerNum = lamMap['layerNum'] as int? ?? 0;
      uniRows.add(_UniRow(
        stage: 'GHÉP (Lớp $layerNum)', mat: (mat?['name'] as String?) ?? '',
        width: (lamMap['kho'] as num?)?.toDouble() ?? 0,
        meters: (lamMap['met'] as num?)?.toDouble() ?? 0,
        waste: (lamMap['hatHao'] as num?)?.toDouble() ?? 0,
        cpsx: (lamMap['cpsx'] as num?)?.toDouble() ?? 0,
        costCPSX: (lamMap['chiPhiSX'] as num?)?.toDouble() ?? 0,
        matPrice: (mat?['pricePerM2'] as num?)?.toDouble(),
        costMat: (lamMap['chiPhiVL'] as num?)?.toDouble() ?? 0,
      ));
    }
    if (!isMang) {
      final cat = raw['layers']?['cut'] as Map?;
      uniRows.add(_UniRow(
        stage: 'CẮT', mat: '—',
        width: (cat?['kho'] as num?)?.toDouble() ?? 0,
        meters: (cat?['met'] as num?)?.toDouble() ?? 0,
        waste: (cat?['hatHao'] as num?)?.toDouble() ?? 0,
        cpsx: (cat?['cpsx'] as num?)?.toDouble() ?? 0,
        costCPSX: (cat?['chiPhiSX'] as num?)?.toDouble() ?? 0,
        matPrice: null, costMat: null,
      ));
    }
    final totalCPSX = uniRows.fold(0.0, (s, row) => s + row.costCPSX);
    final totalCPVL = uniRows.fold(0.0, (s, row) => s + (row.costMat ?? 0));
    final grandTotal = totalCPSX + totalCPVL;

    // ─── Section 5: Trọng lượng ──────────────────────────────────────────
    final weightItems = <_KVItem>[
      _KVItem(isMang ? 'Diện tích băng (m²/m dài)' : 'Diện tích 1 túi', '${Fmt.d4(r.d('dienTichTui'))} m²'),
      _KVItem('Tổng diện tích đơn hàng', '${Fmt.d3(r.totalArea)} m²'),
      if (!isMang) ...[
        _KVItem('Trọng lượng / túi (Tare)', '${Fmt.d3(r.d('khoiLuongTare'))} g'),
        _KVItem('Tổng trọng lượng', '${Fmt.d3(r.d('khoiLuongTare') * qty / 1000)} kg'),
        _KVItem('Trọng lượng (tấn)', '${(r.d('khoiLuongTare') * qty / 1000000).toStringAsFixed(3)} tấn'),
      ] else ...[
        _KVItem('Chiều dài cuộn TP', '$filmRollLength m/cuộn'),
        if (rollArea > 0) _KVItem('Số cuộn ước tính', '${(qty / rollArea).ceil()} cuộn'),
      ],
    ];

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

      // ═══ 1. Thông tin cơ bản ══════════════════════════════════════════
      _SectionCard(
        title: 'Thông tin cơ bản',
        icon: Icons.info_outline,
        iconColor: AppColors.info,
        child: Column(children: infoItems.map((it) => _KVRow(it.label, it.value)).toList()),
      ),
      const SizedBox(height: 12),

      // ═══ 2. Stat grid ═════════════════════════════════════════════════
      _StatGrid(
        profitAmount: profitAmount,
        profitRate: profitRate,
        revenue: revenue,
        finalPrice: finalPrice,
        commission: commission,
        commPerUnit: commPerUnit,
        commPct: commPct,
        isMang: isMang,
        unitLabel: unitLabel,
      ),
      const SizedBox(height: 12),

      // ═══ 3. Chi tiết giá bán ══════════════════════════════════════════
      _CollapsibleSection(
        title: '💰 Chi tiết giá đề xuất / $unitLabel',
        icon: Icons.account_balance_wallet_outlined,
        iconColor: AppColors.warning,
        child: Column(children: [
          ...breakdownPairs.map((it) => _KVRow(it.label, it.value, mono: true)),
          const Divider(height: 16, thickness: 0.5),
          _KVRow('GIÁ BÁN ĐỀ XUẤT / ${unitLabel.toUpperCase()}', '${Fmt.n(finalPrice.round())} đ',
              bold: true, highlight: true, color: AppColors.warning),
          const SizedBox(height: 4),
          DetailTableButton(
            label: 'Xem bảng chi tiết giá',
            onTap: () => showOverviewTable(context, r),
          ),
        ]),
      ),
      const SizedBox(height: 12),

      // ═══ 4. Bảng đặc tả kỹ thuật & nguyên liệu ═══════════════════════
      _CollapsibleSection(
        title: '🏭 Đặc tả kỹ thuật & nguyên liệu',
        icon: Icons.precision_manufacturing_outlined,
        iconColor: AppColors.accent,
        child: Column(children: [
          ExpandableTableCard(
            title: 'Bảng sản xuất',
            subtitle: 'CPSX IN / GHÉP / CẮT · Khổ · Phế hao · Chi phí',
            icon: Icons.table_chart_outlined,
            iconColor: AppColors.accent,
            columns: const [
              TableColumn('Công đoạn', minWidth: 110),
              TableColumn('Vật liệu', minWidth: 80),
              TableColumn('Khổ (m)', minWidth: 65, align: TextAlign.right),
              TableColumn('TP (m)', minWidth: 60, align: TextAlign.right),
              TableColumn('Phế hao', minWidth: 60, align: TextAlign.right),
              TableColumn('ĐV VL', minWidth: 60, align: TextAlign.right),
              TableColumn('CPSX đ/m²', minWidth: 80, align: TextAlign.right),
              TableColumn('TT CPSX', minWidth: 90, align: TextAlign.right),
              TableColumn('CP VL đ/m²', minWidth: 85, align: TextAlign.right),
              TableColumn('TT CPVL', minWidth: 90, align: TextAlign.right),
            ],
            rows: [
              ...uniRows.map((row) {
                final inputVL = row.meters + row.waste;
                final s = const TextStyle(fontSize: 12);
                return [
                  TableCellData(row.stage, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  TableCellData(row.mat, style: s),
                  TableCellData(row.width.toStringAsFixed(3), align: TextAlign.right, style: s),
                  TableCellData(row.meters.toStringAsFixed(0), align: TextAlign.right, style: s),
                  TableCellData(row.waste.toStringAsFixed(0), align: TextAlign.right, style: s),
                  TableCellData(inputVL.toStringAsFixed(0), align: TextAlign.right,
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.accent)),
                  TableCellData(Fmt.n(row.cpsx.round()), align: TextAlign.right, style: s),
                  TableCellData(Fmt.n(row.costCPSX.round()), align: TextAlign.right, style: s),
                  TableCellData(row.matPrice != null ? Fmt.d3(row.matPrice!) : '—', align: TextAlign.right, style: s),
                  TableCellData(row.costMat != null ? Fmt.n(row.costMat!.round()) : '—', align: TextAlign.right, style: s),
                ];
              }),
              // Tổng CPSX / CPVL
              List.generate(10, (i) {
                if (i == 0) return TableCellData('TỔNG', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12));
                if (i == 7) return TableCellData(Fmt.n(totalCPSX.round()), align: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.info));
                if (i == 9) return TableCellData(Fmt.n(totalCPVL.round()), align: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.info));
                return TableCellData('');
              }),
            ],
            dense: true,
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.accent.withValues(alpha: 0.2)),
            ),
            child: Row(children: [
              const Text('TỔNG GIÁ VỐN SẢN XUẤT', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const Spacer(),
              Text('${Fmt.n(grandTotal.round())} đ',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.accent)),
            ]),
          ),
          const SizedBox(height: 4),
          DetailTableButton(
            label: 'Xem bảng sản xuất đầy đủ',
            onTap: () => showProductionTable(context, r),
          ),
        ]),
      ),
      const SizedBox(height: 12),

      // ═══ 5. Chi phí chi tiết ═══════════════════════════════════════════
      _CollapsibleSection(
        title: '📊 Phân tích chi phí sản xuất',
        icon: Icons.pie_chart_outline,
        iconColor: AppColors.info,
        child: _CostBreakdownContent(r: r, onViewTable: () => showCostTable(context, r)),
      ),
      const SizedBox(height: 12),

      // ═══ 6. Trọng lượng & Vận chuyển ══════════════════════════════════
      _CollapsibleSection(
        title: '⚖️ Trọng lượng & Vận chuyển',
        icon: Icons.local_shipping_outlined,
        iconColor: AppColors.warning,
        child: Column(children: [
          ...weightItems.map((it) => _KVRow(it.label, it.value)),
          const SizedBox(height: 4),
          DetailTableButton(
            label: 'Xem bảng sản xuất đầy đủ',
            onTap: () => showProductionTable(context, r),
          ),
        ]),
      ),
      const SizedBox(height: 12),

      // ═══ 7. Trục in ═══════════════════════════════════════════════════
      if (r.d('cylLength') > 0 || r.d('cylCircum') > 0) ...[
        _CollapsibleSection(
          title: '🖨️ Trục in',
          icon: Icons.album_outlined,
          iconColor: AppColors.accent,
          child: _CylinderContent(r: r, inp: inp, numColors: numColors, onViewTable: () => showCylinderTable(context, r)),
        ),
        const SizedBox(height: 12),
      ],
    ]);
  }
}

// ─── UniRow model ────────────────────────────────────────────────────────────
class _UniRow {
  final String stage, mat;
  final double width, meters, waste, cpsx, costCPSX;
  final double? matPrice, costMat;
  const _UniRow({required this.stage, required this.mat, required this.width, required this.meters, required this.waste, required this.cpsx, required this.costCPSX, this.matPrice, this.costMat});
}

class _KVItem {
  final String label, value;
  const _KVItem(this.label, this.value);
}

// ─── Collapsible Section ─────────────────────────────────────────────────────
class _CollapsibleSection extends StatefulWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;
  const _CollapsibleSection({required this.title, required this.icon, required this.iconColor, required this.child});
  @override
  State<_CollapsibleSection> createState() => _CollapsibleSectionState();
}
class _CollapsibleSectionState extends State<_CollapsibleSection> {
  bool _open = false;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Column(children: [
        InkWell(
          onTap: () => setState(() => _open = !_open),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: widget.iconColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                child: Icon(widget.icon, size: 15, color: widget.iconColor),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(widget.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5))),
              AnimatedRotation(turns: _open ? 0.5 : 0, duration: const Duration(milliseconds: 200),
                child: Icon(Icons.keyboard_arrow_down, color: scheme.onSurfaceVariant, size: 20)),
            ]),
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          child: _open
            ? Padding(padding: const EdgeInsets.fromLTRB(14, 0, 14, 14), child: widget.child)
            : const SizedBox(width: double.infinity),
        ),
      ]),
    );
  }
}

// ─── Section Card (luôn mở) ───────────────────────────────────────────────────
class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;
  const _SectionCard({required this.title, required this.icon, required this.iconColor, required this.child});
  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: iconColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 15, color: iconColor)),
          const SizedBox(width: 10),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
        ]),
        const SizedBox(height: 10),
        child,
      ]),
    ),
  );
}

// ─── KVRow ────────────────────────────────────────────────────────────────────
Widget _KVRow(String label, String value, {bool bold = false, bool highlight = false, bool mono = false, Color? color}) {
  return Builder(builder: (context) {
    final scheme = Theme.of(context).colorScheme;
    final vc = color ?? (highlight ? AppColors.warning : scheme.onSurface);
    return Container(
      padding: EdgeInsets.symmetric(vertical: 5, horizontal: highlight ? 10 : 0),
      margin: highlight ? const EdgeInsets.symmetric(vertical: 3) : EdgeInsets.zero,
      decoration: highlight ? BoxDecoration(color: AppColors.warning.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.warning.withValues(alpha: 0.25))) : null,
      child: Row(children: [
        Expanded(child: Text(label, style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant, fontWeight: bold ? FontWeight.w600 : FontWeight.w400))),
        Text(value, style: TextStyle(fontSize: bold ? 13.5 : 13, fontWeight: bold ? FontWeight.w800 : FontWeight.w600, color: vc, fontFamily: mono ? 'monospace' : null)),
      ]),
    );
  });
}

// ─── Stat Grid (giống web: LN / DT / Giá bán / Hoa hồng) ─────────────────────
class _StatGrid extends StatelessWidget {
  final double profitAmount, profitRate, revenue, finalPrice, commission, commPerUnit, commPct;
  final bool isMang;
  final String unitLabel;
  const _StatGrid({required this.profitAmount, required this.profitRate, required this.revenue, required this.finalPrice, required this.commission, required this.commPerUnit, required this.commPct, required this.isMang, required this.unitLabel});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      _StatCard(label: 'Lợi Nhuận', value: '${Fmt.shortM(profitAmount)}₫', sub: '${Fmt.pct(profitRate)}%', color: AppColors.success),
      const SizedBox(width: 8),
      _StatCard(label: 'Doanh Thu', value: '${Fmt.shortM(revenue)}₫', color: AppColors.info),
      const SizedBox(width: 8),
      _StatCard(label: 'Giá/${isMang ? 'm²' : 'Túi'}', value: '${Fmt.n(finalPrice.round())} đ', color: AppColors.warning),
      const SizedBox(width: 8),
      _StatCard(label: 'Hoa Hồng', value: '${Fmt.n(commPerUnit.round())} đ', sub: '${Fmt.pct(commPct)}%', color: AppColors.accent),
    ]);
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final String? sub;
  final Color color;
  const _StatCard({required this.label, required this.value, this.sub, required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: color, letterSpacing: 0.2)),
        const SizedBox(height: 4),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft,
          child: Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: color, letterSpacing: -0.3))),
        if (sub != null) Text(sub!, style: TextStyle(fontSize: 10.5, color: color.withValues(alpha: 0.80), fontWeight: FontWeight.w600)),
      ]),
    ),
  );
}

// ─── Cost breakdown ───────────────────────────────────────────────────────────
class _CostBreakdownContent extends StatelessWidget {
  final CalculateResult r;
  final VoidCallback onViewTable;
  const _CostBreakdownContent({required this.r, required this.onViewTable});

  @override
  Widget build(BuildContext context) {
    final totalProd = r.d('tongChiPhiSX');
    final items = [
      ('🖨️ In ấn', r.d('tongChiPhiIn')),
      ('🔗 Ghép màng', r.d('tongChiPhiGhep')),
      ('✂️ Cắt bao', r.d('tongChiPhiCat')),
      ('✨ Nhũ', r.d('nhuCost')),
      ('🌫️ Phủ mờ', r.d('moCost')),
      ('🔒 Zipper', r.d('tongTienKhoa')),
      ('📎 Băng keo', r.d('tongTienBangKeo')),
      ('🛍️ Quai xách', r.d('tongTienQuaiXach')),
      ('📦 Đóng gói', r.d('phiDongGoiPerDonVi')),
      ('🚚 Vận chuyển', r.d('tongCuocVanChuyen')),
    ].where((x) => x.$2 > 0).toList();

    final maxVal = items.fold(0.0, (m, it) => it.$2 > m ? it.$2 : m);

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(color: AppColors.info.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.info.withValues(alpha: 0.2))),
        child: Row(children: [
          Icon(Icons.pie_chart_outline, color: AppColors.info, size: 18),
          const SizedBox(width: 8),
          const Text('Tổng CPSX', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const Spacer(),
          Text(Fmt.vnd(totalProd), style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.info)),
        ]),
      ),
      const SizedBox(height: 12),
      ...items.map((it) {
        final ratio = maxVal > 0 ? (it.$2 / maxVal).clamp(0.0, 1.0) : 0.0;
        final pct = totalProd > 0 ? (it.$2 / totalProd * 100) : 0.0;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(child: Text(it.$1, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500))),
              Text('${pct.toStringAsFixed(1)}%', style: TextStyle(fontSize: 11, color: AppColors.info, fontWeight: FontWeight.w700)),
              const SizedBox(width: 8),
              Text(Fmt.vnd(it.$2), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 4),
            ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: ratio, minHeight: 5, backgroundColor: AppColors.info.withValues(alpha: 0.10), valueColor: AlwaysStoppedAnimation(AppColors.info))),
          ]),
        );
      }),
      const SizedBox(height: 4),
      DetailTableButton(label: 'Xem bảng chi phí đầy đủ', onTap: onViewTable),
    ]);
  }
}

// ─── Cylinder content ─────────────────────────────────────────────────────────
class _CylinderContent extends StatelessWidget {
  final CalculateResult r;
  final Map<String, dynamic> inp;
  final int numColors;
  final VoidCallback onViewTable;
  const _CylinderContent({required this.r, required this.inp, required this.numColors, required this.onViewTable});

  @override
  Widget build(BuildContext context) {
    final cylLength  = r.d('chieuDaiTruc');
    final cylCircum  = r.d('chuViTruc');
    final cylCost    = r.cylinderCost;
    final cylPerUnit = r.d('chiPhiTrucPerDonVi');
    final cylAlloc   = r.d('chiPhiTrucPhanBo');
    final cylIncluded = (inp['cylIncluded'] as bool?) ?? false;
    final cylType    = (inp['cylType'] as String?) ?? 'A';
    final oneTruc    = numColors > 0 ? cylCost / numColors : cylCost;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [AppColors.accent.withValues(alpha: 0.08), AppColors.info.withValues(alpha: 0.04)]),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.accent.withValues(alpha: 0.2)),
        ),
        child: Row(children: [
          Container(width: 52, height: 52, decoration: BoxDecoration(color: AppColors.accent.withValues(alpha: 0.15), shape: BoxShape.circle, border: Border.all(color: AppColors.accent.withValues(alpha: 0.3), width: 2)),
            child: Icon(Icons.album_outlined, color: AppColors.accent, size: 24)),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Loại trục $cylType', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.accent)),
            const SizedBox(height: 4),
            Row(children: [
              _CylDim('Dài', '${cylLength.toStringAsFixed(3)} m'),
              const SizedBox(width: 14),
              _CylDim('Chu vi', '${cylCircum.toStringAsFixed(3)} m'),
              const SizedBox(width: 14),
              _CylDim('DT', '${r.d('dienTichTruc').toStringAsFixed(4)} m²'),
            ]),
          ])),
        ]),
      ),
      const SizedBox(height: 12),
      _KVRow('Số màu', '$numColors màu'),
      _KVRow('Chi phí 1 trục', Fmt.vnd(oneTruc)),
      _KVRow('Chi phí cả bộ ($numColors màu)', Fmt.vnd(cylCost), bold: true),
      _KVRow('Chi phí / đv sản phẩm', Fmt.vnd(cylPerUnit)),
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: (cylIncluded ? AppColors.success : AppColors.muted).withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: (cylIncluded ? AppColors.success : AppColors.muted).withValues(alpha: 0.2)),
        ),
        child: Row(children: [
          Icon(cylIncluded ? Icons.check_circle_outline : Icons.remove_circle_outline, color: cylIncluded ? AppColors.success : AppColors.muted, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(cylIncluded ? 'Đang BAO TRỤC (+${Fmt.vnd(cylAlloc)}/đv)' : 'Không bao trục — tách riêng',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: cylIncluded ? AppColors.success : AppColors.muted))),
        ]),
      ),
      if (cylLength > 0 && cylLength < 0.7) _WarnBox('⚠️ Chiều dài trục ${cylLength}m dưới tối thiểu (0.7m)'),
      if (cylLength > 1.25) _WarnBox('⚠️ Chiều dài trục ${cylLength}m vượt tối đa (1.25m)'),
      if (cylCircum > 0 && cylCircum < 0.4) _WarnBox('⚠️ Chu vi trục ${cylCircum}m dưới tối thiểu (0.4m)'),
      if (cylCircum > 0.9) _WarnBox('⚠️ Chu vi trục ${cylCircum}m vượt tối đa (0.9m)'),
      const SizedBox(height: 4),
      DetailTableButton(label: 'Xem bảng trục in đầy đủ', onTap: onViewTable),
    ]);
  }
}

class _CylDim extends StatelessWidget {
  final String label, value;
  const _CylDim(this.label, this.value);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: TextStyle(fontSize: 10, color: Theme.of(context).colorScheme.onSurfaceVariant)),
    Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
  ]);
}

class _WarnBox extends StatelessWidget {
  final String text;
  const _WarnBox(this.text);
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: 8),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.warning.withValues(alpha: 0.3))),
    child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.warning)),
  );
}
