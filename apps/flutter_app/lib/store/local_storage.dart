// ═══════════════════════════════════════════════════════════════════════════
// LocalStorage — wrap SharedPreferences cho history + production orders + cấu hình.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

import '../engine/models.dart';

class LocalStorage {
  LocalStorage._();
  static final LocalStorage instance = LocalStorage._();

  static const _kHistory = 'lts_history_v1';
  static const _kLSX = 'lts_lsx_v1';
  static const _kMaterials = 'lts_materials_v1';
  static const _kConstants = 'lts_constants_v1';
  static const _kProfit = 'lts_profit_v1';
  static const _kThemeMode = 'lts_theme_mode_v1'; // 'light' | 'dark' | 'system'
  static const _kAccessToken = 'lts_service_access_token';
  static const _kRefreshToken = 'lts_service_refresh_token';
  static const _kUserPolicies = 'lts_service_user_policies';
  static const _kThongBao = 'lts_thong_bao_v1';
  static const _kServiceUrl = 'lts_service_url';

  late SharedPreferences _sp;

  Future<void> init() async {
    _sp = await SharedPreferences.getInstance();
  }

  // ── History ───────────────────────────────────────────────────────────────
  List<HistoryItem> readHistory() {
    final raw = _sp.getString(_kHistory);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list.map((e) => HistoryItem.fromJson((e as Map).cast<String, dynamic>())).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> writeHistory(List<HistoryItem> items) async {
    await _sp.setString(_kHistory, jsonEncode(items.map((e) => e.toJson()).toList()));
  }

  // ── LSX ───────────────────────────────────────────────────────────────────
  List<ProductionOrder> readLSX() {
    final raw = _sp.getString(_kLSX);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list.map((e) => ProductionOrder.fromJson((e as Map).cast<String, dynamic>())).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> writeLSX(List<ProductionOrder> items) async {
    await _sp.setString(_kLSX, jsonEncode(items.map((e) => e.toJson()).toList()));
  }

  // ── Materials override ────────────────────────────────────────────────────
  List<MaterialDef>? readMaterials() {
    final raw = _sp.getString(_kMaterials);
    if (raw == null || raw.isEmpty) return null;
    try {
      final list = jsonDecode(raw) as List;
      return list.map((e) => MaterialDef.fromJson((e as Map).cast<String, dynamic>())).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> writeMaterials(List<MaterialDef> items) async {
    await _sp.setString(_kMaterials, jsonEncode(items.map((e) => e.toJson()).toList()));
  }

  // ── Constants override ────────────────────────────────────────────────────
  AppConstants? readConstants() {
    final raw = _sp.getString(_kConstants);
    if (raw == null || raw.isEmpty) return null;
    try {
      return AppConstants.fromJson((jsonDecode(raw) as Map).cast<String, dynamic>());
    } catch (_) {
      return null;
    }
  }

  Future<void> writeConstants(AppConstants c) async {
    await _sp.setString(_kConstants, jsonEncode(c.toJson()));
  }

  // ── Profit table override ─────────────────────────────────────────────────
  List<ProfitRow>? readProfit() {
    final raw = _sp.getString(_kProfit);
    if (raw == null || raw.isEmpty) return null;
    try {
      final list = jsonDecode(raw) as List;
      return list.map((e) => ProfitRow.fromJson((e as Map).cast<String, dynamic>())).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> writeProfit(List<ProfitRow> rows) async {
    await _sp.setString(_kProfit, jsonEncode(rows.map((e) => e.toJson()).toList()));
  }

  // ── Theme mode ────────────────────────────────────────────────────────────
  String readThemeMode() => _sp.getString(_kThemeMode) ?? 'system';
  Future<void> writeThemeMode(String m) => _sp.setString(_kThemeMode, m);

  // ── Auth tokens (khớp key web localStorage) ───────────────────────────────
  String? readAccessToken() => _sp.getString(_kAccessToken);
  String? readRefreshToken() => _sp.getString(_kRefreshToken);
  Future<void> writeTokens(String accessToken, String refreshToken) async {
    await _sp.setString(_kAccessToken, accessToken);
    await _sp.setString(_kRefreshToken, refreshToken);
  }

  Future<void> clearTokens() async {
    await _sp.remove(_kAccessToken);
    await _sp.remove(_kRefreshToken);
  }

  // ── Cache policies theo userId (JWT không chứa policies) ─────────────────
  ({String userId, List<String> policies})? readUserPolicies() {
    final raw = _sp.getString(_kUserPolicies);
    if (raw == null || raw.isEmpty) return null;
    try {
      final j = jsonDecode(raw) as Map;
      return (
        userId: j['userId']?.toString() ?? '',
        policies: ((j['policies'] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> writeUserPolicies(String userId, List<String> policies) =>
      _sp.setString(_kUserPolicies,
          jsonEncode({'userId': userId, 'policies': policies}));

  // ── Thông báo local ──────────────────────────────────────────────────────
  List<Map<String, dynamic>> readThongBao() {
    final raw = _sp.getString(_kThongBao);
    if (raw == null || raw.isEmpty) return [];
    try {
      return ((jsonDecode(raw) as List))
          .map((e) => (e as Map).cast<String, dynamic>())
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> writeThongBao(List<Map<String, dynamic>> items) =>
      _sp.setString(_kThongBao, jsonEncode(items));

  // ── URL server override (thiết bị thật ngoài LAN) ────────────────────────
  String? readServiceUrl() {
    final v = _sp.getString(_kServiceUrl);
    return (v == null || v.isEmpty) ? null : v;
  }

  Future<void> writeServiceUrl(String? url) async {
    if (url == null || url.isEmpty) {
      await _sp.remove(_kServiceUrl);
    } else {
      await _sp.setString(_kServiceUrl, url);
    }
  }

  // ── Clear cached config (force reload từ assets next time) ────────────────
  Future<void> clearConfigOverrides() async {
    await _sp.remove(_kMaterials);
    await _sp.remove(_kConstants);
    await _sp.remove(_kProfit);
  }
}
