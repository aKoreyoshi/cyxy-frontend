<template>
  <div class="home">
    <!-- 欢迎区 -->
    <div class="welcome-section">
      <div class="welcome-icon">👋</div>
      <h1 class="welcome-title">欢迎使用 V3S Admin</h1>
      <p class="welcome-desc">
        一个开箱即用的 Vue3 中后台管理模板，助你快速搭建企业级应用
      </p>

      <!-- 快捷键提示 -->
      <div class="shortcut-tip" @click="openSearch">
        <el-icon class="shortcut-icon"><Search /></el-icon>
        <span class="shortcut-label">快捷搜索</span>
        <div class="shortcut-keys">
          <template v-if="isMac"> <kbd>⌘</kbd> + <kbd>K</kbd> </template>
          <template v-else> <kbd>Ctrl</kbd> + <kbd>Space</kbd> </template>
        </div>
      </div>

      <div class="welcome-actions">
        <el-button type="primary" @click="openGithub">
          <el-icon class="mr-1"><Link /></el-icon>
          GitHub
        </el-button>
        <el-button @click="openDocs">
          <el-icon class="mr-1"><Document /></el-icon>
          文档
        </el-button>
      </div>
    </div>

    <!-- 技术栈 -->
    <div class="tech-stack">
      <div class="tech-item" v-for="tech in techList" :key="tech.name">
        <span class="tech-icon">{{ tech.icon }}</span>
        <span class="tech-name">{{ tech.name }}</span>
      </div>
    </div>

    <!-- 功能卡片 -->
    <div class="feature-grid">
      <div class="feature-card" v-for="(feature, idx) in features" :key="idx">
        <div class="feature-icon">{{ feature.icon }}</div>
        <div class="feature-title">{{ feature.title }}</div>
        <div class="feature-desc">{{ feature.desc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Link, Document, Search } from "@element-plus/icons-vue";
import { useLayoutStore } from "@/stores/layout.js";
import { onMounted, ref } from "vue";
import { getUser } from "@/api/user";

const msg = ref("");
onMounted(async () => {
  await getUser();
  msg.value = await getUser(); // 拿到的是 data，即 "请求成功。"
  console.log(msg.value);
  // alert(msg.value);
});

const layoutStore = useLayoutStore();
const isMac = /mac/i.test(navigator.userAgent);

// 打开搜索弹窗
const openSearch = () => {
  layoutStore.menuFilterDialogVisible = true;
};

const techList = [
  { icon: "⚡", name: "Vue 3" },
  { icon: "🚀", name: "Vite" },
  { icon: "🎨", name: "Element Plus" },
  { icon: "🍍", name: "Pinia" },
  { icon: "🌊", name: "TailwindCSS" },
  { icon: "📊", name: "ECharts" },
];

const features = [
  {
    icon: "🎯",
    title: "多种布局",
    desc: "侧边菜单 / 顶部菜单 / 混合布局，一键切换",
  },
  { icon: "🌓", title: "暗黑模式", desc: "内置暗黑主题，跟随系统或手动切换" },
  { icon: "🎨", title: "主题定制", desc: "支持自定义主题色，一键换肤" },
  {
    icon: "📦",
    title: "丰富组件",
    desc: "表格 / 搜索 / 图表 / 树等常用组件封装",
  },
  { icon: "🔐", title: "权限管理", desc: "路由级别权限控制，菜单动态渲染" },
  { icon: "⌨️", title: "快捷搜索", desc: "支持拼音 / 首字母快速搜索菜单" },
];

const openGithub = () =>
  window.open("https://github.com/wangyupo/v3s", "_blank");
const openDocs = () =>
  window.open("https://github.com/wangyupo/v3s#readme", "_blank");
</script>

<style lang="scss" scoped>
.home {
  padding: 40px;
  scrollbar-gutter: stable;
  animation: fadeIn 0.5s ease;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-light);
    border-radius: 3px;

    &:hover {
      background: var(--el-border-color);
    }
  }
}

// 欢迎区
.welcome-section {
  text-align: center;
  margin-bottom: 40px;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: wave 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  transform-origin: 70% 70%;
}

.welcome-title {
  margin: 0 0 12px;
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.welcome-desc {
  margin: 0 0 24px;
  font-size: 15px;
  color: var(--el-text-color-secondary);
}

.welcome-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

// 技术栈
.tech-stack {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 40px;
}

.tech-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--el-fill-color-lighter);
  font-size: 13px;
  color: var(--el-text-color-regular);
  transition: all 0.2s;

  &:hover {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    transform: translateY(-2px);
  }
}

.tech-icon {
  font-size: 16px;
}

// 功能卡片
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}

.feature-card {
  padding: 24px;
  border-radius: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid transparent;
  transition: all 0.2s;

  &:hover {
    border-color: var(--el-color-primary-light-7);
    background: var(--el-color-primary-light-9);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  }
}

.feature-icon {
  font-size: 28px;
  margin-bottom: 12px;
}

.feature-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.feature-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

// 快捷键提示
.shortcut-tip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  padding: 10px 20px;
  border-radius: 24px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--el-color-primary-light-8);
    transform: translateY(-2px);
  }
}

.shortcut-icon {
  color: var(--el-color-primary);
}

.shortcut-label {
  font-size: 13px;
  color: var(--el-color-primary);
  font-weight: 500;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 22px;
    padding: 0 6px;
    font-size: 11px;
    font-family: inherit;
    color: var(--el-text-color-primary);
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    box-shadow: 0 1px 0 var(--el-border-color-light);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes wave {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(3deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

// 响应式
@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
