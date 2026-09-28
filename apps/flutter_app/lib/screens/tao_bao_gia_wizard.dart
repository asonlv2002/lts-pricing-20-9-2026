// ═══════════════════════════════════════════════════════════════════════════
// TaoBaoGiaWizard — wizard tạo/cập nhật bảng báo giá (mirror web ModuleBaoGia:
// tao-bao-gia). Gồm 3 bước:
//   Bước 1: Chọn khách hàng (search + select từ list KH)
//   Bước 2: Chọn pricing sheet (multi-select sheet của KH; filter
//            `quotationId == null` khi tạo mới, hoặc thuộc BG khi sửa)
//   Bước 3: Quy cách & giá từng sản phẩm (bagSpec + tiers) + điều khoản +
//            tên BG/mô tả. Tạo qua POST /quotations hoặc cập nhật qua
//            PATCH /quotations/:id/update (mirror web capNhatBaoGiaService).
//
// Dữ liệu sản phẩm lưu vào `inputValue.productBagSpecs` (bagSpec + tiers +
// baoGia/chotGia/finalPrice) — PDF/DOCX và LSX đọc lại.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/auth/pin_sheets.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';
import '../widgets/quote_product_editor.dart';
import 'package:lts_pricing/lib/quote_terms.dart';

class TaoBaoGiaWizard extends StatefulWidget {
  /// Optional: khi user bấm "Tạo BG" từ calculator, có sẵn KH từ input.
  final String? prefillCustomerName;

  /// Optional: khi user bấm "Tạo BG" từ calculator, sẵn pricing sheet id
  /// (vừa tạo qua `taoPricingSheetService`).
  final String? prefillPricingSheetId;

  /// Optional: chế độ "đính kèm" — wizard chỉ chọn KH + mô tả + nộp duyệt.
  final bool attachOnly;

  /// Báo giá đang sửa (null = tạo mới). Mirror web `baoGiaDangSua`.
  final BaoGiaApi? suaBaoGia;

  /// Optional callback sau khi tạo/cập nhật BG thành công.
  final void Function(BaoGiaApi bg)? onSuccess;

  const TaoBaoGiaWizard({
    super.key,
    this.prefillCustomerName,
    this.prefillPricingSheetId,
    this.attachOnly = false,
    this.suaBaoGia,
    this.onSuccess,
  });

  @override
  State<TaoBaoGiaWizard> createState() => _TaoBaoGiaWizardState();
}

class _TaoBaoGiaWizardState extends State<TaoBaoGiaWizard> {
  int _step = 0;
  KhachHang? _kh;
  /// Mã KH fallback khi edit mode không resolve được KH (ngoài quyền).
  String? _maKhFallback;
  final Set<String> _selectedSheetIds = <String>{};
  final TextEditingController _tenCtrl = TextEditingController();
  final TextEditingController _moTaCtrl = TextEditingController();
  final TextEditingController _diaChiCtrl = TextEditingController();
  final TextEditingController _ghiChuTermsCtrl = TextEditingController();
  bool _nopDuyetNgay = false;

  /// Điều khoản báo giá (mirror WizardState.terms của web).
  QuoteTerms _terms = const QuoteTerms();

  List<KhachHang> _dsKh = const [];
  List<PricingSheetApi> _dsSheet = const [];
  /// Draft sản phẩm (quy cách + tiers) cho các sheet đã chọn.
  final Map<String, QuoteSheetDraft> _drafts = {};
  String _queryKh = '';
  String _querySheet = '';
  bool _dangTaiKh = false;
  bool _dangTaiSheet = false;
  bool _dangTao = false;
  String? _loiKh;
  String? _loiSheet;

  bool get _dangSua => widget.suaBaoGia != null;

  @override
  void initState() {
    super.initState();
    final bg = widget.suaBaoGia;
    if (bg != null) {
      _khoiPhucTuBaoGia(bg);
    } else {
      if (widget.attachOnly && widget.prefillPricingSheetId != null) {
        _selectedSheetIds.add(widget.prefillPricingSheetId!);
        _step = 1;
      }
    }
    _taiKh();
  }

