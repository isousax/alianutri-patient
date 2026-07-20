import type { ObjectiveProfilePayload } from '../domain/objectiveProfiles'

// ==========================================
// Home — GET /p/:code/home
// ==========================================

export interface PortalSupplementItem {
  name: string
  dose: string
  timing: string
  frequency: string
  cycling: string | null
  notes: string | null
}

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
    status: AppointmentStatus
    meeting_provider: string | null
    meeting_url: string | null
    location: PortalLocationSnapshot | null
  } | null
  diary_streak: number
  logged_dates: string[]
  gamification_enabled?: boolean
  supplementation_enabled?: boolean
  supplements?: { items: PortalSupplementItem[]; notes: string | null } | null
  chat_unread: number
  pending_questionnaires: number
  features?: {
    can_write: boolean
    ai_meal_analysis?: { limit: number; used: number; period: 'day' }
  }
  /** Perfil de Acompanhamento (F5): objetivo efetivo + semântica de peso concreta. */
  objective_profile?: ObjectiveProfilePayload | null
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
  status: 'published' | 'accepted' | 'superseded'
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
  total_fiber_g: number | null
  meals: unknown[]
  notes: string | null
  shopping_list: string | null
  payload: unknown | null
}

// ==========================================
// Guidelines — GET /p/:code/guidelines
// ==========================================

// ── Shapes das refeições por método (espelha o que o web/back produz) ──
export interface QuantFoodSubstitute { name?: string; quantity?: string | number; unit?: string }
export interface QuantFood { name?: string; food_description?: string; quantity?: string | number; unit?: string; kcal?: number; measure?: { label: string; grams: number }; substitutes?: QuantFoodSubstitute[] }
export interface QuantMeal { name?: string; time?: string; foods?: QuantFood[] }
export interface EquivGroupFood { name: string; measure?: string }
export interface EquivGroup { group?: string; groupLabel?: string; portions: number; kcal?: number; foods?: EquivGroupFood[] }
export interface EquivMeal { name?: string; time?: string; groups?: EquivGroup[]; note?: string }
export interface QualMeal { name?: string; time?: string; guidance?: string; items?: (string | { description: string })[] }
export type PortalMeal = QuantMeal | EquivMeal | QualMeal

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
// Documents — GET /p/:code/documents (compartilhados pelo nutri)
// ==========================================

export interface PortalDocumentSummary {
  id: string
  name: string
  type: string
  created_at: string
  shared_at: string | null
}

