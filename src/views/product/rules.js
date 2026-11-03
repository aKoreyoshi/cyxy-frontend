/**
 * 产品表单校验规则
 *
 * 新增页 views/product/form 与 详情页 views/product/detail 的编辑态共用这一份，
 * 避免两边各写一份导致以后加字段时只改一边、悄悄漂移。
 *
 * 注意：规则要生效，el-form-item 上必须写对应的 prop，
 * 光在 rules 里加是不校验也不显示红色 * 的。
 */

/* 文本必填：required 保证表单项自动显示红色 * */
const requiredText = label => [
  { required: true, message: `请输入${label}`, trigger: ["blur", "change"] },
];

/* 下拉 / 单选必填 */
const requiredSelect = label => [
  { required: true, message: `请选择${label}`, trigger: "change" },
];

/* 数字必填且必须大于 0：重量、尺寸、单价这类物理上不可能为 0 的量 */
const requiredPositive = label => [
  { required: true, message: `请输入${label}`, trigger: ["blur", "change"] },
  {
    validator: (rule, value, callback) => {
      if (value === "" || value === null || value === undefined) {
        callback(new Error(`请输入${label}`));
      } else if (!Number.isFinite(Number(value))) {
        callback(new Error(`${label}必须是数字`));
      } else if (Number(value) <= 0) {
        callback(new Error(`${label}必须大于 0`));
      } else {
        callback();
      }
    },
    trigger: ["blur", "change"],
  },
];

/* 数字必填、允许 0（包邮时运费为 0 是合理的），但不能为负 */
const requiredNonNegative = label => [
  { required: true, message: `请输入${label}`, trigger: ["blur", "change"] },
  {
    validator: (rule, value, callback) => {
      if (value === "" || value === null || value === undefined) {
        callback(new Error(`请输入${label}`));
      } else if (!Number.isFinite(Number(value))) {
        callback(new Error(`${label}必须是数字`));
      } else if (Number(value) < 0) {
        callback(new Error(`${label}不能为负数`));
      } else {
        callback();
      }
    },
    trigger: ["blur", "change"],
  },
];

export const PRODUCT_FORM_RULES = {
  product_no: requiredText("产品编号"),
  name_cn: requiredText("产品名称（中文）"),
  category_code: requiredSelect("产品类目"),
  status: requiredSelect("产品状态"),

  // 主图改成选图上传后，校验仍是「非空字符串」，只把提示文案改成上传口径
  main_image: requiredText("产品主图"),
  source_url: requiredText("1688 采购链接"),

  purchase_price: requiredPositive("采购单价"),
  // 包邮场景下运费为 0 是合理的，所以只禁负数
  avg_domestic_shipping: requiredNonNegative("平均国内运费"),

  net_weight_g: requiredPositive("产品净重"),
  packaged_weight_g: requiredPositive("含包装实重"),
  length_cm: requiredPositive("包装长"),
  width_cm: requiredPositive("包装宽"),
  height_cm: requiredPositive("包装高"),
};
