/**
 * 个性可视化组件导出文件
 * 统一导出所有个性相关的可视化组件
 * 
 * 注意：组件正在重建中，暂时只导出配置和工具函数
 */

// 重建完成的组件
export { default as PersonalityRadarChart } from './PersonalityRadarChart';

// TODO: 重建以下组件
// export { default as EvolutionHistoryChart } from './EvolutionHistoryChart';
// export { default as PersonalityTrends } from './PersonalityTrends';
// export { default as PersonalityAnalytics } from './PersonalityAnalytics';
// export { default as PersonalityAnimations } from './PersonalityAnimations';

/**
 * 组件配置常量
 */
export const PERSONALITY_COMPONENT_CONFIGS = {
  // 雷达图默认配置
  RADAR_CHART_DEFAULTS: {
    height: 400,
    theme: 'light',
    realTimeUpdate: true,
    updateInterval: 30000,
    showLabels: true
  },
  
  // 演化历史图默认配置
  EVOLUTION_CHART_DEFAULTS: {
    height: 500,
    theme: 'light',
    timeRange: 7,
    showTrendLine: true,
    enableDataZoom: true
  },
  
  // 趋势分析默认配置
  TRENDS_DEFAULTS: {
    height: 600,
    theme: 'light',
    forecastDays: 7,
    showConfidenceInterval: true
  },
  
  // 分析面板默认配置
  ANALYTICS_DEFAULTS: {
    height: 800,
    theme: 'light',
    analysisRange: 30,
    analysisTypes: ['overview', 'patterns', 'insights', 'recommendations']
  },
  
  // 动画组件默认配置
  ANIMATIONS_DEFAULTS: {
    duration: 1500,
    easing: 'cubic-in-out',
    enableParticles: true,
    theme: 'light'
  }
} as const;

/**
 * 个性特征配置映射
 */
export const PERSONALITY_TRAIT_CONFIG = {
  happiness: { 
    name: '快乐度', 
    color: '#52c41a', 
    icon: '😊',
    description: '表示宠物的整体快乐程度和满足感'
  },
  energy: { 
    name: '活力值', 
    color: '#faad14', 
    icon: '⚡',
    description: '反映宠物的精力水平和活跃程度'
  },
  curiosity: { 
    name: '好奇心', 
    color: '#13c2c2', 
    icon: '🤔',
    description: '衡量宠物对新事物的探索欲望和学习兴趣'
  },
  sociability: { 
    name: '社交性', 
    color: '#1890ff', 
    icon: '👥',
    description: '显示宠物与他人互动和社交的倾向性'
  },
  creativity: { 
    name: '创造力', 
    color: '#722ed1', 
    icon: '🎨',
    description: '体现宠物的创新思维和想象能力'
  },
  empathy: { 
    name: '同理心', 
    color: '#eb2f96', 
    icon: '❤️',
    description: '反映宠物理解和感受他人情感的能力'
  },
  independence: { 
    name: '独立性', 
    color: '#fa8c16', 
    icon: '🦅',
    description: '表示宠物的自主决策和独立行动能力'
  },
  playfulness: { 
    name: '玩耍性', 
    color: '#a0d911', 
    icon: '🎮',
    description: '衡量宠物对游戏和娱乐活动的喜好程度'
  }
} as const;

/**
 * 可视化主题配置
 */
export const VISUALIZATION_THEMES = {
  light: {
    backgroundColor: '#ffffff',
    textColor: '#333333',
    borderColor: '#d9d9d9',
    gridColor: '#f0f0f0',
    tooltipBg: '#ffffff',
    tooltipBorder: '#d9d9d9'
  },
  dark: {
    backgroundColor: '#1f1f1f',
    textColor: '#ffffff',
    borderColor: '#404040',
    gridColor: '#404040',
    tooltipBg: '#2a2a2a',
    tooltipBorder: '#404040'
  }
} as const;

/**
 * 实用工具函数
 */
export const PersonalityUtils = {
  /**
   * 格式化个性特征显示名称
   */
  getTraitDisplayName: (trait: string): string => {
    return PERSONALITY_TRAIT_CONFIG[trait as keyof typeof PERSONALITY_TRAIT_CONFIG]?.name || trait;
  },
  
  /**
   * 获取特征颜色
   */
  getTraitColor: (trait: string): string => {
    return PERSONALITY_TRAIT_CONFIG[trait as keyof typeof PERSONALITY_TRAIT_CONFIG]?.color || '#1890ff';
  },
  
  /**
   * 获取特征图标
   */
  getTraitIcon: (trait: string): string => {
    return PERSONALITY_TRAIT_CONFIG[trait as keyof typeof PERSONALITY_TRAIT_CONFIG]?.icon || '📊';
  },
  
  /**
   * 计算个性稳定性分数
   */
  calculateStabilityScore: (traits: Record<string, number>[]): number => {
    if (traits.length < 2) return 1;
    
    const traitKeys = Object.keys(traits[0]);
    let totalVariance = 0;
    
    traitKeys.forEach(trait => {
      const values = traits.map(t => t[trait] || 0);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      totalVariance += variance;
    });
    
    const avgVariance = totalVariance / traitKeys.length;
    return Math.max(0, 1 - (avgVariance / 100)); // 归一化到0-1
  },
  
  /**
   * 识别主导特征
   */
  getDominantTraits: (traits: Record<string, number>, count: number = 3): Array<{trait: string, score: number}> => {
    return Object.entries(traits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([trait, score]) => ({ trait, score }));
  },
  
  /**
   * 计算个性多样性指数
   */
  calculateDiversityIndex: (traits: Record<string, number>): number => {
    const values = Object.values(traits);
    // const max = Math.max(...values);
    // const min = Math.min(...values);
    // const range = max - min; // Not used in calculation
    
    // 计算标准差
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // 多样性指数 = 标准差 / 最大可能标准差
    const maxStdDev = Math.sqrt(((100 - 0) ** 2) / 4); // 假设最大范围是0-100
    return Math.min(1, stdDev / maxStdDev);
  }
} as const;