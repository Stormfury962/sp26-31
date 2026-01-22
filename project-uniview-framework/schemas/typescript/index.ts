/**
 * Project Uniview - TypeScript Interface Definitions
 * 
 * These interfaces define the data structures used throughout
 * the Project Uniview system. Import these in your TypeScript
 * projects for type safety and IDE autocomplete.
 */

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Parking space sensor node
 */
export interface ParkingSpace {
  nodeId: string;
  lotId: string;
  status: ParkingSpaceStatus;
  lastUpdated: string; // ISO 8601 timestamp
  location: Coordinates;
  batteryLevel?: number; // 0-100
  signalStrength?: number; // dBm
  metadata: SensorMetadata;
}

export type ParkingSpaceStatus = 'OCCUPIED' | 'AVAILABLE' | 'UNKNOWN' | 'OFFLINE';

export interface SensorMetadata {
  installDate: string;
  hardwareVersion: string;
  firmwareVersion: string;
}

/**
 * Historical occupancy record
 */
export interface OccupancyHistory {
  nodeId: string;
  timestamp: string; // ISO 8601 timestamp (Sort Key)
  status: 'OCCUPIED' | 'AVAILABLE';
  duration?: number; // Duration in seconds
  eventType: OccupancyEventType;
}

export type OccupancyEventType = 'ENTRY' | 'EXIT' | 'HEARTBEAT';

/**
 * Parking lot information
 */
export interface ParkingLot {
  lotId: string;
  name: string;
  description?: string;
  location: Coordinates;
  boundary: PolygonBoundary;
  totalSpaces: number;
  currentAvailable: number;
  zones?: string[];
  metadata: LotMetadata;
  lastUpdated: string;
}

export interface LotMetadata {
  accessHours: string;
  permitTypes: string[];
  amenities: string[];
}

/**
 * User account
 */
export interface User {
  userId: string; // UUID
  email: string;
  passwordHash: string;
  role: UserRole;
  profile: UserProfile;
  preferences: UserPreferences;
  createdAt: string;
  lastLogin?: string;
}

export type UserRole = 'USER' | 'ADMIN';

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UserPreferences {
  favoriteSpots: string[]; // Array of lotIds
  notifications: boolean;
  theme: 'light' | 'dark';
}

/**
 * Prediction data
 */
export interface PredictionData {
  lotId: string;
  timestamp: string; // Hourly bucket
  predictedOccupancy: number; // 0-100 percentage
  confidence: number; // 0-1 confidence score
  factors: PredictionFactors;
}

export interface PredictionFactors {
  dayOfWeek: number; // 0-6
  hourOfDay: number; // 0-23
  isSpecialEvent: boolean;
  weatherCondition?: string;
  historicalAverage: number;
}

