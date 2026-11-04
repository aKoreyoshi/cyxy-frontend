// 系统管理（用户 / 角色 / 菜单）三组接口
//
// 约定说明：
// 1) 这一组全部挂在 /api/system/** 下，后端 AuthInterceptor 只允许内置超管访问，
//    普通角色即使绕过页面直接调也会拿到 403。前端不重复做权限判断。
// 2) 删除接口用 POST + 请求体 { id }，而不是 RESTful 的 DELETE /xxx/{id}：
//    项目里产品删除接口就是这种写法，保持一致；后端三个 Controller 的
//    toId() 也专门兼容了数字 / 字符串两种 id。
// 3) request.js 的响应拦截器在 code===200 时直接返回 data，
//    所以这里不需要（也不应该）再解一层 .data。

import request from "@/utils/request";

/* ==================== 用户管理 ==================== */

// 用户列表。keyword 模糊匹配账号或姓名；不传就返回全部。
// 后端返回 SysUserVO，刻意不含 passwordHash 和 token，前端拿不到别人的凭证。
export const getSystemUsers = (keyword = "") =>
  request({
    url: "/api/system/user/list",
    method: "get",
    params: keyword ? { keyword } : {},
  });

// 新建 / 修改共用一个 DTO，靠 id 区分：id 为空 = 新建，有值 = 修改。
// 修改时 password 留空表示不改动原密码；username 后端不接受修改。
export const createSystemUser = data =>
  request({ url: "/api/system/user/create", method: "post", data });
export const updateSystemUser = data =>
  request({ url: "/api/system/user/update", method: "post", data });
export const deleteSystemUser = id =>
  request({ url: "/api/system/user/delete", method: "post", data: { id } });

// 超管重置任意用户密码：不需要旧密码，成功后对方所有会话立即失效。
// 字段名是 userId / newPwd，对应后端 ResetPwdDTO，别写成 id / password。
export const resetUserPassword = data =>
  request({ url: "/api/system/user/reset-password", method: "post", data });

/* ==================== 角色管理 ==================== */

export const getSystemRoles = () =>
  request({ url: "/api/system/role/list", method: "get" });

// 角色详情 = 基本信息 + 全量菜单勾选情况（平铺 List，前端自己建树）。
// 没勾的菜单 permType 为 null；hasWriteApi=false 的菜单要把只读开关置灰。
export const getSystemRoleDetail = id =>
  request({
    url: "/api/system/role/detail",
    method: "get",
    params: { id },
  });

// 新建角色时的空白菜单勾选项（全量菜单、permType 全为 null）。
// /detail 需要角色 id，新建时角色还不存在，所以后端单独给了这个同构接口；
// 前端新建调它、编辑调 detail，两者返回的 menus 结构完全一致。
export const getSystemRoleMenuOptions = () =>
  request({ url: "/api/system/role/menu-options", method: "get" });

// 菜单勾选随角色基本信息一起提交，后端一个事务写完，
// 不会出现「角色建好了但权限没存上」的半截状态。
// data.menus 形如 [{ menuId: 11, permType: 1 }, ...]，permType：1 可编辑 / 0 只读。
export const createSystemRole = data =>
  request({ url: "/api/system/role/create", method: "post", data });
export const updateSystemRole = data =>
  request({ url: "/api/system/role/update", method: "post", data });
export const deleteSystemRole = id =>
  request({ url: "/api/system/role/delete", method: "post", data: { id } });

/* ==================== 菜单管理 ==================== */

// 全量菜单树（含停用项），后端 MenuTreeNodeVO 带 isBuiltin / routeName。
export const getSystemMenuTree = () =>
  request({ url: "/api/system/menu/tree", method: "get" });

// 一期只提交 parentId / title / icon / sortNo / visible 五个字段：
// 后端 MenuSaveDTO 故意不收 url / routeName / menuType / writeApiPatterns，
// 因为新建的只能是「分组目录」，凭空造 url 会点进白屏，
// 而写接口清单能被页面改就等于能绕过只读控制。前端别多传，传了也会被忽略。
export const createSystemMenu = data =>
  request({ url: "/api/system/menu/create", method: "post", data });
export const updateSystemMenu = data =>
  request({ url: "/api/system/menu/update", method: "post", data });
export const deleteSystemMenu = id =>
  request({ url: "/api/system/menu/delete", method: "post", data: { id } });
