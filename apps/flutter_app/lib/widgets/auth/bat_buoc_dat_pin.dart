// ═══════════════════════════════════════════════════════════════════════════
// BatBuocDatPin — mirror auth/BatBuocDatPin.tsx: sau đăng nhập, tài khoản
// chưa đặt PIN → toàn màn hình yêu cầu đặt PIN 6 số (không đóng, chỉ đăng xuất).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/service_lts_client.dart';
import '../../store/app_state.dart';
import 'nhap_ma_pin.dart';

class BatBuocDatPin extends StatefulWidget {
  const BatBuocDatPin({super.key});

  @override
  State<BatBuocDatPin> createState() => _BatBuocDatPinState();
}

class _BatBuocDatPinState extends State<BatBuocDatPin> {
  final _matKhau = TextEditingController();
  String _pinMoi = '';
  String _xacNhan = '';
  bool _dangXuLy = false;
  String? _loi;

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
      // hasPin=true → HomeShell tự trả về UI chính.
    } catch (err) {
      setState(() => _loi = err is LoiServiceLts ? err.message : 'Đặt mã PIN thất bại.');
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: const Color(0xFF0B1220),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Container(
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
                    const Center(
                      child: Row(
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
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.verified_user_outlined,
                            size: 15, color: Color(0xFF34C77B)),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                              'Bạn cần đặt mã PIN 6 số trước khi sử dụng hệ thống',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 13, color: Color(0xFF9AA3B2))),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _matKhau,
                      obscureText: true,
                      enabled: !_dangXuLy,
                      style: const TextStyle(
                          fontSize: 14.5, color: Color(0xFF111827)),
                      decoration: InputDecoration(
                        labelText: 'Mật khẩu hiện tại',
                        labelStyle: const TextStyle(
                            fontSize: 13, color: Color(0xFF374151)),
                        hintText: 'Nhập mật khẩu',
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 12),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide:
                                const BorderSide(color: Color(0xFFD5D9E0))),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(
                                color: Color(0xFF5B4DFF))),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Mã PIN mới (6 số)',
                          style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF374151))),
                    ),
                    const SizedBox(height: 6),
                    NhapMaPin(
                        onChange: (v) => setState(() => _pinMoi = v),
                        disabled: _dangXuLy),
                    const SizedBox(height: 14),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Nhập lại mã PIN',
                          style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF374151))),
                    ),
                    const SizedBox(height: 6),
                    NhapMaPin(
                        onChange: (v) => setState(() => _xacNhan = v),
                        disabled: _dangXuLy),
                    if (_loi != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFDF2F2),
                          border:
                              Border.all(color: const Color(0xFFF3C1C1)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_loi!,
                            style: const TextStyle(
                                fontSize: 13, color: Color(0xFFB42318))),
                      ),
                    ],
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF5B4DFF),
                          disabledBackgroundColor: const Color(0xFFB9B2FF),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _dangXuLy ||
                                _matKhau.text.isEmpty ||
                                !RegExp(r'^\d{6}$').hasMatch(_pinMoi) ||
                                _pinMoi != _xacNhan
                            ? null
                            : _xuLyLuu,
                        child: _dangXuLy
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : const Text('Lưu mã PIN',
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700)),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 42,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF8A8F98),
                          side: const BorderSide(color: Color(0xFFD5D9E0)),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _dangXuLy
                            ? null
                            : () => context.read<AppState>().dangXuat(),
                        child: const Text('Đăng xuất',
                            style: TextStyle(fontSize: 13.5)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
