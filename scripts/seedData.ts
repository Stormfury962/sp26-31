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
// Coordinates verified via OpenStreetMap Overpass API (April 2026)
// Arena reference: Jersey Mike's Arena, 83 Rockafeller Rd — 40.5261°N, 74.4416°W
const parkingLots = [
  // ── Livingston Campus / Arena lots (primary demo area) ──────────────────
  {
    lotId: 'LOT_GREEN_RAC',
    name: 'Green Lot (RAC)',
    description: 'Closest lot to Jersey Mike\'s Arena — permit and event parking',
    location: { latitude: 40.5262177, longitude: -74.4401731 },
    rowAngle: 90,
    totalSpaces: 150,
    currentAvailable: 42,
    zones: ['A', 'B'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Faculty', 'Staff', 'Event'],
      amenities: ['Well-lit', 'Security cameras', 'Handicap accessible'],
      rates: { hourly: 0.0, daily: 0.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_YELLOW_RAC',
    name: 'Yellow Lot (RAC)',
    description: 'Game-day and event parking under solar panels near Jersey Mike\'s Arena',
    location: { latitude: 40.5277983, longitude: -74.4382497 },
    rowAngle: 90,
    totalSpaces: 220,
    currentAvailable: 78,
    zones: ['North', 'South'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Event', 'Student', 'Visitor'],
      amenities: ['Solar canopy', 'Well-lit', 'Security cameras', 'EV Charging'],
      rates: { hourly: 0.0, daily: 30.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_915',
    name: 'Lot 915 (Arena Garage)',
    description: 'Multi-level parking garage adjacent to Jersey Mike\'s Arena',
    location: { latitude: 40.5256493, longitude: -74.4416947 },
    rowAngle: 0,
    totalSpaces: 300,
    currentAvailable: 95,
    zones: ['Level1', 'Level2', 'Level3'],
    metadata: {
      accessHours: '6AM-12AM',
      permitTypes: ['Event', 'Student', 'Faculty', 'Visitor'],
      amenities: ['Covered', 'Security cameras', 'Elevator', 'Handicap accessible'],
      rates: { hourly: 2.5, daily: 25.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_112',
    name: 'Lot 112',
    description: 'Surface lot on Livingston Campus near the residential area',
    location: { latitude: 40.5255244, longitude: -74.4360514 },
    rowAngle: 10,
    totalSpaces: 120,
    currentAvailable: 55,
    zones: ['A', 'B'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Faculty'],
      amenities: ['Well-lit'],
      rates: { hourly: 1.5, daily: 8.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_105',
    name: 'Lot 105',
    description: 'Commuter and student parking on Livingston Campus near Joyce Kilmer Ave',
    location: { latitude: 40.5243632, longitude: -74.4337127 },
    rowAngle: 10,
    totalSpaces: 100,
    currentAvailable: 33,
    zones: ['Main'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Commuter'],
      amenities: ['Well-lit', 'Handicap accessible'],
      rates: { hourly: 1.5, daily: 8.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_101',
    name: 'Lot 101',
    description: 'Livingston Campus parking near Avenue E',
    location: { latitude: 40.5213186, longitude: -74.4373713 },
    rowAngle: 15,
    totalSpaces: 180,
    currentAvailable: 91,
    zones: ['North', 'South'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Faculty', 'Staff'],
      amenities: ['Well-lit', 'Security patrol'],
      rates: { hourly: 1.5, daily: 8.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_102',
    name: 'Lot 102',
    description: 'Livingston Campus commuter parking',
    location: { latitude: 40.5213294, longitude: -74.4360095 },
    rowAngle: 10,
    totalSpaces: 150,
    currentAvailable: 67,
    zones: ['A', 'B', 'C'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Commuter'],
      amenities: ['Well-lit'],
      rates: { hourly: 1.5, daily: 8.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_100',
    name: 'Lot 100',
    description: 'Livingston Campus parking near academic buildings',
    location: { latitude: 40.5230234, longitude: -74.4346898 },
    rowAngle: 10,
    totalSpaces: 200,
    currentAvailable: 112,
    zones: ['North', 'South', 'East'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Faculty', 'Visitor'],
      amenities: ['Well-lit', 'Handicap accessible'],
      rates: { hourly: 1.5, daily: 8.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    lotId: 'LOT_103',
    name: 'Lot 103',
    description: 'South Livingston Campus commuter parking',
    location: { latitude: 40.5204727, longitude: -74.4325551 },
    rowAngle: 5,
    totalSpaces: 90,
    currentAvailable: 44,
    zones: ['Main'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Student', 'Commuter'],
      amenities: ['Well-lit'],
      rates: { hourly: 1.5, daily: 8.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  // ── Hardware demo lot (single physical sensor node) ───────────────────
  {
    lotId: 'LOT_TEST',
    name: 'Test Lot (Demo Node)',
    description: 'Single-space demo lot wired to the hardware sensor node',
    location: { latitude: 40.5261, longitude: -74.4416 },
    rowAngle: 0,
    totalSpaces: 1,
    currentAvailable: 1,
    zones: ['Demo'],
    metadata: {
      accessHours: '24/7',
      permitTypes: ['Demo'],
      amenities: [],
      rates: { hourly: 0.0, daily: 0.0 },
    },
    lastUpdated: new Date().toISOString(),
  },
  // ── Other campuses (context for full map) ──────────────────────────────
  {
    lotId: 'LOT_BUSCH_SC',
    name: 'Busch Student Center Lot',
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
    lotId: 'LOT_HILL_CENTER',
    name: 'Hill Center Lot',
    description: 'Parking adjacent to Hill Center on Busch Campus, near CS and Math buildings',
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
    lotId: 'LOT_COOK_DOUGLASS',
    name: 'Cook/Douglass Lot',
    description: 'Large parking area serving Cook and Douglass campuses',
    location: { latitude: 40.4835, longitude: -74.4338 },
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
