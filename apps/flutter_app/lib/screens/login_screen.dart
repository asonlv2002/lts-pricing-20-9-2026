// ═══════════════════════════════════════════════════════════════════════════
// LoginScreen — mirror auth/DangNhapModal.tsx + YeuCauDatLaiMatKhauFlow.tsx:
//   - Đăng nhập: Tài khoản + Mật khẩu (eye toggle) → POST /auth/login
//   - Quên mật khẩu (4 bước): gửi yêu cầu → chờ duyệt → xác thực mã 6 số
//     → đặt mật khẩu mới (verify + consume) → phiên mới như login
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';

class LoginScreen extends StatefulWidget {
  final bool cheDoReset;
  const LoginScreen({super.key, this.cheDoReset = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1220),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: widget.cheDoReset
                ? _ResetCard(onBack: () => Navigator.of(context).pop())
                : const _LoginCard(),
          ),
        ),
      ),
    );
  }
}

// ── Khối dùng chung ─────────────────────────────────────────────────────────
class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text('LTS',
            style: TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                color: Color(0xFF111827))),
        Text(' Service',
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6D7A8C))),
      ],
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

class _TextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final bool obscure;
  final bool enabled;
  final VoidCallback? onEye;
  final bool hienText;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onSubmitted;
  const _TextField({
    required this.controller,
    required this.label,
    required this.hint,
    this.obscure = false,
    this.enabled = true,
    this.onEye,
    this.hienText = false,
    this.keyboardType,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: Color(0xFF374151))),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          obscureText: obscure && !hienText,
          enabled: enabled,
          keyboardType: keyboardType,
          autofocus: true,
          textInputAction: TextInputAction.next,
          onSubmitted: onSubmitted,
          style: const TextStyle(fontSize: 14.5, color: Color(0xFF111827)),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFF9AA3B2)),
            filled: true,
            fillColor: Colors.white,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFD5D9E0))),
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
                        color: const Color(0xFF6B7280)),
                  ),
          ),
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
  final IconData? icon;
  const _NutChinh({
    required this.label,
    this.loading = false,
    required this.enabled,
    required this.onTap,
    this.icon,
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
            ? const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                      width: 15,
                      height: 15,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white)),
                  SizedBox(width: 8),
                  Flexible(
                      child: Text('Đang xử lý...',
                          style: TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w700))),
                ],
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 16, color: Colors.white),
                    const SizedBox(width: 6),
                  ],
                  Text(label,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700)),
                ],
              ),
      ),
    );
  }
}

class _NutPhu extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool loading;
  const _NutPhu(this.label, this.onTap, {this.loading = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 42,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF8A8F98),
          side: const BorderSide(color: Color(0xFFD5D9E0)),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        onPressed: loading ? null : onTap,
        child: Text(label, style: const TextStyle(fontSize: 13.5)),
      ),
    );
  }
}

// ── Card đăng nhập ──────────────────────────────────────────────────────────
class _LoginCard extends StatefulWidget {
  const _LoginCard();

  @override
  State<_LoginCard> createState() => _LoginCardState();
}

class _LoginCardState extends State<_LoginCard> {
  final _account = TextEditingController();
  final _password = TextEditingController();
  bool _showPassword = false;
  bool _dangXuLy = false;
  String? _loi;

