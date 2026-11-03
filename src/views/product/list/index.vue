<template>
  <div class="product-list" :class="densityClass">
    <RhSearch :searchInfo="searchInfo" @search="handleSearch" />

    <!-- 工具栏 -->
    <div class="pl-toolbar">
      <div class="pl-toolbar__left">
        <span class="pl-title">产品列表</span>
        <span class="pl-count">共 {{ tableData.pages.total }} 条</span>
      </div>

      <div class="pl-toolbar__right">
        <!-- 密度切换 -->
        <el-radio-group v-model="density" size="small" class="pl-density">
          <el-radio-button
            v-for="item in DENSITY_OPTIONS"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>

        <!-- 列设置 -->
        <el-dropdown ref="colDropdownRef" trigger="click">
          <el-button size="small" icon="Setting">列设置</el-button>
          <template #dropdown>
            <div class="pl-colpanel">
              <div class="pl-colpanel__tip">拖动表头右侧可调整列宽</div>
              <el-checkbox-group v-model="visibleKeys">
                <el-checkbox
                  v-for="col in toggleableColumns"
                  :key="col.key"
                  :value="col.key"
                >
                  {{ col.label }}
                </el-checkbox>
              </el-checkbox-group>
              <div class="pl-colpanel__footer">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleResetWidth"
                >
                  恢复默认列宽
                </el-button>
              </div>
            </div>
          </template>
        </el-dropdown>

        <!-- 批量导入：一次录多个产品走这里，单个产品走右边「录入产品」手工填 -->
        <el-button
          size="small"
          type="primary"
          plain
          icon="Upload"
          @click="showImport = true"
        >
          批量导入
        </el-button>

        <el-button
          color="#626aef"
          :dark="isDark"
          size="small"
          icon="Plus"
          @click="handleCreate"
          plain
        >
          录入产品
        </el-button>
      </div>
    </div>

    <!-- border 必须开：Element Plus 源码里列宽拖拽的第一道判断就是 if (!props.border) return，
         不开 border 连 col-resize 光标都不会出现。竖线视觉已在本页样式里隐藏，只留功能 -->
    <RhTable
      :table-data="tableData"
      :loading="loading"
      class="pl-table"
      border
      @page-change="fn_getList"
      @page-size-change="pageSizeChange"
      @sort-change="handleSortChange"
      @header-dragend="handleHeaderDragend"
    >
      <!-- 产品图片 -->
      <template #main_image="{ scope }">
        <ProductThumb :src="scope.row.main_image" />
      </template>

      <!-- 产品名称：中文名 + 英文名两行 -->
      <template #name_cn="{ scope }">
        <span class="pl-product">
          <span class="pl-product__main">{{ scope.row.name_cn || "--" }}</span>
          <span class="pl-product__sub">{{ scope.row.name_en || "--" }}</span>
        </span>
      </template>

      <!-- 类目：code → name -->
      <template #category_code="{ scope }">
        {{ getCategoryName(scope.row.category_code) || "--" }}
      </template>

      <!-- 尺寸 -->
      <template #size="{ scope }">
        <template v-if="scope.row.length_cm">
          {{ scope.row.length_cm }} × {{ scope.row.width_cm }} ×
          {{ scope.row.height_cm }} cm
        </template>
        <template v-else>--</template>
      </template>

      <!-- 状态：彩色圆点 + 文字（比整块 tag 更轻） -->
      <template #status="{ scope }">
        <span class="pl-status">
          <i
            class="pl-status__dot"
            :style="{
              backgroundColor:
                productStatusMap[scope.row.status]?.color || '#94a3b8',
            }"
          ></i>
          {{ productStatusMap[scope.row.status]?.name || "--" }}
        </span>
      </template>

      <!-- 配送状态：状态标签 + 天数差（提前 2 天 / 准时 / 晚 3 天）
           未确认且已填预计送达时间时，这里直接给「确认送达」，不用再点进详情页 -->
      <template #delivery_status="{ scope }">
        <span class="pl-delivery">
          <el-tag
            :type="getDeliveryStatus(scope.row).tag"
            effect="light"
            size="small"
          >
            {{ getDeliveryStatus(scope.row).name }}
          </el-tag>
          <span v-if="getDeliveryDaysText(scope.row)" class="pl-delivery__days">
            {{ getDeliveryDaysText(scope.row) }}
          </span>
          <el-button
            v-if="canConfirm(scope.row)"
            link
            type="primary"
            class="pl-delivery__confirm"
            :loading="deliveryLoadingId === scope.row.id"
            @click="handleConfirmDelivery(scope.row)"
          >
            确认送达
          </el-button>
        </span>
      </template>

      <!-- 操作：详情 / 修改 / 删除，文字全部常驻可见 -->
      <template #operate="{ scope }">
        <span class="pl-actions">
          <el-button link type="primary" @click="handleDetail(scope.row)"
            >详情</el-button
          >
          <el-button link type="primary" @click="handleEdit(scope.row)"
            >修改</el-button
          >
          <el-button link type="danger" @click="handleDelete(scope.row)"
            >删除</el-button
          >
        </span>
      </template>

      <!-- 空状态：区分「本来就没数据」和「筛选没命中」 -->
      <template #empty>
        <div class="pl-empty">
          <div class="pl-empty__icon">📦</div>
          <div class="pl-empty__title">
            {{ hasFilter ? "没有匹配的产品" : "还没有产品" }}
          </div>
          <div class="pl-empty__desc">
            {{
              hasFilter
                ? "试试调整或清空筛选条件"
                : "录入第一个产品，开始测算利润"
            }}
          </div>
          <el-button v-if="hasFilter" size="small" @click="handleClearFilter">
            清空筛选
          </el-button>
          <el-button
            color="#626aef"
            :dark="isDark"
            size="small"
            icon="Plus"
            @click="handleCreate"
            plain
          >
            录入产品
          </el-button>
        </div>
      </template>
    </RhTable>

    <!-- 批量导入弹窗： import 成功后会触发 refresh，列表自动重查 -->
    <ProductImportDialog v-model="showImport" @success="handleImportSuccess" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useCommon } from "@/hooks/useCommon.js";