  /// Nạp state từ báo giá server (mirror web prefill `baoGiaDangSua`).
  void _khoiPhucTuBaoGia(BaoGiaApi bg) {
    final iv = bg.inputValue ?? const <String, dynamic>{};
    final ten = (iv['quotationName'] as String?)?.trim();
    _tenCtrl.text = ten?.isNotEmpty == true ? ten! : (bg.description ?? '');
    _moTaCtrl.text = (iv['notes'] as String?) ?? '';
    _diaChiCtrl.text = (iv['deliveryAddress'] as String?) ?? '';
    _terms = QuoteTerms(
      vatRate: (iv['vatRate'] as num?)?.toDouble() ?? 8,
      vatCylinderRate: (iv['vatCylinderRate'] as num?)?.toDouble() ?? 10,
      validityDays: (iv['validityDays'] as num?)?.toDouble() ?? 30,
      paymentTerms: (iv['paymentTerms'] as String?) ?? 'Thanh toán 30 ngày',
      deliveryTime: (iv['deliveryTime'] as String?) ?? '7-10 ngày làm việc',
      deliveryAddress: (iv['deliveryAddress'] as String?) ?? '',
      notes: (iv['notes'] as String?) ?? '',
      quantityTolerance: (iv['quantityTolerance'] as num?)?.toDouble() ?? 10,
      techRequirement:
          (iv['techRequirement'] as String?) ?? 'Chạy theo market ký duyệt',
    );
    _maKhFallback = _khachHangCodeTuBaoGia(bg);
    for (final sh in bg.pricingSheets) {
      _selectedSheetIds.add(sh.id);
    }
    // Seed ngay sheet của BG để edit mode không phụ thuộc GET /pricing-sheet
    // (sheet đã gắn BG có thể không xuất hiện trong list tự do).
    _dsSheet = bg.pricingSheets;
    _dongBoDrafts();
    _step = 1;
  }

