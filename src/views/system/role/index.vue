<template>
  <div class="sys-page">
    <div class="sys-head">
      <div>
        <h1 class="sys-title">角色管理</h1>
        <p class="sys-note">
          自定义角色并逐个菜单设置「可编辑 / 只读」。只读由后端拦截写接口，不是把按钮藏起来，绕过页面也改不了数据。
        </p>
      </div>
      <div class="sys-head__side">
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <el-button size="small" type="primary" @click="openCreate">新建角色</el-button>
      </div>
    </div>

    <div class="sys-panel">
      <div class="sys-toolbar">
        <span class="sys-count">共 <strong>{{ rows.length }}</strong> 个角色</span>
        <div class="sys-toolbar__spacer"></div>
        <span class="sys-tree-row__hint">内置超管角色永远全放行，不参与菜单勾选</span>
      </div>

      <RhTable :table-data="tableData" :loading="loading" border>
        <template #roleName="{ scope }">
          {{ scope.row.roleName }}
          <span v-if="scope.row.isBuiltin === 1" class="sys-chip sys-chip--accent">内置</span>
        </template>
        <template #status="{ scope }">
          <i
            class="sys-dot"
            :style="{ backgroundColor: scope.row.status === 1 ? 'var(--sg-positive)' : 'var(--sg-faint)' }"
          ></i>
          {{ scope.row.status === 1 ? "启用" : "停用" }}
        </template>
        <template #remark="{ scope }">
          {{ scope.row.remark || "--" }}
        </template>
        <template #operate="{ scope }">
          <span class="sys-actions">
            <!-- 内置超管只能看，不能改：后端 SysRoleService 也会拒绝任何修改 -->
            <el-button link type="primary" size="small" @click="openEdit(scope.row)">
              {{ scope.row.isBuiltin === 1 ? "查看" : "编辑" }}
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="scope.row.isBuiltin === 1"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </span>
        </template>
        <template #empty>
          <div class="sys-empty">还没有自定义角色，点右上角「新建角色」创建。</div>
        </template>
      </RhTable>
    </div>

    <!-- 新建 / 编辑弹窗。菜单勾选和基本信息一次提交，后端一个事务写完，
         不会出现「角色建好了但权限没存上」的半截状态。 -->
    <el-dialog
      v-model="dialogVisible"
      :title="readonly ? '查看内置角色' : form.id ? '编辑角色' : '新建角色'"
      width="780px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <div style="display: flex; gap: 16px">
          <el-form-item label="角色编码" prop="roleCode" style="flex: 1">
            <!-- roleCode 是业务稳定标识，后端 update 不接受修改，编辑时直接锁死 -->
            <el-input v-model="form.roleCode" :disabled="!!form.id || readonly" placeholder="如 OPERATOR" />
          </el-form-item>
          <el-form-item label="角色名称" prop="roleName" style="flex: 1">
            <el-input v-model="form.roleName" :disabled="readonly" placeholder="如 运营" />
          </el-form-item>
        </div>
        <div style="display: flex; gap: 16px; align-items: center">
          <el-form-item label="排序号" style="flex: 1">
            <el-input-number v-model="form.sortNo" :min="0" :max="9999" :disabled="readonly" />
          </el-form-item>
          <el-form-item label="状态" style="flex: 1">
            <el-switch
              v-model="form.status"
              :active-value="1"
              :inactive-value="0"
              :disabled="readonly"
            />
            <span class="sys-tree-row__hint" style="margin-left: 10px">停用后该角色的用户只剩认证接口可用</span>
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="form.remark" :disabled="readonly" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="菜单权限">
          <div style="width: 100%">
            <div class="sys-tree-tools">
              <el-button size="small" link type="primary" :disabled="readonly" @click="checkAll">全选</el-button>
              <el-button size="small" link :disabled="readonly" @click="uncheckAll">全不选</el-button>
              <span class="sys-tree-row__hint">
                勾选子菜单即可，上级目录后端会自动补齐；不勾 = 登录后看不到该菜单
              </span>
            </div>

            <!-- check-strictly：父子不联动。
                 后端建树本来就会补祖先目录，联动反而会让管理员误以为必须勾父级，
                 也会把「只想给子菜单只读」变成一串不必要的授权行。 -->
            <el-tree
              ref="treeRef"
              class="sys-tree-box"
              :data="menuTree"
              node-key="menuId"
              :props="{ label: 'title', children: 'children' }"
              show-checkbox
              check-strictly
              default-expand-all
              :expand-on-click-node="false"
              :default-checked-keys="initialKeys"
              @check-change="syncChecked"
            >
              <template #default="{ data }">
                <div class="sys-tree-row" @click.stop>
                  <span class="sys-tree-row__title">{{ data.title }}</span>
                  <span v-if="data.menuType === 1" class="sys-chip">隐藏页</span>

                  <!-- permMap 存每个菜单的读写标记。
                       三种情况禁用下拉：只读展示页（没有写接口，设了也没变化）、
                       没勾这个菜单、或者正在查看内置超管角色。 -->
                  <el-select
                    v-model="permMap[data.menuId]"
                    size="small"
                    style="width: 112px"
                    :disabled="readonly || !checkedKeys.includes(data.menuId) || !data.hasWriteApi"
                  >
                    <el-option label="可编辑" :value="1" />
                    <el-option label="只读" :value="0" />
                  </el-select>
                  <span v-if="!data.hasWriteApi" class="sys-tree-row__hint">无写操作</span>
                  <span v-else-if="!checkedKeys.includes(data.menuId)" class="sys-tree-row__hint">未勾选</span>
                </div>
              </template>
            </el-tree>

            <p class="sys-form-tip">
              「只读」只拦该菜单登记的写接口（如产品增改删、保存测算）。
              利润试算 <code>/api/profit/calc</code> 是 POST 但不写库，只读角色照样能算。
            </p>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="small" @click="dialogVisible = false">{{ readonly ? "关闭" : "取消" }}</el-button>
        <el-button
          v-if="!readonly"
          size="small"
          type="primary"
          :loading="saving"
          @click="submitForm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { arr2tree } from "@/utils/index.js";
