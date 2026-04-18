# Uniview Local Development Setup

## Starting the App

**1. Start DynamoDB Local** (in first terminal):
```bash
cd C:\Users\siddm\Projects\sp26-31
npm run dynamodb:start
```

**2. Start the Backend** (in second terminal):
```bash
cd C:\Users\siddm\Projects\sp26-31
npm run dev
```

**3. Start the Android App** (in third terminal):
```bash
cd C:\Users\siddm\Projects\sp26-31\uniview-frontend
npx react-native run-android
```

## If Starting Fresh (new machine or after pulling from GitHub)

```bash
# Install backend dependencies
cd C:\Users\siddm\Projects\sp26-31
npm install

# Install frontend dependencies
cd uniview-frontend
npm install --legacy-peer-deps

# Seed the database (only needed once)
# Terminal 1:
npm run dynamodb:start
# Terminal 2:
npm run db:setup
```

### Additional Setup

1. **Google Maps API Key**: Add your key to `uniview-frontend/android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data
     android:name="com.google.android.geo.API_KEY"
     android:value="YOUR_API_KEY_HERE"/>
   ```

2. **Android SDK Path**: Create `uniview-frontend/android/local.properties`:
   ```
   sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
   ```

## Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 3000 in use | Close other terminals or restart your computer |
| Port 8000 in use | DynamoDB already running, that's fine |
| App won't connect | Make sure backend shows "Server running on http://localhost:3000" |
| Map not loading | Check your Google Maps API key in AndroidManifest.xml |
| Build fails | Make sure you have JDK 17 installed (`java -version`) |
| npm install fails | Use `npm install --legacy-peer-deps` for frontend |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend server |
| `npm run dynamodb:start` | Start local DynamoDB |
| `npm run local:setup` | Create tables and seed data |
| `npx react-native run-android` | Build and run Android app |
