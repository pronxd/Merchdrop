import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getCollection } from "./mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const usersCollection = await getCollection("users");

          // Check if user exists
          const existingUser = await usersCollection.findOne({ email: user.email });

          if (!existingUser) {
            // Create new user (not a super admin by default)
            await usersCollection.insertOne({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: "google",
              superAdmin: false,
              isDev: false,
              createdAt: new Date(),
              lastLogin: new Date(),
            });
          } else {
            // Update last login
            await usersCollection.updateOne(
              { email: user.email },
              { $set: { lastLogin: new Date() } }
            );
          }

          return true;
        } catch (error) {
          console.error("Error during sign in:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user?.email) {
        try {
          const usersCollection = await getCollection("users");
          const dbUser = await usersCollection.findOne({ email: session.user.email });

          if (dbUser) {
            session.user.superAdmin = dbUser.superAdmin || false;
            session.user.id = dbUser._id.toString();
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/admin",
    error: "/admin",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
