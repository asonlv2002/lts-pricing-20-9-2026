// ═══════════════════════════════════════════════════════════════════════════
// ResultTabs — Tab Thường/Nâng cao + tab Sale/Admin cho màn kết quả (P3/P4).
// Mirror web `ManHinhQuanLy.tsx`: nangCap ? BangDacTaNangCaoGhiDe : BangGhiDe,
// với tab bar 💼 Sale / 👑 Admin.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/lts_tokens.dart';
import 'advanced_spec.dart';
import 'override_table.dart';

class ResultTabs extends StatefulWidget {
  final AppState state;
  const ResultTabs({super.key, required this.state});

  @override
  State<ResultTabs> createState() => _ResultTabsState();
}

class _ResultTabsState extends State<ResultTabs> {
  bool _isSale = true;

  AppState get s => widget.state;

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Toggle Thường / Nâng cao
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: p.surface2,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: p.border),
          ),
          child: Row(children: [
            _seg('Thường', !s.cheDoNangCao,
                () => s.setCheDoNangCao(false)),
            _seg('Nâng cao', s.cheDoNangCao, () => s.setCheDoNangCao(true)),
          ]),
        ),
        const SizedBox(height: 10),
        // Tab Sale / Admin
        Row(children: [
          Expanded(
            child: _tabBtn(
              label: '💼 Sale',
              active: _isSale,
              dot: s.saleOverrides.isNotEmpty,
              onTap: () => setState(() => _isSale = true),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _tabBtn(
              label: '👑 Admin',
              active: !_isSale,
              dot: s.adminOverrides.isNotEmpty,
              onTap: () => setState(() => _isSale = false),
            ),
          ),
        ]),
        const SizedBox(height: 10),
        if (s.cheDoNangCao)
          AdvancedSpecSection(state: s, isSale: _isSale)
        else
          OverrideTableSection(state: s, isSale: _isSale),
      ],
    );
  }

  Widget _seg(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active ? AppColors.accent : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: active
                      ? Colors.white
                      : LtsT.of(context).muted)),
        ),
      ),
    );
  }

  Widget _tabBtn({
    required String label,
    required bool active,
    required bool dot,
    required VoidCallback onTap,
  }) {
    final p = LtsT.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: active ? p.surface : p.surface2,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: active ? AppColors.accent : p.border,
              width: active ? 1.5 : 1),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label,
                style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: active ? AppColors.accent : p.muted)),
            if (dot)
              Padding(
                padding: const EdgeInsets.only(left: 5),
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                      color: AppColors.warning, shape: BoxShape.circle),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
