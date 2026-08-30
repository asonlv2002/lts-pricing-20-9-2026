/**
 * chunk-error.test.ts - Kiểm tra phát hiện lỗi chunk + quyết định hiện banner
 * thay vì reload trang.
 * Chay: npx tsx src/lib/chunk-error.test.ts
 */

import {
  CHUNK_BANNER_KEY,
  laLoiChunk,
  xoaDanhDauLoiChunk,
  xuLyLoiChunk,
  type LuuTruNho,
} from "./chunk-error";

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

console.log("\n== Chunk error: nhan dien ==");

assert("nhan dien ChunkLoadError", laLoiChunk(new Error("ChunkLoadError: Loading chunk 42 failed")) === true);
assert(
  "nhan dien Loading chunk failed",
  laLoiChunk(new Error("Loading chunk 12 failed.\n(error: https://x/_next/static/chunks/12.abc.js)")) === true,
);
assert(
  "nhan dien Failed to fetch dynamically imported module",
  laLoiChunk(new Error("Failed to fetch dynamically imported module: https://x/_next/static/chunks/7.js")) === true,
);
assert("bo qua loi thuong", laLoiChunk(new Error("SyntaxError: unexpected token")) === false);
assert("bo qua loi khong phai Error", laLoiChunk("khong phai loi") === false);
assert("bo qua null/undefined", laLoiChunk(null) === false);
assert("bo qua loi API 500", laLoiChunk(new Error("Request failed with status code 500")) === false);

console.log("\n== Chunk error: quyet dinh banner (khong reload) ==");

{
  const storage = taoLuuTruNho();
  assert("lan dau loi chunk => hien banner", xuLyLoiChunk(new Error("ChunkLoadError: x"), storage) === "hien-banner");
  assert("danh dau da duoc ghi", storage.getItem(CHUNK_BANNER_KEY) === "1");
  assert("lan sau loi chunk => bo qua (da ban)", xuLyLoiChunk(new Error("ChunkLoadError: y"), storage) === "bo-qua");
}

{
  const storage = taoLuuTruNho();
  assert("loi thuong => bo qua", xuLyLoiChunk(new Error("boom"), storage) === "bo-qua");
  assert("loi thuong khong ghi danh dau", storage.getItem(CHUNK_BANNER_KEY) === null);
}

{
  const storage = taoLuuTruNho({ [CHUNK_BANNER_KEY]: "1" });
  xoaDanhDauLoiChunk(storage);
  assert("xoaDanhDauLoiChunk xoa duoc danh dau", storage.getItem(CHUNK_BANNER_KEY) === null);
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);