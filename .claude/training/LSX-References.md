# Lệnh Sản Xuất (LSX) — Tài liệu tham chiếu thực tế

## 0. Mục đích & nguồn

**Nguồn**: 10 file `.doc` trong `.claude/references/`, extract bằng Word COM ngày 30/06/2026.

**Vai trò**:
- Ground truth cho schema `DauVaoTinhGia` — đối chiếu xem engine đã hỗ trợ đủ chưa
- Test fixtures: dùng số liệu thật từ LSX để tạo test case cho `@lts/bang-tinh-gia`
- Form UI: `TheNhapLieu.tsx` nên gom theo 4 công đoạn IN / GHÉP / CHIA / LÀM TÚI khớp với LSX

**Tương quan với các tài liệu khác**:
- `Train.md`: công thức tính giá (source of truth về toán)
- `CongThuc.md`: quick reference công thức
- File này: cấu trúc LSX thực tế, mapping LSX → engine schema, khoảng trống schema

---

## 1. Danh mục 10 LSX

| # | Tên file | Loại sản phẩm | Tính chất |
|---|----------|--------------|-----------|
| 1 | `LSX IN MANG BOPP.doc` | Màng BOPP in 5 màu | LSX thật, chỉ cần in + chia cuộn |
| 2 | `LSX MANG IN.doc` | Màng in (template) | Template trống, form mẫu rỗng |
| 3 | `LSX TUI.doc` | Túi zipper 3 biên (template) | Template base, nhiều chỗ "tự điền" |
| 4 | `LSX TUI 3 BIEN.doc` | Túi 3 biên có quai xách | LSX thật, PA 1 lớp + LLDPE ghép |
| 5 | `LSX TUI 4 BIEN.doc` | Túi 4 biên xếp hông | LSX thật, PA15 + LLDPE130 |
| 6 | `LSX TUI LUNG GIUA.doc` | Túi dán lưng giữa | LSX thật, PA15 + LLDPE82 |
| 7 | `LSX -XEP HONG LUNG LECH.doc` | Túi xếp hông dán lưng lệch | LSX thật, OPP20 + MPET12 + LLDPE90 |
| 8 | `LSX TUI ZIPPER CAT SEAL.doc` | Túi zipper cắt seal | LSX thật, 1 lớp PE70 |
| 9 | `LSX - ZIPPER DAY DUNG.doc` | Túi zipper đáy đứng | LSX thật, PET12 + MPET12 + LLDPE90 |
| 10 | `LS- TUI CAT SEAL MO MIENG CO NAP BANG KEO.doc` | Túi cắt seal có nắp băng keo | LSX thật, OPP20 + MPET12 + PE40 |

---

## 2. Cấu trúc chung 1 LSX

### 2.1. Sơ đồ 4 công đoạn

```
MÁY IN  ──►  MÁY GHÉP  ──►  MÁY CHIA  ──►  MÁY LÀM TÚI
 (in)        (ghép màng)     (chia cuộn)     (thành phẩm)
```

**Ghi chú**:
- Với sản phẩm **màng** (chỉ in): chỉ có MÁY IN → MÁY CHIA (bỏ qua ghép và làm túi)
- MÁY GHÉP: có thể có 1 hoặc 2 lớp ghép (tuỳ sản phẩm 2 lớp hay 3 lớp)
- MÁY CHIA: tuỳ chọn — một số sản phẩm không cần chia
- BTP = Bán Thành Phẩm: thành phẩm trung gian giữa các công đoạn

### 2.2. Các trường thông tin mỗi công đoạn

#### MÁY IN

| Trường | Đơn vị | Mô tả |
|--------|--------|-------|
| Màng in | tên vật liệu | VD: mattOPP20, PET12, PA15, BOPP18, LLDPE70 |
| Khổ | mm | Khổ màng in, VD: 560mm, 780mm, 1040mm |
| Trục in | D×CV (mm) | Đường kính × Chu vi triển khai trục in |
| MST | text | Mã Số Trục, VD: G711145, Y105209G2 |
| Số trục | số | = số màu in, VD: 01 trục = 1 màu, 06 trục = 6 màu |
| Chiều ra cuộn | text | "Đầu chữ ra trước" / "Dây chữ ra trước" / "Tự do" |
| Định mức phi hao | mét | Phi hao dự kiến cho công đoạn in |
| Thành phẩm in yêu cầu | mét | Số mét thành phẩm in cần đạt |

#### MÁY GHÉP

| Trường | Đơn vị | Mô tả |
|--------|--------|-------|
| Màng ghép 1 | tên vật liệu | VD: MPET12, LLDPE65, PE40 |
| Khổ | mm | Khổ màng ghép |
| Màng ghép 2 | tên vật liệu | Lớp ghép thứ hai (nếu có, VD: LLDPE90, PE40) |
| Khổ | mm | Khổ màng ghép 2 |
| Định mức phi hao L1 | mét | Phi hao lớp ghép 1 |
| Định mức phi hao L2 | mét | Phi hao lớp ghép 2 |
| Thành phẩm ghép | mét | Thường = BTP in − phi hao ghép |

#### MÁY CHIA

| Trường | Đơn vị | Mô tả |
|--------|--------|-------|
| Khổ màng | mm | Khổ màng trước chia |
| Khổ hình | mm | Khổ sau khi trừ biên |
| Khổ chia | mm | Kích thước mỗi cuộn sau chia |
| Định mức phi hao chia | mét | Phi hao khâu chia (thường = 0m) |
| Chiều dài quấn cuộn | mét/cuộn | VD: 7.000m/cuộn |
| Chiều ra cuộn | text | Đầu/dây chữ ra trước |

#### MÁY LÀM TÚI

| Trường | Đơn vị | Mô tả |
|--------|--------|-------|
| Kiểu túi | text | VD: TUI 3 BIEN, TUI ZIPPER ĐÁY ĐỨNG |
| Chiều rộng | mm | Rộng thành phẩm túi |
| Chiều dài | mm | Dài thành phẩm túi |
| Hàn biên | mm | Bề rộng đường hàn biên |
| Hàn đầu | mm | Bề rộng đường hàn đầu / đáy |
| Xếp hông | mm | Bề sâu xếp hông (nếu có) |
| Xếp đáy | mm | Bề sâu xếp đáy (túi đáy đứng) |
| Dán lưng | mm | Bề rộng dán lưng (túi lưng giữa/lưng lệch) |
| Tâm zipper cách miệng | mm | Khoảng cách từ miệng túi đến tâm zipper |
| Dán biên | mm | Đường dán cố định biên |
| Nhấn xé "V" | mm | Khoảng cách nhấn xé chữ V cách miệng |
| Đục lỗ | mm | Lỗ tròn Ø hoặc lỗ dọc quai xách |
| Lỗ thông hơi | mm | Lỗ nhỏ thoát khí |
| Nắp | mm | Phần nắp gập (có băng keo) |
| Định mức phi hao làm túi | mét | Phi hao công đoạn làm túi |
| Số lượng | cái | Số túi cần sản xuất (nếu có yêu cầu cụ thể) |
| Yêu cầu giao hàng | text | Thời gian giao dự kiến |

### 2.3. Quy ước số liệu

- **Khổ màng**: đơn vị mm, VD: 560, 780, 1040
- **Trục in**: D × CV, đơn vị mm. D = đường kính trục, CV = chu vi triển khai
  - `cylLength` trong engine ≈ D (m), `cylCircumference` ≈ CV (m)
  - LSX ghi mm, engine dùng m — cần chia 1000 khi map
- **Phi hao**: tuyệt đối bằng **mét** cho từng công đoạn, KHÔNG phải %
  - Dù LSX có ghi "Định mức phi hao: 1.578m" hay "DMPH: 164m", đều là mét
- **Thành phẩm**: mét (in, ghép, chia) hoặc cái (làm túi)
- **Phi hao cộng thêm** (không nhân): `NVL = Thành phẩm + Phi hao`

---

## 3. Phân tích chi tiết từng LSX

### 3.1. LSX IN MANG BOPP

**Loại sản phẩm**: Màng in (không ghép, không làm túi) — in 5 màu trên BOPP18, chia cuộn.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | BOPP18 |
| Khổ | 1040mm, 1060mm |
| Trục in | D:1120 × CV:790mm |
| MST | Y105209G2 |
| Số trục | 05 trục |
| Chiều ra cuộn | Dây màng ra trước |
| Định mức phi hao | 4.250m |
| Thành phẩm in | 166.000m |

#### Thông số máy chia

| Trường | Giá trị |
|--------|---------|
| Khổ màng | K1040, K1060mm |
| Khổ chia | K510mm |
| Chiều dài quấn cuộn | 7.000m/cuộn |
| Chiều ra cuộn | Đầu màng ra trước |
| Định mức phi hao | 0m |

**Ghi chú QA / sản xuất:**
- BOPP18-1040: 56.000m, BOPP18-1060: 114.250m
- Trục in: 28/4 về trục date, còn lại trục cũ
- Màu sắc chạy theo mẫu đã sản xuất gần nhất, nội dung theo file
- Quấn cuộn đúng quy cách, cuộn lẻ không quá 7.500m/cuộn
- Dán tem CTY, đánh dấu MT-MS để khách phân biệt
- Cân kỹ cẩn thận, đảm bảo chính xác

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| Màng in: BOPP18 | `vatLieu[0]` (1 layer) |
| Khổ: 1040mm | `spreadWidth = 1.04` |
| Số trục: 05 | `numColors = 5` |
| D:1120 × CV:790 | `cylLength = 1.12`, `cylCircumference = 0.79` |
| Định mức phi hao: 4.250m | `wasteMeters` / `phiHaoIn` |
| Thành phẩm in: 166.000m | `quantity` → tính thành `totalArea` |
| Khổ chia: K510mm | `cutWidth = 0.51` |
| Không làm túi | `productType = 'mang'` |

---

### 3.2. LSX MANG IN (template trống)

**Loại sản phẩm**: Màng in (template). Form mẫu rỗng, tất cả các trường để trống.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | (trống) |
| Khổ | (trống) |
| Trục in | (trống) |
| MST | (trống) |
| Số trục | (trống) |
| Chiều ra cuộn | (trống) |
| Định mức phi hao | (trống) |
| Thành phẩm in | (trống) |

#### Thông số máy chia

| Trường | Giá trị |
|--------|---------|
| Khổ màng | (trống) |
| Khổ chia | (trống) |
| Chiều dài quấn cuộn | (trống) |
| Chiều ra cuộn | (trống) |
| Định mức phi hao | 0m (mặc định) |

**Ghi chú QA / sản xuất:**
- Ghi chú mẫu: "Quấn cuộn đúng quy cách, cuộn lẻ không quá ..m/cuộn. Cân kỹ cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều. Đánh dấu từng cấp MT-MS để khách hàng phân biệt."
- Form này là bản mẫu để điền cho đơn hàng mới

**Mapping sang engine:**
Không có số liệu để map — đây là template trống, dùng làm reference cho cấu trúc form.

---

### 3.3. LSX TUI (template zipper 3 biên, trống)

**Loại sản phẩm**: Túi zipper 3 biên (template). Form cơ sở cho túi phức hợp 3 lớp, nhiều chỗ "tự điền".

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | PET12 |
| Khổ | 520mm |
| Trục in | D700 × CV400 |
| MST | tự điền |
| Số trục | = số màu |
| Chiều ra cuộn | tự điền |

