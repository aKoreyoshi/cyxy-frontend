/**
 * FBA 利润计算器 - 静态字典与常量
 *
 * 数据来源：cyxy-利润计算表格.xlsm（2026-01-15 版费率）
 * 对应原 Excel 的 6 张参数附件：
 *   000003 单位换算附件 / 000004 汇率附件 / 000005 类目销售佣金附件
 *   000006 类目退货阈值附件 / 000007 FBA费率与尺寸分段
 *
 * 说明：这里先写死在前端，保证页面可以独立运行。
 * 接数据库后，每一份数据对应后台的一张字典表，届时改成接口获取即可，字段结构保持一致。
 */

/* ------------------------------------------------------------------ */
/* 000004 汇率附件：USD → CNY                                          */
/* ⚠️ 这个 6.68 只是「页面刚打开、最新汇率接口还没返回」或接口挂了时的      */
/*    离线兜底值，已经不是业务真源。当前生效汇率以 sys_config「最新汇率」  */
/*    为准，进页面由 /api/exchange-rate/latest 回填到可编辑输入框。       */
/*    留着它是为了让本地计算永远有个合法初值，不至于算出 NaN。            */
/* ------------------------------------------------------------------ */
export const DEFAULT_EXCHANGE_RATE = 6.68;

/* ------------------------------------------------------------------ */
/* 000003 单位换算附件                                                 */
/* ------------------------------------------------------------------ */
export const UNIT_FACTORS = {
  cmToInch: 0.3937008,
  inchToCm: 2.54,
  kgToLb: 2.2046226,
  lbToKg: 0.4535924,
  ozToG: 28.3495231,
  gToOz: 0.035274,
};

