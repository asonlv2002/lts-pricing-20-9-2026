# UI/UX — Mục 8: Lộ Trình Triển Khai Mobile Web (theo từng file)

> **Quan hệ tài liệu:** Đây là *lộ trình code* hiện thực hóa design spec ở
> `UI-06-ThietKeMobileWeb.md` (pattern + quyết định) và `UI-07-WireframeMobile.md`
> (wireframe từng màn). UI-06 §10 đã nói "lộ trình code chi tiết theo từng file làm ở
> bước triển khai riêng" — file này là bước đó.
> **Phạm vi đợt này:** 3 màn dày dữ liệu nhất — Form tính giá, Kết quả, Cấu hình — cho
> cả phone (≤767) và dải tablet 768–1279.

---

## Context (vì sao làm)

App chạy 1 route Next.js duy nhất, navigation theo state `activeModule` (không theo URL).
Hạ tầng responsive đã có nhưng **chắp vá**: ~40 block `@media` trong `globals.css` (~6322
dòng), styling là CSS-variable + class BEM-ish (Tailwind v4 cài nhưng gần như dormant).

Vấn đề chính cần xử lý:
- 2 chiến lược bảng mobile **đè nhau** ở ≤600px (card-reflow ≤767 vs scroll ngang ≤600).
- Trang cấu hình chỉ scroll ngang, không sửa được thoải mái trên phone.
- Dải tablet 768–1279 bị **ép scroll ngang cố ý** (`min-width:1120px`).
- Form 100+ field chưa gom nhóm gập/mở cho mobile.
- `layout.tsx` thiếu viewport meta / safe-area / themeColor.
- Mobile detection lặp ở 2 nơi (`window.innerWidth < 768`).

## Quyết định đã chốt với người dùng

- **Form** (`TheNhapLieu`): cuộn dài + nhóm gập/mở (accordion theo UI-06 §4, UI-07 §2).
  *(Người dùng giữ lại 2 phương án khác — wizard nhiều bước, tab theo nhóm — cho lần sau.)*
- **Bảng kết quả** (`ManHinhQuanLy`): card-reflow + nút mở **bảng full-screen ~90%** để
  xoay ngang xem bảng gốc.
- **Cấu hình** (`TrangCauHinh`): sửa đầy đủ trên mobile (card-reflow có input).
- **Phạm vi**: tối ưu cả phone (≤767) và dải tablet 768–1279.

## Nguyên tắc kỹ thuật

- **Mở rộng hệ CSS-variable + globals.css hiện có**, KHÔNG đưa Tailwind utility vào.
- **Không phá desktop**: mọi thay đổi gate sau `useLaMobile()` hoặc `@media`.
- Tái sử dụng: `TheThuGon` (ManHinhQuanLy.tsx:9-39), CSS card-reflow (globals.css:3977-4041),
  `data-label` sẵn có trên `<td>` bảng kết quả, formatter VND ở `apps/web/src/lib/engine.ts`.
- **Lưu ý breakpoint:** UI-06 §2 chuẩn hóa dần về `600 / 768 / 1024`; đợt này bám mốc sẵn
  trong code (`767 / 768 / 1279`) để vá đúng chỗ, nhưng CSS mobile mới nên tiến dần về chuẩn
  UI-06. Dùng `100dvh` thay `100vh` cho vùng full-height (sheet/overlay/detail).

---

## Bước 1 — Hook breakpoint dùng chung (gỡ trùng lặp detection)

Hiện `window.innerWidth < 768` lặp ở `page.tsx:~101-106` và `VoTrang.tsx:~532-543`.

**Tạo mới** `apps/web/src/lib/useMediaQuery.ts`:
- `useMediaQuery(query)` — SSR-safe (`useState(false)`, subscribe `matchMedia` `change`).
- `useLaMobile()` → `(max-width: 767px)`
- `useLaTablet()` → `(min-width: 768px) and (max-width: 1279px)`

