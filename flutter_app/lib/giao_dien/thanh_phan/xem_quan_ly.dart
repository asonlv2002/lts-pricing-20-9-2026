// giao_dien/thanh_phan/xem_quan_ly.dart — ManagerView (theo ManagerView.tsx)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../../may_tinh/may_tinh_gia.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

// ─── Helpers format ───────────────────────────────────────────────────────────
String _fmt(double? n, {int dec = 0}) {
  if (n == null || n.isNaN || n.isInfinite) return '—';
  return dinhDangSo(n, chiSoThapPhan: dec);
}
String _fmtVND(double? n) => n == null ? '—' : '${_fmt(n)} đ';
String _fmtPct(double n) => '${(n * 100).toStringAsFixed(2)}%';
String _fmtM2(double? n) => n == null ? '—' : '${dinhDangSo(n, chiSoThapPhan: 4)} m²';
String _fmtTr(double n) => '${(n / 1000000).toStringAsFixed(2)}tr';

// ─── Main Widget ──────────────────────────────────────────────────────────────
class XemQuanLy extends StatefulWidget {
  const XemQuanLy({super.key});
  @override
  State<XemQuanLy> createState() => _XemQuanLyState();
}

class _XemQuanLyState extends State<XemQuanLy> {
  final _scrollCtrl = ScrollController();
  final _keyBaoGia   = GlobalKey();
  final _keyDacTa    = GlobalKey();
  final _keyMoq      = GlobalKey();
  final _keyMoqCuon  = GlobalKey();
  final _keyTrongLuong = GlobalKey();

  @override
  void dispose() { _scrollCtrl.dispose(); super.dispose(); }

  void _scrollTo(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
  }

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final kq = kho.ketQua;

    if (kq == null) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Text('📦', style: TextStyle(fontSize: 48)),
        const SizedBox(height: 12),
        Text('Nhập đầy đủ thông tin đơn hàng để xem kết quả tính giá',
            style: TextStyle(fontSize: 14, color: ChuDe.mauNhatTheo(toi)), textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text('Kết quả sẽ tự động cập nhật ngay khi thay đổi bất kỳ thông số nào',
            style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi).withAlpha(160)), textAlign: TextAlign.center),
      ]));
    }

    final dv = kq.dauVao;
    final isMang = dv.loaiSanPham == 'mang';
    final ni = dv.soConHinh < 1 ? 1 : dv.soConHinh;
    final unitLabel = isMang ? 'm²' : 'túi';
    final coChot = kho.giaChotHienTai > 0;
    final chotGia = kho.giaChotHienTai;
    final shownPrice = coChot ? chotGia : kq.giaBanCuoi;
    final diff = coChot ? chotGia - kq.giaBanCuoi : 0.0;

    // Doanh thu & lợi nhuận khi chốt
    final tongChiPhi = kq.tongCPSX + kq.tongZipper + kq.tongBangKeo + kq.tongQuai +
        kq.tongDongGoi + kq.tongVanChuyen + kq.laiVayTrenDv * dv.soLuong;
    final doanhThuChot = chotGia * dv.soLuong;
    final double newCommissionPerUnit = coChot ? ((chotGia - kq.tongCPSX - kq.giaTrenDvZipper -
        kq.giaTrenDvBangKeo - kq.giaTrenDvQuai - kq.giaTrenDvDongGoi -
        kq.giaTrenDvVanChuyen - kq.laiVayTrenDv).clamp(0.0, double.infinity)) : kq.hoaHongTrenDv;
    final tongHoaHongChot = newCommissionPerUnit * dv.soLuong;
    final lnCongTyChot = doanhThuChot - tongChiPhi - tongHoaHongChot;
    final pctLnCongTy = kq.tongCPSX > 0 ? (lnCongTyChot / kq.tongCPSX) : 0.0;

    final isDesktop = MediaQuery.of(context).size.width >= 1100;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Nội dung chính ─────────────────────────────────────────────────
        Expanded(
          child: SingleChildScrollView(
            controller: _scrollCtrl,
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 16, isDesktop ? 220 : 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ═══ 1. Báo giá gợi ý ═══════════════════════════════════
                  SizedBox(key: _keyBaoGia, height: 0),
                  _PriceHero(kq: kq, kho: kho, toi: toi, shownPrice: shownPrice,
                      coChot: coChot, diff: diff, unitLabel: unitLabel, isMang: isMang),
                  const SizedBox(height: 12),
                  _ChotGiaRow(kho: kho, kq: kq, toi: toi, unitLabel: unitLabel),
                  if (coChot) ...[
                    const SizedBox(height: 8),
                    _ChotAnalysis(kq: kq, kho: kho, toi: toi, diff: diff,
                        doanhThuChot: doanhThuChot, lnCongTyChot: lnCongTyChot,
                        pctLnCongTy: pctLnCongTy, tongHoaHongChot: tongHoaHongChot,
                        newCommissionPerUnit: newCommissionPerUnit, unitLabel: unitLabel),
                  ],
                  const SizedBox(height: 14),

                  // Stat grid 4 cards
                  _StatGrid4(kq: kq, kho: kho, toi: toi, coChot: coChot,
                      doanhThuChot: doanhThuChot, lnCongTyChot: lnCongTyChot,
                      pctLnCongTy: pctLnCongTy, tongHoaHongChot: tongHoaHongChot,
                      newCommissionPerUnit: newCommissionPerUnit, unitLabel: unitLabel),
                  const SizedBox(height: 14),

                  // Chi tiết giá đề xuất (collapsible)
                  _CollapsibleCard(
                    resetKey: kq.chuoiCauTruc,
                    tieu: Row(children: [
                      const Text('💰', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 6),
                      Text('Chi tiết giá ${coChot ? 'chốt' : 'đề xuất'} / $unitLabel',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi))),
                    ]),
                    toi: toi,
                    child: _ChiTietGia(kq: kq, kho: kho, toi: toi, coChot: coChot,
                        chotGia: chotGia, diff: diff, unitLabel: unitLabel),
                  ),

                  // ═══ 2. Đặc tả kỹ thuật ════════════════════════════════
                  SizedBox(key: _keyDacTa, height: 0),
                  _CollapsibleCard(
                    resetKey: kq.chuoiCauTruc,
                    tieu: Row(children: [
                      const Text('🏭', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 6),
                      Text('Đặc tả kỹ thuật & nguyên liệu',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi))),
                    ]),
                    toi: toi,
                    child: _BangDacTa(kq: kq, kho: kho, toi: toi, ni: ni, isMang: isMang),
                  ),

                  // ═══ 3. Bảng MOQ ═══════════════════════════════════════
                  SizedBox(key: _keyMoq, height: 0),
                  _CollapsibleCard(
                    resetKey: kq.chuoiCauTruc,
                    tieu: Row(children: [
                      const Text('📦', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 6),
                      Text('Bảng giá theo số lượng (MOQ)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi))),
                    ]),
                    toi: toi,
                    child: _BangMOQ(kq: kq, kho: kho, toi: toi, unitLabel: unitLabel),
                  ),

                  // ═══ 4. MOQ cuộn màng ═══════════════════════════════════
                  SizedBox(key: _keyMoqCuon, height: 0),
                  _CollapsibleCard(
                    resetKey: kq.chuoiCauTruc,
                    tieu: Row(children: [
                      const Text('🎞️', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 6),
                      Text('Số lượng theo cuộn màng',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi))),
                    ]),
                    toi: toi,
                    child: _BangMOQCuon(kq: kq, kho: kho, toi: toi, unitLabel: unitLabel),
                  ),

                  // ═══ 5. Trọng lượng ═════════════════════════════════════
                  SizedBox(key: _keyTrongLuong, height: 0),
                  _CollapsibleCard(
                    resetKey: kq.chuoiCauTruc,
                    tieu: Row(children: [
                      const Text('⚖️', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 6),
                      Text('Trọng lượng & Vận chuyển',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi))),
                    ]),
                    toi: toi,
                    child: _TrongLuong(kq: kq, isMang: isMang, toi: toi),
                  ),
                ],
              ),
            ),
          ),
        ),

        // ── TOC sidebar (chỉ desktop) ──────────────────────────────────────
        if (isDesktop)
          _TocSidebar(toi: toi, onTap: (i) {
            final keys = [_keyBaoGia, _keyDacTa, _keyMoq, _keyMoqCuon, _keyTrongLuong];
            _scrollTo(keys[i]);
          }),
      ],
    );
  }
}

