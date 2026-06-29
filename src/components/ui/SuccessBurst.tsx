import LottieView from 'lottie-react-native'

const SOURCE = require('../../../assets/lottie/success-confetti.json')

/** One-shot success burst (check + confetti). */
export function SuccessBurst({ size = 40, loop = false }: { size?: number; loop?: boolean }) {
  return (
    <LottieView
      source={SOURCE}
      autoPlay
      loop={loop}
      style={{ width: size, height: size }}
    />
  )
}
