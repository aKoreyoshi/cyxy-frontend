// 字典接口：下拉选项 + 「参数列表」展示页数据
// 响应拦截器在 code === 200 时直接返回 res.data，所以下面函数拿到的就是数据本身

import request from "@/utils/request";

/**
 * 产品类目下拉
 * 数据源：dict_category_return_threshold（33 项）
 * 注意：佣金类目是另一张表 dict_category_commission，只在计算利润时用，两者不联动
 */
export const getCategoryOptions = () =>
  request({
    url: "/api/dict/category",
    method: "get",
  });

/**
 * 通用二维字典表
 * @param {string} type 与路由末段一致：
 *   return-threshold / size-tier / fba-rate / first-leg / step-rate / sys-config
 */
export const getDictTable = type =>
  request({
    url: "/api/dict/table",
    method: "get",
    params: { type },
  });

/** 佣金费率树：父=佣金类目，子=阶梯档位 */
export const getCommissionTree = () =>
  request({
    url: "/api/dict/commission-tree",
    method: "get",
  });

/** 汇率时序（按日期升序），表格与折线图共用同一份数据 */
export const getExchangeRates = () =>
  request({
    url: "/api/dict/exchange-rate",
    method: "get",
  });
