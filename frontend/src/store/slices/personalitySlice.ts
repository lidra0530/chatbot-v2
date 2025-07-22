import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { personalityApi } from '../../services/api';
import type { 
  PersonalityTraits, 
  PersonalityEvolution, 
  PersonalityAnalysis,
  InteractionPattern
} from '../../types/personality.types';

// Temporary evolution settings type until types are fully implemented
interface EvolutionSettings {
  enabled: boolean;
  sensitivity: number;
  minConfidence: number;
  cooldownPeriod: number;
}

// Enhanced Personality Slice State with evolution history and analytics support
export interface PersonalityState {
  // Current personality data
  traits: PersonalityTraits | null;
  evolutionHistory: PersonalityEvolution[];
  
  // Analytics and insights
  analysis: PersonalityAnalysis | null;
  interactionPatterns: InteractionPattern[];
  
  // Evolution settings and controls
  evolutionSettings: EvolutionSettings | null;
  
  // UI state
  isLoading: boolean;
  isLoadingHistory: boolean;
  isLoadingAnalysis: boolean;
  error: string | null;
  
  // Selected data for UI
  selectedPetId: string | null;
  selectedPeriod: {
    start: string;
    end: string;
  } | null;
  
  // Cache management
  lastUpdated: Record<string, string>; // petId -> timestamp
  cacheExpiry: number; // minutes
  
  // Real-time evolution tracking
  evolutionInProgress: boolean;
  pendingEvolutions: Array<{
    petId: string;
    trigger: string;
    confidence: number;
    timestamp: string;
  }>;
  
  // Filter and view options
  historyFilter: {
    timeRange?: { start: string; end: string };
    minConfidence?: number;
    traits?: string[];
  };
  visualizationMode: 'radar' | 'timeline' | 'heatmap' | 'trends';
}

const initialState: PersonalityState = {
  // Current personality data
  traits: null,
  evolutionHistory: [],
  
  // Analytics and insights
  analysis: null,
  interactionPatterns: [],
  
  // Evolution settings
  evolutionSettings: null,
  
  // UI state
  isLoading: false,
  isLoadingHistory: false,
  isLoadingAnalysis: false,
  error: null,
  
  // Selected data
  selectedPetId: null,
  selectedPeriod: null,
  
  // Cache management
  lastUpdated: {},
  cacheExpiry: 15, // 15 minutes for personality data
  
  // Real-time evolution tracking
  evolutionInProgress: false,
  pendingEvolutions: [],
  
  // Filter and view options
  historyFilter: {},
  visualizationMode: 'radar',
};

// Enhanced async thunks with complete personality system support

export const fetchPersonalityAsync = createAsyncThunk(
  'personality/fetchPersonality',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { personality: PersonalityState };
      const lastUpdated = state.personality.lastUpdated[petId];
      const cacheExpiry = state.personality.cacheExpiry * 60 * 1000;
      
      // Check cache validity
      if (lastUpdated && Date.now() - new Date(lastUpdated).getTime() < cacheExpiry) {
        return null; // Use cached data
      }

      const response = await personalityApi.getPersonality(petId);
      return { petId, traits: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch personality data');
    }
  }
);

export const fetchEvolutionHistoryAsync = createAsyncThunk(
  'personality/fetchEvolutionHistory',
  async ({ petId, limit }: { petId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await personalityApi.getEvolutionHistory(petId);
      let history = response.data;
      
      // Apply limit if specified
      if (limit && history.length > limit) {
        history = history.slice(0, limit);
      }
      
      return { petId, history };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch evolution history');
    }
  }
);

export const fetchPersonalityAnalysisAsync = createAsyncThunk(
  'personality/fetchAnalysis',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await personalityApi.getPersonalityAnalytics(petId);
      return { petId, analysis: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch personality analysis');
    }
  }
);

export const fetchInteractionPatternsAsync = createAsyncThunk(
  'personality/fetchInteractionPatterns',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await personalityApi.analyzeInteractionPatterns(petId);
      return { petId, patterns: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch interaction patterns');
    }
  }
);

export const triggerEvolutionAsync = createAsyncThunk(
  'personality/triggerEvolution',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await personalityApi.triggerEvolution(petId);
      return { petId, evolution: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to trigger personality evolution');
    }
  }
);

