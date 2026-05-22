# Format dữ liệu tính giá để kết nối server

Tài liệu này mô tả format dữ liệu hiện app web đang dùng để team backend có thể thiết kế API và database.

## Tổng quan

App hiện có 2 schema song song:

- Schema web/legacy tiếng Anh: dùng trong UI và store, định nghĩa tại `apps/web/src/lib/types.ts`.
- Schema engine/shared tiếng Việt không dấu: dùng trong core tính toán, định nghĩa tại `packages/kieu-du-lieu/src/index.ts`.
- Adapter chuyển đổi giữa 2 schema nằm tại `apps/web/src/lib/engine.ts`.

Hàm tính chính phía web hiện là:

```ts
tinhGiaWeb(
  input: CalculateInput,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
  smallWidthPrices: SmallWidthMaterialPrice[] = []
): CalculateResult | null
```

Khuyến nghị cho backend: API public nên dùng schema web tiếng Anh, vì frontend đang dùng trực tiếp format này. Nếu backend chạy engine tính giá thì có thể convert nội bộ sang schema tiếng Việt.

## Payload tính giá

Endpoint tính giá nên nhận dạng:

```ts
type CalculateRequest = {
  input: CalculateInput;
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices?: SmallWidthMaterialPrice[];
}
```

Ví dụ skeleton:

```json
{
  "input": {
    "customer": "Công ty ABC",
    "productName": "Túi gạo 5kg",
    "productType": "tui",
    "bagType": "dayDung",
    "filmType": "",
    "filmRollLength": 6000,
    "quantity": 10000,
    "numColors": 4,
    "numImages": 1,
    "layer1Id": "PET12",
    "layer2Id": "MPET12",
    "layer2AltId": null,
    "layer2Lengths": null,
    "layer2FrontPart": "main",
    "layer2PairingMode": "bottom_to_bottom",
    "layer3Id": "PE80",
    "layer4Id": null,
    "layer5Id": null,
    "spreadWidth": 0.42,
    "cutStep": 0.58,
    "metallicSurcharge": 0,
    "coverageRatio": 1,
    "handleWeight": 0,
    "zipperWeight": 0,
    "tapeWeight": 0,
    "hasZipper": false,
    "hasTape": false,
    "hasHandle": false,
    "handleOptionKey": null,
    "paymentDays": 30,
    "profitColumn": 2,
    "commissionRate": 0,
    "commissionFixedVND": 0,
    "commissionUnit": "percent",
    "commissionInputValue": 0,
    "bagsPerBox": 0,
    "boxPrice": 0,
    "boxWeight": 0,
    "boxOptionKey": null,
    "shippingPerKm": 0,
    "shippingKm": 0,
    "cylLength": 0,
    "cylCircum": 0,
    "cylUnitPrice": 0,
    "cylType": "A",
    "cylIncluded": false,
    "targetThickness": 0,
    "autoOptimizeThickness": false,
    "micOverrides": {},
    "multiStructureLayers": {}
  },
  "materials": [],
  "constants": {},
  "profitTable": [],
  "smallWidthPrices": []
}
```

## CalculateInput

```ts
interface CalculateInput {
  customer: string;
  productName: string;

  productType: string;              // "tui" | "mang"
  bagType: string;
  filmType: string;
  filmQuantityUnit?: "m2" | "meter";
  filmInputQuantity?: number;
  filmRollLength: number;           // m/cuộn, dùng khi productType="mang"

  quantity: number;                 // túi: số cái, màng: m2
  numColors: number | null;
  numImages: number;

  layer1Id?: string | null;         // lớp in
  layer2Id?: string | null;
  layer2AltId?: string | null;
  layer2Lengths?: { mat1: number; mat2: number }; // UI nhập mét, adapter đổi sang mm
  layer2FrontPart?: "main" | "alt";
  layer2PairingMode?: "bottom_to_bottom" | "front_to_front";
  layer3Id?: string | null;
  layer4Id?: string | null;
  layer5Id?: string | null;

  spreadWidth: number;              // khổ trải, mét
  cutStep: number;                  // bước cắt, mét

  metallicSurcharge: number;
  coverageRatio: number;

  handleWeight: number;
  zipperWeight: number;
  tapeWeight: number;
  hasZipper: boolean;
  hasTape: boolean;
  hasHandle: boolean;
  handleOptionKey?: "large" | "small" | "color" | "custom" | null;

  paymentDays: number;
  profitColumn: number;             // 1 hoặc 2; app có auto-sync lại

  commissionRate: number;
  commissionFixedVND: number;
  commissionUnit: "percent" | "vnd";
  commissionInputValue: number;

  bagsPerBox: number;
  boxPrice: number;
  boxWeight?: number;
  boxOptionKey?: "large" | "medium" | "small" | "custom" | null;

  shippingPerKm: number;
  shippingKm: number;

  cylLength: number;
  cylCircum: number;
  cylUnitPrice: number;
  cylType: "A" | "B" | "custom";
  cylIncluded: boolean;             // true = phân bổ chi phí trục vào đơn giá

  targetThickness?: number;
  autoOptimizeThickness?: boolean;
  micOverrides?: Record<string, number>;          // vd { "layer1Id": 12, "layer3Id": 80 }
  multiStructureLayers?: Record<string, string[]>;
}
```

