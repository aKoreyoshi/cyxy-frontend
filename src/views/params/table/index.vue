<template>
  <div class="params-page">
    <!-- 名词标题 + 一句数据口径说明；右侧是真实动作与记录数，不是 KPI 卡片 -->
    <div class="params-head">
      <div class="params-head__main">
        <h1 class="params-title">{{ meta.title }}</h1>
        <p class="params-note">{{ meta.note }}</p>
      </div>
      <div class="params-head__side">
        <span class="params-count">共 <strong>{{ rows.length }}</strong> 条</span>
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
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
            lastLoadedAt ? `上次成功读取于 ${lastLoadedAt}。` : "尚未成功读取过。"
          }}
        </span>
        <el-button link type="primary" size="small" @click="load">重试</el-button>
      </div>

      <RhTable v-else :table-data="tableData" border>
        <template #empty>
          <div class="params-empty">
            这张字典表还没有数据，导入之后会在这里按口径逐条列出。
          </div>
        </template>
      </RhTable>

      <div class="params-source">数据来源：{{ meta.source }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getDictTable } from "@/api/dict.js";
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

// ⚠️ 多个路由指向同一个组件时 Vue Router 会复用实例、不重新 mount，
// 所以必须 watch(route.path) 而不是只靠 onMounted，否则切菜单不会换数据
watch(() => route.path, load, { immediate: true });
</script>
