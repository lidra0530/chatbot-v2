/**
 * LLM服务统一接口
 * 支持多种LLM模型的统一调用
 */

/**
 * 聊天消息结构
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
  timestamp?: Date;
}

/**
 * 聊天请求参数
 */
export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  systemPrompt?: string;
  userId?: string;
  petId?: string;
  conversationId?: string;
}

/**
 * Token使用统计
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 聊天响应结构
 */
export interface ChatResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason: string;
  responseTime: number; // 响应时间（毫秒）
  requestId?: string;
}

/**
 * 流式响应数据块
 */
export interface ChatStreamChunk {
  content: string;
  delta: string;
  finishReason?: string;
  usage?: TokenUsage;
  model: string;
  index: number;
  requestId?: string;
}

/**
 * LLM使用统计
 */
export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  errorRate: number;
  lastRequestTime: Date;
  dailyUsage: {
    date: string;
    requests: number;
    tokens: number;
  }[];
}

/**
 * LLM服务配置
 */
export interface LLMServiceConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  retryAttempts: number;
  maxTokens: number;
  temperature: number;
  topP: number;
}

/**
 * LLM错误类型
 */
export enum LLMErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TOKEN_LIMIT_ERROR = 'TOKEN_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * LLM错误详情
 */
export interface LLMError {
  type: LLMErrorType;
  message: string;
  code?: string;
  details?: any;
  retryable: boolean;
  timestamp: Date;
}

/**
 * 模型信息
 */
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  supportedFeatures: string[];
  costPerToken: number;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  model: string;
  version?: string;
  error?: string;
  timestamp: Date;
}

/**
 * LLM服务统一接口
 */
export interface LLMService {
  /**
   * 标准聊天接口
   */
  chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * 流式聊天接口
   */
  streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk>;

  /**
   * 验证配置
   */
  validateConfig(): Promise<boolean>;

  /**
   * 获取使用统计
   */
  getUsageStats(): Promise<UsageStats>;

  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): Promise<ModelInfo[]>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * 获取服务名称
   */
  getServiceName(): string;

  /**
   * 获取当前模型
   */
  getCurrentModel(): string;

  /**
   * 设置模型
   */
  setModel(model: string): void;

  /**
   * 估算Token数量
   */
  estimateTokens(text: string): number;
}

/**
 * LLM服务工厂接口
 */
export interface LLMServiceFactory {
  /**
   * 创建LLM服务实例
   */
  createService(config: LLMServiceConfig): LLMService;

  /**
   * 获取支持的服务类型
   */
  getSupportedServices(): string[];
}

/**
 * 批量处理请求
 */
export interface BatchChatRequest {
  requests: ChatRequest[];
  batchId?: string;
  maxConcurrency?: number;
}

/**
 * 批量处理响应
 */
export interface BatchChatResponse {
  responses: (ChatResponse | LLMError)[];
  batchId?: string;
  successCount: number;
  errorCount: number;
  totalTime: number;
}

/**
 * 扩展的LLM服务接口（支持批量处理）
 */
export interface ExtendedLLMService extends LLMService {
  /**
   * 批量聊天接口
   */
  batchChat(request: BatchChatRequest): Promise<BatchChatResponse>;

  /**
   * 缓存聊天响应
   */
  cachedChat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * 获取缓存命中率
   */
  getCacheHitRate(): Promise<number>;
}