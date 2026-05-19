# ProjectPlan — Phần Mềm Báo Giá & Tính Giá Thành Bao Bì
**Công ty CP Lai Trường Sơn (LTS)**
**Ngày lập:** 2026-03-30 | **Phiên bản:** 1.0

---

## 1. Tổng Quan Dự Án

| Thông tin | Chi tiết |
|:---|:---|
| **Tên dự án** | LTS Pricing — Phần Mềm Báo Giá Bao Bì |
| **Mã dự án** | `lts-pricing` / `PhanMemBaoBi` |
| **Khách hàng** | Công ty CP Lai Trường Sơn |
| **Nền tảng** | Web nội bộ (Internal Web App) |
| **Ngôn ngữ giao diện** | Tiếng Việt |
| **Ngày bắt đầu** | 2026-03-30 |
| **Trạng thái** | 🟡 Đang phát triển — Frontend gần hoàn chỉnh, chưa có backend |

### Mục tiêu dự án

Xây dựng hệ thống phần mềm quản lý báo giá và tính giá thành sản phẩm túi bao bì nhựa, phục vụ toàn bộ quy trình từ **tính giá → lập báo giá → phê duyệt → xuất biểu mẫu → lên lệnh sản xuất**, với phân quyền rõ ràng theo vai trò (Admin / Sales / Thu mua).

---

## 2. Công Nghệ Sử Dụng

| Lớp | Công nghệ | Phiên bản |
|:---|:---|:---|
| Framework | Next.js (App Router) | 16.2.1 |
| UI Library | React | 19.2.4 |
| Ngôn ngữ | TypeScript | 5.x |
| Styling | Tailwind CSS + PostCSS | 4.x |
| State Management | Zustand | 5.0.12 |
| Icons | Lucide React | 1.0.1 |
| Backend API | Next.js API Routes | — |
| Database | PostgreSQL (kế hoạch) | — |
| Auth | NextAuth.js / JWT | — |
| PDF Export | html2pdf.js / react-to-print | — |

> ⚠️ **Lưu ý:** Next.js 16 có breaking changes. Đọc docs tại `node_modules/next/dist/docs/` trước khi viết code mới.

---

## 3. Phạm Vi Công Việc (9 Hạng Mục)

### Hạng mục 1 — Tính Giá Sản Phẩm
> **Trạng thái:** ✅ Core engine hoàn chỉnh | 🟡 Một số UI cần hoàn thiện

**Phạm vi:**
- Tính giá bao bì theo quy cách sản phẩm (loại túi, loại màng, kích thước)
- Tính giá theo vật tư, cấu trúc màng (tối đa 5 lớp), khổ thành phẩm
- Tính sẵn số kg cuộn màng vật tư
- Tính sẵn độ dài trục và chu vi trục theo khổ thành phẩm — **cảnh báo** khi ngoài kích thước trục cho phép
- Thiết lập định mức hao hụt, chi phí sản xuất từng công đoạn và biên lợi nhuận
- Hiển thị **2 bảng kết quả**:
  - **Bảng gốc (Tool):** Kết quả tính chuẩn, chỉ Admin chỉnh được
  - **Bảng Sale:** Sale có thể điều chỉnh giá chốt, hệ thống tự đối chiếu chênh lệch

**Công việc còn lại:**
- [ ] Hoàn thiện cảnh báo trục in realtime (UI)
- [ ] Bảng phụ sale điều chỉnh (input "Giá bán chốt" với diff view)
- [ ] Tính kg cuộn màng: UI hiển thị rõ ràng hơn

---

### Hạng mục 2 — Quản Lý Báo Giá
> **Trạng thái:** 🟡 UI sẵn (`QuotationModule.tsx`), cần backend

**Phạm vi:**
- Tạo báo giá từ dữ liệu đã tính (chọn sản phẩm từ lịch sử tính giá)
- Lưu lịch sử báo giá theo khách hàng
- Theo dõi **trạng thái báo giá** theo luồng:
  ```
  Đã lập → Đã gửi → Chờ duyệt → Đã duyệt → Hoàn thành
  ```
- Tra cứu và xem lại báo giá đã lập (lọc, tìm kiếm, phân trang)

