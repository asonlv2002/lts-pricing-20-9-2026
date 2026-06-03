import { strict as assert } from 'assert';
import { getPricingDisplayMeta } from './pricing-display';

function section(name: string) {
  console.log(`\n=== ${name} ===`);
}

section('Màng in uses separate labels and m² unit');

const printFilmMeta = getPricingDisplayMeta({ productType: 'mang', filmType: 'mangIn' });

assert.equal(printFilmMeta.unit, 'm²');
assert.equal(printFilmMeta.quantityUnit, 'm²');
assert.equal(printFilmMeta.priceTitle, 'Giá đề xuất / m²');
assert.equal(printFilmMeta.profitLabel, 'Lợi nhuận Màng in');
assert.equal(printFilmMeta.shippingLabel, 'Vận chuyển Màng in');
assert.equal(printFilmMeta.interestLabel(0.01), 'Lãi vay Màng in 1%');
assert.equal(printFilmMeta.paymentInputLabel, 'Thanh toán');
assert.equal(printFilmMeta.formatPrintFilmPayment(0.01), '1%');
assert.equal(printFilmMeta.exportTitle, 'BÁO GIÁ MÀNG IN - CTY CP LAI TRƯỜNG SƠN');
assert.equal(printFilmMeta.detailTitle, 'CHI TIẾT GIÁ BÁN / M²');

section('Túi keeps bag labels and túi unit');

const bagMeta = getPricingDisplayMeta({ productType: 'tui', filmType: '' });

assert.equal(bagMeta.unit, 'túi');
assert.equal(bagMeta.quantityUnit, 'túi');
assert.equal(bagMeta.priceTitle, 'Giá đề xuất / túi');
assert.equal(bagMeta.profitLabel, 'Lợi nhuận');
assert.equal(bagMeta.shippingLabel, 'Chi phí Vận chuyển');
assert.equal(bagMeta.interestLabel(0.13, 30), 'Lãi vay 30 ngày');
assert.equal(bagMeta.exportTitle, 'BÁO GIÁ TÚI BAO BÌ - CTY CP LAI TRƯỜNG SƠN');
assert.equal(bagMeta.detailTitle, 'CHI TIẾT GIÁ BÁN / TÚI');

console.log('\n✅ print-film-display tests passed');
