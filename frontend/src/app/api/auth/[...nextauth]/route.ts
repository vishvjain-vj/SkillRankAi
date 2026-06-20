import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // ADD THIS BLOCK:
      authorization: {
        params: {
          prompt: "select_account", // Forces Google to show the account list
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isLogin: { label: "Is Login View", type: "text" } // Tells backend if they are signing up or logging in
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // THIS IS WHERE WE TALK TO YOUR FASTAPI BACKEND
        try {
          const res = await fetch("http://127.0.0.1:8000/auth/credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              is_login: credentials.isLogin === "true"
            }),
          });

          const user = await res.json();

          // If the FastAPI backend returns a valid user, we log them into NextAuth
          if (res.ok && user) {
            return { id: user.user_id, name: user.name, email: user.email };
          }
          // If password fails or account exists, return null to block login
          return null;
        } catch (error) {
          console.error("Backend auth error:", error);
          return null;
        }
      }
    })
  ],
  // We need to explicitly define session strategy when using Credentials
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };