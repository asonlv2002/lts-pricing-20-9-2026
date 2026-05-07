import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:flutter_js/flutter_js.dart';
import 'package:lts_pricing/engine/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMessageHandler('flutter/assets', (message) async {
    final key = const StringCodec().decodeMessage(message)!;
    if (key == 'packages/flutter_js/assets/js/fetch.js') {
      return const StringCodec().encodeMessage('');
    }
    final file = File(Directory.current.uri.resolve(key).toFilePath());
    final bytes = await file.readAsBytes();
    return ByteData.sublistView(bytes);
  });

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

    final constRaw = await rootBundle.loadString('assets/data/constants.json');
    final constants = AppConstants.fromJson(
      (jsonDecode(constRaw) as Map).cast<String, dynamic>(),
    );

    final profitRaw = await rootBundle.loadString('assets/data/profitTable.json');
    final profitRows = (jsonDecode(profitRaw) as Map<String, dynamic>)['rows'] as List;
    final profitTable = profitRows
        .map((e) => ProfitRow.fromJson((e as Map).cast<String, dynamic>()))
        .toList();

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
