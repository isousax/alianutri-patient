import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CODE_KEY = 'aliapatient_access_code'
const PATIENT_KEY = 'aliapatient_patient'
const NUTRI_KEY = 'aliapatient_nutritionist'

export interface PatientInfo {
  id: string
  name: string
  preferred_name: string | null
  photo_url: string | null
}

export interface NutritionistInfo {
  name: string
  photo_url: string | null
}

interface AuthState {
  accessCode: string | null
  patient: PatientInfo | null
  nutritionist: NutritionistInfo | null
  isHydrated: boolean
  setAuth: (code: string, patient: PatientInfo, nutritionist: NutritionistInfo) => void
  logout: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  accessCode: null,
  patient: null,
  nutritionist: null,
  isHydrated: false,

  setAuth: (code, patient, nutritionist) => {
    SecureStore.setItemAsync(CODE_KEY, code).catch(() => {})
    SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(patient)).catch(() => {})
    SecureStore.setItemAsync(NUTRI_KEY, JSON.stringify(nutritionist)).catch(() => {})
    set({ accessCode: code, patient, nutritionist })
  },

  logout: () => {
    SecureStore.deleteItemAsync(CODE_KEY).catch(() => {})
    SecureStore.deleteItemAsync(PATIENT_KEY).catch(() => {})
    SecureStore.deleteItemAsync(NUTRI_KEY).catch(() => {})
    AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE').catch(() => {})
    set({ accessCode: null, patient: null, nutritionist: null })
  },

  hydrate: async () => {
    try {
      const [code, patientRaw, nutriRaw] = await Promise.all([
        SecureStore.getItemAsync(CODE_KEY),
        SecureStore.getItemAsync(PATIENT_KEY),
        SecureStore.getItemAsync(NUTRI_KEY),
      ])
      const patient = patientRaw ? (JSON.parse(patientRaw) as PatientInfo) : null
      const nutritionist = nutriRaw ? (JSON.parse(nutriRaw) as NutritionistInfo) : null
      set({ accessCode: code, patient, nutritionist, isHydrated: true })
    } catch {
      set({ isHydrated: true })
    }
  },
}))
