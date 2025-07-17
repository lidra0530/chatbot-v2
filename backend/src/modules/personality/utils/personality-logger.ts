import { Logger } from '@nestjs/common';

/**
 * 个性系统专用日志工具
 * 提供统一的日志格式和结构化数据记录
 */
export class PersonalityLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(`Personality:${context}`);
  }

  /**
   * 性能监控日志
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata: {
      entityId?: string;
      success: boolean;
      dataSize?: number;
      cacheHit?: boolean;
      databaseQueries?: number;
      [key: string]: any;
    }
  ): void {
    const perfData = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      performance: {
        executionTime: duration,
        success: metadata.success,
        ...(metadata.dataSize && { dataSize: metadata.dataSize }),
        ...(metadata.cacheHit !== undefined && { cacheHit: metadata.cacheHit }),
        ...(metadata.databaseQueries && { databaseQueries: metadata.databaseQueries })
      },
      ...(metadata.entityId && { entityId: metadata.entityId }),
      ...this.filterMetadata(metadata, ['success', 'dataSize', 'cacheHit', 'databaseQueries', 'entityId'])
    };

    if (metadata.success) {
      this.logger.log(`✅ ${operation} completed`, perfData);
    } else {
      this.logger.warn(`⚠️ ${operation} failed`, perfData);
    }
  }

  /**
   * 业务逻辑日志
   */
  logBusiness(
    level: 'debug' | 'log' | 'warn' | 'error',
    event: string,
    context: {
      entityId?: string;
      userId?: string;
      operation?: string;
      businessData?: Record<string, any>;
      [key: string]: any;
    }
  ): void {
    const businessData = {
      event,
      timestamp: new Date().toISOString(),
      context: {
        ...(context.entityId && { entityId: context.entityId }),
        ...(context.userId && { userId: context.userId }),
        ...(context.operation && { operation: context.operation }),
        ...this.filterMetadata(context, ['entityId', 'userId', 'operation', 'businessData'])
      },
      ...(context.businessData && { businessData: context.businessData })
    };

    const message = `🎯 ${event}`;
    
    switch (level) {
      case 'debug':
        this.logger.debug(message, businessData);
        break;
      case 'log':
        this.logger.log(message, businessData);
        break;
      case 'warn':
        this.logger.warn(message, businessData);
        break;
      case 'error':
        this.logger.error(message, businessData);
        break;
    }
  }

  /**
   * 调用链追踪日志
   */
  logTrace(
    operation: string,
    phase: 'start' | 'progress' | 'complete' | 'error',
    context: {
      traceId?: string;
      parentTraceId?: string;
      entityId?: string;
      step?: string;
      progress?: number;
      error?: Error;
      [key: string]: any;
    }
  ): void {
    const traceData = {
      operation,
      phase,
      timestamp: new Date().toISOString(),
      trace: {
        traceId: context.traceId || this.generateTraceId(),
        ...(context.parentTraceId && { parentTraceId: context.parentTraceId }),
        ...(context.step && { step: context.step }),
        ...(context.progress !== undefined && { progress: context.progress })
      },
      ...(context.entityId && { entityId: context.entityId }),
      ...(context.error && { 
        error: {
          message: context.error.message,
          name: context.error.name,
          stack: context.error.stack
        }
      }),
      ...this.filterMetadata(context, ['traceId', 'parentTraceId', 'entityId', 'step', 'progress', 'error'])
    };

    const phaseIcon = {
      start: '🚀',
      progress: '⏳',
      complete: '✅',
      error: '❌'
    };

    const message = `${phaseIcon[phase]} ${operation} - ${phase}`;

    switch (phase) {
      case 'start':
      case 'progress':
        this.logger.debug(message, traceData);
        break;
      case 'complete':
        this.logger.log(message, traceData);
        break;
      case 'error':
        this.logger.error(message, traceData);
        break;
    }
  }

  /**
   * 缓存操作日志
   */
  logCache(
    operation: 'get' | 'set' | 'invalidate' | 'miss' | 'hit' | 'preload',
    key: string,
    context: {
      entityId?: string;
      ttl?: number;
      size?: number;
      strategy?: string;
      success?: boolean;
      [key: string]: any;
    }
  ): void {
    const cacheData = {
      operation,
      key,
      timestamp: new Date().toISOString(),
      cache: {
        operation,
        key,
        ...(context.ttl && { ttl: context.ttl }),
        ...(context.size && { size: context.size }),
        ...(context.strategy && { strategy: context.strategy }),
        success: context.success !== false // 默认为true，除非明确指定为false
      },
      ...(context.entityId && { entityId: context.entityId }),
      ...this.filterMetadata(context, ['ttl', 'size', 'strategy', 'success', 'entityId'])
    };

    const operationIcon = {
      get: '🔍',
      set: '💾',
      invalidate: '🗑️',
      miss: '❌',
      hit: '✅',
      preload: '⚡'
    };

    const message = `${operationIcon[operation]} Cache ${operation}: ${key}`;

    if (operation === 'miss' || context.success === false) {
      this.logger.debug(message, cacheData);
    } else {
      this.logger.debug(message, cacheData);
    }
  }

  /**
   * 数据库操作日志
   */
  logDatabase(
    operation: string,
    table: string,
    context: {
      entityId?: string;
      queryType?: 'select' | 'insert' | 'update' | 'delete' | 'transaction';
      duration?: number;
      recordsAffected?: number;
      batchSize?: number;
      error?: Error;
      [key: string]: any;
    }
  ): void {
    const dbData = {
      operation,
      table,
      timestamp: new Date().toISOString(),
      database: {
        table,
        operation,
        ...(context.queryType && { queryType: context.queryType }),
        ...(context.duration && { duration: context.duration }),
        ...(context.recordsAffected !== undefined && { recordsAffected: context.recordsAffected }),
        ...(context.batchSize && { batchSize: context.batchSize })
      },
      ...(context.entityId && { entityId: context.entityId }),
      ...(context.error && {
        error: {
          message: context.error.message,
          name: context.error.name
        }
      }),
      ...this.filterMetadata(context, ['queryType', 'duration', 'recordsAffected', 'batchSize', 'error', 'entityId'])
    };

    const message = `🗃️ Database ${operation} on ${table}`;

    if (context.error) {
      this.logger.error(message, dbData);
    } else if (context.duration && context.duration > 1000) {
      this.logger.warn(`${message} (slow query)`, dbData);
    } else {
      this.logger.debug(message, dbData);
    }
  }

  /**
   * 个性演化事件日志
   */
  logEvolution(
    event: 'increment' | 'analysis' | 'calculation' | 'update' | 'trigger',
    petId: string,
    context: {
      evolutionType?: string;
      traitChanges?: Record<string, number>;
      impactScore?: number;
      significance?: string;
      duration?: number;
      success?: boolean;
      [key: string]: any;
    }
  ): void {
    const evolutionData = {
      event,
      petId,
      timestamp: new Date().toISOString(),
      evolution: {
        event,
        petId,
        ...(context.evolutionType && { evolutionType: context.evolutionType }),
        ...(context.traitChanges && { traitChanges: context.traitChanges }),
        ...(context.impactScore !== undefined && { impactScore: context.impactScore }),
        ...(context.significance && { significance: context.significance }),
        success: context.success !== false
      },
      ...(context.duration && { performance: { duration: context.duration } }),
      ...this.filterMetadata(context, ['evolutionType', 'traitChanges', 'impactScore', 'significance', 'duration', 'success'])
    };

    const eventIcon = {
      increment: '📈',
      analysis: '🔬',
      calculation: '🧮',
      update: '🔄',
      trigger: '🎯'
    };

    const message = `${eventIcon[event]} Evolution ${event} for pet ${petId}`;

    if (context.success === false) {
      this.logger.error(message, evolutionData);
    } else {
      this.logger.log(message, evolutionData);
    }
  }

  /**
   * 批量操作日志
   */
  logBatch(
    operation: string,
    context: {
      batchId?: string;
      itemCount: number;
      successCount?: number;
      failureCount?: number;
      duration?: number;
      batchSize?: number;
      [key: string]: any;
    }
  ): void {
    const batchData = {
      operation,
      timestamp: new Date().toISOString(),
      batch: {
        operation,
        itemCount: context.itemCount,
        ...(context.batchId && { batchId: context.batchId }),
        ...(context.successCount !== undefined && { successCount: context.successCount }),
        ...(context.failureCount !== undefined && { failureCount: context.failureCount }),
        ...(context.batchSize && { batchSize: context.batchSize })
      },
      ...(context.duration && { performance: { duration: context.duration } }),
      ...this.filterMetadata(context, ['batchId', 'itemCount', 'successCount', 'failureCount', 'duration', 'batchSize'])
    };

    const message = `📦 Batch ${operation} - ${context.itemCount} items`;

    if (context.failureCount && context.failureCount > 0) {
      this.logger.warn(message, batchData);
    } else {
      this.logger.log(message, batchData);
    }
  }

  /**
   * 创建子日志器（用于追踪调用链）
   */
  createChild(childContext: string): PersonalityLogger {
    return new PersonalityLogger(`${this.getContextName()}:${childContext}`);
  }
  
  private getContextName(): string {
    // 从日志器实例中获取上下文名称
    return this.logger.constructor.name.replace('Logger', '') || 'Personality';
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 过滤元数据，移除已处理的字段
   */
  private filterMetadata(metadata: Record<string, any>, excludeKeys: string[]): Record<string, any> {
    const filtered: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (!excludeKeys.includes(key) && value !== undefined) {
        filtered[key] = value;
      }
    }
    
    return filtered;
  }

  /**
   * 获取原始Logger实例（用于特殊情况）
   */
  getRawLogger(): Logger {
    return this.logger;
  }

  /**
   * 直接日志方法（向后兼容）
   */
  debug(message: string, context?: any): void {
    this.logger.debug(message, context);
  }

  log(message: string, context?: any): void {
    this.logger.log(message, context);
  }

  warn(message: string, context?: any): void {
    this.logger.warn(message, context);
  }

  error(message: string, context?: any): void {
    this.logger.error(message, context);
  }
}