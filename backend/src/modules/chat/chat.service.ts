import { Injectable, ForbiddenException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { PersonalityService } from '../personality/personality.service';
import { QwenLLMService } from '../../services/qwen-llm.service';
import { ChatPerformanceMonitor } from '../../common/monitoring/chat-performance.monitor';
import { ChatCacheService } from '../../common/cache/chat-cache.service';
import { CostControlService } from '../../common/cost-control/cost-control.service';
import { SkillsService } from '../skills/skills.service';
import { StateService } from '../state/state.service';
import { PromptGeneratorEngine } from '../../algorithms/prompt-generator';
import { RealtimeEventsService } from '../../gateways/services/realtime-events.service';
import { PersonalityTrait } from '../../algorithms/types/personality.types';
import { PetStateDto, PetMood, PetActivity } from '../state/dto/pet-state.dto';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ChatRequest, ChatMessage } from '../../common/interfaces/llm.interface';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly personalityService: PersonalityService,
    private readonly llmService: QwenLLMService,
    private readonly performanceMonitor: ChatPerformanceMonitor,
    private readonly cacheService: ChatCacheService,
    private readonly costControlService: CostControlService,
    private readonly skillsService: SkillsService,
    private readonly stateService: StateService,
    private readonly promptGenerator: PromptGeneratorEngine,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {
    this.logger.log('ChatService initialized with LLM integration, performance monitoring, caching, cost control, skills integration, prompt generation engine and realtime events');
  }

  async processEnhancedChat(userId: string, dto: ChatCompletionDto): Promise<ChatResponseDto> {
    const { petId, conversationId, message } = dto;
    const requestStartTime = Date.now();
    
    try {
      // 1. 成本控制和频率限制检查
      this.costControlService.validateRequest(userId);
      
      // 2. 验证用户权限和宠物所有权
      await this.validateUserPetAccess(userId, petId);
      
      // 2. 检查相似问题缓存
      const cachedAnswer = this.cacheService.getSimilarQuestionAnswer(message, petId);
      if (cachedAnswer) {
        this.logger.debug(`Using cached answer for similar question: ${message.substring(0, 50)}...`);
        // 仍然需要记录性能指标
        const totalResponseTime = Date.now() - requestStartTime;
        this.performanceMonitor.recordChatRequest(totalResponseTime, true, 0);
        
        return {
          id: 'cached-' + Date.now(),
          conversationId: conversationId || 'cached',
          message: cachedAnswer.answer,
          timestamp: new Date(),
          metadata: {
            cached: true,
            processingTime: totalResponseTime,
            personalityInfluence: {
              dominantTrait: 'cached',
              traitValues: {}
            },
            stateInfluence: {
              currentMood: 'cached',
              energyLevel: 0,
              healthStatus: 'cached'
            },
            skillsAffected: [],
            modelUsed: 'cached',
            qualityScore: 0.5
          },
        };
      }
      
      // 3. 获取宠物个性、状态和技能数据
      const personality = await this.personalityService.getPersonalityDetails(petId);
      const currentState = await this.stateService.getCurrentState(petId);
      const skills = await this.skillsService.getSkillTree(petId);
      
      // 4. 使用PromptGeneratorEngine构建个性化系统提示词（优化缓存策略）
      const promptCacheKey = this.generatePromptCacheKey(petId, personality, currentState, skills);
      let systemPrompt = this.cacheService.getPersonalityPrompt(petId, promptCacheKey);
      
      if (!systemPrompt) {
        const promptStartTime = Date.now();
        
        // Convert PersonalityTraits to Record<PersonalityTrait, number>
        const convertedPersonality = this.convertPersonalityTraits(personality);
        // Convert PetState to PetStateDto  
        const convertedState = this.convertPetStateToDto(petId, currentState);
        
        const generatedPrompt = await this.promptGenerator.generateCompletePrompt(
          convertedPersonality,
          convertedState,
          skills
        );
        
        systemPrompt = generatedPrompt.combinedPrompt;
        
        // 优化缓存策略：根据提示词复杂度调整缓存时间
        this.cacheService.cachePersonalityPrompt(petId, promptCacheKey, systemPrompt);
        
        const promptGenerationTime = Date.now() - promptStartTime;
        this.logger.debug(`Prompt generated in ${promptGenerationTime}ms for pet ${petId}`);
      }
      
      // 5. 获取对话历史上下文（使用缓存）
      const conversation = await this.getOrCreateConversation(userId, petId, conversationId, message);
      let conversationHistory = this.cacheService.getConversationContext(conversation.id);
      if (!conversationHistory) {
        conversationHistory = await this.getConversationContext(conversation.id);
        this.cacheService.cacheConversationContext(conversation.id, conversationHistory);
      }
      
      // 6. 保存用户消息
      await this.saveUserMessage(conversation.id, message);
      
      // 7. 构建LLM请求
      const llmRequest = this.buildLLMRequest(message, systemPrompt, conversationHistory);
      
      // 8. 调用LLM服务
      const llmResponse = await this.llmService.chat(llmRequest);
      
      // 9. 保存AI回复
      const aiMessage = await this.saveAIMessage(conversation.id, llmResponse, personality, currentState);
      
      // 10. 缓存相似问题答案（如果响应质量好）
      if (llmResponse.usage?.totalTokens > 50) { // 只缓存有意义的回复
        this.cacheService.cacheSimilarQuestionAnswer(message, petId, llmResponse.content);
      }
      
      // 11. 分析对话内容并触发个性演化
      await this.analyzeAndTriggerEvolution(petId, message, llmResponse.content);
      
      // 12. 更新对话活跃时间
      await this.conversationsService.updateLastActivity(conversation.id);
      
      // 13. 使对话上下文缓存失效（因为添加了新消息）
      this.cacheService.invalidateConversationCache(conversation.id);
      
      // 14. 分析对话内容（轻量级分析用于响应）
      const quickAnalysisResult = await this.performQuickAnalysis(petId, message, llmResponse.content, personality, currentState);
      
      // 15. 异步执行完整分析和数据更新（不影响响应时间）
      this.performAsyncAnalysisAndUpdate(petId, message, llmResponse.content, personality, currentState, skills, dto.metadata)
        .catch(error => {
          this.logger.warn('Failed to perform async analysis and update:', error);
        });

      // 16. 构建并返回响应
      const response = this.buildChatResponse(aiMessage, llmResponse, conversation.id, quickAnalysisResult);
      
      // 16. 记录成本控制使用情况
      if (llmResponse.usage) {
        this.costControlService.recordUsage(userId, llmResponse.usage);
      }
      
      // 17. 记录性能指标
      const totalResponseTime = Date.now() - requestStartTime;
      this.performanceMonitor.recordChatRequest(
        totalResponseTime,
        true,
        llmResponse.usage?.totalTokens
      );
      
      return response;
      
    } catch (error: any) {
      // 记录错误性能指标
      const totalResponseTime = Date.now() - requestStartTime;
      this.performanceMonitor.recordChatRequest(totalResponseTime, false);
      
      this.logger.error('Chat processing failed', {
        error: error.message,
        userId,
        petId,
        conversationId,
        message: message.substring(0, 100),
        responseTime: totalResponseTime,
      });
      throw new HttpException('对话处理失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async processStreamChat(_userId: string, _chatCompletionDto: ChatCompletionDto) {
    // 流式响应的实现将在后续版本中完成
    throw new Error('流式响应功能暂未实现');
  }

  /**
   * 获取聊天性能指标
   */
  getChatPerformanceMetrics(): any {
    return this.performanceMonitor.getPerformanceMetrics();
  }

  /**
   * 获取详细性能报告
   */
  getDetailedPerformanceReport(): any {
    return this.performanceMonitor.getDetailedReport();
  }

  /**
   * 重置性能指标
   */
  resetPerformanceMetrics(): void {
    this.performanceMonitor.resetMetrics();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): any {
    return this.cacheService.getStats();
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * 使宠物相关缓存失效
   */
  invalidatePetCache(petId: string): void {
    this.cacheService.invalidatePersonalityCache(petId);
  }

  /**
   * 获取用户使用统计
   */
  getUserUsageStats(userId: string): any {
    return this.costControlService.getUserUsageStats(userId);
  }

  /**
   * 获取全局成本统计
   */
  getGlobalCostStats(): any {
    return this.costControlService.getGlobalStats();
  }

  /**
   * 获取成本报告
   */
  getCostReport(): any {
    return this.costControlService.getCostReport();
  }

  /**
   * 验证用户权限和宠物所有权
   */
  private async validateUserPetAccess(userId: string, petId: string): Promise<any> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        user: {
          select: { id: true, username: true }
        }
      }
    });

    if (!pet || pet.userId !== userId) {
      throw new ForbiddenException('无权访问此宠物');
    }

    return pet;
  }


  /**
   * 获取或创建对话
   */
  private async getOrCreateConversation(userId: string, petId: string, conversationId?: string, message?: string): Promise<any> {
    if (conversationId) {
      const conversation = await this.conversationsService.findOne(userId, conversationId);
      if (conversation.petId !== petId) {
        throw new ForbiddenException('对话与宠物不匹配');
      }
      return conversation;
    } else {
      return await this.conversationsService.create(userId, {
        title: message && message.length > 30 ? message.substring(0, 30) + '...' : message || '新对话',
        petId,
      });
    }
  }

  /**
   * 获取对话历史上下文
   */
  private async getConversationContext(conversationId: string): Promise<ChatMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10, // 最近10条消息
      select: {
        role: true,
        content: true,
        createdAt: true,
      }
    });

    return messages.reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.createdAt,
    }));
  }

  /**
   * 保存用户消息
   */
  private async saveUserMessage(conversationId: string, message: string): Promise<void> {
    await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * 构建LLM请求
   */
  private buildLLMRequest(message: string, systemPrompt: string, conversationHistory: ChatMessage[]): ChatRequest {
    const messages: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    return {
      messages,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
    };
  }

  /**
   * 保存AI回复
   */
  private async saveAIMessage(conversationId: string, llmResponse: any, personality: any, currentState: any): Promise<any> {
    return await this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: llmResponse.content,
        tokenCount: llmResponse.usage?.totalTokens || 0,
        processingTime: llmResponse.responseTime / 1000, // 转换为秒
        personalitySnapshot: personality,
        stateSnapshot: currentState,
        metadata: {
          timestamp: new Date().toISOString(),
          model: llmResponse.model,
          finishReason: llmResponse.finishReason,
          usage: llmResponse.usage,
        },
      },
    });
  }

  /**
   * 分析对话内容并触发个性演化
   */
  private async analyzeAndTriggerEvolution(petId: string, userMessage: string, botResponse: string): Promise<void> {
    try {
      // 分析对话内容对个性的潜在影响
      const interactionData = {
        type: this.detectInteractionType(userMessage),
        userMessage,
        botResponse,
        timestamp: new Date(),
        messageLength: userMessage.length,
        complexity: this.calculateTopicComplexity(userMessage),
        emotionalValence: this.analyzeEmotionalTone(userMessage),
        topicKeywords: this.extractKeywords(userMessage)
      };
      
      // 触发个性演化计算
      await this.personalityService.processEvolutionIncrement(petId, interactionData);
      
    } catch (error: any) {
      this.logger.warn('Failed to trigger evolution from conversation', {
        error: error.message,
        petId,
        userMessage: userMessage.substring(0, 100),
      });
      // 不抛出错误，避免影响正常对话
    }
  }

  /**
   * 构建聊天响应
   */
  private buildChatResponse(aiMessage: any, llmResponse: any, conversationId: string, analysisResult?: any): ChatResponseDto {
    return {
      id: aiMessage.id,
      conversationId,
      message: aiMessage.content,
      timestamp: aiMessage.createdAt,
      metadata: {
        modelUsed: llmResponse.model,
        usage: llmResponse.usage,
        processingTime: llmResponse.responseTime,
        personalityInfluence: this.formatPersonalityInfluence(analysisResult?.personalityInfluences || aiMessage.personalitySnapshot),
        stateInfluence: this.formatStateInfluence(analysisResult?.stateInfluences || aiMessage.stateSnapshot),
        skillsAffected: analysisResult?.skillExperiences?.map((exp: any) => exp.skillId) || [],
        cached: false,
        qualityScore: analysisResult?.qualityMetrics?.overall || 0.8,
        analysis: analysisResult ? {
          interactionType: this.detectInteractionType(aiMessage.content || ''),
          emotionalTone: analysisResult.qualityMetrics?.emotionalColor || 0,
          topicComplexity: analysisResult.qualityMetrics?.topicDepth || 0.3,
          keywords: this.extractKeywords(aiMessage.content || '').slice(0, 5)
        } : undefined,
        additionalData: {
          evolutionTriggered: !!analysisResult?.personalityInfluences,
          stateUpdated: !!analysisResult?.stateInfluences,
          skillExperienceGained: analysisResult?.skillExperiences?.reduce((total: number, exp: any) => total + exp.experience, 0) || 0,
          analysisTimestamp: analysisResult?.metadata?.analyzedAt
        }
      },
    };
  }


  /**
   * 检测交互类型
   */
  private detectInteractionType(message: string): string {
    const patterns = {
      science: /科学|物理|化学|生物|数学|技术|研究|理论|实验/gi,
      philosophy: /哲学|思考|意义|存在|价值观|道德|伦理|人生|世界观/gi,
      creative: /创作|艺术|音乐|绘画|故事|想象|创意|设计|文学/gi,
      emotional: /感受|情感|心情|难过|开心|担心|愤怒|激动|感动|孤独/gi,
      casual: /天气|日常|吃饭|睡觉|游戏|电影|书籍|旅行|购物/gi,
      learning: /学习|知识|教育|课程|技能|能力|成长|进步/gi,
      social: /朋友|家人|同事|关系|社交|交流|聊天|分享/gi,
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) return type;
    }
    return 'general';
  }

  /**
   * 计算话题复杂度
   */
  private calculateTopicComplexity(message: string): number {
    // 简单的复杂度计算：基于消息长度、专业词汇数量等
    const length = message.length;
    const complexWords = (message.match(/[理论|分析|概念|原理|机制|系统|结构|功能|过程|方法|技术|策略|模式|框架|算法|数据|信息|知识|智能|逻辑|哲学|心理|社会|经济|政治|文化|历史|未来|发展|创新|变化|影响|意义|价值|目标|问题|解决|方案|建议|观点|看法|态度|情感|体验|感受|思考|理解|认识|学习|成长|进步|改善|提高|优化|完善]/g) || []).length;
    
    let complexity = 0;
    complexity += Math.min(length / 100, 1) * 0.3; // 长度因子
    complexity += Math.min(complexWords / 5, 1) * 0.4; // 专业词汇因子
    complexity += (message.match(/[？?！!]/g) || []).length * 0.1; // 疑问感叹因子
    complexity += (message.match(/[，,。.；;：:]/g) || []).length * 0.05; // 标点密度因子
    
    return Math.min(complexity, 1);
  }

  /**
   * 分析情感倾向
   */
  private analyzeEmotionalTone(message: string): number {
    const positiveWords = (message.match(/[好|喜欢|爱|开心|快乐|高兴|兴奋|满足|幸福|美好|棒|赞|优秀|成功|胜利|希望|期待|感谢|谢谢]/g) || []).length;
    const negativeWords = (message.match(/[不好|讨厌|恨|难过|痛苦|失望|沮丧|愤怒|生气|烦恼|焦虑|担心|害怕|恐惧|绝望|失败|错误|问题|困难|挫折]/g) || []).length;
    
    if (positiveWords === 0 && negativeWords === 0) return 0; // 中性
    
    const totalEmotional = positiveWords + negativeWords;
    return (positiveWords - negativeWords) / totalEmotional;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(message: string): string[] {
    // 简单的关键词提取：移除停用词，提取名词和动词
    const stopWords = ['的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '这', '那', '有', '没', '和', '或', '但', '如果', '因为', '所以', '然后', '还是', '就是', '不是', '可以', '应该', '会', '能', '要', '想', '说', '做', '去', '来', '给', '对', '从', '到', '以', '用', '把', '被', '让', '使', '关于', '由于', '为了', '通过', '根据', '按照', '除了', '包括', '尤其', '特别', '非常', '很', '比较', '更', '最', '都', '也', '还', '再', '又', '就', '才', '只', '仅', '已经', '正在', '将要', '曾经', '一直', '总是', '从来', '永远', '马上', '立刻', '现在', '以前', '以后', '今天', '昨天', '明天'];
    
    const words = message.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 1 && 
      !stopWords.includes(word) &&
      /[\u4e00-\u9fa5]/.test(word) // 包含中文字符
    );
    
    return [...new Set(keywords)].slice(0, 10); // 去重并限制数量
  }

  /**
   * 处理聊天中的技能经验增长（异步执行）
   */
  private async processSkillExperienceFromChat(
    petId: string,
    userMessage: string,
    botResponse: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      this.logger.debug(`Processing skill experience from chat for pet ${petId}`);
      
      const result = await this.skillsService.addExperienceFromInteraction(
        petId,
        userMessage,
        botResponse,
        metadata
      );
      
      if (result.experienceGained > 0) {
        this.logger.log(
          `Skills experience added for pet ${petId}: ${result.experienceGained} exp across ${result.affectedSkills.length} skills [${result.affectedSkills.join(', ')}]`
        );
      } else {
        this.logger.debug(`No skill experience gained for pet ${petId} from this conversation`);
      }
    } catch (error) {
      this.logger.error(`Error processing skill experience for pet ${petId}:`, error);
      // 不重新抛出错误，避免影响聊天功能
    }
  }

  /**
   * 分析对话响应 - 步骤213
   */
  async analyzeChatResponse(
    petId: string,
    userMessage: string,
    botResponse: string,
    personality: any,
    currentState: any
  ): Promise<any> {
    try {
      this.logger.debug(`Analyzing chat response for pet ${petId}`);

      // 分析对话质量
      const qualityScore = this.calculateResponseQuality(userMessage, botResponse);
      
      // 分析情感色彩
      const emotionalAnalysis = this.analyzeEmotionalTone(userMessage);
      
      // 分析话题深度
      const topicDepth = this.calculateTopicComplexity(userMessage);
      
      // 分析响应适当性
      const appropriateness = this.analyzeResponseAppropriateness(userMessage, botResponse);
      
      // 识别触发的个性特质
      const personalityInfluences = this.identifyPersonalityTriggers(userMessage, personality);
      
      // 计算状态影响
      const stateInfluences = this.calculateStateInfluences(userMessage, currentState);
      
      // 计算相关技能经验
      const skillExperiences = this.calculateSkillExperiences(userMessage, botResponse);

      return {
        qualityMetrics: {
          overall: qualityScore,
          emotionalColor: emotionalAnalysis,
          topicDepth,
          appropriateness
        },
        personalityInfluences,
        stateInfluences,
        skillExperiences,
        metadata: {
          analyzedAt: new Date(),
          userMessageLength: userMessage.length,
          botResponseLength: botResponse.length
        }
      };
    } catch (error) {
      this.logger.error(`Error analyzing chat response for pet ${petId}:`, error);
      // 返回默认分析结果，避免影响聊天功能
      return {
        qualityMetrics: { overall: 0.5, emotionalColor: 0, topicDepth: 0.3, appropriateness: 0.7 },
        personalityInfluences: {},
        stateInfluences: {},
        skillExperiences: [],
        metadata: { analyzedAt: new Date() }
      };
    }
  }

  /**
   * 根据对话更新宠物数据 - 步骤214（集成实时事件推送）
   */
  async updatePetFromChat(petId: string, analysisResult: any, _skills: any[]): Promise<void> {
    try {
      this.logger.debug(`Updating pet data from chat for pet ${petId}`);
      
      // 获取用户ID
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        select: { userId: true }
      });
      
      if (!pet) {
        this.logger.warn(`Pet ${petId} not found, skipping updates`);
        return;
      }

      const userId = pet.userId;

      // 基于对话分析结果触发个性演化
      if (analysisResult.personalityInfluences && Object.keys(analysisResult.personalityInfluences).length > 0) {
        // 获取演化前的个性数据
        const beforePersonality = await this.personalityService.getPersonalityDetails(petId);
        
        await this.personalityService.processEvolutionIncrement(petId, {
          type: 'chat_interaction',
          userMessage: '',
          botResponse: '',
          timestamp: new Date(),
          personalityTriggers: analysisResult.personalityInfluences
        });

        // 获取演化后的个性数据并推送事件
        const afterPersonality = await this.personalityService.getPersonalityDetails(petId);
        
        // 检查每个特质的变化并推送相应的演化事件
        for (const [traitKey] of Object.entries(analysisResult.personalityInfluences)) {
          const trait = traitKey as PersonalityTrait;
          const oldValue = beforePersonality[traitKey] || 50;
          const newValue = afterPersonality[traitKey] || 50;
          
          if (Math.abs(newValue - oldValue) >= 1) { // 只有显著变化才推送事件
            await this.realtimeEvents.pushPersonalityEvolution(
              petId,
              userId,
              trait,
              oldValue,
              newValue,
              '聊天互动'
            );
          }
        }
      }

      // 更新宠物状态
      if (analysisResult.stateInfluences && Object.keys(analysisResult.stateInfluences).length > 0) {
        // 获取状态更新前的数据
        const beforeState = await this.stateService.getCurrentState(petId);
        
        await this.stateService.processStateInteraction(petId, {
          interactionType: 'chat',
          intensity: 5, // Medium intensity for chat interactions
          metadata: { 
            source: 'chat_analysis',
            influences: analysisResult.stateInfluences
          }
        });

        // 获取状态更新后的数据并检查里程碑
        const afterState = await this.stateService.getCurrentState(petId);
        
        // 检查状态里程碑
        await this.checkAndPushStateMilestones(petId, userId, beforeState, afterState);
      }

      // 增加相关技能经验值并检查解锁
      if (analysisResult.skillExperiences && analysisResult.skillExperiences.length > 0) {
        for (const skillExp of analysisResult.skillExperiences) {
          if (skillExp.experience > 0) {
            // 获取技能经验增加前的数据
            const beforeSkills = await this.skillsService.getSkillTree(petId);
            const beforeSkill = beforeSkills.find(s => s.definition.id === skillExp.skillId);
            
            await this.skillsService.gainSkillExperience(petId, skillExp.skillId, skillExp.experience);
            
            // 获取技能经验增加后的数据
            const afterSkills = await this.skillsService.getSkillTree(petId);
            const afterSkill = afterSkills.find(s => s.definition.id === skillExp.skillId);
            
            // 检查是否有技能解锁
            if (beforeSkill && afterSkill && beforeSkill.progress && afterSkill.progress) {
              // 检查技能状态变化（从未解锁到已解锁）
              const wasLocked = beforeSkill.progress.status === 'locked';
              const isUnlocked = afterSkill.progress.status === 'unlocked';
              
              if (wasLocked && isUnlocked) {
                // 技能刚解锁，推送解锁事件
                await this.realtimeEvents.pushSkillUnlocked(petId, userId, {
                  skillId: afterSkill.definition.id,
                  skillName: afterSkill.definition.name,
                  category: afterSkill.definition.category,
                  level: afterSkill.progress.level,
                  unlockCondition: '通过聊天互动',
                  description: afterSkill.definition.description,
                  requiredExperience: afterSkill.progress.experienceRequired,
                  currentExperience: afterSkill.progress.experience,
                  abilities: afterSkill.definition.effects?.map((effect: any) => effect.description) || [],
                  prerequisites: afterSkill.definition.unlockConditions?.map((condition: any) => condition.description) || []
                });
              }
            }
          }
        }
      }

      // 随机检查是否触发演化机会事件
      await this.checkAndPushEvolutionOpportunity(petId, userId, analysisResult);

      this.logger.debug(`Pet data successfully updated from chat for pet ${petId}`);
    } catch (error) {
      this.logger.error(`Error updating pet data from chat for pet ${petId}:`, error);
      // 不重新抛出错误，避免影响聊天功能
    }
  }

  /**
   * 计算响应质量
   */
  private calculateResponseQuality(userMessage: string, botResponse: string): number {
    // 基础质量评分
    let quality = 0.5;
    
    // 响应长度适当性
    const responseLength = botResponse.length;
    const messageLength = userMessage.length;
    const lengthRatio = responseLength / Math.max(messageLength, 1);
    
    if (lengthRatio >= 0.8 && lengthRatio <= 3.0) {
      quality += 0.2;
    }
    
    // 响应相关性（简单关键词匹配）
    const userKeywords = this.extractKeywords(userMessage);
    const botKeywords = this.extractKeywords(botResponse);
    const overlap = userKeywords.filter(keyword => botKeywords.includes(keyword)).length;
    const relevanceScore = overlap / Math.max(userKeywords.length, 1);
    quality += relevanceScore * 0.3;
    
    return Math.min(quality, 1.0);
  }

  /**
   * 分析响应适当性
   */
  private analyzeResponseAppropriateness(userMessage: string, botResponse: string): number {
    // 基础适当性评分
    let appropriateness = 0.7;
    
    // 检查是否包含不当内容（简单实现）
    const inappropriatePatterns = /[脏话|骂人|攻击性]/g;
    if (inappropriatePatterns.test(botResponse)) {
      appropriateness -= 0.3;
    }
    
    // 检查语言风格一致性
    const userTone = this.detectLanguageTone(userMessage);
    const botTone = this.detectLanguageTone(botResponse);
    if (userTone === botTone) {
      appropriateness += 0.2;
    }
    
    return Math.max(Math.min(appropriateness, 1.0), 0.0);
  }

  /**
   * 识别个性特质触发器
   */
  private identifyPersonalityTriggers(userMessage: string, _personality: any): Record<string, number> {
    const triggers: Record<string, number> = {};
    
    // 基于消息内容识别可能影响的个性特质
    const interactionType = this.detectInteractionType(userMessage);
    
    switch (interactionType) {
      case 'creative':
        triggers.openness = 0.1;
        triggers.extraversion = 0.05;
        break;
      case 'emotional':
        triggers.agreeableness = 0.1;
        triggers.neuroticism = -0.05;
        break;
      case 'learning':
        triggers.conscientiousness = 0.1;
        triggers.openness = 0.05;
        break;
      case 'social':
        triggers.extraversion = 0.1;
        triggers.agreeableness = 0.05;
        break;
    }
    
    return triggers;
  }

  /**
   * 计算状态影响
   */
  private calculateStateInfluences(userMessage: string, _currentState: any): Record<string, number> {
    const influences: Record<string, number> = {};
    
    const emotionalTone = this.analyzeEmotionalTone(userMessage);
    const interactionType = this.detectInteractionType(userMessage);
    
    // 基于情感色彩调整状态
    if (emotionalTone > 0.3) {
      influences.happiness = 5;
      influences.energy = 3;
    } else if (emotionalTone < -0.3) {
      influences.happiness = -3;
      influences.energy = -2;
    }
    
    // 基于交互类型调整状态
    switch (interactionType) {
      case 'learning':
        influences.learning = 10;
        influences.attention = 5;
        break;
      case 'creative':
        influences.creativity = 10;
        influences.energy = 3;
        break;
      case 'social':
        influences.social = 8;
        influences.happiness = 5;
        break;
    }
    
    return influences;
  }

  /**
   * 计算技能经验
   */
  private calculateSkillExperiences(userMessage: string, _botResponse: string): Array<{ skillId: string; experience: number }> {
    const experiences: Array<{ skillId: string; experience: number }> = [];
    
    const interactionType = this.detectInteractionType(userMessage);
    const complexity = this.calculateTopicComplexity(userMessage);
    const baseExperience = Math.floor(complexity * 10);
    
    // 根据交互类型分配经验
    switch (interactionType) {
      case 'creative':
        experiences.push({ skillId: 'poetry_discussion', experience: baseExperience });
        experiences.push({ skillId: 'creative_thinking', experience: baseExperience * 0.5 });
        break;
      case 'learning':
        experiences.push({ skillId: 'knowledge_sharing', experience: baseExperience });
        break;
      case 'social':
        experiences.push({ skillId: 'communication', experience: baseExperience });
        experiences.push({ skillId: 'empathy', experience: baseExperience * 0.7 });
        break;
      case 'emotional':
        experiences.push({ skillId: 'empathy', experience: baseExperience });
        break;
    }
    
    return experiences;
  }

  /**
   * 检测语言语调
   */
  private detectLanguageTone(message: string): 'formal' | 'casual' | 'friendly' | 'neutral' {
    if (/您|请问|谢谢|感谢/.test(message)) return 'formal';
    if (/哈哈|嘿|哟|啊/.test(message)) return 'casual';
    if (/喜欢|开心|不错|好的/.test(message)) return 'friendly';
    return 'neutral';
  }

  /**
   * 转换PersonalityTraits到Record<PersonalityTrait, number>
   */
  private convertPersonalityTraits(personality: any): Record<PersonalityTrait, number> {
    const converted: Record<PersonalityTrait, number> = {
      [PersonalityTrait.OPENNESS]: personality.openness || 50,
      [PersonalityTrait.CONSCIENTIOUSNESS]: personality.conscientiousness || 50,
      [PersonalityTrait.EXTRAVERSION]: personality.extraversion || 50,
      [PersonalityTrait.AGREEABLENESS]: personality.agreeableness || 50,
      [PersonalityTrait.NEUROTICISM]: personality.neuroticism || 30,
      [PersonalityTrait.CREATIVITY]: personality.creativity || 50,
      [PersonalityTrait.EMPATHY]: personality.empathy || 50,
      [PersonalityTrait.CURIOSITY]: personality.curiosity || 50,
      [PersonalityTrait.PLAYFULNESS]: personality.playfulness || 50,
      [PersonalityTrait.INTELLIGENCE]: personality.intelligence || 50,
    };
    return converted;
  }

  /**
   * 转换PetState到PetStateDto
   */
  private convertPetStateToDto(petId: string, state: any): PetStateDto {
    const basic = state.basic || {};
    const advanced = state.advanced || {};
    
    return {
      petId,
      hunger: basic.hunger || 50,
      fatigue: 100 - (basic.energy || 80), // Convert energy to fatigue
      happiness: basic.mood || 70,
      health: basic.health || 90,
      social: advanced.socialDesire || 60,
      learning: advanced.focusLevel || 70,
      creativity: advanced.creativity || 65,
      exploration: advanced.curiosity || 75,
      mood: this.convertToMoodEnum(basic.mood || 70),
      currentActivity: PetActivity.CHATTING,
      energyLevel: basic.energy || 80,
      attention: advanced.focusLevel || 70,
      lastUpdated: state.lastUpdate || new Date()
    };
  }

  /**
   * 转换数值心情到枚举
   */
  private convertToMoodEnum(moodValue: number): PetMood {
    if (moodValue >= 90) return PetMood.EXCITED;
    if (moodValue >= 70) return PetMood.HAPPY;
    if (moodValue >= 50) return PetMood.CALM;
    if (moodValue >= 30) return PetMood.RELAXED;
    return PetMood.SLEEPY;
  }

  /**
   * 格式化个性影响信息
   */
  private formatPersonalityInfluence(personalityData: any): any {
    if (!personalityData) {
      return {
        dominantTrait: 'neutral',
        traitValues: {}
      };
    }

    // 如果是分析结果中的个性影响
    if (typeof personalityData === 'object' && !personalityData.dominantTrait) {
      const traits = Object.entries(personalityData as Record<string, number>);
      const dominant = traits.reduce((prev, current) => 
        Math.abs(current[1]) > Math.abs(prev[1]) ? current : prev
      );

      return {
        dominantTrait: dominant[0],
        traitValues: personalityData
      };
    }

    // 如果已经是正确格式或者是快照数据
    return personalityData.dominantTrait ? personalityData : {
      dominantTrait: 'neutral',
      traitValues: personalityData || {}
    };
  }

  /**
   * 格式化状态影响信息
   */
  private formatStateInfluence(stateData: any): any {
    if (!stateData) {
      return {
        currentMood: 'neutral',
        energyLevel: 50,
        healthStatus: 'normal'
      };
    }

    // 如果是分析结果中的状态影响
    if (typeof stateData === 'object' && !stateData.currentMood) {
      return {
        currentMood: this.convertInfluenceToMood(stateData.happiness || 0),
        energyLevel: Math.max(0, Math.min(100, (stateData.energy || 0) + 50)),
        healthStatus: 'normal'
      };
    }

    // 如果已经是正确格式或者是快照数据
    return stateData.currentMood ? stateData : {
      currentMood: this.convertValueToMood(stateData.mood || stateData.happiness || 50),
      energyLevel: stateData.energy || stateData.energyLevel || 50,
      healthStatus: stateData.health ? this.convertValueToHealth(stateData.health) : 'normal'
    };
  }

  /**
   * 将影响值转换为心情描述
   */
  private convertInfluenceToMood(influence: number): string {
    if (influence > 5) return 'happy';
    if (influence > 0) return 'content';
    if (influence < -5) return 'sad';
    if (influence < 0) return 'neutral';
    return 'calm';
  }

  /**
   * 将数值转换为心情描述
   */
  private convertValueToMood(value: number): string {
    if (value >= 80) return 'excited';
    if (value >= 60) return 'happy';
    if (value >= 40) return 'content';
    if (value >= 20) return 'calm';
    return 'sad';
  }

  /**
   * 将数值转换为健康状态描述
   */
  private convertValueToHealth(value: number): string {
    if (value >= 90) return 'excellent';
    if (value >= 70) return 'good';
    if (value >= 50) return 'normal';
    if (value >= 30) return 'fair';
    return 'poor';
  }

  /**
   * 生成提示词缓存键
   */
  private generatePromptCacheKey(petId: string, personality: any, state: any, skills: any[]): string {
    // 创建基于关键数据的缓存键，避免频繁重新生成相同提示词
    const personalityHash = this.createSimpleHash(JSON.stringify({
      openness: Math.round((personality.openness || 50) / 10) * 10,
      conscientiousness: Math.round((personality.conscientiousness || 50) / 10) * 10,
      extraversion: Math.round((personality.extraversion || 50) / 10) * 10,
      agreeableness: Math.round((personality.agreeableness || 50) / 10) * 10,
      neuroticism: Math.round((personality.neuroticism || 30) / 10) * 10,
    }));
    
    const stateHash = this.createSimpleHash(JSON.stringify({
      mood: Math.round((state?.basic?.mood || 70) / 20) * 20,
      energy: Math.round((state?.basic?.energy || 80) / 20) * 20,
      health: Math.round((state?.basic?.health || 90) / 20) * 20,
    }));
    
    const unlockedSkills = skills.filter(skill => skill.isUnlocked).map(skill => skill.id).sort();
    const skillsHash = this.createSimpleHash(JSON.stringify(unlockedSkills));
    
    return `${petId}-${personalityHash}-${stateHash}-${skillsHash}`;
  }

  /**
   * 创建简单哈希值
   */
  private createSimpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 执行快速分析（用于响应构建）
   */
  private async performQuickAnalysis(
    petId: string,
    userMessage: string,
    botResponse: string,
    personality: any,
    currentState: any
  ): Promise<any> {
    try {
      // 快速分析，只计算基础指标
      const emotionalTone = this.analyzeEmotionalTone(userMessage);
      const topicComplexity = this.calculateTopicComplexity(userMessage);
      
      return {
        qualityMetrics: {
          overall: 0.8, // 默认质量评分
          emotionalColor: emotionalTone,
          topicDepth: topicComplexity,
          appropriateness: 0.85 // 默认适当性评分
        },
        personalityInfluences: this.identifyPersonalityTriggers(userMessage, personality),
        stateInfluences: this.calculateStateInfluences(userMessage, currentState),
        skillExperiences: this.calculateSkillExperiences(userMessage, botResponse),
        metadata: {
          analyzedAt: new Date(),
          analysisType: 'quick',
          userMessageLength: userMessage.length,
          botResponseLength: botResponse.length
        }
      };
    } catch (error) {
      this.logger.warn(`Quick analysis failed for pet ${petId}:`, error);
      return this.getDefaultAnalysisResult();
    }
  }

  /**
   * 异步执行完整分析和数据更新
   */
  private async performAsyncAnalysisAndUpdate(
    petId: string,
    userMessage: string,
    botResponse: string,
    personality: any,
    currentState: any,
    skills: any[],
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      this.logger.debug(`Starting async analysis and update for pet ${petId}`);
      
      // 1. 执行完整分析
      const fullAnalysisResult = await this.analyzeChatResponse(petId, userMessage, botResponse, personality, currentState);
      
      // 2. 更新宠物数据
      await this.updatePetFromChat(petId, fullAnalysisResult, skills);
      
      // 3. 处理技能经验增长
      await this.processSkillExperienceFromChat(petId, userMessage, botResponse, metadata);
      
      // 4. 触发个性演化分析
      await this.analyzeAndTriggerEvolution(petId, userMessage, botResponse);
      
      this.logger.debug(`Async analysis and update completed for pet ${petId}`);
    } catch (error) {
      this.logger.error(`Async analysis and update failed for pet ${petId}:`, error);
      // 不重新抛出错误，避免影响主流程
    }
  }

  /**
   * 获取默认分析结果
   */
  private getDefaultAnalysisResult(): any {
    return {
      qualityMetrics: { 
        overall: 0.5, 
        emotionalColor: 0, 
        topicDepth: 0.3, 
        appropriateness: 0.7 
      },
      personalityInfluences: {},
      stateInfluences: {},
      skillExperiences: [],
      metadata: { 
        analyzedAt: new Date(), 
        analysisType: 'default' 
      }
    };
  }

  /**
   * 检查并推送状态里程碑事件
   */
  private async checkAndPushStateMilestones(petId: string, userId: string, beforeState: any, afterState: any): Promise<void> {
    try {
      // 检查能量里程碑
      if (this.crossedMilestone(beforeState.energy, afterState.energy, [25, 50, 75, 90])) {
        const milestone = this.getMilestoneLevel(afterState.energy, [25, 50, 75, 90]);
        await this.realtimeEvents.pushStateMilestone(petId, userId, {
          milestoneType: 'energy',
          milestone: `能量等级${milestone}`,
          currentValue: afterState.energy,
          previousValue: beforeState.energy,
          achievement: this.getEnergyAchievement(afterState.energy),
          description: `宠物的能量水平达到了${afterState.energy}点！`,
          reward: afterState.energy >= 90 ? { type: 'experience', value: 10 } : undefined,
          nextMilestone: this.getNextMilestone(afterState.energy, [25, 50, 75, 90])
        });
      }

      // 检查心情里程碑
      if (this.crossedMilestone(beforeState.happiness, afterState.happiness, [30, 60, 85])) {
        const milestone = this.getMilestoneLevel(afterState.happiness, [30, 60, 85]);
        await this.realtimeEvents.pushStateMilestone(petId, userId, {
          milestoneType: 'mood',
          milestone: `心情等级${milestone}`,
          currentValue: afterState.happiness,
          previousValue: beforeState.happiness,
          achievement: this.getHappinessAchievement(afterState.happiness),
          description: `宠物的心情指数达到了${afterState.happiness}点！`,
          reward: afterState.happiness >= 85 ? { type: 'unlock', value: '特殊互动' } : undefined,
          nextMilestone: this.getNextMilestone(afterState.happiness, [30, 60, 85])
        });
      }

      // 检查健康里程碑
      if (this.crossedMilestone(beforeState.health, afterState.health, [40, 70, 95])) {
        const milestone = this.getMilestoneLevel(afterState.health, [40, 70, 95]);
        await this.realtimeEvents.pushStateMilestone(petId, userId, {
          milestoneType: 'health',
          milestone: `健康等级${milestone}`,
          currentValue: afterState.health,
          previousValue: beforeState.health,
          achievement: this.getHealthAchievement(afterState.health),
          description: `宠物的健康状况达到了${afterState.health}点！`,
          reward: afterState.health >= 95 ? { type: 'bonus', value: '生命力增强' } : undefined,
          nextMilestone: this.getNextMilestone(afterState.health, [40, 70, 95])
        });
      }
    } catch (error) {
      this.logger.error(`Error checking state milestones for pet ${petId}:`, error);
    }
  }

  /**
   * 检查并推送演化机会事件
   */
  private async checkAndPushEvolutionOpportunity(petId: string, userId: string, analysisResult: any): Promise<void> {
    try {
      // 基于分析结果和随机因子决定是否触发演化机会
      const shouldTrigger = Math.random() < 0.15; // 15%的概率触发
      
      if (!shouldTrigger) return;

      const opportunityType = this.determineOpportunityType(analysisResult);
      const opportunity = this.generateEvolutionOpportunity(opportunityType, analysisResult);
      
      if (opportunity) {
        await this.realtimeEvents.pushEvolutionOpportunity(petId, userId, opportunity);
      }
    } catch (error) {
      this.logger.error(`Error checking evolution opportunity for pet ${petId}:`, error);
    }
  }

  /**
   * 辅助方法：检查是否跨越了里程碑
   */
  private crossedMilestone(oldValue: number, newValue: number, milestones: number[]): boolean {
    return milestones.some(milestone => 
      (oldValue < milestone && newValue >= milestone) || 
      (oldValue >= milestone && newValue < milestone)
    );
  }

  /**
   * 辅助方法：获取里程碑等级
   */
  private getMilestoneLevel(value: number, milestones: number[]): number {
    return milestones.filter(m => value >= m).length;
  }

  /**
   * 辅助方法：获取下一个里程碑
   */
  private getNextMilestone(value: number, milestones: number[]): string | undefined {
    const next = milestones.find(m => value < m);
    return next ? `${next}点` : undefined;
  }

  /**
   * 辅助方法：获取能量成就描述
   */
  private getEnergyAchievement(energy: number): string {
    if (energy >= 90) return '精力充沛';
    if (energy >= 75) return '活力四射';
    if (energy >= 50) return '精神饱满';
    if (energy >= 25) return '略显疲惫';
    return '需要休息';
  }

  /**
   * 辅助方法：获取心情成就描述
   */
  private getHappinessAchievement(happiness: number): string {
    if (happiness >= 85) return '心情愉悦';
    if (happiness >= 60) return '状态良好';
    if (happiness >= 30) return '情绪平稳';
    return '心情低落';
  }

  /**
   * 辅助方法：获取健康成就描述
   */
  private getHealthAchievement(health: number): string {
    if (health >= 95) return '身体强健';
    if (health >= 70) return '健康良好';
    if (health >= 40) return '基本健康';
    return '需要关注';
  }

  /**
   * 辅助方法：确定演化机会类型
   */
  private determineOpportunityType(analysisResult: any): 'personality_growth' | 'skill_development' | 'state_improvement' {
    const hasPersonalityInfluence = Object.keys(analysisResult.personalityInfluences || {}).length > 0;
    const hasStateInfluence = Object.keys(analysisResult.stateInfluences || {}).length > 0;
    const hasSkillExperience = (analysisResult.skillExperiences || []).length > 0;

    if (hasPersonalityInfluence) return 'personality_growth';
    if (hasSkillExperience) return 'skill_development';
    if (hasStateInfluence) return 'state_improvement';
    
    // 默认返回个性成长
    return 'personality_growth';
  }

  /**
   * 辅助方法：生成演化机会
   */
  private generateEvolutionOpportunity(
    type: 'personality_growth' | 'skill_development' | 'state_improvement',
    _analysisResult: any
  ): any {
    const opportunities = {
      personality_growth: {
        title: '个性成长机会',
        description: '通过深入的对话互动，宠物有机会进一步发展其个性特质',
        requirements: [{ trait: PersonalityTrait.OPENNESS, value: 60 }],
        reward: {
          type: '个性强化',
          description: '显著提升某项个性特质',
          impact: '永久性个性改变'
        },
        difficulty: 'medium' as const,
        interactionHint: '尝试进行更深层次的哲学或创造性对话'
      },
      skill_development: {
        title: '技能发展契机',
        description: '当前的学习状态非常适合技能提升，抓住这个机会吧！',
        requirements: [{ skill: 'communication', value: 50 }],
        reward: {
          type: '技能加速',
          description: '技能经验获取效率翻倍',
          impact: '加速技能树发展'
        },
        difficulty: 'easy' as const,
        interactionHint: '继续进行相关主题的对话和练习'
      },
      state_improvement: {
        title: '状态提升机会',
        description: '宠物的状态调整到了最佳范围，适合进行状态强化',
        requirements: [{ state: 'energy', value: 70 }],
        reward: {
          type: '状态增强',
          description: '获得临时状态加成',
          impact: '短期内状态衰减减缓'
        },
        difficulty: 'hard' as const,
        interactionHint: '进行高强度的互动活动'
      }
    };

    const opportunity = opportunities[type];
    return {
      ...opportunity,
      opportunityType: type,
      timeLimit: 300, // 5分钟时间限制
    };
  }
}