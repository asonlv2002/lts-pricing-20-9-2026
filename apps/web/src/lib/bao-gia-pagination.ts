export interface QuotePageGroup {
  id: string;
  height: number;
}

export function paginateQuoteGroups<T extends QuotePageGroup>(
  groups: readonly T[],
  pageHeight: number,
): T[][] {
  return paginateQuoteGroupsByPageHeight(groups, () => pageHeight);
}

export function paginateQuoteGroupsByPageHeight<T extends QuotePageGroup>(
  groups: readonly T[],
  pageHeight: (pageIndex: number) => number,
): T[][] {
  const pages: T[][] = [];
  let currentPage: T[] = [];
  let usedHeight = 0;
  let pageIndex = 0;

  for (const group of groups) {
    if (
      currentPage.length > 0 &&
      usedHeight + group.height > pageHeight(pageIndex)
    ) {
      pages.push(currentPage);
      currentPage = [];
      usedHeight = 0;
      pageIndex++;
    }

    currentPage.push(group);
    usedHeight += group.height;
  }

  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
}

export function estimateQuoteGroupHeight({
  productName,
  description,
  tierCount,
  hasCylinder,
  cylinderDescription = '',
}: {
  productName?: string | null;
  description?: string | null;
  tierCount: number;
  hasCylinder: boolean;
  cylinderDescription?: string | null;
}): number {
  const textLines = (text: string | null | undefined, charactersPerLine: number) =>
    Math.max(
      1,
      String(text ?? '').split('\n').reduce(
        (count, line) => count + Math.max(1, Math.ceil(line.length / charactersPerLine)),
        0,
      ),
    );

  const firstRowLines = Math.max(
    textLines(productName, 20),
    textLines(description, 42),
  );
  const firstRow = Math.max(26, firstRowLines * 13 + 10);
  const additionalTiers = Math.max(0, tierCount - 1) * 26;
  const cylinder = hasCylinder
    ? Math.max(26, textLines(cylinderDescription, 42) * 13 + 10)
    : 0;

  return firstRow + additionalTiers + cylinder;
}
