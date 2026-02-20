import Dexie from 'dexie'

export const db = new Dexie('pfc_tracker_db')

db.version(1).stores({
  settings: 'id',
  foods: 'id, name',
  meal_logs: '++id, date, meal_type, food_id, created_at',
  my_sets: '++id, name, created_at',
})

// 食品データをIndexedDBへシード（/foods.json から取得）
// 2191件未満の場合は旧サンプルデータとみなしてクリア＆再シードする
export async function seedFoodsIfEmpty() {
  const count = await db.foods.count()
  if (count >= 2000) return

  try {
    const res = await fetch('/foods.json')
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
    const foods = await res.json()
    await db.foods.clear()
    await db.foods.bulkPut(foods)
    console.log(`[DB] 食品データを${foods.length}件シードしました（文部科学省 食品標準成分表）`)
  } catch (e) {
    console.error('[DB] 食品データのシードに失敗しました:', e)
  }
}

// --- settings ---
export async function getSettings() {
  return await db.settings.get(1)
}

export async function saveSettings(data) {
  await db.settings.put({ ...data, id: 1, updated_at: new Date().toISOString() })
}

// --- meal_logs ---
export async function getMealLogsByDate(date) {
  return await db.meal_logs.where('date').equals(date).toArray()
}

export async function addMealLog(log) {
  return await db.meal_logs.add({ ...log, created_at: new Date().toISOString() })
}

export async function deleteMealLog(id) {
  await db.meal_logs.delete(id)
}

export async function getMealLogsByDateRange(startDate, endDate) {
  return await db.meal_logs
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray()
}

// --- foods ---
export async function searchFoods(query) {
  if (!query) return []
  const q = query.trim().toLowerCase()
  const results = await db.foods
    .filter(f => f.name.toLowerCase().includes(q))
    .limit(30)
    .toArray()
  return results
}

// --- my_sets ---
export async function getMySets() {
  return await db.my_sets.orderBy('created_at').reverse().toArray()
}

export async function addMySet(set) {
  return await db.my_sets.add({ ...set, created_at: new Date().toISOString() })
}

export async function deleteMySet(id) {
  await db.my_sets.delete(id)
}

// --- export / import ---
export async function exportAllData() {
  const [settings, meal_logs, my_sets] = await Promise.all([
    db.settings.toArray(),
    db.meal_logs.toArray(),
    db.my_sets.toArray(),
  ])
  return { version: 1, exported_at: new Date().toISOString(), settings, meal_logs, my_sets }
}

export async function importAllData(data) {
  await db.transaction('rw', db.settings, db.meal_logs, db.my_sets, async () => {
    if (data.settings?.length) await db.settings.bulkPut(data.settings)
    if (data.meal_logs?.length) await db.meal_logs.bulkPut(data.meal_logs)
    if (data.my_sets?.length) await db.my_sets.bulkPut(data.my_sets)
  })
}
