import type { UIMessage } from 'ai'
import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { eq } from 'drizzle-orm'
import { designs } from '../db/schema'
import type { RetrieveResponse } from '../types/retrieval'

export default defineLazyEventHandler(async () => {
  return defineEventHandler(async (event) => {
    await requireUserId(event)
    const config = useRuntimeConfig()

    try {
      const { messages, designId }: {
        messages: UIMessage[]
        designId?: string
      } = await readBody(event)

      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
      if (!lastUserMessage) {
        throw createError({ statusCode: 400, message: 'No user message found' })
      }

      const question = lastUserMessage.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''

      // Build recent conversation history for context-aware query reformulation
      const history = messages
        .filter((m) => m !== lastUserMessage)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.parts?.filter((p) => p.type === 'text').map((p) => p.text).join('') ?? '',
        }))
        .filter((m) => m.content.length > 0)
        .slice(-6)

      console.log('[chat] designId:', designId ?? '(none)')

      let designContext = ''
      if (designId) {
        const [design] = await db().select({
          requirements: designs.requirements,
          decisions: designs.decisions,
        }).from(designs).where(eq(designs.id, designId))

        if (design) {
          designContext = formatDesignContext(
            design.requirements as Record<string, string | string[]>,
            design.decisions as Record<string, string | string[]>,
          )
        }
      }
      if (designContext) {
        console.log('[chat] design context:\n' + designContext)
      }

      const t0 = performance.now()

      console.time('[chat] retrieve')
      const retrieveResponse = await $fetch<RetrieveResponse>(
        `${config.retrievalApiHost}/api/retrieve`,
        {
          method: 'POST',
          body: {
            question,
            history,
            ...(designContext ? { design_context: designContext } : {}),
          },
        },
      )
      console.timeEnd('[chat] retrieve')
      console.log('[chat] reformulated:', retrieveResponse.reformulated_query)

      console.time('[chat] systemPrompt')
      const dedupedChunks = deduplicateChunks(retrieveResponse.chunks)
      const context = formatContext(dedupedChunks)
      const systemPrompt = buildSystemPrompt()
      let fullPrompt = `${systemPrompt}\n\n<context>\n${context}\n</context>`
      if (designContext) {
        fullPrompt += `\n\n<design>\nThe user has an AKS architecture design with these choices. Tailor your advice to their specific configuration:\n${designContext}\n</design>`
      }
      console.timeEnd('[chat] systemPrompt')

      const modelMessages = await convertToModelMessages(messages)
      const reformulatedQuery = retrieveResponse.reformulated_query

      // Verify model is available before streaming (fast, avoids cryptic mid-stream errors)
      if (config.ai.provider === 'ollama') {
        console.time('[chat] modelCheck')
        await checkOllamaModel(config.ai.ollamaBaseUrl, config.ai.chatModel)
        console.timeEnd('[chat] modelCheck')
      }

      const tools = designId
        ? { getDesignSnapshot: createDesignSnapshotTool(designId) }
        : undefined

      let firstToken = true
      console.time('[chat] ttfb')
      const result = streamText({
        model: getChatModel(),
        temperature: config.ai.chatTemperature,
        system: fullPrompt,
        messages: modelMessages,
        ...(tools ? { tools, stopWhen: stepCountIs(2) } : {}),
        onFinish: () => {
          const total = (performance.now() - t0).toFixed(0)
          console.timeEnd('[chat] streaming')
          console.log(`[chat] total: ${total}ms`)
        },
      })

      const sources = dedupedChunks.map(c => ({
        url: c.url,
        title: c.title,
      }))

      return result.toUIMessageStreamResponse({
        messageMetadata: ({ part }) => {
          if (part.type === 'start') {
            return { sources }
          }
          if (part.type === 'text-delta' && firstToken) {
            firstToken = false
            console.timeEnd('[chat] ttfb')
            console.time('[chat] streaming')
          }
          if (part.type === 'finish') {
            return { reformulatedQuery }
          }
        },
      })
    }
    catch (err: unknown) {
      handleChatError(err, config)
    }
  })
})
