const dynamodbLocal = require('dynamodb-local');

const PORT = 8000;

console.log('Starting DynamoDB Local on port', PORT);
console.log('This will download DynamoDB Local JAR if not already downloaded...\n');

dynamodbLocal.launch(PORT, null, ['-sharedDb'])
  .then(() => {
    console.log('DynamoDB Local is running on http://localhost:' + PORT);
    console.log('\nPress Ctrl+C to stop');
  })
  .catch((err) => {
    console.error('Failed to start DynamoDB Local:', err);
    process.exit(1);
  });
