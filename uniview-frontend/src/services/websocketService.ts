/**
 * WebSocket Service
 * Manages real-time connections and updates
 */

import { io, Socket } from 'socket.io-client';
import { Config } from '../config';
import { WebSocketMessage, ParkingLot, ParkingSpace } from '../types';
import { store } from '../redux/store';
import { updateLot, updateLotOccupancy } from '../redux/slices/lotsSlice';
import { spaceUpdated } from '../redux/slices/spacesSlice';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = Config.WS_MAX_RECONNECT_ATTEMPTS;
  private reconnectInterval = Config.WS_RECONNECT_INTERVAL;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscribedLots: Set<string> = new Set();

  connect(): Promise<void> {
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 8000)
    );
    return Promise.race([this._connect(), timeout]);
  }

  private _connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      console.log('[WebSocket] Connecting to', Config.WS_URL);

      this.socket = io(Config.WS_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: this.reconnectInterval,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        // Resubscribe to lots after reconnection
        this.subscribedLots.forEach(lotId => {
          this.socket?.emit('subscribe', { lotId });
        });

        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        this.stopHeartbeat();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      this.socket.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });

      // Listen for parking updates
      this.socket.on('lot_update', (message: WebSocketMessage) => {
        this.handleLotUpdate(message);
      });

      this.socket.on('space_update', (message: WebSocketMessage) => {
        this.handleSpaceUpdate(message);
      });

      this.socket.on('system_alert', (message: WebSocketMessage) => {
        this.handleSystemAlert(message);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting');
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.subscribedLots.clear();
    }
  }

  subscribeTo(lotId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot subscribe - not connected');
      return;
    }

    console.log('[WebSocket] Subscribing to lot:', lotId);
    this.socket.emit('subscribe', { lotId });
    this.subscribedLots.add(lotId);
  }

  unsubscribeFrom(lotId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    console.log('[WebSocket] Unsubscribing from lot:', lotId);
    this.socket.emit('unsubscribe', { lotId });
    this.subscribedLots.delete(lotId);
  }

  subscribeToVisible(lotIds: string[]): void {
    // Unsubscribe from lots no longer visible
    this.subscribedLots.forEach(lotId => {
      if (!lotIds.includes(lotId)) {
        this.unsubscribeFrom(lotId);
      }
    });

    // Subscribe to newly visible lots
    lotIds.forEach(lotId => {
      if (!this.subscribedLots.has(lotId)) {
        this.subscribeTo(lotId);
      }
    });
  }

  private handleLotUpdate(message: WebSocketMessage): void {
    if (message.type === 'lot_update') {
      const lot = message.payload as ParkingLot;
      console.log('[WebSocket] Lot update received:', lot.lotId);
      
      store.dispatch(updateLot(lot));
    }
  }

  private handleSpaceUpdate(message: WebSocketMessage): void {
    if (message.type === 'space_update') {
      const space = message.payload as ParkingSpace;
      console.log('[WebSocket] Space update received:', space.nodeId);

      // Capture previous state before dispatching
      const prevState = store.getState();
      const lot = prevState.lots.byId[space.lotId];
      const prevSpace = prevState.spaces.byNodeId[space.nodeId];

      // Update the individual space in Redux
      store.dispatch(spaceUpdated(space));

      if (lot && prevSpace && prevSpace.status !== space.status) {
        const delta = space.status === 'available' ? 1 : -1;
        store.dispatch(updateLotOccupancy({
          lotId: space.lotId,
          availableSpaces: Math.max(0, lot.availableSpaces + delta),
          occupiedSpaces: Math.max(0, lot.occupiedSpaces - delta),
        }));
      }
    }
  }

  private handleSystemAlert(message: WebSocketMessage): void {
    console.log('[WebSocket] System alert received:', message.payload);
    // Handle system alerts (could show in-app notification)
    // This could integrate with a notification service
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, Config.WS_HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSubscribedLots(): string[] {
    return Array.from(this.subscribedLots);
  }
}

export const websocketService = new WebSocketService();
