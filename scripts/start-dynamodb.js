const dynamodbLocal = require('dynamodb-local');
const path = require('path');
const fs = require('fs');

const PORT = 8000;
const DB_PATH = path.join(__dirname, '..', 'data', 'dynamodb');

// Ensure the data directory exists
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
  console.log('Created DynamoDB data directory:', DB_PATH);
}

console.log('Starting DynamoDB Local on port', PORT);
console.log('Data directory:', DB_PATH, '\n');

dynamodbLocal.launch(PORT, DB_PATH, ['-sharedDb'])
  .then(() => {
    console.log('DynamoDB Local is running on http://localhost:' + PORT);
    console.log('Data will persist between restarts.');
    console.log('\nPress Ctrl+C to stop');
  })
  .catch((err) => {
    console.error('Failed to start DynamoDB Local:', err);
    process.exit(1);
  });
