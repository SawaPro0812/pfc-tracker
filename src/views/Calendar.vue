<script setup>
import { ref, computed, onMounted } from 'vue'
import { getSettings, getMealLogsByDateRange, getMealLogsByDate } from '../db/index.js'

const settings = ref(null)
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth()) // 0-indexed
const monthLogs = ref({}) // date -> { protein, fat, carb, calories }
const selectedDate = ref(null)
const selectedLogs = ref([])

const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const weekDays = ['日','月','火','水','木','金','土']

async function loadMonth() {
  settings.value = await getSettings()
  const year = currentYear.value
  const month = currentMonth.value
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

  const logs = await getMealLogsByDateRange(startDate, endDate)
  const grouped = {}
  for (const log of logs) {
    if (!grouped[log.date]) {
      grouped[log.date] = { protein: 0, fat: 0, carb: 0, calories: 0 }
    }
    grouped[log.date].protein  += log.protein
    grouped[log.date].fat      += log.fat
    grouped[log.date].carb     += log.carb
    grouped[log.date].calories += log.calories
  }
  monthLogs.value = grouped
}

onMounted(loadMonth)

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
  loadMonth()
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
  loadMonth()
}

// カレンダーグリッド計算
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= lastDate; d++) {
    days.push(d)
  }
  return days
})

function dateStr(day) {
  const y = currentYear.value
  const m = currentMonth.value + 1
  return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function dayStatus(day) {
  if (!day || !settings.value) return null
  const ds = dateStr(day)
  const log = monthLogs.value[ds]
  if (!log) return 'empty'
  const pRatio = log.protein  / settings.value.target_p
  const fRatio = log.fat      / settings.value.target_f
  const cRatio = log.carb     / settings.value.target_c
  const avg = (pRatio + fRatio + cRatio) / 3
  if (avg >= 0.9 && avg <= 1.15) return 'great'
  if (avg >= 0.7) return 'good'
  if (avg > 0) return 'low'
  return 'empty'
}

const isToday = (day) => {
  if (!day) return false
  return dateStr(day) === new Date().toISOString().slice(0, 10)
}

async function selectDay(day) {
  if (!day) return
  const ds = dateStr(day)
  selectedDate.value = ds
  selectedLogs.value = await getMealLogsByDate(ds)
}

const mealTypeLabel = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' }

const selectedDayTotal = computed(() => {
  return selectedLogs.value.reduce(
    (a, l) => ({ protein: a.protein + l.protein, fat: a.fat + l.fat, carb: a.carb + l.carb, calories: a.calories + l.calories }),
    { protein: 0, fat: 0, carb: 0, calories: 0 }
  )
})

const formatDate = (ds) => {
  if (!ds) return ''
  const [y, m, d] = ds.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}
</script>

<template>
  <div class="screen">
    <header class="screen-header">
      <h1>履歴</h1>
    </header>

    <!-- カレンダー -->
    <section class="card calendar-card">
      <div class="cal-nav">
        <button class="nav-arrow" @click="prevMonth">‹</button>
        <span class="cal-title">{{ currentYear }}年 {{ monthNames[currentMonth] }}</span>
        <button class="nav-arrow" @click="nextMonth">›</button>
      </div>

      <div class="cal-weekdays">
        <span v-for="d in weekDays" :key="d" :class="{ sun: d === '日', sat: d === '土' }">{{ d }}</span>
      </div>

      <div class="cal-grid">
        <div
          v-for="(day, i) in calendarDays"
          :key="i"
          class="cal-cell"
          :class="[
            day ? 'has-day' : 'empty-cell',
            day && isToday(day) ? 'today' : '',
            day && selectedDate === dateStr(day) ? 'selected' : '',
          ]"
          @click="selectDay(day)"
        >
          <span v-if="day" class="day-num">{{ day }}</span>
          <span
            v-if="day"
            class="day-dot"
            :class="dayStatus(day)"
          ></span>
        </div>
      </div>

      <!-- 凡例 -->
      <div class="legend">
        <span class="dot great"></span>達成
        <span class="dot good"></span>良好
        <span class="dot low"></span>不足
      </div>
    </section>

    <!-- 選択日の詳細 -->
    <section v-if="selectedDate" class="card detail-card">
      <h2>{{ formatDate(selectedDate) }}</h2>

      <div v-if="selectedLogs.length === 0" class="no-record">記録なし</div>
      <div v-else>
        <!-- 合計 -->
        <div class="day-totals">
          <div class="total-item p">
            <span class="total-label">P</span>
            <span class="total-val">{{ Math.round(selectedDayTotal.protein) }}g</span>
            <span class="total-target" v-if="settings">/ {{ settings.target_p }}g</span>
          </div>
          <div class="total-item f">
            <span class="total-label">F</span>
            <span class="total-val">{{ Math.round(selectedDayTotal.fat) }}g</span>
            <span class="total-target" v-if="settings">/ {{ settings.target_f }}g</span>
          </div>
          <div class="total-item c">
            <span class="total-label">C</span>
            <span class="total-val">{{ Math.round(selectedDayTotal.carb) }}g</span>
            <span class="total-target" v-if="settings">/ {{ settings.target_c }}g</span>
          </div>
          <div class="total-item kcal">
            <span class="total-label">kcal</span>
            <span class="total-val">{{ Math.round(selectedDayTotal.calories) }}</span>
            <span class="total-target" v-if="settings">/ {{ settings.target_calories }}</span>
          </div>
        </div>

        <!-- ログ一覧 -->
        <div
          v-for="log in selectedLogs"
          :key="log.id"
          class="log-item"
        >
          <div class="log-header">
            <span class="log-type">{{ mealTypeLabel[log.meal_type] }}</span>
            <span class="log-name">{{ log.food_name }}</span>
            <span class="log-amount">{{ log.amount }}g</span>
          </div>
          <div class="log-macros">
            <span class="p">P {{ Math.round(log.protein) }}g</span>
            <span class="f">F {{ Math.round(log.fat) }}g</span>
            <span class="c">C {{ Math.round(log.carb) }}g</span>
            <span class="kcal">{{ Math.round(log.calories) }}kcal</span>
          </div>
        </div>
      </div>
    </section>

    <div class="bottom-spacer"></div>
  </div>
