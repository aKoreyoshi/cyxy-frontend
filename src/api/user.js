// 用户 / 认证相关请求
//
// 说明：原来这里有个 getUser() 打 /api/user，那是 V3S 模板的示例接口，
// 对应的 TestController 已经删除，继续调只会拿到 401/500，所以一并移除。

import request from "@/utils/request";

// 登录：后端返回 { token, user }，user 里带角色码和 superAdmin 标记
export const login = data =>
  request({
    url: "/api/login",
    method: "post",
    data,
  });

// 当前登录用户：刷新页面时用它覆盖 localStorage 里的旧信息
export const getCurrentUser = () =>
  request({
    url: "/api/auth/current",
    method: "get",
  });

// 菜单树。⚠️ 后端返回的已经是带 children 的树，
// 前端直接存 store 即可，千万不要再套 arr2tree（会重复挂 children 把层级弄乱）。
export const getMenus = () =>
  request({
    url: "/api/auth/menus",
    method: "get",
  });

// 修改自己的密码：验旧密码；成功后后端会清空令牌，前端需跳登录页重新登录
export const changePassword = data =>
  request({
    url: "/api/auth/change-password",
    method: "post",
    data,
  });

// 登出：清服务端令牌。前端还要自己调 removeAllLoginInfo 清 cookie / localStorage
export const logout = () =>
  request({
    url: "/api/auth/logout",
    method: "post",
  });
