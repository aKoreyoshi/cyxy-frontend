// 业务页面路由表。
//
// V3S 模板自带的「菜单示例 / 组件示例 / 页面示例」三组演示页面已整体删除，
// 这里只注册真实业务页面。侧边栏显示哪些菜单、按什么顺序，由后端登录时
// 下发的 sys_menu 菜单树决定；本文件只负责把 url 映射到组件，不在这里做权限判断。
//
// ⚠️ 菜单表里每条有 url 的记录，这里都必须有同名 path 的路由，
//    否则 router/index.js 的路由守卫会把它判成 404。

// 运营工具
const ToolsProfitCalculator = () => import("@/views/tools/profit-calculator/index.vue");
// 产品管理
const ProductList = () => import("@/views/product/list/index.vue");
const ProductForm = () => import("@/views/product/form/index.vue");
const ProductDetail = () => import("@/views/product/detail/index.vue");
// 参数列表：5 张普通二维字典表共用一个页面组件，按 path 末段区分字典类型；
// fba-rate（尺寸收费标准）、commission、exchange、return-fee（尾程退货费）
// 是各自的专属页 —— return-fee 要按 7 个分组展示「原表发货重量 / 实际匹配区间」，
// 二维表格装不下，所以单独一个组件
const ParamsTable = () => import("@/views/params/table/index.vue");
const ParamsFbaRate = () => import("@/views/params/fba-rate/index.vue");
const ParamsCommission = () => import("@/views/params/commission/index.vue");
const ParamsExchange = () => import("@/views/params/exchange/index.vue");
const ParamsReturnFee = () => import("@/views/params/return-fee/index.vue");
// 系统管理：三个页面只对超管可见。
// 可见性由后端菜单树控制（非超管会被过滤掉 SYSTEM_ 组），前端只负责注册路由，
// 不要在路由表里写死权限判断 —— 那是后端拦截器的活。
const SystemUser = () => import("@/views/system/user/index.vue");
const SystemRole = () => import("@/views/system/role/index.vue");
const SystemMenu = () => import("@/views/system/menu/index.vue");

const route = [
  // 运营工具
  { path: "/tools/profit-calculator", name: "ToolsProfitCalculator", component: ToolsProfitCalculator },

  // 产品管理
  { path: "/product/list", name: "ProductList", component: ProductList },
  { path: "/product/create", name: "ProductForm", component: ProductForm },
  // 详情页不在菜单里显示，但高亮父级「产品列表」
  {
    path: "/product/detail",
    name: "ProductDetail",
    component: ProductDetail,
    meta: { targetMenuPath: "/product/list" },
  },

  // 参数列表：5 张普通二维字典表 → 同一个组件（type 取 path 末段）
  // 注意：多个路由复用同一组件时 Vue Router 不会重新 mount，
  // 所以 table/index.vue 里用 watch(route.path) 触发加载，不能只靠 onMounted
  { path: "/params/return-threshold", name: "ParamsReturnThreshold", component: ParamsTable },
  { path: "/params/size-tier", name: "ParamsSizeTier", component: ParamsTable },
  { path: "/params/fba-rate", name: "ParamsFbaRate", component: ParamsFbaRate },
  { path: "/params/first-leg", name: "ParamsFirstLeg", component: ParamsTable },
  { path: "/params/step-rate", name: "ParamsStepRate", component: ParamsTable },
  { path: "/params/sys-config", name: "ParamsSysConfig", component: ParamsTable },
  { path: "/params/commission", name: "ParamsCommission", component: ParamsCommission },
  { path: "/params/exchange-rate", name: "ParamsExchange", component: ParamsExchange },
  { path: "/params/return-fee", name: "ParamsReturnFee", component: ParamsReturnFee },

  // 系统管理：url 必须和 sys_menu 里 SYSTEM_USER / SYSTEM_ROLE /
  // SYSTEM_MENU 三条记录的 url 完全一致，否则路由守卫会判成 404。
  { path: "/system/user", name: "SystemUser", component: SystemUser },
  { path: "/system/role", name: "SystemRole", component: SystemRole },
  { path: "/system/menu", name: "SystemMenu", component: SystemMenu },
];

export default route;
