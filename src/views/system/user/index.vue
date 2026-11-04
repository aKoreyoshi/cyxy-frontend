<template>
  <div class="sys-page">
    <!-- 页头：说明里写清「只有超管能进」，避免另外两个人疑惑入口在哪 -->
    <div class="sys-head">
      <div>
        <h1 class="sys-title">用户管理</h1>
        <p class="sys-note">
          创建账号、分配角色、停用或重置密码。本页仅超级管理员可见，改完立即生效。
        </p>
      </div>
      <div class="sys-head__side">
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <el-button size="small" type="primary" @click="openCreate">新建用户</el-button>
      </div>
    </div>

    <div class="sys-panel">
      <div class="sys-toolbar">
        <!-- 关键词模糊匹配账号 / 姓名，回车和清空都直接重查，不用再点一次查询 -->
        <el-input
          v-model="keyword"
          placeholder="搜索账号或姓名"
          clearable
          style="width: 240px"
          @keyup.enter="load"
          @clear="load"
        />
        <el-button size="small" @click="load">查询</el-button>
        <el-button size="small" link @click="resetSearch">重置</el-button>
        <div class="sys-toolbar__spacer"></div>
        <span class="sys-count">共 <strong>{{ rows.length }}</strong> 个账号</span>
      </div>

      <!-- RhTable 收 { columns, data }。这里不传 pages，组件就不会渲染分页器：
           3 个人用，本地一次列完比翻页更顺手。 -->
      <RhTable :table-data="tableData" :loading="loading" border>
        <template #realName="{ scope }">
          {{ scope.row.realName || "--" }}
        </template>
        <template #roleName="{ scope }">
          <span v-if="scope.row.roleName">
            {{ scope.row.roleName }}
            <span v-if="isBuiltinRole(scope.row.roleId)" class="sys-chip sys-chip--accent">超管</span>
          </span>
          <span v-else class="sys-chip">未分配</span>
        </template>
        <template #status="{ scope }">
          <i
            class="sys-dot"
            :style="{ backgroundColor: scope.row.status === 1 ? 'var(--sg-positive)' : 'var(--sg-faint)' }"
          ></i>
          {{ scope.row.status === 1 ? "启用" : "停用" }}
        </template>
        <template #lastLoginTime="{ scope }">
          {{ fmtTime(scope.row.lastLoginTime) }}
        </template>
        <template #createdTime="{ scope }">
          {{ fmtTime(scope.row.createdTime) }}
        </template>
        <template #remark="{ scope }">
          {{ scope.row.remark || "--" }}
        </template>
        <template #operate="{ scope }">
          <span class="sys-actions">
            <el-button link type="primary" size="small" @click="openEdit(scope.row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="openReset(scope.row)">重置密码</el-button>
            <!-- 删自己、删内置超管账号后端都会拒绝，前端先置灰省一次无谓请求 -->
            <el-button
              link
              type="danger"
              size="small"
              :disabled="scope.row.id === currentUserId || isBuiltinRole(scope.row.roleId)"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </span>
        </template>
        <template #empty>
          <div class="sys-empty">还没有账号，点右上角「新建用户」添加。</div>
        </template>
      </RhTable>
    </div>

    <!-- 新建 / 编辑弹窗。同一个表单靠 form.id 区分两种动作，
         后端 SysUserSaveDTO 也是「id 为空 = 新建」这一种约定。 -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑用户' : '新建用户'"
      width="520px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="登录账号" prop="username">
          <!-- 后端不允许改账号：会牵动唯一索引和已登录会话，3 个人用没必要，
               所以编辑时直接锁死，避免填了却被静默忽略。 -->
          <el-input v-model="form.username" :disabled="!!form.id" placeholder="如 zhangsan" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="form.id ? '留空表示不修改密码' : '至少 6 位'"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="显示在右上角" />
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select
            v-model="form.roleId"
            placeholder="请选择角色"
            style="width: 100%"
            :disabled="builtinAccount"
          >
            <el-option
              v-for="r in roles"
              :key="r.id"
              :label="r.status === 1 ? r.roleName : `${r.roleName}（已停用）`"
              :value="r.id"
              :disabled="r.status !== 1"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            :disabled="builtinAccount"
          />
          <span class="sys-form-tip" style="margin: 0 0 0 12px">
            {{ form.status === 1 ? "启用，可正常登录" : "停用后立即踢下线" }}
          </span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
        <p v-if="builtinAccount" class="sys-form-tip">
          内置超管账号不能改角色或停用 —— 后端也会挡这一条，防止把自己锁在系统外面。
        </p>
      </el-form>
      <template #footer>
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码：超管不需要知道对方旧密码（那个场景走右上角「修改密码」），
         后端重置后会清空对方令牌，所有已登录会话立刻失效。 -->
    <el-dialog v-model="pwdVisible" title="重置密码" width="420px" @closed="resetPwdForm">
      <p class="sys-form-tip" style="margin-top: 0">
        正在重置 <strong>{{ pwdTarget?.username }}</strong> 的密码，保存后对方需要重新登录。
      </p>
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="96px">
        <el-form-item label="新密码" prop="newPwd">
          <el-input v-model="pwdForm.newPwd" type="password" show-password autocomplete="off" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPwd">
          <el-input v-model="pwdForm.confirmPwd" type="password" show-password autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="pwdVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="pwdSaving" @click="submitReset">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/stores/user.js";
