/**
 * 参数列表：列配置 + 页面文案集中管理
 *
 * 约定（改这里就能改所有页面）：
 * - prop 用后端返回的 snake_case 字段名（后端全局 Jackson SNAKE_CASE）
 * - enum + tag：枚举列，交给 RhTag 出淡色标签（RhTag 用 == 松散匹配，数字/字符串都能命中）
 * - format：数值/单位格式化。页面会把原始行浅拷贝后，用 format 的返回值覆盖该字段。
 *   format 返回 null 时 RhTable 显示灰色 "--"；返回 0 会真实打印 0，不吞掉。
 *   ⚠️ 同一列不要同时配 format 和 enum —— enum 依赖原始值匹配。
 * - align: "right" 用于数值列，配合全局 tabular-nums 保证数位对齐
 */

/* ---------- 格式化工具 ---------- */

const isBlank = v => v === null || v === undefined || v === "";

const percent = v => (isBlank(v) ? null : `${(Number(v) * 100).toFixed(2)}%`);

const money = (v, unit = "$") =>
  isBlank(v) ? null : `${unit}${Number(v).toFixed(2)}`;

const num = (v, digits = 2) =>
  isBlank(v)
    ? null
    : Number(v).toLocaleString("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

/**
 * 时间格式化，导出给「全局参数」页和「利润测算」页共用，保证三处显示的
 * 修改时间格式完全一致。
 *
 * ⚠️ 后端 LocalDateTime 经 Jackson 序列化后，可能是 ISO 字符串
 * "2026-11-10T23:58:34.123"（Spring Boot 默认），也可能在日期时间戳开关开启时
 * 变成数组 [2026,11,10,23,58,34]。两种都要吃掉，否则用户会看到带 T 的怪格式。
 * 空值返回 null —— RhTable 会显示灰色 "--"，比空字符串更容易看出「没数据」。
 */
export const formatRateTime = v => {
  if (isBlank(v)) return null;
  if (Array.isArray(v)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = v;
    const p2 = n => String(n).padStart(2, "0");
    return `${y}-${p2(m)}-${p2(d)} ${p2(hh)}:${p2(mm)}:${p2(ss)}`;
  }
  // "2026-11-10T23:58:34.123" → "2026-11-10 23:58:34"，截掉毫秒不影响可读性
  return String(v).replace("T", " ").slice(0, 19);
};

/** 枚举值大小写可能不一致：统一大写查表，查不到原样返回，绝不吞值 */
const label = map => v =>
  isBlank(v) ? null : map[String(v).toUpperCase()] || v;

const PRICE_BAND = { LOW: "<$10", MID: "$10~$50", HIGH: ">$50" };
const SIZE_TIER = {
  SMALL: "小号标准",
  LARGE: "大号标准",
  OVERSIZE: "大件超大件",
};
const WEIGHT_BASIS = { ACTUAL: "按实重", BILLABLE: "按计费重" };
const RATE_TYPE = { STEP_4OZ: "每 4oz 步进", FIRST_POUND_PLUS: "首磅+续磅" };
const STEP_UNIT = { OZ4: "每 4 盎司", LB: "每磅" };
const SOURCE = { API: "接口拉取", MANUAL: "手工录入" };
const VALUE_TYPE = { NUMBER: "数值", STRING: "文本", BOOLEAN: "布尔" };

/* ---------- 枚举标签 ---------- */

const STATUS_ENUM = [
  { value: 1, label: "启用", tagType: "success" },
  { value: 0, label: "停用", tagType: "info" },
];

const FEE_MODE_ENUM = [
  { value: "FLAT", label: "单一费率", tagType: "success" },
  { value: "FULL", label: "跳档", tagType: "warning" },
  { value: "MARGINAL", label: "累进分段", tagType: "primary" },
];

const APPROVAL_ENUM = [
  { value: 1, label: "需审核", tagType: "danger" },
  { value: 0, label: "无需", tagType: "success" },
];

const DATE_FROM = { label: "生效起始", prop: "valid_from", width: 120 };
const DATE_TO = { label: "生效截止", prop: "valid_to", width: 100 };

/* ---------- 各字典的列 ---------- */

const RAW_DICT_COLUMNS = {
  commission: [
    { label: "类目 / 档位", prop: "name", width: 240 },
    { label: "类目编码", prop: "code", width: 230 },
    { label: "费率模式", prop: "fee_mode", width: 120, enum: FEE_MODE_ENUM, tag: true },
    { label: "价格区间", prop: "price_range", width: 160 },
    { label: "费率", prop: "rate", width: 110, align: "right", format: percent },
    { label: "最低佣金 ($)", prop: "min_commission_usd", width: 140, align: "right", format: money },
    { label: "需审核", prop: "need_approval", width: 100, enum: APPROVAL_ENUM, tag: true },
    { label: "状态", prop: "status", width: 90, enum: STATUS_ENUM, tag: true },
    { ...DATE_FROM },
    { ...DATE_TO },
    { label: "说明", prop: "remark", width: 300 },
  ],

  "return-threshold": [
    { label: "类目编码", prop: "threshold_code", width: 250 },
    { label: "类目名称", prop: "category_name", width: 220 },
    { label: "退货阈值", prop: "threshold_rate", width: 100, align: "right", format: percent },
    { label: "状态", prop: "status", width: 70, enum: STATUS_ENUM, tag: true },
    { label: "排序", prop: "sort_no", width: 60, align: "right" },
    { ...DATE_FROM },
    { ...DATE_TO },
    { label: "说明", prop: "remark", width: 300 },
  ],

  "exchange-rate": [
    { label: "日期", prop: "rate_date", width: 140 },
    { label: "货币对", prop: "currency_pair", width: 140 },
    { label: "汇率", prop: "rate", width: 140, align: "right", format: v => num(v, 4) },
    { label: "来源", prop: "source", width: 120, format: label(SOURCE) },
    { label: "提供方", prop: "provider", width: 160 },
    { label: "获取时间", prop: "fetched_at", width: 180 },
    { label: "备注", prop: "remark", width: 260 },
  ],

  "size-tier": [
    { label: "分段编码", prop: "tier_code", width: 140 },
    { label: "分段名称", prop: "tier_name", width: 170 },
    { label: "最长边 (in)", prop: "max_length_inch", width: 140, align: "right", format: v => num(v, 2) },
    { label: "次长边 (in)", prop: "max_width_inch", width: 140, align: "right", format: v => num(v, 2) },
    { label: "最短边 (in)", prop: "max_height_inch", width: 140, align: "right", format: v => num(v, 2) },
    { label: "重量上限 (lb)", prop: "max_weight_lb", width: 150, align: "right", format: v => num(v, 2) },
    { label: "计费重口径", prop: "weight_basis", width: 140, format: label(WEIGHT_BASIS) },
    { label: "排序", prop: "sort_no", width: 80, align: "right" },
    { ...DATE_FROM },
    { ...DATE_TO },
    { label: "备注", prop: "remark", width: 280 },
  ],

  // fba-rate（尺寸收费标准）改走专属页 views/params/fba-rate/，
  // 两个分段各一张表 + 多级表头，不再用下面的行式化列配置

  "first-leg": [
    { label: "方式编码", prop: "method_code", width: 150 },
    { label: "方式名称", prop: "method_name", width: 150 },
    {
      label: "默认头程单价",
      prop: "default_unit_price",
      width: 200,
      align: "right",
      format: v => (isBlank(v) ? null : `${money(v, "￥")} /kg`),
    },
    { label: "材积比", prop: "volume_divisor", width: 120, align: "right" },
    { label: "状态", prop: "status", width: 90, enum: STATUS_ENUM, tag: true },
    { label: "排序", prop: "sort_no", width: 80, align: "right" },
    { label: "备注", prop: "remark", width: 400 },
  ],

  "step-rate": [
    { label: "尺寸分段", prop: "tier_code", width: 150, format: label(SIZE_TIER) },
    { label: "价格带", prop: "price_band", width: 130, format: label(PRICE_BAND) },
    { label: "计费类型", prop: "rate_type", width: 170, format: label(RATE_TYPE) },
    { label: "起始重量 (lb)", prop: "apply_from_lb", width: 150, align: "right", format: v => num(v, 2) },
    { label: "截止重量 (lb)", prop: "apply_to_lb", width: 150, align: "right", format: v => num(v, 2) },
    { label: "起步价 ($)", prop: "base_usd", width: 130, align: "right", format: money },
    { label: "每步进加价 ($)", prop: "step_usd", width: 160, align: "right", format: money },
    { label: "步进单位", prop: "step_unit", width: 130, format: label(STEP_UNIT) },
    { ...DATE_FROM },
    { ...DATE_TO },
  ],

  "sys-config": [
    { label: "参数键", prop: "config_key", width: 250 },
    { label: "参数名称", prop: "config_name", width: 200 },
    { label: "参数值", prop: "config_value", width: 110 },
    { label: "值类型", prop: "value_type", width: 90, format: label(VALUE_TYPE) },
    { label: "说明", prop: "remark", width: 320 },
    // ⚠️ 后端实体字段是 updatedTime，全局 SNAKE_CASE 序列化成 updated_time。
    // 之前写成 updated_at 取不到值，这一列一直是 "--"，正好借「显示修改时间」一并修正。
    { label: "最后更新", prop: "updated_time", width: 190, format: formatRateTime },
    // operate 是 RhTable 约定的操作列（prop === 'operate' 时不渲染默认文本，交给具名插槽）。
    // ⚠️ 只加在 sys-config 这一组：其他 5 个参数页共用同一个表格组件，但列配置各自独立，
    //    不会多出这一列。用户明确「其他参数页的编辑功能后期再开放」，这轮只做汇率这一行。
    { label: "操作", prop: "operate", width: 190 },
  ],
};

/**
 * 参数列表统一居中：表头 + 数据。
 * Element Plus 的 header-align 默认跟随 align，所以只需把每列 align 设成 center，
 * 表头就会一起居中（RhTable 用 v-bind="column" + :align 透传给 el-table-column）。
 * 在这里统一注入，页面组件一行都不用改；以后某页要右对齐，单独覆盖这一层即可。
 */
export const DICT_COLUMNS = Object.fromEntries(
  Object.entries(RAW_DICT_COLUMNS).map(([type, columns]) => [
    type,
    columns.map(col => ({ ...col, align: "center" })),
  ])
);

/**
 * 页面头部文案：名词标题 + 一句关于数据口径的说明（不写「本页展示…」这类界面说明）
 * source 是该页对应的数据库表，note 是这套参数在利润测算里的真实用途 —— 这是本产品自己的东西
 */
export const DICT_META = {
  commission: {
    title: "佣金费率",
    source: "dict_category_commission + dict_category_commission_tier",
    note: "按类目给出佣金口径：单一费率、跳档整套按新费率、累进分段三种模式；有分段档位的类目可展开查看。",
  },
  "return-threshold": {
    title: "退货阈值",
    source: "dict_category_return_threshold",
    note: "各类目的退货率阈值，用于测算平均退货成本；与佣金类目是两套独立字典，互不联动。",
  },
  "exchange-rate": {
    title: "汇率变化",
    source: "dict_exchange_rate",
    note: "本页表格与趋势图记录 USD/CNY 汇率变化，按业务日期一天一条；右上角「最新汇率」是全局参数里的当前生效值，也是利润测算读取的唯一入口。可点「同步最新汇率」触发后端重新拉取。",
  },
  "size-tier": {
    title: "尺寸标准",
    source: "dict_fba_size_tier",
    note: "FBA 尺寸分段的三边与重量上限，以及查费率时按实重还是计费重的口径。产品尺寸分段由录入的长宽高自动匹配。",
  },
  "fba-rate": {
    title: "尺寸收费标准",
    source: "dict_fba_rate",
    note: "配送费率矩阵：小号 / 大号标准尺寸各一张表，按发货重量区间横排三个价格带的每件配送费，不含燃油附加。区间 ≤ 1 lb 用盎司、超过 1 lb 用磅；公制换算仅供参考，大号计费重取实重与体积重的较大者。",
  },
  "first-leg": {
    title: "头程方式",
    source: "dict_first_leg_method",
    note: "头程运输方式、默认单价与材积比；选中方式后自动带出材积比，不用手填。",
  },
  "step-rate": {
    title: "超大件费率",
    source: "dict_fba_step_rate",
    note: "大号标准超 3lb 后的每 4oz 累加步进，以及大件/超大件的首磅加续磅费率。",
  },
  "sys-config": {
    title: "全局参数",
    source: "sys_config",
    note: "利润测算里散落的常量：燃油附加、体积重除数、价格带分界、默认广告占比等，统一在此维护。「最新汇率」行可点「获取最新汇率」由后端取最新值并更新，旁边显示修改时间；其余编辑功能后续版本开放。",
  },
  "return-fee": {
    title: "尾程退货费",
    source: "dict_return_processing_fee",
    note: "只按实际计费重自动带出利润测算里的「尾程退货费」；七个分组按原表行段划分，尺寸档仅作可选收窄，大件段纯按重量区间取。公式档按起步价加续重计算，带出的值仍可手动修改。",
  },
};

/** 把原始行转成展示行：只覆盖配了 format 的字段，枚举列保持原值供 RhTag 匹配 */
export const formatRows = (rows, columns) =>
  (rows || []).map(row => {
    const out = { ...row };
    columns.forEach(col => {
      if (col.format) out[col.prop] = col.format(row[col.prop]);
    });
    return out;
  });

/** 树形数据要递归处理子节点 */
export const formatTree = (nodes, columns) =>
  (nodes || []).map(node => ({
    ...formatRows([node], columns)[0],
    ...(node.children && node.children.length
      ? { children: formatTree(node.children, columns) }
      : {}),
  }));
