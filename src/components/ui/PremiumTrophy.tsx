import LottieView from 'lottie-react-native'

const SOURCE = require('../../../assets/lottie/premium.json')

/** Premium trophy animation — plays once by default. */
export function PremiumTrophy({ size = 72, loop = false }: { size?: number; loop?: boolean }) {
  return (
    <LottieView
      source={SOURCE}
      autoPlay
      loop={loop}
      style={{ width: size, height: size }}
    />
  )
}
