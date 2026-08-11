/**
 * chu-ky-ve.test.ts - Kiem tra helper ve chu ky (scale, undo, export).
 * Chay: pnpm --filter web exec tsx src/lib/chu-ky-ve.test.ts
 */

import {
  CHU_KY_CANVAS_SIZE,
  doiTọaĐộ,
  veLaiCanvas,
  canvasSangFile,
  type NetVe,
} from './chu-ky-ve';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

class FakeCanvas {
  toBlob = (cb: (blob: Blob | null) => void) => {
    cb(new Blob(['png'], { type: 'image/png' }));
  };
}

async function main() {
  // Scale tọa độ: rect CSS 256x256 (hiển thị nhỏ hơn canvas 512)
  const rect = { left: 10, top: 20, width: 256, height: 256 };
  const d = doiTọaĐộ(10 + 128, 20 + 128, rect);
  assert('doiTọaĐộ scales center correctly', d.x === 256 && d.y === 256, JSON.stringify(d));

  const d2 = doiTọaĐộ(10, 20, rect);
  assert('doiTọaĐộ maps top-left to 0,0', d2.x === 0 && d2.y === 0, JSON.stringify(d2));

  const d3 = doiTọaĐộ(10 + 256, 20 + 256, rect);
  assert('doiTọaĐộ maps bottom-right to 512,512', d3.x === 512 && d3.y === 512, JSON.stringify(d3));

  // Ngoài biên → clamp
  const d4 = doiTọaĐộ(-50, -50, rect);
  assert('doiTọaĐộ clamps negative', d4.x === 0 && d4.y === 0, JSON.stringify(d4));
  const d5 = doiTọaĐộ(10 + 300, 20 + 300, rect);
  assert('doiTọaĐộ clamps overflow', d5.x === 512 && d5.y === 512, JSON.stringify(d5));

  // veLaiCanvas vẽ nhiều nét không lỗi
  const fakeCtx = {
    clearRect: () => {}, fillRect: () => {}, fillStyle: '', strokeStyle: '',
    lineWidth: 0, lineCap: '', lineJoin: '', beginPath: () => {}, moveTo: () => {},
    lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {},
  };
  const canvas = {
    getContext: () => fakeCtx,
    width: CHU_KY_CANVAS_SIZE,
    height: CHU_KY_CANVAS_SIZE,
  };
  const strokes: NetVe[] = [
    { points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] },
    { points: [{ x: 100, y: 100 }] },
  ];
  veLaiCanvas(canvas as unknown as HTMLCanvasElement, strokes);
  assert('veLaiCanvas draws strokes without throwing', true);
  veLaiCanvas(canvas as unknown as HTMLCanvasElement, []);
  assert('veLaiCanvas draws empty strokes', true);
  veLaiCanvas(canvas as unknown as HTMLCanvasElement, [null as unknown as NetVe, { points: [{ x: 1, y: 1 }] }]);
  assert('veLaiCanvas skips null strokes', true);

  // canvasSangFile export File PNG
  const file = await canvasSangFile(new FakeCanvas() as unknown as HTMLCanvasElement);
  assert('canvasSangFile returns File', file instanceof File, String(!!file));
  assert('canvasSangFile file type png', file?.type === 'image/png', file?.type ?? 'null');
  assert('canvasSangFile file name', file?.name === 'chu-ky-ve.png', file?.name ?? 'null');
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
