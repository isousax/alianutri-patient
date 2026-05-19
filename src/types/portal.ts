// ==========================================
// Home — GET /p/:code/home
// ==========================================

export interface PortalHome {
  patient: { id: string; name: string; photo_url: string | null }
  nutritionist: { name: string; photo_url: string | null } | null
  active_meal_plan: PortalMealPlanSummary | null
  guidelines_count: number
  next_appointment: {
    id: string
    starts_at: string
    ends_at: string
    type: 'online' | 'in_person'
    meeting_provider: string | null
  } | null
}

// ==========================================
// Profile — GET /p/:code/profile
// ==========================================

export interface PortalProfile {
  id: string
  name: string
  preferred_name: string | null
  birth_date: string | null
  phone: string
  email: string | null
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  profile_photo_url: string | null
  created_at: string
}

// ==========================================
// Meal Plans — GET /p/:code/meal-plans
// ==========================================

export interface PortalMealPlanSummary {
  id: string
  name: string
  method: 'quantitative' | 'equivalents' | 'qualitative'
  status: 'published' | 'accepted'
  target_kcal: number | null
  total_kcal: number | null
  valid_from: string | null
  valid_until: string | null
  published_at: string
  created_at: string
}

// GET /p/:code/meal-plans/:planId
export interface PortalMealPlanDetail extends PortalMealPlanSummary {
  target_protein_g: number | null
  target_carbs_g: number | null
  target_fat_g: number | null
  target_fiber_g: number | null
  total_protein_g: number | null
  total_carbs_g: number | null
  total_fat_g: number | null
  meals: unknown[]
  notes: string | null
  payload: unknown | null
}

// ==========================================
// Guidelines — GET /p/:code/guidelines
// ==========================================

export interface PortalGuidelineSummary {
  id: string
  title: string
  status: 'published'
  published_at: string
  created_at: string
}

// GET /p/:code/guidelines/:id
export interface PortalGuidelineDetail extends PortalGuidelineSummary {
  content: unknown
}

// ==========================================
// Questionnaires — GET /p/:code/questionnaires
// ==========================================

export interface PortalQuestionnaire {
  id: string
  title: string
  status: 'sent' | 'answered'
  sent_at: string | null
  expires_at: string | null
  created_at: string
}

// ==========================================
// Goals — GET /p/:code/goals
// ==========================================

export interface PortalGoal {
  id: string
  type: 'weight' | 'measurement' | 'behavioral' | 'nutritional' | 'lab_value' | 'custom'
  title: string
  status: 'active' | 'completed'
  priority: 'low' | 'medium' | 'high'
  target_value: number | null
  current_value: number | null
  target_unit: string | null
  due_date: string | null
  created_at: string
}

// ==========================================
// Food Diary — GET /p/:code/food-diary
// ==========================================

export interface PortalFoodDiaryEntry {
  id: string
  meal_type: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'supper' | 'other'
  entry_date: string
  entry_time: string | null
  food_description: string
  quantity_g: number | null
  energy_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  notes: string | null
  compliance_status: 'followed' | 'partial' | 'skipped' | 'photo_only' | null
  meal_plan_id: string | null
  meal_index: number | null
  photo_url: string | null
  created_at: string
}

// ==========================================
// Diary Today — GET /p/:code/diary/today
// ==========================================

export interface DiaryTimelineMeal {
  meal_index: number
  meal_name: string
  meal_time: string
  foods: { name: string; quantity?: string; [key: string]: unknown }[]
  entry: PortalFoodDiaryEntry | null
}

export interface DiaryTodayResponse {
  meal_plan: { id: string; name: string } | null
  meals: DiaryTimelineMeal[]
  entries: PortalFoodDiaryEntry[]
  date: string
}

// ==========================================
// Diary Streak — GET /p/:code/diary/streak
// ==========================================

export interface DiaryStreakResponse {
  streak: number
  logged_dates: string[]
}

// ==========================================
// Appointments — GET /p/:code/appointments
// ==========================================

export interface PortalAppointment {
  id: string
  starts_at: string
  ends_at: string
  type: 'online' | 'in_person'
  status: 'scheduled' | 'completed' | 'confirmed'
  meeting_provider: string | null
  meeting_url: string | null
  location: string | null
  notes: string | null
}

// ==========================================
// Evolution — GET /p/:code/evolution
// ==========================================

export interface PortalEvolution {
  id: string
  evaluation_date: string
  weight_kg: number | null
  height_cm: number | null
  bmi: number | null
  waist_cm: number | null
  hip_cm: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
  fat_mass_kg: number | null
  created_at: string
}