// ─── TOC Sidebar ─────────────────────────────────────────────────────────────
class _TocSidebar extends StatelessWidget {
  final bool toi;
  final ValueChanged<int> onTap;
  const _TocSidebar({required this.toi, required this.onTap});

  static const _items = [
    '1. Bảng Báo Giá Gợi Ý',
    '2. Bảng Đặc Tả Kỹ Thuật',
    '3. Bảng Giá Theo MOQ',
    '4. Bảng MOQ Cuộn Màng',
    '5. Trọng Lượng & Vận Chuyển',
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 16, 12, 16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: ChuDe.mauMatTheo(toi),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: ChuDe.mauVienTheo(toi)),
            boxShadow: [BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 8)],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('MỤC LỤC', style: TextStyle(
                fontSize: 10, fontWeight: FontWeight.w700,
                color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.5,
              )),
              const SizedBox(height: 10),
              ..._items.asMap().entries.map((e) => InkWell(
                onTap: () => onTap(e.key),
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  margin: const EdgeInsets.only(bottom: 4),
                  decoration: BoxDecoration(
                    color: ChuDe.mauMat2Theo(toi),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(e.value, style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600,
                    color: ChuDe.mauChuTheo(toi),
                  )),
                ),
              )),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Collapsible Card ─────────────────────────────────────────────────────────
class _CollapsibleCard extends StatefulWidget {
  final Widget tieu;
  final Widget child;
  final String resetKey;
  final bool toi;
  const _CollapsibleCard({required this.tieu, required this.child, required this.resetKey, required this.toi});
  @override
  State<_CollapsibleCard> createState() => _CollapsibleCardState();
}
class _CollapsibleCardState extends State<_CollapsibleCard> {
  bool _open = false;
  @override
  void didUpdateWidget(_CollapsibleCard old) {
    super.didUpdateWidget(old);
    if (old.resetKey != widget.resetKey) setState(() => _open = false);
  }
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(widget.toi),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ChuDe.mauVienTheo(widget.toi)),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(10), blurRadius: 4)],
      ),
      child: Column(children: [
        InkWell(
          onTap: () => setState(() => _open = !_open),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Row(children: [
              Expanded(child: widget.tieu),
              AnimatedRotation(
                turns: _open ? 0 : 0.5,
                duration: const Duration(milliseconds: 220),
                child: Icon(Icons.expand_less, size: 18, color: ChuDe.mauNhatTheo(widget.toi)),
              ),
            ]),
          ),
        ),
        AnimatedCrossFade(
          firstChild: const SizedBox.shrink(),
          secondChild: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: widget.child,
          ),
          crossFadeState: _open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 250),
        ),
      ]),
    );
  }
}

// ─── Price Hero ──────────────────────────────────────────────────────────────
class _PriceHero extends StatelessWidget {
  final KetQuaTinhGia kq;
  final KhoChinhLuuTru kho;
  final bool toi;
  final double shownPrice;
  final bool coChot;
  final double diff;
  final String unitLabel;
  final bool isMang;
  const _PriceHero({required this.kq, required this.kho, required this.toi,
      required this.shownPrice, required this.coChot, required this.diff,
      required this.unitLabel, required this.isMang});

