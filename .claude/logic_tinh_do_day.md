# Logic Tính Toán Độ Dày Màng Bao Bì (Toàn Tập 4 Trường Hợp)

Tài liệu này ghi chú lại quy trình thuật toán tính toán độ dày cấu trúc ghép cho phần mềm bao bì, được diễn giải từ bản nháp viết tay, đối chiếu trực tiếp với database hệ thống (`vat-lieu.json`), và đối chiếu với tiêu chuẩn sản xuất thực tế.

---

## 1. Phân Loại Nguyên Vật Liệu (Đầu vào)

Dựa trên cấu trúc dữ liệu, các màng nguyên vật liệu (NVL) được chia làm 3 nhóm chính:

### Nhóm 1: Vật liệu có độ dày cố định (Fixed Thickness)
- **Đặc điểm:** Chỉ có 1 mức độ dày duy nhất, không thay đổi được.
- **Dữ liệu thực tế:** Không có `group`, `doiDuocMic` = false (hoặc không khai báo).
- **Bao gồm:** `PET` (12 mic), `PA` (15 mic), `MPET` (12 mic).

### Nhóm 2: Vật liệu thay đổi được (Variable Thickness)
- **Đặc điểm:** Tồn tại nhiều tùy chọn độ dày khác nhau. Khi cần, hệ thống sẽ "nhảy bậc" sang các tùy chọn khác trong cùng họ vật liệu.
- **Dữ liệu thực tế:** Gom chung theo trường `group`.
- **Bao gồm:** 
  - `BOPP`: 18, 20, 30, 40 mic
  - `Matt OPP`: 18, 20 mic
  - `CPP`: 20, 25, 30, 40, 50 mic
  - `MCPP`: 25, 50 mic

### Nhóm 3: Vật liệu tùy chỉnh tự do (Adjustable / PE)
- **Đặc điểm:** Màng PE, độ dày bắt buộc phải là bội số của 5 và từ 30 trở lên.
- **Dữ liệu thực tế:** Có cờ `doiDuocMic: true` (hoặc `adjustableMic: true`).
- **Bao gồm:** `LLDPE` (Đang chuẩn data). *(Cần bổ sung cờ này cho LLDPE sữa và thêm LLDPE gạo vào data).*

> **Dung sai (Điều kiện Lõi):** 
> - Tổng độ dày đầu ra bán cho khách: cho phép sai số **± 5 mic**.
> - Độ dày màng LLDPE đầu vào: dao động **± 3 mic**.
> - **Hệ quả Toán học:** Tổng độ dày danh định (T_nom) tính toán ra phải luôn nằm trong khoảng hẹp là `[Yêu_cầu - 2, Yêu_cầu + 2]`.

---

## 2. Giải Thuật Xử Lý 4 Trường Hợp (Tứ Trụ Logic)

### Trường Hợp 1: Có PE (Nhóm 3) + Có màng nhảy bậc (Nhóm 2)
*   **Logic:** PE đóng vai trò là biến số "cân" độ dày (Số A).
*   **Các bước:**
    1. Tính hằng số: Độ dày Nhóm 1 + Độ dày Nhóm 2 (mức mỏng nhất) + Keo (tự động cộng 3 mic/lớp).
    2. Lấy Mục tiêu trừ đi hằng số -> Ra "Số A" (Độ dày PE lý thuyết).
    3. Sinh ra 3 kịch bản cho PE (vì PE phải là bội số của 5):
       - Làm tròn lên.
       - Làm tròn xuống.
       - Làm tròn xuống PE + Tăng nhảy bậc độ dày của màng Nhóm 2.
    4. Bộ lọc dung sai: Loại các kịch bản có tổng độ dày lọt ra ngoài vùng an toàn.
    5. **Cú chốt (Tối ưu hóa cục bộ):** Đem các kịch bản hợp lệ đi tính tiền (chỉ tính chi phí VNĐ/m² của các lớp bị biến động độ dày để tiết kiệm phép tính). Kịch bản nào rẻ hơn thì chốt ("Rẻ hơn lấy").
    *(Lưu ý quan trọng: Tiền tính nhảy bậc phải bốc đúng đơn giá kg thực tế của mã vật tư đó. VD: MattOPP18 và MattOPP20 có giá kg hoàn toàn khác nhau).*