**Công việc còn lại:**
- [ ] API: CRUD báo giá (POST /api/quotes, GET /api/quotes, PATCH /api/quotes/:id)
- [ ] Luồng duyệt báo giá (state machine)
- [ ] Liên kết báo giá ↔ sản phẩm ↔ khách hàng (database relations)
- [ ] Thông báo trạng thái (toast/email)

---

### Hạng mục 3 — Xuất Biểu Mẫu Báo Giá
> **Trạng thái:** 🔴 Chưa có — hiện chỉ xuất text đơn giản

**Phạm vi:**
- Tự động xuất **PDF báo giá chuyên nghiệp** từ các sản phẩm đã tính giá
- Form và chuẩn hóa biểu mẫu báo giá theo **chuẩn công ty LTS**
- Hỗ trợ chọn nhiều sản phẩm vào cùng 1 file báo giá

**Công việc còn lại:**
- [ ] Thiết kế template HTML/CSS in ấn (Print Layout) theo chuẩn LTS
- [ ] Tích hợp thư viện PDF (html2pdf.js hoặc Puppeteer server-side)
- [ ] Nút "Xuất PDF" trên màn hình báo giá
- [ ] Preview trước khi xuất

---

### Hạng mục 4 — Quản Lý Khách Hàng & Chính Sách Giá
> **Trạng thái:** 🟡 UI sẵn (`CustomerModule.tsx`), cần backend

**Phạm vi:**
- Quản lý danh sách khách hàng (thêm/sửa/xóa, tìm kiếm)
- Lưu thông tin theo từng hồ sơ khách hàng (Tên, MST, liên hệ, địa chỉ)
- Liên kết khách hàng với báo giá và lịch sử giao dịch

**Công việc còn lại:**
- [ ] API: CRUD khách hàng (POST /api/customers, GET /api/customers, ...)
- [ ] Form modal thêm/sửa khách hàng
- [ ] Tìm kiếm và lọc danh sách
- [ ] Trang hồ sơ chi tiết khách hàng (kèm lịch sử báo giá)

---

### Hạng mục 5 — Chuyển Đổi Báo Giá → Lệnh Sản Xuất
> **Trạng thái:** 🔴 Chưa có

**Phạm vi:**
- Tạo lệnh sản xuất cho sản phẩm từ dữ liệu báo giá (1 click)
- Tự động map dữ liệu: báo giá → lệnh sản xuất chuẩn hóa
- Giảm thao tác nhập lại thủ công
- Đồng bộ thông tin từ báo giá sang biểu mẫu sản xuất (xuất PDF cho xưởng)

**Công việc còn lại:**
- [ ] Thiết kế schema lệnh sản xuất
- [ ] API: Tạo lệnh sản xuất từ báo giá (POST /api/production-orders)
- [ ] UI: Nút "Lên lệnh sản xuất" trên màn hình chi tiết báo giá
- [ ] Form preview lệnh sản xuất (read-only, auto-mapped)
- [ ] Xuất PDF lệnh sản xuất cho xưởng

---

### Hạng mục 6 — Quản Lý Người Dùng & Phân Quyền (RBAC)
> **Trạng thái:** 🟡 UI phân quyền menu sẵn, chưa có auth backend

**Phạm vi:**

| Vai trò | Quyền |
|:---|:---|
| **Admin** | Duyệt giá; xem/sửa toàn bộ dữ liệu; cấp/thu hồi/chuyển nhượng quyền cho tài khoản khác |
| **Sales** | Tạo & chỉnh sửa báo giá của mình; xem giá vật tư, cấu hình tính giá; xem KH được phân quyền; xem sản phẩm của mình/được giao |
| **Thu mua** | Xem/sửa/quản lý phần nguyên vật liệu (giá vật tư, nhà cung cấp) |

**Công việc còn lại:**
- [ ] Hệ thống xác thực (Login page + NextAuth.js / JWT)
- [ ] Middleware bảo vệ routes theo role
- [ ] API: CRUD tài khoản người dùng (Admin only)
- [ ] UI: Trang quản lý user (Admin)
- [ ] Luồng phân quyền khách hàng cho Sales
- [ ] Luồng chuyển nhượng quyền quản lý

---

