<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSettings, saveSettings, exportAllData, importAllData } from '../db/index.js'
import { ACTIVITY_LEVELS, GOAL_TYPES, calcAll } from '../utils/pfcCalculator.js'

const router = useRouter()
const settings = ref(null)
const form = ref({})
const saving = ref(false)
const msg = ref('')

async function load() {
  settings.value = await getSettings()
  if (settings.value) {
    form.value = { ...settings.value }
  }
}

onMounted(load)

function recalculate() {
  const r = calcAll({
    height: Number(form.value.height),
    weight: Number(form.value.weight),
    age:    Number(form.value.age),
    gender: form.value.gender,
    activity_level: form.value.activity_level,
    goal:   form.value.goal,
  })
  form.value.target_calories = r.target_calories
  form.value.target_p = r.target_p
  form.value.target_f = r.target_f
  form.value.target_c = r.target_c
}

async function save() {
  saving.value = true
  await saveSettings(form.value)
  showMsg('設定を保存しました')
  saving.value = false
}

// --- エクスポート ---
async function exportData() {
  const data = await exportAllData()
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  if (navigator.share) {
    const file = new File([blob], 'pfc_backup.json', { type: 'application/json' })
    try {
      await navigator.share({ files: [file], title: 'PFC Tracker バックアップ' })
    } catch {
      downloadFile(url)
    }
  } else {
    downloadFile(url)
  }
  URL.revokeObjectURL(url)
}

function downloadFile(url) {
  const a = document.createElement('a')
  a.href = url
  a.download = `pfc_backup_${new Date().toISOString().slice(0,10)}.json`
  a.click()
}

// --- インポート ---
const fileInput = ref(null)

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!data.version || !data.exported_at) throw new Error('invalid format')
    await importAllData(data)
    showMsg('データをインポートしました。再読み込みします...')
    setTimeout(() => location.reload(), 1500)
  } catch (e) {
    showMsg('インポートに失敗しました: ' + e.message)
  }
  event.target.value = ''
}

function showMsg(text) {
  msg.value = text
  setTimeout(() => { msg.value = '' }, 3000)
}

const genderOptions = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
]
</script>

<template>
  <div class="screen" v-if="settings">
    <header class="screen-header">
      <h1>設定</h1>
    </header>

    <!-- トースト通知 -->
    <div v-if="msg" class="toast">{{ msg }}</div>

    <!-- 身体情報 -->
    <section class="card">
      <h2>身体情報</h2>

      <div class="form-group">
        <label>性別</label>
        <div class="radio-group">
          <label
            v-for="g in genderOptions"
            :key="g.value"
            class="radio-label"
            :class="{ active: form.gender === g.value }"
          >
            <input type="radio" v-model="form.gender" :value="g.value" />
            {{ g.label }}
          </label>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>身長 (cm)</label>
          <input type="number" v-model="form.height" />
        </div>
        <div class="form-group">
          <label>体重 (kg)</label>
          <input type="number" v-model="form.weight" />
        </div>
      </div>

      <div class="form-group">
        <label>年齢</label>
        <input type="number" v-model="form.age" />
      </div>

      <div class="form-group">
        <label>活動量</label>
        <select v-model="form.activity_level">
          <option v-for="l in ACTIVITY_LEVELS" :key="l.value" :value="l.value">
            {{ l.label }}
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
          >{{ g.label }}</button>
        </div>
      </div>

      <button class="btn-secondary" @click="recalculate">PFCを再計算</button>
    </section>

    <!-- 目標PFC（手動調整可） -->
    <section class="card">
      <h2>目標PFC（手動調整可能）</h2>

      <div class="pfc-inputs">
        <div class="form-group">
          <label>目標カロリー (kcal)</label>
          <input type="number" v-model="form.target_calories" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="p-label">P タンパク質 (g)</label>
            <input type="number" v-model="form.target_p" />
          </div>
          <div class="form-group">
            <label class="f-label">F 脂質 (g)</label>
            <input type="number" v-model="form.target_f" />
          </div>
        </div>
        <div class="form-group" style="max-width: 50%;">
          <label class="c-label">C 炭水化物 (g)</label>
          <input type="number" v-model="form.target_c" />
        </div>
      </div>

      <button class="btn-primary" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : '設定を保存' }}
      </button>
    </section>

    <!-- データ管理 -->
    <section class="card">
      <h2>データ管理</h2>

      <div class="data-actions">
        <div class="data-action-item">
          <div class="action-info">
            <span class="action-title">データをエクスポート</span>
            <span class="action-desc">食事記録をJSON形式で保存・共有</span>
          </div>
          <button class="btn-outline" @click="exportData">エクスポート</button>
        </div>

        <div class="data-action-item">
          <div class="action-info">
            <span class="action-title">データをインポート</span>
            <span class="action-desc">バックアップJSONから復元</span>
          </div>
          <button class="btn-outline" @click="triggerImport">インポート</button>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            style="display:none"
            @change="handleImport"
          />
        </div>
      </div>
    </section>

    <!-- アプリ情報 -->
    <section class="card info-card">
      <h2>アプリについて</h2>
      <p class="info-text">PFC Balance Tracker v1.0.0</p>
      <p class="info-text">基礎代謝は国立健康・栄養研究所の式（Ganpule et al. 2007）を使用</p>
      <p class="info-text">食品データは文部科学省「日本食品標準成分表2020年版（八訂）」準拠</p>
    </section>

    <div class="bottom-spacer"></div>
  </div>
</template>

<style scoped>
.screen {
  padding: 20px 16px;
  padding-top: calc(20px + env(safe-area-inset-top, 0px));
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
  padding: 16px;
  margin-bottom: 12px;
}

.card h2 {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 14px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 0.82rem;
  color: #94a3b8;
  margin-bottom: 5px;
}

.form-group label.p-label { color: #a78bfa; }
.form-group label.f-label { color: #f59e0b; }
.form-group label.c-label { color: #34d399; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.radio-group {
  display: flex;
  gap: 8px;
}

.radio-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
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
  padding: 9px 4px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.goal-btn.active {
  border-color: #60a5fa;
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.btn-secondary {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px solid #2a2a4a;
  color: #94a3b8;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 4px;
}

.btn-secondary:hover {
  border-color: #60a5fa;
  color: #60a5fa;
}

.pfc-inputs {
  margin-bottom: 14px;
}

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

/* データ管理 */
.data-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #0d1117;
  border-radius: 8px;
}

.action-info {
  flex: 1;
}

.action-title {
  display: block;
  font-size: 0.875rem;
  color: #e2e8f0;
  margin-bottom: 2px;
}

.action-desc {
  font-size: 0.75rem;
  color: #64748b;
}

.btn-outline {
  padding: 7px 14px;
  background: transparent;
  border: 1px solid #2563eb;
  color: #60a5fa;
  border-radius: 7px;
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

/* アプリ情報 */
.info-card { border-color: #1e2a3a; }

.info-text {
  font-size: 0.78rem;
  color: #64748b;
  margin: 0 0 5px;
  line-height: 1.5;
}

/* トースト */
.toast {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: #e2e8f0;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 0.875rem;
  border: 1px solid #334155;
  z-index: 200;
  white-space: nowrap;
}

.bottom-spacer { height: 80px; }
</style>
