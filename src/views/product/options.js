/**
 * 产品模块 - 下拉选项与枚举
 *
 * 说明：
 *   1) 产品类目来自后端 dict_category_return_threshold（33 项），走 /api/dict/category，
 *      不再在前端写死。佣金类目 dict_category_commission 只在计算利润时用，
 *      两套字典各自独立、不联动 —— 别在这里把它们关联起来。
 *   2) 头程方式对应后台 dict_first_leg_method，选中后自动带出「材积比」与「默认单价」。
 *   3) 尺寸分段阈值复用利润计算器那份，避免两边各写一份导致漂移。
 */

/* 尺寸分段的阈值与换算因子复用利润计算器那份，避免两边各写一份导致漂移 */
import { sizeTierRules, UNIT_FACTORS } from "@/views/tools/profit-calculator/dict.js";
import { resolveSizeTier } from "@/views/tools/profit-calculator/calc.js";
import { reactive } from "vue";
import { getCategoryOptions } from "@/api/dict.js";

/* ------------------------------------------------------------------ */
/* 产品类目：后端读取，模块级缓存                                        */
/* ------------------------------------------------------------------ */
/* 用 reactive 包一层，这样接口回来后用到它的页面会自动刷新，
   不需要每个页面自己维护一份 state */
export const categoryState = reactive({
  options: [],
  loading: false,
  loaded: false,
  error: false,
});

console.log('已经调用后端拿到类目数据')

/** 加载产品类目（已加载过就直接返回，不会重复打接口） */
export async function loadCategoryOptions(force = false) {
  if (categoryState.loaded && !force) return categoryState.options;
  if (categoryState.loading) return categoryState.options;

  categoryState.loading = true;
  categoryState.error = false;
  try {
    const list = await getCategoryOptions();
    console.log(list)
    categoryState.options = Array.isArray(list) ? list : [];
    categoryState.loaded = true;
  } catch (e) {
    categoryState.error = true;
    categoryState.options = [];
  } finally {
    categoryState.loading = false;
  }
  return categoryState.options;
}


/** code → 名称；字典没加载完时回落显示 code，不会闪空白 */
export function getCategoryName(code) {
  if (!code) return "";
  const hit = categoryState.options.find(item => item.code === code);
  return hit ? hit.name : code;
}

/* ------------------------------------------------------------------ */
/* 头程方式：选中后自动带出材积比与默认单价                            */
/* ------------------------------------------------------------------ */
export const FIRST_LEG_METHOD_OPTIONS = [
  {
    code: "SEA",
    name: "海运普船",
    volumeDivisor: 5000,
    defaultUnitPrice: 8,
    remark: "35~45 天；轻泡货另算体积重",
  },
  {
    code: "SEA_EXPRESS",
    name: "海运快线",
    volumeDivisor: 5000,
    defaultUnitPrice: 14,
    remark: "18~25 天；美森快船类",
  },
  {
    code: "AIR",
    name: "空运",
    volumeDivisor: 6000,
    defaultUnitPrice: 32,
    remark: "7~12 天；补货、新品试销",
  },
  {
    code: "EXPRESS",
    name: "国际快递",
    volumeDivisor: 6000,
    defaultUnitPrice: 55,
    remark: "3~5 天；样品、紧急补货",
  },
  {
    code: "CUSTOM",
    name: "自填",
    volumeDivisor: null,
    defaultUnitPrice: 0,
    remark: "选此项后单价由用户手工填写",
  },
];

/* 头程方式 code → 对象映射 */
export const firstLegMethodMap = FIRST_LEG_METHOD_OPTIONS.reduce((map, item) => {
  map[item.code] = item;
  return map;
}, {});

/* ------------------------------------------------------------------ */
/* 配送方式：决定哪一组费用字段生效（两个「配送总费用」互斥）            */
/* ------------------------------------------------------------------ */
/*
 * ⚠️ 系统里有两个「配送总费用」，按配送方式二选一，币种和来源都不同：
 *    亚马逊SEND     → 配送总费用($)：亚马逊后台核算、美元，当前产品的费用（不是整票货件）；
 *    自己选择承运人 → 配送总费用(￥)：自己找物流商结算、人民币，与「头程运费单价」同组填写。
 *    两者不互相换算，表单按配送方式条件显示，同一时刻只会出现其中一个。
 *
 * 「商品总数量(件)」两种模式都填，且只记当前产品的数量，不记单票货件总数。
 */
