<template>
  <!-- 个人信息 -->
  <el-dropdown trigger="click" class="h-full">
    <div
      class="avatar flex items-center cursor-pointer flex-shrink-0 px-3 h-full"
      :class="headerToolHoverClasses"
    >
      <el-avatar :size="30" icon="UserFilled" />
      <span class="ml-2">{{ displayName }}</span>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <!-- 所有登录用户都能改自己密码：系统管理菜单只对超管可见，
             另外两个人进不去用户管理页，所以入口必须放在这里 -->
        <el-dropdown-item @click="handleChangePwd">
          <el-icon class="mr-1"><Lock /></el-icon>
          修改密码
        </el-dropdown-item>
        <!-- <el-dropdown-item @click="handleV3s">
          <el-icon class="mr-1"><Link /></el-icon>
          项目地址
        </el-dropdown-item> -->
        <el-dropdown-item divided @click="handleLoginOut">
          <el-icon class="mr-1"><SwitchButton /></el-icon>
          退出登录
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>

  <!-- 修改密码弹窗 -->
  <el-dialog
    v-model="pwdDialogVisible"
    title="修改密码"
    width="420px"
    @closed="resetPwdForm"
  >
    <el-form
      ref="pwdFormRef"
      :model="pwdForm"
      :rules="pwdRules"
      label-width="96px"
    >
      <el-form-item label="原密码" prop="oldPwd">
        <el-input
          v-model="pwdForm.oldPwd"
          type="password"
          show-password
          autocomplete="off"
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPwd">
        <el-input
          v-model="pwdForm.newPwd"
          type="password"
          show-password
          autocomplete="off"
        />
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirmPwd">
        <el-input
          v-model="pwdForm.confirmPwd"
          type="password"
          show-password
          autocomplete="off"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="pwdDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="pwdSaving" @click="submitPwd"
        >确定</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import { Link, Lock, SwitchButton } from "@element-plus/icons-vue";
import { removeAllLoginInfo } from "@/utils/index";
import { useLayout } from "@/hooks/useLayout.js";
import { useUserStore } from "@/stores/user.js";
import { changePassword, logout } from "@/api/user";

const router = useRouter();
const { headerToolHoverClasses } = useLayout();
const userStore = useUserStore();

// 原来这里写死「管理员」。现在显示登录返回的真实姓名，没填就退回账号名。
// ⚠️ 这些信息只用于显示，绝不能拿来判断权限 —— localStorage 用户自己能改，
//    真正的判断每次请求都在后端拦截器里重新查库。
const displayName = computed(
  () => userStore.userInfo?.realName || userStore.userInfo?.username || "用户"
);

const pwdDialogVisible = ref(false);
const pwdSaving = ref(false);
const pwdFormRef = ref();
const pwdForm = reactive({ oldPwd: "", newPwd: "", confirmPwd: "" });

// el-form 校验必须 prop + rules 同时有，缺一个就不会触发（V3S 模板的老要求）
const pwdRules = {
  oldPwd: [{ required: true, message: "请输入原密码", trigger: "blur" }],
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
  pwdForm.oldPwd = "";
  pwdForm.newPwd = "";
  pwdForm.confirmPwd = "";
  pwdFormRef.value?.clearValidate();
};

const handleChangePwd = () => {
  resetPwdForm();
  pwdDialogVisible.value = true;
};

const submitPwd = async () => {
  // validate() 校验不通过会 reject，接住它别让控制台冒未捕获异常
  const valid = await pwdFormRef.value.validate().catch(() => false);
  if (!valid) return;

  pwdSaving.value = true;
  try {
    await changePassword({ oldPwd: pwdForm.oldPwd, newPwd: pwdForm.newPwd });
    ElMessage.success("密码已修改，请重新登录");
    pwdDialogVisible.value = false;
    // 后端改完密码会清空令牌让所有会话失效，前端也要清干净再跳登录页
    removeAllLoginInfo();
    router.replace({ path: "/login" });
  } finally {
    pwdSaving.value = false;
  }
};

// 跳转项目地址
const handleV3s = () => {
  window.open("https://github.com/wangyupo/v3s", "_blank");
};

// 退出登录
const handleLoginOut = () => {
  ElMessageBox.confirm("确认退出系统吗?", "提示", {
    type: "warning",
  }).then(async () => {
    // 先通知服务端清令牌。接口即使挂了也要能正常退出，
    // 所以失败只忽略、本地信息照常清，不阻塞用户。
    try {
      await logout();
    } catch (e) {
      // 忽略：服务端的令牌会自然过期
    }
    router.replace({ path: "/login" });
    removeAllLoginInfo();
    ElMessage.success("登出成功！");
  });
};
</script>

<style lang="scss" scoped>
.avatar {
  height: 100%;
}
</style>