/* ------------------------------------------------------------------ */
/* 000005 类目销售佣金附件                                             */
/*                                                                    */
/* 原表里分档类目是「一行一档」平铺的（如「家具 ≤$200」「家具 >$200」）， */
/* 下拉选中的是单行，VLOOKUP 只会命中第一行，导致高价商品仍按低档费率算。 */
/* 这里按「组」合并，由 calcCommission() 依据售价自动判定，修复了这个缺口。 */
/*                                                                    */
/* mode 取值：                                                         */
/*   flat     单一费率                                                 */
/*   full     全额跳档：总价落哪一档，整套按该档费率（原文「……的商品」）  */
/*   marginal 分段累进：各区间分别计算后相加（原文「……的部分」）         */
/* ------------------------------------------------------------------ */
export const commissionCategories = [
  { name: "亚马逊设备配件", mode: "flat", rate: 0.45, minCommission: 0.3, needApproval: false, remark: "收取45%的销售佣金" },
  { name: "Amazon Explore", mode: "flat", rate: 0.3, minCommission: 2, needApproval: false, remark: "收取30%（虚拟体验）的销售佣金" },
  {
    name: "母婴(婴儿服装除外)",
    mode: "full",
    tiers: [
      { max: 10, rate: 0.08 },
      { max: null, rate: 0.15 },
    ],
    minCommission: 0.3,
    needApproval: false,
    remark: "总价 ≤ $10 收 8%，超出后整套按 15%",
  },
  { name: "图书（包括收藏类图书）", mode: "flat", rate: 0.15, minCommission: null, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "摄影摄像", mode: "flat", rate: 0.08, minCommission: 0.3, needApproval: false, remark: "收取8%的销售佣金" },
  { name: "手机设备", mode: "flat", rate: 0.08, minCommission: 0.3, needApproval: false, remark: "收取8%的销售佣金" },
  { name: "电视/音响", mode: "flat", rate: 0.08, minCommission: 0.3, needApproval: false, remark: "收取8%的销售佣金" },
  {
    name: "电子产品配件",
    mode: "marginal",
    tiers: [
      { max: 100, rate: 0.15 },
      { max: null, rate: 0.08 },
    ],
    minCommission: 0.3,
    needApproval: false,
    remark: "$100 以内部分 15%，超出部分 8%",
  },
  {
    name: "家具(包括户外家具)",
    mode: "marginal",
    tiers: [
      { max: 200, rate: 0.15 },
      { max: null, rate: 0.1 },
    ],
    minCommission: 0.3,
    needApproval: false,
    remark: "$200 以内部分 15%，超出部分 10%",
  },
  { name: "家居与园艺", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "厨房用品", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "全尺寸电器", mode: "flat", rate: 0.08, minCommission: 0.3, needApproval: false, remark: "收取8%的销售佣金" },
  {
    name: "小型电器(包括零件和配件)",
    mode: "marginal",
    tiers: [
      { max: 300, rate: 0.15 },
      { max: null, rate: 0.08 },
    ],
    minCommission: 0.3,
    needApproval: false,
    remark: "$300 以内部分 15%，超出部分 8%",
  },
  { name: "床垫", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "音乐", mode: "flat", rate: 0.15, minCommission: null, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "乐器", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "办公用品", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "户外用品", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "个人电脑", mode: "flat", rate: 0.06, minCommission: 0.3, needApproval: false, remark: "收取6%的销售佣金" },
  { name: "宠物用品", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "软件和电脑/视频游戏", mode: "flat", rate: 0.15, minCommission: null, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "体育用品（体育收藏品除外）", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "工具和家居装修(不含电)", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "工具和家居装修(电动工具)", mode: "flat", rate: 0.12, minCommission: null, needApproval: false, remark: "基础设备电动工具为12%" },
  { name: "玩具和游戏", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "视频和 DVD", mode: "flat", rate: 0.15, minCommission: null, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "视频游戏机", mode: "flat", rate: 0.08, minCommission: 0.3, needApproval: false, remark: "收取8%的销售佣金" },
  { name: "其他", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: false, remark: "收取15%的销售佣金" },
  { name: "3D 打印商品", mode: "flat", rate: 0.12, minCommission: 0.3, needApproval: true, remark: "收取12%的销售佣金" },
  { name: "汽车用品(非轮胎和轮毂)", mode: "flat", rate: 0.12, minCommission: 0.3, needApproval: true, remark: "收取12%的销售佣金" },
  { name: "汽车用品(轮胎和轮毂)", mode: "flat", rate: 0.1, minCommission: null, needApproval: true, remark: "轮胎和轮毂商品为10%" },
  {
    name: "美妆",
    mode: "full",
    tiers: [
      { max: 10, rate: 0.08 },
      { max: null, rate: 0.15 },
    ],
    minCommission: 0.3,
    needApproval: true,
    remark: "总价 ≤ $10 收 8%，超出后整套按 15%",
  },
  { name: "服装与配饰（包括运动装）", mode: "flat", rate: 0.17, minCommission: 0.3, needApproval: true, remark: "收取17%的销售佣金" },
  { name: "收藏类图书", mode: "flat", rate: 0.15, minCommission: null, needApproval: true, remark: "收取15%的销售佣金" },
  {
    name: "硬币收藏品",
    mode: "marginal",
    tiers: [
      { max: 250, rate: 0.15 },
      { max: 1000, rate: 0.1 },
      { max: null, rate: 0.06 },
    ],
    minCommission: 0.3,
    needApproval: true,
    remark: "$250 以内 15%、$250~1000 10%、超出 6%",
  },
  {
    name: "娱乐收藏品",
    mode: "marginal",
    tiers: [
      { max: 100, rate: 0.2 },
      { max: 1000, rate: 0.1 },
      { max: null, rate: 0.06 },
    ],
    minCommission: null,
    needApproval: true,
    remark: "$100 以内 20%、$100~1000 10%、超出 6%",
  },
  {
    name: "艺术品",
    mode: "marginal",
    tiers: [
      { max: 100, rate: 0.2 },
      { max: 1000, rate: 0.15 },
      { max: 5000, rate: 0.1 },
      { max: null, rate: 0.05 },
    ],
    minCommission: null,
    needApproval: true,
    remark: "100/1000/5000 三档递进：20%、15%、10%、5%",
  },
  { name: "礼品卡", mode: "flat", rate: 0.2, minCommission: null, needApproval: true, remark: "收取20%的销售佣金" },
  {
    name: "食品",
    mode: "full",
    tiers: [
      { max: 15, rate: 0.08 },
      { max: null, rate: 0.15 },
    ],
    minCommission: null,
    needApproval: true,
    remark: "总价 ≤ $15 收 8%，超出后整套按 15%",
  },
  {
    name: "个护健康(含个护用品)",
    mode: "full",
    tiers: [
      { max: 10, rate: 0.08 },
      { max: null, rate: 0.15 },
    ],
    minCommission: 0.3,
    needApproval: true,
    remark: "总价 ≤ $10 收 8%，超出后整套按 15%",
  },
  { name: "工业和科学用品(含餐饮服务和清洁与卫生)", mode: "flat", rate: 0.12, minCommission: 0.3, needApproval: true, remark: "收取12%的销售佣金" },
  {
    name: "珠宝首饰",
    mode: "marginal",
    tiers: [
      { max: 250, rate: 0.2 },
      { max: null, rate: 0.05 },
    ],
    minCommission: 0.3,
    needApproval: true,
    remark: "$250 以内 20%、超出部分 5%",
  },
  { name: "箱包和旅行用品", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: true, remark: "收取15%的销售佣金" },
  { name: "鞋靴、手提包和太阳镜", mode: "flat", rate: 0.15, minCommission: 0.3, needApproval: true, remark: "收取15%的销售佣金" },
  {
    name: "体育收藏品",
    mode: "marginal",
    tiers: [
      { max: 100, rate: 0.15 },
      { max: 1000, rate: 0.1 },
      { max: null, rate: 0.06 },
    ],
    minCommission: null,
    needApproval: true,
    remark: "$100 以内 15%、$100~1000 10%、超出 6%",
  },
  {
    name: "钟表",
    mode: "marginal",
    tiers: [
      { max: 1500, rate: 0.16 },
      { max: null, rate: 0.03 },
    ],
    minCommission: 0.3,
    needApproval: true,
    remark: "$1500 以内 16%、超出部分 3%",
  },
];

