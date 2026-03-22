import { users } from '../../db/schema'

export default defineOAuthGitHubEventHandler({
  async onSuccess (event, { user }) {
    const [dbUser] = await db()
      .insert(users)
      .values({
        githubId: user.id,
        username: user.login,
        name: user.name || null,
        avatarUrl: user.avatar_url,
      })
      .onConflictDoUpdate({
        target: users.githubId,
        set: {
          username: user.login,
          name: user.name || null,
          avatarUrl: user.avatar_url,
          lastLoginAt: new Date(),
        },
      })
      .returning()

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        githubId: dbUser.githubId,
        username: dbUser.username,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
      },
    })
    return sendRedirect(event, '/')
  },
  onError (event, error) {
    console.error('GitHub OAuth error:', error)
    // throw createError({
    //   status: 500,
    //   statusText: 'GitHub OAuth Error.',
    // })
    return sendRedirect(event, '/login?error=github_oauth_error')
  },
})
