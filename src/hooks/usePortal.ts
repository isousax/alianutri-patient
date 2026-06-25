import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { portalApi } from '../services/api'
import { compressImage } from '../lib/compressImage'
import { generateImageVariants } from '../lib/imageVariants'
import { useXpToast } from '../stores/xpToast'
import { todayISO } from '../lib/habit'
import type {
  PortalHome,
  PortalProfile,
  PortalMealPlanSummary,
  PortalMealPlanDetail,
  PortalGuidelineSummary,
  PortalGuidelineDetail,
  PortalDocumentSummary,
  PortalDocumentDetail,
  PortalQuestionnaire,
  PortalQuestionnaireDetail,
  PortalGoal,
  PortalFoodDiaryEntry,
  PortalAppointment,
  PortalEvolution,
  DiaryTodayResponse,
  DiaryStreakResponse,
  BookingConfig,
  BookingSlotsResponse,
  BookingRequestInput,
  BookingRequestResponse,
  ChatMessage,
  ChatMessagesResponse,
  WaterIntakeResponse,
  WeightHistoryResponse,
  SymptomLog,
  SymptomLogInput,
  ProgressPhotosResponse,
  WeeklyAdherenceResponse,
  DiaryPost,
  DiaryFeedResponse,
  DiaryPostType,
  ChartsSummary,
} from '../types/portal'

export function usePortalHome() {
  return useQuery({
    queryKey: ['portal', 'home'],
    queryFn: () => portalApi.get<PortalHome>('/home'),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePortalProfile() {
  return useQuery({
    queryKey: ['portal', 'profile'],
    queryFn: () => portalApi.get<PortalProfile>('/profile'),
  })
}

export function useMealPlans() {
  return useQuery({
    queryKey: ['portal', 'meal-plans'],
    queryFn: () => portalApi.get<PortalMealPlanSummary[]>('/meal-plans'),
  })
}

export function useMealPlanDetail(planId: string | null) {
  return useQuery({
    queryKey: ['portal', 'meal-plans', planId],
    queryFn: () => portalApi.get<PortalMealPlanDetail>(`/meal-plans/${planId}`),
    enabled: !!planId,
  })
}

export function useGuidelines() {
  return useQuery({
    queryKey: ['portal', 'guidelines'],
    queryFn: () => portalApi.get<PortalGuidelineSummary[]>('/guidelines'),
  })
}

export function useGuidelineDetail(id: string | null) {
  return useQuery({
    queryKey: ['portal', 'guidelines', id],
    queryFn: () => portalApi.get<PortalGuidelineDetail>(`/guidelines/${id}`),
    enabled: !!id,
  })
}

export function useDocuments() {
  return useQuery({
    queryKey: ['portal', 'documents'],
    queryFn: () => portalApi.get<PortalDocumentSummary[]>('/documents'),
  })
}

export function useDocumentDetail(id: string | null) {
  return useQuery({
    queryKey: ['portal', 'documents', id],
    queryFn: () => portalApi.get<PortalDocumentDetail>(`/documents/${id}`),
    enabled: !!id,
  })
}

export function useQuestionnaires() {
  return useQuery({
    queryKey: ['portal', 'questionnaires'],
    queryFn: () => portalApi.get<PortalQuestionnaire[]>('/questionnaires'),
  })
}

export function useGoals() {
  return useQuery({
    queryKey: ['portal', 'goals'],
    queryFn: () => portalApi.get<PortalGoal[]>('/goals'),
  })
}

export function useToggleGoalCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (goalId: string) =>
      portalApi.post<{ checked: boolean; checkins: string[]; message: string }>(`/goals/${goalId}/checkin`, {}),
    // Otimista: reflete o check-in de hoje na hora e reconcilia ao concluir.
    onMutate: async (goalId: string) => {
      await qc.cancelQueries({ queryKey: ['portal', 'goals'] })
      const prev = qc.getQueryData<PortalGoal[]>(['portal', 'goals'])
      const today = todayISO()
      qc.setQueryData<PortalGoal[]>(['portal', 'goals'], (old) =>
        (old ?? []).map((g) => {
          if (g.id !== goalId || !g.habit) return g
          const has = g.habit.checkins.includes(today)
          const checkins = has
            ? g.habit.checkins.filter((d) => d !== today)
            : [...g.habit.checkins, today].sort()
          return { ...g, habit: { ...g.habit, checkins } }
        }),
      )
      return { prev }
    },
    onError: (_err, _goalId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['portal', 'goals'], ctx.prev)
    },
    onSuccess: (data) => {
      if (data.checked) useXpToast.getState().show(15)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'goals'] })
    },
  })
}