import {
  getProductList,
  deleteProduct,
  confirmDelivery,
} from "@/api/product.js";
import ProductThumb from "../components/product-thumb.vue";
import ProductImportDialog from "../components/product-import-dialog.vue";
import {
  STATUS_ENUM,
  SIZE_TIER_ENUM,
  productStatusMap,
  CODE_NAME_PROPS,
  categoryState,
  loadCategoryOptions,
  getCategoryName,
  getDeliveryStatus,
  getDeliveryDaysText,
  isDelivered,
  previewDeliveryResult,
} from "../options.js";

const { toPage } = useCommon();

/* 密度：紧凑 / 标准 / 宽松，存 localStorage，刷新保留 */
const DENSITY_OPTIONS = [
  { label: "紧凑", value: "compact" },
  { label: "标准", value: "default" },
  { label: "宽松", value: "loose" },
];
const DENSITY_KEY = "cyxy:product-list:density";
// 列配置带版本号：新增列后改版本号，可让老缓存失效，否则用户永远看不到新列
// v3：新增「尺寸分段」「关税费」两列
// v4：新增「配送状态」列（含提前 / 准时 / 晚送达），旧缓存里没有，必须升版本
const COLUMNS_KEY = "cyxy:product-list:columns:v4";
// 列宽单独存一份：翻页 / 查询会重建 columns 数组，不持久化的话拖好的宽度会被打回默认
const WIDTH_KEY = "cyxy:product-list:widths:v1";

const density = ref(localStorage.getItem(DENSITY_KEY) || "default");
const densityClass = computed(() => `is-${density.value}`);
watch(density, (val) => localStorage.setItem(DENSITY_KEY, val));

const loading = ref(false);
const searchData = ref({});
// 批量导入弹窗
const showImport = ref(false);
const handleImportSuccess = () => fn_getList(tableData.pages.pageNumber);

/* 搜索配置：key 直接对应后端查询参数名，接后端时无需改名
 * 用 computed 而非 ref —— 类目选项是接口异步回来的，
 * 写成 computed 才能在字典到货后自动重建配置，否则下拉永远是空的 */
