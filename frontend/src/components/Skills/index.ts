// Skills Components Library
// Comprehensive skill tree visualization system with interactive components
// 
// 注意：组件正在重建中，暂时只导出配置和工具函数

// 重建完成的组件
export { default as SkillTreeVisualization } from './SkillTreeVisualization';

// TODO: 重建以下组件
// export { SkillNode as SkillNodeComponent } from './SkillNode';
// export { SkillProgressBar } from './SkillProgressBar';
// export { SkillTooltip } from './SkillTooltip';
// export { SkillUnlockAnimation, SkillLevelUpAnimation } from './SkillUnlockAnimation';

// 简化的类型定义 - 将在重建组件时改为导入正确类型
interface SkillNode {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  isUnlocked: boolean;
  experience: number;
  experienceToNext: number;
  category: string;
  prerequisites: string[];
  children?: SkillNode[];
  isActive?: boolean;
}

// Utility Functions for Skills System
export const SkillUtils = {
  /**
   * Calculate skill progress percentage
   */
  calculateProgress: (skill: SkillNode): number => {
    if (!skill.isUnlocked) return 0;
    if (skill.level >= skill.maxLevel) return 100;
    
    const totalExp = skill.experience + skill.experienceToNext;
    return totalExp > 0 ? (skill.experience / totalExp) * 100 : 0;
  },

  /**
   * Get skill status
   */
  getSkillStatus: (skill: SkillNode): 'locked' | 'unlocked' | 'active' | 'maxLevel' => {
    if (!skill.isUnlocked) return 'locked';
    if (skill.level >= skill.maxLevel) return 'maxLevel';
    if (skill.isActive) return 'active';
    return 'unlocked';
  },

  /**
   * Check if skill can be unlocked
   */
  canUnlock: (skill: SkillNode, unlockedSkills: string[]): boolean => {
    if (skill.isUnlocked) return false;
    return skill.prerequisites.every((prereqId: string) => unlockedSkills.includes(prereqId));
  },

  /**
   * Get skill tree depth
   */
  getTreeDepth: (skills: SkillNode[]): number => {
    const calculateDepth = (skill: SkillNode, visited = new Set<string>()): number => {
      if (visited.has(skill.id)) return 0; // Prevent cycles
      visited.add(skill.id);
      
      if (!skill.children || skill.children.length === 0) return 1;
      
      const childDepths = skill.children.map((child: SkillNode) => calculateDepth(child, new Set(visited)));
      return 1 + Math.max(...childDepths);
    };

    const rootSkills = skills.filter(skill => skill.prerequisites.length === 0);
    return Math.max(...rootSkills.map(skill => calculateDepth(skill)));
  },

  /**
   * Get skills by category
   */
  getSkillsByCategory: (skills: SkillNode[]): Record<string, SkillNode[]> => {
    return skills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, SkillNode[]>);
  },

  /**
   * Calculate total experience in skill tree
   */
  getTotalExperience: (skills: SkillNode[]): number => {
    return skills.reduce((total, skill) => {
      return total + (skill.isUnlocked ? skill.experience : 0);
    }, 0);
  },

  /**
   * Get next unlockable skills
   */
  getNextUnlockableSkills: (skills: SkillNode[]): SkillNode[] => {
    const unlockedSkillIds = skills.filter(s => s.isUnlocked).map(s => s.id);
    
    return skills.filter(skill => {
      if (skill.isUnlocked) return false;
      return skill.prerequisites.every((prereqId: string) => unlockedSkillIds.includes(prereqId));
    });
  },

  /**
   * Format experience display
   */
  formatExperience: (exp: number): string => {
    if (exp >= 1000000) return `${(exp / 1000000).toFixed(1)}M`;
    if (exp >= 1000) return `${(exp / 1000).toFixed(1)}K`;
    return exp.toString();
  },

  /**
   * Get skill tier based on level
   */
  getSkillTier: (skill: SkillNode): 'novice' | 'apprentice' | 'expert' | 'master' | 'grandmaster' => {
    const progress = skill.level / skill.maxLevel;
    
    if (progress >= 1.0) return 'grandmaster';
    if (progress >= 0.8) return 'master';
    if (progress >= 0.6) return 'expert';
    if (progress >= 0.3) return 'apprentice';
    return 'novice';
  },
};

// Configuration Constants
export const SkillConfig = {
  // Theme colors
  themes: {
    light: {
      background: '#ffffff',
      node: {
        unlocked: '#4CAF50',
        locked: '#E0E0E0',
        active: '#2196F3',
        maxLevel: '#FF9800',
        hover: '#81C784',
        selected: '#1976D2',
      },
      text: '#333333',
      border: '#666666',
      progress: '#4CAF50',
      progressBg: '#E8F5E8',
    },
    dark: {
      background: '#1a1a1a',
      node: {
        unlocked: '#66BB6A',
        locked: '#424242',
        active: '#42A5F5',
        maxLevel: '#FFB74D',
        hover: '#81C784',
        selected: '#1E88E5',
      },
      text: '#FFFFFF',
      border: '#999999',
      progress: '#66BB6A',
      progressBg: '#2E2E2E',
    },
  },

  // Animation durations
  animations: {
    nodeTransition: 200,
    progressUpdate: 300,
    skillUnlock: 2000,
    levelUp: 1500,
    tooltip: 200,
  },

  // Layout settings
  layout: {
    nodeRadius: 20,
    linkDistance: 80,
    forceStrength: -300,
    collisionRadius: 30,
  },

  // Experience requirements (example curve)
  experienceCurve: {
    base: 100,
    multiplier: 1.5,
    calculateRequiredExp: (level: number): number => {
      return Math.floor(SkillConfig.experienceCurve.base * Math.pow(SkillConfig.experienceCurve.multiplier, level - 1));
    },
  },
} as const;

// TODO: 重建后恢复以下导出
// export const SkillComponents = {
//   TreeVisualization: SkillTreeVisualization,
//   Node: SkillNodeComponent,
//   ProgressBar: SkillProgressBar,
//   Tooltip: SkillTooltip,
//   UnlockAnimation: SkillUnlockAnimation,
//   LevelUpAnimation: SkillLevelUpAnimation,
// } as const;