/* ------------------------------------------------------------------ */
/* 000006 类目退货阈值附件（2024-06-01 生效）                          */
/* 注意：这套类目命名与佣金类目不一致（如「运动户外」vs「体育用品」），  */
/* 原表也是两张独立下拉，这里保持独立，不做合并。                        */
/* ------------------------------------------------------------------ */
export const returnThresholds = [
  { name: "亚马逊设备配件", threshold: 0.113 },
  { name: "汽车用品", threshold: 0.091 },
  { name: "母婴", threshold: 0.093 },
  { name: "背包、手提包和箱包", threshold: 0.128 },
  { name: "基础设备电动工具", threshold: 0.071 },
  { name: "美妆和个护健康", threshold: 0.055 },
  { name: "商业、工业与科学用品", threshold: 0.06 },
  { name: "小型电器", threshold: 0.126 },
  { name: "电脑", threshold: 0.114 },
  { name: "消费类电子产品", threshold: 0.112 },
  { name: "电子产品配件", threshold: 0.088 },
  { name: "所有其他分类", threshold: 0.048 },
  { name: "眼镜", threshold: 0.121 },
  { name: "艺术品", threshold: 0.056 },
  { name: "全尺寸电器", threshold: 0.119 },
  { name: "家具", threshold: 0.096 },
  { name: "食品", threshold: 0.029 },
  { name: "家居及厨房用品", threshold: 0.081 },
  { name: "珠宝首饰", threshold: 0.108 },
  { name: "草坪和花园", threshold: 0.077 },
  { name: "割草机和除雪机", threshold: 0.095 },
  { name: "床垫", threshold: 0.093 },
  { name: "媒介类商品 - 图书、DVD、音乐、软件、视频", threshold: 0.051 },
  { name: "乐器和影音制作", threshold: 0.092 },
  { name: "办公用品", threshold: 0.044 },
  { name: "宠物用品", threshold: 0.102 },
  { name: "运动户外", threshold: 0.087 },
  { name: "轮胎", threshold: 0.087 },
  { name: "工具和家居装修", threshold: 0.087 },
  { name: "玩具和游戏", threshold: 0.047 },
  { name: "视频游戏机", threshold: 0.107 },
  { name: "视频游戏和游戏配件", threshold: 0.065 },
  { name: "钟表", threshold: 0.12 },
];

/* ------------------------------------------------------------------ */
/* 000007 FBA费率与尺寸分段                                            */
/* ------------------------------------------------------------------ */

