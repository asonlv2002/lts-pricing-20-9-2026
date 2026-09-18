// ═══════════════════════════════════════════════════════════════════════════
// LtsToast — top-right portal toast khớp web `hienToast` (mirrors `hienToast`).
// Variants: success | error | warning | info. Auto-dismiss 3s. Slide từ phải.
// Dùng Overlay qua MaterialApp.builder → luôn trên cùng, kể cả modal/sheet.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/lts_tokens.dart';

enum LtsToastType { success, error, warning, info }

class LtsToast {
  static OverlayEntry? _current;
  static Timer? _timer;

  static void show(
    BuildContext context,
    String message, {
    LtsToastType type = LtsToastType.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    _current?.remove();
    _timer?.cancel();

    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;

    final entry = OverlayEntry(
      builder: (ctx) => _LtsToastWidget(
        message: message,
        type: type,
        onDismiss: () {
          _current?.remove();
          _current = null;
        },
      ),
    );
    _current = entry;
    overlay.insert(entry);
    _timer = Timer(duration, () {
      _current?.remove();
      _current = null;
    });
  }

  static void dismiss() {
    _timer?.cancel();
    _current?.remove();
    _current = null;
  }
}

class _LtsToastWidget extends StatefulWidget {
  final String message;
  final LtsToastType type;
  final VoidCallback onDismiss;
  const _LtsToastWidget({
    required this.message,
    required this.type,
    required this.onDismiss,
  });

  @override
  State<_LtsToastWidget> createState() => _LtsToastWidgetState();
}

class _LtsToastWidgetState extends State<_LtsToastWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 240),
  )..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final top = MediaQuery.paddingOf(context).top;
    final (color, icon) = switch (widget.type) {
      LtsToastType.success => (p.green, Icons.check_circle_rounded),
      LtsToastType.error => (p.red, Icons.error_rounded),
      LtsToastType.warning => (p.orange, Icons.warning_amber_rounded),
      LtsToastType.info => (p.accent, Icons.info_rounded),
    };

    return Positioned(
      top: top + 12,
      right: 12,
      left: 12,
      child: IgnorePointer(
        ignoring: false,
        child: SlideTransition(
          position: Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero)
              .animate(CurvedAnimation(parent: _c, curve: Curves.easeOutCubic)),
          child: FadeTransition(
            opacity: _c,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: widget.onDismiss,
                child: Container(
                  constraints: const BoxConstraints(minHeight: 52),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: color.withValues(alpha: 0.4)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.12),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.14),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(icon, color: color, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          widget.message,
                          style: TextStyle(
                            color: p.text,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            height: 1.35,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close_rounded,
                            size: 16, color: p.muted),
                        onPressed: widget.onDismiss,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