import {
  getSystemUsers,
  getSystemRoles,
  createSystemUser,
  updateSystemUser,
  deleteSystemUser,
  resetUserPassword,
} from "@/api/system.js";
import "../system.css";

/* --------------------------------------------------------------
   数据
   -------------------------------------------------------------- */
const rows = ref([]);
const roles = ref([]);
const loading = ref(false);
const keyword = ref("");

// 在 setup 顶层取一次 store，不要在 computed 里反复调 useUserStore()。
// 当前登录用户 id 只用来把「删除自己」置灰，不当权限依据：
// localStorage 用户自己能改，真正的判断每次请求都在后端拦截器里重新查库。
const userStore = useUserStore();
const currentUserId = computed(() => userStore.userInfo?.id ?? null);

// 内置超管角色的 id 集合。SysUserVO 不带 isBuiltin 字段，
// 但角色列表 RoleVO 带，前端算一次就够，不用为此改后端 VO。
const builtinRoleIds = computed(() =>
  roles.value.filter(r => r.isBuiltin === 1).map(r => r.id)
);
const isBuiltinRole = roleId => builtinRoleIds.value.includes(roleId);

/* el-table 列配置。type: "index" 是 RhTable 内置的序号列；
   prop 同时是自定义插槽的名字（#operate / #status 等）。 */
const tableData = computed(() => ({
  columns: [
    { type: "index", label: "序号", width: 70, align: "center" },
    { prop: "username", label: "登录账号", minWidth: 140 },
    { prop: "realName", label: "姓名", minWidth: 120 },
    { prop: "roleName", label: "角色", minWidth: 150 },
    { prop: "status", label: "状态", width: 100, align: "center" },
    { prop: "lastLoginTime", label: "最后登录", minWidth: 165 },
    { prop: "createdTime", label: "创建时间", minWidth: 165 },
    { prop: "remark", label: "备注", minWidth: 160 },
    { prop: "operate", label: "操作", width: 210, align: "center", fixed: "right" },
  ],
  data: rows.value,
}));

// 后端 LocalDateTime 序列化成 "2026-11-05T00:20:00"，展示时换成人能读的形式
const fmtTime = v => (v ? String(v).replace("T", " ").slice(0, 16) : "--");

/* 列表和角色下拉一起拉。角色下拉必须等接口回来才有值，
   所以不能只在 onMounted 里跑一次就不管，新建弹窗打开前也要保证它在。 */
const load = async () => {
  loading.value = true;
  try {
    const [users, roleList] = await Promise.all([
      getSystemUsers(keyword.value.trim()),
      getSystemRoles(),
    ]);
    rows.value = Array.isArray(users) ? users : [];
    roles.value = Array.isArray(roleList) ? roleList : [];
  } finally {
    loading.value = false;
  }
};
const resetSearch = () => {
  keyword.value = "";
  load();
};