### Hạng mục 7 — Lưu Trữ & Tra Cứu Dữ Liệu
> **Trạng thái:** 🟡 LocalStorage tạm thời, cần database thực sự

**Phạm vi:**

| Loại dữ liệu | Nội dung |
|:---|:---|
| Cấu hình tính giá | Giá NVL đầu vào, định mức hao hụt, chi phí sản xuất từng công đoạn, thông số công cụ tính giá |
| Báo giá | Toàn bộ lịch sử báo giá theo KH, sản phẩm, trạng thái |
| Sản phẩm | Thông số kỹ thuật, kết quả tính giá đã lưu |
| Khách hàng | Hồ sơ KH, lịch sử giao dịch |
| Phân quyền | Tài khoản, vai trò, quyền hạn |
| Tra cứu nội bộ | Tìm kiếm toàn cục, lọc đa chiều |

> 📌 **Hạn mức:** Miễn phí 30.000 lượt khởi tạo và lưu mới hồ sơ nghiệp vụ.

**Công việc còn lại:**
- [ ] Thiết kế schema database (PostgreSQL)
- [ ] Migration scripts
- [ ] Chuyển đổi từ LocalStorage → Database API
- [ ] Thanh tìm kiếm toàn cục (Global Search)
- [ ] Trang danh mục vật tư (Master Data UI)

---

### Hạng mục 8 — Triển Khai & Vận Hành Hệ Thống
> **Trạng thái:** 🔴 Chưa có — đang chạy dev local

**Phạm vi:**
- Xây dựng giao diện sử dụng trên nền tảng web nội bộ *(đang thực hiện)*
- Xây dựng hệ thống xử lý dữ liệu và nghiệp vụ (Backend API)
- Thiết kế cơ sở dữ liệu
- Thiết lập tài khoản đăng nhập và phân quyền ban đầu
- Cài đặt và cấu hình hệ thống trên máy chủ nội bộ / cloud
- Bàn giao để doanh nghiệp sử dụng thực tế

**Công việc còn lại:**
- [ ] Chọn và thiết lập môi trường triển khai (server nội bộ / VPS / Vercel)
- [ ] CI/CD pipeline (tự động deploy khi push code)
- [ ] Cấu hình environment variables (production)
- [ ] Thiết lập HTTPS / domain nội bộ
- [ ] Seed dữ liệu ban đầu (vật tư, tài khoản admin đầu tiên)
- [ ] Kiểm thử UAT (User Acceptance Testing) với nhân viên LTS
- [ ] Bàn giao và tài liệu hướng dẫn sử dụng

---

### Hạng mục 9 — Hỗ Trợ Vận Hành Ban Đầu
> **3 buổi × 90 phút — hướng dẫn trực tiếp tại công ty**

| Buổi | Nội dung dự kiến |
|:---:|:---|
| **Buổi 1** | Hướng dẫn tính giá sản phẩm, cấu hình vật tư, thiết lập hằng số sản xuất |
| **Buổi 2** | Hướng dẫn lập báo giá, xuất PDF, quản lý khách hàng, theo dõi trạng thái |
| **Buổi 3** | Hướng dẫn phân quyền, quản lý user, lên lệnh sản xuất, tra cứu dữ liệu |

---

## 4. Phân Tích Trạng Thái Hiện Tại

### ✅ Đã hoàn chỉnh
- Máy tính giá thành: form nhập liệu, thuật toán `engine.ts` (155 trường output), hiển thị kết quả
- Giao diện ManagerView (Sales/Kinh doanh), TechView (Kỹ thuật), HistoryView
- Cấu hình vật liệu (18 vật liệu) & hằng số sản xuất (20+ hằng số)
- Dark mode, responsive layout (desktop + mobile), LocalStorage persistence
- Menu điều hướng theo vai trò (RBAC UI)
- Lịch sử tính giá (50 lượt gần nhất)
- AppShell layout (sidebar, topbar)

### 🟡 UI sẵn, cần kết nối backend
- `QuotationModule.tsx` — Quản lý báo giá
- `CustomerModule.tsx` — Quản lý khách hàng
- `SellerModule.tsx` — Báo cáo nhân viên
- `ConfigPage.tsx` — Cấu hình (cần persist lên DB)

