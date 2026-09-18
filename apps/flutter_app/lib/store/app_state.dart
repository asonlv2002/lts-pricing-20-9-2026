// ═══════════════════════════════════════════════════════════════════════════
// AppState — ChangeNotifier (Provider).
// Quản lý: input hiện tại, kết quả, materials, constants, profitTable, history, LSX,
// phiên đăng nhập service-lts (JWT), thông báo local.
// Khi input đổi → debounce 250ms → gọi engine → set currentResult.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

import '../api/service_lts_client.dart';
import '../engine/js_runtime.dart';
import '../engine/models.dart';
import 'package:lts_pricing/lib/pricing_server_mapper.dart';
import 'local_storage.dart';

/// Catalog policy codes (mirror POLICY_CATALOG của web — dùng fallback admin gốc).
const cacPolicyHangSo = <String>[
  'ACCOUNT_MANAGER',
  'ROLE_MANAGER',
  'CUSTOMER_MANAGER',
  'USER_POLICY_GRANT',
  'USER_POLICY_REVOKE',
  'QUOTATION_REVIEWER',
  'PRICING_SHEET_ADVISOR',
  'PRICE_CONFIG_MANAGER',
  'ORDER_REVIEWER',
  'ACTIVITY_MONITOR',
  'SYSTEM_MONITOR',
  'CPSX_UPGRADE_EDIT_ELECTRIC_TIME_FRAME',
  'CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE',
  'CPSX_UPGRADE_EDIT_LABOR_PRINT',
  'CPSX_UPGRADE_EDIT_LABOR_LAMINATE',
  'CPSX_UPGRADE_EDIT_LABOR_SLIT',
  'CPSX_UPGRADE_EDIT_LABOR_BAG',
  'CPSX_UPGRADE_EDIT_INK_OPP',
  'CPSX_UPGRADE_EDIT_INK_PET',
  'CPSX_UPGRADE_EDIT_INK_PE',
  'CPSX_UPGRADE_EDIT_SOLVENT',
  'CPSX_UPGRADE_EDIT_ADHESIVE',
  'CPSX_UPGRADE_EDIT_INK_RATE',
  'CPSX_UPGRADE_EDIT_ADHESIVE_RATE',
  'CPSX_UPGRADE_EDIT_TIME_PRINT',
  'CPSX_UPGRADE_EDIT_TIME_LAMINATE',
  'CPSX_UPGRADE_EDIT_TIME_SLIT',
  'CPSX_UPGRADE_EDIT_TIME_BAG',
  'CPSX_UPGRADE_REVIEW_ELECTRIC_TIME_FRAME',
  'CPSX_UPGRADE_REVIEW_ELECTRIC_PER_MINUTE',
  'CPSX_UPGRADE_REVIEW_LABOR_PRINT',
  'CPSX_UPGRADE_REVIEW_LABOR_LAMINATE',
  'CPSX_UPGRADE_REVIEW_LABOR_SLIT',
  'CPSX_UPGRADE_REVIEW_LABOR_BAG',
  'CPSX_UPGRADE_REVIEW_INK_OPP',
  'CPSX_UPGRADE_REVIEW_INK_PET',
  'CPSX_UPGRADE_REVIEW_INK_PE',
  'CPSX_UPGRADE_REVIEW_SOLVENT',
  'CPSX_UPGRADE_REVIEW_ADHESIVE',
  'CPSX_UPGRADE_REVIEW_INK_RATE',
  'CPSX_UPGRADE_REVIEW_ADHESIVE_RATE',
  'CPSX_UPGRADE_REVIEW_TIME_PRINT',
  'CPSX_UPGRADE_REVIEW_TIME_LAMINATE',
  'CPSX_UPGRADE_REVIEW_TIME_SLIT',
  'CPSX_UPGRADE_REVIEW_TIME_BAG',
];

/// User đang đăng nhập (mirror nguoiDungHienTai của web).
class NguoiDungHienTai {
  final String id;
  final String account;
  final String fullName;
  List<String> policies;
  final String? avatarUrl;
  final String? signatureUrl;
  Uint8List? avatarBytes;
  Uint8List? signatureBytes;
  NguoiDungHienTai({
    required this.id,
    required this.account,
    required this.fullName,
    required this.policies,
    this.avatarUrl,
    this.signatureUrl,
    this.avatarBytes,
    this.signatureBytes,
  });

