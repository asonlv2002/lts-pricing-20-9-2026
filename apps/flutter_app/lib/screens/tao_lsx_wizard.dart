// ═══════════════════════════════════════════════════════════════════════════
// TaoLsxWizard — wizard 3 bước tạo lệnh sản xuất (mirror web mobile
// MOBILE_HUBS.pricing_quote → "Tạo lệnh sản xuất" key = 'tao-lsx' trong
// wizard/TaoLsxWizard.tsx).
//
// Flow:
//   Bước 1: Chọn khách hàng (search + select)
//   Bước 2: Chọn báo giá → chọn pricing sheet (chỉ lấy sheet đã KH-duyệt
//            hasCustomerApproved=true trong BG đã approved)
//   Bước 3: Nhập thông tin LSX (ghi chú, ngày giao, thanh toán) → gọi
//            POST /quotations/:id/create-orders, sau đó PATCH /orders/:id
//            với inputValue (gồm thông tin nhập + snapshot inputValue gốc
//            của sheet).
//
// Số LSX gen client-side dạng YYMM.STT (mirror lib/lsx-build-order.ts:
//   currentLSX = list hiện có +1; format YYMM.STT 3 chữ số).
//
// Sau khi tạo xong: toast + Navigator.pop. LSXScreen tự reload qua
// `taiProductionOrdersTuServer` (đã gọi trong `_tao`).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';

class TaoLsxWizard extends StatefulWidget {
  /// Optional: pre-fill khi bấm "Tạo LSX" từ 1 báo giá cụ thể (DanhSachBG).
  final String? prefillQuotationId;
  final String? prefillSheetId;
  final void Function(QuotationPricingSheetOrderApi order)? onSuccess;

  const TaoLsxWizard({
    super.key,
    this.prefillQuotationId,
    this.prefillSheetId,
    this.onSuccess,
  });

  @override
  State<TaoLsxWizard> createState() => _TaoLsxWizardState();
}

class _TaoLsxWizardState extends State<TaoLsxWizard> {
  int _step = 0;
  KhachHang? _kh;
  BaoGiaApi? _bg;
  PricingSheetApi? _sheet;

  final TextEditingController _ghiChuCtrl = TextEditingController();
  final TextEditingController _ngayGiaoCtrl = TextEditingController();
  final TextEditingController _thanhToanCtrl = TextEditingController();

  List<KhachHang> _dsKh = const [];
  List<BaoGiaApi> _dsBg = const [];
  String _queryKh = '';
  String _queryBg = '';
  bool _dangTaiKh = false;
  bool _dangTaiBg = false;
  bool _dangTao = false;
  String? _loiKh;
  String? _loiBg;

  @override
  void initState() {
    super.initState();
    if (widget.prefillQuotationId != null) {
      // Skip bước 1 + 2, jump thẳng bước 3
      _step = 2;
      _taiBgTheoId(widget.prefillQuotationId!);
    } else {
      _taiKh();
    }
  }

  @override
  void dispose() {
    _ghiChuCtrl.dispose();
    _ngayGiaoCtrl.dispose();
    _thanhToanCtrl.dispose();
    super.dispose();
  }

