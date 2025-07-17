import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  LLMService,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  TokenUsage,
  UsageStats,
  ModelInfo,
  HealthCheckResult,
  LLMError,
  LLMErrorType,
} from '../common/interfaces/llm.interface';
import { QwenConfig } from '../config/qwen.config';

/**
 * 通义千问API请求格式
 */
interface QwenChatRequest {
  model: string;
  input: {
    messages: Array<{
      role: string;
      content: string;
    }>;
  };
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stream?: boolean;
  };
}

/**
 * 通义千问API响应格式
 */
interface QwenChatResponse {
  output: {
    text: string;
    finish_reason: string;
    choices?: Array<{
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }>;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  request_id: string;
}

/**
 * 通义千问LLM服务实现
 */
@Injectable()
export class QwenLLMService implements LLMService {
  private readonly logger = new Logger(QwenLLMService.name);
  private usageStats: UsageStats = {
    totalRequests: 0,
    totalTokens: 0,
    averageResponseTime: 0,
    errorRate: 0,
    lastRequestTime: new Date(),
    dailyUsage: [],
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly config: QwenConfig,
  ) {
    this.logger.log('QwenLLMService initialized');
  }

  /**
   * 标准聊天接口
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      // 构建通义千问请求
      const qwenRequest: QwenChatRequest = {
        model: this.config.model,
        input: {
          messages: this.convertMessages(request.messages, request.systemPrompt),
        },
        parameters: {
          temperature: request.temperature ?? this.config.temperature,
          max_tokens: request.maxTokens ?? this.config.maxTokens,
          top_p: request.topP ?? this.config.topP,
          stream: false,
        },
      };

      // 发送请求
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/services/aigc/text-generation/generation`,
          qwenRequest,
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.config.timeout,
          }
        )
      );

      const qwenResponse: QwenChatResponse = response.data;
      const responseTime = Date.now() - startTime;

      // 更新使用统计
      this.updateUsageStats(responseTime, qwenResponse.usage.total_tokens);

      // 转换为标准响应格式
      return this.convertToChatResponse(qwenResponse, responseTime);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateErrorStats();
      
      const llmError = this.handleError(error);
      this.logger.error('Chat request failed', {
        error: llmError,
        responseTime,
        request: this.sanitizeRequest(request),
      });
      
      throw new HttpException(
        `通义千问API调用失败: ${llmError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 流式聊天接口
   */
  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const startTime = Date.now();
    