  bool coQuyen(String code) => policies.contains(code);
}

/// Thông báo local (mirror useDanhSachThongBao của web mobile).
class ThongBao {
  final String id;
  final String tieuDe;
  final String loai;
  final String thoiGian; // ISO
  final bool daDoc;
  const ThongBao({
    required this.id,
    required this.tieuDe,
    required this.loai,
    required this.thoiGian,
    required this.daDoc,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'tieuDe': tieuDe,
        'loai': loai,
        'thoiGian': thoiGian,
        'daDoc': daDoc,
      };

  factory ThongBao.fromJson(Map<String, dynamic> j) => ThongBao(
        id: j['id']?.toString() ?? '',
        tieuDe: j['tieuDe']?.toString() ?? '',
        loai: j['loai']?.toString() ?? '',
        thoiGian: j['thoiGian']?.toString() ?? '',
        daDoc: j['daDoc'] == true,
      );
}

Map<String, dynamic>? docJwtPayload(String token) {
  try {
    final parts = token.split('.');
    if (parts.length < 2) return null;
    final normalized = base64Url.normalize(parts[1]);
    final decoded = utf8.decode(base64Url.decode(normalized));
    return jsonDecode(decoded) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
}

List<String> locPolicyHopLe(dynamic codes) {
  if (codes is! List) return [];
  return codes
      .map((c) => c.toString())
      .where((c) => cacPolicyHangSo.contains(c))
      .toList();
}

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

  // ── History/LSX server fetch status ──────────────────────────────────────
  bool dangTaiLichSu = false;
  bool dangTaiLsx = false;
  String? loiLichSu;
  String? loiLsx;
  int? lanCuoiTaiLichSu; // ms epoch — dùng cho auto-refresh 30s
  Timer? _lichSuAutoRefresh;

  // ── UI ───────────────────────────────────────────────────────────────────
  ThemeMode themeMode = ThemeMode.system;
  int? requestedTabIndex;
  int? pendingCalcPane;

  // ── Auth service-lts (JWT) ──────────────────────────────────────────────
  String? accessToken;
  String? refreshToken;
  NguoiDungHienTai? nguoiDungHienTai;
  bool isAuthenticated = false;
  bool authLoading = false;
  String? authError;
  bool sessionChecked = false;

  /// null = chưa kiểm tra; false = chưa đặt PIN (bắt buộc đặt sau login).
  bool? hasPin;

  // ── Thông báo local ─────────────────────────────────────────────────────
  List<ThongBao> thongBaoList = [];

  /// Input có thay đổi chưa lưu (dùng cho cảnh báo "Chưa lưu báo giá").
  bool isDirty = false;

  int get soThongBaoChuaDoc =>
      thongBaoList.where((t) => !t.daDoc).length;

  void themThongBao(String tieuDe, String loai) {
    final item = ThongBao(
      id: 'N${DateTime.now().millisecondsSinceEpoch}',
      tieuDe: tieuDe,
      loai: loai,
      thoiGian: DateTime.now().toIso8601String(),
      daDoc: false,
    );
    thongBaoList = [item, ...thongBaoList].take(50).toList();
    LocalStorage.instance.writeThongBao(
        thongBaoList.map((t) => t.toJson()).toList());
    notifyListeners();
  }

  void danhDauDaDoc(String id) {
    thongBaoList = [
      for (final t in thongBaoList) t.id == id ? _voiDaDoc(t, true) : t,
    ];
    LocalStorage.instance
        .writeThongBao(thongBaoList.map((t) => t.toJson()).toList());
    notifyListeners();
  }

  void danhDauTatCaDaDoc() {
    thongBaoList = [for (final t in thongBaoList) _voiDaDoc(t, true)];
    LocalStorage.instance
        .writeThongBao(thongBaoList.map((t) => t.toJson()).toList());
    notifyListeners();
  }

  ThongBao _voiDaDoc(ThongBao t, bool daDoc) => ThongBao(
        id: t.id,
        tieuDe: t.tieuDe,
        loai: t.loai,
        thoiGian: t.thoiGian,
        daDoc: daDoc,
      );

  // ── Auth actions ────────────────────────────────────────────────────────
  static const thongBaoHetPhien = 'Hết phiên đăng nhập.';

  void _caiDatQuanLyPhien() {
    QuanLyPhien.caiDat(
      layTokenHienTai: () =>
          (accessToken != null && refreshToken != null)
              ? (accessToken: accessToken!, refreshToken: refreshToken!)
              : null,
      luuTokenMoi: (a, r) {
        accessToken = a;
        refreshToken = r;
        isAuthenticated = true;
        LocalStorage.instance.writeTokens(a, r);
        notifyListeners();
      },
      xuLyPhienKhongHopLe: resetPhienHetHan,
    );
  }

  void resetPhienHetHan() {
    accessToken = null;
    refreshToken = null;
    nguoiDungHienTai = null;
    isAuthenticated = false;
    authLoading = false;
    authError = thongBaoHetPhien;
    sessionChecked = true;
    hasPin = null;
    LocalStorage.instance.clearTokens();
    notifyListeners();
  }

  NguoiDungHienTai _taoNguoiDung({
    required String id,
    required String account,
    String? fullName,
    String? avatarUrl,
    String? signatureUrl,
    List<String>? policies,
  }) {
    var ps = policies ??
        LocalStorage.instance.readUserPolicies()?.policies ??
        <String>[];
    if (ps.isEmpty && account == 'admin') {
      // Fallback admin gốc khi chưa từng cache (khớp web).
      ps = List<String>.of(cacPolicyHangSo);
    }
    return NguoiDungHienTai(
      id: id,
      account: account,
      fullName: (fullName != null && fullName.trim().isNotEmpty)
          ? fullName.trim()
          : account,
      policies: ps,
      avatarUrl: avatarUrl,
      signatureUrl: signatureUrl,
    );
  }

  void _apDungPhien(PhienDangNhap data) {
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    nguoiDungHienTai = _taoNguoiDung(
      id: data.user.id,
      account: data.user.account,
      fullName: data.user.fullName,
      avatarUrl: data.user.avatarUrl,
      signatureUrl: data.user.signatureUrl,
    );
    isAuthenticated = true;
    authLoading = false;
    authError = null;
    sessionChecked = true;
    LocalStorage.instance.writeTokens(data.accessToken, data.refreshToken);
    LocalStorage.instance.writeUserPolicies(
        data.user.id, nguoiDungHienTai!.policies);
    notifyListeners();
    _lamGiauPoliciesTuServer(data.accessToken, data.user.id);
    // Sau khi login: fetch LichSu + LSX từ server (override cache local).
    taiPricingTuServerSauKhiLogin();
    _kiemTraHasPin(data.accessToken);
    _taiLaiAnhDaiDienNoiBo();
    _taiLaiChuKyNoiBo();
  }

  /// Kiểm tra tài khoản đã đặt PIN chưa (chưa → bắt buộc đặt trước khi dùng).
  Future<void> _kiemTraHasPin(String token) async {
    try {
      final tt = await layTrangThaiBaoMatService(token);
      hasPin = tt.hasPin;
    } catch (_) {
      hasPin = null;
    }
    notifyListeners();
  }

  /// Đặt/thay mã PIN 6 số (cần mật khẩu hiện tại).
  Future<void> datPin(String currentPassword, String pin) async {
    final token = accessToken;
    if (token == null) throw LoiServiceLts(401, 'Chưa đăng nhập.');
    await datPinService(token, currentPassword, pin);
    hasPin = true;
    notifyListeners();
  }

  /// Làm giàu policies từ GET /auth/accounts khi user có ACCOUNT_MANAGER
  /// (403/401 → bỏ qua, không coi là hết phiên).
  Future<void> _lamGiauPoliciesTuServer(String token, String userId) async {
    try {
      final accounts = await layTaiKhoanService(token);
      TaiKhoanApi? self;
      for (final a in accounts) {
        if (a.id == userId) {
          self = a;
          break;
        }
      }
      if (self == null) return;
      final current = nguoiDungHienTai;
      if (current == null || current.id != userId) return;
      current.policies = locPolicyHopLe(self.policies);
      LocalStorage.instance.writeUserPolicies(userId, current.policies);
      notifyListeners();
    } on LoiServiceLts catch (e) {
      if (e.status == 403 || e.status == 401) return;
    } catch (_) {}
  }

  Future<void> dangNhap(String account, String password) async {
    authLoading = true;
    authError = null;
    notifyListeners();
    try {
      final data = await dangNhapService(account.trim(), password);
      _apDungPhien(data);
    } catch (e) {
      accessToken = null;
      refreshToken = null;
      nguoiDungHienTai = null;
      isAuthenticated = false;
      authLoading = false;
      authError = mapAuthError(e);
      sessionChecked = true;
      await LocalStorage.instance.clearTokens();
      notifyListeners();
      rethrow;
    }
  }

  void dangXuat() {
    accessToken = null;
    refreshToken = null;
    nguoiDungHienTai = null;
    isAuthenticated = false;
    authLoading = false;
    authError = null;
    sessionChecked = true;
    LocalStorage.instance.clearTokens();
    notifyListeners();
  }

  /// �p token + profile sau login / consume password-reset (mirror web).
  Future<void> apDungPhienTuDangNhap(PhienDangNhap data) async {
    _apDungPhien(data);
  }

  Future<void> lamMoiPhien() async {
    final current = refreshToken;
    if (current == null) {
      isAuthenticated = false;
      sessionChecked = true;
      notifyListeners();
      return;
    }
    try {
      final data = await lamMoiTokenService(current);
      _apDungPhien(data);
    } on LoiServiceLts catch (e) {
      if (e.status == 401) resetPhienHetHan();
    } catch (_) {
      // Lỗi mạng: giữ phiên hiện tại, thử lại sau.
    }
  }

  /// Kiểm tra + khôi phục phiên khi mở app (mirror kiemTraVaKhoiPhucPhien).
  Future<void> kiemTraVaKhoiPhucPhien() async {
    if (sessionChecked) return;
    authLoading = true;
    notifyListeners();

    final savedAccess = LocalStorage.instance.readAccessToken();
    final savedRefresh = LocalStorage.instance.readRefreshToken();
    if (savedAccess == null ||
        savedAccess.isEmpty ||
        savedRefresh == null ||
        savedRefresh.isEmpty) {
      accessToken = null;
      refreshToken = null;
      isAuthenticated = false;
      authLoading = false;
      sessionChecked = true;
      notifyListeners();
      return;
    }

    // Hydrate token trước để 401 auto-refresh dùng được.
    accessToken = savedAccess;
    refreshToken = savedRefresh;

    void apDungUserTuToken(String a, String r,
        {String? id, String? account, String? fullName}) {
      accessToken = a;
      refreshToken = r;
      nguoiDungHienTai = _taoNguoiDung(
        id: id ?? '',
        account: account ?? '',
        fullName: fullName,
      );
      isAuthenticated = true;
      authLoading = false;
      sessionChecked = true;
      if (nguoiDungHienTai != null) {
        LocalStorage.instance
            .writeUserPolicies(nguoiDungHienTai!.id, nguoiDungHienTai!.policies);
      }
      notifyListeners();
      if (id != null && id.isNotEmpty) {
        _lamGiauPoliciesTuServer(a, id);
        _kiemTraHasPin(a);
        _taiLaiAnhDaiDienNoiBo();
        _taiLaiChuKyNoiBo();
      }
    }

    try {
      // Validate phiên bằng API JWT-only (không cần ACCOUNT_MANAGER).
      await layTrangThaiBaoMatService(savedAccess);
      final payload = docJwtPayload(savedAccess);
      if (payload == null ||
          payload['sub'] == null ||
          payload['account'] == null) {
        throw LoiServiceLts(401, thongBaoHetPhien);
      }
      apDungUserTuToken(accessToken!, refreshToken!,
          id: payload['sub']?.toString(),
          account: payload['account']?.toString(),
          fullName: payload['fullName']?.toString());
    } catch (e) {
      final laHetPhien = (e is LoiServiceLts && e.status == 401) ||
          (e.toString().contains('Hết phiên'));
      if (!laHetPhien) {
        // Lỗi mạng / 5xx: vẫn hydrate JWT + cache, không logout.
        final payload = docJwtPayload(savedAccess);
        if (payload != null &&
            payload['sub'] != null &&
            payload['account'] != null) {
          apDungUserTuToken(savedAccess, savedRefresh,
              id: payload['sub']?.toString(),
              account: payload['account']?.toString(),
              fullName: payload['fullName']?.toString());
          return;
        }
        resetPhienHetHan();
        return;
      }
      try {
        final data = await lamMoiTokenService(savedRefresh);
        _apDungPhien(data);
      } catch (_) {
        resetPhienHetHan();
      }
    }
  }

  /// Đổi mật khẩu — BE trả cặp token mới, cập nhật phiên.
  Future<void> doiMatKhau(String currentPassword, String newPassword) async {
    final token = accessToken;
    if (token == null) throw LoiServiceLts(401, 'Chưa đăng nhập.');
    final data = await doiMatKhauService(token, currentPassword, newPassword);
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    isAuthenticated = true;
    LocalStorage.instance.writeTokens(data.accessToken, data.refreshToken);
    notifyListeners();
  }

  /// Tải lại bytes ảnh đại diện (404 "Không tìm thấy" → bỏ qua).
  Future<void> _taiLaiAnhDaiDienNoiBo() async {
    final user = nguoiDungHienTai;
    final token = accessToken;
    if (user == null || token == null) return;
    try {
      final bytes = await layAnhDaiDienService(token);
      user.avatarBytes = Uint8List.fromList(bytes);
      notifyListeners();
    } on LoiServiceLts catch (e) {
      if (e.status == 404) return;
    } catch (_) {}
  }

  /// Upload ảnh đại diện mới rồi tải lại.
  Future<void> taiAnhDaiDienMoi(List<int> bytes, String filename) async {
    final token = accessToken;
    if (token == null) throw LoiServiceLts(401, 'Chưa đăng nhập.');
    await taiAnhDaiDienService(token, bytes, filename);
    await _taiLaiAnhDaiDienNoiBo();
  }

  /// Tải lại bytes chữ ký.
  Future<void> _taiLaiChuKyNoiBo() async {
    final user = nguoiDungHienTai;
    final token = accessToken;
    if (user == null || token == null) return;
    try {
      final bytes = await layChuKyService(token);
      user.signatureBytes = Uint8List.fromList(bytes);
      notifyListeners();
    } on LoiServiceLts catch (e) {
      if (e.status == 404) return;
    } catch (_) {}
  }

  /// Upload chữ ký mới rồi tải lại.
  Future<void> taiChuKyMoi(List<int> bytes, String filename) async {
    final token = accessToken;
    if (token == null) throw LoiServiceLts(401, 'Chưa đăng nhập.');
    await taiChuKyService(token, bytes, filename);
    await _taiLaiChuKyNoiBo();
  }

  void requestCalcPane(int pane) {
    pendingCalcPane = pane;
    notifyListeners();
  }

  void consumeCalcPane() {
    pendingCalcPane = null;
  }

  Timer? _debounce;

  Future<void> bootstrap() async {
    await LocalStorage.instance.init();
    _caiDatQuanLyPhien();

    // Theme
    final tm = LocalStorage.instance.readThemeMode();
    themeMode = tm == 'light'
        ? ThemeMode.light
        : tm == 'dark'
            ? ThemeMode.dark
            : ThemeMode.system;

    // Load defaults từ assets, override bằng local nếu có
    materials =
        LocalStorage.instance.readMaterials() ?? await _loadMaterialsAsset();
    constants =
        LocalStorage.instance.readConstants() ?? await _loadConstantsAsset();
    profitTable =
        LocalStorage.instance.readProfit() ?? await _loadProfitAsset();

    history = LocalStorage.instance.readHistory();
    if (history.isEmpty) {
      history = await _loadHistoryAsset();
      if (history.isNotEmpty) await LocalStorage.instance.writeHistory(history);
    }
    productionOrders = LocalStorage.instance.readLSX();
    thongBaoList = LocalStorage.instance
        .readThongBao()
        .map((e) => ThongBao.fromJson(e))
        .toList();

    notifyListeners();
    _recompute();

    // Khôi phục phiên đăng nhập (nếu có token đã lưu).
    await kiemTraVaKhoiPhucPhien();

    // Nếu đã đăng nhập → fetch LichSu + LSX từ server (override cache local).
    if (isAuthenticated) {
      await taiPricingTuServerSauKhiLogin();
    }
  }

  static Future<List<MaterialDef>> _loadMaterialsAsset() async {
    final raw = await rootBundle.loadString('assets/data/materials.json');
    final list = jsonDecode(raw);
    if (list is List) {
      return list
          .map((e) => MaterialDef.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
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
    return AppConstants.fromJson(
        (jsonDecode(raw) as Map).cast<String, dynamic>());
  }

  static Future<List<ProfitRow>> _loadProfitAsset() async {
    final raw = await rootBundle.loadString('assets/data/profitTable.json');
    final j = jsonDecode(raw);
    final rows = (j is Map ? j['rows'] : j) as List;
    return rows
        .map((e) => ProfitRow.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
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
    isDirty = true;
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

  static bool _isLayerKey(String key) => [
        'layer1Id',
        'layer2Id',
        'layer3Id',
        'layer4Id',
        'layer5Id'
      ].contains(key);

  Timer? _thicknessTimer;

  void _scheduleThicknessOptimization() {
    _thicknessTimer?.cancel();
    _thicknessTimer =
        Timer(const Duration(milliseconds: 300), _runThicknessOptimization);
  }

  void _runThicknessOptimization() {
    if (!EngineService.instance.isReady) return;
    final i = currentInput.raw;
    final target = (i['targetThickness'] as num?)?.toInt() ?? 0;
    if (target <= 0) return;

    final layerKeys = [
      'layer1Id',
      'layer2Id',
      'layer3Id',
      'layer4Id',
      'layer5Id'
    ];
    final hasLayer = layerKeys.any((k) => (i[k] as String?) != null);
    if (!hasLayer) return;

    try {
      final inputJson = jsonEncode(currentInput.toJson());
      final matsJson = jsonEncode(materials.map((m) => m.toJson()).toList());
      final code =
          'globalThis.LTS.optimizeThickness(${jsonEncode(inputJson)},${jsonEncode(matsJson)})';
      final res = EngineService.instance.evaluateCode(code);
      if (res == null || res.isError) return;
      final decoded = jsonDecode(res.stringResult);
      if (decoded == null || (decoded as Map).containsKey('error')) return;
      final optResult = decoded as Map<String, dynamic>;
      final overrides =
          optResult['optimizedMicOverrides'] as Map<String, dynamic>?;
      final layerIds = optResult['optimizedLayerIds'] as Map<String, dynamic>?;
      var changed = false;
      var nextInput = currentInput;

      if (layerIds != null && layerIds.isNotEmpty) {
        for (final entry in layerIds.entries) {
          if (nextInput.raw[entry.key] != entry.value) {
            nextInput = nextInput.withField(entry.key, entry.value);
            changed = true;
          }
        }
      }

      if (overrides != null) {
        final currentOverrides =
            (i['micOverrides'] as Map?)?.cast<String, dynamic>() ?? {};
        final newOverrides = Map<String, dynamic>.from(overrides);
        if (jsonEncode(currentOverrides) != jsonEncode(newOverrides)) {
          nextInput = nextInput.withField('micOverrides', newOverrides);
          changed = true;
        }
      }

      if (changed) {
        currentInput = nextInput;
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

  /// GET /pricing-sheet — refresh `history` từ server. Map PricingSheetApi →
  /// HistoryItem qua PricingServerMapper để LichSuScreen UI không đổi.
  /// Không cần token: nếu chưa login thì giữ nguyên `history` local.
  /// Trả về true nếu fetch thành công.
  Future<bool> taiLichSuTuServer({bool force = false}) async {
    if (dangTaiLichSu) return false;
    if (!isAuthenticated || accessToken == null) return false;
    if (!force &&
        lanCuoiTaiLichSu != null &&
        DateTime.now().millisecondsSinceEpoch - lanCuoiTaiLichSu! < 5000) {
      return false; // 5s rate limit (mirror web)
    }
    dangTaiLichSu = true;
    loiLichSu = null;
    notifyListeners();
    try {
      final sheets = await layDanhSachPricingSheetService(accessToken!);
      final mapped = sheets
          .map(PricingServerMapper.pricingSheetToHistoryItem)
          .toList();
      history = mapped;
      // Lưu cache local để offline / lần đầu mở app có data ngay.
      await LocalStorage.instance.writeHistory(history);
      lanCuoiTaiLichSu = DateTime.now().millisecondsSinceEpoch;
      return true;
    } on LoiServiceLts catch (e) {
      loiLichSu = e.message;
      return false;
    } catch (e) {
      loiLichSu = e.toString();
      return false;
    } finally {
      dangTaiLichSu = false;
      notifyListeners();
    }
  }

  /// Auto-refresh 30s khi có tab đang mở LichSu / hub.
  void khoiDongAutoRefreshLichSu() {
    _lichSuAutoRefresh?.cancel();
    _lichSuAutoRefresh = Timer.periodic(
      const Duration(seconds: 30),
      (_) => taiLichSuTuServer(),
    );
  }

  void dungAutoRefreshLichSu() {
    _lichSuAutoRefresh?.cancel();
    _lichSuAutoRefresh = null;
  }

  /// GET /quotations/orders — refresh `productionOrders` từ server.
  Future<bool> taiProductionOrdersTuServer() async {
    if (dangTaiLsx) return false;
    if (!isAuthenticated || accessToken == null) return false;
    dangTaiLsx = true;
    loiLsx = null;
    notifyListeners();
    try {
      final groups = await listQuotationPricingSheetOrdersService(accessToken!);
      final mapped =
          PricingServerMapper.ordersByQuotationToProductionOrders(groups);
      productionOrders = mapped;
      await LocalStorage.instance.writeLSX(productionOrders);
      return true;
    } on LoiServiceLts catch (e) {
      loiLsx = e.message;
      return false;
    } catch (e) {
      loiLsx = e.toString();
      return false;
    } finally {
      dangTaiLsx = false;
      notifyListeners();
    }
  }

  /// Bootstrap: fetch LichSu + LSX từ server (chạy 1 lần sau khi auth xong).
  /// An toàn để gọi nhiều lần — sẽ skip nếu đã fetch gần đây.
  Future<void> taiPricingTuServerSauKhiLogin() async {
    if (!isAuthenticated) return;
    // Chạy song song; lỗi của cái này không chặn cái kia.
    await Future.wait([
      taiLichSuTuServer().catchError((_) => false),
      taiProductionOrdersTuServer().catchError((_) => false),
    ]);
  }

  /// force: nếu true thì cố lưu lên server (kể cả khi trước đó đã
  /// lưu local gần đây). Dùng từ nút "Tạo BG" — muốn lấy id mới.
  Future<void> saveCurrentToHistory({bool force = false}) async {
    if (currentResult == null) return;
    // Ưu tiên server nếu đã login — POST /pricing-sheet rồi reload list.
    if (isAuthenticated && accessToken != null) {
      final ok = await _saveCurrentToHistoryServer();
      if (ok) {
        isDirty = false;
        return;
      }
      // Fall through nếu server fail (mất mạng) — vẫn lưu local.
    }
    await _saveCurrentToHistoryLocal();
  }

  Future<bool> _saveCurrentToHistoryServer() async {
    try {
      final customer = currentInput.customer.trim();
      if (customer.isEmpty) {
        // Server cần customerCodeName hợp lệ → tìm trong list KH.
        // Nếu user chưa chọn KH, fallback local.
        await _saveCurrentToHistoryLocal();
        return true;
      }
      final inputJson = Map<String, dynamic>.of(currentInput.toJson());
      final saleResult = <String, dynamic>{
        'finalPrice': currentResult!.finalPrice,
        'structureText': currentResult!.structureText,
      };
      await taoPricingSheetService(
        accessToken!,
        TaoPricingSheetInput(
          customerCodeName: customer,
          pricingSheetName: currentInput.productName.isNotEmpty
              ? currentInput.productName
              : 'Bảng tính ${DateTime.now().toIso8601String().substring(0, 16)}',
          inputValue: inputJson,
          saleResult: saleResult,
        ),
      );
      // Reload list từ server.
      await taiLichSuTuServer(force: true);
      return true;
    } on LoiServiceLts {
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<void> _saveCurrentToHistoryLocal() async {
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
    isDirty = false;
    notifyListeners();
  }

  /// Lưu trực tiếp danh sách history (dùng khi cập nhật trạng thái từ màn Lịch sử)
  Future<void> saveHistoryDirectly(List<HistoryItem> items) async {
    history = items;
    await LocalStorage.instance.writeHistory(items);
    notifyListeners();
  }

  Future<void> deleteHistory(String id) async {
    if (isAuthenticated && accessToken != null) {
      try {
        // Nếu id là UUID server (không bắt đầu bằng 'H'), DELETE trực tiếp.
        // Nếu id là 'H...' (local), bỏ qua — sẽ tự biến mất sau khi reload.
        if (!id.startsWith('H')) {
          await xoaPricingSheetService(accessToken!, id);
          await taiLichSuTuServer(force: true);
          return;
        }
      } on LoiServiceLts catch (e) {
        loiLichSu = e.message;
        notifyListeners();
        return;
      }
    }
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
