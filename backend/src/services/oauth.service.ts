import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../config/database';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Check if OAuth is configured
export function isOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Configure Google OAuth Strategy
export function configureOAuth() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

  if (!googleClientId || !googleClientSecret) {
    console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.');
    console.warn('   See GOOGLE_OAUTH_SETUP.md for setup instructions.');
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: `${backendUrl}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Check if user already exists
          let user = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
          });

          if (user) {
            // User exists - check if they signed up with email/password or Google
            if (user.provider === 'local' && !user.providerId) {
              // User signed up with email/password, now linking Google account
              await db
                .update(users)
                .set({
                  provider: 'google',
                  providerId: profile.id,
                  displayName: profile.displayName || null,
                  avatarUrl: profile.photos?.[0]?.value || null,
                })
                .where(eq(users.id, user.id));

              // Refetch updated user
              user = await db.query.users.findFirst({
                where: eq(users.id, user.id),
              });
            }
            // If already linked to Google, just return the user
            return done(null, user);
          }

          // User doesn't exist - create new user
          const [newUser] = await db
            .insert(users)
            .values({
              email: email.toLowerCase(),
              passwordHash: null, // No password for OAuth users
              provider: 'google',
              providerId: profile.id,
              displayName: profile.displayName || null,
              avatarUrl: profile.photos?.[0]?.value || null,
            })
            .returning();

          return done(null, newUser);
        } catch (error) {
          console.error('OAuth error:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Serialize user to store in session (not used in our JWT setup, but required by passport)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session (not used in our JWT setup, but required by passport)
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  console.log('✅ Google OAuth configured');
  return true;
}
