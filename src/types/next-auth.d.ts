import type { DefaultSession, DefaultJWT } from 'next-auth'
import type { Role } from './page'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      role: Role
    }
  }

  interface User {
    role: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role: Role
  }
}