export function useFoodDiary(date?: string) {
  return useQuery({
    queryKey: ['portal', 'food-diary', date ?? 'all'],
    queryFn: () => portalApi.get<PortalFoodDiaryEntry[]>(date ? `/food-diary?date=${date}` : '/food-diary'),
  })
}

export function useLogFoodDiary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entry: {
      id?: string
      meal_type: string
      entry_date: string
      entry_time?: string
      food_description: string
      quantity_g?: number
      energy_kcal?: number
      protein_g?: number
      carbs_g?: number
      fat_g?: number
      notes?: string
      compliance_status?: string
      meal_plan_id?: string
      meal_index?: number
      photo_url?: string
    }) => portalApi.post<PortalFoodDiaryEntry>('/food-diary', entry),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'food-diary'] })
      qc.invalidateQueries({ queryKey: ['portal', 'diary-today'] })
      qc.invalidateQueries({ queryKey: ['portal', 'diary-streak'] })
    },
  })
}

export function useDeleteFoodDiary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) =>
      portalApi.delete<{ message: string }>(`/food-diary/${entryId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'food-diary'] })
      qc.invalidateQueries({ queryKey: ['portal', 'diary-today'] })
      qc.invalidateQueries({ queryKey: ['portal', 'diary-streak'] })
    },
  })
}

export function useUploadDiaryPhoto() {
  return useMutation({
    mutationFn: async (uri: string) => {
      const compressed = await compressImage(uri)
      const fd = new FormData()
      fd.append('photo', {
        uri: compressed,
        type: 'image/jpeg',
        name: 'diary-photo.jpg',
      } as unknown as Blob)
      return portalApi.upload<{ photo_url: string }>('/diary/upload-photo', fd)
    },
  })
}

// ===== Diário/Feed social =====

export function useDiaryFeed() {
  return useInfiniteQuery({
    queryKey: ['portal', 'diary-posts'],
    queryFn: ({ pageParam }) =>
      portalApi.get<DiaryFeedResponse>(
        `/diary/posts?limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    // Polla enquanto houver post em análise (IA pending); para quando todos resolvem.
    refetchInterval: (query) =>
      query.state.data?.pages.some((pg) => pg.posts.some((p) => p.ai_status === 'pending')) ? 5000 : false,
  })
}

export interface CreatePostInput {
  type: DiaryPostType
  photoUri?: string
  caption?: string
  emoji?: string
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    // offlineFirst: publica otimisticamente e envia quando reconectar (com NetInfo).
    networkMode: 'offlineFirst',
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
    mutationFn: async (input: CreatePostInput) => {
      const fd = new FormData()
      fd.append('type', input.type)
      if (input.caption) fd.append('caption', input.caption)
      if (input.emoji) fd.append('emoji', input.emoji)
      if (input.photoUri) {
        // 3 variantes geradas no app (sem Cloudflare Image Resizing).
        const variants = await generateImageVariants(input.photoUri)
        fd.append('photo_original', { uri: variants.original.uri, type: 'image/jpeg', name: 'original.jpg' } as unknown as Blob)
        fd.append('photo_medium', { uri: variants.medium.uri, type: 'image/jpeg', name: 'medium.jpg' } as unknown as Blob)
        fd.append('photo_thumb', { uri: variants.thumb.uri, type: 'image/jpeg', name: 'thumb.jpg' } as unknown as Blob)
      }
      return portalApi.upload<DiaryPost>('/diary/posts', fd)
    },
    onMutate: async (input: CreatePostInput) => {
      await qc.cancelQueries({ queryKey: ['portal', 'diary-posts'] })
      const previous = qc.getQueryData(['portal', 'diary-posts'])
      const optimistic: DiaryPost = {
        id: `temp-${Date.now()}`,
        type: input.type,
        has_photo: !!input.photoUri,
        caption: input.caption ?? null,
        emoji: input.emoji ?? null,
        ai_status: input.type === 'meal' && input.photoUri ? 'pending' : null,
        ai_analysis: null,
        ai_error: null,
        created_at: new Date().toISOString(),
        reactions: [],
        comments: [],
        _local: true,
        _localPhotoUri: input.photoUri ?? null,
      }
      qc.setQueryData<InfiniteData<DiaryFeedResponse>>(['portal', 'diary-posts'], (old) => {
        if (!old?.pages?.length) {
          return { pages: [{ posts: [optimistic], next_cursor: null }], pageParams: [undefined] }
        }
        const pages = old.pages.map((pg, i) => (i === 0 ? { ...pg, posts: [optimistic, ...pg.posts] } : pg))
        return { ...old, pages }
      })
      return { previous }
    },
    onError: (_err, _input, context) => {
      const prev = (context as { previous?: unknown } | undefined)?.previous
      if (prev !== undefined) qc.setQueryData(['portal', 'diary-posts'], prev)
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['portal', 'diary-streak'] })
      // Recompensa visual: refeição com foto (entra na IA) vale mais
      useXpToast.getState().show(variables.type === 'meal' && variables.photoUri ? 25 : 10)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'diary-posts'] })
      qc.invalidateQueries({ queryKey: ['portal', 'diary-recent'] })
    },
  })
}

