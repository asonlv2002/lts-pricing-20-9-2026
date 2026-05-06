import 'dart:io';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:flutter_js/flutter_js.dart';
import '../lib/engine/js_runtime.dart';
import '../lib/engine/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    // Override rootBundle to load the file from the filesystem during tests
    // We don't need to load here if we load inside test, or we can load it:
    // final engineJs = await rootBundle.loadString('assets/engine.bundle.js');
    
    // We need to inject this into the EngineService or create a mock.
    // However, since EngineService uses rootBundle, we can intercept the asset loading.
    // We'll just create a JavascriptRuntime manually to test if flutter_js evaluates it correctly.
  });

  test('Test Engine Service calculation', () async {
    final rt = getJavascriptRuntime(forceJavascriptCoreOnAndroid: false);
    final src = await rootBundle.loadString('assets/engine.bundle.js');
    final bootRes = rt.evaluate(src);
    expect(bootRes.isError, false, reason: bootRes.stringResult);

    final input = CalculateInput.defaults()
        .withField('customer', 'Khach Test')
        .withField('productName', 'SP Test')
        .withField('productType', 'tui')
        .withField('bagType', 'phang')
        .withField('filmRollLength', 6000)
        .withField('quantity', 10000)
        .withField('numColors', 4)
        .withField('numImages', 1)
        .withField('spreadWidth', 0.3)
        .withField('cutStep', 0.4);

    final mat = MaterialDef(
      id: 'PET',
      name: 'PET',
      density: 1.4,
      thickness: 12,
      pricePerKg: 35000,
      isPETorPA: true,
      rollLength: 6000,
      inkPricePerColor: 150000,
    );

    final inputWithLayer = input.withField('layer1Id', mat.id);

    final constants = AppConstants({
      'phiGhep': 1000,
      'phiChia': 500,
      'phiCat': 50,
      'phiChiecKhauQuaiXach': 0,
      'phiChiecKhauKhoa': 0,
      'phiChiecKhauBangKeo': 0,
      'phiGiaoHang': 0,
      'loiNhuanCat': 0,
      'pA': 1000,
      'pB': 0,
      'csDatMau': 100,
      'hA': 1000,
      'hB': 0,
      'hC': 100,
      'tyGiaTruc': 1,
      'heSoLoiNhuan': 1,
    });

    final profitTable = [
      ProfitRow(threshold: 0, col1: 0, col2: 0),
    ];

    String escapeJsString(String s) {
      return s
          .replaceAll(r'\', r'\\')
          .replaceAll('"', r'\"')
          .replaceAll('\n', r'\n')
          .replaceAll('\r', r'\r')
          .replaceAll('\t', r'\t');
    }

    final inputJson = escapeJsString(jsonEncode(inputWithLayer.toJson()));
    final matJson = escapeJsString(jsonEncode([mat.toJson()]));
    final constJson = escapeJsString(jsonEncode(constants.toJson()));
    final profitJson = escapeJsString(jsonEncode(profitTable.map((e) => e.toJson()).toList()));

    final code = 'globalThis.LTS.calculate("$inputJson","$matJson","$constJson","$profitJson")';
    final res = rt.evaluate(code);
    
    expect(res.isError, false, reason: res.stringResult);
    
    final raw = res.stringResult;
    expect(raw, isNotEmpty);
    print('Raw result from engine: $raw');
    
    final decoded = jsonDecode(raw);
    expect(decoded, isNot(containsPair('error', anything)));
    print('Gia cuoi cung: ${decoded['giaCuoiCung']}');
  });
}
