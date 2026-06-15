import type { HistoryItem, LSXStatus, ProductionOrder, QuoteStatus } from './types';

export type HistoryFilterMode = 'pricing' | 'quote' | 'lsx';
export type HistoryTimeRange = '3days' | '7days' | '30days' | 'all' | 'custom';
export type PricingWorkflowStatus = 'draft' | 'saved' | 'used' | 'locked';

export interface HistoryFilterState {
  mode: HistoryFilterMode;
  timeRange: HistoryTimeRange;
  fromDate: string;
  toDate: string;
  customerQuery: string;
  productQuery: string;
  sellerIds: string[];
  pricingStatuses: PricingWorkflowStatus[];
  quoteStatuses: QuoteStatus[];
  lsxStatuses?: LSXStatus[];
  materialIds: string[];
  productShape: string;
  unitPriceMin: string;
  unitPriceMax: string;
  profitRateMin: string;
  profitRateMax: string;
  now?: Date;
}

export interface HistoryFilterCustomer {
  id?: string;
  customerCode?: string;
  companyName?: string;
  taxCode?: string;
  contactName?: string;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilterState = {
  mode: 'pricing',
  timeRange: 'all',
  fromDate: '',
  toDate: '',
  customerQuery: '',
  productQuery: '',
  sellerIds: [],
  pricingStatuses: [],
  quoteStatuses: [],
  materialIds: [],
  productShape: '',
  unitPriceMin: '',
  unitPriceMax: '',
  profitRateMin: '',
  profitRateMax: '',
};

const COMMERCIAL_QUOTE_STATUSES = new Set<QuoteStatus>([
  'drafted', 'pending_approval', 'approved', 'sent', 'rejected', 'cancelled', 'completed',
]);

export function normalizeHistoryText(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function isQuoteHistoryItem(item: HistoryItem): boolean {
  return !!(item.isQuote || item.quoteProducts?.length || (item.quoteCode && item.tiers?.length));
}

export function getPricingWorkflowStatus(item: HistoryItem): PricingWorkflowStatus {
  if (item.locked) return 'locked';
  if (item.quoteCode || item.isQuote || item.quoteProducts?.length) return 'used';
  if (!item.finalPrice || item.finalPrice <= 0) return 'draft';
  return 'saved';
}

export function getHistoryItemUnitPrices(item: HistoryItem): number[] {
  const prices: number[] = [];
  const add = (value?: number) => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) prices.push(value);
  };

  if (item.quoteProducts?.length) {
    for (const product of item.quoteProducts) {
      if (product.tiers?.length) {
        for (const tier of product.tiers) add(tier.chotGia ?? tier.finalPrice);
      } else {
        add(product.chotGia ?? product.finalPrice);
      }
    }
  } else if (item.tiers?.length) {
    for (const tier of item.tiers) add(tier.chotGia ?? tier.finalPrice);
  } else {
    add(item.chotGia ?? item.finalPrice);
  }

  return prices;
}

function parseVnDateMs(value?: string): number {
  if (!value) return 0;
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function parseIsoDateMs(value?: string): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function dateRangeBounds(filters: HistoryFilterState): [number, number] {
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

  const days = filters.timeRange === '3days' ? 3 : filters.timeRange === '30days' ? 30 : 7;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return [start.getTime(), end.getTime()];
}

function itemCustomerSearchText(item: HistoryItem, customers: HistoryFilterCustomer[]): string {
  const itemCustomer = normalizeHistoryText(item.customer || item.input?.customer);
  const related = customers.filter(customer => {
    const names = [customer.companyName, customer.contactName].map(normalizeHistoryText);
    return names.some(name => name && (itemCustomer.includes(name) || name.includes(itemCustomer)));
  });
  return [
    item.customer,
    item.input?.customer,
    ...related.flatMap(customer => [customer.id, customer.customerCode, customer.companyName, customer.taxCode, customer.contactName]),
  ].map(normalizeHistoryText).join(' ');
}

function orderCustomerSearchText(order: ProductionOrder, customers: HistoryFilterCustomer[]): string {
  const orderCustomer = normalizeHistoryText(order.snapshot.customer);
  const related = customers.filter(customer => {
    const names = [customer.companyName, customer.contactName].map(normalizeHistoryText);
    return names.some(name => name && (orderCustomer.includes(name) || name.includes(orderCustomer)));
  });
  return [
    order.snapshot.customer,
    ...related.flatMap(customer => [customer.id, customer.customerCode, customer.companyName, customer.taxCode, customer.contactName]),
  ].map(normalizeHistoryText).join(' ');
}

function itemProductSearchText(item: HistoryItem): string {
  return [
    item.productName,
    item.input?.productName,
    ...(item.quoteProducts ?? []).flatMap(product => [product.productName, product.input?.productName]),
  ].map(normalizeHistoryText).join(' ');
}

function itemMaterialIds(item: HistoryItem): string[] {
  const inputs = [item.input, ...(item.quoteProducts ?? []).map(product => product.input)].filter(Boolean);
  const ids = inputs.flatMap(input => [input.layer1Id, input.layer2Id, input.layer2AltId, input.layer3Id, input.layer4Id, input.layer5Id]);
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0).map(id => id.toUpperCase()))];
}

