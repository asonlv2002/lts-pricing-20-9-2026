// ═══════════════════════════════════════════════════════════════════════════
// bao_gia_docx — xuất "Bảng báo giá" ra .docx (mirror web exportBaoGiaToDocx).
// Dùng chung dữ liệu `BaoGiaPdfInput` với PDF để đảm bảo nội dung khớp.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:typed_data';

import '../theme/format.dart';
import 'bao_gia_pdf.dart';
import 'docx_writer.dart';

class BaoGiaDocx {
  BaoGiaDocx._();

  static Uint8List build(BaoGiaPdfInput it) {
    final allTierTotal = it.groups.fold<double>(
        0, (s, g) => s + g.tiers.fold<double>(0, (ss, t) => ss + t.total));
    final allCylTotal =
        it.groups.fold<double>(0, (s, g) => s + (g.cylinderTotal ?? 0));
    final grand = allTierTotal + allCylTotal;
    final tienVat = allTierTotal * it.vatRate / 100 +
        allCylTotal * it.vatCylinderRate / 100;
    final tongCong = grand + tienVat;

    final blocks = <DocxBlock>[
      const DocxParagraph('CÔNG TY CP LAI TRƯỜNG SƠN',
          bold: true, sizeHalfPt: 24),
      const DocxParagraph('LTS Pricing — Phần mềm báo giá bao bì', sizeHalfPt: 18),
      const DocxParagraph(''),
      const DocxParagraph('BẢNG BÁO GIÁ',
          bold: true, sizeHalfPt: 32, align: DocxAlign.center),
      DocxParagraph('Kính gửi: ${it.customer}', sizeHalfPt: 20),
      if (it.quoteCode.isNotEmpty)
        DocxParagraph('Số: ${it.quoteCode}', sizeHalfPt: 20),
      if (it.address != null && it.address!.isNotEmpty)
        DocxParagraph('Địa chỉ: ${it.address}', sizeHalfPt: 20),
      if (it.date.isNotEmpty) DocxParagraph('Ngày: ${it.date}', sizeHalfPt: 20),
      const DocxParagraph(''),
      const DocxParagraph(
          'Chúng tôi xin trân trọng gửi đến quý khách hàng bảng báo giá bao bì chi tiết như sau:',
          sizeHalfPt: 20),
      const DocxParagraph(''),
      _table(it, allTierTotal, tienVat, tongCong),
    ];

    if (it.notes.isNotEmpty) {
      blocks.add(const DocxParagraph(''));
      blocks.add(const DocxParagraph('ĐIỀU KHOẢN:', bold: true, sizeHalfPt: 20));
      for (final n in it.notes) {
        blocks.add(DocxParagraph(n, sizeHalfPt: 18));
      }
    }

    blocks.add(const DocxParagraph(''));
    blocks.add(const DocxParagraph(''));
    blocks.add(const DocxParagraph('KHÁCH HÀNG\t\t\tP. KINH DOANH',
        bold: true, sizeHalfPt: 20, align: DocxAlign.center));
    blocks.add(const DocxParagraph(''));
    blocks.add(const DocxParagraph(''));
    blocks.add(const DocxParagraph(''));
    blocks.add(DocxParagraph('\t\t\t${it.reviewerSignatureName ?? ''}',
        sizeHalfPt: 18, align: DocxAlign.center));

    return DocxWriter.build(blocks);
  }

  static DocxTable _table(
    BaoGiaPdfInput it,
    double allTierTotal,
    double tienVat,
    double tongCong,
  ) {
    final rows = <List<DocxCell>>[];
    rows.add([
      const DocxCell('STT', bold: true, align: DocxAlign.center),
      const DocxCell('Tên hàng', bold: true, align: DocxAlign.center),
      const DocxCell('Mô tả', bold: true, align: DocxAlign.center),
      const DocxCell('ĐVT', bold: true, align: DocxAlign.center),
      const DocxCell('Số lượng', bold: true, align: DocxAlign.center),
      const DocxCell('Đơn giá VND', bold: true, align: DocxAlign.center),
      const DocxCell('Thành tiền VND', bold: true, align: DocxAlign.center),
    ]);
    var stt = 1;
    for (final g in it.groups) {
      for (final t in g.tiers) {
        rows.add([
          DocxCell('$stt', align: DocxAlign.center),
          DocxCell(g.productName),
          DocxCell(g.description),
          DocxCell(g.unit, align: DocxAlign.center),
          DocxCell(Fmt.n(t.quantity), align: DocxAlign.right),
          DocxCell(Fmt.n(t.unitPrice), align: DocxAlign.right),
          DocxCell(Fmt.n(t.total), align: DocxAlign.right),
        ]);
        stt++;
      }
      if (g.cylinderTotal != null && g.cylinderTotal! > 0) {
        rows.add([
          DocxCell('$stt', align: DocxAlign.center),
          const DocxCell('Trục in'),
          DocxCell(g.cylinderDescription ?? ''),
          const DocxCell('bộ', align: DocxAlign.center),
          const DocxCell('1', align: DocxAlign.right),
          DocxCell(Fmt.n(g.cylinderTotal!), align: DocxAlign.right),
          DocxCell(Fmt.n(g.cylinderTotal!), align: DocxAlign.right),
        ]);
        stt++;
      }
    }
    rows.add([
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell('CỘNG TIỀN HÀNG:', bold: true, align: DocxAlign.right),
      DocxCell(Fmt.n(allTierTotal), bold: true, align: DocxAlign.right),
    ]);
    rows.add([
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell('THUẾ GTGT:', bold: true, align: DocxAlign.right),
      DocxCell(Fmt.n(tienVat), bold: true, align: DocxAlign.right),
    ]);
    rows.add([
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell(''),
      const DocxCell('TỔNG THANH TOÁN:', bold: true, align: DocxAlign.right),
      DocxCell(Fmt.n(tongCong), bold: true, align: DocxAlign.right),
    ]);

    return DocxTable(
      rows,
      columnWidthsDxa: const [700, 2600, 3200, 900, 1400, 1700, 1900],
    );
  }
}
