import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PersonalityEvolution {
  id: string;
  petId: string;
  previousTraits: PersonalityTraits;
  newTraits: PersonalityTraits;
  trigger: string;
  confidence: number;
  createdAt: string;
}

export interface PersonalityAnalytics {
  totalEvolutions: number;
  averageChange: number;
  mostActiveTraits: string[];
  evolutionTrend: 'stable' | 'increasing' | 'decreasing';
  lastEvolutionDate: string;
}

export interface PersonalityState {
  currentTraits: PersonalityTraits | null;
  evolutionHistory: PersonalityEvolution[];
  analytics: PersonalityAnalytics | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  selectedPetId: string | null;
}

const initialState: PersonalityState = {
  currentTraits: null,
  evolutionHistory: [],
  analytics: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  selectedPetId: null,
};

export const fetchPersonalityAsync = createAsyncThunk(
  'personality/fetchPersonality',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/personality/${petId}`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch personality data');
      }

      const data: PersonalityTraits = await response.json();
      return { petId, traits: data };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch personality data');
    }
  }
);

export const fetchEvolutionHistoryAsync = createAsyncThunk(
  'personality/fetchEvolutionHistory',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/personality/${petId}/evolution`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch evolution history');
      }

      const history: PersonalityEvolution[] = await response.json();
      return history;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch evolution history');
    }
  }
);

export const fetchPersonalityAnalyticsAsync = createAsyncThunk(
  'personality/fetchAnalytics',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/personality/${petId}/analytics`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch personality analytics');
      }

      const analytics: PersonalityAnalytics = await response.json();
      return analytics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch personality analytics');
    }
  }
);

export const triggerEvolutionAsync = createAsyncThunk(
  'personality/triggerEvolution',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/personality/${petId}/trigger-evolution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to trigger personality evolution');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to trigger personality evolution');
    }
  }
);

export const updateEvolutionSettingsAsync = createAsyncThunk(
  'personality/updateEvolutionSettings',
  async ({ petId, settings }: { petId: string; settings: Record<string, any> }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/personality/${petId}/evolution-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.auth.token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update evolution settings');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update evolution settings');
    }
  }
);

export const personalitySlice = createSlice({
  name: 'personality',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload;
    },
    updatePersonalityTraits: (state, action: PayloadAction<PersonalityTraits>) => {
      state.currentTraits = action.payload;
    },
    addEvolutionToHistory: (state, action: PayloadAction<PersonalityEvolution>) => {
      state.evolutionHistory.unshift(action.payload);
      // 限制历史记录长度
      if (state.evolutionHistory.length > 100) {
        state.evolutionHistory = state.evolutionHistory.slice(0, 100);
      }
    },
    clearPersonalityData: (state) => {
      state.currentTraits = null;
      state.evolutionHistory = [];
      state.analytics = null;
      state.selectedPetId = null;
    },
    updateAnalytics: (state, action: PayloadAction<PersonalityAnalytics>) => {
      state.analytics = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch personality
      .addCase(fetchPersonalityAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPersonalityAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTraits = action.payload.traits;
        state.selectedPetId = action.payload.petId;
      })
      .addCase(fetchPersonalityAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch evolution history
      .addCase(fetchEvolutionHistoryAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvolutionHistoryAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.evolutionHistory = action.payload;
      })
      .addCase(fetchEvolutionHistoryAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch analytics
      .addCase(fetchPersonalityAnalyticsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPersonalityAnalyticsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchPersonalityAnalyticsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Trigger evolution
      .addCase(triggerEvolutionAsync.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(triggerEvolutionAsync.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (action.payload.newTraits) {
          state.currentTraits = action.payload.newTraits;
        }
        if (action.payload.evolution) {
          state.evolutionHistory.unshift(action.payload.evolution);
        }
      })
      .addCase(triggerEvolutionAsync.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // Update evolution settings
      .addCase(updateEvolutionSettingsAsync.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateEvolutionSettingsAsync.fulfilled, (state) => {
        state.isUpdating = false;
      })
      .addCase(updateEvolutionSettingsAsync.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setSelectedPet, 
  updatePersonalityTraits, 
  addEvolutionToHistory, 
  clearPersonalityData,
  updateAnalytics 
} = personalitySlice.actions;

export default personalitySlice.reducer;