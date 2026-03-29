import type { UIMessage } from 'ai'
import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs } from 'ai'
import type { RetrieveResponse } from '../types/retrieval'

/**
 * POST /api/chat-v2 — Streaming chat with RAG retrieval + optional design context.
 * Uses createUIMessageStream so the client sees indicator dots immediately
 * while retrieval + reformulation happen inside execute().
 *
 * @returns Streaming response via AI SDK's UI message stream protocol
 */

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const config = useRuntimeConfig()

  try {
    const { messages, designId, sessionId }: {
      messages: UIMessage[]
      designId?: string
      sessionId?: string
    } = await readBody(event)

    logger.info({ designId: designId ?? null, sessionId: sessionId ?? null }, 'chat request received')

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // --- Extract question from last user message ---
        const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
        if (!lastUserMessage) {
          throw createError({ statusCode: 400, message: 'No user message found' })
        }

        const question = lastUserMessage.parts
          ?.filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('') ?? ''

        const history = extractConversationHistory(messages, lastUserMessage)

        // --- RAG retrieval (client already sees indicator dots) ---
        const retrieveStart = Date.now()
        const retrieveResponse = await $fetch<RetrieveResponse>(
          `${config.retrievalApiHost}/api/retrieve`,
          {
            method: 'POST',
            body: {
              question,
              history,
              ...(designId
                ? { design_id: designId }
                : {}
              ),
            },
          },
        )
        logger.info({
          duration: Date.now() - retrieveStart,
          reformulatedQuery: retrieveResponse.reformulated_query,
          chunks: retrieveResponse.chunks.length,
        }, 'retrieval complete')

        // --- Fetch design context, detect changes, and load framework schema (parallelized) ---
        const [designContext, designChanged, frameworkSchema] = designId
          ? await Promise.all([
            fetchDesignContext(designId),
            sessionId ? detectDesignChange(designId, sessionId) : Promise.resolve(false),
            buildFrameworkSchema(event),
          ])
          : ['', false, '']

        logger.info({ designChanged, hasDesignContext: !!designContext, frameworkSchemaLength: frameworkSchema.length }, 'design change detection')

        // --- Assemble system prompt (domain-filtered to reduce token count) ---
        const domains = selectDomains(question)
        const dedupedChunks = deduplicateChunks(retrieveResponse.chunks)
        const ragContext = formatContext(dedupedChunks)
        const fullPrompt = assembleSystemPrompt(
          buildSystemPrompt(domains),
          ragContext,
          {
            designContext,
            designChanged,
            frameworkSchema,
          },
        )

        const messagesChars = JSON.stringify(messages).length
        const systemPromptTokens = Math.round(fullPrompt.length / 4)
        const messagesTokens = Math.round(messagesChars / 4)
        logger.info({
          domains,
          systemPromptTokens,
          messagesTokens,
          totalEstimatedTokens: systemPromptTokens + messagesTokens,
        }, 'assembled system prompt')

        // --- Extract sources for client-side citation rendering ---
        const sources = dedupedChunks.map(c => ({
          url: c.url,
          title: c.title,
        }))

        // --- Pre-flight: verify Ollama model is available (avoids cryptic mid-stream errors) ---
        if (config.ai.provider === 'ollama') {
          await checkOllamaModel(config.ai.ollamaBaseUrl, config.ai.chatModel)
        }

        // --- Configure tools (only when a design is linked) ---
        const tools = designId
          ? {
            getDesignSnapshot: createDesignSnapshotTool(designId),
            proposeDesignUpdate: createProposeDesignUpdateTool(),
          }
          : undefined

        // --- Stream LLM response ---
        const result = streamText({
          model: getChatModel(),
          temperature: config.ai.chatTemperature,
          system: fullPrompt,
          messages: await convertToModelMessages(messages),
          // Tools + step limit to prevent runaway tool loops
          ...(tools
            ? { tools, stopWhen: stepCountIs(3) }
            : {}
          ),
        })

        // Attach sources as message metadata so the client can render citations
        writer.merge(result.toUIMessageStream({
          messageMetadata: ({ part }) => {
            if (part.type === 'start') {
              return { sources }
            }
          },
        }))
      },
    })

    return createUIMessageStreamResponse({ stream })
  }
  catch (err: unknown) {
    handleChatError(err, config)
  }
})
