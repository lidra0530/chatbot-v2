import { store } from '../store';
import { updateConnectionStatus, addMessage } from '../store/slices/chatSlice';
import { updateTraits, addEvolutionToHistory } from '../store/slices/personalitySlice';
import { updateSkillProgress } from '../store/slices/skillsSlice';
import { updateCurrentState, addMilestone } from '../store/slices/stateSlice';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface WebSocketEventHandlers {
  [eventType: string]: (data: any) => void;
}

class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventHandlers: WebSocketEventHandlers = {};
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private url: string;

  constructor() {
    this.url = this.getWebSocketUrl();
    this.setupDefaultEventHandlers();
  }

  private getWebSocketUrl(): string {
    const baseUrl = import.meta.env['VITE_WS_URL'] || 'ws://localhost:3000';
    return `${baseUrl}/socket.io/?EIO=4&transport=websocket`;
  }

  private setupDefaultEventHandlers(): void {
    this.eventHandlers = {
      'personality:updated': (data) => {
        store.dispatch(updateTraits(data.traits));
        if (data.evolution) {
          store.dispatch(addEvolutionToHistory(data.evolution));
        }
      },
      'skills:progress': (data) => {
        store.dispatch(updateSkillProgress(data.progress));
      },
      'skills:unlocked': (data) => {
        // Use updateSkillProgress for unlocked skills as well
        store.dispatch(updateSkillProgress({
          ...data.progress,
          isUnlocked: true,
          unlockedAt: new Date().toISOString()
        }));
      },
      'state:updated': (data) => {
        store.dispatch(updateCurrentState(data.state));
        // State history is now handled internally by the slice
        if (data.milestone) {
          store.dispatch(addMilestone(data.milestone));
        }
      },
      'chat:message': (data) => {
        store.dispatch(addMessage({
          conversationId: data.conversationId,
          message: data.message
        }));
      },
      'error': (data) => {
        console.error('WebSocket error:', data);
      },
      'connect': () => {
        console.log('WebSocket connected');
        store.dispatch(updateConnectionStatus('connected'));
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      },
      'disconnect': () => {
        console.log('WebSocket disconnected');
        store.dispatch(updateConnectionStatus('disconnected'));
        this.stopHeartbeat();
        this.scheduleReconnect();
      },
      'pong': () => {
        // 心跳响应
      }
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Already connecting'));
        return;
      }

      this.isConnecting = true;
      store.dispatch(updateConnectionStatus('connecting'));

      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          this.isConnecting = false;
          this.authenticate();
          this.eventHandlers['connect']?.(null);
          resolve();
        };

        this.socket.onclose = (event) => {
          this.isConnecting = false;
          console.log('WebSocket closed:', event.code, event.reason);
          this.eventHandlers['disconnect']?.(null);
        };

        this.socket.onerror = (error) => {
          this.isConnecting = false;
          console.error('WebSocket error:', error);
          this.eventHandlers['error']?.(error);
          reject(error);
        };

        this.socket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

      } catch (error) {
        this.isConnecting = false;
        store.dispatch(updateConnectionStatus('disconnected'));
        reject(error);
      }
    });
  }

  private authenticate(): void {
    const state = store.getState();
    const token = state.auth.token;
    
    if (token) {
      this.send('auth', { token });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handler = this.eventHandlers[message.type];
    if (handler) {
      handler(message.payload);
    } else {
      console.warn('No handler for message type:', message.type);
    }
  }

  send(type: string, payload: any = {}): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: new Date().toISOString()
      };
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Cannot send message:', { type, payload });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send('ping');
    }, 30000); // 30秒心跳
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch(error => {
          console.error('Reconnect failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    store.dispatch(updateConnectionStatus('disconnected'));
  }

  on(eventType: string, handler: (data: any) => void): void {
    this.eventHandlers[eventType] = handler;
  }

  off(eventType: string): void {
    delete this.eventHandlers[eventType];
  }

  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnected';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect().catch(error => {
      console.error('Manual reconnect failed:', error);
    });
  }

  setReconnectConfig(maxAttempts: number, delay: number): void {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectDelay = delay;
  }
}

export const wsManager = new WebSocketManager();
export default wsManager;