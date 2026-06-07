# Mobile UI Style Reference

## Muc tieu

Giao dien mobile cua LTS Pricing phat trien theo phong cach dashboard/hub trong anh tham chieu: hien dai, ro nghiep vu, cam giac iOS nhe, dung card lon de dieu huong nhanh vao cac luong chinh.

Phong cach nay uu tien:

- De cham tren dien thoai.
- It nhieu thi giac.
- Header manh de dinh danh module.
- Card trang noi tren nen xam xanh nhat.
- Icon mau pastel theo tung nghiep vu.
- Bottom tab ro trang thai active.

## Bo cuc man hub chuan

Man hub la man dieu huong con cho mot nhom nghiep vu, vi du `Tinh gia & Bao gia`.

Cau truc:

```text
Screen
|- Status area
|- Header
|  |- Menu button
|  |- Center title
|  `- Primary action button
|- Content
|  |- Action card
|  |- Action card
|  |- Action card
|  `- Action card
`- Bottom tab bar
```

Wireframe:

```text
┌─────────────────────────────────────────┐
│ 9:41                            signal  │
│                                         │
│  ☰          Tính giá & Báo giá    + Mới │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ┌─────┐  Tạo bảng tính giá     ›  │  │
│  │ │icon │  Tạo mới bảng tính giá    │  │
│  │ └─────┘  nhanh chóng.             │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ┌─────┐  Tạo bảng báo giá      ›  │  │
│  │ │icon │  Tạo bảng báo giá gửi     │  │
│  │ └─────┘  khách hàng.              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ┌─────┐  Lịch sử tính giá      ›  │  │
│  │ │icon │  Xem lại các bảng tính    │  │
│  │ └─────┘  và báo giá đã tạo.       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ┌─────┐  Nhật ký thao tác      ›  │  │
│  │ │icon │  Theo dõi các thao tác    │  │
│  │ └─────┘  trong hệ thống.          │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  Tổng quan  Tính giá  Khách hàng  ...   │
└─────────────────────────────────────────┘
```

## Header

Header dung nen navy dam, tao cam giac chac chan va chuyen nghiep.

Thong so khuyen nghi:

- Nen: `#07172B` hoac `#08192F`.
- Text: trang hoac trang gan `#FFFFFF`.
- Chieu cao header gom status area: khoang `132-148px`.
- Padding ngang: `24px`.
- Tieu de can giua.
- Menu button ben trai.
- Primary action ben phai.

Header layout:

```text
☰          Tính giá & Báo giá       + Mới
```

Nut `+ Moi`:

- Dang pill.
- Gradient tim/xanh.
- Text trang.
- Bo goc lon.
- Cao khoang `44px`.
- Padding ngang `16-18px`.

Mau goi y:

```text
Gradient start: #5B4DFF
Gradient end:   #7C3AED
Text:           #FFFFFF
```

## Nen noi dung

Body dung nen xam xanh rat nhat de card trang noi len nhung khong gat.

Mau goi y:

```text
Background: #F4F7FB
Alternative: #F6F8FC
```

Khoang cach:

- Padding ngang: `24px`.
- Padding top sau header: `20-24px`.
- Gap giua card: `16-18px`.

## Action card

Action card la thanh phan dieu huong chinh trong hub.

Cau truc:

```text
┌───────────────────────────────────────┐
│ ┌─────┐  Title                     ›  │
│ │icon │  Subtitle                     │
│ └─────┘                               │
└───────────────────────────────────────┘
```

Thong so:

- Nen: `#FFFFFF`.
- Bo goc: `18-22px`.
- Padding: `20px`.
- Chieu cao: khoang `104-116px`.
- Shadow nhe kieu iOS.
- Border rat nhe hoac khong can border.
- Toan bo card la touch target.

Shadow goi y:

```text
shadowColor: #0F172A
shadowOpacity: 0.06
shadowRadius: 14
shadowOffset: 0 6
elevation: 2
```

Text:

```text
Title:
- Font size: 17-18
- Weight: 700
- Color: #111827

Subtitle:
- Font size: 13-14
- Weight: 400
- Color: #6B7280
- Line height: 19-20
```

