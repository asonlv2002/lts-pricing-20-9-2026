/**
 * DuLieuMau.ts - du lieu mau moi (2026) cho LTS Pricing.
 * Chi dung cho seed/demo/test, khong import runtime production.
 */

import type { CalculateInput, QuoteStatus } from './types';

export const SELLERS_MAU = [
  { id: 'S1', name: 'Nguyen Minh An' },
  { id: 'S2', name: 'Tran Gia Bao' },
  { id: 'S3', name: 'Le Thu Ha' },
] as const;

const BASE = {
  productType: 'tui', bagType: '3bien', filmType: '', filmRollLength: 6000,
  quantity: 50000, numColors: 4, numImages: 1,
  layer1Id: 'PET', layer2Id: 'LLDPE', layer3Id: null, layer4Id: null, layer5Id: null,
  spreadWidth: 0.18, cutStep: 0.24, metallicSurcharge: 0, coverageRatio: 1,
  handleWeight: 0, zipperWeight: 0, tapeWeight: 0,
  hasZipper: false, hasTape: false, hasHandle: false,
  paymentDays: 30, profitColumn: 1,
  commissionRate: 0, commissionFixedVND: 0, commissionUnit: 'percent', commissionInputValue: 0,
  bagsPerBox: 0, boxPrice: 0, shippingPerKm: 0, shippingKm: 0,
  cylLength: 0, cylCircum: 0, cylUnitPrice: 7300000, cylType: 'A', cylIncluded: false,
  micOverrides: {},
};

export const DON_GAO_ST25: CalculateInput = {
  ...BASE,
  customer: 'Cong ty TNHH Gao Viet Xanh', productName: 'Tui gao ST25 5kg',
  quantity: 60000, numColors: 6, numImages: 1,
  layer1Id: 'PET', layer2Id: 'MPET', layer3Id: 'LLDPE_GAO',
  spreadWidth: 0.34, cutStep: 0.48, paymentDays: 30,
  bagsPerBox: 100, boxPrice: 42000, shippingPerKm: 2500, shippingKm: 45,
  micOverrides: { layer3Id: 120 },
};

export const DON_CA_PHE_ZIP: CalculateInput = {
  ...BASE,
  customer: 'Cong ty CP Ca Phe Cao Nguyen', productName: 'Tui zip ca phe rang xay 500g',
  bagType: 'dayDung', quantity: 35000, numColors: 5, numImages: 1,
  layer1Id: 'PET', layer2Id: 'MPET', layer3Id: 'LLDPE',
  spreadWidth: 0.22, cutStep: 0.32, hasZipper: true, zipperWeight: 3.2,
  paymentDays: 45, commissionRate: 0.02, commissionInputValue: 2,
  micOverrides: { layer3Id: 90 },
};

export const DON_SNACK_BOPP: CalculateInput = {
  ...BASE,
  customer: 'Orion Food Vina', productName: 'Bao bi snack khoai tay 35g',
  quantity: 450000, numColors: 7, numImages: 3,
  layer1Id: 'BOPP20', layer2Id: 'MPET', layer3Id: 'LLDPE',
  spreadWidth: 0.18, cutStep: 0.16, paymentDays: 30,
  micOverrides: { layer3Id: 55 },
};

export const DON_TRA_SUA: CalculateInput = {
  ...BASE,
  customer: 'Cong ty TNHH Tra Sua Moc', productName: 'Tui tra sua hoa tan 25g',
  quantity: 120000, numColors: 6, numImages: 4,
  layer1Id: 'PET', layer2Id: 'MCPP25', layer3Id: null,
  spreadWidth: 0.12, cutStep: 0.18, paymentDays: 14,
};

export const DON_HAT_DIEU: CalculateInput = {
  ...BASE,
  customer: 'Hat Dieu Binh Phuoc Premium', productName: 'Tui hat dieu rang muoi 250g',
  bagType: 'dayDung', quantity: 40000, numColors: 4, numImages: 2,
  layer1Id: 'MattOPP20', layer2Id: 'LLDPE', layer3Id: null,
  spreadWidth: 0.19, cutStep: 0.28, paymentDays: 30,
  micOverrides: { layer2Id: 80 },
};

export const DON_THUY_SAN_PA: CalculateInput = {
  ...BASE,
  customer: 'Cong ty CP Thuy San Mekong', productName: 'Tui hut chan khong ca phi le 1kg',
  quantity: 90000, numColors: 3, numImages: 2,
  layer1Id: 'PA', layer2Id: 'LLDPE_HUT_CHAN_KHONG', layer3Id: null,
  spreadWidth: 0.24, cutStep: 0.34, paymentDays: 45,
  micOverrides: { layer2Id: 110 },
};

export const DON_NUOC_MAM: CalculateInput = {
  ...BASE,
  customer: 'Masan Consumer', productName: 'Tui nuoc mam 500ml',
  quantity: 250000, numColors: 6, numImages: 2,
  layer1Id: 'PET', layer2Id: 'PA', layer3Id: 'LLDPE',
  spreadWidth: 0.14, cutStep: 0.26, paymentDays: 90,
  micOverrides: { layer3Id: 95 },
};

