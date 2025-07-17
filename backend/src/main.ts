import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getQwenConfig, testQwenConnection } from './config/qwen.config';

async function bootstrap() {
  // 验证通义千问配置
  try {
    console.log('🔧 验证通义千问API配置...');
    const qwenConfig = getQwenConfig();
    console.log('✅ 通义千问配置验证通过');
    
    // 测试API连接（可选，不阻塞启动）
    console.log('🌐 测试通义千问API连接...');
    const isConnected = await testQwenConnection(qwenConfig);
    if (isConnected) {
      console.log('✅ 通义千问API连接正常');
    } else {
      console.warn('⚠️  通义千问API连接测试失败，但应用将继续启动');
    }
  } catch (error: any) {
    console.error('❌ 通义千问配置验证失败:', error.message);
    console.error('请检查环境变量配置，应用将退出');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);
  
  // Set global prefix
  app.setGlobalPrefix('api/v1');
  
  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('智能虚拟宠物 API')
    .setDescription('智能虚拟宠物系统 API 文档 - 包含个性演化、技能系统、状态管理等功能')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in the controller
    )
    .addTag('Authentication', '用户认证相关接口')
    .addTag('Users', '用户管理相关接口')
    .addTag('Pets', '宠物管理相关接口')
    .addTag('Personality', '个性演化系统接口')
    .addTag('Chat', '对话系统接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep authorization after refresh
    },
    customSiteTitle: '智能虚拟宠物 API 文档',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔧 API Base URL: http://localhost:${port}/api/v1`);
}
bootstrap();
