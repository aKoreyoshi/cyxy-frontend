// 汇率接口：当前生效值 + 手动同步。
//
// ⚠️ 与 api/dict.js 的 getExchangeRates 严格区分：
//    getExchangeRates       → 整张 dict_exchange_rate 时序表，给趋势图和记录表格用；
//    本文件的两个接口        → 「当前汇率」这一个概念，来源是 sys_config 全局参数。
// 别图省事从趋势数据里取最后一条当当前值，那会把两套口径又搅回去。

import request from "@/utils/request";

/**
 * 当前生效汇率，附带数据日期 / 来源 / 修改时间 / 是否过期，进页面读一次即可。
 * 返回字段是 snake_case（后端全局 Jackson SNAKE_CASE）：
 * rate / rate_date / source / provider / fetched_at / updated_time / stale
 *
 * updated_time 是全局参数「最新汇率」这一行的修改时间，页面上的「更新于」用它；
 * fetched_at 是历史表里那条记录的拉取时间，两者别混。
 */
export const getLatestExchangeRate = () =>
  request({
    url: "/api/exchange-rate/latest",
    method: "get",
  });

/**
 * 手动触发后端重新拉取：主源失败自动切备源，都失败则保留库里上一次的值。
 * 后端一个事务里同时写历史表和全局参数，返回更新后的当前值 + 修改时间。
 *
 * ⚠️ 三个入口共用这一个接口：全局参数页「获取最新汇率」、利润测算页「取最新」、
 *    汇率变化页「同步最新汇率」。别为某个页面另写一条链路，否则同一时刻
 *    三处看到的汇率和修改时间会不一致。定时任务也复用同一套写入逻辑。
 *
 * POST 但没登记到菜单写接口清单 —— 它只做系统级数据同步、不增删改业务数据，
 * 性质和 /api/profit/calc 一样，所以只读角色也能点，不会被拦截器挡成 403。
 */
export const refreshExchangeRate = () =>
  request({
    url: "/api/exchange-rate/refresh",
    method: "post",
  });
