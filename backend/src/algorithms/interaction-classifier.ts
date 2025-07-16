/**
 * 互动事件捕获和分类系统
 * 分析用户互动并将其转换为演化事件，支持实时分析和元数据提取
 */

import {
  EvolutionEvent,
  InteractionType,
  InteractionMode,
  EngagementLevel,
  InteractionMetadata,
} from './types/personality.types';

/**
 * 原始互动数据接口 - 从聊天系统获取的原始数据
 */
export interface RawInteractionData {
  id: string;                           // 互动ID
  petId: string;                        // 宠物ID
  userId: string;                       // 用户ID
  conversationId: string;               // 会话ID
  timestamp: Date;                      // 时间戳
  
  // 消息相关
  userMessage: string;                  // 用户消息
  botResponse: string;                  // 机器人回复
  messageCount: number;                 // 消息数量
  averageMessageLength: number;         // 平均消息长度
  
  // 时间相关
  responseTime: number;                 // 响应时间 (毫秒)
  sessionDuration: number;              // 会话持续时间 (秒)
  timeSinceLastInteraction: number;     // 距离上次互动的时间 (秒)
  
  // 上下文相关
  conversationHistory: string[];        // 会话历史
  topicKeywords: string[];              // 话题关键词
  emotionIndicators: string[];          // 情感指标
  
  // 用户行为
  userInitiated: boolean;               // 是否用户主动发起
  feedbackProvided: boolean;            // 是否提供反馈
  specialActions: string[];             // 特殊动作 (如点赞、分享等)
  
  // 系统状态
  systemLoad: number;                   // 系统负载
  apiLatency: number;                   // API延迟
  errorOccurred: boolean;               // 是否发生错误
}

/**
 * 分类配置接口
 */
export interface ClassificationConfig {
  // 互动类型检测配置
  typeDetection: {
    keywordWeights: Record<string, InteractionType>;
    contextPatterns: Record<string, InteractionType>;
    defaultType: InteractionType;
  };
  
  // 深度评估配置
  depthEvaluation: {
    messageLength: {
      short: number;                    // 短消息阈值
      medium: number;                   // 中等消息阈值
      long: number;                     // 长消息阈值
    };
    complexityIndicators: string[];     // 复杂度指标关键词
    topicSwitchPenalty: number;         // 话题切换惩罚
  };
  
  // 参与度评估配置
  engagementEvaluation: {
    responseTime: {
      fast: number;                     // 快速响应阈值 (毫秒)
      normal: number;                   // 正常响应阈值
      slow: number;                     // 慢速响应阈值
    };
    sessionDuration: {
      short: number;                    // 短会话阈值 (秒)
      medium: number;                   // 中等会话阈值
      long: number;                     // 长会话阈值
    };
    frequencyBonus: number;             // 频率奖励系数
  };
  
  // 情感分析配置
  emotionAnalysis: {
    positiveKeywords: string[];         // 积极关键词
    negativeKeywords: string[];         // 消极关键词
    neutralKeywords: string[];          // 中性关键词
    intensityMultipliers: Record<string, number>; // 强度修正器
  };
}

/**
 * 互动分类器主类
 */
export class InteractionClassifier {
  private readonly config: ClassificationConfig;
  private readonly processingStats: {
    totalClassified: number;
    averageProcessingTime: number;
    typeAccuracy: number;
    errorRate: number;
  };

  constructor(customConfig?: Partial<ClassificationConfig>) {
    this.config = this.mergeWithDefaultConfig(customConfig || {});
    this.processingStats = {
      totalClassified: 0,
      averageProcessingTime: 0,
      typeAccuracy: 0.95, // 初始准确率
      errorRate: 0.05,
    };
  }

