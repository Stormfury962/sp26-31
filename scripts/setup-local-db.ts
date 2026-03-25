/**
 * Setup script for local DynamoDB
 * Creates tables and seeds initial data
 */

import {
  CreateTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const ENDPOINT = 'http://localhost:8000';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Table definitions
const tables = [
  {
    TableName: 'ParkingLot',
    KeySchema: [{ AttributeName: 'lotId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'lotId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'ParkingSpace',
    KeySchema: [{ AttributeName: 'nodeId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'nodeId', AttributeType: 'S' },
      { AttributeName: 'lotId', AttributeType: 'S' },
      { AttributeName: 'lastUpdated', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'lotId-lastUpdated-index',
        KeySchema: [
          { AttributeName: 'lotId', KeyType: 'HASH' },
          { AttributeName: 'lastUpdated', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'User',
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

// Seed data for parking lots
const parkingLots = [
  {
    lotId: 'lot-1',
    name: 'Lot A - Student Center',
    location: { latitude: 40.5008, longitude: -74.4474 },
    totalSpaces: 150,
    type: 'student',
    amenities: ['covered', 'ev-charging', 'handicap'],
    hours: '24/7',
  },
  {
    lotId: 'lot-2',
    name: 'Lot B - Engineering Building',
    location: { latitude: 40.502, longitude: -74.449 },
    totalSpaces: 200,
    type: 'faculty',
    amenities: ['covered'],
    hours: '6AM - 10PM',
  },
  {
    lotId: 'lot-3',
    name: 'Lot C - Library',
    location: { latitude: 40.4995, longitude: -74.446 },
    totalSpaces: 100,
    type: 'visitor',
    amenities: ['ev-charging'],
    hours: '24/7',
  },
  {
    lotId: 'lot-4',
    name: 'Lot D - Recreation Center',
    location: { latitude: 40.501, longitude: -74.445 },
    totalSpaces: 80,
    type: 'student',
    amenities: ['handicap'],
    hours: '6AM - 11PM',
  },
];

// Generate parking spaces for each lot
function generateSpaces(lotId: string, count: number) {
  const spaces = [];
  const statuses = ['available', 'occupied', 'available', 'available', 'occupied'];

  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    spaces.push({
      nodeId: `${lotId}-space-${i}`,
      lotId,
      spaceNumber: `${String.fromCharCode(65 + Math.floor((i - 1) / 20))}${((i - 1) % 20) + 1}`,
      status,
      type: i <= 5 ? 'handicap' : i <= 10 ? 'ev-charging' : 'regular',
      lastUpdated: new Date().toISOString(),
    });
  }
  return spaces;
}

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch {
    return false;
  }
}

async function createTables() {
  console.log('Creating tables...');

  for (const table of tables) {
    if (await tableExists(table.TableName)) {
      console.log(`  Table ${table.TableName} already exists`);
      continue;
    }

    try {
      await client.send(new CreateTableCommand(table as any));
      console.log(`  Created table: ${table.TableName}`);
    } catch (error: any) {
      console.error(`  Error creating ${table.TableName}:`, error.message);
    }
  }
}

async function seedData() {
  console.log('\nSeeding data...');

  // Seed parking lots
  for (const lot of parkingLots) {
    await docClient.send(new PutCommand({
      TableName: 'ParkingLot',
      Item: lot,
    }));
    console.log(`  Added lot: ${lot.name}`);

    // Generate and seed spaces for each lot
    const spaces = generateSpaces(lot.lotId, lot.totalSpaces);
    for (const space of spaces) {
      await docClient.send(new PutCommand({
        TableName: 'ParkingSpace',
        Item: space,
      }));
    }
    console.log(`    Added ${spaces.length} spaces`);
  }
}

async function main() {
  console.log('=== DynamoDB Local Setup ===\n');
  console.log(`Connecting to: ${ENDPOINT}\n`);

  try {
    // Check connection
    await client.send(new ListTablesCommand({}));
    console.log('Connected to DynamoDB Local\n');
  } catch (error) {
    console.error('ERROR: Cannot connect to DynamoDB Local');
    console.error('Make sure DynamoDB Local is running on port 8000');
    console.error('\nStart it with: npm run dynamodb:start');
    process.exit(1);
  }

  await createTables();
  await seedData();

  console.log('\n=== Setup Complete ===');
}

main().catch(console.error);