Chevron:

```text
Icon: chevron-right
Color: #4B5563
Size: 24
```

## Icon box

Moi card co icon box pastel.

Thong so:

- Kich thuoc: `56x56px`.
- Bo goc: `14-16px`.
- Nen pastel rat nhat.
- Icon line-style, mau dam hon nen.
- Icon size: `28-32px`.

Bang mau theo nghiep vu:

```text
Tao bang tinh gia
- Icon color: #5B4DFF
- Box background: #F0EEFF

Tao bang bao gia
- Icon color: #0EA5E9
- Box background: #EAF6FF

Lich su tinh gia & bao gia
- Icon color: #10B981
- Box background: #EAFBF4

Nhat ky thao tac
- Icon color: #F97316
- Box background: #FFF3E8
```

## Bottom tab

Bottom tab la thanh dieu huong cap cao cua app.

Tabs chuan theo style anh:

```text
Tong quan | Tinh gia | Khach hang | Don hang | Them
```

Thong so:

- Nen: `#FFFFFF`.
- Bo goc tren: `20-24px`.
- Shadow phia tren nhe.
- Chieu cao: `72px + safe-area-bottom`.
- Active color: `#5B4DFF`.
- Inactive color: `#374151` hoac `#6B7280`.

Active tab:

- Icon mau tim/xanh.
- Label cung mau.
- Co the tang weight label len `600`.

Inactive tab:

- Icon outline.
- Label nho, weight `400-500`.

## Khoang cach va kich thuoc

Phone target: `360-430px`.

Token tham chieu:

```text
Screen horizontal padding: 24px
Card gap:                  16px
Card radius:               20px
Card padding:              20px
Icon box size:             56px
Icon box radius:           16px
Header height:             132-148px
Bottom tab height:         72px + safe area
Minimum touch target:      44px
```

## Ngon ngu thiet ke

Phong cach tong the:

- Sach, sang, hien dai.
- Co do sau nhe, khong dung border day.
- Uu tien card lon thay vi bang hoac menu day dac.
- Tong mau business: navy, trang, xam xanh.
- Accent dung tim/xanh de tao cam giac app hien dai.
- Icon pastel giup phan biet nghiep vu nhanh.

Khong nen dung:

- Card qua vuong.
- Shadow qua dam.
- Qua nhieu mau saturated tren cung mot man.
- Text nho duoi `13px`.
- Tab qua nhieu muc vuot 5 muc.
- Bang ngang tren mobile neu co the thay bang card/list.

## Ung dung cho LTS Pricing

Man `Tinh gia & Bao gia` nen la hub gom 4 nghiep vu:

```text
1. Tao bang tinh gia
   Di toi form tao bang tinh gia.

2. Tao bang bao gia
   Di toi wizard tao bao gia.

3. Lich su tinh gia & bao gia
   Di toi danh sach lich su da luu.

4. Nhat ky thao tac
   Di toi audit/activity log.
```

Bottom tab cap app nen uu tien:

```text
1. Tong quan
2. Tinh gia
3. Khach hang
4. Don hang
5. Them
```

Nhung man phu nhu `Cau hinh`, `Bao gia`, `Lich su`, `Nhat ky`, `Cai dat` co the di qua hub hoac tab `Them`, tranh lam bottom tab qua dong.

## Component goi y

Nhung component nen tach ra de dung lai:

```text
MobileShell
MobileHeader
HubActionCard
PastelIconBox
MobileBottomTab
```

Trong do `HubActionCard` la component quan trong nhat de tai su dung cho nhieu module khac.

## Nguyen tac khi phat trien man moi

1. Moi module lon nen co mot man hub neu co tu 3 nghiep vu con tro len.
2. Man form dai nen di sau hub, khong dat truc tiep o tab cap cao neu module co nhieu luong.
3. Text luon tieng Viet.
4. Moi card phai co title hanh dong ro rang, subtitle giai thich ngan.
5. Moi man chi co mot primary action ro nhat.
6. Nen body luon nhat, card luon trang.
7. Dung icon line-style nhat quan.
8. Tranh nhoi chuc nang vao bottom tab.
