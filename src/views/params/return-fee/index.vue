<template>
  <div class="params-page return-fee-page">
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

    <!-- 加载态：灰条占位，保持行高，布局不移位 -->
    <div v-if="loading" class="params-panel">
      <div class="params-skeleton">
        <div v-for="i in 6" :key="i" class="params-skeleton__row">
          <span class="params-skeleton__bar" style="width: 190px"></span>
          <span class="params-skeleton__bar" style="width: 160px"></span>
          <span class="params-skeleton__bar" style="width: 100px"></span>
          <span class="params-skeleton__bar" style="width: 240px"></span>
        </div>
      </div>
    </div>

    <!-- 失败态：留在失败的块内，说明上次成功读取的时间，给重试 -->
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

    <div v-else-if="!rows.length" class="params-panel">
      <div class="params-empty">
        这张字典表还没有数据，导入之后会在这里按分组逐条列出。
      </div>
    </div>

    <template v-else>
      <div
        v-for="section in sections"
        :key="section.group"
        class="params-panel"
      >
        <div class="params-panel__head">
          <h2 class="params-panel__title">{{ section.title }}</h2>
          <span class="params-panel__meta">{{ section.meta }}</span>
        </div>

        <el-table :data="section.rows" border style="width: 100%">
          <el-table-column
            label="发货重量（原表）"
            prop="weight_label"
            min-width="200"
            align="center"
          />
          <!-- 原表 A 列与自动匹配的区间并不完全一致（50-70 / 70-150 两行按分组名修正），
               所以单独列一列真实匹配区间，方便人工复核自动带出的值 -->
          <el-table-column
            label="匹配区间"
            prop="match_range"
            min-width="180"
            align="center"
          />
          <el-table-column label="计费形态" min-width="120" align="center">
            <template #default="{ row }">
              <el-tag
                :type="row.fee_type === 'FLAT' ? 'success' : 'warning'"
                size="small"
              >
                {{ row.fee_type_label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="尾程退货费 ($/件)"
            prop="fee_display"
            min-width="260"
            align="center"
          />
          <el-table-column
            label="起步价"
            prop="base_display"
            min-width="100"
            align="center"
          />
          <el-table-column
            label="续重加价"
            prop="step_display"
            min-width="230"
            align="center"
          />
          <el-table-column label="备注" prop="remark" min-width="240" />
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

// 与通用页不同：本页是尾程退货费专属页，type 固定为 return-fee
const meta = DICT_META["return-fee"];

/* 7 个分组由业务口径给定（原表没有分组标题行）。
   顺序即原表 R4~R29 的行顺序，也等于后端自动带出的候选优先级。 */
const SECTIONS = [
  {
    group: "SMALL_STANDARD",
    title: "小号标准尺寸",
    meta: "2 盎司一档，共 8 档固定退货处理费",
  },
  {
    group: "LARGE_STANDARD",
    title: "大号标准尺寸",
    meta: "12 档固定值；3~20 磅改为起步价 + 每 4 盎司续重",
  },
  {
    group: "LARGE_BULKY",
    title: "大号大件",
    meta: "0~50 磅；起步价 $6.74 + 超出首磅每磅 $0.32",
  },
  {
    group: "OVERSIZE_0_50",
    title: "超大尺寸：0-50磅",
    meta: "0~50 磅；起步价 $26.33 + 超出首磅每磅 $0.38",
  },
  {
    group: "OVERSIZE_50_70",
    title: "超大件：50-70磅(不含50磅)",
    meta: "起步价 $40.12 + 超出 51 磅每磅 $0.75",
  },
  {
    group: "OVERSIZE_70_150",
    title: "超大件：70-150磅(不含70磅)",
    meta: "起步价 $52.45 + 超出 71 磅每磅 $0.75",
  },
  {
    group: "OVERSIZE_150_PLUS",
    title: "超大件：150磅以上(不含150磅)",
    meta: "起步价 $157.35 + 超出 151 磅每磅 $0.19",
  },
];

const rows = ref([]);
const loading = ref(false);
const error = ref("");
const lastLoadedAt = ref("");

const money = v =>
  v === null || v === undefined || v === "" ? "--" : `$${Number(v).toFixed(2)}`;

/** 小于 1 磅用盎司、达到 1 磅用磅，读起来更接近原表习惯 */
const ozText = oz => {
  const v = Number(oz);
  return v < 16 ? `${v.toFixed(0)} oz` : `${(v / 16).toFixed(2)} lb`;
};

/**
 * 后端返回的是行式化原始行（全局 SNAKE_CASE）。
 * 固定档直接显示金额；公式档显示原表文字，并把结构化参数拆给人看，
 * 这样「自动带出」算出来的数能被人工复核，而不是一个黑盒结果。
 */
const decorate = r => {
  const isFormula = r.fee_type === "FORMULA";
  const stepUnitText = r.step_unit === "OZ4" ? "每 4 盎司" : "每磅";
  const minOz = Number(r.weight_min_oz || 0);
  const maxText =
    r.weight_max_oz === null || r.weight_max_oz === undefined
      ? "不限"
      : `≤ ${ozText(r.weight_max_oz)}`;
  return {
    ...r,
    sort_no: Number(r.sort_no) || 0,
    match_range: `> ${ozText(minOz)} ~ ${maxText}`,
    fee_type_label: isFormula ? "起步价+续重" : "固定值",
    fee_display: isFormula ? r.formula_text || "--" : money(r.fee_usd),
    base_display: isFormula ? money(r.base_fee_usd) : "--",
    step_display: isFormula
      ? `$${Number(r.step_fee_usd).toFixed(2)} / ${stepUnitText}（超出 ${(
          Number(r.step_from_oz) / 16
        ).toFixed(2)} lb）`
      : "--",
  };
};

// 按 sort_no 排，保证展示顺序与后端「按表中顺序取第一条」的匹配顺序一致
const sections = computed(() =>
  SECTIONS.map(s => ({
    ...s,
    rows: rows.value
      .filter(r => r.group_code === s.group)
      .map(decorate)
      .sort((a, b) => a.sort_no - b.sort_no),
  }))
);

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await getDictTable("return-fee");
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

// 与其它参数页一致：watch route.path，从相邻字典页切过来也能正确加载
watch(() => route.path, load, { immediate: true });
</script>
