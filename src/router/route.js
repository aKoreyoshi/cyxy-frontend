// 菜单示例
const MenusNested = () => import("@/views/menu/nested/index.vue");
const MenusNormal = () => import("@/views/menu/normal/index.vue");
// 组件示例
const ComponentSearch = () => import("@/views/component/search/index.vue");
const ComponentDialog = () => import("@/views/component/dialog/index.vue");
const ComponentTable = () => import("@/views/component/table/index.vue");
const ComponentTableFull = () => import("@/views/component/table-full/index.vue");
const ComponentDigital = () => import("@/views/component/digital/index.vue");
const ComponentTree = () => import("@/views/component/tree/index.vue");
const ComponentSeamless = () => import("@/views/component/seamless/index.vue");
const ComponentEchart = () => import("@/views/component/echarts/index.vue");
const ComponentDigitalInput = () => import("@/views/component/digital-input/index.vue");
// 页面示例
const PageTransparent = () => import("@/views/page/transparent.vue");
const PageFullScreen = () => import("@/views/page/full-screen.vue");
const PageMultiLevel = () => import("@/views/page/multi-level/index.vue");
const PageMultiLevelChild = () => import("@/views/page/multi-level/child.vue");
const PageAlias = () => import("@/views/page/alias/index.vue");
const PageAliasOperate = () => import("@/views/page/alias/operate.vue");

// 工具
const ToolsProfitCalculator = () => import("@/views/tools/profit-calculator/index.vue");
// 产品管理
const ProductList = () => import("@/views/product/list/index.vue");
const ProductForm = () => import("@/views/product/form/index.vue");
const ProductDetail = () => import("@/views/product/detail/index.vue");
// 参数列表：5 张二维字典表共用一个页面组件，按 path 末段区分字典类型
// fba-rate（尺寸收费标准）是专属页：两个分段各一张表 + 多级表头
const ParamsTable = () => import("@/views/params/table/index.vue");
const ParamsFbaRate = () => import("@/views/params/fba-rate/index.vue");
const ParamsCommission = () => import("@/views/params/commission/index.vue");
const ParamsExchange = () => import("@/views/params/exchange/index.vue");

const route = [
  // 菜单示例
  { path: "/menu/nested", name: "MenusNested", component: MenusNested },
  { path: "/menu/normal", name: "MenusNormal", component: MenusNormal },
  // 组件示例
  { path: "/component/search", name: "ComponentSearch", component: ComponentSearch },
  { path: "/component/dialog", name: "ComponentDialog", component: ComponentDialog },
  { path: "/component/table", name: "ComponentTable", component: ComponentTable },
  { path: "/component/table-full", name: "ComponentTableFull", component: ComponentTableFull },
  { path: "/component/digtal", name: "ComponentDigital", component: ComponentDigital },
  { path: "/component/seamless", name: "ComponentSeamless", component: ComponentSeamless },
  { path: "/component/tree", name: "ComponentTree", component: ComponentTree },
  { path: "/component/echarts", name: "ComponentEchart", component: ComponentEchart },
  { path: "/component/digital-input", name: "ComponentDigitalInput", component: ComponentDigitalInput },
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

  // 配置示例：业务区域全屏
  // {
  //   path: "/example/tree",
  //   name: "exampleTreeFilter",
  //   component: exampleTreeFilter,
  //   meta: { wrapperType: "fullPage" },
  // },

  // 配置示例：背景色透明、全屏展示
  {
    path: "/page/full-screen",
    name: "PageFullScreen",
    component: PageFullScreen,
    meta: { wrapperType: "fullPage", transparentBackground: true },
  },
  // 配置示例：背景色透明、取消面包屑
  {
    path: "/page/transparent",
    name: "PageTransparent",
    component: PageTransparent,
    meta: { transparentBackground: true, noBreadcrumb: true },
  },
  // 配置示例：多级路由，高亮父级菜单
  { path: "/page/multi-level", name: "PageMultiLevel", component: PageMultiLevel },
  {
    path: "/page/multi-level/child",
    name: "PageMultiLevelChild",
    component: PageMultiLevelChild,
    meta: { targetMenuPath: "/page/multi-level" },
  },
  { path: "/page/alias", name: "PageAlias", component: PageAlias },
  {
    path: "/page/alias/operate",
    name: "PageAliasOperate",
    component: PageAliasOperate,
    meta: { targetMenuPath: "/page/alias" },
  },
];

export default route;
