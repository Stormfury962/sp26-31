import { createSlice } from '@reduxjs/toolkit';
import { SpacesState } from '../../types';

const initialState: SpacesState = {
  byNodeId: {},
  byLotId: {},
  loading: false,
  error: null,
};

const spacesSlice = createSlice({
  name: 'spaces',
  initialState,
  reducers: {},
});

export default spacesSlice.reducer;
