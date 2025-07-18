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
    private persistenceService: StatePersistenceService
  ) {
    this.stateEngine = new StateDriverEngine();
    this.logger.log('StateService initialized');
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
  async updatePetState(petId: string, stateUpdate: StateUpdateDto): Promise<PetState> {
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
  async processStateInteraction(petId: string, interactionData: StateInteractionDto): Promise<PetState> {
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
}