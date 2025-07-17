# 个性API使用指南和最佳实践

## 1. 快速开始

### 1.1 认证设置
所有API调用都需要JWT Bearer Token认证：

```javascript
const token = 'your-jwt-token';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### 1.2 基础API调用示例

```javascript
// 获取宠物个性特质
async function getPersonalityTraits(petId) {
  const response = await fetch(`/api/v1/personality/pets/${petId}/traits`, {
    method: 'GET',
    headers
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('个性特质:', result.data.traits);
    return result.data;
  } else {
    throw new Error(result.message);
  }
}
```

## 2. 核心功能使用示例

### 2.1 个性特质管理

#### 获取个性特质
```javascript
// 基础获取
const traits = await getPersonalityTraits('pet-123');
console.log(`开放性: ${traits.traits.openness}/100`);

// 错误处理示例
try {
  const traits = await getPersonalityTraits('invalid-pet-id');
} catch (error) {
  if (error.message.includes('PET_NOT_FOUND')) {
    console.log('宠物不存在，请检查pet ID');
  }
}
```

#### 更新个性特质（管理员功能）
```javascript
async function updatePersonalityTraits(petId, newTraits) {
  const response = await fetch(`/api/v1/personality/pets/${petId}/traits`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      traits: {
        openness: newTraits.openness,
        conscientiousness: newTraits.conscientiousness,
        extraversion: newTraits.extraversion,
        agreeableness: newTraits.agreeableness,
        neuroticism: newTraits.neuroticism
      }
    })
  });
  
  return await response.json();
}

// 使用示例
await updatePersonalityTraits('pet-123', {
  openness: 75,
  conscientiousness: 80,
  extraversion: 60,
  agreeableness: 85,
  neuroticism: 20
});
```

### 2.2 个性演化触发

#### 基于对话的演化
```javascript
async function triggerEvolutionFromConversation(petId, userMessage, botResponse) {
  const interactionData = {
    userMessage: userMessage,
    botResponse: botResponse,
    interactionType: 'conversation',
    duration: calculateSessionDuration(), // 自定义函数计算会话时长
    emotionalTone: detectEmotionalTone(userMessage) // 自定义情感检测
  };
  
  const response = await fetch(`/api/v1/personality/pets/${petId}/evolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ interactionData })
  });
  
  const result = await response.json();
  
  if (result.success && result.data.evolutionTriggered) {
    console.log('个性发生演化!');
    console.log('变化:', result.data.changesApplied);
    console.log('新特质:', result.data.newTraits);
    console.log('置信度:', result.data.confidence);
    console.log('原因:', result.data.reason);
    
    // 可以触发UI更新
    updatePersonalityUI(result.data.newTraits);
  } else {
    console.log('本次互动未触发演化');
  }
}

// 实际使用
await triggerEvolutionFromConversation(
  'pet-123',
  '你今天看起来很开心！',
  '是的！和你聊天让我感到很愉快！'
);
```

#### 不同类型的互动演化
```javascript
// 表扬互动
async function triggerPraiseEvolution(petId, praiseMessage) {
  return await fetch(`/api/v1/personality/pets/${petId}/evolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      interactionData: {
        userMessage: praiseMessage,
        botResponse: '谢谢你的夸奖！',
        interactionType: 'praise',
        duration: 30,
        emotionalTone: 'positive'
      }
    })
  });
}

