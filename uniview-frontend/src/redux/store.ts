/**
 * Redux Store Configuration
 * Combines all slices and configures middleware
 */

import { configureStore } from '@reduxjs/toolkit';
import lotsReducer from './slices/lotsSlice';
import spacesReducer from './slices/spacesSlice';
import predictionsReducer from './slices/predictionsSlice';
import userReducer from './slices/userSlice';
import uiReducer from './slices/uiSlice';
import websocketReducer from './slices/websocketSlice';

export const store = configureStore({
  reducer: {
    lots: lotsReducer,
    spaces: spacesReducer,
    predictions: predictionsReducer,
    user: userReducer,
    ui: uiReducer,
    websocket: websocketReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for non-serializable checks
        ignoredActions: ['websocket/connected', 'websocket/messageReceived'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['websocket.connection'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
