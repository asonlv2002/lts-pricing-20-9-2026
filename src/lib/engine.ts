import { CalculateInput, CalculateResult, Material, AppConstants, ProfitRow } from './types';
import { PROFIT_DEFAULT } from './data';

function getMaterial(id: string, materials: Material[]): Material | undefined {
  return materials.find(m => m.id === id);
}

function lookupProfit(totalCost: number, column: number, profitTable: ProfitRow[]): number {
  const col = column === 1 ? 'col1' : 'col2';
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
  const totalArea = quantity * bagArea;
  const printWidth = spreadWidth * numImages + 0.02;
  const filmLength = printWidth > 0 ? totalArea / printWidth : 0;

  const cutWidth = printWidth;
  const cutMeters = filmLength;
  const cutWaste = cutMeters / 3000 * 20 + 100;
  const cutWastePercent = numLaminations <= 1 ? 3 : 6;

  const laminations: any[] = [];
  const lamChain = [
    { layer: layer5, num: 5 }, { layer: layer4, num: 4 },
    { layer: layer3, num: 3 }, { layer: layer2, num: 2 }
  ].filter(item => !!item.layer);
  
  let currentNeededMeters = cutMeters + cutWaste;

  lamChain.forEach(({ layer, num }) => {
    if (!layer) return;
    const width = cutWidth + 0.02;
    const meters = currentNeededMeters;
    const waste = meters / 3000 * 20 + 100;
    const cpsx = constants.ghepCPSX;
    const costCPSX = cpsx * (waste + meters) * width;
    const costMat = (layer.pricePerM2 || 0) * (waste + meters) * width;
    
    laminations.unshift({
      layerNum: num, material: layer, width, meters, waste, cpsx, costCPSX, costMat, total: costCPSX + costMat
    });
    currentNeededMeters = meters + waste;
  });

  const totalLamWaste = laminations.reduce((sum, lam) => sum + lam.waste, 0);
  const totalLamCost = laminations.reduce((sum, lam) => sum + lam.total, 0);

  const printNLWidth = cutWidth + 0.02;
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

  let cutCPSX;
  const cutBase = constants.cutBase || 971;
  const cutT1 = constants.cutThreshold1 || 0.07;
  const cutT2 = constants.cutThreshold2 || 0.2;
  const cutM1 = constants.cutMult1 || 1.4;
  const cutM2 = constants.cutMult2 || 1.2;
  const cutM3 = constants.cutMult3 || 0.8;
  
  if (bagArea < cutT1)           cutCPSX = cutBase * cutM1;
  else if (bagArea < cutT2)      cutCPSX = cutBase * cutM2;
  else                           cutCPSX = cutBase * cutM3;
  
  const cutCostCPSX = cutCPSX * (cutWaste + cutMeters) * cutWidth;
  const cutTotalCost = cutCostCPSX;

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

  const zipperTotal = hasZipper ? (cutMeters + cutWaste) * constants.zipperPrice : 0;
  const zipperPerUnit = quantity > 0 ? zipperTotal / quantity : 0;
  const zipperWeightTotal = hasZipper ? (cutMeters + cutWaste) * zipperWeight : 0;

  const tapeTotal = hasTape ? (cutMeters + cutWaste) * constants.tapePrice : 0;
  const tapePerUnit = quantity > 0 ? tapeTotal / quantity : 0;
  const tapeWeightTotal = hasTape ? (cutMeters + cutWaste) * tapeWeight : 0;

  const handleTotal = hasHandle ? quantity * constants.handlePrice : 0;
  const handlePerUnit = hasHandle ? constants.handlePrice : 0;

  const extraAccessoryWeightPerUnit = quantity > 0 ? (zipperWeightTotal + tapeWeightTotal) / quantity : 0;

  const actualBagsPerBox = bagsPerBox || 0;
  const actualBoxPrice = boxPrice || 0;
  const numBoxes = actualBagsPerBox > 0 ? quantity / actualBagsPerBox : 0;
  const boxTotal = actualBoxPrice * numBoxes;
  const boxPerUnit = quantity > 0 ? boxTotal / quantity : 0;

  const tareWeight = totalGSM * bagArea + handleWeight + extraAccessoryWeightPerUnit;

  const actualShippingPerKm = shippingPerKm || 0;
  const actualShippingKm = shippingKm || 0;
  const shippingRate = actualShippingPerKm * actualShippingKm;
  const totalWeightTons = tareWeight * quantity / 1000000;
  const shippingTotal = totalWeightTons * shippingRate;
  const shippingPerUnit = quantity > 0 ? shippingTotal / quantity : 0;

  const paymentDaysLocal = input.paymentDays || 30;
  const interestRate30 = input.paymentInterestRate || 0.0025;
  const interestPerUnit = interestRate30 * costPerUnit;

  const commissionFixedVND = input.commissionFixedVND || 0;
  let commissionPerUnit;
  if (commissionFixedVND > 0) {
    commissionPerUnit = commissionFixedVND;
  } else {
    commissionPerUnit = commissionRate * costPerUnit;
  }

  const finalPrice = costPerUnit + zipperPerUnit + tapePerUnit + handlePerUnit + boxPerUnit
    + shippingPerUnit + interestPerUnit + commissionPerUnit;

  const cylLengthLocal = input.cylLength || 0.63;
  const cylCircumLocal = input.cylCircum || 0.4;
  const cylUnitPriceLocal = input.cylUnitPrice || constants.cylinderPricePerUnit;
  const cylAreaLocal = cylLengthLocal * cylCircumLocal;
  const cylinderCostPerUnitLocal = cylAreaLocal * cylUnitPriceLocal;
  const cylinderCostLocal = cylinderCostPerUnitLocal * numColors!;

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
    cutWidth, cutMeters, cutWaste, cutWastePercent, cutCPSX, cutCostCPSX, cutTotalCost,
    printNLWidth, printMeters, printWaste, printCPSX, printCostCPSX, printCostMaterial, printTotalCost,
    totalProductionCost, totalLamCost, profitRate, profitAmount, revenue,
    costPerUnit,
    zipperPerUnit, zipperTotal, tapePerUnit, tapeTotal, handlePerUnit, handleTotal,
    boxPerUnit, boxTotal, actualBoxPrice, actualBagsPerBox, numBoxes,
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
