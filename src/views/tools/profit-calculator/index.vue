<template>
  <div class="profit-calculator" v-loading="prefillLoading">
    <!-- 顶部：关联产品（可选）——选中后自动带出产品已有信息，不选则纯手动测算 -->
    <el-row :gutter="16">
      <el-col :span="24">
        <el-card shadow="never" class="block-card">
          <div class="product-bar">
            <span class="product-bar__label">关联产品</span>
            <el-select
              v-model="selectedProductId"
              filterable
              remote
              clearable
              placeholder="输入产品编号 / 中文名搜索，选中后自动带出；不选则手动填写"
              :remote-method="searchProducts"
              :loading="optionsLoading"
              class="product-bar__select"
              @change="handleProductChange"
            >
              <el-option
                v-for="i in productOptions"
                :key="i.value"
                :label="i.label"
                :value="i.value"
              />
            </el-select>
            <span class="product-bar__mode">
              {{
                selectedProductId
                  ? "已关联产品：保存时同步更新该产品的 FBA 费用"
                  : "手动测算：保存只记方案，不关联任何产品"
              }}
            </span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 顶部：产品尺寸（全局唯一尺寸入口） -->
    <el-row :gutter="16">
      <el-col :span="24">
        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">产品尺寸</span>
              <span class="card-sub"
                >全局唯一尺寸入口，下方 cm / inch 由此处自动换算</span
              >
            </div>
          </template>
          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="单位">
                  <el-radio-group v-model="form.sizeUnit">
                    <el-radio-button value="cm">厘米/cm</el-radio-button>
                    <el-radio-button value="inch">英寸/inch</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :xs="8" :sm="4" :md="6">
                <el-form-item :label="`最长边 (${unitLabel})`">
                  <el-input-number
                    v-model="form.length"
                    :min="0"
                    :precision="2"
                    :step="0.5"
                    controls-position="right"
                    class="full"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="8" :sm="4" :md="6">
                <el-form-item :label="`次长边 (${unitLabel})`">
                  <el-input-number
                    v-model="form.width"
                    :min="0"
                    :precision="2"
                    :step="0.5"
                    controls-position="right"
                    class="full"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="8" :sm="4" :md="6">
                <el-form-item :label="`最短边 (${unitLabel})`">
                  <el-input-number
                    v-model="form.height"
                    :min="0"
                    :precision="2"
                    :step="0.5"
                    controls-position="right"
                    class="full"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 区块 1：产品成本计算 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">产品成本计算</span>
              <span class="card-sub">人民币成本与按售价计提的费用</span>
            </div>
          </template>
          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="采购/生产成本 (含运费)">
                  <el-input
                    v-model.number="form.purchaseCost"
                    type="number"
                    min="0"
                  >
                    <template #append>￥</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="广告费用占比">
                  <el-input v-model.number="form.adRate" type="number" min="0">
                    <template #append>%</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="VAT 费用 (仅限欧洲)">
                  <el-input v-model.number="form.vatRate" type="number" min="0">
                    <template #append>%</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="其它杂费">
                  <el-input
                    v-model.number="form.miscRate"
                    type="number"
                    min="0"
                  >
                    <template #append>%</template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>
            <el-divider content-position="left">计算结果</el-divider>
            <el-row :gutter="16">
              <el-col :span="12">
                <div class="calc-cell is-result">
                  <span class="calc-label">产品总成本</span>
                  <span class="calc-value strong">{{
                    money(result.totalCostCny)
                  }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell is-result">
                  <span class="calc-label">实际垫资成本</span>
                  <span class="calc-value">{{
                    money(result.advanceCostCny)
                  }}</span>
                </div>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>

      <!-- 区块 2：头程运费计算 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">头程运费计算</span>
              <span class="card-sub">实重与抛重取大者计费</span>
            </div>
          </template>
          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :span="8"
                ><div class="calc-cell small">
                  <span class="calc-label">最长边 / cm</span
                  ><span class="calc-value">{{ result.sizeCm.l }}</span>
                </div></el-col
              >
              <el-col :span="8"
                ><div class="calc-cell small">
                  <span class="calc-label">次长边 / cm</span
                  ><span class="calc-value">{{ result.sizeCm.w }}</span>
                </div></el-col
              >
              <el-col :span="8"
                ><div class="calc-cell small">
                  <span class="calc-label">最短边 / cm</span
                  ><span class="calc-value">{{ result.sizeCm.h }}</span>
                </div></el-col
              >
            </el-row>
            <el-row :gutter="12">
              <!-- 手填项在前，计算结果紧随其后 -->
              <el-col :xs="24" :sm="8" :md="8">
                <el-form-item label="产品重量 /kg">
                  <el-input
                    v-model.number="form.weightKg"
                    type="number"
                    min="0"
                  >
                    <template #append>kg</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="8" :md="8">
                <div class="calc-cell dual">
                  <span class="calc-label">抛货体积重</span>
                  <div class="dual-row">
                    <span class="dual-key">公制</span>
                    <span class="calc-value"
                      >{{ num(result.volWeightKg, 4) }} kg</span
                    >
                  </div>
                  <div class="dual-row">
                    <span class="dual-key">英制</span>
                    <span class="calc-value">{{
                      lbOzText(result.volWeightLb)
                    }}</span>
                  </div>
                </div>
              </el-col>
              <el-col :xs="24" :sm="8" :md="8">
                <el-form-item label="材积比 (抛货)">
                  <el-select v-model="form.volumeDivisor" class="full">
                    <el-option
                      v-for="d in volumeDivisorOptions"
                      :key="d"
                      :label="d"
                      :value="d"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 配送方式 + 头程方式：选项与录入产品同一份，杜绝两边漂移 -->
            <el-row :gutter="12">
              <el-col :xs="24" :sm="12" :md="12">
                <el-form-item label="配送方式">
                  <el-select
                    v-model="form.shippingMethod"
                    class="full"
                  >
                    <el-option
                      v-for="item in SHIPPING_METHOD_OPTIONS"
                      :key="item.code"
                      :label="item.name"
                      :value="item.code"
                    />
                  </el-select>
                  <div class="calc-hint" v-if="currentShippingMethod?.remark">
                    {{ currentShippingMethod.remark }}
                  </div>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="12">
                <el-form-item label="头程方式">
                  <el-select
                    v-model="form.firstLegMethodCode"
                    clearable
                    placeholder="选择后带出材积比与默认单价"
                    class="full"
                    @change="handleFirstLegMethodChange"
                  >
                    <el-option
                      v-for="item in FIRST_LEG_METHOD_OPTIONS"
                      :key="item.code"
                      :label="item.name"
                      :value="item.code"
                    />
                  </el-select>
                  <div class="calc-hint" v-if="currentFirstLegMethod?.remark">
                    {{ currentFirstLegMethod.remark }}
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :xs="24" :sm="12" :md="12">
                <el-form-item label="物流商">
                  <el-input
                    v-model="form.logisticsProvider"
                    placeholder="如：云途 / 燕文"
                  />
                </el-form-item>
              </el-col>
              <!-- 亚马逊 SEND：整票核算，显示只读的头程总费用 + 商品总数；
                   自选承运人：显示运费单价（头程方式可自动带出，可手改） -->
              <el-col :xs="24" :sm="12" :md="12" v-if="!amazonSend">
                <el-form-item label="运费单价">
                  <el-input
                    v-model.number="form.firstLegPrice"
                    type="number"
                    min="0"
                  >
                    <template #append>元/kg</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <template v-else>
                <el-col :xs="24" :sm="12" :md="12">
                  <el-form-item label="头程总费用 (整票)">
                    <el-input
                      v-model.number="form.shippingTotalFeeUsd"
                      type="number"
                      min="0"
                      :disabled="sendFeeLocked"
                    >
                      <template #append>$</template>
                    </el-input>
                    <div class="calc-hint">
                      {{
                        sendFeeLocked
                          ? "从产品档案只读带入，要改请先到产品详情编辑"
                          : "未关联产品，可手动填写整票配送费"
                      }}
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12" :md="12">
                  <el-form-item label="商品总数 (整票)">
                    <el-input
                      v-model.number="form.totalUnits"
                      type="number"
                      min="0"
                      :disabled="sendFeeLocked"
                    >
                      <template #append>件</template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </template>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <div class="calc-cell is-result">
                  <span class="calc-label">头程运费 (单件)</span>
                  <span class="calc-value strong">{{
                    money(result.firstLegCostCny)
                  }}</span>
                  <span class="calc-hint">{{
                    amazonSend
                      ? "头程总费用 × 汇率 ÷ 商品总数"
                      : "MAX(实重, 抛货体积重) × 运费单价"
                  }}</span>
                </div>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 区块 3：FBA 运费（尾程）计算 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">FBA费用计算</span>
              <span class="card-sub"
                >费率随尺寸分段与售价区间浮动，已含燃油附加</span
              >
            </div>
          </template>
          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :span="8"
                ><div class="calc-cell small">
                  <span class="calc-label">最长边 / inch</span
                  ><span class="calc-value">{{ result.sizeInch.l }}</span>
                </div></el-col
              >
              <el-col :span="8"
                ><div class="calc-cell small">
                  <span class="calc-label">次长边 / inch</span
                  ><span class="calc-value">{{ result.sizeInch.w }}</span>
                </div></el-col
              >
              <el-col :span="8"
                ><div class="calc-cell small">
                  <span class="calc-label">最短边 / inch</span
                  ><span class="calc-value">{{ result.sizeInch.h }}</span>
                </div></el-col
              >
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <div class="calc-cell">
                  <span class="calc-label">产品重量 /磅</span>
                  <span class="calc-value"
                    >{{ num(result.weightLb, 4) }} lb</span
                  >
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell is-bill-weight">
                  <span class="calc-label">计费重 (实重/体积重取大)</span>
                  <div class="bill-weight-main">
                    <span class="calc-value strong"
                      >{{ num(result.billWeightLb, 4) }} lb</span
                    >
                    <el-tag size="small" :type="billWeightTagType" effect="dark"
                      >按{{ billWeightBasisText }}计费</el-tag
                    >
                  </div>
                  <span class="bill-weight-hint">{{ billWeightHint }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell">
                  <span class="calc-label">尺寸分段</span>
                  <el-tag :type="sizeTierTagType" size="small">{{
                    result.sizeTierLabel
                  }}</el-tag>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell">
                  <span class="calc-label">售价区间</span>
                  <span class="calc-value">{{ result.priceBandLabel }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell is-result">
                  <span class="calc-label">尾程配送费</span>
                  <span class="calc-value strong">{{
                    usd(result.fbaFeeUsd)
                  }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <el-form-item label="合仓费">
                  <el-input
                    v-model.number="form.storageFeeUsd"
                    type="number"
                    min="0"
                  >
                    <template #append>$</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="入库配置费">
                  <el-input
                    v-model.number="form.inboundConfigFeeUsd"
                    type="number"
                    min="0"
                  >
                    <template #append>$</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="月度仓储费">
                  <el-input
                    v-model.number="form.monthlyStorageUsd"
                    type="number"
                    min="0"
                  >
                    <template #append>$</template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">佣金与退货</el-divider>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="类目 (销售佣金)">
                  <el-select
                    v-model="form.commissionCategory"
                    filterable
                    placeholder="请选择类目"
                    class="full"
                  >
                    <el-option
                      v-for="i in commissionCategories"
                      :key="i.name"
                      :label="i.name"
                      :value="i.name"
                    >
                      <span>{{ i.name }}</span>
                      <span class="opt-hint">{{ categoryRateText(i) }}</span>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell">
                  <span class="calc-label">佣金 (金额 / 费率)</span>
                  <span class="calc-value">
                    {{ usd(result.commissionAmountUsd) }}
                    <span class="unit-inline"
                      >/ {{ percent(result.commissionRate) }}</span
                    >
                  </span>
                </div>
              </el-col>
              <el-col :span="12">
                <el-form-item label="退货率">
                  <el-input
                    v-model.number="form.returnRate"
                    type="number"
                    min="0"
                  >
                    <template #append>%</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="尾程退货费">
                  <el-input
                    v-model.number="form.returnFeeUsd"
                    type="number"
                    min="0"
                  >
                    <template #append>$</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="类目 (退货阈值)">
                  <el-select
                    v-model="form.returnCategory"
                    filterable
                    placeholder="请选择类目"
                    class="full"
                  >
                    <el-option
                      v-for="i in returnThresholds"
                      :key="i.name"
                      :label="i.name"
                      :value="i.name"
                    >
                      <span>{{ i.name }}</span>
                      <span class="opt-hint">{{ percent(i.threshold) }}</span>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell">
                  <span class="calc-label">类目退货阈值</span>
                  <span class="calc-value">{{
                    percent(result.returnThreshold)
                  }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell">
                  <span class="calc-label">退货阈值差</span>
                  <span class="calc-value">{{
                    percent(result.thresholdDiff)
                  }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell is-result">
                  <span class="calc-label">平均退货费用</span>
                  <span class="calc-value">{{
                    money(result.returnCostCny)
                  }}</span>
                </div>
              </el-col>
              <el-col :span="24">
                <div class="calc-cell is-result">
                  <span class="calc-label">FBA 费用 (总)</span>
                  <span class="calc-value strong">{{
                    money(result.fbaTotalCny)
                  }}</span>
                </div>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>

      <!-- 区块 4：产品利润计算 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">产品利润计算</span>
              <span class="card-sub">最终产出</span>
            </div>
          </template>
          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="汇率 (USD → CNY)">
                  <el-input
                    v-model.number="form.exchangeRate"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="售价">
                  <el-input
                    v-model.number="form.salePriceUsd"
                    type="number"
                    min="0"
                  >
                    <template #append>$</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="目标利润率 (仅用于提示)">
                  <el-input
                    v-model.number="form.targetMargin"
                    type="number"
                    min="0"
                  >
                    <template #append>%</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="最低销售佣金 (原表未启用)">
                  <el-switch
                    v-model="form.useMinCommission"
                    inline-prompt
                    active-text="启用"
                    inactive-text="停用"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">计算结果</el-divider>
            <el-row :gutter="16">
              <el-col :span="24">
                <div class="result-main" :class="`is-${result.marginStatus}`">
                  <div class="result-item">
                    <span class="result-label">利润</span>
                    <span class="result-value">{{
                      money(result.profitCny)
                    }}</span>
                  </div>
                  <div class="result-item">
                    <span class="result-label">利润率</span>
                    <span class="result-value">{{
                      percent(result.marginRate)
                    }}</span>
                    <el-tag
                      class="result-tag"
                      :type="marginTagType"
                      size="small"
                      effect="dark"
                      >{{ marginStatusText }}</el-tag
                    >
                  </div>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell is-result">
                  <span class="calc-label">到手收入 (售价折人民币)</span>
                  <span class="calc-value">{{ money(result.revenueCny) }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="calc-cell is-result">
                  <span class="calc-label">产品总成本</span>
                  <span class="calc-value">{{
                    money(result.totalCostCny)
                  }}</span>
                </div>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 计算过程明细 -->
    <el-row :gutter="16">
      <el-col :span="24">
        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">计算过程明细</span>
              <span class="card-sub"
                >按计算顺序列出全部中间结果，便于逐项核对</span
              >
            </div>
          </template>
          <el-table :data="detailRows" size="small" border stripe>
            <el-table-column type="index" label="#" width="56" align="center" />
            <el-table-column prop="name" label="项目" min-width="180" />
            <el-table-column prop="value" label="数值" min-width="200" />
            <el-table-column prop="desc" label="说明" min-width="280" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 口径说明 -->
    <el-row :gutter="16">
      <el-col :span="24">
        <el-collapse>
          <el-collapse-item title="计算口径与已知说明（点击展开）" name="note">
            <ul class="note-list">
              <li>
                原表 <code>平均退货费用</code> 与
                <code>FBA 费用（总）</code> 两项的标签写的是
                <code>/$</code>，但公式已乘汇率，实际单位是
                <b>￥</b>，本页已纠正。
              </li>
              <li>
                佣金类目与退货阈值类目是两套独立字典（与亚马逊官方一致），需分别选择，命名不完全对应，请留意。
              </li>
              <li>
                分档类目已按官方原文区分两种口径：「……的<b>商品</b>」为全额跳档，「……的<b>部分</b>」为分段累进，系统会依据售价自动判定。
              </li>
              <li>
                尺寸分段判定沿用原表逻辑：只看实重，未与体积重取大；大件分支固定取「小号大件」费率。
              </li>
              <li>
                3~20 磅阶梯原表以字符串
                <code>"6.69 + 0.08"</code>
                存储，这里已拆成数值，避免文本解析风险。
              </li>
              <li>
                最低销售佣金已在字典中，原表未实现；可通过上方开关启用测试。
              </li>
            </ul>
          </el-collapse-item>
        </el-collapse>
      </el-col>
    </el-row>

    <!-- 底部操作 -->
    <el-row :gutter="16">
      <el-col :span="24" class="footer-bar">
        <el-input
          v-model="planName"
          placeholder="方案名称（可选），如：CYXY-001 售价 $18.99 方案"
          class="footer-bar__name"
          clearable
        />
        <el-button type="success" :loading="saving" @click="handleSave"
          >保存测算</el-button
        >
        <el-button type="primary" @click="handleReset"
          >重置为示例数据</el-button
        >
        <el-button @click="handleClear">清空重算</el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { commissionCategories, returnThresholds, CALC_CONST } from "./dict.js";
import { calculate, createDefaultForm } from "./calc.js";
import { useCommon } from "@/hooks/useCommon.js";
// 配送方式 / 头程方式的选项直接复用录入产品那份，保证两处下拉永不漂移
import {
  SHIPPING_METHOD_OPTIONS,
  FIRST_LEG_METHOD_OPTIONS,
  firstLegMethodMap,
  isAmazonSend,
} from "@/views/product/options.js";
import {
  saveProfit,
  getProductOptions,
  getProductPrefill,
} from "@/api/profit.js";

const { route, getRouteParams, removeRouteParams } = useCommon();

const form = ref(createDefaultForm());

const result = computed(() => calculate(form.value));

const unitLabel = computed(() =>
  form.value.sizeUnit === "cm" ? "cm" : "inch"
);

/* ================================================================
   关联产品（可选）：远程搜索 → 选中带出 → 保存时联动 product_fba_fee
   ================================================================ */
const selectedProductId = ref(null);
const productOptions = ref([]);
const optionsLoading = ref(false);
const prefillLoading = ref(false);
const saving = ref(false);
const planName = ref("");

const searchProducts = async (keyword) => {
  optionsLoading.value = true;
  try {
    // 失败不额外提示：request 拦截器已统一弹错
    // 后端返回 DictOptionVO（code/name），这里映射成 el-select 需要的 value/label
    const list = await getProductOptions(keyword);
    productOptions.value = (list || []).map((o) => ({
      value: o.code,
      label: o.name,
    }));
  } catch (e) {
    /* ignore */
  } finally {
    optionsLoading.value = false;
  }
};

/** 选中产品：调后端 prefill 回填（佣金类目故意不带出，每轮手选） */
const handleProductChange = async (id) => {
  if (!id) return; // 清除选择：只解除关联，表单数值保留供继续微调
  prefillLoading.value = true;
  try {
    const data = await getProductPrefill(id);
    applyPrefill(data);
    ElMessage.success("已带出产品信息，请补选佣金类目等手填项后测算");
  } catch (e) {
    /* ignore */
  } finally {
    prefillLoading.value = false;
  }
};

/** 后端 prefill（snake_case）→ 本地表单（camelCase）；null 字段不覆盖现值 */
const applyPrefill = (data) => {
  if (!data) return;
  const f = form.value;
  if (data.size_unit) f.sizeUnit = data.size_unit;
  if (data.logistics_provider != null)
    f.logisticsProvider = data.logistics_provider;
  if (data.return_category) f.returnCategory = data.return_category;
  if (data.shipping_method) f.shippingMethod = data.shipping_method;
  if (data.first_leg_method_code != null)
    f.firstLegMethodCode = data.first_leg_method_code;

  // 数值类：null / 缺省不覆盖（如「自填」头程方式不给单价，保留用户已填值）
  const numMap = [
    ["length", "length"],
    ["width", "width"],
    ["height", "height"],
    ["weight_kg", "weightKg"],
    ["purchase_cost", "purchaseCost"],
    ["sale_price_usd", "salePriceUsd"],
    ["first_leg_price", "firstLegPrice"],
    ["exchange_rate", "exchangeRate"],
    ["volume_divisor", "volumeDivisor"],
    ["storage_fee_usd", "storageFeeUsd"],
    ["inbound_config_fee_usd", "inboundConfigFeeUsd"],
    ["monthly_storage_usd", "monthlyStorageUsd"],
    ["shipping_total_fee_usd", "shippingTotalFeeUsd"],
    ["total_units", "totalUnits"],
  ];
  numMap.forEach(([k, fk]) => {
    const v = data[k];
    if (v !== null && v !== undefined && v !== "") f[fk] = Number(v);
  });
};

/** 保存测算：事务写方案 + 结果快照；选中产品时后端同步 upsert 该产品的 FBA 费用 */
const handleSave = async () => {
  const f = form.value;
  if (!f.salePriceUsd) {
    ElMessage.warning("请先填写售价再保存");
    return;
  }
  if (!f.commissionCategory) {
    ElMessage.warning("请先选择佣金类目再保存");
    return;
  }
  saving.value = true;
  try {
    // ⚠️ 百分制口径：ad_rate / return_rate / target_margin 直接传百分数（15 = 15%），
    //    与后端 DTO、profit_plan 存储口径一致；返回值里的比率才是小数
    const r = await saveProfit({
      product_id: selectedProductId.value || null,
      plan_name: planName.value?.trim() || null,
      size_unit: f.sizeUnit,
      length: f.length,
      width: f.width,
      height: f.height,
      weight_kg: f.weightKg,
      purchase_cost: f.purchaseCost,
      ad_rate: f.adRate,
      vat_rate: f.vatRate,
      misc_rate: f.miscRate,
      volume_divisor: f.volumeDivisor,
      logistics_provider: f.logisticsProvider,
      first_leg_price: f.firstLegPrice,
      shipping_method: f.shippingMethod,
      first_leg_method_code: f.firstLegMethodCode || null,
      shipping_total_fee_usd: f.shippingTotalFeeUsd,
      total_units: f.totalUnits,
      commission_category: f.commissionCategory,
      return_category: f.returnCategory,
      return_rate: f.returnRate,
      return_fee_usd: f.returnFeeUsd,
      storage_fee_usd: f.storageFeeUsd,
      inbound_config_fee_usd: f.inboundConfigFeeUsd,
      monthly_storage_usd: f.monthlyStorageUsd,
      sale_price_usd: f.salePriceUsd,
      exchange_rate: f.exchangeRate,
      target_margin: f.targetMargin,
      use_min_commission: f.useMinCommission,
    });
    const profit = Number(r.profit_cny).toFixed(2);
    const margin = (Number(r.margin_rate) * 100).toFixed(2);
    ElMessage.success(
      `保存成功（后端口径）：利润 ￥${profit}，利润率 ${margin}%`
    );
  } catch (e) {
    /* ignore */
  } finally {
    saving.value = false;
  }
};

/* ---------- 入口跳转：列表 / 详情页「测算利润」按钮带产品过来 ---------- */
const tryEntryProduct = async () => {
  // toPage 走 store 传参，URL query 兜底；用完即清，避免下次从菜单进来还带旧参数
  const params = getRouteParams("ToolsProfitCalculator") || {};
  if (params.productId) removeRouteParams("ToolsProfitCalculator");
  const productId = params.productId || route.query.product_id;
  if (!productId) return;
  if (Number(productId) === Number(selectedProductId.value)) return;

  selectedProductId.value = Number(productId);
  const productName =
    params.productName || decodeURIComponent(route.query.product_name || "");
  if (productName) {
    // 先塞一条已知 label，避免下拉显示成裸 id
    productOptions.value = [
      { value: selectedProductId.value, label: productName },
    ];
  }
  await handleProductChange(selectedProductId.value);
};

onMounted(async () => {
  searchProducts("");
  await tryEntryProduct();
});

// 同一个 .vue 被复用不会重新 mount（本项目已知坑），入口再次跳进来靠这里补触发
watch(
  () => route.fullPath,
  () => {
    if (route.name === "ToolsProfitCalculator") tryEntryProduct();
  }
);

/* ---------- 格式化 ---------- */
const num = (n, d = 2) =>
  n === null || n === undefined || Number.isNaN(n) ? "-" : Number(n).toFixed(d);
const money = (n) => `￥ ${num(n, 2)}`;
const usd = (n) => `$ ${num(n, 2)}`;
const percent = (n) => `${num((n || 0) * 100, 2)}%`;

/* ---------- 重量自适应：小于 1 磅用盎司，达到 1 磅及以上用磅 ---------- */
const lbOzText = (lb) => {
  if (lb === null || lb === undefined || Number.isNaN(Number(lb))) return "-";
  const v = Number(lb);
  return v < 1 ? `${num(v * CALC_CONST.ozPerLb, 2)} oz` : `${num(v, 2)} lb`;
};

/* ---------- 材积比下拉项 ---------- */
const volumeDivisorOptions = [5000, 6000];

/* ---------- 头程：配送方式分叉（与录入产品口径一致） ---------- */
const amazonSend = computed(() => isAmazonSend(form.value.shippingMethod));
const currentShippingMethod = computed(
  () =>
    SHIPPING_METHOD_OPTIONS.find(
      (item) => item.code === form.value.shippingMethod
    ) || null
);
const currentFirstLegMethod = computed(
  () => firstLegMethodMap[form.value.firstLegMethodCode] || null
);
// 关联产品时，SEND 的整票费用/件数从产品档案只读带入，不允许手改；
// 纯手动测算（未关联产品）没有数据来源，放开手填，否则算法不可用
const sendFeeLocked = computed(() => amazonSend.value && !!selectedProductId.value);

// 头程方式切换：带出材积比与默认单价（与录入表单 handleMethodChange 同逻辑）
const handleFirstLegMethodChange = (code) => {
  const method = firstLegMethodMap[code];
  if (!method) return;
  if (method.volumeDivisor) form.value.volumeDivisor = method.volumeDivisor;
  if (method.defaultUnitPrice)
    form.value.firstLegPrice = method.defaultUnitPrice;
};

/* ---------- 计费重来源标注 ---------- */
const billWeightBasisText = computed(() =>
  result.value.billWeightBasis === "dimensional" ? "体积重" : "实重"
);
const billWeightTagType = computed(() =>
  result.value.billWeightBasis === "dimensional" ? "warning" : "success"
);
const billWeightHint = computed(() => {
  const r = result.value;
  return `实重 ${num(r.weightLb, 4)} lb / 体积重 ${num(
    r.dimWeightLb,
    4
  )} lb，取大者`;
});

/* ---------- 下拉项费率提示 ---------- */
const categoryRateText = (cat) => {
  if (!cat) return "";
  if (cat.mode === "flat") return `${num(cat.rate * 100, 0)}%`;
  const mode = cat.mode === "full" ? "跳档" : "累进";
  return `${mode} ${cat.tiers
    .map((t) => `${num(t.rate * 100, 0)}%`)
    .join("·")}`;
};

/* ---------- 尺寸分段状态 ---------- */
const sizeTierTagType = computed(() => {
  if (result.value.sizeTierKey === "small") return "success";
  if (result.value.sizeTierKey === "large") return "primary";
  return "warning";
});

/* ---------- 利润率状态（盈利红 / 亏损绿） ---------- */
const marginTagType = computed(() => {
  const map = { danger: "danger", good: "success", warn: "warning" };
  return map[result.value.marginStatus];
});
const marginStatusText = computed(() => {
  const map = { danger: "亏损", good: "达标", warn: "低于目标" };
  return map[result.value.marginStatus];
});

/* ---------- 明细表格 ---------- */
const detailRows = computed(() => {
  const r = result.value;
  return [
    {
      name: "尺寸 (cm)",
      value: `${r.sizeCm.l} × ${r.sizeCm.w} × ${r.sizeCm.h} cm`,
      desc: "按所选单位换算后保留 2 位小数",
    },
    {
      name: "尺寸 (inch)",
      value: `${r.sizeInch.l} × ${r.sizeInch.w} × ${r.sizeInch.h} in`,
      desc: "用于尺寸分段与体积重判定",
    },
    {
      name: "抛货体积重",
      value: `${num(r.volWeightKg, 4)} kg / ${lbOzText(r.volWeightLb)}`,
      desc: `长×宽×高(cm) ÷ ${form.value.volumeDivisor}`,
    },
    {
      name: "产品重量",
      value: `${num(r.weightLb, 4)} lb`,
      desc: "kg × 2.2046226",
    },
    {
      name: "体积重",
      value: `${num(r.dimWeightLb, 4)} lb`,
      desc: `长×宽×高(in) ÷ ${CALC_CONST.dimDivisorInch}`,
    },
    {
      name: "计费重",
      value: `${num(r.billWeightLb, 4)} lb`,
      desc: `实重与体积重取大者，本次按${billWeightBasisText.value}计费`,
    },
    {
      name: "尺寸分段",
      value: r.sizeTierLabel,
      desc: "三档：小号标准 / 大号标准 / 大件超大件",
    },
    {
      name: "尾程配送费",
      value: `${usd(r.fbaFeeUsd)}（未含燃油 ${usd(r.fbaFeeBeforeFuelUsd)}）`,
      desc: `按 ${r.priceBandLabel} 区间查表 × 1.035`,
    },
    {
      name: "类目佣金",
      value: `${usd(r.commissionAmountUsd)}（${percent(r.commissionRate)}）`,
      desc: r.category?.remark || "未选择类目",
    },
    {
      name: "类目退货阈值",
      value: percent(r.returnThreshold),
      desc: "来自退货阈值字典",
    },
    {
      name: "退货阈值差",
      value: percent(r.thresholdDiff),
      desc: "MAX(0, 退货率 − 阈值)",
    },
    {
      name: "平均退货费用",
      value: money(r.returnCostCny),
      desc: "(佣金×20% + 配送费) × 退货率 + 阈值差 × 退货费，再折人民币",
    },
    {
      name: "头程运费",
      value: money(r.firstLegCostCny),
      desc:
        form.value.shippingMethod === "AMAZON_SEND"
          ? "亚马逊SEND：整票配送费 × 汇率 ÷ 商品总数"
          : "自选承运人：MAX(实重, 抛重) × 运费单价",
    },
    {
      name: "入库配置费 / 月度仓储费",
      value: `${usd(r.inboundConfigFeeUsd)} / ${usd(r.monthlyStorageUsd)}`,
      desc: "两笔按件计的 FBA 费用，与佣金同口径折人民币进总成本",
    },
    {
      name: "产品总成本",
      value: money(r.totalCostCny),
      desc: "各项成本汇总",
    },
    {
      name: "利润",
      value: money(r.profitCny),
      desc: "到手收入 − 总成本",
    },
    {
      name: "利润率",
      value: percent(r.marginRate),
      desc: "利润 ÷ 到手收入",
    },
  ];
});

/* ---------- 操作 ---------- */
const handleReset = () => {
  form.value = createDefaultForm();
  ElMessage.success("已重置为示例数据");
};

const handleClear = () => {
  form.value = {
    sizeUnit: "cm",
    length: 0,
    width: 0,
    height: 0,
    purchaseCost: 0,
    adRate: 0,
    vatRate: 0,
    miscRate: 0,
    weightKg: 0,
    volumeDivisor: CALC_CONST.volumeDivisor,
    shippingMethod: "SELF_CARRIER",
    firstLegMethodCode: "",
    shippingTotalFeeUsd: 0,
    totalUnits: 0,
    logisticsProvider: "",
    firstLegPrice: 0,
    commissionCategory: "",
    returnCategory: "",
    returnRate: 0,
    returnFeeUsd: 0,
    storageFeeUsd: 0,
    inboundConfigFeeUsd: 0,
    monthlyStorageUsd: 0,
    salePriceUsd: 0,
    exchangeRate: form.value.exchangeRate,
    targetMargin: form.value.targetMargin,
    useMinCommission: false,
  };
};
</script>

<style lang="scss" scoped>
.profit-calculator {
  /* ============================================================
     配色集中在这里，后期想换风格只改下面这几个 HEX 即可
     ============================================================ */
  --cyxy-result-bg: #eaf2fc; // 计算结果卡片底色
  --cyxy-result-border: #a8c7ee; // 计算结果卡片边框
  --cyxy-bill-weight: #ffffff; // 计费重强调色（实线边框）
  --cyxy-bill-weight-ring: #d97d97; // 计费重外圈环
  --cyxy-dual-key: #8c9bab; // 双单位卡片里的单位标签字色

  .block-card {
    margin-bottom: 16px;

    /* 模块最外框加深：默认 --el-card-border-color 太浅，几乎看不见，
       加深后与内部浅色单元格形成层次（表头分隔线同步生效） */
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

  .full {
    width: 100%;
  }

  /* 只读计算单元格：视觉上对齐原 Excel 的「标签 + 数值」 */
  .calc-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    margin-bottom: 18px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    background-color: var(--el-fill-color-lighter);
    min-height: 56px;
    justify-content: center;

    &.small {
      min-height: 48px;
      margin-bottom: 16px;
    }
  }

  .calc-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  /* 表单项 / 结果格下方的说明小字 */
  .calc-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;
    margin-top: 2px;
  }

  /* 计算结果卡片：与「只读中间量」区分开，换自定义底色 */
  .calc-cell.is-result {
    background-color: var(--cyxy-result-bg);
    border-color: var(--cyxy-result-border);

    .calc-label {
      color: var(--el-text-color-regular);
    }
  }

  /* 计费重：实线边框 + 外侧一圈环线，让结果更显眼 */
  .calc-cell.is-bill-weight {
    border: 2px solid var(--cyxy-bill-weight);
    box-shadow: 0 0 0 3px var(--cyxy-bill-weight-ring);
    border-radius: 6px;
  }

  .bill-weight-main {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .bill-weight-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-variant-numeric: tabular-nums;
  }

  /* 一张卡片里放两行数据（如 kg 与 lb/oz） */
  .calc-cell.dual {
    gap: 2px;
  }

  .dual-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .dual-key {
    font-size: 11px;
    color: var(--cyxy-dual-key);
    flex: 0 0 28px;
  }

  .calc-value {
    font-size: 14px;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;

    &.strong {
      font-size: 16px;
      font-weight: 600;
    }
  }

  .unit-inline {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  /* 最终结果：利润 + 利润率 */
  .result-main {
    display: flex;
    gap: 32px;
    padding: 16px 20px;
    margin-bottom: 18px;
    border-radius: 8px;
    background-color: var(--el-fill-color-lighter);
    border: 2px solid var(--el-border-color-lighter);

    &.is-good {
      border-color: var(--el-color-success-light-5);
    }
    &.is-warn {
      border-color: var(--el-color-warning-light-5);
    }
    &.is-danger {
      border-color: var(--el-color-danger-light-5);
    }
  }

  .result-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .result-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .result-value {
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }

  .result-tag {
    margin-left: 4px;
  }

  :deep(.el-select-dropdown__item) {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .opt-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .note-list {
    padding-left: 18px;
    color: var(--el-text-color-regular);
    line-height: 1.9;
    font-size: 13px;

    code {
      padding: 1px 5px;
      border-radius: 4px;
      background-color: var(--el-fill-color-light);
      font-size: 12px;
    }
  }

  .footer-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .footer-bar__name {
    width: 320px;
    max-width: 100%;
  }

  /* ---------- 顶部关联产品条 ---------- */
  .product-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .product-bar__label {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .product-bar__select {
    width: 420px;
    max-width: 100%;
  }

  .product-bar__mode {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
