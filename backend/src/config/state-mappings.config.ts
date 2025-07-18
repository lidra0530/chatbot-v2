/**
 * 状态系统配置文件
 * 定义状态影响系数、衰减参数、边界值和验证逻辑
 */

/**
 * 状态影响系数配置
 * 定义不同互动类型对各状态维度的影响程度
 */
export const STATE_IMPACT_COEFFICIENTS = {
  // 互动类型 -> 状态影响
  positive_interaction: {
    mood: 8,           // 积极互动显著提升心情
    energy: 3,         // 轻微消耗精力
    hunger: 2,         // 轻微增加饥饿
    curiosity: 5,      // 提升好奇心
    socialDesire: 6,   // 增强社交欲望
    creativity: 4,     // 提升创造力
    focusLevel: 2      // 轻微提升专注度
  },
  
  negative_interaction: {
    mood: -6,          // 负面互动降低心情
    energy: -2,        // 消耗精力
    hunger: 1,         // 轻微增加饥饿
    curiosity: -3,     // 降低好奇心
    socialDesire: -4,  // 降低社交欲望
    creativity: -2,    // 轻微降低创造力
    focusLevel: -3     // 降低专注度
  },
  
  neutral_interaction: {
    mood: 1,           // 轻微提升心情
    energy: -1,        // 轻微消耗精力
    hunger: 1,         // 轻微增加饥饿
    curiosity: 1,      // 轻微提升好奇心
    socialDesire: 2,   // 提升社交欲望
    creativity: 0,     // 无影响
    focusLevel: 0      // 无影响
  },
  
  learning_interaction: {
    mood: 4,           // 学习带来满足感
    energy: -4,        // 消耗较多精力
    hunger: 3,         // 增加饥饿
    curiosity: 8,      // 大幅提升好奇心
    socialDesire: 1,   // 轻微提升社交欲望
    creativity: 6,     // 显著提升创造力
    focusLevel: 7      // 显著提升专注度
  },
  
  creative_interaction: {
    mood: 6,           // 创作带来愉悦
    energy: -3,        // 消耗精力
    hunger: 2,         // 轻微增加饥饿
    curiosity: 4,      // 提升好奇心
    socialDesire: 2,   // 轻微提升社交欲望
    creativity: 9,     // 大幅提升创造力
    focusLevel: 5      // 提升专注度
  },
  
  social_interaction: {
    mood: 7,           // 社交带来快乐
    energy: -2,        // 轻微消耗精力
    hunger: 1,         // 轻微增加饥饿
    curiosity: 3,      // 提升好奇心
    socialDesire: 8,   // 大幅提升社交欲望
    creativity: 3,     // 提升创造力
    focusLevel: 1      // 轻微提升专注度
  }
} as const;

/**
 * 状态衰减参数配置
 * 定义各状态维度的自然衰减速率和边界条件
 */
export const STATE_DECAY_CONFIG = {
  // 基础状态衰减率（每小时）
  basicDecayRates: {
    hunger: 0.5,       // 饥饿每小时增加0.5点
    energy: 0.3,       // 精力每小时减少0.3点
    mood: 0.1,         // 心情每小时减少0.1点
    health: 0.02       // 健康每小时减少0.02点（很慢）
  },
  
  // 高级状态衰减率（每小时）
  advancedDecayRates: {
    curiosity: 0.05,     // 好奇心每小时减少0.05点
    socialDesire: 0.03,  // 社交欲望每小时减少0.03点
    creativity: 0.04,    // 创造力每小时减少0.04点
    focusLevel: 0.08     // 专注度每小时减少0.08点（较快）
  },
  
  // 衰减边界条件
  decayLimits: {
    // 最小衰减值（不会衰减到此值以下）
    minimumValues: {
      mood: 10,          // 心情最低10点
      energy: 5,         // 精力最低5点
      health: 20,        // 健康最低20点
      curiosity: 15,     // 好奇心最低15点
      socialDesire: 10,  // 社交欲望最低10点
      creativity: 10,    // 创造力最低10点
      focusLevel: 5      // 专注度最低5点
    },
    
    // 最大衰减值（不会衰减/增长到此值以上）
    maximumValues: {
      hunger: 95,        // 饥饿最高95点
      mood: 100,         // 心情最高100点
      energy: 100,       // 精力最高100点
      health: 100,       // 健康最高100点
      curiosity: 100,    // 好奇心最高100点
      socialDesire: 100, // 社交欲望最高100点
      creativity: 100,   // 创造力最高100点
      focusLevel: 100    // 专注度最高100点
    }
  },
  
  // 衰减速率修正因子
  decayModifiers: {
    // 基于当前数值的修正（数值越高衰减越慢）
    valueBasedModifier: {
      enabled: true,
      threshold: 80,     // 阈值：超过80点时应用修正
      modifier: 0.7      // 修正系数：衰减速率 * 0.7
    },
    
    // 基于互动频率的修正（互动越频繁衰减越慢）
    activityBasedModifier: {
      enabled: true,
      recentInteractionHours: 6,  // 考虑过去6小时的互动
      maxModifier: 0.5,           // 最大修正系数
      minModifier: 1.2            // 最小修正系数（无互动时衰减更快）
    }
  }
} as const;

