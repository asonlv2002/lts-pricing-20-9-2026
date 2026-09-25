// ═══════════════════════════════════════════════════════════════════════════
// ChotGiaSection — nhập "Giá bán chốt" + phân bổ chênh lệch + phân tích.
// Mirror `ManHinhQuanLy.tsx` (chot-gia-row + #chotAnalysis) + `chot-gia-allocation.ts`.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:lts_pricing/lib/chot_gia_allocation.dart';
import 'package:lts_pricing/lib/pricing_display.dart';

import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'lts/lts_surfaces.dart';

class ChotGiaSection extends StatefulWidget {
  final AppState state;
  const ChotGiaSection({super.key, required this.state});

  @override
  State<ChotGiaSection> createState() => _ChotGiaSectionState();
}

class _ChotGiaSectionState extends State<ChotGiaSection> {
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
  void didUpdateWidget(covariant ChotGiaSection oldWidget) {
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
    final s = v.toStringAsFixed(1);
    return s.endsWith('.0') ? s.substring(0, s.length - 2) : s;
  }

  @override
  Widget build(BuildContext context) {
    final r = s.currentResult == null ? null : s.ketQuaHienThi;
    if (r == null) return const SizedBox.shrink();
    final p = LtsT.of(context);

    final input = (r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw;
    final meta = getPricingDisplayMeta(input);
    final qty = (input['quantity'] as num?)?.toDouble() ?? 0;
    final giaDeXuat = r.finalPrice;
    final chotGiaNum = s.currentChotGia;
    final hasChotGia = chotGiaNum > 0;
    final diff = hasChotGia ? chotGiaNum - giaDeXuat : 0.0;

    final effCommissionPerUnit = r.d('commissionPerUnit');
    final phanBo = tinhNhapPhanBoChotGia(
      hasChotGia: hasChotGia,
      diff: diff,
      hoaHongNhap: s.phanBoCongTy,
      hoaHongEngine: effCommissionPerUnit,
      donViPhanBo: s.donViPhanBo,
    );
    final phanBoHoaHong = phanBo.hoaHongAmount;
    final newCommissionPerUnit =
        (effCommissionPerUnit + phanBoHoaHong) < 0 ? 0.0 : effCommissionPerUnit + phanBoHoaHong;

    final doanhThuChot = chotGiaNum * qty;
    final tongHoaHongChot = newCommissionPerUnit * qty;
    final cylIncluded = (input['cylIncluded'] as bool?) ?? false;
    final tongChiPhiSX = r.totalProductionCost;
    final tongChiPhi = tongChiPhiSX +
        r.d('boxTotal') +
        r.d('shippingTotal') +
        (r.d('interestPerUnit') * qty) +
        (cylIncluded ? r.d('cylAllocPerUnit') * qty : 0) +
        r.d('gcShippingTotal') +
        r.d('gcPackagingTotal') +
        r.d('gcOtherTotal');
    final loiNhuanCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
    final pctLoiNhuanCongTyChot =
        tongChiPhiSX > 0 ? loiNhuanCongTyChot / tongChiPhiSX : 0.0;
    final commissionPctShown =
        tongChiPhiSX > 0 ? newCommissionPerUnit * qty / tongChiPhiSX : 0.0;

    final donVi = meta.unit;
    final giaTriCongTy = phanBo.loi.isNotEmpty
        ? 'Lỗi phân bổ'
        : Fmt.d1(phanBo.congTyDisplay);

    return LtsCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LtsCardTitle('Chốt giá', icon: Icons.price_check_outlined),
          _FieldLabel('Giá bán chốt (đ/$donVi)'),
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
                borderSide: const BorderSide(color: AppColors.success, width: 1.6),
              ),
            ),
            onChanged: (raw) {
              final v = double.tryParse(raw) ?? 0;
              s.setCurrentChotGia(v);
            },
          ),
          const SizedBox(height: 14),
          Opacity(
            opacity: hasChotGia ? 1 : 0.5,
            child: IgnorePointer(
              ignoring: !hasChotGia,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _FieldLabel(hasChotGia
                      ? 'Phân bổ chênh lệch (${diff >= 0 ? '+' : ''}${Fmt.d1(diff)}đ/$donVi)'
                      : 'Phân bổ chênh lệch'),
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
                            giaTriCongTy,
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
                  _AnalysisRow(
                    label: '${diff >= 0 ? '✅' : '⚠️'} Chênh lệch / $donVi',
                    value:
                        '${diff >= 0 ? '+' : ''}${Fmt.d1(diff)} đ/$donVi',
                    bold: true,
                  ),
                  _AnalysisRow(
                    label: s.donViPhanBo == DonViPhanBo.percent
                        ? '↳ Hoa hồng: ${Fmt.d1(phanBo.hoaHongDisplay)}% = ${Fmt.d1(phanBo.hoaHongAmount)}đ | Công ty: ${Fmt.d1(phanBo.congTyDisplay)}% = ${Fmt.d1(phanBo.congTyAmount)}đ'
                        : '↳ Hoa hồng: ${Fmt.d1(phanBoHoaHong)}đ | Công ty: ${Fmt.d1(phanBo.congTyAmount)}đ',
                    small: true,
                  ),
                  for (final msg in phanBo.loi)
                    _AnalysisRow(label: '⚠ $msg', small: true, warn: true),
                  const Divider(height: 16),
                  _AnalysisRow(
                    label: 'Doanh thu tổng',
                    value:
                        '${Fmt.n(chotGiaNum)} đ/$donVi × ${Fmt.n(qty)} $donVi = ${Fmt.n(doanhThuChot)} đ',
                    bold: true,
                  ),
                  _AnalysisRow(
                    label:
                        'LN công ty (${formatPercent(pctLoiNhuanCongTyChot)})',
                    value: '${Fmt.n(loiNhuanCongTyChot)} đ',
                  ),
                  _AnalysisRow(
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

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);
  @override
  Widget build(BuildContext context) => Text(text,
      style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: LtsT.of(context).muted));
}

class _AnalysisRow extends StatelessWidget {
  final String label;
  final String? value;
  final bool bold;
  final bool small;
  final bool warn;
  const _AnalysisRow({
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
