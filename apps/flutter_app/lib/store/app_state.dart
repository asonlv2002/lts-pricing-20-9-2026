// ═══════════════════════════════════════════════════════════════════════════
// AppState — ChangeNotifier (Provider).
// Quản lý: input hiện tại, kết quả, materials, constants, profitTable, history, LSX.
// Khi input đổi → debounce 250ms → gọi engine → set currentResult.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

import '../engine/js_runtime.dart';
import '../engine/models.dart';
import 'local_storage.dart';

class AppState extends ChangeNotifier {
  // ── Cấu hình ─────────────────────────────────────────────────────────────
  List<MaterialDef> materials = [];
  AppConstants constants = const AppConstants({});
  List<ProfitRow> profitTable = [];

  // ── Input + Result ───────────────────────────────────────────────────────
  CalculateInput currentInput = CalculateInput.defaults();
  CalculateResult? currentResult;
  String? lastError;

  // ── History + LSX ────────────────────────────────────────────────────────
  List<HistoryItem> history = [];
  List<ProductionOrder> productionOrders = [];

  // ── UI ───────────────────────────────────────────────────────────────────
  ThemeMode themeMode = ThemeMode.system;
  int? requestedTabIndex;

  Timer? _debounce;

  Future<void> bootstrap() async {
    await LocalStorage.instance.init();

    // Theme
    final tm = LocalStorage.instance.readThemeMode();
    themeMode = tm == 'light'
        ? ThemeMode.light
        : tm == 'dark'
            ? ThemeMode.dark
            : ThemeMode.system;

    // Load defaults từ assets, override bằng local nếu có
    materials = LocalStorage.instance.readMaterials() ?? await _loadMaterialsAsset();
    constants = LocalStorage.instance.readConstants() ?? await _loadConstantsAsset();
    profitTable = LocalStorage.instance.readProfit() ?? await _loadProfitAsset();

    history = LocalStorage.instance.readHistory();
    if (history.isEmpty) {
      history = await _loadHistoryAsset();
      if (history.isNotEmpty) await LocalStorage.instance.writeHistory(history);
    }
    productionOrders = LocalStorage.instance.readLSX();

    notifyListeners();
    _recompute();
  }

  static Future<List<MaterialDef>> _loadMaterialsAsset() async {
    final raw = await rootBundle.loadString('assets/data/materials.json');
    final list = jsonDecode(raw);
    if (list is List) {
      return list.map((e) => MaterialDef.fromJson((e as Map).cast<String, dynamic>())).toList();
    }
    // Trường hợp file là object {materials: [...]}
    if (list is Map && list['materials'] is List) {
      return (list['materials'] as List)
          .map((e) => MaterialDef.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
    }
    return [];
  }

  static Future<AppConstants> _loadConstantsAsset() async {
    final raw = await rootBundle.loadString('assets/data/constants.json');
    return AppConstants.fromJson((jsonDecode(raw) as Map).cast<String, dynamic>());
  }

  static Future<List<ProfitRow>> _loadProfitAsset() async {
    final raw = await rootBundle.loadString('assets/data/profitTable.json');
    final j = jsonDecode(raw);
    final rows = (j is Map ? j['rows'] : j) as List;
    return rows.map((e) => ProfitRow.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  static Future<List<HistoryItem>> _loadHistoryAsset() async {
    try {
      final raw = await rootBundle.loadString('assets/data/history.json');
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => HistoryItem.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
    } catch (_) {
      return [];
    }
  }

  // ── Input updates ────────────────────────────────────────────────────────
  void updateInput(String key, dynamic value) {
    currentInput = currentInput.withField(key, value);
    notifyListeners();
    _scheduleRecompute();

    // Auto-trigger thickness optimization when layer or micOverrides change
    if (!_isLayerKey(key) && key != 'micOverrides') return;
    final i = currentInput.raw;
    final target = (i['targetThickness'] as num?)?.toInt() ?? 0;
    final autoOpt = (i['autoOptimizeThickness'] as bool?) ?? false;
    if (target > 0 && autoOpt) {
      _scheduleThicknessOptimization();
    }
  }

  static bool _isLayerKey(String key) =>
      ['layer1Id','layer2Id','layer3Id','layer4Id','layer5Id'].contains(key);

  Timer? _thicknessTimer;

  void _scheduleThicknessOptimization() {
    _thicknessTimer?.cancel();
    _thicknessTimer = Timer(const Duration(milliseconds: 300), _runThicknessOptimization);
  }

  void _runThicknessOptimization() {
    if (!EngineService.instance.isReady) return;
    final i = currentInput.raw;
    final target = (i['targetThickness'] as num?)?.toInt() ?? 0;
    if (target <= 0) return;

    final layerKeys = ['layer1Id','layer2Id','layer3Id','layer4Id','layer5Id'];
    final hasLayer = layerKeys.any((k) => (i[k] as String?) != null);
    if (!hasLayer) return;

    try {
      final inputJson = jsonEncode(currentInput.toJson());
      final matsJson = jsonEncode(materials.map((m) => m.toJson()).toList());
      final code = 'globalThis.LTS.optimizeThickness("$inputJson","$matsJson")';
      final res = EngineService.instance.evaluateCode(code);
      if (res == null || res.isError) return;
      final decoded = jsonDecode(res.stringResult);
      if (decoded == null || (decoded as Map).containsKey('error')) return;
      final optResult = decoded as Map<String, dynamic>;
      final overrides = optResult['optimizedMicOverrides'] as Map<String, dynamic>?;
      if (overrides != null && overrides.isNotEmpty) {
        final newOverrides = Map<String, dynamic>.from(
            (i['micOverrides'] as Map?)?.cast<String, dynamic>() ?? {});
        newOverrides.addAll(overrides);
        currentInput = currentInput.withField('micOverrides', newOverrides);
        notifyListeners();
        _scheduleRecompute();
      }
    } catch (_) {
      // Silently fail — optimization is best-effort
    }
  }

  void setInput(CalculateInput next) {
    currentInput = next;
    notifyListeners();
    _scheduleRecompute();
  }

  void _scheduleRecompute() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), _recompute);
  }