  @override
  Widget build(BuildContext context) {
    final dv = kq.dauVao;
    final spreadMm = (dv.khoTrai * 1000).round();
    final cutMm = (dv.buocCat * 1000).round();
    final numColorsText = (dv.soMauIn ?? 0) > 0 ? '${dv.soMauIn} màu' : 'Không in';
    final cylPerUnit = kq.chiPhiTrucTrenDv;
    final numTr = dv.soMauIn ?? 0;
    final cylTotal = kq.chiPhiTrucIn;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [ChuDe.mauTruc(toi).withAlpha(18), ChuDe.mauTruc2(toi).withAlpha(10)],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ChuDe.mauTruc(toi).withAlpha(40)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
        // Label
        Text(
          coChot ? 'Giá chốt / $unitLabel' : 'Giá đề xuất / $unitLabel',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
              color: coChot ? ChuDe.mauXanhTheo(toi) : ChuDe.mauNhatTheo(toi), letterSpacing: 0.5),
        ),
        const SizedBox(height: 6),
        // Giá lớn
        ShaderMask(
          shaderCallback: (b) => ChuDe.gradient(toi).createShader(b),
          child: Text(
            _fmt(shownPrice),
            style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white),
          ),
        ),
        if (coChot)
          Text('(giá đề xuất ${_fmt(kq.giaBanCuoi)} đ/$unitLabel)',
              style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
        Text('(chưa VAT)', style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),

        // Màng: giá/cuộn
        if (isMang && kq.dienTichCuonMang > 0) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: ChuDe.mauMat2Theo(toi),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: ChuDe.mauVienTheo(toi)),
            ),
            child: Column(children: [
              Text('Giá / cuộn (${spreadMm}mm × ${dinhDangSo(dv.chieuDaiCuonMang)}m)',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.3)),
              Text(_fmtVND((shownPrice * kq.dienTichCuonMang).roundToDouble()),
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: ChuDe.mauXanhTheo(toi))),
              Text('DT cuộn: ${_fmt(kq.dienTichCuonMang, dec: 1)} m²  ·  ${_fmt(shownPrice, dec: 0)} đ/m²',
                  style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
            ]),
          ),
        ],

        const SizedBox(height: 12),
        // Sub info
        if (dv.tenKhachHang.isNotEmpty || dv.tenSanPham.isNotEmpty)
          Text('${dv.tenKhachHang} — ${dv.tenSanPham}',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: ChuDe.mauChuTheo(toi))),
        const SizedBox(height: 8),
        Wrap(spacing: 20, runSpacing: 4, alignment: WrapAlignment.center, children: [
          _SubInfo('Chất liệu', kq.chuoiCauTruc, toi),
          _SubInfo(isMang ? 'Diện tích' : 'Số lượng',
              '${dinhDangSo(dv.soLuong)} $unitLabel', toi),
          _SubInfo('Số màu', numColorsText, toi),
          _SubInfo('Kích thước', 'KT $spreadMm mm x BC $cutMm mm', toi),
          _SubInfo('Độ dày', '${kq.doDay} mic', toi),
          _SubInfo('Diện tích ${isMang ? 'băng' : '1 túi'}', _fmtM2(kq.dienTich1Tui), toi),
          if (!isMang) _SubInfo('Trọng lượng', '${kq.trongLuong.toStringAsFixed(2)} gr', toi),
          if (numTr > 0)
            _SubInfo('Trục in',
                'D ${(dv.chieuDaiTruc * 1000).round()} mm × CV ${(dv.chuViTruc * 1000).round()} mm — ${_fmtVND(cylPerUnit)}/trục × $numTr = ${_fmtVND(cylTotal)}',
                toi),
        ]),
      ]),
    );
  }
}

class _SubInfo extends StatelessWidget {
  final String label;
  final String value;
  final bool toi;
  const _SubInfo(this.label, this.value, this.toi);
  @override
  Widget build(BuildContext context) {
    return RichText(text: TextSpan(
      style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)),
      children: [
        TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.w600)),
        TextSpan(text: value),
      ],
    ));
  }
}

// ─── Chốt giá row ─────────────────────────────────────────────────────────────
class _ChotGiaRow extends StatefulWidget {
  final KhoChinhLuuTru kho;
  final KetQuaTinhGia kq;
  final bool toi;
  final String unitLabel;
  const _ChotGiaRow({required this.kho, required this.kq, required this.toi, required this.unitLabel});
  @override
  State<_ChotGiaRow> createState() => _ChotGiaRowState();
}
class _ChotGiaRowState extends State<_ChotGiaRow> {
  final _ctrl = TextEditingController();
  @override
  void initState() {
    super.initState();
    if (widget.kho.giaChotHienTai > 0) {
      _ctrl.text = widget.kho.giaChotHienTai.round().toString();
    }
  }
  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final toi = widget.toi;
    final kho = widget.kho;
    final coChot = kho.giaChotHienTai > 0;

    return Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Giá bán chốt (đ/${widget.unitLabel})', style: TextStyle(
          fontSize: 10, fontWeight: FontWeight.w600,
          color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.4,
        )),
        const SizedBox(height: 4),
        TextField(
          controller: _ctrl,
          keyboardType: TextInputType.number,
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Nhập giá chốt...',
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: ChuDe.mauXanhTheo(toi)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: ChuDe.mauXanhTheo(toi), width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            isDense: true,
          ),
          onChanged: (v) => kho.datGiaChotHienTai(double.tryParse(v.replaceAll(',', '').replaceAll('.', '')) ?? 0),
        ),
      ])),
      const SizedBox(width: 8),
      NutNho(
        nhan: '✓ Lưu giá chốt',
        mauBien: ChuDe.mauXanhTheo(toi),
        mauChu: ChuDe.mauXanhTheo(toi),
        onNhan: coChot ? () { kho.luuGiaChot(); ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Đã lưu giá chốt'), duration: const Duration(seconds: 1)));
        } : null,
      ),
      const SizedBox(width: 6),
      NutNho(
        nhan: '💾 Lưu báo giá',
        onNhan: () { kho.luuVaoLichSu(); ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('💾 Đã lưu báo giá! Xem lịch sử →'),
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ));
        },
      ),
    ]);
  }
}

// ─── Chốt analysis ───────────────────────────────────────────────────────────
class _ChotAnalysis extends StatelessWidget {
  final KetQuaTinhGia kq;
  final KhoChinhLuuTru kho;
  final bool toi;
  final double diff;
  final double doanhThuChot;
  final double lnCongTyChot;
  final double pctLnCongTy;
  final double tongHoaHongChot;
  final double newCommissionPerUnit;
  final String unitLabel;
  const _ChotAnalysis({required this.kq, required this.kho, required this.toi,
      required this.diff, required this.doanhThuChot, required this.lnCongTyChot,
      required this.pctLnCongTy, required this.tongHoaHongChot,
      required this.newCommissionPerUnit, required this.unitLabel});

