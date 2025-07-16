import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface EvolutionHistoryQuery {
  petId: string;
  page?: number;
  limit?: number;
  evolutionType?: string;
  significance?: string;
  startDate?: Date;
  endDate?: Date;
  yearMonth?: string;
}

export interface EvolutionHistoryResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

@Injectable()
export class EvolutionHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * 步骤114: 实现演化历史的高效分页查询
   * 支持多种过滤条件和优化的分页机制
   */
  async getEvolutionHistory(query: EvolutionHistoryQuery): Promise<EvolutionHistoryResponse> {
    const {
      petId,
      page = 1,
      limit = 20,
      evolutionType,
      significance,
      startDate,
      endDate,
      yearMonth,
    } = query;

    // 构建查询条件
    const where: any = {
      petId,
    };

    if (evolutionType) {
      where.evolutionType = evolutionType;
    }

    if (significance) {
      where.significance = significance;
    }

    if (yearMonth) {
      where.yearMonth = yearMonth;
    } else if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // 计算偏移量
    const skip = (page - 1) * limit;

    // 并行执行查询和计数
    const [data, total] = await Promise.all([
      this.prisma.petEvolutionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          pet: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.petEvolutionLog.count({ where }),
    ]);

    // 计算分页信息
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };
  }

  /**
   * 获取演化历史统计信息
   */
  async getEvolutionStats(petId: string, timeRange?: string) {
    const where: any = { petId };
    
    if (timeRange) {
      const now = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      where.createdAt = { gte: startDate };
    }

    const [
      totalCount,
      typeDistribution,
      significanceDistribution,
      recentEvolutions,
    ] = await Promise.all([
      this.prisma.petEvolutionLog.count({ where }),
      
      this.prisma.petEvolutionLog.groupBy({
        by: ['evolutionType'],
        where,
        _count: { evolutionType: true },
      }),
      
      this.prisma.petEvolutionLog.groupBy({
        by: ['significance'],
        where,
        _count: { significance: true },
      }),
      
      this.prisma.petEvolutionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          evolutionType: true,
          significance: true,
          changeDescription: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalCount,
      typeDistribution,
      significanceDistribution,
      recentEvolutions,
    };
  }

  /**
   * 按时间维度获取演化趋势
   */
  async getEvolutionTrends(petId: string, groupBy: 'hour' | 'day' | 'week' | 'month' = 'day') {
    const where = { petId };
    
    let groupByField: string;
    switch (groupBy) {
      case 'hour':
        groupByField = 'hourOfDay';
        break;
      case 'day':
        groupByField = 'dayOfWeek';
        break;
      case 'week':
      case 'month':
        groupByField = 'yearMonth';
        break;
    }

    const trends = await this.prisma.petEvolutionLog.groupBy({
      by: [groupByField as any],
      where,
      _count: { id: true },
      _avg: { impactScore: true },
      orderBy: { [groupByField]: 'asc' },
    });

    return trends;
  }

  /**
   * 获取演化历史的时间范围
   */
  async getEvolutionTimeRange(petId: string) {
    const result = await this.prisma.petEvolutionLog.aggregate({
      where: { petId },
      _min: { createdAt: true },
      _max: { createdAt: true },
    });

    return {
      earliest: result._min.createdAt,
      latest: result._max.createdAt,
    };
  }

  /**
   * 批量获取多个宠物的演化历史
   */
  async getBatchEvolutionHistory(petIds: string[], limit: number = 50) {
    const data = await this.prisma.petEvolutionLog.findMany({
      where: {
        petId: { in: petIds },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 按宠物ID分组
    const grouped = data.reduce((acc, log) => {
      if (!acc[log.petId]) {
        acc[log.petId] = [];
      }
      acc[log.petId].push(log);
      return acc;
    }, {} as Record<string, typeof data>);

    return grouped;
  }

  /**
   * 搜索演化历史
   */
  async searchEvolutionHistory(petId: string, searchQuery: string, limit: number = 20) {
    const data = await this.prisma.petEvolutionLog.findMany({
      where: {
        petId,
        OR: [
          { changeDescription: { contains: searchQuery, mode: 'insensitive' } },
          { triggerEvent: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return data;
  }
}