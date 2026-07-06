import { Image } from 'expo-image'

const SOURCE_ACTIVE = require('../../../assets/images/nutrition-plan-active.png')
const SOURCE_SUBSTITUTED = require('../../../assets/images/nutrition-plan-substituted.png')

/** Nutrition plan image. Transparent PNG rendered via expo-image. */
export function NutritionPlan({ size = 56, isSubstituted = false }: { size?: number; isSubstituted?: boolean }) {
  return (
    <Image
      source={isSubstituted ? SOURCE_SUBSTITUTED : SOURCE_ACTIVE}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={200}
      accessibilityLabel="Nutrition Plan"
    />
  )
}
