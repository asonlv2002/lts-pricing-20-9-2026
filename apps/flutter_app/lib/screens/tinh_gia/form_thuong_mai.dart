// ═══════════════════════════════════════════════════════════════════════════
// form_thuong_mai.dart — Thương mại (part of tinh_gia_screen).
// Mirror nhánh `laThuongMai` trong apps/web/src/components/TheNhapLieu.tsx
// (section [Thu mua]) + ManHinhQuanLy.tsx (nhánh commercial).
// ═══════════════════════════════════════════════════════════════════════════
part of '../tinh_gia_screen.dart';

// ─── Section [Thu mua] ────────────────────────────────────────────────────────
class _ThuMuaSection extends StatelessWidget {
  final AppState state;
  final bool laMoTa;
  const _ThuMuaSection({required this.state, required this.laMoTa});

  @override
  Widget build(BuildContext context) {
    final i = state.currentInput.raw;
    void u(String k, dynamic v) => state.updateInput(k, v);

    return SectionCard(
      title: 'Thu mua',
      icon: Icons.shopping_cart_outlined,
      iconColor: AppColors.warning,
      children: [
        LabeledField(
          label: 'Đơn giá mua',
          child: Row(
            children: [
              Expanded(
                child: NumField(
                  initial: (i['commercialPurchasePrice'] as num?) ?? 0,
                  integer: true,
                  onChanged: (v) => u('commercialPurchasePrice', v),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 130,
                child: DropdownField<String>(
                  options: const [
                    ('tui', '/Túi'),
                    ('m2', '/m²'),
                    ('m', '/m'),
                    ('custom', 'Khác…'),
                  ],
                  selected: (i['commercialUnitKind'] as String?) ?? 'tui',
                  onChanged: (v) => u('commercialUnitKind', v ?? 'tui'),
                ),
              ),
            ],
          ),
        ),
        if (i['commercialUnitKind'] == 'custom')
          LabeledField(
            label: 'Đơn vị tự nhập',
            child: TxtField(
              initial: (i['commercialUnitLabel'] as String?) ?? '',
              hintText: 'vd: thùng, hộp, kg',
              onChanged: (v) => u('commercialUnitLabel', v),
            ),
          ),
        LabeledField(
          label: 'Lợi nhuận',
          child: Row(
            children: [
              Expanded(
                child: NumField(
                  initial: (i['commercialProfitValue'] as num?) ?? 0,
                  onChanged: (v) => u('commercialProfitValue', v),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 110,
                child: DropdownField<String>(
                  options: const [('percent', '%'), ('vnd', 'VND')],
                  selected:
                      (i['commercialProfitUnit'] as String?) ?? 'percent',
                  onChanged: (v) => u('commercialProfitUnit', v ?? 'percent'),
                ),
              ),
            ],
          ),
        ),
        if (laMoTa)
          LabeledField(
            label: 'Trọng lượng / đơn vị',
            suffix: '(gr)',
            child: NumField(
              initial: (i['commercialUnitWeight'] as num?) ?? 0,
              integer: true,
              suffix: 'gr',
              onChanged: (v) => u('commercialUnitWeight', v),
            ),
          ),
      ],
    );
  }
}

// ─── Textarea nhiều dòng ──────────────────────────────────────────────────────
class _MultilineField extends StatefulWidget {
  final String initial;
  final String? hintText;
  final ValueChanged<String> onChanged;
  const _MultilineField(
      {required this.initial, this.hintText, required this.onChanged});
  @override
  State<_MultilineField> createState() => _MultilineFieldState();
}

class _MultilineFieldState extends State<_MultilineField> {
  late final TextEditingController _ctrl =
      TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      minLines: 6,
      maxLines: 12,
      keyboardType: TextInputType.multiline,
      decoration: InputDecoration(hintText: widget.hintText),
      onChanged: widget.onChanged,
    );
  }
}

// ─── Kết quả Thương mại — mirror nhánh commercial trong ManHinhQuanLy.tsx ────
class _ThuongMaiResult extends StatelessWidget {
  final AppState state;
  final bool laMoTa;
  const _ThuongMaiResult({required this.state, required this.laMoTa});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final i = state.currentInput.raw;
    final r = state.currentResult;
    final tm = KetQuaThuongMai.tinh(i);
    final qty = tm.quantity;
    final laCoSL = qty > 0;
    final donVi = tm.unitLabel; // '/Túi' | '/m²' | '/m' | '/<custom>'

    // Tổng per-unit theo công thức tinhDonGiaThuongMaiHieuLuc (chỉ form mode).
    final tongPerUnit = tinhDonGiaThuongMaiHieuLuc(i, r?.raw);
    final giaHienThi = tongPerUnit ?? tm.unitPriceVnd;
    final hienThi = (laCoSL || laMoTa) ? giaHienThi : 0.0;

    final lnLabel = tm.profitUnit == 'percent'
        ? '${tm.profitRawValue.toStringAsFixed(2)}%'
        : '${_fmt(tm.profitRawValue)} đ$donVi '
            '(= ${(tm.profitPct * 100).toStringAsFixed(2)}%)';

    final rows = <(String, String)>[
      ('Giá mua / đơn vị', '${_fmt(tm.purchasePrice)} đ$donVi'),
      ('Lợi nhuận', lnLabel),
      ('Giá vốn + LN / đơn vị', '${_fmt(tm.unitPriceVnd)} đ$donVi'),
      if ((r?.d('boxPerUnit') ?? 0) > 0)
        ('Chi phí thùng', '${_fmt(r!.d('boxPerUnit'))} đ'),
      if ((r?.d('shippingPerUnit') ?? 0) > 0)
        ('Vận chuyển', '${_fmt(r!.d('shippingPerUnit'))} đ'),
      if ((r?.d('interestPerUnit') ?? 0) > 0)
        ('Lãi vay vốn', '${_fmt(r!.d('interestPerUnit'))} đ'),
      if ((r?.d('commissionPerUnit') ?? 0) > 0)
        ('Hoa hồng', '${_fmt(r!.d('commissionPerUnit'))} đ'),
      if (tm.extraFeePerUnit > 0) ('Phụ phí khác', '${_fmt(tm.extraFeePerUnit)} đ'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LtsCard(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: p.accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text('THƯƠNG MẠI',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                          color: p.accent)),
                ),
              ]),
              const SizedBox(height: 14),
              Text(laMoTa ? 'GIÁ ĐỀ XUẤT' : 'GIÁ ĐỀ XUẤT / ĐƠN VỊ',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: p.muted)),
              const SizedBox(height: 2),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(_fmt(hienThi),
                          style: TextStyle(
                              fontSize: 48,
                              fontWeight: FontWeight.w900,
                              color: p.text,
                              height: 1.0,
                              letterSpacing: -2)),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8, left: 6),
                    child: Text('₫',
                        style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: p.muted)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              if (laMoTa &&
                  (i['commercialDescription'] as String? ?? '').trim().isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                      color: p.inputBg,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: p.border)),
                  child: Text((i['commercialDescription'] as String).trim(),
                      style: TextStyle(fontSize: 11.5, color: p.text)),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        LtsCard(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Chi tiết giá',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: p.text)),
              const SizedBox(height: 10),
              for (final row in rows)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(row.$1,
                            style: TextStyle(fontSize: 12.5, color: p.muted)),
                      ),
                      Text(row.$2,
                          style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: p.text)),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  String _fmt(num v) => v.round().toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
}