import {
  getSystemRoles,
  getSystemRoleDetail,
  getSystemRoleMenuOptions,
  createSystemRole,
  updateSystemRole,
  deleteSystemRole,
} from "@/api/system.js";
import "../system.css";

/* --------------------------------------------------------------
   列表
   -------------------------------------------------------------- */
const rows = ref([]);
const loading = ref(false);

const tableData = computed(() => ({
  columns: [
    { type: "index", label: "序号", width: 70, align: "center" },
    { prop: "roleCode", label: "角色编码", minWidth: 160 },
    { prop: "roleName", label: "角色名称", minWidth: 160 },
    { prop: "sortNo", label: "排序", width: 90, align: "center" },
    { prop: "status", label: "状态", width: 100, align: "center" },
    { prop: "remark", label: "备注", minWidth: 220 },
    { prop: "operate", label: "操作", width: 150, align: "center", fixed: "right" },
  ],
  data: rows.value,
}));

const load = async () => {
  loading.value = true;
  try {
    const res = await getSystemRoles();
    rows.value = Array.isArray(res) ? res : [];
  } finally {
    loading.value = false;
  }
};

/* --------------------------------------------------------------
   弹窗表单
   -------------------------------------------------------------- */
const dialogVisible = ref(false);
const saving = ref(false);
const readonly = ref(false);
const formRef = ref();
const blankForm = () => ({
  id: null,
  roleCode: "",
  roleName: "",
  sortNo: 0,
  status: 1,
  remark: "",
});
const form = reactive(blankForm());

// el-form 校验必须 prop + rules 同时有（V3S 模板的老要求）
const rules = {
  roleCode: [{ required: true, message: "请输入角色编码", trigger: "blur" }],
  roleName: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
};

// 菜单树与勾选状态。后端返回的是平铺 List，用项目自带的 arr2tree 建树；
// permMap 用普通对象而不是 Map，是为了让模板里 v-model="permMap[data.menuId]" 直接可写。
const treeRef = ref();
const menuTree = ref([]);
const initialKeys = ref([]);
const checkedKeys = ref([]);
const permMap = reactive({});

const syncChecked = () => {
  // false = 不只要叶子。check-strictly 下父子不联动，勾中的目录也要算进去。
  checkedKeys.value = treeRef.value?.getCheckedKeys(false) ?? [];
};

