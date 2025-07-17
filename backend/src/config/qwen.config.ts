/**
 * 通义千问配置接口
 */
export interface QwenConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  timeout: number;
  retryAttempts: number;
}

/**
 * 配置验证错误
 */
export class QwenConfigValidationError extends Error {
  constructor(message: string) {
    super(`Qwen配置验证失败: ${message}`);
    this.name = 'QwenConfigValidationError';
  }
}

/**
 * 获取通义千问配置
 */
export function getQwenConfig(): QwenConfig {
  const config: QwenConfig = {
    apiKey: process.env.QWEN_API_KEY!,
    baseUrl: process.env.QWEN_API_BASE_URL!,
    model: process.env.QWEN_MODEL || 'qwen-turbo',
    maxTokens: parseInt(process.env.QWEN_MAX_TOKENS || '1500'),
    temperature: parseFloat(process.env.QWEN_TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.QWEN_TOP_P || '0.9'),
    timeout: parseInt(process.env.QWEN_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.QWEN_RETRY_ATTEMPTS || '3'),
  };

  // 验证必需的配置项
  validateQwenConfig(config);

  return config;
}

/**
 * 验证通义千问配置
 */
export function validateQwenConfig(config: QwenConfig): void {
  if (!config.apiKey) {
    throw new QwenConfigValidationError('QWEN_API_KEY 环境变量未设置');
  }

  if (!config.baseUrl) {
    throw new QwenConfigValidationError('QWEN_API_BASE_URL 环境变量未设置');
  }

  if (!config.model) {
    throw new QwenConfigValidationError('QWEN_MODEL 环境变量未设置');
  }

  // 验证API密钥格式（应以 sk- 开头）
  if (!config.apiKey.startsWith('sk-')) {
    throw new QwenConfigValidationError('QWEN_API_KEY 格式不正确，应以 "sk-" 开头');
  }

  // 验证数值范围
  if (config.maxTokens <= 0 || config.maxTokens > 8000) {
    throw new QwenConfigValidationError('QWEN_MAX_TOKENS 应在 1-8000 范围内');
  }

  if (config.temperature < 0 || config.temperature > 2) {
    throw new QwenConfigValidationError('QWEN_TEMPERATURE 应在 0-2 范围内');
  }

  if (config.topP <= 0 || config.topP > 1) {
    throw new QwenConfigValidationError('QWEN_TOP_P 应在 0-1 范围内');
  }

  if (config.timeout <= 0 || config.timeout > 300000) {
    throw new QwenConfigValidationError('QWEN_TIMEOUT 应在 1-300000ms 范围内');
  }

  if (config.retryAttempts < 0 || config.retryAttempts > 10) {
    throw new QwenConfigValidationError('QWEN_RETRY_ATTEMPTS 应在 0-10 范围内');
  }
}

/**
 * 检查API连接
 */
export async function testQwenConnection(config: QwenConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeout),
    });

    return response.ok;
  } catch (error: any) {
    console.warn('Qwen API连接测试失败:', error.message);
    return false;
  }
}

/**
 * 通义千问配置常量
 */
export const QWEN_CONFIG_TOKEN = 'QWEN_CONFIG';

/**
 * 默认配置
 */
export const DEFAULT_QWEN_CONFIG: Partial<QwenConfig> = {
  model: 'qwen-turbo',
  maxTokens: 1500,
  temperature: 0.7,
  topP: 0.9,
  timeout: 30000,
  retryAttempts: 3,
};