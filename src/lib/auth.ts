import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pkg from 'pg';
const { Client } = pkg;

// Make sure NEXTAUTH_SECRET is consistent
const SECRET = process.env.NEXTAUTH_SECRET || "your-super-secret-key-for-development";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Using direct pg connection for reliability
          const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
          
          if (!connectionString) {
            console.error("Database connection string is missing");
            return null;
          }
          
          const client = new Client({ connectionString });
          await client.connect();
          
          // Find user by email
          const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [credentials.email]
          );
          
          const user = result.rows[0];
          await client.end();
          
          if (!user || !user.password) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordMatch) {
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
}; 