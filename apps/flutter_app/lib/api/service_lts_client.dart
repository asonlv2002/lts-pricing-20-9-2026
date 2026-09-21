// ═══════════════════════════════════════════════════════════════════════════
// ServiceLtsClient — HTTP client cho backend service-lts (JWT Bearer).
// Mirror apps/web/src/lib/api/service-lts.ts:
//   - Base URL cấu hình được (mặc định http://10.0.2.2:3001 cho Android emulator)
//   - 401 → tự refresh 1 lần rồi thử lại (qua QuanLyPhien, khớp caiDatQuanLyPhien)
//   - Lỗi server → dichLoiServer (message tiếng Việt) → LoiServiceLts{status, message}
//   - 401 do sai PIN (laLoiPinHttp) KHÔNG refresh/logout
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../store/local_storage.dart';

// ── Lỗi ────────────────────────────────────────────────────────────────────
class LoiServiceLts implements Exception {
  final int status;
  final String message;
  LoiServiceLts(this.status, this.message);

  @override
  String toString() => message;
}

/// 401 do sai PIN / pin-token — KHÔNG phải hết phiên JWT (mirror laLoiPinHttp).
bool laLoiPinHttp(String message) {
  final lower = message.trim().toLowerCase();
  if (lower.isEmpty) return false;
  return lower.contains('invalid pin') ||
      lower.contains('missing pin token') ||
      lower.contains('pin token expired') ||
      lower.contains('pin must be exactly 6 digits') ||
      lower.contains('mã pin');
}

/// Map lỗi auth (login / reset) sang message hiển thị (mirror mapAuthError).
String mapAuthError(Object err) {
  if (err is LoiServiceLts) {
    if (err.status == 400) {
      return 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa. Vui lòng kiểm tra lại.';
    }
    if (err.status == 401) {
      return 'Tài khoản hoặc mật khẩu không đúng.';
    }
    return err.message;
  }
  return err.toString();
}

