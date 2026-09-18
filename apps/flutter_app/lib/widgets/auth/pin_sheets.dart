// ═══════════════════════════════════════════════════════════════════════════
// PinSheets — mirror các modal auth của web:
//   - showNhapPinSheet   ← NhapPinDuyetModal (3 bước đangTai/nhap/dat, khóa 30s)
//   - showDoiPinSheet    ← DoiPinModal
//   - showDoiMatKhauSheet← DoiMatKhauModal
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/service_lts_client.dart';
import '../../store/app_state.dart';
import '../../theme/lts_tokens.dart';
import '../lts/lts_overlay.dart';
import 'nhap_ma_pin.dart';

const _soLanSaiToiDa = 5;
const _thoiGianKhoaMs = 30000;
const thongBaoSaiPin = 'Mã pin sai, mời nhập lại';

int _soLanSai = 0;
DateTime? _khoaDen;

bool _dangKhoa() {
  if (_khoaDen != null && DateTime.now().isAfter(_khoaDen!)) {
    _khoaDen = null;
    _soLanSai = 0;
  }
  return _khoaDen != null;
}

/// Lỗi 401 "Hết phiên" không tính là sai PIN (mirror laLoiSaiPin).
bool laLoiSaiPin(String msg, Object err) {
  if (err is LoiServiceLts && err.status == 401 && msg.contains('hết phiên')) {
    return false;
  }
  return RegExp('mã pin|pin không|invalid pin', caseSensitive: false)
      .hasMatch(msg);
}

String? _loiKhoa() {
  if (!_dangKhoa()) return null;
  final giay =
      _khoaDen!.difference(DateTime.now()).inMilliseconds / 1000;
  return 'Quá nhiều lần nhập sai. Thử lại sau ${giay.ceil()} giây.';
}

// ── Label + lỗi dùng chung ──────────────────────────────────────────────────
class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text,
          style: TextStyle(
              fontSize: 12.5, fontWeight: FontWeight.w700, color: p.text)),
    );
  }
}

class _LoiBox extends StatelessWidget {
  final String loi;
  const _LoiBox(this.loi);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFDF2F2),
        border: Border.all(color: const Color(0xFFF3C1C1)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(loi,
          style: const TextStyle(fontSize: 13, color: Color(0xFFB42318))),
    );
  }
}

class _GhiChu extends StatelessWidget {
  final String text;
  final IconData icon;
  const _GhiChu(this.text, {this.icon = Icons.verified_user_outlined});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: p.green),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text,
              style: TextStyle(fontSize: 12.5, color: p.muted, height: 1.45)),
        ),
      ],
    );
  }
}

class _NutChinh extends StatelessWidget {
  final String label;
  final bool loading;
  final bool enabled;
  final VoidCallback onTap;
  const _NutChinh({
    required this.label,
    required this.enabled,
    required this.onTap,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 44,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFF5B4DFF),
          disabledBackgroundColor: const Color(0xFFB9B2FF),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        onPressed: enabled && !loading ? onTap : null,
        child: loading
            ? const SizedBox(
                width: 16,
                height: 16,
                child:
                    CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
      ),
    );
  }
}

class _TextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool obscure;
  final bool hienText;
  final bool enabled;
  final VoidCallback? onEye;
  final ValueChanged<String>? onSubmitted;
  const _TextField({
    required this.controller,
    required this.label,
    this.hint,
    this.obscure = false,
    this.hienText = false,
    this.enabled = true,
    this.onEye,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Label(label),
        TextField(
          controller: controller,
          obscureText: obscure && !hienText,
          enabled: enabled,
          textInputAction: TextInputAction.next,
          onSubmitted: onSubmitted,
          style: TextStyle(fontSize: 14.5, color: p.text),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: p.dim),
            filled: true,
            fillColor: Colors.white,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: p.border)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF5B4DFF))),
            disabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
            suffixIcon: onEye == null
                ? null
                : IconButton(
                    onPressed: onEye,
                    icon: Icon(
                        hienText
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 19,
                        color: p.muted)),
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Nhập PIN để xác nhận (mirror NhapPinDuyetModal)
// ═══════════════════════════════════════════════════════════════════════════