  /**
   * 分析用户互动并分类
   * 主要入口方法，处理原始互动数据并返回分类结果
   */
  public async analyzeInteraction(rawData: RawInteractionData): Promise<{
    interactionType: InteractionType;
    interactionMode: InteractionMode;
    engagementLevel: EngagementLevel;
    topicComplexity: number;
    emotionalIntensity: number;
    confidence: number;
    metadata: InteractionMetadata;
  }> {
    const startTime = Date.now();

    try {
      // 1. 检测互动类型
      const interactionType = this.detectInteractionType(rawData);
      
      // 2. 评估互动模式
      const interactionMode = this.evaluateInteractionMode(rawData);
      
      // 3. 计算参与度等级
      const engagementLevel = this.calculateEngagementLevel(rawData);
      
      // 4. 分析话题复杂度
      const topicComplexity = this.analyzeTopicComplexity(rawData);
      
      // 5. 评估情感强度
      const emotionalIntensity = this.evaluateEmotionalIntensity(rawData);
      
      // 6. 生成元数据
      const metadata = this.generateMetadata(rawData);
      
      // 7. 计算分类置信度
      const confidence = this.calculateClassificationConfidence(
        rawData,
        interactionType,
        interactionMode,
        engagementLevel,
      );

      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);

      return {
        interactionType,
        interactionMode,
        engagementLevel,
        topicComplexity,
        emotionalIntensity,
        confidence,
        metadata,
      };

    } catch (error) {
      this.processingStats.errorRate += 0.01;
      throw new Error(`互动分类失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 实现互动深度评估算法
   * 基于消息长度、话题复杂度、上下文连贯性等因素
   */
  public evaluateInteractionDepth(rawData: RawInteractionData): number {
    let depth = 0;
    const config = this.config.depthEvaluation;
    
    // 1. 基于消息长度评估
    const messageLength = rawData.averageMessageLength;
    if (messageLength >= config.messageLength.long) {
      depth += 0.4;
    } else if (messageLength >= config.messageLength.medium) {
      depth += 0.25;
    } else if (messageLength >= config.messageLength.short) {
      depth += 0.1;
    }
    
    // 2. 基于话题复杂度
    const complexityScore = this.analyzeTopicComplexity(rawData);
    depth += complexityScore * 0.3;
    
    // 3. 基于上下文连贯性
    const contextCoherence = this.evaluateContextCoherence(rawData);
    depth += contextCoherence * 0.2;
    
    // 4. 基于多轮对话分析
    const conversationTurns = rawData.conversationHistory.length;
    const turnBonus = Math.min(conversationTurns / 20, 0.1); // 最多10%奖励
    depth += turnBonus;
    
    // 5. 话题切换惩罚
    const topicSwitches = this.countTopicSwitches(rawData);
    const switchPenalty = topicSwitches * config.topicSwitchPenalty;
    depth = Math.max(0, depth - switchPenalty);
    
    return Math.min(depth, 1.0);
  }

  /**
   * 实现用户参与度评估算法
   * 基于响应时间、互动频率、消息质量等因素
   */
  public evaluateUserEngagement(rawData: RawInteractionData): EngagementLevel {
    let engagementScore = 0;
    const config = this.config.engagementEvaluation;
    
    // 1. 响应时间分析
    const responseTime = rawData.responseTime;
    if (responseTime <= config.responseTime.fast) {
      engagementScore += 0.3; // 快速响应表示高参与度
    } else if (responseTime <= config.responseTime.normal) {
      engagementScore += 0.2;
    } else if (responseTime <= config.responseTime.slow) {
      engagementScore += 0.1;
    }
    
    // 2. 会话持续时间
    const sessionDuration = rawData.sessionDuration;
    if (sessionDuration >= config.sessionDuration.long) {
      engagementScore += 0.25;
    } else if (sessionDuration >= config.sessionDuration.medium) {
      engagementScore += 0.15;
    } else if (sessionDuration >= config.sessionDuration.short) {
      engagementScore += 0.1;
    }
    
    // 3. 消息质量分析
    const messageQuality = this.analyzeMessageQuality(rawData);
    engagementScore += messageQuality * 0.2;
    
    // 4. 主动性评估
    if (rawData.userInitiated) {
      engagementScore += 0.15;
    }
    
    // 5. 反馈提供
    if (rawData.feedbackProvided) {
      engagementScore += 0.1;
    }
    
    // 6. 特殊动作奖励
    const specialActionsBonus = rawData.specialActions.length * 0.05;
    engagementScore += Math.min(specialActionsBonus, 0.1);
    
    // 7. 频率奖励
    const frequencyBonus = this.calculateFrequencyBonus(rawData);
    engagementScore += frequencyBonus;
    
    // 转换为参与度等级
    if (engagementScore >= 0.75) {
      return EngagementLevel.INTENSE;
    } else if (engagementScore >= 0.5) {
      return EngagementLevel.HIGH;
    } else if (engagementScore >= 0.25) {
      return EngagementLevel.MEDIUM;
    } else {
      return EngagementLevel.LOW;
    }
  }

  /**
   * 将原始互动转换为演化事件
   * 整合所有分析结果，生成标准化的演化事件对象
   */
  public async convertToEvolutionEvent(
    rawData: RawInteractionData,
    userSatisfaction?: number,
  ): Promise<EvolutionEvent> {
    // 执行完整的互动分析
    const analysis = await this.analyzeInteraction(rawData);
    
    // 生成演化事件
    const evolutionEvent: EvolutionEvent = {
      id: `evolution_${rawData.id}_${Date.now()}`,
      petId: rawData.petId,
      userId: rawData.userId,
      interactionType: analysis.interactionType,
      interactionMode: analysis.interactionMode,
      engagementLevel: analysis.engagementLevel,
      duration: rawData.sessionDuration,
      messageCount: rawData.messageCount,
      topicComplexity: analysis.topicComplexity,
      emotionalIntensity: analysis.emotionalIntensity,
      userSatisfaction: userSatisfaction,
      metadata: analysis.metadata,
      timestamp: rawData.timestamp,
    };
    
    // 验证生成的事件
    this.validateEvolutionEvent(evolutionEvent);
    
    return evolutionEvent;
  }

  /**
   * 批量处理互动数据
   * 支持批量转换多个原始互动为演化事件
   */
  public async batchConvertToEvolutionEvents(
    rawDataArray: RawInteractionData[],
    userSatisfactions?: number[],
  ): Promise<EvolutionEvent[]> {
    const events: EvolutionEvent[] = [];
    
    for (let i = 0; i < rawDataArray.length; i++) {
      const rawData = rawDataArray[i];
      const satisfaction = userSatisfactions?.[i];
      
      try {
        const event = await this.convertToEvolutionEvent(rawData, satisfaction);
        events.push(event);
      } catch (error) {
        console.error(`转换互动事件失败 (ID: ${rawData.id}):`, error);
        // 继续处理其他事件，不中断批处理
      }
    }
    
    return events;
  }

  // 私有方法实现...

  private detectInteractionType(rawData: RawInteractionData): InteractionType {
    const keywords = rawData.topicKeywords;
    const message = rawData.userMessage.toLowerCase();
    const config = this.config.typeDetection;
    
    // 基于关键词匹配
    for (const [keyword, type] of Object.entries(config.keywordWeights)) {
      if (keywords.includes(keyword.toLowerCase()) || message.includes(keyword.toLowerCase())) {
        return type;
      }
    }
    
    // 基于上下文模式匹配
    for (const [pattern, type] of Object.entries(config.contextPatterns)) {
      if (message.includes(pattern.toLowerCase())) {
        return type;
      }
    }
    
    // 基于消息长度和复杂度推断
    if (rawData.averageMessageLength > 200 && rawData.topicKeywords.length > 3) {
      return InteractionType.DEEP_CONVERSATION;
    }
    
    if (rawData.emotionIndicators.some(indicator => 
      ['sad', 'upset', 'worried', 'anxious'].includes(indicator)
    )) {
      return InteractionType.EMOTIONAL_SUPPORT;
    }
    
    if (rawData.topicKeywords.some(keyword => 
      ['learn', 'study', 'explain', 'understand'].includes(keyword)
    )) {
      return InteractionType.LEARNING;
    }
    
    return config.defaultType;
  }

  private evaluateInteractionMode(rawData: RawInteractionData): InteractionMode {
    const duration = rawData.sessionDuration;
    
    if (duration < 120) { // 2分钟
      return InteractionMode.QUICK;
    } else if (duration < 600) { // 10分钟
      return InteractionMode.NORMAL;
    } else if (duration < 1800) { // 30分钟
      return InteractionMode.EXTENDED;
    } else {
      return InteractionMode.DEEP;
    }
  }

  private calculateEngagementLevel(rawData: RawInteractionData): EngagementLevel {
    return this.evaluateUserEngagement(rawData);
  }

  private analyzeTopicComplexity(rawData: RawInteractionData): number {
    const config = this.config.depthEvaluation;
    let complexity = 0;
    
    // 基于关键词多样性
    const keywordDiversity = rawData.topicKeywords.length / 10; // 假设最多10个关键词
    complexity += Math.min(keywordDiversity, 0.3);
    
    // 基于复杂度指标
    const message = rawData.userMessage.toLowerCase();
    const complexityIndicators = config.complexityIndicators.filter(indicator => 
      message.includes(indicator.toLowerCase())
    );
    complexity += (complexityIndicators.length / config.complexityIndicators.length) * 0.4;
    
    // 基于消息长度
    const lengthComplexity = Math.min(rawData.averageMessageLength / 500, 0.3);
    complexity += lengthComplexity;
    
    return Math.min(complexity, 1.0);
  }

  private evaluateEmotionalIntensity(rawData: RawInteractionData): number {
    const config = this.config.emotionAnalysis;
    let intensity = 0;
    
    const message = rawData.userMessage.toLowerCase();
    const emotions = rawData.emotionIndicators;
    
    // 基于情感关键词
    const positiveCount = config.positiveKeywords.filter(keyword => 
      message.includes(keyword) || emotions.includes(keyword)
    ).length;
    
    const negativeCount = config.negativeKeywords.filter(keyword => 
      message.includes(keyword) || emotions.includes(keyword)
    ).length;
    
    const neutralCount = config.neutralKeywords.filter(keyword => 
      message.includes(keyword) || emotions.includes(keyword)
    ).length;
    
    // 计算情感强度
    const emotionalWords = positiveCount + negativeCount + neutralCount;
    const baseIntensity = emotionalWords / (emotionalWords + 10); // 标准化
    
    // 应用强度修正器
    let multiplier = 1.0;
    for (const [keyword, mult] of Object.entries(config.intensityMultipliers)) {
      if (message.includes(keyword.toLowerCase())) {
        multiplier *= mult;
      }
    }
    
    intensity = baseIntensity * multiplier;
    
    return Math.min(intensity, 1.0);
  }

  private generateMetadata(rawData: RawInteractionData): InteractionMetadata {
    return {
      messageLength: rawData.averageMessageLength,
      responseTime: rawData.responseTime,
      topicTags: rawData.topicKeywords,
      moodIndicators: rawData.emotionIndicators,
      skillsUsed: this.extractSkillsUsed(rawData),
      contextSwitches: this.countTopicSwitches(rawData),
      userInitiated: rawData.userInitiated,
      feedbackGiven: rawData.feedbackProvided,
      specialEvents: rawData.specialActions,
    };
  }

  private calculateClassificationConfidence(
    rawData: RawInteractionData,
    interactionType: InteractionType,
    interactionMode: InteractionMode,
    engagementLevel: EngagementLevel,
  ): number {
    let confidence = 0.7; // 基础置信度
    
    // 基于数据质量
    const dataQuality = this.assessDataQuality(rawData);
    confidence += dataQuality * 0.2;
    
    // 基于分类一致性
    const consistency = this.checkClassificationConsistency(
      rawData,
      interactionType,
      interactionMode,
      engagementLevel,
    );
    confidence += consistency * 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private evaluateContextCoherence(rawData: RawInteractionData): number {
    const history = rawData.conversationHistory;
    if (history.length < 2) return 0.5;
    
    // 简化的上下文连贯性评估
    const keywords = rawData.topicKeywords;
    let coherenceScore = 0;
    
    // 检查关键词在历史中的出现频率
    for (const keyword of keywords) {
      const frequency = history.filter(msg => 
        msg.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      coherenceScore += frequency / history.length;
    }
    
    return Math.min(coherenceScore / keywords.length, 1.0);
  }

  private countTopicSwitches(rawData: RawInteractionData): number {
    const history = rawData.conversationHistory;
    const keywords = rawData.topicKeywords;
    
    if (history.length < 2) return 0;
    
    let switches = 0;
    let currentTopics = new Set<string>();
    
    for (const message of history) {
      const messageTopics = new Set(
        keywords.filter(keyword => 
          message.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      if (currentTopics.size > 0) {
        const intersection = new Set([...currentTopics].filter(x => messageTopics.has(x)));
        if (intersection.size === 0) {
          switches++;
        }
      }
      
      currentTopics = messageTopics;
    }
    
    return switches;
  }

  private analyzeMessageQuality(rawData: RawInteractionData): number {
    const message = rawData.userMessage;
    let quality = 0;
    
    // 基于消息长度
    if (message.length > 50) quality += 0.3;
    if (message.length > 100) quality += 0.2;
    
    // 基于问号数量 (表示参与度)
    const questionMarks = (message.match(/\?/g) || []).length;
    quality += Math.min(questionMarks * 0.1, 0.2);
    
    // 基于感叹号数量 (表示情感强度)
    const exclamationMarks = (message.match(/!/g) || []).length;
    quality += Math.min(exclamationMarks * 0.05, 0.1);
    
    // 基于关键词多样性
    quality += Math.min(rawData.topicKeywords.length * 0.05, 0.2);
    
    return Math.min(quality, 1.0);
  }

  private calculateFrequencyBonus(rawData: RawInteractionData): number {
    const timeSinceLastInteraction = rawData.timeSinceLastInteraction;
    const config = this.config.engagementEvaluation;
    
    // 频率越高奖励越大
    if (timeSinceLastInteraction < 300) { // 5分钟内
      return config.frequencyBonus * 0.3;
    } else if (timeSinceLastInteraction < 1800) { // 30分钟内
      return config.frequencyBonus * 0.2;
    } else if (timeSinceLastInteraction < 3600) { // 1小时内
      return config.frequencyBonus * 0.1;
    }
    
    return 0;
  }

  private extractSkillsUsed(rawData: RawInteractionData): string[] {
    const skills: string[] = [];
    const message = rawData.userMessage.toLowerCase();
    
    // 基于关键词推断使用的技能
    const skillKeywords = {
      'creativity': ['create', 'imagine', 'design', 'art', 'story'],
      'problem-solving': ['solve', 'fix', 'debug', 'analyze', 'troubleshoot'],
      'learning': ['learn', 'study', 'understand', 'explain', 'teach'],
      'communication': ['talk', 'discuss', 'chat', 'conversation', 'express'],
      'empathy': ['feel', 'emotion', 'understand', 'support', 'comfort'],
    };
    
    for (const [skill, keywords] of Object.entries(skillKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        skills.push(skill);
      }
    }
    
    return skills;
  }

  private assessDataQuality(rawData: RawInteractionData): number {
    let quality = 0;
    
    // 检查必要字段
    if (rawData.userMessage && rawData.userMessage.length > 0) quality += 0.2;
    if (rawData.botResponse && rawData.botResponse.length > 0) quality += 0.2;
    if (rawData.topicKeywords && rawData.topicKeywords.length > 0) quality += 0.2;
    if (rawData.emotionIndicators && rawData.emotionIndicators.length > 0) quality += 0.2;
    if (rawData.conversationHistory && rawData.conversationHistory.length > 0) quality += 0.2;
    
    return quality;
  }

  private checkClassificationConsistency(
    rawData: RawInteractionData,
    interactionType: InteractionType,
    interactionMode: InteractionMode,
    engagementLevel: EngagementLevel,
  ): number {
    // 检查分类结果之间的一致性
    let consistency = 0;
    
    // 长时间深度对话应该有高参与度
    if (interactionMode === InteractionMode.DEEP && engagementLevel === EngagementLevel.INTENSE) {
      consistency += 0.3;
    }
    
    // 情感支持类型应该有较高的情感强度
    if (interactionType === InteractionType.EMOTIONAL_SUPPORT) {
      const emotionalIntensity = this.evaluateEmotionalIntensity(rawData);
      if (emotionalIntensity > 0.5) consistency += 0.3;
    }
    
    // 学习类型应该有较高的话题复杂度
    if (interactionType === InteractionType.LEARNING) {
      const topicComplexity = this.analyzeTopicComplexity(rawData);
      if (topicComplexity > 0.5) consistency += 0.3;
    }
    
    return Math.min(consistency, 1.0);
  }

  private validateEvolutionEvent(event: EvolutionEvent): void {
    if (!event.id || !event.petId || !event.userId) {
      throw new Error('演化事件缺少必要的ID字段');
    }
    
    if (event.topicComplexity < 0 || event.topicComplexity > 1) {
      throw new Error('话题复杂度必须在0-1之间');
    }
    
    if (event.emotionalIntensity < 0 || event.emotionalIntensity > 1) {
      throw new Error('情感强度必须在0-1之间');
    }
    
    if (event.userSatisfaction !== undefined && 
        (event.userSatisfaction < 0 || event.userSatisfaction > 1)) {
      throw new Error('用户满意度必须在0-1之间');
    }
  }

  private updateProcessingStats(processingTime: number): void {
    this.processingStats.totalClassified++;
    this.processingStats.averageProcessingTime = (
      this.processingStats.averageProcessingTime * 0.9 + processingTime * 0.1
    );
  }

  private mergeWithDefaultConfig(customConfig: Partial<ClassificationConfig>): ClassificationConfig {
    const defaultConfig: ClassificationConfig = {
      typeDetection: {
        keywordWeights: {
          'help': InteractionType.EMOTIONAL_SUPPORT,
          'learn': InteractionType.LEARNING,
          'create': InteractionType.CREATIVE_WORK,
          'solve': InteractionType.PROBLEM_SOLVING,
          'fun': InteractionType.ENTERTAINMENT,
          'deep': InteractionType.DEEP_CONVERSATION,
          'practice': InteractionType.SKILL_PRACTICE,
          'story': InteractionType.STORYTELLING,
        },
        contextPatterns: {
          'how to': InteractionType.LEARNING,
          'what if': InteractionType.CREATIVE_WORK,
          'i feel': InteractionType.EMOTIONAL_SUPPORT,
          'let\'s play': InteractionType.ENTERTAINMENT,
        },
        defaultType: InteractionType.CASUAL_CHAT,
      },
      depthEvaluation: {
        messageLength: { short: 50, medium: 150, long: 300 },
        complexityIndicators: ['because', 'however', 'therefore', 'complex', 'analyze'],
        topicSwitchPenalty: 0.1,
      },
      engagementEvaluation: {
        responseTime: { fast: 5000, normal: 15000, slow: 30000 },
        sessionDuration: { short: 120, medium: 600, long: 1800 },
        frequencyBonus: 0.2,
      },
      emotionAnalysis: {
        positiveKeywords: ['happy', 'excited', 'great', 'love', 'amazing'],
        negativeKeywords: ['sad', 'angry', 'upset', 'disappointed', 'frustrated'],
        neutralKeywords: ['okay', 'fine', 'normal', 'regular', 'usual'],
        intensityMultipliers: {
          'very': 1.5,
          'extremely': 2.0,
          'quite': 1.2,
          'really': 1.3,
        },
      },
    };

    return {
      ...defaultConfig,
      ...customConfig,
      typeDetection: { ...defaultConfig.typeDetection, ...customConfig.typeDetection },
      depthEvaluation: { ...defaultConfig.depthEvaluation, ...customConfig.depthEvaluation },
      engagementEvaluation: { ...defaultConfig.engagementEvaluation, ...customConfig.engagementEvaluation },
      emotionAnalysis: { ...defaultConfig.emotionAnalysis, ...customConfig.emotionAnalysis },
    };
  }

  // 公共方法：获取处理统计信息
  public getProcessingStats() {
    return { ...this.processingStats };
  }

  // 公共方法：获取配置信息
  public getConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }

  // 公共方法：更新配置
  public updateConfig(newConfig: Partial<ClassificationConfig>): void {
    Object.assign(this.config, newConfig);
  }
}