// 一、尺寸分段判定标准
export const sizeTierRules = {
  smallStandard: { label: "小号标准尺寸", maxLength: 15, maxWidth: 12, maxHeight: 0.75, maxWeightLb: 1 },
  largeStandard: { label: "大号标准尺寸", maxLength: 18, maxWidth: 14, maxHeight: 8, maxWeightLb: 20 },
};

// 二、小号标准尺寸配送费（$/件，不含燃油附加）
export const fbaSmallStandardRates = [
  { ozCap: 2, low: 2.62, mid: 3.51, high: 3.77 },
  { ozCap: 4, low: 2.68, mid: 3.61, high: 3.87 },
  { ozCap: 6, low: 2.76, mid: 3.65, high: 3.91 },
  { ozCap: 8, low: 2.86, mid: 3.74, high: 4.0 },
  { ozCap: 10, low: 2.98, mid: 3.89, high: 4.15 },
  { ozCap: 12, low: 3.03, mid: 3.99, high: 4.25 },
  { ozCap: 14, low: 3.14, mid: 4.13, high: 4.39 },
  { ozCap: 16, low: 3.17, mid: 4.18, high: 4.44 },
];

// 三、大号标准尺寸配送费（$/件，不含燃油附加）：4~48 oz，每 4 oz 一档
export const fbaLargeStandardRates = [
  { ozCap: 4, low: 3.15, mid: 3.97, high: 4.23 },
  { ozCap: 8, low: 3.39, mid: 4.21, high: 4.47 },
  { ozCap: 12, low: 3.66, mid: 4.48, high: 4.74 },
  { ozCap: 16, low: 4.07, mid: 4.89, high: 5.15 },
  { ozCap: 20, low: 4.52, mid: 5.34, high: 5.6 },
  { ozCap: 24, low: 4.91, mid: 5.73, high: 5.99 },
  { ozCap: 28, low: 5.07, mid: 5.89, high: 6.15 },
  { ozCap: 32, low: 5.33, mid: 6.15, high: 6.41 },
  { ozCap: 36, low: 5.47, mid: 6.29, high: 6.55 },
  { ozCap: 40, low: 5.67, mid: 6.49, high: 6.75 },
  { ozCap: 44, low: 5.84, mid: 6.66, high: 6.92 },
  { ozCap: 48, low: 6.26, mid: 7.08, high: 7.34 },
];

// 3~20 磅：以 3 磅档为起步价 + 超出部分每 4 oz 步进
// 原表里存的是字符串 "6.69 + 0.08"，靠 LEFT/SEARCH/MID 拆数字；这里直接存数值。
export const fbaStepRates = {
  low: { base: 6.69, step: 0.08 },
  mid: { base: 7.51, step: 0.08 },
  high: { base: 7.77, step: 0.08 },
};

// 四、大件 / 超大件：首磅费 + 超出每磅费
// 注意：原表公式只引用了「小号大件」这一档，大号大件与超大件费率未被使用。
export const fbaOversizeRates = {
  firstPound: 6.78,
  perExtraPound: 0.38,
};

// 燃油物流附加费率
export const FUEL_SURCHARGE_RATE = 0.035;

/* ------------------------------------------------------------------ */
/* 计算常量（原本散落在 Excel 公式里的硬编码，抽出来便于统一调整）        */
/* ------------------------------------------------------------------ */
export const CALC_CONST = {
  volumeDivisor: 6000, // 材积比（抛货）：长cm×宽cm×高cm ÷ 6000
  dimDivisorInch: 139, // 体积重除数：长in×宽in×高in ÷ 139 → lb
  ozPerLb: 16, // lb → oz
  refundCommissionKeep: 0.2, // 退货时佣金退还但扣留 20%
  priceBandLow: 10, // 价格带分界：< $10
  priceBandMid: 50, // $10 ~ $50
  smallStandardStepOz: 2, // 小号标准每 2 oz 一档
  largeStandardStepOz: 4, // 大号标准每 4 oz 一档
  largeStandardOzLimit: 48, // 超过 48 oz（3 lb）走阶梯步进
  defaultTargetMargin: 0.2, // 默认目标利润率
};
