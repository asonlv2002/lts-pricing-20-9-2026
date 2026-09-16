// ═══════════════════════════════════════════════════════════════════════════
// ModuleRoute — route module kiểu web mobile: header navy (back | title) + body
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../../theme/lts_tokens.dart';
import 'lts_chrome.dart';

class ModuleRoute extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? action;
  const ModuleRoute(
      {super.key,
      required this.title,
      this.subtitle,
      required this.child,
      this.action});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Scaffold(
      backgroundColor: p.shellBg,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            LtsNavyHeader(
              title: title,
              subtitle: subtitle,
              action: action,
              leading: LtsHeaderCircleButton(
                icon: Icons.arrow_back_rounded,
                tooltip: 'Quay lại',
                onTap: () => Navigator.of(context).maybePop(),
              ),
            ),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}
