import { useState } from 'react'
import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/stores/auth'
import { validateAccessCode } from '../src/services/api'

export default function LoginScreen() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)

  async function handleLogin() {
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Digite o código de acesso')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await validateAccessCode(trimmed)
      if (!result.valid) {
        setError(result.error || 'Código inválido ou expirado')
        return
      }

      setAuth(
        trimmed,
        {
          id: result.patient?.id || '',
          name: result.patient?.name || '',
          preferred_name: null,
          photo_url: result.patient?.photo_url || null,
        },
        {
          name: result.nutritionist?.name || '',
          photo_url: result.nutritionist?.photo_url || null,
        },
      )
      router.replace('/(tabs)')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Código inválido ou expirado'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="h-20 w-20 rounded-3xl bg-brand-600 items-center justify-center mb-4">
              <Text className="text-white text-3xl font-sans-bold">A</Text>
            </View>
            <Text className="text-2xl font-sans-bold text-slate-900">AliaPatient</Text>
            <Text className="text-sm text-slate-400 mt-1 font-sans">Seu acompanhamento nutricional</Text>
          </View>

          {/* Input */}
          <View className="mb-4">
            <Text className="text-sm font-sans-semibold text-slate-700 mb-2">Código de acesso</Text>
            <TextInput
              value={code}
              onChangeText={(t) => { setCode(t); setError('') }}
              placeholder="Digite o código recebido"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-base text-slate-900 font-sans"
              editable={!loading}
            />
            {error ? (
              <Text className="text-sm text-red-500 mt-2 font-sans">{error}</Text>
            ) : null}
          </View>

          {/* Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className={`rounded-2xl py-4 items-center ${loading ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-sans-semibold">Entrar</Text>
            )}
          </Pressable>

          <Text className="text-xs text-slate-400 text-center mt-6 font-sans">
            Peça o código de acesso ao seu nutricionista
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
