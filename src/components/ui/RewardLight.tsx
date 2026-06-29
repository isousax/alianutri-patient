import { View, StyleSheet } from 'react-native'
import LottieView from 'lottie-react-native'

const SOURCE = require('../../../assets/lottie/reward-light-effect.json')

/**
 * Looping light burst, absolutely centered behind its siblings.
 * The parent must be positioned (relative) and sized; the light overflows it.
 */
export function RewardLight({ size = 160 }: { size?: number }) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <LottieView source={SOURCE} autoPlay loop style={{ width: size, height: size }} />
    </View>
  )
}
