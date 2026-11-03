<template>
  <el-dialog
    v-model="visible"
    title="批量导入产品"
    width="760px"
    :close-on-click-modal="false"
    append-to-body
    @closed="handleClosed"
  >
    <!-- 三步说明：让用户知道「整批成功或整批失败」这个规则，免得看到 0 条成功以为出 bug -->
    <ol class="pi-steps">
      <li>
        先下载模板，按模板填写（列名带
        <span class="pi-req">*</span> 的是必填，类目 / 状态 / 头程 / 配送四列有下拉，直接选）
      </li>
      <li>上传填好的 Excel，点「开始导入」</li>
      <li>
        <b>整批成功或整批失败</b>：只要有一行不合规，这次一条都不会入库，按提示改完重传即可
      </li>
    </ol>

    <div class="pi-download">
      <el-button icon="Download" @click="handleDownload" :loading="downloading">
        下载导入模板
      </el-button>
      <span class="pi-download__tip">模板里第二页「填写说明」有每一列的含义</span>
    </div>

    <el-upload
      class="pi-upload"
      drag
      :auto-upload="false"
      :limit="1"
      accept=".xlsx,.xls"
      :file-list="fileList"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :on-exceed="handleExceed"
    >
      <div class="pi-upload__inner">
        <el-icon class="pi-upload__icon"><UploadFilled /></el-icon>
        <div class="pi-upload__text">把填好的 Excel 拖到这里，或<em>点击选择文件</em></div>
        <div class="pi-upload__hint">只支持 .xlsx / .xls，最大 10MB</div>
      </div>
    </el-upload>

    <!-- 导入结果 -->
    <div v-if="result" class="pi-result">
      <template v-if="result.fail_count === 0">
        <el-alert type="success" :closable="false" show-icon>
          <template #title>
            导入成功，共 {{ result.success_count }} 条产品已入库
          </template>
        </el-alert>
      </template>

      <template v-else>
        <el-alert type="error" :closable="false" show-icon>
          <template #title>
            共 {{ result.total }} 行，失败 {{ result.fail_count }} 行 —— 整批未入库，请按下面改完重传
          </template>
        </el-alert>

        <el-table :data="result.errors" size="small" border class="pi-result__table" max-height="260">
          <el-table-column prop="row_num" label="行号" width="70" align="center" />
          <el-table-column prop="product_no" label="产品编号" width="150">
            <template #default="{ row }">{{ row.product_no || "--" }}</template>
          </el-table-column>
          <el-table-column prop="column" label="出错列" width="140" />
          <el-table-column prop="message" label="原因" min-width="200" />
        </el-table>
      </template>
    </div>

    <template #footer>
      <el-button @click="handleClose">
        {{ result && result.fail_count === 0 ? "完成" : "关闭" }}
      </el-button>
      <el-button
        type="primary"
        :loading="importing"
        :disabled="!file || (result && result.fail_count === 0)"
        @click="handleImport"
      >
        开始导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import { downloadImportTemplate, importProducts } from "@/api/product.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "success"]);

/* 必须用 computed 双向代理，不能写 ref(props.modelValue)。
   ref 只在初始化时取一次值，父级之后把 v-model 改成 true 时这里收不到，
   表现就是「点按钮没反应」。computed 的 get 永远读父级最新值，set 再回传。 */
const visible = computed({
  get: () => props.modelValue,
  set: val => emit("update:modelValue", val),
});
const file = ref(null);
const fileList = ref([]);
const importing = ref(false);
const downloading = ref(false);
const result = ref(null);

const MAX_SIZE = 10 * 1024 * 1024;

// 下载模板
const handleDownload = () => {
  downloading.value = true;
  downloadImportTemplate()
    .then(() => {
      ElMessage.success("模板已下载，填好后回来上传");
    })
    .catch(err => {
      ElMessage.error(err?.message || "模板下载失败");
    })
    .finally(() => {
      downloading.value = false;
    });
};

// 选文件：这里不做上传，等点「开始导入」再发请求
const handleFileChange = uploadFile => {
  const raw = uploadFile.raw;
  if (!raw) return;
  if (raw.size > MAX_SIZE) {
    ElMessage.error("文件超过 10MB，请拆分后再传");
    fileList.value = [];
    file.value = null;
    return;
  }
  file.value = raw;
  result.value = null; // 换了文件就把上一次的结果清掉，避免看到过期结论
};

const handleFileRemove = () => {
  file.value = null;
  result.value = null;
};

const handleExceed = () => {
  ElMessage.warning("一次只能导入一个文件");
};

// 开始导入
const handleImport = () => {
  if (!file.value) {
    ElMessage.warning("请先选择 Excel 文件");
    return;
  }
  importing.value = true;
  importProducts(file.value)
    .then(res => {
      result.value = res;
      if (res && res.fail_count === 0) {
        ElMessage.success(`导入成功 ${res.success_count} 条`);
        emit("success"); // 通知列表刷新
      } else {
        ElMessage.error(`导入失败 ${res?.fail_count ?? 0} 行，整批未入库`);
      }
    })
    .catch(() => {})
    .finally(() => {
      importing.value = false;
    });
};

const handleClose = () => {
  // visible 是 computed，赋值会自动 emit("update:modelValue", false)
  visible.value = false;
};

// 弹窗彻底关闭后重置，下次打开是干净的（成功导入后保留结果到用户点关闭为止）
const handleClosed = () => {
  file.value = null;
  fileList.value = [];
  result.value = null;
};
</script>

<style lang="scss" scoped>
.pi-steps {
  margin: 0 0 14px;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--el-text-color-regular);

  li::marker {
    color: var(--el-text-color-secondary);
  }
}

.pi-req {
  color: #e0554e;
  font-weight: 600;
}

.pi-download {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.pi-download__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pi-upload {
  :deep(.el-upload-dragger) {
    padding: 22px 0;
  }
}

.pi-upload__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.pi-upload__icon {
  font-size: 40px;
  color: #b6c2d4;
}

.pi-upload__text {
  font-size: 13px;
  color: var(--el-text-color-regular);

  em {
    font-style: normal;
    color: #626aef;
  }
}

.pi-upload__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pi-result {
  margin-top: 16px;
}

.pi-result__table {
  margin-top: 10px;
}
</style>