#### Thông số máy ghép

| Trường | Giá trị |
|--------|---------|
| Màng ghép 1 | MPET12 |
| Khổ | 520mm |
| Màng ghép 2 | LLDPE120 |
| Khổ | 520mm |
| Định mức phi hao in | 1767m |
| Thành phẩm in | 10.111m |
| Định mức phi hao ghép L1 | 166m |
| Định mức phi hao ghép L2 | 165m |
| Thành phẩm ghép | 9779m |

#### Thông số máy làm túi

| Trường | Giá trị |
|--------|---------|
| Kiểu túi | Zipper 3 biên |
| Chiều rộng | (trống) |
| Chiều dài | (trống) |
| Hàn biên | mặc định 10mm (có thể sửa) |
| Hàn đầu | tự điền |
| Xếp đáy | (trống) |
| Nhấn xé "V" | (trống) |
| Định mức phi hao | 164m |

**Ghi chú QA / sản xuất:**
- Sử dụng dao cắt 2 nhịp để cắt
- Sử dụng khuôn đáy dạng bán nguyệt
- "Khác này là của máy tui" — ghi chú phân biệt thông số máy làm túi với các máy khác
- Chạy theo mẫu đã sản xuất
- Người lập / duyệt: "Ghi sẵn tên"

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| PET12 / MPET12 / LLDPE120 | `vatLieu[0..2]` (3 layer) |
| Khổ: 520mm | `spreadWidth = 0.52` |
| Số trục = số màu | `numColors` |
| D700 × CV400 | `cylLength = 0.7`, `cylCircumference = 0.4` |
| Phi hao in: 1767m | `phiHaoIn` |
| Phi hao ghép L1: 166m, L2: 165m | `phiHaoGhep` |
| DMPH làm túi: 164m | `phiHaoCat` |
| Kiểu túi: zipper 3 biên | `productType = 'tui'` (hiện chưa phân biệt kiểu con) |
| Hàn biên 10mm | Hiện chưa có field riêng trong engine |

---

### 3.4. LSX TUI 3 BIEN

**Loại sản phẩm**: Túi 3 biên có quai xách, đục lỗ tròn. 2 lớp: PA15 + LLDPE65.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | PA |
| Khổ | 560mm |
| Trục in | D:750 × 440mm |
| MST | (trống) |
| Số trục | 03 trục |
| Định mức phi hao | 1.440m |
| Thành phẩm in | 6.550m |

#### Thông số máy ghép

| Trường | Giá trị |
|--------|---------|
| Màng ghép | LLDPE65 |
| Khổ | K560 |
| Định mức phi hao | 141m |
| Thành phẩm ghép | 6.450m (= BTP in 6.550 − 141 + dư/thiếu) |

#### Thông số máy làm túi

| Trường | Giá trị |
|--------|---------|
| Kiểu túi | TUI 3 BIEN |
| Chiều rộng | 220mm |
| Chiều dài | 270mm |
| Dán biên | 7mm |
| Hàn đầu | 30mm |
| Đục lỗ quai xách | lỗ tròn Ø8mm cách đầu túi 10mm |
| Định mức phi hao | 240m |

**Ghi chú QA / sản xuất:**
- PA15-560 (TT): 3-2 có vật tư + tồn kho
- LLDPE65-K560: 5/3 (SV) có vật tư
- Trục in: 6-2 về trục
- Nội dung theo file, màu sắc theo Epson khách ký, khách duyệt mẫu
- **Lưu ý**: Kiểm tra đường hàn dán
- Phát hiện lỗi báo cấp trên để phân loại

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| PA / LLDPE65 | `vatLieu[0..1]` (2 layer) |
| Khổ: 560mm | `spreadWidth = 0.56` |
| Số trục: 03 | `numColors = 3` |
| D:750 × 440 | `cylLength = 0.75`, `cylCircumference = 0.44` |
| Phi hao in: 1440m | `phiHaoIn` |
| Phi hao ghép: 141m | `phiHaoGhep` |
| Phi hao làm túi: 240m | `phiHaoCat` |
| 220 × 270mm | `bagWidth = 0.22`, `bagLength = 0.27` |
| Kiểu: TUI 3 BIEN | `productType = 'tui'` |
| Hàn đầu 30mm, dán biên 7mm | Engine chưa có field riêng cho hàn đầu/dán biên |

---

### 3.5. LSX TUI 4 BIEN

**Loại sản phẩm**: Túi 4 biên xếp hông + đục lỗ thông hơi. 2 lớp: PA15 + LLDPE130.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | PA15 |
| Khổ | 640mm |
| Trục in | D:750 × 500mm |
| MST | Y105862 |
| Số trục | 08 trục |
| Chiều ra cuộn | Dây chữ ra trước |
| Định mức phi hao | 2.320m |
| Thành phẩm in | 3.300 MD (mét dài) |

#### Thông số máy ghép

| Trường | Giá trị |
|--------|---------|
| Màng ghép | LLDPE130 |
| Khổ | 640mm |
| Định mức phi hao | 120m |
| Thành phẩm ghép | 3.180 MD (ghép hết BTP in 3.300m) |

#### Thông số máy làm túi

| Trường | Giá trị |
|--------|---------|
| Kiểu túi | TUI 4 BIEN |
| Chiều rộng | 250mm |
| Chiều dài | 500mm |
| Hàn biên | 10mm |
| Hàn đầu | 50mm |
| Xếp hông | 60mm |
| Đục lỗ quai xách | 3 lỗ tròn theo Market |
| Lỗ thông hơi | 6 lỗ / mặt, Ø1mm |
| Số lượng | 5.400 − 6.000 túi |
| Định mức phi hao | 210m |

**Ghi chú QA / sản xuất:**
- PA15-640: tồn kho
- LLDPE130-K640: tồn kho
- Duyệt chạy màu sắc theo Epson giấy có chữ ký khách
- Nội dung theo file, Sáng duyệt lại mẫu in
- Trục in: 23/3 về
- **Lưu ý**: Đơn hàng không được thiếu, không được dư
- Lót màng nhựa PE hoặc OPP bên trong
- Test túi độ cao 2.5m để đảm bảo túi không bung đường hàn
- Phát hiện lỗi báo cấp trên để phân loại

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| PA15 / LLDPE130 | `vatLieu[0..1]` (2 layer) |
| Khổ: 640mm | `spreadWidth = 0.64` |
| Số trục: 08 | `numColors = 8` |
| D:750 × 500 | `cylLength = 0.75`, `cylCircumference = 0.5` |
| Phi hao in: 2320m | `phiHaoIn` |
| Phi hao ghép: 120m | `phiHaoGhep` |
| Phi hao làm túi: 210m | `phiHaoCat` |
| 250 × 500mm | `bagWidth = 0.25`, `bagLength = 0.5` |
| Xếp hông: 60mm | Engine chưa hỗ trợ field xếp hông |

---

### 3.6. LSX TUI LUNG GIUA

**Loại sản phẩm**: Túi dán lưng giữa, đáy đứng. 2 lớp: PA15 + LLDPE82. Có khâu chia trước khi làm túi.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | PA15 |
| Khổ | 660mm |
| Trục in | D:750 × 600mm |
| MST | Y701466 |
| Số trục | 06 trục |
| Chiều ra cuộn | Tự do |
| Định mức phi hao | 2.058m |
| Thành phẩm in | 8.700m |

#### Thông số máy ghép

| Trường | Giá trị |
|--------|---------|
| Màng ghép | LLDPE82 |
| Khổ | 660mm |
| Định mức phi hao | 157m |
| Thành phẩm ghép | 8.543m (ghép hết BTP in) |

#### Thông số máy chia

| Trường | Giá trị |
|--------|---------|
| Khổ chia | K318mm (a Trung xác nhận lại) |

#### Thông số máy làm túi

| Trường | Giá trị |
|--------|---------|
| Kiểu túi | TUI DAN LUNG GIUA |
| Chiều rộng | 146mm |
| Chiều dài | 300mm |
| Hàn đầu | 13mm |
| Dán lưng | 13mm |
| Lỗ thông hơi | Đục 2 lỗ trên/dưới |
| Định mức phi hao | 255m |

**Ghi chú QA / sản xuất:**
- PA15-K660 (MT): có sẵn
- LLDPE82-K660 (MT): 10-5 có vật tư
- Chạy màu sắc theo mẫu đã sản xuất
- Trục in: trục cũ
- Test túi độ cao 2.5m để đảm bảo không bung đường hàn
- Dán tem CTY
- Chạy theo cromaline

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| PA15 / LLDPE82 | `vatLieu[0..1]` (2 layer) |
| Khổ: 660mm | `spreadWidth = 0.66` |
| Số trục: 06 | `numColors = 6` |
| D:750 × 600 | `cylLength = 0.75`, `cylCircumference = 0.6` |
| Phi hao in: 2058m | `phiHaoIn` |
| Phi hao ghép: 157m | `phiHaoGhep` |
| Khổ chia: K318mm | `cutWidth = 0.318` |
| Phi hao làm túi: 255m | `phiHaoCat` |
| 146 × 300mm | `bagWidth = 0.146`, `bagLength = 0.3` |
| Dán lưng: 13mm | Engine chưa hỗ trợ field dán lưng |

---

### 3.7. LSX -XEP HONG LUNG LECH

**Loại sản phẩm**: Túi xếp hông dán lưng lệch. 3 lớp: MattOPP20 + MPET12 + LLDPE90. Có khâu chia.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | MattOPP20 |
| Khổ | 780mm |
| Trục in | MST: G123849 |
| Số trục | 01 trục (in 1 màu) |
| Định mức phi hao | 540m |
| Thành phẩm in | 5.500m |

#### Thông số máy ghép

| Trường | Giá trị |
|--------|---------|
| Màng ghép 1 | MPET12 |
| Khổ | 780mm |
| Màng ghép 2 | LLDPE90 |
| Khổ | 780mm |
| Định mức phi hao L1 | 134m |
| Định mức phi hao L2 | 133m |
| Thành phẩm ghép | 5.233m (ghép hết BTP in 5.500m) |

#### Thông số máy chia

| Trường | Giá trị |
|--------|---------|
| Khổ màng | 780mm |
| Khổ hình | K760mm |
| Khổ chia | 380mm |
| Định mức phi hao chia | 0m |

#### Thông số máy làm túi

| Trường | Giá trị |
|--------|---------|
| Kiểu túi | TUI XEP HONG DAN LUNG LECH |
| Chiều rộng | 102mm |
| Chiều dài | 320mm |
| Xếp hông | 73mm |
| Dán lưng lệch (phải) | 10mm |
| Dán đáy | 10mm |
| Định mức phi hao | 264m |

