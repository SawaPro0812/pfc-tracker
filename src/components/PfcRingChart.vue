<script setup>
import { computed } from 'vue'

const props = defineProps({
  protein:       { type: Number, default: 0 },
  fat:           { type: Number, default: 0 },
  carb:          { type: Number, default: 0 },
  targetCalories:{ type: Number, default: 2000 },
  size:          { type: Number, default: 180 },
})

const R = 70
const STROKE = 14
const C = 2 * Math.PI * R

const totalKcal = computed(() =>
  props.protein * 4 + props.fat * 9 + props.carb * 4
)

const percent = computed(() =>
  props.targetCalories > 0
    ? Math.min(1, totalKcal.value / props.targetCalories)
    : 0
)

// 3色セグメント（P: 紫, F: 黄, C: 緑）
const segments = computed(() => {
  const total = totalKcal.value
  if (total === 0) return []

  const pKcal = props.protein * 4
  const fKcal = props.fat * 9
  const cKcal = props.carb * 4

  const maxKcal = props.targetCalories
  const scale = Math.min(1, maxKcal > 0 ? total / maxKcal : 0)

  const pRatio = total > 0 ? pKcal / total : 0
  const fRatio = total > 0 ? fKcal / total : 0
  const cRatio = total > 0 ? cKcal / total : 0

  const pLen = C * scale * pRatio
  const fLen = C * scale * fRatio
  const cLen = C * scale * cRatio

  let offset = 0
  const segs = []
  const add = (len, color) => {
    if (len > 0.1) {
      segs.push({ dasharray: `${len} ${C}`, dashoffset: -offset, color })
      offset += len
    }
  }
  add(pLen, '#a78bfa')
  add(fLen, '#f59e0b')
  add(cLen, '#34d399')
  return segs
})

const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
</script>

<template>
  <div class="chart-container" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <!-- 背景リング -->
      <circle
        :cx="cx" :cy="cy" :r="R"
        fill="none"
        stroke="#2a2a4a"
        :stroke-width="STROKE"
        stroke-dasharray="1 0"
        :transform="`rotate(-90, ${cx}, ${cy})`"
      />
      <!-- PFCセグメント -->
      <circle
        v-for="(seg, i) in segments"
        :key="i"
        :cx="cx" :cy="cy" :r="R"
        fill="none"
        :stroke="seg.color"
        :stroke-width="STROKE"
        stroke-linecap="butt"
        :stroke-dasharray="seg.dasharray"
        :stroke-dashoffset="seg.dashoffset"
        :transform="`rotate(-90, ${cx}, ${cy})`"
      />
    </svg>
    <!-- 中央テキスト -->
    <div class="center-text">
      <div class="kcal-value">{{ Math.round(totalKcal) }}</div>
      <div class="kcal-label">kcal</div>
      <div class="kcal-target">/ {{ targetCalories }}</div>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.chart-container svg {
  display: block;
}

.center-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1;
  width: 100%;
}

.kcal-value {
  font-size: 2rem;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1;
}

.kcal-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
}

.kcal-target {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 1px;
}
</style>