/// Dịch message EN của BE → tiếng Việt (mirror dichLoiServer).
String dichLoiServer(String message, int status) {
  final text = message.trim();
  final lower = text.toLowerCase();

  if (lower.contains('invalid refresh token')) return 'Hết phiên đăng nhập.';
  if (lower.contains('invalid credentials') || lower.contains('unauthorized')) {
    return 'Tài khoản hoặc mật khẩu không đúng.';
  }
  if (lower.contains('account is missing, invalid, or does not exist')) {
    return 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa. Vui lòng kiểm tra lại.';
  }
  if (lower.contains('missing pin token')) {
    return 'Vui lòng nhập mã PIN để xác nhận thao tác.';
  }
  if (lower.contains('pin token expired')) {
    return 'Phiên xác nhận mã PIN đã hết hạn, vui lòng nhập lại mã PIN.';
  }
  if (lower.contains('invalid pin token')) {
    return 'Mã PIN xác nhận không hợp lệ, vui lòng nhập lại.';
  }
  if (lower.contains('invalid pin')) return 'Mã PIN không đúng.';
  if (lower.contains('pin must be exactly 6 digits')) {
    return 'Mã PIN phải gồm đúng 6 chữ số.';
  }
  if (lower.contains('password reset code must be exactly 6 digits')) {
    return 'Mã đặt lại mật khẩu phải gồm đúng 6 chữ số.';
  }
  if (lower.contains('invalid password reset code')) {
    return 'Mã đặt lại mật khẩu không đúng.';
  }
  if (lower.contains('invalid password reset request')) {
    return 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
  }
  if (lower.contains('password reset request expired')) {
    return 'Yêu cầu đặt lại mật khẩu đã hết hạn.';
  }
  if (lower.contains('password reset request was already reviewed')) {
    return 'Yêu cầu này đã được xử lý trước đó.';
  }
  if (lower.contains('forbidden')) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (lower.contains('not found')) return 'Không tìm thấy dữ liệu yêu cầu.';
  if (lower.contains('already exists') || lower.contains('duplicate')) {
    return 'Dữ liệu này đã tồn tại.';
  }
  if (lower.contains('validation') || lower.contains('bad request')) {
    return 'Dữ liệu nhập chưa hợp lệ.';
  }
  if (lower.contains('network') || lower.contains('fetch failed')) {
    return 'Không kết nối được tới máy chủ.';
  }
  if (status == 429 ||
      lower.contains('too many requests') ||
      lower.contains('rate limit')) {
    return 'Máy chủ đang giới hạn truy cập, vui lòng thử lại sau.';
  }
  if (RegExp(r'^[\x00-\x7F]*$').hasMatch(text)) {
    if (status == 400) return 'Dữ liệu gửi lên chưa hợp lệ.';
    if (status == 401) return 'Hết phiên đăng nhập.';
    if (status == 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (status == 404) return 'Không tìm thấy dữ liệu yêu cầu.';
    if (status == 409) return 'Dữ liệu này đã tồn tại hoặc bị xung đột.';
    if (status == 429) {
      return 'Máy chủ đang giới hạn truy cập, vui lòng thử lại sau.';
    }
    if (status >= 500) return 'Máy chủ đang gặp lỗi, vui lòng thử lại sau.';
  }
  return text;
}

String trichMessageTuBody(dynamic body) {
  if (body is Map) {
    final m = body['message'];
    if (m is List) return m.map((e) => e.toString()).join(', ');
    if (m is String) return m;
  }
  return '';
}

// ── Quản lý phiên (mirror caiDatQuanLyPhien) ───────────────────────────────
typedef TokenProvider = ({String accessToken, String refreshToken})? Function();
typedef TokenSaver = void Function(String accessToken, String refreshToken);
typedef SessionInvalidHandler = void Function();

class QuanLyPhien {
  static TokenProvider? layTokenHienTai;
  static TokenSaver? luuTokenMoi;
  static SessionInvalidHandler? xuLyPhienKhongHopLe;

  static void caiDat({
    required TokenProvider layTokenHienTai,
    required TokenSaver luuTokenMoi,
    required SessionInvalidHandler xuLyPhienKhongHopLe,
  }) {
    QuanLyPhien.layTokenHienTai = layTokenHienTai;
    QuanLyPhien.luuTokenMoi = luuTokenMoi;
    QuanLyPhien.xuLyPhienKhongHopLe = xuLyPhienKhongHopLe;
  }
}

// ── Client ─────────────────────────────────────────────────────────────────
class ServiceLtsClient {
  ServiceLtsClient._();
  static final ServiceLtsClient instance = ServiceLtsClient._();

  /// Mặc định 10.0.2.2 = localhost trên Android emulator.
  /// Override lúc build:
  ///   --dart-define=LTS_SERVICE_URL=https://your-server
  ///   --dart-define-from-file=.dart_defines.json
  /// Hoặc dùng `pnpm flutter:dev` (root) — script tự truyền file config.
  /// Runtime override (đã lưu SharedPreferences qua màn Tài khoản) ưu tiên hơn.
  static const _envUrl = String.fromEnvironment(
    'LTS_SERVICE_URL',
    defaultValue: 'http://10.0.2.2:3001',
  );

  static const httpTimeout = Duration(seconds: 20);

  String get baseUrl {
    final override = LocalStorage.instance.readServiceUrl();
    final url = (override != null && override.isNotEmpty) ? override : _envUrl;
    return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  /// Người dùng nhập URL server trong phần cấu hình (thiết bị thật ngoài LAN).
  Future<void> datServiceUrl(String? url) =>
      LocalStorage.instance.writeServiceUrl(url?.trim());

  bool laPathCongKhai(String path) =>
      path == '/auth/login' ||
      path == '/auth/refresh' ||
      path.startsWith('/auth/password-reset-requests');

  Map<String, String> _headers(String? token) => {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty)
          'Authorization': 'Bearer $token',
      };

  /// Gọi API JSON chung. 401 (hết phiên) → refresh 1 lần rồi thử lại.
  /// [token] trống → tự lấy từ QuanLyPhien (nếu có).
  /// [extraHeaders] — thêm header tùy ý (vd `x-pin-token` cho PIN guard).
  ///   Lưu ý: header này KHÔNG được chứa Authorization — tự add token rồi.
  Future<dynamic> goiService(
    String path, {
    String method = 'GET',
    Object? body,
    String? token,
    Map<String, String>? extraHeaders,
  }) async {
    var url = '${baseUrl}$path';
    final cap = QuanLyPhien.layTokenHienTai?.call();
    var tok = token ?? cap?.accessToken;

    Future<dynamic> gui(String tokenHienTai) async {
      final uri = Uri.parse(url);
      final request = http.Request(method, uri);
      request.headers.addAll(_headers(tokenHienTai));
      if (extraHeaders != null) {
        request.headers.addAll(extraHeaders);
      }
      if (body != null) request.body = jsonEncode(body);
      final streamed =
          await request.send().timeout(httpTimeout, onTimeout: () {
        throw LoiServiceLts(0, 'Không kết nối được tới máy chủ.');
      });
      final res = await http.Response.fromStream(streamed);
      return _xuLyResponse(res, path);
    }

    try {
      return await gui(tok ?? '');
    } on LoiServiceLts catch (e) {
      // 401 do sai PIN → không phải hết phiên, ném nguyên gốc.
      if (e.status != 401 || laLoiPinHttp(e.message)) rethrow;
      // 401 hết phiên → thử refresh 1 lần.
      final capToken = QuanLyPhien.layTokenHienTai?.call();
      if (capToken == null || laPathCongKhai(path)) rethrow;
      final moi = await lamMoiTokenService(capToken.refreshToken);
      QuanLyPhien.luuTokenMoi?.call(moi.accessToken, moi.refreshToken);
      tok = moi.accessToken;
      return await gui(tok);
    }
  }

  dynamic _xuLyResponse(http.Response res, String path) {
    dynamic body;
    if (res.body.isNotEmpty) {
      try {
        body = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {
        body = null;
      }
    }
    final ok = res.statusCode >= 200 && res.statusCode < 300;
    if (!ok) {
      final raw = trichMessageTuBody(body);
      final msg = raw.isNotEmpty
          ? dichLoiServer(raw, res.statusCode)
          : 'Máy chủ trả về lỗi ${res.statusCode}.';
      throw LoiServiceLts(res.statusCode, msg);
    }
    return body;
  }

  // ── Multipart upload (ảnh đại diện / chữ ký) ─────────────────────────────
  Future<dynamic> uploadFile(
    String path,
    String field,
    List<int> bytes,
    String filename, {
    required String token,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final request = http.MultipartRequest('POST', uri)
      ..files.add(http.MultipartFile.fromBytes(field, bytes,
          filename: filename));
    request.headers['Authorization'] = 'Bearer $token';
    final streamed = await request.send().timeout(httpTimeout, onTimeout: () {
      throw LoiServiceLts(0, 'Không kết nối được tới máy chủ.');
    });
    final res = await http.Response.fromStream(streamed);
    return _xuLyResponse(res, path);
  }

  /// Tải blob (ảnh đại diện / chữ ký) — trả raw bytes.
  Future<List<int>> taiBlob(String path, {required String token}) async {
    var tok = token;
    final res = await _goiBlob(path, tok);
    return res.bodyBytes;
  }

  Future<http.Response> _goiBlob(String path, String token) async {
    final uri = Uri.parse('$baseUrl$path');
    final res = await http
        .get(uri, headers: _headers(token))
        .timeout(httpTimeout, onTimeout: () {
      throw LoiServiceLts(0, 'Không kết nối được tới máy chủ.');
    });
    if (res.statusCode >= 200 && res.statusCode < 300) return res;
    dynamic body;
    if (res.body.isNotEmpty) {
      try {
        body = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {}
    }
    final raw = trichMessageTuBody(body);
    final msg = raw.isNotEmpty
        ? dichLoiServer(raw, res.statusCode)
        : 'Máy chủ trả về lỗi ${res.statusCode}.';
    throw LoiServiceLts(res.statusCode, msg);
  }
}

// ── API models (mirror DangNhapApi / TrangThaiBaoMatApi / TaiKhoanApi) ─────

class NguoiDungApi {
  final String id;
  final String account;
  final String? fullName;
  final String? avatarUrl;
  final String? signatureUrl;
  const NguoiDungApi({
    required this.id,
    required this.account,
    this.fullName,
    this.avatarUrl,
    this.signatureUrl,
  });

  factory NguoiDungApi.fromJson(Map<String, dynamic> j) => NguoiDungApi(
        id: j['id']?.toString() ?? '',
        account: j['account']?.toString() ?? '',
        fullName: j['fullName']?.toString(),
        avatarUrl: j['avatarUrl']?.toString(),
        signatureUrl: j['signatureUrl']?.toString(),
      );
}

class PhienDangNhap {
  final String accessToken;
  final String refreshToken;
  final NguoiDungApi user;
  const PhienDangNhap({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory PhienDangNhap.fromJson(Map<String, dynamic> j) => PhienDangNhap(
        accessToken: j['accessToken']?.toString() ?? '',
        refreshToken: j['refreshToken']?.toString() ?? '',
        user: NguoiDungApi.fromJson((j['user'] as Map).cast<String, dynamic>()),
      );
}

class TrangThaiBaoMat {
  final bool hasPin;
  final int pinTokenExpiresIn;
  const TrangThaiBaoMat({required this.hasPin, this.pinTokenExpiresIn = 0});

  factory TrangThaiBaoMat.fromJson(Map<String, dynamic> j) => TrangThaiBaoMat(
        hasPin: j['hasPin'] == true,
        pinTokenExpiresIn: (j['pinTokenExpiresIn'] as num?)?.toInt() ?? 0,
      );
}

class TaiKhoanApi {
  final String id;
  final String account;
  final String fullName;
  final bool isActive;
  final bool isSystem;
  final String? avatarUrl;
  final List<String> policies;
  final String createdAt;
  const TaiKhoanApi({
    required this.id,
    required this.account,
    required this.fullName,
    required this.isActive,
    this.isSystem = false,
    this.avatarUrl,
    this.policies = const [],
    required this.createdAt,
  });

  factory TaiKhoanApi.fromJson(Map<String, dynamic> j) => TaiKhoanApi(
        id: j['id']?.toString() ?? '',
        account: j['account']?.toString() ?? '',
        fullName: (j['fullName']?.toString().isNotEmpty ?? false)
            ? j['fullName'].toString()
            : (j['account']?.toString() ?? ''),
        isActive: j['isActive'] == true,
        isSystem: j['isSystem'] == true || j['is_system'] == true,
        avatarUrl: j['avatarUrl']?.toString(),
        policies: ((j['policies'] as List?) ?? const [])
            .map((p) => p is Map ? (p['code']?.toString() ?? '') : p.toString())
            .where((c) => c.isNotEmpty)
            .toList(),
        createdAt: j['createdAt']?.toString() ?? '',
      );
}

class YeuCauDatLaiMatKhauApi {
  final String id;
  final String userId;
  final String status; // pending | accepted | verified
  final String expiresAt;
  final String createdAt;
  final String account;
  final String? fullName;
  final bool? userIsActive;
  const YeuCauDatLaiMatKhauApi({
    required this.id,
    required this.userId,
    required this.status,
    required this.expiresAt,
    required this.createdAt,
    required this.account,
    this.fullName,
    this.userIsActive,
  });

  factory YeuCauDatLaiMatKhauApi.fromJson(Map<String, dynamic> j) {
    final user = j['user'] is Map ? (j['user'] as Map).cast<String, dynamic>() : null;
    return YeuCauDatLaiMatKhauApi(
      id: j['id']?.toString() ?? '',
      userId: j['userId']?.toString() ?? '',
      status: j['status']?.toString() ?? 'pending',
      expiresAt: j['expiresAt']?.toString() ?? '',
      createdAt: j['createdAt']?.toString() ?? '',
      account: user?['account']?.toString() ?? '',
      fullName: user?['fullName']?.toString(),
      userIsActive: user?['isActive'] as bool?,
    );
  }
}

/// PATCH .../review → {id, decision, code, expiresAt}.
class KetQuaDuyetReset {
  final String id;
  final String decision;
  final String? code;
  final String? expiresAt;
  const KetQuaDuyetReset({
    required this.id,
    required this.decision,
    this.code,
    this.expiresAt,
  });

  factory KetQuaDuyetReset.fromJson(Map<String, dynamic> j) =>
      KetQuaDuyetReset(
        id: j['id']?.toString() ?? '',
        decision: j['decision']?.toString() ?? '',
        code: j['code']?.toString(),
        expiresAt: j['expiresAt']?.toString(),
      );
}

class VaiTroApi {
  final String code;
  final String name;
  final String? description;
  final bool isSystem;
  final List<String> policies;
  const VaiTroApi({
    required this.code,
    required this.name,
    this.description,
    this.isSystem = false,
    this.policies = const [],
  });

  factory VaiTroApi.fromJson(Map<String, dynamic> j) => VaiTroApi(
        code: j['code']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        description: j['description']?.toString(),
        isSystem: j['isSystem'] == true,
        policies: ((j['policies'] as List?) ?? const [])
            .map((p) => p is Map ? (p['code']?.toString() ?? '') : p.toString())
            .where((c) => c.isNotEmpty)
            .toList(),
      );
}

// ── Auth endpoints (mirror các service function của web) ──────────────────

/// POST /auth/login — public.
Future<PhienDangNhap> dangNhapService(String account, String password) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/auth/login',
    method: 'POST',
    body: {'account': account, 'password': password},
  );
  return PhienDangNhap.fromJson((data as Map).cast<String, dynamic>());
}

/// POST /auth/refresh — public.
Future<PhienDangNhap> lamMoiTokenService(String refreshToken) async {
  final data = await ServiceLtsClient.instance
      .goiService('/auth/refresh', method: 'POST', body: {'refreshToken': refreshToken});
  return PhienDangNhap.fromJson((data as Map).cast<String, dynamic>());
}

/// PATCH /auth/me/password — JWT → trả cặp token mới.
Future<PhienDangNhap> doiMatKhauService(
  String token,
  String currentPassword,
  String newPassword,
) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/auth/me/password',
    method: 'PATCH',
    body: {'currentPassword': currentPassword, 'newPassword': newPassword},
    token: token,
  );
  return PhienDangNhap.fromJson((data as Map).cast<String, dynamic>());
}

/// GET /auth/me/security — JWT.
Future<TrangThaiBaoMat> layTrangThaiBaoMatService(String token) async {
  final data = await ServiceLtsClient.instance
      .goiService('/auth/me/security', token: token);
  return TrangThaiBaoMat.fromJson((data as Map).cast<String, dynamic>());
}

/// PUT /auth/me/pin — đặt/thay PIN 6 số (cần mật khẩu hiện tại).
Future<void> datPinService(String token, String currentPassword, String pin) async {
  await ServiceLtsClient.instance.goiService(
    '/auth/me/pin',
    method: 'PUT',
    body: {'currentPassword': currentPassword, 'pin': pin},
    token: token,
  );
}

/// POST /auth/pin/verify — trả pinToken ngắn hạn (~1 phút).
Future<String> xacThucPinService(String token, String pin) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/auth/pin/verify',
    method: 'POST',
    body: {'pin': pin},
    token: token,
  );
  return ((data as Map)['pinToken'] ?? '').toString();
}