export const SHIPPING_METHOD_OPTIONS = [
  {
    code: "AMAZON_SEND",
    name: "亚马逊SEND",
    remark: "填「配送总费用($)」：当前产品的配送费，无需填运费单价",
  },
  {
    code: "SELF_CARRIER",
    name: "自己选择承运人",
    remark: "填「头程运费单价」+「配送总费用(￥)」：按单价 × 计费重计算",
  },
];

/* 配送方式 code → 对象映射 */
export const shippingMethodMap = SHIPPING_METHOD_OPTIONS.reduce((map, item) => {
  map[item.code] = item;
  return map;
}, {});

/**
 * 配送方式展示名。空值（历史数据）按「自己选择承运人」处理，
 * 因为加这个字段之前录的产品全是自选承运人模式
 */
export function getShippingMethodName(code) {
  if (!code) return "自己选择承运人";
  return shippingMethodMap[code]?.name || code;
}

/** 是否亚马逊 SEND 模式（空值视为否，与 getShippingMethodName 口径一致） */
export function isAmazonSend(code) {
  return code === "AMAZON_SEND";
}

/* ------------------------------------------------------------------ */
/* 配送状态：预计送达 → 确认送达 → 提前 / 准时 / 晚送达                  */
/* ------------------------------------------------------------------ */
/*
 * 口径与后端 DeliveryStatus 枚举严格一致，改一边必须改另一边：
 *   判定：实际送达日期 − 预计送达日期，按自然日比较，同一天 = 准时
 *   时间：统一北京时间（后端由 ZoneId Asia/Shanghai 生成，前端取本地日期）
 * 「是否已确认送达」= actual_delivery_time 是否为空，不另外设锁定标记。
 * 确认后预计送达时间不可改，要改必须先「撤销确认」。
 */
export const DELIVERY_STATUS_OPTIONS = [
  { code: "NOT_SET", name: "未填写", tag: "info", color: "#94a3b8" },
  { code: "IN_TRANSIT", name: "配送中", tag: "primary", color: "#626aef" },
  { code: "EARLY", name: "提前送达", tag: "success", color: "#22c55e" },
  { code: "ON_TIME", name: "准时送达", tag: "success", color: "#3b7ddd" },
  { code: "LATE", name: "晚送达", tag: "danger", color: "#ef4444" },
];

/* 配送状态 code → 对象映射 */
export const deliveryStatusMap = DELIVERY_STATUS_OPTIONS.reduce((map, item) => {
  map[item.code] = item;
  return map;
}, {});

/* 表格列用的枚举格式 */
export const DELIVERY_STATUS_ENUM = DELIVERY_STATUS_OPTIONS.map(item => ({
  value: item.code,
  label: item.name,
  tagType: item.tag,
}));

/** 是否已确认送达：以实际送达时间为准（后端同口径） */
export function isDelivered(row) {
  return !!row?.actual_delivery_time;
}

/** 配送状态对象；没状态时按「没有预计送达时间 = 未填写」兜底 */
export function getDeliveryStatus(row) {
  const code = row?.delivery_status || (row?.expected_delivery_date ? "IN_TRANSIT" : "NOT_SET");
  return deliveryStatusMap[code] || deliveryStatusMap.NOT_SET;
}

/**
 * 送达天数差的展示文案：提前 2 天 / 准时 / 晚 3 天
 * 没确认送达时返回空串（此时天数差没有意义）
 */
export function getDeliveryDaysText(row) {
  if (!isDelivered(row)) return "";
  const days = Number(row?.delay_days);
  if (!Number.isFinite(days)) return "";
  if (days === 0) return "准时";
  return days < 0 ? `提前 ${Math.abs(days)} 天` : `晚 ${days} 天`;
}

/**
 * 确认前的预判：拿预计送达日期与「今天」比，算出会判成什么结果。
 * 只在确认弹窗里给用户看，真正入库的判定以后端时间为准。
 * @param {String} expectedDate "YYYY-MM-DD"
 * @param {Date} now 默认取当前时间，便于测试
 */