/**
 * 状态边界值配置
 * 定义状态的有效范围和临界值
 */
export const STATE_BOUNDARIES = {
  // 全局边界值
  globalBounds: {
    minimum: 0,
    maximum: 100
  },
  
  // 关键阈值定义
  criticalThresholds: {
    // 低值警告阈值
    lowWarning: {
      mood: 20,          // 心情低于20时需要关注
      energy: 15,        // 精力低于15时需要关注
      health: 30,        // 健康低于30时需要关注
      focusLevel: 20     // 专注度低于20时需要关注
    },
    
    // 高值警告阈值
    highWarning: {
      hunger: 85,        // 饥饿高于85时需要关注
      mood: 95,          // 心情高于95时可能过度兴奋
      energy: 95         // 精力高于95时可能过度活跃
    },
    
    // 危险阈值
    dangerThresholds: {
      mood: 5,           // 心情低于5时处于危险状态
      energy: 3,         // 精力低于3时处于危险状态
      health: 10,        // 健康低于10时处于危险状态
      hunger: 98         // 饥饿高于98时处于危险状态
    }
  },
  
  // 状态变化限制
  changeConstraints: {
    // 单次互动的最大变化量
    maxSingleChange: {
      mood: 15,          // 单次最多变化15点
      energy: 12,        // 单次最多变化12点
      hunger: 10,        // 单次最多变化10点
      health: 5,         // 单次最多变化5点
      curiosity: 12,     // 单次最多变化12点
      socialDesire: 10,  // 单次最多变化10点
      creativity: 12,    // 单次最多变化12点
      focusLevel: 10     // 单次最多变化10点
    },
    
    // 时间窗口内的最大累积变化
    maxCumulativeChange: {
      timeWindow: 3600000,  // 1小时（毫秒）
      limits: {
        mood: 25,           // 1小时内最多变化25点
        energy: 20,         // 1小时内最多变化20点
        hunger: 15,         // 1小时内最多变化15点
        health: 8,          // 1小时内最多变化8点
        curiosity: 20,      // 1小时内最多变化20点
        socialDesire: 18,   // 1小时内最多变化18点
        creativity: 20,     // 1小时内最多变化20点
        focusLevel: 15      // 1小时内最多变化15点
      }
    }
  }
} as const;

/**
 * 状态验证配置
 */
export const STATE_VALIDATION_CONFIG = {
  // 必需字段验证
  requiredFields: [
    'basic.mood',
    'basic.energy', 
    'basic.hunger',
    'basic.health',
    'advanced.curiosity',
    'advanced.socialDesire',
    'advanced.creativity',
    'advanced.focusLevel',
    'autoDecayEnabled',
    'decayRates'
  ],
  
  // 数据类型验证
  fieldTypes: {
    'basic.mood': 'number',
    'basic.energy': 'number',
    'basic.hunger': 'number', 
    'basic.health': 'number',
    'advanced.curiosity': 'number',
    'advanced.socialDesire': 'number',
    'advanced.creativity': 'number',
    'advanced.focusLevel': 'number',
    'autoDecayEnabled': 'boolean',
    'lastUpdate': ['object', 'null']
  },
  
  // 错误消息模板
  errorMessages: {
    missingField: '缺少必需字段: {field}',
    invalidType: '字段 {field} 类型错误，期望 {expected}，实际 {actual}',
    outOfRange: '字段 {field} 超出范围，值 {value} 不在 [{min}, {max}] 范围内',
    invalidDecayRate: '衰减率 {field} 无效，值 {value} 必须为正数且小于等于10'
  }
} as const;

