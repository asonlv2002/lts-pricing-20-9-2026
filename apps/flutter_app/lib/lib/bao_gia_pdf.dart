// ═══════════════════════════════════════════════════════════════════════════
// bao_gia_pdf — xuất "Bảng báo giá" A4 (mirror web buildBaoGiaHtmlV2 / exportBaoGiaToPDF).
// Bảng sản phẩm: mỗi sản phẩm = các mốc số lượng (tiers) + trục in; cuối cùng
// cộng tiền hàng + VAT. Điều khoản + chữ ký ở trang cuối.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import 'package:lts_pricing/engine/models.dart';

import '../theme/format.dart';

/// 1 dòng mốc số lượng của 1 sản phẩm báo giá.
class BaoGiaTier {
  final double quantity;
  final double unitPrice; // giá ghi báo giá (đ/đơn vị)
  const BaoGiaTier({required this.quantity, required this.unitPrice});
  double get total => quantity * unitPrice;
}

/// 1 nhóm sản phẩm (1 dòng báo giá gộp nhiều tier).
class BaoGiaGroup {
  final String productName;
  final String description;
  final String unit;
  final List<BaoGiaTier> tiers;
  final double? cylinderTotal;
  final String? cylinderDescription;
  const BaoGiaGroup({
    required this.productName,
    required this.description,
    required this.unit,
    required this.tiers,
    this.cylinderTotal,
    this.cylinderDescription,
  });
}

/// Dữ liệu báo giá cần cho PDF.
class BaoGiaPdfInput {
  final String customer;
  final String quoteCode;
  final String date;
  final String? address;
  final List<BaoGiaGroup> groups;
  final double vatRate; // % (đã ×100) cho hàng hóa
  final double vatCylinderRate; // % cho trục in
  final List<String> notes; // điều khoản đã format
  final String? reviewerSignatureName;
  const BaoGiaPdfInput({
    required this.customer,
    this.quoteCode = '',
    this.date = '',
    this.address,
    required this.groups,
    this.vatRate = 0,
    this.vatCylinderRate = 10,
    this.notes = const [],
    this.reviewerSignatureName,
  });
}

class BaoGiaPdf {
  BaoGiaPdf._();

  static Future<Uint8List> build(BaoGiaPdfInput it) async {
    final doc = pw.Document();

    final allTierTotal = it.groups.fold<double>(
        0, (s, g) => s + g.tiers.fold<double>(0, (ss, t) => ss + t.total));
    final allCylTotal =
        it.groups.fold<double>(0, (s, g) => s + (g.cylinderTotal ?? 0));
    final grand = allTierTotal + allCylTotal;
    final tienVat = allTierTotal * it.vatRate / 100 +
        allCylTotal * it.vatCylinderRate / 100;
    final tongCong = grand + tienVat;

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (ctx) => [
          _header(it),
          pw.SizedBox(height: 10),
          pw.Center(
            child: pw.Text('BẢNG BÁO GIÁ',
                style:
                    pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
          ),
          pw.SizedBox(height: 6),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('Kính gửi: ${it.customer}',
                  style: const pw.TextStyle(fontSize: 10)),
              if (it.quoteCode.isNotEmpty)
                pw.Text('Số: ${it.quoteCode}',
                    style: const pw.TextStyle(fontSize: 10)),
            ],
          ),
          if (it.address != null && it.address!.isNotEmpty)
            pw.Text('Địa chỉ: ${it.address}',
                style: const pw.TextStyle(fontSize: 10)),
          pw.SizedBox(height: 4),
          pw.Text(
              'Chúng tôi xin trân trọng gửi đến quý khách hàng bảng báo giá bao bì chi tiết như sau:',
              style: const pw.TextStyle(fontSize: 10)),
          pw.SizedBox(height: 8),
          _table(it, allTierTotal, allCylTotal, tienVat, tongCong),
          if (it.notes.isNotEmpty) ...[
            pw.SizedBox(height: 10),
            pw.Text('ĐIỀU KHOẢN:',
                style: pw.TextStyle(
                    fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            for (final n in it.notes)
              pw.Text(n, style: const pw.TextStyle(fontSize: 9)),
          ],
          pw.SizedBox(height: 24),
          _signatures(it),
        ],
      ),
    );
    return doc.save();
  }

  static pw.Widget _header(BaoGiaPdfInput it) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(border: pw.Border.all(width: 1)),
      child: pw.Row(children: [
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('CÔNG TY CP LAI TRƯỜNG SƠN',
                  style: pw.TextStyle(
                      fontSize: 12, fontWeight: pw.FontWeight.bold)),
              pw.Text('LTS Pricing — Phần mềm báo giá bao bì',
                  style: const pw.TextStyle(fontSize: 8)),
            ],
          ),
        ),
        pw.Text(it.date.isEmpty ? _today() : it.date,
            style: const pw.TextStyle(fontSize: 9)),
      ]),
    );
  }

  static pw.Widget _table(
    BaoGiaPdfInput it,
    double allTierTotal,
    double allCylTotal,
    double tienVat,
    double tongCong,
  ) {
    final rows = <List<String>>[];
    rows.add(['STT', 'Tên hàng', 'Mô tả', 'ĐVT', 'Số lượng', 'Đơn giá VND', 'Thành tiền VND']);
    var stt = 1;
    for (final g in it.groups) {
      for (final t in g.tiers) {
        rows.add([
          '$stt',
          g.productName,
          g.description,
          g.unit,
          Fmt.n(t.quantity),
          Fmt.n(t.unitPrice),
          Fmt.n(t.total),
        ]);
        stt++;
      }
      if (g.cylinderTotal != null && g.cylinderTotal! > 0) {
        rows.add([
          '$stt',
          'Trục in',
          g.cylinderDescription ?? '',
          'bộ',
          '1',
          Fmt.n(g.cylinderTotal!),
          Fmt.n(g.cylinderTotal!),
        ]);
        stt++;
      }
    }
    rows.add(['', '', '', '', '', 'CỘNG TIỀN HÀNG:', Fmt.n(allTierTotal)]);
    rows.add(['', '', '', '', '', 'THUẾ GTGT:', Fmt.n(tienVat)]);
    rows.add(['', '', '', '', '', 'TỔNG THANH TOÁN:', Fmt.n(tongCong)]);

    return pw.TableHelper.fromTextArray(
      cellStyle: const pw.TextStyle(fontSize: 8),
      headerStyle:
          pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold),
      headerDecoration: const pw.BoxDecoration(color: PdfColors.grey200),
      headerAlignment: pw.Alignment.center,
      cellAlignments: {
        0: pw.Alignment.center,
        4: pw.Alignment.centerRight,
        5: pw.Alignment.centerRight,
        6: pw.Alignment.centerRight,
      },
      columnWidths: const {
        0: pw.FlexColumnWidth(0.6),
        1: pw.FlexColumnWidth(2),
        2: pw.FlexColumnWidth(3.4),
        3: pw.FlexColumnWidth(0.8),
        4: pw.FlexColumnWidth(1.2),
        5: pw.FlexColumnWidth(1.4),
        6: pw.FlexColumnWidth(1.6),
      },
      data: rows,
    );
  }

  static pw.Widget _signatures(BaoGiaPdfInput it) {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
      children: [
        pw.Column(children: [
          pw.Text('KHÁCH HÀNG',
              style:
                  pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 40),
          pw.Text('', style: const pw.TextStyle(fontSize: 9)),
        ]),
        pw.Column(children: [
          pw.Text('P. KINH DOANH',
              style:
                  pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 40),
          pw.Text(it.reviewerSignatureName ?? '',
              style: const pw.TextStyle(fontSize: 9)),
        ]),
      ],
    );
  }

  static String _today() {
    final d = DateTime.now();
    return 'Ngày ${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  static Future<void> xemTruoc(Uint8List bytes, String name) =>
      Printing.layoutPdf(onLayout: (_) => bytes, name: name);

  static Future<void> chiaSe(Uint8List bytes, String name) =>
      Printing.sharePdf(bytes: bytes, filename: name);
}

