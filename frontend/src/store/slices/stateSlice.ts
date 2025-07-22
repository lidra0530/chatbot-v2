import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface PetState {
  health: number;
  happiness: number;
  energy: number;
  hunger: number;
  social: number;
}

export interface StateHistory {
  id: string;
  petId: string;
  state: PetState;
  timestamp: string;
  trigger: string;
  changes: Record<string, number>;
}

export interface StateMilestone {
  id: string;
  petId: string;
  milestoneType: 'high_happiness' | 'low_energy' | 'balanced' | 'critical_state';
  threshold: number;
  achievedAt: string;
  state: PetState;
  description: string;
}

export interface StateAnalytics {
  averageStates: PetState;
  trends: Record<keyof PetState, 'improving' | 'declining' | 'stable'>;
  criticalEvents: number;
  balanceScore: number;
  lastAnalysisDate: string;
}

export interface StateSliceState {
  currentState: PetState | null;
  stateHistory: StateHistory[];
  milestones: StateMilestone[];
  analytics: StateAnalytics | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  selectedPetId: string | null;
  realTimeUpdates: boolean;
}

const initialState: StateSliceState = {
  currentState: null,
  stateHistory: [],
  milestones: [],
  analytics: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  selectedPetId: null,
  realTimeUpdates: true,
};

export const fetchCurrentStateAsync = createAsyncThunk(
  'state/fetchCurrentState',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/state/${petId}`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pet state');
      }

      const data: PetState = await response.json();
      return { petId, state: data };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch pet state');
    }
  }
);

export const updatePetStateAsync = createAsyncThunk(
  'state/updatePetState',
  async ({ petId, stateUpdate }: { petId: string; stateUpdate: Partial<PetState> }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/state/${petId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.auth.token}`,
        },
        body: JSON.stringify(stateUpdate),
      });

      if (!response.ok) {
        throw new Error('Failed to update pet state');
      }

      const updatedState: PetState = await response.json();
      return { petId, state: updatedState };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update pet state');
    }
  }
);

export const processStateInteractionAsync = createAsyncThunk(
  'state/processStateInteraction',
  async ({ petId, interactionType, intensity }: { petId: string; interactionType: string; intensity: number }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/state/${petId}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.auth.token}`,
        },
        body: JSON.stringify({ interactionType, intensity }),
      });

      if (!response.ok) {
        throw new Error('Failed to process state interaction');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to process state interaction');
    }
  }
);

export const fetchStateHistoryAsync = createAsyncThunk(
  'state/fetchStateHistory',
  async ({ petId, limit = 50 }: { petId: string; limit?: number }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/state/${petId}/history?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch state history');
      }

      const history: StateHistory[] = await response.json();
      return history;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch state history');
    }
  }
);

export const fetchStateMilestonesAsync = createAsyncThunk(
  'state/fetchStateMilestones',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/state/${petId}/milestones`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch state milestones');
      }

      const milestones: StateMilestone[] = await response.json();
      return milestones;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch state milestones');
    }
  }
);

export const fetchStateAnalyticsAsync = createAsyncThunk(
  'state/fetchStateAnalytics',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/state/${petId}/analytics`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch state analytics');
      }

      const analytics: StateAnalytics = await response.json();
      return analytics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch state analytics');
    }
  }
);

export const stateSlice = createSlice({
  name: 'state',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload;
    },
    updateCurrentState: (state, action: PayloadAction<PetState>) => {
      state.currentState = action.payload;
    },
    addStateToHistory: (state, action: PayloadAction<StateHistory>) => {
      state.stateHistory.unshift(action.payload);
      // 限制历史记录长度
      if (state.stateHistory.length > 100) {
        state.stateHistory = state.stateHistory.slice(0, 100);
      }
    },
    addMilestone: (state, action: PayloadAction<StateMilestone>) => {
      state.milestones.unshift(action.payload);
      // 限制里程碑记录长度
      if (state.milestones.length > 50) {
        state.milestones = state.milestones.slice(0, 50);
      }
    },
    toggleRealTimeUpdates: (state) => {
      state.realTimeUpdates = !state.realTimeUpdates;
    },
    clearStateData: (state) => {
      state.currentState = null;
      state.stateHistory = [];
      state.milestones = [];
      state.analytics = null;
      state.selectedPetId = null;
    },
    updateStateValue: (state, action: PayloadAction<{ key: keyof PetState; value: number }>) => {
      const { key, value } = action.payload;
      if (state.currentState) {
        state.currentState[key] = Math.max(0, Math.min(100, value));
      }
    },
    applyStateDecay: (state, action: PayloadAction<Record<keyof PetState, number>>) => {
      const decay = action.payload;
      if (state.currentState) {
        Object.entries(decay).forEach(([key, decayValue]) => {
          const stateKey = key as keyof PetState;
          state.currentState![stateKey] = Math.max(0, state.currentState![stateKey] - decayValue);
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch current state
      .addCase(fetchCurrentStateAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentStateAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentState = action.payload.state;
        state.selectedPetId = action.payload.petId;
      })
      .addCase(fetchCurrentStateAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update pet state
      .addCase(updatePetStateAsync.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updatePetStateAsync.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.currentState = action.payload.state;
      })
      .addCase(updatePetStateAsync.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // Process state interaction
      .addCase(processStateInteractionAsync.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(processStateInteractionAsync.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (action.payload.newState) {
          state.currentState = action.payload.newState;
        }
        if (action.payload.stateHistory) {
          state.stateHistory.unshift(action.payload.stateHistory);
        }
        if (action.payload.milestone) {
          state.milestones.unshift(action.payload.milestone);
        }
      })
      .addCase(processStateInteractionAsync.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // Fetch state history
      .addCase(fetchStateHistoryAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStateHistoryAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stateHistory = action.payload;
      })
      .addCase(fetchStateHistoryAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch state milestones
      .addCase(fetchStateMilestonesAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStateMilestonesAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.milestones = action.payload;
      })
      .addCase(fetchStateMilestonesAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch state analytics
      .addCase(fetchStateAnalyticsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStateAnalyticsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchStateAnalyticsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setSelectedPet, 
  updateCurrentState, 
  addStateToHistory, 
  addMilestone, 
  toggleRealTimeUpdates, 
  clearStateData,
  updateStateValue,
  applyStateDecay
} = stateSlice.actions;

export default stateSlice.reducer;