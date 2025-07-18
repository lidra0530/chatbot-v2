import { Injectable, Logger } from '@nestjs/common';

/**
 * 宠物状态接口定义
 */
export interface PetState {
  basic: {
    mood: number;        // 心情 (0-100)
    energy: number;      // 精力 (0-100)
    hunger: number;      // 饥饿 (0-100)
    health: number;      // 健康 (0-100)
  };
  advanced: {
    curiosity: number;     // 好奇心 (0-100)
    socialDesire: number;  // 社交欲望 (0-100)
    creativity: number;    // 创造力 (0-100)
    focusLevel: number;    // 专注度 (0-100)
  };
  lastUpdate: Date | null;
  autoDecayEnabled: boolean;
  decayRates: {
    hunger: number;      // 饥饿衰减率 (每小时)
    energy: number;      // 精力衰减率 (每小时)
    mood: number;        // 心情衰减率 (每小时)
  };
}

/**
 * 互动分析结果接口
 */
export interface InteractionAnalysis {
  type: 'positive' | 'negative' | 'neutral';
  intensity: number;     // 强度 (0-1)
  duration: number;      // 持续时间 (秒)
  effects: {
    mood?: number;       // 心情影响 (-10 to +10)
    energy?: number;     // 精力影响 (-10 to +10)
    hunger?: number;     // 饥饿影响 (-10 to +10)
    curiosity?: number;  // 好奇心影响 (-10 to +10)
    socialDesire?: number; // 社交欲望影响 (-10 to +10)
    creativity?: number;   // 创造力影响 (-10 to +10)
    focusLevel?: number;   // 专注度影响 (-10 to +10)
  };
}

/**
 * 提示词修饰符接口
 */
export interface PromptModifiers {
  moodModifier: string;
  energyModifier: string;
  behaviorModifier: string;
  personalityHints: string;
  fullPromptText: string;
}

/**
 * 状态驱动引擎
 * 负责将宠物状态映射到对话修饰符，处理状态衰减和基于互动的状态更新
 */
@Injectable()
export class StateDriverEngine {
  private readonly logger = new Logger(StateDriverEngine.name);

  constructor() {
    this.logger.log('StateDriverEngine initialized');
  }

  /**
   * 根据宠物当前状态生成提示词修饰符
   * @param currentState 当前宠物状态
   * @returns 提示词修饰符对象
   */
  generatePromptModifiers(currentState: PetState): PromptModifiers {
    this.logger.debug('Generating prompt modifiers for state');

    try {
      const { basic, advanced } = currentState;

      // 心情修饰符
      const moodModifier = this.generateMoodModifier(basic.mood);
      
      // 精力修饰符
      const energyModifier = this.generateEnergyModifier(basic.energy);
      
      // 行为修饰符
      const behaviorModifier = this.generateBehaviorModifier(basic, advanced);
      
      // 个性提示
      const personalityHints = this.generatePersonalityHints(advanced);
      
      // 完整提示词文本
      const fullPromptText = `${moodModifier} ${energyModifier} ${behaviorModifier} ${personalityHints}`.trim();

      return {
        moodModifier,
        energyModifier,
        behaviorModifier,
        personalityHints,
        fullPromptText
      };
    } catch (error) {
      this.logger.error('Error generating prompt modifiers:', error);
      return this.getDefaultPromptModifiers();
    }
  }