/// POST /auth/me/avatar — multipart "avatar".
Future<void> taiAnhDaiDienService(
    String token, List<int> bytes, String filename) async {
  await ServiceLtsClient.instance
      .uploadFile('/auth/me/avatar', 'avatar', bytes, filename, token: token);
}

/// GET /auth/me/avatar — bytes ảnh.
Future<List<int>> layAnhDaiDienService(String token) =>
    ServiceLtsClient.instance.taiBlob('/auth/me/avatar', token: token);

/// POST /auth/signatures — multipart "signature".
Future<void> taiChuKyService(
    String token, List<int> bytes, String filename) async {
  await ServiceLtsClient.instance
      .uploadFile('/auth/signatures', 'signature', bytes, filename, token: token);
}

/// GET /auth/me/signature — bytes chữ ký.
Future<List<int>> layChuKyService(String token) =>
    ServiceLtsClient.instance.taiBlob('/auth/me/signature', token: token);

/// GET /auth/accounts — ACCOUNT_MANAGER.
Future<List<TaiKhoanApi>> layTaiKhoanService(String token) async {
  final data = await ServiceLtsClient.instance
      .goiService('/auth/accounts', token: token);
  return ((data as List?) ?? const [])
      .map((e) => TaiKhoanApi.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

/// POST /auth/password-reset-requests — public.
Future<void> guiYeuCauDatLaiMatKhau(String account) async {
  await ServiceLtsClient.instance.goiService(
    '/auth/password-reset-requests',
    method: 'POST',
    body: {'account': account},
  );
}

/// GET /auth/password-reset-requests — ACCOUNT_MANAGER.
Future<List<YeuCauDatLaiMatKhauApi>> layYeuCauDatLaiMatKhauService(
    String token) async {
  final data = await ServiceLtsClient.instance
      .goiService('/auth/password-reset-requests', token: token);
  return ((data as List?) ?? const [])
      .map((e) =>
          YeuCauDatLaiMatKhauApi.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

/// POST /auth/password-reset-requests/verify — public → {status, id, expiresAt}.
class KetQuaXacThucReset {
  final String status;
  final String id;
  final String? expiresAt;
  const KetQuaXacThucReset(
      {required this.status, required this.id, this.expiresAt});

  factory KetQuaXacThucReset.fromJson(Map<String, dynamic> j) =>
      KetQuaXacThucReset(
        status: j['status']?.toString() ?? '',
        id: j['id']?.toString() ?? '',
        expiresAt: j['expiresAt']?.toString(),
      );
}

Future<KetQuaXacThucReset> xacThucMaDatLaiMatKhauService(
    String account, String code) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/auth/password-reset-requests/verify',
    method: 'POST',
    body: {'account': account.trim(), 'code': code.trim()},
  );
  return KetQuaXacThucReset.fromJson((data as Map).cast<String, dynamic>());
}

/// POST /auth/password-reset-requests/consume — public → tokens như login.
Future<PhienDangNhap> datMatKhauMoiTuYeuCauService(
    String account, String requestId, String newPassword) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/auth/password-reset-requests/consume',
    method: 'POST',
    body: {
      'account': account.trim(),
      'id': requestId,
      'newPassword': newPassword,
    },
  );
  return PhienDangNhap.fromJson((data as Map).cast<String, dynamic>());
}

/// PATCH /auth/password-reset-requests/:id/review — ACCOUNT_MANAGER
/// → PasswordResetReviewApi (chứa mã 6 số gửi người dùng).
Future<KetQuaDuyetReset> duyetYeuCauDatLaiMatKhauService(
    String token, String requestId, String decision) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/auth/password-reset-requests/${Uri.encodeComponent(requestId)}/review',
    method: 'PATCH',
    body: {'decision': decision},
    token: token,
  );
  return KetQuaDuyetReset.fromJson((data as Map).cast<String, dynamic>());
}

// ── Accounts / Policies / Roles ───────────────────────────────────────────

