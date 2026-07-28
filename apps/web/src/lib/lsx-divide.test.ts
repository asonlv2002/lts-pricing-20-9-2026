import type { LSXManualFields, ProductionOrder } from './types';
import { resolveLsxDivideSpec } from './lsx-divide';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

function order(
  divideWidths?: number[],
  partialManual: Partial<LSXManualFields> = {},
  divideWidthMm: number | undefined = 200,
): ProductionOrder {
  return {
    id: 'lsx-divide-test',
    quoteId: 'quote-1',
    createdAt: '2026-07-28T00:00:00.000Z',
    status: 'created',
    manual: {
      divideWidth: 200,
      divideElements: 4,
      divideWidths,
      ...partialManual,
    } as LSXManualFields,
    snapshot: {
      customer: 'KH',
      productName: 'SP',
      productType: 'tui',
      structure: 'PET/LLDPE',
      quantity: 1000,
      spreadWidth: 0.8,
      cutStep: 0.2,
      numColors: 8,
      bagType: '3bien',
      hasZipper: false,
      hasDivide: true,
      divideWidthMm,
      originalWidthMm: 820,
      numImages: 8,
      cylLength: 0.8,
      cylCircum: 0.2,
      filmRollLength: 0,
      layer1Name: 'PET12',
      layer2Name: 'LLDPE80',
      layer3Name: '',
      layer4Name: '',
      layer5Name: '',
      chotGia: 0,
      totalArea: 0,
    },
  };
}

console.log('resolveLsxDivideSpec');

{
  const spec = resolveLsxDivideSpec(order());
  assert('chia đều dùng 4 phần tử', spec.elementCount === 4);
  assert('chia đều sinh 4 khổ 200mm', spec.widths.join(',') === '200,200,200,200');
  assert('chia đều có tổng 800/820mm', spec.totalWidthMm === 800 && spec.filmWidthMm === 820);
  assert('chia đều hợp lệ', spec.valid === true);
  assert('chia đều không phải tuỳ chỉnh', spec.custom === false);
}

{
  const spec = resolveLsxDivideSpec(order([195, 205, 200, 200]));
  assert('tuỳ chỉnh giữ nguyên từng phần tử', spec.widths.join(',') === '195,205,200,200');
  assert('tuỳ chỉnh có tổng 800mm', spec.totalWidthMm === 800);
  assert('tuỳ chỉnh hợp lệ', spec.valid === true && spec.custom === true);
}

{
  const spec = resolveLsxDivideSpec(order([220, 220, 220, 220]));
  assert('tổng 880 vượt khổ 820 bị từ chối', spec.valid === false);
  assert('lỗi nêu đúng giới hạn khổ màng', spec.error.includes('820mm'));
}

{
  const spec = resolveLsxDivideSpec(order([200, 200, 200]));
  assert('thiếu phần tử bị từ chối', spec.valid === false);
  assert('lỗi nêu đúng số phần tử', spec.error.includes('4 phần tử'));
}

{
  const spec = resolveLsxDivideSpec(order(undefined, { divideWidth: 0, divideElements: 0 }, 0));
  assert('LSX mới chưa có chi tiết chia bị từ chối', spec.valid === false);
  assert('LSX mới báo cần nhập số phần tử', spec.error === 'Vui lòng nhập số phần tử chia.');
}

{
  const spec = resolveLsxDivideSpec(order(undefined, { divideWidth: 0 }, 0));
  assert('thiếu khổ chia bị từ chối', spec.valid === false);
  assert('thiếu khổ chia có thông báo rõ', spec.error === 'Vui lòng nhập khổ chia.');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
