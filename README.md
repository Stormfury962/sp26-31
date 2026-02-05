# Uniview Backend API

Backend API for Project Uniview - Smart Parking Assistance System

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- AWS account (for production) OR Docker (for local development with DynamoDB Local)

### Installation

```bash
cd uniview-backend
npm install
```

### Option 1: Local Development with DynamoDB Local (Recommended for Development)

1. **Start DynamoDB Local with Docker:**
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` for local development:**
   ```env
   PORT=3000
   NODE_ENV=development
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=fakeAccessKey
   AWS_SECRET_ACCESS_KEY=fakeSecretKey
   DYNAMODB_ENDPOINT=http://localhost:8000
   JWT_SECRET=your-dev-secret-key
   CORS_ORIGIN=*
   ```

4. **Create tables and seed data:**
   ```bash
   npm run db:setup
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

### Option 2: AWS DynamoDB (Production)

1. **Configure AWS credentials:**
   ```bash
   aws configure
   ```

2. **Create `.env` file:**
   ```env
   PORT=3000
   NODE_ENV=production
   AWS_REGION=us-east-1
   JWT_SECRET=your-production-secret-key
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

   Note: Remove `DYNAMODB_ENDPOINT` to use real AWS DynamoDB.

3. **Create tables and seed data:**
   ```bash
   npm run db:setup
   ```

4. **Start the server:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Parking Lots
- `GET /lots` - Get all parking lots with occupancy
- `GET /lots/:lotId` - Get specific lot details
- `GET /lots/:lotId/spaces` - Get individual spaces for a lot
- `GET /lots/:lotId/prediction` - Get occupancy predictions

All endpoints are also available under `/api/v1/` prefix.

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Get all lots
curl http://localhost:3000/lots

# Get specific lot
curl http://localhost:3000/lots/LOT_BUSCH_SC

# Get lot spaces
curl http://localhost:3000/lots/LOT_BUSCH_SC/spaces

# Get prediction
curl "http://localhost:3000/lots/LOT_BUSCH_SC/prediction?hours=3"

# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

## Project Structure

```
uniview-backend/
├── src/
│   ├── config/          # Configuration
│   ├── db/              # DynamoDB client
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   └── index.ts         # Entry point
├── scripts/
│   ├── createTables.ts  # DynamoDB table creation
│   └── seedData.ts      # Test data seeding
├── package.json
└── tsconfig.json
```

## Connecting Frontend

Update the frontend config to point to this backend:

**File:** `uniview-frontend/src/config/index.ts`

```typescript
const development = {
  API_BASE_URL: 'http://localhost:3000',  // or your backend URL
  WS_URL: 'ws://localhost:3000',
  // ...
};
```

## Seeded Test Data

The seed script creates 5 Rutgers University parking lots:

| Lot ID | Name | Total Spaces |
|--------|------|--------------|
| LOT_BUSCH_SC | Busch Student Center | 150 |
| LOT_COLLEGE_AVE | College Avenue Garage | 200 |
| LOT_LIVINGSTON | Livingston Plaza | 120 |
| LOT_COOK_DOUGLASS | Cook/Douglass Lot | 180 |
| LOT_STADIUM | Stadium Parking | 500 |

Each lot has individual sensor nodes (ParkingSpace records) with realistic:
- Location coordinates
- Battery levels (70-100%)
- Signal strength (-80 to -40 dBm)
- Random occupancy distribution

## Next Steps

1. **WebSocket Server** - For real-time updates to the mobile app
2. **MQTT Integration** - For receiving sensor data
3. **Caching Layer** - Redis for improved performance
4. **Rate Limiting** - Protect against abuse
