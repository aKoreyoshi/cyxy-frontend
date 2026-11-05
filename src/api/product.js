// 产品相关所有请求

import axios from "axios";
import cookies from "js-cookie";
import request from "@/utils/request";
import {
  getMockList,
  getMockById,
  addMock,
  updateMock,
  removeMock,
} from "@/mock/product.js";

/**
 * 后端 /api/product/* 接口还没开发，先用本地 mock 顶着，保证页面能独立跑。
 * 后端接口就绪后，把这里改成 false 即可，页面不用动。
 */
const USE_MOCK = false;

/**
 * 上传产品主图，返回 { url }。
 * 走 @/utils/request 而不是裸 axios：这里返回的是普通 JSON Result，
 * 拦截器能正常识别 code；只有「下载文件流」才需要绕过它（见 downloadImportTemplate）。
 */
export const uploadProductImage = file => {
  const formData = new FormData();
  formData.append("file", file);
  return request({
    url: "/api/upload",
    method: "post",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
    // 主图上限已放宽到 10MB，本地还要走公网传到上海 COS，60s 容易超时；
    // 与批量导入保持一致用 120s（导入本来也是大文件 + 慢解析）。
    timeout: 120 * 1000,
  });
};

// 分页列表（含搜索条件）
export const getProductList = params => {
  if (USE_MOCK) return mockList(params);
  return request({
    url: "/api/product/list",
    method: "get",
    params,
  });
};

// 产品详情
export const getProductDetail = id => {
  if (USE_MOCK) return Promise.resolve(getMockById(id));
  return request({
    url: "/api/product/detail",
    method: "get",
    params: { id },
  });
};

// 新增产品
export const createProduct = data => {
  if (USE_MOCK) return Promise.resolve(addMock(data));
  return request({
    url: "/api/product/create",
    method: "post",
    data,
  });
};

// 修改产品（全量提交：整个表单一起覆盖，不做字段级 diff）
export const updateProduct = (id, data) => {
  if (USE_MOCK) return Promise.resolve(updateMock(id, data));
  return request({
    url: "/api/product/update",
    method: "post",
    data: { id, ...data },
  });
};

/**
 * 确认送达：服务端按北京时间取当前时间与预计送达日期比对，判定提前 / 准时 / 晚送达。
 * 只传 id，时间不接受前端传值（防篡改、也避免客户端时区不准）
 */
export const confirmDelivery = id => {
  return request({
    url: "/api/product/confirm-delivery",
    method: "post",
    data: { id },
  });
};

/** 撤销确认送达：清空实际送达时间，退回「配送中」，预计送达时间重新可改 */
export const cancelDelivery = id => {
  return request({
    url: "/api/product/cancel-delivery",
    method: "post",
    data: { id },
  });
};

// 删除产品（逻辑删除）
export const deleteProduct = id => {
  if (USE_MOCK) return Promise.resolve(removeMock(id));
  return request({
    url: "/api/product/delete",
    method: "post",
    data: { id },
  });
};

/* ------------------------- 批量导入 ------------------------- */

/**
 * 下载批量导入模板。
 * ⚠️ 不走 @/utils/request：那个拦截器会去读 response.data.code，
 *    而这里是文件流（Blob），没有 code，会被误判成业务失败。
 *    所以这里单独用 axios 发请求，token 从 cookie 手动带上。
 */
export const downloadImportTemplate = async () => {
  const res = await axios.get("/api/product/import-template", {
    responseType: "blob",
    headers: { Authorization: cookies.get("Authorization") || "" },
  });

  // 后端报错时返回的不是文件而是 JSON，这里识别出来抛给页面提示
  const blob = res.data;
  if (blob && blob.type && blob.type.includes("application/json")) {
    const text = await blob.text();
    throw new Error(JSON.parse(text).msg || "模板下载失败");
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "产品批量导入模板.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 上传 Excel 导入产品。
 * 整批成功或整批失败：任一行不合规就全线不入库，返回错误明细（行号 / 列名 / 原因）
 */
export const importProducts = file => {
  const formData = new FormData();
  formData.append("file", file);
  return request({
    url: "/api/product/import",
    method: "post",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
    // 批量导入比普通请求慢，单独放宽超时
    timeout: 120 * 1000,
  });
};

/* ------------------------- mock 实现 ------------------------- */

// 模拟网络延迟，方便观察 loading 效果
const delay = (value, ms = 260) =>
  new Promise(resolve => setTimeout(() => resolve(value), ms));

function mockList(params = {}) {
  const {
    pageNumber = 1,
    pageSize = 10,
    nameCn = "",
    productNo = "",
    categoryCode = "",
    status = "",
    sortField = "",
    sortOrder = "",
  } = params;

  const keyword = String(nameCn || "").trim().toLowerCase();
  const noKeyword = String(productNo || "").trim().toLowerCase();

  const filtered = getMockList().filter(item => {
    if (keyword) {
      const hit =
        String(item.name_cn || "").toLowerCase().includes(keyword) ||
        String(item.name_en || "").toLowerCase().includes(keyword);
      if (!hit) return false;
    }
    if (noKeyword && !String(item.product_no || "").toLowerCase().includes(noKeyword)) return false;
    if (categoryCode && item.category_code !== categoryCode) return false;
    if (status && item.status !== status) return false;
    return true;
  });

  // 排序：作用在筛选后的全量数据上，保证跨页排序正确（真实后端也是这个口径）
  if (sortField && sortOrder) {
    const dir = sortOrder === "ascending" ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // 空值一律沉底
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "zh-CN") * dir;
    });
  }

  const start = (Number(pageNumber) - 1) * Number(pageSize);
  const rows = filtered.slice(start, start + Number(pageSize));

  return delay({
    rows,
    total: filtered.length,
    pageNumber: Number(pageNumber),
    pageSize: Number(pageSize),
  });
}
