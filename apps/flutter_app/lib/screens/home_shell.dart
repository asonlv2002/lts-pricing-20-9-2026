// ═══════════════════════════════════════════════════════════════════════════
// HomeShell — Header gradient + segmented chip switch + bottom navigation
// ═══════════════════════════════════════════════════════════════════════════
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
    final width = MediaQuery.sizeOf(context).width;
    final isTablet = width >= 720;
    final state = context.watch<AppState>();
    final scheme = Theme.of(context).colorScheme;

    final header = _AppHeader(
      title: _tabs[_index].label,
      subtitle: _tabs[_index].subtitle,
      themeMode: state.themeMode,
      onToggleTheme: () => state.setThemeMode(state.themeMode == ThemeMode.dark
          ? ThemeMode.light
          : ThemeMode.dark),
    );

    if (isTablet) {
      return Scaffold(
        body: SafeArea(
          child: Row(
            children: [
              Container(
                width: width >= 1100 ? 220 : 84,
                decoration: BoxDecoration(
                  color: scheme.surface,
                  border: Border(
                      right: BorderSide(
                          color:
                              scheme.outlineVariant.withValues(alpha: 0.4))),
                ),
                child: _SidebarNav(
                  tabs: _tabs,
                  selected: _index,
                  expanded: width >= 1100,
                  onSelect: (i) => setState(() => _index = i),
                  themeMode: state.themeMode,
                  onToggleTheme: () => state.setThemeMode(
                      state.themeMode == ThemeMode.dark
                          ? ThemeMode.light
                          : ThemeMode.dark),
                ),
              ),
              Expanded(
                child: Column(
                  children: [
                    header,
                    Expanded(child: _body()),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            header,
            Expanded(child: _body()),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _tabs
            .map((t) => NavigationDestination(
                  icon: Icon(t.icon),
                  selectedIcon: Icon(t.iconSelected),
                  label: t.label,
                ))
            .toList(),
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

class _SidebarNav extends StatelessWidget {
  final List<_TabDef> tabs;
  final int selected;
  final bool expanded;
  final ValueChanged<int> onSelect;
  final ThemeMode themeMode;
  final VoidCallback onToggleTheme;
  const _SidebarNav({
    required this.tabs,
    required this.selected,
    required this.expanded,
    required this.onSelect,
    required this.themeMode,
    required this.onToggleTheme,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding:
                EdgeInsets.symmetric(horizontal: expanded ? 12 : 6, vertical: 8),
            child: Row(
              mainAxisAlignment: expanded
                  ? MainAxisAlignment.start
                  : MainAxisAlignment.center,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: AppGradients.brandMark,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text('LTS',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 10)),
                ),
                if (expanded) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text('Pricing',
                        style: Theme.of(context).textTheme.titleMedium,
                        overflow: TextOverflow.ellipsis),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          for (int i = 0; i < tabs.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: _SidebarItem(
                tab: tabs[i],
                selected: i == selected,
                expanded: expanded,
                onTap: () => onSelect(i),
              ),
            ),
          const Spacer(),
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

class _SidebarItem extends StatelessWidget {
  final _TabDef tab;
  final bool selected;
  final bool expanded;
  final VoidCallback onTap;
  const _SidebarItem(
      {required this.tab,
      required this.selected,
      required this.expanded,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected
          ? scheme.primary.withValues(alpha: 0.12)
          : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(
              horizontal: expanded ? 12 : 6, vertical: 12),
          child: Row(
            mainAxisAlignment: expanded
                ? MainAxisAlignment.start
                : MainAxisAlignment.center,
            children: [
              Icon(selected ? tab.iconSelected : tab.icon,
                  size: 22,
                  color: selected ? scheme.primary : scheme.onSurfaceVariant),
              if (expanded) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: Text(tab.label,
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.w500,
                          color: selected
                              ? scheme.primary
                              : scheme.onSurface)),
                ),
              ],
            ],
          ),
        ),
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
