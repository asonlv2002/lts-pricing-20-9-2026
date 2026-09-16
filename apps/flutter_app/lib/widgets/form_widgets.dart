// ═══════════════════════════════════════════════════════════════════════════
// Form widgets — section card, labeled field, number/text/chip/dropdown
// Tối ưu mobile: touch target lớn, format số VN, animation mượt
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/lts_tokens.dart';

/// Section card — mirror .card + .card-title (uppercase accent) của web.
class SectionCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final Widget? trailing;
  final List<Widget> children;
  final EdgeInsets? padding;
  final bool collapsible;
  final bool initiallyExpanded;

  const SectionCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.trailing,
    required this.children,
    this.padding,
    this.collapsible = false,
    this.initiallyExpanded = true,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final color = iconColor ?? p.accent;
    // .card-title: uppercase, 12px, w700, letterSpacing .05em, accent
    final titleStyle = TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.6,
        color: p.accent);
    final subStyle = TextStyle(fontSize: 11.5, color: p.muted, height: 1.35);

    if (collapsible) {
      return Card(
        child: Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            initiallyExpanded: initiallyExpanded,
            tilePadding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            childrenPadding: padding ?? const EdgeInsets.fromLTRB(16, 0, 16, 16),
            leading: icon != null
                ? Icon(icon, size: 16, color: color)
                : null,
            title: Text(title.toUpperCase(), style: titleStyle),
            subtitle: subtitle != null
                ? Text(subtitle!, style: subStyle)
                : null,
            trailing: trailing,
            shape: const RoundedRectangleBorder(),
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: children,
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: padding ?? const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 16, color: color),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(title.toUpperCase(), style: titleStyle),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(subtitle!, style: subStyle),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 14),
            ...children,
          ],
        ),
      ),
    );
  }
}

class LabeledField extends StatelessWidget {
  final String label;
  final Widget child;
  final String? hint;
  final String? suffix;
  final IconData? icon;
  final Widget? hintWidget;
  const LabeledField({
    super.key,
    required this.label,
    required this.child,
    this.hint,
    this.suffix,
    this.icon,
    this.hintWidget,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 13, color: p.muted),
                const SizedBox(width: 5),
              ],
              // .form-label: 10.5px w600 UPPERCASE muted ls .04em
              Text(label.toUpperCase(),
                  style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.42,
                      color: p.muted)),
              if (suffix != null) ...[
                const SizedBox(width: 6),
                Text(suffix!,
                    style: TextStyle(fontSize: 10.5, color: p.dim)),
              ],
            ],
          ),
          const SizedBox(height: 6),
          child,
          if (hint != null)
            Padding(
              padding: const EdgeInsets.only(top: 5, left: 2),
              child: Text(hint!,
                  style: TextStyle(fontSize: 11, color: p.dim, height: 1.3)),
            ),
          if (hintWidget != null)
            Padding(
              padding: const EdgeInsets.only(top: 5),
              child: hintWidget!,
            ),
        ],
      ),
    );
  }
}

class TxtField extends StatefulWidget {
  final String initial;
  final ValueChanged<String> onChanged;
  final String? hintText;
  final TextInputType keyboardType;
  final int? maxLines;
  final IconData? prefixIcon;
  const TxtField({
    super.key,
    required this.initial,
    required this.onChanged,
    this.hintText,
    this.keyboardType = TextInputType.text,
    this.maxLines = 1,
    this.prefixIcon,
  });

  @override
  State<TxtField> createState() => _TxtFieldState();
}

class _TxtFieldState extends State<TxtField> {
  late TextEditingController _c;

  @override
  void initState() {
    super.initState();
    _c = TextEditingController(text: widget.initial);
  }

  @override
  void didUpdateWidget(covariant TxtField old) {
    super.didUpdateWidget(old);
    if (widget.initial != _c.text) {
      _c.text = widget.initial;
      _c.selection = TextSelection.collapsed(offset: _c.text.length);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _c,
      decoration: InputDecoration(
        hintText: widget.hintText,
        prefixIcon: widget.prefixIcon != null
            ? Icon(widget.prefixIcon, size: 18)
            : null,
      ),
      keyboardType: widget.keyboardType,
      maxLines: widget.maxLines,
      onChanged: widget.onChanged,
    );
  }
}

