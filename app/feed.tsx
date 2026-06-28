import { Redirect } from 'expo-router'

// O feed virou a aba "Diário" (app/(tabs)/diary.tsx) no P0.4.
// Mantemos esta rota como redirect p/ não quebrar deep links antigos.
export default function FeedRedirect() {
  return <Redirect href="/(tabs)/diary" />
}
