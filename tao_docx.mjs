import { Document, Packer, Paragraph, TextRun, AlignmentType, PageOrientation } from 'docx';
import { writeFileSync } from 'fs';

const F    = 'Calibri';
const SB   = 22;   // 11pt — công thức chính
const SSB  = 20;   // 10pt — trong đó / item
const SH   = 24;   // 12pt — heading section
const ST   = 30;   // 15pt — tiêu đề trang
const BLUE = '1F3864';
const GRAY = '555555';
const RED  = 'C00000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const title = t => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 80 },
  children: [new TextRun({ text: t, font: F, size: ST, bold: true, color: BLUE })],
});

const sub = t => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 300 },
  children: [new TextRun({ text: t, font: F, size: SB, italics: true, color: GRAY })],
});

const h = t => new Paragraph({
  spacing: { before: 280, after: 70 },
  children: [new TextRun({ text: t, font: F, size: SH, bold: true, color: BLUE })],
});

// Công thức chính — bold đen
const ct = t => new Paragraph({
  spacing: { before: 64, after: 44 },
  children: [new TextRun({ text: t, font: F, size: SB, bold: true })],
});

// "trong đó:" — nghiêng xám, lùi vào
const td = () => new Paragraph({
  spacing: { before: 24, after: 18 },
  indent: { left: 240 },
  children: [new TextRun({ text: 'trong đó:', font: F, size: SSB, italics: true, color: GRAY })],
});

// Item gạch đầu dòng — lùi 2 cấp
const item = t => new Paragraph({
  spacing: { before: 18, after: 18 },
  indent: { left: 420 },
  children: [
    new TextRun({ text: '–  ', font: F, size: SSB, color: GRAY }),
    new TextRun({ text: t, font: F, size: SSB }),
  ],
});

// Ghi chú ⚠ — nghiêng đỏ nhạt
const warn = t => new Paragraph({
  spacing: { before: 18, after: 26 },
  indent: { left: 240 },
  children: [new TextRun({ text: t, font: F, size: SSB, italics: true, color: RED })],
});

// Ghi chú thường — nghiêng xám
const note = t => new Paragraph({
  spacing: { before: 18, after: 26 },
  indent: { left: 240 },
  children: [new TextRun({ text: t, font: F, size: SSB, italics: true, color: GRAY })],
});

const gap = () => new Paragraph({ spacing: { before: 8, after: 8 }, children: [new TextRun('')] });

// ─── Document ────────────────────────────────────────────────────────────────