  void _recompute() {
    if (!EngineService.instance.isReady) return;
    try {
      currentResult = EngineService.instance.calculate(
        input: currentInput,
        materials: materials,
        constants: constants,
        profitTable: profitTable,
      );
      lastError = null;
    } catch (e) {
      currentResult = null;
      lastError = e.toString();
    }
    notifyListeners();
  }

  /// Force tính ngay (dùng khi user nhấn nút).
  void recomputeNow() => _recompute();

  /// Reset config (materials/constants/profit) về defaults từ assets.
  /// Dùng khi user muốn lấy lại data gốc đi kèm app, bỏ override đã lưu.
  Future<void> resetConfigToDefaults() async {
    await LocalStorage.instance.clearConfigOverrides();
    materials = await _loadMaterialsAsset();
    constants = await _loadConstantsAsset();
    profitTable = await _loadProfitAsset();
    notifyListeners();
    _scheduleRecompute();
  }

  // ── History ──────────────────────────────────────────────────────────────
  Future<void> saveCurrentToHistory() async {
    if (currentResult == null) return;
    final id = 'H${DateTime.now().millisecondsSinceEpoch}';
    final item = HistoryItem(
      id: id,
      date: DateTime.now().toIso8601String(),
      customer: currentInput.customer,
      productName: currentInput.productName,
      structure: currentResult!.structureText,
      quantity: currentInput.quantity,
      finalPrice: currentResult!.finalPrice,
      quoteStatus: 'drafted',
      input: Map<String, dynamic>.of(currentInput.toJson()),
    );
    history = [item, ...history];
    await LocalStorage.instance.writeHistory(history);
    notifyListeners();
  }

  /// Lưu trực tiếp danh sách history (dùng khi cập nhật trạng thái từ màn Lịch sử)
  Future<void> saveHistoryDirectly(List<HistoryItem> items) async {
    history = items;
    await LocalStorage.instance.writeHistory(items);
    notifyListeners();
  }

  Future<void> deleteHistory(String id) async {
    history = history.where((h) => h.id != id).toList();
    await LocalStorage.instance.writeHistory(history);
    notifyListeners();
  }

  void loadFromHistory(HistoryItem item) {
    setInput(CalculateInput.fromJson(item.input));
    requestTabSwitch(0);
  }

  void requestTabSwitch(int index) {
    requestedTabIndex = index;
    notifyListeners();
  }

  void consumeTabRequest() {
    requestedTabIndex = null;
  }

  // ── Materials / Constants / Profit (cấu hình) ─────────────────────────────
  Future<void> setMaterials(List<MaterialDef> next) async {
    materials = next;
    await LocalStorage.instance.writeMaterials(next);
    notifyListeners();
    _scheduleRecompute();
  }

  Future<void> setConstants(AppConstants next) async {
    constants = next;
    await LocalStorage.instance.writeConstants(next);
    notifyListeners();
    _scheduleRecompute();
  }

  Future<void> setProfitTable(List<ProfitRow> next) async {
    profitTable = next;
    await LocalStorage.instance.writeProfit(next);
    notifyListeners();
    _scheduleRecompute();
  }

  // ── LSX ───────────────────────────────────────────────────────────────────
  Future<void> addProductionOrder(ProductionOrder po) async {
    productionOrders = [po, ...productionOrders];
    await LocalStorage.instance.writeLSX(productionOrders);
    notifyListeners();
  }

  Future<void> updateProductionOrder(String id, ProductionOrder updated) async {
    productionOrders =
        productionOrders.map((p) => p.id == id ? updated : p).toList();
    await LocalStorage.instance.writeLSX(productionOrders);
    notifyListeners();
  }

  Future<void> deleteProductionOrder(String id) async {
    productionOrders = productionOrders.where((p) => p.id != id).toList();
    await LocalStorage.instance.writeLSX(productionOrders);
    notifyListeners();
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
    final s = mode == ThemeMode.light
        ? 'light'
        : mode == ThemeMode.dark
            ? 'dark'
            : 'system';
    await LocalStorage.instance.writeThemeMode(s);
    notifyListeners();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}