  Future<void> _xuLyDangNhap() async {
    final s = context.read<AppState>();
    setState(() {
      _loi = null;
      _dangXuLy = true;
    });
    try {
      await s.dangNhap(_account.text.trim(), _password.text);
      if (mounted) {
        // LoginScreen có thể là root (HomeGate ép login) — chỉ pop khi đang push trên route khác.
        // Khi là root, HomeGate tự rebuild về HomeShell khi isAuthenticated=true.
        if (Navigator.canPop(context)) {
          Navigator.of(context).pop();
        }
      }
    } catch (err) {
      if (mounted) setState(() => _loi = mapAuthError(err));
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final error = _loi ?? s.authError;
    return Container(
      constraints: const BoxConstraints(maxWidth: 400),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: const Color(0xFF232B3A),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const _Brand(),
          const SizedBox(height: 6),
          const Text('Đăng nhập để truy cập hệ thống quản trị',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xFF9AA3B2))),
          const SizedBox(height: 24),
          _TextField(
              controller: _account,
              label: 'Tài khoản',
              hint: 'Nhập tài khoản',
              enabled: !_dangXuLy),
          const SizedBox(height: 14),
          _TextField(
            controller: _password,
            label: 'Mật khẩu',
            hint: 'Nhập mật khẩu',
            obscure: true,
            hienText: _showPassword,
            enabled: !_dangXuLy,
            onEye: () => setState(() => _showPassword = !_showPassword),
            onSubmitted: (_) => _xuLyDangNhap(),
          ),
          if (error != null) ...[const SizedBox(height: 14), _LoiBox(error)],
          const SizedBox(height: 16),
          _NutChinh(
            label: 'Đăng nhập',
            enabled: _account.text.trim().isNotEmpty &&
                _password.text.isNotEmpty,
            loading: _dangXuLy || s.authLoading,
            onTap: _xuLyDangNhap,
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: _dangXuLy
                ? null
                : () {
                    // Truyền tài khoản đã nhập sang flow reset.
                    Navigator.of(context).pushReplacement(MaterialPageRoute(
                        builder: (_) => LoginScreen(cheDoReset: true)));
                  },
            child: const Text('Quên mật khẩu / Gửi yêu cầu đặt lại',
                style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF8FA0C0),
                    decoration: TextDecoration.underline)),
          ),
        ],
      ),
    );
  }
}

// ── Card đặt lại mật khẩu (4 bước) ─────────────────────────────────────────
enum _BuocReset { account, waiting, code, password, done }

class _ResetCard extends StatefulWidget {
  final VoidCallback onBack;
  const _ResetCard({required this.onBack});

  @override
  State<_ResetCard> createState() => _ResetCardState();
}

class _ResetCardState extends State<_ResetCard> {
  _BuocReset _buoc = _BuocReset.account;
  final _account = TextEditingController();
  final _code = TextEditingController();
  final _matKhauMoi = TextEditingController();
  final _xacNhan = TextEditingController();
  bool _hienMoi = false;
  bool _hienXacNhan = false;
  bool _dangXuLy = false;
  String? _loi;
  String? _requestId;
  String? _expiresAt;

  static const _tieuDe = {
    _BuocReset.account: 'Yêu cầu đặt lại mật khẩu',
    _BuocReset.waiting: 'Đang chờ duyệt',
    _BuocReset.code: 'Nhập mã xác thực',
    _BuocReset.password: 'Đặt mật khẩu mới',
    _BuocReset.done: 'Đặt mật khẩu thành công',
  };
  static const _moTa = {
    _BuocReset.account: 'Nhập tài khoản để gửi yêu cầu đặt lại mật khẩu tới quản lý.',
    _BuocReset.waiting: 'Báo quản lý tài khoản duyệt yêu cầu, rồi nhận mã 6 số qua chat hoặc gọi điện.',
    _BuocReset.code: 'Nhập mã 6 số quản lý đã gửi cho bạn.',
    _BuocReset.password: 'Mã hợp lệ — hãy đặt mật khẩu mới cho tài khoản.',
    _BuocReset.done: 'Phiên mới đã sẵn sàng.',
  };

  @override
  void dispose() {
    _account.dispose();
    _code.dispose();
    _matKhauMoi.dispose();
    _xacNhan.dispose();
    super.dispose();
  }

