import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { skillsApi } from '../../services/api';
import type { 
  Skill, 
  SkillProgress, 
  SkillTree, 
  SkillUnlockCondition,
  SkillStatistics,
  SkillCategory
} from '../../types/skills.types';

// Enhanced Skills Slice State with complex skill tree visualization support
export interface SkillsState {
  // Current skill tree data
  tree: SkillTree | null;
  progress: SkillProgress[];
  availableSkills: Skill[];
  categories: SkillCategory[];
  
  // Unlock conditions and rules
  unlockConditions: Record<string, SkillUnlockCondition>; // skillId -> condition
  
  // Statistics and analytics
  statistics: SkillStatistics | null;
  unlockHistory: Array<{
    skillId: string;
    skillName: string;
    unlockedAt: string;
    experienceGained: number;
    level: number;
  }>;
  
  // Abilities system
  currentAbilities: string[];
  abilityProgress: Record<string, number>; // abilityId -> progress percentage
  
  // UI state
  isLoading: boolean;
  isLoadingTree: boolean;
  isUnlocking: boolean;
  error: string | null;
  
  // Selected data for UI
  selectedPetId: string | null;
  selectedSkill: string | null;
  selectedCategory: string | null;
  
  // Tree visualization settings
  treeLayout: {
    type: 'hierarchical' | 'radial' | 'force-directed';
    spacing: { x: number; y: number };
    scale: number;
    center: { x: number; y: number };
  };
  
  // Filter and view options
  viewMode: 'full' | 'available' | 'unlocked' | 'category';
  skillFilter: {
    category?: string;
    level?: { min: number; max: number };
    unlocked?: boolean;
    search?: string;
  };
  
  // Experience tracking
  experienceBuffer: Record<string, number>; // skillId -> pending experience
  totalExperience: number;
  experienceMultiplier: number;
  
  // Cache management
  lastUpdated: Record<string, string>; // petId -> timestamp
  cacheExpiry: number; // minutes
  
  // Real-time tracking
  pendingUnlocks: Array<{
    skillId: string;
    petId: string;
    progress: number;
    timestamp: string;
  }>;
}

const initialState: SkillsState = {
  // Current skill tree data
  tree: null,
  progress: [],
  availableSkills: [],
  categories: [],
  
  // Unlock conditions and rules
  unlockConditions: {},
  
  // Statistics and analytics
  statistics: null,
  unlockHistory: [],
  
  // Abilities system
  currentAbilities: [],
  abilityProgress: {},
  
  // UI state
  isLoading: false,
  isLoadingTree: false,
  isUnlocking: false,
  error: null,
  
  // Selected data
  selectedPetId: null,
  selectedSkill: null,
  selectedCategory: null,
  
  // Tree visualization settings
  treeLayout: {
    type: 'hierarchical',
    spacing: { x: 150, y: 100 },
    scale: 1.0,
    center: { x: 0, y: 0 },
  },
  
  // Filter and view options
  viewMode: 'full',
  skillFilter: {},
  
  // Experience tracking
  experienceBuffer: {},
  totalExperience: 0,
  experienceMultiplier: 1.0,
  
  // Cache management
  lastUpdated: {},
  cacheExpiry: 10, // 10 minutes for skills data
  
  // Real-time tracking
  pendingUnlocks: [],
};

// Enhanced async thunks with complete skills system support

export const fetchSkillTreeAsync = createAsyncThunk(
  'skills/fetchSkillTree',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { skills: SkillsState };
      const lastUpdated = state.skills.lastUpdated[petId];
      const cacheExpiry = state.skills.cacheExpiry * 60 * 1000;
      
      // Check cache validity
      if (lastUpdated && Date.now() - new Date(lastUpdated).getTime() < cacheExpiry) {
        return null; // Use cached data
      }

      const response = await skillsApi.getSkillTree(petId);
      return { petId, tree: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch skill tree');
    }
  }
);

export const fetchAvailableSkillsAsync = createAsyncThunk(
  'skills/fetchAvailableSkills',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await skillsApi.getAvailableSkills(petId);
      return { petId, skills: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch available skills');
    }
  }
);

