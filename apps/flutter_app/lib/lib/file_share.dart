// ═══════════════════════════════════════════════════════════════════════════
// file_share — lưu bytes ra file tạm rồi chia sẻ (share sheet) hoặc mở.
// Dùng cho DOCX (PDF dùng Printing.sharePdf của package printing).
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:io';
import 'dart:typed_data';

import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Ghi [bytes] ra thư mục tạm với tên [fileName] rồi mở share sheet.
Future<void> chiaSeTep(
  Uint8List bytes,
  String fileName, {
  bool xemTruoc = false,
}) async {
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}${Platform.pathSeparator}$fileName');
  await file.writeAsBytes(bytes, flush: true);
  await SharePlus.instance.share(
    ShareParams(
      files: [XFile(file.path)],
      fileNameOverrides: [fileName],
    ),
  );
}
