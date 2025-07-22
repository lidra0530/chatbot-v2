import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { petApi, stateApi } from '../../services/api';

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PetState {
  health: number;
  happiness: number;
  energy: number;
  hunger: number;
  social: number;
}

export interface SkillProgress {
  skillId: string;
  name: string;
  category: string;
  experience: number;
  level: number;
  isUnlocked: boolean;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  personality: PersonalityTraits;
  state: PetState;
  skills: SkillProgress[];
  evolutionLevel: number;
  totalExperience: number;
  createdAt: string;
  lastInteraction: string;
}

export interface PetSliceState {
  currentPet: Pet | null;
  pets: Pet[];
  isLoading: boolean;
  error: string | null;
  selectedPetId: string | null;
}

const initialState: PetSliceState = {
  currentPet: null,
  pets: [],
  isLoading: false,
  error: null,
  selectedPetId: null,
};

interface CreatePetData {
  name: string;
  species: string;
}

export const fetchPetsAsync = createAsyncThunk(
  'pet/fetchPets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await petApi.getPets();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pets');
    }
  }
);

export const createPetAsync = createAsyncThunk(
  'pet/createPet',
  async (petData: CreatePetData, { rejectWithValue }) => {
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
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await petApi.getPetById(petId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pet details');
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

export const petSlice = createSlice({
  name: 'pet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    selectPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload;
      state.currentPet = state.pets.find(pet => pet.id === action.payload) || null;
    },
    updatePetPersonality: (state, action: PayloadAction<{ petId: string; personality: PersonalityTraits }>) => {
      const { petId, personality } = action.payload;
      if (state.currentPet && state.currentPet.id === petId) {
        state.currentPet.personality = personality;
      }
      const petIndex = state.pets.findIndex(pet => pet.id === petId);
      if (petIndex !== -1) {
        state.pets[petIndex].personality = personality;
      }
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
        state.pets = action.payload;
        if (action.payload.length > 0 && !state.currentPet) {
          state.currentPet = action.payload[0];
          state.selectedPetId = action.payload[0].id;
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
      })
      .addCase(createPetAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch pet details
      .addCase(fetchPetDetailsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPetDetailsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPet = action.payload;
        const petIndex = state.pets.findIndex(pet => pet.id === action.payload.id);
        if (petIndex !== -1) {
          state.pets[petIndex] = action.payload;
        } else {
          state.pets.push(action.payload);
        }
      })
      .addCase(fetchPetDetailsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
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
      });
  },
});

export const { 
  clearError, 
  selectPet, 
  updatePetPersonality, 
  updatePetSkills, 
  updateLastInteraction 
} = petSlice.actions;

export default petSlice.reducer;