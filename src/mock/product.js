/**
 * 产品模块 - 本地 Mock 数据
 *
 * 背景：后端 /api/product/* 接口尚未开发，页面又需要能独立跑起来看效果。
 * 所以先在 mock 层模拟「查询 / 详情 / 新增 / 修改 / 删除」的完整行为，字段名与
 * 数据库 product 表完全一致（见 docs/schema-fields.md），
 * 后端就绪后只需把 api/product.js 里的 USE_MOCK 改成 false，页面零改动。
 *
 * 注意：mock 数据存在内存里，刷新页面会回到初始状态。
 */

let autoIncrementId = 9; // 已占用 1~8

// 图片用 picsum 的固定 seed，保证每次刷新出来的是同一张；其余留空以便看到占位效果
const img = seed => `https://picsum.photos/seed/${seed}/80/80`;

/* 配送演示数据：以「今天」为基准生成，任何时候打开都能同时看到
   「配送中 / 提前送达 / 准时送达 / 晚送达 / 未填写」五种状态。
   nowText() 复用文件末尾那份（函数声明会提升，这里能直接用） */
const dayOffset = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = v => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const mockProducts = [
  {
    id: 1,
    product_no: "P-2026-0001",
    name_cn: "折叠硅胶收纳箱",
    name_en: "Collapsible Silicone Storage Box",
    main_image: img("box001"),
    category_code: "lawn_garden",
    competitor_asin: "B0C8XYZ123",
    source_url: "https://detail.1688.com/offer/660123456789.html",
    supplier: "义乌市拓远家居用品有限公司",
    purchase_price: 18.5,
    moq: 50,
    package_cost: 1.2,
    avg_domestic_shipping: 2.3,
    net_weight_g: 195,
    packaged_weight_g: 220,
    length_cm: 24,
    width_cm: 22.5,
    height_cm: 2,
    size_tier_code: "large",
    tariff_fee: null,
    first_leg_method_code: "SEA",
    logistics_provider: "云途物流",
    first_leg_unit_price: null, // 亚马逊 SEND：费用按当前产品核算（$），不填运费单价
    shipping_method: "AMAZON_SEND",
    shipping_total_fee_usd: 465.0,
    total_units: 500,
    expected_delivery_date: dayOffset(6),
    list_price_usd: 18.99,
    competitor_price_usd: 21.99,
    monthly_sales_est: 800,
    first_batch_qty: 500,
    status: "SELECTED",
    remark: "折叠后仅 2cm，头程体积优势明显；竞品月销 800+",
    created_time: "2026-10-28 10:12:33",
    updated_time: "2026-10-30 15:43:12",
  },
  {
    id: 2,
    product_no: "P-2026-0002",
    name_cn: "不锈钢真空保温壶",
    name_en: "Stainless Steel Vacuum Insulated Kettle",
    main_image: img("kettle002"),
    category_code: "home_kitchen",
    competitor_asin: "B0B7ABC456",
    source_url: "https://detail.1688.com/offer/660987654321.html",
    supplier: "潮州市恒瑞不锈钢制品厂",
    purchase_price: 32.8,
    moq: 30,
    package_cost: 1.8,
    avg_domestic_shipping: 3.5,
    net_weight_g: 480,
    packaged_weight_g: 560,
    length_cm: 28,
    width_cm: 14,
    height_cm: 14,
    size_tier_code: "large",
    tariff_fee: null,
    first_leg_method_code: "SEA_EXPRESS",
    logistics_provider: "燕文物流",
    first_leg_unit_price: 14,
    shipping_method: "SELF_CARRIER",
    shipping_total_fee_usd: null,
    total_units: 300,
    expected_delivery_date: dayOffset(2), actual_delivery_time: nowText(), delivery_status: "EARLY", delay_days: -2,
    list_price_usd: 29.99,
    competitor_price_usd: 34.99,
    monthly_sales_est: 420,
    first_batch_qty: 300,
    status: "SELECTED",
    remark: "重货走快线，单价高但时效可控",
    created_time: "2026-10-28 11:05:47",
    updated_time: "2026-10-29 09:20:11",
  },
  {
    id: 3,
    product_no: "P-2026-0003",
    name_cn: "宠物自动饮水器",
    name_en: "Automatic Pet Water Dispenser",
    main_image: "https://picsum.photos/seed/item0003/80/80",
    category_code: "pet_supplies",
    competitor_asin: "B0A9DEF789",
    source_url: "https://detail.1688.com/offer/661234567890.html",
    supplier: "深圳市宠悦科技有限公司",
    purchase_price: 45.6,
    moq: 20,
    package_cost: 2.5,
    avg_domestic_shipping: 4.2,
    net_weight_g: 620,
    packaged_weight_g: 720,
    length_cm: 30,
    width_cm: 20,
    height_cm: 18,
    size_tier_code: "large",
    tariff_fee: null,
    first_leg_method_code: "AIR",
    logistics_provider: "递四方",
    first_leg_unit_price: 32,
    shipping_method: "SELF_CARRIER",
    shipping_total_fee_usd: null,
    total_units: 150,
    expected_delivery_date: null, delivery_status: "NOT_SET",
    list_price_usd: 39.99,
    competitor_price_usd: 45.99,
    monthly_sales_est: 260,
    first_batch_qty: 150,
    status: "DRAFT",
    remark: "佣金 15%，需确认带电运输资质",
    created_time: "2026-10-29 14:33:08",
    updated_time: "2026-10-29 14:33:08",
  },
  {
    id: 4,
    product_no: "P-2026-0004",
    name_cn: "便携折叠露营桌",
    name_en: "Portable Folding Camping Table",
    main_image: img("table004"),
    category_code: "sporting_goods",
    competitor_asin: "B0D6GHI321",
    source_url: "https://detail.1688.com/offer/661987654320.html",
    supplier: "永康市锐野户外用品有限公司",
    purchase_price: 78.0,
    moq: 10,
    package_cost: 3.6,
    avg_domestic_shipping: 8.0,
    net_weight_g: 2100,
    packaged_weight_g: 2450,
    length_cm: 60,
    width_cm: 40,
    height_cm: 8,
    size_tier_code: "oversize",
    tariff_fee: null,
    first_leg_method_code: "SEA",
    logistics_provider: "云途物流",
    first_leg_unit_price: null, // 亚马逊 SEND：费用按当前产品核算（$），不填运费单价
    shipping_method: "AMAZON_SEND",
    shipping_total_fee_usd: 1280.0,
    total_units: 100,
    expected_delivery_date: dayOffset(-5), actual_delivery_time: nowText(), delivery_status: "LATE", delay_days: 5,
    list_price_usd: 59.99,
    competitor_price_usd: 69.99,
    monthly_sales_est: 180,
    first_batch_qty: 100,
    status: "SELECTED",
    remark: "大件偏重，走海运；注意 FBA 尺寸分段可能进大号",
    created_time: "2026-10-29 16:48:20",
    updated_time: "2026-10-30 15:43:12",
  },
  {
    id: 5,
    product_no: "P-2026-0005",
    name_cn: "无线蓝牙耳机充电仓",
    name_en: "Wireless Bluetooth Earbuds Charging Case",
    main_image: img("earbud005"),
    category_code: "electronics_accessories",
    competitor_asin: "B0E5JKL654",
    source_url: "https://detail.1688.com/offer/662345678901.html",
    supplier: "东莞市声迈电子科技有限公司",
    purchase_price: 26.4,
    moq: 100,
    package_cost: 1.0,
    avg_domestic_shipping: 2.0,
    net_weight_g: 85,
    packaged_weight_g: 120,
    length_cm: 12,
    width_cm: 10,
    height_cm: 4,
    size_tier_code: "large",
    tariff_fee: null,
    first_leg_method_code: "EXPRESS",
    logistics_provider: "顺丰国际",
    first_leg_unit_price: 55,
    shipping_method: "SELF_CARRIER",
    shipping_total_fee_usd: null,
    total_units: 800,
    expected_delivery_date: dayOffset(0), actual_delivery_time: nowText(), delivery_status: "ON_TIME", delay_days: 0,
    list_price_usd: 24.99,
    competitor_price_usd: 27.99,
    monthly_sales_est: 1200,
    first_batch_qty: 800,
    status: "SELECTED",
    remark: "轻小件，快递头程可接受；带电池需 MSDS",
    created_time: "2026-10-30 09:15:02",
    updated_time: "2026-10-30 15:43:12",
  },
  {
    id: 6,
    product_no: "P-2026-0006",
    name_cn: "儿童益智积木套装",
    name_en: "Kids Educational Building Blocks Set",
    main_image: "https://picsum.photos/seed/item0006/80/80",
    category_code: "toys_games",
    competitor_asin: "B0F4MNO987",
    source_url: "https://detail.1688.com/offer/663456789012.html",
    supplier: "汕头市乐智玩具有限公司",
    purchase_price: 15.2,
    moq: 60,
    package_cost: 1.5,
    avg_domestic_shipping: 2.8,
    net_weight_g: 320,
    packaged_weight_g: 410,
    length_cm: 25,
    width_cm: 18,
    height_cm: 6,
    size_tier_code: "large",
    tariff_fee: null,
    first_leg_method_code: "SEA",
    logistics_provider: "燕文物流",
    first_leg_unit_price: 8,
    shipping_method: "SELF_CARRIER",
    shipping_total_fee_usd: null,
    total_units: 400,
    expected_delivery_date: dayOffset(10),
    list_price_usd: 16.99,
    competitor_price_usd: 19.99,
    monthly_sales_est: 650,
    first_batch_qty: 400,
    status: "DRAFT",
    remark: "玩具类目需 CPC 认证，待补资料",
    created_time: "2026-10-30 10:41:55",
    updated_time: "2026-10-30 10:41:55",
  },
  {
    id: 7,
    product_no: "P-2026-0007",
    name_cn: "硅藻泥吸水地垫",
    name_en: "Diatom Mud Absorbent Floor Mat",
    main_image: img("mat007"),
    category_code: "lawn_garden",
    competitor_asin: "B0G3PQR147",
    source_url: "https://detail.1688.com/offer/664567890123.html",
    supplier: "临沂市洁然家居有限公司",
    purchase_price: 22.0,
    moq: 40,
    package_cost: 2.0,
    avg_domestic_shipping: 5.5,
    net_weight_g: 890,
    packaged_weight_g: 1050,
    length_cm: 45,
    width_cm: 30,
    height_cm: 3,
    size_tier_code: "large",
    tariff_fee: null,
    first_leg_method_code: "SEA",
    logistics_provider: "云途物流",
    first_leg_unit_price: 8,
    shipping_method: "SELF_CARRIER",
    shipping_total_fee_usd: null,
    total_units: 200,
    expected_delivery_date: null, delivery_status: "NOT_SET",
    list_price_usd: 21.99,
    competitor_price_usd: 25.99,
    monthly_sales_est: 300,
    first_batch_qty: 200,
    status: "OFFLINE",
    remark: "易碎且重，破损率高，已暂停",
    created_time: "2026-10-27 15:22:41",
    updated_time: "2026-10-31 11:08:30",
  },
  {
    id: 8,
    product_no: "P-2026-0008",
    name_cn: "磁吸车载手机支架",
    name_en: "Magnetic Car Phone Mount Holder",
    main_image: "https://picsum.photos/seed/item0008/80/80",
    category_code: "automotive",
    competitor_asin: "B0H2STU258",
    source_url: "https://detail.1688.com/offer/665678901234.html",
    supplier: "广州市车品汇汽车用品有限公司",
    purchase_price: 12.6,
    moq: 100,
    package_cost: 0.8,
    avg_domestic_shipping: 1.6,
    net_weight_g: 68,
    packaged_weight_g: 95,
    length_cm: 10,
    width_cm: 8,
    height_cm: 5,
    size_tier_code: "large",
    tariff_fee: null,
    first_leg_method_code: "CUSTOM",
    logistics_provider: "自填货代",
    first_leg_unit_price: 12,
    shipping_method: "SELF_CARRIER",
    shipping_total_fee_usd: null,
    total_units: 600,
    expected_delivery_date: dayOffset(1),
    list_price_usd: 13.99,
    competitor_price_usd: 15.99,
    monthly_sales_est: 950,
    first_batch_qty: 600,
    status: "DRAFT",
    remark: "价格敏感，走低成本货代；待测算保本售价",
    created_time: "2026-10-31 13:59:26",
    updated_time: "2026-10-31 13:59:26",
  },
];