**Sửa `VoTrang.tsx`**: thay listener resize bằng `const laMobile = useLaMobile()`; sidebar
auto-collapse khi `laMobile || laTablet` (giữ hành vi `<1280` cũ).
**Sửa `page.tsx`**: thay detection local bằng `useLaMobile()`; giữ `tabMobile`, swipe, mini-price.

## Bước 2 — Viewport / meta / safe-area (nền tảng, làm sớm)

**Sửa `apps/web/src/app/layout.tsx`** (chưa có viewport export): thêm
```ts
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0b0f1a' },
  ],
};
```
**Sửa globals.css** (block `@media max-width:767px`): thêm `env(safe-area-inset-bottom)` vào
`.mobile-calc-nav` / `.lts-fab-container` / footer form. Giữ `body{overflow-x:hidden}`.

## Bước 3 — Form: nhóm gập/mở + gỡ width cố định

**Tách `TheThuGon`** (ManHinhQuanLy.tsx:9-39) ra `apps/web/src/components/chung/TheThuGon.tsx`,
import lại ở cả 2 nơi. Tạo `NhomGap` (dựa trên TheThuGon) cho form: props `tieuDe`,
`moMacDinh`, `children`; chỉ gập khi `useLaMobile()` → **desktop giữ nguyên**.

**Sửa `TheNhapLieu.tsx`**: bọc các cụm field sẵn có vào `NhomGap` theo nhóm nghiệp vụ
(khớp UI-07 §2.1): "Thông tin đơn hàng" · "Kích thước & số lượng" · "Cấu trúc vật liệu" ·
"Thông số in" · "Phụ phí & tài chính" (gộp `advanced-section`, giữ binding `advancedOpen`).
Nút "Tính giá" để ngoài.

**Gỡ width cố định inline** (chỉ khi `laMobile`, set `undefined` → CSS fill 100%):
`width:110px` (583), `width:90px` (1008), `flex:'0 0 120px'` (959). Giữ nút icon 44px (749).

**Sửa globals.css**: `.input-form-card{padding-right:56px}` (266) → đẩy vào
`@media min-width:768px`; ở mobile `padding-right:12px; position:static` (bỏ sticky).

## Bước 4 — Bảng kết quả: gỡ xung đột + overlay bảng full-screen

**Gỡ xung đột (globals.css):** trong block `@media max-width:600px` (5203-5235), **bỏ
`.data-table` và `.moq-table` khỏi rule `min-width`/`white-space:nowrap`** → card-reflow
(3977-4041) thắng sạch toàn dải phone.

**Overlay bảng full-screen (mới, chỉ mobile):** nút "Xem bảng đầy đủ" trên mỗi vùng bảng đã
card-reflow trong `ManHinhQuanLy.tsx` (`BangGhiDe` 276, `m-t-unified-table` ~893, `moq-table`
~1042, `moq-roll-table` ~1097). Component `BangToanManHinh` (dùng lại backdrop `lts-confirm-*`
ở VoTrang.tsx:457): overlay fixed ~90vw×90dvh, bên trong render `<table>` gốc với card-reflow
**bị tắt** (`.bang-full-screen .data-table{display:table}` + khôi phục `thead`). Nút chỉ render
khi `useLaMobile()`. Ô ghi-đè giá hoạt động trong cả 2 chế độ.

## Bước 5 — Bảng cấu hình: card-reflow CÓ input (sửa đầy đủ trên mobile)

**Thêm `.config-table` vào card-reflow** trong block `@media max-width:767px` — **tách riêng**
với `.data-table` (cell chứa `<input>`/`<select>` sống):
- `.config-table, tbody, tr, td { display:block; width:100% }` · `thead{display:none}`
- `td{display:flex; justify-content:space-between; align-items:center; gap:10px}`
- `td::before{content:attr(data-label)}`
- `td .config-inline-input{width:100% !important; flex:1; min-width:0}` ← đè width 70/80/100/120px
- Bỏ `.config-table{min-width:420px}` ở block 600px (5234).

