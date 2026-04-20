import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, convertInchesToTwip
} from 'docx';
import { writeFileSync } from 'fs';

// ─── Màu sắc ───────────────────────────────────────────────────
const COLOR_HEADER   = '1F4E79';  // xanh đậm
const COLOR_SUB      = '2E75B6';  // xanh nhạt
const COLOR_ACCENT   = 'D6E4F0';  // nền xanh nhạt
const COLOR_WARN     = 'FFF2CC';  // nền vàng (lưu ý)
const COLOR_RED_BG   = 'FFE7E7';  // nền đỏ nhạt
const COLOR_GRAY_BG  = 'F2F2F2';  // nền xám

// ─── Helpers ───────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  run: { color: COLOR_HEADER, bold: true },
});

const h2 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 120 },
  run: { color: COLOR_SUB, bold: true },
});

const h3 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 80 },
  run: { bold: true },
});

const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, size: 24, ...opts })],
  spacing: { after: 120 },
});

const pBold = (text) => p(text, { bold: true });

const bullet = (text, level = 0) => new Paragraph({
  children: [new TextRun({ text, size: 24 })],
  bullet: { level },
  spacing: { after: 80 },
});

const formula = (text) => new Paragraph({
  children: [new TextRun({
    text,
    font: 'Courier New',
    size: 22,
    color: '1A1A6C',
    bold: true,
  })],
  shading: { type: ShadingType.CLEAR, fill: 'EEF4FF' },
  indent: { left: convertInchesToTwip(0.3) },
  spacing: { before: 80, after: 80 },
  border: {
    left: { style: BorderStyle.THICK, size: 8, color: '4472C4' },
  },
});

const note = (text) => new Paragraph({
  children: [new TextRun({ text: '⚠  ' + text, size: 22, italics: true, color: '7B5800' })],
  shading: { type: ShadingType.CLEAR, fill: COLOR_WARN },
  indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  spacing: { before: 80, after: 120 },
});

const divider = () => new Paragraph({
  text: '',
  spacing: { after: 40 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
});

const cellShaded = (text, fill, bold = false) => new TableCell({
  shading: { type: ShadingType.CLEAR, fill },
  children: [new Paragraph({
    children: [new TextRun({ text, size: 22, bold })],
    spacing: { before: 60, after: 60 },
    alignment: AlignmentType.LEFT,
  })],
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
});

const makeTable = (headers, rows) => {
  const headerRow = new TableRow({
    children: headers.map(h => cellShaded(h, COLOR_HEADER.replace('1F4E79','1F4E79'), true)),
    tableHeader: true,
  });

  // Re-do header with white text
  const headerRowReal = new TableRow({
    children: headers.map(h => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: '1F4E79' },
      children: [new Paragraph({
        children: [new TextRun({ text: h, size: 22, bold: true, color: 'FFFFFF' })],
        spacing: { before: 60, after: 60 },
      })],
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    })),
    tableHeader: true,
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map(cell => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? 'FFFFFF' : COLOR_GRAY_BG },
      children: [new Paragraph({
        children: [new TextRun({ text: cell, size: 22 })],
        spacing: { before: 60, after: 60 },
      })],
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRowReal, ...dataRows],
    margins: { top: 80, bottom: 80 },
  });
};

const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ text: '', spacing: { after: 60 } }));