// 批评互动
async function triggerCriticismEvolution(petId, criticismMessage) {
  return await fetch(`/api/v1/personality/pets/${petId}/evolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      interactionData: {
        userMessage: criticismMessage,
        botResponse: '我会努力改进的...',
        interactionType: 'criticism',
        duration: 45,
        emotionalTone: 'negative'
      }
    })
  });
}
```

### 2.3 个性分析获取

#### 基础分析
```javascript
async function getPersonalityAnalysis(petId, options = {}) {
  const params = new URLSearchParams({
    timeframe: options.timeframe || 'month',
    includeRecommendations: options.includeRecommendations !== false
  });
  
  const response = await fetch(
    `/api/v1/personality/pets/${petId}/analysis?${params}`,
    { method: 'GET', headers }
  );
  
  const result = await response.json();
  
  if (result.success) {
    const analysis = result.data;
    
    // 处理趋势数据
    console.log('个性趋势分析:');
    Object.entries(analysis.trends).forEach(([trait, trend]) => {
      console.log(`${trait}: ${trend.direction} (变化率: ${trend.changeRate})`);
    });
    
    // 处理稳定性数据
    console.log(`整体稳定性: ${analysis.stability.overall}`);
    
    // 处理推荐
    if (analysis.recommendations) {
      console.log('推荐建议:');
      analysis.recommendations.forEach(rec => {
        console.log(`- [${rec.priority}] ${rec.description}`);
      });
    }
    
    return analysis;
  }
}

// 使用示例
const analysis = await getPersonalityAnalysis('pet-123', {
  timeframe: 'week',
  includeRecommendations: true
});
```

#### 分析数据可视化示例
```javascript
function visualizePersonalityTrends(analysis) {
  // 假设使用Chart.js或类似图表库
  const trendData = Object.entries(analysis.trends).map(([trait, trend]) => ({
    label: trait,
    value: trend.changeRate,
    direction: trend.direction,
    significance: trend.significance
  }));
  
  // 创建雷达图显示个性特质
  const radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['开放性', '尽责性', '外向性', '宜人性', '神经质'],
      datasets: [{
        label: '当前个性',
        data: [
          analysis.currentTraits.openness,
          analysis.currentTraits.conscientiousness,
          analysis.currentTraits.extraversion,
          analysis.currentTraits.agreeableness,
          100 - analysis.currentTraits.neuroticism // 反转神经质显示
        ]
      }]
    }
  });
}
```

### 2.4 演化历史查询

#### 分页查询历史
```javascript
async function getPersonalityHistory(petId, page = 1, limit = 20) {
  const response = await fetch(
    `/api/v1/personality/pets/${petId}/history?page=${page}&limit=${limit}`,
    { method: 'GET', headers }
  );
  
  const result = await response.json();
  
  if (result.success) {
    const { history, pagination, totalEvolutions } = result.data;
    
    console.log(`总共${totalEvolutions}次演化记录`);
    console.log(`当前页: ${pagination.page}/${Math.ceil(totalEvolutions / limit)}`);
    
    history.forEach(entry => {
      console.log(`${entry.timestamp}: ${entry.reason}`);
      console.log('变化:', entry.changesApplied);
    });
    
    return result.data;
  }
}
```

#### 时间范围查询
```javascript
async function getPersonalityHistoryByDateRange(petId, startDate, endDate) {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: 100
  });
  
  const response = await fetch(
    `/api/v1/personality/pets/${petId}/history?${params}`,
    { method: 'GET', headers }
  );
  
  return await response.json();
}

// 查询最近一周的演化
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const now = new Date();
const recentHistory = await getPersonalityHistoryByDateRange('pet-123', lastWeek, now);
```

### 2.5 演化设置管理

#### 获取和更新设置
```javascript
async function getEvolutionSettings(petId) {
  const response = await fetch(
    `/api/v1/personality/pets/${petId}/settings`,
    { method: 'GET', headers }
  );
  
  return await response.json();
}

async function updateEvolutionSettings(petId, newSettings) {
  const response = await fetch(
    `/api/v1/personality/pets/${petId}/settings`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(newSettings)
    }
  );
  
  return await response.json();
}

// 使用示例：降低演化敏感度
await updateEvolutionSettings('pet-123', {
  evolutionRate: 0.8,  // 降低演化速率
  maxDailyChange: 3,   // 限制每日最大变化
  maxWeeklyChange: 10  // 限制每周最大变化
});
```

### 2.6 批量操作

#### 批量演化处理
```javascript
async function batchPersonalityEvolution(operations) {
  const response = await fetch('/api/v1/personality/batch/evolve', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: operations,
      mode: 'async' // 或 'sync' 用于同步处理
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    const batchId = result.data.batchId;
    console.log(`批量任务已启动，ID: ${batchId}`);
    
    // 轮询检查批量任务状态
    await pollBatchStatus(batchId);
  }
  
  return result;
}

async function pollBatchStatus(batchId) {
  let status = 'pending';
  while (status === 'pending' || status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(`/api/v1/personality/batch/${batchId}/status`, {
      headers
    });
    const result = await response.json();
    
    if (result.success) {
      status = result.data.status;
      console.log(`批量任务状态: ${status} (${result.data.completedOperations}/${result.data.totalOperations})`);
    }
  }
  
  console.log(`批量任务完成，最终状态: ${status}`);
}

// 使用示例
const batchOperations = [
  {
    petId: 'pet-123',
    interactionData: {
      userMessage: '你好',
      botResponse: '你好！',
      interactionType: 'conversation',
      duration: 60,
      emotionalTone: 'positive'
    }
  },
  {
    petId: 'pet-456',
    interactionData: {
      userMessage: '很棒！',
      botResponse: '谢谢夸奖！',
      interactionType: 'praise',
      duration: 30,
      emotionalTone: 'positive'
    }
  }
];

await batchPersonalityEvolution(batchOperations);
```

## 3. 最佳实践

### 3.1 错误处理策略

#### 统一错误处理器
```javascript
class PersonalityAPIClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  async request(method, endpoint, data = null) {
    try {
      const config = {
        method,
        headers: this.headers
      };
      
      if (data) {
        config.body = JSON.stringify(data);
      }
      
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const result = await response.json();
      
      if (!result.success) {
        throw new PersonalityAPIError(result.error.code, result.message, result.error.details);
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof PersonalityAPIError) {
        throw error;
      } else {
        throw new PersonalityAPIError('NETWORK_ERROR', '网络请求失败', { originalError: error.message });
      }
    }
  }
  
  // 个性特质相关方法
  async getTraits(petId) {
    return await this.request('GET', `/personality/pets/${petId}/traits`);
  }
  
  async evolve(petId, interactionData) {
    return await this.request('POST', `/personality/pets/${petId}/evolve`, { interactionData });
  }
  
  async getAnalysis(petId, options = {}) {
    const params = new URLSearchParams(options);
    return await this.request('GET', `/personality/pets/${petId}/analysis?${params}`);
  }
}

class PersonalityAPIError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PersonalityAPIError';
    this.code = code;
    this.details = details;
  }
}

// 使用示例
const client = new PersonalityAPIClient('http://localhost:8000/api/v1', 'your-token');

try {
  const traits = await client.getTraits('pet-123');
} catch (error) {
  if (error instanceof PersonalityAPIError) {
    switch (error.code) {
      case 'PET_NOT_FOUND':
        console.log('宠物不存在');
        break;
      case 'UNAUTHORIZED':
        console.log('需要重新登录');
        break;
      default:
        console.log('API错误:', error.message);
    }
  }
}
```

### 3.2 缓存优化策略

#### 客户端缓存实现
```javascript
class PersonalityCache {
  constructor(ttl = 300000) { // 默认5分钟TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// 带缓存的API客户端
class CachedPersonalityAPIClient extends PersonalityAPIClient {
  constructor(baseURL, token) {
    super(baseURL, token);
    this.cache = new PersonalityCache();
  }
  
  async getTraits(petId) {
    const cacheKey = `traits:${petId}`;
    let traits = this.cache.get(cacheKey);
    
    if (!traits) {
      traits = await super.getTraits(petId);
      this.cache.set(cacheKey, traits);
    }
    
    return traits;
  }
  
  async evolve(petId, interactionData) {
    const result = await super.evolve(petId, interactionData);
    
    // 演化后清除相关缓存
    if (result.evolutionTriggered) {
      this.cache.invalidate(petId);
    }
    
    return result;
  }
}
```

### 3.3 性能优化建议

#### 批量操作优化
```javascript
class BatchPersonalityProcessor {
  constructor(client, batchSize = 100) {
    this.client = client;
    this.batchSize = batchSize;
    this.queue = [];
    this.processing = false;
  }
  
  async addEvolution(petId, interactionData) {
    this.queue.push({ petId, interactionData });
    
    if (this.queue.length >= this.batchSize) {
      await this.processBatch();
    }
  }
  
  async processBatch() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const operations = batch.map(item => ({
        petId: item.petId,
        interactionData: item.interactionData
      }));
      
      await this.client.request('POST', '/personality/batch/evolve', {
        operations,
        mode: 'async'
      });
    } catch (error) {
      console.error('批量处理失败:', error);
      // 可以选择重新排队或记录失败
    } finally {
      this.processing = false;
      
      // 如果还有积累的任务，继续处理
      if (this.queue.length >= this.batchSize) {
        setTimeout(() => this.processBatch(), 100);
      }
    }
  }
  
  async flush() {
    if (this.queue.length > 0) {
      await this.processBatch();
    }
  }
}

// 使用示例
const batchProcessor = new BatchPersonalityProcessor(client, 50);

// 添加多个演化任务
for (let i = 0; i < 200; i++) {
  await batchProcessor.addEvolution(`pet-${i}`, {
    userMessage: `消息${i}`,
    botResponse: `回复${i}`,
    interactionType: 'conversation',
    duration: 60,
    emotionalTone: 'positive'
  });
}

// 确保所有任务都被处理
await batchProcessor.flush();
```

### 3.4 实时更新策略

#### WebSocket集成
```javascript
class RealtimePersonalityClient {
  constructor(apiClient, wsURL) {
    this.apiClient = apiClient;
    this.wsURL = wsURL;
    this.ws = null;
    this.eventHandlers = new Map();
  }
  
  connect() {
    this.ws = new WebSocket(this.wsURL);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data.type, data.payload);
    };
    
    this.ws.onopen = () => {
      console.log('WebSocket连接已建立');
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket连接已关闭');
      // 实现重连逻辑
      setTimeout(() => this.connect(), 5000);
    };
  }
  
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }
  
  handleEvent(eventType, payload) {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach(handler => handler(payload));
  }
  
  async evolveWithRealtime(petId, interactionData) {
    // 订阅实时更新
    this.on('personality_evolution', (data) => {
      if (data.petId === petId) {
        console.log('个性实时更新:', data);
        // 更新UI
        updatePersonalityDisplay(data.newTraits);
      }
    });
    
    // 触发演化
    return await this.apiClient.evolve(petId, interactionData);
  }
}

// 使用示例
const realtimeClient = new RealtimePersonalityClient(client, 'ws://localhost:8000/ws');
realtimeClient.connect();

realtimeClient.on('personality_evolution', (data) => {
  console.log(`宠物 ${data.petId} 个性发生变化:`, data.changesApplied);
});

realtimeClient.on('analysis_completed', (data) => {
  console.log(`分析完成:`, data.analysis);
});
```

### 3.5 数据验证和类型安全

#### TypeScript类型定义
```typescript
// 类型定义
interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

interface InteractionData {
  userMessage: string;
  botResponse: string;
  interactionType: 'conversation' | 'praise' | 'criticism' | 'silence';
  duration: number;
  emotionalTone: 'positive' | 'neutral' | 'negative';
}

interface EvolutionResult {
  petId: string;
  evolutionTriggered: boolean;
  changesApplied: Partial<PersonalityTraits>;
  newTraits: PersonalityTraits;
  confidence: number;
  reason: string;
  timestamp: string;
}

// 验证器
class PersonalityValidator {
  static validateTraits(traits: PersonalityTraits): boolean {
    const requiredFields = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    
    for (const field of requiredFields) {
      const value = traits[field as keyof PersonalityTraits];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new Error(`无效的特质值: ${field} = ${value}`);
      }
    }
    
    return true;
  }
  
  static validateInteractionData(data: InteractionData): boolean {
    if (!data.userMessage || !data.botResponse) {
      throw new Error('用户消息和机器人回复不能为空');
    }
    
    if (!['conversation', 'praise', 'criticism', 'silence'].includes(data.interactionType)) {
      throw new Error('无效的互动类型');
    }
    
    if (data.duration < 0) {
      throw new Error('互动持续时间不能为负数');
    }
    
    return true;
  }
}

// 使用示例
async function safeEvolve(petId: string, interactionData: InteractionData): Promise<EvolutionResult> {
  PersonalityValidator.validateInteractionData(interactionData);
  
  const result = await client.evolve(petId, interactionData);
  
  if (result.evolutionTriggered) {
    PersonalityValidator.validateTraits(result.newTraits);
  }
  
  return result;
}
```

## 4. 常见问题和解决方案

### 4.1 演化不生效
**问题**: 调用演化API但个性没有变化
**解决方案**:
```javascript
// 检查演化设置
const settings = await client.getEvolutionSettings(petId);
if (!settings.enabled) {
  console.log('演化功能已禁用');
}

// 检查演化限制
if (settings.maxDailyChange <= 0) {
  console.log('每日变化限制过低');
}

// 检查最近的演化历史
const history = await client.getPersonalityHistory(petId, 1, 10);
const today = new Date().toDateString();
const todayEvolutions = history.history.filter(
  h => new Date(h.timestamp).toDateString() === today
);

if (todayEvolutions.length >= settings.maxDailyChange) {
  console.log('今日演化次数已达上限');
}
```

### 4.2 性能优化
**问题**: API响应过慢
**解决方案**:
```javascript
// 使用并发请求
async function getComprehensiveData(petId) {
  const [traits, analysis, history] = await Promise.all([
    client.getTraits(petId),
    client.getAnalysis(petId),
    client.getPersonalityHistory(petId, 1, 5)
  ]);
  
  return { traits, analysis, history };
}

// 使用缓存和预加载
async function preloadPersonalityData(petIds) {
  const promises = petIds.map(petId => 
    client.getTraits(petId).catch(error => {
      console.log(`预加载失败 ${petId}:`, error.message);
      return null;
    })
  );
  
  await Promise.allSettled(promises);
}
```

### 4.3 错误恢复
**问题**: API调用失败后如何恢复
**解决方案**:
```javascript
class RetryablePersonalityClient {
  constructor(client, maxRetries = 3, baseDelay = 1000) {
    this.client = client;
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }
  
  async withRetry(operation) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) {
          break;
        }
        
        // 指数退避
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`重试第${attempt}次...`);
      }
    }
    
    throw lastError;
  }
  
  async evolve(petId, interactionData) {
    return await this.withRetry(() => this.client.evolve(petId, interactionData));
  }
}
```

## 5. 高级用法示例

### 5.1 个性演化监控系统
```javascript
class PersonalityMonitor {
  constructor(client) {
    this.client = client;
    this.monitors = new Map();
  }
  
  startMonitoring(petId, options = {}) {
    const monitor = {
      petId,
      interval: options.interval || 60000, // 1分钟
      thresholds: options.thresholds || {
        significantChange: 5,
        rapidChange: 10
      },
      timer: null
    };
    
    monitor.timer = setInterval(async () => {
      await this.checkPersonalityChanges(monitor);
    }, monitor.interval);
    
    this.monitors.set(petId, monitor);
  }
  
  async checkPersonalityChanges(monitor) {
    try {
      const history = await this.client.getPersonalityHistory(
        monitor.petId, 1, 5
      );
      
      if (history.history.length >= 2) {
        const recent = history.history[0];
        const previous = history.history[1];
        
        const totalChange = Object.values(recent.changesApplied)
          .reduce((sum, change) => sum + Math.abs(change), 0);
        
        if (totalChange >= monitor.thresholds.rapidChange) {
          this.onRapidChange(monitor.petId, recent, totalChange);
        } else if (totalChange >= monitor.thresholds.significantChange) {
          this.onSignificantChange(monitor.petId, recent, totalChange);
        }
      }
    } catch (error) {
      console.error(`监控失败 ${monitor.petId}:`, error);
    }
  }
  
  onRapidChange(petId, evolution, totalChange) {
    console.log(`⚠️ 快速个性变化检测到 - 宠物 ${petId}`);
    console.log(`总变化量: ${totalChange}`);
    console.log(`原因: ${evolution.reason}`);
  }
  
  onSignificantChange(petId, evolution, totalChange) {
    console.log(`📊 显著个性变化检测到 - 宠物 ${petId}`);
    console.log(`变化量: ${totalChange}`);
  }
  
  stopMonitoring(petId) {
    const monitor = this.monitors.get(petId);
    if (monitor) {
      clearInterval(monitor.timer);
      this.monitors.delete(petId);
    }
  }
}

// 使用示例
const monitor = new PersonalityMonitor(client);
monitor.startMonitoring('pet-123', {
  interval: 30000,
  thresholds: {
    significantChange: 3,
    rapidChange: 8
  }
});
```

这个API使用指南涵盖了个性系统的所有核心功能，提供了实际可用的代码示例，并包含了最佳实践和错误处理策略。开发者可以直接使用这些示例来快速集成个性功能到他们的应用中。