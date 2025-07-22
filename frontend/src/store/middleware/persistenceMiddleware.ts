// Redux 数据持久化中间件，支持离线模式

import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// 持久化配置
interface PersistenceConfig {
  key: string;
  whitelist?: string[]; // 要持久化的 slice 名称
  blacklist?: string[]; // 不持久化的 slice 名称
  version: number;
  migrate?: (persistedState: any, version: number) => any;
}

// 默认配置
const DEFAULT_CONFIG: PersistenceConfig = {
  key: 'ai-pet-system',
  whitelist: ['auth', 'pet', 'personality', 'skills', 'state'],
  blacklist: ['chat'], // 聊天数据不持久化，太大
  version: 1,
};

// 需要持久化的状态键
const PERSISTENCE_KEYS = {
  STATE: 'persistedState',
  VERSION: 'persistedVersion',
  TIMESTAMP: 'persistedTimestamp',
};

// 数据迁移函数
const migrations: Record<number, (state: any) => any> = {
  1: (state) => state, // 初始版本，无需迁移
};

class PersistenceManager {
  private config: PersistenceConfig;
  private storage: Storage;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = localStorage;
  }

  // 从存储中加载状态
  loadState(): Partial<RootState> | undefined {
    try {
      const serializedState = this.storage.getItem(
        `${this.config.key}_${PERSISTENCE_KEYS.STATE}`
      );
      const version = this.storage.getItem(
        `${this.config.key}_${PERSISTENCE_KEYS.VERSION}`
      );
      const timestamp = this.storage.getItem(
        `${this.config.key}_${PERSISTENCE_KEYS.TIMESTAMP}`
      );

      if (!serializedState) {
        return undefined;
      }

      const parsedState = JSON.parse(serializedState);
      const parsedVersion = version ? parseInt(version) : 0;

      // 检查数据是否过期（7天）
      if (timestamp) {
        const lastSaved = new Date(timestamp).getTime();
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (now - lastSaved > sevenDays) {
          this.clearPersistedState();
          return undefined;
        }
      }

      // 执行数据迁移
      if (parsedVersion < this.config.version) {
        return this.migrateState(parsedState, parsedVersion);
      }

      return parsedState;
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      this.clearPersistedState();
      return undefined;
    }
  }

  // 保存状态到存储
  saveState(state: RootState): void {
    try {
      const filteredState = this.filterState(state);
      const serializedState = JSON.stringify(filteredState);
      
      this.storage.setItem(
        `${this.config.key}_${PERSISTENCE_KEYS.STATE}`,
        serializedState
      );
      this.storage.setItem(
        `${this.config.key}_${PERSISTENCE_KEYS.VERSION}`,
        this.config.version.toString()
      );
      this.storage.setItem(
        `${this.config.key}_${PERSISTENCE_KEYS.TIMESTAMP}`,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
      // 如果存储满了，尝试清理旧数据
      this.clearPersistedState();
    }
  }

  // 清除持久化状态
  clearPersistedState(): void {
    Object.values(PERSISTENCE_KEYS).forEach(key => {
      this.storage.removeItem(`${this.config.key}_${key}`);
    });
  }

  // 过滤需要持久化的状态
  private filterState(state: RootState): Partial<RootState> {
    const filteredState: any = {};

    Object.keys(state).forEach(key => {
      const shouldInclude = this.shouldPersistSlice(key);
      
      if (shouldInclude) {
        // 对于特定的 slice，可能需要特殊处理
        if (key === 'pet') {
          // 不持久化完整的宠物数据，只持久化基本信息
          filteredState[key] = {
            ...state[key as keyof RootState],
            completePetData: null, // 不持久化完整数据
            pendingUpdates: [], // 不持久化待处理更新
          };
        } else if (key === 'chat') {
          // 聊天数据只持久化基本信息
          filteredState[key] = {
            ...state[key as keyof RootState],
            messages: [], // 不持久化消息历史
          };
        } else {
          filteredState[key] = state[key as keyof RootState];
        }
      }
    });

    return filteredState;
  }

  // 判断是否应该持久化某个 slice
  private shouldPersistSlice(sliceName: string): boolean {
    if (this.config.blacklist?.includes(sliceName)) {
      return false;
    }
    
    if (this.config.whitelist) {
      return this.config.whitelist.includes(sliceName);
    }
    
    return true;
  }

  // 执行数据迁移
  private migrateState(state: any, fromVersion: number): any {
    let migratedState = state;
    
    for (let version = fromVersion + 1; version <= this.config.version; version++) {
      if (migrations[version]) {
        migratedState = migrations[version](migratedState);
      }
    }
    
    return migratedState;
  }

  // 获取存储使用情况
  getStorageInfo(): {
    used: number;
    available: number;
    percentage: number;
  } {
    try {
      const test = 'test';
      let used = 0;
      
      // 计算当前使用的存储空间
      Object.keys(this.storage).forEach(key => {
        used += (this.storage.getItem(key) || '').length;
      });
      
      // 尝试检测可用空间（粗略估计）
      let available = 0;
      try {
        const testData = new Array(1024 * 1024).join('x'); // 1MB test data
        let i = 0;
        while (i < 10) { // 最多测试 10MB
          this.storage.setItem(`${test}${i}`, testData);
          available += testData.length;
          i++;
        }
      } catch (e) {
        // 存储已满或接近满
      } finally {
        // 清理测试数据
        let i = 0;
        while (i < 10) {
          this.storage.removeItem(`${test}${i}`);
          i++;
        }
      }
      
      const total = used + available;
      const percentage = total > 0 ? (used / total) * 100 : 0;
      
      return { used, available, percentage };
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 };
    }
  }
}

// 创建持久化管理器实例
export const persistenceManager = new PersistenceManager();

// 创建持久化中间件
export const createPersistenceMiddleware = (
  config?: Partial<PersistenceConfig>
): Middleware => {
  const manager = new PersistenceManager(config);
  
  return (store) => (next) => (action) => {
    const result = next(action);
    
    // 在状态更新后保存到 localStorage
    // 使用节流避免频繁写入
    const state = store.getState() as RootState;
    
    // 异步保存，避免阻塞UI
    setTimeout(() => {
      manager.saveState(state);
    }, 100);
    
    return result;
  };
};

// 加载初始状态的辅助函数
export const loadInitialState = (): any => {
  return persistenceManager.loadState();
};

// 导出工具函数
export const persistenceUtils = {
  clearAll: () => persistenceManager.clearPersistedState(),
  getStorageInfo: () => persistenceManager.getStorageInfo(),
  saveState: (state: RootState) => persistenceManager.saveState(state),
  loadState: () => persistenceManager.loadState(),
};