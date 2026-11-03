<template>
  <div class="params-page">
    <div class="params-head">
      <div class="params-head__main">
        <h1 class="params-title">{{ meta.title }}</h1>
        <p class="params-note">{{ meta.note }}</p>
      </div>
      <div class="params-head__side">
        <span class="params-count">
          共 <strong>{{ rows.length }}</strong> 个类目 ·
          <strong>{{ tierCount }}</strong> 个档位
        </span>
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <el-button size="small" disabled>编辑</el-button>
        <span class="params-edit-hint">编辑功能后续版本开放</span>
      </div>
    </div>

    <div class="params-panel">
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

      <div v-else-if="error" class="params-state">
        <i class="params-state__dot"></i>
        <span class="params-state__text">
          读取「{{ meta.title }}」失败：{{ error }}。{{
            lastLoadedAt ? `上次成功读取于 ${lastLoadedAt}。` : "尚未成功读取过。"
          }}
        </span>
        <el-button link type="primary" size="small" @click="load">重试</el-button>
      </div>

      <!-- 树形表格：父=类目，子=阶梯档位；row-key / tree-props 由 RhTable 的 $attrs 透传给 el-table -->
      <RhTable
        v-else
        :table-data="tableData"
        border
        row-key="row_key"
        :tree-props="{ children: 'children' }"
      >
        <template #empty>
          <div class="params-empty">
            佣金类目还没有数据，导入之后单一费率与阶梯档位会在这里分层列出。
          </div>
        </template>
      </RhTable>

      <div class="params-source">
        数据来源：{{ meta.source }}　·　点击类目左侧箭头展开阶梯档位
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { getCommissionTree } from "@/api/dict.js";
import { DICT_COLUMNS, DICT_META, formatTree } from "../columns.js";
import "../params.css";

const meta = DICT_META.commission;
const columns = DICT_COLUMNS.commission;

const rows = ref([]);
const loading = ref(false);
const error = ref("");
const lastLoadedAt = ref("");

const tierCount = computed(() =>
  rows.value.reduce((sum, node) => sum + (node.children?.length || 0), 0)
);

const tableData = computed(() => ({
  columns: columns.map(({ format, ...rest }) => rest),
  data: formatTree(rows.value, columns),
}));

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await getCommissionTree();
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

onMounted(load);
</script>