  @override
  Widget build(BuildContext context) {
    final positive = diff >= 0;
    final mauAcc = positive ? ChuDe.mauXanhTheo(toi) : (toi ? ChuDe.mauDoToi : ChuDe.mauDo);
    final dv = kq.dauVao;
    final commissionPct = kq.tongCPSX > 0 ? newCommissionPerUnit / kq.tongCPSX : 0.0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: mauAcc.withAlpha(18),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: mauAcc.withAlpha(60)),
      ),
      child: Column(children: [
        _ChotRow('${positive ? '✅' : '⚠️'} Chênh lệch / $unitLabel',
            '${positive ? '+' : ''}${_fmt(diff, dec: 1)} đ/$unitLabel', mauAcc),
        _ChotRow('Doanh thu tổng',
            '${_fmt(kho.giaChotHienTai)} đ/$unitLabel × ${_fmt(dv.soLuong)} $unitLabel = ${_fmtVND(doanhThuChot)}',
            ChuDe.mauChuTheo(toi), bold: true),
        _ChotRow('LN công ty (${_fmtPct(pctLnCongTy)})',
            _fmtVND(lnCongTyChot), ChuDe.mauChuTheo(toi)),
        _ChotRow('% Hoa hồng (${_fmtPct(commissionPct)})',
            _fmtVND(tongHoaHongChot), ChuDe.mauChuTheo(toi)),
      ]),
    );
  }
}

class _ChotRow extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final bool bold;
  const _ChotRow(this.label, this.value, this.color, {this.bold = false});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Expanded(child: Text(label, style: TextStyle(
          fontSize: 12, color: color, fontWeight: bold ? FontWeight.w700 : FontWeight.normal,
        ))),
        Text(value, style: TextStyle(
          fontSize: 12, color: color, fontWeight: FontWeight.w600,
        )),
      ]),
    );
  }
}

// ─── Stat Grid 4 cards ────────────────────────────────────────────────────────
class _StatGrid4 extends StatelessWidget {
  final KetQuaTinhGia kq;
  final KhoChinhLuuTru kho;
  final bool toi;
  final bool coChot;
  final double doanhThuChot;
  final double lnCongTyChot;
  final double pctLnCongTy;
  final double tongHoaHongChot;
  final double newCommissionPerUnit;
  final String unitLabel;
  const _StatGrid4({required this.kq, required this.kho, required this.toi,
      required this.coChot, required this.doanhThuChot, required this.lnCongTyChot,
      required this.pctLnCongTy, required this.tongHoaHongChot,
      required this.newCommissionPerUnit, required this.unitLabel});

  @override
  Widget build(BuildContext context) {
    final lnGiaTri = coChot ? lnCongTyChot : kq.tongCPSX * kq.tyLeLN;
    final dtHienThi = coChot ? doanhThuChot : kq.doanhThu;
    final giaBan = coChot ? kho.giaChotHienTai : kq.giaBanCuoi;
    final hoaHong = coChot ? tongHoaHongChot : kq.hoaHongTrenDv * kq.dauVao.soLuong;
    final lnPct = coChot ? pctLnCongTy : kq.tyLeLN;

    return LayoutBuilder(builder: (ctx, constraints) {
      final cols = constraints.maxWidth > 500 ? 4 : 2;
      final commPct = kq.giaTrenDonVi > 0
          ? (coChot ? newCommissionPerUnit / kq.giaTrenDonVi : kq.hoaHongTrenDv / kq.giaTrenDonVi)
          : 0.0;
      final commPerUnit = coChot ? newCommissionPerUnit : kq.hoaHongTrenDv;
      return GridView.count(
        crossAxisCount: cols,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 2.0,
        children: [
          TheThongKe(
            nhan: 'Lợi Nhuận',
            giaTri: _fmtVND(lnGiaTri),
            ghiChu: _fmtPct(lnPct),
            mauGiaTri: ChuDe.mauXanhTheo(toi),
          ),
          TheThongKe(
            nhan: 'Doanh Thu',
            giaTri: _fmtVND(dtHienThi),
            mauGiaTri: ChuDe.mauTruc2(toi),
          ),
          TheThongKe(
            nhan: coChot ? 'Giá Chốt/$unitLabel' : 'Giá Bán/$unitLabel',
            giaTri: '${_fmt(giaBan)} đ',
            mauGiaTri: ChuDe.mauCamTheo(toi),
          ),
          TheThongKe(
            nhan: 'Hoa Hồng',
            giaTri: _fmtVND(hoaHong),
            ghiChu: '${_fmt(commPerUnit, dec: 1)} đ/$unitLabel (${_fmtPct(commPct)})',
            mauGiaTri: ChuDe.mauHongTheo(toi),
          ),
        ],
      );
    });
  }
}

// ─── Chi tiết giá ─────────────────────────────────────────────────────────────
class _ChiTietGia extends StatelessWidget {
  final KetQuaTinhGia kq;
  final KhoChinhLuuTru kho;
  final bool toi;
  final bool coChot;
  final double chotGia;
  final double diff;
  final String unitLabel;
  const _ChiTietGia({required this.kq, required this.kho, required this.toi,
      required this.coChot, required this.chotGia, required this.diff, required this.unitLabel});