function itemProductShapes(item: HistoryItem): string[] {
  const inputs = [item.input, ...(item.quoteProducts ?? []).map(product => product.input)].filter(Boolean);
  return inputs.flatMap(input => [input.productType, input.bagType, input.filmType]).filter(Boolean).map(String);
}

function itemProfitRates(item: HistoryItem): number[] {
  const rates: number[] = [];
  const add = (value?: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) rates.push(value);
  };
  add(item.profitRate);
  for (const product of item.quoteProducts ?? []) {
    add(product.profitRate);
    for (const tier of product.tiers ?? []) add(tier.profitRate);
  }
  return rates;
}

function parseNumberInput(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesRange(values: number[], minRaw: string, maxRaw: string, transform: (n: number) => number = n => n): boolean {
  const min = parseNumberInput(minRaw);
  const max = parseNumberInput(maxRaw);
  if (min == null && max == null) return true;
  if (values.length === 0) return false;
  return values.some(value => {
    const comparable = transform(value);
    if (min != null && comparable < min) return false;
    if (max != null && comparable > max) return false;
    return true;
  });
}

export function filterHistoryItems(
  items: HistoryItem[],
  filters: HistoryFilterState,
  customers: HistoryFilterCustomer[] = [],
): HistoryItem[] {
  const [fromMs, toMs] = dateRangeBounds(filters);
  const customerQuery = normalizeHistoryText(filters.customerQuery);
  const productQuery = normalizeHistoryText(filters.productQuery);
  const materialIds = filters.materialIds.map(id => id.toUpperCase());
  const productShape = normalizeHistoryText(filters.productShape);

  return items.filter(item => {
    const isQuote = isQuoteHistoryItem(item);
    if (filters.mode === 'quote' && !isQuote) return false;
    if (filters.mode === 'pricing' && isQuote) return false;

    const ms = parseVnDateMs(item.date);
    if (ms && (ms < fromMs || ms > toMs)) return false;

    if (customerQuery && !itemCustomerSearchText(item, customers).includes(customerQuery)) return false;
    if (productQuery && !itemProductSearchText(item).includes(productQuery)) return false;

    if (filters.sellerIds.length > 0 && !filters.sellerIds.includes(item.sellerId || item.sellerName || '')) return false;

    if (filters.mode === 'pricing' && filters.pricingStatuses.length > 0) {
      if (!filters.pricingStatuses.includes(getPricingWorkflowStatus(item))) return false;
    }

    if (filters.mode === 'quote') {
      const status = item.quoteStatus ?? 'drafted';
      if (!COMMERCIAL_QUOTE_STATUSES.has(status)) return false;
      if (filters.quoteStatuses.length > 0 && !filters.quoteStatuses.includes(status)) return false;
    }

    if (materialIds.length > 0) {
      const itemIds = itemMaterialIds(item);
      const structure = normalizeHistoryText(item.structure);
      if (!materialIds.some(id => itemIds.includes(id) || structure.includes(normalizeHistoryText(id)))) return false;
    }

    if (productShape) {
      const shapes = itemProductShapes(item).map(normalizeHistoryText).join(' ');
      if (!shapes.includes(productShape)) return false;
    }

    if (!matchesRange(getHistoryItemUnitPrices(item), filters.unitPriceMin, filters.unitPriceMax)) return false;
    if (!matchesRange(itemProfitRates(item), filters.profitRateMin, filters.profitRateMax, value => value * 100)) return false;

    return true;
  });
}

export function filterProductionOrders(
  orders: ProductionOrder[],
  filters: HistoryFilterState,
  customers: HistoryFilterCustomer[] = [],
): ProductionOrder[] {
  const [fromMs, toMs] = dateRangeBounds(filters);
  const customerQuery = normalizeHistoryText(filters.customerQuery);
  const productQuery = normalizeHistoryText(filters.productQuery);
  const productShape = normalizeHistoryText(filters.productShape);
  const statuses = filters.lsxStatuses ?? (filters.quoteStatuses as unknown as LSXStatus[]);

  return orders.filter(order => {
    const ms = parseIsoDateMs(order.createdAt);
    if (ms && (ms < fromMs || ms > toMs)) return false;

    if (customerQuery && !orderCustomerSearchText(order, customers).includes(customerQuery)) return false;

    if (productQuery) {
      const productText = [order.snapshot.customer, order.snapshot.productName, order.snapshot.structure, order.manual.lsxNumber, order.id]
        .map(normalizeHistoryText)
        .join(' ');
      if (!productText.includes(productQuery)) return false;
    }

    if (statuses.length > 0 && !statuses.includes(order.status)) return false;

    if (productShape) {
      const shapes = [order.snapshot.productType, order.snapshot.bagType].map(normalizeHistoryText).join(' ');
      if (!shapes.includes(productShape)) return false;
    }

    if (!matchesRange([order.snapshot.chotGia], filters.unitPriceMin, filters.unitPriceMax)) return false;

    return true;
  });
}