/// POST /auth/accounts — ACCOUNT_MANAGER.
Future<TaiKhoanApi> taoTaiKhoanService(
    String token, String account, String password, String fullName) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/auth/accounts',
    method: 'POST',
    body: {'account': account, 'password': password, 'fullName': fullName},
    token: token,
  );
  return TaiKhoanApi.fromJson((data as Map).cast<String, dynamic>());
}

/// PATCH /auth/accounts/:id/activate — ACCOUNT_MANAGER.
Future<TaiKhoanApi> kichHoatTaiKhoanService(
    String token, String userId, bool isActive) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/auth/accounts/${Uri.encodeComponent(userId)}/activate',
    method: 'PATCH',
    body: {'isActive': isActive},
    token: token,
  );
  return TaiKhoanApi.fromJson((data as Map).cast<String, dynamic>());
}

/// POST /policies/accounts/:userId — USER_POLICY_GRANT.
Future<TaiKhoanApi> capQuyenService(
    String token, String userId, List<String> policyCodes) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/policies/accounts/${Uri.encodeComponent(userId)}',
    method: 'POST',
    body: {'policyCodes': policyCodes},
    token: token,
  );
  return TaiKhoanApi.fromJson((data as Map).cast<String, dynamic>());
}

/// DELETE /policies/accounts/:userId — USER_POLICY_REVOKE.
Future<TaiKhoanApi> thuHoiQuyenService(
    String token, String userId, List<String> policyCodes) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/policies/accounts/${Uri.encodeComponent(userId)}',
    method: 'DELETE',
    body: {'policyCodes': policyCodes},
    token: token,
  );
  return TaiKhoanApi.fromJson((data as Map).cast<String, dynamic>());
}

/// GET /policies — catalog policy từ backend.
Future<List<({String code, String name, String description})>>
    layDanhSachPolicyService(String token) async {
  final data =
      await ServiceLtsClient.instance.goiService('/policies', token: token);
  return ((data as List?) ?? const []).map((e) {
    final m = (e as Map).cast<String, dynamic>();
    return (
      code: m['code']?.toString() ?? '',
      name: m['name']?.toString() ?? '',
      description: m['description']?.toString() ?? '',
    );
  }).toList();
}

/// PUT /auth/roles — tạo/cập nhật vai trò (ROLE_MANAGER).
Future<void> luuVaiTroService(
  String token, {
  required String code,
  required String name,
  required String description,
  required List<String> policyCodes,
}) async {
  await ServiceLtsClient.instance.goiService(
    '/auth/roles',
    method: 'PUT',
    body: {
      'code': code,
      'name': name,
      'description': description,
      'policyCodes': policyCodes,
    },
    token: token,
  );
}

/// DELETE /auth/roles/:code — ROLE_MANAGER.
Future<void> xoaVaiTroService(String token, String code) async {
  await ServiceLtsClient.instance.goiService(
    '/auth/roles/${Uri.encodeComponent(code)}',
    method: 'DELETE',
    token: token,
  );
}

// ── Customers ─────────────────────────────────────────────────────────────

class KhachHangVersion {
  final int version;
  final String organizationName;
  final String? taxCode;
  final String contactName;
  final String phoneNumber;
  final String email;
  final String address;
  final String status;
  final String createdAt;
  const KhachHangVersion({
    required this.version,
    required this.organizationName,
    this.taxCode,
    required this.contactName,
    required this.phoneNumber,
    required this.email,
    required this.address,
    required this.status,
    required this.createdAt,
  });

  factory KhachHangVersion.fromJson(Map<String, dynamic> j) =>
      KhachHangVersion(
        version: (j['version'] as num?)?.toInt() ?? 0,
        organizationName: j['organizationName']?.toString() ?? '',
        taxCode: j['taxCode']?.toString(),
        contactName: j['contactName']?.toString() ?? '',
        phoneNumber: j['phoneNumber']?.toString() ?? '',
        email: j['email']?.toString() ?? '',
        address: j['address']?.toString() ?? '',
        status: j['status']?.toString() ?? '',
        createdAt: j['createdAt']?.toString() ?? '',
      );
}

class KhachHangManager {
  final String? userId;
  final String? account;
  final String fullName;
  const KhachHangManager({this.userId, this.account, required this.fullName});

  factory KhachHangManager.fromJson(Map<String, dynamic> j) =>
      KhachHangManager(
        userId: (j['userId'] ?? j['managerId'])?.toString(),
        account: j['account']?.toString(),
        fullName: j['fullName']?.toString() ?? '',
      );
}

class KhachHang {
  final String id;
  final String codeName;
  final String createdAt;
  final List<KhachHangVersion> versions;
  final List<KhachHangManager> managers;
  final bool isLocked;
  const KhachHang({
    required this.id,
    required this.codeName,
    required this.createdAt,
    required this.versions,
    this.managers = const [],
    this.isLocked = false,
  });

  KhachHangVersion? get moiNhat =>
      versions.isEmpty ? null : versions.first;

  factory KhachHang.fromJson(Map<String, dynamic> j) => KhachHang(
        id: j['id']?.toString() ?? '',
        codeName: j['codeName']?.toString() ?? '',
        createdAt: j['createdAt']?.toString() ?? '',
        versions: ((j['versions'] as List?) ?? const [])
            .map((e) =>
                KhachHangVersion.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        managers: ((j['managers'] as List?) ?? const [])
            .map((e) =>
                KhachHangManager.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        isLocked: j['isLocked'] == true,
      );
}

/// GET /customers.
Future<List<KhachHang>> layKhachHangService(String token) async {
  final data =
      await ServiceLtsClient.instance.goiService('/customers', token: token);
  return ((data as List?) ?? const [])
      .map((e) => KhachHang.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

/// POST /customers — tạo mã khách hàng mới.
Future<KhachHang> taoMaKhachHangService(String token, String codeName) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/customers',
    method: 'POST',
    body: {'codeName': codeName},
    token: token,
  );
  return KhachHang.fromJson((data as Map).cast<String, dynamic>());
}

/// PATCH /customers/:codeName — lưu thông tin khách hàng (tạo version mới).
Future<KhachHang> luuThongTinKhachHangService(
  String token,
  String codeName, {
  required String organizationName,
  String? taxCode,
  required String contactName,
  required String phoneNumber,
  required String email,
  required String address,
  String? status,
  String? changeNote,
}) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/customers/${Uri.encodeComponent(codeName)}',
    method: 'PATCH',
    body: {
      'organizationName': organizationName,
      if (taxCode != null) 'taxCode': taxCode,
      'contactName': contactName,
      'phoneNumber': phoneNumber,
      'email': email,
      'address': address,
      if (status != null) 'status': status,
      if (changeNote != null) 'changeNote': changeNote,
    },
    token: token,
  );
  return KhachHang.fromJson((data as Map).cast<String, dynamic>());
}

/// PUT /customers/:codeName/managers — phân công người phụ trách.
Future<void> luuNguoiPhuTrachKhachHangService(
    String token, String codeName, List<String> managerIds) async {
  await ServiceLtsClient.instance.goiService(
    '/customers/${Uri.encodeComponent(codeName)}/managers',
    method: 'PUT',
    body: {'managerIds': managerIds},
    token: token,
  );
}

