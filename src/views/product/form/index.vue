<template>
  <div class="product-form">
    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">录入产品信息</span>
          <span class="card-sub"
            >字段与数据库 product 表一一对应，带 * 为必填</span
          >
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
        <ProductFormFields v-model="form" ref="fieldsRef" />
      </el-form>
    </el-card>

    <div class="footer-bar">
      <el-button type="primary" :loading="submitting" @click="handleSubmit"
        >提交</el-button
      >
      <el-button @click="handleReset">重置</el-button>
      <el-button @click="handleBack">返回列表</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { useCommon } from "@/hooks/useCommon.js";
import { createProduct } from "@/api/product.js";
import ProductFormFields from "../components/product-form-fields.vue";
import { PRODUCT_FORM_RULES } from "../rules.js";

const { toPage } = useCommon();

const formRef = ref();
const fieldsRef = ref();
const submitting = ref(false);

// 默认表单：与 product 表字段同名，新增时直接整体提交
const createDefaultForm = () => ({
  product_no: "",
  name_cn: "",
  name_en: "",
  main_image: "",
  category_code: "",
  competitor_asin: "",
  source_url: "",
  supplier: "",
  purchase_price: null,
  moq: null,
  package_cost: null,
  avg_domestic_shipping: null,
  net_weight_g: null,
  packaged_weight_g: null,
  length_cm: null,
  width_cm: null,
  height_cm: null,
  size_tier_code: null, // 由长/宽/高 + 含包装实重自动匹配，不手工填
  first_leg_method_code: "",
  // 配送方式：默认自选承运人（历史上只有这一种模式）；选亚马逊SEND时改填配送总费用
  shipping_method: "SELF_CARRIER",
  logistics_provider: "",
  first_leg_unit_price: null,
  shipping_total_fee_usd: null, // 仅亚马逊SEND模式使用
  total_units: null,
  // 预计送达时间：填了就是「配送中」；实际送达时间与状态由「确认送达」写入，前端不传
  expected_delivery_date: null,
  tariff_fee: null,
  list_price_usd: null,
  competitor_price_usd: null,
  monthly_sales_est: null,
  first_batch_qty: null,
  status: "DRAFT",
  remark: "",
});

const form = ref(createDefaultForm());

// 校验规则与详情页编辑态共用同一份，加字段只改 rules.js 一处
const rules = PRODUCT_FORM_RULES;

// 提交
const handleSubmit = () => {
  // 子组件还在上传时拦一下：此刻 main_image 仍是旧值或空串，
  // 放行会让用户以为图传了、实际存进库的却没有。

  if (fieldsRef.value?.isImageUploading?.()) {
    ElMessage.warning("主图还在上传中，请稍候");
    return;
  }
  if (!formRef.value) return;
  formRef.value.validate((valid) => {
    if (!valid) return;
    submitting.value = true;
    createProduct({ ...form.value })
      .then(() => {
        ElMessage.success("产品录入成功");
        handleReset();
        toPage("ProductList");
      })
      .finally(() => {
        submitting.value = false;
      });
  });
};

// 重置
const handleReset = () => {
  form.value = createDefaultForm();
  fieldsRef.value?.resetLocal();
  formRef.value?.clearValidate();
};

// 返回列表
const handleBack = () => {
  toPage("ProductList");
};
</script>

<style lang="scss" scoped>
.product-form {
  .block-card {
    /* 默认卡片边框太浅，加深后与内部表单形成层次 */
    --el-card-border-color: var(--el-border-color-darker);
    border-color: var(--el-border-color-darker);
  }

  .card-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
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

  .footer-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
  }
}
</style>
