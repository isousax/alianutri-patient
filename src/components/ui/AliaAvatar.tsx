import { Image } from 'expo-image'

const SOURCE = require('../../../assets/images/alia-avatar.png')

/** Alia mascot avatar (brand face). Transparent PNG rendered via expo-image. */
export function AliaAvatar({ size = 56 }: { size?: number }) {
  return (
    <Image
      source={SOURCE}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={200}
      accessibilityLabel="Alia"
    />
  )
}
