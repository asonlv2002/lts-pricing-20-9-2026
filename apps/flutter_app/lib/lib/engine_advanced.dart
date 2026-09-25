// ═══════════════════════════════════════════════════════════════════════════
// EngineAdvanced — gọi các API nâng cao/override đã bundle trong engine.bundle.js
// (P3/P4/P5). Toàn bộ công thức nằm trong JS bundle (dùng chính code web lib) →
// Dart chỉ truyền JSON vào và render kết quả, KHÔNG lặp lại công thức.
//
// Engine bundle từ 0.4.0 expose: lapDongSanXuat, xuLyDongGhiDe, tinhGiaHieuLuc,
// chuanBiUniRowsNangCao, lapDongVatLieuNangCao, lapDongNhanCongDien,
// tinhTongNangCao, tinhKetQuaNangCaoHieuLuc, tinhNhapPhanBoChotGia,
// getPricingDisplayMeta, tinhGiaDeXuatHienThi, trichCpsxNangCao,
// apCpsxNangCaoVaoHangSo, traLoiNhuanTheoBang, layCotLoiNhuanTuDong.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:convert';

import '../engine/js_runtime.dart';
import '../engine/models.dart';

/// Bảng ghi đè Sale/Admin — map rowKey → map field → giá trị.
typedef OverrideTable = Map<String, Map<String, dynamic>>;

class EngineAdvanced {
  EngineAdvanced._();
  static final EngineAdvanced instance = EngineAdvanced._();

  EngineService get _e => EngineService.instance;

