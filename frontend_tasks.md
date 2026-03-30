# Phân Tích Các Nhiệm Vụ Frontend (Giao Diện Web)

Dựa trên cấu trúc yêu cầu hệ thống, dưới đây là danh sách chi tiết các công việc thuộc về phần **Dựng giao diện (Frontend)**:

## 1. Hạng mục Tính giá sản phẩm (Core Calculator)
*Đây là module có UI/UX tương tác phức tạp nhất, đóng vai trò trái tim của hệ thống.*
- **UI Form Nhập Liệu (Input):** Thiết kế giao diện nhập liệu dạng thẻ (card) hoặc wizard cho Quy cách sản phẩm, cấu trúc màng 5 lớp, phụ kiện (zipper, quai)... Hỗ trợ cảnh báo trục in realtime.
- **UI Bảng Kết quả (Reports):**
  - **Màn hình Kỹ thuật:** Hiển thị chi tiết hao hụt, thành phần vật tư, tính m-kg (Không cần giá tiền).
  - **Màn hình Sale (Quản lý):** UI hiển thị giá bán / bảng phân tích % lợi nhuận. Có ô Input "Giá bán chốt" để sale điều chỉnh và UI tự động đối chiếu chênh lệch.
- **UI Thiết lập Hệ thống:** Form giao diện bảng (table) để quản lý cấu hình mặc định (định mức, đơn giá vật tư, bảng lợi nhuận tùy chỉnh).

## 2. Hạng mục Quản lý Báo giá
- **UI Danh sách Báo giá:** Thiết kế bảng DataGrid hiển thị thông tin báo giá kèm bộ lọc (Filter) theo các Trạng thái (đã lập, chờ duyệt, đã gửi, hoàn thành). Phân trang (Pagination) và thanh tìm kiếm.
- **UI Form báo giá mới:** Màn hình kết hợp lấy dữ liệu tự động từ bộ "Tính giá sản phẩm" sang và gán Khách hàng để lưu lại. Cần các UI hiển thị Trạng thái (Badge).

## 3. Hạng mục Xuất biểu mẫu Báo giá
- **UI Bản In (Print Layout):** Xây dựng mẫu HTML/CSS cố định chuyên biệt (loại bỏ hiệu ứng web, tập trung màu sắc chuẩn công ty) để chuẩn bị xuất file.
- **Tích hợp tính năng:** Nút "Xuất PDF" chạy cơ chế client-side (vd: thư viện `html2pdf.js` hoặc `react-to-print`) để download biểu mẫu trực tiếp trên trình duyệt.

## 4. Hạng mục Quản lý Khách hàng (Mini CRM)
- **UI Trang Quản lý Khách hàng:** Bảng hiển thị thông tin danh sách tệp khách.
- **UI Thêm/Sửa/Xóa:** Form popup (Modal) hoặc trang rời để nhập liệu hồ sơ công ty khách (Tên, MST, Số điện thoại người liên hệ...).

## 5. Hạng mục Chuyển đổi Lệnh sản xuất
- **Giao diện Nút thao tác nhanh:** Tạo các nút bấm "Lên lệnh sản xuất" ngay trên màn hình chi tiết Báo giá.
- **UI Biểu mẫu Lệnh Sản Xuất:** Một form Preview (Chỉ đọc) hoặc xác nhận đã tự động map sẵn các trường kỹ thuật từ báo giá, tránh thao tác gõ lại tay. Thiết kế sao cho dễ dàng In/Xuất PDF cho xưởng.

## 6. Hạng mục Phân quyền & Quản lý User
- **Trang Đăng Nhập (Login Page):** Form đăng nhập + xử lý Authentication state.
- **Layout & Routing động dựa theo Role (RBAC UI):**
  - Layout chung với Navbar / Sidebar.
  - Phân luồng hiển thị: Code điều kiện (if/else UI) để **ẩn/hiện các Menu**:
    - *Admin:* Thấy toàn bộ tính năng và màn hình "Quản lý User".
    - *Sales:* Ẩn tính năng sửa đơn giá vật tư đầu vào, ẩn Lệnh sản xuất của bộ phận khác (chỉ thấy cái mình được giao).
    - *Thu mua:* Ẩn toàn bộ báo giá sale, chỉ chừa lại màn hình danh mục Vật liệu/Đơn giá.
- **UI Quản lý User:** Bảng quản lý cấp tài khoản dành cho Admin.

## 7. Hạng mục Tra cứu & Lưu trữ (Danh mục)
- **Thanh Tìm kiếm Toàn cục (Global Search) / Filter Engine:** Giao diện cho phép nhập từ khóa để tra cứu hồ sơ nghiệp vụ.
- **UI Các trang Danh mục (Master Data):** Xây dựng các form table chuyên quản lý thông tin tĩnh (danh sách Vật tư, danh sách Sản phẩm mẫu).

## 8. Kiến trúc Nền tảng Frontend
- **Khởi tạo Framework:** Cài đặt Next.js / React, Tailwind CSS.
- **Xây dựng Design System / UI Kit nội bộ:** Xây dựng sẵn các linh kiện (Components) xài chung trên toàn dự án giúp đồng bộ màu sắc công ty:
  - Form Elements (Input có validate số/tiền tệ, Select, Checkbox).
  - Common UI (Button, Modal Dialog, Toast thông báo thành công/lỗi, Badge màu trạng thái).
