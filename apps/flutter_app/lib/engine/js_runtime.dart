// ═══════════════════════════════════════════════════════════════════════════
// JS Runtime — singleton QuickJS, load engine.bundle.js 1 lần lúc khởi động.
// API: EngineService.calculate(input, materials, constants, profitTable)
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_js/flutter_js.dart';

import 'models.dart';

class EngineService {
  EngineService._();
  static final EngineService instance = EngineService._();

  JavascriptRuntime? _rt;
  bool _ready = false;
  String _version = '';

  bool get isReady => _ready;
  String get engineVersion => _version;

  /// Init runtime, evaluate bundle. Gọi 1 lần lúc app khởi động.
  Future<void> init() async {
    if (_ready) return;
    _rt = getJavascriptRuntime(forceJavascriptCoreOnAndroid: false);

    final src = await rootBundle.loadString('assets/engine.bundle.js');
    final bootRes = _rt!.evaluate(src);
    if (bootRes.isError) {
      throw Exception('Engine bundle load failed: ${bootRes.stringResult}');
    }

    final ver = _rt!.evaluate('globalThis.LTS && globalThis.LTS.version');
    _version = ver.stringResult;
    _ready = true;
  }

  /// Tính giá. Trả `CalculateResult` hoặc throw nếu lỗi engine.
  CalculateResult? calculate({
    required CalculateInput input,
    required List<MaterialDef> materials,
    required AppConstants constants,
    required List<ProfitRow> profitTable,
  }) {
    if (!_ready || _rt == null) {
      throw StateError('EngineService chưa init — gọi init() trước.');
    }

    final inputJson = _escapeJsString(jsonEncode(input.toJson()));
    final matJson = _escapeJsString(jsonEncode(materials.map((m) => m.toJson()).toList()));
    final constJson = _escapeJsString(jsonEncode(constants.toJson()));
    final profitJson = _escapeJsString(jsonEncode(profitTable.map((p) => p.toJson()).toList()));

    // Truyền 4 chuỗi JSON sang JS → JS parse → tính → trả về JSON string.
    final code =
        'globalThis.LTS.calculate("$inputJson","$matJson","$constJson","$profitJson")';
    final res = _rt!.evaluate(code);
    if (res.isError) {
      throw Exception('Engine error: ${res.stringResult}');
    }

    final raw = res.stringResult;
    if (raw.isEmpty) return null;
    final decoded = jsonDecode(raw);
    if (decoded is Map && decoded['error'] != null) {
      final err = decoded['error'].toString();
      // null_result = input chưa đủ (thiếu material, quantity=0...) — không phải lỗi thật
      if (err == 'null_result') return null;
      throw Exception('Engine returned error: $err');
    }
    if (decoded == null) return null;
    return CalculateResult.fromJson((decoded as Map).cast<String, dynamic>());
  }

  /// Escape string sao cho an toàn nhúng vào "...".
  String _escapeJsString(String s) {
    return s
        .replaceAll(r'\', r'\\')
        .replaceAll('"', r'\"')
        .replaceAll('\n', r'\n')
        .replaceAll('\r', r'\r')
        .replaceAll('\t', r'\t');
  }

  void dispose() {
    _rt?.dispose();
    _rt = null;
    _ready = false;
  }
}
