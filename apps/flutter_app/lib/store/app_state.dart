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
import 'package:lts_pricing/lib/lsx_so.dart';
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

  /// Orders nhóm theo quotationId — dùng derive mã báo giá YYMM.STT
  /// (mirror web ordersTheoQuotation / useOrdersQuoteCode).
  Map<String, List<OrderCoPhienBan>> get ordersTheoBaoGia {
    final out = <String, List<OrderCoPhienBan>>{};
    for (final o in productionOrders) {
      if (o.quoteId.isEmpty) continue;
      (out[o.quoteId] ??= <OrderCoPhienBan>[]).add(OrderCoPhienBan(
        createdAt: o.createdAt,
        versionByMonth: o.versionByMonth,
      ));
    }
    return out;
  }

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

  // ── Phiên bản cấu hình (price-config, mirror web configVersioning) ──────
  /// Đang bootstrap cấu hình từ server (GET /price-config/latest-version).
  bool dangTaiCauHinh = false;
  String? loiCauHinh;

  /// Bản mới nhất mỗi scope (configName → PriceConfigApi) sau bootstrap.
  Map<String, PriceConfigApi> phienBanMoiNhat = {};

  bool dangLuuPhienBan = false;
  /// Đang tải lịch sử phiên bản — THEO TỪNG scope. Cờ chung 1 bool trước đây
  /// khiến scope mở nhanh sau scope khác bị skip fetch (hiện "Chưa có lịch sử"
  /// nhầm dù BE có data).
  final Set<String> _dangTaiLichSuPhienBanScope = {};
  bool dangTaiLichSuPhienBan(String configName) =>
      _dangTaiLichSuPhienBanScope.contains(configName);

  /// Lịch sử phiên bản đã tải (configName → list, mới nhất đứng đầu).
  Map<String, List<PriceConfigApi>> lichSuPhienBan = {};

  int? _lanCuoiTaiCauHinh;

  int get soThongBaoChuaDoc => thongBaoList.where((t) => !t.daDoc).length;

  void themThongBao(String tieuDe, String loai) {
    final item = ThongBao(
      id: 'N${DateTime.now().millisecondsSinceEpoch}',
      tieuDe: tieuDe,
      loai: loai,
      thoiGian: DateTime.now().toIso8601String(),
      daDoc: false,
    );
    thongBaoList = [item, ...thongBaoList].take(50).toList();
    LocalStorage.instance
        .writeThongBao(thongBaoList.map((t) => t.toJson()).toList());
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
      layTokenHienTai: () => (accessToken != null && refreshToken != null)
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

  Future<void> _apDungPhien(PhienDangNhap data) async {
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
    await LocalStorage.instance
        .writeTokens(data.accessToken, data.refreshToken);
    LocalStorage.instance
        .writeUserPolicies(data.user.id, nguoiDungHienTai!.policies);
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
      await _apDungPhien(data);
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
    await _apDungPhien(data);
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
      await _apDungPhien(data);
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
        LocalStorage.instance.writeUserPolicies(
            nguoiDungHienTai!.id, nguoiDungHienTai!.policies);
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
          apDungUserTuToken(accessToken!, refreshToken!,
              id: payload['sub']?.toString(),
              account: payload['account']?.toString(),
              fullName: payload['fullName']?.toString());
          return;
        }
        resetPhienHetHan();
        return;
      }
      try {
        final tokenLamMoi = refreshToken;
        if (tokenLamMoi == null || tokenLamMoi.isEmpty) {
          resetPhienHetHan();
          return;
        }
        final data = await lamMoiTokenService(tokenLamMoi);
        await _apDungPhien(data);
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
    await LocalStorage.instance
        .writeTokens(data.accessToken, data.refreshToken);
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

  // ── Input updates ────────────────────────────────────────────────────────

  /// Tổng phụ phí in (Nhũ + Phủ mờ + custom keys đã chọn) — mirror
  /// `tinhPhuPhiIn` apps/web/src/store/slices/calculation.ts:65.
  double _tinhPhuPhiIn(Map<String, dynamic> input) {
    final daChon = (input['selectedPrintSurchargeKeys'] as List?)
            ?.map((e) => e.toString())
            .toSet() ??
        const <String>{};
    var tong = 0.0;
    final customs = (constants.raw['customPrintSurcharges'] as List?) ?? const [];
    for (final opt in customs) {
      if (opt is! Map) continue;
      if (daChon.contains(opt['key']?.toString())) {
        tong += ((opt['price'] as num?) ?? 0).toDouble();
      }
    }
    if (input['hasNhu'] == true) {
      tong += ((constants.raw['nhuPrice'] as num?) ?? 0).toDouble();
    }
    if (input['hasMo'] == true) {
      tong += ((constants.raw['moPrice'] as num?) ?? 0).toDouble();
    }
    return tong;
  }

  /// Trọng lượng thùng theo `boxOptionKey` — mirror `layTrongLuongThung`
  /// apps/web/src/lib/engine.ts:35.
  double _layTrongLuongThung(Map<String, dynamic> input) {
    final key = input['boxOptionKey']?.toString();
    if (key != null && key.isNotEmpty && key != 'custom') {
      final opts = (constants.raw['boxOptions'] as List?) ?? const [];
      for (final o in opts) {
        if (o is Map && o['key']?.toString() == key) {
          return ((o['weight'] as num?) ?? 0).toDouble();
        }
      }
    }
    final w = ((input['boxWeight'] as num?) ?? 0).toDouble();
    return w < 0 ? 0 : w;
  }

  /// Đồng bộ các field phái sinh của input — mirror logic `setInput` của web
  /// (apps/web/src/store/slices/calculation.ts:148-270).
  ///
  /// [changed] = tập key vừa đổi (từ `updateInput`). `null` = thay cả input
  /// (load history / reset) → chỉ áp các field "luôn đồng bộ", KHÔNG chạy
  /// các field theo trigger (giữ nguyên giá trị đã lưu như cylLength...).
  Map<String, dynamic> _dongBoInput(
    Map<String, dynamic> input, {
    Set<String>? changed,
  }) {
    final next = Map<String, dynamic>.of(input);
    final co = changed?.contains ?? (String _) => false;

    // numImages: luôn làm tròn ≥1 khi có giá trị.
    final nImgRaw = next['numImages'];
    if (nImgRaw is num && nImgRaw != 0) {
      final v = nImgRaw.round();
      next['numImages'] = v < 1 ? 1 : v;
    }

    final spreadWidth = (next['spreadWidth'] as num?)?.toDouble() ?? 0;
    final numImages = (next['numImages'] as num?)?.toInt() ?? 1;
    final soHinh = numImages > 0 ? numImages : 1;

    // cylLength = max(0.7, spreadWidth × numImages + 0.1)
    if (co('spreadWidth') || co('numImages')) {
      next['cylLength'] = spreadWidth > 0
          ? double.parse(
              (spreadWidth * soHinh + 0.1).clamp(0.7, double.infinity).toStringAsFixed(3))
          : 0.0;
    }

    // cylCircum = cutStep × N (N nhỏ nhất sao cho ≥ 0.4)
    if (co('cutStep')) {
      final buocCat = (next['cutStep'] as num?)?.toDouble() ?? 0;
      if (buocCat > 0) {
        var n = 1;
        while (buocCat * n < 0.4) {
          n++;
        }
        next['cylCircum'] = double.parse((buocCat * n).toStringAsFixed(3));
      } else {
        next['cylCircum'] = 0.0;
      }
    }

    // "Có chia": khổ chia = khổ trải × số con hình / số phần tử
    if (co('hasDivide')) {
      if (next['hasDivide'] != true) {
        next['hasDivide'] = false;
        next['divideElements'] = 1;
        next['divideWidthMm'] = 0;
      } else {
        final soPt = ((next['divideElements'] as num?)?.round() ?? 1);
        next['divideElements'] = soPt < 1 ? 1 : soPt;
        if (spreadWidth > 0) {
          next['divideWidthMm'] =
              ((spreadWidth * 1000 * soHinh) / next['divideElements']).round();
        }
      }
    } else if (next['hasDivide'] == true &&
        (co('divideElements') || co('spreadWidth') || co('numImages'))) {
      final soPt = ((next['divideElements'] as num?)?.round() ?? 1);
      next['divideElements'] = soPt < 1 ? 1 : soPt;
      if (spreadWidth > 0) {
        next['divideWidthMm'] =
            ((spreadWidth * 1000 * soHinh) / next['divideElements']).round();
      }
    }

    // Màng: quy đổi SL gốc (m² | mét) → quantity (m²)
    if (next['productType'] == 'mang' &&
        (co('filmInputQuantity') ||
            co('filmQuantityUnit') ||
            co('spreadWidth') ||
            co('productType'))) {
      final slGoc =
          (next['filmInputQuantity'] as num?)?.toDouble() ?? (next['quantity'] as num?)?.toDouble() ?? 0;
      next['filmInputQuantity'] = slGoc;
      next['quantity'] = next['filmQuantityUnit'] == 'meter'
          ? double.parse((slGoc * spreadWidth).toStringAsFixed(3))
          : slGoc;
    }

    // Bỏ lớp 2 → xóa cấu trúc phụ
    if (co('layer2Id') && (next['layer2Id'] == null)) {
      next['layer2AltId'] = null;
      next['layer2Lengths'] = null;
      next['layer2FrontPart'] = 'main';
      next['layer2PairingMode'] = 'bottom_to_bottom';
    }

    // Màng in: chỉ 1 lớp, phủ mực 100%
    if (next['productType'] == 'mang' && next['filmType'] == 'mangIn') {
      next['coverageRatio'] = 1;
      next['printFilmCustomerGroup'] ??= 'normal';
      next['layer2Id'] = null;
      next['layer2AltId'] = null;
      next['layer2Lengths'] = null;
      next['layer2FrontPart'] = 'main';
      next['layer2PairingMode'] = 'bottom_to_bottom';
      next['layer3Id'] = null;
      next['layer4Id'] = null;
      next['layer5Id'] = null;
    }

    // Loại trục → đơn giá trục
    if (co('cylType')) {
      final cylType = next['cylType']?.toString() ?? 'A';
      if (cylType == 'A') {
        next['cylUnitPrice'] =
            (constants.raw['cylPriceA'] as num?) ?? (constants.raw['cylinderPricePerUnit'] as num?) ?? 0;
      } else if (cylType == 'B') {
        next['cylUnitPrice'] = (constants.raw['cylPriceB'] as num?) ?? 6500000;
      } else {
        final customs = (constants.raw['customCylTypes'] as List?) ?? const [];
        for (final c in customs) {
          if (c is Map && c['key']?.toString() == cylType) {
            next['cylUnitPrice'] = (c['price'] as num?) ?? next['cylUnitPrice'];
            break;
          }
        }
      }
    }

    // Khối lượng phụ kiện — luôn đồng bộ theo cờ + option
    final luaChonQuai = _timHandleOption(next['handleOptionKey']);
    if (next['hasHandle'] == true) {
      next['handleWeight'] =
          luaChonQuai?['weight'] ?? (constants.raw['handleWeight'] as num?) ?? 0;
    } else {
      next['handleWeight'] = 0;
    }
    next['zipperWeight'] =
        next['hasZipper'] == true ? ((constants.raw['zipperWeight'] as num?) ?? 0) : 0;
    next['tapeWeight'] =
        next['hasTape'] == true ? ((constants.raw['tapeWeight'] as num?) ?? 0) : 0;
    next['boxWeight'] = _layTrongLuongThung(next);

    // Phụ phí in (nhu + mờ + custom keys) → metallicSurcharge
    next['metallicSurcharge'] = _tinhPhuPhiIn(next);

    return next;
  }

  Map<String, dynamic>? _timHandleOption(dynamic key) {
    if (key == null) return null;
    final opts = (constants.raw['handleOptions'] as List?) ?? const [];
    for (final o in opts) {
      if (o is Map && o['key']?.toString() == key.toString()) {
        return o.cast<String, dynamic>();
      }
    }
    return null;
  }

  void updateInput(String key, dynamic value) {
    final next = Map<String, dynamic>.of(currentInput.raw);
    next[key] = value;
    currentInput = CalculateInput(_dongBoInput(next, changed: {key}));
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
    // Full replace (load history / reset) → chỉ đồng bộ field "luôn sync",
    // giữ nguyên cylLength/cylCircum/divideWidth đã lưu (mirror web: load item
    // KHÔNG chạy setInput trigger).
    currentInput = CalculateInput(_dongBoInput(next.raw));
    notifyListeners();
    _scheduleRecompute();
  }

  /// Loại hình được giữ khi bấm "Đặt lại" — mirror `loaiHinhGiuLai`
  /// apps/web/src/store/slices/calculation.ts:119.
  Map<String, dynamic> _loaiHinhGiuLai() {
    final input = currentInput.raw;
    if (input['pricingMode'] == 'commercial') {
      return {
        'pricingMode': 'commercial',
        'commercialMode': input['commercialMode'] ?? 'form',
      };
    }
    if (input['pricingMode'] == 'outsource') {
      // Giữ loại "Gia công" nhưng xóa công đoạn + config GC.
      return {'pricingMode': 'outsource'};
    }
    return {'pricingMode': 'internal'};
  }

  /// Đặt lại form nhưng GIỮ loại hình đang dùng — mirror `resetInputGiuLoaiHinh`.
  void resetInputGiuLoaiHinh() {
    final giu = _loaiHinhGiuLai();
    setInput(CalculateInput({...CalculateInput.defaults().raw, ...giu}));
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

      // Mirror web: BE không lưu finalPrice → Flutter tính lại bằng engine.
      // Load 1 batch config pin (priceConfigIds của mọi sheet) qua /by-ids.
      final allPinIds = <String>{};
      for (final s in sheets) {
        for (final id in s.priceConfigIds) {
          final v = id.trim();
          if (v.isNotEmpty) allPinIds.add(v);
        }
      }
      Map<String, PriceConfigApi> pinConfigs = const {};
      if (allPinIds.isNotEmpty) {
        try {
          final cfgs = await layPriceConfigTheoIdsService(
              accessToken!, allPinIds.toList());
          pinConfigs = {
            for (final c in cfgs)
              if (c.id.isNotEmpty) c.id: c,
          };
        } catch (_) {
          // Pin hỏng → fallback config hiện tại (như web fallback).
          pinConfigs = const {};
        }
      }

      final fallbackCtx = EngineCtxTinhGia(
        materials: materials,
        constants: constants,
        profitTable: profitTable,
      );

      // Engine QuickJS tính tuần tự — chia nhỏ batch, cập nhật UI dần để
      // list lớn (hàng trăm sheet) không khựng màn hình.
      final mapped = <HistoryItem>[];
      for (final sheet in sheets) {
        mapped.add(PricingServerMapper.pricingSheetToHistoryItem(
            sheet, fallbackCtx, pinConfigs));
        if (mapped.length % 25 == 0) {
          history = List<HistoryItem>.of(mapped);
          notifyListeners();
          await Future<void>.delayed(Duration.zero);
        }
      }
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

  /// PATCH /quotations/orders/:id/approval — advisor duyệt/từ chối LSX
  /// (mirror web updateOrderApprovalService: ORDER_REVIEWER + PIN).
  /// Ném LoiServiceLts lên caller để sheet PIN giữ mở hiện lỗi
  /// (PIN sai → sheet không đóng). Thành công → reload list LSX.
  Future<void> duyetLsx(
    String orderId,
    bool approved,
    String pinToken, {
    String? reason,
  }) async {
    if (!isAuthenticated || accessToken == null) {
      throw LoiServiceLts(401, 'Cần đăng nhập để duyệt LSX.');
    }
    await updateQuotationPricingSheetOrderApprovalService(
      accessToken!,
      orderId,
      approved: approved,
      reason: reason,
      pinToken: pinToken,
    );
    await taiProductionOrdersTuServer();
  }

  /// Bootstrap: fetch Cấu hình + LichSu + LSX từ server (chạy 1 lần sau khi
  /// auth xong). An toàn để gọi nhiều lần — sẽ skip nếu đã fetch gần đây.
  Future<void> taiPricingTuServerSauKhiLogin() async {
    if (!isAuthenticated) return;
    // Chạy song song; lỗi của cái này không chặn cái kia.
    await Future.wait([
      taiCauHinhTuServer().catchError((_) => false),
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

  // ── Phiên bản cấu hình từ server (P2 — mirror web configVersioning) ──────

  /// Bootstrap cấu hình sau khi auth — GET /price-config/latest-version →
  /// apply từng scope vào working store. Khi đã login, BE là nguồn chân lý
  /// (LS chỉ cache) — mirror web taiCauHinhMoiNhatTuServer (configVersioning.ts:245).
  Future<bool> taiCauHinhTuServer({bool force = false}) async {
    if (!isAuthenticated || accessToken == null) return false;
    if (dangTaiCauHinh) return false;
    if (!force &&
        _lanCuoiTaiCauHinh != null &&
        DateTime.now().millisecondsSinceEpoch - _lanCuoiTaiCauHinh! < 5000) {
      return true;
    }
    dangTaiCauHinh = true;
    loiCauHinh = null;
    notifyListeners();
    try {
      final list = await layPriceConfigMoiNhatService(accessToken!);
      phienBanMoiNhat = {
        for (final pc in list)
          if (pc.configName.isNotEmpty) pc.configName: pc,
      };
      // Apply theo thứ tự scope — production trước PRODUCTION_UPGRADE
      // (4 key CPSX NC không bị production ghi đè nhầm).
      for (final name in thuTuApplyScope) {
        final pc = phienBanMoiNhat[name];
        if (pc != null) {
          await _apDungMotPriceConfig(pc, vietCache: false);
        }
      }
      // Bổ sung NVL mặc định còn thiếu (BE snapshot cũ chưa có NVL mới —
      // mirror web boSungVatLieuMacDinhThieu).
      try {
        final macDinh = await _loadMaterialsAsset();
        final vlSau = boSungVatLieuMacDinhThieu(materials, macDinh);
        if (vlSau.length != materials.length) {
          materials = vlSau;
          await LocalStorage.instance.writeMaterials(materials);
        }
      } catch (_) {}
      _lanCuoiTaiCauHinh = DateTime.now().millisecondsSinceEpoch;
      return true;
    } on LoiServiceLts catch (e) {
      loiCauHinh = e.message;
      return false;
    } catch (e) {
      loiCauHinh = e.toString();
      return false;
    } finally {
      dangTaiCauHinh = false;
      notifyListeners();
      _scheduleRecompute();
    }
  }

  /// Áp 1 PriceConfig (blob) vào working store — CHỈ key non-null
  /// (key thiếu trên BE không xóa data, mirror web apDungDuLieuScope).
  Future<void> _apDungMotPriceConfig(
    PriceConfigApi pc, {
    bool vietCache = true,
  }) async {
    final blob = pc.inputValue;
    if (blob == null) return;
    final name = pc.configName.toUpperCase();
    if (name == 'OUTSOURCE') return;
    var coThayDoi = false;

    final mats = materialsTuBlob(blob);
    if (mats != null) {
      materials = mats;
      coThayDoi = true;
    }
    final profit = profitTuBlob(blob);
    if (profit != null) {
      profitTable = profit;
      coThayDoi = true;
    }
    final keys = constantsTuBlob(name, blob);
    if (keys.isNotEmpty) {
      final raw = Map<String, dynamic>.of(constants.raw);
      raw.addAll(keys);
      constants = AppConstants(raw);
      coThayDoi = true;
    }
    if (vietCache && coThayDoi) {
      await LocalStorage.instance.writeMaterials(materials);
      await LocalStorage.instance.writeConstants(constants);
      await LocalStorage.instance.writeProfit(profitTable);
    }
  }

  /// Xem/apply 1 phiên bản cụ thể vào working store (mirror web
  /// saoChepPhienBanDinhMuc — nút "Xem" trong lịch sử phiên bản).
  Future<void> xemPhienBanCauHinh(PriceConfigApi pc) async {
    await _apDungMotPriceConfig(pc);
    notifyListeners();
    _scheduleRecompute();
  }

  /// Lưu phiên bản mới cho 1 scope từ working store hiện tại (mirror web
  /// taoPhienBanDinhMuc, configVersioning.ts:137). Sau lưu → reload lịch sử
  /// scope + chốt working = bản vừa lưu (list snapshot ≠ working config).
  Future<void> luuPhienBanCauHinh({
    required String configName,
    String? name,
    String effectiveMode = 'month',
    String? effectiveFrom,
  }) async {
    if (!isAuthenticated || accessToken == null) {
      throw LoiServiceLts(401, 'Cần đăng nhập để lưu phiên bản.');
    }
    if (dangLuuPhienBan) return;
    dangLuuPhienBan = true;
    notifyListeners();
    try {
      final scopeData =
          trichXuatDuLieuScope(configName, materials, constants, profitTable);
      final inputValue = <String, dynamic>{
        if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
        'effectiveMode': effectiveMode,
        'effectiveFrom':
            effectiveFrom ?? DateTime.now().toIso8601String().substring(0, 7),
        ...scopeData,
      };
      final PriceConfigApi saved;
      if (configName == 'PRODUCTION_UPGRADE') {
        saved =
            await upsertProductionUpgradePriceConfigService(accessToken!, inputValue);
      } else {
        saved = await upsertPriceConfigService(accessToken!, configName, inputValue);
      }
      // Reload lịch sử scope + chốt working = bản vừa lưu (mirror web).
      await taiLichSuPhienBanCauHinh(configName, force: true);
      final danhSach = lichSuPhienBan[configName] ?? const <PriceConfigApi>[];
      PriceConfigApi? chot;
      for (final pc in danhSach) {
        if (pc.id == saved.id) {
          chot = pc;
          break;
        }
      }
      chot ??= danhSach.isNotEmpty ? danhSach.first : saved;
      await _apDungMotPriceConfig(chot);
      phienBanMoiNhat[configName] = chot;
    } finally {
      dangLuuPhienBan = false;
      notifyListeners();
      _scheduleRecompute();
    }
  }

  /// Tải lịch sử phiên bản 1 scope (mirror web taiLichSuPhienBanTuServer).
  /// Nếu bootstrap chưa từng thấy scope này (latest-version thiếu) → apply
  /// bản mới nhất vào working (rule F5: load history phải apply, không chỉ
  /// nạp list — tránh "list đúng, form sai").
  Future<bool> taiLichSuPhienBanCauHinh(
    String configName, {
    bool force = false,
  }) async {
    if (!isAuthenticated || accessToken == null) return false;
    if (_dangTaiLichSuPhienBanScope.contains(configName)) return false;
    if (!force &&
        lichSuPhienBan.containsKey(configName) &&
        lichSuPhienBan[configName]!.isNotEmpty) {
      return true; // đã có cache — mở màn hình lại không gọi lại API.
    }
    _dangTaiLichSuPhienBanScope.add(configName);
    notifyListeners();
    try {
      final versions = await layLichSuPriceConfigService(accessToken!, configName);
      lichSuPhienBan[configName] = sapXepMoiNhatTruoc(versions);
      if (phienBanMoiNhat[configName] == null &&
          lichSuPhienBan[configName]!.isNotEmpty) {
        final latest = lichSuPhienBan[configName]!.first;
        phienBanMoiNhat[configName] = latest;
        await _apDungMotPriceConfig(latest);
      }
      return true;
    } on LoiServiceLts catch (e) {
      loiCauHinh = e.message;
      return false;
    } catch (e) {
      loiCauHinh = e.toString();
      return false;
    } finally {
      _dangTaiLichSuPhienBanScope.remove(configName);
      notifyListeners();
    }
  }

  /// Xóa 1 phiên bản (cần PRICE_CONFIG_MANAGER — BE cũng chặn). 409 = đang
  /// được pin bởi pricing-sheet, message từ BE hiển thị nguyên văn.
  Future<void> xoaPhienBanCauHinh(String id, String configName) async {
    if (!isAuthenticated || accessToken == null) {
      throw LoiServiceLts(401, 'Cần đăng nhập.');
    }
    await xoaPriceConfigService(accessToken!, id);
    lichSuPhienBan.remove(configName);
    await taiLichSuPhienBanCauHinh(configName, force: true);
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
