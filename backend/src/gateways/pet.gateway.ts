import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/pets',
})
export class PetGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PetGateway.name);
  private connectedUsers = new Map<string, { socket: Socket; userId: string; petId?: string; lastPing?: Date }>();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('PetGateway WebSocket server initialized');
    
    // 步骤244: 启动心跳检测
    this.startHeartbeatMonitoring();
  }

  async handleConnection(client: Socket) {
    this.logger.log(`WebSocket client attempting to connect: ${client.id}`);
    
    try {
      // 验证WebSocket连接的认证
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No authentication token provided for ${client.id}`);
        client.disconnect(true);
        return;
      }

      // 验证JWT令牌
      const payload = await this.validateToken(token);
      if (!payload || !payload.sub) {
        this.logger.warn(`Connection rejected: Invalid token for ${client.id}`);
        client.disconnect(true);
        return;
      }

      // 存储连接用户信息
      this.connectedUsers.set(client.id, {
        socket: client,
        userId: payload.sub,
        lastPing: new Date(),
      });

      // 步骤244: 设置连接监控
      this.setupConnectionMonitoring(client);

      this.logger.log(`User ${payload.sub} connected via WebSocket: ${client.id}`);
      
      // 向客户端发送连接成功消息
      client.emit('connection_established', {
        message: '连接成功',
        userId: payload.sub,
        timestamp: new Date().toISOString(),
        heartbeatInterval: 30000, // 30秒心跳间隔
        reconnectSupported: true,
      });

    } catch (error) {
      this.logger.error(`Connection error for ${client.id}:`, error);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);
    
    if (userInfo) {
      this.logger.log(`User ${userInfo.userId} disconnected: ${client.id}`);
      
      // 如果用户在某个宠物房间中，离开房间
      if (userInfo.petId) {
        client.leave(`pet:${userInfo.petId}`);
        this.logger.debug(`User ${userInfo.userId} left pet room: ${userInfo.petId}`);
      }
      
      // 步骤244: 清理连接监控
      this.cleanupConnectionMonitoring(client);
      
      // 移除连接记录
      this.connectedUsers.delete(client.id);
    } else {
      this.logger.debug(`Unknown client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('join_pet_room')
  async handleJoinPetRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { petId: string }
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    
    if (!userInfo) {
      this.logger.warn(`Unauthorized join_pet_room attempt from ${client.id}`);
      client.emit('error', { message: '未授权的连接' });
      return;
    }

    try {
      // 验证用户是否有权限访问这个宠物
      const pet = await this.prisma.pet.findFirst({
        where: {
          id: data.petId,
          userId: userInfo.userId,
        },
      });

      if (!pet) {
        this.logger.warn(`User ${userInfo.userId} attempted to join unauthorized pet room: ${data.petId}`);
        client.emit('error', { message: '没有权限访问此宠物' });
        return;
      }

      // 如果用户已经在其他宠物房间中，先离开
      if (userInfo.petId && userInfo.petId !== data.petId) {
        client.leave(`pet:${userInfo.petId}`);
        this.logger.debug(`User ${userInfo.userId} left previous pet room: ${userInfo.petId}`);
      }

      // 加入新的宠物房间
      client.join(`pet:${data.petId}`);
      userInfo.petId = data.petId;
      
      this.logger.log(`User ${userInfo.userId} joined pet room: ${data.petId}`);
      
      // 通知客户端成功加入房间
      client.emit('pet_room_joined', {
        petId: data.petId,
        petName: pet.name,
        message: `已加入宠物 ${pet.name} 的会话室`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Error joining pet room for user ${userInfo.userId}:`, error);
      client.emit('error', { message: '加入宠物房间失败' });
    }
  }

  @SubscribeMessage('leave_pet_room')
  async handleLeavePetRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { petId: string }
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    
    if (!userInfo) {
      this.logger.warn(`Unauthorized leave_pet_room attempt from ${client.id}`);
      return;
    }

    if (userInfo.petId === data.petId) {
      client.leave(`pet:${data.petId}`);
      userInfo.petId = undefined;
      
      this.logger.log(`User ${userInfo.userId} left pet room: ${data.petId}`);
      
      client.emit('pet_room_left', {
        petId: data.petId,
        message: '已离开宠物会话室',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);
    
    if (userInfo) {
      // 步骤244: 更新最后心跳时间
      userInfo.lastPing = new Date();
      
      client.emit('pong', {
        timestamp: new Date().toISOString(),
        userId: userInfo.userId,
        petId: userInfo.petId,
        serverTime: Date.now(),
      });
    }
  }

  @SubscribeMessage('reconnect_request')
  async handleReconnectRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lastEventId?: string; petId?: string }
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    
    if (!userInfo) {
      client.emit('reconnect_failed', { message: '用户信息不存在' });
      return;
    }

    try {
      // 步骤244: 处理重连逻辑
      const reconnectData: any = {
        message: '重连成功',
        userId: userInfo.userId,
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
      };

      // 如果客户端请求恢复到特定宠物房间
      if (data.petId) {
        const pet = await this.prisma.pet.findFirst({
          where: {
            id: data.petId,
            userId: userInfo.userId,
          },
        });

        if (pet) {
          client.join(`pet:${data.petId}`);
          userInfo.petId = data.petId;
          reconnectData.petId = data.petId;
          reconnectData.petName = pet.name;
          this.logger.log(`User ${userInfo.userId} reconnected to pet room: ${data.petId}`);
        }
      }

      client.emit('reconnect_success', reconnectData);
    } catch (error) {
      this.logger.error(`Reconnect failed for user ${userInfo.userId}:`, error);
      client.emit('reconnect_failed', { message: '重连失败' });
    }
  }

  // 广播消息到特定宠物房间
  broadcastToPetRoom(petId: string, event: string, data: any) {
    this.server.to(`pet:${petId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.debug(`Broadcasted ${event} to pet room: ${petId}`);
  }

  // 发送消息给特定用户
  sendToUser(userId: string, event: string, data: any) {
    const userConnections = Array.from(this.connectedUsers.values())
      .filter(info => info.userId === userId);
    
    userConnections.forEach(userInfo => {
      userInfo.socket.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });
    
    if (userConnections.length > 0) {
      this.logger.debug(`Sent ${event} to user: ${userId}`);
    }
  }

  // 获取在线用户统计
  getConnectionStats() {
    const totalConnections = this.connectedUsers.size;
    const uniqueUsers = new Set(Array.from(this.connectedUsers.values()).map(info => info.userId)).size;
    const activePetRooms = new Set(
      Array.from(this.connectedUsers.values())
        .filter(info => info.petId)
        .map(info => info.petId)
    ).size;

    return {
      totalConnections,
      uniqueUsers,
      activePetRooms,
    };
  }

  // 私有方法：从Socket中提取认证令牌
  private extractTokenFromSocket(client: Socket): string | null {
    // 从查询参数中获取token
    const queryToken = client.handshake.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    // 从认证头中获取token
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  // 私有方法：验证JWT令牌
  private async validateToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      this.logger.debug(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * 步骤244: 启动心跳监控
   */
  private startHeartbeatMonitoring(): void {
    // 每60秒检查一次连接状态
    this.heartbeatInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 60000);
    
    this.logger.log('Heartbeat monitoring started');
  }

  /**
   * 步骤244: 检查连接健康状态
   */
  private checkConnectionHealth(): void {
    const now = new Date();
    const timeoutThreshold = 2 * 60 * 1000; // 2分钟超时
    const disconnectedClients: string[] = [];

    for (const [clientId, userInfo] of this.connectedUsers.entries()) {
      const lastPing = userInfo.lastPing || new Date(0);
      const timeSinceLastPing = now.getTime() - lastPing.getTime();

      if (timeSinceLastPing > timeoutThreshold) {
        this.logger.warn(`Client ${clientId} (user: ${userInfo.userId}) appears to be inactive (${Math.round(timeSinceLastPing / 1000)}s since last ping)`);
        
        // 尝试发送ping以确认连接状态
        userInfo.socket.emit('server_ping', {
          timestamp: now.toISOString(),
          timeoutWarning: true,
        });

        // 如果超过3分钟没有响应，强制断开连接
        if (timeSinceLastPing > 3 * 60 * 1000) {
          disconnectedClients.push(clientId);
        }
      }
    }

    // 清理不活跃的连接
    disconnectedClients.forEach(clientId => {
      const userInfo = this.connectedUsers.get(clientId);
      if (userInfo) {
        this.logger.log(`Force disconnecting inactive client: ${clientId} (user: ${userInfo.userId})`);
        userInfo.socket.disconnect(true);
      }
    });

    if (disconnectedClients.length > 0) {
      this.logger.log(`Cleaned up ${disconnectedClients.length} inactive connections`);
    }
  }

  /**
   * 步骤244: 设置连接监控
   */
  private setupConnectionMonitoring(client: Socket): void {
    // 监听连接错误
    client.on('error', (error) => {
      const userInfo = this.connectedUsers.get(client.id);
      this.logger.error(`Socket error for client ${client.id} (user: ${userInfo?.userId}):`, error);
    });

    // 监听连接断开
    client.on('disconnect', (reason) => {
      const userInfo = this.connectedUsers.get(client.id);
      this.logger.debug(`Client ${client.id} (user: ${userInfo?.userId}) disconnected: ${reason}`);
    });

    // 定期发送服务器端ping
    const clientPingInterval = setInterval(() => {
      if (client.connected) {
        client.emit('server_ping', {
          timestamp: new Date().toISOString(),
        });
      } else {
        clearInterval(clientPingInterval);
      }
    }, 30000); // 30秒间隔

    // 保存ping间隔引用以便清理
    (client as any).pingInterval = clientPingInterval;
  }

  /**
   * 步骤244: 清理连接监控
   */
  private cleanupConnectionMonitoring(client: Socket): void {
    // 清理ping间隔
    const pingInterval = (client as any).pingInterval;
    if (pingInterval) {
      clearInterval(pingInterval);
      delete (client as any).pingInterval;
    }
  }

  /**
   * 步骤244: 优雅关闭WebSocket服务器
   */
  async gracefulShutdown(): Promise<void> {
    this.logger.log('Starting graceful shutdown of WebSocket gateway');

    // 停止心跳监控
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // 通知所有客户端服务器即将关闭
    this.server.emit('server_shutdown', {
      message: '服务器即将重启，请稍后重新连接',
      timestamp: new Date().toISOString(),
      reconnectDelay: 5000, // 建议5秒后重连
    });

    // 等待客户端处理关闭通知
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 逐个断开连接
    const disconnectPromises: Promise<void>[] = [];
    for (const [_clientId, userInfo] of this.connectedUsers.entries()) {
      disconnectPromises.push(
        new Promise<void>((resolve) => {
          userInfo.socket.on('disconnect', () => resolve());
          userInfo.socket.disconnect(true);
          // 最多等待1秒
          setTimeout(() => resolve(), 1000);
        })
      );
    }

    await Promise.all(disconnectPromises);
    this.connectedUsers.clear();

    this.logger.log('WebSocket gateway graceful shutdown completed');
  }
}