**Sửa `TrangCauHinh.tsx`** (việc thủ công nhiều nhất): **thêm `data-label` vào mọi `<td>`**
các bảng tại 394 / 463 / 512 / 543 / 612 / 815 / 861 / 1001 / 1082.

**Ca đặc biệt:**
- `printWasteTable` có `<input>` trong `<th>` (543): mobile chuyển thead thành hàng label +
  gán `data-label` cho từng input, hoặc tách input xuống vùng card riêng.
- Bảng 7 cột (`materialPriceTable` 394, `smallWidthPriceTable` 463): card-reflow đầy đủ; kèm
  nút "Xem bảng đầy đủ" nếu cần (như Bước 4).
- Section lãi vay là **grid div, không phải table** (`gridTemplateColumns:'72px 1fr 1fr'`
  692/698): mobile cho về `1fr` qua `@media`.

## Bước 6 — Dải tablet 768–1279: bỏ ép scroll ngang

**Sửa globals.css** block `@media (min-width:768px) and (max-width:1279px)` (3056-3098):
bỏ `min-width:1120/1080/1144px`. Thay bằng reflow thật: `.main-grid` 1 cột,
`.form-row-3` → 2 cột, bảng dùng `.table-responsive` scroll cục bộ.

## Navigation

Giữ cơ chế hiện có (FAB `MenuNoiMobile` + bottom-tab `.mobile-calc-nav` + swipe). Chỉ chuyển
nguồn `laMobile` sang hook chung (Bước 1). Không đổi `activeModule`/routing.
*(UI-06 §3 đề xuất xa hơn: thống nhất drawer thay FAB — để dành đợt sau.)*

---

## Verification

1. `pnpm dev:web` → mở `http://localhost:3000` (hoặc 3001).
2. `pnpm type-check` + `pnpm lint` phải sạch.
3. DevTools → Toggle device toolbar, test ở **375px / 768px / 1024px / ≥1280px**:
   - **375px**: form gập/mở từng nhóm, không tràn ngang; bảng kết quả thành thẻ; nút "Xem
     bảng đầy đủ" mở overlay 90%, xoay ngang đọc bảng gốc; bảng cấu hình sửa được (input fill
     100%); chốt/ghi-đè giá hoạt động.
   - **768–1279px**: KHÔNG còn scroll ngang ép buộc; layout reflow 1–2 cột.
   - **≥1280px**: layout desktop **y nguyên** (regression — 2 pane 380px+1fr, bảng gốc).
4. Golden path: nhập form → ra kết quả card → mở bảng full-screen → sửa 1 bảng cấu hình → lưu.

## Files sẽ sửa

| File | Thay đổi |
|------|----------|
| `apps/web/src/lib/useMediaQuery.ts` | **MỚI** — hook breakpoint chung |
| `apps/web/src/components/chung/TheThuGon.tsx` | **MỚI** — tách từ ManHinhQuanLy |
| `apps/web/src/components/layout/VoTrang.tsx` | Dùng `useLaMobile/useLaTablet` |
| `apps/web/src/app/page.tsx` | Dùng `useLaMobile` |
| `apps/web/src/app/layout.tsx` | Thêm `export const viewport` |
| `apps/web/src/components/TheNhapLieu.tsx` | Bọc `NhomGap`, gỡ width inline |
| `apps/web/src/components/ManHinhQuanLy.tsx` | Dùng TheThuGon chung + overlay `BangToanManHinh` |
| `apps/web/src/components/TrangCauHinh.tsx` | Thêm `data-label`, xử lý ca đặc biệt |
| `apps/web/src/app/globals.css` | Gỡ xung đột bảng, card-reflow config, dải tablet, viewport/safe-area, padding form |

**Rủi ro phá desktop:** thấp — mọi thay đổi gate sau `laMobile` hoặc `@media`. Soi kỹ: gỡ
width inline phải gate `laMobile`; selector `.bang-full-screen` đủ cụ thể để không rò sang thẻ
card; giữ binding `advancedOpen` khi gộp vào NhomGap.

