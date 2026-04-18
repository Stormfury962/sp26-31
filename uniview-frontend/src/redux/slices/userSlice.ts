import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserState, User } from '../../types';
import { apiService } from '../../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../../config';

export const loginWithGoogle = createAsyncThunk(
  'user/loginWithGoogle',
  async (
    params: { idToken: string; email: string; name: string; googleId: string; photoUrl?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.googleAuth(params);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error?.message ?? 'Google sign-in failed');
      }
      await AsyncStorage.setItem(Config.CACHE_KEYS.AUTH_TOKEN, response.data.accessToken);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Google sign-in failed');
    }
  }
);

export const restoreSession = createAsyncThunk('user/restoreSession', async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem(Config.CACHE_KEYS.AUTH_TOKEN);
    if (!token) return null;
    const response = await apiService.getUserProfile();
    if (!response.success || !response.data) return null;
    return { user: response.data, token };
  } catch {
    return null;
  }
});

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  token: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginWithGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        state.user = {
          userId: action.payload.userId,
          email: action.payload.email,
          name: action.payload.name,
          photoUrl: action.payload.photoUrl,
          role: action.payload.role,
          createdAt: new Date().toISOString(),
          settings: {
            notificationsEnabled: true,
            pushNotifications: true,
            emailNotifications: false,
            searchRadius: 5000,
            preferredView: 'map',
            theme: 'auto',
            predictionTimeframe: 3,
          },
        };
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
      });
  },
});

export const { setUser, clearUser, setError } = userSlice.actions;
export default userSlice.reducer;
