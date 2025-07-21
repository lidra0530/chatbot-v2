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
  private connectedUsers = new Map<string, { socket: Socket; userId: string; petId?: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('PetGateway WebSocket server initialized');
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
      });

      this.logger.log(`User ${payload.sub} connected via WebSocket: ${client.id}`);
      
      // 向客户端发送连接成功消息
      client.emit('connection_established', {
        message: '连接成功',
        userId: payload.sub,
        timestamp: new Date().toISOString(),
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
      client.emit('pong', {
        timestamp: new Date().toISOString(),
        userId: userInfo.userId,
        petId: userInfo.petId,
      });
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
}