---

# PHỤ LỤC — Code chi tiết từng bước

> Code dưới đây là bản nháp thực thi, đã đối chiếu cấu trúc file thực tế. Số dòng tham chiếu
> theo trạng thái hiện tại; khi code thực tế lệch, bám theo *tên class / tên biến* thay vì số dòng.

## A1. `apps/web/src/lib/useMediaQuery.ts` (MỚI — full file)

```ts
'use client';
import { useEffect, useState } from 'react';

/** SSR-safe: server và lần hydrate đầu trả `false` (desktop-first), khớp hành vi cũ. */
export function useMediaQuery(query: string): boolean {
  const [khop, datKhop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const xuLy = () => datKhop(mql.matches);
    xuLy();
    mql.addEventListener('change', xuLy);
    return () => mql.removeEventListener('change', xuLy);
  }, [query]);
  return khop;
}

export const useLaMobile = () => useMediaQuery('(max-width: 767px)');
export const useLaTablet = () =>
  useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
```

**`page.tsx`** — thay block 100-106:
```ts
// XÓA: const [laMobile, datLaMobile] = useState(false); + useEffect resize
const laMobile = useLaMobile();   // import từ '@/lib/useMediaQuery'
```
**`VoTrang.tsx`** — thay block 531-543:
```ts
const laMobile = useLaMobile();
const laTablet = useLaTablet();
useEffect(() => {
  if (laMobile || laTablet) datThanhBenDangMo(false);
}, [laMobile, laTablet]);
```

## A2. `apps/web/src/app/layout.tsx` — thêm viewport export

```ts
import type { Metadata, Viewport } from 'next';
// ... giữ metadata cũ ...
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0b0f1a' },
  ],
};
```
Không đặt `maximumScale`/`userScalable:false` (giữ zoom — yêu cầu a11y UI-06 §9).

## A3. `apps/web/src/components/chung/TheThuGon.tsx` (MỚI) + `NhomGap`

Tách nguyên `TheThuGon` từ `ManHinhQuanLy.tsx:9-39` ra file dùng chung, export thêm `NhomGap`:

```tsx
'use client';
import React, { useState } from 'react';
import { useLaMobile } from '@/lib/useMediaQuery';

export function TheThuGon({ title, children, resetKey, style }: {
  title: React.ReactNode; children: React.ReactNode;
  resetKey: string | number; style?: React.CSSProperties;
}) {
  const [mo, datMo] = useState(false);
  React.useEffect(() => { datMo(false); }, [resetKey]);
  return (
    <div className="card" style={style}>
      <div className="card-title collapsible" onClick={() => datMo(v => !v)} aria-expanded={mo}>
        {title}<span className={`card-collapse-arrow${mo ? ' open' : ''}`}>▼</span>
      </div>
      <div className={`card-body-collapsible${mo ? ' open' : ''}`}>{children}</div>
    </div>
  );
}

/** Nhóm field cho FORM: chỉ gập/mở trên mobile; desktop render phẳng (giữ layout cũ). */
export function NhomGap({ tieuDe, moMacDinh = false, badge, children }: {
  tieuDe: React.ReactNode; moMacDinh?: boolean;
  badge?: React.ReactNode; children: React.ReactNode;
}) {
  const laMobile = useLaMobile();
  const [mo, datMo] = useState(moMacDinh);
  if (!laMobile) return <>{children}</>;            // desktop: KHÔNG đổi gì
  return (
    <div className="nhom-gap">
      <button type="button" className="nhom-gap-header" aria-expanded={mo}
        onClick={() => datMo(v => !v)}>
        <span className={`nhom-gap-arrow${mo ? ' open' : ''}`}>▸</span>
        <span className="nhom-gap-title">{tieuDe}</span>
        {badge && <span className="nhom-gap-badge">{badge}</span>}
      </button>
      {mo && <div className="nhom-gap-body">{children}</div>}
    </div>
  );
}
```
Trong `ManHinhQuanLy.tsx`: xóa định nghĩa `TheThuGon` local (9-39), `import { TheThuGon } from '@/components/chung/TheThuGon'`.