### 🔴 Chưa có — cần xây dựng mới
- Backend API (Next.js API Routes)
- Database (PostgreSQL + ORM)
- Hệ thống xác thực (Auth)
- PDF export chuyên nghiệp
- Lệnh sản xuất
- Triển khai production

---

## 5. Lộ Trình Phát Triển

### Phase 1 — Foundation (Backend Core)
**Ưu tiên:** Hạng mục 6 (Auth) + Hạng mục 7 (Database) + Hạng mục 8 (Infrastructure)

| # | Công việc | Hạng mục |
|:---:|:---|:---:|
| 1.1 | Thiết kế ERD & schema database | 7, 8 |
| 1.2 | Cài đặt PostgreSQL + Prisma ORM | 7, 8 |
| 1.3 | Migration: Users, Roles, Permissions | 6 |
| 1.4 | API xác thực (Login / Logout / Session) | 6 |
| 1.5 | Middleware bảo vệ routes theo role | 6 |
| 1.6 | Migration: Materials, Constants, ProfitTable | 7 |
| 1.7 | API CRUD vật liệu & cấu hình | 7 |
| 1.8 | Chuyển đổi ConfigPage từ LocalStorage → DB API | 7 |

---

### Phase 2 — Core Business Logic
**Ưu tiên:** Hạng mục 1 (Tính giá) + Hạng mục 4 (Khách hàng) + Hạng mục 2 (Báo giá)

| # | Công việc | Hạng mục |
|:---:|:---|:---:|
| 2.1 | Hoàn thiện UI cảnh báo trục in realtime | 1 |
| 2.2 | Bảng Sale điều chỉnh giá chốt (diff view) | 1 |
| 2.3 | Lưu sản phẩm đã tính lên DB | 1 |
| 2.4 | API CRUD khách hàng | 4 |
| 2.5 | Hoàn thiện CustomerModule (kết nối API) | 4 |
| 2.6 | API CRUD báo giá | 2 |
| 2.7 | Luồng trạng thái báo giá (state machine) | 2 |
| 2.8 | Hoàn thiện QuotationModule (kết nối API) | 2 |
| 2.9 | Trang quản lý User (Admin) | 6 |

---

### Phase 3 — Advanced Features
**Ưu tiên:** Hạng mục 3 (PDF) + Hạng mục 5 (Lệnh SX) + Hạng mục 7 (Tra cứu)

| # | Công việc | Hạng mục |
|:---:|:---|:---:|
| 3.1 | Thiết kế template báo giá chuẩn LTS | 3 |
| 3.2 | Tích hợp xuất PDF (html2pdf / Puppeteer) | 3 |
| 3.3 | Preview PDF trước khi xuất | 3 |
| 3.4 | Thiết kế schema lệnh sản xuất | 5 |
| 3.5 | API tạo lệnh SX từ báo giá | 5 |
| 3.6 | UI form lệnh SX (preview + xuất PDF) | 5 |
| 3.7 | Thanh tìm kiếm toàn cục | 7 |
| 3.8 | Trang danh mục sản phẩm mẫu | 7 |

---

### Phase 4 — Deployment & Handover
**Ưu tiên:** Hạng mục 8 (Triển khai) + Hạng mục 9 (Hỗ trợ)

| # | Công việc | Hạng mục |
|:---:|:---|:---:|
| 4.1 | Thiết lập môi trường production | 8 |
| 4.2 | CI/CD, HTTPS, domain nội bộ | 8 |
| 4.3 | Seed dữ liệu ban đầu (vật tư, tài khoản) | 8 |
| 4.4 | UAT với nhân viên LTS | 8 |
| 4.5 | Fix bugs sau UAT | 8 |
| 4.6 | Buổi hỗ trợ 1: Tính giá & cấu hình | 9 |
| 4.7 | Buổi hỗ trợ 2: Báo giá, PDF, khách hàng | 9 |
| 4.8 | Buổi hỗ trợ 3: Phân quyền, lệnh SX, tra cứu | 9 |

---

