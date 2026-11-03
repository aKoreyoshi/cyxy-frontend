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