/**
 * 状态验证函数
 * 验证状态对象的有效性和边界检查
 */
export function validateStateObject(state: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查必需字段
  for (const field of STATE_VALIDATION_CONFIG.requiredFields) {
    const value = getNestedProperty(state, field);
    if (value === undefined || value === null) {
      errors.push(STATE_VALIDATION_CONFIG.errorMessages.missingField.replace('{field}', field));
    }
  }
  
  // 检查数据类型
  for (const [field, expectedType] of Object.entries(STATE_VALIDATION_CONFIG.fieldTypes)) {
    const value = getNestedProperty(state, field);
    if (value !== undefined && value !== null) {
      const actualType = typeof value;
      const expectedTypes = Array.isArray(expectedType) ? expectedType : [expectedType];
      
      if (!expectedTypes.includes(actualType as any)) {
        errors.push(
          STATE_VALIDATION_CONFIG.errorMessages.invalidType
            .replace('{field}', field)
            .replace('{expected}', expectedTypes.join(' 或 '))
            .replace('{actual}', actualType)
        );
      }
    }
  }
  
  // 检查数值范围
  const numericFields = [
    'basic.mood', 'basic.energy', 'basic.hunger', 'basic.health',
    'advanced.curiosity', 'advanced.socialDesire', 'advanced.creativity', 'advanced.focusLevel'
  ];
  
  for (const field of numericFields) {
    const value = getNestedProperty(state, field);
    if (typeof value === 'number') {
      const { minimum, maximum } = STATE_BOUNDARIES.globalBounds;
      if (value < minimum || value > maximum) {
        errors.push(
          STATE_VALIDATION_CONFIG.errorMessages.outOfRange
            .replace('{field}', field)
            .replace('{value}', value.toString())
            .replace('{min}', minimum.toString())
            .replace('{max}', maximum.toString())
        );
      }
    }
  }
  
  // 检查衰减率
  if (state.decayRates) {
    for (const [field, value] of Object.entries(state.decayRates)) {
      if (typeof value === 'number') {
        if (value < 0 || value > 10) {
          errors.push(
            STATE_VALIDATION_CONFIG.errorMessages.invalidDecayRate
              .replace('{field}', field)
              .replace('{value}', value.toString())
          );
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 边界检查函数
 * 确保状态值在有效范围内
 */
export function enforceStateBoundaries(state: any): any {
  const clampedState = JSON.parse(JSON.stringify(state));
  const { minimum, maximum } = STATE_BOUNDARIES.globalBounds;
  
  // 限制基础状态
  if (clampedState.basic) {
    for (const key of Object.keys(clampedState.basic)) {
      if (typeof clampedState.basic[key] === 'number') {
        clampedState.basic[key] = Math.max(minimum, Math.min(maximum, clampedState.basic[key]));
      }
    }
  }
  
  // 限制高级状态
  if (clampedState.advanced) {
    for (const key of Object.keys(clampedState.advanced)) {
      if (typeof clampedState.advanced[key] === 'number') {
        clampedState.advanced[key] = Math.max(minimum, Math.min(maximum, clampedState.advanced[key]));
      }
    }
  }
  
  return clampedState;
}

/**
 * 获取嵌套属性值的辅助函数
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => {
    return current && current[prop] !== undefined ? current[prop] : undefined;
  }, obj);
}

/**
 * 默认状态配置
 */
export const DEFAULT_STATE_CONFIG = {
  basic: {
    mood: 70,
    energy: 80,
    hunger: 60,
    health: 90
  },
  advanced: {
    curiosity: 65,
    socialDesire: 55,
    creativity: 60,
    focusLevel: 70
  },
  lastUpdate: null,
  autoDecayEnabled: true,
  decayRates: {
    hunger: 0.5,
    energy: 0.3,
    mood: 0.1
  }
} as const;