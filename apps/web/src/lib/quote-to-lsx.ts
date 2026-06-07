import type { CalculateInput, HistoryItem, ProductionOrder } from './types';

export interface LsxQuoteLine {
  key: string;
  quoteId: string;
  quoteCode?: string;
  customer: string;
  productName: string;
  structure: string;
  quantity: number;
  finalPrice: number;
  chotGia?: number;
  input: CalculateInput;
  sourceHistoryItemId?: string;
  tierIndex?: number;
}

function isCompletedQuote(quote: HistoryItem): boolean {
  return quote.quoteStatus === 'completed';
}

function lineKey(productIndex: number, tierIndex?: number): string {
  return tierIndex == null ? `p${productIndex}` : `p${productIndex}-t${tierIndex}`;
}

export function getLsxQuoteLines(quote: HistoryItem): LsxQuoteLine[] {
  if (!isCompletedQuote(quote)) return [];

  if (quote.quoteProducts?.length) {
    return quote.quoteProducts.flatMap((product, productIndex) => {
      if (product.tiers?.length) {
        return product.tiers.map((tier, tierIndex) => ({
          key: lineKey(productIndex, tierIndex),
          quoteId: quote.id,
          quoteCode: quote.quoteCode,
          customer: quote.customer,
          productName: product.productName,
          structure: product.structure,
          quantity: tier.quantity,
          finalPrice: tier.finalPrice,
          chotGia: tier.chotGia,
          input: { ...product.input, quantity: tier.quantity, customer: quote.customer, productName: product.productName },
          sourceHistoryItemId: product.sourceHistoryItemId,
          tierIndex,
        }));
      }

      return [{
        key: lineKey(productIndex),
        quoteId: quote.id,
        quoteCode: quote.quoteCode,
        customer: quote.customer,
        productName: product.productName,
        structure: product.structure,
        quantity: product.quantity,
        finalPrice: product.finalPrice,
        chotGia: product.chotGia,
        input: { ...product.input, quantity: product.quantity, customer: quote.customer, productName: product.productName },
        sourceHistoryItemId: product.sourceHistoryItemId,
      }];
    });
  }

  if (quote.tiers?.length) {
    return quote.tiers.map((tier, tierIndex) => ({
      key: lineKey(0, tierIndex),
      quoteId: quote.id,
      quoteCode: quote.quoteCode,
      customer: quote.customer,
      productName: quote.productName,
      structure: quote.structure,
      quantity: tier.quantity,
      finalPrice: tier.finalPrice,
      chotGia: tier.chotGia,
      input: { ...quote.input, quantity: tier.quantity, customer: quote.customer, productName: quote.productName },
      sourceHistoryItemId: tier.historyItemId,
      tierIndex,
    }));
  }

  return [{
    key: lineKey(0),
    quoteId: quote.id,
    quoteCode: quote.quoteCode,
    customer: quote.customer,
    productName: quote.productName,
    structure: quote.structure,
    quantity: quote.quantity,
    finalPrice: quote.finalPrice,
    chotGia: quote.chotGia,
    input: { ...quote.input, quantity: quote.quantity, customer: quote.customer, productName: quote.productName },
  }];
}

export function buildHistoryItemForLsx(quote: HistoryItem, line: LsxQuoteLine): HistoryItem {
  return {
    id: `${quote.id}:${line.key}`,
    date: quote.date,
    customer: quote.customer,
    productName: line.productName,
    structure: line.structure,
    quantity: line.quantity,
    finalPrice: line.finalPrice,
    chotGia: line.chotGia,
    quoteStatus: quote.quoteStatus,
    quoteCode: quote.quoteCode,
    isQuote: false,
    sellerId: quote.sellerId,
    sellerName: quote.sellerName,
    terms: quote.terms,
    input: {
      ...line.input,
      customer: quote.customer,
      productName: line.productName,
      quantity: line.quantity,
    },
  };
}

export function quoteLineProductionOrderId(quote: HistoryItem, line: LsxQuoteLine): string {
  return `${quote.id}:${line.key}`;
}

export function hasExistingProductionOrderForLine(orders: ProductionOrder[], quote: HistoryItem, line: LsxQuoteLine): boolean {
  const targetId = quoteLineProductionOrderId(quote, line);
  return orders.some(order => order.quoteId === targetId);
}
