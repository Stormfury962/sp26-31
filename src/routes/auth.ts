import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { ApiResponse, User, AuthTokens } from '../types';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
        meta: { timestamp: new Date().toISOString() },
      };
      return res.status(400).json(response);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          details: { field: 'email' },
        },
        meta: { timestamp: new Date().toISOString() },
      };
      return res.status(400).json(response);
    }

    // Validate password strength
    if (password.length < 8) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters',
          details: { field: 'password' },
        },
        meta: { timestamp: new Date().toISOString() },
      };
      return res.status(400).json(response);
    }

    const userName = name || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0];
    const result = await authService.register(email, password, userName);

    const response: ApiResponse<{
      userId: string;
      email: string;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      role: string;
    }> = {
      success: true,
      data: {
        userId: result.user.userId,
        email: result.user.email,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        role: result.user.role,
      },
      meta: { timestamp: new Date().toISOString() },
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.message === 'EMAIL_EXISTS') {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
        meta: { timestamp: new Date().toISOString() },
      };
      return res.status(409).json(response);
    }

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register user',
      },
      meta: { timestamp: new Date().toISOString() },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /auth/login
 * Authenticate user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
        meta: { timestamp: new Date().toISOString() },
      };
      return res.status(400).json(response);
    }

    const result = await authService.login(email, password);

    const response: ApiResponse<{
      userId: string;
      email: string;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      role: string;
    }> = {
      success: true,
      data: {
        userId: result.user.userId,
        email: result.user.email,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        role: result.user.role,
      },
      meta: { timestamp: new Date().toISOString() },
    };

    res.json(response);
  } catch (error: any) {
    console.error('Login error:', error);

    if (error.message === 'INVALID_CREDENTIALS') {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect',
        },
        meta: { timestamp: new Date().toISOString() },
      };
      return res.status(401).json(response);
    }

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to login',
      },
      meta: { timestamp: new Date().toISOString() },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
        },
        meta: { timestamp: new Date().toISOString() },
      };
      return res.status(400).json(response);
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    if (!tokens) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Refresh token is invalid or expired',
        },
        meta: { timestamp: new Date().toISOString() },
      };
      return res.status(401).json(response);
    }

    const response: ApiResponse<{ accessToken: string; expiresIn: number }> = {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
      meta: { timestamp: new Date().toISOString() },
    };

    res.json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh token',
      },
      meta: { timestamp: new Date().toISOString() },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /auth/logout
 * Logout user (client-side token removal, could add token blacklist)
 */
router.post('/logout', (req: Request, res: Response) => {
  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Successfully logged out',
    },
    meta: { timestamp: new Date().toISOString() },
  };

  res.json(response);
});

export default router;