/// Mở sheet nhập PIN. Trả `true` nếu onConfirm(pinToken) thành công.
Future<bool?> showNhapPinSheet(
  BuildContext context, {
  required String title,
  String message = '',
  String confirmLabel = 'Xác nhận duyệt',
  required Future<void> Function(String pinToken) onConfirm,
}) {
  return showLtsSheet<bool>(
    context,
    title: title,
    builder: (_) => _NhapPinBody(
      message: message,
      confirmLabel: confirmLabel,
      onConfirm: onConfirm,
    ),
  );
}

class _NhapPinBody extends StatefulWidget {
  final String message;
  final String confirmLabel;
  final Future<void> Function(String pinToken) onConfirm;
  const _NhapPinBody({
    required this.message,
    required this.confirmLabel,
    required this.onConfirm,
  });

  @override
  State<_NhapPinBody> createState() => _NhapPinBodyState();
}

class _NhapPinBodyState extends State<_NhapPinBody> {
  String _buoc = 'dangTai'; // dangTai | nhap | dat
  String? _loi;
  String? _loiPin;
  bool _dangXuLy = false;
  String _pin = '';
  final _matKhau = TextEditingController();
  final _pinMoi = NhapMaPinStateSub();
  final _xacNhan = NhapMaPinStateSub();

  @override
  void initState() {
    super.initState();
    _kiemTra();
  }

  @override
  void dispose() {
    _matKhau.dispose();
    super.dispose();
  }

  void _reset() {
    _pin = '';
    _matKhau.clear();
    _pinMoi.clear();
    _xacNhan.clear();
    _loi = null;
    _loiPin = null;
    _dangXuLy = false;
  }