export function useUpdatePostType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: DiaryPostType }) =>
      portalApi.patch<DiaryPost>(`/diary/posts/${postId}`, { type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'diary-posts'] })
      qc.invalidateQueries({ queryKey: ['portal', 'diary-recent'] })
    },
  })
}

export function useRecentPosts(limit = 3) {
  return useQuery({
    queryKey: ['portal', 'diary-recent', limit],
    queryFn: () => portalApi.get<DiaryFeedResponse>(`/diary/posts?limit=${limit}`),
    staleTime: 60_000,
  })
}

export function usePostDetail(postId: string | null) {
  return useQuery({
    queryKey: ['portal', 'diary-post', postId],
    queryFn: () => portalApi.get<DiaryPost>(`/diary/posts/${postId}`),
    enabled: !!postId,
    // Polling enquanto a IA processa a análise
    refetchInterval: (query) => (query.state.data?.ai_status === 'pending' ? 2500 : false),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => portalApi.delete<{ message: string }>(`/diary/posts/${postId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'diary-posts'] })
    },
  })
}

export function useChartsSummary(days = 90) {
  return useQuery({
    queryKey: ['portal', 'charts-summary', days],
    queryFn: () => portalApi.get<ChartsSummary>(`/diary/charts-summary?days=${days}`),
  })
}

export function useDiaryToday(date: string) {
  return useQuery({
    queryKey: ['portal', 'diary-today', date],
    queryFn: () => portalApi.get<DiaryTodayResponse>(`/diary/today?date=${date}`),
  })
}

export function useDiaryStreak() {
  return useQuery({
    queryKey: ['portal', 'diary-streak'],
    queryFn: () => portalApi.get<DiaryStreakResponse>('/diary/streak'),
  })
}

export function useWeeklyAdherence() {
  return useQuery({
    queryKey: ['portal', 'weekly-adherence'],
    queryFn: () => portalApi.get<WeeklyAdherenceResponse>('/diary/weekly-adherence'),
  })
}


export function useQuestionnaireDetail(qId: string | null) {
  return useQuery({
    queryKey: ['portal', 'questionnaire-detail', qId],
    queryFn: () => portalApi.get<PortalQuestionnaireDetail>(`/questionnaires/${qId}`),
    enabled: !!qId,
  })
}

export function useAnswerQuestionnaire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ qId, responses }: { qId: string; responses: unknown }) =>
      portalApi.post<{ message: string }>(`/questionnaires/${qId}/answer`, { responses }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'questionnaires'] })
    },
  })
}

export function useAppointments() {
  return useQuery({
    queryKey: ['portal', 'appointments'],
    queryFn: () => portalApi.get<PortalAppointment[]>('/appointments'),
  })
}

export function useEvolution() {
  return useQuery({
    queryKey: ['portal', 'evolution'],
    queryFn: () => portalApi.get<PortalEvolution[]>('/evolution'),
  })
}

export function useBookingConfig() {
  return useQuery({
    queryKey: ['portal', 'booking-config'],
    queryFn: () => portalApi.get<BookingConfig>('/booking/config'),
  })
}

export function useBookingSlots(date: string | null, locationId?: string) {
  return useQuery({
    queryKey: ['portal', 'booking-slots', date, locationId],
    queryFn: () => {
      const params = new URLSearchParams({ date: date! })
      if (locationId) params.set('location_id', locationId)
      return portalApi.get<BookingSlotsResponse>(`/booking/slots?${params}`)
    },
    enabled: !!date,
  })
}

export function useRequestBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BookingRequestInput) =>
      portalApi.post<BookingRequestResponse>('/booking/request', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'appointments'] })
      qc.invalidateQueries({ queryKey: ['portal', 'home'] })
    },
  })
}

// ==========================================
// Chat
// ==========================================

export function useChatMessages() {
  return useInfiniteQuery({
    queryKey: ['portal', 'chat'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '30' })
      if (pageParam) params.set('cursor', pageParam as string)
      return portalApi.get<ChatMessagesResponse>(`/chat?${params}`)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more || lastPage.messages.length === 0) return undefined
      return lastPage.messages[lastPage.messages.length - 1].created_at
    },
    refetchInterval: 10_000,
  })
}

export function useSendChatMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      portalApi.post<ChatMessage>('/chat', { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'chat'] })
    },
  })
}

export function useChatUnreadCount() {
  return useQuery({
    queryKey: ['portal', 'chat-unread'],
    queryFn: () => portalApi.get<{ unread: number }>('/chat/unread-count'),
    refetchInterval: 15_000,
  })
}

// ==========================================
// Water Intake
// ==========================================

export function useWaterIntake(date: string) {
  return useQuery({
    queryKey: ['portal', 'water', date],
    queryFn: () => portalApi.get<WaterIntakeResponse>(`/water?date=${date}`),
  })
}

export function useLogWater() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id?: string; date: string; amount_ml: number }) =>
      portalApi.post<{ id: string; entry_date: string; amount_ml: number; created_at: string; total_ml: number }>('/water', input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['portal', 'water', vars.date] })
      qc.invalidateQueries({ queryKey: ['portal', 'home'] })
    },
  })
}

export function useDeleteWater() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) =>
      portalApi.delete<{ message: string }>(`/water/${entryId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'water'] })
    },
  })
}

