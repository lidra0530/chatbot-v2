import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import petSlice from './slices/petSlice';
import chatSlice from './slices/chatSlice';
import personalitySlice from './slices/personalitySlice';
import skillsSlice from './slices/skillsSlice';
import stateSlice from './slices/stateSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    pet: petSlice,
    chat: chatSlice,
    personality: personalitySlice,
    skills: skillsSlice,
    state: stateSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;