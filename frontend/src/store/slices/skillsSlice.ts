import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { skillsApi } from '../../services/api';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  maxLevel: number;
  prerequisites: string[];
  icon?: string;
}

export interface SkillProgress {
  skillId: string;
  experience: number;
  level: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  lastProgressUpdate: string;
}

export interface SkillTreeNode {
  skill: Skill;
  progress: SkillProgress;
  position: { x: number; y: number };
  connections: string[];
}

export interface SkillTree {
  petId: string;
  categories: Record<string, SkillTreeNode[]>;
  totalExperience: number;
  totalSkillsUnlocked: number;
  lastUpdate: string;
}

export interface SkillUnlockEvent {
  id: string;
  petId: string;
  skillId: string;
  skillName: string;
  unlockedAt: string;
  triggerType: 'experience' | 'interaction' | 'milestone';
  experience: number;
  level: number;
}

export interface SkillsState {
  skillTree: SkillTree | null;
  availableSkills: Skill[];
  currentAbilities: string[];
  unlockHistory: SkillUnlockEvent[];
  isLoading: boolean;
  isUnlocking: boolean;
  error: string | null;
  selectedPetId: string | null;
}

const initialState: SkillsState = {
  skillTree: null,
  availableSkills: [],
  currentAbilities: [],
  unlockHistory: [],
  isLoading: false,
  isUnlocking: false,
  error: null,
  selectedPetId: null,
};

export const fetchSkillTreeAsync = createAsyncThunk(
  'skills/fetchSkillTree',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await skillsApi.getSkillTree(petId);
      return response.data;
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
      return response.data;
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
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unlock skill');
    }
  }
);

export const fetchCurrentAbilitiesAsync = createAsyncThunk(
  'skills/fetchCurrentAbilities',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await skillsApi.getCurrentAbilities(petId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch current abilities');
    }
  }
);

export const addExperienceAsync = createAsyncThunk(
  'skills/addExperience',
  async ({ petId, skillId, amount }: { petId: string; skillId: string; amount: number }, { rejectWithValue }) => {
    try {
      const response = await skillsApi.addExperience(petId, skillId, amount);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add experience');
    }
  }
);

export const skillsSlice = createSlice({
  name: 'skills',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload;
    },
    updateSkillProgress: (state, action: PayloadAction<{ skillId: string; progress: SkillProgress }>) => {
      const { skillId, progress } = action.payload;
      if (state.skillTree) {
        Object.values(state.skillTree.categories).forEach(category => {
          const skillNode = category.find(node => node.skill.id === skillId);
          if (skillNode) {
            skillNode.progress = progress;
          }
        });
      }
    },
    addSkillUnlockEvent: (state, action: PayloadAction<SkillUnlockEvent>) => {
      state.unlockHistory.unshift(action.payload);
      // 限制历史记录长度
      if (state.unlockHistory.length > 50) {
        state.unlockHistory = state.unlockHistory.slice(0, 50);
      }
    },
    updateAbilities: (state, action: PayloadAction<string[]>) => {
      state.currentAbilities = action.payload;
    },
    clearSkillsData: (state) => {
      state.skillTree = null;
      state.availableSkills = [];
      state.currentAbilities = [];
      state.unlockHistory = [];
      state.selectedPetId = null;
    },
    markSkillAsUnlocked: (state, action: PayloadAction<{ skillId: string; experience: number; level: number }>) => {
      const { skillId, experience, level } = action.payload;
      if (state.skillTree) {
        Object.values(state.skillTree.categories).forEach(category => {
          const skillNode = category.find(node => node.skill.id === skillId);
          if (skillNode) {
            skillNode.progress.isUnlocked = true;
            skillNode.progress.experience = experience;
            skillNode.progress.level = level;
            skillNode.progress.unlockedAt = new Date().toISOString();
            skillNode.progress.lastProgressUpdate = new Date().toISOString();
          }
        });
        state.skillTree.totalSkillsUnlocked += 1;
        state.skillTree.lastUpdate = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch skill tree
      .addCase(fetchSkillTreeAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSkillTreeAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.skillTree = action.payload;
        state.selectedPetId = action.payload.petId;
      })
      .addCase(fetchSkillTreeAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch available skills
      .addCase(fetchAvailableSkillsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableSkillsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableSkills = action.payload;
      })
      .addCase(fetchAvailableSkillsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Unlock skill
      .addCase(unlockSkillAsync.pending, (state) => {
        state.isUnlocking = true;
        state.error = null;
      })
      .addCase(unlockSkillAsync.fulfilled, (state, action) => {
        state.isUnlocking = false;
        if (action.payload.skillProgress) {
          const { skillId, ...progress } = action.payload.skillProgress;
          if (state.skillTree) {
            Object.values(state.skillTree.categories).forEach(category => {
              const skillNode = category.find(node => node.skill.id === skillId);
              if (skillNode) {
                skillNode.progress = progress;
              }
            });
          }
        }
        if (action.payload.unlockEvent) {
          state.unlockHistory.unshift(action.payload.unlockEvent);
        }
      })
      .addCase(unlockSkillAsync.rejected, (state, action) => {
        state.isUnlocking = false;
        state.error = action.payload as string;
      })
      // Fetch current abilities
      .addCase(fetchCurrentAbilitiesAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentAbilitiesAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAbilities = action.payload;
      })
      .addCase(fetchCurrentAbilitiesAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Add experience
      .addCase(addExperienceAsync.fulfilled, (state, action) => {
        if (action.payload.skillProgress) {
          const { skillId, ...progress } = action.payload.skillProgress;
          if (state.skillTree) {
            Object.values(state.skillTree.categories).forEach(category => {
              const skillNode = category.find(node => node.skill.id === skillId);
              if (skillNode) {
                skillNode.progress = { ...skillNode.progress, ...progress };
              }
            });
          }
        }
        if (action.payload.levelUp) {
          // 处理升级事件
          state.unlockHistory.unshift(action.payload.levelUp);
        }
      });
  },
});

export const { 
  clearError, 
  setSelectedPet, 
  updateSkillProgress, 
  addSkillUnlockEvent, 
  updateAbilities, 
  clearSkillsData,
  markSkillAsUnlocked 
} = skillsSlice.actions;

export default skillsSlice.reducer;