/// GET /auth/roles — danh sách vai trò (policies đã flatten).
Future<List<VaiTroApi>> layVaiTroService(String token) async {
  final data =
      await ServiceLtsClient.instance.goiService('/auth/roles', token: token);
  return ((data as List?) ?? const [])
      .map((e) => VaiTroApi.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

// ── Activity logs (mirror BE /activity-logs) ───────────────────────────────

class HoatDongApi {
  final String id;
  final String actorId;
  final String action;
  final String? resourceType;
  final String? resourceId;
  final Map<String, dynamic> metadata;
  final String createdAt;
  const HoatDongApi({
    required this.id,
    required this.actorId,
    required this.action,
    this.resourceType,
    this.resourceId,
    this.metadata = const {},
    required this.createdAt,
  });

  factory HoatDongApi.fromJson(Map<String, dynamic> j) => HoatDongApi(
        id: j['id']?.toString() ?? '',
        actorId: j['actorId']?.toString() ?? '',
        action: j['action']?.toString() ?? '',
        resourceType: j['resourceType']?.toString(),
        resourceId: j['resourceId']?.toString(),
        metadata: (j['metadata'] is Map)
            ? (j['metadata'] as Map).cast<String, dynamic>()
            : const <String, dynamic>{},
        createdAt: j['createdAt']?.toString() ?? '',
      );

  /// Tên hiển thị actor (BE nhét vào metadata.original.actorName).
  String get tenNguoiThucHien =>
      (metadata['original'] is Map
          ? (metadata['original'] as Map)['actorName']?.toString()
          : null) ??
      '';

  /// Tên KH liên quan (BE nhét vào metadata.original.customerName).
  String get tenKhachHang =>
      (metadata['original'] is Map
          ? (metadata['original'] as Map)['customerName']?.toString()
          : null) ??
      resourceId ??
      '';

  /// Nhãn tiếng Việt cho action.
  String get nhanViet {
    switch (action) {
      // Customer
      case 'customer.created':
        return 'Tạo khách hàng mới';
      case 'customer.version_created':
        return 'Cập nhật thông tin';
      case 'customer_manager.replaced':
        return 'Phân công người phụ trách';
      // Pricing sheet
      case 'pricing_sheet.created':
        return 'Tạo bảng tính giá';
      case 'pricing_sheet.deleted':
        return 'Xoá bảng tính giá';
      case 'pricing_sheet.advisor_result_updated':
        return 'Cập nhật kết quả tư vấn';
      // Quotation
      case 'quotation.created':
        return 'Tạo bảng báo giá';
      case 'quotation.status_updated':
        return 'Nộp duyệt báo giá';
      case 'quotation.review_status_updated':
        return 'Duyệt / từ chối báo giá';
      case 'quotation.customer_decided':
        return 'Khách quyết định sheet';
      case 'quotation.deleted':
        return 'Xoá báo giá';
      // LSX (orders)
      case 'quotation_pricing_sheet_order.created':
        return 'Tạo lệnh sản xuất';
      case 'quotation_pricing_sheet_order.input_value_updated':
        return 'Cập nhật thông tin LSX';
      case 'quotation_pricing_sheet_order.approval_updated':
        return 'Duyệt / từ chối LSX';
      case 'quotation_pricing_sheet_order.printed_marked':
        return 'Đánh dấu đã in LSX';
      default:
        return action;
    }
  }

  /// Nhóm filter chip (cho nhật ký tổng — không chỉ KH).
  /// 'created' | 'updated' | 'review' | 'order' | 'assigned' | 'other'
  String get nhom {
    if (action.contains('.created') ||
        action.contains('created')) {
      return 'created';
    }
    if (action.contains('version_created') ||
        action.contains('input_value_updated') ||
        action.contains('advisor_result_updated')) {
      return 'updated';
    }
    if (action.contains('review_status_updated') ||
        action.contains('approval_updated')) {
      return 'review';
    }
    if (action.contains('pricing_sheet_order')) {
      return 'order';
    }
    if (action.contains('manager.replaced') ||
        action.contains('assigned')) {
      return 'assigned';
    }
    return 'other';
  }

  /// Resource type tiếng Việt cho nhóm filter (màn nhật ký tổng).
  String get nhanResource {
    switch (resourceType ?? '') {
      case 'pricing_sheet':
        return 'Bảng tính';
      case 'quotation':
        return 'Báo giá';
      case 'customer':
      case 'customer_manager':
        return 'Khách hàng';
      case 'quotation_pricing_sheet_order':
        return 'Lệnh sản xuất';
      case 'user_policy':
      case 'account':
        return 'Phân quyền';
      case 'price_config':
        return 'Cấu hình';
      default:
        return resourceType ?? 'Khác';
    }
  }
}

/// GET /activity-logs — log toàn hệ thống. BE tự filter theo policy
/// ACTIVITY_MONITOR: có → xem all; không → chỉ của mình.
Future<List<HoatDongApi>> layHoatDongService(String token) async {
  final data =
      await ServiceLtsClient.instance.goiService('/activity-logs', token: token);
  return ((data as List?) ?? const [])
      .map((e) => HoatDongApi.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

/// Lọc chỉ các log liên quan khách hàng (customer.* / customer_manager.*).
List<HoatDongApi> locLogKhachHang(List<HoatDongApi> all) => all
    .where((h) =>
        h.action.startsWith('customer.') ||
        h.action.startsWith('customer_manager.'))
    .toList();

// ── Resolve URL tương đối từ server (avatar / signature) ────────────────────
//
// BE trả về avatarUrl/signatureUrl có thể là path tương đối `/auth/accounts/.../avatar`
// hoặc URL đầy đủ. Tự nối với baseUrl khi cần (mirror resolveServiceLtsUrl web).
String? resolveServiceLtsUrl(String? url) {
  if (url == null || url.isEmpty) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '${ServiceLtsClient.instance.baseUrl}$url';
}

// ── Pricing Sheet (mirror BE /pricing-sheet) ──────────────────────────────
//
// Lưu trữ inputValue (đầy đủ CalculateInput) + saleResult + note + creator.
// Bảng tính "pricing sheet" trên web = bản BE của lịch sử tính giá — thay thế
// localStorage `history` cũ của Flutter. Trước khi gắn vào báo giá, KH phải
// duyệt từng sheet (hasCustomerApproved).

class PricingSheetApi {
  final String id;
  final String? pricingSheetName;
  final String? customerCodeName; // từ customer.codeName
  final String? customerName; // từ metadata.original.customerName
  final Map<String, dynamic> inputValue;
  final Map<String, dynamic>? saleResult;
  final Map<String, dynamic>? masterResult;
  final String? note;
  final String? createdBy;
  final String? updatedBy;
  final String? quotationId; // nếu != null → sheet đã gắn vào báo giá
  final List<String> priceConfigIds;
  final String createdAt;
  final String updatedAt;
  // original.*
  final String? actorName;
  final String? actorAvatarUrl;
  final bool deletable;
  final bool canUpdate;
  final bool canAdminUpdate;
  const PricingSheetApi({
    required this.id,
    this.pricingSheetName,
    this.customerCodeName,
    this.customerName,
    this.inputValue = const {},
    this.saleResult,
    this.masterResult,
    this.note,
    this.createdBy,
    this.updatedBy,
    this.quotationId,
    this.priceConfigIds = const [],
    required this.createdAt,
    required this.updatedAt,
    this.actorName,
    this.actorAvatarUrl,
    this.deletable = false,
    this.canUpdate = false,
    this.canAdminUpdate = false,
  });

  factory PricingSheetApi.fromJson(Map<String, dynamic> j) {
    final customer = j['customer'];
    final original = j['original'] is Map
        ? (j['original'] as Map).cast<String, dynamic>()
        : null;
    return PricingSheetApi(
      id: j['id']?.toString() ?? '',
      pricingSheetName: j['pricingSheetName']?.toString(),
      customerCodeName: customer is Map
          ? customer['codeName']?.toString()
          : j['customerCodeName']?.toString(),
      customerName: original?['customerName']?.toString(),
      inputValue: j['inputValue'] is Map
          ? (j['inputValue'] as Map).cast<String, dynamic>()
          : const <String, dynamic>{},
      saleResult: j['saleResult'] is Map
          ? (j['saleResult'] as Map).cast<String, dynamic>()
          : null,
      masterResult: j['masterResult'] is Map
          ? (j['masterResult'] as Map).cast<String, dynamic>()
          : null,
      note: j['note']?.toString(),
      createdBy: j['createdBy']?.toString(),
      updatedBy: j['updatedBy']?.toString(),
      quotationId: j['quotationId']?.toString(),
      priceConfigIds: ((j['priceConfigIds'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(),
      createdAt: j['createdAt']?.toString() ?? '',
      updatedAt: j['updatedAt']?.toString() ?? '',
      actorName: original?['actorName']?.toString(),
      actorAvatarUrl: original?['actorAvatarUrl']?.toString(),
      deletable: original?['deletable'] == true,
      canUpdate: original?['canUpdate'] == true,
      canAdminUpdate: original?['canAdminUpdate'] == true,
    );
  }

  String? get avatarUrlResolved => resolveServiceLtsUrl(actorAvatarUrl);
}

class TaoPricingSheetInput {
  final String customerCodeName;
  final String pricingSheetName;
  final Map<String, dynamic> inputValue;
  final Map<String, dynamic>? saleResult;
  final String? note;
  const TaoPricingSheetInput({
    required this.customerCodeName,
    required this.pricingSheetName,
    required this.inputValue,
    this.saleResult,
    this.note,
  });
}

/// POST /pricing-sheet — tạo bảng tính mới (cần quyền manager KH hoặc PRICING_SHEET_ADVISOR).
Future<PricingSheetApi> taoPricingSheetService(
  String token,
  TaoPricingSheetInput input,
) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/pricing-sheet',
    method: 'POST',
    body: {
      'customerCodeName': input.customerCodeName,
      'pricingSheetName': input.pricingSheetName,
      'inputValue': input.inputValue,
      if (input.saleResult != null) 'saleResult': input.saleResult,
      if (input.note != null) 'note': input.note,
    },
    token: token,
  );
  return PricingSheetApi.fromJson((data as Map).cast<String, dynamic>());
}

/// GET /pricing-sheet — list bảng tính user có quyền xem.
Future<List<PricingSheetApi>> layDanhSachPricingSheetService(String token) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/pricing-sheet',
    token: token,
  );
  return ((data as List?) ?? const [])
      .map((e) => PricingSheetApi.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

/// GET /pricing-sheet/:id — 1 sheet.
Future<PricingSheetApi> layPricingSheetTheoIdService(
  String token,
  String id,
) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/pricing-sheet/${Uri.encodeComponent(id)}',
    token: token,
  );
  return PricingSheetApi.fromJson((data as Map).cast<String, dynamic>());
}

/// PATCH /pricing-sheet/:id/result — cập nhật inputValue / saleResult / pricingSheetName.
Future<PricingSheetApi> capNhatPricingSheetResultService(
  String token,
  String id, {
  String? pricingSheetName,
  Map<String, dynamic>? inputValue,
  Map<String, dynamic>? saleResult,
}) async {
  final body = <String, dynamic>{};
  if (pricingSheetName != null) body['pricingSheetName'] = pricingSheetName;
  if (inputValue != null) body['inputValue'] = inputValue;
  if (saleResult != null) body['saleResult'] = saleResult;
  final data = await ServiceLtsClient.instance.goiService(
    '/pricing-sheet/${Uri.encodeComponent(id)}/result',
    method: 'PATCH',
    body: body,
    token: token,
  );
  return PricingSheetApi.fromJson((data as Map).cast<String, dynamic>());
}

/// DELETE /pricing-sheet/:id — chỉ xóa được sheet mình tạo và chưa gắn BG.
Future<void> xoaPricingSheetService(String token, String id) async {
  await ServiceLtsClient.instance.goiService(
    '/pricing-sheet/${Uri.encodeComponent(id)}',
    method: 'DELETE',
    token: token,
  );
}

// ── Quotation (Báo giá — mirror BE /quotations) ───────────────────────────
//
// Status server: drafted | submitted | approved | rejected. Local QuoteStatus 8
// giá trị mapping qua bảng MAP_LOCAL_TO_SERVER / MAP_SERVER_TO_LOCAL ở dưới.

enum TrangThaiBaoGiaServer { drafted, submitted, approved, rejected, unknown }

TrangThaiBaoGiaServer chuyenTrangThaiBaoGia(String? updateStatus) {
  final v = (updateStatus ?? '').trim().toLowerCase();
  if (v.isEmpty || v == 'draft' || v == 'drafted') return TrangThaiBaoGiaServer.drafted;
  if (v == 'submitted') return TrangThaiBaoGiaServer.submitted;
  if (v == 'approved') return TrangThaiBaoGiaServer.approved;
  if (v == 'rejected') return TrangThaiBaoGiaServer.rejected;
  return TrangThaiBaoGiaServer.unknown;
}

String nhanTrangThaiBaoGia(TrangThaiBaoGiaServer t) {
  switch (t) {
    case TrangThaiBaoGiaServer.drafted:
      return 'Khởi tạo';
    case TrangThaiBaoGiaServer.submitted:
      return 'Chờ duyệt';
    case TrangThaiBaoGiaServer.approved:
      return 'Đã duyệt';
    case TrangThaiBaoGiaServer.rejected:
      return 'Bị từ chối';
    case TrangThaiBaoGiaServer.unknown:
      return 'Không xác định';
  }
}

class BaoGiaApi {
  final String id;
  final String? customerId;
  final String? productId;
  final String? description;
  final String? quotationName;
  final Map<String, dynamic>? inputValue;
  final TrangThaiBaoGiaServer trangThai;
  final String? statusReason;
  final String? createdBy;
  final String? reviewerId;
  final String? reviewerSignatureUrl;
  final List<PricingSheetApi> pricingSheets;
  // Pricing sheet link mở rộng (từ quotationPricingSheets): thêm hasCustomerApproved + quotationId
  final List<({PricingSheetApi sheet, bool? hasCustomerApproved, String? quotationId})>
      pricingSheetLinks;
  final String? actorName;
  final String? actorAvatarUrl;
  final bool deletable;
  final bool canUpdate;
  final String createdAt;
  final String updatedAt;
  const BaoGiaApi({
    required this.id,
    this.customerId,
    this.productId,
    this.description,
    this.quotationName,
    this.inputValue,
    this.trangThai = TrangThaiBaoGiaServer.unknown,
    this.statusReason,
    this.createdBy,
    this.reviewerId,
    this.reviewerSignatureUrl,
    this.pricingSheets = const [],
    this.pricingSheetLinks = const [],
    this.actorName,
    this.actorAvatarUrl,
    this.deletable = false,
    this.canUpdate = false,
    required this.createdAt,
    required this.updatedAt,
  });

  factory BaoGiaApi.fromJson(Map<String, dynamic> j) {
    final original = j['original'] is Map
        ? (j['original'] as Map).cast<String, dynamic>()
        : null;
    final sheets = ((j['pricingSheets'] as List?) ?? const [])
        .map((e) => PricingSheetApi.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    // quotationPricingSheets (server shape gốc): mỗi entry có hasCustomerApproved + pricingSheet
    final linksRaw = (j['quotationPricingSheets'] as List?) ?? const [];
    final links = linksRaw.map((e) {
      final m = (e as Map).cast<String, dynamic>();
      final sheet = m['pricingSheet'] is Map
          ? PricingSheetApi.fromJson(
              (m['pricingSheet'] as Map).cast<String, dynamic>())
          : null;
      return (
        sheet: sheet,
        hasCustomerApproved: m['hasCustomerApproved'] is bool
            ? m['hasCustomerApproved'] as bool
            : null,
        quotationId: m['quotationId']?.toString(),
      );
    }).where((r) => r.sheet != null).map((r) => (
          sheet: r.sheet!,
          hasCustomerApproved: r.hasCustomerApproved,
          quotationId: r.quotationId,
        )).toList();
    return BaoGiaApi(
      id: j['id']?.toString() ?? '',
      customerId: j['customerId']?.toString(),
      productId: j['productId']?.toString(),
      description: j['description']?.toString(),
      quotationName: j['quotationName']?.toString(),
      inputValue: j['inputValue'] is Map
          ? (j['inputValue'] as Map).cast<String, dynamic>()
          : null,
      trangThai: chuyenTrangThaiBaoGia(j['updateStatus']?.toString()),
      statusReason: j['statusReason']?.toString(),
      createdBy: j['createdBy']?.toString(),
      reviewerId: j['reviewerId']?.toString(),
      reviewerSignatureUrl: j['reviewerSignatureUrl']?.toString(),
      pricingSheets: sheets,
      pricingSheetLinks: links,
      actorName: original?['actorName']?.toString(),
      actorAvatarUrl: original?['actorAvatarUrl']?.toString(),
      deletable: original?['deletable'] == true,
      canUpdate: original?['canUpdate'] == true,
      createdAt: j['createdAt']?.toString() ?? '',
      updatedAt: j['updatedAt']?.toString() ?? '',
    );
  }

  String? get avatarUrlResolved => resolveServiceLtsUrl(actorAvatarUrl);
  String? get reviewerSignatureUrlResolved =>
      resolveServiceLtsUrl(reviewerSignatureUrl);
}

class TaoBaoGiaInput {
  final String customerCodeName;
  final String? description;
  final Map<String, dynamic> inputValue;
  final List<String> pricingSheetIds;
  const TaoBaoGiaInput({
    required this.customerCodeName,
    this.description,
    required this.inputValue,
    required this.pricingSheetIds,
  });
}

/// POST /quotations — tạo báo giá (cần quyền manager KH hoặc QUOTATION_REVIEWER).
Future<BaoGiaApi> taoBaoGiaService(String token, TaoBaoGiaInput input) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations',
    method: 'POST',
    body: {
      'customerCodeName': input.customerCodeName,
      if (input.description != null) 'description': input.description,
      'inputValue': input.inputValue,
      'pricingSheetIds': input.pricingSheetIds,
    },
    token: token,
  );
  return BaoGiaApi.fromJson((data as Map).cast<String, dynamic>());
}

/// GET /quotations — báo giá user có quyền xem (draft chỉ của mình).
Future<List<BaoGiaApi>> layDanhSachBaoGiaService(String token) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations',
    token: token,
  );
  return ((data as List?) ?? const [])
      .map((e) => BaoGiaApi.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

/// GET /quotations/non-draft — báo giá đã nộp chờ duyệt (cần QUOTATION_REVIEWER).
Future<List<BaoGiaApi>> layBaoGiaChoDuyetService(String token) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/non-draft',
    token: token,
  );
  return ((data as List?) ?? const [])
      .map((e) => BaoGiaApi.fromJson((e as Map).cast<String, dynamic>()))
      .toList();
}

