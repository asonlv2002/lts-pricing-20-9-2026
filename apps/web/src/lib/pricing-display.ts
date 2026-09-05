type PricingDisplayInput = {
  productType?: string;
  filmType?: string;
  pricingMode?: string;
  commercialUnitKind?: string;
  commercialUnitLabel?: string;
};

function formatPercent(rate: number) {
  return `${parseFloat((rate * 100).toFixed(2))}%`;
}

export function isPrintFilm(input: PricingDisplayInput) {
  return input.productType === 'mang' && input.filmType === 'mangIn';
}

/** Đơn vị hiển thị — thương mại dùng đơn vị user tự chọn (mua đi bán lại), còn lại theo loại SP. */
export function layDonViTinh(input: PricingDisplayInput): string {
  if (input.pricingMode === 'commercial') {
    const kind = input.commercialUnitKind || 'tui';
    if (kind === 'm2') return 'm²';
    if (kind === 'm') return 'm';
    if (kind === 'custom' && (input.commercialUnitLabel || '').trim()) return input.commercialUnitLabel!.trim();
    return 'túi';
  }
  return input.productType === 'mang' ? 'm²' : 'túi';
}

export function getPricingDisplayMeta(input: PricingDisplayInput) {
  const printFilm = isPrintFilm(input);
  const film = input.productType === 'mang';
  const unit = layDonViTinh(input);

  return {
    isPrintFilm: printFilm,
    isFilm: film,
    unit,
    quantityUnit: unit,
    quantityUnitForHistory: film ? 'm²' : 'cái',
    priceTitle: `Giá đề xuất / ${unit}`,
    closedPriceTitle: `Giá chốt / ${unit}`,
    salePriceTitle: `Giá Bán/${unit}`,
    initialPriceLabel: printFilm ? 'Giá ban đầu Màng in' : 'Giá ban đầu',
    profitLabel: printFilm ? 'Lợi nhuận Màng in' : 'Lợi nhuận',
    shippingLabel: printFilm ? 'Vận chuyển Màng in' : 'Chi phí Vận chuyển',
    paymentInputLabel: 'Thanh toán',
    formatPrintFilmPayment: formatPercent,
    interestLabel: (rate: number, days?: number) => printFilm
      ? `Lãi vay Màng in ${formatPercent(rate || 0)}`
      : `Lãi vay ${days ?? 30} ngày`,
    exportTitle: printFilm
      ? 'BÁO GIÁ MÀNG IN - CTY CP LAI TRƯỜNG SƠN'
      : film
        ? 'BÁO GIÁ MÀNG BAO BÌ - CTY CP LAI TRƯỜNG SƠN'
        : 'BÁO GIÁ TÚI BAO BÌ - CTY CP LAI TRƯỜNG SƠN',
    detailTitle: `CHI TIẾT GIÁ BÁN / ${unit.toUpperCase()}`,
  };
}
