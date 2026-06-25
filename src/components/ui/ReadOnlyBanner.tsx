import { View, Text } from 'react-native'
import { Lock } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'

/**
 * Banner exibido quando o portal do paciente está em modo somente-leitura
 * (features.can_write === false — definido pelo plano do nutricionista).
 * Telas de escrita devem renderizar isto e desabilitar seus inputs/ações.
 */
export function ReadOnlyBanner({ message }: { message?: string }) {
  const t = useThemeColors()
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={message ?? 'Seu nutricionista configurou seu portal como somente leitura'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        marginHorizontal: SCREEN_PADDING,
        marginTop: space.sm,
        marginBottom: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        backgroundColor: t.warningLight,
        borderRadius: radius.lg,
      }}
    >
      <Lock size={16} color={t.warning} />
      <Text style={[typography.bodySm, { color: t.text, flex: 1 }]}>
        {message ?? 'Seu nutricionista configurou seu portal como somente leitura.'}
      </Text>
    </View>
  )
}
