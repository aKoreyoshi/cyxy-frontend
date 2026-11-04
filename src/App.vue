<template>
  <el-config-provider :locale="locale">
    <router-view />
  </el-config-provider>

  <!-- 页面刷新遮罩 -->
  <teleport to="#topSlot">
    <div v-if="isReloadMask" class="reload-mask">
      <div id="top-loader"></div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { useLayout } from "@/hooks/useLayout.js";
import { setLocalStorage, getLocalStorage, clearStorageAndCookies, compareVersions } from "@/utils/index.js";
import zhCn from "element-plus/dist/locale/zh-cn.mjs";
import en from "element-plus/dist/locale/en.mjs";

const MASK_DELAY = 1000; // 遮罩延迟隐藏时间（ms）
const { isZh, isGray, toggleGray } = useLayout();
const locale = computed(() => (isZh.value ? zhCn : en)); // 国际化
const isReloadMask = ref(true); // 页面刷新遮罩

// 全站置灰
watch(isGray, toggleGray, { immediate: true });

onMounted(() => {
  setTimeout(() => {
    isReloadMask.value = false;
  }, MASK_DELAY);
});

// 版本检测：只在「确实检测到版本变化」时提示，避免退出登录 / 清缓存误报
checkVersion();

function checkVersion() {
  const cachedVersion = getLocalStorage("version");

  // 旧逻辑把「没有版本记录」也算成新版本：compareVersions(v1, "") 会返回 1，
  // 条件里又带了 !cachedVersion，于是首次访问、手动清空缓存、退出登录后
  // version 被清掉再回到登录页，都会弹「检测到新版本，请重新登录！」，
  // 还会再清一次登录态。这些其实只是「本地还没建版本档案」，不是版本更新。
  // 所以这里要求 cachedVersion 必须存在，且和当前构建版本不一致，才算更新。
  const isVersionChanged =
    !!cachedVersion && compareVersions(__APP_VERSION__, cachedVersion) !== 0;

  if (isVersionChanged) {
    ElMessage.info("检测到新版本，请重新登录！");
    // 版本真的变了才清登录态：老缓存里的菜单树 / 权限结构可能和后端对不上，
    // 强制重新登录能拿一份最新的菜单。注意清完要紧接着把版本写回去。
    clearStorageAndCookies();
  }

  // 无论「首次建档」「清缓存后重建」还是「版本升级」，都记录当前版本。
  // 必须放在 clearStorageAndCookies() 之后，否则刚写的值会被一起清掉。
  setLocalStorage("version", __APP_VERSION__);

  // 控制台打印当前版本号
  console.log(`%c v${__APP_VERSION__} `, "background:#409eff;color:#fff;border-radius:3px;");
}
</script>

<style lang="scss" scoped>
.reload-mask {
  position: fixed;
  inset: 0;
  z-index: 10;
  background-color: var(--el-bg-color);
}
</style>
