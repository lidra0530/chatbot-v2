import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

/**
 * 成本控制服务
 */
@Injectable()
export class CostControlService {
  private readonly logger = new Logger(CostControlService.name);
  
  // 用户请求频率记录
  private userRequestCounts = new Map<string, {
    count: number;
    windowStart: number;
    dailyTokens: number;
    dailyRequests: number;
    lastRequestTime: number;
  }>();
  
  // 全局成本统计
  private globalStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    dailyTokens: 0,
    dailyRequests: 0,
    dailyCost: 0,
    lastResetDate: new Date().toDateString(),
  };

  // 配置参数
  private readonly config = {
    // 频率限制配置
    rateLimit: {
      windowMs: 60 * 1000, // 1分钟窗口
      maxRequests: 20, // 每分钟最多20个请求
    },
    
    // 日用量限制
    dailyLimits: {
      maxTokensPerUser: 10000, // 每用户每日最多10000 tokens
      maxRequestsPerUser: 100, // 每用户每日最多100个请求
      maxGlobalTokens: 1000000, // 全局每日最多1M tokens
      maxGlobalRequests: 10000, // 全局每日最多10000个请求
    },
    
    // 成本配置（假设价格，实际需要根据API定价调整）
    pricing: {
      qwenTurbo: {
        inputTokenPrice: 0.001, // 每1000 input tokens的价格
        outputTokenPrice: 0.002, // 每1000 output tokens的价格
      }
    }
  };

  constructor() {
    // 每天午夜重置日统计
    this.scheduleDailyReset();
    // 每小时清理过期数据
    setInterval(() => this.cleanupExpiredData(), 60 * 60 * 1000);
  }

  /**
   * 检查用户是否可以发起请求
   */
  checkUserRateLimit(userId: string): boolean {
    const now = Date.now();
    const userStats = this.getUserStats(userId);
    
    // 检查频率限制
    if (now - userStats.windowStart >= this.config.rateLimit.windowMs) {
      // 重置窗口
      userStats.count = 0;
      userStats.windowStart = now;
    }
    
    if (userStats.count >= this.config.rateLimit.maxRequests) {
      this.logger.warn(`Rate limit exceeded for user ${userId}: ${userStats.count} requests in current window`);
      return false;
    }
    
    // 检查日请求限制
    if (userStats.dailyRequests >= this.config.dailyLimits.maxRequestsPerUser) {
      this.logger.warn(`Daily request limit exceeded for user ${userId}: ${userStats.dailyRequests} requests today`);
      return false;
    }
    
    // 检查日Token限制
    if (userStats.dailyTokens >= this.config.dailyLimits.maxTokensPerUser) {
      this.logger.warn(`Daily token limit exceeded for user ${userId}: ${userStats.dailyTokens} tokens today`);
      return false;
    }
    
    return true;
  }

  /**
   * 检查全局资源限制
   */
  checkGlobalLimits(): boolean {
    if (this.globalStats.dailyRequests >= this.config.dailyLimits.maxGlobalRequests) {
      this.logger.error(`Global daily request limit exceeded: ${this.globalStats.dailyRequests} requests today`);
      return false;
    }
    
    if (this.globalStats.dailyTokens >= this.config.dailyLimits.maxGlobalTokens) {
      this.logger.error(`Global daily token limit exceeded: ${this.globalStats.dailyTokens} tokens today`);
      return false;
    }
    
    return true;
  }

  /**
   * 验证请求是否可以执行
   */
  validateRequest(userId: string): void {
    if (!this.checkUserRateLimit(userId)) {
      throw new HttpException(
        '请求频率过高，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    
    if (!this.checkGlobalLimits()) {
      throw new HttpException(
        '系统繁忙，请稍后再试',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * 记录请求和Token使用
   */
  recordUsage(userId: string, tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }): void {
    const userStats = this.getUserStats(userId);
    const now = Date.now();
    
    // 更新用户统计
    userStats.count++;
    userStats.dailyRequests++;
    userStats.dailyTokens += tokenUsage.totalTokens;
    userStats.lastRequestTime = now;
    
    // 更新全局统计
    this.globalStats.totalRequests++;
    this.globalStats.totalTokens += tokenUsage.totalTokens;
    this.globalStats.dailyRequests++;
    this.globalStats.dailyTokens += tokenUsage.totalTokens;
    
    // 计算成本
    const cost = this.calculateCost(tokenUsage);
    this.globalStats.totalCost += cost;
    this.globalStats.dailyCost += cost;
    
    this.logger.debug(`Usage recorded for user ${userId}: ${tokenUsage.totalTokens} tokens, $${cost.toFixed(4)} cost`);
  }

  /**
   * 计算Token成本
   */
  calculateCost(tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }): number {
    const pricing = this.config.pricing.qwenTurbo;
    
    const inputCost = (tokenUsage.promptTokens / 1000) * pricing.inputTokenPrice;
    const outputCost = (tokenUsage.completionTokens / 1000) * pricing.outputTokenPrice;
    
    return inputCost + outputCost;
  }

  /**
   * 获取用户统计
   */
  getUserUsageStats(userId: string): any {
    const userStats = this.getUserStats(userId);
    // const now = Date.now();
    
    return {
      userId,
      currentWindow: {
        requests: userStats.count,
        windowStart: new Date(userStats.windowStart).toISOString(),
        maxRequests: this.config.rateLimit.maxRequests,
        remainingRequests: Math.max(0, this.config.rateLimit.maxRequests - userStats.count),
      },
      daily: {
        requests: userStats.dailyRequests,
        tokens: userStats.dailyTokens,
        maxRequests: this.config.dailyLimits.maxRequestsPerUser,
        maxTokens: this.config.dailyLimits.maxTokensPerUser,
        remainingRequests: Math.max(0, this.config.dailyLimits.maxRequestsPerUser - userStats.dailyRequests),
        remainingTokens: Math.max(0, this.config.dailyLimits.maxTokensPerUser - userStats.dailyTokens),
      },
      lastRequestTime: userStats.lastRequestTime ? new Date(userStats.lastRequestTime).toISOString() : null,
    };
  }

  /**
   * 获取全局统计
   */
  getGlobalStats(): any {
    return {
      ...this.globalStats,
      limits: this.config.dailyLimits,
      pricing: this.config.pricing,
      remainingGlobalRequests: Math.max(0, this.config.dailyLimits.maxGlobalRequests - this.globalStats.dailyRequests),
      remainingGlobalTokens: Math.max(0, this.config.dailyLimits.maxGlobalTokens - this.globalStats.dailyTokens),
      avgCostPerRequest: this.globalStats.totalRequests > 0 ? this.globalStats.totalCost / this.globalStats.totalRequests : 0,
      avgTokensPerRequest: this.globalStats.totalRequests > 0 ? this.globalStats.totalTokens / this.globalStats.totalRequests : 0,
    };
  }

  /**
   * 获取成本报告
   */
  getCostReport(): any {
    const global = this.getGlobalStats();
    
    return {
      summary: {
        totalCost: global.totalCost,
        dailyCost: global.dailyCost,
        avgCostPerRequest: global.avgCostPerRequest,
        totalTokens: global.totalTokens,
        dailyTokens: global.dailyTokens,
        avgTokensPerRequest: global.avgTokensPerRequest,
      },
      limits: {
        dailyRequestsUsage: `${global.dailyRequests}/${global.limits.maxGlobalRequests}`,
        dailyTokensUsage: `${global.dailyTokens}/${global.limits.maxGlobalTokens}`,
        requestsUsagePercent: (global.dailyRequests / global.limits.maxGlobalRequests) * 100,
        tokensUsagePercent: (global.dailyTokens / global.limits.maxGlobalTokens) * 100,
      },
      projections: {
        projectedDailyCost: this.projectDailyCost(),
        projectedMonthlyCost: this.projectMonthlyCost(),
      },
      recommendations: this.getCostRecommendations(global),
    };
  }

  /**
   * 更新用户限制
   */
  updateUserLimits(userId: string, limits: {
    maxDailyRequests?: number;
    maxDailyTokens?: number;
  }): void {
    // 这里可以实现用户特定的限制
    this.logger.log(`Updated limits for user ${userId}:`, limits);
  }

  /**
   * 重置日统计
   */
  resetDailyStats(): void {
    // 重置全局日统计
    this.globalStats.dailyRequests = 0;
    this.globalStats.dailyTokens = 0;
    this.globalStats.dailyCost = 0;
    this.globalStats.lastResetDate = new Date().toDateString();
    
    // 重置所有用户的日统计
    for (const [_userId, stats] of this.userRequestCounts) {
      stats.dailyRequests = 0;
      stats.dailyTokens = 0;
    }
    
    this.logger.log('Daily stats reset completed');
  }

  /**
   * 获取用户统计（内部方法）
   */
  private getUserStats(userId: string): any {
    if (!this.userRequestCounts.has(userId)) {
      this.userRequestCounts.set(userId, {
        count: 0,
        windowStart: Date.now(),
        dailyTokens: 0,
        dailyRequests: 0,
        lastRequestTime: 0,
      });
    }
    
    return this.userRequestCounts.get(userId)!;
  }

  /**
   * 安排每日重置
   */
  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyStats();
      // 设置每24小时重置一次
      setInterval(() => this.resetDailyStats(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * 清理过期数据
   */
  private cleanupExpiredData(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let cleaned = 0;
    
    for (const [userId, stats] of this.userRequestCounts) {
      if (stats.lastRequestTime < oneWeekAgo) {
        this.userRequestCounts.delete(userId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired user records`);
    }
  }

  /**
   * 预测每日成本
   */
  private projectDailyCost(): number {
    const currentHour = new Date().getHours();
    if (currentHour === 0) return this.globalStats.dailyCost;
    
    const hoursElapsed = currentHour + (new Date().getMinutes() / 60);
    const projectedCost = (this.globalStats.dailyCost / hoursElapsed) * 24;
    
    return projectedCost;
  }

  /**
   * 预测每月成本
   */
  private projectMonthlyCost(): number {
    const dailyProjection = this.projectDailyCost();
    return dailyProjection * 30;
  }

  /**
   * 获取成本建议
   */
  private getCostRecommendations(global: any): string[] {
    const recommendations: string[] = [];
    
    if (global.limits.tokensUsagePercent > 80) {
      recommendations.push('日Token使用量接近限制，建议增加缓存或优化Prompt');
    }
    
    if (global.avgCostPerRequest > 0.01) {
      recommendations.push('平均请求成本较高，建议优化Token使用');
    }
    
    if (global.avgTokensPerRequest > 1000) {
      recommendations.push('平均请求Token数量较高，建议优化Prompt长度');
    }
    
    return recommendations;
  }
}