const searchInfo = computed(() => [
  {
    type: "input",
    label: "产品名称",
    placeholder: "支持中文 / 英文名称",
    key: "nameCn",
    defaultValue: "",
    colSpan: 6,
  },
  {
    type: "input",
    label: "产品编号",
    placeholder: "请输入产品编号",
    key: "productNo",
    defaultValue: "",
    colSpan: 6,
  },
  {
    type: "select",
    label: "产品类目",
    placeholder: categoryState.loading ? "类目加载中…" : "请选择产品类目",
    key: "categoryCode",
    defaultValue: "",
    colSpan: 6,
    options: categoryState.options,
    props: CODE_NAME_PROPS,
    filterable: true,
  },
  {
    type: "select",
    label: "产品状态",
    placeholder: "请选择产品状态",
    key: "status",
    defaultValue: "",
    colSpan: 6,
    options: STATUS_ENUM,
    props: { label: "label", value: "value" },
  },
]);

/* 可显隐的列（序号与操作列固定常驻）
 * 列顺序 = 这里数组的顺序
 * width  = 固定宽；minWidth = 弹性宽（吸收容器剩余空间，不留白）
 * 两种都能拖：minWidth 的列拖过一次后，实际宽度会被记进 widthMap，之后按你的意图固定 */
const toggleableColumns = [
  { key: "product_no", label: "产品编号", prop: "product_no", width: 130 },
  { key: "name_cn", label: "产品名称", prop: "name_cn", minWidth: 220 },
  {
    key: "main_image",
    label: "产品图片",
    prop: "main_image",
    width: 85,
    align: "center",
  },
  {
    key: "category_code",
    label: "产品类目",
    prop: "category_code",
    width: 150,
  },
  { key: "supplier", label: "供应商", prop: "supplier", minWidth: 160 },
  {
    key: "purchase_price",
    label: "采购单价",
    prop: "purchase_price",
    width: 110,
    align: "right",
    sortable: "custom",
    prefix: "￥",
  },
  {
    key: "packaged_weight_g",
    label: "含包装实重",
    prop: "packaged_weight_g",
    width: 120,
    align: "right",
    sortable: "custom",
    suffix: " g",
  },
  { key: "size", label: "包装尺寸", prop: "size", minWidth: 170 },
  {
    key: "list_price_usd",
    label: "定价",
    prop: "list_price_usd",
    width: 100,
    align: "right",
    sortable: "custom",
    prefix: "$",
  },
  {
    key: "monthly_sales_est",
    label: "预估月销",
    prop: "monthly_sales_est",
    width: 110,
    align: "right",
    sortable: "custom",
    suffix: " 件",
  },
  { key: "status", label: "状态", prop: "status", width: 100, align: "center" },
  {
    key: "delivery_status",
    label: "配送状态",
    prop: "delivery_status",
    /* 170 是给「标签 + 确认送达」并排留的位置，太窄按钮会被裁掉 */
    width: 170,
    align: "center",
  },
  {
    key: "size_tier_code",
    label: "尺寸分段",
    prop: "size_tier_code",
    width: 130,
    align: "center",
    enum: SIZE_TIER_ENUM,
    tag: true,
  },
  {
    key: "tariff_fee",
    label: "关税费",
    prop: "tariff_fee",
    width: 100,
    align: "right",
    prefix: "￥",
  },
  { key: "created_time", label: "创建时间", prop: "created_time", width: 165 },
];

// 默认显示的列（其余收进「列设置」，避免横向滚动灾难）
const DEFAULT_KEYS = [
  "product_no",
  "name_cn",
  "main_image",
  "category_code",
  // "supplier",
  "purchase_price",
  "packaged_weight_g",
  // "list_price_usd",
  "size_tier_code",
  "status",
  "delivery_status",
];

function loadVisibleKeys() {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMNS_KEY));
    if (Array.isArray(raw) && raw.length) return raw;
  } catch (e) {
    /* 解析失败就用默认值 */
  }
  return [...DEFAULT_KEYS];
}

const visibleKeys = ref(loadVisibleKeys());

/* 列宽覆盖值：{ [column.key]: number }，由表头拖拽写入并持久化 */
function loadWidths() {
  try {
    const raw = JSON.parse(localStorage.getItem(WIDTH_KEY));
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  } catch (e) {
    /* 解析失败就用默认宽度 */
  }
  return {};
}
const widthMap = ref(loadWidths());
// 序号 / 操作列也允许拖宽，给它们各自一个兜底值
const colWidth = (key, fallback) => widthMap.value[key] ?? fallback;

