/**
 * Core domain types for Project Uniview
 * Defines data structures for parking lots, spaces, sensors, and predictions
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ParkingSpace {
  nodeId: string;
  status: 'available' | 'occupied' | 'reserved' | 'offline';
  lastUpdate: string; // ISO timestamp
  location: Coordinates;
  lotId: string;
  spaceNumber?: string;
  confidence?: number; // Hall effect sensor confidence (0-1)
}

export interface ParkingLot {
  lotId: string;
  name: string;
  location: Coordinates;
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  offlineSpaces: number;
  occupancyRate: number; // 0-100
  lastUpdate: string;
  polygon?: Coordinates[]; // For map boundary drawing
  amenities?: string[]; // e.g., ['handicap', 'ev_charging', 'covered']
  restrictions?: string[]; // e.g., ['faculty_only', 'permit_required']
  operatingHours?: {
    open: string; // HH:mm format
    close: string;
    days: number[]; // 0-6, Sunday = 0
  };
}

export interface OccupancyPrediction {
  lotId: string;
  predictions: PredictionDataPoint[];
  confidence: number;
  generatedAt: string;
}

export interface PredictionDataPoint {
  timestamp: string;
  predictedOccupancy: number; // 0-100
  confidence: number;
  factors?: {
    historicalPattern: number;
    dayOfWeek: number;
    timeOfDay: number;
    specialEvent?: string;
  };
}

export interface User {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  favoriteLocationName?: string;
  settings: UserSettings;
  createdAt: string;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  defaultLot?: string;
  searchRadius: number; // in meters
  preferredView: 'map' | 'list';
  theme: 'light' | 'dark' | 'auto';
  predictionTimeframe: 1 | 2 | 3; // hours
}

export interface NotificationPreference {
  type: 'availability' | 'prediction' | 'system';
  enabled: boolean;
  threshold?: number; // For availability notifications
}

export interface HistoricalData {
  lotId: string;
  date: string;
  hourlyOccupancy: number[]; // 24 entries, one per hour
  averageSearchTime?: number; // seconds
  peakHours: number[];
}

export interface SearchFilter {
  maxDistance?: number; // meters
  minAvailability?: number; // minimum available spaces
  amenities?: string[];
  excludeRestricted?: boolean;
  sortBy: 'distance' | 'availability' | 'predicted';
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface WebSocketMessage {
  type: 'space_update' | 'lot_update' | 'system_alert';
  timestamp: string;
  payload: ParkingSpace | ParkingLot | SystemAlert;
}

export interface SystemAlert {
  alertId: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  affectedLots?: string[];
  timestamp: string;
  expiresAt?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  LotDetail: { lotId: string };
  Settings: undefined;
  About: undefined;
};

export type MainTabParamList = {
  Map: undefined;
  List: undefined;
  Favorites: undefined;
  Profile: undefined;
};

// Redux State Types
export interface AppState {
  lots: LotsState;
  spaces: SpacesState;
  predictions: PredictionsState;
  user: UserState;
  ui: UIState;
  websocket: WebSocketState;
}

export interface LotsState {
  byId: Record<string, ParkingLot>;
  allIds: string[];
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}

export interface SpacesState {
  byNodeId: Record<string, ParkingSpace>;
  byLotId: Record<string, string[]>; // lotId -> nodeId[]
  loading: boolean;
  error: string | null;
}

export interface PredictionsState {
  byLotId: Record<string, OccupancyPrediction>;
  loading: boolean;
  error: string | null;
  cacheExpiry: Record<string, string>; // lotId -> expiry timestamp
}

export interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  token: string | null;
}

export interface UIState {
  mapRegion: MapRegion | null;
  selectedLotId: string | null;
  searchFilter: SearchFilter;
  bottomSheetVisible: boolean;
  theme: 'light' | 'dark';
}

export interface WebSocketState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  subscribedLots: string[];
}