## 6. Kiến Trúc Hệ Thống (Đề Xuất)

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                 │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Calculator│  │ Quotation│  │ Production Order │  │
│  │  Module  │  │  Module  │  │     Module       │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Customer │  │   User   │  │   Config / PDF   │  │
│  │  Module  │  │  Module  │  │     Module       │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────┬───────────────────────────┘
                          │ HTTP (API Routes)
┌─────────────────────────▼───────────────────────────┐
│                  BACKEND (Next.js API)               │
│                                                     │
│  /api/auth     /api/quotes     /api/customers       │
│  /api/users    /api/products   /api/materials       │
│  /api/production-orders        /api/config          │
└─────────────────────────┬───────────────────────────┘
                          │ Prisma ORM
┌─────────────────────────▼───────────────────────────┐
│                    DATABASE (PostgreSQL)              │
│                                                     │
│  users  roles  customers  quotes  products          │
│  materials  constants  profit_table  production_orders│
└─────────────────────────────────────────────────────┘
```

---

## 7. Sơ Đồ Luồng Nghiệp Vụ Chính

```
[Sales nhập thông số sản phẩm]
          ↓
[Engine tính giá tự động]
          ↓
[Sales chốt giá → Lưu sản phẩm]
          ↓
[Tạo báo giá (gắn khách hàng + sản phẩm)]
          ↓
[Admin duyệt báo giá] ──── [Không duyệt → Sales chỉnh sửa]
          ↓ (Đã duyệt)
[Xuất PDF gửi khách hàng]
          ↓ (Khách đồng ý)
[Tạo lệnh sản xuất từ báo giá]
          ↓
[PDF lệnh SX → Xưởng sản xuất]
```

---

## 8. Cấu Trúc Database (ERD Tóm Tắt)

```
users ──────────────── roles
  │                      │
  │ (created_by)          │ (role_id)
  ▼                      ▼
customers ◄──── quotes ◄──── quote_items ◄──── products
                  │                               │
                  ▼                               ▼
          production_orders              product_layers (màng)
                                                  │
                                                  ▼
                                              materials

config_tables: materials | production_constants | profit_table
```

---

## 9. Rủi Ro & Giải Pháp

| Rủi ro | Mức độ | Giải pháp |
|:---|:---:|:---|
| Next.js 16 breaking changes gây lỗi không lường trước | 🔴 Cao | Đọc kỹ docs tại `node_modules/next/dist/docs/` trước khi code |
| Thuật toán tính giá phức tạp, migrate sang DB có thể làm sai kết quả | 🔴 Cao | Viết test cases so sánh kết quả engine cũ vs mới trước khi deploy |
| LocalStorage data không tương thích với DB schema | 🟡 Trung bình | Viết migration script chuyển đổi dữ liệu cũ |
| Nhân viên khó thích nghi với hệ thống mới | 🟡 Trung bình | 3 buổi hỗ trợ tại công ty + tài liệu hướng dẫn video/text |
| Template PDF không đúng chuẩn công ty | 🟡 Trung bình | Lấy mẫu biểu mẫu thực tế từ LTS trước khi thiết kế |
| Hạn mức 30.000 hồ sơ bị vượt | 🟢 Thấp | Monitor usage, cảnh báo sớm khi đạt 80% |

---

## 10. Tiêu Chí Hoàn Thành (Definition of Done)

Dự án được coi là **hoàn thành** khi đáp ứng đủ các tiêu chí sau:

- [ ] Tất cả 9 hạng mục đã triển khai và hoạt động đúng trên môi trường production
- [ ] Hệ thống xác thực hoạt động (login/logout/phân quyền theo role)
- [ ] Engine tính giá cho kết quả khớp 100% so với công thức thực tế của LTS
- [ ] Xuất PDF báo giá đúng chuẩn biểu mẫu công ty
- [ ] Lệnh sản xuất tự động map đúng dữ liệu từ báo giá
- [ ] Admin có thể tạo/phân quyền tài khoản người dùng
- [ ] Dữ liệu lưu trên database (không còn phụ thuộc LocalStorage)
- [ ] UAT pass với ít nhất 2 nhân viên Sales và 1 Admin từ phía LTS
- [ ] 3 buổi hỗ trợ hoàn tất
- [ ] Bàn giao tài liệu hướng dẫn sử dụng

---

*Tài liệu này được cập nhật lần cuối: 2026-03-30*