// ─── Nội dung tài liệu ─────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Times New Roman', size: 24 },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top:    convertInchesToTwip(1.0),
          bottom: convertInchesToTwip(1.0),
          left:   convertInchesToTwip(1.2),
          right:  convertInchesToTwip(1.0),
        },
      },
    },
    children: [

      // ══════════════════════════════════════════════
      //  TRANG BÌA
      // ══════════════════════════════════════════════
      new Paragraph({
        children: [new TextRun({ text: 'CÔNG TY CP LAI TRƯỜNG SƠN', size: 28, bold: true, color: COLOR_HEADER })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'TÀI LIỆU NGHIỆP VỤ', size: 24, color: '444444' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'CÔNG THỨC TÍNH GIÁ THÀNH BAO BÌ', size: 40, bold: true, color: COLOR_HEADER })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Phần mềm LTS Pricing', size: 28, color: COLOR_SUB, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Dành cho: Ban Quản lý & Phòng Kinh doanh', size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Ngày ban hành: 20/04/2026  |  Phiên bản: 1.0', size: 22, color: '888888' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1000 },
      }),
      divider(),
      ...sp(2),

      // ══════════════════════════════════════════════
      //  MỤC LỤC
      // ══════════════════════════════════════════════
      h1('MỤC LỤC'),
      p('1.  Tổng quan quy trình tính giá'),
      p('2.  Các khái niệm cơ bản'),
      p('3.  Công đoạn IN (lớp ngoài cùng)'),
      p('4.  Công đoạn GHÉP (các lớp bên trong)'),
      p('5.  Công đoạn CẮT (thành phẩm)'),
      p('6.  Trục in (chi phí khắc trục)'),
      p('7.  Phụ kiện (zipper, quai, băng keo)'),
      p('8.  Đóng gói & Vận chuyển'),
      p('9.  Lãi vay & Hoa hồng'),
      p('10. Bảng lợi nhuận'),
      p('11. Giá bán cuối cùng'),
      p('12. Điểm khác biệt: Túi vs Màng'),
      p('13. Ví dụ minh họa (step-by-step)'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  1. TỔNG QUAN
      // ══════════════════════════════════════════════
      h1('1. TỔNG QUAN QUY TRÌNH TÍNH GIÁ'),
      p('Phần mềm tính giá theo mô hình "từ dưới lên" — bắt đầu từ công đoạn cuối cùng (cắt thành phẩm) rồi ngược lên công đoạn ghép và in. Mỗi công đoạn cộng thêm phế hao vật liệu và chi phí sản xuất riêng.'),
      ...sp(1),
      p('Sơ đồ dây chuyền sản xuất:', { bold: true }),
      ...sp(1),
      new Paragraph({
        children: [new TextRun({ text: '  In (layer 1)  →  Ghép (layer 2, 3, 4, 5)  →  Cắt  →  Thành phẩm giao khách', size: 26, bold: true, color: COLOR_SUB, font: 'Courier New' })],
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.CLEAR, fill: COLOR_ACCENT },
        spacing: { before: 100, after: 200 },
      }),
      ...sp(1),
      p('Nguyên lý vàng:', { bold: true }),
      bullet('Nguyên Vật Liệu (NVL) đầu vào = Thành phẩm + Phế hao — không nhân lên hay nhân xuống theo số lớp, số con hình.'),
      bullet('Tăng số con hình (in nhiều hình song song trên 1 trục) → cuộn ngắn hơn nhưng rộng hơn → tổng diện tích vật liệu KHÔNG THAY ĐỔI.'),
      bullet('Phế hao được cộng vào từng công đoạn, KHÔNG nhân lên.'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  2. KHÁI NIỆM
      // ══════════════════════════════════════════════
      h1('2. CÁC KHÁI NIỆM CƠ BẢN'),
      ...sp(1),
      makeTable(
        ['Thuật ngữ', 'Ý nghĩa', 'Đơn vị'],
        [
          ['Khổ trải', 'Chiều ngang của 1 túi khi mở phẳng ra', 'm'],
          ['Bước cắt', 'Chiều dài của 1 túi (theo chiều cuộn)', 'm'],
          ['Diện tích 1 túi', 'Khổ trải × Bước cắt', 'm²'],
          ['Số con hình', 'Số túi xếp song song ngang trên 1 trục in', 'số nguyên'],
          ['Khổ in/ghép/cắt', '= Khổ trải × Số con hình + 0,02 (m lề)', 'm'],
          ['Chiều dài cuộn NVL', 'Tổng m² ÷ Khổ cuộn', 'm'],
          ['Phế hao', 'Vật liệu tiêu hao trong quá trình chạy máy, không thành sản phẩm', 'm hoặc m²'],
          ['CPSX', 'Chi phí sản xuất — đơn giá gia công mỗi m² tại công đoạn đó', '₫/m²'],
          ['Bảng LN', 'Bảng tra % lợi nhuận dựa trên tổng chi phí sản xuất', '%'],
          ['Layer', 'Lớp vật liệu trong cấu trúc bao bì (tối đa 5 lớp)', '—'],
          ['Màng (mang)', 'Sản phẩm là cuộn màng — số lượng tính theo m²', 'm²'],
          ['Túi (tui)', 'Sản phẩm là túi thành phẩm — số lượng tính theo cái', 'cái'],
        ]
      ),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  3. CÔNG ĐOẠN IN
      // ══════════════════════════════════════════════
      h1('3. CÔNG ĐOẠN IN'),
      p('Đây là công đoạn đầu tiên trong dây chuyền (layer 1 — lớp ngoài cùng của bao bì). Máy in phun mực lên cuộn nguyên liệu thô.'),
      ...sp(1),

      h2('3.1. Đầu vào cần biết'),
      bullet('Số lớp vật liệu, giá mỗi lớp (₫/m²)'),
      bullet('Số màu in (1 → 10 màu)'),
      bullet('Tỉ lệ phủ mực (0 → 1, thường 0.7–0.9)'),
      bullet('Số lượng đặt hàng (cái hoặc m²)'),
      ...sp(1),

      h2('3.2. Tính chiều dài cuộn cần in'),
      p('Chiều dài cuộn ở công đoạn in = chiều dài cắt + toàn bộ phế hao của các công đoạn phía dưới (ghép + cắt):'),
      formula('Chiều dài in  =  Chiều dài cắt  +  Phế hao cắt  +  Tổng phế hao ghép'),
      ...sp(1),

      h2('3.3. Tính phế hao in'),
      p('Phế hao in gồm 2 phần: phế hao khởi máy (cố định theo số màu) và phế hao chạy máy (tỉ lệ với chiều dài cuộn):'),
      formula('Phế hao khởi máy  =  Định mức theo bảng số màu  (₫ → quy ra mét)'),
      formula('Phế hao chạy      =  (Chiều dài in ÷ Hệ số A) × Hệ số B'),
      formula('Phế hao thêm      =  Chiều dài in ÷ Hệ số C × Hệ số D  (nếu cuộn rất dài)'),
      formula('Tổng phế hao in   =  Phế hao khởi máy + Phế hao chạy + Phế hao thêm'),
      note('Hệ số A, B, C, D do bộ phận kỹ thuật cấu hình trong phần mềm. PM không cần nhớ số cụ thể.'),
      ...sp(1),

      h2('3.4. Chi phí in'),
      p('Chi phí in gồm hai phần: chi phí sản xuất (gia công + mực) và chi phí vật liệu lớp 1:'),
      formula('Đơn giá gia công in  =  Số màu × Giá mực/màu × Tỉ lệ phủ mực  +  Chi phí nhân công  +  Phụ phí kim tuyến'),
      formula('Chi phí gia công in  =  Đơn giá gia công  ×  (Chiều dài in + Phế hao)  ×  Khổ in'),
      formula('Chi phí vật liệu in  =  Giá lớp 1 (₫/m²)  ×  (Chiều dài in + Phế hao)  ×  Khổ in'),
      formula('TỔNG CHI PHÍ IN      =  Chi phí gia công  +  Chi phí vật liệu'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  4. CÔNG ĐOẠN GHÉP
      // ══════════════════════════════════════════════
      h1('4. CÔNG ĐOẠN GHÉP (LAMINATION)'),
      p('Sau khi in, máy ghép dán các lớp vật liệu bên trong vào nhau (layer 2, 3, 4, 5). Mỗi lớp ghép thêm làm tăng chiều dày và tính bền của bao bì.'),
      ...sp(1),
      p('Thứ tự xử lý: Layer 2 trước → Layer 3 → Layer 4 → Layer 5 (layer 2 gần thành phẩm nhất).'),
      ...sp(1),

      h2('4.1. Nguyên tắc truyền phế hao'),
      p('Mỗi lớp ghép nhận đầu vào từ lớp trước đó (bao gồm cả phế hao). Phế hao được cộng dồn lên:'),
      formula('Đầu vào lớp ghép 2  =  Chiều dài cắt  +  Phế hao cắt'),
      formula('Đầu vào lớp ghép 3  =  Đầu vào lớp 2  +  Phế hao lớp 2'),
      formula('Đầu vào lớp ghép N  =  Đầu vào lớp (N-1)  +  Phế hao lớp (N-1)'),
      note('Khi thêm nhiều lớp ghép, chi phí chỉ tăng thêm đúng giá trị lớp đó + phế hao tương ứng. Không nhân lên.'),
      ...sp(1),

      h2('4.2. Chi phí mỗi lớp ghép'),
      formula('Phế hao ghép  =  (Chiều dài đầu vào ÷ Hệ số A) × Hệ số B  +  Hệ số C'),
      formula('Chi phí gia công  =  CPSX ghép  ×  (Chiều dài + Phế hao)  ×  Khổ ghép'),
      formula('Chi phí vật liệu  =  Giá lớp N (₫/m²)  ×  (Chiều dài + Phế hao)  ×  Khổ ghép'),
      formula('Chi phí lớp N     =  Chi phí gia công  +  Chi phí vật liệu'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  5. CÔNG ĐOẠN CẮT
      // ══════════════════════════════════════════════
      h1('5. CÔNG ĐOẠN CẮT'),
      p('Máy cắt chia cuộn thành phẩm theo đúng kích thước từng túi. Đây là công đoạn cuối trước khi giao hàng.'),
      ...sp(1),

      h2('5.1. Chiều dài cuộn tại công đoạn cắt'),
      formula('Khổ cắt         =  Khổ trải  ×  Số con hình  +  0,02 m (lề)'),
      formula('Chiều dài cắt (Túi)  =  Bước cắt  ×  Số lượng  ÷  Số con hình'),
      formula('Chiều dài cắt (Màng) =  Tổng m²  ÷  (Khổ trải  ×  Số con hình)'),
      note('Chia cho số con hình vì khổ cuộn đã nhân với số con hình. Tổng m² vật liệu không thay đổi.'),
      ...sp(1),

      h2('5.2. Phế hao cắt'),
      formula('Phế hao cắt  =  (Chiều dài cắt ÷ Hệ số A) × Hệ số B  +  Hệ số C'),
      ...sp(1),

      h2('5.3. CPSX cắt (chỉ áp dụng cho Túi — màng không có công đoạn này)'),
      p('Đơn giá gia công cắt phụ thuộc vào kích thước túi (diện tích mỗi túi):'),
      makeTable(
        ['Kích thước túi (diện tích/cái)', 'Đơn giá gia công', 'Ghi chú'],
        [
          ['Nhỏ hơn 0,07 m²', 'Giá cơ sở × 1,4', 'Túi nhỏ — khó gia công hơn'],
          ['0,07 m² đến 0,2 m²', 'Giá cơ sở × 1,2', 'Túi trung bình'],
          ['Lớn hơn 0,2 m²', 'Giá cơ sở × 0,8', 'Túi lớn — gia công hiệu quả hơn'],
        ]
      ),
      ...sp(1),
      formula('Chi phí cắt  =  CPSX cắt  ×  (Chiều dài cắt + Phế hao)  ×  Khổ cắt'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  6. TRỤC IN
      // ══════════════════════════════════════════════
      h1('6. TRỤC IN (CHI PHÍ KHẮC TRỤC)'),
      p('Trước khi in, xưởng phải làm trục in (khắc hoa văn lên ống inox/đồng). Chi phí này tính một lần cho đơn hàng (không phân bổ theo m²).'),
      ...sp(1),
      formula('Chiều dài trục  =  max(0,7 m;  Khổ trải × Số con hình + 0,1 m)'),
      formula('Diện tích trục  =  Chiều dài trục  ×  Chu vi trục'),
      formula('Chi phí 1 trục  =  Diện tích trục  ×  Đơn giá/m² trục'),
      formula('Tổng chi phí trục  =  Chi phí 1 trục  ×  Số màu in'),
      ...sp(1),
      p('Giới hạn máy in:', { bold: true }),
      bullet('Chiều dài trục < 0,7 m → Dưới tối thiểu, cần điều chỉnh.'),
      bullet('Chiều dài trục > 1,25 m → Vượt tối đa, máy không in được.'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  7. PHỤ KIỆN
      // ══════════════════════════════════════════════
      h1('7. PHỤ KIỆN (Chỉ áp dụng cho Túi)'),
      p('Tùy yêu cầu khách hàng, túi có thể có thêm zipper, băng keo hoặc quai xách. Mỗi loại tính riêng:'),
      ...sp(1),
      makeTable(
        ['Phụ kiện', 'Cách tính', 'Đơn vị'],
        [
          ['Zipper (khóa kéo)', 'Số lượng × Bước cắt × Đơn giá zipper', '₫'],
          ['Băng keo (tape)', 'Số lượng × Bước cắt × Đơn giá băng keo', '₫'],
          ['Quai xách (handle)', 'Số lượng × Đơn giá quai', '₫'],
        ]
      ),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  8. ĐÓNG GÓI & VẬN CHUYỂN
      // ══════════════════════════════════════════════
      h1('8. ĐÓNG GÓI & VẬN CHUYỂN'),
      ...sp(1),

      h2('8.1. Đóng gói — Túi'),
      formula('Số thùng     =  Số lượng túi  ÷  Số túi/thùng'),
      formula('Chi phí đóng gói  =  Giá 1 thùng  ×  Số thùng'),
      formula('Phí đóng gói/túi  =  Tổng chi phí  ÷  Số lượng'),
      ...sp(1),

      h2('8.2. Đóng gói — Màng (cuộn)'),
      formula('Diện tích 1 cuộn  =  Khổ trải  ×  Chiều dài cuộn  ÷  Số con hình'),
      formula('Số cuộn           =  Tổng m²  ÷  Diện tích 1 cuộn'),
      formula('Phí đóng gói/m²   =  Giá đóng gói 1 cuộn  ÷  Diện tích 1 cuộn'),
      ...sp(1),

      h2('8.3. Vận chuyển'),
      formula('Tổng phí vận chuyển  =  Đơn giá/km  ×  Số km'),
      formula('Phí VC / đơn vị      =  Tổng phí  ÷  Số lượng'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  9. LÃI VAY & HOA HỒNG
      // ══════════════════════════════════════════════
      h1('9. LÃI VAY & HOA HỒNG'),
      ...sp(1),

      h2('9.1. Lãi vay'),
      p('Khoản lãi phát sinh do công ty ứng vốn cho đơn hàng trong thời gian thanh toán chậm:'),
      formula('Lãi vay / đơn vị  =  (Lãi suất ÷ 30 ngày)  ×  Số ngày thanh toán  ×  Giá sản xuất/đơn vị'),
      note('Lãi suất mặc định = 0,25%/tháng. Số ngày thanh toán mặc định = 30 ngày.'),
      ...sp(1),

      h2('9.2. Hoa hồng nhân viên kinh doanh'),
      p('Có thể nhập theo 2 cách:'),
      bullet('Theo % giá sản phẩm: Hoa hồng = Tỉ lệ % × Giá sản xuất / đơn vị'),
      bullet('Theo giá cố định: Hoa hồng = Số ₫ nhập trực tiếp'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  10. BẢNG LỢI NHUẬN
      // ══════════════════════════════════════════════
      h1('10. BẢNG LỢI NHUẬN'),
      p('Phần mềm tra cứu % lợi nhuận tự động dựa trên tổng chi phí sản xuất. Đơn hàng càng lớn (chi phí cao hơn), % lợi nhuận tối thiểu càng thấp (chấp nhận lãi ít hơn):'),
      ...sp(1),
      makeTable(
        ['Tổng chi phí SX', '% Lợi nhuận (cột 1)', '% Lợi nhuận (cột 2)', 'Ghi chú'],
        [
          ['< 5 triệu ₫', '~35%', '~30%', 'Đơn nhỏ lẻ'],
          ['5 – 20 triệu ₫', '~25%', '~20%', 'Đơn trung bình'],
          ['20 – 100 triệu ₫', '~18%', '~15%', 'Đơn lớn'],
          ['> 100 triệu ₫', '~12%', '~10%', 'Đơn rất lớn'],
        ]
      ),
      ...sp(1),
      note('Bảng lợi nhuận có thể điều chỉnh bởi Admin trong phần Cấu hình. Nhân viên kinh doanh chọn cột 1 hoặc cột 2 tùy chính sách.'),
      formula('Lợi nhuận  =  % LN  ×  Tổng chi phí SX'),
      formula('Doanh thu  =  Tổng chi phí SX  +  Lợi nhuận'),
      formula('Giá SX / đơn vị  =  Doanh thu  ÷  Số lượng'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  11. GIÁ BÁN CUỐI CÙNG
      // ══════════════════════════════════════════════
      h1('11. GIÁ BÁN CUỐI CÙNG'),
      p('Giá bán đề xuất cho khách hàng bằng giá sản xuất/đơn vị cộng thêm tất cả các chi phí phát sinh:'),
      ...sp(1),
      formula('Giá bán  =  Giá SX/đơn vị'),
      formula('           +  Phí zipper/đơn vị    (nếu có)'),
      formula('           +  Phí băng keo/đơn vị  (nếu có)'),
      formula('           +  Phí quai/đơn vị      (nếu có)'),
      formula('           +  Phí đóng gói/đơn vị'),
      formula('           +  Phí vận chuyển/đơn vị'),
      formula('           +  Lãi vay/đơn vị'),
      formula('           +  Hoa hồng/đơn vị'),
      ...sp(1),
      p('Người quản lý có thể điều chỉnh "Giá chốt" khác với giá đề xuất. Khi đã chốt, hệ thống hiển thị giá chốt màu xanh.'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  12. TÚI VS MÀNG
      // ══════════════════════════════════════════════
      h1('12. ĐIỂM KHÁC BIỆT: TÚI vs MÀNG'),
      ...sp(1),
      makeTable(
        ['Tiêu chí', 'Sản phẩm TÚI', 'Sản phẩm MÀNG (cuộn)'],
        [
          ['Đơn vị số lượng', 'Cái (chiếc)', 'm² (mét vuông)'],
          ['Tổng diện tích', 'Số cái × Diện tích 1 túi', 'Đúng bằng số lượng nhập'],
          ['Công đoạn cắt', 'Có — chia thùng từng túi', 'Không có công đoạn cắt riêng'],
          ['Phụ kiện (zipper, quai)', 'Có thể có', 'Không áp dụng'],
          ['Đóng gói', 'Theo thùng (N túi/thùng)', 'Theo cuộn (m²/cuộn)'],
          ['Giá báo cho khách', '₫ / cái', '₫ / m²'],
        ]
      ),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  13. VÍ DỤ MINH HỌA
      // ══════════════════════════════════════════════
      h1('13. VÍ DỤ MINH HỌA'),
      p('Đơn hàng mẫu: Túi đứng 3 lớp, in 4 màu, 10.000 cái', { bold: true }),
      ...sp(1),
      makeTable(
        ['Thông số đầu vào', 'Giá trị'],
        [
          ['Loại sản phẩm', 'Túi (tui)'],
          ['Số lượng', '10.000 cái'],
          ['Khổ trải (spreadWidth)', '0,25 m'],
          ['Bước cắt (cutStep)', '0,35 m'],
          ['Diện tích 1 túi', '0,25 × 0,35 = 0,0875 m²'],
          ['Số con hình (numImages)', '2'],
          ['Số màu in', '4'],
          ['Lớp 1 — OPP 20mic', '8.500 ₫/m²'],
          ['Lớp 2 — PE 50mic', '6.200 ₫/m²'],
          ['Lớp 3 — PA 15mic', '12.000 ₫/m²'],
        ]
      ),
      ...sp(1),

      h3('Bước 1 — Tổng diện tích cần sản xuất'),
      formula('Tổng m²  =  10.000 cái  ×  0,0875 m²/cái  =  875 m²'),
      ...sp(1),

      h3('Bước 2 — Khổ cuộn & Chiều dài cắt'),
      formula('Khổ cuộn  =  0,25 × 2 + 0,02  =  0,52 m'),
      formula('Chiều dài cắt  =  0,35 × 10.000 ÷ 2  =  1.750 m'),
      ...sp(1),

      h3('Bước 3 — Phế hao cắt & Chi phí cắt'),
      formula('Phế hao cắt  ≈  1.750 ÷ 3.000 × 20  +  100  =  ~217 m'),
      formula('Chi phí cắt  =  CPSX × (1.750 + 217) × 0,52  ≈  tùy CPSX cắt'),
      ...sp(1),

      h3('Bước 4 — Ghép lớp 2 (PE) và lớp 3 (PA)'),
      formula('Đầu vào ghép lớp 2  =  1.750 + 217  =  1.967 m'),
      formula('Phế hao ghép lớp 2  ≈  1.967 ÷ 3.000 × 20  + 100  ≈  231 m'),
      formula('Đầu vào ghép lớp 3  =  1.967 + 231  =  2.198 m'),
      ...sp(1),

      h3('Bước 5 — In lớp 1 (OPP)'),
      formula('Chiều dài in  =  1.750 + 217 + 231 + <phế hao lớp 3>  ≈  2.450 m'),
      formula('Chi phí in   =  (4 màu × giá mực × tỉ lệ phủ + nhân công) × (2.450 + phế hao in) × 0,52'),
      ...sp(1),

      h3('Bước 6 — Tổng hợp & Giá bán'),
      formula('Tổng CPSX  =  Chi phí in  +  Chi phí ghép (2 lớp)  +  Chi phí cắt'),
      formula('Lợi nhuận  =  % LN tra bảng  ×  Tổng CPSX'),
      formula('Giá/túi    =  (Tổng CPSX + LN)  ÷  10.000  +  phụ kiện + đóng gói + VC'),
      ...sp(2),
      divider(),

      // ══════════════════════════════════════════════
      //  FOOTER
      // ══════════════════════════════════════════════
      ...sp(2),
      new Paragraph({
        children: [new TextRun({ text: 'Tài liệu này được tạo tự động từ phần mềm LTS Pricing — Công ty CP Lai Trường Sơn', size: 20, color: '888888', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Mọi thắc mắc về công thức, liên hệ bộ phận Kỹ thuật/IT.', size: 20, color: '888888', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync('Cong_Thuc_Tinh_Gia_LTS.docx', buffer);
console.log('✅ Đã xuất: Cong_Thuc_Tinh_Gia_LTS.docx');