/// GET /quotations/:id — 1 báo giá.
Future<BaoGiaApi> layBaoGiaTheoIdService(String token, String id) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/${Uri.encodeComponent(id)}',
    token: token,
  );
  return BaoGiaApi.fromJson((data as Map).cast<String, dynamic>());
}

/// PATCH /quotations/:id/status_update — nộp duyệt (drafted → submitted).
/// Yêu cầu PIN: truyền pinToken qua header x-pin-token.
Future<BaoGiaApi> nopBaoGiaService(
  String token,
  String id, {
  String? pinToken,
}) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/${Uri.encodeComponent(id)}/status_update',
    method: 'PATCH',
    body: const <String, dynamic>{},
    extraHeaders: pinToken != null ? {'x-pin-token': pinToken} : null,
    token: token,
  );
  return BaoGiaApi.fromJson((data as Map).cast<String, dynamic>());
}

/// PATCH /quotations/:id/review_update_status — duyệt/từ chối (QUOTATION_REVIEWER + PIN).
Future<BaoGiaApi> duyetBaoGiaService(
  String token,
  String id, {
  required bool approved,
  String? statusReason,
  String? pinToken,
}) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/${Uri.encodeComponent(id)}/review_update_status',
    method: 'PATCH',
    body: {
      'updateStatus': approved ? 'approved' : 'rejected',
      if (statusReason != null && statusReason.trim().isNotEmpty)
        'statusReason': statusReason.trim(),
    },
    extraHeaders: pinToken != null ? {'x-pin-token': pinToken} : null,
    token: token,
  );
  return BaoGiaApi.fromJson((data as Map).cast<String, dynamic>());
}

