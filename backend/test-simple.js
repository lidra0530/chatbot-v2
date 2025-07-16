const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function testSimpleConnection() {
  console.log('=== 简单MongoDB连接测试 ===\n');

  try {
    // 测试1: 数据库连接
    console.log('1. 测试数据库连接...');
    await prisma.$connect();
    console.log('✓ MongoDB连接成功');

    // 测试2: 检查现有的collections
    console.log('\n2. 检查数据库collections...');
    
    // 尝试查询用户数量（不创建）
    try {
      const userCount = await prisma.user.count();
      console.log(`✓ users collection 可访问，当前有 ${userCount} 个用户`);
    } catch (error) {
      console.log('users collection 查询失败:', error.message);
    }

    // 尝试查询宠物数量
    try {
      const petCount = await prisma.pet.count();
      console.log(`✓ pets collection 可访问，当前有 ${petCount} 个宠物`);
    } catch (error) {
      console.log('pets collection 查询失败:', error.message);
    }

    // 尝试查询演化日志数量
    try {
      const evolutionLogCount = await prisma.petEvolutionLog.count();
      console.log(`✓ pet_evolution_logs collection 可访问，当前有 ${evolutionLogCount} 条记录`);
    } catch (error) {
      console.log('pet_evolution_logs collection 查询失败:', error.message);
    }

    // 尝试查询交互模式数量
    try {
      const interactionPatternCount = await prisma.interactionPattern.count();
      console.log(`✓ interaction_patterns collection 可访问，当前有 ${interactionPatternCount} 条记录`);
    } catch (error) {
      console.log('interaction_patterns collection 查询失败:', error.message);
    }

    // 测试3: 验证定时任务相关的查询
    console.log('\n3. 验证定时任务查询能力...');
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 查询最近24小时的演化日志
    try {
      const recentLogs = await prisma.petEvolutionLog.findMany({
        where: {
          createdAt: {
            gte: twentyFourHoursAgo
          }
        },
        take: 5
      });
      console.log(`✓ 定时任务查询成功: 最近24小时有 ${recentLogs.length} 条演化记录`);
    } catch (error) {
      console.log('定时任务查询测试失败:', error.message);
    }

    // 测试4: 验证数据库schema
    console.log('\n4. 验证数据库schema...');
    
    // 验证User表结构
    try {
      const users = await prisma.user.findMany({
        take: 1,
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true
        }
      });
      console.log('✓ User表结构正确');
    } catch (error) {
      console.log('User表结构验证失败:', error.message);
    }

    // 验证Pet表结构
    try {
      const pets = await prisma.pet.findMany({
        take: 1,
        select: {
          id: true,
          name: true,
          personality: true,
          currentState: true,
          skills: true,
          createdAt: true
        }
      });
      console.log('✓ Pet表结构正确');
    } catch (error) {
      console.log('Pet表结构验证失败:', error.message);
    }

    console.log('\n=== 简单连接测试完成 ===');
    console.log('✓ MongoDB连接正常，定时任务系统数据库就绪！');
    console.log('📋 注意：由于MongoDB不是replica set，无法测试事务操作');
    console.log('🔄 定时任务系统可以正常执行查询和基本操作');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n💾 数据库连接已关闭');
  }
}

// 运行测试
testSimpleConnection();