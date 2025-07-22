import { configureStore, type Middleware } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import petSlice from './slices/petSlice';
import chatSlice from './slices/chatSlice';
import personalitySlice from './slices/personalitySlice';
import skillsSlice from './slices/skillsSlice';
import stateSlice from './slices/stateSlice';
import { createPersistenceMiddleware, loadInitialState } from './middleware/persistenceMiddleware';
import { createSyncMiddleware, createDependencyMiddleware } from './middleware/syncMiddleware';

// 首先定义 reducer
const reducer = {
  auth: authSlice,
  pet: petSlice,
  chat: chatSlice,
  personality: personalitySlice,
  skills: skillsSlice,
  state: stateSlice,
};

// 定义 RootState 类型
export type RootState = {
  auth: ReturnType<typeof authSlice>;
  pet: ReturnType<typeof petSlice>;
  chat: ReturnType<typeof chatSlice>;
  personality: ReturnType<typeof personalitySlice>;
  skills: ReturnType<typeof skillsSlice>;
  state: ReturnType<typeof stateSlice>;
};

// 加载持久化状态
const preloadedState = loadInitialState() as Partial<RootState>;

// 创建自定义中间件数组
const customMiddlewares: Middleware[] = [
  createPersistenceMiddleware({
    key: 'ai-pet-system',
    version: 1,
    whitelist: ['auth', 'pet', 'personality', 'skills', 'state'],
  }),
  createSyncMiddleware({
    enabled: true,
    debounceMs: 500,
    maxQueueSize: 100,
  }),
  createDependencyMiddleware(),
];

export const store = configureStore({
  reducer,
  preloadedState,
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          // 忽略包含不可序列化数据的 actions
          'pet/addPendingUpdate',
          'sync/addEvent',
        ],
        ignoredPaths: [
          // 忽略包含函数或其他不可序列化数据的路径
          'pet.completePetData.personalityAnalysis',
          'skills.tree.layout',
        ],
      },
      // 在开发环境中启用不可变性检查
      immutableCheck: process.env['NODE_ENV'] === 'development',
    } as any)
    .concat(customMiddlewares as any),
} as any);

export type AppDispatch = typeof store.dispatch;