  Future<void> _guiYeuCau() async {
    final acc = _account.text.trim();
    if (acc.isEmpty) {
      setState(() => _loi = 'Vui lòng nhập tài khoản.');
      return;
    }
    setState(() {
      _loi = null;
      _dangXuLy = true;
    });
    try {
      await guiYeuCauDatLaiMatKhau(acc);
      setState(() {
        _buoc = _BuocReset.waiting;
        _code.clear();
        _requestId = null;
        _expiresAt = null;
      });
    } catch (err) {
      setState(() => _loi = err.toString());
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  Future<void> _xacThucMa() async {
    final ma = _code.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(ma)) {
      setState(() => _loi = 'Mã phải gồm đúng 6 chữ số.');
      return;
    }
    setState(() {
      _loi = null;
      _dangXuLy = true;
    });
    try {
      final res = await xacThucMaDatLaiMatKhauService(
          _account.text.trim(), ma);
      if (res.status != 'verified') {
        setState(() => _loi = 'Xác thực chưa thành công. Thử lại.');
        return;
      }
      setState(() {
        _requestId = res.id;
        _expiresAt = res.expiresAt;
        _buoc = _BuocReset.password;
      });
    } catch (err) {
      setState(() => _loi = 'Mã không đúng hoặc đã hết hạn.');
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  Future<void> _luuMatKhau() async {
    final s = context.read<AppState>();
    if (_requestId == null) {
      setState(() {
        _loi = 'Thiếu mã yêu cầu. Vui lòng xác thực lại.';
        _buoc = _BuocReset.code;
      });
      return;
    }
    if (_matKhauMoi.text.isEmpty || _xacNhan.text.isEmpty) {
      setState(() => _loi = 'Vui lòng điền đầy đủ mật khẩu.');
      return;
    }
    if (_matKhauMoi.text.length < 6) {
      setState(() => _loi = 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (_matKhauMoi.text != _xacNhan.text) {
      setState(() => _loi = 'Mật khẩu xác nhận không khớp.');
      return;
    }
    setState(() {
      _loi = null;
      _dangXuLy = true;
    });
    try {
      final data = await datMatKhauMoiTuYeuCauService(
          _account.text.trim(), _requestId!, _matKhauMoi.text);
      await s.apDungPhienTuDangNhap(data);
      setState(() => _buoc = _BuocReset.done);
    } catch (err) {
      setState(() => _loi = 'Không đặt được mật khẩu mới.');
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final buocIndex = switch (_buoc) {
      _BuocReset.account => 0,
      _BuocReset.waiting => 1,
      _BuocReset.code => 2,
      _BuocReset.password => 3,
      _BuocReset.done => 4,
    };
    return Container(
      constraints: const BoxConstraints(maxWidth: 400),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: const Color(0xFF232B3A),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                onPressed: widget.onBack,
                icon: const Icon(Icons.arrow_back_rounded,
                    size: 19, color: Color(0xFF9AA3B2)),
              ),
              const Expanded(child: Center(child: _Brand())),
              const SizedBox(width: 40),
            ],
          ),
          const SizedBox(height: 18),
          // Progress 4 đoạn
          Row(
            children: [
              for (var i = 0; i < 4; i++) ...[
                Expanded(
                  child: Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: i < buocIndex
                          ? const Color(0xFF34C77B)
                          : i == buocIndex
                              ? const Color(0xFF5B4DFF)
                              : const Color(0xFF39445A),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                if (i < 3) const SizedBox(width: 6),
              ],
            ],
          ),
          const SizedBox(height: 18),
          Text(_tieuDe[_buoc]!,
              style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  color: Colors.white)),
          const SizedBox(height: 4),
          Text(_moTa[_buoc]!,
              style:
                  const TextStyle(fontSize: 13, color: Color(0xFF9AA3B2))),
          const SizedBox(height: 18),
          if (_loi != null) _LoiBox(_loi!),
          ...switch (_buoc) {
            _BuocReset.account => [
                _TextField(
                    controller: _account,
                    label: 'Tài khoản',
                    hint: 'Nhập tài khoản đăng nhập',
                    enabled: !_dangXuLy),
                const SizedBox(height: 8),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                      '• Quản lý duyệt yêu cầu và gửi mã 6 số cho bạn\n• Mã có hạn — dùng ngay khi nhận được',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF8FA0C0))),
                ),
                const SizedBox(height: 16),
                _NutChinh(
                    label: 'Gửi yêu cầu',
                    enabled: _account.text.trim().isNotEmpty,
                    loading: _dangXuLy,
                    icon: Icons.send_outlined,
                    onTap: _guiYeuCau),
              ],
            _BuocReset.waiting => [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                      color: const Color(0xFF1B2333),
                      borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule_rounded,
                          size: 22, color: Color(0xFFF0B429)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Đang chờ duyệt',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFFF0B429))),
                            const SizedBox(height: 4),
                            Text('@${_account.text.trim()}',
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _NutChinh(
                    label: 'Tôi đã có mã',
                    enabled: true,
                    icon: Icons.key_rounded,
                    onTap: () => setState(() {
                          _loi = null;
                          _buoc = _BuocReset.code;
                        })),
                const SizedBox(height: 8),
                _NutPhu(
                    _dangXuLy ? 'Đang gửi lại...' : 'Gửi lại yêu cầu',
                    _guiYeuCau,
                    loading: _dangXuLy),
              ],
            _BuocReset.code => [
                _TextField(
                  controller: _code,
                  label: 'Mã xác thực',
                  hint: '000000',
                  enabled: !_dangXuLy,
                  keyboardType: TextInputType.number,
                  onSubmitted: (_) => _xacThucMa(),
                ),
                const SizedBox(height: 16),
                _NutChinh(
                    label: 'Xác thực mã',
                    enabled: _code.text.length == 6,
                    loading: _dangXuLy,
                    onTap: _xacThucMa),
                const SizedBox(height: 8),
                _NutPhu('Chưa có mã — quay lại',
                    () => setState(() => _buoc = _BuocReset.waiting)),
              ],
            _BuocReset.password => [
                if (_expiresAt != null)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('@${_account.text.trim()}',
                        style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF8FA0C0))),
                  ),
                const SizedBox(height: 8),
                _TextField(
                  controller: _matKhauMoi,
                  label: 'Mật khẩu mới',
                  hint: 'Ít nhất 6 ký tự',
                  obscure: true,
                  hienText: _hienMoi,
                  enabled: !_dangXuLy,
                  onEye: () => setState(() => _hienMoi = !_hienMoi),
                ),
                const SizedBox(height: 14),
                _TextField(
                  controller: _xacNhan,
                  label: 'Xác nhận mật khẩu',
                  hint: 'Nhập lại mật khẩu mới',
                  obscure: true,
                  hienText: _hienXacNhan,
                  enabled: !_dangXuLy,
                  onEye: () => setState(() => _hienXacNhan = !_hienXacNhan),
                  onSubmitted: (_) => _luuMatKhau(),
                ),
                const SizedBox(height: 16),
                _NutChinh(
                    label: 'Lưu mật khẩu mới',
                    enabled: _matKhauMoi.text.isNotEmpty &&
                        _xacNhan.text.isNotEmpty,
                    loading: _dangXuLy,
                    onTap: _luuMatKhau),
              ],
            _BuocReset.done => [
                const SizedBox(height: 8),
                const Icon(Icons.verified_user_rounded,
                    size: 46, color: Color(0xFF34C77B)),
                const SizedBox(height: 12),
                const Text('Đặt mật khẩu thành công',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white)),
                const SizedBox(height: 6),
                Text('Đã đăng nhập với phiên mới cho @${_account.text.trim()}.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 13, color: Color(0xFF9AA3B2))),
                const SizedBox(height: 18),
                _NutChinh(
                    label: 'Bắt đầu sử dụng',
                    enabled: true,
                    onTap: () {
                      if (Navigator.canPop(context)) {
                        Navigator.of(context).popUntil((r) => r.isFirst);
                      }
                    }),
              ],
          },
        ],
      ),
    );
  }
}
