// ═══════════════════════════════════════════════════════════════════════════
// LTS Surfaces — .card / .card-title / .advanced-toggle / chip / badge / stat
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../../theme/lts_tokens.dart';

class LtsCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;
  const LtsCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Container(
      decoration: BoxDecoration(
        color: color ?? p.surface,
        borderRadius: BorderRadius.circular(LtsT.rCard),
        border: Border.all(color: p.border),
        boxShadow: LtsT.shadowSm,
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

/// .card-title — 0.85rem/700 UPPERCASE accent ls .05
class LtsCardTitle extends StatelessWidget {
  final String text;
  final IconData? icon;
  final Widget? trailing;
  const LtsCardTitle(this.text, {super.key, this.icon, this.trailing});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: p.accent),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Text(text.toUpperCase(),
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: p.accent)),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// .advanced-toggle — collapsible nền surface2, đổi màu accent khi mở.
class LtsAdvancedToggle extends StatelessWidget {
  final String label;
  final bool open;
  final VoidCallback onTap;
  const LtsAdvancedToggle(
      {super.key, required this.label, required this.open, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(LtsT.rInput),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: open ? p.accent.withValues(alpha: 0.04) : p.surface2,
          borderRadius: BorderRadius.circular(LtsT.rInput),
          border: Border.all(color: open ? p.accent : p.border),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(label,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: open ? p.accent : p.muted)),
            ),
            AnimatedRotation(
              turns: open ? 0.25 : 0,
              duration: const Duration(milliseconds: 250),
              child: Icon(Icons.chevron_right_rounded,
                  size: 18, color: open ? p.accent : p.dim),
            ),
          ],
        ),
      ),
    );
  }
}

/// Nhãn phụ kiểu .form-label nhỏ trên nhóm section.
class LtsSectionLabel extends StatelessWidget {
  final String text;
  const LtsSectionLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6, top: 2),
      child: Text(text.toUpperCase(),
          style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: p.muted)),
    );
  }
}

/// Chip trạng thái (quote status, tag...) — pill nhỏ uppercase.
class LtsStatusChip extends StatelessWidget {
  final String label;
  final Color fg;
  final Color bg;
  const LtsStatusChip(
      {super.key, required this.label, required this.fg, required this.bg});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w700, color: fg, height: 1.1)),
    );
  }
}
