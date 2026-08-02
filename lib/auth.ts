import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Kakao from "next-auth/providers/kakao";
import { compare } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { isDbConfigured, getDb } from "./db";
import { users } from "./db/schema";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!isDbConfigured()) return null;

        const username = credentials?.username as string;
        const password = credentials?.password as string;
        if (!username || !password) return null;

        const db = getDb();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) return null;
        // OAuth 가입 유저는 비밀번호 로그인 불가
        if (!user.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user.id),
          name: user.displayName || user.username,
          role: user.role,
        };
      },
    }),
    Kakao,
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // 카카오 로그인: DB 유저 찾거나 새로 생성 후 우리 쪽 id/role로 교체
      if (account?.provider === "kakao") {
        if (!isDbConfigured()) return false;

        const db = getDb();
        const providerId = account.providerAccountId;

        let [dbUser] = await db
          .select()
          .from(users)
          .where(
            and(eq(users.provider, "kakao"), eq(users.providerId, providerId))
          )
          .limit(1);

        if (!dbUser) {
          [dbUser] = await db
            .insert(users)
            .values({
              username: `kakao_${providerId}`,
              passwordHash: null,
              displayName: user.name ?? "카카오 사용자",
              provider: "kakao",
              providerId,
            })
            .returning();
        }

        user.id = String(dbUser.id);
        user.name = dbUser.displayName || user.name;
        user.role = dbUser.role;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
});
