import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 个性系统基础错误类
 */
export abstract class PersonalityError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: HttpStatus;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为HTTP异常
   */
  toHttpException(): HttpException {
    return new HttpException(
      {
        error: this.name,
        code: this.code,
        message: this.message,
        context: this.context,
        timestamp: this.timestamp.toISOString(),
      },
      this.httpStatus,
    );
  }
}

/**
 * 输入验证错误
 */
export class PersonalityValidationError extends PersonalityError {
  readonly code = 'PERSONALITY_VALIDATION_ERROR';
  readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(message: string, context?: Record<string, any>) {
    super(`Validation error: ${message}`, context);
  }
}

/**
 * 宠物未找到错误
 */
export class PetNotFoundError extends PersonalityError {
  readonly code = 'PET_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(petId: string, context?: Record<string, any>) {
    super(`Pet with id ${petId} not found`, { petId, ...context });
  }
}

/**
 * 演化计算错误
 */
export class EvolutionCalculationError extends PersonalityError {
  readonly code = 'EVOLUTION_CALCULATION_ERROR';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

  constructor(message: string, context?: Record<string, any>) {
    super(`Evolution calculation failed: ${message}`, context);
  }
}

/**
 * 缓存操作错误
 */
export class CacheOperationError extends PersonalityError {
  readonly code = 'CACHE_OPERATION_ERROR';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

  constructor(operation: string, message: string, context?: Record<string, any>) {
    super(`Cache ${operation} failed: ${message}`, { operation, ...context });
  }
}

/**
 * 数据库操作错误
 */
export class DatabaseOperationError extends PersonalityError {
  readonly code = 'DATABASE_OPERATION_ERROR';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

  constructor(operation: string, message: string, context?: Record<string, any>) {
    super(`Database ${operation} failed: ${message}`, { operation, ...context });
  }
}

/**
 * 并发冲突错误
 */
export class ConcurrencyConflictError extends PersonalityError {
  readonly code = 'CONCURRENCY_CONFLICT_ERROR';
  readonly httpStatus = HttpStatus.CONFLICT;

  constructor(resource: string, message: string, context?: Record<string, any>) {
    super(`Concurrency conflict on ${resource}: ${message}`, { resource, ...context });
  }
}

/**
 * 分析数据错误
 */
export class AnalysisDataError extends PersonalityError {
  readonly code = 'ANALYSIS_DATA_ERROR';
  readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(message: string, context?: Record<string, any>) {
    super(`Analysis data error: ${message}`, context);
  }
}

/**
 * 批量操作错误
 */
export class BatchOperationError extends PersonalityError {
  readonly code = 'BATCH_OPERATION_ERROR';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

  constructor(operation: string, message: string, context?: Record<string, any>) {
    super(`Batch ${operation} failed: ${message}`, { operation, ...context });
  }
}

/**
 * 错误处理工具类
 */
export class PersonalityErrorHandler {
  /**
   * 包装异步操作，统一错误处理
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    context: {
      operationType: string;
      entityId?: string;
      additionalContext?: Record<string, any>;
    },
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PersonalityError) {
        // 重新抛出已知的业务错误
        throw error;
      }

      // 处理未知错误
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          throw new ConcurrencyConflictError(
            context.entityId || 'unknown',
            'Resource already exists or in use',
            { originalError: error.message, ...context },
          );
        }

        if (error.message.includes('Record to update not found')) {
          throw new PetNotFoundError(
            context.entityId || 'unknown',
            { originalError: error.message, ...context },
          );
        }

        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
          throw new DatabaseOperationError(
            context.operationType,
            'Operation timed out',
            { originalError: error.message, ...context },
          );
        }

        // 默认包装为系统错误
        throw new DatabaseOperationError(
          context.operationType,
          error.message,
          { originalError: error.message, ...context },
        );
      }

      // 处理非Error类型的异常
      throw new DatabaseOperationError(
        context.operationType,
        'Unknown error occurred',
        { originalError: String(error), ...context },
      );
    }
  }

  /**
   * 验证输入参数
   */
  static validateInput(
    value: any,
    fieldName: string,
    validators: {
      required?: boolean;
      type?: string;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      customValidator?: (value: any) => boolean;
    },
  ): void {
    const { required, type, minLength, maxLength, pattern, customValidator } = validators;

    if (required && (value === undefined || value === null || value === '')) {
      throw new PersonalityValidationError(`${fieldName} is required`);
    }

    if (value !== undefined && value !== null) {
      if (type && typeof value !== type) {
        throw new PersonalityValidationError(
          `${fieldName} must be of type ${type}, got ${typeof value}`,
        );
      }

      if (typeof value === 'string') {
        if (minLength && value.length < minLength) {
          throw new PersonalityValidationError(
            `${fieldName} must be at least ${minLength} characters long`,
          );
        }

        if (maxLength && value.length > maxLength) {
          throw new PersonalityValidationError(
            `${fieldName} must not exceed ${maxLength} characters`,
          );
        }

        if (pattern && !pattern.test(value)) {
          throw new PersonalityValidationError(
            `${fieldName} does not match required pattern`,
          );
        }
      }

      if (customValidator && !customValidator(value)) {
        throw new PersonalityValidationError(
          `${fieldName} failed custom validation`,
        );
      }
    }
  }

  /**
   * 批量验证
   */
  static validateBatch(validations: Array<() => void>): void {
    const errors: string[] = [];

    for (const validation of validations) {
      try {
        validation();
      } catch (error) {
        if (error instanceof PersonalityValidationError) {
          errors.push(error.message);
        } else {
          errors.push(String(error));
        }
      }
    }

    if (errors.length > 0) {
      throw new PersonalityValidationError(
        `Multiple validation errors: ${errors.join('; ')}`,
        { validationErrors: errors },
      );
    }
  }
}