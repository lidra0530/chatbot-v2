import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };
  }

  @Post('test')
  testPost(@Body() body: any): object {
    return {
      message: 'Test endpoint working',
      received: body,
      timestamp: new Date().toISOString(),
    };
  }
}
