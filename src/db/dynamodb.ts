import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

const clientConfig: any = {
  region: config.aws.region,
};

// Use local DynamoDB endpoint if configured (for development)
if (config.aws.dynamoDbEndpoint) {
  clientConfig.endpoint = config.aws.dynamoDbEndpoint;
}

// Add credentials if provided
if (config.aws.accessKeyId && config.aws.secretAccessKey) {
  clientConfig.credentials = {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  };
}

const client = new DynamoDBClient(clientConfig);

export const dynamoDB = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export { client as dynamoDBClient };
