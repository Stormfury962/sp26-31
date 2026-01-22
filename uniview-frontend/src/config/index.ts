/**
 * Application configuration
 * Environment-specific settings and constants
 */

const ENV = {
  development: {
    API_BASE_URL: 'https://api-dev.uniview.edu',
    WS_URL: 'wss://ws-dev.uniview.edu',
    AWS_REGION: 'us-east-1',
    MQTT_ENDPOINT: 'wss://iot-dev.uniview.edu/mqtt',
    ENABLE_LOGGING: true,
    CACHE_DURATION: 60000, // 1 minute
  },
  production: {
    API_BASE_URL: 'https://api.uniview.edu',
    WS_URL: 'wss://ws.uniview.edu',
    AWS_REGION: 'us-east-1',
    MQTT_ENDPOINT: 'wss://iot.uniview.edu/mqtt',
    ENABLE_LOGGING: false,
    CACHE_DURATION: 60000, // 1 minute
  },
};

// Select environment based on __DEV__ flag
const currentEnv = __DEV__ ? ENV.development : ENV.production;

export const Config = {
  ...currentEnv,
  
  // App-wide constants
  APP_NAME: 'Uniview',
  APP_VERSION: '1.0.0',
  
  // API Configuration
  API_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // WebSocket Configuration
  WS_RECONNECT_INTERVAL: 5000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  WS_HEARTBEAT_INTERVAL: 30000,
  
  // Map Configuration
  DEFAULT_REGION: {
    latitude: 40.5008,  // Rutgers University coordinates
    longitude: -74.4474,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
  MAP_ANIMATION_DURATION: 300,
  GEOLOCATION_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000,
  },
  
  // Parking Space Configuration
  SPACE_COLORS: {
    available: '#4CAF50',    // Green
    occupied: '#F44336',     // Red
    reserved: '#FF9800',     // Orange
    offline: '#9E9E9E',      // Gray
  },
  LOT_OCCUPANCY_THRESHOLDS: {
    low: 0.3,      // < 30% = plenty of space
    medium: 0.7,   // 30-70% = moderate
    high: 0.9,     // 70-90% = limited
    full: 1.0,     // > 90% = nearly full
  },
  
  // UI Configuration
  REFRESH_INTERVAL: 30000, // 30 seconds
  PREDICTION_UPDATE_INTERVAL: 300000, // 5 minutes
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  
  // Notification Configuration
  NOTIFICATION_CHANNELS: {
    availability: {
      id: 'availability',
      name: 'Parking Availability',
      description: 'Notifications about parking space availability',
    },
    predictions: {
      id: 'predictions',
      name: 'Occupancy Predictions',
      description: 'Predicted parking availability alerts',
    },
    system: {
      id: 'system',
      name: 'System Alerts',
      description: 'Important system updates and maintenance',
    },
  },
  
  // Cache Configuration
  CACHE_KEYS: {
    USER_SETTINGS: '@uniview:userSettings',
    AUTH_TOKEN: '@uniview:authToken',
    FAVORITE_LOTS: '@uniview:favoriteLots',
    LAST_LOCATION: '@uniview:lastLocation',
  },
  
  // Feature Flags
  FEATURES: {
    PREDICTIONS: true,
    PUSH_NOTIFICATIONS: true,
    OFFLINE_MODE: true,
    ADMIN_DASHBOARD: true,
    ANALYTICS: true,
    FAVORITES: true,
  },
  
  // Analytics
  ANALYTICS_EVENTS: {
    APP_OPENED: 'app_opened',
    LOT_VIEWED: 'lot_viewed',
    NAVIGATION_STARTED: 'navigation_started',
    PREDICTION_VIEWED: 'prediction_viewed',
    SEARCH_PERFORMED: 'search_performed',
    NOTIFICATION_RECEIVED: 'notification_received',
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
    LOCATION_DENIED: 'Location permission is required to show nearby parking lots.',
    AUTH_FAILED: 'Authentication failed. Please log in again.',
    GENERIC_ERROR: 'Something went wrong. Please try again.',
  },
};

export default Config;
