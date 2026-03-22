import type { H3Event } from 'h3'

export async function requireUserId (event: H3Event): Promise<string> {
  const { user } = await getUserSession(event)
  const userId = user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  event.context.userId = userId
  return userId
}