/**
 * 把后端返回的菜单项（新建时来自 menu-options，编辑时来自 detail.menus）
 * 铺成树，并恢复勾选与读写标记。两处数据结构完全一样，所以能复用同一个函数。
 */
const fillMenus = items => {
  Object.keys(permMap).forEach(k => delete permMap[k]);
  const checked = [];
  (items || []).forEach(m => {
    // 没勾的菜单默认给「可编辑」，这样管理员勾上后不用再动一次下拉；
    // 无写接口的菜单强制 1，因为它们的只读开关本来就是置灰的。
    permMap[m.menuId] =
      m.hasWriteApi && m.permType !== null && m.permType !== undefined ? m.permType : 1;
    if (m.permType !== null && m.permType !== undefined) checked.push(m.menuId);
  });

  menuTree.value = arr2tree(items || [], {
    id: "menuId",
    parentId: "parentId",
    children: "children",
  });
  initialKeys.value = checked;

  // el-tree 要等 DOM 渲染出来才能 setCheckedKeys，所以放到 nextTick 里；
  // default-checked-keys 只在组件初始化时生效一次，编辑不同角色必须手动重设。
  nextTick(() => {
    treeRef.value?.setCheckedKeys(checked, false);
    syncChecked();
  });
};

const resetForm = () => {
  Object.assign(form, blankForm());
  readonly.value = false;
  menuTree.value = [];
  initialKeys.value = [];
  checkedKeys.value = [];
  Object.keys(permMap).forEach(k => delete permMap[k]);
  formRef.value?.clearValidate();
};

const openCreate = async () => {
  resetForm();
  dialogVisible.value = true;
  // 新建时角色还不存在，detail 接口要 id 拿不到，改调空白模板接口
  const items = await getSystemRoleMenuOptions();
  fillMenus(items);
};

const openEdit = async row => {
  resetForm();
  dialogVisible.value = true;
  const detail = await getSystemRoleDetail(row.id);
  Object.assign(form, {
    id: detail.id,
    roleCode: detail.roleCode,
    roleName: detail.roleName,
    sortNo: detail.sortNo ?? 0,
    status: detail.status ?? 1,
    remark: detail.remark || "",
  });
  // 内置超管：整页只读。它不写 sys_role_menu，拦截器直接全放行，
  // 改它的权限既没意义也危险，所以后端直接拒绝，前端连确定按钮都不给。
  readonly.value = detail.isBuiltin === 1;
  fillMenus(detail.menus);
};

const checkAll = () => {
  const keys = [];
  const walk = list =>
    list.forEach(n => {
      keys.push(n.menuId);
      if (n.children?.length) walk(n.children);
    });
  walk(menuTree.value);
  treeRef.value?.setCheckedKeys(keys, false);
  syncChecked();
};
const uncheckAll = () => {
  treeRef.value?.setCheckedKeys([], false);
  syncChecked();
};

const submitForm = async () => {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    // 只提交勾中的菜单；没出现在列表里的 = 该角色看不到、也用不了。
    // permType 用 permMap 里的值，取不到时按 1（可编辑）兜底。
    const menus = (treeRef.value?.getCheckedKeys(false) ?? []).map(menuId => ({
      menuId,
      permType: permMap[menuId] ?? 1,
    }));
    const payload = {
      roleCode: form.roleCode.trim(),
      roleName: form.roleName.trim(),
      sortNo: form.sortNo,
      status: form.status,
      remark: form.remark.trim(),
      menus,
    };
    if (form.id) {
      await updateSystemRole({ id: form.id, ...payload });
      ElMessage.success("角色已更新，所属用户下次请求即生效");
    } else {
      await createSystemRole(payload);
      ElMessage.success("角色已创建");
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
};

const handleDelete = async row => {
  const ok = await ElMessageBox.confirm(
    `确定删除角色「${row.roleName}」吗？若还有用户使用该角色，需先改派。`,
    "提示",
    { type: "warning" }
  ).catch(() => false);
  if (!ok) return;
  await deleteSystemRole(row.id);
  ElMessage.success("已删除");
  await load();
};

onMounted(load);
</script>
