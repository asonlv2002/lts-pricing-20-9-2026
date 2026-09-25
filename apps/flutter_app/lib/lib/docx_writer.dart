// ═══════════════════════════════════════════════════════════════════════════
// docx_writer — sinh file .docx (OOXML) tối giản, không phụ thuộc template.
// Dùng cho xuất DOCX báo giá / LSX trên Flutter (web dùng lib `docx` npm).
// Hỗ trợ: đoạn văn (paragraph) + bảng (table) + cỡ chữ/đậm + căn lề.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:convert';
import 'dart:typed_data';

import 'package:archive/archive.dart';

/// Căn lề ô/đoạn.
enum DocxAlign { left, center, right }

/// 1 ô trong bảng.
class DocxCell {
  final String text;
  final bool bold;
  final DocxAlign align;
  final int? colSpan;
  final int? rowSpan;
  const DocxCell(
    this.text, {
    this.bold = false,
    this.align = DocxAlign.left,
    this.colSpan,
    this.rowSpan,
  });
}

/// Khối nội dung: đoạn văn hoặc bảng.
sealed class DocxBlock {
  const DocxBlock();
}

class DocxParagraph extends DocxBlock {
  final String text;
  final bool bold;
  final int sizeHalfPt; // cỡ chữ (half-point; 20 = 10pt)
  final DocxAlign align;
  const DocxParagraph(
    this.text, {
    this.bold = false,
    this.sizeHalfPt = 22,
    this.align = DocxAlign.left,
  });
}

class DocxTable extends DocxBlock {
  final List<List<DocxCell>> rows;
  final List<int>? columnWidthsDxa;
  const DocxTable(this.rows, {this.columnWidthsDxa});
}

class DocxWriter {
  DocxWriter._();

  /// Sinh bytes .docx từ danh sách block.
  static Uint8List build(List<DocxBlock> blocks) {
    final body = StringBuffer();
    for (final b in blocks) {
      if (b is DocxParagraph) {
        body.write(_paragraphXml(b));
      } else if (b is DocxTable) {
        body.write(_tableXml(b));
      }
    }

    final documentXml = '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>$body<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body>
</w:document>''';

    final archive = Archive();
    void add(String name, String content) {
      final bytes = utf8.encode(content);
      archive.addFile(ArchiveFile(name, bytes.length, bytes));
    }

    add('[Content_Types].xml', _contentTypes);
    add('_rels/.rels', _rels);
    add('word/document.xml', documentXml);
    add('word/styles.xml', _styles);
    add('docProps/core.xml', _coreProps);
    add('docProps/app.xml', _appProps);

    return Uint8List.fromList(ZipEncoder().encodeBytes(archive));
  }

  static String _esc(String s) => s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

  static String _align(DocxAlign a) => switch (a) {
        DocxAlign.left => 'left',
        DocxAlign.center => 'center',
        DocxAlign.right => 'right',
      };

  static String _paragraphXml(DocxParagraph p) {
    final runs = p.text.split('\n').map((line) {
      return '<w:p><w:pPr><w:jc w:val="${_align(p.align)}"/></w:pPr>'
          '<w:r><w:rPr><w:sz w:val="${p.sizeHalfPt}"/>'
          '${p.bold ? '<w:b/>' : ''}</w:rPr>'
          '<w:t xml:space="preserve">${_esc(line)}</w:t></w:r></w:p>';
    }).join();
    return runs;
  }

  static String _tableXml(DocxTable t) {
    final widths = t.columnWidthsDxa;
    final cols = widths != null
        ? '<w:tblGrid>${widths.map((w) => '<w:gridCol w:w="$w"/>').join()}</w:tblGrid>'
        : '';
    final rowsXml = StringBuffer();
    for (final row in t.rows) {
      final cells = StringBuffer();
      for (int i = 0; i < row.length; i++) {
        final c = row[i];
        final w = widths != null && i < widths.length ? widths[i] : null;
        final span = c.colSpan != null && c.colSpan! > 1
            ? '<w:gridSpan w:val="${c.colSpan}"/>'
            : '';
        final vm = c.rowSpan != null && c.rowSpan! > 1
            ? '<w:vMerge w:val="restart"/>'
            : '';
        cells.write('<w:tc><w:tcPr>${w != null ? '<w:tcW w:w="$w" w:type="dxa"/>' : ''}$span$vm'
            '<w:vAlign w:val="center"/></w:tcPr>'
            '<w:p><w:pPr><w:jc w:val="${_align(c.align)}"/></w:pPr>'
            '<w:r><w:rPr><w:sz w:val="20"/>${c.bold ? '<w:b/>' : ''}</w:rPr>'
            '<w:t xml:space="preserve">${_esc(c.text)}</w:t></w:r></w:p></w:tc>');
      }
      rowsXml.write('<w:tr>$cells</w:tr>');
    }
    return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>'
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>'
        '<w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>'
        '<w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>'
        '</w:tblBorders></w:tblPr>$cols$rowsXml</w:tbl>';
  }

  static const _contentTypes = '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>''';

  static const _rels = '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>''';

  static const _styles = '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
<w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
</w:styles>''';

  static String get _coreProps {
    final now = DateTime.now().toUtc().toIso8601String();
    return '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>LTS Pricing</dc:title><dc:creator>LTS Pricing</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">$now</dcterms:created>
</cp:coreProperties>''';
  }

  static const _appProps = '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
<Application>LTS Pricing</Application>
</Properties>''';
}