/// NumField với format VN: dấu chấm ngàn khi không focus, nhập số tự nhiên khi focus
class NumField extends StatefulWidget {
  final num initial;
  final ValueChanged<double> onChanged;
  final String? suffix;
  final bool integer;
  final IconData? prefixIcon;
  const NumField({
    super.key,
    required this.initial,
    required this.onChanged,
    this.suffix,
    this.integer = false,
    this.prefixIcon,
  });

  @override
  State<NumField> createState() => _NumFieldState();
}

class _NumFieldState extends State<NumField> {
  late TextEditingController _c;
  bool _focused = false;

  String _fmtDisplay(num v) {
    if (widget.integer) {
      final n = v.toInt();
      if (n == 0) return '';
      return _addThousandDots(n.toString());
    }
    final d = v.toDouble();
    if (d == 0.0) return '';
    if (d == d.roundToDouble()) return _addThousandDots(d.toInt().toString());
    return d.toString();
  }

  String _fmtEdit(num v) {
    if (widget.integer) return v.toInt() == 0 ? '' : v.toInt().toString();
    final d = v.toDouble();
    if (d == 0.0) return '';
    if (d == d.roundToDouble()) return d.toInt().toString();
    return d.toString();
  }

  String _addThousandDots(String digits) {
    if (digits.length <= 3) return digits;
    final result = StringBuffer();
    int count = 0;
    for (int i = digits.length - 1; i >= 0; i--) {
      if (count > 0 && count % 3 == 0) result.write('.');
      result.write(digits[i]);
      count++;
    }
    return result.toString().split('').reversed.join();
  }

  @override
  void initState() {
    super.initState();
    _c = TextEditingController(text: _fmtDisplay(widget.initial));
  }

  @override
  void didUpdateWidget(covariant NumField old) {
    super.didUpdateWidget(old);
    if (!_focused) {
      final newText = _fmtDisplay(widget.initial);
      if (newText != _c.text) _c.text = newText;
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (f) {
        setState(() => _focused = f);
        if (f) {
          // khi vào focus: hiện số thuần không có dấu chấm ngàn
          final editText = _fmtEdit(widget.initial);
          _c.text = editText;
          _c.selection = TextSelection(
              baseOffset: 0, extentOffset: editText.length);
        } else {
          // khi rời focus: format lại có dấu chấm ngàn
          // QUAN TRỌNG: integer mode -> '.' là dấu ngàn -> xóa hết
          //             decimal mode -> '.' là thập phân -> giữ dấu '.' cuối,
          //             chỉ xóa các '.' phía trước (nếu user lỡ format ngàn)
          final raw = _c.text.replaceAll(',', '.');
          double parsed;
          if (widget.integer) {
            parsed = double.tryParse(raw.replaceAll('.', '')) ?? 0;
          } else {
            // Giữ dấu '.' cuối cùng (thập phân), xóa các '.' phía trước
            final lastDot = raw.lastIndexOf('.');
            if (lastDot < 0) {
              parsed = double.tryParse(raw) ?? 0;
            } else {
              final intPart =
                  raw.substring(0, lastDot).replaceAll('.', '');
              final decPart = raw.substring(lastDot + 1);
              parsed = double.tryParse(
                      decPart.isEmpty ? intPart : '$intPart.$decPart') ??
                  0;
            }
          }
          widget.onChanged(parsed);
          _c.text = _fmtDisplay(parsed);
        }
      },
      child: TextField(
        controller: _c,
        decoration: InputDecoration(
          suffixText: widget.suffix,
          prefixIcon: widget.prefixIcon != null
              ? Icon(widget.prefixIcon, size: 18)
              : null,
          isDense: true,
        ),
        keyboardType: TextInputType.numberWithOptions(
            decimal: !widget.integer, signed: false),
        inputFormatters: [
          FilteringTextInputFormatter.allow(
              RegExp(widget.integer ? r'^\d*' : r'^[\d.,]*')),
        ],
        onChanged: (s) {
          // Khi đang gõ (focused): chỉ thay ',' thành '.', không động vào dấu '.'
          final normalized = s.replaceAll(',', '.');
          final parsed = double.tryParse(normalized);
          widget.onChanged(parsed ?? 0);
        },
      ),
    );
  }
}

