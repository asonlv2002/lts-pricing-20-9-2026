/**
 * Nguồn CHUNG các dòng thông số MÁY LÀM TÚI cho cả PDF / DOCX / preview HTML.
 * Trước đây mỗi nơi có 1 switch riêng nên dễ lệch nhau (vd: dòng zipper).
 * Lưới hiển thị 2 ô mỗi hàng: 'pair' = trái | phải, 'full' = gộp cả hàng.
 */

import type { LSXManualFields } from './types';
import type { LsxDocxTemplateKey } from './lsxExport';
import { zipperDistanceFromOrder } from './lsx-bag-classification';
import { formatLsxFoldBottom } from './lsx-quy-cach';

export interface LsxBagField {
  label: string;
  value: string;
}

export type LsxBagFieldRow =
  | { kind: 'pair'; left: LsxBagField; right: LsxBagField }
  | { kind: 'full'; field: LsxBagField };

function v(val: string | number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined || val === '' || val === 0) return '';
  return String(val) + suffix;
}

/** Có hiện nhóm thông số zipper hay không (cờ từ báo giá hoặc đã nhập tay). */
export function hasLsxZipperDetails(
  manual: Pick<LSXManualFields, 'tamZipperCachMieng' | 'tearNotch' | 'loTreoInfo' | 'useDualCutter'>,
  hasZipper: boolean,
): boolean {
  return Boolean(
    hasZipper ||
      manual.tamZipperCachMieng ||
      manual.tearNotch ||
      manual.loTreoInfo ||
      manual.useDualCutter,
  );
}

/**
 * Chia khổ khối MÁY LÀM TÚI: nửa ghi chú | nửa lưới (2 ô đều).
 * Dùng cho DOCX (đơn vị DXA) để đường kẻ dọc nằm đúng trục giữa.
 */
export function splitLsxBagBlockWidths(totalWidth: number): {
  note: number;
  cellLeft: number;
  cellRight: number;
} {
  const note = Math.round(totalWidth / 2);
  const rest = totalWidth - note;
  const cellLeft = Math.round(rest / 2);
  return { note, cellLeft, cellRight: rest - cellLeft };
}

