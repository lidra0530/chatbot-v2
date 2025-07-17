# 个性服务模块边界和职责说明

## 1. 模块概述

个性服务模块（PersonalityModule）是电子宠物系统的核心模块之一，负责管理宠物的个性特质演化、分析和缓存。模块采用微服务架构设计，具备清晰的服务边界和职责划分。

## 2. 核心服务架构

### 2.1 服务层次结构
```
PersonalityModule
├── PersonalityController (API层)
├── PersonalityService (业务协调层)
├── PersonalityEvolutionService (核心演化服务)
├── PersonalityCacheService (缓存服务)
├── PersonalityAnalyticsService (分析服务)
├── EvolutionBatchService (批处理服务)
├── EvolutionHistoryService (历史服务)
└── 工具类 (ConcurrencyControl, DatabaseOptimizer, Logger)
```

### 2.2 外部依赖
- **PersonalityEvolutionEngine** (算法引擎)
- **InteractionClassifier** (互动分类器)
- **RedisService** (缓存基础设施)
- **PrismaService** (数据库访问)

## 3. 服务边界和职责

### 3.1 PersonalityController (API层)
**职责范围：**
- HTTP请求路由和参数验证
- 请求/响应数据转换
- API版本控制和向后兼容
- 统一错误响应格式

**边界约定：**
- ✅ 处理HTTP协议相关逻辑
- ✅ 参数校验和数据转换
- ❌ 不包含业务逻辑计算
- ❌ 不直接访问数据库或缓存

**接口设计：**
```typescript
@Controller('personality')
export class PersonalityController {
  @Get('pets/:id/traits')
  async getPersonalityTraits(@Param('id') petId: string)
  
  @Put('pets/:id/traits') 
  async updatePersonalityTraits(@Param('id') petId: string, @Body() dto)
  
  @Get('pets/:id/analysis')
  async getPersonalityAnalysis(@Param('id') petId: string)
  
  @Post('pets/:id/evolve')
  async triggerEvolution(@Param('id') petId: string, @Body() dto)
}
```

### 3.2 PersonalityService (业务协调层)
**职责范围：**
- 业务流程编排和协调
- 服务间调用和数据聚合
- 业务规则验证
- 事务边界管理

**边界约定：**
- ✅ 协调多个子服务完成复杂业务场景
- ✅ 业务逻辑验证和数据聚合
- ❌ 不包含具体的算法实现
- ❌ 不直接操作缓存或数据库

**核心方法：**
```typescript
export class PersonalityService {
  // 获取完整的个性信息（聚合多个数据源）
  async getComprehensivePersonalityInfo(petId: string)
  
  // 处理个性演化（协调演化、缓存、日志服务）
  async processEvolutionIncrement(petId: string, interactionData)
  
  // 获取个性分析（聚合分析和历史数据）
  async getPersonalityAnalytics(petId: string)
}
```

### 3.3 PersonalityEvolutionService (核心演化服务)
**职责范围：**
- 个性演化的核心计算逻辑
- 与PersonalityEvolutionEngine的集成
- 演化限制和约束检查
- 分布式锁和并发控制

**边界约定：**
- ✅ 个性演化算法的执行和管理
- ✅ 并发控制和资源锁定
- ✅ 演化结果的验证和限制应用
- ❌ 不处理缓存逻辑（委托给CacheService）
- ❌ 不处理数据持久化（委托给HistoryService）

**核心职责：**
```typescript
export class PersonalityEvolutionService {
  // 处理单个宠物的个性演化
  async processEvolutionIncrement(petId: string, interactionData): Promise<EvolutionResult>
  
  // 批量处理个性演化
  async processBatchEvolutionIncrements(batchData): Promise<BatchResult>
  
  // 异步调度批量演化任务
  async scheduleAsyncBatchEvolution(batchData): Promise<string>
  
  // 获取和更新演化设置
  async getEvolutionSettings(petId: string): Promise<EvolutionSettings>
  async updateEvolutionSettings(petId: string, settings): Promise<void>
}
```

### 3.4 PersonalityCacheService (缓存服务)
**职责范围：**
- 个性数据的缓存管理
- Redis和内存双重缓存策略
- 缓存失效和预热策略
- 缓存性能监控

**边界约定：**
- ✅ 所有个性相关数据的缓存操作
- ✅ 缓存策略和失效管理
- ✅ 缓存回退和容错处理
- ❌ 不包含业务逻辑计算
- ❌ 不直接操作数据库

**服务接口：**
```typescript
export class PersonalityCacheService {
  // 通用缓存操作（支持Redis和内存回退）
  async getWithFallback<T>(key: string): Promise<T | null>
  async setWithFallback<T>(key: string, value: T, ttl: number): Promise<boolean>
  
  // 个性特定的缓存操作
  async getPersonalityAnalysis(petId: string): Promise<PersonalityAnalysis | null>
  async cachePersonalityAnalysis(petId: string, analysis: PersonalityAnalysis): Promise<void>
  
  // 缓存失效操作
  async invalidatePersonalityCache(petId: string): Promise<void>
  async preWarmPersonalityCache(petId: string): Promise<void>
}
```

### 3.5 PersonalityAnalyticsService (分析服务)
**职责范围：**
- 个性趋势分析和预测
- 互动模式识别
- 个性化推荐生成
- 分析结果缓存管理

**边界约定：**
- ✅ 复杂的个性数据分析和计算
- ✅ 趋势识别和模式分析
- ✅ 推荐算法的执行
- ❌ 不处理个性演化逻辑
- ❌ 不直接修改个性特质

