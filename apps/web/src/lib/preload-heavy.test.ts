/**
 * preload-heavy.test.ts - Kiểm tra preload các thư viện nặng (pdf/docx) ngay
 * khi vào app để tránh import đúng lúc user bấm (giảm nguy cơ chunk load error).
 * Chay: npx tsx src/lib/preload-heavy.test.ts
 */

import { taiTruocThuVienNang } from "./preload-heavy";

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

console.log("\n== Preload heavy: tai truoc, bo qua loi ==");

(async () => {
  {
    const dem = { count: 0 };
    const loaders = [
      async () => { dem.count++; },
      async () => { dem.count++; },
      async () => { dem.count++; },
    ];
    await taiTruocThuVienNang(loaders);
    assert("goi toan bo loaders", dem.count === 3, `count=${dem.count}`);
  }

  {
    const dem = { count: 0 };
    const loaders = [
      async () => { dem.count++; throw new Error("loi"); },
      async () => { dem.count++; },
      async () => { dem.count++; throw new Error("loi"); },
    ];
    await taiTruocThuVienNang(loaders);
    assert("van goi toan bo loaders du co loi", dem.count === 3, `count=${dem.count}`);
  }

  {
    const dem = { count: 0 };
    await taiTruocThuVienNang([]);
    assert("mang rong khong lam gi", dem.count === 0);
  }

  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
})();