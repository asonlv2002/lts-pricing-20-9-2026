// ═══════════════════════════════════════════════════════════════════════════
// LTS Forms — mirror .form-label / .form-input / .form-row / .form-row-3
// và select dạng bottom-sheet (mobile-native thay cho <select>).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../theme/lts_tokens.dart';

/// .form-label + control. Nhãn uppercase muted, input chiếm chiều ngang.
class LtsField extends StatelessWidget {
  final String label;
  final Widget child;
  final String? hint;
  final Widget? trailing;
  const LtsField({
    super.key,
    required this.label,
    required this.child,
    this.hint,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(label.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.42,
                        color: p.muted)),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 4),
          child,
          if (hint != null)
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 1),
              child: Text(hint!,
                  style: TextStyle(fontSize: 11, color: p.dim, height: 1.3)),
            ),
        ],
      ),
    );
  }
}

/// .form-row — 2 cột gap 10
class LtsRow2 extends StatelessWidget {
  final List<Widget> children;
  const LtsRow2(this.children, {super.key});
  @override
  Widget build(BuildContext context) {
    if (children.length == 1) return children.first;
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Expanded(child: children[0]),
      const SizedBox(width: 10),
      Expanded(child: children[1]),
    ]);
  }
}

/// .form-row-3 — 3 cột gap 10
class LtsRow3 extends StatelessWidget {
  final List<Widget> children;
  const LtsRow3(this.children, {super.key});
  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) const SizedBox(width: 10),
          Expanded(child: children[i]),
        ],
      ],
    );
  }
}

/// TextField kiểu web (số VN khi blur). Giữ API đơn giản cho màn mới.
class LtsNumberField extends StatefulWidget {
  final num value;
  final ValueChanged<double> onChanged;
  final String? suffixText;
  final bool integer;
  final VoidCallback? onTapView;
  const LtsNumberField({
    super.key,
    required this.value,
    required this.onChanged,
    this.suffixText,
    this.integer = false,
    this.onTapView,
  });

  @override
  State<LtsNumberField> createState() => _LtsNumberFieldState();
}

class _LtsNumberFieldState extends State<LtsNumberField> {
  late TextEditingController _c;
  bool _focused = false;

  String _disp(num v) {
    if (widget.integer) {
      final n = v.toInt();
      if (n == 0) return '';
      return _grp(n.toString());
    }
    final d = v.toDouble();
    if (d == 0.0) return '';
    if (d == d.roundToDouble()) return _grp(d.toInt().toString());
    return d.toString();
  }

  String _grp(String s) {
    if (s.length <= 3) return s;
    final sb = StringBuffer();
    var c = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      if (c > 0 && c % 3 == 0) sb.write('.');
      sb.write(s[i]);
      c++;
    }
    return sb.toString().split('').reversed.join();
  }

  @override
  void initState() {
    super.initState();
    _c = TextEditingController(text: _disp(widget.value));
  }

  @override
  void didUpdateWidget(covariant LtsNumberField old) {
    super.didUpdateWidget(old);
    if (!_focused) {
      final t = _disp(widget.value);
      if (t != _c.text) _c.text = t;
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  double _parse(String raw) {
    if (widget.integer) {
      return double.tryParse(raw.replaceAll('.', '').replaceAll(',', '')) ?? 0;
    }
    final dot = raw.lastIndexOf('.');
    if (dot < 0) return double.tryParse(raw) ?? 0;
    final i = raw.substring(0, dot).replaceAll('.', '');
    final d = raw.substring(dot + 1);
    return double.tryParse(d.isEmpty ? i : '$i.$d') ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (f) {
        setState(() => _focused = f);
        if (!f) {
          final v = _parse(_c.text);
          widget.onChanged(v);
          _c.text = _disp(v);
        }
      },
      child: TextField(
        controller: _c,
        decoration: InputDecoration(
          suffixText: widget.suffixText,
          isDense: true,
        ),
        keyboardType: TextInputType.numberWithOptions(decimal: !widget.integer),
        inputFormatters: [
          FilteringTextInputFormatter.allow(
              RegExp(widget.integer ? r'^\d*' : r'^[\d.,]*')),
        ],
        onChanged: (s) {
          widget.onChanged(_parse(s));
        },
      ),
    );
  }
}

/// Select mở bottom-sheet (thay dropdown native) — đúng cảm giác mobile web.
class LtsSelectField<T> extends StatelessWidget {
  final List<(T value, String label)> options;
  final T? value;
  final ValueChanged<T> onChanged;
  final String? placeholder;
  const LtsSelectField({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final sel = options.where((o) => o.$1 == value).firstOrNull;
    return InkWell(
      borderRadius: BorderRadius.circular(LtsT.rInput),
      onTap: () async {
        final chosen = await showLtsSelectSheet<T>(context,
            options: options, selected: value, title: placeholder);
        if (chosen != null) onChanged(chosen);
      },
      child: Container(
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: p.inputBg,
          borderRadius: BorderRadius.circular(LtsT.rInput),
          border: Border.all(color: p.border),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                sel?.$2 ?? placeholder ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 12.5,
                    color: sel == null ? p.dim : p.text,
                    fontWeight:
                        sel == null ? FontWeight.w400 : FontWeight.w500),
              ),
            ),
            Icon(Icons.expand_more_rounded, size: 18, color: p.muted),
          ],
        ),
      ),
    );
  }
}

Future<T?> showLtsSelectSheet<T>(
  BuildContext context, {
  required List<(T, String)> options,
  required T? selected,
  String? title,
}) {
  return showGeneralDialog<T>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'select',
    barrierColor: Colors.black.withValues(alpha: 0.45),
    transitionDuration: const Duration(milliseconds: 240),
    pageBuilder: (_, __, ___) =>
        _SelectSheet<T>(options: options, selected: selected, title: title),
  );
}

class _SelectSheet<T> extends StatelessWidget {
  final List<(T, String)> options;
  final T? selected;
  final String? title;
  const _SelectSheet(
      {required this.options, required this.selected, this.title});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: EdgeInsets.only(left: 8, right: 8, bottom: 8 + bottom),
        child: Material(
          color: Colors.transparent,
          child: Container(
            constraints: BoxConstraints(
                maxHeight: MediaQuery.sizeOf(context).height * 0.7),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(LtsT.rSheet),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _Grabber(),
                if (title != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(title!,
                              style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: p.text)),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: Icon(Icons.close_rounded,
                              size: 20, color: p.muted),
                        ),
                      ],
                    ),
                  ),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.only(bottom: 12),
                    itemCount: options.length,
                    separatorBuilder: (_, __) =>
                        Divider(height: 1, thickness: 1, color: p.border),
                    itemBuilder: (_, i) {
                      final o = options[i];
                      final active = o.$1 == selected;
                      return ListTile(
                        dense: true,
                        title: Text(o.$2,
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight:
                                    active ? FontWeight.w700 : FontWeight.w500,
                                color: active ? p.accent : p.text)),
                        trailing: active
                            ? Icon(Icons.check_rounded,
                                size: 20, color: p.accent)
                            : null,
                        onTap: () => Navigator.pop(context, o.$1),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Grabber extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10),
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: p.border,
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}
