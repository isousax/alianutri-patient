import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '../src/stores/theme'
import { ScreenHeader } from '../src/components/ui'
import { ProgressView } from '../src/components/progress/ProgressView'

// "Minha Evolução" (rota de stack). O conteúdo dos gráficos foi extraído para
// src/components/progress/ProgressView e é compartilhado com o segmento
// "Progresso" do Diário (P1) — fonte única, sem duplicar a lógica.
export default function EvolutionScreen() {
  const t = useThemeColors()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Minha Evolução" />
      <ProgressView />
    </SafeAreaView>
  )
}