    try {
      // 构建通义千问流式请求
      const qwenRequest: QwenChatRequest = {
        model: this.config.model,
        input: {
          messages: this.convertMessages(request.messages, request.systemPrompt),
        },
        parameters: {
          temperature: request.temperature ?? this.config.temperature,
          max_tokens: request.maxTokens ?? this.config.maxTokens,
          top_p: request.topP ?? this.config.topP,
          stream: true,
        },
      };

      // 发送流式请求
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/services/aigc/text-generation/generation`,
          qwenRequest,
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.config.timeout,
            responseType: 'stream',
          }
        )
      );

      let index = 0;
      let fullContent = '';
      
      // 处理流式响应
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsedData = JSON.parse(data);
              const delta = parsedData.output?.text || '';
              fullContent += delta;
              
              yield {
                content: fullContent,
                delta,
                finishReason: parsedData.output?.finish_reason,
                usage: parsedData.usage ? this.convertTokenUsage(parsedData.usage) : undefined,
                model: this.config.model,
                index: index++,
                requestId: parsedData.request_id,
              };
            } catch (parseError) {
              this.logger.warn('Failed to parse streaming chunk', { line, error: parseError });
            }
          }
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateErrorStats();
      
      const llmError = this.handleError(error);
      this.logger.error('Stream chat request failed', {
        error: llmError,
        responseTime,
        request: this.sanitizeRequest(request),
      });
      
      throw new HttpException(
        `通义千问流式API调用失败: ${llmError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 验证配置
   */
  async validateConfig(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.config.baseUrl}/models`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
            },
            timeout: 5000,
          }
        )
      );
      
      return response.status === 200;
    } catch (error) {
      this.logger.error('Config validation failed', error);
      return false;
    }
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(): Promise<UsageStats> {
    return { ...this.usageStats };
  }

  /**
   * 获取支持的模型列表
   */
  async getSupportedModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        description: '通义千问高速版本',
        maxTokens: 8000,
        supportedFeatures: ['chat', 'stream'],
        costPerToken: 0.001,
      },
      {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        description: '通义千问增强版本',
        maxTokens: 8000,
        supportedFeatures: ['chat', 'stream'],
        costPerToken: 0.002,
      },
      {
        id: 'qwen-max',
        name: 'Qwen Max',
        description: '通义千问最强版本',
        maxTokens: 8000,
        supportedFeatures: ['chat', 'stream'],
        costPerToken: 0.02,
      },
    ];
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const testRequest: ChatRequest = {
        messages: [
          { role: 'user', content: 'Hello, are you working?' }
        ],
        maxTokens: 10,
        temperature: 0.1,
      };

      await this.chat(testRequest);
      
      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        model: this.config.model,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        model: this.config.model,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取服务名称
   */
  getServiceName(): string {
    return 'QwenLLMService';
  }

  /**
   * 获取当前模型
   */
  getCurrentModel(): string {
    return this.config.model;
  }

  /**
   * 设置模型
   */
  setModel(model: string): void {
    this.config.model = model;
    this.logger.log(`Model changed to: ${model}`);
  }

  /**
   * 估算Token数量
   */
  estimateTokens(text: string): number {
    // 简单的Token估算：中文字符约1.5个Token，英文单词约1个Token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return Math.ceil(chineseChars * 1.5 + englishWords);
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: any[], systemPrompt?: string): any[] {
    const converted = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 如果有系统提示词，添加到消息开头
    if (systemPrompt) {
      converted.unshift({
        role: 'system',
        content: systemPrompt,
      });
    }

    return converted;
  }

  /**
   * 转换为标准响应格式
   */
  private convertToChatResponse(qwenResponse: QwenChatResponse, responseTime: number): ChatResponse {
    return {
      content: qwenResponse.output.text || qwenResponse.output.choices?.[0]?.message?.content || '',
      usage: this.convertTokenUsage(qwenResponse.usage),
      model: this.config.model,
      finishReason: qwenResponse.output.finish_reason,
      responseTime,
      requestId: qwenResponse.request_id,
    };
  }

  /**
   * 转换Token使用统计
   */
  private convertTokenUsage(usage: any): TokenUsage {
    return {
      promptTokens: usage.input_tokens || 0,
      completionTokens: usage.output_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    };
  }

  /**
   * 处理错误
   */
  private handleError(error: any): LLMError {
    if (error.response) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data as any;

      switch (status) {
        case 401:
          return {
            type: LLMErrorType.AUTHENTICATION_ERROR,
            message: 'API密钥无效或已过期',
            code: 'INVALID_API_KEY',
            details: data,
            retryable: false,
            timestamp: new Date(),
          };
        case 429:
          return {
            type: LLMErrorType.RATE_LIMIT_ERROR,
            message: '请求频率限制',
            code: 'RATE_LIMIT_EXCEEDED',
            details: data,
            retryable: true,
            timestamp: new Date(),
          };
        case 400:
          return {
            type: LLMErrorType.VALIDATION_ERROR,
            message: data?.message || '请求参数错误',
            code: 'INVALID_REQUEST',
            details: data,
            retryable: false,
            timestamp: new Date(),
          };
        default:
          return {
            type: LLMErrorType.UNKNOWN_ERROR,
            message: data?.message || '未知错误',
            code: 'UNKNOWN_ERROR',
            details: data,
            retryable: status ? status >= 500 : false,
            timestamp: new Date(),
          };
      }
    }

    if (error.code === 'ECONNABORTED') {
      return {
        type: LLMErrorType.TIMEOUT_ERROR,
        message: '请求超时',
        code: 'TIMEOUT',
        details: error,
        retryable: true,
        timestamp: new Date(),
      };
    }

    return {
      type: LLMErrorType.NETWORK_ERROR,
      message: error.message || '网络错误',
      code: 'NETWORK_ERROR',
      details: error,
      retryable: true,
      timestamp: new Date(),
    };
  }

  /**
   * 更新使用统计
   */
  private updateUsageStats(responseTime: number, tokens: number): void {
    this.usageStats.totalRequests++;
    this.usageStats.totalTokens += tokens;
    this.usageStats.averageResponseTime = 
      (this.usageStats.averageResponseTime * (this.usageStats.totalRequests - 1) + responseTime) / 
      this.usageStats.totalRequests;
    this.usageStats.lastRequestTime = new Date();

    // 更新日统计
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = this.usageStats.dailyUsage.find(d => d.date === today);
    if (todayUsage) {
      todayUsage.requests++;
      todayUsage.tokens += tokens;
    } else {
      this.usageStats.dailyUsage.push({
        date: today,
        requests: 1,
        tokens,
      });
    }

    // 保持最近7天的统计
    if (this.usageStats.dailyUsage.length > 7) {
      this.usageStats.dailyUsage = this.usageStats.dailyUsage.slice(-7);
    }
  }

  /**
   * 更新错误统计
   */
  private updateErrorStats(): void {
    this.usageStats.totalRequests++;
    this.usageStats.errorRate = 
      (this.usageStats.errorRate * (this.usageStats.totalRequests - 1) + 1) / 
      this.usageStats.totalRequests;
  }

  /**
   * 清理敏感信息
   */
  private sanitizeRequest(request: ChatRequest): any {
    const sanitized = { ...request };
    // 移除敏感信息
    delete sanitized.userId;
    delete sanitized.petId;
    return sanitized;
  }
}