export const unlockSkillAsync = createAsyncThunk(
  'skills/unlockSkill',
  async ({ petId, skillId }: { petId: string; skillId: string }, { rejectWithValue }) => {
    try {
      const response = await skillsApi.unlockSkill(petId, skillId);
      return { petId, skillId, unlock: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unlock skill');
    }
  }
);

export const addSkillExperienceAsync = createAsyncThunk(
  'skills/addExperience',
  async ({ petId, skillId, amount }: { petId: string; skillId: string; amount: number }, { rejectWithValue }) => {
    try {
      const response = await skillsApi.addExperience(petId, skillId, amount);
      return { petId, skillId, progress: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add skill experience');
    }
  }
);

export const fetchCurrentAbilitiesAsync = createAsyncThunk(
  'skills/fetchCurrentAbilities',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await skillsApi.getCurrentAbilities(petId);
      return { petId, abilities: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch current abilities');
    }
  }
);

export const fetchSkillProgressAsync = createAsyncThunk(
  'skills/fetchSkillProgress',
  async ({ petId, skillId }: { petId: string; skillId: string }, { rejectWithValue }) => {
    try {
      const response = await skillsApi.getSkillProgress(petId, skillId);
      return { petId, skillId, progress: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch skill progress');
    }
  }
);

export const fetchUnlockHistoryAsync = createAsyncThunk(
  'skills/fetchUnlockHistory',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await skillsApi.getUnlockHistory(petId);
      return { petId, history: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch unlock history');
    }
  }
);

export const evaluateUnlockConditionsAsync = createAsyncThunk(
  'skills/evaluateUnlockConditions',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await skillsApi.evaluateUnlockConditions(petId);
      return { petId, conditions: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to evaluate unlock conditions');
    }
  }
);

