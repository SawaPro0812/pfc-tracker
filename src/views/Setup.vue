<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { saveSettings } from '../db/index.js'
import { ACTIVITY_LEVELS, GOAL_TYPES, calcAll } from '../utils/pfcCalculator.js'

const router = useRouter()

const form = ref({
  height: '',
  weight: '',
  age: '',
  gender: 'male',
  activity_level: 'moderate',
  goal: 'maintain',
})

const result = ref(null)
const saving = ref(false)
const resultCard = ref(null)

const isValid = computed(() =>
  form.value.height > 0 &&
  form.value.weight > 0 &&
  form.value.age > 0
)

async function simulate() {
  if (!isValid.value) return
  result.value = calcAll({
    height: Number(form.value.height),
    weight: Number(form.value.weight),
    age: Number(form.value.age),
    gender: form.value.gender,
    activity_level: form.value.activity_level,
    goal: form.value.goal,
  })
  await nextTick()
  resultCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function save() {
  if (!result.value || saving.value) return
  saving.value = true
  await saveSettings({
    height: Number(form.value.height),
    weight: Number(form.value.weight),
    age: Number(form.value.age),
    gender: form.value.gender,
    activity_level: form.value.activity_level,
    goal: form.value.goal,
    target_p: result.value.target_p,
    target_f: result.value.target_f,
    target_c: result.value.target_c,
    target_calories: result.value.target_calories,
  })
  saving.value = false
  router.push('/')
}
</script>

<template>
  <div class="screen">
    <header class="screen-header">
      <h1>初期設定</h1>
      <p>身体情報を入力してPFCバランスを計算します</p>
    </header>

    <section class="card">
      <h2>身体情報</h2>

      <div class="form-group">
        <label>性別</label>
        <div class="radio-group">
          <label class="radio-label" :class="{ active: form.gender === 'male' }">
            <input type="radio" v-model="form.gender" value="male" />
            男性
          </label>
          <label class="radio-label" :class="{ active: form.gender === 'female' }">
            <input type="radio" v-model="form.gender" value="female" />
            女性
          </label>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>身長 (cm)</label>
          <input type="number" v-model="form.height" placeholder="170" min="100" max="250" />
        </div>
        <div class="form-group">
          <label>体重 (kg)</label>
          <input type="number" v-model="form.weight" placeholder="65" min="30" max="300" />
        </div>
      </div>

      <div class="form-group">
        <label>年齢</label>
        <input type="number" v-model="form.age" placeholder="25" min="10" max="100" />
      </div>

      <div class="form-group">
        <label>活動量</label>
        <select v-model="form.activity_level">
          <option v-for="l in ACTIVITY_LEVELS" :key="l.value" :value="l.value">
            {{ l.label }}（×{{ l.factor }}）
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>目標</label>
        <div class="goal-grid">
          <button
            v-for="g in GOAL_TYPES"
            :key="g.value"
            class="goal-btn"
            :class="{ active: form.goal === g.value }"
            @click="form.goal = g.value"
          >
            {{ g.label }}
          </button>
        </div>
      </div>

      <button class="btn-primary" @click="simulate" :disabled="!isValid">
        計算する
      </button>
    </section>

    <!-- 計算結果 -->
    <section v-if="result" ref="resultCard" class="card result-card">
      <h2>計算結果</h2>

      <div class="result-grid">
        <div class="result-item">
          <span class="label">基礎代謝（BMR）</span>
          <span class="value">{{ result.bmr }} <small>kcal</small></span>
        </div>
        <div class="result-item">
          <span class="label">1日消費量（TDEE）</span>
          <span class="value">{{ result.tdee }} <small>kcal</small></span>
        </div>
        <div class="result-item highlight">
          <span class="label">目標カロリー</span>
          <span class="value large">{{ result.target_calories }} <small>kcal</small></span>
        </div>
      </div>

      <div class="pfc-targets">
        <div class="pfc-item p">
          <span class="pfc-letter">P</span>
          <span class="pfc-name">タンパク質</span>
          <span class="pfc-value">{{ result.target_p }}g</span>
          <span class="pfc-kcal">{{ result.target_p * 4 }}kcal</span>
        </div>
        <div class="pfc-item f">
          <span class="pfc-letter">F</span>
          <span class="pfc-name">脂質</span>
          <span class="pfc-value">{{ result.target_f }}g</span>
          <span class="pfc-kcal">{{ result.target_f * 9 }}kcal</span>
        </div>
        <div class="pfc-item c">
          <span class="pfc-letter">C</span>
          <span class="pfc-name">炭水化物</span>
          <span class="pfc-value">{{ result.target_c }}g</span>
          <span class="pfc-kcal">{{ result.target_c * 4 }}kcal</span>
        </div>
      </div>

      <p class="note">
        ※ 国立健康・栄養研究所の式（Ganpule et al.2007）に基づく推計値です
      </p>

      <button class="btn-primary" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : 'この設定で始める' }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.screen {
  padding: 24px 16px 40px;
  padding-top: calc(24px + env(safe-area-inset-top, 0px));
  min-height: 100dvh;
}

.screen-header {
  margin-bottom: 24px;
}

.screen-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: #e2e8f0;
}

.screen-header p {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
}

.card {
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.card h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.radio-group {
  display: flex;
  gap: 10px;
}

.radio-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #94a3b8;
  transition: all 0.15s;
}

.radio-label input {
  display: none;
  width: auto;
}

.radio-label.active {
  border-color: #60a5fa;
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.goal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.goal-btn {
  padding: 10px 6px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.goal-btn.active {
  border-color: #60a5fa;
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 結果 */
.result-card {
  border-color: #3730a3;
}

.result-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #0d1117;
  border-radius: 8px;
}

.result-item.highlight {
  background: rgba(37, 99, 235, 0.15);
  border: 1px solid #2563eb44;
}

.result-item .label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.result-item .value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e2e8f0;
}

.result-item .value.large {
  font-size: 1.4rem;
  color: #60a5fa;
}

.result-item .value small {
  font-size: 0.75rem;
  font-weight: 400;
  color: #64748b;
  margin-left: 2px;
}

.pfc-targets {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.pfc-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 10px;
  background: #0d1117;
}

.pfc-item.p { border-top: 2px solid #a78bfa; }
.pfc-item.f { border-top: 2px solid #f59e0b; }
.pfc-item.c { border-top: 2px solid #34d399; }

.pfc-letter {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1;
}

.pfc-item.p .pfc-letter { color: #a78bfa; }
.pfc-item.f .pfc-letter { color: #f59e0b; }
.pfc-item.c .pfc-letter { color: #34d399; }

.pfc-name {
  font-size: 0.65rem;
  color: #64748b;
  margin-bottom: 2px;
}

.pfc-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #e2e8f0;
}

.pfc-kcal {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 2px;
}

.note {
  font-size: 0.72rem;
  color: #64748b;
  margin: 8px 0 16px;
  line-height: 1.5;
}
</style>
