import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getSheetData } from './sheets';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        type: { label: 'Type', type: 'text' }, // 'admin' or 'company'
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password || !credentials?.type) {
          return null;
        }

        try {
          if (credentials.type === 'admin') {
            // Check admin credentials from environment variables
            const adminUsername = process.env.ADMIN_USERNAME;
            const adminPassword = process.env.ADMIN_PASSWORD;

            if (
              credentials.username === adminUsername &&
              credentials.password === adminPassword
            ) {
              return {
                id: 'admin',
                name: 'Admin',
                email: 'admin@example.com',
                type: 'admin',
              };
            }
          } else if (credentials.type === 'company') {
            // Check company credentials from Google Sheets
            const companies = await getSheetData('companies');
            
            // Skip header row
            const companyData = companies.slice(1);
            
            // Find the company with matching username
            const company = companyData.find(
              (row) => row[2] === credentials.username
            );
            
            if (company) {
              // Check if company is enabled
              const isEnabled = company[5] !== 'false'; // If enabled column exists and is 'false', company is disabled
              
              if (!isEnabled) {
                throw new Error('Company account is disabled. Please contact the administrator.');
              }
              
              // Check password
              const passwordMatch = await bcrypt.compare(
                credentials.password,
                company[3]
              );
              
              if (passwordMatch) {
                return {
                  id: company[0], // Company ID
                  name: company[1], // Company name
                  image: company[4] || null, // Company image URL
                  type: 'company',
                  enabled: isEnabled,
                };
              }
            }
          }
        } catch (error) {
          console.error('Authentication error:', error);
          throw error; // Re-throw to show the error message to the user
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.type = user.type;
        if (user.image) {
          token.picture = user.image;
        }
        if (user.enabled !== undefined) {
          token.enabled = user.enabled;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.type = token.type as string;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
        if (token.enabled !== undefined) {
          session.user.enabled = token.enabled as boolean;
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Extend next-auth types
declare module 'next-auth' {
  interface User {
    id: string;
    type: string;
    image?: string;
    enabled?: boolean;
  }
  
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      type: string;
      enabled?: boolean;
    };
  }
} 