import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { petApi, stateApi } from '../../services/api';
import type { 
  Pet, 
  CompletePetData, 
  PetListItem, 
  UpdatePetRequest,
  PetStatistics,
  PetFilter,
  PetComparison
} from '../../types/pet.types';
import type { PersonalityTraits } from '../../types/personality.types';
import type { SkillProgress } from '../../types/skills.types';
import type { PetState } from '../../types/state.types';

// Enhanced Pet Slice State with full AI data model support
export interface PetSliceState {
  // Basic pet data
  currentPet: Pet | null;
  pets: Pet[];
  petsList: PetListItem[];           // Optimized list view
  
  // Complete data for current pet
  completePetData: CompletePetData | null;
  
  // UI state
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  selectedPetId: string | null;
  
  // Filtering and search
  filter: PetFilter;
  searchQuery: string;
  
  // Statistics and analytics
  statistics: PetStatistics | null;
  comparison: PetComparison | null;
  
  // Cache management
  lastUpdated: Record<string, string>; // petId -> timestamp
  cacheExpiry: number; // minutes
  
  // Real-time updates
  realTimeUpdates: boolean;
  pendingUpdates: Array<{
    petId: string;
    type: 'personality' | 'state' | 'skills' | 'experience';
    data: any;
    timestamp: string;
  }>;
}

const initialState: PetSliceState = {
  // Basic pet data
  currentPet: null,
  pets: [],
  petsList: [],
  
  // Complete data
  completePetData: null,
  
  // UI state
  isLoading: false,
  isLoadingDetails: false,
  error: null,
  selectedPetId: null,
  
  // Filtering and search
  filter: {
    sortBy: 'lastInteraction',
    sortOrder: 'desc'
  },
  searchQuery: '',
  
  // Statistics and analytics
  statistics: null,
  comparison: null,
  
  // Cache management
  lastUpdated: {},
  cacheExpiry: 30, // 30 minutes
  
  // Real-time updates
  realTimeUpdates: true,
  pendingUpdates: []
};

// Enhanced async thunks with complete AI data support

