import { Injectable, ForbiddenException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { PersonalityService } from '../personality/personality.service';
import { QwenLLMService } from '../../services/qwen-llm.service';
import { ChatPerformanceMonitor } from '../../common/monitoring/chat-performance.monitor';
import { ChatCacheService } from '../../common/cache/chat-cache.service';
import { CostControlService } from '../../common/cost-control/cost-control.service';
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
  ) {
    this.logger.log('ChatService initialized with LLM integration, performance monitoring, caching and cost control');
  }

  async processChat(userId: string, dto: ChatCompletionDto): Promise<ChatResponseDto> {
    const { petId, conversationId, message } = dto;
    const requestStartTime = Date.now();
    
    try {
      // 1. 成本控制和频率限制检查
      this.costControlService.validateRequest(userId);
      
      // 2. 验证用户权限和宠物所有权
      const pet = await this.validateUserPetAccess(userId, petId);
      
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
            originalTimestamp: cachedAnswer.timestamp,
            responseTime: totalResponseTime,
          },
        };
      }
      
      // 3. 获取宠物个性和状态
      const personality = await this.personalityService.getPersonalityDetails(petId);
      const currentState = await this.getPetState(petId);
      
      // 4. 构建个性化系统提示词（使用缓存）
      let systemPrompt = this.cacheService.getPersonalityPrompt(petId, personality);
      if (!systemPrompt) {
        systemPrompt = this.buildPersonalizedPrompt(pet, personality, currentState);
        this.cacheService.cachePersonalityPrompt(petId, personality, systemPrompt);
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
      
      // 14. 构建并返回响应
      const response = this.buildChatResponse(aiMessage, llmResponse, conversation.id);
      
      // 15. 记录成本控制使用情况
      if (llmResponse.usage) {
        this.costControlService.recordUsage(userId, llmResponse.usage);
      }
      
      // 16. 记录性能指标
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
   * 获取宠物状态
   */
  private async getPetState(petId: string): Promise<any> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { currentState: true }
    });

    return pet?.currentState || {
      basic: { mood: 70, energy: 80, hunger: 60, health: 90 },
      advanced: { curiosity: 65, socialDesire: 55, creativity: 60, focusLevel: 70 }
    };
  }

  /**
   * 构建个性化系统提示词
   */
  private buildPersonalizedPrompt(pet: any, personality: any, state: any): string {
    const traits = personality.traits || {};
    const basicState = state.basic || {};
    
    return `你是${pet.name}，一个独特的AI虚拟宠物助手。

## 你的个性特质 (影响你的回复风格)
- 开放性: ${traits.openness || 50}/100 ${this.getTraitDescription('openness', traits.openness || 50)}
- 尽责性: ${traits.conscientiousness || 50}/100 ${this.getTraitDescription('conscientiousness', traits.conscientiousness || 50)}
- 外向性: ${traits.extraversion || 50}/100 ${this.getTraitDescription('extraversion', traits.extraversion || 50)}
- 亲和性: ${traits.agreeableness || 50}/100 ${this.getTraitDescription('agreeableness', traits.agreeableness || 50)}
- 神经质: ${traits.neuroticism || 30}/100 ${this.getTraitDescription('neuroticism', traits.neuroticism || 30)}

## 你的当前状态 (影响你的情绪和反应)
- 心情: ${basicState.mood || 70}/100
- 精力: ${basicState.energy || 80}/100
- 饥饿度: ${basicState.hunger || 60}/100
- 健康状况: ${basicState.health || 90}/100

## 行为指南
请根据你的个性特质和当前状态来回应用户。高开放性时更愿意探讨新想法，高外向性时更活泼健谈，
低精力时回复可能更简短，心情好时更积极乐观。保持自然、友好，像真正的宠物伙伴一样。
请用中文回复，语气要符合你的个性特质。`;
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
  private buildChatResponse(aiMessage: any, llmResponse: any, conversationId: string): ChatResponseDto {
    return {
      id: aiMessage.id,
      conversationId,
      message: aiMessage.content,
      timestamp: aiMessage.createdAt,
      metadata: {
        model: llmResponse.model,
        usage: llmResponse.usage,
        responseTime: llmResponse.responseTime,
        personalityInfluence: aiMessage.personalitySnapshot,
        stateInfluence: aiMessage.stateSnapshot,
      },
    };
  }

  /**
   * 获取特质描述
   */
  private getTraitDescription(trait: string, value: number): string {
    const descriptions: Record<string, Record<string, string>> = {
      openness: {
        high: "好奇心强，喜欢探索新想法和创意话题",
        medium: "对新事物保持适度的开放态度", 
        low: "偏好熟悉的话题，较为保守"
      },
      conscientiousness: {
        high: "做事认真细致，有条理性",
        medium: "在规划和执行上表现适中",
        low: "比较随性，不太在意细节"
      },
      extraversion: {
        high: "活泼外向，喜欢社交和表达",
        medium: "在社交上表现适中",
        low: "内向安静，喜欢深入思考"
      },
      agreeableness: {
        high: "友善合作，富有同情心",
        medium: "在人际关系上表现平衡",
        low: "比较直接，不太顾及他人感受"
      },
      neuroticism: {
        high: "情绪波动较大，容易焦虑",
        medium: "情绪稳定性适中",
        low: "情绪稳定，不易受外界影响"
      }
    };
    
    const level = value >= 70 ? 'high' : value >= 40 ? 'medium' : 'low';
    return descriptions[trait]?.[level] || '表现正常';
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
}