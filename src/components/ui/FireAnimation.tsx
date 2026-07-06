import LottieView from 'lottie-react-native'

const SOURCE = require('../../../assets/lottie/fire-animation.json')

/** Fire animation — plays once by default. */
export function FireAnimation({ size = 30, loop = false }: { size?: number; loop?: boolean }) {
  return (
    <LottieView
      source={SOURCE}
      autoPlay
      loop={loop}
      style={{ width: size, height: size, transform: [{ translateY: -size * 0.15 }] }}
    />
  )
}