export const fetchPetsAsync = createAsyncThunk(
  'pet/fetchPets',
  async (includeList: boolean = false, { rejectWithValue }) => {
    try {
      const response = await petApi.getPets();
      const petsListResponse = includeList ? await petApi.getPetsList() : null;
      return {
        pets: response.data,
        petsList: petsListResponse?.data || null
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pets');
    }
  }
);

export const createPetAsync = createAsyncThunk(
  'pet/createPet',
  async (petData: { name: string; breed: string; personality: any }, { rejectWithValue }) => {
    try {
      const response = await petApi.createPet(petData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create pet');
    }
  }
);

export const fetchPetDetailsAsync = createAsyncThunk(
  'pet/fetchPetDetails',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { pet: PetSliceState };
      const lastUpdated = state.pet.lastUpdated[petId];
      const cacheExpiry = state.pet.cacheExpiry * 60 * 1000; // Convert to ms
      
      // Check cache validity
      if (lastUpdated && Date.now() - new Date(lastUpdated).getTime() < cacheExpiry) {
        return null; // Use cached data
      }

      const response = await petApi.getPetById(petId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pet details');
    }
  }
);

export const fetchCompletePetDataAsync = createAsyncThunk(
  'pet/fetchCompletePetData',
  async (petId: string, { rejectWithValue }) => {
    try {
      const [pet, personalityAnalysis, stateAnalysis, skillStatistics] = await Promise.all([
        petApi.getPetById(petId),
        petApi.getPersonalityAnalysis(petId),
        petApi.getStateAnalysis(petId),
        petApi.getSkillStatistics(petId)
      ]);
      
      return {
        ...pet.data,
        personalityAnalysis: personalityAnalysis.data,
        stateAnalysis: stateAnalysis.data,
        skillStatistics: skillStatistics.data
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch complete pet data');
    }
  }
);

export const updatePetAsync = createAsyncThunk(
  'pet/updatePet',
  async ({ petId, updateData }: { petId: string; updateData: UpdatePetRequest }, { rejectWithValue }) => {
    try {
      const response = await petApi.updatePet(petId, updateData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update pet');
    }
  }
);

export const updatePetStateAsync = createAsyncThunk(
  'pet/updatePetState',
  async ({ petId, stateUpdate }: { petId: string; stateUpdate: Partial<PetState> }, { rejectWithValue }) => {
    try {
      const response = await stateApi.updateState(petId, stateUpdate);
      return { petId, state: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update pet state');
    }
  }
);

export const fetchPetStatisticsAsync = createAsyncThunk(
  'pet/fetchStatistics',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await petApi.getPetStatistics(petId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pet statistics');
    }
  }
);

export const comparePetsAsync = createAsyncThunk(
  'pet/comparePets',
  async (petIds: string[], { rejectWithValue }) => {
    try {
      const response = await petApi.comparePets(petIds);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to compare pets');
    }
  }
);

export const petSlice = createSlice({
  name: 'pet',
  initialState,
  reducers: {
    // Basic actions
    clearError: (state) => {
      state.error = null;
    },
    
    selectPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload;
      state.currentPet = state.pets.find(pet => pet.id === action.payload) || null;
      // Clear complete data to force refresh when needed
      state.completePetData = null;
    },
    
    // Filter and search
    setFilter: (state, action: PayloadAction<Partial<PetFilter>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    // Real-time updates
    toggleRealTimeUpdates: (state) => {
      state.realTimeUpdates = !state.realTimeUpdates;
    },
    
    addPendingUpdate: (state, action: PayloadAction<{
      petId: string;
      type: 'personality' | 'state' | 'skills' | 'experience';
      data: any;
    }>) => {
      state.pendingUpdates.push({
        ...action.payload,
        timestamp: new Date().toISOString()
      });
    },
    
    processPendingUpdates: (state, action: PayloadAction<string>) => {
      const petId = action.payload;
      const updates = state.pendingUpdates.filter(update => update.petId === petId);
      
      updates.forEach(update => {
        const pet = state.pets.find(p => p.id === petId);
        if (pet) {
          switch (update.type) {
            case 'personality':
              pet.personality = { ...pet.personality, ...update.data };
              break;
            case 'state':
              pet.state = { ...pet.state, ...update.data };
              break;
            case 'skills':
              pet.skills = update.data;
              break;
            case 'experience':
              pet.totalExperience = update.data;
              break;
          }
        }
        
        if (state.currentPet && state.currentPet.id === petId) {
          switch (update.type) {
            case 'personality':
              state.currentPet.personality = { ...state.currentPet.personality, ...update.data };
              break;
            case 'state':
              state.currentPet.state = { ...state.currentPet.state, ...update.data };
              break;
            case 'skills':
              state.currentPet.skills = update.data;
              break;
            case 'experience':
              state.currentPet.totalExperience = update.data;
              break;
          }
        }
      });
      
      state.pendingUpdates = state.pendingUpdates.filter(update => update.petId !== petId);
    },
    
    // Direct data updates (for WebSocket events)
    updatePetPersonality: (state, action: PayloadAction<{ petId: string; personality: PersonalityTraits }>) => {
      const { petId, personality } = action.payload;
      if (state.currentPet && state.currentPet.id === petId) {
        state.currentPet.personality = personality;
      }
      const petIndex = state.pets.findIndex(pet => pet.id === petId);
      if (petIndex !== -1) {
        state.pets[petIndex].personality = personality;
      }
      
      // Update cache timestamp
      state.lastUpdated[petId] = new Date().toISOString();
    },
    
    updatePetSkills: (state, action: PayloadAction<{ petId: string; skills: SkillProgress[] }>) => {
      const { petId, skills } = action.payload;
      if (state.currentPet && state.currentPet.id === petId) {
        state.currentPet.skills = skills;
      }
      const petIndex = state.pets.findIndex(pet => pet.id === petId);
      if (petIndex !== -1) {
        state.pets[petIndex].skills = skills;
      }
      
      state.lastUpdated[petId] = new Date().toISOString();
    },
    
    updatePetState: (state, action: PayloadAction<{ petId: string; state: PetState }>) => {
      const { petId, state: newState } = action.payload;
      if (state.currentPet && state.currentPet.id === petId) {
        state.currentPet.state = newState;
      }
      const petIndex = state.pets.findIndex(pet => pet.id === petId);
      if (petIndex !== -1) {
        state.pets[petIndex].state = newState;
      }
      
      state.lastUpdated[petId] = new Date().toISOString();
    },
    
    updateLastInteraction: (state, action: PayloadAction<string>) => {
      const petId = action.payload;
      const now = new Date().toISOString();
      if (state.currentPet && state.currentPet.id === petId) {
        state.currentPet.lastInteraction = now;
      }
      const petIndex = state.pets.findIndex(pet => pet.id === petId);
      if (petIndex !== -1) {
        state.pets[petIndex].lastInteraction = now;
      }
      
      state.lastUpdated[petId] = now;
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
    
    // Data synchronization
    syncPetData: (state, action: PayloadAction<{ petId: string; data: Partial<Pet> }>) => {
      const { petId, data } = action.payload;
      
      if (state.currentPet && state.currentPet.id === petId) {
        state.currentPet = { ...state.currentPet, ...data };
      }
      
      const petIndex = state.pets.findIndex(pet => pet.id === petId);
      if (petIndex !== -1) {
        state.pets[petIndex] = { ...state.pets[petIndex], ...data };
      }
      
      state.lastUpdated[petId] = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch pets
      .addCase(fetchPetsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPetsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.pets = action.payload.pets;
          if (action.payload.petsList) {
            state.petsList = action.payload.petsList;
          }
          if (action.payload.pets.length > 0 && !state.currentPet) {
            state.currentPet = action.payload.pets[0];
            state.selectedPetId = action.payload.pets[0].id;
          }
        }
      })
      .addCase(fetchPetsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create pet
      .addCase(createPetAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPetAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pets.push(action.payload);
        state.currentPet = action.payload;
        state.selectedPetId = action.payload.id;
        state.lastUpdated[action.payload.id] = new Date().toISOString();
      })
      .addCase(createPetAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch pet details
      .addCase(fetchPetDetailsAsync.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(fetchPetDetailsAsync.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        if (action.payload) {
          state.currentPet = action.payload;
          const petIndex = state.pets.findIndex(pet => pet.id === action.payload!.id);
          if (petIndex !== -1) {
            state.pets[petIndex] = action.payload;
          } else {
            state.pets.push(action.payload);
          }
          state.lastUpdated[action.payload.id] = new Date().toISOString();
        }
      })
      .addCase(fetchPetDetailsAsync.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload as string;
      })
      
      // Fetch complete pet data
      .addCase(fetchCompletePetDataAsync.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(fetchCompletePetDataAsync.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.completePetData = action.payload;
        if (action.payload) {
          state.lastUpdated[action.payload.id] = new Date().toISOString();
        }
      })
      .addCase(fetchCompletePetDataAsync.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload as string;
      })
      
      // Update pet
      .addCase(updatePetAsync.fulfilled, (state, action) => {
        const updatedPet = action.payload;
        if (state.currentPet && state.currentPet.id === updatedPet.id) {
          state.currentPet = { ...state.currentPet, ...updatedPet };
        }
        const petIndex = state.pets.findIndex(pet => pet.id === updatedPet.id);
        if (petIndex !== -1) {
          state.pets[petIndex] = { ...state.pets[petIndex], ...updatedPet };
        }
        state.lastUpdated[updatedPet.id] = new Date().toISOString();
      })
      
      // Update pet state
      .addCase(updatePetStateAsync.fulfilled, (state, action) => {
        const { petId, state: newState } = action.payload;
        if (state.currentPet && state.currentPet.id === petId) {
          state.currentPet.state = newState;
        }
        const petIndex = state.pets.findIndex(pet => pet.id === petId);
        if (petIndex !== -1) {
          state.pets[petIndex].state = newState;
        }
        state.lastUpdated[petId] = new Date().toISOString();
      })
      
      // Fetch statistics
      .addCase(fetchPetStatisticsAsync.fulfilled, (state, action) => {
        state.statistics = action.payload;
      })
      
      // Compare pets
      .addCase(comparePetsAsync.fulfilled, (state, action) => {
        state.comparison = action.payload;
      })
      
      // Handle all async rejections
      .addMatcher(
        (action) => action.type.endsWith('/pending') && action.type.startsWith('pet/'),
        (state) => {
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith('/rejected') && action.type.startsWith('pet/'),
        (state, action: any) => {
          state.isLoading = false;
          state.isLoadingDetails = false;
          state.error = action.payload as string || 'An error occurred';
        }
      );
  },
});

export const { 
  clearError,
  selectPet,
  setFilter,
  setSearchQuery,
  toggleRealTimeUpdates,
  addPendingUpdate,
  processPendingUpdates,
  updatePetPersonality,
  updatePetSkills,
  updatePetState,
  updateLastInteraction,
  setCacheExpiry,
  clearCache,
  syncPetData
} = petSlice.actions;

export default petSlice.reducer;