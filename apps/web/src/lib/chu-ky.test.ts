/**
 * chu-ky.test.ts - Kiem tra helper chu ky LSX.
 * Chay: pnpm --filter web exec tsx src/lib/chu-ky.test.ts
 */

import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { blobToDataUrl, layChuKyDataUrl, themChuKyVaoManual, blobSangPngDataUrl, layChuKyReviewerDataUrl } from './chu-ky';
import type { LSXManualFields } from './types';

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

console.log('\n== chu-ky helpers ==');

class FakeFileReader {
  result: string | ArrayBuffer | null = null;
  error: Error | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(blob: Blob) {
    (blob as any).arrayBuffer().then((buf: ArrayBuffer) => {
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (const b of bytes) bin += String.fromCharCode(b);
      this.result = `data:${blob.type};base64,${btoa(bin)}`;
      this.onload?.();
    });
  }
}

/** Mock Image + canvas để blobSangPngDataUrl chạy được trong Node. */
function mockImageVaCanvas() {
  (globalThis as any).Image = class {
    naturalWidth = 512;
    naturalHeight = 512;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = '';
    get src() { return this._src; }
    set src(v: string) {
      this._src = v;
      setTimeout(() => this.onload?.(), 0);
    }
  };
  (globalThis as any).URL.createObjectURL = () => 'blob:fake-img';
  (globalThis as any).URL.revokeObjectURL = () => {};
  const ctx = {
    fillStyle: '',
    fillRect: () => {},
    drawImage: () => {},
    canvas: null as any,
  };
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0, height: 0,
          getContext: () => ctx,
          toDataURL: () => 'data:image/png;base64,UE5HUElYRUw=', // "PNGPIXEL"
        };
      }
      return {};
    },
  };
}

