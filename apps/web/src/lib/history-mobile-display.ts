export function formatMobileHistoryCode(code: string, visibleTail = 4): string {
  if (code.length <= visibleTail + 2) return code;
  return `...${code.slice(-visibleTail)}`;
}
