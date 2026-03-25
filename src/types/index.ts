// Core domain types matching frontend expectations

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ParkingSpace {
  nodeId: string;
  lotId: string;
  status: 'available' | 'occupied' | 'reserved' | 'offline';
  lastUpdate: string;
  location: Coordinates;
  spaceNumber?: string;
  batteryLevel?: number;
  signalStrength?: number;
  confidence?: number;
  metadata?: {
    installDate?: string;
    hardwareVersion?: string;
    firmwareVersion?: string;
  };
}

export interface ParkingLot {
  lotId: string;
  name: string;
  description?: string;
  location: Coordinates;
  boundary?: { coordinates: Coordinates[] };
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  offlineSpaces: number;
  occupancyRate: number;
  lastUpdate: string;
  zones?: Zone[];
  polygon?: Coordinates[];
  amenities?: string[];
  restrictions?: string[];
  operatingHours?: {
    open: string;
    close: string;
    days: number[];
  };
  metadata?: {
    accessHours?: string;
    permitTypes?: string[];
    rates?: {
      hourly?: number;
      daily?: number;
    };
  };
}

export interface Zone {
  zoneId: string;
  name: string;
  totalSpaces: number;
  availableSpaces: number;
}

export interface OccupancyPrediction {
  lotId: string;
  currentOccupancy: number;
  currentAvailable: number;
  predictions: PredictionDataPoint[];
  confidence: number;
  generatedAt: string;
  factors?: {
    dayOfWeek: string;
    timeOfDay: string;
    specialEvents: string[];
    weather?: string;
  };
  recommendation?: string;
}

export interface PredictionDataPoint {
  timestamp: string;
  predictedOccupancy: number;
  predictedAvailable: number;
  confidence: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export interface User {
  userId: string;
  email: string;
  passwordHash?: string;
  name: string;
  role: 'user' | 'admin';
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  settings: UserSettings;
  favoriteSpots?: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  defaultLot?: string;
  searchRadius: number;
  preferredView: 'map' | 'list';
  theme: 'light' | 'dark' | 'auto';
  predictionTimeframe: 1 | 2 | 3;
}

export interface HistoricalData {
  lotId: string;
  date: string;
  hourlyOccupancy: number[];
  averageSearchTime?: number;
  peakHours: number[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