export function previewDeliveryResult(expectedDate, now = new Date()) {
  if (!expectedDate) return null;
  // 按自然日比较：两边都归到当天 00:00，避免时分秒影响天数差
  const expected = new Date(`${String(expectedDate).slice(0, 10)}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (Number.isNaN(expected.getTime())) return null;

  const days = Math.round((today - expected) / 86400000);
  const code = days < 0 ? "EARLY" : days > 0 ? "LATE" : "ON_TIME";
  return {
    days,
    code,
    statusName: deliveryStatusMap[code].name,
    text: days === 0 ? "准时" : days < 0 ? `提前 ${Math.abs(days)} 天` : `晚 ${days} 天`,
  };
}

/* ------------------------------------------------------------------ */
/* 产品状态                                                            */
/* color 用于列表页的「状态圆点」，比整块 el-tag 视觉噪音更小            */
/* ------------------------------------------------------------------ */
export const PRODUCT_STATUS_OPTIONS = [
  { code: "DRAFT", name: "待评估", tag: "info", color: "#94a3b8" },
  { code: "SELECTED", name: "已选", tag: "success", color: "#22c55e" },
  { code: "OFFLINE", name: "已下架", tag: "danger", color: "#ef4444" },
];

/* 产品状态 code → 对象映射 */
export const productStatusMap = PRODUCT_STATUS_OPTIONS.reduce((map, item) => {
  map[item.code] = item;
  return map;
}, {});

/* 表格列用的枚举格式（RhTable 的 column.enum 要求 value / label / tagType） */
export const STATUS_ENUM = PRODUCT_STATUS_OPTIONS.map(item => ({
  value: item.code,
  label: item.name,
  tagType: item.tag,
}));

/* el-select 的 options 默认取 label / value，这里是 code / name，统一用这份 props */
export const CODE_NAME_PROPS = { label: "name", value: "code" };

/* ------------------------------------------------------------------ */
/* 全局参数（对应后台 sys_config 表）                                    */
/* ------------------------------------------------------------------ */
/* 后端 /api/config 接口就绪前先写死，值与 docs/data/sys_config.sql 保持一致；
   就绪后这里改为异步加载，字段名沿用 config_key 的小驼峰 */
export const GLOBAL_CONFIG = {
  /** 默认关税率 DEFAULT_TARIFF_RATE：0.25 = 25%（占位值，需按真实 HS 编码税率修正） */
  tariffRate: 0.25,
};

/** 关税率展示文本：0.25 → "25%"（去掉多余的 0） */
export const tariffRateText = `${Number((GLOBAL_CONFIG.tariffRate * 100).toFixed(2))}%`;

/* ------------------------------------------------------------------ */
/* 尺寸分段：由「长/宽/高 + 含包装实重」自动匹配，不提供人工选择          */
/* ------------------------------------------------------------------ */
/*
 * 阈值不在这里写死 —— 直接复用利润计算器的 sizeTierRules / resolveSizeTier，
 * 保证「录入页算出的分段」和「计算器算出来的分段」永远一致。
 * TODO：后端字典接口（/api/dict/fba-size-tier）就绪后，两边一起改为从接口取。
 */
export const SIZE_TIER_OPTIONS = [
  {
    code: "small",
    name: sizeTierRules.smallStandard.label,
    tag: "success",
    rule: "长≤15in 宽≤12in 高≤0.75in 且 实重≤1lb",
  },
  {
    code: "large",
    name: sizeTierRules.largeStandard.label,
    tag: "warning",
    rule: "长≤18in 宽≤14in 高≤8in 且 实重≤20lb",
  },
  { code: "oversize", name: "大件/超大件", tag: "danger", rule: "超出大号标准上限，需后台核对" },
];

/* 分段 code → 对象映射 */
export const sizeTierMap = SIZE_TIER_OPTIONS.reduce((map, item) => {
  map[item.code] = item;
  return map;
}, {});

/* 表格列用的枚举格式 */
export const SIZE_TIER_ENUM = SIZE_TIER_OPTIONS.map(item => ({
  value: item.code,
  label: item.name,
  tagType: item.tag,
}));

/**
 * 按公制入参匹配尺寸分段
 * @param {Object} p 产品字段，取 length_cm / width_cm / height_cm / packaged_weight_g
 * @returns {String|null} small / large / oversize；入参不全返回 null
 */
export function resolveSizeTierByMetric(p = {}) {
  const l = Number(p.length_cm);
  const w = Number(p.width_cm);
  const h = Number(p.height_cm);
  const g = Number(p.packaged_weight_g);
  // 四个值都得是有效数字，缺一个就不给结论（避免半填状态下误判成小号）
  if (![l, w, h, g].every(v => Number.isFinite(v) && v > 0)) return null;

  // 换算后保留 2 位小数，与后端 SizeTierService 的 setScale(2, HALF_UP) 对齐，
  // 否则临界尺寸（如高 1.90cm）会出现前后端判定不一致
  const inch = cm => Number((cm * UNIT_FACTORS.cmToInch).toFixed(2));
  const sizeInch = { l: inch(l), w: inch(w), h: inch(h) };
  const weightLb = (g / 1000) * UNIT_FACTORS.kgToLb;
  return resolveSizeTier(sizeInch, weightLb).key;
}
