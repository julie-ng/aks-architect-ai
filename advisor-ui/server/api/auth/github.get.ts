import { users } from '../../db/schema'

export default defineOAuthGitHubEventHandler({
  async onSuccess (event, { user }) {
    const [dbUser] = await db()
      .insert(users)
      .values({
        githubId: user.id,
        name: user.login,
        avatarUrl: user.avatar_url,
      })
      .onConflictDoUpdate({
        target: users.githubId,
        set: {
          name: user.login,
          avatarUrl: user.avatar_url,
          lastLoginAt: new Date(),
        },
      })
      .returning()

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        githubId: dbUser.githubId,
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