/* --------------------------------------------------------------
   新建 / 编辑
   -------------------------------------------------------------- */
const dialogVisible = ref(false);
const saving = ref(false);
const formRef = ref();
const blankForm = () => ({
  id: null,
  username: "",
  password: "",
  realName: "",
  roleId: null,
  status: 1,
  remark: "",
});
const form = reactive(blankForm());

// 内置超管账号：角色和状态都不许动（后端 SysUserService 也会再挡一次）
const builtinAccount = computed(
  () => !!form.id && !!form.roleId && isBuiltinRole(form.roleId)
);

// el-form 校验必须 prop + rules 同时有，缺一个就不触发（V3S 模板的老要求）。
// 密码规则用自定义 validator：新建时必填，编辑时留空合法，填了才校验长度。
const rules = {
  username: [{ required: true, message: "请输入登录账号", trigger: "blur" }],
  password: [
    {
      validator: (rule, value, callback) => {
        if (!form.id && !value) return callback(new Error("请输入初始密码"));
        if (value && value.length < 6) return callback(new Error("密码至少 6 位"));
        callback();
      },
      trigger: "blur",
    },
  ],
  roleId: [{ required: true, message: "请选择角色", trigger: "change" }],
};

const resetForm = () => {
  Object.assign(form, blankForm());
  formRef.value?.clearValidate();
};

const openCreate = () => {
  resetForm();
  dialogVisible.value = true;
};

const openEdit = row => {
  resetForm();
  Object.assign(form, {
    id: row.id,
    username: row.username,
    password: "", // 编辑时留空 = 不改密码；也绝不把旧密码回填到输入框
    realName: row.realName || "",
    roleId: row.roleId ?? null,
    status: row.status ?? 1,
    remark: row.remark || "",
  });
  dialogVisible.value = true;
};

const submitForm = async () => {
  // validate() 失败会 reject，接住它，别在控制台留未捕获异常
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    const payload = {
      username: form.username.trim(),
      password: form.password,
      realName: form.realName.trim(),
      roleId: form.roleId,
      status: form.status,
      remark: form.remark.trim(),
    };
    if (form.id) {
      await updateSystemUser({ id: form.id, ...payload });
      ElMessage.success("已保存");
    } else {
      await createSystemUser(payload);
      ElMessage.success("用户已创建");
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
};

const handleDelete = async row => {
  const ok = await ElMessageBox.confirm(
    `确定删除账号「${row.username}」吗？删除后该账号立即无法登录。`,
    "提示",
    { type: "warning" }
  ).catch(() => false);
  if (!ok) return;
  await deleteSystemUser(row.id);
  ElMessage.success("已删除");
  await load();
};

/* --------------------------------------------------------------
   重置密码
   -------------------------------------------------------------- */
const pwdVisible = ref(false);
const pwdSaving = ref(false);
const pwdFormRef = ref();
const pwdTarget = ref(null);
const pwdForm = reactive({ newPwd: "", confirmPwd: "" });
const pwdRules = {
  newPwd: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, message: "新密码至少 6 位", trigger: "blur" },
  ],
  confirmPwd: [
    { required: true, message: "请再次输入新密码", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (value !== pwdForm.newPwd) callback(new Error("两次输入不一致"));
        else callback();
      },
      trigger: "blur",
    },
  ],
};

const resetPwdForm = () => {
  pwdForm.newPwd = "";
  pwdForm.confirmPwd = "";
  pwdFormRef.value?.clearValidate();
};
const openReset = row => {
  resetPwdForm();
  pwdTarget.value = row;
  pwdVisible.value = true;
};
const submitReset = async () => {
  const valid = await pwdFormRef.value.validate().catch(() => false);
  if (!valid) return;
  pwdSaving.value = true;
  try {
    // 字段名是 userId / newPwd，对应后端 ResetPwdDTO
    await resetUserPassword({ userId: pwdTarget.value.id, newPwd: pwdForm.newPwd });
    ElMessage.success("密码已重置，对方需重新登录");
    pwdVisible.value = false;
  } finally {
    pwdSaving.value = false;
  }
};

onMounted(load);
</script>