**CSS `.nhom-gap*`** (thêm vào globals.css, trong `@media max-width:767px` để chỉ áp mobile):
header cao ≥48px, mũi tên xoay khi `.open`, badge màu `--muted` (theo UI-07 §2.1).

## A4. `TheNhapLieu.tsx` — bọc NhomGap + gỡ width inline

Bọc các cụm sẵn có vào `NhomGap` (5 nhóm khớp UI-07 §2.1). KHÔNG đổi nội dung field bên trong:
```tsx
<NhomGap tieuDe="① Thông tin đơn hàng" moMacDinh>{/* customer…bagType */}</NhomGap>
<NhomGap tieuDe="② Kích thước & số lượng">{/* spread/cutStep/quantity/numImages */}</NhomGap>
<NhomGap tieuDe="③ Cấu trúc vật liệu" badge={`${soLop} lớp`}>{/* layers + preview + optimize */}</NhomGap>
<NhomGap tieuDe="④ Thông số in" badge={`${input.numColors} màu`}>{/* numColors… */}</NhomGap>
<NhomGap tieuDe="⑤ Phụ phí & tài chính">{/* advanced-section (822-827) + commission… */}</NhomGap>
```
Nút "Tính giá" + auto-calc badge để NGOÀI nhóm. Giữ `advanced-toggle/advanced-section` +
binding `advancedOpen`/`datMoRongNangCao` nguyên trạng bên trong nhóm ⑤.

**Gỡ width inline** — gate `laMobile`:
```tsx
const laMobile = useLaMobile();
// film-unit select (583):     style={{ width: laMobile ? undefined : 110 }}
// commission-unit select (1008): style={{ width: laMobile ? undefined : 90 }}
// box form-group (959):        style={{ flex: laMobile ? '1 1 100%' : '0 0 120px' }}
```
Nút swap icon 44px (749): GIỮ.

## A5. `globals.css` — Form mobile

```css
@media (min-width: 768px) { .input-form-card { padding-right: 56px; } }  /* chuyển từ dòng 266 */
@media (max-width: 767px) {
  .input-form-card { padding-right: 12px; position: static !important; top: auto !important; }
  .form-row, .form-row-3 { grid-template-columns: 1fr; }   /* xác nhận đã có ở 3892; thêm nếu thiếu */
}
```

## A6. `globals.css` — Gỡ xung đột bảng kết quả (block 5203-5235)

Hiện block `@media max-width:600px` ép `.data-table{min-width:560px;white-space:nowrap}` đè lên
card-reflow ở 3977-4041. **Sửa:** bỏ `.data-table` và `.moq-table` ra khỏi block này, chỉ giữ
`.table-responsive` (scroll-shadow) + `.config-table` (tạm, đến A8):
```css
@media (max-width: 600px) {
  .table-responsive { /* giữ nguyên scroll-shadow */ }
  /* XÓA: .data-table { min-width:560px; ... } và .data-table th,td{white-space:nowrap} */
  /* XÓA: .moq-table { min-width:440px; ... } */
  /* .config-table { min-width:420px; } → sẽ xóa ở A8 khi config card-reflow xong */
}
```
→ card-reflow (3977-4041) thắng sạch toàn dải ≤767px, không còn hybrid.

## A7. `ManHinhQuanLy.tsx` — Overlay bảng full-screen (component `BangToanManHinh`)