/// PATCH /quotations/:id/customer-decide — KH duyệt/bỏ từng sheet.
Future<BaoGiaApi> customerDecideBaoGiaService(
  String token,
  String id, {
  required List<({String pricingSheetId, bool approved})> decisions,
  String? pinToken,
}) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/${Uri.encodeComponent(id)}/customer-decide',
    method: 'PATCH',
    // Body PHẢI là mảng (không wrap), xem service-lts quotations.controller.ts.
    body: decisions
        .map((d) => {
              'pricingSheetId': d.pricingSheetId,
              'hasCustomerApproved': d.approved,
            })
        .toList(),
    extraHeaders: pinToken != null ? {'x-pin-token': pinToken} : null,
    token: token,
  );
  return BaoGiaApi.fromJson((data as Map).cast<String, dynamic>());
}

/// DELETE /quotations/:id — chỉ xóa draft, cần PIN.
Future<void> xoaBaoGiaService(
  String token,
  String id, {
  String? pinToken,
}) async {
  await ServiceLtsClient.instance.goiService(
    '/quotations/${Uri.encodeComponent(id)}',
    method: 'DELETE',
    extraHeaders: pinToken != null ? {'x-pin-token': pinToken} : null,
    token: token,
  );
}

// ── Quotation Pricing Sheet Orders (LSX) ──────────────────────────────────
//
// Mỗi order = 1 LSX tạo từ 1 sheet đã KH-duyệt. Server gom theo quotation
// (QuotationPricingSheetOrdersByQuotationApi).

class QuotationPricingSheetOrderApi {
  final String id;
  final String quotationId;
  final String pricingSheetId;
  final bool hasPrintedOrder;
  final bool hasAdvisorApproved;
  final String? reason;
  /// STT server cấp theo tháng (BE b6028b0) — dùng derive số LSX hiển thị.
  final int versionByMonth;
  final Map<String, dynamic>? inputValue;
  final String createdBy;
  final String? approvedBy;
  final String? approverSignatureUrl;
  final PricingSheetApi? pricingSheet;
  final String? actorName;
  final String? actorAvatarUrl;
  final String createdAt;
  const QuotationPricingSheetOrderApi({
    required this.id,
    required this.quotationId,
    required this.pricingSheetId,
    required this.hasPrintedOrder,
    required this.hasAdvisorApproved,
    this.reason,
    this.versionByMonth = 0,
    this.inputValue,
    required this.createdBy,
    this.approvedBy,
    this.approverSignatureUrl,
    this.pricingSheet,
    this.actorName,
    this.actorAvatarUrl,
    required this.createdAt,
  });

  factory QuotationPricingSheetOrderApi.fromJson(Map<String, dynamic> j) {
    final original = j['original'] is Map
        ? (j['original'] as Map).cast<String, dynamic>()
        : null;
    return QuotationPricingSheetOrderApi(
      id: j['id']?.toString() ?? '',
      quotationId: j['quotationId']?.toString() ?? '',
      pricingSheetId: j['pricingSheetId']?.toString() ?? '',
      hasPrintedOrder: j['hasPrintedOrder'] == true,
      hasAdvisorApproved: j['hasAdvisorApproved'] == true,
      reason: j['reason']?.toString(),
      versionByMonth: (j['versionByMonth'] as num?)?.toInt() ?? 0,
      inputValue: j['inputValue'] is Map
          ? (j['inputValue'] as Map).cast<String, dynamic>()
          : null,
      createdBy: j['createdBy']?.toString() ?? '',
      approvedBy: j['approvedBy']?.toString(),
      approverSignatureUrl:
          original?['approverSignatureUrl']?.toString() ??
              j['approverSignatureUrl']?.toString(),
      pricingSheet: j['pricingSheet'] is Map
          ? PricingSheetApi.fromJson(
              (j['pricingSheet'] as Map).cast<String, dynamic>())
          : null,
      actorName: original?['actorName']?.toString(),
      actorAvatarUrl: original?['actorAvatarUrl']?.toString(),
      createdAt: j['createdAt']?.toString() ?? '',
    );
  }

