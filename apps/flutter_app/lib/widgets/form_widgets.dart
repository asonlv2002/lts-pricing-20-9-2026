// ═══════════════════════════════════════════════════════════════════════════
// Form widgets — section card, labeled field, number/text/chip select
// Phong cách Material 3: rounded 12, border nhẹ, padding thoáng
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Section card — icon chip + title + optional trailing + children
class SectionCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final Widget? trailing;
  final List<Widget> children;
  final EdgeInsets? padding;

  const SectionCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.trailing,
    required this.children,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = iconColor ?? scheme.primary;
    return Card(
      child: Padding(
        padding: padding ?? const EdgeInsets.fromLTRB(18, 16, 18, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, size: 18, color: color),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(title,
                          style: Theme.of(context).textTheme.titleMedium),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(subtitle!,
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 16),
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
  const LabeledField({
    super.key,
    required this.label,
    required this.child,
    this.hint,
    this.suffix,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 13, color: scheme.onSurfaceVariant),
                const SizedBox(width: 5),
              ],
              Text(label,
                  style: Theme.of(context)
                      .textTheme
                      .labelLarge
                      ?.copyWith(fontSize: 12.5)),
              if (suffix != null) ...[
                const SizedBox(width: 6),
                Text(suffix!,
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ],
          ),
          const SizedBox(height: 6),
          child,
          if (hint != null)
            Padding(
              padding: const EdgeInsets.only(top: 5, left: 2),
              child: Text(hint!,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(fontSize: 11)),
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

  String _fmt(num v) {
    if (widget.integer) return v.toInt().toString();
    final d = v.toDouble();
    if (d == d.roundToDouble()) return d.toInt().toString();
    return d.toString();
  }

  @override
  void initState() {
    super.initState();
    _c = TextEditingController(text: _fmt(widget.initial));
  }

  @override
  void didUpdateWidget(covariant NumField old) {
    super.didUpdateWidget(old);
    final newText = _fmt(widget.initial);
    if (newText != _c.text && !_focused) {
      _c.text = newText;
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
      onFocusChange: (f) => setState(() => _focused = f),
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
          final normalized = s.replaceAll(',', '.');
          final parsed = double.tryParse(normalized);
          widget.onChanged(parsed ?? 0);
        },
      ),
    );
  }
}

/// Chip select — radio giữa các giá trị, wrap auto.
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
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                  Icon(Icons.check_circle, size: 15, color: scheme.primary),
                  const SizedBox(width: 6),
                ],
                Text(o.$2,
                    style: TextStyle(
                        fontSize: 13,
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
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: value
            ? color.withValues(alpha: 0.08)
            : scheme.surfaceContainerHighest.withValues(alpha: 0.3),
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
          Switch.adaptive(value: value, onChanged: onChanged, activeThumbColor: color),
        ],
      ),
    );
  }
}