Component mới (cùng file hoặc `@/components/chung/`):
```tsx
function BangToanManHinh({ tieuDe, dangMo, dongLai, children }: {
  tieuDe: string; dangMo: boolean; dongLai: () => void; children: React.ReactNode;
}) {
  if (!dangMo) return null;
  return (
    <div className="bang-full-screen-backdrop" onClick={dongLai} role="dialog" aria-modal="true">
      <div className="bang-full-screen" onClick={e => e.stopPropagation()}>
        <div className="bang-full-screen-head">
          <span>{tieuDe}</span>
          <span className="bang-full-screen-hint">↻ Xoay ngang để xem rõ</span>
          <button onClick={dongLai} aria-label="Đóng">✕</button>
        </div>
        <div className="bang-full-screen-body">{children}</div>
      </div>
    </div>
  );
}
```
Mỗi vùng bảng (`BangGhiDe` 276, `m-t-unified-table` ~893, `moq-table` ~1042, `moq-roll-table`
~1097): thêm state `const [moBang, datMoBang] = useState(false)` + nút chỉ render khi `useLaMobile()`:
```tsx
{laMobile && <button className="btn-xem-bang-day-du" onClick={() => datMoBang(true)}>⤢ Xem bảng đầy đủ</button>}
<BangToanManHinh tieuDe="Bảng ghi đè" dangMo={moBang} dongLai={() => datMoBang(false)}>
  {/* render LẠI cùng <table> đó — ô override-input/select vẫn hoạt động */}
</BangToanManHinh>
```

**CSS** (1 block, trong `@media max-width:767px`):
```css
.bang-full-screen-backdrop { position:fixed; inset:0; z-index:80;
  background:rgba(15,23,42,.55); display:flex; align-items:center; justify-content:center;
  padding-bottom:env(safe-area-inset-bottom); }
.bang-full-screen { width:92vw; height:90dvh; background:var(--surface);
  border-radius:14px; display:flex; flex-direction:column; overflow:hidden; }
.bang-full-screen-head { display:flex; align-items:center; gap:10px; padding:12px 14px;
  border-bottom:1px solid var(--border); font-weight:600; }
.bang-full-screen-hint { margin-left:auto; font-size:.72rem; color:var(--muted); font-weight:400; }
.bang-full-screen-body { flex:1; overflow:auto; -webkit-overflow-scrolling:touch; }
/* TẮT card-reflow bên trong overlay → trả về bảng thật để xoay ngang xem */
.bang-full-screen .data-table, .bang-full-screen .moq-table { display:table; min-width:max-content; width:auto; }
.bang-full-screen .data-table thead, .bang-full-screen .moq-table thead { display:table-header-group; }
.bang-full-screen .data-table tbody, .bang-full-screen .moq-table tbody { display:table-row-group; }
.bang-full-screen .data-table tr, .bang-full-screen .moq-table tr { display:table-row; margin:0; border:0; }
.bang-full-screen .data-table td, .bang-full-screen .moq-table td { display:table-cell; }
.bang-full-screen .data-table td::before, .bang-full-screen .moq-table td::before { content:none; }
```
Prefix `.bang-full-screen` đảm bảo KHÔNG rò sang thẻ card ngoài overlay.

## A8. `TrangCauHinh.tsx` + `globals.css` — Bảng cấu hình card-reflow CÓ input

**(a) Thêm `data-label` vào mọi `<td>`** của các bảng config (bảng kết quả đã có sẵn, config
chưa). Ví dụ `materialPriceTable` (394) — label khớp `<th>`:
```tsx
<td data-label="STT" style={{textAlign:'center'…}}>{idx + 1}</td>
<td data-label="Màng" style={{fontWeight:600}}>{…}</td>
<td data-label="Tỉ trọng (g/cm³)">{…}</td>
<td data-label="Độ dày (mic)"><input className="config-inline-input" …/></td>
<td data-label="Giá (VNĐ/kg)"><input className="config-inline-input" …/></td>
<td data-label="Giá (VNĐ/m²)" …>{m.pricePerM2…} đ</td>
<td data-label=""><button…>✕</button></td>   {/* cột thao tác: label rỗng */}
```
Làm tương tự cho các bảng tại 463 / 512 / 543 / 612 / 815 / 861 / 1001 / 1082.

