<template>
  <div class="product-detail">
    <el-card shadow="never" class="block-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span class="card-title">产品详细信息</span>
          <span class="card-sub" v-if="detail.product_no"
            >编号 {{ detail.product_no }}</span
          >

          <div class="card-header__actions">
            <!-- 只读态：确认送达 / 撤销确认已下移到「配送状态」行，这里只留页面级操作 -->
            <template v-if="!editing">
              <el-button size="small" icon="Edit" @click="handleEdit"
                >编辑</el-button
              >
              <el-button size="small" icon="Back" @click="handleBack"
                >返回列表</el-button
              >
            </template>
            <!-- 编辑态 -->
            <template v-else>
              <el-button
                type="primary"
                size="small"
                :loading="saving"
                @click="handleSave"
              >
                保存
              </el-button>
              <el-button size="small" @click="handleCancel">取消</el-button>
            </template>
          </div>
        </div>
      </template>

      <template v-if="!loading && !detail.id">
        <el-empty description="未找到该产品，可能已被删除" />
      </template>

      <!-- 只读态：el-descriptions，信息密度高，适合核对 -->
      <template v-else-if="!editing">
        <div class="section-title">基础信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="产品编号">{{
            text(detail.product_no)
          }}</el-descriptions-item>
          <el-descriptions-item label="产品类目">
            {{ text(getCategoryName(detail.category_code)) }}
          </el-descriptions-item>
          <el-descriptions-item label="产品名称（中文）">{{
            text(detail.name_cn)
          }}</el-descriptions-item>
          <el-descriptions-item label="产品名称（英文）">{{
            text(detail.name_en)
          }}</el-descriptions-item>
          <el-descriptions-item label="产品状态">
            <span class="pl-status">
              <i
                class="pl-status__dot"
                :style="{
                  backgroundColor:
                    productStatusMap[detail.status]?.color || '#94a3b8',
                }"
              ></i>
              {{ productStatusMap[detail.status]?.name || "--" }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="竞品 ASIN">{{
            text(detail.competitor_asin)
          }}</el-descriptions-item>
          <el-descriptions-item label="产品主图" :span="2">
            <ProductThumb :src="detail.main_image" />
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title mt-6">采购与供应</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="供应商名称">{{
            text(detail.supplier)
          }}</el-descriptions-item>
          <el-descriptions-item label="起订量 MOQ">
            {{ detail.moq == null ? "--" : `${detail.moq} 件` }}
          </el-descriptions-item>
          <el-descriptions-item label="采购单价"
            >￥{{ text(detail.purchase_price) }}</el-descriptions-item
          >
          <el-descriptions-item label="包材 / 贴标"
            >￥{{ text(detail.package_cost) }}</el-descriptions-item
          >
          <el-descriptions-item label="平均国内运费">
            ￥{{ text(detail.avg_domestic_shipping) }}
          </el-descriptions-item>
          <el-descriptions-item label="采购合计（裸价+包材+运费）">
            <span class="strong">{{ money(purchaseTotal) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="1688 采购链接" :span="2">
            <template v-if="detail.source_url">
              <el-link :href="detail.source_url" target="_blank" type="primary">
                {{ detail.source_url }}
              </el-link>
            </template>
            <template v-else>--</template>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title mt-6">重量与尺寸</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="产品净重">
            {{
              detail.net_weight_g == null ? "--" : `${detail.net_weight_g} g`
            }}
          </el-descriptions-item>
          <el-descriptions-item label="含包装实重">
            {{
              detail.packaged_weight_g == null
                ? "--"
                : `${detail.packaged_weight_g} g`
            }}
          </el-descriptions-item>
          <el-descriptions-item label="包装长 × 宽 × 高">
            <template v-if="detail.length_cm">
              {{ detail.length_cm }} × {{ detail.width_cm }} ×
              {{ detail.height_cm }} cm
            </template>
            <template v-else>--</template>
          </el-descriptions-item>
          <el-descriptions-item label="包装体积">{{
            volumeText
          }}</el-descriptions-item>
          <el-descriptions-item label="尺寸分段">
            <el-tag v-if="sizeTier" :type="sizeTier.tag" effect="light">{{
              sizeTier.name
            }}</el-tag>
            <span v-else>--</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title mt-6">头程物流</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="头程方式">
            {{ text(firstLegMethodMap[detail.first_leg_method_code]?.name) }}
          </el-descriptions-item>
          <el-descriptions-item label="材积比">
            {{
              firstLegMethodMap[detail.first_leg_method_code]?.volumeDivisor ||
              "--"
            }}
          </el-descriptions-item>
          <el-descriptions-item label="配送方式">
            {{ getShippingMethodName(detail.shipping_method) }}
          </el-descriptions-item>
          <el-descriptions-item label="物流商">{{
            text(detail.logistics_provider)
          }}</el-descriptions-item>
          <!-- 亚马逊 SEND 整票核算费用，没有运费单价；两者按配送方式二选一显示 -->
          <el-descriptions-item label="头程运费单价" v-if="!amazonSend">
            {{
              detail.first_leg_unit_price == null
                ? "--"
                : `￥${detail.first_leg_unit_price} /kg`
            }}
          </el-descriptions-item>
          <el-descriptions-item label="配送总费用($)" v-else>
            {{
              detail.shipping_total_fee_usd == null
                ? "--"
                : `$${detail.shipping_total_fee_usd}（整票）`
            }}
          </el-descriptions-item>
          <el-descriptions-item label="商品总数">
            {{ detail.total_units == null ? "--" : `${detail.total_units} 件` }}
          </el-descriptions-item>
          <el-descriptions-item label="预计送达时间">
            {{ text(detail.expected_delivery_date) }}
            <span v-if="delivered" class="lock-tip">已锁定</span>
          </el-descriptions-item>
          <el-descriptions-item label="配送状态">
            <!--
              确认送达 / 撤销确认就摆在状态旁边：状态和「让它变状态的动作」在同一处，
              不用回页头找按钮，也不会和「编辑」「返回列表」混在一起误点。
              没填预计送达时间时不给确认按钮 —— 没有基准就没法判提前还是晚送达
            -->
            <div class="delivery-cell">
              <el-tag :type="deliveryStatus.tag" effect="light">{{
                deliveryStatus.name
              }}</el-tag>
              <span v-if="deliveryDaysText" class="delivery-days">{{
                deliveryDaysText
              }}</span>
              <el-button
                v-if="!delivered && detail.expected_delivery_date"
                size="small"
                type="success"
                icon="CircleCheck"
                :loading="deliveryLoading"
                @click="handleConfirmDelivery"
              >
                确认送达
              </el-button>
              <el-button
                v-else-if="delivered"
                size="small"
                icon="RefreshLeft"
                :loading="deliveryLoading"
                @click="handleCancelDelivery"
              >
                撤销确认
              </el-button>
              <span v-else class="delivery-hint">填写预计送达时间后可确认</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="实际送达时间" v-if="delivered">
            {{ text(detail.actual_delivery_time) }}
          </el-descriptions-item>
          <el-descriptions-item label="关税率"
            >{{ tariffRateText }}（全局参数）</el-descriptions-item
          >
          <el-descriptions-item label="关税费">
            {{
              detail.tariff_fee == null ? "--" : `￥${detail.tariff_fee} /件`
            }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title mt-6">销售信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="定价售价">
            {{
              detail.list_price_usd == null ? "--" : `$${detail.list_price_usd}`
            }}
          </el-descriptions-item>
          <el-descriptions-item label="竞品售价">
            {{
              detail.competitor_price_usd == null
                ? "--"
                : `$${detail.competitor_price_usd}`
            }}
          </el-descriptions-item>
          <el-descriptions-item label="预估月销量">
            {{
              detail.monthly_sales_est == null
                ? "--"
                : `${detail.monthly_sales_est} 件`
            }}
          </el-descriptions-item>
          <el-descriptions-item label="首批备货量">
            {{
              detail.first_batch_qty == null
                ? "--"
                : `${detail.first_batch_qty} 件`
            }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title mt-6">备注 / 风险</div>
        <div class="remark-box">{{ detail.remark || "--" }}</div>

        <div class="time-row">
          <span>创建时间：{{ text(detail.created_time) }}</span>
          <span>更新时间：{{ text(detail.updated_time) }}</span>
        </div>
      </template>

      <!-- 编辑态：复用与「录入产品」同一套字段 -->
      <template v-else>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
          <ProductFormFields v-model="form" />
        </el-form>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useCommon } from "@/hooks/useCommon.js";
import {
  getProductDetail,
  updateProduct,
  confirmDelivery,
  cancelDelivery,
} from "@/api/product.js";
import {
  productStatusMap,
  firstLegMethodMap,
  getShippingMethodName,
  isAmazonSend,
  sizeTierMap,
  resolveSizeTierByMetric,
  tariffRateText,
  getCategoryName,
  loadCategoryOptions,
  isDelivered,
  getDeliveryStatus,
  getDeliveryDaysText,
  previewDeliveryResult,
} from "../options.js";
import { PRODUCT_FORM_RULES } from "../rules.js";
import ProductFormFields from "../components/product-form-fields.vue";
import ProductThumb from "../components/product-thumb.vue";

const { router, toPage, getRouteParams } = useCommon();

const loading = ref(false);
const saving = ref(false);
const editing = ref(false);
const deliveryLoading = ref(false);

const detail = reactive({}); // 只读态展示用
const form = ref({}); // 编辑态表单副本

const formRef = ref();

// 校验规则与新增页共用同一份，加字段只改 rules.js 一处
const rules = PRODUCT_FORM_RULES;

onMounted(() => {
  // 类目字典：接口回来前 getCategoryName 会回落显示 code，不会闪空白
  loadCategoryOptions();
  // 优先取路由传参，刷新后从 store 里读（store 持久化，参数不会丢）
  const params = getRouteParams("ProductDetail") || {};
  const id = params.id || router.currentRoute.value.query.id;
  if (!id) {
    ElMessage.warning("缺少产品 ID，已返回列表");
    handleBack();
    return;
  }
  fn_getDetail(id, !!params.edit);
});

const fn_getDetail = (id, autoEdit = false) => {
  loading.value = true;
  getProductDetail(id)
    .then((res) => {
      resetDetail(res || {});
      // 从列表「修改」进来时直接进入编辑态
      if (autoEdit) handleEdit();
    })
    .finally(() => {
      loading.value = false;
    });
};

// 进入编辑态：拿一份副本去改，取消时原始数据不受影响
const handleEdit = () => {
  form.value = { ...detail };
  editing.value = true;
};

// 取消编辑：丢弃副本，回到只读态
const handleCancel = () => {
  editing.value = false;
  formRef.value?.clearValidate();
};

// 保存：整份表单全量提交（不做字段级 diff）
const handleSave = () => {
  if (!formRef.value) return;
  formRef.value.validate((valid) => {
    if (!valid) return;
    saving.value = true;
    updateProduct(detail.id, { ...form.value })
      .then((res) => {
        ElMessage.success("保存成功");
        resetDetail(
          res || {
            ...form.value,
            id: detail.id,
            created_time: detail.created_time,
          }
        );
        editing.value = false;
      })
      .finally(() => {
        saving.value = false;
      });
  });
};

const handleBack = () => {
  toPage("ProductList");
};

/* ------------------------------------------------------------------ */
/* 配送状态：确认送达 / 撤销确认                                        */
/* ------------------------------------------------------------------ */
// 已确认送达 = 实际送达时间有值（与后端 DeliveryStatus 同口径）
const delivered = computed(() => isDelivered(detail));
const deliveryStatus = computed(() => getDeliveryStatus(detail));
const deliveryDaysText = computed(() => getDeliveryDaysText(detail));

/**
 * 确认送达：先把判定结果摆给用户看再让他点确认 ——
 * 这一步不可逆（要改就得撤销），所以弹窗里必须显示「会判成什么样」
 */
const handleConfirmDelivery = () => {
  const preview = previewDeliveryResult(detail.expected_delivery_date);
  if (!preview) {
    ElMessage.warning("请先填写预计送达时间");
    return;
  }

  ElMessageBox.confirm(
    `预计送达 ${detail.expected_delivery_date}，按今天（北京时间）判定为「${preview.statusName}」，${preview.text}。确认后预计送达时间将锁定，如需修改请先撤销确认。`,
    "确认送达",
    {
      type: "warning",
      confirmButtonText: "确认送达",
      cancelButtonText: "再等等",
    }
  )
    .then(() => {
      deliveryLoading.value = true;
      return confirmDelivery(detail.id);
    })
    .then((res) => {
      resetDetail(res || { ...detail });
      ElMessage.success(
        `已确认送达：${getDeliveryStatus(detail).name}${
          getDeliveryDaysText(detail) ? `，${getDeliveryDaysText(detail)}` : ""
        }`
      );
    })
    .catch(() => {})
    .finally(() => {
      deliveryLoading.value = false;
    });
};

// 撤销确认：清空实际送达时间，退回配送中，预计送达时间恢复可改
const handleCancelDelivery = () => {
  ElMessageBox.confirm(
    "撤销后该产品将回到「配送中」，预计送达时间恢复可改，可重新确认送达。",
    "撤销确认送达",
    {
      type: "warning",
      confirmButtonText: "撤销确认",
      cancelButtonText: "取消",
    }
  )
    .then(() => {
      deliveryLoading.value = true;
      return cancelDelivery(detail.id);
    })
    .then((res) => {
      resetDetail(
        res || { ...detail, actual_delivery_time: null, delay_days: null }
      );
      ElMessage.success("已撤销确认，回到配送中");
    })
    .catch(() => {})
    .finally(() => {
      deliveryLoading.value = false;
    });
};

/* 用返回数据覆盖 detail（保留同一个 reactive 引用） */
function resetDetail(data) {
  Object.keys(detail).forEach((key) => delete detail[key]);
  Object.assign(detail, data);
}

// 采购合计 = 采购单价 + 包材/贴标 + 平均国内运费
const purchaseTotal = computed(() =>
  ["purchase_price", "package_cost", "avg_domestic_shipping"].reduce(
    (acc, key) => {
      const val = Number(detail[key]);
      return acc + (Number.isFinite(val) ? val : 0);
    },
    0
  )
);

// 包装体积（cm³）
const volumeText = computed(() => {
  const { length_cm, width_cm, height_cm } = detail;
  if (!length_cm || !width_cm || !height_cm) return "--";
  return `${(Number(length_cm) * Number(width_cm) * Number(height_cm)).toFixed(
    0
  )} cm³`;
});

const text = (val) =>
  val === null || val === undefined || val === "" ? "--" : val;
const money = (val) => `￥${Number(val || 0).toFixed(2)}`;

// 配送方式是否亚马逊 SEND：决定「头程运费单价」与「配送总费用($)」哪个展示。
// 空值按自选承运人处理（历史数据兼容），与表单口径一致
const amazonSend = computed(() => isAmazonSend(detail.shipping_method));

/* 尺寸分段：以库里的 size_tier_code 为准；没有就按当前尺寸现算一次兜底，
   避免历史数据（字段加上之前录的）在详情页显示空白 */
const sizeTier = computed(() => {
  const key = detail.size_tier_code || resolveSizeTierByMetric(detail);
  return key ? sizeTierMap[key] : null;
});
</script>

<style lang="scss" scoped>
.product-detail {
  .block-card {
    --el-card-border-color: var(--el-border-color-darker);
    border-color: var(--el-border-color-darker);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* 右侧按钮组推到最右 */
  .card-header__actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .card-sub {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 16px;
    padding-left: 8px;
    border-left: 3px solid var(--el-color-primary);
  }

  .strong {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .remark-box {
    padding: 12px 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    background-color: var(--el-fill-color-lighter);
    font-size: 14px;
    line-height: 1.7;
    color: var(--el-text-color-regular);
    white-space: pre-wrap;
  }

  .mt-6 {
    margin-top: 24px;
  }

  .time-row {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    margin-top: 20px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  /* 状态圆点 */
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

  /* 已确认送达后，预计送达时间旁的「已锁定」小标记 */
  .lock-tip {
    margin-left: 8px;
    padding: 1px 6px;
    border-radius: 4px;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  /* 配送状态格：标签 + 天数差 + 确认/撤销按钮，一行排开，窄屏自动换行 */
  .delivery-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .delivery-days {
    font-size: 13px;
    color: var(--el-text-color-regular);
    font-variant-numeric: tabular-nums;
  }

  .delivery-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