</template>

<style scoped>
.screen {
  padding: 20px 16px;
  min-height: 100dvh;
}

.screen-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 16px;
}

.card {
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}

/* カレンダー */
.calendar-card { padding: 16px; }

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.nav-arrow {
  background: transparent;
  border: 1px solid #2a2a4a;
  color: #94a3b8;
  font-size: 1.2rem;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cal-title {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}

.cal-weekdays span {
  text-align: center;
  font-size: 0.72rem;
  color: #64748b;
  padding: 4px 0;
}

.cal-weekdays .sun { color: #f87171; }
.cal-weekdays .sat { color: #60a5fa; }

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  position: relative;
  gap: 2px;
}

.cal-cell.has-day {
  cursor: pointer;
}

.cal-cell.has-day:hover {
  background: #1e2a3a;
}

.cal-cell.today .day-num {
  color: #60a5fa;
  font-weight: 700;
}

.cal-cell.selected {
  background: rgba(37, 99, 235, 0.2);
  border: 1px solid #2563eb44;
}

.day-num {
  font-size: 0.85rem;
  color: #94a3b8;
}

.day-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.day-dot.great { background: #34d399; }
.day-dot.good  { background: #f59e0b; }
.day-dot.low   { background: #f87171; }
.day-dot.empty { background: transparent; }

.legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.72rem;
  color: #64748b;
}

.legend .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.legend .dot.great { background: #34d399; }
.legend .dot.good  { background: #f59e0b; }
.legend .dot.low   { background: #f87171; }

/* 詳細 */
.detail-card h2 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 12px;
}

.no-record {
  color: #64748b;
  font-size: 0.875rem;
  text-align: center;
  padding: 12px 0;
}

.day-totals {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.total-item {
  flex: 1;
  background: #0d1117;
  border-radius: 8px;
  padding: 8px 6px;
  text-align: center;
}

.total-item.p { border-top: 2px solid #a78bfa; }
.total-item.f { border-top: 2px solid #f59e0b; }
.total-item.c { border-top: 2px solid #34d399; }
.total-item.kcal { border-top: 2px solid #60a5fa; }

.total-label {
  display: block;
  font-size: 0.65rem;
  color: #64748b;
  margin-bottom: 2px;
}

.total-val {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: #e2e8f0;
}

.total-target {
  display: block;
  font-size: 0.62rem;
  color: #64748b;
  margin-top: 1px;
}

.log-item {
  padding: 9px 10px;
  background: #0d1117;
  border-radius: 8px;
  margin-bottom: 6px;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.log-type {
  font-size: 0.68rem;
  padding: 1px 6px;
  background: #1e2a3a;
  border-radius: 4px;
  color: #94a3b8;
  flex-shrink: 0;
}

.log-name {
  flex: 1;
  font-size: 0.85rem;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-amount {
  font-size: 0.75rem;
  color: #64748b;
  flex-shrink: 0;
}

.log-macros {
  display: flex;
  gap: 5px;
}

.log-macros span {
  font-size: 0.7rem;
  padding: 1px 5px;
  border-radius: 3px;
}

.log-macros .p { background: rgba(167,139,250,0.15); color: #a78bfa; }
.log-macros .f { background: rgba(245,158,11,0.15);  color: #f59e0b; }
.log-macros .c { background: rgba(52,211,153,0.15);  color: #34d399; }
.log-macros .kcal { background: rgba(96,165,250,0.1); color: #60a5fa; }

.bottom-spacer { height: 80px; }
</style>
