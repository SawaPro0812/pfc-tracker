<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { searchFoods, addMealLog, getMySets, addMySet, deleteMySet } from '../db/index.js'

const router = useRouter()

// タブ: search / manual / myset
const activeTab = ref('search')
const mealType = ref('lunch')
const today = new Date().toISOString().slice(0, 10)
const recordDate = ref(today)

// --- 食品検索タブ ---
const query = ref('')
const searchResults = ref([])
const selectedFood = ref(null)
const amount = ref(100)
let searchTimer = null

watch(query, (val) => {
  clearTimeout(searchTimer)
  if (!val.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    searchResults.value = await searchFoods(val)
  }, 200)
})

function selectFood(food) {
  selectedFood.value = food
  amount.value = 100
}

const preview = computed(() => {
  if (!selectedFood.value || !amount.value) return null
  const ratio = amount.value / 100
  return {
    protein: Math.round(selectedFood.value.protein * ratio * 10) / 10,
    fat:     Math.round(selectedFood.value.fat     * ratio * 10) / 10,
    carb:    Math.round(selectedFood.value.carb    * ratio * 10) / 10,
    calories:Math.round(selectedFood.value.kcal    * ratio),
  }
})

async function addFromSearch() {
  if (!selectedFood.value || !preview.value) return
  await addMealLog({
    date: recordDate.value,
    meal_type: mealType.value,
    food_id: selectedFood.value.id,
    food_name: selectedFood.value.name,
    amount: Number(amount.value),
    ...preview.value,
  })
  selectedFood.value = null
  query.value = ''
  searchResults.value = []
  router.push('/')
}

// --- 手入力タブ ---
const manual = ref({ name: '', protein: '', fat: '', carb: '', calories: '', amount: 100 })

const manualCalcKcal = computed(() => {
  const p = Number(manual.value.protein) || 0
  const f = Number(manual.value.fat)     || 0
  const c = Number(manual.value.carb)    || 0
  return Math.round(p * 4 + f * 9 + c * 4)
})

async function addManual() {
  if (!manual.value.name) return
  const kcal = Number(manual.value.calories) || manualCalcKcal.value
  await addMealLog({
    date: recordDate.value,
    meal_type: mealType.value,
    food_id: null,
    food_name: manual.value.name,
    amount: Number(manual.value.amount) || 100,
    protein:  Number(manual.value.protein) || 0,
    fat:      Number(manual.value.fat)     || 0,
    carb:     Number(manual.value.carb)    || 0,
    calories: kcal,
  })
  manual.value = { name: '', protein: '', fat: '', carb: '', calories: '', amount: 100 }
  router.push('/')
}

// --- マイセットタブ ---
const mySets = ref([])
const showSetForm = ref(false)
const newSetName = ref('')
// セット作成は検索で複数選択してまとめる簡易版
const setItems = ref([]) // { food_name, amount, protein, fat, carb, calories }

async function loadMySets() {
  mySets.value = await getMySets()
}

onMounted(loadMySets)

async function useSet(set) {
  const promises = set.items.map(item => addMealLog({
    date: recordDate.value,
    meal_type: mealType.value,
    food_id: item.food_id || null,
    food_name: item.food_name,
    amount: item.amount,
    protein: item.protein,
    fat: item.fat,
    carb: item.carb,
    calories: item.calories,
  }))
  await Promise.all(promises)
  router.push('/')
}

async function removeSet(id) {
  await deleteMySet(id)
  mySets.value = mySets.value.filter(s => s.id !== id)
}

const mealTypeOptions = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch',     label: '昼食' },
  { value: 'dinner',    label: '夕食' },
  { value: 'snack',     label: '間食' },
]
</script>