  String? get approverSignatureUrlResolved =>
      resolveServiceLtsUrl(approverSignatureUrl);
  String? get avatarUrlResolved => resolveServiceLtsUrl(actorAvatarUrl);
}

class QuotationPricingSheetOrdersByQuotationApi {
  final String id;
  final String customerId;
  final String? description;
  final Map<String, dynamic>? inputValue;
  final TrangThaiBaoGiaServer trangThai;
  final String createdBy;
  final String? reviewerId;
  final String? reviewerSignatureUrl;
  final String? actorName;
  final String? actorAvatarUrl;
  final bool deletable;
  final bool canUpdate;
  final String createdAt;
  final String updatedAt;
  final List<QuotationPricingSheetOrderApi> orders;
  const QuotationPricingSheetOrdersByQuotationApi({
    required this.id,
    required this.customerId,
    this.description,
    this.inputValue,
    this.trangThai = TrangThaiBaoGiaServer.unknown,
    required this.createdBy,
    this.reviewerId,
    this.reviewerSignatureUrl,
    this.actorName,
    this.actorAvatarUrl,
    this.deletable = false,
    this.canUpdate = false,
    required this.createdAt,
    required this.updatedAt,
    this.orders = const [],
  });

  factory QuotationPricingSheetOrdersByQuotationApi.fromJson(
      Map<String, dynamic> j) {
    final original = j['original'] is Map
        ? (j['original'] as Map).cast<String, dynamic>()
        : null;
    return QuotationPricingSheetOrdersByQuotationApi(
      id: j['id']?.toString() ?? '',
      customerId: j['customerId']?.toString() ?? '',
      description: j['description']?.toString(),
      inputValue: j['inputValue'] is Map
          ? (j['inputValue'] as Map).cast<String, dynamic>()
          : null,
      trangThai: chuyenTrangThaiBaoGia(j['updateStatus']?.toString()),
      createdBy: j['createdBy']?.toString() ?? '',
      reviewerId: j['reviewerId']?.toString(),
      reviewerSignatureUrl: j['reviewerSignatureUrl']?.toString(),
      actorName: original?['actorName']?.toString(),
      actorAvatarUrl: original?['actorAvatarUrl']?.toString(),
      deletable: original?['deletable'] == true,
      canUpdate: original?['canUpdate'] == true,
      createdAt: j['createdAt']?.toString() ?? '',
      updatedAt: j['updatedAt']?.toString() ?? '',
      orders: ((j['orders'] as List?) ?? const [])
          .map((e) => QuotationPricingSheetOrderApi.fromJson(
              (e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }
}

class CreateQuotationPricingSheetOrdersResponseApi {
  final String quotationId;
  final int createdCount;
  final List<QuotationPricingSheetOrderApi> orders;
  const CreateQuotationPricingSheetOrdersResponseApi({
    required this.quotationId,
    required this.createdCount,
    this.orders = const [],
  });
  factory CreateQuotationPricingSheetOrdersResponseApi.fromJson(
      Map<String, dynamic> j) =>
      CreateQuotationPricingSheetOrdersResponseApi(
        quotationId: j['quotationId']?.toString() ?? '',
        createdCount: (j['createdCount'] as num?)?.toInt() ?? 0,
        orders: ((j['orders'] as List?) ?? const [])
            .map((e) => QuotationPricingSheetOrderApi.fromJson(
                (e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

/// GET /quotations/orders — list orders gom theo quotation.
Future<List<QuotationPricingSheetOrdersByQuotationApi>>
    listQuotationPricingSheetOrdersService(String token) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/orders',
    token: token,
  );
  return ((data as List?) ?? const [])
      .map((e) => QuotationPricingSheetOrdersByQuotationApi.fromJson(
          (e as Map).cast<String, dynamic>()))
      .toList();
}

/// GET /quotations/orders/:id — 1 order (deep-link).
Future<QuotationPricingSheetOrderApi> getQuotationPricingSheetOrderService(
  String token,
  String id,
) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/orders/${Uri.encodeComponent(id)}',
    token: token,
  );
  return QuotationPricingSheetOrderApi.fromJson(
      (data as Map).cast<String, dynamic>());
}

/// POST /quotations/:id/create-orders — tạo orders từ sheet đã KH-duyệt (PIN).
Future<CreateQuotationPricingSheetOrdersResponseApi>
    createQuotationPricingSheetOrdersService(
  String token,
  String quotationId, {
  String? pinToken,
}) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/${Uri.encodeComponent(quotationId)}/create-orders',
    method: 'POST',
    extraHeaders: pinToken != null ? {'x-pin-token': pinToken} : null,
    token: token,
  );
  return CreateQuotationPricingSheetOrdersResponseApi.fromJson(
      (data as Map).cast<String, dynamic>());
}

/// PATCH /quotations/orders/:id — cập nhật inputValue.
Future<QuotationPricingSheetOrderApi> updateQuotationPricingSheetOrderService(
  String token,
  String id, {
  required Map<String, dynamic> inputValue,
}) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/orders/${Uri.encodeComponent(id)}',
    method: 'PATCH',
    body: {'inputValue': inputValue},
    token: token,
  );
  return QuotationPricingSheetOrderApi.fromJson(
      (data as Map).cast<String, dynamic>());
}

/// PATCH /quotations/orders/:id/approval — advisor duyệt/từ chối (ORDER_REVIEWER + PIN).
Future<QuotationPricingSheetOrderApi>
    updateQuotationPricingSheetOrderApprovalService(
  String token,
  String id, {
  required bool approved,
  String? reason,
  String? pinToken,
}) async {
  final data = await ServiceLtsClient.instance.goiService(
    '/quotations/orders/${Uri.encodeComponent(id)}/approval',
    method: 'PATCH',
    body: {
      'hasAdvisorApproved': approved,
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    },
    extraHeaders: pinToken != null ? {'x-pin-token': pinToken} : null,
    token: token,
  );
  return QuotationPricingSheetOrderApi.fromJson(
      (data as Map).cast<String, dynamic>());
}

// ── Mapping local QuoteStatus (8 gia tri) ↔ server (4) ──────────────────
//
// Local `history.quoteStatus` hiện có 8 gia trị (drafted/sent/pending_approval/
// approved/completed/rejected/cancelled/expired). Server chỉ 4 giá trị. Khi lưu
// lên server: mapping 8→4. Khi đọc về: 4→8 để UI hiển thị lifecycle cũ.

const _kMapLocalToServer = <String, String>{
  'drafted': 'drafted',
  'pending_approval': 'submitted',
  'approved': 'approved',
  'sent': 'approved', // local "đã gửi KH" ≈ server "approved"
  'rejected': 'rejected',
};
const _kMapServerToLocal = <String, String>{
  'drafted': 'drafted',
  'submitted': 'pending_approval',
  'approved': 'approved',
  'rejected': 'rejected',
};

String? quoteStatusToServerString(String? local) {
  if (local == null) return null;
  return _kMapLocalToServer[local];
}

String serverToQuoteStatusString(String? server) {
  final v = (server ?? '').toLowerCase();
  return _kMapServerToLocal[v] ?? 'drafted';
}
