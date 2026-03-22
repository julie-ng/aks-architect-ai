/* eslint-disable no-unused-vars */

declare module '#auth-utils' {
  interface User {
    id: string
    githubId: number
    name: string
    avatarUrl: string | null
  }
}

export {}
