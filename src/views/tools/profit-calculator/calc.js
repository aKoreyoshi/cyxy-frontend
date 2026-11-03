/**
 * FBA 利润计算器 - 纯计算逻辑
 *
 * 这是对 Excel 主表《FBA产品利润计算》21 条公式的等价迁移。
 * 保持纯函数形态（入参 → 出参，无副作用），方便后续 1:1 搬到 Java Service 层。
 *
 * 单元格对照（便于回查原表）：
 *   K10/L10/M10 → sizeCm        Q10/R10/S10 → sizeInch
 *   L11 → volWeightKg           R12 → weightLb        L22 → firstLegCostCny
 *   R14 → sizeTierLabel         S14 → fbaFeeUsd       S16 → commissionRate
 *   S19 → returnThreshold       S20 → thresholdDiff   S21 → returnCostCny
 *   G21 → totalCostCny          G22 → advanceCostCny  R22 → fbaTotalCny
 *   Y21 → profitCny             Y22 → marginRate
 */

import {
  DEFAULT_EXCHANGE_RATE,
  UNIT_FACTORS,
  commissionCategories,
  returnThresholds,
  sizeTierRules,
  fbaSmallStandardRates,
  fbaLargeStandardRates,
  fbaStepRates,
  fbaOversizeRates,
  FUEL_SURCHARGE_RATE,
  CALC_CONST,
} from "./dict.js";

/** 保留小数位（避免浮点尾巴） */
const round = (n, d = 2) => Number((n || 0).toFixed(d));

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** 百分号形式的输入转成比率：15 → 0.15 */
const pct = v => (Number(v) || 0) / 100;

export const findCommissionCategory = name => commissionCategories.find(i => i.name === name) || null;
export const findReturnThreshold = name => {
  const item = returnThresholds.find(i => i.name === name);
  return item ? item.threshold : 0;
};

/**
 * 佣金计算 —— 这是移植到系统后修复的关键缺口
 * 原表里 VLOOKUP 只能命中单行，分档类目永远按第一档算；这里按售价自动判定。
 */
export function calcCommission(cat, priceUsd, useMinCommission = false) {
  if (!cat || !priceUsd) return { amount: 0, rate: cat?.rate || 0 };

  let amount = 0;

  if (cat.mode === "flat") {
    amount = priceUsd * cat.rate;
  } else if (cat.mode === "full") {
    // 全额跳档：总价落哪一档，整套按该档费率
    const tier = cat.tiers.find(t => t.max === null || priceUsd <= t.max) || cat.tiers[cat.tiers.length - 1];
    amount = priceUsd * tier.rate;
  } else {
    // 分段累进：各区间分别计算后相加
    let prev = 0;
    for (const tier of cat.tiers) {
      const upper = tier.max === null ? Infinity : tier.max;
      if (priceUsd <= prev) break;
      amount += (Math.min(priceUsd, upper) - prev) * tier.rate;
      prev = upper;
    }
  }

  if (useMinCommission && cat.minCommission) {
    amount = Math.max(amount, cat.minCommission);
  }

  return { amount, rate: cat.mode === "flat" ? cat.rate : amount / priceUsd };
}

/** 尺寸分段判定（R14） */
export function resolveSizeTier(sizeInch, weightLb) {
  const s = sizeTierRules.smallStandard;
  const l = sizeTierRules.largeStandard;
  if (sizeInch.l <= s.maxLength && sizeInch.w <= s.maxWidth && sizeInch.h <= s.maxHeight && weightLb <= s.maxWeightLb) {
    return { key: "small", label: s.label };
  }
  if (sizeInch.l <= l.maxLength && sizeInch.w <= l.maxWidth && sizeInch.h <= l.maxHeight && weightLb <= l.maxWeightLb) {
    return { key: "large", label: l.label };
  }
  return { key: "oversize", label: "大件/超大件(需后台核对)" };
}