  /**
   * 计算状态自然衰减
   * @param currentState 当前状态
   * @param timeSinceLastUpdate 距离上次更新的时间（毫秒）
   * @returns 衰减后的状态
   */
  calculateStateDecay(currentState: PetState, timeSinceLastUpdate: number): PetState {
    this.logger.debug(`Calculating state decay for ${timeSinceLastUpdate}ms`);

    try {
      const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60); // 转换为小时
      
      if (!currentState.autoDecayEnabled || hoursElapsed <= 0) {
        return { ...currentState, lastUpdate: new Date() };
      }

      const newState = JSON.parse(JSON.stringify(currentState)) as PetState;
      const { decayRates } = currentState;

      // 应用基础状态衰减
      newState.basic.hunger = Math.min(100, currentState.basic.hunger + (decayRates.hunger * hoursElapsed));
      newState.basic.energy = Math.max(0, currentState.basic.energy - (decayRates.energy * hoursElapsed));
      newState.basic.mood = Math.max(0, currentState.basic.mood - (decayRates.mood * hoursElapsed));

      // 高级状态的轻微衰减（更慢）
      const advancedDecayRate = 0.05; // 每小时衰减0.05点
      newState.advanced.curiosity = Math.max(0, currentState.advanced.curiosity - (advancedDecayRate * hoursElapsed));
      newState.advanced.socialDesire = Math.max(0, currentState.advanced.socialDesire - (advancedDecayRate * hoursElapsed));
      newState.advanced.focusLevel = Math.max(0, currentState.advanced.focusLevel - (advancedDecayRate * hoursElapsed));

      // 更新时间戳
      newState.lastUpdate = new Date();

      this.logger.debug(`State decay applied: ${hoursElapsed.toFixed(2)} hours elapsed`);
      return newState;
    } catch (error) {
      this.logger.error('Error calculating state decay:', error);
      return { ...currentState, lastUpdate: new Date() };
    }
  }

  /**
   * 根据互动更新状态
   * @param currentState 当前状态
   * @param interactionAnalysis 互动分析结果
   * @returns 更新后的状态
   */
  updateStateFromInteraction(currentState: PetState, interactionAnalysis: InteractionAnalysis): PetState {
    this.logger.debug('Updating state from interaction');

    try {
      const newState = JSON.parse(JSON.stringify(currentState)) as PetState;
      const { effects, intensity } = interactionAnalysis;

      // 应用基础状态影响
      if (effects.mood !== undefined) {
        newState.basic.mood = this.clampValue(
          currentState.basic.mood + (effects.mood * intensity), 0, 100
        );
      }
      
      if (effects.energy !== undefined) {
        newState.basic.energy = this.clampValue(
          currentState.basic.energy + (effects.energy * intensity), 0, 100
        );
      }
      
      if (effects.hunger !== undefined) {
        newState.basic.hunger = this.clampValue(
          currentState.basic.hunger + (effects.hunger * intensity), 0, 100
        );
      }

      // 应用高级状态影响
      if (effects.curiosity !== undefined) {
        newState.advanced.curiosity = this.clampValue(
          currentState.advanced.curiosity + (effects.curiosity * intensity), 0, 100
        );
      }
      
      if (effects.socialDesire !== undefined) {
        newState.advanced.socialDesire = this.clampValue(
          currentState.advanced.socialDesire + (effects.socialDesire * intensity), 0, 100
        );
      }
      
      if (effects.creativity !== undefined) {
        newState.advanced.creativity = this.clampValue(
          currentState.advanced.creativity + (effects.creativity * intensity), 0, 100
        );
      }
      
      if (effects.focusLevel !== undefined) {
        newState.advanced.focusLevel = this.clampValue(
          currentState.advanced.focusLevel + (effects.focusLevel * intensity), 0, 100
        );
      }

      // 更新时间戳
      newState.lastUpdate = new Date();

      this.logger.debug(`State updated from ${interactionAnalysis.type} interaction with intensity ${intensity}`);
      return newState;
    } catch (error) {
      this.logger.error('Error updating state from interaction:', error);
      return { ...currentState, lastUpdate: new Date() };
    }
  }

  /**
   * 生成心情修饰符
   */
  private generateMoodModifier(mood: number): string {
    if (mood >= 80) return "你现在心情非常好，充满活力和乐观。";
    if (mood >= 60) return "你现在心情不错，感觉比较愉快。";
    if (mood >= 40) return "你现在心情一般，情绪比较平稳。";
    if (mood >= 20) return "你现在心情有些低落，需要一些鼓励。";
    return "你现在心情很糟糕，感觉沮丧和疲惫。";
  }

  /**
   * 生成精力修饰符
   */
  private generateEnergyModifier(energy: number): string {
    if (energy >= 80) return "你精力充沛，充满活力。";
    if (energy >= 60) return "你精力不错，可以进行各种活动。";
    if (energy >= 40) return "你精力一般，适合轻松的互动。";
    if (energy >= 20) return "你感觉有些疲惫，需要休息。";
    return "你非常疲惫，几乎没有精力。";
  }

  /**
   * 生成行为修饰符
   */
  private generateBehaviorModifier(basic: PetState['basic'], advanced: PetState['advanced']): string {
    const behaviors: string[] = [];

    if (basic.hunger > 70) behaviors.push("你感觉饿了，可能会提到食物相关的话题");
    if (advanced.curiosity > 70) behaviors.push("你充满好奇心，喜欢探索新话题");
    if (advanced.socialDesire > 70) behaviors.push("你很渴望社交，主动参与对话");
    if (advanced.creativity > 70) behaviors.push("你创意十足，善于想象和创造");
    if (advanced.focusLevel < 30) behaviors.push("你注意力不太集中，可能会有些分散");

    return behaviors.length > 0 ? behaviors.join("，") + "。" : "";
  }

  /**
   * 生成个性提示
   */
  private generatePersonalityHints(advanced: PetState['advanced']): string {
    const hints: string[] = [];

    if (advanced.curiosity > 60) hints.push("保持好奇和探索精神");
    if (advanced.socialDesire > 60) hints.push("展现友好和社交性");
    if (advanced.creativity > 60) hints.push("发挥创造力和想象力");
    if (advanced.focusLevel > 70) hints.push("展现专注和认真的态度");

    return hints.length > 0 ? `尽量${hints.join("，")}。` : "";
  }

  /**
   * 获取默认提示词修饰符
   */
  private getDefaultPromptModifiers(): PromptModifiers {
    return {
      moodModifier: "你现在心情平稳。",
      energyModifier: "你精力正常。",
      behaviorModifier: "",
      personalityHints: "",
      fullPromptText: "你现在心情平稳。你精力正常。"
    };
  }

  /**
   * 限制数值在指定范围内
   */
  private clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}