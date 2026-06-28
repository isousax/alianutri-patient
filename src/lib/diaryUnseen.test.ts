import { describe, it, expect } from 'vitest'
import { parseServerTs, latestNutriCommentAt, hasUnseenNutriActivity } from './diaryUnseen'
import type { DiaryPost, DiaryPostComment } from '../types/portal'

const comment = (author_type: string, created_at: string): DiaryPostComment => ({
  id: Math.random().toString(36).slice(2),
  author_type,
  comment_text: 'oi',
  created_at,
})

const post = (comments: DiaryPostComment[]): DiaryPost =>
  ({
    id: Math.random().toString(36).slice(2),
    type: 'meal',
    has_photo: false,
    caption: null,
    emoji: null,
    ai_status: null,
    ai_analysis: null,
    ai_error: null,
    created_at: '2024-01-01 00:00:00',
    reactions: [],
    comments,
  }) as DiaryPost

describe('parseServerTs', () => {
  it('parseia timestamp do SQLite como UTC', () => {
    expect(parseServerTs('2024-01-15 12:30:45')).toBe(Date.UTC(2024, 0, 15, 12, 30, 45))
  })
  it('aceita ISO já zonado e vazio', () => {
    expect(parseServerTs('2024-01-15T12:30:45Z')).toBe(Date.UTC(2024, 0, 15, 12, 30, 45))
    expect(parseServerTs('')).toBe(0)
    expect(parseServerTs(null)).toBe(0)
  })
})

describe('latestNutriCommentAt', () => {
  it('ignora comentários do paciente e reações', () => {
    const posts = [post([comment('patient', '2024-02-01 10:00:00')])]
    expect(latestNutriCommentAt(posts)).toBe(0)
  })
  it('pega o comentário do nutri mais recente entre posts', () => {
    const posts = [
      post([comment('nutritionist', '2024-02-01 10:00:00')]),
      post([comment('assistant', '2024-03-01 09:00:00'), comment('patient', '2024-12-01 09:00:00')]),
    ]
    expect(latestNutriCommentAt(posts)).toBe(Date.UTC(2024, 2, 1, 9, 0, 0))
  })
})

describe('hasUnseenNutriActivity', () => {
  const posts = [post([comment('nutritionist', '2024-05-10 08:00:00')])]
  const at = Date.UTC(2024, 4, 10, 8, 0, 0)
  it('true quando comentário do nutri é mais novo que seenAt', () => {
    expect(hasUnseenNutriActivity(posts, at - 1000)).toBe(true)
  })
  it('false quando já visto (seenAt >= comentário)', () => {
    expect(hasUnseenNutriActivity(posts, at)).toBe(false)
    expect(hasUnseenNutriActivity(posts, at + 1000)).toBe(false)
  })
  it('false quando não há comentário do nutri', () => {
    expect(hasUnseenNutriActivity([post([])], 0)).toBe(false)
  })
})