**Ghi chú QA / sản xuất:**
- MattOPP20 K780: tồn kho 6.000m + đặt mới 3/6 (SC)
- PE90-K780: 4/6 (VP)
- MPET12-K780: 30/5 (Tấn Khởi Phát)
- Duyệt mẫu theo mẫu đã sản xuất
- Chiều xuất: đầu túi ra trước
- Đóng thùng 1.500 túi/thùng
- Đảm bảo đường hàn chắc chắn
- Chạy theo túi đợt đã sản xuất. Anh Duy duyệt lại trước khi sản xuất hàng loạt
- Phát hiện lỗi báo cấp trên phân loại

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| MattOPP20 / MPET12 / LLDPE90 | `vatLieu[0..2]` (3 layer) |
| Khổ: 780mm | `spreadWidth = 0.78` |
| Số trục: 01 | `numColors = 1` |
| Phi hao in: 540m | `phiHaoIn` |
| Phi hao ghép L1: 134m, L2: 133m | `phiHaoGhep` |
| Khổ chia: 380mm | `cutWidth = 0.38` |
| Phi hao làm túi: 264m | `phiHaoCat` |
| 102 × 320mm | `bagWidth = 0.102`, `bagLength = 0.32` |
| Xếp hông 73mm, dán lưng lệch 10mm | Engine chưa hỗ trợ |

---

### 3.8. LSX TUI ZIPPER CAT SEAL

**Loại sản phẩm**: Túi zipper cắt seal với lỗ treo. 1 lớp PE70. Có khâu chia BTP trước khi làm túi.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | LLDPE70 |
| Khổ | 650mm |
| Trục in | D722 × CV456 |
| MST | Y609898 (cây 1+2), Y615453 (cây số 3 mới) |
| Số trục | 03 trục |
| Chiều ra cuộn | Đầu chữ ra trước |
| Định mức phi hao | 1.300m |
| Thành phẩm in | 760 MD |

#### Thông số máy chia

| Trường | Giá trị |
|--------|---------|
| Chia BTP thành phẩm in | PE70 × 650 × 760m |
| Thành phẩm chia | PE70 × 207 × 1.140m: 2 cuộn |

#### Thông số máy làm túi

| Trường | Giá trị |
|--------|---------|
| Kiểu túi | TUI ZIPPER CẮT SEAL |
| Chiều rộng | 75mm |
| Chiều dài | 103.5mm |
| Tâm zipper cách đầu | 25mm |
| Đục treo lỗ tròn | Ø8mm ở giữa khoảng cách miệng túi và tâm zipper |
| Số lượng | 20.000 túi |
| Định mức phi hao | 250m (K207 ~) |

**Ghi chú QA / sản xuất:**
- PE70-650 (VP): 29-04 có vật tư
- Chạy màu sắc theo cromeline, khách duyệt online, nội dung theo file
- Trục in: 22-4 về cây số 3
- **Lưu ý**: Kiểm tra zipper
- Sử dụng zipper PE không cánh
- Chạy túi theo file, Duy duyệt lại mẫu trước khi sản xuất hàng loạt
- Phát hiện lỗi báo cấp trên để phân loại

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| LLDPE70 | `vatLieu[0]` (1 layer) |
| Khổ: 650mm | `spreadWidth = 0.65` |
| Số trục: 03 | `numColors = 3` |
| D722 × CV456 | `cylLength = 0.722`, `cylCircumference = 0.456` |
| Phi hao in: 1300m | `phiHaoIn` |
| Khổ chia: 207mm | `cutWidth = 0.207` |
| Phi hao làm túi: 250m | `phiHaoCat` |
| 75 × 103.5mm | `bagWidth = 0.075`, `bagLength = 0.1035` |
| Zipper cách đầu 25mm | Engine chưa hỗ trợ field vị trí zipper |

---

### 3.9. LSX - ZIPPER DAY DUNG

**Loại sản phẩm**: Túi zipper đáy đứng (stand-up pouch). 3 lớp: PET12 + MPET12 + LLDPE90.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | PET12 |
| Khổ | 780mm |
| Trục in | D:850 × CV:442 |
| MST | Ngày 10/06/2026 có trục |
| Số trục | 3 trục |
| Định mức phi hao | 840m |
| Thành phẩm in | 6.000m |

#### Thông số máy ghép

| Trường | Giá trị |
|--------|---------|
| Màng ghép 1 | MPET12 |
| Khổ | 760mm |
| Màng ghép 2 | LLDPE90 |
| Khổ | 760mm |
| Định mức phi hao L1 | 110m |
| Định mức phi hao L2 | 109m |
| Thành phẩm ghép | 5.780m (ghép hết BTP in 6.000m) |

#### Thông số máy làm túi

| Trường | Giá trị |
|--------|---------|
| Kiểu túi | TUI ZIPPER ĐÁY ĐỨNG |
| Chiều rộng | 220mm |
| Chiều dài | 320mm |
| Tâm zipper cách miệng | 30mm |
| Nhấn xé "V" | 2 bên cách miệng 15mm |
| Dán biên | 10mm |
| Xếp đáy | 100mm |
| Định mức phi hao | 140m |

**Ghi chú QA / sản xuất:**
- PET12-K760: 9/6 → chạy theo mẫu đã sản xuất
- MPET12-K760: 5/2 (SC)
- LLDPE90-K760: 5/2 (SV)
- Chiều xuất: tự do
- Chạy túi theo mẫu đã sản xuất, Anh Duy duyệt lại mẫu
- Phát hiện lỗi báo KINH DOANH để phân loại

**Bất biến NVL = TP + Phi hao:**
```
TP in = 6.000m
Phi hao in = 840m
→ NVL in = 6.000 + 840 = 6.840m
TP ghép = 5.780m (= 6.000 − 110 − 109 − 1*)
→ NVL ghép L1 = 6.000 + 110 = 6.110m
→ NVL ghép L2 = 6.000 + 109 = 6.109m
```
*Có sai lệch nhỏ 1m do làm tròn, công thức tổng quát vẫn đúng.

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| PET12 / MPET12 / LLDPE90 | `vatLieu[0..2]` (3 layer) |
| Khổ: 780mm | `spreadWidth = 0.78` |
| Số trục: 3 | `numColors = 3` |
| D:850 × CV:442 | `cylLength = 0.85`, `cylCircumference = 0.442` |
| Phi hao in: 840m | `phiHaoIn` |
| Phi hao ghép L1: 110m, L2: 109m | `phiHaoGhep` |
| Phi hao làm túi: 140m | `phiHaoCat` |
| 220 × 320mm | `bagWidth = 0.22`, `bagLength = 0.32` |
| Zipper cách miệng 30mm, xếp đáy 100mm | Engine chưa hỗ trợ |

---

### 3.10. LS- TUI CAT SEAL MO MIENG CO NAP BANG KEO

**Loại sản phẩm**: Túi cắt seal mở miệng có nắp băng keo + quai xách dọc. 3 lớp: mattOPP20 + MPET12 + PE40.

#### Thông số máy in

| Trường | Giá trị |
|--------|---------|
| Màng in | mattOPP20 |
| Khổ | 560mm |
| Trục in | 700mm × 501mm |
| MST | G711145 |
| Số trục | 06 trục |
| Định mức phi hao | 1.578m |
| Thành phẩm in | 12.000m |

#### Thông số máy ghép

| Trường | Giá trị |
|--------|---------|
| Màng ghép 1 | MPET12 |
| Khổ | 560mm |
| Màng ghép 2 | PE40 |
| Khổ | 560mm |
| Định mức phi hao L1 | 147m |
| Định mức phi hao L2 | 146m |
| Thành phẩm ghép | 11.700m |

#### Thông số máy chia

| Trường | Giá trị |
|--------|---------|
| Tỷ lợi dụng khổ | 534mm theo yêu cầu máy tới |
| Chiều xuất | Logo Pharmacity ra trước |

#### Thông số máy làm túi

| Trường | Giá trị |
|--------|---------|
| Kiểu túi | TUI CẮT SEAL MỞ MIỆNG CÓ NẮP KEO |
| Chiều rộng | 125mm |
| Chiều dài | 255mm |
| Nắp | 35mm |
| Từ đầu đến sóng siêu âm | 32mm |
| Dọc quai xách | cây dọc riêng của khách |
| Dán keo ở mé dưới trong nắp | có |
| Định mức phi hao | 175m |

**Ghi chú QA / sản xuất:**
- mattOPP20 K560: 12/7 (Kiến Thành)
- MPET12 K560: 11/7 (Triệt Toàn)
- PE40 K560: 15/7 (SV)
- Duyệt mẫu: theo mẫu tại, khách tới cty duyệt, báo trước 1 ngày
- Chiều xuất: dưới chữ của Logo Pharmacity (màu xanh) ra trước
- **Chú ý**: CHẠY THEO TÚI MẪU, SALE DUYỆT LẠI TRƯỚC KHI SẢN XUẤT HÀNG LOẠT

**Mapping sang engine:**

| LSX | `DauVaoTinhGia` |
|-----|-----------------|
| mattOPP20 / MPET12 / PE40 | `vatLieu[0..2]` (3 layer) |
| Khổ: 560mm | `spreadWidth = 0.56` |
| Số trục: 06 | `numColors = 6` |
| D:700 × CV:501 | `cylLength = 0.7`, `cylCircumference = 0.501` |
| Phi hao in: 1578m | `phiHaoIn` |
| Phi hao ghép L1: 147m, L2: 146m | `phiHaoGhep` |
| Phi hao làm túi: 175m | `phiHaoCat` |
| 125 × 255mm | `bagWidth = 0.125`, `bagLength = 0.255` |
| Nắp 35mm, sóng siêu âm 32mm | Engine chưa hỗ trợ |

---

## 4. Phân loại 8 kiểu túi thực tế

Từ 10 LSX, trích xuất được **8 kiểu túi** khác nhau ngoài loại màng:

| # | Kiểu túi | Hàn biên | Hàn đầu | Xếp hông | Xếp đáy | Dán lưng | Zipper | Đặc trưng riêng | LSX tham chiếu |
|---|----------|----------|----------|----------|----------|----------|---------|-----------------|----------------|
| 1 | Túi 3 biên | 7mm | 30mm | - | - | - | - | Quai xách, đục lỗ tròn Ø8 | #4 |
| 2 | Túi 4 biên | 10mm | 50mm | 60mm | - | - | - | 6 lỗ thông hơi Ø1, 3 lỗ quai, test rơi 2.5m | #5 |
| 3 | Túi dán lưng giữa | - | 13mm | - | - | 13mm (giữa) | - | 2 lỗ thông hơi trên/dưới, có khâu chia | #6 |
| 4 | Túi xếp hông dán lưng lệch | - | - | 73mm | - | 10mm (lệch phải) | - | Dán đáy 10mm, chia K760→380, 3 lớp | #7 |
| 5 | Túi zipper 3 biên | 10mm | tự điền | - | - | - | có | Dao cắt 2 nhịp, khuôn bán nguyệt | #3 (template) |
| 6 | Túi zipper cắt seal | - | - | - | - | - | có | Lỗ treo Ø8, zipper PE không cánh, 1 lớp | #8 |
| 7 | Túi zipper đáy đứng | 10mm (dán biên) | - | - | 100mm | - | có | Nhấn xé "V" 2 bên cách miệng 15mm, tâm zipper cách miệng 30mm | #9 |
| 8 | Túi cắt seal có nắp băng keo | - | - | - | - | - | - | Nắp 35mm, sóng siêu âm 32mm, dọc quai xách, dán keo mé dưới nắp | #10 |

---

## 5. Mapping LSX → schema engine

### 5.1. Bảng map đầy đủ từng trường

