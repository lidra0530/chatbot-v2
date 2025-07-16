const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('=== 测试MongoDB连接和定时任务系统 ===\n');

  try {
    // 测试1: 数据库连接
    console.log('1. 测试数据库连接...');
    await prisma.$connect();
    console.log('✓ MongoDB连接成功');

    // 测试2: 创建测试用户
    console.log('\n2. 创建测试用户...');
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser_db',
        email: 'testdb@example.com',
        password: 'hashedpassword123'
      }
    });
    console.log('✓ 测试用户创建成功');
    console.log(`  用户ID: ${testUser.id}`);
    console.log(`  用户名: ${testUser.username}`);

    // 测试3: 创建测试宠物
    console.log('\n3. 创建测试宠物...');
    const testPet = await prisma.pet.create({
      data: {
        name: '小元测试',
        userId: testUser.id,
        personality: {
          traits: {
            openness: 60,
            conscientiousness: 55,
            extraversion: 70,
            agreeableness: 65,
            neuroticism: 25
          },
          evolutionHistory: [],
          evolutionRate: 1.0,
          lastEvolutionCheck: new Date()
        }
      }
    });
    console.log('✓ 测试宠物创建成功');
    console.log(`  宠物ID: ${testPet.id}`);
    console.log(`  宠物名: ${testPet.name}`);

    // 测试4: 创建个性演化日志
    console.log('\n4. 创建个性演化日志...');
    const evolutionLog = await prisma.petEvolutionLog.create({
      data: {
        petId: testPet.id,
        evolutionType: 'personality',
        changeDescription: '定时任务测试 - 个性特质微调',
        triggerEvent: 'scheduled_task',
        beforeSnapshot: {
          traits: {
            openness: 60,
            conscientiousness: 55,
            extraversion: 70,
            agreeableness: 65,
            neuroticism: 25
          }
        },
        afterSnapshot: {
          traits: {
            openness: 62,
            conscientiousness: 55,
            extraversion: 70,
            agreeableness: 65,
            neuroticism: 23
          }
        },
        impactScore: 0.2,
        significance: 'minor',
        analysisData: {
          source: 'database_test',
          timestamp: new Date()
        }
      }
    });
    console.log('✓ 个性演化日志创建成功');
    console.log(`  演化记录ID: ${evolutionLog.id}`);

    // 测试5: 创建交互模式记录
    console.log('\n5. 创建交互模式记录...');
    const interactionPattern = await prisma.interactionPattern.create({
      data: {
        petId: testPet.id,
        patternType: 'conversation_style',
        patternName: 'friendly_chat',
        description: '友好对话模式',
        patternData: {
          avgResponseTime: 2.5,
          emotionalTone: 'positive',
          topicPreference: 'general'
        },
        frequency: 10,
        confidence: 0.8
      }
    });
    console.log('✓ 交互模式记录创建成功');
    console.log(`  模式ID: ${interactionPattern.id}`);

    // 测试6: 查询验证
    console.log('\n6. 查询验证数据...');
    const petWithLogs = await prisma.pet.findUnique({
      where: { id: testPet.id },
      include: {
        evolutionLogs: true,
        interactionPatterns: true
      }
    });
    
    console.log('✓ 数据查询成功');
    console.log(`  宠物有 ${petWithLogs.evolutionLogs.length} 条演化记录`);
    console.log(`  宠物有 ${petWithLogs.interactionPatterns.length} 个交互模式`);

    // 测试7: 模拟定时任务查询
    console.log('\n7. 模拟定时任务查询...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentEvolutionLogs = await prisma.petEvolutionLog.findMany({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            userId: true
          }
        }
      }
    });
    
    console.log('✓ 定时任务查询成功');
    console.log(`  最近24小时有 ${recentEvolutionLogs.length} 条演化记录`);

    // 测试8: 清理测试数据
    console.log('\n8. 清理测试数据...');
    await prisma.interactionPattern.deleteMany({
      where: { petId: testPet.id }
    });
    await prisma.petEvolutionLog.deleteMany({
      where: { petId: testPet.id }
    });
    await prisma.pet.delete({
      where: { id: testPet.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('✓ 测试数据清理完成');

    console.log('\n=== 数据库连接和定时任务系统测试完成 ===');
    console.log('✓ 所有测试都通过！MongoDB连接正常，定时任务系统就绪！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n💾 数据库连接已关闭');
  }
}

// 运行测试
testDatabaseConnection();