// ============================================================================
// Shared Types
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PolygonBoundary {
  coordinates: Array<{ lat: number; lng: number }>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Authentication
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: UserRole;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

// Parking Lots
export interface GetLotsRequest {
  includeOffline?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number; // meters
}

export interface GetLotsResponse {
  lots: LotSummary[];
  timestamp: string;
  totalLots: number;
}

export interface LotSummary {
  lotId: string;
  name: string;
  location: Coordinates;
  totalSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  status: LotStatus;
  distance?: number; // meters
  lastUpdated: string;
}

export type LotStatus = 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';

export interface GetLotDetailResponse {
  lotId: string;
  name: string;
  description?: string;
  location: Coordinates;
  boundary: PolygonBoundary;
  totalSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  zones?: LotZone[];
  metadata: LotMetadata;
  lastUpdated: string;
}

export interface LotZone {
  zoneId: string;
  name: string;
  totalSpaces: number;
  availableSpaces: number;
}

export interface GetLotSpacesRequest {
  status?: ParkingSpaceStatus;
  zone?: string;
}

export interface GetLotSpacesResponse {
  lotId: string;
  spaces: SpaceDetail[];
  totalCount: number;
  availableCount: number;
  occupiedCount: number;
}

export interface SpaceDetail {
  nodeId: string;
  spaceNumber: string;
  status: ParkingSpaceStatus;
  location: Coordinates;
  zone?: string;
  lastUpdated: string;
  batteryLevel?: number;
  signalStrength?: number;
}

// Predictions
export interface GetPredictionRequest {
  hours?: number; // 1-12
  startTime?: string; // ISO 8601
}

export interface GetPredictionResponse {
  lotId: string;
  currentOccupancy: number;
  currentAvailable: number;
  predictions: PredictionPoint[];
  factors: {
    dayOfWeek: string;
    timeOfDay: string;
    specialEvents: string[];
    weather?: string;
  };
  recommendation?: string;
}

export interface PredictionPoint {
  timestamp: string;
  predictedOccupancy: number;
  predictedAvailable: number;
  confidence: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

// User Preferences
export interface UpdatePreferencesRequest {
  favoriteSpots?: string[];
  notifications?: boolean;
  theme?: 'light' | 'dark';
}

export interface GetPreferencesResponse {
  userId: string;
  preferences: UserPreferences;
}

// Admin
export interface GetSensorsRequest {
  status?: SensorHealthStatus;
  lotId?: string;
  page?: number;
  limit?: number;
}

export type SensorHealthStatus = 'ONLINE' | 'OFFLINE' | 'LOW_BATTERY';

export interface GetSensorsResponse {
  sensors: SensorHealth[];
  summary: SensorSummary;
  pagination: PaginationInfo;
}

export interface SensorHealth {
  nodeId: string;
  lotId: string;
  spaceNumber: string;
  status: SensorHealthStatus;
  lastHeartbeat: string;
  batteryLevel: number;
  signalStrength: number;
  firmwareVersion: string;
  uptime: number; // seconds
  alerts: string[];
}

export interface SensorSummary {
  total: number;
  online: number;
  offline: number;
  lowBattery: number;
  criticalAlerts: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface OverrideSensorRequest {
  status: ParkingSpaceStatus;
  reason: string;
  duration: number; // seconds
}

export interface OverrideSensorResponse {
  nodeId: string;
  overrideStatus: 'ACTIVE';
  status: ParkingSpaceStatus;
  reason: string;
  startedAt: string;
  expiresAt: string;
}

export interface GetAnalyticsRequest {
  lotId?: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  granularity?: 'hourly' | 'daily' | 'weekly';
}

export interface GetAnalyticsResponse {
  lotId?: string;
  period: {
    start: string;
    end: string;
    granularity: string;
  };
  data: AnalyticsDataPoint[];
  insights: {
    peakHours: string;
    averageUtilization: number;
    busyDays: string[];
    recommendations: string[];
  };
}

export interface AnalyticsDataPoint {
  timestamp: string;
  averageOccupancy: number;
  peakOccupancy: number;
  lowestOccupancy: number;
  peakTime: string;
  totalEvents: number;
}

// ============================================================================
// MQTT Message Types
// ============================================================================

export interface SensorStatusMessage {
  nodeId: string;
  status: ParkingSpaceStatus;
  timestamp: string;
  batteryLevel: number;
  signalStrength: number;
  firmwareVersion: string;
  sequenceNumber: number;
}

export interface SensorHeartbeatMessage {
  nodeId: string;
  timestamp: string;
  batteryLevel: number;
  signalStrength: number;
  uptime: number;
  memoryUsage?: number;
  lastReboot?: string;
}

export interface SensorErrorMessage {
  nodeId: string;
  timestamp: string;
  errorCode: string;
  errorMessage: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  context?: Record<string, any>;
}

export interface SensorDiagnosticsMessage {
  nodeId: string;
  timestamp: string;
  diagnostics: {
    hallEffectReading: number;
    hallEffectThreshold: number;
    temperatureCelsius: number;
    solarVoltage: number;
    batteryVoltage: number;
    cpuUsage: number;
    networkLatency: number;
    lastCalibration: string;
  };
}

export interface ConfigUpdateCommand {
  commandId: string;
  timestamp: string;
  config: {
    heartbeatInterval?: number;
    statusReportDelay?: number;
    hallEffectThreshold?: number;
    deepSleepEnabled?: boolean;
    debugMode?: boolean;
  };
}

export interface ConfigUpdateAck {
  commandId: string;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
  appliedConfig: Record<string, any>;
  error?: string;
}

export interface FirmwareUpdateCommand {
  commandId: string;
  timestamp: string;
  firmwareVersion: string;
  downloadUrl: string;
  checksum: string;
  fileSize: number;
  mandatory: boolean;
  scheduleAfter?: string;
}

export interface FirmwareUpdateStatus {
  commandId: string;
  status: 'DOWNLOADING' | 'VERIFYING' | 'INSTALLING' | 'SUCCESS' | 'FAILED';
  progress: number; // 0-100
  timestamp: string;
  error?: string;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface SubscribeMessage extends WebSocketMessage {
  type: 'subscribe';
  action: 'subscribe';
  lots: string[];
}

export interface UnsubscribeMessage extends WebSocketMessage {
  type: 'unsubscribe';
  action: 'unsubscribe';
  lots: string[];
}

export interface PingMessage extends WebSocketMessage {
  type: 'ping';
  action: 'ping';
}

export interface OccupancyUpdateMessage extends WebSocketMessage {
  type: 'occupancy_update';
  lotId: string;
  availableSpaces: number;
  occupancyRate: number;
  timestamp: string;
}

export interface SpaceUpdateMessage extends WebSocketMessage {
  type: 'space_update';
  lotId: string;
  nodeId: string;
  status: ParkingSpaceStatus;
  timestamp: string;
}

export interface SensorAlertMessage extends WebSocketMessage {
  type: 'sensor_alert';
  lotId: string;
  nodeId: string;
  alert: string;
  message: string;
  timestamp: string;
}

export interface PongMessage extends WebSocketMessage {
  type: 'pong';
  timestamp: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
}

export interface ValidationError extends ApiError {
  error: 'VALIDATION_ERROR';
  details: {
    field: string;
    constraint: string;
  };
}

// ============================================================================
// Cache Types
// ============================================================================

export interface LotSummaryCache {
  lotId: string;
  totalSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  lastUpdated: string;
}

export interface PredictionCache {
  lotId: string;
  predictions: PredictionPoint[];
  generatedAt: string;
}

export interface SessionCache {
  userId: string;
  email: string;
  role: UserRole;
  lastActivity: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================================
// Constants
// ============================================================================

export const API_VERSION = 'v1';
export const MAX_PREDICTION_HOURS = 12;
export const DEFAULT_PREDICTION_HOURS = 3;
export const CACHE_TTL_SECONDS = 60;
export const PREDICTION_CACHE_TTL_SECONDS = 300;
export const SESSION_TTL_SECONDS = 3600;
export const JWT_EXPIRATION_SECONDS = 3600;
export const REFRESH_TOKEN_EXPIRATION_SECONDS = 604800; // 7 days

// ============================================================================
// Enums
// ============================================================================

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  LOT_NOT_FOUND = 'LOT_NOT_FOUND',
  SENSOR_NOT_FOUND = 'SENSOR_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
