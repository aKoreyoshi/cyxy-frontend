<template>
  <!--
    产品缩略图：统一「有图 / 无图」两种表现
    列表页和详情页共用，保证同一产品在两处看到的东西一致。
  -->
  <span class="product-thumb" :class="[`is-${size}`, { 'is-empty': !src }]">
    <el-image
      v-if="src"
      :src="src"
      :preview-src-list="preview ? [src] : []"
      :preview-teleported="preview"
      fit="cover"
      class="product-thumb__img"
    >
      <template #error>
        <span class="product-thumb__fallback">🖼️</span>
      </template>
    </el-image>
    <span v-else class="product-thumb__fallback">🖼️</span>
  </span>
</template>

<script setup>
defineProps({
  // 图片地址，空字符串/undefined 时显示占位
  src: { type: String, default: "" },
  // 尺寸档位：sm 用于列表行内，lg 用于详情页
  size: { type: String, default: "sm" },
  // 是否允许点击放大预览
  preview: { type: Boolean, default: true },
});
</script>

<script>
export default { name: "ProductThumb" };
</script>

<style lang="scss" scoped>
.product-thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  vertical-align: middle;

  &__img {
    width: 100%;
    height: 100%;
    display: block;
  }

  &__fallback {
    font-size: 15px;
    line-height: 1;
    opacity: 0.55;
  }

  &.is-sm {
    width: 40px;
    height: 40px;
  }

  &.is-lg {
    width: 96px;
    height: 96px;
    border-radius: 10px;
  }

  &.is-empty.is-lg {
    width: 96px;
    height: 96px;
  }
}
</style>
