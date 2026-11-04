<template>
  <div class="sys-page">
    <div class="sys-head">
      <div>
        <h1 class="sys-title">菜单管理</h1>
        <p class="sys-note">
          调整侧边栏名称、排序、层级与显示状态。一期只开放改名与新建「分组目录」，页面路径由代码注册，不能在这里凭空新建。
        </p>
      </div>
      <div class="sys-head__side">
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <el-button size="small" type="primary" @click="openCreate()">新建分组目录</el-button>
      </div>
    </div>

    <div class="sys-panel">
      <div class="sys-toolbar">
        <span class="sys-count">共 <strong>{{ flatCount }}</strong> 个菜单</span>
        <div class="sys-toolbar__spacer"></div>
        <span class="sys-tree-row__hint">
          停用只影响侧边栏显示；隐藏功能页（如产品详情）必须保留，否则点进去会跳 404
        </span>
      </div>

      <!-- 菜单是树，用 el-table 自带的树形数据而不是 RhTable：
           row-key + tree-props.children 就能展开层级，RhTable 的列配置方式不适合这种结构。 -->
      <el-table
        v-loading="loading"
        :data="menuTree"
        row-key="id"
        border
        :tree-props="{ children: 'children' }"
        default-expand-all
      >
        <el-table-column prop="title" label="菜单名称" min-width="200" />
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }">
            <span class="sys-chip">{{ typeText(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="页面路径" min-width="200">
          <template #default="{ row }">
            <span :style="{ color: row.url ? 'var(--sg-muted)' : 'var(--sg-faint)' }">
              {{ row.url || "—（目录）" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="routeName" label="标识" min-width="170">
          <template #default="{ row }">
            {{ row.routeName || "--" }}
          </template>
        </el-table-column>
        <el-table-column prop="icon" label="图标" min-width="160">
          <template #default="{ row }">
            {{ row.icon || "--" }}
          </template>
        </el-table-column>
        <el-table-column prop="sortNo" label="排序" width="80" align="center" />
        <el-table-column label="显示" width="90" align="center">
          <template #default="{ row }">
            <!-- 启停单独走一条更新路径：只提交 id + visible。
                 后端 updateById 只更新非 null 字段，不会顺手把标题 / 图标冲掉。 -->
            <el-switch
              :model-value="row.visible"
              :active-value="1"
              :inactive-value="0"
              :loading="togglingId === row.id"
              @change="val => handleToggle(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="来源" width="90" align="center">
          <template #default="{ row }">
            <span v-if="row.isBuiltin === 1" class="sys-chip sys-chip--accent">内置</span>
            <span v-else class="sys-chip">自建</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <span class="sys-actions">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <!-- 只有目录能挂下级：挂在可点击页面下的目录没有实际意义 -->
              <el-button
                v-if="!row.url"
                link
                type="primary"
                size="small"
                @click="openCreate(row.id)"
              >
                新增下级
              </el-button>
              <!-- 内置菜单、有子菜单的都不让删；后端 SysMenuService 也会再挡一次 -->
              <el-button
                link
                type="danger"
                size="small"
                :disabled="row.isBuiltin === 1 || hasChildren(row)"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="sys-empty">菜单数据为空，请检查初始化脚本是否已执行。</div>
        </template>
      </el-table>
    </div>

    <!-- 新建 / 编辑弹窗。MenuSaveDTO 只收这 5 个字段：
         url / routeName / menuType / writeApiPatterns 一律不接受，
         前者防白屏，后者防「把只读角色的写接口清单清空」绕过权限。 -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑菜单' : '新建分组目录'"
      width="520px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="上级菜单">
          <el-select v-model="form.parentId" placeholder="顶级菜单" style="width: 100%">
            <el-option label="顶级菜单" :value="0" />
            <el-option
              v-for="item in parentOptions"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单名称" prop="title">
          <el-input v-model="form.title" placeholder="显示在侧边栏的名称" />
        </el-form-item>
        <el-form-item label="图标">
          <!-- allow-create：管理员可以手输一个已在 iconfont.css 里定义的新类名 -->
          <el-select
            v-model="form.icon"
            filterable
            allow-create
            clearable
            default-first-option
            placeholder="可留空，或选择 / 输入 icon- 类名"
            style="width: 100%"
          >
            <el-option v-for="ic in ICON_OPTIONS" :key="ic" :label="ic" :value="ic" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sortNo" :min="0" :max="9999" />
          <span class="sys-tree-row__hint" style="margin-left: 10px">数字越小越靠前</span>
        </el-form-item>
        <el-form-item label="显示">
          <el-switch v-model="form.visible" :active-value="1" :inactive-value="0" />
        </el-form-item>

        <!-- 编辑已有页面时把不可改的技术信息摊开，免得管理员疑惑「为什么没有路径输入框」 -->
        <div v-if="form.id && form.url" class="sys-form-tip" style="margin-left: 96px">
          页面路径 <code>{{ form.url }}</code> 与标识 <code>{{ form.routeName }}</code> 由前端路由注册，
          修改会造成白屏或权限失效，因此不开放编辑。
        </div>
        <p v-if="!form.id" class="sys-form-tip">
          新建的一律是「分组目录」（没有页面路径）。要给目录配可点击页面，需要先在前端注册路由再由初始化脚本登记。
        </p>
      </el-form>
      <template #footer>
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getSystemMenuTree,
  createSystemMenu,
  updateSystemMenu,
  deleteSystemMenu,
} from "@/api/system.js";
import "../system.css";

// 现有 iconfont.css 里已定义的图标类名。菜单图标走 CSS mask，
// 新增图标要同时在 iconfont.css 的两组选择器里补上类名（见该文件注释）。
const ICON_OPTIONS = [
  "icon-shouye",
  "icon-caidan",
  "icon-kaifazujian",
  "icon-chanpin",
  "icon-product-list",
  "icon-product-add",
  "icon-tools",
  "icon-params",
  "icon-commission",
  "icon-return",
  "icon-exchange",
  "icon-size",
  "icon-rate",
  "icon-truck",
  "icon-oversize",
  "icon-settings",
  "icon-system-user",
  "icon-system-role",
  "icon-system-menu",
];

/* --------------------------------------------------------------
   树数据
   -------------------------------------------------------------- */
const menuTree = ref([]);
const loading = ref(false);
const togglingId = ref(null);

const flatCount = computed(() => {
  const walk = list =>
    list.reduce((n, item) => n + 1 + (item.children?.length ? walk(item.children) : 0), 0);
  return walk(menuTree.value);
});

const hasChildren = row => !!row.children?.length;

// menuType 沿用前端模板语义：0 显示 / 1 隐藏功能页（不是 0目录/1菜单）。
// 是否目录看 url 有没有值，跟 menuType 是两回事。
const typeText = row => {
  if (!row.url) return "分组目录";
  return row.menuType === 1 ? "隐藏页" : "页面";
};

const load = async () => {
  loading.value = true;
  try {
    const res = await getSystemMenuTree();
    // 后端返回全量树（含停用项），停用的才还能在这里被重新启用
    menuTree.value = Array.isArray(res) ? res : [];
  } finally {
    loading.value = false;
  }
};

/* 表单状态和 findNode 提前声明：parentOptions 这个 computed 会读 form.id、调 findNode。
   computed 虽是惰性求值（模板渲染时它们早已初始化），但把依赖写在前面更稳 ——
   以后若有人改成 setup 期间立即取值，不会踩到暂时性死区（TDZ）。 */
const blankForm = () => ({
  id: null,
  parentId: 0,
  title: "",
  icon: "",
  sortNo: 0,
  visible: 1,
  url: "",
  routeName: "",
});
const form = reactive(blankForm());

const findNode = (list, id) => {
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
};

/* 上级菜单下拉：只列「目录」（url 为空），并带层级缩进。
   编辑时还要排除自己及其所有子孙 —— 把父挂到子下面会成环，
   后端 isSelfOrDescendant() 会挡，前端先过滤掉省一次失败请求。 */
const parentOptions = computed(() => {
  const options = [];
  const excluded = new Set();
  if (form.id) {
    const collect = id => {
      excluded.add(id);
      const node = findNode(menuTree.value, id);
      node?.children?.forEach(c => collect(c.id));
    };
    collect(form.id);
  }
  const walk = (list, depth) => {
    list.forEach(node => {
      if (!excluded.has(node.id) && !node.url) {
        options.push({ id: node.id, label: `${"　".repeat(depth)}${node.title}` });
      }
      if (node.children?.length) walk(node.children, depth + 1);
    });
  };
  walk(menuTree.value, 0);
  return options;
});

/* --------------------------------------------------------------
   启停 / 新建 / 编辑 / 删除
   -------------------------------------------------------------- */
const handleToggle = async (row, val) => {
  togglingId.value = row.id;
  try {
    // 只传 id + visible：MenuSaveDTO 其余字段为 null，
    // 后端 updateById 默认忽略 null，不会覆盖标题、图标、排序。
    await updateSystemMenu({ id: row.id, visible: val });
    ElMessage.success(val === 1 ? "已显示，重新登录后生效" : "已停用，重新登录后生效");
    await load();
  } finally {
    togglingId.value = null;
  }
};

const dialogVisible = ref(false);
const saving = ref(false);
const formRef = ref();
// blankForm / form 已在上面 parentOptions 之前声明，这里不再重复定义

// 同样是 prop + rules 同时有才触发校验
const rules = {
  title: [{ required: true, message: "请输入菜单名称", trigger: "blur" }],
};

const resetForm = () => {
  Object.assign(form, blankForm());
  formRef.value?.clearValidate();
};
const openCreate = (parentId = 0) => {
  resetForm();
  form.parentId = parentId ?? 0;
  dialogVisible.value = true;
};
const openEdit = row => {
  resetForm();
  Object.assign(form, {
    id: row.id,
    parentId: row.parentId ?? 0,
    title: row.title,
    icon: row.icon || "",
    sortNo: row.sortNo ?? 0,
    visible: row.visible ?? 1,
    // 这两个只用于在弹窗里展示「不可修改」，提交时不会带上
    url: row.url || "",
    routeName: row.routeName || "",
  });
  dialogVisible.value = true;
};

const submitForm = async () => {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    // 刻意只提交 5 个字段。url / routeName 是展示用的辅助字段，
    // 后端 MenuSaveDTO 里根本没有它们，多传也不会生效。
    const payload = {
      parentId: form.parentId,
      title: form.title.trim(),
      icon: form.icon || "",
      sortNo: form.sortNo,
      visible: form.visible,
    };
    if (form.id) {
      await updateSystemMenu({ id: form.id, ...payload });
      ElMessage.success("已保存，重新登录后生效");
    } else {
      await createSystemMenu(payload);
      ElMessage.success("分组目录已创建，重新登录后生效");
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
};

const handleDelete = async row => {
  const ok = await ElMessageBox.confirm(
    `确定删除菜单「${row.title}」吗？各角色对该菜单的授权会一并清除。`,
    "提示",
    { type: "warning" }
  ).catch(() => false);
  if (!ok) return;
  await deleteSystemMenu(row.id);
  ElMessage.success("已删除，重新登录后生效");
  await load();
};

onMounted(load);
</script>
