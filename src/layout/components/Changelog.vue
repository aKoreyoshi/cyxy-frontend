<template>
  <!-- 更新记录：顶栏图标按钮 + 右侧抽屉 -->
  <el-tooltip effect="dark" content="更新记录" placement="bottom" :show-after="250">
    <!-- 结构和 MenuFilter / Customize 保持一致：
         外层 div 负责点击区与 hover 背景（headerToolHoverClasses 会按布局自动配色），
         所以换布局、切暗色模式都不会出现「按钮和旁边不是一个色」。 -->
    <div
      class="cl-trigger flex items-center px-3 h-full cursor-pointer"
      :class="headerToolHoverClasses"
      @click="openDrawer"
    >
      <!-- ⚠️ 这里必须让 el-icon 直接做 flex 子项，和 MenuFilter / FullScreen 的结构完全一致。
           之前用 el-badge 包了一层，它内部是 inline-block + 匿名行盒，
           基线对齐会多出几像素空隙，图标就跟旁边工具不在同一水平线了。
           红点改成绝对定位的 span，完全不参与布局，既对齐又能保留未读提示。 -->
      <!-- 图标直接来自 @element-plus/icons-vue：顶栏其它工具都是这么引的，
           不必去动 iconfont.css（那套原生只有 8 个图标，新增要写 CSS mask + :before）。 -->
      <el-icon size="20"><Bell /></el-icon>
      <span v-if="hasUnread" class="cl-dot" />
    </div>
  </el-tooltip>

  <!-- 位置和「个性化配置」抽屉一致：右侧滑出、挂到 body、默认不渲染。
       append-to-body 必须留着，否则抽屉会被顶栏的 overflow / z-index 裁掉。 -->
  <el-drawer
    v-model="drawerVisible"
    direction="rtl"
    append-to-body
    :size="440"
    @open="markAsRead"
  >
    <!-- el-drawer 的 title 属性只能放纯文字，这里要同时显示「当前版本」，
         所以用 header 插槽自定义标题栏。 -->
    <template #header>
      <div class="cl-header">
        <span class="cl-header__title">更新记录</span>
        <span class="cl-header__version">当前版本 v{{ currentVersion }}</span>
      </div>
    </template>

    <div class="cl-body">
      <!-- 数组本身已按「新 → 旧」排好，直接顺序渲染即可，不需要再排序 -->
      <div v-for="(release, index) in releases" :key="release.version" class="cl-card">
        <div class="cl-card__head">
          <div class="cl-card__title">
            <span class="cl-card__version">版本 {{ release.version }}</span>
            <!-- 只给第一条打「当前」标：第一条按发版约定就是当前产品版本 -->
            <el-tag v-if="index === 0" size="small" effect="plain" type="primary">
              当前
            </el-tag>
          </div>
          <span class="cl-card__date">{{ release.date }}</span>
        </div>
        <!-- 用 ol 而不是手写「1. 2. 3.」：截图里的编号由浏览器自动生成，
             换行时文字会自动对齐到编号后面，不用自己算缩进。 -->
        <ol class="cl-list">
          <li v-for="(item, i) in release.items" :key="i">{{ item }}</li>
        </ol>
      </div>
      <div class="cl-end">— 已显示全部版本 —</div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref } from "vue";
import { Bell } from "@element-plus/icons-vue";
import { useLayout } from "@/hooks/useLayout.js";
import { getLocalStorage, setLocalStorage } from "@/utils/index.js";
import { CHANGELOG, CURRENT_VERSION } from "./changelog.js";

const { headerToolHoverClasses } = useLayout();

const releases = CHANGELOG;
const currentVersion = CURRENT_VERSION;

// 抽屉开合状态放在组件内就够了：只有这个按钮需要控制它，没有跨组件通信。
// 项目里 Customize.vue 也是这么做的；只有 MenuFilter 那种要跟弹框通信的才进 Pinia。
const drawerVisible = ref(false);

// 「有没有新版本没看过」用 localStorage 记用户上次打开面板时的版本号。
// 为什么不用 Pinia / 后端：这是每个浏览器各自的阅读状态，跟账号、权限都无关。
// 为什么直接比字符串而不是 compareVersions：这里判断的是「这次的记录看没看过」，
// 不是「谁新谁旧」，产品版本号任何变化（升级、回退）都值得重新提醒一次。
// 特别注意：这里用的是 changelog 里的产品版本，不是 __APP_VERSION__（构建号），
// 否则 npm run build 每次自动 +1 都会让用户看到一个莫名其妙的红点。
const LAST_SEEN_KEY = "changelog_last_seen_version";
const hasUnread = ref(getLocalStorage(LAST_SEEN_KEY) !== CURRENT_VERSION);

const openDrawer = () => {
  drawerVisible.value = true;
};

// 绑 @open 而不是 openDrawer 里写：无论用哪种方式打开抽屉都算已读。
// 注意 App.vue 检测到「构建版本」变化会清空 localStorage 并强制重新登录，
// 这个键也会被一起清掉，所以每次新部署后红点会亮一次 —— 点开即消，
// 属于正常的「有更新可看」提示，不是 bug。
const markAsRead = () => {
  setLocalStorage(LAST_SEEN_KEY, CURRENT_VERSION);
  hasUnread.value = false;
};
</script>

<style lang="scss" scoped>
/* 颜色一律用 --el-* 变量：项目支持暗色模式 / 灰色模式，
   写死 #fff 会让夜间模式下冒出一块刺眼的白卡片。 */

.cl-trigger {
  position: relative;
}

/* 未读小红点：绝对定位，不参与 flex 布局，所以不会挤动图标位置。
   外层 div 是 px-3（左右各 12px），图标宽 20px，
   right:8px 让圆点刚好跨在图标右上角；margin-top 把它抬到图标上沿。 */
.cl-dot {
  position: absolute;
  top: 50%;
  right: 8px;
  width: 8px;
  height: 8px;
  margin-top: -12px;
  border-radius: 50%;
  background: var(--el-color-danger);
  /* 描一圈页面底色，暗色模式下红点才不会和铃铛图标糊在一起 */
  box-shadow: 0 0 0 2px var(--el-bg-color);
}

.cl-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;

  &__title {
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__version {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

/* 抽屉自带 body/header 内边距，这里清零后由内容区自己控制，
   避免两层 padding 叠加把卡片挤窄。:deep 是因为这两层是 Element Plus 的内部 DOM。 */
:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-drawer__body) {
  padding: 0;
}

.cl-body {
  min-height: 100%;
  padding: 16px 16px 8px;
  background: var(--el-fill-color-light);
}

.cl-card {
  padding: 16px 18px;
  margin-bottom: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__version {
    font-size: 15px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__date {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.cl-list {
  margin: 12px 0 0;
  padding-left: 20px;
  /* Tailwind 的 preflight 会把 ol / ul 的 list-style 清成 none、padding 清成 0，
     只写 padding-left 是不够的，必须把编号样式显式写回来，
     否则展示出来就是一堆没有 1. 2. 3. 的裸文本。 */
  list-style-type: decimal;
  list-style-position: outside;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);

  li {
    padding-left: 2px;

    & + li {
      margin-top: 4px;
    }
  }
}

.cl-end {
  padding: 8px 0 4px;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
