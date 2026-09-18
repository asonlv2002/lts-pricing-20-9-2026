// ═══════════════════════════════════════════════════════════════════════════
// NhapMaPin — mirror auth/NhapMaPin.tsx: 6 ô riêng biệt, mỗi ô 1 chữ số,
// tự nhảy ô kế tiếp, backspace lùi ô, paste phân rã, lỗi → viền đỏ + focus ô 1.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class NhapMaPin extends StatefulWidget {
  final ValueChanged<String> onChange;
  final bool disabled;
  final bool autoFocus;
  final bool error;
  final ValueChanged<String>? onEnter;
  const NhapMaPin({
    super.key,
    required this.onChange,
    this.disabled = false,
    this.autoFocus = false,
    this.error = false,
    this.onEnter,
  });

  @override
  State<NhapMaPin> createState() => _NhapMaPinState();
}

class _NhapMaPinState extends State<NhapMaPin> {
  static const _soO = 6;
  final _controllers = List.generate(_soO, (_) => TextEditingController());
  final _focusNodes = List.generate(_soO, (_) => FocusNode());
  String _prevValue = '';

  String get _value => _controllers.map((c) => c.text).join();

  @override
  void initState() {
    super.initState();
    if (widget.autoFocus && !widget.disabled) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _focusNodes[0].requestFocus();
      });
    }
  }

  @override
  void didUpdateWidget(covariant NhapMaPin oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Parent clear PIN hoặc bật lỗi → xóa hết + focus ô 1.
    if ((widget.error && !oldWidget.error) ||
        (widget.onChange != oldWidget.onChange)) {
      // no-op — chỉ theo dõi
    }
  }

  /// Parent set value rỗng (sau khi có giá trị) → clear các ô.
  void clear() {
    for (final c in _controllers) {
      c.clear();
    }
    if (!widget.disabled) _focusNodes[0].requestFocus();
  }

  void _capNhat(int index, String raw) {
    // Paste / gõ nhiều ký tự → phân rã vào các ô từ vị trí index.
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) {
      _controllers[index].clear();
      widget.onChange(_value);
      return;
    }
    var pos = index;
    for (var i = 0; i < digits.length && pos < _soO; i++, pos++) {
      _controllers[pos].text = digits[i];
    }
    final cuoi = (pos - 1).clamp(0, _soO - 1);
    _focusNodes[cuoi].requestFocus();
    final v = _value;
    widget.onChange(v);
    if (RegExp(r'^\d{6}$').hasMatch(v) && v != _prevValue) {
      _prevValue = v;
    }
  }

  void _xuLyPhim(int index, KeyEvent event) {
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.backspace &&
        _controllers[index].text.isEmpty &&
        index > 0) {
      _controllers[index - 1].clear();
      _focusNodes[index - 1].requestFocus();
      widget.onChange(_value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final borderMau = widget.error
        ? const Color(0xFFDC2626)
        : const Color(0xFFD5D9E0);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        for (var i = 0; i < _soO; i++)
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(right: i < _soO - 1 ? 8 : 0),
              child: KeyboardListener(
                focusNode: FocusNode(skipTraversal: true),
                onKeyEvent: (e) => _xuLyPhim(i, e),
                child: TextField(
                  controller: _controllers[i],
                  focusNode: _focusNodes[i],
                  enabled: !widget.disabled,
                  obscureText: true,
                  obscuringCharacter: '●',
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(1),
                  ],
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w700),
                  onChanged: (v) => _capNhat(i, v),
                  onSubmitted: (_) {
                    final full = _value;
                    if (RegExp(r'^\d{6}$').hasMatch(full) &&
                        !widget.disabled) {
                      widget.onEnter?.call(full);
                    }
                  },
                  decoration: InputDecoration(
                    counterText: '',
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    filled: true,
                    fillColor: Colors.white,
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: borderMau)),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(
                            color: widget.error
                                ? const Color(0xFFDC2626)
                                : const Color(0xFF5B4DFF),
                            width: 1.6)),
                    disabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide:
                            const BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }
}
