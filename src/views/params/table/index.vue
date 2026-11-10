<template>
  <div class="params-page">
    <!-- 名词标题 + 一句数据口径说明；右侧是真实动作与记录数，不是 KPI 卡片 -->
    <div class="params-head">
      <div class="params-head__main">
        <h1 class="params-title">{{ meta.title }}</h1>
        <p class="params-note">{{ meta.note }}</p>
      </div>
      <div class="params-head__side">
        <span class="params-count"
          >共 <strong>{{ rows.length }}</strong> 条</span
        >
        <el-button size="small" :loading="loading" @click="load"
          >刷新</el-button
        >
        <el-button size="small" disabled>编辑</el-button>
        <span class="params-edit-hint">编辑功能后续版本开放</span>
      </div>
    </div>

    <div class="params-panel">
      <!-- 加载：扁平灰条，保持行高，布局不移位 -->
      <div v-if="loading" class="params-skeleton">
        <div v-for="i in 6" :key="i" class="params-skeleton__row">
          <span
            v-for="(col, j) in columns.slice(0, 7)"
            :key="j"
            class="params-skeleton__bar"
            :style="{ width: Math.min(col.width || 120, 220) + 'px' }"
          ></span>
        </div>
      </div>

      <!-- 错误：留在失败的块内，说明最后一次正常读取的时间，给重试 -->
      <div v-else-if="error" class="params-state">
        <i class="params-state__dot"></i>
        <span class="params-state__text">
          读取「{{ meta.title }}」失败：{{ error }}。{{
            lastLoadedAt
              ? `上次成功读取于 ${lastLoadedAt}。`
              : "尚未成功读取过。"
          }}
        </span>
        <el-button link type="primary" size="small" @click="load"
          >重试</el-button
        >
      </div>

      <RhTable v-else :table-data="tableData" border>
        <template #empty>
          <div class="params-empty">
            这张字典表还没有数据，导入之后会在这里按口径逐条列出。
          </div>
        </template>

        <!-- operate 是 RhTable 约定的操作列插槽。只有「全局参数」页的
             「最新汇率」这一行会用到；其他参数页没有 operate 列，插槽不会被渲染，
             所以这里加东西不会波及后期才开放编辑功能的那些页面。 -->
        <template #operate="{ scope }">
          <template v-if="isExchangeRateRow(scope.row)">
            <el-button
              size="small"
              type="primary"
              :loading="rateSyncing"
              @click="handleFetchLatestRate"
              link
            >
              获取最新汇率
            </el-button>
            <!-- 修改时间直接取当前行的 updated_time：点完按钮会重载表格，
                 两边必然同步，不需要再单独维护一份状态 -->
            <div class="params-rate-updated">
              更新于 {{ scope.row.updated_time || "--" }}
            </div>
          </template>
          <span v-else>--</span>
        </template>
      </RhTable>

      <div class="params-source">数据来源：{{ meta.source }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { getDictTable } from "@/api/dict.js";
import { refreshExchangeRate } from "@/api/exchange-rate.js";
import { DICT_COLUMNS, DICT_META, formatRows } from "../columns.js";
import "../params.css";

const route = useRoute();

// 6 个路由复用本组件，type 直接取 path 末段，与后端白名单一致
const type = computed(() => route.path.split("/").pop());
const meta = computed(
  () => DICT_META[type.value] || { title: "参数列表", source: "-", note: "" }
);
const columns = computed(() => DICT_COLUMNS[type.value] || []);

const rows = ref([]);
const loading = ref(false);
const error = ref("");
const lastLoadedAt = ref("");

// 传给 RhTable 的列去掉 format（那是数据预处理用的，不该落到 el-table-column 上）
const tableData = computed(() => ({
  columns: columns.value.map(({ format, ...rest }) => rest),
  data: formatRows(rows.value, columns.value),
}));

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await getDictTable(type.value);
    if (!Array.isArray(res)) throw new Error("接口返回格式异常");
    rows.value = res;
    lastLoadedAt.value = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    error.value = e?.message || "未知错误";
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

/* ------------------------------------------------------------------
   全局参数「最新汇率」行的专属动作
   —— 与利润测算页「取最新」、汇率变化页「同步最新汇率」调同一个后端接口：
      后端去外部 API 取真·最新值，一个事务里写历史表 + 更新全局参数。
      使用者不必知道汇率存在哪张表，点一下就是拿到最新汇率并生效。
   ------------------------------------------------------------------ */
const rateSyncing = ref(false);

/** 只在「全局参数」页的 DEFAULT_EXCHANGE_RATE 这一行渲染按钮，其余行保持 "--" */
const isExchangeRateRow = (row) =>
  type.value === "sys-config" && row?.config_key === "DEFAULT_EXCHANGE_RATE";

const handleFetchLatestRate = async () => {
  rateSyncing.value = true;
  try {
    await refreshExchangeRate();
    // 重载表格才能拿到数据库刚写入的 updated_time，保证「最后更新」列和操作列
    // 显示的是同一个时间；失败时不重载，页面保留原值和原时间
    await load();
    ElMessage.success("已获取最新汇率，全局参数已更新");
  } catch (e) {
    // request 拦截器已统一弹错，这里只补一句业务说明，不打断页面
    ElMessage.warning("获取失败，已保留当前汇率与修改时间");
  } finally {
    rateSyncing.value = false;
  }
};

// ⚠️ 多个路由指向同一个组件时 Vue Router 会复用实例、不重新 mount，
// 所以必须 watch(route.path) 而不是只靠 onMounted，否则切菜单不会换数据
watch(() => route.path, load, { immediate: true });
</script>
