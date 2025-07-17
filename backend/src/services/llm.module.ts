import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { QwenLLMService } from './qwen-llm.service';
import { getQwenConfig } from '../config/qwen.config';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      useFactory: () => {
        const config = getQwenConfig();
        return {
          timeout: config.timeout,
          maxRedirects: 3,
          retryAttempts: config.retryAttempts,
          retryDelay: (retryCount: number) => {
            // 指数退避策略
            return Math.min(1000 * Math.pow(2, retryCount), 30000);
          },
          retryCondition: (error: any) => {
            // 仅在可重试错误时重试
            return (
              error.response?.status >= 500 ||
              error.code === 'ECONNABORTED' ||
              error.code === 'ENOTFOUND' ||
              error.code === 'ECONNRESET'
            );
          },
        };
      },
    }),
  ],
  providers: [
    {
      provide: 'QWEN_CONFIG',
      useFactory: () => getQwenConfig(),
    },
    {
      provide: QwenLLMService,
      useFactory: (httpService: HttpService) => {
        const config = getQwenConfig();
        return new QwenLLMService(httpService, config);
      },
      inject: [HttpService],
    },
  ],
  exports: [QwenLLMService],
})
export class LLMModule {}