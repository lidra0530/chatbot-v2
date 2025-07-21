import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { StateDriverEngine, PetState, InteractionAnalysis } from '../../algorithms/state-driver';
import {
  DEFAULT_STATE_CONFIG,
  validateStateObject,
  enforceStateBoundaries
} from '../../config/state-mappings.config';
import { StateUpdateDto, StateInteractionDto, StateHistoryDto, StateUpdateTrigger } from './dto';
import { StatePersistenceService } from './services/state-persistence.service';
import { RealtimeEventsService } from '../../gateways/services/realtime-events.service';

/**
 * 状态系统服务类
 * 负责宠物状态的获取、更新、历史记录和自动衰减
 */
@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);
  private readonly stateEngine: StateDriverEngine;

  constructor(
    private prisma: PrismaService,
    private persistenceService: StatePersistenceService,
    private realtimeEvents: RealtimeEventsService
  ) {
    this.stateEngine = new StateDriverEngine();
    this.logger.log('StateService initialized with realtime events');
  }

  /**
   * 步骤139: 获取宠物当前状态
   * @param petId 宠物ID
   * @returns 当前宠物状态
   */
  async getCurrentState(petId: string): Promise<PetState> {
    this.logger.debug(`Getting current state for pet: ${petId}`);

    try {
      // 步骤157: 首先尝试从缓存获取
      const cachedState = await this.persistenceService.getCachedState(petId);
      if (cachedState) {
        this.logger.debug(`Using cached state for pet: ${petId}`);
        return cachedState;
      }

      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        select: { 
          id: true,
          currentState: true,
          updatedAt: true
        }
      });

      if (!pet) {
        throw new NotFoundException(`Pet with ID ${petId} not found`);
      }

      // 解析当前状态JSON
      const currentState = pet.currentState as any;
      
      // 验证状态对象
      const validation = validateStateObject(currentState);
      if (!validation.isValid) {
        this.logger.warn(`Invalid state detected for pet ${petId}:`, validation.errors);
        // 使用默认状态
        const defaultState = {
          ...DEFAULT_STATE_CONFIG,
          lastUpdate: new Date()
        };
        await this.updatePetStateInDatabase(petId, defaultState);
        await this.persistenceService.updateStateCache(petId, defaultState as PetState);
        return defaultState as PetState;
      }

      // 检查是否需要应用时间衰减
      const lastUpdate = currentState.lastUpdate ? new Date(currentState.lastUpdate) : new Date();
      const timeSinceLastUpdate = Date.now() - lastUpdate.getTime();
      
      if (timeSinceLastUpdate > 300000) { // 5分钟
        const decayedState = this.stateEngine.calculateStateDecay(currentState, timeSinceLastUpdate);
        await this.updatePetStateInDatabase(petId, decayedState);
        await this.persistenceService.updateStateCache(petId, decayedState);
        return decayedState;
      }

      // 更新缓存
      await this.persistenceService.updateStateCache(petId, currentState as PetState);
      return currentState as PetState;
    } catch (error) {
      this.logger.error(`Error getting current state for pet ${petId}:`, error);
      throw error;
    }
  }

  /**
   * 步骤140: 更新宠物状态
   * @param petId 宠物ID
   * @param stateUpdate 状态更新数据
   * @returns 更新后的状态
   */
  async updatePetState(petId: string, stateUpdate: StateUpdateDto, userId?: string): Promise<PetState> {
    this.logger.debug(`Updating state for pet: ${petId}`);

    try {
      const currentState = await this.getCurrentState(petId);
      
      // 应用状态变化
      const newState = this.applyStateChanges(currentState, stateUpdate);
      
      // 强制执行边界检查
      const boundedState = enforceStateBoundaries(newState);
      boundedState.lastUpdate = new Date();
      
      // 保存到数据库
      await this.updatePetStateInDatabase(petId, boundedState);
      
      // 步骤154: 使用持久化服务记录状态历史
      await this.persistenceService.recordStateChange(
        petId, 
        currentState, 
        boundedState, 
        stateUpdate.trigger, 
        stateUpdate.reason
      );
      
      // 步骤243: 在状态变化时发送实时通知
      if (userId) {
        await this.checkAndSendStateMilestones(petId, userId, currentState, boundedState, stateUpdate.trigger);
      }
      
      this.logger.debug(`State updated successfully for pet ${petId}`);
      return boundedState as PetState;
    } catch (error) {
      this.logger.error(`Error updating state for pet ${petId}:`, error);
      throw error;
    }
  }

  /**
   * 步骤141: 处理状态交互
   * @param petId 宠物ID
   * @param interactionData 交互数据
   * @returns 处理后的状态
   */
  async processStateInteraction(petId: string, interactionData: StateInteractionDto, userId?: string): Promise<PetState> {
    this.logger.debug(`Processing state interaction for pet: ${petId}`);

    try {
      const currentState = await this.getCurrentState(petId);
      
      // 转换交互数据为分析格式
      const interactionAnalysis: InteractionAnalysis = {
        type: this.mapInteractionType(interactionData.interactionType),
        intensity: interactionData.intensity / 10, // 转换为0-1范围
        duration: (interactionData.duration || 5) * 60, // 转换为秒
        effects: this.calculateInteractionEffects(interactionData)
      };
      
      // 使用状态引擎处理交互
      const updatedState = this.stateEngine.updateStateFromInteraction(currentState, interactionAnalysis);
      
      // 强制执行边界检查
      const boundedState = enforceStateBoundaries(updatedState);
      
      // 保存到数据库
      await this.updatePetStateInDatabase(petId, boundedState);
      
      // 步骤154: 使用持久化服务记录状态历史
      await this.persistenceService.recordStateChange(
        petId, 
        currentState, 
        boundedState, 
        StateUpdateTrigger.INTERACTION,
        `${interactionData.interactionType} interaction (intensity: ${interactionData.intensity})`,
        { 
          interactionType: interactionData.interactionType,
          intensity: interactionData.intensity,
          duration: interactionData.duration 
        }
      );
      
      // 步骤243: 在状态变化时发送实时通知
      if (userId) {
        await this.checkAndSendStateMilestones(petId, userId, currentState, boundedState, StateUpdateTrigger.INTERACTION);
      }
      
      this.logger.debug(`State interaction processed for pet ${petId}`);
      return boundedState;
    } catch (error) {
      this.logger.error(`Error processing state interaction for pet ${petId}:`, error);
      throw error;
    }
  }

  /**
   * 步骤142: 获取状态历史
   * @param petId 宠物ID
   * @param limit 返回记录数限制
   * @returns 状态历史记录
   */
  async getStateHistory(petId: string, limit: number = 50): Promise<StateHistoryDto[]> {
    this.logger.debug(`Getting state history for pet: ${petId}`);

    try {
      // 步骤155: 使用优化的状态历史查询
      const optimizedHistory = await this.persistenceService.getOptimizedStateHistory(petId, {
        limit,
        includeAnalysis: true
      });

      // 转换为DTO格式
      return optimizedHistory.map(record => ({
        id: record.id,
        petId: petId,
        previousState: record.analysis?.beforeSnapshot || {},
        newState: record.analysis?.afterSnapshot || {},
        stateChanges: record.changes || {},
        trigger: this.mapTriggerFromDescription(record.trigger || ''),
        reason: record.description,
        updatedAt: record.timestamp,
        context: record.analysis || {}
      }));
    } catch (error) {
      this.logger.error(`Error getting state history for pet ${petId}:`, error);
      throw error;
    }
  }

  /**
   * 步骤143: 状态自动衰减的定时任务
   * 每30分钟执行一次状态衰减检查
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleStateDecay(): Promise<void> {
    this.logger.debug('Starting automatic state decay process');

    try {
      // 获取所有活跃的宠物
      const activePets = await this.prisma.pet.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          currentState: true,
          updatedAt: true
        }
      });

      this.logger.log(`Processing state decay for ${activePets.length} active pets`);

      // 准备批量更新数据
      const batchUpdates: Array<{
        petId: string;
        previousState: any;
        newState: any;
        trigger: StateUpdateTrigger;
        reason?: string;
      }> = [];

      for (const pet of activePets) {
        try {
          const currentState = pet.currentState as any;
          const lastUpdate = currentState.lastUpdate ? new Date(currentState.lastUpdate) : pet.updatedAt;
          const timeSinceLastUpdate = Date.now() - lastUpdate.getTime();

          // 只对超过30分钟未更新的宠物应用衰减
          if (timeSinceLastUpdate > 1800000) { // 30分钟
            const decayedState = this.stateEngine.calculateStateDecay(currentState, timeSinceLastUpdate);
            const boundedState = enforceStateBoundaries(decayedState);
            
            // 更新数据库
            await this.updatePetStateInDatabase(pet.id, boundedState);
            
            // 添加到批量更新列表
            batchUpdates.push({
              petId: pet.id,
              previousState: currentState,
              newState: boundedState,
              trigger: StateUpdateTrigger.TIME_DECAY,
              reason: `Automatic state decay after ${Math.round(timeSinceLastUpdate / 60000)} minutes`
            });
          }
        } catch (error) {
          this.logger.error(`Error processing decay for pet ${pet.id}:`, error);
        }
      }

      // 执行批量状态历史记录
      if (batchUpdates.length > 0) {
        try {
          await this.persistenceService.batchUpdateStates(batchUpdates);
        } catch (error) {
          this.logger.error('Error in batch state history recording:', error);
        }
      }

      const processedCount = batchUpdates.length;

      this.logger.log(`State decay completed. Processed: ${processedCount}`);
    } catch (error) {
      this.logger.error('Error in automatic state decay process:', error);
    }
  }

  // 私有辅助方法

  private async updatePetStateInDatabase(petId: string, state: any): Promise<void> {
    await this.prisma.pet.update({
      where: { id: petId },
      data: {
        currentState: state,
        updatedAt: new Date()
      }
    });
  }


  private applyStateChanges(currentState: PetState, update: StateUpdateDto): any {
    const newState = JSON.parse(JSON.stringify(currentState));
    
    // 应用基础状态变化
    if (update.hungerChange !== undefined) {
      newState.basic.hunger = Math.max(0, Math.min(100, currentState.basic.hunger + update.hungerChange));
    }
    
    // 这里使用映射逻辑将旧DTO字段映射到新状态结构
    // 注意：这里需要根据实际的DTO和状态结构进行适配
    
    return newState;
  }

  private mapInteractionType(interactionType: string): 'positive' | 'negative' | 'neutral' {
    const positiveTypes = ['feeding', 'playing', 'conversation', 'learning', 'achievement'];
    const negativeTypes = ['punishment', 'neglect', 'stress'];
    
    if (positiveTypes.some(type => interactionType.toLowerCase().includes(type))) {
      return 'positive';
    }
    if (negativeTypes.some(type => interactionType.toLowerCase().includes(type))) {
      return 'negative';
    }
    return 'neutral';
  }

  private calculateInteractionEffects(interaction: StateInteractionDto): any {
    // 根据交互类型和强度计算效果
    const intensity = interaction.intensity / 10;
    
    return {
      mood: intensity * 5,
      energy: -intensity * 2,
      hunger: intensity * 1,
      curiosity: intensity * 3,
      socialDesire: intensity * 4
    };
  }

  private mapTriggerFromDescription(description: string): StateUpdateTrigger {
    if (description.includes('interaction')) return StateUpdateTrigger.INTERACTION;
    if (description.includes('decay')) return StateUpdateTrigger.TIME_DECAY;
    if (description.includes('feeding')) return StateUpdateTrigger.FEEDING;
    if (description.includes('playing')) return StateUpdateTrigger.PLAYING;
    if (description.includes('learning')) return StateUpdateTrigger.LEARNING;
    if (description.includes('conversation')) return StateUpdateTrigger.CONVERSATION;
    return StateUpdateTrigger.MANUAL;
  }

  /**
   * 步骤243: 检查并发送状态里程碑事件
   */
  private async checkAndSendStateMilestones(
    petId: string,
    userId: string,
    oldState: PetState,
    newState: PetState,
    _trigger: StateUpdateTrigger
  ): Promise<void> {
    try {
      // 定义里程碑阈值
      const milestones = [
        { type: 'mood' as const, thresholds: [25, 50, 75, 90] },
        { type: 'energy' as const, thresholds: [20, 40, 60, 80, 100] },
        { type: 'health' as const, thresholds: [30, 60, 90] },
        { type: 'social' as const, thresholds: [25, 50, 75] },
        { type: 'activity' as const, thresholds: [20, 40, 60, 80] }
      ];

      // const triggerDescription = this.getTriggerDescription(trigger);

      for (const milestone of milestones) {
        const oldValue = this.getStateValue(oldState, milestone.type);
        const newValue = this.getStateValue(newState, milestone.type);

        for (const threshold of milestone.thresholds) {
          // 检查是否跨越了里程碑阈值
          if (oldValue < threshold && newValue >= threshold) {
            // 达到里程碑
            await this.realtimeEvents.pushStateMilestone(petId, userId, {
              milestoneType: milestone.type,
              milestone: `${milestone.type}达到${threshold}`,
              currentValue: newValue,
              previousValue: oldValue,
              achievement: this.getAchievementForMilestone(milestone.type, threshold),
              description: `宠物的${this.getStateDisplayName(milestone.type)}提升到了${threshold}，表现优秀！`,
              reward: {
                type: 'experience',
                value: Math.floor(threshold / 10) * 5
              },
              nextMilestone: this.getNextMilestone(milestone.type, threshold, milestone.thresholds)
            });
          } else if (oldValue >= threshold && newValue < threshold) {
            // 跌破里程碑（负面事件）
            await this.realtimeEvents.pushStateMilestone(petId, userId, {
              milestoneType: milestone.type,
              milestone: `${milestone.type}跌破${threshold}`,
              currentValue: newValue,
              previousValue: oldValue,
              achievement: `需要关注${this.getStateDisplayName(milestone.type)}`,
              description: `宠物的${this.getStateDisplayName(milestone.type)}下降到${threshold}以下，需要更多关注。`,
              nextMilestone: `恢复到${threshold}以上`
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send state milestone events for pet ${petId}`, error);
      // 不要抛出错误，避免影响主要的状态更新流程
    }
  }

  /**
   * 获取状态值
   */
  private getStateValue(state: PetState, type: 'mood' | 'energy' | 'health' | 'social' | 'activity'): number {
    switch (type) {
      case 'mood':
        return (state as any).emotional?.mood || (state as any).mood || 50;
      case 'energy':
        return (state as any).basic?.energy || (state as any).energy || 50;
      case 'health':
        return (state as any).basic?.health || (state as any).health || 100;
      case 'social':
        return (state as any).social?.socialDesire || (state as any).socialDesire || 50;
      case 'activity':
        return (state as any).activity?.activityLevel || (state as any).activityLevel || 50;
      default:
        return 50;
    }
  }

  /**
   * 获取状态显示名称
   */
  private getStateDisplayName(type: 'mood' | 'energy' | 'health' | 'social' | 'activity'): string {
    const names = {
      mood: '心情',
      energy: '精力',
      health: '健康',
      social: '社交欲望',
      activity: '活跃度'
    };
    return names[type];
  }

  /**
   * 获取里程碑成就描述
   */
  private getAchievementForMilestone(type: string, threshold: number): string {
    const achievements = {
      mood: {
        25: '心情小有改善',
        50: '心情平衡',
        75: '心情愉悦',
        90: '心情极佳'
      },
      energy: {
        20: '精力恢复',
        40: '精力充沛',
        60: '精力旺盛',
        80: '精力满满',
        100: '精力巅峰'
      },
      health: {
        30: '健康改善',
        60: '健康良好',
        90: '健康优秀'
      },
      social: {
        25: '社交需求觉醒',
        50: '社交平衡',
        75: '社交活跃'
      },
      activity: {
        20: '开始活跃',
        40: '活跃增长',
        60: '积极活跃',
        80: '超级活跃'
      }
    };

    const typeAchievements = achievements[type as keyof typeof achievements];
    return typeAchievements?.[threshold as keyof typeof typeAchievements] || `${type}达到${threshold}`;
  }

  /**
   * 获取下一个里程碑
   */
  private getNextMilestone(type: string, currentThreshold: number, allThresholds: number[]): string | undefined {
    const nextThreshold = allThresholds.find(t => t > currentThreshold);
    return nextThreshold ? `${this.getStateDisplayName(type as any)}达到${nextThreshold}` : undefined;
  }

}