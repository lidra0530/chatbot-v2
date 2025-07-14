const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// 模拟测试数据
const testUserData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123'
};

const testPetData = {
  name: '小元',
  breed: '虚拟助手',
  description: '一个聪明可爱的AI宠物'
};

let authToken = '';
let petId = '';
let conversationId = '';

async function runIntegrationTest() {
  console.log('=== 开始集成测试 ===\n');

  try {
    // 步骤1: 用户注册（如果需要）
    console.log('1. 用户注册/登录...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUserData);
      console.log('✓ 用户注册成功');
    } catch (error) {
      console.log('注册失败，尝试登录...');
    }

    // 登录获取token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUserData.email,
      password: testUserData.password
    });
    authToken = loginResponse.data.accessToken;
    console.log('✓ 登录成功，获取到token');

    // 步骤2: 创建宠物
    console.log('\n2. 创建宠物 "小元"...');
    const createPetResponse = await axios.post(`${BASE_URL}/pets`, testPetData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    petId = createPetResponse.data.id;
    console.log('✓ 宠物创建成功');
    console.log(`  宠物ID: ${petId}`);
    console.log(`  宠物名称: ${createPetResponse.data.name}`);

    // 步骤3: 验证宠物创建
    console.log('\n3. 验证宠物创建 - 获取宠物列表...');
    const getPetsResponse = await axios.get(`${BASE_URL}/pets`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const pets = getPetsResponse.data;
    const xiaoyuanPet = pets.find(pet => pet.name === '小元');
    
    if (xiaoyuanPet) {
      console.log('✓ 验证成功：在宠物列表中找到了"小元"');
      console.log(`  宠物详情: ${JSON.stringify(xiaoyuanPet, null, 2)}`);
    } else {
      console.log('✗ 验证失败：未在宠物列表中找到"小元"');
      return;
    }

    // 步骤4: 创建对话
    console.log('\n4. 为"小元"创建对话...');
    const createConversationResponse = await axios.post(`${BASE_URL}/conversations`, {
      title: '与小元的第一次对话',
      petId: petId
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    conversationId = createConversationResponse.data.id;
    console.log('✓ 对话创建成功');
    console.log(`  对话ID: ${conversationId}`);
    console.log(`  对话标题: ${createConversationResponse.data.title}`);

    // 步骤5: 验证对话创建
    console.log('\n5. 验证对话创建 - 获取对话列表...');
    const getConversationsResponse = await axios.get(`${BASE_URL}/conversations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const conversations = getConversationsResponse.data;
    const xiaoyuanConversation = conversations.find(conv => conv.petId === petId);
    
    if (xiaoyuanConversation) {
      console.log('✓ 验证成功：在对话列表中找到了"小元"的对话');
      console.log(`  对话详情: ${JSON.stringify(xiaoyuanConversation, null, 2)}`);
    } else {
      console.log('✗ 验证失败：未在对话列表中找到"小元"的对话');
      return;
    }

    console.log('\n=== 集成测试完成 ===');
    console.log('✓ 所有测试步骤都成功完成！');

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    console.error('错误详情:', error.response?.status, error.response?.statusText);
  }
}

// 运行测试
runIntegrationTest();