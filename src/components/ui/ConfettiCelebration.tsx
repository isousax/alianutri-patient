import { View } from 'react-native'
import LottieView from 'lottie-react-native'

const SOURCE = require('../../../assets/lottie/Confetti.json')

/** Full-screen one-shot confetti overlay used to celebrate the completed day. */
export function ConfettiCelebration() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
    >
      <LottieView
        source={SOURCE}
        autoPlay
        loop={false}
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  )
}
