<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import PfcRingChart from '../components/PfcRingChart.vue'
import { getSettings, getMealLogsByDate, deleteMealLog } from '../db/index.js'

const router = useRouter()
const settings = ref(null)
const logs = ref([])
const today = new Date().toISOString().slice(0, 10)

const displayDate = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
}).format(new Date())

async function load() {
  settings.value = await getSettings()
  logs.value = await getMealLogsByDate(today)
}

onMounted(load)
onActivated(load)

const totals = computed(() => {
  return logs.value.reduce(
    (acc, log) => ({
      protein: acc.protein + log.protein,
      fat: acc.fat + log.fat,
      carb: acc.carb + log.carb,
    }),
    { protein: 0, fat: 0, carb: 0 }
  )
})

const remaining = computed(() => {
  if (!settings.value) return { protein: 0, fat: 0, carb: 0 }
  return {
    protein: Math.max(0, settings.value.target_p - totals.value.protein),
    fat:     Math.max(0, settings.value.target_f - totals.value.fat),
    carb:    Math.max(0, settings.value.target_c - totals.value.carb),
  }
})

const mealGroups = computed(() => {
  const order = ['breakfast', 'lunch', 'dinner', 'snack']
  const labels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' }
  return order
    .map(type => ({
      type,
      label: labels[type],
      items: logs.value.filter(l => l.meal_type === type),
    }))
    .filter(g => g.items.length > 0)
})

function barWidth(current, target) {
  if (!target) return 0
  return Math.min(100, (current / target) * 100)
}

function barColor(current, target) {
  const r = current / target
  if (r >= 1) return '#f87171'
  if (r >= 0.8) return '#f59e0b'
  return '#34d399'
}

async function removeLog(id) {
  await deleteMealLog(id)
  logs.value = logs.value.filter(l => l.id !== id)
}

const mealTypeLabel = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' }
</script>

<template>
  <div class="screen" v-if="settings">
    <header class="screen-header">
      <div>
        <h1>PFC Tracker</h1>
        <p class="date-label">{{ displayDate }}</p>
      </div>
    </header>

    <!-- 円グラフ + サマリー -->
    <section class="chart-section card">
      <div class="chart-row">
        <PfcRingChart
          :protein="totals.protein"
          :fat="totals.fat"
          :carb="totals.carb"
          :target-calories="settings.target_calories"
          :size="148"
        />
        <div class="pfc-legend">
          <div class="legend-item">
            <span class="dot p"></span>
            <span class="legend-label">タンパク質</span>
            <span class="legend-val">{{ Math.round(totals.protein) }}g</span>
            <span class="legend-target">/ {{ settings.target_p }}g</span>
          </div>
          <div class="legend-item">
            <span class="dot f"></span>
            <span class="legend-label">脂質</span>
            <span class="legend-val">{{ Math.round(totals.fat) }}g</span>
            <span class="legend-target">/ {{ settings.target_f }}g</span>
          </div>
          <div class="legend-item">
            <span class="dot c"></span>
            <span class="legend-label">炭水化物</span>
            <span class="legend-val">{{ Math.round(totals.carb) }}g</span>
            <span class="legend-target">/ {{ settings.target_c }}g</span>
          </div>
        </div>
      </div>
    </section>

    <!-- プログレスバー -->
    <section class="card progress-section">
      <h2>摂取状況</h2>
      <div class="progress-row">
        <span class="progress-label">P</span>
        <div class="progress-bar-wrap">
          <div
            class="progress-bar"
            :style="{
              width: barWidth(totals.protein, settings.target_p) + '%',
              background: barColor(totals.protein, settings.target_p),
            }"
          />
        </div>
        <span class="progress-remaining">残 {{ Math.round(remaining.protein) }}g</span>
      </div>
      <div class="progress-row">
        <span class="progress-label">F</span>
        <div class="progress-bar-wrap">
          <div
            class="progress-bar"
            :style="{
              width: barWidth(totals.fat, settings.target_f) + '%',
              background: barColor(totals.fat, settings.target_f),
            }"
          />
        </div>
        <span class="progress-remaining">残 {{ Math.round(remaining.fat) }}g</span>
      </div>
      <div class="progress-row">
        <span class="progress-label">C</span>
        <div class="progress-bar-wrap">
          <div
            class="progress-bar"
            :style="{
              width: barWidth(totals.carb, settings.target_c) + '%',
              background: barColor(totals.carb, settings.target_c),
            }"
          />
        </div>
        <span class="progress-remaining">残 {{ Math.round(remaining.carb) }}g</span>
      </div>
    </section>

    <!-- 今日の食事ログ -->
    <section class="card meal-section">
      <div class="meal-header">
        <h2>今日の食事</h2>
        <button class="add-btn" @click="router.push('/record')">+ 追加</button>
      </div>

      <div v-if="mealGroups.length === 0" class="empty-state">
        <p>まだ記録がありません</p>
        <button class="btn-outline" @click="router.push('/record')">食事を記録する</button>
      </div>

      <div v-for="group in mealGroups" :key="group.type" class="meal-group">
        <div class="meal-type-label">{{ group.label }}</div>
        <div
          v-for="item in group.items"
          :key="item.id"
          class="meal-item"
        >
          <div class="meal-info">
            <span class="meal-name">{{ item.food_name }}</span>
            <span class="meal-amount">{{ item.amount }}g</span>
          </div>
          <div class="meal-pfc">
            <span class="p">P{{ Math.round(item.protein) }}</span>
            <span class="f">F{{ Math.round(item.fat) }}</span>
            <span class="c">C{{ Math.round(item.carb) }}</span>
            <span class="kcal">{{ Math.round(item.calories) }}kcal</span>
          </div>
          <button class="del-btn" @click="removeLog(item.id)" title="削除">×</button>
        </div>
      </div>
    </section>

    <div class="bottom-spacer"></div>
  </div>

  <div v-else class="loading">読み込み中...</div>
