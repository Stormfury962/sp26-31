import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { ParkingSpace, SpacesState } from '../../types';
import { apiService } from '../../services/apiService';

const initialState: SpacesState = {
  byNodeId: {},
  byLotId: {},
  loading: false,
  error: null,
};

export const fetchSpaces = createAsyncThunk(
  'spaces/fetchSpaces',
  async (lotId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getLotSpaces(lotId);
      // Backend wraps spaces in { lotId, spaces, ... }
      const spaces: ParkingSpace[] = (response.data as any)?.spaces ?? response.data ?? [];
      return { lotId, spaces };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const spacesSlice = createSlice({
  name: 'spaces',
  initialState,
  reducers: {
    spaceUpdated: (state, action: PayloadAction<ParkingSpace>) => {
      const space = action.payload;
      state.byNodeId[space.nodeId] = space;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchSpaces.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchSpaces.fulfilled, (state, action) => {
      state.loading = false;
      const { lotId, spaces } = action.payload;
      state.byLotId[lotId] = spaces.map(s => s.nodeId);
      spaces.forEach(space => {
        state.byNodeId[space.nodeId] = space;
      });
    });
    builder.addCase(fetchSpaces.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { spaceUpdated } = spacesSlice.actions;

const selectByNodeId = (state: { spaces: SpacesState }) => state.spaces.byNodeId;
const selectByLotId = (state: { spaces: SpacesState }) => state.spaces.byLotId;

export const makeSelectSpacesByLotId = (lotId: string) =>
  createSelector([selectByNodeId, selectByLotId], (byNodeId, byLotId) => {
    const nodeIds = byLotId[lotId] ?? [];
    return nodeIds.map(id => byNodeId[id]).filter(Boolean) as ParkingSpace[];
  });

export const selectSpacesLoading = (state: { spaces: SpacesState }) => state.spaces.loading;

export default spacesSlice.reducer;
