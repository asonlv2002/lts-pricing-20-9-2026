# Plan UI/UX - Bai toan 2 cau truc, 1 con hinh va 2 con hinh

## Muc tieu

- Lam ro truong hop bao bi co 2 cau truc: mat truoc PET/PE va mat sau PET/MPET/PE.
- Cho nguoi dung thay duoc su khac nhau giua chay 1 con hinh va chay 2 con hinh doi xung.
- Ket qua phai co du 3 lop thong tin: so do kho mang, cong thuc tinh, bang chi phi vat lieu.
- Giao dien khong chi hien tong gia, ma phai giai thich vi sao ra gia do.

## Nguyen tac UX

- Hien thi truc quan truoc, bang so sau.
- Mau sac co y nghia:
  - PET: xanh cyan.
  - MPET: vang/bac.
  - PE: xam/trang.
  - Bien may: do/hatch pattern.
- Khong dung mau lam dau hieu duy nhat; moi doan phai co label text.
- Chay 2 con hinh la lua chon khuyen nghi mac dinh.
- Chay 1 con hinh phai co canh bao ky thuat.

## Luong giao dien de xuat

1. Nguoi dung chon Kieu cau truc.
   - 1 cau truc.
   - 2 cau truc.
2. Neu chon 2 cau truc, mo panel cau hinh:
   - Mat truoc: PET/PE.
   - Mat sau: PET/MPET/PE.
   - Mat truoc rong 180mm.
   - Day/hong 40mm.
   - Mat sau rong 180mm.
   - Bien may moi ben 10mm.
3. Nguoi dung chon Cach dan con hinh:
   - Chay 1 con hinh.
   - Chay 2 con hinh doi xung - Khuyen nghi.
4. Giao dien hien so do kho mang:
   - 1 con: tong kho 420mm, lop 2 = PET 190 + MPET 230.
   - 2 con: tong kho 820mm, lop 2 = PET 190 + MPET 440 + PET 190.
5. Ket qua hien chi tiet:
   - Tom tat san xuat.
   - Ban do kho vat lieu.
   - Bang chi phi theo lop.
   - Cong thuc tinh.
   - Canh bao/khuyen nghi.

## Component de xuat khi dua vao app that

- TwoStructurePanel.tsx: panel nhap cau hinh 2 cau truc.
- StructureWidthVisualizer.tsx: thanh minh hoa kho 420mm/820mm.
- LayerCostBreakdown.tsx: bang chi phi vat lieu theo tung lop.
- StructureComparisonCard.tsx: so sanh 1 con va 2 con.

## Data model de xuat

```ts
type StructureMode = 'single_structure' | 'dual_structure';
type ImageLayoutMode = 'one_image' | 'two_images_symmetric';

interface DualStructureConfig {
  enabled: boolean;
  imageLayoutMode: ImageLayoutMode;
  frontWidthMm: number;
  bottomWidthMm: number;
  backWidthMm: number;
  sideMarginMm: number;
  frontStructure: string[];
  backStructure: string[];
}

interface DualStructureBreakdown {
  mode: ImageLayoutMode;
  totalWebWidthMm: number;
  imagesAcross: number;
  divideCostBy: number;
  segments: Array<{
    layer: string;
    materialCode: string;
    materialName: string;
    widthMm: number;
    widthM: number;
    unitPrice: number;
    costPerRunningMeter: number;
    note?: string;
  }>;
  formulaLines: string[];
  warnings: string[];
  recommendation: string;
}
```

## Vi tri trong app that

- InputCard.tsx:
  - Them segmented control Kieu cau truc.
  - Them panel 2 cau truc.
  - Them visualizer nho.
- ManagerView.tsx:
  - Them section Phan tich 2 cau truc.
  - Hien bang chi phi tung lop va cong thuc.
- TechView.tsx:
  - Hien breakdown ky thuat day du.
- HistoryModule/HistoryView:
  - Luu lai thong tin: 2 cau truc, chay 1/2 con, tong kho, layer widths.
- LSXFormModal.tsx:
  - Dua thong tin dan con hinh vao lenh san xuat.

## Cong thuc mau

### Chay 1 con hinh

- Tong kho = 10 + 180 + 40 + 180 + 10 = 420mm = 0.42m.
- Lop 2 PET = 10 + 180 = 190mm = 0.19m.
- Lop 2 MPET = 40 + 180 + 10 = 230mm = 0.23m.

```txt
Chi phi / met toi =
  PET ngoai x 0.42
+ PET giua x 0.19
+ MPET giua x 0.23
+ PE trong x 0.42
```

### Chay 2 con hinh doi xung

- Tong kho = 10 + 180 + 40 + 180 + 180 + 40 + 180 + 10 = 820mm = 0.82m.
- Lop 2 PET = 190 + 190 = 380mm = 0.38m.
- Lop 2 MPET = 440mm = 0.44m.
- Chi phi quy ve 1 tui = chi phi cum / 2.

```txt
Chi phi cum / met toi =
  PET ngoai x 0.82
+ PET giua x 0.38
+ MPET giua x 0.44
+ PE trong x 0.82

Chi phi 1 con = Chi phi cum / 2
```

## Checklist trien khai

- [ ] Them field structureMode.
- [ ] Them field imageLayoutMode.
- [ ] Engine tinh layerWidths rieng cho tung vat lieu.
- [ ] Engine tra dualStructureBreakdown.
- [ ] UI co visualizer kho mang.
- [ ] Ket qua co bang chi phi tung lop.
- [ ] Co canh bao khi chay 1 con.
- [ ] Co khuyen nghi khi chay 2 con.
- [ ] History va LSX luu du thong tin.
- [ ] Test so chuan 420mm va 820mm.
