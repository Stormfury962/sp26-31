import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../db/dynamodb';
import { config } from '../config';
import { User, AuthTokens, UserSettings } from '../types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_USER_SETTINGS: UserSettings = {
  notificationsEnabled: true,
  pushNotifications: true,
  emailNotifications: false,
  searchRadius: 5000,
  preferredView: 'map',
  theme: 'auto',
  predictionTimeframe: 3,
};

export class AuthService {
  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = uuidv4();
    const now = new Date().toISOString();

    const user: User = {
      userId,
      email,
      passwordHash,
      name,
      role: 'user',
      settings: DEFAULT_USER_SETTINGS,
      favoriteSpots: [],
      createdAt: now,
    };

    // Save to DynamoDB
    const command = new PutCommand({
      TableName: config.tables.user,
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)',
    });

    await dynamoDB.send(command);

    // Generate tokens
    const tokens = this.generateTokens(userId, email, user.role);

    // Return user without passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword as User, tokens };
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValidPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update last login
    await this.updateLastLogin(user.userId);

    // Generate tokens
    const tokens = this.generateTokens(user.userId, user.email, user.role);

    // Return user without passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword as User, tokens };
  }

  /**
   * Get user by email using GSI
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const command = new QueryCommand({
      TableName: config.tables.user,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
      Limit: 1,
    });

    const result = await dynamoDB.send(command);
    return result.Items?.[0] as User | null;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const command = new GetCommand({
      TableName: config.tables.user,
      Key: { userId },
    });

    const result = await dynamoDB.send(command);
    if (!result.Item) return null;

    const { passwordHash: _, ...userWithoutPassword } = result.Item as User;
    return userWithoutPassword as User;
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new UpdateCommand({
      TableName: config.tables.user,
      Key: { userId },
      UpdateExpression: 'SET lastLogin = :lastLogin',
      ExpressionAttributeValues: {
        ':lastLogin': new Date().toISOString(),
      },
    });

    await dynamoDB.send(command);
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(userId: string, email: string, role: string): AuthTokens {
    const accessToken = jwt.sign(
      { userId, email, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; email: string; role: string } | null {
    try {
      return jwt.verify(token, config.jwt.secret) as {
        userId: string;
        email: string;
        role: string;
      };
    } catch {
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as {
        userId: string;
        type: string;
      };

      if (decoded.type !== 'refresh') return null;

      const user = await this.getUserById(decoded.userId);
      if (!user) return null;

      return this.generateTokens(user.userId, user.email, user.role);
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
