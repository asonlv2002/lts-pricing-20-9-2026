# Logic Tính Toán Độ Dày Màng Bao Bì (Cập nhật Hoán Đổi Bước 2 & 3)

Tài liệu này ghi chú lại quy trình thuật toán tính toán độ dày cấu trúc ghép cho phần mềm bao bì, được diễn giải từ bản nháp viết tay và đối chiếu trực tiếp với database hệ thống (`vat-lieu.json`).

---

## 1. Phân Loại Nguyên Vật Liệu (Đầu vào)

Dựa trên cấu trúc dữ liệu, các màng nguyên vật liệu (NVL) được chia làm 3 nhóm chính:

### Nhóm 1: Vật liệu có độ dày cố định (Fixed Thickness)
- **Đặc điểm:** Chỉ có 1 mức độ dày duy nhất, không thay đổi được.
- **Dữ liệu thực tế:** Không có `group`, `doiDuocMic` = false (hoặc không khai báo).
- **Bao gồm:** `PET` (12 mic), `PA` (15 mic), `MPET` (12 mic).

### Nhóm 2: Vật liệu thay đổi được (Variable Thickness)
- **Đặc điểm:** Tồn tại nhiều tùy chọn độ dày khác nhau. Khi cần tăng/giảm độ dày, hệ thống sẽ "nhảy bậc" sang các tùy chọn khác trong cùng họ vật liệu.
- **Dữ liệu thực tế:** Gom chung theo trường `group`.
- **Bao gồm:** 
  - `BOPP`: 18, 20, 30, 40 mic
  - `Matt OPP`: 18, 20 mic
  - `CPP`: 20, 25, 30, 40, 50 mic
  - `MCPP`: 25, 50 mic

### Nhóm 3: Vật liệu tùy chỉnh tự do / Nhập tay (Adjustable)
- **Đặc điểm:** Màng PE, độ dày bắt buộc phải là bội số của 5 và từ 30 trở lên. Độ dày có thể do người dùng nhập hoặc do thuật toán làm tròn tính ra.
- **Dữ liệu thực tế:** Có cờ `doiDuocMic: true` (hoặc `adjustableMic: true`).
- **Bao gồm:** 
  - `LLDPE` (Đã chuẩn hóa trong data).
  - `LLDPE sữa` (⚠️ Cần thêm cờ tùy chỉnh vào data).
  - `LLDPE gạo` (⚠️ Cần thêm mới hoàn toàn vào data).

> **Dung sai (Điều kiện):** 
> - Tổng độ dày đầu ra bán cho khách: cho phép sai số **± 5 mic**.
> - Độ dày màng LLDPE đầu vào mua từ nhà cung cấp: dao động **± 3 mic**.

---

## 2. Quy Trình Tính Tổng Mới (Đã đổi Bước 2 và Bước 3)

Trình tự tính toán độ dày cấu trúc ghép được thực hiện qua 4 bước:

*   **Bước 1:** Đưa các NVL thuộc **Nhóm 1 (Độ dày cố định)** vào tổng.
*   **Bước 2:** Cộng phần hằng số của **Keo ghép**. 
    *   *Công thức:* Cứ 1 lần ghép (1 lớp keo) sẽ tự động cộng **+3 mic**.
*   **Bước 3:** Đưa các NVL thuộc **Nhóm 2 (Độ dày thay đổi)** vào tổng.
    *   Tạm thời áp mức độ dày nhỏ nhất của vật liệu đó để tính thử (VD: mốc xuất phát, nhỏ 1 mic).
    *   **🔑 Quy tắc ưu tiên:** Nếu cấu trúc có từ 2 vật liệu Nhóm 2 trở lên, khi cần bù đắp độ dày, luôn ưu tiên nhảy bậc (tăng độ dày) cho vật liệu nào có **giá VNĐ/m² rẻ hơn** nhằm tối ưu chi phí nguyên vật liệu.
*   **Bước 4:** Áp màng PE (Nhóm 3) vào cấu trúc.
    *   Tính tổng độ dày tạm thời = **(Bước 1 + Bước 2 + Bước 3)**.
    *   Tổng này được gọi là **SỐ A**.

---

## 3. Xử Lý "Số A" Để Ra Kết Quả Cuối Cùng

Màng PE bắt buộc phải là bội số của 5 (từ 30 trở lên). Do đó, dựa vào **Số A**, hệ thống quyết định độ dày màng PE theo 1 trong 3 kịch bản:

1.  **Trường hợp 1 (Làm tròn lên):** Chọn màng PE là bội số của 5 ở **cận trên** của Số A.
2.  **Trường hợp 2 (Làm tròn xuống):** Chọn màng PE là bội số của 5 ở **cận dưới** của Số A.
3.  **Trường hợp 3 (Làm tròn xuống & Bù trừ Nhóm 2):** 
    - Chọn màng PE là bội số của 5 ở **cận dưới**.
    - Tuy nhiên, độ dày tổng thể bị thiếu hụt, nên phần thiếu này sẽ được **cộng dồn** (nhảy bậc độ dày) cho NVL thuộc Nhóm 2. Theo quy tắc ở Bước 3, hệ thống sẽ chọn loại vật liệu rẻ nhất để nhảy bậc độ dày bù vào phần thiếu này.

---

## 4. Các Việc Cần Xử Lý (TODO) Trong Code
Để hệ thống vận hành trơn tru theo logic này, cần hoàn thiện:
1. **Dữ liệu (`vat-lieu.json`):**
   - Đặt `adjustableMic: true` cho `LLDPE sữa`.
   - Thêm bản ghi mới cho `LLDPE gạo` và cũng bật cờ `adjustableMic: true`.
2. **Thuật toán (Engine / Tinh Gia):**
   - Refactor hàm tính giá để chạy chính xác tuần tự: Vật liệu cố định -> Keo (3 mic) -> Chọn vật liệu nhảy bậc -> PE (làm tròn bội số 5).
