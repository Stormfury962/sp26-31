/**
 * Script to seed DynamoDB with test data for Project Uniview
 * Run with: npm run db:seed
 */

import { PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../src/db/dynamodb';

// Rutgers University parking lot data (realistic locations)
// rowAngle: degrees clockwise from north that parking ROWS run
//   0  = rows run N-S (cars face E or W)
//   90 = rows run E-W (cars face N or S)
const parkingLots = [
  {
    lotId: 'LOT_BUSCH_SC',
    name: 'Busch Student Center',
    description: 'Main student parking near Busch Student Center',
    location: { latitude: 40.5231, longitude: -74.4587 },
    rowAngle: 85,
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
    location: { latitude: 40.4997, longitude: -74.4480 },
    rowAngle: 90,
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
    rowAngle: 80,
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
    location: { latitude: 40.4835, longitude: -74.4383 },
    rowAngle: 10,
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
    rowAngle: 45,
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
  {
    lotId: 'LOT_BUSCH_SC2',
    name: 'Busch Student Center Lot B',
    description: 'Overflow parking lot adjacent to the Busch Student Center',
    location: { latitude: 40.5238, longitude: -74.4572 },
    rowAngle: 85,
    totalSpaces: 130,
    currentAvailable: 41,
    zones: ['A', 'B'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Faculty', 'Staff'],
      amenities: ['Well-lit', 'Security cameras'],
      rates: { hourly: 2.0, daily: 10.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_WERBLIN',
    name: 'Werblin Recreation Center Lot',
    description: 'Parking lot adjacent to the Werblin Recreation Center on Busch Campus',
    location: { latitude: 40.5200, longitude: -74.4604 },
    rowAngle: 10,
    totalSpaces: 90,
    currentAvailable: 33,
    zones: ['Main'],
    metadata: {
      accessHours: '6AM-11PM',
      permitTypes: ['Student', 'Faculty', 'Visitor'],
      amenities: ['Well-lit', 'Handicap accessible'],
      rates: { hourly: 1.5, daily: 8.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_LIV_APARTMENTS',
    name: 'Livingston Apartments Lot',
    description: 'Residential parking lot for Livingston Apartment residents',
    location: { latitude: 40.5256, longitude: -74.4389 },
    rowAngle: 80,
    totalSpaces: 160,
    currentAvailable: 28,
    zones: ['North', 'South', 'East'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Resident', 'Student'],
      amenities: ['Well-lit', 'Security patrol', 'Gated overnight'],
      rates: { hourly: 0.0, daily: 0.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_LIV_QUADS',
    name: 'Livingston Quads Lot',
    description: 'Parking lot serving the Livingston Quads residential area',
    location: { latitude: 40.5220, longitude: -74.4360 },
    rowAngle: 0,
    totalSpaces: 100,
    currentAvailable: 52,
    zones: ['A', 'B'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Resident', 'Student', 'Visitor'],
      amenities: ['Well-lit'],
      rates: { hourly: 1.0, daily: 6.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_SCOTT_HALL',
    name: 'Scott Hall Lot',
    description: 'Parking lot near Scott Hall and the College Avenue academic buildings',
    location: { latitude: 40.4998, longitude: -74.4480 },
    rowAngle: 90,
    totalSpaces: 75,
    currentAvailable: 18,
    zones: ['Main'],
    metadata: {
      accessHours: '7AM-11PM',
      permitTypes: ['Faculty', 'Staff', 'Visitor'],
      amenities: ['Security cameras', 'Handicap accessible'],
      rates: { hourly: 3.0, daily: 15.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_COOK_AG',
    name: 'Cook Ag Quad Lot',
    description: 'Parking lot near the Agriculture Quad on Cook Campus',
    location: { latitude: 40.4848, longitude: -74.4313 },
    rowAngle: 5,
    totalSpaces: 110,
    currentAvailable: 74,
    zones: ['North', 'South'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Faculty', 'Staff'],
      amenities: ['Well-lit', 'Handicap accessible'],
      rates: { hourly: 1.0, daily: 6.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_DOUGLASS',
    name: 'Douglass Residential Lot',
    description: 'Parking lot serving Douglass Campus residential buildings',
    location: { latitude: 40.4835, longitude: -74.4383 },
    rowAngle: 15,
    totalSpaces: 85,
    currentAvailable: 60,
    zones: ['Main'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Resident', 'Student'],
      amenities: ['Well-lit', 'Security patrol'],
      rates: { hourly: 0.0, daily: 0.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_EASTON_GARAGE',
    name: 'Easton Avenue Garage',
    description: 'Multi-level parking garage on Easton Avenue near College Ave campus',
    location: { latitude: 40.4964, longitude: -74.4449 },
    rowAngle: 90,
    totalSpaces: 300,
    currentAvailable: 134,
    zones: ['Level1', 'Level2', 'Level3', 'Level4', 'Level5'],
    metadata: {
      accessHours: '6AM-12AM',
      permitTypes: ['Student', 'Faculty', 'Visitor'],
      amenities: ['Covered', 'Security cameras', 'Elevator', 'Handicap accessible'],
      rates: { hourly: 3.0, daily: 15.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_HILL_CENTER',
    name: 'Hill Center Lot',
    description: 'Parking lot adjacent to Hill Center on Busch Campus, near CS and Math buildings',
    location: { latitude: 40.5218, longitude: -74.4631 },
    rowAngle: 80,
    totalSpaces: 95,
    currentAvailable: 38,
    zones: ['A', 'B'],
    metadata: {
      accessHours: '7AM-11PM',
      permitTypes: ['Faculty', 'Staff', 'Student'],
      amenities: ['Well-lit', 'Security cameras'],
      rates: { hourly: 2.0, daily: 10.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_ARCB',
    name: 'Allison Road Classroom Lot',
    description: 'Parking lot near the Allison Road Classroom Building on Busch Campus',
    location: { latitude: 40.5256, longitude: -74.4624 },
    rowAngle: 5,
    totalSpaces: 110,
    currentAvailable: 55,
    zones: ['North', 'South'],
    metadata: {
      accessHours: '7AM-10PM',
      permitTypes: ['Student', 'Faculty'],
      amenities: ['Well-lit'],
      rates: { hourly: 2.0, daily: 10.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_RUTGERS_STUDENT_CENTER',
    name: 'Rutgers Student Center Lot',
    description: 'Surface lot behind the Rutgers Student Center on College Avenue',
    location: { latitude: 40.4993, longitude: -74.4497 },
    rowAngle: 90,
    totalSpaces: 80,
    currentAvailable: 22,
    zones: ['Main'],
    metadata: {
      accessHours: '7AM-11PM',
      permitTypes: ['Student', 'Visitor'],
      amenities: ['Well-lit', 'Handicap accessible'],
      rates: { hourly: 3.0, daily: 15.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
];

// Generate parking spaces in a proper grid layout
// rowAngle: degrees clockwise from north that parking ROWS run
function generateSpacesForLot(lot: any): any[] {
  const SPACE_WIDTH = 2.7;     // meters, perpendicular to row direction
  const ROW_PITCH = 12.0;      // meters center-to-center between rows (space depth + aisle)

  const LAT_PER_METER = 1 / 111320;
  const LNG_PER_METER = 1 / (111320 * Math.cos(lot.location.latitude * Math.PI / 180));

  const rad = ((lot.rowAngle ?? 0) * Math.PI) / 180;

  const totalSpaces = lot.totalSpaces;
  const spacesPerRow = Math.max(8, Math.min(15, Math.round(Math.sqrt(totalSpaces))));
  const numRows = Math.ceil(totalSpaces / spacesPerRow);

  // Build a shuffled status list so occupied/available are randomly distributed
  const occupiedCount = totalSpaces - lot.currentAvailable;
  const statusList: string[] = [
    ...Array(occupiedCount).fill(null).map(() => Math.random() < 0.95 ? 'occupied' : 'offline'),
    ...Array(totalSpaces - occupiedCount).fill('available'),
  ];
  for (let i = statusList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [statusList[i], statusList[j]] = [statusList[j], statusList[i]];
  }

  const spaces: any[] = [];
  let idx = 0;

  for (let row = 0; row < numRows && idx < totalSpaces; row++) {
    for (let col = 0; col < spacesPerRow && idx < totalSpaces; col++) {
      // Offset from lot center in meters (before rotation)
      const along = (col - (spacesPerRow - 1) / 2) * SPACE_WIDTH;
      const across = (row - (numRows - 1) / 2) * ROW_PITCH;

      // Rotate: rows run at rowAngle clockwise from north
      const east  = along * Math.sin(rad) + across * Math.cos(rad);
      const north = along * Math.cos(rad) - across * Math.sin(rad);

      const zone = lot.zones[row % lot.zones.length];

      spaces.push({
        nodeId: `NODE_${lot.lotId}_${String(idx + 1).padStart(3, '0')}`,
        lotId: lot.lotId,
        spaceNumber: `${zone}-${String(col + 1).padStart(3, '0')}`,
        status: statusList[idx],
        location: {
          latitude:  lot.location.latitude  + north * LAT_PER_METER,
          longitude: lot.location.longitude + east  * LNG_PER_METER,
        },
        lastUpdated: new Date(Date.now() - Math.random() * 300000).toISOString(),
        batteryLevel: Math.floor(70 + Math.random() * 30),
        signalStrength: Math.floor(-80 + Math.random() * 40),
        confidence: 0.95 + Math.random() * 0.05,
        metadata: { installDate: '2025-09-01', hardwareVersion: '2.0', firmwareVersion: '1.0.3' },
      });
      idx++;
    }
  }

  return spaces;
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
