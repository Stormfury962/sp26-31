import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT, // For local development
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  tables: {
    parkingSpace: 'ParkingSpace',
    parkingLot: 'ParkingLot',
    user: 'User',
    occupancyHistory: 'OccupancyHistory',
    predictionData: 'PredictionData',
    webSocketConnections: 'WebSocketConnections',
  },
};
