/**
 * Parking Lots Redux Slice
 * Manages state for all parking lots
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ParkingLot, LotsState } from '../../types';
import { apiService } from '../../services/apiService';

const initialState: LotsState = {
  byId: {},
  allIds: [],
  loading: false,
  error: null,
  lastFetch: null,
};

// Async Thunks
export const fetchLots = createAsyncThunk(
  'lots/fetchLots',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getLots();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchLotDetails = createAsyncThunk(
  'lots/fetchLotDetails',
  async (lotId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getLotDetails(lotId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const refreshLots = createAsyncThunk(
  'lots/refreshLots',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getLots();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const lotsSlice = createSlice({
  name: 'lots',
  initialState,
  reducers: {
    updateLot: (state, action: PayloadAction<ParkingLot>) => {
      const lot = action.payload;
      state.byId[lot.lotId] = lot;
      if (!state.allIds.includes(lot.lotId)) {
        state.allIds.push(lot.lotId);
      }
    },
    updateLotOccupancy: (
      state,
      action: PayloadAction<{ lotId: string; availableSpaces: number; occupiedSpaces: number }>
    ) => {
      const { lotId, availableSpaces, occupiedSpaces } = action.payload;
      if (state.byId[lotId]) {
        state.byId[lotId].availableSpaces = availableSpaces;
        state.byId[lotId].occupiedSpaces = occupiedSpaces;
        state.byId[lotId].occupancyRate = 
          (occupiedSpaces / state.byId[lotId].totalSpaces) * 100;
        state.byId[lotId].lastUpdate = new Date().toISOString();
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Lots
    builder.addCase(fetchLots.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchLots.fulfilled, (state, action: PayloadAction<ParkingLot[]>) => {
      state.loading = false;
      state.lastFetch = new Date().toISOString();
      
      // Normalize data
      action.payload.forEach((lot) => {
        state.byId[lot.lotId] = lot;
        if (!state.allIds.includes(lot.lotId)) {
          state.allIds.push(lot.lotId);
        }
      });
    });
    builder.addCase(fetchLots.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch Lot Details
    builder.addCase(fetchLotDetails.fulfilled, (state, action: PayloadAction<ParkingLot>) => {
      const lot = action.payload;
      state.byId[lot.lotId] = lot;
      if (!state.allIds.includes(lot.lotId)) {
        state.allIds.push(lot.lotId);
      }
    });

    // Refresh Lots
    builder.addCase(refreshLots.fulfilled, (state, action: PayloadAction<ParkingLot[]>) => {
      state.lastFetch = new Date().toISOString();
      action.payload.forEach((lot) => {
        state.byId[lot.lotId] = lot;
      });
    });
  },
});

export const { updateLot, updateLotOccupancy, clearError } = lotsSlice.actions;

// Selectors
export const selectAllLots = (state: { lots: LotsState }) =>
  state.lots.allIds.map((id) => state.lots.byId[id]);

export const selectLotById = (state: { lots: LotsState }, lotId: string) =>
  state.lots.byId[lotId];

export const selectAvailableLots = (state: { lots: LotsState }) =>
  state.lots.allIds
    .map((id) => state.lots.byId[id])
    .filter((lot) => lot.availableSpaces > 0)
    .sort((a, b) => b.availableSpaces - a.availableSpaces);

export const selectLotsLoading = (state: { lots: LotsState }) => state.lots.loading;

export const selectLotsError = (state: { lots: LotsState }) => state.lots.error;

export default lotsSlice.reducer;
