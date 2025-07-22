import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { stateApi } from '../../services/api';
import type { 
  PetState, 
  StateChange, 
  StateMilestone,
  StateAnalysis
} from '../../types/state.types';

// Temporary state settings type until types are fully implemented  
interface StateSettings {
  decayEnabled: boolean;
  decayRate: number;
  autoSave: boolean;
  predictionsEnabled: boolean;
}

// Enhanced State Slice State with comprehensive analytics support
export interface StateSliceState {
  // Current state data
  current: PetState | null;
  stateHistory: StateChange[];
  milestones: StateMilestone[];
  
  // Analytics and insights
  analytics: StateAnalysis | null;
  trends: Record<string, Array<{ timestamp: string; value: number }>>;
  
  // State management settings
  settings: StateSettings | null;
  decayRates: Record<string, number>; // state attribute -> decay rate per hour
  
  // UI state
  isLoading: boolean;
  isLoadingHistory: boolean;
  isLoadingAnalytics: boolean;
  isUpdating: boolean;
  error: string | null;
  
  // Selected data for UI
  selectedPetId: string | null;
  selectedTimeRange: {
    start: string;
    end: string;
  } | null;
  
  // Visualization settings
  chartType: 'line' | 'area' | 'bar' | 'radar';
  timeScale: 'hour' | 'day' | 'week' | 'month';
  showPredictions: boolean;
  
  // Filter and view options
  stateFilter: {
    attributes?: string[];
    minValue?: number;
    maxValue?: number;
    milestoneTypes?: string[];
  };
  
  // Real-time updates
  realTimeUpdates: boolean;
  updateInterval: number; // seconds
  lastSync: string | null;
  
  // Interaction tracking
  recentInteractions: Array<{
    type: string;
    intensity: number;
    timestamp: string;
    stateImpact: Partial<PetState>;
  }>;
  
