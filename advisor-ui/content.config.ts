import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    home: defineCollection({
      // Specify the type of content in this collection
      type: 'page',
      // Load every file inside the `content` directory
      source: 'index.md',
    }),
    components: defineCollection({
      type: 'page',
      source: 'aks/components/**/*.md',
      schema: z.object({
        title: z.string(),
        designer: z.object({
          title: z.string(),
          description: z.string().optional(),
          question: z.string(),
          question_type: z.enum(['radio', 'text', 'checkbox']),
          reference: z.object({
            title: z.string(),
            url: z.string()
          }).optional(),
          answers: z.array(z.object({
            key: z.string(),
            title: z.string(),
            description: z.string().optional(),
            highlights: z.array(z.string()).optional()
          }))
        })
      })
    }),
    systemPrompt: defineCollection({
      type: 'page',
      source: 'system-prompt/*.md',
      schema: z.object({
        domain: z.string(),
      })
    }),
    guide: defineCollection({
      type: 'page',
      source: 'guide/**/*.md',
    })
  }
})