**分析功能：**
```typescript
export class PersonalityAnalyticsService {
  // 获取个性分析报告
  async getPersonalityAnalytics(petId: string): Promise<PersonalityAnalytics>
  
  // 生成个性化推荐
  async generatePersonalityRecommendations(petId: string): Promise<Recommendation[]>
  
  // 分析个性稳定性
  async analyzePersonalityStability(petId: string): Promise<StabilityAnalysis>
  
  // 预测个性发展趋势  
  async predictPersonalityTrends(petId: string): Promise<TrendPrediction>
}
```

### 3.6 EvolutionBatchService (批处理服务)
**职责范围：**
- 大规模个性演化的批处理
- 异步任务队列管理
- 批处理性能优化
- 错误恢复和重试机制

**边界约定：**
- ✅ 批量演化任务的调度和执行
- ✅ 异步任务的状态管理
- ✅ 批处理性能优化
- ❌ 不处理单个演化的具体逻辑
- ❌ 不处理实时演化请求

### 3.7 EvolutionHistoryService (历史服务)
**职责范围：**
- 个性演化历史的存储和查询
- 历史数据的统计和分析
- 数据归档和清理
- 历史趋势分析

**边界约定：**
- ✅ 演化历史数据的持久化
- ✅ 历史查询和统计分析
- ✅ 数据生命周期管理
- ❌ 不处理实时演化计算
- ❌ 不处理缓存逻辑

## 4. 跨服务协作模式

### 4.1 演化处理流程
```typescript
// 完整的个性演化流程
async function completeEvolutionFlow(petId: string, interactionData: any) {
  // 1. PersonalityService 协调整个流程
  const evolutionResult = await personalityService.processEvolutionIncrement(petId, interactionData);
  
  // 2. PersonalityEvolutionService 执行核心计算
  // 3. PersonalityCacheService 更新缓存
  // 4. EvolutionHistoryService 记录历史
  // 5. PersonalityAnalyticsService 更新分析数据
  
  return evolutionResult;
}
```

### 4.2 数据一致性保证
- **强一致性**：个性特质的更新使用数据库事务
- **最终一致性**：缓存数据通过TTL和主动失效保证
- **补偿机制**：失败场景下的数据回滚和修复

### 4.3 错误处理策略
- **层级错误处理**：每层服务负责自己的错误处理
- **优雅降级**：核心功能不可用时的备选方案
- **错误传播**：关键错误向上传播，非关键错误本地处理

## 5. 性能边界约定

### 5.1 响应时间要求
- **个性查询**：< 100ms (缓存命中)，< 500ms (缓存未命中)
- **个性演化**：< 1s (单次)，< 5s (批量100个)
- **分析生成**：< 2s (标准分析)，< 5s (深度分析)

### 5.2 并发处理能力
- **单宠物演化**：支持最大100 QPS
- **批量演化**：支持10个并发批次
- **分析查询**：支持500 QPS (缓存支撑)

### 5.3 数据处理限制
- **单次演化事件**：最多处理100个历史事件
- **批量演化**：单批次最多1000个宠物
- **缓存数据**：单个分析结果最大1MB

## 6. 安全边界

### 6.1 访问控制
- **用户隔离**：用户只能访问自己的宠物数据
- **权限验证**：每个API调用都需要验证用户权限
- **数据脱敏**：敏感数据在日志中脱敏处理

### 6.2 数据保护
- **输入验证**：所有外部输入都经过严格验证
- **SQL注入防护**：使用参数化查询
- **缓存安全**：缓存key包含用户标识防止越权

## 7. 监控和可观测性

### 7.1 关键指标
- **业务指标**：演化成功率、分析准确性、用户满意度
- **性能指标**：响应时间、吞吐量、错误率
- **资源指标**：CPU使用率、内存占用、缓存命中率

### 7.2 日志记录
- **结构化日志**：使用统一的日志格式和字段
- **业务日志**：记录关键业务事件和决策过程
- **性能日志**：记录服务调用时间和资源使用

### 7.3 告警机制
- **响应时间告警**：超过性能阈值时触发
- **错误率告警**：错误率超过5%时告警
- **资源告警**：CPU或内存使用率过高时告警

## 8. 扩展性设计

### 8.1 水平扩展
- **无状态设计**：所有服务都设计为无状态
- **负载均衡**：支持多实例部署和负载均衡
- **数据库分片**：支持按用户或宠物ID分片

### 8.2 功能扩展
- **插件机制**：支持新的个性分析算法插件
- **配置热更新**：支持运行时配置更新
- **版本兼容**：向后兼容的API设计

## 9. 测试策略

### 9.1 单元测试
- **服务隔离**：每个服务独立测试
- **依赖模拟**：使用Mock对象模拟外部依赖
- **边界测试**：测试各种边界条件和异常情况

### 9.2 集成测试
- **服务协作**：测试服务间的协作流程
- **数据一致性**：验证数据在各服务间的一致性
- **性能测试**：验证整体系统的性能表现

## 10. 部署和运维

### 10.1 部署架构
- **容器化部署**：使用Docker容器部署
- **服务发现**：使用服务注册中心
- **配置管理**：集中化的配置管理

### 10.2 运维策略
- **健康检查**：提供健康检查端点
- **优雅关闭**：支持优雅关闭和服务迁移
- **故障恢复**：快速故障检测和自动恢复

通过明确的服务边界和职责划分，个性服务模块能够保持高内聚、低耦合的架构设计，确保系统的可维护性、可扩展性和可靠性。