### Trường Hợp 2: Toàn màng cố định (Nhóm 1) + Có PE (Nhóm 3)
*   **Logic:** Không có màng Nhóm 2 nên hệ thống không thể kích hoạt bù trừ nhảy bậc.
*   **Kết quả toán học:** Do T_nom bị kẹp trong biên độ rất hẹp có 5 đơn vị `[Mục tiêu - 2, Mục tiêu + 2]`, mà PE bắt buộc là bội số của 5, nên phương trình luôn chỉ có **1 nghiệm đúng duy nhất**. 
*   **Hành động:** Hệ thống chạy thẳng 1 lèo ra kết quả. Nếu đạt dung sai thì chốt, không thì loại bỏ.

### Trường Hợp 3: Không có PE + Chỉ có màng nhảy bậc (Nhóm 2)
*   **Logic:** Sinh ma trận tổ hợp (Brute-force Combinatorics).
*   **Các bước:**
    1. Lai tạo chéo tất cả các tùy chọn độ dày của các màng Nhóm 2 với nhau. VD: 2 loại MattOPP x 5 loại CPP = 10 tổ hợp cấu trúc.
    2. Tính tổng độ dày (+ Keo) cho tất cả 10 tổ hợp.
    3. Đưa danh sách qua bộ lọc dung sai khắt khe.
    4. Đưa các tổ hợp lọt lưới qua bộ tính giá m². Chốt theo quy tắc **"Rẻ hơn lấy"**.

### Trường Hợp 4: Yêu cầu độ dày phi thực tế
*   **Logic:** Chốt chặn an toàn (Fallback/Error Handling).
*   **Sự cố:** Cấu trúc không có PE, khách yêu cầu độ dày quá khủng (VD: 170 mic), trong khi lấy cấu hình màng dày nhất (Max ping) ráp lại cũng không với tới (chỉ được 93 mic).
*   **Xử lý:** Bộ lọc dung sai trả về danh sách Rỗng. Hệ thống chặn thao tác lưu và văng cảnh báo UI: *"Cảnh báo: Vật liệu không có độ dày phù hợp!"*.

---

## 3. Các Vấn Đề Thực Tế Cần Lưu Ý (Market Research)

Dưới góc độ sản xuất màng phức hợp thực tế trên thị trường, hệ thống cần lưu ý các "điểm mù" (Blind spots) sau để bộ phận Phần mềm (Sale) và Xưởng (Kỹ thuật) không bị chênh phô:

1. **Cộng dồn dung sai (Tolerance Stacking):**
   - Hiện thuật toán đang mặc định màng cố định (PET) và Keo là chính xác tuyệt đối.
   - Thực tế: Màng định hướng sai số ±3-5%, màng đúc sai số ±5-10%, Keo sai số tráng phủ ±0.5-1 mic.
   - **Giải pháp:** Nếu khách hàng khắt khe, đội Kỹ thuật nên "ém" (thu hẹp) biên độ dung sai của khách trên phần mềm lại một chút so với lý thuyết để chừa "đất diễn" cho sai số tự nhiên của Keo và màng cố định.

2. **Khả năng cung ứng PE (Supply Chain Constraints):**
   - Thuật toán tự tin sinh ra PE là bội số của 5 (VD: 115 mic). 
   - Nếu công ty tự thổi màng thì đáp ứng được. Nhưng nếu đi nhập ngoài, NCC thường chỉ bán các mốc độ dày chẵn hoặc thông dụng (100, 120, 150...).
   - **Giải pháp:** Nếu nhập ngoài, cân nhắc bổ sung tính năng chuyển từ "Tự sinh PE" sang "Chọn PE từ danh sách Kho có sẵn".

