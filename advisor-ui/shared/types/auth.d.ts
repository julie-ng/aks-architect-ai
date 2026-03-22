/* eslint-disable no-unused-vars */

declare module '#auth-utils' {
  interface User {
    id: string
    githubId: number
    username: string
    name: string | null
    avatarUrl: string | null
  }
}

export {}