/// Helper: dựng `BaoGiaPdfInput` từ dữ liệu server (BaoGiaApi) — mirror
/// `buildHistoryItemFromServerData` + `buildGroups` web (đơn giản hóa: 1 tier/sheet).
BaoGiaPdfInput buildBaoGiaPdfInput({
  required String customer,
  required String quoteCode,
  required String date,
  String? address,
  required List<
          ({
            String productName,
            String description,
            String unit,
            double quantity,
            double unitPrice,
            double? cylinderTotal,
            String? cylinderDescription,
          })>
      lines,
  Map<String, dynamic>? terms,
  String? reviewerSignatureName,
}) {
  double numOr(dynamic v, [double d = 0]) =>
      v is num ? v.toDouble() : d;

  final vatRate = terms == null
      ? 0.0
      : (terms['vatRate'] == -1
          ? numOr(terms['vatCustom'])
          : numOr(terms['vatRate']));
  final vatCyl = numOr(terms?['vatCylinderRate'], 10);

  final notes = <String>[];
  final tol = numOr(terms?['quantityTolerance'], 10);
  notes.add(
      '- Số lượng thành phẩm có thể tăng hoặc giảm so với đơn đặt hàng: ±${tol.round()}%');
  if ((terms?['techRequirement'] as String?)?.trim().isNotEmpty ?? false) {
    notes.add('- Yêu cầu kỹ thuật: ${terms!['techRequirement']}');
  }
  if (vatRate > 0 || vatCyl > 0) {
    notes.add(
        '- Thuế VAT: ${vatRate.round()}% đối với hàng hóa, ${vatCyl.round()}% đối với trục in');
  } else {
    notes.add('- Chưa bao gồm thuế VAT');
  }
  if ((terms?['paymentTerms'] as String?)?.trim().isNotEmpty ?? false) {
    notes.add('- ${terms!['paymentTerms']}');
  }
  if ((terms?['deliveryTime'] as String?)?.trim().isNotEmpty ?? false) {
    notes.add('- Thời gian giao hàng: ${terms!['deliveryTime']}');
  }
  if ((terms?['notes'] as String?)?.trim().isNotEmpty ?? false) {
    notes.add('- Ghi chú: ${terms!['notes']}');
  }

  final groups = lines
      .map((l) => BaoGiaGroup(
            productName: l.productName,
            description: l.description,
            unit: l.unit,
            tiers: [
              BaoGiaTier(quantity: l.quantity, unitPrice: l.unitPrice),
            ],
            cylinderTotal: l.cylinderTotal,
            cylinderDescription: l.cylinderDescription,
          ))
      .toList();

  return BaoGiaPdfInput(
    customer: customer,
    quoteCode: quoteCode,
    date: date,
    address: address,
    groups: groups,
    vatRate: vatRate,
    vatCylinderRate: vatCyl,
    notes: notes,
    reviewerSignatureName: reviewerSignatureName,
  );
}

/// Đơn vị hiển thị theo input (m²/túi/m).
String donViBaoGia(Map<String, dynamic> input) {
  if (input['productType'] == 'mang') return 'm²';
  return 'túi';
}

/// Placeholder để giữ import `models` (MaterialDef dùng cho caller khác).
typedef BaoGiaMaterial = MaterialDef;