</template>

<style scoped>
.screen {
  padding: 20px 16px;
  padding-top: calc(20px + env(safe-area-inset-top, 0px));
  min-height: 100dvh;
}

.screen-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.screen-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 2px;
}

.date-label {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0;
}

.card {
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card h2 {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px;
}

/* チャート */
.chart-section {
  padding: 20px 16px;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.pfc-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  white-space: nowrap;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot.p { background: #a78bfa; }
.dot.f { background: #f59e0b; }
.dot.c { background: #34d399; }

.legend-label {
  flex: 0 1 auto;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-val {
  font-weight: 700;
  color: #e2e8f0;
  white-space: nowrap;
}

.legend-target {
  color: #64748b;
  font-size: 0.72rem;
  white-space: nowrap;
}

/* プログレスバー */
.progress-section {
  padding: 14px 16px;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.progress-row:last-child {
  margin-bottom: 0;
}

.progress-label {
  width: 16px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
}

.progress-bar-wrap {
  flex: 1;
  height: 8px;
  background: #1e2a3a;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
  min-width: 0;
}

.progress-remaining {
  font-size: 0.75rem;
  color: #64748b;
  min-width: 58px;
  text-align: right;
  white-space: nowrap;
}

/* 食事ログ */
.meal-section {
  padding: 14px 16px;
}

.meal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.meal-header h2 {
  margin: 0;
}

.add-btn {
  padding: 5px 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.82rem;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 24px 0;
  color: #64748b;
  font-size: 0.875rem;
}

.empty-state p {
  margin: 0 0 12px;
}

.btn-outline {
  padding: 8px 20px;
  background: transparent;
  border: 1px solid #2563eb;
  color: #60a5fa;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
}

.meal-group {
  margin-bottom: 14px;
}

.meal-type-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.meal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #0d1117;
  border-radius: 8px;
  margin-bottom: 6px;
}

.meal-info {
  flex: 1;
  min-width: 0;
}

.meal-name {
  display: block;
  font-size: 0.875rem;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meal-amount {
  font-size: 0.75rem;
  color: #64748b;
}

.meal-pfc {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.meal-pfc span {
  font-size: 0.7rem;
  padding: 2px 5px;
  border-radius: 4px;
}

.meal-pfc .p { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.meal-pfc .f { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.meal-pfc .c { background: rgba(52, 211, 153, 0.15); color: #34d399; }
.meal-pfc .kcal { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }

.del-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
}

.del-btn:hover {
  color: #f87171;
}

.bottom-spacer {
  height: 80px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  color: #64748b;
}
</style>