const tableData = reactive({
  showOverflowTooltip: true,
  columns: [],
  data: [],
  // 总数在工具栏已展示，分页器里去掉 total 避免重复；保留 sizes 方便调每页条数
  pages: {
    total: 0,
    pageNumber: 1,
    pageSize: 10,
    hideOnSinglePage: false,
    layout: "sizes, prev, pager, next, jumper",
  },
});

// 排序状态：交给后端/接口处理，保证整库排序而不是只排当前页
const sortState = ref({ prop: "", order: "" });

// 可见列 = 序号 + 勾选列 + 操作列（操作列固定右侧）
function syncColumns() {
  const cols = [
    {
      label: "序号",
      type: "index",
      width: colWidth("index", 60),
      fixed: "left",
    },
  ];
  toggleableColumns.forEach((col) => {
    if (visibleKeys.value.includes(col.key)) {
      cols.push({ ...col, width: colWidth(col.key, col.width) });
    }
  });
  cols.push({
    label: "操作",
    prop: "operate",
    width: colWidth("operate", 170),
    fixed: "right",
    align: "center",
  });
  tableData.columns = cols;
}
// 列显隐变化时：同步表格列 + 记住用户选择
watch(
  visibleKeys,
  (val) => {
    localStorage.setItem(COLUMNS_KEY, JSON.stringify(val));
    syncColumns();
  },
  { immediate: true, deep: true }
);

// 是否处于筛选状态（决定空状态文案）
const hasFilter = computed(() => {
  const { nameCn, productNo, categoryCode, status } = searchData.value || {};
  return !!(nameCn || productNo || categoryCode || status);
});

onMounted(() => {
  // 类目字典先拉，列表数据回来后表格里的类目名才不会先显示 code 再跳成中文
  loadCategoryOptions();
  fn_getList(1);
});

// 搜索
const handleSearch = (params) => {
  searchData.value = params;
  fn_getList(1);
};

// 列表查询
const fn_getList = (pageNumber = 1) => {
  loading.value = true;
  const params = Object.assign({}, searchData.value, {
    pageNumber,
    pageSize: tableData.pages.pageSize,
    sortField: sortState.value.prop,
    sortOrder: sortState.value.order,
  });
  getProductList(params)
    .then((res) => {
      tableData.data = res.rows;
      tableData.pages.total = res.total;
      tableData.pages.pageNumber = params.pageNumber;
    })
    .finally(() => {
      loading.value = false;
    });
};

// 更变每页条数
const pageSizeChange = (pageSize) => {
  tableData.pages.pageSize = pageSize;
  fn_getList(1);
};

// 排序
const handleSortChange = ({ prop, order }) => {
  sortState.value = { prop: order ? prop : "", order: order || "" };
  fn_getList(1);
};

/* 拖拽表头调整列宽：
 * el-table 只改它自己内部的 column 宽度，不会回写到我们的 columns 数组；
 * 而翻页 / 查询会让 columns 整体重建，不记下来就会被打回默认宽度 */
const handleHeaderDragend = (newWidth, oldWidth, column) => {
  // 数据列用 property（=prop），序号列没有 prop，退回用 type
  const key = column?.property || column?.type;
  if (!key) return;
  widthMap.value = { ...widthMap.value, [key]: newWidth };
  localStorage.setItem(WIDTH_KEY, JSON.stringify(widthMap.value));
};

// 恢复默认列宽（列显隐保持不动）
const colDropdownRef = ref();
const handleResetWidth = () => {
  widthMap.value = {};
  localStorage.removeItem(WIDTH_KEY);
  syncColumns();
  ElMessage.success("已恢复默认列宽");
  colDropdownRef.value?.handleClose?.();
};

// 录入产品
const handleCreate = () => {
  toPage("ProductForm");
};

// 查看详情（只读态；走 store 传参，刷新后参数仍在）
const handleDetail = (row) => {
  toPage("ProductDetail", { id: row.id });
};