// ==========================================
// Weight Log
// ==========================================

export function useLogWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id?: string; date: string; weight_kg: number }) =>
      portalApi.post<{ id: string; entry_date: string; weight_kg: number; source: string; created_at: string }>('/weight', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'weight-history'] })
      qc.invalidateQueries({ queryKey: ['portal', 'evolution'] })
      qc.invalidateQueries({ queryKey: ['portal', 'home'] })
      qc.invalidateQueries({ queryKey: ['portal', 'profile'] })
      useXpToast.getState().show(10)
    },
  })
}

export function useWeightHistory() {
  return useQuery({
    queryKey: ['portal', 'weight-history'],
    queryFn: () => portalApi.get<WeightHistoryResponse>('/weight/history'),
  })
}

// ==========================================
// Symptoms
// ==========================================

export function useSymptoms(date: string) {
  return useQuery({
    queryKey: ['portal', 'symptoms', date],
    queryFn: () => portalApi.get<SymptomLog | null>(`/symptoms?date=${date}`),
  })
}

export function useLogSymptoms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SymptomLogInput) =>
      portalApi.post<SymptomLog>('/symptoms', input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['portal', 'symptoms', vars.date] })
      useXpToast.getState().show(10)
    },
  })
}

// ==========================================
// Progress Photos
// ==========================================

export function useProgressPhotos() {
  return useQuery({
    queryKey: ['portal', 'progress-photos'],
    queryFn: () => portalApi.get<ProgressPhotosResponse>('/progress-photos'),
  })
}

export function useDeleteProgressPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoId: string) =>
      portalApi.delete<{ message: string }>(`/progress-photos/${photoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'progress-photos'] })
    },
  })
}

export function useUploadProgressPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { uri: string; category: string; notes?: string; photo_date?: string }) => {
      const compressed = await compressImage(input.uri)
      const fd = new FormData()
      fd.append('photo', {
        uri: compressed,
        type: 'image/jpeg',
        name: 'progress-photo.jpg',
      } as unknown as Blob)
      fd.append('category', input.category)
      if (input.notes) fd.append('notes', input.notes)
      if (input.photo_date) fd.append('photo_date', input.photo_date)
      return portalApi.upload<{ id: string; message: string }>('/progress-photos', fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'progress-photos'] })
    },
  })
}
