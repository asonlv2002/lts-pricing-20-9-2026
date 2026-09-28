// ═══════════════════════════════════════════════════════════════════════════
// chu_ky — helper chữ ký reviewer cho báo giá (mirror web chu-ky.ts).
//
// BE trả chữ ký dạng WebP (`reviewerSignatureUrl`). @react-pdf (web) chỉ nhận
// PNG/JPG; Flutter `pdf` (MemoryImage) đọc được WebP qua package `image`, nhưng
// DOCX chỉ nhận PNG/JPG → convert WebP → PNG để dùng chung.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:typed_data';

import 'package:image/image.dart' as im;

import '../api/service_lts_client.dart';

/// Tải bytes chữ ký reviewer từ `reviewerSignatureUrl` (path tương đối hoặc URL
/// đầy đủ). Trả null nếu URL rỗng / tải lỗi.
Future<Uint8List?> taiChuKyReviewerBytes(
  String? urlOrPath, {
  required String token,
}) async {
  final url = urlOrPath?.trim();
  if (url == null || url.isEmpty || token.isEmpty) return null;
  try {
    final bytes = await layChuKyReviewerService(url, token: token);
    return Uint8List.fromList(bytes);
  } catch (_) {
    return null;
  }
}

/// True nếu bytes là JPEG (FF D8 FF).
bool laAnhJpg(Uint8List bytes) =>
    bytes.length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;

/// True nếu bytes là PNG (89 50 4E 47).
bool laAnhPng(Uint8List bytes) =>
    bytes.length >= 4 &&
    bytes[0] == 0x89 &&
    bytes[1] == 0x50 &&
    bytes[2] == 0x4E &&
    bytes[3] == 0x47;

/// Convert ảnh bất kỳ (WebP/…) → PNG bytes. Trả null nếu decode thất bại.
/// Ảnh đã là PNG/JPG trả nguyên bytes.
Uint8List? chuanHoaAnhChoDocx(Uint8List bytes) {
  if (laAnhPng(bytes) || laAnhJpg(bytes)) return bytes;
  try {
    final decoded = im.decodeImage(bytes);
    if (decoded == null) return null;
    return Uint8List.fromList(im.encodePng(decoded));
  } catch (_) {
    return null;
  }
}
