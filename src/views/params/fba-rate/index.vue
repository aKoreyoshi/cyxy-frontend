<template>
  <div class="params-page fba-rate-page">
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

    <!-- 加载：扁平灰条，保持行高，布局不移位 -->
    <div v-if="loading" class="params-panel">
      <div class="params-skeleton">
        <div v-for="i in 6" :key="i" class="params-skeleton__row">
          <span class="params-skeleton__bar" style="width: 160px"></span>
          <span class="params-skeleton__bar" style="width: 110px"></span>
          <span class="params-skeleton__bar" style="width: 110px"></span>
          <span class="params-skeleton__bar" style="width: 110px"></span>
          <span class="params-skeleton__bar" style="width: 180px"></span>
        </div>
      </div>
    </div>

    <!-- 错误：留在失败的块内，说明最后一次正常读取的时间，给重试 -->
    <div v-else-if="error" class="params-panel">
      <div class="params-state">
        <i class="params-state__dot"></i>
        <span class="params-state__text">
          读取「{{ meta.title }}」失败：{{ error }}。{{
            lastLoadedAt ? `上次成功读取于 ${lastLoadedAt}。` : "尚未成功读取过。"
          }}
        </span>
        <el-button link type="primary" size="small" @click="load">重试</el-button>
      </div>
    </div>

    <!-- 空态：保留框架 -->
    <div v-else-if="!rows.length" class="params-panel">
      <div class="params-empty">
        这张字典表还没有数据，导入之后会在这里按口径逐条列出。
      </div>
    </div>

    <template v-else>
      <div
        v-for="section in sections"
        :key="section.tier"
        class="params-panel"
      >
        <div class="params-panel__head">
          <h2 class="params-panel__title">{{ section.title }}</h2>
          <span class="params-panel__meta">{{ section.meta }}</span>
        </div>

        <el-table :data="section.rows" border style="width: 100%">
          <el-table-column
            label="发货重量"
            prop="weight_range"
            min-width="190"
            align="center"
          />

          <!-- 多级表头：三个价格带收在「配送费」一组里 -->
          <el-table-column label="配送费（$/件，不含燃油附加）" align="center">
            <el-table-column
              label="< $10 售价区间"
              prop="low"
              min-width="140"
              align="center"
            />
            <el-table-column
              label="$10 ~ $50 售价区间"
              prop="mid"
              min-width="150"
              align="center"
            />
            <el-table-column
              label="> $50 售价区间"
              prop="high"
              min-width="140"
              align="center"
            />
          </el-table-column>

          <el-table-column
            label="对应克重"
            prop="gram_range"
            min-width="180"
            align="center"
          />
          <template #empty>
            <div class="params-empty">
              「{{ section.title }}」还没有费率数据。
            </div>
          </template>
        </el-table>
      </div>

      <div class="params-panel">
        <div class="params-source">数据来源：{{ meta.source }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getDictTable } from "@/api/dict.js";
import { DICT_META } from "../columns.js";
import "../params.css";

const route = useRoute();

// 与通用页不同：本页是尺寸收费标准专属页，type 固定，path 末段只是校验
const meta = DICT_META["fba-rate"];

const OZ_TO_G = 28.349523125;
const LB_IN_OZ = 16; // 1 磅 = 16 盎司，超过 1 磅改用磅
const bandOf = { LOW: "low", MID: "mid", HIGH: "high" };

const SECTIONS = [
  {
    tier: "small",
    title: "小号标准尺寸",
    meta: "配送费（$/件，不含 3.5% 燃油物流附加费）",
  },
  {
    tier: "large",
    title: "大号标准尺寸",
    meta: "配送费（$/件，不含燃油附加费；计费重 = MAX(实重, 体积重)）",
  },
];

const rows = ref([]);
const loading = ref(false);
const error = ref("");
const lastLoadedAt = ref("");

/** 去掉多余的 .00 / .0，1.25 会保留两位 */
const fmt = n => Number(n.toFixed(2)).toString();

/**
 * 发货重量列：由「重量档上限」单值改成区间。
 * ≤ 1 lb（16 oz）用盎司，> 1 lb 用磅；首档写成「≤ X」。
 * 参考官方费率表口径，例如 2~4 oz、1~1.25 lb、2.75~3 lb。
 */
const rangeText = (minOz, maxOz) => {
  if (maxOz <= LB_IN_OZ) {
    return minOz <= 0
      ? `≤ ${fmt(maxOz)} oz`
      : `${fmt(minOz)} ~ ${fmt(maxOz)} oz`;
  }
  return `${fmt(minOz / LB_IN_OZ)} ~ ${fmt(maxOz / LB_IN_OZ)} lb`;
};

/** 公制换算也跟着写成区间，与发货重量列一一对应 */
const gramRangeText = (minOz, maxOz) => {
  const g = oz => (oz * OZ_TO_G).toFixed(1);
  return minOz <= 0 ? `≤ ${g(maxOz)} g` : `${g(minOz)} ~ ${g(maxOz)} g`;
};

/** 行式化 → 透视：每个重量档一行，三个价格带的费率横排成列 */
const pivot = list => {
  const byBracket = new Map();
  list.forEach(r => {
    const maxOz = Number(r.weight_max_oz);
    const minOz = Number(r.weight_min_oz || 0);
    if (!byBracket.has(maxOz)) {
      byBracket.set(maxOz, {
        weight_max_oz: maxOz,
        weight_range: rangeText(minOz, maxOz),
        gram_range: gramRangeText(minOz, maxOz),
        low: null,
        mid: null,
        high: null,
      });
    }
    const row = byBracket.get(maxOz);
    const band = bandOf[String(r.price_band || "").toUpperCase()];
    if (band) row[band] = `$${Number(r.rate_usd).toFixed(2)}`;
  });
  return [...byBracket.values()].sort(
    (a, b) => a.weight_max_oz - b.weight_max_oz
  );
};

const sections = computed(() =>
  SECTIONS.map(s => ({
    ...s,
    rows: pivot(rows.value.filter(r => r.tier_code === s.tier)),
  }))
);

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await getDictTable("fba-rate");
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

// 与其他参数页一致：watch route.path，从相邻字典页切过来也能正确加载
watch(() => route.path, load, { immediate: true });
</script>
