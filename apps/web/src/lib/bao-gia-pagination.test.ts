import {
  estimateQuoteGroupHeight,
  paginateQuoteGroups,
  type QuotePageGroup,
} from './bao-gia-pagination';

let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`OK ${name}`);
    return;
  }
  failed += 1;
  console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const group = (id: string, height: number): QuotePageGroup => ({ id, height });

assert(
  'moves a whole next group to a new page when it would overflow',
  paginateQuoteGroups([group('7', 220), group('8', 80)], 260),
  [[group('7', 220)], [group('8', 80)]],
);

assert(
  'keeps groups that fit together on one page',
  paginateQuoteGroups([group('1', 120), group('2', 100)], 260),
  [[group('1', 120), group('2', 100)]],
);

assert(
  'places an oversized group alone instead of producing an empty page',
  paginateQuoteGroups([group('long', 300), group('2', 80)], 260),
  [[group('long', 300)], [group('2', 80)]],
);

assert(
  'estimates a multi-line product group taller than a short product group',
  estimateQuoteGroupHeight({
    productName: 'TÚI ĐÁY ĐỨNG 480x120 2 CẤU TRÚC ZIPPER',
    description: 'Chất liệu: PET/PET/LLDPE.\nĐộ dày: 149 mic (± 5 mic).\nQuy cách: R:120mm x D:180mm. Đáy: 80mm.\nHàn biên: 10mm.\nIn 7 màu.',
    tierCount: 1,
    hasCylinder: false,
  }) > estimateQuoteGroupHeight({
    productName: 'TRỤC IN',
    description: '',
    tierCount: 1,
    hasCylinder: false,
  }),
  true,
);

if (failed > 0) process.exit(1);
