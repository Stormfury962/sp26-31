import { ScanCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../db/dynamodb';
import { config } from '../config';
import { ParkingLot, ParkingSpace } from '../types';

// Mock data for development when DynamoDB is not available
const MOCK_LOTS: ParkingLot[] = [
  {
    lotId: 'LOT_BUSCH_SC',
    name: 'Busch Student Center',
    location: { latitude: 40.5231, longitude: -74.4587 },
    totalSpaces: 150,
    availableSpaces: 47,
    occupiedSpaces: 98,
    offlineSpaces: 5,
    occupancyRate: 65.3,
    lastUpdate: new Date().toISOString(),
  },
  {
    lotId: 'LOT_LIVINGSTON',
    name: 'Livingston Plaza',
    location: { latitude: 40.5239, longitude: -74.4363 },
    totalSpaces: 120,
    availableSpaces: 65,
    occupiedSpaces: 52,
    offlineSpaces: 3,
    occupancyRate: 43.3,
    lastUpdate: new Date().toISOString(),
  },
  {
    lotId: 'LOT_WERBLIN',
    name: 'Werblin Recreation Center',
    location: { latitude: 40.5200, longitude: -74.4604 },
    totalSpaces: 90,
    availableSpaces: 33,
    occupiedSpaces: 54,
    offlineSpaces: 3,
    occupancyRate: 60.0,
    lastUpdate: new Date().toISOString(),
  },
  {
    lotId: 'LOT_COLLEGE_AVE',
    name: 'College Avenue Garage',
    location: { latitude: 40.4997, longitude: -74.4480 },
    totalSpaces: 200,
    availableSpaces: 89,
    occupiedSpaces: 106,
    offlineSpaces: 5,
    occupancyRate: 53.0,
    lastUpdate: new Date().toISOString(),
  },
  {
    lotId: 'LOT_COOK_DOUGLASS',
    name: 'Cook/Douglass Lot',
    location: { latitude: 40.4835, longitude: -74.4383 },
    totalSpaces: 180,
    availableSpaces: 112,
    occupiedSpaces: 64,
    offlineSpaces: 4,
    occupancyRate: 35.6,
    lastUpdate: new Date().toISOString(),
  },
  {
    lotId: 'LOT_TEST',
    name: 'Test Lot (Demo Node)',
    location: { latitude: 40.52526521901689, longitude: -74.44122170578724 },
    totalSpaces: 1,
    availableSpaces: 1,
    occupiedSpaces: 0,
    offlineSpaces: 0,
    occupancyRate: 0,
    lastUpdate: new Date().toISOString(),
  },
];

export class LotService {
  private useMockData = false;

  /**
   * Get all parking lots with current occupancy data
   */
  async getAllLots(): Promise<ParkingLot[]> {
    // Return mock data if DynamoDB previously failed
    if (this.useMockData) {
      console.log('[LotService] Using mock data');
      return MOCK_LOTS.map(lot => ({ ...lot, lastUpdate: new Date().toISOString() }));
    }

    try {
      const command = new ScanCommand({
        TableName: config.tables.parkingLot,
      });

      const result = await dynamoDB.send(command);
      const lots = (result.Items || []) as ParkingLot[];

      // Calculate real-time occupancy for each lot from ParkingSpace table
      const lotsWithOccupancy = await Promise.all(
        lots.map(async (lot) => {
          const spaces = await this.getSpacesByLotId(lot.lotId);
          const availableSpaces = spaces.filter(s => s.status === 'available').length;
          const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
          const offlineSpaces = spaces.filter(s => s.status === 'offline').length;
          const totalSpaces = spaces.length || lot.totalSpaces;

          return {
            ...lot,
            totalSpaces,
            availableSpaces,
            occupiedSpaces,
            offlineSpaces,
            occupancyRate: totalSpaces > 0
              ? Math.round((occupiedSpaces / totalSpaces) * 100 * 100) / 100
              : 0,
            lastUpdate: new Date().toISOString(),
          };
        })
      );

      return lotsWithOccupancy;
    } catch (error) {
      console.log('[LotService] DynamoDB unavailable, switching to mock data');
      this.useMockData = true;
      return MOCK_LOTS.map(lot => ({ ...lot, lastUpdate: new Date().toISOString() }));
    }
  }

  /**
   * Get a specific lot by ID
   */
  async getLotById(lotId: string): Promise<ParkingLot | null> {
    if (this.useMockData) {
      return MOCK_LOTS.find(l => l.lotId === lotId) ?? null;
    }

    let result;
    try {
      const command = new GetCommand({
        TableName: config.tables.parkingLot,
        Key: { lotId },
      });
      result = await dynamoDB.send(command);
    } catch (error) {
      console.log('[LotService] getLotById failed, switching to mock data');
      this.useMockData = true;
      return MOCK_LOTS.find(l => l.lotId === lotId) ?? null;
    }

    if (!result.Item) return null;

    const lot = result.Item as ParkingLot;

    // Get real-time space data
    const spaces = await this.getSpacesByLotId(lotId);
    const availableSpaces = spaces.filter(s => s.status === 'available').length;
    const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
    const offlineSpaces = spaces.filter(s => s.status === 'offline').length;
    const totalSpaces = spaces.length || lot.totalSpaces;

    return {
      ...lot,
      totalSpaces,
      availableSpaces,
      occupiedSpaces,
      offlineSpaces,
      occupancyRate: totalSpaces > 0
        ? Math.round((occupiedSpaces / totalSpaces) * 100 * 100) / 100
        : 0,
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Get all spaces for a specific lot
   */
  async getSpacesByLotId(lotId: string): Promise<ParkingSpace[]> {
    if (this.useMockData) return [];

    try {
    const command = new QueryCommand({
      TableName: config.tables.parkingSpace,
      IndexName: 'lotId-lastUpdated-index',
      KeyConditionExpression: 'lotId = :lotId',
      ExpressionAttributeValues: {
        ':lotId': lotId,
      },
    });

    const result = await dynamoDB.send(command);
    return (result.Items || []) as ParkingSpace[];
    } catch (error) {
      console.log('[LotService] getSpacesByLotId failed, returning empty:', error);
      return [];
    }
  }

  /**
   * Get prediction data for a lot
   * For now, generates mock predictions based on historical patterns
   */
  async getPrediction(lotId: string, hours: number = 3): Promise<any> {
    const lot = await this.getLotById(lotId);
    if (!lot) return null;

    const now = new Date();
    const predictions = [];

    // Generate hourly predictions
    for (let i = 1; i <= hours; i++) {
      const predictionTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = predictionTime.getHours();

      // Simple pattern: busier during 9-11am and 2-4pm
      let basePrediction = lot.occupancyRate;
      if (hour >= 9 && hour <= 11) {
        basePrediction = Math.min(95, basePrediction + 15);
      } else if (hour >= 14 && hour <= 16) {
        basePrediction = Math.min(95, basePrediction + 20);
      } else if (hour >= 17 && hour <= 19) {
        basePrediction = Math.max(20, basePrediction - 15);
      }

      // Add some variance
      const variance = (Math.random() - 0.5) * 10;
      const predictedOccupancy = Math.max(0, Math.min(100, basePrediction + variance));
      const predictedAvailable = Math.round(lot.totalSpaces * (1 - predictedOccupancy / 100));

      let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
      if (predictions.length > 0) {
        const lastPrediction = predictions[predictions.length - 1].predictedOccupancy;
        if (predictedOccupancy > lastPrediction + 3) trend = 'INCREASING';
        else if (predictedOccupancy < lastPrediction - 3) trend = 'DECREASING';
      }

      predictions.push({
        timestamp: predictionTime.toISOString(),
        predictedOccupancy: Math.round(predictedOccupancy * 10) / 10,
        predictedAvailable,
        confidence: 0.85 - (i * 0.05), // Confidence decreases with time
        trend,
      });
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeOfDay = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';

    return {
      lotId,
      currentOccupancy: lot.occupancyRate,
      currentAvailable: lot.availableSpaces,
      predictions,
      confidence: 0.85,
      generatedAt: now.toISOString(),
      factors: {
        dayOfWeek: dayNames[now.getDay()],
        timeOfDay,
        specialEvents: [],
        weather: 'Clear',
      },
      recommendation: this.generateRecommendation(predictions, lot),
    };
  }

  private generateRecommendation(predictions: any[], lot: ParkingLot): string {
    const peakPrediction = predictions.reduce((max, p) =>
      p.predictedOccupancy > max.predictedOccupancy ? p : max, predictions[0]);

    if (peakPrediction.predictedOccupancy > 85) {
      const peakTime = new Date(peakPrediction.timestamp);
      const hours = peakTime.getHours();
      const minutes = peakTime.getMinutes();
      const timeStr = `${hours > 12 ? hours - 12 : hours}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
      return `High demand expected around ${timeStr}. Consider arriving earlier for better availability.`;
    } else if (lot.availableSpaces < 10) {
      return 'Limited spaces available now. Consider alternative lots if possible.';
    }
    return 'Good availability expected. No concerns at this time.';
  }

  async updateSpaceStatus(
    nodeId: string,
    lotId: string,
    status: 'available' | 'occupied',
    confidence?: number
  ): Promise<void> {
    const updateExpr = confidence !== undefined
      ? 'SET #status = :status, lastUpdated = :ts, confidence = :conf'
      : 'SET #status = :status, lastUpdated = :ts';

    const exprValues: Record<string, any> = {
      ':status': status,
      ':ts': new Date().toISOString(),
    };
    if (confidence !== undefined) exprValues[':conf'] = confidence;

    await dynamoDB.send(new UpdateCommand({
      TableName: config.tables.parkingSpace,
      Key: { nodeId, lotId },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: exprValues,
    }));
  }
}

export const lotService = new LotService();
