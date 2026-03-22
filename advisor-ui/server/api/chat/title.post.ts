import { generateText } from 'ai'

const TITLE_PROMPT = [
  'Distill the topic of the user\'s message into a short chat title (5 words max).',
  'Return ONLY the title, nothing else. No quotes, no punctuation at the end.',
].join(' ')

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const { question } = await readBody<{ question: string }>(event)

  if (!question?.trim()) {
    throw createError({ statusCode: 400, message: 'question is required' })
  }

  const { text } = await generateText({
    model: getTitleModel(),
    temperature: 0.1,
    system: TITLE_PROMPT,
    messages: [{ role: 'user', content: question }],
  })

  const title = text.trim().replace(/\.+$/, '')

  return { title }
})
