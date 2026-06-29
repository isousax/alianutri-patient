import LottieView from 'lottie-react-native'

const SOURCE = require('../../../assets/lottie/SparklesLoopLoaderAI.json')

/** Looping sparkles animation shown while AI is working (e.g. calculando macros). */
export function AILoader({ size = 28 }: { size?: number }) {
  return (
    <LottieView
      source={SOURCE}
      autoPlay
      loop
      style={{ width: size, height: size }}
    />
  )
}