3. **Hiện tượng cong vênh màng (Curling Effect):**
   - Khi phần mềm tự động nhảy bậc bù trừ để ép giá, tỷ lệ độ dày `Lớp Ngoài / Lớp Trong` bị thay đổi. Sức căng bề mặt và độ co ngót nhiệt lệch nhau dễ gây ra lỗi cong vênh bao bì.
   - **Giải pháp:** Về sau có thể bổ sung cảnh báo mềm (Warning) trên UI nếu hệ số tỷ lệ độ dày các màng bị lệch quá mức định mức an toàn mà Kỹ thuật viên quy định.

---

## 4. Phương Pháp Triển Khai Trong Code (Implementation Strategy)

Để xử lý gọn gàng cả 4 trường hợp mà không tạo ra mớ code `if/else` chằng chịt, giải pháp tốt nhất là áp dụng Pattern **"Sinh tổ hợp & Lọc" (Generate & Filter Pattern)**. Bằng cách thiết kế một Pipeline chạy từ đầu đến cuối, hệ thống sẽ tự động cover mọi kịch bản.

### Pipeline 4 Bước Triển Khai:

**Bước 1: Generator (Bộ sinh cấu hình khả thi)**
*   Thay vì chia nhánh logic, ta luôn tạo ra một mảng các độ dày khả thi cho từng lớp màng:
    *   **Màng Nhóm 1 (Cố định):** Chỉ có 1 phần tử (VD: `[12]`).
    *   **Màng Nhóm 2 (Thay đổi):** Fetch từ database tất cả tùy chọn (VD: `[20, 25, 30, 40, 50]`).
    *   **Màng Nhóm 3 (PE):** Tính nhẩm độ dày cần thiết, sau đó sinh mảng 3 tùy chọn: `[Cận_Dưới, Cận_Dưới + 5, Cận_Trên]`. Nếu màng không phải PE, bước này bỏ qua.
*   Sử dụng hàm tích Đề-các (Cartesian Product) để nhân chéo các mảng độ dày, tạo ra `Danh sách các cấu trúc lý thuyết` (VD: TH3 sinh ra 10 cấu trúc, TH2 sinh ra 1 cấu trúc, TH1 sinh ra 3 cấu trúc).

**Bước 2: Tolerance Filter (Bộ lọc dung sai)**
*   Duyệt (map) qua toàn bộ cấu trúc vừa sinh, tính `Tổng độ dày danh định = Tổng các lớp + Keo(3 mic * số_lớp_ghép)`.
*   Giữ lại những cấu trúc thỏa mãn điều kiện toán học: `(Yêu_cầu_khách - 2) <= T_nom <= (Yêu_cầu_khách + 2)`.

**Bước 3: Error Handler (Bộ xử lý ngoại lệ - Tương ứng TH4)**
*   Kiểm tra nếu danh sách sau khi qua bộ lọc có độ dài `length === 0`:
*   Ngừng thuật toán, bắn lỗi lên Frontend: `throw new Error("Cảnh báo: Vật liệu không có độ dày phù hợp!")`.

**Bước 4: Cost Optimizer (Bộ tối ưu hóa chi phí)**
*   Tính tổng giá m² (hoặc chỉ tính phần giá chênh lệch) cho tất cả các cấu trúc lọt qua vòng dung sai.
*   Sử dụng `.sort((a, b) => a.cost - b.cost)` để sắp xếp theo giá tăng dần.
*   Lấy ra phần tử đầu tiên `[0]` (Rẻ hơn lấy). Đây chính là Kết quả Tối ưu cuối cùng để trả về cho người dùng.

> **Lợi ích của Pattern này:** Bạn có thể đổi vật liệu tùy ý, có PE hay không có PE, phần mềm vẫn chạy mượt mà theo đúng 1 quy trình duy nhất mà không bao giờ bị sót case.
