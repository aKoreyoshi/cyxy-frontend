<template>
  <!--
    产品表单字段区（纯字段，不含 el-form 外壳）
    新增页 views/product/form 与 详情页 views/product/detail 的编辑态共用这一份，
    保证「新增能看到什么字段，编辑就能改什么字段」，不会出现两边漂移。
    用法：父组件外面包 <el-form ref="formRef" :model="form" :rules="rules">
  -->
  <div class="product-form-fields">
    <!-- 基础信息 -->
    <div class="section-title">基础信息</div>
    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-form-item label="产品编号" prop="product_no">
          <el-input
            v-model="form.product_no"
            placeholder="如：P-2026-0001"
            clearable
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="产品类目" prop="category_code">
          <el-select
            v-model="form.category_code"
            :placeholder="
              categoryState.loading ? '类目加载中…' : '请选择产品类目'
            "
            :disabled="categoryState.loading"
            filterable
            clearable
            class="full"
          >
            <el-option
              v-for="item in categoryState.options"
              :key="item.code"
              :label="item.name"
              :value="item.code"
            />
          </el-select>
          <div class="form-tip" v-if="categoryState.error">
            类目加载失败，请刷新页面重试
          </div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="产品名称（中文）" prop="name_cn">
          <el-input
            v-model="form.name_cn"
            placeholder="请输入中文名称"
            clearable
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="产品名称（英文）">
          <el-input
            v-model="form.name_en"
            placeholder="请输入英文名称"
            clearable
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="产品状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio-button
              v-for="item in PRODUCT_STATUS_OPTIONS"
              :key="item.code"
              :value="item.code"
            >
              {{ item.name }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="产品主图" prop="main_image" ref="imageItemRef">
          <!-- 主图走后端 /api/upload 传到 COS，回填的是公网 URL；
       main_image 仍是地址字符串，列表/详情的 ProductThumb 不用改。 -->
          <div class="image-upload">
            <el-upload
              ref="uploadRef"
              action="#"
              :auto-upload="false"
              :disabled="imageUploading"
              :show-file-list="false"
              :accept="IMAGE_ACCEPT"
              :on-change="handleImageChange"
              class="image-upload__uploader"
            >
              <div v-if="imageUrl" class="image-upload__preview">
                <img :src="imageUrl" alt="产品主图预览" />
                <span class="image-upload__mask">{{
                  imageUploading ? "上传中…" : "点击替换"
                }}</span>
              </div>
              <div v-else class="image-upload__placeholder">
                <el-icon :size="22"><Plus /></el-icon>
                <span>{{
                  imageUploading ? "上传中…" : "点击上传产品主图"
                }}</span>
              </div>
            </el-upload>
            <div class="image-upload__bar">
              <el-button
                v-if="imageUrl"
                link
                type="danger"
                size="small"
                @click="handleImageRemove"
              >
                移除
              </el-button>
              <span class="form-tip"
                >支持 jpg / png / webp / gif，建议 ≤ 10MB</span
              >
            </div>
          </div>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider />

    <!-- 采购与供应 -->
    <div class="section-title">采购与供应</div>
    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-form-item label="供应商名称">
          <el-input
            v-model="form.supplier"
            placeholder="如：义乌市拓远家居用品有限公司"
            clearable
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="1688 采购链接" prop="source_url">
          <el-input
            v-model="form.source_url"
            placeholder="请粘贴商品详情页链接"
            clearable
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="采购单价" prop="purchase_price">
          <el-input v-model.number="form.purchase_price" type="number" min="0">
            <template #append>￥/件</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="起订量 MOQ">
          <el-input v-model.number="form.moq" type="number" min="0">
            <template #append>件</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="包材 / 贴标">
          <el-input v-model.number="form.package_cost" type="number" min="0">
            <template #append>￥/件</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="平均国内运费" prop="avg_domestic_shipping">
          <el-input
            v-model.number="form.avg_domestic_shipping"
            type="number"
            min="0"
          >
            <template #append>￥/件</template>
          </el-input>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider />

    <!-- 重量与尺寸 -->
    <div class="section-title">重量与尺寸</div>
    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-form-item label="产品净重" prop="net_weight_g">
          <el-input v-model.number="form.net_weight_g" type="number" min="0">
            <template #append>g</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="含包装实重" prop="packaged_weight_g">
          <el-input
            v-model.number="form.packaged_weight_g"
            type="number"
            min="0"
          >
            <template #append>g</template>
          </el-input>
          <div class="form-tip">利润计算取这一列，不是净重</div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-form-item label="包装长" prop="length_cm">
          <el-input v-model.number="form.length_cm" type="number" min="0">
            <template #append>cm</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-form-item label="包装宽" prop="width_cm">
          <el-input v-model.number="form.width_cm" type="number" min="0">
            <template #append>cm</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-form-item label="包装高" prop="height_cm">
          <el-input v-model.number="form.height_cm" type="number" min="0">
            <template #append>cm</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="24">
        <el-form-item label="尺寸分段">
          <div class="size-tier">
            <el-tag
              v-if="sizeTier"
              :type="sizeTier.tag"
              effect="light"
              size="default"
            >
              {{ sizeTier.name }}
            </el-tag>
            <span v-else class="size-tier__empty"
              >填入长/宽/高与含包装实重后自动匹配</span
            >
            <span v-if="sizeTier" class="form-tip">{{ sizeTier.rule }}</span>
          </div>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider />

    <!-- 头程物流 -->
    <div class="section-title">头程物流</div>
    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-form-item label="头程方式">
          <el-select
            v-model="form.first_leg_method_code"
            placeholder="请选择头程方式"
            clearable
            class="full"
            @change="handleMethodChange"
          >
            <el-option
              v-for="item in FIRST_LEG_METHOD_OPTIONS"
              :key="item.code"
              :label="item.name"
              :value="item.code"
            />
          </el-select>
          <div class="form-tip" v-if="currentMethod?.remark">
            {{ currentMethod.remark }}
          </div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="材积比（抛货）">
          <el-select
            v-model="volumeDivisor"
            class="full"
            :disabled="!!currentMethod?.volumeDivisor"
          >
            <el-option
              v-for="d in volumeDivisorOptions"
              :key="d"
              :label="d"
              :value="d"
            />
          </el-select>
          <div class="form-tip">由头程方式自动带出，选「自填」后可手工调整</div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="配送方式">
          <el-select
            v-model="form.shipping_method"
            placeholder="请选择配送方式"
            class="full"
          >
            <el-option
              v-for="item in SHIPPING_METHOD_OPTIONS"
              :key="item.code"
              :label="item.name"
              :value="item.code"
            />
          </el-select>
          <div class="form-tip" v-if="currentShippingMethod?.remark">
            {{ currentShippingMethod.remark }}
          </div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="物流商">
          <el-input
            v-model="form.logistics_provider"
            placeholder="如：云途 / 燕文"
            clearable
          />
        </el-form-item>
      </el-col>
      <!-- 亚马逊 SEND 由后台整票核算费用，没有运费单价；两者按配送方式二选一显示 -->
      <el-col :xs="24" :md="12" v-if="!amazonSend">
        <el-form-item label="头程运费单价">
          <el-input
            v-model.number="form.first_leg_unit_price"
            type="number"
            min="0"
          >
            <template #append>￥/kg</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12" v-else>
        <el-form-item label="配送总费用($)">
          <el-input
            v-model.number="form.shipping_total_fee_usd"
            type="number"
            min="0"
          >
            <template #append>$</template>
          </el-input>
          <div class="form-tip">亚马逊后台核算的整票货件配送费</div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="商品总数">
          <el-input v-model.number="form.total_units" type="number" min="0">
            <template #append>件</template>
          </el-input>
          <div class="form-tip">本票货件的总件数</div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="预计送达时间">
          <el-date-picker
            v-model="form.expected_delivery_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择预计送达日期"
            :clearable="!deliveryLocked"
            :disabled="deliveryLocked"
            class="full"
          />
          <!-- 已确认送达：填不了，但要把「怎么解锁」讲清楚，别让人以为系统坏了 -->
          <div class="form-tip" v-if="deliveryLocked">
            已确认送达，预计送达时间已锁定；需要修改请先到详情页「撤销确认」
          </div>
          <div class="form-tip" v-else>
            填了就是「配送中」；货到后到详情页点「确认送达」判定提前 / 准时 /
            晚送达
          </div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12" v-if="deliveryLocked">
        <el-form-item label="配送状态">
          <div class="delivery-status">
            <el-tag :type="deliveryStatusInfo.tag" effect="light">
              {{ deliveryStatusInfo.name }}
            </el-tag>
            <span v-if="deliveryDaysText" class="delivery-status__days">
              {{ deliveryDaysText }}
            </span>
            <span class="form-tip">
              实际送达 {{ text(form.actual_delivery_time) }}
            </span>
          </div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="关税率">
          <!-- 只读：值来自全局参数 sys_config.DEFAULT_TARIFF_RATE，不允许在此修改 -->
          <div class="readonly-value">{{ tariffRateText }}</div>
          <div class="form-tip">
            全局参数自动读取，如需调整找管理员改 sys_config
          </div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="关税费">
          <el-input v-model.number="form.tariff_fee" type="number" min="0">
            <template #append>￥/件</template>
          </el-input>
          <div class="form-tip">
            手工填写金额；理论值 =（采购单价 + 包材）×
            关税率，后续可改为自动计算
          </div>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider />

    <!-- 销售信息 -->
    <div class="section-title">销售信息</div>
    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-form-item label="竞品 ASIN">
          <el-input
            v-model="form.competitor_asin"
            placeholder="如：B0C8XYZ123"
            clearable
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="竞品售价">
          <el-input
            v-model.number="form.competitor_price_usd"
            type="number"
            min="0"
          >
            <template #append>$</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="定价售价">
          <el-input v-model.number="form.list_price_usd" type="number" min="0">
            <template #append>$</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="预估月销量">
          <el-input
            v-model.number="form.monthly_sales_est"
            type="number"
            min="0"
          >
            <template #append>件</template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="首批备货量">
          <el-input v-model.number="form.first_batch_qty" type="number" min="0">
            <template #append>件</template>
          </el-input>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider />

    <!-- 备注 -->
    <div class="section-title">备注 / 风险</div>
    <el-form-item label-width="0">
      <el-input
        v-model="form.remark"
        type="textarea"
        :rows="3"
        maxlength="512"
        show-word-limit
        placeholder="选品结论、资质要求、风险提示等"
      />
    </el-form-item>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import {
  FIRST_LEG_METHOD_OPTIONS,
  SHIPPING_METHOD_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  firstLegMethodMap,
  isAmazonSend,
  resolveSizeTierByMetric,
  sizeTierMap,
  tariffRateText,
  categoryState,
  loadCategoryOptions,
  isDelivered,
  getDeliveryStatus,
  getDeliveryDaysText,
} from "../options.js";

import { uploadProductImage } from "@/api/product.js";

// 类目来自后端字典，进页面就拉（模块级缓存，多个页面只打一次接口）
onMounted(() => {
  loadCategoryOptions();
});

// 与父组件共享同一个表单对象引用
const form = defineModel({ type: Object, required: true });

/* ------------------------------------------------------------------ */
/* 产品主图：选图后先调后端 /api/upload 传到 COS，回填公网 URL          */
/* 表单里存的始终是一串地址（varchar(512)），不再是 dataURL            */
/* ------------------------------------------------------------------ */
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const IMAGE_TYPES = IMAGE_ACCEPT.split(",");
const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB

const uploadRef = ref();
const imageItemRef = ref();
const imageUploading = ref(false);

// 已有 URL / 编辑态回显 / 刚上传成功的 URL，都能直接当 src
const imageUrl = computed(() => form.value.main_image || "");

const handleImageChange = async (uploadFile) => {
  const raw = uploadFile?.raw;
  if (!raw) return;
  // 每次选完立刻清空内部列表，保证连选同一张图也会触发 on-change
  uploadRef.value?.clearFiles();

  if (!IMAGE_TYPES.includes(raw.type)) {
    ElMessage.error("仅支持 jpg / png / webp / gif 格式的图片");
    return;
  }

  if (raw.size > IMAGE_MAX_SIZE) {
    ElMessage.error("图片不能超过 10MB");
    return;
  }

  imageUploading.value = true;

  try {
    // 关键改动：不再 FileReader 转 dataURL，改成先传 COS、拿回短 URL 再回填。
    // dataURL 有几 MB，varchar(512) 根本存不下；URL 才一百多字符。
    const { url } = await uploadProductImage(raw);
    form.value.main_image = url;
    // el-upload 不会触发 el-form-item 的 change 校验，手动清掉残留红字
    imageItemRef.value?.clearValidate();
  } catch (e) {
    // 这里不弹提示：request.js 的响应拦截器已经弹过后端 msg 了，再弹会重复。
    // 刻意不动 form.main_image —— 换图失败时旧图要留着，别让用户白丢一张。
  } finally {
    imageUploading.value = false;
  }
};

const handleImageRemove = () => {
  // 只清前端字段，不删 COS 对象：按定案「换图/软删先不联动删图」，
  // 以后统一用生命周期规则清理孤儿文件。
  form.value.main_image = "";
  uploadRef.value?.clearFiles();
};

const volumeDivisorOptions = [5000, 6000];
const volumeDivisor = ref(6000);

const currentMethod = computed(
  () => firstLegMethodMap[form.value.first_leg_method_code] || null
);

// 配送方式：亚马逊 SEND 显示「配送总费用($)」，自选承运人显示「头程运费单价」。
// 空值按自选承运人处理，与详情页 / getShippingMethodName 口径一致
const amazonSend = computed(() => isAmazonSend(form.value.shipping_method));
const currentShippingMethod = computed(
  () =>
    SHIPPING_METHOD_OPTIONS.find(
      (item) => item.code === form.value.shipping_method
    ) || null
);

/* ------------------------------------------------------------------ */
/* 配送状态：确认送达后锁定预计送达时间                                  */
/* ------------------------------------------------------------------ */
// 已确认送达 = 实际送达时间有值（与后端口径一致）。此时预计送达时间不可改
const deliveryLocked = computed(() => isDelivered(form.value));
const deliveryStatusInfo = computed(() => getDeliveryStatus(form.value));
const deliveryDaysText = computed(() => getDeliveryDaysText(form.value));
const text = (val) =>
  val === null || val === undefined || val === "" ? "--" : val;

/* 尺寸分段：只用于展示，值由下方 watch 回写到 form.size_tier_code */
const sizeTier = computed(() => {
  const key = resolveSizeTierByMetric(form.value);
  return key ? sizeTierMap[key] : null;
});

/* 长/宽/高/含包装实重任一变化 → 重算并回写。
   immediate 保证编辑态打开时，也能按库里已有的尺寸立刻算出分段 */
watch(
  () => [
    form.value.length_cm,
    form.value.width_cm,
    form.value.height_cm,
    form.value.packaged_weight_g,
  ],
  () => {
    form.value.size_tier_code = resolveSizeTierByMetric(form.value) || null;
  },
  { immediate: true }
);

// 头程方式变化时，带出材积比与默认单价
const handleMethodChange = (code) => {
  const method = firstLegMethodMap[code];
  if (!method) return;
  if (method.volumeDivisor) volumeDivisor.value = method.volumeDivisor;
  // 「自填」的默认单价是 0，不覆盖用户已填内容
  if (method.defaultUnitPrice)
    form.value.first_leg_unit_price = method.defaultUnitPrice;
};

// 供父组件在「保存 / 重置」时同步材积比等本地状态
defineExpose({
  resetLocal() {
    volumeDivisor.value = 6000;
  },
  // 暴露成方法而不是直接暴露 ref，避免父组件访问 expose 时 ref 解包的歧义
  isImageUploading: () => imageUploading.value,
});
</script>

<style lang="scss" scoped>
.product-form-fields {
  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 18px;
    padding-left: 8px;
    border-left: 3px solid var(--el-color-primary);
  }

  .form-tip {
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }

  /* 配送状态：已确认时在表单里回显结果（只读） */
  .delivery-status {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .delivery-status__days {
    font-size: 13px;
    color: var(--el-text-color-regular);
    font-variant-numeric: tabular-nums;
  }

  /* 尺寸分段：只读回显，不提供人工选择 */
  .size-tier {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .size-tier__empty {
    font-size: 13px;
    color: var(--el-text-color-placeholder);
  }

  /* 只读的"伪输入框"：长得像禁用态 input，明确告诉用户这里改不了 */
  .readonly-value {
    display: inline-flex;
    align-items: center;
    min-width: 120px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-regular);
    font-variant-numeric: tabular-nums;
  }

  /* 产品主图上传：占位框 / 预览框 / 操作条 */
  .image-upload {
    width: 100%;

    /* el-upload 的 trigger 默认 inline，撑满整列才好看 */
    :deep(.el-upload) {
      display: block;
      width: 100%;
    }

    &__placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      height: 96px;
      border: 1px dashed var(--el-border-color);
      border-radius: 8px;
      background-color: var(--el-fill-color-lighter);
      color: var(--el-text-color-secondary);
      font-size: 13px;
      transition: border-color 0.2s;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    &__preview {
      position: relative;
      width: 96px;
      height: 96px;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &:hover .image-upload__mask {
        opacity: 1;
      }
    }

    &__mask {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.45);
      color: #ffffff;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &__bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 6px;
      min-height: 24px;
    }
  }

  .full {
    width: 100%;
  }
}
</style>