export const DON_BOT_GIAT_QUAI: CalculateInput = {
  ...BASE,
  customer: 'Cong ty TNHH Hoa My Pham An Phat', productName: 'Tui bot giat quai xach 3kg',
  bagType: 'dayDung', quantity: 50000, numColors: 5, numImages: 1,
  layer1Id: 'PET', layer2Id: 'LLDPE', layer3Id: null,
  spreadWidth: 0.32, cutStep: 0.46, hasHandle: true, handleWeight: 4,
  paymentDays: 90, micOverrides: { layer2Id: 120 },
};

export const MANG_SUA_CHUA: CalculateInput = {
  ...BASE,
  customer: 'Vinamilk', productName: 'Mang co loc sua chua 4 hop',
  productType: 'mang', bagType: '', filmType: 'mangIn', filmQuantityUnit: 'm2', filmInputQuantity: 180000,
  quantity: 180000, numColors: 8, numImages: 1,
  layer1Id: 'LLDPE_SUA', layer2Id: null, layer3Id: null,
  spreadWidth: 0.42, cutStep: 0.16, paymentDays: 30,
  micOverrides: { layer1Id: 55 },
};

export const MANG_MI_GOI: CalculateInput = {
  ...BASE,
  customer: 'Acecook Viet Nam', productName: 'Mang cuon mi goi tom chua cay',
  productType: 'mang', bagType: '', filmType: 'mangGhep', filmQuantityUnit: 'm2', filmInputQuantity: 320000,
  quantity: 320000, numColors: 7, numImages: 3,
  layer1Id: 'BOPP20', layer2Id: 'MPET', layer3Id: 'LLDPE',
  spreadWidth: 0.19, cutStep: 0.15, paymentDays: 30,
  micOverrides: { layer3Id: 50 },
};

export const MANG_BANH_KEO: CalculateInput = {
  ...BASE,
  customer: 'Kinh Do Mondelez', productName: 'Mang cuon banh quy hop qua',
  productType: 'mang', bagType: '', filmType: 'mangGhep', filmQuantityUnit: 'm2', filmInputQuantity: 160000,
  quantity: 160000, numColors: 6, numImages: 2,
  layer1Id: 'MattOPP20', layer2Id: 'CPP30', layer3Id: null,
  spreadWidth: 0.28, cutStep: 0.2, paymentDays: 45,
};

export const MANG_NUOC_UONG: CalculateInput = {
  ...BASE,
  customer: 'TH True Water', productName: 'Mang co chai nuoc 500ml x 24',
  productType: 'mang', bagType: '', filmType: 'mangIn', filmQuantityUnit: 'm2', filmInputQuantity: 240000,
  quantity: 240000, numColors: 5, numImages: 1,
  layer1Id: 'LLDPE', layer2Id: null, layer3Id: null,
  spreadWidth: 0.5, cutStep: 0.18, paymentDays: 14,
  micOverrides: { layer1Id: 45 },
};

export const TAT_CA_DU_LIEU_MAU: CalculateInput[] = [
  DON_GAO_ST25,
  DON_CA_PHE_ZIP,
  DON_SNACK_BOPP,
  DON_TRA_SUA,
  DON_HAT_DIEU,
  DON_THUY_SAN_PA,
  DON_NUOC_MAM,
  DON_BOT_GIAT_QUAI,
  MANG_SUA_CHUA,
  MANG_MI_GOI,
  MANG_BANH_KEO,
  MANG_NUOC_UONG,
];

export type PhanBoSeed = {
  inputIndex: number;
  sellerIndex: number;
  status: QuoteStatus;
  chotGiaRatio?: number;
  ngayOffsetGio?: number;
};

export const PHAN_BO_HISTORY: PhanBoSeed[] = [
  { inputIndex: 0,  sellerIndex: 0, status: 'completed', chotGiaRatio: 1.02, ngayOffsetGio: 0  },
  { inputIndex: 1,  sellerIndex: 0, status: 'approved',                       ngayOffsetGio: 6  },
  { inputIndex: 2,  sellerIndex: 0, status: 'pending_approval',               ngayOffsetGio: 12 },
  { inputIndex: 3,  sellerIndex: 0, status: 'sent',                           ngayOffsetGio: 18 },
  { inputIndex: 4,  sellerIndex: 1, status: 'drafted',                        ngayOffsetGio: 24 },
  { inputIndex: 5,  sellerIndex: 1, status: 'completed', chotGiaRatio: 1.01,  ngayOffsetGio: 30 },
  { inputIndex: 6,  sellerIndex: 1, status: 'approved',                       ngayOffsetGio: 36 },
  { inputIndex: 7,  sellerIndex: 1, status: 'pending_approval',               ngayOffsetGio: 42 },
  { inputIndex: 8,  sellerIndex: 2, status: 'completed', chotGiaRatio: 1.03,  ngayOffsetGio: 48 },
  { inputIndex: 9,  sellerIndex: 2, status: 'approved',                       ngayOffsetGio: 54 },
  { inputIndex: 10, sellerIndex: 2, status: 'sent',                           ngayOffsetGio: 60 },
  { inputIndex: 11, sellerIndex: 2, status: 'drafted',                        ngayOffsetGio: 66 },
];
