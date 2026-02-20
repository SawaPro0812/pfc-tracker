/**
 * PFC計算ユーティリティ
 * 基礎代謝: 国立健康・栄養研究所の式（Ganpule et al. 2007）
 */

// 活動係数
export const ACTIVITY_LEVELS = [
  { value: 'low',      label: '低い（ほぼ座り仕事）',       factor: 1.50 },
  { value: 'moderate', label: 'やや低い（週1〜2回運動）',   factor: 1.75 },
  { value: 'high',     label: '普通（週3〜5回運動）',       factor: 2.00 },
  { value: 'very_high',label: '高い（毎日ハードな運動）',   factor: 2.30 },
]

// 目標タイプ
export const GOAL_TYPES = [
  { value: 'cut',      label: '減量（カット）',    calAdjust: -500 },
  { value: 'maintain', label: '維持',              calAdjust: 0    },
  { value: 'bulk',     label: '増量（バルク）',    calAdjust: +350 },
]

/**
 * 基礎代謝量（BMR）を計算する
 * 国立健康・栄養研究所の式（Ganpule et al. 2007）
 * @param {number} weight - 体重（kg）
 * @param {number} height - 身長（cm）
 * @param {number} age    - 年齢
 * @param {'male'|'female'} gender - 性別
 * @returns {number} BMR（kcal/day）
 */
export function calcBMR(weight, height, age, gender) {
  const base = 0.0481 * weight + 0.0234 * height - 0.0138 * age
  const constant = gender === 'male' ? 0.4235 : 0.9708
  const bmr = (base - constant) * 1000 / 4.186
  return Math.round(bmr)
}

/**
 * 1日の総消費カロリー（TDEE）を計算する
 * @param {number} bmr
 * @param {string} activity_level
 * @returns {number} TDEE（kcal/day）
 */
export function calcTDEE(bmr, activity_level) {
  const level = ACTIVITY_LEVELS.find(l => l.value === activity_level)
  const factor = level ? level.factor : 1.75
  return Math.round(bmr * factor)
}

/**
 * 目標カロリーを計算する
 * @param {number} tdee
 * @param {string} goal
 * @returns {number} 目標カロリー（kcal/day）
 */
export function calcTargetCalories(tdee, goal) {
  const g = GOAL_TYPES.find(g => g.value === goal)
  const adjust = g ? g.calAdjust : 0
  return Math.max(1200, tdee + adjust)
}

/**
 * 目標PFCを計算する
 * タンパク質: 体重 × 係数（goal別）
 * 脂質: 総カロリーの25%
 * 炭水化物: 残り
 * @param {number} targetCalories
 * @param {number} weight
 * @param {string} goal
 * @returns {{ protein: number, fat: number, carb: number }}
 */
export function calcTargetPFC(targetCalories, weight, goal) {
  // タンパク質係数（g/kg体重）
  const proteinPerKg = goal === 'cut' ? 2.2 : goal === 'bulk' ? 2.0 : 1.8

  const protein = Math.round(weight * proteinPerKg)
  const fat = Math.round((targetCalories * 0.25) / 9)
  const proteinCal = protein * 4
  const fatCal = fat * 9
  const carb = Math.max(0, Math.round((targetCalories - proteinCal - fatCal) / 4))

  return { protein, fat, carb }
}

/**
 * 全計算を一括実行する
 */
export function calcAll({ weight, height, age, gender, activity_level, goal }) {
  const bmr = calcBMR(weight, height, age, gender)
  const tdee = calcTDEE(bmr, activity_level)
  const target_calories = calcTargetCalories(tdee, goal)
  const { protein, fat, carb } = calcTargetPFC(target_calories, weight, goal)
  return { bmr, tdee, target_calories, target_p: protein, target_f: fat, target_c: carb }
}

/**
 * PFCのカロリーに換算した割合を返す
 */
export function calcPFCRatios(protein, fat, carb) {
  const total = protein * 4 + fat * 9 + carb * 4
  if (total === 0) return { p: 0, f: 0, c: 0 }
  return {
    p: Math.round((protein * 4 / total) * 100),
    f: Math.round((fat * 9 / total) * 100),
    c: Math.round((carb * 4 / total) * 100),
  }
}
