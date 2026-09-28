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

/// Đoạn văn chứa ảnh (PNG/JPG) — mirror `ImageRun` (docx npm).
class DocxImageParagraph extends DocxBlock {
  /// Bytes ảnh gốc (PNG/JPG). WebP phải convert sang PNG trước.
  final Uint8List bytes;
  final String extension; // 'png' | 'jpg'
  final int widthPx;
  final int heightPx;
  final DocxAlign align;
  const DocxImageParagraph(
    this.bytes, {
    this.extension = 'png',
    this.widthPx = 130,
    this.heightPx = 50,
    this.align = DocxAlign.center,
  });
}

class DocxWriter {
  DocxWriter._();

  /// Sinh bytes .docx từ danh sách block.
  static Uint8List build(List<DocxBlock> blocks) {
    final body = StringBuffer();
    final media = <({String name, Uint8List bytes})>[];
    final imageRels = StringBuffer();
    var imgIdx = 0;
    for (final b in blocks) {
      if (b is DocxParagraph) {
        body.write(_paragraphXml(b));
      } else if (b is DocxTable) {
        body.write(_tableXml(b));
      } else if (b is DocxImageParagraph) {
        imgIdx++;
        final ext = b.extension.toLowerCase() == 'jpg' ? 'jpg' : 'png';
        final name = 'image$imgIdx.$ext';
        final rid = 'rIdImg$imgIdx';
        media.add((name: name, bytes: b.bytes));
        imageRels.write(
            '<Relationship Id="$rid" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/$name"/>');
        body.write(_imageXml(b, rid));
      }
    }

    final documentXml = '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>$body<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body>
</w:document>''';

    final documentRels = '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
$imageRels</Relationships>''';

    final archive = Archive();
    void add(String name, String content) {
      final bytes = utf8.encode(content);
      archive.addFile(ArchiveFile(name, bytes.length, bytes));
    }

    add('[Content_Types].xml', _contentTypes());
    add('_rels/.rels', _rels);
    add('word/document.xml', documentXml);
    add('word/_rels/document.xml.rels', documentRels);
    add('word/styles.xml', _styles);
    add('docProps/core.xml', _coreProps);
    add('docProps/app.xml', _appProps);
    for (final m in media) {
      archive.addFile(
          ArchiveFile('word/media/${m.name}', m.bytes.length, m.bytes));
    }

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

  /// Đoạn văn chứa ảnh inline (EMU: 1px ≈ 9525 EMU).
  static String _imageXml(DocxImageParagraph img, String rid) {
    const emuPerPx = 9525;
    final cx = img.widthPx * emuPerPx;
    final cy = img.heightPx * emuPerPx;
    return '<w:p><w:pPr><w:jc w:val="${_align(img.align)}"/></w:pPr><w:r>'
        '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
        '<wp:extent cx="$cx" cy="$cy"/>'
        '<wp:docPr id="1" name="Signature"/>'
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Signature"/>'
        '<pic:cNvPicPr/></pic:nvPicPr>'
        '<pic:blipFill><a:blip r:embed="$rid"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>'
        '</w:r></w:p>';
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

  static String _contentTypes() => '''
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="jpg" ContentType="image/jpeg"/>
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
