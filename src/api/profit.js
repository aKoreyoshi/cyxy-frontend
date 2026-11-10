// FBA 利润计算器相关请求
// 对应后端 ProfitController（/api/profit/*），字段全走 snake_case（后端全局 Jackson SNAKE_CASE）

import request from "@/utils/request";

/**
 * 后端试算（不落库）。
 * 页面上的实时计算仍走本地 calc.js（快、零延迟），这个接口用于需要以后端字典口径为准的场合。
 */
export const calcProfit = data => {
  return request({
    url: "/api/profit/calc",
    method: "post",
    data,
  });
};

/**
 * 保存测算：事务写 profit_plan + profit_calc_result；
 * form 里 product_id 非空时，后端同步 upsert product_fba_fee，没选产品则完全不动那张表。
 */
export const saveProfit = data => {
  return request({
    url: "/api/profit/save",
    method: "post",
    data,
  });
};

/**
 * 产品远程搜索下拉选项：关键字匹配中文名或编号，
 * 返回 DictOptionVO 列表（字段是 code/name，页面里再映射成 el-select 的 value/label）
 */
export const getProductOptions = keyword => {
  return request({
    url: "/api/profit/product-options",
    method: "get",
    params: keyword ? { keyword } : {},
  });
};

/**
 * 选中产品后带出：尺寸 / 含包装实重 / 采购成本 / 售价 / 退货类目 / 头程单价+材积比 /
 * 最新汇率 / 上次手填费用（入库配置费 / 月度仓储费 / 合仓费）。
 * 注意：佣金类目故意不带出（两套字典不联动，每轮手选）。
 */
export const getProductPrefill = productId => {
  return request({
    url: "/api/profit/product-prefill",
    method: "get",
    params: { productId },
  });
};

/**
 * 尾程退货费自动带出：只按「实际计费重」查 dict_return_processing_fee。
 * tierCode 是可选收窄条件（计算器自己算出的尺寸分段），传空后端就全表按重量匹配，
 * 不需要用户为了带出一个费用多填一项。
 * 返回值只作为输入框的建议值，输入框不锁定、不加 disabled，用户随时可手改；
 * 手改后的值照常随 calc / save 提交，后端不会用查表值覆盖。
 * ⚠️ query 参数用 camelCase：全局 SNAKE_CASE 只作用于 JSON，
 *    @RequestParam 认的是 Java 参数名，与 product-prefill 的 productId 同理。
 */
export const getReturnFee = (tierCode, billWeightLb) => {
  return request({
    url: "/api/profit/return-fee",
    method: "get",
    params: { tierCode, billWeightLb },
  });
};
