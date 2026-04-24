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

  // ── Clear cached config (force reload từ assets next time) ────────────────
  Future<void> clearConfigOverrides() async {
    await _sp.remove(_kMaterials);
    await _sp.remove(_kConstants);
    await _sp.remove(_kProfit);
  }
}
