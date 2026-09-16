// ═══════════════════════════════════════════════════════════════════════════
// LTS Overlay — SheetBottom.tsx (grabber + backdrop), .mobile-calc-nav pill,
// .mini-price-strip.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';

import 'package:flutter/material.dart';

import '../../theme/lts_tokens.dart';

/// Mở bottom-sheet kiểu web (SheetBottom): backdrop .45, slide-up 240ms,
/// grabber 40x4, radius top 24, có title + nút đóng.
Future<T?> showLtsSheet<T>(
  BuildContext context, {
  required Widget Function(BuildContext) builder,
  String? title,
  bool isScrollControlled = true,
}) {
  final p = LtsT.of(context);
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: isScrollControlled,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.45),
    builder: (ctx) {
      final bottom = MediaQuery.paddingOf(ctx).bottom;
      return Padding(
        padding: EdgeInsets.only(left: 8, right: 8, bottom: 8 + bottom),
        child: Material(
          color: Colors.transparent,
          child: Container(
            constraints: BoxConstraints(
                maxHeight: MediaQuery.sizeOf(ctx).height * 0.88),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(LtsT.rSheet),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: p.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                if (title != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 2, 8, 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(title,
                              style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: p.text)),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: Icon(Icons.close_rounded, size: 20, color: p.muted),
                        ),
                      ],
                    ),
                  ),
                Flexible(child: builder(ctx)),
              ],
            ),
          ),
        ),
      );
    },
  );
}

/// .mobile-calc-nav — pill 2 tab "Nhập liệu | Kết quả" (260x40, radius 999).
class LtsPillNav extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onSelect;
  final bool showResultBadge;
  const LtsPillNav({
    super.key,
    required this.selected,
    required this.onSelect,
    this.showResultBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Center(
      child: Container(
        width: 260,
        height: 40,
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: p.border),
          boxShadow: LtsT.pillShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            _PillTab(
                label: 'Nhập liệu',
                icon: Icons.edit_note_rounded,
                active: selected == 0,
                onTap: () => onSelect(0)),
            Container(width: 1, height: 40, color: p.border),
            _PillTab(
                label: 'Kết quả',
                icon: Icons.query_stats_rounded,
                active: selected == 1,
                badge: selected == 1 ? showResultBadge : false,
                onTap: () => onSelect(1)),
          ],
        ),
      ),
    );
  }
}

class _PillTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final bool badge;
  final VoidCallback onTap;
  const _PillTab(
      {required this.label,
      required this.icon,
      required this.active,
      required this.onTap,
      this.badge = false});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon,
                    size: 14,
                    color: active ? p.accent : p.muted),
                const SizedBox(height: 2),
                Text(label,
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                        color: active ? p.accent : p.muted)),
              ],
            ),
            if (badge) const _PulseDot(),
            if (active)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    width: 40,
                    height: 2,
                    decoration: BoxDecoration(
                        color: p.accent,
                        borderRadius: BorderRadius.circular(2)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _PulseDot extends StatefulWidget {
  const _PulseDot();
  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 1000))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Positioned(
      top: 8,
      right: 36,
      child: ScaleTransition(
        scale: Tween(begin: 1.0, end: 1.35).animate(
            CurvedAnimation(parent: _c, curve: Curves.easeInOut)),
        child: FadeTransition(
          opacity: Tween(begin: 1.0, end: 0.8).animate(_c),
          child: Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: p.green, shape: BoxShape.circle),
          ),
        ),
      ),
    );
  }
}

/// .mini-price-strip — strip gradient tóm tắt giá, tap → sang pane Kết quả.
class LtsMiniPriceStrip extends StatefulWidget {
  final String priceText;
  final String? profitText;
  final String? rightNote;
  final VoidCallback? onTap;
  const LtsMiniPriceStrip({
    super.key,
    required this.priceText,
    this.profitText,
    this.rightNote,
    this.onTap,
  });

  @override
  State<LtsMiniPriceStrip> createState() => _LtsMiniPriceStripState();
}

class _LtsMiniPriceStripState extends State<LtsMiniPriceStrip>
    with SingleTickerProviderStateMixin {
  bool _pressed = false;
  late final AnimationController _in =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 300))
        ..forward();

  @override
  void dispose() {
    _in.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final dy = Tween(begin: -8.0, end: 0.0).animate(CurvedAnimation(
        parent: _in, curve: Curves.easeOutBack));
    return AnimatedBuilder(
      animation: _in,
      builder: (context, _) => Opacity(
        opacity: _in.value.clamp(0.0, 1.0),
        child: Transform.translate(
          offset: Offset(0, dy.value),
          child: GestureDetector(
          onTapDown: (_) => setState(() => _pressed = true),
          onTapUp: (_) => setState(() => _pressed = false),
          onTapCancel: () => setState(() => _pressed = false),
          onTap: widget.onTap,
          child: AnimatedScale(
            scale: _pressed ? 1.01 : 1.0,
            duration: const Duration(milliseconds: 150),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                gradient: LtsT.miniStrip(p),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: p.accent.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ĐƠN GIÁ / SẢN PHẨM',
                            style: TextStyle(
                                fontSize: 8,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.5,
                                color: p.muted)),
                        ShaderMask(
                          shaderCallback: (rect) => LinearGradient(
                            colors: [p.accent, p.accent2],
                          ).createShader(rect),
                          child: Text(
                            widget.priceText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (widget.profitText != null)
                        Text(widget.profitText!,
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: p.green)),
                      if (widget.rightNote != null)
                        Text(widget.rightNote!,
                            style: TextStyle(fontSize: 10, color: p.muted)),
                      Text('Xem chi tiết ›',
                          style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                              color: p.accent)),
                    ],
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