async function main() {
  const originalFetch = globalThis.fetch;
  const originalFileReader = (globalThis as any).FileReader;
  const originalImage = (globalThis as any).Image;
  const originalDocument = (globalThis as any).document;
  const originalCreateObjectURL = (globalThis as any).URL?.createObjectURL;
  const originalRevokeObjectURL = (globalThis as any).URL?.revokeObjectURL;
  (globalThis as any).FileReader = FakeFileReader;
  mockImageVaCanvas();

  try {
    // blobToDataUrl chuyen blob -> data URL
    const blob = new Blob(['abc'], { type: 'image/png' });
    const dataUrl = await blobToDataUrl(blob);
    assert('blobToDataUrl returns data URL', dataUrl.startsWith('data:image/png;base64,'), dataUrl);
    assert('blobToDataUrl encodes content', dataUrl.endsWith('YWJj'), dataUrl);

    // themChuKyVaoManual giu chu ky co san (khong fetch)
    const signed = await themChuKyVaoManual({ preparedBy: 'A', preparedBySignature: 'data:image/png;base64,KEEPME' } as LSXManualFields);
    assert('themChuKyVaoManual keeps existing signature', signed.preparedBySignature === 'data:image/png;base64,KEEPME');

    // layChuKyDataUrl tra null khi user chua co chu ky
    dungCuaHangTinhGia.setState({
      nguoiDungHienTai: {
        id: 'u1', account: 'a', fullName: 'A', policies: [],
        avatarUrl: null, avatarBlobUrl: null,
        signatureUrl: null, signatureBlobUrl: null, chuKyDataUrl: null,
      },
    });
    const khongCo = await layChuKyDataUrl();
    assert('layChuKyDataUrl returns null when no signature', khongCo === null);

    // blobSangPngDataUrl: blob (mọi loại) → PNG data URL
    const blobWebp = new Blob(['webp-data'], { type: 'image/webp' });
    const pngUrl = await blobSangPngDataUrl(blobWebp);
    assert('blobSangPngDataUrl converts webp blob to png data url', pngUrl !== null && pngUrl.startsWith('data:image/png;base64,'), pngUrl ?? 'null');
    assert('blobSangPngDataUrl does not return webp', !(pngUrl ?? '').includes('webp'), pngUrl ?? 'null');

    // layChuKyDataUrl doc tu signatureBlobUrl (fetch → blob → PNG qua canvas)
    globalThis.fetch = async () =>
      new Response(new Blob(['xyz'], { type: 'image/webp' }), { status: 200 });
    dungCuaHangTinhGia.setState({
      nguoiDungHienTai: {
        id: 'u1', account: 'a', fullName: 'A', policies: [],
        avatarUrl: null, avatarBlobUrl: null,
        signatureUrl: '/sig', signatureBlobUrl: 'blob:fake', chuKyDataUrl: null,
      },
    });
    const coChuKy = await layChuKyDataUrl();
    assert('layChuKyDataUrl reads blob and converts to png', coChuKy !== null && coChuKy.startsWith('data:image/png;base64,'), coChuKy ?? 'null');

    // themChuKyVaoManual gan chu ky khi chua co
    dungCuaHangTinhGia.setState({
      nguoiDungHienTai: {
        id: 'u1', account: 'a', fullName: 'A', policies: [],
        avatarUrl: null, avatarBlobUrl: null,
        signatureUrl: '/sig', signatureBlobUrl: 'blob:fake', chuKyDataUrl: null,
      },
    });
    const ganMoi = await themChuKyVaoManual({ preparedBy: 'B' } as LSXManualFields);
    assert('themChuKyVaoManual attaches signature when missing', !!ganMoi.preparedBySignature, ganMoi.preparedBySignature ?? 'null');

    // layChuKyReviewerDataUrl: empty/null URL → null (khong fetch)
    assert('layChuKyReviewerDataUrl null url returns null', (await layChuKyReviewerDataUrl(null)) === null);
    assert('layChuKyReviewerDataUrl empty url returns null', (await layChuKyReviewerDataUrl('')) === null);
    assert('layChuKyReviewerDataUrl undefined url returns null', (await layChuKyReviewerDataUrl(undefined)) === null);

    // layChuKyReviewerDataUrl: fetch ok → convert blob → PNG data url
    globalThis.fetch = async () =>
      new Response(new Blob(['webp-data'], { type: 'image/webp' }), { status: 200 });
    const fromUrl = await layChuKyReviewerDataUrl('/auth/signatures/reviewer.webp');
    assert('layChuKyReviewerDataUrl fetches and converts to png', fromUrl !== null && fromUrl.startsWith('data:image/png;base64,'), fromUrl ?? 'null');

    // layChuKyReviewerDataUrl: fetch fail (404) → null
    globalThis.fetch = async () => new Response(null, { status: 404 });
    const from404 = await layChuKyReviewerDataUrl('/auth/signatures/missing.webp');
    assert('layChuKyReviewerDataUrl returns null on 404', from404 === null);

    // layChuKyReviewerDataUrl: fetch throw → null
    globalThis.fetch = async () => { throw new Error('network down'); };
    const fromThrow = await layChuKyReviewerDataUrl('/auth/signatures/x.webp');
    assert('layChuKyReviewerDataUrl returns null on fetch throw', fromThrow === null);

    // layChuKyReviewerDataUrl: gọi qua goiRaw → relative path được prepend SERVICE_LTS_DIRECT_URL
    let capturedUrl = '';
    globalThis.fetch = async (input) => {
      capturedUrl = String(input);
      return new Response(new Blob(['ok'], { type: 'image/webp' }), { status: 200 });
    };
    const realFetched = await layChuKyReviewerDataUrl('/auth/signatures/abc.webp');
    assert(
      'layChuKyReviewerDataUrl prepends SERVICE_LTS_DIRECT_URL to relative path',
      capturedUrl.includes('://') && capturedUrl.endsWith('/auth/signatures/abc.webp'),
      capturedUrl,
    );
    assert('layChuKyReviewerDataUrl still returns png when goiRaw works', realFetched !== null && realFetched.startsWith('data:image/png;base64,'), realFetched ?? 'null');

    // layChuKyReviewerDataUrl: absolute URL từ origin khác → chỉ lấy pathname trước khi nối SERVICE_LTS_DIRECT_URL
    capturedUrl = '';
    globalThis.fetch = async (input) => {
      capturedUrl = String(input);
      return new Response(new Blob(['ok'], { type: 'image/webp' }), { status: 200 });
    };
    await layChuKyReviewerDataUrl('http://otherhost:9999/auth/signatures/xyz.webp');
    assert(
      'layChuKyReviewerDataUrl strips foreign origin and routes via SERVICE_LTS_DIRECT_URL',
      !capturedUrl.includes('otherhost:9999') && capturedUrl.endsWith('/auth/signatures/xyz.webp'),
      capturedUrl,
    );
  } finally {
    globalThis.fetch = originalFetch;
    (globalThis as any).FileReader = originalFileReader;
    (globalThis as any).Image = originalImage;
    (globalThis as any).document = originalDocument;
    if (originalCreateObjectURL !== undefined) (globalThis as any).URL.createObjectURL = originalCreateObjectURL;
    if (originalRevokeObjectURL !== undefined) (globalThis as any).URL.revokeObjectURL = originalRevokeObjectURL;
  }
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
