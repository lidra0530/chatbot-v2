export const TASK_SCHEDULER_CONFIG = {
  // 个性演化任务配置
  personalityEvolution: {
    // 批量处理定时任务 - 每2小时执行一次
    batchProcessingCron: '0 */2 * * *',
    
    // 分析更新定时任务 - 每6小时执行一次
    analyticsUpdateCron: '0 */6 * * *',
    
    // 批量处理相关配置
    batchSize: 10,
    batchDelay: 1000, // 1秒
    
    // 重试配置
    maxRetries: 3,
    retryDelay: 1000, // 1秒
    exponentialBackoff: true,
    
    // 超时配置
    processTimeout: 30000, // 30秒
    
    // 性能监控配置
    enablePerformanceMonitoring: true,
    logDetailedMetrics: true,
  },
  
  // 健康检查配置
  healthCheck: {
    // 健康检查间隔 - 每5分钟
    interval: '*/5 * * * *',
    
    // 健康状态阈值
    thresholds: {
      databaseResponseTime: 1000, // 1秒
      errorRate: 10, // 10%
      memoryUsage: 85, // 85%
      lastRunTimeLimit: 4 * 60 * 60 * 1000, // 4小时
    },
    
    // 告警配置
    alerts: {
      consecutiveUnhealthyLimit: 3,
      enableCriticalAlerts: true,
      enableDegradedAlerts: true,
    },
    
    // 历史记录配置
    historySize: 100,
    detailedReportSize: 24,
  },
  
  // 任务监控配置
  monitoring: {
    // 启用详细日志
    enableDetailedLogging: true,
    
    // 性能指标收集
    collectPerformanceMetrics: true,
    
    // 错误追踪
    enableErrorTracking: true,
    
    // 统计信息
    enableStatistics: true,
  },
  
  // 数据库优化配置
  database: {
    // 查询优化
    queryTimeout: 10000, // 10秒
    
    // 连接池配置
    maxConnections: 10,
    
    // 批量操作配置
    batchInsertSize: 100,
    
    // 索引优化
    enableIndexHints: true,
  },
  
  // 缓存配置
  cache: {
    // 启用缓存
    enabled: true,
    
    // TTL配置
    defaultTTL: 5 * 60 * 1000, // 5分钟
    
    // 缓存键前缀
    keyPrefix: 'task_cache:',
    
    // 最大缓存大小
    maxSize: 1000,
  },
  
  // 限流配置
  rateLimit: {
    // 启用限流
    enabled: true,
    
    // 每分钟最大请求数
    maxRequestsPerMinute: 100,
    
    // 突发请求限制
    burstLimit: 20,
  },
  
  // 环境相关配置
  environment: {
    // 是否为生产环境
    isProduction: process.env.NODE_ENV === 'production',
    
    // 日志级别
    logLevel: process.env.LOG_LEVEL || 'info',
    
    // 调试模式
    debugMode: process.env.DEBUG_MODE === 'true',
  },
};

// 配置验证函数
export function validateTaskSchedulerConfig(config: typeof TASK_SCHEDULER_CONFIG) {
  
  const errors: string[] = [];
  
  // 验证数值配置
  if (config.personalityEvolution.batchSize <= 0) {
    errors.push('Batch size must be greater than 0');
  }
  
  if (config.personalityEvolution.maxRetries < 0) {
    errors.push('Max retries must be non-negative');
  }
  
  if (config.healthCheck.thresholds.errorRate < 0 || config.healthCheck.thresholds.errorRate > 100) {
    errors.push('Error rate threshold must be between 0 and 100');
  }
  
  if (config.healthCheck.thresholds.memoryUsage < 0 || config.healthCheck.thresholds.memoryUsage > 100) {
    errors.push('Memory usage threshold must be between 0 and 100');
  }
  
  if (errors.length > 0) {
    throw new Error(`Task scheduler configuration validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

// 获取环境特定配置
export function getEnvironmentConfig() {
  const baseConfig = TASK_SCHEDULER_CONFIG;
  
  if (baseConfig.environment.isProduction) {
    return {
      ...baseConfig,
      personalityEvolution: {
        ...baseConfig.personalityEvolution,
        logDetailedMetrics: false,
      },
      monitoring: {
        ...baseConfig.monitoring,
        enableDetailedLogging: false,
      },
      healthCheck: {
        ...baseConfig.healthCheck,
        interval: '*/10 * * * *', // 生产环境中每10分钟检查一次
      },
    };
  }
  
  return baseConfig;
}