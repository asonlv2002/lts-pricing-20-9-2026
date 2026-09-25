// ═══════════════════════════════════════════════════════════════════════════
// lsx_docx — xuất Lệnh Sản Xuất ra .docx (mirror web lsxExport.ts, bản gọn).
// Nội dung khớp với PDF `_buildPdfBytes` trong lsx_screen.dart.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:typed_data';

import '../theme/format.dart';
import 'docx_writer.dart';
import 'lsx_nang_cao.dart';

class LsxDocx {
  LsxDocx._();

  static Uint8List build({
    required String soLsx,
    required Map<String, dynamic> snapshot,
    required Map<String, dynamic> manual,
    List<LsxNangCaoRow> nangCaoSpec = const [],
  }) {
    String sv(dynamic v) => v?.toString() ?? '';

    final blocks = <DocxBlock>[
      const DocxParagraph('CÔNG TY CP LAI TRƯỜNG SƠN',
          bold: true, sizeHalfPt: 24),
      const DocxParagraph('Ký mã hiệu: QT.ISO-22-BM02', sizeHalfPt: 18),
      const DocxParagraph('Lần ban hành: 02 — 01/03/2025', sizeHalfPt: 18),
      const DocxParagraph(''),
      const DocxParagraph('LỆNH SẢN XUẤT',
          bold: true, sizeHalfPt: 32, align: DocxAlign.center),
      DocxParagraph('Số: $soLsx',
          sizeHalfPt: 22, align: DocxAlign.center),
      const DocxParagraph(''),
      const DocxParagraph('I. THÔNG TIN SẢN PHẨM', bold: true, sizeHalfPt: 22),
      DocxTable(
        [
          [const DocxCell('Khách hàng', bold: true), DocxCell(sv(snapshot['customer']))],
          [const DocxCell('Tên sản phẩm', bold: true), DocxCell(sv(snapshot['productName']))],
          if (sv(manual['msp']).isNotEmpty)
            [const DocxCell('Mã sản phẩm', bold: true), DocxCell(sv(manual['msp']))],
          [const DocxCell('Cấu trúc', bold: true), DocxCell(sv(snapshot['structure']))],
          [const DocxCell('Loại SP', bold: true), DocxCell(sv(snapshot['productType']))],
          if (sv(manual['quyCachNote']).isNotEmpty)
            [const DocxCell('Quy cách', bold: true), DocxCell(sv(manual['quyCachNote']))],
          if (sv(manual['quyCachCuon']).isNotEmpty)
            [const DocxCell('Quy cách cuộn', bold: true), DocxCell(sv(manual['quyCachCuon']))],
          [const DocxCell('Khổ trải (m)', bold: true), DocxCell(sv(snapshot['spreadWidth']))],
          [const DocxCell('Bước cắt (m)', bold: true), DocxCell(sv(snapshot['cutStep']))],
          [const DocxCell('Số màu', bold: true), DocxCell(sv(snapshot['numColors']))],
          [const DocxCell('Số lượng', bold: true), DocxCell(Fmt.n(snapshot['quantity'] as num? ?? 0))],
          if (sv(manual['soLuongDHNote']).isNotEmpty)
            [const DocxCell('SL đơn hàng', bold: true), DocxCell(sv(manual['soLuongDHNote']))],
        ],
        columnWidthsDxa: const [3600, 5400],
      ),
      const DocxParagraph(''),
      const DocxParagraph('II. THÔNG TIN LỆNH', bold: true, sizeHalfPt: 22),
      DocxTable(
        [
          [const DocxCell('Ngày phát hành', bold: true), DocxCell(sv(manual['issuedDate']))],
          [const DocxCell('Người lập', bold: true), DocxCell(sv(manual['preparedBy']))],
          [const DocxCell('Người duyệt', bold: true), DocxCell(sv(manual['approvedBy']))],
          if (sv(manual['deliveryDate']).isNotEmpty)
            [const DocxCell('Ngày giao hàng', bold: true), DocxCell(sv(manual['deliveryDate']))],
          if (sv(manual['deliveryNotes']).isNotEmpty)
            [const DocxCell('Yêu cầu giao hàng', bold: true), DocxCell(sv(manual['deliveryNotes']))],
          [const DocxCell('Ghi chú', bold: true), DocxCell(sv(manual['notes']))],
        ],
        columnWidthsDxa: const [3600, 5400],
      ),
    ];

    if (nangCaoSpec.isNotEmpty) {
      blocks.add(const DocxParagraph(''));
      blocks.add(const DocxParagraph('III. ĐẶC TẢ KỸ THUẬT (CHỐT)',
          bold: true, sizeHalfPt: 22));
      blocks.add(DocxTable(
        [
          [
            const DocxCell('Công đoạn', bold: true),
            const DocxCell('Vật liệu', bold: true),
            const DocxCell('Khổ màng', bold: true),
            const DocxCell('Thành phẩm', bold: true),
            const DocxCell('Phi hao', bold: true),
          ],
          for (final r in nangCaoSpec)
            [
              DocxCell(r.congDoan),
              DocxCell(r.vatLieu),
              DocxCell(_khoMangText(r)),
              DocxCell(r.thanhPham?.toString() ?? '—'),
              DocxCell(r.phiHao?.toString() ?? '—'),
            ],
        ],
        columnWidthsDxa: const [2200, 2400, 1600, 1400, 1400],
      ));
    }

    blocks.addAll([
      const DocxParagraph(''),
      const DocxParagraph(''),
      const DocxParagraph('Người lập\t\t\tNgười duyệt',
          bold: true, sizeHalfPt: 20, align: DocxAlign.center),
      const DocxParagraph(''),
      const DocxParagraph(''),
      const DocxParagraph(''),
      DocxParagraph('${sv(manual['preparedBy'])}\t\t\t${sv(manual['approvedBy'])}',
          sizeHalfPt: 18, align: DocxAlign.center),
    ]);

    return DocxWriter.build(blocks);
  }

  static String _khoMangText(LsxNangCaoRow r) {
    if (r.khoMangLabel != null && r.khoMangLabel!.trim().isNotEmpty) {
      return r.khoMangLabel!;
    }
    if (r.khoMang != null && r.khoMang! > 0) {
      return '${(r.khoMang! * 1000).round()}mm';
    }
    return '—';
  }
}
