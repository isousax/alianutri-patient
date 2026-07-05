import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { generateUuidV4 } from '../lib/deviceId'

const CODE_KEY = 'aliapatient_access_code'
const PATIENT_KEY = 'aliapatient_patient'
const NUTRI_KEY = 'aliapatient_nutritionist'
const SESSION_KEY = 'aliapatient_session_token'
const DEVICE_KEY = 'aliapatient_device_id'

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
  sessionToken: string | null
  deviceId: string | null
  requiresPairing: boolean
  setAuth: (code: string, patient: PatientInfo, nutritionist: NutritionistInfo, sessionToken?: string | null) => void
  setSessionToken: (token: string) => void
  requirePairing: () => void
  getOrCreateDeviceId: () => Promise<string>
  updatePatientPhoto: (photoUrl: string | null) => void
  logout: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessCode: null,
  patient: null,
  nutritionist: null,
  isHydrated: false,
  sessionToken: null,
  deviceId: null,
  requiresPairing: false,

  setAuth: (code, patient, nutritionist, sessionToken) => {
    SecureStore.setItemAsync(CODE_KEY, code).catch(() => {})
    SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(patient)).catch(() => {})
    SecureStore.setItemAsync(NUTRI_KEY, JSON.stringify(nutritionist)).catch(() => {})
    if (sessionToken) SecureStore.setItemAsync(SESSION_KEY, sessionToken).catch(() => {})
    set((s) => ({
      accessCode: code,
      patient,
      nutritionist,
      requiresPairing: false,
      sessionToken: sessionToken ?? s.sessionToken,
    }))
  },

  setSessionToken: (token) => {
    SecureStore.setItemAsync(SESSION_KEY, token).catch(() => {})
    set({ sessionToken: token, requiresPairing: false })
  },

  requirePairing: () => {
    SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {})
    set({ sessionToken: null, requiresPairing: true })
  },

  getOrCreateDeviceId: async () => {
    const existing = get().deviceId
    if (existing) return existing
    try {
      let id = await SecureStore.getItemAsync(DEVICE_KEY)
      if (!id) {
        id = generateUuidV4()
        await SecureStore.setItemAsync(DEVICE_KEY, id)
      }
      set({ deviceId: id })
      return id
    } catch {
      const fallback = generateUuidV4()
      set({ deviceId: fallback })
      return fallback
    }
  },

  updatePatientPhoto: (photoUrl) => {
    set((state) => {
      if (!state.patient) return state
      const patient = { ...state.patient, photo_url: photoUrl }
      SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(patient)).catch(() => {})
      return { patient }
    })
  },

  logout: () => {
    SecureStore.deleteItemAsync(CODE_KEY).catch(() => {})
    SecureStore.deleteItemAsync(PATIENT_KEY).catch(() => {})
    SecureStore.deleteItemAsync(NUTRI_KEY).catch(() => {})
    AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE').catch(() => {})
    SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {})
    set({ accessCode: null, patient: null, nutritionist: null, sessionToken: null, requiresPairing: false })
  },

  hydrate: async () => {
    try {
      const [code, patientRaw, nutriRaw, sessionToken, deviceId] = await Promise.all([
        SecureStore.getItemAsync(CODE_KEY),
        SecureStore.getItemAsync(PATIENT_KEY),
        SecureStore.getItemAsync(NUTRI_KEY),
        SecureStore.getItemAsync(SESSION_KEY),
        SecureStore.getItemAsync(DEVICE_KEY),
      ])
      const patient = patientRaw ? (JSON.parse(patientRaw) as PatientInfo) : null
      const nutritionist = nutriRaw ? (JSON.parse(nutriRaw) as NutritionistInfo) : null
      set({ accessCode: code, patient, nutritionist, sessionToken, deviceId, isHydrated: true })
    } catch {
      set({ isHydrated: true })
    }
  },
}))