// 修改（跳同一个详情页，但直接进编辑态）
const handleEdit = (row) => {
  toPage("ProductDetail", { id: row.id, edit: true });
};

// 清空筛选
const handleClearFilter = () => {
  searchData.value = {};
  fn_getList(1);
};

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除产品「${row.name_cn}」吗？`, "删除确认", {
    type: "warning",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
  })
    .then(() => deleteProduct(row.id))
    .then(() => {
      ElMessage.success("删除成功");
      fn_getList(tableData.pages.pageNumber);
    })
    .catch(() => {});
};

/* ------------------------------------------------------------------ */
/* 配送状态：列表内直接确认送达（不用进详情页）                          */
/* ------------------------------------------------------------------ */
// 行级 loading：只让被点的那一行转圈，不要整表按钮一起转
const deliveryLoadingId = ref(null);

// 可确认 = 还没确认送达 + 已经填了预计送达时间（没基准就判不出提前还是晚）
const canConfirm = (row) => !isDelivered(row) && !!row.expected_delivery_date;

/**
 * 确认送达：与详情页同一套口径 —— 先把「会判成什么」给用户看，再让他点。
 * 这是不可逆动作（要改只能回详情页撤销），所以列表里也必须过二次确认这一关
 */
const handleConfirmDelivery = (row) => {
  const preview = previewDeliveryResult(row.expected_delivery_date);
  if (!preview) {
    ElMessage.warning("请先填写预计送达时间");
    return;
  }

  ElMessageBox.confirm(
    `预计送达 ${row.expected_delivery_date}，按今天（北京时间）判定为「${preview.statusName}」，${preview.text}。确认后预计送达时间将锁定，如需修改请到详情页撤销确认。`,
    `确认送达 · ${row.name_cn || row.product_no || ""}`,
    {
      type: "warning",
      confirmButtonText: "确认送达",
      cancelButtonText: "再等等",
    }
  )
    .then(() => {
      deliveryLoadingId.value = row.id;
      return confirmDelivery(row.id);
    })
    .then((res) => {
      // 接口返回整条产品，直接并回这一行：不重查列表，避免翻页位置和滚动条跳走
      if (res && res.id) Object.assign(row, res);
      else fn_getList(tableData.pages.pageNumber);
      ElMessage.success(
        `已确认送达：${getDeliveryStatus(row).name}${
          getDeliveryDaysText(row) ? `，${getDeliveryDaysText(row)}` : ""
        }`
      );
    })
    .catch(() => {})
    .finally(() => {
      deliveryLoadingId.value = null;
    });
};
</script>

<style lang="scss" scoped>
.product-list {
  /* ============================================================
     配色集中在这里，后期想换风格只改下面这几个 HEX 即可
     ============================================================ */
  --pl-head-bg: #f7f9fc; // 表头底色
  --pl-head-color: #64748b; // 表头字色
  --pl-row-border: #eef1f6; // 行分隔线
  --pl-row-hover: #f2f7ff; // 行 hover 底色
  --pl-accent: #3b7ddd; // 主强调色（hover 左侧条）
  --pl-num-color: #1f2d3d; // 数字字色
  --pl-sub-color: #94a1b3; // 次要说明文字
  --pl-panel-bg: #ffffff; // 列设置面板底色

  /* ---------- 工具栏 ---------- */
  .pl-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .pl-toolbar__left,
  .pl-toolbar__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pl-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .pl-count {
    font-size: 13px;
    color: var(--pl-sub-color);
  }

  .pl-colpanel {
    padding: 12px 16px;
    background-color: var(--pl-panel-bg);
  }

  .pl-colpanel__tip {
    font-size: 12px;
    color: var(--pl-sub-color);
    padding-bottom: 6px;
  }

  .pl-colpanel__footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--pl-row-border);
  }

  .pl-colpanel :deep(.el-checkbox) {
    display: flex;
    width: 100%;
    margin-right: 0;
    height: 30px;
  }

  /* ---------- 表格本体 ---------- */
  /* border 属性是列宽拖拽的总开关（EP 源码强制要求），开启后 EP 自带的
     边框线全部在这里藏掉，外框换成下面这圈柔和阴影 */
  .pl-table {
    border-radius: 10px;
    box-shadow: 0 0 0 1px var(--pl-row-border);

    :deep(.el-table__inner-wrapper)::before,
    :deep(.el-table__inner-wrapper)::after {
      display: none;
    }

    :deep(.el-table__header-wrapper) th.el-table__cell {
      background-color: var(--pl-head-bg) !important;
      color: var(--pl-head-color);
      font-size: 13px;
      font-weight: 600;
      /* 去竖线：只留底部一条分隔 */
      border-right: none;
      border-left: none;
      border-bottom: 1px solid var(--pl-row-border);
      transition: background-color 0.2s ease;
      position: relative;

      /* 列宽可拖：hover 到表头时右侧浮出一条细线，提示这里能拉 */
      &::after {
        content: "";
        position: absolute;
        top: 28%;
        right: 0;
        width: 1px;
        height: 44%;
        background-color: transparent;
        transition: background-color 0.15s ease;
      }

      &:hover::after {
        background-color: #b9c6d8;
      }
    }

    /* 拖拽时跟随鼠标的指示线 */
    :deep(.el-table__column-resize-proxy) {
      border-left-color: var(--pl-accent);
    }

    :deep(.el-table__body) td.el-table__cell {
      border-right: none;
      border-left: none;
      border-bottom: 1px solid var(--pl-row-border);
    }

    /* 行 hover：底色 + 左侧强调条，带过渡 */
    :deep(.el-table__body) tr.el-table__row {
      transition: background-color 0.18s ease;

      &:hover > td.el-table__cell {
        background-color: var(--pl-row-hover);
      }

      &:hover > td.el-table__cell:first-child {
        box-shadow: inset 3px 0 0 var(--pl-accent);
      }
    }

    /* 行入场动画：前 10 行依次淡入上浮，翻页/筛选时重新播放 */
    :deep(.el-table__body) tr.el-table__row {
      animation: plRowIn 0.32s cubic-bezier(0.22, 0.61, 0.36, 1) both;
    }

    @for $i from 1 through 10 {
      :deep(.el-table__body) tr.el-table__row:nth-child(#{$i}) {
        animation-delay: #{$i * 0.024}s;
      }
    }

    /* 数字列：等宽字形，方便纵向比对量级 */
    :deep(.el-table__body) td.el-table__cell {
      font-variant-numeric: tabular-nums;
      color: var(--pl-num-color);
    }
  }

  /* ---------- 产品单元格：中文名 + 英文名两行 ---------- */
  .pl-product {
    display: inline-flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.4;
  }

  .pl-product__main {
    color: var(--el-text-color-primary);
  }

  .pl-product__sub {
    font-size: 12px;
    color: var(--pl-sub-color);
  }

  /* ---------- 状态圆点 ---------- */
  .pl-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .pl-status__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex: none;
  }

  /* ---------- 配送状态：标签 + 天数差 ---------- */
  .pl-delivery {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .pl-delivery__days {
    font-size: 12px;
    color: var(--pl-sub-color);
    font-variant-numeric: tabular-nums;
  }

  /* 行内「确认送达」：文字按钮，压掉 el-button 默认内边距和高度，
     免得把行撑高、也免得在紧凑模式下顶到上下边框 */
  .pl-delivery :deep(.pl-delivery__confirm) {
    padding: 0;
    height: auto;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
  }

  /* ---------- 操作列：三个按钮常驻可见 ---------- */
  .pl-actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
  }

  /* ---------- 空状态 ---------- */
  .pl-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 36px 0 30px;
  }

  .pl-empty__icon {
    font-size: 34px;
    line-height: 1;
    margin-bottom: 4px;
  }

  .pl-empty__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .pl-empty__desc {
    font-size: 13px;
    color: var(--pl-sub-color);
    margin-bottom: 8px;
  }

  /* ---------- 分页器：轻量化 ---------- */
  :deep(.el-pagination) {
    font-weight: 400;
  }

  :deep(.el-pagination .el-pager li.is-active) {
    font-weight: 600;
  }

  /* ---------- 行高密度三档 ---------- */
  &.is-compact :deep(.el-table__cell) {
    padding: 5px 0;
  }

  &.is-loose :deep(.el-table__cell) {
    padding: 14px 0;
  }
}

@keyframes plRowIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
