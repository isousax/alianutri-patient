import { Image } from 'expo-image'

const MEDALHAS = {
  comecou: require('../../../assets/images/medalhas/comecou.png'),
  em_chamas: require('../../../assets/images/medalhas/em_chamas.png'),
  imparavel: require('../../../assets/images/medalhas/imparavel.png'),
  lenda: require('../../../assets/images/medalhas/lenda.png'),
  diario_fiel: require('../../../assets/images/medalhas/diario_fiel.png'),
  rotina_forte: require('../../../assets/images/medalhas/rotina_forte.png'),
  com_foco: require('../../../assets/images/medalhas/com_foco.png'),
  missao_cumprida: require('../../../assets/images/medalhas/missao_cumprida.png'),
  constancia: require('../../../assets/images/medalhas/constancia.png'),
  fotografo: require('../../../assets/images/medalhas/fotografo.png'),
  diarista: require('../../../assets/images/medalhas/diarista.png'),
  favorito_da_nutri: require('../../../assets/images/medalhas/favorito_do_nutri.png'),
} as const

export function MedalhasIcon({
  size = 56,
  medalha,
}: {
  size?: number
  medalha: string
}) {
  const key = medalha
    .toLowerCase()
    .replace(/\s+/g, '_') as keyof typeof MEDALHAS

  const source = MEDALHAS[key] ?? MEDALHAS.comecou

  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={200}
      accessibilityLabel={medalha}
    />
  )
}