  Future<void> _taiKh() async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() {
      _dangTaiKh = true;
      _loiKh = null;
    });
    try {
      final ds = await layKhachHangService(token);
      if (mounted) setState(() => _dsKh = ds);
    } catch (err) {
      if (mounted) {
        setState(() => _loiKh = err is LoiServiceLts
            ? err.message
            : 'Không tải được danh sách khách hàng.');
      }
    } finally {
      if (mounted) setState(() => _dangTaiKh = false);
    }
  }

  Future<void> _taiBg(String customerCodeName) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() {
      _dangTaiBg = true;
      _loiBg = null;
    });
    try {
      final all = await layDanhSachBaoGiaService(token);
      // Filter: cùng KH + đã duyệt
      final filtered = all
          .where((bg) =>
              bg.trangThai == TrangThaiBaoGiaServer.approved &&
              _khachHangCuaBg(bg) == customerCodeName)
          .toList();
      if (mounted) setState(() => _dsBg = filtered);
    } catch (err) {
      if (mounted) {
        setState(() => _loiBg = err is LoiServiceLts
            ? err.message
            : 'Không tải được danh sách báo giá.');
      }
    } finally {
      if (mounted) setState(() => _dangTaiBg = false);
    }
  }

  Future<void> _taiBgTheoId(String id) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() {
      _dangTaiBg = true;
      _loiBg = null;
    });
    try {
      final bg = await layBaoGiaTheoIdService(token, id);
      final firstSheet = widget.prefillSheetId != null
          ? bg.pricingSheets
              .where((s) => s.id == widget.prefillSheetId)
              .firstOrNull
          : null;
      if (!mounted) return;
      setState(() {
        _bg = bg;
        _sheet = firstSheet;
      });
    } catch (err) {
      if (mounted) {
        setState(() => _loiBg = err is LoiServiceLts
            ? err.message
            : 'Không tải được báo giá.');
      }
    } finally {
      if (mounted) setState(() => _dangTaiBg = false);
    }
  }

  String _khachHangCuaBg(BaoGiaApi bg) {
    // Tạm thời: trả về codeName của sheet đầu (server đã có sẵn).
    // TODO: map "Tên KH trong input" → codeName chính xác (cần cache KH).
    final firstSheet = bg.pricingSheets.isNotEmpty ? bg.pricingSheets.first : null;
    return firstSheet?.customerCodeName ?? '';
  }

  List<KhachHang> get _hienThiKh {
    final q = _queryKh.trim().toLowerCase();
    if (q.isEmpty) return _dsKh;
    return _dsKh.where((kh) {
      final v = kh.moiNhat;
      return kh.codeName.toLowerCase().contains(q) ||
          (v?.organizationName.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  List<BaoGiaApi> get _hienThiBg {
    final q = _queryBg.trim().toLowerCase();
    if (q.isEmpty) return _dsBg;
    return _dsBg.where((bg) {
      final name = (bg.quotationName ?? bg.description ?? '').toLowerCase();
      return name.contains(q);
    }).toList();
  }

  List<({PricingSheetApi sheet, bool hasCustomerApproved})>
      get _sheetsKhaDung {
    final bg = _bg;
    if (bg == null) return const [];
    return bg.pricingSheets
        .where((s) => s.quotationId != null) // đã gắn BG
        .map((s) {
      // Tìm hasCustomerApproved từ links
      bool approved = false;
      for (final l in bg.pricingSheetLinks) {
        if (l.sheet.id == s.id) {
          approved = l.hasCustomerApproved ?? false;
          break;
        }
      }
      return (sheet: s, hasCustomerApproved: approved);
    }).where((r) => r.hasCustomerApproved).toList();
  }

  void _chonKh(KhachHang kh) {
    setState(() {
      _kh = kh;
      _bg = null;
      _sheet = null;
      _step = 1;
    });
    _taiBg(kh.codeName);
  }

  void _chonBg(BaoGiaApi bg) {
    setState(() {
      _bg = bg;
      _sheet = null;
      _step = 2;
    });
  }

  void _chonSheet(PricingSheetApi sh) {
    setState(() => _sheet = sh);
  }

  bool get _coTheTiepTuc {
    switch (_step) {
      case 0:
        return _kh != null;
      case 1:
        return _bg != null;
      case 2:
        return _sheet != null;
      default:
        return false;
    }
  }

  Future<void> _tao() async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    final bg = _bg;
    final sheet = _sheet;
    if (bg == null || sheet == null) return;
    setState(() => _dangTao = true);
    try {
      // Bước A: tạo orders từ sheet đã duyệt
      final res = await createQuotationPricingSheetOrdersService(
        token,
        bg.id,
      );
      // Tìm order tương ứng với sheet đã chọn
      final matched = res.orders
          .where((o) => o.pricingSheetId == sheet.id)
          .firstOrNull;
      if (matched == null) {
        if (!mounted) return;
        LtsToast.show(context,
            'Không tìm thấy order vừa tạo cho sheet này (server có thể đã có sẵn)',
            type: LtsToastType.warning);
        await s.taiProductionOrdersTuServer();
        if (!mounted) return;
        Navigator.pop(context);
        return;
      }
      // Bước B: PATCH inputValue với thông tin LSX + snapshot input cũ
      final inputValue = <String, dynamic>{
        ...sheet.inputValue,
        'lsxNote': _ghiChuCtrl.text.trim(),
        if (_ngayGiaoCtrl.text.trim().isNotEmpty)
          'deliveryDate': _ngayGiaoCtrl.text.trim(),
        if (_thanhToanCtrl.text.trim().isNotEmpty)
          'paymentTerms': _thanhToanCtrl.text.trim(),
        'snapshot': {
          'customer': _kh?.moiNhat?.organizationName ?? _kh?.codeName,
          'productName': (sheet.inputValue['productName'] as String?) ??
              sheet.pricingSheetName,
          'pricingSheetId': sheet.id,
          'quotationId': bg.id,
        },
      };
      final updated = await updateQuotationPricingSheetOrderService(
        token,
        matched.id,
        inputValue: inputValue,
      );
      if (!mounted) return;
      LtsToast.show(context, 'Đã tạo LSX', type: LtsToastType.success);
      await s.taiProductionOrdersTuServer();
      if (!mounted) return;
      widget.onSuccess?.call(updated);
      Navigator.pop(context, updated);
    } on LoiServiceLts catch (e) {
      if (!mounted) return;
      LtsToast.show(context, e.message, type: LtsToastType.error);
    } finally {
      if (mounted) setState(() => _dangTao = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tạo lệnh sản xuất'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          _Stepper(step: _step, onTap: (i) {
            if (i < _step) {
              if (i == 0) {
                // Quay lại step 0 cần reset
                setState(() {
                  _step = 0;
                  _kh = null;
                  _bg = null;
                  _sheet = null;
                });
              } else {
                setState(() => _step = i);
              }
            }
          }),
          const Divider(height: 1),
          Expanded(
            child: IndexedStack(
              index: _step,
              children: [
                _buoc1(p),
                _buoc2(p),
                _buoc3(p),
              ],
            ),
          ),
          _BottomBar(
            coTheTiepTuc: _coTheTiepTuc,
            isLast: _step == 2,
            dangXuLy: _dangTao,
            onQuayLai: _step == 0 ? null : () => setState(() => _step--),
            onTiep: _step == 2 ? _tao : () => setState(() => _step++),
            label: _step == 2 ? 'Tạo LSX' : 'Tiếp tục',
          ),
        ],
      ),
    );
  }

  Widget _buoc1(LtsPalette p) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: TextField(
            decoration: InputDecoration(
              isDense: true,
              hintText: 'Tìm mã KH, tên tổ chức…',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _queryKh.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () => setState(() => _queryKh = ''),
                    ),
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onChanged: (v) => setState(() => _queryKh = v),
          ),
        ),
        if (_loiKh != null)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(_loiKh!,
                style: const TextStyle(
                    fontSize: 13, color: Color(0xFFB42318))),
          )
        else if (_dangTaiKh)
          const Expanded(child: Center(child: CircularProgressIndicator()))
        else if (_hienThiKh.isEmpty)
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text('Chưa có khách hàng nào',
                    style: TextStyle(fontSize: 13, color: p.muted)),
              ),
            ),
          )
        else
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              itemCount: _hienThiKh.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final kh = _hienThiKh[i];
                final v = kh.moiNhat;
                return LtsCard(
                  onTap: () => _chonKh(kh),
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(kh.codeName,
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF5B4DFF))),
                            const SizedBox(height: 2),
                            Text(v?.organizationName ?? '—',
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: p.text)),
                            if (v != null && v.contactName.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(v.contactName,
                                    style: TextStyle(
                                        fontSize: 12, color: p.muted)),
                              ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, size: 22),
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buoc2(LtsPalette p) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          color: p.shellBg,
          child: Row(
            children: [
              const Icon(Icons.person_outline,
                  size: 16, color: Color(0xFF5B4DFF)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                    'Khách: ${_kh?.moiNhat?.organizationName ?? _kh?.codeName ?? '—'}',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700)),
              ),
              TextButton(
                onPressed: () => setState(() {
                  _step = 0;
                  _kh = null;
                  _bg = null;
                  _sheet = null;
                }),
                child: const Text('Đổi'),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: TextField(
            decoration: InputDecoration(
              isDense: true,
              hintText: 'Tìm tên báo giá…',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _queryBg.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () => setState(() => _queryBg = ''),
                    ),
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onChanged: (v) => setState(() => _queryBg = v),
          ),
        ),
        if (_loiBg != null)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(_loiBg!,
                style: const TextStyle(
                    fontSize: 13, color: Color(0xFFB42318))),
          )
        else if (_dangTaiBg)
          const Expanded(child: Center(child: CircularProgressIndicator()))
        else if (_hienThiBg.isEmpty)
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(
                    'Khách hàng này chưa có báo giá đã duyệt.\nHãy tạo + duyệt báo giá trước.',
                    style: TextStyle(fontSize: 13, color: p.muted),
                    textAlign: TextAlign.center),
              ),
            ),
          )
        else
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 32),
              itemCount: _hienThiBg.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final bg = _hienThiBg[i];
                final sheetsKha =
                    bg.pricingSheets.where((s) => s.quotationId != null).length;
                return LtsCard(
                  onTap: () => _chonBg(bg),
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(bg.quotationName ?? bg.description ?? '—',
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: p.text),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text('$sheetsKha bảng tính',
                                style: TextStyle(
                                    fontSize: 12, color: p.muted)),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, size: 22),
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buoc3(LtsPalette p) {
    final sheets = _sheetsKhaDung;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        LtsCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Khách hàng',
                  style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: p.muted)),
              const SizedBox(height: 4),
              Text(_kh?.moiNhat?.organizationName ?? _kh?.codeName ?? '—',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: p.text)),
              const SizedBox(height: 8),
              Text('Báo giá: ${_bg?.quotationName ?? '—'}',
                  style: TextStyle(fontSize: 12, color: p.muted)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text('Chọn bảng tính đã khách duyệt:',
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w700, color: p.text)),
        const SizedBox(height: 8),
        if (sheets.isEmpty)
          LtsCard(
            padding: const EdgeInsets.all(12),
            child: Text(
                'Báo giá này chưa có sheet nào khách duyệt.\nHãy KH duyệt từng sheet trước khi tạo LSX.',
                style: TextStyle(fontSize: 12.5, color: p.muted),
                textAlign: TextAlign.center),
          )
        else
          ...sheets.map((r) {
            final sh = r.sheet;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: LtsCard(
                onTap: () => _chonSheet(sh),
                padding: const EdgeInsets.all(12),
                child: InkWell(
                  onTap: () => _chonSheet(sh),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Icon(
                          _sheet?.id == sh.id
                              ? Icons.radio_button_checked
                              : Icons.radio_button_unchecked,
                          size: 20,
                          color: _sheet?.id == sh.id
                              ? const Color(0xFF5B4DFF)
                              : p.muted,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(sh.pricingSheetName ?? sh.id,
                                  style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      color: p.text),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                              if (sh.inputValue['productName'] is String)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(
                                      sh.inputValue['productName'] as String,
                                      style: TextStyle(
                                          fontSize: 11.5, color: p.muted),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis),
                                ),
                              const Padding(
                                padding: EdgeInsets.only(top: 2),
                                child: Text('✅ Khách đã duyệt',
                                    style: TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w600,
                                        color: const Color(0xFF15803D))),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        const SizedBox(height: 8),
        TextField(
          controller: _ngayGiaoCtrl,
          decoration: const InputDecoration(
            labelText: 'Ngày giao hàng (tùy chọn)',
            hintText: 'VD: 2026-02-15',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _thanhToanCtrl,
          decoration: const InputDecoration(
            labelText: 'Thanh toán (tùy chọn)',
            hintText: 'VD: 30 ngày',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _ghiChuCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Ghi chú LSX (tùy chọn)',
            hintText: 'Ghi chú thêm cho LSX…',
            border: OutlineInputBorder(),
          ),
        ),
      ],
    );
  }
}

class _Stepper extends StatelessWidget {
  final int step;
  final ValueChanged<int> onTap;
  const _Stepper({required this.step, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    const labels = ['Khách hàng', 'Báo giá', 'Chọn sheet'];
    return Container(
      color: p.surface,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Row(
        children: [
          for (int i = 0; i < labels.length; i++) ...[
            _StepCircle(
              index: i,
              current: step,
              label: labels[i],
              onTap: () => onTap(i),
            ),
            if (i < labels.length - 1)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  color: step > i
                      ? const Color(0xFF5B4DFF)
                      : p.border,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _StepCircle extends StatelessWidget {
  final int index;
  final int current;
  final String label;
  final VoidCallback onTap;
  const _StepCircle({
    required this.index,
    required this.current,
    required this.label,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final done = index < current;
    final active = index == current;
    final color = (done || active) ? const Color(0xFF5B4DFF) : p.muted;
    return InkWell(
      onTap: index < current ? onTap : null,
      borderRadius: BorderRadius.circular(20),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: (done || active) ? color : p.shellBg,
              shape: BoxShape.circle,
            ),
            child: done
                ? const Icon(Icons.check, color: Colors.white, size: 16)
                : Text('${index + 1}',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: (done || active) ? Colors.white : color)),
          ),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: active ? FontWeight.w800 : FontWeight.w500,
                  color: (done || active) ? p.text : p.muted)),
        ],
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  final bool coTheTiepTuc;
  final bool isLast;
  final bool dangXuLy;
  final VoidCallback? onQuayLai;
  final VoidCallback onTiep;
  final String label;
  const _BottomBar({
    required this.coTheTiepTuc,
    required this.isLast,
    required this.dangXuLy,
    required this.onQuayLai,
    required this.onTiep,
    required this.label,
  });
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: BoxDecoration(
          color: p.surface,
          border: Border(
              top: BorderSide(color: p.border.withValues(alpha: 0.6))),
        ),
        child: Row(
          children: [
            if (onQuayLai != null)
              Expanded(
                flex: 2,
                child: OutlinedButton(
                  onPressed: dangXuLy ? null : onQuayLai,
                  child: const Text('Quay lại'),
                ),
              ),
            if (onQuayLai != null) const SizedBox(width: 10),
            Expanded(
              flex: 3,
              child: FilledButton(
                onPressed:
                    (coTheTiepTuc && !dangXuLy) ? onTiep : null,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF5B4DFF),
                ),
                child: dangXuLy
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : Text(label),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
