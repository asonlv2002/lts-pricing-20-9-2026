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
    final giaDeXuat = (laCoSL || laMoTa) ? giaHienThi : 0.0;
    // Giá chốt (nếu có) thay thế giá đề xuất trên hero — mirror web shownPriceTM.
    final hasChotGia = state.currentChotGia > 0;
    final hienThi = hasChotGia ? state.currentChotGia : giaDeXuat;

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
              Text(
                  hasChotGia
                      ? (laMoTa ? 'GIÁ BÁN CHỐT' : 'GIÁ BÁN CHỐT / ĐƠN VỊ')
                      : (laMoTa ? 'GIÁ ĐỀ XUẤT' : 'GIÁ ĐỀ XUẤT / ĐƠN VỊ'),
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
                              color: hasChotGia ? p.green : p.text,
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
              if (hasChotGia)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text('(giá đề xuất ${_fmt(giaDeXuat)} đ$donVi)',
                      style: TextStyle(fontSize: 11, color: p.muted)),
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
        _ChotGiaThuongMai(
          state: state,
          giaDeXuat: giaDeXuat,
          hoaHongPerUnit: r?.d('commissionPerUnit') ?? 0,
          chiPhiDonVi: tm.purchasePrice +
              (r?.d('shippingPerUnit') ?? 0) +
              (r?.d('boxPerUnit') ?? 0) +
              tm.extraFeePerUnit +
              (r?.d('interestPerUnit') ?? 0),
          qty: qty,
          donVi: donVi,
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

// ─── Chốt giá Thương mại — mirror khối chot-gia-row + chotAnalysis (commercial) ─
class _ChotGiaThuongMai extends StatefulWidget {
  final AppState state;
  final double giaDeXuat;
  final double hoaHongPerUnit;
  final double chiPhiDonVi;
  final double qty;
  final String donVi; // '/Túi' | '/m²' | …
  const _ChotGiaThuongMai({
    required this.state,
    required this.giaDeXuat,
    required this.hoaHongPerUnit,
    required this.chiPhiDonVi,
    required this.qty,
    required this.donVi,
  });

  @override
  State<_ChotGiaThuongMai> createState() => _ChotGiaThuongMaiState();
}

class _ChotGiaThuongMaiState extends State<_ChotGiaThuongMai> {
  late final TextEditingController _chotCtrl;
  late final TextEditingController _hoaHongCtrl;

  AppState get s => widget.state;

  @override
  void initState() {
    super.initState();
    _chotCtrl = TextEditingController(
        text: s.currentChotGia > 0 ? s.currentChotGia.round().toString() : '');
    _hoaHongCtrl = TextEditingController(
        text: s.phanBoCongTy != 0 ? _trim(s.phanBoCongTy) : '');
  }

  @override
  void didUpdateWidget(covariant _ChotGiaThuongMai oldWidget) {
    super.didUpdateWidget(oldWidget);
    final expectedChot =
        s.currentChotGia > 0 ? s.currentChotGia.round().toString() : '';
    if (_chotCtrl.text != expectedChot) _chotCtrl.text = expectedChot;
  }

  @override
  void dispose() {
    _chotCtrl.dispose();
    _hoaHongCtrl.dispose();
    super.dispose();
  }

  static String _trim(double v) {
    final str = v.toStringAsFixed(1);
    return str.endsWith('.0') ? str.substring(0, str.length - 2) : str;
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final donVi = widget.donVi;
    final donViGoc = donVi.replaceFirst('/', '');
    final chotGiaNum = s.currentChotGia;
    final hasChotGia = chotGiaNum > 0;
    final diff = hasChotGia ? chotGiaNum - widget.giaDeXuat : 0.0;
    final phanBo = tinhNhapPhanBoChotGia(
      hasChotGia: hasChotGia,
      diff: diff,
      hoaHongNhap: s.phanBoCongTy,
      hoaHongEngine: widget.hoaHongPerUnit,
      donViPhanBo: s.donViPhanBo,
    );
    final phanBoHoaHong = phanBo.hoaHongAmount;
    final newCommissionPerUnit = (widget.hoaHongPerUnit + phanBoHoaHong) < 0
        ? 0.0
        : widget.hoaHongPerUnit + phanBoHoaHong;
    final shownPrice = hasChotGia ? chotGiaNum : widget.giaDeXuat;
    final doanhThuChot = shownPrice * widget.qty;
    final tongHoaHongChot = newCommissionPerUnit * widget.qty;
    final tongChiPhi = widget.chiPhiDonVi * widget.qty;
    final loiNhuanCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
    final pctLoiNhuanCongTyChot =
        tongChiPhi > 0 ? loiNhuanCongTyChot / tongChiPhi : 0.0;
    final commissionPctShown =
        tongChiPhi > 0 ? newCommissionPerUnit * widget.qty / tongChiPhi : 0.0;

    return LtsCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const LtsCardTitle('Chốt giá', icon: Icons.price_check_outlined),
          Text('Giá bán chốt (đ$donVi)',
              style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600, color: p.muted)),
          const SizedBox(height: 6),
          TextField(
            controller: _chotCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
            ],
            decoration: InputDecoration(
              isDense: true,
              hintText: 'Nhập giá chốt...',
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(LtsT.rInput),
                borderSide: const BorderSide(color: AppColors.success),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(LtsT.rInput),
                borderSide:
                    const BorderSide(color: AppColors.success, width: 1.6),
              ),
            ),
            onChanged: (raw) => s.setCurrentChotGia(double.tryParse(raw) ?? 0),
          ),
          const SizedBox(height: 14),
          Opacity(
            opacity: hasChotGia ? 1 : 0.5,
            child: IgnorePointer(
              ignoring: !hasChotGia,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                      hasChotGia
                          ? 'Phân bổ chênh lệch (${diff >= 0 ? '+' : ''}${Fmt.d1(diff)}đ/$donVi)'
                          : 'Phân bổ chênh lệch',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: p.muted)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text('Hoa hồng',
                          style: TextStyle(fontSize: 12, color: p.muted)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: TextField(
                          controller: _hoaHongCtrl,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                          ],
                          decoration: const InputDecoration(
                            isDense: true,
                            hintText: '0',
                            border: OutlineInputBorder(),
                          ),
                          onChanged: (raw) {
                            if (raw.trim().isEmpty) {
                              s.setPhanBoCongTy(0);
                              return;
                            }
                            final v = double.tryParse(raw.replaceAll(',', '.'));
                            if (v == null) return;
                            final next = s.donViPhanBo == DonViPhanBo.percent
                                ? v.clamp(0, 100).toDouble()
                                : (v < 0 ? 0.0 : v);
                            s.setPhanBoCongTy(next);
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('Công ty',
                          style: TextStyle(fontSize: 12, color: p.muted)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 12),
                          decoration: BoxDecoration(
                            color: p.inputBg,
                            borderRadius: BorderRadius.circular(LtsT.rInput),
                            border: Border.all(
                                color: phanBo.loi.isNotEmpty
                                    ? AppColors.danger
                                    : p.border),
                          ),
                          child: Text(
                            phanBo.loi.isNotEmpty
                                ? 'Lỗi phân bổ'
                                : Fmt.d1(phanBo.congTyDisplay),
                            textAlign: TextAlign.right,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: phanBo.loi.isNotEmpty
                                  ? AppColors.danger
                                  : p.text,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      DropdownButton<DonViPhanBo>(
                        value: s.donViPhanBo,
                        isDense: true,
                        underline: const SizedBox.shrink(),
                        items: const [
                          DropdownMenuItem(
                              value: DonViPhanBo.vnd, child: Text('VNĐ')),
                          DropdownMenuItem(
                              value: DonViPhanBo.percent, child: Text('%')),
                        ],
                        onChanged: (v) {
                          if (v != null) s.setDonViPhanBo(v);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (hasChotGia) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (diff >= 0 ? AppColors.success : AppColors.warning)
                    .withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: (diff >= 0 ? AppColors.success : AppColors.warning)
                        .withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _Row(
                    label: '${diff >= 0 ? '✅' : '⚠️'} Chênh lệch / $donViGoc',
                    value:
                        '${diff >= 0 ? '+' : ''}${Fmt.d1(diff)} đ/$donViGoc',
                    bold: true,
                  ),
                  _Row(
                    label: s.donViPhanBo == DonViPhanBo.percent
                        ? '↳ Hoa hồng: ${Fmt.d1(phanBo.hoaHongDisplay)}% = ${Fmt.d1(phanBo.hoaHongAmount)}đ | Công ty: ${Fmt.d1(phanBo.congTyDisplay)}% = ${Fmt.d1(phanBo.congTyAmount)}đ'
                        : '↳ Hoa hồng: ${Fmt.d1(phanBoHoaHong)}đ | Công ty: ${Fmt.d1(phanBo.congTyAmount)}đ',
                    small: true,
                  ),
                  for (final msg in phanBo.loi)
                    _Row(label: '⚠ $msg', small: true, warn: true),
                  const Divider(height: 16),
                  _Row(
                    label: 'Doanh thu tổng',
                    value:
                        '${Fmt.n(shownPrice)} đ/$donViGoc × ${Fmt.n(widget.qty)} $donViGoc = ${Fmt.n(doanhThuChot)} đ',
                    bold: true,
                  ),
                  _Row(
                    label:
                        'LN công ty (${formatPercent(pctLoiNhuanCongTyChot)})',
                    value: '${Fmt.n(loiNhuanCongTyChot)} đ',
                  ),
                  _Row(
                    label: '% Hoa hồng (${formatPercent(commissionPctShown)})',
                    value: '${Fmt.n(tongHoaHongChot)} đ',
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String? value;
  final bool bold;
  final bool small;
  final bool warn;
  const _Row({
    required this.label,
    this.value,
    this.bold = false,
    this.small = false,
    this.warn = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: small ? 11.5 : 12.5,
                color: warn ? const Color(0xFFB45309) : p.muted,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
          if (value != null)
            Text(
              value!,
              style: TextStyle(
                fontSize: small ? 11.5 : 12.5,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: p.text,
              ),
            ),
        ],
      ),
    );
  }
}
