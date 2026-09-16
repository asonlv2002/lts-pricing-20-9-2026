// ═══════════════════════════════════════════════════════════════════════════
// LTS Chrome — mirror các khối vỏ của web mobile (globals.css):
//   .lts-mobile-tabbar / .lts-mobile-hub-header / .lts-mobile-module-header /
//   .lts-mobile-action-card / .lts-mobile-icon-box
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../../theme/lts_tokens.dart';

// ── Tab bar dưới: .lts-mobile-tabbar (fixed, 5 cột, radius 22 22 0 0) ────────
class LtsTabItem {
  final String label;
  final IconData icon;
  const LtsTabItem(this.label, this.icon);
}

class LtsTabBar extends StatelessWidget {
  final List<LtsTabItem> items;
  final int selected;
  final ValueChanged<int> onSelect;
  const LtsTabBar({
    super.key,
    required this.items,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Material(
      color: Colors.transparent,
      child: SafeArea(
        top: false,
        minimum: const EdgeInsets.only(left: 8, right: 8),
        child: Container(
          decoration: BoxDecoration(
            color: p.surface,
            borderRadius: const BorderRadius.vertical(
                top: Radius.circular(LtsT.rHeader)),
            boxShadow: LtsT.tabShadow,
          ),
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
          child: Row(
            children: [
              for (var i = 0; i < items.length; i++)
                Expanded(
                  child: _Tab(
                    item: items[i],
                    active: i == selected,
                    onTap: () => onSelect(i),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  final LtsTabItem item;
  final bool active;
  final VoidCallback onTap;
  const _Tab({required this.item, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final color = active ? p.hubAccent : const Color(0xFF6B7280);
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: SizedBox(
        height: 56,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon,
                size: 22,
                color: color,
                weight: active ? 720 : 480),
            const SizedBox(height: 4),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Header navy ──────────────────────────────────────────────────────────────
// hub variant   : min 112px, h1 18/800 left, radius 0 0 22 22
// module variant: min 70px, grid back | title(16 centered) | action
class LtsNavyHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  final Widget? leading; // module: nút back; hub: menu tròn
  final Widget? action; // module/hub: primary pill...
  final bool hub;
  const LtsNavyHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.action,
    this.hub = false,
  });

  @override
  Size get preferredSize => Size.fromHeight(hub ? 112 : 70);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LtsT.navyBg,
        borderRadius: BorderRadius.vertical(
            bottom: Radius.circular(hub ? LtsT.rHeader : LtsT.rCardMobile)),
        boxShadow: LtsT.navyHeaderShadow,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.vertical(
            bottom: Radius.circular(hub ? LtsT.rHeader : LtsT.rCardMobile)),
        child: Stack(
          children: [
            Positioned.fill(child: DecoratedBox(decoration: LtsT.navyGlowOverlay)),
            SafeArea(
              bottom: false,
              minimum: EdgeInsets.fromLTRB(hub ? 24 : 12, 12, hub ? 24 : 12, hub ? 24 : 12),
              child: hub
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 40),
                        Text(title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.18,
                                color: Colors.white)),
                        if (subtitle != null) ...[
                          const SizedBox(height: 4),
                          Text(subtitle!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white.withValues(alpha: 0.75))),
                        ],
                        const SizedBox(height: 4),
                      ],
                    )
                  : Row(
                      children: [
                        SizedBox(
                            width: 64,
                            child: leading != null
                                ? Align(alignment: Alignment.centerLeft, child: leading)
                                : null),
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(title,
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.16,
                                      color: Colors.white)),
                              if (subtitle != null)
                                Text(subtitle!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        color:
                                            Colors.white.withValues(alpha: 0.72))),
                            ],
                          ),
                        ),
                        SizedBox(
                            width: 64,
                            child: action != null
                                ? Align(alignment: Alignment.centerRight, child: action)
                                : null),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Nút tròn 44px trên header navy (rgba(255,255,255,.08)).
class LtsHeaderCircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final String? tooltip;
  const LtsHeaderCircleButton(
      {super.key, required this.icon, this.onTap, this.tooltip});

  @override
  Widget build(BuildContext context) {
    final btn = InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.08),
        ),
        child: Icon(icon, size: 20, color: Colors.white),
      ),
    );
    return tooltip == null ? btn : Tooltip(message: tooltip!, child: btn);
  }
}

/// Pill CTA gradient trên header navy (#5b4dff→#7c3aed).
class LtsHeaderPillAction extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  const LtsHeaderPillAction({super.key, required this.label, this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 44,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          gradient: LtsT.primaryPill,
          borderRadius: BorderRadius.circular(999),
          boxShadow: LtsT.primaryPillShadow,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16, color: Colors.white),
              const SizedBox(width: 6),
            ],
            Text(label,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

// ── Hub icon box 56px (6 biến thể màu web) ───────────────────────────────────
class LtsIconBox extends StatelessWidget {
  final IconData icon;
  final LtsIconVariant variant;
  const LtsIconBox({super.key, required this.icon, required this.variant});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: LtsT.iconBoxBg(variant),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(icon, size: 26, color: LtsT.iconBoxFg(variant)),
    );
  }
}

// ── Action card hub: 108px, icon 56 + title 17/800 + sub 13 + chevron/lock ───
class LtsActionCard extends StatelessWidget {
  final LtsIconBox iconBox;
  final String title;
  final String? subtitle;
  final bool locked;
  final VoidCallback? onTap;
  const LtsActionCard({
    super.key,
    required this.iconBox,
    required this.title,
    this.subtitle,
    this.locked = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Opacity(
      opacity: locked ? 0.88 : 1,
      child: GestureDetector(
        onTap: locked ? null : onTap,
        child: AnimatedScale(
          duration: const Duration(milliseconds: 160),
          scale: 1,
          child: Container(
            constraints: const BoxConstraints(minHeight: 108),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(LtsT.rCardMobile),
              border: Border.all(
                  color: locked
                      ? p.border
                      : Colors.black.withValues(alpha: 0.04)),
              boxShadow: locked
                  ? const [
                      BoxShadow(color: Color(0x0A0F172A), blurRadius: 10, offset: Offset(0, 4))
                    ]
                  : LtsT.hubCard,
            ),
            child: Row(
              children: [
                iconBox,
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              height: 1.2,
                              color: p.text)),
                      if (subtitle != null) ...[
                        const SizedBox(height: 5),
                        Text(subtitle!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                height: 1.45,
                                color: const Color(0xFF6B7280))),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                if (locked)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('Khóa',
                        style: TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w800,
                            color: Color(0xFF64748B))),
                  )
                else
                  Icon(Icons.chevron_right_rounded,
                      size: 24, color: const Color(0xFF4B5563)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