  @override
  void dispose() {
    _tenCtrl.dispose();
    _moTaCtrl.dispose();
    _diaChiCtrl.dispose();
    _ghiChuTermsCtrl.dispose();
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
      if (!mounted) return;
      setState(() {
        _dsKh = ds;
        // Edit mode: resolve KH từ customerCodeName của BG.
        if (_dangSua && _kh == null) {
          final code = _maKhFallback;
          if (code != null) {
            for (final kh in ds) {
              if (kh.codeName == code) {
                _kh = kh;
                break;
              }
            }
          }
        }
      });
      if (_dangSua && _maKhFallback != null) {
        await _taiSheet(_maKhFallback!);
      }
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

  String? _khachHangCodeTuBaoGia(BaoGiaApi bg) {
    final iv = bg.inputValue ?? const <String, dynamic>{};
    final direct = (iv['customerCodeName'] as String?)?.trim();
    if (direct != null && direct.isNotEmpty) return direct;
    for (final sh in bg.pricingSheets) {
      final code = sh.customerCodeName?.trim();
      if (code != null && code.isNotEmpty) return code;
    }
    return null;
  }

  Future<void> _taiSheet(String customerCodeName) async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() {
      _dangTaiSheet = true;
      _loiSheet = null;
    });
    try {
      final all = await layDanhSachPricingSheetService(token);
      final suaId = widget.suaBaoGia?.id;
      // Cùng KH + chưa gắn BG (hoặc đang gắn chính BG đang sửa).
      final filtered = all
          .where((sh) =>
              sh.customerCodeName == customerCodeName &&
              (sh.quotationId == null || sh.quotationId == suaId))
          .toList();
      // Edit mode: luôn giữ sheet của BG dù list tự do không trả về.
      if (_dangSua) {
        final ids = filtered.map((s) => s.id).toSet();
        for (final sh in widget.suaBaoGia!.pricingSheets) {
          if (!ids.contains(sh.id)) filtered.insert(0, sh);
        }
      }
      if (mounted) {
        setState(() {
          _dsSheet = filtered;
          if (_dangSua) _dongBoDrafts();
        });
      }
    } catch (err) {
      if (mounted) {
        setState(() => _loiSheet = err is LoiServiceLts
            ? err.message
            : 'Không tải được danh sách bảng tính.');
      }
    } finally {
      if (mounted) setState(() => _dangTaiSheet = false);
    }
  }

  /// Tạo/cập nhật draft khi chọn/bỏ sheet.
  void _dongBoDrafts() {
    final bagSpecs =
        (widget.suaBaoGia?.inputValue?['productBagSpecs'] as List?) ?? const [];
    final mats = context.read<AppState>().materials;
    for (final sh in _dsSheet) {
      if (!_selectedSheetIds.contains(sh.id)) {
        _drafts.remove(sh.id);
        continue;
      }
      if (_drafts.containsKey(sh.id)) continue;
      // Tìm bagSpec/tiers đã lưu cho sheet này.
      Map<String, dynamic>? savedSpec;
      List<dynamic>? savedTiers;
      var idx = 0;
      for (final e in bagSpecs) {
        if (e is Map &&
            (e['pricingSheetId'] == sh.id ||
                e['sourceHistoryItemId'] == sh.id)) {
          savedSpec = (e['bagSpec'] as Map?)?.cast<String, dynamic>();
          savedTiers = e['tiers'] as List?;
          break;
        }
        idx++;
      }
      // Fallback theo index (mirror web bao-gia-adapter).
      if (savedSpec == null && idx < bagSpecs.length && bagSpecs[idx] is Map) {
        final entry = (bagSpecs[idx] as Map).cast<String, dynamic>();
        savedSpec = (entry['bagSpec'] as Map?)?.cast<String, dynamic>();
        savedTiers = entry['tiers'] as List?;
      }
      _drafts[sh.id] = QuoteSheetDraft.fromSheet(
        sh,
        savedBagSpec: savedSpec,
        savedTiers: savedTiers,
        materials: mats,
      );
    }
  }

  List<KhachHang> get _hienThiKh {
    final q = _queryKh.trim().toLowerCase();
    if (q.isEmpty) return _dsKh;
    return _dsKh.where((kh) {
      final v = kh.moiNhat;
      return kh.codeName.toLowerCase().contains(q) ||
          (v?.organizationName.toLowerCase().contains(q) ?? false) ||
          (v?.contactName.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  List<PricingSheetApi> get _hienThiSheet {
    final q = _querySheet.trim().toLowerCase();
    if (q.isEmpty) return _dsSheet;
    return _dsSheet.where((sh) {
      final iv = sh.inputValue;
      return (sh.pricingSheetName?.toLowerCase().contains(q) ?? false) ||
          ((iv['productName'] as String?)?.toLowerCase().contains(q) ?? false) ||
          ((iv['customer'] as String?)?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  void _chonKh(KhachHang kh) {
    setState(() {
      _kh = kh;
      _selectedSheetIds.clear();
      _drafts.clear();
      _step = 1;
    });
    _taiSheet(kh.codeName);
  }

  void _tiepTuc() {
    if (_step < 2) setState(() => _step++);
  }

  void _quayLai() {
    if (_step > 0) setState(() => _step--);
  }

  bool get _coTheTiepTuc {
    switch (_step) {
      case 0:
        return _kh != null || (_dangSua && _maKhFallback != null);
      case 1:
        return _selectedSheetIds.isNotEmpty;
      case 2:
        return _tenCtrl.text.trim().isNotEmpty;
      default:
        return false;
    }
  }

  /// Map draft → `productBagSpecs` (mirror web dayBaoGiaLenServer).
  List<Map<String, dynamic>> _buildProductBagSpecs() {
    final out = <Map<String, dynamic>>[];
    for (final sh in _dsSheet) {
      final draft = _drafts[sh.id];
      if (draft == null || !_selectedSheetIds.contains(sh.id)) continue;
      final tiers = draft.tiers
          .where((t) => t.quantity > 0)
          .map((t) => t.toJson())
          .toList();
      out.add({
        'sourceHistoryItemId': sh.id,
        'pricingSheetId': sh.id,
        'productName': draft.productName,
        'bagSpec': draft.bagSpec.toJson(),
        'finalPrice': draft.tiers.isNotEmpty
            ? draft.tiers.first.finalPrice
            : 0,
        'chotGia': sh.inputValue['chotGia'],
        'baoGia': draft.tiers.isNotEmpty ? draft.tiers.first.baoGia : 0,
        'tiers': tiers,
      });
    }
    return out;
  }

  Map<String, dynamic> _buildInputValue() {
    // Giữ lại các key cũ khi cập nhật (mirror web `...maBaoGiaCu`).
    final base = <String, dynamic>{
      ...?widget.suaBaoGia?.inputValue,
    };
    return {
      ...base,
      'quotationName': _tenCtrl.text.trim(),
      // Điều khoản: lưu cả flat (web đọc) lẫn nested 'terms' (Flutter đọc).
      'vatRate': _terms.vatRate,
      'vatCylinderRate': _terms.vatCylinderRate,
      'validityDays': _terms.validityDays,
      'paymentTerms': _terms.paymentTerms,
      'deliveryTime': _terms.deliveryTime,
      'deliveryAddress': _diaChiCtrl.text.trim(),
      'notes': _ghiChuTermsCtrl.text.trim(),
      'quantityTolerance': _terms.quantityTolerance,
      'techRequirement': _terms.techRequirement,
      'terms': _terms.toJson(),
      'customerCodeName': _kh?.codeName ?? _maKhFallback,
      if (widget.prefillCustomerName != null)
        'customer': widget.prefillCustomerName,
      'productBagSpecs': _buildProductBagSpecs(),
    };
  }

  Future<void> _tao() async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    final maKh = _kh?.codeName ?? _maKhFallback;
    if (maKh == null) return;
    if (_selectedSheetIds.isEmpty) {
      LtsToast.show(context, 'Vui lòng chọn ít nhất 1 bảng tính.',
          type: LtsToastType.error);
      return;
    }
    setState(() => _dangTao = true);
    try {
      final inputValue = _buildInputValue();
      final moTa = _moTaCtrl.text.trim().isEmpty ? null : _moTaCtrl.text.trim();
      final sheetIds = _selectedSheetIds.toList();

      BaoGiaApi bg;
      if (_dangSua) {
        bg = await capNhatBaoGiaService(
          token,
          widget.suaBaoGia!.id,
          moTa: moTa,
          duLieuDauVao: inputValue,
          dsPricingSheetId: sheetIds,
        );
      } else {
        bg = await taoBaoGiaService(
          token,
          TaoBaoGiaInput(
            customerCodeName: maKh,
            description: moTa,
            inputValue: inputValue,
            pricingSheetIds: sheetIds,
          ),
        );
      }
      var daNopDuyet = false;
      if (_nopDuyetNgay) {
        if (!mounted) return;
        // Nộp duyệt cần PIN (BE PinGuard trên status_update) — mirror web promptPin.
        final ok = await showNhapPinSheet(
          context,
          title: 'Nộp duyệt báo giá',
          message: 'Nhập mã PIN để nộp báo giá chờ duyệt.',
          confirmLabel: 'Xác nhận nộp',
          onConfirm: (pinToken) async {
            await nopBaoGiaService(token, bg.id, pinToken: pinToken);
          },
        );
        daNopDuyet = ok == true;
        if (!daNopDuyet && mounted) {
          LtsToast.show(context, 'Đã lưu báo giá (chưa nộp duyệt).',
              type: LtsToastType.info);
        }
      }
      if (!mounted) return;
      LtsToast.show(
          context,
          _dangSua
              ? (daNopDuyet
                  ? 'Đã cập nhật + nộp duyệt báo giá'
                  : 'Đã cập nhật báo giá')
              : (daNopDuyet
                  ? 'Đã tạo + nộp duyệt báo giá'
                  : 'Đã tạo báo giá'),
          type: LtsToastType.success);
      widget.onSuccess?.call(bg);
      Navigator.pop(context, bg);
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
        title: Text(_dangSua ? 'Cập nhật báo giá' : 'Tạo bảng báo giá'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          _Stepper(step: _step, onTap: (i) {
            if (i < _step) setState(() => _step = i);
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
            onQuayLai: _step == 0 ? null : _quayLai,
            onTiep: _step == 2 ? _tao : _tiepTuc,
            label: _step == 2
                ? (_dangSua ? 'Cập nhật báo giá' : 'Tạo báo giá')
                : 'Tiếp tục',
          ),
        ],
      ),
    );
  }

  Widget _buoc1(LtsPalette p) {
    if (_dangSua && _maKhFallback != null) {
      return ListView(
        padding: const EdgeInsets.all(16),
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
                Text(
                    _kh?.moiNhat?.organizationName ??
                        _kh?.codeName ??
                        _maKhFallback!,
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: p.text)),
                const SizedBox(height: 4),
                Text('Không thể thay đổi khách hàng khi cập nhật báo giá.',
                    style: TextStyle(fontSize: 11.5, color: p.dim)),
              ],
            ),
          ),
        ],
      );
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: TextField(
            decoration: InputDecoration(
              isDense: true,
              hintText: 'Tìm mã KH, tên tổ chức, liên hệ…',
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
            child: Column(
              children: [
                Text(_loiKh!,
                    style: const TextStyle(
                        fontSize: 13, color: Color(0xFFB42318))),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: _taiKh, child: const Text('Thử lại')),
              ],
            ),
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
                            if (v != null && v.contactName.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                  '${v.contactName}${v.phoneNumber.isNotEmpty ? ' · ${v.phoneNumber}' : ''}',
                                  style: TextStyle(
                                      fontSize: 12, color: p.muted)),
                            ],
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
    final kh = _kh;
    final tenKh = kh?.moiNhat?.organizationName ?? kh?.codeName ?? _maKhFallback;
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          color: p.shellBg,
          child: Row(
            children: [
              const Icon(Icons.person_outline, size: 16, color: Color(0xFF5B4DFF)),
              const SizedBox(width: 6),
              Expanded(
                child: Text('Khách: ${tenKh ?? '—'}',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700)),
              ),
              if (!_dangSua)
                TextButton(
                  onPressed: () => setState(() {
                    _step = 0;
                    _kh = null;
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
              hintText: 'Tìm tên sheet, sản phẩm…',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _querySheet.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () => setState(() => _querySheet = ''),
                    ),
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onChanged: (v) => setState(() => _querySheet = v),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Text('Đã chọn: ${_selectedSheetIds.length} sheet',
              style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: p.muted)),
        ),
        if (_loiSheet != null)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(_loiSheet!,
                style: const TextStyle(
                    fontSize: 13, color: Color(0xFFB42318))),
          )
        else if (_dangTaiSheet)
          const Expanded(child: Center(child: CircularProgressIndicator()))
        else if (_hienThiSheet.isEmpty)
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(
                    'Khách hàng này chưa có bảng tính chưa gắn báo giá.\nHãy tạo bảng tính trước ở màn Tính giá.',
                    style: TextStyle(fontSize: 13, color: p.muted),
                    textAlign: TextAlign.center),
              ),
            ),
          )
        else
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 32),
              itemCount: _hienThiSheet.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final sh = _hienThiSheet[i];
                final iv = sh.inputValue;
                final sp = (iv['productName'] as String?) ??
                    sh.pricingSheetName ??
                    sh.id;
                final selected = _selectedSheetIds.contains(sh.id);
                return LtsCard(
                  onTap: () {
                    setState(() {
                      if (selected) {
                        _selectedSheetIds.remove(sh.id);
                      } else {
                        _selectedSheetIds.add(sh.id);
                      }
                      _dongBoDrafts();
                    });
                  },
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Checkbox(
                        value: selected,
                        onChanged: (v) {
                          setState(() {
                            if (v ?? false) {
                              _selectedSheetIds.add(sh.id);
                            } else {
                              _selectedSheetIds.remove(sh.id);
                            }
                            _dongBoDrafts();
                          });
                        },
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(sp,
                                style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: p.text),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                            if (iv['structure'] is String ||
                                iv['structureText'] is String)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                    (iv['structureText'] as String?) ??
                                        (iv['structure'] as String?) ??
                                        '',
                                    style: TextStyle(
                                        fontSize: 11.5, color: p.muted),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis),
                              ),
                            if (iv['quantity'] is num)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                    'SL: ${iv['quantity']} | ${(iv['productType'] as String?) ?? 'túi'}',
                                    style: TextStyle(
                                        fontSize: 11.5, color: p.muted)),
                              ),
                          ],
                        ),
                      ),
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
    final handleOptions = context
        .watch<AppState>()
        .constants
        .raw['handleOptions'];
    final handleList = <(String, String)>[
      if (handleOptions is List)
        for (final o in handleOptions)
          if (o is Map)
            (o['key']?.toString() ?? '', o['label']?.toString() ?? ''),
    ];
    final mats = context.watch<AppState>().materials;
    final drafts = _dsSheet
        .where((sh) => _selectedSheetIds.contains(sh.id))
        .map((sh) => _drafts[sh.id])
        .whereType<QuoteSheetDraft>()
        .toList();

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
                      fontSize: 14, fontWeight: FontWeight.w700, color: p.text)),
              const SizedBox(height: 8),
              Text('${_selectedSheetIds.length} bảng tính đã chọn',
                  style: TextStyle(fontSize: 12, color: p.muted)),
              if (_kh == null && _maKhFallback != null) ...[
                const SizedBox(height: 4),
                Text('Mã KH: $_maKhFallback',
                    style: TextStyle(fontSize: 11.5, color: p.muted)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _tenCtrl,
          decoration: const InputDecoration(
            labelText: 'Tên báo giá *',
            hintText: 'VD: BG ACME 2026-01 túi 5kg',
            border: OutlineInputBorder(),
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _moTaCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Mô tả (tùy chọn)',
            hintText: 'Ghi chú thêm cho khách…',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        CheckboxListTile(
          value: _nopDuyetNgay,
          onChanged: (v) =>
              setState(() => _nopDuyetNgay = v ?? false),
          title: const Text('Nộp duyệt ngay sau khi lưu'),
          subtitle: const Text(
              'Báo giá sẽ chuyển sang trạng thái "Chờ duyệt" — cần người duyệt xử lý.'),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
        ),

        // ── Quy cách & giá từng sản phẩm ────────────────────────────────────
        const SizedBox(height: 8),
        Text('Quy cách & giá sản phẩm',
            style: TextStyle(
                fontSize: 12.5, fontWeight: FontWeight.w800, color: p.text)),
        const SizedBox(height: 4),
        for (final d in drafts)
          Card(
            margin: const EdgeInsets.only(top: 8),
            elevation: 0,
            shape: RoundedRectangleBorder(
              side: BorderSide(color: p.border),
              borderRadius: BorderRadius.circular(10),
            ),
            child: ExpansionTile(
              initiallyExpanded: true,
              title: Text(d.productName,
                  style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: p.text)),
              subtitle: Text(d.structure,
                  style: TextStyle(fontSize: 11.5, color: p.muted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              children: [
                QuoteProductEditor(
                  draft: d,
                  materials: mats,
                  handleOptions: handleList,
                  onChanged: () => setState(() {}),
                ),
              ],
            ),
          ),

        // ── Điều khoản ──────────────────────────────────────────────────────
        const SizedBox(height: 16),
        Text('Điều khoản sản xuất',
            style: TextStyle(
                fontSize: 12.5, fontWeight: FontWeight.w800, color: p.text)),
        const SizedBox(height: 8),
        _TermsDropdown(
          label: 'Số lượng thành phẩm có thể tăng hoặc giảm so với ĐĐH:',
          value: _terms.quantityTolerance > 0
              ? '±${_terms.quantityTolerance.round()}%'
              : '',
          options: dungSaiOptions.map((o) => '±$o').toList(),
          onChanged: (val) {
            final num = int.tryParse(val.replaceAll(RegExp(r'[±%]'), '')) ?? 10;
            setState(() =>
                _terms = _terms.copyWith(quantityTolerance: num.toDouble()));
          },
        ),
        const SizedBox(height: 10),
        _TermsDropdown(
          label: 'Yêu cầu kỹ thuật',
          value: _terms.techRequirement,
          options: yeuCauKyThuatOptions,
          onChanged: (val) =>
              setState(() => _terms = _terms.copyWith(techRequirement: val)),
        ),
        const SizedBox(height: 16),
        Text('Điều khoản báo giá',
            style: TextStyle(
                fontSize: 12.5, fontWeight: FontWeight.w800, color: p.text)),
        const SizedBox(height: 8),
        _TermsDropdown(
          label: 'VAT hàng hóa (%)',
          value: '${_terms.vatRate.round()}%',
          options: vatOptions,
          onChanged: (val) => setState(() => _terms = _terms.copyWith(
              vatRate: double.tryParse(val.replaceAll('%', '')) ?? 0)),
        ),
        const SizedBox(height: 10),
        _TermsDropdown(
          label: 'VAT trục in (%)',
          value: '${_terms.vatCylinderRate.round()}%',
          options: vatOptions,
          onChanged: (val) => setState(() => _terms = _terms.copyWith(
              vatCylinderRate:
                  double.tryParse(val.replaceAll('%', '')) ?? 0)),
        ),
        const SizedBox(height: 10),
        _TermsDropdown(
          label: 'Hiệu lực (ngày)',
          value: '${_terms.validityDays.round()} ngày',
          options: hieuLucOptions,
          onChanged: (val) => setState(() => _terms = _terms.copyWith(
              validityDays:
                  double.tryParse(val.replaceAll(RegExp(r'[^0-9]'), '')) ?? 30)),
        ),
        const SizedBox(height: 10),
        _TermsDropdown(
          label: 'Điều khoản thanh toán',
          value: _terms.paymentTerms,
          options: thanhToanOptions,
          onChanged: (val) =>
              setState(() => _terms = _terms.copyWith(paymentTerms: val)),
        ),
        const SizedBox(height: 10),
        _TermsDropdown(
          label: 'Thời gian giao hàng',
          value: _terms.deliveryTime,
          options: giaoHangOptions,
          onChanged: (val) =>
              setState(() => _terms = _terms.copyWith(deliveryTime: val)),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _diaChiCtrl,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Địa điểm giao hàng',
            hintText: 'Nhập địa điểm giao hàng…',
            border: OutlineInputBorder(),
          ),
          onChanged: (v) =>
              setState(() => _terms = _terms.copyWith(deliveryAddress: v)),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _ghiChuTermsCtrl,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Ghi chú điều khoản',
            hintText: 'Ghi chú thêm cho báo giá…',
            border: OutlineInputBorder(),
          ),
          onChanged: (v) =>
              setState(() => _terms = _terms.copyWith(notes: v)),
        ),
      ],
    );
  }
}

/// Dropdown điều khoản (mirror ComboBoxDieuKhoan) — cho phép giá trị ngoài list.
class _TermsDropdown extends StatelessWidget {
  final String label;
  final String value;
  final List<String> options;
  final ValueChanged<String> onChanged;
  const _TermsDropdown({
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final all = <String>{...options, if (value.isNotEmpty) value}.toList();
    return DropdownButtonFormField<String>(
      initialValue: value.isEmpty ? null : value,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        isDense: true,
      ),
      items: [
        for (final o in all)
          DropdownMenuItem(value: o, child: Text(o, style: const TextStyle(fontSize: 13))),
      ],
      onChanged: (v) {
        if (v != null) onChanged(v);
      },
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
    const labels = ['Khách hàng', 'Bảng tính', 'Quy cách & Điều khoản'];
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
