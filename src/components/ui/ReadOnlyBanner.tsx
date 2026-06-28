import { View, Text } from 'react-native'
import { Eye } from 'lucide-react-native'
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
      accessibilityLabel={message ?? 'Modo de acompanhamento: você pode ver tudo, mas o registro está pausado pelo seu nutricionista.'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        marginHorizontal: SCREEN_PADDING,
        marginTop: space.sm,
        marginBottom: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        backgroundColor: t.infoLight,
        borderRadius: radius.lg,
      }}
    >
      <Eye size={18} color={t.info} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.captionBold, { color: t.text }]}>Modo de acompanhamento</Text>
        <Text style={[typography.caption, { color: t.textSecondary, marginTop: 1 }]}>
          {message ?? 'Você acompanha tudo normalmente. Para voltar a registrar, fale com seu nutricionista.'}
        </Text>
      </View>
    </View>
  )
}