<template>
  <div class="screen">
    <header class="screen-header">
      <button class="back-btn" @click="router.push('/')">← 戻る</button>
      <h1>食事を記録</h1>
    </header>

    <!-- 日付・食事タイプ -->
    <section class="meta-section card">
      <div class="meta-row">
        <div class="form-group">
          <label>日付</label>
          <input type="date" v-model="recordDate" />
        </div>
        <div class="form-group">
          <label>食事タイプ</label>
          <select v-model="mealType">
            <option v-for="o in mealTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- タブ -->
    <div class="tab-bar">
      <button
        v-for="tab in ['search', 'manual', 'myset']"
        :key="tab"
        class="tab-btn"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab === 'search' ? '食品検索' : tab === 'manual' ? '手入力' : 'マイセット' }}
      </button>
    </div>

    <!-- ===== 食品検索 ===== -->
    <div v-if="activeTab === 'search'" class="tab-content">
      <input
        type="search"
        v-model="query"
        placeholder="食品名を入力（例: 鶏むね、ご飯）"
        autocomplete="off"
      />

      <!-- 検索結果 -->
      <div v-if="searchResults.length > 0" class="food-list">
        <div
          v-for="food in searchResults"
          :key="food.id"
          class="food-item"
          :class="{ selected: selectedFood?.id === food.id }"
          @click="selectFood(food)"
        >
          <div class="food-name">{{ food.name }}</div>
          <div class="food-macros">
            <span class="p">P{{ food.protein }}</span>
            <span class="f">F{{ food.fat }}</span>
            <span class="c">C{{ food.carb }}</span>
            <span class="kcal">{{ food.kcal }}kcal</span>
            <span class="per100">/100g</span>
          </div>
        </div>
      </div>

      <!-- 選択中の食品 -->
      <div v-if="selectedFood" class="selected-panel card">
        <div class="selected-name">{{ selectedFood.name }}</div>
        <div class="amount-row">
          <label>量 (g)</label>
          <input type="number" v-model="amount" min="1" max="9999" style="width:100px" />
        </div>
        <div v-if="preview" class="preview-macros">
          <span class="p">P {{ preview.protein }}g</span>
          <span class="f">F {{ preview.fat }}g</span>
          <span class="c">C {{ preview.carb }}g</span>
          <span class="kcal">{{ preview.calories }}kcal</span>
        </div>
        <button class="btn-primary" @click="addFromSearch">記録する</button>
      </div>

      <p v-if="query && searchResults.length === 0" class="no-result">
        「{{ query }}」は見つかりませんでした。<br>手入力タブからご登録ください。
      </p>
    </div>

    <!-- ===== 手入力 ===== -->
    <div v-if="activeTab === 'manual'" class="tab-content">
      <div class="card">
        <div class="form-group">
          <label>食品名 *</label>
          <input type="text" v-model="manual.name" placeholder="例: 自家製チキン" />
        </div>
        <div class="form-group">
          <label>量 (g)</label>
          <input type="number" v-model="manual.amount" min="1" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>タンパク質 (g)</label>
            <input type="number" v-model="manual.protein" min="0" step="0.1" />
          </div>
          <div class="form-group">
            <label>脂質 (g)</label>
            <input type="number" v-model="manual.fat" min="0" step="0.1" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>炭水化物 (g)</label>
            <input type="number" v-model="manual.carb" min="0" step="0.1" />
          </div>
          <div class="form-group">
            <label>カロリー (kcal)</label>
            <input type="number" v-model="manual.calories" :placeholder="String(manualCalcKcal)" min="0" />
          </div>
        </div>
        <p class="calc-note">カロリー空欄の場合: P×4 + F×9 + C×4 = {{ manualCalcKcal }}kcal で自動計算</p>
        <button class="btn-primary" @click="addManual" :disabled="!manual.name">記録する</button>
      </div>
    </div>

    <!-- ===== マイセット ===== -->
    <div v-if="activeTab === 'myset'" class="tab-content">
      <div v-if="mySets.length === 0" class="empty-state">
        <p>マイセットがありません</p>
        <p class="sub">食品検索後に「マイセットに保存」で登録できます</p>
      </div>
      <div v-for="set in mySets" :key="set.id" class="set-card card">
        <div class="set-header">
          <span class="set-name">{{ set.name }}</span>
          <div class="set-actions">
            <button class="btn-use" @click="useSet(set)">使う</button>
            <button class="del-btn" @click="removeSet(set.id)">×</button>
          </div>
        </div>
        <div class="set-items">
          <div v-for="(item, i) in set.items" :key="i" class="set-item">
            <span class="set-item-name">{{ item.food_name }}</span>
            <span class="set-item-amount">{{ item.amount }}g</span>
            <span class="set-item-macros">P{{ Math.round(item.protein) }} F{{ Math.round(item.fat) }} C{{ Math.round(item.carb) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-spacer"></div>
  </div>
</template>

<style scoped>
.screen {
  padding: 20px 16px;
  padding-top: calc(20px + env(safe-area-inset-top, 0px));
  min-height: 100dvh;
}

.screen-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-btn {
  background: transparent;
  border: none;
  color: #60a5fa;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
}

.screen-header h1 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
}

.card {
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}

.meta-section { padding: 12px 14px; }

.meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  display: block;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 5px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* タブ */
.tab-bar {
  display: flex;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 12px;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  padding: 8px 4px;
  background: transparent;
  border: none;
  border-radius: 7px;
  color: #64748b;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn.active {
  background: #2563eb;
  color: white;
}

.tab-content {
  padding-top: 4px;
}

/* 食品リスト */
.food-list {
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.food-item {
  padding: 11px 14px;
  border-bottom: 1px solid #2a2a4a;
  cursor: pointer;
  transition: background 0.1s;
}

.food-item:last-child {
  border-bottom: none;
}

.food-item:hover,
.food-item.selected {
  background: #1e2a3a;
}

.food-item.selected {
  border-left: 3px solid #60a5fa;
}

.food-name {
  font-size: 0.9rem;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.food-macros {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.food-macros span {
  font-size: 0.7rem;
  padding: 1px 5px;
  border-radius: 3px;
}

.food-macros .p { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.food-macros .f { background: rgba(245, 158, 11, 0.15);  color: #f59e0b; }
.food-macros .c { background: rgba(52, 211, 153, 0.15);  color: #34d399; }
.food-macros .kcal { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }
.food-macros .per100 { color: #64748b; }

/* 選択パネル */
.selected-panel {
  margin-top: 10px;
}

.selected-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 10px;
}

.amount-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.amount-row label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.amount-row input {
  width: 100px !important;
}

.preview-macros {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.preview-macros span {
  font-size: 0.82rem;
  padding: 3px 8px;
  border-radius: 5px;
}

.preview-macros .p { background: rgba(167, 139, 250, 0.2); color: #a78bfa; }
.preview-macros .f { background: rgba(245, 158, 11, 0.2);  color: #f59e0b; }
.preview-macros .c { background: rgba(52, 211, 153, 0.2);  color: #34d399; }
.preview-macros .kcal { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 9px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.calc-note {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 10px;
}

.no-result {
  text-align: center;
  color: #64748b;
  font-size: 0.85rem;
  padding: 20px 0;
  line-height: 1.6;
}

/* マイセット */
.empty-state {
  text-align: center;
  padding: 30px 0;
  color: #64748b;
}

.empty-state .sub {
  font-size: 0.8rem;
  margin-top: 6px;
}

.set-card {
  margin-bottom: 10px;
}

.set-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.set-name {
  font-weight: 600;
  color: #e2e8f0;
}

.set-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-use {
  padding: 4px 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

.del-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 1rem;
  cursor: pointer;
}

.set-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.set-item {
  display: flex;
  gap: 8px;
  font-size: 0.8rem;
  color: #94a3b8;
  align-items: center;
}

.set-item-name { flex: 1; color: #e2e8f0; }
.set-item-amount { color: #64748b; }
.set-item-macros { color: #64748b; font-size: 0.72rem; }

.bottom-spacer { height: 80px; }
</style>
