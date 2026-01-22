/**
 * API Service
 * Handles all HTTP communication with backend
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { Config } from '../config';
import {
  ParkingLot,
  ParkingSpace,
  OccupancyPrediction,
  ApiResponse,
  User,
  HistoricalData,
} from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

class APIService {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: Config.API_BASE_URL,
      timeout: Config.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        if (!this.authToken) {
          this.authToken = await AsyncStorage.getItem(Config.CACHE_KEYS.AUTH_TOKEN);
        }
        
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        if (Config.ENABLE_LOGGING) {
          console.log('[API Request]', config.method?.toUpperCase(), config.url);
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (Config.ENABLE_LOGGING) {
          console.log('[API Response]', response.config.url, response.status);
        }
        return response;
      },
      async (error: AxiosError) => {
        if (Config.ENABLE_LOGGING) {
          console.error('[API Error]', error.config?.url, error.response?.status);
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          await this.handleUnauthorized();
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private async handleUnauthorized() {
    // Clear auth token and redirect to login
    this.authToken = null;
    await AsyncStorage.removeItem(Config.CACHE_KEYS.AUTH_TOKEN);
    // Emit event or use navigation service to redirect
  }

  private formatError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error
      const message = (error.response.data as any)?.message || 
                     Config.ERROR_MESSAGES.GENERIC_ERROR;
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      return new Error(Config.ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      // Something else happened
      return new Error(error.message || Config.ERROR_MESSAGES.GENERIC_ERROR);
    }
  }

  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });

    if (response.success && response.data) {
      this.authToken = response.data.token;
      await AsyncStorage.setItem(Config.CACHE_KEYS.AUTH_TOKEN, response.data.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(Config.CACHE_KEYS.AUTH_TOKEN);
    this.authToken = null;
  }

  async register(email: string, password: string, name: string): Promise<ApiResponse<User>> {
    return this.request<User>({
      method: 'POST',
      url: '/auth/register',
      data: { email, password, name },
    });
  }

  // Parking Lots
  async getLots(): Promise<ApiResponse<ParkingLot[]>> {
    return this.request<ParkingLot[]>({
      method: 'GET',
      url: '/lots',
    });
  }

  async getLotDetails(lotId: string): Promise<ApiResponse<ParkingLot>> {
    return this.request<ParkingLot>({
      method: 'GET',
      url: `/lots/${lotId}`,
    });
  }

  async getLotSpaces(lotId: string): Promise<ApiResponse<ParkingSpace[]>> {
    return this.request<ParkingSpace[]>({
      method: 'GET',
      url: `/lots/${lotId}/spaces`,
    });
  }

  // Predictions
  async getPrediction(lotId: string, hours: number = 3): Promise<ApiResponse<OccupancyPrediction>> {
    return this.request<OccupancyPrediction>({
      method: 'GET',
      url: `/lots/${lotId}/prediction`,
      params: { hours },
    });
  }

  // Historical Data
  async getHistoricalData(
    lotId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<HistoricalData[]>> {
    return this.request<HistoricalData[]>({
      method: 'GET',
      url: `/lots/${lotId}/history`,
      params: { startDate, endDate },
    });
  }

  // User Settings
  async updateUserSettings(settings: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>({
      method: 'PATCH',
      url: '/user/settings',
      data: settings,
    });
  }

  async getUserProfile(): Promise<ApiResponse<User>> {
    return this.request<User>({
      method: 'GET',
      url: '/user/profile',
    });
  }

  // Favorites
  async addFavoriteLot(lotId: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: 'POST',
      url: '/user/favorites',
      data: { lotId },
    });
  }

  async removeFavoriteLot(lotId: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: 'DELETE',
      url: `/user/favorites/${lotId}`,
    });
  }

  async getFavoriteLots(): Promise<ApiResponse<ParkingLot[]>> {
    return this.request<ParkingLot[]>({
      method: 'GET',
      url: '/user/favorites',
    });
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>({
      method: 'GET',
      url: '/health',
    });
  }
}

export const apiService = new APIService();