  String _escape(String s) => s
      .replaceAll(r'\', r'\\')
      .replaceAll('"', r'\"')
      .replaceAll('\n', r'\n')
      .replaceAll('\r', r'\r')
      .replaceAll('\t', r'\t');

  String _arg(Object? a) {
    if (a is String) return '"${_escape(a)}"';
    if (a == null) return 'null';
    if (a is num || a is bool) return a.toString();
    return '"${_escape(jsonEncode(a))}"';
  }

  dynamic _call(String fn, List<Object?> args) {
    final res = _e.evaluateCode(
        'globalThis.LTS.$fn(${args.map(_arg).join(',')})');
    if (res.isError) {
      throw Exception('Engine $fn error: ${res.stringResult}');
    }
    return res.stringResult;
  }

  Map<String, dynamic> _callMap(String fn, List<Object?> args) {
    final raw = _call(fn, args) as String;
    if (raw.isEmpty) return const {};
    final decoded = jsonDecode(raw);
    if (decoded is Map && decoded['error'] != null) {
      throw Exception('Engine $fn: ${decoded['error']}');
    }
    return (decoded as Map).cast<String, dynamic>();
  }

  List<dynamic> _callList(String fn, List<Object?> args) {
    final raw = _call(fn, args) as String;
    if (raw.isEmpty) return const [];
    final decoded = jsonDecode(raw);
    if (decoded is Map && decoded['error'] != null) {
      throw Exception('Engine $fn: ${decoded['error']}');
    }
    return decoded as List<dynamic>;
  }

  // ── P3/P4: uniRows + ghi đè ────────────────────────────────────────────────
  Map<String, dynamic> lapDongSanXuat(CalculateResult result, AppConstants c) =>
      _callMap('lapDongSanXuat', [jsonEncode(result.raw), jsonEncode(c.toJson())]);

  Map<String, dynamic> xuLyDongGhiDe(
    List<dynamic> uniRows,
    OverrideTable sourceOv,
    OverrideTable currentOv, {
    Map<String, dynamic>? printFilmParams,
    Map<String, dynamic>? lanNguoc,
  }) =>
      _callMap('xuLyDongGhiDe', [
        jsonEncode(uniRows),
        jsonEncode(sourceOv),
        jsonEncode(currentOv),
        printFilmParams == null ? null : jsonEncode(printFilmParams),
        lanNguoc == null ? null : jsonEncode(lanNguoc),
      ]);

  Map<String, dynamic> tinhGiaHieuLuc({
    required CalculateResult result,
    required List<dynamic> uniRows,
    required OverrideTable saleOverrides,
    required OverrideTable adminOverrides,
    required double saleProfitRatePct,
    required double adminProfitRatePct,
    required List<ProfitRow> profitTable,
    required AppConstants constants,
    required List<MaterialDef> materials,
  }) =>
      _callMap('tinhGiaHieuLuc', [
        jsonEncode({
          'result': result.raw,
          'uniRows': uniRows,
          'saleOverrides': saleOverrides,
          'adminOverrides': adminOverrides,
          'saleProfitRatePct': saleProfitRatePct,
          'adminProfitRatePct': adminProfitRatePct,
          'profitTable': profitTable.map((p) => p.toJson()).toList(),
          'constants': constants.toJson(),
          'materials': materials.map((m) => m.toJson()).toList(),
        }),
      ]);

  // ── P4: đặc tả nâng cao ────────────────────────────────────────────────────
  List<dynamic> chuanBiUniRowsNangCao({
    required List<dynamic> uniRows,
    required CalculateResult result,
    required AppConstants hangSo,
    OverrideTable sourceOv = const {},
    OverrideTable activeOv = const {},
  }) =>
      _callList('chuanBiUniRowsNangCao', [
        jsonEncode({
          'uniRows': uniRows,
          'result': result.raw,
          'hangSo': hangSo.toJson(),
          'sourceOv': sourceOv,
          'activeOv': activeOv,
        }),
      ]);

  List<dynamic> lapDongVatLieuNangCao({
    required CalculateResult result,
    required List<dynamic> uniRows,
    required AppConstants hangSo,
    required List<MaterialDef> materials,
    OverrideTable? overrides,
  }) =>
      _callList('lapDongVatLieuNangCao', [
        jsonEncode(result.raw),
        jsonEncode(uniRows),
        jsonEncode(hangSo.toJson()),
        jsonEncode(materials.map((m) => m.toJson()).toList()),
        overrides == null ? null : jsonEncode(overrides),
      ]);

  List<dynamic> lapDongNhanCongDien({
    required CalculateResult result,
    required AppConstants hangSo,
    OverrideTable? overrides,
  }) =>
      _callList('lapDongNhanCongDien', [
        jsonEncode(result.raw),
        jsonEncode(hangSo.toJson()),
        overrides == null ? null : jsonEncode(overrides),
      ]);

  Map<String, dynamic> tinhTongNangCao(
    List<dynamic> dongVatLieu,
    List<dynamic> dongNhanCongDien,
  ) =>
      _callMap('tinhTongNangCao',
          [jsonEncode(dongVatLieu), jsonEncode(dongNhanCongDien)]);

  Map<String, dynamic> tinhKetQuaNangCaoHieuLuc({
    required CalculateResult result,
    required List<dynamic> uniRows,
    required AppConstants constants,
    required List<MaterialDef> materials,
    required List<ProfitRow> profitTable,
    OverrideTable saleOverrides = const {},
    OverrideTable adminOverrides = const {},
    double saleProfitRatePct = 0,
    double adminProfitRatePct = 0,
  }) =>
      _callMap('tinhKetQuaNangCaoHieuLuc', [
        jsonEncode({
          'result': result.raw,
          'uniRows': uniRows,
          'constants': constants.toJson(),
          'materials': materials.map((m) => m.toJson()).toList(),
          'saleOverrides': saleOverrides,
          'adminOverrides': adminOverrides,
          'saleProfitRatePct': saleProfitRatePct,
          'adminProfitRatePct': adminProfitRatePct,
          'profitTable': profitTable.map((p) => p.toJson()).toList(),
        }),
      ]);

  bool canLanChiaNangCao(CalculateResult result) =>
      _call('canLanChiaNangCao', [jsonEncode(result.raw)]) == 'true';

  // ── P1/P5: chốt giá, nhãn, đóng băng, pin CPSX ─────────────────────────────
  Map<String, dynamic> tinhNhapPhanBoChotGia({
    required bool hasChotGia,
    required double diff,
    required double hoaHongNhap,
    required double hoaHongEngine,
    required String donViPhanBo,
  }) =>
      _callMap('tinhNhapPhanBoChotGia', [
        jsonEncode({
          'hasChotGia': hasChotGia,
          'diff': diff,
          'hoaHongNhap': hoaHongNhap,
          'hoaHongEngine': hoaHongEngine,
          'donViPhanBo': donViPhanBo,
        }),
      ]);

  Map<String, dynamic> getPricingDisplayMeta(Map<String, dynamic> input) =>
      _callMap('getPricingDisplayMeta', [jsonEncode(input)]);

  Map<String, dynamic> tinhGiaDeXuatHienThi({
    required bool nangCap,
    Map<String, dynamic>? loadedItem,
    required bool isDirty,
    required double giaTinhLai,
  }) =>
      _callMap('tinhGiaDeXuatHienThi', [
        jsonEncode({
          'nangCap': nangCap,
          'loadedItem': loadedItem,
          'isDirty': isDirty,
          'giaTinhLai': giaTinhLai,
        }),
      ]);

  Map<String, dynamic>? trichCpsxNangCao(AppConstants hangSo) {
    final raw = _call('trichCpsxNangCao', [jsonEncode(hangSo.toJson())]) as String;
    if (raw.isEmpty || raw == 'null' || raw == 'undefined') return null;
    final decoded = jsonDecode(raw);
    if (decoded == null) return null;
    return (decoded as Map).cast<String, dynamic>();
  }

  AppConstants apCpsxNangCaoVaoHangSo(
      AppConstants base, Map<String, dynamic> pin) {
    final m = _callMap('apCpsxNangCaoVaoHangSo',
        [jsonEncode(base.toJson()), jsonEncode(pin)]);
    return AppConstants(m);
  }

  double traLoiNhuanTheoBang(
    double tongChiPhi,
    int cot,
    List<ProfitRow> profitTable,
    String nhomKhach,
  ) {
    final raw = _call('traLoiNhuanTheoBang', [
      tongChiPhi,
      cot,
      jsonEncode(profitTable.map((p) => p.toJson()).toList()),
      nhomKhach,
    ]) as String;
    return (jsonDecode(raw) as num).toDouble();
  }

  int layCotLoiNhuanTuDong(
    Map<String, dynamic> input,
    List<MaterialDef> materials,
  ) {
    final raw = _call('layCotLoiNhuanTuDong', [
      jsonEncode(input),
      jsonEncode(materials.map((m) => m.toJson()).toList()),
    ]) as String;
    return (jsonDecode(raw) as num).toInt();
  }

  // ── P6: CPSX nâng cao (editor) ─────────────────────────────────────────────

  /// Default data CPSX NC (điện/lương/mực/thời gian) — seed editor.
  Map<String, dynamic> cpsxUpgradeDefaults() {
    final raw = _call('cpsxUpgradeDefaults', const []) as String;
    return (jsonDecode(raw) as Map).cast<String, dynamic>();
  }

  Map<String, dynamic> chuanHoaDien(Map<String, dynamic> raw) =>
      _callMap('chuanHoaCpsxUpgradeElectric', [jsonEncode(raw)]);

  String dinhDangGioMask(String raw) =>
      jsonDecode(_call('dinhDangGioMask', [raw]) as String) as String;

  double? tinhSoGioTuKhungGio(String? start, String? end) {
    final raw = _call('tinhSoGioTuKhungGio', [
      start == null ? '' : jsonEncode(start),
      end == null ? '' : jsonEncode(end),
    ]) as String;
    final v = jsonDecode(raw);
    return v == null ? null : (v as num).toDouble();
  }

  double tinhGiaDienTbCong(List<dynamic> slots) {
    final raw = _call('tinhGiaDienTbCong', [jsonEncode({'slots': slots})]) as String;
    return (jsonDecode(raw) as num).toDouble();
  }

  double tinhGiaDienTbTrongSo(List<dynamic> slots) {
    final raw =
        _call('tinhGiaDienTbTrongSo', [jsonEncode({'slots': slots})]) as String;
    return (jsonDecode(raw) as num).toDouble();
  }

  double? tinhDienMoiPhut(double powerKw, double efficiency, double? applied) {
    final raw = _call('tinhDienMoiPhut', [
      powerKw,
      efficiency,
      applied == null ? 'null' : jsonEncode(applied),
    ]) as String;
    final v = jsonDecode(raw);
    return v == null ? null : (v as num).toDouble();
  }

  Map<String, dynamic> dongBoGiaDangApSauSuaSlot(Map<String, dynamic> state) =>
      _callMap('dongBoGiaDangApSauSuaSlot', [jsonEncode(state)]);

  Map<String, dynamic> chuanHoaLuong(Map<String, dynamic> raw) =>
      _callMap('chuanHoaCpsxUpgradeLabor', [jsonEncode(raw)]);

  Map<String, dynamic> taoMayTinhWorkspaceMacDinh() =>
      _callMap('taoMayTinhWorkspaceMacDinh', const []);

  dynamic tokenHoaBieuThuc(String raw) {
    final res = _call('tokenHoaBieuThuc', [raw]) as String;
    return jsonDecode(res);
  }

  dynamic tinhBieuThuc(dynamic tokens, Map<String, dynamic> params) {
    final res = _call('tinhBieuThuc', [jsonEncode(tokens), jsonEncode(params)]) as String;
    return jsonDecode(res);
  }

  Map<String, dynamic> chuanHoaMuc(Map<String, dynamic> raw) =>
      _callMap('chuanHoaCpsxUpgradeInk', [jsonEncode(raw)]);

  double tinhGiaMucTbCong(Map<String, dynamic> table) {
    final raw = _call('tinhGiaMucTbCong', [jsonEncode(table)]) as String;
    return (jsonDecode(raw) as num).toDouble();
  }

  double tinhGiaMucTbTrongSo(Map<String, dynamic> table) {
    final raw = _call('tinhGiaMucTbTrongSo', [jsonEncode(table)]) as String;
    return (jsonDecode(raw) as num).toDouble();
  }

  double tinhGiaKeoTbCong(Map<String, dynamic> table) {
    final raw = _call('tinhGiaKeoTbCong', [jsonEncode(table)]) as String;
    return (jsonDecode(raw) as num).toDouble();
  }

  double tinhGiaKeoTbTrongSo(Map<String, dynamic> table) {
    final raw = _call('tinhGiaKeoTbTrongSo', [jsonEncode(table)]) as String;
    return (jsonDecode(raw) as num).toDouble();
  }

  dynamic tinhCpMucInMoiM2(Map<String, dynamic> ink) {
    final res = _call('tinhCpMucInMoiM2', [jsonEncode(ink)]) as String;
    return jsonDecode(res);
  }

  List<dynamic> lapBangGiaInTheoMau(Map<String, dynamic> ink) =>
      _callList('lapBangGiaInTheoMau', [jsonEncode(ink)]);

  Map<String, dynamic> chuanHoaThoiGian(Map<String, dynamic> raw) =>
      _callMap('chuanHoaCpsxUpgradeThoiGian', [jsonEncode(raw)]);

  List<dynamic> catalogLoaiTuiSetup() =>
      _callList('catalogLoaiTuiSetup', const []);

  dynamic tinhThoiGianMayIn(Map<String, dynamic> cfg, Map<String, dynamic> input) {
    final res = _call('tinhThoiGianMayIn', [jsonEncode(cfg), jsonEncode(input)]) as String;
    return jsonDecode(res);
  }

  dynamic tinhThoiGianMayGhep(Map<String, dynamic> cfg, Map<String, dynamic> input) {
    final res = _call('tinhThoiGianMayGhep', [jsonEncode(cfg), jsonEncode(input)]) as String;
    return jsonDecode(res);
  }

  dynamic tinhThoiGianMayChia(Map<String, dynamic> cfg, Map<String, dynamic> input) {
    final res = _call('tinhThoiGianMayChia', [jsonEncode(cfg), jsonEncode(input)]) as String;
    return jsonDecode(res);
  }

  dynamic tinhThoiGianMayTui(Map<String, dynamic> cfg, Map<String, dynamic> input) {
    final res = _call('tinhThoiGianMayTui', [jsonEncode(cfg), jsonEncode(input)]) as String;
    return jsonDecode(res);
  }
}
