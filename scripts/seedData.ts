/**
 * Script to seed DynamoDB with test data for Project Uniview
 * Run with: npm run db:seed
 */

import { PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../src/db/dynamodb';

// Rutgers University parking lot data (realistic locations)
const parkingLots = [
  {
    lotId: 'LOT_BUSCH_SC',
    name: 'Busch Student Center',
    description: 'Main student parking near Busch Student Center',
    location: { latitude: 40.5231, longitude: -74.4587 },
    totalSpaces: 150,
    currentAvailable: 47,
    zones: ['A', 'B', 'C'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Faculty', 'Visitor'],
      amenities: ['Well-lit', 'Security cameras', 'EV Charging'],
      rates: { hourly: 2.0, daily: 10.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_COLLEGE_AVE',
    name: 'College Avenue Garage',
    description: 'Multi-level parking garage on College Avenue',
    location: { latitude: 40.5013, longitude: -74.4474 },
    totalSpaces: 200,
    currentAvailable: 89,
    zones: ['Level1', 'Level2', 'Level3', 'Level4'],
    metadata: {
      accessHours: '6AM-12AM',
      permitTypes: ['Student', 'Faculty', 'Visitor'],
      amenities: ['Covered', 'Security cameras', 'Elevator'],
      rates: { hourly: 3.0, daily: 15.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_LIVINGSTON',
    name: 'Livingston Plaza',
    description: 'Open parking lot near Livingston Student Center',
    location: { latitude: 40.5239, longitude: -74.4363 },
    totalSpaces: 120,
    currentAvailable: 65,
    zones: ['North', 'South'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Faculty'],
      amenities: ['Well-lit', 'Security patrol'],
      rates: { hourly: 1.5, daily: 8.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_COOK_DOUGLASS',
    name: 'Cook/Douglass Lot',
    description: 'Large parking area serving Cook and Douglass campuses',
    location: { latitude: 40.4823, longitude: -74.4357 },
    totalSpaces: 180,
    currentAvailable: 112,
    zones: ['Cook', 'Douglass'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Faculty', 'Staff'],
      amenities: ['Well-lit', 'Handicap accessible'],
      rates: { hourly: 1.0, daily: 6.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_STADIUM',
    name: 'Stadium Parking',
    description: 'Large lot near the football stadium',
    location: { latitude: 40.5137, longitude: -74.4648 },
    totalSpaces: 500,
    currentAvailable: 423,
    zones: ['A', 'B', 'C', 'D', 'E'],
    metadata: {
      accessHours: '6AM-10PM',
      permitTypes: ['Event', 'Faculty', 'Staff'],
      amenities: ['Shuttle service', 'Security cameras'],
      rates: { hourly: 2.0, daily: 12.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
];

// Generate parking spaces for each lot
function generateSpacesForLot(lot: any): any[] {
  const spaces: any[] = [];
  const totalSpaces = lot.totalSpaces;
  const availableCount = lot.currentAvailable;
  const occupiedCount = totalSpaces - availableCount;

  // Base coordinates for the lot
  const baseLat = lot.location.latitude;
  const baseLng = lot.location.longitude;

  for (let i = 0; i < totalSpaces; i++) {
    const zoneIndex = i % lot.zones.length;
    const zone = lot.zones[zoneIndex];
    const spaceInZone = Math.floor(i / lot.zones.length) + 1;

    // Determine status (random distribution matching available count)
    let status: string;
    if (i < occupiedCount) {
      status = Math.random() < 0.95 ? 'occupied' : 'offline';
    } else {
      status = 'available';
    }

    // Generate slightly offset coordinates for each space
    const latOffset = (Math.random() - 0.5) * 0.002;
    const lngOffset = (Math.random() - 0.5) * 0.002;

    spaces.push({
      nodeId: `NODE_${lot.lotId}_${String(i + 1).padStart(3, '0')}`,
      lotId: lot.lotId,
      spaceNumber: `${zone}-${String(spaceInZone).padStart(3, '0')}`,
      status,
      location: {
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
      },
      lastUpdated: new Date(Date.now() - Math.random() * 300000).toISOString(), // Random time in last 5 mins
      batteryLevel: Math.floor(70 + Math.random() * 30), // 70-100%
      signalStrength: Math.floor(-80 + Math.random() * 40), // -80 to -40 dBm
      confidence: 0.95 + Math.random() * 0.05, // 95-100%
      metadata: {
        installDate: '2025-09-01',
        hardwareVersion: '2.0',
        firmwareVersion: '1.0.3',
      },
    });
  }

  // Shuffle to randomize which spaces are occupied
  return spaces.sort(() => Math.random() - 0.5);
}

async function seedLots() {
  console.log('Seeding parking lots...');

  for (const lot of parkingLots) {
    try {
      await dynamoDB.send(
        new PutCommand({
          TableName: 'ParkingLot',
          Item: lot,
        })
      );
      console.log(`  Added lot: ${lot.name}`);
    } catch (error: any) {
      console.error(`  Error adding lot ${lot.lotId}:`, error.message);
    }
  }
}

async function seedSpaces() {
  console.log('\nSeeding parking spaces...');

  for (const lot of parkingLots) {
    const spaces = generateSpacesForLot(lot);
    console.log(`  Generating ${spaces.length} spaces for ${lot.name}...`);

    // Batch write in groups of 25 (DynamoDB limit)
    const batchSize = 25;
    for (let i = 0; i < spaces.length; i += batchSize) {
      const batch = spaces.slice(i, i + batchSize);
      const putRequests = batch.map((space) => ({
        PutRequest: { Item: space },
      }));

      try {
        await dynamoDB.send(
          new BatchWriteCommand({
            RequestItems: {
              ParkingSpace: putRequests,
            },
          })
        );
      } catch (error: any) {
        console.error(`    Error writing batch:`, error.message);
      }
    }
    console.log(`    Added ${spaces.length} spaces`);
  }
}

async function main() {
  console.log('\n========================================');
  console.log('  Project Uniview - Seed Data');
  console.log('========================================\n');

  await seedLots();
  await seedSpaces();

  console.log('\n========================================');
  console.log('  Seeding complete!');
  console.log('========================================');
  console.log('\nSummary:');
  console.log(`  Lots: ${parkingLots.length}`);
  console.log(`  Total Spaces: ${parkingLots.reduce((sum, lot) => sum + lot.totalSpaces, 0)}`);
  console.log('\n');
}

main().catch(console.error);