/** 尾程配送费（S14），已含 3.5% 燃油附加 */
export function calcFbaFee(sizeTierKey, sizeInch, weightLb, billWeightLb, priceUsd) {
  const band = priceUsd < CALC_CONST.priceBandLow ? "low" : priceUsd <= CALC_CONST.priceBandMid ? "mid" : "high";
  const bandLabel = { low: "< $10", mid: "$10 ~ $50", high: "> $50" }[band];

  let beforeFuel = 0;
  if (sizeTierKey === "small") {
    const row = clamp(Math.ceil((weightLb * CALC_CONST.ozPerLb) / CALC_CONST.smallStandardStepOz), 1, fbaSmallStandardRates.length);
    beforeFuel = fbaSmallStandardRates[row - 1][band];
  } else if (sizeTierKey === "large") {
    const totalOz = billWeightLb * CALC_CONST.ozPerLb;
    if (totalOz <= CALC_CONST.largeStandardOzLimit) {
      const row = clamp(Math.ceil(totalOz / CALC_CONST.largeStandardStepOz), 1, fbaLargeStandardRates.length);
      beforeFuel = fbaLargeStandardRates[row - 1][band];
    } else {
      const step = fbaStepRates[band];
      beforeFuel = step.base + step.step * Math.ceil((totalOz - CALC_CONST.largeStandardOzLimit) / CALC_CONST.largeStandardStepOz);
    }
  } else {
    beforeFuel = fbaOversizeRates.firstPound + fbaOversizeRates.perExtraPound * Math.max(0, Math.ceil(billWeightLb - 1));
  }

  return { band, bandLabel, beforeFuel, fee: beforeFuel * (1 + FUEL_SURCHARGE_RATE) };
}

/**
 * 主计算入口
 * @param {Object} form 页面表单（百分比字段均为「数字百分制」，如 15 表示 15%）
 */
