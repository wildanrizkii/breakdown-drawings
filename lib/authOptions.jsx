import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import supabase from "@/app/utils/db";

export const authOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 5, // Session berumur 5 jam karena 60 * 60 detik * 5 = 5 jam
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("username", credentials?.username);
        const user = data[0];

        const passwordCorrect = await bcrypt.compare(
          credentials?.password,
          user?.password
        );

        if (passwordCorrect) {
          return {
            id: user?.id,
            name: user?.nama,
            email: user?.email,
            username: user?.username,
          };
        }

        // console.log("credentials", credentials);
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Simpan account.provider ke token
      if (account) {
        token.provider = account.provider;
      }
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.provider = token.provider;
      // console.log(token);
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
