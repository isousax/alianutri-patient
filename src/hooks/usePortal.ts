import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '../services/api'
import type {
  PortalHome,
  PortalProfile,
  PortalMealPlanSummary,
  PortalMealPlanDetail,
  PortalGuidelineSummary,
  PortalGuidelineDetail,
  PortalQuestionnaire,
  PortalGoal,
  PortalFoodDiaryEntry,
  PortalAppointment,
  PortalEvolution,
} from '../types/portal'

export function usePortalHome() {
  return useQuery({
    queryKey: ['portal', 'home'],
    queryFn: () => portalApi.get<PortalHome>('/home'),
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
    }) => portalApi.post<{ id: string; message: string }>('/food-diary', entry),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'food-diary'] })
    },
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