export function buildLsxBagFieldRows(
  templateKey: LsxDocxTemplateKey,
  m: LSXManualFields,
  hasZipper: boolean,
  snapshotZipperDistanceMm?: number,
): LsxBagFieldRow[] {
  const rows: LsxBagFieldRow[] = [];
  const pair = (
    leftLabel: string, leftValue: string,
    rightLabel: string, rightValue: string,
  ) => rows.push({
    kind: 'pair',
    left: { label: leftLabel, value: leftValue },
    right: { label: rightLabel, value: rightValue },
  });
  const full = (label: string, value: string) => rows.push({ kind: 'full', field: { label, value } });
  const zipper = hasLsxZipperDetails(m, hasZipper);
  const tamZipper = zipperDistanceFromOrder(
    {
      manual: m,
      snapshot: { zipperDistanceMm: snapshotZipperDistanceMm },
    },
    hasZipper,
    templateKey,
  );
  const tamZipperStr = tamZipper > 0 ? `${tamZipper}mm` : '—';
  const tearNotchStr = v(m.tearNotch);
  const hasTearNotch = !!tearNotchStr;
  const showZipperCell = tamZipper > 0 || hasZipper;
  const showTearNotchCell = hasTearNotch;

  switch (templateKey) {
    case 'tui-3-bien':
      pair('Hàn biên: ', v(m.sealEdge) || v(m.hanBien, 'mm') || '7mm', 'Hàn đầu: ', v(m.hanDau, 'mm') || '30mm');
      full('Đục lỗ: ', v(m.holePunchInfo) || '…');
      if (showZipperCell && showTearNotchCell) {
        pair(
          'Tâm zipper cách đầu: ', tamZipperStr,
          'Nhấn xé "v": ', tearNotchStr,
        );
      } else if (showZipperCell) {
        full('Tâm zipper cách đầu: ', tamZipperStr);
      } else if (showTearNotchCell) {
        full('Nhấn xé "v": ', tearNotchStr);
      }
      break;

    case 'tui-4-bien':
      pair('Hàn biên: ', v(m.hanBien, 'mm') || '10mm', 'Hàn đầu: ', v(m.hanDau, 'mm') || '50mm');
      // Đục lỗ thông hơi: chỉ hiện khi có dữ liệu — không tick thì ẩn ô
      // (feedback 2026-09-05 ý 7); Xếp hông luôn hiện.
      if (m.ventHoleInfo) {
        pair('Xếp hông: ', v(m.xepHong, 'mm') || '…', 'Đục lỗ thông hơi: ', m.ventHoleInfo);
      } else {
        full('Xếp hông: ', v(m.xepHong, 'mm') || '…');
      }
      full('Đục lỗ: ', v(m.holePunchInfo) || 'Đục 3 lỗ tròn quai xách (Theo Market)');
      if (showZipperCell && showTearNotchCell) {
        pair(
          'Tâm zipper cách đầu: ', tamZipperStr,
          'Nhấn xé "v": ', tearNotchStr,
        );
      } else if (showZipperCell) {
        full('Tâm zipper cách đầu: ', tamZipperStr);
      } else if (showTearNotchCell) {
        full('Nhấn xé "v": ', tearNotchStr);
      }
      break;

    case 'tui-dan-lung-giua':
      pair('Hàn đầu: ', v(m.hanDau, 'mm') || '13mm', 'Dán lưng: ', v(m.danLung, 'mm') || '13mm');
      if (m.ventHoleInfo) full('Đục lỗ thông hơi: ', m.ventHoleInfo);
      if (showZipperCell) full('Tâm zipper cách đầu: ', tamZipperStr);
      break;

    case 'tui-xep-hong-lung-lech':
      pair('Dán lưng lệch: ', v(m.danLungLech, 'mm') || '10mm', 'Dán đáy: ', v(m.danDay, 'mm') || '10mm');
      full('Xếp hông: ', v(m.xepHong, 'mm') || '…');
      if (showZipperCell) full('Tâm zipper cách đầu: ', tamZipperStr);
      break;

    case 'tui-day-dung':
      if (showZipperCell && showTearNotchCell) {
        pair(
          'Tâm zipper cách đầu: ', tamZipperStr,
          'Nhấn xé "v": ', tearNotchStr,
        );
      } else if (showZipperCell) {
        full('Tâm zipper cách đầu: ', tamZipperStr);
      } else if (showTearNotchCell) {
        full('Nhấn xé "v": ', tearNotchStr);
      }
      pair(
        'Hàn biên: ', v(m.sealEdge) || v(m.hanBien, 'mm') || '10mm',
        'Xếp đáy: ', formatLsxFoldBottom(m.foldBottom) || '100mm',
      );
      break;

    case 'tui-cut-seal':
      if (showZipperCell) {
        full('Tâm zipper cách đầu: ', tamZipperStr);
        if (m.loTreoInfo) full('Đục treo lỗ tròn: ', m.loTreoInfo);
      } else if (m.loTreoInfo) {
        full('Đục treo lỗ tròn: ', m.loTreoInfo);
      }
      break;

    case 'tui-cut-seal-nap-keo':
      pair('Nắp: ', v(m.nap, 'mm') || '35mm', 'Từ đầu đến sóng siêu âm: ', v(m.songSieuAm, 'mm') || '32mm');
      full('Đục quai xách: ', m.docQuaiXach ? 'cây đục riêng của khách' : '…');
      if (m.danKeoNap) full('', 'Dán keo ở mí dưới trong nắp');
      if (showZipperCell) full('Tâm zipper cách đầu: ', tamZipperStr);
      break;

    default:
      pair(
        'Hàn biên: ', v(m.hanBien, 'mm') || v(m.sealEdge) || '…',
        'Hàn đầu: ', v(m.hanDau, 'mm') || '…',
      );
      if (m.xepHong || m.foldBottom) {
        pair(
          'Xếp hông: ', v(m.xepHong, 'mm') || '…',
          'Xếp đáy: ', formatLsxFoldBottom(m.foldBottom) || '…',
        );
      }
      if (showZipperCell && showTearNotchCell) {
        pair(
          'Tâm zipper: ', tamZipperStr,
          'Nhấn xé "v": ', tearNotchStr,
        );
      } else if (showZipperCell) {
        full('Tâm zipper: ', tamZipperStr);
      } else if (showTearNotchCell) {
        full('Nhấn xé "v": ', tearNotchStr);
      }
      if (m.holePunchInfo) full('Đục lỗ: ', m.holePunchInfo);
      break;
  }

  if (m.hanDay) full('Hàn đáy: ', v(m.hanDay, 'mm'));

  if (m.useDualCutter) full('', 'Sử dụng dao cắt 2 nhịp để cắt');
  if (m.useSemicircularMold) full('', 'Sử dụng khuôn đáy đứng bán nguyệt');
  if (m.bagDesc) full('', m.bagDesc);

  return rows;
}
