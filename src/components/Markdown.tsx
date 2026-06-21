import { View, Text, type StyleProp, type TextStyle } from 'react-native'
import { useThemeColors } from '../stores/theme'
import { space, typography } from '../theme/tokens'

type Block = { type: 'h2' | 'h3' | 'p' | 'li'; text: string }

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = []
  for (const raw of (md ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    const ul = line.match(/^[-*]\s+(.*)$/)
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (h) blocks.push({ type: h[1].length <= 2 ? 'h2' : 'h3', text: h[2] })
    else if (ul) blocks.push({ type: 'li', text: ul[1] })
    else if (ol) blocks.push({ type: 'li', text: ol[1] })
    else blocks.push({ type: 'p', text: line })
  }
  return blocks
}

// Renderiza **negrito** inline.
function InlineText({ text, style }: { text: string; style: StyleProp<TextStyle> }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g) // índices ímpares = negrito
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <Text key={i} style={{ fontWeight: '700' }}>{p}</Text>
          : <Text key={i}>{p}</Text>,
      )}
    </Text>
  )
}

/** Renderiza markdown (orientações) como texto formatado nativo: títulos, negrito, listas. */
export function Markdown({ text }: { text: string }) {
  const t = useThemeColors()
  const blocks = parseBlocks(text)
  if (blocks.length === 0) return null

  return (
    <View>
      {blocks.map((b, i) => {
        if (b.type === 'h2') {
          return <InlineText key={i} text={b.text} style={[typography.headingSm, { color: t.text, marginTop: i === 0 ? 0 : space.lg, marginBottom: space.xs }]} />
        }
        if (b.type === 'h3') {
          return <InlineText key={i} text={b.text} style={[typography.headingSm, { color: t.text, fontSize: 15, marginTop: i === 0 ? 0 : space.md, marginBottom: space.xs }]} />
        }
        if (b.type === 'li') {
          return (
            <View key={i} style={{ flexDirection: 'row', marginBottom: space.xs }}>
              <Text style={[typography.bodyMd, { color: t.textSecondary }]}>{'•  '}</Text>
              <InlineText text={b.text} style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22, flex: 1 }]} />
            </View>
          )
        }
        return <InlineText key={i} text={b.text} style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22, marginBottom: space.sm }]} />
      })}
    </View>
  )
}