## Material

Catalog vật liệu hiện lấy từ `data/materials.json`.

```ts
interface Material {
  id: string;
  name: string;
  group?: string;
  density: number;          // kg/m3
  thickness: number;        // micron
  pricePerKg: number;       // VND/kg
  isPETorPA: boolean;
  adjustableMic?: boolean;
  rollLength: number;
  inkPricePerColor: number;
  pricePerM2?: number;      // nếu không có app tự tính = pricePerKg * thickness * density / 1000
}
```

Ví dụ:

```json
{
  "id": "PET12",
  "name": "PET 12",
  "group": "PET",
  "density": 1400,
  "thickness": 12,
  "pricePerKg": 42000,
  "isPETorPA": true,
  "adjustableMic": false,
  "rollLength": 6000,
  "inkPricePerColor": 0,
  "pricePerM2": 705.6
}
```

## AppConstants

Catalog hằng số hiện lấy từ `data/constants.json`.

```ts
interface AppConstants {
  zipperPrice: number;
  zipperWeight: number;
  tapePrice: number;
  tapeWeight: number;
  handlePrice: number;
  handleWeight: number;
  handleOptions?: HandleOption[];

  boxPriceDefault: number;
  bagsPerBoxDefault: number;
  boxOptions: BoxOption[];

  interestBase: number;       // dạng thập phân, vd 0.10 = 10%/năm
  interestSpread: number;     // dạng thập phân
  paymentDays: number;

  cylinderPricePerUnit: number;
  cylPriceA: number;
  cylPriceB: number;

  ghepCPSX: number;
  ghepWasteA: number;
  ghepWasteB: number;
  ghepWasteC: number;

  cutWasteA: number;
  cutWasteB: number;
  cutWasteC: number;

  shippingPerKmDefault: number;
  shippingKmDefault: number;

  laborCost: number;
  cutBase: number;
  cutThreshold1: number;
  cutThreshold2: number;
  cutMult1: number;
  cutMult2: number;
  cutMult3: number;

  nhuPrice: number;
  moPrice: number;

  colorSetup: Record<number, number>;

  printWasteA: number;
  printWasteB: number;
  printWasteC: number;
  printWasteD: number;
}
```

Sub-types:

```ts
interface BoxOption {
  key: "large" | "medium" | "small";
  label: string;
  price: number;
  weight?: number;
}

interface HandleOption {
  key: "large" | "small" | "color";
  label: string;
  price: number;
  weight: number;
}
```

## Profit table

Lấy từ `data/profitTable.json`.

```ts
interface ProfitRow {
  threshold: number;
  col1: number;
  col2: number;
}
```

Ví dụ:

```json
[
  { "threshold": 10000000, "col1": 0.15, "col2": 0.2 },
  { "threshold": 50000000, "col1": 0.12, "col2": 0.18 }
]
```

## SmallWidthMaterialPrice

Bảng giá vật liệu theo khổ nhỏ, optional. Nếu không truyền, app có thể dùng default tự sinh từ materials.

```ts
interface SmallWidthMaterialPrice {
  id: string;
  materialId: string;
  widthThresholdMm: number;
  thickness?: number;
  pricePerKg: number;
  pricePerM2?: number;
}
```

## Response tính giá

Server nên trả format:

```ts
type CalculateResponse = {
  ok: true;
  result: CalculateResult;
} | {
  ok: false;
  error: string;
}
```

`CalculateResult`:

