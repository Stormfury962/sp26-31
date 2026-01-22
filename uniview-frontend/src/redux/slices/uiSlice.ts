/**
 * UI State Redux Slice
 * Manages UI-related state like map region, filters, theme
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, MapRegion, SearchFilter } from '../../types';
import { Config } from '../../config';

const initialState: UIState = {
  mapRegion: Config.DEFAULT_REGION,
  selectedLotId: null,
  searchFilter: {
    sortBy: 'distance',
  },
  bottomSheetVisible: false,
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMapRegion: (state, action: PayloadAction<MapRegion>) => {
      state.mapRegion = action.payload;
    },
    selectLot: (state, action: PayloadAction<string | null>) => {
      state.selectedLotId = action.payload;
      state.bottomSheetVisible = action.payload !== null;
    },
    setSearchFilter: (state, action: PayloadAction<Partial<SearchFilter>>) => {
      state.searchFilter = {
        ...state.searchFilter,
        ...action.payload,
      };
    },
    resetSearchFilter: (state) => {
      state.searchFilter = { sortBy: 'distance' };
    },
    toggleBottomSheet: (state, action: PayloadAction<boolean>) => {
      state.bottomSheetVisible = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    closeBottomSheet: (state) => {
      state.bottomSheetVisible = false;
      state.selectedLotId = null;
    },
  },
});

export const {
  setMapRegion,
  selectLot,
  setSearchFilter,
  resetSearchFilter,
  toggleBottomSheet,
  setTheme,
  closeBottomSheet,
} = uiSlice.actions;

// Selectors
export const selectMapRegion = (state: { ui: UIState }) => state.ui.mapRegion;
export const selectSelectedLotId = (state: { ui: UIState }) => state.ui.selectedLotId;
export const selectSearchFilter = (state: { ui: UIState }) => state.ui.searchFilter;
export const selectBottomSheetVisible = (state: { ui: UIState }) => state.ui.bottomSheetVisible;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;

export default uiSlice.reducer;
