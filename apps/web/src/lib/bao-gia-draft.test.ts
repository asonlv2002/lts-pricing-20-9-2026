/**
 * bao-gia-draft.test.ts - Kiểm tra lưu/đọc/xóa nháp bảng báo giá (autosave).
 * Chay: npx tsx src/lib/bao-gia-draft.test.ts
 */

import {
  coNhapBaoGia,
  docNhapBaoGia,
  LUU_TRU_BAO_GIA_KEY,
  luuNhapBaoGia,
  xoaNhapBaoGia,
  type LuuTruNho,
} from "./bao-gia-draft";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? " - " + detail : ""}`);
    failed++;
  }
}

function taoLuuTruNho(init?: Record<string, string>): LuuTruNho {
  const data = new Map<string, string>(Object.entries(init ?? {}));
  return {
    getItem: (key) => (data.has(key) ? data.get(key)! : null),
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

console.log("\n== Bao gia draft: luu / doc / xoa ==");

const payload = {
  customer: { id: "kh1", customerCode: "KH001", companyName: "Cty Minh Anh" },
  products: [
    {
      historyItem: { id: "h1", productName: "Túi nhựa" },
      tiers: [{ quantity: 5000, finalPrice: 1200, baoGia: 1500 }],
      bagSpec: { bagType: "thuong" },
    },
  ],
  terms: { vatRate: 8, validityDays: 30, paymentTerms: "Thanh toán 30 ngày" },
};

{
  const storage = taoLuuTruNho();
  const now = Date.now();
  assert("luuNhapBaoGia thanh cong", luuNhapBaoGia(storage, payload, now) === true);
  assert("storage co key", storage.getItem(LUU_TRU_BAO_GIA_KEY) !== null);

  const doc = docNhapBaoGia<typeof payload>(storage, now);
  assert("docNhapBaoGia tra ve dung payload", JSON.stringify(doc?.state) === JSON.stringify(payload));
  assert("docNhapBaoGia luu savedAt", doc?.savedAt === now);
}

{
  const storage = taoLuuTruNho();
  assert("docNhapBaoGia null khi chua co", docNhapBaoGia(storage) === null);
  assert("coNhapBaoGia false khi chua co", coNhapBaoGia(storage) === false);

  luuNhapBaoGia(storage, payload);
  assert("coNhapBaoGia true sau khi luu", coNhapBaoGia(storage) === true);

  xoaNhapBaoGia(storage);
  assert("xoaNhapBaoGia xoa data", docNhapBaoGia(storage) === null);
  assert("coNhapBaoGia false sau khi xoa", coNhapBaoGia(storage) === false);
}

{
  const storage = taoLuuTruNho({ [LUU_TRU_BAO_GIA_KEY]: "khong-phai-json" });
  assert("docNhapBaoGia null khi JSON loi", docNhapBaoGia(storage) === null);

  const storage2 = taoLuuTruNho({ [LUU_TRU_BAO_GIA_KEY]: JSON.stringify({ foo: 1 }) });
  assert("docNhapBaoGia null khi thieu savedAt", docNhapBaoGia(storage2) === null);
}

{
  const storage: LuuTruNho = {
    getItem: () => {
      throw new Error("loi do");
    },
    setItem: () => {
      throw new Error("loi ghi");
    },
    removeItem: () => {
      throw new Error("loi xoa");
    },
  };
  assert("luuNhapBaoGia tra false khi storage loi", luuNhapBaoGia(storage, payload) === false);
  assert("docNhapBaoGia tra null khi storage loi", docNhapBaoGia(storage) === null);
}

{
  const storage = taoLuuTruNho();
  const now = Date.now();
  luuNhapBaoGia(storage, payload, now - 8 * 24 * 60 * 60 * 1000);
  assert("docNhapBaoGia null khi nhap qua 7 ngay", docNhapBaoGia(storage, now) === null);
  assert("coNhapBaoGia false khi nhap qua 7 ngay", coNhapBaoGia(storage, now) === false);
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);