```ts
interface CalculateResult {
  input: CalculateInput;

  structureText: string;
  totalThickness: number;
  totalGSM: number;
  bagArea: number;
  totalArea: number;

  printWidth: number;
  filmLength: number;

  cutWidth: number;
  cutMeters: number;
  cutWaste: number;
  cutCPSX: number;
  cutCostCPSX: number;
  cutTotalCost: number;

  printNLWidth: number;
  printMeters: number;
  printWaste: number;
  printCPSX: number;
  printCostCPSX: number;
  printCostMaterial: number;
  printTotalCost: number;

  totalProductionCost: number;
  totalLamCost: number;

  profitRate: number;
  profitAmount: number;
  revenue: number;
  costPerUnit: number;

  zipperPerUnit: number;
  zipperTotal: number;
  tapePerUnit: number;
  tapeTotal: number;
  handlePerUnit: number;
  handleTotal: number;

  boxPerUnit: number;
  boxTotal: number;
  actualBoxPrice: number;
  actualBagsPerBox: number;
  numBoxes: number;

  filmRollArea: number;
  packagingPerUnit: number;
  tareWeight: number;

  shippingPerUnit: number;
  shippingTotal: number;
  shippingRate: number;
  actualShippingPerKm: number;
  actualShippingKm: number;

  interestPerUnit: number;
  interestBase: number;
  interestSpread: number;
  paymentDays: number;

  commissionPerUnit: number;
  finalPrice: number;

  cylinderCost: number;
  cylinderCostPerUnit: number;
  cylAllocPerUnit: number;
  cylArea: number;
  cylLength: number;
  cylCircum: number;

  productionDays: number;

  layers: {
    print: {
      material: Material | null;
      width: number;
      meters: number;
      waste: number;
      cpsx: number;
      costCPSX: number;
      costMat: number;
      matPrice: number;
      total: number;
    };
    laminations: Array<{
      layerNum: number;
      material: Material | null;
      materials?: Material[];
      width: number;
      meters: number;
      waste: number;
      cpsx: number;
      costCPSX: number;
      costMat: number;
      matPrice: number;
      chiTietVatLieu?: unknown;
      total: number;
    }>;
    cut: {
      width: number;
      meters: number;
      waste: number;
      cpsx: number;
      costCPSX: number;
      total: number;
    };
  };
}
```

## History / Quote format

Nếu server lưu báo giá/lịch sử thì format hiện tại là `HistoryItem`:

```ts
interface HistoryItem {
  id: string;
  date: string;
  customer: string;
  productName: string;
  structure: string;
  quantity: number;
  finalPrice: number;
  chotGia?: number;

  quoteStatus?: "drafted" | "sent" | "pending_approval" | "approved" | "completed" | "cancelled" | "expired";
  quoteCode?: string;

  sellerId?: string;
  sellerName?: string;

  saleOverrides?: OverrideTable;
  adminOverrides?: OverrideTable;

  locked?: boolean;
  lockedBy?: string;
  lockedAt?: string;

  terms?: QuoteTerms;
  tiers?: QuoteTier[];
  validUntil?: string;

  input: CalculateInput;
}
```

Override table:

```ts
type OverrideRowKey = "print" | "lam-2" | "lam-3" | "lam-4" | "lam-5" | "cut";

type OverrideTable = Partial<Record<OverrideRowKey, Partial<{
  stage?: string;
  mat?: string;
  width?: number;
  meters?: number;
  waste?: number;
  inputVL?: number;
  cpsx?: number;
  costCPSX?: number;
  matPrice?: number;
  costMat?: number;
  detailOverrides?: Record<number, { width?: number; matPrice?: number }>;
}>>>;
```

Quote terms và tiers:

```ts
interface QuoteTerms {
  vatRate: number;
  vatCustom?: number;
  validityDays: number;
  paymentTerms: string;
  deliveryTime: string;
  notes: string;
}

interface QuoteTier {
  historyItemId: string;
  quantity: number;
  finalPrice: number;
  chotGia?: number;
}
```

## Gợi ý API backend

```txt
GET    /api/materials
PUT    /api/materials

GET    /api/constants
PUT    /api/constants

GET    /api/profit-table
PUT    /api/profit-table

GET    /api/small-width-prices
PUT    /api/small-width-prices

POST   /api/calculate

GET    /api/quotes
POST   /api/quotes
GET    /api/quotes/:id
PUT    /api/quotes/:id
DELETE /api/quotes/:id
```

## Lưu ý nghiệp vụ quan trọng

- `productType="tui"`: `quantity` là số cái.
- `productType="mang"`: `quantity` là m2 trực tiếp.
- `spreadWidth` và `cutStep` đang dùng đơn vị mét.
- `numImages` ảnh hưởng hình dạng cuộn, không làm thay đổi tổng diện tích.
- Lãi vay dùng `interestBase + interestSpread`, dạng thập phân theo năm.
- `cylIncluded=true` nghĩa là phân bổ chi phí trục vào đơn giá.
- `pricePerM2` của vật liệu nếu thiếu có thể tính bằng `pricePerKg * thickness * density / 1000`.
- Nên để frontend/backend thống nhất schema tiếng Anh ở API boundary để giảm sửa UI.
