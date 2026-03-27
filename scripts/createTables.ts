/**
 * Script to create DynamoDB tables for Project Uniview
 * Run with: npm run db:create-tables
 */

import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { dynamoDBClient } from '../src/db/dynamodb';

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
  {
    TableName: 'OccupancyHistory',
    KeySchema: [
      { AttributeName: 'nodeId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'nodeId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'PredictionData',
    KeySchema: [
      { AttributeName: 'lotId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'lotId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await dynamoDBClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false;
    }
    throw error;
  }
}

async function createTable(tableConfig: any): Promise<void> {
  const tableName = tableConfig.TableName;

  if (await tableExists(tableName)) {
    console.log(`  Table '${tableName}' already exists, skipping...`);
    return;
  }

  console.log(`  Creating table '${tableName}'...`);
  await dynamoDBClient.send(new CreateTableCommand(tableConfig));
  console.log(`  Table '${tableName}' created successfully!`);
}

async function main() {
  console.log('\n========================================');
  console.log('  Project Uniview - DynamoDB Setup');
  console.log('========================================\n');

  console.log('Creating tables...\n');

  for (const table of tables) {
    try {
      await createTable(table);
    } catch (error: any) {
      console.error(`  Error creating table '${table.TableName}':`, error.message);
    }
  }

  console.log('\n========================================');
  console.log('  Table creation complete!');
  console.log('========================================\n');
}

main().catch(console.error);
