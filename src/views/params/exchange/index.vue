<template>
  <div class="params-page">
    <div class="params-head">
      <div class="params-head__main">
        <h1 class="params-title">{{ meta.title }}</h1>
        <p class="params-note">{{ meta.note }}</p>
      </div>
      <div class="params-head__side">
        <span class="params-count">共 <strong>{{ rows.length }}</strong> 条记录</span>
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <!-- 同步按钮调后端重新拉外部汇率；后端失败会保留上一次值，页面不会白屏 -->
        <el-button
          size="small"
          type="primary"
          :loading="syncing"
          @click="handleSync"
        >
          同步最新汇率
        </el-button>
        <el-button size="small" disabled>编辑</el-button>
        <span class="params-edit-hint">编辑功能后续版本开放</span>
      </div>
    </div>

    <!-- 趋势 + 摘要：图表占 2/3，右侧放同一份数据算出来的答案，避免一条平线占满整行 -->
    <div class="params-panel">
      <div class="params-panel__head">
        <h2 class="params-panel__title">汇率走势 · USD/CNY</h2>
        <span class="params-panel__meta">{{ period }}</span>
      </div>

      <div v-if="error" class="params-state">
        <i class="params-state__dot"></i>
        <span class="params-state__text">
          读取汇率失败：{{ error }}。{{
            lastLoadedAt ? `上次成功读取于 ${lastLoadedAt}。` : "尚未成功读取过。"
          }}
        </span>
        <el-button link type="primary" size="small" @click="load">重试</el-button>
      </div>

      <div v-else class="params-exchange-layout">
        <div class="params-chart">
          <!-- 不传 type：RhChart 会直接使用下面的 option，不合并默认样式 -->
          <RhChart :option="chartOption" />
        </div>

        <div class="params-summary">
          <!-- 当前值读 sys_config「最新汇率」，不是从趋势表最后一行取：
               本页表格与折线图只记录历史，业务读取的唯一入口是全局参数 -->
          <div class="params-summary__item">
            <span class="params-summary__label">最新汇率</span>
            <span class="params-summary__lead">{{ fixed(currentRate, 4) }}</span>
          </div>
          <div class="params-summary__item">
            <span class="params-summary__label">当前值日期</span>
            <span class="params-summary__value">
              {{ currentRateDate || "--"
              }}{{ currentRateStale ? "（可能过期）" : "" }}
            </span>
          </div>
          <!-- 全局参数「最新汇率」这一行的修改时间：与全局参数页、利润测算页同源同格式 -->
          <div class="params-summary__item">
            <span class="params-summary__label">修改时间</span>
            <span class="params-summary__value">{{ currentRateUpdated || "--" }}</span>
          </div>
          <div class="params-summary__item">
            <span class="params-summary__label">期间最高</span>
            <span class="params-summary__value">{{ fixed(maxRate, 4) }}</span>
          </div>
          <div class="params-summary__item">
            <span class="params-summary__label">期间最低</span>
            <span class="params-summary__value">{{ fixed(minRate, 4) }}</span>
          </div>
          <div class="params-summary__item">
            <span class="params-summary__label">记录条数</span>
            <span class="params-summary__value">{{ rows.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 逐条记录：与图表共用同一份 rows，不另查一次 -->
    <div class="params-panel">
      <div class="params-panel__head">
        <h2 class="params-panel__title">汇率记录</h2>
        <span class="params-panel__meta">按业务日期升序</span>
      </div>

      <div v-if="loading" class="params-skeleton">
        <div v-for="i in 5" :key="i" class="params-skeleton__row">
          <span
            v-for="(col, j) in columns.slice(0, 6)"
            :key="j"
            class="params-skeleton__bar"
            :style="{ width: Math.min(col.width || 120, 220) + 'px' }"
          ></span>
        </div>
      </div>

      <RhTable v-else :table-data="tableData" border>
        <template #empty>
          <div class="params-empty">
            还没有汇率记录。按业务日期一天一条导入后，表格与趋势图会同时出现。
          </div>
        </template>
      </RhTable>

      <div class="params-source">数据来源：{{ meta.source }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import RhChart from "@/components/RhChart/index.vue";
import { useLayout } from "@/hooks/useLayout.js";
// 趋势数据（时序表）与当前值（全局参数）是两组不同接口，别混用
import { getExchangeRates } from "@/api/dict.js";
import {
  getLatestExchangeRate,
  refreshExchangeRate,
} from "@/api/exchange-rate.js";
import {
  DICT_COLUMNS,
  DICT_META,
  formatRows,
  formatRateTime,
} from "../columns.js";
import "../params.css";

const { isDark } = useLayout();

const meta = DICT_META["exchange-rate"];
const columns = DICT_COLUMNS["exchange-rate"];

const rows = ref([]);
const loading = ref(false);
const error = ref("");
const lastLoadedAt = ref("");

// 「当前生效汇率」单独存：它来自全局参数，趋势表 rows 只负责最高/最低/曲线
const currentRate = ref(null);
const currentRateDate = ref("");
const currentRateStale = ref(false);
// 全局参数「最新汇率」的修改时间；与全局参数页那一列、利润测算页提示同源
const currentRateUpdated = ref("");
const syncing = ref(false);

const latest = computed(() =>
  rows.value.length ? rows.value[rows.value.length - 1] : null
);
const rateValues = computed(() =>
  rows.value.map(r => Number(r.rate)).filter(n => !Number.isNaN(n))
);
const maxRate = computed(() =>
  rateValues.value.length ? Math.max(...rateValues.value) : null
);
const minRate = computed(() =>
  rateValues.value.length ? Math.min(...rateValues.value) : null
);
const period = computed(() =>
  rows.value.length
    ? `${rows.value[0].rate_date} ~ ${latest.value.rate_date}`
    : "暂无记录"
);

const fixed = (v, digits) =>
  v === null || v === undefined || v === "" ? "--" : Number(v).toFixed(digits);

const tableData = computed(() => ({
  columns: columns.map(({ format, ...rest }) => rest),
  data: formatRows(rows.value, columns),
}));

/* 一条 2px 直线、不平滑、无点标记、无面积填充、无图例；
   3-5 条淡水平网格线、无 y 轴线；唯一 hue 落在数据线上 */
const chartOption = computed(() => {
  const axis = isDark.value ? "#949494" : "#6b6b6b";
  const grid = isDark.value ? "#2b2b2b" : "#e5e5e5";
  const surface = isDark.value ? "#1c1c1c" : "#ffffff";
  const ink = isDark.value ? "#ffffff" : "#111111";
  const hue = isDark.value ? "#8b91f5" : "#626aef";

  return {
    grid: { left: 68, right: 24, top: 20, bottom: 36 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: rows.value.map(r => r.rate_date),
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      axisLabel: { color: axis, fontSize: 12, rotate: 0, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      scale: true,
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: grid, width: 1, type: "solid" } },
      axisLabel: { color: axis, fontSize: 12 },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: surface,
      borderColor: grid,
      borderWidth: 1,
      textStyle: { color: ink, fontSize: 12 },
      formatter: params => {
        const p = params?.[0];
        return p ? `${p.axisValue}<br/>USD/CNY ${Number(p.value).toFixed(4)}` : "";
      },
    },
    series: [
      {
        name: "USD/CNY",
        type: "line",
        data: rows.value.map(r => Number(r.rate)),
        smooth: false,
        // 只有一条基线记录时线段画不出来，必须留一个点，否则图表是一片空白
        showSymbol: rows.value.length <= 1,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 2, color: hue },
        itemStyle: { color: hue },
        emphasis: { focus: "series" },
      },
    ],
  };
});

/**
 * 读当前生效汇率。单独一个函数、单独 try-catch：
 * 这个接口失败只影响右上角摘要卡，趋势图和记录表格照样能看，不该整页报错。
 * 读失败时也不清空已有值，宁可显示上一次的，也不要把卡片打成 "--"。
 */
const loadCurrentRate = async () => {
  try {
    const vo = await getLatestExchangeRate();
    currentRate.value = vo?.rate ?? null;
    currentRateDate.value = vo?.rate_date || "";
    currentRateStale.value = !!vo?.stale;
    currentRateUpdated.value = formatRateTime(vo?.updated_time) || "";
  } catch (e) {
    /* request 拦截器已统一弹错，这里静默降级即可 */
  }
};

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await getExchangeRates();
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
  await loadCurrentRate();
};

/**
 * 点「同步最新汇率」：让后端重新拉外部接口（主源→备源→失败保留旧值），
 * 成功后重新加载趋势与当前值。失败时只补一句提示，页面数据原样保留。
 */
const handleSync = async () => {
  syncing.value = true;
  try {
    await refreshExchangeRate();
    ElMessage.success("已同步最新汇率");
    await load();
  } catch (e) {
    ElMessage.warning("同步失败，已保留上一次的汇率");
  } finally {
    syncing.value = false;
  }
};

onMounted(load);
</script>