  @override
  Widget build(BuildContext context) {
    final items = <(String, String)>[
      ('Giá ban đầu (Vốn + ${_fmtPct(kq.tyLeLN)} LN)', '${_fmt(kq.giaTrenDonVi, dec: 1)} đ'),
      if (kq.giaTrenDvZipper > 0) ('Chi phí Zipper', '${_fmt(kq.giaTrenDvZipper, dec: 1)} đ'),
      if (kq.giaTrenDvBangKeo > 0) ('Chi phí Băng keo', '${_fmt(kq.giaTrenDvBangKeo, dec: 1)} đ'),
      if (kq.giaTrenDvQuai > 0) ('Chi phí Quai', '${_fmt(kq.giaTrenDvQuai, dec: 1)} đ'),
      (kq.dauVao.loaiSanPham == 'mang' ? 'Chi phí Đóng gói' : 'Chi phí Thùng giấy',
          '${_fmt(kq.giaTrenDvDongGoi, dec: 1)} đ'),
      ('Chi phí Vận chuyển', '${_fmt(kq.giaTrenDvVanChuyen, dec: 1)} đ'),
      ('Lãi vay vốn (${_fmtPct(kq.dauVao.laiSuatThang)})', '${_fmt(kq.laiVayTrenDv, dec: 1)} đ'),
      ('Hoa hồng kinh doanh', '${_fmt(kq.hoaHongTrenDv, dec: 1)} đ'),
    ];

    return Column(children: [
      ...items.map((item) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: [
          Expanded(child: Text(item.$1, style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)))),
          Text(item.$2, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ChuDe.mauChuTheo(toi))),
        ]),
      )),
      const Divider(height: 16),
      _BLTotal('GIÁ BÁN ĐỀ XUẤT / ${unitLabel.toUpperCase()}',
          '${_fmt(kq.giaBanCuoi)} đ', ChuDe.mauCamTheo(toi)),
      if (coChot) ...[
        const Divider(height: 12, color: Colors.transparent),
        _BLTotal('GIÁ BÁN CHỐT / ${unitLabel.toUpperCase()}',
            '${_fmt(chotGia)} đ${diff >= 0 ? ' (+${_fmt(diff)})' : ' (${_fmt(diff)})'}',
            ChuDe.mauXanhTheo(toi)),
      ],
    ]);
  }
}

class _BLTotal extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _BLTotal(this.label, this.value, this.color);
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color))),
      Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color)),
    ]);
  }
}

// ─── Bảng đặc tả kỹ thuật & nguyên liệu (10 cột) ────────────────────────────
class _BangDacTa extends StatelessWidget {
  final KetQuaTinhGia kq;
  final KhoChinhLuuTru kho;
  final bool toi;
  final int ni;
  final bool isMang;
  const _BangDacTa({required this.kq, required this.kho, required this.toi,
      required this.ni, required this.isMang});

  @override
  Widget build(BuildContext context) {
    final dv = kq.dauVao;
    final vl1 = kho.dsVatLieu.where((v) => v.maVL == dv.maLop1).firstOrNull;

    final List<_DacTaRow> rows = [];

    // IN
    final dWidthIn = dv.khoTrai * ni + 0.02;
    final dMetersIn = kq.metIn / ni;
    final dWasteIn = kq.phiHaoIn / ni;
    rows.add(_DacTaRow(
      cong: 'CPSX IN',
      vatLieu: vl1?.tenVL ?? '—',
      kho: dWidthIn,
      metTP: dMetersIn,
      phiHao: dWasteIn,
      cpsx: kq.cpsxIn,
      costCPSX: kq.chiPhiGCIn,
      matPrice: vl1?.giaTrenM2,
      costMat: kq.chiPhiNVLIn,
    ));

    // GHÉP
    for (final lop in kq.cacLopGhep) {
      final dM = lop.metThanhPham / ni;
      final dW = lop.phiHao / ni;
      rows.add(_DacTaRow(
        cong: 'GHÉP (Lớp ${lop.soLop})',
        vatLieu: lop.vatLieu.tenVL,
        kho: dWidthIn,
        metTP: dM,
        phiHao: dW,
        cpsx: lop.cpsx,
        costCPSX: lop.chiPhiCPSX,
        matPrice: lop.vatLieu.giaTrenM2,
        costMat: lop.chiPhiNVL,
      ));
    }

    // CẮT
    if (!isMang) {
      rows.add(_DacTaRow(
        cong: 'CẮT',
        vatLieu: '—',
        kho: kq.khoCat,
        metTP: kq.metCat / ni,
        phiHao: kq.phiHaoCat / ni,
        cpsx: kq.cpsxCat,
        costCPSX: kq.chiPhiCat,
        matPrice: null,
        costMat: null,
      ));
    }

    double totalCPSX = rows.fold(0, (s, r) => s + r.costCPSX);
    double totalCPVL = rows.fold(0, (s, r) => s + (r.costMat ?? 0));

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowHeight: 30,
        dataRowMinHeight: 28,
        dataRowMaxHeight: 36,
        columnSpacing: 10,
        headingTextStyle: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: ChuDe.mauNhatTheo(toi)),
        dataTextStyle: TextStyle(fontSize: 10, color: ChuDe.mauChuTheo(toi)),
        columns: const [
          DataColumn(label: Text('Công đoạn')),
          DataColumn(label: Text('Vật liệu')),
          DataColumn(label: Text('Khổ (m)'), numeric: true),
          DataColumn(label: Text('TP (m)'), numeric: true),
          DataColumn(label: Text('Phi hao'), numeric: true),
          DataColumn(label: Text('ĐV VL'), numeric: true),
          DataColumn(label: Text('CPSX đ/m²'), numeric: true),
          DataColumn(label: Text('T.tiền CPSX'), numeric: true),
          DataColumn(label: Text('CP VL đ/m²'), numeric: true),
          DataColumn(label: Text('T.tiền CPVL'), numeric: true),
        ],
        rows: [
          ...rows.map((r) {
            final inputVL = r.metTP + r.phiHao;
            return DataRow(cells: [
              DataCell(Text(r.cong, style: const TextStyle(fontWeight: FontWeight.w600))),
              DataCell(Text(r.vatLieu)),
              DataCell(Text(r.kho.toStringAsFixed(3))),
              DataCell(Text(_fmt(r.metTP))),
              DataCell(Text(_fmt(r.phiHao))),
              DataCell(Text(
                _fmt(inputVL),
                style: TextStyle(fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi)),
              )),
              DataCell(Text(_fmt(r.cpsx))),
              DataCell(Text(_fmt(r.costCPSX))),
              DataCell(Text(r.matPrice != null ? r.matPrice!.toStringAsFixed(1) : '—')),
              DataCell(Text(r.costMat != null ? _fmt(r.costMat) : '—')),
            ]);
          }),
          // TỔNG row
          DataRow(
            color: WidgetStatePropertyAll(ChuDe.mauVienTheo(toi).withAlpha(60)),
            cells: [
              const DataCell(Text('TỔNG', style: TextStyle(fontWeight: FontWeight.w700))),
              const DataCell(Text('')), const DataCell(Text('')), const DataCell(Text('')),
              const DataCell(Text('')), const DataCell(Text('')), const DataCell(Text('')),
              DataCell(Text(_fmt(totalCPSX), style: const TextStyle(fontWeight: FontWeight.w700))),
              const DataCell(Text('')),
              DataCell(Text(_fmt(totalCPVL), style: const TextStyle(fontWeight: FontWeight.w700))),
            ],
          ),
          // TỔNG GIÁ VỐN row
          DataRow(
            color: WidgetStatePropertyAll(ChuDe.mauTruc(toi).withAlpha(25)),
            cells: [
              DataCell(Text('TỔNG GIÁ VỐN SX', style: TextStyle(
                fontWeight: FontWeight.w800, fontSize: 11, color: ChuDe.mauTruc(toi)))),
              DataCell(Text('${_fmt(totalCPSX + totalCPVL)} đ', style: TextStyle(
                fontWeight: FontWeight.w800, fontSize: 11, color: ChuDe.mauTruc(toi)))),
              const DataCell(Text('')), const DataCell(Text('')), const DataCell(Text('')),
              const DataCell(Text('')), const DataCell(Text('')), const DataCell(Text('')),
              const DataCell(Text('')), const DataCell(Text('')),
            ],
          ),
        ],
      ),
    );
  }
}