export const skillsSlice = createSlice({
  name: 'skills',
  initialState,
  reducers: {
    // Basic actions
    clearError: (state) => {
      state.error = null;
    },
    
    setSelectedPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload;
      // Clear data when switching pets
      state.tree = null;
      state.progress = [];
      state.availableSkills = [];
      state.statistics = null;
      state.currentAbilities = [];
      state.unlockHistory = [];
    },
    
    // Skill selection and focus
    setSelectedSkill: (state, action: PayloadAction<string | null>) => {
      state.selectedSkill = action.payload;
    },
    
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
    
    // Tree visualization controls
    updateTreeLayout: (state, action: PayloadAction<Partial<SkillsState['treeLayout']>>) => {
      state.treeLayout = { ...state.treeLayout, ...action.payload };
    },
    
    setViewMode: (state, action: PayloadAction<SkillsState['viewMode']>) => {
      state.viewMode = action.payload;
    },
    
    setSkillFilter: (state, action: PayloadAction<Partial<SkillsState['skillFilter']>>) => {
      state.skillFilter = { ...state.skillFilter, ...action.payload };
    },
    
    // Experience and progress management
    addExperienceBuffer: (state, action: PayloadAction<{ skillId: string; amount: number }>) => {
      const { skillId, amount } = action.payload;
      state.experienceBuffer[skillId] = (state.experienceBuffer[skillId] || 0) + amount;
    },
    
    flushExperienceBuffer: (state, action: PayloadAction<string>) => {
      const skillId = action.payload;
      const bufferedExp = state.experienceBuffer[skillId] || 0;
      
      if (bufferedExp > 0) {
        // Find and update skill progress
        const skillProgress = state.progress.find(p => p.skillId === skillId);
        if (skillProgress) {
          skillProgress.experience += bufferedExp * state.experienceMultiplier;
        }
        
        // Clear buffer
        delete state.experienceBuffer[skillId];
        
        // Update total experience
        state.totalExperience += bufferedExp * state.experienceMultiplier;
      }
    },
    
    setExperienceMultiplier: (state, action: PayloadAction<number>) => {
      state.experienceMultiplier = Math.max(0.1, Math.min(5.0, action.payload));
    },
    
    // Real-time unlock tracking
    addPendingUnlock: (state, action: PayloadAction<{ skillId: string; petId: string; progress: number }>) => {
      const existing = state.pendingUnlocks.findIndex(
        p => p.skillId === action.payload.skillId && p.petId === action.payload.petId
      );
      
      if (existing >= 0) {
        state.pendingUnlocks[existing] = {
          ...action.payload,
          timestamp: new Date().toISOString(),
        };
      } else {
        state.pendingUnlocks.push({
          ...action.payload,
          timestamp: new Date().toISOString(),
        });
      }
    },
    
    removePendingUnlock: (state, action: PayloadAction<{ skillId: string; petId: string }>) => {
      state.pendingUnlocks = state.pendingUnlocks.filter(
        p => !(p.skillId === action.payload.skillId && p.petId === action.payload.petId)
      );
    },
    
    // Skill progress updates
    updateSkillProgress: (state, action: PayloadAction<SkillProgress>) => {
      const existingIndex = state.progress.findIndex(p => p.skillId === action.payload.skillId);
      
      if (existingIndex >= 0) {
        state.progress[existingIndex] = action.payload;
      } else {
        state.progress.push(action.payload);
      }
      
      // Update cache timestamp
      if (state.selectedPetId) {
        state.lastUpdated[state.selectedPetId] = new Date().toISOString();
      }
    },
    
    // Abilities management
    updateCurrentAbilities: (state, action: PayloadAction<string[]>) => {
      state.currentAbilities = action.payload;
    },
    
    updateAbilityProgress: (state, action: PayloadAction<{ abilityId: string; progress: number }>) => {
      const { abilityId, progress } = action.payload;
      state.abilityProgress[abilityId] = Math.max(0, Math.min(100, progress));
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
    clearSkillsData: (state) => {
      state.tree = null;
      state.progress = [];
      state.availableSkills = [];
      state.categories = [];
      state.statistics = null;
      state.currentAbilities = [];
      state.unlockHistory = [];
      state.selectedPetId = null;
      state.selectedSkill = null;
      state.selectedCategory = null;
      state.experienceBuffer = {};
      state.pendingUnlocks = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch skill tree
      .addCase(fetchSkillTreeAsync.pending, (state) => {
        state.isLoadingTree = true;
        state.error = null;
      })
      .addCase(fetchSkillTreeAsync.fulfilled, (state, action) => {
        state.isLoadingTree = false;
        if (action.payload) {
          state.tree = action.payload.tree;
          state.lastUpdated[action.payload.petId] = new Date().toISOString();
        }
      })
      .addCase(fetchSkillTreeAsync.rejected, (state, action) => {
        state.isLoadingTree = false;
        state.error = action.payload as string;
      })
      
      // Fetch available skills
      .addCase(fetchAvailableSkillsAsync.fulfilled, (state, action) => {
        state.availableSkills = action.payload.skills;
      })
      
      // Unlock skill
      .addCase(unlockSkillAsync.pending, (state) => {
        state.isUnlocking = true;
        state.error = null;
      })
      .addCase(unlockSkillAsync.fulfilled, (state, action) => {
        state.isUnlocking = false;
        const { skillId, unlock } = action.payload;
        
        // Update progress
        const skillProgress = state.progress.find(p => p.skillId === skillId);
        if (skillProgress) {
          skillProgress.isUnlocked = true;
          skillProgress.unlockedAt = new Date().toISOString();
        } else {
          // Create a complete SkillProgress object
          const newProgress: SkillProgress = {
            skillId,
            name: unlock.skillName || skillId,
            category: unlock.category || 'general',
            maxLevel: unlock.maxLevel || 10,
            experience: unlock.experience || 0,
            level: unlock.level || 1,
            isUnlocked: true,
            unlockedAt: new Date().toISOString(),
          };
          state.progress.push(newProgress);
        }
        
        // Add to unlock history
        state.unlockHistory.unshift({
          skillId,
          skillName: unlock.skillName || skillId,
          unlockedAt: new Date().toISOString(),
          experienceGained: unlock.experienceGained || 0,
          level: unlock.level || 1,
        });
        
        // Remove from pending unlocks
        state.pendingUnlocks = state.pendingUnlocks.filter(
          p => p.skillId !== skillId
        );
      })
      .addCase(unlockSkillAsync.rejected, (state, action) => {
        state.isUnlocking = false;
        state.error = action.payload as string;
      })
      
      // Add skill experience
      .addCase(addSkillExperienceAsync.fulfilled, (state, action) => {
        const { skillId, progress } = action.payload;
        const existingProgress = state.progress.find(p => p.skillId === skillId);
        
        if (existingProgress) {
          existingProgress.experience = progress.experience;
          existingProgress.level = progress.level;
        } else {
          state.progress.push(progress);
        }
      })
      
      // Fetch current abilities
      .addCase(fetchCurrentAbilitiesAsync.fulfilled, (state, action) => {
        state.currentAbilities = action.payload.abilities;
      })
      
      // Fetch skill progress
      .addCase(fetchSkillProgressAsync.fulfilled, (state, action) => {
        const { skillId, progress } = action.payload;
        const existingIndex = state.progress.findIndex(p => p.skillId === skillId);
        
        if (existingIndex >= 0) {
          state.progress[existingIndex] = progress;
        } else {
          state.progress.push(progress);
        }
      })
      
      // Fetch unlock history
      .addCase(fetchUnlockHistoryAsync.fulfilled, (state, action) => {
        state.unlockHistory = action.payload.history;
      })
      
      // Evaluate unlock conditions
      .addCase(evaluateUnlockConditionsAsync.fulfilled, (state, action) => {
        state.unlockConditions = action.payload.conditions;
      })
      
      // Handle all async rejections
      .addMatcher(
        (action) => action.type.endsWith('/pending') && action.type.startsWith('skills/'),
        (state) => {
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith('/rejected') && action.type.startsWith('skills/'),
        (state, action: any) => {
          state.isLoading = false;
          state.isLoadingTree = false;
          state.isUnlocking = false;
          state.error = action.payload as string || 'An error occurred';
        }
      );
  },
});

export const {
  clearError,
  setSelectedPet,
  setSelectedSkill,
  setSelectedCategory,
  updateTreeLayout,
  setViewMode,
  setSkillFilter,
  addExperienceBuffer,
  flushExperienceBuffer,
  setExperienceMultiplier,
  addPendingUnlock,
  removePendingUnlock,
  updateSkillProgress,
  updateCurrentAbilities,
  updateAbilityProgress,
  setCacheExpiry,
  clearCache,
  clearSkillsData
} = skillsSlice.actions;

export default skillsSlice.reducer;