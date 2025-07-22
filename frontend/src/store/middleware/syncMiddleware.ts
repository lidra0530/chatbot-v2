// Redux slice 间数据同步中间件

import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { 
  updatePetPersonality, 
  updatePetSkills, 
  updatePetState as updatePetStateAction, 
  updateLastInteraction,
  syncPetData
} from '../slices/petSlice';

// 同步事件类型
interface SyncEvent {
  type: string;
  petId: string;
  data: any;
  timestamp: string;
}

// 同步配置
interface SyncConfig {
  enabled: boolean;
  debounceMs: number;
  maxQueueSize: number;
}

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: true,
  debounceMs: 500,
  maxQueueSize: 100,
};

class SyncManager {
  private config: SyncConfig;
  private syncQueue: SyncEvent[] = [];

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  // 添加同步事件到队列
  addSyncEvent(event: SyncEvent): void {
    if (!this.config.enabled) return;

    // 限制队列大小
    if (this.syncQueue.length >= this.config.maxQueueSize) {
      this.syncQueue.shift(); // 移除最旧的事件
    }

    this.syncQueue.push(event);
  }

  // 处理同步事件
  processSyncEvents(dispatch: any): void {
    const events = [...this.syncQueue];
    this.syncQueue = [];

    events.forEach(event => {
      this.processSingleEvent(event, dispatch);
    });
  }

  // 处理单个同步事件
  private processSingleEvent(event: SyncEvent, dispatch: any): void {
    const { type, petId, data } = event;

    switch (type) {
      case 'personality/updated':
        dispatch(updatePetPersonality({ petId, personality: data }));
        break;

      case 'skills/updated':
        dispatch(updatePetSkills({ petId, skills: data }));
        break;

      case 'state/updated':
        dispatch(updatePetStateAction({ petId, state: data }));
        break;

      case 'interaction/completed':
        dispatch(updateLastInteraction(petId));
        break;

      case 'pet/sync':
        dispatch(syncPetData({ petId, data }));
        break;

      default:
        console.warn('Unknown sync event type:', type);
    }
  }

  // 清空队列
  clearQueue(): void {
    this.syncQueue = [];
  }

  // 获取队列状态
  getQueueStatus(): { size: number; events: SyncEvent[] } {
    return {
      size: this.syncQueue.length,
      events: [...this.syncQueue],
    };
  }
}

// 创建同步管理器实例
const syncManager = new SyncManager();

// 创建同步中间件
export const createSyncMiddleware = (
  config?: Partial<SyncConfig>
): Middleware => {
  const manager = new SyncManager(config);
  
  return (store) => (next) => (action: any) => {
    const prevState = store.getState() as RootState;
    const result = next(action);
    const nextState = store.getState() as RootState;

    // 检测状态变化并创建同步事件
    detectAndSyncChanges(prevState, nextState, action, manager, store.dispatch);

    return result;
  };
};

// 检测状态变化并创建同步事件 - 暂时简化以避免未实现slice的类型冲突
function detectAndSyncChanges(
  _prevState: RootState,
  nextState: RootState,
  action: any,
  manager: SyncManager,
  dispatch: any
): void {
  // 如果是直接的同步操作，跳过处理
  if (action.type.startsWith('pet/update') || action.type.startsWith('pet/sync')) {
    return;
  }

  const currentPetId = nextState.pet.selectedPetId;
  if (!currentPetId) return;

  // 暂时只处理pet相关的变化，避免未实现slice的类型冲突
  // TODO: 在其他slice实现后重新启用完整的同步逻辑

  // 检测聊天完成事件
  if (action.type === 'chat/sendMessage/fulfilled') {
    manager.addSyncEvent({
      type: 'interaction/completed',
      petId: currentPetId,
      data: {},
      timestamp: new Date().toISOString(),
    });
    
    // 处理同步事件（带防抖）
    debouncedProcessSync(manager, dispatch, currentPetId);
  }
}

// 防抖处理同步事件
const debouncedProcessSync = (() => {
  const timers: Record<string, NodeJS.Timeout> = {};
  
  return (manager: SyncManager, dispatch: any, petId: string) => {
    if (timers[petId]) {
      clearTimeout(timers[petId]);
    }
    
    timers[petId] = setTimeout(() => {
      manager.processSyncEvents(dispatch);
      delete timers[petId];
    }, 500);
  };
})();

// 跨 slice 数据依赖处理
export const createDependencyMiddleware = (): Middleware => {
  return (store) => (next) => (action: any) => {
    const result = next(action);
    const state = store.getState() as RootState;

    // 处理数据依赖
    handleDataDependencies(action, state, store.dispatch);

    return result;
  };
};

// 处理数据依赖关系 - 暂时简化
function handleDataDependencies(
  action: any,
  _state: RootState,
  _dispatch: any
): void {
  // 暂时只处理pet相关的依赖关系，避免未实现slice的类型冲突
  // TODO: 在其他slice实现后重新启用完整的依赖处理

  // 当创建新宠物时，初始化相关数据
  if (action.type === 'pet/createPet/fulfilled') {
    const { payload } = action as any;
    if (payload) {
      // 初始化宠物数据的缓存时间戳
      // 这些可能需要从其他 slice 获取默认值
    }
  }
}

// 导出同步管理器实例
export { syncManager };

// 导出工具函数
export const syncUtils = {
  clearQueue: () => syncManager.clearQueue(),
  getQueueStatus: () => syncManager.getQueueStatus(),
  addEvent: (event: SyncEvent) => syncManager.addSyncEvent(event),
  processEvents: (dispatch: any) => syncManager.processSyncEvents(dispatch),
};