/* 深拷贝一份作为初始快照，便于「重置 mock 数据」 */
const snapshot = JSON.parse(JSON.stringify(mockProducts));

/** 取当前全部（查询用） */
export const getMockList = () => mockProducts;

/** 按 id 查单条 */
export const getMockById = id => mockProducts.find(item => String(item.id) === String(id)) || null;

/** 新增一条，返回带 id 的新记录 */
export const addMock = data => {
  const timeText = nowText();
  const record = {
    ...data,
    id: autoIncrementId++,
    created_time: timeText,
    updated_time: timeText,
  };
  mockProducts.unshift(record);
  return record;
};

/**
 * 修改一条（全量覆盖）
 * 前端提交的是完整表单，这里按 id 整条替换，只保留 id / created_time 不被覆盖。
 * 后端真正实现时同口径：UPDATE product SET 全部字段 WHERE id = ?
 */
export const updateMock = (id, data) => {
  const index = mockProducts.findIndex(item => String(item.id) === String(id));
  if (index === -1) return null;

  const old = mockProducts[index];
  const updated = {
    ...data,
    id: old.id,
    created_time: old.created_time,
    updated_time: nowText(),
  };
  mockProducts.splice(index, 1, updated);
  return updated;
};

/** 删除一条 */
export const removeMock = id => {
  const index = mockProducts.findIndex(item => String(item.id) === String(id));
  if (index > -1) mockProducts.splice(index, 1);
  return index > -1;
};

/** 重置回初始数据（调试用） */
export const resetMock = () => {
  mockProducts.splice(0, mockProducts.length, ...JSON.parse(JSON.stringify(snapshot)));
  autoIncrementId = 9;
};

/* 本地时间文本，格式与 MySQL datetime 一致 */
function nowText() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
