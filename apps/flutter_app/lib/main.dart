// ═══════════════════════════════════════════════════════════════════════════
// LTS Pricing — Flutter Android entry point
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'engine/js_runtime.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'store/app_state.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('vi_VN', null);

  // Init JS engine + state song song
  await EngineService.instance.init();

  final state = AppState();
  await state.bootstrap();

  runApp(LTSApp(state: state));
}

class LTSApp extends StatelessWidget {
  final AppState state;
  const LTSApp({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: state,
      child: Consumer<AppState>(
        builder: (context, s, _) => MaterialApp(
          title: 'LTS Pricing',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: s.themeMode,
          locale: const Locale('vi', 'VN'),
          supportedLocales: const [Locale('vi', 'VN'), Locale('en', 'US')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const HomeGate(),
        ),
      ),
    );
  }
}

/// Splash "Đang kiểm tra phiên làm việc..." khi bootstrap chưa xong
/// (mirror màn loading của web — tránh flash UI sai trạng thái auth).
class HomeGate extends StatelessWidget {
  const HomeGate({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    if (!s.sessionChecked) {
      return Scaffold(
        backgroundColor: const Color(0xFF0B1220),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('LTS',
                  style: TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: -1)),
              const Text('Service',
                  style: TextStyle(fontSize: 16, color: Color(0xFF8B93A7))),
              const SizedBox(height: 28),
              const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                    strokeWidth: 2.5, color: Color(0xFF8B93A7)),
              ),
              const SizedBox(height: 16),
              const Text('Đang kiểm tra phiên làm việc...',
                  style: TextStyle(fontSize: 13, color: Color(0xFF8B93A7))),
            ],
          ),
        ),
      );
    }
    if (!s.isAuthenticated) {
      return const LoginScreen();
    }
    return const HomeShell();
  }
}