/// Dropdown dùng cho danh sách tuỳ chọn — native và mobile-friendly
class DropdownField<T> extends StatelessWidget {
  final List<(T? value, String label)> options;
  final T? selected;
  final ValueChanged<T?> onChanged;
  final String? hintText;
  final bool enabled;
  const DropdownField({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
    this.hintText,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Chỉ giữ item có value duy nhất (tránh assertion "exactly one item")
    final seen = <T?>{};
    final uniqueOptions = <(T?, String)>[];
    for (final o in options) {
      if (seen.add(o.$1)) uniqueOptions.add(o);
    }
    // Nếu selected không khớp option nào → coi như null để tránh vỡ assertion
    final matchCount = uniqueOptions.where((o) => o.$1 == selected).length;
    final safeSelected = matchCount == 1 ? selected : null;

    return DropdownButtonFormField<T>(
      value: safeSelected,
      isExpanded: true,
      decoration: InputDecoration(
        hintText: hintText,
        enabled: enabled,
        filled: true,
        fillColor: enabled
            ? null
            : scheme.surfaceContainerHighest.withValues(alpha: 0.2),
      ),
      items: uniqueOptions
          .map((o) => DropdownMenuItem<T>(
                value: o.$1,
                child: Text(o.$2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 14,
                        color: o.$1 == null
                            ? scheme.onSurfaceVariant
                            : scheme.onSurface)),
              ))
          .toList(),
      onChanged: enabled ? onChanged : null,
    );
  }
}

/// Chip select — radio giữa các giá trị, wrap auto. Tối ưu kích cỡ touch target.
class ChipSelect<T> extends StatelessWidget {
  final List<(T value, String label)> options;
  final T selected;
  final ValueChanged<T> onChanged;
  const ChipSelect({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((o) {
        final isSelected = o.$1 == selected;
        return InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => onChanged(o.$1),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              color: isSelected
                  ? scheme.primary.withValues(alpha: 0.12)
                  : scheme.surfaceContainerHighest.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isSelected
                    ? scheme.primary
                    : scheme.outlineVariant.withValues(alpha: 0.5),
                width: isSelected ? 1.5 : 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isSelected) ...[
                  Icon(Icons.check_circle, size: 14, color: scheme.primary),
                  const SizedBox(width: 5),
                ],
                Text(o.$2,
                    style: TextStyle(
                        fontSize: 13.5,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected
                            ? scheme.primary
                            : scheme.onSurface)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

/// Section toggle card — thay cho SwitchListTile để gọn hơn
class ToggleTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;
  final Color? accent;
  const ToggleTile({
    super.key,
    required this.title,
    this.subtitle,
    required this.icon,
    required this.value,
    required this.onChanged,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = accent ?? scheme.primary;
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: value
              ? color.withValues(alpha: 0.08)
              : scheme.surfaceContainerHighest.withValues(alpha: 0.25),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: value
                  ? color.withValues(alpha: 0.35)
                  : scheme.outlineVariant.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 18, color: value ? color : scheme.onSurfaceVariant),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title,
                      style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: scheme.onSurface)),
                  if (subtitle != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(subtitle!,
                          style: Theme.of(context).textTheme.bodySmall),
                    ),
                ],
              ),
            ),
            Switch.adaptive(
                value: value,
                onChanged: onChanged,
                activeThumbColor: color),
          ],
        ),
      ),
    );
  }
}

/// Highlight info box
class InfoBox extends StatelessWidget {
  final String text;
  final Color color;
  final IconData icon;
  const InfoBox(
      {super.key,
      required this.text,
      required this.color,
      this.icon = Icons.info_outline});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: color)),
          ),
        ],
      ),
    );
  }
}

/// Warning chip hiển thị validation
class WarningText extends StatelessWidget {
  final String text;
  const WarningText(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded,
              size: 13, color: Color(0xFFD97706)),
          const SizedBox(width: 4),
          Text(text,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFFD97706))),
        ],
      ),
    );
  }
}

/// CheckboxRow — compact checkbox cho các option phụ
class CheckboxRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  final Color? color;
  const CheckboxRow({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final c = color ?? scheme.primary;
    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: Checkbox(
                value: value,
                onChanged: (v) => onChanged(v ?? false),
                activeColor: c,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
            ),
            const SizedBox(width: 8),
            Text(label,
                style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w500,
                    color: scheme.onSurface)),
          ],
        ),
      ),
    );
  }
}