export const updateEvolutionSettingsAsync = createAsyncThunk(
  'personality/updateEvolutionSettings',
  async ({ petId, settings }: { petId: string; settings: Partial<EvolutionSettings> }, { rejectWithValue }) => {
    try {
      const response = await personalityApi.updateEvolutionSettings(petId, settings);
      return { petId, settings: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update evolution settings');
    }
  }
);

export const fetchEvolutionLogsAsync = createAsyncThunk(
  'personality/fetchEvolutionLogs',
  async ({ petId, limit }: { petId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await personalityApi.getEvolutionLogs(petId, limit);
      return { petId, logs: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch evolution logs');
    }
  }
);

export const personalitySlice = createSlice({
  name: 'personality',
  initialState,
  reducers: {
    // Basic actions
    clearError: (state) => {
      state.error = null;
    },
    
    setSelectedPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload;
      // Clear data when switching pets
      state.traits = null;
      state.evolutionHistory = [];
      state.analysis = null;
      state.interactionPatterns = [];
    },
    
    // Personality data updates
    updateTraits: (state, action: PayloadAction<PersonalityTraits>) => {
      state.traits = action.payload;
      if (state.selectedPetId) {
        state.lastUpdated[state.selectedPetId] = new Date().toISOString();
      }
    },
    
    addEvolutionToHistory: (state, action: PayloadAction<PersonalityEvolution>) => {
      state.evolutionHistory.unshift(action.payload);
      // Limit history length for performance
      if (state.evolutionHistory.length > 500) {
        state.evolutionHistory = state.evolutionHistory.slice(0, 500);
      }
    },
    
    // Real-time evolution tracking
    startEvolution: (state, action: PayloadAction<{ petId: string; trigger: string; confidence: number }>) => {
      state.evolutionInProgress = true;
      state.pendingEvolutions.push({
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
    },
    
    completeEvolution: (state, action: PayloadAction<PersonalityEvolution>) => {
      state.evolutionInProgress = false;
      state.pendingEvolutions = [];
      state.evolutionHistory.unshift(action.payload);
      
      // Update traits if this is the current pet
      if (state.selectedPetId === action.payload.petId) {
        state.traits = action.payload.newTraits;
      }
    },
    
    // Filter and view controls
    setHistoryFilter: (state, action: PayloadAction<Partial<PersonalityState['historyFilter']>>) => {
      state.historyFilter = { ...state.historyFilter, ...action.payload };
    },
    
    setVisualizationMode: (state, action: PayloadAction<PersonalityState['visualizationMode']>) => {
      state.visualizationMode = action.payload;
    },
    
    setSelectedPeriod: (state, action: PayloadAction<{ start: string; end: string } | null>) => {
      state.selectedPeriod = action.payload;
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
    clearPersonalityData: (state) => {
      state.traits = null;
      state.evolutionHistory = [];
      state.analysis = null;
      state.interactionPatterns = [];
      state.evolutionSettings = null;
      state.selectedPetId = null;
      state.selectedPeriod = null;
      state.historyFilter = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch personality traits
      .addCase(fetchPersonalityAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPersonalityAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.traits = action.payload.traits;
          state.selectedPetId = action.payload.petId;
          state.lastUpdated[action.payload.petId] = new Date().toISOString();
        }
      })
      .addCase(fetchPersonalityAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch evolution history
      .addCase(fetchEvolutionHistoryAsync.pending, (state) => {
        state.isLoadingHistory = true;
        state.error = null;
      })
      .addCase(fetchEvolutionHistoryAsync.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        state.evolutionHistory = action.payload.history;
        state.lastUpdated[action.payload.petId] = new Date().toISOString();
      })
      .addCase(fetchEvolutionHistoryAsync.rejected, (state, action) => {
        state.isLoadingHistory = false;
        state.error = action.payload as string;
      })
      
      // Fetch personality analysis
      .addCase(fetchPersonalityAnalysisAsync.pending, (state) => {
        state.isLoadingAnalysis = true;
        state.error = null;
      })
      .addCase(fetchPersonalityAnalysisAsync.fulfilled, (state, action) => {
        state.isLoadingAnalysis = false;
        state.analysis = action.payload.analysis;
      })
      .addCase(fetchPersonalityAnalysisAsync.rejected, (state, action) => {
        state.isLoadingAnalysis = false;
        state.error = action.payload as string;
      })
      
      // Fetch interaction patterns
      .addCase(fetchInteractionPatternsAsync.fulfilled, (state, action) => {
        state.interactionPatterns = action.payload.patterns;
      })
      
      // Trigger evolution
      .addCase(triggerEvolutionAsync.pending, (state) => {
        state.evolutionInProgress = true;
        state.error = null;
      })
      .addCase(triggerEvolutionAsync.fulfilled, (state, action) => {
        state.evolutionInProgress = false;
        const { evolution } = action.payload;
        
        // Update traits and add to history
        state.traits = evolution.newTraits;
        state.evolutionHistory.unshift(evolution);
        state.lastUpdated[action.payload.petId] = new Date().toISOString();
        
        // Clear pending evolutions
        state.pendingEvolutions = [];
      })
      .addCase(triggerEvolutionAsync.rejected, (state, action) => {
        state.evolutionInProgress = false;
        state.error = action.payload as string;
        state.pendingEvolutions = [];
      })
      
      // Update evolution settings
      .addCase(updateEvolutionSettingsAsync.fulfilled, (state, action) => {
        state.evolutionSettings = action.payload.settings;
      })
      
      // Fetch evolution logs
      .addCase(fetchEvolutionLogsAsync.fulfilled, (_state, _action) => {
        // Process evolution logs into history format
        // This would typically transform raw logs into PersonalityEvolution objects
        // Implementation depends on backend log format
        // TODO: Implement log processing when backend format is defined
      })
      
      // Handle all async rejections
      .addMatcher(
        (action) => action.type.endsWith('/pending') && action.type.startsWith('personality/'),
        (state) => {
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith('/rejected') && action.type.startsWith('personality/'),
        (state, action: any) => {
          state.isLoading = false;
          state.isLoadingHistory = false;
          state.isLoadingAnalysis = false;
          state.evolutionInProgress = false;
          state.error = action.payload as string || 'An error occurred';
        }
      );
  },
});

export const { 
  clearError,
  setSelectedPet,
  updateTraits,
  addEvolutionToHistory,
  startEvolution,
  completeEvolution,
  setHistoryFilter,
  setVisualizationMode,
  setSelectedPeriod,
  setCacheExpiry,
  clearCache,
  clearPersonalityData
} = personalitySlice.actions;

export default personalitySlice.reducer;