import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { portalApi } from '../services/api'
import { useAuthStore } from '../stores/auth'

const isExpoGo = Constants.appOwnership === 'expo'

async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo) {
    console.log('[Push] Push notifications are not supported in Expo Go (SDK 53+). Use a development build.')
    return null
  }

  const Notifications = await import('expo-notifications')

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })

  if (!Device.isDevice) {
    console.log('[Push] Must use physical device')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted')
    return null
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  })

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  return tokenData.data
}

export function useNotifications() {
  const accessCode = useAuthStore((s) => s.accessCode)
  const registeredFor = useRef<string | null>(null)

  useEffect(() => {
    if (!accessCode || registeredFor.current === accessCode) return

    registerForPushNotifications()
      .then((token) => {
        if (token) {
          registeredFor.current = accessCode
          portalApi.post('/push-token', { push_token: token }).catch(console.error)
        }
      })
      .catch(console.error)
  }, [accessCode])
}
