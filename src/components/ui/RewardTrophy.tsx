import { View } from 'react-native'
import { RewardLight } from './RewardLight'
import { PremiumTrophy } from './PremiumTrophy'

/** Looping light burst behind a premium trophy — the "big win" hero icon. */
export function RewardTrophy({ size = 72, lightScale = 2.2 }: { size?: number; lightScale?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <RewardLight size={Math.round(size * lightScale)} />
      <PremiumTrophy size={size} />
    </View>
  )
}