  void _kiemTra() async {
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) {
      setState(() {
        _loi = 'Cần đăng nhập để xác nhận mã PIN.';
        _buoc = 'nhap';
      });
      return;
    }
    setState(() => _buoc = 'dangTai');
    try {
      final tt = await layTrangThaiBaoMatService(token);
      if (mounted) setState(() => _buoc = tt.hasPin ? 'nhap' : 'dat');
    } catch (err) {
      if (mounted) {
        setState(() {
          _loi = err is LoiServiceLts
              ? err.message
              : 'Không kiểm tra được mã PIN.';
          _buoc = 'nhap';
        });
      }
    }
  }

  void _xuLySaiPin([String? msgKhoa]) {
    _soLanSai += 1;
    if (_soLanSai >= _soLanSaiToiDa) {
      _khoaDen = DateTime.now().add(const Duration(milliseconds: _thoiGianKhoaMs));
      _soLanSai = 0;
      setState(() {
        _loiPin = null;
        _loi = msgKhoa ??
            'Quá nhiều lần nhập sai. Thử lại sau ${(_thoiGianKhoaMs / 1000).ceil()} giây.';
      });
    } else {
      setState(() {
        _loi = null;
        _loiPin = thongBaoSaiPin;
      });
    }
    _pin = '';
    _dangXuLy = false;
  }

  Future<void> _datPinMoi() async {
    final s = context.read<AppState>();
    setState(() {
      _loi = null;
      _loiPin = null;
    });
    if (_matKhau.text.isEmpty) {
      setState(() => _loi = 'Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!RegExp(r'^\d{6}$').hasMatch(_pinMoi.value)) {
      setState(() => _loi = 'Mã PIN phải gồm đúng 6 chữ số.');
      return;
    }
    if (_pinMoi.value != _xacNhan.value) {
      setState(() => _loi = 'Mã PIN xác nhận không khớp.');
      return;
    }
    setState(() => _dangXuLy = true);
    try {
      await s.datPin(_matKhau.text, _pinMoi.value);
      _reset();
      if (mounted) setState(() => _buoc = 'nhap');
    } catch (err) {
      setState(() => _loi = err is LoiServiceLts ? err.message : 'Đặt mã PIN thất bại.');
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  Future<void> _xuLyXacNhan() async {
    setState(() {
      _loi = null;
      _loiPin = null;
    });
    final loiKhoaHienTai = _loiKhoa();
    if (loiKhoaHienTai != null) {
      setState(() => _loi = loiKhoaHienTai);
      return;
    }
    if (!RegExp(r'^\d{6}$').hasMatch(_pin)) {
      setState(() => _loi = 'Vui lòng nhập đủ 6 chữ số.');
      return;
    }
    final s = context.read<AppState>();
    final token = s.accessToken;
    if (token == null) return;
    setState(() => _dangXuLy = true);
    try {
      final pinToken = await xacThucPinService(token, _pin);
      _soLanSai = 0;
      _khoaDen = null;
      await widget.onConfirm(pinToken);
      if (mounted) Navigator.of(context).pop(true);
    } catch (err) {
      final msg = err is LoiServiceLts ? err.message : 'Xác nhận thất bại.';
      if (laLoiSaiPin(msg, err)) {
        _xuLySaiPin();
        return;
      }
      setState(() {
        _loi = msg;
        _pin = '';
        _dangXuLy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final khoa = _loiKhoa();
    return Padding(
      padding: EdgeInsets.only(
          left: 20, right: 20, bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.message.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(widget.message,
                    style: TextStyle(fontSize: 13, color: p.muted)),
              ),
            if (_loi != null) _LoiBox(_loi!),
            if (_buoc == 'dangTai')
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Row(
                  children: [
                    const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2)),
                    const SizedBox(width: 8),
                    Text('Đang kiểm tra mã PIN...',
                        style: TextStyle(fontSize: 13, color: p.muted)),
                  ],
                ),
              )
            else if (_buoc == 'dat') ...[
              const _GhiChu('Bạn chưa đặt mã PIN duyệt. Hãy đặt PIN 6 chữ số '
                  'trước khi thực hiện duyệt.'),
              const SizedBox(height: 14),
              _TextField(
                  controller: _matKhau,
                  label: 'Mật khẩu hiện tại',
                  obscure: true),
              const SizedBox(height: 14),
              _Label('Mã PIN mới'),
              NhapMaPin(
                onChange: (v) => setState(() => _pinMoi.value = v),
              ),
              const SizedBox(height: 14),
              _Label('Nhập lại mã PIN'),
              NhapMaPin(
                onChange: (v) => setState(() => _xacNhan.value = v),
                onEnter: (_) {
                  if (!_dangXuLy &&
                      RegExp(r'^\d{6}$').hasMatch(_pinMoi.value) &&
                      _pinMoi.value == _xacNhan.value &&
                      _matKhau.text.isNotEmpty) {
                    _datPinMoi();
                  }
                },
              ),
              const SizedBox(height: 16),
              _NutChinh(
                label: 'Lưu & tiếp tục',
                enabled: _matKhau.text.isNotEmpty &&
                    RegExp(r'^\d{6}$').hasMatch(_pinMoi.value) &&
                    _pinMoi.value == _xacNhan.value,
                loading: _dangXuLy,
                onTap: _datPinMoi,
              ),
            ] else ...[
              _Label('Nhập mã PIN 6 số'),
              NhapMaPin(
                autoFocus: true,
                error: _loiPin != null,
                disabled: _dangXuLy || _dangKhoa(),
                onChange: (v) {
                  setState(() {
                    _pin = v;
                    if (_loiPin != null) _loiPin = null;
                  });
                },
                onEnter: (_) {
                  if (!_dangXuLy &&
                      !_dangKhoa() &&
                      RegExp(r'^\d{6}$').hasMatch(_pin)) {
                    _xuLyXacNhan();
                  }
                },
              ),
              if (_loiPin != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(_loiPin!,
                      style: const TextStyle(
                          fontSize: 12.5, color: Color(0xFFB42318))),
                ),
              const SizedBox(height: 16),
              _NutChinh(
                label: widget.confirmLabel,
                enabled: RegExp(r'^\d{6}$').hasMatch(_pin) && khoa == null,
                loading: _dangXuLy,
                onTap: _xuLyXacNhan,
              ),
            ],
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

/// Helper giữ giá trị PIN mới (không dùng controller để mirror web state).
class NhapMaPinStateSub {
  String value = '';
  void clear() => value = '';
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Đổi mã PIN (mirror DoiPinModal)
// ═══════════════════════════════════════════════════════════════════════════
Future<void> showDoiPinSheet(BuildContext context) {
  return showLtsSheet(
    context,
    title: 'Đổi mã Pin',
    builder: (_) => const _DoiPinBody(),
  );
}

class _DoiPinBody extends StatefulWidget {
  const _DoiPinBody();

  @override
  State<_DoiPinBody> createState() => _DoiPinBodyState();
}

class _DoiPinBodyState extends State<_DoiPinBody> {
  final _matKhau = TextEditingController();
  String _pinMoi = '';
  String _xacNhan = '';
  bool _dangXuLy = false;
  String? _loi;
  bool _thanhCong = false;

  @override
  void dispose() {
    _matKhau.dispose();
    super.dispose();
  }

  Future<void> _xuLyLuu() async {
    final s = context.read<AppState>();
    setState(() => _loi = null);
    if (_matKhau.text.isEmpty) {
      setState(() => _loi = 'Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!RegExp(r'^\d{6}$').hasMatch(_pinMoi)) {
      setState(() => _loi = 'Mã PIN phải gồm đúng 6 chữ số.');
      return;
    }
    if (_pinMoi != _xacNhan) {
      setState(() => _loi = 'Mã PIN xác nhận không khớp.');
      return;
    }
    setState(() => _dangXuLy = true);
    try {
      await s.datPin(_matKhau.text, _pinMoi);
      setState(() => _thanhCong = true);
    } catch (err) {
      setState(() => _loi = err is LoiServiceLts ? err.message : 'Đổi mã PIN thất bại.');
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_thanhCong) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.verified_user_rounded,
                size: 44, color: Color(0xFF16A34A)),
            const SizedBox(height: 12),
            const Text('Đổi mã PIN thành công',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text(
                'Từ giờ, mỗi lần duyệt báo giá / LSX bạn cần nhập mã PIN.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
            const SizedBox(height: 18),
            _NutChinh(label: 'Đóng', enabled: true, onTap: () => Navigator.pop(context)),
          ],
        ),
      );
    }
    return Padding(
      padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Mã PIN 6 số dùng khi bạn duyệt báo giá / LSX',
                style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
            const SizedBox(height: 14),
            if (_loi != null) _LoiBox(_loi!),
            _TextField(
                controller: _matKhau,
                label: 'Mật khẩu hiện tại',
                obscure: true,
                enabled: !_dangXuLy),
            const SizedBox(height: 14),
            _Label('Mã PIN mới'),
            NhapMaPin(
                onChange: (v) => setState(() => _pinMoi = v),
                disabled: _dangXuLy),
            const _GhiChu('Gồm đúng 6 chữ số', icon: Icons.info_outline),
            const SizedBox(height: 14),
            _Label('Nhập lại mã PIN mới'),
            NhapMaPin(
                onChange: (v) => setState(() => _xacNhan = v),
                disabled: _dangXuLy,
                onEnter: (_) {
                  if (!_dangXuLy && _matKhau.text.isNotEmpty) _xuLyLuu();
                }),
            const SizedBox(height: 10),
            const _GhiChu('Mã PIN được lưu trên máy chủ. Không chia sẻ với người khác.'),
            const SizedBox(height: 16),
            _NutChinh(
              label: 'Lưu PIN mới',
              enabled: _matKhau.text.isNotEmpty &&
                  RegExp(r'^\d{6}$').hasMatch(_pinMoi) &&
                  _pinMoi == _xacNhan,
              loading: _dangXuLy,
              onTap: _xuLyLuu,
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Đổi mật khẩu (mirror DoiMatKhauModal)
// ═══════════════════════════════════════════════════════════════════════════
Future<void> showDoiMatKhauSheet(BuildContext context) {
  return showLtsSheet(
    context,
    title: 'Đổi mật khẩu',
    builder: (_) => const _DoiMatKhauBody(),
  );
}

class _DoiMatKhauBody extends StatefulWidget {
  const _DoiMatKhauBody();

  @override
  State<_DoiMatKhauBody> createState() => _DoiMatKhauBodyState();
}

class _DoiMatKhauBodyState extends State<_DoiMatKhauBody> {
  final _hienTai = TextEditingController();
  final _moi = TextEditingController();
  final _xacNhan = TextEditingController();
  bool _hienHienTai = false;
  bool _hienMoi = false;
  bool _hienXacNhan = false;
  bool _dangXuLy = false;
  String? _loi;
  bool _thanhCong = false;

  @override
  void dispose() {
    _hienTai.dispose();
    _moi.dispose();
    _xacNhan.dispose();
    super.dispose();
  }

  Future<void> _xuLyLuu() async {
    final s = context.read<AppState>();
    setState(() => _loi = null);
    if (_hienTai.text.isEmpty || _moi.text.isEmpty || _xacNhan.text.isEmpty) {
      setState(() => _loi = 'Vui lòng điền đầy đủ các trường.');
      return;
    }
    if (_moi.text.length < 6) {
      setState(() => _loi = 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (_moi.text != _xacNhan.text) {
      setState(() => _loi = 'Mật khẩu xác nhận không khớp.');
      return;
    }
    setState(() => _dangXuLy = true);
    try {
      await s.doiMatKhau(_hienTai.text, _moi.text);
      setState(() => _thanhCong = true);
    } catch (err) {
      setState(() =>
          _loi = err is LoiServiceLts ? err.message : 'Đổi mật khẩu thất bại.');
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    if (_thanhCong) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.verified_user_rounded,
                size: 44, color: Color(0xFF16A34A)),
            const SizedBox(height: 12),
            const Text('Đổi mật khẩu thành công',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Phiên làm việc đã được cập nhật với token mới.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
            const SizedBox(height: 18),
            _NutChinh(label: 'Đóng', enabled: true, onTap: () => Navigator.pop(context)),
          ],
        ),
      );
    }
    return Padding(
      padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Đổi mật khẩu cho tài khoản @${s.nguoiDungHienTai?.account ?? '—'}',
                style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
            const SizedBox(height: 14),
            if (_loi != null) _LoiBox(_loi!),
            _TextField(
                controller: _hienTai,
                label: 'Mật khẩu hiện tại',
                hint: 'Nhập mật khẩu hiện tại',
                obscure: true,
                hienText: _hienHienTai,
                enabled: !_dangXuLy,
                onEye: () => setState(() => _hienHienTai = !_hienHienTai)),
            const SizedBox(height: 14),
            _TextField(
                controller: _moi,
                label: 'Mật khẩu mới',
                hint: 'Nhập mật khẩu mới',
                obscure: true,
                hienText: _hienMoi,
                enabled: !_dangXuLy,
                onEye: () => setState(() => _hienMoi = !_hienMoi)),
            const _GhiChu('Ít nhất 6 ký tự', icon: Icons.info_outline),
            const SizedBox(height: 14),
            _TextField(
                controller: _xacNhan,
                label: 'Xác nhận mật khẩu mới',
                hint: 'Nhập lại mật khẩu mới',
                obscure: true,
                hienText: _hienXacNhan,
                enabled: !_dangXuLy,
                onEye: () => setState(() => _hienXacNhan = !_hienXacNhan),
                onSubmitted: (_) => _xuLyLuu()),
            const SizedBox(height: 16),
            _NutChinh(
              label: 'Đổi mật khẩu',
              enabled: _hienTai.text.isNotEmpty &&
                  _moi.text.isNotEmpty &&
                  _xacNhan.text.isNotEmpty,
              loading: _dangXuLy,
              onTap: _xuLyLuu,
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