class _DacTaRow {
  final String cong, vatLieu;
  final double kho, metTP, phiHao, cpsx, costCPSX;
  final double? matPrice, costMat;
  const _DacTaRow({required this.cong, required this.vatLieu, required this.kho,
      required this.metTP, required this.phiHao, required this.cpsx,
      required this.costCPSX, this.matPrice, this.costMat});
}

// ─── Bảng MOQ ─────────────────────────────────────────────────────────────────
class _BangMOQ extends StatelessWidget {
  final KetQuaTinhGia kq;
  final KhoChinhLuuTru kho;
  final bool toi;
  final String unitLabel;
  const _BangMOQ({required this.kq, required this.kho, required this.toi, required this.unitLabel});

  @override
  Widget build(BuildContext context) {
    final dv = kq.dauVao;
    final moqLevels = <double>[5000, 10000, 15000, 20000, 30000, 40000, 50000, 70000, 100000, 150000, 200000];
    if (!moqLevels.contains(dv.soLuong) && dv.soLuong > 0) {
      moqLevels.add(dv.soLuong);
      moqLevels.sort();
    }

    // Xác định các cột vật liệu (IN + các lớp GHÉP)
    final matCols = <_MatCol>[];
    final vl1 = kho.dsVatLieu.where((v) => v.maVL == dv.maLop1).firstOrNull;
    if (vl1 != null) matCols.add(_MatCol(tenNgan: vl1.tenVL.split(' ').first, lop: 0));
    for (final lop in kq.cacLopGhep) {
      matCols.add(_MatCol(tenNgan: lop.vatLieu.tenVL.split(' ').first, lop: lop.soLop));
    }

    return Column(children: [
      // Info box
      _InfoBoxNho('💡 So sánh giá khi thay đổi số lượng đặt hàng. Dòng tô sáng là số lượng hiện tại.', toi),
      const SizedBox(height: 8),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowHeight: 30,
          dataRowMinHeight: 28,
          dataRowMaxHeight: 36,
          columnSpacing: 12,
          headingTextStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: ChuDe.mauNhatTheo(toi)),
          dataTextStyle: TextStyle(fontSize: 11, color: ChuDe.mauChuTheo(toi)),
          columns: [
            const DataColumn(label: Text('Số lượng')),
            const DataColumn(label: Text('LN %'), numeric: true),
            DataColumn(label: Text('Giá vốn+LN/$unitLabel'), numeric: true),
            const DataColumn(label: Text('Giá đề xuất'), numeric: true),
            const DataColumn(label: Text('Tổng DT'), numeric: true),
            ...matCols.map((c) => DataColumn(label: Text(c.tenNgan), numeric: true)),
          ],
          rows: moqLevels.map((qty) {
            final dvMoq = dv.copyWith(soLuong: qty);
            final kqMoq = MayTinhGia.tinh(dvMoq, kho.dsVatLieu, kho.bangLN);
            if (kqMoq == null) return DataRow(cells: List.generate(5 + matCols.length, (_) => const DataCell(Text('—'))));
            final isCurrent = qty == dv.soLuong;

            return DataRow(
              color: isCurrent ? WidgetStatePropertyAll(ChuDe.mauTruc(toi).withAlpha(30)) : null,
              cells: [
                DataCell(Text(dinhDangSo(qty), style: TextStyle(fontWeight: isCurrent ? FontWeight.w700 : FontWeight.normal))),
                DataCell(Text(_fmtPct(kqMoq.tyLeLN))),
                DataCell(Text(_fmt(kqMoq.giaTrenDonVi, dec: 1))),
                DataCell(Text(
                  _fmt(kqMoq.giaBanCuoi),
                  style: TextStyle(fontWeight: FontWeight.w700,
                      color: isCurrent ? ChuDe.mauTruc(toi) : ChuDe.mauChuTheo(toi)),
                )),
                DataCell(Text(_fmtTr(kqMoq.giaBanCuoi * qty))),
                ...matCols.map((c) {
                  double meters = 0, kg = 0;
                  if (c.lop == 0) {
                    final ni2 = dvMoq.soConHinh < 1 ? 1 : dvMoq.soConHinh;
                    meters = (kqMoq.metIn + kqMoq.phiHaoIn) / ni2;
                    final vl = kho.dsVatLieu.where((v) => v.maVL == dv.maLop1).firstOrNull;
                    if (vl != null) kg = meters * kqMoq.khoIn * vl.doDay * vl.khoiLuongRieng / 1000;
                  } else {
                    final lop = kqMoq.cacLopGhep.where((l) => l.soLop == c.lop).firstOrNull;
                    if (lop != null) {
                      final ni2 = dvMoq.soConHinh < 1 ? 1 : dvMoq.soConHinh;
                      meters = (lop.metThanhPham + lop.phiHao) / ni2;
                      kg = meters * lop.kho * lop.vatLieu.doDay * lop.vatLieu.khoiLuongRieng / 1000;
                    }
                  }
                  return DataCell(Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(_fmt(meters) + ' m'),
                      Text('(${kg.toStringAsFixed(1)} kg)',
                          style: TextStyle(fontSize: 9, color: ChuDe.mauNhatTheo(toi))),
                    ],
                  ));
                }),
              ],
            );
          }).toList(),
        ),
      ),
    ]);
  }
}

