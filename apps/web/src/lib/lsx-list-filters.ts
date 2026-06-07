import type { LSXStatus, ProductionOrder } from './types';

export type LsxListTimeRange = 'today' | '7days' | '30days' | 'all' | 'custom';

export interface LsxListFilters {
  timeRange: LsxListTimeRange;
  fromDate: string;
  toDate: string;
  deliveryFromDate: string;
  deliveryToDate: string;
  keyword: string;
  customerQuery: string;
  productQuery: string;
  quoteIdQuery: string;
  preparedByQuery: string;
  approvedByQuery: string;
  statuses: LSXStatus[];
  productTypes: Array<'mang' | 'tui'>;
  quantityMin: string;
  quantityMax: string;
  priceMin: string;
  priceMax: string;
  now?: Date;
}

export const DEFAULT_LSX_LIST_FILTERS: LsxListFilters = {
  timeRange: '30days',
  fromDate: '',
  toDate: '',
  deliveryFromDate: '',
  deliveryToDate: '',
  keyword: '',
  customerQuery: '',
  productQuery: '',
  quoteIdQuery: '',
  preparedByQuery: '',
  approvedByQuery: '',
  statuses: [],
  productTypes: [],
  quantityMin: '',
  quantityMax: '',
  priceMin: '',
  priceMax: '',
};

function normalize(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateMs(value?: string): number {
  if (!value) return 0;
  if (value.includes('/')) {
    const [day, month, year] = value.split('/').map(Number);
    if (!day || !month || !year) return 0;
    return new Date(year, month - 1, day).getTime();
  }
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function dateBounds(filters: LsxListFilters): [number, number] {
  const now = filters.now ?? new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (filters.timeRange === 'all') return [0, end.getTime()];
  if (filters.timeRange === 'custom') {
    const from = filters.fromDate ? new Date(filters.fromDate) : new Date(0);
    const to = filters.toDate ? new Date(filters.toDate) : end;
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return [from.getTime(), to.getTime()];
  }

  const days = filters.timeRange === 'today' ? 1 : filters.timeRange === '7days' ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return [start.getTime(), end.getTime()];
}

function inRange(value: number, minRaw: string, maxRaw: string): boolean {
  const min = parseNumber(minRaw);
  const max = parseNumber(maxRaw);
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function orderSearchText(order: ProductionOrder): string {
  return [
    order.id,
    order.manual.lsxNumber,
    order.quoteId,
    order.snapshot.customer,
    order.snapshot.productName,
    order.snapshot.structure,
    order.snapshot.layer1Name,
    order.snapshot.layer2Name,
    order.snapshot.layer3Name,
    order.snapshot.layer4Name,
    order.snapshot.layer5Name,
  ].map(normalize).join(' ');
}

export function filterLsxList(orders: ProductionOrder[], filters: LsxListFilters): ProductionOrder[] {
  const [fromMs, toMs] = dateBounds(filters);
  const keywordParts = normalize(filters.keyword).split(/\s+/).filter(Boolean);
  const customerQuery = normalize(filters.customerQuery);
  const productQuery = normalize(filters.productQuery);
  const quoteIdQuery = normalize(filters.quoteIdQuery);
  const preparedByQuery = normalize(filters.preparedByQuery);
  const approvedByQuery = normalize(filters.approvedByQuery);
  const deliveryFrom = filters.deliveryFromDate ? new Date(filters.deliveryFromDate).setHours(0, 0, 0, 0) : 0;
  const deliveryTo = filters.deliveryToDate ? new Date(filters.deliveryToDate).setHours(23, 59, 59, 999) : Number.MAX_SAFE_INTEGER;

  return orders.filter(order => {
    const createdMs = parseDateMs(order.createdAt);
    if (createdMs && (createdMs < fromMs || createdMs > toMs)) return false;

    const text = orderSearchText(order);
    if (keywordParts.length && !keywordParts.every(part => text.includes(part))) return false;
    if (customerQuery && !normalize(order.snapshot.customer).includes(customerQuery)) return false;
    if (productQuery && !normalize(order.snapshot.productName).includes(productQuery)) return false;
    if (quoteIdQuery && !normalize(order.quoteId).includes(quoteIdQuery)) return false;
    if (preparedByQuery && !normalize(order.manual.preparedBy).includes(preparedByQuery)) return false;
    if (approvedByQuery && !normalize(order.manual.approvedBy).includes(approvedByQuery)) return false;
    if (filters.statuses.length && !filters.statuses.includes(order.status)) return false;
    if (filters.productTypes.length && !filters.productTypes.includes(order.snapshot.productType as 'mang' | 'tui')) return false;

    const deliveryMs = parseDateMs(order.manual.deliveryDate);
    if (deliveryMs && (deliveryMs < deliveryFrom || deliveryMs > deliveryTo)) return false;
    if (!inRange(order.snapshot.quantity, filters.quantityMin, filters.quantityMax)) return false;
    if (!inRange(order.snapshot.chotGia, filters.priceMin, filters.priceMax)) return false;

    return true;
  });
}
