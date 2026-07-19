import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { portalApi } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { router } from 'expo-router'

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

  // Deep-link: tocar numa notificação (curtida/comentário do nutri) abre o post.
  useEffect(() => {
    if (isExpoGo) return
    let cancelled = false
    let sub: { remove: () => void } | undefined
    const openFromData = (data: unknown) => {
      const type = (data as { type?: unknown } | null)?.type
      if (type === 'lab_order') { router.push('/lab-orders' as never); return }
      if (type === 'emitted_document') { router.push('/documents' as never); return }
      const postId = (data as { postId?: unknown } | null)?.postId
      if (typeof postId === 'string') { router.push(`/post/${postId}` as never); return }
      const screen = (data as { screen?: unknown } | null)?.screen
      if (screen === 'diary') router.push('/diary')
    }
    ;(async () => {
      const Notifications = await import('expo-notifications')
      const last = await Notifications.getLastNotificationResponseAsync()
      if (!cancelled && last) {
        // pequeno delay pra garantir a árvore de navegação montada (cold start)
        setTimeout(() => openFromData(last.notification.request.content.data), 500)
      }
      if (cancelled) return
      sub = Notifications.addNotificationResponseReceivedListener((resp) => {
        openFromData(resp.notification.request.content.data)
      })
    })().catch(() => {})
    return () => {
      cancelled = true
      sub?.remove()
    }
  }, [])
}
