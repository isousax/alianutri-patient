import { Image } from 'expo-image'

const SOURCE = require('../../../assets/images/xp-up.png')

export function XPUpIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={SOURCE}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={200}
      accessibilityLabel="Nutrition Plan"
    />
  )
}