class _MatCol { final String tenNgan; final int lop; const _MatCol({required this.tenNgan, required this.lop}); }

// ─── Bảng MOQ cuộn màng ───────────────────────────────────────────────────────
class _BangMOQCuon extends StatefulWidget {
  final KetQuaTinhGia kq;
  final KhoChinhLuuTru kho;
  final bool toi;
  final String unitLabel;
  const _BangMOQCuon({required this.kq, required this.kho, required this.toi, required this.unitLabel});
  @override
  State<_BangMOQCuon> createState() => _BangMOQCuonState();
}
class _BangMOQCuonState extends State<_BangMOQCuon> {
  int _selectedLop = 0; // 0 = IN, soLop cho GHÉP

  @override
  Widget build(BuildContext context) {
    final kq = widget.kq;
    final kho = widget.kho;
    final toi = widget.toi;
    final dv = kq.dauVao;
    final ni = dv.soConHinh < 1 ? 1 : dv.soConHinh;

    // Xây danh sách lớp có thể chọn
    final lopCols = <_LopCol>[];
    final vl1 = kho.dsVatLieu.where((v) => v.maVL == dv.maLop1).firstOrNull;
    if (vl1 != null) lopCols.add(_LopCol(soLop: 0, tenVL: vl1.tenVL, vl: vl1));
    for (final lop in kq.cacLopGhep) {
      lopCols.add(_LopCol(soLop: lop.soLop, tenVL: lop.vatLieu.tenVL, vl: lop.vatLieu));
    }

    if (lopCols.isEmpty) {
      return Center(child: Text('Không có lớp màng phù hợp',
          style: TextStyle(color: ChuDe.mauNhatTheo(toi))));
    }

    final selCol = lopCols.firstWhere((c) => c.soLop == _selectedLop, orElse: () => lopCols.first);
    final selVL = selCol.vl;

    // LLDPE/PE → tính theo KG; còn lại theo cuộn
    final isKgBase = selVL.tenVL.toUpperCase().contains('LLDPE') ||
        selVL.tenVL.toUpperCase() == 'PE';
    final rollLen = selVL.rollLength;
    final rollLevels = isKgBase ? [200.0, 300, 400, 500, 600, 700] : [1.0, 2, 3, 4, 5, 6];

    // Tổng m NL của lớp đang chọn
    double totalSelectedMeters = 0;
    if (selCol.soLop == 0) {
      totalSelectedMeters = (kq.metIn + kq.phiHaoIn) / ni;
    } else {
      final lop = kq.cacLopGhep.where((l) => l.soLop == selCol.soLop).firstOrNull;
      if (lop != null) totalSelectedMeters = (lop.metThanhPham + lop.phiHao) / ni;
    }

    double getMetersFromKg(double targetKg, double width) {
      if (width <= 0) return 0;
      return targetKg * 1000 / (width * selVL.doDay * selVL.khoiLuongRieng);
    }

    double getWidth() {
      if (selCol.soLop == 0) return kq.khoIn;
      final lop = kq.cacLopGhep.where((l) => l.soLop == selCol.soLop).firstOrNull;
      return lop?.kho ?? kq.khoIn;
    }

    int findEstQty(double targetMeters) {
      int low = 100, high = 1000000, best = 0;
      while (low <= high) {
        final mid = ((low + high) / 2).floor();
        final dvMid = dv.copyWith(soLuong: mid.toDouble());
        final kqMid = MayTinhGia.tinh(dvMid, kho.dsVatLieu, kho.bangLN);
        if (kqMid == null) { low = mid + 1; continue; }
        double meters = 0;
        if (selCol.soLop == 0) {
          meters = (kqMid.metIn + kqMid.phiHaoIn) / ni;
        } else {
          final lop = kqMid.cacLopGhep.where((l) => l.soLop == selCol.soLop).firstOrNull;
          if (lop != null) meters = (lop.metThanhPham + lop.phiHao) / ni;
        }
        if (meters <= targetMeters) { best = mid; low = mid + 1; }
        else { high = mid - 1; }
      }
      return (best / 100).floor() * 100;
    }

    final width = getWidth();
    final otherLops = lopCols.where((c) => c.soLop != selCol.soLop).toList();

    return Column(children: [
      _InfoBoxNho('💡 Số lượng tối ưu theo cuộn màng tiêu chuẩn. Giúp đặt hàng khớp cuộn, giảm hao hụt.', toi),
      const SizedBox(height: 8),
      // Dropdown chọn lớp
      Row(children: [
        Text('Lớp: ', style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi))),
        DropdownButton<int>(
          value: _selectedLop,
          items: lopCols.map((c) {
            final isKg = c.vl.tenVL.toUpperCase().contains('LLDPE') || c.vl.tenVL.toUpperCase() == 'PE';
            return DropdownMenuItem(value: c.soLop, child: Text(
              '${c.tenVL} ${isKg ? '(KG)' : '(CUỘN)'}',
              style: TextStyle(fontSize: 12, color: ChuDe.mauTruc(toi), fontWeight: FontWeight.w700),
            ));
          }).toList(),
          onChanged: (v) => setState(() => _selectedLop = v ?? 0),
          style: TextStyle(fontSize: 12, color: ChuDe.mauChuTheo(toi)),
          dropdownColor: ChuDe.mauMatTheo(toi),
          underline: Container(height: 1.5, color: ChuDe.mauTruc(toi)),
        ),
      ]),
      const SizedBox(height: 8),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowHeight: 30,
          dataRowMinHeight: 28,
          dataRowMaxHeight: 48,
          columnSpacing: 12,
          headingTextStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: ChuDe.mauNhatTheo(toi)),
          dataTextStyle: TextStyle(fontSize: 11, color: ChuDe.mauChuTheo(toi)),
          columns: [
            DataColumn(label: Text(isKgBase ? 'Khối lượng (kg)' : 'Chỉ số cuộn')),
            DataColumn(label: Text('SL ${widget.unitLabel}'), numeric: true),
            ...otherLops.map((c) => DataColumn(label: Text(c.vl.tenVL.split(' ').first), numeric: true)),
            const DataColumn(label: Text('Giá đề xuất'), numeric: true),
            const DataColumn(label: Text('Tổng DT'), numeric: true),
          ],
          rows: rollLevels.map((levelVal) {
            final double availMeters = isKgBase
                ? getMetersFromKg(levelVal.toDouble(), width)
                : levelVal.toDouble() * rollLen;
            final estQty = findEstQty(availMeters);
            if (estQty <= 0) return null;
            final dvEst = dv.copyWith(soLuong: estQty.toDouble());
            final kqEst = MayTinhGia.tinh(dvEst, kho.dsVatLieu, kho.bangLN);
            if (kqEst == null) return null;

            bool isCurrent;
            if (isKgBase) {
              final curKg = totalSelectedMeters * width * selVL.doDay * selVL.khoiLuongRieng / 1000;
              isCurrent = ((curKg / 100).ceil() * 100) == levelVal;
            } else {
              isCurrent = levelVal == (totalSelectedMeters / rollLen).ceil();
            }

            final selKg = availMeters * width * selVL.doDay * selVL.khoiLuongRieng / 1000;

            return DataRow(
              color: isCurrent ? WidgetStatePropertyAll(ChuDe.mauTruc(toi).withAlpha(30)) : null,
              cells: [
                DataCell(Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isKgBase ? '${_fmt(levelVal.toDouble())} kg' : '${levelVal.toStringAsFixed(0)} cuộn',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      isKgBase ? '(${_fmt(availMeters)} m)' : '(${_fmt(availMeters)} m — ${selKg.toStringAsFixed(1)} kg)',
                      style: TextStyle(fontSize: 9, color: ChuDe.mauNhatTheo(toi)),
                    ),
                  ],
                )),
                DataCell(Text(_fmt(estQty.toDouble()),
                    style: TextStyle(fontWeight: isCurrent ? FontWeight.w700 : FontWeight.normal))),
                ...otherLops.map((c) {
                  double m = 0, kg = 0;
                  if (c.soLop == 0) {
                    m = (kqEst.metIn + kqEst.phiHaoIn) / ni;
                    kg = m * kqEst.khoIn * c.vl.doDay * c.vl.khoiLuongRieng / 1000;
                  } else {
                    final lop = kqEst.cacLopGhep.where((l) => l.soLop == c.soLop).firstOrNull;
                    if (lop != null) { m = (lop.metThanhPham + lop.phiHao) / ni; kg = m * lop.kho * c.vl.doDay * c.vl.khoiLuongRieng / 1000; }
                  }
                  return DataCell(Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${_fmt(m)} m'),
                      Text('(${kg.toStringAsFixed(1)} kg)', style: TextStyle(fontSize: 9, color: ChuDe.mauNhatTheo(toi))),
                    ],
                  ));
                }),
                DataCell(Text(_fmt(kqEst.giaBanCuoi),
                    style: TextStyle(fontWeight: FontWeight.w700,
                        color: isCurrent ? ChuDe.mauTruc(toi) : ChuDe.mauChuTheo(toi)))),
                DataCell(Text(_fmtTr(kqEst.giaBanCuoi * estQty))),
              ],
            );
          }).whereType<DataRow>().toList(),
        ),
      ),
    ]);
  }
}

