import { ScanCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../db/dynamodb';
import { config } from '../config';
import { ParkingLot, ParkingSpace } from '../types';

// Mock data for development when DynamoDB is not available
const MOCK_LOTS: ParkingLot[] = [
  {
    lotId: 'lot-1',
    name: 'Lot A - Student Center',
    location: { latitude: 40.5008, longitude: -74.4474 },
    totalSpaces: 150,
    availableSpaces: 42,
    occupiedSpaces: 103,
    offlineSpaces: 5,
    occupancyRate: 68.7,
    type: 'student',
    amenities: ['covered', 'ev-charging', 'handicap'],
    hours: '24/7',
    lastUpdate: new Date().toISOString(),
  },
  {
    lotId: 'lot-2',
    name: 'Lot B - Engineering Building',
    location: { latitude: 40.5020, longitude: -74.4490 },
    totalSpaces: 200,
    availableSpaces: 15,
    occupiedSpaces: 180,
    offlineSpaces: 5,
    occupancyRate: 90.0,
    type: 'faculty',
    amenities: ['covered'],
    hours: '6AM - 10PM',
    lastUpdate: new Date().toISOString(),
  },
  {
    lotId: 'lot-3',
    name: 'Lot C - Library',
    location: { latitude: 40.4995, longitude: -74.4460 },
    totalSpaces: 100,
    availableSpaces: 67,
    occupiedSpaces: 30,
    offlineSpaces: 3,
    occupancyRate: 30.0,
    type: 'visitor',
    amenities: ['ev-charging'],
    hours: '24/7',
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
    const command = new GetCommand({
      TableName: config.tables.parkingLot,
      Key: { lotId },
    });

    const result = await dynamoDB.send(command);
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
}

export const lotService = new LotService();
