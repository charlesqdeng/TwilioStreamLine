import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import passport from 'passport';
import { db } from '../config/database';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { isOAuthConfigured } from '../services/oauth.service';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register - User registration
authRouter.post('/register', async (req, res, next) => {
  try {
    // Validate input
    const { email, password } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      throw new AppError(400, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with local provider
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        provider: 'local',
        providerId: null,
      })
      .returning({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// POST /api/auth/login - User login
authRouter.post('/login', async (req, res, next) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Check if user signed up with OAuth
    if (!user.passwordHash) {
      throw new AppError(400, `This account was created using ${user.provider || 'OAuth'}. Please sign in with ${user.provider || 'your OAuth provider'}.`);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// GET /api/auth/me - Get current user
authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.userId!),
      columns: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - User logout (client-side token removal)
authRouter.post('/logout', authenticate, async (req, res) => {
  // JWT is stateless, so logout is handled client-side by removing the token
  res.json({ message: 'Logout successful' });
});

// ============================================
// Google OAuth Routes (Conditional)
// ============================================

if (isOAuthConfigured()) {
  // GET /api/auth/google - Initiate Google OAuth flow
  authRouter.get('/google', (req, res, next) => {
    // Store the frontend URL in session so we can redirect back after auth
    const frontendUrl = req.query.redirect || process.env.FRONTEND_URL || 'http://localhost:3000';

    // Use state parameter to pass the redirect URL
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: frontendUrl as string,
    })(req, res, next);
  });

  // GET /api/auth/google/callback - Google OAuth callback
  authRouter.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: '/api/auth/google/failure'
    }),
    async (req, res) => {
      try {
        // User is authenticated, generate JWT token
        const user = req.user as any;

        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET!,
          { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Get redirect URL from state parameter
        const redirectUrl = req.query.state as string || process.env.FRONTEND_URL || 'http://localhost:3000';

        // Redirect to frontend with token
        res.redirect(`${redirectUrl}/auth/callback?token=${token}&email=${encodeURIComponent(user.email)}`);
      } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
      }
    }
  );

  // GET /api/auth/google/failure - Google OAuth failure
  authRouter.get('/google/failure', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_cancelled`);
  });
} else {
  // OAuth not configured - return helpful error
  authRouter.get('/google', (req, res) => {
    res.status(503).json({
      error: 'Google OAuth not configured',
      message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables. See GOOGLE_OAUTH_SETUP.md for instructions.'
    });
  });

  authRouter.get('/google/callback', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=OAuth+not+configured`);
  });
}
