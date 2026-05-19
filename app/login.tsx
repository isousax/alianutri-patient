import { useState } from 'react'
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { KeyRound, ArrowRight, ShieldCheck } from 'lucide-react-native'
import { Image } from 'expo-image'
import { useAuthStore } from '../src/stores/auth'
import { validateAccessCode } from '../src/services/api'
import { colors } from '../src/theme/colors'

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
    <View className="flex-1 bg-brand-900">
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* ── Dark header with decorative elements ── */}
          <View className="items-center pt-14 pb-10 relative overflow-hidden">
            {/* Decorative circles */}
            <View
              className="absolute rounded-full bg-white"
              style={{ width: 180, height: 180, top: -60, right: -40, opacity: 0.04 }}
            />
            <View
              className="absolute rounded-full bg-white"
              style={{ width: 120, height: 120, top: 30, left: -30, opacity: 0.03 }}
            />
            <View
              className="absolute rounded-full bg-brand-400"
              style={{ width: 8, height: 8, top: 24, right: 60, opacity: 0.3 }}
            />
            <View
              className="absolute rounded-full bg-brand-300"
              style={{ width: 6, height: 6, bottom: 30, left: 50, opacity: 0.25 }}
            />

            {/* Logo */}
            <Animated.View entering={FadeInDown.duration(600).delay(200)} className="items-center">
              <Image
                source={require('../assets/logoBlack.svg')}
                style={{ width: 160, height: 48, tintColor: '#fff' }}
                contentFit="contain"
                className="mb-5"
              />    
              <Text className="text-brand-300 text-sm font-sans mt-1">
                Seu acompanhamento nutricional
              </Text>
            </Animated.View>
          </View>

          {/* ── White card form ── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(400)}
            className="flex-1 bg-white px-7 pt-10"
            style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
          >
            <Text className="text-xl font-sans-bold text-slate-900 mb-1">
              Bem-vindo!
            </Text>
            <Text className="text-sm font-sans text-slate-400 mb-8">
              Digite o código de acesso fornecido pelo seu nutricionista.
            </Text>

            {/* Input with icon */}
            <View className="mb-5">
              <View
                className="flex-row items-center bg-slate-50 rounded-2xl px-4"
                style={{ borderWidth: 1, borderColor: error ? colors.brand[600] : '#e2e8f0' }}
              >
                <KeyRound size={18} color={error ? colors.brand[600] : colors.slate[400]} />
                <TextInput
                  value={code}
                  onChangeText={(t) => { setCode(t); setError('') }}
                  placeholder="Código de acesso"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 ml-3 py-4 text-base text-slate-900 font-sans"
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
              </View>
              {error ? (
                <Text className="text-sm text-red-500 mt-2 ml-1 font-sans">{error}</Text>
              ) : null}
            </View>

            {/* Button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              className={`rounded-2xl py-4 flex-row items-center justify-center ${loading ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
              style={{
                shadowColor: '#16a34a',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text className="text-white text-base font-sans-semibold mr-2">Entrar</Text>
                  <ArrowRight size={18} color="#fff" />
                </>
              )}
            </Pressable>

            {/* Trust badge */}
            <View className="flex-row items-center justify-center mt-8">
              <ShieldCheck size={14} color={colors.slate[400]} />
              <Text className="text-xs text-slate-400 ml-1.5 font-sans">
                Acesso seguro e criptografado
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
