<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'

const route = useRoute()
const showNav = computed(() => route.name !== 'Setup')
</script>

<template>
  <div class="app-wrapper">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <BottomNav v-if="showNav" />
  </div>
</template>

<style scoped>
.app-wrapper {
  min-height: 100dvh;
  background-color: #0f0f1a;
  position: relative;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
