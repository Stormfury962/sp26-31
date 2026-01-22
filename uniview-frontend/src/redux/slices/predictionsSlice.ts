/**
 * Predictions Redux Slice
 * Manages predictive analytics for parking occupancy
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OccupancyPrediction, PredictionsState } from '../../types';
import { apiService } from '../../services/apiService';
import { Config } from '../../config';

const initialState: PredictionsState = {
  byLotId: {},
  loading: false,
  error: null,
  cacheExpiry: {},
};

// Async Thunks
export const fetchPrediction = createAsyncThunk(
  'predictions/fetchPrediction',
  async (lotId: string, { rejectWithValue, getState }) => {
    try {
      // Check if cached prediction is still valid
      const state = getState() as any;
      const cachedExpiry = state.predictions.cacheExpiry[lotId];
      
      if (cachedExpiry && new Date(cachedExpiry) > new Date()) {
        // Return cached data if still valid
        return state.predictions.byLotId[lotId];
      }

      const response = await apiService.getPrediction(lotId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMultiplePredictions = createAsyncThunk(
  'predictions/fetchMultiplePredictions',
  async (lotIds: string[], { rejectWithValue }) => {
    try {
      const promises = lotIds.map(lotId => apiService.getPrediction(lotId));
      const responses = await Promise.all(promises);
      return responses.map(r => r.data);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const refreshPrediction = createAsyncThunk(
  'predictions/refreshPrediction',
  async (lotId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getPrediction(lotId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const predictionsSlice = createSlice({
  name: 'predictions',
  initialState,
  reducers: {
    updatePrediction: (state, action: PayloadAction<OccupancyPrediction>) => {
      const prediction = action.payload;
      state.byLotId[prediction.lotId] = prediction;
      
      // Set cache expiry to 5 minutes from now
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5);
      state.cacheExpiry[prediction.lotId] = expiry.toISOString();
    },
    clearPrediction: (state, action: PayloadAction<string>) => {
      const lotId = action.payload;
      delete state.byLotId[lotId];
      delete state.cacheExpiry[lotId];
    },
    clearAllPredictions: (state) => {
      state.byLotId = {};
      state.cacheExpiry = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Prediction
    builder.addCase(fetchPrediction.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchPrediction.fulfilled, (state, action: PayloadAction<OccupancyPrediction>) => {
      state.loading = false;
      const prediction = action.payload;
      state.byLotId[prediction.lotId] = prediction;
      
      // Set cache expiry
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5);
      state.cacheExpiry[prediction.lotId] = expiry.toISOString();
    });
    builder.addCase(fetchPrediction.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch Multiple Predictions
    builder.addCase(fetchMultiplePredictions.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      fetchMultiplePredictions.fulfilled,
      (state, action: PayloadAction<OccupancyPrediction[]>) => {
        state.loading = false;
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 5);
        
        action.payload.forEach((prediction) => {
          state.byLotId[prediction.lotId] = prediction;
          state.cacheExpiry[prediction.lotId] = expiry.toISOString();
        });
      }
    );
    builder.addCase(fetchMultiplePredictions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Refresh Prediction
    builder.addCase(refreshPrediction.fulfilled, (state, action: PayloadAction<OccupancyPrediction>) => {
      const prediction = action.payload;
      state.byLotId[prediction.lotId] = prediction;
      
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5);
      state.cacheExpiry[prediction.lotId] = expiry.toISOString();
    });
  },
});

export const {
  updatePrediction,
  clearPrediction,
  clearAllPredictions,
  clearError,
} = predictionsSlice.actions;

// Selectors
export const selectPredictionByLotId = (
  state: { predictions: PredictionsState },
  lotId: string
) => state.predictions.byLotId[lotId];

export const selectPredictionsLoading = (state: { predictions: PredictionsState }) =>
  state.predictions.loading;

export const selectPredictionsError = (state: { predictions: PredictionsState }) =>
  state.predictions.error;

export const selectIsPredictionCached = (
  state: { predictions: PredictionsState },
  lotId: string
) => {
  const expiry = state.predictions.cacheExpiry[lotId];
  return expiry ? new Date(expiry) > new Date() : false;
};

export default predictionsSlice.reducer;
