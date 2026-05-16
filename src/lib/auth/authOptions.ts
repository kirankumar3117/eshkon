import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import type { Role } from '@/types/page'

// NextAuth reads NEXTAUTH_URL from process.env at request time.
// On Vercel, NEXTAUTH_URL should be set to the production domain in the dashboard.
// For preview deployments Vercel injects VERCEL_URL (host only, no protocol) —
// we derive the full URL from it automatically so previews work without manual config.
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
}

interface SeedUser {
  id: string
  email: string
  passwordHash: string
  role: Role
}

// Seeded test users — hashes computed with bcrypt rounds=10.
// Passwords: viewer123 · editor123 · publisher123
const SEED_USERS: SeedUser[] = [
  {
    id: 'user-viewer',
    email: 'viewer@test.com',
    passwordHash: '$2a$10$9Vez4NwABQNaYYTNULwTwe7RqtgcBeSBBHztwJSjuaBjbdpUBsHF6',
    role: 'viewer',
  },
  {
    id: 'user-editor',
    email: 'editor@test.com',
    passwordHash: '$2a$10$o68.74WMZOUJA1AkncQl6O/UORUdWlF6Y76Je10O97nTx4Upg8Kwm',
    role: 'editor',
  },
  {
    id: 'user-publisher',
    email: 'publisher@test.com',
    passwordHash: '$2a$10$nYfxDC1bJZ9/NH7bn.KEDubHEMOJVBbcTuh6bTx5Q/V1T/MfWWFSy',
    role: 'publisher',
  },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const user = SEED_USERS.find(
          u => u.email.toLowerCase() === credentials.email.toLowerCase()
        )
        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )
        if (!passwordMatch) return null

        return { id: user.id, email: user.email, role: user.role }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user && 'role' in user) {
        token.role = user.role as Role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: Role }).role = token.role as Role
      }
      return session
    },
  },

  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