class _LopCol { final int soLop; final String tenVL; final VatLieu vl; const _LopCol({required this.soLop, required this.tenVL, required this.vl}); }

// ─── Trọng lượng & Vận chuyển ────────────────────────────────────────────────
class _TrongLuong extends StatelessWidget {
  final KetQuaTinhGia kq;
  final bool isMang;
  final bool toi;
  const _TrongLuong({required this.kq, required this.isMang, required this.toi});

  @override
  Widget build(BuildContext context) {
    final dv = kq.dauVao;
    final tongKg = kq.trongLuong * dv.soLuong / 1000;
    final items = <(String, String)>[
      (isMang ? 'Diện tích băng (m²/m dài)' : 'Diện tích 1 túi', _fmtM2(kq.dienTich1Tui)),
      ('Tổng diện tích đơn hàng', '${_fmt(kq.tongDienTich, dec: 1)} m²'),
      if (!isMang) ...[
        ('Trọng lượng / túi (Tare)', '${kq.trongLuong.toStringAsFixed(2)} gr'),
        ('Tổng trọng lượng', '${dinhDangSo(tongKg, chiSoThapPhan: 1)} kg'),
        ('Trọng lượng (tấn)', '${(tongKg / 1000).toStringAsFixed(3)} tấn'),
      ] else ...[
        ('Chiều dài cuộn TP', '${dinhDangSo(kq.chieuDaiCuon)} m/cuộn'),
      ],
    ];
    return Column(children: items.map((i) => HangPhanTich(nhan: i.$1, giaTri: i.$2)).toList());
  }
}

// ─── Info box nhỏ ─────────────────────────────────────────────────────────────
class _InfoBoxNho extends StatelessWidget {
  final String text;
  final bool toi;
  const _InfoBoxNho(this.text, this.toi);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: ChuDe.mauTruc2(toi).withAlpha(15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: ChuDe.mauTruc2(toi).withAlpha(40)),
      ),
      child: Text(text, style: TextStyle(fontSize: 11, color: ChuDe.mauTruc2(toi))),
    );
  }
}