  // Predictive analytics
  predictions: {
    nextHour?: Partial<PetState>;
    nextDay?: Partial<PetState>;
    criticalEvents?: Array<{
      attribute: string;
      predictedTime: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  
  // Cache management
  lastUpdated: Record<string, string>; // petId -> timestamp
  cacheExpiry: number; // minutes
  
  // State decay tracking
  lastDecayUpdate: string | null;
  decayPaused: boolean;
}

const initialState: StateSliceState = {
  // Current state data
  current: null,
  stateHistory: [],
  milestones: [],
  
  // Analytics and insights
  analytics: null,
  trends: {},
  
  // State management settings
  settings: null,
  decayRates: {
    happiness: 0.5,
    energy: 0.8,
    hunger: 1.2,
    health: 0.2,
    social: 0.3,
  },
  
  // UI state
  isLoading: false,
  isLoadingHistory: false,
  isLoadingAnalytics: false,
  isUpdating: false,
  error: null,
  
  // Selected data
  selectedPetId: null,
  selectedTimeRange: null,
  
  // Visualization settings
  chartType: 'line',
  timeScale: 'day',
  showPredictions: false,
  
  // Filter and view options
  stateFilter: {},
  
  // Real-time updates
  realTimeUpdates: true,
  updateInterval: 30, // 30 seconds
  lastSync: null,
  
  // Interaction tracking
  recentInteractions: [],
  
  // Predictive analytics
  predictions: {},
  
  // Cache management
  lastUpdated: {},
  cacheExpiry: 5, // 5 minutes for state data
  
  // State decay tracking
  lastDecayUpdate: null,
  decayPaused: false,
};

// Enhanced async thunks with complete state system support

export const fetchCurrentStateAsync = createAsyncThunk(
  'state/fetchCurrentState',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { state: StateSliceState };
      const lastUpdated = state.state.lastUpdated[petId];
      const cacheExpiry = state.state.cacheExpiry * 60 * 1000;
      
      // Check cache validity
      if (lastUpdated && Date.now() - new Date(lastUpdated).getTime() < cacheExpiry) {
        return null; // Use cached data
      }

      const response = await stateApi.getCurrentState(petId);
      return { petId, state: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch current state');
    }
  }
);

export const updateStateAsync = createAsyncThunk(
  'state/updateState',
  async ({ petId, stateUpdate }: { petId: string; stateUpdate: Partial<PetState> }, { rejectWithValue }) => {
    try {
      const response = await stateApi.updateState(petId, stateUpdate);
      return { petId, state: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update state');
    }
  }
);

export const processInteractionAsync = createAsyncThunk(
  'state/processInteraction',
  async ({ petId, interactionType, intensity }: { petId: string; interactionType: string; intensity: number }, { rejectWithValue }) => {
    try {
      const response = await stateApi.processInteraction(petId, interactionType, intensity);
      return { petId, interaction: { type: interactionType, intensity }, result: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to process interaction');
    }
  }
);

export const fetchStateHistoryAsync = createAsyncThunk(
  'state/fetchStateHistory',
  async ({ petId, limit }: { petId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await stateApi.getStateHistory(petId, limit);
      return { petId, history: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch state history');
    }
  }
);

export const fetchStateMilestonesAsync = createAsyncThunk(
  'state/fetchStateMilestones',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await stateApi.getStateMilestones(petId);
      return { petId, milestones: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch state milestones');
    }
  }
);

export const fetchStateAnalyticsAsync = createAsyncThunk(
  'state/fetchStateAnalytics',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await stateApi.getStateAnalytics(petId);
      return { petId, analytics: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch state analytics');
    }
  }
);

export const triggerStateDecayAsync = createAsyncThunk(
  'state/triggerStateDecay',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await stateApi.triggerStateDecay(petId);
      return { petId, decay: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to trigger state decay');
    }
  }
);

export const updateStateSettingsAsync = createAsyncThunk(
  'state/updateStateSettings',
  async ({ petId, settings }: { petId: string; settings: Partial<StateSettings> }, { rejectWithValue }) => {
    try {
      const response = await stateApi.updateStateSettings(petId, settings);
      return { petId, settings: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update state settings');
    }
  }
);

export const stateSlice = createSlice({
  name: 'state',
  initialState,
  reducers: {
    // Basic actions
    clearError: (state) => {
      state.error = null;
    },
    
    setSelectedPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload;
      // Clear data when switching pets
      state.current = null;
      state.stateHistory = [];
      state.milestones = [];
      state.analytics = null;
      state.recentInteractions = [];
      state.predictions = {};
    },
    
    // State updates
    updateCurrentState: (state, action: PayloadAction<PetState>) => {
      state.current = action.payload;
      state.lastSync = new Date().toISOString();
      
      if (state.selectedPetId) {
        state.lastUpdated[state.selectedPetId] = new Date().toISOString();
      }
    },
    
    // Time range selection
    setSelectedTimeRange: (state, action: PayloadAction<{ start: string; end: string } | null>) => {
      state.selectedTimeRange = action.payload;
    },
    
    // Visualization controls
    setChartType: (state, action: PayloadAction<StateSliceState['chartType']>) => {
      state.chartType = action.payload;
    },
    
    setTimeScale: (state, action: PayloadAction<StateSliceState['timeScale']>) => {
      state.timeScale = action.payload;
    },
    
    toggleShowPredictions: (state) => {
      state.showPredictions = !state.showPredictions;
    },
    
    // Filter management
    setStateFilter: (state, action: PayloadAction<Partial<StateSliceState['stateFilter']>>) => {
      state.stateFilter = { ...state.stateFilter, ...action.payload };
    },
    
    clearStateFilter: (state) => {
      state.stateFilter = {};
    },
    
    // Real-time update controls
    toggleRealTimeUpdates: (state) => {
      state.realTimeUpdates = !state.realTimeUpdates;
    },
    
    setUpdateInterval: (state, action: PayloadAction<number>) => {
      state.updateInterval = Math.max(5, Math.min(300, action.payload)); // 5 seconds to 5 minutes
    },
    
    // Interaction tracking
    addInteraction: (state, action: PayloadAction<{
      type: string;
      intensity: number;
      stateImpact: Partial<PetState>;
    }>) => {
      state.recentInteractions.unshift({
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
      
      // Keep only last 50 interactions for performance
      if (state.recentInteractions.length > 50) {
        state.recentInteractions = state.recentInteractions.slice(0, 50);
      }
    },
    
    // Milestone management
    addMilestone: (state, action: PayloadAction<StateMilestone>) => {
      state.milestones.unshift(action.payload);
      
      // Limit milestone history for performance
      if (state.milestones.length > 200) {
        state.milestones = state.milestones.slice(0, 200);
      }
    },
    
    // Decay management
    updateDecayRates: (state, action: PayloadAction<Record<string, number>>) => {
      state.decayRates = { ...state.decayRates, ...action.payload };
    },
    
    pauseDecay: (state) => {
      state.decayPaused = true;
    },
    
    resumeDecay: (state) => {
      state.decayPaused = false;
      state.lastDecayUpdate = new Date().toISOString();
    },
    
    // Trend tracking
    updateTrends: (state, action: PayloadAction<Record<string, Array<{ timestamp: string; value: number }>>>) => {
      state.trends = action.payload;
    },
    
    addTrendPoint: (state, action: PayloadAction<{ attribute: string; value: number }>) => {
      const { attribute, value } = action.payload;
      const timestamp = new Date().toISOString();
      
      if (!state.trends[attribute]) {
        state.trends[attribute] = [];
      }
      
      state.trends[attribute].push({ timestamp, value });
      
      // Keep only last 1000 points per attribute for performance
      if (state.trends[attribute].length > 1000) {
        state.trends[attribute] = state.trends[attribute].slice(-1000);
      }
    },
    
    // Predictions management
    updatePredictions: (state, action: PayloadAction<StateSliceState['predictions']>) => {
      state.predictions = action.payload;
    },
    
    // Cache management
    setCacheExpiry: (state, action: PayloadAction<number>) => {
      state.cacheExpiry = action.payload;
    },
    
    clearCache: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload) {
        delete state.lastUpdated[action.payload];
      } else {
        state.lastUpdated = {};
      }
    },
    
    // Data cleanup
    clearStateData: (state) => {
      state.current = null;
      state.stateHistory = [];
      state.milestones = [];
      state.analytics = null;
      state.trends = {};
      state.recentInteractions = [];
      state.predictions = {};
      state.selectedPetId = null;
      state.selectedTimeRange = null;
      state.lastSync = null;
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
        if (action.payload) {
          state.current = action.payload.state;
          state.lastUpdated[action.payload.petId] = new Date().toISOString();
          state.lastSync = new Date().toISOString();
        }
      })
      .addCase(fetchCurrentStateAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update state
      .addCase(updateStateAsync.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateStateAsync.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.current = action.payload.state;
        state.lastUpdated[action.payload.petId] = new Date().toISOString();
        state.lastSync = new Date().toISOString();
      })
      .addCase(updateStateAsync.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Process interaction
      .addCase(processInteractionAsync.fulfilled, (state, action) => {
        const { interaction, result } = action.payload;
        
        // Update current state
        state.current = result.newState;
        
        // Add interaction to history
        state.recentInteractions.unshift({
          type: interaction.type,
          intensity: interaction.intensity,
          timestamp: new Date().toISOString(),
          stateImpact: result.stateChanges || {},
        });
        
        // Add state change to history if significant
        if (result.stateChange) {
          state.stateHistory.unshift(result.stateChange);
        }
        
        state.lastSync = new Date().toISOString();
      })
      
      // Fetch state history
      .addCase(fetchStateHistoryAsync.pending, (state) => {
        state.isLoadingHistory = true;
        state.error = null;
      })
      .addCase(fetchStateHistoryAsync.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        state.stateHistory = action.payload.history;
      })
      .addCase(fetchStateHistoryAsync.rejected, (state, action) => {
        state.isLoadingHistory = false;
        state.error = action.payload as string;
      })
      
      // Fetch state milestones
      .addCase(fetchStateMilestonesAsync.fulfilled, (state, action) => {
        state.milestones = action.payload.milestones;
      })
      
      // Fetch state analytics
      .addCase(fetchStateAnalyticsAsync.pending, (state) => {
        state.isLoadingAnalytics = true;
        state.error = null;
      })
      .addCase(fetchStateAnalyticsAsync.fulfilled, (state, action) => {
        state.isLoadingAnalytics = false;
        state.analytics = action.payload.analytics;
      })
      .addCase(fetchStateAnalyticsAsync.rejected, (state, action) => {
        state.isLoadingAnalytics = false;
        state.error = action.payload as string;
      })
      
      // Trigger state decay
      .addCase(triggerStateDecayAsync.fulfilled, (state, action) => {
        const { decay } = action.payload;
        
        // Update current state with decay results
        if (decay.newState) {
          state.current = decay.newState;
        }
        
        // Update last decay timestamp
        state.lastDecayUpdate = new Date().toISOString();
        state.lastSync = new Date().toISOString();
      })
      
      // Update state settings
      .addCase(updateStateSettingsAsync.fulfilled, (state, action) => {
        state.settings = action.payload.settings;
      })
      
      // Handle all async rejections
      .addMatcher(
        (action) => action.type.endsWith('/pending') && action.type.startsWith('state/'),
        (state) => {
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith('/rejected') && action.type.startsWith('state/'),
        (state, action: any) => {
          state.isLoading = false;
          state.isLoadingHistory = false;
          state.isLoadingAnalytics = false;
          state.isUpdating = false;
          state.error = action.payload as string || 'An error occurred';
        }
      );
  },
});

export const {
  clearError,
  setSelectedPet,
  updateCurrentState,
  setSelectedTimeRange,
  setChartType,
  setTimeScale,
  toggleShowPredictions,
  setStateFilter,
  clearStateFilter,
  toggleRealTimeUpdates,
  setUpdateInterval,
  addInteraction,
  addMilestone,
  updateDecayRates,
  pauseDecay,
  resumeDecay,
  updateTrends,
  addTrendPoint,
  updatePredictions,
  setCacheExpiry,
  clearCache,
  clearStateData
} = stateSlice.actions;

export default stateSlice.reducer;