**(b) CSS card-reflow cho `.config-table`** (block `@media max-width:767px`, TÁCH RIÊNG với
`.data-table` vì cell chứa input sống):
```css
@media (max-width: 767px) {
  .config-table, .config-table tbody, .config-table tr, .config-table td { display:block; width:100%; }
  .config-table thead { display:none; }
  .config-table tr { margin-bottom:16px; border:1px solid var(--border); border-radius:12px;
    background:var(--surface); overflow:hidden; }
  .config-table td { display:flex; justify-content:space-between; align-items:center;
    gap:10px; padding:10px 14px; border-bottom:1px solid var(--border); text-align:right; }
  .config-table td:last-child { border-bottom:none; }
  .config-table td::before { content:attr(data-label); font-weight:600; text-transform:uppercase;
    color:var(--muted); font-size:.72rem; text-align:left; flex-shrink:0; }
  .config-table td[data-label=""]::before { content:none; }   /* cột thao tác */
  /* ĐÈ width cố định inline 70/80/100/120/130px → input fill 100% */
  .config-table td .config-inline-input { width:100% !important; flex:1; min-width:0; }
  .config-table td .config-inline-input { min-height:44px; font-size:16px; }  /* a11y UI-06 §9 */
}
```
**(c)** Xóa `.config-table { min-width:420px; }` ở block 600px (5234).

**Ca đặc biệt:**
- `printWasteTable` (543) có `<input>` trong `<th>`: gán `data-label` cho từng input-th và
  thêm rule `.config-table thead th { display:flex; … }` riêng cho bảng này (id-scoped
  `#printWasteTable thead{display:block}`), HOẶC tách hàng input thành vùng card riêng phía trên tbody.
- Section lãi vay (grid div, `gridTemplateColumns:'72px 1fr 1fr'` ở 692/698): thêm
  `@media max-width:767px { .<class-section-laivay> { grid-template-columns:1fr !important; } }`.
- Bảng 7 cột nếu card vẫn dài: thêm nút "⤢ Xem bảng đầy đủ" tái dùng `BangToanManHinh` (A7) —
  nhớ bổ sung selector `.bang-full-screen .config-table{display:table…}` tương tự `.data-table`.

## A9. `globals.css` — Dải tablet 768–1279 (block 3056-3098): bỏ ép scroll ngang

```css
@media (min-width: 768px) and (max-width: 1279px) {
  /* XÓA các min-width ép scroll: 1120px (container/config), 1080px (.main-grid),
     1144px (.mobile-calc-container .main-grid) */
  .lts-shell-content > .container,
  .lts-shell-content > .crm-root,
  .lts-shell-content > .quote-root,
  .lts-shell-content > .config-page,
  .lts-shell-content > .config-page-inner { min-width: 0; }    /* reflow thật */
  .lts-shell-content .main-grid,
  .container.mobile-calc-container .main-grid { min-width: 0; grid-template-columns: 1fr; }
  .form-row-3 { grid-template-columns: 1fr 1fr; }              /* tablet: 2 cột */
  /* bảng: dùng .table-responsive scroll cục bộ thay vì ép cả trang */
}
```
**Lưu ý:** ở dải này KHÔNG bật card-reflow (chỉ ≤767 mới reflow). Bảng rộng dùng
`.table-responsive` cuộn ngang trong vùng nội dung — chấp nhận được trên màn ≥768px.

---

# Thứ tự thực thi đề xuất

1. **A1 + A2** (hook + viewport) — nền tảng, không rủi ro, verify desktop vẫn nguyên.
2. **A3** (tách TheThuGon + NhomGap) — verify ManHinhQuanLy desktop không đổi.
3. **A6** (gỡ xung đột bảng kết quả) — verify card-reflow ≤767 sạch.
4. **A7** (overlay full-screen) — verify mở/đóng/xoay ngang + ô override.
5. **A4 + A5** (form NhomGap + width + padding) — verify form mobile + desktop.
6. **A8** (config card-reflow) — nặng nhất, verify sửa được từng bảng.
7. **A9** (tablet band) — verify 768–1279 không scroll ngang ép buộc.
8. Chạy `pnpm type-check` + `pnpm lint` + checklist Verification ở trên.