// GET /p/:code/documents/:id
export interface PortalDocumentDetail extends PortalDocumentSummary {
  content_html: string
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

export interface PortalQuestionItem {
  text: string
  type: 'text' | 'select' | 'boolean' | 'scale'
  options?: string[]
  required?: boolean
}

export interface PortalQuestionnaireDetail extends PortalQuestionnaire {
  questions: PortalQuestionItem[]
  responses: Record<string, unknown> | null
}

// ==========================================
// Goals — GET /p/:code/goals
// ==========================================

export interface PortalHabit {
  cadence: 'daily' | 'weekly'
  per_week?: number
  checkins: string[]
}

/** Progresso canônico calculado no servidor (fonte única web/app). */
export interface PortalGoalProgress {
  pct: number | null
  remaining: number | null
  reached: boolean
}

export interface PortalGoal {
  habit?: PortalHabit | null
  progress?: PortalGoalProgress | null
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
  updated_at: string | null
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
  updated_at: string | null
}

// ==========================================
// Diary Today — GET /p/:code/diary/today
// ==========================================

export interface DiaryTimelineMeal {
  meal_index: number
  meal_name: string
  meal_time: string
  /** Tipo derivado no servidor a partir do plano (nome/horário ou type explícito). */
  meal_type: PortalFoodDiaryEntry['meal_type']
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

export interface PortalLocationSnapshot {
  id: string
  type: 'ONLINE' | 'PHYSICAL'
  name: string
  address: string | null
}

export type AppointmentStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'completed'
  | 'no_show'
  | 'canceled'
  | 'pending_approval'

export interface PortalAppointment {
  id: string
  starts_at: string
  ends_at: string
  type: 'online' | 'in_person'
  status: AppointmentStatus
  meeting_provider: string | null
  meeting_url: string | null
  location: PortalLocationSnapshot | null
  notes: string | null
}

// ==========================================
// Booking Config — GET /p/:code/booking/config
// ==========================================

export interface BookingLocationItem {
  id: string
  type: 'ONLINE' | 'PHYSICAL'
  name: string
  address: string | null
  enabled_days: number[]
}

export interface ModeStatusEntry {
  enabled: boolean
  bookable: boolean
  reason?: string
}

export interface BookingConfig {
  name: string
  photo_url: string | null
  specialty: string | null
  crn: string | null
  state: string | null
  phone_professional: string | null
  booking_mode: 'direct' | 'approval' | 'disabled'
  consultation_mode: 'online' | 'in_person' | 'both' | null
  mode_status: {
    online: ModeStatusEntry
    in_person: ModeStatusEntry
  }
  consultation_duration_minutes: number
  consultation_price_cents: number | null
  locations: BookingLocationItem[]
  enabled_days: number[]
  enabled_days_online: number[]
  enabled_days_in_person: number[]
}

// ==========================================
// Booking Slots — GET /p/:code/booking/slots
// ==========================================

export interface BookingSlot {
  time: string
  available: boolean
}

export interface BookingSlotsResponse {
  date: string
  duration_minutes: number
  slots: BookingSlot[]
}

// ==========================================
// Booking Request — POST /p/:code/booking/request
// ==========================================

export interface BookingRequestInput {
  date: string
  start_time: string
  type: 'online' | 'in_person'
  location_id?: string
  notes?: string
}

export interface BookingRequestResponse {
  id: string
  status: string
  message: string
}

// ==========================================
// Chat — GET/POST /p/:code/chat
// ==========================================

export type ChatSenderType = 'nutritionist' | 'patient'

export interface ChatMessage {
  id: string
  sender_type: ChatSenderType
  content: string
  read_at: string | null
  created_at: string
}

export interface ChatMessagesResponse {
  messages: ChatMessage[]
  has_more: boolean
}

// ==========================================
// Water Intake — GET/POST /p/:code/water
// ==========================================

export type WaterGoalSource = 'nutri' | 'baseline' | 'default'

export interface WaterIntakeResponse {
  date: string
  goal_ml: number
  goal_source: WaterGoalSource
  total_ml: number
  entries: { id: string; amount_ml: number; created_at: string }[]
}

// ==========================================
// Weight Log — POST /p/:code/weight
// ==========================================

export interface WeightLogEntry {
  entry_date: string
  weight_kg: number
  source: string
}

export interface WeightHistoryResponse {
  entries: WeightLogEntry[]
}

// ==========================================
// Symptoms — GET/POST /p/:code/symptoms
// ==========================================

export interface SymptomLog {
  id: string
  entry_date: string
  energy_level: number | null
  digestion: number | null
  bloating: number | null
  mood: number | null
  sleep_quality: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SymptomLogInput {
  id?: string
  date: string
  energy_level?: number
  digestion?: number
  bloating?: number
  mood?: number
  sleep_quality?: number
  notes?: string
}

// ==========================================
// Progress Photos — GET/POST /p/:code/progress-photos
// ==========================================

export interface ProgressPhoto {
  id: string
  photo_date: string
  category: 'front' | 'side' | 'back' | 'other'
  notes: string | null
  created_at: string
}

export interface ProgressPhotosResponse {
  photos: ProgressPhoto[]
}


// ==========================================
// Weekly Adherence — GET /p/:code/diary/weekly-adherence
// ==========================================

export interface WeeklyAdherenceDay {
  date: string
  logged: number
  total: number
}

export interface WeeklyAdherenceResponse {
  days: WeeklyAdherenceDay[]
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
  neck_cm: number | null
  chest_cm: number | null
  abdomen_cm: number | null
  arm_right_cm: number | null
  arm_left_cm: number | null
  forearm_right_cm: number | null
  forearm_left_cm: number | null
  thigh_right_cm: number | null
  thigh_left_cm: number | null
  calf_right_cm: number | null
  calf_left_cm: number | null
  skinfold_triceps: number | null
  skinfold_biceps: number | null
  skinfold_subscapular: number | null
  skinfold_suprailiac: number | null
  skinfold_abdominal: number | null
  skinfold_thigh: number | null
  skinfold_calf: number | null
  skinfold_chest: number | null
  skinfold_midaxillary: number | null
  protocol: string | null
  notes: string | null
  created_at: string
}

// ==========================================
// Diário / Feed social — GET/POST /p/:code/diary/posts
// ==========================================

export type DiaryPostType = 'meal' | 'diary'
export type DiaryAiStatus = 'pending' | 'completed' | 'failed' | 'skipped' | 'not_food' | 'partial'

export interface DiaryAiAnalysis {
  meal_name?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  confidence?: 'high' | 'medium' | 'low'
  items?: Array<{ name: string; portion_g: number; calories: number; protein_g: number; carbs_g: number; fat_g: number }>
  /** análise em texto livre (Gemini) quando a estruturação JSON falhou (partial) */
  raw_text?: string
}

export type ReactionEmoji = '❤️' | '👏' | '💪' | '🔥' | '⭐'

export interface DiaryPostReaction {
  emoji: ReactionEmoji
  author_type: string
}

export interface DiaryPostComment {
  id: string
  author_type: string
  comment_text: string
  created_at: string
}

export interface DiaryPost {
  id: string
  type: DiaryPostType
  has_photo: boolean
  caption: string | null
  emoji: string | null
  ai_status: DiaryAiStatus | null
  ai_analysis: DiaryAiAnalysis | null
  ai_error: string | null
  created_at: string
  reactions: DiaryPostReaction[]
  comments: DiaryPostComment[]
  /** post otimista (criado offline/enviando) — não veio do servidor ainda */
  _local?: boolean
  /** uri local da foto enquanto o post não sincronizou */
  _localPhotoUri?: string | null
}

export interface DiaryFeedResponse {
  posts: DiaryPost[]
  next_cursor: string | null
}

export interface ChartsSummary {
  nutrition: Array<{ date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }>
  water: Array<{ date: string; total_ml: number }>
  wellness: Array<{ date: string; energy: number }>
  counts: { meal_photos: number; diary_posts: number; nutri_reactions: number; nutri_comments: number }
}

// ==========================================
// Lab — status de faixa (compartilhado pelos laudos)
// ==========================================

export type LabRangeStatus = 'within' | 'outside' | 'unknown'
