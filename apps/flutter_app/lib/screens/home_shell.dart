// ═══════════════════════════════════════════════════════════════════════════
// HomeShell — Header + Floating draggable menu (giống AssistiveTouch iOS)
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../store/app_state.dart';
import '../theme/app_theme.dart';
import 'tinh_gia_screen.dart';
import 'lich_su_screen.dart';
import 'cau_hinh_screen.dart';
import 'lsx_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _tabs = [
    _TabDef('Tính giá', 'Calculator', Icons.calculate_outlined,
        Icons.calculate_rounded),
    _TabDef('Lịch sử', 'History', Icons.history_outlined, Icons.history_rounded),
    _TabDef(
        'Cấu hình', 'Settings', Icons.tune_outlined, Icons.tune_rounded),
    _TabDef('Lệnh SX', 'Production', Icons.assignment_outlined,
        Icons.assignment_rounded),
  ];

  Widget _body() {
    switch (_index) {
      case 0:
        return const TinhGiaScreen();
      case 1:
        return const LichSuScreen();
      case 2:
        return const CauHinhScreen();
      case 3:
        return const LSXScreen();
      default:
        return const SizedBox();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    final header = _AppHeader(
      title: _tabs[_index].label,
      subtitle: _tabs[_index].subtitle,
      themeMode: state.themeMode,
      onToggleTheme: () => state.setThemeMode(state.themeMode == ThemeMode.dark
          ? ThemeMode.light
          : ThemeMode.dark),
    );

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Column(
              children: [
                header,
                Expanded(child: _body()),
              ],
            ),
            // Floating draggable menu — luôn nằm trên nội dung
            _FloatingNavMenu(
              tabs: _tabs,
              selected: _index,
              onSelect: (i) => setState(() => _index = i),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating draggable menu — kéo thả tự do, không neo, idle thì mờ
// ─────────────────────────────────────────────────────────────────────────────
class _FloatingNavMenu extends StatefulWidget {
  final List<_TabDef> tabs;
  final int selected;
  final ValueChanged<int> onSelect;
  const _FloatingNavMenu({
    required this.tabs,
    required this.selected,
    required this.onSelect,
  });

  @override
  State<_FloatingNavMenu> createState() => _FloatingNavMenuState();
}

class _FloatingNavMenuState extends State<_FloatingNavMenu> {
  // Vị trí góc trên-trái của nút FAB. null = chưa init → đặt mặc định ở góc dưới phải.
  Offset? _pos;
  bool _menuOpen = false;
  bool _dimmed = false;
  Timer? _idleTimer;

  static const double _fabSize = 56.0;
  static const double _margin = 16.0;
  static const Duration _idleAfter = Duration(seconds: 3);

  @override
  void initState() {
    super.initState();
    _scheduleDim();
  }

  @override
  void dispose() {
    _idleTimer?.cancel();
    super.dispose();
  }

  void _scheduleDim() {
    _idleTimer?.cancel();
    _dimmed = false;
    _idleTimer = Timer(_idleAfter, () {
      if (!mounted || _menuOpen) return;
      setState(() => _dimmed = true);
    });
  }

  void _wake() {
    if (_dimmed) {
      setState(() => _dimmed = false);
    }
    _scheduleDim();
  }

  Offset _defaultPos(Size screen) {
    final padding = MediaQuery.paddingOf(context);
    return Offset(
      screen.width - _fabSize - _margin,
      screen.height - _fabSize - _margin - padding.bottom - 8,
    );
  }

  Offset _clamp(Offset raw, Size screen) {
    final padding = MediaQuery.paddingOf(context);
    final minX = _margin;
    final minY = padding.top + _margin;
    final maxX = screen.width - _fabSize - _margin;
    final maxY = screen.height - _fabSize - _margin - padding.bottom;
    return Offset(
      raw.dx.clamp(minX, maxX),
      raw.dy.clamp(minY, maxY),
    );
  }

  void _toggleMenu() {
    setState(() => _menuOpen = !_menuOpen);
    _wake();
  }

  void _select(int i) {
    widget.onSelect(i);
    setState(() => _menuOpen = false);
    _scheduleDim();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    _pos ??= _defaultPos(size);
    final pos = _clamp(_pos!, size);
    final scheme = Theme.of(context).colorScheme;

    // Hướng bung popup: nếu nút ở nửa dưới → bung lên trên, ngược lại bung xuống.
    final openUp = pos.dy > size.height / 2;
    // Căn ngang: nếu nút ở nửa phải → align phải, ngược lại align trái.
    final alignRight = pos.dx > size.width / 2;

    const popupItemH = 52.0;
    final popupHeight = widget.tabs.length * popupItemH + 16;
    const popupWidth = 200.0;

    final popupTop = openUp ? pos.dy - popupHeight - 8 : pos.dy + _fabSize + 8;
    final popupLeft = alignRight
        ? pos.dx + _fabSize - popupWidth
        : pos.dx.toDouble();

    return Stack(
      children: [
        // Backdrop để bấm ngoài đóng menu
        if (_menuOpen)
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () => setState(() => _menuOpen = false),
            ),
          ),
        // Popup
        if (_menuOpen)
          AnimatedPositioned(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            top: popupTop.clamp(_margin, size.height - popupHeight - _margin),
            left: popupLeft.clamp(_margin, size.width - popupWidth - _margin),
            child: Material(
              elevation: 12,
              borderRadius: BorderRadius.circular(16),
              color: scheme.surface,
              shadowColor: Colors.black.withValues(alpha: 0.3),
              child: Container(
                width: popupWidth,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: scheme.outlineVariant.withValues(alpha: 0.4),
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (int i = 0; i < widget.tabs.length; i++)
                      _PopupItem(
                        tab: widget.tabs[i],
                        selected: i == widget.selected,
                        onTap: () => _select(i),
                        height: popupItemH,
                      ),
                  ],
                ),
              ),
            ),
          ),
        // Nút FAB kéo thả
        Positioned(
          left: pos.dx,
          top: pos.dy,
          child: GestureDetector(
            onPanStart: (_) => _wake(),
            onPanUpdate: (details) {
              setState(() {
                _pos = (_pos ?? pos) + details.delta;
              });
              _wake();
            },
            onPanEnd: (_) {
              setState(() => _pos = _clamp(_pos!, size));
              _scheduleDim();
            },
            onTap: _toggleMenu,
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 350),
              opacity: _dimmed ? 0.4 : 1.0,
              child: Container(
                width: _fabSize,
                height: _fabSize,
                decoration: BoxDecoration(
                  gradient: AppGradients.brandMark,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.seed.withValues(alpha: 0.4),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Icon(
                  _menuOpen ? Icons.close_rounded : Icons.apps_rounded,
                  color: Colors.white,
                  size: 26,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _PopupItem extends StatelessWidget {
  final _TabDef tab;
  final bool selected;
  final VoidCallback onTap;
  final double height;
  const _PopupItem({
    required this.tab,
    required this.selected,
    required this.onTap,
    required this.height,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: selected
                ? scheme.primary.withValues(alpha: 0.12)
                : Colors.transparent,
          ),
          child: Row(
            children: [
              Icon(
                selected ? tab.iconSelected : tab.icon,
                size: 22,
                color: selected ? scheme.primary : scheme.onSurfaceVariant,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  tab.label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: selected ? scheme.primary : scheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final ThemeMode themeMode;
  final VoidCallback onToggleTheme;
  const _AppHeader({
    required this.title,
    required this.subtitle,
    required this.themeMode,
    required this.onToggleTheme,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 16),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(
          bottom: BorderSide(
              color: scheme.outlineVariant.withValues(alpha: 0.3)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: AppGradients.brandMark,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: AppColors.seed.withValues(alpha: 0.35),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Text('LTS',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                    letterSpacing: 0.5)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title,
                    style: Theme.of(context).textTheme.titleLarge,
                    overflow: TextOverflow.ellipsis),
                Text(subtitle,
                    style: Theme.of(context).textTheme.bodySmall,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Đổi theme',
            icon: Icon(
              themeMode == ThemeMode.dark
                  ? Icons.light_mode_outlined
                  : Icons.dark_mode_outlined,
              color: scheme.onSurfaceVariant,
            ),
            onPressed: onToggleTheme,
          ),
        ],
      ),
    );
  }
}

class _TabDef {
  final String label;
  final String subtitle;
  final IconData icon;
  final IconData iconSelected;
  const _TabDef(this.label, this.subtitle, this.icon, this.iconSelected);
}