| Trường LSX | Đơn vị LSX | Field `DauVaoTinhGia` | Đơn vị engine | Ghi chú |
|------------|-----------|----------------------|---------------|--------|
| Màng in | tên VL | `vatLieu[0].name` | string | Map qua bảng vật liệu |
| Màng ghép 1 | tên VL | `vatLieu[1].name` | string | Nếu có |
| Màng ghép 2 | tên VL | `vatLieu[2].name` | string | Nếu có |
| Khổ màng in | mm | `spreadWidth` | m | Chia 1000 |
| Trục in D | mm | `cylLength` | m | Chia 1000 |
| Trục in CV | mm | `cylCircumference` | m | Chia 1000 |
| Số trục | số | `numColors` | số | 1:1 |
| Định mức phi hao in | mét | `phiHaoIn` / `wasteMeters` | m | Chia 1000 nếu engine dùng m |
| Định mức phi hao ghép L1+L2 | mét | `phiHaoGhep` | m | Gộp L1+L2 |
| Định mức phi hao làm túi | mét | `phiHaoCat` | m | |
| Thành phẩm in yêu cầu | mét | `quantity` (sau khi tính) | m² hoặc cái | Phụ thuộc productType |
| Chiều rộng túi | mm | `bagWidth` | m | Chia 1000 |
| Chiều dài túi | mm | `bagLength` | m | Chia 1000 |
| Khổ chia | mm | `cutWidth` | m | Chia 1000 |
| Kiểu túi | text | `productType` | `'tui'` hoặc `'mang'` | Hiện chỉ có 2 giá trị, chưa phân biệt 8 kiểu con |
| Số lượng túi | cái | `quantity` | số | Dùng cho `productType='tui'` |

### 5.2. Các trường LSX engine CHƯA hỗ trợ

Đây là các trường xuất hiện trong LSX thực tế nhưng chưa có field tương ứng trong `DauVaoTinhGia`:

| # | Trường LSX | Mô tả | Mức độ ưu tiên |
|---|-----------|-------|---------------|
| 1 | MST (Mã Số Trục) | Mã định danh trục in, VD: G711145, Y105862 | Thấp — quản lý kho trục, không ảnh hưởng tính giá |
| 2 | Vị trí zipper (tâm zipper cách miệng) | Khoảng cách từ miệng túi đến tâm zipper (mm) | Cao — ảnh hưởng chi phí zipper và cấu trúc túi |
| 3 | Xếp đáy | Bề sâu xếp đáy túi stand-up (mm) | Cao — ảnh hưởng diện tích màng và cấu trúc túi |
| 4 | Xếp hông | Bề sâu xếp hông 2 bên (mm) | Cao — ảnh hưởng diện tích màng |
| 5 | Dán lưng (giữa / lệch) | Bề rộng dán lưng + vị trí (giữa hay lệch) | Cao — ảnh hưởng diện tích và khổ màng |
| 6 | Nắp | Chiều dài nắp gập + băng keo (mm) | Trung bình — đặc thù 1 kiểu túi |
| 7 | Hàn biên / Hàn đầu | Bề rộng đường hàn (mm) | Thấp — ảnh hưởng nhỏ đến diện tích sử dụng |
| 8 | Lỗ thông hơi / Lỗ treo / Lỗ quai xách | Số lượng, đường kính, vị trí | Trung bình — ảnh hưởng chi phí gia công |
| 9 | Nhấn xé "V" | Vị trí và khoảng cách nhấn xé | Thấp — ảnh hưởng chi phí gia công |
| 10 | Chiều ra cuộn (đầu chữ / dây chữ ra trước) | Hướng quấn cuộn | Thấp — QC sản xuất, không ảnh hưởng giá |
| 11 | Dọc quai xách | Quai dọc riêng của khách | Trung bình — ảnh hưởng chi phí vật tư phụ |
| 12 | Sóng siêu âm | Khoảng cách từ đầu túi đến đường sóng siêu âm | Thấp — đặc thù túi có nắp |
| 13 | Dán đáy | Bề rộng dán đáy (mm) | Thấp — đặc thù túi lưng lệch |

### 5.3. Đối chiếu invariant CLAUDE.md

#### NVL = Thành phẩm + Phi hao

