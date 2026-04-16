import { CalculateInput, CalculateResult, Material, AppConstants, ProfitRow } from './types';
import { PROFIT_DEFAULT } from './data';

function getMaterial(id: string, materials: Material[]): Material | undefined {
  return materials.find(m => m.id === id);
}

export function lookupProfit(totalCost: number, column: number, profitTable: ProfitRow[]): number {
  const col = column === 1 ? 'col1' : 'col2';
  // profitDefault = LN thấp nhất (đơn hàng rất lớn vượt mọi ngưỡng)
  // Bảng được sắp xếp tăng dần theo threshold → break tại ngưỡng đầu tiên lớn hơn cost
  let val = PROFIT_DEFAULT[col as keyof typeof PROFIT_DEFAULT];
  for (const row of profitTable) {
    if (totalCost < row.threshold) {
      val = row[col as keyof typeof row] as number;
      break;
    }
  }
  return val;
}

export function calculate(
  input: CalculateInput,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[]
): CalculateResult | null {
  const {
    quantity, spreadWidth, cutStep, numColors, metallicSurcharge = 0,
    handleWeight = 0, zipperWeight = 0, tapeWeight = 0, coverageRatio = 1, profitColumn = 2,
    commissionRate = 0, hasZipper = false, hasTape = false, hasHandle = false,
    layer1Id, layer2Id, layer3Id, layer4Id, layer5Id,
    shippingPerKm, shippingKm,
    boxPrice, bagsPerBox,
    micOverrides = {}
  } = input;

  const cloneMat = (mat?: Material, layerKey?: string) => {
    if (!mat) return null;
    const clone = { ...mat };
    if (layerKey && micOverrides[layerKey] && mat.adjustableMic) {
      clone.thickness = micOverrides[layerKey];
      clone.pricePerM2 = clone.pricePerKg * clone.thickness * clone.density / 1000;
    }
    return clone;
  };

  const layer1 = layer1Id ? cloneMat(getMaterial(layer1Id, materials), 'layer1Id') : null;
  const layer2 = layer2Id ? cloneMat(getMaterial(layer2Id, materials), 'layer2Id') : null;
  const layer3 = layer3Id ? cloneMat(getMaterial(layer3Id, materials), 'layer3Id') : null;
  const layer4 = layer4Id ? cloneMat(getMaterial(layer4Id, materials), 'layer4Id') : null;
  const layer5 = layer5Id ? cloneMat(getMaterial(layer5Id, materials), 'layer5Id') : null;
  
  if (!layer1 || quantity <= 0 || spreadWidth <= 0 || cutStep <= 0 || !input.productType || input.numColors === null) return null;
  if (input.productType === 'tui' && !input.bagType) return null;
  if (input.productType === 'mang' && !input.filmType) return null;

  const middleLayers = [layer2, layer3, layer4].filter(Boolean);
  const numLaminations = (layer5 ? 1 : 0) + middleLayers.length;

  const numImages = input.numImages || 1;

  const bagArea = spreadWidth * cutStep;
  // Với màng: quantity nhập vào đã là m², không nhân thêm bagArea
  // Với túi: quantity là số cái → tổng m² = số cái × m²/cái
  const totalArea = input.productType === 'mang' ? quantity : quantity * bagArea;
  const printWidth = spreadWidth * numImages + 0.02;
  // Chiều dài cuộn TP = S / (khổ trải × số con hình) — không cộng lề 0.02
  const filmLength = spreadWidth * numImages > 0 ? totalArea / (spreadWidth * numImages) : 0;

  const cutWidth = printWidth;
  // Tính từ dưới lên:
  // Túi: Tp cắt = bước cắt × SL
  // Màng: Tp cắt = diện tích / khổ trải (chiều dài cuộn TP giao khách)
  const cutMeters = input.productType === 'mang'
    ? (spreadWidth > 0 ? totalArea / spreadWidth : 0)
    : cutStep * quantity;
  const cA = constants.cutWasteA || 3000;
  const cB = constants.cutWasteB || 20;
  const cC = constants.cutWasteC || 100;
  // Phi hao áp dụng cho cả túi lẫn màng
  const cutWaste = cutMeters / cA * cB + cC;

  const laminations: any[] = [];
  // Thứ tự đúng: layer2 nhận đầu tiên (gần cắt nhất), layer5 nhận cuối
  const lamChain = [
    { layer: layer2, num: 2 }, { layer: layer3, num: 3 },
    { layer: layer4, num: 4 }, { layer: layer5, num: 5 }
  ].filter(item => !!item.layer);

  let currentNeededMeters = cutMeters + cutWaste;

  lamChain.forEach(({ layer, num }) => {
    if (!layer) return;
    const width = cutWidth;  // khổ ghép = printWidth (spreadWidth × numImages + 0.02)
    const meters = currentNeededMeters;
    const gA = constants.ghepWasteA || 3000;
    const gB = constants.ghepWasteB || 20;
    const gC = constants.ghepWasteC || 100;
    const waste = meters / gA * gB + gC;
    const cpsx = constants.ghepCPSX;
    const costCPSX = cpsx * (waste + meters) * width;
    const costMat = (layer.pricePerM2 || 0) * (waste + meters) * width;

    laminations.push({
      layerNum: num, material: layer, width, meters, waste, cpsx, costCPSX, costMat, total: costCPSX + costMat
    });
    currentNeededMeters = meters + waste;
  });

  const totalLamWaste = laminations.reduce((sum, lam) => sum + lam.waste, 0);
  const totalLamCost = laminations.reduce((sum, lam) => sum + lam.total, 0);

  const printNLWidth = cutWidth;  // khổ in = printWidth (spreadWidth × numImages + 0.02)
  const printMeters = cutMeters + cutWaste + totalLamWaste;
  
  const cSetup = numColors! > 0 ? (constants.colorSetup[numColors!] || (numColors! * 200 + 200)) : 0; 
  const pA = constants.printWasteA || 6000;
  const pB = constants.printWasteB || 40;
  const pC = constants.printWasteC || 50000;
  const pD = constants.printWasteD || 400;
  
  const printWaste = numColors! > 0 
    ? (cSetup + (printMeters / pA * pB) + (printMeters > pC ? printMeters / pC * pD : 0)) 
    : 0;
  const inkPrice = layer1.inkPricePerColor || (layer1.isPETorPA ? 135 : 120);
  const printCPSX = numColors! > 0 
    ? (numColors! * inkPrice * coverageRatio + constants.laborCost + metallicSurcharge) 
    : 0;
  const printCostCPSX = printCPSX * (printWaste + printMeters) * printNLWidth;
  const printCostMaterial = (layer1.pricePerM2 || 0) * (printWaste + printMeters) * printNLWidth;
  const printTotalCost = printCostCPSX + printCostMaterial;

  let cutCPSX = 0;
  let cutCostCPSX = 0;
  let cutTotalCost = 0;

  const isMang = input.productType === 'mang';

  if (!isMang) {
    const cutBase = constants.cutBase || 971;
    const cutT1 = constants.cutThreshold1 || 0.07;
    const cutT2 = constants.cutThreshold2 || 0.2;
    const cutM1 = constants.cutMult1 || 1.4;
    const cutM2 = constants.cutMult2 || 1.2;
    const cutM3 = constants.cutMult3 || 0.8;
    
    if (bagArea < cutT1)           cutCPSX = cutBase * cutM1;
    else if (bagArea < cutT2)      cutCPSX = cutBase * cutM2;
    else                           cutCPSX = cutBase * cutM3;
    
    cutCostCPSX = cutCPSX * (cutWaste + cutMeters) * cutWidth;
    cutTotalCost = cutCostCPSX;
  }

  const totalProductionCost = printTotalCost + totalLamCost + cutTotalCost;

  const profitRate = lookupProfit(totalProductionCost, profitColumn, profitTable);
  const profitAmount = profitRate * totalProductionCost;
  const revenue = totalProductionCost + profitAmount;

  const costPerUnit = quantity > 0 ? revenue / quantity : 0;

  const rawThickness = layer1.thickness
    + (layer2 ? layer2.thickness : 0)
    + (layer3 ? layer3.thickness : 0)
    + (layer4 ? layer4.thickness : 0)
    + (layer5 ? layer5.thickness : 0);

  const activeLayersCount = 1 + (layer2 ? 1 : 0) + (layer3 ? 1 : 0) + (layer4 ? 1 : 0) + (layer5 ? 1 : 0);
  const addedMic = (activeLayersCount - 1) * 3;
  const totalThickness = Math.round((rawThickness + addedMic) / 5) * 5;

  const layerGSM = (thk: number, dens: number) => (thk / 1000000) * (dens * 1000000);
  const totalGSM = layerGSM(layer1.thickness, layer1.density)
    + (layer2 ? layerGSM(layer2.thickness, layer2.density) : 0)
    + (layer3 ? layerGSM(layer3.thickness, layer3.density) : 0)
    + (layer4 ? layerGSM(layer4.thickness, layer4.density) : 0)
    + (layer5 ? layerGSM(layer5.thickness, layer5.density) : 0);

  // Zipper: mỗi túi cần 1 đoạn zipper dài = bước cắt (cutStep)
  const zipperTotal = hasZipper ? quantity * cutStep * constants.zipperPrice : 0;
  const zipperPerUnit = quantity > 0 ? zipperTotal / quantity : 0;
  const zipperWeightTotal = hasZipper ? quantity * cutStep * zipperWeight : 0;

  // Tape: tương tự zipper, mỗi túi = bước cắt
  const tapeTotal = hasTape ? quantity * cutStep * constants.tapePrice : 0;
  const tapePerUnit = quantity > 0 ? tapeTotal / quantity : 0;
  const tapeWeightTotal = hasTape ? quantity * cutStep * tapeWeight : 0;

  const handleTotal = hasHandle ? quantity * constants.handlePrice : 0;
  const handlePerUnit = hasHandle ? constants.handlePrice : 0;

  const extraAccessoryWeightPerUnit = quantity > 0 ? (zipperWeightTotal + tapeWeightTotal) / quantity : 0;

  const filmRollLength = input.filmRollLength || 6000;
  // Diện tích cuộn màng TP = khổ trải × chiều dài cuộn / số con hình
  const filmRollArea = isMang ? (spreadWidth * filmRollLength / numImages) : 0;

  const actualBagsPerBox = bagsPerBox || 0;
  const actualBoxPrice = boxPrice || 0;

  let numBoxes: number;
  let boxTotal: number;
  let boxPerUnit: number;
  let packagingPerUnit: number;

  if (isMang) {
    // Màng: guard filmRollArea <= 0 → không tính đóng gói (tránh NaN/Infinity)
    if (actualBoxPrice > 0 && filmRollArea > 0) {
      // Phí đóng gói / m² = giá_đóng_gói / diện_tích_cuộn
      packagingPerUnit = actualBoxPrice / filmRollArea;
      boxPerUnit = packagingPerUnit;
      boxTotal = boxPerUnit * quantity;
      numBoxes = quantity / filmRollArea;
    } else {
      packagingPerUnit = 0;
      boxPerUnit = 0;
      boxTotal = 0;
      numBoxes = filmRollArea > 0 ? quantity / filmRollArea : 0;
    }
  } else {
    // Túi: tính theo thùng
    numBoxes = actualBagsPerBox > 0 ? quantity / actualBagsPerBox : 0;
    boxTotal = actualBoxPrice * numBoxes;
    boxPerUnit = quantity > 0 ? boxTotal / quantity : 0;
    packagingPerUnit = boxPerUnit;
  }

  // Túi: trọng lượng/túi = GSM × diện tích 1 túi
  // Màng: trọng lượng/m² = GSM × 1.0 m² (1 unit = 1 m²)
  const unitArea = isMang ? 1.0 : bagArea;
  const tareWeight = totalGSM * unitArea + handleWeight + extraAccessoryWeightPerUnit;

  // Vận chuyển: tổng phí = đơn giá/km × km, chia đều cho số túi/m²
  const actualShippingPerKm = shippingPerKm || 0;
  const actualShippingKm = shippingKm || 0;
  const shippingRate = actualShippingPerKm * actualShippingKm;
  const shippingTotal = shippingRate;
  const shippingPerUnit = quantity > 0 ? shippingTotal / quantity : 0;

  // Lãi vay: tính theo số ngày thanh toán thực tế
  const paymentDaysLocal = input.paymentDays || 30;
  const interestRate30 = input.paymentInterestRate || 0.0025;
  const interestPerUnit = (interestRate30 / 30) * paymentDaysLocal * costPerUnit;

  const commissionFixedVND = input.commissionFixedVND || 0;
  // Ưu tiên commissionUnit để tránh nhầm khi user đổi mode
  const commissionPerUnit = input.commissionUnit === 'vnd'
    ? commissionFixedVND
    : commissionRate * costPerUnit;

  const finalPrice = costPerUnit + zipperPerUnit + tapePerUnit + handlePerUnit + boxPerUnit
    + shippingPerUnit + interestPerUnit + commissionPerUnit;

  // cylLength = 0 nghĩa là chưa có thông tin trục → cylinderCost = 0
  const cylLengthLocal = input.cylLength ?? 0;
  const cylCircumLocal = input.cylCircum ?? 0;
  const cylUnitPriceLocal = input.cylUnitPrice || constants.cylinderPricePerUnit;
  const cylAreaLocal = cylLengthLocal * cylCircumLocal;
  const cylinderCostPerUnitLocal = cylAreaLocal * cylUnitPriceLocal;
  const cylinderCostLocal = cylinderCostPerUnitLocal * (numColors || 0);

  const productionDays = Math.ceil(quantity / 30000) + 4;

  let structureText = layer1.name + ' ' + layer1.thickness;
  if (layer2) structureText += '//' + layer2.name + ' ' + layer2.thickness;
  if (layer3) structureText += '//' + layer3.name + ' ' + layer3.thickness;
  if (layer4) structureText += '//' + layer4.name + ' ' + layer4.thickness;
  if (layer5) structureText += '//' + layer5.name + ' ' + layer5.thickness;

  return {
    input,
    structureText,
    totalThickness,
    totalGSM,
    bagArea, totalArea, printWidth, filmLength,
    cutWidth, cutMeters, cutWaste, cutCPSX, cutCostCPSX, cutTotalCost,
    printNLWidth, printMeters, printWaste, printCPSX, printCostCPSX, printCostMaterial, printTotalCost,
    totalProductionCost, totalLamCost, profitRate, profitAmount, revenue,
    costPerUnit,
    zipperPerUnit, zipperTotal, tapePerUnit, tapeTotal, handlePerUnit, handleTotal,
    boxPerUnit, boxTotal, actualBoxPrice, actualBagsPerBox, numBoxes, filmRollArea, packagingPerUnit,
    tareWeight, shippingPerUnit, shippingTotal, shippingRate,
    actualShippingPerKm, actualShippingKm,
    interestPerUnit, interestRate30, paymentDays: paymentDaysLocal,
    commissionPerUnit,
    finalPrice,
    cylinderCost: cylinderCostLocal,
    cylinderCostPerUnit: cylinderCostPerUnitLocal,
    cylArea: cylAreaLocal,
    cylLength: cylLengthLocal,
    cylCircum: cylCircumLocal,
    productionDays,
    layers: {
      print: { material: layer1, width: printNLWidth, meters: printMeters, waste: printWaste, cpsx: printCPSX, costCPSX: printCostCPSX, costMat: printCostMaterial, total: printTotalCost },
      laminations,
      cut: { width: cutWidth, meters: cutMeters, waste: cutWaste, cpsx: cutCPSX, costCPSX: cutCostCPSX, total: cutTotalCost },
    }
  };
}
