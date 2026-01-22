import { createSlice } from '@reduxjs/toolkit';
import { WebSocketState } from '../../types';

const initialState: WebSocketState = {
  connected: false,
  reconnecting: false,
  error: null,
  subscribedLots: [],
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {},
});

export default websocketSlice.reducer;