const doc = new Document({
  sections: [{
    properties: {
      page: {
        orientation: PageOrientation.PORTRAIT,
        size: { width: 11906, height: 16838 },
        margin: { top: 720, bottom: 720, left: 900, right: 900 },
      },
    },
    children: [

      title('CÔNG THỨC TÍNH GIÁ BAO BÌ — LTS'),
      sub('Công ty CP Lai Trường Sơn'),


      // ════════════════════════════════════════════════════════════════════════
      h('1. KÍCH THƯỚC & DIỆN TÍCH'),

      ct('Diện tích 1 túi  =  Khổ trải  ×  Bước cắt'),
      td(),
      item('Khổ trải: chiều ngang 1 túi khi mở phẳng (m)'),
      item('Bước cắt: chiều dài 1 túi theo chiều cuộn (m)'),
      gap(),

      ct('Tổng diện tích (túi)  =  Số lượng  ×  Diện tích 1 túi'),
      ct('Tổng diện tích (màng)  =  Số lượng  (đơn vị m², nhập thẳng, không nhân thêm)'),
      gap(),

      ct('Khổ cuộn máy  =  Khổ trải  ×  Số con hình  +  0.02 m'),
      td(),
      item('Số con hình: số túi xếp song song ngang trên 1 trục in (≥ 1)'),
      item('+0.02 m: lề biên cố định hai đầu cuộn'),
      item('Khổ cuộn này dùng chung cho cả 3 công đoạn IN — GHÉP — CẮT'),
      gap(),

      ct('Chiều dài cuộn thành phẩm  =  Tổng diện tích  /  (Khổ trải  ×  Số con hình)'),
      note('Tăng Số con hình → cuộn ngắn hơn & rộng hơn. Tổng m² không đổi.'),


      // ════════════════════════════════════════════════════════════════════════
      h('2. CÔNG ĐOẠN CẮT'),

      ct('Mét cắt (túi)   =  Bước cắt  ×  Số lượng  /  Số con hình'),
      ct('Mét cắt (màng)  =  Tổng diện tích  /  (Khổ trải  ×  Số con hình)'),
      warn('⚠  Bắt buộc chia Số con hình — khổ cuộn đã nhân Số con hình rồi, không chia lại sẽ tính dư.'),
      gap(),

      ct('Phế hao cắt  =  Mét cắt  /  3.000  ×  20  +  100'),
      td(),
      item('3.000: cứ mỗi 3.000 m chạy máy phát sinh 20 m phế hao'),
      item('100 m: phế hao cố định mỗi lần chạy (khởi máy + dừng)'),
      gap(),

      ct('CPSX cắt  =  Đơn giá cơ sở  ×  Hệ số theo diện tích túi'),
      td(),
      item('Đơn giá cơ sở: 971 đ/m²'),
      item('Túi nhỏ  (diện tích < 0.07 m²)       →  971 × 1.4  =  1.359 đ/m²  — máy phải cắt chậm, nhiều nhát hơn'),
      item('Túi vừa  (0.07 m² ≤ diện tích < 0.20 m²)  →  971 × 1.2  =  1.165 đ/m²'),
      item('Túi lớn  (diện tích ≥ 0.20 m²)       →  971 × 0.8  =   777 đ/m²  — cắt nhanh, ít nhát hơn'),
      item('Màng: CPSX cắt = 0  (màng không có công đoạn cắt riêng)'),
      gap(),

      ct('Chi phí cắt  =  CPSX cắt  ×  (Mét cắt  +  Phế hao cắt)  ×  Khổ cuộn'),
      note('CP cắt chỉ gồm gia công. Vật liệu lớp ngoài được tính ở công đoạn IN.'),


      // ════════════════════════════════════════════════════════════════════════
      h('3. CÔNG ĐOẠN GHÉP  (lớp 2 → 3 → 4 → 5, truyền xuôi)'),

      note('Thứ tự xử lý: lớp 2 ghép trước (gần thành phẩm nhất), phế hao mỗi lớp cộng dồn sang lớp tiếp theo.'),
      gap(),

      ct('Mét đầu vào lớp i  =  Mét cắt  +  Phế hao cắt  +  Σ phế hao ghép các lớp trước i'),
      gap(),

      ct('Phế hao ghép lớp i  =  Mét đầu vào lớp i  /  3.000  ×  20  +  100'),
      td(),
      item('Cùng hệ số với phế hao cắt: /3.000 × 20 + 100'),
      item('Phế hao của lớp i được cộng vào mét đầu vào của lớp i+1 (truyền xuôi lên)'),
      gap(),

      ct('Giá vật liệu/m²  =  Giá/kg  ×  Độ dày (mic)  ×  Khối lượng riêng  /  1.000'),
      td(),
      item('OPP, BOPP, Matt OPP, CPP         —  khối lượng riêng: 0.91 g/cm³'),
      item('LLDPE, PE                         —  khối lượng riêng: 0.92 g/cm³'),
      item('PET                               —  khối lượng riêng: 1.40 g/cm³'),
      item('PA (Nylon)                        —  khối lượng riêng: 1.15 g/cm³'),
      item('AL (giấy nhôm)                    —  khối lượng riêng: 2.70 g/cm³'),
      item('MPET (PET tráng nhôm)             —  khối lượng riêng: 1.40 g/cm³'),
      gap(),

      ct('CP gia công ghép lớp i  =  1.200 đ/m²  ×  (Mét đầu vào  +  Phế hao)  ×  Khổ cuộn'),
      ct('CP vật liệu ghép lớp i  =  Giá VL/m²   ×  (Mét đầu vào  +  Phế hao)  ×  Khổ cuộn'),
      ct('Chi phí ghép lớp i      =  CP gia công  +  CP vật liệu'),
      gap(),
      ct('Tổng chi phí ghép       =  Σ Chi phí ghép tất cả lớp có dùng'),


      // ════════════════════════════════════════════════════════════════════════
      h('4. CÔNG ĐOẠN IN  (lớp 1 — lớp ngoài cùng, in trước)'),

      ct('Mét in  =  Mét cắt  +  Phế hao cắt  +  Σ phế hao ghép tất cả lớp'),
      note('Mét in là điểm xuất phát của toàn bộ cuộn — lớn nhất trong 3 công đoạn.'),
      gap(),

      ct('Phế hao in  =  Phế hao khởi máy  +  Phế hao chạy  +  Phế hao thêm'),
      td(),
      item('Phế hao khởi máy (m) — cố định theo số màu, máy cần chạy thử trước khi ra hàng:'),
      item('    1 màu → 500 m   |   2 màu → 800 m   |   3 màu → 1.100 m   |   4 màu → 1.400 m'),
      item('    5 màu → 1.700 m |   6 màu → 2.000 m |   7 màu → 2.300 m   |   8 màu → 2.600 m'),
      item('Phế hao chạy  =  Mét in  /  6.000  ×  40'),
      item('    → cứ 6.000 m chạy máy phát sinh 40 m phế hao chạy'),
      item('Phế hao thêm  =  Mét in  /  50.000  ×  400   (chỉ tính khi Mét in > 50.000 m)'),
      item('    → đơn hàng rất lớn, máy cần dừng vệ sinh thêm giữa chừng'),
      gap(),

      ct('CPSX in  =  Chi phí chung khâu in  +  Chi phí in 1 màu  ×  Số màu  ×  Tỉ lệ phủ mực  +  Phí nhũ  +  Phí phủ mờ'),
      td(),
      item('Chi phí chung khâu in (nhân công, điện, vận hành) mặc định: 1.200 đ/m²'),
      item('Chi phí in 1 màu — chất liệu cần mực đặc biệt (PET, PA, LLDPE, PE, MPET, AL): 135 đ/màu/m²'),
      item('Chi phí in 1 màu — chất liệu thông thường (OPP, BOPP, Matt OPP, CPP): 120 đ/màu/m²'),
      item('Số màu in: 1 đến 8 màu   |   nếu không in (= 0) → CPSX in = 0, bỏ qua toàn bộ mục này'),
      item('Tỉ lệ phủ mực: mức độ phủ mực trung bình trên bề mặt, 0–100%, mặc định 100%'),
      item('Phí nhũ kim tuyến: 500 đ/m²   (chỉ tính khi đặt hàng in nhũ)'),
      item('Phí phủ mờ: 300 đ/m²           (chỉ tính khi đặt hàng phủ mờ)'),
      gap(),

      ct('CP gia công in  =  CPSX in          ×  (Mét in  +  Phế hao in)  ×  Khổ cuộn'),
      ct('CP vật liệu in  =  Giá VL lớp 1/m²  ×  (Mét in  +  Phế hao in)  ×  Khổ cuộn'),
      ct('Tổng chi phí in =  CP gia công in   +  CP vật liệu in'),


      // ════════════════════════════════════════════════════════════════════════
      h('5. TỔNG CPSX & LỢI NHUẬN'),

      ct('Tổng CPSX  =  Tổng CP in  +  Tổng CP ghép  +  CP cắt'),
      td(),
      item('Tổng CP in:   toàn bộ gia công + vật liệu lớp 1'),
      item('Tổng CP ghép: gia công + vật liệu lớp 2, 3, 4, 5 (cộng dồn tất cả lớp có dùng)'),
      item('CP cắt:       chỉ gia công cắt, không có vật liệu riêng'),
      gap(),

      ct('Tỉ lệ LN  =  tra bảng theo Tổng CPSX và Cột LN'),
      td(),
      item('Cột 1 — lãi cao hơn (đơn hàng đơn giản):'),
      item('    Tổng CPSX < 5 tr đ     →  35%'),
      item('    Tổng CPSX < 20 tr đ    →  25%'),
      item('    Tổng CPSX < 100 tr đ   →  18%'),
      item('    Tổng CPSX ≥ 100 tr đ   →  12%'),
      item('Cột 2 — lãi thấp hơn (đơn hàng phức tạp hoặc cạnh tranh):'),
      item('    Tổng CPSX < 5 tr đ     →  30%'),
      item('    Tổng CPSX < 20 tr đ    →  20%'),
      item('    Tổng CPSX < 100 tr đ   →  15%'),
      item('    Tổng CPSX ≥ 100 tr đ   →  10%'),
      item('Hệ thống tự chọn Cột 2 khi:  ≥ 3 lớp vật liệu  /  có MPET hoặc AL  /  đáy đứng  /  có zipper'),
      gap(),

      ct('Lợi nhuận  =  Tỉ lệ LN  ×  Tổng CPSX'),
      ct('Doanh thu  =  Tổng CPSX  +  Lợi nhuận   =   Tổng CPSX  ×  (1  +  Tỉ lệ LN)'),
      ct('Giá vốn + LN / đơn vị  =  Doanh thu  /  Số lượng'),
      note('Đây là giá nền — chưa cộng phụ kiện, đóng gói, vận chuyển, lãi vay, hoa hồng.'),


      // ════════════════════════════════════════════════════════════════════════
      h('6. PHỤ KIỆN  (chỉ áp dụng cho Túi)'),

      ct('Zipper / đơn vị   =  Bước cắt  ×  378 đ/m'),
      ct('Băng keo / đơn vị  =  Bước cắt  ×  200 đ/m'),
      ct('Quai xách / đơn vị  =  1.500 đ/cái'),
      td(),
      item('Zipper và băng keo tính theo Bước cắt vì chạy dọc theo chiều dài túi'),
      item('Quai tính cố định mỗi cái túi, không phụ thuộc kích thước'),
      item('Trọng lượng phụ kiện cộng thêm: Quai +5 gr | Zipper +2 gr | Băng keo +1 gr'),


      // ════════════════════════════════════════════════════════════════════════
      h('7. ĐÓNG GÓI'),

      ct('Đóng gói túi / đơn vị   =  Giá thùng  /  Số túi mỗi thùng'),
      td(),
      item('Số thùng cần  =  Số lượng  /  Số túi mỗi thùng'),
      item('Tổng chi phí đóng gói  =  Giá thùng  ×  Số thùng'),
      gap(),

      ct('Đóng gói màng / đơn vị  =  Giá/cuộn  /  Diện tích 1 cuộn'),
      td(),
      item('Diện tích 1 cuộn màng  =  Khổ trải  ×  Chiều dài cuộn  /  Số con hình'),
      item('Chiều dài cuộn mặc định: 6.000 m  (có thể thay đổi theo yêu cầu)'),
      item('Số cuộn cần  =  Tổng diện tích  /  Diện tích 1 cuộn'),


      // ════════════════════════════════════════════════════════════════════════
      h('8. VẬN CHUYỂN & LÃI VAY'),

      ct('Vận chuyển / đơn vị  =  (Đơn giá/km  ×  Số km)  /  Số lượng'),
      td(),
      item('Đơn giá/km: phí thuê xe hoặc giá vận chuyển thực tế (đ/km)'),
      item('Số km: quãng đường giao hàng từ nhà máy đến khách'),
      item('Chia cho Số lượng để phân bổ đều chi phí vận chuyển về từng đơn vị sản phẩm'),
      gap(),

      ct('Lãi vay / đơn vị  =  (Lãi suất tháng  /  30)  ×  Số ngày thanh toán  ×  Giá vốn+LN/đv'),
      td(),
      item('Lãi suất tháng mặc định: 0.25%/tháng'),
      item('Chia 30 để quy về lãi suất ngày'),
      item('Số ngày thanh toán mặc định: 30 ngày'),
      item('Ý nghĩa: khách chưa trả tiền → công ty phải ứng vốn → tính lãi vốn tương ứng'),
      item('Ví dụ: Giá vốn+LN = 1.000 đ/túi, TT 30 ngày, LS 0.25%/tháng → lãi vay = (0.25%/30)×30×1.000 = 2.5 đ/túi'),


      // ════════════════════════════════════════════════════════════════════════
      h('9. HOA HỒNG & GIÁ BÁN CUỐI'),

      ct('Hoa hồng / đơn vị  =  Tỉ lệ hoa hồng  ×  Giá vốn+LN/đv'),
      td(),
      item('Hoặc nhập trực tiếp số tiền cố định (VND/đơn vị) không phụ thuộc giá'),
      item('Hoa hồng cho sale / đại lý, chưa tính vào giá vốn'),
      gap(),

      ct('Giá bán cuối / đơn vị  =  Giá vốn+LN  +  Zipper  +  Băng keo  +  Quai  +  Đóng gói  +  Vận chuyển  +  Lãi vay  +  Hoa hồng'),
      note('Đây là giá báo khách, chưa có VAT.'),


      // ════════════════════════════════════════════════════════════════════════
      h('10. TRỤC IN'),

      ct('Chiều dài trục  =  max(0.7 m,   Khổ trải  ×  Số con hình  +  0.1 m)'),
      td(),
      item('0.1 m: khoảng dư kỹ thuật hai đầu trục'),
      item('0.7 m: chiều dài tối thiểu máy có thể gá được'),
      item('Ví dụ: Khổ trải = 0.3 m, Số con hình = 2  →  chiều dài trục = 0.3×2 + 0.1 = 0.7 m'),
      warn('⚠  Chiều dài trục > 1.25 m → vượt giới hạn máy, không in được.'),
      gap(),

      ct('Chu vi trục  =  Bước cắt  ×  N'),
      td(),
      item('N là số nguyên nhỏ nhất sao cho  Bước cắt × N  ≥  0.4 m  (chu vi tối thiểu máy)'),
      item('Ví dụ: Bước cắt = 0.25 m  →  0.25×1 = 0.25 (< 0.4) → N=2  →  chu vi = 0.50 m'),
      item('Ví dụ: Bước cắt = 0.45 m  →  0.45×1 = 0.45 (≥ 0.4) → N=1  →  chu vi = 0.45 m'),
      gap(),

      ct('Diện tích trục  =  Chiều dài trục  ×  Chu vi trục'),
      ct('Chi phí khắc trục 1 bộ  =  Diện tích trục  ×  Đơn giá  ×  Số màu'),
      td(),
      item('Đơn giá khắc trục mặc định: 7.300.000 đ/m²'),
      item('Mỗi màu in cần 1 trục riêng → nhân với Số màu'),
      item('Chi phí trục là chi phí đầu tư 1 lần, không tính vào giá thành sản phẩm hàng loạt'),


      // ════════════════════════════════════════════════════════════════════════
      h('11. TRỌNG LƯỢNG & ĐỘ DÀY'),

      ct('GSM lớp i  =  Độ dày lớp i (mic)  ×  Khối lượng riêng lớp i   (đơn vị: g/m²)'),
      ct('Tổng GSM   =  Σ GSM tất cả lớp'),
      gap(),

      ct('Trọng lượng / túi  =  Tổng GSM  /  1.000  ×  Diện tích 1 túi   (đơn vị: gr)'),
      td(),
      item('Cộng thêm phụ kiện nếu có: Quai +5 gr  |  Zipper +2 gr  |  Băng keo +1 gr'),
      item('Ví dụ: Tổng GSM = 120 g/m², Diện tích 1 túi = 0.06 m²  →  TL = 120/1000×0.06×1000 = 7.2 gr'),
      gap(),

      ct('Độ dày tổng  =  Σ độ dày tất cả lớp  +  Số lớp ghép  ×  3 mic   (làm tròn lên bội số 5)'),
      td(),
      item('+3 mic cho mỗi lớp keo ghép: lớp 2 thêm 3 mic, lớp 3 thêm 3 mic, v.v.'),
      item('Ví dụ: PET 12mic + PE 60mic (1 lớp ghép)  →  12 + 60 + 3 = 75 mic  →  làm tròn lên 75 mic'),
      item('Ví dụ: BOPP 20mic + PA 15mic + PE 50mic (2 lớp ghép)  →  20+15+50+6 = 91 mic  →  làm tròn lên 95 mic'),

    ],
  }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync('Cong_Thuc_Tinh_Gia_LTS.docx', buf);
console.log('Done: Cong_Thuc_Tinh_Gia_LTS.docx');