export function calculate(form) {
  const price = Number(form.salePriceUsd) || 0;
  const rate = Number(form.exchangeRate) || 0;

  /* 1. 尺寸规范化 —— 与原表一致：先换算再保留 2 位小数 */
  const cmFactor = form.sizeUnit === "cm" ? 1 : UNIT_FACTORS.inchToCm;
  const inchFactor = form.sizeUnit === "cm" ? UNIT_FACTORS.cmToInch : 1;
  const sizeCm = {
    l: round((Number(form.length) || 0) * cmFactor, 2),
    w: round((Number(form.width) || 0) * cmFactor, 2),
    h: round((Number(form.height) || 0) * cmFactor, 2),
  };
  const sizeInch = {
    l: round((Number(form.length) || 0) * inchFactor, 2),
    w: round((Number(form.width) || 0) * inchFactor, 2),
    h: round((Number(form.height) || 0) * inchFactor, 2),
  };

  /* 2. 抛货体积重（L11）与实重（R12） */
  const divisor = Number(form.volumeDivisor) || CALC_CONST.volumeDivisor;
  const volWeightKg = divisor ? (sizeCm.l * sizeCm.w * sizeCm.h) / divisor : 0;
  const volWeightLb = volWeightKg * UNIT_FACTORS.kgToLb;
  const weightKg = Number(form.weightKg) || 0;
  const weightLb = weightKg * UNIT_FACTORS.kgToLb;

  /* 3. 头程运费（L22）：取实重与抛重大者 × 单价 */
  const firstLegCostCny = Math.max(weightKg, volWeightKg) * (Number(form.firstLegPrice) || 0);

  /* 4. 尺寸分段 + 计费重（体积重 lb 参与取大） */
  const sizeTier = resolveSizeTier(sizeInch, weightLb);
  const dimWeightLb = (sizeInch.l * sizeInch.w * sizeInch.h) / CALC_CONST.dimDivisorInch;
  const billWeightLb = Math.max(weightLb, dimWeightLb);
  // 标注本次按哪一种重量计费：体积重压过实重时走 dim，否则走 actual
  const billWeightBasis = dimWeightLb > weightLb ? "dimensional" : "actual";

  /* 5. 尾程配送费（S14） */
  const fba = calcFbaFee(sizeTier.key, sizeInch, weightLb, billWeightLb, price);

  /* 6. 类目佣金（S16）——支持分档 */
  const cat = findCommissionCategory(form.commissionCategory);
  const commission = calcCommission(cat, price, form.useMinCommission);

  /* 7. 退货相关（S19 / S20 / S21） */
  const returnThreshold = findReturnThreshold(form.returnCategory);
  const returnRate = pct(form.returnRate);
  const thresholdDiff = Math.max(0, returnRate - returnThreshold);
  const returnFeeUsd = Number(form.returnFeeUsd) || 0;
  // 原表：((售价 × 佣金率 × 20% + 尾程配送费) × 退货率 + 阈值差 × 尾程退货费) × 汇率
  const returnCostCny =
    ((commission.amount * CALC_CONST.refundCommissionKeep + fba.fee) * returnRate + thresholdDiff * returnFeeUsd) * rate;

  /* 8. 汇总（G21 / G22 / R22 / Y21 / Y22） */
  const adRate = pct(form.adRate);
  const vatRate = pct(form.vatRate);
  const miscRate = pct(form.miscRate);
  const purchaseCost = Number(form.purchaseCost) || 0;
  const storageFeeUsd = Number(form.storageFeeUsd) || 0;

  // 到手收入 / 总成本：用「佣金金额」替代原来的「佣金费率 × 售价」，单一费率时结果完全一致
  const revenueCny = price * rate;
  const totalCostCny =
    ((adRate + vatRate + miscRate) * price + commission.amount + fba.fee + storageFeeUsd) * rate +
    purchaseCost +
    returnCostCny +
    firstLegCostCny;

  const advanceCostCny = purchaseCost + firstLegCostCny + commission.amount * rate;
  const fbaTotalCny = (fba.fee + storageFeeUsd + returnFeeUsd) * rate + returnCostCny;
  const profitCny = revenueCny - totalCostCny;
  const marginRate = revenueCny ? profitCny / revenueCny : 0;

  const targetMargin = pct(form.targetMargin ?? CALC_CONST.defaultTargetMargin * 100);

  return {
    sizeCm,
    sizeInch,
    volWeightKg,
    volWeightLb,
    weightLb,
    dimWeightLb,
    billWeightLb,
    billWeightBasis,
    firstLegCostCny,
    sizeTierKey: sizeTier.key,
    sizeTierLabel: sizeTier.label,
    priceBand: fba.band,
    priceBandLabel: fba.bandLabel,
    fbaFeeUsd: fba.fee,
    fbaFeeBeforeFuelUsd: fba.beforeFuel,
    category: cat,
    commissionRate: commission.rate,
    commissionAmountUsd: commission.amount,
    returnThreshold,
    returnRate,
    thresholdDiff,
    returnCostCny,
    purchaseCost,
    storageFeeUsd,
    returnFeeUsd,
    adRate,
    vatRate,
    miscRate,
    exchangeRate: rate,
    salePriceUsd: price,
    revenueCny,
    totalCostCny,
    advanceCostCny,
    fbaTotalCny,
    profitCny,
    marginRate,
    targetMargin,
    marginStatus: profitCny <= 0 ? "danger" : marginRate >= targetMargin ? "good" : "warn",
  };
}

/** 默认示例数据：与原 Excel 当前值一致（宠物用品 / 24×22.5×2 cm / 售价 $18.99） */
export function createDefaultForm() {
  return {
    sizeUnit: "cm",
    length: 28,
    width: 25,
    height: 3,
    purchaseCost: 15.22,
    adRate: 15,
    vatRate: 0,
    miscRate: 1,
    weightKg: 0.22,
    volumeDivisor: CALC_CONST.volumeDivisor,
    logisticsProvider: "",
    firstLegPrice: 46,
    commissionCategory: "宠物用品",
    returnCategory: "宠物用品",
    returnRate: 4.13,
    returnFeeUsd: 3.39,
    storageFeeUsd: 0,
    salePriceUsd: 18.99,
    exchangeRate: DEFAULT_EXCHANGE_RATE,
    targetMargin: 15,
    useMinCommission: false,
  };
}
