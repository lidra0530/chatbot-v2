import { Injectable, Logger } from '@nestjs/common';

/**
 * 聊天性能监控服务
 */
@Injectable()
export class ChatPerformanceMonitor {
  private readonly logger = new Logger(ChatPerformanceMonitor.name);
  
  // 性能指标存储
  private metrics = {
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
    totalResponseTime: 0,
    responseTimeHistogram: new Map<string, number>(),
    hourlyStats: new Map<string, {
      requests: number;
      avgResponseTime: number;
      errorRate: number;
    }>(),
    dailyStats: new Map<string, {
      requests: number;
      avgResponseTime: number;
      errorRate: number;
      totalTokens: number;
    }>()
  };

  /**
   * 记录聊天请求性能
   */
  recordChatRequest(responseTime: number, success: boolean, tokens?: number): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successRequests++;
    } else {
      this.metrics.errorRequests++;
    }
    
    this.metrics.totalResponseTime += responseTime;
    
    // 响应时间分布
    const timeRange = this.getTimeRange(responseTime);
    this.metrics.responseTimeHistogram.set(
      timeRange,
      (this.metrics.responseTimeHistogram.get(timeRange) || 0) + 1
    );
    
    // 小时级统计
    this.updateHourlyStats(responseTime, success);
    
    // 日级统计
    this.updateDailyStats(responseTime, success, tokens);
    
    // 记录性能日志
    this.logPerformanceMetrics(responseTime, success);
  }

  /**
   * 获取实时性能指标
   */
  getPerformanceMetrics(): any {
    const avgResponseTime = this.metrics.totalRequests > 0 
      ? this.metrics.totalResponseTime / this.metrics.totalRequests 
      : 0;
    
    const errorRate = this.metrics.totalRequests > 0 
      ? (this.metrics.errorRequests / this.metrics.totalRequests) * 100 
      : 0;
    
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successRequests / this.metrics.totalRequests) * 100 
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      successRequests: this.metrics.successRequests,
      errorRequests: this.metrics.errorRequests,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      responseTimeDistribution: Object.fromEntries(this.metrics.responseTimeHistogram),
      hourlyStats: this.getRecentHourlyStats(),
      dailyStats: this.getRecentDailyStats(),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 获取详细的性能报告
   */
  getDetailedReport(): any {
    const basic = this.getPerformanceMetrics();
    
    return {
      ...basic,
      performanceGrade: this.calculatePerformanceGrade(basic),
      recommendations: this.getPerformanceRecommendations(basic),
      alerts: this.getPerformanceAlerts(basic)
    };
  }

  /**
   * 重置性能指标
   */
  resetMetrics(): void {
    this.metrics.totalRequests = 0;
    this.metrics.successRequests = 0;
    this.metrics.errorRequests = 0;
    this.metrics.totalResponseTime = 0;
    this.metrics.responseTimeHistogram.clear();
    this.metrics.hourlyStats.clear();
    this.metrics.dailyStats.clear();
    
    this.logger.log('Performance metrics reset');
  }

  /**
   * 获取时间范围分类
   */
  private getTimeRange(responseTime: number): string {
    if (responseTime < 1000) return '< 1s';
    if (responseTime < 2000) return '1-2s';
    if (responseTime < 3000) return '2-3s';
    if (responseTime < 5000) return '3-5s';
    if (responseTime < 10000) return '5-10s';
    return '> 10s';
  }

  /**
   * 更新小时级统计
   */
  private updateHourlyStats(responseTime: number, success: boolean): void {
    const hour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
    
    if (!this.metrics.hourlyStats.has(hour)) {
      this.metrics.hourlyStats.set(hour, {
        requests: 0,
        avgResponseTime: 0,
        errorRate: 0
      });
    }
    
    const stats = this.metrics.hourlyStats.get(hour)!;
    stats.requests++;
    stats.avgResponseTime = (stats.avgResponseTime * (stats.requests - 1) + responseTime) / stats.requests;
    stats.errorRate = success ? stats.errorRate : (stats.errorRate * (stats.requests - 1) + 1) / stats.requests;
  }

  /**
   * 更新日级统计
   */
  private updateDailyStats(responseTime: number, success: boolean, tokens?: number): void {
    const day = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
    
    if (!this.metrics.dailyStats.has(day)) {
      this.metrics.dailyStats.set(day, {
        requests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        totalTokens: 0
      });
    }
    
    const stats = this.metrics.dailyStats.get(day)!;
    stats.requests++;
    stats.avgResponseTime = (stats.avgResponseTime * (stats.requests - 1) + responseTime) / stats.requests;
    stats.errorRate = success ? stats.errorRate : (stats.errorRate * (stats.requests - 1) + 1) / stats.requests;
    stats.totalTokens += tokens || 0;
  }

  /**
   * 获取最近的小时级统计
   */
  private getRecentHourlyStats(): any {
    const hours = Array.from(this.metrics.hourlyStats.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 24);
    
    return Object.fromEntries(hours);
  }

  /**
   * 获取最近的日级统计
   */
  private getRecentDailyStats(): any {
    const days = Array.from(this.metrics.dailyStats.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7);
    
    return Object.fromEntries(days);
  }

  /**
   * 计算性能等级
   */
  private calculatePerformanceGrade(metrics: any): string {
    let score = 100;
    
    // 错误率扣分
    if (metrics.errorRate > 5) score -= 30;
    else if (metrics.errorRate > 1) score -= 15;
    
    // 响应时间扣分
    if (metrics.avgResponseTime > 5000) score -= 30;
    else if (metrics.avgResponseTime > 3000) score -= 15;
    else if (metrics.avgResponseTime > 2000) score -= 10;
    
    // 成功率加分
    if (metrics.successRate > 99) score += 10;
    else if (metrics.successRate > 95) score += 5;
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取性能建议
   */
  private getPerformanceRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.errorRate > 5) {
      recommendations.push('错误率过高，需要检查API稳定性和错误处理');
    }
    
    if (metrics.avgResponseTime > 5000) {
      recommendations.push('响应时间过长，建议优化LLM调用或添加缓存');
    } else if (metrics.avgResponseTime > 3000) {
      recommendations.push('响应时间偏长，考虑优化数据库查询或添加缓存');
    }
    
    if (metrics.successRate < 95) {
      recommendations.push('成功率偏低，需要改进错误处理和重试机制');
    }
    
    return recommendations;
  }

  /**
   * 获取性能告警
   */
  private getPerformanceAlerts(metrics: any): string[] {
    const alerts: string[] = [];
    
    if (metrics.errorRate > 10) {
      alerts.push('🚨 严重：错误率超过10%');
    }
    
    if (metrics.avgResponseTime > 10000) {
      alerts.push('🚨 严重：平均响应时间超过10秒');
    }
    
    if (metrics.successRate < 90) {
      alerts.push('⚠️ 警告：成功率低于90%');
    }
    
    return alerts;
  }

  /**
   * 记录性能日志
   */
  private logPerformanceMetrics(responseTime: number, success: boolean): void {
    // 只记录异常情况
    if (!success) {
      this.logger.warn(`Chat request failed, response time: ${responseTime}ms`);
    } else if (responseTime > 5000) {
      this.logger.warn(`Slow chat response: ${responseTime}ms`);
    }
    
    // 每100个请求记录一次统计
    if (this.metrics.totalRequests % 100 === 0) {
      const stats = this.getPerformanceMetrics();
      this.logger.log(`Performance Stats - Requests: ${stats.totalRequests}, ` +
        `Avg Response: ${stats.avgResponseTime}ms, Success Rate: ${stats.successRate}%`);
    }
  }
}