Kiểm chứng với LSX ZIPPER ĐÁY ĐỨNG (#9):

```
Công đoạn in:
  Thành phẩm in = 6.000m
  Phi hao in = 840m
  → NVL in = 6.000 + 840 = 6.840m ✓

Công đoạn ghép:
  Thành phẩm ghép = 5.780m
  BTP in = 6.000m
  Phi hao ghép L1 = 110m, L2 = 109m
  → NVL ghép = BTP in + phi hao = 6.000 + 110 + 109 = 6.219m
  → 5.780 ≈ 6.000 − 110 − 109 = 5.781 ✓ (lệch 1m làm tròn)

Kết luận: Công thức NVL = TP + Phi hao (cộng thêm, không nhân) khớp với số liệu LSX thực tế.
```

#### numImages — minh chứng từ LSX BOPP

LSX IN MANG BOPP (#1):
```
Khổ màng: 1040mm, 1060mm → spreadWidth = 1.04m, 1.06m
Khổ chia: K510mm → cutWidth = 0.51m
→ numImages = floor(spreadWidth / cutWidth) = floor(1040/510) = 2
→ Mỗi lần in ra 2 cuộn, mỗi cuộn rộng 510mm.
→ cylLength = max(0.7, spreadWidth × numImages + 0.1) 
            = max(0.7, 1.04 × 2 + 0.1) = 2.18m
```

Tuy nhiên LSX này ghi trục D=1120mm (1.12m), có thể vì đây là 2 khổ khác nhau (1040 và 1060) chạy trên cùng trục dài, hoặc trục dùng cho mục đích khác.

---

## 6. Khoảng trống Schema vs LSX thực

### 6.1. `productType` cần mở rộng

Hiện tại `productType` chỉ có 2 giá trị: `'tui'` | `'mang'`. LSX thực tế yêu cầu ít nhất:

```typescript
type KieuTui =
  | 'tui-3-bien'            // Túi 3 biên
  | 'tui-4-bien'            // Túi 4 biên xếp hông
  | 'tui-lung-giua'         // Túi dán lưng giữa
  | 'tui-lung-lech'         // Túi xếp hông dán lưng lệch
  | 'tui-zipper-3-bien'     // Túi zipper 3 biên
  | 'tui-zipper-cat-seal'   // Túi zipper cắt seal
  | 'tui-zipper-day-dung'   // Túi zipper đáy đứng
  | 'tui-cat-seal-co-nap'   // Túi cắt seal có nắp băng keo
```

### 6.2. Field bổ sung cần thêm vào `DauVaoTinhGia`

```typescript
interface ThongSoTui {
  kieuTui: KieuTui;
  
  // Kích thước
  bagWidth: number;         // mm — đã có
  bagLength: number;        // mm — đã có
  
  // Hàn
  hanBien?: number;         // mm — bề rộng hàn biên
  hanDau?: number;          // mm — bề rộng hàn đầu/đáy
  
  // Xếp
  xepHong?: number;         // mm — bề sâu xếp hông
  xepDay?: number;          // mm — bề sâu xếp đáy (stand-up)
  
  // Dán lưng
  danLung?: number;         // mm — bề rộng dán lưng
  danLungLech?: boolean;    // true = lưng lệch, false = lưng giữa
  
  // Zipper
  coZipper?: boolean;
  tamZipperCachMieng?: number; // mm
  
  // Nắp
  coNap?: boolean;
  chieuDaiNap?: number;     // mm
  
  // Phụ kiện
  loThongHoi?: number;      // số lỗ
  loTreo?: number;           // số lỗ
  loQuaiXach?: number;      // số lỗ
  nhanXeChuV?: boolean;
  
  // Gia công đặc biệt
  songSieuAm?: number;      // mm — khoảng cách từ đầu
  docQuaiXach?: boolean;    // có quai dọc riêng
  danKeoNap?: boolean;      // dán keo mé dưới nắp
}
```

### 6.3. Tác động đến các package

| Package | Thay đổi cần |
|---------|-------------|
| `kieu-du-lieu` | Thêm `KieuTui`, mở rộng `DauVaoTinhGia` với `ThongSoTui` |
| `bang-tinh-gia` | Cập nhật `tinh-gia.ts` để xử lý 8 kiểu túi, mỗi kiểu có công thức tính diện tích/chi phí riêng |
| `hang-so` | Thêm hằng số mặc định cho từng kiểu túi (hàn biên, xếp hông mặc định...) |
| `apps/web` | Cập nhật `TheNhapLieu.tsx` — hiển thị form theo kiểu túi đã chọn |
| `apps/mobile` | Tương tự web |
| `apps/flutter_app` | Cập nhật engine bundle |

---

## 7. Đề xuất sử dụng tài liệu

### 7.1. Test fixtures từ số liệu thật

Với mỗi LSX có số liệu đầy đủ (trừ template trống #2, #3), tạo 1 test case trong `packages/bang-tinh-gia/__tests__/`:

```typescript
// VD: lsx-zipper-day-dung.test.ts
const input: DauVaoTinhGia = {
  productType: 'tui',
  vatLieu: [
    { name: 'PET12', costPerKg: ..., density: ... },
    { name: 'MPET12', costPerKg: ..., density: ... },
    { name: 'LLDPE90', costPerKg: ..., density: ... },
  ],
  spreadWidth: 0.78,
  cylLength: 0.85,
  cylCircumference: 0.442,
  numColors: 3,
  phiHaoIn: 840,
  phiHaoGhep: 219, // L1 + L2 = 110 + 109
  phiHaoCat: 140,
  bagWidth: 0.22,
  bagLength: 0.32,
  quantity: 5780, // mét ghép → tính số túi
};

// Expected: thành phẩm ghép ≈ 5.780m, ...
```

### 7.2. Form nhập liệu nhóm 4 công đoạn

`TheNhapLieu.tsx` nên tổ chức thành 4 section/accordion:

```
┌─────────────────────────────────┐
│ 1. MÁY IN                        │
│    Màng in: [________] Khổ: [__] │
│    Trục in: D[___] CV[___]       │
│    MST: [______] Số trục: [__]   │
│    Phi hao: [_____] m            │
│    TP in: [_______] m            │
├─────────────────────────────────┤
│ 2. MÁY GHÉP (nếu có)            │
│    Màng ghép 1: [____] Khổ: [_] │
│    Màng ghép 2: [____] Khổ: [_] │
│    Phi hao L1: [___] L2: [___]  │
│    TP ghép: [_______] m         │
├─────────────────────────────────┤
│ 3. MÁY CHIA (nếu có)            │
│    Khổ màng: [____]             │
│    Khổ chia: [____]             │
│    Phi hao chia: [___] m        │
├─────────────────────────────────┤
│ 4. MÁY LÀM TÚI                  │
│    Kiểu túi: [dropdown 8 kiểu]  │
│    Rộng: [___] Dài: [___]       │
│    (hiện/ẩn theo kiểu túi)      │
│    Hàn biên: [__] Hàn đầu: [__]│
│    Xếp hông: [__] Xếp đáy: [__]│
│    ...                           │
│    Phi hao: [_____] m           │
└─────────────────────────────────┘
```

### 7.3. QA checklist từ LSX

Các ghi chú QA lặp lại trong LSX, nên tích hợp vào app:

| Ghi chú QA | Tần suất |
|------------|----------|
| Chạy theo mẫu đã sản xuất / duyệt lại mẫu trước khi SX hàng loạt | 8/10 |
| Phát hiện lỗi báo cấp trên để phân loại | 5/10 |
| Test rơi độ cao 2.5m (túi không bung hàn) | 2/10 |
| Kiểm tra zipper | 2/10 |
| Đóng thùng xxx túi/thùng | 1/10 |
| Dán tem CTY | 3/10 |
| Cân kỹ cẩn thận, tránh sai lệnh | 1/10 |

---

## 8. Phụ lục — trích nguyên văn 10 LSX

### 8.1. LS- TUI CAT SEAL MO MIENG CO NAP BANG KEO

```
II. CONG VIEC CAN THUC HIEN

MAY IN
MAY GHEP

Mang in: mattOPP20
Kho: 560mm
Mang ghep 1: MPET12
Kho: 560mm

Truc in: 700mm x 501mm
MST: G711145
So truc: 06
Mang ghep 1: PE40
Kho: 560mm

Thanh pham yeu cau: 12.000m
Dinh muc phi hao:  1.578m
Ghi chu:
- mattOPP20 K560: 12/7 (Kien Thanh)
- Duyet mau: theo mau tai, khach tai cty duyet, bao truoc 1 ngay
- Chieu xuat: duoi chu cua Logo Pharmacity (mau xanh) ra truoc
Dinh muc phi hao: L1: 147m, L2: 146m
Thanh pham yeu cau: 11.700m
Ghi chu:
MPET12 K560: 11/7 (Triet Toan)
PE40 K560: 15/7 (SV)

MAY CHIA
MAY LAM TUI

Ty loi dung kho 534mm theo yeu cau may toi
Chieu xuat: Logo Pharmacity ra truoc

Chu y: CHAY THEO TUI MAU, SALE DUYET LAI TRUOC KHI SAN XUAT HANG LOAT

Yeu cau giao hang cua KH:
Dinh muc phi hao: 175m

Kieu tui: TUI CAT SEAL MO MIENG CO NAP KEO

Chieu rong: 125mm
Chieu dai: 255mm

Nap: 35mm

Tu dau den song sieu am : 32mm

Doc quai xach: cay doc rieng cua khach

Dan keo o me duoi trong nap

Nguoi lap:
Nguoi duyet:
```

### 8.2. LSX - ZIPPER DAY DUNG

```
II. CONG VIEC CAN THUC HIEN

MAY IN
MAY GHEP

Mang in: PET12
Kho: 780mm
Mang ghep 1: MPET12
Kho: 760mm

Truc in: D: 850*CV: 442
MST:
Ngay 10/06/2026 co truc
So truc: 3 Truc
Mang ghep 2: LLDPE90
Kho: 760mm

Thanh pham yeu cau: 6.000m
Dinh muc phi hao: 840M
Ghi chu:
 PET12-K760 :9/6
 => chay theo mau da san xuat
Chieu xuat: tu do
Thanh pham yeu cau: 5.780m ( Ghep het BTP in 6000m)
Dinh muc phi hao: L1: 110M  ,   L2: 109M
Ghi chu:
MPET 12-K760: 5/2 ( SC)
LLDPE90 - K760: 5/2 (SV)

MAY LAM TUI

Ghi chu:
Phat hien loi bao KINH DOANH de phan loai.

Kieu tui: TUI ZIPPER DAY DUNG

Chieu rong: 220mm
Chieu dai: 320mm

Tam zipper cach mieng: 30mm
Nhan xe "v": 2 ben cach mieng 15mm

Dan bien: 10mm
Xep day: 100mm

Dinh muc phi hao : 140 M
Ghi chu: Chay tui theo mau da san xuat, Anh duy duyet lai mau

Nguoi lap:
Nguoi duyet:
```

### 8.3. LSX -XEP HONG LUNG LECH

```
II. CONG VIEC CAN THUC HIEN

MAY IN
MAY GHEP

Mang in: MattOPP20
Kho: 780mm
Mang ghep 1: MPET12
Kho: 780mm

Truc in: G123849
So truc: 01 truc
Mang ghep 2: LLDPE90
Kho: 780mm

Dinh muc phi hao: 540m
Thanh pham yeu cau: 5.500m
Ghi chu:
MattOPP20 K780: ton kho 6.000M + dat moi 3/6 ( SC)
=> Duyet mau theo mau da sx
Chieu xuat: dau tui ra truoc
Dinh muc phi hao: L1: 134m ; L2: 133m
Thanh pham yeu cau: 5.233m ( ghep het BTP in 5.500m)
Ghi chu:
PE90-k780 : 4/6 (VP)
MPET12-k780 : 30/5 ( Tan khoi phat)

MAY CHIA
MAY LAM TUI

Kho mang: 780mm
Kho hinh: K760mm  -  Kho chia: 380mm
Dinh muc phi hao chia: 0m

Kieu tui: TUI XEP HONG DAN LUNG LECH

Chieu rong: 102mm
Chieu dai: 320mm

Dinh muc phi hao: 264m

Ghi chu: Phat hien loi bao cap tren phan loai.
 -DONG THUNG 1.500 TUI / THUNG
Xep hong: 73mm

Dan lung lech (phai): 10mm

Dan day: 10mm

Ghi chu:  Dam bao duong han chac chan
=> Chay theo tui dot da SX. Anh duy duyet lai truoc khi Sx hang loat

Nguoi lap:
Nguoi duyet:
```

### 8.4. LSX IN MANG BOPP

```
MAY IN

Mang in: BOPP18
Kho: 1040 ,1060 mm

Truc in: D:1120 x CV:790mm
MST:Y105209G2
So truc: 05 truc.
Chieu ra cuon: Day mang ra truoc

Dinh muc phi hao: 4.250 M
Thanh pham in: 166.000 M
Ghi chu: BOPP18- 1040: 56.000m
BOPP 18-1060: 114.250m
Truc in: 28/4 ve truc date, con lai truc cu
=> MAU SAC CHAY THEO MAU DA SAN XUAT GAN NHAT , NOI DUNG THEO FILE.DUY DUYET LAI MAU IN

MAY CHIA

Kho mang: K1040 ,1060mm
Kho chia: K510mm

Chieu dai quan cuon: 7.000m/cuon
((Luu y: Dua vao so met thuc te ma linh dong chia cuon hop ly)
Chieu ra cuon: Dau mang ra truoc

Dinh muc phi hao:  0m

Khach yeu cau giao hang:
Ghi chu: Quan cuon dung quy cach, cuon le khong qua 7500m/cuon.
Can ky can than, dam bao chinh xac tranh sai lenh qua nhieu.
Danh dau MT-MS de khach hang phan biet
=> DAN TEM CTY

Nguoi lap:
Nguoi Duyet:
```

### 8.5. LSX MANG IN (template trống)

```
MAY IN

Mang in:
Kho:

Quy cach truc:
MST:
So truc:
Chieu ra cuon:

Thanh pham in yeu cau:
Dinh muc phi hao:
So luong cap vat tu:
Ghi chu:
Su dung mang
Truc in :

MAY CHIA

Kho mang:
Kho chia:

Chieu dai quan cuon:
(Luu y: Dua vao so met thuc te ma linh dong chia cuon hop ly)
Chieu ra cuon:

Dinh muc phi hao: 0m
Khach hang yeu cau giao:
Ghi chu: Quan cuon dung quy cach, cuon le khong qua ..m/cuon
Can ky can than, dam bao chinh xac tranh sai lenh qua nhieu.
Danh dau tung cap MT-MS de khach hang phan biet.
** Luu y:

Nguoi lap:
Nguoi Duyet:
```

### 8.6. LSX TUI 3 BIEN

```
II. CONG VIEC CAN THUC HIEN

MAY IN
MAY GHEP

Mang in:PA
Kho: 560mm

Truc in: D: 750*440mm
MST:
So truc: 03 truc
Mang ghep : LLDPE65
Kho: K560

Dinh muc phi hao: 1.440m
Thanh pham mang in: 6.550 m
PA 15-560 (TT): 3-2 co VT + ton kho
Truc in : 6-2 ve truc
Ghi chu:.
=> Noi dung theo file , mau sac theo Epson khach ky, khach duyet mau.

Dinh muc phi hao:  141m
Thanh pham ghep: 6.450m
Ghi chu:
- LLDPE65- K560: 5/3(SV) co VT

MAY LAM TUI

-Dinh muc phi hao: 240 m
* Luu y: Kiem tra Duong han dan
- KH yeu cau giao:

* PHAT HIEN LOI BAO CAP TREN DE PHAN LOAI

Kieu tui: TUI 3 BIEN

Chieu rong: 220mm
Chieu dai: 270mm

Dan bien: 7mm
Han dau: 30mm

Duc lo: quai xach: lo tron O8mm cach dau tui 10mm

Ghi chu: Chay theo marka

Nguoi lap:
Nguoi duyet:
```

### 8.7. LSX TUI 4 BIEN

```
II. CONG VIEC CAN THUC HIEN

MAY IN
MAY GHEP

Mang in: PA15
Kho: 640mm
Mang ghep :LLDPE130
Kho: 640mm

Truc in: D:750 x 500mm
MST:Y105862
So truc: 08 truc
Chieu : Day chu ra truoc

Dinh muc phi hao: 2.320 M
Thanh pham in:  3.300 MD
Ghi chu: PA15-640: ton kho
=> Duyet Chay mau sac theo Epson giay co chu ky khach , Noi dung theo file, Sang duyet lai mau in
- Truc in: 23/3 ve
Dinh muc phi hao: 120 m
Thanh pham ghep: 3.180 MD ( ghep het BTP in 3.300m)
So luong cap vat tu:
Ghi chu: - LLDPE130-K640: ton kho

MAY LAM TUI

So luong : 5.400 tui -6.000 tui
Don hang Khong duoc thieu, Khong duoc du.
Luu y:
 - Lot mang nhua PE hoac OPP ben trong - Test tui do cao 2.5m de dam bao tui khong bung duong han.

YEU CAU GIAO HANG:
=> PHAT HIEN LOI BAO CAP TREN DE PHAN LOAI
Kieu tui: TUI 4 BIEN

Chieu rong: 250mm
Chieu dai: 500mm

Han bien: 10mm
Han dau: 50mm

Xep hong: 60mm

Duc 3 lo tron quai xach( Theo Market)

Duc lo thong hoi 6 lo/ mat : O1mm

Dinh muc phi hao : 210 M ~

Ghi chu: Chay quy cach tui theo market.

Nguoi lap:
Nguoi duyet:
```

### 8.8. LSX TUI LUNG GIUA

```
II. CONG VIEC CAN THUC HIEN

MAY IN
MAY GHEP

Mang in: PA15
Kho: 660mm
Mang ghep : LLDPE82
Kho: 660mm

Truc in:D:750 x 600mm
MST: Y701466
So truc: 06 truc

Dinh muc phi hao: 2.058M
Thanh pham in: 8.700m
Ghi chu: PA15-K660 (MT): co san
=> Chay mau sac theo mau da san xuat.
Truc in: truc cu
Chieu xuat: tu do
Dinh muc phi hao: 157m
Thanh pham ghep: 8.543 M (ghep het BTP in)
Ghi chu:
- LLDPE82-K660(MT): 10-5 Co VT

MAY CHIA
MAY LAM TUI

Kho chia: K318mm (a Trung xac nhan lai)

Kieu tui: TUI DAN LUNG GIUA

Chieu rong: 146mm
Chieu dai: 300mm

Han dau: 13mm

Luu Y:
- Test tui do cao 2.5m de dam bao tui khong bung duong han.

=> DAN TEM CTY

Dan lung: 13mm. Duc 2 lo thong hoi tren/duoi

Dinh muc phi hao: 255m
Ghi chu: chay theo cromaline

Nguoi lap:
Nguoi duyet:
```

### 8.9. LSX TUI ZIPPER CAT SEAL

```
II. CONG VIEC CAN THUC HIEN

MAY IN
MAY CHIA

Mang in: LLDPE 70
Kho: 650mm
Chia BTP Thanh pham in :  PE 70 X 650 X 760 M
Thanh : PE 70 X207 x 1.140m: 2 cuon

Truc in:D722 X CV 456
MST: Y609898 : cay 1+2
MST : Y615453:cay so 3 moi
So truc: 03 truc
Chieu ra cuon : Dau chu ra truoc

Dinh muc phi hao: 1300m
Thanh pham in:760 MD
Ghi chu:PE 70-650 (vp) : 29-04 co vat tu
=> Chay mau sac theo cromeline,khach duyet online ,  noi dung theo file.
- Truc in:  22-4 ve cay so 3

MAY LAM TUI

So luong don hang: : 20.000 tui
Luu y:
- Kiem tra zipper.

YEU CAU GIAO HANG:
=> PHAT HIEN LOI BAO CAP TREN DE PHAN LOAI
Kieu tui: TUI ZIPPER CAT SEAL

Chieu rong: 75 mm
Chieu dai: 103.5 mm

Tam zipper cach dau: 25mm

Duc treo lo tron: 8mm o giua khoang cach mieng tui va tam zipper

Dinh muc phi hao  250 m  K 207 ~
Ghi chu: Chay tui theo file , Duy duyet lai mau truoc khi san xuat hang loat. Su dung zipper pe khong canh.

Nguoi lap:
Nguoi duyet:
```

### 8.10. LSX TUI (template trống)

```
II. CONG VIEC CAN THUC HIEN

MAY IN
MAY GHEP

Mang in: PET12
Kho: 520mm
Mang ghep 1: MPET12
Kho: 520mm

Truc in: D700 x CV400
Ma So Truc: tu dien
So truc: = so mau
Mang ghep 2: LLDPE120
Kho: 520mm

Dinh muc phi hao: 1767m
Thanh pham yeu cau: 10.111m
Ghi chu: tu dien
-
- Mau sac : duyet mau theo tu dien
- Chieu xuat: tu dien
Dinh muc phi hao: L1: 166m, L2: 165m
Thanh pham yeu cau: 9779m
 Ghi chu: tu dien

MAY CHIA
MAY LAM TUI

Kieu tui: zipper 3 bien

Chieu rong:
Chieu dai:

Han bien: mac dinh 10mm(co the sua)
Xep day:

Nhan xe "v":

(Khac nay la cua may tui)
Ghi chu: tu dien

Yeu cau giao hang:

Nguoi lap + nguoi duyet
Han dau:tu dien

Su dung dao cat 2 nhip de cat
Su dung khuon day dang ban nguyet

DMPH: 164m
Ghi chu: tu dien

Ghi chu: chay theo mau da san xuat

Nguoi lap: Ghi san ten
Nguoi duyet: Ghi san ten
```

---

## 9. Phân tích bố cục gốc — giải mã ký tự điều khiển

### 9.1. Nguồn phân tích

2 file `.docx` (`LSX MANG IN.docx`, `LSX TUI.docx`) được giải nén ra XML để khảo sát cấu trúc thật:

| File | Kích thước | Vai trò |
|------|-----------|--------|
| `word/document.xml` | 30KB / 53KB | Nội dung chính — table, paragraph |
| `word/styles.xml` | 6.5KB | Style định nghĩa font, paragraph, table |
| `word/header*.xml` | 3-63KB | Header trang (chứa logo) |
| `word/footer*.xml` | 3-7KB | Footer trang |
| `word/numbering.xml` | 1.7KB | Định nghĩa bullet/numbering (trống) |
| `word/settings.xml` | 2.1KB | Cấu hình document |
| `word/fontTable.xml` | 1.8KB | Bảng font |

### 9.2. BEL (0x07) — cell end marker, không phải bullet

Khi extract text từ `.doc` binary qua Word COM, byte 0x07 xuất hiện khắp nơi. Phân tích từ `.docx` XML xác nhận:

| Môi trường | BEL (0x07) thực chất là | Cơ chế |
|------------|------------------------|--------|
| .doc binary | **Cell end marker** — mỗi ô table kết thúc bằng byte 0x07 | Word binary format dùng 0x07 làm dấu ranh giới ô |
| COM extract | **Prefix đầu dòng** — do Read tool tách dòng ở CR (0x0D), BEL rơi vào đầu dòng tiếp | `text\r\x07text` → Read cắt ở `\r`, dòng mới bắt đầu bằng `\x07` |
| .docx XML | **`<w:tc>` element** — mỗi cell là 1 node XML riêng | Không có BEL, dùng XML structure thuần |

**Xác minh bằng số liệu**: BEL after CR = BEL other = 411 (tổng 10 file). Tức 100% BEL xuất hiện trong cặp `0D 07` (CR+BEL), không BEL nào đứng độc lập. Đây là dấu hiệu của **paragraph terminator có style marker** — trong .doc binary, mỗi paragraph trong cell kết thúc bằng `\r\x07`.

=> Dòng bắt đầu bằng BEL = **dòng nằm trong 1 ô table**. Dòng không có BEL = **paragraph tự do ngoài table** (header, footer, blank line).

### 9.3. VT (0x0B) — soft line break (Shift+Enter)

49 lần xuất hiện VT trong 10 file. Phân tích từ XML xác nhận:

| Pattern | Ví dụ | Trong XML |
|---------|-------|-----------|
| `Field1 \v Field2` | `Định mức phi hao: 540m \v Thành phẩm: 5.500m` | 2 `<w:p>` trong cùng 1 `<w:tc>`, hoặc 1 `<w:br w:type="textWrapping"/>` |
| `Field \v Ghi chú` | `Thành phẩm: 8.700m \v Ghi chú: PA15-K660 có sẵn` | `<w:p>` + `<w:p>` trong cell |
| `Note1 \v Note2` | `PE90-k780: 4/6 \v MPET12: 30/5` | Dòng phụ trong cell |

=> VT dùng để **gộp 2-3 field vào cùng 1 ô table**, tiết kiệm chiều cao dòng.

**Top pattern VT phổ biến nhất:**

| Pattern | Số lần | File |
|---------|--------|------|
| `Định mức phi hao: X \v Thành phẩm: Y` | 6 | TUI 3 BIEN, TUI 4 BIEN, ZIPPER, XEP HONG... |
| `Ghi chú: item1 \v item2` | 6 | ZIPPER DAY DUNG, LSX MANG IN... |
| `Trục in: D:... \v MST: Y...` | 4 | TUI LUNG GIUA, ZIPPER DAY DUNG, LSX MANG IN... |
| `Lưu ý: item1 \v item2` | 3 | TUI 4 BIEN, ZIPPER CAT SEAL, TUI 3 BIEN |
| `Field trống \v Field trống` | 3 | LSX MANG IN (template — gộp label rỗng) |

---

## 10. Bố cục thật — table structure từ XML .docx

### 10.1. LSX là MỘT TABLE DUY NHẤT

Không phải form nhiều section rời rạc. Toàn bộ nội dung LSX nằm trong **1 `<w:tbl>` element**:

| File | Số dòng (`<w:tr>`) | Số ô (`<w:tc>`) | Số cột grid |
|------|---------------------|-------------------|-------------|
| `LSX MANG IN.docx` | 14 rows | 19 cells | **2 cột** |
| `LSX TUI.docx` | 15 rows | 35 cells | **5 cột** |

Không có SDT (Structured Document Tag) — đây không phải Word form với field control, mà là **table thường để in ra điền tay**.

### 10.2. Layout table MÀNG — 2 cột (14 rows)

```
┌──────────────────────────────────────────────────────────┐
│ Row 1  │ MÁY IN                        (colspan=2)       │
├────────┼─────────────────────┬────────────────────────────┤
│ Row 2  │ Màng in:            │ Khổ:                       │
│ Row 3  │ Quy cách trục: MST: │ Số trục: Chiều ra cuộn:   │
│        │ (có VT gộp 3 field) │ (có VT gộp 2 field)       │
│ Row 4  │ Thành phẩm in yêu cầu: │ Định mức phi hao:      │
│        │ Số lượng cấp vật tư:   │ (colspan=2, 3 field VT) │
├────────┼─────────────────────┼────────────────────────────┤
│ Row 5  │ MÁY CHIA                       (colspan=2)       │
├────────┼─────────────────────┼────────────────────────────┤
│ Row 6  │ Khổ màng:           │ Khổ chia:                  │
│ Row 7  │ Chiều dài quấn cuộn:│ Chiều ra cuộn:             │
│        │ (Lưu ý: ...)        │                            │
│ Row 8  │ Định mức phi hao: 0m│ Khách yêu cầu giao:       │
│        │ (colspan=2, 3 field VT trong 1 cell)             │
├────────┼─────────────────────┼────────────────────────────┤
│ Row  9 │ (trống - chừa chỗ ghi chú)                      │
│ Row 10 │ (trống)                                          │
│ Row 11 │ (trống)                                          │
│ Row 12 │ (trống)                                          │
│ Row 13 │ (trống)                                          │
├────────┼─────────────────────┼────────────────────────────┤
│ Row 14 │ Người lập:          │ Người Duyệt:               │
└────────┴─────────────────────┴────────────────────────────┘
```

### 10.3. Layout table TÚI — 5 cột (15 rows)

Đây là layout PHỨC TẠP nhất. Grid 5 cột được merge linh hoạt:

```
┌──────────────────────────────────────────────────────────────────┐
│ Row 1  │ II. CÔNG VIỆC CẦN THỰC HIỆN          (colspan=5)        │
├────────┼─────────────────────┬────────────────────────────────────┤
│ Row 2  │ MÁY IN (colspan=2)  │ MÁY GHÉP (colspan=3)              │
├────────┼──────────┬──────────┼──────────────┬─────────┬──────────┤
│ Row 3  │ Màng in  │ Khổ      │ Màng ghép 1  │ Khổ     │ (blank)  │
│        │ (cột 1)  │ (cột 2)  │ (cột 3-4)    │ (cột 5) │          │
├────────┼──────────┼──────────┼──────────────┼─────────┼──────────┤
│ Row 4  │ Trục in  │ Số trục  │ Màng ghép 2  │ Khổ     │ (blank)  │
│        │ (+ MST)  │          │ (cột 3-4)    │ (cột 5) │          │
├────────┼──────────┴──────────┼──────────────┴─────────┴──────────┤
│ Row 5  │ ĐM phi hao in       │ ĐM phi hao ghép L1/L2            │
│        │ Thành phẩm in       │ Thành phẩm ghép                  │
│        │ (colspan=2, VT)     │ (colspan=3, VT)                  │
├────────┼─────────────────────┼───────────────────────────────────┤
│ Row 6  │ MÁY CHIA (cột 1-2)  │ MÁY LÀM TÚI (cột 3-5)           │
├────────┼─────────────────────┼───────────────────────────────────┤
│ Row 7  │ (trống - cột CHIA)  │ Kiểu túi        (colspan=3)      │
├────────┤                     ├──────────────┬────────────────────┤
│ Row 8  │                     │ Chiều rộng   │ Chiều dài          │
│        │                     │ (cột 3)      │ (cột 4-5)          │
├────────┤                     ├──────────────┼────────────────────┤
│ Row 9  │                     │ Hàn biên     │ Xếp đáy            │
├────────┤                     ├──────────────┼────────────────────┤
│ Row 10 │                     │ Nhấn xé "V"  │ (colspan=3)        │
├────────┼─────────────────────┼──────────────┼────────────────────┤
│ Row 11 │ Ghi chú chung       │ Hàn đầu      │ (blank)            │
│        │ (cột 1-2, VT)       │ (cột 3-5)    │                    │
├────────┼─────────────────────┼──────────────┴────────────────────┤
│ Row 12 │ (trống)             │ Dao cắt 2 nhịp / Khuôn bán nguyệt│
├────────┼─────────────────────┼───────────────────────────────────┤
│ Row 13 │ (trống)             │ DMPH: 164m / Ghi chú              │
├────────┼─────────────────────┼───────────────────────────────────┤
│ Row 14 │ (trống)             │ Ghi chú: chạy theo mẫu đã sx     │
├────────┼─────────────────────┼───────────────────────────────────┤
│ Row 15 │ Người lập (cột 1-2) │ Người duyệt (cột 3-5)            │
└────────┴─────────────────────┴───────────────────────────────────┘
```

**Ghi chú về colspan:**
- Mỗi section header (MÁY IN, MÁY GHÉP, MÁY CHIA, MÁY LÀM TÚI) merge 2-3 cột
- Field IN dùng cột 1-2, field GHÉP dùng cột 3-5
- Cột CHIA bên trái thường bỏ trống khi làm túi (row 7-14)
- Người lập/duyệt dùng colspan=2 và colspan=3

### 10.4. Quy tắc merge cell (colspan)

```
Cột:   [  1  ][  2  ][  3  ][  4  ][  5  ]
───────────────────────────────────────────
H1:    [══════════════ 5 ════════════════]  ← title
H2:    [══════ 2 ══════][═══════ 3 ═══════]  ← IN | GHÉP
Row 3: [  1  ][  2  ][══════ 2 ════][  5  ]  ← màng in + khổ | ghép1 + khổ
Row 4: [  1  ][  2  ][══════ 2 ════][  5  ]  ← trục in + số trục | ghép2 + khổ
Row 5: [══════════ 2 ══════════][═══════ 3 ═══════]  ← phi hao IN | phi hao GHÉP
H3:    [══════ 2 ══════][═══════ 3 ═══════]  ← CHIA | LÀM TÚI
Row 7: [  1  ][  2  ][═══════════ 3 ═══════════]  ← Kiểu túi
Row 8: [  1  ][  2  ][  3  ][══════ 2 ════]  ← Chiều rộng | Chiều dài
Row 9: [  1  ][  2  ][  3  ][══════ 2 ════]  ← Hàn biên | Xếp đáy
Row 15:[══════ 2 ══════][═══════ 3 ═══════]  ← Người lập | Người duyệt
```

### 10.5. So sánh 2 họ template

| Đặc điểm | MÀNG (2 cột) | TÚI (5 cột) |
|----------|-------------|-------------|
| Số cột grid | 2 | 5 |
| Số dòng table | 14 | 15 |
| Title row | **Không có** | `II. CÔNG VIỆC CẦN THỰC HIỆN` (row 1, colspan=5) |
| IN + GHÉP | IN chiếm 2 cột, không có GHÉP | IN (cột 1-2) + GHÉP (cột 3-5) |
| CHIA + LÀM TÚI | CHIA chiếm 2 cột, không có LÀM TÚI | CHIA (cột 1-2) + LÀM TÚI (cột 3-5) |
| Dòng trống | 5 dòng (row 9-13) | Không (các row đều có nội dung) |
| Footer | Row 14 | Row 15 |

### 10.6. Mapping row number giữa các biến thể TÚI

Vì các LSX túi thật chỉ khác nhau ở **thông số túi đặc thù** (row 7-14), số dòng có thể thay đổi:

| Biến thể | Số row túi | Nội dung thêm |
|----------|-----------|---------------|
| TUI 3 BIEN | 4 row (7-11) | Dán biên, Hàn đầu, Đục lỗ |
| TUI 4 BIEN | 6 row (7-13) | Hàn biên, Hàn đầu, Xếp hông, Lỗ quai, Lỗ thông hơi |
| TUI LUNG GIUA | 4 row (7-11) | Hàn đầu, Dán lưng, Lỗ thông hơi |
| XEP HONG LUNG LECH | 5 row (7-12) | Xếp hông, Dán lưng lệch, Dán đáy |
| ZIPPER CAT SEAL | 3 row (7-10) | Tâm zipper, Lỗ treo |
| ZIPPER DAY DUNG | 4 row (7-11) | Tâm zipper, Nhấn xé V, Dán biên, Xếp đáy |
| CAT SEAL CO NAP | 5 row (7-12) | Nắp, Sóng siêu âm, Quai xách, Dán keo |

---

## 11. Header / Footer — logo và page setup

### 11.1. Logo LTS trong header

Cả 2 file `.docx` có 3 ảnh trong header:

| Ảnh | Kích thước (EMU) | Kích thước (~inch) | Mô tả |
|-----|-----------------|-------------------|-------|
| `image1.png` (33,662 bytes) | 1,250,315 × 999,490 | ~1.3 × 1.0 inch | **Logo Lai Trường Sơn** — giống `logo_lts.png` (33,662 bytes) |
| `image2.png` (70 bytes) | 1,079,500 × 335,280 | ~1.1 × 0.3 inch | Ảnh phụ nhỏ (có thể là đường kẻ hoặc logo phụ) |
| `image3` (giống image2) | 1,079,500 × 335,280 | ~1.1 × 0.3 inch | Ảnh phụ thứ 3 |

Vị trí: header có 2 table 5-dòng để định vị logo (top-left).

### 11.2. Page setup

| Thuộc tính | Giá trị | Ghi chú |
|-----------|--------|---------|
| Font mặc định | 24 half-points = 12pt | `w:sz w:val="24"` |
| Justification | `both` (căn đều 2 bên) | `w:jc w:val="both"` |
| Table cell margin | 100 dxa (~1.8mm) | `w:tblCellMar` |
| Ngôn ngữ | `en` | `w:lang w:val="en"` |

### 11.3. Không có form controls

Cả 2 file có **0 SDT** (Structured Document Tag). Đây là table thường để:
1. In ra giấy → điền tay
2. Hoặc gõ trực tiếp vào ô table trong Word

---

## 12. Kiến trúc file XML

### 12.1. Cây thư mục XML đã giải nén

```
.claude/references/xml/
├── mang_document.xml          ← LSX MANG IN document.xml (30KB)
├── tui_document.xml           ← LSX TUI document.xml (53KB)
├── mang-in/                   ← Toàn bộ XML từ LSX MANG IN.docx
│   ├── [Content_Types].xml
│   ├── custom.xml
│   ├── document.xml           ← Nội dung chính — 14-row table
│   ├── document.xml.rels      ← Relationships (ảnh, theme)
│   ├── fontTable.xml
│   ├── footer1.xml            ← Footer trang 1
│   ├── footer2.xml            ← Footer trang 2
│   ├── footer3.xml            ← Footer trang 3
│   ├── header1.xml            ← Header trang 1
│   ├── header2.xml            ← Header trang 2
│   ├── header3.xml            ← Header trang 3 (chứa logo, 60KB)
│   ├── header3.xml.rels
│   ├── numbering.xml          ← Bullet/numbering (trống)
│   ├── settings.xml
│   ├── styles.xml             ← Style định nghĩa
│   └── theme1.xml
└── tui/                       ← Toàn bộ XML từ LSX TUI.docx
    ├── [Content_Types].xml
    ├── item1.xml              ← Custom XML (metadata)
    ├── item1.xml.rels
    ├── itemProps1.xml
    ├── document.xml           ← Nội dung chính — 15-row table
    ├── document.xml.rels
    ├── fontTable.xml
    ├── footer1.xml
    ├── header1.xml            ← Header (chứa logo, 63KB)
    ├── header1.xml.rels
    ├── numbering.xml          ← Bullet/numbering (trống)
    ├── settings.xml
    ├── styles.xml
    └── theme1.xml
```

### 12.2. Cấu trúc `document.xml` — schema rút gọn

```xml
<w:document>
  <w:body>
    <w:p/>                          <!-- blank line before table -->
    <w:tbl>                         <!-- THE TABLE -->
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>  <!-- width: 100% -->
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="..."/>      <!-- 2 cột (màng) hoặc 5 cột (túi) -->
      </w:tblGrid>
      <w:tr>                        <!-- Row 1 -->
        <w:tc>
          <w:tcPr>
            <w:gridSpan w:val="5"/> <!-- merge 5 cột -->
          </w:tcPr>
          <w:p>
            <w:r><w:t>II. CÔNG VIỆC CẦN THỰC HIỆN</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>                        <!-- Row 2 -->
        <w:tc>
          <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
          <w:p><w:r><w:t>MÁY IN</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="3"/></w:tcPr>
          <w:p><w:r><w:t>MÁY GHÉP</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      ... (13 rows tiếp theo)
    </w:tbl>
    <w:p/>                          <!-- blank line after table -->
    <w:sectPr>...</w:sectPr>        <!-- page setup -->
  </w:body>
</w:document>
```

**Các element quan trọng:**

| Element | Ý nghĩa |
|---------|---------|
| `<w:tbl>` | Table container |
| `<w:tr>` | Table row |
| `<w:tc>` | Table cell |
| `<w:tcPr><w:gridSpan w:val="N"/>` | Merge N cột (colspan) |
| `<w:p>` | Paragraph trong cell |
| `<w:r><w:t>` | Run text (đoạn text có chung format) |
| `<w:br w:type="textWrapping"/>` | Soft line break (Shift+Enter) ≈ VT trong .doc |
| `<w:sectPr>` | Section properties (page size, margins) |

### 12.3. Các XML reference file

Ngoài 2 file `.docx`, toàn bộ text extract từ 10 file `.doc` nằm ở:

```
.claude/references/txt/
├── LS- TÚI CẮT SEAL MỞ MIỆNG CÓ NẮP BĂNG KEO.txt
├── LSX - ZIPPER ĐÁY ĐỨNG.txt
├── LSX -XẾP HÔNG LƯNG LỆCH.txt
├── LSX IN MÀNG BOPP.txt
├── LSX MÀNG IN.txt
├── LSX TÚI 3 BIÊN.txt
├── LSX TÚI 4 BIÊN.txt
├── LSX TÚI LƯNG GIỮA.txt
├── LSX TÚI ZIPPER CẮT SEAL.txt
└── LSX TÚI.txt
```

---

## 13. Thiết kế: Khớp form LSX đúng 8 kiểu túi thật (không đổi bagType tính giá)

**Quyết định phạm vi** (đã chốt với user): CHỈ sửa trong phần Lệnh Sản Xuất
(`ModalDonLSX.tsx` + `lsxExport.ts` + `LSXManualFields`). KHÔNG đổi enum
`bagType` dùng khi báo giá/tính giá (`CalculateInput.bagType` trong
`TheNhapLieu.tsx` → `engine.ts` → `@lts/bang-tinh-gia`). `bagType` tính giá
vẫn giữ 6 giá trị hiện tại: `3bien` | `4bien` | `xephong_lech` |
`xephong_giua` | `dayDung` | `cutSeal`.

Lý do: đổi `bagType` sẽ lan ra engine tính giá, test snapshot, và mọi nơi
dùng `bagType` để tính accessory (zipper/tape/handle) — rủi ro cao, không
cần thiết cho mục tiêu "làm LSX khớp mẫu thật".

### 13.1. Hàm phân loại LSX — không sửa bagType, chỉ suy luận nhãn hiển thị

Tạo file mới `apps/web/src/lib/lsx-bag-classification.ts`, export
`classifyLsxBagType(bagType: string, hasZipper: boolean)`. Cả
`ModalDonLSX.tsx` (form nhập) và `lsxExport.ts` (xuất DOCX/PDF) import dùng
chung 1 nguồn, đảm bảo form và file xuất luôn khớp field với nhau.

Bảng mapping `(bagType, hasZipper)` → 1 trong 8 kiểu túi LSX thật:

| `bagType` (giữ nguyên, tính giá) | `hasZipper` | Kiểu túi LSX (nhãn hiển thị) | LSX tham chiếu |
|---|---|---|---|
| `3bien` | `false` | Túi 3 biên | #4 |
| `3bien` | `true` | Túi zipper 3 biên | #3 (template) |
| `4bien` | `false` | Túi 4 biên | #5 |
| `xephong_giua` | * | Túi dán lưng giữa | #6 |
| `xephong_lech` | * | Túi xếp hông dán lưng lệch | #7 |
| `dayDung` | `true` | Túi zipper đáy đứng | #9 |
| `cutSeal` | `true` | Túi zipper cắt seal | #8 |
| `cutSeal` | `false` | Túi cắt seal có nắp băng keo | #10 |
| Mọi kết hợp khác (VD `4bien`+zipper, `dayDung` không zipper) | | Fallback: dùng nhãn gốc từ `bagType`, không giới hạn field hiện/ẩn | — |

**Lưu ý về 2 trường hợp trước đây bị lẫn** (đã phát hiện khi audit code hiện tại):
- `xephong_giua` hiện đang dùng chung field với "xếp hông" trong `ManHinhQuanLy.tsx`
  (`tenLoaiTui['xephong_giua'] = 'Xếp hông dán lưng giữa'`), nhưng LSX thật (#6, TÚI
  LUNG GIUA) là **túi dán lưng giữa KHÔNG xếp hông**. Việc phân loại LSX ở đây chỉ ảnh
  hưởng field hiện/ẩn trong form LSX — nhãn hiển thị lúc báo giá (`ManHinhQuanLy.tsx`)
  giữ nguyên, không sửa.
- `cutSeal` + `hasZipper=true` trước đây tự suy ra nhãn "Cute seal nắp băng keo" trong
  `ManHinhQuanLy.tsx`, nhưng bản chất 2 kiểu này khác nhau: LSX #8 (zipper cắt seal) CÓ
  zipper KHÔNG nắp; LSX #10 (cắt seal có nắp băng keo) KHÔNG zipper CÓ nắp gập + dán keo.
  Bảng trên tách rõ theo `hasZipper` để chọn đúng field.

### 13.2. Field mới cần thêm vào `LSXManualFields` (apps/web/src/lib/types.ts)

Field đã có sẵn, tái dùng không cần thêm: `hanBien`, `hanDau`, `xepHong`,
`foldBottom` (xếp đáy), `sealEdge` (dán biên), `tearNotch` (nhấn xé "V"),
`holePunchInfo`, `ventHoleInfo`, `useDualCutter`, `useSemicircularMold`.

Field còn thiếu, cần thêm mới:

| Field mới | Kiểu | Đơn vị | Dùng cho kiểu túi | LSX tham chiếu |
|---|---|---|---|---|
| `tamZipperCachMieng` | `number` | mm | Túi zipper cắt seal, Túi zipper đáy đứng | #8, #9 |
| `loTreoInfo` | `string` | text | Túi zipper cắt seal (VD: "Ø8mm ở giữa khoảng cách miệng túi và tâm zipper") | #8 |
| `danLung` | `number` | mm | Túi dán lưng giữa | #6 |
| `danLungLech` | `number` | mm | Túi xếp hông dán lưng lệch | #7 |
| `danDay` | `number` | mm | Túi xếp hông dán lưng lệch | #7 |
| `nap` | `number` | mm | Túi cắt seal có nắp băng keo | #10 |
| `songSieuAm` | `number` | mm | Túi cắt seal có nắp băng keo | #10 |
| `docQuaiXach` | `boolean` | — | Túi cắt seal có nắp băng keo | #10 |
| `danKeoNap` | `boolean` | — | Túi cắt seal có nắp băng keo | #10 |

### 13.3. Field group hiện/ẩn theo kiểu túi trong `ModalDonLSX.tsx`

`classifyLsxBagType` trả về `fieldGroups` — danh sách field cần hiện cho
đúng kiểu túi, để `ModalDonLSX.tsx` hiện/ẩn field tương ứng (thay vì chỉ
tách 2 nhánh `isMang`/`isTui` như hiện tại):

| Kiểu túi LSX | Field hiện thêm (ngoài field chung: kích thước, hàn biên, hàn đầu, phi hao) |
|---|---|
| Túi 3 biên | `holePunchInfo` (đục lỗ quai xách) |
| Túi zipper 3 biên | `useDualCutter`, `useSemicircularMold` |
| Túi 4 biên | `xepHong`, `holePunchInfo`, `ventHoleInfo` |
| Túi dán lưng giữa | `danLung`, `ventHoleInfo` |
| Túi xếp hông dán lưng lệch | `xepHong`, `danLungLech`, `danDay` |
| Túi zipper đáy đứng | `tamZipperCachMieng`, `tearNotch`, `sealEdge`, `foldBottom` |
| Túi zipper cắt seal | `tamZipperCachMieng`, `loTreoInfo` |
| Túi cắt seal có nắp băng keo | `nap`, `songSieuAm`, `docQuaiXach`, `danKeoNap` |

### 13.4. Tác động package

| File | Thay đổi |
|---|---|
| `apps/web/src/lib/lsx-bag-classification.ts` | **Mới** — hàm `classifyLsxBagType()` |
| `apps/web/src/lib/types.ts` | Thêm 9 field mới vào `LSXManualFields` (mục 13.2) |
| `apps/web/src/components/ModalDonLSX.tsx` | Dùng `classifyLsxBagType` để hiện/ẩn field theo kiểu túi (mục 13.3) |
| `apps/web/src/lib/lsxExport.ts` | Dùng `classifyLsxBagType` để xuất đúng field theo kiểu túi trong DOCX/PDF |
| `apps/web/src/lib/engine.ts`, `TheNhapLieu.tsx`, pricing engine | **Không đổi** — `bagType` tính giá giữ nguyên 6 giá trị |

### 13.5. Thiết kế nhập liệu trong modal LSX

Form nhập liệu LSX được tổ chức theo 4 công đoạn sản xuất để khớp LSX thật:

```text
I. THÔNG TIN SẢN PHẨM
II.1 MÁY IN
II.2 MÁY GHÉP (chỉ túi / màng ghép nếu sau này cần)
II.3 MÁY CHIA (màng, và riêng túi zipper cắt seal)
II.4 MÁY LÀM TÚI (chỉ túi, field động theo kiểu túi)
```

Quy tắc chọn kiểu túi trong modal:
- Khi mở modal, hệ thống tự suy kiểu túi LSX bằng `classifyLsxBagType(input.bagType, input.hasZipper)`.
- Admin có dropdown **Kiểu túi (LSX)** gồm đủ 8 kiểu thật để sửa tay nếu tự suy chưa đúng.
- Trường sửa tay lưu vào `manual.lsxBagTypeOverride`.
- Khi admin đổi kiểu túi, KHÔNG xóa dữ liệu đã nhập trước đó; UI chỉ đổi field nào được hiện/ẩn theo kiểu mới.

Field mặc định được prefill theo LSX thật để giảm thao tác nhập liệu, nhưng admin vẫn sửa được:

| Kiểu túi LSX | Defaults prefill |
|---|---|
| Túi 3 biên | `hanDau: 30`, `sealEdge: "7mm"`, `holePunchInfo: "Lỗ tròn Ø8mm cách đầu túi 10mm"` |
| Túi zipper 3 biên | `hanBien: 10`, `useDualCutter: true`, `useSemicircularMold: true` |
| Túi 4 biên | `hanBien: 10`, `hanDau: 50`, `xepHong: 60`, `holePunchInfo: "3 lỗ tròn quai xách (theo Market)"`, `ventHoleInfo: "6 lỗ/mặt Ø1mm"` |
| Túi dán lưng giữa | `hanDau: 13`, `danLung: 13`, `ventHoleInfo: "2 lỗ trên/dưới"` |
| Túi xếp hông dán lưng lệch | `xepHong: 73`, `danLungLech: 10`, `danDay: 10` |
| Túi zipper đáy đứng | `tamZipperCachMieng: 30`, `tearNotch: "2 bên cách miệng 15mm"`, `sealEdge: "10mm"`, `foldBottom: "100mm"` |
| Túi zipper cắt seal | `tamZipperCachMieng: 25`, `loTreoInfo: "Ø8mm ở giữa khoảng cách miệng túi và tâm zipper"` |
| Túi cắt seal có nắp băng keo | `nap: 35`, `songSieuAm: 32`, `docQuaiXach: true`, `danKeoNap: true` |

### 13.6. Quy tắc lưu snapshot và export

`ProductionOrder.snapshot` cần thêm `hasZipper: boolean`, lấy từ `CalculateInput.hasZipper` tại thời điểm tạo LSX. Lý do: export DOCX/PDF có thể diễn ra sau này, khi báo giá gốc đã thay đổi hoặc không còn đủ context; snapshot phải tự chứa đủ dữ liệu để xác định đúng kiểu túi LSX.

Khi xuất DOCX/PDF:
- Nếu `manual.lsxBagTypeOverride` có giá trị, dùng trực tiếp kiểu túi đó.
- Nếu không có override, dùng `classifyLsxBagType(snapshot.bagType, snapshot.hasZipper)`.
- `ModalDonLSX.tsx` và `lsxExport.ts` bắt buộc dùng chung `apps/web/src/lib/lsx-bag-classification.ts` để tránh form nhập và file xuất lệch nhau.

Quy tắc Máy Chia:
- Hiện `MÁY CHIA` cho `productType='mang'` như hiện tại.
- Hiện thêm `MÁY CHIA` cho kiểu túi LSX `tui-zipper-cat-seal`, vì LSX #8 có khâu chia BTP trước khi làm túi (`PE70 x 650 x 760m` → `PE70 x 207 x 1.140m`).
- Các kiểu túi khác không bắt buộc hiện Máy Chia; nếu có yêu cầu đặc biệt, admin ghi vào ghi chú.
