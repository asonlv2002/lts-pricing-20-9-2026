// ═══════════════════════════════════════════════════════════════════════════
// TaoBaoGiaWizard — wizard 3 bước tạo bảng báo giá (mirror web mobile
// MOBILE_HUBS.pricing_quote → "Tạo bảng báo giá" key = 'tao-bao-gia' trong
// ModuleBaoGia.tsx + BuocChonBaoGiaVaTinhGia.tsx).
//
// Flow:
//   Bước 1: Chọn khách hàng (search + select từ list KH)
//   Bước 2: Chọn pricing sheet (multi-select từ sheet của KH đó, filter
//            theo `quotationId == null` để chỉ lấy sheet chưa gắn BG)
//   Bước 3: Nhập tên BG + mô tả; tạo BG qua POST /quotations. Tùy chọn
//            "Nộp duyệt ngay" → gọi luôn PATCH /status_update.
//
// Mỗi bước 1 SectionCard; nút "Tiếp tục" / "Tạo báo giá" ở bottom bar
// sticky. Toàn bộ là 1 route `Navigator.push` (không phải bottom sheet
// modal — để có không gian scroll dọc thoáng).
//
// Sau khi tạo thành công → toast + `Navigator.pop`. Caller (`tinh_gia_screen`)
// có thể nhận `TaoBaoGiaWizard.create(...)` với `onSuccess` callback.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';

class TaoBaoGiaWizard extends StatefulWidget {
  /// Optional: khi user bấm "Tạo BG" từ calculator, có sẵn KH từ input.
  final String? prefillCustomerName;

  /// Optional: khi user bấm "Tạo BG" từ calculator, sẵn pricing sheet id
  /// (vừa tạo qua `taoPricingSheetService`).
  final String? prefillPricingSheetId;

  /// Optional: chế độ "đính kèm" — wizard chỉ chọn KH + mô tả + nộp duyệt.
  final bool attachOnly;

  /// Optional callback sau khi tạo BG thành công.
  final void Function(BaoGiaApi bg)? onSuccess;

  const TaoBaoGiaWizard({
    super.key,
    this.prefillCustomerName,
    this.prefillPricingSheetId,
    this.attachOnly = false,
    this.onSuccess,
  });

  @override
  State<TaoBaoGiaWizard> createState() => _TaoBaoGiaWizardState();
}

class _TaoBaoGiaWizardState extends State<TaoBaoGiaWizard> {
  int _step = 0;
  KhachHang? _kh;
  final Set<String> _selectedSheetIds = <String>{};
  final TextEditingController _tenCtrl = TextEditingController();
  final TextEditingController _moTaCtrl = TextEditingController();
  bool _nopDuyetNgay = false;

  List<KhachHang> _dsKh = const [];
  List<PricingSheetApi> _dsSheet = const [];
  String _queryKh = '';
  String _querySheet = '';
  bool _dangTaiKh = false;
  bool _dangTaiSheet = false;
  bool _dangTao = false;
  String? _loiKh;
  String? _loiSheet;

  @override
  void initState() {
    super.initState();
    if (widget.attachOnly && widget.prefillPricingSheetId != null) {
      _selectedSheetIds.add(widget.prefillPricingSheetId!);
      _step = 1; // bỏ qua bước 1 nếu attachOnly + đã có sheet
    }
    _taiKh();
  }

  @override
  void dispose() {
    _tenCtrl.dispose();
    _moTaCtrl.dispose();
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
      // Filter: cùng KH + chưa gắn vào BG (quotationId == null)
      final filtered = all
          .where((sh) =>
              sh.customerCodeName == customerCodeName &&
              sh.quotationId == null)
          .toList();
      if (mounted) setState(() => _dsSheet = filtered);
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
      _step = 1;
    });
    _taiSheet(kh.codeName);
  }

  void _tiepTuc() {
    if (_step < 2) {
      setState(() => _step++);
    }
  }

  void _quayLai() {
    if (_step > 0) setState(() => _step--);
  }

  bool get _coTheTiepTuc {
    switch (_step) {
      case 0:
        return _kh != null;
      case 1:
        return _selectedSheetIds.isNotEmpty;
      case 2:
        return _tenCtrl.text.trim().isNotEmpty;
      default:
        return false;
    }
  }

  Future<void> _tao() async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    final kh = _kh;
    if (kh == null) return;
    setState(() => _dangTao = true);
    try {
      final bg = await taoBaoGiaService(
        token,
        TaoBaoGiaInput(
          customerCodeName: kh.codeName,
          description: _moTaCtrl.text.trim().isEmpty
              ? null
              : _moTaCtrl.text.trim(),
          inputValue: {
            'quotationName': _tenCtrl.text.trim(),
            if (widget.prefillCustomerName != null)
              'customer': widget.prefillCustomerName,
          },
          pricingSheetIds: _selectedSheetIds.toList(),
        ),
      );
      if (_nopDuyetNgay) {
        try {
          await nopBaoGiaService(token, bg.id);
        } on LoiServiceLts catch (e) {
          if (!mounted) return;
          LtsToast.show(
              context, 'Tạo BG xong nhưng nộp duyệt thất bại: ${e.message}',
              type: LtsToastType.warning);
        }
      }
      if (!mounted) return;
      LtsToast.show(
          context,
          _nopDuyetNgay
              ? 'Đã tạo + nộp duyệt báo giá'
              : 'Đã tạo báo giá',
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
        title: const Text('Tạo bảng báo giá'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          _Stepper(step: _step, onTap: (i) {
            // Chỉ cho quay lại các bước trước
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
            label: _step == 2 ? 'Tạo báo giá' : 'Tiếp tục',
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
                              Text('${v.contactName}${v.phoneNumber.isNotEmpty ? ' · ${v.phoneNumber}' : ''}',
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
    final kh = _kh!;
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
                child: Text('Khách: ${kh.moiNhat?.organizationName ?? kh.codeName}',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700)),
              ),
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
          title: const Text('Nộp duyệt ngay sau khi tạo'),
          subtitle: const Text(
              'Báo giá sẽ chuyển sang trạng thái "Chờ duyệt" — cần người duyệt xử lý.'),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
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
    const labels = ['Khách hàng', 'Bảng tính', 'Tạo BG'];
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
