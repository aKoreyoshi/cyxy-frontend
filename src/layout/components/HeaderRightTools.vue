<template>
  <!-- 顶栏右侧工具栏（用户、通知等） -->
  <div class="flex items-center justify-center h-full">
    <!-- 更新记录：按需求放在搜索图标左边。
         这个文件被 4 种布局（侧边/通栏/顶部/混合导航）共用，
         所以只在这里加一次，切换布局后按钮也还在。 -->
    <Changelog />
    <!-- 菜单搜索 -->
    <MenuFilter />
    <!-- 网页全屏 -->
    <FullScreen />
    <!-- 多语言切换 -->
    <SwitchLanguage />
    <!-- 用户模块 -->
    <Avatar />
    <!-- 自定义配置 -->
    <Customize />
  </div>
</template>

<script setup>
import Avatar from "./Avatar.vue";
import SwitchLanguage from "./SwitchLanguage.vue";
import MenuFilter from "./MenuFilter/Index.vue";
import FullScreen from "./FullScreen.vue";
import Customize from "./Customize.vue";
import Changelog from "./Changelog.vue";
</script>

<style lang="scss" scoped></style>
